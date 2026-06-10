export const dynamic = 'force-dynamic';

import { notFound } from 'next/navigation';
import { getVehiculoById, getReservasVehiculo } from './actions';
import VehiculoDetalleClient from './VehiculoDetalleClient';

export default async function VehiculoDetallePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [vehiculo, reservas] = await Promise.all([
    getVehiculoById(id),
    getReservasVehiculo(id),
  ]);
  if (!vehiculo) notFound();
  return <VehiculoDetalleClient vehiculo={vehiculo} reservas={reservas} />;
}
