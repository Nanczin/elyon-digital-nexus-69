-- Create table for checkout history
CREATE TABLE public.checkout_history (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  checkout_id UUID NOT NULL REFERENCES public.checkouts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  action_type TEXT NOT NULL CHECK (action_type IN ('created', 'updated', 'deleted')),
  changes JSONB NOT NULL DEFAULT '{}'::jsonb,
  old_values JSONB,
  new_values JSONB,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.checkout_history ENABLE ROW LEVEL SECURITY;

-- Create policies for checkout history
CREATE POLICY "Admins can view all checkout history" 
ON public.checkout_history 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.user_id = auth.uid() AND profiles.role = 'admin'
  )
);

CREATE POLICY "System can insert checkout history" 
ON public.checkout_history 
FOR INSERT 
WITH CHECK (true);

-- Create index for better performance
CREATE INDEX idx_checkout_history_checkout_id ON public.checkout_history(checkout_id);
CREATE INDEX idx_checkout_history_created_at ON public.checkout_history(created_at DESC);

-- Create function to automatically log checkout changes
CREATE OR REPLACE FUNCTION public.log_checkout_changes()
RETURNS TRIGGER AS $$
BEGIN
  -- For INSERT operations
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.checkout_history (
      checkout_id,
      user_id,
      action_type,
      changes,
      new_values,
      description
    ) VALUES (
      NEW.id,
      auth.uid(),
      'created',
      '{"action": "checkout_created"}'::jsonb,
      to_jsonb(NEW),
      'Checkout criado'
    );
    RETURN NEW;
  END IF;

  -- For UPDATE operations
  IF TG_OP = 'UPDATE' THEN
    DECLARE
      changes_detected JSONB := '{}'::jsonb;
      change_description TEXT := '';
    BEGIN
      -- Detect changes in order_bumps
      IF NEW.order_bumps IS DISTINCT FROM OLD.order_bumps THEN
        changes_detected = changes_detected || '{"order_bumps_changed": true}'::jsonb;
        change_description = change_description || 'Order bumps modificados; ';
      END IF;
      
      -- Detect changes in price
      IF NEW.price IS DISTINCT FROM OLD.price THEN
        changes_detected = changes_detected || '{"price_changed": true}'::jsonb;
        change_description = change_description || 'Preço alterado; ';
      END IF;
      
      -- Detect changes in promotional_price
      IF NEW.promotional_price IS DISTINCT FROM OLD.promotional_price THEN
        changes_detected = changes_detected || '{"promotional_price_changed": true}'::jsonb;
        change_description = change_description || 'Preço promocional alterado; ';
      END IF;
      
      -- Detect changes in form_fields (packages)
      IF NEW.form_fields IS DISTINCT FROM OLD.form_fields THEN
        changes_detected = changes_detected || '{"packages_changed": true}'::jsonb;
        change_description = change_description || 'Pacotes modificados; ';
      END IF;
      
      -- Detect changes in layout
      IF NEW.layout IS DISTINCT FROM OLD.layout THEN
        changes_detected = changes_detected || '{"layout_changed": true}'::jsonb;
        change_description = change_description || 'Layout alterado; ';
      END IF;
      
      -- Only log if there were actual changes
      IF changes_detected != '{}'::jsonb THEN
        INSERT INTO public.checkout_history (
          checkout_id,
          user_id,
          action_type,
          changes,
          old_values,
          new_values,
          description
        ) VALUES (
          NEW.id,
          auth.uid(),
          'updated',
          changes_detected,
          to_jsonb(OLD),
          to_jsonb(NEW),
          TRIM(TRAILING '; ' FROM change_description)
        );
      END IF;
    END;
    
    RETURN NEW;
  END IF;

  -- For DELETE operations
  IF TG_OP = 'DELETE' THEN
    INSERT INTO public.checkout_history (
      checkout_id,
      user_id,
      action_type,
      changes,
      old_values,
      description
    ) VALUES (
      OLD.id,
      auth.uid(),
      'deleted',
      '{"action": "checkout_deleted"}'::jsonb,
      to_jsonb(OLD),
      'Checkout excluído'
    );
    RETURN OLD;
  END IF;

  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for automatic logging
CREATE TRIGGER trigger_log_checkout_changes
  AFTER INSERT OR UPDATE OR DELETE ON public.checkouts
  FOR EACH ROW
  EXECUTE FUNCTION public.log_checkout_changes();