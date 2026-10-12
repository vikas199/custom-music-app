import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Dimensions, LayoutChangeEvent } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Image as ExpoImage } from 'expo-image';
import { Ionicons, Feather } from '@expo/vector-icons';
import Animated, { 
  useSharedValue, 
  useAnimatedStyle, 
  withTiming, 
  interpolate,
  Easing,
  Extrapolation
} from 'react-native-reanimated';
import { useMusicPlayer } from '@/context/MusicPlayerContext';
import SeekBar from '@/components/SeekBar';
import PlaylistSheet from '@/components/PlaylistSheet';
import { useLibrary } from '@/context/LibraryContext';

const MINI_PLAYER_HEIGHT = 72;
const MINI_PLAYER_BOTTOM = 30;
const MINI_PLAYER_SIDE = 16;
const TRANSITION_MS = 320;

export default function GlobalPlayer() {
  const insets = useSafeAreaInsets();
  const { 
    activeSong, 
    isPlaying, 
    isMaximized, 
    positionMillis, 
    durationMillis, 
    isShuffled,
    togglePlay, 
    toggleShuffle,
    playNext,
    playPrevious,
    seekTo,
    setMaximized,
    stopPlayback
  } = useMusicPlayer();
  const { isFavorite, toggleFavorite } = useLibrary();
  
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  // 0 = minimized, 1 = maximized
  const animationProgress = useSharedValue(0);
  // Real height of the area the player lives in. Dimensions 'window' excludes the status bar
  // on edge-to-edge Android, which left a gap at the top, so measure it instead.
  const hostHeight = useSharedValue(Dimensions.get('screen').height);

  useEffect(() => {
    // Timing instead of spring: a spring overshoots, which made the margins and corners shake
    animationProgress.value = withTiming(isMaximized ? 1 : 0, {
      duration: TRANSITION_MS,
      easing: Easing.out(Easing.cubic),
    });
  }, [isMaximized]);

  const onHostLayout = (event: LayoutChangeEvent) => {
    hostHeight.value = event.nativeEvent.layout.height;
  };

  const animatedContainerStyle = useAnimatedStyle(() => {
    // Mini height is constant; it used to change the instant isMaximized flipped, causing a jump
    const miniHeight = MINI_PLAYER_HEIGHT + insets.bottom + 16;
    const lerp = (from: number, to: number) =>
      interpolate(animationProgress.value, [0, 1], [from, to], Extrapolation.CLAMP);

    return {
      height: lerp(miniHeight, hostHeight.value),
      bottom: lerp(MINI_PLAYER_BOTTOM, 0), // floats above bottom when minimized, flush when maximized
      left: lerp(MINI_PLAYER_SIDE, 0),
      right: lerp(MINI_PLAYER_SIDE, 0),
      borderRadius: lerp(16, 0),
      borderWidth: lerp(1, 0),
    };
  });

  // The two layers overlap mid-transition so there's never a moment where both are invisible
  const miniPlayerOpacity = useAnimatedStyle(() => ({
    opacity: interpolate(animationProgress.value, [0, 0.3], [1, 0], Extrapolation.CLAMP),
  }));

  const fullPlayerOpacity = useAnimatedStyle(() => ({
    opacity: interpolate(animationProgress.value, [0.15, 0.6], [0, 1], Extrapolation.CLAMP),
  }));

  if (!activeSong) return null;

  return (
    // Full-screen host that ignores touches itself; used to measure the real screen height
    <View style={StyleSheet.absoluteFill} pointerEvents="box-none" onLayout={onHostLayout}>
      <Animated.View style={[styles.container, animatedContainerStyle]}>
      
        {/* ==================================================== */}
        {/* MINI PLAYER (Visible when isMaximized = false) */}
        {/* ==================================================== */}
        <Animated.View
          style={[StyleSheet.absoluteFill, styles.miniPlayerContent, miniPlayerOpacity]}
          pointerEvents={isMaximized ? 'none' : 'auto'}
        >
          <TouchableOpacity 
            style={styles.miniPlayerTouchable} 
            onPress={() => setMaximized(true)}
            activeOpacity={1}
          >
            {/* Mini Album Art */}
            <View style={styles.miniAlbumArt}>
              {activeSong.thumbnail ?? activeSong.coverArt
                ? <ExpoImage source={{ uri: activeSong.thumbnail ?? activeSong.coverArt }} style={styles.coverImage} />
                : <Ionicons name="musical-notes" size={24} color="#00E5FF" />}
            </View>
          
            <View style={styles.miniTextContainer}>
              <Text style={styles.miniTitle} numberOfLines={1}>{activeSong.title}</Text>
              <Text style={styles.miniArtist} numberOfLines={1}>{activeSong.artist}</Text>
            </View>
          </TouchableOpacity>

          {/* Mini Controls */}
          <View style={styles.miniControls}>
            <TouchableOpacity style={styles.miniControlButton} onPress={togglePlay}>
              <Ionicons name={isPlaying ? "pause" : "play"} size={28} color="#00E5FF" />
            </TouchableOpacity>
            <TouchableOpacity style={styles.miniControlButton} onPress={playNext}>
              <Ionicons name="play-skip-forward" size={24} color="#FFFFFF" />
            </TouchableOpacity>
            <TouchableOpacity style={styles.miniControlButton} onPress={stopPlayback}>
              <Feather name="x" size={22} color="#8B949E" />
            </TouchableOpacity>
          </View>
        </Animated.View>

        {/* ==================================================== */}
        {/* FULL SCREEN PLAYER (Visible when isMaximized = true) */}
        {/* ==================================================== */}
        <Animated.View
          style={[StyleSheet.absoluteFill, styles.fullPlayerContent, { paddingTop: insets.top, paddingBottom: insets.bottom }, fullPlayerOpacity]}
          pointerEvents={isMaximized ? 'auto' : 'none'}
        >
        
          {/* Top Bar */}
          <View style={styles.topBar}>
            <TouchableOpacity onPress={() => setMaximized(false)} style={styles.iconButton}>
              <Feather name="chevron-down" size={28} color="#FFFFFF" />
            </TouchableOpacity>
            <View style={styles.nowPlayingHeader}>
              <Text style={styles.nowPlayingSubtitle}>NOW PLAYING</Text>
            </View>
            <TouchableOpacity style={styles.iconButton} onPress={() => setIsMenuOpen(true)}>
              <Feather name="more-vertical" size={24} color="#FFFFFF" />
            </TouchableOpacity>
          </View>

          {/* Massive Album Art */}
          <View style={styles.albumArtContainer}>
            {/* Placeholder for massive album art matching the Claude design */}
            <View style={styles.massiveAlbumPlaceholder}>
              {activeSong.coverArt ? (
                <ExpoImage source={{ uri: activeSong.coverArt }} style={styles.coverImage} />
              ) : (
                <>
                  <Ionicons name="musical-notes" size={100} color="#00E5FF" style={{ opacity: 0.5 }} />
                  <Text style={styles.albumArtText}>{activeSong.title}</Text>
                  <Text style={styles.albumArtSubtext}>{activeSong.artist}</Text>
                </>
              )}
            </View>
          </View>

          {/* Song Info & Favorite */}
          <View style={styles.songInfoContainer}>
            <View style={styles.songTextWrapper}>
              <Text style={styles.fullTitle} numberOfLines={2}>{activeSong.title}</Text>
              <Text style={styles.fullArtist}>{activeSong.artist}</Text>
            </View>
            <TouchableOpacity style={styles.iconButton} onPress={() => toggleFavorite(activeSong)}>
              <Ionicons
                name={isFavorite(activeSong.id) ? "heart" : "heart-outline"}
                size={28}
                color={isFavorite(activeSong.id) ? "#00E5FF" : "#FFFFFF"}
              />
            </TouchableOpacity>
          </View>

          {/* Progress Bar (drag or tap to seek) */}
          <SeekBar positionMillis={positionMillis} durationMillis={durationMillis} onSeek={seekTo} />

          {/* Playback Controls */}
          <View style={styles.playbackControls}>
            <TouchableOpacity style={styles.controlIcon} onPress={toggleShuffle}>
              <Feather name="shuffle" size={24} color={isShuffled ? "#00E5FF" : "#FFFFFF"} />
              {isShuffled && <View style={styles.shuffleDot} />}
            </TouchableOpacity>
          
            <TouchableOpacity style={styles.controlIcon} onPress={playPrevious}>
              <Ionicons name="play-skip-back" size={32} color="#FFFFFF" />
            </TouchableOpacity>
          
            {/* Giant Cyan Play Button */}
            <TouchableOpacity style={styles.giantPlayButton} onPress={togglePlay}>
              <Ionicons name={isPlaying ? "pause" : "play"} size={48} color="#090C10" style={styles.giantPlayIcon} />
            </TouchableOpacity>
          
            <TouchableOpacity style={styles.controlIcon} onPress={playNext}>
              <Ionicons name="play-skip-forward" size={32} color="#FFFFFF" />
            </TouchableOpacity>

            <TouchableOpacity style={styles.controlIcon}>
              <Feather name="rotate-cw" size={24} color="#FFFFFF" />
            </TouchableOpacity>
          </View>

        </Animated.View>

      </Animated.View>

      <PlaylistSheet visible={isMenuOpen} song={activeSong} onClose={() => setIsMenuOpen(false)} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    backgroundColor: '#11151C', // Mini player background
    overflow: 'hidden',
    borderColor: 'rgba(0, 229, 255, 0.1)',
    shadowColor: '#00E5FF',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.2,
    shadowRadius: 20,
    elevation: 10,
    zIndex: 999, // Float above everything
  },
  
  // --- MINI PLAYER STYLES ---
  miniPlayerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
  },
  miniPlayerTouchable: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  miniAlbumArt: {
    width: 48,
    height: 48,
    borderRadius: 8,
    backgroundColor: '#1A222C',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    overflow: 'hidden',
  },
  coverImage: {
    width: '100%',
    height: '100%',
  },
  miniTextContainer: {
    flex: 1,
    justifyContent: 'center',
  },
  miniTitle: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  miniArtist: {
    color: '#8B949E',
    fontSize: 14,
  },
  miniControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingRight: 4,
  },
  miniControlButton: {
    padding: 4,
  },

  // --- FULL PLAYER STYLES ---
  fullPlayerContent: {
    backgroundColor: '#090C10', // Darker background for full screen
    paddingHorizontal: 24,
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 10,
    marginBottom: 30,
  },
  iconButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  nowPlayingHeader: {
    alignItems: 'center',
  },
  nowPlayingSubtitle: {
    color: '#8B949E',
    fontSize: 12,
    letterSpacing: 2,
    marginBottom: 4,
  },
  albumArtContainer: {
    alignItems: 'center',
    marginBottom: 40,
  },
  massiveAlbumPlaceholder: {
    width: '100%',
    aspectRatio: 1,
    borderRadius: 30,
    overflow: 'hidden',
    backgroundColor: '#161B22',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#00E5FF',
    shadowOffset: { width: 0, height: 20 },
    shadowOpacity: 0.15,
    shadowRadius: 30,
    elevation: 15,
  },
  albumArtText: {
    color: '#FFFFFF',
    fontSize: 32,
    fontWeight: 'bold',
    marginTop: 16,
  },
  albumArtSubtext: {
    color: '#8B949E',
    fontSize: 16,
    marginTop: 8,
  },
  songInfoContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 30,
  },
  songTextWrapper: {
    flex: 1,
  },
  fullTitle: {
    color: '#FFFFFF',
    fontSize: 32,
    fontWeight: 'bold',
    marginBottom: 6,
  },
  fullArtist: {
    color: '#8B949E',
    fontSize: 18,
  },
  playbackControls: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 10,
  },
  controlIcon: {
    padding: 10,
    alignItems: 'center',
  },
  shuffleDot: {
    position: 'absolute',
    bottom: 0,
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#00E5FF',
  },
  giantPlayButton: {
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: '#00E5FF',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#00E5FF',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 30,
    elevation: 20,
  },
  giantPlayIcon: {
    marginLeft: 6, // Optical centering for play triangle
  },
});
