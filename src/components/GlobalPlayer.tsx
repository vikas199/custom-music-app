import React, { useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Dimensions, Image } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Image as ExpoImage } from 'expo-image';
import { Ionicons, Feather } from '@expo/vector-icons';
import Animated, { 
  useSharedValue, 
  useAnimatedStyle, 
  withTiming, 
  withSpring,
  interpolate,
  Extrapolation
} from 'react-native-reanimated';
import { useMusicPlayer } from '@/context/MusicPlayerContext';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');
const MINI_PLAYER_HEIGHT = 72;

// Helper to format ms to mm:ss
const formatTime = (millis: number) => {
  if (!millis) return "00:00";
  const totalSeconds = Math.floor(millis / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
};

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
    setMaximized 
  } = useMusicPlayer();
  
  // 0 = minimized, 1 = maximized
  const animationProgress = useSharedValue(0);

  useEffect(() => {
    animationProgress.value = withSpring(isMaximized ? 1 : 0, {
      damping: 20,
      stiffness: 200,
    });
  }, [isMaximized]);

  const animatedContainerStyle = useAnimatedStyle(() => {
    const minHeight = MINI_PLAYER_HEIGHT + (isMaximized ? 0 : insets.bottom + 16); // padding for floating look
    
    return {
      height: interpolate(
        animationProgress.value,
        [0, 1],
        [minHeight, SCREEN_HEIGHT],
        Extrapolation.CLAMP
      ),
      bottom: interpolate(
        animationProgress.value,
        [0, 1],
        [30, 0], // floats above bottom when minimized, flush when maximized
        Extrapolation.CLAMP
      ),
      left: interpolate(animationProgress.value, [0, 1], [16, 0]),
      right: interpolate(animationProgress.value, [0, 1], [16, 0]),
      borderRadius: interpolate(animationProgress.value, [0, 1], [16, 0]),
    };
  });

  const miniPlayerOpacity = useAnimatedStyle(() => ({
    opacity: interpolate(animationProgress.value, [0, 0.2], [1, 0], Extrapolation.CLAMP),
    pointerEvents: isMaximized ? 'none' : 'auto',
  }));

  const fullPlayerOpacity = useAnimatedStyle(() => ({
    opacity: interpolate(animationProgress.value, [0.8, 1], [0, 1], Extrapolation.CLAMP),
    pointerEvents: isMaximized ? 'auto' : 'none',
  }));

  if (!activeSong) return null;

  return (
    <Animated.View style={[styles.container, animatedContainerStyle]}>
      
      {/* ==================================================== */}
      {/* MINI PLAYER (Visible when isMaximized = false) */}
      {/* ==================================================== */}
      <Animated.View style={[StyleSheet.absoluteFill, styles.miniPlayerContent, miniPlayerOpacity]}>
        <TouchableOpacity 
          style={styles.miniPlayerTouchable} 
          onPress={() => setMaximized(true)}
          activeOpacity={1}
        >
          {/* Mini Album Art */}
          <View style={styles.miniAlbumArt}>
            {activeSong.coverArt
              ? <ExpoImage source={{ uri: activeSong.coverArt }} style={styles.coverImage} />
              : <Ionicons name="musical-notes" size={24} color="#00E5FF" />}
          </View>
          
          <View style={styles.miniTextContainer}>
            <Text style={styles.miniTitle} numberOfLines={1}>{activeSong.title}</Text>
            <Text style={styles.miniArtist} numberOfLines={1}>{activeSong.artist}</Text>
          </View>
        </TouchableOpacity>

        {/* Mini Controls */}
        <View style={styles.miniControls}>
          <TouchableOpacity style={styles.miniControlButton}>
            <Feather name="cast" size={20} color="#FFFFFF" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.miniControlButton} onPress={togglePlay}>
            <Ionicons name={isPlaying ? "pause" : "play"} size={28} color="#00E5FF" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.miniControlButton} onPress={playNext}>
            <Ionicons name="play-skip-forward" size={24} color="#FFFFFF" />
          </TouchableOpacity>
        </View>
      </Animated.View>

      {/* ==================================================== */}
      {/* FULL SCREEN PLAYER (Visible when isMaximized = true) */}
      {/* ==================================================== */}
      <Animated.View style={[StyleSheet.absoluteFill, styles.fullPlayerContent, { paddingTop: insets.top }, fullPlayerOpacity]}>
        
        {/* Top Bar */}
        <View style={styles.topBar}>
          <TouchableOpacity onPress={() => setMaximized(false)} style={styles.iconButton}>
            <Feather name="chevron-down" size={28} color="#FFFFFF" />
          </TouchableOpacity>
          <View style={styles.nowPlayingHeader}>
            <Text style={styles.nowPlayingSubtitle}>NOW PLAYING</Text>
            <Text style={styles.nowPlayingPlaylist}>Synthwave Essentials</Text>
          </View>
          <TouchableOpacity style={styles.iconButton}>
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
          <TouchableOpacity>
            <Feather name="heart" size={24} color="#FFFFFF" />
          </TouchableOpacity>
        </View>

        {/* Progress Bar */}
        <View style={styles.progressContainer}>
          <View style={styles.progressBarBackground}>
            <View style={[styles.progressBarFill, { width: `${durationMillis > 0 ? (positionMillis / durationMillis) * 100 : 0}%` }]} />
            <View style={[styles.progressKnob, { left: `${durationMillis > 0 ? (positionMillis / durationMillis) * 100 : 0}%` }]} />
          </View>
          <View style={styles.timeRow}>
            <Text style={styles.timeText}>{formatTime(positionMillis)}</Text>
            <Text style={styles.timeText}>{formatTime(durationMillis)}</Text>
          </View>
        </View>

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
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    backgroundColor: '#11151C', // Mini player background
    overflow: 'hidden',
    borderWidth: 1,
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
    gap: 16,
    paddingRight: 8,
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
  nowPlayingPlaylist: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
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
  progressContainer: {
    marginBottom: 40,
  },
  progressBarBackground: {
    height: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 3,
    marginBottom: 12,
    position: 'relative',
    justifyContent: 'center',
  },
  progressBarFill: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: '35%',
    backgroundColor: '#00E5FF',
    borderRadius: 3,
  },
  progressKnob: {
    position: 'absolute',
    left: '35%',
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#00E5FF',
    shadowColor: '#00E5FF',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 10,
    marginLeft: -8, // center over the edge
  },
  timeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  timeText: {
    color: '#8B949E',
    fontSize: 12,
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
