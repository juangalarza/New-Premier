# MASTER PROMPT — SESIÓN DE ARREGLOS Y MEJORAS
## Proyecto: New-Premier (Premier Rent A Car)
## Repo: https://github.com/juangalarza/New-Premier
## Fecha de relevamiento: 10 de junio de 2026

---

## CONTEXTO OBLIGATORIO — LEER PRIMERO

Este proyecto ya tiene un `master.md` en la raíz con el stack, arquitectura, reglas de desarrollo y descripción completa de módulos. **Léelo antes de tocar una línea de código.**

Resumen rápido para esta sesión:
- **Stack:** Next.js 14+ App Router (TypeScript), Material UI v6, Supabase, Vercel
- **UI:** MUI v6 — NO Tailwind, NO shadcn
- **DB:** Supabase con RLS. Todas las tablas tienen `tenant_id`
- **Estado global:** Zustand. **Data fetching:** SWR
- **Forms:** React Hook Form + Zod
- **Calendario:** Gantt custom con CSS Grid en `/components/admin/GanttCalendar`
- **Drawer de reserva:** `/components/admin/ReservaDrawer` — Drawer MUI anchor="right", 520px

---

## ADVERTENCIA DEL AGENTE (AGENTS.md)

> "This is NOT the Next.js you know. This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. **Read the relevant guide in `node_modules/next/dist/docs/` before writing any code.** Heed deprecation notices."

---

## OBJETIVO DE ESTA SESIÓN

Implementar los 10 requerimientos relevados por el cliente (Premier Rent A Car) en una sesión de revisión del sistema. Están agrupados por módulo y ordenados por prioridad de impacto. Resolver en orden, confirmando cada uno antes de pasar al siguiente.

---

## REQUERIMIENTOS A IMPLEMENTAR

### 🔴 PRIORIDAD ALTA — Bugs bloqueantes

---

#### REQ-06 / REQ-07 — Edición de reservas deshabilitada (BUG CRÍTICO)

**Problema:** Al abrir una reserva existente, desde el calendario Gantt (`GanttCalendar`) o desde la lista en `/reservas`, todos los campos aparecen en modo lectura. No es posible modificar precio, fechas, estado ni ningún otro dato. El cliente cargó una reserva con precio incorrecto y no puede corregirlo.

**Archivos probables a revisar:**
- `components/admin/ReservaDrawer/` — verificar si hay un prop `readOnly`, `disabled` o similar que bloquea la edición
- `app/(admin)/reservas/` — verificar si la página de listado abre el drawer en modo solo-lectura
- Buscar en el código: `disabled`, `readOnly`, `isEditing`, `canEdit`, `mode: 'view'`

**Comportamiento esperado:**
- El `ReservaDrawer` debe tener un botón "Editar" que habilite los campos
- Al guardar, hacer PATCH/UPDATE a Supabase en la tabla `reservas`
- Los campos editables son: `precio_total`, `fecha_entrega`, `fecha_devolucion`, `vehiculo_id`, `observaciones`, y cualquier adicional
- Al modificar `fecha_entrega` o `fecha_devolucion`, recalcular `precio_total` usando el motor de precios definido en `master.md`
- Mostrar un `Snackbar` MUI de confirmación al guardar exitosamente
- Si hay error en Supabase, mostrar `Snackbar` de error con el mensaje

**Validaciones:**
- No permitir `fecha_devolucion <= fecha_entrega`
- Si se cambia vehículo, verificar disponibilidad para las fechas de la reserva (excluyendo la reserva actual del check)
- Respetar el flujo de estados: no permitir editar una reserva en estado `cancelada` o `devuelta`

---

#### REQ-03 — Calendario no separa autos por sucursal

**Problema:** En el calendario Gantt, al cargar la vista, aparecen todos los vehículos mezclados sin distinguir sucursal. El cliente tiene vehículos en Salta y en San Juan.

**Archivos a revisar:**
- `components/admin/GanttCalendar/` — revisar cómo se hace el fetch de vehículos
- Buscar si existe un filtro de `sucursal_id` o `branch_id` en la query

**Comportamiento esperado:**
- Agregar un selector (MUI `Select` o `ToggleButtonGroup`) encima del Gantt con las opciones: **Todas las sucursales / Salta / San Juan**
- El selector debe persistir en el estado local del componente (no en URL, salvo que ya haya router params implementados)
- Al cambiar la sucursal, re-fetchear los vehículos filtrando por `sucursal_id`
- Las filas del Gantt deben mostrar solo los vehículos de la sucursal seleccionada
- Si se selecciona "Todas", mostrar todos con una separación visual entre sucursales (header de sección o fila divisoria)

**Query Supabase esperada:**
```typescript
const { data: vehiculos } = await supabase
  .from('vehiculos')
  .select('id, patente, modelo, sucursal_id, categoria_id')
  .eq('tenant_id', tenantId)
  .eq('sucursal_id', sucursalSeleccionada) // omitir si "todas"
  .eq('activo', true)
  .order('patente')
```

---

### 🟡 PRIORIDAD MEDIA — Funcionalidad importante

---

#### REQ-04 — Calendario sin filtro por categoría de vehículo

**Problema:** No existe forma de ver el calendario filtrado por categoría (Compacto, Mediano, Automático, SUV, Camioneta).

**Comportamiento esperado:**
- Agregar un segundo selector junto al de sucursal: **Todas las categorías / Compacto / Mediano / Automático / SUV / Camioneta**
- Los valores deben venir de la tabla `categorias` en Supabase, no hardcodeados
- Combinar ambos filtros (sucursal + categoría) en la misma query
- Si no hay vehículos para esa combinación, mostrar un estado vacío con texto descriptivo

---

#### REQ-05 — Reservas sin vehículo asignado aparecen en el calendario

**Problema:** Una reserva sin `vehiculo_id` asignado figura en el calendario, lo que genera confusión visual.

**Comportamiento esperado:**
- En la query que trae las reservas para el Gantt, agregar condición: `.not('vehiculo_id', 'is', null)`
- Estas reservas "sin vehículo" deben estar visibles en la lista `/reservas` con un chip de estado especial "Sin asignar" (color naranja)
- En el `ReservaDrawer`, el botón "Asignar vehículo" debe quedar visible y funcional para estas reservas

---

#### REQ-08 / REQ-09 — Tarifas sin campos de adicionales editables

**Problema:** En la sección de tarifas (probablemente en `/tarifas` o dentro de la configuración de sucursal), no existe la posibilidad de configurar el valor del kilómetro extra ni el precio de la sillita de niño.

**Archivos a revisar:**
- `app/(admin)/tarifas/` — verificar qué campos del form existen hoy
- Buscar tabla `adicionales` o `tarifas_adicionales` en el schema de Supabase

**Comportamiento esperado:**
- En la vista de edición de tarifa (o en una sección "Adicionales" de la misma página), agregar campos editables:
  - `precio_km_extra` — input numérico (ARS, sin decimales)
  - `precio_sillita_nino` — input numérico (ARS, sin decimales)
  - Campo libre para otros adicionales: nombre + precio (tabla dinámica con botón "Agregar adicional")
- Estos valores deben guardarse en Supabase, relacionados con el `tenant_id` y/o la sucursal
- Si la tabla `adicionales` no existe, crear la migración en `/supabase/migrations/`
- En el motor de precios (`precio_adicionales = sumar adicionales seleccionados`), estos nuevos campos deben estar disponibles al crear una reserva

**Schema sugerido si no existe:**
```sql
CREATE TABLE adicionales (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id uuid NOT NULL REFERENCES tenants(id),
  nombre text NOT NULL,
  precio numeric(10,2) NOT NULL DEFAULT 0,
  activo boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE adicionales ENABLE ROW LEVEL SECURITY;
```

---

### 🟢 PRIORIDAD BAJA — Nuevas funcionalidades

---

#### REQ-01 — Dashboard sin sección de gastos

**Problema:** El dashboard actual solo muestra ingresos. El cliente necesita ver gastos para calcular balance real.

**Comportamiento esperado:**
- Agregar una nueva card KPI: **"Gastos del mes"** con el total de gastos y variación % respecto al mes anterior
- Modificar la card de "Ingresos" para que también muestre el **balance neto** (ingresos - gastos)
- Agregar una tabla o lista "Últimos gastos" similar a la de entregas del día
- Si no existe tabla `gastos` en Supabase, crear la migración:

```sql
CREATE TABLE gastos (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id uuid NOT NULL REFERENCES tenants(id),
  vehiculo_id uuid REFERENCES vehiculos(id),
  sucursal_id uuid REFERENCES sucursales(id),
  categoria text NOT NULL, -- 'combustible', 'mantenimiento', 'seguro', 'otros'
  monto numeric(10,2) NOT NULL,
  descripcion text,
  fecha date NOT NULL DEFAULT CURRENT_DATE,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE gastos ENABLE ROW LEVEL SECURITY;
```

---

#### REQ-02 — Dashboard sin métricas por vehículo individual

**Problema:** No se puede ver cuánto facturó cada vehículo individual.

**Comportamiento esperado:**
- Modificar el widget "Ranking vehículos últimos 6 meses" para mostrar los **top 5** (no solo top 3)
- Agregar un click en cada fila del ranking que abra un modal o navegue a una vista de detalle del vehículo con su historial de reservas y facturación
- En la sección `/vehiculos`, agregar una columna "Facturado (últimos 6 meses)" a la tabla de listado

---

#### REQ-10 — Módulo de Mantenimiento sin revisar (baja prioridad)

**Estado:** El cliente aún no lo ha explorado. Verificar que el módulo `/vehiculos` tenga una sub-sección de mantenimiento donde se pueda:
- Registrar mantenimientos realizados (fecha, tipo, km, costo, descripción)
- Programar próximos mantenimientos
- Configurar alertas (por fecha o por km acumulado)

Si el módulo no existe, **no implementarlo en esta sesión** — solo crear un issue/comentario en el código con `// TODO: Módulo mantenimiento - ver REQ-10`.

---

## CONVENCIONES PARA ESTA SESIÓN

Estas son las reglas que aplican a todos los cambios que hagas:

- **No romper lo que funciona.** Antes de modificar un componente, entendé cómo se usa actualmente.
- **Server Components por defecto.** Agregar `"use client"` solo cuando sea necesario (eventos, hooks de estado).
- **SWR para data fetching en client components.** No usar `useEffect + fetch` directo.
- **React Hook Form + Zod** para cualquier formulario nuevo o modificado.
- **MUI v6** para todos los componentes de UI. No introducir nuevas dependencias de UI.
- **Fechas en UTC** en la base de datos. Mostrar en timezone local en la UI (usar `date-fns` o `dayjs` según lo que ya esté en el proyecto).
- **Montos en ARS sin decimales** en la UI. Guardar como `numeric(10,2)` en la DB.
- **Mensajes de confirmación/error** siempre con MUI `Snackbar` + `Alert`.
- **No hardcodear** `tenant_id`. Obtenerlo del contexto de autenticación de Supabase.
- **Escribir migraciones** en `/supabase/migrations/` con timestamp en el nombre: `20260610_XXXXXX_descripcion.sql`

---

## ORDEN DE TRABAJO SUGERIDO

Implementar en este orden para minimizar dependencias y riesgo:

1. **REQ-06/07** — Habilitar edición de reservas (impacto inmediato para el cliente)
2. **REQ-03** — Filtro por sucursal en el calendario
3. **REQ-05** — Ocultar reservas sin vehículo del calendario
4. **REQ-04** — Filtro por categoría en el calendario
5. **REQ-08/09** — Campos editables en tarifas (puede requerir migración)
6. **REQ-01** — Gastos en el dashboard (requiere migración y nuevo módulo)
7. **REQ-02** — Métricas por vehículo en el dashboard
8. **REQ-10** — Solo verificar si existe el módulo, agregar TODO si no

---

## CHECKLIST DE CIERRE DE SESIÓN

Antes de terminar, verificar:

- [ ] `npm run build` pasa sin errores de TypeScript
- [ ] No hay `console.log` de debug en el código
- [ ] Todas las migraciones están en `/supabase/migrations/`
- [ ] Los tipos de Supabase están actualizados si se crearon tablas nuevas (`supabase gen types typescript`)
- [ ] Ningún secret o credencial en el código (solo variables de entorno)
- [ ] Commit con mensaje descriptivo tipo: `fix: habilitar edición de reservas en ReservaDrawer [REQ-06/07]`
