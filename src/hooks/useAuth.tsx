import React, { useContext, useEffect, useState } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { AuthContext, AuthContextType } from '@/contexts/AuthContext'; // Importar AuthContext e AuthContextType

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
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
        setSession(session);
        setUser(session?.user ?? null);
        
        if (session?.user) {
          console.log('AUTH_DEBUG: User session changed:', event, 'User ID:', session.user.id);
          await checkAdminStatus(session.user.id); // Check admin status immediately
        } else {
          setIsAdmin(false);
          console.log('AUTH_DEBUG: User signed out or no session, isAdmin set to false.');
        }
        
        setLoading(false);
        console.log('AUTH_DEBUG: Auth loading set to false. Current user:', session?.user?.email, 'Final isAdmin:', isAdmin);
      }
    );

    // Initial session check
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      
      if (session?.user) {
        console.log('AUTH_DEBUG: Initial session found for user:', session.user.id);
        await checkAdminStatus(session.user.id); // Check admin status immediately
      } else {
        setIsAdmin(false);
        console.log('AUTH_DEBUG: No initial session, isAdmin set to false.');
      }
      setLoading(false);
      console.log('AUTH_DEBUG: Initial auth loading set to false. Current user:', session?.user?.email, 'Final isAdmin:', isAdmin);
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
  // Não é mais necessário verificar 'undefined' aqui, pois o createContext agora tem um valor padrão.
  // Se o contexto for acessado fora do provedor, ele terá o valor padrão.
  return context;
}