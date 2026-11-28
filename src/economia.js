"use strict";
/* ===================== ECONOMÍA (campaña): madera, piedra y hierro =====================
   Un almacén compartido por facción (tope 600). Los soldados llevan material en la mochila (20 / 35 / 50 unidades según el nivel de mochila) y lo descargan solos al pisar la
   ZONA DE DEPÓSITO, junto a la entrada interior del refugio. El stock sobrevive a la caída de los muros; solo se pierde si cae el almacén (refugios.js).
   Fuentes: desguace de objetos neutrales (rendimiento por tipo, ver YIELD), tala, montones de goteo de los puntos y botín de los caídos. Todos los costes y ritmos están en ECO. */
(function () {
const M = MX.M, SQ = MX.SQ, INT = MX.INT, MATS = ['madera', 'piedra', 'hierro'], ICON = { madera: '🪵', piedra: '🪨', hierro: '⛓' };
const ECO = {
  MATS, ICON, stockCap: 600, packCap: [20, 20, 35, 50], start: { madera: 60, piedra: 30, hierro: 20 },
  matOf: { wood: 'madera', metal: 'hierro', block: 'piedra', sand: 'piedra' },
  /* material por tipo de objeto: [tipo, unidades] (los no listados dan 1 unidad por cada 25 de vida, entre 2 y 12) */
  yield: {
    car: ['hierro', 12], van: ['hierro', 14], pickup: ['hierro', 12], truck: ['hierro', 18], police: ['hierro', 12], forklift: ['hierro', 10], container: ['hierro', 20], dumpster: ['hierro', 8], barrel: ['hierro', 4], barrelFuel: ['hierro', 3],
    fridge: ['hierro', 6], cart: ['hierro', 3], stall: ['hierro', 5], cage: ['hierro', 5], chainFence: ['hierro', 4], palletRack: ['hierro', 8], gondola3: ['hierro', 5], gondola4: ['hierro', 6], shelf: ['hierro', 4], floodlight: ['hierro', 4],
    crate: ['madera', 5], crateS: ['madera', 3], palletBoxes: ['madera', 6], pallet: ['madera', 3], fence: ['madera', 2], sofa: ['madera', 4], table: ['madera', 3], bed: ['madera', 4], wardrobe: ['madera', 5], tvUnit: ['madera', 3], kitchenUnit: ['madera', 5], counter: ['madera', 5], log: ['madera', 8], hedge: ['madera', 2], bush: ['madera', 1],
    blocks: ['piedra', 6], sandbags: ['piedra', 4], jersey: ['piedra', 10], planter: ['piedra', 5], bench: ['piedra', 4], pillar: ['piedra', 8] },
  stock: [0, 1, 2, 3].map(() => ({ madera: 0, piedra: 0, hierro: 0 })), feed: [], zones: [], key: null,
};
MX.ECO = ECO;
const dist2 = (a, b) => (a.x - b.x) * (a.x - b.x) + (a.z - b.z) * (a.z - b.z);
ECO.yieldOf = p => { const y = ECO.yield[p.type]; if (y) return { tipo: y[0], n: y[1] }; const t = ECO.matOf[p.mat]; if (!t) return null; return { tipo: t, n: Math.max(2, Math.min(12, Math.round((p.maxHp || p.hp || 50) / 25))) }; };
ECO.packLevel = e => { const b = e.bag || {}; return b.pack3 ? 3 : b.pack2 ? 2 : b.pack1 ? 1 : 0; };
ECO.cap = e => ECO.packCap[ECO.packLevel(e)];
ECO.mat = e => e.mat || (e.mat = { madera: 0, piedra: 0, hierro: 0 });
ECO.load = e => { const m = e.mat; return m ? m.madera + m.piedra + m.hierro : 0; };
ECO.addCarry = (e, tipo, n) => { const room = Math.max(0, ECO.cap(e) - ECO.load(e)), take = Math.min(n, room); if (take > 0) ECO.mat(e)[tipo] += take; return take; };
ECO.canSpend = (team, cost) => MATS.every(k => (ECO.stock[team][k] || 0) >= (cost[k] || 0));
ECO.spend = (team, cost) => { if (!ECO.canSpend(team, cost)) return false; for (const k of MATS) ECO.stock[team][k] -= cost[k] || 0; return true; };
ECO.addStock = (team, tipo, n) => { const s = ECO.stock[team], a = Math.max(0, Math.min(n, ECO.stockCap - s[tipo])); s[tipo] += a; return a; };
ECO.total = team => { const s = ECO.stock[team]; return s.madera + s.piedra + s.hierro; };
ECO.zoneOf = team => ECO.zones.find(z => z.team === team);
ECO.inZone = e => { const z = ECO.zoneOf(e.team); return !!z && dist2(e.p, z) <= z.r * z.r; };
ECO.log = (team, txt) => { ECO.feed.push({ t: M.t, team, txt }); if (ECO.feed.length > 40) ECO.feed.shift(); };
/* descarga todo lo que lleva `e` al almacén de su facción (el sobrante por el tope se queda en la mochila) */
ECO.deposit = e => {
  if (!ECO.load(e)) return 0; let tot = 0; const parts = [];
  for (const k of MATS) { const n = e.mat[k]; if (!n) continue; const a = ECO.addStock(e.team, k, n); e.mat[k] -= a; tot += a; if (a) parts.push('+' + a + ' ' + k); }
  if (tot) { ECO.stat.deposited[e.team] += tot; if (e.isPlayer) { MX.SQ.toast(parts.join(' · ') + ' al almacén'); } ECO.log(e.team, (e.isPlayer ? 'Tú' : e.id) + ' ' + parts.join(' · ')); }
  else if (e.isPlayer && M.t - (e.fullT || -99) > 6) { e.fullT = M.t; MX.SQ.toast('Almacén lleno (' + ECO.stockCap + ')'); }
  return tot;
};
ECO.stat = { deposited: [0, 0, 0, 0], gained: [0, 0, 0, 0], spent: [0, 0, 0, 0] };
ECO.reset = () => { for (const o of (SQ.objs || [])) if (o.pile) o.pile = null; for (let t = 0; t < 4; t++) { Object.assign(ECO.stock[t], ECO.start); ECO.stat.deposited[t] = ECO.stat.gained[t] = ECO.stat.spent[t] = 0; } ECO.feed.length = 0; for (const e of M.ents) if (e.mat) e.mat = null; };

/* ---------- zona de depósito: marca en el suelo + cartel ---------- */
let grp = null;
function floorTex() {
  const c = document.createElement('canvas'); c.width = c.height = 128; const x = c.getContext('2d');
  x.fillStyle = 'rgba(255,200,40,.16)'; x.fillRect(0, 0, 128, 128); x.strokeStyle = 'rgba(255,200,40,.85)'; x.lineWidth = 6; x.strokeRect(5, 5, 118, 118);
  x.lineWidth = 9; x.strokeStyle = 'rgba(255,200,40,.5)'; for (let i = -128; i < 256; i += 26) { x.beginPath(); x.moveTo(i, 0); x.lineTo(i + 128, 128); x.stroke(); }
  const t = new THREE.CanvasTexture(c); t.minFilter = THREE.LinearFilter; return t;
}
function signTex() {
  const c = document.createElement('canvas'); c.width = 256; c.height = 64; const x = c.getContext('2d');
  x.fillStyle = 'rgba(10,14,22,.85)'; x.fillRect(0, 0, 256, 64); x.strokeStyle = '#ffc828'; x.lineWidth = 4; x.strokeRect(3, 3, 250, 58);
  x.fillStyle = '#ffc828'; x.font = '700 30px system-ui,Arial,sans-serif'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText('DEPÓSITO', 128, 34);
  const t = new THREE.CanvasTexture(c); t.minFilter = THREE.LinearFilter; return t;
}
function build() {
  if (grp) { scene.remove(grp); grp.traverse(o => { if (o.material) { if (o.material.map) o.material.map.dispose(); o.material.dispose(); } }); grp = null; }
  ECO.zones = []; const info = MAPA.built && MAPA.built.info, dz = info && info.depositZones; ECO.key = MAPA.built || null; if (!dz) return;
  grp = new THREE.Group(); const gm = new THREE.MeshBasicMaterial({ map: floorTex(), transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 });
  const sm = new THREE.MeshBasicMaterial({ map: signTex(), transparent: true, side: THREE.DoubleSide }), gg = new THREE.PlaneGeometry(4.2, 4.2), sg = new THREE.PlaneGeometry(2.4, .6);
  for (const z of dz) {
    ECO.zones.push({ team: z.team, x: z.x, z: z.z, r: z.r });
    const f = new THREE.Mesh(gg, gm); f.rotation.x = -Math.PI / 2; f.rotation.z = z.rot || 0; f.position.set(z.x, .05, z.z); f.renderOrder = 2; grp.add(f);
    const s = new THREE.Mesh(sg, sm); s.position.set(z.x, 2.3, z.z); s.rotation.y = (z.rot || 0); s.renderOrder = 3; grp.add(s);
  }
  scene.add(grp);
}
/* ---------- HUD: «llevas 8/20» y «Almacén N» ---------- */
let chip = null, chipKey = -1; const chipChg = { k: -1, t: -99 };
function hud() {
  if (!chip) { const st = document.createElement('style'); st.textContent = `#ecoChip{position:fixed;right:max(14px,env(safe-area-inset-right));top:calc(88px + env(safe-area-inset-top));z-index:3;pointer-events:none;display:none;flex-direction:column;align-items:flex-end;gap:3px;font:700 10.5px/1 system-ui,-apple-system,sans-serif;color:#fff;text-shadow:0 1px 2px #000;white-space:nowrap}
#ecoChip span{background:#0b0f18b0;border-radius:999px;padding:3px 8px;border:1px solid #ffffff1e}#ecoChip .w{color:#ffd86a}
@media (min-height:521px){#ecoChip{top:calc(96px + env(safe-area-inset-top));font-size:12px}}`; document.head.appendChild(st); chip = document.createElement('div'); chip.id = 'ecoChip'; document.body.appendChild(chip); }
  const pl = MX.pl, z0 = pl && ECO.zoneOf(pl.team), key0 = pl ? ECO.total(pl.team) * 1000 + ECO.load(pl) : 0; if (key0 !== chipChg.k) { if (chipChg.k >= 0) chipChg.t = M.t; chipChg.k = key0; }
  const on = MX.on && MX.campaign && pl && !pl.dead && !menuOpen && !MX.mapOpen && (ECO.load(pl) > 0 || M.t - chipChg.t < 4 || (z0 && Math.hypot(pl.p.x - z0.x, pl.p.z - z0.z) < 45));   // solo cuando importa: llevas algo, acabas de cambiar el stock o estás junto a tu refugio
  chip.style.display = on ? 'flex' : 'none'; if (!on) return;
  const s = ECO.stock[pl.team], L = ECO.load(pl), m = pl.mat || {}, key = ((((((L * 61 + ECO.cap(pl)) * 61 + (m.madera || 0)) * 61 + (m.piedra || 0)) * 61 + (m.hierro || 0)) * 1009 + s.madera) * 1009 + s.piedra) * 1009 + s.hierro;
  if (key === chipKey) return; chipKey = key;
  const det = L ? ' <small>' + MATS.filter(k => m[k]).map(k => ICON[k] + m[k]).join(' ') + '</small>' : '';
  chip.innerHTML = '<span class="' + (L >= ECO.cap(pl) ? 'w' : '') + '">llevas ' + L + '/' + ECO.cap(pl) + det + '</span><span>Almacén ' + ECO.total(pl.team) + ' <small>' + ICON.madera + s.madera + ' ' + ICON.piedra + s.piedra + ' ' + ICON.hierro + s.hierro + '</small></span>';
}
/* ---------- GOTEO de los puntos: cada punto mantenido va dejando una pila de material (tope 60) que hay que RECOGER (■ mantenido) y llevar al depósito; se vacía al cambiar de dueño ---------- */
ECO.pileCap = 60;
ECO.drip = { A: { madera: 2, piedra: 2, hierro: 2 }, B: { hierro: 6 }, C: { hierro: 6 }, D: { madera: 6 }, E: { madera: 6 }, out: { madera: 3, piedra: 2, hierro: 2 } };   // unidades por minuto
const dripOf = o => o.refuge ? null : ECO.drip[o.code] || (o.name && /Puesto avanzado/.test(o.name) ? ECO.drip.out : null);
function pilePos(o) {                                                               // un hueco libre de navegación junto al punto, hacia fuera del centro
  const a0 = Math.atan2(o.x, o.z) + 1.2; for (let r = 3; r <= 9; r += 1.5) for (let k = 0; k < 12; k++) { const a = a0 + k * .5236, x = o.x + Math.sin(a) * r, z = o.z + Math.cos(a) * r; if (!MX.inMainNav || MX.inMainNav(x, z)) return { x, z }; }
  return { x: o.x + 3, z: o.z };
}
ECO.pileOf = o => { let q = o.pile; if (!q) { q = o.pile = { madera: 0, piedra: 0, hierro: 0, n: 0, acc: { madera: 0, piedra: 0, hierro: 0 }, own: -1, pos: pilePos(o) }; } return q; };
ECO.collect = (e, o) => {                                                          // vacía la pila en la mochila de e (lo que quepa); devuelve las unidades
  const q = o.pile; if (!q || !q.n) return 0; let room = ECO.cap(e) - ECO.load(e), got = 0; const parts = [];
  while (room > 0 && q.n > 0) { let k = null; for (const t of MATS) if (q[t] > 0 && (!k || q[t] > q[k])) k = t; if (!k) break; const n = Math.min(q[k], room); q[k] -= n; q.n -= n; room -= n; ECO.mat(e)[k] += n; got += n; parts.push('+' + n + ' ' + k); }
  if (got) { ECO.stat.gained[e.team] += got; if (e.isPlayer) MX.SQ.toast(parts.join(' · ')); } return got;
};
function dripTick(dt) {
  for (const o of SQ.objs) { const rate = dripOf(o); if (!rate) continue; const q = ECO.pileOf(o);
    if (q.own !== o.owner) { q.madera = q.piedra = q.hierro = q.n = 0; q.acc.madera = q.acc.piedra = q.acc.hierro = 0; q.own = o.owner; }
    if (o.owner < 0 || o.contested || q.n >= ECO.pileCap) continue;
    for (const t in rate) { q.acc[t] += rate[t] / 60 * dt; if (q.acc[t] >= 1 && q.n < ECO.pileCap) { const a = Math.floor(q.acc[t]); q.acc[t] -= a; q[t] += a; q.n += a; } } }
}
let pg = null; const PV = [];
function pileVis() {
  if (!pg) { pg = new THREE.Group(); scene.add(pg); } const pl = MX.pl; if (!pl) return;
  for (const o of SQ.objs) { if (!dripOf(o)) continue; const q = o.pile; let v = PV[SQ.objs.indexOf(o)];
    if (!q) continue;
    if (!v) { v = PV[SQ.objs.indexOf(o)] = { g: new THREE.Group(), box: [], sp: null, last: '' }; const cols = [0x9c6b3a, 0x8d9096, 0x5e7388];
      for (let i = 0; i < 3; i++) { const m = new THREE.Mesh(geoBox, matStd(cols[i], .8)); m.castShadow = true; v.g.add(m); v.box.push(m); }
      const c = document.createElement('canvas'); c.width = 128; c.height = 40; v.cv = c; v.tex = new THREE.CanvasTexture(c); v.tex.minFilter = THREE.LinearFilter; v.sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: v.tex, transparent: true, depthWrite: false })); v.sp.scale.set(2.4, .75, 1); v.g.add(v.sp); pg.add(v.g); }
    const d = Math.hypot(q.pos.x - P.pos.x, q.pos.z - P.pos.z); v.g.visible = q.n > 0 && d < 75; if (!v.g.visible) continue;
    const key = q.madera + ',' + q.piedra + ',' + q.hierro + ',' + o.owner;
    if (key !== v.last) { v.last = key; const x = v.cv.getContext('2d'); x.clearRect(0, 0, 128, 40); x.fillStyle = 'rgba(10,14,22,.82)'; x.fillRect(0, 4, 128, 32); x.strokeStyle = o.owner >= 0 ? '#' + ['4aa0ff', 'ff5a48', 'ffb020', 'b07cff'][o.owner] : '#ffc828'; x.lineWidth = 3; x.strokeRect(1.5, 5.5, 125, 29); x.fillStyle = '#fff'; x.font = '700 22px system-ui,Arial,sans-serif'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText(q.n + '/' + ECO.pileCap, 64, 21); v.tex.needsUpdate = true;
      const f = [q.madera, q.piedra, q.hierro]; v.box.forEach((m, i) => { const h = .12 + f[i] / ECO.pileCap * 1.1; m.visible = f[i] > 0; m.scale.set(.5, h, .5); m.position.set((i - 1) * .62, h / 2, 0); }); }
    v.g.position.set(q.pos.x, 0, q.pos.z); v.sp.position.set(0, 1.9, 0); }
}
MX.INT.reg('pila', (pl, out) => {
  if (!MX.campaign) return; for (const o of SQ.objs) { const q = o.pile; if (!q || !q.n || o.owner !== pl.team) continue; const dx = q.pos.x - pl.p.x, dz = q.pos.z - pl.p.z; if (dx * dx + dz * dz > 25) continue;
    const room = ECO.cap(pl) - ECO.load(pl);
    out.push({ x: q.pos.x, z: q.pos.z, y: .6, r: .6, key: 'pila' + o.id + ':' + q.n, time: 1.4, tool: null, blocked: room < 1, label: room < 1 ? 'Mochila llena · deposita en el refugio' : 'Recoger material · ' + q.n + '/' + ECO.pileCap, done: e => ECO.collect(e, o) }); }
});
let t4 = 0, seen = null, t1 = 0;
const sqUpdate = SQ.update;
SQ.update = dt => {
  sqUpdate(dt); if (!MX.campaign) return;
  if (ECO.key !== (MAPA.built || null)) build();
  if (seen !== M) { seen = M; }
  t4 += dt; if (t4 >= .25) { t4 = 0; for (let i = 0; i < M.ents.length; i++) { const e = M.ents[i]; if (e.mat && !e.dead && !e.dwn && ECO.load(e) && ECO.inZone(e)) ECO.deposit(e); } }
  t1 += dt; if (t1 >= 1) { dripTick(t1); t1 = 0; }
  pileVis();
  hud();
};
ECO.reset();
const restart = MX.restart; if (restart) MX.restart = function () { const r = restart.apply(this, arguments); ECO.reset(); return r; };
})();
