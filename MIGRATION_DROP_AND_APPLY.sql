-- ============================================
-- DROP (se existir) + MIGRATION: CREATE MEMBER TABLES
-- Purpose: remove objetos parciais problemáticos e aplicar migração simples
-- Created: 2025-11-14
-- ============================================

-- 1) REMOVER tabelas e dependências problemáticas (seguros: IF EXISTS)
DROP TABLE IF EXISTS public.member_access CASCADE;
DROP TABLE IF EXISTS public.members CASCADE;
DROP TABLE IF EXISTS public.member_settings CASCADE;

-- 2) Agora crie as tabelas usando a versão simplificada

-- ============================================
-- BEGIN MIGRATION (copiado de MIGRATION_SQL_SIMPLE.sql)
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

ALTER TABLE public.members ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role can manage members" ON public.members
FOR ALL USING (auth.role() = 'service_role');

CREATE INDEX IF NOT EXISTS idx_members_email ON public.members(email);
CREATE INDEX IF NOT EXISTS idx_members_checkout_id ON public.members(checkout_id);
CREATE INDEX IF NOT EXISTS idx_members_user_id ON public.members(user_id);

DO $$ BEGIN
  CREATE TRIGGER update_members_updated_at
  BEFORE UPDATE ON public.members
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
EXCEPTION WHEN OTHERS THEN
  NULL;
END $$;


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

ALTER TABLE public.member_access ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role can manage member_access" ON public.member_access
FOR ALL USING (auth.role() = 'service_role');

CREATE INDEX IF NOT EXISTS idx_member_access_member_id ON public.member_access(member_id);
CREATE INDEX IF NOT EXISTS idx_member_access_product_id ON public.member_access(product_id);

DO $$ BEGIN
  CREATE TRIGGER update_member_access_updated_at
  BEFORE UPDATE ON public.member_access
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
EXCEPTION WHEN OTHERS THEN
  NULL;
END $$;


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

ALTER TABLE public.member_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role can manage member_settings" ON public.member_settings
FOR ALL USING (auth.role() = 'service_role');

DO $$ BEGIN
  CREATE TRIGGER update_member_settings_updated_at
  BEFORE UPDATE ON public.member_settings
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
EXCEPTION WHEN OTHERS THEN
  NULL;
END $$;

-- ============================================
-- END MIGRATION
-- ============================================

-- Conclusão
-- Verifique no Supabase Console → Database se as tabelas existem
