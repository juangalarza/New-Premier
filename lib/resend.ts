import { Resend } from 'resend';

export const resend = new Resend(process.env.RESEND_API_KEY);

const FROM = process.env.RESEND_FROM_EMAIL ?? 'noreply@rentacore.ar';

function formatARS(n: number) {
  return new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', minimumFractionDigits: 0 }).format(n);
}

function formatFecha(iso: string) {
  return new Date(iso + 'T12:00:00').toLocaleDateString('es-AR', {
    weekday: 'long', day: '2-digit', month: 'long', year: 'numeric',
  });
}

// ─── Email al cliente ──────────────────────────────────────────────────────

export interface ConfirmacionData {
  to: string;
  nombre: string;
  numero: string;
  vehiculo: string;
  fechaEntrega: string;
  fechaDevolucion: string;
  lugarEntrega: string;
  lugarDevolucion: string;
  precioTotal: number;
  empresa?: string;
}

export async function enviarEmailConfirmacion(data: ConfirmacionData): Promise<void> {
  const empresa = data.empresa ?? 'RentaCore';
  const { error } = await resend.emails.send({
    from: FROM,
    to: data.to,
    subject: `Reserva #${data.numero} confirmada ✓`,
    html: `
<!DOCTYPE html>
<html lang="es">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f1f5f9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f1f5f9;padding:40px 16px">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08)">

        <!-- Header -->
        <tr>
          <td style="background:linear-gradient(135deg,#1A73E8 0%,#0d47a1 100%);padding:32px 40px;text-align:center">
            <div style="width:48px;height:48px;background:rgba(255,255,255,0.15);border-radius:12px;margin:0 auto 12px;display:inline-flex;align-items:center;justify-content:center">
              <span style="font-size:28px">🚗</span>
            </div>
            <h1 style="color:#fff;margin:0;font-size:22px;font-weight:700;letter-spacing:-0.3px">${empresa}</h1>
            <p style="color:rgba(255,255,255,0.8);margin:6px 0 0;font-size:13px">Alquiler de vehículos</p>
          </td>
        </tr>

        <!-- Body -->
        <tr>
          <td style="padding:36px 40px">
            <h2 style="color:#1e293b;margin:0 0 8px;font-size:20px;font-weight:600">¡Hola, ${data.nombre}!</h2>
            <p style="color:#64748b;margin:0 0 28px;line-height:1.6;font-size:15px">
              Tu reserva fue <strong style="color:#16a34a">confirmada exitosamente</strong>. Revisá los detalles a continuación.
            </p>

            <!-- Reservation card -->
            <table width="100%" cellpadding="0" cellspacing="0" style="background:#f8fafc;border-radius:12px;border:1px solid #e2e8f0;overflow:hidden;margin-bottom:28px">
              <tr>
                <td style="background:#1A73E8;padding:12px 20px">
                  <span style="color:#fff;font-weight:700;font-size:13px;letter-spacing:0.5px">RESERVA # ${data.numero}</span>
                </td>
              </tr>
              <tr>
                <td style="padding:20px">
                  <table width="100%" cellpadding="0" cellspacing="0">
                    <tr>
                      <td style="padding:8px 0;border-bottom:1px solid #e2e8f0">
                        <span style="color:#94a3b8;font-size:12px;text-transform:uppercase;letter-spacing:0.5px;display:block;margin-bottom:3px">Vehículo</span>
                        <span style="color:#1e293b;font-weight:600;font-size:15px">${data.vehiculo}</span>
                      </td>
                    </tr>
                    <tr>
                      <td style="padding:8px 0;border-bottom:1px solid #e2e8f0">
                        <span style="color:#94a3b8;font-size:12px;text-transform:uppercase;letter-spacing:0.5px;display:block;margin-bottom:3px">Entrega</span>
                        <span style="color:#1e293b;font-weight:600;font-size:14px">${formatFecha(data.fechaEntrega)}</span>
                        <span style="color:#64748b;font-size:13px;display:block;margin-top:2px">📍 ${data.lugarEntrega}</span>
                      </td>
                    </tr>
                    <tr>
                      <td style="padding:8px 0;border-bottom:1px solid #e2e8f0">
                        <span style="color:#94a3b8;font-size:12px;text-transform:uppercase;letter-spacing:0.5px;display:block;margin-bottom:3px">Devolución</span>
                        <span style="color:#1e293b;font-weight:600;font-size:14px">${formatFecha(data.fechaDevolucion)}</span>
                        <span style="color:#64748b;font-size:13px;display:block;margin-top:2px">📍 ${data.lugarDevolucion}</span>
                      </td>
                    </tr>
                    <tr>
                      <td style="padding:12px 0 4px">
                        <span style="color:#94a3b8;font-size:12px;text-transform:uppercase;letter-spacing:0.5px;display:block;margin-bottom:4px">Total</span>
                        <span style="color:#1A73E8;font-weight:800;font-size:24px">${formatARS(data.precioTotal)}</span>
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>
            </table>

            <p style="color:#94a3b8;font-size:13px;line-height:1.6;margin:0">
              ¿Tenés alguna pregunta? Respondé este correo y te ayudamos a la brevedad.
            </p>
          </td>
        </tr>

        <!-- Footer -->
        <tr>
          <td style="background:#f8fafc;padding:20px 40px;border-top:1px solid #e2e8f0;text-align:center">
            <p style="color:#94a3b8;font-size:12px;margin:0">© ${new Date().getFullYear()} ${empresa} · Powered by RentaCore</p>
          </td>
        </tr>

      </table>
    </td></tr>
  </table>
</body>
</html>
    `,
  });

  if (error) console.error('[Resend] enviarEmailConfirmacion error:', error);
}

// ─── Notificación interna al admin ────────────────────────────────────────

export interface NotificacionAdminData {
  numero: string;
  clienteNombre: string;
  clienteEmail: string;
  clienteTelefono: string;
  vehiculo: string;
  fechaEntrega: string;
  fechaDevolucion: string;
  lugarEntrega: string;
  precioTotal: number;
}

export async function enviarNotificacionAdmin(data: NotificacionAdminData): Promise<void> {
  const { error } = await resend.emails.send({
    from: FROM,
    to: FROM,
    subject: `🔔 Nueva reserva online — #${data.numero}`,
    html: `
<!DOCTYPE html>
<html lang="es">
<head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background:#f1f5f9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f1f5f9;padding:40px 16px">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="max-width:560px;width:100%;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08)">
        <tr>
          <td style="background:#0f172a;padding:20px 28px">
            <span style="color:#fff;font-weight:700;font-size:15px">Nueva reserva online</span>
            <span style="color:#94a3b8;font-size:13px;margin-left:12px">#${data.numero}</span>
          </td>
        </tr>
        <tr>
          <td style="padding:24px 28px">
            <table width="100%" cellpadding="0" cellspacing="0">
              <tr><td style="padding:6px 0;border-bottom:1px solid #f1f5f9"><span style="color:#64748b;font-size:13px;min-width:120px;display:inline-block">Cliente</span><strong style="color:#1e293b">${data.clienteNombre}</strong></td></tr>
              <tr><td style="padding:6px 0;border-bottom:1px solid #f1f5f9"><span style="color:#64748b;font-size:13px;min-width:120px;display:inline-block">Email</span><span style="color:#1e293b">${data.clienteEmail}</span></td></tr>
              <tr><td style="padding:6px 0;border-bottom:1px solid #f1f5f9"><span style="color:#64748b;font-size:13px;min-width:120px;display:inline-block">Teléfono</span><span style="color:#1e293b">${data.clienteTelefono}</span></td></tr>
              <tr><td style="padding:6px 0;border-bottom:1px solid #f1f5f9"><span style="color:#64748b;font-size:13px;min-width:120px;display:inline-block">Vehículo</span><span style="color:#1e293b">${data.vehiculo}</span></td></tr>
              <tr><td style="padding:6px 0;border-bottom:1px solid #f1f5f9"><span style="color:#64748b;font-size:13px;min-width:120px;display:inline-block">Entrega</span><span style="color:#1e293b">${formatFecha(data.fechaEntrega)} — ${data.lugarEntrega}</span></td></tr>
              <tr><td style="padding:6px 0;border-bottom:1px solid #f1f5f9"><span style="color:#64748b;font-size:13px;min-width:120px;display:inline-block">Devolución</span><span style="color:#1e293b">${formatFecha(data.fechaDevolucion)}</span></td></tr>
              <tr><td style="padding:10px 0 4px"><span style="color:#64748b;font-size:13px;min-width:120px;display:inline-block">Total</span><strong style="color:#1A73E8;font-size:18px">${formatARS(data.precioTotal)}</strong></td></tr>
            </table>
          </td>
        </tr>
        <tr>
          <td style="background:#f8fafc;padding:16px 28px;border-top:1px solid #e2e8f0">
            <p style="color:#94a3b8;font-size:12px;margin:0">Revisá la reserva en el panel de administración.</p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>
    `,
  });

  if (error) console.error('[Resend] enviarNotificacionAdmin error:', error);
}
