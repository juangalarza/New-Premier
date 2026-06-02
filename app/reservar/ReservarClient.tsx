'use client';

import * as React from 'react';
import {
  Box, Container, Typography, Button, TextField, Paper, Grid,
  Card, CardContent, CardActionArea, CardMedia, Stepper, Step, StepLabel,
  Checkbox, FormControlLabel, Divider, Alert, CircularProgress,
  Chip, Stack, IconButton, FormControl, InputLabel, Select, MenuItem,
} from '@mui/material';
import {
  ArrowBack, ArrowForward, DirectionsCar, CheckCircleOutlined,
  LocationOn, FlightTakeoff, DiscountOutlined, SpeedOutlined,
} from '@mui/icons-material';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useRouter } from 'next/navigation';
import { crearReserva, validarCodigoDescuento } from './actions';

// ─── Types ────────────────────────────────────────────────────────────────────
interface VehiculoCard {
  id: string; patente: string; marca: string; modelo: string;
  anio: number; color: string | null; foto_url: string | null; km_actual: number;
}
interface CategoriaDisponible {
  categoria: { id: string; nombre: string; descripcion: string | null };
  vehiculos: VehiculoCard[];
  precio_por_dia: number;
  precio_total: number;
  dias: number;
}
interface Servicio {
  id: string; nombre: string; descripcion: string | null; precio_por_dia: number;
}

// ─── Zod schema paso 3 ────────────────────────────────────────────────────────
const pasajeroSchema = z.object({
  nombre: z.string().min(1, 'Requerido'),
  apellido: z.string().min(1, 'Requerido'),
  email: z.string().email('Email inválido'),
  telefono: z.string().min(7, 'Mínimo 7 dígitos'),
  dni_pasaporte: z.string().min(5, 'Requerido'),
  licencia_conducir: z.string().min(4, 'Requerido'),
  ciudad: z.string().min(2, 'Requerido'),
  pais: z.string().min(2, 'Requerido'),
});
type PasajeroForm = z.infer<typeof pasajeroSchema>;

// ─── Helpers ──────────────────────────────────────────────────────────────────
const fmt = new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', minimumFractionDigits: 0 });
const formatARS = (n: number) => fmt.format(n);

function calcularDias(desde: string, hasta: string) {
  return Math.max(1, Math.ceil((new Date(hasta).getTime() - new Date(desde).getTime()) / 86400000));
}

interface Precios {
  base: number; descOnline: number; descCodigo: number;
  coberturas: number; adicionales: number; total: number;
}

function calcularPrecios(params: {
  precioPorDia: number; dias: number;
  coberturas: Servicio[]; adicionales: Servicio[];
  selectedCoberturas: string[]; selectedAdicionales: string[];
  descuentoOnlinePct: number; descuentoCodigoPct: number; payOnline: boolean;
}): Precios {
  const { precioPorDia, dias, coberturas, adicionales, selectedCoberturas, selectedAdicionales, descuentoOnlinePct, descuentoCodigoPct, payOnline } = params;
  const base = precioPorDia * dias;
  const descOnline = payOnline ? Math.round(base * descuentoOnlinePct / 100) : 0;
  const cobsTotal = selectedCoberturas.reduce((s, id) => s + (coberturas.find(c => c.id === id)?.precio_por_dia ?? 0) * dias, 0);
  const addsTotal = selectedAdicionales.reduce((s, id) => s + (adicionales.find(a => a.id === id)?.precio_por_dia ?? 0) * dias, 0);
  const descCodigo = Math.round((base - descOnline) * descuentoCodigoPct / 100);
  return {
    base, descOnline, descCodigo,
    coberturas: cobsTotal, adicionales: addsTotal,
    total: base - descOnline - descCodigo + cobsTotal + addsTotal,
  };
}

const LUGARES = ['Aeropuerto', 'Oficina Central', 'Hotel / Alojamiento', 'Terminal de Ómnibus', 'Otro'];
const PASOS = ['Fechas y categoría', 'Vehículo y coberturas', 'Datos del pasajero', 'Pago'];

// ─── Props ────────────────────────────────────────────────────────────────────
interface Props {
  initialDesde: string;
  initialHasta: string;
  coberturas: Servicio[];
  adicionales: Servicio[];
  descuentoOnlinePct: number;
  tenantNombre: string;
}

// ─── PASO 1: Buscar ───────────────────────────────────────────────────────────
function Paso1Buscar({
  fechaDesde, fechaHasta, setFechaDesde, setFechaHasta,
  categorias, loading, error, onBuscar, onSeleccionarCategoria,
}: {
  fechaDesde: string; fechaHasta: string;
  setFechaDesde: (v: string) => void; setFechaHasta: (v: string) => void;
  categorias: CategoriaDisponible[]; loading: boolean; error: string;
  onBuscar: () => void; onSeleccionarCategoria: (c: CategoriaDisponible) => void;
}) {
  const today = new Date().toISOString().split('T')[0];
  return (
    <Box>
      <Paper variant="outlined" sx={{ p: 3, mb: 4, borderRadius: 3 }}>
        <Typography variant="h6" sx={{ fontWeight: 700, fontFamily: 'Outfit', mb: 2 }}>
          ¿Cuándo necesitás el vehículo?
        </Typography>
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ alignItems: 'flex-end' }}>
          <TextField
            label="Fecha de entrega"
            type="date"
            size="small"
            value={fechaDesde}
            onChange={e => setFechaDesde(e.target.value)}
            slotProps={{ inputLabel: { shrink: true }, input: { inputProps: { min: today } } }}
            fullWidth
          />
          <TextField
            label="Fecha de devolución"
            type="date"
            size="small"
            value={fechaHasta}
            onChange={e => setFechaHasta(e.target.value)}
            slotProps={{ inputLabel: { shrink: true }, input: { inputProps: { min: fechaDesde || today } } }}
            fullWidth
          />
          <Button
            variant="contained"
            size="large"
            onClick={onBuscar}
            disabled={loading || !fechaDesde || !fechaHasta}
            sx={{ bgcolor: '#4f46e5', '&:hover': { bgcolor: '#4338ca' }, whiteSpace: 'nowrap', minWidth: 140, height: 40 }}
          >
            {loading ? <CircularProgress size={18} color="inherit" /> : 'Buscar →'}
          </Button>
        </Stack>
        {fechaDesde && fechaHasta && fechaDesde < fechaHasta && (
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1.5 }}>
            {calcularDias(fechaDesde, fechaHasta)} día{calcularDias(fechaDesde, fechaHasta) !== 1 ? 's' : ''} de alquiler
          </Typography>
        )}
      </Paper>

      {error && <Alert severity="error" sx={{ mb: 3 }}>{error}</Alert>}

      {categorias.length > 0 && (
        <>
          <Typography variant="h6" sx={{ fontWeight: 700, fontFamily: 'Outfit', mb: 2 }}>
            Categorías disponibles
          </Typography>
          <Grid container spacing={3}>
            {categorias.map(item => (
              <Grid key={item.categoria.id} size={{ xs: 12, sm: 6, md: 4 }}>
                <Card
                  variant="outlined"
                  sx={{ borderRadius: 3, cursor: 'pointer', transition: 'all .2s', '&:hover': { boxShadow: 4, borderColor: '#4f46e5' } }}
                >
                  <CardActionArea onClick={() => onSeleccionarCategoria(item)}>
                    {item.vehiculos[0]?.foto_url && (
                      <CardMedia
                        component="img"
                        height={160}
                        image={item.vehiculos[0].foto_url}
                        alt={item.categoria.nombre}
                        sx={{ objectFit: 'cover' }}
                      />
                    )}
                    {!item.vehiculos[0]?.foto_url && (
                      <Box sx={{ height: 160, bgcolor: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <DirectionsCar sx={{ fontSize: 64, color: '#cbd5e1' }} />
                      </Box>
                    )}
                    <CardContent sx={{ p: 2.5 }}>
                      <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'flex-start', mb: 0.5 }}>
                        <Typography variant="h6" sx={{ fontWeight: 700, fontFamily: 'Outfit' }}>
                          {item.categoria.nombre}
                        </Typography>
                        <Chip label={`${item.vehiculos.length} disponible${item.vehiculos.length !== 1 ? 's' : ''}`} size="small" color="success" />
                      </Stack>
                      {item.categoria.descripcion && (
                        <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5, lineHeight: 1.4 }}>
                          {item.categoria.descripcion}
                        </Typography>
                      )}
                      <Divider sx={{ my: 1.5 }} />
                      {item.precio_por_dia > 0 ? (
                        <>
                          <Typography variant="body2" color="text.secondary">Desde</Typography>
                          <Typography sx={{ fontWeight: 800, fontSize: '1.25rem', color: '#4f46e5', fontFamily: 'Outfit' }}>
                            {formatARS(item.precio_por_dia)}
                            <Typography component="span" variant="body2" color="text.secondary" sx={{ fontWeight: 400 }}> / día</Typography>
                          </Typography>
                          <Typography variant="body2" sx={{ color: '#059669', fontWeight: 600, mt: 0.3 }}>
                            Total {item.dias} días: {formatARS(item.precio_total)}
                          </Typography>
                        </>
                      ) : (
                        <Typography variant="body2" color="text.secondary">Precio a consultar</Typography>
                      )}
                    </CardContent>
                  </CardActionArea>
                </Card>
              </Grid>
            ))}
          </Grid>
        </>
      )}

      {!loading && categorias.length === 0 && fechaDesde && fechaHasta && (
        <Paper variant="outlined" sx={{ p: 5, textAlign: 'center', borderRadius: 3, color: 'text.secondary' }}>
          <DirectionsCar sx={{ fontSize: 56, mb: 1.5, opacity: 0.25 }} />
          <Typography variant="h6" sx={{ fontWeight: 600 }}>Sin disponibilidad</Typography>
          <Typography variant="body2" sx={{ mt: 0.5 }}>No hay vehículos disponibles para las fechas seleccionadas. Probá con otras fechas.</Typography>
        </Paper>
      )}
    </Box>
  );
}

// ─── PASO 2: Vehículo ─────────────────────────────────────────────────────────
function Paso2Vehiculo({
  categoria, vehiculos, coberturas, adicionales,
  selectedVehiculo, setSelectedVehiculo,
  selectedCoberturas, setSelectedCoberturas,
  selectedAdicionales, setSelectedAdicionales,
  onBack, onNext,
}: {
  categoria: CategoriaDisponible;
  vehiculos: VehiculoCard[];
  coberturas: Servicio[]; adicionales: Servicio[];
  selectedVehiculo: VehiculoCard | null; setSelectedVehiculo: (v: VehiculoCard) => void;
  selectedCoberturas: string[]; setSelectedCoberturas: (ids: string[]) => void;
  selectedAdicionales: string[]; setSelectedAdicionales: (ids: string[]) => void;
  onBack: () => void; onNext: () => void;
}) {
  function toggleCobertura(id: string) {
    setSelectedCoberturas(selectedCoberturas.includes(id)
      ? selectedCoberturas.filter(x => x !== id)
      : [...selectedCoberturas, id]);
  }
  function toggleAdicional(id: string) {
    setSelectedAdicionales(selectedAdicionales.includes(id)
      ? selectedAdicionales.filter(x => x !== id)
      : [...selectedAdicionales, id]);
  }

  return (
    <Box>
      <Stack direction="row" sx={{ alignItems: 'center', mb: 3, gap: 1 }}>
        <IconButton onClick={onBack} size="small"><ArrowBack /></IconButton>
        <Typography variant="h6" sx={{ fontWeight: 700, fontFamily: 'Outfit' }}>
          Categoría {categoria.categoria.nombre}
        </Typography>
      </Stack>

      <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 1.5 }}>Seleccioná tu vehículo</Typography>
      <Grid container spacing={2} sx={{ mb: 4 }}>
        {vehiculos.map(v => {
          const selected = selectedVehiculo?.id === v.id;
          return (
            <Grid key={v.id} size={{ xs: 12, sm: 6, md: 4 }}>
              <Card
                variant="outlined"
                onClick={() => setSelectedVehiculo(v)}
                sx={{
                  borderRadius: 2.5, cursor: 'pointer', transition: 'all .2s',
                  border: selected ? '2px solid #4f46e5' : '1px solid #e2e8f0',
                  boxShadow: selected ? '0 0 0 3px rgba(79,70,229,.12)' : 'none',
                  '&:hover': { borderColor: '#4f46e5' },
                }}
              >
                {v.foto_url ? (
                  <CardMedia component="img" height={140} image={v.foto_url} alt={v.modelo} sx={{ objectFit: 'cover' }} />
                ) : (
                  <Box sx={{ height: 140, bgcolor: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <DirectionsCar sx={{ fontSize: 56, color: '#cbd5e1' }} />
                  </Box>
                )}
                <CardContent sx={{ p: 2 }}>
                  <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'center' }}>
                    <Box>
                      <Typography sx={{ fontWeight: 700, lineHeight: 1.2 }}>{v.marca} {v.modelo}</Typography>
                      <Typography variant="body2" color="text.secondary">{v.anio} · {v.color}</Typography>
                    </Box>
                    {selected && <CheckCircleOutlined sx={{ color: '#4f46e5', fontSize: 24 }} />}
                  </Stack>
                  <Stack direction="row" spacing={1} sx={{ mt: 1 }}>
                    <Chip icon={<SpeedOutlined />} label={`${v.km_actual.toLocaleString('es-AR')} km`} size="small" variant="outlined" />
                    <Chip label={v.patente} size="small" sx={{ fontFamily: 'monospace', fontWeight: 700, letterSpacing: 1 }} />
                  </Stack>
                </CardContent>
              </Card>
            </Grid>
          );
        })}
      </Grid>

      {coberturas.length > 0 && (
        <>
          <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 1.5 }}>Coberturas</Typography>
          <Paper variant="outlined" sx={{ borderRadius: 2, mb: 3, overflow: 'hidden' }}>
            {coberturas.map((cob, i) => (
              <Box key={cob.id} sx={{ px: 2, py: 1.5, borderBottom: i < coberturas.length - 1 ? '1px solid #f1f5f9' : 'none' }}>
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={selectedCoberturas.includes(cob.id)}
                      onChange={() => toggleCobertura(cob.id)}
                      sx={{ color: '#4f46e5', '&.Mui-checked': { color: '#4f46e5' } }}
                    />
                  }
                  label={
                    <Box>
                      <Stack direction="row" sx={{ gap: 1, alignItems: 'center' }}>
                        <Typography variant="body2" sx={{ fontWeight: 600 }}>{cob.nombre}</Typography>
                        <Typography variant="body2" sx={{ color: cob.precio_por_dia === 0 ? '#059669' : '#4f46e5', fontWeight: 600 }}>
                          {cob.precio_por_dia === 0 ? 'Incluida' : `+ ${formatARS(cob.precio_por_dia)}/día`}
                        </Typography>
                      </Stack>
                      {cob.descripcion && (
                        <Typography variant="caption" color="text.secondary">{cob.descripcion}</Typography>
                      )}
                    </Box>
                  }
                  sx={{ width: '100%', m: 0 }}
                />
              </Box>
            ))}
          </Paper>
        </>
      )}

      {adicionales.length > 0 && (
        <>
          <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 1.5 }}>Adicionales opcionales</Typography>
          <Paper variant="outlined" sx={{ borderRadius: 2, mb: 3, overflow: 'hidden' }}>
            {adicionales.map((add, i) => (
              <Box key={add.id} sx={{ px: 2, py: 1.5, borderBottom: i < adicionales.length - 1 ? '1px solid #f1f5f9' : 'none' }}>
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={selectedAdicionales.includes(add.id)}
                      onChange={() => toggleAdicional(add.id)}
                      sx={{ color: '#4f46e5', '&.Mui-checked': { color: '#4f46e5' } }}
                    />
                  }
                  label={
                    <Box>
                      <Stack direction="row" sx={{ gap: 1, alignItems: 'center' }}>
                        <Typography variant="body2" sx={{ fontWeight: 600 }}>{add.nombre}</Typography>
                        <Typography variant="body2" sx={{ color: '#4f46e5', fontWeight: 600 }}>
                          + {formatARS(add.precio_por_dia)}/día
                        </Typography>
                      </Stack>
                      {add.descripcion && (
                        <Typography variant="caption" color="text.secondary">{add.descripcion}</Typography>
                      )}
                    </Box>
                  }
                  sx={{ width: '100%', m: 0 }}
                />
              </Box>
            ))}
          </Paper>
        </>
      )}

      <Button
        variant="contained"
        endIcon={<ArrowForward />}
        onClick={onNext}
        disabled={!selectedVehiculo}
        sx={{ bgcolor: '#4f46e5', '&:hover': { bgcolor: '#4338ca' } }}
        size="large"
        fullWidth
      >
        Continuar con {selectedVehiculo ? `${selectedVehiculo.marca} ${selectedVehiculo.modelo}` : 'vehículo seleccionado'}
      </Button>
    </Box>
  );
}

// ─── PASO 3: Pasajero ─────────────────────────────────────────────────────────
function Paso3Pasajero({
  lugarEntrega, setLugarEntrega,
  lugarDevolucion, setLugarDevolucion,
  numeroVuelo, setNumeroVuelo,
  codigoDescuento, setCodigoDescuento,
  descuentoValidado, setDescuentoValidado,
  onBack, onSubmit,
}: {
  lugarEntrega: string; setLugarEntrega: (v: string) => void;
  lugarDevolucion: string; setLugarDevolucion: (v: string) => void;
  numeroVuelo: string; setNumeroVuelo: (v: string) => void;
  codigoDescuento: string; setCodigoDescuento: (v: string) => void;
  descuentoValidado: { pct: number } | null;
  setDescuentoValidado: (v: { pct: number } | null) => void;
  onBack: () => void;
  onSubmit: (data: PasajeroForm) => void;
}) {
  const [validandoCodigo, setValidandoCodigo] = React.useState(false);
  const [errorCodigo, setErrorCodigo] = React.useState('');

  const { register, handleSubmit, formState: { errors } } = useForm<PasajeroForm>({
    resolver: zodResolver(pasajeroSchema),
  });

  async function handleValidarCodigo() {
    if (!codigoDescuento.trim()) return;
    setValidandoCodigo(true);
    setErrorCodigo('');
    try {
      const result = await validarCodigoDescuento(codigoDescuento);
      if (result) {
        setDescuentoValidado(result);
      } else {
        setErrorCodigo('Código inválido o expirado');
        setDescuentoValidado(null);
      }
    } finally {
      setValidandoCodigo(false);
    }
  }

  const labelStyle = { fontWeight: 600, fontSize: 13, color: '#374151', mb: 0.5, display: 'block' };

  return (
    <Box component="form" onSubmit={handleSubmit(onSubmit)}>
      <Stack direction="row" sx={{ alignItems: 'center', mb: 3, gap: 1 }}>
        <IconButton onClick={onBack} size="small"><ArrowBack /></IconButton>
        <Typography variant="h6" sx={{ fontWeight: 700, fontFamily: 'Outfit' }}>Datos del conductor</Typography>
      </Stack>

      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid size={{ xs: 12, sm: 6 }}>
          <Typography sx={labelStyle}>Nombre *</Typography>
          <TextField size="small" fullWidth {...register('nombre')} error={!!errors.nombre} helperText={errors.nombre?.message} />
        </Grid>
        <Grid size={{ xs: 12, sm: 6 }}>
          <Typography sx={labelStyle}>Apellido *</Typography>
          <TextField size="small" fullWidth {...register('apellido')} error={!!errors.apellido} helperText={errors.apellido?.message} />
        </Grid>
        <Grid size={{ xs: 12, sm: 6 }}>
          <Typography sx={labelStyle}>Email *</Typography>
          <TextField size="small" fullWidth type="email" {...register('email')} error={!!errors.email} helperText={errors.email?.message} />
        </Grid>
        <Grid size={{ xs: 12, sm: 6 }}>
          <Typography sx={labelStyle}>Teléfono *</Typography>
          <TextField size="small" fullWidth {...register('telefono')} placeholder="+54 9 11..." error={!!errors.telefono} helperText={errors.telefono?.message} />
        </Grid>
        <Grid size={{ xs: 12, sm: 6 }}>
          <Typography sx={labelStyle}>DNI / Pasaporte *</Typography>
          <TextField size="small" fullWidth {...register('dni_pasaporte')} error={!!errors.dni_pasaporte} helperText={errors.dni_pasaporte?.message} />
        </Grid>
        <Grid size={{ xs: 12, sm: 6 }}>
          <Typography sx={labelStyle}>Licencia de conducir *</Typography>
          <TextField size="small" fullWidth {...register('licencia_conducir')} error={!!errors.licencia_conducir} helperText={errors.licencia_conducir?.message} />
        </Grid>
        <Grid size={{ xs: 12, sm: 6 }}>
          <Typography sx={labelStyle}>Ciudad *</Typography>
          <TextField size="small" fullWidth {...register('ciudad')} error={!!errors.ciudad} helperText={errors.ciudad?.message} />
        </Grid>
        <Grid size={{ xs: 12, sm: 6 }}>
          <Typography sx={labelStyle}>País *</Typography>
          <TextField size="small" fullWidth {...register('pais')} defaultValue="Argentina" error={!!errors.pais} helperText={errors.pais?.message} />
        </Grid>
      </Grid>

      <Divider sx={{ my: 3 }} />
      <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 2, fontFamily: 'Outfit' }}>Entrega y devolución</Typography>

      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid size={{ xs: 12, sm: 6 }}>
          <FormControl size="small" fullWidth>
            <InputLabel>Lugar de entrega *</InputLabel>
            <Select value={lugarEntrega} label="Lugar de entrega *" onChange={e => setLugarEntrega(e.target.value)}>
              {LUGARES.map(l => <MenuItem key={l} value={l}>{l}</MenuItem>)}
            </Select>
          </FormControl>
        </Grid>
        <Grid size={{ xs: 12, sm: 6 }}>
          <FormControl size="small" fullWidth>
            <InputLabel>Lugar de devolución *</InputLabel>
            <Select value={lugarDevolucion} label="Lugar de devolución *" onChange={e => setLugarDevolucion(e.target.value)}>
              {LUGARES.map(l => <MenuItem key={l} value={l}>{l}</MenuItem>)}
            </Select>
          </FormControl>
        </Grid>
        {(lugarEntrega === 'Aeropuerto' || lugarDevolucion === 'Aeropuerto') && (
          <Grid size={{ xs: 12 }}>
            <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
              <FlightTakeoff sx={{ color: '#4f46e5', fontSize: 20 }} />
              <TextField
                size="small"
                fullWidth
                label="Número de vuelo"
                value={numeroVuelo}
                onChange={e => setNumeroVuelo(e.target.value)}
                placeholder="Ej: AR1234"
              />
            </Stack>
          </Grid>
        )}
      </Grid>

      <Divider sx={{ my: 3 }} />
      <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 2, fontFamily: 'Outfit' }}>
        <DiscountOutlined sx={{ fontSize: 18, mr: 0.5, verticalAlign: 'middle' }} />
        Código de descuento
      </Typography>
      <Stack direction="row" spacing={1.5} sx={{ mb: 1 }}>
        <TextField
          size="small"
          placeholder="Ej: PROMO20"
          value={codigoDescuento}
          onChange={e => { setCodigoDescuento(e.target.value.toUpperCase()); setDescuentoValidado(null); setErrorCodigo(''); }}
          sx={{ maxWidth: 200 }}
          slotProps={{ input: { style: { fontFamily: 'monospace', letterSpacing: 2, fontWeight: 700 } } }}
        />
        <Button variant="outlined" onClick={handleValidarCodigo} disabled={validandoCodigo || !codigoDescuento.trim()}>
          {validandoCodigo ? <CircularProgress size={16} /> : 'Aplicar'}
        </Button>
      </Stack>
      {errorCodigo && <Alert severity="error" sx={{ mb: 1 }}>{errorCodigo}</Alert>}
      {descuentoValidado && (
        <Alert severity="success" icon={<CheckCircleOutlined />} sx={{ mb: 1 }}>
          ¡Código aplicado! Descuento adicional del {descuentoValidado.pct}%
        </Alert>
      )}

      <Box sx={{ mt: 4 }}>
        <Button
          type="submit"
          variant="contained"
          endIcon={<ArrowForward />}
          disabled={!lugarEntrega || !lugarDevolucion}
          sx={{ bgcolor: '#4f46e5', '&:hover': { bgcolor: '#4338ca' } }}
          size="large"
          fullWidth
        >
          Continuar al pago
        </Button>
      </Box>
    </Box>
  );
}

// ─── PASO 4: Pago ─────────────────────────────────────────────────────────────
function Paso4Pago({
  precios, categoriaSeleccionada, vehiculoSeleccionado, fechaDesde, fechaHasta,
  lugarEntrega, lugarDevolucion, descuentoOnlinePct, descuentoCodigoPct,
  coberturas, adicionales, selectedCoberturas, selectedAdicionales,
  procesando, error, onBack, onPagarDestino, onPagarOnline,
}: {
  precios: Precios;
  categoriaSeleccionada: CategoriaDisponible;
  vehiculoSeleccionado: VehiculoCard;
  fechaDesde: string; fechaHasta: string;
  lugarEntrega: string; lugarDevolucion: string;
  descuentoOnlinePct: number; descuentoCodigoPct: number;
  coberturas: Servicio[]; adicionales: Servicio[];
  selectedCoberturas: string[]; selectedAdicionales: string[];
  procesando: boolean; error: string;
  onBack: () => void;
  onPagarDestino: () => void;
  onPagarOnline: () => void;
}) {
  const dias = calcularDias(fechaDesde, fechaHasta);
  const preciosOnline = calcularPrecios({
    precioPorDia: categoriaSeleccionada.precio_por_dia,
    dias, coberturas, adicionales, selectedCoberturas, selectedAdicionales,
    descuentoOnlinePct, descuentoCodigoPct, payOnline: true,
  });

  return (
    <Box>
      <Stack direction="row" sx={{ alignItems: 'center', mb: 3, gap: 1 }}>
        <IconButton onClick={onBack} size="small" disabled={procesando}><ArrowBack /></IconButton>
        <Typography variant="h6" sx={{ fontWeight: 700, fontFamily: 'Outfit' }}>Resumen y pago</Typography>
      </Stack>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      <Grid container spacing={3}>
        {/* Resumen */}
        <Grid size={{ xs: 12, md: 7 }}>
          <Paper variant="outlined" sx={{ borderRadius: 3, p: 3, mb: 2 }}>
            <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 2, textTransform: 'uppercase', letterSpacing: 1, color: 'text.secondary' }}>
              Detalle de la reserva
            </Typography>
            <Stack spacing={1.5}>
              <Stack direction="row" sx={{ justifyContent: 'space-between' }}>
                <Typography variant="body2" color="text.secondary">Vehículo</Typography>
                <Typography variant="body2" sx={{ fontWeight: 600 }}>{vehiculoSeleccionado.marca} {vehiculoSeleccionado.modelo}</Typography>
              </Stack>
              <Stack direction="row" sx={{ justifyContent: 'space-between' }}>
                <Typography variant="body2" color="text.secondary">Categoría</Typography>
                <Typography variant="body2" sx={{ fontWeight: 600 }}>{categoriaSeleccionada.categoria.nombre}</Typography>
              </Stack>
              <Stack direction="row" sx={{ justifyContent: 'space-between' }}>
                <Typography variant="body2" color="text.secondary">Período</Typography>
                <Typography variant="body2" sx={{ fontWeight: 600 }}>
                  {new Date(fechaDesde + 'T12:00:00').toLocaleDateString('es-AR', { day: '2-digit', month: 'short' })} →{' '}
                  {new Date(fechaHasta + 'T12:00:00').toLocaleDateString('es-AR', { day: '2-digit', month: 'short' })}
                  {' '}({dias} día{dias !== 1 ? 's' : ''})
                </Typography>
              </Stack>
              <Stack direction="row" sx={{ justifyContent: 'space-between' }}>
                <Typography variant="body2" color="text.secondary">Entrega</Typography>
                <Stack direction="row" sx={{ gap: 0.5, alignItems: 'center' }}>
                  <LocationOn sx={{ fontSize: 14, color: '#4f46e5' }} />
                  <Typography variant="body2" sx={{ fontWeight: 600 }}>{lugarEntrega}</Typography>
                </Stack>
              </Stack>
              <Stack direction="row" sx={{ justifyContent: 'space-between' }}>
                <Typography variant="body2" color="text.secondary">Devolución</Typography>
                <Stack direction="row" sx={{ gap: 0.5, alignItems: 'center' }}>
                  <LocationOn sx={{ fontSize: 14, color: '#64748b' }} />
                  <Typography variant="body2" sx={{ fontWeight: 600 }}>{lugarDevolucion}</Typography>
                </Stack>
              </Stack>
            </Stack>

            <Divider sx={{ my: 2 }} />

            <Stack spacing={1}>
              <Stack direction="row" sx={{ justifyContent: 'space-between' }}>
                <Typography variant="body2" color="text.secondary">
                  {formatARS(categoriaSeleccionada.precio_por_dia)} × {dias} días
                </Typography>
                <Typography variant="body2">{formatARS(precios.base)}</Typography>
              </Stack>
              {precios.coberturas > 0 && (
                <Stack direction="row" sx={{ justifyContent: 'space-between' }}>
                  <Typography variant="body2" color="text.secondary">Coberturas</Typography>
                  <Typography variant="body2">+ {formatARS(precios.coberturas)}</Typography>
                </Stack>
              )}
              {precios.adicionales > 0 && (
                <Stack direction="row" sx={{ justifyContent: 'space-between' }}>
                  <Typography variant="body2" color="text.secondary">Adicionales</Typography>
                  <Typography variant="body2">+ {formatARS(precios.adicionales)}</Typography>
                </Stack>
              )}
              {descuentoCodigoPct > 0 && (
                <Stack direction="row" sx={{ justifyContent: 'space-between' }}>
                  <Typography variant="body2" color="text.secondary">Descuento código</Typography>
                  <Typography variant="body2" sx={{ color: '#059669' }}>− {formatARS(precios.descCodigo)}</Typography>
                </Stack>
              )}
              <Divider />
              <Stack direction="row" sx={{ justifyContent: 'space-between' }}>
                <Typography sx={{ fontWeight: 700 }}>Total sin descuento online</Typography>
                <Typography sx={{ fontWeight: 700, fontSize: '1.1rem' }}>{formatARS(precios.total)}</Typography>
              </Stack>
            </Stack>
          </Paper>
        </Grid>

        {/* Botones de pago */}
        <Grid size={{ xs: 12, md: 5 }}>
          {/* Pagar online */}
          <Paper sx={{ borderRadius: 3, p: 3, mb: 2, background: 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)', color: '#fff' }}>
            <Typography sx={{ fontWeight: 700, fontSize: '1rem', mb: 0.5 }}>
              Pagar con Mercado Pago
            </Typography>
            <Typography sx={{ fontSize: 13, opacity: 0.85, mb: 2 }}>
              {descuentoOnlinePct}% de descuento pagando online
            </Typography>
            <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <Box>
                <Typography sx={{ fontSize: 12, opacity: 0.75, textDecoration: 'line-through' }}>
                  {formatARS(precios.total)}
                </Typography>
                <Typography sx={{ fontWeight: 800, fontSize: '1.4rem', fontFamily: 'Outfit' }}>
                  {formatARS(preciosOnline.total)}
                </Typography>
              </Box>
              <Chip label={`-${descuentoOnlinePct}%`} size="small" sx={{ bgcolor: '#22c55e', color: '#fff', fontWeight: 700 }} />
            </Stack>
            <Button
              variant="contained"
              fullWidth
              onClick={onPagarOnline}
              disabled={procesando}
              sx={{
                bgcolor: '#fff', color: '#4f46e5', fontWeight: 700,
                '&:hover': { bgcolor: '#f1f5f9' },
                '&:disabled': { bgcolor: 'rgba(255,255,255,.5)' },
              }}
              size="large"
            >
              {procesando ? <CircularProgress size={20} color="inherit" /> : `Pagar ${formatARS(preciosOnline.total)} →`}
            </Button>
          </Paper>

          {/* Pagar en destino */}
          <Paper variant="outlined" sx={{ borderRadius: 3, p: 3 }}>
            <Typography sx={{ fontWeight: 700, fontSize: '1rem', mb: 0.5 }}>Pagar en destino</Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Sin descuento. Abonás al retirar el vehículo.
            </Typography>
            <Typography sx={{ fontWeight: 700, fontSize: '1.3rem', fontFamily: 'Outfit', mb: 2 }}>
              {formatARS(precios.total)}
            </Typography>
            <Button
              variant="outlined"
              fullWidth
              onClick={onPagarDestino}
              disabled={procesando}
              sx={{ borderColor: '#4f46e5', color: '#4f46e5', fontWeight: 600 }}
              size="large"
            >
              {procesando ? <CircularProgress size={20} /> : 'Reservar y pagar en destino'}
            </Button>
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
}

// ─── MAIN ─────────────────────────────────────────────────────────────────────
export default function ReservarClient({
  initialDesde, initialHasta, coberturas, adicionales,
  descuentoOnlinePct, tenantNombre,
}: Props) {
  const router = useRouter();
  const [step, setStep] = React.useState(0);

  // Paso 1
  const [fechaDesde, setFechaDesde] = React.useState(initialDesde);
  const [fechaHasta, setFechaHasta] = React.useState(initialHasta);
  const [categorias, setCategorias] = React.useState<CategoriaDisponible[]>([]);
  const [buscando, setBuscando] = React.useState(false);
  const [errorBuscar, setErrorBuscar] = React.useState('');

  // Paso 2
  const [categoriaSeleccionada, setCategoriaSeleccionada] = React.useState<CategoriaDisponible | null>(null);
  const [vehiculoSeleccionado, setVehiculoSeleccionado] = React.useState<VehiculoCard | null>(null);
  const [selectedCoberturas, setSelectedCoberturas] = React.useState<string[]>([]);
  const [selectedAdicionales, setSelectedAdicionales] = React.useState<string[]>([]);

  // Paso 3
  const [lugarEntrega, setLugarEntrega] = React.useState('');
  const [lugarDevolucion, setLugarDevolucion] = React.useState('');
  const [numeroVuelo, setNumeroVuelo] = React.useState('');
  const [codigoDescuento, setCodigoDescuento] = React.useState('');
  const [descuentoValidado, setDescuentoValidado] = React.useState<{ pct: number } | null>(null);
  const [pasajeroData, setPasajeroData] = React.useState<PasajeroForm | null>(null);

  // Paso 4
  const [procesando, setProcesando] = React.useState(false);
  const [errorPago, setErrorPago] = React.useState('');

  async function buscarDisponibilidad() {
    if (!fechaDesde || !fechaHasta || fechaDesde >= fechaHasta) {
      setErrorBuscar('Seleccioná fechas válidas (la devolución debe ser posterior a la entrega)');
      return;
    }
    setBuscando(true);
    setErrorBuscar('');
    try {
      const res = await fetch(`/api/reservas/disponibilidad?desde=${fechaDesde}&hasta=${fechaHasta}`);
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? 'Error al buscar disponibilidad');
      setCategorias(json.data ?? []);
    } catch (err) {
      setErrorBuscar(err instanceof Error ? err.message : 'Error al buscar');
    } finally {
      setBuscando(false);
    }
  }

  // Auto-search on mount if dates are provided
  React.useEffect(() => {
    if (initialDesde && initialHasta && initialDesde < initialHasta) {
      buscarDisponibilidad();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function handleSeleccionarCategoria(c: CategoriaDisponible) {
    setCategoriaSeleccionada(c);
    setVehiculoSeleccionado(null);
    setSelectedCoberturas([]);
    setSelectedAdicionales([]);
    setStep(1);
  }

  function handlePaso2Siguiente() {
    if (!vehiculoSeleccionado) return;
    setStep(2);
  }

  function handlePaso3Submit(data: PasajeroForm) {
    setPasajeroData(data);
    setStep(3);
  }

  const dias = calcularDias(fechaDesde, fechaHasta);
  const precios = categoriaSeleccionada
    ? calcularPrecios({
        precioPorDia: categoriaSeleccionada.precio_por_dia,
        dias, coberturas, adicionales, selectedCoberturas, selectedAdicionales,
        descuentoOnlinePct: 0, descuentoCodigoPct: descuentoValidado?.pct ?? 0, payOnline: false,
      })
    : { base: 0, descOnline: 0, descCodigo: 0, coberturas: 0, adicionales: 0, total: 0 };

  async function buildReservaInput(payOnline: boolean) {
    if (!categoriaSeleccionada || !vehiculoSeleccionado || !pasajeroData) throw new Error('Datos incompletos');
    const p = calcularPrecios({
      precioPorDia: categoriaSeleccionada.precio_por_dia,
      dias, coberturas, adicionales, selectedCoberturas, selectedAdicionales,
      descuentoOnlinePct, descuentoCodigoPct: descuentoValidado?.pct ?? 0, payOnline,
    });
    return {
      vehiculoId: vehiculoSeleccionado.id,
      vehiculoModelo: `${vehiculoSeleccionado.marca} ${vehiculoSeleccionado.modelo}`,
      fechaDesde, fechaHasta,
      ...pasajeroData,
      lugarEntrega, lugarDevolucion, numeroVuelo,
      codigoDescuento: descuentoValidado ? codigoDescuento : null,
      precioBase: p.base,
      descuentoAplicado: p.descOnline + p.descCodigo,
      precioCoberturas: p.coberturas,
      precioAdicionales: p.adicionales,
      precioTotal: p.total,
    };
  }

  async function handlePagarDestino() {
    setProcesando(true);
    setErrorPago('');
    try {
      const input = await buildReservaInput(false);
      const { id, numero } = await crearReserva(input);
      router.push(`/confirmacion?reserva=${id}&numero=${numero}`);
    } catch (err) {
      setErrorPago(err instanceof Error ? err.message : 'Error al crear reserva');
      setProcesando(false);
    }
  }

  async function handlePagarOnline() {
    setProcesando(true);
    setErrorPago('');
    try {
      const input = await buildReservaInput(true);
      const { id, numero } = await crearReserva(input);

      const prefRes = await fetch('/api/mercadopago/preference', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reservaId: id,
          numero,
          vehiculoModelo: input.vehiculoModelo,
          precioTotal: input.precioTotal,
        }),
      });
      const prefJson = await prefRes.json();
      if (!prefRes.ok) throw new Error(prefJson.error ?? 'Error al procesar pago');
      window.location.href = prefJson.init_point;
    } catch (err) {
      setErrorPago(err instanceof Error ? err.message : 'Error al procesar pago');
      setProcesando(false);
    }
  }

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: '#f8fafc' }}>
      {/* Header */}
      <Box sx={{ bgcolor: '#fff', borderBottom: '1px solid #e2e8f0', px: 3, py: 2 }}>
        <Container maxWidth="lg" sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Stack direction="row" sx={{ alignItems: 'center', gap: 1, cursor: 'pointer' }} onClick={() => router.push('/')}>
            <Box sx={{ width: 32, height: 32, borderRadius: '8px', background: 'linear-gradient(135deg, #4f46e5, #06b6d4)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <DirectionsCar sx={{ color: '#fff', fontSize: 18 }} />
            </Box>
            <Typography sx={{ fontWeight: 800, fontFamily: 'Outfit', fontSize: '1.1rem' }}>{tenantNombre}</Typography>
          </Stack>
          <Button variant="text" startIcon={<ArrowBack />} onClick={() => router.push('/')} sx={{ color: 'text.secondary' }}>
            Volver
          </Button>
        </Container>
      </Box>

      <Container maxWidth="lg" sx={{ py: 4 }}>
        {/* Stepper */}
        <Paper variant="outlined" sx={{ borderRadius: 3, p: 3, mb: 4 }}>
          <Stepper activeStep={step} alternativeLabel>
            {PASOS.map(label => (
              <Step key={label}>
                <StepLabel sx={{ '& .MuiStepLabel-label': { fontFamily: 'Outfit', fontWeight: 600 } }}>{label}</StepLabel>
              </Step>
            ))}
          </Stepper>
        </Paper>

        {step === 0 && (
          <Paso1Buscar
            fechaDesde={fechaDesde} fechaHasta={fechaHasta}
            setFechaDesde={setFechaDesde} setFechaHasta={setFechaHasta}
            categorias={categorias} loading={buscando} error={errorBuscar}
            onBuscar={buscarDisponibilidad}
            onSeleccionarCategoria={handleSeleccionarCategoria}
          />
        )}

        {step === 1 && categoriaSeleccionada && (
          <Paso2Vehiculo
            categoria={categoriaSeleccionada}
            vehiculos={categoriaSeleccionada.vehiculos}
            coberturas={coberturas} adicionales={adicionales}
            selectedVehiculo={vehiculoSeleccionado} setSelectedVehiculo={setVehiculoSeleccionado}
            selectedCoberturas={selectedCoberturas} setSelectedCoberturas={setSelectedCoberturas}
            selectedAdicionales={selectedAdicionales} setSelectedAdicionales={setSelectedAdicionales}
            onBack={() => setStep(0)} onNext={handlePaso2Siguiente}
          />
        )}

        {step === 2 && (
          <Paso3Pasajero
            lugarEntrega={lugarEntrega} setLugarEntrega={setLugarEntrega}
            lugarDevolucion={lugarDevolucion} setLugarDevolucion={setLugarDevolucion}
            numeroVuelo={numeroVuelo} setNumeroVuelo={setNumeroVuelo}
            codigoDescuento={codigoDescuento} setCodigoDescuento={setCodigoDescuento}
            descuentoValidado={descuentoValidado} setDescuentoValidado={setDescuentoValidado}
            onBack={() => setStep(1)} onSubmit={handlePaso3Submit}
          />
        )}

        {step === 3 && categoriaSeleccionada && vehiculoSeleccionado && (
          <Paso4Pago
            precios={precios}
            categoriaSeleccionada={categoriaSeleccionada}
            vehiculoSeleccionado={vehiculoSeleccionado}
            fechaDesde={fechaDesde} fechaHasta={fechaHasta}
            lugarEntrega={lugarEntrega} lugarDevolucion={lugarDevolucion}
            descuentoOnlinePct={descuentoOnlinePct}
            descuentoCodigoPct={descuentoValidado?.pct ?? 0}
            coberturas={coberturas} adicionales={adicionales}
            selectedCoberturas={selectedCoberturas} selectedAdicionales={selectedAdicionales}
            procesando={procesando} error={errorPago}
            onBack={() => setStep(2)}
            onPagarDestino={handlePagarDestino}
            onPagarOnline={handlePagarOnline}
          />
        )}
      </Container>
    </Box>
  );
}
