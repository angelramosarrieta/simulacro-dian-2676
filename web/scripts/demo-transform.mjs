/**
 * Convierte el simulador de Analista II (index.html de la raíz) en la
 * demostración pública de /ejemplo:
 * - usa su propio espacio de guardado (no se mezcla con el simulador personal
 *   que alguien tenga en este mismo dominio, con su PIN y su progreso);
 * - entra directo, sin PIN;
 * - muestra un aviso de demostración con el enlace para crear la cuenta.
 * Lanza error si la plantilla cambió y alguna marca ya no existe.
 */
const MARKS = {
  clave: 'clave:"2676",',
  boot: 'if(!storageOK()){go("inicio")}\nelse if(isOpen()&&get(PKEY)){go("inicio")}\nelse{lockScreen()}',
  app: '<div id="app"></div>',
  head: "</head>",
};

function once(src, mark, value) {
  const i = src.indexOf(mark);
  if (i < 0 || src.indexOf(mark, i + mark.length) >= 0) throw new Error(`ejemplo_incompatible: ${mark.slice(0, 30)}`);
  return src.slice(0, i) + value + src.slice(i + mark.length);
}

export function toDemo(html) {
  let out = html;
  out = once(out, MARKS.clave, 'clave:"demo-ejemplo",');
  out = once(out, MARKS.boot, 'go("inicio")');
  out = once(
    out,
    MARKS.head,
    `<style>
.s2676-demo{position:sticky;top:0;z-index:60;display:flex;flex-wrap:wrap;align-items:center;justify-content:center;gap:6px 12px;padding:9px 16px;background:#0E6B58;color:#fff;font:500 13px/1.35 system-ui,-apple-system,"Segoe UI",sans-serif;text-align:center}
.s2676-demo a{color:#0E6B58;background:#fff;border-radius:999px;padding:5px 12px;font-weight:600;text-decoration:none;white-space:nowrap}
</style>
</head>`
  );
  out = once(
    out,
    MARKS.app,
    `<div class="s2676-demo" role="note">Ejemplo de un simulador (Analista II). El tuyo se crea con tu manual y tus indicadores. <a href="/registro">Crear el mío</a></div>
<div id="app"></div>`
  );
  return out;
}

/** El simulador personal original se conserva tal cual, solo sin indexar en buscadores. */
export function toPersonal(html) {
  return once(html, MARKS.head, '<meta name="robots" content="noindex, nofollow">\n</head>');
}
