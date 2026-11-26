"use strict";
/* ===================== MAPA POR DATOS (distrito de la campaña) =====================
   Generador: convierte una descripción (src/mapa_distrito.js) en la escena. Suelos, calles con marcas, aceras, plazas, aparcamientos y refugios provisionales se
   dibujan fusionados por material (muy pocas llamadas de dibujo); edificios y objetos se colocan con placeObject (src/objetos.js, que debe cargarse antes).
   Convenciones: x hacia la derecha, z hacia la cámara (norte = z negativo). Un edificio con giro 0 tiene la puerta hacia +z. */
(function () {
const MAPA = window.MAPA = { data: {}, built: null };
const MA = {}; const mat = c => MA[c] || (MA[c] = new THREE.MeshStandardMaterial({ color: c, roughness: .95, flatShading: true }));
/* superficies: color y altura de la cara superior (las más altas tapan a las más bajas: sin parpadeo) */
const SURF = { asphalt: [0x35383e, .01], grass: [0x56713f, .02], forest: [0x3d5a31, .025], dirt: [0x6c5a44, .03], concrete: [0x85827c, .05], cobble: [0x7a6d60, .07], refuge: [0x6c685f, .06], sidewalk: [0x9d9b92, .13] };
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
  for (const r of roads) { if (!r.pts) continue; r.idx = r.idx || pathPts(r.pts, 2); for (const q of r.idx) { const k = key(Math.floor(q.x / CS), Math.floor(q.z / CS)); let a = H.get(k); if (!a) H.set(k, a = []); a.push({ x: q.x, z: q.z, hw: r.w / 2, r }); } }
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
MAPA.put = function (t, x, z, g, o) {
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
  for (const s of D.surfaces || []) rect(s.t, s.x, s.z, s.w, s.d);
  /* calles: asfalto, aceras a ambos lados, marcas centrales y de borde, pasos de cebra; se cortan donde se cruzan */
  const allRoads = D.roads || [], roads = allRoads.filter(r => !r.pts), curves = allRoads.filter(r => r.pts), SW = 3.2;
  for (const c of curves) c.dense = pathPts(c.pts, c.step || 2);
  const RI = MAPA.roadIndex(curves), onCurve = (x, z, ex, m) => RI.near(x, z, m, ex);
  const onGrid = (x, z, m) => { for (const o of roads) { const X = o.axis === 'x', a = X ? x : z, b = X ? z : x; if (a >= o.a0 - m && a <= o.a1 + m && Math.abs(b - o.c) < o.w / 2 + m) return true; } return false; };
  const crossings = r => roads.filter(o => o !== r && o.axis !== r.axis && o.c >= r.a0 && o.c <= r.a1 && r.c >= o.a0 && r.c <= o.a1);
  for (const r of roads) {
    const X = r.axis === 'x', len = r.a1 - r.a0, mid = (r.a0 + r.a1) / 2, cr = crossings(r);
    if (X) rect('asphalt', mid, r.c, len, r.w); else rect('asphalt', r.c, mid, r.w, len);
    const gaps = cr.map(o => [o.c - o.w / 2, o.c + o.w / 2]).sort((a, b) => a[0] - b[0]), segs = []; let cur = r.a0;     // tramos entre cruces
    for (const g of gaps) { if (g[0] > cur) segs.push([cur, g[0]]); cur = Math.max(cur, g[1]); } if (cur < r.a1) segs.push([cur, r.a1]);
    for (const [a, b] of segs) {
      const L = b - a, m = (a + b) / 2;
      for (const sg of [-1, 1]) { const o = sg * (r.w / 2 + SW / 2);
        if (!curves.length) { if (X) rect('sidewalk', m, r.c + o, L, SW); else rect('sidewalk', r.c + o, m, SW, L); continue; }
        for (let t = a; t < b - .01; t += 2) { const l2 = Math.min(2, b - t), mm = t + l2 / 2, px = X ? mm : r.c + o, pz = X ? r.c + o : mm; if (onCurve(px, pz, null, .9)) continue; if (X) rect('sidewalk', mm, r.c + o, l2 + .02, SW); else rect('sidewalk', r.c + o, mm, SW, l2 + .02); } }
      for (const sg of [-1, 1]) { const o = sg * (r.w / 2 - .35); if (X) mark('white', m, r.c + o, L, .16); else mark('white', r.c + o, m, .16, L); }          // bordes
      const dbl = r.w >= 10;                                                                                                                       // avenidas: doble línea amarilla; calles: discontinua blanca
      if (dbl) { for (const sg of [-1, 1]) { if (X) mark('yellow', m, r.c + sg * .22, L, .14); else mark('yellow', r.c + sg * .22, m, .14, L); } }
      else for (let t = a + 1.5; t < b - 3; t += 8) { if (X) mark('white', t + 1.5, r.c, 3, .16); else mark('white', r.c, t + 1.5, .16, 3); }
    }
    for (const o of cr) for (const sg of [-1, 1]) { const at = o.c + sg * (o.w / 2 + 1.4);                                                       // pasos de cebra a cada lado del cruce
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
      if (c.w >= 10) for (const sg of [-1, 1]) (B[MARK.yellow] = B[MARK.yellow] || []).push(mkBoxR(mx + nx * sg * .22, .0145, mz + nz * sg * .22, L, .006, .14, yaw));
      else if (Math.floor(i * (c.step || 2) / 6) % 2 === 0) (B[MARK.white] = B[MARK.white] || []).push(mkBoxR(mx, .0145, mz, L, .006, .16, yaw));
    }
  }
  for (const k of D.lots || []) {                                                       // aparcamientos: hormigón con plazas marcadas
    rect('concrete', k.x, k.z, k.w, k.d);
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
    side(0, -hd, R.w, true, R.face === 'n'); side(0, hd, R.w, true, R.face === 's'); side(-hw, 0, R.d, false, R.face === 'w'); side(hw, 0, R.d, false, R.face === 'e');
    const dir = { n: [0, -1], s: [0, 1], w: [-1, 0], e: [1, 0] }[R.face], yaw = Math.atan2(dir[0], dir[1]);
    { const cx = R.x + dir[0] * (hw - 7), cz = R.z + dir[1] * (hd - 7); for (let i = 0; i < 6; i++) out.spawns[R.fac].push({ x: dir[1] ? cx + (i - 2.5) * 4 : cx, z: dir[1] ? cz : cz + (i - 2.5) * 4, yaw }); }      // 6 puntos de aparición dentro, cerca del portón
    const e = placeObject('emblem' + R.fac, R.x + dir[0] * (hw + .1), R.z + dir[1] * (hd + .1), Math.atan2(dir[0], dir[1]), { fac: R.fac }); if (e) out.props.push(e);
  }
  flush(group, B);
  if (D.trees && D.trees.length) {                                                        // bosques: árboles instanciados (3 mallas en total) con caja de colisión sólo en el tronco
    const n = D.trees.length, trunk = new THREE.InstancedMesh(new THREE.CylinderGeometry(.22, .3, 2.4, 6), new THREE.MeshStandardMaterial({ color: 0x4e3b2a, roughness: 1, flatShading: true }), n),
      c1 = new THREE.InstancedMesh(new THREE.ConeGeometry(1.7, 3.2, 7), new THREE.MeshStandardMaterial({ color: 0x2f4a2a, roughness: 1, flatShading: true }), n),
      c2 = new THREE.InstancedMesh(new THREE.ConeGeometry(1.25, 2.6, 7), new THREE.MeshStandardMaterial({ color: 0x3a5a30, roughness: 1, flatShading: true }), n), M4 = new THREE.Matrix4(), q = new THREE.Quaternion(), sc = new V3(), ps = new V3();
    D.trees.forEach((t, i) => { const k = t[2] || 1, ry = (t[0] * 7.3 + t[1] * 3.1) % 6.28; q.setFromAxisAngle(_Y, ry);
      M4.compose(ps.set(t[0], 1.2 * k, t[1]), q, sc.set(k, k, k)); trunk.setMatrixAt(i, M4); M4.compose(ps.set(t[0], (2.4 + 1.3) * k, t[1]), q, sc.set(k, k, k)); c1.setMatrixAt(i, M4); M4.compose(ps.set(t[0], (2.4 + 2.9) * k, t[1]), q, sc.set(k, k, k)); c2.setMatrixAt(i, M4);
      const bx = { x: t[0], z: t[1], hx: .32 * k, hz: .32 * k, h: 3, wall: true, tree: true }; boxes.push(bx); out.walls.push(bx); });
    for (const m of [trunk, c1, c2]) { m.castShadow = true; m.receiveShadow = true; m.instanceMatrix.needsUpdate = true; m.frustumCulled = false; group.add(m); }
  }
  for (const r of D.rails || []) out.rails.push(OBJ.rails(r.x, r.z, r.len, r.ry || 0));
  for (const b of D.buildings || []) { const r = placeObject(b.k, b.x, b.z, b.rot || 0, { fac: b.fac }); if (r) out.buildings.push(r); }
  for (const o of D.objects || []) { const r = MAPA.put(o.t, o.x, o.z, o.g || 0, o.o); if (r) out.props.push(r); }
  out.info = D.info || null; MAPA.built = out; return out;
};
MAPA.clear = function () {
  const b = MAPA.built; if (!b) return; scene.remove(b.group); b.group.traverse(o => { if (o.geometry && o.isMesh) o.geometry.dispose(); });
  for (const r of b.rails) scene.remove(r); for (const x of b.buildings) OBJ.removeObject(x); for (const p of b.props) OBJ.removeObject(p);
  for (const w of b.walls) { const i = boxes.indexOf(w); if (i >= 0) boxes.splice(i, 1); } MAPA.built = null;
};
})();
