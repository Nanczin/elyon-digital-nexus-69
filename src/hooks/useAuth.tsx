import React, { useContext, useEffect, useState } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { AuthContext, AuthContextType } from '@/contexts/AuthContext';

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true); // Initial state is true
  const [userRole, setUserRole] = useState<string | null>(null); // State for userRole

  useEffect(() => {
    console.log('AUTH_DEBUG: AuthProvider useEffect started. Initial loading state:', loading);

    const initializeAuth = async () => {
      console.log('AUTH_DEBUG: initializeAuth started. Current loading state:', loading);
      try {
        const { data: { session: initialSession }, error: sessionError } = await supabase.auth.getSession();
        
        if (sessionError) {
          console.error('AUTH_DEBUG: Error during initial getSession:', sessionError);
          setUser(null);
          setSession(null);
          setUserRole(null);
        } else {
          setSession(initialSession);
          setUser(initialSession?.user ?? null);

          const role = (initialSession?.user?.user_metadata?.role as string) || null;
          setUserRole(role);
          console.log('AUTH_DEBUG: Initial auth state set. User:', initialSession?.user?.email, 'Role:', role);
        }
      } catch (error) {
        console.error('AUTH_DEBUG: Exception during initializeAuth:', error);
        setUser(null);
        setSession(null);
        setUserRole(null);
      } finally {
        console.log('AUTH_DEBUG: Setting loading to false in finally block of initializeAuth.');
        setLoading(false);
        console.log('AUTH_DEBUG: initializeAuth finished. Final loading state: false');
      }
    };

    initializeAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, currentSession) => {
      console.log('AUTH_DEBUG: onAuthStateChange event:', event);
      setSession(currentSession);
      setUser(currentSession?.user ?? null);

      const role = (currentSession?.user?.user_metadata?.role as string) || null;
      setUserRole(role);

      if (event === 'SIGNED_OUT') {
        console.log('AUTH_DEBUG: SIGNED_OUT event detected. Resetting states.');
        setUserRole(null);
      }
      console.log('AUTH_DEBUG: onAuthStateChange handler finished. Current user:', currentSession?.user?.email, 'Current Role:', role);
    });

    return () => {
      console.log('AUTH_DEBUG: AuthProvider useEffect cleanup. Unsubscribing from auth state changes.');
      subscription.unsubscribe();
    };
  }, []); // Empty dependency array to run only once on mount

  const signUp = async (email: string, password: string, name: string) => {
    const redirectUrl = `${window.location.origin}/`;
    
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: redirectUrl,
        data: {
          name: name,
          role: 'seller' // Default role for new sign-ups
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
    const { data, error } = await supabase.auth.signInWithPassword({
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
      // Forçar a atualização da sessão para garantir que o user_metadata.role seja carregado
      await supabase.auth.refreshSession(); 
      toast({
        title: "Login realizado!",
        description: "Redirecionando para o dashboard...",
      });
    }

    return { error };
  };

  const signOut = async () => {
    console.log('AUTH_DEBUG: Attempting to sign out...');
    await supabase.auth.signOut();
    localStorage.removeItem('sb-admin-session');
    
    // Limpeza explícita do estado do React
    setUser(null);
    setSession(null);
    setUserRole(null);

    toast({
      title: "Logout realizado",
      description: "Você foi desconectado com sucesso.",
    });
    console.log('AUTH_DEBUG: Sign out completed. Local storage cleared and React states reset.');
  };

  const value = {
    user,
    session,
    loading,
    signUp,
    signIn,
    signOut,
    userRole, // Add userRole to context value
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  return context;
}