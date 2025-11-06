-- Criar tabela products com todos os campos necessários
CREATE TABLE IF NOT EXISTS public.products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  member_area_id uuid REFERENCES public.member_areas(id) ON DELETE SET NULL,
  name text NOT NULL,
  description text,
  price integer NOT NULL, -- Preço em centavos
  banner_url text,
  logo_url text,
  file_url text, -- URL do arquivo entregável
  member_area_link text, -- Link para área de membros
  access_url text, -- URL de acesso
  email_template text, -- Template de email
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL
);

-- Enable RLS
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;

-- Políticas RLS para products
CREATE POLICY "Users can view their own products"
ON public.products FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own products"
ON public.products FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own products"
ON public.products FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own products"
ON public.products FOR DELETE
TO authenticated
USING (auth.uid() = user_id);

-- Índices para melhor performance
CREATE INDEX IF NOT EXISTS idx_products_user_id ON public.products(user_id);
CREATE INDEX IF NOT EXISTS idx_products_member_area_id ON public.products(member_area_id);

-- Trigger para atualizar updated_at
CREATE TRIGGER update_products_updated_at
BEFORE UPDATE ON public.products
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();