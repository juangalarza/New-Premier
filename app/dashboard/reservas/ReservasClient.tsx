'use client';

import * as React from 'react';
import {
  Box, Button, Card, Typography, Table, TableHead, TableRow, TableCell,
  TableBody, Chip, IconButton, Tooltip, TextField, MenuItem, InputAdornment,
  Dialog, DialogTitle, DialogContent, DialogActions, Grid, Alert,
  FormControlLabel, Checkbox, Select, OutlinedInput, ListItemText,
  Autocomplete, CircularProgress, Paper, List, ListItemButton, Fab, Collapse,
} from '@mui/material';
import { useIsMobile } from '@/hooks/useIsMobile';
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
  crearReserva, getVehiculosDisponibles, calcularCotizacion, buscarClientesPorDNI, buscarClientesPorNombre,
} from './actions';
import { crearCliente } from '@/app/dashboard/clientes/actions';

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

// ─── Tipo resultado búsqueda cliente ─────────────────────────────────────────
type ClienteBuscado = { id: string; nombre: string; apellido: string; dni_pasaporte: string; email: string };

// ─── Schema mini dialog nuevo cliente ────────────────────────────────────────
const miniClienteSchema = z.object({
  nombre: z.string().min(2, 'Requerido'),
  apellido: z.string().min(2, 'Requerido'),
  dni_pasaporte: z.string().min(6, 'Requerido'),
  email: z.string().email('Email inválido'),
  telefono: z.string().min(8, 'Requerido'),
  licencia_conducir: z.string().min(4, 'Requerido'),
  ciudad: z.string().default(''),
  pais: z.string().default('Argentina'),
});
type MiniClienteForm = z.infer<typeof miniClienteSchema>;

// ─── Schema nueva reserva ─────────────────────────────────────────────────────
const nuevaReservaSchema = z.object({
  cliente_id: z.string().uuid('Seleccioná un cliente'),
  fecha_entrega: z.string().min(1, 'Requerido'),
  fecha_devolucion: z.string().min(1, 'Requerido'),
  lugar_entrega: z.string().min(2, 'Requerido'),
  lugar_devolucion: z.string().min(2, 'Requerido'),
  numero_vuelo: z.string().default(''),
  km_contratados: z.coerce.number().min(0).default(0),
  vehiculo_id: z.string().default(''),
  cobertura_id: z.string().default(''),
  adicional_ids: z.array(z.string()).default([]),
  precio_base: z.coerce.number().min(1, 'Calculá el precio antes de continuar'),
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
  const [dniInput, setDniInput] = React.useState('');
  const [clientesBuscados, setClientesBuscados] = React.useState<ClienteBuscado[]>([]);
  const [clienteSeleccionado, setClienteSeleccionado] = React.useState<ClienteBuscado | null>(null);
  const [buscando, setBuscando] = React.useState(false);
  const [miniDialogOpen, setMiniDialogOpen] = React.useState(false);
  const [miniLoading, setMiniLoading] = React.useState(false);
  const [miniError, setMiniError] = React.useState('');
  const [dniDropdownOpen, setDniDropdownOpen] = React.useState(false);
  const [filtrosOpen, setFiltrosOpen] = React.useState(false);
  const isMobile = useIsMobile();

  const { control, handleSubmit, reset, watch, setValue, formState: { errors } } = useForm<NuevaReservaForm>({
    resolver: zodResolver(nuevaReservaSchema) as any,
    defaultValues: {
      cliente_id: '', fecha_entrega: '', fecha_devolucion: '', lugar_entrega: '',
      lugar_devolucion: '', numero_vuelo: '', km_contratados: 0, vehiculo_id: '', cobertura_id: '',
      adicional_ids: [], precio_base: 0, descuento_aplicado: 0, observaciones: '', categoria_id: '',
    },
  });

  const { control: miniCtrl, handleSubmit: miniHandleSubmit, reset: miniReset, formState: { errors: miniErrors } } = useForm<MiniClienteForm>({
    resolver: zodResolver(miniClienteSchema) as any,
    defaultValues: { nombre: '', apellido: '', dni_pasaporte: '', email: '', telefono: '', licencia_conducir: '', ciudad: '', pais: 'Argentina' },
  });

  const fechaEntrega = watch('fecha_entrega');
  const fechaDevolucion = watch('fecha_devolucion');
  const categoriaId = watch('categoria_id');
  const precioBase = watch('precio_base');
  const diasForm = fechaEntrega && fechaDevolucion ? diasReserva(fechaEntrega, fechaDevolucion) : 0;

  // Actualizar vehículos disponibles cuando cambian fechas
  React.useEffect(() => {
    if (!fechaEntrega || !fechaDevolucion) return;
    getVehiculosDisponibles(fechaEntrega, fechaDevolucion).then(vs =>
      setVehiculosDisponibles(vs.map(v => ({ id: v.id, patente: v.patente, modelo: v.modelo })))
    );
  }, [fechaEntrega, fechaDevolucion]);

  // Búsqueda por nombre/apellido (o DNI si es numérico) con debounce 300ms
  React.useEffect(() => {
    if (dniInput.trim().length < 2) { setClientesBuscados([]); return; }
    const timer = setTimeout(async () => {
      setBuscando(true);
      const results = await buscarClientesPorNombre(dniInput);
      setClientesBuscados(results);
      setBuscando(false);
    }, 300);
    return () => clearTimeout(timer);
  }, [dniInput]);

  const onMiniSubmit = async (data: MiniClienteForm) => {
    setMiniLoading(true);
    setMiniError('');
    try {
      await crearCliente({ ...data, ciudad: data.ciudad || 'Sin especificar', fecha_nacimiento: '', direccion: '' });
      const results = await buscarClientesPorDNI(data.dni_pasaporte);
      const nuevo = results.find(c => c.dni_pasaporte === data.dni_pasaporte) ?? results[0];
      if (nuevo) {
        setValue('cliente_id', nuevo.id);
        setClienteSeleccionado(nuevo);
        setDniInput(nuevo.dni_pasaporte);
        setClientesBuscados([]);
      }
      setMiniDialogOpen(false);
      miniReset();
    } catch (e: any) {
      setMiniError(e.message ?? 'Error al crear cliente');
    } finally {
      setMiniLoading(false);
    }
  };

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
        km_contratados: data.km_contratados || 0,
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
    setDniInput('');
    setClientesBuscados([]);
    setClienteSeleccionado(null);
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
          {/* Desktop — fila única con todos los filtros */}
          <Box sx={{ display: { xs: 'none', md: 'flex' }, gap: 2, flexWrap: 'wrap', alignItems: 'center' }}>
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

          {/* Mobile — buscador + toggle filtros */}
          <Box sx={{ display: { xs: 'flex', md: 'none' }, gap: 1, alignItems: 'center' }}>
            <TextField
              placeholder="Buscar..."
              size="small"
              value={busqueda}
              onChange={e => setBusqueda(e.target.value)}
              sx={{ flexGrow: 1 }}
              slotProps={{ input: { startAdornment: <InputAdornment position="start"><SearchOutlined sx={{ color: '#94a3b8' }} /></InputAdornment> } }}
            />
            <Tooltip title="Filtros">
              <IconButton
                size="small"
                onClick={() => setFiltrosOpen(o => !o)}
                sx={{
                  color: filtrosOpen ? '#4f46e5' : '#64748b',
                  border: '1px solid',
                  borderColor: filtrosOpen ? '#4f46e5' : '#e2e8f0',
                  borderRadius: 1,
                }}
              >
                <FilterListOutlined sx={{ fontSize: 20 }} />
              </IconButton>
            </Tooltip>
            <Tooltip title="Exportar .xlsx">
              <IconButton onClick={handleExport} size="small" sx={{ color: '#64748b' }}>
                <FileDownloadOutlined />
              </IconButton>
            </Tooltip>
          </Box>

          {/* Mobile — filtros colapsables */}
          <Collapse in={filtrosOpen}>
            <Box sx={{ display: { xs: 'flex', md: 'none' }, flexDirection: 'column', gap: 1.5, pt: 1.5 }}>
              <TextField
                select label="Estado" size="small" value={filtroEstado}
                onChange={e => setFiltroEstado(e.target.value)} fullWidth
              >
                <MenuItem value="todos">Todos</MenuItem>
                {Object.entries(ESTADO_STYLE).map(([k, v]) => <MenuItem key={k} value={k}>{v.label}</MenuItem>)}
              </TextField>
              <Box sx={{ display: 'flex', gap: 1 }}>
                <TextField label="Desde" type="date" size="small" value={filtroDesde}
                  onChange={e => setFiltroDesde(e.target.value)} slotProps={{ inputLabel: { shrink: true } }} sx={{ flex: 1 }} />
                <TextField label="Hasta" type="date" size="small" value={filtroHasta}
                  onChange={e => setFiltroHasta(e.target.value)} slotProps={{ inputLabel: { shrink: true } }} sx={{ flex: 1 }} />
              </Box>
            </Box>
          </Collapse>
        </Card>

        {/* Tabla */}
        <Card sx={{ flexGrow: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
          <Box sx={{ overflowX: 'auto', flexGrow: 1, display: { xs: 'none', md: 'block' } }}>
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

          {/* Mobile — cards */}
          <Box sx={{ display: { xs: 'flex', md: 'none' }, flexDirection: 'column', overflowY: 'auto', flexGrow: 1, p: 1.5, gap: 1 }}>
            {filtradas.length === 0 ? (
              <Box sx={{ py: 6, textAlign: 'center' }}>
                <ReceiptLongOutlined sx={{ fontSize: 48, color: '#cbd5e1', mb: 1 }} />
                <Typography color="text.secondary">Sin reservas</Typography>
              </Box>
            ) : filtradas.map(r => {
              const est = ESTADO_STYLE[r.estado];
              const isSelected = r.id === selectedId;
              const saldo = r.precio_total - r.total_pagado;
              return (
                <Box
                  key={r.id}
                  onClick={() => setSelectedId(r.id === selectedId ? null : r.id)}
                  sx={{
                    p: 1.5,
                    bgcolor: isSelected ? 'rgba(79,70,229,0.04)' : '#fff',
                    border: `1px solid ${isSelected ? '#4f46e5' : '#e2e8f0'}`,
                    borderRadius: 2,
                    cursor: 'pointer',
                    transition: 'border-color 0.2s',
                  }}
                >
                  {/* ID + Estado */}
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 0.75 }}>
                    <Typography sx={{ fontFamily: 'monospace', fontWeight: 700, fontSize: '0.8rem', color: '#4f46e5' }}>
                      #{r.id_corto}
                    </Typography>
                    <Chip label={est?.label} size="small"
                      sx={{ bgcolor: est?.bg, color: est?.color, fontWeight: 600, fontSize: '0.7rem' }} />
                  </Box>
                  {/* Cliente + Vehículo */}
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 0.5 }}>
                    <Typography sx={{ fontWeight: 600, fontSize: '0.85rem', color: '#1e293b' }}>
                      {r.cliente.nombre} {r.cliente.apellido}
                    </Typography>
                    <Typography sx={{ fontFamily: 'monospace', fontWeight: 700, fontSize: '0.8rem', color: '#475569', flexShrink: 0 }}>
                      {r.vehiculo?.patente ?? <span style={{ color: '#94a3b8' }}>Sin asignar</span>}
                    </Typography>
                  </Box>
                  {/* Fechas + Días */}
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 0.75 }}>
                    <Typography sx={{ fontSize: '0.75rem', color: '#64748b' }}>
                      {formatFecha(r.fecha_entrega)} → {formatFecha(r.fecha_devolucion)}
                    </Typography>
                    <Typography sx={{ fontSize: '0.75rem', color: '#64748b', flexShrink: 0 }}>
                      {diasReserva(r.fecha_entrega, r.fecha_devolucion)} días
                    </Typography>
                  </Box>
                  {/* Total + Pagado */}
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', pt: 0.75, borderTop: '1px solid #f1f5f9' }}>
                    <Typography sx={{ fontSize: '0.78rem', color: '#64748b' }}>
                      Total: <span style={{ fontWeight: 700, color: '#1e293b' }}>{formatARS(r.precio_total)}</span>
                    </Typography>
                    <Box sx={{ textAlign: 'right' }}>
                      <Typography sx={{ fontSize: '0.78rem', fontWeight: 700, color: saldo === 0 ? '#16a34a' : '#dc2626' }}>
                        {formatARS(r.total_pagado)}
                      </Typography>
                      {saldo > 0 && (
                        <Typography sx={{ fontSize: '0.7rem', color: '#dc2626', display: 'block' }}>
                          -{formatARS(saldo)}
                        </Typography>
                      )}
                    </Box>
                  </Box>
                </Box>
              );
            })}
          </Box>

          {/* Footer */}
          <Box sx={{ px: { xs: 2, sm: 3 }, py: 1.5, borderTop: '1px solid #f1f5f9', display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, justifyContent: 'space-between', alignItems: { xs: 'flex-start', sm: 'center' }, gap: { xs: 0.5, sm: 0 }, bgcolor: '#fafafa', flexShrink: 0 }}>
            <Typography variant="caption" color="text.secondary">
              {filtradas.length} reserva{filtradas.length !== 1 ? 's' : ''}
            </Typography>
            <Box sx={{ display: 'flex', gap: { xs: 2, sm: 3 }, flexWrap: 'wrap' }}>
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

      {/* FAB — Nueva reserva en mobile */}
      <Fab
        color="primary"
        onClick={abrirDialogNueva}
        sx={{ position: 'fixed', bottom: 20, right: 20, display: { xs: 'flex', md: 'none' }, zIndex: 1000 }}
      >
        <AddOutlined />
      </Fab>

      {/* Mini Dialog — Crear cliente rápido */}
      <Dialog open={miniDialogOpen} onClose={() => setMiniDialogOpen(false)} maxWidth="sm" fullWidth fullScreen={isMobile}>
        <DialogTitle sx={{ fontWeight: 700, fontFamily: 'Outfit', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          Nuevo cliente
          <IconButton size="small" onClick={() => setMiniDialogOpen(false)}><CloseOutlined fontSize="small" /></IconButton>
        </DialogTitle>
        <DialogContent dividers>
          {miniError && <Alert severity="error" sx={{ mb: 2 }}>{miniError}</Alert>}
          <Grid container spacing={2} sx={{ pt: 1 }}>
            <Grid size={{ xs: 12, sm: 6 }}>
              <Controller name="nombre" control={miniCtrl} render={({ field }) => (
                <TextField {...field} label="Nombre *" fullWidth size="small" error={!!miniErrors.nombre} helperText={miniErrors.nombre?.message} />
              )} />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <Controller name="apellido" control={miniCtrl} render={({ field }) => (
                <TextField {...field} label="Apellido *" fullWidth size="small" error={!!miniErrors.apellido} helperText={miniErrors.apellido?.message} />
              )} />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <Controller name="dni_pasaporte" control={miniCtrl} render={({ field }) => (
                <TextField {...field} label="DNI / Pasaporte *" fullWidth size="small" error={!!miniErrors.dni_pasaporte} helperText={miniErrors.dni_pasaporte?.message} />
              )} />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <Controller name="email" control={miniCtrl} render={({ field }) => (
                <TextField {...field} label="Email *" type="email" fullWidth size="small" error={!!miniErrors.email} helperText={miniErrors.email?.message} />
              )} />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <Controller name="telefono" control={miniCtrl} render={({ field }) => (
                <TextField {...field} label="Teléfono *" fullWidth size="small" error={!!miniErrors.telefono} helperText={miniErrors.telefono?.message} />
              )} />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <Controller name="licencia_conducir" control={miniCtrl} render={({ field }) => (
                <TextField {...field} label="Nro. Licencia *" fullWidth size="small" error={!!miniErrors.licencia_conducir} helperText={miniErrors.licencia_conducir?.message} />
              )} />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <Controller name="ciudad" control={miniCtrl} render={({ field }) => (
                <TextField {...field} label="Ciudad" fullWidth size="small" />
              )} />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <Controller name="pais" control={miniCtrl} render={({ field }) => (
                <TextField {...field} label="País" fullWidth size="small" />
              )} />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2 }}>
          <Button onClick={() => setMiniDialogOpen(false)} disabled={miniLoading}>Cancelar</Button>
          <Button variant="contained" onClick={miniHandleSubmit(onMiniSubmit as any)} disabled={miniLoading} sx={{ fontWeight: 600 }}>
            {miniLoading ? 'Creando...' : 'Crear y seleccionar'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Drawer de detalle */}
      {selectedReserva && (
        <ReservaDrawer
          reserva={selectedReserva}
          onClose={() => setSelectedId(null)}
          onUpdate={(updated) => setReservas(prev => prev.map(r => r.id === updated.id ? updated as ReservaConRelaciones : r))}
        />
      )}

      {/* Dialog Nueva Reserva */}
      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="md" fullWidth fullScreen={isMobile}>
        <DialogTitle sx={{ fontWeight: 700, fontFamily: 'Outfit', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          Nueva reserva
          <IconButton size="small" onClick={() => setDialogOpen(false)}><CloseOutlined fontSize="small" /></IconButton>
        </DialogTitle>
        <DialogContent dividers>
          {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
          <Grid container spacing={2} sx={{ pt: 1 }}>
            {/* Cliente — búsqueda por DNI */}
            <Grid size={{ xs: 12 }}>
              <Box sx={{ position: 'relative' }}>
                {clienteSeleccionado ? (
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, px: 1.5, py: 1, border: '1px solid #e2e8f0', borderRadius: 1, bgcolor: '#f8fafc' }}>
                    <Typography variant="body2" sx={{ flexGrow: 1, fontWeight: 600 }}>
                      {clienteSeleccionado.apellido}, {clienteSeleccionado.nombre} · DNI {clienteSeleccionado.dni_pasaporte}
                    </Typography>
                    <IconButton size="small" onClick={() => { setClienteSeleccionado(null); setDniInput(''); setValue('cliente_id', ''); }}>
                      <CloseOutlined fontSize="small" />
                    </IconButton>
                  </Box>
                ) : (
                  <TextField
                    label="Buscar por nombre o apellido..."
                    value={dniInput}
                    onChange={e => setDniInput(e.target.value)}
                    onFocus={() => setDniDropdownOpen(true)}
                    onBlur={() => setTimeout(() => setDniDropdownOpen(false), 150)}
                    fullWidth size="small"
                    error={!!errors.cliente_id}
                    helperText={errors.cliente_id?.message}
                    slotProps={{
                      input: {
                        endAdornment: buscando
                          ? <InputAdornment position="end"><CircularProgress size={16} /></InputAdornment>
                          : undefined,
                      },
                    }}
                  />
                )}
                {dniDropdownOpen && dniInput.trim().length >= 2 && !clienteSeleccionado && (
                  <Paper elevation={4} sx={{ position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 1300, mt: 0.5, maxHeight: 260, overflow: 'auto', border: '1px solid #e2e8f0', borderRadius: 2 }}>
                    {buscando ? (
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, px: 2, py: 1.5 }}>
                        <CircularProgress size={14} />
                        <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.82rem' }}>Buscando...</Typography>
                      </Box>
                    ) : clientesBuscados.length > 0 ? (
                      <List dense disablePadding>
                        {clientesBuscados.map(c => (
                          <ListItemButton
                            key={c.id}
                            onMouseDown={e => e.preventDefault()}
                            onClick={() => { setValue('cliente_id', c.id); setClienteSeleccionado(c); setClientesBuscados([]); setDniDropdownOpen(false); }}
                          >
                            <ListItemText
                              primary={`${c.apellido}, ${c.nombre}`}
                              secondary={`DNI ${c.dni_pasaporte} · ${c.email}`}
                              slotProps={{ primary: { sx: { fontSize: '0.85rem', fontWeight: 600 } }, secondary: { sx: { fontSize: '0.75rem' } } }}
                            />
                          </ListItemButton>
                        ))}
                      </List>
                    ) : (
                      <ListItemButton
                        onMouseDown={e => e.preventDefault()}
                        onClick={() => {
                          miniReset({ nombre: '', apellido: '', dni_pasaporte: '', email: '', telefono: '', licencia_conducir: '', ciudad: '', pais: 'Argentina' });
                          setMiniError('');
                          setMiniDialogOpen(true);
                          setDniDropdownOpen(false);
                        }}
                        sx={{ gap: 1, py: 1.5 }}
                      >
                        <AddOutlined sx={{ fontSize: 18, color: '#4f46e5', flexShrink: 0 }} />
                        <ListItemText
                          primary="No se encontró ningún cliente — Crear nuevo"
                          slotProps={{ primary: { sx: { fontSize: '0.85rem', fontWeight: 600, color: '#4f46e5' } } }}
                        />
                      </ListItemButton>
                    )}
                  </Paper>
                )}
              </Box>
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
                  error={!!errors.precio_base}
                  helperText={
                    errors.precio_base?.message ||
                    (diasForm > 0 && precioBase > 0
                      ? `${formatARS(precioBase / diasForm)}/día × ${diasForm} días`
                      : undefined)
                  }
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

            {/* Nro vuelo + km contratados + observaciones */}
            <Grid size={{ xs: 12, sm: 4 }}>
              <Controller name="numero_vuelo" control={control} render={({ field }) => (
                <TextField {...field} label="Nro. vuelo (opcional)" fullWidth size="small" />
              )} />
            </Grid>
            <Grid size={{ xs: 12, sm: 4 }}>
              <Controller name="km_contratados" control={control} render={({ field }) => (
                <TextField {...field} label="Km contratados" type="number" fullWidth size="small"
                  helperText="Km libres incluidos en el contrato"
                  slotProps={{ input: { endAdornment: <InputAdornment position="end">km</InputAdornment> } }} />
              )} />
            </Grid>
            <Grid size={{ xs: 12 }}>
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
