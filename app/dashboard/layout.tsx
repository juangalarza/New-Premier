'use client';

import * as React from 'react';
import { Box } from '@mui/material';
import Sidebar from '@/components/admin/Sidebar';
import Header from '@/components/admin/Header';

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [sidebarOpen, setSidebarOpen] = React.useState(false);

  return (
    <Box
      sx={{
        display: 'flex',
        width: '100vw',
        height: '100vh',
        overflow: 'hidden',
        backgroundColor: '#f8fafc',
      }}
    >
      {/* Navigation Sidebar — permanent on lg+, Drawer temporal en mobile/tablet */}
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      {/* Main Administrative Workspace */}
      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
          flexGrow: 1,
          height: '100%',
          overflow: 'hidden',
          minWidth: 0,
        }}
      >
        {/* Workspace Sticky Header */}
        <Header onMenuClick={() => setSidebarOpen(true)} />

        {/* Dynamic page content scroll slot */}
        <Box
          component="main"
          sx={{
            flexGrow: 1,
            overflowY: 'auto',
            p: { xs: 1.5, sm: 2, md: 3, lg: 4 },
            backgroundColor: '#f8fafc',
          }}
        >
          {children}
        </Box>
      </Box>
    </Box>
  );
}
