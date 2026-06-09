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
  created_at: string;
  last_sign_in: string | null;
}

type UsuarioRow = { id: string; nombre: string; apellido: string; rol: string };

export async function getUsuarios(): Promise<UsuarioAdmin[]> {
  const supabase = createAdminClient();

  const [authRes, usuariosRes] = await Promise.all([
    supabase.auth.admin.listUsers(),
    supabase.from('usuarios').select('id, nombre, apellido, rol').eq('tenant_id', TENANT_ID),
  ]);

  const rows = (usuariosRes.data ?? []) as unknown as UsuarioRow[];
  const usuariosMap = new Map(rows.map(u => [u.id, u]));

  return (authRes.data?.users ?? [])
    .filter(u => usuariosMap.has(u.id))
    .map(u => ({
      id: u.id,
      email: u.email ?? '',
      nombre: usuariosMap.get(u.id)!.nombre,
      apellido: usuariosMap.get(u.id)!.apellido,
      rol: usuariosMap.get(u.id)!.rol as RolUsuario,
      created_at: u.created_at,
      last_sign_in: u.last_sign_in_at ?? null,
    }));
}

export interface UsuarioFormData {
  email: string;
  nombre: string;
  apellido: string;
  rol: RolUsuario;
  password: string;
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

  const { error: dbError } = await supabase.from('usuarios').upsert({
    id: authData.user.id,
    tenant_id: TENANT_ID,
    nombre: data.nombre,
    apellido: data.apellido,
    rol: data.rol,
  } as never, { onConflict: 'id' });
  if (dbError) throw new Error(dbError.message);

  revalidatePath('/dashboard/usuarios');
}

export interface UsuarioEditData {
  nombre: string;
  apellido: string;
  rol: RolUsuario;
  email?: string;
  password?: string;
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

  const { error: dbError } = await supabase
    .from('usuarios')
    .update({ nombre: data.nombre, apellido: data.apellido, rol: data.rol } as never)
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
