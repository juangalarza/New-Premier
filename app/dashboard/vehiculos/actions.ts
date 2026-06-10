'use server';

import { revalidatePath } from 'next/cache';
import { createAdminClient } from '@/lib/supabase/admin';
import { TENANT_ID } from '@/lib/constants';
import type { Vehiculo } from '@/types';

export async function getVehiculos(): Promise<Vehiculo[]> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from('vehiculos')
    .select('*, categoria:categorias(id, nombre, descripcion, tenant_id, created_at), sucursal:sucursales(id, nombre)')
    .eq('tenant_id', TENANT_ID)
    .order('created_at', { ascending: false });

  if (error) throw new Error(error.message);
  return (data ?? []) as Vehiculo[];
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

export type VehiculoFormData = {
  patente: string;
  marca: string;
  modelo: string;
  categoria_id: string;
  color: string;
  anio: number;
  km_actual: number;
  combustible_actual: string;
  estado: string;
  es_propio: boolean;
  foto_url: string;
  sucursal_id: string;
};

export async function crearVehiculo(data: VehiculoFormData) {
  const supabase = createAdminClient();
  const { error } = await supabase.from('vehiculos').insert({
    ...data,
    patente: data.patente.toUpperCase(),
    tenant_id: TENANT_ID,
    foto_url: data.foto_url || null,
    color: data.color || null,
    sucursal_id: data.sucursal_id || null,
  } as never);
  if (error) throw new Error(error.message);
  revalidatePath('/dashboard/vehiculos');
  revalidatePath('/dashboard');
}

export async function actualizarVehiculo(id: string, data: VehiculoFormData) {
  const supabase = createAdminClient();
  const { error } = await supabase
    .from('vehiculos')
    .update({
      ...data,
      patente: data.patente.toUpperCase(),
      foto_url: data.foto_url || null,
      color: data.color || null,
      sucursal_id: data.sucursal_id || null,
    } as never)
    .eq('id', id)
    .eq('tenant_id', TENANT_ID);
  if (error) throw new Error(error.message);
  revalidatePath('/dashboard/vehiculos');
  revalidatePath('/dashboard');
}

export async function eliminarVehiculo(id: string) {
  const supabase = createAdminClient();
  const { error } = await supabase
    .from('vehiculos')
    .delete()
    .eq('id', id)
    .eq('tenant_id', TENANT_ID);
  if (error) throw new Error(error.message);
  revalidatePath('/dashboard/vehiculos');
  revalidatePath('/dashboard');
}

export async function getFacturadoPorVehiculo(): Promise<Record<string, number>> {
  const supabase = createAdminClient();
  const hace6Meses = new Date();
  hace6Meses.setMonth(hace6Meses.getMonth() - 6);

  const { data } = await supabase
    .from('reservas')
    .select('vehiculo_id, precio_total')
    .eq('tenant_id', TENANT_ID)
    .eq('estado', 'devuelta')
    .gte('fecha_devolucion', hace6Meses.toISOString().split('T')[0])
    .not('vehiculo_id', 'is', null);

  const map: Record<string, number> = {};
  for (const r of ((data ?? []) as unknown as { vehiculo_id: string; precio_total: number }[])) {
    map[r.vehiculo_id] = (map[r.vehiculo_id] ?? 0) + (r.precio_total ?? 0);
  }
  return map;
}
