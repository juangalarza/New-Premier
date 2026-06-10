'use server';

import { revalidatePath } from 'next/cache';
import { createAdminClient } from '@/lib/supabase/admin';
import { TENANT_ID } from '@/lib/constants';
import type { Categoria, Temporada, Adicional } from '@/types';

export interface TarifaMatrix {
  categorias: Categoria[];
  temporadas: Temporada[];
  precios: Record<string, Record<string, number>>;
  adicionales: Adicional[];
}

type TarifaRow = { id: string; categoria_id: string; temporada_id: string; precio_por_dia: number };

export async function getTarifaMatrix(): Promise<TarifaMatrix> {
  const supabase = createAdminClient();

  const [catRes, tempRes, tarifaRes, adicRes] = await Promise.all([
    supabase.from('categorias').select('*').eq('tenant_id', TENANT_ID).order('nombre'),
    supabase.from('temporadas').select('*').eq('tenant_id', TENANT_ID).order('fecha_inicio'),
    supabase.from('tarifas').select('id, categoria_id, temporada_id, precio_por_dia').eq('tenant_id', TENANT_ID),
    supabase.from('adicionales').select('*').eq('tenant_id', TENANT_ID).order('nombre'),
  ]);

  const tarifas = (tarifaRes.data ?? []) as unknown as TarifaRow[];
  const precios: Record<string, Record<string, number>> = {};
  for (const t of tarifas) {
    precios[t.categoria_id] ??= {};
    precios[t.categoria_id][t.temporada_id] = t.precio_por_dia;
  }

  return {
    categorias: (catRes.data ?? []) as Categoria[],
    temporadas: (tempRes.data ?? []) as Temporada[],
    precios,
    adicionales: (adicRes.data ?? []) as Adicional[],
  };
}

export async function upsertTarifa(categoriaId: string, temporadaId: string, precio: number) {
  const supabase = createAdminClient();

  const { data: existing } = await supabase
    .from('tarifas')
    .select('id')
    .eq('tenant_id', TENANT_ID)
    .eq('categoria_id', categoriaId)
    .eq('temporada_id', temporadaId)
    .maybeSingle();

  if (existing) {
    await supabase
      .from('tarifas')
      .update({ precio_por_dia: precio } as never)
      .eq('id', (existing as unknown as { id: string }).id);
  } else {
    await supabase.from('tarifas').insert({
      tenant_id: TENANT_ID,
      categoria_id: categoriaId,
      temporada_id: temporadaId,
      precio_por_dia: precio,
    } as never);
  }

  revalidatePath('/dashboard/tarifas');
}

export async function crearTemporada(data: { nombre: string; fecha_inicio: string; fecha_fin: string }) {
  const supabase = createAdminClient();
  const { error } = await supabase.from('temporadas').insert({
    tenant_id: TENANT_ID,
    nombre: data.nombre as 'baja' | 'media' | 'alta',
    fecha_inicio: data.fecha_inicio,
    fecha_fin: data.fecha_fin,
  } as never);
  if (error) throw new Error(error.message);
  revalidatePath('/dashboard/tarifas');
}

export async function actualizarTemporada(id: string, data: { nombre: string; fecha_inicio: string; fecha_fin: string }) {
  const supabase = createAdminClient();
  const { error } = await supabase
    .from('temporadas')
    .update({ nombre: data.nombre as 'baja' | 'media' | 'alta', fecha_inicio: data.fecha_inicio, fecha_fin: data.fecha_fin } as never)
    .eq('id', id)
    .eq('tenant_id', TENANT_ID);
  if (error) throw new Error(error.message);
  revalidatePath('/dashboard/tarifas');
}

export async function eliminarTemporada(id: string) {
  const supabase = createAdminClient();
  await supabase.from('tarifas').delete().eq('temporada_id', id).eq('tenant_id', TENANT_ID);
  await supabase.from('temporadas').delete().eq('id', id).eq('tenant_id', TENANT_ID);
  revalidatePath('/dashboard/tarifas');
}

export async function crearCategoria(nombre: string, descripcion: string) {
  const supabase = createAdminClient();
  const { error } = await supabase.from('categorias').insert({
    tenant_id: TENANT_ID,
    nombre,
    descripcion: descripcion || null,
  } as never);
  if (error) throw new Error(error.message);
  revalidatePath('/dashboard/tarifas');
  revalidatePath('/dashboard/vehiculos');
}

export async function eliminarCategoria(id: string) {
  const supabase = createAdminClient();
  await supabase.from('tarifas').delete().eq('categoria_id', id).eq('tenant_id', TENANT_ID);
  await supabase.from('categorias').delete().eq('id', id).eq('tenant_id', TENANT_ID);
  revalidatePath('/dashboard/tarifas');
}

export async function upsertAdicional(data: {
  id?: string;
  nombre: string;
  descripcion?: string | null;
  precio_por_dia: number;
}) {
  const supabase = createAdminClient();
  if (data.id) {
    const { error } = await supabase
      .from('adicionales')
      .update({ nombre: data.nombre, descripcion: data.descripcion ?? null, precio_por_dia: data.precio_por_dia } as never)
      .eq('id', data.id)
      .eq('tenant_id', TENANT_ID);
    if (error) throw new Error(error.message);
  } else {
    const { error } = await supabase.from('adicionales').insert({
      tenant_id: TENANT_ID,
      nombre: data.nombre,
      descripcion: data.descripcion ?? null,
      precio_por_dia: data.precio_por_dia,
    } as never);
    if (error) throw new Error(error.message);
  }
  revalidatePath('/dashboard/tarifas');
}

export async function eliminarAdicional(id: string) {
  const supabase = createAdminClient();
  await supabase.from('adicionales').delete().eq('id', id).eq('tenant_id', TENANT_ID);
  revalidatePath('/dashboard/tarifas');
}
