"use strict";
/* ===================== ECONOMÍA (campaña): madera, piedra y hierro =====================
   Un almacén compartido por facción (tope 600). Los soldados llevan material en la mochila (20 / 35 / 50 unidades según el nivel de mochila) y lo descargan solos al pisar la
   ZONA DE DEPÓSITO, junto a la entrada interior del refugio. El stock sobrevive a la caída de los muros; solo se pierde si cae el almacén (refugios.js).
   Fuentes: desguace de objetos neutrales (rendimiento por tipo, ver YIELD), tala, montones de goteo de los puntos y botín de los caídos. Todos los costes y ritmos están en ECO. */
(function () {
const M = MX.M, SQ = MX.SQ, MATS = ['madera', 'piedra', 'hierro'], ICON = { madera: '🪵', piedra: '🪨', hierro: '⛓' };
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
ECO.reset = () => { for (let t = 0; t < 4; t++) { Object.assign(ECO.stock[t], ECO.start); ECO.stat.deposited[t] = ECO.stat.gained[t] = ECO.stat.spent[t] = 0; } ECO.feed.length = 0; for (const e of M.ents) if (e.mat) e.mat = null; };

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
let chip = null, chipKey = -1;
function hud() {
  if (!chip) { const st = document.createElement('style'); st.textContent = `#ecoChip{position:fixed;left:50%;top:calc(34px + env(safe-area-inset-top));transform:translateX(-50%);z-index:3;pointer-events:none;display:none;gap:8px;font:700 10.5px/1 system-ui,-apple-system,sans-serif;color:#fff;text-shadow:0 1px 2px #000;white-space:nowrap}
#ecoChip span{background:#0b0f18b0;border-radius:999px;padding:3px 8px;border:1px solid #ffffff1e}#ecoChip .w{color:#ffd86a}
@media (min-height:521px){#ecoChip{top:calc(42px + env(safe-area-inset-top));font-size:12px}}`; document.head.appendChild(st); chip = document.createElement('div'); chip.id = 'ecoChip'; document.body.appendChild(chip); }
  const pl = MX.pl, on = MX.on && MX.campaign && pl && !menuOpen && !MX.mapOpen; chip.style.display = on ? 'flex' : 'none'; if (!on) return;
  const s = ECO.stock[pl.team], L = ECO.load(pl), m = pl.mat || {}, key = ((((((L * 61 + ECO.cap(pl)) * 61 + (m.madera || 0)) * 61 + (m.piedra || 0)) * 61 + (m.hierro || 0)) * 1009 + s.madera) * 1009 + s.piedra) * 1009 + s.hierro;
  if (key === chipKey) return; chipKey = key;
  const det = L ? ' <small>' + MATS.filter(k => m[k]).map(k => ICON[k] + m[k]).join(' ') + '</small>' : '';
  chip.innerHTML = '<span class="' + (L >= ECO.cap(pl) ? 'w' : '') + '">llevas ' + L + '/' + ECO.cap(pl) + det + '</span><span>Almacén ' + ECO.total(pl.team) + ' <small>' + ICON.madera + s.madera + ' ' + ICON.piedra + s.piedra + ' ' + ICON.hierro + s.hierro + '</small></span>';
}
let t4 = 0, seen = null;
const sqUpdate = SQ.update;
SQ.update = dt => {
  sqUpdate(dt); if (!MX.campaign) return;
  if (ECO.key !== (MAPA.built || null)) build();
  if (seen !== M) { seen = M; }
  t4 += dt; if (t4 >= .25) { t4 = 0; for (let i = 0; i < M.ents.length; i++) { const e = M.ents[i]; if (e.mat && !e.dead && !e.dwn && ECO.load(e) && ECO.inZone(e)) ECO.deposit(e); } }
  hud();
};
ECO.reset();
const restart = MX.restart; if (restart) MX.restart = function () { const r = restart.apply(this, arguments); ECO.reset(); return r; };
})();
