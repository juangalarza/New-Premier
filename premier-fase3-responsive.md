# MASTER PROMPT — FASE 3: RESPONSIVE MOBILE + TABLET
## Proyecto: New-Premier (Premier Rent A Car)
## Repo: https://github.com/juangalarza/New-Premier
## Fecha: 10 de junio de 2026

---

## CONTEXTO OBLIGATORIO — LEER PRIMERO

Este proyecto ya tiene un `master.md` en la raíz. **Léelo antes de tocar una línea de código.**

Resumen rápido:
- **Stack:** Next.js 14+ App Router (TypeScript), Material UI v6, Supabase, Vercel
- **UI:** MUI v6 — breakpoints disponibles: `xs` (0px), `sm` (600px), `md` (900px), `lg` (1200px), `xl` (1536px)
- **Target de esta fase:** `xs` y `sm` (mobile) + `md` (tablet). Desktop (`lg`+) ya funciona bien — **no tocarlo**.

---

## ADVERTENCIA DEL AGENTE (AGENTS.md)

> "This is NOT the Next.js you know. APIs, conventions, and file structure may differ from your training data. **Read `node_modules/next/dist/docs/` before writing any code.** Heed deprecation notices."

---

## OBJETIVO DE ESTA FASE

Adaptar **todas las vistas** del panel de administración para que sean 100% usables en mobile (celular) y tablet. El desktop ya funciona correctamente y **no debe verse afectado bajo ninguna circunstancia**.

**Alcance de los cambios permitidos:**
- ✅ Modificar `sx`, `style`, clases CSS
- ✅ Agregar breakpoints MUI (`{ xs: ..., sm: ..., md: ..., lg: ... }`)
- ✅ Refactorizar JSX de presentación — por ejemplo, reemplazar una `<Table>` por `<Card>` en mobile siempre que los datos mostrados sean exactamente los mismos
- ✅ Agregar/quitar elementos visuales según breakpoint (ej: ocultar columnas secundarias en mobile con `display: { xs: 'none', md: 'table-cell' }`)
- ✅ Reorganizar el orden visual de secciones para mobile
- ❌ NO modificar handlers, hooks de lógica, llamadas a Supabase, stores de Zustand, ni schemas Zod
- ❌ NO cambiar nombres de funciones, props de componentes, ni firmas de tipos
- ❌ NO tocar nada que afecte el comportamiento en desktop (`lg` en adelante)

---

## REGLAS GENERALES PARA TODA LA FASE

Estas reglas aplican a **cada componente** que se modifique:

### 1. Breakpoints
Usar siempre los breakpoints de MUI de forma consistente:
```
xs  → 0–599px     → celular
sm  → 600–899px   → celular grande / tablet pequeña
md  → 900–1199px  → tablet
lg+ → 1200px+     → desktop (NO TOCAR)
```

### 2. Sidebar / Navigation
- En `xs/sm`: el sidebar debe colapsar en un **Drawer temporal** (hamburger menu). Si ya existe esta lógica, verificar que funcione correctamente.
- En `md`: el sidebar puede mostrarse como mini-rail (solo íconos) o Drawer temporal, según lo que ya exista.
- En `lg+`: sidebar fijo, sin cambios.
- El botón hamburger debe estar visible en el header en `xs/sm`.

### 3. Tablas → Cards en mobile
Cualquier tabla (`<Table>`) con más de 3 columnas **debe transformarse en cards** en `xs/sm`. Patrón:
```tsx
{/* Desktop: tabla normal */}
<Box sx={{ display: { xs: 'none', md: 'block' } }}>
  <Table>...</Table>
</Box>

{/* Mobile: lista de cards */}
<Box sx={{ display: { md: 'none' } }}>
  {rows.map(row => (
    <Card key={row.id} sx={{ mb: 1 }}>
      <CardContent>
        {/* Mostrar los mismos datos de la tabla, reorganizados */}
      </CardContent>
    </Card>
  ))}
</Box>
```
Los datos mostrados en las cards deben ser **exactamente los mismos** que en la tabla. No omitir información.

### 4. Grids de KPIs / métricas
- Desktop: 4 columnas
- Tablet (`md`): 2 columnas
- Mobile (`xs/sm`): 1 columna o 2 columnas si las cards son pequeñas

```tsx
<Grid container spacing={2}>
  <Grid item xs={6} sm={6} md={3}>
    <KpiCard ... />
  </Grid>
</Grid>
```

### 5. Formularios y Drawers
- Los Drawers (`anchor="right"`) en mobile deben ocupar **100% del ancho** (`width: { xs: '100vw', sm: '100vw', md: 520 }`)
- Los campos de formulario deben apilarse verticalmente en mobile (un campo por fila)
- Los grupos de botones de acción (Guardar / Cancelar) deben ocupar 100% del ancho en mobile y estar fijos al fondo del Drawer con `position: sticky, bottom: 0`

### 6. Modales / Dialogs
- En `xs/sm`: los `Dialog` deben usar `fullScreen` en mobile:
```tsx
<Dialog
  fullScreen={isMobile}  // usar useMediaQuery(theme.breakpoints.down('sm'))
  ...
>
```

### 7. Botones y acciones
- En tablas/cards mobile, los botones de acción (editar, eliminar, ver) deben ser `IconButton` en lugar de `Button` con texto, para ahorrar espacio.
- Los botones de acción primaria (Crear reserva, Agregar vehículo, etc.) deben ser `Fab` flotante en `xs/sm` si el botón original está en el header de la página:
```tsx
{/* Botón normal en desktop */}
<Button sx={{ display: { xs: 'none', md: 'inline-flex' } }} ...>
  Nueva reserva
</Button>

{/* FAB en mobile */}
<Fab
  sx={{ display: { md: 'none' }, position: 'fixed', bottom: 16, right: 16 }}
  color="primary"
  onClick={handleNuevaReserva}
>
  <AddIcon />
</Fab>
```

### 8. Tipografía y espaciado
- Reducir padding de contenedores: `px: { xs: 1, sm: 2, md: 3 }`
- Títulos de página: `variant="h5"` en mobile, `variant="h4"` en desktop
- No usar `whiteSpace: 'nowrap'` en textos que puedan necesitar wrap en mobile

### 9. Hook de breakpoint (crear si no existe)
```typescript
// hooks/useIsMobile.ts
import { useTheme, useMediaQuery } from '@mui/material'

export function useIsMobile() {
  const theme = useTheme()
  return useMediaQuery(theme.breakpoints.down('sm'))
}

export function useIsTablet() {
  const theme = useTheme()
  return useMediaQuery(theme.breakpoints.between('sm', 'md'))
}
```

---

## VISTAS A ADAPTAR — CHECKLIST COMPLETO

Recorrer cada una en orden. Marcar como completa antes de pasar a la siguiente.

### [ ] 1. Layout principal (sidebar + header + contenedor)
**Archivos probables:** `components/admin/Layout/`, `components/admin/Sidebar/`, `app/(admin)/layout.tsx`

- Sidebar colapsable en mobile (Drawer temporal con hamburger)
- Header con botón hamburger en `xs/sm`
- Contenido principal sin `overflow: hidden` que corte en mobile
- El `main` content no debe tener `marginLeft` fijo en mobile (ese margin es del sidebar desktop)

---

### [ ] 2. Dashboard
**Archivos probables:** `app/(admin)/dashboard/page.tsx`

- Grid de KPIs: 2 col en mobile, 4 col en desktop
- Gráficos (`recharts` u otro): ancho 100% con `ResponsiveContainer` — verificar que ya estén así; si no, envolver en `<Box sx={{ width: '100%', overflowX: 'auto' }}>`
- Tabla "Últimas reservas" o similar → cards en mobile
- Tabla "Ranking vehículos" → cards en mobile
- Sección de gastos (nueva de Fase 1) → mismo tratamiento

---

### [ ] 3. Calendario Gantt
**Archivos probables:** `components/admin/GanttCalendar/`

El Gantt es el componente más complejo para responsive. Estrategia:

- En `xs/sm`: **no intentar mostrar el Gantt completo** — reemplazarlo por una **lista de reservas del día/semana** ordenadas cronológicamente, con cards por reserva. Incluir un selector de fecha para navegar.
- En `md` (tablet): mostrar el Gantt con scroll horizontal habilitado (`overflowX: 'auto'`) y reducir el ancho mínimo de las columnas de día.
- En `lg+`: Gantt completo sin cambios.

```tsx
{/* Mobile: vista lista */}
<Box sx={{ display: { xs: 'block', md: 'none' } }}>
  <ReservasListaMobile fecha={fechaSeleccionada} sucursal={sucursalSeleccionada} />
</Box>

{/* Tablet+: Gantt con scroll */}
<Box sx={{ display: { xs: 'none', md: 'block' }, overflowX: 'auto' }}>
  <GanttCalendar ... />
</Box>
```

El componente `ReservasListaMobile` debe:
- Usar los **mismos datos ya disponibles** en el estado del Gantt (no hacer nuevo fetch)
- Mostrar: patente, modelo, cliente, fecha entrega → devolución, estado (chip de color)
- Al tocar una reserva, abrir el `ReservaDrawer` existente (misma función que en el Gantt)

---

### [ ] 4. Reservas (listado)
**Archivos probables:** `app/(admin)/reservas/page.tsx`

- Filtros: colapsar en un `Accordion` o botón "Filtros" que abra un Drawer en mobile
- Tabla → cards en mobile. Cada card muestra:
  - Nombre del cliente (título)
  - Vehículo (patente + modelo)
  - Fechas (entrega → devolución)
  - Monto total
  - Chip de estado
  - Botones: Ver / Editar (IconButtons)
- Paginación: simplificar a solo "Anterior / Siguiente" en mobile

---

### [ ] 5. ReservaDrawer (formulario de reserva)
**Archivos probables:** `components/admin/ReservaDrawer/`

- Ancho: `{ xs: '100vw', sm: '100vw', md: 520 }`
- Campos del formulario: una columna en mobile, dos columnas en desktop
- Selector de vehículo (si es un grid de cards): 1 columna en mobile, 2 en tablet, 3 en desktop
- Botones de acción fijos al pie: `position: sticky, bottom: 0, bgcolor: 'background.paper', pt: 1`
- El buscador de clientes (Fase 2-A) debe tener ancho 100% en mobile

---

### [ ] 6. Vehículos (listado)
**Archivos probables:** `app/(admin)/vehiculos/page.tsx`

- Tabla → cards en mobile. Cada card:
  - Patente (título grande)
  - Modelo + Categoría
  - Sucursal (chip)
  - Estado (activo/inactivo — chip de color)
  - Botones: Ver / Editar
- Formulario de creación/edición: si es un Dialog, aplicar `fullScreen` en mobile

---

### [ ] 7. Clientes (listado)
**Archivos probables:** `app/(admin)/clientes/page.tsx`

- Tabla → cards en mobile. Cada card:
  - Nombre + Apellido (título)
  - DNI
  - Teléfono (con link `tel:` para marcar desde mobile)
  - Email
  - Botón Ver historial de reservas
- El buscador por nombre/apellido (Fase 2-A) debe estar visible y funcional en mobile con ancho 100%

---

### [ ] 8. Tarifas
**Archivos probables:** `app/(admin)/tarifas/page.tsx`

- Si hay una tabla de tarifas por categoría: mostrarla como cards apiladas en mobile
- Los inputs de precio (km extra, sillita, etc. — Fase 2-B) deben tener ancho 100% en mobile
- Si hay selector de sucursal (tabs o select): en mobile usar `Select` en lugar de `Tabs` si hay más de 2 sucursales

---

### [ ] 9. Sucursales
**Archivos probables:** `app/(admin)/sucursales/page.tsx`

- Cards de sucursal: 1 columna en mobile, 2 en tablet
- Formulario de edición: Dialog con `fullScreen` en mobile

---

### [ ] 10. Módulo Caja (ingresos y egresos)
**Archivos probables:** `app/(admin)/caja/page.tsx`

- KPIs de saldo/ingresos/egresos: 1 columna en mobile
- Tabla de movimientos → cards en mobile. Cada card:
  - Fecha + categoría
  - Descripción
  - Monto (color verde para ingreso, rojo para egreso)
  - Botones: Editar / Eliminar
- Botón "Nuevo movimiento": FAB en mobile

---

### [ ] 11. Configuración / Perfil
**Archivos probables:** `app/(admin)/configuracion/page.tsx` o similar

- Formularios: una columna en mobile
- Si hay secciones con tabs: usar `Tabs` con `variant="scrollable"` en mobile

---

## ORDEN DE TRABAJO RECOMENDADO

Empezar por los componentes base que afectan a todas las vistas, luego ir por las vistas de mayor uso del cliente:

1. **Layout + Sidebar** — impacta todo el panel
2. **ReservaDrawer** — se usa desde múltiples vistas
3. **Dashboard**
4. **Reservas (listado)**
5. **Calendario Gantt** (el más complejo — dejar para cuando el resto esté resuelto)
6. **Vehículos**
7. **Clientes**
8. **Caja**
9. **Tarifas**
10. **Sucursales**
11. **Configuración**

---

## TESTING — CÓMO VERIFICAR CADA VISTA

Para cada vista, verificar en las siguientes resoluciones usando DevTools (Chrome → Toggle device toolbar):

| Dispositivo | Resolución |
|---|---|
| iPhone SE | 375 × 667 |
| iPhone 14 Pro | 390 × 844 |
| Samsung Galaxy S21 | 360 × 800 |
| iPad Mini | 768 × 1024 |
| iPad Air | 820 × 1180 |

**Checklist por vista:**
- [ ] No hay scroll horizontal en mobile (salvo el Gantt en tablet que es intencional)
- [ ] Todos los textos son legibles (mínimo 14px)
- [ ] Los botones tienen área táctil de al menos 44×44px
- [ ] Los inputs son usables con teclado virtual (el teclado no tapa el campo activo)
- [ ] No hay elementos superpuestos
- [ ] El FAB (si aplica) no tapa contenido importante al fondo de la lista

---

## CHECKLIST DE CIERRE DE SESIÓN

- [ ] `npm run build` pasa sin errores de TypeScript
- [ ] Desktop (`lg+`) se ve exactamente igual que antes de la fase — sin regresiones visuales
- [ ] Ninguna función de lógica fue modificada (solo JSX de presentación y estilos)
- [ ] No se introdujeron nuevas dependencias de UI
- [ ] El sidebar colapsa correctamente en mobile y no bloquea el contenido
- [ ] Las tablas tienen su versión card en mobile para todas las vistas
- [ ] El Gantt tiene vista lista en mobile funcional
- [ ] Los Drawers ocupan 100% del ancho en mobile
- [ ] Commit: `feat: responsive mobile + tablet — todas las vistas [FASE-3]`
