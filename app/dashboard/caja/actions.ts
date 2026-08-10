'use server';

import { revalidatePath } from 'next/cache';
import { createAdminClient } from '@/lib/supabase/admin';
import { TENANT_ID } from '@/lib/constants';
import type { CategoriaGasto } from '@/types';

export async function getCategoriasGasto(): Promise<CategoriaGasto[]> {
  const supabase = createAdminClient();
  const { data } = await supabase
    .from('categorias_gasto')
    .select('*')
    .eq('tenant_id', TENANT_ID)
    .eq('activa', true)
    .order('nombre');
  return (data ?? []) as unknown as CategoriaGasto[];
}

export async function getGastosMes(inicioFecha: string, finFecha: string, sucursal_id?: string | null) {
  const supabase = createAdminClient();

  let vehiculoIds: string[] | null = null;
  if (sucursal_id) {
    const { data: vData } = await supabase
      .from('vehiculos')
      .select('id')
      .eq('tenant_id', TENANT_ID)
      .eq('sucursal_id', sucursal_id);
    vehiculoIds = ((vData ?? []) as unknown as { id: string }[]).map(v => v.id);
  }

  let q = supabase
    .from('gastos')
    .select('id, categoria, monto, descripcion, fecha, vehiculo_id, vehiculos:vehiculo_id(patente)')
    .eq('tenant_id', TENANT_ID)
    .gte('fecha', inicioFecha)
    .lte('fecha', finFecha)
    .order('fecha', { ascending: false })
    .order('created_at', { ascending: false });

  if (vehiculoIds !== null) {
    if (vehiculoIds.length === 0) return [];
    q = q.in('vehiculo_id', vehiculoIds) as typeof q;
  }

  const { data } = await q;
  return data ?? [];
}

export async function getPagosMes(inicioTs: string, finTs: string, sucursal_id?: string | null) {
  const supabase = createAdminClient();

  let reservaIds: string[] | null = null;
  if (sucursal_id) {
    const { data: vData } = await supabase
      .from('vehiculos')
      .select('id')
      .eq('tenant_id', TENANT_ID)
      .eq('sucursal_id', sucursal_id);
    const vIds = ((vData ?? []) as unknown as { id: string }[]).map(v => v.id);
    if (vIds.length === 0) return [];
    const { data: rData } = await supabase
      .from('reservas')
      .select('id')
      .eq('tenant_id', TENANT_ID)
      .in('vehiculo_id', vIds);
    reservaIds = ((rData ?? []) as unknown as { id: string }[]).map(r => r.id);
    if (reservaIds.length === 0) return [];
  }

  let q = supabase
    .from('pagos')
    .select('id, monto, metodo, created_at, reservas:reserva_id(numero)')
    .eq('tenant_id', TENANT_ID)
    .gte('created_at', inicioTs)
    .lte('created_at', finTs)
    .order('created_at', { ascending: false });

  if (reservaIds !== null) {
    q = q.in('reserva_id', reservaIds) as typeof q;
  }

  const { data } = await q;
  return data ?? [];
}

export async function crearGasto(data: {
  categoria: string;
  monto: number;
  descripcion?: string | null;
  fecha: string;
  vehiculo_id?: string | null;
}) {
  const supabase = createAdminClient();
  const { error } = await supabase.from('gastos').insert({
    tenant_id: TENANT_ID,
    categoria: data.categoria,
    monto: data.monto,
    descripcion: data.descripcion ?? null,
    fecha: data.fecha,
    vehiculo_id: data.vehiculo_id ?? null,
  } as never);
  if (error) throw new Error(error.message);
  revalidatePath('/dashboard/caja');
  revalidatePath('/dashboard');
}

export async function actualizarGasto(id: string, data: {
  categoria: string;
  monto: number;
  descripcion?: string | null;
  fecha: string;
  vehiculo_id?: string | null;
}) {
  const supabase = createAdminClient();
  const { error } = await supabase
    .from('gastos')
    .update({
      categoria: data.categoria,
      monto: data.monto,
      descripcion: data.descripcion ?? null,
      fecha: data.fecha,
      vehiculo_id: data.vehiculo_id ?? null,
    } as never)
    .eq('id', id)
    .eq('tenant_id', TENANT_ID);
  if (error) throw new Error(error.message);
  revalidatePath('/dashboard/caja');
  revalidatePath('/dashboard');
}

export async function eliminarGasto(id: string) {
  const supabase = createAdminClient();
  await supabase.from('gastos').delete().eq('id', id).eq('tenant_id', TENANT_ID);
  revalidatePath('/dashboard/caja');
  revalidatePath('/dashboard');
}
