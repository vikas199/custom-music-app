import * as SecureStore from 'expo-secure-store';

import type { Song } from '@/context/MusicPlayerContext';

const SESSION_KEY = 'jellyfin_session';
const DEVICE_ID_KEY = 'jellyfin_device_id';

const CLIENT_NAME = 'MusicApp';
const CLIENT_VERSION = '1.0.0';
const DEVICE_NAME = 'Pixel';

// Set in .env locally and as an EAS environment variable for APK builds; kept out of git
export const DEFAULT_SERVER_URL = process.env.EXPO_PUBLIC_JELLYFIN_URL ?? '';

const REQUEST_TIMEOUT_MS = 10_000;

export interface JellyfinSession {
  serverUrl: string;
  userId: string;
  accessToken: string;
  deviceId: string;
}

// Jellyfin identifies each client device by a stable id, so generate one once and keep it.
async function getDeviceId(): Promise<string> {
  const existing = await SecureStore.getItemAsync(DEVICE_ID_KEY);
  if (existing) return existing;
  const id = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
  await SecureStore.setItemAsync(DEVICE_ID_KEY, id);
  return id;
}

function authHeader(deviceId: string, token?: string): string {
  const parts = [
    `Client="${CLIENT_NAME}"`,
    `Device="${DEVICE_NAME}"`,
    `DeviceId="${deviceId}"`,
    `Version="${CLIENT_VERSION}"`,
  ];
  if (token) parts.push(`Token="${token}"`);
  return `MediaBrowser ${parts.join(', ')}`;
}

// fetch has no timeout of its own; an unreachable server would otherwise hang forever
async function fetchWithTimeout(url: string, init: RequestInit = {}): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } catch (e) {
    if (controller.signal.aborted) throw new Error(`No response from ${url.split('/').slice(0, 3).join('/')}. Is Tailscale connected?`);
    throw e;
  } finally {
    clearTimeout(timer);
  }
}

// Network failures surface as TypeError or as "fetch failed: java.net.UnknownHostException..."
const NETWORK_ERROR = /fetch failed|network request failed|unknownhost|unable to resolve host|failed to connect/i;

export function errorMessage(e: unknown): string {
  const message = e instanceof Error ? e.message : String(e);
  if (e instanceof TypeError || NETWORK_ERROR.test(message)) {
    return 'Cannot reach server. Is Tailscale connected?';
  }
  return message;
}

export function sessionHeaders(session: JellyfinSession): Record<string, string> {
  return { Authorization: authHeader(session.deviceId, session.accessToken) };
}

export async function loadSession(): Promise<JellyfinSession | null> {
  const raw = await SecureStore.getItemAsync(SESSION_KEY);
  return raw ? (JSON.parse(raw) as JellyfinSession) : null;
}

export async function clearSession(): Promise<void> {
  await SecureStore.deleteItemAsync(SESSION_KEY);
}

export async function login(serverUrl: string, username: string, password: string): Promise<JellyfinSession> {
  const baseUrl = serverUrl.trim().replace(/\/+$/, '');
  const deviceId = await getDeviceId();

  const res = await fetchWithTimeout(`${baseUrl}/Users/AuthenticateByName`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: authHeader(deviceId),
    },
    body: JSON.stringify({ Username: username.trim(), Pw: password }),
  });

  if (res.status === 401) throw new Error('Wrong username or password');
  if (!res.ok) throw new Error(`Server returned ${res.status}`);

  const data = await res.json();
  const session: JellyfinSession = {
    serverUrl: baseUrl,
    userId: data.User.Id,
    accessToken: data.AccessToken,
    deviceId,
  };
  await SecureStore.setItemAsync(SESSION_KEY, JSON.stringify(session));
  return session;
}

interface JellyfinAudioItem {
  Id: string;
  Name: string;
  Album?: string;
  AlbumId?: string;
  AlbumArtist?: string;
  Artists?: string[];
  RunTimeTicks?: number;
  ImageTags?: { Primary?: string };
  AlbumPrimaryImageTag?: string;
  UserData?: { IsFavorite?: boolean };
}

// Full-size art for the now-playing screen; small thumbnails for lists keep RAM and disk use low
const COVER_SIZE = 600;
const THUMBNAIL_SIZE = 160;

function coverUrl(session: JellyfinSession, item: JellyfinAudioItem, size = COVER_SIZE): string | undefined {
  if (item.ImageTags?.Primary) {
    return `${session.serverUrl}/Items/${item.Id}/Images/Primary?maxHeight=${size}&tag=${item.ImageTags.Primary}`;
  }
  if (item.AlbumId && item.AlbumPrimaryImageTag) {
    return `${session.serverUrl}/Items/${item.AlbumId}/Images/Primary?maxHeight=${size}&tag=${item.AlbumPrimaryImageTag}`;
  }
  return undefined;
}

// static=true streams the original file without transcoding; ExoPlayer handles mp3/m4a/flac directly.
function streamUrl(session: JellyfinSession, itemId: string): string {
  return `${session.serverUrl}/Audio/${itemId}/stream?static=true&ApiKey=${session.accessToken}`;
}

// Authenticated request to the server with consistent error messages
async function apiFetch(session: JellyfinSession, path: string, init: RequestInit = {}): Promise<Response> {
  const res = await fetchWithTimeout(`${session.serverUrl}${path}`, {
    ...init,
    headers: { ...sessionHeaders(session), ...init.headers },
  });
  if (res.status === 401) throw new Error('Session expired, please log in again');
  if (res.status === 403) throw new Error('Jellyfin did not allow this. Check the user permissions in the Jellyfin dashboard.');
  if (!res.ok) throw new Error(`Server returned ${res.status}`);
  return res;
}

const SONG_FIELDS = 'Artists,AlbumArtist,Album';

function toSong(session: JellyfinSession, item: JellyfinAudioItem): Song {
  return {
    id: item.Id,
    title: item.Name,
    artist: item.Artists?.join(', ') || item.AlbumArtist || 'Unknown Artist',
    album: item.Album,
    durationMillis: item.RunTimeTicks ? Math.round(item.RunTimeTicks / 10_000) : 0,
    coverArt: coverUrl(session, item),
    thumbnail: coverUrl(session, item, THUMBNAIL_SIZE),
    isFavorite: item.UserData?.IsFavorite ?? false,
    streamUrl: streamUrl(session, item.Id),
    headers: sessionHeaders(session),
  };
}

// Stream URL and auth headers hold the access token, so they're never written to disk;
// cached songs get them back from the current session here.
export function withPlayback(session: JellyfinSession, song: Omit<Song, 'streamUrl' | 'headers'>): Song {
  return { ...song, streamUrl: streamUrl(session, song.id), headers: sessionHeaders(session) };
}

export async function fetchSongs(session: JellyfinSession): Promise<Song[]> {
  const params = new URLSearchParams({
    userId: session.userId,
    IncludeItemTypes: 'Audio',
    Recursive: 'true',
    SortBy: 'SortName',
    SortOrder: 'Ascending',
    Fields: SONG_FIELDS,
    enableUserData: 'true',
  });

  const res = await apiFetch(session, `/Items?${params}`);
  const data: { Items: JellyfinAudioItem[] } = await res.json();
  return data.Items.map((item) => toSong(session, item));
}

export interface Playlist {
  id: string;
  name: string;
  songCount: number;
  coverArt?: string;
}

export async function fetchPlaylists(session: JellyfinSession): Promise<Playlist[]> {
  const params = new URLSearchParams({
    userId: session.userId,
    IncludeItemTypes: 'Playlist',
    Recursive: 'true',
    SortBy: 'SortName',
    SortOrder: 'Ascending',
    Fields: 'ChildCount',
  });

  const res = await apiFetch(session, `/Items?${params}`);
  const data: { Items: (JellyfinAudioItem & { ChildCount?: number })[] } = await res.json();
  return data.Items.map((item) => ({
    id: item.Id,
    name: item.Name,
    songCount: item.ChildCount ?? 0,
    coverArt: coverUrl(session, item, THUMBNAIL_SIZE),
  }));
}

export async function fetchPlaylistSongs(session: JellyfinSession, playlistId: string): Promise<Song[]> {
  const params = new URLSearchParams({ userId: session.userId, fields: SONG_FIELDS });
  const res = await apiFetch(session, `/Playlists/${playlistId}/Items?${params}`);
  const data: { Items: JellyfinAudioItem[] } = await res.json();
  return data.Items.map((item) => toSong(session, item));
}

export async function createPlaylist(session: JellyfinSession, name: string, songIds: string[] = []): Promise<string> {
  const res = await apiFetch(session, '/Playlists', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ Name: name.trim(), Ids: songIds, UserId: session.userId, MediaType: 'Audio' }),
  });
  const data: { Id: string } = await res.json();
  return data.Id;
}

export async function addToPlaylist(session: JellyfinSession, playlistId: string, songIds: string[]): Promise<void> {
  const params = new URLSearchParams({ ids: songIds.join(','), userId: session.userId });
  await apiFetch(session, `/Playlists/${playlistId}/Items?${params}`, { method: 'POST' });
}

// Deletes the playlist itself; the songs in it stay in the library
export async function deletePlaylist(session: JellyfinSession, playlistId: string): Promise<void> {
  await apiFetch(session, `/Items/${playlistId}`, { method: 'DELETE' });
}

export async function setFavorite(session: JellyfinSession, songId: string, isFavorite: boolean): Promise<void> {
  const params = new URLSearchParams({ userId: session.userId });
  await apiFetch(session, `/UserFavoriteItems/${songId}?${params}`, { method: isFavorite ? 'POST' : 'DELETE' });
}
