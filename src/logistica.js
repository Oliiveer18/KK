"use strict";
/* ===================== LOGÍSTICA (campaña): botín de los caídos y bots que reciclan =====================
   BOTÍN: al morir, un soldado suelta su mochila (munición, botiquines, kits) y ahora también el MATERIAL que llevaba; cualquier facción puede cogerlo manteniendo □ junto a ella.
   BOTS RECICLADORES: hasta 2–3 por facción (apoyo y recién reaparecidos que no van con el jugador) buscan, SOLO si están a salvo, objetos neutrales para desguazar, árboles o pilas de goteo
   cerca de su refugio (máx. 80 m; 140 m las pilas), trabajan con la misma mecánica que el jugador, y cuando la mochila está al 70 % o no queda nada a mano vuelven a la zona de depósito.
   Dejan el trabajo en cuanto hay contacto, daño, un infectado a < 25 m, o el objetivo lo ha cogido otro. No desguazan cobertura crítica (la exclusión de puntos y refugio de desguace.js). */
(function () {
const M = MX.M, SQ = MX.SQ, ECO = MX.ECO, DESG = MX.DESG, INT = MX.INT, dist = (a, b) => Math.hypot(a.x - b.x, a.z - b.z);
const LG = { stats: { jobs: [0, 0, 0, 0], aborts: [0, 0, 0, 0], carried: [0, 0, 0, 0], bots: 0 }, on: !/[?&]nologistica\b/.test(location.search) };
MX.LG = LG;

/* ---------- botín de los caídos ---------- */
const death0 = INVENTARIO.death;
INVENTARIO.death = function (e) {
  const mats = e.mat && ECO.load(e) ? Object.assign({}, e.mat) : null; if (e.mat) e.mat = null;
  const n0 = OBJ.pickups.length; death0.apply(this, arguments);
  if (!mats) return; let k = OBJ.pickups.length > n0 ? OBJ.pickups[OBJ.pickups.length - 1] : null; if (!k || k.ownerId !== e.id) { k = OBJ.pickup('pack1', e.p.x, e.p.z); if (!k) return; k.stock = {}; k.ownerId = e.id; }
  k.mats = mats; k.dropT = M.t;
};
const total = m => m ? (m.madera || 0) + (m.piedra || 0) + (m.hierro || 0) : 0;
INT.reg('botin', (pl, out) => {
  if (!MX.campaign) return; for (const k of OBJ.pickups) {
    if (!k.ownerId) continue; const dx = k.x - pl.p.x, dz = k.z - pl.p.z; if (dx * dx + dz * dz > 6.25) continue;
    const st = k.stock || {}, items = Object.keys(st).filter(q => st[q] > 0 && !/^(helmet|vest|pack)/.test(q)).reduce((a, q) => a + st[q], 0), mt = total(k.mats); if (!items && !mt) continue;
    out.push({ x: k.x, z: k.z, y: .3, r: .4, key: 'botin' + k.ownerId + ':' + items + ':' + mt, tool: null, time: 1.2, label: 'Botín de ' + k.ownerId + ' · ' + [mt ? mt + ' material' : '', items ? items + ' objetos' : ''].filter(Boolean).join(' · '),
      done: e => {
        if (k.mats) for (const t of ECO.MATS) { const n = k.mats[t] || 0; if (!n) continue; const a = ECO.addCarry(e, t, n); k.mats[t] -= a; ECO.stat.gained[e.team] += a; }
        if (!total(k.mats)) { k.mats = null; for (const q of Object.keys(k.stock || {})) if (!/^(helmet|vest|pack)/.test(q)) for (let i = 0; i < 12 && INVENTARIO.transfer(e, k, q); i++); }
        if (e.isPlayer) MX.SQ.toast('Botín recogido'); if (!total(k.mats) && OBJ.pickups.includes(k) && !Object.values(k.stock || {}).some(v => v > 0)) OBJ.removePickup(k); } }); }
});

/* ---------- bots recicladores ---------- */
const TA = [], TB = [], BLOCK = new Map();
const cls = e => e.cls || 'fus';
function enemiesNear(e, x, z, r) {
  for (const o of M.ents) if (!o.dead && !o.dwn && o.team !== e.team && (o.p.x - x) * (o.p.x - x) + (o.p.z - z) * (o.p.z - z) < r * r) return true;
  if (MX.zom) for (const z0 of MX.zom.list) if (!z0.dead && z0.st !== 'dorm' && (z0.p.x - x) * (z0.p.x - x) + (z0.p.z - z) * (z0.p.z - z) < r * r) return true;
  return false;
}
function calm(e) { return !(e.vis && e.tgt) && e.st !== 'fight' && M.t - e.lastHurt > 6 && !e.dwn && !e.dead && !e.clsWait && !e.medCall; }
function eligible(e) {
  if (e.isPlayer || e.dead || e.dwn || !e.sqd || e.sqd.playerLead || !calm(e)) return false;
  if (e.stGo) return false; if (e.hp < 60) return false;
  return cls(e) === 'sup' || M.t - (e.lifeStart || -99) < 25;
}
function maxFor(team) { const t = ECO.total(team); return t < 150 ? 3 : t > 450 ? 1 : 2; }
function cooled(e) { return M.t < (e.lgCool || 0); }
function approach(e, ref, kind) {                                                  // un punto libre junto al objeto, por el lado del bot
  const hx = kind === 'tree' ? .3 : ref.hx, hz = kind === 'tree' ? .3 : ref.hz, rad = Math.max(hx, hz) + 1.05; let best = null, bd = 1e9;
  for (let k = 0; k < 8; k++) { const a = k * .785, x = ref.x + Math.sin(a) * rad, z = ref.z + Math.cos(a) * rad; if (MX.inMainNav && !MX.inMainNav(x, z)) continue; const d = Math.hypot(x - e.p.x, z - e.p.z); if (d < bd) { bd = d; best = { x, z }; } }
  return best;
}
function claimed(ref) { const c = BLOCK.get(ref); return c && c.e && !c.e.dead && M.t - c.t < 25 && c.e.lg && c.e.lg.ref === ref; }
function pick(e) {                                                                // el trabajo más cercano y seguro
  const z = ECO.zoneOf(e.team); if (!z) return null; const room = ECO.cap(e) - ECO.load(e); if (room < 3) return null;
  let best = null, bs = 1e9;
  const consider = (kind, ref, x, z0, bonus) => { if (claimed(ref)) return; const d = Math.hypot(x - e.p.x, z0 - e.p.z) + Math.hypot(x - z.x, z0 - z.z) * .5 - (bonus || 0); if (d < bs) { bs = d; best = { kind, ref, x, z: z0 }; } };
  for (const p of DESG.near(z.x, z.z, 80, TA)) { if (p.dead || (p.rec && p.rec.done) || !DESG.canWork(e, p)) continue; consider('prop', p, p.x, p.z, ECO.yieldOf(p).n * 1.2); }
  for (const b of DESG.trees(z.x, z.z, 80, TB)) consider('tree', b, b.x, b.z, 4);
  for (const o of SQ.objs) { const q = o.pile; if (!q || q.n < 16 || o.owner !== e.team || o.contested || dist(o, z) > 140 || claimed(o)) continue; consider('pile', o, q.pos.x, q.pos.z, q.n * .8 + 10); }
  if (best && enemiesNear(e, best.x, best.z, 28)) return null; return best;
}
function startJob(e, j) {
  const ap = j.kind === 'pile' ? { x: j.x + 1.1, z: j.z } : approach(e, j.ref, j.kind); if (!ap) return false;
  e.lg = { st: 'go', kind: j.kind, ref: j.ref, ax: ap.x, az: ap.z, t0: M.t, tw: 0, chk: 0 }; BLOCK.set(j.ref, { e, t: M.t }); LG.stats.jobs[e.team]++; return true;
}
function endJob(e, abort, depot, why) {
  if (abort) { const w = LG.stats.why || (LG.stats.why = {}); w[why || '?'] = (w[why || '?'] || 0) + 1; }
  const l = e.lg; if (l && l.ref) BLOCK.delete(l.ref); DESG.stopWork(e);
  if (abort) { LG.stats.aborts[e.team]++; e.lgCool = M.t + 25; }
  e.lg = ECO.load(e) > 0 && depot !== false ? { st: 'depot', t0: M.t, chk: 0 } : null;
}
function stepBot(e, dt) {
  const l = e.lg; if (!l) return;
  if (e.dead || e.dwn || !calm(e) || M.t - l.t0 > 150) { if (e.lg) { if (!e.dead) endJob(e, true, true, e.dwn ? 'abatido' : M.t - l.t0 > 150 ? 'tiempo' : e.vis && e.tgt ? 'contacto' : e.st === 'fight' ? 'combate' : M.t - e.lastHurt <= 6 ? 'herido' : e.clsWait ? 'chapa' : 'otro'); else { if (l.ref) BLOCK.delete(l.ref); e.lg = null; } } return; }
  l.chk -= dt;
  if (l.chk <= 0) { l.chk = 1; const x = l.st === 'depot' ? e.p.x : l.ax, z = l.st === 'depot' ? e.p.z : l.az; if (enemiesNear(e, x, z, 25) && (l.st !== 'depot' || e.lg.t0 < M.t - 1)) { endJob(e, true, true, 'peligro'); return; } }
  if (l.st === 'depot') { const z = ECO.zoneOf(e.team); if (!z || (ECO.load(e) === 0) || M.t - l.t0 > 90) { e.lg = null; if (ECO.load(e) === 0) LG.stats.carried[e.team]++; } return; }
  if (l.st === 'go') { if (Math.hypot(e.p.x - l.ax, e.p.z - l.az) < 1.7 || M.t - l.t0 > 40) { if (M.t - l.t0 > 40) { endJob(e, true, true, 'ruta'); return; } l.st = 'work'; l.tw = 0; } return; }
  if (l.st === 'work') {
    e.v.set(0, 0, 0); let done = false;
    if (l.kind === 'prop') { const rec = DESG.record(l.ref); done = DESG.botWork(e, l.ref, dt); if (!done && !DESG.canWork(e, l.ref)) done = true; if (rec.done) done = true; }
    else if (l.kind === 'tree') done = DESG.botFell(e, l.ref, dt);
    else { l.tw += dt; if (l.tw >= 1.4) { ECO.collect(e, l.ref); done = true; } }
    if (done) { const full = ECO.load(e) >= ECO.cap(e) * .7; DESG.stopWork(e); BLOCK.delete(l.ref); if (full || !ECO.zoneOf(e.team)) { e.lg = { st: 'depot', t0: M.t, chk: 0 }; return; } const j = pick(e); if (j && startJob(e, j)) return; e.lg = ECO.load(e) > 0 ? { st: 'depot', t0: M.t, chk: 0 } : null; }
  }
}
function assign(dt) {
  for (let t = 0; t < 4; t++) {
    let n = 0; for (const e of M.ents) if (e.lg && e.team === t) n++; const want = maxFor(t); if (n >= want) continue;
    for (const e of M.ents) { if (e.team !== t || e.lg || !eligible(e) || cooled(e)) continue; const j = pick(e); if (j && startJob(e, j)) { n++; if (n >= want) break; } }
  }
}
const g0 = SQ.goalFor;
SQ.goalFor = e => {
  const l = e.lg; if (l && !e.isPlayer && LG.on) {
    if (l.st === 'depot') { const z = ECO.zoneOf(e.team); if (z) return { x: z.x, z: z.z, speed: 5.4, hold: true, face: 0, crouch: false }; }
    else if (l.st === 'go' || l.st === 'work') return { x: l.ax, z: l.az, speed: 5.4, hold: true, face: Math.atan2((l.ref.x !== undefined ? l.ref.x : l.ref.pile.pos.x) - l.ax, (l.ref.z !== undefined ? l.ref.z : l.ref.pile.pos.z) - l.az), crouch: false }; }
  return g0(e);
};
const restart = MX.restart; if (restart) MX.restart = function () { const r = restart.apply(this, arguments); LG.reset(); return r; };
let ta = 0;
const sqUpdate = SQ.update;
SQ.update = dt => {
  sqUpdate(dt); if (!MX.campaign || !LG.on) return;
  for (let i = 0; i < M.ents.length; i++) { const e = M.ents[i]; if (e.lg) stepBot(e, dt); }
  ta += dt; if (ta >= 2) { ta = 0; assign(2); }
};
LG.reset = () => { for (const e of M.ents) { e.lg = null; e.lgCool = 0; e.work = null; } BLOCK.clear(); for (let t = 0; t < 4; t++) { LG.stats.jobs[t] = LG.stats.aborts[t] = LG.stats.carried[t] = 0; } };
})();
