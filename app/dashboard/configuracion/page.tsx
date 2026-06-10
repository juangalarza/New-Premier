export const dynamic = 'force-dynamic';

import { getTenant, getCoberturas, getAdicionales, getDescuentos, getCategoriasGasto } from './actions';
import ConfiguracionClient from './ConfiguracionClient';

export default async function ConfiguracionPage() {
  const [tenant, coberturas, adicionales, descuentos, categoriasGasto] = await Promise.all([
    getTenant(),
    getCoberturas(),
    getAdicionales(),
    getDescuentos(),
    getCategoriasGasto(),
  ]);
  return (
    <ConfiguracionClient
      tenantInicial={tenant}
      coberturasIniciales={coberturas}
      adicionalesIniciales={adicionales}
      descuentosIniciales={descuentos}
      categoriasGastoIniciales={categoriasGasto}
    />
  );
}
