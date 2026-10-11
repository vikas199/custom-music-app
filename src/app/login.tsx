import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, ActivityIndicator, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

import { useJellyfin } from '@/context/JellyfinContext';
import { DEFAULT_SERVER_URL, errorMessage } from '@/lib/jellyfin';
import { APP_TITLE } from '@/constants/app';

export default function LoginScreen() {
  const router = useRouter();
  const { login } = useJellyfin();

  const [serverUrl, setServerUrl] = useState(DEFAULT_SERVER_URL);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleLogin = async () => {
    setIsLoading(true);
    setError(null);
    try {
      await login(serverUrl, username, password);
      router.replace('/music');
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()}>
            <Feather name="arrow-left" size={24} color="#00E5FF" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{APP_TITLE}</Text>
          <View style={{ width: 24 }} />
        </View>

        <Text style={styles.mainTitle}>Connect</Text>
        <Text style={styles.subtitle}>Sign in to your Jellyfin server.</Text>

        <Text style={styles.label}>SERVER</Text>
        <TextInput
          style={styles.input}
          value={serverUrl}
          onChangeText={setServerUrl}
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType="url"
          placeholder="http://server:8096"
          placeholderTextColor="#444"
        />

        <Text style={styles.label}>USERNAME</Text>
        <TextInput
          style={styles.input}
          value={username}
          onChangeText={setUsername}
          autoCapitalize="none"
          autoCorrect={false}
          placeholderTextColor="#444"
        />

        <Text style={styles.label}>PASSWORD</Text>
        <TextInput
          style={styles.input}
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          onSubmitEditing={handleLogin}
          placeholderTextColor="#444"
        />

        {error && <Text style={styles.error}>{error}</Text>}

        <TouchableOpacity
          style={[styles.button, (isLoading || !username) && styles.buttonDisabled]}
          onPress={handleLogin}
          disabled={isLoading || !username}
          activeOpacity={0.8}
        >
          {isLoading
            ? <ActivityIndicator color="#090C10" />
            : <Text style={styles.buttonText}>Connect</Text>}
        </TouchableOpacity>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#090C10',
  },
  container: {
    flex: 1,
    paddingHorizontal: 24,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 20,
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
  mainTitle: {
    color: '#FFFFFF',
    fontSize: 48,
    fontWeight: '900',
    marginBottom: 12,
  },
  subtitle: {
    color: '#8B949E',
    fontSize: 16,
    marginBottom: 32,
  },
  label: {
    color: '#00E5FF',
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 2.5,
    marginBottom: 8,
  },
  input: {
    height: 56,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(0, 229, 255, 0.3)',
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    color: '#FFFFFF',
    fontSize: 18,
    paddingHorizontal: 16,
    marginBottom: 20,
  },
  error: {
    color: '#FF2A5F',
    fontSize: 15,
    marginBottom: 16,
  },
  button: {
    height: 64,
    borderRadius: 32,
    backgroundColor: '#00E5FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 8,
    shadowColor: '#00E5FF',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 20,
    elevation: 10,
  },
  buttonDisabled: {
    opacity: 0.4,
  },
  buttonText: {
    color: '#090C10',
    fontSize: 20,
    fontWeight: '900',
  },
});
