import type { Metadata } from 'next';
import { getConfigPublica } from './actions';
import ReservarClient from './ReservarClient';

export const metadata: Metadata = {
  title: 'Reservar vehículo — Finda Car Rental Argentina',
};

interface Props {
  searchParams: Promise<{ desde?: string; hasta?: string }>;
}

function getToday() {
  return new Date().toISOString().split('T')[0];
}
function getTomorrow() {
  return new Date(Date.now() + 2 * 86400000).toISOString().split('T')[0];
}

export default async function ReservarPage({ searchParams }: Props) {
  const params = await searchParams;
  const { coberturas, adicionales, tenant } = await getConfigPublica();

  const initialDesde = params.desde ?? getToday();
  const initialHasta = params.hasta ?? getTomorrow();

  return (
    <ReservarClient
      initialDesde={initialDesde}
      initialHasta={initialHasta}
      coberturas={coberturas}
      adicionales={adicionales}
      descuentoOnlinePct={tenant?.descuento_online_pct ?? 20}
      tenantNombre={tenant?.nombre ?? 'Finda Car Rental Argentina'}
    />
  );
}
