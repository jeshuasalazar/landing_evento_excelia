import { createClient } from "@supabase/supabase-js";
import pg from "pg";

let client = null;
let pool = null;

export function getSupabase() {
  if (client) return client;
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error("SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY no configurados");
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
// Devuelve { ok, duplicate }.
export async function saveRegistration(row) {
  const postgresResult = await saveWithPostgres(row);
  if (postgresResult) return postgresResult;

  return saveWithSupabase(row);
}
