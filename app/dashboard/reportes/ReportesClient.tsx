'use client';

import * as React from 'react';
import {
  Box, Typography, Paper, Grid, Stack, Select, MenuItem, FormControl,
  Avatar, LinearProgress, Tabs, Tab, Button,
} from '@mui/material';
import {
  BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis,
  CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts';
import {
  TrendingUpOutlined, DirectionsCarOutlined, ReceiptLongOutlined, PercentOutlined,
  FileDownloadOutlined, PictureAsPdfOutlined,
} from '@mui/icons-material';
import { getReportesData, getReportesExtra } from './actions';
import type { ReportesData, ReportesExtra } from './actions';

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

const YEAR_COLORS = ['#94a3b8', '#f59e0b', '#4f46e5'];

function formatARS(n: number) {
  return '$' + Math.round(n).toLocaleString('es-AR');
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
  extraInicial: ReportesExtra;
  añoInicial: number;
}

export default function ReportesClient({ dataInicial, extraInicial, añoInicial }: Props) {
  const [tab, setTab] = React.useState(0);
  const [año, setAño] = React.useState(añoInicial);
  const [data, setData] = React.useState(dataInicial);
  const [extra, setExtra] = React.useState(extraInicial);
  const [loading, setLoading] = React.useState(false);
  const [exporting, setExporting] = React.useState(false);

  async function cambiarAño(newAño: number) {
    setAño(newAño);
    setLoading(true);
    try {
      const [newData, newExtra] = await Promise.all([
        getReportesData(newAño),
        getReportesExtra(newAño),
      ]);
      setData(newData);
      setExtra(newExtra);
    } finally {
      setLoading(false);
    }
  }

  async function exportarExcel() {
    setExporting(true);
    try {
      const XLSX = (await import('xlsx')).default;
      const wb = XLSX.utils.book_new();

      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(
        data.ingresosMensuales.map(m => ({ Mes: m.mes, 'Ingresos ($)': m.total, Reservas: m.count }))
      ), 'Ingresos Mensuales');

      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(
        data.porEstado.map(e => ({
          Estado: ESTADO_LABELS[e.estado] ?? e.estado,
          Cantidad: e.count,
          'Total ($)': e.total,
        }))
      ), 'Por Estado');

      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(
        data.topVehiculos.map((v, i) => ({
          '#': i + 1, Patente: v.patente, Modelo: v.modelo,
          Reservas: v.count, 'Total ($)': v.total,
        }))
      ), 'Top Vehículos');

      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(
        extra.topClientes.map((c, i) => ({
          '#': i + 1, Nombre: `${c.nombre} ${c.apellido}`,
          Email: c.email, Reservas: c.count, 'Total ($)': c.total,
        }))
      ), 'Top Clientes');

      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(
        extra.porCategoria.map((c, i) => ({
          '#': i + 1, Categoría: c.nombre, Reservas: c.count, 'Total ($)': c.total,
        }))
      ), 'Por Categoría');

      XLSX.writeFile(wb, `Reporte_Premier_${año}.xlsx`);
    } finally {
      setExporting(false);
    }
  }

  async function exportarPDF() {
    setExporting(true);
    try {
      const { pdf } = await import('@react-pdf/renderer');
      const { default: ReportePDF } = await import('@/components/admin/ReportePDF');
      const ReactLib = (await import('react')).default;
      const blob = await pdf(ReactLib.createElement(ReportePDF, { data, extra, año }) as any).toBlob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Reporte_Premier_${año}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } finally {
      setExporting(false);
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
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3, flexWrap: 'wrap', gap: 2 }}>
        <Box>
          <Typography variant="h5" sx={{ fontWeight: 700, fontFamily: 'Outfit' }}>Reportes</Typography>
          <Typography variant="body2" color="text.secondary">Análisis de rendimiento del negocio</Typography>
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <Button
            size="small"
            startIcon={<FileDownloadOutlined />}
            variant="outlined"
            onClick={exportarExcel}
            disabled={exporting}
            sx={{ textTransform: 'none' }}
          >
            Excel
          </Button>
          <Button
            size="small"
            startIcon={<PictureAsPdfOutlined />}
            variant="outlined"
            color="error"
            onClick={exportarPDF}
            disabled={exporting}
            sx={{ textTransform: 'none' }}
          >
            PDF
          </Button>
          <FormControl size="small" sx={{ width: 110 }}>
            <Select value={año} onChange={e => cambiarAño(Number(e.target.value))}>
              {años.map(a => <MenuItem key={a} value={a}>{a}</MenuItem>)}
            </Select>
          </FormControl>
        </Box>
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

      {/* Tabs */}
      <Tabs
        value={tab}
        onChange={(_, v) => setTab(v)}
        sx={{ mb: 2.5, borderBottom: 1, borderColor: 'divider' }}
      >
        <Tab label="Resumen" />
        <Tab label="Comparativo Anual" />
        <Tab label="Vehículos y Categorías" />
        <Tab label="Clientes" />
      </Tabs>

      {/* Tab 0: Resumen */}
      {tab === 0 && (
        <Grid container spacing={2}>
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
      )}

      {/* Tab 1: Comparativo Anual */}
      {tab === 1 && (
        <Paper variant="outlined" sx={{ p: 2.5, borderRadius: 2 }}>
          <Typography variant="subtitle1" sx={{ fontWeight: 700, fontFamily: 'Outfit', mb: 2 }}>
            Comparativo {extra.años.join(' · ')}
          </Typography>
          <ResponsiveContainer width="100%" height={340}>
            <BarChart data={extra.comparativo} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
              <XAxis dataKey="mes" tick={{ fontSize: 12 }} />
              <YAxis tickFormatter={(v: number) => v >= 1000 ? `$${v / 1000}k` : `$${v}`} tick={{ fontSize: 11 }} width={58} />
              <Tooltip formatter={((v: number) => [formatARS(v), '']) as never} />
              <Legend />
              {extra.años.map((a, i) => (
                <Bar key={a} dataKey={a} fill={YEAR_COLORS[i]} radius={[3, 3, 0, 0]} name={a} />
              ))}
            </BarChart>
          </ResponsiveContainer>
        </Paper>
      )}

      {/* Tab 2: Vehículos y Categorías */}
      {tab === 2 && (
        <Grid container spacing={2}>
          <Grid size={{ xs: 12, md: 7 }}>
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
          </Grid>
          <Grid size={{ xs: 12, md: 5 }}>
            <Paper variant="outlined" sx={{ p: 2.5, borderRadius: 2 }}>
              <Typography variant="subtitle1" sx={{ fontWeight: 700, fontFamily: 'Outfit', mb: 2 }}>
                Ingresos por Categoría — {año}
              </Typography>
              {extra.porCategoria.length === 0 ? (
                <Typography variant="body2" color="text.secondary">Sin datos de categorías para {año}.</Typography>
              ) : (
                <Stack spacing={1.5}>
                  {extra.porCategoria.map(cat => (
                    <Box key={cat.categoria_id}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                        <Typography variant="body2" sx={{ fontWeight: 600 }}>{cat.nombre}</Typography>
                        <Box sx={{ textAlign: 'right' }}>
                          <Typography variant="body2" sx={{ fontWeight: 700, color: '#10b981' }}>{formatARS(cat.total)}</Typography>
                          <Typography variant="caption" color="text.secondary">{cat.count} reservas</Typography>
                        </Box>
                      </Box>
                      <LinearProgress
                        variant="determinate"
                        value={(cat.total / (extra.porCategoria[0]?.total || 1)) * 100}
                        sx={{ height: 5, borderRadius: 3, bgcolor: '#f1f5f9', '& .MuiLinearProgress-bar': { bgcolor: '#10b981', borderRadius: 3 } }}
                      />
                    </Box>
                  ))}
                </Stack>
              )}
            </Paper>
          </Grid>
        </Grid>
      )}

      {/* Tab 3: Clientes */}
      {tab === 3 && (
        <Paper variant="outlined" sx={{ p: 2.5, borderRadius: 2 }}>
          <Typography variant="subtitle1" sx={{ fontWeight: 700, fontFamily: 'Outfit', mb: 2 }}>
            Top Clientes — {año}
          </Typography>
          {extra.topClientes.length === 0 ? (
            <Typography variant="body2" color="text.secondary">Sin datos de clientes para {año}.</Typography>
          ) : (
            <Stack spacing={2}>
              {extra.topClientes.map((c, i) => (
                <Box key={c.id} sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                  <Typography variant="h6" sx={{ fontWeight: 800, width: 24, color: i < 3 ? '#10b981' : 'text.disabled' }}>
                    {i + 1}
                  </Typography>
                  <Avatar sx={{ width: 36, height: 36, bgcolor: '#10b981', fontSize: 13, fontWeight: 700 }}>
                    {c.nombre[0]}{c.apellido[0]}
                  </Avatar>
                  <Box sx={{ flex: 1 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 0.5 }}>
                      <Box>
                        <Typography variant="body2" sx={{ fontWeight: 700 }}>{c.nombre} {c.apellido}</Typography>
                        <Typography variant="caption" color="text.secondary">{c.email}</Typography>
                      </Box>
                      <Box sx={{ textAlign: 'right' }}>
                        <Typography variant="body2" sx={{ fontWeight: 700, color: '#10b981' }}>{formatARS(c.total)}</Typography>
                        <Typography variant="caption" color="text.secondary">{c.count} reservas</Typography>
                      </Box>
                    </Box>
                    <LinearProgress
                      variant="determinate"
                      value={(c.total / (extra.topClientes[0]?.total || 1)) * 100}
                      sx={{ height: 5, borderRadius: 3, bgcolor: '#f1f5f9', '& .MuiLinearProgress-bar': { bgcolor: '#10b981', borderRadius: 3 } }}
                    />
                  </Box>
                </Box>
              ))}
            </Stack>
          )}
        </Paper>
      )}
    </Box>
  );
}
