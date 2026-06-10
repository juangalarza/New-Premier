'use server';

import { revalidatePath } from 'next/cache';
import { createAdminClient } from '@/lib/supabase/admin';
import { TENANT_ID } from '@/lib/constants';
import type { Cobertura, Adicional, Descuento, Tenant, CategoriaGasto } from '@/types';

export async function getTenant(): Promise<Tenant | null> {
  const supabase = createAdminClient();
  const { data } = await supabase.from('tenants').select('*').eq('id', TENANT_ID).single();
  return data as unknown as Tenant | null;
}

export async function actualizarTenant(data: {
  nombre: string;
  logo_url: string;
  descuento_online_pct: number;
}) {
  const supabase = createAdminClient();
  const { error } = await supabase.from('tenants').update(data as never).eq('id', TENANT_ID);
  if (error) throw new Error(error.message);
  revalidatePath('/dashboard/configuracion');
  revalidatePath('/dashboard');
}

// --- COBERTURAS ---

export async function getCoberturas(): Promise<Cobertura[]> {
  const supabase = createAdminClient();
  const { data } = await supabase.from('coberturas').select('*').eq('tenant_id', TENANT_ID).order('nombre');
  return (data ?? []) as unknown as Cobertura[];
}

export async function crearCobertura(data: { nombre: string; descripcion: string | null; precio_por_dia: number }) {
  const supabase = createAdminClient();
  const { error } = await supabase.from('coberturas').insert({ tenant_id: TENANT_ID, ...data } as never);
  if (error) throw new Error(error.message);
  revalidatePath('/dashboard/configuracion');
}

export async function actualizarCobertura(id: string, data: { nombre: string; descripcion: string | null; precio_por_dia: number }) {
  const supabase = createAdminClient();
  const { error } = await supabase.from('coberturas').update(data as never).eq('id', id).eq('tenant_id', TENANT_ID);
  if (error) throw new Error(error.message);
  revalidatePath('/dashboard/configuracion');
}

export async function eliminarCobertura(id: string) {
  const supabase = createAdminClient();
  await supabase.from('coberturas').delete().eq('id', id).eq('tenant_id', TENANT_ID);
  revalidatePath('/dashboard/configuracion');
}

// --- ADICIONALES ---

export async function getAdicionales(): Promise<Adicional[]> {
  const supabase = createAdminClient();
  const { data } = await supabase.from('adicionales').select('*').eq('tenant_id', TENANT_ID).order('nombre');
  return (data ?? []) as unknown as Adicional[];
}

export async function crearAdicional(data: { nombre: string; descripcion: string | null; precio_por_dia: number }) {
  const supabase = createAdminClient();
  const { error } = await supabase.from('adicionales').insert({ tenant_id: TENANT_ID, ...data } as never);
  if (error) throw new Error(error.message);
  revalidatePath('/dashboard/configuracion');
}

export async function actualizarAdicional(id: string, data: { nombre: string; descripcion: string | null; precio_por_dia: number }) {
  const supabase = createAdminClient();
  const { error } = await supabase.from('adicionales').update(data as never).eq('id', id).eq('tenant_id', TENANT_ID);
  if (error) throw new Error(error.message);
  revalidatePath('/dashboard/configuracion');
}

export async function eliminarAdicional(id: string) {
  const supabase = createAdminClient();
  await supabase.from('adicionales').delete().eq('id', id).eq('tenant_id', TENANT_ID);
  revalidatePath('/dashboard/configuracion');
}

// --- DESCUENTOS ---

export async function getDescuentos(): Promise<Descuento[]> {
  const supabase = createAdminClient();
  const { data } = await supabase.from('descuentos').select('*').eq('tenant_id', TENANT_ID).order('codigo');
  return (data ?? []) as unknown as Descuento[];
}

export async function crearDescuento(data: { codigo: string; descuento_pct: number }) {
  const supabase = createAdminClient();
  const { error } = await supabase.from('descuentos').insert({
    tenant_id: TENANT_ID,
    codigo: data.codigo.toUpperCase(),
    descuento_pct: data.descuento_pct,
    activo: true,
  } as never);
  if (error) throw new Error(error.message);
  revalidatePath('/dashboard/configuracion');
}

export async function toggleDescuento(id: string, activo: boolean) {
  const supabase = createAdminClient();
  await supabase.from('descuentos').update({ activo } as never).eq('id', id).eq('tenant_id', TENANT_ID);
  revalidatePath('/dashboard/configuracion');
}

export async function eliminarDescuento(id: string) {
  const supabase = createAdminClient();
  await supabase.from('descuentos').delete().eq('id', id).eq('tenant_id', TENANT_ID);
  revalidatePath('/dashboard/configuracion');
}

// --- CATEGORÍAS DE GASTO ---

export async function getCategoriasGasto(): Promise<CategoriaGasto[]> {
  const supabase = createAdminClient();
  const { data } = await supabase
    .from('categorias_gasto')
    .select('*')
    .eq('tenant_id', TENANT_ID)
    .order('nombre');
  return (data ?? []) as unknown as CategoriaGasto[];
}

export async function crearCategoriaGasto(data: { nombre: string; color: string }) {
  const supabase = createAdminClient();
  const { error } = await supabase.from('categorias_gasto').insert({
    tenant_id: TENANT_ID,
    nombre: data.nombre.trim(),
    color: data.color,
    activa: true,
  } as never);
  if (error) throw new Error(error.message);
  revalidatePath('/dashboard/configuracion');
}

export async function actualizarCategoriaGasto(id: string, data: { nombre: string; color: string }) {
  const supabase = createAdminClient();
  const { error } = await supabase
    .from('categorias_gasto')
    .update({ nombre: data.nombre.trim(), color: data.color } as never)
    .eq('id', id)
    .eq('tenant_id', TENANT_ID);
  if (error) throw new Error(error.message);
  revalidatePath('/dashboard/configuracion');
}

export async function toggleCategoriaGasto(id: string, activa: boolean) {
  const supabase = createAdminClient();
  await supabase
    .from('categorias_gasto')
    .update({ activa } as never)
    .eq('id', id)
    .eq('tenant_id', TENANT_ID);
  revalidatePath('/dashboard/configuracion');
}

export async function eliminarCategoriaGasto(id: string) {
  const supabase = createAdminClient();
  await supabase.from('categorias_gasto').delete().eq('id', id).eq('tenant_id', TENANT_ID);
  revalidatePath('/dashboard/configuracion');
}
