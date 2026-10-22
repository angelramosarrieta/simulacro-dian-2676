import { jsLiteral } from "@/lib/simulator/assemble";

/**
 * Sincronización del progreso del simulador con la cuenta. Se agrega al
 * servir el HTML (no al generarlo), así también funciona en simuladores ya
 * generados. La plantilla guarda en localStorage: <ns>:v1 (aciertos por
 * pregunta) y <ns>:hist (historial de simulacros), con ns = "simulacro" + OPEC.
 *
 * - Al abrir: si la copia del servidor es más reciente que la del dispositivo,
 *   la carga en localStorage ANTES de que arranque la app.
 * - Al estudiar: cada vez que la app guarda, se envía (con pausa de 3 s y al
 *   salir de la página) a /api/simulators/<id>/progress.
 */
const PUT_MARK = "function put(k,v){";

export function injectProgressSync(
  html: string,
  p: { generationId: string; ns: string; stats: unknown; history: unknown; updatedAt: string | null }
) {
  const firstScript = html.indexOf("<script>");
  if (firstScript < 0 || html.indexOf(PUT_MARK) < 0) return html; // plantilla distinta: se sirve sin sincronizar
  const boot = `<script>(function(){
var S=${jsLiteral({ id: p.generationId, ns: p.ns, stats: p.stats ?? null, hist: p.history ?? null, at: p.updatedAt ? Date.parse(p.updatedAt) : 0 })};
window.__S2676=S;
try{var local=Number(localStorage.getItem(S.ns+":sync")||0);
if(S.at&&S.at>local){if(S.stats)localStorage.setItem(S.ns+":v1",JSON.stringify(S.stats));if(S.hist)localStorage.setItem(S.ns+":hist",JSON.stringify(S.hist));localStorage.setItem(S.ns+":sync",String(S.at));}}catch(e){}
var t=null,dirty=false;
function payload(){try{return JSON.stringify({stats:JSON.parse(localStorage.getItem(S.ns+":v1")||"{}"),history:JSON.parse(localStorage.getItem(S.ns+":hist")||"[]")})}catch(e){return null}}
function send(beacon){if(!dirty)return;var b=payload();if(!b)return;dirty=false;var u="/api/simulators/"+S.id+"/progress";
try{if(beacon&&navigator.sendBeacon){navigator.sendBeacon(u,new Blob([b],{type:"application/json"}));return}}catch(e){}
fetch(u,{method:"POST",headers:{"Content-Type":"application/json"},body:b,credentials:"same-origin",keepalive:true}).catch(function(){dirty=true});}
window.__s2676Sync=function(k){if(k!==S.ns+":v1"&&k!==S.ns+":hist")return;dirty=true;try{localStorage.setItem(S.ns+":sync",String(Date.now()))}catch(e){}
clearTimeout(t);t=setTimeout(function(){send(false)},3000)};
addEventListener("pagehide",function(){send(true)});
document.addEventListener("visibilitychange",function(){if(document.visibilityState==="hidden")send(true)});
})();</script>
`;
  const withHook = html.replace(PUT_MARK, `${PUT_MARK}try{window.__s2676Sync&&window.__s2676Sync(k)}catch(e){}`);
  const at = withHook.indexOf("<script>");
  return withHook.slice(0, at) + boot + withHook.slice(at);
}
