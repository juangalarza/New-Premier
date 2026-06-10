'use client';

import * as React from 'react';
import {
  Box, Typography, Paper, Table, TableBody, TableCell, TableContainer,
  TableHead, TableRow, Avatar, IconButton, Button, Dialog,
  DialogTitle, DialogContent, DialogActions, TextField, Select, MenuItem,
  FormControl, InputLabel, Tooltip, Stack, Alert, CircularProgress,
  InputAdornment,
} from '@mui/material';
import {
  PersonAddOutlined, DeleteOutlined, AdminPanelSettingsOutlined,
  PersonOutlined, EditOutlined, VisibilityOutlined, VisibilityOffOutlined,
} from '@mui/icons-material';
import { crearUsuario, actualizarUsuario, eliminarUsuario, getUsuarios } from './actions';
import type { UsuarioAdmin } from './actions';
import type { RolUsuario } from '@/types';

function formatFecha(iso: string) {
  try { return new Date(iso).toLocaleDateString('es-AR', { day: '2-digit', month: 'short', year: 'numeric' }); }
  catch { return '—'; }
}

function formatUltimoAcceso(iso: string | null) {
  if (!iso) return 'Nunca';
  try {
    const d = new Date(iso);
    const diff = Date.now() - d.getTime();
    if (diff < 3600000) return 'Hace menos de 1h';
    if (diff < 86400000) return `Hace ${Math.floor(diff / 3600000)}h`;
    if (diff < 604800000) return `Hace ${Math.floor(diff / 86400000)} días`;
    return d.toLocaleDateString('es-AR', { day: '2-digit', month: 'short' });
  } catch { return '—'; }
}

const EMPTY_FORM = { email: '', nombre: '', apellido: '', rol: 'operador' as RolUsuario, password: '' };

interface Props {
  usuariosIniciales: UsuarioAdmin[];
}

export default function UsuariosClient({ usuariosIniciales }: Props) {
  const [usuarios, setUsuarios] = React.useState(usuariosIniciales);
  const [dialog, setDialog] = React.useState<{ open: boolean; editId: string | null }>({ open: false, editId: null });
  const [form, setForm] = React.useState(EMPTY_FORM);
  const [showPass, setShowPass] = React.useState(false);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState('');

  const isEdit = dialog.editId !== null;

  function openCrear() {
    setForm(EMPTY_FORM);
    setError('');
    setDialog({ open: true, editId: null });
  }

  function openEditar(u: UsuarioAdmin) {
    setForm({ email: u.email, nombre: u.nombre, apellido: u.apellido, rol: u.rol, password: '' });
    setError('');
    setDialog({ open: true, editId: u.id });
  }

  function cerrar() {
    setDialog({ open: false, editId: null });
  }

  async function handleGuardar() {
    if (!form.email || !form.nombre || !form.apellido) return;
    if (!isEdit && !form.password) return;
    setLoading(true);
    setError('');
    try {
      if (isEdit) {
        await actualizarUsuario(dialog.editId!, {
          nombre: form.nombre,
          apellido: form.apellido,
          rol: form.rol,
          email: form.email || undefined,
          password: form.password || undefined,
        });
      } else {
        await crearUsuario(form);
      }
      setUsuarios(await getUsuarios());
      cerrar();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Ocurrió un error');
    } finally {
      setLoading(false);
    }
  }

  async function handleEliminar(id: string, email: string) {
    if (!confirm(`¿Eliminar al usuario ${email}? Esta acción es irreversible.`)) return;
    await eliminarUsuario(id);
    setUsuarios(prev => prev.filter(u => u.id !== id));
  }

  const canGuardar = !!form.email && !!form.nombre && !!form.apellido && (isEdit || !!form.password);

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3 }}>
        <Box>
          <Typography variant="h5" sx={{ fontWeight: 700, fontFamily: 'Outfit' }}>Usuarios</Typography>
          <Typography variant="body2" color="text.secondary">
            {usuarios.length} usuario{usuarios.length !== 1 ? 's' : ''} del panel
          </Typography>
        </Box>
        <Button
          variant="contained"
          startIcon={<PersonAddOutlined />}
          onClick={openCrear}
          sx={{ bgcolor: '#4f46e5', '&:hover': { bgcolor: '#4338ca' } }}
        >
          Agregar Usuario
        </Button>
      </Box>

      {usuarios.length === 0 ? (
        <Paper variant="outlined" sx={{ p: 6, textAlign: 'center', borderRadius: 2, color: 'text.secondary' }}>
          <PersonOutlined sx={{ fontSize: 48, mb: 1, opacity: 0.3 }} />
          <Typography sx={{ fontWeight: 600 }}>Sin usuarios registrados</Typography>
          <Typography variant="body2" sx={{ mt: 0.5 }}>Agregá un operador o administrador para comenzar.</Typography>
        </Paper>
      ) : (
        <Paper variant="outlined" sx={{ borderRadius: 2, overflow: 'hidden' }}>
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow sx={{ bgcolor: '#f8fafc' }}>
                  <TableCell sx={{ fontWeight: 700 }}>Usuario</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Email</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Rol</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Registrado</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Último acceso</TableCell>
                  <TableCell sx={{ fontWeight: 700, width: 80 }} align="center">Acc.</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {usuarios.map(u => (
                  <TableRow key={u.id} hover>
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                        <Avatar sx={{ width: 36, height: 36, bgcolor: u.rol === 'admin' ? '#4f46e5' : '#f59e0b', fontSize: 13, fontWeight: 700 }}>
                          {u.nombre[0]}{u.apellido[0]}
                        </Avatar>
                        <Typography variant="body2" sx={{ fontWeight: 600 }}>{u.nombre} {u.apellido}</Typography>
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">{u.email}</Typography>
                    </TableCell>
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                        {u.rol === 'admin'
                          ? <AdminPanelSettingsOutlined sx={{ fontSize: 16, color: '#4f46e5' }} />
                          : <PersonOutlined sx={{ fontSize: 16, color: '#f59e0b' }} />}
                        <Typography variant="body2" sx={{ textTransform: 'capitalize' }}>{u.rol}</Typography>
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" color="text.secondary">{formatFecha(u.created_at)}</Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" color="text.secondary">{formatUltimoAcceso(u.last_sign_in)}</Typography>
                    </TableCell>
                    <TableCell align="center">
                      <Stack direction="row" spacing={0.5} sx={{ justifyContent: 'center' }}>
                        <Tooltip title="Editar usuario">
                          <IconButton size="small" onClick={() => openEditar(u)}>
                            <EditOutlined fontSize="small" />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Eliminar usuario">
                          <IconButton size="small" color="error" onClick={() => handleEliminar(u.id, u.email)}>
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
        </Paper>
      )}

      <Dialog open={dialog.open} onClose={cerrar} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontFamily: 'Outfit', fontWeight: 700 }}>
          {isEdit ? 'Editar Usuario' : 'Agregar Nuevo Usuario'}
        </DialogTitle>
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: '16px !important' }}>
          {error && <Alert severity="error">{error}</Alert>}

          <Stack direction="row" spacing={2}>
            <TextField
              label="Nombre" size="small" fullWidth required
              value={form.nombre}
              onChange={e => setForm(f => ({ ...f, nombre: e.target.value }))}
            />
            <TextField
              label="Apellido" size="small" fullWidth required
              value={form.apellido}
              onChange={e => setForm(f => ({ ...f, apellido: e.target.value }))}
            />
          </Stack>

          <TextField
            label="Email" type="email" size="small" fullWidth required
            value={form.email}
            onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
          />

          <TextField
            label={isEdit ? 'Nueva contraseña (dejar vacío para no cambiar)' : 'Contraseña'}
            type={showPass ? 'text' : 'password'}
            size="small" fullWidth
            required={!isEdit}
            value={form.password}
            onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
            slotProps={{
              input: {
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton size="small" onClick={() => setShowPass(v => !v)} edge="end">
                      {showPass ? <VisibilityOffOutlined fontSize="small" /> : <VisibilityOutlined fontSize="small" />}
                    </IconButton>
                  </InputAdornment>
                ),
              },
            }}
          />

          <FormControl fullWidth size="small">
            <InputLabel>Rol</InputLabel>
            <Select
              value={form.rol} label="Rol"
              onChange={e => setForm(f => ({ ...f, rol: e.target.value as RolUsuario }))}
            >
              <MenuItem value="admin">
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <AdminPanelSettingsOutlined sx={{ fontSize: 18, color: '#4f46e5' }} />
                  Admin — Acceso completo
                </Box>
              </MenuItem>
              <MenuItem value="operador">
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <PersonOutlined sx={{ fontSize: 18, color: '#f59e0b' }} />
                  Operador — Sin configuración ni usuarios
                </Box>
              </MenuItem>
            </Select>
          </FormControl>
        </DialogContent>

        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={cerrar} disabled={loading}>Cancelar</Button>
          <Button
            variant="contained"
            onClick={handleGuardar}
            disabled={loading || !canGuardar}
            sx={{ bgcolor: '#4f46e5', '&:hover': { bgcolor: '#4338ca' } }}
          >
            {loading
              ? <CircularProgress size={18} color="inherit" />
              : isEdit ? 'Guardar cambios' : 'Crear usuario'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
