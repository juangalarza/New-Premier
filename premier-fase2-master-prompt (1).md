# MASTER PROMPT — FASE 2: BUSCADOR DE CLIENTES + CONTRATO PDF
## Proyecto: New-Premier (Premier Rent A Car)
## Repo: https://github.com/juangalarza/New-Premier
## Fecha: 10 de junio de 2026 (rev. 2 — siluetas confirmadas)

---

## CONTEXTO OBLIGATORIO — LEER PRIMERO

Este proyecto ya tiene un `master.md` en la raíz con el stack completo, arquitectura y reglas de desarrollo. **Léelo antes de tocar una línea de código.**

Resumen rápido:
- **Stack:** Next.js 14+ App Router (TypeScript), Material UI v6, Supabase, Vercel
- **UI:** MUI v6 — NO Tailwind, NO shadcn
- **DB:** Supabase con RLS + `tenant_id` en todas las tablas
- **Forms:** React Hook Form + Zod
- **PDF:** `@react-pdf/renderer`
- **Estado global:** Zustand / **Data fetching:** SWR

---

## ADVERTENCIA DEL AGENTE (AGENTS.md)

> "This is NOT the Next.js you know. APIs, conventions, and file structure may differ from your training data. **Read `node_modules/next/dist/docs/` before writing any code.** Heed deprecation notices."

---

## OBJETIVO DE ESTA SESIÓN

Implementar dos requerimientos nuevos solicitados por el cliente:

1. **FASE 2-A** — Cambiar el buscador de clientes en el formulario de reservas: de búsqueda por DNI/Pasaporte a búsqueda por nombre y/o apellido.
2. **FASE 2-B** — Generar el contrato de alquiler en PDF con el diseño del documento físico del cliente, incluyendo las imágenes del vehículo por categoría.

---

## FASE 2-A — BUSCADOR DE CLIENTES POR NOMBRE / APELLIDO

### Contexto

En el formulario de creación/edición de reservas, actualmente el campo de búsqueda de cliente funciona con DNI o pasaporte (match exacto). El cliente solicita que la búsqueda sea por nombre y/o apellido, con autocompletado.

### Especificaciones técnicas

**Componente a modificar:**
Buscar en el código el componente de búsqueda de clientes en el flujo de creación de reservas. Probablemente en:
- `components/admin/ReservaDrawer/` o similar
- `app/(admin)/reservas/nueva/` o el formulario de nueva reserva

**Comportamiento esperado:**
- Input tipo `Autocomplete` de MUI (reemplazar el input actual de DNI)
- El usuario escribe nombre, apellido, o nombre + apellido (en cualquier orden)
- La búsqueda se dispara con **mínimo 2 caracteres** y **debounce de 300ms**
- Los resultados muestran: nombre completo + DNI (como referencia secundaria)
- Al seleccionar un cliente, pre-rellena todos los campos del cliente en el formulario
- Si no hay resultados, mostrar opción "Crear nuevo cliente" que abre un mini-form inline o un Dialog MUI

**Lógica de búsqueda — query Supabase:**
```typescript
// Buscar por nombre, apellido, o combinación de ambos
// Usar ilike para búsqueda case-insensitive
const { data } = await supabase
  .from('clientes')
  .select('id, nombre, apellido, dni, email, telefono')
  .eq('tenant_id', tenantId)
  .or(
    `nombre.ilike.%${query}%,apellido.ilike.%${query}%,nombre_completo.ilike.%${query}%`
  )
  .order('apellido', { ascending: true })
  .limit(10)
```

> Si la tabla `clientes` no tiene columna `nombre_completo`, usar la alternativa:
```typescript
.or(`nombre.ilike.%${query}%,apellido.ilike.%${query}%`)
```

**IMPORTANTE — Índice en Supabase:**
Para que la búsqueda sea performante, crear la siguiente migración:

```sql
-- Migración: 20260610_002_idx_clientes_nombre_apellido.sql
CREATE INDEX IF NOT EXISTS idx_clientes_nombre_trgm
  ON clientes USING gin (nombre gin_trgm_ops);

CREATE INDEX IF NOT EXISTS idx_clientes_apellido_trgm
  ON clientes USING gin (apellido gin_trgm_ops);

-- Habilitar extensión si no está activa (verificar primero)
CREATE EXTENSION IF NOT EXISTS pg_trgm;
```

> Verificar si la extensión `pg_trgm` ya está habilitada en el proyecto Supabase antes de ejecutar. En el dashboard de Supabase: Database → Extensions.

**Implementación del debounce:**
```typescript
// hook reutilizable: hooks/useDebounce.ts
import { useState, useEffect } from 'react'

export function useDebounce<T>(value: T, delay: number = 300): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value)

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedValue(value), delay)
    return () => clearTimeout(timer)
  }, [value, delay])

  return debouncedValue
}
```

```typescript
// Uso en el componente
const [inputValue, setInputValue] = useState('')
const debouncedQuery = useDebounce(inputValue, 300)

// Solo ejecutar la búsqueda si hay al menos 2 caracteres
const shouldSearch = debouncedQuery.trim().length >= 2

const { data: clientes, isLoading } = useSWR(
  shouldSearch ? ['clientes-search', debouncedQuery, tenantId] : null,
  () => buscarClientesPorNombre(debouncedQuery, tenantId)
)
```

**Render de cada opción en el Autocomplete:**
```tsx
renderOption={(props, option) => (
  <li {...props} key={option.id}>
    <Box>
      <Typography variant="body2" fontWeight={600}>
        {option.apellido}, {option.nombre}
      </Typography>
      <Typography variant="caption" color="text.secondary">
        DNI: {option.dni}
      </Typography>
    </Box>
  </li>
)}
```

**Placeholder del input:**
```
"Buscar por nombre o apellido..."
```

**Estado sin resultados (mínimo 2 caracteres escritos, búsqueda completada, 0 resultados):**
```tsx
noOptionsText={
  inputValue.length < 2
    ? 'Escribí al menos 2 caracteres'
    : 'No se encontró ningún cliente — ¿Crear nuevo?'
}
```

### Validaciones
- Mantener la búsqueda por DNI disponible: si el string ingresado es numérico y tiene 7 u 8 dígitos, agregar también `.or('dni.eq.' + query)` a la query para que encuentre por DNI sin que el usuario tenga que cambiar de campo.
- El campo no es de libre escritura al final — debe seleccionarse un cliente del listado (o crearse uno nuevo). Usar `freeSolo: false` en el Autocomplete.

---

## FASE 2-B — GENERACIÓN DE CONTRATO EN PDF

### Contexto

El cliente usa un contrato físico impreso. Necesitamos generarlo desde el sistema para que al confirmar una reserva se pueda imprimir o descargar. El contrato tiene un diseño específico que hay que reproducir fielmente.

### Diseño del contrato (basado en el documento físico)

El contrato tiene **dos columnas** en la parte superior y un bloque de condiciones al pie. El layout exacto es:

```
┌─────────────────────────────────────────────────────────────────┐
│  PREMIER RENT A CAR  [logo si existe]     Contrato de alquiler #│
│  DATOS DEL CLIENTE (col izq)    │  INFORMACION DEL ALQUILER (col der) │
│  DATOS TARJETA CRÉDITO (col izq)│  DATOS DEL VEHICULO (col der)       │
│                                 │  [IMÁGENES DEL AUTO - 3 vistas]     │
│                                 │  FRANQUICIA POR SINIESTRO...        │
│                                 │  OBSERVACIONES                      │
├─────────────────────────────────────────────────────────────────┤
│  INFORMACION DE TARIFA (tabla)                                  │
├─────────────────────────────────────────────────────────────────┤
│  Valores aprox. reparaciones/repuestos (tabla de referencia)    │
├─────────────────────────────────────────────────────────────────┤
│  Cláusula garantía tarjeta (col izq) │ Firma del cliente (col der) │
│  Texto desbloqueo tarjeta / fumadores│                             │
│  LLAMADAS/WHATSAPP: 2645192219       │                             │
└─────────────────────────────────────────────────────────────────┘
```

### Campos a completar desde la reserva

**Encabezado:**
- `numero` de reserva → "Contrato de alquiler #[numero]"

**Datos del cliente:**
- `nombre`, `apellido`, `dni`, `fecha_nacimiento`, `telefono`
- `conductor` (puede ser el mismo u otro — verificar si existe en el modelo de datos)

**Datos tarjeta de crédito:**
- `tarjeta_numero`, `tarjeta_vencimiento`, `tarjeta_cod_seg`
- ⚠️ Estos datos son sensibles. Verificar si se almacenan en Supabase o si se dejan en blanco para completar a mano. Si no se guardan (por seguridad), dejar el campo vacío con la línea punteada visible.

**Información del alquiler:**
- `fecha_entrega` (formato DD/MM/YYYY), `hora_entrega`
- `fecha_devolucion` (formato DD/MM/YYYY), `hora_devolucion`
- `lugar_entrega`, `lugar_devolucion`

**Datos del vehículo:**
- `categoria`, `patente`, `modelo`
- `km_inicial`, `km_final` (al generar la reserva, `km_final` puede quedar vacío)
- `km_diario` (de la tarifa), `km_total` (km_diario × días), `precio_km_extra`
- `combustible_entrega` (valor fraccionario: X/8, X/10, X/12 — renderizar con la opción correcta marcada visualmente)
- `comb_faltante` (precio)

**Imágenes del vehículo (REQUERIMIENTO CRÍTICO):**

El contrato físico tiene 3 dibujos/siluetas del auto (vista frontal, lateral y trasera o 3/4). En el PDF digital estas imágenes deben aparecer debajo de la línea "FRANQUICIA ROBO/VUELCO $8.000.000".

**✅ Assets ya disponibles en el repositorio — carpeta `public/siluetas/`:**

| Archivo | Categoría en el sistema |
|---|---|
| `public/siluetas/sedan.png` | Mediano |
| `public/siluetas/pickup.png` | Camioneta |
| `public/siluetas/suv.png` | SUV |
| `public/siluetas/compacto.png` | Compacto |

No hay imagen para "Automático" — usar `sedan.png` como fallback para esa categoría.

Implementación:
1. Las imágenes **ya existen**, no hay que crearlas ni buscarlas.
2. En el componente PDF, seleccionar la imagen según la `categoria` del vehículo usando el mapeo de la tabla anterior.
3. Las imágenes se muestran en una **fila horizontal de 3** (la misma imagen repetida 3 veces, simulando las 3 vistas del contrato físico).
4. Tamaño sugerido por imagen: 70px de alto, `objectFit: 'contain'`, con espacio uniforme entre ellas.

**Información de tarifa:**

Tabla con filas:
| Concepto | Precio unitario | Subtotal |
|---|---|---|
| X días - Valor diario | $[precio_por_dia] | $[subtotal] |
| X km contratado | $[precio_km] | $[subtotal] |
| Horas extras | $10.000 | $[si aplica] |
| Conductor adicional | | $[si aplica] |
| Entrega aeropuerto | | $[si aplica] |
| Devolución aeropuerto | | $[si aplica] |
| Entrega/Devolución F/H | | $[si aplica] |
| Silla bebé/Booster | | $[si aplica] |
| Otros | | $[si aplica] |
| **TOTAL** | | **$[total]** |
| Anticipo | | $[anticipo] |
| **Saldo pendiente** | | **$[saldo]** |

Solo renderizar filas que tengan valor > 0. Las filas con valor 0 o null no deben mostrarse para mantener el contrato limpio.

**Tabla de valores de reparaciones (texto fijo, al pie):**
```
Paño chapa $160.000 | Parabrisa $200.000/$450.000 | Llanta $80.000/$700.000 | Cerradura $180.000 | Copia llave $200.000
Paño pintura $180.000 | Óptica/faro $90.000/$450.000 | Cubierta $200.000/$600.000 | Limpieza tapizado $150.000 | Lustrado/pulido $200.000
```
> Estos valores son fijos en el contrato físico. Considerar si deben venir de configuración del sistema o hardcodeados en el template. Por ahora: hardcodeados, con un `TODO` para hacerlos configurables.

**Bloque de condiciones (texto fijo):**
Reproducir exactamente el texto legal del contrato:
- Cláusula de garantía de tarjeta de crédito
- Texto de desbloqueo 24hs post-devolución
- Prohibición de fumar ($99.000 de multa)
- Número de contacto: 2645192219

**Bloque de firma:**
- Fecha: campo vacío con línea
- Firma: campo vacío con línea
- Aclaración: campo vacío con línea
- DNI: campo vacío con línea

### Implementación técnica

**Archivo a crear:** `emails/ContratoAlquiler.tsx` o `components/admin/pdf/ContratoAlquiler.tsx`

Usar `@react-pdf/renderer` (ya está en el stack según master.md).

```tsx
import { Document, Page, Text, View, Image, StyleSheet } from '@react-pdf/renderer'

const styles = StyleSheet.create({
  page: {
    padding: 24,
    fontSize: 8,
    fontFamily: 'Helvetica',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#000',
    paddingBottom: 4,
  },
  titulo: {
    fontSize: 20,
    fontFamily: 'Helvetica-Bold',
    letterSpacing: 1,
  },
  columnas: {
    flexDirection: 'row',
    gap: 16,
  },
  columna: {
    flex: 1,
  },
  seccionTitulo: {
    fontFamily: 'Helvetica-Bold',
    fontSize: 8,
    textDecoration: 'underline',
    marginBottom: 4,
    marginTop: 8,
    textAlign: 'center',
  },
  campo: {
    flexDirection: 'row',
    marginBottom: 3,
  },
  label: {
    fontFamily: 'Helvetica-Bold',
    width: 90,
  },
  linea: {
    flex: 1,
    borderBottomWidth: 0.5,
    borderBottomColor: '#000',
    marginLeft: 2,
  },
  valor: {
    flex: 1,
    borderBottomWidth: 0.5,
    borderBottomColor: '#000',
    marginLeft: 2,
  },
  imagenesAuto: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 6,
    marginBottom: 6,
  },
  imagenAuto: {
    width: 70,
    height: 45,
    objectFit: 'contain',
  },
  tablaFila: {
    flexDirection: 'row',
    borderBottomWidth: 0.3,
    borderBottomColor: '#ccc',
    paddingVertical: 2,
  },
  tablaConcepto: { flex: 3 },
  tablaPrecio: { flex: 1, textAlign: 'right' },
  tablaTotal: { flex: 1, textAlign: 'right', fontFamily: 'Helvetica-Bold' },
  totalFila: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: '#000',
    paddingTop: 2,
    marginTop: 2,
  },
})
```

**API Route para generar el PDF:**
```typescript
// app/api/reservas/[id]/contrato/route.ts
import { renderToBuffer } from '@react-pdf/renderer'
import { ContratoAlquiler } from '@/components/admin/pdf/ContratoAlquiler'
import { createServerClient } from '@/lib/supabase'

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  const supabase = createServerClient()

  const { data: reserva } = await supabase
    .from('reservas')
    .select(`
      *,
      clientes(*),
      vehiculos(*, categorias(*)),
      adicionales_reserva(*, adicionales(*))
    `)
    .eq('id', params.id)
    .single()

  if (!reserva) {
    return new Response('Reserva no encontrada', { status: 404 })
  }

  const buffer = await renderToBuffer(<ContratoAlquiler reserva={reserva} />)

  return new Response(buffer, {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `inline; filename="contrato-${reserva.numero}.pdf"`,
    },
  })
}
```

**Botón en el ReservaDrawer:**
```tsx
// Agregar en el header del ReservaDrawer junto a los botones existentes
<Tooltip title="Descargar contrato">
  <IconButton
    onClick={() => window.open(`/api/reservas/${reserva.id}/contrato`, '_blank')}
    size="small"
  >
    <PrintIcon />
  </IconButton>
</Tooltip>
```

### Mapeo de siluetas por categoría

```typescript
// lib/siluetasAuto.ts
// Assets ubicados en public/siluetas/ — ya presentes en el repositorio

const BASE_URL = process.env.NEXT_PUBLIC_URL ?? ''

// Mapeo: valor de la columna `categoria` en la DB → archivo de imagen
const SILUETA_MAP: Record<string, string> = {
  compacto:    `${BASE_URL}/siluetas/compacto.png`,
  mediano:     `${BASE_URL}/siluetas/sedan.png`,
  suv:         `${BASE_URL}/siluetas/suv.png`,
  camioneta:   `${BASE_URL}/siluetas/pickup.png`,
  automatico:  `${BASE_URL}/siluetas/sedan.png`,  // fallback: sedan
}

const SILUETA_DEFAULT = `${BASE_URL}/siluetas/sedan.png`

export function getSilueta(categoria: string): string {
  const key = categoria?.toLowerCase().trim().replace(/\s+/g, '') ?? ''
  return SILUETA_MAP[key] ?? SILUETA_DEFAULT
}
```

> ⚠️ **Crítico para producción en Vercel:** `@react-pdf/renderer` no resuelve rutas relativas al filesystem. Las imágenes deben pasarse como **URLs absolutas** (`https://tudominio.vercel.app/siluetas/sedan.png`) o como **strings base64**. Asegurarse de que `NEXT_PUBLIC_URL` esté configurado en las variables de entorno de Vercel con el dominio de producción (ej: `https://new-premier.vercel.app`).

**Uso en el componente PDF — bloque de imágenes:**
```tsx
// Dentro del componente ContratoAlquiler, en la columna derecha
// después de la línea de Franquicia Robo/Vuelco

const silueta = getSilueta(reserva.vehiculos.categorias.nombre)

<View style={styles.imagenesAuto}>
  <Image src={silueta} style={styles.imagenAuto} />
  <Image src={silueta} style={styles.imagenAuto} />
  <Image src={silueta} style={styles.imagenAuto} />
</View>
```

---

## ORDEN DE TRABAJO

1. **FASE 2-A** primero — es más simple y tiene impacto directo en el flujo de trabajo diario del cliente.
   - Crear `hooks/useDebounce.ts`
   - Modificar el componente de búsqueda de clientes
   - Agregar índices trigram en Supabase (migración)
   - Testear con al menos 3 casos: solo nombre, solo apellido, nombre + apellido

2. **FASE 2-B** — Contrato PDF
   - ✅ ~~Conseguir o crear los assets de siluetas~~ — ya están en `public/siluetas/`
   - Crear `lib/siluetasAuto.ts` con el mapeo de categorías
   - Crear `components/admin/pdf/ContratoAlquiler.tsx`
   - Crear `app/api/reservas/[id]/contrato/route.ts`
   - Agregar botón en `ReservaDrawer`
   - Verificar que `NEXT_PUBLIC_URL` esté configurado en Vercel
   - Testear con una reserva real del cliente

---

## CHECKLIST DE CIERRE DE SESIÓN

- [ ] `npm run build` pasa sin errores de TypeScript
- [ ] El buscador no hace requests con menos de 2 caracteres (verificar en Network tab)
- [ ] El debounce funciona correctamente (no disparar por cada tecla)
- [ ] El PDF se genera sin errores y se abre en el navegador
- [ ] Las 3 siluetas del auto aparecen en el PDF según la categoría del vehículo
- [ ] `NEXT_PUBLIC_URL` configurado en variables de entorno de Vercel (requerido para imágenes en PDF)
- [ ] El PDF es fiel al contrato físico en layout y campos
- [ ] Migración de índices trigram creada en `/supabase/migrations/`
- [ ] No hay secrets ni credenciales en el código
- [ ] Commits separados por feature: `feat: buscador clientes por nombre [FASE-2A]` y `feat: generación contrato PDF [FASE-2B]`
