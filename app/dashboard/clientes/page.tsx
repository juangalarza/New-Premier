export const dynamic = 'force-dynamic';

import { getClientes } from './actions';
import { getUserContext } from '@/lib/auth/getUserContext';
import ClientesClient from './ClientesClient';

export default async function ClientesPage() {
  const ctx = await getUserContext();
  const clientes = await getClientes(ctx?.sucursal_id);
  return <ClientesClient clientes={clientes} />;
}
