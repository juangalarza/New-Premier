export const dynamic = 'force-dynamic';

import { getGanttData, getSucursalesCalendario, getCategoriasCalendario } from './actions';
import { getUserContext } from '@/lib/auth/getUserContext';
import GanttCalendar from '@/components/admin/GanttCalendar';

export default async function CalendarioPage() {
  const now = new Date();
  const ctx = await getUserContext();
  const sid = ctx?.sucursal_id ?? null;

  const [data, sucursales, categorias] = await Promise.all([
    getGanttData(now.getFullYear(), now.getMonth() + 1, 1, sid),
    getSucursalesCalendario(),
    getCategoriasCalendario(),
  ]);
  return (
    <GanttCalendar
      vehiculosIniciales={data.vehiculos}
      reservasIniciales={data.reservas}
      añoInicial={now.getFullYear()}
      mesInicial={now.getMonth() + 1}
      sucursalesIniciales={sucursales}
      categoriasIniciales={categorias}
      sucursalFija={sid}
    />
  );
}
