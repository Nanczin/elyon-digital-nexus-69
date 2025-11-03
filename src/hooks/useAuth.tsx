import React, { createContext, useContext, useEffect, useState, useRef } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { withTimeout } from '@/utils/supabaseUtils';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean; // Indica se a sessão inicial foi carregada
  isAdminLoading: boolean; // Indica se o status de admin está sendo verificado
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
  const [loading, setLoading] = useState(true); // Começa como true, definido como false após a sessão ser conhecida
  const [isAdminLoading, setIsAdminLoading] = useState(false); // Novo estado para o carregamento da verificação de admin
  const [retryCount, setRetryCount] = useState(0); // Novo estado para controlar as retentativas

  const { toast, dismiss } = useToast();
  const timeoutRef = useRef<NodeJS.Timeout | null>(null); // Ref para o timeout de retentativa

  // Efeito para carregar a sessão inicial e lidar com mudanças de estado de autenticação
  useEffect(() => {
    const handleAuthStateChange = async (event: string, currentSession: Session | null) => {
      console.log('AUTH_DEBUG: handleAuthStateChange event:', event);
      setSession(currentSession);
      setUser(currentSession?.user ?? null);
      setLoading(false); // Define o carregamento global como false assim que a sessão é conhecida
      console.log('AUTH_DEBUG: Global loading set to false after session update.');
    };

    const { data: { subscription } } = supabase.auth.onAuthStateChange(handleAuthStateChange);

    supabase.auth.getSession().then(async ({ data: { session: initialSession } }) => {
      console.log('AUTH_DEBUG: getSession resolved, calling handleAuthStateChange for INITIAL_SESSION.');
      await handleAuthStateChange('INITIAL_SESSION', initialSession);
    }).catch(error => {
      console.error('AUTH_DEBUG: Error in getSession:', error);
      setLoading(false); // Garante que o loading seja false mesmo se getSession falhar
    });

    return () => subscription.unsubscribe();
  }, []); // Dependências vazias para rodar apenas uma vez na montagem

  // Novo efeito para verificar o status de administrador, dependente do 'user' e 'retryCount'
  useEffect(() => {
    console.log('AUTH_DEBUG: useEffect for admin status check triggered. User:', user?.id, 'Retry Count:', retryCount);
    
    // Limpa qualquer timeout de retentativa anterior
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
      console.log('AUTH_DEBUG: Cleared previous retry timeout.');
    }

    // Se não há usuário, reseta o estado de admin e o contador de retentativas, e para a execução.
    if (!user) {
      console.log('AUTH_DEBUG: No user present, resetting admin state and retryCount to 0.');
      setIsAdmin(false);
      setIsAdminLoading(false);
      setRetryCount(0); // Garante que retryCount seja 0 quando não há usuário
      return; // Importante: para a execução do useEffect para este ciclo
    }

    // Se o usuário existe, procede com a verificação de status de administrador
    const checkAdminStatus = async () => {
      console.log('AUTH_DEBUG: User detected, starting admin status check...');
      setIsAdminLoading(true); // Inicia o carregamento específico de admin
      dismiss('admin-status-check-error');

      const rpcTimeoutMs = 30000; // 30 segundos
      const maxAttempts = 3;
      const retryDelayMs = 2000; // 2 segundos

      try {
        console.log(`AUTH_DEBUG: Attempt ${retryCount + 1}: Invoking 'is_current_user_admin' RPC...`);
        const { data, error } = await withTimeout(
          supabase.rpc('is_current_user_admin'),
          rpcTimeoutMs,
          `Admin status check timed out after ${rpcTimeoutMs}ms`
        );

        if (error) {
          console.error(`AUTH_DEBUG: Attempt ${retryCount + 1}: Error checking admin status:`, error);
          if (retryCount < maxAttempts - 1) {
            console.log(`AUTH_DEBUG: Attempt ${retryCount + 1}: Scheduling retry in ${retryDelayMs}ms...`);
            timeoutRef.current = setTimeout(() => setRetryCount(prev => prev + 1), retryDelayMs);
          } else {
            setIsAdmin(false);
            setIsAdminLoading(false);
            setRetryCount(0); // Reset retry count after max attempts
            toast({
              id: 'admin-status-check-error',
              title: "Erro de autenticação",
              description: `Não foi possível verificar o status de administrador após ${maxAttempts} tentativas: ${error.message}.`,
              variant: "destructive",
            });
          }
        } else {
          if (typeof data === 'boolean') {
            setIsAdmin(data);
            console.log(`AUTH_DEBUG: Attempt ${retryCount + 1}: is_current_user_admin RPC returned boolean:`, data);
          } else if (Array.isArray(data) && data.length > 0 && typeof data[0] === 'object' && 'is_current_user_admin' in data[0]) {
            setIsAdmin(data[0].is_current_user_admin);
            console.log(`AUTH_DEBUG: Attempt ${retryCount + 1}: is_current_user_admin RPC returned array object:`, data[0].is_current_user_admin);
          } else {
            console.warn(`AUTH_DEBUG: Attempt ${retryCount + 1}: is_current_user_admin RPC returned unexpected data format:`, data);
            setIsAdmin(false);
          }
          setIsAdminLoading(false);
          setRetryCount(0); // Reset retry count on success
          console.log('AUTH_DEBUG: Admin status check completed successfully, isAdminLoading set to false.');
        }
      } catch (error: any) {
        console.error(`AUTH_DEBUG: Attempt ${retryCount + 1}: Error in is_current_user_admin RPC call (catch block):`, error.message);
        if (retryCount < maxAttempts - 1) {
          console.log(`AUTH_DEBUG: Attempt ${retryCount + 1}: Scheduling retry in ${retryDelayMs}ms...`);
          timeoutRef.current = setTimeout(() => setRetryCount(prev => prev + 1), retryDelayMs);
        } else {
          setIsAdmin(false);
          setIsAdminLoading(false);
          setRetryCount(0); // Reset retry count after max attempts
          toast({
            id: 'admin-status-check-error',
            title: "Erro de autenticação",
            description: `Não foi possível verificar o status de administrador após ${maxAttempts} tentativas: ${error.message}.`,
            variant: "destructive",
          });
        }
      }
    };

    checkAdminStatus(); // Chama a função apenas se o usuário existe (devido ao 'return' antecipado)

    // Função de limpeza para o useEffect
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
        console.log('AUTH_DEBUG: useEffect cleanup: Cleared pending retry timeout.');
      }
    };
  }, [user, retryCount, dismiss, toast]); // Depende de 'user' e 'retryCount'

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
    isAdminLoading,
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