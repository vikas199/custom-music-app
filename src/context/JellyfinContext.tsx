import React, { createContext, useState, useContext, ReactNode, useEffect } from 'react';

import * as Jellyfin from '@/lib/jellyfin';

interface JellyfinContextType {
  session: Jellyfin.JellyfinSession | null;
  isRestoring: boolean;
  login: (serverUrl: string, username: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

const JellyfinContext = createContext<JellyfinContextType | undefined>(undefined);

export function JellyfinProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Jellyfin.JellyfinSession | null>(null);
  const [isRestoring, setIsRestoring] = useState(true);

  // Restore the saved login so the user only signs in once
  useEffect(() => {
    Jellyfin.loadSession()
      .then(setSession)
      .finally(() => setIsRestoring(false));
  }, []);

  const login = async (serverUrl: string, username: string, password: string) => {
    setSession(await Jellyfin.login(serverUrl, username, password));
  };

  const logout = async () => {
    await Jellyfin.clearSession();
    setSession(null);
  };

  return (
    <JellyfinContext.Provider value={{ session, isRestoring, login, logout }}>
      {children}
    </JellyfinContext.Provider>
  );
}

export function useJellyfin() {
  const context = useContext(JellyfinContext);
  if (context === undefined) {
    throw new Error('useJellyfin must be used within a JellyfinProvider');
  }
  return context;
}
