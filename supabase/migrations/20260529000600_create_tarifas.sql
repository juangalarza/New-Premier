-- -----------------------------------------------------------------------------
-- CREATE TABLE: tarifas
-- -----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS tarifas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    categoria_id UUID NOT NULL REFERENCES categorias(id) ON DELETE CASCADE,
    temporada_id UUID NOT NULL REFERENCES temporadas(id) ON DELETE CASCADE,
    precio_por_dia NUMERIC NOT NULL CHECK (precio_por_dia >= 0),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    CONSTRAINT unique_tenant_category_season UNIQUE (tenant_id, categoria_id, temporada_id)
);

-- Enable RLS
ALTER TABLE tarifas ENABLE ROW LEVEL SECURITY;

-- Tenant Isolation Policies
CREATE POLICY select_tenant_tarifas ON tarifas
    FOR SELECT
    TO authenticated
    USING (tenant_id = (auth.jwt()->>'tenant_id')::uuid);

CREATE POLICY insert_tenant_tarifas ON tarifas
    FOR INSERT
    TO authenticated
    WITH CHECK (tenant_id = (auth.jwt()->>'tenant_id')::uuid);

CREATE POLICY update_tenant_tarifas ON tarifas
    FOR UPDATE
    TO authenticated
    USING (tenant_id = (auth.jwt()->>'tenant_id')::uuid)
    WITH CHECK (tenant_id = (auth.jwt()->>'tenant_id')::uuid);

CREATE POLICY delete_tenant_tarifas ON tarifas
    FOR DELETE
    TO authenticated
    USING (tenant_id = (auth.jwt()->>'tenant_id')::uuid);
