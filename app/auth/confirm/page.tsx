'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { Box, CircularProgress, Typography } from '@mui/material';
import { supabaseBrowser } from '@/lib/supabase/client';

export default function AuthConfirmPage() {
  const router = useRouter();
  const [msg, setMsg] = React.useState('Verificando tu acceso...');

  React.useEffect(() => {
    const hash = window.location.hash.substring(1);
    const params = new URLSearchParams(hash);
    const accessToken  = params.get('access_token');
    const refreshToken = params.get('refresh_token');

    if (!accessToken || !refreshToken) {
      setMsg('Link inválido o expirado. Redirigiendo...');
      setTimeout(() => router.replace('/login?error=invalid_link'), 2000);
      return;
    }

    supabaseBrowser.auth
      .setSession({ access_token: accessToken, refresh_token: refreshToken })
      .then(({ error }) => {
        if (error) {
          setMsg('No se pudo establecer la sesión. Redirigiendo...');
          setTimeout(() => router.replace('/login?error=session_failed'), 2000);
        } else {
          router.replace('/dashboard');
        }
      });
  }, [router]);

  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 2.5,
        background: 'radial-gradient(circle at 10% 20%, rgba(99,102,241,.15) 0%, transparent 45%), radial-gradient(circle at 90% 80%, rgba(6,182,212,.15) 0%, transparent 45%), #090d16',
      }}
    >
      <Box
        sx={{
          width: 56, height: 56, borderRadius: '16px',
          background: 'linear-gradient(135deg, #4f46e5 0%, #06b6d4 100%)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: '0 8px 24px rgba(79,70,229,.35)',
          mb: 1,
        }}
      >
        <CircularProgress size={28} thickness={4} sx={{ color: '#fff' }} />
      </Box>
      <Typography sx={{ color: 'rgba(255,255,255,.75)', fontFamily: 'Outfit', fontSize: '0.95rem' }}>
        {msg}
      </Typography>
    </Box>
  );
}
