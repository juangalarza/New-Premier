-- -----------------------------------------------------------------------------
-- CREATE TABLE: pagos
-- -----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS pagos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    reserva_id UUID NOT NULL REFERENCES reservas(id) ON DELETE CASCADE,
    monto NUMERIC NOT NULL CHECK (monto > 0),
    metodo TEXT NOT NULL CHECK (metodo IN ('efectivo', 'transferencia', 'tarjeta', 'mercadopago')),
    referencia TEXT,
    mp_payment_id TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS
ALTER TABLE pagos ENABLE ROW LEVEL SECURITY;

-- Tenant Isolation Policies
CREATE POLICY select_tenant_pagos ON pagos
    FOR SELECT
    TO authenticated
    USING (tenant_id = (auth.jwt()->>'tenant_id')::uuid);

CREATE POLICY insert_tenant_pagos ON pagos
    FOR INSERT
    TO authenticated
    WITH CHECK (tenant_id = (auth.jwt()->>'tenant_id')::uuid);

CREATE POLICY update_tenant_pagos ON pagos
    FOR UPDATE
    TO authenticated
    USING (tenant_id = (auth.jwt()->>'tenant_id')::uuid)
    WITH CHECK (tenant_id = (auth.jwt()->>'tenant_id')::uuid);

CREATE POLICY delete_tenant_pagos ON pagos
    FOR DELETE
    TO authenticated
    USING (tenant_id = (auth.jwt()->>'tenant_id')::uuid);
