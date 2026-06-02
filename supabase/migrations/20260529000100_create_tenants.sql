-- -----------------------------------------------------------------------------
-- CREATE TABLE: tenants
-- -----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS tenants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nombre TEXT NOT NULL,
    logo_url TEXT,
    descuento_online_pct NUMERIC NOT NULL DEFAULT 20.0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS
ALTER TABLE tenants ENABLE ROW LEVEL SECURITY;

-- Create Tenant Isolation Policies
-- Users can only view or update their own tenant
CREATE POLICY select_own_tenant ON tenants
    FOR SELECT
    TO authenticated
    USING (id = (auth.jwt()->>'tenant_id')::uuid);

CREATE POLICY update_own_tenant ON tenants
    FOR UPDATE
    TO authenticated
    USING (id = (auth.jwt()->>'tenant_id')::uuid)
    WITH CHECK (id = (auth.jwt()->>'tenant_id')::uuid);
