-- Add email column to usuarios and use it as a reliable lookup key

ALTER TABLE public.usuarios ADD COLUMN IF NOT EXISTS email TEXT;

-- Backfill email from auth.users
UPDATE public.usuarios u
SET email = au.email
FROM auth.users au
WHERE u.id = au.id AND u.email IS NULL;

-- Unique constraint (after backfill)
ALTER TABLE public.usuarios ADD CONSTRAINT usuarios_email_unique UNIQUE (email);

-- Update trigger to include email
CREATE OR REPLACE FUNCTION public.handle_new_auth_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.usuarios (id, tenant_id, nombre, apellido, email, rol)
  VALUES (
    NEW.id,
    'd2ae42ca-c6db-4319-9e9d-df969231726b',
    COALESCE(NULLIF(NEW.raw_user_meta_data->>'nombre', ''), split_part(NEW.email, '@', 1)),
    COALESCE(NULLIF(NEW.raw_user_meta_data->>'apellido', ''), ''),
    NEW.email,
    'operador'
  )
  ON CONFLICT (id) DO UPDATE SET email = EXCLUDED.email;
  RETURN NEW;
END;
$$;

-- Update RLS: allow authenticated user to read their own record by email
DROP POLICY IF EXISTS select_own_usuario ON usuarios;
CREATE POLICY select_own_usuario ON usuarios
  FOR SELECT
  TO authenticated
  USING (id = auth.uid() OR email = auth.email());
