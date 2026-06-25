// Utilidades de calendario: Google Calendar URL e ICS (Apple/Outlook).

function toUtcBasic(iso) {
  // Convierte ISO con offset a formato UTC basico YYYYMMDDTHHMMSSZ
  const d = new Date(iso);
  return d.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z");
}

function event() {
  return {
    title: process.env.EVENT_TITLE || "Webinar aiLearning",
    description: process.env.EVENT_DESCRIPTION || "",
    location: process.env.ZOOM_URL || process.env.EVENT_LOCATION || "Zoom",
    startIso: process.env.EVENT_START_ISO,
    endIso: process.env.EVENT_END_ISO,
    siteUrl: process.env.PUBLIC_SITE_URL || "",
  };
}

export function googleCalendarUrl() {
  const e = event();
  const dates = `${toUtcBasic(e.startIso)}/${toUtcBasic(e.endIso)}`;
  const details = [e.description, e.siteUrl].filter(Boolean).join("\n\n");
  const params = new URLSearchParams({
    action: "TEMPLATE",
    text: e.title,
    dates,
    details,
    location: e.location,
  });
  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

export function buildIcs() {
  const e = event();
  const uid = `${(process.env.EVENT_SLUG || "evento")}@ailearning.mx`;
  const stamp = toUtcBasic(new Date().toISOString());
  const esc = (s = "") =>
    String(s).replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\n/g, "\\n");
  return [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//aiLearning//Eventos//ES",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    `UID:${uid}`,
    `DTSTAMP:${stamp}`,
    `DTSTART:${toUtcBasic(e.startIso)}`,
    `DTEND:${toUtcBasic(e.endIso)}`,
    `SUMMARY:${esc(e.title)}`,
    `DESCRIPTION:${esc([e.description, e.siteUrl].filter(Boolean).join("\n\n"))}`,
    `LOCATION:${esc(e.location)}`,
    "STATUS:CONFIRMED",
    "BEGIN:VALARM",
    "TRIGGER:-PT30M",
    "ACTION:DISPLAY",
    "DESCRIPTION:Recordatorio webinar aiLearning",
    "END:VALARM",
    "END:VEVENT",
    "END:VCALENDAR",
  ].join("\r\n");
}
