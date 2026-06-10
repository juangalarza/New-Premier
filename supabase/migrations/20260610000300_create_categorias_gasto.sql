-- -----------------------------------------------------------------------------
-- CREATE TABLE: categorias_gasto
-- Replaces the hardcoded CHECK constraint on gastos.categoria
-- -----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS categorias_gasto (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  nombre text NOT NULL,
  color text NOT NULL DEFAULT '#64748b',
  activa boolean NOT NULL DEFAULT true,
  created_at timestamptz DEFAULT now() NOT NULL,
  UNIQUE(tenant_id, nombre)
);

ALTER TABLE categorias_gasto ENABLE ROW LEVEL SECURITY;

CREATE POLICY "categorias_gasto_select" ON categorias_gasto
  FOR SELECT TO authenticated
  USING (tenant_id = (auth.jwt()->>'tenant_id')::uuid);

CREATE POLICY "categorias_gasto_insert" ON categorias_gasto
  FOR INSERT TO authenticated
  WITH CHECK (tenant_id = (auth.jwt()->>'tenant_id')::uuid);

CREATE POLICY "categorias_gasto_update" ON categorias_gasto
  FOR UPDATE TO authenticated
  USING (tenant_id = (auth.jwt()->>'tenant_id')::uuid)
  WITH CHECK (tenant_id = (auth.jwt()->>'tenant_id')::uuid);

CREATE POLICY "categorias_gasto_delete" ON categorias_gasto
  FOR DELETE TO authenticated
  USING (tenant_id = (auth.jwt()->>'tenant_id')::uuid);

-- Remove the hardcoded CHECK constraint so categories become dynamic
ALTER TABLE gastos DROP CONSTRAINT IF EXISTS gastos_categoria_check;

-- Seed default categories for the existing tenant
INSERT INTO categorias_gasto (tenant_id, nombre, color)
VALUES
  ('d2ae42ca-c6db-4319-9e9d-df969231726b', 'Combustible', '#f97316'),
  ('d2ae42ca-c6db-4319-9e9d-df969231726b', 'Mantenimiento', '#8b5cf6'),
  ('d2ae42ca-c6db-4319-9e9d-df969231726b', 'Seguro', '#3b82f6'),
  ('d2ae42ca-c6db-4319-9e9d-df969231726b', 'Otros', '#64748b')
ON CONFLICT (tenant_id, nombre) DO NOTHING;
