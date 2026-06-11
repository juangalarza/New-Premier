const BASE =
  process.env.NEXT_PUBLIC_URL ??
  (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000');

const SILUETA_FILES: Record<string, string> = {
  sedan:    `${BASE}/siluetas/Sedan.png`,
  suv:      `${BASE}/siluetas/SUV.png`,
  pickup:   `${BASE}/siluetas/Pickup.png`,
  compacto: `${BASE}/siluetas/Compacto.png`,
};

// Aliases para nombres de categoría que pueden variar en la DB
const ALIASES: Record<string, string> = {
  sedan:      'sedan',
  sedán:      'sedan',
  suv:        'suv',
  pickup:     'pickup',
  camioneta:  'pickup',
  camionetas: 'pickup',
  compacto:   'compacto',
  compacta:   'compacto',
  hatchback:  'compacto',
};

function normalize(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/\s+/g, '');
}

/** Devuelve la URL absoluta de la silueta para una categoría, o null si no hay match. */
export function getSilueta(nombre?: string | null): string | null {
  if (!nombre) return null;
  const key = ALIASES[normalize(nombre)];
  return key ? (SILUETA_FILES[key] ?? null) : null;
}
