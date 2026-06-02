export const dynamic = 'force-dynamic';

import { getMantenimientos, getVehiculosParaMantenimiento } from './actions';
import MantenimientoClient from './MantenimientoClient';

export default async function MantenimientoPage() {
  const [mantenimientos, vehiculos] = await Promise.all([
    getMantenimientos().catch(() => []),
    getVehiculosParaMantenimiento().catch(() => []),
  ]);

  return <MantenimientoClient mantenimientos={mantenimientos} vehiculos={vehiculos} />;
}
