/* Efecto del dash (jugador y bots): marcas de viento. Unas pocas líneas finas, blancas y translúcidas que se quedan en el aire detrás del que corre,
   afinadas en las puntas, y se encogen hasta desaparecer. Una sola malla instanciada (1 llamada de dibujo, 0 sin dash), sin luces ni sombras,
   con una reserva fija de elementos (sin crear objetos durante el juego).
   Uso: DASHFX.start(x, z, dx, dz) al empezar el dash; DASHFX.trail(src, x, z, dx, dz) cada fotograma mientras dura; DASHFX.update(dt) una vez por fotograma. */
const DASHFX = (() => {
  const N = 40;
  const geo = new THREE.BufferGeometry();                                            // rombo muy alargado: punta fina delante y detrás, grueso por el centro
  geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array([-.5, 0, 0, -.1, .5, 0, .5, 0, 0, -.1, -.5, 0]), 3)); geo.setIndex([0, 1, 3, 1, 2, 3]);
  const mat = new THREE.MeshBasicMaterial({ color: 0xffffff, side: THREE.DoubleSide, transparent: true, opacity: .65, depthWrite: false, fog: true });
  const mesh = new THREE.InstancedMesh(geo, mat, N); mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage); mesh.frustumCulled = false; mesh.castShadow = mesh.receiveShadow = false; mesh.renderOrder = 5; mesh.count = 0; mesh.visible = false; scene.add(mesh);
  const live = [], pool = [];
  for (let i = 0; i < N; i++) pool.push({ x: 0, y: 0, z: 0, dx: 0, dz: 0, len: 1, w: 1, t: 0, life: 1 });
  const _m = new THREE.Matrix4(), _x = new THREE.Vector3(), _y = new THREE.Vector3(), _z = new THREE.Vector3(), _p = new THREE.Vector3();
  const rnd = Math.random;
  function line(x, y, z, dx, dz, len, w, life) { const s = pool.pop(); if (!s) return; s.x = x; s.y = y; s.z = z; s.dx = dx; s.dz = dz; s.len = len; s.w = w; s.t = 0; s.life = life; live.push(s); }
  function start(x, z, dx, dz) {                                                     // tres líneas de viento a distintas alturas y lados
    const l = Math.hypot(dx, dz) || 1; dx /= l; dz /= l;
    for (let i = 0; i < 3; i++) { const side = (i - 1) * .34 + (rnd() - .5) * .1, back = .5 + rnd() * .5; line(x - dx * back - dz * side, .35 + i * .38 + rnd() * .1, z - dz * back + dx * side, dx, dz, 2.6 + rnd() * 1.2, .11, .32); }
  }
  const last = new WeakMap();
  function trail(src, x, z, dx, dz) {                                                // mientras dura: una línea suelta cada ~45 ms
    const now = performance.now(); if (now - (last.get(src) || 0) < 45) return; last.set(src, now);
    const l = Math.hypot(dx, dz) || 1; dx /= l; dz /= l; const side = (rnd() - .5) * .7;
    line(x - dx * .3 - dz * side, .3 + rnd() * .9, z - dz * .3 + dx * side, dx, dz, 1.6 + rnd() * .9, .09, .24);
  }
  function update(dt) {
    for (let i = live.length - 1; i >= 0; i--) { const s = live[i]; s.t += dt; if (s.t >= s.life) { live.splice(i, 1); pool.push(s); } }
    let n = 0;
    for (const s of live) {
      const k = 1 - s.t / s.life;                                                    // 1 → 0
      _x.set(s.dx, 0, s.dz);
      _z.set(camera.position.x - s.x, camera.position.y - s.y, camera.position.z - s.z).normalize();   // el trazo mira a la cámara
      _y.crossVectors(_z, _x).normalize(); _z.crossVectors(_x, _y);
      _p.set(s.x - s.dx * s.len * .5 * (1 - k * .5), s.y, s.z - s.dz * s.len * .5 * (1 - k * .5));   // se queda atrás mientras el personaje avanza
      _m.makeBasis(_x.multiplyScalar(s.len * (.5 + .5 * k)), _y.multiplyScalar(s.w * k), _z); _m.setPosition(_p);
      mesh.setMatrixAt(n++, _m);
    }
    mesh.count = n; mesh.visible = n > 0; if (n) mesh.instanceMatrix.needsUpdate = true;
  }
  return { start, trail, update, get mallas() { return [mesh]; }, get vivos() { return live.length; } };
})();
