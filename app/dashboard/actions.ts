'use server';

import { createAdminClient } from '@/lib/supabase/admin';
import { TENANT_ID } from '@/lib/constants';
import type { DashboardKPIs, ChartDataItem, RankingVehiculo, EntregaHoy } from '@/types';

export async function getKPIs(): Promise<DashboardKPIs> {
  const supabase = createAdminClient();
  const now = new Date();
  const inicioMes = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
  const inicioMesAnterior = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString();
  const finMesAnterior = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59).toISOString();

  const [ingresosRes, ingresosMesAntRes, vehiculosRes] = await Promise.all([
    supabase
      .from('reservas')
      .select('total_pagado')
      .eq('tenant_id', TENANT_ID)
      .gte('created_at', inicioMes),

    supabase
      .from('reservas')
      .select('total_pagado')
      .eq('tenant_id', TENANT_ID)
      .gte('created_at', inicioMesAnterior)
      .lte('created_at', finMesAnterior),

    supabase
      .from('vehiculos')
      .select('estado, es_propio')
      .eq('tenant_id', TENANT_ID),
  ]);

  type IngresoRow = { total_pagado: number };
  type VehEstRow = { estado: string; es_propio: boolean };
  const ingresosMes = ((ingresosRes.data ?? []) as unknown as IngresoRow[]).reduce((s, r) => s + (r.total_pagado ?? 0), 0);
  const ingresosMesAnterior = ((ingresosMesAntRes.data ?? []) as unknown as IngresoRow[]).reduce((s, r) => s + (r.total_pagado ?? 0), 0);
  const vehiculos = (vehiculosRes.data ?? []) as unknown as VehEstRow[];
  const totalVehiculos = vehiculos.length;
  const vehiculosPropios = vehiculos.filter(v => v.es_propio).length;
  const vehiculosNoPropios = vehiculos.filter(v => !v.es_propio).length;
  const disponibles = vehiculos.filter(v => v.estado === 'disponible').length;
  const alquilados = vehiculos.filter(v => v.estado === 'alquilado').length;
  const ocupacionPct = totalVehiculos > 0 ? Math.round((alquilados / totalVehiculos) * 100) : 0;

  return {
    ingresosMes,
    ingresosMesAnterior,
    totalVehiculos,
    vehiculosPropios,
    vehiculosNoPropios,
    disponibles,
    alquilados,
    ocupacionPct,
  };
}

export async function getChartData(): Promise<ChartDataItem[]> {
  const supabase = createAdminClient();
  const MESES = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];

  const { data } = await supabase
    .from('reservas')
    .select('fecha_entrega, fecha_devolucion')
    .eq('tenant_id', TENANT_ID)
    .in('estado', ['devuelta', 'en_curso', 'confirmada'])
    .gte('fecha_entrega', '2024-01-01');

  const acumulado: Record<string, { año2024: number; año2025: number; año2026: number }> = {};
  for (let i = 0; i < 12; i++) {
    acumulado[MESES[i]] = { año2024: 0, año2025: 0, año2026: 0 };
  }

  type ChartRow = { fecha_entrega: string; fecha_devolucion: string };
  for (const r of ((data ?? []) as unknown as ChartRow[])) {
    const desde = new Date(r.fecha_entrega);
    const hasta = new Date(r.fecha_devolucion);
    const dias = Math.ceil((hasta.getTime() - desde.getTime()) / 86400000);
    const mes = MESES[desde.getMonth()];
    const anio = desde.getFullYear();
    if (anio === 2024) acumulado[mes].año2024 += dias;
    else if (anio === 2025) acumulado[mes].año2025 += dias;
    else if (anio === 2026) acumulado[mes].año2026 += dias;
  }

  return MESES.map(mes => ({ mes, ...acumulado[mes] }));
}

export async function getRanking(): Promise<RankingVehiculo[]> {
  const supabase = createAdminClient();
  const hace6Meses = new Date();
  hace6Meses.setMonth(hace6Meses.getMonth() - 6);

  const { data: vehiculos } = await supabase
    .from('vehiculos')
    .select('id, patente, marca, modelo, foto_url')
    .eq('tenant_id', TENANT_ID);

  if (!vehiculos?.length) return [];

  const { data: reservas } = await supabase
    .from('reservas')
    .select('vehiculo_id, precio_total')
    .eq('tenant_id', TENANT_ID)
    .eq('estado', 'devuelta')
    .gte('fecha_devolucion', hace6Meses.toISOString());

  type RankRow = { vehiculo_id: string | null; precio_total: number };
  type VehCard = { id: string; patente: string; marca: string; modelo: string; foto_url: string | null };
  const stats: Record<string, { total_reservas: number; total_facturado: number }> = {};
  for (const r of ((reservas ?? []) as unknown as RankRow[])) {
    if (!r.vehiculo_id) continue;
    if (!stats[r.vehiculo_id]) stats[r.vehiculo_id] = { total_reservas: 0, total_facturado: 0 };
    stats[r.vehiculo_id].total_reservas++;
    stats[r.vehiculo_id].total_facturado += r.precio_total ?? 0;
  }

  return (vehiculos as unknown as VehCard[])
    .map(v => ({
      vehiculo_id: v.id,
      patente: v.patente,
      marca: v.marca,
      modelo: v.modelo,
      foto_url: v.foto_url,
      total_reservas: stats[v.id]?.total_reservas ?? 0,
      total_facturado: stats[v.id]?.total_facturado ?? 0,
    }))
    .sort((a, b) => b.total_facturado - a.total_facturado)
    .slice(0, 3);
}

export async function getEntregasHoy(): Promise<EntregaHoy[]> {
  const supabase = createAdminClient();
  const hoy = new Date().toISOString().split('T')[0];

  const { data } = await supabase
    .from('reservas')
    .select(`
      id, numero, fecha_entrega, lugar_entrega,
      clientes:cliente_id (nombre, apellido),
      vehiculos:vehiculo_id (patente, modelo)
    `)
    .eq('tenant_id', TENANT_ID)
    .eq('estado', 'confirmada')
    .gte('fecha_entrega', `${hoy}T00:00:00`)
    .lte('fecha_entrega', `${hoy}T23:59:59`);

  return (data ?? []).map((r: any) => ({
    id: r.id,
    numero: r.numero,
    fecha_entrega: r.fecha_entrega,
    lugar_entrega: r.lugar_entrega,
    cliente_nombre: r.clientes?.nombre ?? '',
    cliente_apellido: r.clientes?.apellido ?? '',
    patente: r.vehiculos?.patente ?? null,
    modelo: r.vehiculos?.modelo ?? null,
  }));
}

export async function getDevolucionesHoy(): Promise<EntregaHoy[]> {
  const supabase = createAdminClient();
  const hoy = new Date().toISOString().split('T')[0];

  const { data } = await supabase
    .from('reservas')
    .select(`
      id, numero, fecha_devolucion, lugar_devolucion,
      clientes:cliente_id (nombre, apellido),
      vehiculos:vehiculo_id (patente, modelo)
    `)
    .eq('tenant_id', TENANT_ID)
    .eq('estado', 'en_curso')
    .gte('fecha_devolucion', `${hoy}T00:00:00`)
    .lte('fecha_devolucion', `${hoy}T23:59:59`);

  return (data ?? []).map((r: any) => ({
    id: r.id,
    numero: r.numero,
    fecha_entrega: r.fecha_devolucion,
    lugar_entrega: r.lugar_devolucion,
    cliente_nombre: r.clientes?.nombre ?? '',
    cliente_apellido: r.clientes?.apellido ?? '',
    patente: r.vehiculos?.patente ?? null,
    modelo: r.vehiculos?.modelo ?? null,
  }));
}

export async function getCategorias() {
  const supabase = createAdminClient();
  const { data } = await supabase
    .from('categorias')
    .select('id, nombre')
    .eq('tenant_id', TENANT_ID)
    .order('nombre');
  return data ?? [];
}

export async function calcularCotizacion(
  fechaDesde: string,
  fechaHasta: string,
  categoriaId: string
): Promise<number | null> {
  const supabase = createAdminClient();
  const dias = Math.ceil(
    (new Date(fechaHasta).getTime() - new Date(fechaDesde).getTime()) / 86400000
  );
  if (dias <= 0) return null;

  const { data: temporadas } = await supabase
    .from('temporadas')
    .select('id, fecha_inicio, fecha_fin')
    .eq('tenant_id', TENANT_ID);

  type TempRow = { id: string; fecha_inicio: string; fecha_fin: string };
  const temporada = ((temporadas ?? []) as unknown as TempRow[]).find(t => {
    const inicio = new Date(t.fecha_inicio);
    const fin = new Date(t.fecha_fin);
    const desde = new Date(fechaDesde);
    return desde >= inicio && desde <= fin;
  });

  if (!temporada) return null;

  const { data: tarifa } = await supabase
    .from('tarifas')
    .select('precio_por_dia')
    .eq('tenant_id', TENANT_ID)
    .eq('categoria_id', categoriaId)
    .eq('temporada_id', temporada.id)
    .single();

  if (!tarifa) return null;
  return dias * (tarifa as unknown as { precio_por_dia: number }).precio_por_dia;
}
