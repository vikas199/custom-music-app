import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, FlatList, ActivityIndicator, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, Feather } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { Redirect, useRouter } from 'expo-router';
import { useMusicPlayer, Song } from '@/context/MusicPlayerContext';
import { useJellyfin } from '@/context/JellyfinContext';
import { fetchSongs } from '@/lib/jellyfin';

const formatDuration = (millis: number) => {
  if (!millis) return '--:--';
  const totalSeconds = Math.floor(millis / 1000);
  return `${Math.floor(totalSeconds / 60)}:${(totalSeconds % 60).toString().padStart(2, '0')}`;
};

export default function MusicLibraryScreen() {
  const router = useRouter();
  const { session, isRestoring, logout } = useJellyfin();
  const { activeSong, isPlaying, playSong, shuffleAll, togglePlay } = useMusicPlayer();

  const [songs, setSongs] = useState<Song[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadSongs = useCallback(async () => {
    if (!session) return;
    setError(null);
    try {
      setSongs(await fetchSongs(session));
    } catch (e) {
      setError(e instanceof TypeError
        ? 'Cannot reach server. Is Tailscale connected?'
        : (e as Error).message);
    }
  }, [session]);

  useEffect(() => {
    loadSongs().finally(() => setIsLoading(false));
  }, [loadSongs]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await loadSongs();
    setIsRefreshing(false);
  };

  if (isRestoring) return null;
  if (!session) return <Redirect href="/login" />;

  const handlePlayPress = (song: Song) => {
    if (activeSong?.id === song.id) {
      togglePlay(); // Pause/Play if it's the current song
    } else {
      playSong(song, songs); // Play the new song, queueing the whole list
    }
  };

  const renderSong = ({ item: song }: { item: Song }) => {
    const isActive = activeSong?.id === song.id;
    const isCurrentlyPlaying = isActive && isPlaying;

    return (
      <TouchableOpacity
        style={[styles.songRow, isActive && styles.songRowActive]}
        activeOpacity={0.7}
        onPress={() => handlePlayPress(song)}
      >
        {/* Album Art */}
        <View style={styles.albumArtPlaceholder}>
          {song.coverArt
            ? <Image source={{ uri: song.coverArt }} style={styles.albumArt} />
            : <Ionicons name="musical-notes" size={24} color={isActive ? "#00E5FF" : "#666"} />}
        </View>

        {/* Song Info */}
        <View style={styles.songInfo}>
          <Text style={[styles.songTitle, isActive && styles.songTitleActive]} numberOfLines={1}>
            {song.title}
          </Text>
          <Text style={styles.songArtist} numberOfLines={1}>
            {song.artist} <Text style={styles.divider}>|</Text> {formatDuration(song.durationMillis)}
          </Text>
        </View>

        {/* Play/Pause Button */}
        <TouchableOpacity style={styles.playButton} onPress={() => handlePlayPress(song)}>
          <Ionicons
            name={isCurrentlyPlaying ? "pause" : "play"}
            size={22}
            color={isActive ? "#00E5FF" : "#8B949E"}
          />
        </TouchableOpacity>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Feather name="arrow-left" size={24} color="#00E5FF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>NEON PULSE</Text>
        <TouchableOpacity onPress={logout}>
          <Feather name="log-out" size={24} color="#00E5FF" />
        </TouchableOpacity>
      </View>

      {/* Tabs */}
      <View style={styles.tabsContainer}>
        <TouchableOpacity style={styles.tabActive}>
          <Text style={styles.tabTextActive}>All Songs</Text>
          <View style={styles.activeIndicator} />
        </TouchableOpacity>
        <TouchableOpacity style={styles.tab}>
          <Text style={styles.tabText}>Favorites</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.tab}>
          <Text style={styles.tabText}>Playlists</Text>
        </TouchableOpacity>
      </View>

      {/* List Header */}
      <View style={styles.listHeader}>
        <Text style={styles.songCount}>{songs.length} songs</Text>
        <TouchableOpacity style={styles.shuffleButton} onPress={() => shuffleAll(songs)} disabled={!songs.length}>
          <Feather name="shuffle" size={18} color="#090C10" />
          <Text style={styles.shuffleText}>Shuffle</Text>
        </TouchableOpacity>
      </View>

      {error && <Text style={styles.error}>{error}</Text>}

      {/* Song List */}
      {isLoading ? (
        <ActivityIndicator size="large" color="#00E5FF" style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={songs}
          keyExtractor={(song) => song.id}
          renderItem={renderSong}
          contentContainerStyle={styles.listContainer}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={handleRefresh} tintColor="#00E5FF" colors={['#00E5FF']} />}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#090C10',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingTop: 20,
    marginBottom: 30,
  },
  headerTitle: {
    color: '#00E5FF',
    fontSize: 22,
    fontWeight: '900',
    letterSpacing: 2,
    textShadowColor: 'rgba(0, 229, 255, 0.8)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 15,
  },
  tabsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 24,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
    marginBottom: 20,
  },
  tab: {
    marginRight: 30,
    paddingBottom: 16,
  },
  tabActive: {
    marginRight: 30,
    paddingBottom: 16,
    position: 'relative',
  },
  tabText: {
    color: '#8B949E',
    fontSize: 16,
    fontWeight: '600',
  },
  tabTextActive: {
    color: '#00E5FF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  activeIndicator: {
    position: 'absolute',
    bottom: -1,
    left: 0,
    right: 0,
    height: 3,
    backgroundColor: '#00E5FF',
    shadowColor: '#00E5FF',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 5,
    elevation: 5,
  },
  listHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    marginBottom: 24,
  },
  songCount: {
    color: '#8B949E',
    fontSize: 14,
    fontWeight: '500',
  },
  shuffleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#00E5FF',
    borderRadius: 24,
    paddingVertical: 10,
    paddingHorizontal: 18,
  },
  shuffleText: {
    color: '#090C10',
    fontSize: 16,
    fontWeight: '800',
  },
  listContainer: {
    paddingHorizontal: 24,
    paddingBottom: 120, // Give space so the global mini-player doesn't cover the bottom items
  },
  songRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    padding: 12,
    borderRadius: 16,
  },
  songRowActive: {
    backgroundColor: 'rgba(0, 229, 255, 0.05)',
    borderWidth: 1,
    borderColor: 'rgba(0, 229, 255, 0.3)',
  },
  albumArtPlaceholder: {
    width: 64,
    height: 64,
    borderRadius: 12,
    backgroundColor: '#161B22',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
    overflow: 'hidden',
  },
  albumArt: {
    width: '100%',
    height: '100%',
  },
  error: {
    color: '#FF2A5F',
    fontSize: 15,
    paddingHorizontal: 24,
    marginBottom: 16,
  },
  songInfo: {
    flex: 1,
  },
  songTitle: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 6,
  },
  songTitleActive: {
    color: '#00E5FF',
  },
  songArtist: {
    color: '#8B949E',
    fontSize: 14,
  },
  divider: {
    color: '#444',
  },
  playButton: {
    padding: 8,
    paddingRight: 4, 
  }
});
