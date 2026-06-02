import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { enviarEmailConfirmacion } from '@/lib/resend';

type ReservaConRelaciones = {
  id: string;
  tenant_id: string;
  numero: string;
  precio_total: number;
  fecha_entrega: string;
  fecha_devolucion: string;
  lugar_entrega: string;
  lugar_devolucion: string;
  cliente: { nombre: string; apellido: string; email: string } | null;
  vehiculo: { marca: string; modelo: string } | null;
};

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // MP sends various notification types — only handle payments
    if (body.type !== 'payment') {
      return NextResponse.json({ ok: true });
    }

    const paymentId = body.data?.id;
    if (!paymentId) return NextResponse.json({ ok: true });

    // Fetch payment details from MP REST API
    const mpRes = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
      headers: { Authorization: `Bearer ${process.env.MP_ACCESS_TOKEN}` },
    });
    if (!mpRes.ok) return NextResponse.json({ ok: true });

    const payment = await mpRes.json();
    if (payment.status !== 'approved') return NextResponse.json({ ok: true });

    const reservaId: string = payment.external_reference;
    if (!reservaId) return NextResponse.json({ ok: true });

    const supabase = createAdminClient();

    // Get reserva with cliente and vehiculo
    const { data: reservaRaw } = await supabase
      .from('reservas')
      .select('id, tenant_id, numero, precio_total, fecha_entrega, fecha_devolucion, lugar_entrega, lugar_devolucion, cliente:clientes(nombre, apellido, email), vehiculo:vehiculos(marca, modelo)')
      .eq('id', reservaId)
      .single();

    if (!reservaRaw) return NextResponse.json({ ok: true });

    const reserva = reservaRaw as unknown as ReservaConRelaciones;

    // Update reserva to confirmed
    await supabase
      .from('reservas')
      .update({ estado: 'confirmada', total_pagado: payment.transaction_amount } as never)
      .eq('id', reservaId);

    // Insert pago record
    await supabase.from('pagos').insert({
      tenant_id: reserva.tenant_id,
      reserva_id: reservaId,
      monto: payment.transaction_amount,
      metodo: 'mercadopago',
      referencia: `MP-${paymentId}`,
      mp_payment_id: String(paymentId),
    } as never);

    // Send confirmation email
    if (reserva.cliente?.email) {
      await enviarEmailConfirmacion({
        to: reserva.cliente.email,
        nombre: reserva.cliente.nombre,
        numero: reserva.numero,
        vehiculo: reserva.vehiculo
          ? `${reserva.vehiculo.marca} ${reserva.vehiculo.modelo}`
          : 'Pendiente de asignación',
        fechaEntrega: reserva.fecha_entrega,
        fechaDevolucion: reserva.fecha_devolucion,
        lugarEntrega: reserva.lugar_entrega,
        lugarDevolucion: reserva.lugar_devolucion,
        precioTotal: reserva.precio_total,
      });
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('MP webhook error:', err);
    // Always return 200 — MP will retry on 4xx/5xx
    return NextResponse.json({ ok: true });
  }
}
