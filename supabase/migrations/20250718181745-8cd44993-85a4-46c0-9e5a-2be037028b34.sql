-- Fix the trigger timing issue
-- Drop the existing trigger
DROP TRIGGER IF EXISTS checkout_changes_trigger ON public.checkouts;

-- Recreate the trigger to run AFTER operations instead of BEFORE
CREATE TRIGGER checkout_changes_trigger
    AFTER INSERT OR UPDATE OR DELETE ON public.checkouts
    FOR EACH ROW
    EXECUTE FUNCTION public.log_checkout_changes();