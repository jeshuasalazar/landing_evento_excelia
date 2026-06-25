import "dotenv/config";
import express from "express";
import crypto from "node:crypto";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { isValidEmail, cleanUtm } from "./validation.js";
import { saveRegistration } from "./supabase.js";
import { buildIcs, googleCalendarUrl } from "./calendar.js";
import { sendConfirmation, emailEnabled } from "./email.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = process.env.PORT || 3000;
const EVENT_SLUG = process.env.EVENT_SLUG || "evento";

app.disable("x-powered-by");
app.set("trust proxy", 1);
app.use(express.json({ limit: "16kb" }));

// CORS / origin allowlist
const ALLOWED = (process.env.ALLOWED_ORIGIN || "").split(",").map((s) => s.trim()).filter(Boolean);
app.use((req, res, next) => {
  const origin = req.headers.origin;
  if (origin && (ALLOWED.length === 0 || ALLOWED.includes(origin))) {
    res.setHeader("Access-Control-Allow-Origin", origin);
    res.setHeader("Vary", "Origin");
    res.setHeader("Access-Control-Allow-Methods", "POST, GET, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  }
  if (req.method === "OPTIONS") return res.sendStatus(204);
  next();
});

// Rate limit en memoria: 5 req / 10 min por IP
const hits = new Map();
const WINDOW = 10 * 60 * 1000;
const MAX = 5;
function rateLimited(ip) {
  const now = Date.now();
  const arr = (hits.get(ip) || []).filter((t) => now - t < WINDOW);
  arr.push(now);
  hits.set(ip, arr);
  return arr.length > MAX;
}
setInterval(() => {
  const now = Date.now();
  for (const [ip, arr] of hits) {
    const keep = arr.filter((t) => now - t < WINDOW);
    if (keep.length) hits.set(ip, keep);
    else hits.delete(ip);
  }
}, WINDOW).unref?.();

function clientIp(req) {
  return (req.headers["x-forwarded-for"] || "").split(",")[0].trim() || req.ip || "";
}
function hashIp(ip) {
  return ip ? crypto.createHash("sha256").update(ip).digest("hex").slice(0, 32) : null;
}

// Config publica para el frontend (sin secretos)
app.get("/api/config", (req, res) => {
  res.json({
    googleCalendarUrl: process.env.CAL_GOOGLE_URL || googleCalendarUrl(),
    appleCalendarUrl: process.env.CAL_APPLE_URL || "/calendar/event.ics",
    icsUrl: process.env.CAL_ICS_URL || "/calendar/event.ics",
    emailEnabled: emailEnabled(),
    zoomConfigured: Boolean(process.env.ZOOM_URL),
  });
});

app.post("/api/register", async (req, res) => {
  try {
    const ip = clientIp(req);
    if (rateLimited(ip)) {
      return res.status(429).json({ ok: false, error: "Demasiados intentos. Intenta en unos minutos." });
    }

    const { email, honeypot, utm } = req.body || {};

    // Honeypot: bots rellenan campo invisible -> fingir exito sin guardar
    if (honeypot && String(honeypot).trim() !== "") {
      return res.json({ ok: true });
    }

    if (!isValidEmail(email)) {
      return res.status(400).json({ ok: false, error: "Revisa tu correo e intenta de nuevo." });
    }

    const u = cleanUtm(utm);
    const row = {
      event_slug: EVENT_SLUG,
      email: email.trim().toLowerCase(),
      source: "landing",
      utm_source: u.source,
      utm_medium: u.medium,
      utm_campaign: u.campaign,
      utm_content: u.content,
      utm_term: u.term,
      page_url: (req.headers.referer || process.env.PUBLIC_SITE_URL || "").slice(0, 500),
      user_agent: (req.headers["user-agent"] || "").slice(0, 500),
      ip_hash: hashIp(ip),
    };

    const result = await saveRegistration(row);

    // Email solo para registros nuevos (evita spam en duplicados)
    let emailed = false;
    if (!result.duplicate && emailEnabled()) {
      const r = await sendConfirmation(row.email);
      emailed = r.sent;
    }

    return res.json({ ok: true, duplicate: result.duplicate, emailed, emailEnabled: emailEnabled() });
  } catch (err) {
    console.error("register_error:", err.message);
    return res.status(500).json({ ok: false, error: "No pudimos guardar tu lugar. Intenta de nuevo." });
  }
});

app.get("/calendar/event.ics", (req, res) => {
  res.setHeader("Content-Type", "text/calendar; charset=utf-8");
  res.setHeader("Content-Disposition", 'attachment; filename="webinar-ailearning.ics"');
  res.send(buildIcs());
});

app.get("/health", (req, res) => res.json({ ok: true }));

app.use(express.static(path.join(__dirname, "..", "public")));

app.listen(PORT, "0.0.0.0", () => {
  console.log(`Landing aiLearning escuchando en http://0.0.0.0:${PORT}`);
});
