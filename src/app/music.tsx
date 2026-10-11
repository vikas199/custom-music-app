import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, FlatList, ActivityIndicator, RefreshControl, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, Feather } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { Redirect, useRouter } from 'expo-router';
import { useMusicPlayer, Song } from '@/context/MusicPlayerContext';
import { useJellyfin } from '@/context/JellyfinContext';
import { useLibrary } from '@/context/LibraryContext';
import { Playlist, errorMessage } from '@/lib/jellyfin';
import SongRow from '@/components/SongRow';
import PlaylistSheet from '@/components/PlaylistSheet';
import ActionSheet from '@/components/ActionSheet';
import { formatCount } from '@/lib/format';
import { APP_TITLE } from '@/constants/app';

type Tab = 'songs' | 'favorites' | 'playlists';

const TABS: { key: Tab; label: string }[] = [
  { key: 'songs', label: 'All Songs' },
  { key: 'favorites', label: 'Favorites' },
  { key: 'playlists', label: 'Playlists' },
];

export default function MusicLibraryScreen() {
  const router = useRouter();
  const { session, isRestoring, logout } = useJellyfin();
  const { activeSong, isPlaying, playSong, shuffleAll, togglePlay } = useMusicPlayer();

  const { songs, favorites, playlists, isLoading, error: syncError, refresh, deletePlaylist, toggleFavorite } = useLibrary();

  const [tab, setTab] = useState<Tab>('songs');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  // Playlist whose ⋮ menu is open
  const [menuPlaylist, setMenuPlaylist] = useState<Playlist | null>(null);

  const error = actionError ?? syncError;

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await refresh();
    setIsRefreshing(false);
  };

  if (isRestoring) return null;
  if (!session) return <Redirect href="/login" />;

  // Tapping a song queues the list it was tapped in (All Songs or Favorites)
  const handlePlayPress = (song: Song, queue: Song[]) => {
    if (activeSong?.id === song.id) {
      togglePlay(); // Pause/Play if it's the current song
    } else {
      playSong(song, queue);
    }
  };

  const confirmDelete = (playlist: Playlist) => {
    Alert.alert(
      `Delete "${playlist.name}"?`,
      'The playlist will be removed. The songs stay in your library.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              setActionError(null);
              await deletePlaylist(playlist.id);
            } catch (e) {
              setActionError(errorMessage(e));
            }
          },
        },
      ]
    );
  };

  const refreshControl = (
    <RefreshControl refreshing={isRefreshing} onRefresh={handleRefresh} tintColor="#00E5FF" colors={['#00E5FF']} />
  );

  const renderPlaylist = ({ item }: { item: Playlist }) => (
    <TouchableOpacity
      style={styles.playlistRow}
      activeOpacity={0.7}
      onPress={() => router.push({ pathname: '/playlist/[id]', params: { id: item.id, name: item.name } })}
    >
      <View style={styles.playlistArt}>
        {item.coverArt
          ? <Image source={{ uri: item.coverArt }} style={styles.playlistArtImage} />
          : <Ionicons name="musical-notes" size={24} color="#00E5FF" />}
      </View>
      <View style={styles.playlistInfo}>
        <Text style={styles.playlistName} numberOfLines={1}>{item.name}</Text>
        <Text style={styles.playlistCount}>{formatCount(item.songCount, 'song')}</Text>
      </View>
      <TouchableOpacity style={styles.menuButton} onPress={() => setMenuPlaylist(item)}>
        <Feather name="more-vertical" size={24} color="#8B949E" />
      </TouchableOpacity>
    </TouchableOpacity>
  );

  const renderContent = () => {
    if (isLoading) {
      return <ActivityIndicator size="large" color="#00E5FF" style={{ marginTop: 40 }} />;
    }


    if (tab === 'playlists') {
      return (
        <>
          <View style={styles.listHeader}>
            <Text style={styles.songCount}>{formatCount(playlists.length, 'playlist')}</Text>
            <TouchableOpacity style={styles.shuffleButton} onPress={() => setIsCreateOpen(true)}>
              <Feather name="plus" size={18} color="#090C10" />
              <Text style={styles.shuffleText}>New</Text>
            </TouchableOpacity>
          </View>
          {error && <Text style={styles.error}>{error}</Text>}
          <FlatList
            data={playlists}
            keyExtractor={(p) => p.id}
            renderItem={renderPlaylist}
            contentContainerStyle={styles.listContainer}
            showsVerticalScrollIndicator={false}
            ListEmptyComponent={<Text style={styles.emptyText}>No playlists yet. Tap New to create one.</Text>}
            refreshControl={refreshControl}
          />
        </>
      );
    }

    const list = tab === 'favorites' ? favorites : songs;
    return (
      <>
        <View style={styles.listHeader}>
          <Text style={styles.songCount}>{formatCount(list.length, 'song')}</Text>
          <TouchableOpacity
            style={[styles.shuffleButton, !list.length && styles.buttonDisabled]}
            onPress={() => shuffleAll(list)}
            disabled={!list.length}
          >
            <Feather name="shuffle" size={18} color="#090C10" />
            <Text style={styles.shuffleText}>Shuffle</Text>
          </TouchableOpacity>
        </View>
        {error && <Text style={styles.error}>{error}</Text>}
        <FlatList
          data={list}
          keyExtractor={(song) => song.id}
          renderItem={({ item }) => (
            <SongRow
              song={item}
              isActive={activeSong?.id === item.id}
              isPlaying={isPlaying}
              onPress={() => handlePlayPress(item, list)}
              onUnfavorite={tab === 'favorites' ? () => toggleFavorite(item) : undefined}
            />
          )}
          contentContainerStyle={styles.listContainer}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            tab === 'favorites'
              ? <Text style={styles.emptyText}>No favorites yet. Tap ♡ on the now-playing screen to add one.</Text>
              : null
          }
          refreshControl={refreshControl}
        />
      </>
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Feather name="arrow-left" size={24} color="#00E5FF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{APP_TITLE}</Text>
        <TouchableOpacity onPress={logout}>
          <Feather name="log-out" size={24} color="#00E5FF" />
        </TouchableOpacity>
      </View>

      {/* Tabs */}
      <View style={styles.tabsContainer}>
        {TABS.map(({ key, label }) => {
          const isActive = tab === key;
          return (
            <TouchableOpacity key={key} style={styles.tab} onPress={() => { setTab(key); setActionError(null); }}>
              <Text style={isActive ? styles.tabTextActive : styles.tabText}>{label}</Text>
              {isActive && <View style={styles.activeIndicator} />}
            </TouchableOpacity>
          );
        })}
      </View>

      {renderContent()}

      <PlaylistSheet
        visible={isCreateOpen}
        initialMode="create"
        onClose={() => setIsCreateOpen(false)}
      />

      <ActionSheet
        visible={menuPlaylist !== null}
        title={menuPlaylist?.name}
        onClose={() => setMenuPlaylist(null)}
        actions={menuPlaylist ? [
          { label: 'Delete playlist', icon: 'trash-2', destructive: true, onPress: () => confirmDelete(menuPlaylist) },
        ] : []}
      />
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
  buttonDisabled: {
    opacity: 0.4,
  },
  listContainer: {
    paddingHorizontal: 24,
    paddingBottom: 120, // Give space so the global mini-player doesn't cover the bottom items
  },
  error: {
    color: '#FF2A5F',
    fontSize: 15,
    paddingHorizontal: 24,
    marginBottom: 16,
  },
  emptyText: {
    color: '#8B949E',
    fontSize: 16,
    textAlign: 'center',
    marginTop: 40,
    paddingHorizontal: 24,
  },
  playlistRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    marginBottom: 16,
    padding: 12,
    borderRadius: 16,
  },
  playlistArt: {
    width: 64,
    height: 64,
    borderRadius: 12,
    backgroundColor: '#161B22',
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  playlistArtImage: {
    width: '100%',
    height: '100%',
  },
  playlistInfo: {
    flex: 1,
  },
  playlistName: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 6,
  },
  playlistCount: {
    color: '#8B949E',
    fontSize: 14,
  },
  menuButton: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
