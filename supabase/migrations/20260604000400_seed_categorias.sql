-- Seed categorías adicionales para Premier Rent A Car
-- Las 3 originales (Económico, SUV/Camionetas, Ejecutivo) ya existen en 20260529001400_seed_data.sql
-- Aquí se agregan las 7 restantes para completar el catálogo de 10

INSERT INTO categorias (tenant_id, nombre, descripcion)
SELECT d.tenant_id, d.nombre, d.descripcion
FROM (VALUES
  ('d2ae42ca-c6db-4319-9e9d-df969231726b', 'Compacto',     'Hatchbacks y sedanes medianos para ciudad y ruta corta'),
  ('d2ae42ca-c6db-4319-9e9d-df969231726b', 'Intermedio',   'Sedanes de tamaño intermedio, mayor confort y maletero'),
  ('d2ae42ca-c6db-4319-9e9d-df969231726b', 'Confort',      'Vehículos de alta gama con tecnología y equipamiento premium'),
  ('d2ae42ca-c6db-4319-9e9d-df969231726b', 'SUV Chico',    'SUVs compactos para uso urbano y caminos de tierra'),
  ('d2ae42ca-c6db-4319-9e9d-df969231726b', 'Pickup',       'Camionetas 4x4 para trabajo, carga y terrenos difíciles'),
  ('d2ae42ca-c6db-4319-9e9d-df969231726b', 'Van / Minivan','Transporte grupal de hasta 8 pasajeros'),
  ('d2ae42ca-c6db-4319-9e9d-df969231726b', 'Deportivo',    'Cupés y convertibles de alto rendimiento')
) AS d(tenant_id, nombre, descripcion)
WHERE NOT EXISTS (
  SELECT 1 FROM categorias c
  WHERE c.tenant_id = d.tenant_id AND c.nombre = d.nombre
);
