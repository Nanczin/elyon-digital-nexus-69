#!/bin/bash

# APPLY_MIGRATIONS.sh - Script para aplicar migrações
# Este script fornece as SQL prontas para copiar e executar no Supabase Console

set -e

echo "═══════════════════════════════════════════════════════════════"
echo "🚀 APLICAÇÃO DE MIGRAÇÕES - ELYON DIGITAL NEXUS"
echo "═══════════════════════════════════════════════════════════════"
echo ""
echo "Status atual:"
echo "  ❌ Tabelas FALTANDO: members, member_settings"
echo "  ✅ Tabelas EXISTEM: compras, member_access"
echo ""
echo "IMPORTANTE: Você PRECISA fazer isso para que membros sejam criados!"
echo ""

# Detectar qual é o melhor método
if command -v psql &> /dev/null; then
    echo "✅ psql encontrado no sistema"
    echo ""
    echo "Método 1: Executar via psql (RECOMENDADO)"
    echo "─────────────────────────────────────────"
    echo "Execute este comando no terminal:"
    echo ""
    echo "# Copie a connection string do Supabase Console:"
    echo "# Settings → Database → Connection String (URI)"
    echo "psql 'postgresql://postgres.[PROJECT]:[PASSWORD]@db.[PROJECT].supabase.co:5432/postgres' < supabase/migrations/20251114_create_member_tables.sql"
    echo ""
else
    echo "⚠️  psql NÃO encontrado"
    echo ""
fi

echo ""
echo "Método 2: Via Supabase Console (SEMPRE FUNCIONA)"
echo "──────────────────────────────────────────────────"
echo "1. Abra: https://app.supabase.com/projects/jgmwbovvydimvnmmkfpy"
echo "2. Vá para 'SQL Editor' (sidebar esquerdo)"
echo "3. Clique em 'New Query'"
echo "4. Cole o SQL abaixo (ou use o arquivo)"
echo "5. Clique 'Run' (ou Ctrl+Enter)"
echo ""
echo "Arquivo com SQL pronto: supabase/migrations/20251114_create_member_tables.sql"
echo ""

# Criar arquivo temporário com SQL formatado
TEMP_SQL="/tmp/migration_ready_to_paste.sql"
cat > "$TEMP_SQL" << 'EOFMIGRATION'
-- ============================================
-- CRIAR TABELAS DE MEMBROS
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
  plan_type text CHECK (plan_type IN ('essencial', 'avançado', 'premium', 'oferta_unica')),
  status text DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'suspended')),
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL
);

ALTER TABLE public.members ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own member record" ON public.members
FOR SELECT TO authenticated
USING (auth.uid() = user_id OR auth.uid() IN (
  SELECT user_id FROM checkouts WHERE id = checkout_id
));

CREATE POLICY "Service role can manage members" ON public.members
FOR ALL TO service_role
USING (true);

CREATE INDEX IF NOT EXISTS idx_members_email ON public.members(email);
CREATE INDEX IF NOT EXISTS idx_members_checkout_id ON public.members(checkout_id);
CREATE INDEX IF NOT EXISTS idx_members_payment_id ON public.members(payment_id);
CREATE INDEX IF NOT EXISTS idx_members_user_id ON public.members(user_id);

CREATE TRIGGER update_members_updated_at
BEFORE UPDATE ON public.members
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Criar tabela member_access para associar membros aos produtos
CREATE TABLE IF NOT EXISTS public.member_access (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id uuid NOT NULL REFERENCES public.members(id) ON DELETE CASCADE,
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  granted_at timestamp with time zone DEFAULT now() NOT NULL,
  expires_at timestamp with time zone,
  status text DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'expired')),
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL
);

ALTER TABLE public.member_access ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view their own access" ON public.member_access
FOR SELECT TO authenticated
USING (member_id IN (SELECT id FROM members WHERE user_id = auth.uid()));

CREATE POLICY "Service role can manage member_access" ON public.member_access
FOR ALL TO service_role
USING (true);

CREATE INDEX IF NOT EXISTS idx_member_access_member_id ON public.member_access(member_id);
CREATE INDEX IF NOT EXISTS idx_member_access_product_id ON public.member_access(product_id);

CREATE TRIGGER update_member_access_updated_at
BEFORE UPDATE ON public.member_access
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Criar tabela member_settings para configurações da área de membros
CREATE TABLE IF NOT EXISTS public.member_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  member_area_id uuid NOT NULL REFERENCES public.member_areas(id) ON DELETE CASCADE,
  default_password_mode text DEFAULT 'random' CHECK (default_password_mode IN ('fixed', 'random', 'force_change')),
  default_fixed_password text,
  welcome_email_template text,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL,
  UNIQUE(member_area_id)
);

ALTER TABLE public.member_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owners can view their member_settings" ON public.member_settings
FOR SELECT TO authenticated
USING (member_area_id IN (SELECT id FROM member_areas WHERE user_id = auth.uid()));

CREATE POLICY "Owners can insert their member_settings" ON public.member_settings
FOR INSERT TO authenticated
WITH CHECK (member_area_id IN (SELECT id FROM member_areas WHERE user_id = auth.uid()));

CREATE POLICY "Owners can update their member_settings" ON public.member_settings
FOR UPDATE TO authenticated
USING (member_area_id IN (SELECT id FROM member_areas WHERE user_id = auth.uid()))
WITH CHECK (member_area_id IN (SELECT id FROM member_areas WHERE user_id = auth.uid()));

CREATE POLICY "Service role can manage member_settings" ON public.member_settings
FOR ALL TO service_role
USING (true);

CREATE TRIGGER update_member_settings_updated_at
BEFORE UPDATE ON public.member_settings
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
EOFMIGRATION

echo "📋 SQL salvo em: $TEMP_SQL"
echo ""

# Mostrar tamanho
SIZE=$(wc -c < "$TEMP_SQL" 2>/dev/null || echo "?")
echo "Tamanho da migração: $SIZE bytes"
echo ""

# Se tiver service role key como argumento, tentar aplicar
if [ -n "$1" ]; then
    echo "🔑 SERVICE_ROLE_KEY fornecida como argumento"
    echo "Tentando aplicar via API..."
    echo ""
    echo "❌ Infelizmente, a API REST do Supabase não suporta execução de SQL raw."
    echo "Use os métodos 1 ou 2 acima."
fi

echo ""
echo "═══════════════════════════════════════════════════════════════"
echo "✅ PRÓXIMOS PASSOS"
echo "═══════════════════════════════════════════════════════════════"
echo ""
echo "1. Escolha um método acima e execute a migração"
echo "2. Verifique se funcionou:"
echo "   - Supabase Console → Database → SQL"
echo "   - Selecione 'public.members' na aba lateral"
echo "   - Deve aparecer a estrutura da tabela"
echo ""
echo "3. Configure variáveis de ambiente das Edge Functions:"
echo "   - Mercado Pago → Configurações → Tokens"
echo "   - Supabase → Edge Functions → create-member"
echo "   - Adicione secrets em 'Settings'"
echo ""
echo "4. Teste com um checkout!"
echo ""

