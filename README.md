# Landing webinar aiLearning — Del Excel a la IA

Embudo de registro de baja fricción (2 pantallas) para el webinar gratuito de aiLearning.
Node.js + Express + Supabase. Listo para Railway en `eventos.ailearning.mx`.

## Stack
- Node 20+ / Express (sirve la landing y la API)
- HTML5 + CSS propio (tokens aiLearning, sin CDN) + Vanilla JS
- Supabase (`event_registrations`) — `service_role` solo en servidor
- Resend (email transaccional opcional)
- Calendarios vía addcal.io (Google / Apple / ICS)

## Estructura
```
src/server.js        API + estáticos
src/supabase.js      inserción idempotente
src/calendar.js      Google URL + ICS fallback
src/email.js         Resend
src/validation.js    email + UTM
public/              landing (index, css, js, assets webp)
sql/001_event_registrations.sql
```

## Rutas
- `GET /` landing
- `POST /api/register` `{ email, honeypot, utm }` → `{ ok, duplicate, emailed }`
- `GET /api/config` config pública (links calendario, email on/off)
- `GET /calendar/event.ics` ICS fallback
- `GET /health` → `{ ok: true }`

## Local
```bash
cp .env.example .env   # completa SUPABASE_SERVICE_ROLE_KEY
npm install
npm run dev            # http://localhost:3000
```

## Supabase
Tabla ya creada en el proyecto **Academia aiLearning** (`hapgvslbjbmdygkmohuk`).
Para recrearla: SQL Editor → pegar `sql/001_event_registrations.sql`.
La `service_role key` está en Supabase → Settings → API. **Nunca** se commitea ni se expone en cliente.

## Railway
1. Push del repo a GitHub.
2. Railway → New Project → Deploy from GitHub repo.
3. Variables (Settings → Variables): copiar todo `.env.example` con valores reales, incluyendo `SUPABASE_SERVICE_ROLE_KEY` (variable secreta).
4. Healthcheck: `/health` (ya en `railway.json`).
5. Redeploy.

## Dominio `eventos.ailearning.mx`
1. Railway → servicio → Settings → Networking → Custom Domain → `eventos.ailearning.mx`.
2. Crear en el DNS de `ailearning.mx` el `CNAME` y el `TXT` exactos que indique Railway.
3. Esperar verificación (check verde) y emisión SSL automática.
```bash
dig CNAME eventos.ailearning.mx
curl -I https://eventos.ailearning.mx
curl -s https://eventos.ailearning.mx/health
```

## Pruebas manuales (hechas en local)
- `/health` → `{ok:true}` ✓
- `/api/config` → links addcal + emailEnabled ✓
- `/calendar/event.ics` → DTSTART `20260626T020000Z` (= 25-jun 20:00 -06:00) ✓
- email inválido → 400, sin pantalla 2 ✓
- honeypot lleno → 200 sin guardar ✓
- fallo de API → 500, pantalla 2 **no** aparece ✓
- registro real + duplicado idempotente → **pendiente** (requiere `SUPABASE_SERVICE_ROLE_KEY`)

## Seguridad
- `service_role` solo en servidor; `.env` en `.gitignore`.
- Rate limit (5/10min/IP), honeypot, validación email, allowlist de origen.
