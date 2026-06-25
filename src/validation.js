const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function isValidEmail(email) {
  if (typeof email !== "string") return false;
  const v = email.trim();
  return v.length >= 5 && v.length <= 254 && EMAIL_RE.test(v);
}

export function cleanUtm(utm = {}) {
  const keys = ["source", "medium", "campaign", "content", "term"];
  const out = {};
  for (const k of keys) {
    const val = utm && typeof utm[k] === "string" ? utm[k].slice(0, 200) : null;
    out[k] = val || null;
  }
  return out;
}
