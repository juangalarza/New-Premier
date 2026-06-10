export const dynamic = 'force-dynamic';

import { getGanttData, getSucursalesCalendario, getCategoriasCalendario } from './actions';
import GanttCalendar from '@/components/admin/GanttCalendar';

export default async function CalendarioPage() {
  const now = new Date();
  const [data, sucursales, categorias] = await Promise.all([
    getGanttData(now.getFullYear(), now.getMonth() + 1, 1),
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
    />
  );
}
