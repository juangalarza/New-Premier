'use client';

import * as React from 'react';
import {
  Box, Typography, Paper, Table, TableBody, TableCell, TableContainer,
  TableHead, TableRow, Chip, IconButton, Tooltip, TextField, Button,
  Alert, Stack, Avatar, CircularProgress,
} from '@mui/material';
import {
  FileDownloadOutlined, RefreshOutlined, WarningAmberOutlined,
  DirectionsCarOutlined, PlaceOutlined, FlightOutlined,
  LocalGasStationOutlined,
} from '@mui/icons-material';
import { getAgendaDia } from './actions';
import type { EntregaAgenda, DevolucionAgenda } from './actions';

function formatHora(iso: string) {
  try { return new Date(iso).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit', hour12: false }); }
  catch { return '--:--'; }
}

function formatFecha(fecha: string) {
  try {
    return new Date(fecha + 'T12:00:00').toLocaleDateString('es-AR', {
      weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
    });
  } catch { return fecha; }
}

const COMBUSTIBLE_LABEL: Record<string, string> = {
  'lleno': 'Lleno', '3/4': '3/4', '1/2': '1/2', '1/4': '1/4', '1/8': '1/8',
};

const ESTADO_COLOR: Record<string, 'success' | 'warning' | 'info' | 'default'> = {
  confirmada: 'success', pendiente: 'warning', preventa: 'info',
};

interface Props {
  fecha: string;
  sucursalId: string | null;
  entregasIniciales: EntregaAgenda[];
  devolucionesIniciales: DevolucionAgenda[];
}

export default function AgendaClient({ fecha, sucursalId, entregasIniciales, devolucionesIniciales }: Props) {
  const [selectedDate, setSelectedDate] = React.useState(fecha);
  const [entregas, setEntregas] = React.useState(entregasIniciales);
  const [devs, setDevs] = React.useState(devolucionesIniciales);
  const [loading, setLoading] = React.useState(false);
  const [pdfLoading, setPdfLoading] = React.useState(false);

  async function buscar() {
    setLoading(true);
    try {
      const data = await getAgendaDia(selectedDate, sucursalId);
      setEntregas(data.entregas);
      setDevs(data.devoluciones);
    } finally {
      setLoading(false);
    }
  }

  async function handleExportPDF() {
    setPdfLoading(true);
    try {
      const [{ pdf }, { default: AgendaPDF }, React2] = await Promise.all([
        import('@react-pdf/renderer'),
        import('./AgendaPDF'),
        import('react'),
      ]);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const blob = await pdf(React2.createElement(AgendaPDF, { fecha: selectedDate, entregas, devoluciones: devs }) as any).toBlob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `agenda-${selectedDate}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } finally {
      setPdfLoading(false);
    }
  }

  const sinVehiculo = entregas.filter(e => !e.vehiculo).length;

  return (
    <Box sx={{ p: { xs: 1.5, sm: 2, md: 3 }, maxWidth: 1200, mx: 'auto' }}>
      {/* Header */}
      <Box sx={{ display: 'flex', alignItems: { xs: 'flex-start', sm: 'flex-start' }, justifyContent: 'space-between', mb: 3, flexDirection: { xs: 'column', sm: 'row' }, gap: 2 }}>
        <Box>
          <Typography variant="h5" sx={{ fontWeight: 700, fontFamily: 'Outfit' }}>Agenda Diaria</Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5, textTransform: 'capitalize' }}>
            {formatFecha(selectedDate)}
          </Typography>
        </Box>
        <Stack direction="row" spacing={1} sx={{ alignItems: 'center', flexWrap: 'wrap', gap: 1 }}>
          <TextField
            type="date"
            size="small"
            value={selectedDate}
            onChange={e => setSelectedDate(e.target.value)}
            sx={{ width: { xs: '100%', sm: 180 } }}
          />
          <Button
            variant="contained"
            onClick={buscar}
            disabled={loading}
            startIcon={loading ? <CircularProgress size={16} color="inherit" /> : <RefreshOutlined />}
            sx={{ bgcolor: '#4f46e5', '&:hover': { bgcolor: '#4338ca' } }}
          >
            Buscar
          </Button>
          <Tooltip title="Exportar PDF">
            <Button
              variant="outlined"
              onClick={handleExportPDF}
              disabled={pdfLoading}
              startIcon={pdfLoading ? <CircularProgress size={16} /> : <FileDownloadOutlined />}
            >
              PDF
            </Button>
          </Tooltip>
        </Stack>
      </Box>

      {/* Alerta vehículos sin asignar */}
      {sinVehiculo > 0 && (
        <Alert severity="error" icon={<WarningAmberOutlined />} sx={{ mb: 2 }}>
          <strong>{sinVehiculo} entrega{sinVehiculo > 1 ? 's' : ''} sin vehículo asignado</strong> — Asignar antes del turno.
        </Alert>
      )}

      {/* Stats chips */}
      <Stack direction="row" spacing={2} sx={{ mb: 3, flexWrap: 'wrap', gap: 1 }}>
        <Chip
          icon={<DirectionsCarOutlined />}
          label={`${entregas.length} entrega${entregas.length !== 1 ? 's' : ''}`}
          color="success"
          variant="outlined"
          sx={{ fontWeight: 600 }}
        />
        <Chip
          icon={<DirectionsCarOutlined />}
          label={`${devs.length} devolución${devs.length !== 1 ? 'es' : ''}`}
          color="warning"
          variant="outlined"
          sx={{ fontWeight: 600 }}
        />
      </Stack>

      {/* ENTREGAS */}
      <Typography variant="h6" sx={{ fontWeight: 700, fontFamily: 'Outfit', mb: 1.5 }}>
        Entregas del Día
      </Typography>

      {/* Desktop */}
      <Paper variant="outlined" sx={{ mb: 4, overflow: 'hidden', borderRadius: 2, display: { xs: 'none', md: 'block' } }}>
        <TableContainer>
          <Table size="small">
            <TableHead>
              <TableRow sx={{ backgroundColor: '#f8fafc' }}>
                <TableCell sx={{ fontWeight: 700, width: 70 }}>Hora</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Vehículo</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Cliente</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Lugar de entrega</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Estado</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Obs.</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {entregas.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} align="center" sx={{ py: 4, color: 'text.secondary' }}>
                    Sin entregas programadas para este día
                  </TableCell>
                </TableRow>
              )}
              {entregas.map(e => {
                const alert = !e.vehiculo;
                return (
                  <TableRow key={e.id} sx={{ bgcolor: alert ? '#fef2f2' : 'transparent' }}>
                    <TableCell sx={{ fontWeight: 600, color: alert ? 'error.main' : 'text.primary' }}>
                      {formatHora(e.fecha_entrega)}
                    </TableCell>
                    <TableCell>
                      {e.vehiculo ? (
                        <Box>
                          <Typography variant="body2" sx={{ fontWeight: 700 }}>{e.vehiculo.patente}</Typography>
                          <Typography variant="caption" color="text.secondary">{e.vehiculo.modelo}</Typography>
                          {e.vehiculo.combustible_actual && (
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.3, mt: 0.3 }}>
                              <LocalGasStationOutlined sx={{ fontSize: 12, color: 'text.disabled' }} />
                              <Typography variant="caption" color="text.disabled">{COMBUSTIBLE_LABEL[e.vehiculo.combustible_actual]}</Typography>
                            </Box>
                          )}
                        </Box>
                      ) : (
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, color: 'error.main' }}>
                          <WarningAmberOutlined sx={{ fontSize: 16 }} />
                          <Typography variant="body2" sx={{ fontWeight: 600 }}>Sin asignar</Typography>
                        </Box>
                      )}
                    </TableCell>
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Avatar sx={{ width: 28, height: 28, fontSize: 11, bgcolor: '#4f46e5' }}>
                          {e.cliente.nombre[0]}{e.cliente.apellido[0]}
                        </Avatar>
                        <Box>
                          <Typography variant="body2">{e.cliente.nombre} {e.cliente.apellido}</Typography>
                          <Typography variant="caption" color="text.secondary">{e.cliente.telefono}</Typography>
                        </Box>
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                        <PlaceOutlined sx={{ fontSize: 14, color: 'text.disabled' }} />
                        <Typography variant="body2">{e.lugar_entrega}</Typography>
                      </Box>
                      {e.numero_vuelo && (
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mt: 0.3 }}>
                          <FlightOutlined sx={{ fontSize: 12, color: 'text.disabled' }} />
                          <Typography variant="caption" color="text.secondary">Vuelo {e.numero_vuelo}</Typography>
                        </Box>
                      )}
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={e.estado}
                        size="small"
                        color={ESTADO_COLOR[e.estado] ?? 'default'}
                        variant="outlined"
                        sx={{ fontWeight: 600, fontSize: 11 }}
                      />
                    </TableCell>
                    <TableCell sx={{ maxWidth: 160 }}>
                      <Typography variant="caption" color="text.secondary" sx={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', display: 'block' }}>
                        {e.observaciones ?? '—'}
                      </Typography>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>

      {/* Mobile Entregas cards */}
      <Box sx={{ display: { xs: 'flex', md: 'none' }, flexDirection: 'column', gap: 1, mb: 4 }}>
        {entregas.length === 0 ? (
          <Box sx={{ py: 4, textAlign: 'center' }}>
            <Typography variant="body2" color="text.secondary">Sin entregas programadas para este día</Typography>
          </Box>
        ) : entregas.map(e => {
          const alert = !e.vehiculo;
          return (
            <Box key={e.id} sx={{ p: 1.5, bgcolor: alert ? '#fef2f2' : '#fff', border: `1px solid ${alert ? '#fca5a5' : '#e2e8f0'}`, borderRadius: 2 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 0.5 }}>
                <Typography variant="body2" sx={{ fontWeight: 700, color: alert ? 'error.main' : 'text.primary' }}>
                  {formatHora(e.fecha_entrega)}
                </Typography>
                <Chip label={e.estado} size="small" color={ESTADO_COLOR[e.estado] ?? 'default'} variant="outlined" sx={{ fontWeight: 600, fontSize: 11 }} />
              </Box>
              {e.vehiculo ? (
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 0.5 }}>
                  <Typography variant="body2" sx={{ fontWeight: 700 }}>{e.vehiculo.patente}</Typography>
                  <Typography variant="caption" color="text.secondary">· {e.vehiculo.modelo}</Typography>
                  {e.vehiculo.combustible_actual && (
                    <>
                      <LocalGasStationOutlined sx={{ fontSize: 12, color: 'text.disabled', ml: 0.5 }} />
                      <Typography variant="caption" color="text.disabled">{COMBUSTIBLE_LABEL[e.vehiculo.combustible_actual]}</Typography>
                    </>
                  )}
                </Box>
              ) : (
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 0.5, color: 'error.main' }}>
                  <WarningAmberOutlined sx={{ fontSize: 14 }} />
                  <Typography variant="body2" sx={{ fontWeight: 600 }}>Sin vehículo asignado</Typography>
                </Box>
              )}
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                <Avatar sx={{ width: 24, height: 24, fontSize: 10, bgcolor: '#4f46e5' }}>
                  {e.cliente.nombre[0]}{e.cliente.apellido[0]}
                </Avatar>
                <Typography variant="body2">{e.cliente.nombre} {e.cliente.apellido}</Typography>
                {e.cliente.telefono && (
                  <Typography component="a" href={`tel:${e.cliente.telefono}`} variant="caption" sx={{ color: '#4f46e5', textDecoration: 'none', ml: 'auto' }}>
                    {e.cliente.telefono}
                  </Typography>
                )}
              </Box>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                <PlaceOutlined sx={{ fontSize: 13, color: 'text.disabled' }} />
                <Typography variant="caption" color="text.secondary">{e.lugar_entrega}</Typography>
                {e.numero_vuelo && (
                  <>
                    <FlightOutlined sx={{ fontSize: 12, color: 'text.disabled', ml: 0.5 }} />
                    <Typography variant="caption" color="text.secondary">Vuelo {e.numero_vuelo}</Typography>
                  </>
                )}
              </Box>
              {e.observaciones && (
                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.3 }}>{e.observaciones}</Typography>
              )}
            </Box>
          );
        })}
      </Box>

      {/* DEVOLUCIONES */}
      <Typography variant="h6" sx={{ fontWeight: 700, fontFamily: 'Outfit', mb: 1.5 }}>
        Devoluciones del Día
      </Typography>

      {/* Desktop */}
      <Paper variant="outlined" sx={{ overflow: 'hidden', borderRadius: 2, display: { xs: 'none', md: 'block' } }}>
        <TableContainer>
          <Table size="small">
            <TableHead>
              <TableRow sx={{ backgroundColor: '#f8fafc' }}>
                <TableCell sx={{ fontWeight: 700, width: 70 }}>Hora</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Vehículo</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Cliente</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Lugar devolución</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Km devol.</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Obs.</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {devs.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} align="center" sx={{ py: 4, color: 'text.secondary' }}>
                    Sin devoluciones programadas para este día
                  </TableCell>
                </TableRow>
              )}
              {devs.map(d => (
                <TableRow key={d.id}>
                  <TableCell sx={{ fontWeight: 600 }}>{formatHora(d.fecha_devolucion)}</TableCell>
                  <TableCell>
                    {d.vehiculo ? (
                      <Box>
                        <Typography variant="body2" sx={{ fontWeight: 700 }}>{d.vehiculo.patente}</Typography>
                        <Typography variant="caption" color="text.secondary">{d.vehiculo.modelo}</Typography>
                      </Box>
                    ) : (
                      <Typography variant="body2" color="text.disabled">—</Typography>
                    )}
                  </TableCell>
                  <TableCell>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Avatar sx={{ width: 28, height: 28, fontSize: 11, bgcolor: '#f59e0b' }}>
                        {d.cliente.nombre[0]}{d.cliente.apellido[0]}
                      </Avatar>
                      <Box>
                        <Typography variant="body2">{d.cliente.nombre} {d.cliente.apellido}</Typography>
                        <Typography variant="caption" color="text.secondary">{d.cliente.telefono}</Typography>
                      </Box>
                    </Box>
                  </TableCell>
                  <TableCell>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                      <PlaceOutlined sx={{ fontSize: 14, color: 'text.disabled' }} />
                      <Typography variant="body2">{d.lugar_devolucion}</Typography>
                    </Box>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" sx={{ fontWeight: 600 }}>
                      {d.km_devolucion != null ? `${d.km_devolucion.toLocaleString('es-AR')} km` : '—'}
                    </Typography>
                  </TableCell>
                  <TableCell sx={{ maxWidth: 160 }}>
                    <Typography variant="caption" color="text.secondary" sx={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', display: 'block' }}>
                      {d.observaciones ?? '—'}
                    </Typography>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>

      {/* Mobile Devoluciones cards */}
      <Box sx={{ display: { xs: 'flex', md: 'none' }, flexDirection: 'column', gap: 1 }}>
        {devs.length === 0 ? (
          <Box sx={{ py: 4, textAlign: 'center' }}>
            <Typography variant="body2" color="text.secondary">Sin devoluciones programadas para este día</Typography>
          </Box>
        ) : devs.map(d => (
          <Box key={d.id} sx={{ p: 1.5, bgcolor: '#fff', border: '1px solid #e2e8f0', borderRadius: 2 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 0.5 }}>
              <Typography variant="body2" sx={{ fontWeight: 700 }}>{formatHora(d.fecha_devolucion)}</Typography>
              {d.km_devolucion != null && (
                <Typography variant="caption" color="text.secondary">{d.km_devolucion.toLocaleString('es-AR')} km</Typography>
              )}
            </Box>
            {d.vehiculo && (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 0.5 }}>
                <Typography variant="body2" sx={{ fontWeight: 700 }}>{d.vehiculo.patente}</Typography>
                <Typography variant="caption" color="text.secondary">· {d.vehiculo.modelo}</Typography>
              </Box>
            )}
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
              <Avatar sx={{ width: 24, height: 24, fontSize: 10, bgcolor: '#f59e0b' }}>
                {d.cliente.nombre[0]}{d.cliente.apellido[0]}
              </Avatar>
              <Typography variant="body2">{d.cliente.nombre} {d.cliente.apellido}</Typography>
              {d.cliente.telefono && (
                <Typography component="a" href={`tel:${d.cliente.telefono}`} variant="caption" sx={{ color: '#4f46e5', textDecoration: 'none', ml: 'auto' }}>
                  {d.cliente.telefono}
                </Typography>
              )}
            </Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
              <PlaceOutlined sx={{ fontSize: 13, color: 'text.disabled' }} />
              <Typography variant="caption" color="text.secondary">{d.lugar_devolucion}</Typography>
            </Box>
            {d.observaciones && (
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.3 }}>{d.observaciones}</Typography>
            )}
          </Box>
        ))}
      </Box>
    </Box>
  );
}
