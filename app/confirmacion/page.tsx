import type { Metadata } from 'next';
import Link from 'next/link';
import { Box, Container, Typography, Paper, Button, Stack, Chip, Divider, Alert } from '@mui/material';
import { CheckCircle, CalendarMonth, LocationOn, ArrowForward, Home } from '@mui/icons-material';
import { createAdminClient } from '@/lib/supabase/admin';

export const metadata: Metadata = {
  title: 'Reserva confirmada — Finda Car Rental Argentina',
};

type ReservaDetalle = {
  id: string;
  numero: string;
  id_corto: string;
  estado: string;
  fecha_entrega: string;
  fecha_devolucion: string;
  lugar_entrega: string;
  lugar_devolucion: string;
  precio_total: number;
  total_pagado: number;
  vehiculo: { marca: string; modelo: string; patente: string; foto_url: string | null } | null;
  cliente: { nombre: string; apellido: string; email: string } | null;
};

const ESTADO_LABELS: Record<string, { label: string; color: 'success' | 'warning' | 'info' | 'default' }> = {
  preventa: { label: 'Recibida — pendiente de pago', color: 'warning' },
  pendiente: { label: 'Pago recibido', color: 'info' },
  confirmada: { label: 'Confirmada ✓', color: 'success' },
};

interface Props {
  searchParams: Promise<{ reserva?: string; numero?: string; status?: string }>;
}

export default async function ConfirmacionPage({ searchParams }: Props) {
  const params = await searchParams;
  const reservaId = params.reserva;

  if (!reservaId) {
    return (
      <Container maxWidth="sm" sx={{ py: 8, textAlign: 'center' }}>
        <Typography variant="h5" sx={{ mb: 2 }}>Reserva no encontrada</Typography>
        <Button component={Link} href="/" variant="contained" sx={{ bgcolor: '#4f46e5' }}>Volver al inicio</Button>
      </Container>
    );
  }

  const supabase = createAdminClient();
  const { data: reservaRaw } = await supabase
    .from('reservas')
    .select('id, numero, id_corto, estado, fecha_entrega, fecha_devolucion, lugar_entrega, lugar_devolucion, precio_total, total_pagado, vehiculo:vehiculos(marca, modelo, patente, foto_url), cliente:clientes(nombre, apellido, email)')
    .eq('id', reservaId)
    .single();

  const reserva = reservaRaw as unknown as ReservaDetalle | null;

  if (!reserva) {
    return (
      <Container maxWidth="sm" sx={{ py: 8, textAlign: 'center' }}>
        <Typography variant="h5" sx={{ mb: 2 }}>Reserva no encontrada</Typography>
        <Button component={Link} href="/" variant="contained" sx={{ bgcolor: '#4f46e5' }}>Volver al inicio</Button>
      </Container>
    );
  }

  const estadoInfo = ESTADO_LABELS[reserva.estado] ?? { label: reserva.estado, color: 'default' as const };
  const pagado = reserva.total_pagado > 0;
  const fmt = new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', minimumFractionDigits: 0 });

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: '#f8fafc' }}>
      {/* Header */}
      <Box sx={{ bgcolor: '#fff', borderBottom: '1px solid #e2e8f0', px: 3, py: 2 }}>
        <Container maxWidth="lg">
          <Stack direction="row" sx={{ alignItems: 'center', gap: 1 }}>
            <Box sx={{ width: 32, height: 32, borderRadius: '8px', background: 'linear-gradient(135deg, #4f46e5, #06b6d4)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <CheckCircle sx={{ color: '#fff', fontSize: 18 }} />
            </Box>
            <Typography sx={{ fontWeight: 800, fontFamily: 'Outfit', fontSize: '1.1rem' }}>Finda Car Rental Argentina</Typography>
          </Stack>
        </Container>
      </Box>

      <Container maxWidth="md" sx={{ py: 6 }}>
        {/* Success header */}
        <Box sx={{ textAlign: 'center', mb: 5 }}>
          <Box sx={{
            width: 80, height: 80, borderRadius: '50%',
            bgcolor: pagado ? '#dcfce7' : '#fef3c7',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            mx: 'auto', mb: 2,
          }}>
            <CheckCircle sx={{ fontSize: 44, color: pagado ? '#16a34a' : '#d97706' }} />
          </Box>
          <Typography variant="h4" sx={{ fontWeight: 800, fontFamily: 'Outfit', mb: 1 }}>
            {pagado ? '¡Reserva confirmada!' : '¡Reserva recibida!'}
          </Typography>
          <Typography variant="body1" color="text.secondary" sx={{ maxWidth: 480, mx: 'auto' }}>
            {pagado
              ? 'Tu pago fue procesado correctamente. Te enviamos un email con todos los detalles.'
              : 'Recibimos tu solicitud de reserva. Abonás al momento de retirar el vehículo.'}
          </Typography>
        </Box>

        <Paper variant="outlined" sx={{ borderRadius: 3, overflow: 'hidden' }}>
          {/* Booking header */}
          <Box sx={{ bgcolor: '#4f46e5', px: 4, py: 3, color: '#fff' }}>
            <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'center' }}>
              <Box>
                <Typography sx={{ fontFamily: 'Outfit', fontWeight: 700, fontSize: '1.25rem' }}>
                  Reserva #{reserva.numero}
                </Typography>
                <Typography sx={{ opacity: 0.8, fontSize: 14 }}>
                  Código: {reserva.id_corto}
                </Typography>
              </Box>
              <Chip
                label={estadoInfo.label}
                color={estadoInfo.color}
                sx={{ fontWeight: 700, bgcolor: '#fff', color: '#4f46e5' }}
              />
            </Stack>
          </Box>

          <Box sx={{ p: 4 }}>
            <Stack spacing={3}>
              {/* Cliente */}
              {reserva.cliente && (
                <Box>
                  <Typography variant="subtitle2" sx={{ fontWeight: 700, color: 'text.secondary', textTransform: 'uppercase', letterSpacing: 1, mb: 1 }}>
                    Conductor
                  </Typography>
                  <Typography sx={{ fontWeight: 600 }}>
                    {reserva.cliente.nombre} {reserva.cliente.apellido}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">{reserva.cliente.email}</Typography>
                </Box>
              )}

              <Divider />

              {/* Vehículo */}
              {reserva.vehiculo && (
                <Box>
                  <Typography variant="subtitle2" sx={{ fontWeight: 700, color: 'text.secondary', textTransform: 'uppercase', letterSpacing: 1, mb: 1 }}>
                    Vehículo asignado
                  </Typography>
                  <Stack direction="row" sx={{ gap: 2, alignItems: 'center' }}>
                    {reserva.vehiculo.foto_url && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={reserva.vehiculo.foto_url}
                        alt={reserva.vehiculo.modelo}
                        style={{ width: 100, height: 70, objectFit: 'cover', borderRadius: 8 }}
                      />
                    )}
                    <Box>
                      <Typography sx={{ fontWeight: 600 }}>{reserva.vehiculo.marca} {reserva.vehiculo.modelo}</Typography>
                      <Typography variant="body2" color="text.secondary" sx={{ fontFamily: 'monospace', letterSpacing: 1 }}>
                        {reserva.vehiculo.patente}
                      </Typography>
                    </Box>
                  </Stack>
                </Box>
              )}

              <Divider />

              {/* Fechas y lugares */}
              <Box>
                <Typography variant="subtitle2" sx={{ fontWeight: 700, color: 'text.secondary', textTransform: 'uppercase', letterSpacing: 1, mb: 1.5 }}>
                  Detalle del alquiler
                </Typography>
                <Stack spacing={1.5}>
                  <Stack direction="row" sx={{ gap: 1.5 }}>
                    <CalendarMonth sx={{ fontSize: 20, color: '#4f46e5', mt: 0.2 }} />
                    <Box>
                      <Typography variant="body2" sx={{ fontWeight: 600 }}>Período</Typography>
                      <Typography variant="body2" color="text.secondary">
                        {new Date(reserva.fecha_entrega).toLocaleDateString('es-AR', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' })}
                        {' → '}
                        {new Date(reserva.fecha_devolucion).toLocaleDateString('es-AR', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' })}
                      </Typography>
                    </Box>
                  </Stack>
                  <Stack direction="row" sx={{ gap: 1.5 }}>
                    <LocationOn sx={{ fontSize: 20, color: '#4f46e5', mt: 0.2 }} />
                    <Box>
                      <Typography variant="body2" sx={{ fontWeight: 600 }}>Entrega: {reserva.lugar_entrega}</Typography>
                      <Typography variant="body2" color="text.secondary">Devolución: {reserva.lugar_devolucion}</Typography>
                    </Box>
                  </Stack>
                </Stack>
              </Box>

              <Divider />

              {/* Total */}
              <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'center' }}>
                <Typography sx={{ fontWeight: 700, fontSize: '1rem' }}>Total a abonar</Typography>
                <Typography sx={{ fontWeight: 800, fontSize: '1.5rem', fontFamily: 'Outfit', color: '#4f46e5' }}>
                  {fmt.format(reserva.precio_total)}
                </Typography>
              </Stack>

              {pagado && (
                <Alert sx={{ bgcolor: '#dcfce7', color: '#15803d', border: '1px solid #86efac', borderRadius: 2 }}>
                  Pago de {fmt.format(reserva.total_pagado)} recibido correctamente via Mercado Pago.
                </Alert>
              )}
            </Stack>
          </Box>
        </Paper>

        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ mt: 4, justifyContent: 'center' }}>
          <Button component={Link} href="/" variant="outlined" startIcon={<Home />}
            sx={{ borderColor: '#4f46e5', color: '#4f46e5', fontWeight: 600 }}>
            Volver al inicio
          </Button>
          <Button component={Link} href="/reservar" variant="contained" endIcon={<ArrowForward />}
            sx={{ bgcolor: '#4f46e5', '&:hover': { bgcolor: '#4338ca' }, fontWeight: 600 }}>
            Nueva reserva
          </Button>
        </Stack>
      </Container>
    </Box>
  );
}
