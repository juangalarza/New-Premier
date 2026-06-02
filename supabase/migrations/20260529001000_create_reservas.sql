-- -----------------------------------------------------------------------------
-- CREATE TABLE: reservas
-- -----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS reservas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    numero TEXT NOT NULL,
    id_corto TEXT NOT NULL,
    vehiculo_id UUID REFERENCES vehiculos(id) ON DELETE SET NULL,
    cliente_id UUID NOT NULL REFERENCES clientes(id) ON DELETE RESTRICT,
    fecha_entrega TIMESTAMP WITH TIME ZONE NOT NULL,
    fecha_devolucion TIMESTAMP WITH TIME ZONE NOT NULL,
    lugar_entrega TEXT NOT NULL,
    lugar_devolucion TEXT NOT NULL,
    numero_vuelo TEXT,
    codigo_descuento TEXT,
    precio_base NUMERIC NOT NULL CHECK (precio_base >= 0),
    descuento_aplicado NUMERIC NOT NULL DEFAULT 0.0 CHECK (descuento_aplicado >= 0),
    precio_coberturas NUMERIC NOT NULL DEFAULT 0.0 CHECK (precio_coberturas >= 0),
    precio_adicionales NUMERIC NOT NULL DEFAULT 0.0 CHECK (precio_adicionales >= 0),
    precio_total NUMERIC NOT NULL CHECK (precio_total >= 0),
    total_pagado NUMERIC NOT NULL DEFAULT 0.0 CHECK (total_pagado >= 0),
    estado TEXT NOT NULL DEFAULT 'preventa' CHECK (estado IN ('preventa', 'pendiente', 'confirmada', 'en_curso', 'devuelta', 'cancelada')),
    km_entrega INTEGER,
    km_devolucion INTEGER,
    combustible_entrega TEXT CHECK (combustible_entrega IN ('1/8', '1/4', '1/2', '3/4', 'lleno')),
    combustible_devolucion TEXT CHECK (combustible_devolucion IN ('1/8', '1/4', '1/2', '3/4', 'lleno')),
    factura_cae TEXT,
    factura_vto DATE,
    observaciones TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    CONSTRAINT unique_tenant_reserva_numero UNIQUE (tenant_id, numero),
    CONSTRAINT check_reserva_dates CHECK (fecha_entrega <= fecha_devolucion)
);

-- Enable RLS
ALTER TABLE reservas ENABLE ROW LEVEL SECURITY;

-- Tenant Isolation Policies
CREATE POLICY select_tenant_reservas ON reservas
    FOR SELECT
    TO authenticated
    USING (tenant_id = (auth.jwt()->>'tenant_id')::uuid);

CREATE POLICY insert_tenant_reservas ON reservas
    FOR INSERT
    TO authenticated
    WITH CHECK (tenant_id = (auth.jwt()->>'tenant_id')::uuid);

CREATE POLICY update_tenant_reservas ON reservas
    FOR UPDATE
    TO authenticated
    USING (tenant_id = (auth.jwt()->>'tenant_id')::uuid)
    WITH CHECK (tenant_id = (auth.jwt()->>'tenant_id')::uuid);

CREATE POLICY delete_tenant_reservas ON reservas
    FOR DELETE
    TO authenticated
    USING (tenant_id = (auth.jwt()->>'tenant_id')::uuid);
