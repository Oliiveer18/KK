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
  const tags = [];                                                                   // eventos recientes (explosión, humo, destrucción, reaparición…) para explicar un tirón
  let gPrev = null;
  const spikes = [];                                                                 // últimos picos (> 33 ms): cuándo, cuánto y a qué se debió
  let tot = 0, over20 = 0, over33 = 0, over50 = 0, hidden = false, lowPower = false, started = 0;
  const pct = (a, len, p) => { if (!len) return 0; const b = Array.from(a.subarray(0, len)).sort((x, y) => x - y); return b[Math.min(len - 1, Math.floor(p * len))]; };

  /* mide una zona con nombre: PERF.t('ia', () => ...) o, sin crear funciones por fotograma, PERF.wrap(obj, 'método', 'nombre') */
  function wrap(obj, key, name) {
    if (off || !obj || typeof obj[key] !== 'function' || obj[key].__perf) return;
    const f = obj[key], nm = name || key;
    const w = function () { if (!DIAG.on) return f.apply(this, arguments); const t = performance.now(); try { return f.apply(this, arguments); } finally { const d = performance.now() - t, p = part[nm] || (part[nm] = { s: 0, m: 0, n: 0, f: 0 }); p.s += d; p.f += d; if (d > p.m) p.m = d; p.n++; } };
    w.__perf = 1; obj[key] = w;
  }
  /* envuelve una función cualquiera (también las locales de otros archivos, vía su gancho) y acumula su coste en la misma tabla de partes */
  function fn(f, nm) {
    if (off || typeof f !== 'function' || f.__perf) return f;
    const w = function () { if (!DIAG.on) return f.apply(this, arguments); const t = performance.now(); try { return f.apply(this, arguments); } finally { const d = performance.now() - t, p = part[nm] || (part[nm] = { s: 0, m: 0, n: 0, f: 0 }); p.s += d; p.f += d; if (d > p.m) p.m = d; p.n++; } };
    w.__perf = 1; return w;
  }
  /* se llama una vez por fotograma desde frame(): now = marca de rAF, u = ms de lógica, p = ms de preparación (luces, recorte por sectores), r = ms de dibujo en CPU */
  function tag(nm) { if (off) return; const t = performance.now(); tags.push([t, nm]); if (tags.length > 40) tags.shift(); }
  function frame(now, u, p, r) {
    if (off) return;
    if (document.hidden) { hidden = true; last = 0; return; }
    if (!started) started = now;
    if (!last || hidden) { last = now; hidden = false; return; }
    const d = now - last; last = now; if (d > 1000) return;                           // pestaña dormida: no cuenta
    iv[head] = d; up[head] = u; pr[head] = p; rd[head] = r; head = (head + 1) % N; if (n < N) n++;
    tot++; if (d > 20) over20++; if (d > 33.5) over33++; if (d > 50) over50++;
    let pmax = 0, pname = ''; for (const k in part) { if (part[k].f > pmax) { pmax = part[k].f; pname = k; } }
    let gd = '';                                                                     // shaders / geometrías / texturas nuevos en la GPU desde el fotograma anterior (una subida o compilación en pleno juego es un tirón)
    try { const i = renderer.info, g = [i.programs ? i.programs.length : 0, i.memory.geometries, i.memory.textures];
      if (gPrev) { const dd = [g[0] - gPrev[0], g[1] - gPrev[1], g[2] - gPrev[2]]; if (dd[0] > 0 || dd[1] > 0 || dd[2] > 0) gd = (dd[0] > 0 ? ' +' + dd[0] + ' shader' : '') + (dd[1] > 0 ? ' +' + dd[1] + ' geom' : '') + (dd[2] > 0 ? ' +' + dd[2] + ' tex' : ''); } gPrev = g; } catch (e) { }
    if (d > 33.5 && now - started > 4000) {
      const work = u + p + r, resto = d - work;
      const causa = work > d * .6 ? (u > r + p ? 'lógica' + (pname ? ' (' + pname + ' ' + pmax.toFixed(1) + ' ms)' : '') : 'dibujo CPU') : resto > 12 ? 'GPU / basura / navegador' : 'mixto';
      const tg = []; const t1 = performance.now(); for (const x of tags) if (t1 - x[0] < 1500) tg.push(x[1]); const ev = tg.length ? ' [' + Array.from(new Set(tg)).join(',') + ']' : '';
      spikes.push({ t: (now - started) / 1000, d, u, p, r, causa: causa + gd + ev }); if (spikes.length > 12) spikes.shift();
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
  return { frame, tag, wrap, fn, resumen, texto, informe: () => texto(false), reset, get activo() { return !off; }, partes: part, tirones: spikes };
})();
/* partes de la lógica que se miden por separado (se ve cuál se come el tiempo) */
(() => {
  if (!PERF.activo) return;
  try {
    PERF.wrap(MX, 'update', 'MX.update');
    if (MX.zom) PERF.wrap(MX.zom, 'update', 'zombis');
    if (MX.zom) PERF.wrap(MX.zom, 'hit', 'zom.hit');
    if (MX.SQ) PERF.wrap(MX.SQ, 'update', 'escuadras');
    if (MX.zom) PERF.wrap(MX.zom, 'place', 'barras');
    if (typeof INVENTARIO !== 'undefined') PERF.wrap(INVENTARIO, 'tick', 'inventario');
    if (typeof MAPA !== 'undefined') PERF.wrap(MAPA, 'cull', 'cull');
    if (typeof MX.findPath === 'function') PERF.wrap(MX, 'findPath', 'findPath');
  } catch (e) { }
})();

/* DOM: asignar a un elemento el mismo texto que ya tiene no cambia nada, pero el navegador rehace el nodo de texto y marca estilo y maquetación como sucios.
   El HUD lo hacía ~9 veces por fotograma (arma, granadas, modo, toast, números de vida…). Ahora sólo se escribe si el texto cambia. Interruptor: ?nodomcache */
(() => {
  if (/[?&]nodomcache\b/.test(location.search)) return;
  try {
    const d = Object.getOwnPropertyDescriptor(Node.prototype, 'textContent');
    Object.defineProperty(Node.prototype, 'textContent', { configurable: true, enumerable: d.enumerable, get: d.get, set(v) {
      if (this.nodeType === 1) { const c = this.firstChild, t = v == null ? '' : String(v); if (t === '' ? !c : (c && c.nodeType === 3 && !c.nextSibling && c.data === t)) return; }
      d.set.call(this, v);
    } });
  } catch (e) { }
})();

/* Sombras en fotogramas alternos. La pasada de sombra vuelve a dibujar desde el sol todo lo que proyecta (la mitad de las llamadas de dibujo).
   Se rehace cada 2 fotogramas (30 Hz): el desfase de un fotograma (16 ms) en la sombra de alguien que corre no se aprecia. Además la cámara de sombra se
   ancla a la cuadrícula de texels del mapa de sombra, así que el borde de las sombras estáticas deja de «bailar» al moverse. Interruptor: ?nosombra2 */
const SOMBRA = (() => {
  const off = /[?&]nosombra2\b/.test(location.search);
  let k = 0;
  const _d = new THREE.Vector3(), _x = new THREE.Vector3(), _y = new THREE.Vector3(), _UP = new THREE.Vector3(0, 1, 0);
  function anclar() {                                                                // desplaza sol y objetivo, en el plano del sol, a un múltiplo del tamaño de texel
    const sh = sun.shadow, cam = sh.camera, texel = (cam.right - cam.left) / sh.mapSize.x;
    _d.copy(sun.position).sub(sun.target.position).normalize(); _x.crossVectors(_UP, _d).normalize(); _y.crossVectors(_d, _x);
    const t = sun.target.position, cx = t.dot(_x), cy = t.dot(_y), dx = Math.round(cx / texel) * texel - cx, dy = Math.round(cy / texel) * texel - cy;
    t.addScaledVector(_x, dx).addScaledVector(_y, dy); sun.position.addScaledVector(_x, dx).addScaledVector(_y, dy);
  }
  return {
    get activo() { return !off; },
    pre() { if (off) return; const sm = renderer.shadowMap; k ^= 1; sm.autoUpdate = false; sm.needsUpdate = k === 0; if (k === 0) anclar(); },
    post() { if (off) return; renderer.shadowMap.autoUpdate = true; }
  };
})();

/* Math.hypot(x, z) crea un número en el montón en cada llamada (V8 no lo integra): con 100 combatientes y cientos de zombis comparando distancias eran ~270 KB de basura
   por fotograma, y en iOS el recolector de basura se nota como tirones. La versión de 2 argumentos se calcula con sqrt (se integra y no reserva memoria);
   el resultado es el mismo salvo en la última cifra decimal. Interruptor: ?nohypot */
(() => {
  if (/[?&]nohypot\b/.test(location.search)) return;
  const orig = Math.hypot;
  Math.hypot = function (a, b) { 'use strict'; if (arguments.length === 2) return Math.sqrt(a * a + b * b); return orig.apply(Math, arguments); };
})();

/* ganchos de medición en las funciones locales de partida.js y zombis.js */
(() => {
  if (!PERF.activo) return;
  try { if (MX.perfHook) MX.perfHook(PERF.fn); if (MX.zom && MX.zom.perfHook) MX.zom.perfHook(PERF.fn); } catch (e) { }
  for (const n of ['explode', 'popSmoke', 'destroyProp']) { try { const f = window[n]; if (typeof f === 'function') window[n] = function () { PERF.tag(n); return f.apply(this, arguments); }; } catch (e) { } }
  for (const n of ['updateBullets', 'updateParts', 'updateCasings', 'updateMags', 'updateGrenades', 'updateSmoke', 'updateFlames', 'updateFires', 'updatePuddles', 'updateDebris', 'updateScorch', 'updatePicks', 'updateProps', 'popTick', 'loopTick', 'lightsSync', 'bulletEnd', 'damageProp', 'bulletHitProp', 'holeDecal', 'impactFx', 'spawnBullet', 'muzzleFx']) {
    try { if (typeof window[n] === 'function') window[n] = PERF.fn(window[n], n); } catch (e) { }
  }
})();
