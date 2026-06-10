-- -----------------------------------------------------------------------------
-- CREATE TABLE: gastos
-- -----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS gastos (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  vehiculo_id uuid REFERENCES vehiculos(id) ON DELETE SET NULL,
  sucursal_id uuid REFERENCES sucursales(id) ON DELETE SET NULL,
  categoria text NOT NULL CHECK (categoria IN ('combustible', 'mantenimiento', 'seguro', 'otros')),
  monto numeric(10,2) NOT NULL CHECK (monto >= 0),
  descripcion text,
  fecha date NOT NULL DEFAULT CURRENT_DATE,
  created_at timestamptz DEFAULT now() NOT NULL
);

ALTER TABLE gastos ENABLE ROW LEVEL SECURITY;

CREATE POLICY select_tenant_gastos ON gastos
  FOR SELECT TO authenticated
  USING (tenant_id = (auth.jwt()->>'tenant_id')::uuid);

CREATE POLICY insert_tenant_gastos ON gastos
  FOR INSERT TO authenticated
  WITH CHECK (tenant_id = (auth.jwt()->>'tenant_id')::uuid);

CREATE POLICY update_tenant_gastos ON gastos
  FOR UPDATE TO authenticated
  USING (tenant_id = (auth.jwt()->>'tenant_id')::uuid)
  WITH CHECK (tenant_id = (auth.jwt()->>'tenant_id')::uuid);

CREATE POLICY delete_tenant_gastos ON gastos
  FOR DELETE TO authenticated
  USING (tenant_id = (auth.jwt()->>'tenant_id')::uuid);
