'use client';

import * as React from 'react';
import {
  Box, Typography, Paper, Table, TableBody, TableCell, TableContainer,
  TableHead, TableRow, Chip, IconButton, Button, Dialog, DialogTitle,
  DialogContent, DialogActions, TextField, Select, MenuItem, FormControl,
  InputLabel, Stack, Tooltip, CircularProgress, Alert,
} from '@mui/material';
import {
  AddOutlined, EditOutlined, DeleteOutlined, CalendarMonthOutlined,
  AttachMoneyOutlined,
} from '@mui/icons-material';
import {
  upsertTarifa, crearTemporada, actualizarTemporada, eliminarTemporada,
  crearCategoria, eliminarCategoria, upsertAdicional, eliminarAdicional,
} from './actions';
import type { TarifaMatrix } from './actions';
import type { Temporada, Adicional } from '@/types';

const TEMPORADA_COLOR: Record<string, string> = {
  baja: '#3b82f6', media: '#f59e0b', alta: '#ef4444',
};
const TEMPORADA_BG: Record<string, string> = {
  baja: '#eff6ff', media: '#fffbeb', alta: '#fef2f2',
};

function formatFecha(iso: string) {
  try { return new Date(iso + 'T12:00:00').toLocaleDateString('es-AR', { day: '2-digit', month: 'short' }); }
  catch { return iso; }
}

interface PriceCellProps {
  categoriaId: string;
  temporadaId: string;
  inicial?: number;
}

function PriceCell({ categoriaId, temporadaId, inicial }: PriceCellProps) {
  const [value, setValue] = React.useState(inicial != null ? String(inicial) : '');
  const [saving, setSaving] = React.useState(false);
  const [saved, setSaved] = React.useState(false);

  async function handleBlur() {
    const num = parseFloat(value.replace(',', '.'));
    if (isNaN(num) || num <= 0) return;
    if (num === inicial) return;
    setSaving(true);
    try {
      await upsertTarifa(categoriaId, temporadaId, num);
      setSaved(true);
      setTimeout(() => setSaved(false), 1500);
    } finally {
      setSaving(false);
    }
  }

  return (
    <TextField
      size="small"
      value={value}
      onChange={e => setValue(e.target.value)}
      onBlur={handleBlur}
      placeholder="0"
      slotProps={{
        input: {
          startAdornment: <Box component="span" sx={{ mr: 0.5, color: 'text.secondary', fontSize: 13 }}>$</Box>,
          endAdornment: saving ? <CircularProgress size={12} /> : saved ? <Box component="span" sx={{ fontSize: 14, color: 'success.main' }}>✓</Box> : null,
          style: { fontSize: 14, fontWeight: 600 },
        },
      }}
      sx={{
        width: 130,
        '& .MuiOutlinedInput-root': {
          '& fieldset': { borderColor: value ? '#4f46e5' : '#e2e8f0' },
        },
      }}
    />
  );
}

interface Props {
  matrixInicial: TarifaMatrix;
}

type TemporadaForm = { nombre: string; fecha_inicio: string; fecha_fin: string };

export default function TarifasClient({ matrixInicial }: Props) {
  const [matrix, setMatrix] = React.useState(matrixInicial);
  const [tempDialog, setTempDialog] = React.useState<{ open: boolean; editando?: Temporada }>({ open: false });
  const [catDialog, setCatDialog] = React.useState(false);
  const [tempForm, setTempForm] = React.useState<TemporadaForm>({ nombre: 'baja', fecha_inicio: '', fecha_fin: '' });
  const [catNombre, setCatNombre] = React.useState('');
  const [catDesc, setCatDesc] = React.useState('');
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState('');
  const [adicDialog, setAdicDialog] = React.useState<{ open: boolean; editando?: Adicional }>({ open: false });
  const [adicForm, setAdicForm] = React.useState({ nombre: '', descripcion: '', precio_por_dia: '' });

  async function reloadMatrix() {
    const { getTarifaMatrix } = await import('./actions');
    setMatrix(await getTarifaMatrix());
  }

  function openNuevaTemporada() {
    setTempForm({ nombre: 'baja', fecha_inicio: '', fecha_fin: '' });
    setTempDialog({ open: true });
  }

  function openEditarTemporada(t: Temporada) {
    setTempForm({ nombre: t.nombre, fecha_inicio: t.fecha_inicio, fecha_fin: t.fecha_fin });
    setTempDialog({ open: true, editando: t });
  }

  async function handleGuardarTemporada() {
    if (!tempForm.fecha_inicio || !tempForm.fecha_fin) return;
    setLoading(true);
    setError('');
    try {
      if (tempDialog.editando) {
        await actualizarTemporada(tempDialog.editando.id, tempForm);
      } else {
        await crearTemporada(tempForm);
      }
      await reloadMatrix();
      setTempDialog({ open: false });
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Error');
    } finally {
      setLoading(false);
    }
  }

  async function handleEliminarTemporada(id: string) {
    if (!confirm('¿Eliminar temporada y todas sus tarifas?')) return;
    await eliminarTemporada(id);
    await reloadMatrix();
  }

  async function handleCrearCategoria() {
    if (!catNombre.trim()) return;
    setLoading(true);
    try {
      await crearCategoria(catNombre.trim(), catDesc.trim());
      await reloadMatrix();
      setCatNombre(''); setCatDesc('');
      setCatDialog(false);
    } finally { setLoading(false); }
  }

  async function handleEliminarCategoria(id: string) {
    if (!confirm('¿Eliminar categoría y todas sus tarifas?')) return;
    await eliminarCategoria(id);
    await reloadMatrix();
  }

  function openNuevoAdicional() {
    setAdicForm({ nombre: '', descripcion: '', precio_por_dia: '' });
    setAdicDialog({ open: true });
  }

  function openEditarAdicional(a: Adicional) {
    setAdicForm({ nombre: a.nombre, descripcion: a.descripcion ?? '', precio_por_dia: String(a.precio_por_dia) });
    setAdicDialog({ open: true, editando: a });
  }

  async function handleGuardarAdicional() {
    const precio = parseFloat(adicForm.precio_por_dia.replace(',', '.'));
    if (!adicForm.nombre.trim() || isNaN(precio) || precio < 0) return;
    setLoading(true);
    setError('');
    try {
      await upsertAdicional({
        ...(adicDialog.editando ? { id: adicDialog.editando.id } : {}),
        nombre: adicForm.nombre.trim(),
        descripcion: adicForm.descripcion.trim() || null,
        precio_por_dia: precio,
      });
      await reloadMatrix();
      setAdicDialog({ open: false });
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Error');
    } finally {
      setLoading(false);
    }
  }

  async function handleEliminarAdicional(id: string) {
    if (!confirm('¿Eliminar este adicional?')) return;
    await eliminarAdicional(id);
    await reloadMatrix();
  }

  return (
    <Box sx={{ p: 3 }}>
      {/* Header */}
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3 }}>
        <Box>
          <Typography variant="h5" sx={{ fontWeight: 700, fontFamily: 'Outfit' }}>Tarifas</Typography>
          <Typography variant="body2" color="text.secondary">Precios por categoría y temporada (por día)</Typography>
        </Box>
        <Stack direction="row" spacing={1}>
          <Button variant="outlined" startIcon={<CalendarMonthOutlined />} onClick={openNuevaTemporada}>
            Nueva Temporada
          </Button>
          <Button variant="contained" startIcon={<AddOutlined />} onClick={() => setCatDialog(true)}
            sx={{ bgcolor: '#4f46e5', '&:hover': { bgcolor: '#4338ca' } }}>
            Nueva Categoría
          </Button>
        </Stack>
      </Box>

      {/* Temporadas chips */}
      <Stack direction="row" spacing={1.5} sx={{ mb: 3, flexWrap: 'wrap', gap: 1 }}>
        {matrix.temporadas.length === 0 && (
          <Typography variant="body2" color="text.secondary">Sin temporadas — crea una para comenzar a cargar tarifas.</Typography>
        )}
        {matrix.temporadas.map(t => (
          <Paper key={t.id} variant="outlined" sx={{ px: 2, py: 1, borderRadius: 2, display: 'flex', alignItems: 'center', gap: 1.5, bgcolor: TEMPORADA_BG[t.nombre] }}>
            <Chip label={t.nombre.charAt(0).toUpperCase() + t.nombre.slice(1)} size="small"
              sx={{ bgcolor: TEMPORADA_COLOR[t.nombre], color: '#fff', fontWeight: 700, fontSize: 11 }} />
            <Typography variant="body2" sx={{ fontWeight: 500 }}>
              {formatFecha(t.fecha_inicio)} – {formatFecha(t.fecha_fin)}
            </Typography>
            <Tooltip title="Editar"><IconButton size="small" onClick={() => openEditarTemporada(t)}><EditOutlined fontSize="small" /></IconButton></Tooltip>
            <Tooltip title="Eliminar"><IconButton size="small" color="error" onClick={() => handleEliminarTemporada(t.id)}><DeleteOutlined fontSize="small" /></IconButton></Tooltip>
          </Paper>
        ))}
      </Stack>

      {/* Matrix */}
      {matrix.categorias.length > 0 && matrix.temporadas.length > 0 ? (
        <Paper variant="outlined" sx={{ borderRadius: 2, overflow: 'hidden' }}>
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow sx={{ bgcolor: '#f8fafc' }}>
                  <TableCell sx={{ fontWeight: 700, minWidth: 160 }}>Categoría</TableCell>
                  {matrix.temporadas.map(t => (
                    <TableCell key={t.id} align="center" sx={{ fontWeight: 700, minWidth: 150 }}>
                      <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0.3 }}>
                        <Chip label={t.nombre.charAt(0).toUpperCase() + t.nombre.slice(1)} size="small"
                          sx={{ bgcolor: TEMPORADA_COLOR[t.nombre], color: '#fff', fontWeight: 700, fontSize: 11 }} />
                        <Typography variant="caption" color="text.secondary">
                          {formatFecha(t.fecha_inicio)} – {formatFecha(t.fecha_fin)}
                        </Typography>
                      </Box>
                    </TableCell>
                  ))}
                  <TableCell sx={{ width: 60 }} />
                </TableRow>
              </TableHead>
              <TableBody>
                {matrix.categorias.map(cat => (
                  <TableRow key={cat.id} hover>
                    <TableCell>
                      <Typography variant="body2" sx={{ fontWeight: 700 }}>{cat.nombre}</Typography>
                      {cat.descripcion && (
                        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.3 }}>
                          {cat.descripcion}
                        </Typography>
                      )}
                    </TableCell>
                    {matrix.temporadas.map(t => (
                      <TableCell key={t.id} align="center">
                        <PriceCell
                          categoriaId={cat.id}
                          temporadaId={t.id}
                          inicial={matrix.precios[cat.id]?.[t.id]}
                        />
                      </TableCell>
                    ))}
                    <TableCell>
                      <Tooltip title="Eliminar categoría">
                        <IconButton size="small" color="error" onClick={() => handleEliminarCategoria(cat.id)}>
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
      ) : (
        <Paper variant="outlined" sx={{ p: 4, textAlign: 'center', borderRadius: 2, color: 'text.secondary' }}>
          <AttachMoneyOutlined sx={{ fontSize: 40, mb: 1, opacity: 0.3 }} />
          <Typography>Crea al menos una categoría y una temporada para cargar tarifas.</Typography>
        </Paper>
      )}

      {/* Adicionales */}
      <Box sx={{ mt: 4 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
          <Box>
            <Typography variant="h6" sx={{ fontWeight: 700, fontFamily: 'Outfit' }}>Adicionales</Typography>
            <Typography variant="body2" color="text.secondary">
              Kilómetro extra, sillita de niño y otros cargos opcionales por día
            </Typography>
          </Box>
          <Button variant="contained" startIcon={<AddOutlined />} onClick={openNuevoAdicional}
            sx={{ bgcolor: '#4f46e5', '&:hover': { bgcolor: '#4338ca' } }}>
            Agregar adicional
          </Button>
        </Box>
        {matrix.adicionales.length === 0 ? (
          <Paper variant="outlined" sx={{ p: 3, textAlign: 'center', color: 'text.secondary', borderRadius: 2 }}>
            <Typography variant="body2">
              Sin adicionales configurados. Agregá kilómetro extra, sillita de niño u otros.
            </Typography>
          </Paper>
        ) : (
          <Paper variant="outlined" sx={{ borderRadius: 2, overflow: 'hidden' }}>
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow sx={{ bgcolor: '#f8fafc' }}>
                    <TableCell sx={{ fontWeight: 700 }}>Nombre</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>Descripción</TableCell>
                    <TableCell sx={{ fontWeight: 700 }} align="right">Precio / día</TableCell>
                    <TableCell sx={{ width: 80 }} />
                  </TableRow>
                </TableHead>
                <TableBody>
                  {matrix.adicionales.map(a => (
                    <TableRow key={a.id} hover>
                      <TableCell>
                        <Typography variant="body2" sx={{ fontWeight: 600 }}>{a.nombre}</Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" color="text.secondary">{a.descripcion ?? '—'}</Typography>
                      </TableCell>
                      <TableCell align="right">
                        <Typography variant="body2" sx={{ fontWeight: 700, color: '#4f46e5' }}>
                          ${a.precio_por_dia.toLocaleString('es-AR')}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Stack direction="row" spacing={0.5} sx={{ justifyContent: 'flex-end' }}>
                          <Tooltip title="Editar">
                            <IconButton size="small" onClick={() => openEditarAdicional(a)}>
                              <EditOutlined fontSize="small" />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Eliminar">
                            <IconButton size="small" color="error" onClick={() => handleEliminarAdicional(a.id)}>
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
      </Box>

      {/* Dialog Adicional */}
      <Dialog open={adicDialog.open} onClose={() => setAdicDialog({ open: false })} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ fontFamily: 'Outfit', fontWeight: 700 }}>
          {adicDialog.editando ? 'Editar Adicional' : 'Nuevo Adicional'}
        </DialogTitle>
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: '16px !important' }}>
          {error && <Alert severity="error">{error}</Alert>}
          <TextField
            label="Nombre"
            size="small"
            value={adicForm.nombre}
            onChange={e => setAdicForm(f => ({ ...f, nombre: e.target.value }))}
            required
            fullWidth
            placeholder="ej. Kilómetro extra, Sillita de niño"
          />
          <TextField
            label="Descripción (opcional)"
            size="small"
            value={adicForm.descripcion}
            onChange={e => setAdicForm(f => ({ ...f, descripcion: e.target.value }))}
            multiline
            rows={2}
            fullWidth
          />
          <TextField
            label="Precio por día (ARS)"
            size="small"
            value={adicForm.precio_por_dia}
            onChange={e => setAdicForm(f => ({ ...f, precio_por_dia: e.target.value }))}
            required
            fullWidth
            slotProps={{
              input: {
                startAdornment: <Box component="span" sx={{ mr: 0.5, color: 'text.secondary', fontSize: 13 }}>$</Box>,
              },
            }}
          />
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setAdicDialog({ open: false })}>Cancelar</Button>
          <Button
            variant="contained"
            onClick={handleGuardarAdicional}
            disabled={loading || !adicForm.nombre.trim()}
            sx={{ bgcolor: '#4f46e5', '&:hover': { bgcolor: '#4338ca' } }}
          >
            {loading ? <CircularProgress size={18} color="inherit" /> : 'Guardar'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Dialog Temporada */}
      <Dialog open={tempDialog.open} onClose={() => setTempDialog({ open: false })} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ fontFamily: 'Outfit', fontWeight: 700 }}>
          {tempDialog.editando ? 'Editar Temporada' : 'Nueva Temporada'}
        </DialogTitle>
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: '16px !important' }}>
          {error && <Alert severity="error">{error}</Alert>}
          <FormControl fullWidth size="small">
            <InputLabel>Tipo de temporada</InputLabel>
            <Select value={tempForm.nombre} label="Tipo de temporada"
              onChange={e => setTempForm(f => ({ ...f, nombre: e.target.value }))}>
              <MenuItem value="baja">Baja</MenuItem>
              <MenuItem value="media">Media</MenuItem>
              <MenuItem value="alta">Alta</MenuItem>
            </Select>
          </FormControl>
          <TextField
            label="Fecha inicio"
            type="date"
            size="small"
            slotProps={{ inputLabel: { shrink: true } }}
            value={tempForm.fecha_inicio}
            onChange={e => setTempForm(f => ({ ...f, fecha_inicio: e.target.value }))}
            fullWidth
          />
          <TextField
            label="Fecha fin"
            type="date"
            size="small"
            slotProps={{ inputLabel: { shrink: true } }}
            value={tempForm.fecha_fin}
            onChange={e => setTempForm(f => ({ ...f, fecha_fin: e.target.value }))}
            fullWidth
          />
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setTempDialog({ open: false })}>Cancelar</Button>
          <Button variant="contained" onClick={handleGuardarTemporada} disabled={loading}
            sx={{ bgcolor: '#4f46e5', '&:hover': { bgcolor: '#4338ca' } }}>
            {loading ? <CircularProgress size={18} color="inherit" /> : 'Guardar'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Dialog Categoría */}
      <Dialog open={catDialog} onClose={() => setCatDialog(false)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ fontFamily: 'Outfit', fontWeight: 700 }}>Nueva Categoría</DialogTitle>
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: '16px !important' }}>
          <TextField label="Nombre" size="small" value={catNombre} onChange={e => setCatNombre(e.target.value)} required />
          <TextField label="Descripción" size="small" value={catDesc} onChange={e => setCatDesc(e.target.value)} multiline rows={2} />
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setCatDialog(false)}>Cancelar</Button>
          <Button variant="contained" onClick={handleCrearCategoria} disabled={loading || !catNombre.trim()}
            sx={{ bgcolor: '#4f46e5', '&:hover': { bgcolor: '#4338ca' } }}>
            {loading ? <CircularProgress size={18} color="inherit" /> : 'Crear'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
