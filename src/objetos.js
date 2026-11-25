/* ===================== OBJETOS DE CAMPAÑA (src/objetos.js) =====================
   Módulo cargado tras el juego (comparte su ámbito global: PSPEC, MT, PM, props, boxes, mkPiece…).
   Define los objetos del catálogo `docs/CATALOGO_OBJETOS.md` con el mismo sistema que las cajas y barriles:
   cada objeto es un grupo de piezas reales (las sueltas saltan al romperse), con material, vida y huella 2D (`boxes`).
   Aporta además: accesos que se abren y cierran (`OBJ.setOpen`), alarmas, recogibles (`OBJ.pickup`), raíles y una galería de pruebas (`?galeria=1`).
   Estilo: paleta cálida y saturada (el juego tiene luz fría), desgaste (suciedad y musgo en la base, óxido), colores propios por objeto y color de facción
   (`OBJ.fac` = 0..3 al crearlos: franjas, telas y banderas). Muros, portones y puestos evolucionan en 3 niveles: madera → piedra → hierro.
   Todo vive dentro de `OBJ`; no cambia nada del juego existente salvo los ganchos indicados al final (`impactFx`, `damageProp`, `destroyProp`, `addProp`, `updateProps`).
   NO incluye: inventario ni interacción con el mando (entrega 3), mejoras y costes (entrega 4), ni navegación dinámica (entrega 2). `OBJ.on` avisa de cada cambio de estado. */
(function () {
  const TAU2 = Math.PI * 2, rnd = Math.random, pick = a => a[(rnd() * a.length) | 0];
  const cl = (v, a, b) => Math.max(a, Math.min(b, v));

  /* ---------- texturas procedurales (canvas): madera, piedra, hierro, ladrillo, chapa… ---------- */
  function mkTex(size, draw) { const c = document.createElement('canvas'); c.width = c.height = size; draw(c.getContext('2d'), size); const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = 4; return t; }
  const rgb = (r, g, b) => 'rgb(' + (r | 0) + ',' + (g | 0) + ',' + (b | 0) + ')';
  const speckle = (x, s, n, a) => { for (let i = 0; i < n; i++) { x.fillStyle = 'rgba(' + (rnd() < .5 ? '0,0,0,' : '255,255,255,') + (rnd() * a) + ')'; x.fillRect(rnd() * s, rnd() * s, 1 + rnd() * 2, 1 + rnd() * 2); } };
  const blotch = (x, s, n, col, a, r0, r1) => { for (let i = 0; i < n; i++) { x.fillStyle = 'rgba(' + col + ',' + (rnd() * a) + ')'; x.beginPath(); x.arc(rnd() * s, rnd() * s, r0 + rnd() * (r1 - r0), 0, 6.3); x.fill(); } };
  function boardsTex(base) {                                                       // tablones: tonos que cambian de uno a otro, vetas, nudos y clavos
    return mkTex(256, (x, s) => {
      const N = 4, h = s / N;
      for (let i = 0; i < N; i++) {
        const k = .82 + rnd() * .36, y0 = i * h; x.fillStyle = rgb(base[0] * k, base[1] * k, base[2] * k); x.fillRect(0, y0, s, h - 3);
        for (let j = 0; j < 9; j++) { x.strokeStyle = 'rgba(40,20,5,' + (.08 + rnd() * .14) + ')'; x.lineWidth = 1 + rnd(); x.beginPath(); const yy = y0 + 4 + rnd() * (h - 10); x.moveTo(0, yy); x.bezierCurveTo(s * .3, yy + (rnd() - .5) * 6, s * .6, yy + (rnd() - .5) * 6, s, yy + (rnd() - .5) * 4); x.stroke(); }
        if (rnd() < .6) { x.fillStyle = 'rgba(50,25,8,.45)'; x.beginPath(); x.ellipse(rnd() * s, y0 + h / 2, 5 + rnd() * 5, 3 + rnd() * 2, 0, 0, 6.3); x.fill(); }
        x.fillStyle = 'rgba(25,18,12,.7)'; x.fillRect(0, y0 + h - 3, s, 3);
        for (const nx of [8, s - 8]) { x.fillStyle = 'rgba(20,15,12,.8)'; x.beginPath(); x.arc(nx, y0 + h / 2, 2.2, 0, 6.3); x.fill(); }
      }
      speckle(x, s, 260, .08);
    });
  }
  const TEX = {
    boardsW: boardsTex([200, 150, 96]), boardsD: boardsTex([138, 92, 52]),
    bark: mkTex(128, (x, s) => { x.fillStyle = '#8a5a36'; x.fillRect(0, 0, s, s); for (let i = 0; i < 30; i++) { x.fillStyle = 'rgba(' + (rnd() < .6 ? '35,18,6' : '190,140,90') + ',' + (.12 + rnd() * .25) + ')'; x.fillRect(rnd() * s, 0, 1 + rnd() * 4, s * (.3 + rnd() * .7)); } for (let i = 0; i < 3; i++) { x.fillStyle = 'rgba(40,22,8,.55)'; x.beginPath(); x.ellipse(rnd() * s, rnd() * s, 5, 8, 0, 0, 6.3); x.fill(); } }),
    stone: mkTex(256, (x, s) => {                                                  // sillería irregular ocre: hiladas desiguales y piedras de tonos cálidos
      x.fillStyle = '#7d6c52'; x.fillRect(0, 0, s, s); let y = 0;
      while (y < s) { const rh = Math.min(s - y, 44 + rnd() * 34); let xx = -rnd() * 40; while (xx < s) { const bw = 56 + rnd() * 60, k = .86 + rnd() * .28, r = 202 * k, g = 176 * k, b = 134 * k; x.fillStyle = rgb(r, g, b); x.fillRect(xx + 2, y + 2, bw - 4, rh - 4); x.fillStyle = 'rgba(255,240,210,.22)'; x.fillRect(xx + 2, y + 2, bw - 4, 3); x.fillStyle = 'rgba(40,25,10,.25)'; x.fillRect(xx + 2, y + rh - 6, bw - 4, 4); xx += bw; } y += rh; }
      speckle(x, s, 700, .09);
    }),
    plate: mkTex(256, (x, s) => {                                                  // planchas de hierro remachadas, con óxido que chorrea
      const h = s / 2; for (let i = 0; i < 2; i++) for (let j = 0; j < 2; j++) { const k = .85 + rnd() * .3; x.fillStyle = rgb(62 * k, 70 * k, 80 * k); x.fillRect(j * h + 3, i * h + 3, h - 6, h - 6); x.fillStyle = 'rgba(255,255,255,.07)'; x.fillRect(j * h + 3, i * h + 3, h - 6, 4); }
      x.fillStyle = '#16191d'; x.fillRect(0, 0, s, 3); x.fillRect(0, h - 1, s, 3); x.fillRect(0, 0, 3, s); x.fillRect(h - 1, 0, 3, s);
      for (let i = 0; i < 2; i++) for (let j = 0; j < 2; j++) for (let k = 0; k < 5; k++) for (const [px, py] of [[k * h / 4.4 + 12, i * h + 12], [k * h / 4.4 + 12, i * h + h - 12]]) { x.fillStyle = '#9aa4b0'; x.beginPath(); x.arc(j * h + px, py, 3.4, 0, 6.3); x.fill(); x.fillStyle = 'rgba(160,80,35,.55)'; x.fillRect(j * h + px - 1, py, 2, 8 + rnd() * 26); }
      blotch(x, s, 14, '170,85,40', .5, 6, 22); blotch(x, s, 16, '20,15,12', .3, 4, 16); speckle(x, s, 300, .07);
    }),
    corrRust: mkTex(128, (x, s) => { for (let i = 0; i < 4; i++) { const g = x.createLinearGradient(i * s / 4, 0, (i + 1) * s / 4, 0); g.addColorStop(0, '#6a6e72'); g.addColorStop(.5, '#d4c9b6'); g.addColorStop(1, '#6a6e72'); x.fillStyle = g; x.fillRect(i * s / 4, 0, s / 4, s); } blotch(x, s, 12, '180,90,40', .6, 5, 18); blotch(x, s, 8, '110,50,20', .5, 3, 10); speckle(x, s, 100, .08); }),
    brickRed: mkTex(256, (x, s) => { x.fillStyle = '#d6cdb6'; x.fillRect(0, 0, s, s); const rh = s / 8, bw = s / 4; for (let r = 0; r < 8; r++) for (let k = -1; k < 5; k++) { const ox = (r % 2) * bw / 2, v = .86 + rnd() * .3; x.fillStyle = rgb(176 * v, 82 * v, 58 * v); x.fillRect(k * bw + ox + 2, r * rh + 2, bw - 4, rh - 4); } speckle(x, s, 500, .1); }),
    plaster: mkTex(256, (x, s) => { x.fillStyle = '#fff'; x.fillRect(0, 0, s, s); speckle(x, s, 1100, .1); blotch(x, s, 30, '120,100,70', .12, 8, 30); for (let i = 0; i < 4; i++) { x.strokeStyle = 'rgba(60,45,30,.35)'; x.lineWidth = 1.2; x.beginPath(); let px = rnd() * s, py = rnd() * s; x.moveTo(px, py); for (let j = 0; j < 6; j++) { px += (rnd() - .5) * 22; py += 8 + rnd() * 14; x.lineTo(px, py); } x.stroke(); } }),
    hazard: mkTex(128, (x, s) => { x.fillStyle = '#e6bd1c'; x.fillRect(0, 0, s, s); x.fillStyle = '#1d1d1f'; for (let i = -2; i < 4; i++) { x.beginPath(); x.moveTo(i * s / 2, s); x.lineTo(i * s / 2 + s / 4, s); x.lineTo(i * s / 2 + s / 4 + s / 2, 0); x.lineTo(i * s / 2 + s / 2, 0); x.fill(); } speckle(x, s, 80, .15); }),
    tile: mkTex(128, (x, s) => { x.fillStyle = '#b4573a'; x.fillRect(0, 0, s, s); for (let r = 0; r < 4; r++) for (let k = 0; k < 4; k++) { const v = .85 + rnd() * .3; x.fillStyle = rgb(190 * v, 92 * v, 58 * v); x.beginPath(); x.arc(k * s / 4 + (r % 2) * s / 8 + s / 8, r * s / 4, s / 8, 0, Math.PI); x.fill(); x.fillStyle = 'rgba(0,0,0,.25)'; x.fillRect(0, r * s / 4 + s / 4 - 2, s, 2); } speckle(x, s, 200, .1); }),
    wire: mkTex(64, (x, s) => { x.clearRect(0, 0, s, s); x.strokeStyle = '#b9c0c9'; x.lineWidth = 4; x.strokeRect(0, 0, s, s); })
  };
  const STRIPES = {};
  const stripeTex = (c1, c2) => STRIPES[c1 + c2] || (STRIPES[c1 + c2] = mkTex(64, (x, s) => { x.fillStyle = c1; x.fillRect(0, 0, s, s); x.fillStyle = c2; x.fillRect(0, 0, s / 2, s); speckle(x, s, 40, .1); }));
  /* material con textura: color de vértice para la suciedad de la base (gr = [fuerza, r, g, b]); solo se usa con geometría `tbox` */
  const tm = (tex, c, r, m, gr) => { const mt = new THREE.MeshStandardMaterial({ map: tex, color: c === undefined ? 0xffffff : c, roughness: r === undefined ? .9 : r, metalness: m || 0, flatShading: true, vertexColors: true }); mt.userData.gr = gr || null; return mt; };
  const sm = matStd;
  const DIRT = [.8, .42, .36, .3], MOSS = [.85, .5, .66, .34], SOOT = [.6, .5, .45, .42];
  const BARK = [0xffffff, 0xe0c7a6, 0xc4a784].map(c => new THREE.MeshStandardMaterial({ map: TEX.bark, color: c, roughness: .95, flatShading: true }));
  const OM = {
    stone: tm(TEX.stone, 0xffffff, .95, 0, MOSS), stoneD: tm(TEX.stone, 0xb09878, .95, 0, MOSS), brick: tm(TEX.brickRed, 0xffffff, .9, 0, DIRT),
    plaster: tm(TEX.plaster, 0xefe2c4, .95, 0, DIRT), plasterT: tm(TEX.plaster, 0x4fb0a8, .95, 0, DIRT), plasterP: tm(TEX.plaster, 0xe58aa0, .95, 0, DIRT), plasterY: tm(TEX.plaster, 0xe8b93c, .95, 0, DIRT),
    plate: tm(TEX.plate, 0xffffff, .55, .55, SOOT), plateD: tm(TEX.plate, 0xb8bec6, .5, .6, SOOT),
    corr: tm(TEX.corrRust, 0xffffff, .5, .5, DIRT), corrD: tm(TEX.corrRust, 0x9a948a, .55, .5, DIRT), tile: tm(TEX.tile, 0xffffff, .85, 0, MOSS), tileP: new THREE.MeshStandardMaterial({ map: TEX.tile, roughness: .85, flatShading: true }),
    boardsW: tm(TEX.boardsW, 0xffffff, .92, 0, DIRT), boardsD: tm(TEX.boardsD, 0xffffff, .9, 0, DIRT), hazard: tm(TEX.hazard, 0xffffff, .6, .2, null),
    iron: sm(0x39424d, .5, .55), ironD: sm(0x21272e, .55, .5), rust: sm(0xa8582c, .85, .3), steelL: sm(0xaab3be, .4, .65), steel: sm(0x56606c, .5, .6),
    red: sm(0xc0392b, .55), white: sm(0xf3eee2, .55), cream: sm(0xe8dcc0, .8), cloth: sm(0xe0d4b4, .9), dark: sm(0x23262b, .7), rubber: sm(0x18181a, .95),
    yellow: sm(0xe9b928, .5, .3), mustard: sm(0xd9a21f, .6), teal: sm(0x2a9a94, .55), navy: sm(0x2f4f86, .55), olive: sm(0x6c7a3a, .7), green: sm(0x3e7a4e, .6), pink: sm(0xd9788d, .6), orange: sm(0xe07a2a, .55),
    wood: sm(0xd9a066, .9), woodF: sm(0xa8743f, .9), woodD: sm(0x6a4228, .9), woodG: sm(0xa59882, .95), card: sm(0xc19a62, .95), sack: sm(0xcdae72, 1), lumber: sm(0xe0b274, .9), soil: sm(0x4f3b28, 1), rope: sm(0xc8aa72, 1),
    leaf: sm(0x57a04a, .85), leafD: sm(0x3a7a35, .9), bloom: sm(0xf2c94c, .8), bloomP: sm(0xe56fa0, .8),
    blueP: sm(0x3466a8, .5, .4), grey: sm(0x8a8d92, .7, .2),
    anth: sm(0x2c3036, .5, .5), alu: sm(0x8e969f, .4, .7), concL: tm(TEX.plaster, 0xcfcfca, .95, 0, DIRT), plasterG: tm(TEX.plaster, 0xe4e4e0, .95, 0, DIRT),
    glassT: new THREE.MeshStandardMaterial({ color: 0x86c8d2, roughness: .06, metalness: .3, transparent: true, opacity: .4, depthWrite: false, flatShading: true, side: THREE.DoubleSide }),
    ledG: new THREE.MeshBasicMaterial({ color: 0x35d97a }), ledR: new THREE.MeshBasicMaterial({ color: 0xff4a3a }),
    glass: new THREE.MeshStandardMaterial({ color: 0xaad8ff, roughness: .08, metalness: .25, transparent: true, opacity: .34, depthWrite: false, flatShading: true, side: THREE.DoubleSide }),
    lamp: new THREE.MeshBasicMaterial({ color: 0xfff2c0 }), lampOff: new THREE.MeshBasicMaterial({ color: 0x3a3a3a }),
    screen: new THREE.MeshBasicMaterial({ color: 0x9fe8b0 }), medCross: new THREE.MeshBasicMaterial({ color: 0xd8342a })
  };
  const FACMAT = FAC.map(f => sm(f.acc, .55)), FACTRIM = FAC.map(f => sm(f.trim, .6));
  const GLOWTEX = mkTex(128, (x, s) => { const g = x.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2); g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(.5, 'rgba(255,255,255,.45)'); g.addColorStop(1, 'rgba(255,255,255,0)'); x.fillStyle = g; x.fillRect(0, 0, s, s); });
  GLOWTEX.wrapS = GLOWTEX.wrapT = THREE.ClampToEdgeWrapping;
  const paint = c => sm(c, .6, .1);                                                // pintura de un color concreto
  const PAINTS = [0x2a9a94, 0xd9a21f, 0xb8412e, 0x3466a8, 0x6c7a3a, 0xd9788d, 0xe07a2a];

  /* caja con UV a escala de metro (el mosaico mide lo mismo en cualquier tamaño) y color de vértice que ensucia la base (alturas reales desde el suelo, y0 = altura del centro) */
  const TBG = {};
  function tbox(w, h, d, den, y0, gr) {
    const key = [w, h, d, den, y0 || 0].map(v => (+v).toFixed(2)).join(',') + (gr ? gr.join() : ''); if (TBG[key]) return TBG[key];
    const g = new THREE.BoxGeometry(1, 1, 1), uv = g.attributes.uv, pos = g.attributes.position, f = [[d, h], [d, h], [w, d], [w, d], [w, h], [w, h]], col = new Float32Array(24 * 3);
    for (let i = 0; i < 24; i++) {
      const s = f[(i / 4) | 0]; uv.setXY(i, uv.getX(i) * s[0] * den, uv.getY(i) * s[1] * den);
      const yw = (y0 || 0) + pos.getY(i) * h, k = gr ? Math.pow(cl(1 - yw / .9, 0, 1), 1.4) * gr[0] : 0;
      col[i * 3] = 1 + (gr ? (gr[1] - 1) * k : 0); col[i * 3 + 1] = 1 + (gr ? (gr[2] - 1) * k : 0); col[i * 3 + 2] = 1 + (gr ? (gr[3] - 1) * k : 0);
    }
    g.setAttribute('color', new THREE.BufferAttribute(col, 3)); return (TBG[key] = g);
  }
  const tx = (g, out, mat, den, w, h, d, x, y, z, loose) => mkPiece(g, out, tbox(w, h, d, den, y, mat.userData.gr), mat, w, h, d, x, y, z, loose, [w, h, d]);
  const bx = (g, out, mat, w, h, d, x, y, z, loose) => mat.vertexColors ? tx(g, out, mat, 1, w, h, d, x, y, z, loose) : mkPiece(g, out, geoBox, mat, w, h, d, x, y, z, loose, [w, h, d]);
  const cy = (g, out, mat, r, h, x, y, z, loose) => mkPiece(g, out, geoCyl16, mat, r, h, r, x, y, z, loose, [2 * r, h, 2 * r]);
  const rot = (m, x, y, z) => { m.rotation.set(x || 0, y || 0, z || 0); return m; };
  const prism = n => new THREE.CylinderGeometry(1, 1, 1, n);
  const LOGG = new THREE.CylinderGeometry(1, 1, 1, 8), TIP8 = new THREE.CylinderGeometry(0, 1, 1, 8), SPIKE = new THREE.CylinderGeometry(0, 1, 1, 4);
  const log = (g, out, mat, r, h, x, y, z, loose) => mkPiece(g, out, LOGG, mat, r, h, r, x, y, z, loose, [2 * r, h, 2 * r]);
  const spike = (g, out, mat, r, h, x, y, z, loose) => mkPiece(g, out, SPIKE, mat, r, h, r, x, y, z, loose, [2 * r, h, 2 * r]);
  /* color de la facción (OBJ.fac): franja, tela o bandera. Sin facción, tela neutra */
  const facOf = () => (OBJ.fac === null || OBJ.fac === undefined) ? null : OBJ.fac;
  const accent = (g, out, w, h, d, x, y, z, loose) => { const f = facOf(); return bx(g, out, f === null ? OM.cloth : FACMAT[f], w, h, d, x, y, z, loose); };
  const trim = (g, out, w, h, d, x, y, z, loose) => { const f = facOf(); return bx(g, out, f === null ? OM.cream : FACTRIM[f], w, h, d, x, y, z, loose); };
  /* franjas de facción: una línea principal con dos filetes finos del color claro, a ras de la superficie (como en el borde del techo de las torres) */
  function lines(g, out, len, x, y, z, face, tilt) {
    const set = (m) => { if (tilt) m.rotation.x = tilt; return m; }, d = .03;
    set(accent(g, out, len, .09, d, x, y, z + face * d / 2, false)); set(trim(g, out, len, .022, d + .004, x, y + .075, z + face * d / 2, false)); set(trim(g, out, len, .022, d + .004, x, y - .075, z + face * d / 2, false));
  }
  const flag = (g, out, x, y0, z, hgt) => { bx(g, out, OM.woodD, .05, hgt, .05, x, y0 + hgt / 2, z, false); const f = accent(g, out, .85, .5, .03, x + .45, y0 + hgt - .3, z, true); trim(g, out, .85, .1, .035, x + .45, y0 + hgt - .1, z, true); return f; };

  /* hoja con bisagra: sus piezas se mueven alrededor de (hx, hz) y siguen siendo piezas normales (saltan al romperse) */
  function leaf(out, from, hx, hz, sign) { const pcs = out.slice(from); for (const pc of pcs) { pc.bx = pc.obj.position.x; pc.bz = pc.obj.position.z; pc.br = pc.obj.rotation.y; pc.by = pc.obj.position.y; pc.bsy = pc.obj.scale.y; } return { pcs, hx, hz, sign: sign || 1 }; }
  function swing(lf, a) { const c = Math.cos(a * lf.sign), s = Math.sin(a * lf.sign); for (const pc of lf.pcs) { if (pc.gone) continue; const dx = pc.bx - lf.hx, dz = pc.bz - lf.hz, o = pc.obj; o.position.x = lf.hx + dx * c + dz * s; o.position.z = lf.hz - dx * s + dz * c; o.rotation.y = pc.br + a * lf.sign; } }
  function slide(lf, d) { for (const pc of lf.pcs) if (!pc.gone) pc.obj.position.x = pc.bx + d; }
  function roll(lf, t, H) { for (const pc of lf.pcs) { if (pc.gone) continue; const o = pc.obj, k = 1 - t * .9; o.position.y = H - (H - pc.by) * k; o.scale.y = Math.max(.02, pc.bsy * (1 - t * .85)); } }

  const SP = {}, META = {};
  function def(type, meta, spec) { META[type] = Object.assign({ type }, meta); SP[type] = spec; }

  /* =============================== constructores =============================== */
  /* ---- muros: 1 empalizada de troncos (madera) · 2 sillería de piedra · 3 planchas de hierro remachadas ---- */
  function wall1(g) {
    const out = [], L = 3.2, H = 2.3;
    bx(g, out, OM.soil, L + .2, .18, .66, 0, .09, 0, false);                             // montón de tierra que sujeta los troncos
    for (let i = 0; i < 8; i++) {
      const x = -L / 2 + .2 + i * .4, hh = H + (((i * 7) % 5) - 2) * .07, m = BARK[i % 3], lean = (((i * 3) % 5) - 2) * .012;
      const t = log(g, out, m, .19, hh, x, hh / 2 + .05, 0, true); t.rotation.z = lean;
      const tip = mkPiece(g, out, TIP8, m, .19, .36, .19, x - lean * hh * .5, hh + .05 + .18, 0, true, [.38, .36, .38]); tip.rotation.z = lean;
    }
    for (const y of [.55, 1.5]) { bx(g, out, OM.woodD, L, .14, .1, 0, y, -.22, false); bx(g, out, OM.rope, L - .05, .06, .04, 0, y - .05, .2, false); bx(g, out, OM.rope, L - .05, .06, .04, 0, y + .09, .2, false); }
    bx(g, out, OM.woodD, L, .2, .08, 0, 1.88, .24, false); bx(g, out, OM.woodD, L, .2, .08, 0, 1.88, -.24, false);   // viga de remate pintada con las líneas de la facción
    lines(g, out, L - .1, 0, 1.88, .28, 1); lines(g, out, L - .1, 0, 1.88, -.28, -1);
    return { out, hx: L / 2, hz: .3, h: H + .45 };
  }
  function wall2(g) {
    const out = [], L = 3.2, T = .5, H = 2.4, cw = (L - 1.0) / 2;
    tx(g, out, OM.stoneD, 1, L + .1, .32, T + .14, 0, .16, 0, false);
    for (let r = 0; r < 3; r++) for (const s of [-1, 1]) tx(g, out, OM.stone, 1, cw - .01, .62, T - .02, s * cw / 2, .32 + .31 + r * .62, 0, true);
    for (const s of [-1, 1]) for (let k = 0; k < 5; k++) tx(g, out, k % 2 ? OM.stoneD : OM.stone, 1, k % 2 ? .6 : .48, .42, T + .06, s * (L / 2 - (k % 2 ? .3 : .24)), .32 + .21 + k * .42, 0, true);
    for (const s of [-1, 1]) rot(mkPiece(g, out, geoBox, OM.tileP, L + .1, .07, .4, 0, H + .15, s * .18, true, [L, .07, .4]), -s * .5, 0, 0);       // remate de tejas a dos aguas
    bx(g, out, OM.woodD, L + .1, .1, .1, 0, H + .26, 0, false);
    bx(g, out, OM.woodD, L - 1.0, .2, .03, 0, 2.0, T / 2 + .015, false); bx(g, out, OM.woodD, L - 1.0, .2, .03, 0, 2.0, -T / 2 - .015, false);   // friso de madera con las líneas de la facción
    lines(g, out, L - 1.1, 0, 2.0, T / 2 + .03, 1); lines(g, out, L - 1.1, 0, 2.0, -T / 2 - .03, -1);
    return { out, hx: L / 2, hz: T / 2 + .08, h: H + .32 };
  }
  function wall3(g) {
    const out = [], L = 3.2, T = .5, H = 2.35;
    for (const s of [-1, 1]) {                                                          // postes de viga en H con placa de anclaje
      const px = s * (L / 2 - .2); bx(g, out, OM.iron, .1, H, .36, px, H / 2, 0, false); for (const z of [-1, 1]) bx(g, out, OM.iron, .38, H, .09, px, H / 2, z * .2, false);
      bx(g, out, OM.ironD, .6, .1, .6, px, .05, 0, false); bx(g, out, OM.ironD, .5, .1, .5, px, H + .05, 0, false); spike(g, out, OM.steelL, .1, .34, px, H + .27, 0, true);
    }
    for (const y of [.22, 1.27, 2.3]) bx(g, out, OM.ironD, L, .14, .22, 0, y, 0, false);
    for (const [y, h] of [[.76, .9], [1.79, .94]]) for (const s of [-1, 1]) tx(g, out, OM.plate, 1.25, 1.1, h, .12, s * .58, y, 0, true);
    for (const z of [-1, 1]) tx(g, out, OM.hazard, 3, L - .8, .13, .02, 0, .22, z * .125, false);
    for (let i = 0; i < 8; i++) spike(g, out, OM.steelL, .07, .3, -L / 2 + .55 + i * .3, 2.3 + .22, 0, true);
    lines(g, out, L - .9, 0, 2.3, .115, 1); lines(g, out, L - .9, 0, 2.3, -.115, -1);          // líneas de facción en la viga superior
    return { out, hx: L / 2, hz: .31, h: H + .4 };
  }
  const WALLS = [null, wall1, wall2, wall3], wallHp = [0, 250, 600, 1100], wallMat = [0, 'wood', 'block', 'metal'];
  const wallNames = ['', 'Empalizada de madera', 'Muro de piedra', 'Muro de hierro'];
  for (let lv = 1; lv <= 3; lv++) def('wall' + lv, { name: wallNames[lv], cat: 'Accesos y defensa', level: lv }, { mat: wallMat[lv], hp: wallHp[lv], push: false, mass: 60, fric: 9, build: WALLS[lv] });

  /* ---- portón de dos hojas: 1 tablones con herrajes · 2 arco de piedra y roble con bandas de hierro · 3 hierro remachado con púas ---- */
  function gateBuild(style, W, H, inner) {
    return g => {
      const out = [], hw = W / 2, pw = style === 'stone' ? .62 : .5, lw = hw - pw - .02, hy = H - .3;
      for (const s of [-1, 1]) {                                                         // postes
        const px = s * (hw - pw / 2);
        if (style === 'wood') { log(g, out, BARK[s > 0 ? 1 : 2], .23, H + .2, px, (H + .2) / 2 + .02, 0, false); mkPiece(g, out, TIP8, BARK[0], .23, .36, .23, px, H + .2 + .2, 0, false, [.46, .36, .46]); bx(g, out, OM.soil, .8, .14, .8, px, .07, 0, false); }
        else if (style === 'stone') { tx(g, out, OM.stone, 1, pw, H + .25, pw, px, (H + .25) / 2, 0, false); tx(g, out, OM.stoneD, 1, pw + .1, .12, pw + .1, px, H + .31, 0, false); mkPiece(g, out, TIP8, OM.tileP, .38, .28, .38, px, H + .51, 0, false, [.76, .28, .76]); }
        else { bx(g, out, OM.iron, .1, H + .2, .36, px, (H + .2) / 2, 0, false); for (const z of [-1, 1]) bx(g, out, OM.iron, .42, H + .2, .09, px, (H + .2) / 2, z * .19, false); bx(g, out, OM.ironD, .6, .1, .6, px, .05, 0, false); spike(g, out, OM.steelL, .1, .34, px, H + .38, 0, true); }
      }
      const iw = W - pw * 2;                                                             // dintel
      if (style === 'wood') { rot(log(g, out, BARK[1], .16, iw + .5, 0, H + .06, 0, false), 0, 0, Math.PI / 2); }
      else if (style === 'stone') { tx(g, out, OM.stone, 1, iw + .1, .5, pw - .06, 0, H + .02, 0, false); tx(g, out, OM.stoneD, 1, iw + .2, .1, pw + .1, 0, H + .31, 0, false); mkPiece(g, out, geoBox, OM.tileP, iw + .24, .07, .5, 0, H + .42, .17, true, [iw, .07, .5]).rotation.x = -.5; mkPiece(g, out, geoBox, OM.tileP, iw + .24, .07, .5, 0, H + .42, -.17, true, [iw, .07, .5]).rotation.x = .5; }
      else { bx(g, out, OM.ironD, iw + .1, .28, .26, 0, H - .06, 0, false); tx(g, out, OM.hazard, 3, iw, .13, .03, 0, H - .06, .14, false); }
      if (style === 'wood') { bx(g, out, OM.woodD, iw, .2, .05, 0, H - .22, .1, false); lines(g, out, iw - .1, 0, H - .22, .125, 1); }          // friso bajo el dintel con las líneas de la facción
      else if (style === 'stone') lines(g, out, iw - .2, 0, H + .02, pw / 2 - .06 + .0, 1);
      else lines(g, out, iw - .2, 0, H - .06, .13, 1);
      const lfs = [];
      for (const s of [-1, 1]) {
        const i0 = out.length, hx = s * (hw - pw), cx = s * (hw - pw - lw / 2), mid = hy / 2 + .06;
        if (style === 'wood') {
          bx(g, out, OM.woodD, lw, .15, .12, cx, hy, 0, true); bx(g, out, OM.woodD, lw, .15, .12, cx, .16, 0, true); bx(g, out, OM.woodD, .15, hy, .12, hx - s * .075, mid, 0, true); bx(g, out, OM.woodD, .15, hy, .12, hx - s * (lw - .075), mid, 0, true);
          tx(g, out, OM.boardsW, 2, lw - .2, hy - .3, .07, cx, mid, 0, true);
          rot(bx(g, out, OM.woodD, .13, Math.hypot(lw, hy - .3) * .93, .06, cx, mid, .06, true), 0, 0, s * Math.atan2(lw, hy - .3));
          for (const f of [.28, .74]) bx(g, out, OM.ironD, lw * .85, .1, .045, hx - s * lw * .42, hy * f, .06, true);
        } else if (style === 'stone') {
          bx(g, out, OM.woodD, lw, .16, .14, cx, hy, 0, true); bx(g, out, OM.woodD, lw, .16, .14, cx, .16, 0, true); bx(g, out, OM.woodD, .16, hy, .14, hx - s * .08, mid, 0, true); bx(g, out, OM.woodD, .16, hy, .14, hx - s * (lw - .08), mid, 0, true);
          tx(g, out, OM.boardsD, 2, lw - .24, hy - .3, .09, cx, mid, 0, true);
          for (const f of [.2, .5, .8]) { bx(g, out, OM.ironD, lw - .08, .13, .05, cx, hy * f + .08, .07, true); for (let k = 0; k < 4; k++) bx(g, out, OM.steelL, .05, .05, .03, cx - s * 0 + (k - 1.5) * lw * .22, hy * f + .08, .1, true); }
          bx(g, out, OM.steelL, .1, .1, .05, hx - s * (lw - .24), hy * .5, .11, true);
        } else {
          bx(g, out, OM.ironD, lw, .15, .13, cx, hy, 0, true); bx(g, out, OM.ironD, lw, .15, .13, cx, .16, 0, true); bx(g, out, OM.ironD, .14, hy, .13, hx - s * .07, mid, 0, true); bx(g, out, OM.ironD, .14, hy, .13, hx - s * (lw - .07), mid, 0, true);
          tx(g, out, OM.plate, 1.25, lw - .2, hy - .3, .06, cx, mid, 0, true);
          rot(bx(g, out, OM.iron, .1, Math.hypot(lw, hy - .3) * .95, .08, cx, mid, .05, true), 0, 0, s * Math.atan2(lw, hy - .3));
          if (!inner) { rot(bx(g, out, OM.iron, .1, Math.hypot(lw, hy - .3) * .95, .08, cx, mid, .05, true), 0, 0, -s * Math.atan2(lw, hy - .3)); tx(g, out, OM.hazard, 3, lw - .2, .14, .03, cx, .42, .04, true); for (let k = 0; k < 3; k++) spike(g, out, OM.steelL, .05, .22, cx + (k - 1) * lw * .3, hy + .18, 0, true); }
          bx(g, out, OM.steelL, .08, .3, .06, hx - s * (lw - .24), hy * .5, .08, true);
        }
        lfs.push(leaf(out, i0, hx, 0, s));
      }
      bx(g, out, OM.rust, .08, .32, .06, 0, hy / 2, .09, false);
      return { out, hx: hw, hz: pw / 2 + .02, h: H + .5, leaves: lfs, openBoxes: [{ lx: -(hw - pw / 2), lz: 0, hx: pw / 2, hz: pw / 2 }, { lx: hw - pw / 2, lz: 0, hx: pw / 2, hz: pw / 2 }], swing: 1.75 };
    };
  }
  const gateHp = [0, 180, 420, 750], gateNames = ['', 'Portón de madera', 'Portón de piedra y roble', 'Portón de hierro'], gateStyle = ['', 'wood', 'stone', 'iron'], gateMat = ['', 'wood', 'block', 'metal'];
  for (let lv = 1; lv <= 3; lv++) def('gate' + lv, { name: gateNames[lv], cat: 'Accesos y defensa', level: lv, open: true }, { mat: gateMat[lv], hp: gateHp[lv], push: false, mass: 60, fric: 9, build: gateBuild(gateStyle[lv], 4.2, 2.6, false) });
  def('gateInner', { name: 'Puerta interior de hierro', cat: 'Accesos y defensa', open: true, note: 'Se añade al subir el portón a nivel 3 (segunda puerta que cierra el paso aunque caiga la exterior)' }, { mat: 'metal', hp: 400, push: false, mass: 40, fric: 9, build: gateBuild('iron', 3.2, 2.3, true) });

  /* ---- puerta doble (madera pintada, un color distinto cada vez) ---- */
  def('door', { name: 'Puerta doble', cat: 'Accesos y defensa', open: true }, {
    mat: 'wood', hp: 90, push: false, mass: 12, fric: 9, build: g => {
      const out = [], W = 2.0, H = 2.2, hw = W / 2, lw = hw - .18, lfs = [], col = paint(pick(PAINTS));
      for (const s of [-1, 1]) tx(g, out, OM.plaster, 1, .2, H + .1, .26, s * (hw - .1), (H + .1) / 2, 0, false);
      tx(g, out, OM.plaster, 1, W, .16, .26, 0, H + .08, 0, false); bx(g, out, OM.woodD, W - .1, .06, .3, 0, 0.03, 0, false);
      for (const s of [-1, 1]) {
        const i0 = out.length, hx = s * (hw - .16), cx = s * (hw - .16 - lw / 2);
        bx(g, out, col, .1, H - .1, .07, hx - s * .05, (H - .1) / 2 + .02, 0, true); bx(g, out, col, .1, H - .1, .07, hx - s * (lw - .05), (H - .1) / 2 + .02, 0, true);
        bx(g, out, col, lw, .12, .07, cx, .08, 0, true); bx(g, out, col, lw, .12, .07, cx, H - .1, 0, true); bx(g, out, col, lw, .1, .07, cx, H * .5, 0, true);
        tx(g, out, OM.boardsW, 3, lw - .2, H - .4, .04, cx, H / 2 + .02, .005, true);
        bx(g, out, OM.steelL, .05, .22, .05, hx - s * (lw - .16), H * .5 - .15, .06, true); bx(g, out, OM.ironD, .26, .07, .035, hx - s * .13, H - .22, .05, true); bx(g, out, OM.ironD, .26, .07, .035, hx - s * .13, .26, .05, true);
        lfs.push(leaf(out, i0, hx, 0, s));
      }
      return { out, hx: hw, hz: .14, h: H + .18, leaves: lfs, openBoxes: [{ lx: -(hw - .08), lz: 0, hx: .09, hz: .13 }, { lx: hw - .08, lz: 0, hx: .09, hz: .13 }], swing: 1.65 };
    }
  });

  /* ---- verja corredera de hierro forjado con puntas doradas ---- */
  def('slideGate', { name: 'Verja corredera', cat: 'Accesos y defensa', open: true }, {
    mat: 'metal', hp: 200, push: false, mass: 40, fric: 9, pen: .35, build: g => {
      const out = [], W = 4.2, H = 2.2, lw = 3.6;
      for (const s of [-1, 1]) { tx(g, out, OM.stone, 1, .42, H + .1, .42, s * (W / 2 - .21), (H + .1) / 2, 0, false); tx(g, out, OM.stoneD, 1, .54, .12, .54, s * (W / 2 - .21), H + .16, 0, false); mkPiece(g, out, geoBall, OM.yellow, .12, .12, .12, s * (W / 2 - .21), H + .3, 0, false, [.24, .24, .24]); }
      bx(g, out, OM.ironD, W - .8, .08, .14, 0, .04, .12, false);
      const i0 = out.length;
      bx(g, out, OM.ironD, lw, .1, .1, 0, .22, 0, true); bx(g, out, OM.ironD, lw, .1, .1, 0, H - .12, 0, true); bx(g, out, OM.ironD, lw, .08, .08, 0, H * .55, 0, true);
      for (let k = 0; k <= 18; k++) { const x = -lw / 2 + .05 + k * (lw - .1) / 18; bx(g, out, OM.iron, .045, H - .3, .045, x, H / 2 - .01, 0, true); spike(g, out, OM.yellow, .035, .12, x, H - .1, 0, true); }
      for (const s of [-1, 1]) bx(g, out, OM.ironD, .1, H - .1, .1, s * (lw / 2 - .05), H / 2 + .05, 0, true);
      rot(bx(g, out, OM.rust, .08, 1.1, .03, -.5, H * .35, .03, true), 0, 0, .3);
      cy(g, out, OM.steelL, .07, .12, -lw / 2 + .3, .1, .08, true); cy(g, out, OM.steelL, .07, .12, lw / 2 - .3, .1, .08, true);
      const lf = leaf(out, i0, 0, 0, 1);
      return { out, hx: W / 2, hz: .24, h: H + .35, leaves: [lf], slide: 3.6, openBoxes: [{ lx: -(W / 2 - .21), lz: 0, hx: .21, hz: .21 }, { lx: W / 2 - .21, lz: 0, hx: .21, hz: .21 }, { lx: 3.6, lz: 0, hx: lw / 2, hz: .1 }] };
    }
  });

  /* ---- persiana enrollable (pintada) ---- */
  def('shutter', { name: 'Persiana', cat: 'Sonido y visibilidad', open: true, note: 'Al moverla hace ruido (alerta a infectados)' }, {
    mat: 'metal', hp: 90, push: false, mass: 20, fric: 9, noiseOnMove: 30, build: g => {
      const out = [], W = 2.6, H = 2.4, N = 12, sh = (H - .1) / N, c1 = paint(pick(PAINTS)), c2 = new THREE.MeshStandardMaterial({ color: c1.color.clone().multiplyScalar(.78), roughness: .6, metalness: .2, flatShading: true });
      for (const s of [-1, 1]) tx(g, out, OM.plaster, 1, .16, H, .22, s * (W / 2 - .08), H / 2, 0, false);
      bx(g, out, OM.ironD, W, .3, .28, 0, H - .1, 0, false);
      const i0 = out.length;
      for (let k = 0; k < N; k++) bx(g, out, k % 2 ? c1 : c2, W - .2, sh - .012, .045, 0, sh / 2 + k * sh, 0, true);
      bx(g, out, OM.steelL, .16, .06, .06, 0, .1, .05, true); bx(g, out, OM.rust, W - .3, .12, .01, 0, sh * 2.5, .03, true);
      const lf = leaf(out, i0, 0, 0, 1); lf.H = H - .3;
      return { out, hx: W / 2, hz: .15, h: H + .1, leaves: [lf], roll: true, openBoxes: [] };
    }
  });

  /* ---- puesto de vigilancia elevado: 1 madera con rollizos · 2 base de piedra y plataforma de madera · 3 torre de hierro ---- */
  function towerBuild(style) {
    return g => {
      const out = [], S = 2.6, hs = S / 2, DY = 2.3, wood = style !== 'iron';
      for (const a of [-1, 1]) for (const b of [-1, 1]) {
        const px = a * (hs - .16), pz = b * (hs - .16);
        if (style === 'wood') log(g, out, BARK[(a + b + 2) % 3], .13, DY + .1, px, (DY + .1) / 2, pz, false);
        else if (style === 'stone') { tx(g, out, OM.stone, 1, .46, 1.4, .46, px, .7, pz, false); tx(g, out, OM.stoneD, 1, .52, .1, .52, px, 1.45, pz, false); bx(g, out, OM.woodF, .18, DY - 1.4, .18, px, 1.5 + (DY - 1.4) / 2, pz, false); }
        else { bx(g, out, OM.iron, .1, DY + .1, .2, px, (DY + .1) / 2, pz, false); bx(g, out, OM.iron, .2, DY + .1, .06, px, (DY + .1) / 2, pz + b * .08, false); bx(g, out, OM.ironD, .34, .1, .34, px, .05, pz, false); }
      }
      for (const z of [-1, 1]) for (const [y, k] of [[.4, 1], [1.2, -1]]) rot(bx(g, out, wood ? OM.woodD : OM.ironD, S - .3, .09, .07, 0, y + .45, z * (hs - .16), true), 0, 0, k * .55);
      for (const x of [-1, 1]) bx(g, out, wood ? OM.woodD : OM.ironD, .07, .09, S - .3, x * (hs - .16), 1.0, 0, true);
      bx(g, out, wood ? OM.woodF : OM.ironD, S, .14, S, 0, DY, 0, true); lines(g, out, S - .1, 0, DY - .02, hs + .01, 1);
      for (let k = 0; k < 4; k++) tx(g, out, wood ? OM.boardsW : OM.plate, 2, S - .1, .03, .5, 0, DY + .085, -hs + .35 + k * .6, true);
      if (style === 'iron') for (const [w, d, x, z] of [[S, .12, 0, hs - .06], [.12, S - .2, -hs + .06, 0], [.12, S - .2, hs - .06, 0]]) tx(g, out, OM.plate, 1.25, w, .8, d, x, DY + .5, z, true);
      else { for (let k = 0; k < 4; k++) bx(g, out, OM.sack, 1.1, .3, .45, -.65 + (k % 2) * 1.3, DY + .22, hs - .3, true); bx(g, out, OM.sack, 1.2, .3, .45, 0, DY + .5, hs - .3, true); }
      for (const x of [-1, 1]) bx(g, out, wood ? OM.woodD : OM.ironD, .16, 1.7, .16, x * (hs - .15), DY + 1.0, -hs + .15, false);
      for (const x of [-1, 1]) bx(g, out, wood ? OM.woodD : OM.ironD, .16, 1.2, .16, x * (hs - .15), DY + .75, hs - .15, false);
      rot(tx(g, out, style === 'stone' ? OM.tile : style === 'iron' ? OM.plate : OM.corr, 2, S + .5, .07, S + .6, 0, DY + 1.55, 0, true), .13, 0, 0);
      for (let k = 0; k < 7; k++) bx(g, out, wood ? OM.woodF : OM.iron, .55, .05, .1, 0, .3 + k * .32, -hs - .08, true);
      for (const x of [-.3, .3]) bx(g, out, wood ? OM.woodF : OM.iron, .07, DY + .2, .07, x, (DY + .2) / 2, -hs - .08, true);
      lines(g, out, S + .3, 0, DY + 1.34, hs + .3, 1, .13); lines(g, out, S + .3, 0, DY + 1.76, -hs - .3, -1, .13);   // líneas de facción en el borde del techo
      return { out, hx: hs, hz: hs + .1, h: DY + 1.6, seats: [{ lx: 0, lz: -.2, y: DY + .09 }] };
    };
  }
  const towerNames = ['', 'Torre de vigilancia de madera', 'Torre de vigilancia con base de piedra', 'Torre de vigilancia de hierro'], towerHp = [0, 220, 450, 750], towerMat = ['', 'wood', 'block', 'metal'];
  for (let lv = 1; lv <= 3; lv++) def('tower' + lv, { name: towerNames[lv], cat: 'Accesos y defensa', level: lv, note: 'Un agente por puesto con visión directa; ocupación y altura de tiro: entrega 2' }, { mat: towerMat[lv], hp: towerHp[lv], push: false, mass: 80, fric: 9, build: towerBuild(['', 'wood', 'stone', 'iron'][lv]) });

  /* ---- pasarela y escalera de servicio (acero pintado, desgastado) ---- */
  def('catwalk', { name: 'Pasarela elevada', cat: 'Accesos y defensa', note: 'Hoy es un obstáculo sólido; la altura transitable llega con la navegación vertical (entrega 2)' }, {
    mat: 'metal', hp: 260, push: false, mass: 80, fric: 9, build: g => {
      const out = [], L = 4.4, W = 1.3, DY = 2.4;
      for (const s of [-1, 1]) for (const z of [-1, 1]) { bx(g, out, OM.iron, .14, DY, .14, s * (L / 2 - .2), DY / 2, z * (W / 2 - .12), false); bx(g, out, OM.ironD, .3, .08, .3, s * (L / 2 - .2), .04, z * (W / 2 - .12), false); }
      for (const s of [-1, 1]) bx(g, out, OM.iron, .1, .1, W - .1, s * (L / 2 - .2), DY - .15, 0, true);
      for (const z of [-1, 1]) bx(g, out, OM.iron, L, .14, .1, 0, DY - .05, z * (W / 2 - .1), true);
      tx(g, out, OM.corr, 1.5, L, .05, W - .05, 0, DY + .02, 0, true);
      for (const z of [-1, 1]) { bx(g, out, OM.orange, L, .06, .06, 0, DY + 1.0, z * (W / 2 - .06), true); bx(g, out, OM.orange, L, .06, .06, 0, DY + .55, z * (W / 2 - .06), true); for (let k = 0; k <= 8; k++) bx(g, out, OM.orange, .06, 1.0, .06, -L / 2 + .1 + k * (L - .2) / 8, DY + .5, z * (W / 2 - .06), true); }
      for (const z of [-1, 1]) for (let k = 0; k < 3; k++) rot(bx(g, out, OM.rust, .05, .3, .02, -1.2 + k * 1.2, DY + .75, z * (W / 2 - .03), true), 0, 0, .1);
      tx(g, out, OM.hazard, 3, .6, .02, W - .2, L / 2 - .5, DY + .06, 0, true);
      return { out, hx: L / 2, hz: W / 2, h: DY + 1.05 };
    }
  });
  def('stairs', { name: 'Escalera de servicio', cat: 'Accesos y defensa', note: 'Sólida hoy; sube a la pasarela cuando exista la navegación vertical' }, {
    mat: 'metal', hp: 220, push: false, mass: 70, fric: 9, build: g => {
      const out = [], N = 12, run = .28, rise = 2.4 / N, W = 1.1, L = N * run;
      for (const z of [-1, 1]) rot(bx(g, out, OM.iron, Math.hypot(L, 2.4), .16, .06, 0, 1.2, z * (W / 2 - .03), true), 0, 0, Math.atan2(2.4, L));
      for (let k = 0; k < N; k++) tx(g, out, OM.corr, 1.5, run + .02, .05, W - .1, -L / 2 + run * (k + .5), rise * (k + 1) - .02, 0, true);
      for (const z of [-1, 1]) { rot(bx(g, out, OM.orange, Math.hypot(L, 2.4), .06, .06, 0, 1.2 + .95, z * (W / 2 - .03), true), 0, 0, Math.atan2(2.4, L)); for (const k of [0, 4, 8, 11]) bx(g, out, OM.orange, .06, .95, .06, -L / 2 + run * (k + .5), rise * (k + 1) + .48, z * (W / 2 - .03), true); }
      return { out, hx: L / 2, hz: W / 2, h: 3.3 };
    }
  });

  /* ---- mobiliario urbano ---- */
  def('bench', { name: 'Banco de piedra y madera', cat: 'Mobiliario urbano' }, {
    mat: 'block', hp: 150, push: false, mass: 40, fric: 9, build: g => {
      const out = [];
      for (const s of [-1, 1]) tx(g, out, OM.stone, 1, .3, .42, .46, s * .7, .21, 0, false);
      bx(g, out, OM.woodG, 1.9, .08, .42, 0, .47, 0, true); for (const z of [-.1, .1]) bx(g, out, OM.woodF, 1.9, .03, .05, 0, .52, z, true);
      rot(bx(g, out, OM.wood, 1.9, .4, .06, 0, .75, -.2, true), -.12, 0, 0);
      for (const s of [-1, 1]) bx(g, out, OM.rust, .05, .1, .45, s * .6, .42, 0, true);
      return { out, hx: .95, hz: .23, h: .95 };
    }
  });
  def('planter', { name: 'Jardinera', cat: 'Mobiliario urbano' }, {
    mat: 'block', hp: 170, push: false, mass: 40, fric: 9, build: g => {
      const out = [];
      tx(g, out, OM.stoneD, 1, 1.5, .5, .75, 0, .25, 0, false); bx(g, out, OM.stone, 1.56, .07, .81, 0, .53, 0, true); bx(g, out, OM.soil, 1.38, .06, .62, 0, .55, 0, true);
      for (let k = 0; k < 5; k++) mkPiece(g, out, geoBall, k % 2 ? OM.leaf : OM.leafD, .3 + rnd() * .12, .26 + rnd() * .1, .3, -.55 + k * .28, .78 + rnd() * .1, (rnd() - .5) * .25, true, [.4, .35, .4]);
      for (let k = 0; k < 7; k++) mkPiece(g, out, geoBall, k % 2 ? OM.bloom : OM.bloomP, .055, .055, .055, -.6 + k * .2, 1.0 + rnd() * .12, (rnd() - .5) * .3, true, [.1, .1, .1]);
      return { out, hx: .78, hz: .42, h: 1.1 };
    }
  });
  def('busStop', { name: 'Marquesina', cat: 'Mobiliario urbano' }, {
    mat: 'metal', hp: 110, push: false, mass: 60, fric: 9, build: g => {
      const out = [], L = 3.2, D = 1.3, c = paint(pick(PAINTS));
      for (const s of [-1, 1]) bx(g, out, c, .1, 2.5, .1, s * (L / 2 - .1), 1.25, -D / 2 + .1, false);
      for (const s of [-1, 1]) bx(g, out, c, .1, 2.2, .1, s * (L / 2 - .1), 1.1, D / 2 - .1, false);
      rot(bx(g, out, OM.ironD, L + .2, .1, D + .2, 0, 2.5, 0, true), .06, 0, 0); bx(g, out, c, L + .2, .24, .06, 0, 2.58, D / 2 + .08, true);
      for (let k = 0; k < 3; k++) bx(g, out, OM.glass, L / 3 - .06, 1.7, .03, -L / 3 + k * L / 3, 1.25, -D / 2 + .1, true);
      bx(g, out, OM.glass, .03, 1.7, D - .3, -L / 2 + .12, 1.25, 0, true);
      bx(g, out, OM.woodF, 2.0, .06, .42, 0, .5, -D / 2 + .42, true); bx(g, out, OM.ironD, .06, .5, .36, -.9, .25, -D / 2 + .42, false); bx(g, out, OM.ironD, .06, .5, .36, .9, .25, -D / 2 + .42, false);
      bx(g, out, OM.cream, .8, 1.0, .05, 1.1, 1.3, D / 2 - .1, true);                                  // cartel publicitario con bloques de color
      bx(g, out, pick([OM.red, OM.teal, OM.orange]), .64, .3, .02, 1.1, 1.6, D / 2 - .07, true); bx(g, out, OM.yellow, .3, .3, .02, 1.0, 1.15, D / 2 - .07, true); bx(g, out, OM.navy, .26, .3, .02, 1.25, 1.15, D / 2 - .07, true);
      return { out, hx: L / 2 + .1, hz: D / 2 + .1, h: 2.65 };
    }
  });
  def('kiosk', { name: 'Quiosco de prensa', cat: 'Mobiliario urbano' }, {
    mat: 'metal', hp: 200, push: false, mass: 70, fric: 9, build: g => {
      const out = [], W = 2.4, D = 1.8, H = 2.4, bc = paint(pick([0x2f6a45, 0x2f4f86, 0x8a2f26, 0x2c3036]));
      bx(g, out, OM.anth, W + .1, .2, D + .1, 0, .1, 0, false);
      bx(g, out, bc, W, H - .3, .06, 0, .2 + (H - .3) / 2, -D / 2 + .03, true); for (const s of [-1, 1]) bx(g, out, bc, .06, H - .3, D, s * (W / 2 - .03), .2 + (H - .3) / 2, 0, true);
      bx(g, out, bc, W, .85, .06, 0, .2 + .425, D / 2 - .03, true); bx(g, out, bc, W, .55, .06, 0, H - .3 + .2 - .275, D / 2 - .03, true);   // frente con ventana de despacho
      bx(g, out, OM.alu, W + .1, .06, .55, 0, 1.12, D / 2 + .2, true);                                                              // repisa del mostrador
      bx(g, out, OM.glass, W - .5, .1, .02, 0, 1.45, D / 2 - .01, true);
      bx(g, out, OM.anth, W + .3, .14, D + .3, 0, H, 0, true); bx(g, out, OM.yellow, W + .3, .05, .02, 0, H - .1, D / 2 + .16, true);   // techo plano y canto
      for (let k = 0; k < 4; k++) bx(g, out, [OM.red, OM.yellow, OM.blueP, OM.green][k], .22, .3, .04, -.75 + k * .5, 1.35, D / 2 + .1, true);   // revistas
      bx(g, out, OM.white, 1.1, .32, .05, 0, H - .38, D / 2 + .02, true); bx(g, out, bc, 1.0, .22, .055, 0, H - .38, D / 2 + .03, true); bx(g, out, OM.ledG, .5, .05, .06, 0, H - .38, D / 2 + .035, true);   // rótulo iluminado
      bx(g, out, OM.cream, .7, 1.1, .03, W / 2 + .02, 1.1, 0.0, true);
      return { out, hx: W / 2 + .1, hz: D / 2 + .45, h: H + .1 };
    }
  });
  const binBuild = (dump) => g => {
    const out = [], W = dump ? 1.9 : .62, D = dump ? .95 : .7, H = dump ? 1.25 : 1.0, bm = paint(dump ? pick([0x2f6a45, 0x2f4f86, 0x6a3a2a]) : pick([0x3e7a4e, 0x3466a8, 0x8a8d92, 0xd9a21f]));
    bx(g, out, bm, W, H - .15, D, 0, (H - .15) / 2 + .13, 0, true); rot(bx(g, out, dump ? OM.ironD : pick([OM.dark, OM.green, OM.navy]), W + .06, .1, D + .06, 0, H + .02, 0, true), dump ? 0 : -.1, 0, 0);
    for (const s of [-1, 1]) for (const z of [-1, 1]) cy(g, out, OM.rubber, dump ? .1 : .07, .06, s * (W / 2 - .12), .1, z * (D / 2 - .08), true).rotation.z = Math.PI / 2;
    if (dump) { bx(g, out, OM.ironD, W, .08, .08, 0, .9, D / 2 + .02, true); bx(g, out, OM.orange, .9, .2, .03, -.3, .75, D / 2 + .01, true); bx(g, out, OM.rust, .5, .4, .02, .6, .55, D / 2 + .012, true); bx(g, out, OM.rust, .4, .3, .02, -.7, .85, -D / 2 - .012, true); }
    else { bx(g, out, OM.dark, .3, .06, .04, 0, .6, D / 2 + .02, true); bx(g, out, OM.white, .2, .2, .02, 0, .8, D / 2 + .012, true); }
    return { out, hx: W / 2, hz: D / 2, h: H + .08 };
  };
  def('wheelie', { name: 'Contenedor con ruedas', cat: 'Mobiliario urbano' }, { mat: 'plastic', hp: 60, push: true, mass: 2, fric: 5, build: binBuild(false) });
  def('dumpster', { name: 'Contenedor de basura', cat: 'Mobiliario urbano', proposal: true }, { mat: 'metal', hp: 190, push: true, mass: 14, fric: 9, build: binBuild(true) });

  /* ---- comercio y transporte ---- */
  function palletParts(g, out, w, d) {
    const ms = [OM.woodF, OM.wood, OM.woodG];
    for (const z of [-1, 0, 1]) bx(g, out, OM.woodF, w, .1, .12, 0, .06, z * (d / 2 - .06), true);
    for (let k = 0; k < 5; k++) bx(g, out, ms[k % 3], .16, .03, d, -w / 2 + .12 + k * (w - .24) / 4, .135, 0, true);
    for (let k = 0; k < 3; k++) bx(g, out, OM.woodD, .12, .07, d, -w / 2 + .08 + k * (w - .16) / 2, .035, 0, true);
  }
  def('pallet', { name: 'Palé', cat: 'Comercio y transporte' }, { mat: 'wood', hp: 30, push: true, mass: 1.6, fric: 6, build: g => { const out = []; palletParts(g, out, 1.2, 1.0); return { out, hx: .6, hz: .5, h: .18 }; } });
  def('palletBoxes', { name: 'Palé con cajas', cat: 'Comercio y transporte' }, {
    mat: 'wood', hp: 70, push: true, mass: 5, fric: 8, build: g => {
      const out = []; palletParts(g, out, 1.2, 1.0);
      for (const [x, z, h, m] of [[-.3, -.22, .5, OM.card], [.3, -.22, .45, OM.cream], [-.3, .24, .4, OM.card], [.3, .24, .5, OM.cream]]) { bx(g, out, m, .54, h, .44, x, .15 + h / 2, z, true); bx(g, out, pick([OM.red, OM.teal, OM.orange]), .12, .02, .45, x, .15 + h + .005, z, true); bx(g, out, OM.white, .22, .14, .01, x, .15 + h / 2, z + .225, true); }
      bx(g, out, OM.card, .5, .4, .42, -.3, .15 + .5 + .2, -.22, true); bx(g, out, OM.rope, .52, .04, .44, -.3, .15 + .5 + .2, -.22, true);
      return { out, hx: .6, hz: .5, h: 1.1 };
    }
  });
  def('cage', { name: 'Jaula metálica', cat: 'Comercio y transporte' }, {
    mat: 'metal', hp: 110, push: true, mass: 6, fric: 7, pen: .3, build: g => {
      const out = [], W = 1.2, D = .8, H = 1.7;
      bx(g, out, OM.ironD, W, .12, D, 0, .2, 0, false); for (const s of [-1, 1]) for (const z of [-1, 1]) cy(g, out, OM.rubber, .07, .06, s * (W / 2 - .1), .07, z * (D / 2 - .1), false).rotation.z = Math.PI / 2;
      for (const s of [-1, 1]) for (const z of [-1, 1]) bx(g, out, OM.steelL, .05, H - .2, .05, s * (W / 2 - .03), H / 2 + .1, z * (D / 2 - .03), true);
      for (const y of [.55, 1.1, H - .1]) for (const z of [-1, 1]) bx(g, out, OM.steelL, W, .04, .04, 0, y, z * (D / 2 - .03), true);
      for (const y of [.55, 1.1, H - .1]) for (const s of [-1, 1]) bx(g, out, OM.steelL, .04, .04, D, s * (W / 2 - .03), y, 0, true);
      for (let k = 1; k < 8; k++) bx(g, out, OM.steelL, .02, H - .4, .02, -W / 2 + k * W / 8, H / 2 + .1, D / 2 - .03, true);
      for (let k = 1; k < 6; k++) bx(g, out, OM.steelL, .02, H - .4, .02, -W / 2 + k * W / 6, H / 2 + .1, -D / 2 + .03, true);
      bx(g, out, OM.card, .5, .4, .5, -.25, .46, 0, true); bx(g, out, OM.red, .5, .35, .5, .25, .43, .05, true); bx(g, out, OM.yellow, .45, .35, .45, -.2, .85, 0, true); bx(g, out, OM.teal, .3, .3, .4, .3, .8, .05, true);
      return { out, hx: W / 2, hz: D / 2, h: H };
    }
  });
  def('counter', { name: 'Mostrador', cat: 'Comercio y transporte' }, {
    mat: 'wood', hp: 130, push: false, mass: 50, fric: 9, build: g => {
      const out = [], W = 2.4, D = .75, H = 1.05, c = paint(pick(PAINTS));
      bx(g, out, OM.woodD, W, H - .08, D - .1, 0, (H - .08) / 2, -.03, true); tx(g, out, OM.boardsW, 2, W - .16, H - .24, .03, 0, (H - .08) / 2, D / 2 - .06, true); bx(g, out, c, W, .1, .04, 0, .1, D / 2 - .04, true); bx(g, out, c, W, .1, .04, 0, H - .16, D / 2 - .04, true);
      bx(g, out, OM.cream, W + .08, .08, D, 0, H - .04, 0, true);
      bx(g, out, OM.steelL, .5, .03, .3, .7, H + .02, 0, true); bx(g, out, OM.dark, .3, .22, .25, .7, H + .15, -.05, true); bx(g, out, OM.screen, .22, .12, .02, .7, H + .17, .08, true);
      bx(g, out, OM.red, .3, .12, .22, -.7, H + .1, 0, true); bx(g, out, OM.yellow, .2, .1, .2, -.35, H + .09, .05, true);
      return { out, hx: W / 2 + .04, hz: D / 2, h: H + .3 };
    }
  });
  function shelfFrame(g, out, W, D, H, levels, m) {
    for (const s of [-1, 1]) for (const z of [-1, 1]) bx(g, out, m, .06, H, .06, s * (W / 2 - .03), H / 2, z * (D / 2 - .03), false);
    for (let k = 0; k <= levels; k++) bx(g, out, m === OM.woodF ? OM.wood : OM.steelL, W, .05, D, 0, .1 + k * (H - .15) / levels, 0, true);
    bx(g, out, m === OM.woodF ? OM.woodD : OM.ironD, W, H - .1, .02, 0, H / 2, -D / 2 + .01, true);
  }
  const prodColors = [OM.red, OM.yellow, OM.blueP, OM.white, OM.green, OM.orange, OM.teal, OM.pink];
  def('shelf', { name: 'Estantería', cat: 'Comercio y transporte' }, {
    mat: 'metal', hp: 90, push: false, mass: 30, fric: 9, build: g => {
      const out = [], W = 2.2, D = .55, H = 1.9; shelfFrame(g, out, W, D, H, 4, paint(pick([0x3466a8, 0xe07a2a, 0x2a9a94])));
      for (let l = 0; l < 4; l++) for (let k = 0; k < 7; k++) { const h = .22 + rnd() * .12; bx(g, out, prodColors[(k * 3 + l * 2) % 8], .26, h, .26 + rnd() * .1, -W / 2 + .22 + k * .3, .13 + l * (H - .15) / 4 + h / 2 + .03, 0, true); }
      return { out, hx: W / 2, hz: D / 2, h: H };
    }
  });
  def('locker', { name: 'Taquilla', cat: 'Comercio y transporte' }, {
    mat: 'metal', hp: 80, push: false, mass: 25, fric: 9, build: g => {
      const out = [], N = 3, w = .5, H = 1.85, D = .5, cs = [paint(pick(PAINTS)), paint(pick(PAINTS)), paint(pick(PAINTS))];
      bx(g, out, OM.ironD, N * w + .06, .08, D, 0, .04, 0, false);
      for (let k = 0; k < N; k++) { const x = (k - (N - 1) / 2) * w; bx(g, out, cs[k], w - .02, H - .1, D - .08, x, H / 2 + .02, -.02, true); bx(g, out, OM.ironD, w - .12, .05, .02, x, H - .35, D / 2 - .03, true); bx(g, out, OM.ironD, w - .12, .05, .02, x, H - .42, D / 2 - .03, true); bx(g, out, OM.steelL, .03, .14, .03, x + w * .28, H * .55, D / 2 - .02, true); if (rnd() < .6) bx(g, out, OM.rust, .18, .24, .01, x - .06, .35, D / 2 - .03, true); }
      bx(g, out, OM.ironD, N * w + .06, .06, D + .02, 0, H + .02, 0, true);
      return { out, hx: N * w / 2 + .03, hz: D / 2, h: H + .06 };
    }
  });
  def('pharmaCab', { name: 'Armario de farmacia', cat: 'Comercio y transporte', loot: [{ k: 'botiquín', n: [1, 3] }] }, {
    mat: 'metal', hp: 70, push: false, mass: 30, fric: 9, build: g => {
      const out = [], W = 1.1, D = .45, H = 1.9;
      bx(g, out, OM.white, W, H, D, 0, H / 2, 0, false); bx(g, out, OM.green, W + .06, .1, D + .04, 0, H + .03, 0, true); bx(g, out, OM.green, W + .06, .1, D + .04, 0, .05, 0, false);
      for (const s of [-1, 1]) { bx(g, out, OM.glass, W / 2 - .1, H - .6, .03, s * W / 4, H / 2 + .1, D / 2 + .005, true); bx(g, out, OM.steelL, .02, .3, .03, s * .05, H / 2 + .1, D / 2 + .02, true); }
      for (let l = 0; l < 3; l++) for (let k = 0; k < 6; k++) bx(g, out, [OM.white, OM.green, OM.teal, OM.orange][(k + l) % 4], .12, .12, .1, -W / 2 + .12 + k * .17, .55 + l * .42, 0, true);
      bx(g, out, OM.medCross, .22, .06, .03, 0, H - .13, D / 2 + .02, true); bx(g, out, OM.medCross, .06, .22, .03, 0, H - .13, D / 2 + .02, true); bx(g, out, OM.white, .5, .3, .05, 0, H - .13, D / 2 + .01, true);
      return { out, hx: W / 2 + .03, hz: D / 2 + .02, h: H + .08 };
    }
  });
  function supplyBuild(kind) {
    return g => {
      const out = [], W = .8, D = .55, H = .5, body = kind === 'ammo' ? OM.olive : kind === 'med' ? OM.white : OM.wood;
      bx(g, out, body, W, H - .06, D, 0, (H - .06) / 2 + .03, 0, true);
      for (const s of [-1, 1]) bx(g, out, kind === 'mat' ? OM.woodD : kind === 'ammo' ? OM.ironD : OM.blueP, .07, H, D + .02, s * (W / 2 - .12), H / 2, 0, true);
      bx(g, out, kind === 'med' ? OM.white : kind === 'ammo' ? OM.olive : OM.woodF, W + .02, .05, D + .02, 0, H, 0, true);
      if (kind === 'med') { bx(g, out, OM.medCross, .22, .06, .02, 0, H * .5, D / 2 + .012, true); bx(g, out, OM.medCross, .06, .22, .02, 0, H * .5, D / 2 + .012, true); }
      else if (kind === 'ammo') { bx(g, out, OM.yellow, .3, .08, .02, 0, H * .6, D / 2 + .012, true); bx(g, out, OM.yellow, .2, .05, .02, 0, H * .4, D / 2 + .012, true); bx(g, out, OM.yellow, .08, .24, .02, -W / 2 + .06, H * .5, D / 2 + .012, true); }
      else { bx(g, out, OM.rope, W + .02, .05, D + .03, 0, H * .5, 0, true); bx(g, out, OM.dark, .3, .1, .02, 0, H * .78, D / 2 + .012, true); }
      bx(g, out, OM.steelL, .1, .05, .06, 0, H + .03, 0, true);
      return { out, hx: W / 2, hz: D / 2, h: H + .05 };
    };
  }
  def('supplyMat', { name: 'Caja de materiales', cat: 'Comercio y transporte', loot: [{ k: 'material', n: [1, 3] }] }, { mat: 'wood', hp: 40, push: true, mass: 3, fric: 7, build: supplyBuild('mat') });
  def('supplyAmmo', { name: 'Caja de munición', cat: 'Comercio y transporte', loot: [{ k: 'munición', n: [1, 3] }] }, { mat: 'wood', hp: 45, push: true, mass: 3, fric: 7, build: supplyBuild('ammo') });
  def('supplyMed', { name: 'Caja médica', cat: 'Comercio y transporte', loot: [{ k: 'botiquín', n: [1, 2] }, { k: 'kit de reanimación', n: [0, 1] }] }, { mat: 'plastic', hp: 40, push: true, mass: 2.5, fric: 7, build: supplyBuild('med') });

  const CAR_COL = [0xb8412e, 0xd9a21f, 0x2a8f8a, 0x4f6b3a, 0xd8d0bc, 0x3a63a0];
  def('car', { name: 'Coche abandonado', cat: 'Comercio y transporte', proposal: true }, {
    mat: 'metal', hp: 320, push: true, mass: 40, fric: 14, build: g => {
      const out = [], L = 4.3, W = 1.8, body = sm(pick(CAR_COL), .5, .45), bd = body.clone(); bd.color.multiplyScalar(.7);
      bx(g, out, body, L, .55, W, 0, .6, 0, false); bx(g, out, bd, L - .1, .22, W - .06, 0, .3, 0, false); bx(g, out, OM.soil, L - .05, .12, W + .01, 0, .2, 0, false);
      bx(g, out, body, 1.35, .13, W - .12, L / 2 - .9, .94, 0, true); bx(g, out, body, 1.0, .13, W - .12, -L / 2 + .55, .94, 0, true);
      bx(g, out, body, 1.9, .5, W - .2, -.2, 1.22, 0, true);
      for (const x of [.73, -1.0]) bx(g, out, OM.glass, .04, .38, W - .36, x, 1.2, 0, true);
      for (const s of [-1, 1]) { bx(g, out, OM.glass, 1.3, .36, .03, -.2, 1.24, s * (W / 2 - .09), true); bx(g, out, OM.dark, .06, .4, .05, .35, 1.24, s * (W / 2 - .1), true); }
      for (const a of [-1, 1]) for (const b of [-1, 1]) { cy(g, out, OM.rubber, .31, .22, a * (L / 2 - .85), .31, b * (W / 2 - .07), true).rotation.x = Math.PI / 2; cy(g, out, OM.steelL, .16, .24, a * (L / 2 - .85), .31, b * (W / 2 - .07), true).rotation.x = Math.PI / 2; }
      for (const s of [-1, 1]) { bx(g, out, OM.lampOff, .06, .12, .32, L / 2 - .02, .72, s * (W / 2 - .3), true); bx(g, out, OM.red, .06, .1, .3, -L / 2 + .02, .72, s * (W / 2 - .3), true); }
      bx(g, out, OM.ironD, .16, .12, W - .1, L / 2 - .02, .35, 0, true); bx(g, out, OM.ironD, .16, .12, W - .1, -L / 2 + .02, .35, 0, true);
      for (let k = 0; k < 4; k++) bx(g, out, OM.rust, .25 + rnd() * .3, .015, .15 + rnd() * .2, k % 2 ? -.2 + (rnd() - .5) * 1.0 : 1.4 + (rnd() - .5) * .6, k % 2 ? 1.48 : 1.02, (rnd() - .5) * .8, true);
      for (const s of [-1, 1]) bx(g, out, OM.rust, .8, .22, .02, (rnd() - .5) * 2, .42, s * (W / 2 + .005), true);
      return { out, hx: L / 2, hz: W / 2, h: 1.5 };
    }
  });
  def('stall', { name: 'Puesto de mercado', cat: 'Comercio y transporte' }, {
    mat: 'metal', hp: 100, push: false, mass: 40, fric: 9, build: g => {
      const out = [], W = 2.6, D = 1.3, H = 2.3, cv = pick([OM.white, OM.cream, OM.blueP, OM.green]);
      for (const s of [-1, 1]) for (const z of [-1, 1]) bx(g, out, OM.alu, .05, H, .05, s * (W / 2 - .05), H / 2, z * (D / 2 - .05), z < 0);
      bx(g, out, OM.alu, W, .8, D - .4, 0, .4, .1, true); bx(g, out, OM.white, W + .06, .05, D - .3, 0, .82, .1, true);                // mesa
      rot(bx(g, out, cv, W + .3, .05, D + .6, 0, H - .05, 0, true), .14, 0, 0); bx(g, out, cv, W + .3, .22, .04, 0, H - .21, D / 2 + .32, true);   // carpa lisa con faldón
      for (let k = 0; k < 5; k++) bx(g, out, [OM.red, OM.yellow, OM.orange, OM.leaf, OM.pink][k], .38, .2, .3, -.9 + k * .45, 1.0, .1, true);
      for (let k = 0; k < 3; k++) mkPiece(g, out, geoBall, [OM.red, OM.orange, OM.leafD][k], .16, .14, .16, -.5 + k * .45, 1.2, .1, true, [.3, .3, .3]);
      return { out, hx: W / 2 + .15, hz: D / 2 + .3, h: H };
    }
  });

  /* ---- sonido y visibilidad ---- */
  def('glassPane', { name: 'Cristalera', cat: 'Sonido y visibilidad', note: 'Al romperse abre la línea de visión y hace ruido' }, {
    mat: 'glass', hp: 22, push: false, mass: 10, fric: 9, pen: .85, noiseOnBreak: 40, build: g => {
      const out = [], W = 2.0, H = 2.2, fm = paint(pick([0x3a63a0, 0x2a8f8a, 0x6a4228]));
      for (const s of [-1, 1]) bx(g, out, fm, .1, H, .14, s * (W / 2 - .05), H / 2, 0, false); bx(g, out, fm, W, .1, .14, 0, .05, 0, false); bx(g, out, fm, W, .1, .14, 0, H - .05, 0, false);
      const hw = (W - .2) / 2, hh = (H - .2) / 2;
      for (const sx of [-1, 1]) for (const sy of [-1, 1]) bx(g, out, OM.glass, hw - .005, hh - .005, .03, sx * hw / 2, H / 2 + sy * hh / 2, 0, true);
      bx(g, out, fm, .06, H - .1, .08, 0, H / 2, 0, false); bx(g, out, fm, W - .1, .06, .08, 0, H / 2, 0, false);
      return { out, hx: W / 2, hz: .09, h: H };
    }
  });
  /* Locales de hoy: fachada de aluminio y vidrio, rótulo iluminado, parapeto plano, aire acondicionado en la azotea. Un cuerpo con volumen (fondo 2,2 m) y techo plano. */
  function signTex(label, sub, bg, fg, cross) {
    return new THREE.MeshBasicMaterial({ map: mkTex(512, (x, s) => {
      x.fillStyle = bg; x.fillRect(0, 0, s, s); const y0 = s * .375, hh = s * .25; x.fillStyle = 'rgba(255,255,255,.12)'; x.fillRect(0, y0, s, hh * .45);
      x.fillStyle = fg; x.textAlign = 'center'; x.textBaseline = 'middle'; x.font = '900 ' + Math.round(cl((cross ? 380 : 440) / (label.length * .68), 34, 76)) + 'px sans-serif'; x.fillText(label, s / 2 + (cross ? 36 : 0), y0 + hh * (sub ? .38 : .5));
      if (sub) { x.font = '700 30px sans-serif'; x.fillText(sub, s / 2 + (cross ? 36 : 0), y0 + hh * .8); }
      if (cross) { x.fillStyle = '#2fb866'; const cx = 70, cyy = y0 + hh / 2, a = 26, b = 9; x.fillRect(cx - b, cyy - a, 2 * b, 2 * a); x.fillRect(cx - a, cyy - b, 2 * a, 2 * b); }
    }) });
  }
  function shopFront(o) {
    return g => {
      const out = [], W = o.W, D = 2.2, H = 3.2, hw = W / 2, dw = o.door, pw = (W - .6 - dw) / 2, glassPcs = [];
      const wallM = o.wall || OM.plasterG;
      bx(g, out, OM.anth, W, .42, D, 0, .21, 0, false);                                                           // zócalo oscuro
      tx(g, out, wallM, 1, W, H - .42, .12, 0, .42 + (H - .42) / 2, -D / 2 + .06, false);                         // fachada trasera y laterales
      for (const s of [-1, 1]) tx(g, out, wallM, 1, .3, H - .42, D, s * (hw - .15), .42 + (H - .42) / 2, 0, false);
      bx(g, out, OM.concL, W + .24, .18, D + .24, 0, H + .09, 0, false);                                          // losa de cubierta con peto
      bx(g, out, o.brand, W + .26, .05, .03, 0, .42, D / 2 + .005, false);                                        // línea de color de la marca sobre el zócalo
      for (const s of [-1, 1]) { const px = s * (dw / 2 + pw / 2); bx(g, out, OM.glassT, pw - .06, 2.0, .03, px, 1.45, D / 2 - .02, true); glassPcs.push(out[out.length - 1]); }   // escaparates
      for (const s of [-1, 1]) { bx(g, out, OM.glassT, dw / 2 - .08, 2.0, .03, s * (dw / 4), 1.45, D / 2 - .02, true); glassPcs.push(out[out.length - 1]); }   // hojas de la puerta
      for (const x of [-hw + .3, -dw / 2 - pw, -dw / 2, 0, dw / 2, dw / 2 + pw, hw - .3]) bx(g, out, OM.alu, .06, 2.1, .1, x, 1.45, D / 2 - .02, false);   // montantes de aluminio
      for (const y of [.45, 2.47]) bx(g, out, OM.alu, W - .5, .07, .1, 0, y, D / 2 - .02, false);
      for (const s of [-1, 1]) bx(g, out, OM.steelL, .03, .55, .04, s * .07, 1.15, D / 2 + .01, true);              // tiradores
      bx(g, out, OM.anth, W - .5, .14, .14, 0, 2.58, D / 2 - .05, false);                                         // cajón de la persiana
      const sg = signTex(o.label, o.sub, o.bg, o.fg, o.cross); sg.map.wrapS = sg.map.wrapT = THREE.ClampToEdgeWrapping;
      bx(g, out, OM.anth, W - .3, .62, .16, 0, 2.9, D / 2 - .04, false);
      const sign = bx(g, out, sg, W - .42, .5, .03, 0, 2.9, D / 2 + .05, true); sign.geometry = sign.geometry.clone(); const uv = sign.geometry.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setY(i, uv.getY(i) * .25 + .375);
      bx(g, out, OM.white, .7, .04, .01, -hw / 2 - .2, 1.2, D / 2 + .0, true); bx(g, out, o.brand, .7, .22, .01, hw / 2 + .2, 1.5, D / 2 + .0, true);   // vinilos en el cristal
      bx(g, out, OM.ledG, .34, .1, .03, dw / 2 + .22, 2.05, D / 2 + .02, true);                                      // cartel ABIERTO
      bx(g, out, OM.dark, .1, .1, .16, -hw + .12, 2.35, D / 2 + .1, true);                                         // cámara de seguridad
      for (const [x, z, w, h] of [[-hw / 2, -.2, .9, .6], [hw / 2 - .2, .2, .7, .5]]) { bx(g, out, OM.steelL, w, h, w * .8, x, H + .18 + h / 2, z, true); cy(g, out, OM.ironD, w * .32, .04, x, H + .18 + h + .01, z, true); }   // equipos de aire en la azotea
      if (o.crossFlag) { bx(g, out, OM.ledG, .2, .9, .14, -hw - .02, 2.35, D / 2 - .5, true); bx(g, out, OM.ledG, .9, .2, .14, -hw - .02, 2.35, D / 2 - .5, true); }   // cruz verde de bandera
      const beacon = new THREE.Mesh(geoBall, new THREE.MeshBasicMaterial({ color: 0x551111 })); beacon.scale.set(.1, .1, .1); beacon.position.set(hw - .25, H + .24, D / 2 - .2); g.add(beacon);
      return { out, hx: hw + .08, hz: D / 2 + .15, h: H + .2, beacon, glassPcs };
    };
  }
  const SHOPS = {
    shopFront: ['Minimarket', { W: 4.6, door: 1.4, label: 'MINIMARKET', sub: 'ABIERTO 24 H', bg: '#d8321f', fg: '#ffffff', brand: sm(0xd8321f, .5), wall: OM.plasterG }],
    pharmFront: ['Farmacia', { W: 4.6, door: 1.4, label: 'FARMACIA', sub: 'MEDICAMENTOS · SALUD', bg: '#ffffff', fg: '#1a6b3c', brand: sm(0x2fb866, .5), wall: OM.plasterG, cross: true, crossFlag: true }],
    superFront: ['Supermercado', { W: 6.6, door: 2.2, label: 'SUPERMERCADO', sub: 'FRESCOS · OFERTAS', bg: '#f08a12', fg: '#ffffff', brand: sm(0xf08a12, .5), wall: OM.plasterG }]
  };
  for (const k in SHOPS) def(k, { name: 'Local: ' + SHOPS[k][0], cat: 'Sonido y visibilidad', alarm: true, note: 'Alarma de tienda: al romper un cristal suena y atrae infectados' }, { mat: 'block', hp: 380, push: false, mass: 90, fric: 9, alarm: true, build: shopFront(SHOPS[k][1]) });

  def('floodlight', { name: 'Foco de patio', cat: 'Sonido y visibilidad', note: 'Apagarlo o romperlo oculta la zona (efecto de visión: entrega 2)' }, {
    mat: 'metal', hp: 80, push: false, mass: 20, fric: 9, build: g => {
      const out = [], H = 4.2;
      tx(g, out, OM.stoneD, 1, .5, .24, .5, 0, .12, 0, false); cy(g, out, OM.iron, .09, H, 0, H / 2 + .1, 0, false); cy(g, out, OM.yellow, .095, .5, 0, .6, 0, false); cy(g, out, OM.rust, .095, .3, 0, 1.2, 0, false);
      bx(g, out, OM.ironD, .1, .1, .9, 0, H + .1, .3, true);
      bx(g, out, OM.ironD, .7, .34, .26, 0, H + .1, .78, true); bx(g, out, OM.ironD, .74, .06, .3, 0, H + .3, .78, true);
      bx(g, out, OM.lamp, .6, .24, .02, 0, H + .08, .92, true); const lamp = out[out.length - 1];
      const glow = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), new THREE.MeshBasicMaterial({ map: GLOWTEX, color: 0xfff0b8, transparent: true, opacity: .22, depthWrite: false, blending: THREE.AdditiveBlending })); glow.rotation.x = -Math.PI / 2; glow.position.set(0, .05, 2.2); glow.scale.set(2.4, 2.4, 2.4); g.add(glow);
      return { out, hx: .25, hz: .25, h: H + .3, glow, lamp };
    }
  });
  def('pump', { name: 'Surtidor de gasolinera', cat: 'Sonido y visibilidad', note: 'Gasolinera: punto reconocible de abastecimiento (sin transporte de bidones)' }, {
    mat: 'metal', hp: 120, push: false, mass: 40, fric: 9, fluid: 'fuel', build: g => {
      const out = [], br = pick([sm(0xd8321f, .5), sm(0x1f7a46, .5), sm(0x2f5fa8, .5)]);
      bx(g, out, OM.concL, 1.0, .16, .75, 0, .08, 0, false); bx(g, out, OM.yellow, 1.0, .04, .02, 0, .1, .385, false);              // isleta con borde amarillo
      bx(g, out, OM.white, .62, 1.55, .38, 0, .94, 0, true); bx(g, out, br, .64, .12, .4, 0, 1.78, 0, true); bx(g, out, br, .64, .06, .4, 0, .2, 0, true);
      bx(g, out, OM.anth, .46, .26, .06, 0, 1.45, .2, true); bx(g, out, OM.ledG, .34, .1, .02, 0, 1.47, .235, true);                // pantalla digital
      for (let k = 0; k < 3; k++) bx(g, out, [OM.green, OM.dark, OM.red][k], .12, .12, .03, -.16 + k * .16, 1.15, .2, true);        // botones de combustible
      for (const s of [-1, 1]) { bx(g, out, OM.anth, .08, .34, .1, s * .37, .95, .12, true); bx(g, out, OM.dark, .04, .3, .04, s * .37, .72, .18, true); }
      bx(g, out, OM.ledG, .5, .03, .03, 0, 1.87, .16, true); bx(g, out, OM.steelL, .5, .02, .02, 0, 1.6, .205, true);
      return { out, hx: .5, hz: .38, h: 1.9 };
    }
  });

  /* ---- refugio: almacén por reservas, enfermería, tablón, armero y emblemas de facción ---- */
  function storeBuild(kind) {
    return g => {
      const out = [], W = 1.9, D = .7, H = 2.0; shelfFrame(g, out, W, D, H, 3, OM.woodF);
      const lev = l => .1 + l * (H - .15) / 3 + .05;
      for (let l = 0; l < 3; l++) for (let k = 0; k < 4; k++) {
        const x = -W / 2 + .26 + k * .46, y = lev(l);
        if (kind === 'mat') { if ((k + l) % 2) for (let n = 0; n < 3; n++) bx(g, out, OM.lumber, .4, .08, .55, x, y + .04 + n * .085, 0, true); else { mkPiece(g, out, geoBall, OM.sack, .2, .16, .26, x, y + .16, 0, true, [.4, .3, .5]); bx(g, out, OM.steelL, .06, .3, .06, x + .14, y + .16, .26, true); bx(g, out, OM.rust, .26, .1, .1, x - .12, y + .05, .26, true); } }
        else if (kind === 'ammo') { bx(g, out, OM.olive, .38, .24, .5, x, y + .12, 0, true); bx(g, out, OM.yellow, .3, .04, .02, x, y + .15, .26, true); bx(g, out, OM.orange, .06, .1, .02, x + .14, y + .08, .26, true); }
        else { bx(g, out, OM.white, .38, .24, .5, x, y + .12, 0, true); bx(g, out, OM.medCross, .12, .04, .02, x, y + .13, .26, true); bx(g, out, OM.medCross, .04, .12, .02, x, y + .13, .26, true); bx(g, out, OM.teal, .38, .04, .5, x, y + .26, 0, true); }
      }
      bx(g, out, kind === 'mat' ? OM.woodD : kind === 'ammo' ? OM.olive : OM.medCross, W, .12, .05, 0, H + .03, D / 2, false); accent(g, out, W - .3, .06, .02, 0, H + .03, D / 2 + .03, true);
      return { out, hx: W / 2 + .03, hz: D / 2, h: H + .1 };
    };
  }
  def('storeMat', { name: 'Módulo de almacén: materiales', cat: 'Refugio', reserve: 'materiales' }, { mat: 'wood', hp: 160, push: false, mass: 60, fric: 9, build: storeBuild('mat') });
  def('storeAmmo', { name: 'Módulo de almacén: munición', cat: 'Refugio', reserve: 'munición' }, { mat: 'wood', hp: 160, push: false, mass: 60, fric: 9, build: storeBuild('ammo') });
  def('storeMed', { name: 'Módulo de almacén: material médico', cat: 'Refugio', reserve: 'médica' }, { mat: 'wood', hp: 160, push: false, mass: 60, fric: 9, build: storeBuild('med') });
  def('cot', { name: 'Camilla', cat: 'Refugio', seats: 1 }, {
    mat: 'metal', hp: 80, push: true, mass: 6, fric: 7, build: g => {
      const out = [];
      for (const s of [-1, 1]) for (const z of [-1, 1]) { bx(g, out, OM.woodF, .05, .5, .05, s * .38, .3, z * .9, true); cy(g, out, OM.rubber, .06, .05, s * .38, .06, z * .9, true).rotation.z = Math.PI / 2; }
      bx(g, out, OM.olive, .8, .05, 2.0, 0, .56, 0, true); for (const s of [-1, 1]) bx(g, out, OM.woodD, .06, .06, 2.3, s * .42, .6, 0, true);
      accent(g, out, .72, .1, 1.3, 0, .64, .28, true); bx(g, out, OM.cream, .72, .1, .55, 0, .64, -.68, true); rot(bx(g, out, OM.white, .5, .1, .3, 0, .74, -.82, true), .3, 0, 0);
      bx(g, out, OM.medCross, .14, .02, .14, 0, .71, .4, true);
      return { out, hx: .45, hz: 1.14, h: .8 };
    }
  });
  def('board', { name: 'Tablón de expediciones', cat: 'Refugio' }, {
    mat: 'wood', hp: 70, push: false, mass: 20, fric: 9, build: g => {
      const out = [];
      for (const s of [-1, 1]) log(g, out, BARK[1], .07, 2.3, s * .95, 1.15, 0, false);
      tx(g, out, OM.boardsW, 2, 1.9, 1.2, .06, 0, 1.45, .02, true); bx(g, out, OM.woodD, 2.0, .08, .1, 0, 2.08, 0, true); bx(g, out, OM.woodD, 2.0, .08, .1, 0, .84, 0, true);
      accent(g, out, 1.9, .22, .03, 0, 2.25, .02, true); trim(g, out, 1.9, .04, .035, 0, 2.12, .02, true);
      for (const [x, y, w, m] of [[-.6, 1.6, .4, OM.cream], [-.1, 1.5, .5, OM.white], [.5, 1.65, .4, OM.cream], [.5, 1.2, .5, OM.cream], [-.5, 1.15, .35, OM.white]]) bx(g, out, m, w, .32, .015, x, y, .06, true);
      for (const [x, y, m] of [[-.45, 1.74, OM.red], [.62, 1.78, OM.blueP], [-.1, 1.64, OM.yellow], [.5, 1.35, OM.green], [-.5, 1.28, OM.orange]]) mkPiece(g, out, geoBall, m, .035, .035, .035, x, y, .075, true, [.07, .07, .07]);
      return { out, hx: 1.02, hz: .1, h: 2.4 };
    }
  });
  def('rack', { name: 'Expositor de armas (armería)', cat: 'Refugio' }, {
    mat: 'metal', hp: 100, push: false, mass: 30, fric: 9, build: g => {
      const out = [], W = 1.7, H = 1.5;
      for (const s of [-1, 1]) bx(g, out, OM.woodD, .1, H, .3, s * (W / 2 - .05), H / 2, 0, false); bx(g, out, OM.woodD, W, .1, .3, 0, .08, 0, false);
      tx(g, out, OM.boardsD, 2, W - .1, H - .3, .04, 0, H / 2 + .05, -.12, true); bx(g, out, OM.woodD, W, .1, .3, 0, H - .04, 0, true); bx(g, out, OM.ironD, W - .1, .06, .1, 0, .75, .1, true); bx(g, out, OM.ironD, W - .1, .06, .1, 0, 1.2, .1, true);
      accent(g, out, W - .1, .1, .03, 0, H - .04, .16, true);
      for (let k = 0; k < 5; k++) { const x = -.65 + k * .32, big = k % 2 === 0; bx(g, out, OM.dark, .07, big ? .95 : .55, .06, x, big ? .68 : .9, -.04, true); bx(g, out, OM.dark, .1, .22, .08, x, big ? .26 : .62, -.04, true); bx(g, out, OM.woodF, .08, .2, .07, x, .35, -.04, true); }
      return { out, hx: W / 2, hz: .16, h: H };
    }
  });
  const SYM = [3, 4, 6, 16];
  for (let f = 0; f < 4; f++) def('emblem' + f, { name: 'Emblema de facción ' + FAC[f].name, cat: 'Refugio', faction: f }, {
    mat: 'block', hp: 260, push: false, mass: 60, fric: 9, build: g => {
      const out = [], W = 3.0, H = 2.8;
      for (const s of [-1, 1]) { tx(g, out, OM.stone, 1, .52, H, .52, s * (W / 2 - .26), H / 2, 0, false); tx(g, out, OM.stoneD, 1, .64, .12, .64, s * (W / 2 - .26), H + .06, 0, false); spike(g, out, FACMAT[f], .13, .3, s * (W / 2 - .26), H + .27, 0, false); }
      bx(g, out, OM.woodD, W - .6, .26, .4, 0, H - .13, 0, false);
      bx(g, out, FACMAT[f], W - .6, .12, .42, 0, H - .34, 0, true);
      bx(g, out, FACMAT[f], W - .6, 1.5, .26, 0, 1.0, 0, true);                                            // fondo pintado con el color de la facción
      const sy = mkPiece(g, out, prism(SYM[f]), FACTRIM[f], .62, .06, .62, 0, 1.15, .17, false, [1.2, .06, 1.2]); sy.rotation.x = Math.PI / 2; if (SYM[f] === 3) sy.rotation.y = Math.PI;
      const in2 = mkPiece(g, out, prism(SYM[f]), OM.dark, .34, .08, .34, 0, 1.15, .2, false, [.68, .08, .68]); in2.rotation.x = Math.PI / 2; in2.rotation.y = sy.rotation.y;
      for (const s of [-1, 1]) { bx(g, out, FACMAT[f], .36, 1.1, .03, s * (W / 2 - .65), H - .95, .3, true); bx(g, out, FACTRIM[f], .36, .07, .035, s * (W / 2 - .65), H - .42, .3, true); }
      return { out, hx: W / 2, hz: .33, h: H + .1 };
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
  const OBJ = window.OBJ = { meta: META, types: Object.keys(SP), on: [], pickups: [], alarms: [], _b: null, fac: null };
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
    if (s) { p.meta = META[type]; p.faction = OBJ.fac; emit('add', p); } return p;
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
  OBJ.place = function (type, x, z, rot, fac) { const f0 = OBJ.fac; OBJ.fac = fac === undefined ? null : fac; try { return addProp(type, x, z, rot || 0); } finally { OBJ.fac = f0; } };   // fac 0..3 = color de facción (franjas, telas, banderas)
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
  const GRY = [OM.grey, sm(0x5a6068, .6, .3), OM.ironD];
  PK.material = () => pkGroup([[geoBox, OM.lumber, .46, .09, .24, 0, .05, 0], [geoBox, OM.lumber, .46, .09, .24, 0, .14, 0, 0, .35, 0], [geoBox, OM.steelL, .5, .02, .05, 0, .2, 0, 0, .35, 0], [geoBall, OM.sack, .14, .11, .16, .05, .12, .24]]);
  PK.ammo = () => pkGroup([[geoBox, OM.olive, .34, .2, .2, 0, .1, 0], [geoBox, OM.ironD, .36, .03, .22, 0, .21, 0], [geoBox, OM.yellow, .18, .05, .01, 0, .12, .105], [geoBox, OM.steelL, .08, .04, .06, 0, .25, 0]]);
  PK.medkit = () => pkGroup([[geoBox, OM.white, .32, .22, .13, 0, .11, 0], [geoBox, OM.medCross, .12, .04, .01, 0, .12, .07], [geoBox, OM.medCross, .04, .12, .01, 0, .12, .07], [geoBox, OM.ironD, .12, .04, .04, 0, .24, 0]]);
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
  OBJ.gallery = function (types, facOf2) {                                             // coloca los tipos pedidos en filas; cada uno con una facción distinta (por defecto 0,1,2,3…)
    for (const p of props.slice()) { dropBoxes(p); scene.remove(p.g); const i = props.indexOf(p); if (i >= 0) props.splice(i, 1); }
    boxes.length = 0; types = types || OBJ.types; const cols = 8, gx = 6.2, gz = 6, out = [];
    types.forEach((t, i) => { const one = types.length === 1, x = one ? 0 : (i % cols - (cols - 1) / 2) * gx, z = one ? 0 : -8 + Math.floor(i / cols) * gz; out.push(OBJ.place(t, x, z, 0, facOf2 ? facOf2(i) : i % 4)); });
    P.pos.set(0, 0, 0); return out;
  };
  /* vista previa de otro color de suelo (solo en pruebas; el juego no lo cambia) */
  OBJ.setGround = function (hex) { if (OBJ._g0 === undefined) OBJ._g0 = ground.material.color.getHex(); ground.material.color.setHex(hex === null ? OBJ._g0 : hex); };
  if (/[?&]galeria=1/.test(location.search)) setTimeout(() => OBJ.gallery(), 400);
})();
