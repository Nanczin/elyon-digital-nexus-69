import React, { useContext, useEffect, useState } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { AuthContext, AuthContextType } from '@/contexts/AuthContext';

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    console.log('AUTH_DEBUG: AuthProvider useEffect started.');

    const checkAdminStatus = async (userId: string) => {
      try {
        const { data, error } = await supabase.rpc('is_admin', { user_id: userId });
        if (error) {
          console.error('AUTH_DEBUG: Error checking admin status via RPC:', error);
          setIsAdmin(false);
        } else {
          setIsAdmin(data || false);
          console.log('AUTH_DEBUG: isAdmin status from RPC for user', userId, ':', data);
        }
      } catch (error) {
        console.error('AUTH_DEBUG: Exception checking admin status:', error);
        setIsAdmin(false);
      }
    };

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('AUTH_DEBUG: onAuthStateChange event:', event);
        setSession(session);
        setUser(session?.user ?? null);
        
        if (event === 'SIGNED_OUT') {
          console.log('AUTH_DEBUG: SIGNED_OUT event detected. Resetting states.');
          setUser(null);
          setSession(null);
          setIsAdmin(false);
        } else if (session?.user) {
          console.log('AUTH_DEBUG: User session changed:', event, 'User ID:', session.user.id);
          await checkAdminStatus(session.user.id);
        } else {
          setIsAdmin(false);
          console.log('AUTH_DEBUG: No user session, isAdmin set to false.');
        }
        
        setLoading(false);
        console.log('AUTH_DEBUG: Auth loading set to false from onAuthStateChange. Current user:', session?.user?.email, 'Final isAdmin:', isAdmin);
      }
    );

    // Initial session check
    supabase.auth.getSession()
      .then(async ({ data: { session } }) => {
        console.log('AUTH_DEBUG: Initial getSession resolved.');
        setSession(session);
        setUser(session?.user ?? null);
        
        if (session?.user) {
          console.log('AUTH_DEBUG: Initial session found for user:', session.user.id);
          await checkAdminStatus(session.user.id);
        } else {
          setIsAdmin(false);
          console.log('AUTH_DEBUG: No initial session, isAdmin set to false.');
        }
        setLoading(false);
        console.log('AUTH_DEBUG: Initial auth loading set to false from getSession. Current user:', session?.user?.email, 'Final isAdmin:', isAdmin);
      })
      .catch((error) => {
        console.error('AUTH_DEBUG: Error during initial getSession:', error);
        setLoading(false); // Ensure loading is false even on error
        setIsAdmin(false); // Ensure isAdmin is false on error
      });

    // Fallback timeout to ensure loading state resolves (for diagnostic purposes)
    const fallbackTimeout = setTimeout(() => {
      if (loading) { // Only set to false if still true
        console.warn('AUTH_DEBUG: Fallback timeout triggered. Setting loading to false.');
        setLoading(false);
      }
    }, 10000); // 10 seconds timeout

    return () => {
      subscription.unsubscribe();
      clearTimeout(fallbackTimeout); // Clear fallback on unmount
    };
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
    console.log('AUTH_DEBUG: Attempting to sign out...');
    await supabase.auth.signOut();
    localStorage.removeItem('supabase.auth.token'); // Limpar explicitamente a chave padrão do Supabase
    
    // Limpeza explícita do estado do React
    setUser(null);
    setSession(null);
    setIsAdmin(false);

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
    isAdmin,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  // Não é mais necessário verificar 'undefined' aqui, pois o createContext agora tem um valor padrão.
  // Se o contexto for acessado fora do provedor, ele terá o valor padrão.
  return context;
}