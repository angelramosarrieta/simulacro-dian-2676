/**
 * El index.html de la raíz es el simulador personal original (Analista II).
 * Se publica en /mi-simulador tal cual, solo sin indexar. Lanza error si la
 * marca ya no existe.
 */
const MARKS = { head: "</head>" };

function once(src, mark, value) {
  const i = src.indexOf(mark);
  if (i < 0 || src.indexOf(mark, i + mark.length) >= 0) throw new Error(`ejemplo_incompatible: ${mark.slice(0, 30)}`);
  return src.slice(0, i) + value + src.slice(i + mark.length);
}

/** El simulador personal original se conserva tal cual, solo sin indexar en buscadores. */
export function toPersonal(html) {
  return once(html, MARKS.head, '<meta name="robots" content="noindex, nofollow">\n</head>');
}
