'use client';

import * as React from 'react';
import {
  Box,
  Typography,
  IconButton,
  Breadcrumbs,
  Link,
  TextField,
} from '@mui/material';
import {
  Notifications,
  Settings,
  Person,
  Home,
  Menu as MenuIcon,
} from '@mui/icons-material';
import { usePathname } from 'next/navigation';

const SEGMENT_NAMES: Record<string, string> = {
  dashboard: 'Dashboard',
  calendario: 'Calendario',
  reservas: 'Reservas',
  vehiculos: 'Vehículos',
  clientes: 'Clientes',
  tarifas: 'Tarifas',
  agenda: 'Agenda Diaria',
  reportes: 'Reportes',
  usuarios: 'Usuarios',
  configuracion: 'Configuración',
};

interface HeaderProps {
  onMenuClick: () => void;
}

export default function Header({ onMenuClick }: HeaderProps) {
  const pathname = usePathname();
  const segment = pathname.split('/').filter(Boolean).pop() ?? '';
  const displayName = SEGMENT_NAMES[segment] ?? 'Dashboard';

  return (
    <Box
      sx={{
        height: 'auto',
        backgroundColor: 'transparent',
        pt: { xs: 1.5, md: 3 },
        pb: 1.5,
        px: { xs: 1.5, sm: 2, md: 3, lg: 4 },
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexShrink: 0,
        gap: 1,
      }}
    >
      {/* Hamburger — solo visible en xs/sm/md */}
      <IconButton
        onClick={onMenuClick}
        size="small"
        sx={{
          display: { xs: 'flex', lg: 'none' },
          color: '#344767',
          mr: 0.5,
          flexShrink: 0,
        }}
      >
        <MenuIcon />
      </IconButton>

      {/* Title & breadcrumbs */}
      <Box sx={{ display: 'flex', flexDirection: 'column', flexGrow: 1, minWidth: 0 }}>
        <Breadcrumbs
          aria-label="breadcrumb"
          separator="/"
          sx={{
            '& .MuiBreadcrumbs-separator': {
              color: '#7b809a',
              fontSize: '0.85rem',
              mx: 0.5,
            },
          }}
        >
          <Link
            underline="none"
            color="inherit"
            href="/dashboard"
            sx={{
              display: 'flex',
              alignItems: 'center',
              color: '#7b809a',
              transition: 'color 0.2s',
              '&:hover': { color: '#344767' },
            }}
          >
            <Home sx={{ fontSize: 18, mr: 0.5 }} />
          </Link>
          <Typography
            sx={{
              fontSize: '0.825rem',
              fontWeight: 500,
              color: '#344767',
              textTransform: 'capitalize',
            }}
          >
            {segment || 'dashboard'}
          </Typography>
        </Breadcrumbs>
        <Typography
          variant="h6"
          component="h1"
          sx={{
            fontWeight: 700,
            color: '#344767',
            fontFamily: '"Outfit", "Inter", sans-serif',
            mt: 0.5,
            fontSize: '1.25rem',
          }}
        >
          {displayName}
        </Typography>
      </Box>

      {/* Quick actions (Search & Icon Actions) */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flexShrink: 0 }}>
        {/* Minimalist Search Input — oculto en mobile */}
        <TextField
          placeholder="Search here"
          size="small"
          sx={{
            display: { xs: 'none', md: 'flex' },
            '& .MuiOutlinedInput-root': {
              borderRadius: '8px',
              backgroundColor: '#ffffff',
              height: '36px',
              width: '180px',
              fontSize: '0.75rem',
              '& fieldset': {
                borderColor: '#d2d6da',
              },
              '&:hover fieldset': {
                borderColor: '#b0b5b9',
              },
              '&.Mui-focused fieldset': {
                borderColor: '#1A73E8',
                borderWidth: '1.5px',
              },
            },
            '& .MuiInputBase-input': {
              padding: '8px 12px',
              color: '#495057',
              '&::placeholder': {
                color: '#7b809a',
                opacity: 1,
              },
            },
          }}
        />

        {/* Action icons block */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
          <IconButton
            size="small"
            sx={{
              color: '#7b809a',
              p: 1,
              transition: 'color 0.2s',
              '&:hover': { color: '#344767' },
            }}
          >
            <Person sx={{ fontSize: 18 }} />
          </IconButton>
          
          <IconButton
            size="small"
            sx={{
              color: '#7b809a',
              p: 1,
              transition: 'color 0.2s',
              '&:hover': { color: '#344767' },
            }}
          >
            <Settings sx={{ fontSize: 18 }} />
          </IconButton>

          <IconButton
            size="small"
            sx={{
              color: '#7b809a',
              p: 1,
              transition: 'color 0.2s',
              '&:hover': { color: '#344767' },
            }}
          >
            <Notifications sx={{ fontSize: 18 }} />
          </IconButton>
        </Box>
      </Box>
    </Box>
  );
}
