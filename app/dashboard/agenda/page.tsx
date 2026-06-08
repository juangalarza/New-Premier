export const dynamic = 'force-dynamic';

import { getAgendaDia } from './actions';
import AgendaClient from './AgendaClient';

export default async function AgendaPage() {
  const hoy = new Date().toISOString().split('T')[0];
  const data = await getAgendaDia(hoy);
  return (
    <AgendaClient
      fecha={hoy}
      entregasIniciales={data.entregas}
      devolucionesIniciales={data.devoluciones}
    />
  );
}
