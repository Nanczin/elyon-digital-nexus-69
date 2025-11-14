-- Adicionar política INSERT para member_settings que estava faltando
CREATE POLICY "Owners can insert their member_settings" ON public.member_settings
FOR INSERT TO authenticated
WITH CHECK (member_area_id IN (SELECT id FROM member_areas WHERE user_id = auth.uid()));
