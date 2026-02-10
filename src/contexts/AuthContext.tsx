import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { User } from '@supabase/supabase-js';

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
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();
    if (error) {
      console.error('Auth: profile fetch error:', error.message);
      return;
    }
    setProfile(data);
  };

  const fetchRole = async (userId: string) => {
    const { data, error } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', userId);
    if (error) {
      console.error('Auth: role fetch error:', error.message);
      return;
    }
    setIsAdmin(data?.some(r => r.role === 'admin') ?? false);
  };

  useEffect(() => {
    let mounted = true;

    const initAuth = async () => {
      try {
        // Read session from localStorage — may have an expired access token.
        const { data: { session } } = await supabase.auth.getSession();

        if (!session) {
          // No stored session — user is not logged in.
          if (mounted) setLoading(false);
          return;
        }

        // Check whether the access token is expired (with 60 s buffer).
        const now = Math.floor(Date.now() / 1000);
        const needsRefresh = session.expires_at != null && now >= session.expires_at - 60;

        let activeSession = session;

        if (needsRefresh) {
          // Token is stale — force a refresh so downstream queries never
          // send an expired JWT (which causes PostgREST 401 on ALL tables).
          const { data, error } = await supabase.auth.refreshSession();
          if (error || !data.session) {
            console.error('Auth: token refresh failed, signing out');
            await supabase.auth.signOut();
            if (mounted) {
              setUser(null);
              setProfile(null);
              setIsAdmin(false);
              setLoading(false);
            }
            return;
          }
          activeSession = data.session;
        }

        // We now have a valid session — set user and fetch profile/role.
        if (mounted) {
          setUser(activeSession.user);
          await Promise.allSettled([
            fetchProfile(activeSession.user.id),
            fetchRole(activeSession.user.id),
          ]);
          setLoading(false);
        }
      } catch (err) {
        console.error('Auth: initialization error:', err);
        if (mounted) setLoading(false);
      }
    };

    initAuth();

    // Listen for ongoing auth changes (login, logout, token refresh).
    // We skip INITIAL_SESSION because initAuth already handles it above.
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (!mounted) return;
        if (event === 'INITIAL_SESSION') return;

        const u = session?.user ?? null;
        setUser(u);

        if (u) {
          await Promise.allSettled([fetchProfile(u.id), fetchRole(u.id)]);
        } else {
          setProfile(null);
          setIsAdmin(false);
        }
      }
    );

    return () => {
      mounted = false;
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
