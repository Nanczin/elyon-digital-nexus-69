-- Criar tabela de clientes
CREATE TABLE public.customers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  cpf TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  last_purchase TIMESTAMP WITH TIME ZONE,
  total_spent INTEGER DEFAULT 0,
  purchase_count INTEGER DEFAULT 0,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  UNIQUE(email)
);

-- Enable RLS
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Admins can manage all customers"
ON public.customers
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.user_id = auth.uid() 
    AND profiles.role = 'admin'
  )
);

-- Add trigger for timestamps
CREATE TRIGGER update_customers_updated_at
  BEFORE UPDATE ON public.customers
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Create function to update customer data when payment is completed
CREATE OR REPLACE FUNCTION public.update_customer_stats()
RETURNS TRIGGER AS $$
BEGIN
  -- Only proceed if payment status changed to completed
  IF OLD.status != 'completed' AND NEW.status = 'completed' THEN
    -- Extract customer data from payment metadata
    DECLARE
      customer_data JSONB;
      customer_name TEXT;
      customer_email TEXT;
      customer_phone TEXT;
      customer_cpf TEXT;
      payment_amount INTEGER;
    BEGIN
      customer_data := NEW.metadata->'customer_data';
      customer_name := customer_data->>'name';
      customer_email := customer_data->>'email';
      customer_phone := customer_data->>'phone';
      customer_cpf := customer_data->>'cpf';
      payment_amount := NEW.amount;
      
      -- Insert or update customer
      INSERT INTO public.customers (name, email, phone, cpf, last_purchase, total_spent, purchase_count)
      VALUES (customer_name, customer_email, customer_phone, customer_cpf, NEW.updated_at, payment_amount, 1)
      ON CONFLICT (email) 
      DO UPDATE SET 
        name = EXCLUDED.name,
        phone = COALESCE(EXCLUDED.phone, customers.phone),
        cpf = COALESCE(EXCLUDED.cpf, customers.cpf),
        last_purchase = EXCLUDED.last_purchase,
        total_spent = customers.total_spent + payment_amount,
        purchase_count = customers.purchase_count + 1,
        updated_at = now();
    END;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for customer updates
CREATE TRIGGER update_customer_stats_trigger
  AFTER UPDATE ON public.payments
  FOR EACH ROW
  EXECUTE FUNCTION public.update_customer_stats();