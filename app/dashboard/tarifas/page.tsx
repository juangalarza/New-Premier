export const dynamic = 'force-dynamic';

import { getTarifaMatrix } from './actions';
import TarifasClient from './TarifasClient';

export default async function TarifasPage() {
  const matrix = await getTarifaMatrix();
  return <TarifasClient matrixInicial={matrix} />;
}
