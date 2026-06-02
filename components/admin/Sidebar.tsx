'use client';

import * as React from 'react';
import {
  Box, List, ListItem, ListItemButton, ListItemIcon,
  ListItemText, Typography, Avatar, IconButton, Tooltip, Divider, Button,
} from '@mui/material';
import {
  DashboardOutlined, CalendarMonthOutlined, DirectionsCarOutlined,
  PeopleAltOutlined, SettingsOutlined, LogoutOutlined, CarRental,
  MonetizationOnOutlined, ReceiptLongOutlined, MenuBookOutlined,
  BarChartOutlined, PeopleOutlined, BuildOutlined,
} from '@mui/icons-material';
import { usePathname, useRouter } from 'next/navigation';
import { supabaseBrowser } from '@/lib/supabase/client';

const NAV_ITEMS = [
  { text: 'Dashboard',     icon: <DashboardOutlined />,     path: '/dashboard' },
  { text: 'Calendario',    icon: <CalendarMonthOutlined />,  path: '/dashboard/calendario' },
  { text: 'Reservas',      icon: <ReceiptLongOutlined />,    path: '/dashboard/reservas' },
  { text: 'Vehículos',     icon: <DirectionsCarOutlined />,  path: '/dashboard/vehiculos' },
  { text: 'Mantenimiento', icon: <BuildOutlined />,          path: '/dashboard/mantenimiento' },
  { text: 'Clientes',      icon: <PeopleAltOutlined />,      path: '/dashboard/clientes' },
  { text: 'Tarifas',       icon: <MonetizationOnOutlined />, path: '/dashboard/tarifas' },
  { text: 'Agenda Diaria', icon: <MenuBookOutlined />,       path: '/dashboard/agenda' },
  { text: 'Reportes',      icon: <BarChartOutlined />,       path: '/dashboard/reportes' },
  { text: 'Usuarios',      icon: <PeopleOutlined />,         path: '/dashboard/usuarios' },
  { text: 'Configuración', icon: <SettingsOutlined />,       path: '/dashboard/configuracion' },
];

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();

  const handleSignOut = async () => {
    try {
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
      if (supabaseUrl && !supabaseUrl.includes('your-project-id')) {
        await supabaseBrowser.auth.signOut();
      }
    } catch (_) {}
    document.cookie = 'rentacore_demo_active=; path=/; expires=Thu, 01 Jan 1970 00:00:01 GMT;';
    router.push('/login');
    router.refresh();
  };

  return (
    <Box
      sx={{
        width: 250,
        height: 'calc(100vh - 32px)',
        flexShrink: 0,
        background: 'linear-gradient(195deg, #42424a 0%, #191919 100%)',
        display: 'flex',
        flexDirection: 'column',
        boxShadow: '0 4px 20px 0 rgba(0,0,0,0.14), 0 7px 10px -5px rgba(0,0,0,0.4)',
        borderRadius: '16px',
        m: 2,
        overflowX: 'hidden',
        transition: 'all 0.3s ease',
      }}
    >
      {/* ── Brand ────────────────────────────────────────── */}
      <Box
        sx={{
          px: 3,
          py: 2.5,
          display: 'flex',
          alignItems: 'center',
          gap: 1.5,
          justifyContent: 'center',
        }}
      >
        <Box
          sx={{
            width: 32,
            height: 32,
            borderRadius: '8px',
            border: '1px solid rgba(255, 255, 255, 0.2)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'rgba(255, 255, 255, 0.05)',
            flexShrink: 0,
          }}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M18 8V5C18 3.89543 17.1046 3 16 3H8C6.89543 3 6 3.89543 6 5V8" stroke="white" strokeWidth="1.5" strokeLinecap="round" />
            <rect x="4" y="8" width="16" height="12" rx="2.5" stroke="white" strokeWidth="1.5" />
            <circle cx="9" cy="12.5" r="1" fill="white" />
            <circle cx="15" cy="12.5" r="1" fill="white" />
            <path d="M9.5 16C10.5 17 13.5 17 14.5 16" stroke="white" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
        </Box>
        <Box sx={{ minWidth: 0 }}>
          <Typography
            sx={{
              fontWeight: 700,
              fontFamily: '"Outfit", "Inter", sans-serif',
              fontSize: '0.875rem',
              color: '#fff',
              lineHeight: 1.2,
              whiteSpace: 'nowrap',
              letterSpacing: '0.02em',
            }}
          >
            RentaCore
          </Typography>
        </Box>
      </Box>
      <Divider sx={{ borderColor: 'rgba(255,255,255,0.12)', mx: 2, mb: 1.5 }} />

      {/* ── Nav ──────────────────────────────────────────── */}
      <Box sx={{ flexGrow: 1, overflowY: 'auto', py: 1, px: 1 }}>
        <List disablePadding sx={{ display: 'flex', flexDirection: 'column', gap: 0.75 }}>
          {NAV_ITEMS.map((item) => {
            const active = item.path === '/dashboard'
              ? pathname === '/dashboard'
              : pathname === item.path || pathname.startsWith(item.path + '/');

            return (
              <ListItem key={item.text} disablePadding>
                <ListItemButton
                  onClick={() => router.push(item.path)}
                  sx={{
                    borderRadius: '8px',
                    py: 1.1,
                    px: 2,
                    mx: 1,
                    transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                    ...(active
                      ? {
                          background: 'linear-gradient(195deg, #49a3f1 0%, #1A73E8 100%)',
                          boxShadow: '0 4px 20px 0 rgba(26,115,232,0.40), 0 7px 10px -5px rgba(26,115,232,0.4)',
                          '&:hover': {
                            background: 'linear-gradient(195deg, #49a3f1 0%, #1A73E8 100%)',
                            boxShadow: '0 5px 22px 0 rgba(26,115,232,0.50)',
                          },
                        }
                      : {
                          background: 'transparent',
                          '&:hover': {
                            background: 'rgba(255,255,255,0.12)',
                          },
                        }),
                  }}
                >
                  <ListItemIcon
                    sx={{
                      minWidth: 32,
                      color: '#ffffff',
                      opacity: active ? 1 : 0.85,
                      transition: 'opacity 0.2s',
                      '& svg': { fontSize: 20 },
                    }}
                  >
                    {item.icon}
                  </ListItemIcon>
                  <ListItemText
                    primary={
                      <Typography
                        sx={{
                          fontSize: '0.85rem',
                          fontWeight: active ? 600 : 300,
                          fontFamily: '"Outfit", "Inter", sans-serif',
                          color: '#ffffff',
                          opacity: active ? 1 : 0.85,
                          letterSpacing: '0.02em',
                        }}
                      >
                        {item.text}
                      </Typography>
                    }
                  />
                </ListItemButton>
              </ListItem>
            );
          })}
        </List>
      </Box>

      {/* ── Upgrade to Pro Button ───────────────────────── */}
      <Box sx={{ px: 2, pt: 1, pb: 1, mt: 'auto' }}>
        <Button
          component="a"
          href="#"
          sx={{
            background: 'linear-gradient(195deg, #49a3f1 0%, #1A73E8 100%)',
            color: '#fff',
            fontWeight: 700,
            fontSize: '0.75rem',
            borderRadius: '8px',
            py: 1.2,
            width: '100%',
            boxShadow: '0 4px 20px 0 rgba(26,115,232,0.40), 0 7px 10px -5px rgba(26,115,232,0.4)',
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'all 0.2s ease',
            '&:hover': {
              background: 'linear-gradient(195deg, #5aafec 0%, #1669d6 100%)',
              boxShadow: '0 5px 22px 0 rgba(26,115,232,0.50)',
              transform: 'translateY(-1px)',
            },
            '&:active': {
              transform: 'translateY(0)',
            },
          }}
        >
          Upgrade to Pro
        </Button>
      </Box>

      {/* ── Divider + User ───────────────────────────────── */}
      <Box sx={{ px: 2, pb: 2, pt: 0.5 }}>
        <Divider sx={{ borderColor: 'rgba(255,255,255,0.12)', mb: 1.5 }} />
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, minWidth: 0 }}>
            <Avatar
              sx={{
                width: 28,
                height: 28,
                bgcolor: '#1A73E8',
                fontSize: '0.7rem',
                fontWeight: 700,
                boxShadow: '0 2px 8px rgba(26,115,232,0.3)',
              }}
            >
              AD
            </Avatar>
            <Box sx={{ minWidth: 0 }}>
              <Typography sx={{ fontWeight: 600, fontSize: '0.75rem', color: '#fff', lineHeight: 1.2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                Admin Demo
              </Typography>
              <Typography sx={{ fontSize: '0.6rem', color: 'rgba(255,255,255,0.45)', lineHeight: 1 }}>
                Personal Admin
              </Typography>
            </Box>
          </Box>
          <Tooltip title="Cerrar sesión" placement="top">
            <IconButton
              onClick={handleSignOut}
              size="small"
              sx={{
                color: 'rgba(255,255,255,0.5)',
                p: 0.5,
                '&:hover': { color: '#f87171', bgcolor: 'rgba(248,113,113,0.1)' },
              }}
            >
              <LogoutOutlined sx={{ fontSize: 16 }} />
            </IconButton>
          </Tooltip>
        </Box>
      </Box>
    </Box>
  );
}
