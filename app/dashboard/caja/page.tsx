export const dynamic = 'force-dynamic';

import { createAdminClient } from '@/lib/supabase/admin';
import { TENANT_ID } from '@/lib/constants';
import { getCategoriasGasto, getGastosMes, getPagosMes } from './actions';
import { getUserContext } from '@/lib/auth/getUserContext';
import CajaClient from './CajaClient';

async function getVehiculos(sucursal_id?: string | null) {
  const supabase = createAdminClient();
  let q = supabase
    .from('vehiculos')
    .select('id, patente, marca, modelo')
    .eq('tenant_id', TENANT_ID)
    .order('patente');
  if (sucursal_id) q = q.eq('sucursal_id', sucursal_id) as typeof q;
  const { data } = await q;
  return (data ?? []) as { id: string; patente: string; marca: string; modelo: string }[];
}

export default async function CajaPage() {
  const now = new Date();
  const ano = now.getFullYear();
  const mes = now.getMonth() + 1;
  const inicio = new Date(ano, mes - 1, 1).toISOString().split('T')[0];
  const fin = new Date(ano, mes, 0).toISOString().split('T')[0];
  const inicioTs = new Date(ano, mes - 1, 1).toISOString();
  const finTs = new Date(ano, mes, 0, 23, 59, 59).toISOString();
  const mesInicial = `${ano}-${String(mes).padStart(2, '0')}`;

  const ctx = await getUserContext();
  const sid = ctx?.sucursal_id ?? null;

  const [categorias, gastos, pagos, vehiculos] = await Promise.all([
    getCategoriasGasto(),
    getGastosMes(inicio, fin, sid),
    getPagosMes(inicioTs, finTs, sid),
    getVehiculos(sid),
  ]);

  return (
    <CajaClient
      categorias={categorias}
      gastosIniciales={gastos as never}
      pagosIniciales={pagos as never}
      vehiculos={vehiculos}
      mesInicial={mesInicial}
      sucursalId={sid}
    />
  );
}
