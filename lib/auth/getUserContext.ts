'use server';

import { createAdminClient } from '@/lib/supabase/admin';
import { createClient } from '@/lib/supabase/server';
import { TENANT_ID } from '@/lib/constants';

export interface UserContext {
  userId: string;
  sucursal_id: string | null;
  permisos: string[] | null; // null = acceso completo
  rol: string;
}

export async function getUserContext(): Promise<UserContext | null> {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    const admin = createAdminClient();
    const { data: row } = await admin
      .from('usuarios')
      .select('sucursal_id, permisos, rol')
      .eq('id', user.id)
      .eq('tenant_id', TENANT_ID)
      .single();

    return {
      userId: user.id,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      sucursal_id: (row as any)?.sucursal_id ?? null,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      permisos: (row as any)?.permisos ?? null,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      rol: (row as any)?.rol ?? 'operador',
    };
  } catch {
    return null;
  }
}
