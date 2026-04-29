'use client';

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { authApi } from './api';

interface User {
  id: string;
  email: string;
  role: 'admin' | 'client';
  client_id?: string;
  business_name?: string;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  isAdmin: boolean;
  isClient: boolean;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    // Rehydrate from localStorage
    const storedToken = localStorage.getItem('voiceai_token');
    const storedUser = localStorage.getItem('voiceai_user');
    if (storedToken && storedUser) {
      setToken(storedToken);
      setUser(JSON.parse(storedUser));
    }
    setLoading(false);
  }, []);

  const login = async (email: string, password: string) => {
    const res = await authApi.login(email, password);
    const { token: t, user: u } = res.data;
    localStorage.setItem('voiceai_token', t);
    localStorage.setItem('voiceai_user', JSON.stringify(u));
    setToken(t);
    setUser(u);

    if (u.role === 'admin') router.push('/admin');
    else router.push('/dashboard');
  };

  const logout = async () => {
    try { await authApi.logout(); } catch {}
    localStorage.removeItem('voiceai_token');
    localStorage.removeItem('voiceai_user');
    setToken(null);
    setUser(null);
    router.push('/login');
  };

  return (
    <AuthContext.Provider value={{
      user, token, loading,
      login, logout,
      isAdmin: user?.role === 'admin',
      isClient: user?.role === 'client',
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
