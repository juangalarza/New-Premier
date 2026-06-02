'use client';

import * as React from 'react';
import {
  Box, Container, Typography, Button, Stack, TextField, Paper, Grid,
  Divider,
} from '@mui/material';
import {
  DirectionsCar, ArrowForward, AdminPanelSettingsOutlined,
  VerifiedOutlined, SupportAgentOutlined, CreditCardOutlined,
  FlightTakeoffOutlined,
} from '@mui/icons-material';
import { useRouter } from 'next/navigation';

function getToday() {
  return new Date().toISOString().split('T')[0];
}
function getTomorrow() {
  return new Date(Date.now() + 2 * 86400000).toISOString().split('T')[0];
}

export default function LandingPage() {
  const router = useRouter();
  const [fechaDesde, setFechaDesde] = React.useState(getToday());
  const [fechaHasta, setFechaHasta] = React.useState(getTomorrow());

  function handleBuscar() {
    if (!fechaDesde || !fechaHasta) return;
    router.push(`/reservar?desde=${fechaDesde}&hasta=${fechaHasta}`);
  }

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: '#fff' }}>
      {/* Header */}
      <Box sx={{ borderBottom: '1px solid #f1f5f9', bgcolor: '#fff', position: 'sticky', top: 0, zIndex: 100 }}>
        <Container maxWidth="lg" sx={{ py: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Stack direction="row" sx={{ alignItems: 'center', gap: 1.5 }}>
            <Box sx={{
              width: 36, height: 36, borderRadius: '10px',
              background: 'linear-gradient(135deg, #4f46e5, #06b6d4)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <DirectionsCar sx={{ color: '#fff', fontSize: 20 }} />
            </Box>
            <Typography sx={{ fontWeight: 800, fontFamily: 'Outfit', fontSize: '1.2rem', color: '#1e293b' }}>
              Finda Car Rental
            </Typography>
          </Stack>
          <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
            <Button
              variant="text"
              size="small"
              onClick={() => router.push('/dashboard')}
              startIcon={<AdminPanelSettingsOutlined />}
              sx={{ color: '#94a3b8', fontSize: 12 }}
            >
              Admin
            </Button>
            <Button
              variant="contained"
              size="small"
              onClick={handleBuscar}
              sx={{ bgcolor: '#4f46e5', '&:hover': { bgcolor: '#4338ca' }, fontWeight: 700 }}
            >
              Reservar ahora
            </Button>
          </Stack>
        </Container>
      </Box>

      {/* Hero */}
      <Box sx={{
        background: 'linear-gradient(160deg, #f8faff 0%, #eef2ff 50%, #f0fdf4 100%)',
        py: { xs: 6, md: 10 },
      }}>
        <Container maxWidth="lg">
          <Grid container spacing={5} sx={{ alignItems: 'center' }}>
            <Grid size={{ xs: 12, md: 6 }}>
              <Typography variant="h2" component="h1" sx={{
                fontWeight: 900, fontFamily: 'Outfit', lineHeight: 1.1,
                color: '#1e293b', mb: 2, fontSize: { xs: '2.2rem', md: '3rem' },
              }}>
                Alquilá tu auto<br />
                <Box component="span" sx={{ color: '#4f46e5' }}>en minutos</Box>
              </Typography>
              <Typography variant="h6" sx={{ color: '#64748b', mb: 4, fontWeight: 400, lineHeight: 1.6 }}>
                Elegí tus fechas, seleccioná el vehículo ideal y abonás online o al retirar. Sin sorpresas, sin complicaciones.
              </Typography>

              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} sx={{ alignItems: 'flex-end' }}>
                <Box>
                  <Typography variant="caption" sx={{ fontWeight: 600, color: '#64748b', mb: 0.5, display: 'block' }}>
                    Fecha de entrega
                  </Typography>
                  <TextField
                    type="date"
                    size="small"
                    value={fechaDesde}
                    onChange={e => setFechaDesde(e.target.value)}
                    slotProps={{
                      inputLabel: { shrink: true },
                      input: { inputProps: { min: getToday() } },
                    }}
                    sx={{ bgcolor: '#fff', borderRadius: 2, '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
                  />
                </Box>
                <Box>
                  <Typography variant="caption" sx={{ fontWeight: 600, color: '#64748b', mb: 0.5, display: 'block' }}>
                    Fecha de devolución
                  </Typography>
                  <TextField
                    type="date"
                    size="small"
                    value={fechaHasta}
                    onChange={e => setFechaHasta(e.target.value)}
                    slotProps={{
                      inputLabel: { shrink: true },
                      input: { inputProps: { min: fechaDesde || getToday() } },
                    }}
                    sx={{ bgcolor: '#fff', borderRadius: 2, '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
                  />
                </Box>
                <Button
                  variant="contained"
                  size="large"
                  endIcon={<ArrowForward />}
                  onClick={handleBuscar}
                  sx={{
                    bgcolor: '#4f46e5', '&:hover': { bgcolor: '#4338ca' },
                    fontWeight: 700, fontFamily: 'Outfit', px: 3,
                    borderRadius: 2, height: 40,
                  }}
                >
                  Buscar
                </Button>
              </Stack>
            </Grid>

            <Grid size={{ xs: 12, md: 6 }}>
              <Box sx={{ position: 'relative' }}>
                <Box
                  component="img"
                  src="https://images.unsplash.com/photo-1533473359331-0135ef1b58bf?auto=format&fit=crop&q=80&w=700"
                  alt="Flota de vehículos"
                  sx={{ width: '100%', borderRadius: 4, boxShadow: '0 24px 48px rgba(79,70,229,.15)' }}
                />
                <Paper sx={{
                  position: 'absolute', bottom: -20, left: -20,
                  p: 2, borderRadius: 3, boxShadow: '0 8px 24px rgba(0,0,0,.1)',
                  display: { xs: 'none', md: 'flex' }, alignItems: 'center', gap: 1.5,
                }}>
                  <VerifiedOutlined sx={{ color: '#4f46e5', fontSize: 28 }} />
                  <Box>
                    <Typography sx={{ fontWeight: 700, fontSize: 14 }}>Vehículos verificados</Typography>
                    <Typography variant="caption" color="text.secondary">Flota mantenida y asegurada</Typography>
                  </Box>
                </Paper>
              </Box>
            </Grid>
          </Grid>
        </Container>
      </Box>

      {/* Features strip */}
      <Box sx={{ bgcolor: '#4f46e5', py: 2.5 }}>
        <Container maxWidth="lg">
          <Stack
            direction={{ xs: 'column', sm: 'row' }}
            spacing={{ xs: 2, sm: 0 }}
            divider={<Divider orientation="vertical" flexItem sx={{ bgcolor: 'rgba(255,255,255,.2)' }} />}
            sx={{ justifyContent: 'space-around', alignItems: 'center' }}
          >
            {[
              { icon: <FlightTakeoffOutlined />, text: 'Entrega en aeropuerto' },
              { icon: <CreditCardOutlined />, text: '20% OFF pagando online' },
              { icon: <SupportAgentOutlined />, text: 'Atención 24/7' },
              { icon: <VerifiedOutlined />, text: 'Seguro incluido' },
            ].map(item => (
              <Stack key={item.text} direction="row" spacing={1} sx={{ alignItems: 'center', color: '#fff' }}>
                {React.cloneElement(item.icon, { sx: { fontSize: 20, opacity: 0.85 } } as object)}
                <Typography sx={{ fontWeight: 600, fontSize: 14 }}>{item.text}</Typography>
              </Stack>
            ))}
          </Stack>
        </Container>
      </Box>

      {/* Fleet preview */}
      <Box sx={{ py: 8, bgcolor: '#fff' }}>
        <Container maxWidth="lg">
          <Box sx={{ textAlign: 'center', mb: 5 }}>
            <Typography variant="h4" sx={{ fontWeight: 800, fontFamily: 'Outfit', mb: 1, color: '#1e293b' }}>
              Nuestra flota
            </Typography>
            <Typography color="text.secondary">Vehículos de todas las categorías para cada necesidad</Typography>
          </Box>

          <Grid container spacing={3}>
            {[
              {
                nombre: 'Económico',
                desc: 'Sedanes y hatchbacks compactos. Ideales para ciudad.',
                img: 'https://images.unsplash.com/photo-1549399542-7e3f8b79c341?auto=format&fit=crop&q=80&w=600',
                precio: '$25.000',
              },
              {
                nombre: 'SUV / Camionetas',
                desc: 'Vehículos familiares para todo tipo de terreno.',
                img: 'https://images.unsplash.com/photo-1533473359331-0135ef1b58bf?auto=format&fit=crop&q=80&w=600',
                precio: '$48.000',
              },
              {
                nombre: 'Ejecutivo',
                desc: 'Sedanes premium de alta gama. Máximo confort.',
                img: 'https://images.unsplash.com/photo-1590362891991-f776e747a588?auto=format&fit=crop&q=80&w=600',
                precio: '$38.000',
              },
            ].map(cat => (
              <Grid key={cat.nombre} size={{ xs: 12, sm: 4 }}>
                <Paper
                  variant="outlined"
                  sx={{ borderRadius: 3, overflow: 'hidden', cursor: 'pointer', transition: 'all .2s', '&:hover': { boxShadow: 4, borderColor: '#4f46e5' } }}
                  onClick={handleBuscar}
                >
                  <Box
                    component="img"
                    src={cat.img}
                    alt={cat.nombre}
                    sx={{ width: '100%', height: 180, objectFit: 'cover' }}
                  />
                  <Box sx={{ p: 2.5 }}>
                    <Typography sx={{ fontWeight: 700, fontFamily: 'Outfit', mb: 0.5 }}>{cat.nombre}</Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>{cat.desc}</Typography>
                    <Typography sx={{ fontWeight: 800, color: '#4f46e5', fontFamily: 'Outfit' }}>
                      Desde {cat.precio}/día
                    </Typography>
                  </Box>
                </Paper>
              </Grid>
            ))}
          </Grid>

          <Box sx={{ textAlign: 'center', mt: 4 }}>
            <Button
              variant="contained"
              size="large"
              endIcon={<ArrowForward />}
              onClick={handleBuscar}
              sx={{ bgcolor: '#4f46e5', '&:hover': { bgcolor: '#4338ca' }, fontWeight: 700, fontFamily: 'Outfit', px: 4, borderRadius: 2 }}
            >
              Ver disponibilidad
            </Button>
          </Box>
        </Container>
      </Box>

      {/* Footer */}
      <Box sx={{ bgcolor: '#1e293b', color: '#94a3b8', py: 4 }}>
        <Container maxWidth="lg">
          <Stack direction={{ xs: 'column', sm: 'row' }} sx={{ justifyContent: 'space-between', alignItems: 'center', gap: 2 }}>
            <Stack direction="row" sx={{ alignItems: 'center', gap: 1 }}>
              <Box sx={{ width: 28, height: 28, borderRadius: '8px', background: 'linear-gradient(135deg, #4f46e5, #06b6d4)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <DirectionsCar sx={{ color: '#fff', fontSize: 16 }} />
              </Box>
              <Typography sx={{ color: '#fff', fontWeight: 700, fontFamily: 'Outfit' }}>Finda Car Rental Argentina</Typography>
            </Stack>
            <Typography variant="caption">
              © 2026 Finda Car Rental Argentina · Powered by{' '}
              <Box component="span" sx={{ color: '#818cf8', fontWeight: 600 }}>RentaCore</Box>
            </Typography>
          </Stack>
        </Container>
      </Box>
    </Box>
  );
}
