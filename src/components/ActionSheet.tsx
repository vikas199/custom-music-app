import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal, Pressable } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';

export interface Action {
  label: string;
  icon: React.ComponentProps<typeof Feather>['name'];
  destructive?: boolean;
  onPress: () => void;
}

interface ActionSheetProps {
  visible: boolean;
  title?: string;
  actions: Action[];
  onClose: () => void;
}

// Bottom sheet with a list of big, tappable actions
export default function ActionSheet({ visible, title, actions, onClose }: ActionSheetProps) {
  const insets = useSafeAreaInsets();

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose} statusBarTranslucent>
      <View style={styles.wrapper}>
        <Pressable style={styles.backdrop} onPress={onClose} />
        <View style={[styles.sheet, { paddingBottom: insets.bottom + 16 }]}>
          <View style={styles.handle} />
          {title && <Text style={styles.title} numberOfLines={1}>{title}</Text>}
          {actions.map((action) => {
            const color = action.destructive ? '#FF2A5F' : '#FFFFFF';
            return (
              <TouchableOpacity
                key={action.label}
                style={styles.action}
                onPress={() => {
                  onClose();
                  action.onPress();
                }}
              >
                <Feather name={action.icon} size={24} color={color} />
                <Text style={[styles.actionText, { color }]}>{action.label}</Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>
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
  },
  handle: {
    alignSelf: 'center',
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    marginBottom: 12,
  },
  title: {
    color: '#8B949E',
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 8,
  },
  action: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    minHeight: 64,
  },
  actionText: {
    fontSize: 18,
    fontWeight: '600',
  },
});
