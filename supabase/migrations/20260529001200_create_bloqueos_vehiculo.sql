-- -----------------------------------------------------------------------------
-- CREATE TABLE: bloqueos_vehiculo
-- -----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS bloqueos_vehiculo (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    vehiculo_id UUID NOT NULL REFERENCES vehiculos(id) ON DELETE CASCADE,
    fecha_desde TIMESTAMP WITH TIME ZONE NOT NULL,
    fecha_hasta TIMESTAMP WITH TIME ZONE NOT NULL,
    motivo TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    CONSTRAINT check_bloqueo_dates CHECK (fecha_desde <= fecha_hasta)
);

-- Enable RLS
ALTER TABLE bloqueos_vehiculo ENABLE ROW LEVEL SECURITY;

-- Tenant Isolation Policies
CREATE POLICY select_tenant_bloqueos ON bloqueos_vehiculo
    FOR SELECT
    TO authenticated
    USING (tenant_id = (auth.jwt()->>'tenant_id')::uuid);

CREATE POLICY insert_tenant_bloqueos ON bloqueos_vehiculo
    FOR INSERT
    TO authenticated
    WITH CHECK (tenant_id = (auth.jwt()->>'tenant_id')::uuid);

CREATE POLICY update_tenant_bloqueos ON bloqueos_vehiculo
    FOR UPDATE
    TO authenticated
    USING (tenant_id = (auth.jwt()->>'tenant_id')::uuid)
    WITH CHECK (tenant_id = (auth.jwt()->>'tenant_id')::uuid);

CREATE POLICY delete_tenant_bloqueos ON bloqueos_vehiculo
    FOR DELETE
    TO authenticated
    USING (tenant_id = (auth.jwt()->>'tenant_id')::uuid);
