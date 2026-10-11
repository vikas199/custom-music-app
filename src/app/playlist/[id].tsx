import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, FlatList, ActivityIndicator, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { Redirect, useLocalSearchParams, useRouter } from 'expo-router';

import { useMusicPlayer, Song } from '@/context/MusicPlayerContext';
import { useJellyfin } from '@/context/JellyfinContext';
import { useLibrary } from '@/context/LibraryContext';
import SongRow from '@/components/SongRow';
import { formatCount } from '@/lib/format';

export default function PlaylistScreen() {
  const router = useRouter();
  const { id, name } = useLocalSearchParams<{ id: string; name?: string }>();
  const { session, isRestoring } = useJellyfin();
  const { activeSong, isPlaying, playSong, shuffleAll, togglePlay } = useMusicPlayer();

  const { getPlaylistSongs, loadPlaylist, error } = useLibrary();

  const [isRefreshing, setIsRefreshing] = useState(false);

  // Cached songs show instantly; null means this playlist was never downloaded
  const cachedSongs = id ? getPlaylistSongs(id) : null;
  const songs = cachedSongs ?? [];
  const isLoading = cachedSongs === null && !error;

  // Downloads only if missing or stale (see LibraryContext)
  useEffect(() => {
    if (id) loadPlaylist(id);
  }, [id]);

  const handleRefresh = async () => {
    if (!id) return;
    setIsRefreshing(true);
    await loadPlaylist(id, true);
    setIsRefreshing(false);
  };

  if (isRestoring) return null;
  if (!session) return <Redirect href="/login" />;

  const handlePlayPress = (song: Song) => {
    if (activeSong?.id === song.id) {
      togglePlay();
    } else {
      playSong(song, songs); // Queue the playlist, in playlist order
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.iconButton}>
          <Feather name="arrow-left" size={24} color="#00E5FF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>{name ?? 'Playlist'}</Text>
        <View style={styles.iconButton} />
      </View>

      {/* List Header */}
      <View style={styles.listHeader}>
        <Text style={styles.songCount}>{formatCount(songs.length, 'song')}</Text>
        <TouchableOpacity
          style={[styles.shuffleButton, !songs.length && styles.buttonDisabled]}
          onPress={() => shuffleAll(songs)}
          disabled={!songs.length}
        >
          <Feather name="shuffle" size={18} color="#090C10" />
          <Text style={styles.shuffleText}>Shuffle</Text>
        </TouchableOpacity>
      </View>

      {error && <Text style={styles.error}>{error}</Text>}

      {isLoading ? (
        <ActivityIndicator size="large" color="#00E5FF" style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={songs}
          keyExtractor={(song, index) => `${song.id}-${index}`}
          renderItem={({ item }) => (
            <SongRow
              song={item}
              isActive={activeSong?.id === item.id}
              isPlaying={isPlaying}
              onPress={() => handlePlayPress(item)}
            />
          )}
          contentContainerStyle={styles.listContainer}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <Text style={styles.emptyText}>
              No songs yet. While a song is playing, tap ⋮ → Add to playlist.
            </Text>
          }
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
    paddingHorizontal: 14,
    paddingTop: 10,
    marginBottom: 20,
  },
  iconButton: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    flex: 1,
    color: '#FFFFFF',
    fontSize: 24,
    fontWeight: '900',
    textAlign: 'center',
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
  buttonDisabled: {
    opacity: 0.4,
  },
  listContainer: {
    paddingHorizontal: 24,
    paddingBottom: 120, // Give space so the global mini-player doesn't cover the bottom items
  },
  emptyText: {
    color: '#8B949E',
    fontSize: 16,
    textAlign: 'center',
    marginTop: 40,
    paddingHorizontal: 24,
  },
  error: {
    color: '#FF2A5F',
    fontSize: 15,
    paddingHorizontal: 24,
    marginBottom: 16,
  },
});
