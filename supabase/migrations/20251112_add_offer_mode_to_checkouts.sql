-- Add offer_mode column to checkouts table
ALTER TABLE public.checkouts
ADD COLUMN IF NOT EXISTS offer_mode TEXT NOT NULL DEFAULT 'single';

-- Add comment to the column
COMMENT ON COLUMN public.checkouts.offer_mode IS 'Modo de oferta: single ou multiple';

-- Create index for better query performance if needed
CREATE INDEX IF NOT EXISTS idx_checkouts_offer_mode ON public.checkouts(offer_mode);
