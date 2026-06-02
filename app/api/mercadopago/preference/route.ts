import { NextRequest, NextResponse } from 'next/server';
import { crearPreferenciaMP } from '@/lib/mercadopago';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { reservaId, numero, vehiculoModelo, precioTotal } = body as {
      reservaId: string;
      numero: string;
      vehiculoModelo: string;
      precioTotal: number;
    };

    if (!reservaId || !numero || !precioTotal) {
      return NextResponse.json({ error: 'Faltan campos requeridos' }, { status: 400 });
    }

    const preference = await crearPreferenciaMP({
      id: reservaId,
      numero,
      vehiculoModelo: vehiculoModelo ?? 'Vehículo',
      precioTotal,
    });

    return NextResponse.json({ init_point: preference.init_point, id: preference.id });
  } catch (err) {
    console.error('MP preference error:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Error al crear preferencia' },
      { status: 500 }
    );
  }
}
