'use client';

import * as React from 'react';
import {
  Box, Button, Card, Typography, Table, TableHead, TableRow, TableCell,
  TableBody, Chip, IconButton, Tooltip, TextField, MenuItem, InputAdornment,
  Dialog, DialogTitle, DialogContent, DialogActions, Grid, Alert,
  FormControlLabel, Checkbox, Select, OutlinedInput, ListItemText,
  Autocomplete,
} from '@mui/material';
import {
  AddOutlined, FileDownloadOutlined, SearchOutlined, ReceiptLongOutlined,
  FilterListOutlined, CloseOutlined,
} from '@mui/icons-material';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import * as XLSX from 'xlsx';
import ReservaDrawer from '@/components/admin/ReservaDrawer';
import type { Cobertura, Adicional } from '@/types';
import {
  type ReservaConRelaciones, type NuevaReservaData,
  crearReserva, getVehiculosDisponibles, calcularCotizacion,
} from './actions';

// ─── Tipos ────────────────────────────────────────────────────────────────────
interface Props {
  reservasIniciales: ReservaConRelaciones[];
  clientes: { id: string; nombre: string; apellido: string; email: string }[];
  coberturas: Cobertura[];
  adicionales: Adicional[];
  categorias: { id: string; nombre: string }[];
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
const ESTADO_STYLE: Record<string, { bg: string; color: string; label: string }> = {
  preventa:  { bg: '#f1f5f9', color: '#64748b', label: 'Preventa' },
  pendiente: { bg: '#fef9c3', color: '#ca8a04', label: 'Pendiente' },
  confirmada:{ bg: '#dcfce7', color: '#16a34a', label: 'Confirmada' },
  en_curso:  { bg: '#dbeafe', color: '#2563eb', label: 'En curso' },
  devuelta:  { bg: '#f0fdf4', color: '#15803d', label: 'Devuelta' },
  cancelada: { bg: '#fee2e2', color: '#dc2626', label: 'Cancelada' },
};

function formatFecha(iso: string) {
  return new Date(iso).toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: '2-digit' });
}
function formatARS(v: number) {
  return new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(v);
}
function diasReserva(desde: string, hasta: string) {
  return Math.ceil((new Date(hasta).getTime() - new Date(desde).getTime()) / 86400000);
}

// ─── Schema nueva reserva ─────────────────────────────────────────────────────
const nuevaReservaSchema = z.object({
  cliente_id: z.string().uuid('Seleccioná un cliente'),
  fecha_entrega: z.string().min(1, 'Requerido'),
  fecha_devolucion: z.string().min(1, 'Requerido'),
  lugar_entrega: z.string().min(2, 'Requerido'),
  lugar_devolucion: z.string().min(2, 'Requerido'),
  numero_vuelo: z.string().default(''),
  vehiculo_id: z.string().default(''),
  cobertura_id: z.string().default(''),
  adicional_ids: z.array(z.string()).default([]),
  precio_base: z.coerce.number().min(0),
  descuento_aplicado: z.coerce.number().min(0).default(0),
  observaciones: z.string().default(''),
  categoria_id: z.string().default(''),
});
type NuevaReservaForm = z.infer<typeof nuevaReservaSchema>;

// ─── Componente ───────────────────────────────────────────────────────────────
export default function ReservasClient({ reservasIniciales, clientes, coberturas, adicionales, categorias }: Props) {
  const [reservas, setReservas] = React.useState(reservasIniciales);
  const [selectedId, setSelectedId] = React.useState<string | null>(null);
  const [busqueda, setBusqueda] = React.useState('');
  const [filtroEstado, setFiltroEstado] = React.useState('todos');
  const [filtroDesde, setFiltroDesde] = React.useState('');
  const [filtroHasta, setFiltroHasta] = React.useState('');
  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState('');
  const [vehiculosDisponibles, setVehiculosDisponibles] = React.useState<{ id: string; patente: string; modelo: string }[]>([]);
  const [cotizando, setCotizando] = React.useState(false);

  const { control, handleSubmit, reset, watch, setValue, formState: { errors } } = useForm<NuevaReservaForm>({
    resolver: zodResolver(nuevaReservaSchema) as any,
    defaultValues: {
      cliente_id: '', fecha_entrega: '', fecha_devolucion: '', lugar_entrega: '',
      lugar_devolucion: '', numero_vuelo: '', vehiculo_id: '', cobertura_id: '',
      adicional_ids: [], precio_base: 0, descuento_aplicado: 0, observaciones: '', categoria_id: '',
    },
  });

  const fechaEntrega = watch('fecha_entrega');
  const fechaDevolucion = watch('fecha_devolucion');
  const categoriaId = watch('categoria_id');

  // Actualizar vehículos disponibles cuando cambian fechas
  React.useEffect(() => {
    if (!fechaEntrega || !fechaDevolucion) return;
    getVehiculosDisponibles(fechaEntrega, fechaDevolucion).then(vs =>
      setVehiculosDisponibles(vs.map(v => ({ id: v.id, patente: v.patente, modelo: v.modelo })))
    );
  }, [fechaEntrega, fechaDevolucion]);

  const handleCotizar = async () => {
    if (!fechaEntrega || !fechaDevolucion || !categoriaId) return;
    setCotizando(true);
    const precio = await calcularCotizacion(fechaEntrega, fechaDevolucion, categoriaId);
    if (precio) setValue('precio_base', precio);
    setCotizando(false);
  };

  const onSubmit = async (data: NuevaReservaForm) => {
    setLoading(true);
    setError('');
    try {
      await crearReserva({
        ...data,
        vehiculo_id: data.vehiculo_id || undefined,
        cobertura_id: data.cobertura_id || undefined,
        numero_vuelo: data.numero_vuelo || undefined,
        observaciones: data.observaciones || undefined,
      } as NuevaReservaData);
      setDialogOpen(false);
      window.location.reload();
    } catch (e: any) {
      setError(e.message ?? 'Error al crear reserva');
    } finally {
      setLoading(false);
    }
  };

  const abrirDialogNueva = () => {
    reset();
    setError('');
    setVehiculosDisponibles([]);
    setDialogOpen(true);
  };

  // Filtrado
  const filtradas = reservas.filter(r => {
    if (filtroEstado !== 'todos' && r.estado !== filtroEstado) return false;
    if (filtroDesde && r.fecha_entrega < filtroDesde) return false;
    if (filtroHasta && r.fecha_entrega > `${filtroHasta}T23:59:59`) return false;
    if (busqueda) {
      const q = busqueda.toLowerCase();
      return (
        r.numero.toLowerCase().includes(q) ||
        r.id_corto.toLowerCase().includes(q) ||
        r.cliente.nombre.toLowerCase().includes(q) ||
        r.cliente.apellido.toLowerCase().includes(q) ||
        (r.vehiculo?.patente ?? '').toLowerCase().includes(q)
      );
    }
    return true;
  });

  const totalFacturado = filtradas.reduce((s, r) => s + r.precio_total, 0);
  const totalPagado = filtradas.reduce((s, r) => s + r.total_pagado, 0);

  // Export xlsx
  const handleExport = () => {
    const rows = filtradas.map(r => ({
      'ID': r.id_corto,
      'Número': r.numero,
      'Estado': ESTADO_STYLE[r.estado]?.label ?? r.estado,
      'Cliente': `${r.cliente.nombre} ${r.cliente.apellido}`,
      'Vehículo': r.vehiculo?.patente ?? '—',
      'F. Entrega': formatFecha(r.fecha_entrega),
      'F. Devolución': formatFecha(r.fecha_devolucion),
      'Días': diasReserva(r.fecha_entrega, r.fecha_devolucion),
      'Total': r.precio_total,
      'Pagado': r.total_pagado,
    }));
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Reservas');
    XLSX.writeFile(wb, `reservas-${new Date().toISOString().slice(0, 10)}.xlsx`);
  };

  const selectedReserva = selectedId ? reservas.find(r => r.id === selectedId) ?? null : null;

  return (
    <Box sx={{ display: 'flex', gap: 0, height: '100%' }}>
      {/* Tabla principal */}
      <Box sx={{ flexGrow: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 2 }}>

        {/* Barra de filtros */}
        <Card sx={{ p: 2 }}>
          <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', alignItems: 'center' }}>
            <TextField
              placeholder="Buscar número, cliente, patente..."
              size="small"
              value={busqueda}
              onChange={e => setBusqueda(e.target.value)}
              sx={{ width: 260 }}
              slotProps={{ input: { startAdornment: <InputAdornment position="start"><SearchOutlined sx={{ color: '#94a3b8' }} /></InputAdornment> } }}
            />
            <TextField
              select label="Estado" size="small" value={filtroEstado}
              onChange={e => setFiltroEstado(e.target.value)} sx={{ width: 160 }}
            >
              <MenuItem value="todos">Todos</MenuItem>
              {Object.entries(ESTADO_STYLE).map(([k, v]) => <MenuItem key={k} value={k}>{v.label}</MenuItem>)}
            </TextField>
            <TextField label="Desde" type="date" size="small" value={filtroDesde}
              onChange={e => setFiltroDesde(e.target.value)} slotProps={{ inputLabel: { shrink: true } }} sx={{ width: 150 }} />
            <TextField label="Hasta" type="date" size="small" value={filtroHasta}
              onChange={e => setFiltroHasta(e.target.value)} slotProps={{ inputLabel: { shrink: true } }} sx={{ width: 150 }} />
            <Box sx={{ flexGrow: 1 }} />
            <Tooltip title="Exportar .xlsx">
              <IconButton onClick={handleExport} size="small" sx={{ color: '#64748b' }}>
                <FileDownloadOutlined />
              </IconButton>
            </Tooltip>
            <Button variant="contained" startIcon={<AddOutlined />} onClick={abrirDialogNueva} sx={{ fontWeight: 600 }}>
              Nueva reserva
            </Button>
          </Box>
        </Card>

        {/* Tabla */}
        <Card sx={{ flexGrow: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
          <Box sx={{ overflowX: 'auto', flexGrow: 1 }}>
            <Table size="small" stickyHeader>
              <TableHead>
                <TableRow sx={{ '& th': { fontWeight: 700, fontSize: '0.75rem', color: '#64748b', bgcolor: '#f8fafc', borderBottom: '2px solid #e2e8f0' } }}>
                  <TableCell>ID</TableCell>
                  <TableCell>Estado</TableCell>
                  <TableCell>Cliente</TableCell>
                  <TableCell>Vehículo</TableCell>
                  <TableCell>Entrega</TableCell>
                  <TableCell>Devolución</TableCell>
                  <TableCell align="center">Días</TableCell>
                  <TableCell align="right">Total</TableCell>
                  <TableCell align="right">Pagado</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {filtradas.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} align="center" sx={{ py: 6 }}>
                      <ReceiptLongOutlined sx={{ fontSize: 48, color: '#cbd5e1', mb: 1, display: 'block', mx: 'auto' }} />
                      <Typography color="text.secondary">Sin reservas</Typography>
                    </TableCell>
                  </TableRow>
                ) : filtradas.map(r => {
                  const est = ESTADO_STYLE[r.estado];
                  const isSelected = r.id === selectedId;
                  const saldo = r.precio_total - r.total_pagado;
                  return (
                    <TableRow
                      key={r.id}
                      hover
                      selected={isSelected}
                      onClick={() => setSelectedId(r.id === selectedId ? null : r.id)}
                      sx={{
                        cursor: 'pointer',
                        '& td': { borderBottom: '1px solid #f1f5f9' },
                        bgcolor: isSelected ? 'rgba(79,70,229,0.04)' : undefined,
                      }}
                    >
                      <TableCell>
                        <Typography variant="caption" sx={{ fontFamily: 'monospace', fontWeight: 700, color: '#4f46e5' }}>
                          #{r.id_corto}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Chip label={est?.label} size="small"
                          sx={{ bgcolor: est?.bg, color: est?.color, fontWeight: 600, fontSize: '0.7rem' }} />
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" sx={{ fontWeight: 600, fontSize: '0.8rem' }}>
                          {r.cliente.nombre} {r.cliente.apellido}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" sx={{ fontFamily: 'monospace', fontWeight: 700, fontSize: '0.8rem' }}>
                          {r.vehiculo?.patente ?? <span style={{ color: '#94a3b8' }}>Sin asignar</span>}
                        </Typography>
                      </TableCell>
                      <TableCell><Typography variant="body2" sx={{ fontSize: '0.8rem' }}>{formatFecha(r.fecha_entrega)}</Typography></TableCell>
                      <TableCell><Typography variant="body2" sx={{ fontSize: '0.8rem' }}>{formatFecha(r.fecha_devolucion)}</Typography></TableCell>
                      <TableCell align="center">
                        <Typography variant="body2" sx={{ fontWeight: 600, fontSize: '0.8rem' }}>
                          {diasReserva(r.fecha_entrega, r.fecha_devolucion)}
                        </Typography>
                      </TableCell>
                      <TableCell align="right">
                        <Typography variant="body2" sx={{ fontWeight: 700, fontSize: '0.8rem' }}>{formatARS(r.precio_total)}</Typography>
                      </TableCell>
                      <TableCell align="right">
                        <Box>
                          <Typography variant="body2" sx={{ fontWeight: 700, fontSize: '0.8rem', color: saldo === 0 ? '#16a34a' : '#dc2626' }}>
                            {formatARS(r.total_pagado)}
                          </Typography>
                          {saldo > 0 && (
                            <Typography variant="caption" sx={{ color: '#dc2626', display: 'block' }}>
                              -{formatARS(saldo)}
                            </Typography>
                          )}
                        </Box>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </Box>

          {/* Footer */}
          <Box sx={{ px: 3, py: 1.5, borderTop: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center', bgcolor: '#fafafa' }}>
            <Typography variant="caption" color="text.secondary">
              {filtradas.length} reserva{filtradas.length !== 1 ? 's' : ''}
            </Typography>
            <Box sx={{ display: 'flex', gap: 3 }}>
              <Typography variant="caption" sx={{ fontWeight: 600 }}>
                Total facturado: <span style={{ color: '#4f46e5' }}>{formatARS(totalFacturado)}</span>
              </Typography>
              <Typography variant="caption" sx={{ fontWeight: 600 }}>
                Total cobrado: <span style={{ color: '#16a34a' }}>{formatARS(totalPagado)}</span>
              </Typography>
            </Box>
          </Box>
        </Card>
      </Box>

      {/* Drawer de detalle */}
      {selectedReserva && (
        <ReservaDrawer
          reserva={selectedReserva}
          onClose={() => setSelectedId(null)}
          onUpdate={(updated) => setReservas(prev => prev.map(r => r.id === updated.id ? updated as ReservaConRelaciones : r))}
        />
      )}

      {/* Dialog Nueva Reserva */}
      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle sx={{ fontWeight: 700, fontFamily: 'Outfit', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          Nueva reserva
          <IconButton size="small" onClick={() => setDialogOpen(false)}><CloseOutlined fontSize="small" /></IconButton>
        </DialogTitle>
        <DialogContent dividers>
          {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
          <Grid container spacing={2} sx={{ pt: 1 }}>
            {/* Cliente */}
            <Grid size={{ xs: 12 }}>
              <Controller name="cliente_id" control={control} render={({ field }) => (
                <TextField {...field} select label="Cliente *" fullWidth size="small"
                  error={!!errors.cliente_id} helperText={errors.cliente_id?.message}>
                  {clientes.map(c => (
                    <MenuItem key={c.id} value={c.id}>{c.apellido}, {c.nombre} · {c.email}</MenuItem>
                  ))}
                </TextField>
              )} />
            </Grid>

            {/* Fechas */}
            <Grid size={{ xs: 12, sm: 6 }}>
              <Controller name="fecha_entrega" control={control} render={({ field }) => (
                <TextField {...field} label="Fecha/hora entrega *" type="datetime-local" fullWidth size="small"
                  slotProps={{ inputLabel: { shrink: true } }} error={!!errors.fecha_entrega} helperText={errors.fecha_entrega?.message} />
              )} />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <Controller name="fecha_devolucion" control={control} render={({ field }) => (
                <TextField {...field} label="Fecha/hora devolución *" type="datetime-local" fullWidth size="small"
                  slotProps={{ inputLabel: { shrink: true } }} error={!!errors.fecha_devolucion} helperText={errors.fecha_devolucion?.message} />
              )} />
            </Grid>

            {/* Lugares */}
            <Grid size={{ xs: 12, sm: 6 }}>
              <Controller name="lugar_entrega" control={control} render={({ field }) => (
                <TextField {...field} label="Lugar de entrega *" fullWidth size="small"
                  error={!!errors.lugar_entrega} helperText={errors.lugar_entrega?.message} />
              )} />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <Controller name="lugar_devolucion" control={control} render={({ field }) => (
                <TextField {...field} label="Lugar de devolución *" fullWidth size="small"
                  error={!!errors.lugar_devolucion} helperText={errors.lugar_devolucion?.message} />
              )} />
            </Grid>

            {/* Precio */}
            <Grid size={{ xs: 12, sm: 4 }}>
              <Controller name="categoria_id" control={control} render={({ field }) => (
                <TextField {...field} select label="Categoría (cotizar)" fullWidth size="small">
                  <MenuItem value="">— sin cotizar —</MenuItem>
                  {categorias.map(c => <MenuItem key={c.id} value={c.id}>{c.nombre}</MenuItem>)}
                </TextField>
              )} />
            </Grid>
            <Grid size={{ xs: 12, sm: 2 }}>
              <Button fullWidth variant="outlined" size="small" onClick={handleCotizar}
                disabled={cotizando || !fechaEntrega || !fechaDevolucion || !categoriaId}
                sx={{ height: '40px', fontWeight: 600 }}>
                {cotizando ? '...' : 'Calcular'}
              </Button>
            </Grid>
            <Grid size={{ xs: 12, sm: 3 }}>
              <Controller name="precio_base" control={control} render={({ field }) => (
                <TextField {...field} label="Precio base *" type="number" fullWidth size="small"
                  error={!!errors.precio_base} helperText={errors.precio_base?.message}
                  slotProps={{ input: { startAdornment: <InputAdornment position="start">$</InputAdornment> } }} />
              )} />
            </Grid>
            <Grid size={{ xs: 12, sm: 3 }}>
              <Controller name="descuento_aplicado" control={control} render={({ field }) => (
                <TextField {...field} label="Descuento ($)" type="number" fullWidth size="small"
                  slotProps={{ input: { startAdornment: <InputAdornment position="start">$</InputAdornment> } }} />
              )} />
            </Grid>

            {/* Vehículo */}
            <Grid size={{ xs: 12, sm: 6 }}>
              <Controller name="vehiculo_id" control={control} render={({ field }) => (
                <TextField {...field} select label="Vehículo (opcional)" fullWidth size="small"
                  helperText={!fechaEntrega || !fechaDevolucion ? 'Seleccioná fechas para ver disponibles' : `${vehiculosDisponibles.length} disponibles`}>
                  <MenuItem value="">— sin asignar —</MenuItem>
                  {vehiculosDisponibles.map(v => (
                    <MenuItem key={v.id} value={v.id}>{v.patente} — {v.modelo}</MenuItem>
                  ))}
                </TextField>
              )} />
            </Grid>

            {/* Cobertura */}
            <Grid size={{ xs: 12, sm: 6 }}>
              <Controller name="cobertura_id" control={control} render={({ field }) => (
                <TextField {...field} select label="Cobertura" fullWidth size="small">
                  <MenuItem value="">— sin cobertura —</MenuItem>
                  {coberturas.map(c => (
                    <MenuItem key={c.id} value={c.id}>{c.nombre} (+${c.precio_por_dia}/día)</MenuItem>
                  ))}
                </TextField>
              )} />
            </Grid>

            {/* Adicionales */}
            <Grid size={{ xs: 12 }}>
              <Typography variant="body2" sx={{ fontWeight: 600, mb: 1 }}>Adicionales</Typography>
              <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                {adicionales.map(a => (
                  <Controller key={a.id} name="adicional_ids" control={control} render={({ field }) => (
                    <FormControlLabel
                      control={
                        <Checkbox
                          size="small"
                          checked={field.value?.includes(a.id) ?? false}
                          onChange={e => {
                            const cur = field.value ?? [];
                            field.onChange(e.target.checked ? [...cur, a.id] : cur.filter(id => id !== a.id));
                          }}
                        />
                      }
                      label={<Typography variant="body2">{a.nombre} (+${a.precio_por_dia}/día)</Typography>}
                    />
                  )} />
                ))}
              </Box>
            </Grid>

            {/* Nro vuelo + observaciones */}
            <Grid size={{ xs: 12, sm: 4 }}>
              <Controller name="numero_vuelo" control={control} render={({ field }) => (
                <TextField {...field} label="Nro. vuelo (opcional)" fullWidth size="small" />
              )} />
            </Grid>
            <Grid size={{ xs: 12, sm: 8 }}>
              <Controller name="observaciones" control={control} render={({ field }) => (
                <TextField {...field} label="Observaciones" fullWidth size="small" multiline rows={2} />
              )} />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2 }}>
          <Button onClick={() => setDialogOpen(false)} disabled={loading}>Cancelar</Button>
          <Button variant="contained" onClick={handleSubmit(onSubmit as any)} disabled={loading} sx={{ fontWeight: 600 }}>
            {loading ? 'Creando...' : 'Crear reserva'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
