'use client';

import * as React from 'react';
import {
  Box, Button, Card, Typography, Table, TableHead, TableRow,
  TableCell, TableBody, IconButton, Tooltip, Dialog, DialogTitle,
  DialogContent, DialogActions, TextField, Grid, Alert, InputAdornment, Avatar,
} from '@mui/material';
import {
  AddOutlined, EditOutlined, DeleteOutlined, PeopleAltOutlined, SearchOutlined,
} from '@mui/icons-material';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import type { Cliente } from '@/types';
import { crearCliente, actualizarCliente, eliminarCliente, type ClienteFormData } from './actions';

const schema = z.object({
  nombre: z.string().min(2, 'Requerido'),
  apellido: z.string().min(2, 'Requerido'),
  email: z.string().email('Email inválido'),
  telefono: z.string().min(8, 'Requerido'),
  dni_pasaporte: z.string().min(6, 'Requerido'),
  licencia_conducir: z.string().min(4, 'Requerido'),
  ciudad: z.string().min(2, 'Requerido'),
  pais: z.string().min(2, 'Requerido'),
  fecha_nacimiento: z.string().default(''),
  direccion: z.string().default(''),
});

interface Props {
  clientes: Cliente[];
}

function getInitials(nombre: string, apellido: string) {
  return `${nombre[0] ?? ''}${apellido[0] ?? ''}`.toUpperCase();
}

function formatFecha(iso: string) {
  return new Date(iso).toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

export default function ClientesClient({ clientes: initialClientes }: Props) {
  const [clientes, setClientes] = React.useState(initialClientes);
  const [busqueda, setBusqueda] = React.useState('');
  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [editando, setEditando] = React.useState<Cliente | null>(null);
  const [confirmDelete, setConfirmDelete] = React.useState<Cliente | null>(null);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState('');

  const { control, handleSubmit, reset, formState: { errors } } = useForm<ClienteFormData>({
    resolver: zodResolver(schema) as any,
    defaultValues: {
      nombre: '', apellido: '', email: '', telefono: '',
      dni_pasaporte: '', licencia_conducir: '', ciudad: '', pais: 'Argentina',
      fecha_nacimiento: '', direccion: '',
    },
  });

  const abrirCrear = () => {
    setEditando(null);
    reset({ nombre: '', apellido: '', email: '', telefono: '', dni_pasaporte: '', licencia_conducir: '', ciudad: '', pais: 'Argentina', fecha_nacimiento: '', direccion: '' });
    setError('');
    setDialogOpen(true);
  };

  const abrirEditar = (c: Cliente) => {
    setEditando(c);
    reset({ nombre: c.nombre, apellido: c.apellido, email: c.email, telefono: c.telefono, dni_pasaporte: c.dni_pasaporte, licencia_conducir: c.licencia_conducir, ciudad: c.ciudad, pais: c.pais, fecha_nacimiento: c.fecha_nacimiento ?? '', direccion: c.direccion ?? '' });
    setError('');
    setDialogOpen(true);
  };

  const onSubmit = async (data: ClienteFormData) => {
    setLoading(true);
    setError('');
    try {
      if (editando) {
        await actualizarCliente(editando.id, data);
        setClientes(prev => prev.map(c => c.id === editando.id ? { ...c, ...data } : c));
      } else {
        await crearCliente(data);
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
      await eliminarCliente(confirmDelete.id);
      setClientes(prev => prev.filter(c => c.id !== confirmDelete.id));
      setConfirmDelete(null);
    } catch (e: any) {
      setError(e.message ?? 'Error al eliminar');
    } finally {
      setLoading(false);
    }
  };

  const filtrados = clientes.filter(c =>
    busqueda === '' ||
    c.nombre.toLowerCase().includes(busqueda.toLowerCase()) ||
    c.apellido.toLowerCase().includes(busqueda.toLowerCase()) ||
    c.email.toLowerCase().includes(busqueda.toLowerCase()) ||
    c.dni_pasaporte.includes(busqueda)
  );

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <TextField
          placeholder="Buscar nombre, email o DNI..."
          size="small"
          value={busqueda}
          onChange={e => setBusqueda(e.target.value)}
          sx={{ width: 320 }}
          slotProps={{
            input: { startAdornment: <InputAdornment position="start"><SearchOutlined sx={{ color: '#94a3b8' }} /></InputAdornment> },
          }}
        />
        <Button variant="contained" startIcon={<AddOutlined />} onClick={abrirCrear} sx={{ fontWeight: 600 }}>
          Agregar cliente
        </Button>
      </Box>

      <Card>
        <Table>
          <TableHead>
            <TableRow sx={{ '& th': { fontWeight: 700, fontSize: '0.8rem', color: '#64748b', backgroundColor: '#f8fafc', borderBottom: '2px solid #e2e8f0' } }}>
              <TableCell>Cliente</TableCell>
              <TableCell>DNI / Pasaporte</TableCell>
              <TableCell>Teléfono</TableCell>
              <TableCell>Licencia</TableCell>
              <TableCell>Localidad</TableCell>
              <TableCell>Alta</TableCell>
              <TableCell align="right">Acciones</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {filtrados.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} align="center" sx={{ py: 6 }}>
                  <PeopleAltOutlined sx={{ fontSize: 48, color: '#cbd5e1', mb: 1, display: 'block', mx: 'auto' }} />
                  <Typography color="text.secondary">
                    {busqueda ? 'Sin resultados para esa búsqueda' : 'No hay clientes cargados'}
                  </Typography>
                </TableCell>
              </TableRow>
            ) : (
              filtrados.map(c => (
                <TableRow key={c.id} hover sx={{ '& td': { borderBottom: '1px solid #f1f5f9' } }}>
                  <TableCell>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                      <Avatar sx={{ width: 36, height: 36, bgcolor: '#4f46e5', fontSize: '0.85rem', fontWeight: 700 }}>
                        {getInitials(c.nombre, c.apellido)}
                      </Avatar>
                      <Box>
                        <Typography variant="body2" sx={{ fontWeight: 700 }}>{c.nombre} {c.apellido}</Typography>
                        <Typography variant="caption" color="text.secondary">{c.email}</Typography>
                      </Box>
                    </Box>
                  </TableCell>
                  <TableCell><Typography variant="body2">{c.dni_pasaporte}</Typography></TableCell>
                  <TableCell><Typography variant="body2">{c.telefono}</Typography></TableCell>
                  <TableCell><Typography variant="body2">{c.licencia_conducir}</Typography></TableCell>
                  <TableCell><Typography variant="body2">{c.ciudad}, {c.pais}</Typography></TableCell>
                  <TableCell><Typography variant="body2">{formatFecha(c.created_at)}</Typography></TableCell>
                  <TableCell align="right">
                    <Tooltip title="Editar">
                      <IconButton size="small" onClick={() => abrirEditar(c)}>
                        <EditOutlined fontSize="small" />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Eliminar">
                      <IconButton size="small" color="error" onClick={() => setConfirmDelete(c)}>
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
            {filtrados.length} cliente{filtrados.length !== 1 ? 's' : ''}
            {busqueda ? ` · filtrado de ${clientes.length}` : ''}
          </Typography>
        </Box>
      </Card>

      {/* Dialog Crear/Editar */}
      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 700, fontFamily: 'Outfit' }}>
          {editando ? 'Editar cliente' : 'Agregar cliente'}
        </DialogTitle>
        <DialogContent dividers>
          {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
          <Grid container spacing={2} sx={{ pt: 1 }}>
            <Grid size={{ xs: 12, sm: 6 }}>
              <Controller name="nombre" control={control} render={({ field }) => (
                <TextField {...field} label="Nombre" fullWidth size="small" error={!!errors.nombre} helperText={errors.nombre?.message} />
              )} />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <Controller name="apellido" control={control} render={({ field }) => (
                <TextField {...field} label="Apellido" fullWidth size="small" error={!!errors.apellido} helperText={errors.apellido?.message} />
              )} />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <Controller name="email" control={control} render={({ field }) => (
                <TextField {...field} label="Email" type="email" fullWidth size="small" error={!!errors.email} helperText={errors.email?.message} />
              )} />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <Controller name="telefono" control={control} render={({ field }) => (
                <TextField {...field} label="Teléfono" fullWidth size="small" error={!!errors.telefono} helperText={errors.telefono?.message} />
              )} />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <Controller name="dni_pasaporte" control={control} render={({ field }) => (
                <TextField {...field} label="DNI / Pasaporte" fullWidth size="small" error={!!errors.dni_pasaporte} helperText={errors.dni_pasaporte?.message} />
              )} />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <Controller name="licencia_conducir" control={control} render={({ field }) => (
                <TextField {...field} label="Nro. Licencia" fullWidth size="small" error={!!errors.licencia_conducir} helperText={errors.licencia_conducir?.message} />
              )} />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <Controller name="ciudad" control={control} render={({ field }) => (
                <TextField {...field} label="Ciudad" fullWidth size="small" error={!!errors.ciudad} helperText={errors.ciudad?.message} />
              )} />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <Controller name="pais" control={control} render={({ field }) => (
                <TextField {...field} label="País" fullWidth size="small" error={!!errors.pais} helperText={errors.pais?.message} />
              )} />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <Controller name="fecha_nacimiento" control={control} render={({ field }) => (
                <TextField {...field} label="Fecha de nacimiento" type="date" fullWidth size="small"
                  slotProps={{ inputLabel: { shrink: true } }} />
              )} />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <Controller name="direccion" control={control} render={({ field }) => (
                <TextField {...field} label="Dirección" fullWidth size="small" />
              )} />
            </Grid>
          </Grid>
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
        <DialogTitle sx={{ fontWeight: 700 }}>¿Eliminar cliente?</DialogTitle>
        <DialogContent>
          <Typography>
            Vas a eliminar a <strong>{confirmDelete?.nombre} {confirmDelete?.apellido}</strong>.
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
