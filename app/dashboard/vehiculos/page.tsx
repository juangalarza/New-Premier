export const dynamic = 'force-dynamic';

import { getVehiculos, getCategorias, getFacturadoPorVehiculo } from './actions';
import { getSucursales } from '@/app/dashboard/sucursales/actions';
import { getUserContext } from '@/lib/auth/getUserContext';
import VehiculosClient from './VehiculosClient';

export default async function VehiculosPage() {
  const ctx = await getUserContext();
  const [vehiculos, categorias, sucursales, facturadoMap] = await Promise.all([
    getVehiculos(ctx?.sucursal_id),
    getCategorias(),
    getSucursales(),
    getFacturadoPorVehiculo(),
  ]);
  return <VehiculosClient vehiculos={vehiculos} categorias={categorias} sucursales={sucursales} facturadoMap={facturadoMap} />;
}
