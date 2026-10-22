-- Indicadores de calidad de cada generación (los calcula el worker al armar el
-- simulador): % de preguntas en que la correcta es la opción más larga y
-- cuántas descartó la revisión automática.
alter table public.generations add column quality jsonb;

-- Generaciones ya terminadas: se calcula lo que se puede a partir de las preguntas.
update public.generations g set quality = jsonb_build_object(
  'preguntas', jsonb_array_length(g.questions),
  'correcta_mas_larga_pct', (
    select round(100.0 * count(*) filter (where length(e->'o'->>0) > greatest(length(e->'o'->>1), length(e->'o'->>2))) / nullif(count(*), 0))
    from jsonb_array_elements(g.questions) e
  ),
  'descartadas', null
)
where g.status = 'completed' and jsonb_array_length(g.questions) > 0;
