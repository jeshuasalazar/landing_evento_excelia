import { createClient } from "@supabase/supabase-js";
import pg from "pg";

let client = null;
let pool = null;

// Cliente Supabase via REST/HTTPS (puerto 443, siempre enrutable en Railway).
// Usa service role si existe; si no, el publishable key (anon) con policy de INSERT.
export function getSupabase() {
  if (client) return client;
  const url = process.env.SUPABASE_URL;
  const key =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.SUPABASE_PUBLISHABLE_KEY ||
    process.env.SUPABASE_ANON_KEY;
  if (!url || !key) {
    throw new Error(
      "Falta SUPABASE_URL y una API key (SUPABASE_SERVICE_ROLE_KEY o SUPABASE_PUBLISHABLE_KEY)",
    );
  }
  client = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return client;
}

function getDbPool() {
  if (pool) return pool;
  const connectionString = process.env.SUPABASE_DB_URL || process.env.DATABASE_URL;
  if (!connectionString) return null;

  pool = new pg.Pool({
    connectionString,
    ssl: process.env.DB_SSL === "false" ? false : { rejectUnauthorized: false },
    connectionTimeoutMillis: 8000,
  });
  return pool;
}

async function saveWithSupabase(row) {
  const supabase = getSupabase();
  const { error } = await supabase.from("event_registrations").insert(row);
  if (error) {
    // 23505 = unique_violation -> duplicado, lo tratamos como exito idempotente
    if (error.code === "23505") return { ok: true, duplicate: true };
    throw new Error(error.message || "Error al guardar registro");
  }
  return { ok: true, duplicate: false };
}

async function saveWithPostgres(row) {
  const db = getDbPool();
  if (!db) return null;

  const { rowCount } = await db.query(
    `insert into public.event_registrations (
      event_slug,
      email,
      source,
      utm_source,
      utm_medium,
      utm_campaign,
      utm_content,
      utm_term,
      page_url,
      user_agent,
      ip_hash
    ) values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
    on conflict (event_slug, email) do nothing`,
    [
      row.event_slug,
      row.email,
      row.source,
      row.utm_source,
      row.utm_medium,
      row.utm_campaign,
      row.utm_content,
      row.utm_term,
      row.page_url,
      row.user_agent,
      row.ip_hash,
    ],
  );

  return { ok: true, duplicate: rowCount === 0 };
}

// Insercion idempotente: si el email ya existe para el evento, no falla.
// Ruta principal: REST/HTTPS (confiable en cualquier host).
// Fallback: conexion directa Postgres si esta configurada.
// Devuelve { ok, duplicate }.
export async function saveRegistration(row) {
  const hasRestKey =
    process.env.SUPABASE_URL &&
    (process.env.SUPABASE_SERVICE_ROLE_KEY ||
      process.env.SUPABASE_PUBLISHABLE_KEY ||
      process.env.SUPABASE_ANON_KEY);

  if (hasRestKey) {
    try {
      return await saveWithSupabase(row);
    } catch (restErr) {
      const pgResult = await saveWithPostgres(row).catch(() => null);
      if (pgResult) return pgResult;
      throw restErr;
    }
  }

  const pgResult = await saveWithPostgres(row);
  if (pgResult) return pgResult;

  // Sin REST ni Postgres configurados
  return saveWithSupabase(row);
}
