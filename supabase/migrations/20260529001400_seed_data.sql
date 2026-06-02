-- -----------------------------------------------------------------------------
-- SEED DATA: Baseline Initialization for RentaCore Demo
-- -----------------------------------------------------------------------------

-- 1. Insert Default Tenant
-- Using a fixed demo UUID for consistent local development and testing
INSERT INTO tenants (id, nombre, logo_url, descuento_online_pct)
VALUES (
    'd2ae42ca-c6db-4319-9e9d-df969231726b', 
    'Finda Car Rental Argentina', 
    'https://raw.githubusercontent.com/glideapps/glide-and-sheets/master/car-rental-logo.png', 
    20.0
)
ON CONFLICT (id) DO NOTHING;

-- 2. Insert Core Vehicle Categories
INSERT INTO categorias (id, tenant_id, nombre, descripcion)
VALUES 
    (
        '10000000-0000-0000-0000-000000000001', 
        'd2ae42ca-c6db-4319-9e9d-df969231726b', 
        'Económico', 
        'Sedanes y Hatchbacks compactos ideales para ciudad. Consumo extremadamente bajo.'
    ),
    (
        '10000000-0000-0000-0000-000000000002', 
        'd2ae42ca-c6db-4319-9e9d-df969231726b', 
        'SUV / Camionetas', 
        'Vehículos familiares de gran comodidad y aptos para todo tipo de terrenos.'
    ),
    (
        '10000000-0000-0000-0000-000000000003', 
        'd2ae42ca-c6db-4319-9e9d-df969231726b', 
        'Ejecutivo', 
        'Sedanes medianos premium de alta gama. Máximo confort, tecnología y seguridad.'
    )
ON CONFLICT (id) DO NOTHING;

-- 3. Insert Baseline Fleet (3 Vehicles)
INSERT INTO vehiculos (id, tenant_id, patente, marca, modelo, categoria_id, color, anio, km_actual, combustible_actual, estado, es_propio, foto_url)
VALUES
    (
        '20000000-0000-0000-0000-000000000001',
        'd2ae42ca-c6db-4319-9e9d-df969231726b',
        'AF234EE',
        'Fiat',
        'Cronos Precision 1.8 MT',
        '10000000-0000-0000-0000-000000000001',
        'Blanco Alaska',
        2022,
        42500,
        'lleno',
        'disponible',
        true,
        'https://images.unsplash.com/photo-1549399542-7e3f8b79c341?auto=format&fit=crop&q=80&w=600'
    ),
    (
        '20000000-0000-0000-0000-000000000002',
        'd2ae42ca-c6db-4319-9e9d-df969231726b',
        'AG902LL',
        'Jeep',
        'Compass Limited 2.0 AT',
        '10000000-0000-0000-0000-000000000002',
        'Gris Ceniza',
        2023,
        18900,
        '3/4',
        'disponible',
        true,
        'https://images.unsplash.com/photo-1533473359331-0135ef1b58bf?auto=format&fit=crop&q=80&w=600'
    ),
    (
        '20000000-0000-0000-0000-000000000003',
        'd2ae42ca-c6db-4319-9e9d-df969231726b',
        'AE812OO',
        'Toyota',
        'Corolla Seg 1.8 Hybrid CVT',
        '10000000-0000-0000-0000-000000000003',
        'Negro Premium',
        2021,
        65000,
        'lleno',
        'disponible',
        true,
        'https://images.unsplash.com/photo-1590362891991-f776e747a588?auto=format&fit=crop&q=80&w=600'
    )
ON CONFLICT (id) DO NOTHING;

-- 4. Insert Calendar Seasons (Low, Medium, High)
INSERT INTO temporadas (id, tenant_id, nombre, fecha_inicio, fecha_fin)
VALUES
    (
        '30000000-0000-0000-0000-000000000001',
        'd2ae42ca-c6db-4319-9e9d-df969231726b',
        'baja',
        '2026-03-01',
        '2026-06-30'
    ),
    (
        '30000000-0000-0000-0000-000000000002',
        'd2ae42ca-c6db-4319-9e9d-df969231726b',
        'media',
        '2026-07-01',
        '2026-11-30'
    ),
    (
        '30000000-0000-0000-0000-000000000003',
        'd2ae42ca-c6db-4319-9e9d-df969231726b',
        'alta',
        '2026-12-01',
        '2026-12-31'
    )
ON CONFLICT (id) DO NOTHING;

-- 5. Insert Daily Pricing Rates Matrix (Category x Season)
INSERT INTO tarifas (id, tenant_id, categoria_id, temporada_id, precio_por_dia)
VALUES
    -- Económico rates
    ('40000000-0000-0000-0000-000000000001', 'd2ae42ca-c6db-4319-9e9d-df969231726b', '10000000-0000-0000-0000-000000000001', '30000000-0000-0000-0000-000000000001', 25000),
    ('40000000-0000-0000-0000-000000000002', 'd2ae42ca-c6db-4319-9e9d-df969231726b', '10000000-0000-0000-0000-000000000001', '30000000-0000-0000-0000-000000000002', 32000),
    ('40000000-0000-0000-0000-000000000003', 'd2ae42ca-c6db-4319-9e9d-df969231726b', '10000000-0000-0000-0000-000000000001', '30000000-0000-0000-0000-000000000003', 45000),
    
    -- SUV rates
    ('40000000-0000-0000-0000-000000000004', 'd2ae42ca-c6db-4319-9e9d-df969231726b', '10000000-0000-0000-0000-000000000002', '30000000-0000-0000-0000-000000000001', 48000),
    ('40000000-0000-0000-0000-000000000005', 'd2ae42ca-c6db-4319-9e9d-df969231726b', '10000000-0000-0000-0000-000000000002', '30000000-0000-0000-0000-000000000002', 59000),
    ('40000000-0000-0000-0000-000000000006', 'd2ae42ca-c6db-4319-9e9d-df969231726b', '10000000-0000-0000-0000-000000000002', '30000000-0000-0000-0000-000000000003', 75000),
    
    -- Ejecutivo rates
    ('40000000-0000-0000-0000-000000000007', 'd2ae42ca-c6db-4319-9e9d-df969231726b', '10000000-0000-0000-0000-000000000003', '30000000-0000-0000-0000-000000000001', 38000),
    ('40000000-0000-0000-0000-000000000008', 'd2ae42ca-c6db-4319-9e9d-df969231726b', '10000000-0000-0000-0000-000000000003', '30000000-0000-0000-0000-000000000002', 46000),
    ('40000000-0000-0000-0000-000000000009', 'd2ae42ca-c6db-4319-9e9d-df969231726b', '10000000-0000-0000-0000-000000000003', '30000000-0000-0000-0000-000000000003', 62000)
ON CONFLICT (id) DO NOTHING;

-- 6. Insert Insurances (Coberturas)
INSERT INTO coberturas (id, tenant_id, nombre, descripcion, precio_por_dia)
VALUES
    (
        '50000000-0000-0000-0000-000000000001',
        'd2ae42ca-c6db-4319-9e9d-df969231726b',
        'Seguro Terceros Completo',
        'Cubre daños a terceros y responsabilidad civil básica requerida por ley.',
        0
    ),
    (
        '50000000-0000-0000-0000-000000000002',
        'd2ae42ca-c6db-4319-9e9d-df969231726b',
        'Seguro Todo Riesgo con Franquicia',
        'Cobertura total por daños propios, robo e incendios con franquicia reducida de ARS $100.000.',
        4500
    )
ON CONFLICT (id) DO NOTHING;

-- 7. Insert Optional Items (Adicionales)
INSERT INTO adicionales (id, tenant_id, nombre, descripcion, precio_por_dia)
VALUES
    (
        '60000000-0000-0000-0000-000000000001',
        'd2ae42ca-c6db-4319-9e9d-df969231726b',
        'Navegador GPS',
        'Dispositivo de navegación por satélite Garmin pre-cargado con mapas de Argentina.',
        800
    ),
    (
        '60000000-0000-0000-0000-000000000002',
        'd2ae42ca-c6db-4319-9e9d-df969231726b',
        'Silla de Bebé / Booster',
        'Silla de seguridad para infantes homolagada para todas las edades.',
        1200
    )
ON CONFLICT (id) DO NOTHING;

-- 8. Insert Promo Discount Codes
INSERT INTO descuentos (id, tenant_id, codigo, descuento_pct, activo)
VALUES
    (
        '70000000-0000-0000-0000-000000000001',
        'd2ae42ca-c6db-4319-9e9d-df969231726b',
        'PROMO20',
        20.0,
        true
    ),
    (
        '70000000-0000-0000-0000-000000000002',
        'd2ae42ca-c6db-4319-9e9d-df969231726b',
        'BIENVENIDO10',
        10.0,
        true
    )
ON CONFLICT (id) DO NOTHING;

-- 9. Insert Sample Clients (Clientes)
INSERT INTO clientes (id, tenant_id, nombre, apellido, email, telefono, dni_pasaporte, licencia_conducir, ciudad, pais)
VALUES
    (
        '80000000-0000-0000-0000-000000000001',
        'd2ae42ca-c6db-4319-9e9d-df969231726b',
        'Juan',
        'Pérez',
        'juan.perez@example.com',
        '+5491155554321',
        '34555888',
        'A-34555888',
        'Buenos Aires',
        'Argentina'
    ),
    (
        '80000000-0000-0000-0000-000000000002',
        'd2ae42ca-c6db-4319-9e9d-df969231726b',
        'María',
        'González',
        'maria.gonzalez@example.com',
        '+5493415559876',
        '28999333',
        'B-28999333',
        'Rosario',
        'Argentina'
    )
ON CONFLICT (id) DO NOTHING;
