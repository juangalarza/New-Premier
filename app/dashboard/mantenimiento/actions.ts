'use server';

import { revalidatePath } from 'next/cache';
import { createAdminClient } from '@/lib/supabase/admin';
import { TENANT_ID } from '@/lib/constants';
import type { Mantenimiento } from '@/types';

export type MantenimientoConVehiculo = Mantenimiento & {
  vehiculo: { id: string; patente: string; marca: string; modelo: string; foto_url: string | null };
};

export type MantenimientoFormData = {
  vehiculo_id: string;
  tipo: string;
  descripcion: string;
  fecha_programada: string;
  estado: string;
  km_proximo?: number;
  proveedor: string;
  observaciones: string;
};

export type MarcarRealizadoData = {
  fecha_realizada: string;
  km_al_realizar?: number;
  costo?: number;
  proveedor: string;
};

export async function getMantenimientos(): Promise<MantenimientoConVehiculo[]> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from('mantenimientos_vehiculo')
    .select('*, vehiculo:vehiculos(id, patente, marca, modelo, foto_url)')
    .eq('tenant_id', TENANT_ID)
    .order('fecha_programada', { ascending: true });

  if (error) throw new Error(error.message);
  return (data ?? []) as unknown as MantenimientoConVehiculo[];
}

export async function getVehiculosParaMantenimiento() {
  const supabase = createAdminClient();
  const { data } = await supabase
    .from('vehiculos')
    .select('id, patente, marca, modelo')
    .eq('tenant_id', TENANT_ID)
    .order('patente');
  return (data ?? []) as { id: string; patente: string; marca: string; modelo: string }[];
}

export async function crearMantenimiento(data: MantenimientoFormData) {
  const supabase = createAdminClient();

  const { error } = await supabase.from('mantenimientos_vehiculo').insert({
    tenant_id: TENANT_ID,
    vehiculo_id: data.vehiculo_id,
    tipo: data.tipo,
    descripcion: data.descripcion,
    fecha_programada: data.fecha_programada,
    estado: data.estado,
    km_proximo: data.km_proximo ?? null,
    proveedor: data.proveedor || null,
    observaciones: data.observaciones || null,
  } as never);

  if (error) throw new Error(error.message);

  if (data.estado === 'en_proceso') {
    await supabase
      .from('vehiculos')
      .update({ estado: 'taller' } as never)
      .eq('id', data.vehiculo_id)
      .eq('tenant_id', TENANT_ID);
  }

  revalidatePath('/dashboard/mantenimiento');
  revalidatePath('/dashboard/vehiculos');
  revalidatePath('/dashboard');
}

export async function actualizarMantenimiento(id: string, data: MantenimientoFormData) {
  const supabase = createAdminClient();

  const { data: current } = await supabase
    .from('mantenimientos_vehiculo')
    .select('estado, vehiculo_id')
    .eq('id', id)
    .single();

  const prev = current as unknown as { estado: string; vehiculo_id: string } | null;

  const { error } = await supabase
    .from('mantenimientos_vehiculo')
    .update({
      vehiculo_id: data.vehiculo_id,
      tipo: data.tipo,
      descripcion: data.descripcion,
      fecha_programada: data.fecha_programada,
      estado: data.estado,
      km_proximo: data.km_proximo ?? null,
      proveedor: data.proveedor || null,
      observaciones: data.observaciones || null,
    } as never)
    .eq('id', id)
    .eq('tenant_id', TENANT_ID);

  if (error) throw new Error(error.message);

  // Sync vehicle estado based on maintenance state transitions
  if (prev?.estado !== 'en_proceso' && data.estado === 'en_proceso') {
    await supabase
      .from('vehiculos')
      .update({ estado: 'taller' } as never)
      .eq('id', data.vehiculo_id)
      .eq('tenant_id', TENANT_ID);
  } else if (prev?.estado === 'en_proceso' && data.estado !== 'en_proceso') {
    await supabase
      .from('vehiculos')
      .update({ estado: 'disponible' } as never)
      .eq('id', data.vehiculo_id)
      .eq('tenant_id', TENANT_ID);
  }

  revalidatePath('/dashboard/mantenimiento');
  revalidatePath('/dashboard/vehiculos');
  revalidatePath('/dashboard');
}

export async function marcarRealizado(id: string, data: MarcarRealizadoData) {
  const supabase = createAdminClient();

  const { data: mant } = await supabase
    .from('mantenimientos_vehiculo')
    .select('vehiculo_id, estado')
    .eq('id', id)
    .single();

  const m = mant as unknown as { vehiculo_id: string; estado: string } | null;

  const { error } = await supabase
    .from('mantenimientos_vehiculo')
    .update({
      estado: 'realizado',
      fecha_realizada: data.fecha_realizada,
      km_al_realizar: data.km_al_realizar ?? null,
      costo: data.costo ?? null,
      proveedor: data.proveedor || null,
    } as never)
    .eq('id', id)
    .eq('tenant_id', TENANT_ID);

  if (error) throw new Error(error.message);

  if (m) {
    if (m.estado === 'en_proceso') {
      await supabase
        .from('vehiculos')
        .update({ estado: 'disponible' } as never)
        .eq('id', m.vehiculo_id)
        .eq('tenant_id', TENANT_ID);
    }
    // Update vehicle km_actual if the km reading is greater than current
    if (data.km_al_realizar) {
      const { data: veh } = await supabase
        .from('vehiculos')
        .select('km_actual')
        .eq('id', m.vehiculo_id)
        .single();
      const v = veh as unknown as { km_actual: number } | null;
      if (v && data.km_al_realizar > v.km_actual) {
        await supabase
          .from('vehiculos')
          .update({ km_actual: data.km_al_realizar } as never)
          .eq('id', m.vehiculo_id)
          .eq('tenant_id', TENANT_ID);
      }
    }
  }

  revalidatePath('/dashboard/mantenimiento');
  revalidatePath('/dashboard/vehiculos');
  revalidatePath('/dashboard');
}

export async function eliminarMantenimiento(id: string) {
  const supabase = createAdminClient();

  const { data: mant } = await supabase
    .from('mantenimientos_vehiculo')
    .select('vehiculo_id, estado')
    .eq('id', id)
    .single();

  const m = mant as unknown as { vehiculo_id: string; estado: string } | null;

  const { error } = await supabase
    .from('mantenimientos_vehiculo')
    .delete()
    .eq('id', id)
    .eq('tenant_id', TENANT_ID);

  if (error) throw new Error(error.message);

  if (m?.estado === 'en_proceso') {
    await supabase
      .from('vehiculos')
      .update({ estado: 'disponible' } as never)
      .eq('id', m.vehiculo_id)
      .eq('tenant_id', TENANT_ID);
  }

  revalidatePath('/dashboard/mantenimiento');
  revalidatePath('/dashboard/vehiculos');
  revalidatePath('/dashboard');
}
