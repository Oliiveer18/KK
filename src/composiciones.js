"use strict";
/* ===================== COMPOSICIONES DE OBJETOS (bloques ya montados para los mapas) =====================
   Cada composición añade objetos a los datos de un mapa (D.objects / D.buildings) sin solapes: comprueba su propia huella y la de todo lo ya colocado (D.occ).
   Se usan desde src/mapa_distrito.js:  COMP.jam(D, {...})  COMP.barricade(D, {...})  COMP.checkpoint(D, {...})  COMP.towerPost(D, {...})  COMP.scatter(D, {...})
   COMP.street(D, {...})  COMP.storefront(D, {...})  COMP.camp(D, {...})  COMP.yard(D, {...}). Todas devuelven cuántos objetos pusieron y son deterministas (semilla).
   Usan MAPA.put (placeObject + los 8 objetos de siempre) y MAPA.fp (medidas). Giros: múltiplos de π/2 (la colisión es una caja alineada con los ejes). */
(function () {
const COMP = window.COMP = { used: new Set() };
const rngOf = s => { let a = (s || 1) >>> 0; return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; };
const snap = g => Math.round((g || 0) / (Math.PI / 2)) * (Math.PI / 2), PI2 = Math.PI / 2;
function occOf(D) { return D.occ || (D.occ = []); }
/* intenta colocar un objeto: devuelve true si cabe (no solapa con nada de D.occ) y lo añade */
function put(D, t, x, z, g, o, pad) {
  g = snap(g); const f = MAPA.fp(t, g); if (!f) return false; pad = pad === undefined ? .15 : pad;
  const hx = f.hx + pad, hz = f.hz + pad, occ = occOf(D);
  if (Math.abs(x) + f.hx > D.half - .5 || Math.abs(z) + f.hz > D.half - .5) return false;
  for (const b of occ) if (Math.abs(b.x - x) < b.hx + hx && Math.abs(b.z - z) < b.hz + hz) return false;
  occ.push({ x, z, hx: f.hx, hz: f.hz, t }); (D.objects || (D.objects = [])).push({ t, x, z, g, o }); COMP.used.add(t); return true;
}
COMP.put = put;
/* reserva la huella de algo ya colocado (edificios, calles de rejilla no: sólo objetos sólidos) */
COMP.reserve = (D, x, z, hx, hz, t) => occOf(D).push({ x, z, hx, hz, t: t || 'reserva' });
/* convierte una calle (curva o de rejilla) en puntos remuestreados cada 1 m con tangente */
function roadPts(r) { if (r._p1) return r._p1; const pts = r.pts || (r.axis === 'x' ? [[r.a0, r.c], [r.a1, r.c]] : [[r.c, r.a0], [r.c, r.a1]]); return r._p1 = MAPA.pathPts(pts, 1); }
COMP.roadPts = roadPts;
/* punto de la calle más cercano a (x,z): { s (índice en metros), q (punto con tangente), d (distancia) } */
COMP.nearest = function (r, x, z) { const P = roadPts(r); let bi = 0, bd = 1e9; for (let i = 0; i < P.length; i++) { const d = (P[i].x - x) * (P[i].x - x) + (P[i].z - z) * (P[i].z - z); if (d < bd) { bd = d; bi = i; } } return { s: bi, q: P[bi], d: Math.sqrt(bd) }; };
/* la calle (de D.roads) más cercana a un punto */
COMP.roadNear = function (D, x, z, maxD) { let b = null; for (const r of D.roads) { if (!r.pts) continue; const n = COMP.nearest(r, x, z); if (n.d <= (maxD || 60) && (!b || n.d < b.d)) b = Object.assign({ road: r }, n); } return b; };
const yawAlong = (dx, dz) => Math.abs(dx) >= Math.abs(dz) ? 0 : PI2;

/* atasco: coches abandonados en sus carriles, alineados con la calle (un sentido por carril); a veces dos juntos y huecos para poder pasar. Restos sólo en el bordillo o la acera. */
COMP.jam = function (D, o) {
  const R = rngOf(o.seed), P = roadPts(o.road), w = o.road.w, s0 = o.s0 || 0, s1 = Math.min(o.s1 === undefined ? P.length - 1 : o.s1, P.length - 1), gap = o.gap || [7, 15];
  const ex = o.extras === undefined ? .2 : o.extras, extra = o.types || ['dumpster', 'barrel', 'wheelie', 'crateS'];
  let n = 0;
  for (let s = s0; s < s1; s += gap[0] + R() * (gap[1] - gap[0])) {
    const q = P[Math.floor(s)], nx = -q.dz, nz = q.dx, lane = (R() < .5 ? -1 : 1), lat = lane * (w * .25 + (R() - .5) * .5), g = yawAlong(q.dx, q.dz) + (lane > 0 ? 0 : Math.PI);
    if (put(D, o.car || 'car', q.x + nx * lat, q.z + nz * lat, g)) n++;
    if (R() < ex) { const side = R() < .5 ? -1 : 1, t = extra[Math.floor(R() * extra.length)], f = MAPA.fp(t, 0), dep = Math.abs(q.dx) >= Math.abs(q.dz) ? f.hz : f.hx, off = w / 2 + .5 + dep; if (put(D, t, q.x + nx * side * off, q.z + nz * side * off, 0)) n++; }
  }
  return n;
};
/* barricada: tramos de muro con un portón en el centro (nivel 1 madera, 2 piedra, 3 hierro), sacos y cajas en los extremos y cobertura detrás */
COMP.barricade = function (D, o) {
  const R = rngOf(o.seed), lv = o.level || 1, X = (o.axis || 'x') === 'x', len = o.len || 14, g = X ? 0 : PI2, gate = 'gate' + lv, wall = 'wall' + lv, gl = MAPA.fp(gate, g), wl = MAPA.fp(wall, g);
  const gw = (X ? gl.hx : gl.hz) * 2, ww = (X ? wl.hx : wl.hz) * 2, k = Math.max(0, Math.floor((len - gw) / (2 * ww))); let n = 0;
  const at = a => X ? [o.x + a, o.z] : [o.x, o.z + a];
  { const [px, pz] = at(0); if (put(D, gate, px, pz, g, { abierto: !!o.gateOpen, fac: o.fac })) n++; }
  for (let i = 0; i < k; i++) for (const sg of [-1, 1]) { const a = sg * (gw / 2 + ww / 2 + i * ww), [px, pz] = at(a); if (put(D, wall, px, pz, g, { fac: o.fac }, 0)) n++; }
  const end = gw / 2 + k * ww + 1.4, side = o.side || (R() < .5 ? -1 : 1);
  for (const sg of [-1, 1]) { const [px, pz] = at(sg * end); if (put(D, R() < .5 ? 'sandbags' : 'blocks', px, pz, g)) n++; if (put(D, 'crate', X ? px : px + side * 1.6, X ? pz + side * 1.6 : pz, 0)) n++; }
  if (o.cover !== false) for (const a of [-gw * .9, gw * .9]) { const [px, pz] = at(a), off = side * 3.2; if (put(D, R() < .5 ? 'barrier' : 'sandbags', X ? px : px + off, X ? pz + off : pz, g)) n++; }
  return n;
};
/* torre de vigilancia con sacos a los pies y un foco */
COMP.towerPost = function (D, o) {
  const lv = o.level || 1, t = 'tower' + lv; let n = put(D, t, o.x, o.z, 0, { fac: o.fac }) ? 1 : 0; if (!n) return 0;
  const f = MAPA.fp(t, 0), R = rngOf(o.seed);
  for (const [sx, sz] of [[-1, 1], [1, 1], [-1, -1], [1, -1]]) if (R() < .75 && put(D, 'sandbags', o.x + sx * (f.hx + 1.3), o.z + sz * (f.hz + .9), 0)) n++;
  if (o.light !== false && put(D, 'floodlight', o.x + f.hx + .9, o.z - f.hz - .8, 0)) n++;
  return n;
};
/* puesto de control: barricada con portón + torre en un extremo + coches y barriles cruzados delante + foco */
COMP.checkpoint = function (D, o) {
  const X = (o.axis || 'x') === 'x', R = rngOf(o.seed); let n = COMP.barricade(D, Object.assign({}, o, { cover: true })); const len = o.len || 14, side = o.side || 1;
  const at = (a, b) => X ? [o.x + a, o.z + b] : [o.x + b, o.z + a];
  { const [px, pz] = at(len / 2 + 2.6, -side * 1.4); n += COMP.towerPost(D, { x: px, z: pz, level: o.level || 1, fac: o.fac, seed: o.seed + 1 }); }
  for (const a of [-len * .3, len * .25]) { const [px, pz] = at(a, -side * 5.5); if (put(D, 'car', px, pz, X ? PI2 * (R() < .5 ? 1 : 0) : 0)) n++; }
  for (const a of [-2, 1.5]) { const [px, pz] = at(a, -side * 3.4); if (put(D, R() < .5 ? 'barrel' : 'barrelFuel', px, pz, 0)) n++; }
  return n;
};
/* dispersión de restos dentro de un círculo (cajas, vallas, barreras, bloques, barriles…) */
COMP.scatter = function (D, o) {
  const R = rngOf(o.seed), T = o.types || ['crate', 'crateS', 'barrier', 'barrel', 'blocks', 'fence', 'sandbags', 'pallet']; let n = 0;
  for (let i = 0, tries = 0; i < (o.n || 8) && tries < (o.n || 8) * 12; tries++) { const a = R() * 6.283, d = Math.sqrt(R()) * (o.r || 8); if (put(D, T[Math.floor(R() * T.length)], o.x + Math.cos(a) * d, o.z + Math.sin(a) * d, R() * 3.2)) { n++; i++; } }
  return n;
};
/* mobiliario a lo largo de una calle: alterna lados cada `every` m con tipos de mobiliario urbano */
COMP.street = function (D, o) {
  const R = rngOf(o.seed), P = roadPts(o.road), w = o.road.w, T = o.types || ['bench', 'planter', 'wheelie', 'dumpster', 'floodlight', 'busStop', 'cart'], every = o.every || 22; let n = 0, side = 1;
  for (let s = o.s0 || 6; s < Math.min(o.s1 === undefined ? P.length - 2 : o.s1, P.length - 2); s += every * (.8 + R() * .4)) {
    const q = P[Math.floor(s)], t = T[Math.floor(R() * T.length)], f = MAPA.fp(t, 0), alongX = Math.abs(q.dx) >= Math.abs(q.dz), dep = alongX ? f.hz : f.hx, off = w / 2 + .5 + dep; side = -side;   // dentro de la acera: junto al bordillo
    const px = q.x - q.dz * side * off, pz = q.z + q.dx * side * off; if (dep * 2 <= 2.8 && !(D.RI && D.RI.near(px, pz, 3.6, o.road)) && put(D, t, px, pz, yawAlong(q.dx, q.dz) + (side > 0 ? 0 : Math.PI))) n++;   // no en los cruces
  }
  return n;
};
/* fachada: edificio con aparcamiento delante (coches), contenedor al costado, banco y carros */
COMP.storefront = function (D, o) {
  const rot = snap(o.rot || 0), f = OBJ.footprint(o.kind, rot, {}); if (!f) return 0; const R = rngOf(o.seed);
  (D.buildings || (D.buildings = [])).push({ k: o.kind, x: o.x, z: o.z, rot, fac: o.fac }); COMP.reserve(D, o.x, o.z, f.hx, f.hz, 'edif:' + o.kind); COMP.used.add(o.kind);
  const fx = Math.sin(rot), fz = Math.cos(rot), px = fz, pz = -fx; let n = 1;                       // delante (puerta) y lateral
  const front = (a, b) => [o.x + fx * (Math.abs(fx) > .5 ? f.hx : f.hz) + fx * a + px * b, o.z + fz * (Math.abs(fz) > .5 ? f.hz : f.hx) + fz * a + pz * b];
  for (let i = 0; i < (o.cars === undefined ? 3 : o.cars); i++) { const [x, z] = front(4.5, (i - 1) * 6 + (R() - .5) * 1.5); if (put(D, 'car', x, z, rot + PI2)) n++; }
  { const [x, z] = front(1.2, -(Math.abs(fx) > .5 ? f.hz : f.hx) - 2); if (put(D, 'dumpster', x, z, rot)) n++; }
  { const [x, z] = front(1.1, (Math.abs(fx) > .5 ? f.hz : f.hx) * .5); if (put(D, 'bench', x, z, rot)) n++; }
  for (let i = 0; i < 2; i++) { const [x, z] = front(2.2 + i * 1.2, 2 + i); if (R() < .8 && put(D, 'cart', x, z, R() * 3)) n++; }
  return n;
};
/* edificio suelto con huella reservada (reserve:false para marquesinas que dejan colocar cosas debajo) */
COMP.building = function (D, o) {
  const rot = snap(o.rot || 0), f = OBJ.footprint(o.kind, rot, {}); if (!f) return false; const occ = occOf(D), pad = o.pad === undefined ? 1 : o.pad;
  if (Math.abs(o.x) + f.hx > D.half - 2 || Math.abs(o.z) + f.hz > D.half - 2) return false;
  for (const b of occ) if (Math.abs(b.x - o.x) < b.hx + f.hx + pad && Math.abs(b.z - o.z) < b.hz + f.hz + pad) return false;
  if (D.RI) for (const [px, pz] of [[0, 0], [1, 1], [1, -1], [-1, 1], [-1, -1], [1, 0], [-1, 0], [0, 1], [0, -1]]) if (D.RI.gap(o.x + px * f.hx, o.z + pz * f.hz) < (o.clear === undefined ? 3.6 : o.clear)) return false;   // fuera del asfalto y de la acera
  (D.buildings || (D.buildings = [])).push({ k: o.kind, x: o.x, z: o.z, rot, fac: o.fac }); if (o.reserve !== false) COMP.reserve(D, o.x, o.z, f.hx, f.hz, 'edif:' + o.kind); COMP.used.add(o.kind); return { x: o.x, z: o.z, rot, f };
};
/* edificio frente a una calle: junto al punto más cercano a `at`, del lado `side` (±1), con la puerta mirando a la calle; si choca se aleja hasta 14 m */
COMP.frontage = function (D, o) {
  const near = COMP.roadNear(D, o.at[0], o.at[1], 80); if (!near) return false; const r = near.road, q = near.q, side = o.side || 1;
  const nx = -q.dz * side, nz = q.dx * side, face = Math.atan2(-nx, -nz), rot = snap(face), f = OBJ.footprint(o.kind, rot, {}); if (!f) return false;
  const depth = Math.abs(Math.sin(rot)) > .5 ? f.hx : f.hz;
  for (let extra = 0; extra <= 14; extra += 2) for (const sl of [0, 8, -8, 16, -16]) {
    const off = r.w / 2 + 3.2 + 1.2 + depth + extra, px = q.x + nx * off + q.dx * sl, pz = q.z + nz * off + q.dz * sl, b = COMP.building(D, { kind: o.kind, x: px, z: pz, rot, fac: o.fac, pad: o.pad });
    if (b) return Object.assign(b, { road: r, nx, nz, off });
  }
  return false;
};
/* corte de calle en el punto de la calle más cercano a (x,z): barricada o puesto de control atravesado a la calle (portón abierto para no cerrar rutas) */
COMP.cut = function (D, o) {
  const near = COMP.roadNear(D, o.x, o.z, o.maxD || 45); if (!near) return 0; const q = near.q, r = near.road, axis = Math.abs(q.dx) >= Math.abs(q.dz) ? 'z' : 'x';
  const args = { x: q.x, z: q.z, axis, len: Math.ceil((r.w + 7) / 2) * 2, level: o.level || 1, seed: o.seed, gateOpen: o.open !== false, fac: o.fac, side: o.side };
  let n = o.kind === 'barricade' ? COMP.barricade(D, args) : COMP.checkpoint(D, args);
  if (o.jam) n += COMP.jam(D, { road: r, s0: Math.max(0, near.s - o.jam), s1: Math.max(0, near.s - 8), seed: o.seed + 50 });
  return n;
};
/* pasarela elevada con una escalera en cada extremo (obstáculo sólido y cobertura alta) */
COMP.footbridge = function (D, o) {
  const X = (o.axis || 'x') === 'x', g = X ? 0 : PI2, c = MAPA.fp('catwalk', g), st = MAPA.fp('stairs', g); let n = put(D, 'catwalk', o.x, o.z, g, null, 0) ? 1 : 0; if (!n) return 0;
  const ext = (X ? c.hx : c.hz) + (X ? st.hx : st.hz) + .05;
  for (const sg of [-1, 1]) if (put(D, 'stairs', o.x + (X ? sg * ext : 0), o.z + (X ? 0 : sg * ext), g + (sg > 0 ? 0 : Math.PI), null, 0)) n++;
  return n;
};
/* equipamiento del refugio provisional: almacén (materiales, munición, médico), armería, camillas, tablón, focos, sacos y cajas; deja libre la franja de aparición junto al portón */
COMP.refugeKit = function (D, o) {
  const R = rngOf(o.seed), dir = { n: [0, -1], s: [0, 1], w: [-1, 0], e: [1, 0] }[o.face], f = dir, sd = [-f[1], f[0]], hw = (f[0] ? o.w : o.d) / 2, hs = (f[0] ? o.d : o.w) / 2; let n = 0;
  const at = (a, b) => [o.x + f[0] * a + sd[0] * b, o.z + f[1] * a + sd[1] * b], gz = f[0] ? 0 : PI2, gx = f[0] ? PI2 : 0;
  const P = (t, a, b, g, op) => { const [x, z] = at(a, b); if (put(D, t, x, z, g === undefined ? 0 : g, op, .2)) n++; };
  P('storeMat', -hw + 3.5, -11, gx + Math.PI); P('storeAmmo', -hw + 3.5, 0, gx + Math.PI); P('storeMed', -hw + 3.5, 11, gx + Math.PI);
  P('rack', -hw + 12, -hs + 4, 0); P('rack', -hw + 12, hs - 4, 0);
  for (const b of [-7, -4, 4, 7]) P('cot', -4, b, gz);
  P('board', hw - 16, hs - 3, gz); P('gateInner', hw - 14.5, 0, f[0] ? PI2 : 0, { abierto: true });
  for (const [a, b] of [[hw - 3, hs - 3], [hw - 3, -hs + 3], [-hw + 3, hs - 3], [-hw + 3, -hs + 3]]) P('floodlight', a, b, 0);
  for (const b of [-5.5, 5.5]) P('sandbags', hw - 2.2, b, gz);
  P('crate', -hw + 8, 4, 0); P('crateS', -hw + 8, -3, 0); P('barrel', hw - 18, -hs + 3, 0); P('barrelFuel', hw - 18, -hs + 5, 0);
  return n;
};
/* retén en una calle: dos vehículos escalonados en carriles opuestos (chicane de ≥ 2,5 m para pasar), vallas de plástico, nidos de sacos en ambas aceras mirando a la calle, foco y barriles
   fuera del asfalto. Nunca muros ni portones atravesados en la calzada. `tower: true` añade una torre en la parcela junto a la acera. */
COMP.roadblock = function (D, o) {
  const R = rngOf(o.seed), P = roadPts(o.road), w = o.road.w; let s = Math.max(14, Math.min(P.length - 16, o.s));
  if (D.RI) { const clear = ss => { for (let a = -13; a <= 13; a += 3) { const p = P[Math.max(0, Math.min(P.length - 1, Math.floor(ss + a)))]; for (const lat of [-(w / 2 + 6), 0, w / 2 + 6]) if (D.RI.near(p.x - p.dz * lat, p.z + p.dx * lat, 1.5, o.road)) return false; } return true; };
    for (const d of [0, 12, -12, 24, -24, 36, -36, 50, -50, 70, -70]) if (clear(s + d)) { s = Math.max(14, Math.min(P.length - 16, s + d)); break; } }                    // lejos de los cruces
  const q = P[Math.floor(s)], nx = -q.dz, nz = q.dx, alongX = Math.abs(q.dx) >= Math.abs(q.dz); let n = 0;
  const at = (a, lat) => { const p = P[Math.max(0, Math.min(P.length - 1, Math.floor(s + a)))]; return [p.x - p.dz * lat, p.z + p.dx * lat]; }, g = yawAlong(q.dx, q.dz), L = R() < .5 ? -1 : 1;
  const lc = w <= 8 ? w / 2 - 1.5 : w * .3;                                                      // carril de cada coche: deja un pasillo en S de ≥ 1,6 m por el centro
  { const [x, z] = at(-3.5, L * lc); if (put(D, 'car', x, z, g)) n++; } { const [x, z] = at(3.5, -L * lc); if (put(D, 'car', x, z, g + Math.PI)) n++; }
  for (const [a, lat] of [[-10, L * lc], [10, -L * lc], [-7.5, -L * (w / 2 - .9)], [7.5, L * (w / 2 - .9)]]) { const [x, z] = at(a, lat); if (put(D, 'barrier', x, z, g)) n++; }
  for (const side of [-1, 1]) for (const a of [-4.5, 4.5]) { const f = MAPA.fp('sandbags', 0), dep = alongX ? f.hz : f.hx, [x, z] = at(a, side * (w / 2 + .5 + dep)); if (put(D, 'sandbags', x, z, g)) n++; }   // en la acera
  { const [x, z] = at(0, (R() < .5 ? -1 : 1) * (w / 2 + .9)); if (put(D, 'floodlight', x, z, 0)) n++; }
  for (const a of [-2, 2]) { const [x, z] = at(a, (w / 2 + 5.2) * (a < 0 ? -1 : 1)); if (put(D, R() < .5 ? 'barrel' : 'barrelFuel', x, z, 0)) n++; }
  if (o.tower) { const [x, z] = at(-1, (w / 2 + 3.2 + 3.6) * (o.side || 1)); n += COMP.towerPost(D, { x, z, level: o.level || 1, fac: o.fac, seed: o.seed + 9 }); }
  return n;
};
/* nido de sacos de arena: tres sacos en U y una caja detrás, mirando hacia `face` (n,s,e,w); se coloca en aceras y esquinas, nunca en la calzada */
COMP.nest = function (D, o) {
  const d = { n: [0, -1], s: [0, 1], w: [-1, 0], e: [1, 0] }[o.face || 's'], sd = [-d[1], d[0]], g = d[0] ? PI2 : 0; let n = 0;
  for (const [a, b] of [[0, 0], [0, 1.9], [0, -1.9]]) if (put(D, 'sandbags', o.x + d[0] * a + sd[0] * b, o.z + d[1] * a + sd[1] * b, g)) n++;
  if (put(D, 'crate', o.x - d[0] * 1.8, o.z - d[1] * 1.8, 0)) n++;
  return n;
};
/* recinto vallado con una verja corredera hacia un lado (+z/−z o ±x): subestaciones, patios */
COMP.fenceRect = function (D, o) {
  const w = o.w || 24, d = o.d || 18, gs = o.gateSide || 1, cl = MAPA.fp('chainFence', 0).hx * 2; let n = 0;
  for (let a = -w / 2 + cl / 2; a <= w / 2 - cl / 2 + .01; a += cl) for (const sg of [-1, 1]) { if (sg === gs && Math.abs(a) < 3.9) continue; if (put(D, 'chainFence', o.x + a, o.z + sg * d / 2, 0, null, 0)) n++; }
  for (let b = -d / 2 + cl / 2; b <= d / 2 - cl / 2 + .01; b += cl) for (const sg of [-1, 1]) if (put(D, 'chainFence', o.x + sg * w / 2, o.z + b, PI2, null, 0)) n++;
  if (put(D, 'slideGate', o.x, o.z + gs * d / 2, 0, { abierto: true }, 0)) n++;
  return n;
};
/* recinto amurallado (nivel 1 madera, 2 piedra, 3 hierro) con un portón hacia la calle, torre en una esquina y mercancía dentro: sólo en parcelas junto a una calle, nunca cruzando la calzada */
COMP.compound = function (D, o) {
  const lv = o.level || 2, near = COMP.roadNear(D, o.at[0], o.at[1], 90); if (!near) return false; const r = near.road, side = o.side || 1, w = o.w || 30, d = o.d || 22, P = roadPts(r);
  let cx = 0, cz = 0, hx = 0, hz = 0, alongX = true, nx = 0, nz = 0, ok = false;
  search: for (const sl of [0, 14, -14, 30, -30, 50, -50, 75, -75]) for (let extra = 0; extra <= 10; extra += 2) {
    const q = P[Math.max(0, Math.min(P.length - 1, near.s + sl))]; nx = -q.dz * side; nz = q.dx * side; alongX = Math.abs(q.dx) >= Math.abs(q.dz); hz = alongX ? d / 2 : w / 2; hx = alongX ? w / 2 : d / 2;
    const off = r.w / 2 + 3.2 + 1.5 + extra + (alongX ? hz : hx); cx = q.x + nx * off; cz = q.z + nz * off;
    if (D.occ.some(b => Math.abs(b.x - cx) < b.hx + hx + 2 && Math.abs(b.z - cz) < b.hz + hz + 2)) continue;
    if ([-1, 0, 1].some(a => [-1, 0, 1].some(b => D.RI.gap(cx + a * hx, cz + b * hz) < 4))) continue; ok = true; break search;
  }
  if (!ok) return false;
  const wall = 'wall' + lv, gate = 'gate' + lv, ww = MAPA.fp(wall, 0).hx * 2; let n = 0;
  const gs = alongX ? -Math.sign(nz) : 0, gx = alongX ? 0 : -Math.sign(nx);               // el portón va en el lado que mira a la calle
  const run = (fx, fz, len, X, hasGate) => { for (let a = -len / 2 + ww / 2; a <= len / 2 - ww / 2 + .01; a += ww) { if (hasGate && Math.abs(a) < 3.9) continue; if (put(D, wall, X ? fx + a : fx, X ? fz : fz + a, X ? 0 : PI2, { fac: o.fac }, 0)) n++; } };
  run(cx, cz - hz, 2 * hx, true, alongX && gs === -1); run(cx, cz + hz, 2 * hx, true, alongX && gs === 1); run(cx - hx, cz, 2 * hz, false, !alongX && gx === -1); run(cx + hx, cz, 2 * hz, false, !alongX && gx === 1);
  const gpos = alongX ? [cx, cz + gs * hz, 0] : [cx + gx * hx, cz, PI2];
  if (put(D, gate, gpos[0], gpos[1], gpos[2], { abierto: true, fac: o.fac }, 0)) n++;
  n += COMP.towerPost(D, { x: cx - hx + 4, z: cz - hz + 4, level: lv, seed: o.seed });
  const T = ['pallet', 'palletBoxes', 'cage', 'crate', 'crateS', 'dumpster', 'barrel', 'forklift']; const R = rngOf(o.seed || 5);
  for (let i = 0, tr = 0; i < (o.n || 8) && tr < 120; tr++) if (put(D, T[Math.floor(R() * T.length)], cx + (R() - .5) * (2 * hx - 9), cz + (R() - .5) * (2 * hz - 9), R() < .5 ? 0 : PI2)) { n++; i++; }
  COMP.reserve(D, cx, cz, hx + 1, hz + 1, 'recinto'); return { x: cx, z: cz, n };
};
/* valla de madera a lo largo de una calle, detrás de la acera, en tramos con huecos (jardines, huertos, límites de parcela) */
COMP.fenceRun = function (D, o) {
  const P = roadPts(o.road), w = o.road.w, side = o.side || 1, f = MAPA.fp('fence', 0), len = f.hx * 2; let n = 0;
  for (let s = o.s0 || 10; s < Math.min(o.s1 || P.length - 10, P.length - 10); s += len + .1) { const q = P[Math.floor(s)], alongX = Math.abs(q.dx) >= Math.abs(q.dz), off = w / 2 + 3.2 + 1.2, x = q.x - q.dz * side * off, z = q.z + q.dx * side * off; if (((s / 24) | 0) % 3 === 2) continue; if (D.RI.gap(x, z) > 3.6 && put(D, 'fence', x, z, alongX ? 0 : PI2, null, 0)) n++; }
  return n;
};
/* campamento / mercado improvisado: puestos, carros, cajas, palés y un barril */
COMP.camp = function (D, o) {
  const R = rngOf(o.seed); let n = 0;
  for (let i = 0; i < 3; i++) if (put(D, 'stall', o.x + (i - 1) * 5, o.z - 4, 0)) n++;
  for (const [t, dx, dz] of [['cart', -6, 3], ['cart', 6, 4], ['crate', -2, 5], ['crateS', 1, 5.5], ['pallet', 5, 1], ['pallet', -5, 0], ['barrel', 8, -2], ['planter', -8, -3], ['bench', 0, 8], ['floodlight', 0, 3]]) if (put(D, t, o.x + dx + (R() - .5), o.z + dz + (R() - .5), R() < .5 ? 0 : PI2)) n++;
  return n;
};
/* patio de carga: valla metálica alrededor con una verja corredera, palés, cajas, jaulas, carretilla y contenedor dentro */
COMP.yard = function (D, o) {
  const R = rngOf(o.seed), w = o.w || 30, d = o.d || 22, gs = o.gateSide || 1; let n = 0;
  const cl = MAPA.fp('chainFence', 0).hx * 2;
  for (let a = -w / 2 + cl / 2; a <= w / 2 - cl / 2 + .01; a += cl) { for (const sg of [-1, 1]) { if (sg === gs && Math.abs(a) < 3.9) continue; if (put(D, 'chainFence', o.x + a, o.z + sg * d / 2, 0, null, 0)) n++; } }
  if (put(D, 'slideGate', o.x, o.z + gs * d / 2, 0, { abierto: o.open !== false }, 0)) n++;
  for (let b = -d / 2 + cl / 2; b <= d / 2 - cl / 2 + .01; b += cl) for (const sg of [-1, 1]) if (put(D, 'chainFence', o.x + sg * w / 2, o.z + b, PI2, null, 0)) n++;
  const T = ['pallet', 'palletBoxes', 'palletBoxes', 'cage', 'crate', 'crateS', 'forklift', 'dumpster', 'barrel'];
  for (let i = 0, tr = 0; i < (o.n || 12) && tr < 200; tr++) if (put(D, T[Math.floor(R() * T.length)], o.x + (R() - .5) * (w - 4), o.z + (R() - .5) * (d - 4), R() < .5 ? 0 : PI2)) { n++; i++; }
  return n;
};
})();
