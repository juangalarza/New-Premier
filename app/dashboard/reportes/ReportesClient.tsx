'use client';

import * as React from 'react';
import {
  Box, Typography, Paper, Grid, Stack, Select, MenuItem, FormControl,
  Avatar, LinearProgress,
} from '@mui/material';
import {
  BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis,
  CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';
import {
  TrendingUpOutlined, DirectionsCarOutlined, ReceiptLongOutlined, PercentOutlined,
} from '@mui/icons-material';
import { getReportesData } from './actions';
import type { ReportesData } from './actions';

const ESTADO_COLORS: Record<string, string> = {
  confirmada: '#2dd4a0',
  en_curso: '#4f46e5',
  devuelta: '#10b981',
  pendiente: '#f59e0b',
  preventa: '#94a3b8',
  cancelada: '#f87171',
};

const ESTADO_LABELS: Record<string, string> = {
  confirmada: 'Confirmada', en_curso: 'En curso', devuelta: 'Devuelta',
  pendiente: 'Pendiente', preventa: 'Preventa', cancelada: 'Cancelada',
};

function formatARS(n: number) {
  return '$' + n.toLocaleString('es-AR', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
}

function KPICard({ icon, label, value, sub, color }: {
  icon: React.ReactNode; label: string; value: string; sub?: string; color: string;
}) {
  return (
    <Paper variant="outlined" sx={{ p: 2.5, borderRadius: 2 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
        <Box sx={{ width: 40, height: 40, borderRadius: 1.5, bgcolor: color + '15', display: 'flex', alignItems: 'center', justifyContent: 'center', color }}>
          {icon}
        </Box>
        <Box>
          <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 500 }}>{label}</Typography>
          <Typography variant="h6" sx={{ fontWeight: 700, fontFamily: 'Outfit' }}>{value}</Typography>
          {sub && <Typography variant="caption" color="text.secondary">{sub}</Typography>}
        </Box>
      </Box>
    </Paper>
  );
}

interface Props {
  dataInicial: ReportesData;
  añoInicial: number;
}

export default function ReportesClient({ dataInicial, añoInicial }: Props) {
  const [año, setAño] = React.useState(añoInicial);
  const [data, setData] = React.useState(dataInicial);
  const [loading, setLoading] = React.useState(false);

  async function cambiarAño(newAño: number) {
    setAño(newAño);
    setLoading(true);
    try {
      const newData = await getReportesData(newAño);
      setData(newData);
    } finally {
      setLoading(false);
    }
  }

  const añoActual = new Date().getFullYear();
  const años = [añoActual - 2, añoActual - 1, añoActual, añoActual + 1];

  const pieData = data.porEstado.map(e => ({
    name: ESTADO_LABELS[e.estado] ?? e.estado,
    value: e.count,
    fill: ESTADO_COLORS[e.estado] ?? '#94a3b8',
  }));

  return (
    <Box sx={{ p: 3 }}>
      {/* Header */}
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3 }}>
        <Box>
          <Typography variant="h5" sx={{ fontWeight: 700, fontFamily: 'Outfit' }}>Reportes</Typography>
          <Typography variant="body2" color="text.secondary">Análisis de rendimiento del negocio</Typography>
        </Box>
        <FormControl size="small" sx={{ width: 120 }}>
          <Select value={año} onChange={e => cambiarAño(Number(e.target.value))}>
            {años.map(a => <MenuItem key={a} value={a}>{a}</MenuItem>)}
          </Select>
        </FormControl>
      </Box>

      {loading && <LinearProgress sx={{ mb: 2 }} />}

      {/* KPI Cards */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <KPICard icon={<TrendingUpOutlined />} label="Total Facturado" value={formatARS(data.totalIngresado)} sub={`${data.totalReservas} reservas`} color="#4f46e5" />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <KPICard icon={<ReceiptLongOutlined />} label="Promedio por Reserva" value={formatARS(data.ingresoPromedioPorReserva)} color="#10b981" />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <KPICard icon={<DirectionsCarOutlined />} label="Flota Total" value={String(data.totalVehiculos)} sub="vehículos" color="#f59e0b" />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <KPICard icon={<PercentOutlined />} label="Ocupación Estimada" value={`${data.ocupacionPromedio}%`} sub="días alquilados / disponibles" color="#ef4444" />
        </Grid>
      </Grid>

      {/* Charts row */}
      <Grid container spacing={2} sx={{ mb: 2 }}>
        {/* Ingresos mensuales */}
        <Grid size={{ xs: 12, md: 8 }}>
          <Paper variant="outlined" sx={{ p: 2.5, borderRadius: 2, height: 320 }}>
            <Typography variant="subtitle1" sx={{ fontWeight: 700, fontFamily: 'Outfit', mb: 2 }}>
              Ingresos por Mes — {año}
            </Typography>
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={data.ingresosMensuales} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="mes" tick={{ fontSize: 12 }} />
                <YAxis tickFormatter={(v: number) => v >= 1000 ? `$${v / 1000}k` : `$${v}`} tick={{ fontSize: 11 }} width={55} />
                <Tooltip formatter={((v: number) => [formatARS(v), 'Ingresos']) as never} />
                <Bar dataKey="total" fill="#4f46e5" radius={[4, 4, 0, 0]} name="Ingresos" />
              </BarChart>
            </ResponsiveContainer>
          </Paper>
        </Grid>

        {/* Estado distribución */}
        <Grid size={{ xs: 12, md: 4 }}>
          <Paper variant="outlined" sx={{ p: 2.5, borderRadius: 2, height: 320 }}>
            <Typography variant="subtitle1" sx={{ fontWeight: 700, fontFamily: 'Outfit', mb: 2 }}>
              Reservas por Estado
            </Typography>
            {pieData.length > 0 ? (
              <>
                <ResponsiveContainer width="100%" height={190}>
                  <PieChart>
                    <Pie data={pieData} cx="50%" cy="50%" innerRadius={55} outerRadius={80} dataKey="value">
                      {pieData.map((entry, index) => (
                        <Cell key={index} fill={entry.fill} />
                      ))}
                    </Pie>
                    <Tooltip formatter={((v: number) => [v, 'Reservas']) as never} />
                  </PieChart>
                </ResponsiveContainer>
                <Stack spacing={0.5}>
                  {pieData.map(e => (
                    <Box key={e.name} sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.8 }}>
                        <Box sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: e.fill }} />
                        <Typography variant="caption">{e.name}</Typography>
                      </Box>
                      <Typography variant="caption" sx={{ fontWeight: 600 }}>{e.value}</Typography>
                    </Box>
                  ))}
                </Stack>
              </>
            ) : (
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 200, color: 'text.disabled' }}>
                <Typography variant="body2">Sin datos para {año}</Typography>
              </Box>
            )}
          </Paper>
        </Grid>
      </Grid>

      {/* Top Vehículos */}
      <Paper variant="outlined" sx={{ p: 2.5, borderRadius: 2 }}>
        <Typography variant="subtitle1" sx={{ fontWeight: 700, fontFamily: 'Outfit', mb: 2 }}>
          Top Vehículos — Más Rentables (todos los tiempos)
        </Typography>
        {data.topVehiculos.length === 0 ? (
          <Typography variant="body2" color="text.secondary">Sin datos de reservas devueltas.</Typography>
        ) : (
          <Stack spacing={1.5}>
            {data.topVehiculos.map((v, i) => (
              <Box key={v.id} sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <Typography variant="h6" sx={{ fontWeight: 800, width: 24, color: i < 3 ? '#4f46e5' : 'text.disabled' }}>
                  {i + 1}
                </Typography>
                <Avatar sx={{ width: 36, height: 36, bgcolor: '#4f46e5', fontSize: 12 }}>
                  {v.patente?.slice(0, 2)}
                </Avatar>
                <Box sx={{ flex: 1 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 0.5 }}>
                    <Box>
                      <Typography variant="body2" sx={{ fontWeight: 700 }}>{v.patente}</Typography>
                      <Typography variant="caption" color="text.secondary">{v.modelo}</Typography>
                    </Box>
                    <Box sx={{ textAlign: 'right' }}>
                      <Typography variant="body2" sx={{ fontWeight: 700, color: '#4f46e5' }}>{formatARS(v.total)}</Typography>
                      <Typography variant="caption" color="text.secondary">{v.count} reservas</Typography>
                    </Box>
                  </Box>
                  <LinearProgress
                    variant="determinate"
                    value={(v.total / (data.topVehiculos[0]?.total || 1)) * 100}
                    sx={{ height: 6, borderRadius: 3, bgcolor: '#f1f5f9', '& .MuiLinearProgress-bar': { bgcolor: '#4f46e5', borderRadius: 3 } }}
                  />
                </Box>
              </Box>
            ))}
          </Stack>
        )}
      </Paper>
    </Box>
  );
}
