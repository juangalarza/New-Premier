'use server';

import { createAdminClient } from '@/lib/supabase/admin';
import { TENANT_ID } from '@/lib/constants';
import type { Vehiculo } from '@/types';
import type { ReservaConRelaciones } from '@/app/dashboard/reservas/actions';

export interface GanttData {
  vehiculos: Vehiculo[];
  reservas: ReservaConRelaciones[];
}

export async function getGanttData(year: number, month: number, numMeses: number = 1): Promise<GanttData> {
  const supabase = createAdminClient();

  // Rango: inicio del mes pedido hasta el fin del último mes
  const inicio = new Date(year, month - 1, 1).toISOString();
  const fin = new Date(year, month - 1 + numMeses, 0, 23, 59, 59).toISOString();

  const [vehiculosRes, reservasRes] = await Promise.all([
    supabase
      .from('vehiculos')
      .select('*, categoria:categorias(id, nombre, descripcion, tenant_id, created_at)')
      .eq('tenant_id', TENANT_ID)
      .not('estado', 'eq', 'bloqueado')
      .order('patente'),

    supabase
      .from('reservas')
      .select(`
        *,
        cliente:clientes(id, nombre, apellido, email),
        vehiculo:vehiculos(id, patente, modelo, foto_url)
      `)
      .eq('tenant_id', TENANT_ID)
      .not('estado', 'in', '("cancelada")')
      .lt('fecha_entrega', fin)
      .gt('fecha_devolucion', inicio),
  ]);

  return {
    vehiculos: (vehiculosRes.data ?? []) as Vehiculo[],
    reservas: (reservasRes.data ?? []) as unknown as ReservaConRelaciones[],
  };
}
