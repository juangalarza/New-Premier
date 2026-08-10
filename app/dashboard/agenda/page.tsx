export const dynamic = 'force-dynamic';

import { getAgendaDia } from './actions';
import { getUserContext } from '@/lib/auth/getUserContext';
import AgendaClient from './AgendaClient';

export default async function AgendaPage() {
  const hoy = new Date().toISOString().split('T')[0];
  const ctx = await getUserContext();
  const data = await getAgendaDia(hoy, ctx?.sucursal_id);
  return (
    <AgendaClient
      fecha={hoy}
      sucursalId={ctx?.sucursal_id ?? null}
      entregasIniciales={data.entregas}
      devolucionesIniciales={data.devoluciones}
    />
  );
}
