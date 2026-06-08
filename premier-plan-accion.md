# PLAN DE ACCIÓN — NEW-PREMIER
## Sistema de Gestión Rent-a-Car · Análisis de Repositorio + Fases de Desarrollo
*Finda Digital · Juan Galarza · Junio 2026*

---

## ANÁLISIS DEL ESTADO ACTUAL DEL REPOSITORIO

**Stack confirmado:** Next.js 14 App Router + TypeScript strict + MUI v6 + Supabase + Resend + SheetJS

### Bugs y gaps detectados

| # | Problema | Archivo | Diagnóstico |
|---|----------|---------|-------------|
| 1 | Precio base no se guarda correctamente multiplicado × días | `ReservasClient.tsx` | `calcularCotizacion` retorna el valor correcto, pero el campo `precio_base` es editable y se puede guardar sin haber cotizado. No hay validación de que `precio_base >= dias × tarifa` |
| 2 | `window.print()` imprime el drawer completo como captura | `ReservaDrawer.tsx` | Se necesita generar PDF con react-pdf |
| 3 | Clientes sin `fecha_nacimiento` ni `direccion` | `types/index.ts` + migración | Faltan columnas en la tabla |
| 4 | Devolución no muestra resumen de KMs | `ReservaDrawer.tsx` | Dialog simple sin cálculo de excedente |
| 5 | Validación de solapamiento solo considera `confirmada/en_curso` | `actions.ts` | Falta estado `pendiente` |
| 6 | Búsqueda cliente en nueva reserva es por select dropdown | `ReservasClient.tsx` | Debe ser por DNI con autocomplete dinámico |
| 7 | No existe módulo `/sucursales` | — | Crear desde cero |
| 8 | Categorías no tienen los 10 tipos del cliente | migración | Seed pendiente |
| 9 | No hay contrato imprimible | — | Crear `ContratoPDF.tsx` |
| 10 | Reportes sin flujo de caja ni exportación por filtros | `ReportesClient.tsx` | Agregar tabs y acciones |
| 11 | Mantenimiento sin alertas ni notificaciones por intervalo | `MantenimientoClient.tsx` | Agregar lógica y cron |

---

## FASES DEL PLAN DE ACCIÓN

---

### FASE 1 — Fix: precio base, solapamiento y flujo de reserva
**Impacto:** Crítico · **Estimado:** 2–3 hs

**1.1 — Precio base × días**
El bug real no está en `calcularCotizacion` (ya multiplica bien) sino en que el operador puede crear una reserva sin haber cotizado, dejando `precio_base` en 0 o en un valor incorrecto. El fix tiene dos partes:
- Agregar validación Zod: `precio_base: z.coerce.number().min(1, 'Cotizá el precio antes de continuar')`
- Mostrar en el form, debajo del campo precio, el cálculo explícito: *"$40.000/día × 30 días = $1.200.000"* usando los watchers de fechas y categoría.

**1.2 — Solapamiento incluye estado `pendiente`**
En `getVehiculosDisponibles`, cambiar:
```typescript
.in('estado', ['confirmada', 'en_curso'])
// por:
.in('estado', ['pendiente', 'confirmada', 'en_curso'])
```

**1.3 — Validación en `crearReserva` antes del INSERT**
Si llega `vehiculo_id`, verificar que ese vehículo esté en los disponibles para esas fechas. Si no, lanzar error con mensaje claro.

---

### FASE 2 — Datos de clientes ampliados
**Impacto:** Alto · **Estimado:** 1–2 hs

**Migración:**
```sql
ALTER TABLE clientes
  ADD COLUMN IF NOT EXISTS fecha_nacimiento DATE,
  ADD COLUMN IF NOT EXISTS direccion TEXT;
```

**Cambios en código:**
- `types/index.ts` → agregar `fecha_nacimiento: string | null` y `direccion: string | null` al interface `Cliente`
- `ClientesClient.tsx` → agregar campos al form (fecha_nacimiento tipo date, direccion texto)
- `clientes/actions.ts` → incluir en INSERT y UPDATE

---

### FASE 3 — Búsqueda de cliente por DNI/Pasaporte
**Impacto:** Alto · **Estimado:** 2–3 hs

Reemplazar el `<TextField select>` de cliente en el Dialog de nueva reserva por:

1. Input de texto libre con label "DNI / Pasaporte"
2. Al tipear 5+ caracteres, llamar `buscarClientesPorDNI(dni)` con debounce 300ms
3. Mostrar dropdown con resultados: *"García, Juan · DNI 12345678"*
4. Al seleccionar, guardar `cliente_id` en RHF y colapsar el dropdown
5. Si no hay resultados: botón inline **"+ Crear nuevo cliente"** que abre un mini-Dialog con los campos mínimos, y al guardar lo selecciona automáticamente

**Nuevo Server Action:**
```typescript
export async function buscarClientesPorDNI(dni: string) {
  if (dni.length < 5) return [];
  const supabase = createAdminClient();
  const { data } = await supabase
    .from('clientes')
    .select('id, nombre, apellido, dni_pasaporte, email, telefono, licencia_conducir')
    .eq('tenant_id', TENANT_ID)
    .ilike('dni_pasaporte', `%${dni}%`)
    .limit(6);
  return data ?? [];
}
```

---

### FASE 4 — Datos completos del cliente en el drawer
**Impacto:** Alto · **Estimado:** 1 hs

Actualizar `getReserva` / `getReservas` para incluir todos los campos del cliente en el select de Supabase. Actualizar `ReservaConRelaciones` para exponer: `telefono`, `dni_pasaporte`, `licencia_conducir`, `fecha_nacimiento`.

En la sección "Cliente" del `ReservaDrawer`, mostrar con `<DataRow>`:
- Nombre y Apellido (ya existe)
- Fecha de nacimiento
- Email (ya existe)
- Teléfono
- DNI / Pasaporte
- Número de licencia

---

### FASE 5 — PDF Invoice + Contrato imprimible
**Impacto:** Alto · **Estimado:** 5–6 hs

#### Campos mapeados del contrato Premier Rent A Car

| Sección | Campo en contrato | Fuente en la DB |
|---------|-------------------|-----------------|
| Header | Contrato de alquiler #... | `reserva.numero` |
| Datos del cliente | Nombre | `cliente.nombre` |
| | Apellido | `cliente.apellido` |
| | DNI | `cliente.dni_pasaporte` |
| | Fecha de nacimiento | `cliente.fecha_nacimiento` |
| | Teléfono | `cliente.telefono` |
| | Conductor | `cliente.nombre + apellido` (mismo cliente) |
| Datos tarjeta | Número / Vencimiento / Cod. Seg. | *No se almacena en DB por seguridad — dejar en blanco para completar a mano* |
| Info del alquiler | Fecha de entrega + hora | `reserva.fecha_entrega` |
| | Fecha de devolución + hora | `reserva.fecha_devolucion` |
| | Lugar entrega | `reserva.lugar_entrega` |
| | Lugar devolución | `reserva.lugar_devolucion` |
| Datos del vehículo | Categoría | `vehiculo.categoria.nombre` |
| | Patente | `vehiculo.patente` |
| | Modelo | `vehiculo.modelo` |
| | Km inicial | `reserva.km_entrega` |
| | Km final | `reserva.km_devolucion` (en blanco al entregar) |
| | Km diario | `reserva.km_contratados / dias` |
| | Km total | `reserva.km_contratados` |
| | Km extra $ | tarifa de km extra (de configuración) |
| | Combustible | `reserva.combustible_entrega` |
| Info de tarifa | Días × valor diario | `dias` + `reserva.precio_base / dias` |
| | Km contratado | `reserva.km_contratados` |
| | Horas extras | fijo $10.000 |
| | Conductor adicional | de `reserva.adicionales` si aplica |
| | Entrega aeropuerto | de `reserva.adicionales` si aplica |
| | Devolución aeropuerto | de `reserva.adicionales` si aplica |
| | Entrega/Dev. F/H | de `reserva.adicionales` si aplica |
| | Silla bebé/booster | de `reserva.adicionales` si aplica |
| | Otros | de `reserva.adicionales` (nombre libre) |
| Totales | Total | `reserva.precio_total` |
| | Anticipo | `reserva.total_pagado` |
| | Saldo pendiente | `reserva.precio_total - reserva.total_pagado` |
| Observaciones | Texto libre | `reserva.observaciones` |
| Firma | Fecha / Firma / Aclaración / DNI | *En blanco para completar a mano* |
| Footer valores | Tabla de reparaciones/repuestos | *Fijo — texto hardcodeado* |
| Legales | Textos de condiciones | *Fijo — texto hardcodeado del dorso* |

#### Implementación

**`components/admin/ContratoPDF.tsx`** — replica visualmente el layout del contrato con `@react-pdf/renderer`:
- Layout en dos columnas (izquierda: datos cliente + tarifa; derecha: info alquiler + vehículo) replicando la maqueta
- Logo Premier arriba a la izquierda
- Número de contrato = `reserva.numero`
- Todos los campos mapeados arriba
- Datos de tarjeta: líneas vacías (se completan a mano)
- Firma y fecha: líneas vacías
- Tabla de valores de reparaciones en footer (fijo)
- Página 2: texto legal del dorso (fijo, hardcodeado)

**`components/admin/ReservaPDF.tsx`** — invoice interno simplificado (para uso interno/cliente digital):
- Sin los datos de tarjeta de crédito
- Logo + número de reserva + fecha de emisión
- Todos los datos del cliente y vehículo
- Desglose de precios legible

**En `ReservaDrawer.tsx`:**
- Reemplazar `window.print()` por descarga del PDF invoice (`reserva-{id_corto}.pdf`)
- Agregar botón **"Contrato"** (ícono `ArticleOutlined`) que descarga `contrato-{id_corto}.pdf`
- Lógica de flujo de entrega:
  ```
  const [contratoImpreso, setContratoImpreso] = React.useState(false)
  ```
  El botón **"Entregar"** se muestra siempre pero si `!contratoImpreso`, muestra tooltip *"Generá el contrato primero"* y está deshabilitado. Al hacer click en "Contrato" se setea `contratoImpreso = true` y se habilita "Entregar".

---

### FASE 6 — Devolución con resumen de kilómetros
**Impacto:** Alto · **Estimado:** 2–3 hs

**Migración:**
```sql
ALTER TABLE reservas
  ADD COLUMN IF NOT EXISTS km_contratados INTEGER DEFAULT 0;
```

**En el form de nueva reserva:** agregar campo `km_contratados` (número entero, km incluidos en el contrato).

**Dialog de devolución actualizado** — mostrar tabla de resumen antes de confirmar:

| Campo | Valor |
|-------|-------|
| Km inicial (entrega) | `reserva.km_entrega` — read only |
| Km final (devolución) | input editable |
| Km recorridos | calculado: km_final − km_inicial |
| Km contratados | `reserva.km_contratados` — editable en este paso |
| Km adicionales | `max(0, recorridos − contratados)` |
| Costo km adicional | tarifa extra × km adicionales (si aplica) |

Si `km_adicionales > 0`: mostrar Alert warning con el excedente.

---

### FASE 7 — Sucursales
**Impacto:** Medio-Alto · **Estimado:** 4–5 hs

**Migración:**
```sql
CREATE TABLE IF NOT EXISTS sucursales (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  nombre TEXT NOT NULL,
  direccion TEXT,
  telefono TEXT,
  activa BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

ALTER TABLE vehiculos
  ADD COLUMN IF NOT EXISTS sucursal_id UUID REFERENCES sucursales(id) ON DELETE SET NULL;

ALTER TABLE sucursales ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_sucursales ON sucursales
  FOR ALL TO authenticated
  USING (tenant_id = (auth.jwt()->>'tenant_id')::uuid)
  WITH CHECK (tenant_id = (auth.jwt()->>'tenant_id')::uuid);
```

**Cambios:**
- Nuevo módulo `/dashboard/sucursales/` — CRUD completo (misma estructura que Clientes)
- `Sidebar.tsx`: agregar ítem "Sucursales" con `StorefrontOutlined` después de "Vehículos"
- `VehiculosClient.tsx`: agregar select de sucursal en form de alta/edición
- Filtro por sucursal en listado de vehículos y en calendario Gantt

---

### FASE 8 — Categorías predefinidas (seed)
**Impacto:** Medio · **Estimado:** 30 min

**Migración seed:**
```sql
INSERT INTO categorias (tenant_id, nombre)
SELECT (SELECT id FROM tenants LIMIT 1), unnest(ARRAY[
  'Compactos', 'Compactos AT Premium', 'Medianos',
  'SUV MT', 'SUV AT Compacto', 'SUV AT',
  'Pickup 4x4 MT', 'Pickup 4x4 AT',
  'Pickup 4x2 MT', 'Pickup 4x2 AT'
])
WHERE NOT EXISTS (
  SELECT 1 FROM categorias WHERE tenant_id = (SELECT id FROM tenants LIMIT 1)
);
```

---

### FASE 9 — Reportes ampliados con exportación
**Impacto:** Medio · **Estimado:** 5–6 hs

**Nuevos Server Actions en `reportes/actions.ts`:**
- `getFlujoCajaDiario(fecha)` — pagos del día agrupados por método
- `getFlujoCajaMensual(mes, año)` — ingresos/egresos por día del mes
- `getReporteVehiculo(vehiculoId, año)` — días alquilados + facturación
- `getReporteSucursal(sucursalId, mes, año)` — idem por sucursal
- `getReportePropietario(mes, año)` — comparativo propio vs no propio

**En `ReportesClient.tsx`:**
- Tabs MUI: "Resumen" | "Flujo de Caja" | "Por Vehículo" | "Por Sucursal"
- Cada tab: botón **"PDF"** (react-pdf) + botón **"Excel"** (SheetJS) con los filtros aplicados
- Filtros disponibles: mensual, anual, por vehículo, por sucursal, por propietario

---

### FASE 10 — Mantenimiento: alertas y notificaciones
**Impacto:** Medio · **Estimado:** 3–4 hs

**Migración:**
```sql
ALTER TABLE mantenimientos
  ADD COLUMN IF NOT EXISTS intervalo_km INTEGER,
  ADD COLUMN IF NOT EXISTS notificacion_enviada BOOLEAN DEFAULT false;
```

**Lógica de alertas:**
- Server Action `getMantenimientosProximos()`: mantenimientos con `km_proximo ≤ vehiculo.km_actual + 500` o `fecha_programada ≤ hoy + 7 días`
- `dashboard/page.tsx`: mostrar Alert MUI `warning` si hay mantenimientos próximos
- `MantenimientoClient.tsx`: Snackbar/Toast al montar si hay items próximos
- API route `/api/mantenimiento/notificar`: envío diario por Resend + marcar `notificacion_enviada = true`
- `vercel.json` con cron: `"0 8 * * *"` → `/api/mantenimiento/notificar`

---

## PROMPT MAESTRO PARA CLAUDE CODE / ANTIGRAVITY

Copiar completo al inicio de cada sesión. Reemplazar `[FASE N]` con la fase a ejecutar.

---

```
# SISTEMA: NEW-PREMIER — RENT-A-CAR MANAGEMENT
# Repo: https://github.com/juangalarza/New-Premier
# Stack: Next.js 14 + TypeScript strict + MUI v6 + Supabase + Resend + react-pdf + SheetJS

## ANTES DE TOCAR CUALQUIER ARCHIVO

1. Leer `master.md` completo en la raíz del proyecto.
2. Leer el/los archivo/s que vas a modificar en su estado actual.
3. Si algo no está claro o puede afectar otro módulo, PREGUNTAR antes de continuar.
4. NO agregar dependencias nuevas sin confirmar. Usar las de package.json.
5. Toda migración SQL va en /supabase/migrations/[TIMESTAMP]_[descripcion].sql
   Formato timestamp: YYYYMMDDHHMMSS
6. Después de cada migración regenerar tipos:
   supabase gen types typescript --local > types/database.types.ts

## REGLAS DE CALIDAD

- TypeScript strict: sin `any` salvo en los cast `as unknown as Tipo` ya existentes
- Server Actions: siempre try/catch con mensajes descriptivos
- Componentes Client: loading states con MUI Skeleton o CircularProgress
- Fechas: UTC en DB, timezone local en UI
- Montos: ARS sin decimales, usar el helper formatARS ya existente
- Patentes: siempre UPPERCASE

## CHECKLIST ANTES DE ENTREGAR CADA FASE

- [ ] Migración SQL creada con timestamp correcto (si aplica)
- [ ] types/index.ts actualizado
- [ ] Server Actions actualizados
- [ ] Componente Client actualizado
- [ ] Sin errores: npx tsc --noEmit
- [ ] Sin errores: npx next lint
- [ ] Build exitoso: npx next build

---

# FASE 1 — Fix precio base × días + validación solapamiento

## Archivos a modificar:
- app/dashboard/reservas/actions.ts
- app/dashboard/reservas/ReservasClient.tsx

## Tarea 1.1 — Mostrar cálculo explícito en el form de nueva reserva

En ReservasClient.tsx, en la sección de precio del Dialog de nueva reserva,
debajo del campo "Precio base", agregar un texto informativo calculado con watchers:

```tsx
const precioUnitario = watch('precio_base');
const dias = fechaEntrega && fechaDevolucion
  ? Math.ceil((new Date(fechaDevolucion).getTime() - new Date(fechaEntrega).getTime()) / 86400000)
  : 0;

// Mostrar debajo del campo precio_base:
{dias > 0 && precioUnitario > 0 && (
  <Typography variant="caption" color="text.secondary">
    ${(precioUnitario / dias).toLocaleString('es-AR')} /día × {dias} días
  </Typography>
)}
```

Agregar validación Zod:
```typescript
precio_base: z.coerce.number().min(1, 'Calculá el precio antes de continuar'),
```

## Tarea 1.2 — Solapamiento incluye estado pendiente

En actions.ts, función getVehiculosDisponibles:
Cambiar .in('estado', ['confirmada', 'en_curso'])
Por     .in('estado', ['pendiente', 'confirmada', 'en_curso'])

## Tarea 1.3 — Validar en crearReserva antes del INSERT

Si llega vehiculo_id en data, llamar internamente a getVehiculosDisponibles
con las fechas de la reserva. Si el vehiculo_id NO está en la lista retornada,
lanzar: throw new Error('El vehículo no está disponible para esas fechas')

---

# FASE 2 — Datos de clientes ampliados

## Archivos a modificar:
- supabase/migrations/[TIMESTAMP]_add_cliente_fields.sql (NUEVO)
- types/index.ts
- app/dashboard/clientes/ClientesClient.tsx
- app/dashboard/clientes/actions.ts

## Migración:
```sql
ALTER TABLE clientes
  ADD COLUMN IF NOT EXISTS fecha_nacimiento DATE,
  ADD COLUMN IF NOT EXISTS direccion TEXT;
```

## types/index.ts — interface Cliente, agregar:
```typescript
fecha_nacimiento: string | null;
direccion: string | null;
```

## ClientesClient.tsx — schema Zod, agregar:
```typescript
fecha_nacimiento: z.string().optional().default(''),
direccion: z.string().optional().default(''),
```

Agregar dos campos Grid en el form:
- fecha_nacimiento: TextField type="date" label="Fecha de nacimiento"
  slotProps={{ inputLabel: { shrink: true } }}
- direccion: TextField label="Dirección" fullWidth

En abrirEditar: incluir fecha_nacimiento y direccion en el reset().
fecha_nacimiento viene de DB como 'YYYY-MM-DD', usarlo directo en el input type date.

## actions.ts — incluir en INSERT y UPDATE:
fecha_nacimiento: data.fecha_nacimiento || null,
direccion: data.direccion || null,

---

# FASE 3 — Búsqueda de cliente por DNI/Pasaporte

## Archivos a modificar:
- app/dashboard/reservas/actions.ts
- app/dashboard/reservas/ReservasClient.tsx

## Nuevo Server Action en actions.ts:
```typescript
export async function buscarClientesPorDNI(
  dni: string
): Promise<{ id: string; nombre: string; apellido: string; dni_pasaporte: string; email: string }[]> {
  if (dni.length < 5) return [];
  const supabase = createAdminClient();
  const { data } = await supabase
    .from('clientes')
    .select('id, nombre, apellido, dni_pasaporte, email')
    .eq('tenant_id', TENANT_ID)
    .ilike('dni_pasaporte', `%${dni}%`)
    .limit(6);
  return (data ?? []) as any;
}
```

## ReservasClient.tsx — reemplazar campo cliente_id:

Estado nuevo:
```typescript
const [dniInput, setDniInput] = React.useState('');
const [clientesBuscados, setClientesBuscados] = React.useState<...[]>([]);
const [clienteSeleccionado, setClienteSeleccionado] = React.useState<...| null>(null);
const [buscando, setBuscando] = React.useState(false);
const [miniDialogOpen, setMiniDialogOpen] = React.useState(false);
```

Lógica de búsqueda con debounce (useEffect con setTimeout 300ms sobre dniInput):
- Si dniInput.length >= 5: llamar buscarClientesPorDNI, guardar en clientesBuscados
- Si < 5: limpiar lista

UI del campo:
1. TextField label="DNI / Pasaporte" value={dniInput} onChange
2. Si buscando: MUI CircularProgress size={16} en el InputAdornment end
3. Si clienteSeleccionado: mostrar chip con nombre + botón X para limpiar
4. Dropdown Paper con position absolute sobre el campo:
   - Lista de resultados: "{apellido}, {nombre} · DNI {dni_pasaporte}"
   - Al click: setValue('cliente_id', cliente.id), setClienteSeleccionado(cliente), limpiar lista
5. Si dniInput.length >= 5 && clientesBuscados.length === 0 && !buscando:
   Mostrar botón "Crear nuevo cliente" que abre miniDialogOpen

Mini Dialog de cliente nuevo:
- Campos mínimos: nombre*, apellido*, dni_pasaporte*, email*, telefono*, licencia_conducir*, ciudad, pais
- Al guardar: llamar crearCliente (importar de clientes/actions), luego seleccionar automáticamente
- Usar los estilos del Dialog principal (misma estructura)

Limpiar estado de búsqueda al cerrar/resetear el dialog principal.

---

# FASE 4 — Datos completos del cliente en el drawer

## Archivos a modificar:
- app/dashboard/reservas/actions.ts
- components/admin/ReservaDrawer.tsx

## actions.ts — actualizar select de clientes en getReserva y getReservas:

Cambiar:
cliente:clientes(id, nombre, apellido, email)

Por:
cliente:clientes(id, nombre, apellido, email, telefono, dni_pasaporte, licencia_conducir, fecha_nacimiento)

## Actualizar tipo ReservaConRelaciones:
```typescript
cliente: {
  id: string;
  nombre: string;
  apellido: string;
  email: string;
  telefono: string;
  dni_pasaporte: string;
  licencia_conducir: string;
  fecha_nacimiento: string | null;
};
```

## ReservaDrawer.tsx — sección Cliente, agregar con <DataRow>:
```tsx
<DataRow label="DNI / Pasaporte" value={reserva.cliente.dni_pasaporte} />
<DataRow label="Nro. Licencia" value={reserva.cliente.licencia_conducir} />
<DataRow label="Teléfono" value={reserva.cliente.telefono} />
{reserva.cliente.fecha_nacimiento && (
  <DataRow
    label="Fecha de nac."
    value={new Date(reserva.cliente.fecha_nacimiento + 'T12:00:00')
      .toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' })}
  />
)}
```

---

# FASE 5 — ContratoPDF + InvoicePDF + flujo de entrega

## Archivos a modificar/crear:
- components/admin/ContratoPDF.tsx (NUEVO)
- components/admin/ReservaPDF.tsx (NUEVO)
- components/admin/ReservaDrawer.tsx

## ContratoPDF.tsx

Usar @react-pdf/renderer. Replicar el layout del contrato físico de Premier Rent A Car.

Layout: A4, orientación portrait, padding 20px, fuente Helvetica.
Dos columnas en la sección principal (columna izq ~45%, columna der ~50%, gap 5%).

SECCIONES Y CAMPOS A MAPEAR (props que recibe el componente):
```typescript
interface ContratoPDFProps {
  reserva: ReservaConRelaciones; // con cliente expandido (fase 4)
  tenant?: { nombre: string; logo_url?: string | null };
}
```

### Header:
- Izquierda: Logo si existe (30px altura) o texto "PREMIER RENT A CAR" en negrita grande
- Derecha: "Contrato de alquiler #" + reserva.numero en itálica
- Debajo del logo: dirección, mail, teléfono hardcodeados:
  "Sargento Cabral 1834 – Rivadavia – San Juan"
  "info@premierrentacars.com | 2645192219"
- Texto en negrita: "ANTE CUALQUIER IMPREVISTO COMUNICARSE AL NÚMERO QUE FIGURA EN EL CONTRATO"

### Columna izquierda:
DATOS DEL CLIENTE (subheader negrita subrayado)
- NOMBRE: {reserva.cliente.nombre}
- APELLIDO: {reserva.cliente.apellido}
- DNI: {reserva.cliente.dni_pasaporte}
- FECHA DE NACIMIENTO: {formatear fecha_nacimiento como DD/MM/AAAA}
- TELÉFONO: {reserva.cliente.telefono}
- CONDUCTOR: {reserva.cliente.nombre} {reserva.cliente.apellido}

DATOS TARJETA DE CRÉDITO (subheader)
- NÚMERO: _______________________
- VENCIMIENTO: _________ COD. SEG: ______

INFORMACIÓN DE TARIFA (subheader negrita subrayado)
Tabla de 3 columnas (concepto | precio unitario | subtotal):
- {dias} VALOR DIARIO: ${precioXDia} | ${precio_base}
- {km_contratados} KM CONTRATADO: $______ | $______
- HORAS EXTRAS $10.000 | $______
- CONDUCTOR ADICIONAL | $______
- ENTREGA AEROPUERTO | $______
- DEVOLUCIÓN AEROPUERTO | $______
- ENTREGA/DEVOLUCIÓN F/H | $______
- SILLA BEBÉ/BOOSTER | $______
- OTROS: | $______
Separador
TOTAL: ${reserva.precio_total}
ANTICIPO: ${reserva.total_pagado}
SALDO PENDIENTE: ${saldo}

### Columna derecha:
INFORMACIÓN DEL ALQUILER (subheader negrita subrayado)
- FECHA DE ENTREGA: {DD/MM/AAAA} HORA: {HH:MM} hs
- FECHA DE DEVOLUCIÓN: {DD/MM/AAAA} HORA: {HH:MM} hs
- LUGAR ENTREGA: {reserva.lugar_entrega}
- LUGAR DE DEVOLUCIÓN: {reserva.lugar_devolucion}

DATOS DEL VEHÍCULO (subheader negrita subrayado)
- CATEGORÍA: {vehiculo.categoria.nombre}  PATENTE: {vehiculo.patente}
- MODELO: {vehiculo.modelo}
- KM INICIAL: {km_entrega ?? '______'}  KM FINAL: {km_devolucion ?? '______'}
- KM DIARIO: {Math.round(km_contratados/dias)} KM TOTAL: {km_contratados} KM EXTRA: $______
- COMBUSTIBLE: {combustible_entrega}  COMB. FALTANTE: $______
- FRANQUICIA POR SINIESTRO 3%/5% VALOR VEHÍCULO
- FRANQUICIA ROBO/VUELCO $8.000.000

OBSERVACIONES:
{reserva.observaciones ?? ''}
(3 líneas en blanco)

### Footer sección 1 — Valores de reparaciones (texto pequeño, 1 línea):
"Paño chapa $160.000 | Parabrisa $200.000/$450.000 | Llanta $80.000/$700.000 |
Cerradura $180.000 | Copia llave $200.000 | Paño pintura $180.000 |
Óptica/faro $90.000/$450.000 | Cubierta $200.000/$600.000 |
Limpieza tapizado $150.000 | Lustrado/pulido $200.000"

### Footer sección 2 — Dos columnas:
Izquierda:
"EVENTUALIDAD QUE PUDIERA OCASIONAR..." (texto legal del contrato, hardcodeado)
"EL DESBLOQUEO DE LA TARJETA SE REALIZARÁ 24HS..." (en color rojo/destacado)
"LLAMADAS/WHATSAPP: 2645192219"

Derecha:
"ACEPTO LOS TÉRMINOS Y CONDICIONES..."
FECHA: ___________________
FIRMA: ___________________
ACLARACIÓN: _____________ DNI: _______________

### Página 2: texto legal del dorso (hardcodeado, body de texto corrido).
Incluir el texto legal estándar de alquiler de vehículos Argentina.

---

## ReservaPDF.tsx — invoice interno (más simple, para enviar al cliente)

Document A4 con:
- Header: logo + "COMPROBANTE DE RESERVA #" + reserva.numero
- Fecha de emisión: hoy
- Sección CLIENTE: todos los datos de Fase 4
- Sección VEHÍCULO: categoría, patente, modelo
- Sección FECHAS: entrega (fecha + hora + lugar), devolución (fecha + hora + lugar), días
- Sección PRECIOS: tabla con precio base, coberturas, adicionales, descuento, TOTAL en negrita
- Sección ESTADO DE CUENTA: pagado, saldo pendiente
- Footer: "Documento generado por RentaCore · Premier Rent A Car"

---

## ReservaDrawer.tsx — actualizar flujo

### Estado nuevo:
```typescript
const [contratoImpreso, setContratoImpreso] = React.useState(false);
```

### Función para generar y descargar PDF:
```typescript
import { pdf } from '@react-pdf/renderer';
import { ContratoPDF } from './ContratoPDF';
import { ReservaPDF } from './ReservaPDF';

const handleDescargarContrato = async () => {
  const blob = await pdf(<ContratoPDF reserva={reserva} />).toBlob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `contrato-${reserva.id_corto}.pdf`;
  a.click();
  URL.revokeObjectURL(url);
  setContratoImpreso(true);
};

const handleDescargarInvoice = async () => {
  const blob = await pdf(<ReservaPDF reserva={reserva} />).toBlob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `reserva-${reserva.id_corto}.pdf`;
  a.click();
  URL.revokeObjectURL(url);
};
```

### Header del drawer — reemplazar botón imprimir:
- Ícono PrintOutlined → descarga el invoice (handleDescargarInvoice)
- Agregar ícono ArticleOutlined con tooltip "Contrato" → handleDescargarContrato

### Botón "Entregar" — agregar lógica de habilitación:
```tsx
{reserva.estado === 'confirmada' && (
  <Tooltip title={!contratoImpreso ? 'Generá el contrato primero' : ''}>
    <span>
      <Button
        size="small"
        variant="contained"
        color="primary"
        onClick={() => setEntregarOpen(true)}
        disabled={!!accionLoading || !contratoImpreso}
        sx={{ fontWeight: 600 }}
      >
        Entregar
      </Button>
    </span>
  </Tooltip>
)}
```

Nota: si reserva.estado es 'en_curso' (reserva ya entregada), no aplicar esta restricción.

---

# FASE 6 — Devolución con resumen de KMs

## Archivos a modificar:
- supabase/migrations/[TIMESTAMP]_add_km_contratados.sql (NUEVO)
- types/index.ts
- app/dashboard/reservas/actions.ts
- app/dashboard/reservas/ReservasClient.tsx
- components/admin/ReservaDrawer.tsx

## Migración:
```sql
ALTER TABLE reservas
  ADD COLUMN IF NOT EXISTS km_contratados INTEGER DEFAULT 0;
```

## types/index.ts — interface Reserva, agregar:
```typescript
km_contratados: number | null;
```

## ReservasClient.tsx — form nueva reserva, agregar campo:
```typescript
// Schema:
km_contratados: z.coerce.number().min(0).default(0),
// Campo en el form (sección fechas/vehículo):
<TextField label="Km contratados" type="number" .../>
```
Incluir en crearReserva data.

## ReservaDrawer.tsx — Dialog Devolver (reemplazar el existente):

Estado adicional:
```typescript
const [kmFinal, setKmFinal] = React.useState('');
const [kmContratadosEdit, setKmContratadosEdit] = React.useState(
  String(reserva.km_contratados ?? 0)
);
const kmInicial = reserva.km_entrega ?? 0;
const kmHechos = Number(kmFinal) - kmInicial;
const kmAdicionales = Math.max(0, kmHechos - Number(kmContratadosEdit));
```

Dialog content:
```tsx
<DataRow label="Km inicial (entrega)" value={`${kmInicial.toLocaleString('es-AR')} km`} />
<TextField label="Km final (devolución)" type="number" value={kmFinal}
  onChange={e => setKmFinal(e.target.value)} />
{kmFinal && (
  <>
    <DataRow label="Km recorridos" value={`${kmHechos.toLocaleString('es-AR')} km`} />
    <TextField label="Km contratados" type="number" value={kmContratadosEdit}
      onChange={e => setKmContratadosEdit(e.target.value)} />
    <DataRow
      label="Km adicionales"
      value={<strong style={{ color: kmAdicionales > 0 ? '#dc2626' : '#16a34a' }}>
        {kmAdicionales.toLocaleString('es-AR')} km
      </strong>}
    />
    {kmAdicionales > 0 && (
      <Alert severity="warning" sx={{ mt: 1 }}>
        Excedió {kmAdicionales.toLocaleString('es-AR')} km del contrato.
        Verificar cobro de km adicionales.
      </Alert>
    )}
  </>
)}
```

En handleDevolver: pasar km_devolucion: Number(kmFinal) y guardar km_contratados actualizado.

---

# FASE 7 — Sucursales

## Archivos a modificar:
- supabase/migrations/[TIMESTAMP]_add_sucursales.sql (NUEVO)
- types/index.ts
- app/dashboard/sucursales/page.tsx (NUEVO)
- app/dashboard/sucursales/SucursalesClient.tsx (NUEVO)
- app/dashboard/sucursales/actions.ts (NUEVO)
- components/admin/Sidebar.tsx
- app/dashboard/vehiculos/VehiculosClient.tsx
- app/dashboard/vehiculos/actions.ts

## Migración: (ver plan de acción arriba)

## Módulo sucursales: misma estructura que /clientes
Columnas de tabla: Nombre | Dirección | Teléfono | Vehículos asignados | Activa (Chip) | Acciones
CRUD completo con Dialog de alta/edición.
Actions: getSucursales, crearSucursal, actualizarSucursal, eliminarSucursal.

## Sidebar.tsx:
Importar StorefrontOutlined de @mui/icons-material.
Agregar en NAV_ITEMS después del item de Vehículos:
{ text: 'Sucursales', icon: <StorefrontOutlined />, path: '/dashboard/sucursales' }

## VehiculosClient.tsx:
Agregar prop sucursales: { id: string; nombre: string }[] en Props.
Agregar al schema: sucursal_id: z.string().optional()
Agregar select "Sucursal" en el form de alta/edición.
Agregar filtro "Sucursal" en la barra de filtros superior.

---

# FASE 8 — Seed de categorías

## Archivo:
- supabase/migrations/[TIMESTAMP]_seed_categorias.sql (NUEVO)

Ejecutar la migración seed de las 10 categorías (ver plan de acción arriba).
Si ya existen registros en la tabla categorias, no insertar (usar el WHERE NOT EXISTS).

---

# FASE 9 — Reportes ampliados

## Archivos a modificar:
- app/dashboard/reportes/actions.ts
- app/dashboard/reportes/ReportesClient.tsx

Implementar los 5 nuevos Server Actions y los 4 Tabs en el client.
En cada Tab, agregar dos botones de exportación: PDF (react-pdf) y Excel (SheetJS).
Para el PDF de reportes: crear un componente ReportePDF.tsx genérico que reciba
un título, filtros activos, y un array de filas con headers.

---

# FASE 10 — Mantenimiento: alertas y notificaciones

## Archivos a modificar:
- supabase/migrations/[TIMESTAMP]_add_mantenimiento_intervalo.sql (NUEVO)
- app/dashboard/mantenimiento/actions.ts
- app/dashboard/mantenimiento/MantenimientoClient.tsx
- app/dashboard/page.tsx
- app/api/mantenimiento/notificar/route.ts (NUEVO)
- vercel.json (NUEVO o actualizar)

Implementar getMantenimientosProximos(), Alert en dashboard, Toast en MantenimientoClient,
API route con Resend, y cron de Vercel.
Para el cron, crear vercel.json en la raíz si no existe:
{ "crons": [{ "path": "/api/mantenimiento/notificar", "schedule": "0 8 * * *" }] }

---

## NOTA FINAL

El campo "Datos Tarjeta de Crédito" del contrato (número, vencimiento, cod. seguridad)
NO se almacena en la base de datos por razones de seguridad PCI.
En el PDF se generan líneas en blanco para completar a mano antes de la firma.

Si el cliente solicita almacenarlo en el futuro, se debe implementar un vault
encriptado separado (ej. Supabase Vault) — no almacenar en texto plano.
```

---

*Plan generado con análisis del repositorio · Finda Digital · Juan Galarza · Junio 2026*
