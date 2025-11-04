import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { memberAreaSupabase } from '@/integrations/supabase/memberAreaClient'; // Usar o cliente da área de membros
import { toast } from '@/hooks/use-toast';

interface MemberAreaAuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: any }>;
  signOut: () => Promise<void>;
  // Não há 'isAdmin' para usuários da área de membros
}

const MemberAreaAuthContext = createContext<MemberAreaAuthContextType | undefined>(undefined);

export function MemberAreaAuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const { data: { subscription } } = memberAreaSupabase.auth.onAuthStateChange(
      async (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);
      }
    );

    memberAreaSupabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signIn = async (email: string, password: string) => {
    const { error } = await memberAreaSupabase.auth.signInWithPassword({
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
        description: "Redirecionando para o dashboard da área de membros...",
      });
    }

    return { error };
  };

  const signOut = async () => {
    await memberAreaSupabase.auth.signOut();
    toast({
      title: "Logout realizado",
      description: "Você foi desconectado da área de membros.",
    });
  };

  const value = {
    user,
    session,
    loading,
    signIn,
    signOut,
  };

  return <MemberAreaAuthContext.Provider value={value}>{children}</MemberAreaAuthContext.Provider>;
}

export function useMemberAreaAuth() {
  const context = useContext(MemberAreaAuthContext);
  if (context === undefined) {
    throw new Error('useMemberAreaAuth must be used within a MemberAreaAuthProvider');
  }
  return context;
}