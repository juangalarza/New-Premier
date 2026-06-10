'use server';

import { createAdminClient } from '@/lib/supabase/admin';
import { TENANT_ID } from '@/lib/constants';
import type { Vehiculo } from '@/types';

export type ReservaDetalleRow = {
  id: string;
  numero: string;
  fecha_entrega: string;
  fecha_devolucion: string;
  estado: string;
  precio_total: number;
  total_pagado: number;
  cliente: { nombre: string; apellido: string; email: string } | null;
};

export async function getVehiculoById(id: string): Promise<Vehiculo | null> {
  const supabase = createAdminClient();
  const { data } = await supabase
    .from('vehiculos')
    .select('*, categoria:categorias(id, nombre, descripcion, tenant_id, created_at), sucursal:sucursales(id, nombre)')
    .eq('id', id)
    .eq('tenant_id', TENANT_ID)
    .single();
  return data as unknown as Vehiculo | null;
}

export async function getReservasVehiculo(vehiculoId: string): Promise<ReservaDetalleRow[]> {
  const supabase = createAdminClient();
  const { data } = await supabase
    .from('reservas')
    .select(`
      id, numero, fecha_entrega, fecha_devolucion, estado, precio_total, total_pagado,
      clientes:cliente_id(nombre, apellido, email)
    `)
    .eq('vehiculo_id', vehiculoId)
    .eq('tenant_id', TENANT_ID)
    .order('fecha_entrega', { ascending: false });

  return (data ?? []).map((r: any) => ({
    id: r.id,
    numero: r.numero,
    fecha_entrega: r.fecha_entrega,
    fecha_devolucion: r.fecha_devolucion,
    estado: r.estado,
    precio_total: r.precio_total ?? 0,
    total_pagado: r.total_pagado ?? 0,
    cliente: r.clientes ?? null,
  }));
}
