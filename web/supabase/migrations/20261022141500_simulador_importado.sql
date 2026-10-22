-- Simuladores importados (por ejemplo, el simulador personal que existía antes de
-- la plataforma): sus preguntas ya traen el banco completo, así que el panel no
-- les antepone el banco común. No consumen créditos ni entran a la biblioteca.
alter table public.generations drop constraint generations_source_check;
alter table public.generations add constraint generations_source_check check (source in ('ia', 'biblioteca', 'importado'));
