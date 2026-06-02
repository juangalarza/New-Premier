import { getTenant, getCoberturas, getAdicionales, getDescuentos } from './actions';
import ConfiguracionClient from './ConfiguracionClient';

export default async function ConfiguracionPage() {
  const [tenant, coberturas, adicionales, descuentos] = await Promise.all([
    getTenant(),
    getCoberturas(),
    getAdicionales(),
    getDescuentos(),
  ]);
  return (
    <ConfiguracionClient
      tenantInicial={tenant}
      coberturasIniciales={coberturas}
      adicionalesIniciales={adicionales}
      descuentosIniciales={descuentos}
    />
  );
}
