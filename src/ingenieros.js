"use strict";
/* ===================== INGENIEROS Y MEJORAS DEL REFUGIO (campaña) =====================
   Los bots disponibles en el refugio (recién reaparecidos o de apoyo, sin misión de combate) hacen de INGENIEROS: reconstruyen los tramos destruidos, reparan los dañados y levantan las
   mejoras en cola, gastando material del almacén por tipo (madera/piedra/hierro) y tiempo; nunca trabajan con el refugio bajo ataque (pasan a defender) y paran si falta material.
   MEJORAS por niveles: muros (parapeto de troncos → piedra → hierro), portón (1 → 3), torre de vigilancia (alcance de alerta, lo usa la defensa), enfermería (las camillas del refugio curan más
   rápido) y armería (se reaparece con más munición y granadas). La CONSOLA del refugio (junto al almacén) muestra el almacén y la cola y deja elegir «Reparar» o «Mejorar».
   Los costes están en ECO.cost / ECO.mej y se calibran con partidas simuladas (F13). */
(function () {
const M = MX.M, SQ = MX.SQ, ECO = MX.ECO, REF = MX.REF, INT = MX.INT, MATS = ECO.MATS;
ECO.wallHpLv = [0, 14000, 22400, 35000]; ECO.gateHpLv = [0, 11000, 17600, 27500];
ECO.rep = { hpps: 450, rebuildT: 12, hitEvery: .5, maxEng: 2, near: 50 };
ECO.cost = { reparar: { madera: 1.2, piedra: .5 }, reconstruir: { madera: 18, piedra: 6 } };       // reparar: por cada 1.000 de vida; reconstruir: base (luego se repara)
ECO.mej = {
  muros: [null, null, { piedra: 70, madera: 30 }, { hierro: 110, piedra: 50 }],                       // coste TOTAL del nivel (se reparte entre los tramos)
  porton: [null, null, { hierro: 40, madera: 20 }, { hierro: 80, piedra: 30 }],
  torre: [null, { madera: 50, hierro: 25 }, { hierro: 60, piedra: 30 }],
  enfermeria: [null, { madera: 40, hierro: 20 }, { hierro: 50, piedra: 20 }],
  armeria: [null, { hierro: 50, piedra: 20 }, { hierro: 90, piedra: 40 }],
};
ECO.mejMax = { muros: 3, porton: 3, torre: 2, enfermeria: 2, armeria: 2 };
ECO.mejName = { muros: 'Muros', porton: 'Portón', torre: 'Torre de vigilancia', enfermeria: 'Enfermería', armeria: 'Armería' };
const teamName = t => ['Azul', 'Rojo', 'Ámbar', 'Violeta'][t];
REF.up = [0, 1, 2, 3].map(() => ({ muros: 1, porton: 1, torre: 0, enfermeria: 0, armeria: 0 }));
REF.queue = [[], [], [], []];                                                       // cola de mejoras: { k, to, left: tramos pendientes, per: coste por tramo }
REF.stats = { repaired: [0, 0, 0, 0], rebuilt: [0, 0, 0, 0], upgraded: [0, 0, 0, 0], spent: [0, 0, 0, 0], waits: [0, 0, 0, 0] };
REF.alertRadius = t => 120 + 40 * REF.up[t].torre;                                  // radio de alerta (lo usa la defensa, F10)
REF.healMul = (x, z, team) => { const q = REF.up[team] && REF.up[team].enfermeria; const rr = MAPA.built && MAPA.built.info && MAPA.built.info.refugeRects; if (!q || !rr) return 1; const r = rr.find(o => o.fac === team); return r && Math.abs(x - r.x) <= r.hx && Math.abs(z - r.z) <= r.hz ? 1 + .5 * q : 1; };
const costOf = (c, mul) => { const o = {}; for (const k of MATS) if (c[k]) o[k] = c[k] * (mul || 1); return o; };
const fmt = c => MATS.filter(k => c[k]).map(k => Math.ceil(c[k]) + ' ' + k).join(' · ');
const lvOf = p => /(\d)$/.exec(p.type) ? +/(\d)$/.exec(p.type)[1] : 1;
const isGate = p => p.ref && /^gate/.test(p.ref.spec.type);

/* ---------- gasto fraccionado: se descuenta del almacén en unidades enteras ---------- */
function pay(team, owed) {                                                           // owed: { tipo: fracción }; devuelve false si falta material para la siguiente unidad
  for (const k of MATS) { const need = Math.floor(owed[k] || 0); if (need >= 1) { if (ECO.stock[team][k] < need) return false; } }
  for (const k of MATS) { const n = Math.floor(owed[k] || 0); if (n >= 1) { ECO.stock[team][k] -= n; owed[k] -= n; ECO.stat.spent[team] += n; REF.stats.spent[team] += n; } }
  return true;
}
const canAfford = (team, c) => MATS.every(k => (ECO.stock[team][k] || 0) >= Math.ceil(c[k] || 0));

/* ---------- sustitución de un tramo (reconstruir / mejorar) ---------- */
function replace(team, p, type, hpFrac) {
  const sp = p.ref.spec, idx = REF.seg[team].indexOf(p); const q = OBJ.place(type, sp.x, sp.z, sp.rot, sp.fac, sp.param); if (!q) return null;
  if (!p.dead) { if (MAPA.wake) MAPA.wake(p); destroyPropSilent(p); }
  const w = /^gate/.test(type) ? ECO.gateHpLv[+type.slice(-1)] : ECO.wallHpLv[+type.slice(-1)];
  q.ref = { team, kind: 'wall', blastN: 0, blastT: -99, spec: { type, x: sp.x, z: sp.z, rot: sp.rot, fac: sp.fac, param: sp.param } }; q.maxHp = w; q.hp = Math.max(1, w * hpFrac); if (idx >= 0) REF.seg[team][idx] = q; else REF.seg[team].push(q);
  if (/^gate/.test(type)) q.open = p.open; return q;
}
function destroyPropSilent(p) {                                                      // quita un tramo sin escombros ni daño (sustituido por otro mejor)
  p.dead = true; const bi = boxes.indexOf(p.box); if (bi >= 0) boxes.splice(bi, 1); scene.remove(p.g); const pi = props.indexOf(p); if (pi >= 0) props.splice(pi, 1); AWAKE.delete(p); M.navT = 0;
}

/* ---------- trabajos ---------- */
function pickJob(team, e) {
  if (REF.attacked(team)) return null; const S = REF.seg[team], st = ECO.stock[team];
  let best = null, bs = 1e9; const z = ECO.zoneOf(team);
  const taken = p => { for (const o of M.ents) if (o.eng && o !== e && o.eng.p === p && !o.dead) return true; return false; };
  for (const p of S) { if (taken(p) || (p.ref.unreach && M.t - p.ref.unreach < 60)) continue; if (p.dead) { if (canAfford(team, costOf(ECO.cost.reconstruir))) { const d = z ? Math.hypot(p.ref.spec.x - z.x, p.ref.spec.z - z.z) : 0; if (d - 1000 < bs) { bs = d - 1000; best = { k: 'rebuild', p }; } } }
    else if (p.hp < p.maxHp * .7) { const d = p.hp / p.maxHp * 100; if (d - 500 < bs) { bs = d - 500; best = { k: 'repair', p }; } } }
  const w = REF.ware[team]; if (!best && w && !w.dead && w.hp < w.maxHp * .8 && !taken(w)) best = { k: 'repair', p: w };
  if (!best) for (const q of REF.queue[team]) { if (q.left <= 0) continue; for (const p of S) { if (p.dead || taken(p) || !q.todo.has(p)) continue; best = { k: 'upgrade', p, q }; break; } if (best) break; }
  if (!best) for (const p of S) { if (!p.dead && p.hp < p.maxHp * .98 && !taken(p)) { best = { k: 'repair', p }; break; } }
  return best;
}
function startJob(e, j) { e.engRole = Math.max(e.engRole || 0, M.t + 150); e.eng = { st: 'go', k: j.k, p: j.p, q: j.q, t0: M.t, owed: {}, hitT: 0, prog: 0 }; return true; }
function approach(team, p, e) {                                                     // un punto libre junto al tramo, por el lado (dentro o fuera) en el que está el ingeniero
  const rr = MAPA.built.info.refugeRects.find(o => o.fac === team), sp = p.ref.spec, dx = rr.x - sp.x, dz = rr.z - sp.z, l = Math.hypot(dx, dz) || 1, ux = dx / l, uz = dz / l;
  const side = e && ((e.p.x - sp.x) * ux + (e.p.z - sp.z) * uz) < -.3 ? -1 : 1, key = (MAPA.built || 0), C = p.ref.appr || (p.ref.appr = {}), c = C[side]; if (c && c.t === key) return c.v;
  let v = null; for (const d of [1.5, 2.1, 2.8, 3.6]) { for (const lat of [0, 1.6, -1.6, 3.2, -3.2]) { const x = sp.x + side * ux * d - uz * lat, z = sp.z + side * uz * d + ux * lat; if (!MX.inMainNav || MX.inMainNav(x, z)) { v = { x, z }; break; } } if (v) break; }
  if (!v) v = { x: sp.x + side * ux * 1.5, z: sp.z + side * uz * 1.5 }; C[side] = { t: key, v }; return v;
}
function stopJob(e) { if (e.eng) { if (DESG_) DESG_.stopWork(e); e.eng = null; } }
let DESG_ = null;
function stepEng(e, dt) {
  const j = e.eng, team = e.team; if (!j) return;
  if (e.dead || e.dwn || REF.attacked(team) || !(!(e.vis && e.tgt) && e.st !== 'fight' && M.t - e.lastHurt > 5) || M.t - j.t0 > 240) { stopJob(e); return; }
  const sp = j.p.ref.spec, ap = approach(team, j.p, e);
  if (j.st === 'go') { if (Math.hypot(e.p.x - ap.x, e.p.z - ap.z) < 1.8) { j.st = 'work'; } else if (M.t - j.t0 > 30) { j.p.ref.unreach = M.t; stopJob(e); } return; }
  e.v.set(0, 0, 0); if (DESG_) e.work = { tool: 'mazo', t: M.t }; j.hitT -= dt; if (j.hitT <= 0) { j.hitT = ECO.rep.hitEvery; playAt('IMP_wood', sp.x, sp.z, { gap: 160, vol: .7 }); if (j.p.wob !== undefined) j.p.wob = Math.min(1, j.p.wob + .1); }
  let p = j.p;
  if (j.k === 'rebuild') {
    if (j.prog === 0 && !canAfford(team, costOf(ECO.cost.reconstruir))) { REF.stats.waits[team]++; stopJob(e); return; }
    j.prog += dt / ECO.rep.rebuildT; if (j.prog >= 1) { const c = costOf(ECO.cost.reconstruir); if (!canAfford(team, c)) { stopJob(e); return; } for (const k of MATS) if (c[k]) { ECO.stock[team][k] -= c[k]; ECO.stat.spent[team] += c[k]; REF.stats.spent[team] += c[k]; }
      const lvl = Math.min(REF.up[team][isGate(p) ? 'porton' : 'muros'], 3), type = (isGate(p) ? 'gate' : 'wallLow') + lvl; const q = replace(team, p, type, .05); REF.stats.rebuilt[team]++; if (q) { j.p = q; j.k = 'repair'; j.prog = 0; } else stopJob(e); }
    return; }
  if (j.k === 'repair') {
    const add = Math.min(p.maxHp - p.hp, ECO.rep.hpps * dt); if (add <= 0) { stopJob(e); return; }
    if (!MATS.every(k => !ECO.cost.reparar[k] || ECO.stock[team][k] >= 1)) { REF.stats.waits[team]++; stopJob(e); e.engCool = M.t + 20; return; }
    const mul = add / 1000; for (const k of MATS) if (ECO.cost.reparar[k]) j.owed[k] = (j.owed[k] || 0) + ECO.cost.reparar[k] * mul;
    if (!pay(team, j.owed)) { j.owed = {}; REF.stats.waits[team]++; stopJob(e); e.engCool = M.t + 20; return; }
    p.hp += add; REF.stats.repaired[team] += add; if (p.hp >= p.maxHp - .5) { p.hp = p.maxHp; stopJob(e); } return; }
  if (j.k === 'upgrade') {
    const q = j.q; if (!q || q.left <= 0 || !q.todo.has(p)) { stopJob(e); return; }
    j.prog += dt / 6; if (j.prog >= 1) { if (!canAfford(team, q.per)) { REF.stats.waits[team]++; stopJob(e); e.engCool = M.t + 20; return; } for (const k of MATS) if (q.per[k]) { ECO.stock[team][k] -= Math.ceil(q.per[k]); ECO.stat.spent[team] += Math.ceil(q.per[k]); REF.stats.spent[team] += Math.ceil(q.per[k]); }
      const frac = p.hp / p.maxHp, type = (q.k === 'porton' ? 'gate' : 'wallLow') + q.to; const nq = replace(team, p, type, Math.max(.3, frac)); q.todo.delete(p); q.left--; REF.stats.upgraded[team]++;
      if (q.left <= 0) { REF.up[team][q.k] = q.to; REF.queue[team] = REF.queue[team].filter(x => x !== q); if (team === (MX.pl && MX.pl.team)) SQ.toast(ECO.mejName[q.k] + ' nivel ' + q.to + ' terminado'); }
      stopJob(e); } }
}
/* mejoras que no son tramos: se levantan con material y tiempo de un ingeniero junto al almacén */
function stepSpecial(e, dt) {
  const j = e.eng; if (!j || j.k !== 'special') return false;
  const team = e.team, z = ECO.zoneOf(team);
  if (j.st === 'go') { if (Math.hypot(e.p.x - z.x, e.p.z - z.z) < 3.2) j.st = 'work'; return true; }
  e.v.set(0, 0, 0); e.work = { tool: 'mazo', t: M.t }; j.prog += dt / 18; j.hitT -= dt; if (j.hitT <= 0) { j.hitT = .5; playAt('IMP_metal', z.x, z.z, { gap: 160, vol: .7 }); }
  if (j.prog >= 1) { const q = j.q; if (!canAfford(team, q.cost)) { stopJob(e); return true; } for (const k of MATS) if (q.cost[k]) { ECO.stock[team][k] -= Math.ceil(q.cost[k]); ECO.stat.spent[team] += Math.ceil(q.cost[k]); REF.stats.spent[team] += Math.ceil(q.cost[k]); }
    REF.up[team][q.k] = q.to; REF.queue[team] = REF.queue[team].filter(x => x !== q); REF.stats.upgraded[team]++; SQ.toast && team === (MX.pl && MX.pl.team) && SQ.toast(ECO.mejName[q.k] + ' nivel ' + q.to + ' terminado'); stopJob(e); }
  return true;
}
/* ---------- cola de mejoras (la usan la consola del jugador y la decisión de los bots) ---------- */
REF.canQueue = (team, k) => { const to = REF.up[team][k] + 1; if (to > ECO.mejMax[k]) return null; if (REF.queue[team].some(q => q.k === k)) return null; if (!ECO.mej[k][to]) return null; return { to, cost: ECO.mej[k][to] }; };
REF.enqueue = (team, k) => {
  const c = REF.canQueue(team, k); if (!c) return false; if (!canAfford(team, c.cost)) return false;
  if (k === 'muros' || k === 'porton') { const segs = REF.seg[team].filter(p => !p.dead && (k === 'porton' ? isGate(p) : !isGate(p) && p.ref.kind === 'wall')); const per = {}; for (const m of MATS) if (c.cost[m]) per[m] = c.cost[m] / Math.max(1, segs.length); REF.queue[team].push({ k, to: c.to, left: segs.length, todo: new Set(segs), per, total: c.cost }); }
  else REF.queue[team].push({ k, to: c.to, left: 1, special: true, cost: c.cost, todo: new Set() });
  return true;
};
/* el almacén reserva el coste al encolar? No: se gasta por tramo; las mejoras sin tramos se pagan al terminar */

/* ---------- asignación de ingenieros ---------- */
const eligible = e => !e.isPlayer && !e.dead && !e.dwn && e.sqd && !e.sqd.playerLead && !e.lg && !e.clsWait && !e.medCall && !(e.vis && e.tgt) && e.st !== 'fight' && M.t - e.lastHurt > 6 && M.t >= (e.engCool || 0) && e.hp >= 60
  && (M.t - (e.lifeStart || -99) < 30 || M.t < (e.engRole || 0) || (e.cls || 'fus') === 'sup');
function assign() {
  for (let t = 0; t < 4; t++) {
    if (REF.attacked(t) || REF.eliminated[t]) continue; const z = ECO.zoneOf(t); if (!z) continue;
    let n = 0; for (const e of M.ents) if (e.team === t && e.eng) n++; if (n >= ECO.rep.maxEng) continue;
    const spq = REF.queue[t].find(q => q.special && q.left > 0 && !M.ents.some(o => o.eng && o.eng.q === q)); const job = pickJob(t, null) || null;
    if (!job && !spq) continue;
    for (const e of M.ents) { if (e.team !== t || e.eng || !eligible(e) || Math.hypot(e.p.x - z.x, e.p.z - z.z) > ECO.rep.near) continue;
      if (job && startJob(e, job)) { n++; break; } if (!job && spq && canAfford(t, spq.cost)) { e.engRole = Math.max(e.engRole || 0, M.t + 150); e.eng = { st: 'go', k: 'special', q: spq, t0: M.t, prog: 0, hitT: 0 }; n++; break; } }
  }
}
/* decisión de los bots: encolan mejoras cuando les sobra material (la prioridad: muros, portón, enfermería, armería, torre) */
function botPlan() {
  for (let t = 0; t < 4; t++) { if (REF.destroyed[t] || t === (MX.pl && MX.pl.team && 0)) continue; if (MX.pl && MX.pl.team === t && !MX.REF.autoPlayer) continue;
    for (const k of ['muros', 'enfermeria', 'porton', 'armeria', 'torre']) { const c = REF.canQueue(t, k); if (!c) continue; const reserve = 80; if (MATS.every(m => ECO.stock[t][m] >= Math.ceil(c.cost[m] || 0) + (c.cost[m] ? reserve : 0))) { REF.enqueue(t, k); break; } } }
}
const sqGoal = SQ.goalFor;
SQ.goalFor = e => {
  const j = e.eng; if (j && !e.isPlayer) {
    if (j.k === 'special') { const z = ECO.zoneOf(e.team); if (z) return { x: z.x + 1.4, z: z.z, speed: 5.4, hold: true, face: 0, crouch: false }; }
    else if (j.p && j.p.ref) { const ap = approach(e.team, j.p, e); const sp = j.p.ref.spec; return { x: ap.x, z: ap.z, speed: 5.4, hold: true, face: Math.atan2(sp.x - ap.x, sp.z - ap.z), crouch: false }; } }
  return sqGoal(e);
};
/* mando en la consola: cruceta ↑↓ elige, ✕ acepta, ○ cierra (como el inventario) */
const padPrev = {};
function conPad() {
  if (!dlg || !dlg.open) return; const gp = (navigator.getGamepads ? navigator.getGamepads() : [])[0]; if (!gp) return; const dn = k => !!(gp.buttons[k] && gp.buttons[k].pressed), edge = k => { const v = dn(k), e = v && !padPrev[k]; padPrev[k] = v; return e; };
  const bs = [...dlg.querySelectorAll('button:not([disabled])')]; if (!bs.length) return; let i = bs.indexOf(document.activeElement);
  if (edge(13)) { i = (i + 1) % bs.length; bs[i].focus(); } if (edge(12)) { i = (i - 1 + bs.length) % bs.length; bs[i].focus(); } if (edge(0) && i >= 0) bs[i].click(); if (edge(1)) dlg.close();
}
let ta = 0, tb = 0; const sqUpdate = SQ.update;
SQ.update = dt => {
  sqUpdate(dt); conPad(); if (!MX.campaign || !REF.on || !REF.built) return; DESG_ = MX.DESG;
  for (const e of M.ents) if (e.eng) { if (!stepSpecial(e, dt)) stepEng(e, dt); }
  ta += dt; if (ta >= 2) { ta = 0; assign(); } tb += dt; if (tb >= 15) { tb = 0; botPlan(); }
};
/* efectos de las mejoras */
const onResp = SQ.onRespawn; SQ.onRespawn = e => { onResp(e); if (!MX.campaign || REF.destroyed[e.team]) return; const a = REF.up[e.team].armeria; if (a > 0 && e.bag) { e.gCount = Math.min(5, (e.gCount || 0) + a); if (!e.isPlayer && e.w) e.ammo = e.w.max; } };
const rs = MX.restart; if (rs) MX.restart = function () { const r = rs.apply(this, arguments); for (let t = 0; t < 4; t++) { REF.up[t] = { muros: 1, porton: 1, torre: 0, enfermeria: 0, armeria: 0 }; REF.queue[t] = []; for (const k in REF.stats) REF.stats[k][t] = 0; } for (const e of M.ents) e.eng = null; return r; };

/* ---------- consola del refugio (interactuable) ---------- */
let dlg = null;
function ui() {
  if (dlg) return dlg; dlg = document.createElement('dialog'); dlg.id = 'refCon'; dlg.className = 'inv';
  const st = document.createElement('style'); st.textContent = '#refCon{max-width:min(92vw,460px)}#refCon h2{margin:0 0 6px;font-size:15px}#refCon .r{display:flex;justify-content:space-between;gap:10px;font-size:12px;padding:3px 0;border-bottom:1px solid #ffffff14}#refCon button{margin:4px 4px 0 0}#refCon small{opacity:.7}'; document.head.appendChild(st); document.body.appendChild(dlg);
  dlg.addEventListener('close', () => { MX.conOpen = false; }); return dlg;
}
function renderCon() {
  const pl = MX.pl, t = pl.team, d = ui(), s = ECO.stock[t], up = REF.up[t]; d.replaceChildren();
  const add = (tag, html, cls) => { const n = document.createElement(tag); n.innerHTML = html; if (cls) n.className = cls; d.appendChild(n); return n; };
  add('h2', 'Consola del refugio · ' + teamName(t));
  add('div', '<span>Almacén</span><b>🪵 ' + s.madera + ' · 🪨 ' + s.piedra + ' · ⛓ ' + s.hierro + '</b>', 'r');
  add('div', '<span>Integridad</span><b>' + Math.ceil(REF.pct[t]) + ' %</b>', 'r');
  const q = REF.queue[t]; add('div', '<span>Cola</span><b>' + (q.length ? q.map(x => ECO.mejName[x.k] + ' → ' + x.to + (x.left > 0 && !x.special ? ' (' + x.left + ')' : '')).join(' · ') : 'vacía') + '</b>', 'r');
  const b0 = document.createElement('button'); b0.textContent = 'Reparar todo'; b0.onclick = () => { REF.autoRepair = true; SQ.toast('Los ingenieros repararán los muros'); renderCon(); }; d.appendChild(b0);
  for (const k of Object.keys(ECO.mejMax)) { const c = REF.canQueue(t, k), b = document.createElement('button');
    if (!c) { b.textContent = ECO.mejName[k] + ' · nivel ' + up[k] + (up[k] >= ECO.mejMax[k] ? ' (máx.)' : ' (en cola)'); b.disabled = true; } else { const ok = canAfford(t, c.cost); b.textContent = 'Mejorar ' + ECO.mejName[k].toLowerCase() + ' → ' + c.to + ' · ' + fmt(c.cost); b.disabled = !ok; b.onclick = () => { if (REF.enqueue(t, k)) { SQ.toast(ECO.mejName[k] + ' en cola'); renderCon(); } }; }
    d.appendChild(b); }
  const bc = document.createElement('button'); bc.textContent = 'Cerrar'; bc.onclick = () => d.close(); d.appendChild(bc);
}
INT.reg('consola', (pl, out) => {
  if (!MX.campaign || !REF.built) return; const w = REF.ware[pl.team]; if (!w || w.dead) return; const dx = w.x - pl.p.x, dz = w.z - pl.p.z; if (dx * dx + dz * dz > 9) return;
  out.push({ x: w.x, z: w.z, y: 1.2, r: Math.max(w.hx, w.hz), key: 'consola', tool: null, time: .5, label: 'Consola del refugio', done: () => { renderCon(); const d = ui(); if (!d.open) { MX.conOpen = true; d.showModal(); } } });
});
MX.REFCON = { render: renderCon, open: () => { renderCon(); const d = ui(); if (!d.open) d.showModal(); } };
})();
