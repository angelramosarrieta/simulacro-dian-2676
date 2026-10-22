-- Recomendaciones del asesor de Supabase:
-- * auth.uid() dentro de (select ...) se evalúa una vez por consulta, no por fila.
-- * my_credit_balance pasa a SECURITY INVOKER: RLS ya limita la suma a las filas propias.
-- * Índices para las llaves foráneas sin índice.

alter policy profiles_select_own on public.profiles using (id = (select auth.uid()));
alter policy profiles_update_own on public.profiles using (id = (select auth.uid())) with check (id = (select auth.uid()));
alter policy generations_select_own on public.generations using (user_id = (select auth.uid()));
alter policy orders_select_own on public.orders using (user_id = (select auth.uid()));
alter policy credit_ledger_select_own on public.credit_ledger using (user_id = (select auth.uid()));
alter policy usage_events_select_own on public.usage_events using (user_id = (select auth.uid()));
alter policy simulator_progress_select_own on public.simulator_progress using (user_id = (select auth.uid()));

create or replace function public.my_credit_balance()
returns int language sql stable security invoker set search_path = public as $$
  select coalesce(sum(delta), 0)::int from public.credit_ledger where user_id = (select auth.uid());
$$;

create index if not exists admin_audit_log_admin_idx on public.admin_audit_log (admin_id);
create index if not exists admin_audit_log_target_idx on public.admin_audit_log (target_user_id);
create index if not exists simulator_progress_user_idx on public.simulator_progress (user_id);
