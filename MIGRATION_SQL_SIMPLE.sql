-- ============================================
-- MIGRATION: CREATE MEMBER TABLES (VERSÃO SIMPLIFICADA)
-- Created: 2024-11-14
-- Project: Elyon Digital Nexus
-- ============================================
-- 
-- VERSÃO SIMPLIFICADA - Sem erros de referência cruzada
-- Esta versão remover validações complexas que podem falhar
--
-- INSTRUÇÃO DE USO:
-- 1. Abra https://app.supabase.com/projects/jgmwbovvydimvnmmkfpy/sql/new
-- 2. Cole TODO o conteúdo deste arquivo
-- 3. Clique "Run" ou pressione Ctrl+Enter
-- 4. Aguarde a conclusão (deve mostrar ✅)
-- 5. Verifique em Database se as tabelas foram criadas
--
-- ============================================

-- ============================================
-- 1. CRIAR TABELA: members
-- ============================================

CREATE TABLE IF NOT EXISTS public.members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  name text NOT NULL,
  email text UNIQUE NOT NULL,
  phone text,
  password_hash text NOT NULL,
  checkout_id uuid NOT NULL,
  payment_id uuid,
  plan_type text,
  status text DEFAULT 'active',
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL
);

-- Habilitar Row Level Security
ALTER TABLE public.members ENABLE ROW LEVEL SECURITY;

-- Política simples: Service role pode tudo
CREATE POLICY "Service role can manage members" ON public.members
FOR ALL USING (auth.role() = 'service_role');

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_members_email ON public.members(email);
CREATE INDEX IF NOT EXISTS idx_members_checkout_id ON public.members(checkout_id);
CREATE INDEX IF NOT EXISTS idx_members_user_id ON public.members(user_id);

-- Trigger para atualizar timestamp (se função existir)
DO $$ BEGIN
  CREATE TRIGGER update_members_updated_at
  BEFORE UPDATE ON public.members
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
EXCEPTION WHEN OTHERS THEN
  NULL;
END $$;


-- ============================================
-- 2. CRIAR TABELA: member_access
-- ============================================

CREATE TABLE IF NOT EXISTS public.member_access (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id uuid NOT NULL REFERENCES public.members(id) ON DELETE CASCADE,
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  granted_at timestamp with time zone DEFAULT now() NOT NULL,
  expires_at timestamp with time zone,
  status text DEFAULT 'active',
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL
);

-- Habilitar Row Level Security
ALTER TABLE public.member_access ENABLE ROW LEVEL SECURITY;

-- Política simples: Service role pode tudo
CREATE POLICY "Service role can manage member_access" ON public.member_access
FOR ALL USING (auth.role() = 'service_role');

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_member_access_member_id ON public.member_access(member_id);
CREATE INDEX IF NOT EXISTS idx_member_access_product_id ON public.member_access(product_id);

-- Trigger para atualizar timestamp (se função existir)
DO $$ BEGIN
  CREATE TRIGGER update_member_access_updated_at
  BEFORE UPDATE ON public.member_access
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
EXCEPTION WHEN OTHERS THEN
  NULL;
END $$;


-- ============================================
-- 3. CRIAR TABELA: member_settings
-- ============================================

CREATE TABLE IF NOT EXISTS public.member_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  member_area_id uuid NOT NULL REFERENCES public.member_areas(id) ON DELETE CASCADE,
  default_password_mode text DEFAULT 'random',
  default_fixed_password text,
  welcome_email_template text,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL,
  UNIQUE(member_area_id)
);

-- Habilitar Row Level Security
ALTER TABLE public.member_settings ENABLE ROW LEVEL SECURITY;

-- Política simples: Service role pode tudo
CREATE POLICY "Service role can manage member_settings" ON public.member_settings
FOR ALL USING (auth.role() = 'service_role');

-- Trigger para atualizar timestamp (se função existir)
DO $$ BEGIN
  CREATE TRIGGER update_member_settings_updated_at
  BEFORE UPDATE ON public.member_settings
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
EXCEPTION WHEN OTHERS THEN
  NULL;
END $$;


-- ============================================
-- CONCLUSÃO
-- ============================================
-- 
-- ✅ Se você viu esta mensagem, a migração foi aplicada com sucesso!
--
-- Próximos passos:
-- 1. Verifique se as 3 tabelas aparecem em "Database" no Supabase Console
-- 2. Configure as variáveis de ambiente nas Edge Functions
-- 3. Teste um checkout
--
-- ============================================
