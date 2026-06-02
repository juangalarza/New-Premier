'use server';

import { createAdminClient } from '@/lib/supabase/admin';
import { TENANT_ID } from '@/lib/constants';
import { enviarEmailConfirmacion, enviarNotificacionAdmin } from '@/lib/resend';

export interface ConfigPublica {
  tenant: { nombre: string; logo_url: string | null; descuento_online_pct: number } | null;
  coberturas: Array<{ id: string; nombre: string; descripcion: string | null; precio_por_dia: number }>;
  adicionales: Array<{ id: string; nombre: string; descripcion: string | null; precio_por_dia: number }>;
}

export async function getConfigPublica(): Promise<ConfigPublica> {
  const supabase = createAdminClient();
  const [tenantRes, cobRes, addRes] = await Promise.all([
    supabase.from('tenants').select('nombre, logo_url, descuento_online_pct').eq('id', TENANT_ID).single(),
    supabase.from('coberturas').select('id, nombre, descripcion, precio_por_dia').eq('tenant_id', TENANT_ID).order('precio_por_dia'),
    supabase.from('adicionales').select('id, nombre, descripcion, precio_por_dia').eq('tenant_id', TENANT_ID).order('precio_por_dia'),
  ]);
  return {
    tenant: tenantRes.data as ConfigPublica['tenant'],
    coberturas: (cobRes.data ?? []) as ConfigPublica['coberturas'],
    adicionales: (addRes.data ?? []) as ConfigPublica['adicionales'],
  };
}

export async function validarCodigoDescuento(codigo: string): Promise<{ pct: number } | null> {
  const supabase = createAdminClient();
  const { data } = await supabase
    .from('descuentos')
    .select('descuento_pct')
    .eq('tenant_id', TENANT_ID)
    .eq('codigo', codigo.toUpperCase().trim())
    .eq('activo', true)
    .maybeSingle();
  if (!data) return null;
  return { pct: (data as { descuento_pct: number }).descuento_pct };
}

export interface ReservaOnlineInput {
  vehiculoId: string;
  vehiculoModelo: string;
  fechaDesde: string;
  fechaHasta: string;
  nombre: string;
  apellido: string;
  email: string;
  telefono: string;
  dni_pasaporte: string;
  licencia_conducir: string;
  ciudad: string;
  pais: string;
  lugarEntrega: string;
  lugarDevolucion: string;
  numeroVuelo: string;
  codigoDescuento: string | null;
  precioBase: number;
  descuentoAplicado: number;
  precioCoberturas: number;
  precioAdicionales: number;
  precioTotal: number;
}

export async function crearReserva(input: ReservaOnlineInput): Promise<{ id: string; numero: string; idCorto: string }> {
  const supabase = createAdminClient();

  // 1. Find or create cliente
  const { data: clienteExistente } = await supabase
    .from('clientes')
    .select('id')
    .eq('tenant_id', TENANT_ID)
    .eq('email', input.email.toLowerCase().trim())
    .maybeSingle();

  let clienteId: string;

  if (clienteExistente) {
    clienteId = (clienteExistente as { id: string }).id;
    await supabase
      .from('clientes')
      .update({
        nombre: input.nombre,
        apellido: input.apellido,
        telefono: input.telefono,
        dni_pasaporte: input.dni_pasaporte,
        licencia_conducir: input.licencia_conducir,
        ciudad: input.ciudad,
        pais: input.pais,
      } as never)
      .eq('id', clienteId);
  } else {
    const { data: newCliente, error } = await supabase
      .from('clientes')
      .insert({
        tenant_id: TENANT_ID,
        nombre: input.nombre,
        apellido: input.apellido,
        email: input.email.toLowerCase().trim(),
        telefono: input.telefono,
        dni_pasaporte: input.dni_pasaporte,
        licencia_conducir: input.licencia_conducir,
        ciudad: input.ciudad,
        pais: input.pais,
      } as never)
      .select('id')
      .single();
    if (error || !newCliente) throw new Error(`Error creando cliente: ${error?.message}`);
    clienteId = (newCliente as { id: string }).id;
  }

  // 2. Generate identifiers
  const idCorto = Math.random().toString(36).toUpperCase().slice(2, 8);
  const numero = `RES-${Date.now().toString(36).toUpperCase()}`;

  // 3. Insert reserva
  const { data: reserva, error: reservaError } = await supabase
    .from('reservas')
    .insert({
      tenant_id: TENANT_ID,
      numero,
      id_corto: idCorto,
      vehiculo_id: input.vehiculoId,
      cliente_id: clienteId,
      fecha_entrega: input.fechaDesde,
      fecha_devolucion: input.fechaHasta,
      lugar_entrega: input.lugarEntrega,
      lugar_devolucion: input.lugarDevolucion,
      numero_vuelo: input.numeroVuelo || null,
      codigo_descuento: input.codigoDescuento || null,
      precio_base: input.precioBase,
      descuento_aplicado: input.descuentoAplicado,
      precio_coberturas: input.precioCoberturas,
      precio_adicionales: input.precioAdicionales,
      precio_total: input.precioTotal,
      total_pagado: 0,
      estado: 'preventa',
    } as never)
    .select('id, numero, id_corto')
    .single();

  if (reservaError || !reserva) throw new Error(`Error creando reserva: ${reservaError?.message}`);

  const r = reserva as { id: string; numero: string; id_corto: string };

  // Fetch tenant name for branded email
  const { data: tenantData } = await supabase
    .from('tenants')
    .select('nombre')
    .eq('id', TENANT_ID)
    .single();
  const empresa = (tenantData as { nombre?: string } | null)?.nombre ?? 'RentaCore';

  // Fire emails without blocking the response
  void enviarEmailConfirmacion({
    to: input.email,
    nombre: input.nombre,
    numero: r.numero,
    vehiculo: input.vehiculoModelo,
    fechaEntrega: input.fechaDesde,
    fechaDevolucion: input.fechaHasta,
    lugarEntrega: input.lugarEntrega,
    lugarDevolucion: input.lugarDevolucion,
    precioTotal: input.precioTotal,
    empresa,
  });

  void enviarNotificacionAdmin({
    numero: r.numero,
    clienteNombre: `${input.nombre} ${input.apellido}`,
    clienteEmail: input.email,
    clienteTelefono: input.telefono,
    vehiculo: input.vehiculoModelo,
    fechaEntrega: input.fechaDesde,
    fechaDevolucion: input.fechaHasta,
    lugarEntrega: input.lugarEntrega,
    precioTotal: input.precioTotal,
  });

  return { id: r.id, numero: r.numero, idCorto: r.id_corto };
}
