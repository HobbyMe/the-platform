import React, { createContext, useContext, useEffect, useState } from 'react';
import { Session, Provider } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';

interface AuthContextType {
  session: Session | null;
  signUp: (email: string, password: string) => Promise<any>;
  signIn: (email: string, password: string) => Promise<any>;
  signInWithProvider: (provider: Provider) => Promise<any>;
  signOut: () => Promise<void>;
  sendOtp: (email: string) => Promise<any>;
  verifyOtp: (email: string, otp: string) => Promise<any>;
  sendPasswordReset: (email: string) => Promise<any>;
  resetPassword: (accessToken: string, newPassword: string) => Promise<any>;
}

const AuthContext = createContext<AuthContextType>({} as AuthContextType);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  const value = {
    session,
    signUp: (email: string, password: string) =>
      supabase.auth.signUp({ email, password }),
    signIn: (email: string, password: string) =>
      supabase.auth.signInWithPassword({ email, password }),
    signInWithProvider: (provider: Provider) =>
      supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo: `${window.location.origin}/hobby-selection`,
          skipBrowserRedirect: false,
          scopes: provider === 'google' 
            ? 'profile email' 
            : provider === 'facebook'
            ? 'email,public_profile'
            : undefined,
        },
      }),
    signOut: async () => {
      await supabase.auth.signOut();
      window.location.href = '/login';
    },
    sendOtp: (email: string) =>
      supabase.auth.signIn({ email }),
    verifyOtp: (email: string, otp: string) =>
      supabase.auth.verifyOtp({ email, token: otp, type: 'email' }),
    sendPasswordReset: (email: string) =>
      supabase.auth.resetPasswordForEmail(email),
    resetPassword: (accessToken: string, newPassword: string) =>
      supabase.auth.updateUser({
        access_token: accessToken,
        password: newPassword,
      }),
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};