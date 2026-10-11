import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';

import type { Song } from '@/context/MusicPlayerContext';

const formatDuration = (millis: number) => {
  if (!millis) return '--:--';
  const totalSeconds = Math.floor(millis / 1000);
  return `${Math.floor(totalSeconds / 60)}:${(totalSeconds % 60).toString().padStart(2, '0')}`;
};

interface SongRowProps {
  song: Song;
  isActive: boolean;
  isPlaying: boolean;
  onPress: () => void;
  // Shows a filled heart that removes the song from favorites (Favorites tab only)
  onUnfavorite?: () => void;
}

export default function SongRow({ song, isActive, isPlaying, onPress, onUnfavorite }: SongRowProps) {
  return (
    <TouchableOpacity
      style={[styles.songRow, isActive && styles.songRowActive]}
      activeOpacity={0.7}
      onPress={onPress}
    >
      {/* Album Art */}
      <View style={styles.albumArtPlaceholder}>
        {song.thumbnail ?? song.coverArt
          ? <Image source={{ uri: song.thumbnail ?? song.coverArt }} style={styles.albumArt} recyclingKey={song.id} />
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

      {onUnfavorite && (
        <TouchableOpacity style={styles.iconButton} onPress={onUnfavorite}>
          <Ionicons name="heart" size={22} color="#00E5FF" />
        </TouchableOpacity>
      )}

      {/* Play/Pause Button */}
      <TouchableOpacity style={styles.playButton} onPress={onPress}>
        <Ionicons
          name={isActive && isPlaying ? "pause" : "play"}
          size={22}
          color={isActive ? "#00E5FF" : "#8B949E"}
        />
      </TouchableOpacity>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
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
  iconButton: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  playButton: {
    padding: 8,
    paddingRight: 4,
  },
});
