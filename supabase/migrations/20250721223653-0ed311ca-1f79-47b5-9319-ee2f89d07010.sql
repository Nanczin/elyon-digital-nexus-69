-- Habilitar cartão de crédito para o checkout existente
UPDATE public.checkouts 
SET payment_methods = '{"pix": true, "creditCard": true}'::jsonb 
WHERE id = '4d1851d7-d790-4bc2-882b-d47323ab1a11';