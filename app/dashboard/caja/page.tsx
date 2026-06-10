export const dynamic = 'force-dynamic';

import { createAdminClient } from '@/lib/supabase/admin';
import { TENANT_ID } from '@/lib/constants';
import { getCategoriasGasto, getGastosMes, getPagosMes } from './actions';
import CajaClient from './CajaClient';

async function getVehiculos() {
  const supabase = createAdminClient();
  const { data } = await supabase
    .from('vehiculos')
    .select('id, patente, marca, modelo')
    .eq('tenant_id', TENANT_ID)
    .order('patente');
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

  const [categorias, gastos, pagos, vehiculos] = await Promise.all([
    getCategoriasGasto(),
    getGastosMes(inicio, fin),
    getPagosMes(inicioTs, finTs),
    getVehiculos(),
  ]);

  return (
    <CajaClient
      categorias={categorias}
      gastosIniciales={gastos as never}
      pagosIniciales={pagos as never}
      vehiculos={vehiculos}
      mesInicial={mesInicial}
    />
  );
}
