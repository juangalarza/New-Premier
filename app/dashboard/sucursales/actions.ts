'use server';

import { revalidatePath } from 'next/cache';
import { createAdminClient } from '@/lib/supabase/admin';
import { TENANT_ID } from '@/lib/constants';
import type { Sucursal } from '@/types';

export async function getSucursales(): Promise<Sucursal[]> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from('sucursales')
    .select('*')
    .eq('tenant_id', TENANT_ID)
    .order('nombre');
  if (error) throw new Error(error.message);
  return data ?? [];
}

export type SucursalFormData = {
  nombre: string;
  direccion: string;
  telefono: string;
  email: string;
  activa: boolean;
};

export async function crearSucursal(data: SucursalFormData) {
  const supabase = createAdminClient();
  const { error } = await supabase.from('sucursales').insert({
    tenant_id: TENANT_ID,
    nombre: data.nombre,
    direccion: data.direccion || null,
    telefono: data.telefono || null,
    email: data.email || null,
    activa: data.activa,
  } as never);
  if (error) throw new Error(error.message);
  revalidatePath('/dashboard/sucursales');
  revalidatePath('/dashboard/vehiculos');
}

export async function actualizarSucursal(id: string, data: SucursalFormData) {
  const supabase = createAdminClient();
  const { error } = await supabase
    .from('sucursales')
    .update({
      nombre: data.nombre,
      direccion: data.direccion || null,
      telefono: data.telefono || null,
      email: data.email || null,
      activa: data.activa,
    } as never)
    .eq('id', id)
    .eq('tenant_id', TENANT_ID);
  if (error) throw new Error(error.message);
  revalidatePath('/dashboard/sucursales');
  revalidatePath('/dashboard/vehiculos');
}

export async function eliminarSucursal(id: string) {
  const supabase = createAdminClient();
  const { error } = await supabase
    .from('sucursales')
    .delete()
    .eq('id', id)
    .eq('tenant_id', TENANT_ID);
  if (error) throw new Error(error.message);
  revalidatePath('/dashboard/sucursales');
  revalidatePath('/dashboard/vehiculos');
}
