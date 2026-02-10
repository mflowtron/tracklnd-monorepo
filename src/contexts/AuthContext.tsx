import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { User } from '@supabase/supabase-js';
import { fetchWithRetry } from '@/lib/supabase-fetch';

interface Profile {
  id: string;
  user_id: string;
  display_name: string;
  avatar_url: string | null;
}

interface AuthContextType {
  user: User | null;
  profile: Profile | null;
  loading: boolean;
  isAuthenticated: boolean;
  isAdmin: boolean;
  login: (email: string, password: string) => Promise<{ error: string | null }>;
  signup: (email: string, password: string, displayName: string) => Promise<{ error: string | null }>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  const fetchProfile = async (userId: string) => {
    try {
      const { data } = await fetchWithRetry(
        () => supabase.from('profiles').select('*').eq('user_id', userId).maybeSingle()
      );
      setProfile(data);
    } catch (err) {
      console.error('Auth: failed to fetch profile:', err);
    }
  };

  const fetchRole = async (userId: string) => {
    try {
      const { data } = await fetchWithRetry(
        () => supabase.from('user_roles').select('role').eq('user_id', userId)
      );
      setIsAdmin(data?.some(r => r.role === 'admin') ?? false);
    } catch (err) {
      console.error('Auth: failed to fetch role:', err);
    }
  };

  useEffect(() => {
    console.log('Auth: initializing...');
    const timeout = setTimeout(() => {
      console.log('Auth: safety timeout reached');
      setLoading(false);
    }, 8000);

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      const u = session?.user ?? null;
      setUser(u);
      if (u) {
        await Promise.allSettled([fetchProfile(u.id), fetchRole(u.id)]);
      } else {
        setProfile(null);
        setIsAdmin(false);
      }
      setLoading(false);
    });

    fetchWithRetry(() => supabase.auth.getSession()).then(({ data: { session } }) => {
      console.log('Auth: session resolved', !!session);
      const u = session?.user ?? null;
      setUser(u);
      if (u) {
        Promise.allSettled([fetchProfile(u.id), fetchRole(u.id)]).then(() => setLoading(false));
      } else {
        setLoading(false);
      }
    }).catch((err) => {
      console.error('Auth: getSession failed:', err);
      setLoading(false);
    });

    return () => {
      clearTimeout(timeout);
      subscription.unsubscribe();
    };
  }, []);

  const login = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error: error?.message ?? null };
  };

  const signup = async (email: string, password: string, displayName: string) => {
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { display_name: displayName },
        emailRedirectTo: window.location.origin,
      },
    });
    return { error: error?.message ?? null };
  };

  const logout = async () => {
    await supabase.auth.signOut();
  };

  return (
    <AuthContext.Provider value={{
      user,
      profile,
      loading,
      isAuthenticated: !!user,
      isAdmin,
      login,
      signup,
      logout,
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
