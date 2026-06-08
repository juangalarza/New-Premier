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

export interface ClienteStats {
  id: string;
  nombre: string;
  apellido: string;
  email: string;
  count: number;
  total: number;
}

export interface CategoriaIngreso {
  categoria_id: string;
  nombre: string;
  count: number;
  total: number;
}

export interface ComparativoAnual {
  mes: string;
  mesNum: number;
  [año: string]: number | string;
}

export interface ReportesExtra {
  topClientes: ClienteStats[];
  porCategoria: CategoriaIngreso[];
  comparativo: ComparativoAnual[];
  años: string[];
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

export async function getReportesExtra(año: number): Promise<ReportesExtra> {
  const supabase = createAdminClient();
  const inicio = `${año}-01-01T00:00:00`;
  const fin = `${año}-12-31T23:59:59`;
  const años = [año - 2, año - 1, año];

  const [clientesRes, categoriasRes, multiYearRes] = await Promise.all([
    supabase
      .from('reservas')
      .select('cliente_id, precio_total, cliente:clientes(id, nombre, apellido, email)')
      .eq('tenant_id', TENANT_ID)
      .neq('estado', 'cancelada')
      .gte('created_at', inicio)
      .lte('created_at', fin),

    supabase
      .from('reservas')
      .select('precio_total, vehiculo:vehiculos(categoria:categorias(id, nombre))')
      .eq('tenant_id', TENANT_ID)
      .neq('estado', 'cancelada')
      .gte('created_at', inicio)
      .lte('created_at', fin)
      .not('vehiculo_id', 'is', null),

    supabase
      .from('reservas')
      .select('precio_total, created_at')
      .eq('tenant_id', TENANT_ID)
      .neq('estado', 'cancelada')
      .gte('created_at', `${años[0]}-01-01T00:00:00`)
      .lte('created_at', `${año}-12-31T23:59:59`),
  ]);

  type ClienteRow = {
    cliente_id: string;
    precio_total: number;
    cliente: { id: string; nombre: string; apellido: string; email: string } | null;
  };
  const clienteRows = (clientesRes.data ?? []) as unknown as ClienteRow[];
  const clienteMap: Record<string, ClienteStats> = {};
  for (const r of clienteRows) {
    if (!r.cliente_id || !r.cliente) continue;
    clienteMap[r.cliente_id] ??= {
      id: r.cliente_id,
      nombre: r.cliente.nombre,
      apellido: r.cliente.apellido,
      email: r.cliente.email,
      count: 0,
      total: 0,
    };
    clienteMap[r.cliente_id].count++;
    clienteMap[r.cliente_id].total += r.precio_total;
  }
  const topClientes = Object.values(clienteMap).sort((a, b) => b.total - a.total).slice(0, 5);

  type CategoriaRow = {
    precio_total: number;
    vehiculo: { categoria: { id: string; nombre: string } | null } | null;
  };
  const catRows = (categoriasRes.data ?? []) as unknown as CategoriaRow[];
  const catMap: Record<string, CategoriaIngreso> = {};
  for (const r of catRows) {
    const cat = r.vehiculo?.categoria;
    if (!cat) continue;
    catMap[cat.id] ??= { categoria_id: cat.id, nombre: cat.nombre, count: 0, total: 0 };
    catMap[cat.id].count++;
    catMap[cat.id].total += r.precio_total;
  }
  const porCategoria = Object.values(catMap).sort((a, b) => b.total - a.total);

  const comparativo: ComparativoAnual[] = MESES.map((mes, i) => {
    const obj: ComparativoAnual = { mes, mesNum: i + 1 };
    for (const a of años) obj[String(a)] = 0;
    return obj;
  });

  type MultiRow = { precio_total: number; created_at: string };
  const multiRows = (multiYearRes.data ?? []) as unknown as MultiRow[];
  for (const r of multiRows) {
    const d = new Date(r.created_at);
    const y = String(d.getFullYear());
    const m = d.getMonth();
    if (comparativo[m] && y in comparativo[m]) {
      (comparativo[m][y] as number) += r.precio_total;
    }
  }

  return {
    topClientes,
    porCategoria,
    comparativo,
    años: años.map(String),
  };
}
