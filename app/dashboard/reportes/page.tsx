import { getReportesData } from './actions';
import ReportesClient from './ReportesClient';

export default async function ReportesPage() {
  const año = new Date().getFullYear();
  const data = await getReportesData(año);
  return <ReportesClient dataInicial={data} añoInicial={año} />;
}
