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

export async function invitarUsuario(data: {
  email: string;
  nombre: string;
  apellido: string;
  rol: RolUsuario;
}) {
  const supabase = createAdminClient();

  const siteUrl = process.env.NEXT_PUBLIC_URL ?? 'http://localhost:3000';
  const { data: authData, error } = await supabase.auth.admin.inviteUserByEmail(data.email, {
    data: { nombre: data.nombre, apellido: data.apellido },
    redirectTo: `${siteUrl}/auth/confirm`,
  });
  if (error) throw new Error(error.message);

  const { error: insertError } = await supabase.from('usuarios').insert({
    id: authData.user.id,
    tenant_id: TENANT_ID,
    nombre: data.nombre,
    apellido: data.apellido,
    rol: data.rol,
  } as never);
  if (insertError) throw new Error(insertError.message);

  revalidatePath('/dashboard/usuarios');
}

export async function actualizarRol(id: string, rol: RolUsuario) {
  const supabase = createAdminClient();
  const { error } = await supabase
    .from('usuarios')
    .update({ rol } as never)
    .eq('id', id)
    .eq('tenant_id', TENANT_ID);
  if (error) throw new Error(error.message);
  revalidatePath('/dashboard/usuarios');
}

export async function eliminarUsuario(id: string) {
  const supabase = createAdminClient();
  await supabase.from('usuarios').delete().eq('id', id).eq('tenant_id', TENANT_ID);
  await supabase.auth.admin.deleteUser(id);
  revalidatePath('/dashboard/usuarios');
}
