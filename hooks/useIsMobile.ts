'use client';

import { useTheme, useMediaQuery } from '@mui/material';

/** true en xs y sm (0–899px) */
export function useIsMobile() {
  const theme = useTheme();
  return useMediaQuery(theme.breakpoints.down('md'));
}

/** true solo en md (900–1199px) */
export function useIsTablet() {
  const theme = useTheme();
  return useMediaQuery(theme.breakpoints.between('md', 'lg'));
}
