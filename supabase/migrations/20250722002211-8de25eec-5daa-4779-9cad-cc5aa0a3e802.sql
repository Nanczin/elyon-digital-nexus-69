-- Atualizar constraint de status na tabela payments para incluir 'approved'
ALTER TABLE public.payments DROP CONSTRAINT IF EXISTS payments_status_check;
ALTER TABLE public.payments ADD CONSTRAINT payments_status_check 
CHECK (status IN ('pending', 'completed', 'failed', 'cancelled', 'approved'));

-- Criar tabela de vendas para tracking completo
CREATE TABLE IF NOT EXISTS public.sales (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  payment_id UUID REFERENCES public.payments(id) ON DELETE CASCADE,
  customer_id UUID REFERENCES public.customers(id) ON DELETE SET NULL,
  checkout_id UUID REFERENCES public.checkouts(id) ON DELETE CASCADE,
  product_name TEXT NOT NULL,
  product_id UUID,
  amount INTEGER NOT NULL, -- valor em centavos
  quantity INTEGER DEFAULT 1,
  order_bumps JSONB DEFAULT '[]'::jsonb,
  selected_package JSONB,
  payment_method TEXT,
  status TEXT DEFAULT 'completed',
  commission_amount INTEGER DEFAULT 0,
  net_amount INTEGER,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS na tabela sales
ALTER TABLE public.sales ENABLE ROW LEVEL SECURITY;

-- Políticas RLS para sales
CREATE POLICY "Admins can manage all sales" 
ON public.sales 
FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.user_id = auth.uid() AND profiles.role = 'admin'
  )
);

-- Trigger para atualizar updated_at na tabela sales
CREATE TRIGGER update_sales_updated_at
BEFORE UPDATE ON public.sales
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Função para processar venda completa após pagamento aprovado
CREATE OR REPLACE FUNCTION public.process_completed_sale()
RETURNS TRIGGER AS $$
DECLARE
  customer_data JSONB;
  checkout_data RECORD;
  sale_id UUID;
  product_name TEXT;
  order_bumps_data JSONB;
  selected_package_data JSONB;
BEGIN
  -- Só processar se o status mudou para 'completed' ou 'approved'
  IF (OLD.status NOT IN ('completed', 'approved') AND NEW.status IN ('completed', 'approved')) THEN
    
    -- Buscar dados do checkout
    SELECT * INTO checkout_data 
    FROM public.checkouts 
    WHERE id = NEW.checkout_id;
    
    -- Buscar dados do produto
    SELECT name INTO product_name
    FROM public.products 
    WHERE id = checkout_data.product_id;
    
    -- Extrair dados do cliente do metadata
    customer_data := NEW.metadata->'customer_data';
    
    -- Extrair order bumps e package selecionado do metadata do MP
    order_bumps_data := COALESCE(NEW.metadata->'mp_webhook_data'->'metadata'->'order_bumps', '[]'::jsonb);
    selected_package_data := NEW.metadata->'mp_webhook_data'->'metadata'->'selected_package';
    
    -- Calcular valor líquido (assumindo 5% de comissão do MP)
    DECLARE
      net_value INTEGER := ROUND(NEW.amount * 0.95);
    BEGIN
      
      -- Criar registro de venda
      INSERT INTO public.sales (
        payment_id,
        customer_id,
        checkout_id,
        product_name,
        product_id,
        amount,
        quantity,
        order_bumps,
        selected_package,
        payment_method,
        status,
        commission_amount,
        net_amount
      ) VALUES (
        NEW.id,
        (SELECT id FROM public.customers WHERE email = customer_data->>'email' LIMIT 1),
        NEW.checkout_id,
        COALESCE(product_name, 'Produto'),
        checkout_data.product_id,
        NEW.amount,
        1,
        order_bumps_data,
        selected_package_data,
        NEW.payment_method,
        'completed',
        NEW.amount - net_value,
        net_value
      ) RETURNING id INTO sale_id;
      
      -- Atualizar estatísticas do cliente se ele existir
      UPDATE public.customers 
      SET 
        last_purchase = NEW.updated_at,
        total_spent = total_spent + NEW.amount,
        purchase_count = purchase_count + 1,
        updated_at = now()
      WHERE email = customer_data->>'email';
      
    END;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para processar venda quando pagamento for aprovado
DROP TRIGGER IF EXISTS process_sale_on_payment_completion ON public.payments;
CREATE TRIGGER process_sale_on_payment_completion
AFTER UPDATE ON public.payments
FOR EACH ROW
EXECUTE FUNCTION public.process_completed_sale();