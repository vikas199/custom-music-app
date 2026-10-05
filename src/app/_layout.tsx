import { DarkTheme, DefaultTheme, ThemeProvider, Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useColorScheme } from 'react-native';
import { useState, createContext, useEffect } from 'react';

import { JellyfinProvider } from '@/context/JellyfinContext';
import { MusicPlayerProvider } from '@/context/MusicPlayerContext';
import GlobalPlayer from '@/components/GlobalPlayer';

SplashScreen.preventAutoHideAsync();

// Export a context so we can add a toggle switch later in the settings tab
export const ThemeToggleContext = createContext({
  isDark: true,
  toggleTheme: () => {},
});

export default function TabLayout() {
  const systemColorScheme = useColorScheme();
  const [isDark, setIsDark] = useState(systemColorScheme === 'dark');

  useEffect(() => {
    // Hide the splash screen once the layout mounts, otherwise it stays blank!
    SplashScreen.hideAsync();
  }, []);

  const toggleTheme = () => setIsDark(!isDark);

  return (
    <ThemeToggleContext.Provider value={{ isDark, toggleTheme }}>
      <ThemeProvider value={isDark ? DarkTheme : DefaultTheme}>
        <JellyfinProvider>
          <MusicPlayerProvider>
            <Stack screenOptions={{ headerShown: false }} />
            <GlobalPlayer />
          </MusicPlayerProvider>
        </JellyfinProvider>
      </ThemeProvider>
    </ThemeToggleContext.Provider>
  );
}
