-- Check current trigger configuration and fix it
SELECT trigger_name, event_manipulation, action_timing, event_object_table 
FROM information_schema.triggers 
WHERE trigger_name = 'checkout_changes_trigger';

-- Drop the problematic trigger completely
DROP TRIGGER IF EXISTS checkout_changes_trigger ON public.checkouts;

-- Recreate with proper DEFERRED constraint
CREATE TRIGGER checkout_changes_trigger
    AFTER INSERT OR UPDATE OR DELETE ON public.checkouts
    FOR EACH ROW
    EXECUTE FUNCTION public.log_checkout_changes();