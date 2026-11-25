"use strict";
/* ===================== PARTIDA 6 vs 6 · MAPA 3 =====================
   Módulo cargado después del juego: comparte su ámbito global (P, W, WP, boxes, props, scene, spawnBullet, explode...).
   Con MX.on = false no hace nada: los mapas 1 (arena original) y 2 (polígono de pruebas) quedan intactos.
   Contenido: mapa simétrico con todos los objetos, navegación (cuadrícula + A*), bots con IA, reglas (100 bajas, reaparición,
   vida), armas por ranuras (2 principales + pistola), armería en la base y HUD mínimo (marcador y vida). */
(function () {
const GOAL = 100, RESPAWN = 3, INV_T = 1.8, HP = 100, SH = 50, SH_DELAY = 5, SH_RATE = 15, HP_RATE = 22;
const DIFFS = [{ react: .7, err: .07, turn: 4.2 }, { react: .45, err: .045, turn: 6.5 }, { react: .28, err: .028, turn: 9 }];
const WI = {}; WP.forEach((w, i) => { WI[w.sid] = i; });
const M = { score: [0, 0], over: false, t: 0, diff: 1, ents: MX.ents, walls: [], props: [], specs: [], propQ: [], spawn: [[], []], armory: [], pads: [],
  slots: [WI.F1, WI.S1, WI.P1], slot: 0, lastPrim: 0, sw: { down: false, t: 0, fired: false }, hurt: 0, budget: 2, navT: 0, built: false, endT: 0, win: -1 };
MX.M = M; MX.WI = WI;
const rnd = Math.random, rr = (a, b) => a + (b - a) * rnd(), gauss = () => (rnd() + rnd() + rnd() + rnd() - 2) * 1.22;
const DIRS4 = [[1, 0], [-1, 0], [0, 1], [0, -1]];

/* ============================ MAPA ============================ */
const WMAT = [0x4a566e, 0x3f4a60, 0x55627c].map(c => new THREE.MeshStandardMaterial({ color: c, roughness: .85, flatShading: true }));
const CAPM = new THREE.MeshStandardMaterial({ color: 0x75829e, roughness: .8, flatShading: true });
function addWall(x, z, w, d, h, mi) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), WMAT[(mi || 0) % 3]); m.position.set(x, h / 2, z); m.castShadow = m.receiveShadow = true; scene.add(m);
  const cap = new THREE.Mesh(new THREE.BoxGeometry(w + .12, .12, d + .12), CAPM); cap.position.set(x, h + .06, z); cap.receiveShadow = true; scene.add(cap);
  const bx = { x, z, hx: w / 2, hz: d / 2, h, wall: true }; boxes.push(bx); M.walls.push(bx); return bx;
}
function floorRect(x, z, w, d, col, y) {
  const m = new THREE.Mesh(new THREE.PlaneGeometry(w, d), new THREE.MeshStandardMaterial({ color: col, roughness: 1, polygonOffset: true, polygonOffsetFactor: -1 }));
  m.rotation.x = -Math.PI / 2; m.position.set(x, y || .004, z); m.receiveShadow = true; scene.add(m); return m;
}
/* cuadrante (x>0, z>0); se refleja en los cuatro (el mapa es justo para los dos equipos) */
const QW = [[43.8, 11.4, 12.6, .8, 2.8], [37.6, 9.9, .8, 3.8, 2.8], [37.6, 1.5, .8, 3.0, 2.8],        // sala de reaparición: muros y dos puertas de 5 m
  [22, 12, 16, .8, 2.4],                                                                                  // divisor de carril
  [5.25, 6, 5.5, .8, 2.4], [8, 4, .8, 4, 2.4],                                                            // búnker central (cuatro huecos)
  [17, 19, 3.2, 1.0, 1.3], [26, 5.5, 1.0, 3.0, 1.3]];                                                     // bloques de hormigón macizos
const QP = [['crate', 33, 4.2, 0], ['crate', 23, 20, 0], ['crateS', 31.9, 5.1, 0], ['crateS', 21.6, 21.3, 0], ['barrier', 28, 8, 0], ['barrier', 12, 17, 1.5708],
  ['barrel', 14, 26, 0], ['barrel', 13.2, 26.6, 0], ['barrelFuel', 9, 19, 0], ['barrelFuel', 3.6, 3.6, 0], ['fence', 34.5, 16, 0], ['fence', 6, 25, 1.5708],
  ['sandbags', 26, 26, 0], ['sandbags', 10.5, 4.5, 1.5708], ['blocks', 18, 8.5, 0], ['blocks', 28, 17, 1.5708]];
const CP = [['crate', 0, 0, 0], ['barrier', 12, 0, 1.5708], ['barrier', -12, 0, 1.5708]];
const HOT = [[0, 0], [0, -20], [0, 20], [22, -20], [-22, -20], [22, 20], [-22, 20], [28, 0], [-28, 0], [13, -8], [-13, -8], [13, 8], [-13, 8], [8, -18], [-8, -18], [8, 18], [-8, 18]];

function placeProp(spec, checkEnts) {
  const sp = PSPEC[spec.type], tg = new THREE.Group(), b = sp.build(tg), sw = Math.abs(Math.sin(spec.rot || 0)) > .5, hx = (sw ? b.hz : b.hx) + .1, hz = (sw ? b.hx : b.hz) + .1;
  for (const o of boxes) if (Math.abs(o.x - spec.x) < o.hx + hx && Math.abs(o.z - spec.z) < o.hz + hz) return null;
  if (checkEnts) for (const e of M.ents) if (!e.dead && Math.hypot(e.p.x - spec.x, e.p.z - spec.z) < 1.6) return null;
  const p = addProp(spec.type, spec.x, spec.z, spec.rot || 0); p.spec = spec; M.props.push(p); return p;
}
function navResize(half) {                                                          // reajusta la malla de navegación al tamaño del mundo (distrito)
  NV.w = NV.h = Math.ceil(half * 2 + 8); NV.ox = NV.oz = -NV.w / 2; NV.n = NV.w * NV.h; NV.bl = new Uint8Array(NV.n);
  AS.g = new Float32Array(NV.n); AS.par = new Int32Array(NV.n); AS.st = new Uint8Array(NV.n);
}
function buildDistrict() {                                                           // campaña sobre el distrito generado por MAPA (src/mapa.js + mapa_distrito.js)
  for (const o of OBST) { o.m.visible = false; const i = boxes.indexOf(o.bx); if (i >= 0) boxes.splice(i, 1); }
  for (const p of props.slice()) { scene.remove(p.g); const i = boxes.indexOf(p.box); if (i >= 0) boxes.splice(i, 1); }
  props.length = 0; for (const tg of targets) scene.remove(tg.g); targets.length = 0;
  grid.visible = false;                                                             // la cuadrícula de referencia de la arena no se usa en el distrito
  const D = MAPA.build(MAPA.data.M1());
  WORLD.x = WORLD.z = D.half - .6; border.scale.set(WORLD.x / 40, 1, WORLD.z / 40); ground.scale.set(Math.max(1, (D.half * 2 + 20) / 120), Math.max(1, (D.half * 2 + 20) / 120), 1);
  for (const w of D.walls) M.walls.push(w);
  for (let tm = 0; tm < 4; tm++) M.spawn[tm] = D.spawns[tm].map(s => ({ x: s.x, z: s.z, yaw: s.yaw }));
  HOT.length = 0; for (const h of D.hot) HOT.push(h);
  navResize(D.half); navBuild();
}
function buildMap() {
  if (MX.district) return buildDistrict();
  /* se aparta la arena original (mapa 1) y los blancos: aquí los rivales son los bots */
  for (const o of OBST) { o.m.visible = false; const i = boxes.indexOf(o.bx); if (i >= 0) boxes.splice(i, 1); }
  for (const p of props.slice()) { scene.remove(p.g); const i = boxes.indexOf(p.box); if (i >= 0) boxes.splice(i, 1); }
  props.length = 0; for (const t of targets) scene.remove(t.g); targets.length = 0;
  WORLD.x = 49.6; WORLD.z = 29.6; border.scale.set(WORLD.x / 40, 1, WORLD.z / 40);
  /* suelo: bases, plaza central y carriles */
  floorRect(-43.8, 0, 12.4, 22.4, 0x1b2d4d, .006); floorRect(43.8, 0, 12.4, 22.4, 0x4d1f1b, .006);
  floorRect(0, -21, 70, 17, 0x1f2736, .003); floorRect(0, 21, 70, 17, 0x1f2736, .003);
  { const c = new THREE.Mesh(new THREE.CircleGeometry(9.5, 40), new THREE.MeshStandardMaterial({ color: 0x263248, roughness: 1, polygonOffset: true, polygonOffsetFactor: -1 })); c.rotation.x = -Math.PI / 2; c.position.set(0, .005, 0); c.receiveShadow = true; scene.add(c); }
  /* perímetro */
  addWall(0, -30.5, 102, 1, 3.4, 1); addWall(0, 30.5, 102, 1, 3.4, 1); addWall(-50.5, 0, 1, 62, 3.4, 1); addWall(50.5, 0, 1, 62, 3.4, 1);
  for (const w of QW) for (const sx of [-1, 1]) for (const sz of [-1, 1]) addWall(sx * w[0], sz * w[1], w[2], w[3], w[4], (w[2] + w[3]) | 0);
  for (const q of QP) for (const sx of [-1, 1]) for (const sz of [-1, 1]) M.specs.push({ type: q[0], x: sx * q[1], z: sz * q[2], rot: q[3] });
  for (const q of CP) M.specs.push({ type: q[0], x: q[1], z: q[2], rot: q[3] });
  for (const s of M.specs) placeProp(s, false);
  /* reaparición: seis puntos por base, mirando al otro equipo */
  for (const z of [-9.5, -6.5, -3.6, 3.6, 6.5, 9.5]) { M.spawn[0].push({ x: -40.2, z, yaw: Math.PI / 2 }); M.spawn[1].push({ x: 40.2, z, yaw: -Math.PI / 2 }); }
  if (MX.campaign) {
    for (const [team, z] of [[2, -26], [3, 26]]) {
      floorRect(0, z, 22, 8, new THREE.Color(FAC[team].acc).multiplyScalar(.4).getHex());
      M.spawn[team] = [-8, -4, 4, 8].map(x => ({ x, z, yaw: z < 0 ? 0 : Math.PI }));
    }
  }
  buildArmory();
  navBuild();
}

/* ---- armería de la base azul: al pisar una peana se equipa el arma automáticamente (principal = reemplaza la que llevas; pistola = ranura de pistola) ---- */
function buildArmory() {
  const ROWS = [['P1', 'P2'], ['S1', 'S2'], ['F1', 'F2'], ['E1', 'E2'], ['H1', 'H2']];
  ROWS.forEach((r, k) => r.forEach((sid, ci) => {
    const z = -7.2 + k * 3.6, x = -47.6 + ci * 3.2, i = WI[sid], w = WP[i];
    const pm = new THREE.Mesh(new THREE.CylinderGeometry(.9, 1, .12, 24), new THREE.MeshStandardMaterial({ color: 0x3a4660, roughness: .6 })); pm.position.set(x, .06, z); pm.receiveShadow = true; scene.add(pm);
    const gm = makeGun(w.look || w.kind).g; gm.scale.setScalar(1.5); gm.position.set(x, .95, z); gm.rotation.set(0, Math.PI / 2, 0); gm.visible = true; scene.add(gm);
    rangeLabel(sid + ' · ' + w.name, x, z + 1.15, 3.0); rangeLabel(w.sid === 'H2' ? 'explota al impacto · máx 15 m' : 'efectivo ' + w.bal.ef + ' m · máx ' + w.bal.max + ' m', x, z + 1.95, 2.8);
    M.armory.push({ x, z, i, pm, gm, armed: true, pend: false });
  }));
  const am = new THREE.Mesh(new THREE.CylinderGeometry(.95, 1, .08, 24), new THREE.MeshStandardMaterial({ color: 0x2e9e5b, emissive: 0x2e9e5b, emissiveIntensity: .35, roughness: .5 })); am.position.set(-41.4, .04, 0); scene.add(am);
  rangeLabel('MUNICIÓN', -41.4, 1.7, 3.2); M.pads.push({ x: -41.4, z: 0, m: am, armed: true, flash: 0, fn: refillAll });
}
function refillAll() { for (const w of WP) w.ammo = w.max; W.ammo = cur.max; P.gCount = 3; P.sCount = 2; }
function tryEquip(i) {                                                              // devuelve true si ha podido empezar el cambio
  if (W.reload >= 0 || W.swapT >= 0 || P.gState !== 0) return false;
  let k;
  if (WP[i].sid[0] === 'P') k = 2;
  else if (M.slots[0] === i) k = 0; else if (M.slots[1] === i) k = 1;
  else k = M.slot === 2 ? M.lastPrim : M.slot;                                      // reemplaza la principal que llevas (o la última si llevas la pistola)
  M.slots[k] = i; M.slot = k; if (k < 2) M.lastPrim = k;
  if (wi !== i) { W.swapT = 0; W.swapTo = i; }
  return true;
}
function slotSwitch(k) {
  if (W.reload >= 0 || W.swapT >= 0 || P.gState !== 0) return;
  const i = M.slots[k]; M.slot = k; if (k < 2) M.lastPrim = k;
  if (i !== wi) { W.swapT = 0; W.swapTo = i; }
}
MX.swapTick = (held, dt) => {                                                       // △ toca = alternar las dos principales; △ mantén = pistola (y otra vez mantener = volver)
  const s = M.sw;
  if (held && !s.down) { s.down = true; s.t = 0; s.fired = false; }
  else if (held) { s.t += dt; if (!s.fired && s.t >= .32) { s.fired = true; slotSwitch(M.slot === 2 ? M.lastPrim : 2); } }
  else if (s.down) { s.down = false; if (!s.fired) slotSwitch(M.slot === 2 ? M.lastPrim : 1 - M.slot); }
};
function forceWeapon(i) {
  cur.g.visible = false; cur.ammo = W.ammo; wi = i; cur = WP[i]; cur.g.visible = true; W.ammo = cur.ammo; W.max = cur.max; W.cd = .15; W.spread = 0; W.swapT = -1; W.swapTo = -1; W.reload = -1; W.rp = 0;
  $('wname').textContent = cur.name;
}
function armoryTick(dt) {
  const dead = M.ents[0].dead;
  for (const a of M.armory) {
    const near = !dead && Math.hypot(P.pos.x - a.x, P.pos.z - a.z) < 1;
    if (near && a.armed) { a.armed = false; a.pend = true; } else if (Math.hypot(P.pos.x - a.x, P.pos.z - a.z) > 1.6) a.armed = true;
    if (a.pend && (!near || wi === a.i)) a.pend = false;
    if (a.pend && tryEquip(a.i)) a.pend = false;                                      // si estaba recargando o cambiando, reintenta hasta que pueda
    const eq = M.slots.includes(a.i); a.pm.material.color.setHex(eq ? 0xd8a82a : 0x3a4660); a.pm.material.emissive.setHex(eq ? 0x4a3a08 : 0); a.gm.rotation.y += dt * .8;
  }
  for (const q of M.pads) {
    const d = Math.hypot(P.pos.x - q.x, P.pos.z - q.z);
    if (!dead && d < 1 && q.armed) { q.armed = false; q.flash = .4; q.fn(); } else if (d > 1.6) q.armed = true;
    q.flash = Math.max(0, q.flash - dt); q.m.scale.set(1 + q.flash, 1 + q.flash * 2, 1 + q.flash); q.m.material.emissiveIntensity = .35 + q.flash * 2;
  }
}

/* ============================ NAVEGACIÓN ============================ */
const NV = { cs: 1, w: 104, h: 64, ox: -52, oz: -32 }; NV.n = NV.w * NV.h; NV.bl = new Uint8Array(NV.n); MX.NV = NV;
function navBuild() {
  NV.bl.fill(0); const inf = .62;
  for (const b of boxes) {
    const ix0 = Math.max(0, Math.floor((b.x - b.hx - inf - NV.ox) / NV.cs)), ix1 = Math.min(NV.w - 1, Math.floor((b.x + b.hx + inf - NV.ox) / NV.cs));
    const iz0 = Math.max(0, Math.floor((b.z - b.hz - inf - NV.oz) / NV.cs)), iz1 = Math.min(NV.h - 1, Math.floor((b.z + b.hz + inf - NV.oz) / NV.cs));
    for (let iz = iz0; iz <= iz1; iz++) for (let ix = ix0; ix <= ix1; ix++) {
      const cx = NV.ox + (ix + .5) * NV.cs, cz = NV.oz + (iz + .5) * NV.cs, dx = Math.max(Math.abs(cx - b.x) - b.hx, 0), dz = Math.max(Math.abs(cz - b.z) - b.hz, 0);
      if (dx * dx + dz * dz < inf * inf) NV.bl[iz * NV.w + ix] = 1;
    }
  }
}
if (window.OBJ && OBJ.on) OBJ.on.push(() => { M.navT = 0; });                    // puertas, brechas y objetos nuevos: la malla se rehace en el siguiente fotograma
const navAt = (x, z) => { const ix = Math.floor((x - NV.ox) / NV.cs), iz = Math.floor((z - NV.oz) / NV.cs); return ix < 0 || iz < 0 || ix >= NV.w || iz >= NV.h ? false : !NV.bl[iz * NV.w + ix]; };
const cellOf = (x, z) => { const ix = clamp(Math.floor((x - NV.ox) / NV.cs), 0, NV.w - 1), iz = clamp(Math.floor((z - NV.oz) / NV.cs), 0, NV.h - 1); return iz * NV.w + ix; };
function nearestFree(c) {
  if (!NV.bl[c]) return c;
  const cx = c % NV.w, cz = (c / NV.w) | 0;
  for (let r = 1; r <= 8; r++) for (let dz = -r; dz <= r; dz++) for (let dx = -r; dx <= r; dx++) {
    if (Math.max(Math.abs(dx), Math.abs(dz)) !== r) continue;
    const nx = cx + dx, nz = cz + dz; if (nx < 0 || nz < 0 || nx >= NV.w || nz >= NV.h) continue; if (!NV.bl[nz * NV.w + nx]) return nz * NV.w + nx;
  }
  return -1;
}
const AS = { g: new Float32Array(NV.n), par: new Int32Array(NV.n), st: new Uint8Array(NV.n), hf: [], hi: [] };
const DX8 = [1, -1, 0, 0, 1, 1, -1, -1], DZ8 = [0, 0, 1, -1, 1, -1, 1, -1];
function hpush(f, i) { const F = AS.hf, I = AS.hi; let k = F.length; F.push(f); I.push(i); while (k > 0) { const p = (k - 1) >> 1; if (F[p] <= f) break; F[k] = F[p]; I[k] = I[p]; k = p; } F[k] = f; I[k] = i; }
function hpop() {
  const F = AS.hf, I = AS.hi, top = I[0], lf = F.pop(), li = I.pop(), n = F.length;
  if (n) { let k = 0; for (;;) { let c = 2 * k + 1; if (c >= n) break; if (c + 1 < n && F[c + 1] < F[c]) c++; if (F[c] >= lf) break; F[k] = F[c]; I[k] = I[c]; k = c; } F[k] = lf; I[k] = li; }
  return top;
}
function lineFree(a, b) {
  const dx = b.x - a.x, dz = b.z - a.z, L = Math.hypot(dx, dz), n = Math.ceil(L / .4);
  for (let i = 1; i < n; i++) { const t = i / n; if (!navAt(a.x + dx * t, a.z + dz * t)) return false; }
  return true;
}
function findPath(sx, sz, gx, gz) {
  const s = nearestFree(cellOf(sx, sz)), g = nearestFree(cellOf(gx, gz)); if (s < 0 || g < 0) return null;
  const W_ = NV.w, gcx = g % W_, gcz = (g / W_) | 0;
  AS.st.fill(0); AS.hf.length = 0; AS.hi.length = 0; AS.g[s] = 0; AS.st[s] = 1; AS.par[s] = -1; hpush(0, s); let found = false;
  while (AS.hi.length) {
    const c = hpop(); if (AS.st[c] === 2) continue; AS.st[c] = 2; if (c === g) { found = true; break; }
    const cx = c % W_, cz = (c / W_) | 0;
    for (let k = 0; k < 8; k++) {
      const nx = cx + DX8[k], nz = cz + DZ8[k]; if (nx < 0 || nz < 0 || nx >= W_ || nz >= NV.h) continue;
      const ni = nz * W_ + nx; if (NV.bl[ni] || AS.st[ni] === 2) continue;
      if (k >= 4 && (NV.bl[cz * W_ + nx] || NV.bl[nz * W_ + cx])) continue;            // no cortar esquinas
      const ng = AS.g[c] + (k >= 4 ? 1.414 : 1);
      if (AS.st[ni] !== 1 || ng < AS.g[ni]) { AS.g[ni] = ng; AS.par[ni] = c; AS.st[ni] = 1; const ex = Math.abs(nx - gcx), ez = Math.abs(nz - gcz); hpush(ng + Math.max(ex, ez) + .414 * Math.min(ex, ez), ni); }
    }
  }
  if (!found) return null;
  const pts = []; for (let c = g; c !== -1; c = AS.par[c]) pts.push({ x: NV.ox + (c % W_ + .5) * NV.cs, z: NV.oz + (((c / W_) | 0) + .5) * NV.cs });
  pts.reverse(); pts[0] = { x: sx, z: sz }; if (navAt(gx, gz)) pts[pts.length - 1] = { x: gx, z: gz };
  const out = []; let i = 0;                                                         // se alisa el camino: se salta a la waypoint más lejana con línea libre
  while (i < pts.length - 1) { let j = pts.length - 1; while (j > i + 1 && !lineFree(pts[i], pts[j])) j--; out.push(pts[j]); i = j; }
  return out.length ? out : [{ x: gx, z: gz }];
}
MX.findPath = findPath; MX.navAt = navAt; MX.lineFree = lineFree; MX.HOT = HOT;

/* ---- visibilidad: línea libre entre dos puntos (ignorando, si se pide, los objetos bajos: se ve por encima de ellos) y humo ---- */
function segClear(ax, az, bx, bz, ign1, ign2, lowIgnore) {
  const dx = bx - ax, dz = bz - az, L = Math.hypot(dx, dz); if (L < 1e-4) return true; const ux = dx / L, uz = dz / L;
  for (const b of boxes) {
    if (b.prop && (b.prop === ign1 || b.prop === ign2)) continue;
    if (lowIgnore && b.prop && b.prop.h <= .95) continue;
    const r = rayBox2(ax, az, ux, uz, b); if (r && r[0] < L) return false;
  }
  return true;
}
function smokeBlock(ax, az, bx, bz) {
  for (const c of clouds) {
    if (c.t < .8 || c.t > 12.2) continue;
    const dx = bx - ax, dz = bz - az, L2 = dx * dx + dz * dz || 1, t = clamp(((c.x - ax) * dx + (c.z - az) * dz) / L2, 0, 1);
    if (Math.hypot(ax + dx * t - c.x, az + dz * t - c.z) < c.R + .3) { const ia = Math.hypot(ax - c.x, az - c.z) < c.R + .3, ib = Math.hypot(bx - c.x, bz - c.z) < c.R + .3; if (!(ia && ib)) return true; }
  }
  return false;
}
function wallBetween(ax, az, bx, bz) {
  const dx = bx - ax, dz = bz - az, L = Math.hypot(dx, dz); if (L < 1e-4) return false; const ux = dx / L, uz = dz / L;
  for (const b of M.walls) { const r = rayBox2(ax, az, ux, uz, b); if (r && r[0] < L) return true; }
  return false;
}

/* ============================ PERSONAJES ============================ */
const mm = c => new THREE.MeshStandardMaterial({ color: c, roughness: .6, flatShading: true });
const TM = [{ body: mm(0x3d6fb6), limb: mm(0x2c3f63), acc: mm(0x6dff9a) }, { body: mm(0xb6453d), limb: mm(0x5a2a28), acc: mm(0xffd24a) }];
const RING = [new THREE.MeshBasicMaterial({ color: 0x6dff9a, transparent: true, opacity: .5, side: THREE.DoubleSide, depthWrite: false }), new THREE.MeshBasicMaterial({ color: 0xff5a4a, transparent: true, opacity: .55, side: THREE.DoubleSide, depthWrite: false })];
const RING_G = new THREE.RingGeometry(.5, .62, 24);
const WW = { P1: .6, P2: 1, S1: 1, S2: 1, F1: 1.5, F2: .8, E1: .9, E2: .9, H1: .9, H2: .5 };
function pickWeaponIdx() { let tot = 0; for (const w of WP) tot += WW[w.sid] || 1; let r = rnd() * tot; for (let i = 0; i < WP.length; i++) { r -= WW[WP[i].sid] || 1; if (r <= 0) return i; } return 0; }

// El equipo visible y los colores proceden de las paletas compartidas con el jugador.
for (let team = TM.length; team < FAC.length; team++) {
  TM.push({ body: FACM[team].uni, limb: FACM[team].pants, acc: FACM[team].trim });
  const ring = RING[1].clone();
  ring.color.setHex(FAC[team].trim);
  RING.push(ring);
}
function teamColor(team) {
  return '#' + FAC[team].trim.toString(16).padStart(6, '0');
}
function makeEnt(team, n, isPlayer) {
  const e = { id: ['A', 'R', 'M', 'V'][team] + (n + 1), team, sq: Math.floor(n / 5), slot: n % 5, isPlayer: !!isPlayer, bot: !isPlayer, p: isPlayer ? P.pos : new V3(), v: isPlayer ? P.vel : new V3(),
    yaw: 0, body: 0, hp: HP, sh: SH, bH: { fill: HP, chunk: HP, wait: 0 }, bS: { fill: SH, chunk: SH, wait: 0 }, dead: true, deadT: 0, respT: 0, inv: 0, kills: 0, deaths: 0, cover: null, lastHurt: -99, lastAtt: null, lastAttT: -99, dwn: false, revived: false, kits: 1, rescuer: null, rt: null, revP: 0 };
  e.tgp = { hp: HP, g: { visible: true, position: e.p } };
  if (!isPlayer) initBot(e);
  return e;
}
function initBot(e) {
  const T = TM[e.team], root = new THREE.Group(); scene.add(root); e.root = root;
  const mkm = (geo, mat, x, y, z) => { const m = new THREE.Mesh(geo, mat); m.scale.set(x, y, z); m.castShadow = true; root.add(m); return m; };
  const pair = f => [f(), f()];
  e.R = { pelvis: mkm(geoBox, T.body, .32, .18, .2), torso: mkm(geoBox, T.body, .42, .5, .25), head: mkm(geoBall, T.limb, .13, .13, .13), visor: mkm(geoBox, T.acc, .17, .05, .1),
    thigh: pair(() => mkm(geoCyl, T.limb, .07, 1, .07)), shin: pair(() => mkm(geoCyl, T.limb, .06, 1, .06)), knee: pair(() => mkm(geoBall, T.limb, .07, .07, .07)), foot: pair(() => mkm(geoBox, T.acc, .12, .07, .27)),
    upper: pair(() => mkm(geoCyl, T.limb, .055, 1, .055)), fore: pair(() => mkm(geoCyl, T.limb, .05, 1, .05)), hand: pair(() => mkm(geoBall, T.acc, .06, .06, .06)), shoulder: pair(() => mkm(geoBall, T.body, .08, .08, .08)) };
  e.skin = (e.id.charCodeAt(1) + e.team * 2) % 4; dress(e.R, e.team, { skin: e.skin });
  e.bar = mkBar(60, 4); e.bar.el.style.display = 'none'; e.ring = new THREE.Mesh(RING_G, RING[e.team]); e.ring.rotation.x = -Math.PI / 2; e.ring.visible = false; scene.add(e.ring);
  e.flash = new THREE.Mesh(flashMesh.geometry, flashMesh.material); e.flash.visible = false; scene.add(e.flash);
  Object.assign(e, { gun: null, w: WP[0], wi: 0, ammo: 0, reloadT: -1, rp: 0, fireCd: 0, pause: 0, burst: 0, spread: 0, kick: 0, flashT: 0, gCount: 3, sCount: 2, gReg: 0, sReg: 0, gCd: rr(5, 12), sCd: 8, wantThrow: null, throwT: 0,
    st: 'push', goal: null, path: null, pi: 0, needPath: false, pathT: -9, thinkT: rnd() * .12, tgt: null, vis: false, canShoot: false, dT: 99, seenT: -99, reactT: 0, leadK: 1, ls: { x: 0, z: 0 }, err: 0, errT: 0,
    strafeDir: 1, strafeT: 0, coverStart: 0, coverPt: null, searchStart: 0, alertT: -99, holdT: 0, flee: null, glance: 0, glanceT: 0, firing: false, stuckT: 0, stuckX: 0, stuckZ: 0, stuckN: 0, nudge: 0,
    phase: rnd(), walk: 0, gd: new V3(0, 0, 1), fpitch: [0, 0], py: 1.1, run: 0, crouch: 0, crouchT: 0, half: 0, fallAx: new V3(), ideal: 8, maxEng: 20, keepAway: false });
}
function setWeapon(e, i) {
  e.wi = i; e.w = WP[i]; e.ammo = e.w.max; e.reloadT = -1; const b = e.w.bal;
  e.ideal = e.w.launch ? 14 : clamp(b.ef * .85, 3.2, 17); e.maxEng = e.w.launch ? 19 : Math.min(b.max * .85, 26); e.keepAway = b.ef > 10 || !!e.w.launch;
  if (e.gun) e.root.remove(e.gun);
  e.gun = makeGun(e.w.look || e.w.kind).g; e.gun.rotation.order = 'YXZ'; e.gun.visible = true; e.root.add(e.gun);
}

/* ---- pose procedural de los bots (misma anatomía y IK que el jugador, marcha simplificada) ---- */
const _pel = new V3(), _top = new V3(), _sh = new V3(), _yA = new V3(), _fa = new V3(), _sa = new V3(), _fb = new V3(), _sb = new V3(), _pol = new V3(), _tg = new V3(), _gd = new V3(), _r1 = new V3(), _r2 = new V3(), _r3 = new V3();
const _hip = [new V3(), new V3()], _shd = [new V3(), new V3()], _ft = [new V3(), new V3()];
function poseBot(e, dt) {
  const R = e.R, a = e.yaw, b = e.body, sp = Math.hypot(e.v.x, e.v.z), c = e.crouch, sn = clamp(sp / 8, 0, 1);
  _fa.set(Math.sin(a), 0, Math.cos(a)); _sa.set(Math.cos(a), 0, -Math.sin(a)); _fb.set(Math.sin(b), 0, Math.cos(b)); _sb.set(Math.cos(b), 0, -Math.sin(b));
  const Ll = .54, reach = Ll * 2 * .985, hw = .12 + .05 * c, beta = .5 + .05 * c, Lst = clamp(.5 + .09 * sp, .5, 1.15) * (1 - .35 * c), Dc = Lst / beta, moving = sp > .45;
  if (moving) { e.phase = (e.phase + dt * sp / Dc) % 1; _gd.set(e.v.x / sp, 0, e.v.z / sp); e.gd.lerp(_gd, 1 - Math.exp(-12 * dt)).normalize(); }
  e.walk = damp(e.walk, moving ? 1 : 0, 10, dt);
  const half = Math.floor(e.phase * 2); if (half !== e.half) { e.half = half; if (moving && sp > 1.2) playAt('STEP_walk', e.p.x, e.p.z, { vol: .42 * clamp(sp / 6, .5, 1) * (1 - .4 * c), gap: 70, rate: .93 + sn * .12 }); }
  const bob = moving ? clamp(.01 + .006 * sp, 0, .05) * (.5 - .5 * Math.cos(4 * Math.PI * (e.phase - beta * .5))) : 0, x = e.p.x, z = e.p.z;
  let py = 1.1 - sn * .2 - c * .38 + bob;
  for (let i = 0; i < 2; i++) {
    const sg = i === 0 ? 1 : -1; _hip[i].set(x, 0, z).addScaledVector(_sb, sg * hw);
    const ph = (e.phase + i * .5) % 1; let off, lift;
    if (ph < beta) { off = Lst * (.5 - ph / beta); lift = 0; } else { const u = (ph - beta) / (1 - beta); off = Lst * (-.5 + smooth(u)); lift = Math.sin(Math.PI * u) * (.08 + Math.min(sp, 9) * .022); }
    off *= e.walk; lift *= e.walk; _ft[i].copy(_hip[i]).addScaledVector(e.gd, off); _ft[i].y = lift;
    e.fpitch[i] = ph < beta ? 0 : .35 * Math.sin(2 * Math.PI * ((ph - beta) / (1 - beta))) * e.walk;
    const dxz = Math.hypot(_ft[i].x - _hip[i].x, _ft[i].z - _hip[i].z); py = Math.min(py, lift + .09 + Math.sqrt(Math.max(reach * reach - dxz * dxz, 0)));
  }
  e.py = damp(e.py, py, py < e.py ? 30 : 16, dt); _pel.set(x, e.py, z);
  for (let i = 0; i < 2; i++) {
    const sg = i === 0 ? 1 : -1; _hip[i].y = e.py; _tg.set(_ft[i].x, _ft[i].y + .09, _ft[i].z); _pol.copy(_fb).addScaledVector(_sb, sg * .2);
    ik2(_hip[i], _tg, Ll, Ll, _pol);
    setLimb(R.thigh[i], _hip[i], IKO.mid); setLimb(R.shin[i], IKO.mid, IKO.end); R.knee[i].position.copy(IKO.mid);
    R.foot[i].position.copy(IKO.end).addScaledVector(_fb, .06).y -= .05; R.foot[i].rotation.order = 'YXZ'; R.foot[i].rotation.set(e.fpitch[i], b, 0);
  }
  R.pelvis.position.copy(_pel); R.pelvis.rotation.order = 'YXZ'; R.pelvis.rotation.y = b;
  _top.copy(_pel); _top.y += .1; _sh.copy(_top); _sh.y += .5 - c * .06; _sh.x += clamp(e.v.x * .015, -.12, .12); _sh.z += clamp(e.v.z * .015, -.12, .12); _sh.addScaledVector(_fa, -e.kick * .05 + c * .12);
  _yA.copy(_sh).sub(_top).normalize(); R.torso.position.copy(_top).add(_sh).multiplyScalar(.5); orient(R.torso, _sa, _yA);
  R.head.position.copy(_sh).addScaledVector(_yA, .27); R.visor.position.copy(R.head.position).addScaledVector(_fa, .1); R.visor.rotation.y = a;
  const w = e.w, env = e.reloadT < 0 ? 0 : e.reloadT < .25 ? smooth(e.reloadT / .25) : e.reloadT < 1.3 ? 1 : 1 - smooth((e.reloadT - 1.3) / .25);
  e.run = damp(e.run, sp > 5 && !e.firing && e.st !== 'fight' ? 1 : 0, 8, dt);
  e.gun.position.copy(_sh).addScaledVector(_fa, .44 - e.kick * .05 - e.run * .08).addScaledVector(_sa, -.13 + env * .04); e.gun.position.y -= .14 + e.run * .1;
  e.gun.rotation.set(-e.kick * .12 - env * .55 + e.run * .45, a, env * .5); e.gun.updateMatrixWorld(true);
  e.gun.localToWorld(_r1.set(w.rear[0], w.rear[1], w.rear[2])); e.gun.localToWorld(_r2.set(w.fore[0], w.fore[1], w.fore[2])); e.gun.localToWorld(_r3.set(w.well[0], w.well[1], w.well[2])); _r2.lerp(_r3, env);
  for (let i = 0; i < 2; i++) {
    const sg = i === 0 ? 1 : -1; _shd[i].copy(_sh).addScaledVector(_sa, .22 * sg).addScaledVector(_yA, -.05);
    _pol.set(0, -1, 0).addScaledVector(_sa, sg * .7).addScaledVector(_fa, -.3); ik2(_shd[i], i === 0 ? _r2 : _r1, .36, .36, _pol);
    setLimb(R.upper[i], _shd[i], IKO.mid); setLimb(R.fore[i], IKO.mid, IKO.end); R.hand[i].position.copy(IKO.end); R.shoulder[i].position.copy(_shd[i]);
  }
}
function bake(e, dx, dz) {                                                           // al morir, el cuerpo cae como un bloque alrededor de los pies
  const r = e.root, px = e.p.x, pz = e.p.z; r.position.set(px, 0, pz);
  for (const ch of r.children) { ch.position.x -= px; ch.position.z -= pz; }
  const l = Math.hypot(dx, dz) || 1; e.fallAx.set(dz / l, 0, -dx / l); e.deadT = 0;
}
function unbake(e) { e.root.position.set(0, 0, 0); e.root.quaternion.identity(); }
/* ---- abatido y reanimación (solo aspecto: sin reglas de juego todavía; lo activan MX.setDowned / MX.reviveFx) ----
   Abatido = cae al suelo con el mismo giro que la baja, pero sigue ahí con un marcador (anillo ámbar que late + cruz flotante). Al reanimarle, un anillo de progreso y el cuerpo se incorpora. */
const DWN_RING = new THREE.RingGeometry(.62, .78, 40), DWN_AMB = new THREE.MeshBasicMaterial({ color: 0xffb020, transparent: true, opacity: .8, side: THREE.DoubleSide, depthWrite: false }),
  DWN_WHT = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: .95, depthWrite: false }), DWN_RED = new THREE.MeshBasicMaterial({ color: 0xff4a38, transparent: true, opacity: .95, depthWrite: false }),
  DWN_GRN = new THREE.MeshBasicMaterial({ color: 0x6dff9a, transparent: true, opacity: .9, side: THREE.DoubleSide, depthWrite: false });
const DWN_T = 25, DWN_HP = 40, REV_T = 3, REV_R = 1.5, REV_HP = 50, SUR_T = .8;          // SUR_T: segundos manteniendo □ para reaparecer estando abatido            // abatido: tiempo máx., vida extra antes de morir; reanimar: tiempo, alcance y vida al volver
function dwnFxMake(e) {
  if (e.dwnFx) return;
  const g = new THREE.Group(), ring = new THREE.Mesh(DWN_RING, DWN_AMB.clone()); ring.rotation.x = -Math.PI / 2; ring.position.y = .035; g.add(ring);
  const cr = new THREE.Group(), pl = new THREE.Mesh(geoBox, DWN_WHT); pl.scale.set(.46, .46, .04); cr.add(pl);                    // placa blanca con cruz roja, inclinada hacia la cámara
  for (const [w, h] of [[.36, .1], [.1, .36]]) { const m = new THREE.Mesh(geoBox, DWN_RED); m.scale.set(w, h, .03); m.position.z = .03; cr.add(m); }
  cr.rotation.x = -.99; cr.position.y = 1.5; g.add(cr);
  g.position.set(e.p.x, 0, e.p.z); scene.add(g); e.dwnFx = { g, ring, cr, prog: null, pm: null };
}
function dwnFxClear(e) { if (e.dwnFx) { scene.remove(e.dwnFx.g); e.dwnFx = null; } }
MX.setDowned = (e, on, dx, dz) => {                                                 // solo aspecto (pruebas y capturas): sin reglas
  if (on === !!e.dwn || e.dead) return;
  if (on) { e.dwn = true; e.dwT = 0; bake(e, dx === undefined ? Math.sin(e.yaw) : dx, dz === undefined ? Math.cos(e.yaw) : dz); dwnFxMake(e); }
  else { e.dwn = false; unbake(e); dwnFxClear(e); }
};
MX.reviveFx = (e, p) => {                                                           // progreso de reanimación 0..1 (null = sin rescate)
  const f = e.dwnFx; if (!f) return;
  if (p === null || p === undefined) { if (f.pm) { f.g.remove(f.pm); f.pm = null; } f.prog = null; return; }
  if (f.pm === null || f.prog === null || Math.abs(p - f.prog) > .015) {
    if (f.pm) { f.g.remove(f.pm); f.pm.geometry.dispose(); }
    f.pm = new THREE.Mesh(new THREE.RingGeometry(.82, .98, 40, 1, Math.PI / 2, -Math.PI * 2 * clamp(p, .001, 1)), DWN_GRN); f.pm.rotation.x = -Math.PI / 2; f.pm.position.y = .04; f.g.add(f.pm); f.prog = p;
  }
};
function dwnFxTick(e) {
  const f = e.dwnFx; if (!f) return;
  const ax = e.fallAx; f.g.position.set(e.p.x - ax.z * .9, 0, e.p.z + ax.x * .9);
  const left = MX.campaign ? 1 - e.dwT / DWN_T : 1, fast = left < .3 ? 12 : 5;      // al agotarse el tiempo, el marcador late más rápido
  f.ring.material.opacity = .45 + .4 * (.5 + .5 * Math.sin(M.t * fast)); f.ring.scale.setScalar(1 + .06 * Math.sin(M.t * fast));
  f.cr.position.y = 1.45 + .08 * Math.sin(M.t * 3);
}
function dwnTick(e, dt) {
  e.dwT += dt; const k = smooth(e.dwT / .5); e.root.quaternion.setFromAxisAngle(e.fallAx, k * 1.3);
  dwnFxTick(e);
  if (MX.campaign && e.dwT >= DWN_T && !M.over) { endRescueOn(e); kill(e, e.lastAttT > -90 && M.t - e.lastAttT < 40 ? e.lastAtt : null, 0, 1); }   // se desangra
}

/* ============================ IA DE LOS BOTS ============================ */
/* Visión igual que la del jugador: un bot ve a un enemigo sólo si éste cabría en su pantalla, es decir, dentro del mismo rectángulo que la cámara del jugador
   enseña alrededor de su personaje (ancho y fondo medidos de la cámara real; en vertical es más estrecho). Sin cono: el jugador también ve a su espalda dentro de la pantalla. */
const SIGHT = { hw: 13, hd: 8, t: 0 }, _sr = new THREE.Raycaster(), _sv = new THREE.Vector2();
function sightUpdate() {
  const g = (nx, ny) => { _sv.set(nx, ny); _sr.setFromCamera(_sv, camera); const r = _sr.ray; if (r.direction.y > -.01) return null; const t = -r.origin.y / r.direction.y; return { x: r.origin.x + r.direction.x * t, z: r.origin.z + r.direction.z * t }; };
  const l = g(-1, 0), r = g(1, 0), u = g(0, 1), d = g(0, -1); if (!l || !r || !u || !d) return;
  SIGHT.hw = Math.abs(r.x - l.x) / 2; SIGHT.hd = Math.abs(d.z - u.z) / 2;
}
MX.SIGHT = SIGHT;
const inSight = (e, dx, dz) => Math.abs(dx) < SIGHT.hw && Math.abs(dz) < SIGHT.hd;
function perceive(e) {
  let best = null, bs = 1e9;
  if (MX.zom) for (const o of MX.zom.list) {                                         // los zombis también son amenaza para los bots
    if (o.dead) continue;
    const dx = o.p.x - e.p.x, dz = o.p.z - e.p.z, d = Math.hypot(dx, dz); if (!inSight(e, dx, dz)) continue;
    if (!segClear(e.p.x, e.p.z, o.p.x, o.p.z, null, null, true) || smokeBlock(e.p.x, e.p.z, o.p.x, o.p.z)) continue;
    if (d + 2 < bs) { bs = d + 2; best = o; }
  }
  for (const o of M.ents) {
    if (o.dead || o.team === e.team || o.inv > 0) continue;
    const dx = o.p.x - e.p.x, dz = o.p.z - e.p.z, d = Math.hypot(dx, dz); if (!inSight(e, dx, dz)) continue;
    if (!segClear(e.p.x, e.p.z, o.p.x, o.p.z, null, null, true) || smokeBlock(e.p.x, e.p.z, o.p.x, o.p.z)) continue;
    const sc = d - (o === e.lastAtt && M.t - e.lastAttT < 3 ? 6 : 0); if (sc < bs) { bs = sc; best = o; }
  }
  return best;
}
function dangerVec(e) {
  let fx = 0, fz = 0, n = 0;
  const add = (x, z, r) => { const dx = e.p.x - x, dz = e.p.z - z, d = Math.hypot(dx, dz); if (d < r) { const k = (1 - d / r) + .2; fx += dx / (d || 1) * k; fz += dz / (d || 1) * k; n++; } };
  for (const g of grens) if (g.on && g.type === 'frag' && g.fuse < 2.4) add(g.p.x, g.p.z, R_FRAG + 1.6);
  for (const p of props) if (!p.dead && p.explosive && (p.fuse >= 0 || p.burning)) add(p.x, p.z, 5.6);
  for (const f of FIRES) add(f.x, f.z, f.r + 1.3);
  if (!n) return null; const l = Math.hypot(fx, fz) || 1; return { x: fx / l, z: fz / l };
}
function coverPoint(e, tx, tz) {                                                    // punto junto a un objeto desde el que la amenaza no tiene línea de tiro
  let best = null, bs = 1e9; const list = [];
  for (const p of props) if (!p.dead && !p.explosive) list.push(p); for (const b of M.walls) list.push(b);
  for (const c of list) {
    if (Math.hypot(c.x - e.p.x, c.z - e.p.z) > 17) continue;
    for (const [sx, sz] of DIRS4) {
      const px = c.x + sx * (c.hx + .85), pz = c.z + sz * (c.hz + .85); if (!navAt(px, pz)) continue;
      if (segClear(tx, tz, px, pz, null, null, false)) continue;
      const sc = Math.hypot(px - e.p.x, pz - e.p.z) + (Math.hypot(px - tx, pz - tz) < 4 ? 20 : 0) + rnd() * 2; if (sc < bs) { bs = sc; best = { x: px, z: pz }; }
    }
  }
  return best;
}
function retreatPoint(e, tx, tz) {
  const dx = e.p.x - tx, dz = e.p.z - tz, l = Math.hypot(dx, dz) || 1;
  for (const k of [10, 7, 4]) { const x = e.p.x + dx / l * k, z = e.p.z + dz / l * k; if (navAt(x, z)) return { x, z }; }
  return null;
}
function setGoal(e, x, z) { e.goal = { x, z }; e.needPath = true; }
/* ---- grupos de 5 (escuadras): 5 por facción (25 combatientes). El líder es el primer miembro vivo en pie; en la escuadra 0 de Azul lidera el jugador y los demás le siguen.
   Los seguidores van a su puesto de la formación junto al destino del líder, se reagrupan si se alejan y comparten avisos de enemigos. ---- */
const SQ_OFF = [[0, 0], [-2.2, 2.2], [2.2, 2.2], [-3.6, -1.6], [3.6, -1.6]], SQ_MAX = 30;
function leaderOf(e) { for (const o of M.ents) if (o.team === e.team && o.sq === e.sq && !o.dead && !o.dwn) return o; return null; }
function squadGoal(e, L) {                                                           // punto de formación de un seguidor junto a su líder
  const o = SQ_OFF[e.slot % 5], a = L.isPlayer ? P.aim : L.yaw, ca = Math.cos(a), sa = Math.sin(a), base = L.isPlayer || !L.goal ? L.p : L.goal;
  return { x: base.x + o[0] * ca + o[1] * sa, z: base.z - o[0] * sa + o[1] * ca };
}
function squadSync(e) {                                                              // llamado desde think: mantiene al seguidor con su escuadra
  const L = leaderOf(e); e.leader = L; if (!L || L === e || e.st !== 'push') return;
  const g = squadGoal(e, L), far = Math.hypot(L.p.x - e.p.x, L.p.z - e.p.z) > SQ_MAX;
  if (!e.goal || far || Math.hypot(e.goal.x - g.x, e.goal.z - g.z) > 5) setGoal(e, g.x + rr(-.6, .6), g.z + rr(-.6, .6));
}
function squadAlert(e, seen) {                                                       // un miembro ve un enemigo: avisa a los de su escuadra que no lo ven
  if (M.t - (e.sqAlert || -9) < 1.5) return; e.sqAlert = M.t;
  for (const o of M.ents) {
    if (o === e || o.dead || o.dwn || o.isPlayer || o.team !== e.team || o.sq !== e.sq || o.vis || o.st === 'cover' || M.t - o.alertT < 3) continue;
    if (Math.hypot(o.p.x - e.p.x, o.p.z - e.p.z) > 35) continue;
    o.alertT = M.t; o.ls.x = seen.p.x; o.ls.z = seen.p.z; o.st = 'search'; o.searchStart = M.t; setGoal(o, o.ls.x, o.ls.z);
  }
}
function pickGoal(e) {
  if (MX.campaign) { const L = leaderOf(e); if (L && L !== e) { const g = squadGoal(e, L); e.goal = null; setGoal(e, g.x + rr(-.6, .6), g.z + rr(-.6, .6)); return; } }   // seguidor: va a su puesto junto al líder
  const dir = e.team % 2 === 0 ? 1 : -1, cand = []; let tot = 0;
  for (const h of HOT) { const d = Math.hypot(h[0] - e.p.x, h[1] - e.p.z); if (d < 7) continue; const w = 1 + 1.6 * clamp(dir * h[e.team < 2 ? 0 : 1] / 30, 0, 1) - (e.lastGoal && Math.hypot(h[0] - e.lastGoal[0], h[1] - e.lastGoal[1]) < 5 ? .8 : 0); cand.push([h, Math.max(.15, w)]); tot += Math.max(.15, w); }
  let r = rnd() * tot, pick = cand.length ? cand[0][0] : [0, 0]; for (const c of cand) { r -= c[1]; if (r <= 0) { pick = c[0]; break; } }
  e.lastGoal = pick; setGoal(e, pick[0] + rr(-2, 2), pick[1] + rr(-2, 2));
}
function steerPath(e) {
  if (!e.goal) return 'none';
  if (e.needPath) {
    if (M.budget <= 0) return 'wait';
    M.budget--; e.needPath = false; e.pathT = M.t; e.path = findPath(e.p.x, e.p.z, e.goal.x, e.goal.z); e.pi = 0; if (!e.path) { e.goal = null; return 'none'; }
  }
  if (!e.path) return 'none';
  while (e.pi < e.path.length) {
    const p = e.path[e.pi], d = Math.hypot(p.x - e.p.x, p.z - e.p.z);
    if (d < (e.pi === e.path.length - 1 ? .6 : .5)) e.pi++; else { e.sdx = (p.x - e.p.x) / d; e.sdz = (p.z - e.p.z) / d; return 'ok'; }
  }
  return 'arrived';
}
function think(e) {
  const df = DIFFS[M.diff];
  let cv = null, bd = 9;                                                             // cobertura baja pegada (se dispara por encima, como el jugador)
  for (const p of props) { if (p.dead || p.h > .95) continue; const dx = Math.max(Math.abs(e.p.x - p.x) - p.hx, 0), dz = Math.max(Math.abs(e.p.z - p.z) - p.hz, 0), d = Math.hypot(dx, dz); if (d < (p === e.cover ? 1 : .8) && d < bd) { bd = d; cv = p; } }
  e.cover = cv; e.flee = dangerVec(e);
  const seen = perceive(e);
  if (MX.campaign) { e.syncT = (e.syncT || 0) - .13; if (e.syncT <= 0) { e.syncT = 1 + rnd() * .5; squadSync(e); } if (seen && seen.p) squadAlert(e, seen); }
  if (seen) { if (e.tgt !== seen) { e.tgt = seen; e.reactT = 0; e.leadK = rr(.6, 1.05); } e.vis = true; e.seenT = M.t; e.ls.x = seen.p.x; e.ls.z = seen.p.z; } else e.vis = false;
  if (e.vis) { const sx = e.p.x + Math.sin(e.yaw) * .6, sz = e.p.z + Math.cos(e.yaw) * .6; e.dT = Math.hypot(e.tgt.p.x - e.p.x, e.tgt.p.z - e.p.z); e.canShoot = segClear(sx, sz, e.tgt.p.x, e.tgt.p.z, e.cover, null, false) && !smokeBlock(sx, sz, e.tgt.p.x, e.tgt.p.z); } else e.canShoot = false;
  if (!e.vis && e.lastAtt && !e.lastAtt.dead && e.lastAtt.team !== e.team && M.t - e.lastAttT < .6 && e.st !== 'cover' && M.t - e.alertT > 4) {   // me han disparado y no veo a nadie: voy hacia el atacante
    e.alertT = M.t; e.ls.x = e.lastAtt.p.x; e.ls.z = e.lastAtt.p.z; e.tgt = e.lastAtt; e.st = 'search'; e.searchStart = M.t; setGoal(e, e.ls.x, e.ls.z);
  }
  const lowHp = e.hp < 36;
  if (e.st === 'cover') {
    if ((e.hp > 72 && M.t - e.coverStart > 2) || M.t - e.coverStart > 9) { e.st = e.vis ? 'fight' : 'push'; e.path = null; e.goal = null; }
  } else if (lowHp && (e.vis || M.t - e.lastHurt < 3)) {
    const th = e.vis ? e.tgt.p : (e.lastAtt ? e.lastAtt.p : null);
    if (th) { const cp = coverPoint(e, th.x, th.z) || retreatPoint(e, th.x, th.z); if (cp) { e.st = 'cover'; e.coverStart = M.t; e.coverPt = cp; setGoal(e, cp.x, cp.z); } }
  } else if (e.vis) { if (e.st !== 'fight') { e.st = 'fight'; e.path = null; e.goal = null; } }
  else if (e.st === 'fight' && M.t - e.seenT > 1.0) { e.st = 'search'; e.searchStart = M.t; setGoal(e, e.ls.x, e.ls.z); }
  else if (e.st === 'search' && M.t - e.searchStart > 6) { e.st = 'push'; e.goal = null; }
  if (e.st === 'push' && !e.goal) pickGoal(e);
  /* granadas: frag al rival a 5,6–8,6 m (cae a 7 m fijos); humo hacia la amenaza al retirarse */
  if (!e.wantThrow && e.reloadT < 0) {
    if (e.vis && e.st !== 'cover' && e.gCount > 0 && e.gCd <= 0 && e.dT > 5.6 && e.dT < 8.6 && e.reactT > df.react && rnd() < .5) { e.wantThrow = 'frag'; e.throwT = 0; }
    else if (e.st === 'cover' && e.sCount > 0 && e.sCd <= 0 && (e.vis || M.t - e.lastHurt < 2) && rnd() < .5) { e.wantThrow = 'smoke'; e.throwT = 0; }
  }
}
function botThrow(e, type) {
  const g = grens.find(q => !q.on); if (!g) return;
  const dx = Math.sin(e.yaw), dz = Math.cos(e.yaw);
  g.on = true; g.own = e; g.launched = false; g.bt = 0; g.type = type; g.fuse = type === 'frag' ? 2.2 : 1.4; g.p.set(e.p.x + dx * .45, 1.15, e.p.z + dz * .45);
  const D = 7, vy = gVyOf(D), vh = solveVh(g.p.y, vy, dx, dz, Math.max(.5, D - .45), g.fuse); g.v.set(dx * vh, vy, dz * vh);
  g.m.visible = true; g.m.material.color.setHex(type === 'frag' ? 0x3b4a2c : 0xaab2c0); playAt('GREN_throw', e.p.x, e.p.z);
  if (type === 'frag') { e.gCount--; e.gCd = rr(12, 20); } else { e.sCount--; e.sCd = rr(20, 30); }
}
function botLaunch(e, mx, mz, dx, dz) {                                              // lanzagranadas H2: cae a 15 m, como el del jugador
  const g = grens.find(q => !q.on); if (!g) return;
  g.on = true; g.own = e; g.type = 'frag'; g.launched = true; g.bt = 0; g.fuse = 2; g.p.set(mx, 1.0, mz);
  const Dh = Math.max(1, 15 - .8), t = Dh / 24; g.v.set(dx * 24, (.09 - g.p.y + 9 * t * t) / t, dz * 24); g.m.visible = true; g.m.material.color.setHex(0x3b4a2c);
}
function shoot(e) {
  const w = e.w, dx = Math.sin(e.yaw), dz = Math.cos(e.yaw), y = e.crouch > .5 ? .86 : 1.12, mx = e.p.x + dx * .62, mz = e.p.z + dz * .62, sp = Math.hypot(e.v.x, e.v.z);
  if (w.launch) botLaunch(e, mx, mz, dx, dz);
  else for (let n = 0; n < w.pellets; n++) { const yw = e.yaw + (rnd() - .5) * (w.spr * .8 + (e.spread * .06 + Math.min(sp, 8) * .006) * (1 - e.crouch * .35)); spawnBullet(mx, y, mz, Math.sin(yw), Math.cos(yw), w, e); }
  e.ammo--; e.spread = Math.min(1, e.spread + .14); e.kick = 1; e.flashT = .05; e.firing = true; e.fireCd = w.cd * (w.auto ? 1 : rr(1.1, 1.7));
  if (e.burst <= 0) e.burst = w.auto ? Math.round(w.sid === 'H1' ? rr(6, 14) : rr(3, 8)) : 1;
  if (--e.burst <= 0) e.pause = w.auto ? rr(.25, .7) : rr(0, .15);
  playAt(w.sid + '_shot', e.p.x, e.p.z, { gap: 20 });
}
function startReload(e) { e.reloadT = 0; e.rp = 0; e.burst = 0; }
function aimFire(e, dt) {
  const df = DIFFS[M.diff], w = e.w; let want = null, clean = null; e.firing = false;
  if (e.wantThrow) {                                                                 // apuntar y lanzar granada / humo
    e.throwT += dt; const tx = e.vis ? e.tgt.p.x : e.ls.x, tz = e.vis ? e.tgt.p.z : e.ls.z, ty = Math.atan2(tx - e.p.x, tz - e.p.z), ad = angDiff(e.yaw, ty);
    e.yaw += clamp(ad, -df.turn * dt, df.turn * dt);
    if (Math.abs(ad) < .12) { botThrow(e, e.wantThrow); e.wantThrow = null; } else if (e.throwT > 1.4) e.wantThrow = null;
    return;
  }
  if (e.vis && e.tgt && !e.tgt.dead) {
    const t = e.tgt, d = e.dT, tof = d / ((w.bal.v || 24) * .9), lx = t.p.x + t.v.x * tof * e.leadK, lz = t.p.z + t.v.z * tof * e.leadK;
    clean = Math.atan2(lx - e.p.x, lz - e.p.z);
    e.errT -= dt; if (e.errT <= 0) { e.errT = rr(.2, .4); e.err = clamp(gauss() * df.err * Math.pow(Math.max(d, 3) / 10, .7) * (Math.hypot(e.v.x, e.v.z) > 1 ? 1.3 : 1) * (1 - e.crouch * .15), -.3, .3); }
    want = clean + e.err;
  } else if (Math.hypot(e.v.x, e.v.z) > .8) {
    e.glanceT -= dt; if (e.glanceT <= 0) { e.glanceT = rr(1.2, 3); e.glance = rr(-.9, .9); } want = Math.atan2(e.v.x, e.v.z) + e.glance * .6;
  }
  if (want !== null) e.yaw += clamp(angDiff(e.yaw, want), -df.turn * dt, df.turn * dt);
  if (clean === null || e.reloadT >= 0 || !e.canShoot) return;
  const d = e.dT, thr = Math.max(.05, Math.atan(.5 / Math.max(d, 1)) * 1.1);
  if (e.reactT < df.react || d > e.maxEng || Math.abs(angDiff(e.yaw, clean)) > thr) return;
  if (w.launch && (d < 9.5 || d > 19.5)) return;
  if (e.fireCd > 0 || e.pause > 0 || e.ammo <= 0) return;
  shoot(e);
}
function moveBot(e, dt) {
  let dx = 0, dz = 0, spd = 0, crT = 0; const t = e.tgt;
  if (e.flee) { dx = e.flee.x; dz = e.flee.z; spd = 7; }
  else if (e.st === 'push') {
    if (!e.goal && !e.holdT) pickGoal(e);
    const r = steerPath(e);
    if (r === 'arrived') { e.holdT = rr(.6, 2.2); e.goal = null; e.path = null; }
    if (e.holdT > 0) { e.holdT -= dt; spd = 0; if (e.holdT <= 0) e.holdT = 0; } else if (r === 'ok') { dx = e.sdx; dz = e.sdz; spd = 6.4; }
  } else if (e.st === 'fight' && t && !t.dead) {
    const d = e.dT || 10, ux = (t.p.x - e.p.x) / (d || 1), uz = (t.p.z - e.p.z) / (d || 1);
    if (!e.canShoot || d > e.ideal * 1.35 || d > e.maxEng * .9) {
      if (!e.goal || M.t - e.pathT > .7 || Math.hypot(e.goal.x - t.p.x, e.goal.z - t.p.z) > 3) setGoal(e, t.p.x, t.p.z);
      const r = steerPath(e); if (r === 'ok') { dx = e.sdx; dz = e.sdz; spd = e.canShoot ? 3.6 : 5.4; }
    } else if (e.keepAway && d < e.ideal * .5) { dx = -ux; dz = -uz; spd = 3.6; }
    else {
      e.strafeT -= dt; if (e.strafeT <= 0) { e.strafeT = rr(.8, 2.2); e.strafeDir = rnd() < .5 ? -1 : 1; }
      let lx = uz * e.strafeDir, lz = -ux * e.strafeDir; if (!navAt(e.p.x + lx, e.p.z + lz)) { e.strafeDir *= -1; lx = -lx; lz = -lz; }
      dx = lx; dz = lz; spd = e.cover && e.hp < 80 ? 0 : 3; if (e.cover && (e.hp < 80 || e.w.sid === 'F2')) crT = 1;
    }
  } else if (e.st === 'search') {
    const r = steerPath(e); if (r === 'ok') { dx = e.sdx; dz = e.sdz; spd = 5.2; } else if (r === 'arrived' || r === 'none') { e.st = 'push'; e.goal = null; }
  } else if (e.st === 'cover') {
    const r = steerPath(e); if (r === 'ok') { dx = e.sdx; dz = e.sdz; spd = 6.8; } else { spd = 0; crT = 1; if (e.ammo < e.w.max * .6 && e.reloadT < 0) startReload(e); }
  }
  if (e.nudge) { dx += -dz * e.nudge * .5; dz += dx * e.nudge * .5; const l = Math.hypot(dx, dz) || 1; dx /= l; dz /= l; }
  e.crouchT = crT; e.crouch = damp(e.crouch, crT, 7, dt);
  const sMax = spd * (1 - .5 * e.crouch), tx = dx * sMax, tz = dz * sMax, ax = tx - e.v.x, az = tz - e.v.z, l = Math.hypot(ax, az), step = 32 * dt;
  if (l <= step) { e.v.x = tx; e.v.z = tz; } else { e.v.x += ax / l * step; e.v.z += az / l * step; }
  e.p.x += e.v.x * dt; e.p.z += e.v.z * dt; collide(e.p, .38, 2.6);
  for (const o of M.ents) {                                                          // separación blanda entre personajes
    if (o === e || o.dead) continue; const ox = e.p.x - o.p.x, oz = e.p.z - o.p.z, od = Math.hypot(ox, oz);
    if (od < .85 && od > 1e-3) { const k = (.85 - od) * .5; e.p.x += ox / od * k; e.p.z += oz / od * k; }
  }
  e.stuckT += dt;                                                                    // atasco: si debía moverse y apenas avanza, replantea la ruta
  if (e.stuckT > 1) {
    const moved = Math.hypot(e.p.x - e.stuckX, e.p.z - e.stuckZ);
    if (spd > 1.5 && moved < .35) { e.stuckN++; e.needPath = !!e.goal; e.nudge = rr(-1, 1); if (e.stuckN > 2) { e.goal = null; e.path = null; e.stuckN = 0; if (e.st === 'push') pickGoal(e); } } else { e.stuckN = 0; e.nudge = 0; }
    e.stuckX = e.p.x; e.stuckZ = e.p.z; e.stuckT = 0;
  }
  const sp = Math.hypot(e.v.x, e.v.z);                                               // el cuerpo mira hacia donde camina (máx. 66° respecto al torso), como el jugador
  if (sp > .6) { let h = Math.atan2(e.v.x, e.v.z); if (Math.abs(angDiff(e.yaw, h)) > 1.75) h += Math.PI; e.body = dampAng(e.body, e.yaw + clamp(angDiff(e.yaw, h), -1.15, 1.15), 10, dt); }
  else { const dd = angDiff(e.yaw, e.body); e.body = dampAng(e.body, Math.abs(dd) > .95 ? e.yaw + Math.sign(dd) * .95 : e.body, 10, dt); }
}
function botTick(e, dt) {
  const w = e.w;
  e.fireCd -= dt; e.pause -= dt; e.gCd -= dt; e.sCd -= dt; e.kick = Math.max(0, e.kick - dt * 6); e.spread = Math.max(0, e.spread - dt * 1.6); e.flashT -= dt;
  if (e.gCount < 3) { e.gReg += dt; if (e.gReg >= 10) { e.gReg = 0; e.gCount++; } } if (e.sCount < 2) { e.sReg += dt; if (e.sReg >= 15) { e.sReg = 0; e.sCount++; } }
  if (e.inv > 0) e.inv -= dt;
  regen(e, dt);
  e.thinkT -= dt; if (e.thinkT <= 0) { e.thinkT = .11 + rnd() * .04; think(e); }
  if (e.vis) e.reactT += dt; else e.reactT = Math.max(0, e.reactT - dt * 1.5);
  if (e.reloadT >= 0) {                                                              // recarga con las mismas fases de sonido del jugador
    e.reloadT += dt * w.rs; const ph = e.reloadT < .25 ? 0 : e.reloadT < 1.05 ? 1 : e.reloadT < 1.3 ? 2 : 3;
    while (e.rp < ph) { e.rp++; playAt(w.sid + '_rel' + e.rp, e.p.x, e.p.z, { vol: .6 }); }
    if (e.reloadT >= 1.55) { e.reloadT = -1; e.ammo = w.max; e.rp = 0; }
  } else if (e.ammo <= 0) { if (e.vis) playAt(w.sid + '_dry', e.p.x, e.p.z, { vol: .6 }); startReload(e); }
  else if (e.ammo < w.max * .3 && !e.vis) startReload(e);
  if (MX.campaign && rescueBot(e, dt)) return;
  moveBot(e, dt); aimFire(e, dt);
}

/* ============================ REGLAS: daño, muerte, reaparición ============================ */
function pickSpawn(team) {
  const c = M.spawn[team].map(s => {
    let dng = rnd() * .15;
    for (const o of M.ents) { if (o.dead) continue; const d = Math.hypot(o.p.x - s.x, o.p.z - s.z); if (o.team !== team) dng += 1 / (1 + d * d * .01); else if (d < 1.2) dng += 5; }
    return { s, dng };
  }).sort((a, b) => a.dng - b.dng);
  return c[0].s;
}
function respawn(e) {
  const s0 = pickSpawn(e.team), s = { x: s0.x, z: s0.z, yaw: s0.yaw };
  if (MX.campaign) for (let k = 0; k < 8; k++) { const x = s0.x + rr(-3, 3), z = s0.z + rr(-3, 3); if (navAt(x, z)) { s.x = x; s.z = z; break; } }   // campaña: 25 por facción, se reparten junto al punto de aparición
  e.p.set(s.x, 0, s.z); e.v.set(0, 0, 0); e.hp = HP; e.sh = SH; e.bH.fill = e.bH.chunk = HP; e.bS.fill = e.bS.chunk = SH; e.tgp.hp = HP; e.dead = false; e.inv = INV_T; e.lastHurt = -99; e.lastAtt = null; e.yaw = e.body = s.yaw; e.cover = null; e.dwn = false; e.revived = false; e.kits = 1; e.rescuer = null; e.rt = null; e.revP = 0; dwnFxClear(e); syncKit(e);
  if (e.isPlayer) return respawnPlayer(e);
  unbake(e); setWeapon(e, pickWeaponIdx()); e.gCount = 3; e.sCount = 2; e.st = 'push'; e.goal = null; e.path = null; e.tgt = null; e.vis = false; e.reactT = 0; e.canShoot = false; e.wantThrow = null; e.holdT = 0;
  e.crouch = e.crouchT = 0; e.kick = 0; e.fireCd = rr(.2, .6); e.pause = 0; e.burst = 0; e.gCd = rr(4, 10); e.sCd = 6; e.walk = 0; e.stuckN = 0; e.nudge = 0; e.py = 1.1; e.thinkT = rnd() * .12; e.ring.visible = true; e.root.visible = true;
}
let corpseP = null;
MX.corpse = () => !!corpseP;
function respawnPlayer(e) {
  if (corpseP) { scene.remove(corpseP); corpseP = null; }
  for (const m of RL) m.visible = true; weapon.visible = true; P.dead = false;
  P.vel.set(0, 0, 0); P.aim = P.aimT = P.body = e.yaw; camLook.set(P.pos.x, 0, P.pos.z); feetInit = false;
  P.gState = 0; P.dash = 0; P.dashCD = 0; P.sld = false; P.crouchT = 0; P.crouch = 0; P.recover = 0; P.ads = 0; P.sprintLatch = false; P.hs = false;
  for (const w of WP) w.ammo = w.max; P.gCount = 3; P.sCount = 2; W.reload = -1; W.swapT = -1; W.swapTo = -1; W.rp = 0; W.ammo = cur.max;
  M.slot = M.lastPrim; if (wi !== M.slots[M.slot]) forceWeapon(M.slots[M.slot]);
  M.hurt = 0;
}
function playerCorpse(dx, dz) {
  const grp = new THREE.Group(); grp.position.set(P.pos.x, 0, P.pos.z); scene.add(grp);
  for (const m of RL) { const c = m.clone(true); c.position.copy(m.position); c.position.x -= P.pos.x; c.position.z -= P.pos.z; c.quaternion.copy(m.quaternion); c.scale.copy(m.scale); c.castShadow = true; grp.add(c); }
  const l = Math.hypot(dx, dz) || 1; grp.userData.ax = new V3(dz / l, 0, -dx / l); grp.userData.t = 0; corpseP = grp;
}
function regen(e, dt) {                                                              // tras 5 s sin daño: primero se recarga el escudo y después la vida
  if (M.t - e.lastHurt <= SH_DELAY) return;
  if (e.sh < SH) e.sh = Math.min(SH, e.sh + SH_RATE * dt); else if (e.hp < HP) { e.hp = Math.min(HP, e.hp + HP_RATE * dt); e.tgp.hp = e.hp; }
}
/* ---- campaña: abatido y reanimación (reglas del diseño: una reanimación por vida, kit de un solo uso, un solo rescatador por caído, el daño al rescatador lo interrumpe) ---- */
function syncKit(e) {                                                                // la cruz roja de la mochila se ve mientras se lleva un kit (solo campaña)
  const want = !!(MX.campaign && e.kits > 0); if (e.kitShown === want) return; e.kitShown = want;
  dress(e.isPlayer ? rig : e.R, e.team, { skin: e.isPlayer ? 0 : e.skin, kit: want });
}
const canDown = e => MX.campaign && !e.revived && !M.over && M.ents.some(o => o !== e && o.team === e.team && !o.dead && !o.dwn);   // sin aliados en pie no hay a quien esperar
function endRescueOn(t) { if (t.rescuer) { if (t.rescuer.rt === t) t.rescuer.rt = null; t.rescuer = null; } t.revP = 0; MX.reviveFx(t, null); }
function cancelRescue(by) { const t = by.rt; if (t) { if (t.rescuer === by) { t.rescuer = null; t.revP = 0; MX.reviveFx(t, null); } by.rt = null; } }
function goDown(e, dx, dz) {
  e.dwn = true; e.dwT = 0; e.dwHp = DWN_HP; e.revP = 0; e.rescuer = null; e.rt = null; e.hp = 0; e.tgp.hp = DWN_HP; e.v.set(0, 0, 0);
  if (e.isPlayer) { if (!e.fallAx) e.fallAx = new V3(); playerCorpse(dx, dz); e.fallAx.copy(corpseP.userData.ax); for (const m of RL) m.visible = false; weapon.visible = false; handMag.visible = false; flashMesh.visible = false; W.flash = 0; P.vel.set(0, 0, 0); rumble(160, .7, .5); }
  else { bake(e, dx, dz); e.ring.visible = false; e.flash.visible = false; e.wantThrow = null; e.firing = false; e.goal = null; e.path = null; e.tgt = null; }
  dwnFxMake(e);
}
function revive(t, by) {                                                           // completada: gasta el kit, vuelve con vida parcial y no puede volver a ser reanimado en esta vida
  by.kits--; syncKit(by); if (by.rt === t) by.rt = null;
  t.dwn = false; t.revived = true; t.rescuer = null; t.revP = 0; t.hp = REV_HP; t.sh = 0; t.bH.fill = t.bH.chunk = REV_HP; t.bS.fill = t.bS.chunk = 0; t.tgp.hp = REV_HP; t.inv = .8; t.lastHurt = M.t;
  dwnFxClear(t);
  if (t.isPlayer) { if (corpseP) { scene.remove(corpseP); corpseP = null; } for (const m of RL) m.visible = true; weapon.visible = true; P.vel.set(0, 0, 0); }
  else { unbake(t); t.crouch = 0; t.st = 'push'; t.goal = null; t.path = null; t.holdT = 0; }
}
function rescueBot(e, dt) {                                                        // true = el bot está ocupado con un rescate (no combate ni vaga)
  if (e.kits <= 0 || e.dwn) { cancelRescue(e); return false; }
  if (e.vis || M.t - e.lastHurt < 1.2) { cancelRescue(e); return false; }          // ve a un enemigo o le han dañado: se interrumpe (progreso perdido)
  let t = e.rt; if (t && (!t.dwn || t.dead || t.rescuer !== e)) t = e.rt = null;
  if (!t) {
    let best = 1e9; for (const o of M.ents) if (o !== e && o.dwn && !o.dead && o.team === e.team && !o.rescuer) { const d = Math.hypot(o.p.x - e.p.x, o.p.z - e.p.z); if (d < 28 && d < best) { best = d; t = o; } }
    if (!t) return false; e.rt = t; t.rescuer = e;                                 // reserva: solo un rescatador por caído
  }
  const dx = t.p.x - e.p.x, dz = t.p.z - e.p.z, d = Math.hypot(dx, dz);
  if (d > REV_R * .8) {
    if (t.revP > 0) { t.revP = 0; MX.reviveFx(t, null); }
    e.st = 'push'; e.flee = null; e.holdT = 0; if (!e.goal || Math.hypot(e.goal.x - t.p.x, e.goal.z - t.p.z) > 1) setGoal(e, t.p.x, t.p.z);
    moveBot(e, dt); return true;
  }
  e.v.set(0, 0, 0); e.yaw = e.body = Math.atan2(dx, dz); e.crouch = damp(e.crouch, 1, 7, dt); e.firing = false;      // arrodillado junto al caído
  t.revP += dt / REV_T; MX.reviveFx(t, t.revP);
  if (t.revP >= 1) revive(t, e);
  return true;
}
const KEYN = () => mode === 'pad' ? bn(BIND.reload) : 'R';                         // nombre de la tecla de reanimar/reaparecer (□ en el mando)
function rescuePlayer(pl, dt) {                                                    // el jugador mantiene □ (mando) o R/E junto a un aliado abatido
  const held = !!(MX.rev || keys.KeyE || keys.KeyR); MX.revCtx = false; let near = null, nd = REV_R;
  if (!pl.dead && !pl.dwn) for (const o of M.ents) if (o !== pl && o.dwn && !o.dead && o.team === pl.team && (!o.rescuer || o.rescuer === pl)) { const d = Math.hypot(o.p.x - pl.p.x, o.p.z - pl.p.z); if (d <= nd) { nd = d; near = o; } }
  if (pl.rt && pl.rt !== near) cancelRescue(pl);
  if (!near) return '';
  MX.revCtx = pl.kits > 0;
  if (pl.kits <= 0) return 'Sin kit de reanimación';
  if (held && M.t - pl.lastHurt > .4) { pl.rt = near; near.rescuer = pl; near.revP += dt / REV_T; MX.reviveFx(near, near.revP); if (near.revP >= 1) revive(near, pl); return 'Reanimando a ' + near.id + '…'; }
  cancelRescue(pl); return 'Mantén ' + KEYN() + ' para reanimar a ' + near.id;
}
MX.hit = (e, dmg, from, dx, dz, w, src) => {
  if (e.dead || e.inv > 0 || M.over || dmg <= 0) return;
  const hm = !!(w && from && from.isPlayer && !e.isPlayer && e.team !== from.team);   // «hit» de confirmación: solo cuando una bala del jugador entra en un rival
  if (e.dwn) {                                                                     // un abatido sigue recibiendo daño; al agotarse su vida extra muere
    e.dwHp -= dmg; e.bH.flash = 1; e.lastHurt = M.t; e.bShow = M.t; e.lastSrc = src || (w ? w.sid : null); if (from) { e.lastAtt = from; e.lastAttT = M.t; }
    if (from && (from.isPlayer || e.isPlayer)) popNum(e, dmg);
    if (e.dwHp <= 0) { endRescueOn(e); kill(e, from, dx, dz); } else if (hm) playSnd('HIT_marker', { vol: 1 });
    return;
  }
  const tot = dmg; let rest = dmg;
  if (e.sh > 0) { const a = Math.min(e.sh, rest); e.sh -= a; rest -= a; e.bS.flash = 1; }                  // el escudo absorbe primero; el sobrante pasa a la vida en el mismo golpe
  if (rest > 0) { e.hp -= rest; e.bH.flash = 1; }
  e.tgp.hp = e.hp; e.lastHurt = M.t; e.bShow = M.t; e.lastSrc = src || (w ? w.sid : null);
  if (from && (from.isPlayer || e.isPlayer)) popNum(e, tot); if (from) { e.lastAtt = from; e.lastAttT = M.t; }
  if (e.isPlayer) { M.hurt = Math.min(1, M.hurt + dmg / 45); P.shake = Math.max(P.shake, .06 + Math.min(.14, dmg * .004)); rumble(70, .55, .4); }
  if (e.hp <= 0) { if (canDown(e)) goDown(e, dx, dz); else kill(e, from, dx, dz); } else if (hm) playSnd('HIT_marker', { vol: 1 });   // si la bala mata, suena solo el sonido de baja (HIT_kill)
};
function kill(v, killer, dx, dz) {
  if (!killer && v.lastAtt && M.t - v.lastAttT < 8 && v.lastAtt.team !== v.team) killer = v.lastAtt;     // fuego o explosión sin autor claro: cuenta quien le hirió hace poco
  const wasDown = !!v.dwn; if (wasDown) { v.dwn = false; dwnFxClear(v); }
  v.dead = true; v.deaths++; v.hp = 0; v.tgp.hp = 0; v.respT = RESPAWN + (v.isPlayer ? 0 : rnd() * .8); v.inv = 0;
  addFeed(killer && killer !== v ? killer : null, v, v.lastSrc);
  if (killer && killer !== v && killer.team !== v.team) { killer.kills++; M.score[killer.team]++; if (killer.isPlayer) playSnd('HIT_kill') || playSnd('HIT_marker'); }          // bajas a compañeros y suicidios no puntúan
  for (let i = 0; i < 8; i++) spawn('red', _kp.set(v.p.x, .9, v.p.z), _kv.set((Math.random() - .5) * 4 + dx * 2, 1 + Math.random() * 3, (Math.random() - .5) * 4 + dz * 2), .5, .04, .04, .04, true, 8);
  if (v.isPlayer) { P.dead = true; if (!corpseP) playerCorpse(dx, dz); for (const m of RL) m.visible = false; weapon.visible = false; handMag.visible = false; flashMesh.visible = false; W.flash = 0; P.vel.set(0, 0, 0); rumble(200, .8, .6); }
  else { if (wasDown) v.deadT = .55; else bake(v, dx, dz); v.ring.visible = false; v.flash.visible = false; v.wantThrow = null; }
  if (!MX.campaign && (M.score[0] >= GOAL || M.score[1] >= GOAL)) endMatch(M.score[0] >= GOAL ? 0 : 1);
}
const _kp = new V3(), _kv = new V3();
MX.explosion = (p, R, sc, own) => {
  if (MX.zom) MX.zom.blast(p, R, own === undefined ? null : (own || MX.pl));
  const killer = own === undefined ? null : (own || MX.pl);
  for (const e of M.ents) {
    if (e.dead || e.inv > 0) continue; const dx = e.p.x - p.x, dz = e.p.z - p.z, d = Math.hypot(dx, dz); if (d >= R) continue;
    let dmg = 150 * sc * (1 - d / R); if (wallBetween(p.x, p.z, e.p.x, e.p.z)) dmg *= .15; if (dmg < 1) continue;
    if (!e.isPlayer) { e.v.x += dx / (d || 1) * 6; e.v.z += dz / (d || 1) * 6; }
    MX.hit(e, dmg, killer, dx / (d || 1), dz / (d || 1));
  }
};
MX.fireDmg = (f, dt) => { for (const e of M.ents) if (!e.dead && e.inv <= 0 && Math.hypot(e.p.x - f.x, e.p.z - f.z) < f.r) MX.hit(e, 16 * dt, null, 0, 0); };
MX.propGone = p => { const i = M.props.indexOf(p); if (i >= 0) M.props.splice(i, 1); M.propQ.push({ t: M.t + 40, spec: p.spec }); };
MX.frozen = () => M.built && (M.ents[0].dead || M.ents[0].dwn || M.over);

/* ============================ HUD ============================ */
const hud = document.createElement('div'); hud.style.cssText = 'position:fixed;inset:0;pointer-events:none;z-index:2';
hud.innerHTML = '<div id="mxScore" style="position:absolute;top:max(10px,env(safe-area-inset-top));left:50%;transform:translateX(-50%);display:flex;gap:14px;align-items:baseline;white-space:nowrap;font-weight:700;font-size:clamp(15px,4.2vmin,22px);text-shadow:0 2px 8px #000;background:#0c1018aa;padding:4px 18px;border-radius:10px;font-variant-numeric:tabular-nums"><span id="mxA" style="color:#4aa3ff">AZUL 0</span><span style="opacity:.5;font-size:12px;font-weight:500">/ 100</span><span id="mxB" style="color:#ff5a4a">0 ROJO</span></div>' +
  '<div id="mxHurt" style="position:absolute;inset:0;opacity:0;background:radial-gradient(ellipse at center,transparent 45%,#c01818dd 100%)"></div><div id="mxDead" style="position:absolute;inset:0;opacity:0;background:#0c1018"></div>';
hud.style.display = 'none'; document.body.appendChild(hud);
const mxMsg = document.createElement('div'); mxMsg.style.cssText = 'position:absolute;left:50%;bottom:calc(120px + env(safe-area-inset-bottom));transform:translateX(-50%);display:none;padding:6px 14px;border-radius:8px;background:#0c1018c8;box-shadow:0 0 0 1px #ffb02099;color:#ffe2a0;font:700 14px system-ui,sans-serif;letter-spacing:.04em;white-space:nowrap;pointer-events:none'; hud.appendChild(mxMsg);
/* ---- barras profesionales: escudo + vida con drenaje suave, trozo de daño naranja que se vacía tras una espera, destello, pulso, color por estado ---- */
const SEGN = 5;                                                                       // el escudo se dibuja en 5 segmentos (10 puntos cada uno)
{ const st = document.createElement('style'); st.textContent = '@keyframes mxPulse{0%,100%{box-shadow:0 0 6px #ff3a2a66,inset 0 0 0 1px #ff6a5acc}50%{box-shadow:0 0 16px #ff3a2add,inset 0 0 0 1px #ff6a5a}}.mxlow{animation:mxPulse .9s ease-in-out infinite}@media (max-height:520px){.mxpb .mxhp{font-size:22px !important}}'; document.head.appendChild(st); }
function mkBar(w, h, num) {                                                           // num = barra grande del jugador (con números); si no, barra pequeña sobre la cabeza
  const mk = (css, par) => { const d = document.createElement('div'); d.style.cssText = css; if (par) par.appendChild(d); return d; };
  const el = mk('position:absolute;width:' + w + 'px;transform-origin:50% 100%;will-change:transform,opacity;filter:drop-shadow(0 2px 5px #000a)');
  const b = { el, w, segs: [], num };
  if (num) {
    const top = mk('display:flex;align-items:baseline;justify-content:flex-start;gap:10px;margin-bottom:4px;font-variant-numeric:tabular-nums', el);
    b.hpT = mk('font:800 30px/1 system-ui,sans-serif;letter-spacing:-.02em;color:#fff;text-shadow:0 2px 6px #000', top); b.hpT.className = 'mxhp';
    b.hpT.innerHTML = '<span></span><b style="font-size:11px;opacity:.55;font-weight:700;margin-left:3px;letter-spacing:.1em">HP</b>'; b.hpN = b.hpT.firstChild;
    b.shT = mk('font:700 13px/1 system-ui,sans-serif;color:#5ac8ff;display:flex;gap:4px;align-items:center;text-shadow:0 1px 4px #000', top);
    b.shT.innerHTML = '<svg viewBox="0 0 12 12" width="12" height="12" style="fill:#5ac8ff"><path d="M6 0l5 2v4c0 3-2.2 4.8-5 6C3.2 10.8 1 9 1 6V2z"/></svg><span></span>';
    b.shN = b.shT.lastChild;
    b.kitT = mk('font:700 13px/1 system-ui,sans-serif;color:#fff;display:none;gap:4px;align-items:center;text-shadow:0 1px 4px #000', top); b.kitT.innerHTML = '<span style="color:#ff5a4a;font-size:15px">✚</span><span></span>'; b.kitN = b.kitT.lastChild;
  } else b.pip = mk('width:5px;height:5px;margin:0 auto 3px;transform:rotate(45deg);box-shadow:0 0 0 1px #000a;background:#888', el);
  b.sRow = mk('display:flex;gap:' + (num ? 3 : 2) + 'px;margin-bottom:' + (num ? 3 : 2) + 'px', el);
  for (let k = 0; k < SEGN; k++) {
    const sp = mk('flex:1;height:' + (num ? 5 : 2) + 'px;transform:skewX(-22deg);background:#0b0f18b8;box-shadow:inset 0 0 0 1px #ffffff1a;position:relative;overflow:hidden', b.sRow);
    const c = mk('position:absolute;inset:0;background:#ff9440;transform-origin:0 50%', sp), f = mk('position:absolute;inset:0;background:linear-gradient(#9be4ff,#3aa9e6);transform-origin:0 50%', sp);
    b.segs.push({ c, f });
  }
  b.hb = mk('position:relative;height:' + h + 'px;transform:skewX(-22deg);background:#0b0f18c8;box-shadow:inset 0 0 0 1px #ffffff22,0 0 0 1px #000a;overflow:hidden', el);
  b.Hc = mk('position:absolute;left:0;top:0;height:100%;width:100%;transform-origin:0 50%;background:#ff9440', b.hb);
  b.Hf = mk('position:absolute;left:0;top:0;height:100%;width:100%;transform-origin:0 50%', b.hb);
  mk('position:absolute;inset:0;background:linear-gradient(#ffffff55 0,#ffffff00 45%,#00000030 100%)', b.Hf);
  if (num) for (const q of [25, 50, 75]) mk('position:absolute;top:0;bottom:0;width:1px;background:#0009;left:' + q + '%', b.hb);
  hud.appendChild(el); return b;
}
function stepBar(o, tgt, dt) {                                                       // o = {fill, chunk, wait, flash}
  if (tgt < o.fill - .4) o.wait = .55;
  o.fill = damp(o.fill, tgt, tgt < o.fill ? 16 : 7, dt);                              // drenaje suave (y relleno suave al curar)
  if (o.wait > 0) o.wait -= dt; else o.chunk = damp(o.chunk, o.fill, 5, dt);
  if (o.chunk < o.fill) o.chunk = o.fill; o.flash = Math.max(0, (o.flash || 0) - dt * 5);
}
function drawBar(b, e, dt) {
  stepBar(e.bH, e.hp, dt); stepBar(e.bS, e.sh, dt);
  const sv = e.bS.fill / SH * SEGN, sc = e.bS.chunk / SH * SEGN, sb = 'brightness(' + (1 + (e.bS.flash || 0) * 1.6) + ')';
  b.segs.forEach((g, k) => { g.c.style.transform = 'scaleX(' + clamp(sc - k, 0, 1) + ')'; g.f.style.transform = 'scaleX(' + clamp(sv - k, 0, 1) + ')'; g.f.style.filter = sb; });
  b.Hc.style.transform = 'scaleX(' + clamp(e.bH.chunk / HP, 0, 1) + ')'; b.Hf.style.transform = 'scaleX(' + clamp(e.bH.fill / HP, 0, 1) + ')';
  b.Hf.style.background = e.hp > 60 ? '#6dff9a' : e.hp > 30 ? '#ffd24a' : '#ff5a4a'; b.Hf.style.filter = 'brightness(' + (1 + (e.bH.flash || 0) * 1.6) + ')';
  const low = e.hp > 0 && e.hp < 30; if (low !== b.low) { b.low = low; b.hb.classList.toggle('mxlow', low); }
  if (e.sh <= 0 && b.pSh > 0) b.brk = 1; b.pSh = e.sh; b.brk = Math.max(0, (b.brk || 0) - dt * 3); b.sRow.style.filter = b.brk > .01 ? 'brightness(' + (1 + b.brk * 3) + ')' : '';   // escudo roto: destello breve
  const fl = Math.max(e.bH.flash || 0, e.bS.flash || 0), sh = fl * 3 * (b.num ? 1 : .5);
  b.el.dataset.s = ((1 + fl * .25) + '|' + (fl > .1 ? (Math.random() - .5) * sh * 2 : 0));
  if (b.num) { b.kitT.style.display = MX.campaign ? 'flex' : 'none'; if (MX.campaign) { b.kitN.textContent = e.kits; b.kitT.style.opacity = e.kits > 0 ? 1 : .35; }
    b.shN.textContent = Math.ceil(Math.max(0, e.sh)); b.shT.style.opacity = e.sh > .5 ? 1 : .35; b.hpN.textContent = Math.ceil(Math.max(0, e.hp)); b.hpT.style.color = low ? '#ff6a5a' : '#fff'; }
  else {
    if (b.team !== e.team) { b.team = e.team; b.pip.style.background = teamColor(e.team); }
    const age = M.t - (e.bShow || -99); b.el.style.opacity = clamp(age / .1, 0, 1) * clamp((4 - age) / .6, 0, 1);               // aparece y se desvanece
  }
}
function placeBar(b, x, y, fl) { const [sc, jx] = b.el.dataset.s.split('|'); b.el.style.transform = 'translate(' + (x - b.w / 2 + +jx) + 'px,' + y + 'px) translateY(-100%) scale(' + sc + ')'; b.el.style.display = 'block'; }
const PB = mkBar(210, 12, true); PB.num = true; PB.el.className = 'mxpb'; PB.el.style.transformOrigin = '0% 100%'; MX.PB = PB;
/* ---- kill feed (arriba a la derecha, bajo los FPS): quién mató a quién, con arma; las tuyas llevan borde dorado y las que te matan, rojo. Se desvanece solo y no recibe toques ---- */
{ const st = document.createElement('style'); st.textContent = '#mxFeed{right:var(--r);top:calc(var(--t) + 52px)}@media (orientation:landscape) and (max-height:520px){#mxFeed{top:calc(var(--t) + 30px) !important;font-size:11px !important}}'; document.head.appendChild(st); }
const feedEl = document.createElement('div'); feedEl.id = 'mxFeed'; feedEl.style.cssText = 'position:absolute;display:flex;flex-direction:column;align-items:flex-end;gap:3px;font:700 12px system-ui,sans-serif;pointer-events:none;opacity:.96'; hud.appendChild(feedEl);
/* Filas reutilizadas (sin crear ni destruir DOM por baja) y animadas por el compositor con la Web Animations API (sólo opacity/transform en una capa propia):
   el navegador no vuelve a pintar las sombras difuminadas de cada fila en cada fotograma, que es lo que bajaba los FPS cuando caían muchas bajas seguidas. */
const FEED_MAX = 5, FEED_T = 5000, FEED = [], FEED_POOL = [];
const FEED_KF = [{ opacity: 0, transform: 'translateX(24px)', offset: 0 }, { opacity: 1, transform: 'none', offset: .03 }, { opacity: 1, transform: 'none', offset: .88 }, { opacity: 0, transform: 'none', offset: 1 }];
for (let i = 0; i < FEED_MAX; i++) {
  const d = document.createElement('div'), k = document.createElement('span'), t = document.createElement('i'), v = document.createElement('span');
  d.style.cssText = 'display:none;align-items:center;gap:7px;padding:3px 9px;border-radius:6px;background:#0c1018bd;white-space:nowrap;font-variant-numeric:tabular-nums;will-change:transform,opacity;backface-visibility:hidden';
  t.style.cssText = 'font-style:normal;font-weight:600;font-size:10px;letter-spacing:.06em;padding:1px 5px;border-radius:4px;background:#ffffff1c;opacity:.8';
  d.append(k, t, v); feedEl.appendChild(d); FEED_POOL.push({ d, k, t, v, a: null });
}
function feedHide(r) { if (r.a) { r.a.onfinish = null; r.a.cancel(); r.a = null; } r.d.style.display = 'none'; const i = FEED.indexOf(r); if (i >= 0) FEED.splice(i, 1); }
function addFeed(killer, v, src) {
  const col = e => teamColor(e.team), nm = e => e.isPlayer ? 'TÚ' : e.id;
  let r = FEED_POOL.find(x => !FEED.includes(x)); if (!r) { r = FEED[0]; feedHide(r); }                  // sin hueco libre: se reutiliza la fila más antigua
  const ring = killer && killer.isPlayer ? '#ffd24acc' : v.isPlayer ? '#ff5a4acc' : '#ffffff14';
  r.d.style.boxShadow = '0 0 0 1px ' + ring + ',0 2px 8px #0008';
  if (killer) { r.k.style.display = ''; r.k.style.color = col(killer); r.k.textContent = nm(killer); r.t.style.display = ''; r.t.textContent = src || '✸'; }
  else if (src === 'ZOM') { r.k.style.display = ''; r.k.style.color = '#9fd37a'; r.k.textContent = 'ZOMBI'; r.t.style.display = 'none'; }
  else { r.k.style.display = 'none'; r.t.style.display = ''; r.t.textContent = '✸'; }
  r.v.style.color = col(v); r.v.textContent = nm(v);
  r.d.style.display = 'flex'; feedEl.appendChild(r.d); FEED.push(r);                                  // la más reciente abajo
  if (r.d.animate) { r.a = r.d.animate(FEED_KF, { duration: FEED_T, easing: 'linear', fill: 'both' }); r.a.onfinish = () => feedHide(r); }
  else r.to = setTimeout(() => feedHide(r), FEED_T);
}
function updFeed() { }
function clearFeed() { for (const r of FEED.slice()) feedHide(r); }
/* ---- números de daño: aparecen, suben y se desvanecen; el tamaño crece con el daño y cada uno sale hacia un lado distinto ---- */
const NUMS = []; let numSide = 1; const _np = new V3();
function popNum(e, dmg) {
  const d = document.createElement('div'), big = clamp(.8 + dmg / 60, .8, 1.9), mine = e.isPlayer;
  d.style.cssText = 'position:absolute;left:0;top:0;font:800 ' + Math.round(18 * big) + 'px sans-serif;text-shadow:0 2px 6px #000,0 0 2px #000;white-space:nowrap;color:' + (mine ? '#ff6a5a' : '#ffb347');
  d.textContent = Math.round(dmg); hud.appendChild(d); numSide = -numSide;
  NUMS.push({ d, e, t: 0, ox: numSide * (14 + Math.random() * 16), wx: e.p.x, wz: e.p.z, mine });
}
MX.popNum = popNum;
function updNums(dt) {
  for (let i = NUMS.length - 1; i >= 0; i--) {
    const n = NUMS[i]; n.t += dt; if (n.t > 1) { n.d.remove(); NUMS.splice(i, 1); continue; }
    _np.set(n.mine ? P.pos.x : n.e.p.x, 2.1, n.mine ? P.pos.z : n.e.p.z).project(camera);
    const x = (_np.x * .5 + .5) * innerWidth + n.ox * smooth(n.t / .8), y = (-_np.y * .5 + .5) * innerHeight - 70 * smooth(n.t / .9) * (n.mine ? .6 : 1) - 8;
    const pop = n.t < .12 ? .6 + n.t / .12 * .6 : 1.2 - Math.min(.2, (n.t - .12) * .8);
    n.d.style.transform = 'translate(' + x + 'px,' + y + 'px) translate(-50%,-50%) scale(' + pop + ')'; n.d.style.opacity = n.t < .55 ? 1 : 1 - (n.t - .55) / .45;
  }
}
const endEl = document.createElement('div'); endEl.style.cssText = 'position:fixed;inset:0;z-index:7;display:none;align-items:center;justify-content:center;background:#0c1018d9;font-family:inherit';
document.body.appendChild(endEl);
function endMatch(win) {
  M.over = true; M.win = win; M.endT = 0;
  const row = e => '<tr' + (e.isPlayer ? ' style="color:#ffd24a;font-weight:700"' : '') + '><td>' + (e.isPlayer ? 'TÚ' : e.id) + '</td><td style="text-align:right">' + e.kills + '</td><td style="text-align:right">' + e.deaths + '</td></tr>';
  const tab = t => '<table style="border-collapse:collapse;min-width:140px;font-size:14px"><tr style="opacity:.6"><td>' + ['AZUL', 'ROJO'][t] + '</td><td style="text-align:right;padding-left:14px">B</td><td style="text-align:right;padding-left:14px">M</td></tr>' + M.ents.filter(e => e.team === t).map(row).join('') + '</table>';
  endEl.innerHTML = '<div style="background:#151b28;border:1px solid #2b3650;border-radius:14px;padding:22px 30px;text-align:center"><div style="font-size:26px;font-weight:800;color:' + (win === 0 ? '#4aa3ff' : '#ff5a4a') + '">' + (win === 0 ? 'VICTORIA' : 'DERROTA') + '</div>' +
    '<div style="font-size:20px;margin:6px 0 14px;font-variant-numeric:tabular-nums"><span style="color:#4aa3ff">AZUL ' + M.score[0] + '</span> · <span style="color:#ff5a4a">' + M.score[1] + ' ROJO</span></div>' +
    '<div style="display:flex;gap:30px;justify-content:center">' + tab(0) + tab(1) + '</div><button id="mxRe" style="margin-top:16px;font-size:15px;padding:10px 26px;border-radius:8px;border:0;background:#ff9440;color:#111;font-weight:700;pointer-events:auto;cursor:pointer">REVANCHA</button></div>';
  endEl.style.display = 'flex'; $('mxRe').addEventListener('click', () => MX.restart()); $('mxRe').addEventListener('touchstart', e => { e.preventDefault(); MX.restart(); });
}
MX.restart = () => {
  if (!M.over) return; clearFeed(); M.over = false; M.win = -1; M.score = [0, 0]; endEl.style.display = 'none';
  for (const p of M.props.slice()) { scene.remove(p.g); const i = boxes.indexOf(p.box); if (i >= 0) boxes.splice(i, 1); const j = props.indexOf(p); if (j >= 0) props.splice(j, 1); } M.props.length = 0; M.propQ.length = 0;
  for (const s of M.specs) placeProp(s, false);
  clouds.length = 0; FIRES.length = 0; for (const g of grens) { g.on = false; g.m.visible = false; } for (const b of BUL) { b.on = false; b.m.visible = false; }
  for (const e of M.ents) { e.kills = e.deaths = 0; e.dead = true; respawn(e); } navBuild();
};

/* ============================ ARRANQUE Y BUCLE ============================ */
const RL = Object.values(rig).flat();
MX.start = () => {
  buildMap();
  const pl = makeEnt(0, 0, true); MX.pl = pl; M.ents.push(pl);
  const teams = MX.campaign ? 4 : 2;
  const members = MX.campaign ? clamp(+new URLSearchParams(location.search).get('bots') || 25, 4, 25) : 6;   // campaña: 25 combatientes por facción (el jugador cuenta dentro de Azul); ?mapa=4&bots=N lo reduce para pruebas
  M.score = Array(teams).fill(0);
  for (let team = 0; team < teams; team++) {
    for (let n = team === 0 ? 1 : 0; n < members; n++) M.ents.push(makeEnt(team, n, false));
  }
  if (MX.campaign) $('mxScore').textContent = 'Campaña · Facción azul';
  for (const g of grens) g.own = null; while (grens.length < 14) { const m = new THREE.Mesh(geoBall, grens[0].m.material.clone()); m.scale.set(.09, .09, .09); m.castShadow = true; m.visible = false; scene.add(m); grens.push({ m, p: new V3(), v: new V3(), fuse: 0, on: false, own: null }); }
  M.built = true; MX.on = true; hud.style.display = 'block'; if (MX.zom && MX.campaign) MX.zom.init();
  for (const e of M.ents) respawn(e);
  forceWeapon(M.slots[0]);
};
MX.placeBars = () => {                                                              // se llama tras mover la cámara: así la barra no se retrasa un fotograma respecto al personaje
  camera.updateMatrixWorld();
  for (const e of M.ents) { if (e.isPlayer || !e.barOn) continue; const hp = e.R.head.position; _kp.set(hp.x, hp.y + .13 + .5, hp.z).project(camera); placeBar(e.bar, (_kp.x * .5 + .5) * innerWidth, (-_kp.y * .5 + .5) * innerHeight); }   // base de la barra 0,5 m sobre la coronilla (igual que los zombis)
};
MX.update = dt => {
  SIGHT.t -= dt; if (SIGHT.t <= 0) { SIGHT.t = .5; sightUpdate(); }
  if (!M.built) return; dt = Math.min(dt, .05); M.t += dt; M.budget = 2;
  M.navT -= dt; if (M.navT <= 0) { M.navT = .5; navBuild(); }
  for (let i = M.propQ.length - 1; i >= 0; i--) { const q = M.propQ[i]; if (M.t >= q.t) { if (placeProp(q.spec, true)) M.propQ.splice(i, 1); else q.t = M.t + 4; } }
  armoryTick(dt);
  if (MX.zom && MX.campaign) MX.zom.update(dt);
  const pl = M.ents[0];
  if (pl.dead || pl.dwn) {                                                           // caído (muerto o abatido): cuerpo que cae; el muerto cuenta atrás para reaparecer
    if (pl.dead) pl.respT -= dt; else { pl.dwT += dt; dwnFxTick(pl); if (MX.campaign && pl.dwT >= DWN_T && !M.over) { endRescueOn(pl); kill(pl, pl.lastAtt && M.t - pl.lastAttT < 40 ? pl.lastAtt : null, 0, 1); } }
    for (const m of RL) m.visible = false; weapon.visible = false; handMag.visible = false; flashMesh.visible = false;
    if (corpseP) { corpseP.userData.t += dt; corpseP.quaternion.setFromAxisAngle(corpseP.userData.ax, smooth(corpseP.userData.t / .55) * (pl.dwn ? 1.3 : 1.45)); corpseP.position.y = pl.dwn ? 0 : -smooth((corpseP.userData.t - 2.3) / .7) * .6; }
    if (pl.dead && pl.respT <= 0 && !M.over) respawn(pl);
  } else {
    if (pl.inv > 0) { pl.inv -= dt; const on = Math.floor(M.t * 14) % 2 === 0 || pl.inv <= 0; for (const m of RL) m.visible = on; }
    regen(pl, dt);
  }
  pl.yaw = P.aim;
  let msg = '';
  if (MX.campaign) {
    msg = rescuePlayer(pl, dt);
    if (pl.dwn) {                                                                  // abatido: espera ayuda o mantén □ (R) para volver a tu refugio sin esperar
      const held = !!(MX.rev || keys.KeyE || keys.KeyR); pl.surT = held ? (pl.surT || 0) + dt : Math.max(0, (pl.surT || 0) - dt * 2);
      msg = pl.surT > .05 ? 'Reapareciendo en tu refugio… ' + Math.min(100, Math.round(pl.surT / SUR_T * 100)) + ' %' : 'ABATIDO · ' + Math.max(0, Math.ceil(DWN_T - pl.dwT)) + ' s · espera ayuda o mantén ' + KEYN() + ' para reaparecer';
      if (pl.surT >= SUR_T) { pl.surT = 0; endRescueOn(pl); kill(pl, null, 0, 1); pl.respT = 0; }   // se rinde: cuenta como baja y reaparece en su refugio al instante
    } else pl.surT = 0;
  }
  mxMsg.textContent = msg; mxMsg.style.display = msg ? 'block' : 'none'; MX.rev = false;
  MX.foes.length = 0;
  for (const e of M.ents) {
    if (e.isPlayer) continue;
    if (e.dead) {
      e.respT -= dt; e.deadT += dt; const k = smooth(e.deadT / .55); e.root.quaternion.setFromAxisAngle(e.fallAx, k * 1.45); e.root.position.y = -smooth((e.deadT - 2.3) / .7) * .6;
      if (e.respT <= 0 && !M.over) respawn(e);
    } else if (e.dwn) {
      dwnTick(e, dt); e.v.set(0, 0, 0); e.ring.visible = false; e.flash.visible = false;                  // abatido: no actúa, queda tumbado con su marcador
    } else {
      if (!M.over) botTick(e, dt); else { e.v.set(0, 0, 0); e.fireCd -= dt; }
      e.ring.visible = false;                                                      // sin anillos bajo los personajes: la facción se reconoce por los colores del equipo
      e.flash.visible = e.flashT > 0 && !!e.gun; if (e.flash.visible) { const dx = Math.sin(e.yaw), dz = Math.cos(e.yaw); e.flash.position.set(e.p.x + dx * (.7 + e.w.muz * .3), 1.1 - e.crouch * .25, e.p.z + dz * (.7 + e.w.muz * .3)); e.flash.quaternion.setFromUnitVectors(UP, _kv.set(dx, 0, dz)); }
    }
    const near = Math.hypot(e.p.x - P.pos.x, e.p.z - P.pos.z) < 32, hid = e.team !== 0 && hiddenBySmoke(e.p.x, e.p.z);
    e.root.visible = near && !hid && (!e.dead || e.root.position.y > -.55); e.ring.visible = e.ring.visible && near && !hid;
    if (!e.dead && !e.dwn && e.root.visible) poseBot(e, dt);
    if (!e.dead && e.root.visible && M.t - (e.bShow || -99) < 4) { drawBar(e.bar, e, dt); e.barOn = true; }          // barra sobre la cabeza: solo tras recibir daño (se coloca al final del fotograma, con la cámara ya movida: MX.placeBars)
    else { e.barOn = false; e.bar.el.style.display = 'none'; }
    if (e.team !== pl.team && !e.dead) { e.tgp.g.visible = e.root.visible; MX.foes.push(e.tgp); }
  }
  /* HUD */
  if (!MX.campaign) { $('mxA').textContent = 'AZUL ' + M.score[0]; $('mxB').textContent = M.score[1] + ' ROJO'; }
  drawBar(PB, pl, dt); PB.el.style.transform = 'scale(' + (PB.el.dataset.s.split('|')[0]) + ') translateX(' + PB.el.dataset.s.split('|')[1] + 'px)';
  updNums(dt); updFeed(dt);
  M.hurt = Math.max(0, M.hurt - dt * 1.6); $('mxHurt').style.opacity = clamp(M.hurt, 0, 1) * .85 + (pl.hp < 30 && !pl.dead ? .15 : 0);
  $('mxDead').style.opacity = pl.dead ? Math.min(.55, (RESPAWN - pl.respT) * 1.2) : pl.dwn ? .22 : 0;
  if (M.over) { M.endT += dt; const g = getPad(); if (g && M.endT > 1.5 && g.buttons[0] && g.buttons[0].pressed) MX.restart(); }
};
})();
