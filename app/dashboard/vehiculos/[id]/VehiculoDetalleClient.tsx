'use client';

import * as React from 'react';
import {
  Box, Grid, Card, CardContent, Typography, Chip, Avatar,
  Button, Table, TableHead, TableRow, TableCell, TableBody, Divider,
} from '@mui/material';
import {
  ArrowBackOutlined, DirectionsCarOutlined, StoreOutlined,
  SpeedOutlined, LocalGasStationOutlined, EventOutlined,
} from '@mui/icons-material';
import { useRouter } from 'next/navigation';
import type { Vehiculo } from '@/types';
import type { ReservaDetalleRow } from './actions';

interface Props {
  vehiculo: Vehiculo;
  reservas: ReservaDetalleRow[];
}

function formatARS(v: number) {
  return new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(v);
}

function formatFecha(iso: string) {
  return new Date(iso + (iso.includes('T') ? '' : 'T12:00:00')).toLocaleDateString('es-AR', {
    day: '2-digit', month: 'short', year: 'numeric',
  });
}

const ESTADO_COLORS: Record<string, string> = {
  disponible: '#dcfce7', alquilado: '#fef9c3', taller: '#fed7aa', bloqueado: '#f1f5f9',
};
const ESTADO_TEXT: Record<string, string> = {
  disponible: '#16a34a', alquilado: '#ca8a04', taller: '#ea580c', bloqueado: '#6b7280',
};
const ESTADO_LABEL: Record<string, string> = {
  disponible: 'Disponible', alquilado: 'Alquilado', taller: 'En taller', bloqueado: 'Bloqueado',
};

const RESERVA_ESTADO_COLORS: Record<string, string> = {
  preventa: '#e0f2fe', pendiente: '#fef3c7', confirmada: '#dbeafe',
  en_curso: '#dcfce7', devuelta: '#f1f5f9', cancelada: '#fee2e2',
};
const RESERVA_ESTADO_TEXT: Record<string, string> = {
  preventa: '#0ea5e9', pendiente: '#d97706', confirmada: '#1d4ed8',
  en_curso: '#16a34a', devuelta: '#6b7280', cancelada: '#dc2626',
};
const RESERVA_ESTADO_LABEL: Record<string, string> = {
  preventa: 'Preventa', pendiente: 'Pendiente', confirmada: 'Confirmada',
  en_curso: 'En curso', devuelta: 'Devuelta', cancelada: 'Cancelada',
};

export default function VehiculoDetalleClient({ vehiculo: v, reservas }: Props) {
  const router = useRouter();

  const hace6Meses = new Date();
  hace6Meses.setMonth(hace6Meses.getMonth() - 6);

  const totalReservas = reservas.length;
  const totalFacturado = reservas.reduce((s, r) => s + r.precio_total, 0);
  const facturado6m = reservas
    .filter(r => r.estado === 'devuelta' && new Date(r.fecha_devolucion) >= hace6Meses)
    .reduce((s, r) => s + r.precio_total, 0);
  const promedio = totalReservas > 0 ? Math.round(totalFacturado / totalReservas) : 0;

  const kpis = [
    { label: 'Total reservas', value: totalReservas, color: '#4f46e5', format: 'num' },
    { label: 'Facturado total', value: totalFacturado, color: '#16a34a', format: 'ars' },
    { label: 'Facturado (6m)', value: facturado6m, color: '#0ea5e9', format: 'ars' },
    { label: 'Promedio / reserva', value: promedio, color: '#f5a623', format: 'ars' },
  ] as const;

  return (
    <Box>
      {/* Header */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
        <Button
          startIcon={<ArrowBackOutlined />}
          onClick={() => router.push('/dashboard/vehiculos')}
          sx={{ color: '#64748b', fontWeight: 600 }}
        >
          Vehículos
        </Button>
        <Typography sx={{ color: '#cbd5e1' }}>/</Typography>
        <Typography sx={{ fontWeight: 700, color: '#1e293b', fontFamily: 'Outfit' }}>
          {v.marca} {v.modelo} · {v.patente}
        </Typography>
      </Box>

      {/* Vehicle card */}
      <Card sx={{ mb: 3 }}>
        <CardContent sx={{ p: 3 }}>
          <Box sx={{ display: 'flex', gap: 3, alignItems: 'flex-start', flexWrap: 'wrap' }}>
            <Avatar
              src={v.foto_url ?? undefined}
              variant="rounded"
              sx={{ width: 96, height: 72, borderRadius: '12px', bgcolor: '#f1f5f9', flexShrink: 0 }}
            >
              <DirectionsCarOutlined sx={{ fontSize: 40, color: '#94a3b8' }} />
            </Avatar>
            <Box sx={{ flexGrow: 1, minWidth: 200 }}>
              <Typography variant="h5" sx={{ fontWeight: 800, fontFamily: 'Outfit', mb: 0.5 }}>
                {v.marca} {v.modelo}
              </Typography>
              <Typography sx={{ fontFamily: 'monospace', fontWeight: 700, fontSize: '1.1rem', color: '#475569', mb: 1.5 }}>
                {v.patente}
              </Typography>
              <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                <Chip
                  label={ESTADO_LABEL[v.estado] ?? v.estado}
                  size="small"
                  sx={{ bgcolor: ESTADO_COLORS[v.estado] ?? '#f1f5f9', color: ESTADO_TEXT[v.estado] ?? '#64748b', fontWeight: 600 }}
                />
                <Chip
                  label={v.es_propio ? 'Propio' : 'Tercero'}
                  size="small"
                  variant="outlined"
                  sx={{ fontWeight: 600, color: v.es_propio ? '#4f46e5' : '#6b7280' }}
                />
                {v.categoria && (
                  <Chip label={v.categoria.nombre} size="small" sx={{ bgcolor: '#e0e7ff', color: '#4f46e5', fontWeight: 600 }} />
                )}
              </Box>
            </Box>
            <Divider orientation="vertical" flexItem sx={{ mx: 1 }} />
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5, minWidth: 180 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <EventOutlined sx={{ fontSize: 16, color: '#94a3b8' }} />
                <Typography variant="body2" color="text.secondary">Año:</Typography>
                <Typography variant="body2" sx={{ fontWeight: 700 }}>{v.anio}</Typography>
              </Box>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <SpeedOutlined sx={{ fontSize: 16, color: '#94a3b8' }} />
                <Typography variant="body2" color="text.secondary">Km:</Typography>
                <Typography variant="body2" sx={{ fontWeight: 700 }}>{v.km_actual.toLocaleString('es-AR')}</Typography>
              </Box>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <LocalGasStationOutlined sx={{ fontSize: 16, color: '#94a3b8' }} />
                <Typography variant="body2" color="text.secondary">Combustible:</Typography>
                <Typography variant="body2" sx={{ fontWeight: 700 }}>{v.combustible_actual}</Typography>
              </Box>
              {v.sucursal && (
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <StoreOutlined sx={{ fontSize: 16, color: '#94a3b8' }} />
                  <Typography variant="body2" color="text.secondary">Sucursal:</Typography>
                  <Typography variant="body2" sx={{ fontWeight: 700 }}>{(v.sucursal as any).nombre}</Typography>
                </Box>
              )}
            </Box>
          </Box>
        </CardContent>
      </Card>

      {/* KPI row */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        {kpis.map(k => (
          <Grid key={k.label} size={{ xs: 6, sm: 3 }}>
            <Card>
              <CardContent sx={{ p: 2.5, textAlign: 'center' }}>
                <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  {k.label}
                </Typography>
                <Typography variant="h5" sx={{ fontWeight: 800, color: k.color, fontFamily: 'Outfit', mt: 0.5 }}>
                  {k.format === 'ars' ? formatARS(k.value as number) : k.value}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* Historial de reservas */}
      <Card>
        <CardContent sx={{ p: 3, pb: 1 }}>
          <Typography variant="h6" sx={{ fontWeight: 700, fontFamily: 'Outfit', mb: 2 }}>
            Historial de reservas
          </Typography>
        </CardContent>
        {reservas.length === 0 ? (
          <Box sx={{ py: 6, textAlign: 'center' }}>
            <DirectionsCarOutlined sx={{ fontSize: 48, color: '#cbd5e1', mb: 1, display: 'block', mx: 'auto' }} />
            <Typography color="text.secondary">Sin reservas para este vehículo</Typography>
          </Box>
        ) : (
          <Table>
            <TableHead>
              <TableRow sx={{ '& th': { fontWeight: 700, fontSize: '0.8rem', color: '#64748b', bgcolor: '#f8fafc', borderBottom: '2px solid #e2e8f0' } }}>
                <TableCell>Reserva</TableCell>
                <TableCell>Cliente</TableCell>
                <TableCell>Entrega</TableCell>
                <TableCell>Devolución</TableCell>
                <TableCell>Días</TableCell>
                <TableCell>Estado</TableCell>
                <TableCell align="right">Total</TableCell>
                <TableCell align="right">Cobrado</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {reservas.map(r => {
                const dias = Math.max(
                  1,
                  Math.ceil(
                    (new Date(r.fecha_devolucion).getTime() - new Date(r.fecha_entrega).getTime()) / 86400000
                  )
                );
                const pendiente = r.precio_total - r.total_pagado;
                return (
                  <TableRow key={r.id} hover sx={{ '& td': { borderBottom: '1px solid #f1f5f9' } }}>
                    <TableCell>
                      <Chip
                        label={r.numero}
                        size="small"
                        sx={{ bgcolor: '#f1f5f9', color: '#475569', fontFamily: 'monospace', fontWeight: 700, fontSize: '0.75rem' }}
                      />
                    </TableCell>
                    <TableCell>
                      {r.cliente ? (
                        <Box>
                          <Typography variant="body2" sx={{ fontWeight: 600 }}>
                            {r.cliente.nombre} {r.cliente.apellido}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">{r.cliente.email}</Typography>
                        </Box>
                      ) : (
                        <Typography variant="body2" color="text.secondary">—</Typography>
                      )}
                    </TableCell>
                    <TableCell sx={{ fontSize: '0.82rem', whiteSpace: 'nowrap' }}>{formatFecha(r.fecha_entrega)}</TableCell>
                    <TableCell sx={{ fontSize: '0.82rem', whiteSpace: 'nowrap' }}>{formatFecha(r.fecha_devolucion)}</TableCell>
                    <TableCell sx={{ fontSize: '0.82rem' }}>{dias}d</TableCell>
                    <TableCell>
                      <Chip
                        label={RESERVA_ESTADO_LABEL[r.estado] ?? r.estado}
                        size="small"
                        sx={{
                          bgcolor: RESERVA_ESTADO_COLORS[r.estado] ?? '#f1f5f9',
                          color: RESERVA_ESTADO_TEXT[r.estado] ?? '#6b7280',
                          fontWeight: 600, fontSize: '0.72rem',
                        }}
                      />
                    </TableCell>
                    <TableCell align="right" sx={{ fontWeight: 700, fontSize: '0.85rem', color: '#1e293b', whiteSpace: 'nowrap' }}>
                      {formatARS(r.precio_total)}
                    </TableCell>
                    <TableCell align="right" sx={{ whiteSpace: 'nowrap' }}>
                      <Typography variant="body2" sx={{ fontWeight: 700, color: '#16a34a', fontSize: '0.85rem' }}>
                        {formatARS(r.total_pagado)}
                      </Typography>
                      {pendiente > 0 && (
                        <Typography variant="caption" sx={{ color: '#dc2626', display: 'block' }}>
                          -{formatARS(pendiente)} pend.
                        </Typography>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
        <Box sx={{ px: 3, py: 1.5, borderTop: reservas.length > 0 ? '1px solid #f1f5f9' : 'none' }}>
          <Typography variant="caption" color="text.secondary">
            {reservas.length} reserva{reservas.length !== 1 ? 's' : ''} en total
          </Typography>
        </Box>
      </Card>
    </Box>
  );
}
