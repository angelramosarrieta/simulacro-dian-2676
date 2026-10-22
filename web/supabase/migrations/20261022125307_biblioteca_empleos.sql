-- =====================================================================
-- Biblioteca de empleos: el banco de preguntas generado para una OPEC se
-- reutiliza para los siguientes aspirantes del mismo empleo (sin volver a
-- llamar a la IA). La OPEC identifica el empleo de forma única en el
-- concurso: mismo cargo, nivel, dependencia y ejes.
-- =====================================================================
create table public.job_banks (
  opec text primary key,
  cargo text not null,
  nivel text not null,
  modalidad text not null,
  ejes jsonb not null default '[]'::jsonb,       -- nombres de los ejes cubiertos
  plan jsonb not null default '[]'::jsonb,
  analysis jsonb,
  questions jsonb not null,
  question_count int not null,
  source_generation_id uuid references public.generations(id) on delete set null,
  enabled boolean not null default true,         -- el admin puede retirar un banco de mala calidad
  uses int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index job_banks_source_generation_idx on public.job_banks (source_generation_id);
alter table public.job_banks enable row level security;
revoke all on public.job_banks from anon, authenticated;

alter table public.generations add column source text not null default 'ia' check (source in ('ia', 'biblioteca'));

-- Enlaces de ayuda para conseguir los documentos (editables desde /admin/configuracion).
insert into public.app_settings (key, value, is_public, description) values
  ('help_links', jsonb_build_object(
      'simo', 'https://simo.cnsc.gov.co',
      'guia', 'https://www.cnsc.gov.co/node/69688',
      'dian', 'https://www.dian.gov.co/dian/entidad/Paginas/Proceso-de-Seleccion-DIAN-Ingreso-y-Ascenso.aspx',
      'indicadores', ''
    ), true, 'Enlaces que ve el aspirante para conseguir su manual de funciones y sus indicadores.')
on conflict (key) do nothing;

