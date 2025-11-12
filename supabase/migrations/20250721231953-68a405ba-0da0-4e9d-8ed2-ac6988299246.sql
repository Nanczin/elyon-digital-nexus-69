-- Permitir user_id nulo na tabela payments para checkout de convidados
ALTER TABLE public.payments ALTER COLUMN user_id DROP NOT NULL;