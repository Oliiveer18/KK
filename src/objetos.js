/* ===================== OBJETOS DE CAMPAÑA (src/objetos.js) =====================
   Módulo cargado tras el juego (comparte su ámbito global: PSPEC, MT, PM, props, boxes, mkPiece…).
   Define los objetos del catálogo `docs/CATALOGO_OBJETOS.md` con el mismo sistema que las cajas y barriles:
   cada objeto es un grupo de piezas reales (las sueltas saltan al romperse), con material, vida y huella 2D (`boxes`).
   Aporta además: accesos que se abren y cierran (`OBJ.setOpen`), alarmas, recogibles (`OBJ.pickup`), raíles y una galería de pruebas (`?galeria=1`).
   Todo vive dentro de `OBJ`; no cambia nada del juego existente salvo los ganchos indicados al final (`impactFx`, `damageProp`, `destroyProp`, `addProp`, `updateProps`).
   NO incluye: inventario ni interacción con el mando (entrega 3), mejoras y costes (entrega 4), ni navegación dinámica (entrega 2). `OBJ.on` avisa de cada cambio de estado. */
(function () {
  const TAU2 = Math.PI * 2, rnd = Math.random;

  /* ---------- materiales y texturas procedurales (juntas de bloque, chapa ondulada, rayas…) ---------- */
  function mkTex(size, draw) { const c = document.createElement('canvas'); c.width = c.height = size; draw(c.getContext('2d'), size); const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = 4; return t; }
  const speckle = (x, s, n, a) => { for (let i = 0; i < n; i++) { x.fillStyle = 'rgba(' + (rnd() < .5 ? '0,0,0,' : '255,255,255,') + (rnd() * a) + ')'; x.fillRect(rnd() * s, rnd() * s, 1 + rnd() * 2, 1 + rnd() * 2); } };
  const TEX = {
    block: mkTex(256, (x, s) => {                                                    // bloque de hormigón en aparejo a soga: 4 hiladas, 2 bloques por hilada (baldosa de 0,8 m)
      x.fillStyle = '#5a5955'; x.fillRect(0, 0, s, s); const rh = s / 4, bw = s / 2;
      for (let r = 0; r < 4; r++) for (let k = -1; k < 3; k++) { const ox = (r % 2) * bw / 2, v = 150 + ((rnd() * 22) | 0); x.fillStyle = 'rgb(' + v + ',' + (v - 1) + ',' + (v - 5) + ')'; x.fillRect(k * bw + ox + 3, r * rh + 3, bw - 6, rh - 6); }
      speckle(x, s, 380, .1);
    }),
    corrug: mkTex(128, (x, s) => { for (let i = 0; i < 4; i++) { const g = x.createLinearGradient(i * s / 4, 0, (i + 1) * s / 4, 0); g.addColorStop(0, '#6c7480'); g.addColorStop(.5, '#cfd6df'); g.addColorStop(1, '#6c7480'); x.fillStyle = g; x.fillRect(i * s / 4, 0, s / 4, s); } speckle(x, s, 120, .08); }),
    hazard: mkTex(128, (x, s) => { x.fillStyle = '#e6bd1c'; x.fillRect(0, 0, s, s); x.fillStyle = '#1d1d1f'; for (let i = -2; i < 4; i++) { x.beginPath(); x.moveTo(i * s / 2, s); x.lineTo(i * s / 2 + s / 4, s); x.lineTo(i * s / 2 + s / 4 + s / 2, 0); x.lineTo(i * s / 2 + s / 2, 0); x.fill(); } }),
    stripe: mkTex(64, (x, s) => { x.fillStyle = '#f2efe6'; x.fillRect(0, 0, s, s); x.fillStyle = '#b8453a'; x.fillRect(0, 0, s / 2, s); }),
    concrete: mkTex(256, (x, s) => { x.fillStyle = '#a4a6a1'; x.fillRect(0, 0, s, s); speckle(x, s, 900, .09); x.fillStyle = 'rgba(0,0,0,.14)'; x.fillRect(0, s / 2 - 1, s, 2); }),
    boards: mkTex(128, (x, s) => { for (let i = 0; i < 4; i++) { const v = 150 + ((rnd() * 30) | 0); x.fillStyle = 'rgb(' + v + ',' + ((v * .72) | 0) + ',' + ((v * .45) | 0) + ')'; x.fillRect(0, i * s / 4, s, s / 4 - 2); } speckle(x, s, 160, .1); }),
    wire: mkTex(64, (x, s) => { x.clearRect(0, 0, s, s); x.strokeStyle = '#b9c0c9'; x.lineWidth = 4; x.strokeRect(0, 0, s, s); })
  };
  const tm = (tex, c, r, m) => new THREE.MeshStandardMaterial({ map: tex, color: c === undefined ? 0xffffff : c, roughness: r === undefined ? .9 : r, metalness: m || 0, flatShading: true });
  const sm = matStd;
  const OM = {
    brick: tm(TEX.block), brickD: tm(TEX.block, 0xb4b4b0), concrete: tm(TEX.concrete), concreteD: sm(0x7d807b, .95),
    corr: tm(TEX.corrug, 0xffffff, .5, .55), corrD: tm(TEX.corrug, 0x6b7078, .55, .5), hazard: tm(TEX.hazard, 0xffffff, .6, .2),
    steel: sm(0x4a525c, .5, .6), steelL: sm(0x9aa3ae, .4, .65), steelD: sm(0x2a2f36, .55, .5), rust: sm(0x7a4a33, .85, .3),
    green: sm(0x3d6a4c, .6, .2), olive: sm(0x5a6b3a, .7), red: sm(0xb3261e, .55), white: sm(0xefefec, .55), cream: sm(0xe3d9bf, .8), dark: sm(0x1f2226, .7), rubber: sm(0x18181a, .95), yellow: PM.yellow,
    wood: PM.plank, woodF: PM.frame, woodD: sm(0x6a4a2c, .9), card: sm(0xb08a5a, .95), sack: PM.bag, lumber: sm(0xc9a06a, .9), soil: sm(0x4a3a2a, 1), leaf: sm(0x3f7a3a, .85), leafD: sm(0x2f5f2c, .9),
    awn: tm(TEX.stripe, 0xffffff, .85), boards: tm(TEX.boards), blueP: sm(0x2d5f9c, .5, .4), grey: sm(0x8a8d92, .7, .2),
    glass: new THREE.MeshStandardMaterial({ color: 0xaad8ff, roughness: .08, metalness: .25, transparent: true, opacity: .34, depthWrite: false, flatShading: true, side: THREE.DoubleSide }),
    lamp: new THREE.MeshBasicMaterial({ color: 0xfff2c0 }), lampOff: new THREE.MeshBasicMaterial({ color: 0x3a3a3a }),
    screen: new THREE.MeshBasicMaterial({ color: 0x9fe8b0 }), medCross: new THREE.MeshBasicMaterial({ color: 0xd8342a })
  };
  const GLOWTEX = mkTex(128, (x, s) => { const g = x.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2); g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(.5, 'rgba(255,255,255,.45)'); g.addColorStop(1, 'rgba(255,255,255,0)'); x.fillStyle = g; x.fillRect(0, 0, s, s); });
  GLOWTEX.wrapS = GLOWTEX.wrapT = THREE.ClampToEdgeWrapping;
  const FACMAT = FAC.map(f => sm(f.acc, .55)), FACTRIM = FAC.map(f => sm(f.trim, .6));

  /* caja con UV a escala de metro: el mismo mosaico mide lo mismo en cualquier tamaño de pieza (la malla se escala, la geometría lleva la UV ya escalada) */
  const TBG = {};
  function tbox(w, h, d, den) {
    const key = [w, h, d, den].map(v => v.toFixed(3)).join(','); if (TBG[key]) return TBG[key];
    const g = new THREE.BoxGeometry(1, 1, 1), uv = g.attributes.uv, f = [[d, h], [d, h], [w, d], [w, d], [w, h], [w, h]];
    for (let i = 0; i < 24; i++) { const s = f[(i / 4) | 0]; uv.setXY(i, uv.getX(i) * s[0] * den, uv.getY(i) * s[1] * den); }
    return (TBG[key] = g);
  }
  const bx = (g, out, mat, w, h, d, x, y, z, loose) => mkPiece(g, out, geoBox, mat, w, h, d, x, y, z, loose, [w, h, d]);
  const tx = (g, out, mat, den, w, h, d, x, y, z, loose) => mkPiece(g, out, tbox(w, h, d, den), mat, w, h, d, x, y, z, loose, [w, h, d]);
  const cy = (g, out, mat, r, h, x, y, z, loose) => mkPiece(g, out, geoCyl16, mat, r, h, r, x, y, z, loose, [2 * r, h, 2 * r]);
  const rot = (m, x, y, z) => { m.rotation.set(x || 0, y || 0, z || 0); return m; };
  const prism = n => new THREE.CylinderGeometry(1, 1, 1, n);

  /* hoja con bisagra: sus piezas se mueven alrededor de (hx, hz) y siguen siendo piezas normales (saltan al romperse) */
  function leaf(out, from, hx, hz, sign) { const pcs = out.slice(from); for (const pc of pcs) { pc.bx = pc.obj.position.x; pc.bz = pc.obj.position.z; pc.br = pc.obj.rotation.y; pc.by = pc.obj.position.y; pc.bsy = pc.obj.scale.y; } return { pcs, hx, hz, sign: sign || 1 }; }
  function swing(lf, a) { const c = Math.cos(a * lf.sign), s = Math.sin(a * lf.sign); for (const pc of lf.pcs) { if (pc.gone) continue; const dx = pc.bx - lf.hx, dz = pc.bz - lf.hz, o = pc.obj; o.position.x = lf.hx + dx * c + dz * s; o.position.z = lf.hz - dx * s + dz * c; o.rotation.y = pc.br + a * lf.sign; } }
  function slide(lf, d) { for (const pc of lf.pcs) if (!pc.gone) pc.obj.position.x = pc.bx + d; }
  function roll(lf, t, H) { for (const pc of lf.pcs) { if (pc.gone) continue; const o = pc.obj, k = 1 - t * .9; o.position.y = H - (H - pc.by) * k; o.scale.y = Math.max(.02, pc.bsy * (1 - t * .85)); } }

  /* =============================== constructores =============================== */
  const SP = {}, META = {};
  function def(type, meta, spec) { META[type] = Object.assign({ type }, meta); SP[type] = spec; }

  /* ---- muros (3 niveles): bloques con pilares → contrafuertes → revestimiento de chapa que retrasa la brecha ---- */
  function buildWall(lv) {
    return g => {
      const out = [], L = 3.2, T = lv === 3 ? .46 : .36, H = 2.4, pw = .46, cw = (L - pw * 2) / 2, rh = (H - .2) / 3;
      for (const s of [-1, 1]) { const px = s * (L / 2 - pw / 2); tx(g, out, OM.concrete, 1, pw, H, T + .08, px, H / 2, 0, false); bx(g, out, OM.concreteD, pw + .06, .1, T + .14, px, H + .05, 0, false); }
      tx(g, out, OM.concrete, 1, L - pw * 2 + .1, .2, T + .1, 0, .1, 0, false);
      for (let r = 0; r < 3; r++) for (const s of [-1, 1]) tx(g, out, OM.brick, 1.25, cw - .02, rh - .01, T - .02, s * cw / 2, .2 + rh * (r + .5), 0, true);
      tx(g, out, OM.concrete, 1, L - pw * 2 + .1, .1, T + .12, 0, H + .05, 0, true);
      if (lv >= 2) for (const s of [-1, 1]) for (const z of [-1, 1]) {            // contrafuertes a ambos lados (dos tramos escalonados)
        const cx = s * .95; tx(g, out, OM.concrete, 1, .5, 1.1, .3, cx, .55, z * (T / 2 + .14), false); tx(g, out, OM.concrete, 1, .42, .8, .24, cx, 1.5, z * (T / 2 + .11), false);
      }
      if (lv === 3) {                                                              // revestimiento reforzado: placas de acero atornilladas y franja de aviso
        for (const z of [-1, 1]) { tx(g, out, OM.corrD, 2.5, L - pw * 2 - .1, 1.5, .05, 0, .98, z * (T / 2 + .04), true); bx(g, out, OM.steelD, L - pw * 2 - .1, .07, .07, 0, 1.76, z * (T / 2 + .06), false); mkPiece(g, out, tbox(L - pw * 2 - .1, .16, .03, 4), OM.hazard, L - pw * 2 - .1, .16, .03, 0, .3, z * (T / 2 + .075), false, [L, .16, .03]); }
        for (const s of [-1, 1]) for (const z of [-1, 1]) bx(g, out, OM.steelL, .08, .08, .05, s * (cw - .1), 1.6, z * (T / 2 + .08), false);
      }
      const hz = lv >= 2 ? T / 2 + .3 : T / 2 + .05; return { out, hx: L / 2, hz, h: H + .1 };
    };
  }
  const wallHp = [0, 400, 650, 1000], wallNames = ['', 'Muro de bloques', 'Muro con contrafuertes', 'Muro reforzado'];
  for (let lv = 1; lv <= 3; lv++) def('wall' + lv, { name: wallNames[lv], cat: 'Accesos y defensa', level: lv }, { mat: 'block', hp: wallHp[lv], push: false, mass: 60, fric: 9, build: buildWall(lv) });

  /* ---- portón de acero de dos hojas (3 niveles) y puerta interior ---- */
  function gateBuild(lv, W, H, inner) {
    return g => {
      const out = [], hw = W / 2, pw = .5, T = lv >= 2 ? .16 : .1, lw = hw - pw - .02, hy = H - .35;
      for (const s of [-1, 1]) { tx(g, out, OM.concrete, 1, pw, H + .15, pw, s * (hw - pw / 2), (H + .15) / 2, 0, false); bx(g, out, OM.concreteD, pw + .08, .1, pw + .08, s * (hw - pw / 2), H + .2, 0, false); }
      bx(g, out, OM.steelD, W - pw * 2, .22, .24, 0, H - .1, 0, false);                                   // dintel
      if (!inner) mkPiece(g, out, tbox(W - pw * 2, .12, .03, 3), OM.hazard, W - pw * 2, .12, .03, 0, H - .1, .13, false, [W, .12, .03]);
      const lfs = [];
      for (const s of [-1, 1]) {
        const i0 = out.length, hx = s * (hw - pw), cx = s * (hw - pw - lw / 2);
        bx(g, out, OM.steelD, lw, .14, T + .04, cx, .12, 0, true); bx(g, out, OM.steelD, lw, .14, T + .04, cx, hy, 0, true);
        bx(g, out, OM.steelD, .12, hy, T + .04, hx - s * .06, hy / 2 + .05, 0, true); bx(g, out, OM.steelD, .12, hy, T + .04, hx - s * (lw - .06), hy / 2 + .05, 0, true);
        tx(g, out, OM.corr, 2.5, lw - .2, hy - .3, T * .6, cx, hy / 2 + .05, -.01, true);
        if (lv >= 2) { bx(g, out, OM.steel, lw - .1, .1, T + .1, cx, hy / 2 + .05, .02, true); rot(bx(g, out, OM.steel, .09, Math.hypot(lw, hy - .3) * .95, T + .06, cx, hy / 2 + .05, .02, true), 0, 0, s * Math.atan2(lw, hy - .3));
          if (lv >= 3) { rot(bx(g, out, OM.steel, .09, Math.hypot(lw, hy - .3) * .95, T + .06, cx, hy / 2 + .05, .02, true), 0, 0, -s * Math.atan2(lw, hy - .3)); bx(g, out, OM.steel, lw - .1, .1, T + .1, cx, hy * .27, .02, true); for (const [yy, xx] of [[.12, .2], [.12, lw - .2], [hy, .2], [hy, lw - .2]]) bx(g, out, OM.steelL, .16, .16, T + .1, hx - s * xx, yy, 0, true); mkPiece(g, out, tbox(lw - .2, .14, .03, 4), OM.hazard, lw - .2, .14, .03, cx, .42, T / 2 + .03, true, [lw, .14, .03]); } }
        bx(g, out, OM.steelL, .08, .3, .1, hx - s * (lw - .22), hy / 2, .06, true);                      // tirador
        lfs.push(leaf(out, i0, hx, 0, s));
      }
      bx(g, out, OM.rust, .07, .3, .06, 0, hy / 2, .075, false);                                          // cerrojo de unión
      return { out, hx: hw, hz: pw / 2 + .02, h: H + .2, leaves: lfs, openBoxes: [{ lx: -(hw - pw / 2), lz: 0, hx: pw / 2, hz: pw / 2 }, { lx: hw - pw / 2, lz: 0, hx: pw / 2, hz: pw / 2 }], swing: 1.75 };
    };
  }
  const gateHp = [0, 280, 450, 700], gateNames = ['', 'Portón de acero', 'Portón reforzado', 'Portón reforzado (nivel 3)'];
  for (let lv = 1; lv <= 3; lv++) def('gate' + lv, { name: gateNames[lv], cat: 'Accesos y defensa', level: lv, open: true }, { mat: 'metal', hp: gateHp[lv], push: false, mass: 60, fric: 9, build: gateBuild(lv, 4.2, 2.6, false) });
  def('gateInner', { name: 'Puerta interior del portón', cat: 'Accesos y defensa', open: true, note: 'Se añade al subir el portón a nivel 3 (segunda puerta que cierra el paso aunque caiga la exterior)' }, { mat: 'metal', hp: 350, push: false, mass: 40, fric: 9, build: gateBuild(2, 3.2, 2.3, true) });

  /* ---- puerta doble (madera con herrajes) ---- */
  def('door', { name: 'Puerta doble', cat: 'Accesos y defensa', open: true }, {
    mat: 'wood', hp: 90, push: false, mass: 12, fric: 9, build: g => {
      const out = [], W = 2.0, H = 2.2, hw = W / 2, lw = hw - .18, lfs = [];
      for (const s of [-1, 1]) bx(g, out, OM.concreteD, .16, H + .1, .22, s * (hw - .08), (H + .1) / 2, 0, false);
      bx(g, out, OM.concreteD, W, .14, .22, 0, H + .07, 0, false);
      for (const s of [-1, 1]) {
        const i0 = out.length, hx = s * (hw - .16), cx = s * (hw - .16 - lw / 2);
        bx(g, out, OM.woodF, .1, H - .1, .07, hx - s * .05, (H - .1) / 2 + .02, 0, true); bx(g, out, OM.woodF, .1, H - .1, .07, hx - s * (lw - .05), (H - .1) / 2 + .02, 0, true);
        bx(g, out, OM.woodF, lw, .12, .07, cx, .08, 0, true); bx(g, out, OM.woodF, lw, .12, .07, cx, H - .1, 0, true); bx(g, out, OM.woodF, lw, .1, .07, cx, H * .5, 0, true);
        tx(g, out, OM.boards, 3, lw - .2, H - .4, .04, cx, H / 2 + .02, .005, true);
        bx(g, out, OM.steelL, .05, .22, .05, hx - s * (lw - .16), H * .5 - .15, .06, true); bx(g, out, OM.steelD, .22, .06, .035, hx - s * .11, H - .22, .05, true); bx(g, out, OM.steelD, .22, .06, .035, hx - s * .11, .26, .05, true);
        lfs.push(leaf(out, i0, hx, 0, s));
      }
      return { out, hx: hw, hz: .13, h: H + .14, leaves: lfs, openBoxes: [{ lx: -(hw - .08), lz: 0, hx: .09, hz: .12 }, { lx: hw - .08, lz: 0, hx: .09, hz: .12 }], swing: 1.65 };
    }
  });

  /* ---- verja corredera (barrotes; las balas pasan en parte) ---- */
  def('slideGate', { name: 'Verja corredera', cat: 'Accesos y defensa', open: true }, {
    mat: 'metal', hp: 200, push: false, mass: 40, fric: 9, pen: .35, build: g => {
      const out = [], W = 4.2, H = 2.2, lw = 3.6;
      for (const s of [-1, 1]) { tx(g, out, OM.concrete, 1, .4, H + .1, .4, s * (W / 2 - .2), (H + .1) / 2, 0, false); bx(g, out, OM.steelD, .3, .12, .3, s * (W / 2 - .2), H + .16, 0, false); }
      bx(g, out, OM.steelD, W - .8, .08, .14, 0, .04, .12, false);                                       // carril
      const i0 = out.length;
      bx(g, out, OM.steelD, lw, .1, .1, 0, .22, 0, true); bx(g, out, OM.steelD, lw, .1, .1, 0, H - .12, 0, true); bx(g, out, OM.steelD, lw, .08, .08, 0, H * .55, 0, true);
      for (let k = 0; k <= 18; k++) { const x = -lw / 2 + .05 + k * (lw - .1) / 18; bx(g, out, OM.steel, .045, H - .3, .045, x, H / 2 - .01, 0, true); }
      for (const s of [-1, 1]) bx(g, out, OM.steelD, .1, H - .1, .1, s * (lw / 2 - .05), H / 2 + .05, 0, true);
      cy(g, out, OM.steelL, .07, .12, -lw / 2 + .3, .1, .08, true); cy(g, out, OM.steelL, .07, .12, lw / 2 - .3, .1, .08, true);
      const lf = leaf(out, i0, 0, 0, 1);
      return { out, hx: W / 2, hz: .22, h: H + .2, leaves: [lf], slide: 3.6, openBoxes: [{ lx: -(W / 2 - .2), lz: 0, hx: .2, hz: .2 }, { lx: W / 2 - .2, lz: 0, hx: .2, hz: .2 }, { lx: 3.6, lz: 0, hx: lw / 2, hz: .1 }] };
    }
  });

  /* ---- persiana enrollable ---- */
  def('shutter', { name: 'Persiana', cat: 'Sonido y visibilidad', open: true, note: 'Al moverla hace ruido (alerta a infectados)' }, {
    mat: 'metal', hp: 90, push: false, mass: 20, fric: 9, noiseOnMove: 30, build: g => {
      const out = [], W = 2.6, H = 2.4, N = 12, sh = (H - .1) / N;
      for (const s of [-1, 1]) bx(g, out, OM.steelD, .12, H, .18, s * (W / 2 - .06), H / 2, 0, false);
      bx(g, out, OM.steelD, W, .3, .26, 0, H - .15 + .05, 0, false);
      const i0 = out.length;
      for (let k = 0; k < N; k++) mkPiece(g, out, tbox(W - .2, sh - .01, .04, 3), k % 2 ? OM.corr : OM.corrD, W - .2, sh - .01, .04, 0, sh / 2 + k * sh, 0, true, [W, sh, .04]);
      bx(g, out, OM.steelL, .14, .06, .06, 0, .1, .05, true);
      const lf = leaf(out, i0, 0, 0, 1); lf.H = H - .3;
      return { out, hx: W / 2, hz: .13, h: H + .1, leaves: [lf], roll: true, openBoxes: [] };
    }
  });

  /* ---- puesto de vigilancia elevado: patas, plataforma, parapeto de sacos, techo de chapa y escalera trasera ---- */
  def('tower', { name: 'Puesto de vigilancia elevado', cat: 'Accesos y defensa', note: 'Un agente por puesto con visión directa; ocupación y altura de tiro: entrega 2' }, {
    mat: 'wood', hp: 320, push: false, mass: 80, fric: 9, build: g => {
      const out = [], S = 2.6, hs = S / 2, DY = 2.3;
      for (const a of [-1, 1]) for (const b of [-1, 1]) bx(g, out, OM.woodF, .22, DY + .1, .22, a * (hs - .15), (DY + .1) / 2, b * (hs - .15), false);
      for (const z of [-1, 1]) for (const [y, l] of [[.6, 1], [1.4, 1]]) rot(bx(g, out, OM.woodD, S - .3, .1, .08, 0, y + .4, z * (hs - .15), true), 0, 0, (y < 1 ? .5 : -.5) * .55);
      for (const x of [-1, 1]) bx(g, out, OM.woodD, .08, .1, S - .3, x * (hs - .15), 1.0, 0, true);
      bx(g, out, OM.woodF, S, .14, S, 0, DY, 0, true);                                                    // plataforma
      for (let k = 0; k < 4; k++) tx(g, out, OM.boards, 2, S - .1, .03, .5, 0, DY + .085, -hs + .35 + k * .6, true);
      for (let k = 0; k < 4; k++) { bx(g, out, OM.sack, 1.1, .3, .45, -.65 + (k % 2) * 1.3, DY + .22, hs - .3, true); }   // parapeto de sacos delantero
      bx(g, out, OM.sack, 1.2, .3, .45, 0, DY + .5, hs - .3, true);
      for (const x of [-1, 1]) bx(g, out, OM.woodD, .18, 1.7, .18, x * (hs - .15), DY + 1.0, -hs + .15, false);       // postes del techo (atrás)
      for (const x of [-1, 1]) bx(g, out, OM.woodD, .18, 1.2, .18, x * (hs - .15), DY + .75, hs - .15, false);
      rot(tx(g, out, OM.corr, 2, S + .5, .06, S + .6, 0, DY + 1.55, 0, true), .13, 0, 0);                  // techo de chapa inclinado hacia delante
      for (let k = 0; k < 7; k++) bx(g, out, OM.woodF, .55, .05, .1, 0, .3 + k * .32, -hs - .08 - k * 0, true);   // peldaños de la escalera trasera
      for (const x of [-.3, .3]) bx(g, out, OM.woodF, .07, DY + .2, .07, x, (DY + .2) / 2, -hs - .08, true);
      return { out, hx: hs, hz: hs + .1, h: DY + 1.6, seats: [{ lx: 0, lz: -.2, y: DY + .09 }] };
    }
  });

  /* ---- pasarela y escalera de servicio (acero) ---- */
  def('catwalk', { name: 'Pasarela elevada', cat: 'Accesos y defensa', note: 'Hoy es un obstáculo sólido; la altura transitable llega con la navegación vertical (entrega 2)' }, {
    mat: 'metal', hp: 260, push: false, mass: 80, fric: 9, build: g => {
      const out = [], L = 4.4, W = 1.3, DY = 2.4;
      for (const s of [-1, 1]) for (const z of [-1, 1]) bx(g, out, OM.steel, .14, DY, .14, s * (L / 2 - .2), DY / 2, z * (W / 2 - .12), false);
      for (const s of [-1, 1]) bx(g, out, OM.steel, .1, .1, W - .1, s * (L / 2 - .2), DY - .15, 0, true);
      for (const z of [-1, 1]) bx(g, out, OM.steel, L, .14, .1, 0, DY - .05, z * (W / 2 - .1), true);
      tx(g, out, OM.corr, 1.5, L, .05, W - .05, 0, DY + .02, 0, true);
      for (const z of [-1, 1]) { bx(g, out, OM.yellow, L, .06, .06, 0, DY + 1.0, z * (W / 2 - .06), true); bx(g, out, OM.yellow, L, .06, .06, 0, DY + .55, z * (W / 2 - .06), true); for (let k = 0; k <= 8; k++) bx(g, out, OM.yellow, .06, 1.0, .06, -L / 2 + .1 + k * (L - .2) / 8, DY + .5, z * (W / 2 - .06), true); }
      return { out, hx: L / 2, hz: W / 2, h: DY + 1.05 };
    }
  });
  def('stairs', { name: 'Escalera de servicio', cat: 'Accesos y defensa', note: 'Sólida hoy; sube a la pasarela cuando exista la navegación vertical' }, {
    mat: 'metal', hp: 220, push: false, mass: 70, fric: 9, build: g => {
      const out = [], N = 12, run = .28, rise = 2.4 / N, W = 1.1, L = N * run;
      for (const z of [-1, 1]) rot(bx(g, out, OM.steel, Math.hypot(L, 2.4), .16, .06, 0, 1.2, z * (W / 2 - .03), true), 0, 0, Math.atan2(2.4, L));
      for (let k = 0; k < N; k++) { tx(g, out, OM.corr, 1.5, run + .02, .05, W - .1, -L / 2 + run * (k + .5), rise * (k + 1) - .02, 0, true); }
      for (const z of [-1, 1]) { rot(bx(g, out, OM.yellow, Math.hypot(L, 2.4), .06, .06, 0, 1.2 + .95, z * (W / 2 - .03), true), 0, 0, Math.atan2(2.4, L)); for (const k of [0, 4, 8, 11]) bx(g, out, OM.yellow, .06, .95, .06, -L / 2 + run * (k + .5), rise * (k + 1) + .48, z * (W / 2 - .03), true); }
      return { out, hx: L / 2, hz: W / 2, h: 3.3 };
    }
  });

  /* ---- mobiliario urbano ---- */
  def('bench', { name: 'Banco de hormigón', cat: 'Mobiliario urbano' }, {
    mat: 'block', hp: 150, push: false, mass: 40, fric: 9, build: g => {
      const out = [];
      for (const s of [-1, 1]) tx(g, out, OM.concrete, 1.5, .3, .42, .45, s * .7, .21, 0, false);
      tx(g, out, OM.concrete, 1.5, 1.9, .1, .46, 0, .47, 0, true); rot(tx(g, out, OM.concrete, 1.5, 1.9, .42, .09, 0, .72, -.2, true), -.12, 0, 0);
      return { out, hx: .95, hz: .23, h: .93 };
    }
  });
  def('planter', { name: 'Jardinera', cat: 'Mobiliario urbano' }, {
    mat: 'block', hp: 170, push: false, mass: 40, fric: 9, build: g => {
      const out = [];
      tx(g, out, OM.concrete, 1.5, 1.5, .5, .75, 0, .25, 0, false); bx(g, out, OM.concreteD, 1.56, .07, .81, 0, .53, 0, true); bx(g, out, OM.soil, 1.38, .06, .62, 0, .55, 0, true);
      for (let k = 0; k < 5; k++) { const m = mkPiece(g, out, geoBall, k % 2 ? OM.leaf : OM.leafD, .3 + rnd() * .12, .26 + rnd() * .1, .3, -.55 + k * .28, .78 + rnd() * .1, (rnd() - .5) * .25, true, [.4, .35, .4]); }
      return { out, hx: .78, hz: .42, h: .95 };
    }
  });
  def('busStop', { name: 'Marquesina', cat: 'Mobiliario urbano' }, {
    mat: 'metal', hp: 110, push: false, mass: 60, fric: 9, build: g => {
      const out = [], L = 3.2, D = 1.3;
      for (const s of [-1, 1]) bx(g, out, OM.steel, .1, 2.5, .1, s * (L / 2 - .1), 1.25, -D / 2 + .1, false);
      for (const s of [-1, 1]) bx(g, out, OM.steel, .1, 2.2, .1, s * (L / 2 - .1), 1.1, D / 2 - .1, false);
      rot(bx(g, out, OM.steelD, L + .2, .1, D + .2, 0, 2.5, 0, true), .06, 0, 0); bx(g, out, OM.blueP, L + .2, .22, .06, 0, 2.58, D / 2 + .08, true);
      for (let k = 0; k < 3; k++) bx(g, out, OM.glass, L / 3 - .06, 1.7, .03, -L / 3 + k * L / 3, 1.25, -D / 2 + .1, true);
      bx(g, out, OM.glass, .03, 1.7, D - .3, -L / 2 + .12, 1.25, 0, true);
      bx(g, out, OM.steelD, 2.0, .06, .42, 0, .5, -D / 2 + .42, true); bx(g, out, OM.steel, .06, .5, .36, -.9, .25, -D / 2 + .42, false); bx(g, out, OM.steel, .06, .5, .36, .9, .25, -D / 2 + .42, false);
      bx(g, out, OM.white, .8, 1.0, .05, 1.1, 1.3, D / 2 - .1, true);
      return { out, hx: L / 2 + .1, hz: D / 2 + .1, h: 2.65 };
    }
  });
  def('kiosk', { name: 'Quiosco', cat: 'Mobiliario urbano' }, {
    mat: 'wood', hp: 200, push: false, mass: 70, fric: 9, build: g => {
      const out = [], W = 2.4, D = 2.0, H = 2.3;
      tx(g, out, OM.boards, 2, W, H, .08, 0, H / 2, -D / 2 + .04, true); for (const s of [-1, 1]) tx(g, out, OM.boards, 2, .08, H, D, s * (W / 2 - .04), H / 2, 0, true);
      bx(g, out, OM.woodF, W, .8, .08, 0, .4, D / 2 - .04, true); bx(g, out, OM.woodF, W, .5, .08, 0, H - .25, D / 2 - .04, true);
      bx(g, out, OM.woodD, W + .06, .08, .5, 0, 1.2, D / 2 + .2, true);                                      // mostrador
      for (const s of [-1, 1]) bx(g, out, OM.woodF, .1, .85, .08, s * (W / 2 - .1), 1.2, D / 2 - .04, true);
      bx(g, out, OM.corr, W + .3, .06, D + .5, 0, H + .05, .1, true);
      rot(tx(g, out, OM.awn, 2.4, W + .1, .05, .8, 0, 1.95, D / 2 + .45, true), .45, 0, 0);
      bx(g, out, OM.card, .5, .35, .3, -.7, 1.4, D / 2 + .15, true); bx(g, out, OM.red, .4, .25, .3, .1, 1.35, D / 2 + .15, true); bx(g, out, OM.yellow, .3, .35, .3, .6, 1.38, D / 2 + .15, true);
      return { out, hx: W / 2 + .15, hz: D / 2 + .45, h: H + .1 };
    }
  });
  const binBuild = (dump) => g => {
    const out = [], W = dump ? 1.9 : .62, D = dump ? .95 : .7, H = dump ? 1.25 : 1.0, bm = dump ? OM.green : OM.grey;
    tx(g, out, bm, 1.5, W, H - .15, D, 0, (H - .15) / 2 + .13, 0, true); rot(bx(g, out, dump ? OM.steelD : OM.green, W + .06, .1, D + .06, 0, H + .02, 0, true), dump ? 0 : -.1, 0, 0);
    for (const s of [-1, 1]) for (const z of [-1, 1]) cy(g, out, OM.rubber, dump ? .1 : .07, .06, s * (W / 2 - .12), .1, z * (D / 2 - .08), true).rotation.z = Math.PI / 2;
    if (dump) { bx(g, out, OM.steelD, W, .08, .08, 0, .9, D / 2 + .02, true); bx(g, out, OM.yellow, .6, .2, .03, .5, .75, D / 2 + .01, true); } else bx(g, out, OM.dark, .3, .06, .04, 0, .6, D / 2 + .02, true);
    return { out, hx: W / 2, hz: D / 2, h: H + .08 };
  };
  def('wheelie', { name: 'Contenedor con ruedas', cat: 'Mobiliario urbano' }, { mat: 'plastic', hp: 60, push: true, mass: 2, fric: 5, build: binBuild(false) });
  def('dumpster', { name: 'Contenedor de basura', cat: 'Mobiliario urbano', proposal: true }, { mat: 'metal', hp: 190, push: true, mass: 14, fric: 9, build: binBuild(true) });

  /* ---- comercio y transporte ---- */
  function palletParts(g, out, w, d) {
    for (const z of [-1, 0, 1]) bx(g, out, OM.woodF, w, .1, .12, 0, .06, z * (d / 2 - .06), true);
    for (let k = 0; k < 5; k++) bx(g, out, OM.wood, .16, .03, d, -w / 2 + .12 + k * (w - .24) / 4, .135, 0, true);
    for (let k = 0; k < 3; k++) bx(g, out, OM.wood, .12, .07, d, -w / 2 + .08 + k * (w - .16) / 2, .035, 0, true);
  }
  def('pallet', { name: 'Palé', cat: 'Comercio y transporte' }, { mat: 'wood', hp: 30, push: true, mass: 1.6, fric: 6, build: g => { const out = []; palletParts(g, out, 1.2, 1.0); return { out, hx: .6, hz: .5, h: .18 }; } });
  def('palletBoxes', { name: 'Palé con cajas', cat: 'Comercio y transporte' }, {
    mat: 'wood', hp: 70, push: true, mass: 5, fric: 8, build: g => {
      const out = []; palletParts(g, out, 1.2, 1.0);
      for (const [x, z, h, m] of [[-.3, -.22, .5, OM.card], [.3, -.22, .45, OM.card], [-.3, .24, .4, OM.cream], [.3, .24, .5, OM.card]]) { bx(g, out, m, .54, h, .44, x, .15 + h / 2, z, true); bx(g, out, OM.steelL, .12, .02, .45, x, .15 + h + .005, z, true); }
      bx(g, out, OM.cream, .5, .4, .42, -.3, .15 + .5 + .2, -.22, true);
      return { out, hx: .6, hz: .5, h: 1.1 };
    }
  });
  def('cage', { name: 'Jaula metálica', cat: 'Comercio y transporte' }, {
    mat: 'metal', hp: 110, push: true, mass: 6, fric: 7, pen: .3, build: g => {
      const out = [], W = 1.2, D = .8, H = 1.7;
      bx(g, out, OM.steelD, W, .12, D, 0, .2, 0, false); for (const s of [-1, 1]) for (const z of [-1, 1]) cy(g, out, OM.rubber, .07, .06, s * (W / 2 - .1), .07, z * (D / 2 - .1), false).rotation.z = Math.PI / 2;
      for (const s of [-1, 1]) for (const z of [-1, 1]) bx(g, out, OM.steelL, .05, H - .2, .05, s * (W / 2 - .03), H / 2 + .1, z * (D / 2 - .03), true);
      for (const y of [.55, 1.1, H - .1]) for (const z of [-1, 1]) bx(g, out, OM.steelL, W, .04, .04, 0, y, z * (D / 2 - .03), true);
      for (const y of [.55, 1.1, H - .1]) for (const s of [-1, 1]) bx(g, out, OM.steelL, .04, .04, D, s * (W / 2 - .03), y, 0, true);
      for (let k = 1; k < 8; k++) bx(g, out, OM.steelL, .02, H - .4, .02, -W / 2 + k * W / 8, H / 2 + .1, D / 2 - .03, true);
      for (let k = 1; k < 6; k++) bx(g, out, OM.steelL, .02, H - .4, .02, -W / 2 + k * W / 6, H / 2 + .1, -D / 2 + .03, true);
      bx(g, out, OM.card, .5, .4, .5, -.25, .46, 0, true); bx(g, out, OM.cream, .5, .35, .5, .25, .43, .05, true); bx(g, out, OM.card, .45, .35, .45, -.2, .85, 0, true);
      return { out, hx: W / 2, hz: D / 2, h: H };
    }
  });
  def('counter', { name: 'Mostrador', cat: 'Comercio y transporte' }, {
    mat: 'wood', hp: 130, push: false, mass: 50, fric: 9, build: g => {
      const out = [], W = 2.4, D = .75, H = 1.05;
      tx(g, out, OM.boards, 2, W, H - .08, D - .1, 0, (H - .08) / 2, -.03, true); bx(g, out, OM.white, W + .08, .08, D, 0, H - .04, 0, true);
      bx(g, out, OM.dark, W - .2, .1, .04, 0, .12, D / 2 - .06, false); bx(g, out, OM.steelL, .5, .03, .3, .7, H + .02, 0, true);
      bx(g, out, OM.dark, .3, .22, .25, .7, H + .15, -.05, true); bx(g, out, OM.screen, .22, .12, .02, .7, H + .17, .08, true);
      return { out, hx: W / 2 + .04, hz: D / 2, h: H + .3 };
    }
  });
  function shelfFrame(g, out, W, D, H, levels, m) {
    for (const s of [-1, 1]) for (const z of [-1, 1]) bx(g, out, m, .06, H, .06, s * (W / 2 - .03), H / 2, z * (D / 2 - .03), false);
    for (let k = 0; k <= levels; k++) bx(g, out, OM.steelL, W, .05, D, 0, .1 + k * (H - .15) / levels, 0, true);
    bx(g, out, OM.steelD, W, H - .1, .02, 0, H / 2, -D / 2 + .01, true);
  }
  const prodColors = [OM.red, OM.yellow, OM.blueP, OM.white, OM.green, OM.card];
  def('shelf', { name: 'Estantería', cat: 'Comercio y transporte' }, {
    mat: 'metal', hp: 90, push: false, mass: 30, fric: 9, build: g => {
      const out = [], W = 2.2, D = .55, H = 1.9; shelfFrame(g, out, W, D, H, 4, OM.steel);
      for (let l = 0; l < 4; l++) for (let k = 0; k < 7; k++) { const h = .22 + rnd() * .12; bx(g, out, prodColors[(k + l * 2) % 6], .26, h, .26 + rnd() * .1, -W / 2 + .22 + k * .3, .13 + l * (H - .15) / 4 + h / 2 + .03, 0, true); }
      return { out, hx: W / 2, hz: D / 2, h: H };
    }
  });
  def('locker', { name: 'Taquilla', cat: 'Comercio y transporte' }, {
    mat: 'metal', hp: 80, push: false, mass: 25, fric: 9, build: g => {
      const out = [], N = 3, w = .5, H = 1.85, D = .5, cols = [OM.blueP, OM.blueP, OM.green];
      bx(g, out, OM.steelD, N * w + .06, .08, D, 0, .04, 0, false);
      for (let k = 0; k < N; k++) { const x = (k - (N - 1) / 2) * w; bx(g, out, cols[k], w - .02, H - .1, D - .08, x, H / 2 + .02, -.02, true); bx(g, out, OM.steelD, w - .12, .05, .02, x, H - .35, D / 2 - .03, true); bx(g, out, OM.steelD, w - .12, .05, .02, x, H - .42, D / 2 - .03, true); bx(g, out, OM.steelL, .03, .14, .03, x + w * .28, H * .55, D / 2 - .02, true); }
      bx(g, out, OM.steelD, N * w + .06, .06, D + .02, 0, H + .02, 0, true);
      return { out, hx: N * w / 2 + .03, hz: D / 2, h: H + .06 };
    }
  });
  def('pharmaCab', { name: 'Armario de farmacia', cat: 'Comercio y transporte', loot: [{ k: 'botiquín', n: [1, 3] }] }, {
    mat: 'metal', hp: 70, push: false, mass: 30, fric: 9, build: g => {
      const out = [], W = 1.1, D = .45, H = 1.9;
      bx(g, out, OM.white, W, H, D, 0, H / 2, 0, false); bx(g, out, OM.white, W + .06, .08, D + .04, 0, H + .02, 0, true);
      for (const s of [-1, 1]) { bx(g, out, OM.glass, W / 2 - .1, H - .6, .03, s * W / 4, H / 2 + .1, D / 2 + .005, true); bx(g, out, OM.steelL, .02, .3, .03, s * .05, H / 2 + .1, D / 2 + .02, true); }
      for (let l = 0; l < 3; l++) for (let k = 0; k < 6; k++) bx(g, out, k % 3 ? OM.white : OM.green, .12, .12, .1, -W / 2 + .12 + k * .17, .55 + l * .42, 0, true);
      bx(g, out, OM.medCross, .22, .06, .03, 0, H - .13, D / 2 + .02, true); bx(g, out, OM.medCross, .06, .22, .03, 0, H - .13, D / 2 + .02, true); bx(g, out, OM.white, .5, .3, .05, 0, H - .13, D / 2 + .01, true);
      return { out, hx: W / 2 + .03, hz: D / 2 + .02, h: H + .06 };
    }
  });
  function supplyBuild(kind) {
    return g => {
      const out = [], W = .8, D = .55, H = .5, body = kind === 'ammo' ? OM.olive : kind === 'med' ? OM.white : OM.woodD;
      bx(g, out, body, W, H - .06, D, 0, (H - .06) / 2 + .03, 0, true);
      for (const s of [-1, 1]) bx(g, out, kind === 'mat' ? OM.woodF : OM.dark, .07, H, D + .02, s * (W / 2 - .12), H / 2, 0, true);
      bx(g, out, kind === 'med' ? OM.white : kind === 'ammo' ? OM.olive : OM.woodF, W + .02, .05, D + .02, 0, H, 0, true);
      if (kind === 'med') { bx(g, out, OM.medCross, .22, .06, .02, 0, H * .5, D / 2 + .012, true); bx(g, out, OM.medCross, .06, .22, .02, 0, H * .5, D / 2 + .012, true); }
      else if (kind === 'ammo') { bx(g, out, OM.yellow, .3, .1, .02, 0, H * .55, D / 2 + .012, true); bx(g, out, OM.yellow, .08, .24, .02, -W / 2 + .06, H * .5, D / 2 + .012, true); }
      else { bx(g, out, OM.steelL, .06, .1, .02, -.2, H * .75, D / 2 + .012, true); bx(g, out, OM.steelL, .06, .1, .02, .2, H * .75, D / 2 + .012, true); }
      bx(g, out, OM.steelL, .1, .05, .06, 0, H + .03, 0, true);
      return { out, hx: W / 2, hz: D / 2, h: H + .05 };
    };
  }
  def('supplyMat', { name: 'Caja de materiales', cat: 'Comercio y transporte', loot: [{ k: 'material', n: [1, 3] }] }, { mat: 'wood', hp: 40, push: true, mass: 3, fric: 7, build: supplyBuild('mat') });
  def('supplyAmmo', { name: 'Caja de munición', cat: 'Comercio y transporte', loot: [{ k: 'munición', n: [1, 3] }] }, { mat: 'wood', hp: 45, push: true, mass: 3, fric: 7, build: supplyBuild('ammo') });
  def('supplyMed', { name: 'Caja médica', cat: 'Comercio y transporte', loot: [{ k: 'botiquín', n: [1, 2] }, { k: 'kit de reanimación', n: [0, 1] }] }, { mat: 'plastic', hp: 40, push: true, mass: 2.5, fric: 7, build: supplyBuild('med') });

  const CAR_COL = [0x8a8f96, 0x9b2f26, 0x2e4f7c, 0x58613f, 0xc7c3b8];
  def('car', { name: 'Coche abandonado', cat: 'Comercio y transporte', proposal: true }, {
    mat: 'metal', hp: 320, push: true, mass: 40, fric: 14, build: g => {
      const out = [], L = 4.3, W = 1.8, body = sm(CAR_COL[(rnd() * CAR_COL.length) | 0], .45, .5), bd = body.clone(); bd.color.multiplyScalar(.7);
      bx(g, out, body, L, .55, W, 0, .6, 0, false); bx(g, out, bd, L - .1, .22, W - .06, 0, .3, 0, false);
      bx(g, out, body, 1.35, .13, W - .12, L / 2 - .9, .94, 0, true); bx(g, out, body, 1.0, .13, W - .12, -L / 2 + .55, .94, 0, true);          // capó y maletero
      bx(g, out, body, 1.9, .5, W - .2, -.2, 1.22, 0, true);                                                                                  // cabina
      for (const x of [.73, -1.0]) bx(g, out, OM.glass, .04, .38, W - .36, x, 1.2, 0, true);
      for (const s of [-1, 1]) { bx(g, out, OM.glass, 1.3, .36, .03, -.2, 1.24, s * (W / 2 - .09), true); bx(g, out, OM.dark, .06, .4, .05, .45 - .1, 1.24, s * (W / 2 - .1), true); }
      for (const a of [-1, 1]) for (const b of [-1, 1]) { cy(g, out, OM.rubber, .31, .22, a * (L / 2 - .85), .31, b * (W / 2 - .07), true).rotation.x = Math.PI / 2; cy(g, out, OM.steelL, .16, .24, a * (L / 2 - .85), .31, b * (W / 2 - .07), true).rotation.x = Math.PI / 2; }
      for (const s of [-1, 1]) { bx(g, out, OM.lampOff, .06, .12, .32, L / 2 - .02, .72, s * (W / 2 - .3), true); bx(g, out, OM.red, .06, .1, .3, -L / 2 + .02, .72, s * (W / 2 - .3), true); }
      bx(g, out, OM.steelD, .16, .12, W - .1, L / 2 - .02, .35, 0, true); bx(g, out, OM.steelD, .16, .12, W - .1, -L / 2 + .02, .35, 0, true);
      return { out, hx: L / 2, hz: W / 2, h: 1.5 };
    }
  });

  def('stall', { name: 'Puesto de mercado', cat: 'Comercio y transporte' }, {
    mat: 'wood', hp: 100, push: false, mass: 40, fric: 9, build: g => {
      const out = [], W = 2.6, D = 1.3, H = 2.3;
      for (const s of [-1, 1]) for (const z of [-1, 1]) bx(g, out, OM.woodF, .1, H, .1, s * (W / 2 - .05), H / 2, z * (D / 2 - .05), z < 0);
      tx(g, out, OM.boards, 2, W, .85, D - .3, 0, .43, .08, true); bx(g, out, OM.woodD, W + .1, .06, D - .2, 0, .88, .08, true);
      rot(tx(g, out, OM.awn, 2.4, W + .3, .05, D + .6, 0, H - .05, 0, true), .16, 0, 0);
      for (let k = 0; k < 5; k++) { bx(g, out, k % 2 ? OM.red : OM.yellow, .38, .2, .3, -.9 + k * .45, 1.0, .1, true); }
      for (let k = 0; k < 3; k++) mkPiece(g, out, geoBall, OM.leaf, .16, .14, .16, -.5 + k * .45, 1.2, .1, true, [.3, .3, .3]);
      return { out, hx: W / 2 + .15, hz: D / 2 + .3, h: H };
    }
  });

  /* ---- sonido y visibilidad ---- */
  def('glassPane', { name: 'Cristalera', cat: 'Sonido y visibilidad', note: 'Al romperse abre la línea de visión y hace ruido' }, {
    mat: 'glass', hp: 22, push: false, mass: 10, fric: 9, pen: .85, noiseOnBreak: 40, build: g => {
      const out = [], W = 2.0, H = 2.2;
      for (const s of [-1, 1]) bx(g, out, OM.steelD, .08, H, .12, s * (W / 2 - .04), H / 2, 0, false); bx(g, out, OM.steelD, W, .08, .12, 0, .04, 0, false); bx(g, out, OM.steelD, W, .08, .12, 0, H - .04, 0, false);
      const hw = (W - .16) / 2, hh = (H - .16) / 2;
      for (const sx of [-1, 1]) for (const sy of [-1, 1]) { const m = bx(g, out, OM.glass, hw - .005, hh - .005, .03, sx * hw / 2, H / 2 + sy * hh / 2, 0, true); }
      bx(g, out, OM.steelD, .05, H - .1, .06, 0, H / 2, 0, false); bx(g, out, OM.steelD, W - .1, .05, .06, 0, H / 2, 0, false);
      return { out, hx: W / 2, hz: .08, h: H };
    }
  });
  function shopFront(label, bg, fg, cross) {
    return g => {
      const out = [], W = 4.4, H = 3.0, hw = W / 2;
      tx(g, out, OM.brick, 1.25, W, .8, .34, 0, .4, 0, true); tx(g, out, OM.concrete, 1, W, .5, .38, 0, H - .25, 0, false);
      for (const s of [-1, 0, 1]) bx(g, out, OM.steelD, .2, H, .36, s * (hw - .1), H / 2, 0, false);
      const glassPcs = []; for (const s of [-1, 1]) glassPcs.push(bx(g, out, OM.glass, hw - .3, 1.6, .03, s * (hw / 2 - .02), 1.6, 0, true) && out[out.length - 1]);
      bx(g, out, OM.steelD, W - .3, .08, .06, 0, 2.42, 0, false); bx(g, out, OM.steelD, .06, 1.62, .06, 0, 1.6, 0, false);
      const sm2 = new THREE.MeshBasicMaterial({ map: mkTex(256, (x, s) => { x.fillStyle = bg; x.fillRect(0, 0, s, s); x.fillStyle = fg; x.font = 'bold 40px sans-serif'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText(label, s / 2, s / 2 + 3); }) });
      sm2.map.wrapS = sm2.map.wrapT = THREE.ClampToEdgeWrapping; sm2.map.repeat.set(1, 1);
      const sign = bx(g, out, sm2, 2.6, .46, .06, 0, H - .25, .21, true); sign.geometry = sign.geometry.clone(); const uv = sign.geometry.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setY(i, uv.getY(i) * .25 + .375);
      if (cross) { bx(g, out, OM.green, .36, .1, .05, 1.9, H - .25, .22, true); bx(g, out, OM.green, .1, .36, .05, 1.9, H - .25, .22, true); }
      const beacon = new THREE.Mesh(geoBall, new THREE.MeshBasicMaterial({ color: 0x551111 })); beacon.scale.set(.1, .1, .1); beacon.position.set(-hw + .25, H + .1, 0); g.add(beacon);
      return { out, hx: hw, hz: .2, h: H, beacon, glassPcs };
    };
  }
  def('shopFront', { name: 'Escaparate de tienda', cat: 'Sonido y visibilidad', alarm: true, note: 'Alarma de tienda: al romper un cristal suena y atrae infectados' }, { mat: 'block', hp: 300, push: false, mass: 80, fric: 9, alarm: true, build: shopFront('TIENDA', '#c8892a', '#fff4d6', false) });
  def('pharmFront', { name: 'Escaparate de farmacia', cat: 'Sonido y visibilidad', alarm: true }, { mat: 'block', hp: 300, push: false, mass: 80, fric: 9, alarm: true, build: shopFront('FARMACIA', '#2c7a4a', '#f2fff4', true) });

  def('floodlight', { name: 'Foco de patio', cat: 'Sonido y visibilidad', note: 'Apagarlo o romperlo oculta la zona (efecto de visión: entrega 2)' }, {
    mat: 'metal', hp: 80, push: false, mass: 20, fric: 9, build: g => {
      const out = [], H = 4.2;
      bx(g, out, OM.concreteD, .5, .2, .5, 0, .1, 0, false); cy(g, out, OM.steel, .09, H, 0, H / 2 + .1, 0, false);
      bx(g, out, OM.steelD, .1, .1, .9, 0, H + .1, .3, true);
      const head = bx(g, out, OM.steelD, .7, .34, .26, 0, H + .1, .78, true); bx(g, out, OM.steelD, .74, .06, .3, 0, H + .3, .78, true);
      bx(g, out, OM.lamp, .6, .24, .02, 0, H + .08, .92, true); const lamp = out[out.length - 1];
      const glow = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), new THREE.MeshBasicMaterial({ map: GLOWTEX, color: 0xfff0b8, transparent: true, opacity: .22, depthWrite: false, blending: THREE.AdditiveBlending })); glow.rotation.x = -Math.PI / 2; glow.position.set(0, .05, 2.2); glow.scale.set(2.4, 2.4, 2.4); g.add(glow);
      return { out, hx: .25, hz: .25, h: H + .3, glow, lamp };
    }
  });
  def('pump', { name: 'Surtidor de gasolinera', cat: 'Sonido y visibilidad', note: 'Gasolinera: punto reconocible de abastecimiento (sin transporte de bidones)' }, {
    mat: 'metal', hp: 120, push: false, mass: 40, fric: 9, fluid: 'fuel', build: g => {
      const out = [];
      bx(g, out, OM.concreteD, .9, .14, .7, 0, .07, 0, false); bx(g, out, OM.red, .6, 1.5, .4, 0, .89, 0, true); bx(g, out, OM.white, .64, .26, .44, 0, 1.7, 0, true); bx(g, out, OM.dark, .5, .2, .08, 0, 1.4, .21, true); bx(g, out, OM.screen, .38, .1, .02, 0, 1.4, .26, true);
      bx(g, out, OM.yellow, .6, .08, .42, 0, 1.0, 0, true); for (const s of [-1, 1]) { bx(g, out, OM.steelD, .06, .5, .06, s * .36, 1.0, .08, true); bx(g, out, OM.dark, .14, .3, .08, s * .4, .8, .2, true); }
      bx(g, out, OM.steelL, .5, .02, .02, 0, 1.55, .21, true);
      return { out, hx: .45, hz: .35, h: 1.85 };
    }
  });

  /* ---- refugio: almacén por reservas, enfermería, tablón, armero y emblemas de facción ---- */
  function storeBuild(kind) {
    return g => {
      const out = [], W = 1.9, D = .7, H = 2.0; shelfFrame(g, out, W, D, H, 3, OM.steel);
      const lev = l => .1 + l * (H - .15) / 3 + .05;
      for (let l = 0; l < 3; l++) for (let k = 0; k < 4; k++) {
        const x = -W / 2 + .26 + k * .46, y = lev(l);
        if (kind === 'mat') { if ((k + l) % 2) for (let n = 0; n < 3; n++) bx(g, out, OM.lumber, .4, .08, .55, x, y + .04 + n * .085, 0, true); else { mkPiece(g, out, geoBall, OM.sack, .2, .16, .26, x, y + .16, 0, true, [.4, .3, .5]); bx(g, out, OM.steelL, .06, .3, .06, x + .14, y + .16, .26, true); } }
        else if (kind === 'ammo') { bx(g, out, OM.olive, .38, .24, .5, x, y + .12, 0, true); bx(g, out, OM.yellow, .3, .04, .02, x, y + .15, .26, true); }
        else { bx(g, out, OM.white, .38, .24, .5, x, y + .12, 0, true); bx(g, out, OM.medCross, .12, .04, .02, x, y + .13, .26, true); bx(g, out, OM.medCross, .04, .12, .02, x, y + .13, .26, true); }
      }
      bx(g, out, kind === 'mat' ? OM.rust : kind === 'ammo' ? OM.olive : OM.medCross, W, .1, .04, 0, H + .02, D / 2, false);
      return { out, hx: W / 2 + .03, hz: D / 2, h: H + .08 };
    };
  }
  def('storeMat', { name: 'Módulo de almacén: materiales', cat: 'Refugio', reserve: 'materiales' }, { mat: 'metal', hp: 160, push: false, mass: 60, fric: 9, build: storeBuild('mat') });
  def('storeAmmo', { name: 'Módulo de almacén: munición', cat: 'Refugio', reserve: 'munición' }, { mat: 'metal', hp: 160, push: false, mass: 60, fric: 9, build: storeBuild('ammo') });
  def('storeMed', { name: 'Módulo de almacén: material médico', cat: 'Refugio', reserve: 'médica' }, { mat: 'metal', hp: 160, push: false, mass: 60, fric: 9, build: storeBuild('med') });
  def('cot', { name: 'Camilla', cat: 'Refugio', seats: 1 }, {
    mat: 'metal', hp: 80, push: true, mass: 6, fric: 7, build: g => {
      const out = [];
      for (const s of [-1, 1]) for (const z of [-1, 1]) { bx(g, out, OM.steelL, .05, .5, .05, s * .38, .3, z * .9, true); cy(g, out, OM.rubber, .06, .05, s * .38, .06, z * .9, true).rotation.z = Math.PI / 2; }
      bx(g, out, OM.steelL, .8, .05, 2.0, 0, .56, 0, true); bx(g, out, OM.blueP, .74, .12, 1.9, 0, .64, 0, true); rot(bx(g, out, OM.blueP, .74, .1, .5, 0, .72, -.7, true), .3, 0, 0);
      bx(g, out, OM.white, .5, .08, .3, 0, .72, -.82, true); for (const s of [-1, 1]) bx(g, out, OM.steelL, .04, .04, 1.4, s * .43, .66, .1, true); bx(g, out, OM.medCross, .12, .02, .12, 0, .71, .4, true);
      return { out, hx: .45, hz: 1.02, h: .8 };
    }
  });
  def('board', { name: 'Tablón de expediciones', cat: 'Refugio' }, {
    mat: 'wood', hp: 70, push: false, mass: 20, fric: 9, build: g => {
      const out = [];
      for (const s of [-1, 1]) bx(g, out, OM.woodF, .12, 2.2, .12, s * .95, 1.1, 0, false);
      tx(g, out, OM.boards, 2, 1.9, 1.2, .06, 0, 1.45, .02, true); bx(g, out, OM.woodF, 2.0, .08, .1, 0, 2.08, 0, true); bx(g, out, OM.woodF, 2.0, .08, .1, 0, .84, 0, true);
      for (const [x, y, w, m] of [[-.6, 1.6, .4, OM.cream], [-.1, 1.5, .5, OM.white], [.5, 1.65, .4, OM.cream], [.5, 1.2, .5, OM.cream], [-.5, 1.15, .35, OM.white]]) bx(g, out, m, w, .32, .015, x, y, .06, true);
      bx(g, out, OM.red, .05, .05, .02, -.45, 1.74, .075, true); bx(g, out, OM.blueP, .05, .05, .02, .62, 1.78, .075, true);
      return { out, hx: 1.02, hz: .1, h: 2.3 };
    }
  });
  def('rack', { name: 'Expositor de armas (armería)', cat: 'Refugio' }, {
    mat: 'metal', hp: 100, push: false, mass: 30, fric: 9, build: g => {
      const out = [], W = 1.7, H = 1.5;
      for (const s of [-1, 1]) bx(g, out, OM.steelD, .08, H, .3, s * (W / 2 - .04), H / 2, 0, false); bx(g, out, OM.steelD, W, .1, .3, 0, .08, 0, false);
      tx(g, out, OM.boards, 2, W - .1, H - .3, .04, 0, H / 2 + .05, -.12, true); bx(g, out, OM.steelD, W, .08, .3, 0, H - .04, 0, true); bx(g, out, OM.steelD, W - .1, .06, .1, 0, .75, .1, true); bx(g, out, OM.steelD, W - .1, .06, .1, 0, 1.2, .1, true);
      for (let k = 0; k < 5; k++) { const x = -.65 + k * .32, big = k % 2 === 0; bx(g, out, OM.dark, .07, big ? .95 : .55, .06, x, big ? .68 : .9, -.04, true); bx(g, out, OM.dark, .1, .22, .08, x, big ? .26 : .62, -.04, true); bx(g, out, OM.woodD, .08, .2, .07, x, .35, -.04, true); }
      return { out, hx: W / 2, hz: .16, h: H };
    }
  });
  const SYM = [3, 4, 6, 16];
  for (let f = 0; f < 4; f++) def('emblem' + f, { name: 'Emblema de facción ' + FAC[f].name, cat: 'Refugio', faction: f }, {
    mat: 'block', hp: 260, push: false, mass: 60, fric: 9, build: g => {
      const out = [], W = 2.8, H = 2.7;
      for (const s of [-1, 1]) { tx(g, out, OM.concrete, 1, .5, H, .5, s * (W / 2 - .25), H / 2, 0, false); bx(g, out, OM.concreteD, .6, .1, .6, s * (W / 2 - .25), H + .05, 0, false); }
      bx(g, out, OM.steelD, W - .6, .26, .4, 0, H - .13, 0, false);
      bx(g, out, FACMAT[f], W - .6, .1, .42, 0, H - .32, 0, true);                                         // franja de color de la facción
      tx(g, out, OM.brick, 1.25, W - .6, 1.5, .26, 0, 1.0, 0, true);
      const sy = mkPiece(g, out, prism(SYM[f]), FACMAT[f], .5, .06, .5, 0, 1.25, .17, false, [1, .06, 1]); sy.rotation.x = Math.PI / 2; if (SYM[f] === 3) sy.rotation.y = Math.PI;
      const in2 = mkPiece(g, out, prism(SYM[f]), FACTRIM[f], .28, .08, .28, 0, 1.25, .2, false, [.56, .08, .56]); in2.rotation.x = Math.PI / 2; in2.rotation.y = sy.rotation.y;
      return { out, hx: W / 2, hz: .27, h: H + .1 };
    }
  });

  /* ---------- registro en el sistema de objetos del juego ---------- */
  Object.assign(MT, { glass: { pen: .85, dm: 1.3 } });
  Object.assign(pMat, { glass: new THREE.MeshBasicMaterial({ color: 0xcfeaff }) });
  Object.assign(IMPS, { glass: 'IMP_glass' }); Object.assign(DB.e, { glass: .12 }); Object.assign(DB.mu, { glass: .35 });
  HOLE_K.glass = { n: 8, ri: .3, rr: .5, rh: .02, ch: 0x0a1218, cr: 0xdff3ff, co: 0x9fc4dd, cs: 0xe8f6ff, sp: 10, sl: 3.4, jit: .25 };
  HOLE_GEO.glass = [0, 1, 2].map(() => makeHoleGeo(HOLE_K.glass));
  for (const t in SP) {
    const s = SP[t], fn = s.build; s.build = g => { const b = fn(g); OBJ._b = b; return b; };
    PSPEC[t] = s; if (/^supply/.test(t)) BRKS[t] = 'BRK_crate'; else if (s.mat === 'wood') BRKS[t] = 'BRK_crate'; else if (s.mat === 'metal') BRKS[t] = 'BRK_barrier'; else if (s.mat === 'block') BRKS[t] = 'BRK_blocks'; else if (s.mat === 'plastic') BRKS[t] = 'BRK_barrier';
  }

  /* =============================== estado y comportamiento =============================== */
  const OBJ = window.OBJ = { meta: META, types: Object.keys(SP), on: [], pickups: [], alarms: [], _b: null };
  const emit = (ev, p) => { for (const f of OBJ.on) f(ev, p); };
  const wpos = (p, lx, lz) => { const c = Math.cos(p.g.rotation.y), s = Math.sin(p.g.rotation.y); return [p.x + lx * c + lz * s, p.z - lx * s + lz * c]; };
  const sideways = p => Math.abs(Math.sin(p.g.rotation.y)) > .5;
  function mkBox(p, b) { const [x, z] = wpos(p, b.lx, b.lz), sw = sideways(p); return { x, z, hx: sw ? b.hz : b.hx, hz: sw ? b.hx : b.hz, prop: p }; }
  const dropBoxes = p => { for (const b of [p.box].concat(p.xb || [])) { const i = boxes.indexOf(b); if (i >= 0) boxes.splice(i, 1); } p.xb = null; };

  const _addProp = addProp;
  addProp = function (type, x, z, rot) {
    OBJ._b = null; const p = _addProp(type, x, z, rot), b = OBJ._b, s = SP[type];
    if (s && b) {
      p.o = { leaves: b.leaves || null, openBoxes: b.openBoxes || null, swing: b.swing || 0, slide: b.slide || 0, roll: !!b.roll, beacon: b.beacon || null, glassPcs: b.glassPcs || null, glow: b.glow || null, lamp: b.lamp || null, seats: b.seats || null };
      p.fullBox = p.box; p.open = false; p.oT = 0;
      if (s.alarm) p.alarmOn = false;
    }
    if (s) { p.meta = META[type]; emit('add', p); } return p;
  };
  /* abrir/cerrar: al abrir, la huella pasa a ser solo lo que queda en pie (postas, hoja plegada); cerrar se rechaza si alguien está en el paso */
  OBJ.setOpen = function (p, on) {
    if (!p || p.dead || !p.o || !p.o.leaves) return false; on = !!on; if (p.open === on) return true;
    if (!on) {
      const fb = p.fullBox, pad = .55;
      const who = [P.pos].concat(MX && MX.ents ? MX.ents.filter(e => !e.dead).map(e => e.p) : [], MX && MX.zom ? MX.zom.list.filter(z => !z.dead).map(z => z.p) : []);
      for (const q of who) if (q && Math.abs(q.x - fb.x) < fb.hx + pad && Math.abs(q.z - fb.z) < fb.hz + pad) return false;
      dropBoxes(p); boxes.push(fb); p.box = fb; p.xb = null;
    } else {
      dropBoxes(p); p.xb = (p.o.openBoxes || []).map(b => mkBox(p, b)); for (const b of p.xb) boxes.push(b); p.box = p.xb[0] || { x: p.x, z: p.z, hx: .05, hz: .05, prop: p };   // sin huella (persiana enrollada): caja ficticia fuera de `boxes` para el código que espera p.box
    }
    p.open = on; const s = SP[p.type]; if (s.noiseOnMove && MX && MX.zom) MX.zom.noise(p.x, p.z, s.noiseOnMove, false);
    emit(on ? 'open' : 'close', p); return true;
  };
  OBJ.toggle = p => OBJ.setOpen(p, !p.open);
  OBJ.contents = p => (p.meta && p.meta.loot) || [];
  OBJ.near = function (x, z, r) { let best = null, bd = r; for (const p of props) { if (p.dead || !p.o) continue; const d = Math.hypot(Math.max(Math.abs(x - p.x) - p.hx, 0), Math.max(Math.abs(z - p.z) - p.hz, 0)); if (d < bd) { bd = d; best = p; } } return best; };

  const _imp = impactFx;
  impactFx = function (p, x, y, z, nx, nz, dx, dz, dmg) {
    if (p.mat !== 'glass') return _imp.apply(null, arguments);
    const n = Math.min(10, 4 + Math.round(dmg / 6));
    for (let i = 0; i < n; i++) spawn('glass', new V3(x, y, z), new V3(nx * (1 + rnd() * 3) + (rnd() - .5) * 3, 1 + rnd() * 3, nz * (1 + rnd() * 3) + (rnd() - .5) * 3), .5 + rnd() * .3, .02, .02, .03, true, 14);
    holeDecal(p, x, y, z, dx, dz, holeOf('glass'), .1 + rnd() * .04);
  };
  const _dmg = damageProp;
  damageProp = function (p, dmg, x, z, dx, dz, kind) {
    const s = SP[p.type];
    if (s && s.alarm && !p.dead && dmg > 0 && p.o && p.o.glassPcs) {              // escaparate: cada impacto rompe el cristal más cercano y salta la alarma
      let best = null, bd = 1e9; for (const pc of p.o.glassPcs) { if (pc.gone) continue; pc.obj.getWorldPosition(_gv); const d = Math.hypot(_gv.x - x, _gv.z - z); if (d < bd) { bd = d; best = pc; } }
      if (best) {
        p.g.updateMatrixWorld(true); best.obj.getWorldPosition(_gv); const gx = _gv.x, gy = _gv.y, gz = _gv.z; launchPiece(p, best, dx, dz, .6, 1.5);
        for (let i = 0; i < 14; i++) spawn('glass', new V3(gx + (rnd() - .5) * 1.6, gy + (rnd() - .5) * 1.4, gz), new V3((rnd() - .5) * 4 + dx * 2, 1 + rnd() * 3, (rnd() - .5) * 4 + dz * 2), .8 + rnd() * .5, .025, .025, .035, true, 12);
        if (!p.alarmOn) { p.alarmOn = true; p.alarmT = 20; OBJ.alarms.push(p); if (MX && MX.zom) MX.zom.noise(p.x, p.z, 55, false); emit('alarm', p); }
      }
    }
    _dmg.apply(null, arguments);
  };
  const _gv = new V3();
  const _dest = destroyProp;
  destroyProp = function (p, dx, dz, power) {
    if (p.dead) return; const s = SP[p.type]; dropBoxes(p);
    if (s && s.mat === 'glass') for (let i = 0; i < 16; i++) spawn('glass', new V3(p.x + (rnd() - .5) * p.hx * 2, .3 + rnd() * 1.8, p.z + (rnd() - .5) * p.hz * 2), new V3((rnd() - .5) * 4 + dx * 2, 1 + rnd() * 4, (rnd() - .5) * 4 + dz * 2), .8 + rnd() * .6, .025, .025, .035, true, 12);
    _dest.apply(null, arguments);
    if (s && s.noiseOnBreak && MX && MX.zom) MX.zom.noise(p.x, p.z, s.noiseOnBreak, false);
    const i = OBJ.alarms.indexOf(p); if (i >= 0) OBJ.alarms.splice(i, 1);
    emit('break', p);
  };

  const POSE_SPEED = 2.0;
  function pose(p) {
    const o = p.o, t = p.oT, e = t * t * (3 - 2 * t);
    if (o.swing) for (const lf of o.leaves) swing(lf, e * o.swing);
    else if (o.slide) for (const lf of o.leaves) slide(lf, e * o.slide);
    else if (o.roll) for (const lf of o.leaves) roll(lf, e, lf.H);
  }
  function tick(dt) {
    for (const p of props) {
      if (p.dead || !p.o) continue; const o = p.o;
      if (o.leaves) { const tgt = p.open ? 1 : 0; if (p.oT !== tgt) { p.oT = tgt > p.oT ? Math.min(tgt, p.oT + dt * POSE_SPEED) : Math.max(tgt, p.oT - dt * POSE_SPEED); pose(p); } }
      if (o.lamp && o.glow) { const on = !o.lamp.gone; o.glow.visible = on; }
    }
    for (let i = OBJ.alarms.length - 1; i >= 0; i--) {
      const p = OBJ.alarms[i]; p.alarmT -= dt; const bc = p.o && p.o.beacon;
      if (p.alarmT <= 0) { if (bc) bc.material.color.setHex(0x551111); OBJ.alarms.splice(i, 1); p.alarmOn = false; continue; }
      if (bc) bc.material.color.setHex(Math.sin(p.alarmT * 14) > 0 ? 0xff2a1c : 0x551111);
      p.alarmN = (p.alarmN || 0) - dt; if (p.alarmN <= 0) { p.alarmN = 2.2; if (MX && MX.zom) MX.zom.noise(p.x, p.z, 55, false); }
      loopAt('alarm' + p.uid, 'ALARM_loop', p.x, p.z, .8);
    }
    for (const k of OBJ.pickups) { k.t += dt; k.g.position.y = k.y0 + .05 + Math.sin(k.t * 2.2 + k.x) * .035; k.g.rotation.y += dt * .8; }
  }
  const _up = updateProps; updateProps = function (dt) { _up.apply(null, arguments); tick(dt); };

  /* =============================== recogibles =============================== */
  const PK = {};
  function pkGroup(parts) { const g = new THREE.Group(); for (const [geo, mat, sx, sy, sz, x, y, z, rx, ry, rz] of parts) { const m = new THREE.Mesh(geo, mat); m.scale.set(sx, sy, sz); m.position.set(x, y, z); m.rotation.set(rx || 0, ry || 0, rz || 0); m.castShadow = true; g.add(m); } return g; }
  const GRY = [OM.grey, sm(0x5a6068, .6, .3), OM.steelD];
  PK.material = () => pkGroup([[geoBox, OM.lumber, .46, .09, .24, 0, .05, 0], [geoBox, OM.lumber, .46, .09, .24, 0, .14, 0, 0, .35, 0], [geoBox, OM.steelL, .5, .02, .05, 0, .2, 0, 0, .35, 0], [geoBall, OM.sack, .14, .11, .16, .05, .12, .24]]);
  PK.ammo = () => pkGroup([[geoBox, OM.olive, .34, .2, .2, 0, .1, 0], [geoBox, OM.steelD, .36, .03, .22, 0, .21, 0], [geoBox, OM.yellow, .18, .05, .01, 0, .12, .105], [geoBox, OM.steelL, .08, .04, .06, 0, .25, 0]]);
  PK.medkit = () => pkGroup([[geoBox, OM.white, .32, .22, .13, 0, .11, 0], [geoBox, OM.medCross, .12, .04, .01, 0, .12, .07], [geoBox, OM.medCross, .04, .12, .01, 0, .12, .07], [geoBox, OM.steelD, .12, .04, .04, 0, .24, 0]]);
  PK.revive = () => pkGroup([[geoBox, OM.white, .3, .18, .12, 0, .09, 0], [geoBox, OM.medCross, .16, .05, .01, 0, .1, .065], [geoBox, OM.medCross, .05, .16, .01, 0, .1, .065], [geoBox, OM.dark, .12, .05, .1, 0, .2, 0], [geoBox, OM.blueP, .06, .12, .06, .13, .13, .02]]);
  function helmet(lv) { const L = [[new THREE.SphereGeometry(1, 10, 6, 0, TAU2, 0, Math.PI / 2), GRY[0], .17 + lv * .008, .13, .17 + lv * .008, 0, .08, 0], [geoBox, GRY[2], .2, .025, .24, 0, .09 + lv * .01, .02, .2, 0, 0]]; if (lv >= 2) L.push([geoBox, GRY[1], .1, .05, .14, 0, .2, 0], [geoBox, GRY[2], .02, .1, .3, .13, .12, 0]); if (lv >= 3) L.push([geoBox, GRY[2], .24, .08, .06, 0, .1, .17], [geoBox, GRY[1], .08, .14, .06, -.16, .08, .06], [geoBox, GRY[1], .08, .14, .06, .16, .08, .06]); return pkGroup(L); }
  function vest(lv) { const L = [[geoBox, GRY[1], .34, .38, .1, 0, .22, 0], [geoBox, GRY[2], .08, .2, .12, -.12, .38, 0], [geoBox, GRY[2], .08, .2, .12, .12, .38, 0]]; if (lv >= 2) L.push([geoBox, GRY[0], .24, .26, .05, 0, .24, .06], [geoBox, GRY[2], .3, .05, .12, 0, .1, 0]); if (lv >= 3) L.push([geoBox, GRY[0], .14, .14, .04, -.08, .34, .1], [geoBox, GRY[0], .14, .14, .04, .08, .34, .1], [geoBox, GRY[2], .1, .2, .1, -.2, .22, 0], [geoBox, GRY[2], .1, .2, .1, .2, .22, 0]); return pkGroup(L); }
  function pack(lv) { const w = .22 + lv * .05, h = .26 + lv * .06, L = [[geoBox, OM.olive, w, h, .16, 0, h / 2 + .02, 0], [geoBox, GRY[2], w - .04, .06, .17, 0, h, .01], [geoBox, GRY[2], .04, h * .8, .02, -w / 3, h / 2, .09], [geoBox, GRY[2], .04, h * .8, .02, w / 3, h / 2, .09]]; if (lv >= 2) L.push([geoBox, GRY[1], .1, .14, .08, -w / 2 - .03, .16, 0], [geoBox, GRY[1], .1, .14, .08, w / 2 + .03, .16, 0]); if (lv >= 3) L.push([geoBox, OM.olive, w - .04, .12, .1, 0, h + .06, 0], [geoBox, GRY[2], .1, .1, .06, 0, .1, .1]); return pkGroup(L); }
  for (let lv = 1; lv <= 3; lv++) { PK['helmet' + lv] = () => helmet(lv); PK['vest' + lv] = () => vest(lv); PK['pack' + lv] = () => pack(lv); }
  OBJ.pickupKinds = Object.keys(PK);
  OBJ.pickup = function (kind, x, z) {
    if (!PK[kind]) return null; const g = PK[kind](), k = { kind, g, x, z, y0: 0, t: rnd() * 6 }; g.position.set(x, 0, z); g.scale.setScalar(1.3); scene.add(g); OBJ.pickups.push(k); return k;
  };
  OBJ.removePickup = k => { scene.remove(k.g); const i = OBJ.pickups.indexOf(k); if (i >= 0) OBJ.pickups.splice(i, 1); };

  /* =============================== raíles (decoración sin colisión) =============================== */
  OBJ.rails = function (x, z, len, ry) {
    const g = new THREE.Group(), n = Math.floor(len / .62);
    const bed = new THREE.Mesh(geoBox, sm(0x6f6a62, 1)); bed.scale.set(len, .1, 2.2); bed.position.y = .05; g.add(bed);
    const sl = new THREE.InstancedMesh(geoBox, OM.woodD, n), m = new THREE.Matrix4();
    for (let i = 0; i < n; i++) { m.compose(new V3(-len / 2 + .3 + i * .62, .14, 0), new THREE.Quaternion(), new V3(.2, .08, 1.9)); sl.setMatrixAt(i, m); }
    g.add(sl);
    for (const s of [-1, 1]) { const r = new THREE.Mesh(geoBox, OM.rust); r.scale.set(len, .1, .09); r.position.set(0, .23, s * .72); r.castShadow = true; g.add(r); }
    g.position.set(x, 0, z); g.rotation.y = ry || 0; scene.add(g); return g;
  };

  /* =============================== catálogo medido y galería =============================== */
  OBJ.measure = function () {                                                          // construye cada tipo una vez y devuelve huella, altura y nº de piezas
    const rows = [];
    for (const t of OBJ.types) { const g = new THREE.Group(); OBJ._b = null; const b = SP[t].build(g); rows.push({ type: t, name: META[t].name, cat: META[t].cat, mat: SP[t].mat, hp: SP[t].hp, w: +(b.hx * 2).toFixed(2), d: +(b.hz * 2).toFixed(2), h: +b.h.toFixed(2), pieces: b.out.length, open: !!b.leaves }); }
    return rows;
  };
  OBJ.gallery = function (types) {
    for (const p of props.slice()) { dropBoxes(p); scene.remove(p.g); const i = props.indexOf(p); if (i >= 0) props.splice(i, 1); }
    boxes.length = 0; types = types || OBJ.types; const cols = 8, gx = 6.2, gz = 6, out = [];
    types.forEach((t, i) => { const one = types.length === 1, x = one ? 0 : (i % cols - (cols - 1) / 2) * gx, z = one ? 0 : -8 + Math.floor(i / cols) * gz; out.push(addProp(t, x, z, 0)); });
    P.pos.set(0, 0, 0); return out;
  };
  if (/[?&]galeria=1/.test(location.search)) setTimeout(() => OBJ.gallery(), 400);
})();
