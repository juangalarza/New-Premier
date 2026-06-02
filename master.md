# MASTER PROMPT — SISTEMA DE GESTIÓN INTEGRAL RENT-A-CAR
## Proyecto: RentaCore (nombre interno de desarrollo)
## Agencia: Finda / Desarrollado para cliente rent-a-car argentino

---

## CONTEXTO DEL PRODUCTO

Estás construyendo un software de gestión integral para empresas de alquiler de vehículos (rent-a-car) en Argentina. El sistema equivale funcionalmente a "Start Software" de ModalTech (startrentacar.com.ar), con mejoras en UX y stack moderno.

El sistema tiene DOS partes:
1. **Panel de administración interno** — usado por el personal del rent-a-car
2. **Sitio web público + motor de reservas online** — usado por los clientes finales

---

## STACK TECNOLÓGICO (NO NEGOCIABLE)

```
Framework:      Next.js 14+ con App Router (TypeScript)
UI:             Material UI v6 (MUI) — NO usar Tailwind ni shadcn
Base de datos:  Supabase (PostgreSQL + Auth + Storage + Realtime)
Deploy:         Vercel (main branch = production automático)
Pagos:          Mercado Pago — Checkout Pro para Argentina
Emails:         Resend + React Email para templates
Facturación:    ARCA (AFIP) vía AfipSDK (npm: afip.js) — wsfev1
Gráficos:       Recharts (compatible con MUI theme)
Forms:          React Hook Form + Zod
Estado global:  Zustand
Data fetching:  SWR (stale-while-revalidate)
PDF:            @react-pdf/renderer
Excel:          xlsx (SheetJS)
```

---

## ARQUITECTURA DE CARPETAS

```
/app
  /(admin)          ← Panel de administración (rutas privadas)
    /dashboard
    /calendario
    /reservas
    /vehiculos
    /clientes
    /agenda
    /reportes
    /tarifas
    /usuarios
    /configuracion
  /(public)         ← Sitio web del cliente final
    /                ← Landing + catálogo
    /reservar        ← Stepper de reserva
    /confirmacion    ← Post-pago
  /api
    /mercadopago
      /webhook       ← POST — confirma pago y activa reserva
      /preference    ← POST — crea preferencia MP
    /arca
      /facturar      ← POST — emite factura ARCA y devuelve CAE
    /reservas
      /disponibilidad ← GET — check disponibilidad por fechas+categoría
/components
  /admin             ← Componentes del panel
    /GanttCalendar   ← Componente Gantt custom (CSS Grid)
    /ReservaDrawer   ← Panel lateral detalle de reserva
    /KPICard
    /VehiculoCard
  /public            ← Componentes del sitio web
    /BuscadorFechas
    /VehiculoCatalogo
    /StepperReserva
  /shared            ← Compartidos
/lib
  /supabase.ts       ← cliente Supabase (server + client)
  /mercadopago.ts    ← cliente MP
  /arca.ts           ← cliente AfipSDK
  /resend.ts         ← cliente Resend
/emails
  /ConfirmacionReserva.tsx   ← Template React Email
  /VoucherReserva.tsx
/types
  /database.types.ts ← tipos generados por Supabase CLI
  /index.ts          ← tipos del dominio
```

---

## REGLAS DE DESARROLLO

### Base de datos
- SIEMPRE usar Row Level Security (RLS) en Supabase
- TODAS las tablas tienen `tenant_id` para arquitectura multi-tenant
- Usar `supabase gen types typescript` para regenerar tipos tras cada migración
- Las migraciones van en /supabase/migrations/
- Nunca hacer queries directas al cliente, siempre a través de Server Actions o API Routes

### Componente Gantt Calendar (CRÍTICO)
- CSS Grid con columnas para días del mes
- Filas = vehículos (patente + modelo)
- Bloques de reserva: width y position calculados por fechas
- Colores: verde=#2dd4a0 (confirmada/en_curso), amarillo=#f5a623 (pendiente), gris=#6b7280 (disponible)
- Click en bloque → abre ReservaDrawer con datos de la reserva
- Click en celda vacía → abre formulario nueva reserva pre-cargado con vehículo y fecha
- Debe soportar scroll horizontal para meses completos

### Estados de Reserva (flujo de negocio)
```
preventa → pendiente → confirmada → en_curso → devuelta
                                 ↘ cancelada
```
- preventa: cliente llenó form web, no pagó aún
- pendiente: pagó online pero operador no asignó vehículo
- confirmada: vehículo asignado, listo para entregar
- en_curso: cliente tiene el vehículo (se entregó)
- devuelta: cliente devolvió el vehículo
- cancelada: se canceló por cualquier razón

### Disponibilidad de vehículos
Un vehículo NO está disponible para una fecha si:
1. Tiene una reserva en estado confirmada/en_curso que solapa con esas fechas
2. Tiene un bloqueo_vehiculo que solapa con esas fechas
La query de disponibilidad debe considerar AMBOS casos.

### Motor de precios
El precio total de una reserva se calcula:
```
dias = ceiling((fecha_devolucion - fecha_entrega) / 86400 segundos)
tarifa_por_dia = buscar en tabla tarifas por (categoria_id, temporada activa en las fechas)
precio_base = dias × tarifa_por_dia
descuento = precio_base × (descuento_online_pct / 100)  [si paga online]
precio_coberturas = sumar coberturas seleccionadas
precio_adicionales = sumar adicionales seleccionados
TOTAL = precio_base - descuento + precio_coberturas + precio_adicionales
```

---

## MÓDULOS — DESCRIPCIÓN DETALLADA

### DASHBOARD
KPIs en cards superiores:
- Ingresos del mes (suma pagos del mes actual vs mes anterior con %Δ)
- Unidades propias / Unidades no propias (COUNT vehiculos by es_propio)
- Disponibles/Total (COUNT by estado)
- Ocupación % (en_alquiler / total) → gráfico Donut con Recharts

Widgets del body:
- Gráfico de barras "Días alquilados por mes" — comparativo últimos 3 años (2024/2025/2026)
- "Ranking vehículos últimos 6 meses" — top 3 por suma precio_total en reservas devueltas
- Cotizador rápido: selecciona fecha_desde, fecha_hasta, categoría → muestra precio estimado
- Tabla "Entregas del día" — reservas con estado=confirmada y fecha_entrega=hoy
- Tabla "Devoluciones del día" — reservas con estado=en_curso y fecha_devolucion=hoy

### CALENDARIO GANTT
- Vista por mes navegable (◀ Mes Año ▶)
- Selector de cantidad de meses (1 o 2)
- Toggle "Mostrar año siguiente"
- Botón "Asignar vehículo" en reservas sin vehiculo_id
- ReservaDrawer al hacer click en bloque

### RESERVAS — LISTADO
Filtros: fecha_desde, fecha_hasta, estado (multiselect), vehiculo (autocomplete por patente), cliente (autocomplete), vendedor, número de reserva.
Columnas de tabla (MUI DataGrid): id_corto, numero, fecha_entrega, fecha_devolucion, cliente (nombre+apellido), patente, vendedor, estado (Chip con color), km_entrega/devolucion, combustible_entrega/devolucion, precio_total, total_pagado, dias_devolucion (fecha_devolucion - fecha_entrega).
Toolbar con acciones sobre selección: Confirmar, Entregar, Devolver, Cancelar, Enviar email.
Footer: total de registros, total facturado, total pagado.
Botón exportar → llama SheetJS para generar .xlsx.

### RESERVA DRAWER (panel lateral)
Se abre con Drawer MUI de anchor="right" width=520px.
Header: #numero de reserva, botones (imprimir, compartir, cerrar).
Sección Cliente: nombre, apellido, email (clickeable), vehículo asignado (patente + modelo + foto pequeña).
Sección Entrega/Devolución: 
  - Botones acción: "Entregar con contabilización" | "Entregar" | "Devolver" | "Auto-asignar"
  - Fecha/hora entrega y devolución con lugar
Sección Importe:
  - Total acordado, Total pagado
  - Botón "Cargar pago" → abre mini-form (monto, método, referencia)
Sección Adicionales: lista de adicionales contratados.
Sección Observaciones: textarea editable.

### AGENDA DIARIA
DatePicker + botón buscar.
Dos tablas separadas: "En ruta" (entregas del día) y "Devoluciones".
Columnas: hora, patente+modelo, cliente, lugar, adicionales.
Fila con alert rojo si hay alguna condición crítica.
Botón "Exportar agenda" → PDF con react-pdf.

### SITIO WEB PÚBLICO (Motor de reservas)
Flujo en Stepper de 4 pasos:
1. Buscar → picker fecha_desde/fecha_hasta → resultados por categoría disponible
2. Seleccionar vehículo → ficha con foto, características, cobertura
3. Datos del pasajero → nombre, apellido, email, teléfono, DNI/Pasaporte, licencia, ciudad, país. Lugar de entrega (select + Nro vuelo si aeropuerto). Lugar de devolución. Código de descuento (validar contra tabla descuentos).
4. Pago → sidebar con resumen precio. Botón "Pagar ahora online -20% OFF" (Mercado Pago). Botón "Pagar en destino" (crea reserva en estado=pendiente sin pago).

### EMAILS CON RESEND
Template "ConfirmacionReserva":
- Logo del tenant (desde tenant.logo_url)
- Datos de la reserva: número, cliente, vehículo (foto + nombre), fechas, lugares
- Desglose de precios: precio por día × días, descuento, coberturas, total
- Datos de entrega: lugar exacto, nro vuelo si corresponde
- QR o link para ver la reserva

---

## INTEGRACIÓN MERCADO PAGO

```typescript
// lib/mercadopago.ts
import { MercadoPagoConfig, Preference } from 'mercadopago';

const client = new MercadoPagoConfig({ 
  accessToken: process.env.MP_ACCESS_TOKEN! 
});

// Crear preferencia desde una reserva
export async function crearPreferencia(reserva: Reserva) {
  const preference = new Preference(client);
  return preference.create({
    body: {
      items: [{
        id: reserva.id,
        title: `Reserva #${reserva.numero} — ${reserva.vehiculo?.modelo}`,
        quantity: 1,
        unit_price: reserva.precio_total * 0.8, // 20% descuento online
        currency_id: 'ARS'
      }],
      back_urls: {
        success: `${process.env.NEXT_PUBLIC_URL}/confirmacion?reserva=${reserva.id}`,
        failure: `${process.env.NEXT_PUBLIC_URL}/reservar?error=pago_fallido`,
      },
      auto_return: 'approved',
      external_reference: reserva.id,
      notification_url: `${process.env.NEXT_PUBLIC_URL}/api/mercadopago/webhook`
    }
  });
}
```

Webhook /api/mercadopago/webhook:
- Verificar que el pago esté 'approved'
- Actualizar reserva: estado=confirmada, total_pagado, mp_payment_id
- Crear registro en tabla pagos
- Enviar email confirmación vía Resend

---

## INTEGRACIÓN ARCA (FACTURACIÓN ELECTRÓNICA)

```typescript
// lib/arca.ts
import Afip from 'afip.js'; // npm install afip.js

const afip = new Afip({
  CUIT: process.env.ARCA_CUIT,         // CUIT del rent-a-car
  cert: process.env.ARCA_CERT,         // Certificado PEM (base64)
  key: process.env.ARCA_KEY,           // Clave privada PEM (base64)
  production: process.env.NODE_ENV === 'production',
  res_folder: '/tmp'
});

export async function emitirFactura(reserva: Reserva) {
  // Calcular IVA (21% para Responsable Inscripto)
  const impNeto = reserva.precio_total / 1.21;
  const impIVA = reserva.precio_total - impNeto;

  const data = {
    CantReg: 1,
    PtoVta: Number(process.env.ARCA_PTO_VTA),
    CbteTipo: 6,                          // Factura B (consumidor final)
    Concepto: 2,                           // Servicios
    DocTipo: 99,                           // Consumidor Final
    DocNro: 0,
    CbteDesde: await afip.ElectronicBilling.getLastVoucher(
      Number(process.env.ARCA_PTO_VTA), 6
    ) + 1,
    CbteHasta: await afip.ElectronicBilling.getLastVoucher(
      Number(process.env.ARCA_PTO_VTA), 6
    ) + 1,
    FchServDesde: formatDate(reserva.fecha_entrega),
    FchServHasta: formatDate(reserva.fecha_devolucion),
    FchVtoPago: formatDate(reserva.fecha_devolucion),
    ImpTotal: reserva.precio_total,
    ImpTotConc: 0,
    ImpNeto: impNeto,
    ImpOpEx: 0,
    ImpIVA: impIVA,
    ImpTrib: 0,
    MonId: 'PES',
    MonCotiz: 1,
    Iva: [{ Id: 5, BaseImp: impNeto, Importe: impIVA }], // 5 = 21%
    CondicionIVAReceptorId: 5  // NUEVO RG5616/2024: 5=Consumidor Final
  };

  const result = await afip.ElectronicBilling.createVoucher(data);
  // result.CAE, result.CAEFchVto
  return result;
}
```

IMPORTANTE sobre ARCA:
- Certificados deben estar en variables de entorno (NO en código)
- Los certificados de producción son por CUIT — el cliente debe tramitarlos
- En desarrollo usar production: false (homologación)
- Guardar CAE en tabla reservas campo factura_cae
- RG 5616/2024 activa desde abril 2025: campo CondicionIVAReceptorId OBLIGATORIO
- Web service wsfev1 v4.2 (manual marzo 2025)

---

## VARIABLES DE ENTORNO

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# Mercado Pago
MP_ACCESS_TOKEN=                # Producción
MP_ACCESS_TOKEN_TEST=           # Testing
NEXT_PUBLIC_MP_PUBLIC_KEY=

# Resend
RESEND_API_KEY=
RESEND_FROM_EMAIL=reservas@[dominio-cliente].com.ar

# ARCA
ARCA_CUIT=
ARCA_PTO_VTA=
ARCA_CERT=                      # Certificado PEM en base64
ARCA_KEY=                       # Clave privada PEM en base64

# App
NEXT_PUBLIC_URL=https://[dominio].vercel.app
```

---

## CONVENCIONES DE CÓDIGO

- TypeScript estricto en todo el proyecto (tsconfig strict: true)
- Nombrar componentes con PascalCase, hooks con use + PascalCase
- Cada módulo admin tiene su carpeta /app/(admin)/[modulo]/page.tsx
- Server Components por defecto, "use client" solo cuando sea necesario
- Siempre manejar loading y error states en cada fetch
- Usar MUI Skeleton para estados de carga
- Todas las fechas en UTC en la DB, mostrar en timezone local del usuario
- Montos en pesos argentinos (ARS), sin decimales en la UI
- Patentes en UPPERCASE siempre

---

## MULTI-TENANCY

El sistema soportará múltiples rent-a-cars como tenants. Cada tenant tiene:
- Su propio subdominio o path: [tenant].rentacore.ar o /[slug]/admin
- Datos completamente aislados por RLS en Supabase
- Logo y colores propios para emails y sitio web
- Sus propias credenciales de MP y ARCA (almacenadas encriptadas)
- Plan: free (sin web pública), starter, pro, enterprise

Para la primera versión (MVP para un cliente) NO implementar multi-tenancy completo — usar un tenant_id hardcodeado. Preparar la arquitectura para escalar después.

---

## REFERENCIA VISUAL

El sistema de referencia es Start Software (startrentacar.com.ar):
- Sidebar oscuro con iconos y texto
- Tabla principal con acciones masivas arriba
- Calendario Gantt con colores verde/amarillo para estados
- Drawer lateral para detalle de reserva
- Dashboard con cards KPI en la parte superior
- Gráficos de barras comparativos por año

DIFERENCIADORES del nuevo sistema sobre el de referencia:
- Stack moderno serverless (no PHP/MySQL)
- Facturación ARCA integrada nativamente
- Emails responsive con React Email
- Calendario Gantt interactivo (drag opcional)
- Analytics más completos
- PWA-ready para acceso móvil del personal

---

## INICIO DE SESIÓN DE TRABAJO

Cuando empieces una nueva sesión, primero:
1. Lee este master.md completo
2. Revisa el estado actual del código en /app
3. Consulta qué fase del roadmap estamos trabajando
4. Implementa según las convenciones definidas arriba

NO reinventes decisiones ya tomadas. Si hay algo que no está en este documento, pregunta antes de asumir.
