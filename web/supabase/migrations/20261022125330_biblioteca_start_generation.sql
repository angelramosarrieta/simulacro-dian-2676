-- start_generation: con p_from_bank no exige documentos (el banco ya existe).
-- La versión anterior se renombra (sin permisos) en lugar de borrarse.
alter function public.start_generation(uuid, uuid) rename to start_generation_v1;
revoke execute on function public.start_generation_v1(uuid, uuid) from public, anon, authenticated, service_role;

create or replace function public.start_generation(p_user_id uuid, p_generation_id uuid, p_from_bank boolean default false)
returns public.generations
language plpgsql security definer set search_path = public as $$
declare
  v_gen public.generations;
  v_limits jsonb;
  v_running int;
  v_today int;
  v_balance int;
begin
  perform pg_advisory_xact_lock(hashtextextended('credits:' || p_user_id::text, 0));

  select * into v_gen from public.generations where id = p_generation_id and user_id = p_user_id for update;
  if not found then raise exception 'generacion_no_encontrada'; end if;
  if v_gen.status <> 'draft' then raise exception 'generacion_ya_iniciada'; end if;
  if p_from_bank then
    if not exists (select 1 from public.job_banks where opec = v_gen.opec and enabled) then raise exception 'sin_biblioteca'; end if;
  elsif v_gen.manual_path is null or v_gen.indicadores_path is null then
    raise exception 'faltan_documentos';
  end if;

  select value into v_limits from public.app_settings where key = 'generation_limits';

  select count(*) into v_running from public.generations
   where user_id = p_user_id and status in ('queued','analyzing','generating','assembling');
  if v_running >= coalesce((v_limits->>'max_running_per_user')::int, 1) then
    raise exception 'generacion_en_curso';
  end if;

  select count(*) into v_today from public.generations
   where user_id = p_user_id and started_at > now() - interval '24 hours';
  if v_today >= coalesce((v_limits->>'max_generations_per_user_per_day')::int, 5) then
    raise exception 'limite_diario';
  end if;

  select coalesce(sum(delta), 0) into v_balance from public.credit_ledger where user_id = p_user_id;
  if v_balance < 1 then raise exception 'sin_creditos'; end if;

  insert into public.credit_ledger (user_id, delta, reason, generation_id, note)
  values (p_user_id, -1, 'generation', p_generation_id, v_gen.cargo);

  update public.generations set
    status = 'queued', credit_consumed = true, started_at = now(), updated_at = now(),
    progress = 2, current_step = 'En cola',
    source = case when p_from_bank then 'biblioteca' else 'ia' end
  where id = p_generation_id
  returning * into v_gen;
  return v_gen;
end $$;
revoke execute on function public.start_generation(uuid, uuid, boolean) from public, anon, authenticated;
grant execute on function public.start_generation(uuid, uuid, boolean) to service_role;

