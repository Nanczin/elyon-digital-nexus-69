import React, { createContext, useContext, useEffect, useState, useRef } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { withTimeout } from '@/utils/supabaseUtils';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean; // Indica se a sessão inicial foi carregada
  isAdminLoading: boolean; // Mantido para compatibilidade, mas será sempre false
  signUp: (email: string, password: string, name: string) => Promise<{ error: any }>;
  signIn: (email: string, password: string) => Promise<{ error: any }>;
  signOut: () => Promise<void>;
  isAdmin: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true); // Começa como true, definido como false após a sessão ser conhecida
  const [isAdmin, setIsAdmin] = useState(false);
  // isAdminLoading não é mais necessário, mas mantido como false para compatibilidade
  const isAdminLoading = false; 

  const { toast } = useToast();

  // Efeito para carregar a sessão inicial e lidar com mudanças de estado de autenticação
  useEffect(() => {
    const handleAuthStateChange = async (event: string, currentSession: Session | null) => {
      console.log('AUTH_DEBUG: handleAuthStateChange event:', event);
      setSession(currentSession);
      setUser(currentSession?.user ?? null);
      setLoading(false); // Define o carregamento global como false assim que a sessão é conhecida
      console.log('AUTH_DEBUG: Global loading set to false after session update.');
      
      // Verifica o status de administrador diretamente do user_metadata
      const userRole = currentSession?.user?.user_metadata?.role;
      setIsAdmin(userRole === 'admin');
      console.log('AUTH_DEBUG: Admin status set from user_metadata:', userRole === 'admin');
    };

    const { data: { subscription } } = supabase.auth.onAuthStateChange(handleAuthStateChange);

    // Adicionando um tempo limite para a recuperação da sessão inicial
    withTimeout(supabase.auth.getSession(), 15000, 'Initial session retrieval timed out').then(async ({ data: { session: initialSession } }) => {
      console.log('AUTH_DEBUG: getSession resolved, calling handleAuthStateChange for INITIAL_SESSION.');
      await handleAuthStateChange('INITIAL_SESSION', initialSession);
    }).catch(error => {
      console.error('AUTH_DEBUG: Error in getSession:', error);
      setLoading(false); // Garante que o loading seja false mesmo se getSession falhar
      toast({
        title: "Erro de carregamento",
        description: `Não foi possível carregar a sessão inicial: ${error.message}. Por favor, tente recarregar a página.`,
        variant: "destructive",
      });
    });

    return () => subscription.unsubscribe();
  }, []); // Dependências vazias para rodar apenas uma vez na montagem

  const signUp = async (email: string, password: string, name: string) => {
    const redirectUrl = `${window.location.origin}/`;
    
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: redirectUrl,
        data: {
          name: name,
          role: 'user' // Define o papel padrão para novos usuários
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
    isAdminLoading, // Sempre false
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