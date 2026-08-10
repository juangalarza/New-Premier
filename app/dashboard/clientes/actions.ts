'use server';

import { revalidatePath } from 'next/cache';
import { createAdminClient } from '@/lib/supabase/admin';
import { TENANT_ID } from '@/lib/constants';
import type { Cliente } from '@/types';

export async function getClientes(sucursal_id?: string | null): Promise<Cliente[]> {
  const supabase = createAdminClient();

  if (sucursal_id) {
    // Filtrar clientes que tienen al menos una reserva con un vehículo de esta sucursal
    const { data: vData } = await supabase
      .from('vehiculos')
      .select('id')
      .eq('tenant_id', TENANT_ID)
      .eq('sucursal_id', sucursal_id);
    const vIds = ((vData ?? []) as unknown as { id: string }[]).map(v => v.id);
    if (vIds.length === 0) return [];

    const { data: rData } = await supabase
      .from('reservas')
      .select('cliente_id')
      .eq('tenant_id', TENANT_ID)
      .in('vehiculo_id', vIds);
    const clienteIds = [
      ...new Set(
        ((rData ?? []) as unknown as { cliente_id: string | null }[])
          .map(r => r.cliente_id)
          .filter((id): id is string => !!id)
      ),
    ];
    if (clienteIds.length === 0) return [];

    const { data, error } = await supabase
      .from('clientes')
      .select('*')
      .eq('tenant_id', TENANT_ID)
      .in('id', clienteIds)
      .order('created_at', { ascending: false });
    if (error) throw new Error(error.message);
    return data ?? [];
  }

  const { data, error } = await supabase
    .from('clientes')
    .select('*')
    .eq('tenant_id', TENANT_ID)
    .order('created_at', { ascending: false });
  if (error) throw new Error(error.message);
  return data ?? [];
}

export type ClienteFormData = {
  nombre: string;
  apellido: string;
  email: string;
  telefono: string;
  dni_pasaporte: string;
  licencia_conducir: string;
  ciudad: string;
  pais: string;
  fecha_nacimiento: string;
  direccion: string;
};

export async function crearCliente(data: ClienteFormData) {
  const supabase = createAdminClient();
  const { error } = await supabase.from('clientes').insert({
    ...data,
    tenant_id: TENANT_ID,
    fecha_nacimiento: data.fecha_nacimiento || null,
    direccion: data.direccion || null,
  } as never);
  if (error) throw new Error(error.message);
  revalidatePath('/dashboard/clientes');
}

export async function actualizarCliente(id: string, data: ClienteFormData) {
  const supabase = createAdminClient();
  const { error } = await supabase
    .from('clientes')
    .update({
      ...data,
      fecha_nacimiento: data.fecha_nacimiento || null,
      direccion: data.direccion || null,
    } as never)
    .eq('id', id)
    .eq('tenant_id', TENANT_ID);
  if (error) throw new Error(error.message);
  revalidatePath('/dashboard/clientes');
}

export async function eliminarCliente(id: string) {
  const supabase = createAdminClient();
  const { error } = await supabase
    .from('clientes')
    .delete()
    .eq('id', id)
    .eq('tenant_id', TENANT_ID);
  if (error) throw new Error(error.message);
  revalidatePath('/dashboard/clientes');
}
