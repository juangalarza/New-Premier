'use client';

import { Box, Card, CardContent, Typography, Chip } from '@mui/material';
import { TrendingUp, TrendingDown, TrendingFlat } from '@mui/icons-material';

interface KPICardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  delta?: number;
  invertDelta?: boolean;
  icon: React.ReactNode;
  iconBg?: string;
}

export default function KPICard({ title, value, subtitle, delta, invertDelta, icon, iconBg = '#4f46e5' }: KPICardProps) {
  const hasDelta = delta !== undefined;
  const rawPositive = (delta ?? 0) > 0;
  const isPositive = invertDelta ? !rawPositive : rawPositive;
  const isNeutral = delta === 0;

  return (
    <Card sx={{ height: '100%' }}>
      <CardContent sx={{ p: 3 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
          <Box
            sx={{
              width: 44,
              height: 44,
              borderRadius: '12px',
              backgroundColor: `${iconBg}18`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: iconBg,
            }}
          >
            {icon}
          </Box>
          {hasDelta && (
            <Chip
              size="small"
              icon={isNeutral ? <TrendingFlat fontSize="small" /> : isPositive ? <TrendingUp fontSize="small" /> : <TrendingDown fontSize="small" />}
              label={`${isPositive ? '+' : ''}${delta}%`}
              sx={{
                backgroundColor: isNeutral ? '#f1f5f9' : isPositive ? '#dcfce7' : '#fee2e2',
                color: isNeutral ? '#64748b' : isPositive ? '#16a34a' : '#dc2626',
                fontWeight: 600,
                fontSize: '0.75rem',
                '& .MuiChip-icon': { color: 'inherit' },
              }}
            />
          )}
        </Box>
        <Typography variant="h4" sx={{ fontWeight: 800, fontFamily: 'Outfit', color: '#0f172a', mb: 0.5 }}>
          {value}
        </Typography>
        <Typography variant="body2" sx={{ fontWeight: 600, color: '#64748b' }}>
          {title}
        </Typography>
        {subtitle && (
          <Typography variant="caption" sx={{ color: '#94a3b8', display: 'block', mt: 0.5 }}>
            {subtitle}
          </Typography>
        )}
      </CardContent>
    </Card>
  );
}
