'use client';

import * as React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { 
  Box, 
  Button, 
  Card, 
  CardContent, 
  TextField, 
  Typography, 
  Alert, 
  CircularProgress,
  IconButton,
  InputAdornment,
  Container
} from '@mui/material';
import { 
  Visibility, 
  VisibilityOff, 
  CarRental,
  LockOutlined,
  EmailOutlined,
  AdminPanelSettingsOutlined
} from '@mui/icons-material';
import { useRouter, useSearchParams } from 'next/navigation';
import { supabaseBrowser } from '@/lib/supabase/client';

// Schema for login validation using Zod
const loginSchema = z.object({
  email: z.string().min(1, 'El correo electrónico es requerido').email('Escriba un correo electrónico válido'),
  password: z.string().min(6, 'La contraseña debe tener al menos 6 caracteres'),
});

type LoginFields = z.infer<typeof loginSchema>;

function LoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [showPassword, setShowPassword] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  // Check if we are forced into demo_mode
  const isDemoParam = searchParams.get('demo_mode') === 'true';

  const { register, handleSubmit, formState: { errors } } = useForm<LoginFields>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: isDemoParam ? 'admin@rentacore.com' : '',
      password: isDemoParam ? 'admin123' : '',
    }
  });

  const onSubmit = async (data: LoginFields) => {
    setIsSubmitting(true);
    setError(null);

    try {
      // 1. Try standard Supabase Auth
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
      const isPlaceholder = !supabaseUrl || supabaseUrl.includes('your-project-id');

      if (!isPlaceholder) {
        const { error: authError } = await supabaseBrowser.auth.signInWithPassword({
          email: data.email,
          password: data.password,
        });

        if (!authError) {
          // Clear demo cookies just in case
          document.cookie = 'rentacore_demo_active=; path=/; expires=Thu, 01 Jan 1970 00:00:01 GMT;';
          router.push('/dashboard');
          router.refresh();
          return;
        }

        // If auth fails, we fall back to check if it's a dev evaluation or if they want to enter demo mode
        if (authError.message !== 'Invalid login credentials') {
          setError(authError.message);
          setIsSubmitting(false);
          return;
        }
      }

      // 2. Local Demo Bypass — solo cuando no hay Supabase configurado o se pide explícitamente
      if (isPlaceholder || isDemoParam) {
        if (data.email === 'admin@rentacore.com' && data.password === 'admin123') {
          const d = new Date();
          d.setTime(d.getTime() + (24 * 60 * 60 * 1000));
          document.cookie = `rentacore_demo_active=true; path=/; expires=${d.toUTCString()};`;
          router.push('/dashboard');
          router.refresh();
          return;
        } else {
          setError('Credenciales incorrectas. Para el modo demo, use: admin@rentacore.com / admin123');
        }
      } else {
        setError('Credenciales de inicio de sesión no válidas.');
      }
    } catch (e: any) {
      setError(e.message || 'Ha ocurrido un error inesperado');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleTogglePassword = () => setShowPassword(!showPassword);

  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'radial-gradient(circle at 10% 20%, rgba(99, 102, 241, 0.15) 0%, transparent 45%), radial-gradient(circle at 90% 80%, rgba(6, 182, 212, 0.15) 0%, transparent 45%), #090d16',
        position: 'relative',
        overflow: 'hidden',
        py: 4,
      }}
    >
      {/* Background elements to create depth */}
      <Box
        sx={{
          position: 'absolute',
          width: '500px',
          height: '500px',
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(79, 70, 229, 0.08) 0%, transparent 70%)',
          top: '-10%',
          left: '-5%',
          zIndex: 0,
        }}
      />
      <Box
        sx={{
          position: 'absolute',
          width: '600px',
          height: '600px',
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(6, 182, 212, 0.08) 0%, transparent 70%)',
          bottom: '-10%',
          right: '-5%',
          zIndex: 0,
        }}
      />

      <Container maxWidth="sm" sx={{ zIndex: 1, position: 'relative' }}>
        <Card
          sx={{
            background: 'rgba(255, 255, 255, 0.03)',
            backdropFilter: 'blur(16px)',
            border: '1px solid rgba(255, 255, 255, 0.07)',
            borderRadius: '24px',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
            overflow: 'visible',
          }}
        >
          <CardContent sx={{ p: { xs: 4, md: 6 } }}>
            {/* Logo area */}
            <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', mb: 5 }}>
              <Box
                sx={{
                  width: 64,
                  height: 64,
                  borderRadius: '16px',
                  background: 'linear-gradient(135deg, #4f46e5 0%, #06b6d4 100%)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: '0 8px 24px rgba(79, 70, 229, 0.3)',
                  mb: 2,
                  transform: 'rotate(-5deg)',
                  transition: 'transform 0.3s ease',
                  '&:hover': {
                    transform: 'rotate(0deg) scale(1.05)',
                  }
                }}
              >
                <CarRental sx={{ fontSize: 36, color: '#ffffff' }} />
              </Box>
              <Typography 
                variant="h4" 
                component="h1" 
                sx={{ 
                  fontWeight: 800, 
                  color: '#ffffff', 
                  fontFamily: 'Outfit',
                  background: 'linear-gradient(135deg, #ffffff 30%, #a5b4fc 100%)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                }}
              >
                RentaCore
              </Typography>
              <Typography variant="body2" sx={{ color: 'rgba(255, 255, 255, 0.5)', mt: 0.5 }}>
                Sistema de Gestión Integral Rent-A-Car
              </Typography>
            </Box>

            {/* Error alerts */}
            {error && (
              <Alert 
                severity="error" 
                variant="filled"
                sx={{ 
                  mb: 4, 
                  borderRadius: '12px',
                  backgroundColor: 'rgba(239, 68, 68, 0.15)',
                  color: '#f87171',
                  border: '1px solid rgba(239, 68, 68, 0.25)',
                  boxShadow: 'none',
                  '& .MuiAlert-icon': {
                    color: '#f87171'
                  }
                }}
              >
                {error}
              </Alert>
            )}

            {isDemoParam && (
              <Alert 
                severity="info" 
                variant="filled"
                sx={{ 
                  mb: 4, 
                  borderRadius: '12px',
                  backgroundColor: 'rgba(6, 182, 212, 0.1)',
                  color: '#22d3ee',
                  border: '1px solid rgba(6, 182, 212, 0.2)',
                  boxShadow: 'none',
                  '& .MuiAlert-icon': {
                    color: '#22d3ee'
                  }
                }}
                icon={<AdminPanelSettingsOutlined />}
              >
                Modo Demo Activado. Use las credenciales preestablecidas para ingresar y evaluar la interfaz.
              </Alert>
            )}

            {/* Form */}
            <form onSubmit={handleSubmit(onSubmit)} noValidate>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3.5 }}>
                <TextField
                  fullWidth
                  label="Correo Electrónico"
                  type="email"
                  variant="outlined"
                  {...register('email')}
                  error={!!errors.email}
                  helperText={errors.email?.message}
                  slotProps={{
                    input: {
                      startAdornment: (
                        <InputAdornment position="start">
                          <EmailOutlined sx={{ color: 'rgba(255, 255, 255, 0.35)' }} />
                        </InputAdornment>
                      ),
                    }
                  }}
                  sx={{
                    '& .MuiOutlinedInput-root': {
                      color: '#ffffff',
                      backgroundColor: 'rgba(255, 255, 255, 0.02)',
                      border: '1px solid rgba(255, 255, 255, 0.08)',
                      transition: 'all 0.2s',
                      '& fieldset': { border: 'none' },
                      '&:hover': {
                        backgroundColor: 'rgba(255, 255, 255, 0.04)',
                        border: '1px solid rgba(255, 255, 255, 0.15)',
                      },
                      '&.Mui-focused': {
                        backgroundColor: 'rgba(255, 255, 255, 0.05)',
                        border: '1px solid #4f46e5',
                        boxShadow: '0 0 12px rgba(79, 70, 229, 0.25)',
                      },
                    },
                    '& .MuiInputLabel-root': {
                      color: 'rgba(255, 255, 255, 0.45)',
                      '&.Mui-focused': {
                        color: '#818cf8',
                      },
                    },
                    '& .MuiFormHelperText-root': {
                      color: '#f87171',
                    }
                  }}
                />

                <TextField
                  fullWidth
                  label="Contraseña"
                  type={showPassword ? 'text' : 'password'}
                  variant="outlined"
                  {...register('password')}
                  error={!!errors.password}
                  helperText={errors.password?.message}
                  slotProps={{
                    input: {
                      startAdornment: (
                        <InputAdornment position="start">
                          <LockOutlined sx={{ color: 'rgba(255, 255, 255, 0.35)' }} />
                        </InputAdornment>
                      ),
                      endAdornment: (
                        <InputAdornment position="end">
                          <IconButton
                            onClick={handleTogglePassword}
                            edge="end"
                            sx={{ color: 'rgba(255, 255, 255, 0.35)' }}
                          >
                            {showPassword ? <VisibilityOff /> : <Visibility />}
                          </IconButton>
                        </InputAdornment>
                      ),
                    }
                  }}
                  sx={{
                    '& .MuiOutlinedInput-root': {
                      color: '#ffffff',
                      backgroundColor: 'rgba(255, 255, 255, 0.02)',
                      border: '1px solid rgba(255, 255, 255, 0.08)',
                      transition: 'all 0.2s',
                      '& fieldset': { border: 'none' },
                      '&:hover': {
                        backgroundColor: 'rgba(255, 255, 255, 0.04)',
                        border: '1px solid rgba(255, 255, 255, 0.15)',
                      },
                      '&.Mui-focused': {
                        backgroundColor: 'rgba(255, 255, 255, 0.05)',
                        border: '1px solid #4f46e5',
                        boxShadow: '0 0 12px rgba(79, 70, 229, 0.25)',
                      },
                    },
                    '& .MuiInputLabel-root': {
                      color: 'rgba(255, 255, 255, 0.45)',
                      '&.Mui-focused': {
                        color: '#818cf8',
                      },
                    },
                    '& .MuiFormHelperText-root': {
                      color: '#f87171',
                    }
                  }}
                />

                <Button
                  fullWidth
                  size="large"
                  type="submit"
                  disabled={isSubmitting}
                  variant="contained"
                  sx={{
                    py: 1.8,
                    borderRadius: '10px',
                    fontSize: '1rem',
                    fontWeight: 600,
                    boxShadow: '0 4px 18px rgba(79, 70, 229, 0.25)',
                    '&:hover': {
                      boxShadow: '0 6px 22px rgba(79, 70, 229, 0.35)',
                    }
                  }}
                >
                  {isSubmitting ? (
                    <CircularProgress size={24} sx={{ color: '#ffffff' }} />
                  ) : (
                    'Iniciar Sesión'
                  )}
                </Button>
              </Box>
            </form>

          </CardContent>
        </Card>
      </Container>
    </Box>
  );
}

export default function LoginPage() {
  return (
    <React.Suspense fallback={
      <Box
        sx={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#090d16',
        }}
      >
        <CircularProgress sx={{ color: '#4f46e5' }} />
      </Box>
    }>
      <LoginContent />
    </React.Suspense>
  );
}
