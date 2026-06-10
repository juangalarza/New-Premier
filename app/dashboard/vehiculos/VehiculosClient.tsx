'use client';

import * as React from 'react';
import {
  Box, Button, Card, CardContent, Typography, Table, TableHead,
  TableRow, TableCell, TableBody, Chip, Avatar, IconButton, Tooltip,
  Dialog, DialogTitle, DialogContent, DialogActions, TextField,
  MenuItem, Grid, FormControlLabel, Checkbox, Alert, InputAdornment,
} from '@mui/material';
import {
  AddOutlined, EditOutlined, DeleteOutlined, DirectionsCarOutlined,
  SearchOutlined, StoreOutlined, OpenInNewOutlined,
} from '@mui/icons-material';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import type { Vehiculo, Sucursal } from '@/types';
import { crearVehiculo, actualizarVehiculo, eliminarVehiculo, type VehiculoFormData } from './actions';
import { useRouter } from 'next/navigation';

const schema = z.object({
  patente: z.string().min(6, 'Mínimo 6 caracteres').max(8),
  marca: z.string().min(2, 'Requerido'),
  modelo: z.string().min(2, 'Requerido'),
  categoria_id: z.string().uuid('Seleccioná una categoría'),
  color: z.string().default(''),
  anio: z.coerce.number().min(2000).max(2030),
  km_actual: z.coerce.number().min(0),
  combustible_actual: z.string(),
  estado: z.string(),
  es_propio: z.boolean(),
  foto_url: z.string().default(''),
  sucursal_id: z.string().default(''),
});

const ESTADO_COLORS: Record<string, string> = {
  disponible: '#dcfce7',
  alquilado: '#fef9c3',
  taller: '#fed7aa',
  bloqueado: '#f1f5f9',
};
const ESTADO_TEXT: Record<string, string> = {
  disponible: '#16a34a',
  alquilado: '#ca8a04',
  taller: '#ea580c',
  bloqueado: '#6b7280',
};
const ESTADO_LABEL: Record<string, string> = {
  disponible: 'Disponible',
  alquilado: 'Alquilado',
  taller: 'En taller',
  bloqueado: 'Bloqueado',
};

function formatARS(v: number) {
  return new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(v);
}

interface Props {
  vehiculos: Vehiculo[];
  categorias: { id: string; nombre: string }[];
  sucursales: Sucursal[];
  facturadoMap: Record<string, number>;
}

export default function VehiculosClient({ vehiculos: initialVehiculos, categorias, sucursales, facturadoMap }: Props) {
  const router = useRouter();
  const [vehiculos, setVehiculos] = React.useState(initialVehiculos);
  const [busqueda, setBusqueda] = React.useState('');
  const [filtroSucursal, setFiltroSucursal] = React.useState('');
  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [editando, setEditando] = React.useState<Vehiculo | null>(null);
  const [confirmDelete, setConfirmDelete] = React.useState<Vehiculo | null>(null);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState('');

  const { control, handleSubmit, reset, formState: { errors } } = useForm<VehiculoFormData>({
    resolver: zodResolver(schema) as any,
    defaultValues: {
      patente: '', marca: '', modelo: '', categoria_id: '', color: '',
      anio: new Date().getFullYear(), km_actual: 0,
      combustible_actual: 'lleno', estado: 'disponible', es_propio: true, foto_url: '', sucursal_id: '',
    },
  });

  const abrirCrear = () => {
    setEditando(null);
    reset({
      patente: '', marca: '', modelo: '', categoria_id: '', color: '',
      anio: new Date().getFullYear(), km_actual: 0,
      combustible_actual: 'lleno', estado: 'disponible', es_propio: true, foto_url: '', sucursal_id: '',
    });
    setError('');
    setDialogOpen(true);
  };

  const abrirEditar = (v: Vehiculo) => {
    setEditando(v);
    reset({
      patente: v.patente, marca: v.marca, modelo: v.modelo, categoria_id: v.categoria_id,
      color: v.color ?? '', anio: v.anio, km_actual: v.km_actual,
      combustible_actual: v.combustible_actual, estado: v.estado,
      es_propio: v.es_propio, foto_url: v.foto_url ?? '', sucursal_id: v.sucursal_id ?? '',
    });
    setError('');
    setDialogOpen(true);
  };

  const onSubmit = async (data: VehiculoFormData) => {
    setLoading(true);
    setError('');
    try {
      if (editando) {
        await actualizarVehiculo(editando.id, data);
        setVehiculos(prev =>
          prev.map(v => v.id === editando.id ? { ...v, ...data, patente: data.patente.toUpperCase(), categoria: categorias.find(c => c.id === data.categoria_id) as any } : v) as Vehiculo[]
        );
      } else {
        await crearVehiculo(data);
        window.location.reload();
      }
      setDialogOpen(false);
    } catch (e: any) {
      setError(e.message ?? 'Error al guardar');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!confirmDelete) return;
    setLoading(true);
    try {
      await eliminarVehiculo(confirmDelete.id);
      setVehiculos(prev => prev.filter(v => v.id !== confirmDelete.id));
      setConfirmDelete(null);
    } catch (e: any) {
      setError(e.message ?? 'Error al eliminar');
    } finally {
      setLoading(false);
    }
  };

  const filtrados = vehiculos.filter(v => {
    if (filtroSucursal && v.sucursal_id !== filtroSucursal) return false;
    return busqueda === '' ||
      v.patente.toLowerCase().includes(busqueda.toLowerCase()) ||
      v.marca.toLowerCase().includes(busqueda.toLowerCase()) ||
      v.modelo.toLowerCase().includes(busqueda.toLowerCase());
  });

  return (
    <Box>
      {/* Toolbar */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3, gap: 2, flexWrap: 'wrap' }}>
        <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', flexWrap: 'wrap' }}>
          <TextField
            placeholder="Buscar patente, marca o modelo..."
            size="small"
            value={busqueda}
            onChange={e => setBusqueda(e.target.value)}
            sx={{ width: 280 }}
            slotProps={{
              input: { startAdornment: <InputAdornment position="start"><SearchOutlined sx={{ color: '#94a3b8' }} /></InputAdornment> },
            }}
          />
          {sucursales.length > 0 && (
            <TextField
              select label="Sucursal" size="small" value={filtroSucursal}
              onChange={e => setFiltroSucursal(e.target.value)} sx={{ width: 180 }}
            >
              <MenuItem value="">Todas</MenuItem>
              {sucursales.map(s => <MenuItem key={s.id} value={s.id}>{s.nombre}</MenuItem>)}
            </TextField>
          )}
        </Box>
        <Button
          variant="contained"
          startIcon={<AddOutlined />}
          onClick={abrirCrear}
          sx={{ fontWeight: 600 }}
        >
          Agregar vehículo
        </Button>
      </Box>

      {/* Tabla */}
      <Card>
        <Table>
          <TableHead>
            <TableRow sx={{ '& th': { fontWeight: 700, fontSize: '0.8rem', color: '#64748b', backgroundColor: '#f8fafc', borderBottom: '2px solid #e2e8f0' } }}>
              <TableCell>Vehículo</TableCell>
              <TableCell>Patente</TableCell>
              <TableCell>Categoría</TableCell>
              <TableCell>Año</TableCell>
              <TableCell>Km actual</TableCell>
              <TableCell>Combustible</TableCell>
              <TableCell>Estado</TableCell>
              <TableCell>Tipo</TableCell>
              <TableCell>Sucursal</TableCell>
              <TableCell align="right">Facturado (6m)</TableCell>
              <TableCell align="right">Acciones</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {filtrados.length === 0 ? (
              <TableRow>
                <TableCell colSpan={11} align="center" sx={{ py: 6 }}>
                  <DirectionsCarOutlined sx={{ fontSize: 48, color: '#cbd5e1', mb: 1, display: 'block', mx: 'auto' }} />
                  <Typography color="text.secondary">
                    {busqueda ? 'Sin resultados para esa búsqueda' : 'No hay vehículos cargados'}
                  </Typography>
                </TableCell>
              </TableRow>
            ) : (
              filtrados.map(v => (
                <TableRow key={v.id} hover sx={{ '& td': { borderBottom: '1px solid #f1f5f9' } }}>
                  <TableCell>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                      <Avatar src={v.foto_url ?? undefined} variant="rounded" sx={{ width: 44, height: 36, borderRadius: '6px', bgcolor: '#f1f5f9' }}>
                        <DirectionsCarOutlined sx={{ color: '#94a3b8', fontSize: 20 }} />
                      </Avatar>
                      <Box>
                        <Typography variant="body2" sx={{ fontWeight: 700 }}>{v.marca} {v.modelo}</Typography>
                        <Typography variant="caption" color="text.secondary">{v.color ?? '—'}</Typography>
                      </Box>
                    </Box>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" sx={{ fontFamily: 'monospace', fontWeight: 700, letterSpacing: '0.05em' }}>
                      {v.patente}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2">{v.categoria?.nombre ?? '—'}</Typography>
                  </TableCell>
                  <TableCell><Typography variant="body2">{v.anio}</Typography></TableCell>
                  <TableCell>
                    <Typography variant="body2">{v.km_actual.toLocaleString('es-AR')} km</Typography>
                  </TableCell>
                  <TableCell><Typography variant="body2">{v.combustible_actual}</Typography></TableCell>
                  <TableCell>
                    <Chip
                      label={ESTADO_LABEL[v.estado] ?? v.estado}
                      size="small"
                      sx={{
                        bgcolor: ESTADO_COLORS[v.estado] ?? '#f1f5f9',
                        color: ESTADO_TEXT[v.estado] ?? '#64748b',
                        fontWeight: 600, fontSize: '0.75rem',
                      }}
                    />
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={v.es_propio ? 'Propio' : 'Tercero'}
                      size="small"
                      variant="outlined"
                      sx={{ fontWeight: 600, fontSize: '0.75rem', color: v.es_propio ? '#4f46e5' : '#6b7280' }}
                    />
                  </TableCell>
                  <TableCell>
                    {v.sucursal ? (
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                        <StoreOutlined sx={{ fontSize: 14, color: '#4f46e5' }} />
                        <Typography variant="body2" sx={{ fontSize: '0.8rem' }}>{(v.sucursal as any).nombre}</Typography>
                      </Box>
                    ) : (
                      <Typography variant="body2" sx={{ color: '#94a3b8', fontSize: '0.8rem' }}>—</Typography>
                    )}
                  </TableCell>
                  <TableCell align="right">
                    <Typography
                      variant="body2"
                      sx={{
                        fontWeight: 700,
                        color: (facturadoMap[v.id] ?? 0) > 0 ? '#4f46e5' : '#94a3b8',
                        fontSize: '0.82rem',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {(facturadoMap[v.id] ?? 0) > 0 ? formatARS(facturadoMap[v.id]) : '—'}
                    </Typography>
                  </TableCell>
                  <TableCell align="right">
                    <Tooltip title="Ver detalle">
                      <IconButton size="small" onClick={() => router.push(`/dashboard/vehiculos/${v.id}`)}>
                        <OpenInNewOutlined fontSize="small" />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Editar">
                      <IconButton size="small" onClick={() => abrirEditar(v)}>
                        <EditOutlined fontSize="small" />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Eliminar">
                      <IconButton size="small" color="error" onClick={() => setConfirmDelete(v)}>
                        <DeleteOutlined fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
        <Box sx={{ px: 3, py: 1.5, borderTop: '1px solid #f1f5f9' }}>
          <Typography variant="caption" color="text.secondary">
            {filtrados.length} vehículo{filtrados.length !== 1 ? 's' : ''}
            {busqueda ? ` · filtrado de ${vehiculos.length}` : ` en flota`}
          </Typography>
        </Box>
      </Card>

      {/* Dialog Crear/Editar */}
      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 700, fontFamily: 'Outfit' }}>
          {editando ? 'Editar vehículo' : 'Agregar vehículo'}
        </DialogTitle>
        <DialogContent dividers>
          {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
          <Box component="form" sx={{ display: 'flex', flexDirection: 'column', gap: 2.5, pt: 1 }}>
            <Grid container spacing={2}>
              <Grid size={{ xs: 12, sm: 6 }}>
                <Controller name="patente" control={control} render={({ field }) => (
                  <TextField {...field} label="Patente" fullWidth size="small"
                    error={!!errors.patente} helperText={errors.patente?.message}
                    slotProps={{ htmlInput: { style: { textTransform: 'uppercase' } } }} />
                )} />
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <Controller name="categoria_id" control={control} render={({ field }) => (
                  <TextField {...field} select label="Categoría" fullWidth size="small"
                    error={!!errors.categoria_id} helperText={errors.categoria_id?.message}>
                    {categorias.map(c => <MenuItem key={c.id} value={c.id}>{c.nombre}</MenuItem>)}
                  </TextField>
                )} />
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <Controller name="marca" control={control} render={({ field }) => (
                  <TextField {...field} label="Marca" fullWidth size="small"
                    error={!!errors.marca} helperText={errors.marca?.message} />
                )} />
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <Controller name="modelo" control={control} render={({ field }) => (
                  <TextField {...field} label="Modelo" fullWidth size="small"
                    error={!!errors.modelo} helperText={errors.modelo?.message} />
                )} />
              </Grid>
              <Grid size={{ xs: 12, sm: 4 }}>
                <Controller name="color" control={control} render={({ field }) => (
                  <TextField {...field} label="Color" fullWidth size="small" />
                )} />
              </Grid>
              <Grid size={{ xs: 12, sm: 4 }}>
                <Controller name="anio" control={control} render={({ field }) => (
                  <TextField {...field} label="Año" type="number" fullWidth size="small"
                    error={!!errors.anio} helperText={errors.anio?.message} />
                )} />
              </Grid>
              <Grid size={{ xs: 12, sm: 4 }}>
                <Controller name="km_actual" control={control} render={({ field }) => (
                  <TextField {...field} label="Km actual" type="number" fullWidth size="small"
                    error={!!errors.km_actual} helperText={errors.km_actual?.message} />
                )} />
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <Controller name="combustible_actual" control={control} render={({ field }) => (
                  <TextField {...field} select label="Combustible" fullWidth size="small">
                    {['1/8', '1/4', '1/2', '3/4', 'lleno'].map(v => <MenuItem key={v} value={v}>{v}</MenuItem>)}
                  </TextField>
                )} />
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <Controller name="estado" control={control} render={({ field }) => (
                  <TextField {...field} select label="Estado" fullWidth size="small">
                    <MenuItem value="disponible">Disponible</MenuItem>
                    <MenuItem value="alquilado">Alquilado</MenuItem>
                    <MenuItem value="taller">En taller</MenuItem>
                    <MenuItem value="bloqueado">Bloqueado</MenuItem>
                  </TextField>
                )} />
              </Grid>
              <Grid size={{ xs: 12 }}>
                <Controller name="foto_url" control={control} render={({ field }) => (
                  <TextField {...field} label="URL de foto (opcional)" fullWidth size="small" />
                )} />
              </Grid>
              {sucursales.length > 0 && (
                <Grid size={{ xs: 12 }}>
                  <Controller name="sucursal_id" control={control} render={({ field }) => (
                    <TextField {...field} select label="Sucursal (opcional)" fullWidth size="small">
                      <MenuItem value="">— sin sucursal —</MenuItem>
                      {sucursales.map(s => <MenuItem key={s.id} value={s.id}>{s.nombre}</MenuItem>)}
                    </TextField>
                  )} />
                </Grid>
              )}
              <Grid size={{ xs: 12 }}>
                <Controller name="es_propio" control={control} render={({ field }) => (
                  <FormControlLabel
                    control={<Checkbox checked={field.value} onChange={e => field.onChange(e.target.checked)} />}
                    label="Vehículo propio (no de terceros)"
                  />
                )} />
              </Grid>
            </Grid>
          </Box>
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2 }}>
          <Button onClick={() => setDialogOpen(false)} disabled={loading}>Cancelar</Button>
          <Button variant="contained" onClick={handleSubmit(onSubmit as any)} disabled={loading} sx={{ fontWeight: 600 }}>
            {loading ? 'Guardando...' : editando ? 'Guardar cambios' : 'Agregar'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Confirm Delete */}
      <Dialog open={!!confirmDelete} onClose={() => setConfirmDelete(null)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ fontWeight: 700 }}>¿Eliminar vehículo?</DialogTitle>
        <DialogContent>
          <Typography>
            Vas a eliminar <strong>{confirmDelete?.patente} — {confirmDelete?.marca} {confirmDelete?.modelo}</strong>.
            Esta acción no se puede deshacer.
          </Typography>
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
