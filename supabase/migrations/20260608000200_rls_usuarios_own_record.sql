-- Permite que cada usuario autenticado lea su propio registro en public.usuarios
-- usando auth.uid() como clave, sin depender de tenant_id en el JWT.
CREATE POLICY select_own_usuario ON usuarios
  FOR SELECT
  TO authenticated
  USING (id = auth.uid());
