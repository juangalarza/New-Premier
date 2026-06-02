import { MercadoPagoConfig, Preference } from 'mercadopago';

function getClient() {
  return new MercadoPagoConfig({ accessToken: process.env.MP_ACCESS_TOKEN! });
}

export async function crearPreferenciaMP(reserva: {
  id: string;
  numero: string;
  vehiculoModelo: string;
  precioTotal: number;
}) {
  const preference = new Preference(getClient());
  return preference.create({
    body: {
      items: [
        {
          id: reserva.id,
          title: `Reserva #${reserva.numero} — ${reserva.vehiculoModelo}`,
          quantity: 1,
          unit_price: reserva.precioTotal,
          currency_id: 'ARS',
        },
      ],
      back_urls: {
        success: `${process.env.NEXT_PUBLIC_URL}/confirmacion?reserva=${reserva.id}&status=aprobado`,
        failure: `${process.env.NEXT_PUBLIC_URL}/reservar?error=pago_fallido`,
        pending: `${process.env.NEXT_PUBLIC_URL}/confirmacion?reserva=${reserva.id}&status=pendiente`,
      },
      auto_return: 'approved',
      external_reference: reserva.id,
      notification_url: `${process.env.NEXT_PUBLIC_URL}/api/mercadopago/webhook`,
    },
  });
}
