-- Administradores por correo: quien inicie sesión con un correo VERIFICADO de
-- esta lista queda como administrador (se registra en admins y en la auditoría).
insert into public.app_settings (key, value, is_public, description) values
  ('admin_emails', '["angelramosarrieta@gmail.com"]'::jsonb, false, 'Correos que reciben acceso de administrador al verificar su cuenta.')
on conflict (key) do nothing;

-- Promueve al usuario si su correo verificado está en la lista. Solo servidor.
create or replace function public.ensure_admin(p_user_id uuid)
returns boolean
language plpgsql security definer set search_path = public as $$
declare
  v_email text;
  v_confirmed timestamptz;
begin
  if exists (select 1 from public.admins where user_id = p_user_id) then return true; end if;
  select lower(email), email_confirmed_at into v_email, v_confirmed from auth.users where id = p_user_id;
  if v_email is null or v_confirmed is null then return false; end if;
  if not exists (
    select 1 from public.app_settings s, jsonb_array_elements_text(s.value) e
     where s.key = 'admin_emails' and lower(e) = v_email
  ) then return false; end if;
  insert into public.admins (user_id) values (p_user_id) on conflict do nothing;
  insert into public.admin_audit_log (admin_id, action, target_user_id, details)
  values (p_user_id, 'admin_por_correo', p_user_id, jsonb_build_object('email', v_email));
  return true;
end $$;
revoke execute on function public.ensure_admin(uuid) from public, anon, authenticated;
grant execute on function public.ensure_admin(uuid) to service_role;

-- Cambio de configuración desde el panel de administración (con auditoría).
create or replace function public.admin_update_setting(p_admin_id uuid, p_key text, p_value jsonb)
returns void
language plpgsql security definer set search_path = public as $$
declare
  v_old jsonb;
begin
  if not exists (select 1 from public.admins where user_id = p_admin_id) then raise exception 'no_autorizado'; end if;
  if p_key not in ('price_first_cop', 'price_next_cop', 'questions_per_generation', 'generation_limits', 'order_pending_ttl_minutes', 'admin_emails') then
    raise exception 'llave_invalida';
  end if;
  select value into v_old from public.app_settings where key = p_key for update;
  update public.app_settings set value = p_value, updated_at = now() where key = p_key;
  insert into public.admin_audit_log (admin_id, action, target_id, details)
  values (p_admin_id, 'configuracion', p_key, jsonb_build_object('antes', v_old, 'despues', p_value));
end $$;
revoke execute on function public.admin_update_setting(uuid, text, jsonb) from public, anon, authenticated;
grant execute on function public.admin_update_setting(uuid, text, jsonb) to service_role;
