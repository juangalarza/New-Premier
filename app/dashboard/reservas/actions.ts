'use server';

import { revalidatePath } from 'next/cache';
import { createAdminClient } from '@/lib/supabase/admin';
import { TENANT_ID } from '@/lib/constants';
import { enviarEmailConfirmacion } from '@/lib/resend';
import type { Reserva, EstadoReserva, Vehiculo, Cobertura, Adicional } from '@/types';

export type ReservaConRelaciones = Omit<Reserva, 'cliente' | 'vehiculo'> & {
  cliente: {
    id: string;
    nombre: string;
    apellido: string;
    email: string;
    telefono: string;
    dni_pasaporte: string;
    licencia_conducir: string;
    fecha_nacimiento: string | null;
  };
  vehiculo: {
    id: string;
    patente: string;
    modelo: string;
    foto_url: string | null;
    categoria: { id: string; nombre: string } | null;
  } | null;
};

export type ReservaFiltros = {
  fechaDesde?: string;
  fechaHasta?: string;
  estado?: string;
  busqueda?: string;
};

export async function getReservas(filtros: ReservaFiltros = {}): Promise<ReservaConRelaciones[]> {
  const supabase = createAdminClient();

  let query = supabase
    .from('reservas')
    .select(`
      *,
      cliente:clientes(id, nombre, apellido, email, telefono, dni_pasaporte, licencia_conducir, fecha_nacimiento),
      vehiculo:vehiculos(id, patente, modelo, foto_url, categoria:categorias(id, nombre))
    `)
    .eq('tenant_id', TENANT_ID)
    .order('created_at', { ascending: false });

  if (filtros.fechaDesde) query = query.gte('fecha_entrega', filtros.fechaDesde);
  if (filtros.fechaHasta) query = query.lte('fecha_entrega', `${filtros.fechaHasta}T23:59:59`);
  if (filtros.estado && filtros.estado !== 'todos') query = query.eq('estado', filtros.estado);

  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return (data ?? []) as unknown as ReservaConRelaciones[];
}

export async function getReserva(id: string): Promise<ReservaConRelaciones> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from('reservas')
    .select(`
      *,
      cliente:clientes(id, nombre, apellido, email, telefono, dni_pasaporte, licencia_conducir, fecha_nacimiento),
      vehiculo:vehiculos(id, patente, modelo, foto_url, categoria:categorias(id, nombre))
    `)
    .eq('id', id)
    .eq('tenant_id', TENANT_ID)
    .single();

  if (error) throw new Error(error.message);
  return data as unknown as ReservaConRelaciones;
}

export async function getClientes() {
  const supabase = createAdminClient();
  const { data } = await supabase
    .from('clientes')
    .select('id, nombre, apellido, email')
    .eq('tenant_id', TENANT_ID)
    .order('apellido');
  return data ?? [];
}

export async function getCoberturas(): Promise<Cobertura[]> {
  const supabase = createAdminClient();
  const { data } = await supabase
    .from('coberturas')
    .select('*')
    .eq('tenant_id', TENANT_ID)
    .order('nombre');
  return data ?? [];
}

export async function getAdicionales(): Promise<Adicional[]> {
  const supabase = createAdminClient();
  const { data } = await supabase
    .from('adicionales')
    .select('*')
    .eq('tenant_id', TENANT_ID)
    .order('nombre');
  return data ?? [];
}

export async function getVehiculosDisponibles(
  fechaDesde: string,
  fechaHasta: string,
  excludeReservaId?: string
): Promise<Vehiculo[]> {
  const supabase = createAdminClient();

  const { data: reservasBloqueadas } = await supabase
    .from('reservas')
    .select('vehiculo_id')
    .eq('tenant_id', TENANT_ID)
    .in('estado', ['pendiente', 'confirmada', 'en_curso'])
    .lt('fecha_entrega', fechaHasta)
    .gt('fecha_devolucion', fechaDesde)
    .not('vehiculo_id', 'is', null);

  const { data: bloqueos } = await supabase
    .from('bloqueos_vehiculo')
    .select('vehiculo_id')
    .eq('tenant_id', TENANT_ID)
    .lt('fecha_inicio', fechaHasta)
    .gt('fecha_fin', fechaDesde);

  type IdRow = { vehiculo_id: string | null };
  const idsOcupados = new Set([
    ...((reservasBloqueadas ?? []) as unknown as IdRow[])
      .map(r => r.vehiculo_id)
      .filter(id => id && id !== excludeReservaId),
    ...((bloqueos ?? []) as unknown as IdRow[]).map(b => b.vehiculo_id),
  ]);

  const { data } = await supabase
    .from('vehiculos')
    .select('*, categoria:categorias(id, nombre, descripcion, tenant_id, created_at)')
    .eq('tenant_id', TENANT_ID)
    .eq('estado', 'disponible')
    .order('patente');

  return ((data ?? []) as Vehiculo[]).filter(v => !idsOcupados.has(v.id));
}

export async function buscarClientesPorDNI(
  dni: string
): Promise<{ id: string; nombre: string; apellido: string; dni_pasaporte: string; email: string }[]> {
  if (dni.length < 5) return [];
  const supabase = createAdminClient();
  const { data } = await supabase
    .from('clientes')
    .select('id, nombre, apellido, dni_pasaporte, email')
    .eq('tenant_id', TENANT_ID)
    .ilike('dni_pasaporte', `%${dni}%`)
    .limit(6);
  return (data ?? []) as any;
}

export async function buscarClientesPorNombre(
  query: string
): Promise<{ id: string; nombre: string; apellido: string; dni_pasaporte: string; email: string }[]> {
  const q = query.trim();
  if (q.length < 2) return [];
  const supabase = createAdminClient();
  const isNumeric = /^\d{7,8}$/.test(q);
  const orFilter = isNumeric
    ? `nombre.ilike.%${q}%,apellido.ilike.%${q}%,dni_pasaporte.eq.${q}`
    : `nombre.ilike.%${q}%,apellido.ilike.%${q}%`;
  const { data } = await supabase
    .from('clientes')
    .select('id, nombre, apellido, dni_pasaporte, email')
    .eq('tenant_id', TENANT_ID)
    .or(orFilter)
    .order('apellido', { ascending: true })
    .limit(10);
  return (data ?? []) as any;
}

export async function getCategoriasConTarifas() {
  const supabase = createAdminClient();
  const { data } = await supabase
    .from('categorias')
    .select('id, nombre')
    .eq('tenant_id', TENANT_ID)
    .order('nombre');
  return data ?? [];
}

function generarNumero(): string {
  const now = new Date();
  const yy = now.getFullYear().toString().slice(-2);
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  const rand = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `R-${yy}${mm}-${rand}`;
}

function generarIdCorto(): string {
  return Math.random().toString(36).slice(2, 8).toUpperCase();
}

export type NuevaReservaData = {
  cliente_id: string;
  vehiculo_id?: string;
  fecha_entrega: string;
  fecha_devolucion: string;
  lugar_entrega: string;
  lugar_devolucion: string;
  numero_vuelo?: string;
  cobertura_id?: string;
  adicional_ids?: string[];
  precio_base: number;
  descuento_aplicado?: number;
  km_contratados?: number;
  observaciones?: string;
};

export async function crearReserva(data: NuevaReservaData): Promise<string> {
  const supabase = createAdminClient();

  let precio_coberturas = 0;
  let precio_adicionales = 0;

  const dias = Math.ceil(
    (new Date(data.fecha_devolucion).getTime() - new Date(data.fecha_entrega).getTime()) / 86400000
  );

  if (data.vehiculo_id) {
    const disponibles = await getVehiculosDisponibles(data.fecha_entrega, data.fecha_devolucion);
    if (!disponibles.some(v => v.id === data.vehiculo_id)) {
      throw new Error('El vehículo no está disponible para esas fechas');
    }
  }

  type PrecioRow = { precio_por_dia: number };
  if (data.cobertura_id) {
    const { data: cob } = await supabase
      .from('coberturas')
      .select('precio_por_dia')
      .eq('id', data.cobertura_id)
      .single();
    if (cob) precio_coberturas = (cob as unknown as PrecioRow).precio_por_dia * dias;
  }

  if (data.adicional_ids?.length) {
    const { data: adds } = await supabase
      .from('adicionales')
      .select('precio_por_dia')
      .in('id', data.adicional_ids);
    precio_adicionales = ((adds ?? []) as unknown as PrecioRow[]).reduce((s, a) => s + a.precio_por_dia * dias, 0);
  }

  const descuento = data.descuento_aplicado ?? 0;
  const precio_total = data.precio_base - descuento + precio_coberturas + precio_adicionales;

  const { data: reserva, error } = await supabase
    .from('reservas')
    .insert({
      tenant_id: TENANT_ID,
      numero: generarNumero(),
      id_corto: generarIdCorto(),
      cliente_id: data.cliente_id,
      vehiculo_id: data.vehiculo_id || null,
      fecha_entrega: data.fecha_entrega,
      fecha_devolucion: data.fecha_devolucion,
      lugar_entrega: data.lugar_entrega,
      lugar_devolucion: data.lugar_devolucion,
      numero_vuelo: data.numero_vuelo || null,
      precio_base: data.precio_base,
      descuento_aplicado: descuento,
      precio_coberturas,
      precio_adicionales,
      precio_total,
      total_pagado: 0,
      km_contratados: data.km_contratados ?? 0,
      estado: 'confirmada',
      observaciones: data.observaciones || null,
    } as never)
    .select('id, numero')
    .single();

  if (error) throw new Error(error.message);

  const res = reserva as unknown as { id: string; numero: string };

  // Fetch cliente email to send confirmation if available
  const { data: cliente } = await supabase
    .from('clientes')
    .select('nombre, apellido, email')
    .eq('id', data.cliente_id)
    .single();

  type ClienteRow = { nombre: string; apellido: string; email: string } | null;
  const c = cliente as unknown as ClienteRow;

  if (c?.email) {
    const { data: veh } = await supabase
      .from('vehiculos')
      .select('modelo, patente')
      .eq('id', data.vehiculo_id ?? '')
      .maybeSingle();
    type VehRow = { modelo: string; patente: string } | null;
    const v = veh as unknown as VehRow;

    void enviarEmailConfirmacion({
      to: c.email,
      nombre: c.nombre,
      numero: res.numero,
      vehiculo: v ? `${v.modelo} (${v.patente})` : 'Por asignar',
      fechaEntrega: data.fecha_entrega,
      fechaDevolucion: data.fecha_devolucion,
      lugarEntrega: data.lugar_entrega,
      lugarDevolucion: data.lugar_devolucion,
      precioTotal: precio_total,
    });
  }

  revalidatePath('/dashboard/reservas');
  revalidatePath('/dashboard/calendario');
  revalidatePath('/dashboard');
  return res.id;
}

export async function cambiarEstado(
  id: string,
  estado: EstadoReserva,
  extra?: {
    km_entrega?: number;
    combustible_entrega?: string;
    km_devolucion?: number;
    combustible_devolucion?: string;
    vehiculo_id?: string;
  }
) {
  const supabase = createAdminClient();
  const update: Record<string, unknown> = { estado };
  if (extra?.km_entrega !== undefined) update.km_entrega = extra.km_entrega;
  if (extra?.combustible_entrega) update.combustible_entrega = extra.combustible_entrega;
  if (extra?.km_devolucion !== undefined) update.km_devolucion = extra.km_devolucion;
  if (extra?.combustible_devolucion) update.combustible_devolucion = extra.combustible_devolucion;
  if (extra?.vehiculo_id) update.vehiculo_id = extra.vehiculo_id;

  const { error } = await supabase
    .from('reservas')
    .update(update as never)
    .eq('id', id)
    .eq('tenant_id', TENANT_ID);

  if (error) throw new Error(error.message);

  // Si se entrega, marcar vehÃ­culo como alquilado
  if (estado === 'en_curso' && extra?.vehiculo_id) {
    await supabase.from('vehiculos').update({ estado: 'alquilado' } as never).eq('id', extra.vehiculo_id);
  }
  // Si se devuelve, marcar vehÃ­culo como disponible
  if (estado === 'devuelta') {
    const { data: res } = await supabase.from('reservas').select('vehiculo_id').eq('id', id).single();
    const resTyped = res as unknown as { vehiculo_id: string | null } | null;
    if (resTyped?.vehiculo_id) {
      await supabase.from('vehiculos').update({ estado: 'disponible' } as never).eq('id', resTyped.vehiculo_id);
    }
  }

  revalidatePath('/dashboard/reservas');
  revalidatePath('/dashboard/calendario');
  revalidatePath('/dashboard');
}

export async function autoAsignarVehiculo(reservaId: string): Promise<string | null> {
  const supabase = createAdminClient();
  const { data: res } = await supabase
    .from('reservas')
    .select('fecha_entrega, fecha_devolucion, vehiculo_id')
    .eq('id', reservaId)
    .single();

  const resTyped2 = res as unknown as { fecha_entrega: string; fecha_devolucion: string; vehiculo_id: string | null } | null;
  if (!resTyped2 || resTyped2.vehiculo_id) return null;

  const disponibles = await getVehiculosDisponibles(resTyped2.fecha_entrega, resTyped2.fecha_devolucion, reservaId);
  if (!disponibles.length) return null;

  const vehiculo = disponibles[0];
  await cambiarEstado(reservaId, 'confirmada', { vehiculo_id: vehiculo.id });
  return vehiculo.id;
}

export async function cargarPago(
  reservaId: string,
  monto: number,
  metodo: string,
  referencia: string
) {
  const supabase = createAdminClient();

  const { error: pagoError } = await supabase.from('pagos').insert({
    tenant_id: TENANT_ID,
    reserva_id: reservaId,
    monto,
    metodo,
    referencia: referencia || null,
  } as never);
  if (pagoError) throw new Error(pagoError.message);

  // Actualizar total_pagado en la reserva
  const { data: res } = await supabase
    .from('reservas')
    .select('total_pagado')
    .eq('id', reservaId)
    .single();

  if (res) {
    const resTP = res as unknown as { total_pagado: number };
    await supabase
      .from('reservas')
      .update({ total_pagado: (resTP.total_pagado ?? 0) + monto } as never)
      .eq('id', reservaId);
  }

  revalidatePath('/dashboard/reservas');
}

export async function calcularCotizacion(
  fechaDesde: string,
  fechaHasta: string,
  categoriaId: string
): Promise<number | null> {
  const supabase = createAdminClient();
  const dias = Math.ceil(
    (new Date(fechaHasta).getTime() - new Date(fechaDesde).getTime()) / 86400000
  );
  if (dias <= 0) return null;

  const { data: temporadas } = await supabase
    .from('temporadas')
    .select('id, fecha_inicio, fecha_fin')
    .eq('tenant_id', TENANT_ID);

  type TempR = { id: string; fecha_inicio: string; fecha_fin: string };
  const temporada = ((temporadas ?? []) as unknown as TempR[]).find(t => {
    const inicio = new Date(t.fecha_inicio);
    const fin = new Date(t.fecha_fin);
    const desde = new Date(fechaDesde);
    return desde >= inicio && desde <= fin;
  });

  if (!temporada) return null;

  const { data: tarifa } = await supabase
    .from('tarifas')
    .select('precio_por_dia')
    .eq('tenant_id', TENANT_ID)
    .eq('categoria_id', categoriaId)
    .eq('temporada_id', temporada.id)
    .single();

  if (!tarifa) return null;
  return dias * (tarifa as unknown as { precio_por_dia: number }).precio_por_dia;
}

export async function actualizarObservaciones(id: string, observaciones: string) {
  const supabase = createAdminClient();
  await supabase
    .from('reservas')
    .update({ observaciones } as never)
    .eq('id', id)
    .eq('tenant_id', TENANT_ID);
  revalidatePath('/dashboard/reservas');
}

export type ActualizarReservaData = {
  fecha_entrega: string;
  fecha_devolucion: string;
  lugar_entrega: string;
  lugar_devolucion: string;
  vehiculo_id: string | null;
  precio_total: number;
};

export async function actualizarReserva(id: string, data: ActualizarReservaData): Promise<void> {
  const supabase = createAdminClient();

  if (new Date(data.fecha_devolucion) <= new Date(data.fecha_entrega)) {
    throw new Error('La fecha de devolución debe ser posterior a la de entrega');
  }

  if (data.vehiculo_id) {
    const { data: conflictos } = await supabase
      .from('reservas')
      .select('id')
      .eq('tenant_id', TENANT_ID)
      .eq('vehiculo_id', data.vehiculo_id)
      .in('estado', ['pendiente', 'confirmada', 'en_curso'])
      .lt('fecha_entrega', data.fecha_devolucion)
      .gt('fecha_devolucion', data.fecha_entrega)
      .neq('id', id);

    if ((conflictos?.length ?? 0) > 0) {
      throw new Error('El vehículo no está disponible para esas fechas');
    }
  }

  const { error } = await supabase
    .from('reservas')
    .update({
      fecha_entrega: data.fecha_entrega,
      fecha_devolucion: data.fecha_devolucion,
      lugar_entrega: data.lugar_entrega,
      lugar_devolucion: data.lugar_devolucion,
      vehiculo_id: data.vehiculo_id,
      precio_total: data.precio_total,
    } as never)
    .eq('id', id)
    .eq('tenant_id', TENANT_ID);

  if (error) throw new Error(error.message);
  revalidatePath('/dashboard/reservas');
  revalidatePath('/dashboard/calendario');
}
