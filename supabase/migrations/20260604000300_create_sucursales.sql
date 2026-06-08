-- Tabla sucursales
CREATE TABLE IF NOT EXISTS sucursales (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL,
  nombre TEXT NOT NULL,
  direccion TEXT,
  telefono TEXT,
  email TEXT,
  activa BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_sucursales_tenant_id ON sucursales(tenant_id);

-- FK en vehiculos
ALTER TABLE vehiculos ADD COLUMN IF NOT EXISTS sucursal_id UUID REFERENCES sucursales(id) ON DELETE SET NULL;
