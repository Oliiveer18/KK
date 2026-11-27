"use strict";
/* ===================== ZOMBIS · CAMPAÑA (?mapa=4) =====================
   Módulo cargado después de partida.js. Población independiente de las facciones (no puntúa): zombis locales que duermen y una horda itinerante.
   Tipos: caminante, corredor, pesado y gritón. Los combatientes caídos NO se convierten en zombis (decisión del usuario).
   Ruido: disparos, explosiones y gritos despiertan a los cercanos y desvían la horda. Atacan igual a las 4 facciones. Dibujo instanciado (una malla por pieza).
   Sin sonidos inventados: los eventos llaman a playAt('ZOM_*'), que callan hasta que exista la muestra. */
(function () {
const M = MX.M, MAXZ = 2200, RMAX = 240, VIEW_R = 46, NEAR_R = 75;        // MAXZ: simulados; RMAX: dibujados a la vez (los más cercanos a la cámara, dentro de VIEW_R); NEAR_R: simulación completa cerca de un combatiente
const TY = {
  walker:   { hp: 70,  sc: 1,    dmg: 15, atkCd: .95, roam: .9,  chase: 2.8, sight: 17, lean: .5,  arm: -1.15, hs: 1,    tw: 1,   r: .42 },
  runner:   { hp: 45,  sc: .96,  dmg: 10, atkCd: .6,  roam: 1.2, chase: 5.6, sight: 22, lean: .62, arm: -.5,   hs: .95,  tw: .9,  r: .38 },
  brute:    { hp: 380, sc: 1.32, dmg: 44, atkCd: 1.5, roam: 1.0, chase: 2.3, sight: 16, lean: .2,  arm: -.95,  hs: 1.3,  tw: 1.35, r: .62 },
  screamer: { hp: 60,  sc: 1,    dmg: 6,  atkCd: 1.0, roam: 1.0, chase: 2.3, sight: 15, lean: .08, arm: -.9,   hs: 1.25, tw: .92, r: .4 }
};
const NOISE_R = { P1: 30, P2: 40, S1: 35, S2: 38, F1: 45, F2: 60, E1: 50, E2: 50, H1: 52, H2: 68 };   // ×1,25: los disparos se oyen más lejos
const rnd = Math.random, rr = (a, b) => a + (b - a) * rnd();
const ZDIF = +new URLSearchParams(location.search).get('zdif') || 1;                  // ?zdif=0.7: multiplica el daño de los zombis (ajuste de dificultad sin tocar el código)
const GEO = { box: new THREE.BoxGeometry(1, 1, 1), ball: new THREE.SphereGeometry(1, 8, 6), ballL: new THREE.SphereGeometry(1, 6, 5),
  limb: (() => { const g = new THREE.CylinderGeometry(1, .78, 1, 6); g.translate(0, -.5, 0); return g; })(), hang: (() => { const g = new THREE.BoxGeometry(1, 1, 1); g.translate(0, -.5, 0); return g; })(),
  spike: (() => { const g = new THREE.CylinderGeometry(.15, 1, 1, 5); g.translate(0, .5, 0); return g; })() };
const mat = () => new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: .92, flatShading: true });
/* piezas: [geometría, instancias por zombi]. Cada pieza es UNA malla instanciada, así que añadir detalle no multiplica las llamadas de dibujo por zombi */
const PARTS = { che: [GEO.box, 1], abd: [GEO.box, 1], pel: [GEO.box, 1], sho: [GEO.box, 1], nek: [GEO.limb, 1], hd: [GEO.ball, 1], jaw: [GEO.hang, 1], hair: [GEO.ballL, 1],
  ua: [GEO.limb, 2], fa: [GEO.limb, 2], hn: [GEO.hang, 2], ul: [GEO.limb, 2], ll: [GEO.limb, 2], ft: [GEO.box, 2], rg: [GEO.hang, 2], wn: [GEO.box, 3], sk: [GEO.box, 2], ey: [GEO.box, 2], bn: [GEO.spike, 1], tm: [GEO.ballL, 1],
  col: [GEO.box, 1], hood: [GEO.ballL, 1], tie: [GEO.box, 1], blt: [GEO.box, 1], pk: [GEO.box, 2], st: [GEO.box, 2] };
const IM = {}, MUL = {}, KL = Object.keys(PARTS), KI = {}; KL.forEach((k, i) => { KI[k] = i; });
for (const k in PARTS) {
  const cap = RMAX * PARTS[k][1]; MUL[k] = PARTS[k][1];
  const m = new THREE.InstancedMesh(PARTS[k][0], k === 'ey' ? new THREE.MeshBasicMaterial({ color: 0xffb84a }) : mat(), cap);
  m.frustumCulled = false; m.castShadow = k !== 'ey' && k !== 'sk' && k !== 'wn' && k !== 'hair'; m.receiveShadow = false;
  if (k !== 'ey') m.setColorAt(0, new THREE.Color(1, 1, 1));                       // crea el búfer de color con la capacidad completa (r128 usa count al crearlo)
  m.count = 0; m.visible = false; scene.add(m); IM[k] = m;
}
const SLOT = { used: new Uint8Array(RMAX), free: [], sortT: 0 }; for (let i = RMAX - 1; i >= 0; i--) SLOT.free.push(i);         // huecos de dibujo instanciado (el 0 se asigna primero)
const _ZM = new THREE.Matrix4().makeScale(0, 0, 0);
function slotFree(z) {                                                              // libera el hueco de un zombi y oculta sus piezas (matriz de escala 0)
  const i = z.ri; z.ri = -1; if (i < 0) return; SLOT.used[i] = 0; SLOT.free.push(i);
  for (const k in IM) { const m = IM[k], n = MUL[k]; for (let j = 0; j < n; j++) m.setMatrixAt(i * n + j, _ZM); }
}
const Z = [], FREE = [], HORDES = [];                                    // zombis (vivos y cuerpos), huecos libres y hordas
let slotMax = 0, nextId = 1, nAlive = 0, astar = 3, zt = 0, hudT = 0, lastShot = -9, lastShotSid = '';
const _m1 = new THREE.Matrix4(), _m2 = new THREE.Matrix4(), _m3 = new THREE.Matrix4(), _m4 = new THREE.Matrix4(), _m5 = new THREE.Matrix4(), _gp = new V3(), _gv = new V3(), _q = new THREE.Quaternion(), _e = new THREE.Euler(), _p = new V3(), _s = new V3(), _c = new THREE.Color();
const smoothS = t => { t = clamp(t, 0, 1); return t * t * (3 - 2 * t); };
const grid = new Map();                                                             // separación: rejilla de 1,6 m
const gk = (x, z) => ((Math.floor(x / 1.6) + 200) << 10) | (Math.floor(z / 1.6) + 200);

/* ---- creación ---- */
function newZ(type, x, z, o) {
  o = o || {}; if (Z.length >= MAXZ) return null;
  const T = TY[type], slot = nextId;
  const sc = T.sc * rr(.94, 1.06), zb = {
    id: 'Z' + (nextId++), type, slot, p: new V3(x, 0, z), v: new V3(), team: -1, crouch: 0, dead: false, hp: T.hp, maxhp: T.hp, sc, r: T.r * sc,
    st: o.st || 'dorm', yaw: o.yaw === undefined ? rr(-Math.PI, Math.PI) : o.yaw, ph: rr(0, 6.28), seed: rnd(), limp: rnd() < .5, atk: -1, atkCd: rr(.2, 1), tgt: null, tgtT: 0, thinkT: rr(0, .25),
    lungeCd: rr(0, 4), lunge: 0, path: null, pj: 0, pjx: 0, pjz: 0, pi: 0, pathT: -9, stuckT: 0, sx: x, sz: z, home: { x, z }, horde: null, lie: o.lie === undefined ? 0 : o.lie, deadT: 0, stag: 0, scream: -1, screamCd: rr(3, 8), hx: x, hz: z, wait: 0, lastNoise: -9, noiseDelay: 0,
    ri: -1, cols: null, near: true, lodT: rnd() * .5, farDt: 0, rag: rnd() < .55, bare: rnd() < .4, gaitSpd: 0, brk: -99, bf: 1, bc: 1, bw: 0, hdx: x, hdy: 1.5, hdz: z, hdr: .13 };
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
  const CL = []; const set = (k, j, c) => { const q = c.isColor ? c : _c.set(c); CL.push(KI[k], j, q.r, q.g, q.b); };   // colores propios: se copian a su hueco de dibujo cuando está cerca de la cámara
  set('che', 0, torso); set('abd', 0, zb.bare ? skin : torso.clone().multiplyScalar(.85)); set('pel', 0, pants); set('sho', 0, torso); set('nek', 0, skin); set('hd', 0, skin); set('jaw', 0, rnd() < .55 ? new THREE.Color(0x4a1616) : dark); set('hair', 0, hairC);
  set('col', 0, zb.out === 'traje' || zb.out === 'bata' ? new THREE.Color(0xb5b2a4).multiplyScalar(rr(.75, .95)) : torso.clone().multiplyScalar(.82)); set('hood', 0, torso.clone().multiplyScalar(.9)); set('tie', 0, 0x242426); set('blt', 0, 0x24211e);
  for (let s = 0; s < 2; s++) { set('pk', s, pants.clone().multiplyScalar(.85)); set('st', s, torso.clone().lerp(new THREE.Color(0xc9c6b8), .45)); }
  for (let s = 0; s < 2; s++) { const bareArm = zb.bareA[s]; set('ua', s, bareArm ? skin : torso); set('fa', s, zb.bareA[s] || rnd() < .45 ? skin : torso); set('hn', s, skin.clone().multiplyScalar(.92)); set('ul', s, pants); set('ll', s, rnd() < .35 ? skin : pants); set('ft', s, zb.shoes ? shoe : skin); set('rg', s, zb.coat ? torso.clone().multiplyScalar(.95) : torso.clone().multiplyScalar(.72)); set('sk', s, 0x1a1a14); }
  for (let s = 0; s < 3; s++) set('wn', s, blood); set('bn', 0, 0xd9d3bd); set('tm', 0, new THREE.Color(rnd() < .5 ? 0x93a05a : 0x7a8a45));
  zb.cols = new Float32Array(CL);                                                  // compacto: [pieza, hueco, r, g, b] por color, sin un objeto Color por pieza (≈27 por zombi)
  Z.push(zb); return zb;
}
function freeZ(z) {
  if (z.ri >= 0) slotFree(z);
  const i = Z.indexOf(z); if (i >= 0) Z.splice(i, 1);
  if (z.horde) { const h = z.horde; h.members = h.members.filter(m => m !== z); }
}
function newHorde(x, z, mix) {
  const h = { id: HORDES.length + 1, members: [], st: 'roam', wp: null, path: null, pi: 0, tx: x, tz: z, divertT: -9, wait: 0, pathT: -9 }; HORDES.push(h);
  for (const t of mix) { const zb = newZ(t, x + rr(-3, 3), z + rr(-3, 3), { st: 'wander' }); if (zb) { zb.horde = h; h.members.push(zb); } }
  return h;
}

// La balística del juego se resuelve en XZ. Conservamos el volumen corporal
// y añadimos el pecho y la cabeza en las coordenadas de la pose dibujada.
let visiblePoses = [];
function circleEntry(ox,oz,dx,dz,x,z,r,start) {
  const fx=ox+dx*start-x, fz=oz+dz*start-z;
  const outside=fx*fx+fz*fz-r*r;
  if (outside<=0) return start;
  const along=fx*dx+fz*dz, disc=along*along-outside;
  return along<0 && disc>=0 ? start-along-Math.sqrt(disc) : Infinity;
}
function hitDistance(z,ox,oz,dx,dz,start,end) {
  const reach=2*z.sc;
  if (Math.abs(z.p.x-ox-dx*(start+end)/2)>Math.abs(dx)*(end-start)/2+reach ||
      Math.abs(z.p.z-oz-dz*(start+end)/2)>Math.abs(dz)*(end-start)/2+reach) return Infinity;
  let t=circleEntry(ox,oz,dx,dz,z.p.x,z.p.z,z.r,start);
  if (z.ri>=0) t=Math.min(t,circleEntry(ox,oz,dx,dz,z.hdx,z.hdz,z.hdr,start),
                            circleEntry(ox,oz,dx,dz,z.chx,z.chz,z.chr,start));
  return t<=end?t:Infinity;
}
const pointerVolume=new THREE.Sphere(), pointerHit=new V3();
function aimAtPose(pointer, point) {
  let nearest=Infinity;
  for (const z of visiblePoses) {
    if (z.dead) continue;
    for (let head=0;head<2;head++) {
      pointerVolume.center.set(head?z.hdx:z.chx,head?z.hdy:z.chy,head?z.hdz:z.chz);
      pointerVolume.radius=head?z.hdr:z.chr;
      if (!pointer.intersectSphere(pointerVolume,pointerHit)) continue;
      const d=pointer.origin.distanceToSquared(pointerHit);
      if (d<nearest) {nearest=d;point.copy(pointerVolume.center);}
    }
  }
}
/* ---- ruido ---- */
function noise(x, z, R, scream) {
  heatAdd(x, z, R);
  for (let i_zb = 0; i_zb < Z.length; i_zb++) { const zb = Z[i_zb];
    if (zb.dead) continue;
    const d = Math.sqrt((zb.p.x - x) * (zb.p.x - x) + (zb.p.z - z) * (zb.p.z - z)), lim = R * (zb.st === 'dorm' && !scream ? .65 : 1);
    if (d > lim || zb.st === 'chase' || zb.st === 'attack') continue;
    zb.st = 'invest'; zb.hx = x + rr(-2.5, 2.5); zb.hz = z + rr(-2.5, 2.5); zb.noiseDelay = rr(.1, .9) + d * .02; zb.path = null; zb.wait = 0;
  }
  for (let i_h = 0; i_h < HORDES.length; i_h++) { const h = HORDES[i_h];
    if (!h.members.length) continue; const l = h.members[0], d = Math.sqrt((l.p.x - x) * (l.p.x - x) + (l.p.z - z) * (l.p.z - z));
    if (d < R * 1.2 && (h.st !== 'chase') && (M.t - h.divertT > 5 || scream)) { h.divertT = M.t; h.st = 'invest'; h.tx = x; h.tz = z; h.path = null; h.pi = 0; h.wait = 0; }
  }
}
MX.zom = { list: Z, count: () => nAlive || Z.filter(z => !z.dead).length, noise,
  shot: (x, z, w) => { if (!MX.campaign || !M.built) return; if (M.t - lastShot < .1 && lastShotSid === w.sid) return; lastShot = M.t; lastShotSid = w.sid; noise(x, z, NOISE_R[w.sid] || 30); },
  blast: (p, R, own) => { if (!MX.campaign) return; noise(p.x, p.z, 62);
    for (let i_z = 0; i_z < Z.length; i_z++) { const z = Z[i_z]; if (z.dead) continue; const d = Math.sqrt((z.p.x - p.x) * (z.p.x - p.x) + (z.p.z - p.z) * (z.p.z - p.z)); if (d < R + z.r) hitZ(z, 260 * (1 - d / (R + z.r)) + 30, own, z.p.x - p.x, z.p.z - p.z, null, true); } },
  hitDistance, aimAtPose,
  hit: (z, dmg, from, dx, dz, w) => hitZ(z, dmg, from, dx, dz, w), total: () => nextId - 1, spawn: (type, x, z, o) => newZ(type, x, z, o), horde: (x, z, mix) => newHorde(x, z, mix) };

/* ---- daño ---- */
function hitZ(z, dmg, from, dx, dz, w, quiet) {
  if (z.dead) return;
  z.hp -= dmg; z.stag = 1; z.brk = M.t; const l = Math.sqrt((dx) * (dx) + (dz) * (dz)) || 1; z.v.x += dx / l * 1.2; z.v.z += dz / l * 1.2;
  if (from && from.p && z.st !== 'chase' && z.st !== 'attack') { z.tgt = from; z.st = 'chase'; z.tgtT = M.t; alertNear(z, from); }
  const pl = from && from.isPlayer; if (pl && MX.popNum) MX.popNum(z, dmg);
  for (let i = 0; i < 3; i++) spawn('red', _gp.set(z.p.x, 1, z.p.z), _gv.set((Math.random() - .5) * 3 + dx / l, 1 + Math.random() * 2, (Math.random() - .5) * 3 + dz / l), .35, .035, .035, .035, true, 8);
  if (z.hp <= 0) {
    z.dead = true; z.deadT = 0; z.st = 'dead'; z.tgt = null; playAt('ZOM_death', z.p.x, z.p.z, { gap: 120 });
    if (pl && !quiet) playSnd('HIT_kill') || playSnd('HIT_marker');
  } else { playAt('ZOM_hurt', z.p.x, z.p.z, { gap: 90 }); if (pl && !quiet) playSnd('HIT_marker', { vol: 1 }); }
}
function alertNear(z, tgt) {
  for (let i_o = 0; i_o < Z.length; i_o++) { const o = Z[i_o]; if (o === z || o.dead || o.st === 'chase' || o.st === 'attack') continue; if (Math.sqrt((o.p.x - z.p.x) * (o.p.x - z.p.x) + (o.p.z - z.p.z) * (o.p.z - z.p.z)) < 28 && (o.horde === z.horde || Math.sqrt((o.p.x - z.p.x) * (o.p.x - z.p.x) + (o.p.z - z.p.z) * (o.p.z - z.p.z)) < 14)) { o.tgt = tgt; o.st = 'chase'; o.tgtT = M.t; o.noiseDelay = rr(.2, 1.2); } }
}


/* ---- IA ---- */
let extraA = 0;
let PJT = 0;                                                                         // identificador de cada petición de ruta (para ignorar respuestas de zombis ya reutilizados)
function pathFail(z) { z.noPath = M.t; }
function pathTo(z, x, zz) {                                                          // ruta por la cola (MX.pathAsync): se pide aquí y llega en el mismo fotograma o en los siguientes
  if (z.pj) { if (Math.sqrt((x - z.pjx) * (x - z.pjx) + (zz - z.pjz) * (zz - z.pjz)) < 3) return true; z.pj = 0; }       // pedida y aún pendiente: se espera, salvo que el destino haya cambiado
  if (astar > 0) astar--; else if (z.starve >= 3 && extraA < 3) extraA++; else { z.starve = (z.starve || 0) + 1; return false; }
  z.starve = 0; z.pathT = M.t; const tok = ++PJT;
  if (!MX.pathAsync(z.p.x, z.p.z, x, zz, path => { if (z.pj !== tok) return; z.pj = 0; if (path === undefined) return; z.path = path; z.pi = 0; z.pathT = M.t; if (!path) pathFail(z); }, () => z.pj === tok && !z.dead)) { z.starve = 1; return false; }
  z.pj = tok; z.pjx = x; z.pjz = zz; return true;
}
function steer(z, tx, tz, spd, dt) {                                                // avanza hacia un punto (o por su camino); devuelve la distancia que queda
  let gx = tx, gz = tz;
  if (z.path && z.pi < z.path.length) { const w = z.path[z.pi]; if (Math.sqrt((w.x - z.p.x) * (w.x - z.p.x) + (w.z - z.p.z) * (w.z - z.p.z)) < .9) z.pi++; if (z.pi < z.path.length) { gx = z.path[z.pi].x; gz = z.path[z.pi].z; } else z.path = null; }
  let dx = gx - z.p.x, dz = gz - z.p.z; const d = Math.sqrt((dx) * (dx) + (dz) * (dz)) || 1; dx /= d; dz /= d;
  if (MX.navAt) {                                                                   // mira por delante y rodea el obstáculo sin esperar a atascarse
    const L = Math.min(1.5, d);
    if (!MX.navAt(z.p.x + dx * L, z.p.z + dz * L) || !MX.navAt(z.p.x + dx * L * .5, z.p.z + dz * L * .5)) {
      const sgn = z.side || (z.side = rnd() < .5 ? 1 : -1); 
      rodeo: for (const a of [.6, 1.2, 1.9, 2.5]) for (const sg of [sgn, -sgn]) { const c = Math.cos(a * sg), n = Math.sin(a * sg), rx = dx * c - dz * n, rz = dx * n + dz * c; if (MX.navAt(z.p.x + rx * 1.5, z.p.z + rz * 1.5) && MX.navAt(z.p.x + rx * .7, z.p.z + rz * .7)) { dx = rx; dz = rz; break rodeo; } }
      if (!z.path && d > 1.5) z.needPath = true;                                   // línea tapada: ruta ya, no tras 1,2 s quieto
    }
  }
  z.v.x += (dx * spd - z.v.x) * Math.min(1, dt * 5); z.v.z += (dz * spd - z.v.z) * Math.min(1, dt * 5);
  return Math.sqrt((tx - z.p.x) * (tx - z.p.x) + (tz - z.p.z) * (tz - z.p.z));
}
const _zq = [];
function pickTarget(z) {
  const T = TY[z.type], R0 = z.st === 'dorm' ? 9 : T.sight; let best = null, bd = 1e9;                           // dormido: 9 m (antes 5,5); despierto: su vista (17–22 m)
  const L = MX.entRect ? MX.entRect(z.p.x - R0 - 12, z.p.z - R0 - 12, z.p.x + R0 + 12, z.p.z + R0 + 12, _zq) : M.ents;
  for (let i_e = 0; i_e < L.length; i_e++) { const e = L[i_e]; if (e.dead) continue; const dx = e.p.x - z.p.x, dz = e.p.z - z.p.z, d = Math.sqrt(dx * dx + dz * dz), sp = Math.sqrt(e.v.x * e.v.x + e.v.z * e.v.z), R = R0 + sp * 1.3 - (e.crouch > .5 ? 2.5 : 0);   // correr se oye (+1,3 m por m/s), agacharse se oye menos
    if (d < R && d < bd) { bd = d; best = e; } }   // ataca a quien sea, de cualquier facción (incluidos los abatidos)
  return best;
}
function stepZ(z, dt) {
  const T = TY[z.type];
  if (z.st === 'dead') { z.deadT += dt; z.lie = smoothS(z.deadT / .5); z.v.set(0, 0, 0); if (z.deadT > 14) freeZ(z); return; }
  z.stag = Math.max(0, z.stag - dt * 3); if (z.noiseDelay > 0) { z.noiseDelay -= dt; z.v.x *= .9; z.v.z *= .9; return; }
  z.thinkT -= dt; if (z.thinkT <= 0) {
    z.thinkT = .22 + rnd() * .08; const t = pickTarget(z);
    if (t && z.st !== 'chase' && z.st !== 'attack') { z.tgt = t; z.st = 'chase'; z.tgtT = M.t; alertNear(z, t); playAt('ZOM_alert', z.p.x, z.p.z, { gap: 400 }); }
    else if (t && z.tgt !== t && (!z.tgt || z.tgt.dead || Math.sqrt((t.p.x - z.p.x) * (t.p.x - z.p.x) + (t.p.z - z.p.z) * (t.p.z - z.p.z)) < Math.sqrt((z.tgt.p.x - z.p.x) * (z.tgt.p.x - z.p.x) + (z.tgt.p.z - z.p.z) * (z.tgt.p.z - z.p.z)) - 2)) z.tgt = t;
    if (t) z.tgtT = M.t;
    if ((z.st === 'chase') && z.tgt && !z.path && MX.lineFree && !MX.lineFree(z.p, z.tgt.p) && Math.sqrt((z.tgt.p.x - z.p.x) * (z.tgt.p.x - z.p.x) + (z.tgt.p.z - z.p.z) * (z.tgt.p.z - z.p.z)) > 3) z.needPath = true;   // objetivo tras un obstáculo: ruta ya
  }
  let spd = 0;
  if (z.st === 'chase' || z.st === 'attack') {
    const t = z.tgt; if (!t || t.dead && !t.dwn || M.t - z.tgtT > 8 || Math.sqrt((t.p.x - z.p.x) * (t.p.x - z.p.x) + (t.p.z - z.p.z) * (t.p.z - z.p.z)) > 42) { z.st = 'invest'; z.hx = t ? t.p.x + (t.v ? clamp(t.v.x, -6, 6) * 1.5 : 0) : z.p.x; z.hz = t ? t.p.z + (t.v ? clamp(t.v.z, -6, 6) * 1.5 : 0) : z.p.z; z.tgt = null; z.path = null; z.wait = 0; return; }
    const dx = t.p.x - z.p.x, dz = t.p.z - z.p.z, d = Math.sqrt((dx) * (dx) + (dz) * (dz)); z.yaw = Math.atan2(dx, dz);
    z.atkCd -= dt;
    if (d < z.r + .75) {                                                            // a distancia de golpe
      z.st = 'attack'; z.v.x *= .8; z.v.z *= .8;
      if (z.atk < 0 && z.atkCd <= 0) { z.atk = 0; z.atkCd = T.atkCd; }
      if (z.atk >= 0) { z.atk += dt / .6; if (z.atk >= .5 && !z.hitDone) { z.hitDone = true; if (d < z.r + 1.0) { MX.hit(t, T.dmg * ZDIF, null, dx, dz, null, 'ZOM'); playAt('ZOM_attack', z.p.x, z.p.z, { gap: 150 }); } } if (z.atk >= 1) { z.atk = -1; z.hitDone = false; } }
      if (z.type === 'brute') bruteSmash(z);
    } else {
      if (z.noPath !== undefined && M.t - z.noPath < 6 && (z.stk || 0) >= 2) bruteSmash(z, 14);                 // sin ruta y pegado a algo: lo golpea hasta abrir paso
      z.st = 'chase'; z.atk = -1; z.hitDone = false;
      if (z.needPath && d > 1.5 && pathTo(z, t.p.x, t.p.z)) z.needPath = false;
      let gx = t.p.x, gz = t.p.z, sp = T.chase;
      if (z.type !== 'brute' && z.type !== 'screamer' && d > 3.2 && d < 18 && (z.horde || nearZ > 1)) { const a = z.seed * 6.283 + (t.yaw || 0) * .3, k = Math.min(1, (d - 3) / 7); gx += Math.cos(a) * 2.6 * k; gz += Math.sin(a) * 2.6 * k; }   // en grupo, cada uno elige su lado: rodean en vez de hacer cola
      if (z.type === 'runner' && d > 3 && d < 11) { const k = (z.seed > .5 ? 1 : -1) * Math.min(2.2, d * .3); gx += dz / d * k; gz -= dx / d * k; }                 // el corredor flanquea
      z.lungeCd -= dt; if (z.lunge > 0) { z.lunge -= dt; sp *= 1.55; } else if (d < 7 && d > 1.9 && z.lungeCd <= 0 && z.type !== 'screamer' && z.type !== 'brute') { z.lunge = .9; z.lungeCd = rr(3.5, 6.5); }   // embestida: cerca, +55 % de velocidad durante 0,9 s (no se puede ir siempre justo por delante)
      if (z.type === 'screamer' && d < 9 && d > 3) sp = T.chase * .25;                                                                               // el gritón no se lanza: se queda atrás gritando
      steer(z, gx, gz, sp, dt); spd = sp;
      if (z.type === 'screamer' && d > 4 && d < 20) { z.screamCd -= dt; if (z.screamCd <= 0 && z.scream < 0) { z.scream = 0; z.screamCd = rr(7, 12); } }
    }
  } else if (z.st === 'invest') {
    const d = steer(z, z.hx, z.hz, T.chase * .55, dt); spd = T.chase * .55;
    if (z.needPath && d > 2 && pathTo(z, z.hx, z.hz)) z.needPath = false;
    if (d < 1.6) { z.wait += dt; z.v.x *= .8; z.v.z *= .8; spd = 0; if (z.wait > 4) { z.st = z.horde ? 'wander' : (rnd() < .85 ? 'wander' : 'dorm'); z.wait = 0; z.path = null; } }
  } else if (z.st === 'wander') {
    if (z.horde) { const h = z.horde, lead = h.members[0] === z ? 0 : 2.8, gx = (h.curX === undefined ? h.tx : h.curX) + Math.sin(z.seed * 40) * lead, gz = (h.curZ === undefined ? h.tz : h.curZ) + Math.cos(z.seed * 40) * lead, far = d0(z, gx, gz) > 7;
      const d = steer(z, gx, gz, T.roam * (h.st === 'invest' ? 1.9 : far ? 2.2 : 1.3), dt); spd = T.roam; if (z.needPath && d > 3 && pathTo(z, gx, gz)) z.needPath = false; }
    else { if (z.wait <= 0) { z.hx = z.home.x + rr(-6, 6); z.hz = z.home.z + rr(-6, 6); z.wait = rr(4, 9); z.path = null; } z.wait -= dt; const d = steer(z, z.hx, z.hz, T.roam * .8, dt); spd = T.roam * .8; if (d < 1.2) { z.wait = Math.min(z.wait, 0); } if (rnd() < dt * .02) z.st = 'dorm'; }
    if (!z.horde && z.st === 'wander') z.yaw = Math.atan2(z.v.x, z.v.z) || z.yaw;
  } else { z.v.x *= .85; z.v.z *= .85; if (rnd() < dt * .01) { playAt('ZOM_groan', z.p.x, z.p.z, { gap: 900, vol: .7 }); } }   // dormido
  if (z.scream >= 0) { z.scream += dt / 1.2; if (z.scream >= .35 && !z.screamDone) { z.screamDone = true; playAt('ZOM_scream', z.p.x, z.p.z, { gap: 1000 }); noise(z.p.x, z.p.z, 48, true); } if (z.scream >= 1) { z.scream = -1; z.screamDone = false; } z.v.x *= .6; z.v.z *= .6; }
  if (z.st !== 'attack' && z.st !== 'dorm' && (Math.abs(z.v.x) + Math.abs(z.v.z)) > .2 && z.st !== 'chase') z.yaw = Math.atan2(z.v.x, z.v.z);
  else if (z.st === 'chase') z.yaw = Math.atan2((z.tgt ? z.tgt.p.x : z.p.x + z.v.x) - z.p.x, (z.tgt ? z.tgt.p.z : z.p.z + z.v.z) - z.p.z);
}
const d0 = (z, x, zz) => Math.sqrt((x - z.p.x) * (x - z.p.x) + (zz - z.p.z) * (zz - z.p.z));
function bruteSmash(z, dmg) {                                                            // el pesado revienta lo que tenga delante (cajas, vallas, barriles)
  if (z.smashT !== undefined && M.t - z.smashT < 1.2) return; z.smashT = M.t;
  const fx = Math.sin(z.yaw), fz = Math.cos(z.yaw);
  for (let i_p = 0; i_p < props.length; i_p++) { const p = props[i_p]; if (p.dead || !p.type) continue; const d = Math.hypot(p.x - (z.p.x + fx), p.z - (z.p.z + fz)); if (d < 1.4 + Math.max(p.hx, p.hz)) { damageProp(p, dmg || 45, p.x, p.z, fx, fz, 'melee'); break; } }
}

/* ---- movimiento, separación y pose ---- */
function moveZ(z, dt) {
  if (z.st === 'dead') return;
  const k = gk(z.p.x, z.p.z); let sx = 0, sz = 0;
  for (let ox = -1; ox <= 1; ox++) for (let oz = -1; oz <= 1; oz++) { const a = grid.get(gk(z.p.x + ox * 1.6, z.p.z + oz * 1.6)); if (!a) continue; for (const o of a) { if (o === z) continue; const dx = z.p.x - o.p.x, dz = z.p.z - o.p.z, d = Math.sqrt((dx) * (dx) + (dz) * (dz)), m = (z.r + o.r) * .9; if (d < m && d > 1e-3) { sx += dx / d * (m - d); sz += dz / d * (m - d); } } }
  const ox0 = z.p.x, oz0 = z.p.z;
  z.p.x += (z.v.x + sx * 2.5) * dt; z.p.z += (z.v.z + sz * 2.5) * dt; collide(z.p, z.r * .85, 2.6);
  z.mv = Math.sqrt((z.p.x - ox0) * (z.p.x - ox0) + (z.p.z - oz0) * (z.p.z - oz0)) / Math.max(dt, 1e-3);
  z.stuckT += dt; if (z.stuckT > .3) { const mv = Math.sqrt((z.p.x - z.sx) * (z.p.x - z.sx) + (z.p.z - z.sz) * (z.p.z - z.sz)); z.stk = Math.sqrt((z.v.x) * (z.v.x) + (z.v.z) * (z.v.z)) > .5 && mv < .08 ? (z.stk || 0) + 1 : 0; z.sx = z.p.x; z.sz = z.p.z; z.stuckT = 0; if (z.stk >= 2 && z.st !== 'dorm') { z.needPath = true; z.path = null; } }
}
function pose(z, dt) {
  const T = TY[z.type], s = z.sc, sp = Math.min(Math.sqrt((z.v.x) * (z.v.x) + (z.v.z) * (z.v.z)), (z.mv === undefined ? 9 : z.mv) * 1.15 + .15), lerp = (a, b, k) => a + (b - a) * k;
  z.gaitSpd += (sp - z.gaitSpd) * Math.min(1, dt * 6); z.ph += dt * (2.2 + z.gaitSpd * (z.type === 'runner' ? 2.4 : 1.9));
  const alive = z.st !== 'dead', dorm = z.st === 'dorm', amp = clamp(z.gaitSpd / (T.chase * .8), 0, 1), ph = z.ph, atk = z.atk >= 0, scr = z.scream >= 0;
  z.twT -= dt; if (z.twT <= 0 && alive) { z.twT = rr(2.5, 7); z.tw0 = .35; } z.tw0 = Math.max(0, z.tw0 - dt);          // espasmo ocasional
  const tw = z.tw0 > 0 ? Math.sin(z.tw0 * 60) * z.tw0 * .5 : 0, br = Math.sin(zt * (dorm ? 1.4 : 2.4) + z.seed * 9) * .02;
  let lean = (dorm ? .66 : T.lean + amp * .12) + z.slouch + Math.sin(ph * .5 + z.seed * 6) * .05 + z.stag * .35 - (scr ? .75 : 0) + (atk ? .3 * Math.sin(Math.min(1, z.atk * 1.6) * Math.PI) : 0);
  const district=MX.dataId==='M2';
  if (district) {
    const rest=dorm ? .13:T.lean*.25;
    lean=rest + z.slouch*.35 + amp*.055 + Math.sin(ph*.5+z.seed*6)*.035
      + z.stag*.14 - (scr ? .26:0) + (atk ? .17*Math.sin(Math.min(1,z.atk*1.6)*Math.PI):0);
  }
  const sink = z.st === 'dead' && z.deadT > 11 ? -(z.deadT - 11) * .3 : 0, twist = Math.sin(ph * .5 + z.seed) * .22 * amp + tw * .4, roll = Math.sin(ph * .5) * .06 * amp * (z.type === 'brute' ? 2.4 : 1);
  _e.set(z.lie * 1.5, z.yaw, roll, 'YXZ'); _q.setFromEuler(_e);
  const B = _m1.compose(_p.set(z.p.x, sink + (alive ? Math.abs(Math.sin(ph)) * .03 * amp : 0), z.p.z), _q, _s.set(s, s, s));
  const fr = (dst, parent, lx, ly, lz, rx, ry, rz) => { _e.set(rx, ry, rz, 'XYZ'); _q.setFromEuler(_e); _m4.compose(_p.set(lx, ly, lz), _q, _s.set(1, 1, 1)); return dst.multiplyMatrices(parent, _m4); };     // marco hijo (sin escala)
  const put = (k, j, parent, lx, ly, lz, rx, ry, rz, sx, sy, sz) => { _e.set(rx, ry, rz, 'XYZ'); _q.setFromEuler(_e); _m3.compose(_p.set(lx, ly, lz), _q, _s.set(sx, sy, sz)); _m4.multiplyMatrices(parent, _m3); IM[k].setMatrixAt(z.ri * MUL[k] + j, _m4); };
  const i = z.ri, wd = T.tw * z.build, big = T.tw > 1;
  const S = fr(MS, B, 0, .87, 0, lean, twist * .4, 0);                                // columna lumbar (pivote en la cadera)
  const C = fr(MC, S, 0, .36, 0, -.05 + tw * .3, twist, z.shR * .5);                     // pecho, con giro y hombros desiguales
  put('pel', 0, B, 0, .8, 0, 0, 0, 0, .3 * wd, .17, .2 * (big ? 1.1 : 1));
  put('abd', 0, S, 0, .14, 0, 0, 0, 0, (.28 + (z.type === 'brute' ? .1 : 0)) * wd, .24, .19 * (big ? 1.2 : 1));
  put('che', 0, C, 0, .02, 0, 0, 0, 0, .39 * wd, .31, .23 * (big ? 1.15 : 1));
  put('sho', 0, C, 0, .15, 0, 0, 0, z.shR, .46 * wd, .08, .18);
  _p.set(0,.02,0).applyMatrix4(C);
  z.chx=_p.x; z.chy=_p.y; z.chz=_p.z; z.chr=.21*wd*s;
  const hp = district ? (scr ? -.40 : (dorm ? .24 : .13)+Math.sin(ph*.5+1)*.06) : dorm ? .6 : (scr ? -.75 : .24 + Math.sin(ph * .5 + 1) * .09 + z.slouch * .5), hy = Math.sin(ph * .25 + z.seed * 9) * .14 + tw * .6, hr = Math.sin(ph * .33 + z.seed * 4) * .12 + (dorm ? .08 : .1);
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
  const swing = Math.sin(ph) * amp;
  const reaching = z.st==='chase' || atk;
  const armB = dorm ? -.1 : scr ? -2.6 : district && !reaching ? -.22 : T.arm;
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
/* ---- población del distrito (?mapa=6): por zonas, como vivía la gente (casco y comercios llenos, bosques casi vacíos), dormidos dentro de casas y tiendas,
   y 4 hordas que migran entre barrios. Igual para las 4 facciones: se reparte en el cuarto Azul y se copia girado (y los objetivos comunes, a 180°). ---- */
const ZDENS = { 'Residencial': 38, 'Casco': 36, 'Comercios': 32, 'Aldea': 29, 'Puesto avanzado': 15, 'Granja': 11, 'Bosque': 8, 'Plaza Mayor': 11, 'Fábrica': 32, 'Estación y supermercado': 32 };   // ~×1,7
const ROT = (k, x, z) => k === 0 ? [x, z] : k === 1 ? [-z, x] : k === 2 ? [-x, -z] : [z, -x];
const mixPick = (dense) => { const r = rnd(); return r < (dense ? .17 : .2) ? 'runner' : r < (dense ? .26 : .29) ? 'brute' : r < (dense ? .34 : .35) ? 'screamer' : 'walker'; };
let ZPTS = null;                                                                   // puntos de reposición (con su peso)
function navFree(x, z) { return MX.navAt ? MX.navAt(x, z) : true; }
function initDistrict() {
  const I = MAPA.built.info, pts = []; let n = 0;
  const put4 = (x, z, ty, st, ks) => { const ok = ks.every(k => { const [a, b] = ROT(k, x, z); return navFree(a, b); }); if (!ok) return 0;
    for (const k of ks) { const [a, b] = ROT(k, x, z); newZ(ty, a, b, { st }); } return ks.length; };
  for (const zn of I.zones) {
    const base = zn.name.split(' · ')[0].replace(/ \d.*$/, '').replace(/ \((norte|sur|oeste|este)\)$/, ''), dens = ZDENS[base] || ZDENS[Object.keys(ZDENS).find(k => base.startsWith(k))] || 0;
    const plaza = base === 'Plaza Mayor', azul = / · Azul$/.test(zn.name), shared = /\((norte|oeste)\)$/.test(zn.name) || plaza;
    if (!dens || (!azul && !shared)) continue;
    const ks = azul || plaza ? [0, 1, 2, 3] : [0, 2], grp = plaza ? 1 : Math.max(1, Math.round(dens / 3));
    const x0 = plaza ? -48 : zn.x0, z0 = plaza ? -48 : zn.z0, x1 = plaza ? -12 : zn.x1, z1 = plaza ? -12 : zn.z1;   // plaza: el cuadro noroeste (se copia a los otros tres)
    for (let g = 0; g < grp; g++) {                                                // grupos de 2–5 repartidos por la zona
      let cx = 0, cz = 0, ok = false; for (let t = 0; t < 30 && !ok; t++) { cx = x0 + 6 + rnd() * (x1 - x0 - 12); cz = z0 + 6 + rnd() * (z1 - z0 - 12); ok = navFree(cx, cz); }
      if (!ok) continue; pts.push([cx, cz, dens, ks]);
      const c = Math.max(1, Math.round(dens / grp + rr(-1, 1))), st = rnd() < .6 ? 'dorm' : 'wander';
      for (let i = 0; i < c; i++) n += put4(cx + rr(-4, 4), cz + rr(-4, 4), mixPick(dens >= 13), st, ks);
    }
  }
  /* dentro de los edificios del cuarto Azul (casas, tiendas, clínica…): 1 de cada 4, dormidos tras la puerta */
  for (const b of OBJ.buildings) { if (!(b.x < -5 && b.z < -5) || rnd() > .65) continue; const f = b.fp || { hx: 4, hz: 4 };
    for (let t = 0; t < 12; t++) { const x = b.x + rr(-f.hx * .6, f.hx * .6), z = b.z + rr(-f.hz * .6, f.hz * .6); if (put4(x, z, rnd() < .12 ? 'screamer' : 'walker', 'dorm', [0, 1, 2, 3])) { n += 0; break; } } }
  /* 8 hordas que migran entre barrios (dos por cuarto, giradas) */
  for (const hp of [[-190, -312], [-312, -60], [-120, -200], [-260, -150]]) for (const k of [0, 1, 2, 3]) { const [x, z] = ROT(k, hp[0], hp[1]); const h = newHorde(x, z, ['walker','walker','walker','walker','walker','walker','walker','walker','walker','walker','walker','walker','walker','walker','walker','runner','runner','runner','runner','runner','runner','brute','brute','screamer','screamer']); h.migrate = true; }
  ZPTS = pts;
  const roam = []; for (const q of pts) for (const k of q[3]) roam.push(ROT(k, q[0], q[1]));
  for (const h of HORDES) h.roamPts = roam;
}
MX.zom.init = () => {                                                               // reparto inicial: grupos locales dormidos y una horda itinerante
  if (MX.district && MAPA.built && MAPA.built.info && MAPA.built.info.zones && MAPA.built.info.zones.length) return initDistrict();
  const sp = []; for (const t of [0, 1, 2, 3]) for (const s of (M.spawn[t] || [])) sp.push(s);
  const okp = (x, z) => sp.every(s => Math.sqrt((s.x - x) * (s.x - x) + (s.z - z) * (s.z - z)) > 16);
  const pts = (MX.HOT || []).filter(h => okp(h[0], h[1])); let n = 0;
  for (const h of pts) { if (n >= 16) break; const c = 3 + ((rnd() * 3) | 0); for (let i = 0; i < c; i++) { newZ(rnd() < .15 ? 'runner' : 'walker', h[0] + rr(-3, 3), h[1] + rr(-3, 3)); } n++; }
  const start = pts.length ? pts[(rnd() * pts.length) | 0] : [0, 0];
  newHorde(start[0], start[1], ['walker', 'walker', 'walker', 'walker', 'walker', 'walker', 'walker', 'walker', 'walker', 'walker', 'walker', 'walker', 'runner', 'runner', 'runner', 'brute', 'screamer']);
  for (const h of HORDES) h.roamPts = pts;
};
function stepHorde(h, dt) {
  if (!h.members.length) return;
  const l = h.members[0];
  if (h.st === 'roam' || h.st === 'invest') {
    if (h.st === 'roam' && h.wait <= 0 && (!h.path || h.pi >= h.path.length)) { const c = (h.roamPts || []).filter(q => { const d = Math.hypot(q[0] - l.p.x, q[1] - l.p.z); return h.migrate ? d > 120 && d < 320 : d > 12; }); /* las hordas del distrito migran de barrio en barrio */ let q = c.length ? c[(rnd() * c.length) | 0] : [0, 0]; if (h.migrate && rnd() < .6) { const hot = heatHottest(l.p.x, l.p.z); if (hot) q = hot; } h.tx = q[0]; h.tz = q[1]; h.path = null; h.wait = rr(6, 14); }
    h.wait -= dt;
    if (!h.path && !h.pj && astar > 0) { astar--; const tx = h.tx, tz = h.tz; h.pj = MX.pathAsync(l.p.x, l.p.z, tx, tz, path => { h.pj = false; if (path !== undefined && h.tx === tx && h.tz === tz && !h.path) { h.path = path || [{ x: tx, z: tz }]; h.pi = 0; } }); }
    if (h.path) { const w = h.path[Math.min(h.pi, h.path.length - 1)], d = Math.sqrt((w.x - l.p.x) * (w.x - l.p.x) + (w.z - l.p.z) * (w.z - l.p.z)); if (d < 2.2 && h.pi < h.path.length - 1) h.pi++; else if (d < 2.2) { if (h.st === 'invest') { h.wait = 3; if (h.divertT < M.t - 3) { h.st = 'roam'; h.path = null; h.wait = 0; } } else h.wait = Math.max(0, h.wait - dt * 2); } h.curX = w.x; h.curZ = w.z; }
  }
}
/* población: la región se repuebla poco a poco con grupos dormidos y, si la horda cae, aparece otra desde lejos (nunca a la vista de un combatiente) */
let popT = 20, hordeGone = 0;
const farFromAll = (x, z, R) => M.ents.every(e => e.dead || Math.sqrt((e.p.x - x) * (e.p.x - x) + (e.p.z - z) * (e.p.z - z)) > R) && M.spawn.every(a => a.every(s => Math.sqrt((s.x - x) * (s.x - x) + (s.z - z) * (s.z - z)) > 16));
const ZTARGET = 1700;
function restockDistrict() {
  const alive = MX.zom.count(); if (!ZPTS || !ZPTS.length) return;
  if (alive < ZTARGET) for (let tries = 0; tries < 10; tries++) {                   // repone en grupos, siempre lejos de todos (nunca a la vista) y con el peso de cada zona
    const q = ZPTS[(rnd() * ZPTS.length) | 0], k = q[3][(rnd() * q[3].length) | 0], [x, z] = ROT(k, q[0], q[1]);
    if (!farFromAll(x, z, 70) || rnd() * 16 > q[2]) continue;
    const c = 2 + ((rnd() * 3) | 0); for (let i = 0; i < c; i++) { const px = x + rr(-4, 4), pz = z + rr(-4, 4); if (navFree(px, pz)) newZ(mixPick(q[2] >= 13), px, pz, { st: rnd() < .5 ? 'dorm' : 'wander' }); }
    break;
  }
  const liveH = HORDES.filter(h => h.members.some(m => !m.dead)).length;
  if (liveH < 16 && alive < ZTARGET + 100 && rnd() < .12) { const q = ZPTS[(rnd() * ZPTS.length) | 0], [x, z] = ROT(q[3][0], q[0], q[1]); if (farFromAll(x, z, 90)) { const h = newHorde(x, z, ['walker','walker','walker','walker','walker','walker','walker','walker','walker','walker','walker','walker','walker','walker','walker','runner','runner','runner','runner','runner','runner','brute','brute','screamer','screamer']); h.migrate = true; h.roamPts = HORDES[0] && HORDES[0].roamPts; } }
  for (let i = HORDES.length - 1; i >= 0; i--) if (!HORDES[i].members.length) HORDES.splice(i, 1);
}
function restock() {
  if (ZPTS) return restockDistrict();
  const alive = MX.zom.count(), pts = (MX.HOT || []).filter(h => farFromAll(h[0], h[1], 17));
  if (!pts.length) return;
  if (alive < 90) { const h = pts[(rnd() * pts.length) | 0], c = 3 + ((rnd() * 2) | 0); for (let i = 0; i < c; i++) newZ(rnd() < .15 ? 'runner' : 'walker', h[0] + rr(-3, 3), h[1] + rr(-3, 3)); }
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
  for (let i_z = 0; i_z < Z.length; i_z++) { const z = Z[i_z];
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
/* mapa de cercanía (celdas de 16 m, rehecho cada 0,5 s): una celda está «cerca» si algún combatiente vivo queda a menos de NEAR_R. Con 200 combatientes y ~1.700 zombis, preguntarlo a cada
   combatiente por cada zombi era O(n·m); así es una consulta por zombi. */
const NM = { w: 0, a: null, t: -9 };
function nearBuild() {
  const N = MAPA && MAPA.built ? 70 : 0; if (!N) return; NM.w = N; if (!NM.a) NM.a = new Uint8Array(N * N); NM.a.fill(0); const r = Math.ceil(NEAR_R / 16);
  for (let i_e = 0; i_e < M.ents.length; i_e++) { const e = M.ents[i_e]; if (e.dead) continue; const cx = Math.floor(e.p.x / 16) + 35, cz = Math.floor(e.p.z / 16) + 35;
    for (let dz = -r; dz <= r; dz++) for (let dx = -r; dx <= r; dx++) { const x = cx + dx, y = cz + dz; if (x >= 0 && y >= 0 && x < N && y < N && dx * dx + dz * dz <= r * r + 1) NM.a[y * N + x] = 1; } }
  NM.t = M.t;
}
const nearCell = (x, z) => { if (M.t - NM.t > .5 || !NM.a) nearBuild(); if (!NM.a) return true; const cx = Math.floor(x / 16) + 35, cz = Math.floor(z / 16) + 35; return cx < 0 || cz < 0 || cx >= NM.w || cz >= NM.w ? false : NM.a[cz * NM.w + cx] === 1; };
/* calor de combate: cada ruido (disparo, explosión, grito) calienta su celda de 32 m; se enfría solo. Las hordas que migran tiran hacia las zonas calientes: acuden a los tiroteos y a los
   puntos de captura disputados, sin cebos ni alarmas. */
const HEAT = new Map(), hkey = (x, z) => ((Math.floor(x / 32) + 40) << 8) | (Math.floor(z / 32) + 40);
function heatAdd(x, z, R) { const k = hkey(x, z); HEAT.set(k, (HEAT.get(k) || 0) + R / 40); }
function heatHottest(x, z) { let best = null, bs = 1.4; for (const [k, v] of HEAT) { const cx = ((k >> 8) - 40) * 32 + 16, cz = ((k & 255) - 40) * 32 + 16, d = Math.sqrt((cx - x) * (cx - x) + (cz - z) * (cz - z)); if (d > 420 || d < 40) continue; const sc = v / (1 + d / 140); if (sc > bs) { bs = sc; best = [cx, cz]; } } return best; }
function nearAnyone(x, z, R) { const R2 = R * R; for (let i_e = 0; i_e < M.ents.length; i_e++) { const e = M.ents[i_e]; if (e.dead) continue; const dx = e.p.x - x, dz = e.p.z - z; if (dx * dx + dz * dz < R2) return true; } return false; }
/* paso barato para los lejanos: los dormidos y los que vagan por su casa se quedan; los de una horda la siguen sin colisiones finas (sólo la malla de navegación) */
function farStep(z, dt) {
  if (z.st === 'dead') { z.deadT += dt; if (z.deadT > 14) freeZ(z); return; }
  if (!z.horde || z.st !== 'wander') { z.v.set(0, 0, 0); return; }
  const h = z.horde, lead = h.members[0] === z ? 0 : 2.8, gx = (h.curX === undefined ? h.tx : h.curX) + Math.sin(z.seed * 40) * lead, gz = (h.curZ === undefined ? h.tz : h.curZ) + Math.cos(z.seed * 40) * lead;   // el guía va por la ruta exacta; los demás, a su lado
  const dx = gx - z.p.x, dz = gz - z.p.z, d = Math.sqrt((dx) * (dx) + (dz) * (dz)); if (d < .5) return;
  const step = Math.min(d, TY[z.type].roam * 1.8 * dt), nx = z.p.x + dx / d * step, nz = z.p.z + dz / d * step;
  let ok = !MX.navAt || MX.navAt(nx, nz), px = nx, pz = nz;
  if (!ok) for (const a of [.7, -.7, 1.4, -1.4]) { const c = Math.cos(a), n = Math.sin(a), rx = (dx * c - dz * n) / d, rz = (dx * n + dz * c) / d; if (MX.navAt(z.p.x + rx * step, z.p.z + rz * step)) { px = z.p.x + rx * step; pz = z.p.z + rz * step; ok = true; break; } }   // rodea el obstáculo
  if (!ok) for (const k of [2, 3.5, 5]) { const qx = z.p.x + dx / d * (step + k), qz = z.p.z + dz / d * (step + k); if (MX.navAt(qx, qz)) { px = qx; pz = qz; ok = true; break; } }   // fuera de la vista de todos: lo salta
  if (ok) { z.p.x = px; z.p.z = pz; } else if (d > 25) { const l = h.members[0]; if (l && l !== z) { z.p.x = l.p.x + Math.sin(z.seed * 40) * 2.8; z.p.z = l.p.z + Math.cos(z.seed * 40) * 2.8; } }   // atascado lejos de la vista: se reagrupa con su horda
  z.yaw = Math.atan2(dx, dz);
}
MX.zom.perfHook = w => { restock = w(restock, 'z.restock'); updBars = w(updBars, 'z.barras'); stepHorde = w(stepHorde, 'z.horda'); };      // medición (src/rendimiento.js)
/* rejilla de zombis para balas y rayos (celdas de 4 m, rehecha una vez por fotograma): cada bala/rayo sólo prueba los zombis cercanos a su tramo, no los ~1.500 (era el pico de 7–21 ms de
   updateBullets con la población nueva). ?nozgrid recorre todos como antes. */
const ZG = new Map(), ZGOFF = /[?&]nozgrid\b/.test(location.search), _zc = [];
const zgk = (ix, iz) => ((ix + 160) << 10) | (iz + 160);
function zgBuild() { for (const a of ZG.values()) a.length = 0; for (let i = 0; i < Z.length; i++) { const z = Z[i]; if (z.dead) continue; const k = zgk(Math.floor(z.p.x / 4), Math.floor(z.p.z / 4)); let a = ZG.get(k); if (!a) ZG.set(k, a = []); a.push(z); } }
MX.zom.cand = (ox, oz, dx, dz, d0, d1) => {
  if (ZGOFF) return Z; const ax = ox + dx * d0, az = oz + dz * d0, bx = ox + dx * d1, bz = oz + dz * d1, out = _zc; out.length = 0;
  const x0 = Math.floor((Math.min(ax, bx) - 3) / 4), x1 = Math.floor((Math.max(ax, bx) + 3) / 4), z0 = Math.floor((Math.min(az, bz) - 3) / 4), z1 = Math.floor((Math.max(az, bz) + 3) / 4);
  if ((x1 - x0 + 1) * (z1 - z0 + 1) > 900) return Z;
  for (let ix = x0; ix <= x1; ix++) for (let iz = z0; iz <= z1; iz++) { const a = ZG.get(zgk(ix, iz)); if (a) for (let i = 0; i < a.length; i++) out.push(a[i]); }
  return out;
};
/* ---- PRESIÓN EN LOS PUNTOS DE CAPTURA ----
   Los puntos estaban siempre vacíos de zombis: la población se reparte por zonas, los 200 bots los barren desde el minuto 1 y la reposición exige estar a > 70 m de CUALQUIER combatiente.
   Cada punto (menos los refugios) tiene ahora una guarnición propia (zombis dormidos o rondando entre 6 y 45 m) que se repone en cuanto no la vea el jugador, y recibe oleadas dirigidas
   que aparecen fuera de la vista y llegan por ruta. Intensidad SUAVE al empezar y creciente hasta el final: sube con el tiempo (25 min) y con el marcador (la meta). ?zpunto=N la multiplica. */
const ZPUNTO = +new URLSearchParams(location.search).get('zpunto') || 1;
const PT = { t: 0, waves: [] };
function matchProg() { const SQ = MX.SQ; let sc = 0; if (SQ && SQ.score && SQ.meta) sc = Math.max.apply(null, SQ.score) / SQ.meta; return Math.max(0, Math.min(1, sc)); }   // 0 al empezar, 1 con la meta cerca: solo cuentan los puntos de la mejor facción, no el tiempo
const offScreen = (x, z) => { const S = MX.SIGHT || { hw: 13, hd: 8 }, dx = x - P.pos.x, dz = z - P.pos.z; return (Math.abs(dx) > S.hw + 9 || Math.abs(dz) > S.hd + 9) && dx * dx + dz * dz > 900; };   // fuera de la pantalla y a > 30 m del jugador
function pointSpawnPos(o, rMin, rMax, needOff) { for (let t = 0; t < 30; t++) { const a = rnd() * 6.283, r = rMin + rnd() * (rMax - rMin), x = o.x + Math.cos(a) * r, z = o.z + Math.sin(a) * r; if (navFree(x, z) && (!needOff || offScreen(x, z))) return [x, z]; } return null; }
function pointsTick() {
  const SQ = MX.SQ; if (!SQ || !SQ.objs || !MX.campaign || !M.built) return; const prog = matchProg(), k = (1 + 1.6 * prog) * ZPUNTO;                       // intensidad: ×1 al empezar, ×2,6 al final
  let alive = 0, ngar = new Map(); for (let i = 0; i < Z.length; i++) { const z = Z[i]; if (z.dead) continue; alive++; if (z.gar) ngar.set(z.gar, (ngar.get(z.gar) || 0) + 1); }
  PT.waves = PT.waves.filter(h => h.members.some(m => !m.dead));
  if (alive > MAXZ - 60) return;
  for (const o of SQ.objs) {
    if (o.id === 'REF') continue;
    const want = Math.round((o.id === 'PLAZA' ? 150 : 50) * (.6 + .4 * prog) * Math.min(2, ZPUNTO)), have = ngar.get(o) || 0, rOut = o.id === 'PLAZA' ? 70 : 45;   // guarnición: 60 % al empezar, 100 % con la meta cerca
    if (o._zInit === undefined) { o._zInit = true; o._zNext = 0; o._wNext = M.t + rr(40, 70); }
    if (have < want && M.t >= o._zNext) {                                                                                                         // guarnición: se rellena (la primera vez de golpe, luego en grupos de 2–3 cada 20–40 s) y sólo fuera de la vista
      const first = o._zFirst === undefined || o._zFirst < 3; o._zFirst = (o._zFirst || 0) + 1;
      const n = Math.min(first ? 45 : 8, want - have); let made = 0;
      /* el 40 % dentro de la zona del punto, el resto en su entorno */
      for (let i = 0; i < n; i++) { const inner = rnd() < .4, p = inner ? pointSpawnPos(o, 2, o.r, !first) : pointSpawnPos(o, o.r, rOut, !first); if (!p) continue; const zb = newZ(mixPick(true), p[0], p[1], { st: rnd() < .5 ? 'dorm' : 'wander' }); if (zb) { zb.gar = o; made++; } }
      o._zNext = M.t + (first ? 1 : rr(6, 12) / Math.min(2, k)); if (!made && !first) o._zNext = M.t + 5;
    }
    if (M.t >= o._wNext && PT.waves.length < 3 && !(o._wave && o._wave.members.some(m => !m.dead))) {                                              // oleada dirigida al punto
      o._wNext = M.t + rr(110, 170) / k;
      let act = 0; for (let i = 0; i < M.ents.length; i++) { const e = M.ents[i]; if (!e.dead && Math.sqrt((e.p.x - o.x) * (e.p.x - o.x) + (e.p.z - o.z) * (e.p.z - o.z)) < o.r + 12) act++; }
      const size = Math.round((5 + Math.min(2, act / 8) * 2) * k), pr = .14 + .26 * prog, pb = .03 + .12 * prog, mix = [];
      for (let i = 0; i < size; i++) { const r = rnd(); mix.push(r < pr ? 'runner' : r < pr + pb ? 'brute' : r < pr + pb + .05 ? 'screamer' : 'walker'); }
      const p = pointSpawnPos(o, 75, 115, true); if (p) { const h = newHorde(p[0], p[1], mix); if (h.members.length) { h.st = 'invest'; h.tx = o.x + rr(-4, 4); h.tz = o.z + rr(-4, 4); h.path = null; h.wait = 0; h.divertT = M.t; h.migrate = false; h.roamPts = [[o.x, o.z]]; o._wave = h; PT.waves.push(h); } }
    }
  }
}
let nearZ = 0, heatT = 0;
MX.zom.update = dt => {
  PT.t -= dt; if (PT.t <= 0) { PT.t = 1; pointsTick(); }
  if (!ZGOFF) zgBuild();
  if (!MX.campaign || !M.built) return; dt = Math.min(dt, .05); zt += dt; astar = 3; extraA = 0;
  heatT -= dt; if (heatT <= 0) { heatT = .5; for (const [k, v] of HEAT) { const n = v * .95; if (n < .08) HEAT.delete(k); else HEAT.set(k, n); } }
  popT -= dt; if (popT <= 0) { popT = 2; if (!MX.zom.noRestock) restock(); }
  for (const h of HORDES) stepHorde(h, dt);
  grid.clear(); for (let i_z = 0; i_z < Z.length; i_z++) { const z = Z[i_z]; if (z.dead) continue; const k = gk(z.p.x, z.p.z); let a = grid.get(k); if (!a) { a = []; grid.set(k, a); } a.push(z); }
  /* simulación por cercanía: completa cerca de cualquier combatiente (o si ya persigue, investiga o la empujan); lejos, barata y cada 0,5 s */
  for (let i_z = 0, A_z = Z.slice(); i_z < A_z.length; i_z++) { const z = A_z[i_z];
    z.lodT -= dt; if (z.lodT <= 0) { z.lodT = .5; z.near = z.st === 'chase' || z.st === 'attack' || z.st === 'invest' || z.st === 'dead' || z.noiseDelay > 0 || nearCell(z.p.x, z.p.z); }
    if (z.near) { if (z.farDt) { z.farDt = 0; z.sx = z.p.x; z.sz = z.p.z; } stepZ(z, dt); moveZ(z, dt); }
    else { z.farDt += dt; if (z.farDt >= .5) { farStep(z, z.farDt); z.farDt = 0; } }
  }
  /* dibujo: sólo los cercanos a la cámara (hasta RMAX). Cada zombi conserva su hueco mientras se ve (antes los huecos se reasignaban por orden de distancia cada fotograma: recolorear
     240 zombis × ~30 piezas y picos de 15–20 ms); al entrar toma un hueco libre y se copian sus colores, al salir lo libera y se oculta. Con más de RMAX a la vista se ordena por
     distancia cada 0,25 s (los de fuera de la selección ceden su hueco a los cercanos). */
  const cx = P.pos.x, cz = P.pos.z, cand = []; let over = false;
  for (let i_z = 0; i_z < Z.length; i_z++) { const z = Z[i_z]; const dx = z.p.x - cx, dz = z.p.z - cz, d2 = dx * dx + dz * dz; if (d2 < VIEW_R * VIEW_R) { z.d2 = d2; cand.push(z); } else if (z.ri >= 0) slotFree(z); }
  if (cand.length > RMAX) { over = true; SLOT.sortT -= dt; if (SLOT.sortT <= 0) { SLOT.sortT = .25; cand.sort((a, b) => a.d2 - b.d2); for (let i = 0; i < cand.length; i++) cand[i].want = i < RMAX; } }
  let recol = false; const vis = [];
  for (let i_z = 0; i_z < cand.length; i_z++) { const z = cand[i_z];
    if (z.ri >= 0) { if (over && z.want === false) { slotFree(z); continue; } }
    else { if ((over && z.want === false) || !SLOT.free.length) continue; z.ri = SLOT.free.pop(); SLOT.used[z.ri] = 1; recol = true; const C = z.cols, i = z.ri; for (let q = 0; q < C.length; q += 5) { const k = KL[C[q]]; if (IM[k].instanceColor) IM[k].setColorAt(i * MUL[k] + C[q + 1], _c.setRGB(C[q + 2], C[q + 3], C[q + 4])); } }
    vis.push(z); pose(z, dt); }
  visiblePoses = vis;
  let mx = 0; for (let i = RMAX - 1; i >= 0; i--) if (SLOT.used[i]) { mx = i + 1; break; }
  slotMax = mx;
  for (const k in IM) { const m = IM[k]; m.count = slotMax * MUL[k]; m.visible = slotMax > 0; m.instanceMatrix.needsUpdate = true; if (recol && m.instanceColor) m.instanceColor.needsUpdate = true; }
  nAlive = 0; nearZ = 0; for (const z of Z) if (!z.dead) { nAlive++; if (z.st === 'chase' || z.st === 'attack') nearZ++; }   // nearZ: cuántos persiguen ahora (si hay varios, rodean)
  updBars(dt);
  hudT -= dt; if (hudT <= 0) { hudT = .5; $('mxScore').textContent = 'Campaña · Facción azul · ☣ ' + MX.zom.count(); }
};
})();
