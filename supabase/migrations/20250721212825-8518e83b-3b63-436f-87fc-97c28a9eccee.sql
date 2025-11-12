-- Create edge function for processing Mercado Pago payments
-- This will be used to create PIX payments and generate QR codes

-- First, let's update the payments table to store additional payment information
ALTER TABLE public.payments 
ADD COLUMN IF NOT EXISTS mp_payment_id TEXT,
ADD COLUMN IF NOT EXISTS mp_payment_status TEXT,
ADD COLUMN IF NOT EXISTS qr_code_base64 TEXT,
ADD COLUMN IF NOT EXISTS qr_code TEXT,
ADD COLUMN IF NOT EXISTS payment_url TEXT;