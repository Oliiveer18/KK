"use strict";
/* ===================== DATOS DEL DISTRITO (sector de prueba M1: 250 × 250 m) =====================
   Cuadrícula de calles (x e z = −70, 0, +70), un refugio provisional por esquina (Azul NO, Rojo NE, Ámbar SO, Violeta SE), plaza al noreste del cruce central,
   tiendas sobre la Avenida Mayor, gasolinera, aparcamiento y una vía. Norte = z negativo. Se amplía por sectores (M2/M3). */
(function () {
const fp = (k, g) => OBJ.footprint(k, g || 0, {});
MAPA.data.M1 = function () {
  const SW = 3.2, AV = 12, CALLE = 8, half = 125;
  const D = { half, ground: 'grass', roads: [], surfaces: [], lots: [], refuges: [], buildings: [], objects: [], rails: [], hot: [] };
  D.roads.push({ axis: 'x', c: 0, a0: -half, a1: half, w: AV }, { axis: 'z', c: 0, a0: -half, a1: half, w: 9 });                         // Avenida Mayor y Calle Central
  for (const c of [-70, 70]) D.roads.push({ axis: 'x', c, a0: -half, a1: half, w: CALLE }, { axis: 'z', c, a0: -half, a1: half, w: CALLE });   // calles perimetrales
  /* refugios (provisionales): portón hacia la calle más cercana */
  D.refuges.push({ fac: 0, x: -98, z: -98, w: 44, d: 40, face: 's', gate: 8 }, { fac: 1, x: 98, z: -98, w: 44, d: 40, face: 's', gate: 8 },
                 { fac: 2, x: -98, z: 98, w: 44, d: 40, face: 'n', gate: 8 }, { fac: 3, x: 98, z: 98, w: 44, d: 40, face: 'n', gate: 8 });
  /* tiendas en la acera norte de la Avenida Mayor (puerta hacia +z, a la avenida) */
  const front = AV / 2 + SW + .3, put = (k, x, side, fac) => { const f = fp(k), D_ = f.hz, z = side * (front + D_); D.buildings.push({ k, x, z, rot: side < 0 ? 0 : Math.PI, fac }); return [x, z]; };
  const s1 = put('super', -38, -1), s2 = put('pharm', -9, -1), s3 = put('mini', 22, 1);
  D.hot.push([s1[0], -6], [s2[0], -6], [s3[0], 6]);
  /* plaza al noreste del cruce central */
  D.surfaces.push({ t: 'cobble', x: 36, z: -37, w: 44, d: 44 });
  D.objects.push({ t: 'bench', x: 24, z: -26 }, { t: 'bench', x: 48, z: -26 }, { t: 'planter', x: 26, z: -48, g: 0 }, { t: 'planter', x: 46, z: -48 }, { t: 'kiosk', x: 36, z: -50 }, { t: 'busStop', x: 12, z: -8.5 },
                 { t: 'bench', x: 24, z: -50 }, { t: 'floodlight', x: 36, z: -36 });
  D.hot.push([36, -37]);
  /* gasolinera al sureste */
  D.surfaces.push({ t: 'concrete', x: 40, z: 38, w: 36, d: 24 });
  D.objects.push({ t: 'pump', x: 30, z: 36 }, { t: 'pump', x: 38, z: 36 }, { t: 'pump', x: 46, z: 36 }, { t: 'kiosk', x: 50, z: 46 }, { t: 'car', x: 34, z: 44, g: Math.PI / 2 }, { t: 'dumpster', x: 56, z: 30 });
  D.hot.push([40, 38]);
  /* aparcamiento al suroeste */
  D.lots.push({ x: -36, z: 40, w: 40, d: 24 });
  D.objects.push({ t: 'car', x: -48, z: 36, g: Math.PI / 2 }, { t: 'car', x: -42, z: 44, g: Math.PI / 2 }, { t: 'car', x: -30, z: 36, g: Math.PI / 2 }, { t: 'car', x: -24, z: 44, g: Math.PI / 2 },
                 { t: 'wheelie', x: -56, z: 30 }, { t: 'dumpster', x: -54, z: 52 }, { t: 'pallet', x: -16, z: 52 });
  D.hot.push([-36, 40]);
  /* una vía al sur, entre los dos refugios del sur */
  D.surfaces.push({ t: 'dirt', x: 0, z: 100, w: 120, d: 10 });
  D.rails.push({ x: 0, z: 100, len: 120, ry: 0 });
  D.hot.push([0, 100], [0, -70], [0, 70], [-70, 0], [70, 0], [-70, -70], [70, -70], [-70, 70], [70, 70], [0, 0]);
  return D;
};

/* ===================== DISTRITO COMPLETO v2 (1 km², cuadrícula orgánica; `?mapa=6`) =====================
   Retícula de arterias cada 250 m con pequeñas curvas, que se unen siempre en nodos exactos (los cruces son puntos de control comunes de las dos calles); calles de barrio ortogonales que
   nacen y mueren sobre otra calle (nada suelto). 16 celdas con su uso: 4 refugios en las esquinas, residencial, casco antiguo, comercial, estación, industria, parque y 3 bosques.
   Norma de colocación: los muros y portones sólo cierran refugios, patios y recintos (nunca la calzada); los retenes son chicanes de vehículos con sacos en la acera; los sacos van en aceras y esquinas;
   las torres, en parcelas junto a la acera. Todo en coordenadas del mundo (x → derecha, z → abajo, norte arriba). Determinista. Ver docs/DISTRITO_V2.md (lista exacta de ubicaciones). */
MAPA.data.M2 = function () {
  const rng = (a => () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; })(20261126);
  const half = 500, E = 498, D = { half, ground: 'grass', roads: [], surfaces: [], lots: [], refuges: [], buildings: [], objects: [], rails: [], hot: [], occ: [], trees: [], info: { nodes: [], places: [], blocks: [], roads: [] } };
  const road = (pts, w, step, name) => { const r = { pts, w, step: step || 2, name }; D.roads.push(r); D.info.roads.push({ name, w, pts }); return r; };
  /* — nodos de la retícula (cruces exactos) — */
  const X = [-250, 0, 250], Z = [-250, 0, 250], OFF = [[[-12, 8], [8, 14], [-14, -6]], [[10, -10], [0, 0], [12, 10]], [[14, 12], [-10, -12], [6, -14]]];   // OFF[i][j] = desplazamiento del nodo (columna i, fila j)
  const N = X.map((x, i) => Z.map((z, j) => [x + OFF[i][j][0], z + OFF[i][j][1]]));
  N.forEach((c, i) => c.forEach((p, j) => D.info.nodes.push({ id: 'N' + i + j, x: p[0], z: p[1] })));
  const bend = (a, b, k, axis) => { const m = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2]; if (axis === 'v') m[0] += k; else m[1] += k; return m; };       // punto intermedio que curva el tramo
  const V = [], Hh = [];
  for (let i = 0; i < 3; i++) { const p = [[X[i] + (i === 1 ? 6 : -6), -E]], k = [16, -14, 12, -10]; for (let j = 0; j < 3; j++) { if (j > 0) p.push(bend(N[i][j - 1], N[i][j], k[(i + j) % 4], 'v')); p.push(N[i][j]); } p.push(bend(N[i][2], [X[i] + 8, E], k[(i + 3) % 4], 'v'), [X[i] + 8, E]); V.push(road(p, i === 1 ? 12 : 10, 2, i === 1 ? 'Calle Central' : 'Arteria N-S ' + (i ? 'este' : 'oeste'))); }
  for (let j = 0; j < 3; j++) { const p = [[-E, Z[j] + 6]], k = [-14, 12, -10, 16]; for (let i = 0; i < 3; i++) { if (i > 0) p.push(bend(N[i - 1][j], N[i][j], k[(i + j) % 4], 'h')); p.push(N[i][j]); } p.push(bend(N[2][j], [E, Z[j] - 6], k[(j + 3) % 4], 'h'), [E, Z[j] - 6]); Hh.push(road(p, j === 1 ? 12 : 10, 2, j === 1 ? 'Avenida Mayor' : 'Arteria E-O ' + (j ? 'sur' : 'norte'))); }
  const ART = D.roads.slice(), dense = r => r._d || (r._d = MAPA.pathPts(r.pts, 1));
  const ptAtZ = (r, z) => { let b = null, bd = 1e9; for (const q of dense(r)) { const d = Math.abs(q.z - z); if (d < bd) { bd = d; b = q; } } return [b.x, b.z]; };
  const ptAtX = (r, x) => { let b = null, bd = 1e9; for (const q of dense(r)) { const d = Math.abs(q.x - x); if (d < bd) { bd = d; b = q; } } return [b.x, b.z]; };
  /* — calles de barrio: ortogonales, de arteria a arteria (o al borde del mapa), con una ligera curva — */
  const ew = (z, xl, xr, name, lc, rc) => { const a = lc ? ptAtZ(lc, z) : [-E, z], b = rc ? ptAtZ(rc, z) : [E, z], j = (rng() - .5) * 8; return road([a, [a[0] + (b[0] - a[0]) * .33, z + j], [a[0] + (b[0] - a[0]) * .66, z - j], b], 7, 3, name); };
  const ns = (x, zt, zb, name, tc, bc) => { const a = tc ? ptAtX(tc, x) : [x, -E], b = bc ? ptAtX(bc, x) : [x, E], j = (rng() - .5) * 8; return road([a, [x + j, a[1] + (b[1] - a[1]) * .33], [x - j, a[1] + (b[1] - a[1]) * .66], b], 7, 3, name); };
  const [V0, V1, V2] = V, [H0, H1, H2] = Hh;
  const S = {};
  S.azulAcc = ew(-330, 0, 0, 'Acceso Azul', null, V0); S.azulNS = ns(-420, 0, 0, 'Barrio Colina', null, H0);
  S.rojoAcc = ew(-330, 0, 0, 'Acceso Rojo', V2, null); S.rojoNS = ns(420, 0, 0, 'Barrio Fábrica', null, H0);
  S.ambAcc = ew(330, 0, 0, 'Acceso Ámbar', null, V0); S.ambNS = ns(-420, 0, 0, 'Barrio Colegio', H2, null);
  S.vioAcc = ew(330, 0, 0, 'Acceso Violeta', V2, null); S.vioNS = ns(420, 0, 0, 'Barrio Granjas', H2, null);
  S.resO = [ew(-125, 0, 0, 'Calle Residencial O', null, V0), ns(-375, 0, 0, 'Calle Residencial O (N-S)', H0, H1)];
  S.casco = [ew(-190, 0, 0, 'Calle del Casco 1', V0, V1), ew(-70, 0, 0, 'Calle del Casco 2', V0, V1), ns(-190, 0, 0, 'Calle del Casco 3', H0, H1), ns(-60, 0, 0, 'Calle del Casco 4', H0, H1)];
  S.com = [ew(-140, 0, 0, 'Calle Comercial', V1, V2), ns(125, 0, 0, 'Calle del Mercado', H0, H1)];
  S.cascoS = [ew(85, 0, 0, 'Calle del Casco Sur', V0, V1), ns(-125, 0, 0, 'Calle de la Iglesia', H1, H2)];
  S.est = [ew(85, 0, 0, 'Calle de la Estación', V1, V2), ns(125, 0, 0, 'Calle de la Vía', H1, H2)];
  S.resE = [ew(85, 0, 0, 'Calle Residencial E', V2, null), ns(400, 0, 0, 'Calle Residencial E (N-S)', H1, H2)];
  S.ind = [ew(330, 0, 0, 'Calle Industrial', V1, V2), ns(125, 0, 0, 'Calle de las Naves', H2, null)];
  /* — vía: recta de oeste a este al sur del centro, con un leve cambio de dirección — */
  const RAILZ = 188, rp = [[-500, RAILZ + 6], [-250, RAILZ], [0, RAILZ - 6], [250, RAILZ], [500, RAILZ + 8]];
  for (let i = 0; i < rp.length - 1; i++) { const a = rp[i], b = rp[i + 1], L = Math.hypot(b[0] - a[0], b[1] - a[1]); D.rails.push({ x: (a[0] + b[0]) / 2, z: (a[1] + b[1]) / 2, len: L, ry: -Math.atan2(b[1] - a[1], b[0] - a[0]) }); }
  D.info.rail = rp;
  D.RI = MAPA.roadIndex(D.roads);
  const free = (x, z, m) => D.occ.every(o => Math.abs(o.x - x) > o.hx + (m || 2) || Math.abs(o.z - z) > o.hz + (m || 2)) && D.RI.gap(x, z) > 4;
  const railDist = (x, z) => { let md = 1e9; for (let i = 0; i < rp.length - 1; i++) { const a = rp[i], b = rp[i + 1], dx = b[0] - a[0], dz = b[1] - a[1], t = Math.max(0, Math.min(1, ((x - a[0]) * dx + (z - a[1]) * dz) / (dx * dx + dz * dz))); md = Math.min(md, Math.hypot(x - a[0] - dx * t, z - a[1] - dz * t)); } return md; };
  /* — refugios provisionales en las 4 esquinas, con la puerta hacia su calle de acceso (la Entrega 2 los sustituirá) — */
  const REF = [{ fac: 0, name: 'Azul', x: -390, z: -362, face: 's' }, { fac: 1, name: 'Rojo', x: 390, z: -362, face: 's' }, { fac: 2, name: 'Ámbar', x: -390, z: 362, face: 'n' }, { fac: 3, name: 'Violeta', x: 390, z: 362, face: 'n' }];
  for (const r of REF) { D.refuges.push({ fac: r.fac, x: r.x, z: r.z, w: 44, d: 40, face: r.face, gate: 8 }); COMP.refugeKit(D, { seed: 900 + r.fac, x: r.x, z: r.z, w: 44, d: 40, face: r.face }); D.info.places.push({ id: 'REF-' + r.name, name: 'Refugio ' + r.name, x: r.x, z: r.z });
    const dir = { n: [0, -1], s: [0, 1] }[r.face], gy = r.z + dir[1] * 20;                    // portón de madera en el hueco del muro (2 hojas de 4,2 m) y torre de madera a un lado, fuera del muro
    COMP.put(D, 'gate1', r.x - 2.1, gy, 0, { abierto: true, fac: r.fac }, 0); COMP.put(D, 'gate1', r.x + 2.1, gy, 0, { abierto: true, fac: r.fac }, 0); COMP.towerPost(D, { x: r.x + (r.fac % 2 ? -29 : 29), z: r.z + dir[1] * 14, level: 1, fac: r.fac, seed: 950 + r.fac }); COMP.reserve(D, r.x, r.z, 24, 22, 'refugio'); }
  /* — plaza mayor y entorno — */
  const PLAZA = [38, -40]; D.surfaces.push({ t: 'cobble', x: PLAZA[0], z: PLAZA[1], w: 40, d: 40 }); D.info.places.push({ id: 'PLAZA', name: 'Plaza Mayor (campamento)', x: PLAZA[0], z: PLAZA[1] });
  COMP.camp(D, { x: PLAZA[0], z: PLAZA[1] + 2, seed: 7002 });
  { const kx = PLAZA[0], kz = PLAZA[1]; COMP.put(D, 'kiosk', kx - 14, kz - 13, 0); COMP.put(D, 'kiosk', kx + 14, kz - 13, 0); for (const dx of [-12, -4, 4, 12]) { COMP.put(D, 'shutter', kx + dx - 2, kz + 17, 0); COMP.put(D, 'glassPane', kx + dx + 2.6, kz + 17, 0); } COMP.reserve(D, PLAZA[0], PLAZA[1], 20, 20, 'plaza'); }
  /* — edificios con su entorno — */
  const place = (id, name, b) => { if (b) D.info.places.push({ id, name, x: Math.round(b.x), z: Math.round(b.z), rot: b.rot }); return b; };
  const F = (kind, at, side, extra) => COMP.frontage(D, Object.assign({ kind, at, side }, extra || {}));
  place('CLI', 'Clínica', F('clinic', [-130, -125], -1)); place('FAR', 'Farmacia', F('pharm', [-150, 0], -1)); place('MIN', 'Tienda', F('mini', [-80, 0], -1));
  const sup = place('SUP', 'Supermercado', F('super', [140, 0], -1)); place('MER', 'Mercado', F('market', [130, -140], -1));
  place('GAS', 'Gasolinera', F('gasshop', [200, 0], 1)); const gc = F('gascanopy', [225, 0], 1, { pad: 0 }); if (gc) { place('GASM', 'Marquesina', gc); for (const dx of [-5, 0, 5]) COMP.put(D, 'pump', gc.x + dx, gc.z, 0); }
  if (sup) { const tx = Math.abs(sup.nx) > Math.abs(sup.nz) ? 0 : 1, tz = 1 - tx, hs = tx ? sup.f.hx : sup.f.hz, lx = sup.x + tx * (hs + 22), lz = sup.z + tz * (hs + 22); if (D.occ.every(o => Math.abs(o.x - lx) > o.hx + 20 || Math.abs(o.z - lz) > o.hz + 13) && D.RI.gap(lx, lz) > 14) { D.lots.push({ x: lx, z: lz, w: 40, d: 24 }); COMP.reserve(D, lx, lz, 20, 12, 'aparcamiento'); for (let i = 0; i < 6; i++) COMP.put(D, 'car', lx - 15 + i * 6, lz + (i % 2 ? -4 : 4), Math.PI / 2, null, .1); } }
  { const b = COMP.building(D, { kind: 'station', x: 60, z: 150, rot: 0 }) || COMP.building(D, { kind: 'station', x: 80, z: 150, rot: 0 }); place('EST', 'Estación', b); }
  for (const [x, z, rot] of [[60, 306, Math.PI], [150, 306, Math.PI], [90, 354, 0]]) place('NAV', 'Nave', COMP.building(D, { kind: 'warehouse', x, z, rot }));
  { const b = COMP.building(D, { kind: 'substation', x: 330, z: 40, rot: 0 }); if (b) { place('SUB', 'Subestación', b); COMP.fenceRect(D, { x: b.x, z: b.z + 2, w: b.f.hx * 2 + 12, d: b.f.hz * 2 + 10, gateSide: 1 }); } }
  COMP.yard(D, { x: 205, z: 392, w: 30, d: 22, seed: 7001, n: 12, gateSide: -1 }); D.surfaces.push({ t: 'concrete', x: 205, z: 392, w: 36, d: 28 }); D.info.places.push({ id: 'PAT', name: 'Patio de carga', x: 205, z: 392 });
  COMP.footbridge(D, { x: 30, z: 215, axis: 'x' });
  { const c2 = COMP.compound(D, { at: [150, -250], side: -1, level: 2, w: 36, d: 24, seed: 8002, n: 9 }); if (c2) D.info.places.push({ id: 'REC', name: 'Fábrica: recinto de piedra', x: Math.round(c2.x), z: Math.round(c2.z) });
    const c3 = COMP.compound(D, { at: [-130, 250], side: 1, level: 3, w: 36, d: 24, seed: 8003, n: 9 }); if (c3) D.info.places.push({ id: 'REC', name: 'Depósito: recinto de hierro', x: Math.round(c3.x), z: Math.round(c3.z) });
    const c1 = COMP.compound(D, { at: [-380, -125], side: 1, level: 1, w: 30, d: 22, seed: 8001, n: 7 }); if (c1) D.info.places.push({ id: 'REC', name: 'Granja: recinto de madera', x: Math.round(c1.x), z: Math.round(c1.z) }); }
  for (const r of [S.resO[0], S.resO[1], S.resE[0], S.resE[1], S.vioNS, S.ambNS]) for (const sd of [1]) COMP.fenceRun(D, { road: r, side: sd, s0: 20, s1: 170 });
  /* — casas: a lo largo de las calles de barrio, con la puerta a la calle — */
  { const resid = [S.azulAcc, S.azulNS, S.rojoAcc, S.rojoNS, S.ambAcc, S.ambNS, S.vioAcc, S.vioNS, ...S.resO, ...S.casco, ...S.cascoS, ...S.resE];
    const cand = []; for (const r of resid) { const Pt = MAPA.pathPts(r.pts, 1); for (let i = 14; i < Pt.length - 14; i += 17) for (const side of [-1, 1]) cand.push({ q: Pt[i], side, k: rng(), r }); }
    cand.sort((a, b) => a.k - b.k); let nh = 0; const MAXH = 64;
    for (const c of cand) { if (nh >= MAXH) break; const nx = -c.q.dz * c.side, nz = c.q.dx * c.side, rot = Math.round(Math.atan2(-nx, -nz) / (Math.PI / 2)) * (Math.PI / 2), f = OBJ.footprint('house', rot, {}); if (!f) continue;
      const depth = Math.abs(Math.sin(rot)) > .5 ? f.hx : f.hz, off = c.r.w / 2 + 3.2 + 1.5 + depth, x = c.q.x + nx * off, z = c.q.z + nz * off; if (railDist(x, z) < 14) continue;
      if (COMP.building(D, { kind: 'house', x, z, rot, pad: 2.5 })) nh++; }
    D.nHouses = nh; }
  /* — retenes (chicane de vehículos, sacos en la acera): 4 en los brazos del centro, 4 en los accesos de refugio, 4 en los nodos de las esquinas del anillo — */
  let sd = 200;
  const rb = (r, x, z, extra) => { const n = COMP.nearest(r, x, z); COMP.roadblock(D, Object.assign({ road: r, s: n.s, seed: ++sd }, extra || {})); D.info.places.push({ id: 'RET', name: 'Retén', x: Math.round(n.q.x), z: Math.round(n.q.z) }); };
  rb(H1, -70, 0); rb(H1, 70, 0); rb(V1, 0, -70); rb(V1, 0, 70);
  rb(S.azulAcc, -300, -330, { tower: true, level: 2, fac: 0, side: -1 }); rb(S.rojoAcc, 300, -330, { tower: true, level: 2, fac: 1, side: -1 }); rb(S.ambAcc, -300, 330, { tower: true, level: 2, fac: 2, side: 1 }); rb(S.vioAcc, 300, 330, { tower: true, level: 2, fac: 3, side: 1 });
  rb(V0, N[0][0][0], N[0][0][1] + 30); rb(V2, N[2][0][0], N[2][0][1] + 30); rb(V0, N[0][2][0], N[0][2][1] - 30); rb(V2, N[2][2][0], N[2][2][1] - 30);
  /* nidos de sacos en las esquinas del centro, en la parcela junto a la acera (mirando a la calle) */
  for (const [x, z, face] of [[-26, -26, 'e'], [26, 26, 'w'], [-26, 26, 'n'], [26, -26, 's']]) { const q = COMP.roadNear(D, x, z, 40); if (q) COMP.nest(D, { x, z, face }); }
  /* — atascos por carril (largos en avenida y calle central, cortos en arterias) y mobiliario en la acera — */
  COMP.jam(D, { road: H1, s0: 30, s1: 420, seed: 31 }); COMP.jam(D, { road: H1, s0: 560, s1: 900, seed: 32 }); COMP.jam(D, { road: V1, s0: 30, s1: 420, seed: 33 }); COMP.jam(D, { road: V1, s0: 560, s1: 900, seed: 34 });
  for (const r of [H0, H2, V0, V2]) COMP.jam(D, { road: r, s0: 120, s1: 260, gap: [12, 22], seed: ++sd });
  for (const r of [H1, V1]) COMP.street(D, { road: r, seed: ++sd, every: 34 }); for (const r of [H0, H2, V0, V2]) COMP.street(D, { road: r, seed: ++sd, every: 60 });
  /* — bosques: 3 celdas completas y dos recortes; los árboles esquivan calles, vía, edificios y refugios (claros y senderos) — */
  const FOR = [[-232, -498, -18, -262, 'Bosque norte'], [262, -232, 498, -18, 'Bosque este'], [-498, 22, -262, 232, 'Bosque oeste'], [-232, 280, -20, 498, 'Parque y campo sur'], [30, -498, 238, -280, 'Arboleda noreste']];
  const treeOk = (x, z) => D.RI.gap(x, z) > 12 && railDist(x, z) > 14 && D.occ.every(o => Math.abs(o.x - x) > o.hx + 5 || Math.abs(o.z - z) > o.hz + 5);
  for (const [x0, z0, x1, z1, name] of FOR) { let n = 0; D.surfaces.push({ t: 'forest', x: (x0 + x1) / 2, z: (z0 + z1) / 2, w: x1 - x0, d: z1 - z0 }); D.info.blocks.push({ name, x0, z0, x1, z1 });
    for (let k = 0, tr = 0; tr < 5000 && n < 150; tr++) { const x = x0 + 6 + rng() * (x1 - x0 - 12), z = z0 + 6 + rng() * (z1 - z0 - 12); if (!treeOk(x, z)) continue; if (D.trees.some(t => Math.hypot(t[0] - x, t[1] - z) < 7.5)) continue; D.trees.push([+x.toFixed(1), +z.toFixed(1), .9 + rng() * .5]); n++; } }
  /* — hot points (zombis, objetivos y nidos) en sitios libres, y restos alrededor — */
  const OBJV = [[38, -40, 'Plaza Mayor'], [-130, -105, 'Clínica'], [140, -30, 'Supermercado'], [200, 25, 'Gasolinera'], [60, 175, 'Estación'], [120, 335, 'Naves'], [-125, 125, 'Calle de la Iglesia'], [-330, 320, 'Colegio']];
  const NEST = [[-190, 120], [180, 150], [-60, -190], [190, -190], [-250, -60], [260, 100], [60, 260], [-100, 300]];
  const spot = (x, z) => { for (let r = 0; r <= 40; r += 3) for (let a = 0; a < 6.28; a += .6) { const px = x + Math.cos(a) * r, pz = z + Math.sin(a) * r; if (free(px, pz, 2.5) && Math.abs(px) < half - 8 && Math.abs(pz) < half - 8 && railDist(px, pz) > 8) return [px, pz]; } return null; };
  for (const [x, z, nm] of OBJV) { const w = spot(x, z); if (w) { D.hot.push(w); COMP.scatter(D, { x: w[0], z: w[1], r: 9, n: 5, seed: ++sd, types: ['crate', 'crateS', 'pallet', 'barrel'] }); D.info.places.push({ id: 'OBJ', name: nm, x: Math.round(w[0]), z: Math.round(w[1]) }); } }
  for (const [x, z] of NEST) { const w = spot(x, z); if (w) { D.hot.push(w); COMP.scatter(D, { x: w[0], z: w[1], r: 12, n: 8, seed: ++sd, types: ['crate', 'crateS', 'barrier', 'blocks', 'pallet', 'barrel'] }); D.info.places.push({ id: 'NIDO', name: 'Nido de zombis', x: Math.round(w[0]), z: Math.round(w[1]) }); } }
  return D;
};
})();
