'use client';

import * as React from 'react';
import {
  Box, Typography, Paper, Table, TableBody, TableCell, TableContainer,
  TableHead, TableRow, Avatar, IconButton, Button, Dialog,
  DialogTitle, DialogContent, DialogActions, TextField, Select, MenuItem,
  FormControl, InputLabel, Tooltip, Stack, Alert, CircularProgress,
} from '@mui/material';
import {
  PersonAddOutlined, DeleteOutlined, AdminPanelSettingsOutlined, PersonOutlined,
  EmailOutlined,
} from '@mui/icons-material';
import { invitarUsuario, actualizarRol, eliminarUsuario } from './actions';
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

interface Props {
  usuariosIniciales: UsuarioAdmin[];
}

export default function UsuariosClient({ usuariosIniciales }: Props) {
  const [usuarios, setUsuarios] = React.useState(usuariosIniciales);
  const [invDialog, setInvDialog] = React.useState(false);
  const [form, setForm] = React.useState({ email: '', nombre: '', apellido: '', rol: 'operador' as RolUsuario });
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState('');

  async function handleInvitar() {
    if (!form.email || !form.nombre || !form.apellido) return;
    setLoading(true);
    setError('');
    try {
      await invitarUsuario(form);
      const { getUsuarios } = await import('./actions');
      setUsuarios(await getUsuarios());
      setInvDialog(false);
      setForm({ email: '', nombre: '', apellido: '', rol: 'operador' });
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Error al invitar usuario');
    } finally {
      setLoading(false);
    }
  }

  async function handleCambiarRol(id: string, rol: RolUsuario) {
    await actualizarRol(id, rol);
    setUsuarios(prev => prev.map(u => u.id === id ? { ...u, rol } : u));
  }

  async function handleEliminar(id: string, email: string) {
    if (!confirm(`¿Eliminar al usuario ${email}? Esta acción es irreversible.`)) return;
    await eliminarUsuario(id);
    setUsuarios(prev => prev.filter(u => u.id !== id));
  }

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
          onClick={() => setInvDialog(true)}
          sx={{ bgcolor: '#4f46e5', '&:hover': { bgcolor: '#4338ca' } }}
        >
          Invitar Usuario
        </Button>
      </Box>

      {usuarios.length === 0 ? (
        <Paper variant="outlined" sx={{ p: 6, textAlign: 'center', borderRadius: 2, color: 'text.secondary' }}>
          <PersonOutlined sx={{ fontSize: 48, mb: 1, opacity: 0.3 }} />
          <Typography sx={{ fontWeight: 600 }}>Sin usuarios registrados</Typography>
          <Typography variant="body2" sx={{ mt: 0.5 }}>Invita a un operador o administrador para comenzar.</Typography>
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
                  <TableCell sx={{ fontWeight: 700, width: 60 }}>Acc.</TableCell>
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
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                        <EmailOutlined sx={{ fontSize: 14, color: 'text.disabled' }} />
                        <Typography variant="body2">{u.email}</Typography>
                      </Box>
                    </TableCell>
                    <TableCell>
                      <FormControl size="small" sx={{ minWidth: 130 }}>
                        <Select
                          value={u.rol}
                          onChange={e => handleCambiarRol(u.id, e.target.value as RolUsuario)}
                          renderValue={v => (
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                              {v === 'admin'
                                ? <AdminPanelSettingsOutlined sx={{ fontSize: 16, color: '#4f46e5' }} />
                                : <PersonOutlined sx={{ fontSize: 16 }} />}
                              <Typography variant="body2" sx={{ textTransform: 'capitalize' }}>{v}</Typography>
                            </Box>
                          )}
                          sx={{ '& .MuiOutlinedInput-notchedOutline': { borderColor: u.rol === 'admin' ? '#4f46e5' : '#e2e8f0' } }}
                        >
                          <MenuItem value="admin">
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                              <AdminPanelSettingsOutlined sx={{ fontSize: 18, color: '#4f46e5' }} />
                              <Typography>Admin</Typography>
                            </Box>
                          </MenuItem>
                          <MenuItem value="operador">
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                              <PersonOutlined sx={{ fontSize: 18 }} />
                              <Typography>Operador</Typography>
                            </Box>
                          </MenuItem>
                        </Select>
                      </FormControl>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" color="text.secondary">{formatFecha(u.created_at)}</Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" color="text.secondary">{formatUltimoAcceso(u.last_sign_in)}</Typography>
                    </TableCell>
                    <TableCell>
                      <Tooltip title="Eliminar usuario">
                        <IconButton size="small" color="error" onClick={() => handleEliminar(u.id, u.email)}>
                          <DeleteOutlined fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </Paper>
      )}

      {/* Dialog Invitar */}
      <Dialog open={invDialog} onClose={() => setInvDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontFamily: 'Outfit', fontWeight: 700 }}>Invitar Usuario</DialogTitle>
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: '16px !important' }}>
          {error && <Alert severity="error">{error}</Alert>}
          <Alert severity="info">Se enviará un email de invitación al usuario para que establezca su contraseña.</Alert>
          <Stack direction="row" spacing={2}>
            <TextField label="Nombre" size="small" fullWidth required
              value={form.nombre} onChange={e => setForm(f => ({ ...f, nombre: e.target.value }))} />
            <TextField label="Apellido" size="small" fullWidth required
              value={form.apellido} onChange={e => setForm(f => ({ ...f, apellido: e.target.value }))} />
          </Stack>
          <TextField label="Email" type="email" size="small" fullWidth required
            value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} />
          <FormControl fullWidth size="small">
            <InputLabel>Rol</InputLabel>
            <Select value={form.rol} label="Rol"
              onChange={e => setForm(f => ({ ...f, rol: e.target.value as RolUsuario }))}>
              <MenuItem value="admin">Admin — Acceso completo</MenuItem>
              <MenuItem value="operador">Operador — Sin configuración ni usuarios</MenuItem>
            </Select>
          </FormControl>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setInvDialog(false)}>Cancelar</Button>
          <Button variant="contained" onClick={handleInvitar}
            disabled={loading || !form.email || !form.nombre || !form.apellido}
            sx={{ bgcolor: '#4f46e5', '&:hover': { bgcolor: '#4338ca' } }}>
            {loading ? <CircularProgress size={18} color="inherit" /> : 'Enviar invitación'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
