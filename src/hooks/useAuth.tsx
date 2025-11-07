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

    const checkAdminStatusAndSetLoading = async (userId: string | null) => {
      if (userId) {
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
      } else {
        setIsAdmin(false);
        console.log('AUTH_DEBUG: No user ID, isAdmin set to false.');
      }
      setLoading(false); // Set loading to false AFTER admin status is determined
      console.log('AUTH_DEBUG: Auth loading set to false. Final isAdmin state updated.');
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
          setLoading(false); // Also set loading to false on sign out
        } else if (session?.user) {
          console.log('AUTH_DEBUG: User session changed:', event, 'User ID:', session.user.id);
          await checkAdminStatusAndSetLoading(session.user.id); // Aguardar aqui
        } else {
          await checkAdminStatusAndSetLoading(null); // Sem usuário, definir isAdmin como false e loading como false
        }
      }
    );

    // Verificação de sessão inicial
    supabase.auth.getSession()
      .then(async ({ data: { session } }) => {
        console.log('AUTH_DEBUG: Initial getSession resolved.');
        setSession(session);
        setUser(session?.user ?? null);
        await checkAdminStatusAndSetLoading(session?.user?.id || null); // Aguardar aqui
      })
      .catch((error) => {
        console.error('AUTH_DEBUG: Error during initial getSession:', error);
        setLoading(false); // Garantir que loading seja false mesmo em erro
        setIsAdmin(false); // Garantir que isAdmin seja false em erro
      });

    // Timeout de fallback para garantir que o estado de carregamento seja resolvido
    const fallbackTimeout = setTimeout(() => {
      if (loading) { // Apenas definir como false se ainda for true
        console.warn('AUTH_DEBUG: Fallback timeout triggered. Setting loading to false.');
        setLoading(false);
      }
    }, 10000); // 10 segundos de timeout

    return () => {
      subscription.unsubscribe();
      clearTimeout(fallbackTimeout); // Limpar fallback ao desmontar
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
    localStorage.removeItem('sb-admin-session');
    
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