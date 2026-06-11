'use client';

import * as React from 'react';
import {
  Box, List, ListItem, ListItemButton, ListItemIcon,
  ListItemText, Typography, Avatar, IconButton, Tooltip, Divider, Drawer,
} from '@mui/material';
import {
  DashboardOutlined, CalendarMonthOutlined, DirectionsCarOutlined,
  PeopleAltOutlined, SettingsOutlined, LogoutOutlined,
  MonetizationOnOutlined, ReceiptLongOutlined, MenuBookOutlined,
  BarChartOutlined, PeopleOutlined, BuildOutlined, StoreOutlined,
  AccountBalanceWalletOutlined,
} from '@mui/icons-material';
import { usePathname, useRouter } from 'next/navigation';
import { supabaseBrowser } from '@/lib/supabase/client';

const NAV_ITEMS = [
  { text: 'Dashboard',     icon: <DashboardOutlined />,     path: '/dashboard' },
  { text: 'Calendario',    icon: <CalendarMonthOutlined />,  path: '/dashboard/calendario' },
  { text: 'Reservas',      icon: <ReceiptLongOutlined />,    path: '/dashboard/reservas' },
  { text: 'Vehículos',     icon: <DirectionsCarOutlined />,  path: '/dashboard/vehiculos' },
  { text: 'Mantenimiento', icon: <BuildOutlined />,          path: '/dashboard/mantenimiento' },
  { text: 'Sucursales',    icon: <StoreOutlined />,          path: '/dashboard/sucursales' },
  { text: 'Clientes',      icon: <PeopleAltOutlined />,      path: '/dashboard/clientes' },
  { text: 'Tarifas',       icon: <MonetizationOnOutlined />, path: '/dashboard/tarifas' },
  { text: 'Caja',          icon: <AccountBalanceWalletOutlined />, path: '/dashboard/caja' },
  { text: 'Agenda Diaria', icon: <MenuBookOutlined />,       path: '/dashboard/agenda' },
  { text: 'Reportes',      icon: <BarChartOutlined />,       path: '/dashboard/reportes' },
  { text: 'Usuarios',      icon: <PeopleOutlined />,         path: '/dashboard/usuarios' },
  { text: 'Configuración', icon: <SettingsOutlined />,       path: '/dashboard/configuracion' },
];

const SIDEBAR_BG = 'linear-gradient(195deg, #42424a 0%, #191919 100%)';

interface SidebarProps {
  open?: boolean;
  onClose?: () => void;
}

export default function Sidebar({ open = false, onClose }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [userInfo, setUserInfo] = React.useState<{ nombre: string; apellido: string; email: string; rol: string } | null>(null);

  React.useEffect(() => {
    supabaseBrowser.auth.getUser().then(async ({ data }) => {
      if (!data.user) return;
      const email = data.user.email ?? '';
      const { data: row } = await supabaseBrowser
        .from('usuarios')
        .select('nombre, apellido, rol')
        .eq('id', data.user.id)
        .single();
      setUserInfo({
        nombre: row?.nombre ?? '',
        apellido: row?.apellido ?? '',
        email,
        rol: row?.rol ?? '',
      });
    });
  }, []);

  const displayName = userInfo
    ? `${userInfo.nombre} ${userInfo.apellido}`.trim() || userInfo.email
    : '…';
  const initials = userInfo
    ? `${userInfo.nombre[0] ?? ''}${userInfo.apellido[0] ?? ''}`.toUpperCase() || '?'
    : '?';

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

  // Contenido compartido entre desktop y mobile
  const content = (
    <>
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
                  onClick={() => { router.push(item.path); onClose?.(); }}
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

      {/* ── Divider + User ───────────────────────────────── */}
      <Box sx={{ px: 2, pb: 2, pt: 0.5 }}>
        <Divider sx={{ borderColor: 'rgba(255,255,255,0.12)', mb: 1.5 }} />
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
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
              {initials}
            </Avatar>
            <Box sx={{ minWidth: 0 }}>
              <Typography sx={{ fontWeight: 600, fontSize: '0.75rem', color: '#fff', lineHeight: 1.2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {displayName}
              </Typography>
              <Typography sx={{ fontSize: '0.6rem', color: 'rgba(255,255,255,0.45)', lineHeight: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', textTransform: 'capitalize' }}>
                {userInfo?.rol ?? ''}
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
    </>
  );

  return (
    <>
      {/* Desktop lg+: sidebar flotante permanente */}
      <Box
        sx={{
          display: { xs: 'none', lg: 'flex' },
          width: 250,
          height: 'calc(100vh - 32px)',
          flexShrink: 0,
          background: SIDEBAR_BG,
          flexDirection: 'column',
          boxShadow: '0 4px 20px 0 rgba(0,0,0,0.14), 0 7px 10px -5px rgba(0,0,0,0.4)',
          borderRadius: '16px',
          m: 2,
          overflowX: 'hidden',
          transition: 'all 0.3s ease',
        }}
      >
        {content}
      </Box>

      {/* Mobile/tablet xs–md: Drawer temporal con hamburger */}
      <Drawer
        variant="temporary"
        open={open}
        onClose={onClose}
        ModalProps={{ keepMounted: true }}
        sx={{
          display: { lg: 'none' },
          '& .MuiDrawer-paper': {
            width: 250,
            background: SIDEBAR_BG,
            display: 'flex',
            flexDirection: 'column',
            overflowX: 'hidden',
            border: 'none',
          },
        }}
      >
        {content}
      </Drawer>
    </>
  );
}
