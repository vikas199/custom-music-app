import React, { createContext, useState, useContext, ReactNode, useEffect, useRef } from 'react';
import { requestNotificationPermissionsAsync, setAudioModeAsync, useAudioPlayer, useAudioPlayerStatus } from 'expo-audio';
import Constants, { ExecutionEnvironment } from 'expo-constants';

export interface Song {
  id: string;
  title: string;
  artist: string;
  album?: string;
  durationMillis: number;
  coverArt?: string;
  thumbnail?: string; // small cover for lists
  isFavorite?: boolean;
  streamUrl: string;
  headers?: Record<string, string>;
}

interface MusicPlayerContextType {
  activeSong: Song | null;
  isPlaying: boolean;
  isMaximized: boolean;
  isShuffled: boolean;
  positionMillis: number;
  durationMillis: number;
  playSong: (song: Song, queue?: Song[]) => Promise<void>;
  shuffleAll: (songs: Song[]) => Promise<void>;
  togglePlay: () => Promise<void>;
  toggleShuffle: () => void;
  playNext: () => Promise<void>;
  playPrevious: () => Promise<void>;
  seekTo: (millis: number) => Promise<void>;
  setMaximized: (maximized: boolean) => void;
  stopPlayback: () => Promise<void>;
}

// Expo Go has no background playback service, so lock screen controls only work in the built APK
const supportsLockScreen = Constants.executionEnvironment !== ExecutionEnvironment.StoreClient;

// Pressing "previous" after this many seconds restarts the song instead of going back
const RESTART_THRESHOLD_SECONDS = 3;

const MusicPlayerContext = createContext<MusicPlayerContextType | undefined>(undefined);

// Fisher-Yates shuffle, returns a new array
function shuffled<T>(items: T[]): T[] {
  const result = [...items];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

// Playback order with `first` at the front, either shuffled or in library order after it
function buildOrder(queue: Song[], first: Song, shuffle: boolean): Song[] {
  if (!shuffle) return queue;
  return [first, ...shuffled(queue.filter((s) => s.id !== first.id))];
}

export function MusicPlayerProvider({ children }: { children: ReactNode }) {
  const [activeSong, setActiveSong] = useState<Song | null>(null);
  const [isMaximized, setIsMaximized] = useState(false);
  const [isShuffled, setIsShuffled] = useState(false);

  // Refs so auto-advance and button handlers always see the latest queue
  const queueRef = useRef<Song[]>([]);   // library order
  const orderRef = useRef<Song[]>([]);   // playback order (shuffled or not)
  const indexRef = useRef(0);            // position in orderRef

  // One player for the whole app; songs are swapped in with replace()
  const player = useAudioPlayer();
  const status = useAudioPlayerStatus(player);

  // Initialize Audio mode for background playback
  useEffect(() => {
    setAudioModeAsync({
      playsInSilentMode: true,
      shouldPlayInBackground: true,
      // doNotMix is required for lock screen controls
      interruptionMode: 'doNotMix',
    });
    // Android 13+ hides the media notification and lock screen controls without this permission
    if (supportsLockScreen) requestNotificationPermissionsAsync();
  }, []);

  const loadSong = (song: Song) => {
    setActiveSong(song);
    try {
      player.replace({ uri: song.streamUrl, headers: song.headers });
      player.play();
    } catch (error) {
      console.error("Error streaming audio:", error);
      return;
    }

    // Lock screen / notification controls, also what keeps playback alive in the background on Android
    if (supportsLockScreen) {
      player.setActiveForLockScreen(true, {
        title: song.title,
        artist: song.artist,
        albumTitle: song.album,
        artworkUrl: song.coverArt,
      });
    }
  };

  const playSong = async (song: Song, queue: Song[] = queueRef.current) => {
    queueRef.current = queue.length ? queue : [song];
    orderRef.current = buildOrder(queueRef.current, song, isShuffled);
    indexRef.current = Math.max(0, orderRef.current.findIndex((s) => s.id === song.id));
    setIsMaximized(true);
    loadSong(song);
  };

  const shuffleAll = async (songs: Song[]) => {
    if (!songs.length) return;
    const first = songs[Math.floor(Math.random() * songs.length)];
    queueRef.current = songs;
    orderRef.current = buildOrder(songs, first, true);
    indexRef.current = 0;
    setIsShuffled(true);
    setIsMaximized(true);
    loadSong(first);
  };

  const toggleShuffle = () => {
    const next = !isShuffled;
    setIsShuffled(next);
    if (!activeSong) return;
    // Rebuild the order around the current song so playback continues seamlessly
    orderRef.current = buildOrder(queueRef.current, activeSong, next);
    indexRef.current = Math.max(0, orderRef.current.findIndex((s) => s.id === activeSong.id));
  };

  const playNext = async () => {
    const order = orderRef.current;
    if (!order.length) return;
    // Wrap around at the end so music keeps going
    indexRef.current = (indexRef.current + 1) % order.length;
    loadSong(order[indexRef.current]);
  };

  const playPrevious = async () => {
    if (status.currentTime > RESTART_THRESHOLD_SECONDS || indexRef.current === 0) {
      await player.seekTo(0);
      return;
    }
    indexRef.current -= 1;
    loadSong(orderRef.current[indexRef.current]);
  };

  const seekTo = async (millis: number) => {
    if (!activeSong) return;
    await player.seekTo(millis / 1000);
  };

  // Auto-advance when a song ends
  useEffect(() => {
    if (status.didJustFinish) playNext();
  }, [status.didJustFinish]);

  const togglePlay = async () => {
    if (!activeSong) return;
    if (status.playing) {
      player.pause();
    } else {
      player.play();
    }
  };

  const stopPlayback = async () => {
    player.pause();
    if (supportsLockScreen) player.clearLockScreenControls();
    setActiveSong(null);
    setIsMaximized(false);
  };

  // Jellyfin's duration is known before the stream loads, so use it until the player reports one
  const durationMillis = status.duration > 0
    ? status.duration * 1000
    : activeSong?.durationMillis ?? 0;

  return (
    <MusicPlayerContext.Provider
      value={{
        activeSong,
        isPlaying: status.playing,
        isMaximized,
        isShuffled,
        positionMillis: status.currentTime * 1000,
        durationMillis,
        playSong,
        shuffleAll,
        togglePlay,
        toggleShuffle,
        playNext,
        playPrevious,
        seekTo,
        setMaximized: setIsMaximized,
        stopPlayback,
      }}
    >
      {children}
    </MusicPlayerContext.Provider>
  );
}

export function useMusicPlayer() {
  const context = useContext(MusicPlayerContext);
  if (context === undefined) {
    throw new Error('useMusicPlayer must be used within a MusicPlayerProvider');
  }
  return context;
}
