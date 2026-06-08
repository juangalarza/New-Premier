import { getReportesData, getReportesExtra } from './actions';
import ReportesClient from './ReportesClient';

export default async function ReportesPage() {
  const año = new Date().getFullYear();
  const [data, extra] = await Promise.all([
    getReportesData(año),
    getReportesExtra(año),
  ]);
  return <ReportesClient dataInicial={data} extraInicial={extra} añoInicial={año} />;
}
