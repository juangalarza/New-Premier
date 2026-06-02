'use server';

import { createAdminClient } from '@/lib/supabase/admin';
import { TENANT_ID } from '@/lib/constants';

export interface MesIngreso {
  mes: string;
  mesNum: number;
  total: number;
  count: number;
}

export interface EstadoStats {
  estado: string;
  count: number;
  total: number;
}

export interface TopVehiculo {
  id: string;
  patente: string;
  modelo: string;
  foto_url: string | null;
  total: number;
  count: number;
}

export interface ReportesData {
  año: number;
  ingresosMensuales: MesIngreso[];
  porEstado: EstadoStats[];
  topVehiculos: TopVehiculo[];
  totalVehiculos: number;
  totalReservas: number;
  totalIngresado: number;
  ingresoPromedioPorReserva: number;
  ocupacionPromedio: number;
}

type ReservaRow = {
  id: string;
  estado: string;
  precio_total: number;
  created_at: string;
  fecha_entrega: string;
  fecha_devolucion: string;
  vehiculo_id: string | null;
};

type TopRow = {
  vehiculo_id: string | null;
  precio_total: number;
  vehiculo: { patente: string; modelo: string; foto_url: string | null } | null;
};

const MESES = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];

export async function getReportesData(año: number): Promise<ReportesData> {
  const supabase = createAdminClient();
  const inicio = `${año}-01-01T00:00:00`;
  const fin = `${año}-12-31T23:59:59`;

  const [reservasRes, vehiculosRes, topRes] = await Promise.all([
    supabase
      .from('reservas')
      .select('id, estado, precio_total, created_at, fecha_entrega, fecha_devolucion, vehiculo_id')
      .eq('tenant_id', TENANT_ID)
      .gte('created_at', inicio)
      .lte('created_at', fin),

    supabase.from('vehiculos').select('id').eq('tenant_id', TENANT_ID),

    supabase
      .from('reservas')
      .select('vehiculo_id, precio_total, vehiculo:vehiculos(patente, modelo, foto_url)')
      .eq('tenant_id', TENANT_ID)
      .eq('estado', 'devuelta')
      .not('vehiculo_id', 'is', null),
  ]);

  const reservas = (reservasRes.data ?? []) as unknown as ReservaRow[];
  const totalVehiculos = vehiculosRes.data?.length ?? 0;

  const ingresosMensuales: MesIngreso[] = MESES.map((mes, i) => ({
    mes,
    mesNum: i + 1,
    total: 0,
    count: 0,
  }));

  const porEstadoMap: Record<string, EstadoStats> = {};

  for (const r of reservas) {
    const month = new Date(r.created_at).getMonth();
    if (r.estado !== 'cancelada') {
      ingresosMensuales[month].total += r.precio_total;
      ingresosMensuales[month].count++;
    }
    porEstadoMap[r.estado] ??= { estado: r.estado, count: 0, total: 0 };
    porEstadoMap[r.estado].count++;
    porEstadoMap[r.estado].total += r.precio_total;
  }

  const topRows = (topRes.data ?? []) as unknown as TopRow[];
  const vehiculosMap: Record<string, TopVehiculo> = {};
  for (const r of topRows) {
    if (!r.vehiculo_id) continue;
    vehiculosMap[r.vehiculo_id] ??= {
      id: r.vehiculo_id,
      patente: r.vehiculo?.patente ?? '',
      modelo: r.vehiculo?.modelo ?? '',
      foto_url: r.vehiculo?.foto_url ?? null,
      total: 0,
      count: 0,
    };
    vehiculosMap[r.vehiculo_id].total += r.precio_total;
    vehiculosMap[r.vehiculo_id].count++;
  }

  const topVehiculos = Object.values(vehiculosMap)
    .sort((a, b) => b.total - a.total)
    .slice(0, 5);

  const activas = reservas.filter(r => r.estado !== 'cancelada');
  const totalIngresado = activas.reduce((s, r) => s + r.precio_total, 0);
  const ingresoPromedioPorReserva = activas.length ? totalIngresado / activas.length : 0;

  const totalDiasOcupados = activas.reduce((s, r) => {
    const dias = Math.ceil(
      (new Date(r.fecha_devolucion).getTime() - new Date(r.fecha_entrega).getTime()) / 86400000
    );
    return s + Math.max(0, dias);
  }, 0);
  const totalDiasDisponibles = totalVehiculos * 365;
  const ocupacionPromedio = totalDiasDisponibles > 0 ? (totalDiasOcupados / totalDiasDisponibles) * 100 : 0;

  return {
    año,
    ingresosMensuales,
    porEstado: Object.values(porEstadoMap),
    topVehiculos,
    totalVehiculos,
    totalReservas: reservas.length,
    totalIngresado,
    ingresoPromedioPorReserva,
    ocupacionPromedio: Math.min(100, Math.round(ocupacionPromedio * 10) / 10),
  };
}
