-- -----------------------------------------------------------------------------
-- CREATE TABLE: descuentos
-- -----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS descuentos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    codigo TEXT NOT NULL,
    descuento_pct NUMERIC NOT NULL CHECK (descuento_pct >= 0 AND descuento_pct <= 100),
    activo BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    CONSTRAINT unique_tenant_discount_code UNIQUE (tenant_id, codigo)
);

-- Enable RLS
ALTER TABLE descuentos ENABLE ROW LEVEL SECURITY;

-- Tenant Isolation Policies
CREATE POLICY select_tenant_descuentos ON descuentos
    FOR SELECT
    TO authenticated
    USING (tenant_id = (auth.jwt()->>'tenant_id')::uuid);

CREATE POLICY insert_tenant_descuentos ON descuentos
    FOR INSERT
    TO authenticated
    WITH CHECK (tenant_id = (auth.jwt()->>'tenant_id')::uuid);

CREATE POLICY update_tenant_descuentos ON descuentos
    FOR UPDATE
    TO authenticated
    USING (tenant_id = (auth.jwt()->>'tenant_id')::uuid)
    WITH CHECK (tenant_id = (auth.jwt()->>'tenant_id')::uuid);

CREATE POLICY delete_tenant_descuentos ON descuentos
    FOR DELETE
    TO authenticated
    USING (tenant_id = (auth.jwt()->>'tenant_id')::uuid);
