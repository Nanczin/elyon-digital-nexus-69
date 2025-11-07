-- Reverter as mudanças da migration anterior
DROP TABLE IF EXISTS public.user_roles CASCADE;
DROP FUNCTION IF EXISTS public.has_role(uuid, app_role);
DROP FUNCTION IF EXISTS public.is_admin(uuid);
DROP TYPE IF EXISTS public.app_role CASCADE;