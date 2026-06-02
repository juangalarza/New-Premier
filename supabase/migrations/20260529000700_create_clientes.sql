-- -----------------------------------------------------------------------------
-- CREATE TABLE: clientes
-- -----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS clientes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    nombre TEXT NOT NULL,
    apellido TEXT NOT NULL,
    email TEXT NOT NULL,
    telefono TEXT,
    dni_pasaporte TEXT NOT NULL,
    licencia_conducir TEXT,
    ciudad TEXT,
    pais TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    CONSTRAINT unique_tenant_email UNIQUE (tenant_id, email),
    CONSTRAINT unique_tenant_dni UNIQUE (tenant_id, dni_pasaporte)
);

-- Enable RLS
ALTER TABLE clientes ENABLE ROW LEVEL SECURITY;

-- Tenant Isolation Policies
CREATE POLICY select_tenant_clientes ON clientes
    FOR SELECT
    TO authenticated
    USING (tenant_id = (auth.jwt()->>'tenant_id')::uuid);

CREATE POLICY insert_tenant_clientes ON clientes
    FOR INSERT
    TO authenticated
    WITH CHECK (tenant_id = (auth.jwt()->>'tenant_id')::uuid);

CREATE POLICY update_tenant_clientes ON clientes
    FOR UPDATE
    TO authenticated
    USING (tenant_id = (auth.jwt()->>'tenant_id')::uuid)
    WITH CHECK (tenant_id = (auth.jwt()->>'tenant_id')::uuid);

CREATE POLICY delete_tenant_clientes ON clientes
    FOR DELETE
    TO authenticated
    USING (tenant_id = (auth.jwt()->>'tenant_id')::uuid);
