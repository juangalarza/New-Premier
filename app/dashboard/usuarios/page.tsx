import { getUsuarios } from './actions';
import UsuariosClient from './UsuariosClient';

export default async function UsuariosPage() {
  const usuarios = await getUsuarios();
  return <UsuariosClient usuariosIniciales={usuarios} />;
}
