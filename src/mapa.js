"use strict";
/* ===================== MAPA POR DATOS (distrito de la campaña) =====================
   Generador: convierte una descripción (src/mapa_distrito.js) en la escena. Suelos, calles con marcas, aceras, plazas, aparcamientos y refugios provisionales se
   dibujan fusionados por material (muy pocas llamadas de dibujo); edificios y objetos se colocan con placeObject (src/objetos.js, que debe cargarse antes).
   Convenciones: x hacia la derecha, z hacia la cámara (norte = z negativo). Un edificio con giro 0 tiene la puerta hacia +z. */
(function () {
const MAPA = window.MAPA = { data: {}, built: null };
const MA = {}; const mat = c => MA[c] || (MA[c] = new THREE.MeshStandardMaterial({ color: c, roughness: .95, flatShading: true }));
/* superficies: color y altura de la cara superior (las más altas tapan a las más bajas: sin parpadeo) */
const SURF = { asphalt: [0x35383e, .01], grass: [0x56713f, .02], forest: [0x3d5a31, .025], dirt: [0x6c5a44, .03], concrete: [0x85827c, .05], cobble: [0x7a6d60, .07], refuge: [0x6c685f, .058], sidewalk: [0x9d9b92, .13] };
const MARK = { white: 0xdbd8cb, yellow: 0xe3b942 };
const _q = new THREE.Quaternion(), _p = new V3(), _s = new V3();
const mkBox = (x, y, z, w, h, d) => ({ m: new THREE.Matrix4().compose(_p.set(x, y, z), _q.identity(), _s.set(w, h, d)) });
const _Y = new V3(0, 1, 0), mkBoxR = (x, y, z, w, h, d, yaw) => ({ m: new THREE.Matrix4().compose(_p.set(x, y, z), _q.setFromAxisAngle(_Y, yaw), _s.set(w, h, d)) });
/* calles curvas: `pts` = puntos de control [[x,z],…]; se suaviza con Catmull-Rom y se remuestrea cada `step` metros: [{x,z,dx,dz}] (dx,dz = tangente unitaria) */
function pathPts(pts, step) {
  const P = [pts[0]].concat(pts, [pts[pts.length - 1]]), dense = [];
  for (let i = 1; i < P.length - 2; i++) {
    const a = P[i - 1], b = P[i], c = P[i + 1], d = P[i + 2];
    for (let k = 0; k < 16; k++) { const t = k / 16, t2 = t * t, t3 = t2 * t; dense.push([.5 * (2 * b[0] + (-a[0] + c[0]) * t + (2 * a[0] - 5 * b[0] + 4 * c[0] - d[0]) * t2 + (-a[0] + 3 * b[0] - 3 * c[0] + d[0]) * t3), .5 * (2 * b[1] + (-a[1] + c[1]) * t + (2 * a[1] - 5 * b[1] + 4 * c[1] - d[1]) * t2 + (-a[1] + 3 * b[1] - 3 * c[1] + d[1]) * t3)]); }
  }
  dense.push(pts[pts.length - 1]);
  const out = []; let acc = 0, nx = 0, prev = dense[0];
  out.push({ x: prev[0], z: prev[1], dx: 1, dz: 0 });
  for (let i = 1; i < dense.length; i++) {
    let cur = dense[i], seg = Math.hypot(cur[0] - prev[0], cur[1] - prev[1]);
    while (seg > 1e-6 && acc + seg >= step) { const f = (step - acc) / seg; prev = [prev[0] + (cur[0] - prev[0]) * f, prev[1] + (cur[1] - prev[1]) * f]; out.push({ x: prev[0], z: prev[1], dx: 1, dz: 0 }); seg = Math.hypot(cur[0] - prev[0], cur[1] - prev[1]); acc = 0; }
    acc += seg; prev = cur;
  }
  if (Math.hypot(out[out.length - 1].x - prev[0], out[out.length - 1].z - prev[1]) > step * .3) out.push({ x: prev[0], z: prev[1], dx: 1, dz: 0 });
  for (let i = 0; i < out.length; i++) { const a = out[Math.max(0, i - 1)], b = out[Math.min(out.length - 1, i + 1)], l = Math.hypot(b.x - a.x, b.z - a.z) || 1; out[i].dx = (b.x - a.x) / l; out[i].dz = (b.z - a.z) / l; }
  return out;
}
MAPA.pathPts = pathPts;
/* índice espacial de calles curvas (celdas de 12 m): near(x,z,m,excluir) dice si el punto está sobre el asfalto de alguna calle (±m); gap(x,z) da la distancia al borde del asfalto más cercano */
MAPA.roadIndex = function (roads) {
  const H = new Map(), CS = 12, key = (i, j) => i * 100003 + j;
  for (const r of roads) { r.idx = r.idx || pathPts(r.pts || (r.axis === 'x' ? [[r.a0, r.c], [r.a1, r.c]] : [[r.c, r.a0], [r.c, r.a1]]), 2); for (const q of r.idx) { const k = key(Math.floor(q.x / CS), Math.floor(q.z / CS)); let a = H.get(k); if (!a) H.set(k, a = []); a.push({ x: q.x, z: q.z, hw: r.w / 2, r }); } }
  const each = (x, z, f) => { const ci = Math.floor(x / CS), cj = Math.floor(z / CS); for (let i = ci - 1; i <= ci + 1; i++) for (let j = cj - 1; j <= cj + 1; j++) { const a = H.get(key(i, j)); if (a) for (const q of a) { const r = f(q); if (r) return r; } } return null; };
  return {
    near: (x, z, m, ex) => !!each(x, z, q => q.r !== ex && (q.x - x) * (q.x - x) + (q.z - z) * (q.z - z) < (q.hw + m) * (q.hw + m)),
    gap: (x, z) => { let g = 1e9; each(x, z, q => { const d = Math.hypot(q.x - x, q.z - z) - q.hw; if (d < g) g = d; return null; }); return g; },
    nearest: (x, z) => { let b = null, bd = 1e9; each(x, z, q => { const d = Math.hypot(q.x - x, q.z - z); if (d < bd) { bd = d; b = q; } return null; }); return b ? { road: b.r, x: b.x, z: b.z, d: bd } : null; }
  };
};
/* colocar cualquier objeto del proyecto por su nombre: los 68 tipos de objetos.js y edificios (placeObject) y los 8 de siempre (cajas, vallas de madera, barreras de plástico,
   barriles, sacos, bloques), que placeObject no conoce y se crean con addProp. Devuelve el prop/edificio o null. */
const snapG = g => Math.round((g || 0) / (Math.PI / 2)) * (Math.PI / 2);
const VARIANT = { car: 1, taxi: 1, police: 1, van: 1, pickup: 1, truck: 1, bush: 1, hedge: 1 };
MAPA.put = function (t, x, z, g, o) {
  if (VARIANT[t] && !(o && o.param && o.param.v !== undefined)) { const h = Math.abs(Math.floor(x * 7.13 + z * 3.71)); o = Object.assign({}, o || {}, { param: Object.assign({}, o && o.param, { v: h % 3, ci: (h >> 2) % 6 }) }); }   // variante determinista por posición: 3 × 6 variantes que comparten geometría
  if (typeof PSPEC !== 'undefined' && PSPEC[t] && !(OBJ.types.indexOf(t) >= 0)) return addProp(t, x, z, snapG(g));
  return placeObject(t, x, z, g || 0, o);
};
/* medidas (semianchos hx, hz con el giro ya aplicado) de cualquier tipo, para colocar sin solapes */
const FPC = {};
MAPA.fp = function (t, g) {
  const k = t + '|' + (Math.abs(Math.sin(g || 0)) > .5 ? 1 : 0); if (FPC[k]) return FPC[k];
  let f = null;
  if (typeof PSPEC !== 'undefined' && PSPEC[t] && !(OBJ.types.indexOf(t) >= 0)) { const p = addProp(t, 1e4, 1e4, snapG(g)); f = { hx: p.hx, hz: p.hz, h: p.h }; OBJ.removeObject(p); }
  else { const q = OBJ.footprint(t, snapG(g), {}); if (q) f = { hx: q.hx, hz: q.hz, h: q.h || 0 }; }
  return FPC[k] = f;
};
function flush(group, buckets) {                                                      // una malla por material (en trozos de ≤1500 cajas para no pasar de 65k vértices)
  for (const c in buckets) { const L = buckets[c]; for (let i = 0; i < L.length; i += 1500) { const m = new THREE.Mesh(mergeParts(L.slice(i, i + 1500).map(b => ({ geo: geoBox, m: b.m }))), mat(+c)); m.receiveShadow = true; m.castShadow = false; group.add(m); } }
}
MAPA.build = function (D) {
  MAPA.clear(); const group = new THREE.Group(); scene.add(group); const B = {}, add = (c, x, y, z, w, h, d) => (B[c] || (B[c] = [])).push(mkBox(x, y, z, w, h, d));
  const rect = (t, x, z, w, d) => add(SURF[t][0], x, SURF[t][1] / 2, z, w, SURF[t][1], d), mark = (c, x, z, w, d) => add(MARK[c], x, .0145, z, w, .006, d);
  const out = { half: D.half, spawns: [[], [], [], []], hot: (D.hot || []).slice(), walls: [], props: [], buildings: [], rails: [], group };
  if (D.ground) OBJ.setGround(SURF[D.ground][0]);
  /* sin parpadeo: bajo cada edificio se recortan las superficies que quedarían a la altura de su suelo o por encima (tierra, hormigón, adoquín…);
     si no, el suelo de la tienda y el del terreno compiten píxel a píxel al entrar (el tejado deja de taparlo) */
  const HIGH = { dirt: 1, concrete: 1, cobble: 1, refuge: 1 }, under = [];
  for (const b of D.buildings || []) { const f = OBJ.slab && OBJ.slab(b.k, b.rot || 0); if (f) under.push({ x0: b.x - f.hx, x1: b.x + f.hx, z0: b.z - f.hz, z1: b.z + f.hz }); }
  const rectCut = (t, x, z, w, d) => {
    let L = [{ x0: x - w / 2, x1: x + w / 2, z0: z - d / 2, z1: z + d / 2 }];
    if (HIGH[t]) for (const c of under) { const N = []; for (const r of L) {
      if (c.x1 <= r.x0 || c.x0 >= r.x1 || c.z1 <= r.z0 || c.z0 >= r.z1) { N.push(r); continue; }
      if (c.z0 > r.z0) N.push({ x0: r.x0, x1: r.x1, z0: r.z0, z1: c.z0 }); if (c.z1 < r.z1) N.push({ x0: r.x0, x1: r.x1, z0: c.z1, z1: r.z1 });
      const z0 = Math.max(r.z0, c.z0), z1 = Math.min(r.z1, c.z1); if (c.x0 > r.x0) N.push({ x0: r.x0, x1: c.x0, z0, z1 }); if (c.x1 < r.x1) N.push({ x0: c.x1, x1: r.x1, z0, z1 }); } L = N; }
    for (const r of L) if (r.x1 - r.x0 > .01 && r.z1 - r.z0 > .01) rect(t, (r.x0 + r.x1) / 2, (r.z0 + r.z1) / 2, r.x1 - r.x0, r.z1 - r.z0);
  };
  for (const s of D.surfaces || []) rectCut(s.t, s.x, s.z, s.w, s.d);
  /* calles: asfalto, aceras a ambos lados, marcas centrales y de borde, pasos de cebra; se cortan donde se cruzan */
  const allRoads = D.roads || [], roads = allRoads.filter(r => !r.pts), curves = allRoads.filter(r => r.pts), SW = 3.2;
  for (const c of curves) c.dense = pathPts(c.pts, c.step || 2);
  const RI = MAPA.roadIndex(curves), onCurve = (x, z, ex, m) => RI.near(x, z, m, ex);
  const onGrid = (x, z, m) => { for (const o of roads) { const X = o.axis === 'x', a = X ? x : z, b = X ? z : x; if (a >= o.a0 - m && a <= o.a1 + m && Math.abs(b - o.c) < o.w / 2 + m) return true; } return false; };
  const crossings = r => roads.filter(o => o !== r && o.axis !== r.axis && o.c >= r.a0 && o.c <= r.a1 && r.c >= o.a0 && r.c <= o.a1);
  for (const r of roads) {
    const X = r.axis === 'x', len = r.a1 - r.a0, mid = (r.a0 + r.a1) / 2, cr = crossings(r);
    if (X) rect('asphalt', mid, r.c, len, r.w); else rect('asphalt', r.c, mid, r.w, len);
    const tramos = list => { const gaps = list.map(o => [o.c - o.w / 2, o.c + o.w / 2]).sort((a, b) => a[0] - b[0]), segs = []; let cur = r.a0;   // tramos entre cruces
      for (const g of gaps) { if (g[0] > cur) segs.push([cur, g[0]]); cur = Math.max(cur, g[1]); } if (cur < r.a1) segs.push([cur, r.a1]); return segs; };
    const reaches = (o, sg) => sg < 0 ? o.a0 < r.c - r.w / 2 - .1 : o.a1 > r.c + r.w / 2 + .1;     // la otra calle sale por este lado (en una T, la acera del lado contrario sigue entera)
    for (const sg of [-1, 1]) for (const [a, b] of tramos(cr.filter(o => reaches(o, sg)))) {
      const L = b - a, m = (a + b) / 2, o = sg * (r.w / 2 + SW / 2), e = sg * (r.w / 2 - .35);
      if (!curves.length) { if (X) rect('sidewalk', m, r.c + o, L, SW); else rect('sidewalk', r.c + o, m, SW, L); }
      else for (let t = a; t < b - .01; t += 2) { const l2 = Math.min(2, b - t), mm = t + l2 / 2, px = X ? mm : r.c + o, pz = X ? r.c + o : mm; if (onCurve(px, pz, null, .9)) continue; if (X) rect('sidewalk', mm, r.c + o, l2 + .02, SW); else rect('sidewalk', r.c + o, mm, SW, l2 + .02); }
      if (X) mark('white', m, r.c + e, L, .16); else mark('white', r.c + e, m, .16, L);                                                              // borde
    }
    for (const [a, b] of tramos(cr)) {
      const L = b - a, m = (a + b) / 2;
      const dbl = r.w >= 10;                                                                                                                       // avenidas: doble línea amarilla; calles: discontinua blanca
      if (dbl) { for (const sg of [-1, 1]) { if (X) mark('yellow', m, r.c + sg * .22, L, .14); else mark('yellow', r.c + sg * .22, m, .14, L); } }
      else for (let t = a + 1.5; t < b - 3; t += 8) { if (X) mark('white', t + 1.5, r.c, 3, .16); else mark('white', r.c, t + 1.5, .16, 3); }
    }
    for (const o of cr) for (const sg of [-1, 1]) { const at = o.c + sg * (o.w / 2 + 1.4); if (at - .75 < r.a0 || at + .75 > r.a1) continue;          // pasos de cebra a cada lado del cruce (no fuera de la calle)
      for (let k = -r.w / 2 + .8; k <= r.w / 2 - .7; k += 1.05) { if (X) mark('white', at, r.c + k, 1.5, .55); else mark('white', r.c + k, at, .55, 1.5); } }
  }
  /* calles curvas: asfalto, aceras (cortadas donde se cruzan con otra calle), bordes y línea central (doble amarilla si w ≥ 10, discontinua si no) */
  for (const c of curves) {
    const P = c.dense, cut = (x, z) => onGrid(x, z, .9) || onCurve(x, z, c, .9);
    for (let i = 0; i < P.length - 1; i++) {
      const a = P[i], b = P[i + 1], L = Math.hypot(b.x - a.x, b.z - a.z) + .5, mx = (a.x + b.x) / 2, mz = (a.z + b.z) / 2, yaw = -Math.atan2(b.z - a.z, b.x - a.x), nx = -(b.z - a.z) / (L - .5), nz = (b.x - a.x) / (L - .5);
      (B[SURF.asphalt[0]] = B[SURF.asphalt[0]] || []).push(mkBoxR(mx, SURF.asphalt[1] / 2, mz, L, SURF.asphalt[1], c.w, yaw));
      for (const sg of [-1, 1]) {
        const o = sg * (c.w / 2 + SW / 2), px = mx + nx * o, pz = mz + nz * o;
        if (!cut(px, pz)) (B[SURF.sidewalk[0]] = B[SURF.sidewalk[0]] || []).push(mkBoxR(px, SURF.sidewalk[1] / 2, pz, L, SURF.sidewalk[1], SW, yaw));
        const q = sg * (c.w / 2 - .35), bx = mx + nx * q, bz = mz + nz * q;
        if (!cut(bx, bz)) (B[MARK.white] = B[MARK.white] || []).push(mkBoxR(bx, .0145, bz, L, .006, .16, yaw));
      }
      if (cut(mx, mz)) continue;
      if (c.w >= 10) for (const sg of [-1, 1]) (B[MARK.yellow] = B[MARK.yellow] || []).push(mkBoxR(mx + nx * sg * .22, .0151, mz + nz * sg * .22, L, .006, .14, yaw));
      else if (Math.floor(i * (c.step || 2) / 6) % 2 === 0) (B[MARK.white] = B[MARK.white] || []).push(mkBoxR(mx, .0145, mz, L, .006, .16, yaw));
    }
  }
  for (const k of D.lots || []) {                                                       // aparcamientos: hormigón con plazas marcadas
    rectCut('concrete', k.x, k.z, k.w, k.d);
    for (let i = 0; i <= Math.floor(k.w / 3); i++) { const x = k.x - k.w / 2 + 1.5 + i * 3; if (x < k.x + k.w / 2 - .5) { mark('white', x, k.z - k.d / 2 + 3.2, .12, 5.2); mark('white', x, k.z + k.d / 2 - 3.2, .12, 5.2); } }
  }
  /* refugios provisionales (muros bajos de bloque y un hueco de portón; la geometría definitiva es la Entrega 2) */
  const wallBox = (x, z, w, d, h, fac) => { const FM = FACM[fac % FACM.length];
    const m = new THREE.Mesh(geoBox, FM.uni); m.scale.set(w, h, d); m.position.set(x, h / 2, z); m.castShadow = m.receiveShadow = true; group.add(m);
    const c = new THREE.Mesh(geoBox, FM.acc); c.scale.set(w + .1, .14, d + .1); c.position.set(x, h + .07, z); c.receiveShadow = true; group.add(c);
    const bx = { x, z, hx: w / 2, hz: d / 2, h, wall: true }; boxes.push(bx); out.walls.push(bx); };
  for (const R of D.refuges || []) {
    rect('refuge', R.x, R.z, R.w, R.d); const T = .8, H = 3, g = R.gate, hw = R.w / 2, hd = R.d / 2;
    const side = (nx, nz, len, horiz, gateHere) => {                                  // lado con o sin hueco de portón
      if (!gateHere) { horiz ? wallBox(R.x + nx, R.z + nz, len, T, H, R.fac) : wallBox(R.x + nx, R.z + nz, T, len, H, R.fac); return; }
      const half = (len - g) / 2; for (const sg of [-1, 1]) { const o = sg * (g / 2 + half / 2); horiz ? wallBox(R.x + nx + o, R.z + nz, half, T, H, R.fac) : wallBox(R.x + nx, R.z + nz + o, T, half, H, R.fac); }
    };
    if (!R.noWalls) { side(0, -hd, R.w, true, R.face === 'n'); side(0, hd, R.w, true, R.face === 's'); side(-hw, 0, R.d, false, R.face === 'w'); side(hw, 0, R.d, false, R.face === 'e'); }   // noWalls: el muro son tramos de objetos (wall1…) puestos por los datos del mapa
    const dir = { n: [0, -1], s: [0, 1], w: [-1, 0], e: [1, 0] }[R.face], yaw = Math.atan2(dir[0], dir[1]);
    { const cx = R.x + dir[0] * (hw - 7), cz = R.z + dir[1] * (hd - 7); for (let i = 0; i < 6; i++) out.spawns[R.fac].push({ x: dir[1] ? cx + (i - 2.5) * 4 : cx, z: dir[1] ? cz : cz + (i - 2.5) * 4, yaw }); }      // 6 puntos de aparición dentro, cerca del portón
    const e = placeObject('emblem' + R.fac, R.x + dir[0] * (hw + .1), R.z + dir[1] * (hd + .1), Math.atan2(dir[0], dir[1]), { fac: R.fac }); if (e) out.props.push(e);
  }
  flush(group, B);
  if (D.trees && D.trees.length && D.half <= 200) for (const m of treeMeshes(D.trees, out)) group.add(m);   // mapas grandes: árboles por sector (sectorize)
  for (const r of D.rails || []) out.rails.push(OBJ.rails(r.x, r.z, r.len, r.ry || 0));
  for (const b of D.buildings || []) { const r = placeObject(b.k, b.x, b.z, b.rot || 0, { fac: b.fac }); if (r) out.buildings.push(r); }
  /* puertas siempre libres: nada a 2,6 m delante ni detrás de ninguna puerta (casas, tiendas, persianas, verjas), con 0,6 m de margen a los lados */
  const KEEP = []; for (const b of out.buildings) for (const d of b.doors || []) { const ax = d.hx >= d.hz; KEEP.push(ax ? { x0: d.x - d.hx - .6, x1: d.x + d.hx + .6, z0: d.z - 2.6, z1: d.z + 2.6 } : { x0: d.x - 2.6, x1: d.x + 2.6, z0: d.z - d.hz - .6, z1: d.z + d.hz + .6 }); }
  out.doorSkipped = 0;
  for (const o of D.objects || []) {
    if (KEEP.length && !/^(door|gate|wall|wallLow|emblem)/.test(o.t)) { const f = MAPA.fp(o.t, o.g || 0); if (f && KEEP.some(k => o.x + f.hx > k.x0 && o.x - f.hx < k.x1 && o.z + f.hz > k.z0 && o.z - f.hz < k.z1)) { out.doorSkipped++; continue; } }
    const r = MAPA.put(o.t, o.x, o.z, o.g || 0, o.o); if (r) out.props.push(r); }
  out.info = D.info || null; MAPA.built = out;
  if (D.half > 200) { sectorize(out, D); if (!MAPA.defer) MAPA.post('all'); }   // con carga progresiva (MAPA.defer) los pasos de MAPA.post los va dando la pantalla de carga
  return out;
};
/* ---------- sectores (mapas grandes): los objetos y edificios fijos cuelgan de grupos de 32 × 32 m; cada fotograma sólo se dejan visibles los sectores que
   tocan lo que ve la cámara (con margen para sombras y objetos grandes), así Three.js no recorre ni calcula matrices ni recorta las ~80.000 piezas del resto
   del mapa. No cambia nada de lo que se ve: lo que está en pantalla se dibuja igual. scene.remove sigue funcionando para lo que cuelga de un sector. ---------- */
/* bosques: árboles instanciados (3 mallas por lote) con caja de colisión sólo en el tronco */
const TREE_GEO = {}; MAPA.TREE_GEO = TREE_GEO;
/* Árboles instanciados por sector y especie: 0 conífera (tronco y dos conos), 1 frondoso (tronco y copa redonda), 2 seco (tronco y ramas, sin copa). Las copas se desvanecen
   (tramado) cerca del jugador para que un bosque denso no tape la acción desde la cámara cenital: uniform MAPA.canopy = (x, z, radio) que actualiza MAPA.cull. */
MAPA.canopy = { value: new V3(0, 0, -1) };
function fadeCanopy(m) {
  m.onBeforeCompile = sh => {
    sh.uniforms.uCan = MAPA.canopy;
    sh.vertexShader = 'varying vec3 vWP;\n' + sh.vertexShader.replace('#include <begin_vertex>', '#include <begin_vertex>\n vec4 wp4 = vec4(transformed, 1.0);\n #ifdef USE_INSTANCING\n wp4 = instanceMatrix * wp4;\n #endif\n vWP = (modelMatrix * wp4).xyz;');
    sh.fragmentShader = 'varying vec3 vWP;\nuniform vec3 uCan;\n' + sh.fragmentShader.replace('void main() {', 'void main() {\n if (uCan.z > 0.0 && vWP.y > 2.0) { float dd = length(vWP.xz - uCan.xy); float f = smoothstep(uCan.z * 0.55, uCan.z, dd); if (f < fract(sin(dot(gl_FragCoord.xy, vec2(12.9898, 78.233))) * 43758.5453)) discard; }');
  };
  m.customProgramCacheKey = () => 'copa-tramada'; return m;
}
function treeMeshes(list, out) {
  const T = TREE_GEO;
  if (!T.t) {
    T.t = new THREE.CylinderGeometry(.22, .3, 2.4, 6); T.c1 = new THREE.ConeGeometry(1.7, 3.2, 7); T.c2 = new THREE.ConeGeometry(1.25, 2.6, 7);
    T.mt = new THREE.MeshStandardMaterial({ color: 0x4e3b2a, roughness: 1, flatShading: true }); T.m1 = fadeCanopy(new THREE.MeshStandardMaterial({ color: 0x2f4a2a, roughness: 1, flatShading: true })); T.m2 = fadeCanopy(new THREE.MeshStandardMaterial({ color: 0x3a5a30, roughness: 1, flatShading: true }));
    T.cb = new THREE.IcosahedronGeometry(1.75, 1); T.mb = fadeCanopy(new THREE.MeshStandardMaterial({ color: 0x5a8a3a, roughness: 1, flatShading: true })); T.tb = new THREE.CylinderGeometry(.2, .32, 3.0, 6);
    const br = []; for (const [rx, rz, a] of [[.7, 0, .9], [-.6, .3, -.8], [.1, -.7, .7], [-.2, .6, -.6]]) { const c = new THREE.CylinderGeometry(.04, .1, 1.5, 4); c.rotateZ(a * (rx < 0 ? 1 : -1)); c.rotateY(Math.atan2(rz, rx)); c.translate(rx * .5, 3.1 + Math.abs(a) * .3, rz * .5); br.push(c); }
    T.dead = (() => { const g = new THREE.BufferGeometry(); const pos = [], nor = []; for (const c of br) { const ng = c.toNonIndexed(), pa = ng.attributes.position, na = ng.attributes.normal; for (let i = 0; i < pa.count; i++) { pos.push(pa.getX(i), pa.getY(i), pa.getZ(i)); nor.push(na.getX(i), na.getY(i), na.getZ(i)); } }
      g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3)); return g; })();
    T.td = new THREE.CylinderGeometry(.16, .3, 3.6, 5); T.md = new THREE.MeshStandardMaterial({ color: 0x6b5f52, roughness: 1, flatShading: true });
  }
  const M4 = new THREE.Matrix4(), q = new THREE.Quaternion(), sc = new V3(), ps = new V3(), res = [];
  const by = [[], [], []]; for (const t of list) by[t[3] || 0].push(t);
  const mk = (geo, mat, n) => { const m = new THREE.InstancedMesh(geo, mat, n); m.castShadow = true; m.receiveShadow = true; m.frustumCulled = false; res.push(m); return m; };
  by.forEach((L, sp) => {
    if (!L.length) return; const n = L.length;
    const tr = mk(sp === 0 ? T.t : sp === 1 ? T.tb : T.td, T.mt, n), a = sp === 0 ? mk(T.c1, T.m1, n) : sp === 1 ? mk(T.cb, T.mb, n) : mk(T.dead, T.md, n), b = sp === 0 ? mk(T.c2, T.m2, n) : null;
    L.forEach((t, i) => { const k = t[2] || 1, ry = (t[0] * 7.3 + t[1] * 3.1) % 6.28; q.setFromAxisAngle(_Y, ry);
      M4.compose(ps.set(t[0], (sp === 0 ? 1.2 : sp === 1 ? 1.5 : 1.8) * k, t[1]), q, sc.set(k, k, k)); tr.setMatrixAt(i, M4);
      if (sp === 0) { M4.compose(ps.set(t[0], 3.7 * k, t[1]), q, sc.set(k, k, k)); a.setMatrixAt(i, M4); M4.compose(ps.set(t[0], 5.3 * k, t[1]), q, sc.set(k, k, k)); b.setMatrixAt(i, M4); }
      else if (sp === 1) { M4.compose(ps.set(t[0], 4.2 * k, t[1]), q, sc.set(k, k * .9, k)); a.setMatrixAt(i, M4); }
      else { M4.compose(ps.set(t[0], 0, t[1]), q, sc.set(k, k, k)); a.setMatrixAt(i, M4); }
      const bx = { x: t[0], z: t[1], hx: .32 * k, hz: .32 * k, h: 3, wall: true, tree: true, ti: { tr, a, b, i, sp, k, ry } }; boxes.push(bx); out.walls.push(bx); });
    for (const m of [tr, a, b]) if (m) m.instanceMatrix.needsUpdate = true;
  });
  return res;
}
const SEC = 32, SEC_M = 12;
function sectorize(out, D) {
  if (!scene.__secPatch) { scene.__secPatch = true; const rm = THREE.Object3D.prototype.remove;
    scene.remove = function () { for (const o of arguments) { if (o && o.parent && o.parent !== scene && o.parent.__sector) o.parent.remove(o); else rm.call(scene, o); } return scene; }; }
  const S = new Map(), list = [];
  const sec = (x, z) => { const i = Math.floor(x / SEC), j = Math.floor(z / SEC), k = i * 1000 + j; let g = S.get(k);
    if (!g) { g = new THREE.Group(); g.__sector = true; g.__i = i; g.__j = j; g.matrixAutoUpdate = false; g.box = new THREE.Box3(new V3(i * SEC - SEC_M, -1, j * SEC - SEC_M), new V3((i + 1) * SEC + SEC_M, 16, (j + 1) * SEC + SEC_M));
      g.updateMatrixWorld = function (f) { if (this.visible) THREE.Object3D.prototype.updateMatrixWorld.call(this, f); }; S.set(k, g); list.push(g); scene.add(g); }
    return g; };
  const move = o => { if (o && o.parent === scene) sec(o.position.x, o.position.z).add(o); };
  for (const p of props) move(p.g);
  if (typeof OBJ !== 'undefined' && OBJ.buildings) for (const b of OBJ.buildings) move(b.group);
  for (const r of out.rails) move(r);
  if (D.trees && D.trees.length) { const by = new Map(); for (const t of D.trees) { const g = sec(t[0], t[1]); let a = by.get(g); if (!a) by.set(g, a = []); a.push(t); }
    for (const [g, a] of by) for (const m of treeMeshes(a, out)) g.add(m); }
  out.sectors = list;
}
/* ---------- deduplicación (sin cambiar nada de lo que se ve): materiales, texturas y geometrías idénticos pasan a ser uno solo ----------
   Texturas: misma imagen y mismo ajuste (repetición, desplazamiento, envoltura, filtros, anisotropía) → una sola textura en la GPU (había 875 para 42 imágenes).
   Materiales: mismas propiedades que afectan al dibujo → uno solo (había ~8.000 para ~1.100 distintos). Se respetan los marcados userData.noShare (tejados que
   se desvanecen por su cuenta). Geometrías: mismos atributos byte a byte → una sola. Devuelve cuántos había y cuántos quedan. */
const TEXK = ['repeat', 'offset', 'center'], MATK = ['type', 'roughness', 'metalness', 'opacity', 'transparent', 'alphaTest', 'side', 'depthWrite', 'depthTest', 'blending', 'vertexColors', 'flatShading', 'wireframe', 'fog', 'toneMapped', 'emissiveIntensity', 'polygonOffset', 'polygonOffsetFactor', 'polygonOffsetUnits', 'colorWrite', 'premultipliedAlpha', 'visible', 'dithering', 'shadowSide', 'skinning', 'morphTargets', 'envMapIntensity', 'reflectivity', 'refractionRatio', 'aoMapIntensity', 'lightMapIntensity', 'bumpScale', 'displacementScale', 'displacementBias', 'normalMapType', 'combine', 'sizeAttenuation', 'clipShadows', 'clipIntersection'];
const MAPK = ['map', 'normalMap', 'roughnessMap', 'metalnessMap', 'emissiveMap', 'alphaMap', 'aoMap', 'lightMap', 'bumpMap', 'displacementMap', 'envMap', 'specularMap'];
let _imgId = 0; const imgId = im => im ? (im.__did || (im.__did = ++_imgId)) : 0;
function geoKey(g) {
  if (g.isInstancedBufferGeometry || !g.attributes || !g.attributes.position) return null;
  let h = 2166136261; const mix = v => { h ^= v; h = Math.imul(h, 16777619) >>> 0; };
  const names = Object.keys(g.attributes).sort(); for (const n of names) { const a = g.attributes[n]; mix(a.itemSize); mix(a.count); const u = new Uint32Array(a.array.buffer, a.array.byteOffset, (a.array.byteLength / 4) | 0); for (let i = 0; i < u.length; i++) mix(u[i]); }
  if (g.index) { mix(g.index.count); const ia = g.index.array; for (let i = 0; i < ia.length; i++) mix(ia[i]); }
  for (const gr of g.groups) { mix(gr.start); mix(gr.count); mix(gr.materialIndex || 0); }
  return names.join(',') + ':' + g.attributes.position.count + ':' + (g.index ? g.index.count : 0) + ':' + h;
}
function geoSame(a, b) {                                                              // comprobación completa (el hash podría coincidir por azar)
  const na = Object.keys(a.attributes).sort(), nb = Object.keys(b.attributes).sort(); if (na.join() !== nb.join()) return false;
  for (const n of na) { const x = a.attributes[n], y = b.attributes[n]; if (x.itemSize !== y.itemSize || x.count !== y.count || x.normalized !== y.normalized || x.array.length !== y.array.length) return false; for (let i = 0; i < x.array.length; i++) if (x.array[i] !== y.array[i]) return false; }
  if (!!a.index !== !!b.index) return false; if (a.index) { if (a.index.count !== b.index.count) return false; for (let i = 0; i < a.index.array.length; i++) if (a.index.array[i] !== b.index.array[i]) return false; }
  if (a.groups.length !== b.groups.length) return false; for (let i = 0; i < a.groups.length; i++) { const p = a.groups[i], q = b.groups[i]; if (p.start !== q.start || p.count !== q.count || (p.materialIndex || 0) !== (q.materialIndex || 0)) return false; }
  return true;
}
const T = new Map(), Mt = new Map(), G = new Map(), _MC = new WeakMap();                                // persistentes: lo que se construya después (piezas que vuelven) reutiliza lo mismo
MAPA.canon = root => MAPA.dedupe([root]);
MAPA.dedupe = function (roots) {
  roots = [].concat(roots || scene); const seenM = new Set(), seenT = new Set(), seenG = new Set();
  const texOf = t => { if (!t) return t; seenT.add(t); const im = t.image; if (!im) return t;
    const k = [imgId(im), t.wrapS, t.wrapT, t.magFilter, t.minFilter, t.anisotropy, t.format, t.type, t.encoding, t.flipY, t.generateMipmaps, t.premultiplyAlpha, t.unpackAlignment, t.rotation, t.matrixAutoUpdate].join('|') + '|' + TEXK.map(n => t[n].x.toFixed(5) + ',' + t[n].y.toFixed(5)).join('|');
    const c = T.get(k); if (c) return c; T.set(k, t); return t; };
  const matOf = m => { const mm = _MC.get(m); if (mm) return mm; const r = matOf0(m); _MC.set(m, r); return r; };
  const matOf0 = m => { seenM.add(m); for (const n of MAPK) if (m[n]) m[n] = texOf(m[n]); if (m.userData && m.userData.noShare) return m;
    const k = MATK.map(n => m[n] === undefined ? '' : m[n]).join('|') + '|' + (m.color ? m.color.getHex() : '') + '|' + (m.emissive ? m.emissive.getHex() : '') + '|' + MAPK.map(n => m[n] ? m[n].uuid : '').join(',') + '|' + (m.normalScale ? m.normalScale.x + ',' + m.normalScale.y : '') + '|' + (m.defines ? JSON.stringify(m.defines) : '') + '|' + (m.onBeforeCompile && m.onBeforeCompile.toString !== Function.prototype.toString ? String(m.onBeforeCompile) : '');
    const c = Mt.get(k); if (c) return c; Mt.set(k, m); return m; };
  const gk0 = new Map(); const geoOf = g => { seenG.add(g); let k = gk0.get(g); if (k === undefined) gk0.set(g, k = geoKey(g)); if (!k) return g; const L = G.get(k) || []; for (const c of L) if (c === g || geoSame(c, g)) return c; L.push(g); G.set(k, L); return g; };
  /* los materiales que el juego reconoce por identidad (tablón → carbonizado, bidón rojo → quemado) quedan como los canónicos */
  for (const tb of [typeof PM !== 'undefined' && PM, typeof BM !== 'undefined' && BM]) if (tb) for (const n in tb) if (tb[n] && tb[n].isMaterial) tb[n] = matOf(tb[n]);
  for (const root of roots) root.traverse(o => { if (!o.isMesh || o.isSkinnedMesh) return;
    if (Array.isArray(o.material)) o.material = o.material.map(matOf); else if (o.material) o.material = matOf(o.material);
    if (o.geometry && !o.isInstancedMesh) o.geometry = geoOf(o.geometry); });
  const keptT = new Set(T.values()), keptM = new Set(Mt.values());
  let gk = 0; for (const L of G.values()) gk += L.length;
  for (const m of seenM) if (!keptM.has(m) && !(m.userData && m.userData.noShare)) m.dispose();
  for (const t of seenT) if (!keptT.has(t) && t.image) t.dispose();
  for (const g of seenG) { const k = gk0.get(g); if (k && !(G.get(k) || []).includes(g)) g.dispose(); }
  return { materiales: [seenM.size, keptM.size + [...seenM].filter(m => m.userData && m.userData.noShare).length], texturas: [seenT.size, keptT.size], geometrias: [seenG.size, gk] };
};
/* ---------- objetos intactos fusionados (sin cambiar nada de lo que se ve) ----------
   Cada objeto del distrito (valla, coche, muro, mueble…) está hecho de muchas piezas sueltas (≈155.000 en total, ~215 MB de memoria sólo en ellas).
   Mientras un objeto está intacto se dibuja con UNA malla por material (sus piezas soldadas en su sitio exacto) y sus piezas se liberan. En cuanto se
   toca (bala, explosión, fuego, abrir/cerrar, romper), se vuelven a construir sus piezas reales, idénticas (misma semilla de azar, facción y medidas),
   y el objeto se comporta igual que siempre: marcas de bala, piezas que saltan, carbonizado, puertas. Lo transparente (cristales, brillos) no se
   suelda: se queda como pieza propia. Las mallas soldadas idénticas (mismo tipo, misma forma) comparten geometría. */
const _lzInv = new THREE.Matrix4(), _lzRel = new THREE.Matrix4(), _lzN = new THREE.Matrix3(), _lzV = new V3();
const LZ_GEO = new Map(), _gids = new WeakMap(); let _gidN = 0; const lzGid = g => _gids.get(g) || (_gids.set(g, ++_gidN), _gidN);
function lzOk(o) {                                                                  // pieza que se puede soldar sin cambiar la imagen
  if (!o.isMesh || o.isInstancedMesh || o.isSkinnedMesh || Array.isArray(o.material) || !o.material) return false;
  const m = o.material, g = o.geometry; if (m.transparent || !m.depthWrite || m.alphaTest > 0 || m.userData.noShare) return false;
  if (!g || !g.attributes.position || g.morphAttributes && Object.keys(g.morphAttributes).length) return false;
  if (g.drawRange.start !== 0 || g.drawRange.count !== Infinity) return false;
  if (o.onBeforeRender !== THREE.Object3D.prototype.onBeforeRender || o.renderOrder) return false;
  return true;
}
function lzMerge(list) {                                                            // list: [{o, rel}] con la misma lista de atributos
  const names = Object.keys(list[0].o.geometry.attributes); let nv = 0, ni = 0;
  for (const it of list) { const g = it.o.geometry; nv += g.attributes.position.count; ni += g.index ? g.index.count : g.attributes.position.count; }
  const out = new THREE.BufferGeometry(), arr = {};
  for (const n of names) { const a0 = list[0].o.geometry.attributes[n]; arr[n] = new Float32Array(nv * a0.itemSize); }
  const idx = nv > 65535 ? new Uint32Array(ni) : new Uint16Array(ni); let vo = 0, io = 0;
  for (const it of list) {
    const g = it.o.geometry, cnt = g.attributes.position.count, rel = it.rel, flip = rel.determinant() < 0; _lzN.getNormalMatrix(rel);
    for (const n of names) {
      const a = g.attributes[n], sz = a.itemSize, dst = arr[n];
      for (let i = 0; i < cnt; i++) {
        if (n === 'position') { _lzV.fromBufferAttribute(a, i).applyMatrix4(rel); dst[(vo + i) * 3] = _lzV.x; dst[(vo + i) * 3 + 1] = _lzV.y; dst[(vo + i) * 3 + 2] = _lzV.z; }
        else if (n === 'normal') { _lzV.fromBufferAttribute(a, i).applyMatrix3(_lzN).normalize(); dst[(vo + i) * 3] = _lzV.x; dst[(vo + i) * 3 + 1] = _lzV.y; dst[(vo + i) * 3 + 2] = _lzV.z; }
        else for (let c = 0; c < sz; c++) dst[(vo + i) * sz + c] = a.array[i * sz + c];   // uv, color…: tal cual (atributos simples, sin entrelazar)
      }
    }
    const src = g.index ? g.index.array : null, k = src ? src.length : cnt;
    for (let t = 0; t < k; t += 3) { const a = src ? src[t] : t, b = src ? src[t + 1] : t + 1, c = src ? src[t + 2] : t + 2;
      idx[io++] = vo + a; if (flip) { idx[io++] = vo + c; idx[io++] = vo + b; } else { idx[io++] = vo + b; idx[io++] = vo + c; } }
    vo += cnt;
  }
  for (const n of names) out.setAttribute(n, new THREE.BufferAttribute(arr[n], list[0].o.geometry.attributes[n].itemSize));
  out.setIndex(new THREE.BufferAttribute(idx, 1)); return out;
}
function lzIntact(p) {
  return !p.dead && !p.lz && !p.stage && !p.rec && !(p.decals && p.decals.length) && !p.burning && !(p.burnT > 0) && !(p.holes && p.holes.length) && !p.charred
    && p.wob < .001 && p.v.lengthSq() < 1e-8 && !p.alarmOn && p.g.scale.y === 1 && p.g.parent && (!p.o || !p.o.leaves || p.oT === 0 || p.oT === 1) && PSPEC[p.type] && p.seed !== undefined;
}
const lzPKey = v => v && typeof v === 'object' ? (v.uuid || Object.keys(v).sort().map(k => k + ':' + lzPKey(v[k])).join(';')) : String(v);
MAPA.lazify = function (list) {
  let n = 0, pcs = 0, meshes = 0, reused = 0; const VAR = new Map();
  for (const p of list || props) {
    if (!lzIntact(p)) continue; const g = p.g;
    /* objetos iguales (mismo tipo, facción y medidas, sin azar): se reutiliza lo soldado del primero, sin volver a soldar */
    const vk = p.lzRnd === 0 && !(p.o && p.o.leaves && p.oT) ? p.type + '|' + p.lzFac + '|' + lzPKey(p.lzParam) : null, V = vk && VAR.get(vk);
    if (V) { const merged = V.map(v => { const m = new THREE.Mesh(v.geo, v.mat); m.castShadow = v.cs; m.receiveShadow = v.rs; m.frustumCulled = v.fc; m.userData.lz = true; return m; });
      for (const c of g.children.slice()) g.remove(c); for (const m of merged) g.add(m); g.updateMatrixWorld(true);
      p.lz = { merged, kept: [] }; if (!(p.o && p.o.lamp)) AWAKE.delete(p); g.__prop = p; p.pieces = []; n++; meshes += merged.length; reused++; continue; } g.updateMatrixWorld(true);
    const all = []; g.traverse(o => { if (o !== g) all.push(o); });
    /* una pieza sólo se suelda si todo lo que cuelga de ella también se suelda (si no, al ocultarla desaparecería su hijo) */
    const ok = new Set(all.filter(lzOk)), bad = new Set();
    for (const o of all) if (!ok.has(o) && (o.isMesh || o.isSprite || o.isPoints || o.isLine || o.isLight)) { let q = o.parent; while (q && q !== g) { ok.delete(q); q = q.parent; } bad.add(o); }
    for (const o of all) if (!o.visible) { ok.delete(o); o.traverse(c => ok.delete(c)); }
    if (!ok.size) continue;
    const by = new Map();
    for (const o of ok) { const k = o.material.uuid + '|' + o.castShadow + '|' + o.receiveShadow + '|' + o.frustumCulled + '|' + Object.keys(o.geometry.attributes).sort().map(a => a + o.geometry.attributes[a].itemSize + (o.geometry.attributes[a].isInterleavedBufferAttribute ? 'i' : '')).join(',');
      if (/i(,|$)/.test(k)) continue; let L = by.get(k); if (!L) by.set(k, L = []); const rel = o.matrix.clone(); for (let q = o.parent; q && q !== g; q = q.parent) rel.premultiply(q.matrix); L.push({ o, rel }); }
    const kept = [];                                                                // lo que no se suelda se queda tal cual (con lo que cuelga de ello)
    for (const o of bad) { let q = o.parent, inside = false; while (q && q !== g) { if (bad.has(q)) { inside = true; break; } q = q.parent; } if (!inside) kept.push(o); }
    const merged = [];
    for (const [, L] of by) {
      /* receta: qué geometría y en qué sitio exacto (local) va cada pieza; misma receta → misma malla soldada, sin volver a soldar */
      const rc = new Float64Array(L.length * 17); L.forEach((it, i) => { rc[i * 17] = lzGid(it.o.geometry); rc.set(it.rel.elements, i * 17 + 1); });
      let h1 = 2166136261, h2 = 5381; const u = new Uint32Array(rc.buffer); for (let i = 0; i < u.length; i++) { h1 = Math.imul(h1 ^ u[i], 16777619); h2 = Math.imul(h2, 33) ^ u[i]; }
      const k = L.length + ':' + (h1 >>> 0) + ':' + (h2 >>> 0), C = LZ_GEO.get(k) || []; let geo = null;
      for (const c of C) { const r = c.rc; if (r.length !== rc.length) continue; let same = true; for (let i = 0; i < r.length; i++) if (r[i] !== rc[i]) { same = false; break; } if (same) { geo = c.geo; break; } }
      if (!geo) { geo = lzMerge(L); C.push({ rc, geo }); LZ_GEO.set(k, C); }
      const o0 = L[0].o, m = new THREE.Mesh(geo, o0.material); m.castShadow = o0.castShadow; m.receiveShadow = o0.receiveShadow; m.frustumCulled = o0.frustumCulled; m.userData.lz = true; merged.push(m);
      pcs += L.length;
    }
    if (vk && !kept.length) VAR.set(vk, merged.map(m => ({ geo: m.geometry, mat: m.material, cs: m.castShadow, rs: m.receiveShadow, fc: m.frustumCulled })));
    for (const o of kept) g.attach(o);
    for (const c of g.children.slice()) if (kept.indexOf(c) < 0) g.remove(c);
    for (const m of merged) g.add(m);
    g.updateMatrixWorld(true);
    p.lz = { merged, kept }; if (!(p.o && p.o.lamp)) AWAKE.delete(p); g.__prop = p; p.pieces = []; n++; meshes += merged.length;
  }
  return { objetos: n, piezas: pcs, mallas: meshes, reutilizados: reused };
};
/* dibujo en lote: dentro de cada sector, las mallas soldadas iguales (misma forma y material: vallas, sacos, palés, muros, coches del mismo color…)
   se dibujan con UNA malla instanciada. Al despertar un objeto, su copia en el lote se oculta (escala 0) y vuelven sus piezas reales. */
const _Z4 = new THREE.Matrix4().makeScale(0, 0, 0);
MAPA.instance = function (sectors) {
  let lotes = 0, copias = 0;
  for (const S of sectors) {
    const by = new Map();
    for (const g of S.children) { const p = g.__prop; if (!p || !p.lz || !p.lz.merged.length) continue;
      for (const m of p.lz.merged) { const k = m.geometry.uuid + '|' + m.material.uuid + '|' + m.castShadow + '|' + m.receiveShadow; let L = by.get(k); if (!L) by.set(k, L = []); L.push({ p, m }); } }
    for (const [, L] of by) {
      if (L.length < 2) continue; const m0 = L[0].m, im = new THREE.InstancedMesh(m0.geometry, m0.material, L.length);
      im.castShadow = m0.castShadow; im.receiveShadow = m0.receiveShadow; im.frustumCulled = false; im.userData.lzInst = true;   // el sector ya recorta por cámara
      const bt = { im, arr: im.instanceMatrix.array, geo: m0.geometry, mat: m0.material, cs: m0.castShadow, rs: m0.receiveShadow, n: L.length }; im.userData.b = bt;   // registro del lote (sobrevive a congelar el sector)
      L.forEach((it, i) => { it.p.g.updateMatrixWorld(true); im.setMatrixAt(i, it.p.g.matrixWorld); it.p.g.remove(it.m); it.p.lz.merged.splice(it.p.lz.merged.indexOf(it.m), 1); (it.p.lz.inst || (it.p.lz.inst = [])).push({ b: bt, i }); });
      im.instanceMatrix.needsUpdate = true; S.add(im); lotes++; copias += L.length;
    }
  }
  return { lotes, copias };
};
/* pasos tras construir el distrito (se pueden dar de uno en uno para pintar la barra de carga entre ellos). ?nodedupe ?nolazy ?noinst los desactivan */
MAPA.post = function (step) {
  const out = MAPA.built, q = location.search, all = step === 'all'; if (!out || !out.sectors) return;
  if ((all || step === 'dedupe') && !/nodedupe/.test(q)) out.dedupe = MAPA.dedupe([out.group].concat(out.sectors));
  if ((all || step === 'lazify') && !/nolazy/.test(q)) out.lazy = MAPA.lazify(props);
  if ((all || step === 'instance') && !/nolazy|noinst/.test(q)) out.inst = MAPA.instance(out.sectors);
};
MAPA.wake = function (p) {                                                          // vuelve a poner las piezas reales (idénticas) de un objeto fusionado
  const L = p && p.lz; if (!L) return; p.lz = null; AWAKE.add(p); p._wk = performance.now();
  for (const it of L.inst || []) { _Z4.toArray(it.b.arr, it.i * 16); if (it.b.im) it.b.im.instanceMatrix.needsUpdate = true; }   // su copia en el lote se oculta (escala 0), con el sector vivo o congelado
  for (const m of L.merged) p.g.remove(m); for (const o of L.kept) if (o.parent) o.parent.remove(o);
  OBJ.rebuild(p); if (MAPA.canon) MAPA.canon(p.g); p.g.updateMatrixWorld(true);
};
/* ganchos: cualquier cosa que vaya a tocar las piezas de un objeto lo despierta antes (se instalan por fuera de los de objetos.js) */
(function () {
  /* OBJETOS LEJANOS: a más de 60 m del jugador (la niebla acaba a 58 m) nadie ve un decal, un empujón ni un hueco: un objeto dormido NO se despierta por eso. Los impactos de bala y los daños pequeños solo
     restan vida (la bala se detiene en él); en cuanto le quede ≤ 50 % o sea explosivo/fluido/fuego, se despierta y se trata como siempre. Antes cada bala o explosión lejana despertaba su objeto para siempre. */
  const far = p => { const dx = p.x - P.pos.x, dz = p.z - P.pos.z; return dx * dx + dz * dz > 3600; };
  const safe = p => p && p.lz && !p.ref && !p.explosive && !(p.fluid > 0) && far(p);
  const wrapP = name => { const f = window[name]; if (typeof f !== 'function') return; window[name] = function (p) {
    if (p && p.lz) { if (safe(p)) {
      if (name === 'holeDecal' || name === 'addDecal' || name === 'shedPieces' || name === 'launchPiece' || name === 'pushProp') return;
      if (name === 'bulletHitProp' && p.hp - arguments[6] > p.maxHp * .5) { p.hp -= arguments[6]; return 0; }
      if (name === 'damageProp' && arguments[6] !== 'fire' && p.hp - arguments[1] > p.maxHp * .5) { p.hp -= arguments[1]; return; } }
      MAPA.wake(p); }
    return f.apply(this, arguments); }; };
  for (const n of ['damageProp', 'destroyProp', 'bulletHitProp', 'holeDecal', 'addDecal', 'shedPieces', 'barrelBurst', 'launchPiece', 'pushProp']) wrapP(n);   /* empujar: la copia del lote no se movería */
  if (typeof OBJ !== 'undefined') { const so = OBJ.setOpen; OBJ.setOpen = function (p) { if (p && p.lz) MAPA.wake(p); return so.apply(this, arguments); };
    const ro = OBJ.removeObject; OBJ.removeObject = function (r) { if (r && r.lz) MAPA.wake(r); return ro.apply(this, arguments); }; }
})();
const _fr = new THREE.Frustum(), _pm = new THREE.Matrix4();
/* ---- sectores congelados (streaming de mallas): el 99,9 % de los objetos del distrito está dormido (soldado) y lejos de la cámara, pero cada malla es un nodo de Three.js
   (~1,5 KB de memoria, y trabajo para el recolector de basura): ~58.000 nodos de objetos. Un sector lejos de la cámara guarda sólo la RECETA de sus mallas (geometría, material, banderas;
   las geometrías y materiales ya se compartían) y de sus lotes instanciados (la matriz de cada copia); al acercarse la cámara se recrean idénticos. Los grupos de cada objeto se quedan
   (otros sistemas leen su posición), y despertar un objeto de un sector congelado funciona igual (su copia en el lote se oculta en los datos). ?nostream lo desactiva. ---- */
const ST = { R_THAW: 3, R_FREEZE: 5, budget: 2, ci: 0, cj: 0, cand: [], off: /[?&]nostream\b/.test(location.search), on: false,
  /* R1: los lotes instanciados de un sector congelado se CONSERVAN (con su búfer de GPU) para los últimos 120 sectores (~6 MB): al volver a descongelarlos no se crean mallas ni arrays nuevos ni se reservan búferes (basura y tirones al correr). ?nopool lo desactiva */
  pool: !/[?&]nopool\b/.test(location.search), poolList: [], poolMax: 120, poolHit: 0, poolMiss: 0, thawMs: 0, thawN: 0, thawMax: 0, frzMs: 0, frzN: 0 };
function freezeSector(S) {
  if (S.__fz) return; const t0f = performance.now(); S.__batches = [];
  for (const g of S.children.slice()) {
    const p = g.__prop;
    if (p && p.lz && !p.lz.frozen && p.lz.merged.length) {
      const L = p.lz; L.mdesc = L.merged.map(m => ({ geo: m.geometry, mat: m.material, cs: m.castShadow, rs: m.receiveShadow, fc: m.frustumCulled }));
      for (const m of L.merged) g.remove(m); L.merged = []; L.frozen = true;
      /* piezas no soldables sencillas (cristales de coches y ventanas…): también sólo su receta (geometría, material, banderas y transformación); lo complejo se queda vivo */
      const simple = L.kept.filter(o => o.isMesh && !o.isInstancedMesh && !o.children.length && o.parent === g && !o.userData.noFreeze);
      if (simple.length) { L.kdesc = simple.map(o => ({ geo: o.geometry, mat: o.material, cs: o.castShadow, rs: o.receiveShadow, fc: o.frustumCulled, vis: o.visible, ro: o.renderOrder, t: [o.position.x, o.position.y, o.position.z, o.quaternion.x, o.quaternion.y, o.quaternion.z, o.quaternion.w, o.scale.x, o.scale.y, o.scale.z] }));
        for (const o of simple) g.remove(o); L.kept = L.kept.filter(o => simple.indexOf(o) < 0); }
    } else if (g.isInstancedMesh && g.userData.lzInst) { const bt = g.userData.b; bt.im = null; S.__batches.push(bt); S.remove(g); if (ST.pool) bt.imPool = g; else g.dispose(); }
  }
  S.__fz = true; ST.frzMs += performance.now() - t0f; ST.frzN++;
  if (ST.pool) { ST.poolList.push(S); while (ST.poolList.length > ST.poolMax) { const o = ST.poolList.shift(); if (o.__fz && o.__batches) for (const b of o.__batches) if (b.imPool) { b.imPool.dispose(); b.imPool = null; } } }
}
function thawSector(S) {
  if (!S.__fz) return; const t0 = performance.now(); if (ST.pool) { const pi = ST.poolList.indexOf(S); if (pi >= 0) ST.poolList.splice(pi, 1); }
  if (typeof PERF !== 'undefined') PERF.tag('sectores');
  for (const g of S.children) { const p = g.__prop;
    if (p && p.lz && p.lz.frozen) { const L = p.lz; L.merged = L.mdesc.map(v => { const m = new THREE.Mesh(v.geo, v.mat); m.castShadow = v.cs; m.receiveShadow = v.rs; m.frustumCulled = v.fc; m.userData.lz = true; g.add(m); return m; }); L.frozen = false; L.mdesc = null;
      if (L.kdesc) { for (const v of L.kdesc) { const m = new THREE.Mesh(v.geo, v.mat); m.castShadow = v.cs; m.receiveShadow = v.rs; m.frustumCulled = v.fc; m.visible = v.vis; m.renderOrder = v.ro; const t = v.t; m.position.set(t[0], t[1], t[2]); m.quaternion.set(t[3], t[4], t[5], t[6]); m.scale.set(t[7], t[8], t[9]); g.add(m); L.kept.push(m); } L.kdesc = null; } } }
  for (const bt of S.__batches) { let im = bt.imPool; bt.imPool = null;
    if (im) ST.poolHit++; else { ST.poolMiss++; im = new THREE.InstancedMesh(bt.geo, bt.mat, bt.n); im.instanceMatrix.array.set(bt.arr); bt.arr = im.instanceMatrix.array; im.castShadow = bt.cs; im.receiveShadow = bt.rs; im.frustumCulled = false; im.userData.lzInst = true; im.userData.b = bt; }
    bt.im = im; im.instanceMatrix.needsUpdate = true; S.add(im); }
  S.__batches = null; S.__fz = false; const dt = performance.now() - t0; ST.thawMs += dt; ST.thawN++; if (dt > ST.thawMax) ST.thawMax = dt; if (typeof PERF !== 'undefined' && dt > 3) PERF.tag('descongelar ' + dt.toFixed(1) + ' ms');
}
MAPA.freezeAll = function () { const b = MAPA.built; if (!b || !b.sectors || ST.off) return 0; let n = 0; for (const S of b.sectors) if (!S.__fz) { freezeSector(S); n++; } ST.on = true; return n; };
MAPA.thawAll = function () { const b = MAPA.built; if (!b || !b.sectors) return 0; let n = 0; for (const S of b.sectors) if (S.__fz) { thawSector(S); n++; } return n; };
MAPA.stream = ST;
const _sr = new THREE.Ray(), _sd = new THREE.Vector3(), _st = new THREE.Vector3();
/* RE-DORMIR: cualquier toque despierta un objeto (sus piezas reales vuelven al grafo de escena y a AWAKE, que se recorre cada fotograma). En combate se despertaban ~6 por segundo y nunca volvían a dormir:
   tras 3 min, 1.159 objetos y +17.000 nodos de escena (memoria, recolector y más trabajo por fotograma). Cada 1,5 s, los despiertos hace > 10 s que están quietos, sin estado visual propio (sin agujeros,
   decals, etapa de daño, fuego, humo ni mecha) se sueldan otra vez (máx. 16 por pasada; la receta ya está en caché, así que es barato). */
MAPA.resleep = function () {
  const now = performance.now(); let n = 0, tmp = null;
  for (const p of AWAKE) {
    if (n >= 16) break; if (p.lz || p.dead || !p._wk || now - p._wk < 10000) continue;
    if (p.rec || p.stage || p.smk || p.fuse >= 0 || p.burning || p.burnT > 0 || p.charred || (p.decals && p.decals.length) || (p.holes && p.holes.length) || p.explosive && p.fuse !== undefined && p.fuse >= 0) continue;
    if (!(p.wob < .001) || p.v.lengthSq() > 1e-8 || (p.o && (p.o.lamp || p.o.leaves))) continue;
    (tmp || (tmp = [])).push(p); n++;
  }
  if (tmp) MAPA.lazify(tmp);
};
MAPA.cull = function (cam) {
  const b = MAPA.built; if (!b || !b.sectors || MAPA.noCull) return;
  if ((ST.sw = (ST.sw || 0) + 1) >= 90) { ST.sw = 0; if (!/nolazy|noresleep/.test(location.search)) MAPA.resleep(); }
  cam.updateMatrixWorld(); _pm.multiplyMatrices(cam.projectionMatrix, cam.matrixWorldInverse); _fr.setFromProjectionMatrix(_pm);
  if (typeof P !== 'undefined') MAPA.canopy.value.set(P.pos.x, P.pos.z + 3.4, 6.5);                          // copas que se desvanecen cerca del jugador (y entre él y la cámara)
  let tx = cam.position.x, tz = cam.position.z;                                                              // punto del suelo hacia el que mira la cámara
  if (ST.on) { cam.getWorldDirection(_sd); if (_sd.y < -.05) { const t = -cam.position.y / _sd.y; tx += _sd.x * t; tz += _sd.z * t; } ST.ci = Math.floor(tx / SEC); ST.cj = Math.floor(tz / SEC); }
  const cand = ST.cand; cand.length = 0;
  for (const g of b.sectors) {
    const v = _fr.intersectsBox(g.box); g.visible = v;
    if (!ST.on) continue;
    if (v) { if (g.__fz) thawSector(g); continue; }                                                           // un sector a la vista nunca se dibuja congelado
    const d = Math.max(Math.abs(g.__i - ST.ci), Math.abs(g.__j - ST.cj));
    if (g.__fz) { if (d <= ST.R_THAW) cand.push(g, d); } else if (d >= ST.R_FREEZE) cand.push(g, -1);
  }
  if (cand.length) {                                                                                           // anticipar: se descongelan los más cercanos y se congelan los lejanos, pocos por fotograma
    let nt = 0, nf = 0;
    for (let r = 0; r <= ST.R_THAW && nt < ST.budget; r++) for (let i = 0; i < cand.length; i += 2) if (cand[i + 1] === r && nt < ST.budget) { thawSector(cand[i]); nt++; }
    for (let i = 0; i < cand.length && nf < ST.budget; i += 2) if (cand[i + 1] === -1) { freezeSector(cand[i]); nf++; }
  }
};
MAPA.clear = function () {
  const b = MAPA.built; if (!b) return; scene.remove(b.group); for (const g of b.sectors || []) { for (const o of g.children.slice()) if (!o.isInstancedMesh) scene.add(o); THREE.Object3D.prototype.remove.call(scene, g); } b.group.traverse(o => { if (o.geometry && o.isMesh) o.geometry.dispose(); });
  for (const r of b.rails) scene.remove(r); for (const x of b.buildings) OBJ.removeObject(x); for (const p of b.props) OBJ.removeObject(p);
  for (const w of b.walls) { const i = boxes.indexOf(w); if (i >= 0) boxes.splice(i, 1); } MAPA.built = null;
};
})();
