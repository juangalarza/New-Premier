import { getReservas, getClientes, getCoberturas, getAdicionales, getCategoriasConTarifas } from './actions';
import ReservasClient from './ReservasClient';

export default async function ReservasPage() {
  const [reservas, clientes, coberturas, adicionales, categorias] = await Promise.all([
    getReservas(),
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
