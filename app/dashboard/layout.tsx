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
  return (
    <Box
      sx={{
        display: 'flex',
        width: '100vw',
        height: '100vh',
        overflow: 'hidden',
        backgroundColor: '#f8fafc', // Slate 50 background
      }}
    >
      {/* Fixed Navigation Sidebar */}
      <Sidebar />

      {/* Main Administrative Workspace */}
      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
          flexGrow: 1,
          height: '100%',
          overflow: 'hidden',
        }}
      >
        {/* Workspace Sticky Header */}
        <Header />

        {/* Dynamic page content scroll slot */}
        <Box
          component="main"
          sx={{
            flexGrow: 1,
            overflowY: 'auto',
            p: 4,
            backgroundColor: '#f8fafc',
          }}
        >
          {children}
        </Box>
      </Box>
    </Box>
  );
}
