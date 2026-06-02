-- -----------------------------------------------------------------------------
-- CREATE TABLE: vehiculos
-- -----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS vehiculos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    patente TEXT NOT NULL,
    marca TEXT NOT NULL,
    modelo TEXT NOT NULL,
    categoria_id UUID NOT NULL REFERENCES categorias(id) ON DELETE RESTRICT,
    color TEXT,
    anio INTEGER NOT NULL,
    km_actual INTEGER NOT NULL DEFAULT 0,
    combustible_actual TEXT NOT NULL DEFAULT 'lleno' CHECK (combustible_actual IN ('1/8', '1/4', '1/2', '3/4', 'lleno')),
    estado TEXT NOT NULL DEFAULT 'disponible' CHECK (estado IN ('disponible', 'alquilado', 'taller', 'bloqueado')),
    es_propio BOOLEAN NOT NULL DEFAULT true,
    foto_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    CONSTRAINT unique_tenant_patente UNIQUE (tenant_id, patente)
);

-- Enable RLS
ALTER TABLE vehiculos ENABLE ROW LEVEL SECURITY;

-- Tenant Isolation Policies
CREATE POLICY select_tenant_vehiculos ON vehiculos
    FOR SELECT
    TO authenticated
    USING (tenant_id = (auth.jwt()->>'tenant_id')::uuid);

CREATE POLICY insert_tenant_vehiculos ON vehiculos
    FOR INSERT
    TO authenticated
    WITH CHECK (tenant_id = (auth.jwt()->>'tenant_id')::uuid);

CREATE POLICY update_tenant_vehiculos ON vehiculos
    FOR UPDATE
    TO authenticated
    USING (tenant_id = (auth.jwt()->>'tenant_id')::uuid)
    WITH CHECK (tenant_id = (auth.jwt()->>'tenant_id')::uuid);

CREATE POLICY delete_tenant_vehiculos ON vehiculos
    FOR DELETE
    TO authenticated
    USING (tenant_id = (auth.jwt()->>'tenant_id')::uuid);
