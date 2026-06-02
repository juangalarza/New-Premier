import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer';
import type { EntregaAgenda, DevolucionAgenda } from './actions';

const s = StyleSheet.create({
  page: { padding: 40, fontFamily: 'Helvetica', fontSize: 10, color: '#1e293b' },
  header: { marginBottom: 20, borderBottom: '1px solid #e2e8f0', paddingBottom: 12 },
  title: { fontSize: 18, fontFamily: 'Helvetica-Bold', color: '#4f46e5' },
  subtitle: { fontSize: 11, color: '#64748b', marginTop: 4 },
  section: { marginTop: 16 },
  sectionTitle: { fontSize: 13, fontFamily: 'Helvetica-Bold', marginBottom: 8, color: '#1e293b' },
  table: { width: '100%' },
  thead: { flexDirection: 'row', backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0', paddingVertical: 6, paddingHorizontal: 4 },
  theadCell: { fontFamily: 'Helvetica-Bold', fontSize: 9, color: '#64748b', flex: 1 },
  row: { flexDirection: 'row', paddingVertical: 7, paddingHorizontal: 4, borderBottom: '1px solid #f1f5f9' },
  cell: { flex: 1, fontSize: 9 },
  alert: { backgroundColor: '#fef2f2' },
  alertCell: { flex: 1, fontSize: 9, color: '#dc2626' },
  empty: { textAlign: 'center', color: '#94a3b8', marginTop: 10, fontSize: 10 },
  badge: { backgroundColor: '#f0fdf4', color: '#16a34a', paddingHorizontal: 4, paddingVertical: 2, borderRadius: 4 },
});

function formatHora(iso: string) {
  try {
    return new Date(iso).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit', hour12: false });
  } catch {
    return '--:--';
  }
}

function formatFecha(fecha: string) {
  try {
    return new Date(fecha + 'T12:00:00').toLocaleDateString('es-AR', { day: '2-digit', month: 'long', year: 'numeric' });
  } catch {
    return fecha;
  }
}

interface Props {
  fecha: string;
  entregas: EntregaAgenda[];
  devoluciones: DevolucionAgenda[];
}

export default function AgendaPDF({ fecha, entregas, devoluciones }: Props) {
  return (
    <Document>
      <Page size="A4" style={s.page}>
        <View style={s.header}>
          <Text style={s.title}>Agenda Diaria — RentaCore</Text>
          <Text style={s.subtitle}>{formatFecha(fecha)}</Text>
        </View>

        <View style={s.section}>
          <Text style={s.sectionTitle}>Entregas del Día ({entregas.length})</Text>
          <View style={s.table}>
            <View style={s.thead}>
              <Text style={[s.theadCell, { flex: 0.6 }]}>Hora</Text>
              <Text style={[s.theadCell, { flex: 1.2 }]}>Vehículo</Text>
              <Text style={[s.theadCell, { flex: 1.5 }]}>Cliente</Text>
              <Text style={[s.theadCell, { flex: 1.5 }]}>Lugar</Text>
              <Text style={[s.theadCell, { flex: 0.8 }]}>Estado</Text>
            </View>
            {entregas.length === 0 && <Text style={s.empty}>Sin entregas programadas</Text>}
            {entregas.map(e => {
              const sinVehiculo = !e.vehiculo;
              return (
                <View key={e.id} style={[s.row, sinVehiculo ? s.alert : {}]}>
                  <Text style={[sinVehiculo ? s.alertCell : s.cell, { flex: 0.6 }]}>{formatHora(e.fecha_entrega)}</Text>
                  <Text style={[sinVehiculo ? s.alertCell : s.cell, { flex: 1.2 }]}>
                    {e.vehiculo ? `${e.vehiculo.patente} · ${e.vehiculo.modelo}` : '⚠ Sin asignar'}
                  </Text>
                  <Text style={[sinVehiculo ? s.alertCell : s.cell, { flex: 1.5 }]}>{e.cliente.nombre} {e.cliente.apellido}</Text>
                  <Text style={[sinVehiculo ? s.alertCell : s.cell, { flex: 1.5 }]}>
                    {e.lugar_entrega}{e.numero_vuelo ? ` · Vl. ${e.numero_vuelo}` : ''}
                  </Text>
                  <Text style={[sinVehiculo ? s.alertCell : s.cell, { flex: 0.8 }]}>{e.estado}</Text>
                </View>
              );
            })}
          </View>
        </View>

        <View style={s.section}>
          <Text style={s.sectionTitle}>Devoluciones del Día ({devoluciones.length})</Text>
          <View style={s.table}>
            <View style={s.thead}>
              <Text style={[s.theadCell, { flex: 0.6 }]}>Hora</Text>
              <Text style={[s.theadCell, { flex: 1.2 }]}>Vehículo</Text>
              <Text style={[s.theadCell, { flex: 1.5 }]}>Cliente</Text>
              <Text style={[s.theadCell, { flex: 1.5 }]}>Lugar</Text>
              <Text style={[s.theadCell, { flex: 0.8 }]}>Km dev.</Text>
            </View>
            {devoluciones.length === 0 && <Text style={s.empty}>Sin devoluciones programadas</Text>}
            {devoluciones.map(d => (
              <View key={d.id} style={s.row}>
                <Text style={[s.cell, { flex: 0.6 }]}>{formatHora(d.fecha_devolucion)}</Text>
                <Text style={[s.cell, { flex: 1.2 }]}>{d.vehiculo ? `${d.vehiculo.patente} · ${d.vehiculo.modelo}` : '—'}</Text>
                <Text style={[s.cell, { flex: 1.5 }]}>{d.cliente.nombre} {d.cliente.apellido}</Text>
                <Text style={[s.cell, { flex: 1.5 }]}>{d.lugar_devolucion}</Text>
                <Text style={[s.cell, { flex: 0.8 }]}>{d.km_devolucion ?? '—'}</Text>
              </View>
            ))}
          </View>
        </View>

        <Text style={{ marginTop: 24, fontSize: 8, color: '#94a3b8', textAlign: 'right' }}>
          Generado por RentaCore · {new Date().toLocaleString('es-AR')}
        </Text>
      </Page>
    </Document>
  );
}
