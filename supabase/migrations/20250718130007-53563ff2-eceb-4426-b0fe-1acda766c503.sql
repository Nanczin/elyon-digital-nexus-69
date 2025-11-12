-- Fix the trigger timing issue for checkout deletion
DROP TRIGGER IF EXISTS trigger_log_checkout_changes ON public.checkouts;

-- Recreate the trigger to execute BEFORE operations instead of AFTER
CREATE TRIGGER trigger_log_checkout_changes
  BEFORE INSERT OR UPDATE OR DELETE ON public.checkouts
  FOR EACH ROW
  EXECUTE FUNCTION public.log_checkout_changes();