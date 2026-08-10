'use server';

import { createAdminClient } from '@/lib/supabase/admin';
import { TENANT_ID } from '@/lib/constants';

export interface EntregaAgenda {
  id: string;
  id_corto: string;
  numero: string;
  fecha_entrega: string;
  lugar_entrega: string;
  numero_vuelo: string | null;
  estado: string;
  observaciones: string | null;
  cliente: { nombre: string; apellido: string; telefono: string; email: string };
  vehiculo: { patente: string; modelo: string; km_actual: number; combustible_actual: string } | null;
}

export interface DevolucionAgenda {
  id: string;
  id_corto: string;
  numero: string;
  fecha_devolucion: string;
  lugar_devolucion: string;
  estado: string;
  km_devolucion: number | null;
  observaciones: string | null;
  cliente: { nombre: string; apellido: string; telefono: string; email: string };
  vehiculo: { patente: string; modelo: string } | null;
}

export async function getAgendaDia(fecha: string, sucursal_id?: string | null) {
  const supabase = createAdminClient();
  const desde = `${fecha}T00:00:00`;
  const hasta = `${fecha}T23:59:59`;

  // Si hay filtro de sucursal, obtener los vehículos de esa sucursal
  let vehiculoIds: string[] | null = null;
  if (sucursal_id) {
    const { data: vData } = await supabase
      .from('vehiculos')
      .select('id')
      .eq('tenant_id', TENANT_ID)
      .eq('sucursal_id', sucursal_id);
    vehiculoIds = ((vData ?? []) as unknown as { id: string }[]).map(v => v.id);
    if (vehiculoIds.length === 0) return { entregas: [], devoluciones: [] };
  }

  let entregasQ = supabase
    .from('reservas')
    .select(`
      id, id_corto, numero, fecha_entrega, lugar_entrega, numero_vuelo, estado, observaciones,
      cliente:clientes(nombre, apellido, telefono, email),
      vehiculo:vehiculos(patente, modelo, km_actual, combustible_actual)
    `)
    .eq('tenant_id', TENANT_ID)
    .in('estado', ['confirmada', 'pendiente', 'preventa'])
    .gte('fecha_entrega', desde)
    .lte('fecha_entrega', hasta)
    .order('fecha_entrega');

  let devolucionesQ = supabase
    .from('reservas')
    .select(`
      id, id_corto, numero, fecha_devolucion, lugar_devolucion, estado, km_devolucion, observaciones,
      cliente:clientes(nombre, apellido, telefono, email),
      vehiculo:vehiculos(patente, modelo)
    `)
    .eq('tenant_id', TENANT_ID)
    .eq('estado', 'en_curso')
    .gte('fecha_devolucion', desde)
    .lte('fecha_devolucion', hasta)
    .order('fecha_devolucion');

  if (vehiculoIds) {
    entregasQ = entregasQ.in('vehiculo_id', vehiculoIds) as typeof entregasQ;
    devolucionesQ = devolucionesQ.in('vehiculo_id', vehiculoIds) as typeof devolucionesQ;
  }

  const [entregasRes, devolucionesRes] = await Promise.all([entregasQ, devolucionesQ]);

  return {
    entregas: (entregasRes.data ?? []) as unknown as EntregaAgenda[],
    devoluciones: (devolucionesRes.data ?? []) as unknown as DevolucionAgenda[],
  };
}
