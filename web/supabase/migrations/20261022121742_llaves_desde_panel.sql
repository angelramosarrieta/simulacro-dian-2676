-- Llaves de integración administradas desde /admin/configuracion.
-- El valor se guarda CIFRADO (AES-256-GCM) con SECRETS_ENCRYPTION_KEY, que
-- solo existe en las variables del servidor (Vercel). La base de datos nunca
-- ve el texto plano. Sin políticas: solo la service role la lee y escribe.
create table public.app_secrets (
  key text primary key,
  ciphertext text not null,
  hint text not null default '',          -- últimos 4 caracteres (o el valor completo si no es secreto)
  updated_by uuid references auth.users(id) on delete set null,
  updated_at timestamptz not null default now()
);
alter table public.app_secrets enable row level security;
revoke all on public.app_secrets from anon, authenticated;
