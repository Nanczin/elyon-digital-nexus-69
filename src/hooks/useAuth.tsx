import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
// import { useNavigate } from 'react-router-dom'; // REMOVIDO: useNavigate não deve ser usado aqui

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signUp: (email: string, password: string, name: string) => Promise<{ error: any }>;
  signIn: (email: string, password: string) => Promise<{ error: any }>;
  signOut: () => Promise<void>;
  isAdmin: boolean;
  refreshUserSession: () => Promise<void>; // Adicionado
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  // const navigate = useNavigate(); // REMOVIDO: useNavigate não deve ser usado aqui

  useEffect(() => {
    // Set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        
        // Check if user is admin when session changes
        if (session?.user) {
          setTimeout(async () => {
            try {
              const { data } = await supabase.rpc('is_admin');
              setIsAdmin(data || false);
            } catch (error) {
              console.error('Error checking admin status:', error);
              setIsAdmin(false);
            }
          }, 0);
        } else {
          setIsAdmin(false);
        }
        
        setLoading(false);
      }
    );

    // Check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
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
    // navigate('/'); // REMOVIDO: A navegação será feita no componente Layout
  };

  // Nova função para atualizar a sessão do usuário
  const refreshUserSession = async () => {
    const { data, error } = await supabase.auth.refreshSession();
    if (error) {
      console.error('Erro ao atualizar sessão do usuário:', error);
    } else if (data.session) {
      setSession(data.session);
      setUser(data.session.user);
      console.log('Sessão do usuário atualizada com sucesso.');
    }
  };

  const value = {
    user,
    session,
    loading,
    signUp,
    signIn,
    signOut,
    isAdmin,
    refreshUserSession, // Expondo a nova função
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    // Adicionado um console.error mais detalhado para ajudar a depurar
    console.error('useAuth: O hook useAuth deve ser usado dentro de um AuthProvider. Verifique a árvore de componentes.');
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}