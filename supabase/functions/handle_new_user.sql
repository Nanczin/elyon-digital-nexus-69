CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE PLPGSQL
SECURITY DEFINER
SET search_path TO ''
AS $function$
BEGIN
  -- Atualiza ou insere o perfil na tabela public.profiles
  INSERT INTO public.profiles (user_id, email, name, role, member_area_id, status)
  VALUES (
    new.id,
    new.email,
    COALESCE(new.raw_user_meta_data->>'name', split_part(new.email, '@', 1)),
    CASE
      WHEN NEW.email = 'estevao.v.garcia10@gmail.com' THEN 'admin'
      ELSE 'user'
    END,
    NULLIF(new.raw_user_meta_data->>'member_area_id', '')::uuid, -- Corrigido: Converte string vazia para NULL antes do cast
    COALESCE(new.raw_user_meta_data->>'status', 'active') -- Ler status do metadata, default 'active'
  )
  ON CONFLICT (user_id) DO UPDATE SET
    email = EXCLUDED.email,
    name = EXCLUDED.name,
    role = EXCLUDED.role,
    member_area_id = NULLIF(EXCLUDED.member_area_id, '')::uuid, -- Corrigido: Também no UPDATE
    status = EXCLUDED.status, -- Atualizar também status
    updated_at = NOW();

  -- Atualiza o user_metadata do auth.users para incluir o role e member_area_id
  -- Isso permite que o role e member_area_id sejam acessados diretamente do objeto user no frontend
  UPDATE auth.users
  SET raw_user_meta_data = raw_user_meta_data || jsonb_build_object(
    'role', (SELECT role FROM public.profiles WHERE user_id = new.id),
    'member_area_id', (SELECT member_area_id FROM public.profiles WHERE user_id = new.id)
  )
  WHERE id = new.id;

  RETURN new;
END;
$function$;