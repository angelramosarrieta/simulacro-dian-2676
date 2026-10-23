-- Visitas anónimas al sitio (incluye a quienes no se registran). No se guarda
-- la IP: solo un identificador aleatorio del navegador, la página, de dónde
-- llegó y la ubicación aproximada (país/ciudad) que informa Vercel.
create table public.page_views (
  id bigint generated always as identity primary key,
  visitor_id uuid not null,
  session_id uuid not null,
  path text not null,
  referrer_host text,
  utm_source text,
  utm_medium text,
  utm_campaign text,
  country text,
  region text,
  city text,
  device text not null default 'desktop' check (device in ('mobile', 'tablet', 'desktop')),
  browser text,
  user_id uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);
create index page_views_created_idx on public.page_views (created_at desc);
create index page_views_visitor_idx on public.page_views (visitor_id);
create index page_views_user_idx on public.page_views (user_id);
alter table public.page_views enable row level security;
revoke all on public.page_views from anon, authenticated;

-- Resumen para /admin/visitas (solo servidor).
create or replace function public.admin_traffic(p_days int)
returns jsonb
language sql stable security definer set search_path = public as $$
  with v as (
    select * from public.page_views
    where created_at >= date_trunc('day', now() at time zone 'America/Bogota') at time zone 'America/Bogota' - make_interval(days => greatest(p_days, 1) - 1)
  ),
  first_touch as (
    select distinct on (visitor_id) visitor_id, coalesce(utm_source, referrer_host, 'Directo') as fuente
    from v order by visitor_id, created_at
  ),
  sessions as (
    select session_id, min(created_at) as inicio, max(created_at) as fin, count(*) as paginas,
           (array_agg(visitor_id))[1] as visitor_id, (array_agg(city order by created_at))[1] as city,
           (array_agg(country order by created_at))[1] as country, (array_agg(device order by created_at))[1] as device,
           (array_agg(coalesce(utm_source, referrer_host, 'Directo') order by created_at))[1] as fuente,
           (array_agg(path order by created_at))[1] as entrada,
           (array_agg(user_id) filter (where user_id is not null))[1] as user_id
    from v group by session_id
  )
  select jsonb_build_object(
    'visitantes', (select count(distinct visitor_id) from v),
    'sesiones', (select count(distinct session_id) from v),
    'paginas', (select count(*) from v),
    'registrados', (select count(distinct visitor_id) from v where user_id is not null),
    'por_dia', coalesce((select jsonb_agg(x order by dia) from (
        select to_char(created_at at time zone 'America/Bogota', 'YYYY-MM-DD') as dia, count(distinct visitor_id) as visitantes, count(*) as paginas
        from v group by 1) x), '[]'::jsonb),
    'paginas_top', coalesce((select jsonb_agg(x) from (select path, count(*) as n, count(distinct visitor_id) as visitantes from v group by path order by 2 desc limit 10) x), '[]'::jsonb),
    'fuentes', coalesce((select jsonb_agg(x) from (select fuente, count(*) as n from first_touch group by fuente order by 2 desc limit 10) x), '[]'::jsonb),
    'ciudades', coalesce((select jsonb_agg(x) from (select coalesce(city, 'Desconocida') as ciudad, coalesce(country, '') as pais, count(distinct visitor_id) as n from v group by 1, 2 order by 3 desc limit 10) x), '[]'::jsonb),
    'dispositivos', coalesce((select jsonb_agg(x) from (select device, count(distinct visitor_id) as n from v group by device order by 2 desc) x), '[]'::jsonb),
    'recientes', coalesce((select jsonb_agg(x order by inicio desc) from (
        select s.*, p.email from sessions s left join public.profiles p on p.id = s.user_id order by s.inicio desc limit 60) x), '[]'::jsonb)
  );
$$;
revoke execute on function public.admin_traffic(int) from public, anon, authenticated;
grant execute on function public.admin_traffic(int) to service_role;
