# 🎯 AÇÃO URGENTE: Aplicar Migrações de Banco de Dados

## ⚠️ Problema Identificado

Os usuários que compram via checkout **NÃO estão sendo registrados na área de membros** porque as tabelas necessárias **não existem no banco de dados**!

### Status Atual do Banco
```
✅ Tabelas que EXISTEM:
   - compras
   - member_access

❌ Tabelas que FALTAM:
   - members (CRÍTICO - armazena dados dos membros)
   - member_settings (CRÍTICO - configura modo de senha)
```

---

## 🔧 Como Resolver (2 minutos)

### OPÇÃO 1: Via Supabase Console (RECOMENDADO)

**Passo 1:** Abra o Supabase Console
```
https://app.supabase.com/projects/jgmwbovvydimvnmmkfpy
```

**Passo 2:** Clique em "SQL Editor" (no menu lateral esquerdo)

**Passo 3:** Clique em "New Query"

**Passo 4:** Cole TODO este SQL:

```sql
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
```

**Passo 5:** Clique em **"Run"** (ou pressione Ctrl+Enter)

**Passo 6:** Aguarde aparecer ✅ em verde

---

### OPÇÃO 2: Via Terminal (se tiver `psql`)

```bash
# Obtenha a connection string em:
# Supabase Console → Settings → Database → URI
psql "postgresql://postgres.[PROJECT]:[PASSWORD]@db.[PROJECT].supabase.co:5432/postgres" < supabase/migrations/20251114_create_member_tables.sql
```

---

## ✅ Como Verificar se Funcionou?

Após executar, vá para **Supabase Console → Database** e você deve ver as 4 tabelas:
- `compras` ✅
- `members` ✅
- `member_access` ✅
- `member_settings` ✅

---

## 🚀 Próximos Passos

Após aplicar as migrações, execute em ordem:

### 1️⃣ Configurar Edge Functions

No Supabase Console, vá para **Functions → create-member → Settings**

Adicione os secrets:
```
MERCADOPAGO_ACCESS_TOKEN = [seu token do Mercado Pago]
MERCADOPAGO_WEBHOOK_SECRET = [seu secret do webhook]
```

### 2️⃣ Testar Webhook

No Mercado Pago, configure o webhook para:
```
https://jgmwbovvydimvnmmkfpy.supabase.co/functions/v1/mercadopago-webhook
```

### 3️⃣ Fazer um Checkout de Teste

1. Abra seu app
2. Faça um checkout
3. Termine o pagamento
4. Verifique na aba "Membros" se foi criado automaticamente

---

## 🆘 Se Algo Não Funcionar...

**Erro: "relation already exists"**
- Suas tabelas já existem! Pule para o passo 2

**Erro: "function not found: update_updated_at_column"**
- Execute no SQL Editor:
```sql
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
```

**Membros ainda não são criados após tudo?**
- Verificar logs em Supabase Console → Functions → create-member → Logs
- Garantir que o webhook está sendo acionado
- Testar simulação de webhook

---

## 📋 Checklist Final

- [ ] SQL executado sem erros
- [ ] Tabelas criadas (verificar em Database)
- [ ] Secrets configurados nas Edge Functions
- [ ] Webhook configurado no Mercado Pago
- [ ] Teste de checkout realizado
- [ ] Membro criado automaticamente
- [ ] Email com senha entregue

