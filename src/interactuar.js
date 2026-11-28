/* Interacción mantenida (□ en el mando, E/R en teclado, toque largo en táctil → MX.rev).
   Registro de interactuables: cada tipo registra un escáner que añade candidatos
   {x,z,label,time,tool,key,done(pl)}; el más cercano al frente (≤ 2 m) se trabaja mientras se mantiene
   el botón. Soltar, recibir daño o moverse lejos cancela. Reanimar a un aliado tiene prioridad (partida.js).
   Herramientas: hacha, mazo y palanca están siempre en el inventario; se elige la adecuada sola. */
const INTERACT = (() => {
  const TOOLS = { hacha: { n: 'Hacha', d: 'Talar árboles' }, mazo: { n: 'Mazo', d: 'Picar piedra y bloques' }, palanca: { n: 'Palanca', d: 'Desguazar metal y madera' } };
  const R = 2.0, scanners = [], cand = [];
  const S = { cur: null, prog: 0, t: 0, ctx: false, busy: false, tool: null };
  function reg(id, scan) { const i = scanners.findIndex(s => s.id === id); if (i >= 0) scanners[i].scan = scan; else scanners.push({ id, scan }); }
  function find(pl) {
    cand.length = 0; for (const s of scanners) s.scan(pl, cand);
    const fx = Math.sin(pl.yaw || 0), fz = Math.cos(pl.yaw || 0); let best = null, bs = 1e9;
    for (const c of cand) {
      const dx = c.x - pl.p.x, dz = c.z - pl.p.z, d = Math.sqrt(dx * dx + dz * dz), rr = R + (c.r || 0); if (d > rr) continue;
      const dot = d > .01 ? (dx * fx + dz * fz) / d : 1; if (d > 1.1 + (c.r || 0) && dot < -.2) continue;       // casi pegado: sirve aunque no mires; lejos: debe estar al frente
      const sc = d - dot * .6; if (sc < bs) { bs = sc; best = c; } }
    return best;
  }
  /* aro de progreso (DOM) sobre el objetivo, proyectado a pantalla */
  let el = null, ring = null, lab = null; const _v = typeof THREE !== 'undefined' ? new THREE.Vector3() : null;
  function ui() {
    if (el) return; const st = document.createElement('style'); st.textContent = `
#intRing{position:fixed;left:0;top:0;pointer-events:none;z-index:3;display:none;flex-direction:column;align-items:center;gap:3px;will-change:transform}
#intRing svg{width:52px;height:52px;filter:drop-shadow(0 1px 3px rgba(0,0,0,.6))}#intRing circle{fill:rgba(9,13,20,.55);stroke:rgba(255,255,255,.22);stroke-width:4}
#intRing circle.p{fill:none;stroke:#6dd5ff;stroke-linecap:round;transform:rotate(-90deg);transform-origin:26px 26px}
#intRing span{font:700 11px system-ui,-apple-system,sans-serif;color:#fff;background:rgba(9,13,20,.78);padding:2px 8px;border-radius:999px;white-space:nowrap;border:1px solid rgba(255,255,255,.16)}`;
    document.head.appendChild(st); el = document.createElement('div'); el.id = 'intRing';
    el.innerHTML = '<svg viewBox="0 0 52 52"><circle cx="26" cy="26" r="21"/><circle class="p" cx="26" cy="26" r="21" stroke-dasharray="131.9" stroke-dashoffset="131.9"/></svg><span></span>';
    document.body.appendChild(el); ring = el.querySelector('.p'); lab = el.querySelector('span');
  }
  function show(c, p, held) {
    ui(); if (!c) { el.style.display = 'none'; return; }
    el.style.display = 'flex'; const cam = typeof camera !== 'undefined' ? camera : null; let x = innerWidth / 2, y = innerHeight * .62;
    if (cam && _v) { _v.set(c.x, (c.y || 0) + 1.3, c.z).project(cam); if (_v.z < 1) { x = (_v.x * .5 + .5) * innerWidth; y = (-_v.y * .5 + .5) * innerHeight; } }
    x = Math.max(60, Math.min(innerWidth - 60, x)); y = Math.max(50, Math.min(innerHeight - 70, y));
    el.style.transform = 'translate(' + (x - 40).toFixed(0) + 'px,' + (y - 30).toFixed(0) + 'px)';
    ring.style.strokeDashoffset = (131.9 * (1 - Math.max(0, Math.min(1, p)))).toFixed(1); ring.style.opacity = held || p > 0 ? 1 : .35;
    const t = c.label + (held || c.blocked ? '' : ' · mantén ' + (typeof mode !== 'undefined' && mode === 'pad' ? '□' : 'E')); if (lab.textContent !== t) lab.textContent = t;
  }
  function chooseTool(c) { return c.tool && TOOLS[c.tool] ? c.tool : null; }
  /* tick del jugador. Devuelve el mensaje de estado (vacío si no hay nada que hacer). */
  function tick(pl, dt, held) {
    S.ctx = false; S.busy = false;
    if (!pl || pl.dead || pl.dwn || MX.frozen && MX.frozen() || MX.mapOpen) { S.cur = null; S.prog = 0; if (el) show(null); S.tool = null; return ''; }
    const c = find(pl);
    if (!c) { S.cur = null; S.prog = Math.max(0, S.prog - dt * 3); S.tool = null; if (el) show(null); return ''; }
    if (S.cur && S.cur.key !== c.key) S.prog = 0; S.cur = c; S.ctx = true;
    const hurt = MX.M.t - pl.lastHurt < .5;
    if (c.blocked) { S.prog = 0; S.tool = null; show(c, 0, false); return ''; }
    if (held && !hurt && !MX.M.over) {
      S.busy = true; S.tool = chooseTool(c); S.prog += dt / Math.max(.2, c.time || 2);
      if (c.work) c.work(pl, dt, S.prog);
      if (S.prog >= 1) { S.prog = 0; S.busy = false; S.tool = null; try { c.done(pl); } catch (er) { console.error(er); } }
    } else { S.prog = Math.max(0, S.prog - dt * 2); S.tool = null; }
    show(c, S.prog, held && !hurt);
    return '';
  }
  return { TOOLS, reg, tick, state: S, find, R, scanners };
})();
MX.INT = INTERACT;
