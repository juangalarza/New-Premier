'use client';

import * as React from 'react';
import {
  Box, Grid, Card, CardContent, Typography, Table, TableHead,
  TableRow, TableCell, TableBody, Chip, Avatar, TextField,
  MenuItem, Button, Divider,
} from '@mui/material';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, PieChart, Pie, Cell,
} from 'recharts';
import { EmojiEventsOutlined, CalendarTodayOutlined, ReceiptLongOutlined, OpenInNewOutlined } from '@mui/icons-material';
import type { ChartDataItem, RankingVehiculo, EntregaHoy, UltimoGasto } from '@/types';
import { calcularCotizacion } from './actions';
import { useRouter } from 'next/navigation';

const GASTO_LABEL: Record<string, string> = {
  combustible: 'Combustible', mantenimiento: 'Mantenimiento', seguro: 'Seguro', otros: 'Otros',
};
const GASTO_COLOR: Record<string, string> = {
  combustible: '#f5a623', mantenimiento: '#4f46e5', seguro: '#0ea5e9', otros: '#6b7280',
};
const GASTO_BG: Record<string, string> = {
  combustible: '#fff8eb', mantenimiento: '#eef2ff', seguro: '#e0f2fe', otros: '#f1f5f9',
};

interface Props {
  chartData: ChartDataItem[];
  ranking: RankingVehiculo[];
  entregas: EntregaHoy[];
  devoluciones: EntregaHoy[];
  categorias: { id: string; nombre: string }[];
  ultimosGastos: UltimoGasto[];
}

function formatARS(v: number) {
  return new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(v);
}

function formatHora(iso: string) {
  return new Date(iso).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' });
}

const PIE_COLORS = ['#2dd4a0', '#f5a623', '#ef4444', '#6b7280'];

export default function DashboardCharts({ chartData, ranking, entregas, devoluciones, categorias, ultimosGastos }: Props) {
  const router = useRouter();
  const [cotFechaDesde, setCotFechaDesde] = React.useState('');
  const [cotFechaHasta, setCotFechaHasta] = React.useState('');
  const [cotCategoria, setCotCategoria] = React.useState('');
  const [cotPrecio, setCotPrecio] = React.useState<number | null | 'sin-tarifa'>(null);
  const [cotLoading, setCotLoading] = React.useState(false);

  const handleCotizar = async () => {
    if (!cotFechaDesde || !cotFechaHasta || !cotCategoria) return;
    setCotLoading(true);
    const precio = await calcularCotizacion(cotFechaDesde, cotFechaHasta, cotCategoria);
    setCotPrecio(precio ?? 'sin-tarifa');
    setCotLoading(false);
  };

  const tablaVacia = (msg: string) => (
    <Box sx={{ py: 4, textAlign: 'center' }}>
      <CalendarTodayOutlined sx={{ fontSize: 40, color: '#cbd5e1', mb: 1 }} />
      <Typography variant="body2" color="text.secondary">{msg}</Typography>
    </Box>
  );

  return (
    <>
      {/* Fila 2: Gráfico barras + Ranking + Cotizador */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        {/* Gráfico días alquilados */}
        <Grid size={{ xs: 12, md: 7 }}>
          <Card sx={{ height: '100%' }}>
            <CardContent sx={{ p: 3 }}>
              <Typography variant="h6" sx={{ fontWeight: 700, fontFamily: 'Outfit', mb: 3 }}>
                Días alquilados por mes
              </Typography>
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={chartData} margin={{ top: 0, right: 0, bottom: 0, left: -20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="mes" tick={{ fontSize: 12, fill: '#94a3b8' }} />
                  <YAxis tick={{ fontSize: 12, fill: '#94a3b8' }} />
                  <Tooltip
                    contentStyle={{ borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 13 }}
                    formatter={((v: number) => [`${v} días`]) as never}
                  />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                  <Bar dataKey="año2024" name="2024" fill="#c7d2fe" radius={[3, 3, 0, 0]} />
                  <Bar dataKey="año2025" name="2025" fill="#818cf8" radius={[3, 3, 0, 0]} />
                  <Bar dataKey="año2026" name="2026" fill="#4f46e5" radius={[3, 3, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </Grid>

        {/* Ranking + Cotizador */}
        <Grid size={{ xs: 12, md: 5 }}>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3, height: '100%' }}>
            {/* Ranking */}
            <Card>
              <CardContent sx={{ p: 3 }}>
                <Typography variant="h6" sx={{ fontWeight: 700, fontFamily: 'Outfit', mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
                  <EmojiEventsOutlined sx={{ color: '#f5a623' }} />
                  Top vehículos (6 meses)
                </Typography>
                {ranking.length === 0 ? (
                  <Typography variant="body2" color="text.secondary">Sin reservas aún.</Typography>
                ) : (
                  ranking.map((v, i) => (
                    <Box key={v.vehiculo_id}>
                      <Box
                        onClick={() => router.push(`/dashboard/vehiculos/${v.vehiculo_id}`)}
                        sx={{
                          display: 'flex', alignItems: 'center', gap: 1.5, py: 1.5,
                          cursor: 'pointer', borderRadius: 2, px: 1, mx: -1,
                          transition: 'background 0.15s',
                          '&:hover': { bgcolor: '#f8fafc' },
                        }}
                      >
                        <Typography sx={{ fontWeight: 800, color: i === 0 ? '#f5a623' : '#94a3b8', minWidth: 20, fontSize: '1rem' }}>
                          #{i + 1}
                        </Typography>
                        <Avatar src={v.foto_url ?? undefined} sx={{ width: 36, height: 36, borderRadius: '8px' }} variant="rounded" />
                        <Box sx={{ flexGrow: 1, minWidth: 0 }}>
                          <Typography variant="body2" sx={{ fontWeight: 700, lineHeight: 1.2 }} noWrap>
                            {v.marca} {v.modelo}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">{v.patente}</Typography>
                        </Box>
                        <Box sx={{ textAlign: 'right' }}>
                          <Typography variant="body2" sx={{ fontWeight: 700, color: '#4f46e5', fontSize: '0.8rem' }}>
                            {formatARS(v.total_facturado)}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">{v.total_reservas} res.</Typography>
                        </Box>
                        <OpenInNewOutlined sx={{ fontSize: 14, color: '#cbd5e1' }} />
                      </Box>
                      {i < ranking.length - 1 && <Divider />}
                    </Box>
                  ))
                )}
              </CardContent>
            </Card>

            {/* Cotizador rápido */}
            <Card sx={{ flexGrow: 1 }}>
              <CardContent sx={{ p: 3 }}>
                <Typography variant="h6" sx={{ fontWeight: 700, fontFamily: 'Outfit', mb: 2 }}>
                  Cotizador rápido
                </Typography>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                  <TextField
                    label="Fecha desde"
                    type="date"
                    size="small"
                    slotProps={{ inputLabel: { shrink: true } }}
                    value={cotFechaDesde}
                    onChange={e => setCotFechaDesde(e.target.value)}
                    fullWidth
                  />
                  <TextField
                    label="Fecha hasta"
                    type="date"
                    size="small"
                    slotProps={{ inputLabel: { shrink: true } }}
                    value={cotFechaHasta}
                    onChange={e => setCotFechaHasta(e.target.value)}
                    fullWidth
                  />
                  <TextField
                    select
                    label="Categoría"
                    size="small"
                    value={cotCategoria}
                    onChange={e => setCotCategoria(e.target.value)}
                    fullWidth
                  >
                    {categorias.map(c => (
                      <MenuItem key={c.id} value={c.id}>{c.nombre}</MenuItem>
                    ))}
                  </TextField>
                  <Button
                    variant="contained"
                    onClick={handleCotizar}
                    disabled={cotLoading || !cotFechaDesde || !cotFechaHasta || !cotCategoria}
                    sx={{ fontWeight: 600 }}
                  >
                    {cotLoading ? 'Calculando...' : 'Calcular precio'}
                  </Button>
                  {cotPrecio !== null && (
                    <Box sx={{ p: 2, borderRadius: 2, bgcolor: cotPrecio === 'sin-tarifa' ? '#fef9c3' : '#f0fdf4', border: `1px solid ${cotPrecio === 'sin-tarifa' ? '#fde047' : '#bbf7d0'}`, textAlign: 'center' }}>
                      {cotPrecio === 'sin-tarifa' ? (
                        <Typography variant="body2" color="warning.main" sx={{ fontWeight: 600 }}>Sin tarifa para ese período</Typography>
                      ) : (
                        <>
                          <Typography variant="caption" color="text.secondary">Precio estimado</Typography>
                          <Typography variant="h5" sx={{ fontWeight: 800, color: '#16a34a', fontFamily: 'Outfit' }}>
                            {formatARS(cotPrecio as number)}
                          </Typography>
                        </>
                      )}
                    </Box>
                  )}
                </Box>
              </CardContent>
            </Card>
          </Box>
        </Grid>
      </Grid>

      {/* Fila 3: Últimos gastos */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid size={{ xs: 12 }}>
          <Card>
            <CardContent sx={{ p: 3 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <ReceiptLongOutlined sx={{ color: '#ef4444' }} />
                  <Typography variant="h6" sx={{ fontWeight: 700, fontFamily: 'Outfit' }}>
                    Últimos gastos
                  </Typography>
                </Box>
                <Chip label={ultimosGastos.length} size="small" sx={{ bgcolor: '#fee2e2', color: '#dc2626', fontWeight: 700 }} />
              </Box>
              {ultimosGastos.length === 0 ? (
                <Box sx={{ py: 4, textAlign: 'center' }}>
                  <ReceiptLongOutlined sx={{ fontSize: 40, color: '#cbd5e1', mb: 1 }} />
                  <Typography variant="body2" color="text.secondary">Sin gastos registrados aún</Typography>
                </Box>
              ) : (
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell sx={{ fontWeight: 700, fontSize: '0.75rem' }}>Fecha</TableCell>
                      <TableCell sx={{ fontWeight: 700, fontSize: '0.75rem' }}>Categoría</TableCell>
                      <TableCell sx={{ fontWeight: 700, fontSize: '0.75rem' }}>Descripción</TableCell>
                      <TableCell sx={{ fontWeight: 700, fontSize: '0.75rem' }} align="right">Monto</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {ultimosGastos.map(g => (
                      <TableRow key={g.id} hover>
                        <TableCell sx={{ fontSize: '0.8rem', fontWeight: 600, whiteSpace: 'nowrap' }}>
                          {new Date(g.fecha + 'T12:00:00').toLocaleDateString('es-AR', { day: '2-digit', month: 'short', year: 'numeric' })}
                        </TableCell>
                        <TableCell>
                          <Chip
                            label={GASTO_LABEL[g.categoria] ?? g.categoria}
                            size="small"
                            sx={{
                              bgcolor: GASTO_BG[g.categoria] ?? '#f1f5f9',
                              color: GASTO_COLOR[g.categoria] ?? '#6b7280',
                              fontWeight: 700,
                              fontSize: '0.7rem',
                            }}
                          />
                        </TableCell>
                        <TableCell sx={{ fontSize: '0.8rem', color: '#64748b' }}>
                          {g.descripcion ?? '—'}
                        </TableCell>
                        <TableCell align="right" sx={{ fontSize: '0.85rem', fontWeight: 700, color: '#dc2626', whiteSpace: 'nowrap' }}>
                          {formatARS(g.monto)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Fila 4: Entregas y Devoluciones del día */}
      <Grid container spacing={3}>
        <Grid size={{ xs: 12, md: 6 }}>
          <Card>
            <CardContent sx={{ p: 3 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
                <Typography variant="h6" sx={{ fontWeight: 700, fontFamily: 'Outfit' }}>
                  Entregas de hoy
                </Typography>
                <Chip label={entregas.length} size="small" sx={{ bgcolor: '#dcfce7', color: '#16a34a', fontWeight: 700 }} />
              </Box>
              {entregas.length === 0 ? tablaVacia('Sin entregas programadas para hoy') : (
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell sx={{ fontWeight: 700, fontSize: '0.75rem' }}>Hora</TableCell>
                      <TableCell sx={{ fontWeight: 700, fontSize: '0.75rem' }}>Cliente</TableCell>
                      <TableCell sx={{ fontWeight: 700, fontSize: '0.75rem' }}>Vehículo</TableCell>
                      <TableCell sx={{ fontWeight: 700, fontSize: '0.75rem' }}>Lugar</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {entregas.map(e => (
                      <TableRow key={e.id} hover>
                        <TableCell sx={{ fontSize: '0.8rem', fontWeight: 600 }}>{formatHora(e.fecha_entrega)}</TableCell>
                        <TableCell sx={{ fontSize: '0.8rem' }}>{e.cliente_nombre} {e.cliente_apellido}</TableCell>
                        <TableCell sx={{ fontSize: '0.8rem' }}>{e.patente ?? '—'}</TableCell>
                        <TableCell sx={{ fontSize: '0.8rem', maxWidth: 120 }} >{e.lugar_entrega}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </Grid>

        <Grid size={{ xs: 12, md: 6 }}>
          <Card>
            <CardContent sx={{ p: 3 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
                <Typography variant="h6" sx={{ fontWeight: 700, fontFamily: 'Outfit' }}>
                  Devoluciones de hoy
                </Typography>
                <Chip label={devoluciones.length} size="small" sx={{ bgcolor: '#fef3c7', color: '#d97706', fontWeight: 700 }} />
              </Box>
              {devoluciones.length === 0 ? tablaVacia('Sin devoluciones programadas para hoy') : (
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell sx={{ fontWeight: 700, fontSize: '0.75rem' }}>Hora</TableCell>
                      <TableCell sx={{ fontWeight: 700, fontSize: '0.75rem' }}>Cliente</TableCell>
                      <TableCell sx={{ fontWeight: 700, fontSize: '0.75rem' }}>Vehículo</TableCell>
                      <TableCell sx={{ fontWeight: 700, fontSize: '0.75rem' }}>Lugar</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {devoluciones.map(d => (
                      <TableRow key={d.id} hover>
                        <TableCell sx={{ fontSize: '0.8rem', fontWeight: 600 }}>{formatHora(d.fecha_entrega)}</TableCell>
                        <TableCell sx={{ fontSize: '0.8rem' }}>{d.cliente_nombre} {d.cliente_apellido}</TableCell>
                        <TableCell sx={{ fontSize: '0.8rem' }}>{d.patente ?? '—'}</TableCell>
                        <TableCell sx={{ fontSize: '0.8rem', maxWidth: 120, whiteSpace: 'nowrap' }}>{d.lugar_entrega}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </>
  );
}
