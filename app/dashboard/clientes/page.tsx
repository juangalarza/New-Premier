export const dynamic = 'force-dynamic';

import { getClientes } from './actions';
import ClientesClient from './ClientesClient';

export default async function ClientesPage() {
  const clientes = await getClientes();
  return <ClientesClient clientes={clientes} />;
}
