# 🚀 Como Aplicar as Migrações do Banco de Dados

## Status Atual ⚠️

As migrações ainda **NÃO foram aplicadas** no seu projeto Supabase. Isso explica por que membros não estão sendo criados!

**Tabelas que FALTAM:**
- ❌ `members` - Armazena dados dos membros criados via checkout
- ❌ `member_settings` - Configurações de senha por área de membros

**Tabelas que EXISTEM:**
- ✅ `compras` - Registra as compras
- ✅ `member_access` - Controla acesso a produtos

---

## Como Aplicar? 3 Opções

### Opção 1: Via Supabase Console (RECOMENDADO - 2 minutos)

1. Abra: https://app.supabase.com/projects/jgmwbovvydimvnmmkfpy
2. Vá para **"SQL Editor"** (lado esquerdo)
3. Clique em **"New Query"**
4. Cole TODO o SQL abaixo:

```sql
-- ============================================
-- CRIAR TABELAS DE MEMBROS
-- ============================================

-- Criar tabela members para armazenar membros da área de membros
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

-- Enable RLS
ALTER TABLE public.members ENABLE ROW LEVEL SECURITY;

-- Policies for members
CREATE POLICY "Users can view their own member record" ON public.members
FOR SELECT TO authenticated
USING (auth.uid() = user_id OR auth.uid() IN (
  SELECT user_id FROM checkouts WHERE id = checkout_id
));

CREATE POLICY "Service role can manage members" ON public.members
FOR ALL TO service_role
USING (true);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_members_email ON public.members(email);
CREATE INDEX IF NOT EXISTS idx_members_checkout_id ON public.members(checkout_id);
CREATE INDEX IF NOT EXISTS idx_members_payment_id ON public.members(payment_id);
CREATE INDEX IF NOT EXISTS idx_members_user_id ON public.members(user_id);

-- Trigger para atualizar updated_at
CREATE TRIGGER update_members_updated_at
BEFORE UPDATE ON public.members
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

---

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

-- Enable RLS
ALTER TABLE public.member_access ENABLE ROW LEVEL SECURITY;

-- Policies for member_access
CREATE POLICY "Members can view their own access" ON public.member_access
FOR SELECT TO authenticated
USING (member_id IN (SELECT id FROM members WHERE user_id = auth.uid()));

CREATE POLICY "Service role can manage member_access" ON public.member_access
FOR ALL TO service_role
USING (true);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_member_access_member_id ON public.member_access(member_id);
CREATE INDEX IF NOT EXISTS idx_member_access_product_id ON public.member_access(product_id);

-- Trigger para atualizar updated_at
CREATE TRIGGER update_member_access_updated_at
BEFORE UPDATE ON public.member_access
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

---

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

-- Enable RLS
ALTER TABLE public.member_settings ENABLE ROW LEVEL SECURITY;

-- Policies for member_settings
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

-- Trigger para atualizar updated_at
CREATE TRIGGER update_member_settings_updated_at
BEFORE UPDATE ON public.member_settings
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
```

5. Clique em **"Run"** (ou Ctrl+Enter)
6. Aguarde a conclusão ✅

---

### Opção 2: Via psql (Terminal)

Se tiver `psql` instalado:

```bash
# Obter connection string no Supabase Console → Settings → Database
psql "postgresql://postgres.[PROJECT]:[PASSWORD]@db.[PROJECT].supabase.co:5432/postgres" < supabase/migrations/20251114_create_member_tables.sql
```

---

### Opção 3: Deixar o agente fazer (Requer credenciais)

Envie para o agente:
- `SUPABASE_SERVICE_ROLE_KEY` (em Supabase → Settings → API)
- `SUPABASE_DB_PASSWORD` (se aplicável)

E ele aplicará automaticamente.

---

## Próximos Passos APÓS Aplicar as Migrações

1. **Verificar se funcionou:**
   ```bash
   cd /workspaces/elyon-digital-nexus-69
   npm run test-migrations
   ```

2. **Configurar variáveis de ambiente:**
   - Ir para Supabase → Edge Functions
   - Editar `create-member` e `mercadopago-webhook`
   - Adicionar segredos:
     - `MERCADOPAGO_ACCESS_TOKEN` (de Mercado Pago)
     - `MERCADOPAGO_WEBHOOK_SECRET` (de Mercado Pago)

3. **Testar o fluxo completo:**
   - Fazer um checkout de teste
   - Verificar se membro é criado automaticamente
   - Receber email com senha

---

## ⚠️ Se Não Funcionar...

**Erro: "relation already exists"**
- Suas tabelas já existem! Execute `SELECT * FROM members;` para verificar

**Erro: "function not found"**
- A função `update_updated_at_column()` precisa existir. Execute no SQL Editor:
```sql
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
```

**Membros ainda não são criados após aplicar?**
- Verificar logs da Edge Function: Supabase → Functions → create-member → Logs
- Garantir que `MERCADOPAGO_ACCESS_TOKEN` está configurado
- Simular webhook: `bash test-email-password-delivery.sh`

---

## Checklist ✅

- [ ] Migrações aplicadas (tabelas `members` e `member_settings` criadas)
- [ ] Variáveis de ambiente configuradas na Edge Function
- [ ] Webhook do Mercado Pago apontando corretamente
- [ ] Teste de checkout realizado com sucesso
- [ ] Membro criado automaticamente na área de membros
- [ ] Email com senha entregue ao cliente

