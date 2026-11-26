/* Telemetría de rendimiento (no cambia nada de lo que se ve).
   Mide el tiempo REAL entre fotogramas (lo que se nota como tirón), no solo la media, y reparte cada fotograma en zonas:
   lógica (con sus partes: IA, zombis, escuadras, cámara…), preparación del dibujo, dibujo en CPU y «resto» (GPU, recolector de basura, navegador).
   Se ve al tocar el cuadro de FPS (diagnóstico). PERF.informe() devuelve el resultado en texto para copiarlo y pegarlo.
   Interruptor: ?noperf desactiva todo. */
const PERF = (() => {
  const off = /[?&]noperf\b/.test(location.search);
  const N = 600;                                                                      // ~10 s a 60 fps
  const iv = new Float32Array(N), up = new Float32Array(N), rd = new Float32Array(N), pr = new Float32Array(N);
  let n = 0, head = 0, last = 0, since = 0;
  const part = Object.create(null);                                                  // partes de la lógica: { suma, máx, n } desde el último informe
  const spikes = [];                                                                 // últimos picos (> 33 ms): cuándo, cuánto y a qué se debió
  let tot = 0, over20 = 0, over33 = 0, over50 = 0, hidden = false, lowPower = false, started = 0;
  const pct = (a, len, p) => { if (!len) return 0; const b = Array.from(a.subarray(0, len)).sort((x, y) => x - y); return b[Math.min(len - 1, Math.floor(p * len))]; };

  /* mide una zona con nombre: PERF.t('ia', () => ...) o, sin crear funciones por fotograma, PERF.wrap(obj, 'método', 'nombre') */
  function wrap(obj, key, name) {
    if (off || !obj || typeof obj[key] !== 'function' || obj[key].__perf) return;
    const f = obj[key], nm = name || key;
    const w = function () { const t = performance.now(); try { return f.apply(this, arguments); } finally { const d = performance.now() - t, p = part[nm] || (part[nm] = { s: 0, m: 0, n: 0, f: 0 }); p.s += d; p.f += d; if (d > p.m) p.m = d; p.n++; } };
    w.__perf = 1; obj[key] = w;
  }
  /* se llama una vez por fotograma desde frame(): now = marca de rAF, u = ms de lógica, p = ms de preparación (luces, recorte por sectores), r = ms de dibujo en CPU */
  function frame(now, u, p, r) {
    if (off) return;
    if (document.hidden) { hidden = true; last = 0; return; }
    if (!started) started = now;
    if (!last || hidden) { last = now; hidden = false; return; }
    const d = now - last; last = now; if (d > 1000) return;                           // pestaña dormida: no cuenta
    iv[head] = d; up[head] = u; pr[head] = p; rd[head] = r; head = (head + 1) % N; if (n < N) n++;
    tot++; if (d > 20) over20++; if (d > 33.5) over33++; if (d > 50) over50++;
    let pmax = 0, pname = ''; for (const k in part) { if (part[k].f > pmax) { pmax = part[k].f; pname = k; } }
    if (d > 33.5 && now - started > 4000) {
      const work = u + p + r, resto = d - work;
      const causa = work > d * .6 ? (u > r + p ? 'lógica' + (pname ? ' (' + pname + ' ' + pmax.toFixed(1) + ' ms)' : '') : 'dibujo CPU') : resto > 12 ? 'GPU / basura / navegador' : 'mixto';
      spikes.push({ t: (now - started) / 1000, d, u, p, r, causa }); if (spikes.length > 12) spikes.shift();
    }
    for (const k in part) part[k].f = 0;
    since += d;
    if (since > 1000 && n > 30) lowPower = pct(iv, n, .5) > 28;                      // mediana > 28 ms: la pantalla va a 30 Hz (modo ahorro de iOS o equipo lento)
  }
  function resumen() {
    const len = n, mean = len ? iv.subarray(0, len).reduce((a, b) => a + b, 0) / len : 0;
    return { fps: mean ? 1000 / mean : 0, p50: pct(iv, len, .5), p95: pct(iv, len, .95), p99: pct(iv, len, .99), max: len ? Math.max.apply(null, Array.from(iv.subarray(0, len))) : 0,
      u95: pct(up, len, .95), p95p: pct(pr, len, .95), r95: pct(rd, len, .95), pctOver20: tot ? 100 * over20 / tot : 0, pctOver33: tot ? 100 * over33 / tot : 0, over50, tot, lowPower };
  }
  function texto(compacto) {
    const s = resumen(), f = x => x.toFixed(1);
    let t = 'p50 ' + f(s.p50) + ' · p95 ' + f(s.p95) + ' · p99 ' + f(s.p99) + ' · máx ' + f(s.max) + ' ms · >20 ms ' + f(s.pctOver20) + ' % · >33 ms ' + f(s.pctOver33) + ' %' + (s.lowPower ? ' · ¡mediana > 28 ms: pantalla a 30 Hz (modo ahorro de iOS) o equipo lento!' : '');
    if (compacto) return t;
    t += '\nlógica p95 ' + f(s.u95) + ' · prep. p95 ' + f(s.p95p) + ' · dibujo CPU p95 ' + f(s.r95) + ' ms';
    const ks = Object.keys(part).sort((a, b) => part[b].s - part[a].s).slice(0, 8);
    if (ks.length) t += '\npartes (media / máx por llamada): ' + ks.map(k => k + ' ' + (part[k].s / Math.max(1, part[k].n)).toFixed(2) + '/' + part[k].m.toFixed(1)).join(' · ');
    if (spikes.length) t += '\nÚLTIMOS TIRONES: ' + spikes.slice(-6).map(x => 't=' + x.t.toFixed(0) + 's ' + x.d.toFixed(0) + ' ms → ' + x.causa).join(' | ');
    return t;
  }
  function reset() { n = head = 0; tot = over20 = over33 = over50 = 0; spikes.length = 0; for (const k in part) delete part[k]; started = 0; last = 0; }
  let el = null;
  function pinta() {                                                                  // panel de texto bajo el contador de FPS, sólo con el diagnóstico activo
    if (off) return;
    if (!el) { el = document.createElement('pre'); el.id = 'perf'; el.style.cssText = 'position:fixed;left:8px;bottom:8px;max-width:calc(100vw - 16px);margin:0;padding:6px 8px;font:10px/1.35 ui-monospace,Menlo,monospace;color:#cfe;background:#000a;border-radius:6px;white-space:pre-wrap;pointer-events:none;z-index:50;display:none'; document.body.appendChild(el); }
    const on = typeof DIAG !== 'undefined' && DIAG.on; el.style.display = on ? 'block' : 'none'; if (on) el.textContent = texto(false);
  }
  setInterval(pinta, 500);
  return { frame, wrap, resumen, texto, informe: () => texto(false), reset, get activo() { return !off; }, partes: part, tirones: spikes };
})();
/* partes de la lógica que se miden por separado (se ve cuál se come el tiempo) */
(() => {
  if (!PERF.activo) return;
  try {
    PERF.wrap(MX, 'update', 'MX.update');
    if (MX.zom) PERF.wrap(MX.zom, 'update', 'zombis');
    if (MX.SQ) PERF.wrap(MX.SQ, 'update', 'escuadras');
    if (MX.zom) PERF.wrap(MX.zom, 'place', 'barras');
    if (typeof INVENTARIO !== 'undefined') PERF.wrap(INVENTARIO, 'tick', 'inventario');
    if (typeof MAPA !== 'undefined') PERF.wrap(MAPA, 'cull', 'cull');
    if (typeof MX.findPath === 'function') PERF.wrap(MX, 'findPath', 'findPath');
  } catch (e) { }
})();
