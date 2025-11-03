import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast'; // Importando o hook useToast
import { withTimeout } from '@/utils/supabaseUtils';

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

export function AuthProvider({ children }: { React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(() => {
    console.log('AUTH_DEBUG: Initializing AuthProvider, loading starts as true.');
    return true;
  });

  // Chamar o hook useToast aqui para obter a instância correta
  const { toast, dismiss } = useToast();

  useEffect(() => {
    const handleAuthStateChange = async (event: string, currentSession: Session | null) => {
      console.log('AUTH_DEBUG: handleAuthStateChange event:', event);
      setSession(currentSession);
      setUser(currentSession?.user ?? null);

      if (currentSession?.user) {
        console.log('AUTH_DEBUG: User is present, checking admin status with is_current_user_admin()...');
        let adminCheckSucceeded = false;
        let attempts = 0;
        const maxAttempts = 3;
        const initialDelayMs = 500;
        const retryDelayMs = 2000;
        const rpcTimeoutMs = 10000;

        // Usar o dismiss da instância do hook
        dismiss('admin-status-check-error');

        while (attempts < maxAttempts && !adminCheckSucceeded) {
          attempts++;
          if (attempts === 1 && event === 'SIGNED_IN') {
            console.log(`AUTH_DEBUG: Attempt ${attempts}: Initial delay of ${initialDelayMs}ms for SIGNED_IN event.`);
            await new Promise(resolve => setTimeout(resolve, initialDelayMs));
          } else if (attempts > 1) {
            console.log(`AUTH_DEBUG: Attempt ${attempts}: Retrying in ${retryDelayMs}ms...`);
            await new Promise(resolve => setTimeout(resolve, retryDelayMs));
          }

          try {
            const { data, error } = await withTimeout(
              supabase.rpc('is_current_user_admin'),
              rpcTimeoutMs,
              'Admin status check timed out'
            );

            if (error) {
              console.error(`AUTH_DEBUG: Attempt ${attempts}: Error checking admin status:`, error);
              if (attempts === maxAttempts) {
                setIsAdmin(false);
                toast({ // Usar o toast da instância do hook
                  id: 'admin-status-check-error',
                  title: "Erro de autenticação",
                  description: `Não foi possível verificar o status de administrador após ${maxAttempts} tentativas: ${error.message}.`,
                  variant: "destructive",
                });
              }
            } else {
              if (typeof data === 'boolean') {
                setIsAdmin(data);
                console.log(`AUTH_DEBUG: Attempt ${attempts}: is_current_user_admin RPC returned boolean:`, data);
                adminCheckSucceeded = true;
              } else if (Array.isArray(data) && data.length > 0 && typeof data[0] === 'object' && 'is_current_user_admin' in data[0]) {
                setIsAdmin(data[0].is_current_user_admin);
                console.log(`AUTH_DEBUG: Attempt ${attempts}: is_current_user_admin RPC returned array object:`, data[0].is_current_user_admin);
                adminCheckSucceeded = true;
              } else {
                console.warn(`AUTH_DEBUG: Attempt ${attempts}: is_current_user_admin RPC returned unexpected data format:`, data);
                setIsAdmin(false);
                adminCheckSucceeded = true;
              }
            }
          } catch (error: any) {
            console.error(`AUTH_DEBUG: Attempt ${attempts}: Error in is_current_user_admin RPC call (catch block):`, error.message);
            if (attempts === maxAttempts) {
              setIsAdmin(false);
              toast({ // Usar o toast da instância do hook
                id: 'admin-status-check-error',
                title: "Erro de autenticação",
                description: `Não foi possível verificar o status de administrador após ${maxAttempts} tentativas: ${error.message}.`,
                variant: "destructive",
              });
            }
          }
        }
      } else {
        console.log('AUTH_DEBUG: No user present, setting isAdmin to false.');
        setIsAdmin(false);
      }
      console.log('AUTH_DEBUG: Setting loading to false.');
      setLoading(false);
    };

    const { data: { subscription } } = supabase.auth.onAuthStateChange(handleAuthStateChange);

    supabase.auth.getSession().then(async ({ data: { session: initialSession } }) => {
      console.log('AUTH_DEBUG: getSession resolved, calling handleAuthStateChange for INITIAL_SESSION.');
      await handleAuthStateChange('INITIAL_SESSION', initialSession);
    }).catch(error => {
      console.error('AUTH_DEBUG: Error in getSession:', error);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, [dismiss, toast]); // Adicionar dismiss e toast como dependências do useEffect

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
      toast({ // Usar o toast da instância do hook
        title: "Erro no cadastro",
        description: error.message,
        variant: "destructive",
      });
    } else {
      toast({ // Usar o toast da instância do hook
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
      toast({ // Usar o toast da instância do hook
        title: "Erro no login",
        description: error.message,
        variant: "destructive",
      });
    } else {
        toast({ // Usar o toast da instância do hook
            title: "Login realizado!",
            description: "Redirecionando para o dashboard...",
        });
    }

    return { error };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setIsAdmin(false);
    toast({ // Usar o toast da instância do hook
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