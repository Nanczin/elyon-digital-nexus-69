import { createContext } from 'react';
import { User, Session } from '@supabase/supabase-js';

// Definir a interface do tipo de contexto
export interface AuthContextType { // Adicionado 'export' aqui
  user: User | null;
  session: Session | null;
  loading: boolean;
  signUp: (email: string, password: string, name: string) => Promise<{ error: any }>;
  signIn: (email: string, password: string) => Promise<{ error: any }>;
  signOut: () => Promise<void>;
  isAdmin: boolean;
}

// Criar e exportar o AuthContext
export const AuthContext = createContext<AuthContextType | undefined>(undefined);