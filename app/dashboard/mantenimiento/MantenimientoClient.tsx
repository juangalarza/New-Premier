'use client';

import * as React from 'react';
import {
  Box, Button, Card, CardContent, Typography, Table, TableHead, TableRow, TableCell,
  TableBody, Chip, Avatar, IconButton, Tooltip, Dialog, DialogTitle, DialogContent,
  DialogActions, TextField, MenuItem, Grid, Alert, InputAdornment,
} from '@mui/material';
import {
  AddOutlined, EditOutlined, DeleteOutlined, BuildOutlined, CheckCircleOutlined,
  SearchOutlined, WarningAmberOutlined, AccessTimeOutlined, EngineeringOutlined,
  DirectionsCarOutlined,
} from '@mui/icons-material';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  crearMantenimiento, actualizarMantenimiento, marcarRealizado, eliminarMantenimiento,
  type MantenimientoConVehiculo, type MantenimientoFormData, type MarcarRealizadoData,
} from './actions';

// ─── Constantes ───────────────────────────────────────────────────────────────

const TIPO_LABEL: Record<string, string> = {
  service: 'Service',
  vtv: 'VTV',
  neumaticos: 'Neumáticos',
  frenos: 'Frenos',
  aceite: 'Aceite',
  otro: 'Otro',
};

const TIPO_COLOR: Record<string, { bg: string; color: string }> = {
  service:    { bg: '#dbeafe', color: '#1d4ed8' },
  vtv:        { bg: '#dcfce7', color: '#15803d' },
  neumaticos: { bg: '#fef9c3', color: '#a16207' },
  frenos:     { bg: '#fee2e2', color: '#b91c1c' },
  aceite:     { bg: '#f0fdf4', color: '#166534' },
  otro:       { bg: '#f1f5f9', color: '#475569' },
};

const ESTADO_STYLE: Record<string, { bg: string; color: string; label: string }> = {
  pendiente:  { bg: '#fef9c3', color: '#a16207', label: 'Pendiente' },
  en_proceso: { bg: '#dbeafe', color: '#1d4ed8', label: 'En proceso' },
  realizado:  { bg: '#dcfce7', color: '#15803d', label: 'Realizado' },
};

function formatFecha(iso: string) {
  if (!iso) return '—';
  const [y, m, d] = iso.split('T')[0].split('-');
  return `${d}/${m}/${y}`;
}

function formatARS(v: number | null) {
  if (v == null) return '—';
  return new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(v);
}

function todayISO() {
  return new Date().toISOString().split('T')[0];
}

function plusDaysISO(days: number) {
  return new Date(Date.now() + days * 86400000).toISOString().split('T')[0];
}

// ─── Schemas ──────────────────────────────────────────────────────────────────

const formSchema = z.object({
  vehiculo_id: z.string().min(1, 'Seleccioná un vehículo'),
  tipo: z.string().min(1, 'Seleccioná un tipo'),
  descripcion: z.string().min(2, 'Requerido'),
  fecha_programada: z.string().min(1, 'Requerido'),
  estado: z.string().min(1, 'Requerido'),
  km_proximo: z.coerce.number().min(0).optional(),
  proveedor: z.string().default(''),
  observaciones: z.string().default(''),
});
type FormValues = z.infer<typeof formSchema>;

const realizadoSchema = z.object({
  fecha_realizada: z.string().min(1, 'Requerido'),
  km_al_realizar: z.coerce.number().min(0).optional(),
  costo: z.coerce.number().min(0).optional(),
  proveedor: z.string().default(''),
});
type RealizadoValues = z.infer<typeof realizadoSchema>;

// ─── Props ────────────────────────────────────────────────────────────────────

interface Props {
  mantenimientos: MantenimientoConVehiculo[];
  vehiculos: { id: string; patente: string; marca: string; modelo: string }[];
}

// ─── Componente ───────────────────────────────────────────────────────────────

export default function MantenimientoClient({ mantenimientos: initial, vehiculos }: Props) {
  const [items, setItems] = React.useState(initial);
  const [busqueda, setBusqueda] = React.useState('');
  const [filtroTipo, setFiltroTipo] = React.useState('todos');
  const [filtroEstado, setFiltroEstado] = React.useState('todos');

  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [editando, setEditando] = React.useState<MantenimientoConVehiculo | null>(null);

  const [realizarOpen, setRealizarOpen] = React.useState(false);
  const [realizando, setRealizando] = React.useState<MantenimientoConVehiculo | null>(null);

  const [confirmDelete, setConfirmDelete] = React.useState<MantenimientoConVehiculo | null>(null);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState('');

  // Form — crear/editar
  const { control, handleSubmit, reset, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(formSchema) as any,
    defaultValues: {
      vehiculo_id: '', tipo: 'service', descripcion: '', fecha_programada: todayISO(),
      estado: 'pendiente', km_proximo: undefined, proveedor: '', observaciones: '',
    },
  });

  // Form — marcar realizado
  const { control: rControl, handleSubmit: rSubmit, reset: rReset, formState: { errors: rErrors } } = useForm<RealizadoValues>({
    resolver: zodResolver(realizadoSchema) as any,
    defaultValues: { fecha_realizada: todayISO(), km_al_realizar: undefined, costo: undefined, proveedor: '' },
  });

  // ─── Derived ────────────────────────────────────────────────────────────────

  const today = todayISO();
  const next7 = plusDaysISO(7);

  const vencidos = items.filter(m => m.fecha_programada < today && m.estado !== 'realizado');
  const proximos = items.filter(m => m.fecha_programada >= today && m.fecha_programada <= next7 && m.estado === 'pendiente');
  const enProceso = items.filter(m => m.estado === 'en_proceso');

  const filtrados = items.filter(item => {
    const txt = busqueda.toLowerCase();
    const matchBusqueda =
      busqueda === '' ||
      item.vehiculo.patente.toLowerCase().includes(txt) ||
      item.vehiculo.modelo.toLowerCase().includes(txt) ||
      item.descripcion.toLowerCase().includes(txt);
    const matchTipo = filtroTipo === 'todos' || item.tipo === filtroTipo;
    const matchEstado = filtroEstado === 'todos' || item.estado === filtroEstado;
    return matchBusqueda && matchTipo && matchEstado;
  });

  // ─── Handlers crear/editar ───────────────────────────────────────────────────

  const abrirCrear = () => {
    setEditando(null);
    reset({
      vehiculo_id: '', tipo: 'service', descripcion: '', fecha_programada: todayISO(),
      estado: 'pendiente', km_proximo: undefined, proveedor: '', observaciones: '',
    });
    setError('');
    setDialogOpen(true);
  };

  const abrirEditar = (item: MantenimientoConVehiculo) => {
    setEditando(item);
    reset({
      vehiculo_id: item.vehiculo_id,
      tipo: item.tipo,
      descripcion: item.descripcion,
      fecha_programada: item.fecha_programada.split('T')[0],
      estado: item.estado,
      km_proximo: item.km_proximo ?? undefined,
      proveedor: item.proveedor ?? '',
      observaciones: item.observaciones ?? '',
    });
    setError('');
    setDialogOpen(true);
  };

  const onSubmit = async (data: FormValues) => {
    setLoading(true);
    setError('');
    try {
      const payload: MantenimientoFormData = {
        vehiculo_id: data.vehiculo_id,
        tipo: data.tipo,
        descripcion: data.descripcion,
        fecha_programada: data.fecha_programada,
        estado: data.estado,
        km_proximo: data.km_proximo,
        proveedor: data.proveedor ?? '',
        observaciones: data.observaciones ?? '',
      };
      if (editando) {
        await actualizarMantenimiento(editando.id, payload);
      } else {
        await crearMantenimiento(payload);
      }
      window.location.reload();
    } catch (e: any) {
      setError(e.message ?? 'Error al guardar');
    } finally {
      setLoading(false);
    }
  };

  // ─── Handlers marcar realizado ───────────────────────────────────────────────

  const abrirRealizar = (item: MantenimientoConVehiculo) => {
    setRealizando(item);
    rReset({ fecha_realizada: todayISO(), km_al_realizar: undefined, costo: undefined, proveedor: item.proveedor ?? '' });
    setError('');
    setRealizarOpen(true);
  };

  const onRealizar = async (data: RealizadoValues) => {
    if (!realizando) return;
    setLoading(true);
    setError('');
    try {
      const payload: MarcarRealizadoData = {
        fecha_realizada: data.fecha_realizada,
        km_al_realizar: data.km_al_realizar,
        costo: data.costo,
        proveedor: data.proveedor ?? '',
      };
      await marcarRealizado(realizando.id, payload);
      setItems(prev =>
        prev.map(m =>
          m.id === realizando.id
            ? { ...m, estado: 'realizado' as const, fecha_realizada: data.fecha_realizada, km_al_realizar: data.km_al_realizar ?? null, costo: data.costo ?? null }
            : m
        )
      );
      setRealizarOpen(false);
    } catch (e: any) {
      setError(e.message ?? 'Error al marcar como realizado');
    } finally {
      setLoading(false);
    }
  };

  // ─── Handler eliminar ────────────────────────────────────────────────────────

  const handleDelete = async () => {
    if (!confirmDelete) return;
    setLoading(true);
    try {
      await eliminarMantenimiento(confirmDelete.id);
      setItems(prev => prev.filter(m => m.id !== confirmDelete.id));
      setConfirmDelete(null);
    } catch (e: any) {
      setError(e.message ?? 'Error al eliminar');
    } finally {
      setLoading(false);
    }
  };

  // ─── Render ──────────────────────────────────────────────────────────────────

  return (
    <Box>
      {/* ── Alert cards ──────────────────────────────────────────────────────── */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <Card sx={{ borderLeft: `4px solid ${vencidos.length > 0 ? '#dc2626' : '#e2e8f0'}` }}>
            <CardContent sx={{ display: 'flex', alignItems: 'center', gap: 2, py: 2, '&:last-child': { pb: 2 } }}>
              <WarningAmberOutlined sx={{ fontSize: 36, color: vencidos.length > 0 ? '#dc2626' : '#cbd5e1' }} />
              <Box>
                <Typography sx={{ fontWeight: 800, fontSize: '1.75rem', lineHeight: 1, color: vencidos.length > 0 ? '#dc2626' : '#1e293b' }}>
                  {vencidos.length}
                </Typography>
                <Typography variant="caption" color="text.secondary">Vencidos sin realizar</Typography>
              </Box>
            </CardContent>
          </Card>
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <Card sx={{ borderLeft: `4px solid ${proximos.length > 0 ? '#f59e0b' : '#e2e8f0'}` }}>
            <CardContent sx={{ display: 'flex', alignItems: 'center', gap: 2, py: 2, '&:last-child': { pb: 2 } }}>
              <AccessTimeOutlined sx={{ fontSize: 36, color: proximos.length > 0 ? '#f59e0b' : '#cbd5e1' }} />
              <Box>
                <Typography sx={{ fontWeight: 800, fontSize: '1.75rem', lineHeight: 1, color: proximos.length > 0 ? '#f59e0b' : '#1e293b' }}>
                  {proximos.length}
                </Typography>
                <Typography variant="caption" color="text.secondary">Próximos 7 días</Typography>
              </Box>
            </CardContent>
          </Card>
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <Card sx={{ borderLeft: `4px solid ${enProceso.length > 0 ? '#2563eb' : '#e2e8f0'}` }}>
            <CardContent sx={{ display: 'flex', alignItems: 'center', gap: 2, py: 2, '&:last-child': { pb: 2 } }}>
              <EngineeringOutlined sx={{ fontSize: 36, color: enProceso.length > 0 ? '#2563eb' : '#cbd5e1' }} />
              <Box>
                <Typography sx={{ fontWeight: 800, fontSize: '1.75rem', lineHeight: 1, color: enProceso.length > 0 ? '#2563eb' : '#1e293b' }}>
                  {enProceso.length}
                </Typography>
                <Typography variant="caption" color="text.secondary">En taller ahora</Typography>
              </Box>
            </CardContent>
          </Card>
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <Card sx={{ borderLeft: '4px solid #e2e8f0' }}>
            <CardContent sx={{ display: 'flex', alignItems: 'center', gap: 2, py: 2, '&:last-child': { pb: 2 } }}>
              <BuildOutlined sx={{ fontSize: 36, color: '#94a3b8' }} />
              <Box>
                <Typography sx={{ fontWeight: 800, fontSize: '1.75rem', lineHeight: 1 }}>
                  {items.filter(m => m.estado !== 'realizado').length}
                </Typography>
                <Typography variant="caption" color="text.secondary">Activos / pendientes</Typography>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* ── Toolbar ──────────────────────────────────────────────────────────── */}
      <Box sx={{ display: 'flex', gap: 1.5, flexWrap: 'wrap', alignItems: 'center', mb: 2.5, justifyContent: 'space-between' }}>
        <Box sx={{ display: 'flex', gap: 1.5, flexWrap: 'wrap', alignItems: 'center' }}>
          <TextField
            placeholder="Buscar patente, modelo o descripción..."
            size="small"
            value={busqueda}
            onChange={e => setBusqueda(e.target.value)}
            sx={{ width: 300 }}
            slotProps={{
              input: { startAdornment: <InputAdornment position="start"><SearchOutlined sx={{ color: '#94a3b8' }} /></InputAdornment> },
            }}
          />
          <TextField
            select size="small" value={filtroTipo} onChange={e => setFiltroTipo(e.target.value)}
            sx={{ width: 160 }}
          >
            <MenuItem value="todos">Todos los tipos</MenuItem>
            {Object.entries(TIPO_LABEL).map(([k, v]) => <MenuItem key={k} value={k}>{v}</MenuItem>)}
          </TextField>
          <TextField
            select size="small" value={filtroEstado} onChange={e => setFiltroEstado(e.target.value)}
            sx={{ width: 160 }}
          >
            <MenuItem value="todos">Todos los estados</MenuItem>
            <MenuItem value="pendiente">Pendiente</MenuItem>
            <MenuItem value="en_proceso">En proceso</MenuItem>
            <MenuItem value="realizado">Realizado</MenuItem>
          </TextField>
        </Box>
        <Button
          variant="contained"
          startIcon={<AddOutlined />}
          onClick={abrirCrear}
          sx={{ fontWeight: 600 }}
        >
          Nuevo mantenimiento
        </Button>
      </Box>

      {/* ── Tabla ────────────────────────────────────────────────────────────── */}
      <Card>
        <Table>
          <TableHead>
            <TableRow sx={{ '& th': { fontWeight: 700, fontSize: '0.78rem', color: '#64748b', backgroundColor: '#f8fafc', borderBottom: '2px solid #e2e8f0' } }}>
              <TableCell>Vehículo</TableCell>
              <TableCell>Tipo</TableCell>
              <TableCell>Descripción</TableCell>
              <TableCell>Fecha programada</TableCell>
              <TableCell>Fecha realizada</TableCell>
              <TableCell>Cada km</TableCell>
              <TableCell>Costo</TableCell>
              <TableCell>Estado</TableCell>
              <TableCell align="right">Acciones</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {filtrados.length === 0 ? (
              <TableRow>
                <TableCell colSpan={9} align="center" sx={{ py: 7 }}>
                  <BuildOutlined sx={{ fontSize: 48, color: '#cbd5e1', mb: 1, display: 'block', mx: 'auto' }} />
                  <Typography color="text.secondary">
                    {busqueda || filtroTipo !== 'todos' || filtroEstado !== 'todos'
                      ? 'Sin resultados para los filtros aplicados'
                      : 'No hay mantenimientos registrados'}
                  </Typography>
                </TableCell>
              </TableRow>
            ) : (
              filtrados.map(item => {
                const isVencido = item.fecha_programada < today && item.estado !== 'realizado';
                const tipoStyle = TIPO_COLOR[item.tipo] ?? TIPO_COLOR.otro;
                const estadoStyle = ESTADO_STYLE[item.estado] ?? ESTADO_STYLE.pendiente;

                return (
                  <TableRow
                    key={item.id}
                    hover
                    sx={{
                      '& td': { borderBottom: '1px solid #f1f5f9' },
                      ...(isVencido ? { backgroundColor: '#fff5f5' } : {}),
                    }}
                  >
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                        <Avatar
                          src={item.vehiculo.foto_url ?? undefined}
                          variant="rounded"
                          sx={{ width: 40, height: 32, borderRadius: '6px', bgcolor: '#f1f5f9' }}
                        >
                          <DirectionsCarOutlined sx={{ color: '#94a3b8', fontSize: 18 }} />
                        </Avatar>
                        <Box>
                          <Typography variant="body2" sx={{ fontFamily: 'monospace', fontWeight: 700, letterSpacing: '0.05em', lineHeight: 1.2 }}>
                            {item.vehiculo.patente}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {item.vehiculo.marca} {item.vehiculo.modelo}
                          </Typography>
                        </Box>
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={TIPO_LABEL[item.tipo] ?? item.tipo}
                        size="small"
                        sx={{ bgcolor: tipoStyle.bg, color: tipoStyle.color, fontWeight: 600, fontSize: '0.73rem' }}
                      />
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" sx={{ maxWidth: 200 }}>
                        {item.descripcion}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography
                        variant="body2"
                        sx={{ fontWeight: isVencido ? 700 : 400, color: isVencido ? '#dc2626' : 'inherit' }}
                      >
                        {formatFecha(item.fecha_programada)}
                        {isVencido && (
                          <Typography component="span" variant="caption" sx={{ display: 'block', color: '#dc2626' }}>
                            Vencido
                          </Typography>
                        )}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" color={item.fecha_realizada ? 'text.primary' : 'text.secondary'}>
                        {item.fecha_realizada ? formatFecha(item.fecha_realizada) : '—'}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" color={item.km_proximo ? 'text.primary' : 'text.secondary'}>
                        {item.km_proximo ? `c/${item.km_proximo.toLocaleString('es-AR')} km` : '—'}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">{formatARS(item.costo)}</Typography>
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={estadoStyle.label}
                        size="small"
                        sx={{ bgcolor: estadoStyle.bg, color: estadoStyle.color, fontWeight: 600, fontSize: '0.73rem' }}
                      />
                    </TableCell>
                    <TableCell align="right" sx={{ whiteSpace: 'nowrap' }}>
                      {item.estado !== 'realizado' && (
                        <Tooltip title="Marcar como realizado">
                          <IconButton size="small" color="success" onClick={() => abrirRealizar(item)}>
                            <CheckCircleOutlined fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      )}
                      <Tooltip title="Editar">
                        <IconButton size="small" onClick={() => abrirEditar(item)}>
                          <EditOutlined fontSize="small" />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Eliminar">
                        <IconButton size="small" color="error" onClick={() => setConfirmDelete(item)}>
                          <DeleteOutlined fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
        <Box sx={{ px: 3, py: 1.5, borderTop: '1px solid #f1f5f9' }}>
          <Typography variant="caption" color="text.secondary">
            {filtrados.length} registro{filtrados.length !== 1 ? 's' : ''}
            {(busqueda || filtroTipo !== 'todos' || filtroEstado !== 'todos') ? ` · filtrado de ${items.length}` : ''}
          </Typography>
        </Box>
      </Card>

      {/* ── Dialog crear / editar ────────────────────────────────────────────── */}
      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 700, fontFamily: 'Outfit' }}>
          {editando ? 'Editar mantenimiento' : 'Nuevo mantenimiento'}
        </DialogTitle>
        <DialogContent dividers>
          {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5, pt: 1 }}>
            <Grid container spacing={2}>
              <Grid size={{ xs: 12 }}>
                <Controller name="vehiculo_id" control={control} render={({ field }) => (
                  <TextField {...field} select label="Vehículo" fullWidth size="small"
                    error={!!errors.vehiculo_id} helperText={errors.vehiculo_id?.message}>
                    {vehiculos.map(v => (
                      <MenuItem key={v.id} value={v.id}>
                        {v.patente} — {v.marca} {v.modelo}
                      </MenuItem>
                    ))}
                  </TextField>
                )} />
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <Controller name="tipo" control={control} render={({ field }) => (
                  <TextField {...field} select label="Tipo" fullWidth size="small"
                    error={!!errors.tipo} helperText={errors.tipo?.message}>
                    {Object.entries(TIPO_LABEL).map(([k, v]) => <MenuItem key={k} value={k}>{v}</MenuItem>)}
                  </TextField>
                )} />
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <Controller name="estado" control={control} render={({ field }) => (
                  <TextField {...field} select label="Estado" fullWidth size="small"
                    error={!!errors.estado} helperText={errors.estado?.message}>
                    <MenuItem value="pendiente">Pendiente</MenuItem>
                    <MenuItem value="en_proceso">En proceso (envía a taller)</MenuItem>
                    <MenuItem value="realizado">Realizado</MenuItem>
                  </TextField>
                )} />
              </Grid>
              <Grid size={{ xs: 12 }}>
                <Controller name="descripcion" control={control} render={({ field }) => (
                  <TextField {...field} label="Descripción" fullWidth size="small" multiline rows={2}
                    error={!!errors.descripcion} helperText={errors.descripcion?.message} />
                )} />
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <Controller name="fecha_programada" control={control} render={({ field }) => (
                  <TextField {...field} type="date" label="Fecha programada" fullWidth size="small"
                    slotProps={{ inputLabel: { shrink: true } }}
                    error={!!errors.fecha_programada} helperText={errors.fecha_programada?.message} />
                )} />
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <Controller name="km_proximo" control={control} render={({ field: { onChange, value, ...rest } }) => (
                  <TextField
                    {...rest}
                    value={value ?? ''}
                    onChange={e => onChange(e.target.value === '' ? undefined : Number(e.target.value))}
                    type="number"
                    label="Intervalo cada X km (opcional)"
                    fullWidth size="small"
                    slotProps={{ htmlInput: { min: 0 } }}
                  />
                )} />
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <Controller name="proveedor" control={control} render={({ field }) => (
                  <TextField {...field} label="Proveedor / Taller (opcional)" fullWidth size="small" />
                )} />
              </Grid>
              <Grid size={{ xs: 12 }}>
                <Controller name="observaciones" control={control} render={({ field }) => (
                  <TextField {...field} label="Observaciones (opcional)" fullWidth size="small" multiline rows={2} />
                )} />
              </Grid>
            </Grid>
          </Box>
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2 }}>
          <Button onClick={() => setDialogOpen(false)} disabled={loading}>Cancelar</Button>
          <Button variant="contained" onClick={handleSubmit(onSubmit as any)} disabled={loading} sx={{ fontWeight: 600 }}>
            {loading ? 'Guardando...' : editando ? 'Guardar cambios' : 'Crear mantenimiento'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* ── Dialog marcar realizado ──────────────────────────────────────────── */}
      <Dialog open={realizarOpen} onClose={() => setRealizarOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ fontWeight: 700, fontFamily: 'Outfit' }}>
          Registrar realización
        </DialogTitle>
        <DialogContent dividers>
          {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
          {realizando && (
            <Box sx={{ mb: 2, p: 1.5, bgcolor: '#f8fafc', borderRadius: 1 }}>
              <Typography variant="body2" sx={{ fontWeight: 700 }}>
                {realizando.vehiculo.patente} — {realizando.vehiculo.marca} {realizando.vehiculo.modelo}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {TIPO_LABEL[realizando.tipo]} · {realizando.descripcion}
              </Typography>
            </Box>
          )}
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
            <Grid container spacing={2}>
              <Grid size={{ xs: 12 }}>
                <Controller name="fecha_realizada" control={rControl} render={({ field }) => (
                  <TextField {...field} type="date" label="Fecha de realización" fullWidth size="small"
                    slotProps={{ inputLabel: { shrink: true } }}
                    error={!!rErrors.fecha_realizada} helperText={rErrors.fecha_realizada?.message} />
                )} />
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <Controller name="km_al_realizar" control={rControl} render={({ field: { onChange, value, ...rest } }) => (
                  <TextField
                    {...rest}
                    value={value ?? ''}
                    onChange={e => onChange(e.target.value === '' ? undefined : Number(e.target.value))}
                    type="number"
                    label="Km odómetro (opcional)"
                    fullWidth size="small"
                    slotProps={{ htmlInput: { min: 0 } }}
                  />
                )} />
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <Controller name="costo" control={rControl} render={({ field: { onChange, value, ...rest } }) => (
                  <TextField
                    {...rest}
                    value={value ?? ''}
                    onChange={e => onChange(e.target.value === '' ? undefined : Number(e.target.value))}
                    type="number"
                    label="Costo ARS (opcional)"
                    fullWidth size="small"
                    slotProps={{ htmlInput: { min: 0 } }}
                  />
                )} />
              </Grid>
              <Grid size={{ xs: 12 }}>
                <Controller name="proveedor" control={rControl} render={({ field }) => (
                  <TextField {...field} label="Proveedor / Taller (opcional)" fullWidth size="small" />
                )} />
              </Grid>
            </Grid>
          </Box>
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2 }}>
          <Button onClick={() => setRealizarOpen(false)} disabled={loading}>Cancelar</Button>
          <Button variant="contained" color="success" onClick={rSubmit(onRealizar as any)} disabled={loading} sx={{ fontWeight: 600 }}>
            {loading ? 'Guardando...' : 'Marcar como realizado'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* ── Dialog confirmar eliminación ─────────────────────────────────────── */}
      <Dialog open={!!confirmDelete} onClose={() => setConfirmDelete(null)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ fontWeight: 700 }}>¿Eliminar mantenimiento?</DialogTitle>
        <DialogContent>
          <Typography>
            Vas a eliminar el mantenimiento{' '}
            <strong>
              {confirmDelete ? `${TIPO_LABEL[confirmDelete.tipo]} — ${confirmDelete.vehiculo.patente}` : ''}
            </strong>.
            Esta acción no se puede deshacer.
          </Typography>
          {confirmDelete?.estado === 'en_proceso' && (
            <Alert severity="warning" sx={{ mt: 2 }}>
              El vehículo está en taller por este mantenimiento. Al eliminarlo se restaurará como disponible.
            </Alert>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2 }}>
          <Button onClick={() => setConfirmDelete(null)} disabled={loading}>Cancelar</Button>
          <Button variant="contained" color="error" onClick={handleDelete} disabled={loading} sx={{ fontWeight: 600 }}>
            {loading ? 'Eliminando...' : 'Eliminar'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
