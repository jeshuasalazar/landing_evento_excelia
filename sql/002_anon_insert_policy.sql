-- Permite que el publishable key (rol anon) inserte registros via REST,
-- sin exponer SELECT/UPDATE/DELETE. El backend ya valida email, honeypot y rate-limit.
drop policy if exists "anon_insert_registrations" on public.event_registrations;

create policy "anon_insert_registrations"
  on public.event_registrations
  for insert
  to anon
  with check (event_slug is not null and email is not null);

-- Validacion
-- set local role anon;
-- insert into public.event_registrations (event_slug, email) values ('test','t@t.com');
