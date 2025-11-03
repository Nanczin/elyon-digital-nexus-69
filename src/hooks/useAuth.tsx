import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signUp: (email: string, password: string, name: string) => Promise<{ error: any }>;
  signIn: (email: string, password: string) => Promise<{ error: any }>;
  signOut: () => Promise<void>;
  isAdmin: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(() => {
    console.log('AUTH_DEBUG: Initializing AuthProvider, loading starts as true.');
    return true;
  });

  useEffect(() => {
    const handleAuthStateChange = async (event: string, currentSession: Session | null) => {
      console.log('AUTH_DEBUG: handleAuthStateChange event:', event);
      setSession(currentSession);
      setUser(currentSession?.user ?? null);

      if (currentSession?.user) {
        console.log('AUTH_DEBUG: User is present, checking admin status...');
        try {
          const { data, error } = await supabase.rpc('is_admin');
          if (error) {
            console.error('AUTH_DEBUG: Error checking admin status:', error);
            setIsAdmin(false);
          } else {
            if (typeof data === 'boolean') {
              setIsAdmin(data);
              console.log('AUTH_DEBUG: is_admin RPC returned boolean:', data);
            } else if (Array.isArray(data) && data.length > 0 && typeof data[0] === 'object' && 'is_admin' in data[0]) {
              setIsAdmin(data[0].is_admin);
              console.log('AUTH_DEBUG: is_admin RPC returned array object:', data[0].is_admin);
            } else {
              console.warn('AUTH_DEBUG: is_admin RPC returned unexpected data format:', data);
              setIsAdmin(false);
            }
          }
        } catch (error) {
          console.error('AUTH_DEBUG: Error in is_admin RPC call (catch block):', error);
          setIsAdmin(false);
        }
      } else {
        console.log('AUTH_DEBUG: No user present, setting isAdmin to false.');
        setIsAdmin(false);
      }
      console.log('AUTH_DEBUG: Setting loading to false.');
      setLoading(false); // This should always be reached
    };

    // Set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(handleAuthStateChange);

    // Also check for existing session on mount
    supabase.auth.getSession().then(async ({ data: { session: initialSession } }) => {
      console.log('AUTH_DEBUG: getSession resolved, calling handleAuthStateChange for INITIAL_SESSION.');
      await handleAuthStateChange('INITIAL_SESSION', initialSession);
    }).catch(error => {
      console.error('AUTH_DEBUG: Error in getSession:', error);
      setLoading(false); // Ensure loading is false even if getSession fails
    });

    return () => subscription.unsubscribe();
  }, []);

  const signUp = async (email: string, password: string, name: string) => {
    const redirectUrl = `${window.location.origin}/`;
    
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: redirectUrl,
        data: {
          name: name
        }
      }
    });

    if (error) {
      toast({
        title: "Erro no cadastro",
        description: error.message,
        variant: "destructive",
      });
    } else {
      toast({
        title: "Cadastro realizado!",
        description: "Verifique seu email para confirmar a conta.",
      });
    }

    return { error };
  };

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      toast({
        title: "Erro no login",
        description: error.message,
        variant: "destructive",
      });
    } else {
      toast({
        title: "Login realizado!",
        description: "Redirecionando para o dashboard...",
      });
    }

    return { error };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setIsAdmin(false);
    toast({
      title: "Logout realizado",
      description: "Você foi desconectado com sucesso.",
    });
  };

  const value = {
    user,
    session,
    loading,
    signUp,
    signIn,
    signOut,
    isAdmin,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}