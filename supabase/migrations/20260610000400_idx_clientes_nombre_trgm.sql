-- Habilitar extensión trigram (necesaria para búsqueda por similitud de texto)
-- Verificar en Supabase Dashboard > Database > Extensions antes de aplicar
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Índices GIN para búsqueda case-insensitive por nombre y apellido
CREATE INDEX IF NOT EXISTS idx_clientes_nombre_trgm
  ON clientes USING gin (nombre gin_trgm_ops);

CREATE INDEX IF NOT EXISTS idx_clientes_apellido_trgm
  ON clientes USING gin (apellido gin_trgm_ops);
