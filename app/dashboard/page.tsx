export const dynamic = 'force-dynamic';

import { Box, Grid } from '@mui/material';
import {
  AttachMoneyOutlined,
  DirectionsCarOutlined,
  CheckCircleOutlined,
  SpeedOutlined,
  TrendingDownOutlined,
} from '@mui/icons-material';
import KPICard from '@/components/admin/KPICard';
import DashboardCharts from './DashboardCharts';
import { getKPIs, getChartData, getRanking, getEntregasHoy, getDevolucionesHoy, getCategorias, getUltimosGastos } from './actions';

function formatARS(value: number) {
  return new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(value);
}

function calcDelta(actual: number, anterior: number): number {
  if (anterior === 0) return 0;
  return Math.round(((actual - anterior) / anterior) * 100);
}

export default async function DashboardPage() {
  const [kpis, chartData, ranking, entregas, devoluciones, categorias, ultimosGastos] = await Promise.all([
    getKPIs(),
    getChartData(),
    getRanking(),
    getEntregasHoy(),
    getDevolucionesHoy(),
    getCategorias(),
    getUltimosGastos(),
  ]);

  const delta = calcDelta(kpis.ingresosMes, kpis.ingresosMesAnterior);
  const deltaGastos = calcDelta(kpis.gastosMes, kpis.gastosMesAnterior);
  const balanceNeto = kpis.ingresosMes - kpis.gastosMes;

  return (
    <Box>
      {/* KPI Cards */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid size={{ xs: 12, sm: 6, md: 'grow' }}>
          <KPICard
            title="Ingresos del mes"
            value={formatARS(kpis.ingresosMes)}
            subtitle={`Balance neto: ${formatARS(balanceNeto)}`}
            delta={delta}
            icon={<AttachMoneyOutlined />}
            iconBg="#4f46e5"
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 'grow' }}>
          <KPICard
            title="Gastos del mes"
            value={formatARS(kpis.gastosMes)}
            subtitle={`Mes anterior: ${formatARS(kpis.gastosMesAnterior)}`}
            delta={deltaGastos}
            invertDelta
            icon={<TrendingDownOutlined />}
            iconBg="#ef4444"
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 'grow' }}>
          <KPICard
            title="Flota total"
            value={kpis.totalVehiculos}
            subtitle={`${kpis.vehiculosPropios} propios · ${kpis.vehiculosNoPropios} no propios`}
            icon={<DirectionsCarOutlined />}
            iconBg="#0ea5e9"
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 'grow' }}>
          <KPICard
            title="Disponibles"
            value={`${kpis.disponibles} / ${kpis.totalVehiculos}`}
            subtitle={`${kpis.alquilados} en alquiler ahora`}
            icon={<CheckCircleOutlined />}
            iconBg="#2dd4a0"
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 'grow' }}>
          <KPICard
            title="Ocupación"
            value={`${kpis.ocupacionPct}%`}
            subtitle="Vehículos actualmente alquilados"
            icon={<SpeedOutlined />}
            iconBg="#f5a623"
          />
        </Grid>
      </Grid>

      {/* Charts + Ranking */}
      <DashboardCharts
        chartData={chartData}
        ranking={ranking}
        entregas={entregas}
        devoluciones={devoluciones}
        categorias={categorias}
        ultimosGastos={ultimosGastos}
      />
    </Box>
  );
}
