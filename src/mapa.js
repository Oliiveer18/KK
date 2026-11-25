"use strict";
/* ===================== MAPA POR DATOS (distrito de la campaña) =====================
   Generador: convierte una descripción (src/mapa_distrito.js) en la escena. Suelos, calles con marcas, aceras, plazas, aparcamientos y refugios provisionales se
   dibujan fusionados por material (muy pocas llamadas de dibujo); edificios y objetos se colocan con placeObject (src/objetos.js, que debe cargarse antes).
   Convenciones: x hacia la derecha, z hacia la cámara (norte = z negativo). Un edificio con giro 0 tiene la puerta hacia +z. */
(function () {
const MAPA = window.MAPA = { data: {}, built: null };
const MA = {}; const mat = c => MA[c] || (MA[c] = new THREE.MeshStandardMaterial({ color: c, roughness: .95, flatShading: true }));
/* superficies: color y altura de la cara superior (las más altas tapan a las más bajas: sin parpadeo) */
const SURF = { asphalt: [0x35383e, .01], grass: [0x56713f, .02], dirt: [0x6c5a44, .03], concrete: [0x85827c, .05], cobble: [0x7a6d60, .07], refuge: [0x6c685f, .06], sidewalk: [0x9d9b92, .13] };
const MARK = { white: 0xdbd8cb, yellow: 0xe3b942 };
const _q = new THREE.Quaternion(), _p = new V3(), _s = new V3();
const mkBox = (x, y, z, w, h, d) => ({ m: new THREE.Matrix4().compose(_p.set(x, y, z), _q, _s.set(w, h, d)) });
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
  const roads = D.roads || [], SW = 3.2;
  const crossings = r => roads.filter(o => o !== r && o.axis !== r.axis && o.c >= r.a0 && o.c <= r.a1 && r.c >= o.a0 && r.c <= o.a1);
  for (const r of roads) {
    const X = r.axis === 'x', len = r.a1 - r.a0, mid = (r.a0 + r.a1) / 2, cr = crossings(r);
    if (X) rect('asphalt', mid, r.c, len, r.w); else rect('asphalt', r.c, mid, r.w, len);
    const gaps = cr.map(o => [o.c - o.w / 2, o.c + o.w / 2]).sort((a, b) => a[0] - b[0]), segs = []; let cur = r.a0;     // tramos entre cruces
    for (const g of gaps) { if (g[0] > cur) segs.push([cur, g[0]]); cur = Math.max(cur, g[1]); } if (cur < r.a1) segs.push([cur, r.a1]);
    for (const [a, b] of segs) {
      const L = b - a, m = (a + b) / 2;
      for (const sg of [-1, 1]) { const o = sg * (r.w / 2 + SW / 2); if (X) rect('sidewalk', m, r.c + o, L, SW); else rect('sidewalk', r.c + o, m, SW, L); }
      for (const sg of [-1, 1]) { const o = sg * (r.w / 2 - .35); if (X) mark('white', m, r.c + o, L, .16); else mark('white', r.c + o, m, .16, L); }          // bordes
      const dbl = r.w >= 10;                                                                                                                       // avenidas: doble línea amarilla; calles: discontinua blanca
      if (dbl) { for (const sg of [-1, 1]) { if (X) mark('yellow', m, r.c + sg * .22, L, .14); else mark('yellow', r.c + sg * .22, m, .14, L); } }
      else for (let t = a + 1.5; t < b - 3; t += 8) { if (X) mark('white', t + 1.5, r.c, 3, .16); else mark('white', r.c, t + 1.5, .16, 3); }
    }
    for (const o of cr) for (const sg of [-1, 1]) { const at = o.c + sg * (o.w / 2 + 1.4);                                                       // pasos de cebra a cada lado del cruce
      for (let k = -r.w / 2 + .8; k <= r.w / 2 - .7; k += 1.05) { if (X) mark('white', at, r.c + k, 1.5, .55); else mark('white', r.c + k, at, .55, 1.5); } }
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
  for (const r of D.rails || []) out.rails.push(OBJ.rails(r.x, r.z, r.len, r.ry || 0));
  for (const b of D.buildings || []) { const r = placeObject(b.k, b.x, b.z, b.rot || 0, { fac: b.fac }); if (r) out.buildings.push(r); }
  for (const o of D.objects || []) { const r = placeObject(o.t, o.x, o.z, o.g || 0, o.o); if (r) out.props.push(r); }
  MAPA.built = out; return out;
};
MAPA.clear = function () {
  const b = MAPA.built; if (!b) return; scene.remove(b.group); b.group.traverse(o => { if (o.geometry && o.isMesh) o.geometry.dispose(); });
  for (const r of b.rails) scene.remove(r); for (const x of b.buildings) OBJ.removeObject(x); for (const p of b.props) OBJ.removeObject(p);
  for (const w of b.walls) { const i = boxes.indexOf(w); if (i >= 0) boxes.splice(i, 1); } MAPA.built = null;
};
})();
