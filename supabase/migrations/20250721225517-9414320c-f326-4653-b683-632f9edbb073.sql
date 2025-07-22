-- Update the payments table to allow null user_id for guest checkouts
-- and adjust RLS policies accordingly

-- First, ensure user_id can be null (it should already be based on the schema)
-- Add a policy to allow inserting payments with null user_id (for guest checkouts)
DO $$
BEGIN
    -- Check if the policy exists and drop it if it does
    IF EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE schemaname = 'public' 
        AND tablename = 'payments' 
        AND policyname = 'Allow guest checkout payments'
    ) THEN
        DROP POLICY "Allow guest checkout payments" ON public.payments;
    END IF;
END $$;

-- Create policy to allow guest checkout (null user_id) payments to be inserted
CREATE POLICY "Allow guest checkout payments" ON public.payments
  FOR INSERT 
  WITH CHECK (user_id IS NULL OR user_id = auth.uid());

-- Also need to allow these payments to be viewed by the system
DO $$
BEGIN
    -- Check if the policy exists and drop it if it does
    IF EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE schemaname = 'public' 
        AND tablename = 'payments' 
        AND policyname = 'Allow system to view guest payments'
    ) THEN
        DROP POLICY "Allow system to view guest payments" ON public.payments;
    END IF;
END $$;

CREATE POLICY "Allow system to view guest payments" ON public.payments
  FOR SELECT 
  USING (user_id IS NULL OR user_id = auth.uid());