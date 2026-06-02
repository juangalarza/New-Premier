-- -----------------------------------------------------------------------------
-- CREATE TABLE: mantenimientos_vehiculo
-- -----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS mantenimientos_vehiculo (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    vehiculo_id UUID NOT NULL REFERENCES vehiculos(id) ON DELETE CASCADE,
    tipo TEXT NOT NULL DEFAULT 'service' CHECK (tipo IN ('service', 'vtv', 'neumaticos', 'frenos', 'aceite', 'otro')),
    descripcion TEXT NOT NULL,
    fecha_programada DATE NOT NULL,
    fecha_realizada DATE,
    km_al_realizar INTEGER,
    km_proximo INTEGER,
    costo NUMERIC(10,2),
    proveedor TEXT,
    observaciones TEXT,
    estado TEXT NOT NULL DEFAULT 'pendiente' CHECK (estado IN ('pendiente', 'en_proceso', 'realizado')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Indexes for common queries
CREATE INDEX IF NOT EXISTS idx_mantenimientos_tenant ON mantenimientos_vehiculo(tenant_id);
CREATE INDEX IF NOT EXISTS idx_mantenimientos_vehiculo ON mantenimientos_vehiculo(vehiculo_id);
CREATE INDEX IF NOT EXISTS idx_mantenimientos_estado ON mantenimientos_vehiculo(estado);
CREATE INDEX IF NOT EXISTS idx_mantenimientos_fecha ON mantenimientos_vehiculo(fecha_programada);

-- Enable RLS
ALTER TABLE mantenimientos_vehiculo ENABLE ROW LEVEL SECURITY;

-- Tenant isolation policies
CREATE POLICY select_tenant_mantenimientos ON mantenimientos_vehiculo
    FOR SELECT TO authenticated
    USING (tenant_id = (auth.jwt()->>'tenant_id')::uuid);

CREATE POLICY insert_tenant_mantenimientos ON mantenimientos_vehiculo
    FOR INSERT TO authenticated
    WITH CHECK (tenant_id = (auth.jwt()->>'tenant_id')::uuid);

CREATE POLICY update_tenant_mantenimientos ON mantenimientos_vehiculo
    FOR UPDATE TO authenticated
    USING (tenant_id = (auth.jwt()->>'tenant_id')::uuid)
    WITH CHECK (tenant_id = (auth.jwt()->>'tenant_id')::uuid);

CREATE POLICY delete_tenant_mantenimientos ON mantenimientos_vehiculo
    FOR DELETE TO authenticated
    USING (tenant_id = (auth.jwt()->>'tenant_id')::uuid);
