-- =====================================================================
-- Simulacro 2676 · administración, avisos por correo y progreso
-- =====================================================================

-- ---------------------------------------------------------------------
-- Administradores. Sin políticas: solo el servidor (service role) la lee.
-- Para dar acceso: insert into public.admins (user_id) select id from auth.users where email = '...';
-- ---------------------------------------------------------------------
create table public.admins (
  user_id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);
alter table public.admins enable row level security;
revoke all on public.admins from anon, authenticated;

create table public.admin_audit_log (
  id uuid primary key default gen_random_uuid(),
  admin_id uuid not null references auth.users(id),
  action text not null,
  target_user_id uuid references auth.users(id) on delete set null,
  target_id text,
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index admin_audit_log_created_idx on public.admin_audit_log (created_at desc);
alter table public.admin_audit_log enable row level security;
revoke all on public.admin_audit_log from anon, authenticated;

-- Ajuste manual de créditos (cortesías, reembolsos fuera de Wompi, correcciones).
-- Valida que quien lo pide sea administrador y que el saldo no quede negativo.
create or replace function public.admin_adjust_credits(p_admin_id uuid, p_user_id uuid, p_delta int, p_note text)
returns int
language plpgsql security definer set search_path = public as $$
declare
  v_balance int;
begin
  if not exists (select 1 from public.admins where user_id = p_admin_id) then
    raise exception 'no_autorizado';
  end if;
  if p_delta = 0 or abs(p_delta) > 20 then raise exception 'ajuste_invalido'; end if;
  if coalesce(length(trim(p_note)), 0) < 3 then raise exception 'nota_requerida'; end if;

  perform pg_advisory_xact_lock(hashtextextended('credits:' || p_user_id::text, 0));
  select coalesce(sum(delta), 0) into v_balance from public.credit_ledger where user_id = p_user_id;
  if v_balance + p_delta < 0 then raise exception 'saldo_negativo'; end if;

  insert into public.credit_ledger (user_id, delta, reason, note)
  values (p_user_id, p_delta, 'admin_adjustment', left(p_note, 300));
  insert into public.admin_audit_log (admin_id, action, target_user_id, details)
  values (p_admin_id, 'ajuste_creditos', p_user_id, jsonb_build_object('delta', p_delta, 'nota', left(p_note, 300), 'saldo_anterior', v_balance));
  return v_balance + p_delta;
end $$;
revoke execute on function public.admin_adjust_credits(uuid, uuid, int, text) from public, anon, authenticated;
grant execute on function public.admin_adjust_credits(uuid, uuid, int, text) to service_role;

-- ---------------------------------------------------------------------
-- Avisos por correo: marcas para enviar cada aviso una sola vez.
-- ---------------------------------------------------------------------
alter table public.generations add column notified_at timestamptz;
alter table public.orders add column receipt_sent_at timestamptz;

-- Reclama el envío de un aviso de forma atómica (devuelve true solo a quien lo reclama primero).
create or replace function public.claim_generation_notice(p_generation_id uuid)
returns boolean
language sql security definer set search_path = public as $$
  with u as (
    update public.generations set notified_at = now()
     where id = p_generation_id and notified_at is null and status in ('completed', 'failed')
    returning 1
  ) select exists (select 1 from u);
$$;
create or replace function public.claim_order_receipt(p_order_id uuid)
returns boolean
language sql security definer set search_path = public as $$
  with u as (
    update public.orders set receipt_sent_at = now()
     where id = p_order_id and receipt_sent_at is null and status = 'approved'
    returning 1
  ) select exists (select 1 from u);
$$;
revoke execute on function public.claim_generation_notice(uuid), public.claim_order_receipt(uuid) from public, anon, authenticated;
grant execute on function public.claim_generation_notice(uuid), public.claim_order_receipt(uuid) to service_role;

-- ---------------------------------------------------------------------
-- Progreso del simulador sincronizado con la cuenta (aciertos e historial),
-- para estudiar en varios dispositivos. Lo escribe el servidor tras verificar
-- que la generación es del usuario; el usuario solo lee el suyo.
-- ---------------------------------------------------------------------
create table public.simulator_progress (
  generation_id uuid primary key references public.generations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  stats jsonb not null default '{}'::jsonb,
  history jsonb not null default '[]'::jsonb,
  updated_at timestamptz not null default now(),
  constraint simulator_progress_size check (pg_column_size(stats) + pg_column_size(history) < 600000)
);
alter table public.simulator_progress enable row level security;
create policy simulator_progress_select_own on public.simulator_progress for select using (user_id = auth.uid());
revoke insert, update, delete on public.simulator_progress from anon, authenticated;
