-- Simular aprovação de um pagamento PIX para demonstrar o funcionamento
UPDATE public.payments 
SET 
  status = 'completed',
  mp_payment_status = 'approved',
  updated_at = now()
WHERE mp_payment_id = '119438220800';