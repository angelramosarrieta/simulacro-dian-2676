-- Guarda en la biblioteca el resultado de una generación con IA. Reemplaza el
-- banco existente solo si el nuevo tiene más preguntas (y conserva el estado
-- "enabled" que haya decidido el administrador).
create or replace function public.save_job_bank(p_generation_id uuid)
returns boolean
language plpgsql security definer set search_path = public as $$
declare
  v_gen public.generations;
  v_count int;
  v_ejes jsonb;
begin
  select * into v_gen from public.generations where id = p_generation_id;
  if not found or v_gen.status <> 'completed' or v_gen.source <> 'ia' then return false; end if;
  v_count := jsonb_array_length(v_gen.questions);
  if v_count = 0 then return false; end if;
  select coalesce(jsonb_agg(p->>'eje'), '[]'::jsonb) into v_ejes
    from jsonb_array_elements(coalesce(v_gen.plan, '[]'::jsonb)) p where (p->>'generadas')::int > 0;

  insert into public.job_banks (opec, cargo, nivel, modalidad, ejes, plan, analysis, questions, question_count, source_generation_id)
  values (v_gen.opec, v_gen.cargo, v_gen.nivel, v_gen.modalidad, v_ejes, coalesce(v_gen.plan, '[]'::jsonb), v_gen.analysis, v_gen.questions, v_count, v_gen.id)
  on conflict (opec) do update set
    cargo = excluded.cargo, nivel = excluded.nivel, modalidad = excluded.modalidad, ejes = excluded.ejes,
    plan = excluded.plan, analysis = excluded.analysis, questions = excluded.questions,
    question_count = excluded.question_count, source_generation_id = excluded.source_generation_id, updated_at = now()
  where job_banks.question_count < excluded.question_count;
  return true;
end $$;
revoke execute on function public.save_job_bank(uuid) from public, anon, authenticated;
grant execute on function public.save_job_bank(uuid) to service_role;

-- admin_update_setting acepta ahora la llave help_links.
create or replace function public.admin_update_setting(p_admin_id uuid, p_key text, p_value jsonb)
returns void
language plpgsql security definer set search_path = public as $$
declare
  v_old jsonb;
begin
  if not exists (select 1 from public.admins where user_id = p_admin_id) then raise exception 'no_autorizado'; end if;
  if p_key not in ('price_first_cop', 'price_next_cop', 'questions_per_generation', 'generation_limits', 'order_pending_ttl_minutes', 'admin_emails', 'help_links') then
    raise exception 'llave_invalida';
  end if;
  select value into v_old from public.app_settings where key = p_key for update;
  update public.app_settings set value = p_value, updated_at = now() where key = p_key;
  insert into public.admin_audit_log (admin_id, action, target_id, details)
  values (p_admin_id, 'configuracion', p_key, jsonb_build_object('antes', v_old, 'despues', p_value));
end $$;
