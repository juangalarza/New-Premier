export const dynamic = 'force-dynamic';

import { getUsuarios, getSucursalesParaUsuarios } from './actions';
import UsuariosClient from './UsuariosClient';

export default async function UsuariosPage() {
  const [usuarios, sucursales] = await Promise.all([
    getUsuarios(),
    getSucursalesParaUsuarios(),
  ]);
  return <UsuariosClient usuariosIniciales={usuarios} sucursales={sucursales} />;
}
