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
  for (const s of SQ.list) { const kd = MX.KINDS && MX.KINDS[s.kind], list = (kd ? kd.cls : ORDER).slice(0, Math.max(1, s.members.length)), pl = s.members.find(m => m.isPlayer);
    if (pl) { pl.cls = 'fus'; const i = list.indexOf('fus'); if (i >= 0) list.splice(i, 1); else list.pop(); }
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
  const mats = {}, texs = {}; for (const k in CLS) { mats[k] = [new THREE.MeshBasicMaterial({ color: CLS[k].col, transparent: true, opacity: .28, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 }), new THREE.MeshBasicMaterial({ color: CLS[k].col, transparent: true, opacity: .9, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -3, polygonOffsetUnits: -3 })]; texs[k] = new THREE.SpriteMaterial({ map: label(CLS[k].name, CLS[k].col), transparent: true, depthWrite: false, fog: false }); }
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
  const key = Math.round(m.x) + ',' + Math.round(m.z) + ',' + s.mission.type; if (e._ow && e._ow.k === key) return e._ow.q;
  /* defensa en capas: manteniendo un punto, los de largo alcance se colocan hacia donde viene la amenaza (último contacto o el centro del mapa), no hacia su propio lado */
  const L = s.leader, lf = SQ.lastFoe && SQ.lastFoe[s.team], hold = s.mission.type === 'hold', base = hold ? (lf && M.t - lf.t < 150 && dm2(lf.x, lf.z, m.x, m.z) < 160 ? Math.atan2(lf.x - m.x, lf.z - m.z) : Math.atan2(-m.x, -m.z)) : Math.atan2(L.p.x - m.x, L.p.z - m.z); let best = null, bs = -1e9;
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
MX.classGoal = classGoal;
/* ROLES DE MANIOBRA del escuadrón: fix (apoyo: todos vigilan a 38–62 m del punto), flank (pinza: rodea por un lado y entra cuando la pareja está a < 60 m del punto, o a los 35 s) */
function flankPoint(s, m) {
  if (s._fp && s._fp.k === Math.round(m.x) + ',' + Math.round(m.z)) return s._fp.q; const L = s.leader, dx = m.x - L.p.x, dz = m.z - L.p.z, d = Math.sqrt(dx * dx + dz * dz) || 1, side = (s.id % 2 ? 1 : -1) * 40;
  let q = { x: m.x - dz / d * side - dx / d * 25, z: m.z + dx / d * side - dz / d * 25 }; if (!MX.navAt(q.x, q.z)) { for (let r = 3; r < 30 && !MX.navAt(q.x, q.z); r += 3) q = { x: q.x + (m.x - q.x) * .1, z: q.z + (m.z - q.z) * .1 }; }
  s._fp = { k: Math.round(m.x) + ',' + Math.round(m.z), q, t: M.t, ph: 'go' }; return q;
}
function roleGoal(e) {
  const s = e.sqd; if (!s || s.playerLead || !s.leader || !s.mission || s.mission.x === undefined || !s.mission.role) return null; const m = s.mission, L = s.leader;
  if (m.role === 'fix') { if (dm2(L.p.x, L.p.z, m.x, m.z) > 130) return null; const rg = e.cls === 'fra' ? 62 : e.cls === 'apo' ? 42 : 36, q = overwatch(e, s, m, rg); return { x: q.x, z: q.z, speed: 5.6, hold: true, face: Math.atan2(m.x - q.x, m.z - q.z), crouch: dm2(e.p.x, e.p.z, q.x, q.z) < 3 }; }
  if (m.role === 'flank' && e === L) { const q = flankPoint(s, m), f = s._fp; if (s.contact && M.t - s.contact.t < 6) return null;
    if (f.ph === 'go' && dm2(L.p.x, L.p.z, q.x, q.z) < 10) { f.ph = 'wait'; f.t = M.t; }
    if (f.ph === 'wait') { const pq = SQ.list.find(z => z.id === m.partner), pl = pq && pq.leader, near = !pl || dm2(pl.p.x, pl.p.z, m.x, m.z) < 60; if (near || M.t - f.t > 35) f.ph = 'strike'; }
    if (f.ph === 'go') return { x: q.x, z: q.z, speed: 6.2, hold: false };
    if (f.ph === 'wait') return { x: q.x, z: q.z, speed: 3, hold: true, face: Math.atan2(m.x - q.x, m.z - q.z), crouch: true }; }
  return null;
}
function classGoal(e) {
  const rgl = roleGoal(e); if (rgl) return rgl; if (e.sqd && e.sqd.mission && e.sqd.mission.role === 'flank') return null;
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

/* ---------- indicador sobre los compañeros de tu escuadra: chip con la inicial de la clase (color de la clase), número, estrella si lidera y barra de vida fina.
   Ámbar y ⚠ si están abatidos; ✚ verde mientras un médico los cura. Se oculta a > 70 m, detrás de la cámara y en cuanto mueren. ---------- */
{ const st = document.createElement('style'); st.textContent = `
#sqTags{position:fixed;inset:0;pointer-events:none;z-index:6;overflow:hidden}
#sqTags .t{position:absolute;left:0;top:0;display:flex;flex-direction:column;align-items:center;gap:2px;will-change:transform;transition:opacity .15s}
#sqTags .c{display:flex;align-items:center;gap:4px;padding:2px 7px 2px 3px;border-radius:999px;background:rgba(9,13,20,.78);border:1px solid rgba(255,255,255,.16);font:700 10.5px system-ui,-apple-system,sans-serif;color:#fff;letter-spacing:.03em;box-shadow:0 2px 6px rgba(0,0,0,.45)}
#sqTags .c b{display:flex;align-items:center;justify-content:center;width:15px;height:15px;border-radius:50%;font-size:9.5px;color:#0b0f18;font-weight:800}
#sqTags .h{width:30px;height:3px;border-radius:2px;background:rgba(0,0,0,.55);overflow:hidden}#sqTags .h i{display:block;height:100%;transition:width .2s}
#sqTags .t.dn .c{border-color:#ffb020;color:#ffb020}#sqTags .t.hl .c{border-color:#4ee08a}#sqTags .t.hl .c u{color:#4ee08a}#sqTags u{text-decoration:none;font-size:10px}`; document.head.appendChild(st); }
const tagBox = document.createElement('div'); tagBox.id = 'sqTags'; document.body.appendChild(tagBox);
const tags = new Map(), _tv = new THREE.Vector3();
function tagFor(e) {
  let t = tags.get(e); if (t) return t; const c = CLS[e.cls || 'fus'], el = document.createElement('div'); el.className = 't';
  el.innerHTML = '<div class="c"><b style="background:#' + c.col.toString(16).padStart(6, '0') + '">' + c.tag + '</b><span></span><u></u></div><div class="h"><i></i></div>';
  tagBox.appendChild(el); t = { el, span: el.querySelector('span'), u: el.querySelector('u'), bar: el.querySelector('.h i'), cls: e.cls, last: '' }; tags.set(e, t); return t;
}
const placeBars = MX.placeBars;
MX.placeBars = function () {
  placeBars.apply(this, arguments);
  const pl = MX.pl, s = MX.campaign && MX.on && pl && pl.sqd; const live = new Set();
  if (s) for (const m of s.members) {
    if (m.isPlayer || m.dead) continue; const t = tagFor(m); live.add(m);
    _tv.set(m.p.x, m.p.y + 2.45, m.p.z).project(camera); const d = dist(m.p, P.pos);
    if (_tv.z > 1 || d > 70 || (m.clsWait && d > 40)) { t.el.style.opacity = 0; continue; }
    const k = Math.max(.7, Math.min(1.05, 1.15 - d / 90)), x = (_tv.x * .5 + .5) * innerWidth, y = (-_tv.y * .5 + .5) * innerHeight;
    t.el.style.opacity = d < 55 ? 1 : (70 - d) / 15; t.el.style.transform = 'translate(' + (x - 28).toFixed(1) + 'px,' + (y - 26).toFixed(1) + 'px) scale(' + k.toFixed(2) + ')';
    const num = String(m.id).replace(/^\D+/, ''), txt = (s.leader === m ? '★' : '') + num, dn = !!m.dwn, hl = MX.medicHeal(m), key = txt + '|' + (m.cls || '') + '|' + dn + '|' + hl;
    if (key !== t.last) { t.last = key; t.span.textContent = txt; t.u.textContent = dn ? '⚠' : hl ? '✚' : ''; t.el.className = 't' + (dn ? ' dn' : hl ? ' hl' : ''); }
    t.bar.style.width = Math.max(0, Math.min(100, m.hp)) + '%'; t.bar.style.background = dn ? '#ffb020' : m.hp < 40 ? '#ff6a4a' : '#6dff9a';
    if (t.cls !== m.cls) { t.cls = m.cls; const c = CLS[m.cls || 'fus']; t.el.querySelector('b').style.background = '#' + c.col.toString(16).padStart(6, '0'); t.el.querySelector('b').textContent = c.tag; } }
  for (const [e, t] of tags) if (!live.has(e)) { t.el.remove(); tags.delete(e); }
};
})();
