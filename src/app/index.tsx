import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

export default function HomeScreen() {
  const router = useRouter();

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.wrapper}>
        <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
          
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity>
              <Feather name="menu" size={24} color="#00E5FF" />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>NEON PULSE</Text>
            <TouchableOpacity>
              <Feather name="search" size={24} color="#00E5FF" />
            </TouchableOpacity>
          </View>

          {/* Title Section */}
          <View style={styles.titleSection}>
            <Text style={styles.mainTitle}>HUB</Text>
            <Text style={styles.subtitle}>
              Access your primary utilities. High{'\n'}contrast mode active.
            </Text>
          </View>

          {/* Music Player Card */}
          <TouchableOpacity 
            style={[styles.card, styles.musicCard]} 
            activeOpacity={0.8}
            onPress={() => router.push('/music')}
          >
            <View style={styles.musicIconContainer}>
              <Ionicons name="play" size={32} color="#00E5FF" style={styles.playIcon} />
            </View>
            <Text style={styles.cardTitle}>Music Player</Text>
            <Text style={styles.musicSubtitle}>ACTIVE STREAM</Text>
            {/* Visualizer bars */}
            <View style={styles.visualizer}>
              <View style={[styles.bar, { height: 16 }]} />
              <View style={[styles.bar, { height: 32 }]} />
              <View style={[styles.bar, { height: 20 }]} />
              <View style={[styles.bar, { height: 38 }]} />
              <View style={[styles.bar, { height: 18 }]} />
            </View>
          </TouchableOpacity>

          {/* Password Vault Card */}
          <TouchableOpacity 
            style={[styles.card, styles.vaultCard]} 
            activeOpacity={0.8}
          >
            <View style={styles.vaultBadge} />
            <View style={styles.vaultIconContainer}>
              <Feather name="lock" size={32} color="#FF2A5F" />
            </View>
            <Text style={styles.cardTitle}>Password Vault</Text>
            <Text style={styles.vaultSubtitle}>LOCKED</Text>
          </TouchableOpacity>

        </ScrollView>

        {/* Custom Pill Tab Bar */}
        <View style={styles.tabBarContainer}>
          <View style={styles.tabBar}>
            <TouchableOpacity style={styles.tabItemActive}>
              <Feather name="compass" size={20} color="#00E5FF" />
            </TouchableOpacity>
            <TouchableOpacity style={styles.tabItem}>
              <Feather name="bar-chart-2" size={20} color="#666" />
            </TouchableOpacity>
            <TouchableOpacity style={styles.tabItem}>
              <Feather name="play-circle" size={20} color="#666" />
            </TouchableOpacity>
            <TouchableOpacity style={styles.tabItem}>
              <Feather name="user" size={20} color="#666" />
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#090C10',
  },
  wrapper: {
    flex: 1,
  },
  container: {
    padding: 24,
    paddingTop: 40,
    paddingBottom: 120, // space for custom tab bar
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 40,
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
  titleSection: {
    marginBottom: 40,
  },
  mainTitle: {
    color: '#FFFFFF',
    fontSize: 48,
    fontWeight: '900',
    marginBottom: 12,
    letterSpacing: 1,
  },
  subtitle: {
    color: '#8B949E',
    fontSize: 16,
    lineHeight: 24,
  },
  card: {
    borderRadius: 24,
    padding: 32,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 260,
    marginBottom: 24,
    backgroundColor: 'rgba(255, 255, 255, 0.03)', // Subtle transparency
    borderWidth: 1,
    overflow: 'hidden',
  },
  musicCard: {
    borderColor: 'rgba(0, 229, 255, 0.3)',
    shadowColor: '#00E5FF',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.1,
    shadowRadius: 15,
    elevation: 8,
  },
  vaultCard: {
    borderColor: 'rgba(255, 42, 95, 0.3)',
    shadowColor: '#FF2A5F',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.1,
    shadowRadius: 15,
    elevation: 8,
  },
  musicIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 2,
    borderColor: 'rgba(0, 229, 255, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
    backgroundColor: 'rgba(0, 229, 255, 0.1)', // stronger fill
  },
  playIcon: {
    marginLeft: 6,
  },
  vaultIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 2,
    borderColor: 'rgba(255, 42, 95, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
    backgroundColor: 'rgba(255, 42, 95, 0.1)', // stronger fill
  },
  vaultBadge: {
    position: 'absolute',
    top: 24,
    right: 24,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#FF2A5F',
  },
  cardTitle: {
    color: '#FFFFFF',
    fontSize: 26,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  musicSubtitle: {
    color: '#00E5FF',
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 2.5,
    marginBottom: 20,
  },
  vaultSubtitle: {
    color: '#FF2A5F',
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 2.5,
  },
  visualizer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    height: 38,
    gap: 5,
  },
  bar: {
    width: 6,
    backgroundColor: '#00E5FF',
    borderRadius: 3,
  },
  tabBarContainer: {
    position: 'absolute',
    bottom: 30,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: '#11151C',
    borderRadius: 40,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.5,
    shadowRadius: 20,
    elevation: 10,
    gap: 30,
  },
  tabItem: {
    padding: 12,
  },
  tabItemActive: {
    padding: 12,
    backgroundColor: 'rgba(0, 229, 255, 0.2)',
    borderRadius: 24,
  }
});
