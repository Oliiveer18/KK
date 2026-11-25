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

/* ===================== DISTRITO COMPLETO (1 km², 16 sectores de 250 m; `?mapa=6`) =====================
   Trazado del boceto aprobado (docs/img/mapa_propuesta_1km.png, docs/PLAN_DEL_MAPA.md §6): calles curvas sin rejilla global, barrios con su orientación, vía curva, 4 refugios fuera de
   las esquinas, 8 objetivos, cortes y puestos de control, atascos, nidos de zombis y los 11 tipos de edificio. Coordenadas del boceto (0..1000, norte arriba) → mundo: x−500, z−500.
   Determinista (semillas fijas). Aún sin carga por sectores (M2 B7–B9): pesado hasta fusionar la geometría. */
MAPA.data.M2 = function () {
  const rng = (a => () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; })(20261126);
  const S = (x, y) => [x - 500, y - 500], P = a => a.map(p => S(p[0], p[1])), half = 500;
  const D = { half, ground: 'grass', roads: [], surfaces: [], lots: [], refuges: [], buildings: [], objects: [], rails: [], hot: [], occ: [] };
  /* — arterias (control de la curva en coordenadas del boceto) — */
  const road = (pts, w, step) => { const r = { pts: P(pts).map(q => [Math.max(-half + 2, Math.min(half - 2, q[0])), Math.max(-half + 2, Math.min(half - 2, q[1]))]), w, step: step || 2 }; D.roads.push(r); return r; };
  const AVE = road([[-10, 470], [120, 455], [260, 470], [380, 500], [500, 475], [640, 420], [780, 402], [900, 430], [1010, 415]], 12);
  const CEN = road([[470, -10], [500, 90], [450, 210], [470, 330], [500, 475], [520, 590], [500, 700], [520, 830], [490, 1010]], 10);
  const NWR = road([[90, 90], [160, 150], [230, 250], [300, 330], [350, 430], [378, 500]], 8), NER = road([[930, 70], [850, 140], [790, 250], [740, 340], [640, 420]], 8);
  const SWR = road([[80, 900], [170, 830], [260, 760], [400, 640], [470, 560], [510, 525]], 8), SER = road([[930, 920], [840, 860], [760, 760], [690, 690], [540, 690]], 8);
  road([[1010, 760], [900, 700], [790, 640], [700, 650]], 7); road([[640, 420], [670, 300], [640, 190], [600, 80], [590, -10]], 7); road([[300, 700], [260, 830], [300, 930], [330, 1010]], 7);
  road([[260, 470], [220, 380], [150, 330], [60, 300], [-10, 290]], 7); road([[780, 402], [830, 500], [920, 560], [1010, 540]], 7);
  const MAIN = D.roads.slice(), RI0 = MAPA.roadIndex(MAIN);
  /* — vía: tramos rectos siguiendo la curva del boceto (la vía de objetos.js es recta) — */
  let RAIL = []; { const rp = P([[-10, 742], [140, 735], [300, 700], [430, 708], [540, 690], [700, 650], [850, 600], [1010, 585]]); RAIL = rp;
    for (let i = 0; i < rp.length - 1; i++) { const a = rp[i], b = rp[i + 1], L = Math.hypot(b[0] - a[0], b[1] - a[1]); D.rails.push({ x: (a[0] + b[0]) / 2, z: (a[1] + b[1]) / 2, len: L, ry: -Math.atan2(b[1] - a[1], b[0] - a[0]) }); } }
  const nearRail = (x, z, m) => { for (let i = 0; i < RAIL.length - 1; i++) { const a = RAIL[i], b = RAIL[i + 1], dx = b[0] - a[0], dz = b[1] - a[1], L2 = dx * dx + dz * dz, t = Math.max(0, Math.min(1, ((x - a[0]) * dx + (z - a[1]) * dz) / L2)); if (Math.hypot(x - a[0] - dx * t, z - a[1] - dz * t) < m) return true; } return false; };
  /* — calles de barrio: rejilla girada por zona, recortada a una elipse; se cortan en las arterias, la vía y los refugios — */
  const REFS = [{ fac: 0, p: S(120, 110), face: 'e' }, { fac: 1, p: S(905, 175), face: 'w' }, { fac: 2, p: S(130, 840), face: 'e' }, { fac: 3, p: S(860, 835), face: 'w' }];
  const ZONES = [['casco', 470, 440, 215, 170, 20, 24, 60, 'old'], ['azul', 150, 165, 150, 130, 0, -32, 68, 'sub'], ['rojo', 870, 160, 140, 120, 0, 14, 80, 'ind'], ['ambar', 160, 830, 150, 120, 0, -20, 72, 'sub'],
                 ['violeta', 850, 850, 150, 130, 0, 38, 95, 'farm'], ['industria', 640, 760, 130, 70, -10, -10, 90, 'ind'], ['res_oeste', 130, 470, 90, 110, 0, -12, 62, 'sub'], ['res_este', 930, 470, 70, 100, 0, 20, 66, 'sub'],
                 ['norte', 650, 215, 120, 105, 0, -8, 70, 'sub'], ['este_c', 800, 320, 85, 60, 0, 16, 64, 'sub'], ['sur_c', 330, 885, 120, 95, 0, 12, 74, 'sub'], ['oeste_s', 110, 630, 85, 75, 0, -6, 66, 'sub'], ['centro_n', 390, 150, 60, 70, 0, 30, 66, 'sub']];
  const inEll = (x, y, c) => { const a = c[5] * Math.PI / 180, dx = x - c[1], dy = y - c[2], u = dx * Math.cos(a) + dy * Math.sin(a), v = -dx * Math.sin(a) + dy * Math.cos(a); return (u / c[3]) ** 2 + (v / c[4]) ** 2 <= 1; };
  const streets = [];                                                              // { zone, kind, pts (mundo) } para colocar casas
  for (const z of ZONES) {
    const a = z[6] * Math.PI / 180, R = Math.max(z[3], z[4]) + 30, sp = z[7];
    for (const dir of [0, 1]) for (let u = -R; u < R; u += sp * (.85 + rng() * .35)) {
      let cur = [];
      const tee = (a, b) => { const n = RI0.nearest(b[0], b[1]); if (!n || n.d > 30) return b; const dx = b[0] - a[0], dz = b[1] - a[1], L = Math.hypot(dx, dz) || 1, tx = n.road.idx ? 0 : 0; const q = COMP.nearest(n.road, b[0], b[1]).q; return Math.abs((dx * q.dx + dz * q.dz) / L) < .62 ? [n.x, n.z] : b; };   // T con la arteria sólo si llega casi de través
      const flush = () => { if (cur.length >= 3 && Math.hypot(cur[cur.length - 1][0] - cur[0][0], cur[cur.length - 1][1] - cur[0][1]) > 28) { const pts = [tee(cur[1], cur[0]), cur[Math.floor(cur.length / 2)], tee(cur[cur.length - 2], cur[cur.length - 1])]; streets.push({ zone: z[0], kind: z[8], pts }); } cur = []; };
      for (let v = -R; v <= R; v += 14) {
        const lu = u + Math.sin(v * .02 + u) * 6, X = dir ? v : lu, Y = dir ? lu : v, sx = z[1] + X * Math.cos(a) - Y * Math.sin(a), sy = z[2] + X * Math.sin(a) + Y * Math.cos(a), w = S(sx, sy);
        const free = inEll(sx, sy, z) && sx > 8 && sx < 992 && sy > 8 && sy < 992 && RI0.gap(w[0], w[1]) > 7 && !nearRail(w[0], w[1], 9) && REFS.every(r => Math.hypot(r.p[0] - w[0], r.p[1] - w[1]) > 34);
        if (free) cur.push(w); else flush();
      }
      flush();
    }
  }
  for (const st of streets) D.roads.push({ pts: st.pts, w: 6, step: 6 });
  D.RI = MAPA.roadIndex(D.roads);
  /* — refugios provisionales (la geometría definitiva es la Entrega 2) y plaza, aparcamientos, patios — */
  for (const r of REFS) D.refuges.push({ fac: r.fac, x: r.p[0], z: r.p[1], w: 44, d: 40, face: r.face, gate: 8 });
  for (const r of D.refuges) { COMP.refugeKit(D, Object.assign({ seed: 900 + r.fac }, r)); COMP.reserve(D, r.x, r.z, r.w / 2 + 2, r.d / 2 + 2, 'refugio'); }
  let pl = S(498, 500); for (let r = 0; r < 120; r += 4) { let ok = false; for (let a = 0; a < 6.28 && !ok; a += .5) { const x = pl[0] + Math.cos(a) * r, z = pl[1] + Math.sin(a) * r; if (D.RI.gap(x, z) > 30 && D.RI.gap(x + 26, z + 23) > 6 && D.RI.gap(x - 26, z - 23) > 6 && D.RI.gap(x + 26, z - 23) > 6 && D.RI.gap(x - 26, z + 23) > 6) { pl = [x, z - 6]; ok = true; } } if (ok) break; }
  D.surfaces.push({ t: 'cobble', x: pl[0], z: pl[1] + 6, w: 52, d: 46 }); COMP.reserve(D, pl[0], pl[1] + 6, 26, 23, 'plaza');
  /* — lugares: edificios con su entorno (A3) — */
  const B = (kind, at, side, extra) => COMP.frontage(D, Object.assign({ kind, at: S(at[0], at[1]), side }, extra || {}));
  const sup = B('super', [660, 380], -1), ph = B('pharm', [300, 480], 1), mi = B('mini', [180, 470], -1), cl = B('clinic', [408, 468], -1), mk = B('market', [560, 500], 1);
  const gs = B('gasshop', [790, 432], 1), gc = B('gascanopy', [830, 400], -1, { pad: 0 });
  if (sup) {                                                                       // aparcamiento junto al supermercado, a lo largo de la calle, con coches abandonados
    const tx = Math.abs(sup.nx) > Math.abs(sup.nz) ? 0 : 1, tz = 1 - tx, half_ = tx ? sup.f.hx : sup.f.hz, lx = sup.x + tx * (half_ + 22), lz = sup.z + tz * (half_ + 22);
    if (D.occ.every(o => Math.abs(o.x - lx) > o.hx + 20 || Math.abs(o.z - lz) > o.hz + 13)) { D.lots.push({ x: lx, z: lz, w: 40, d: 24 }); COMP.reserve(D, lx, lz, 20, 12, 'aparcamiento'); for (let i = 0; i < 6; i++) COMP.put(D, 'car', lx - 15 + i * 6 + (rng() - .5), lz + (i % 2 ? -4 : 4), Math.PI / 2, null, .1); }
  }
  /* estación y vía */
  { const st = COMP.building(D, { kind: 'station', x: S(540, 650)[0], z: S(540, 650)[1], rot: Math.PI }) || COMP.building(D, { kind: 'station', x: S(560, 640)[0], z: S(560, 640)[1], rot: Math.PI }); }
  /* naves, patio de carga y subestación */
  for (const [sx, sy, rot] of [[610, 780, 0], [705, 790, 0], [650, 838, Math.PI], [585, 840, Math.PI]]) COMP.building(D, { kind: 'warehouse', x: S(sx, sy)[0], z: S(sx, sy)[1], rot });
  for (const [sx, sy] of [[770, 735], [790, 700], [740, 700], [800, 770], [730, 780]]) { const b = COMP.building(D, { kind: 'substation', x: S(sx, sy)[0], z: S(sx, sy)[1], rot: Math.PI, clear: 2.2 }); if (b) { COMP.put(D, 'transformer', b.x + b.f.hx + 3, b.z, 0); COMP.put(D, 'switchCab', b.x - b.f.hx - 2, b.z + b.f.hz + 2, 0); COMP.put(D, 'transformer', b.x + b.f.hx + 3, b.z + 4, 0); break; } }
  COMP.footbridge(D, { x: S(560, 735)[0], z: S(560, 735)[1], axis: 'x' }); COMP.footbridge(D, { x: S(430, 660)[0], z: S(430, 660)[1], axis: 'z' });
  COMP.yard(D, { x: S(660, 740)[0], z: S(660, 740)[1], w: 30, d: 22, seed: 7001, n: 12 }); D.surfaces.push({ t: 'concrete', x: S(650, 800)[0], z: S(650, 800)[1], w: 120, d: 60 });
  COMP.camp(D, { x: pl[0], z: pl[1] + 6, seed: 7002 });
  /* casas: cada calle de barrio recibe casas a ambos lados con la puerta a la calle; se limita el total (el coste de dibujo manda hasta fusionar geometría) */
  { const cand = []; for (const st of streets) { const Pt = MAPA.pathPts(st.pts, 1); for (let i = 8; i < Pt.length - 8; i += 15) for (const side of [-1, 1]) { const q = Pt[i]; cand.push({ q, side, kind: st.kind, zone: st.zone, k: rng() }); } }
    cand.sort((a, b) => a.k - b.k); let nh = 0; const MAXH = 56, ph2 = ['house', 'house', 'house', 'mini'];
    for (const c of cand) { if (nh >= MAXH) break; if (c.kind === 'farm' && rng() < .5) continue; const kind = c.zone === 'casco' && rng() < .22 ? 'mini' : 'house', nx = -c.q.dz * c.side, nz = c.q.dx * c.side, rot = Math.round(Math.atan2(-nx, -nz) / (Math.PI / 2)) * (Math.PI / 2), f = OBJ.footprint(kind, rot, {}); if (!f) continue;
      const depth = Math.abs(Math.sin(rot)) > .5 ? f.hx : f.hz, off = 3 + 3.2 + 1.5 + depth;
      if (COMP.building(D, { kind, x: c.q.x + nx * off, z: c.q.z + nz * off, rot, pad: 2.5 })) nh++; }
    D.nHouses = nh; }
  /* cortes, puestos de control, torres y atascos (boceto: ✕ y puntos fuertes) */
  let sd = 100;
  for (const [x, y] of [[325, 300], [560, 418], [420, 590], [655, 520], [235, 258], [760, 340], [500, 640], [300, 520], [640, 650], [840, 500], [120, 640], [850, 720]]) COMP.cut(D, { x: S(x, y)[0], z: S(x, y)[1], kind: 'barricade', level: (x === 560 ? 3 : 1 + (sd % 3 === 0 ? 1 : 0)), seed: ++sd, jam: 70, maxD: 40 });
  for (const [x, y] of [[225, 235], [840, 262], [255, 770], [765, 770], [345, 370], [690, 420], [440, 640], [600, 640]]) COMP.cut(D, { x: S(x, y)[0], z: S(x, y)[1], kind: 'checkpoint', level: (y === 640 ? 3 : 2), seed: ++sd, jam: 50, maxD: 40 });
  for (const [x, y, lv] of [[180, 150, 1], [870, 220, 1], [190, 800, 1], [830, 800, 1], [500, 455, 3], [655, 375, 2], [540, 665, 3], [790, 425, 2]]) COMP.towerPost(D, { x: S(x, y)[0], z: S(x, y)[1], level: lv, seed: ++sd });
  /* atascos largos en la avenida y la calle central, mobiliario a lo largo de ellas */
  COMP.jam(D, { road: AVE, s0: 40, s1: 330, seed: 31 }); COMP.jam(D, { road: AVE, s0: 560, s1: 700, seed: 32 }); COMP.jam(D, { road: CEN, s0: 60, s1: 240, seed: 33 }); COMP.jam(D, { road: CEN, s0: 700, s1: 860, seed: 34 });
  COMP.street(D, { road: AVE, seed: 41, every: 36 }); COMP.street(D, { road: CEN, seed: 42, every: 40 });
  COMP.street(D, { road: AVE, seed: 43, every: 45, s0: 30, types: ['shutter', 'glassPane', 'kiosk'] }); COMP.street(D, { road: CEN, seed: 44, every: 50, s0: 30, types: ['shutter', 'glassPane', 'kiosk'] });
  for (const r of [NWR, NER, SWR, SER]) COMP.street(D, { road: r, seed: ++sd, every: 48 });
  /* hot points (zombis, objetivos y nidos del boceto) y restos alrededor */
  const NEST = [[300, 600], [610, 560], [760, 260], [420, 780], [220, 380], [590, 270], [940, 620], [330, 990]];
  const OBJV = [[500, 505], [430, 395], [660, 380], [790, 432], [540, 672], [670, 795], [385, 305], [210, 880]];
  const free = (x, z) => D.occ.every(o => Math.abs(o.x - x) > o.hx + 2.5 || Math.abs(o.z - z) > o.hz + 2.5) && D.RI.gap(x, z) > 1;
  const spot = w => { for (let r = 0; r <= 40; r += 3) for (let a = 0; a < 6.28; a += .6) { const x = w[0] + Math.cos(a) * r, z = w[1] + Math.sin(a) * r; if (free(x, z) && Math.abs(x) < half - 6 && Math.abs(z) < half - 6) return [x, z]; } return null; };
  for (const [x, y] of NEST.concat(OBJV)) { const w = spot(S(x, y)); if (w && REFS.every(r => Math.hypot(r.p[0] - w[0], r.p[1] - w[1]) > 40)) D.hot.push(w); }
  for (const [x, y] of NEST) COMP.scatter(D, { x: S(x, y)[0], z: S(x, y)[1], r: 14, n: 9, seed: ++sd });
  for (const [x, y] of OBJV) COMP.scatter(D, { x: S(x, y)[0], z: S(x, y)[1], r: 11, n: 6, seed: ++sd });
  return D;
};
})();
