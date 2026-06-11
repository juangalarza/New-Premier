import { Document, Page, View, Text, StyleSheet, Image } from '@react-pdf/renderer';
import type { ReservaConRelaciones } from '@/app/dashboard/reservas/actions';

export interface ContratoPDFProps {
  reserva: ReservaConRelaciones;
  tenant?: { nombre: string };
  siluetaSrc?: string;
}

const s = StyleSheet.create({
  page: { padding: 18, fontFamily: 'Helvetica', fontSize: 8, backgroundColor: '#ffffff' },
  bold: { fontFamily: 'Helvetica-Bold' },
  // Header
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', borderBottomWidth: 1, borderBottomColor: '#000000', borderBottomStyle: 'solid', paddingBottom: 5, marginBottom: 7 },
  companyName: { fontFamily: 'Helvetica-Bold', fontSize: 12 },
  companyInfo: { fontSize: 6, color: '#555555', marginTop: 1.5 },
  warnText: { fontFamily: 'Helvetica-Bold', fontSize: 6, marginTop: 3 },
  contractTitle: { fontSize: 8, textAlign: 'right' },
  contractNum: { fontFamily: 'Helvetica-Bold', fontSize: 10, textAlign: 'right' },
  // Body two columns
  twoCol: { flexDirection: 'row' },
  leftCol: { flex: 1, paddingRight: 10 },
  rightCol: { flex: 1 },
  // Section titles
  sTitle: { fontFamily: 'Helvetica-Bold', fontSize: 7.5, textDecoration: 'underline', marginTop: 7, marginBottom: 3 },
  // Field rows
  fRow: { flexDirection: 'row', marginBottom: 2, alignItems: 'flex-end' },
  fLabel: { fontFamily: 'Helvetica-Bold', fontSize: 6.5, width: 90 },
  fValue: { fontSize: 6.5, flex: 1, borderBottomWidth: 0.5, borderBottomColor: '#aaaaaa', borderBottomStyle: 'solid', paddingBottom: 1 },
  fBlank: { fontSize: 6.5, flex: 1, borderBottomWidth: 0.5, borderBottomColor: '#aaaaaa', borderBottomStyle: 'solid', paddingBottom: 1, color: '#ffffff' },
  // Tarifa table
  tHeader: { flexDirection: 'row', backgroundColor: '#eeeeee', paddingVertical: 2, paddingHorizontal: 2, marginTop: 2 },
  tRow: { flexDirection: 'row', paddingVertical: 1.5, paddingHorizontal: 2, borderBottomWidth: 0.3, borderBottomColor: '#dddddd', borderBottomStyle: 'solid' },
  tC1: { flex: 3, fontSize: 6.5 },
  tC2: { flex: 1.2, fontSize: 6.5, textAlign: 'right' },
  tC3: { flex: 1.2, fontSize: 6.5, textAlign: 'right' },
  tTotal: { flexDirection: 'row', paddingVertical: 2, paddingHorizontal: 2, borderTopWidth: 0.8, borderTopColor: '#000000', borderTopStyle: 'solid', marginTop: 1 },
  // Footer
  reparaciones: { fontSize: 5.5, color: '#333333', borderTopWidth: 0.5, borderTopColor: '#000000', borderTopStyle: 'solid', paddingTop: 4, marginTop: 7, lineHeight: 1.4 },
  footerTwoCol: { flexDirection: 'row', marginTop: 5 },
  footerLeft: { flex: 1, paddingRight: 8 },
  footerRight: { flex: 1 },
  legalSmall: { fontSize: 5.5, color: '#333333', lineHeight: 1.4, marginBottom: 2 },
  redBold: { fontFamily: 'Helvetica-Bold', fontSize: 6, color: '#cc0000', marginBottom: 2 },
  signLabel: { fontFamily: 'Helvetica-Bold', fontSize: 5.5, color: '#555555', marginBottom: 1 },
  signLine: { borderBottomWidth: 0.5, borderBottomColor: '#000000', borderBottomStyle: 'solid', marginBottom: 7, height: 14 },
  // Page 2
  legalPage: { padding: 28, fontFamily: 'Helvetica', fontSize: 7.5 },
  legalTitle: { fontFamily: 'Helvetica-Bold', fontSize: 11, marginBottom: 10, textAlign: 'center' },
  legalSection: { fontFamily: 'Helvetica-Bold', fontSize: 7.5, marginTop: 7, marginBottom: 2 },
  legalBody: { fontSize: 7, lineHeight: 1.6, color: '#222222' },
  // Silueta del vehículo
  siluetaWrap: { marginTop: 6, marginBottom: 3 },
  siluetaImg: { width: '100%', height: 140 },
});

function d2(n: number) { return String(n).padStart(2, '0'); }

function fDate(iso: string | null): string {
  if (!iso) return '______';
  const d = new Date(iso.length === 10 ? iso + 'T12:00:00' : iso);
  return `${d2(d.getDate())}/${d2(d.getMonth() + 1)}/${d.getFullYear()}`;
}

function fDateTime(iso: string): string {
  const d = new Date(iso);
  return `${d2(d.getDate())}/${d2(d.getMonth() + 1)}/${d.getFullYear()} ${d2(d.getHours())}:${d2(d.getMinutes())} hs`;
}

function fARS(n: number): string {
  return '$ ' + Math.abs(Math.round(n)).toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
}

function FRow({ label, value, blank, labelW }: { label: string; value?: string | null; blank?: boolean; labelW?: number }) {
  return (
    <View style={s.fRow}>
      <Text style={[s.fLabel, labelW ? { width: labelW } : {}]}>{label}:</Text>
      <Text style={blank ? s.fBlank : s.fValue}>{blank ? ' ' : (value ?? '')}</Text>
    </View>
  );
}

const CONCEPTOS_TARIFA = [
  'HORAS EXTRAS $10.000',
  'CONDUCTOR ADICIONAL',
  'ENTREGA AEROPUERTO',
  'DEVOLUCIÓN AEROPUERTO',
  'ENTREGA/DEV. F/H',
  'SILLA BEBÉ/BOOSTER',
  'OTROS',
];

export function ContratoPDF({ reserva, tenant, siluetaSrc }: ContratoPDFProps) {
  const dias = Math.ceil(
    (new Date(reserva.fecha_devolucion).getTime() - new Date(reserva.fecha_entrega).getTime()) / 86400000
  );
  const precioXDia = dias > 0 ? Math.round(reserva.precio_base / dias) : reserva.precio_base;
  const saldo = reserva.precio_total - reserva.total_pagado;
  const kmContratados: number = reserva.km_contratados ?? 0;
  const kmDiario = dias > 0 && kmContratados > 0 ? Math.round(kmContratados / dias) : 0;

  return (
    <Document title={`Contrato ${reserva.numero}`}>
      <Page size="A4" style={s.page}>

        {/* HEADER */}
        <View style={s.header}>
          <View>
            <Text style={s.companyName}>{tenant?.nombre ?? 'PREMIER RENT A CAR'}</Text>
            <Text style={s.companyInfo}>Sargento Cabral 1834 – Rivadavia – San Juan</Text>
            <Text style={s.companyInfo}>info@premierrentacars.com | 2645192219</Text>
            <Text style={s.warnText}>ANTE CUALQUIER IMPREVISTO COMUNICARSE AL NÚMERO QUE FIGURA EN EL CONTRATO</Text>
          </View>
          <View>
            <Text style={s.contractTitle}>Contrato de alquiler</Text>
            <Text style={s.contractNum}>#{reserva.numero}</Text>
          </View>
        </View>

        {/* BODY */}
        <View style={s.twoCol}>

          {/* COLUMNA IZQUIERDA */}
          <View style={s.leftCol}>
            <Text style={s.sTitle}>DATOS DEL CLIENTE</Text>
            <FRow label="NOMBRE" value={reserva.cliente.nombre} />
            <FRow label="APELLIDO" value={reserva.cliente.apellido} />
            <FRow label="DNI" value={reserva.cliente.dni_pasaporte} />
            <FRow label="F. NACIMIENTO" value={fDate(reserva.cliente.fecha_nacimiento)} />
            <FRow label="TELÉFONO" value={reserva.cliente.telefono} />
            <FRow label="CONDUCTOR" value={`${reserva.cliente.nombre} ${reserva.cliente.apellido}`} />

            <Text style={s.sTitle}>DATOS TARJETA DE CRÉDITO</Text>
            <FRow label="NÚMERO" blank />
            <View style={s.fRow}>
              <Text style={[s.fLabel, { width: 75 }]}>VENCIMIENTO:</Text>
              <Text style={[s.fBlank, { flex: 1 }]}> </Text>
              <Text style={[s.fLabel, { width: 55, marginLeft: 5 }]}>COD. SEG.:</Text>
              <Text style={[s.fBlank, { flex: 0.8 }]}> </Text>
            </View>

            <Text style={s.sTitle}>INFORMACIÓN DE TARIFA</Text>
            <View style={s.tHeader}>
              <Text style={[s.tC1, { fontFamily: 'Helvetica-Bold' }]}>CONCEPTO</Text>
              <Text style={[s.tC2, { fontFamily: 'Helvetica-Bold' }]}>UNIT.</Text>
              <Text style={[s.tC3, { fontFamily: 'Helvetica-Bold' }]}>SUBTOTAL</Text>
            </View>
            <View style={s.tRow}>
              <Text style={s.tC1}>{dias} DÍAS × VALOR DIARIO</Text>
              <Text style={s.tC2}>{fARS(precioXDia)}</Text>
              <Text style={s.tC3}>{fARS(reserva.precio_base)}</Text>
            </View>
            <View style={s.tRow}>
              <Text style={s.tC1}>{kmContratados > 0 ? `${kmContratados} KM CONTRATADO` : 'KM CONTRATADO'}</Text>
              <Text style={s.tC2}></Text>
              <Text style={s.tC3}></Text>
            </View>
            {CONCEPTOS_TARIFA.map(c => (
              <View key={c} style={s.tRow}>
                <Text style={s.tC1}>{c}</Text>
                <Text style={s.tC2}></Text>
                <Text style={s.tC3}></Text>
              </View>
            ))}
            <View style={s.tTotal}>
              <Text style={[s.tC1, { fontFamily: 'Helvetica-Bold' }]}>TOTAL</Text>
              <Text style={[s.tC3, { fontFamily: 'Helvetica-Bold', flex: 2.4 }]}>{fARS(reserva.precio_total)}</Text>
            </View>
            <View style={s.tRow}>
              <Text style={[s.tC1, { fontFamily: 'Helvetica-Bold' }]}>ANTICIPO</Text>
              <Text style={[s.tC3, { fontFamily: 'Helvetica-Bold', flex: 2.4 }]}>{fARS(reserva.total_pagado)}</Text>
            </View>
            <View style={s.tRow}>
              <Text style={[s.tC1, { fontFamily: 'Helvetica-Bold' }]}>SALDO PENDIENTE</Text>
              <Text style={[s.tC3, { fontFamily: 'Helvetica-Bold', flex: 2.4 }]}>{fARS(saldo)}</Text>
            </View>
          </View>

          {/* COLUMNA DERECHA */}
          <View style={s.rightCol}>
            <Text style={s.sTitle}>INFORMACIÓN DEL ALQUILER</Text>
            <FRow label="FECHA ENTREGA" value={fDateTime(reserva.fecha_entrega)} />
            <FRow label="FECHA DEVOLUCIÓN" value={fDateTime(reserva.fecha_devolucion)} />
            <FRow label="LUGAR ENTREGA" value={reserva.lugar_entrega} />
            <FRow label="LUGAR DEVOLUCIÓN" value={reserva.lugar_devolucion} />
            {reserva.numero_vuelo ? <FRow label="NRO. VUELO" value={reserva.numero_vuelo} /> : null}

            <Text style={s.sTitle}>DATOS DEL VEHÍCULO</Text>
            {reserva.vehiculo ? (
              <View>
                <FRow label="CATEGORÍA" value={reserva.vehiculo.categoria?.nombre ?? '—'} />
                <FRow label="PATENTE" value={reserva.vehiculo.patente} />
                <FRow label="MODELO" value={reserva.vehiculo.modelo} />
                <View style={s.fRow}>
                  <Text style={[s.fLabel, { width: 68 }]}>KM INICIAL:</Text>
                  <Text style={[s.fValue, { flex: 1 }]}>{reserva.km_entrega != null ? String(reserva.km_entrega) : '______'}</Text>
                  <Text style={[s.fLabel, { width: 55, marginLeft: 4 }]}>KM FINAL:</Text>
                  <Text style={[s.fBlank, { flex: 1 }]}> </Text>
                </View>
                <View style={s.fRow}>
                  <Text style={[s.fLabel, { width: 68 }]}>KM DIARIO:</Text>
                  <Text style={[s.fValue, { flex: 1 }]}>{kmDiario > 0 ? String(kmDiario) : '______'}</Text>
                  <Text style={[s.fLabel, { width: 55, marginLeft: 4 }]}>KM TOTAL:</Text>
                  <Text style={[s.fValue, { flex: 1 }]}>{kmContratados > 0 ? String(kmContratados) : '______'}</Text>
                </View>
                <View style={s.fRow}>
                  <Text style={[s.fLabel, { width: 68 }]}>KM EXTRA $:</Text>
                  <Text style={[s.fBlank, { flex: 1 }]}> </Text>
                  <Text style={[s.fLabel, { width: 55, marginLeft: 4 }]}>COMBUSTIBLE:</Text>
                  <Text style={[s.fValue, { flex: 1 }]}>{reserva.combustible_entrega ?? '______'}</Text>
                </View>
                <View style={s.fRow}>
                  <Text style={[s.fLabel, { width: 105 }]}>COMB. FALTANTE $:</Text>
                  <Text style={[s.fBlank, { flex: 1 }]}> </Text>
                </View>
                <View style={[s.fRow, { marginTop: 4 }]}>
                  <Text style={{ fontSize: 6 }}>FRANQUICIA POR SINIESTRO: 3% / 5% valor del vehículo</Text>
                </View>
                <View style={s.fRow}>
                  <Text style={{ fontSize: 6 }}>FRANQUICIA ROBO/VUELCO: $8.000.000</Text>
                </View>
                {siluetaSrc ? (
                  <View style={s.siluetaWrap}>
                    <Image style={s.siluetaImg} src={siluetaSrc} />
                  </View>
                ) : null}
              </View>
            ) : (
              <View style={{ padding: 4 }}>
                <Text style={{ fontSize: 7, color: '#92400e' }}>Sin vehículo asignado</Text>
              </View>
            )}

            <Text style={[s.sTitle, { marginTop: 9 }]}>OBSERVACIONES</Text>
            <View style={{ borderWidth: 0.5, borderColor: '#aaaaaa', borderStyle: 'solid', padding: 4, minHeight: 32 }}>
              <Text style={{ fontSize: 6.5 }}>{reserva.observaciones ?? ''}</Text>
            </View>
          </View>
        </View>

        {/* VALORES REPARACIONES */}
        <Text style={s.reparaciones}>
          Paño chapa $160.000 | Parabrisa $200.000/$450.000 | Llanta $80.000/$700.000 | Cerradura $180.000 | Copia llave $200.000 | Paño pintura $180.000 | Óptica/faro $90.000/$450.000 | Cubierta $200.000/$600.000 | Limpieza tapizado $150.000 | Lustrado/pulido $200.000
        </Text>

        {/* LEGALES + FIRMA */}
        <View style={s.footerTwoCol}>
          <View style={s.footerLeft}>
            <Text style={s.legalSmall}>
              TODA EVENTUALIDAD QUE PUDIERA OCASIONAR UN DAÑO AL VEHÍCULO (ACCIDENTE, ROBO PARCIAL O TOTAL, VUELCO, GRANIZO, ETC.) DEBERÁ SER NOTIFICADA INMEDIATAMENTE A LA EMPRESA. EL INCUMPLIMIENTO DE ESTA OBLIGACIÓN HACE PERDER AL LOCATARIO EL BENEFICIO DE LA COBERTURA CONTRATADA.
            </Text>
            <Text style={s.redBold}>
              EL DESBLOQUEO DE LA TARJETA SE REALIZARÁ 24HS DESPUÉS DE LA DEVOLUCIÓN DEL VEHÍCULO EN PERFECTAS CONDICIONES.
            </Text>
            <Text style={s.legalSmall}>LLAMADAS/WHATSAPP: 2645192219</Text>
          </View>
          <View style={s.footerRight}>
            <Text style={[s.legalSmall, { fontFamily: 'Helvetica-Bold', marginBottom: 5 }]}>
              ACEPTO LOS TÉRMINOS Y CONDICIONES DEL CONTRATO DE ALQUILER:
            </Text>
            <Text style={s.signLabel}>FECHA</Text>
            <View style={s.signLine} />
            <Text style={s.signLabel}>FIRMA</Text>
            <View style={s.signLine} />
            <Text style={s.signLabel}>ACLARACIÓN</Text>
            <View style={s.signLine} />
            <Text style={s.signLabel}>DNI</Text>
            <View style={s.signLine} />
          </View>
        </View>
      </Page>

      {/* PÁGINA 2 — CONDICIONES GENERALES */}
      <Page size="A4" style={s.legalPage}>
        <Text style={s.legalTitle}>CONDICIONES GENERALES DE ALQUILER</Text>
        <Text style={s.legalSection}>1. OBLIGACIONES DEL LOCATARIO</Text>
        <Text style={s.legalBody}>El locatario se compromete a usar el vehículo únicamente para fines lícitos, respetando el Código de Tránsito vigente, y a devolver la unidad en las mismas condiciones en que la recibió, salvo el desgaste normal de uso.</Text>
        <Text style={s.legalSection}>2. PROHIBICIONES</Text>
        <Text style={s.legalBody}>Queda expresamente prohibido: a) Subalquilar o ceder el vehículo a terceros; b) Conducir bajo efectos de alcohol o sustancias estupefacientes; c) Transportar sustancias peligrosas o ilícitas; d) Participar en competencias o carreras; e) Conducir fuera de caminos pavimentados sin autorización expresa.</Text>
        <Text style={s.legalSection}>3. DAÑOS Y RESPONSABILIDAD</Text>
        <Text style={s.legalBody}>Cualquier daño producido al vehículo, sea por accidente, robo, granizo u otro siniestro, deberá ser comunicado de manera inmediata a la empresa. El locatario es responsable de los daños hasta el monto de la franquicia establecida. La cobertura no aplica cuando el siniestro sea consecuencia de conducta imprudente o temeraria.</Text>
        <Text style={s.legalSection}>4. COMBUSTIBLE</Text>
        <Text style={s.legalBody}>El vehículo se entrega con el nivel de combustible indicado en el contrato y deberá ser devuelto con el mismo nivel. En caso contrario, se cargará el costo del faltante según precio de mercado vigente.</Text>
        <Text style={s.legalSection}>5. KILÓMETROS</Text>
        <Text style={s.legalBody}>En caso de que el locatario exceda los kilómetros contratados, se cobrará un adicional por km recorrido según la tarifa vigente informada al momento de la contratación.</Text>
        <Text style={s.legalSection}>6. HORAS EXTRAS</Text>
        <Text style={s.legalBody}>El vehículo deberá ser devuelto en el horario pactado. Las horas de retraso serán facturadas según la tarifa de horas extras establecida ($10.000 por hora adicional).</Text>
        <Text style={s.legalSection}>7. TARJETA DE CRÉDITO</Text>
        <Text style={s.legalBody}>El importe retenido en la tarjeta de crédito como garantía será desbloqueado dentro de las 24 horas hábiles posteriores a la devolución del vehículo, previa verificación de su estado.</Text>
        <Text style={s.legalSection}>8. MULTAS E INFRACCIONES</Text>
        <Text style={s.legalBody}>Cualquier multa de tránsito generada durante el período de alquiler es responsabilidad exclusiva del locatario. En caso de que la empresa deba afrontar el pago de multas, el locatario se compromete a reembolsar el importe más los gastos administrativos correspondientes.</Text>
        <Text style={s.legalSection}>9. DOCUMENTACIÓN</Text>
        <Text style={s.legalBody}>El locatario declara haber recibido el vehículo junto con la documentación correspondiente (tarjeta verde, seguro) y se compromete a conservarla y devolverla en las mismas condiciones.</Text>
        <Text style={s.legalSection}>10. JURISDICCIÓN</Text>
        <Text style={s.legalBody}>Para cualquier controversia que surja del presente contrato, las partes se someten a la jurisdicción de los Tribunales Ordinarios de la Ciudad de San Juan, renunciando a cualquier otro fuero que pudiera corresponder.</Text>
        <View style={{ marginTop: 20, borderTopWidth: 0.5, borderTopColor: '#aaaaaa', borderTopStyle: 'solid', paddingTop: 6 }}>
          <Text style={[s.legalBody, { textAlign: 'center', color: '#555555' }]}>
            PREMIER RENT A CAR — Sargento Cabral 1834, Rivadavia, San Juan — Tel: 2645192219 — info@premierrentacars.com
          </Text>
        </View>
      </Page>
    </Document>
  );
}
