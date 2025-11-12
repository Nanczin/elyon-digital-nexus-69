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
  refreshUserSession: () => Promise<void>; // Adicionada a função de refresh
  userRole: string | null; // NEW: Add userRole
}

const MemberAreaAuthContext = createContext<MemberAreaAuthContextType | undefined>(undefined);

export function MemberAreaAuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [userRole, setUserRole] = useState<string | null>(null); // NEW: State for userRole

  useEffect(() => {
    console.log('MEMBER_AREA_AUTH_DEBUG: MemberAreaAuthProvider useEffect started.');

    const { data: { subscription } } = memberAreaSupabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('MEMBER_AREA_AUTH_DEBUG: onAuthStateChange event:', event);
        setSession(session);
        setUser(session?.user ?? null);

        const role = (session?.user?.user_metadata?.role as string) || null; // NEW: Get role from metadata
        setUserRole(role); // NEW: Set userRole

        if (event === 'SIGNED_OUT') {
          console.log('MEMBER_AREA_AUTH_DEBUG: SIGNED_OUT event detected. Resetting states.');
          setUser(null);
          setSession(null);
          setUserRole(null); // NEW: Reset userRole
        }
        
        setLoading(false);
        console.log('MEMBER_AREA_AUTH_DEBUG: Auth loading set to false from onAuthStateChange. Current user:', session?.user?.email, 'Role:', role);
      }
    );

    memberAreaSupabase.auth.getSession()
      .then(({ data: { session } }) => {
        console.log('MEMBER_AREA_AUTH_DEBUG: Initial getSession resolved.');
        setSession(session);
        setUser(session?.user ?? null);
        
        const role = (session?.user?.user_metadata?.role as string) || null; // NEW: Get role from metadata
        setUserRole(role); // NEW: Set userRole

        setLoading(false);
        console.log('MEMBER_AREA_AUTH_DEBUG: Initial auth loading set to false from getSession. Current user:', session?.user?.email, 'Role:', role);
      })
      .catch((error) => {
        console.error('MEMBER_AREA_AUTH_DEBUG: Error during initial getSession:', error);
        setLoading(false); // Ensure loading is false even on error
      });

    // Fallback timeout to ensure loading state resolves (for diagnostic purposes)
    const fallbackTimeout = setTimeout(() => {
      if (loading) { // Only set to false if still true
        console.warn('MEMBER_AREA_AUTH_DEBUG: Fallback timeout triggered. Setting loading to false.');
        setLoading(false);
      }
    }, 10000); // 10 seconds timeout

    return () => {
      subscription.unsubscribe();
      clearTimeout(fallbackTimeout); // Clear fallback on unmount
    };
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
    console.log('MEMBER_AREA_AUTH_DEBUG: Attempting to sign out from member area...');
    await memberAreaSupabase.auth.signOut();
    localStorage.removeItem('sb-member-area-session');
    
    // Limpeza explícita do estado do React
    setUser(null);
    setSession(null);
    setUserRole(null); // NEW: Reset userRole

    toast({
      title: "Logout realizado",
      description: "Você foi desconectado da área de membros.",
    });
    console.log('MEMBER_AREA_AUTH_DEBUG: Sign out completed. Local storage cleared and React states reset.');
  };

  const refreshUserSession = async () => {
    setLoading(true);
    try {
      // Primeiro, tenta refrescar a sessão
      const { data: { session: newSession }, error: refreshError } = await memberAreaSupabase.auth.refreshSession();
      if (refreshError) {
        throw refreshError;
      }

      // Em seguida, busca o usuário mais recente para garantir que o user_metadata esteja atualizado
      const { data: { user: latestUser }, error: userError } = await memberAreaSupabase.auth.getUser();
      if (userError) {
        throw userError;
      }
      
      setSession(newSession);
      setUser(latestUser);
      const role = (latestUser?.user_metadata?.role as string) || null; // NEW: Get role from metadata
      setUserRole(role); // NEW: Set userRole
      console.log('MEMBER_AREA_AUTH_DEBUG: User session refreshed. Latest user data:', latestUser, 'Role:', role);

    } catch (error: any) {
      console.error("Erro ao atualizar sessão do usuário da área de membros:", error);
      toast({
        title: "Erro",
        description: error.message || "Não foi possível atualizar os dados do usuário.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const value = {
    user,
    session,
    loading,
    signIn,
    signOut,
    refreshUserSession,
    userRole, // NEW: Add userRole to context value
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