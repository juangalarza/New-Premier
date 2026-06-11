'use client';

import * as React from 'react';
import {
  Box, Drawer, Typography, IconButton, Divider, Chip, Button,
  Avatar, Tooltip, Dialog, DialogTitle, DialogContent, DialogActions,
  TextField, MenuItem, Alert, CircularProgress, Snackbar, Select,
  FormControl, InputLabel,
} from '@mui/material';
import {
  CloseOutlined, PrintOutlined, DirectionsCarOutlined,
  PersonOutlined, CalendarTodayOutlined, AttachMoneyOutlined,
  AddOutlined, WarningAmberOutlined, ArticleOutlined,
  EditOutlined, SaveOutlined, CancelOutlined,
} from '@mui/icons-material';
import type { ReservaConRelaciones } from '@/app/dashboard/reservas/actions';
import {
  cambiarEstado, cargarPago, autoAsignarVehiculo, actualizarObservaciones,
  actualizarReserva, getVehiculosDisponibles, getReserva,
} from '@/app/dashboard/reservas/actions';
import type { Vehiculo } from '@/types';

interface Props {
  reserva: ReservaConRelaciones;
  onClose: () => void;
  onUpdate: (r: ReservaConRelaciones) => void;
}

const ESTADO_STYLE: Record<string, { bg: string; color: string; label: string }> = {
  preventa:  { bg: '#f1f5f9', color: '#64748b', label: 'Preventa' },
  pendiente: { bg: '#fef9c3', color: '#ca8a04', label: 'Pendiente' },
  confirmada:{ bg: '#dcfce7', color: '#16a34a', label: 'Confirmada' },
  en_curso:  { bg: '#dbeafe', color: '#2563eb', label: 'En curso' },
  devuelta:  { bg: '#f0fdf4', color: '#15803d', label: 'Devuelta' },
  cancelada: { bg: '#fee2e2', color: '#dc2626', label: 'Cancelada' },
};

function formatFecha(iso: string) {
  return new Date(iso).toLocaleString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}
function formatARS(v: number) {
  return new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(v);
}

function SectionTitle({ icon, title }: { icon: React.ReactNode; title: string }) {
  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5, mt: 0.5 }}>
      <Box sx={{ color: '#4f46e5' }}>{icon}</Box>
      <Typography variant="body2" sx={{ fontWeight: 700, color: '#374151', textTransform: 'uppercase', letterSpacing: '0.05em', fontSize: '0.7rem' }}>
        {title}
      </Typography>
    </Box>
  );
}

function DataRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', py: 0.5 }}>
      <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.82rem' }}>{label}</Typography>
      <Typography variant="body2" sx={{ fontWeight: 600, fontSize: '0.82rem', textAlign: 'right' }}>{value}</Typography>
    </Box>
  );
}

export default function ReservaDrawer({ reserva: initialReserva, onClose, onUpdate }: Props) {
  const [reserva, setReserva] = React.useState(initialReserva);
  const [accionLoading, setAccionLoading] = React.useState('');
  const [accionError, setAccionError] = React.useState('');
  const [obs, setObs] = React.useState(reserva.observaciones ?? '');
  const [obsSaving, setObsSaving] = React.useState(false);
  const [contratoImpreso, setContratoImpreso] = React.useState(false);

  // Edit mode
  const [editMode, setEditMode] = React.useState(false);
  const [editData, setEditData] = React.useState({
    fecha_entrega: '',
    fecha_devolucion: '',
    lugar_entrega: '',
    lugar_devolucion: '',
    vehiculo_id: null as string | null,
    precio_total: 0,
  });
  const [vehiculosDisponibles, setVehiculosDisponibles] = React.useState<Vehiculo[]>([]);
  const [editLoading, setEditLoading] = React.useState(false);
  const [snackbar, setSnackbar] = React.useState<{ open: boolean; msg: string; severity: 'success' | 'error' }>({ open: false, msg: '', severity: 'success' });

  // Dialog Entregar
  const [entregarOpen, setEntregarOpen] = React.useState(false);
  const [kmEntrega, setKmEntrega] = React.useState('');
  const [combEntrega, setCombEntrega] = React.useState('lleno');

  // Dialog Devolver
  const [devolverOpen, setDevolverOpen] = React.useState(false);
  const [kmDev, setKmDev] = React.useState('');
  const [combDev, setCombDev] = React.useState('lleno');

  // Dialog Pago
  const [pagoOpen, setPagoOpen] = React.useState(false);
  const [pagoMonto, setPagoMonto] = React.useState('');
  const [pagoMetodo, setPagoMetodo] = React.useState('efectivo');
  const [pagoRef, setPagoRef] = React.useState('');

  const refreshReserva = async () => {
    const updated = await getReserva(reserva.id);
    setReserva(updated);
    onUpdate(updated);
  };

  const handleAccion = async (accion: string, fn: () => Promise<void>) => {
    setAccionLoading(accion);
    setAccionError('');
    try {
      await fn();
      await refreshReserva();
    } catch (e: any) {
      setAccionError(e.message ?? 'Error');
    } finally {
      setAccionLoading('');
    }
  };

  const handleEntregar = () =>
    handleAccion('entregar', async () => {
      await cambiarEstado(reserva.id, 'en_curso', {
        km_entrega: Number(kmEntrega),
        combustible_entrega: combEntrega,
        vehiculo_id: reserva.vehiculo?.id,
      });
      setEntregarOpen(false);
    });

  const kmRecorridos = kmDev && reserva.km_entrega != null ? Number(kmDev) - reserva.km_entrega : null;
  const kmContratados = reserva.km_contratados ?? 0;
  const kmExtra = kmRecorridos != null && kmRecorridos > kmContratados ? kmRecorridos - kmContratados : 0;

  const handleDevolver = () =>
    handleAccion('devolver', async () => {
      await cambiarEstado(reserva.id, 'devuelta', {
        km_devolucion: Number(kmDev),
        combustible_devolucion: combDev,
      });
      setDevolverOpen(false);
    });

  const handleConfirmar = () =>
    handleAccion('confirmar', () => cambiarEstado(reserva.id, 'confirmada'));

  const handleCancelar = () =>
    handleAccion('cancelar', () => cambiarEstado(reserva.id, 'cancelada'));

  const handleAutoAsignar = () =>
    handleAccion('autoasignar', async () => {
      const vid = await autoAsignarVehiculo(reserva.id);
      if (!vid) throw new Error('No hay vehículos disponibles para esas fechas');
    });

  const handleCargarPago = () =>
    handleAccion('pago', async () => {
      if (!pagoMonto || Number(pagoMonto) <= 0) throw new Error('Ingresá un monto válido');
      await cargarPago(reserva.id, Number(pagoMonto), pagoMetodo, pagoRef);
      setPagoOpen(false);
      setPagoMonto(''); setPagoRef('');
    });

  const handleDescargarContrato = async () => {
    const { pdf } = await import('@react-pdf/renderer');
    const { ContratoPDF } = await import('./ContratoPDF');
    const blob = await pdf(React.createElement(ContratoPDF, { reserva, siluetaSrc: `${window.location.origin}/siluetas/Sedan.png` }) as any).toBlob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `contrato-${reserva.id_corto}.pdf`;
    a.click();
    URL.revokeObjectURL(url);
    setContratoImpreso(true);
  };

  const handleDescargarInvoice = async () => {
    const { pdf } = await import('@react-pdf/renderer');
    const { ReservaPDF } = await import('./ReservaPDF');
    const blob = await pdf(React.createElement(ReservaPDF, { reserva }) as any).toBlob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `reserva-${reserva.id_corto}.pdf`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleSaveObs = async () => {
    setObsSaving(true);
    await actualizarObservaciones(reserva.id, obs);
    setObsSaving(false);
  };

  const handleStartEdit = async () => {
    setEditData({
      fecha_entrega: reserva.fecha_entrega.slice(0, 16),
      fecha_devolucion: reserva.fecha_devolucion.slice(0, 16),
      lugar_entrega: reserva.lugar_entrega,
      lugar_devolucion: reserva.lugar_devolucion,
      vehiculo_id: reserva.vehiculo_id,
      precio_total: reserva.precio_total,
    });
    const veh = await getVehiculosDisponibles(reserva.fecha_entrega, reserva.fecha_devolucion);
    // Siempre incluir el vehículo actual en la lista aunque esté ocupado
    const actual = reserva.vehiculo;
    const yaEsta = !actual || veh.some(v => v.id === actual.id);
    setVehiculosDisponibles(yaEsta ? veh : [{ id: actual.id, patente: actual.patente, modelo: actual.modelo } as Vehiculo, ...veh]);
    setEditMode(true);
  };

  const handleCancelEdit = () => setEditMode(false);

  const handleGuardarEdicion = async () => {
    if (new Date(editData.fecha_devolucion) <= new Date(editData.fecha_entrega)) {
      setSnackbar({ open: true, msg: 'La fecha de devolución debe ser posterior a la de entrega', severity: 'error' });
      return;
    }
    setEditLoading(true);
    try {
      await actualizarReserva(reserva.id, {
        ...editData,
        fecha_entrega: new Date(editData.fecha_entrega).toISOString(),
        fecha_devolucion: new Date(editData.fecha_devolucion).toISOString(),
      });
      await refreshReserva();
      setEditMode(false);
      setSnackbar({ open: true, msg: 'Reserva actualizada correctamente', severity: 'success' });
    } catch (e: unknown) {
      setSnackbar({ open: true, msg: e instanceof Error ? e.message : 'Error al guardar', severity: 'error' });
    } finally {
      setEditLoading(false);
    }
  };

  const est = ESTADO_STYLE[reserva.estado];
  const saldo = reserva.precio_total - reserva.total_pagado;
  const dias = Math.ceil((new Date(reserva.fecha_devolucion).getTime() - new Date(reserva.fecha_entrega).getTime()) / 86400000);

  return (
    <>
      <Drawer
        anchor="right"
        open
        variant="temporary"
        onClose={onClose}
        sx={{
          '& .MuiDrawer-paper': {
            width: 520,
            height: '100vh',
            border: 'none',
            borderLeft: '1px solid #e2e8f0',
            display: 'flex',
            flexDirection: 'column',
            boxShadow: '-8px 0 30px rgba(0, 0, 0, 0.08)',
            borderTopLeftRadius: '24px',
            borderBottomLeftRadius: '24px',
            overflow: 'hidden',
          },
        }}
      >
        {/* Header */}
        <Box sx={{ px: 3, py: 2, borderBottom: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'space-between', bgcolor: '#fafafa' }}>
          <Box>
            <Typography variant="caption" color="text.secondary">Reserva</Typography>
            <Typography variant="h6" sx={{ fontWeight: 800, fontFamily: 'Outfit', lineHeight: 1 }}>
              #{reserva.id_corto}
            </Typography>
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Chip label={est?.label} size="small" sx={{ bgcolor: est?.bg, color: est?.color, fontWeight: 700 }} />
            {!editMode && (
              <>
                <Tooltip title="Descargar comprobante">
                  <IconButton size="small" onClick={handleDescargarInvoice}><PrintOutlined fontSize="small" /></IconButton>
                </Tooltip>
                <Tooltip title={contratoImpreso ? 'Contrato descargado' : 'Descargar contrato'}>
                  <IconButton size="small" onClick={handleDescargarContrato} sx={{ color: contratoImpreso ? '#16a34a' : 'inherit' }}>
                    <ArticleOutlined fontSize="small" />
                  </IconButton>
                </Tooltip>
                {!['cancelada', 'devuelta'].includes(reserva.estado) && (
                  <Tooltip title="Editar reserva">
                    <IconButton size="small" onClick={handleStartEdit} sx={{ color: '#4f46e5' }}>
                      <EditOutlined fontSize="small" />
                    </IconButton>
                  </Tooltip>
                )}
              </>
            )}
            {editMode && (
              <>
                <Button size="small" variant="outlined" color="inherit" startIcon={<CancelOutlined />}
                  onClick={handleCancelEdit} disabled={editLoading} sx={{ fontWeight: 600, fontSize: '0.75rem' }}>
                  Cancelar
                </Button>
                <Button size="small" variant="contained" startIcon={editLoading ? <CircularProgress size={14} color="inherit" /> : <SaveOutlined />}
                  onClick={handleGuardarEdicion} disabled={editLoading}
                  sx={{ bgcolor: '#4f46e5', '&:hover': { bgcolor: '#4338ca' }, fontWeight: 600, fontSize: '0.75rem' }}>
                  Guardar
                </Button>
              </>
            )}
            <Tooltip title="Cerrar">
              <IconButton size="small" onClick={onClose}><CloseOutlined fontSize="small" /></IconButton>
            </Tooltip>
          </Box>
        </Box>

        {/* Contenido scrollable */}
        <Box sx={{ flexGrow: 1, overflowY: 'auto', px: 3, py: 2.5, display: 'flex', flexDirection: 'column', gap: 2.5 }}>
          {accionError && <Alert severity="error" onClose={() => setAccionError('')}>{accionError}</Alert>}

          {/* Cliente */}
          <Box>
            <SectionTitle icon={<PersonOutlined fontSize="small" />} title="Cliente" />
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1.5 }}>
              <Avatar sx={{ bgcolor: '#4f46e5', fontWeight: 700, width: 40, height: 40 }}>
                {reserva.cliente.nombre[0]}{reserva.cliente.apellido[0]}
              </Avatar>
              <Box>
                <Typography variant="body2" sx={{ fontWeight: 700 }}>
                  {reserva.cliente.nombre} {reserva.cliente.apellido}
                </Typography>
                <Typography
                  component="a" href={`mailto:${reserva.cliente.email}`}
                  variant="caption" sx={{ color: '#4f46e5', textDecoration: 'none', '&:hover': { textDecoration: 'underline' } }}
                >
                  {reserva.cliente.email}
                </Typography>
              </Box>
            </Box>
            <DataRow label="DNI / Pasaporte" value={reserva.cliente.dni_pasaporte} />
            <DataRow label="Licencia" value={reserva.cliente.licencia_conducir} />
            <DataRow label="Teléfono" value={reserva.cliente.telefono} />
            {reserva.cliente.fecha_nacimiento && (
              <DataRow
                label="Fecha nacimiento"
                value={new Date(reserva.cliente.fecha_nacimiento + 'T00:00:00').toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' })}
              />
            )}

            {/* Vehículo */}
            {reserva.vehiculo ? (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, p: 1.5, borderRadius: 2, bgcolor: '#f8fafc', border: '1px solid #e2e8f0' }}>
                <Avatar variant="rounded" sx={{ width: 48, height: 40, borderRadius: '8px', bgcolor: '#e0e7ff' }}>
                  <DirectionsCarOutlined sx={{ color: '#4f46e5' }} />
                </Avatar>
                <Box>
                  <Typography variant="body2" sx={{ fontWeight: 700 }}>{reserva.vehiculo.modelo}</Typography>
                  <Typography variant="caption" sx={{ fontFamily: 'monospace', fontWeight: 700, color: '#4f46e5' }}>
                    {reserva.vehiculo.patente}
                  </Typography>
                </Box>
              </Box>
            ) : (
              <Box sx={{ p: 1.5, borderRadius: 2, bgcolor: '#fffbeb', border: '1px solid #fde68a', display: 'flex', alignItems: 'center', gap: 1 }}>
                <WarningAmberOutlined sx={{ color: '#f59e0b', fontSize: 18 }} />
                <Typography variant="body2" sx={{ color: '#92400e', fontWeight: 600, fontSize: '0.82rem' }}>
                  Sin vehículo asignado
                </Typography>
              </Box>
            )}
          </Box>

          <Divider />

          {/* Entrega / Devolución */}
          <Box>
            <SectionTitle icon={<CalendarTodayOutlined fontSize="small" />} title="Entrega y Devolución" />
            {!editMode ? (
              <>
                <DataRow label="Entrega" value={formatFecha(reserva.fecha_entrega)} />
                <DataRow label="Lugar entrega" value={reserva.lugar_entrega} />
                {reserva.numero_vuelo && <DataRow label="Nro. vuelo" value={reserva.numero_vuelo} />}
                <DataRow label="Devolución" value={formatFecha(reserva.fecha_devolucion)} />
                <DataRow label="Lugar devolución" value={reserva.lugar_devolucion} />
                <DataRow label="Días" value={`${dias} día${dias !== 1 ? 's' : ''}`} />
                {(reserva.km_contratados ?? 0) > 0 && <DataRow label="Km contratados" value={`${(reserva.km_contratados ?? 0).toLocaleString('es-AR')} km`} />}
                {reserva.km_entrega != null && <DataRow label="Km entrega" value={`${reserva.km_entrega.toLocaleString('es-AR')} km`} />}
                {reserva.km_devolucion != null && <DataRow label="Km devolución" value={`${reserva.km_devolucion.toLocaleString('es-AR')} km`} />}
                {reserva.km_entrega != null && reserva.km_devolucion != null && (
                  <DataRow label="Km recorridos" value={`${(reserva.km_devolucion - reserva.km_entrega).toLocaleString('es-AR')} km`} />
                )}
              </>
            ) : (
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                <TextField label="Fecha entrega" type="datetime-local" size="small" fullWidth
                  value={editData.fecha_entrega}
                  onChange={e => setEditData(d => ({ ...d, fecha_entrega: e.target.value }))}
                  slotProps={{ inputLabel: { shrink: true } }} />
                <TextField label="Lugar entrega" size="small" fullWidth
                  value={editData.lugar_entrega}
                  onChange={e => setEditData(d => ({ ...d, lugar_entrega: e.target.value }))} />
                <TextField label="Fecha devolución" type="datetime-local" size="small" fullWidth
                  value={editData.fecha_devolucion}
                  onChange={e => setEditData(d => ({ ...d, fecha_devolucion: e.target.value }))}
                  slotProps={{ inputLabel: { shrink: true } }} />
                <TextField label="Lugar devolución" size="small" fullWidth
                  value={editData.lugar_devolucion}
                  onChange={e => setEditData(d => ({ ...d, lugar_devolucion: e.target.value }))} />
                <FormControl fullWidth size="small">
                  <InputLabel>Vehículo</InputLabel>
                  <Select
                    value={editData.vehiculo_id ?? ''}
                    label="Vehículo"
                    onChange={e => setEditData(d => ({ ...d, vehiculo_id: e.target.value || null }))}
                  >
                    <MenuItem value=""><em>Sin asignar</em></MenuItem>
                    {vehiculosDisponibles.map(v => (
                      <MenuItem key={v.id} value={v.id}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Typography variant="body2" sx={{ fontFamily: 'monospace', fontWeight: 700, color: '#4f46e5' }}>{v.patente}</Typography>
                          <Typography variant="body2" color="text.secondary">{v.modelo}</Typography>
                        </Box>
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Box>
            )}

            {/* Botones de acción */}
            <Box sx={{ display: 'flex', gap: 1, mt: 2, flexWrap: 'wrap' }}>
              {reserva.estado === 'pendiente' && (
                <Button size="small" variant="outlined" color="success"
                  onClick={handleConfirmar} disabled={!!accionLoading} sx={{ fontWeight: 600 }}>
                  {accionLoading === 'confirmar' ? <CircularProgress size={16} /> : 'Confirmar'}
                </Button>
              )}
              {reserva.estado === 'confirmada' && (
                <Tooltip title={!contratoImpreso ? 'Descargá el contrato primero' : ''}>
                  <span>
                    <Button size="small" variant="contained" color="primary"
                      onClick={() => setEntregarOpen(true)}
                      disabled={!!accionLoading || !contratoImpreso}
                      sx={{ fontWeight: 600 }}>
                      Entregar
                    </Button>
                  </span>
                </Tooltip>
              )}
              {reserva.estado === 'en_curso' && (
                <Button size="small" variant="contained" color="success"
                  onClick={() => setDevolverOpen(true)} disabled={!!accionLoading} sx={{ fontWeight: 600 }}>
                  Devolver
                </Button>
              )}
              {!reserva.vehiculo_id && reserva.estado !== 'cancelada' && reserva.estado !== 'devuelta' && (
                <Button size="small" variant="outlined"
                  onClick={handleAutoAsignar} disabled={!!accionLoading} sx={{ fontWeight: 600 }}>
                  {accionLoading === 'autoasignar' ? <CircularProgress size={16} /> : 'Auto-asignar'}
                </Button>
              )}
              {!['cancelada', 'devuelta'].includes(reserva.estado) && (
                <Button size="small" variant="outlined" color="error"
                  onClick={handleCancelar} disabled={!!accionLoading} sx={{ fontWeight: 600 }}>
                  Cancelar
                </Button>
              )}
            </Box>
          </Box>

          <Divider />

          {/* Importe */}
          <Box>
            <SectionTitle icon={<AttachMoneyOutlined fontSize="small" />} title="Importe" />
            <DataRow label="Precio base" value={formatARS(reserva.precio_base)} />
            {reserva.descuento_aplicado > 0 && (
              <DataRow label="Descuento" value={<span style={{ color: '#16a34a' }}>-{formatARS(reserva.descuento_aplicado)}</span>} />
            )}
            {reserva.precio_coberturas > 0 && (
              <DataRow label="Coberturas" value={formatARS(reserva.precio_coberturas)} />
            )}
            {reserva.precio_adicionales > 0 && (
              <DataRow label="Adicionales" value={formatARS(reserva.precio_adicionales)} />
            )}
            <Divider sx={{ my: 1 }} />
            {!editMode ? (
              <DataRow label="Total acordado" value={<strong>{formatARS(reserva.precio_total)}</strong>} />
            ) : (
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', py: 0.5 }}>
                <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.82rem' }}>Total acordado</Typography>
                <TextField
                  type="number" size="small" sx={{ width: 140 }}
                  value={editData.precio_total}
                  onChange={e => setEditData(d => ({ ...d, precio_total: Number(e.target.value) }))}
                  slotProps={{ input: { startAdornment: <Box component="span" sx={{ mr: 0.5, color: 'text.secondary', fontSize: '0.82rem' }}>$</Box> } }}
                />
              </Box>
            )}
            <DataRow
              label="Total pagado"
              value={<span style={{ color: saldo === 0 ? '#16a34a' : '#dc2626', fontWeight: 700 }}>{formatARS(reserva.total_pagado)}</span>}
            />
            {saldo > 0 && (
              <DataRow label="Saldo pendiente" value={<span style={{ color: '#dc2626', fontWeight: 700 }}>-{formatARS(saldo)}</span>} />
            )}
            <Box sx={{ mt: 1.5 }}>
              <Button size="small" variant="outlined" startIcon={<AddOutlined />}
                onClick={() => setPagoOpen(true)} sx={{ fontWeight: 600 }}>
                Cargar pago
              </Button>
            </Box>
          </Box>

          <Divider />

          {/* Observaciones */}
          <Box>
            <SectionTitle icon={<CalendarTodayOutlined fontSize="small" />} title="Observaciones" />
            <TextField
              multiline rows={3} fullWidth size="small" value={obs}
              onChange={e => setObs(e.target.value)} placeholder="Notas internas..."
            />
            {obs !== (reserva.observaciones ?? '') && (
              <Button size="small" variant="text" onClick={handleSaveObs} disabled={obsSaving} sx={{ mt: 0.5, fontWeight: 600 }}>
                {obsSaving ? 'Guardando...' : 'Guardar'}
              </Button>
            )}
          </Box>
        </Box>
      </Drawer>

      {/* Dialog Entregar */}
      <Dialog open={entregarOpen} onClose={() => setEntregarOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ fontWeight: 700 }}>Registrar entrega</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
            <TextField label="Km al entregar" type="number" size="small" fullWidth
              value={kmEntrega} onChange={e => setKmEntrega(e.target.value)} />
            <TextField select label="Combustible al entregar" size="small" fullWidth
              value={combEntrega} onChange={e => setCombEntrega(e.target.value)}>
              {['1/8', '1/4', '1/2', '3/4', 'lleno'].map(v => <MenuItem key={v} value={v}>{v}</MenuItem>)}
            </TextField>
          </Box>
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2 }}>
          <Button onClick={() => setEntregarOpen(false)}>Cancelar</Button>
          <Button variant="contained" onClick={handleEntregar} disabled={accionLoading === 'entregar'} sx={{ fontWeight: 600 }}>
            {accionLoading === 'entregar' ? <CircularProgress size={18} /> : 'Confirmar entrega'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Dialog Devolver */}
      <Dialog open={devolverOpen} onClose={() => setDevolverOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ fontWeight: 700 }}>Registrar devolución</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
            <TextField label="Km al devolver" type="number" size="small" fullWidth
              value={kmDev} onChange={e => setKmDev(e.target.value)} />
            <TextField select label="Combustible al devolver" size="small" fullWidth
              value={combDev} onChange={e => setCombDev(e.target.value)}>
              {['1/8', '1/4', '1/2', '3/4', 'lleno'].map(v => <MenuItem key={v} value={v}>{v}</MenuItem>)}
            </TextField>

            {/* Resumen de km */}
            {kmDev && reserva.km_entrega != null && (
              <Box sx={{ bgcolor: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 2, p: 1.5 }}>
                <Typography variant="caption" sx={{ fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Resumen de kilómetros
                </Typography>
                <Box sx={{ mt: 1, display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                    <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.8rem' }}>Km al entregar</Typography>
                    <Typography variant="body2" sx={{ fontWeight: 600, fontSize: '0.8rem' }}>{reserva.km_entrega.toLocaleString('es-AR')} km</Typography>
                  </Box>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                    <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.8rem' }}>Km al devolver</Typography>
                    <Typography variant="body2" sx={{ fontWeight: 600, fontSize: '0.8rem' }}>{Number(kmDev).toLocaleString('es-AR')} km</Typography>
                  </Box>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid #e2e8f0', pt: 0.5, mt: 0.5 }}>
                    <Typography variant="body2" sx={{ fontWeight: 700, fontSize: '0.8rem' }}>Km recorridos</Typography>
                    <Typography variant="body2" sx={{ fontWeight: 700, fontSize: '0.8rem' }}>
                      {kmRecorridos != null ? `${kmRecorridos.toLocaleString('es-AR')} km` : '—'}
                    </Typography>
                  </Box>
                  {kmContratados > 0 && (
                    <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                      <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.8rem' }}>Km contratados</Typography>
                      <Typography variant="body2" sx={{ fontWeight: 600, fontSize: '0.8rem' }}>{kmContratados.toLocaleString('es-AR')} km</Typography>
                    </Box>
                  )}
                  {kmExtra > 0 && (
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', bgcolor: '#fef9c3', borderRadius: 1, px: 1, py: 0.5 }}>
                      <Typography variant="body2" sx={{ fontWeight: 700, fontSize: '0.8rem', color: '#92400e' }}>Km adicionales</Typography>
                      <Typography variant="body2" sx={{ fontWeight: 700, fontSize: '0.8rem', color: '#92400e' }}>+{kmExtra.toLocaleString('es-AR')} km</Typography>
                    </Box>
                  )}
                </Box>
              </Box>
            )}
          </Box>
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2 }}>
          <Button onClick={() => setDevolverOpen(false)}>Cancelar</Button>
          <Button variant="contained" color="success" onClick={handleDevolver} disabled={accionLoading === 'devolver'} sx={{ fontWeight: 600 }}>
            {accionLoading === 'devolver' ? <CircularProgress size={18} /> : 'Confirmar devolución'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Snackbar feedback */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={() => setSnackbar(s => ({ ...s, open: false }))}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert severity={snackbar.severity} onClose={() => setSnackbar(s => ({ ...s, open: false }))} sx={{ width: '100%' }}>
          {snackbar.msg}
        </Alert>
      </Snackbar>

      {/* Dialog Pago */}
      <Dialog open={pagoOpen} onClose={() => setPagoOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ fontWeight: 700 }}>Cargar pago</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
            <TextField label="Monto" type="number" size="small" fullWidth
              value={pagoMonto} onChange={e => setPagoMonto(e.target.value)}
              slotProps={{ input: { startAdornment: <Box component="span" sx={{ mr: 0.5, color: 'text.secondary' }}>$</Box> } }} />
            <TextField select label="Método" size="small" fullWidth value={pagoMetodo} onChange={e => setPagoMetodo(e.target.value)}>
              <MenuItem value="efectivo">Efectivo</MenuItem>
              <MenuItem value="transferencia">Transferencia</MenuItem>
              <MenuItem value="tarjeta_credito">Tarjeta crédito</MenuItem>
              <MenuItem value="tarjeta_debito">Tarjeta débito</MenuItem>
              <MenuItem value="mercado_pago">Mercado Pago</MenuItem>
            </TextField>
            <TextField label="Referencia (opcional)" size="small" fullWidth value={pagoRef} onChange={e => setPagoRef(e.target.value)} />
          </Box>
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2 }}>
          <Button onClick={() => setPagoOpen(false)}>Cancelar</Button>
          <Button variant="contained" onClick={handleCargarPago} disabled={accionLoading === 'pago'} sx={{ fontWeight: 600 }}>
            {accionLoading === 'pago' ? <CircularProgress size={18} /> : 'Registrar pago'}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
