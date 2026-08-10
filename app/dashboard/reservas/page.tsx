export const dynamic = 'force-dynamic';

import { getReservas, getClientes, getCoberturas, getAdicionales, getCategoriasConTarifas } from './actions';
import { getUserContext } from '@/lib/auth/getUserContext';
import ReservasClient from './ReservasClient';

export default async function ReservasPage() {
  const ctx = await getUserContext();
  const [reservas, clientes, coberturas, adicionales, categorias] = await Promise.all([
    getReservas({}, ctx?.sucursal_id),
    getClientes(),
    getCoberturas(),
    getAdicionales(),
    getCategoriasConTarifas(),
  ]);

  return (
    <ReservasClient
      reservasIniciales={reservas}
      clientes={clientes}
      coberturas={coberturas}
      adicionales={adicionales}
      categorias={categorias}
    />
  );
}
