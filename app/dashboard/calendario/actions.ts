'use server';

import { createAdminClient } from '@/lib/supabase/admin';
import { TENANT_ID } from '@/lib/constants';
import type { Vehiculo, Sucursal, Categoria } from '@/types';
import type { ReservaConRelaciones } from '@/app/dashboard/reservas/actions';

export interface GanttData {
  vehiculos: Vehiculo[];
  reservas: ReservaConRelaciones[];
}

export async function getGanttData(
  year: number,
  month: number,
  numMeses: number = 1,
  sucursalId?: string | null,
  categoriaId?: string | null,
): Promise<GanttData> {
  const supabase = createAdminClient();

  const inicio = new Date(year, month - 1, 1).toISOString();
  const fin = new Date(year, month - 1 + numMeses, 0, 23, 59, 59).toISOString();

  let vehiculosQuery = supabase
    .from('vehiculos')
    .select('*, categoria:categorias(id, nombre, descripcion, tenant_id, created_at), sucursal:sucursales(id, nombre)')
    .eq('tenant_id', TENANT_ID)
    .not('estado', 'eq', 'bloqueado');

  if (sucursalId) vehiculosQuery = vehiculosQuery.eq('sucursal_id', sucursalId) as typeof vehiculosQuery;
  if (categoriaId) vehiculosQuery = vehiculosQuery.eq('categoria_id', categoriaId) as typeof vehiculosQuery;

  const [vehiculosRes, reservasRes] = await Promise.all([
    vehiculosQuery.order('patente'),
    supabase
      .from('reservas')
      .select(`
        *,
        cliente:clientes(id, nombre, apellido, email),
        vehiculo:vehiculos(id, patente, modelo, foto_url)
      `)
      .eq('tenant_id', TENANT_ID)
      .not('estado', 'in', '("cancelada")')
      .not('vehiculo_id', 'is', null)
      .lt('fecha_entrega', fin)
      .gt('fecha_devolucion', inicio),
  ]);

  return {
    vehiculos: (vehiculosRes.data ?? []) as Vehiculo[],
    reservas: (reservasRes.data ?? []) as unknown as ReservaConRelaciones[],
  };
}

export async function getSucursalesCalendario(): Promise<Sucursal[]> {
  const supabase = createAdminClient();
  const { data } = await supabase
    .from('sucursales')
    .select('*')
    .eq('tenant_id', TENANT_ID)
    .eq('activa', true)
    .order('nombre');
  return (data ?? []) as Sucursal[];
}

export async function getCategoriasCalendario(): Promise<Categoria[]> {
  const supabase = createAdminClient();
  const { data } = await supabase
    .from('categorias')
    .select('*')
    .eq('tenant_id', TENANT_ID)
    .order('nombre');
  return (data ?? []) as Categoria[];
}
