'use client';

import * as React from 'react';
import {
  Box, Typography, Paper, Tabs, Tab, TextField, Button, Table, TableBody,
  TableCell, TableContainer, TableHead, TableRow, IconButton, Dialog,
  DialogTitle, DialogContent, DialogActions, Stack, Chip, Tooltip,
  Alert, CircularProgress, Switch,
} from '@mui/material';
import {
  SaveOutlined, AddOutlined, EditOutlined, DeleteOutlined,
  BusinessOutlined, ShieldOutlined, AddCircleOutlineOutlined,
  LocalOfferOutlined, CategoryOutlined,
} from '@mui/icons-material';
import {
  actualizarTenant, crearCobertura, actualizarCobertura, eliminarCobertura,
  crearAdicional, actualizarAdicional, eliminarAdicional,
  crearDescuento, toggleDescuento, eliminarDescuento,
  crearCategoriaGasto, actualizarCategoriaGasto, toggleCategoriaGasto, eliminarCategoriaGasto,
  getCategoriasGasto,
} from './actions';
import type { Tenant, Cobertura, Adicional, Descuento, CategoriaGasto } from '@/types';

function formatARS(n: number) {
  return '$' + n.toLocaleString('es-AR', { minimumFractionDigits: 0 });
}

function TabPanel({ value, index, children }: { value: number; index: number; children: React.ReactNode }) {
  return value === index ? <Box sx={{ pt: 3 }}>{children}</Box> : null;
}

interface ServicioItem {
  nombre: string;
  descripcion: string | null;
  precio_por_dia: number;
}

interface ServicioDialogProps {
  open: boolean;
  onClose: () => void;
  onSave: (data: ServicioItem) => Promise<void>;
  inicial?: ServicioItem;
  title: string;
}

function ServicioDialog({ open, onClose, onSave, inicial, title }: ServicioDialogProps) {
  const [nombre, setNombre] = React.useState(inicial?.nombre ?? '');
  const [descripcion, setDescripcion] = React.useState(inicial?.descripcion ?? '');
  const [precio, setPrecio] = React.useState(inicial?.precio_por_dia != null ? String(inicial.precio_por_dia) : '');
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState('');

  React.useEffect(() => {
    if (open) {
      setNombre(inicial?.nombre ?? '');
      setDescripcion(inicial?.descripcion ?? '');
      setPrecio(inicial?.precio_por_dia != null ? String(inicial.precio_por_dia) : '');
      setError('');
    }
  }, [open, inicial]);

  async function handleSave() {
    const num = parseFloat(precio.replace(',', '.'));
    if (!nombre.trim() || isNaN(num) || num <= 0) { setError('Nombre y precio válido requeridos.'); return; }
    setLoading(true);
    try {
      await onSave({ nombre: nombre.trim(), descripcion: descripcion.trim() || null, precio_por_dia: num });
      onClose();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Error al guardar');
    } finally { setLoading(false); }
  }

  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle sx={{ fontFamily: 'Outfit', fontWeight: 700 }}>{title}</DialogTitle>
      <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: '16px !important' }}>
        {error && <Alert severity="error">{error}</Alert>}
        <TextField label="Nombre" size="small" required value={nombre} onChange={e => setNombre(e.target.value)} />
        <TextField label="Descripción" size="small" multiline rows={2} value={descripcion} onChange={e => setDescripcion(e.target.value)} />
        <TextField
          label="Precio por día"
          size="small"
          required
          value={precio}
          onChange={e => setPrecio(e.target.value)}
          slotProps={{ input: { startAdornment: <Box component="span" sx={{ mr: 0.5, color: 'text.secondary' }}>$</Box> } }}
        />
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onClose}>Cancelar</Button>
        <Button variant="contained" onClick={handleSave} disabled={loading}
          sx={{ bgcolor: '#4f46e5', '&:hover': { bgcolor: '#4338ca' } }}>
          {loading ? <CircularProgress size={18} color="inherit" /> : 'Guardar'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

const PRESET_COLORS = [
  { label: 'Naranja', value: '#f97316' },
  { label: 'Violeta', value: '#8b5cf6' },
  { label: 'Azul', value: '#3b82f6' },
  { label: 'Gris', value: '#64748b' },
  { label: 'Rojo', value: '#ef4444' },
  { label: 'Verde', value: '#16a34a' },
  { label: 'Amarillo', value: '#eab308' },
  { label: 'Cian', value: '#06b6d4' },
];

interface Props {
  tenantInicial: Tenant | null;
  coberturasIniciales: Cobertura[];
  adicionalesIniciales: Adicional[];
  descuentosIniciales: Descuento[];
  categoriasGastoIniciales: CategoriaGasto[];
}

export default function ConfiguracionClient({ tenantInicial, coberturasIniciales, adicionalesIniciales, descuentosIniciales, categoriasGastoIniciales }: Props) {
  const [tab, setTab] = React.useState(0);

  const [tenantForm, setTenantForm] = React.useState({
    nombre: tenantInicial?.nombre ?? '',
    logo_url: tenantInicial?.logo_url ?? '',
    descuento_online_pct: String(tenantInicial?.descuento_online_pct ?? 20),
  });
  const [tenantSaving, setTenantSaving] = React.useState(false);
  const [tenantOk, setTenantOk] = React.useState(false);

  const [coberturas, setCoberturas] = React.useState(coberturasIniciales);
  const [cobDialog, setCobDialog] = React.useState<{ open: boolean; editando?: Cobertura }>({ open: false });

  const [adicionales, setAdicionales] = React.useState(adicionalesIniciales);
  const [addDialog, setAddDialog] = React.useState<{ open: boolean; editando?: Adicional }>({ open: false });

  const [descuentos, setDescuentos] = React.useState(descuentosIniciales);
  const [descDialog, setDescDialog] = React.useState(false);
  const [descForm, setDescForm] = React.useState({ codigo: '', descuento_pct: '' });
  const [descLoading, setDescLoading] = React.useState(false);

  const [categoriasGasto, setCategoriasGasto] = React.useState(categoriasGastoIniciales);
  const [catDialog, setCatDialog] = React.useState<{ open: boolean; editando?: CategoriaGasto }>({ open: false });
  const [catForm, setCatForm] = React.useState({ nombre: '', color: '#64748b' });
  const [catLoading, setCatLoading] = React.useState(false);
  const [catError, setCatError] = React.useState('');

  async function handleSaveTenant() {
    const pct = parseFloat(tenantForm.descuento_online_pct.replace(',', '.'));
    if (!tenantForm.nombre.trim() || isNaN(pct)) return;
    setTenantSaving(true);
    try {
      await actualizarTenant({ nombre: tenantForm.nombre.trim(), logo_url: tenantForm.logo_url.trim(), descuento_online_pct: pct });
      setTenantOk(true);
      setTimeout(() => setTenantOk(false), 2500);
    } finally { setTenantSaving(false); }
  }

  async function reloadCoberturas() {
    const { getCoberturas } = await import('./actions');
    setCoberturas(await getCoberturas());
  }

  async function reloadAdicionales() {
    const { getAdicionales } = await import('./actions');
    setAdicionales(await getAdicionales());
  }

  async function reloadDescuentos() {
    const { getDescuentos } = await import('./actions');
    setDescuentos(await getDescuentos());
  }

  async function reloadCategoriasGasto() {
    setCategoriasGasto(await getCategoriasGasto());
  }

  async function handleGuardarCategoria() {
    if (!catForm.nombre.trim()) { setCatError('El nombre es requerido.'); return; }
    setCatLoading(true);
    try {
      if (catDialog.editando) {
        await actualizarCategoriaGasto(catDialog.editando.id, catForm);
      } else {
        await crearCategoriaGasto(catForm);
      }
      await reloadCategoriasGasto();
      setCatDialog({ open: false });
    } catch (e: unknown) {
      setCatError(e instanceof Error ? e.message : 'Error al guardar');
    } finally {
      setCatLoading(false);
    }
  }

  async function handleCrearDescuento() {
    const pct = parseFloat(descForm.descuento_pct.replace(',', '.'));
    if (!descForm.codigo.trim() || isNaN(pct) || pct <= 0 || pct > 100) return;
    setDescLoading(true);
    try {
      await crearDescuento({ codigo: descForm.codigo.trim(), descuento_pct: pct });
      await reloadDescuentos();
      setDescForm({ codigo: '', descuento_pct: '' });
      setDescDialog(false);
    } finally { setDescLoading(false); }
  }

  const cobInicial: ServicioItem | undefined = cobDialog.editando
    ? { nombre: cobDialog.editando.nombre, descripcion: cobDialog.editando.descripcion, precio_por_dia: cobDialog.editando.precio_por_dia }
    : undefined;

  const addInicial: ServicioItem | undefined = addDialog.editando
    ? { nombre: addDialog.editando.nombre, descripcion: addDialog.editando.descripcion, precio_por_dia: addDialog.editando.precio_por_dia }
    : undefined;

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h5" sx={{ fontWeight: 700, fontFamily: 'Outfit', mb: 3 }}>Configuración</Typography>

      <Paper variant="outlined" sx={{ borderRadius: 2 }}>
        <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ borderBottom: '1px solid #f1f5f9', px: 2 }}>
          <Tab icon={<BusinessOutlined />} iconPosition="start" label="Empresa" />
          <Tab icon={<ShieldOutlined />} iconPosition="start" label="Coberturas" />
          <Tab icon={<AddCircleOutlineOutlined />} iconPosition="start" label="Adicionales" />
          <Tab icon={<LocalOfferOutlined />} iconPosition="start" label="Descuentos" />
          <Tab icon={<CategoryOutlined />} iconPosition="start" label="Categ. Gastos" />
        </Tabs>

        <Box sx={{ px: 3, pb: 3 }}>
          {/* TAB 0: Empresa */}
          <TabPanel value={tab} index={0}>
            <Stack spacing={2.5} sx={{ maxWidth: 520 }}>
              {tenantOk && <Alert severity="success">Datos actualizados correctamente.</Alert>}
              <TextField
                label="Nombre de la empresa"
                size="small"
                value={tenantForm.nombre}
                onChange={e => setTenantForm(f => ({ ...f, nombre: e.target.value }))}
                required
              />
              <TextField
                label="URL del logotipo"
                size="small"
                placeholder="https://..."
                value={tenantForm.logo_url}
                onChange={e => setTenantForm(f => ({ ...f, logo_url: e.target.value }))}
              />
              <TextField
                label="Descuento online (%)"
                size="small"
                value={tenantForm.descuento_online_pct}
                onChange={e => setTenantForm(f => ({ ...f, descuento_online_pct: e.target.value }))}
                slotProps={{ input: { endAdornment: <Box component="span" sx={{ ml: 0.5, color: 'text.secondary' }}>%</Box> } }}
                helperText="Se aplica automáticamente a las reservas online pagadas con Mercado Pago."
              />
              <Box>
                <Button
                  variant="contained"
                  startIcon={tenantSaving ? <CircularProgress size={16} color="inherit" /> : <SaveOutlined />}
                  onClick={handleSaveTenant}
                  disabled={tenantSaving}
                  sx={{ bgcolor: '#4f46e5', '&:hover': { bgcolor: '#4338ca' } }}
                >
                  Guardar cambios
                </Button>
              </Box>
            </Stack>
          </TabPanel>

          {/* TAB 1: Coberturas */}
          <TabPanel value={tab} index={1}>
            <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 2 }}>
              <Button variant="contained" startIcon={<AddOutlined />}
                onClick={() => setCobDialog({ open: true })}
                sx={{ bgcolor: '#4f46e5', '&:hover': { bgcolor: '#4338ca' } }}>
                Nueva Cobertura
              </Button>
            </Box>
            <Paper variant="outlined" sx={{ borderRadius: 2, overflow: 'hidden' }}>
              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow sx={{ bgcolor: '#f8fafc' }}>
                      <TableCell sx={{ fontWeight: 700 }}>Nombre</TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>Descripción</TableCell>
                      <TableCell sx={{ fontWeight: 700, textAlign: 'right' }}>Precio/día</TableCell>
                      <TableCell sx={{ width: 80 }} />
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {coberturas.length === 0 && (
                      <TableRow><TableCell colSpan={4} align="center" sx={{ py: 3, color: 'text.secondary' }}>Sin coberturas</TableCell></TableRow>
                    )}
                    {coberturas.map(c => (
                      <TableRow key={c.id} hover>
                        <TableCell><Typography variant="body2" sx={{ fontWeight: 600 }}>{c.nombre}</Typography></TableCell>
                        <TableCell><Typography variant="body2" color="text.secondary">{c.descripcion ?? '—'}</Typography></TableCell>
                        <TableCell sx={{ textAlign: 'right' }}>
                          <Chip label={formatARS(c.precio_por_dia) + '/día'} size="small" color="success" variant="outlined" />
                        </TableCell>
                        <TableCell>
                          <Stack direction="row" spacing={0.5}>
                            <Tooltip title="Editar">
                              <IconButton size="small" onClick={() => setCobDialog({ open: true, editando: c })}>
                                <EditOutlined fontSize="small" />
                              </IconButton>
                            </Tooltip>
                            <Tooltip title="Eliminar">
                              <IconButton size="small" color="error" onClick={async () => {
                                if (!confirm('¿Eliminar cobertura?')) return;
                                await eliminarCobertura(c.id);
                                await reloadCoberturas();
                              }}>
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
          </TabPanel>

          {/* TAB 2: Adicionales */}
          <TabPanel value={tab} index={2}>
            <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 2 }}>
              <Button variant="contained" startIcon={<AddOutlined />}
                onClick={() => setAddDialog({ open: true })}
                sx={{ bgcolor: '#4f46e5', '&:hover': { bgcolor: '#4338ca' } }}>
                Nuevo Adicional
              </Button>
            </Box>
            <Paper variant="outlined" sx={{ borderRadius: 2, overflow: 'hidden' }}>
              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow sx={{ bgcolor: '#f8fafc' }}>
                      <TableCell sx={{ fontWeight: 700 }}>Nombre</TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>Descripción</TableCell>
                      <TableCell sx={{ fontWeight: 700, textAlign: 'right' }}>Precio/día</TableCell>
                      <TableCell sx={{ width: 80 }} />
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {adicionales.length === 0 && (
                      <TableRow><TableCell colSpan={4} align="center" sx={{ py: 3, color: 'text.secondary' }}>Sin adicionales</TableCell></TableRow>
                    )}
                    {adicionales.map(a => (
                      <TableRow key={a.id} hover>
                        <TableCell><Typography variant="body2" sx={{ fontWeight: 600 }}>{a.nombre}</Typography></TableCell>
                        <TableCell><Typography variant="body2" color="text.secondary">{a.descripcion ?? '—'}</Typography></TableCell>
                        <TableCell sx={{ textAlign: 'right' }}>
                          <Chip label={formatARS(a.precio_por_dia) + '/día'} size="small" color="info" variant="outlined" />
                        </TableCell>
                        <TableCell>
                          <Stack direction="row" spacing={0.5}>
                            <Tooltip title="Editar">
                              <IconButton size="small" onClick={() => setAddDialog({ open: true, editando: a })}>
                                <EditOutlined fontSize="small" />
                              </IconButton>
                            </Tooltip>
                            <Tooltip title="Eliminar">
                              <IconButton size="small" color="error" onClick={async () => {
                                if (!confirm('¿Eliminar adicional?')) return;
                                await eliminarAdicional(a.id);
                                await reloadAdicionales();
                              }}>
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
          </TabPanel>

          {/* TAB 3: Descuentos */}
          <TabPanel value={tab} index={3}>
            <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 2 }}>
              <Button variant="contained" startIcon={<AddOutlined />}
                onClick={() => setDescDialog(true)}
                sx={{ bgcolor: '#4f46e5', '&:hover': { bgcolor: '#4338ca' } }}>
                Nuevo Código
              </Button>
            </Box>
            <Paper variant="outlined" sx={{ borderRadius: 2, overflow: 'hidden' }}>
              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow sx={{ bgcolor: '#f8fafc' }}>
                      <TableCell sx={{ fontWeight: 700 }}>Código</TableCell>
                      <TableCell sx={{ fontWeight: 700, textAlign: 'center' }}>Descuento</TableCell>
                      <TableCell sx={{ fontWeight: 700, textAlign: 'center' }}>Estado</TableCell>
                      <TableCell sx={{ width: 60 }} />
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {descuentos.length === 0 && (
                      <TableRow><TableCell colSpan={4} align="center" sx={{ py: 3, color: 'text.secondary' }}>Sin códigos de descuento</TableCell></TableRow>
                    )}
                    {descuentos.map(d => (
                      <TableRow key={d.id} hover>
                        <TableCell>
                          <Chip label={d.codigo} size="small" sx={{ fontFamily: 'monospace', fontWeight: 700, bgcolor: '#f8fafc', border: '1px solid #e2e8f0' }} />
                        </TableCell>
                        <TableCell sx={{ textAlign: 'center' }}>
                          <Typography variant="body2" sx={{ fontWeight: 700 }} color="success.main">−{d.descuento_pct}%</Typography>
                        </TableCell>
                        <TableCell sx={{ textAlign: 'center' }}>
                          <Switch
                            size="small"
                            checked={d.activo}
                            onChange={async () => {
                              await toggleDescuento(d.id, !d.activo);
                              setDescuentos(prev => prev.map(x => x.id === d.id ? { ...x, activo: !x.activo } : x));
                            }}
                            color="success"
                          />
                        </TableCell>
                        <TableCell>
                          <Tooltip title="Eliminar">
                            <IconButton size="small" color="error" onClick={async () => {
                              if (!confirm('¿Eliminar código?')) return;
                              await eliminarDescuento(d.id);
                              await reloadDescuentos();
                            }}>
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
          </TabPanel>
          {/* TAB 4: Categorías de Gastos */}
          <TabPanel value={tab} index={4}>
            <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 2 }}>
              <Button variant="contained" startIcon={<AddOutlined />}
                onClick={() => { setCatForm({ nombre: '', color: '#64748b' }); setCatError(''); setCatDialog({ open: true }); }}
                sx={{ bgcolor: '#4f46e5', '&:hover': { bgcolor: '#4338ca' } }}>
                Nueva Categoría
              </Button>
            </Box>
            <Paper variant="outlined" sx={{ borderRadius: 2, overflow: 'hidden' }}>
              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow sx={{ bgcolor: '#f8fafc' }}>
                      <TableCell sx={{ fontWeight: 700 }}>Nombre</TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>Color</TableCell>
                      <TableCell sx={{ fontWeight: 700, textAlign: 'center' }}>Activa</TableCell>
                      <TableCell sx={{ width: 80 }} />
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {categoriasGasto.length === 0 && (
                      <TableRow><TableCell colSpan={4} align="center" sx={{ py: 3, color: 'text.secondary' }}>Sin categorías</TableCell></TableRow>
                    )}
                    {categoriasGasto.map(c => (
                      <TableRow key={c.id} hover>
                        <TableCell>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Box sx={{ width: 12, height: 12, borderRadius: '50%', bgcolor: c.color, flexShrink: 0 }} />
                            <Typography variant="body2" sx={{ fontWeight: 600 }}>{c.nombre}</Typography>
                          </Box>
                        </TableCell>
                        <TableCell>
                          <Chip label={c.color} size="small" sx={{ bgcolor: `${c.color}22`, color: c.color, fontFamily: 'monospace', fontSize: '0.7rem' }} />
                        </TableCell>
                        <TableCell sx={{ textAlign: 'center' }}>
                          <Switch
                            size="small"
                            checked={c.activa}
                            onChange={async () => {
                              await toggleCategoriaGasto(c.id, !c.activa);
                              setCategoriasGasto(prev => prev.map(x => x.id === c.id ? { ...x, activa: !x.activa } : x));
                            }}
                            color="success"
                          />
                        </TableCell>
                        <TableCell>
                          <Stack direction="row" spacing={0.5}>
                            <Tooltip title="Editar">
                              <IconButton size="small" onClick={() => {
                                setCatForm({ nombre: c.nombre, color: c.color });
                                setCatError('');
                                setCatDialog({ open: true, editando: c });
                              }}>
                                <EditOutlined fontSize="small" />
                              </IconButton>
                            </Tooltip>
                            <Tooltip title="Eliminar">
                              <IconButton size="small" color="error" onClick={async () => {
                                if (!confirm('¿Eliminar esta categoría?')) return;
                                await eliminarCategoriaGasto(c.id);
                                await reloadCategoriasGasto();
                              }}>
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
          </TabPanel>

        </Box>
      </Paper>

      {/* Coberturas Dialog */}
      <ServicioDialog
        open={cobDialog.open}
        onClose={() => setCobDialog({ open: false })}
        title={cobDialog.editando ? 'Editar Cobertura' : 'Nueva Cobertura'}
        inicial={cobInicial}
        onSave={async (data) => {
          if (cobDialog.editando) {
            await actualizarCobertura(cobDialog.editando.id, data);
          } else {
            await crearCobertura(data);
          }
          await reloadCoberturas();
        }}
      />

      {/* Adicionales Dialog */}
      <ServicioDialog
        open={addDialog.open}
        onClose={() => setAddDialog({ open: false })}
        title={addDialog.editando ? 'Editar Adicional' : 'Nuevo Adicional'}
        inicial={addInicial}
        onSave={async (data) => {
          if (addDialog.editando) {
            await actualizarAdicional(addDialog.editando.id, data);
          } else {
            await crearAdicional(data);
          }
          await reloadAdicionales();
        }}
      />

      {/* Descuento Dialog */}
      <Dialog open={descDialog} onClose={() => setDescDialog(false)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ fontFamily: 'Outfit', fontWeight: 700 }}>Nuevo Código de Descuento</DialogTitle>
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: '16px !important' }}>
          <TextField
            label="Código"
            size="small"
            required
            placeholder="VERANO25"
            value={descForm.codigo}
            onChange={e => setDescForm(f => ({ ...f, codigo: e.target.value.toUpperCase() }))}
            slotProps={{ input: { style: { fontFamily: 'monospace', fontWeight: 700, letterSpacing: 1 } } }}
          />
          <TextField
            label="Porcentaje de descuento"
            size="small"
            required
            value={descForm.descuento_pct}
            onChange={e => setDescForm(f => ({ ...f, descuento_pct: e.target.value }))}
            slotProps={{ input: { endAdornment: <Box component="span" sx={{ ml: 0.5, color: 'text.secondary' }}>%</Box> } }}
          />
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setDescDialog(false)}>Cancelar</Button>
          <Button variant="contained" onClick={handleCrearDescuento} disabled={descLoading}
            sx={{ bgcolor: '#4f46e5', '&:hover': { bgcolor: '#4338ca' } }}>
            {descLoading ? <CircularProgress size={18} color="inherit" /> : 'Crear'}
          </Button>
        </DialogActions>
      </Dialog>
      {/* Categorías Gasto Dialog */}
      <Dialog open={catDialog.open} onClose={() => setCatDialog({ open: false })} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ fontFamily: 'Outfit', fontWeight: 700 }}>
          {catDialog.editando ? 'Editar Categoría' : 'Nueva Categoría de Gasto'}
        </DialogTitle>
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: '16px !important' }}>
          {catError && <Alert severity="error">{catError}</Alert>}
          <TextField
            label="Nombre"
            size="small"
            required
            value={catForm.nombre}
            onChange={e => setCatForm(f => ({ ...f, nombre: e.target.value }))}
          />
          <Box>
            <Typography variant="caption" sx={{ color: 'text.secondary', mb: 1, display: 'block' }}>Color</Typography>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
              {PRESET_COLORS.map(pc => (
                <Tooltip key={pc.value} title={pc.label}>
                  <Box
                    onClick={() => setCatForm(f => ({ ...f, color: pc.value }))}
                    sx={{
                      width: 28,
                      height: 28,
                      borderRadius: '50%',
                      bgcolor: pc.value,
                      cursor: 'pointer',
                      border: catForm.color === pc.value ? '3px solid #0f172a' : '3px solid transparent',
                      outline: catForm.color === pc.value ? `2px solid ${pc.value}` : 'none',
                      outlineOffset: 2,
                      transition: 'all 0.15s',
                    }}
                  />
                </Tooltip>
              ))}
            </Box>
          </Box>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setCatDialog({ open: false })}>Cancelar</Button>
          <Button variant="contained" onClick={handleGuardarCategoria} disabled={catLoading}
            sx={{ bgcolor: '#4f46e5', '&:hover': { bgcolor: '#4338ca' } }}>
            {catLoading ? <CircularProgress size={18} color="inherit" /> : 'Guardar'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
