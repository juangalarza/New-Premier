import { getVehiculos, getCategorias } from './actions';
import VehiculosClient from './VehiculosClient';

export default async function VehiculosPage() {
  const [vehiculos, categorias] = await Promise.all([getVehiculos(), getCategorias()]);
  return <VehiculosClient vehiculos={vehiculos} categorias={categorias} />;
}
