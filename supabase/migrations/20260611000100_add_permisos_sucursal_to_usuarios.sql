-- Add sucursal restriction and module permissions to usuarios table
ALTER TABLE usuarios
  ADD COLUMN IF NOT EXISTS sucursal_id UUID REFERENCES sucursales(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS permisos TEXT[];

-- permisos NULL means full access (admin behavior)
-- permisos TEXT[] means only those module keys are accessible

CREATE INDEX IF NOT EXISTS idx_usuarios_sucursal_id ON usuarios(sucursal_id)
  WHERE sucursal_id IS NOT NULL;
