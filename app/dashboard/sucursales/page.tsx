export const dynamic = 'force-dynamic';

import { getSucursales } from './actions';
import SucursalesClient from './SucursalesClient';

export default async function SucursalesPage() {
  const sucursales = await getSucursales();
  return <SucursalesClient sucursales={sucursales} />;
}
