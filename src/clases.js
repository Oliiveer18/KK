"use strict";
/* ===================== CLASES (campaña): función de cada soldado, puesto de clases del refugio, médicos =====================
   Seis clases con el armamento que ya existe. Cada bot tiene la suya fija (reparto por escuadra: 2 → Fusilero + Médico; 3 → + Asalto; 4 → + Apoyo; 5 → + Flanqueador; 6 → + Francotirador).
   PUESTO DE CLASES: en cada refugio hay 6 chapas en fila (delante del tabique). El jugador cambia de clase pisando una (arma y equipo al instante). Los bots, al aparecer en el refugio,
   caminan a su chapa, se quedan ~1 s «equipándose» y salen ya con el arma y el equipo de su clase (si hay combate en el refugio, se equipan al momento).
   MÉDICO: cura a los aliados a < 7 m (8 puntos/s, hasta 100) y con él al lado la regeneración natural sube su tope de 60 a 75; los bots médicos acuden al aliado herido de su escuadra.
   Lo estratégico (reparto de capturas, táctica por clase) va en escuadras.js. */
(function () {
const M = MX.M, rnd = Math.random, SQ = MX.SQ;
const CLS = {
  fus: { name: 'Fusilero', tag: 'F', sid: 'F1', col: 0x4aa0ff, role: 'Captura y mantiene puntos. Fusil de asalto a media distancia.', kit: { helmet2: 1, vest2: 1, pack1: 1, revive: 1, medkit: 1 } },
  asa: { name: 'Asalto', tag: 'A', sid: 'E2', col: 0xff7a3a, role: 'Abre el punto a corta distancia. Escopeta y chaleco pesado.', kit: { helmet2: 1, vest3: 1, pack1: 1, revive: 1, medkit: 1 } },
  apo: { name: 'Apoyo', tag: 'P', sid: 'H1', col: 0xffc83a, role: 'Fuego sostenido a larga distancia. Ametralladora y más munición.', kit: { helmet1: 1, vest2: 1, pack2: 1, revive: 1, ammo: 3 } },
  med: { name: 'Médico', tag: 'M', sid: 'S1', col: 0x4ee08a, role: 'Cura a la escuadra (hasta 100) y reanima. Subfusil, 4 botiquines y 3 kits de reanimación.', kit: { helmet2: 1, vest1: 1, pack2: 1, revive: 3, medkit: 4 } },
  fla: { name: 'Flanqueador', tag: 'L', sid: 'S2', col: 0xb07cff, role: 'Rodea por los laterales y caza tiradores. Subfusil .45, ligero.', kit: { helmet1: 1, vest1: 1, pack1: 1, revive: 1, medkit: 1 } },
  fra: { name: 'Francotirador', tag: 'T', sid: 'F2', col: 0xe8f0ff, role: 'Vigila un punto desde lejos. Rifle de precisión.', kit: { helmet1: 1, vest1: 1, pack1: 1, revive: 1, ammo: 2 } }
};
const ORDER = ['fus', 'med', 'asa', 'apo', 'fla', 'fra'], PAD_CLS = ['asa', 'fla', 'fus', 'med', 'apo', 'fra'];     // composición por tamaño de escuadra / orden de las chapas de izquierda a derecha
MX.CLASSES = CLS; MX.classOf = e => CLS[e && e.cls || 'fus'];
const dist = (a, b) => Math.sqrt((a.x - b.x) * (a.x - b.x) + (a.z - b.z) * (a.z - b.z));
const toast = t => { if (SQ.toast) SQ.toast(t); };
let pads = [], grp = null;
const padOf = e => { let best = null, bd = 1e9; for (const q of pads) if (q.team === e.team && q.key === (e.cls || 'fus')) { const d = dist(q, e.p); if (d < bd) { bd = d; best = q; } } return best; };

/* ---------- reparto de clases por escuadra ---------- */
function assign() {
  for (const e of M.ents) e.cls = 'fus';
  for (const s of SQ.list) { const list = ORDER.slice(0, Math.max(1, s.members.length)), pl = s.members.find(m => m.isPlayer); if (pl) { pl.cls = 'fus'; list.splice(list.indexOf('fus'), 1); }
    for (const m of s.members) if (!m.isPlayer) m.cls = list.shift() || 'fus'; }
}
MX.classWeapon = e => {
  if (!MX.campaign || !SQ.list.length) return -1; if (e.isPlayer) return -1;
  return MX.WI[(e.clsWait ? CLS.fus : MX.classOf(e)).sid];
};

/* ---------- chapas del puesto de clases ---------- */
function label(text, col) {
  const c = document.createElement('canvas'); c.width = 256; c.height = 64; const x = c.getContext('2d');
  x.fillStyle = 'rgba(10,14,22,.82)'; x.beginPath(); x.roundRect ? x.roundRect(2, 8, 252, 48, 24) : x.rect(2, 8, 252, 48); x.fill();
  x.fillStyle = '#' + col.toString(16).padStart(6, '0'); x.beginPath(); x.arc(30, 32, 9, 0, 6.3); x.fill();
  x.fillStyle = '#fff'; x.font = '700 26px system-ui,Arial,sans-serif'; x.textBaseline = 'middle'; x.fillText(text.toUpperCase(), 50, 33);
  const t = new THREE.CanvasTexture(c); t.minFilter = THREE.LinearFilter; return t;
}
function build() {
  if (grp) { scene.remove(grp); grp.traverse(o => { if (o.material) { if (o.material.map) o.material.map.dispose(); o.material.dispose(); } }); }
  grp = new THREE.Group(); pads = []; const cp = MAPA.built && MAPA.built.info && MAPA.built.info.classPads; if (!cp) return;
  const GD = build.GD || (build.GD = new THREE.CircleGeometry(.85, 28)), GR = build.GR || (build.GR = new THREE.RingGeometry(.86, 1.0, 36));
  const mats = {}, texs = {}; for (const k in CLS) { mats[k] = [new THREE.MeshBasicMaterial({ color: CLS[k].col, transparent: true, opacity: .28, depthWrite: false }), new THREE.MeshBasicMaterial({ color: CLS[k].col, transparent: true, opacity: .9, depthWrite: false })]; texs[k] = new THREE.SpriteMaterial({ map: label(CLS[k].name, CLS[k].col), transparent: true, depthWrite: false, fog: false }); }
  for (const t of cp) t.pts.forEach(([x, z], i) => {
    const key = PAD_CLS[i], d = new THREE.Mesh(GD, mats[key][0]), r = new THREE.Mesh(GR, mats[key][1]); for (const m of [d, r]) { m.rotation.x = -Math.PI / 2; m.position.set(x, .06, z); m.renderOrder = 2; grp.add(m); }
    const sp = new THREE.Sprite(texs[key]); sp.position.set(x, 2.05, z); sp.scale.set(3.1, .78, 1); grp.add(sp);
    pads.push({ team: t.team, x, z, key, d, r, armed: true, flash: 0 }); });
  scene.add(grp);
}

/* ---------- aplicar clase ---------- */
function applyKit(e) { const c = CLS[e.cls || 'fus']; INVENTARIO.setKit(e, c.kit); }
function equipBot(e) {
  const c = CLS[e.cls || 'fus']; MX.setWeapon(e, MX.WI[c.sid]); applyKit(e); const w = e.clsWait; e.clsWait = null; if (w && w.pad) w.pad.flash = .5; e.goal = null; e.path = null; e.needPath = true;
}
function setPlayerClass(key, pad) {
  const pl = MX.pl; if (!pl || pl.dead) return; pl.cls = key; const c = CLS[key]; applyKit(pl); MX.plWant = MX.WI[c.sid];
  if (pad) pad.flash = .6; toast('Clase: ' + c.name + ' · ' + c.role);
}
const sqOnRespawn = SQ.onRespawn;
function sqOnRespawn2(e) {
  const pad = padOf(e); if (pad && dist(pad, e.p) < 22) { e.clsWait = { t: M.t, x: pad.x, z: pad.z, pad, at: -1, fx: e.yaw }; MX.setWeapon(e, MX.WI.F1); } else { e.clsWait = null; MX.setWeapon(e, MX.WI[MX.classOf(e).sid]); applyKit(e); }
}
SQ.onRespawn = e => {
  sqOnRespawn(e); if (!MX.campaign || !pads.length) return;
  if (e.isPlayer) { applyKit(e); return; }
  const pad = padOf(e); e.clsWait = pad && dist(pad, e.p) < 22 ? { t: M.t, x: pad.x, z: pad.z, pad, at: -1, fx: e.yaw } : null; if (!e.clsWait) applyKit(e);
};
const sqInit = SQ.init;
SQ.init = () => { sqInit(); assign(); build();
  for (const e of M.ents) { e.clsWait = null; if (e.isPlayer) { applyKit(e); continue; } sqOnRespawn2(e); } };   // las apariciones iniciales ocurren antes de SQ.init: se les asigna aquí su chapa

MX.classBias = e => { const k = e.cls; return k === 'fra' ? -60 : k === 'med' ? -40 : k === 'apo' ? -25 : k === 'fla' ? -10 : k === 'fus' ? 6 : 4; };   // quién lidera la escuadra: fusilero o asalto, no el francotirador ni el médico

/* ---------- táctica por clase (cuando la escuadra va a un punto o lo mantiene, sin contacto reciente) ----------
   Apoyo y francotirador: puesto de vigilancia a 38 y 62 m del punto, con cobertura y línea de tiro al centro (se elige una vez por misión). Asalto: entra en el punto el primero y no espera.
   Flanqueador: se desvía 32 m a un lado del eje y entra por el flanco. */
const dm2 = (x, z, a, b) => Math.sqrt((x - a) * (x - a) + (z - b) * (z - b));
function overwatch(e, s, m, range) {
  const key = Math.round(m.x) + ',' + Math.round(m.z); if (e._ow && e._ow.k === key) return e._ow.q;
  const L = s.leader, base = Math.atan2(L.p.x - m.x, L.p.z - m.z); let best = null, bs = -1e9;
  for (let i = 0; i < 16; i++) { const a = base + (i - 7.5) * .2 + ((e.slot || 0) % 3 - 1) * .3, r = range * (.88 + ((i * 7) % 5) * .04), x = m.x + Math.sin(a) * r, z = m.z + Math.cos(a) * r; if (!MX.navAt(x, z)) continue;
    const cp = MX.coverPoint({ p: { x, z } }, m.x, m.z), near = cp && dm2(cp.x, cp.z, x, z) < 5, px = x, pz = z, los = MX.lineFree({ x, z }, { x: m.x, z: m.z });   // se elige un sitio con línea al punto y cobertura a ≤ 5 m (la cobertura la usa su IA al recibir fuego)
    const sc = (los ? 30 : 0) + (near ? 14 : 0) - Math.abs(i - 7.5) * .9 + rnd(); if (sc > bs) { bs = sc; best = { x: px, z: pz }; } }
  e._ow = { k: key, q: best || { x: m.x + Math.sin(base) * range, z: m.z + Math.cos(base) * range } }; return e._ow.q;
}
function flank(e, s, m) {
  const key = Math.round(m.x) + ',' + Math.round(m.z) + ',' + (s.leader === e); if (e._fl && e._fl.k === key) return e._fl.q;
  const L = s.leader, dx = m.x - L.p.x, dz = m.z - L.p.z, d = Math.sqrt(dx * dx + dz * dz) || 1, side = ((e.slot || 0) % 2 ? 1 : -1) * 32;
  let q = { x: L.p.x + dx * .72 + (-dz / d) * side, z: L.p.z + dz * .72 + (dx / d) * side }; if (!MX.navAt(q.x, q.z)) { for (let r = 2; r < 14 && !MX.navAt(q.x, q.z); r += 2) q = { x: q.x + (L.p.x - q.x) * .15, z: q.z + (L.p.z - q.z) * .15 }; }
  e._fl = { k: key, q }; return q;
}
function classGoal(e) {
  const s = e.sqd, c = e.cls; if (!s || s.playerLead || !s.leader || !s.mission || s.mission.x === undefined || (c !== 'apo' && c !== 'fra' && c !== 'asa' && c !== 'fla')) return null;
  if (s.mission.type !== 'attack' && s.mission.type !== 'hold') return null; if (s.contact && M.t - s.contact.t < 8) return null;
  const m = s.mission, L = s.leader, dm = dm2(L.p.x, L.p.z, m.x, m.z), face = Math.atan2(m.x - e.p.x, m.z - e.p.z);
  if (c === 'fra' && dm < 110) { const q = overwatch(e, s, m, 62); return { x: q.x, z: q.z, speed: 5.4, hold: true, face: Math.atan2(m.x - q.x, m.z - q.z), crouch: dm2(e.p.x, e.p.z, q.x, q.z) < 3 }; }
  if (c === 'apo' && dm < 95) { const q = overwatch(e, s, m, 38); return { x: q.x, z: q.z, speed: 5.4, hold: true, face: Math.atan2(m.x - q.x, m.z - q.z), crouch: dm2(e.p.x, e.p.z, q.x, q.z) < 3 }; }
  if (c === 'asa' && s.mission.type === 'attack' && dm < 70) { const a = face + 3.14159 + ((e.slot || 0) % 3 - 1) * .7, r = 3 + ((e.slot || 0) % 2) * 3, q = MX.navAt(m.x + Math.sin(a) * r, m.z + Math.cos(a) * r) ? { x: m.x + Math.sin(a) * r, z: m.z + Math.cos(a) * r } : m; return { x: q.x, z: q.z, speed: 6.4, hold: true, face, crouch: false }; }
  if (c === 'fla' && s.mission.type === 'attack' && dm > 24 && dm < 120) { const q = flank(e, s, m); if (dm2(e.p.x, e.p.z, q.x, q.z) > 6) return { x: q.x, z: q.z, speed: 6, hold: false }; }
  return null;
}

/* ---------- objetivo de los bots: la chapa; el médico, el herido ---------- */
const sqGoal = SQ.goalFor;
SQ.goalFor = e => {
  const w = e.clsWait; if (w && !e.isPlayer) return { x: w.x, z: w.z, speed: 5, hold: true, face: w.fx !== undefined ? w.fx : 0, crouch: false };
  if (e.cls === 'med' && !e.isPlayer && e.sqd && !e.dwn && !(e.vis && e.st === 'fight')) {
    let best = null, bd = 1e9; for (const m of e.sqd.members) { if (m === e || m.dead || m.dwn || m.hp >= 70) continue; const d = dist(m.p, e.p); if (d < 32 && d < bd) { bd = d; best = m; } }
    if (best) { const a = Math.atan2(best.p.x - e.p.x, best.p.z - e.p.z); return { x: best.p.x - Math.sin(a) * 2.4, z: best.p.z - Math.cos(a) * 2.4, speed: 5.8, hold: true, face: a, crouch: false }; }
  }
  const cg = classGoal(e); if (cg) return cg;
  return sqGoal(e);
};

/* ---------- actualización ---------- */
let healT = 0, tpl = 0;
const sqUpdate = SQ.update;
SQ.update = dt => {
  sqUpdate(dt); if (!MX.campaign || !pads.length) return;
  const pl = MX.pl;
  for (const q of pads) {                                                             // jugador: pisar la chapa de su facción cambia la clase
    const d = pl && !pl.dead ? dist(q, P.pos) : 99;
    if (q.team === (pl && pl.team)) { if (d < 1 && q.armed) { q.armed = false; if ((pl.cls || 'fus') !== q.key) setPlayerClass(q.key, q); else { q.flash = .4; toast('Ya eres ' + CLS[q.key].name); } } else if (d > 1.7) q.armed = true; }
    q.flash = Math.max(0, q.flash - dt); const k = 1 + q.flash * .6; q.r.scale.set(k, k, 1); q.d.material.opacity = .28 + q.flash * .5; }
  if (MX.plWant !== undefined && MX.tryEquip(MX.plWant)) MX.plWant = undefined;
  for (let i = 0; i < M.ents.length; i++) { const e = M.ents[i], w = e.clsWait; if (!w) continue;   // bots: camino a la chapa, ~1 s equipándose
    if (e.dead || M.t - w.t > 12 || (e.vis && e.tgt) || e.st === 'fight') { if (e.dead) e.clsWait = null; else equipBot(e); continue; }
    if (dist(w, e.p) < 3.4) { if (w.at < 0) w.at = M.t; if (M.t - w.at > .7) equipBot(e); } }
  healT += dt; if (healT >= .25) { const h = healT; healT = 0; heal(h); }
};
function heal(dt) {                                                                   // aura del médico
  const meds = M.ents.filter(e => e.cls === 'med' && !e.dead && !e.dwn && !e.clsWait); if (!meds.length) return;
  for (const e of M.ents) { if (e.dead || e.dwn) continue; for (const m of meds) { if (m === e || m.team !== e.team || dist(m.p, e.p) > 7) continue; e.medNear = M.t; if (e.hp < 100) { e.hp = Math.min(100, e.hp + 8 * dt); e.tgp.hp = e.hp; e.healT = M.t; } break; } }
}
MX.medicHeal = e => e && e.healT && M.t - e.healT < .6;
})();
