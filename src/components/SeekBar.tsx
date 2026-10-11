import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, PanResponder, LayoutChangeEvent } from 'react-native';

// Tall invisible touch area around the thin track, so it's easy to grab while driving or at the gym
const TOUCH_HEIGHT = 44;
// After a seek, keep showing the target until playback catches up (avoids the knob jumping back)
const SEEK_SETTLE_TOLERANCE_MS = 1500;
const SEEK_SETTLE_TIMEOUT_MS = 2000;

interface SeekBarProps {
  positionMillis: number;
  durationMillis: number;
  onSeek: (millis: number) => void;
}

const formatTime = (millis: number) => {
  if (!millis) return "00:00";
  const totalSeconds = Math.floor(millis / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
};

const clamp = (value: number) => Math.min(1, Math.max(0, value));

export default function SeekBar({ positionMillis, durationMillis, onSeek }: SeekBarProps) {
  // Ratio (0-1) while the finger is down, null otherwise
  const [scrubRatio, setScrubRatio] = useState<number | null>(null);
  // Seek target in ms, held until playback reaches it
  const [pendingSeekMillis, setPendingSeekMillis] = useState<number | null>(null);

  // PanResponder is created once, so it reads the latest values through refs
  const widthRef = useRef(0);
  const grantXRef = useRef(0);
  const durationRef = useRef(durationMillis);
  const onSeekRef = useRef(onSeek);
  durationRef.current = durationMillis;
  onSeekRef.current = onSeek;

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => durationRef.current > 0,
      onMoveShouldSetPanResponder: () => durationRef.current > 0,
      onPanResponderTerminationRequest: () => false,
      onPanResponderGrant: (event) => {
        // Tapping anywhere on the bar jumps the knob there
        grantXRef.current = event.nativeEvent.locationX;
        setScrubRatio(clamp(grantXRef.current / widthRef.current));
      },
      onPanResponderMove: (_, gesture) => {
        setScrubRatio(clamp((grantXRef.current + gesture.dx) / widthRef.current));
      },
      onPanResponderRelease: (_, gesture) => {
        const ratio = clamp((grantXRef.current + gesture.dx) / widthRef.current);
        const target = ratio * durationRef.current;
        setPendingSeekMillis(target);
        setScrubRatio(null);
        onSeekRef.current(target);
      },
      onPanResponderTerminate: () => setScrubRatio(null),
    })
  ).current;

  // Release the held seek target once playback has caught up, or after a timeout
  useEffect(() => {
    if (pendingSeekMillis === null) return;
    if (Math.abs(positionMillis - pendingSeekMillis) < SEEK_SETTLE_TOLERANCE_MS) {
      setPendingSeekMillis(null);
      return;
    }
    const timer = setTimeout(() => setPendingSeekMillis(null), SEEK_SETTLE_TIMEOUT_MS);
    return () => clearTimeout(timer);
  }, [positionMillis, pendingSeekMillis]);

  const onLayout = (event: LayoutChangeEvent) => {
    widthRef.current = event.nativeEvent.layout.width;
  };

  const shownMillis = scrubRatio !== null
    ? scrubRatio * durationMillis
    : pendingSeekMillis ?? positionMillis;
  const percent = durationMillis > 0 ? clamp(shownMillis / durationMillis) * 100 : 0;
  const isScrubbing = scrubRatio !== null;

  return (
    <View style={styles.container}>
      <View style={styles.touchArea} onLayout={onLayout} {...panResponder.panHandlers}>
        {/* Children ignore touches so locationX is always relative to the touch area */}
        <View style={styles.track} pointerEvents="none">
          <View style={[styles.fill, { width: `${percent}%` }]} />
          <View style={[styles.knob, isScrubbing && styles.knobActive, { left: `${percent}%` }]} />
        </View>
      </View>
      <View style={styles.timeRow}>
        <Text style={[styles.timeText, isScrubbing && styles.timeTextActive]}>{formatTime(shownMillis)}</Text>
        <Text style={styles.timeText}>{formatTime(durationMillis)}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 40,
  },
  touchArea: {
    height: TOUCH_HEIGHT,
    justifyContent: 'center',
  },
  track: {
    height: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 3,
    justifyContent: 'center',
  },
  fill: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    backgroundColor: '#00E5FF',
    borderRadius: 3,
  },
  knob: {
    position: 'absolute',
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
  knobActive: {
    width: 24,
    height: 24,
    borderRadius: 12,
    marginLeft: -12,
  },
  timeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  timeText: {
    color: '#8B949E',
    fontSize: 12,
  },
  timeTextActive: {
    color: '#00E5FF',
  },
});
