import { Document, Page, View, Text, StyleSheet } from '@react-pdf/renderer';
import type { ReservaConRelaciones } from '@/app/dashboard/reservas/actions';

export interface ReservaPDFProps {
  reserva: ReservaConRelaciones;
}

const s = StyleSheet.create({
  page: { padding: 32, fontFamily: 'Helvetica', fontSize: 9, backgroundColor: '#ffffff' },
  // Header
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', borderBottomWidth: 1.5, borderBottomColor: '#4f46e5', borderBottomStyle: 'solid', paddingBottom: 10, marginBottom: 16 },
  companyName: { fontFamily: 'Helvetica-Bold', fontSize: 14, color: '#1e1b4b' },
  companyInfo: { fontSize: 7, color: '#64748b', marginTop: 2 },
  docTitle: { textAlign: 'right' },
  docTitleText: { fontFamily: 'Helvetica-Bold', fontSize: 10, color: '#4f46e5' },
  docNumText: { fontFamily: 'Helvetica-Bold', fontSize: 14, color: '#1e1b4b', textAlign: 'right' },
  docDate: { fontSize: 7, color: '#64748b', textAlign: 'right', marginTop: 2 },
  // Two column section
  twoCol: { flexDirection: 'row', marginBottom: 12 },
  section: { marginBottom: 12 },
  sTitle: { fontFamily: 'Helvetica-Bold', fontSize: 8, color: '#4f46e5', textTransform: 'uppercase', marginBottom: 5, paddingBottom: 3, borderBottomWidth: 0.5, borderBottomColor: '#e2e8f0', borderBottomStyle: 'solid' },
  // Data rows
  dRow: { flexDirection: 'row', marginBottom: 3 },
  dLabel: { fontSize: 7.5, color: '#64748b', width: 110 },
  dValue: { fontSize: 7.5, fontFamily: 'Helvetica-Bold', flex: 1 },
  // Price table
  priceRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 3, borderBottomWidth: 0.3, borderBottomColor: '#f1f5f9', borderBottomStyle: 'solid' },
  pLabel: { fontSize: 8, color: '#374151' },
  pValue: { fontSize: 8, fontFamily: 'Helvetica-Bold', color: '#374151' },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 5, borderTopWidth: 1, borderTopColor: '#1e1b4b', borderTopStyle: 'solid', marginTop: 2 },
  totalLabel: { fontFamily: 'Helvetica-Bold', fontSize: 10, color: '#1e1b4b' },
  totalValue: { fontFamily: 'Helvetica-Bold', fontSize: 10, color: '#1e1b4b' },
  // Status
  statusRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 3 },
  greenText: { fontSize: 8, fontFamily: 'Helvetica-Bold', color: '#16a34a' },
  redText: { fontSize: 8, fontFamily: 'Helvetica-Bold', color: '#dc2626' },
  // Footer
  footer: { borderTopWidth: 0.5, borderTopColor: '#e2e8f0', borderTopStyle: 'solid', paddingTop: 8, marginTop: 16, textAlign: 'center' },
  footerText: { fontSize: 6.5, color: '#94a3b8' },
});

function d2(n: number) { return String(n).padStart(2, '0'); }

function fDate(iso: string): string {
  const d = new Date(iso);
  return `${d2(d.getDate())}/${d2(d.getMonth() + 1)}/${d.getFullYear()}`;
}

function fDateTime(iso: string): string {
  const d = new Date(iso);
  return `${d2(d.getDate())}/${d2(d.getMonth() + 1)}/${d.getFullYear()} ${d2(d.getHours())}:${d2(d.getMinutes())} hs`;
}

function fARS(n: number): string {
  return '$ ' + Math.abs(Math.round(n)).toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
}

function DR({ label, value }: { label: string; value: string }) {
  return (
    <View style={s.dRow}>
      <Text style={s.dLabel}>{label}</Text>
      <Text style={s.dValue}>{value}</Text>
    </View>
  );
}

function PRow({ label, value, green, red }: { label: string; value: string; green?: boolean; red?: boolean }) {
  const valueStyle = green ? s.greenText : red ? s.redText : s.pValue;
  return (
    <View style={s.priceRow}>
      <Text style={s.pLabel}>{label}</Text>
      <Text style={valueStyle}>{value}</Text>
    </View>
  );
}

export function ReservaPDF({ reserva }: ReservaPDFProps) {
  const dias = Math.ceil(
    (new Date(reserva.fecha_devolucion).getTime() - new Date(reserva.fecha_entrega).getTime()) / 86400000
  );
  const saldo = reserva.precio_total - reserva.total_pagado;
  const today = new Date();
  const fechaEmision = `${d2(today.getDate())}/${d2(today.getMonth() + 1)}/${today.getFullYear()}`;

  return (
    <Document title={`Reserva ${reserva.numero}`}>
      <Page size="A4" style={s.page}>

        {/* HEADER */}
        <View style={s.header}>
          <View>
            <Text style={s.companyName}>PREMIER RENT A CAR</Text>
            <Text style={s.companyInfo}>Sargento Cabral 1834 – Rivadavia – San Juan</Text>
            <Text style={s.companyInfo}>info@premierrentacars.com | 2645192219</Text>
          </View>
          <View style={s.docTitle}>
            <Text style={s.docTitleText}>COMPROBANTE DE RESERVA</Text>
            <Text style={s.docNumText}>#{reserva.numero}</Text>
            <Text style={s.docDate}>Emitido: {fechaEmision}</Text>
          </View>
        </View>

        {/* CLIENTE + VEHÍCULO */}
        <View style={s.twoCol}>
          <View style={{ flex: 1, paddingRight: 16 }}>
            <Text style={s.sTitle}>Cliente</Text>
            <DR label="Nombre" value={`${reserva.cliente.nombre} ${reserva.cliente.apellido}`} />
            <DR label="DNI / Pasaporte" value={reserva.cliente.dni_pasaporte} />
            <DR label="Email" value={reserva.cliente.email} />
            <DR label="Teléfono" value={reserva.cliente.telefono} />
            <DR label="Licencia" value={reserva.cliente.licencia_conducir} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={s.sTitle}>Vehículo</Text>
            {reserva.vehiculo ? (
              <View>
                <DR label="Categoría" value={reserva.vehiculo.categoria?.nombre ?? '—'} />
                <DR label="Patente" value={reserva.vehiculo.patente} />
                <DR label="Modelo" value={reserva.vehiculo.modelo} />
              </View>
            ) : (
              <Text style={{ fontSize: 8, color: '#f59e0b', fontFamily: 'Helvetica-Bold' }}>Sin vehículo asignado</Text>
            )}
          </View>
        </View>

        {/* FECHAS */}
        <View style={s.section}>
          <Text style={s.sTitle}>Fechas y Lugares</Text>
          <View style={s.twoCol}>
            <View style={{ flex: 1, paddingRight: 16 }}>
              <DR label="Entrega" value={fDateTime(reserva.fecha_entrega)} />
              <DR label="Lugar de entrega" value={reserva.lugar_entrega} />
              {reserva.numero_vuelo ? <DR label="Nro. vuelo" value={reserva.numero_vuelo} /> : null}
            </View>
            <View style={{ flex: 1 }}>
              <DR label="Devolución" value={fDateTime(reserva.fecha_devolucion)} />
              <DR label="Lugar de devolución" value={reserva.lugar_devolucion} />
              <DR label="Total de días" value={`${dias} día${dias !== 1 ? 's' : ''}`} />
            </View>
          </View>
        </View>

        {/* PRECIOS */}
        <View style={s.section}>
          <Text style={s.sTitle}>Detalle de Precios</Text>
          <PRow label={`Precio base (${dias} día${dias !== 1 ? 's' : ''})`} value={fARS(reserva.precio_base)} />
          {reserva.precio_coberturas > 0 && (
            <PRow label="Coberturas" value={fARS(reserva.precio_coberturas)} />
          )}
          {reserva.precio_adicionales > 0 && (
            <PRow label="Adicionales" value={fARS(reserva.precio_adicionales)} />
          )}
          {reserva.descuento_aplicado > 0 && (
            <PRow label="Descuento" value={`- ${fARS(reserva.descuento_aplicado)}`} green />
          )}
          <View style={s.totalRow}>
            <Text style={s.totalLabel}>TOTAL ACORDADO</Text>
            <Text style={s.totalValue}>{fARS(reserva.precio_total)}</Text>
          </View>
        </View>

        {/* ESTADO DE CUENTA */}
        <View style={s.section}>
          <Text style={s.sTitle}>Estado de Cuenta</Text>
          <View style={s.statusRow}>
            <Text style={s.pLabel}>Total pagado</Text>
            <Text style={s.greenText}>{fARS(reserva.total_pagado)}</Text>
          </View>
          {saldo > 0 && (
            <View style={s.statusRow}>
              <Text style={s.pLabel}>Saldo pendiente</Text>
              <Text style={s.redText}>{fARS(saldo)}</Text>
            </View>
          )}
          {saldo === 0 && (
            <View style={s.statusRow}>
              <Text style={s.pLabel}>Estado de pago</Text>
              <Text style={s.greenText}>CANCELADO</Text>
            </View>
          )}
        </View>

        {/* FOOTER */}
        <View style={s.footer}>
          <Text style={s.footerText}>
            Documento generado por RentaCore · Premier Rent A Car · {fechaEmision}
          </Text>
          <Text style={s.footerText}>
            Sargento Cabral 1834, Rivadavia, San Juan · info@premierrentacars.com · 2645192219
          </Text>
        </View>
      </Page>
    </Document>
  );
}
