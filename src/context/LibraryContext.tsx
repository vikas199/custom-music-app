import React, { createContext, useState, useContext, ReactNode, useEffect, useMemo, useRef, useCallback } from 'react';
import { AppState } from 'react-native';
import { File, Paths } from 'expo-file-system';

import type { Song } from '@/context/MusicPlayerContext';
import { useJellyfin } from '@/context/JellyfinContext';
import * as Jellyfin from '@/lib/jellyfin';

/*
 * Offline-first library cache, the same idea Spotify / YouTube Music use:
 * - Everything (songs, favorites, playlists and their contents) is kept in a JSON file on the phone.
 * - On launch the app shows the cached copy instantly, then syncs with Jellyfin in the background.
 * - Changes made in the app (favorite, create/add/delete playlist) update the cache directly,
 *   so screens never need to re-download what they just changed.
 * - A playlist's songs are only re-fetched when they're missing, older than PLAYLIST_STALE_MS,
 *   or the server's song count no longer matches (e.g. edited in the Jellyfin web page).
 * - The library re-syncs on launch, on pull-to-refresh, and when the app returns to the
 *   foreground after FOREGROUND_SYNC_MS.
 * - Size stays small: only text metadata is stored (~100 KB for a few hundred songs), songs
 *   removed from the server are pruned on every sync, and album art is left to expo-image's
 *   own size-limited disk cache.
 */

const CACHE_VERSION = 1;
const PLAYLIST_STALE_MS = 15 * 60 * 1000;
const SAVE_DEBOUNCE_MS = 500;
const FOREGROUND_SYNC_MS = 10 * 60 * 1000;

// Songs without stream URL / headers: those contain the access token and are rebuilt from the session
type CachedSong = Omit<Song, 'streamUrl' | 'headers' | 'isFavorite'>;

interface CachedPlaylist {
  id: string;
  name: string;
  songCount: number;
  coverArt?: string;
  songIds: string[] | null; // null = contents not downloaded yet
  syncedAt: number;
}

interface LibraryCache {
  version: number;
  owner: string; // server + user, so a different login never sees someone else's cache
  songsById: Record<string, CachedSong>;
  libraryIds: string[]; // All Songs, in display order
  favoriteIds: string[];
  playlists: CachedPlaylist[];
}

export type AddResult = 'added' | 'duplicate';

interface LibraryContextType {
  songs: Song[];
  favorites: Song[];
  playlists: Jellyfin.Playlist[];
  isLoading: boolean; // true until the cache is read, and during a first sync with nothing cached
  error: string | null;
  refresh: () => Promise<void>;
  isFavorite: (songId: string) => boolean;
  toggleFavorite: (song: Song) => Promise<void>;
  getPlaylistSongs: (playlistId: string) => Song[] | null;
  loadPlaylist: (playlistId: string, force?: boolean) => Promise<void>;
  createPlaylist: (name: string, song?: Song | null) => Promise<void>;
  addToPlaylist: (playlistId: string, song: Song) => Promise<AddResult>;
  deletePlaylist: (playlistId: string) => Promise<void>;
}

const LibraryContext = createContext<LibraryContextType | undefined>(undefined);

const cacheFile = () => new File(Paths.document, 'library-cache.json');

async function readCache(owner: string): Promise<LibraryCache | null> {
  try {
    const file = cacheFile();
    if (!file.exists) return null;
    const data = JSON.parse(await file.text()) as LibraryCache;
    return data.version === CACHE_VERSION && data.owner === owner ? data : null;
  } catch {
    return null; // corrupt or unreadable cache: just sync from scratch
  }
}

function writeCache(data: LibraryCache) {
  try {
    const file = cacheFile();
    if (!file.exists) file.create();
    file.write(JSON.stringify(data));
  } catch (e) {
    console.warn('Could not save library cache', e);
  }
}

function deleteCache() {
  try {
    const file = cacheFile();
    if (file.exists) file.delete();
  } catch {}
}

const emptyCache = (owner: string): LibraryCache => ({
  version: CACHE_VERSION, owner, songsById: {}, libraryIds: [], favoriteIds: [], playlists: [],
});

const stripSong = ({ streamUrl, headers, isFavorite, ...rest }: Song): CachedSong => rest;

function addSongs(songsById: Record<string, CachedSong>, songs: Song[]): Record<string, CachedSong> {
  const next = { ...songsById };
  for (const song of songs) next[song.id] = stripSong(song);
  return next;
}

export function LibraryProvider({ children }: { children: ReactNode }) {
  const { session, isRestoring } = useJellyfin();
  const owner = session ? `${session.serverUrl}|${session.userId}` : '';

  const [cache, setCache] = useState<LibraryCache | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Async actions read the latest cache through this ref
  const cacheRef = useRef(cache);
  cacheRef.current = cache;
  const lastSyncRef = useRef(0);

  const update = useCallback((fn: (c: LibraryCache) => LibraryCache) => {
    setCache((c) => (c ? fn(c) : c));
  }, []);

  const sync = useCallback(async () => {
    if (!session) return;
    setIsSyncing(true);
    setError(null);
    try {
      const [songs, serverPlaylists] = await Promise.all([
        Jellyfin.fetchSongs(session),
        Jellyfin.fetchPlaylists(session),
      ]);
      setCache((c) => {
        const base = c ?? emptyCache(owner);
        const previous = new Map(base.playlists.map((p) => [p.id, p]));
        const playlists = serverPlaylists.map((p) => {
          const cached = previous.get(p.id);
          // Keep cached contents unless the server says the playlist changed size
          const songIds = cached?.songIds && cached.songIds.length === p.songCount ? cached.songIds : null;
          return { ...p, songIds, syncedAt: songIds ? cached!.syncedAt : 0 };
        });

        // Prune: keep only songs still in the library or referenced by a cached playlist
        const keep = new Set(songs.map((s) => s.id));
        for (const p of playlists) p.songIds?.forEach((id) => keep.add(id));
        const merged = addSongs(base.songsById, songs);
        const songsById = Object.fromEntries(Object.entries(merged).filter(([id]) => keep.has(id)));

        return {
          ...base,
          songsById,
          libraryIds: songs.map((s) => s.id),
          favoriteIds: songs.filter((s) => s.isFavorite).map((s) => s.id),
          playlists,
        };
      });
      lastSyncRef.current = Date.now();
    } catch (e) {
      setError(Jellyfin.errorMessage(e));
    } finally {
      setIsSyncing(false);
    }
  }, [session, owner]);

  // Login/logout: load this user's cache, show it immediately, then sync in the background
  useEffect(() => {
    // The saved login is still loading at app start; don't mistake that for a logout
    if (isRestoring) return;
    if (!session) {
      setCache(null);
      deleteCache();
      return;
    }
    let cancelled = false;
    readCache(owner).then((cached) => {
      if (cancelled) return;
      setCache(cached ?? emptyCache(owner));
      sync();
    });
    return () => {
      cancelled = true;
    };
  }, [owner, isRestoring]);

  // Coming back to the app after a while: refresh quietly in the background
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active' && session && Date.now() - lastSyncRef.current > FOREGROUND_SYNC_MS) sync();
    });
    return () => subscription.remove();
  }, [session, sync]);

  // Save changes to disk, batched so rapid updates write once
  useEffect(() => {
    if (!cache) return;
    const timer = setTimeout(() => writeCache(cache), SAVE_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [cache]);

  const hydrate = useCallback(
    (id: string, favoriteIds: Set<string>): Song | null => {
      const song = cache?.songsById[id];
      if (!song || !session) return null;
      return { ...Jellyfin.withPlayback(session, song), isFavorite: favoriteIds.has(id) };
    },
    [cache, session]
  );

  const favoriteSet = useMemo(() => new Set(cache?.favoriteIds ?? []), [cache?.favoriteIds]);

  const songs = useMemo(
    () => (cache?.libraryIds ?? []).map((id) => hydrate(id, favoriteSet)).filter((s): s is Song => s !== null),
    [cache?.libraryIds, hydrate, favoriteSet]
  );

  // Favorites in library order
  const favorites = useMemo(() => songs.filter((s) => favoriteSet.has(s.id)), [songs, favoriteSet]);

  const playlists = useMemo<Jellyfin.Playlist[]>(
    () => (cache?.playlists ?? []).map(({ id, name, songCount, coverArt }) => ({ id, name, songCount, coverArt })),
    [cache?.playlists]
  );

  const isFavorite = useCallback((songId: string) => favoriteSet.has(songId), [favoriteSet]);

  const toggleFavorite = async (song: Song) => {
    if (!session) return;
    const makeFavorite = !favoriteSet.has(song.id);
    const apply = (fav: boolean) =>
      update((c) => ({
        ...c,
        songsById: c.songsById[song.id] ? c.songsById : addSongs(c.songsById, [song]),
        favoriteIds: fav
          ? [...c.favoriteIds.filter((id) => id !== song.id), song.id]
          : c.favoriteIds.filter((id) => id !== song.id),
      }));

    apply(makeFavorite); // optimistic: the heart fills instantly
    try {
      await Jellyfin.setFavorite(session, song.id, makeFavorite);
    } catch (e) {
      apply(!makeFavorite); // undo if the server rejected it
      setError(Jellyfin.errorMessage(e));
    }
  };

  const getPlaylistSongs = (playlistId: string): Song[] | null => {
    const playlist = cache?.playlists.find((p) => p.id === playlistId);
    if (!playlist?.songIds) return null;
    return playlist.songIds.map((id) => hydrate(id, favoriteSet)).filter((s): s is Song => s !== null);
  };

  // Downloads a playlist's songs if they're missing or stale; returns the song ids
  const ensurePlaylistSongs = async (playlistId: string, force = false): Promise<string[]> => {
    if (!session) return [];
    const cached = cacheRef.current?.playlists.find((p) => p.id === playlistId);
    const isFresh = cached?.songIds && Date.now() - cached.syncedAt < PLAYLIST_STALE_MS;
    if (!force && isFresh) return cached!.songIds!;

    const fetched = await Jellyfin.fetchPlaylistSongs(session, playlistId);
    const songIds = fetched.map((s) => s.id);
    update((c) => ({
      ...c,
      songsById: addSongs(c.songsById, fetched),
      playlists: c.playlists.map((p) =>
        p.id === playlistId ? { ...p, songIds, songCount: songIds.length, syncedAt: Date.now() } : p
      ),
    }));
    return songIds;
  };

  const loadPlaylist = async (playlistId: string, force = false) => {
    try {
      await ensurePlaylistSongs(playlistId, force);
    } catch (e) {
      setError(Jellyfin.errorMessage(e));
    }
  };

  const createPlaylist = async (name: string, song?: Song | null) => {
    if (!session) return;
    const trimmed = name.trim();
    const id = await Jellyfin.createPlaylist(session, trimmed, song ? [song.id] : []);
    update((c) => ({
      ...c,
      songsById: song ? addSongs(c.songsById, [song]) : c.songsById,
      playlists: [
        ...c.playlists,
        { id, name: trimmed, songCount: song ? 1 : 0, coverArt: song?.coverArt, songIds: song ? [song.id] : [], syncedAt: Date.now() },
      ].sort((a, b) => a.name.localeCompare(b.name)),
    }));
  };

  const addToPlaylist = async (playlistId: string, song: Song): Promise<AddResult> => {
    if (!session) return 'added';
    // Uses the cached contents for the duplicate check; only downloads if we've never loaded it
    const songIds = await ensurePlaylistSongs(playlistId);
    if (songIds.includes(song.id)) return 'duplicate';

    await Jellyfin.addToPlaylist(session, playlistId, [song.id]);
    update((c) => ({
      ...c,
      songsById: addSongs(c.songsById, [song]),
      playlists: c.playlists.map((p) =>
        p.id === playlistId
          ? { ...p, songIds: [...(p.songIds ?? []), song.id], songCount: p.songCount + 1, coverArt: p.coverArt ?? song.coverArt }
          : p
      ),
    }));
    return 'added';
  };

  const deletePlaylist = async (playlistId: string) => {
    if (!session) return;
    await Jellyfin.deletePlaylist(session, playlistId);
    update((c) => ({ ...c, playlists: c.playlists.filter((p) => p.id !== playlistId) }));
  };

  return (
    <LibraryContext.Provider
      value={{
        songs,
        favorites,
        playlists,
        isLoading: !cache || (isSyncing && !cache.libraryIds.length),
        error,
        refresh: sync,
        isFavorite,
        toggleFavorite,
        getPlaylistSongs,
        loadPlaylist,
        createPlaylist,
        addToPlaylist,
        deletePlaylist,
      }}
    >
      {children}
    </LibraryContext.Provider>
  );
}

export function useLibrary() {
  const context = useContext(LibraryContext);
  if (context === undefined) {
    throw new Error('useLibrary must be used within a LibraryProvider');
  }
  return context;
}
