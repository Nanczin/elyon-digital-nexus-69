-- Adicionar coluna timer na tabela checkouts
ALTER TABLE public.checkouts 
ADD COLUMN IF NOT EXISTS timer JSONB DEFAULT NULL;

-- Comentário explicativo
COMMENT ON COLUMN public.checkouts.timer IS 'Configurações do temporizador de oferta: enabled (boolean), duration (number em minutos), color (string), text (string)';