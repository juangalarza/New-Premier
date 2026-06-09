-- -----------------------------------------------------------------------------
-- Auto-sync auth.users → public.usuarios
-- Ensures every Supabase Auth user gets a record in public.usuarios.
-- New users land as 'operador' by default; role can be promoted from the UI.
-- -----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.handle_new_auth_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.usuarios (id, tenant_id, nombre, apellido, rol)
  VALUES (
    NEW.id,
    'd2ae42ca-c6db-4319-9e9d-df969231726b',
    COALESCE(NULLIF(NEW.raw_user_meta_data->>'nombre', ''), split_part(NEW.email, '@', 1)),
    COALESCE(NULLIF(NEW.raw_user_meta_data->>'apellido', ''), ''),
    'operador'
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_auth_user();

-- Backfill: insert any existing auth users that have no usuarios record
INSERT INTO public.usuarios (id, tenant_id, nombre, apellido, rol)
SELECT
  u.id,
  'd2ae42ca-c6db-4319-9e9d-df969231726b',
  COALESCE(NULLIF(u.raw_user_meta_data->>'nombre', ''), split_part(u.email, '@', 1)),
  COALESCE(NULLIF(u.raw_user_meta_data->>'apellido', ''), ''),
  'operador'
FROM auth.users u
WHERE NOT EXISTS (
  SELECT 1 FROM public.usuarios p WHERE p.id = u.id
)
ON CONFLICT (id) DO NOTHING;
