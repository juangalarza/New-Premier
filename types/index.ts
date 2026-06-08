export type EstadoReserva = 'preventa' | 'pendiente' | 'confirmada' | 'en_curso' | 'devuelta' | 'cancelada';
export type EstadoVehiculo = 'disponible' | 'alquilado' | 'taller' | 'bloqueado';
export type CombustibleNivel = '1/8' | '1/4' | '1/2' | '3/4' | 'lleno';
export type TemporadaNombre = 'baja' | 'media' | 'alta';
export type RolUsuario = 'admin' | 'operador';

export interface Tenant {
  id: string;
  nombre: string;
  logo_url: string | null;
  descuento_online_pct: number;
  created_at: string;
}

export interface Categoria {
  id: string;
  tenant_id: string;
  nombre: string;
  descripcion: string | null;
  created_at: string;
}

export interface Vehiculo {
  id: string;
  tenant_id: string;
  patente: string;
  marca: string;
  modelo: string;
  categoria_id: string;
  color: string | null;
  anio: number;
  km_actual: number;
  combustible_actual: CombustibleNivel;
  estado: EstadoVehiculo;
  es_propio: boolean;
  foto_url: string | null;
  sucursal_id: string | null;
  created_at: string;
  categoria?: Categoria;
  sucursal?: Sucursal;
}

export interface Cliente {
  id: string;
  tenant_id: string;
  nombre: string;
  apellido: string;
  email: string;
  telefono: string;
  dni_pasaporte: string;
  licencia_conducir: string;
  ciudad: string;
  pais: string;
  fecha_nacimiento: string | null;
  direccion: string | null;
  created_at: string;
}

export interface Cobertura {
  id: string;
  tenant_id: string;
  nombre: string;
  descripcion: string | null;
  precio_por_dia: number;
  created_at: string;
}

export interface Adicional {
  id: string;
  tenant_id: string;
  nombre: string;
  descripcion: string | null;
  precio_por_dia: number;
  created_at: string;
}

export interface Temporada {
  id: string;
  tenant_id: string;
  nombre: TemporadaNombre;
  fecha_inicio: string;
  fecha_fin: string;
  created_at: string;
}

export interface Tarifa {
  id: string;
  tenant_id: string;
  categoria_id: string;
  temporada_id: string;
  precio_por_dia: number;
  created_at: string;
  categoria?: Categoria;
  temporada?: Temporada;
}

export interface Reserva {
  id: string;
  tenant_id: string;
  numero: string;
  id_corto: string;
  vehiculo_id: string | null;
  cliente_id: string;
  fecha_entrega: string;
  fecha_devolucion: string;
  lugar_entrega: string;
  lugar_devolucion: string;
  numero_vuelo: string | null;
  codigo_descuento: string | null;
  precio_base: number;
  descuento_aplicado: number;
  precio_coberturas: number;
  precio_adicionales: number;
  precio_total: number;
  total_pagado: number;
  estado: EstadoReserva;
  km_contratados: number | null;
  km_entrega: number | null;
  km_devolucion: number | null;
  combustible_entrega: CombustibleNivel | null;
  combustible_devolucion: CombustibleNivel | null;
  factura_cae: string | null;
  factura_vto: string | null;
  observaciones: string | null;
  created_at: string;
  vehiculo?: Vehiculo;
  cliente?: Cliente;
}

export interface Pago {
  id: string;
  tenant_id: string;
  reserva_id: string;
  monto: number;
  metodo: string;
  referencia: string | null;
  mp_payment_id: string | null;
  created_at: string;
}

export interface Sucursal {
  id: string;
  tenant_id: string;
  nombre: string;
  direccion: string | null;
  telefono: string | null;
  email: string | null;
  activa: boolean;
  created_at: string;
}

export interface BloqueoVehiculo {
  id: string;
  tenant_id: string;
  vehiculo_id: string;
  fecha_inicio: string;
  fecha_fin: string;
  motivo: string | null;
  created_at: string;
}

export interface Descuento {
  id: string;
  tenant_id: string;
  codigo: string;
  descuento_pct: number;
  activo: boolean;
  created_at: string;
}

export type TipoMantenimiento = 'service' | 'vtv' | 'neumaticos' | 'frenos' | 'aceite' | 'otro';
export type EstadoMantenimiento = 'pendiente' | 'en_proceso' | 'realizado';

export interface Mantenimiento {
  id: string;
  tenant_id: string;
  vehiculo_id: string;
  tipo: TipoMantenimiento;
  descripcion: string;
  fecha_programada: string;
  fecha_realizada: string | null;
  km_al_realizar: number | null;
  km_proximo: number | null;
  costo: number | null;
  proveedor: string | null;
  observaciones: string | null;
  estado: EstadoMantenimiento;
  created_at: string;
  vehiculo?: { id: string; patente: string; marca: string; modelo: string; foto_url: string | null };
}

// Dashboard types
export interface DashboardKPIs {
  ingresosMes: number;
  ingresosMesAnterior: number;
  totalVehiculos: number;
  vehiculosPropios: number;
  vehiculosNoPropios: number;
  disponibles: number;
  alquilados: number;
  ocupacionPct: number;
}

export interface ChartDataItem {
  mes: string;
  año2024: number;
  año2025: number;
  año2026: number;
}

export interface RankingVehiculo {
  vehiculo_id: string;
  patente: string;
  marca: string;
  modelo: string;
  foto_url: string | null;
  total_reservas: number;
  total_facturado: number;
}

export interface EntregaHoy {
  id: string;
  numero: string;
  fecha_entrega: string;
  lugar_entrega: string;
  cliente_nombre: string;
  cliente_apellido: string;
  patente: string | null;
  modelo: string | null;
}
