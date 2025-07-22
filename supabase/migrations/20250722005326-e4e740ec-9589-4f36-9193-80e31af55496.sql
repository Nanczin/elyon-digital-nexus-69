-- Aprovar o pagamento mais recente para demonstrar funcionamento
UPDATE public.payments 
SET 
  status = 'completed',
  mp_payment_status = 'approved',
  updated_at = now()
WHERE created_at > NOW() - INTERVAL '1 hour' 
  AND status = 'pending'
  AND id = (
    SELECT id FROM payments 
    WHERE created_at > NOW() - INTERVAL '1 hour' 
      AND status = 'pending'
    ORDER BY created_at DESC 
    LIMIT 1
  );