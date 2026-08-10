'use server';

import { revalidatePath } from 'next/cache';
import { createAdminClient } from '@/lib/supabase/admin';
import { TENANT_ID } from '@/lib/constants';
import type { RolUsuario } from '@/types';

export interface UsuarioAdmin {
  id: string;
  email: string;
  nombre: string;
  apellido: string;
  rol: RolUsuario;
  sucursal_id: string | null;
  sucursal_nombre: string | null;
  permisos: string[] | null;
  created_at: string;
  last_sign_in: string | null;
}

type UsuarioRow = {
  id: string;
  email: string | null;
  nombre: string;
  apellido: string;
  rol: string;
  sucursal_id: string | null;
  permisos: string[] | null;
  sucursal: { nombre: string } | null;
};

export async function getUsuarios(): Promise<UsuarioAdmin[]> {
  const supabase = createAdminClient();

  const [authRes, usuariosRes] = await Promise.all([
    supabase.auth.admin.listUsers(),
    supabase
      .from('usuarios')
      .select('id, email, nombre, apellido, rol, sucursal_id, permisos, sucursal:sucursales(nombre)')
      .eq('tenant_id', TENANT_ID),
  ]);

  // Si la query falla (columnas nuevas aún no existen en BD), usar fallback sin ellas
  let rows: UsuarioRow[];
  if (usuariosRes.error) {
    const { data: fallback } = await supabase
      .from('usuarios')
      .select('id, email, nombre, apellido, rol')
      .eq('tenant_id', TENANT_ID);
    rows = ((fallback ?? []) as unknown as { id: string; email: string | null; nombre: string; apellido: string; rol: string }[])
      .map(r => ({ ...r, sucursal_id: null, permisos: null, sucursal: null }));
  } else {
    rows = (usuariosRes.data ?? []) as unknown as UsuarioRow[];
  }

  const usuariosMap = new Map(rows.map(u => [u.id, u]));

  return (authRes.data?.users ?? [])
    .filter(u => usuariosMap.has(u.id))
    .map(u => {
      const row = usuariosMap.get(u.id)!;
      return {
        id: u.id,
        email: row.email || u.email || '',
        nombre: row.nombre,
        apellido: row.apellido,
        rol: row.rol as RolUsuario,
        sucursal_id: row.sucursal_id,
        sucursal_nombre: row.sucursal?.nombre ?? null,
        permisos: row.permisos ?? null,
        created_at: u.created_at,
        last_sign_in: u.last_sign_in_at ?? null,
      };
    });
}

export interface UsuarioFormData {
  email: string;
  nombre: string;
  apellido: string;
  rol: RolUsuario;
  password: string;
  sucursal_id: string | null;
  permisos: string[] | null;
}

export async function crearUsuario(data: UsuarioFormData): Promise<void> {
  const supabase = createAdminClient();

  const { data: authData, error: authError } = await supabase.auth.admin.createUser({
    email: data.email,
    password: data.password,
    email_confirm: true,
    user_metadata: { nombre: data.nombre, apellido: data.apellido },
  });
  if (authError) throw new Error(authError.message);

  const row: Record<string, unknown> = {
    id: authData.user.id,
    tenant_id: TENANT_ID,
    email: data.email,
    nombre: data.nombre,
    apellido: data.apellido,
    rol: data.rol,
    sucursal_id: data.sucursal_id || null,
    permisos: data.rol === 'admin' ? null : (data.permisos ?? null),
  };

  const { error: dbError } = await supabase.from('usuarios').upsert(row as never, { onConflict: 'id' });
  if (dbError) throw new Error(dbError.message);

  revalidatePath('/dashboard/usuarios');
}

export interface UsuarioEditData {
  nombre: string;
  apellido: string;
  rol: RolUsuario;
  email?: string;
  password?: string;
  sucursal_id: string | null;
  permisos: string[] | null;
}

export async function actualizarUsuario(id: string, data: UsuarioEditData): Promise<void> {
  const supabase = createAdminClient();

  const authUpdate: Record<string, unknown> = {};
  if (data.email) authUpdate.email = data.email;
  if (data.password) authUpdate.password = data.password;
  if (Object.keys(authUpdate).length > 0) {
    const { error } = await supabase.auth.admin.updateUserById(id, authUpdate);
    if (error) throw new Error(error.message);
  }

  const dbUpdate: Record<string, unknown> = {
    nombre: data.nombre,
    apellido: data.apellido,
    rol: data.rol,
    sucursal_id: data.sucursal_id || null,
    permisos: data.rol === 'admin' ? null : (data.permisos ?? null),
  };
  if (data.email) dbUpdate.email = data.email;

  const { error: dbError } = await supabase
    .from('usuarios')
    .update(dbUpdate as never)
    .eq('id', id)
    .eq('tenant_id', TENANT_ID);
  if (dbError) throw new Error(dbError.message);

  revalidatePath('/dashboard/usuarios');
}

export async function eliminarUsuario(id: string): Promise<void> {
  const supabase = createAdminClient();
  await supabase.from('usuarios').delete().eq('id', id).eq('tenant_id', TENANT_ID);
  await supabase.auth.admin.deleteUser(id);
  revalidatePath('/dashboard/usuarios');
}

export async function getSucursalesParaUsuarios() {
  const supabase = createAdminClient();
  const { data } = await supabase
    .from('sucursales')
    .select('id, nombre')
    .eq('tenant_id', TENANT_ID)
    .eq('activa', true)
    .order('nombre');
  return (data ?? []) as { id: string; nombre: string }[];
}
