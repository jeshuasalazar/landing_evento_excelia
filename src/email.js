// Envio transaccional opcional via Resend (sin dependencias: fetch nativo).
import { googleCalendarUrl } from "./calendar.js";

export function emailEnabled() {
  return Boolean(process.env.RESEND_API_KEY && process.env.FROM_EMAIL);
}

export async function sendConfirmation(to) {
  if (!emailEnabled()) return { sent: false, reason: "disabled" };

  const title = process.env.EVENT_TITLE || "Webinar aiLearning";
  const zoom = process.env.ZOOM_URL || "";
  const gcal = process.env.CAL_GOOGLE_URL || googleCalendarUrl();
  const icsUrl = process.env.CAL_APPLE_URL || `${process.env.PUBLIC_SITE_URL || ""}/calendar/event.ics`;

  const html = `
  <div style="font-family:Arial,Helvetica,sans-serif;max-width:560px;margin:0 auto;color:#0E1B2C">
    <h2 style="color:#1A5FB4">¡Lugar asegurado! 🎉</h2>
    <p>Tu registro al webinar <strong>${title}</strong> esta confirmado.</p>
    <p><strong>📅 Jueves 25 de junio de 2026, 8:00 PM (hora del centro de México)</strong></p>
    ${zoom ? `<p><strong>Enlace de Zoom:</strong> <a href="${zoom}">${zoom}</a></p>` : ""}
    <p>
      <a href="${gcal}" style="background:#2D88E8;color:#fff;padding:12px 18px;border-radius:8px;text-decoration:none;display:inline-block">Añadir a Google Calendar</a>
      &nbsp;
      <a href="${icsUrl}" style="background:#0E1B2C;color:#fff;padding:12px 18px;border-radius:8px;text-decoration:none;display:inline-block">Añadir a Apple / Outlook</a>
    </p>
    <p style="color:#6B7484;font-size:13px">aiLearning · Impulso Fiscal Empresarial</p>
  </div>`;

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: process.env.FROM_EMAIL,
        to: [to],
        subject: "¡Lugar asegurado! Tu acceso al webinar de aiLearning 🎉",
        html,
      }),
    });
    if (!res.ok) {
      const txt = await res.text();
      return { sent: false, reason: `resend_${res.status}`, detail: txt.slice(0, 200) };
    }
    return { sent: true };
  } catch (err) {
    return { sent: false, reason: "exception", detail: String(err).slice(0, 200) };
  }
}
