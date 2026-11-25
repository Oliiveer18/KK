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
function roadPts(r) { const pts = r.pts || (r.axis === 'x' ? [[r.a0, r.c], [r.a1, r.c]] : [[r.c, r.a0], [r.c, r.a1]]); return MAPA.pathPts(pts, 1); }
const yawAlong = (dx, dz) => Math.abs(dx) >= Math.abs(dz) ? 0 : PI2;

/* atasco: coches abandonados a lo largo de una calle (carril aleatorio, algunos cruzados), con restos en el bordillo */
COMP.jam = function (D, o) {
  const R = rngOf(o.seed), P = roadPts(o.road), w = o.road.w, s0 = o.s0 || 0, s1 = Math.min(o.s1 === undefined ? P.length - 1 : o.s1, P.length - 1), gap = o.gap || [5.5, 9.5];
  const ex = o.extras === undefined ? .22 : o.extras, extra = o.types || ['dumpster', 'barrier', 'barrel', 'blocks', 'crateS', 'wheelie'];
  let n = 0;
  for (let s = s0; s < s1; s += gap[0] + R() * (gap[1] - gap[0])) {
    const q = P[Math.floor(s)], nx = -q.dz, nz = q.dx, lane = (R() < .5 ? -1 : 1) * (w * .2 + R() * w * .08);
    const cross = R() < .12, g = cross ? yawAlong(q.dx, q.dz) + PI2 : yawAlong(q.dx, q.dz) + (R() < .5 ? 0 : Math.PI);
    if (put(D, o.car || 'car', q.x + nx * lane, q.z + nz * lane, g)) n++;
    if (R() < ex) { const side = R() < .5 ? -1 : 1, off = w / 2 + 1.2; if (put(D, extra[Math.floor(R() * extra.length)], q.x + nx * side * off, q.z + nz * side * off, R() * 3)) n++; }
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
    const q = P[Math.floor(s)], off = w / 2 + 2.5, t = T[Math.floor(R() * T.length)]; side = -side;
    if (put(D, t, q.x - q.dz * side * off, q.z + q.dx * side * off, yawAlong(q.dx, q.dz) + (side > 0 ? 0 : Math.PI))) n++;
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
/* campamento / mercado improvisado: puestos, carros, cajas, palés y un barril */
COMP.camp = function (D, o) {
  const R = rngOf(o.seed); let n = 0;
  for (let i = 0; i < 3; i++) if (put(D, 'stall', o.x + (i - 1) * 5, o.z - 4, 0)) n++;
  for (const [t, dx, dz] of [['cart', -6, 3], ['cart', 6, 4], ['crate', -2, 5], ['crateS', 1, 5.5], ['pallet', 5, 1], ['pallet', -5, 0], ['barrel', 8, -2], ['planter', -8, -3], ['bench', 0, 8], ['floodlight', 0, 3]]) if (put(D, t, o.x + dx + (R() - .5), o.z + dz + (R() - .5), R() < .5 ? 0 : PI2)) n++;
  return n;
};
/* patio de carga: valla metálica alrededor con una verja corredera, palés, cajas, jaulas, carretilla y contenedor dentro */
COMP.yard = function (D, o) {
  const R = rngOf(o.seed), w = o.w || 30, d = o.d || 22; let n = 0;
  const cl = MAPA.fp('chainFence', 0).hx * 2;
  for (let a = -w / 2 + cl / 2; a <= w / 2 - cl / 2 + .01; a += cl) { for (const sg of [-1, 1]) { if (sg > 0 && Math.abs(a) < 3.9) continue; if (put(D, 'chainFence', o.x + a, o.z + sg * d / 2, 0, null, 0)) n++; } }
  if (put(D, 'slideGate', o.x, o.z + d / 2, 0, { abierto: !!o.open }, 0)) n++;
  for (let b = -d / 2 + cl / 2; b <= d / 2 - cl / 2 + .01; b += cl) for (const sg of [-1, 1]) if (put(D, 'chainFence', o.x + sg * w / 2, o.z + b, PI2, null, 0)) n++;
  const T = ['pallet', 'palletBoxes', 'palletBoxes', 'cage', 'crate', 'crateS', 'forklift', 'dumpster', 'barrel'];
  for (let i = 0, tr = 0; i < (o.n || 12) && tr < 200; tr++) if (put(D, T[Math.floor(R() * T.length)], o.x + (R() - .5) * (w - 4), o.z + (R() - .5) * (d - 4), R() < .5 ? 0 : PI2)) { n++; i++; }
  return n;
};
})();
