import type { TemplateQuestion } from "@/lib/generation/schemas";

/**
 * Arma el simulador final a partir de plantilla.html: llena los 4 campos del
 * cargo en CONFIG, agrega las preguntas nuevas AL FINAL de Q (después del
 * banco común) y lo envuelve en un documento HTML completo.
 *
 * Usa reemplazos exactos sobre marcas de la plantilla; si alguna no aparece
 * (porque alguien cambió la plantilla) lanza error en vez de producir un
 * simulador roto. Las pruebas de assemble.test.ts cubren cada marca.
 */
const MARKS = {
  clave: 'clave:"[OPEC]",',
  cargo: 'cargo:"[Denominación del empleo]",',
  opec: 'opec:"[OPEC]",',
  ejes: 'ejes:["[Eje oficial 1]","[Eje oficial 2]"],',
  qEnd: "].map((x,i)=>({...x,id:i}));",
  boot: "if(!storageOK()){go(\"inicio\")}\nelse if(isOpen()&&get(PKEY)){go(\"inicio\")}\nelse{lockScreen()}",
} as const;

/** Serializa como literal JS seguro dentro de <script> (sin cerrar la etiqueta). */
export function jsLiteral(value: unknown) {
  return JSON.stringify(value)
    .replace(/</g, "\\u003c")
    .replace(/>/g, "\\u003e")
    .replace(/\u2028/g, "\\u2028")
    .replace(/\u2029/g, "\\u2029");
}

function replaceOnce(src: string, mark: string, value: string) {
  const i = src.indexOf(mark);
  if (i < 0 || src.indexOf(mark, i + mark.length) >= 0) throw new Error(`plantilla_incompatible: ${mark.slice(0, 30)}`);
  return src.slice(0, i) + value + src.slice(i + mark.length);
}

export function assembleSimulator(
  template: string,
  p: { opec: string; cargo: string; ejes: string[]; questions: TemplateQuestion[]; title?: string }
) {
  let html = template;
  html = replaceOnce(html, MARKS.clave, `clave:${jsLiteral(p.opec)},`);
  html = replaceOnce(html, MARKS.cargo, `cargo:${jsLiteral(p.cargo)},`);
  html = replaceOnce(html, MARKS.opec, `opec:${jsLiteral(p.opec)},`);
  html = replaceOnce(html, MARKS.ejes, `ejes:${jsLiteral(p.ejes)},`);
  const extra = p.questions.map((q) => jsLiteral(q)).join(",\n");
  html = replaceOnce(html, MARKS.qEnd, `${extra ? `,\n// ---- Preguntas del empleo (generadas) ----\n${extra}\n` : ""}${MARKS.qEnd}`);
  // En la plataforma el acceso ya está protegido por la cuenta: se entra
  // directo, sin el PIN local que la plantilla usa como Artifact de Claude.
  html = replaceOnce(html, MARKS.boot, 'go("inicio")');

  const title = (p.title ?? `Simulacro · ${p.cargo}`).replace(/[<>&"]/g, "");
  // La plantilla es un fragmento (formato Artifact): estilos arriba, app abajo.
  const split = html.indexOf('<div id="app"></div>');
  if (split < 0) throw new Error("plantilla_incompatible: app");
  const head = html.slice(0, split).replace(/<title>[^<]*<\/title>\n?/, "").replace(/<meta name="claude:[^>]*>\n?/g, "");
  const body = html.slice(split);
  return `<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<meta name="robots" content="noindex, nofollow">
<meta name="apple-mobile-web-app-capable" content="yes">
<meta name="theme-color" content="#0E6B58">
<title>${title}</title>
${head}</head>
<body>
${body}
</body>
</html>`;
}
