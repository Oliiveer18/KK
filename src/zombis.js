"use strict";
/* ===================== ZOMBIS · CAMPAÑA (?mapa=4) =====================
   Módulo cargado después de partida.js. Población independiente de las facciones (no puntúa): zombis locales que duermen y una horda itinerante.
   Tipos: caminante, corredor, pesado y gritón. Los combatientes caídos NO se convierten en zombis (decisión del usuario).
   Ruido: disparos, explosiones y gritos despiertan a los cercanos y desvían la horda. Atacan igual a las 4 facciones. Dibujo instanciado (una malla por pieza).
   Sin sonidos inventados: los eventos llaman a playAt('ZOM_*'), que callan hasta que exista la muestra. */
(function () {
const M = MX.M, MAXZ = 240;
const TY = {
  walker:   { hp: 70,  sc: 1,    dmg: 12, atkCd: 1.1, roam: .9,  chase: 2.4, sight: 14, lean: .5,  arm: -1.15, hs: 1,    tw: 1,   r: .42 },
  runner:   { hp: 45,  sc: .96,  dmg: 8,  atkCd: .7,  roam: 1.2, chase: 5.0, sight: 18, lean: .62, arm: -.5,   hs: .95,  tw: .9,  r: .38 },
  brute:    { hp: 320, sc: 1.32, dmg: 38, atkCd: 1.6, roam: 1.0, chase: 2.0, sight: 14, lean: .2,  arm: -.95,  hs: 1.3,  tw: 1.35, r: .62 },
  screamer: { hp: 60,  sc: 1,    dmg: 6,  atkCd: 1.0, roam: 1.0, chase: 2.3, sight: 15, lean: .08, arm: -.9,   hs: 1.25, tw: .92, r: .4 }
};
const NOISE_R = { P1: 24, P2: 32, S1: 28, S2: 30, F1: 36, F2: 48, E1: 40, E2: 40, H1: 42, H2: 55 };
const rnd = Math.random, rr = (a, b) => a + (b - a) * rnd();
const GEO = { box: new THREE.BoxGeometry(1, 1, 1), ball: new THREE.SphereGeometry(1, 8, 6), ballL: new THREE.SphereGeometry(1, 6, 5),
  limb: (() => { const g = new THREE.CylinderGeometry(1, .78, 1, 6); g.translate(0, -.5, 0); return g; })(), hang: (() => { const g = new THREE.BoxGeometry(1, 1, 1); g.translate(0, -.5, 0); return g; })(),
  spike: (() => { const g = new THREE.CylinderGeometry(.15, 1, 1, 5); g.translate(0, .5, 0); return g; })() };
const mat = () => new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: .92, flatShading: true });
/* piezas: [geometría, instancias por zombi]. Cada pieza es UNA malla instanciada, así que añadir detalle no multiplica las llamadas de dibujo por zombi */
const PARTS = { che: [GEO.box, 1], abd: [GEO.box, 1], pel: [GEO.box, 1], sho: [GEO.box, 1], nek: [GEO.limb, 1], hd: [GEO.ball, 1], jaw: [GEO.hang, 1], hair: [GEO.ballL, 1],
  ua: [GEO.limb, 2], fa: [GEO.limb, 2], hn: [GEO.hang, 2], ul: [GEO.limb, 2], ll: [GEO.limb, 2], ft: [GEO.box, 2], rg: [GEO.hang, 2], wn: [GEO.box, 3], sk: [GEO.box, 2], ey: [GEO.box, 2], bn: [GEO.spike, 1], tm: [GEO.ballL, 1],
  col: [GEO.box, 1], hood: [GEO.ballL, 1], tie: [GEO.box, 1], blt: [GEO.box, 1], pk: [GEO.box, 2], st: [GEO.box, 2] };
const IM = {}, MUL = {};
for (const k in PARTS) {
  const cap = MAXZ * PARTS[k][1]; MUL[k] = PARTS[k][1];
  const m = new THREE.InstancedMesh(PARTS[k][0], k === 'ey' ? new THREE.MeshBasicMaterial({ color: 0xffb84a }) : mat(), cap);
  m.frustumCulled = false; m.castShadow = k !== 'ey' && k !== 'sk' && k !== 'wn' && k !== 'hair'; m.receiveShadow = false;
  if (k !== 'ey') m.setColorAt(0, new THREE.Color(1, 1, 1));                       // crea el búfer de color con la capacidad completa (r128 usa count al crearlo)
  m.count = 0; m.visible = false; scene.add(m); IM[k] = m;
}
const Z = [], FREE = [], HORDES = [];                                    // zombis (vivos y cuerpos), huecos libres y hordas
let slotMax = 0, hw = 0, nextId = 1, astar = 3, zt = 0, hudT = 0, lastShot = -9, lastShotSid = '';
const _m1 = new THREE.Matrix4(), _m2 = new THREE.Matrix4(), _m3 = new THREE.Matrix4(), _m4 = new THREE.Matrix4(), _m5 = new THREE.Matrix4(), _gp = new V3(), _gv = new V3(), _q = new THREE.Quaternion(), _e = new THREE.Euler(), _p = new V3(), _s = new V3(), _c = new THREE.Color();
const smoothS = t => { t = clamp(t, 0, 1); return t * t * (3 - 2 * t); };
const grid = new Map();                                                             // separación: rejilla de 1,6 m
const gk = (x, z) => ((Math.floor(x / 1.6) + 200) << 10) | (Math.floor(z / 1.6) + 200);

/* ---- creación ---- */
function newZ(type, x, z, o) {
  o = o || {}; if (FREE.length === 0 && hw >= MAXZ) return null;
  const T = TY[type], slot = FREE.length ? FREE.pop() : hw++;
  const sc = T.sc * rr(.94, 1.06), zb = {
    id: 'Z' + (nextId++), type, slot, p: new V3(x, 0, z), v: new V3(), team: -1, crouch: 0, dead: false, hp: T.hp, maxhp: T.hp, sc, r: T.r * sc,
    st: o.st || 'dorm', yaw: o.yaw === undefined ? rr(-Math.PI, Math.PI) : o.yaw, ph: rr(0, 6.28), seed: rnd(), limp: rnd() < .5, atk: -1, atkCd: rr(.2, 1), tgt: null, tgtT: 0, thinkT: rr(0, .25),
    path: null, pi: 0, pathT: -9, stuckT: 0, sx: x, sz: z, home: { x, z }, horde: null, lie: o.lie === undefined ? 0 : o.lie, deadT: 0, stag: 0, scream: -1, screamCd: rr(3, 8), hx: x, hz: z, wait: 0, lastNoise: -9, noiseDelay: 0,
    rag: rnd() < .55, bare: rnd() < .4, gaitSpd: 0, brk: -99, bf: 1, bc: 1, bw: 0, hdx: x, hdy: 1.5, hdz: z, hdr: .13 };
  // rasgos: cada zombi es distinto (complexión, postura, heridas, pelo, ropa rota)
  zb.build = rr(.88, 1.14); zb.slouch = rr(-.1, .12); zb.shR = rr(-.14, .14); zb.hs0 = rr(.92, 1.08); zb.hair = rnd() < .65; zb.bone = rnd() < .3; zb.bare = rnd() < .45; zb.twT = rr(2, 6); zb.tw0 = 0;
  zb.wnd = [0, 1, 2].map(i => rnd() < (i === 0 ? .95 : i === 1 ? .7 : .45) ? { x: rr(-.16, .16), y: rr(-.08, .13), z: rnd() < .75 ? 1 : -1, w: rr(.07, .14), h: rr(.06, .12) } : null);
  zb.rgF = rnd() < .75; zb.rgB = rnd() < .6; zb.shoes = rnd() < .6;
  const SK = [0x6d7863, 0x5e6b57, 0x77796a, 0x546350, 0x706d5d, 0x605a68, 0x66735d], HR = [0x2a1d14, 0x3a2c20, 0x1b1b1d, 0x5a4a38, 0x6b6a66];
  const skin = new THREE.Color(SK[(rnd() * SK.length) | 0]).multiplyScalar(rr(.85, 1.08)), hairC = new THREE.Color(HR[(rnd() * HR.length) | 0]);
  /* ropa civil gastada y sucia: tonos apagados (crema sucio, gris, verde oliva, marrón, verde quirófano) que NO se parecen a los uniformes de las facciones (azul, rojo, ámbar, violeta) */
  const pick = a => a[(rnd() * a.length) | 0], dirt = (c, k) => new THREE.Color(c).multiplyScalar(k !== undefined ? k : rr(.72, .95));
  const PANTS = [0x3b3a38, 0x4a4d52, 0x56564e, 0x424a44, 0x5b5448, 0x33332f], r0 = rnd();
  let torso, pants = dirt(pick(PANTS)), trim = null;
  zb.hood = zb.tie = zb.str = zb.coat = zb.col = zb.pock = false; zb.blt = true;
  if (r0 < .3) { torso = dirt(pick([0x8a8578, 0x6b6f66, 0x5a5f5c, 0x7a6a55, 0x6c7a70])); zb.col = rnd() < .6; zb.str = rnd() < .25; zb.out = 'camisa'; }                    // camiseta/camisa
  else if (r0 < .45) { torso = dirt(pick([0x4a4a4c, 0x6e6a5e, 0x575f4e])); zb.hood = true; zb.pock = true; zb.out = 'sudadera'; }                                           // sudadera con capucha
  else if (r0 < .56) { torso = dirt(0x9a9a90, rr(.8, 1)); pants = dirt(0x5a7d73, rr(.8, 1)); zb.coat = true; zb.col = true; zb.rgF = zb.rgB = true; zb.out = 'bata'; }          // bata de laboratorio sobre quirófano
  else if (r0 < .68) { torso = dirt(pick([0x59604a, 0x4f5b47, 0x4b4f44])); pants = torso.clone().multiplyScalar(.9); zb.pock = true; zb.str = rnd() < .5; zb.out = 'mono'; }  // mono de trabajo
  else if (r0 < .78) { torso = dirt(0x5a8a78, rr(.7, .9)); pants = dirt(0x4f7a69, rr(.7, .9)); zb.col = true; zb.out = 'quirofano'; }                                          // uniforme sanitario
  else if (r0 < .87) { torso = dirt(0x38383c, rr(.8, 1)); pants = dirt(0x2e2e30, rr(.8, 1)); zb.tie = true; zb.col = true; zb.out = 'traje'; }                               // traje con corbata
  else { torso = dirt(pick([0x86867e, 0x77776f, 0x6a6e66])); zb.bare = true; zb.out = 'tirantes'; }                                                                            // camiseta de tirantes: brazos y abdomen al aire
  zb.bareA = zb.out === 'tirantes' ? [true, true] : [rnd() < .3, rnd() < .3];
  const dark = skin.clone().multiplyScalar(.55), blood = new THREE.Color(rnd() < .5 ? 0x5b1414 : 0x3b0d0d), shoe = new THREE.Color(0x2b2824);
  const set = (k, j, c) => IM[k].setColorAt(slot * MUL[k] + j, _c.set(c));
  set('che', 0, torso); set('abd', 0, zb.bare ? skin : torso.clone().multiplyScalar(.85)); set('pel', 0, pants); set('sho', 0, torso); set('nek', 0, skin); set('hd', 0, skin); set('jaw', 0, rnd() < .55 ? new THREE.Color(0x4a1616) : dark); set('hair', 0, hairC);
  set('col', 0, zb.out === 'traje' || zb.out === 'bata' ? new THREE.Color(0xb5b2a4).multiplyScalar(rr(.75, .95)) : torso.clone().multiplyScalar(.82)); set('hood', 0, torso.clone().multiplyScalar(.9)); set('tie', 0, 0x242426); set('blt', 0, 0x24211e);
  for (let s = 0; s < 2; s++) { set('pk', s, pants.clone().multiplyScalar(.85)); set('st', s, torso.clone().lerp(new THREE.Color(0xc9c6b8), .45)); }
  for (let s = 0; s < 2; s++) { const bareArm = zb.bareA[s]; set('ua', s, bareArm ? skin : torso); set('fa', s, zb.bareA[s] || rnd() < .45 ? skin : torso); set('hn', s, skin.clone().multiplyScalar(.92)); set('ul', s, pants); set('ll', s, rnd() < .35 ? skin : pants); set('ft', s, zb.shoes ? shoe : skin); set('rg', s, zb.coat ? torso.clone().multiplyScalar(.95) : torso.clone().multiplyScalar(.72)); set('sk', s, 0x1a1a14); }
  for (let s = 0; s < 3; s++) set('wn', s, blood); set('bn', 0, 0xd9d3bd); set('tm', 0, new THREE.Color(rnd() < .5 ? 0x93a05a : 0x7a8a45));
  Object.values(IM).forEach(m => { if (m.instanceColor) m.instanceColor.needsUpdate = true; });
  Z.push(zb); return zb;
}
function freeZ(z) {
  const i = Z.indexOf(z); if (i >= 0) Z.splice(i, 1); FREE.push(z.slot); _m1.makeScale(0, 0, 0);
  for (const k in IM) for (let j = 0; j < MUL[k]; j++) IM[k].setMatrixAt(z.slot * MUL[k] + j, _m1);
  if (z.horde) { const h = z.horde; h.members = h.members.filter(m => m !== z); }
}
function newHorde(x, z, mix) {
  const h = { id: HORDES.length + 1, members: [], st: 'roam', wp: null, path: null, pi: 0, tx: x, tz: z, divertT: -9, wait: 0, pathT: -9 }; HORDES.push(h);
  for (const t of mix) { const zb = newZ(t, x + rr(-3, 3), z + rr(-3, 3), { st: 'wander' }); if (zb) { zb.horde = h; h.members.push(zb); } }
  return h;
}

/* ---- ruido ---- */
function noise(x, z, R, scream) {
  for (const zb of Z) {
    if (zb.dead) continue;
    const d = Math.hypot(zb.p.x - x, zb.p.z - z), lim = R * (zb.st === 'dorm' && !scream ? .65 : 1);
    if (d > lim || zb.st === 'chase' || zb.st === 'attack') continue;
    zb.st = 'invest'; zb.hx = x + rr(-2.5, 2.5); zb.hz = z + rr(-2.5, 2.5); zb.noiseDelay = rr(.1, .9) + d * .02; zb.path = null; zb.wait = 0;
  }
  for (const h of HORDES) {
    if (!h.members.length) continue; const l = h.members[0], d = Math.hypot(l.p.x - x, l.p.z - z);
    if (d < R * 1.2 && (h.st !== 'chase') && (M.t - h.divertT > 5 || scream)) { h.divertT = M.t; h.st = 'invest'; h.tx = x; h.tz = z; h.path = null; h.pi = 0; h.wait = 0; }
  }
}
MX.zom = { list: Z, count: () => Z.filter(z => !z.dead).length, noise,
  shot: (x, z, w) => { if (!MX.campaign || !M.built) return; if (M.t - lastShot < .1 && lastShotSid === w.sid) return; lastShot = M.t; lastShotSid = w.sid; noise(x, z, NOISE_R[w.sid] || 30); },
  blast: (p, R, own) => { if (!MX.campaign) return; noise(p.x, p.z, 62);
    for (const z of Z) { if (z.dead) continue; const d = Math.hypot(z.p.x - p.x, z.p.z - p.z); if (d < R + z.r) hitZ(z, 260 * (1 - d / (R + z.r)) + 30, own, z.p.x - p.x, z.p.z - p.z, null, true); } },
  hit: (z, dmg, from, dx, dz, w) => hitZ(z, dmg, from, dx, dz, w), total: () => nextId - 1, spawn: (type, x, z, o) => newZ(type, x, z, o), horde: (x, z, mix) => newHorde(x, z, mix) };

/* ---- daño ---- */
function hitZ(z, dmg, from, dx, dz, w, quiet) {
  if (z.dead) return;
  z.hp -= dmg; z.stag = 1; z.brk = M.t; const l = Math.hypot(dx, dz) || 1; z.v.x += dx / l * 1.2; z.v.z += dz / l * 1.2;
  if (from && from.p && z.st !== 'chase' && z.st !== 'attack') { z.tgt = from; z.st = 'chase'; z.tgtT = M.t; alertNear(z, from); }
  const pl = from && from.isPlayer; if (pl && MX.popNum) MX.popNum(z, dmg);
  for (let i = 0; i < 3; i++) spawn('red', _gp.set(z.p.x, 1, z.p.z), _gv.set((Math.random() - .5) * 3 + dx / l, 1 + Math.random() * 2, (Math.random() - .5) * 3 + dz / l), .35, .035, .035, .035, true, 8);
  if (z.hp <= 0) {
    z.dead = true; z.deadT = 0; z.st = 'dead'; z.tgt = null; playAt('ZOM_death', z.p.x, z.p.z, { gap: 120 });
    if (pl && !quiet) playSnd('HIT_kill') || playSnd('HIT_marker');
  } else { playAt('ZOM_hurt', z.p.x, z.p.z, { gap: 90 }); if (pl && !quiet) playSnd('HIT_marker', { vol: 1 }); }
}
function alertNear(z, tgt) {
  for (const o of Z) { if (o === z || o.dead || o.st === 'chase' || o.st === 'attack') continue; if (Math.hypot(o.p.x - z.p.x, o.p.z - z.p.z) < 20 && (o.horde === z.horde || Math.hypot(o.p.x - z.p.x, o.p.z - z.p.z) < 9)) { o.tgt = tgt; o.st = 'chase'; o.tgtT = M.t; o.noiseDelay = rr(.2, 1.2); } }
}


/* ---- IA ---- */
function pathTo(z, x, zz) { if (astar <= 0) return false; astar--; z.path = MX.findPath(z.p.x, z.p.z, x, zz); z.pi = 0; z.pathT = M.t; return !!z.path; }
function steer(z, tx, tz, spd, dt) {                                                // avanza hacia un punto (o por su camino); devuelve la distancia que queda
  let gx = tx, gz = tz;
  if (z.path && z.pi < z.path.length) { const w = z.path[z.pi]; if (Math.hypot(w.x - z.p.x, w.z - z.p.z) < .9) z.pi++; if (z.pi < z.path.length) { gx = z.path[z.pi].x; gz = z.path[z.pi].z; } else z.path = null; }
  const dx = gx - z.p.x, dz = gz - z.p.z, d = Math.hypot(dx, dz) || 1;
  z.v.x += (dx / d * spd - z.v.x) * Math.min(1, dt * 5); z.v.z += (dz / d * spd - z.v.z) * Math.min(1, dt * 5);
  return Math.hypot(tx - z.p.x, tz - z.p.z);
}
function pickTarget(z) {
  const T = TY[z.type], R = z.st === 'dorm' ? 5.5 : T.sight; let best = null, bd = R;
  for (const e of M.ents) { if (e.dead) continue; const d = Math.hypot(e.p.x - z.p.x, e.p.z - z.p.z); if (d < bd) { bd = d; best = e; } }   // ataca a quien sea, de cualquier facción (incluidos los abatidos)
  return best;
}
function stepZ(z, dt) {
  const T = TY[z.type];
  if (z.st === 'dead') { z.deadT += dt; z.lie = smoothS(z.deadT / .5); z.v.set(0, 0, 0); if (z.deadT > 14) freeZ(z); return; }
  z.stag = Math.max(0, z.stag - dt * 3); if (z.noiseDelay > 0) { z.noiseDelay -= dt; z.v.x *= .9; z.v.z *= .9; return; }
  z.thinkT -= dt; if (z.thinkT <= 0) {
    z.thinkT = .22 + rnd() * .08; const t = pickTarget(z);
    if (t && z.st !== 'chase' && z.st !== 'attack') { z.tgt = t; z.st = 'chase'; z.tgtT = M.t; alertNear(z, t); playAt('ZOM_alert', z.p.x, z.p.z, { gap: 400 }); }
    else if (t && z.tgt !== t && (!z.tgt || z.tgt.dead || Math.hypot(t.p.x - z.p.x, t.p.z - z.p.z) < Math.hypot(z.tgt.p.x - z.p.x, z.tgt.p.z - z.p.z) - 2)) z.tgt = t;
    if (t) z.tgtT = M.t;
  }
  let spd = 0;
  if (z.st === 'chase' || z.st === 'attack') {
    const t = z.tgt; if (!t || t.dead && !t.dwn || M.t - z.tgtT > 5 || Math.hypot(t.p.x - z.p.x, t.p.z - z.p.z) > 30) { z.st = 'invest'; z.hx = t ? t.p.x : z.p.x; z.hz = t ? t.p.z : z.p.z; z.tgt = null; z.path = null; z.wait = 0; return; }
    const dx = t.p.x - z.p.x, dz = t.p.z - z.p.z, d = Math.hypot(dx, dz); z.yaw = Math.atan2(dx, dz);
    z.atkCd -= dt;
    if (d < z.r + .75) {                                                            // a distancia de golpe
      z.st = 'attack'; z.v.x *= .8; z.v.z *= .8;
      if (z.atk < 0 && z.atkCd <= 0) { z.atk = 0; z.atkCd = T.atkCd; }
      if (z.atk >= 0) { z.atk += dt / .6; if (z.atk >= .5 && !z.hitDone) { z.hitDone = true; if (d < z.r + 1.0) { MX.hit(t, T.dmg, null, dx, dz, null, 'ZOM'); playAt('ZOM_attack', z.p.x, z.p.z, { gap: 150 }); } } if (z.atk >= 1) { z.atk = -1; z.hitDone = false; } }
      if (z.type === 'brute') bruteSmash(z);
    } else {
      z.st = 'chase'; z.atk = -1; z.hitDone = false;
      if (z.needPath && d > 2.5 && pathTo(z, t.p.x, t.p.z)) z.needPath = false;
      steer(z, t.p.x, t.p.z, T.chase, dt); spd = T.chase;
      if (z.type === 'screamer' && d > 4 && d < 20) { z.screamCd -= dt; if (z.screamCd <= 0 && z.scream < 0) { z.scream = 0; z.screamCd = rr(7, 12); } }
    }
  } else if (z.st === 'invest') {
    const d = steer(z, z.hx, z.hz, T.chase * .55, dt); spd = T.chase * .55;
    if (z.needPath && d > 3 && pathTo(z, z.hx, z.hz)) z.needPath = false;
    if (d < 1.6) { z.wait += dt; z.v.x *= .8; z.v.z *= .8; spd = 0; if (z.wait > 3) { z.st = z.horde ? 'wander' : (rnd() < .5 ? 'wander' : 'dorm'); z.wait = 0; z.path = null; } }
  } else if (z.st === 'wander') {
    if (z.horde) { const h = z.horde, gx = (h.curX === undefined ? h.tx : h.curX) + Math.sin(z.seed * 40) * 2.8, gz = (h.curZ === undefined ? h.tz : h.curZ) + Math.cos(z.seed * 40) * 2.8, far = d0(z, gx, gz) > 7;
      const d = steer(z, gx, gz, T.roam * (h.st === 'invest' ? 1.9 : far ? 2.2 : 1.3), dt); spd = T.roam; if (z.needPath && d > 3 && pathTo(z, gx, gz)) z.needPath = false; }
    else { if (z.wait <= 0) { z.hx = z.home.x + rr(-6, 6); z.hz = z.home.z + rr(-6, 6); z.wait = rr(4, 9); z.path = null; } z.wait -= dt; const d = steer(z, z.hx, z.hz, T.roam * .8, dt); spd = T.roam * .8; if (d < 1.2) { z.wait = Math.min(z.wait, 0); } if (rnd() < dt * .02) z.st = 'dorm'; }
    if (!z.horde && z.st === 'wander') z.yaw = Math.atan2(z.v.x, z.v.z) || z.yaw;
  } else { z.v.x *= .85; z.v.z *= .85; if (rnd() < dt * .01) { playAt('ZOM_groan', z.p.x, z.p.z, { gap: 900, vol: .7 }); } }   // dormido
  if (z.scream >= 0) { z.scream += dt / 1.2; if (z.scream >= .35 && !z.screamDone) { z.screamDone = true; playAt('ZOM_scream', z.p.x, z.p.z, { gap: 1000 }); noise(z.p.x, z.p.z, 48, true); } if (z.scream >= 1) { z.scream = -1; z.screamDone = false; } z.v.x *= .6; z.v.z *= .6; }
  if (z.st !== 'attack' && z.st !== 'dorm' && (Math.abs(z.v.x) + Math.abs(z.v.z)) > .2 && z.st !== 'chase') z.yaw = Math.atan2(z.v.x, z.v.z);
  else if (z.st === 'chase') z.yaw = Math.atan2((z.tgt ? z.tgt.p.x : z.p.x + z.v.x) - z.p.x, (z.tgt ? z.tgt.p.z : z.p.z + z.v.z) - z.p.z);
}
const d0 = (z, x, zz) => Math.hypot(x - z.p.x, zz - z.p.z);
function bruteSmash(z) {                                                            // el pesado revienta lo que tenga delante (cajas, vallas, barriles)
  if (z.smashT !== undefined && M.t - z.smashT < 1.2) return; z.smashT = M.t;
  const fx = Math.sin(z.yaw), fz = Math.cos(z.yaw);
  for (const p of props) { if (p.dead || !p.type) continue; const d = Math.hypot(p.x - (z.p.x + fx), p.z - (z.p.z + fz)); if (d < 1.4 + Math.max(p.hx, p.hz)) { damageProp(p, 45, p.x, p.z, fx, fz, 'melee'); break; } }
}

/* ---- movimiento, separación y pose ---- */
function moveZ(z, dt) {
  if (z.st === 'dead') return;
  const k = gk(z.p.x, z.p.z); let sx = 0, sz = 0;
  for (let ox = -1; ox <= 1; ox++) for (let oz = -1; oz <= 1; oz++) { const a = grid.get(gk(z.p.x + ox * 1.6, z.p.z + oz * 1.6)); if (!a) continue; for (const o of a) { if (o === z) continue; const dx = z.p.x - o.p.x, dz = z.p.z - o.p.z, d = Math.hypot(dx, dz), m = (z.r + o.r) * .9; if (d < m && d > 1e-3) { sx += dx / d * (m - d); sz += dz / d * (m - d); } } }
  z.p.x += (z.v.x + sx * 2.5) * dt; z.p.z += (z.v.z + sz * 2.5) * dt; collide(z.p, z.r * .85, 2.6);
  z.stuckT += dt; if (z.stuckT > .6) { const mv = Math.hypot(z.p.x - z.sx, z.p.z - z.sz); z.stk = Math.hypot(z.v.x, z.v.z) > .5 && mv < .15 ? (z.stk || 0) + 1 : 0; z.sx = z.p.x; z.sz = z.p.z; z.stuckT = 0; if (z.stk >= 2 && z.st !== 'dorm') { z.needPath = true; z.path = null; } }
}
function pose(z, dt) {
  const T = TY[z.type], s = z.sc, sp = Math.hypot(z.v.x, z.v.z), lerp = (a, b, k) => a + (b - a) * k;
  z.gaitSpd += (sp - z.gaitSpd) * Math.min(1, dt * 6); z.ph += dt * (2.2 + z.gaitSpd * (z.type === 'runner' ? 2.4 : 1.9));
  const alive = z.st !== 'dead', dorm = z.st === 'dorm', amp = clamp(z.gaitSpd / (T.chase * .8), 0, 1), ph = z.ph, atk = z.atk >= 0, scr = z.scream >= 0;
  z.twT -= dt; if (z.twT <= 0 && alive) { z.twT = rr(2.5, 7); z.tw0 = .35; } z.tw0 = Math.max(0, z.tw0 - dt);          // espasmo ocasional
  const tw = z.tw0 > 0 ? Math.sin(z.tw0 * 60) * z.tw0 * .5 : 0, br = Math.sin(zt * (dorm ? 1.4 : 2.4) + z.seed * 9) * .02;
  let lean = (dorm ? .66 : T.lean + amp * .12) + z.slouch + Math.sin(ph * .5 + z.seed * 6) * .05 + z.stag * .35 - (scr ? .75 : 0) + (atk ? .3 * Math.sin(Math.min(1, z.atk * 1.6) * Math.PI) : 0);
  const sink = z.st === 'dead' && z.deadT > 11 ? -(z.deadT - 11) * .3 : 0, twist = Math.sin(ph * .5 + z.seed) * .22 * amp + tw * .4, roll = Math.sin(ph * .5) * .06 * amp * (z.type === 'brute' ? 2.4 : 1);
  _e.set(z.lie * 1.5, z.yaw, roll, 'YXZ'); _q.setFromEuler(_e);
  const B = _m1.compose(_p.set(z.p.x, sink + (alive ? Math.abs(Math.sin(ph)) * .03 * amp : 0), z.p.z), _q, _s.set(s, s, s));
  const fr = (dst, parent, lx, ly, lz, rx, ry, rz) => { _e.set(rx, ry, rz, 'XYZ'); _q.setFromEuler(_e); _m4.compose(_p.set(lx, ly, lz), _q, _s.set(1, 1, 1)); return dst.multiplyMatrices(parent, _m4); };     // marco hijo (sin escala)
  const put = (k, j, parent, lx, ly, lz, rx, ry, rz, sx, sy, sz) => { _e.set(rx, ry, rz, 'XYZ'); _q.setFromEuler(_e); _m3.compose(_p.set(lx, ly, lz), _q, _s.set(sx, sy, sz)); _m4.multiplyMatrices(parent, _m3); IM[k].setMatrixAt(z.slot * MUL[k] + j, _m4); };
  const i = z.slot, wd = T.tw * z.build, big = T.tw > 1;
  const S = fr(MS, B, 0, .87, 0, lean, twist * .4, 0);                                // columna lumbar (pivote en la cadera)
  const C = fr(MC, S, 0, .36, 0, -.05 + tw * .3, twist, z.shR * .5);                     // pecho, con giro y hombros desiguales
  put('pel', 0, B, 0, .8, 0, 0, 0, 0, .3 * wd, .17, .2 * (big ? 1.1 : 1));
  put('abd', 0, S, 0, .14, 0, 0, 0, 0, (.28 + (z.type === 'brute' ? .1 : 0)) * wd, .24, .19 * (big ? 1.2 : 1));
  put('che', 0, C, 0, .02, 0, 0, 0, 0, .39 * wd, .31, .23 * (big ? 1.15 : 1));
  put('sho', 0, C, 0, .15, 0, 0, 0, z.shR, .46 * wd, .08, .18);
  const hp = dorm ? .6 : (scr ? -.75 : .24 + Math.sin(ph * .5 + 1) * .09 + z.slouch * .5), hy = Math.sin(ph * .25 + z.seed * 9) * .14 + tw * .6, hr = Math.sin(ph * .33 + z.seed * 4) * .12 + (dorm ? .08 : .1);
  const Hd = fr(MH, C, 0, .2, .02, hp, hy, hr);                                         // cabeza (cae hacia delante, bambolea)
  put('nek', 0, C, 0, .15, .01, hp * .5, hy * .5, 0, .075 * (z.type === 'screamer' ? 1.35 : big ? 1.5 : 1), .12, .075 * (z.type === 'screamer' ? 1.35 : big ? 1.5 : 1));
  const hs = T.hs * z.hs0, jawOpen = scr ? .85 : atk ? .55 + .2 * Math.sin(z.atk * 20) : dorm ? .06 : .16 + .07 * Math.sin(ph * 2 + z.seed * 3) + (z.stag > 0 ? .3 : 0);
  put('hd', 0, Hd, 0, .09 * hs, .03, 0, 0, 0, .112 * hs, .125 * hs, .118 * hs);
  _p.set(0, .09 * hs, .03).applyMatrix4(Hd); z.hdx = _p.x; z.hdy = _p.y; z.hdz = _p.z; z.hdr = .125 * hs * s;                    // centro y radio reales de la cabeza (para colocar la barra de vida justo encima)
  put('jaw', 0, Hd, 0, .015 * hs, .075 * hs, jawOpen, 0, 0, .085 * hs, .045 * hs, .095 * hs);       // mandíbula que se abre
  put('hair', 0, Hd, 0, .15 * hs, -.01, 0, 0, 0, z.hair ? .12 * hs : 0, .065 * hs, .125 * hs);
  const ey = alive && !dorm ? 1 : 0;
  for (let q = 0; q < 2; q++) { const sg = q ? 1 : -1; put('sk', q, Hd, sg * .045 * hs, .12 * hs, .11 * hs, 0, 0, 0, .05 * hs, .038 * hs, .02); put('ey', q, Hd, sg * .045 * hs, .12 * hs, .118 * hs, 0, 0, 0, .036 * ey, .024 * ey, .018); }
  /* brazos: hombro, codo y mano; en reposo cuelgan, al perseguir se estiran hacia delante con el antebrazo caído */
  const swing = Math.sin(ph) * amp, armB = dorm ? -.1 : (scr ? -2.6 : T.arm);
  for (let q = 0; q < 2; q++) {
    const sg = q ? 1 : -1, Sh = fr(MA, C, sg * (.24 * wd + (big ? .05 : 0)), .13, 0, 0, 0, 0);
    let ua, fa, hd; const side = (q ? 1 : -1);
    if (atk && q === 0) { const k = z.atk; ua = k < .5 ? lerp(armB, -2.4, smoothS(k / .5)) : k < .7 ? lerp(-2.4, -.3, smoothS((k - .5) / .2)) : lerp(-.3, armB, smoothS((k - .7) / .3)); fa = k < .5 ? -.2 : -.1; hd = -.3; }
    else if (atk) { ua = lerp(armB, -1.5, Math.sin(Math.min(1, z.atk * 1.6) * Math.PI)); fa = -.5; hd = -.4; }
    else if (z.type === 'runner') { ua = armB + (q ? -swing : swing) * 1.0; fa = -.7 - Math.abs(swing) * .4; hd = -.2; }
    else if (dorm) { ua = -.12 + br * 4; fa = -.1; hd = .1; }
    else { ua = armB + (q ? -swing : swing) * .3 + Math.sin(ph * .5 + z.seed * 5 + q) * .1 + (z.limp && q ? .15 : 0); fa = -.55 - Math.sin(ph * .5 + q * 2) * .12; hd = .35; }
    const splay = side * (dorm ? .1 : .07 + (big ? .25 : 0)) - (scr ? side * .5 : 0);
    const UA = fr(MB, Sh, 0, 0, 0, ua, 0, splay);
    put('ua', q, UA, 0, 0, 0, 0, 0, 0, .085 * (big ? 1.35 : 1) * wd, .3, .085 * (big ? 1.35 : 1) * wd);
    const El = fr(MD, UA, 0, -.3, 0, fa, 0, 0);
    put('fa', q, El, 0, 0, 0, 0, 0, 0, .068 * (big ? 1.4 : 1), .28, .068 * (big ? 1.4 : 1));
    put('hn', q, El, 0, -.28, 0, hd, 0, 0, .085 * (big ? 1.4 : 1), .1, .045 * (big ? 1.2 : 1));
  }
  /* piernas: muslo, rodilla y pie; arrastran el pie (cojera) y flexionan la rodilla al andar */
  for (let q = 0; q < 2; q++) {
    const sg = q ? 1 : -1, drag = z.limp && q === 1, sw = Math.sin(ph + (q ? Math.PI : 0)) * amp * (drag ? .45 : .85) * (z.type === 'runner' ? 1.3 : 1);
    const th = dorm ? .05 : sw, kn = dorm ? .1 : Math.max(0, -Math.cos(ph + (q ? Math.PI : 0))) * amp * 1.1 + (drag ? .25 * amp : .1), ft = dorm ? 0 : (drag ? .55 * amp : -sw * .3);
    const Hp = fr(MB2, B, sg * .1 * wd, .86, 0, th, 0, 0);
    put('ul', q, Hp, 0, 0, 0, 0, 0, 0, .115 * (big ? 1.25 : 1) * wd, .43, .115 * (big ? 1.25 : 1) * wd);
    const Kn = fr(MC2, Hp, 0, -.43, 0, kn, 0, 0);
    put('ll', q, Kn, 0, 0, 0, 0, 0, 0, .09 * (big ? 1.25 : 1) * wd, .43, .09 * (big ? 1.25 : 1) * wd);
    const An = fr(MD2, Kn, 0, -.43, 0, ft, 0, 0);
    put('ft', q, An, 0, .02, .05, 0, 0, 0, .105 * (big ? 1.3 : 1), .065, .25 * (big ? 1.2 : 1));
  }
  /* harapos, heridas, hueso al aire y bultos según el tipo */
  put('rg', 0, S, 0, .0, .1, .12 + roll, 0, 0, z.rgF ? .27 * wd : 0, z.coat ? .62 : .28, .02); put('rg', 1, S, 0, .0, -.1, -.1, 0, 0, z.rgB ? .27 * wd : 0, z.coat ? .66 : .3, .02);   // bata: faldones hasta las rodillas
  put('col', 0, C, 0, .17, .0, hp * .3, hy * .3, 0, z.col ? .19 * wd : 0, .045, .15 * (big ? 1.1 : 1));                                  // cuello de camisa / solapas
  put('hood', 0, C, 0, .21, -.07, hp * .3, hy * .2, 0, z.hood ? .125 * hs : 0, .1 * hs, .1 * hs);                                      // capucha caída por detrás
  put('tie', 0, C, 0, .06, .122 * (big ? 1.15 : 1), 0, 0, 0, z.tie ? .04 : 0, .2, .012);                                               // corbata
  put('blt', 0, B, 0, .87 - .8 + .08, 0, 0, 0, 0, z.blt ? .31 * wd : 0, .035, .21 * (big ? 1.1 : 1));                                    // cinturón
  for (let q = 0; q < 2; q++) { const sg = q ? 1 : -1; put('pk', q, B, sg * .12 * wd, .0, .105 * (big ? 1.2 : 1), 0, 0, 0, z.pock ? .07 : 0, .09, .025); put('st', q, C, 0, q ? .03 : -.04, .122 * (big ? 1.15 : 1), 0, 0, 0, z.str ? .38 * wd : 0, .035, .012); }   // bolsillos, rayas del mono
  for (let w = 0; w < 3; w++) { const d = z.wnd[w]; if (d) put('wn', w, C, d.x * wd, d.y, d.z * .125 * (big ? 1.15 : 1), 0, 0, 0, d.w, d.h, .02); else put('wn', w, C, 0, 0, 0, 0, 0, 0, 0, 0, 0); }
  put('bn', 0, C, .18 * wd, .06, .02, 0, 0, -1.25, z.bone ? .03 : 0, .16, .03);
  const tumor = z.type === 'brute' ? [S, 0, .13, .1, .2, .17, .15] : z.type === 'screamer' ? [C, 0, .16, .06, .1, .09, .09] : null;
  if (tumor) put('tm', 0, tumor[0], tumor[1], tumor[2], tumor[3], 0, 0, 0, tumor[4], tumor[5], tumor[6]); else put('tm', 0, C, 0, 0, 0, 0, 0, 0, 0, 0, 0);
}
const MS = new THREE.Matrix4(), MC = new THREE.Matrix4(), MH = new THREE.Matrix4(), MA = new THREE.Matrix4(), MB = new THREE.Matrix4(), MD = new THREE.Matrix4(), MB2 = new THREE.Matrix4(), MC2 = new THREE.Matrix4(), MD2 = new THREE.Matrix4();

/* ---- ciclo ---- */
MX.zom.init = () => {                                                               // reparto inicial: grupos locales dormidos y una horda itinerante
  const sp = []; for (const t of [0, 1, 2, 3]) for (const s of (M.spawn[t] || [])) sp.push(s);
  const okp = (x, z) => sp.every(s => Math.hypot(s.x - x, s.z - z) > 16);
  const pts = (MX.HOT || []).filter(h => okp(h[0], h[1])); let n = 0;
  for (const h of pts) { if (n >= 9) break; const c = 2 + ((rnd() * 2) | 0); for (let i = 0; i < c; i++) { newZ(rnd() < .15 ? 'runner' : 'walker', h[0] + rr(-3, 3), h[1] + rr(-3, 3)); } n++; }
  const start = pts.length ? pts[(rnd() * pts.length) | 0] : [0, 0];
  newHorde(start[0], start[1], ['walker', 'walker', 'walker', 'walker', 'walker', 'walker', 'walker', 'walker', 'walker', 'walker', 'walker', 'walker', 'runner', 'runner', 'runner', 'brute', 'screamer']);
  for (const h of HORDES) h.roamPts = pts;
};
function stepHorde(h, dt) {
  if (!h.members.length) return;
  const l = h.members[0];
  if (h.st === 'roam' || h.st === 'invest') {
    if (h.st === 'roam' && h.wait <= 0 && (!h.path || h.pi >= h.path.length)) { const c = (h.roamPts || []).filter(q => Math.hypot(q[0] - l.p.x, q[1] - l.p.z) > 12); const q = c.length ? c[(rnd() * c.length) | 0] : [0, 0]; h.tx = q[0]; h.tz = q[1]; h.path = null; h.wait = rr(6, 14); }
    h.wait -= dt;
    if (!h.path && astar > 0) { astar--; h.path = MX.findPath(l.p.x, l.p.z, h.tx, h.tz) || [{ x: h.tx, z: h.tz }]; h.pi = 0; }
    if (h.path) { const w = h.path[Math.min(h.pi, h.path.length - 1)], d = Math.hypot(w.x - l.p.x, w.z - l.p.z); if (d < 2.2 && h.pi < h.path.length - 1) h.pi++; else if (d < 2.2) { if (h.st === 'invest') { h.wait = 3; if (h.divertT < M.t - 3) { h.st = 'roam'; h.path = null; h.wait = 0; } } else h.wait = Math.max(0, h.wait - dt * 2); } h.curX = w.x; h.curZ = w.z; }
  }
}
/* población: la región se repuebla poco a poco con grupos dormidos y, si la horda cae, aparece otra desde lejos (nunca a la vista de un combatiente) */
let popT = 20, hordeGone = 0;
const farFromAll = (x, z, R) => M.ents.every(e => e.dead || Math.hypot(e.p.x - x, e.p.z - z) > R) && M.spawn.every(a => a.every(s => Math.hypot(s.x - x, s.z - z) > 16));
function restock() {
  const alive = MX.zom.count(), pts = (MX.HOT || []).filter(h => farFromAll(h[0], h[1], 17));
  if (!pts.length) return;
  if (alive < 60) { const h = pts[(rnd() * pts.length) | 0], c = 3 + ((rnd() * 2) | 0); for (let i = 0; i < c; i++) newZ(rnd() < .15 ? 'runner' : 'walker', h[0] + rr(-3, 3), h[1] + rr(-3, 3)); }
  const live = HORDES.some(h => h.members.some(m => !m.dead)); hordeGone = live ? 0 : hordeGone + 3;
  if (hordeGone > 24 && alive < 150) { hordeGone = 0; const h = pts[(rnd() * pts.length) | 0], mix = ['walker', 'walker', 'walker', 'walker', 'walker', 'walker', 'walker', 'walker', 'walker', 'walker', 'walker', 'walker', 'runner', 'runner', 'runner', 'brute']; if (rnd() < .4) mix.push('screamer'); const hd = newHorde(h[0], h[1], mix); hd.roamPts = MX.HOT; }
}
/* ---- barras de vida de los zombis: aparecen sobre la cabeza tras recibir daño (4 s), con drenaje suave y trozo naranja del daño reciente, como las de los combatientes pero en verde tóxico ---- */
const BW = { walker: 46, runner: 40, brute: 74, screamer: 46 }, ZBAR = [], zbHold = document.createElement('div');
zbHold.style.cssText = 'position:fixed;inset:0;pointer-events:none;z-index:2;display:none'; document.body.appendChild(zbHold);
function zbMake() {
  const mk = (css, par) => { const d = document.createElement('div'); d.style.cssText = css; if (par) par.appendChild(d); return d; };
  const el = mk('position:absolute;left:0;top:0;will-change:transform,opacity;filter:drop-shadow(0 2px 4px #000a);display:none');
  const hb = mk('position:relative;transform:skewX(-22deg);background:#0b0f18c8;box-shadow:inset 0 0 0 1px #ffffff22,0 0 0 1px #000a;overflow:hidden', el);
  const c = mk('position:absolute;left:0;top:0;height:100%;width:100%;transform-origin:0 50%;background:#ff9440', hb), f = mk('position:absolute;left:0;top:0;height:100%;width:100%;transform-origin:0 50%', hb);
  mk('position:absolute;inset:0;background:linear-gradient(#ffffff55 0,#ffffff00 45%,#00000030 100%)', f);
  zbHold.appendChild(el); return { el, hb, c, f };
}
const _bp = new V3(), BAR_GAP = .5;                                                // misma separación sobre la coronilla que las barras de los combatientes: la barra sigue a la CABEZA real (que va adelantada al ir encorvados), no a los pies

let barList = [];
function updBars(dt) {
  zbHold.style.display = MX.on && MX.campaign ? 'block' : 'none'; let n = 0; barList = [];
  for (const z of Z) {
    if (z.dead || n >= 14) continue; const age = M.t - z.brk; if (age > 4) continue;
    const ratio = clamp(z.hp / z.maxhp, 0, 1); if (ratio < z.bf - .004) z.bw = .55;
    z.bf = z.bf + (ratio - z.bf) * Math.min(1, dt * (ratio < z.bf ? 16 : 7)); if (z.bw > 0) z.bw -= dt; else z.bc = z.bc + (z.bf - z.bc) * Math.min(1, dt * 5); if (z.bc < z.bf) z.bc = z.bf;
    while (ZBAR.length <= n) ZBAR.push(zbMake()); const b = ZBAR[n++], w = BW[z.type], h = z.type === 'brute' ? 6 : 4; barList.push({ z, b, w });
    b.el.style.display = 'block'; b.el.style.width = w + 'px'; b.hb.style.height = h + 'px';
    b.c.style.transform = 'scaleX(' + z.bc + ')'; b.f.style.transform = 'scaleX(' + z.bf + ')';
    b.f.style.background = ratio > .6 ? '#9bd650' : ratio > .3 ? '#ffd24a' : '#ff5a4a'; b.f.style.filter = 'brightness(' + (1 + z.stag * 1.2) + ')';
    b.el.style.opacity = clamp(age / .1, 0, 1) * clamp((4 - age) / .6, 0, 1);
  }
  for (let i = n; i < ZBAR.length; i++) ZBAR[i].el.style.display = 'none';
}
MX.zom.place = () => {                                                              // tras mover la cámara (ver MX.placeBars): proyecta y coloca las barras
  camera.updateMatrixWorld();
  for (const { z, b, w } of barList) { _bp.set(z.hdx, z.hdy + z.hdr + BAR_GAP, z.hdz).project(camera); b.el.style.display = _bp.z > 1 ? 'none' : 'block'; b.el.style.transform = 'translate(' + ((_bp.x * .5 + .5) * innerWidth - w / 2) + 'px,' + ((-_bp.y * .5 + .5) * innerHeight) + 'px) translateY(-100%)'; }
};
MX.zom.update = dt => {
  if (!MX.campaign || !M.built) return; dt = Math.min(dt, .05); zt += dt; astar = 3;
  popT -= dt; if (popT <= 0) { popT = 3; if (!MX.zom.noRestock) restock(); }
  for (const h of HORDES) stepHorde(h, dt);
  grid.clear(); for (const z of Z) { if (z.dead) continue; const k = gk(z.p.x, z.p.z); let a = grid.get(k); if (!a) { a = []; grid.set(k, a); } a.push(z); }
  for (const z of Z.slice()) {
    stepZ(z, dt); moveZ(z, dt); pose(z, dt);
  }
  let top = 0; for (const z of Z) top = Math.max(top, z.slot + 1); slotMax = top;
  for (const k in IM) { const m = IM[k]; m.count = slotMax * MUL[k]; m.visible = slotMax > 0; m.instanceMatrix.needsUpdate = true; }
  updBars(dt);
  hudT -= dt; if (hudT <= 0) { hudT = .5; $('mxScore').textContent = 'Campaña · Facción azul · ☣ ' + MX.zom.count(); }
};
})();
