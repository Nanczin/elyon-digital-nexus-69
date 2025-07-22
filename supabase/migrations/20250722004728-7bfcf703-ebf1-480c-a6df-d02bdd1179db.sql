-- Vamos atualizar manualmente um pagamento para testar a trigger de sales
UPDATE public.payments 
SET 
  status = 'completed',
  mp_payment_status = 'approved',
  updated_at = now()
WHERE mp_payment_id = '119441061430';