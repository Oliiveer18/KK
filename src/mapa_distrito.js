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

/* ===================== DISTRITO v3 (1 km², cuadrícula recta y simétrica; `?mapa=6`) =====================
   Igualdad total entre facciones: se diseña UN cuarto (el del Azul, noroeste) y se copia girado 90°, 180° y 270° alrededor del centro (Azul → Rojo → Violeta → Ámbar).
   Con D.sym = 4, COMP.put / COMP.building / COMP.reserve colocan cada cosa en las 4 copias o en ninguna. Los objetivos de borde van con D.sym = 2 (giro de 180°):
   Fábrica al norte y al sur, Estación y supermercado al este y al oeste (cada facción tiene uno de cada a 437 m). La Plaza Mayor está en el centro exacto (618 m de cada refugio).
   Calles rectas en 4 categorías: avenidas en cruz (14 m), ronda interior (±250, 11 m), ronda exterior (±375, 8 m) y calles de barrio y de aldea (7 m). Manzanas de 125 m.
   Coordenadas del mundo: x → este, z → sur, norte arriba. Determinista. Lista exacta de ubicaciones: docs/DISTRITO_V3.md (tools/foto_distrito.py). */
MAPA.data.M2 = function () {
  const rng = (a => () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; })(20261126);
  const half = 500, PI = Math.PI, H = PI / 2;
  const D = { half, ground: 'grass', roads: [], surfaces: [], lots: [], refuges: [], buildings: [], objects: [], rails: [], hot: [], occ: [], trees: [], sym: 4, info: { roads: [], places: [], blocks: [], zones: [], nodes: [] } };
  const R = COMP.rot, KS = n => n === 4 ? [0, 1, 2, 3] : n === 2 ? [0, 2] : [0], FN = ['Azul', 'Rojo', 'Violeta', 'Ámbar'];
  const withSym = (n, f) => { const s = D.sym; D.sym = n; try { return f(); } finally { D.sym = s; } };
  /* ---------- calles: tramos del cuarto Azul que, girados, forman la red completa (los tramos en línea se funden en una sola calle) ---------- */
  const SEG = [[0, -375, 0, 0, 14],                     // mitad norte de la Avenida Norte-Sur (girada: las 4 medias avenidas)
    [-258.7, -250, 258.7, -250, 11],                     // ronda interior, lado norte
    [-452.2, -375, 375, -375, 8],                        // ronda exterior, lado norte (sigue al oeste hasta el acceso del refugio)
    [-445, -415, -445, -375, 8],                         // acceso del refugio (de la explanada del portón a la ronda exterior)
    [-125, -375, -125, 0, 7], [125, -375, 125, 0, 7],    // calles de barrio (mitades norte)
    [-375, -312.5, -125, -312.5, 7], [-312.5, -375, -312.5, -125, 7]];   // calles de la aldea (cruce en −312,5 / −312,5)
  const raw = [];
  for (const [x0, z0, x1, z1, w] of SEG) for (const k of KS(4)) { const a = R(k, x0, z0), b = R(k, x1, z1);
    if (Math.abs(a[0] - b[0]) < .01) raw.push({ axis: 'z', c: +a[0].toFixed(2), a0: Math.min(a[1], b[1]), a1: Math.max(a[1], b[1]), w });
    else raw.push({ axis: 'x', c: +a[1].toFixed(2), a0: Math.min(a[0], b[0]), a1: Math.max(a[0], b[0]), w }); }
  raw.sort((p, q) => (p.axis + p.c + '|' + p.w).localeCompare(q.axis + q.c + '|' + q.w) || p.a0 - q.a0);
  for (const r of raw) { const l = D.roads[D.roads.length - 1]; if (l && l.axis === r.axis && l.c === r.c && l.w === r.w && r.a0 <= l.a1 + .01) l.a1 = Math.max(l.a1, r.a1); else D.roads.push(Object.assign({}, r)); }
  const side = (axis, c) => axis === 'x' ? (c < 0 ? 'norte' : 'sur') : (c < 0 ? 'oeste' : 'este');
  for (const r of D.roads) {
    const ac = Math.abs(r.c);
    r.name = r.w === 14 ? (r.axis === 'x' ? 'Avenida Mayor (E-O)' : 'Avenida Norte-Sur') : r.w === 11 ? 'Ronda interior ' + side(r.axis, r.c) : ac === 375 ? 'Ronda exterior ' + side(r.axis, r.c)
      : r.w === 8 ? 'Acceso al refugio' : ac === 125 ? 'Calle de barrio ' + (r.axis === 'x' ? 'z ' : 'x ') + r.c : 'Calle de la aldea';
    D.info.roads.push({ name: r.name, w: r.w, pts: r.axis === 'x' ? [[r.a0, r.c], [r.a1, r.c]] : [[r.c, r.a0], [r.c, r.a1]] });
  }
  for (const r of D.roads) if (r.axis === 'x') for (const o of D.roads) if (o.axis === 'z' && o.c >= r.a0 - .01 && o.c <= r.a1 + .01 && r.c >= o.a0 - .01 && r.c <= o.a1 + .01) D.info.nodes.push({ id: 'X', x: o.c, z: r.c });
  const RD = (axis, c, at) => D.roads.find(r => r.axis === axis && Math.abs(r.c - c) < .01 && at >= r.a0 && at <= r.a1);
  D.RI = MAPA.roadIndex(D.roads);
  /* ---------- ayudas ---------- */
  const surf = (t, x, z, w, d, n) => { for (const k of KS(n || 4)) { const [a, b] = R(k, x, z); D.surfaces.push({ t, x: a, z: b, w: k % 2 ? d : w, d: k % 2 ? w : d }); } };
  const NAMES2 = { 0: ' (norte)', 2: ' (sur)' }, NAMES2W = { 0: ' (oeste)', 2: ' (este)' };
  const place = (id, name, x, z, n, nm2) => { for (const k of KS(n || 4)) { const [a, b] = R(k, x, z); D.info.places.push({ id: id === 'REF' ? 'REF-' + FN[k] : id, name: name + ((n || 4) === 4 ? (id === 'REF' ? ' ' + FN[k] : ' · ' + FN[k]) : (nm2 || NAMES2)[k] || ''), x: Math.round(a), z: Math.round(b), fac: (n || 4) === 4 ? k : -1 }); } };
  const zone = (name, x0, z0, x1, z1, n, nm2) => { for (const k of KS(n || 4)) { const [a, b] = R(k, x0, z0), [c, d] = R(k, x1, z1); D.info.zones.push({ name: name + ((n || 4) === 4 ? ' · ' + FN[k] : (nm2 || NAMES2)[k] || ''), x0: Math.round(Math.min(a, c)), z0: Math.round(Math.min(b, d)), x1: Math.round(Math.max(a, c)), z1: Math.round(Math.max(b, d)) }); } };
  const hot = (x, z, n) => { for (const k of KS(n || 4)) D.hot.push(R(k, x, z)); };
  const SET = 4.6;                                                                                       // fachada a 4,6 m del asfalto (1,4 m detrás de la acera)
  const front = (kind, axis, c, w, along, sd, extra) => { const f = OBJ.footprint(kind, 0, {}), off = w / 2 + SET + f.hz;
    return axis === 'x' ? COMP.building(D, Object.assign({ kind, x: along, z: c + sd * off, rot: sd > 0 ? PI : 0, pad: 1 }, extra || {}))
                        : COMP.building(D, Object.assign({ kind, x: c + sd * off, z: along, rot: sd > 0 ? -H : H, pad: 1 }, extra || {})); };
  const LOTS = [], row = (axis, c, w, sd, from, to, step) => { let n = 0; for (let a = from; a <= to + .01; a += step) if (front('house', axis, c, w, a, sd)) { n++; LOTS.push({ axis, c, w, sd, a, step }); } return n; };
  const free = (x, z, m) => D.occ.every(o => Math.abs(o.x - x) > o.hx + (m || 2) || Math.abs(o.z - z) > o.hz + (m || 2)) && D.RI.gap(x, z) > 4;
  const spot = (x, z) => { for (let r = 0; r <= 40; r += 3) for (let a = 0; a < 6.28; a += .6) { const px = x + Math.cos(a) * r, pz = z + Math.sin(a) * r; if (free(px, pz, 2.5) && Math.abs(px) < half - 8 && Math.abs(pz) < half - 8) return [px, pz]; } return null; };
  let sd = 200;
  /* ---------- 1. refugios (esquinas): 50 × 50 m, portón al sur hacia su acceso; dos torres de madera fuera del muro ---------- */
  const FACE = ['s', 'w', 'n', 'e'];
  for (const k of KS(4)) { const [x, z] = R(k, -445, -445); D.refuges.push({ fac: COMP.facRot(0, k), x, z, w: 50, d: 50, face: FACE[k], gate: 8 }); }
  COMP.refugeKit(D, { seed: 900, x: -445, z: -445, w: 50, d: 50, face: 's' });
  COMP.put(D, 'gate1', -447.1, -420, 0, { abierto: true, fac: 0 }, 0); COMP.put(D, 'gate1', -442.9, -420, 0, { abierto: true, fac: 0 }, 0);
  COMP.reserve(D, -445, -445, 26, 26, 'refugio'); surf('concrete', -445, -417.5, 10, 5);                     // explanada entre el portón y el acceso
  COMP.towerPost(D, { x: -405, z: -458, level: 1, fac: 0, seed: 950 }); COMP.towerPost(D, { x: -462, z: -404, level: 1, fac: 0, seed: 951 });
  place('REF', 'Refugio', -445, -445); zone('Refugio', -470, -470, -420, -420);
  /* ---------- 2. Plaza Mayor (centro exacto): 4 cuadros de adoquín en las esquinas del cruce, cada uno con el mismo campamento ---------- */
  surf('cobble', -30.1, -30.1, 39.8, 39.8);
  COMP.camp(D, { x: -30, z: -33, seed: 7002 });
  COMP.put(D, 'kiosk', -44, -18, 0); COMP.put(D, 'busStop', -30, -12.2, 0); COMP.put(D, 'floodlight', -13, -13, 0);
  for (const dx of [-40, -30, -20]) { COMP.put(D, 'shutter', dx - 2, -49.2, 0); COMP.put(D, 'glassPane', dx + 2.6, -49.2, 0); }
  COMP.reserve(D, -30.1, -30.1, 19.9, 19.9, 'plaza');
  D.info.places.push({ id: 'PLAZA', name: 'Plaza Mayor (objetivo central)', x: 0, z: 0, fac: -1 }); D.hot.push([-30, -30], [30, -30], [30, 30], [-30, 30]);
  zone('Plaza Mayor', -50, -50, 50, 50, 1);
  /* ---------- 3. retenes (antes que los edificios, para que tengan sitio): media avenida, y la ronda exterior a la salida de cada refugio, con torre ---------- */
  const rb = (r, x, z, extra) => { const n = COMP.nearest(r, x, z); COMP.roadblock(D, Object.assign({ road: r, s: n.s, seed: ++sd }, extra || {})); place('RET', 'Retén', n.q.x, n.q.z); };
  rb(RD('z', 0, -300), 0, -312);
  rb(RD('x', -375, -200), -200, -375, { tower: true, level: 2, fac: 0, side: 1 });
  rb(RD('z', -375, -200), -375, -200, { tower: true, level: 2, fac: 0, side: -1 });
  /* ---------- 4. objetivos de borde (comunes a dos facciones vecinas; simetría de 180°) ---------- */
  withSym(2, () => {
    // Fábrica (norte y sur): recinto de hierro en el centro con portón a la avenida, dos naves a los lados, dos patios de carga detrás y una pasarela
    surf('concrete', 0, -438.5, 246, 113, 2);
    COMP.compound(D, { at: [3, -385], side: -1, level: 3, w: 40, d: 28, seed: 8003, n: 10 });
    for (const x of [-70, 70]) front('warehouse', 'x', -375, 8, x, -1);
    COMP.yard(D, { x: -70, z: -458, w: 30, d: 22, seed: 7001, n: 10, gateSide: 1 }); COMP.yard(D, { x: 70, z: -458, w: 30, d: 22, seed: 7004, n: 10, gateSide: 1 });
    COMP.footbridge(D, { x: 0, z: -484, axis: 'x' });
    place('FAB', 'Fábrica', 0, -425, 2); hot(0, -425, 2); zone('Fábrica', -125, -500, 125, -379, 2);
    // Estación y supermercado (oeste y este): supermercado a la ronda, aparcamientos a ambos lados, estación detrás
    surf('concrete', -438.5, 0, 113, 246, 2);
    COMP.building(D, { kind: 'super', x: -392.5, z: 0, rot: H });                                  // a la ronda exterior, frente al final de la Avenida Mayor
    for (const lz of [-40, 40]) { for (const k of KS(2)) { const [a, b] = R(k, -403, lz); D.lots.push({ x: a, z: b, w: 40, d: 24 }); }
      for (let i = 0; i < 6; i++) COMP.put(D, 'car', -418 + i * 6, lz + (i % 2 ? -4 : 4), H, null, .1); COMP.reserve(D, -403, lz, 20, 12, 'aparcamiento'); }
    COMP.building(D, { kind: 'station', x: -458, z: 0, rot: H });
    place('EST', 'Estación y supermercado', -430, 0, 2, NAMES2W); hot(-430, 0, 2); zone('Estación y supermercado', -500, -125, -379, 125, 2, NAMES2W);
  });
  /* ---------- 5. objetivos y edificios propios de cada facción (cuarto Azul; se copia a los otros tres) ---------- */
  // comercios junto a la plaza: clínica a la Avenida Mayor, mercado a la Avenida Norte-Sur
  { const b = front('clinic', 'x', 0, 14, -80, -1); if (b) { place('CLI', 'Clínica', b.x, b.z); hot(b.x, b.z - 10); } }
  front('market', 'z', 0, 14, -80, -1);
  // casco: farmacia (a la Avenida Norte-Sur) y tienda (a la Avenida Mayor)
  { const b = front('pharm', 'z', 0, 14, -187, -1); if (b) { place('FAR', 'Farmacia', b.x, b.z); hot(b.x - 10, b.z); } }
  { const b = front('mini', 'x', 0, 14, -187, -1); if (b) { place('TIE', 'Tienda', b.x, b.z); hot(b.x, b.z - 10); } }
  // puesto avanzado (esquina de la ronda interior): gasolinera a la ronda y recinto de piedra con torre
  { const gc = front('gascanopy', 'x', -250, 11, -160, 1, { reserve: false, pad: 0 }); if (gc) for (const dx of [-5, 0, 5]) COMP.put(D, 'pump', gc.x + dx, gc.z, 0); front('gasshop', 'x', -250, 11, -205, 1);
    const c = COMP.compound(D, { at: [-187, -130], side: -1, level: 2, w: 36, d: 26, seed: 8002, n: 9 }); if (c) { place('PUE', 'Puesto avanzado', c.x, c.z); hot(c.x, c.z); } }
  // granjas (bandas exteriores): recinto de madera a la ronda exterior, casas y campo de cultivo detrás
  { const c1 = COMP.compound(D, { at: [-187, -380], side: -1, level: 1, w: 30, d: 22, seed: 8001, n: 7 }); if (c1) { place('GRA', 'Granja', c1.x, c1.z); hot(c1.x, c1.z); }
    const c2 = COMP.compound(D, { at: [-380, -187], side: 1, level: 1, w: 30, d: 22, seed: 8004, n: 7 }); if (c2) { place('GRA', 'Granja', c2.x, c2.z); hot(c2.x, c2.z); }
    surf('dirt', -187, -458, 104, 56); surf('dirt', -458, -187, 56, 104);
    for (const x of [-232, -142]) front('house', 'x', -375, 8, x, -1); for (const z of [-232, -142]) front('house', 'z', -375, 8, z, -1);
    zone('Granja 1', -250, -500, -125, -379); zone('Granja 2', -500, -250, -379, -125); }
  // aldea (entre las dos rondas, en la esquina): subestación vallada, torre en el cruce y casas a sus dos calles
  { const b = COMP.building(D, { kind: 'substation', x: -344, z: -346, rot: 0 }); if (b) { COMP.fenceRect(D, { x: -344, z: -344, w: 28, d: 22, gateSide: 1 }); place('SUB', 'Subestación', -344, -346); }
    COMP.towerPost(D, { x: -299, z: -299, level: 1, seed: 960 }); place('ALD', 'Aldea (cruce)', -312, -312);
    zone('Aldea', -375, -375, -250, -250); }
  /* ---------- 6. casas: filas a lo largo de las calles, con la puerta a la calle ---------- */
  let nh = 0; const ST = 26;                                                                             // parcelas de 26 m: casa, jardín trasero y coche delante
  nh += row('x', -312.5, 7, -1, -292, -140, ST) + row('x', -312.5, 7, 1, -292, -140, ST) + row('z', -312.5, 7, -1, -292, -140, ST) + row('z', -312.5, 7, 1, -292, -140, ST);   // aldea, a sus dos calles
  nh += row('x', -250, 11, -1, -236, -140, ST) + row('z', -250, 11, -1, -236, -140, ST);                                                                                   // aldea, a la ronda interior
  nh += row('x', -375, 8, 1, -104, -24, ST) + row('x', -250, 11, -1, -104, -24, ST) + row('z', -125, 7, 1, -352, -268, ST) + row('z', 0, 14, -1, -352, -268, ST);         // residencial 1
  nh += row('z', -375, 8, 1, -104, -24, ST) + row('z', -250, 11, -1, -104, -24, ST) + row('x', -125, 7, 1, -352, -268, ST) + row('x', 0, 14, -1, -352, -268, ST);         // residencial 2
  nh += row('x', -250, 11, 1, -104, -24, ST) + row('x', -125, 7, -1, -104, -24, ST) + row('z', -125, 7, 1, -230, -146, ST);                                                // casco 1
  nh += row('z', -250, 11, 1, -104, -24, ST) + row('z', -125, 7, -1, -104, -24, ST) + row('x', -125, 7, 1, -230, -146, ST) + row('x', 0, 14, -1, -236, -140, ST);          // casco 2
  nh += row('z', -125, 7, 1, -104, -52, ST) + row('x', -125, 7, 1, -104, -52, ST) + row('z', -125, 7, -1, -236, -150, ST);                                                 // comercios y puesto avanzado
  D.nHouses = nh * 4;
  /* jardines traseros (árboles instanciados: casi gratis de dibujar) y un coche aparcado delante de cada dos casas, en el carril de la acera */
  const GT = [];
  { const f = OBJ.footprint('house', 0, {});
    LOTS.forEach((L, i) => {
      const back = L.w / 2 + SET + 2 * f.hz + 7, at = (along, off) => L.axis === 'x' ? [along, L.c + L.sd * off] : [L.c + L.sd * off, along];
      for (const [da, dd] of [[-5, 0], [5, 5]]) { const [x, z] = at(L.a + da + (rng() - .5) * 2, back + dd + rng() * 2); if (D.RI.gap(x, z) > 9 && D.occ.every(o => Math.abs(o.x - x) > o.hx + 3 || Math.abs(o.z - z) > o.hz + 3) && GT.every(t => Math.hypot(t[0] - x, t[1] - z) > 6)) GT.push([x, z, +(.75 + rng() * .35).toFixed(2)]); }
      if (i % 2 === 0) { const lane = L.w / 2 - 1.3, [x, z] = at(L.a + 6, lane); COMP.put(D, 'car', x, z, L.axis === 'x' ? (L.sd > 0 ? 0 : PI) : (L.sd > 0 ? -H : H), null, .3); }
    });
    for (const t of GT) for (const k of KS(4)) { const [a, b] = R(k, t[0], t[1]); D.trees.push([+a.toFixed(1), +b.toFixed(1), t[2]]); } }
  zone('Residencial 1', -125, -375, 0, -250); zone('Residencial 2', -375, -125, -250, 0); zone('Puesto avanzado', -250, -250, -125, -125);
  zone('Casco 1 (farmacia)', -125, -250, 0, -125); zone('Casco 2 (tienda)', -250, -125, -125, 0); zone('Comercios', -125, -125, 0, 0);
  /* ---------- 7. atascos y mobiliario urbano (sólo en las calles del cuarto Azul: al girar cubren todas) ---------- */
  const CC = RD('z', 0, -300), IRN = RD('x', -250, 0), ORN = RD('x', -375, -200), LW = RD('z', -125, -300), LE = RD('z', 125, -300), AZ = RD('x', -312.5, -200), AX = RD('z', -312.5, -200);
  for (const [s0, s1] of [[8, 112], [136, 232], [262, 318]]) COMP.jam(D, { road: CC, s0, s1, seed: ++sd });
  for (const [s0, s1] of [[25, 118], [142, 232]]) COMP.jam(D, { road: IRN, s0, s1, gap: [14, 26], seed: ++sd });
  COMP.jam(D, { road: ORN, s0: 160, s1: 312, gap: [16, 28], seed: ++sd });
  COMP.street(D, { road: CC, s0: 6, s1: 362, every: 30, seed: ++sd }); COMP.street(D, { road: IRN, every: 40, seed: ++sd }); COMP.street(D, { road: ORN, s0: 90, every: 50, seed: ++sd });
  for (const r of [LW, LE]) COMP.street(D, { road: r, s0: 6, s1: 370, every: 45, seed: ++sd });
  for (const r of [AZ, AX]) COMP.street(D, { road: r, every: 40, seed: ++sd });
  COMP.fenceRun(D, { road: AZ, side: -1, s0: 14, s1: 236 });                                             // vallas de huerto en la calle de la aldea
  /* ---------- 8. nidos de zombis (en el interior de las manzanas y en los bosques) ---------- */
  for (const [x, z, nm] of [[-62, -312, 'residencial 1'], [-312, -62, 'residencial 2'], [-330, -448, 'bosque 1'], [-448, -330, 'bosque 2'], [-62, -187, 'casco']]) {
    const w = spot(x, z); if (w) { hot(w[0], w[1]); COMP.scatter(D, { x: w[0], z: w[1], r: 12, n: 8, seed: ++sd, types: ['crate', 'crateS', 'barrier', 'blocks', 'pallet', 'barrel'] }); place('NIDO', 'Nido de zombis (' + nm + ')', w[0], w[1]); } }
  /* ---------- 9. bosques propios (en L junto al refugio): árboles instanciados que esquivan calles, edificios y refugios ---------- */
  const FOR = [[-410, -495, -258, -386, 'Bosque 1'], [-495, -366, -386, -258, 'Bosque 2']];
  const treeOk = (x, z) => D.RI.gap(x, z) > 10 && D.occ.every(o => Math.abs(o.x - x) > o.hx + 5 || Math.abs(o.z - z) > o.hz + 5);
  for (const [x0, z0, x1, z1, name] of FOR) { let n = 0; surf('forest', (x0 + x1) / 2, (z0 + z1) / 2, x1 - x0, z1 - z0); zone(name, x0, z0, x1, z1);
    for (const k of KS(4)) { const [a, b] = R(k, x0, z0), [c, d] = R(k, x1, z1); D.info.blocks.push({ name: name + ' · ' + FN[k], x0: Math.min(a, c), z0: Math.min(b, d), x1: Math.max(a, c), z1: Math.max(b, d) }); }
    const mine = [];
    for (let tr = 0; tr < 5000 && n < 110; tr++) { const x = x0 + 6 + rng() * (x1 - x0 - 12), z = z0 + 6 + rng() * (z1 - z0 - 12); if (!treeOk(x, z)) continue; if (mine.some(t => Math.hypot(t[0] - x, t[1] - z) < 7.5)) continue;
      const sc = +(.9 + rng() * .5).toFixed(2); mine.push([x, z]); for (const k of KS(4)) { const [a, b] = R(k, x, z); D.trees.push([+a.toFixed(1), +b.toFixed(1), sc]); } n++; } }
  delete D.sym;
  return D;
};
})();
