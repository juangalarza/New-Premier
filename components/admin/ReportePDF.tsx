import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer';
import type { ReportesData, ReportesExtra } from '@/app/dashboard/reportes/actions';

const styles = StyleSheet.create({
  page:          { padding: 40, fontFamily: 'Helvetica', fontSize: 10, color: '#1e293b' },
  title:         { fontSize: 22, fontFamily: 'Helvetica-Bold', color: '#1e293b' },
  subtitle:      { fontSize: 10, color: '#64748b', marginTop: 4 },
  divider:       { borderBottomWidth: 1, borderBottomColor: '#e2e8f0', marginVertical: 14 },
  section:       { marginBottom: 18 },
  sectionTitle:  { fontSize: 11, fontFamily: 'Helvetica-Bold', marginBottom: 8, color: '#4f46e5' },
  kpiRow:        { flexDirection: 'row', gap: 10, marginBottom: 6 },
  kpiBox:        { flex: 1, padding: 10, backgroundColor: '#f8fafc', borderRadius: 4 },
  kpiLabel:      { fontSize: 8, color: '#64748b', marginBottom: 3 },
  kpiValue:      { fontSize: 14, fontFamily: 'Helvetica-Bold', color: '#1e293b' },
  tableHeader:   { flexDirection: 'row', backgroundColor: '#f1f5f9', padding: '5 8', borderRadius: 3, marginBottom: 2 },
  tableRow:      { flexDirection: 'row', padding: '4 8', borderBottomWidth: 1, borderBottomColor: '#f8fafc' },
  th:            { fontSize: 8, fontFamily: 'Helvetica-Bold', color: '#64748b' },
  td:            { fontSize: 9, color: '#334155' },
  tdBold:        { fontSize: 9, fontFamily: 'Helvetica-Bold', color: '#4f46e5' },
  tdGreen:       { fontSize: 9, fontFamily: 'Helvetica-Bold', color: '#10b981' },
  colNum:        { width: 20 },
  colMain:       { flex: 2 },
  colRight:      { flex: 1, textAlign: 'right' },
  footer:        { position: 'absolute', bottom: 28, left: 40, right: 40, textAlign: 'center', fontSize: 8, color: '#94a3b8' },
});

function ars(n: number) {
  return '$' + Math.round(n).toLocaleString('es-AR');
}

interface Props {
  data: ReportesData;
  extra: ReportesExtra;
  año: number;
}

export default function ReportePDF({ data, extra, año }: Props) {
  const activosMes = data.ingresosMensuales.filter(m => m.total > 0);

  return (
    <Document>
      <Page size="A4" style={styles.page}>

        {/* Header */}
        <Text style={styles.title}>Reporte Anual {año}</Text>
        <Text style={styles.subtitle}>Premier Rent A Car — Sistema de Gestión RentaCore</Text>
        <View style={styles.divider} />

        {/* KPIs */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>RESUMEN EJECUTIVO</Text>
          <View style={styles.kpiRow}>
            <View style={styles.kpiBox}>
              <Text style={styles.kpiLabel}>Total Facturado</Text>
              <Text style={styles.kpiValue}>{ars(data.totalIngresado)}</Text>
            </View>
            <View style={styles.kpiBox}>
              <Text style={styles.kpiLabel}>Total Reservas</Text>
              <Text style={styles.kpiValue}>{data.totalReservas}</Text>
            </View>
            <View style={styles.kpiBox}>
              <Text style={styles.kpiLabel}>Promedio / Reserva</Text>
              <Text style={styles.kpiValue}>{ars(data.ingresoPromedioPorReserva)}</Text>
            </View>
            <View style={styles.kpiBox}>
              <Text style={styles.kpiLabel}>Ocupación</Text>
              <Text style={styles.kpiValue}>{data.ocupacionPromedio}%</Text>
            </View>
          </View>
        </View>

        <View style={styles.divider} />

        {/* Ingresos mensuales */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>INGRESOS MENSUALES</Text>
          <View style={styles.tableHeader}>
            <Text style={[styles.th, styles.colMain]}>MES</Text>
            <Text style={[styles.th, styles.colRight]}>INGRESOS</Text>
            <Text style={[styles.th, styles.colRight]}>RESERVAS</Text>
          </View>
          {activosMes.map(m => (
            <View key={m.mesNum} style={styles.tableRow}>
              <Text style={[styles.td, styles.colMain]}>{m.mes}</Text>
              <Text style={[styles.tdBold, styles.colRight]}>{ars(m.total)}</Text>
              <Text style={[styles.td, styles.colRight]}>{m.count}</Text>
            </View>
          ))}
          {activosMes.length === 0 && (
            <Text style={[styles.td, { paddingLeft: 8, paddingTop: 6, color: '#94a3b8' }]}>Sin ingresos registrados para {año}.</Text>
          )}
        </View>

        <View style={styles.divider} />

        {/* Top Vehículos */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>TOP VEHÍCULOS (todos los tiempos)</Text>
          {data.topVehiculos.length > 0 ? (
            <>
              <View style={styles.tableHeader}>
                <Text style={[styles.th, styles.colNum]}>#</Text>
                <Text style={[styles.th, styles.colMain]}>VEHÍCULO</Text>
                <Text style={[styles.th, styles.colRight]}>FACTURADO</Text>
                <Text style={[styles.th, styles.colRight]}>RESERVAS</Text>
              </View>
              {data.topVehiculos.map((v, i) => (
                <View key={v.id} style={styles.tableRow}>
                  <Text style={[styles.td, styles.colNum]}>{i + 1}</Text>
                  <Text style={[styles.td, styles.colMain]}>{v.patente} — {v.modelo}</Text>
                  <Text style={[styles.tdBold, styles.colRight]}>{ars(v.total)}</Text>
                  <Text style={[styles.td, styles.colRight]}>{v.count}</Text>
                </View>
              ))}
            </>
          ) : (
            <Text style={[styles.td, { color: '#94a3b8' }]}>Sin datos de reservas devueltas.</Text>
          )}
        </View>

        {/* Top Clientes */}
        {extra.topClientes.length > 0 && (
          <>
            <View style={styles.divider} />
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>TOP CLIENTES — {año}</Text>
              <View style={styles.tableHeader}>
                <Text style={[styles.th, styles.colNum]}>#</Text>
                <Text style={[styles.th, styles.colMain]}>CLIENTE</Text>
                <Text style={[styles.th, styles.colRight]}>TOTAL</Text>
                <Text style={[styles.th, styles.colRight]}>RESERVAS</Text>
              </View>
              {extra.topClientes.map((c, i) => (
                <View key={c.id} style={styles.tableRow}>
                  <Text style={[styles.td, styles.colNum]}>{i + 1}</Text>
                  <Text style={[styles.td, styles.colMain]}>{c.nombre} {c.apellido}</Text>
                  <Text style={[styles.tdGreen, styles.colRight]}>{ars(c.total)}</Text>
                  <Text style={[styles.td, styles.colRight]}>{c.count}</Text>
                </View>
              ))}
            </View>
          </>
        )}

        {/* Por Categoría */}
        {extra.porCategoria.length > 0 && (
          <>
            <View style={styles.divider} />
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>INGRESOS POR CATEGORÍA — {año}</Text>
              <View style={styles.tableHeader}>
                <Text style={[styles.th, styles.colMain]}>CATEGORÍA</Text>
                <Text style={[styles.th, styles.colRight]}>TOTAL</Text>
                <Text style={[styles.th, styles.colRight]}>RESERVAS</Text>
              </View>
              {extra.porCategoria.map(c => (
                <View key={c.categoria_id} style={styles.tableRow}>
                  <Text style={[styles.td, styles.colMain]}>{c.nombre}</Text>
                  <Text style={[styles.tdGreen, styles.colRight]}>{ars(c.total)}</Text>
                  <Text style={[styles.td, styles.colRight]}>{c.count}</Text>
                </View>
              ))}
            </View>
          </>
        )}

        <Text style={styles.footer}>
          Generado por RentaCore — {new Date().toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' })}
        </Text>
      </Page>
    </Document>
  );
}
