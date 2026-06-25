import { createClient } from "@supabase/supabase-js";

let client = null;

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

// Insercion idempotente: si el email ya existe para el evento, no falla.
// Devuelve { ok, duplicate }.
export async function saveRegistration(row) {
  const supabase = getSupabase();
  const { error } = await supabase.from("event_registrations").insert(row);

  if (error) {
    // 23505 = unique_violation -> duplicado, lo tratamos como exito idempotente
    if (error.code === "23505") return { ok: true, duplicate: true };
    throw new Error(error.message || "Error al guardar registro");
  }
  return { ok: true, duplicate: false };
}
