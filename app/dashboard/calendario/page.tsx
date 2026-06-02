import { getGanttData } from './actions';
import GanttCalendar from '@/components/admin/GanttCalendar';

export default async function CalendarioPage() {
  const now = new Date();
  const data = await getGanttData(now.getFullYear(), now.getMonth() + 1, 1);
  return (
    <GanttCalendar
      vehiculosIniciales={data.vehiculos}
      reservasIniciales={data.reservas}
      añoInicial={now.getFullYear()}
      mesInicial={now.getMonth() + 1}
    />
  );
}
