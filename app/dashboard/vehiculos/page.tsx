export const dynamic = 'force-dynamic';

import { getVehiculos, getCategorias } from './actions';
import { getSucursales } from '@/app/dashboard/sucursales/actions';
import VehiculosClient from './VehiculosClient';

export default async function VehiculosPage() {
  const [vehiculos, categorias, sucursales] = await Promise.all([
    getVehiculos(), getCategorias(), getSucursales(),
  ]);
  return <VehiculosClient vehiculos={vehiculos} categorias={categorias} sucursales={sucursales} />;
}
