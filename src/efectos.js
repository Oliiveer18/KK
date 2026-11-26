/* Efecto visual del dash (jugador y bots), pensado para no costar nada:
   · 3 mallas instanciadas en total (estelas, onda del suelo y polvo) = 3 llamadas de dibujo, y 0 cuando no hay dash;
   · materiales sin luces ni sombras (no añaden variantes de shader ni entran en la pasada de sombra);
   · todo reutiliza una reserva fija de elementos (sin crear objetos durante el juego);
   · el brillo se apaga con mezcla aditiva (el color se acerca al negro), así que no hace falta transparencia por píxel.
   Uso: DASHFX.start(x, z, dx, dz, color) al empezar un dash; DASHFX.trail(src, x, z, dx, dz, color) cada fotograma mientras dura; DASHFX.update(dt) una vez por fotograma. */
const DASHFX = (() => {
  const NS = 96, NR = 12, NP = 72;                                                   // capacidad de estelas, ondas y polvo
  const add = new THREE.MeshBasicMaterial({ side: THREE.DoubleSide, color: 0xffffff, blending: THREE.AdditiveBlending, transparent: true, depthWrite: false, fog: true });
  const dust = new THREE.MeshBasicMaterial({ color: 0xb9b2a4, fog: true });
  const strk = new THREE.MeshBasicMaterial({ side: THREE.DoubleSide, color: 0xffffff, transparent: true, opacity: .6, depthWrite: false, fog: true });   // estelas con mezcla normal: se ven igual sobre suelo claro u oscuro; se apagan afinándose
  const mk = (geo, mat, n, order, colores) => { const m = new THREE.InstancedMesh(geo, mat, n); m.instanceMatrix.setUsage(THREE.DynamicDrawUsage); m.frustumCulled = false; m.castShadow = m.receiveShadow = false; m.renderOrder = order; m.count = 0; m.visible = false;
    if (colores) { m.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(n * 3), 3); m.instanceColor.setUsage(THREE.DynamicDrawUsage); } scene.add(m); return m; };
  const sGeo = new THREE.PlaneGeometry(1, 1);
  const rGeo = new THREE.RingGeometry(.8, 1, 32); rGeo.rotateX(-Math.PI / 2);
  const pGeo = new THREE.IcosahedronGeometry(1, 0);
  const S = mk(sGeo, strk, NS, 5, true), R = mk(rGeo, add, NR, 4, true), Pf = mk(pGeo, dust, NP, 3, false);
  const ss = [], rs = [], ps = [];                                                  // elementos vivos (se reutilizan los objetos al morir: sin basura)
  const poolS = [], poolR = [], poolP = [];
  for (let i = 0; i < NS; i++) poolS.push({ x: 0, y: 0, z: 0, dx: 0, dz: 0, len: 1, w: 1, t: 0, life: 1, r: 1, g: 1, b: 1 });
  for (let i = 0; i < NR; i++) poolR.push({ x: 0, z: 0, t: 0, life: 1, r: 1, g: 1, b: 1, s: 1 });
  for (let i = 0; i < NP; i++) poolP.push({ x: 0, y: 0, z: 0, vx: 0, vy: 0, vz: 0, t: 0, life: 1, s: 1 });
  const _m = new THREE.Matrix4(), _c = new THREE.Color(), _vx = new THREE.Vector3(), _vy = new THREE.Vector3(), _vz = new THREE.Vector3(), _p = new THREE.Vector3(), _q = new THREE.Quaternion(), _sc = new THREE.Vector3(), _e = new THREE.Euler();
  const col = new THREE.Color();
  const rnd = () => Math.random();

  function streak(x, y, z, dx, dz, len, w, life, c, k) {
    const s = poolS.pop(); if (!s) return; s.x = x; s.y = y; s.z = z; s.dx = dx; s.dz = dz; s.len = len; s.w = w; s.t = 0; s.life = life; s.r = c.r * k; s.g = c.g * k; s.b = c.b * k; ss.push(s);
  }
  function start(x, z, dx, dz, color) {
    col.set(color === undefined ? 0x7ec0ff : color);
    const l = Math.hypot(dx, dz) || 1; dx /= l; dz /= l;
    const r = poolR.pop(); if (r) { r.x = x; r.z = z; r.t = 0; r.life = .3; r.r = col.r; r.g = col.g; r.b = col.b; r.s = 1.9; rs.push(r); }       // onda que se expande por el suelo
    for (let i = 0; i < 4; i++) { const sd = (i - 1.5) * .16, h = .25 + i * .3;                                                              // abanico de estelas largas detrás del cuerpo
      streak(x - dx * (.5 + rnd() * .3) - dz * sd, h, z - dz * (.5 + rnd() * .3) + dx * sd, dx, dz, 2.3 + rnd() * 1.2, .14 + rnd() * .07, .28, col, 1); }
    for (let i = 0; i < 7; i++) { const p = poolP.pop(); if (!p) break; const a = (rnd() - .5) * 1.7;                                          // polvo que se levanta y se queda atrás
      p.x = x + (rnd() - .5) * .4; p.y = .08; p.z = z + (rnd() - .5) * .4;
      const ca = Math.cos(a), sa = Math.sin(a), ux = -dx * ca + dz * sa, uz = -dz * ca - dx * sa, sp = 1.2 + rnd() * 1.6;             // hacia atrás, con abertura
      p.vx = ux * sp; p.vz = uz * sp; p.vy = .5 + rnd() * .9; p.t = 0; p.life = .38 + rnd() * .15; p.s = .1 + rnd() * .09; ps.push(p); }
  }
  const trT = new WeakMap();
  function trail(src, x, z, dx, dz, color) {                                          // mientras dura el dash: estelas cortas que se van soltando (cada ~30 ms)
    const t = trT.get(src) || 0, now = performance.now(); if (now - t < 30) return; trT.set(src, now);
    col.set(color === undefined ? 0x7ec0ff : color); const l = Math.hypot(dx, dz) || 1; dx /= l; dz /= l;
    streak(x - dx * .2, .55 + rnd() * .5, z - dz * .2, dx, dz, 1.3 + rnd() * .8, .16, .18, col, .8);
    streak(x - dx * .2 - dz * .2, .15, z - dz * .2 + dx * .2, dx, dz, 1, .1, .16, col, .55);
  }
  function update(dt) {
    let n = 0;
    for (let i = ss.length - 1; i >= 0; i--) {
      const s = ss[i]; s.t += dt; if (s.t >= s.life) { ss.splice(i, 1); poolS.push(s); continue; }
    }
    for (const s of ss) {
      const k = 1 - s.t / s.life, f = 1;
      _vx.set(s.dx, 0, s.dz);                                                        // eje largo: la dirección del dash
      _vz.set(camera.position.x - s.x, camera.position.y - s.y, camera.position.z - s.z).normalize();   // normal hacia la cámara
      _vy.crossVectors(_vz, _vx).normalize(); _vz.crossVectors(_vx, _vy).normalize();
      _p.set(s.x - s.dx * s.len * .35 * (1 - k) - s.dx * s.len * .5, s.y, s.z - s.dz * s.len * .35 * (1 - k) - s.dz * s.len * .5);
      _m.makeBasis(_vx.multiplyScalar(s.len * (.6 + .4 * k)), _vy.multiplyScalar(s.w * k * k), _vz); _m.setPosition(_p);
      S.setMatrixAt(n, _m); _c.setRGB(s.r * f, s.g * f, s.b * f); S.setColorAt(n, _c); n++;
    }
    S.count = n; S.visible = n > 0; if (n) { S.instanceMatrix.needsUpdate = true; S.instanceColor.needsUpdate = true; }
    n = 0;
    for (let i = rs.length - 1; i >= 0; i--) { const r = rs[i]; r.t += dt; if (r.t >= r.life) { rs.splice(i, 1); poolR.push(r); } }
    for (const r of rs) { const k = r.t / r.life, f = (1 - k) * (1 - k), sc = .5 + r.s * Math.sqrt(k);
      _m.makeScale(sc, 1, sc); _m.setPosition(r.x, .06, r.z); R.setMatrixAt(n, _m); _c.setRGB(r.r * f * .22, r.g * f * .22, r.b * f * .22); R.setColorAt(n, _c); n++; }
    R.count = n; R.visible = n > 0; if (n) { R.instanceMatrix.needsUpdate = true; R.instanceColor.needsUpdate = true; }
    n = 0;
    for (let i = ps.length - 1; i >= 0; i--) { const p = ps[i]; p.t += dt; if (p.t >= p.life) { ps.splice(i, 1); poolP.push(p); continue; }
      p.x += p.vx * dt; p.z += p.vz * dt; p.vy -= 3.2 * dt; p.y = Math.max(.05, p.y + p.vy * dt); const d = Math.exp(-3.5 * dt); p.vx *= d; p.vz *= d; }
    for (const p of ps) { const k = p.t / p.life, sc = p.s * (k < .3 ? .4 + 2 * k : 1) * (1 - Math.max(0, k - .45) / .55);   // crece al salir y se encoge hasta desaparecer
      _m.makeScale(sc * 1.4, sc, sc * 1.4); _m.setPosition(p.x, p.y, p.z); Pf.setMatrixAt(n, _m); n++; }
    Pf.count = n; Pf.visible = n > 0; if (n) Pf.instanceMatrix.needsUpdate = true;
  }
  return { start, trail, update, get mallas() { return [S, R, Pf]; }, get vivos() { return ss.length + rs.length + ps.length; } };
})();
