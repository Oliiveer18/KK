"use strict";
/* ===================== DESGUACE Y TALA (campaña) =====================
   Reciclar NO hace desaparecer nada: el objeto se desmonta por etapas (3). En cada etapa un grupo de piezas reales del objeto se despega, salta y VUELA a la mochila de quien trabaja
   (se suma el material de la etapa). Al terminar queda un RESTO DESGUAZADO (más bajo, más frágil y más fácil de atravesar a balazos) que no se puede reciclar otra vez: sigue ahí como
   cobertura baja y su caja de colisión no cambia (la navegación es la misma). Los recursos son FINITOS. Solo se desguazan objetos neutrales: nunca el refugio, ni su zona, ni la
   cercanía de un punto de captura. Los árboles se talan con el hacha: caen, dejan tocón y tronco, y su caja de colisión desaparece (la navegación se refresca).
   Hace ruido (atrae infectados). La herramienta aparece en la mano (jugador y bots) con postura agachada y golpes; partículas y sonidos son los de siempre. */
(function () {
const M = MX.M, SQ = MX.SQ, ECO = MX.ECO, INT = MX.INT, clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const DESG = { stats: { stages: 0, trees: 0, pieces: 0 }, STAGES: 3 };
MX.DESG = DESG;
const cellKey = (x, z) => ((Math.floor(x / 8) + 128) << 10) + (Math.floor(z / 8) + 128);
let key = null; const G = new Map(), TG = new Map(), EX = [];
function excluded(x, z) {
  for (const q of EX) if (Math.abs(x - q.x) < q.hx && Math.abs(z - q.z) < q.hz) return true;
  for (const o of SQ.objs) if ((x - o.x) * (x - o.x) + (z - o.z) * (z - o.z) < (o.r + 6) * (o.r + 6)) return true;
  return false;
}
const push = (m, k, v) => { let a = m.get(k); if (!a) m.set(k, a = []); a.push(v); };
function ensure() {
  if (key === MAPA.built && G.size) return; key = MAPA.built || null; G.clear(); TG.clear(); EX.length = 0; if (!key) return;
  const rr = key.info && key.info.refugeRects; if (rr) for (const q of rr) EX.push({ x: q.x, z: q.z, hx: q.hx + 4, hz: q.hz + 4 });
  for (const p of props) if (ECO.yield[p.type] && eligible(p)) push(G, cellKey(p.x, p.z), p);
  if (key.walls) for (const b of key.walls) if (b.tree && b.ti && !excluded(b.x, b.z)) push(TG, cellKey(b.x, b.z), b);
}
function eligible(p) { return !p.dead && !p.explosive && !(p.fluid > 0) && !p.fell && p.hp > 0 && !excluded(p.x, p.z); }
if (OBJ && OBJ.on) OBJ.on.push((ev, p) => { if (ev === 'add' && p && key && ECO.yield[p.type] && eligible(p)) push(G, cellKey(p.x, p.z), p); });

/* ---------- plan de etapas de un objeto ---------- */
const _w = new THREE.Vector3();
function plan(p, rec) {
  p.g.updateMatrixWorld(true);
  const all = p.pieces.filter(q => !q.gone), isWheel = q => p.mat === 'metal' && q.obj.geometry.type === 'CylinderGeometry' && q.size && q.size[0] > .3 && q.size[0] < .9 && p.type !== 'barrel';
  const rem = all.map(q => { q.obj.getWorldPosition(_w); return { q, w: isWheel(q), y: _w.y }; })
    .filter(o => o.q.loose || p.type === 'barrel' || o.w).sort((a, b) => (a.w ? -100 : -a.y) - (b.w ? -100 : -b.y));
  const keep = Math.min(rem.length - 1, Math.max(p.h < .5 ? 0 : 1, Math.ceil(rem.filter(o => !o.w).length * .2)));   // las piezas más bajas quedan: el resto desguazado
  const take = keep > 0 ? rem.slice(0, rem.length - keep) : rem, st = Math.max(1, Math.min(DESG.STAGES, take.length));
  rec.stages = st; rec.st = []; for (let k = 0; k < st; k++) rec.st.push(take.slice(Math.floor(k * take.length / st), Math.floor((k + 1) * take.length / st)).map(o => o.q));
}
function init(p) { const Y = ECO.yieldOf(p); const n = Y.n, T = clamp(1 + n * .1, 1.2, 2.6); return { k: 0, n, tipo: Y.tipo, stages: DESG.STAGES, st: null, got: 0, T, hitT: 0, noiseT: 0, prog: 0 }; }
DESG.units = (rec, k) => Math.floor((k + 1) * rec.n / rec.stages) - Math.floor(k * rec.n / rec.stages);
DESG.record = p => p.rec || (p.rec = init(p));
DESG.canWork = (e, p) => { const rec = DESG.record(p); return !rec.done && ECO.cap(e) - ECO.load(e) >= DESG.units(rec, rec.k); };

/* ---------- piezas que vuelan a la mochila ---------- */
const FLY = [];
function fly(q, e) {
  const o = q.obj; scene.attach(o); q.gone = true; o.getWorldPosition(_w); const s = o.scale.clone();
  FLY.push({ o, e, t: 0, x0: _w.x, y0: _w.y, z0: _w.z, s0: s, pop: .18 + Math.random() * .08, ox: (Math.random() - .5) * .5, oz: (Math.random() - .5) * .5 });
  DESG.stats.pieces++; if (FLY.length > 80) { const f = FLY.shift(); scene.remove(f.o); }
}
function flyTick(dt) {
  for (let i = FLY.length - 1; i >= 0; i--) {
    const f = FLY[i]; f.t += dt; const e = f.e, o = f.o; let u;
    if (f.t < f.pop) { u = f.t / f.pop; o.position.set(f.x0 + f.ox * u, f.y0 + Math.sin(u * Math.PI * .5) * .5, f.z0 + f.oz * u); o.rotation.x += dt * 7; o.rotation.z += dt * 5; }
    else { u = Math.min(1, (f.t - f.pop) / .42); const k = u * u * (3 - 2 * u), tx = e.p.x, ty = (e.p.y || 0) + 1.1, tz = e.p.z, sx = f.x0 + f.ox, sy = f.y0 + .5, sz = f.z0 + f.oz;
      o.position.set(sx + (tx - sx) * k, sy + (ty - sy) * k, sz + (tz - sz) * k); const sc = 1 - .75 * k; o.scale.set(f.s0.x * sc, f.s0.y * sc, f.s0.z * sc); o.rotation.x += dt * 9;
      if (u >= 1) { scene.remove(o); FLY.splice(i, 1); } }
  }
}
function hitFx(p, e, big) {
  const x = p.x + (e.p.x - p.x) * .3 + (Math.random() - .5) * p.hx, z = p.z + (e.p.z - p.z) * .3 + (Math.random() - .5) * p.hz, y = .4 + Math.random() * Math.min(.8, p.h), n = big ? 6 : 3, pos = new THREE.Vector3(x, y, z), rv = () => new THREE.Vector3((Math.random() - .5) * 3, 1 + Math.random() * 2.5, (Math.random() - .5) * 3);
  if (p.mat === 'metal') { for (let i = 0; i < n + 2; i++) spawn('spark', pos, rv().multiplyScalar(1.6), .3 + Math.random() * .3, .03, .03, .03, true, 10); playAt('IMP_metal', x, z, { gap: 140, vol: .8 }); }
  else if (p.mat === 'wood') { for (let i = 0; i < n; i++) spawn(Math.random() < .7 ? 'wood' : 'woodD', pos, rv(), .5 + Math.random() * .3, .012, .012, .07 + Math.random() * .05, true, 14); playAt('IMP_wood', x, z, { gap: 140, vol: .8 }); }
  else if (p.mat === 'sand') { for (let i = 0; i < n; i++) spawn('sand', pos, rv(), .5, .03, .03, .03, false, 4, 6); emitPuff(x, y, z, 0, .4, 0, .12, .6, .6, .8); playAt('IMP_sand', x, z, { gap: 140, vol: .8 }); }
  else { for (let i = 0; i < n; i++) spawn('chip', pos, rv(), .5, .03, .03, .03, true, 12); emitPuff(x, y, z, 0, .4, 0, .12, .6, .6, .8); playAt('IMP_block', x, z, { gap: 140, vol: .8 }); }
}
function noiseAt(x, z, r) { if (MX.zom && MX.zom.noise) MX.zom.noise(x, z, r); }

/* ---------- una etapa de desguace ---------- */
DESG.stage = (e, p) => {
  const rec = DESG.record(p); if (rec.done) return false;
  if (!rec.st) { if (MAPA.wake) MAPA.wake(p); plan(p, rec); }
  const u = DESG.units(rec, rec.k), room = ECO.cap(e) - ECO.load(e); if (room < u) return false;
  ECO.addCarry(e, rec.tipo, u); rec.got += u; ECO.stat.gained[e.team] += u;
  for (const q of rec.st[rec.k] || []) fly(q, e);
  hitFx(p, e, true); p.wob = Math.min(1, (p.wob || 0) + .4); rec.k++; DESG.stats.stages++;
  if (e.isPlayer) MX.SQ.toast('+' + u + ' ' + rec.tipo); 
  if (rec.k >= rec.stages) {                                                    // terminado: queda el resto desguazado (no desaparece)
    rec.done = true; p.stripped = true; p.maxHp = Math.max(10, Math.round(p.maxHp * .35)); p.hp = Math.min(p.hp, p.maxHp); p.pen = Math.min(.9, (p.pen === undefined ? .3 : p.pen) + .3);
    p.g.scale.y = .62; p.h *= .62; p.g.updateMatrixWorld(true);
  }
  return true;
};
/* trabajo continuo (jugador vía INT; bots con DESG.botWork): golpes, ruido y vibración del objeto */
function workFx(p, e, dt) { const rec = p.rec || DESG.record(p); rec.hitT -= dt; rec.noiseT -= dt;
  if (rec.hitT <= 0) { rec.hitT = .42; hitFx(p, e, false); p.wob = Math.min(1, (p.wob || 0) + .12); } if (rec.noiseT <= 0) { rec.noiseT = 1.4; noiseAt(p.x, p.z, 26); } }
DESG.botWork = (e, p, dt) => {                                                    // progreso de un bot en el objeto p; devuelve true al terminar el desguace
  const rec = DESG.record(p); if (rec.done) return true; e.work = { tool: toolFor(p.mat), t: M.t }; workFx(p, e, dt);
  rec.prog += dt; if (rec.prog >= rec.T) { rec.prog = 0; if (!DESG.stage(e, p)) { e.work = null; return true; } if (rec.done) { e.work = null; return true; } }
  return false;
};
DESG.stopWork = e => { e.work = null; };
function toolFor(mat) { return mat === 'wood' ? 'palanca' : mat === 'metal' ? 'palanca' : 'mazo'; }
const NAME = p => (p.meta && p.meta.name) || p.type;
DESG.ok = p => { ensure(); return !!ECO.yield[p.type] && eligible(p); };
DESG.near = (x, z, r, out) => {                                                    // objetos desguazables cerca de (x,z) para los bots
  ensure(); const cx = Math.floor(x / 8), cz = Math.floor(z / 8), R = Math.ceil(r / 8); out.length = 0;
  for (let i = -R; i <= R; i++) for (let j = -R; j <= R; j++) { const a = G.get(((cx + i + 128) << 10) + (cz + j + 128)); if (a) for (const p of a) if (!p.dead && !(p.rec && p.rec.done) && (p.x - x) * (p.x - x) + (p.z - z) * (p.z - z) <= r * r) out.push(p); }
  return out;
};

/* ---------- escáner del jugador ---------- */
INT.reg('desguace', (pl, out) => {
  if (!MX.campaign) return; ensure(); const cx = Math.floor(pl.p.x / 8), cz = Math.floor(pl.p.z / 8);
  for (let i = -1; i <= 1; i++) for (let j = -1; j <= 1; j++) {
    const a = G.get(((cx + i + 128) << 10) + (cz + j + 128)); if (a) for (const p of a) {
      if (p.dead || (p.rec && p.rec.done) || (p.x - pl.p.x) * (p.x - pl.p.x) + (p.z - pl.p.z) * (p.z - pl.p.z) > 36) continue;
      const rec = DESG.record(p), u = DESG.units(rec, rec.k), room = ECO.cap(pl) - ECO.load(pl), tool = toolFor(p.mat), nm = NAME(p);
      out.push({ x: p.x, z: p.z, y: Math.min(p.h, 1.2), r: Math.max(p.hx, p.hz) * .8, key: 'd' + p.uid + ':' + rec.k, tool, time: rec.T, blocked: room < u,
        label: room < u ? 'Mochila llena · deposita en el refugio' : 'Desguazar ' + nm + ' · ' + rec.tipo + ' ' + (rec.n - rec.got) + ' (' + (rec.k + 1) + '/' + rec.stages + ')',
        work: (e, dt) => workFx(p, e, dt), done: e => DESG.stage(e, p) }); } }
});

/* ---------- tala ---------- */
const FALL = [], LOGS = [];
function treeYield(b) { return Math.max(3, Math.round(5.5 * b.ti.k)); }
DESG.felled = b => !!b.felled;
DESG.fell = (e, b) => {
  const n = treeYield(b); if (ECO.cap(e) - ECO.load(e) < n) return false;
  const t = b.ti; b.felled = true; ECO.addCarry(e, 'madera', n); ECO.stat.gained[e.team] += n; DESG.stats.trees++;
  const bi = boxes.indexOf(b); if (bi >= 0) boxes.splice(bi, 1); const wi = MAPA.built.walls.indexOf(b); if (wi >= 0) MAPA.built.walls.splice(wi, 1); M.navT = 0;
  const Z = new THREE.Matrix4().makeScale(0, 0, 0); for (const im of [t.tr, t.a, t.b]) if (im) { im.setMatrixAt(t.i, Z); im.instanceMatrix.needsUpdate = true; }
  const T = MAPA.TREE_GEO, k = t.k, pv = new THREE.Group(); pv.position.set(b.x, 0, b.z); scene.add(pv);
  const mk = (geo, mat, y, sx, sy, sz) => { const m = new THREE.Mesh(geo, mat); m.position.set(0, y, 0); m.scale.set(sx, sy, sz); m.rotation.y = t.ry; m.castShadow = true; pv.add(m); return m; };
  const trunk = mk(t.sp === 0 ? T.t : t.sp === 1 ? T.tb : T.td, T.mt, (t.sp === 0 ? 1.2 : t.sp === 1 ? 1.5 : 1.8) * k, k, k, k), crown = [];
  if (t.sp === 0) { crown.push(mk(T.c1, T.m1, 3.7 * k, k, k, k), mk(T.c2, T.m2, 5.3 * k, k, k, k)); } else if (t.sp === 1) crown.push(mk(T.cb, T.mb, 4.2 * k, k, k * .9, k)); else crown.push(mk(T.dead, T.md, 0, k, k, k));
  const dx = b.x - e.p.x, dz = b.z - e.p.z, l = Math.hypot(dx, dz) || 1;
  const stump = new THREE.Mesh(T.t, T.mt); stump.scale.set(k, .22 * k, k); stump.position.set(b.x, 1.2 * .22 * k, b.z); stump.castShadow = true; scene.add(stump);
  FALL.push({ pv, trunk, crown, ax: dz / l, az: -dx / l, t: 0, k, done: false, landed: false, x: b.x, z: b.z, stump }); if (e.isPlayer) MX.SQ.toast('+' + n + ' madera');
  hitFx({ x: b.x, z: b.z, hx: .3, hz: .3, h: 2, mat: 'wood' }, e, true); noiseAt(b.x, b.z, 40);
  return true;
};
function fallTick(dt) {
  for (let i = FALL.length - 1; i >= 0; i--) {
    const f = FALL[i]; f.t += dt;
    if (!f.landed) { const u = Math.min(1, f.t / 1.5), th = Math.PI / 2 * (u * u * (1.2 - .2 * u)) ; f.pv.quaternion.setFromAxisAngle(new THREE.Vector3(f.ax, 0, f.az), Math.min(th, Math.PI / 2)); f.pv.position.y = .28 * f.k * u;
      if (u >= 1) { f.landed = true; f.t = 0; playAt('IMP_wood', f.x, f.z, { gap: 100, vol: 1 }); emitPuff(f.x + f.ax * 0, .3, f.z, 0, .5, 0, .3, 1.4, 1.2, .55); P.shake = Math.max(P.shake, .08); } }
    else { const u = Math.min(1, f.t / 1.6); for (const c of f.crown) c.scale.setScalar(Math.max(.001, f.k * (1 - u))); if (u >= 1) { for (const c of f.crown) f.pv.remove(c); f.crown.length = 0; LOGS.push(f); FALL.splice(i, 1); if (LOGS.length > 80) { const o = LOGS.shift(); scene.remove(o.pv); scene.remove(o.stump); } } }
  }
}
INT.reg('tala', (pl, out) => {
  if (!MX.campaign) return; ensure(); const cx = Math.floor(pl.p.x / 8), cz = Math.floor(pl.p.z / 8);
  for (let i = -1; i <= 1; i++) for (let j = -1; j <= 1; j++) {
    const a = TG.get(((cx + i + 128) << 10) + (cz + j + 128)); if (a) for (const b of a) {
      if (b.felled || (b.x - pl.p.x) * (b.x - pl.p.x) + (b.z - pl.p.z) * (b.z - pl.p.z) > 16) continue;
      const n = treeYield(b), room = ECO.cap(pl) - ECO.load(pl);
      out.push({ x: b.x, z: b.z, y: 1.6, r: .3, key: 'a' + b.x + ',' + b.z, tool: 'hacha', time: 3.4, blocked: room < n, label: room < n ? 'Mochila llena · deposita en el refugio' : 'Talar árbol · madera ' + n,
        work: (e, dt) => { const w = b._w || (b._w = { h: 0, n: 0 }); w.h -= dt; w.n -= dt; if (w.h <= 0) { w.h = .5; hitFx({ x: b.x, z: b.z, hx: .3, hz: .3, h: 2, mat: 'wood' }, e, false); } if (w.n <= 0) { w.n = 1.4; noiseAt(b.x, b.z, 30); } }, done: e => DESG.fell(e, b) }); } }
});
DESG.trees = (x, z, r, out) => { ensure(); const cx = Math.floor(x / 8), cz = Math.floor(z / 8), R = Math.ceil(r / 8); out.length = 0;
  for (let i = -R; i <= R; i++) for (let j = -R; j <= R; j++) { const a = TG.get(((cx + i + 128) << 10) + (cz + j + 128)); if (a) for (const b of a) if (!b.felled && (b.x - x) * (b.x - x) + (b.z - z) * (b.z - z) <= r * r) out.push(b); } return out; };

/* ---------- herramienta en la mano ---------- */
const TM = {}; function toolMats() { if (!TM.w) { TM.w = matStd(0x6b4a2a, .85); TM.m = matStd(0x8a929e, .45); } return TM; }
function mkTool(key) {
  const g = new THREE.Group(), m = toolMats(), part = (mat, sx, sy, sz, x, y, z, rx) => { const o = new THREE.Mesh(geoBox, mat); o.scale.set(sx, sy, sz); o.position.set(x, y, z); if (rx) o.rotation.x = rx; o.castShadow = true; g.add(o); return o; };
  if (key === 'hacha') { part(m.w, .035, .035, .78, 0, 0, .12); part(m.m, .03, .15, .2, 0, .06, .46); }
  else if (key === 'mazo') { part(m.w, .04, .04, .74, 0, 0, .12); part(m.m, .13, .13, .22, 0, 0, .5); }
  else { part(m.m, .03, .03, .86, 0, 0, .15); part(m.m, .03, .03, .16, 0, .04, .6, .7); }
  g.visible = false; return g;
}
const swing = (a, w) => -.55 + Math.sin(M.t * 8.5) * .55 * w;
const PT = { g: null, key: null, hid: false };
MX.toolPlayer = dt => {                                                            // se llama desde el modelo del jugador, tras colocar el arma
  const k = INT.state.busy ? INT.state.tool : null;
  if (k !== PT.key) { if (PT.g) { weapon.remove(PT.g); PT.g = null; } PT.key = k; if (k) { PT.g = mkTool(k); PT.g.visible = true; weapon.add(PT.g); } }
  if (k) { cur.g.visible = false; PT.hid = true; weapon.rotation.x += swing(0, 1); weapon.position.y -= .12; }
  else if (PT.hid) { cur.g.visible = true; PT.hid = false; }
};
MX.toolBot = e => {                                                                // se llama desde poseBot, tras colocar el arma del bot
  const on = !!e.work && M.t - e.work.t < .5;
  if (on) { if (!e.toolG || e.toolK !== e.work.tool) { if (e.toolG) e.root.remove(e.toolG); e.toolG = mkTool(e.work.tool); e.toolK = e.work.tool; e.root.add(e.toolG); } e.toolG.visible = true; e.gun.visible = false;
    e.gun.rotation.x += swing(0, 1); e.gun.position.y -= .1; e.toolG.position.copy(e.gun.position); e.toolG.rotation.copy(e.gun.rotation); e.crouch = Math.max(e.crouch, .8); }
  else if (e.toolG && e.toolG.visible) { e.toolG.visible = false; e.gun.visible = true; }
};

const sqUpdate = SQ.update;
SQ.update = dt => { sqUpdate(dt); if (!MX.campaign) return; if (FLY.length) flyTick(dt); if (FALL.length) fallTick(dt); };
})();
