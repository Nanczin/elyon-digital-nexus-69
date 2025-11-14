-- Adicionar indices para member_settings se não existirem
CREATE INDEX IF NOT EXISTS member_settings_member_area_id_idx ON public.member_settings(member_area_id);
CREATE INDEX IF NOT EXISTS member_areas_user_id_idx ON public.member_areas(user_id);

-- Verificar/Recrear constraint de unique
ALTER TABLE public.member_settings DROP CONSTRAINT IF EXISTS member_settings_member_area_id_key;
ALTER TABLE public.member_settings ADD CONSTRAINT member_settings_member_area_id_key UNIQUE(member_area_id);
