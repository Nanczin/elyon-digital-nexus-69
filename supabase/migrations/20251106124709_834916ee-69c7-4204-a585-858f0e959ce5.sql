-- 1. Adicionar campo associated_products na tabela member_areas
ALTER TABLE public.member_areas 
ADD COLUMN IF NOT EXISTS associated_products uuid[] DEFAULT '{}';

-- 2. Criar índice GIN para melhor performance em buscas de array
CREATE INDEX IF NOT EXISTS idx_member_areas_associated_products 
ON public.member_areas USING GIN(associated_products);

-- 3. Garantir que products_owned existe em profiles (já existe, mas garantir índice)
CREATE INDEX IF NOT EXISTS idx_profiles_products_owned 
ON public.profiles USING GIN(products_owned);

-- 4. Corrigir políticas RLS de community_posts
DROP POLICY IF EXISTS "Authenticated users can read posts" ON public.community_posts;
DROP POLICY IF EXISTS "Authenticated users can create posts" ON public.community_posts;

-- Permitir leitura para usuários logados
CREATE POLICY "Allow read for authenticated"
ON public.community_posts
FOR SELECT
TO authenticated
USING (true);

-- Permitir criação apenas pelo usuário dono do post
CREATE POLICY "Allow insert for owner"
ON public.community_posts
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);