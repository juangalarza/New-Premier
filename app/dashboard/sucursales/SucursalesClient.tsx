'use client';

import * as React from 'react';
import {
  Box, Button, Card, Typography, Table, TableHead, TableRow, TableCell,
  TableBody, Chip, IconButton, Tooltip, TextField, Dialog, DialogTitle,
  DialogContent, DialogActions, Grid, Alert, FormControlLabel, Checkbox, Fab,
} from '@mui/material';
import {
  AddOutlined, EditOutlined, DeleteOutlined, StoreOutlined,
} from '@mui/icons-material';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import type { Sucursal } from '@/types';
import {
  crearSucursal, actualizarSucursal, eliminarSucursal, type SucursalFormData,
} from './actions';
import { useIsMobile } from '@/hooks/useIsMobile';

const schema = z.object({
  nombre: z.string().min(2, 'Requerido'),
  direccion: z.string().default(''),
  telefono: z.string().default(''),
  email: z.string().default(''),
  activa: z.boolean().default(true),
});

interface Props {
  sucursales: Sucursal[];
}

export default function SucursalesClient({ sucursales: initialSucursales }: Props) {
  const [sucursales, setSucursales] = React.useState(initialSucursales);
  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [editando, setEditando] = React.useState<Sucursal | null>(null);
  const [confirmDelete, setConfirmDelete] = React.useState<Sucursal | null>(null);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState('');

  const isMobile = useIsMobile();

  const { control, handleSubmit, reset, formState: { errors } } = useForm<SucursalFormData>({
    resolver: zodResolver(schema) as any,
    defaultValues: { nombre: '', direccion: '', telefono: '', email: '', activa: true },
  });

  const abrirCrear = () => {
    setEditando(null);
    reset({ nombre: '', direccion: '', telefono: '', email: '', activa: true });
    setError('');
    setDialogOpen(true);
  };

  const abrirEditar = (s: Sucursal) => {
    setEditando(s);
    reset({
      nombre: s.nombre,
      direccion: s.direccion ?? '',
      telefono: s.telefono ?? '',
      email: s.email ?? '',
      activa: s.activa,
    });
    setError('');
    setDialogOpen(true);
  };

  const onSubmit = async (data: SucursalFormData) => {
    setLoading(true);
    setError('');
    try {
      if (editando) {
        await actualizarSucursal(editando.id, data);
        setSucursales(prev => prev.map(s => s.id === editando.id ? { ...s, ...data } : s));
      } else {
        await crearSucursal(data);
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
      await eliminarSucursal(confirmDelete.id);
      setSucursales(prev => prev.filter(s => s.id !== confirmDelete.id));
      setConfirmDelete(null);
    } catch (e: any) {
      setError(e.message ?? 'Error al eliminar');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h6" sx={{ fontWeight: 700, fontFamily: 'Outfit' }}>
          {sucursales.length} sucursal{sucursales.length !== 1 ? 'es' : ''}
        </Typography>
        <Button
          variant="contained"
          startIcon={<AddOutlined />}
          onClick={abrirCrear}
          sx={{ fontWeight: 600, display: { xs: 'none', md: 'inline-flex' } }}
        >
          Nueva sucursal
        </Button>
      </Box>

      {error && !dialogOpen && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      {/* Desktop tabla */}
      <Card sx={{ display: { xs: 'none', md: 'block' } }}>
        <Table>
          <TableHead>
            <TableRow sx={{ '& th': { fontWeight: 700, fontSize: '0.8rem', color: '#64748b', backgroundColor: '#f8fafc', borderBottom: '2px solid #e2e8f0' } }}>
              <TableCell>Nombre</TableCell>
              <TableCell>Dirección</TableCell>
              <TableCell>Teléfono</TableCell>
              <TableCell>Email</TableCell>
              <TableCell>Estado</TableCell>
              <TableCell align="right">Acciones</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {sucursales.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} align="center" sx={{ py: 6 }}>
                  <StoreOutlined sx={{ fontSize: 48, color: '#cbd5e1', mb: 1, display: 'block', mx: 'auto' }} />
                  <Typography color="text.secondary">No hay sucursales cargadas</Typography>
                </TableCell>
              </TableRow>
            ) : (
              sucursales.map(s => (
                <TableRow key={s.id} hover sx={{ '& td': { borderBottom: '1px solid #f1f5f9' } }}>
                  <TableCell>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <StoreOutlined sx={{ color: '#4f46e5', fontSize: 18 }} />
                      <Typography variant="body2" sx={{ fontWeight: 700 }}>{s.nombre}</Typography>
                    </Box>
                  </TableCell>
                  <TableCell><Typography variant="body2">{s.direccion ?? '—'}</Typography></TableCell>
                  <TableCell><Typography variant="body2">{s.telefono ?? '—'}</Typography></TableCell>
                  <TableCell>
                    {s.email ? (
                      <Typography
                        component="a" href={`mailto:${s.email}`}
                        variant="body2"
                        sx={{ color: '#4f46e5', textDecoration: 'none', '&:hover': { textDecoration: 'underline' } }}
                      >
                        {s.email}
                      </Typography>
                    ) : (
                      <Typography variant="body2">—</Typography>
                    )}
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={s.activa ? 'Activa' : 'Inactiva'}
                      size="small"
                      sx={{
                        bgcolor: s.activa ? '#dcfce7' : '#f1f5f9',
                        color: s.activa ? '#16a34a' : '#64748b',
                        fontWeight: 600, fontSize: '0.75rem',
                      }}
                    />
                  </TableCell>
                  <TableCell align="right">
                    <Tooltip title="Editar">
                      <IconButton size="small" onClick={() => abrirEditar(s)}>
                        <EditOutlined fontSize="small" />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Eliminar">
                      <IconButton size="small" color="error" onClick={() => setConfirmDelete(s)}>
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
            {sucursales.length} sucursal{sucursales.length !== 1 ? 'es' : ''} · {sucursales.filter(s => s.activa).length} activa{sucursales.filter(s => s.activa).length !== 1 ? 's' : ''}
          </Typography>
        </Box>
      </Card>

      {/* Mobile cards */}
      <Box sx={{ display: { xs: 'flex', md: 'none' }, flexDirection: 'column', gap: 1 }}>
        {sucursales.length === 0 ? (
          <Box sx={{ py: 6, textAlign: 'center' }}>
            <StoreOutlined sx={{ fontSize: 48, color: '#cbd5e1', mb: 1, display: 'block', mx: 'auto' }} />
            <Typography color="text.secondary">No hay sucursales cargadas</Typography>
          </Box>
        ) : sucursales.map(s => (
          <Box key={s.id} sx={{ p: 1.5, bgcolor: '#fff', border: '1px solid #e2e8f0', borderRadius: 2 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 0.5 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <StoreOutlined sx={{ color: '#4f46e5', fontSize: 18 }} />
                <Typography variant="body2" sx={{ fontWeight: 700 }}>{s.nombre}</Typography>
              </Box>
              <Chip
                label={s.activa ? 'Activa' : 'Inactiva'}
                size="small"
                sx={{ bgcolor: s.activa ? '#dcfce7' : '#f1f5f9', color: s.activa ? '#16a34a' : '#64748b', fontWeight: 600, fontSize: '0.72rem' }}
              />
            </Box>
            {s.direccion && (
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>{s.direccion}</Typography>
            )}
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mt: 0.5 }}>
              <Box sx={{ display: 'flex', gap: 1.5 }}>
                {s.telefono && (
                  <Typography component="a" href={`tel:${s.telefono}`} variant="caption" sx={{ color: '#4f46e5', textDecoration: 'none' }}>
                    {s.telefono}
                  </Typography>
                )}
                {s.email && (
                  <Typography component="a" href={`mailto:${s.email}`} variant="caption" sx={{ color: '#4f46e5', textDecoration: 'none', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 150 }}>
                    {s.email}
                  </Typography>
                )}
              </Box>
              <Box sx={{ display: 'flex', gap: 0.5 }}>
                <IconButton size="small" onClick={() => abrirEditar(s)}><EditOutlined fontSize="small" /></IconButton>
                <IconButton size="small" color="error" onClick={() => setConfirmDelete(s)}><DeleteOutlined fontSize="small" /></IconButton>
              </Box>
            </Box>
          </Box>
        ))}
      </Box>

      {/* Dialog Crear/Editar */}
      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="sm" fullWidth fullScreen={isMobile}>
        <DialogTitle sx={{ fontWeight: 700, fontFamily: 'Outfit' }}>
          {editando ? 'Editar sucursal' : 'Nueva sucursal'}
        </DialogTitle>
        <DialogContent dividers>
          {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
          <Grid container spacing={2} sx={{ pt: 1 }}>
            <Grid size={{ xs: 12 }}>
              <Controller name="nombre" control={control} render={({ field }) => (
                <TextField {...field} label="Nombre *" fullWidth size="small"
                  error={!!errors.nombre} helperText={errors.nombre?.message} />
              )} />
            </Grid>
            <Grid size={{ xs: 12 }}>
              <Controller name="direccion" control={control} render={({ field }) => (
                <TextField {...field} label="Dirección" fullWidth size="small" />
              )} />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <Controller name="telefono" control={control} render={({ field }) => (
                <TextField {...field} label="Teléfono" fullWidth size="small" />
              )} />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <Controller name="email" control={control} render={({ field }) => (
                <TextField {...field} label="Email" type="email" fullWidth size="small" />
              )} />
            </Grid>
            <Grid size={{ xs: 12 }}>
              <Controller name="activa" control={control} render={({ field }) => (
                <FormControlLabel
                  control={<Checkbox checked={field.value} onChange={e => field.onChange(e.target.checked)} />}
                  label="Sucursal activa"
                />
              )} />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2 }}>
          <Button onClick={() => setDialogOpen(false)} disabled={loading}>Cancelar</Button>
          <Button variant="contained" onClick={handleSubmit(onSubmit as any)} disabled={loading} sx={{ fontWeight: 600 }}>
            {loading ? 'Guardando...' : editando ? 'Guardar cambios' : 'Crear sucursal'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Confirm Delete */}
      <Dialog open={!!confirmDelete} onClose={() => setConfirmDelete(null)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ fontWeight: 700 }}>¿Eliminar sucursal?</DialogTitle>
        <DialogContent>
          <Typography>
            Vas a eliminar <strong>{confirmDelete?.nombre}</strong>. Los vehículos asignados quedarán sin sucursal.
          </Typography>
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2 }}>
          <Button onClick={() => setConfirmDelete(null)} disabled={loading}>Cancelar</Button>
          <Button variant="contained" color="error" onClick={handleDelete} disabled={loading} sx={{ fontWeight: 600 }}>
            {loading ? 'Eliminando...' : 'Eliminar'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* FAB mobile */}
      <Fab
        color="primary"
        onClick={abrirCrear}
        sx={{ position: 'fixed', bottom: 20, right: 20, display: { xs: 'flex', md: 'none' }, bgcolor: '#4f46e5', '&:hover': { bgcolor: '#4338ca' } }}
      >
        <AddOutlined />
      </Fab>
    </Box>
  );
}
