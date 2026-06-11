'use client';

import * as React from 'react';
import {
  Box, Typography, Card, CardContent, Grid, Chip, Table, TableBody,
  TableCell, TableContainer, TableHead, TableRow, Paper, IconButton,
  Button, Dialog, DialogTitle, DialogContent, DialogActions, TextField,
  MenuItem, Tooltip, Stack, Alert, CircularProgress, Tabs, Tab, Fab,
} from '@mui/material';
import {
  AddOutlined, EditOutlined, DeleteOutlined,
  ChevronLeftOutlined, ChevronRightOutlined,
  TrendingUpOutlined, TrendingDownOutlined, AccountBalanceOutlined,
} from '@mui/icons-material';
import { getGastosMes, getPagosMes, crearGasto, actualizarGasto, eliminarGasto } from './actions';
import type { CategoriaGasto } from '@/types';
import { useIsMobile } from '@/hooks/useIsMobile';

type GastoRow = {
  id: string;
  categoria: string;
  monto: number;
  descripcion: string | null;
  fecha: string;
  vehiculo_id: string | null;
  vehiculos: { patente: string } | null;
};

type PagoRow = {
  id: string;
  monto: number;
  metodo: string;
  created_at: string;
  reservas: { numero: string } | null;
};

type VehiculoOpt = { id: string; patente: string; marca: string; modelo: string };

interface Props {
  categorias: CategoriaGasto[];
  gastosIniciales: GastoRow[];
  pagosIniciales: PagoRow[];
  vehiculos: VehiculoOpt[];
  mesInicial: string;
}

const MESES = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
const METODO_LABEL: Record<string, string> = { efectivo: 'Efectivo', transferencia: 'Transferencia', tarjeta: 'Tarjeta', mercadopago: 'Mercado Pago' };
const METODO_COLOR: Record<string, string> = { efectivo: '#16a34a', transferencia: '#0ea5e9', tarjeta: '#8b5cf6', mercadopago: '#009ee3' };

function formatARS(n: number) {
  return new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(n);
}

function formatFecha(s: string) {
  const [y, m, d] = s.split('-');
  return `${d}/${m}/${y}`;
}

function formatFechaTs(s: string) {
  const d = new Date(s);
  return `${String(d.getDate()).padStart(2,'0')}/${String(d.getMonth()+1).padStart(2,'0')}/${d.getFullYear()}`;
}

export default function CajaClient({ categorias, gastosIniciales, pagosIniciales, vehiculos, mesInicial }: Props) {
  const [anoMes, setAnoMes] = React.useState(mesInicial);
  const [gastos, setGastos] = React.useState<GastoRow[]>(gastosIniciales);
  const [pagos, setPagos] = React.useState<PagoRow[]>(pagosIniciales);
  const [loading, setLoading] = React.useState(false);
  const [tab, setTab] = React.useState(0);

  const [dialog, setDialog] = React.useState<{ open: boolean; editando?: GastoRow }>({ open: false });
  const [form, setForm] = React.useState({ categoria: '', monto: '', descripcion: '', fecha: '', vehiculo_id: '' });
  const [formLoading, setFormLoading] = React.useState(false);
  const [formError, setFormError] = React.useState('');

  const isMobile = useIsMobile();

  const catMap = React.useMemo(
    () => Object.fromEntries(categorias.map(c => [c.nombre, c.color])),
    [categorias]
  );

  const totalIngresos = pagos.reduce((s, p) => s + p.monto, 0);
  const totalEgresos = gastos.reduce((s, g) => s + g.monto, 0);
  const balance = totalIngresos - totalEgresos;

  const [ano, mes] = anoMes.split('-').map(Number);
  const mesLabel = `${MESES[mes - 1]} ${ano}`;

  async function cargarMes(nuevaFecha: string) {
    setLoading(true);
    const [a, m] = nuevaFecha.split('-').map(Number);
    const inicio = new Date(a, m - 1, 1).toISOString().split('T')[0];
    const fin = new Date(a, m, 0).toISOString().split('T')[0];
    const inicioTs = new Date(a, m - 1, 1).toISOString();
    const finTs = new Date(a, m, 0, 23, 59, 59).toISOString();
    const [g, p] = await Promise.all([getGastosMes(inicio, fin), getPagosMes(inicioTs, finTs)]);
    setGastos(g as GastoRow[]);
    setPagos(p as PagoRow[]);
    setAnoMes(nuevaFecha);
    setLoading(false);
  }

  function navMes(delta: number) {
    const d = new Date(ano, mes - 1 + delta, 1);
    const nuevo = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    cargarMes(nuevo);
  }

  function openNuevo() {
    const hoy = new Date().toISOString().split('T')[0];
    setForm({ categoria: categorias[0]?.nombre ?? '', monto: '', descripcion: '', fecha: hoy, vehiculo_id: '' });
    setFormError('');
    setDialog({ open: true });
  }

  function openEditar(g: GastoRow) {
    setForm({
      categoria: g.categoria,
      monto: String(g.monto),
      descripcion: g.descripcion ?? '',
      fecha: g.fecha,
      vehiculo_id: g.vehiculo_id ?? '',
    });
    setFormError('');
    setDialog({ open: true, editando: g });
  }

  async function handleGuardar() {
    const monto = parseFloat(form.monto.replace(',', '.'));
    if (!form.categoria || isNaN(monto) || monto <= 0 || !form.fecha) {
      setFormError('Categoría, monto y fecha son requeridos.');
      return;
    }
    setFormLoading(true);
    try {
      const payload = {
        categoria: form.categoria,
        monto,
        descripcion: form.descripcion.trim() || null,
        fecha: form.fecha,
        vehiculo_id: form.vehiculo_id || null,
      };
      if (dialog.editando) {
        await actualizarGasto(dialog.editando.id, payload);
      } else {
        await crearGasto(payload);
      }
      await cargarMes(anoMes);
      setDialog({ open: false });
    } catch (e: unknown) {
      setFormError(e instanceof Error ? e.message : 'Error al guardar');
    } finally {
      setFormLoading(false);
    }
  }

  async function handleEliminar(id: string) {
    if (!confirm('¿Eliminar este egreso?')) return;
    await eliminarGasto(id);
    await cargarMes(anoMes);
  }

  return (
    <Box sx={{ p: { xs: 1.5, sm: 2, md: 3 } }}>
      {/* Header */}
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3, gap: 1, flexWrap: 'wrap' }}>
        <Typography variant="h5" sx={{ fontWeight: 700, fontFamily: 'Outfit' }}>Caja</Typography>
        <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
          <IconButton size="small" onClick={() => navMes(-1)} disabled={loading}>
            <ChevronLeftOutlined />
          </IconButton>
          <Typography sx={{ fontWeight: 600, minWidth: { xs: 120, sm: 180 }, textAlign: 'center', fontSize: { xs: '0.85rem', sm: '1rem' } }}>
            {mesLabel}
          </Typography>
          <IconButton size="small" onClick={() => navMes(1)} disabled={loading}>
            <ChevronRightOutlined />
          </IconButton>
        </Stack>
        <Button
          variant="contained"
          startIcon={<AddOutlined />}
          onClick={openNuevo}
          sx={{ display: { xs: 'none', md: 'inline-flex' }, bgcolor: '#4f46e5', '&:hover': { bgcolor: '#4338ca' } }}
        >
          Nuevo Egreso
        </Button>
      </Box>

      {/* KPI cards */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid size={{ xs: 12, sm: 4 }}>
          <Card sx={{ borderLeft: '4px solid #16a34a' }}>
            <CardContent sx={{ py: 2 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                <TrendingUpOutlined sx={{ color: '#16a34a', fontSize: 20 }} />
                <Typography variant="body2" color="text.secondary">Ingresos del mes</Typography>
              </Box>
              <Typography variant="h5" sx={{ fontWeight: 800, fontFamily: 'Outfit', color: '#16a34a' }}>
                {formatARS(totalIngresos)}
              </Typography>
              <Typography variant="caption" color="text.secondary">{pagos.length} cobros registrados</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid size={{ xs: 12, sm: 4 }}>
          <Card sx={{ borderLeft: '4px solid #ef4444' }}>
            <CardContent sx={{ py: 2 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                <TrendingDownOutlined sx={{ color: '#ef4444', fontSize: 20 }} />
                <Typography variant="body2" color="text.secondary">Egresos del mes</Typography>
              </Box>
              <Typography variant="h5" sx={{ fontWeight: 800, fontFamily: 'Outfit', color: '#ef4444' }}>
                {formatARS(totalEgresos)}
              </Typography>
              <Typography variant="caption" color="text.secondary">{gastos.length} egresos registrados</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid size={{ xs: 12, sm: 4 }}>
          <Card sx={{ borderLeft: `4px solid ${balance >= 0 ? '#4f46e5' : '#f97316'}` }}>
            <CardContent sx={{ py: 2 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                <AccountBalanceOutlined sx={{ color: balance >= 0 ? '#4f46e5' : '#f97316', fontSize: 20 }} />
                <Typography variant="body2" color="text.secondary">Balance neto</Typography>
              </Box>
              <Typography variant="h5" sx={{ fontWeight: 800, fontFamily: 'Outfit', color: balance >= 0 ? '#4f46e5' : '#ef4444' }}>
                {formatARS(balance)}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {balance >= 0 ? 'Superávit' : 'Déficit'} del mes
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Tables */}
      <Paper variant="outlined" sx={{ borderRadius: 2 }}>
        <Tabs
          value={tab}
          onChange={(_, v) => setTab(v)}
          variant="scrollable"
          scrollButtons="auto"
          sx={{ borderBottom: '1px solid #f1f5f9', px: 2 }}
        >
          <Tab label={`Egresos (${gastos.length})`} />
          <Tab label={`Ingresos (${pagos.length})`} />
        </Tabs>

        {/* TAB 0: Egresos */}
        {tab === 0 && (
          <>
            {/* Desktop */}
            <Box sx={{ display: { xs: 'none', md: 'block' } }}>
              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow sx={{ bgcolor: '#f8fafc' }}>
                      <TableCell sx={{ fontWeight: 700 }}>Fecha</TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>Categoría</TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>Vehículo</TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>Descripción</TableCell>
                      <TableCell sx={{ fontWeight: 700, textAlign: 'right' }}>Monto</TableCell>
                      <TableCell sx={{ width: 80 }} />
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {loading ? (
                      <TableRow>
                        <TableCell colSpan={6} align="center" sx={{ py: 4 }}>
                          <CircularProgress size={24} />
                        </TableCell>
                      </TableRow>
                    ) : gastos.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} align="center" sx={{ py: 4, color: 'text.secondary' }}>
                          Sin egresos registrados este mes
                        </TableCell>
                      </TableRow>
                    ) : gastos.map(g => (
                      <TableRow key={g.id} hover>
                        <TableCell>
                          <Typography variant="body2">{formatFecha(g.fecha)}</Typography>
                        </TableCell>
                        <TableCell>
                          <Chip
                            label={g.categoria}
                            size="small"
                            sx={{
                              bgcolor: `${catMap[g.categoria] ?? '#64748b'}22`,
                              color: catMap[g.categoria] ?? '#64748b',
                              fontWeight: 600,
                              fontSize: '0.75rem',
                            }}
                          />
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2" color="text.secondary">
                            {g.vehiculos?.patente ?? '—'}
                          </Typography>
                        </TableCell>
                        <TableCell sx={{ maxWidth: 220 }}>
                          <Typography variant="body2" color="text.secondary" sx={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {g.descripcion ?? '—'}
                          </Typography>
                        </TableCell>
                        <TableCell sx={{ textAlign: 'right' }}>
                          <Typography variant="body2" sx={{ fontWeight: 700, color: '#ef4444' }}>
                            −{formatARS(g.monto)}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Stack direction="row" spacing={0.5} sx={{ justifyContent: 'flex-end' }}>
                            <Tooltip title="Editar">
                              <IconButton size="small" onClick={() => openEditar(g)}>
                                <EditOutlined fontSize="small" />
                              </IconButton>
                            </Tooltip>
                            <Tooltip title="Eliminar">
                              <IconButton size="small" color="error" onClick={() => handleEliminar(g.id)}>
                                <DeleteOutlined fontSize="small" />
                              </IconButton>
                            </Tooltip>
                          </Stack>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </Box>

            {/* Mobile */}
            <Box sx={{ display: { xs: 'block', md: 'none' } }}>
              {loading ? (
                <Box sx={{ py: 4, textAlign: 'center' }}><CircularProgress size={24} /></Box>
              ) : gastos.length === 0 ? (
                <Box sx={{ py: 4, textAlign: 'center' }}>
                  <Typography variant="body2" color="text.secondary">Sin egresos registrados este mes</Typography>
                </Box>
              ) : gastos.map(g => (
                <Box key={g.id} sx={{ p: 1.5, borderBottom: '1px solid #f1f5f9' }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 0.5 }}>
                    <Typography variant="caption" color="text.secondary">{formatFecha(g.fecha)}</Typography>
                    <Typography variant="body2" sx={{ fontWeight: 700, color: '#ef4444' }}>−{formatARS(g.monto)}</Typography>
                  </Box>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5, flexWrap: 'wrap' }}>
                    <Chip
                      label={g.categoria}
                      size="small"
                      sx={{ bgcolor: `${catMap[g.categoria] ?? '#64748b'}22`, color: catMap[g.categoria] ?? '#64748b', fontWeight: 600, fontSize: '0.75rem' }}
                    />
                    {g.vehiculos && (
                      <Typography variant="caption" color="text.secondary">{g.vehiculos.patente}</Typography>
                    )}
                  </Box>
                  {g.descripcion && (
                    <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5 }}>
                      {g.descripcion}
                    </Typography>
                  )}
                  <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 0.5 }}>
                    <IconButton size="small" onClick={() => openEditar(g)}><EditOutlined fontSize="small" /></IconButton>
                    <IconButton size="small" color="error" onClick={() => handleEliminar(g.id)}><DeleteOutlined fontSize="small" /></IconButton>
                  </Box>
                </Box>
              ))}
            </Box>
          </>
        )}

        {/* TAB 1: Ingresos */}
        {tab === 1 && (
          <>
            {/* Desktop */}
            <Box sx={{ display: { xs: 'none', md: 'block' } }}>
              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow sx={{ bgcolor: '#f8fafc' }}>
                      <TableCell sx={{ fontWeight: 700 }}>Fecha</TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>Reserva</TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>Método de pago</TableCell>
                      <TableCell sx={{ fontWeight: 700, textAlign: 'right' }}>Monto</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {loading ? (
                      <TableRow>
                        <TableCell colSpan={4} align="center" sx={{ py: 4 }}>
                          <CircularProgress size={24} />
                        </TableCell>
                      </TableRow>
                    ) : pagos.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={4} align="center" sx={{ py: 4, color: 'text.secondary' }}>
                          Sin ingresos registrados este mes
                        </TableCell>
                      </TableRow>
                    ) : pagos.map(p => (
                      <TableRow key={p.id} hover>
                        <TableCell>
                          <Typography variant="body2">{formatFechaTs(p.created_at)}</Typography>
                        </TableCell>
                        <TableCell>
                          <Chip
                            label={p.reservas?.numero ?? '—'}
                            size="small"
                            variant="outlined"
                            sx={{ fontFamily: 'monospace', fontSize: '0.75rem' }}
                          />
                        </TableCell>
                        <TableCell>
                          <Chip
                            label={METODO_LABEL[p.metodo] ?? p.metodo}
                            size="small"
                            sx={{
                              bgcolor: `${METODO_COLOR[p.metodo] ?? '#64748b'}22`,
                              color: METODO_COLOR[p.metodo] ?? '#64748b',
                              fontWeight: 600,
                              fontSize: '0.75rem',
                            }}
                          />
                        </TableCell>
                        <TableCell sx={{ textAlign: 'right' }}>
                          <Typography variant="body2" sx={{ fontWeight: 700, color: '#16a34a' }}>
                            +{formatARS(p.monto)}
                          </Typography>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </Box>

            {/* Mobile */}
            <Box sx={{ display: { xs: 'block', md: 'none' } }}>
              {loading ? (
                <Box sx={{ py: 4, textAlign: 'center' }}><CircularProgress size={24} /></Box>
              ) : pagos.length === 0 ? (
                <Box sx={{ py: 4, textAlign: 'center' }}>
                  <Typography variant="body2" color="text.secondary">Sin ingresos registrados este mes</Typography>
                </Box>
              ) : pagos.map(p => (
                <Box key={p.id} sx={{ p: 1.5, borderBottom: '1px solid #f1f5f9' }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 0.5 }}>
                    <Typography variant="caption" color="text.secondary">{formatFechaTs(p.created_at)}</Typography>
                    <Typography variant="body2" sx={{ fontWeight: 700, color: '#16a34a' }}>+{formatARS(p.monto)}</Typography>
                  </Box>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Chip label={p.reservas?.numero ?? '—'} size="small" variant="outlined" sx={{ fontFamily: 'monospace', fontSize: '0.75rem' }} />
                    <Chip
                      label={METODO_LABEL[p.metodo] ?? p.metodo}
                      size="small"
                      sx={{ bgcolor: `${METODO_COLOR[p.metodo] ?? '#64748b'}22`, color: METODO_COLOR[p.metodo] ?? '#64748b', fontWeight: 600, fontSize: '0.75rem' }}
                    />
                  </Box>
                </Box>
              ))}
            </Box>
          </>
        )}
      </Paper>

      {/* Dialog: Nuevo/Editar Egreso */}
      <Dialog open={dialog.open} onClose={() => setDialog({ open: false })} maxWidth="sm" fullWidth fullScreen={isMobile}>
        <DialogTitle sx={{ fontFamily: 'Outfit', fontWeight: 700 }}>
          {dialog.editando ? 'Editar Egreso' : 'Nuevo Egreso'}
        </DialogTitle>
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: '16px !important' }}>
          {formError && <Alert severity="error">{formError}</Alert>}
          <TextField
            label="Fecha"
            type="date"
            size="small"
            required
            value={form.fecha}
            onChange={e => setForm(f => ({ ...f, fecha: e.target.value }))}
            slotProps={{ inputLabel: { shrink: true } }}
          />
          <TextField
            select
            label="Categoría"
            size="small"
            required
            value={form.categoria}
            onChange={e => setForm(f => ({ ...f, categoria: e.target.value }))}
          >
            {categorias.map(c => (
              <MenuItem key={c.id} value={c.nombre}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Box sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: c.color, flexShrink: 0 }} />
                  {c.nombre}
                </Box>
              </MenuItem>
            ))}
          </TextField>
          <TextField
            label="Monto"
            size="small"
            required
            value={form.monto}
            onChange={e => setForm(f => ({ ...f, monto: e.target.value }))}
            slotProps={{ input: { startAdornment: <Box component="span" sx={{ mr: 0.5, color: 'text.secondary' }}>$</Box> } }}
          />
          <TextField
            label="Descripción (opcional)"
            size="small"
            multiline
            rows={2}
            value={form.descripcion}
            onChange={e => setForm(f => ({ ...f, descripcion: e.target.value }))}
          />
          <TextField
            select
            label="Vehículo (opcional)"
            size="small"
            value={form.vehiculo_id}
            onChange={e => setForm(f => ({ ...f, vehiculo_id: e.target.value }))}
          >
            <MenuItem value=""><em>Sin vehículo</em></MenuItem>
            {vehiculos.map(v => (
              <MenuItem key={v.id} value={v.id}>{v.patente} — {v.marca} {v.modelo}</MenuItem>
            ))}
          </TextField>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setDialog({ open: false })}>Cancelar</Button>
          <Button
            variant="contained"
            onClick={handleGuardar}
            disabled={formLoading}
            sx={{ bgcolor: '#4f46e5', '&:hover': { bgcolor: '#4338ca' } }}
          >
            {formLoading ? <CircularProgress size={18} color="inherit" /> : 'Guardar'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* FAB mobile */}
      <Fab
        color="primary"
        onClick={openNuevo}
        sx={{ position: 'fixed', bottom: 20, right: 20, display: { xs: 'flex', md: 'none' }, bgcolor: '#4f46e5', '&:hover': { bgcolor: '#4338ca' } }}
      >
        <AddOutlined />
      </Fab>
    </Box>
  );
}
