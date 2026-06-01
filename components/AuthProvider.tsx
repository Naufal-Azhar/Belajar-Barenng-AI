'use client';

import { createContext, useContext, type ReactNode } from 'react';
import { useAuth } from '@/hooks/useAuth';

type AuthValue = ReturnType<typeof useAuth>;

const AuthContext = createContext<AuthValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const auth = useAuth();
  return <AuthContext.Provider value={auth}>{children}</AuthContext.Provider>;
}

const FALLBACK = {
  profile: null,
  loading: false,
  recent: [],
  isAuthed: false,
  login: async () => { throw new Error('AuthProvider tidak tersedia'); },
  register: async () => { throw new Error('AuthProvider tidak tersedia'); },
  logout: async () => {},
  refresh: async () => {},
} as unknown as AuthValue;

export function useAuthContext(): AuthValue {
  return useContext(AuthContext) ?? FALLBACK;
}
