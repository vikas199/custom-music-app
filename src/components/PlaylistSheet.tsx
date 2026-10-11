import React, { useEffect, useRef, useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, Modal, Pressable, TextInput,
  FlatList, ActivityIndicator, KeyboardAvoidingView,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather, Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';

import type { Song } from '@/context/MusicPlayerContext';
import { useLibrary } from '@/context/LibraryContext';
import { Playlist, errorMessage } from '@/lib/jellyfin';
import { formatCount } from '@/lib/format';

// How long the success message stays before the sheet closes itself
const CLOSE_AFTER_SUCCESS_MS = 900;

type Mode = 'menu' | 'pick' | 'create';

interface PlaylistSheetProps {
  visible: boolean;
  // Song to add; when omitted the sheet only creates an empty playlist
  song?: Song | null;
  initialMode?: Mode;
  onClose: () => void;
}

export default function PlaylistSheet({ visible, song, initialMode = 'menu', onClose }: PlaylistSheetProps) {
  const insets = useSafeAreaInsets();
  // Playlists come from the cache, so the picker opens instantly
  const { playlists, createPlaylist, addToPlaylist } = useLibrary();

  const [mode, setMode] = useState<Mode>(initialMode);
  const [isBusy, setIsBusy] = useState(false);
  const [name, setName] = useState('');
  const [success, setSuccess] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Fresh state every time the sheet opens
  useEffect(() => {
    if (!visible) return;
    setMode(initialMode);
    setName('');
    setSuccess(null);
    setError(null);
    return () => {
      if (closeTimer.current) clearTimeout(closeTimer.current);
    };
  }, [visible, initialMode]);

  const finish = (message: string) => {
    setSuccess(message);
    closeTimer.current = setTimeout(onClose, CLOSE_AFTER_SUCCESS_MS);
  };

  const handleAdd = async (playlist: Playlist) => {
    if (!song || isBusy) return;
    setIsBusy(true);
    setError(null);
    try {
      const result = await addToPlaylist(playlist.id, song);
      if (result === 'duplicate') {
        setError(`Already in "${playlist.name}"`);
      } else {
        finish(`Added to "${playlist.name}"`);
      }
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setIsBusy(false);
    }
  };

  const handleCreate = async () => {
    const trimmed = name.trim();
    if (!trimmed || isBusy) return;
    setIsBusy(true);
    setError(null);
    try {
      await createPlaylist(trimmed, song);
      finish(song ? `Created "${trimmed}" with this song` : `Created "${trimmed}"`);
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setIsBusy(false);
    }
  };

  const renderBody = () => {
    if (success) {
      return (
        <View style={styles.successBox}>
          <Feather name="check-circle" size={40} color="#00E5FF" />
          <Text style={styles.successText}>{success}</Text>
        </View>
      );
    }

    if (mode === 'menu') {
      return (
        <>
          <TouchableOpacity style={styles.option} onPress={() => setMode('pick')} disabled={!song}>
            <Feather name="list" size={24} color="#00E5FF" />
            <Text style={styles.optionText}>Add to playlist</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.option} onPress={() => setMode('create')}>
            <Feather name="plus-square" size={24} color="#00E5FF" />
            <Text style={styles.optionText}>Create playlist</Text>
          </TouchableOpacity>
        </>
      );
    }

    if (mode === 'pick') {
      return (
        <>
          <TouchableOpacity style={styles.option} onPress={() => setMode('create')}>
            <Feather name="plus" size={24} color="#00E5FF" />
            <Text style={styles.optionText}>New playlist</Text>
          </TouchableOpacity>
          <FlatList
            data={playlists}
            keyExtractor={(p) => p.id}
            style={styles.pickList}
            ListEmptyComponent={<Text style={styles.emptyText}>No playlists yet. Create one above.</Text>}
            renderItem={({ item }) => (
              <TouchableOpacity style={styles.option} onPress={() => handleAdd(item)} disabled={isBusy}>
                <View style={styles.playlistArt}>
                  {item.coverArt
                    ? <Image source={{ uri: item.coverArt }} style={styles.playlistArtImage} />
                    : <Ionicons name="musical-notes" size={20} color="#00E5FF" />}
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.optionText} numberOfLines={1}>{item.name}</Text>
                  <Text style={styles.optionSubtext}>{formatCount(item.songCount, 'song')}</Text>
                </View>
                {isBusy && <ActivityIndicator color="#00E5FF" />}
              </TouchableOpacity>
            )}
          />
        </>
      );
    }

    return (
      <>
        <TextInput
          style={styles.input}
          value={name}
          onChangeText={setName}
          placeholder="Playlist name"
          placeholderTextColor="#444"
          autoFocus
          returnKeyType="done"
          onSubmitEditing={handleCreate}
        />
        <TouchableOpacity
          style={[styles.primaryButton, (!name.trim() || isBusy) && styles.buttonDisabled]}
          onPress={handleCreate}
          disabled={!name.trim() || isBusy}
        >
          {isBusy
            ? <ActivityIndicator color="#090C10" />
            : <Text style={styles.primaryButtonText}>Create</Text>}
        </TouchableOpacity>
      </>
    );
  };

  const title = success ? 'Done' : mode === 'pick' ? 'Add to playlist' : mode === 'create' ? 'New playlist' : (song?.title ?? 'Playlist');

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose} statusBarTranslucent>
      <KeyboardAvoidingView style={styles.wrapper} behavior="padding">
        <Pressable style={styles.backdrop} onPress={onClose} />
        <View style={[styles.sheet, { paddingBottom: insets.bottom + 24 }]}>
          <View style={styles.handle} />
          <View style={styles.titleRow}>
            {mode !== 'menu' && mode !== initialMode && !success ? (
              <TouchableOpacity onPress={() => setMode('menu')} style={styles.iconButton}>
                <Feather name="arrow-left" size={22} color="#FFFFFF" />
              </TouchableOpacity>
            ) : <View style={styles.iconButton} />}
            <Text style={styles.title} numberOfLines={1}>{title}</Text>
            <TouchableOpacity onPress={onClose} style={styles.iconButton}>
              <Feather name="x" size={22} color="#FFFFFF" />
            </TouchableOpacity>
          </View>

          {error && <Text style={styles.error}>{error}</Text>}
          {renderBody()}
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  backdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
  },
  sheet: {
    backgroundColor: '#11151C',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(0, 229, 255, 0.15)',
    paddingHorizontal: 24,
    paddingTop: 12,
    maxHeight: '80%',
  },
  handle: {
    alignSelf: 'center',
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    marginBottom: 12,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    flex: 1,
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  iconButton: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    minHeight: 64,
    paddingVertical: 8,
  },
  optionText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
  },
  optionSubtext: {
    color: '#8B949E',
    fontSize: 14,
    marginTop: 2,
  },
  pickList: {
    flexGrow: 0,
  },
  playlistArt: {
    width: 48,
    height: 48,
    borderRadius: 8,
    backgroundColor: '#1A222C',
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  playlistArtImage: {
    width: '100%',
    height: '100%',
  },
  emptyText: {
    color: '#8B949E',
    fontSize: 16,
    textAlign: 'center',
    marginVertical: 24,
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
    marginBottom: 16,
  },
  primaryButton: {
    height: 56,
    borderRadius: 28,
    backgroundColor: '#00E5FF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  primaryButtonText: {
    color: '#090C10',
    fontSize: 18,
    fontWeight: '900',
  },
  buttonDisabled: {
    opacity: 0.4,
  },
  successBox: {
    alignItems: 'center',
    gap: 12,
    paddingVertical: 24,
  },
  successText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'center',
  },
  error: {
    color: '#FF2A5F',
    fontSize: 15,
    marginBottom: 12,
  },
});
