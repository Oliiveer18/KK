"use strict";
/* ===================== ESCUADRAS (campaña): organización realista, mando y órdenes =====================
   Módulo cargado después de partida.js: usa lo que partida.js publica en MX (M, navAt, coverPoint, HOT) y lo global del juego (P, scene, clamp, getPad).
   - Escuadras de tamaño variable (por facción: 5, 6, 5, 4, 3 y 2 = 25), iguales para las 4 facciones. Cada una tiene una MISIÓN que le da el mando de su facción:
     defender el refugio, mantener un objetivo propio, atacar un objetivo común o enemigo, o reconocer (patrulla que evita el combate).
   - Líder: el mejor vivo y en pie (bajas, veteranía y tiempo con vida). Si cae, el siguiente mejor toma el mando. El jugador puede tomar el mando, cederlo
     al mejor de su escuadra, unirse a la escuadra amiga más cercana o ir por libre. Los bots también se reparten: los rezagados se unen a la escuadra más
     cercana y las escuadras muy mermadas se funden con otra.
   - Táctica: viajan en formación con separación real (4–10 m); al acercarse a un objetivo de ataque avanzan por saltos (un equipo cubre, el otro avanza);
     en contacto buscan posición de tiro con cobertura en vez de cargar, se apoyan, hacen fuego de supresión y no persiguen más allá de su escuadra.
     Supresión: las balas que pasan cerca hacen agacharse y empeoran la puntería.
   - Órdenes del jugador cuando lidera (cruceta del mando PS5; teclado 1–8):
       ← toque: SEGUIRME · ↓ toque: MANTENER posición · ↑ toque: AVANZAR al punto al que apuntas · → toque: FUEGO DE COBERTURA hacia donde apuntas (10 s)
       ← mantener: UNIRSE a la escuadra amiga más cercana · → mantener: TOMAR / CEDER el mando · ↓ mantener: IR POR LIBRE · ↑ mantener: REAGRUPAR (a mí, ya)
       Teclado: 1 seguir · 2 mantener · 3 avanzar · 4 cobertura · 5 unirse · 6 tomar/ceder mando · 7 por libre · 8 reagrupar. */
(function () {
const M = MX.M, rnd = Math.random, rr = (a, b) => a + (b - a) * rnd(), navAt = (x, z) => MX.navAt(x, z), coverPoint = (e, x, z) => MX.coverPoint(e, x, z), HOT = MX.HOT;
const SQ = MX.SQ = { list: [], uid: 0, cmdT: [3, 6, 9, 12], balT: 15, toasts: [], marker: null };
const TN = ['Azul', 'Rojo', 'Ámbar', 'Violeta'], SIZES = [5, 6, 5, 4, 3, 2], ROLE0 = ['attack', 'attack', 'hold', 'defend', 'recon', 'recon'];
const KTEAM = [0, 1, 3, 2];                                                         // índice de copia del mapa simétrico (NO, NE, SE, SO) → facción
const MAXS = 8;
/* formación (lateral, atrás) en metros respecto al líder y su rumbo: cuña abierta, nunca en piña */
const FORM = [[-3.5, -3], [3.5, -3], [-6, -7], [6, -7], [0, -9], [-8.5, -11], [8.5, -11], [0, -14]];
const MISSION_N = { defend: 'Defender el refugio', hold: 'Mantener', attack: 'Atacar', recon: 'Reconocimiento', free: 'Por libre' };
const ORDER_N = { follow: 'Seguirme', hold: 'Mantener posición', move: 'Avanzar', cover: 'Fuego de cobertura', regroup: 'Reagrupar' };
const alive = e => e && !e.dead && !e.dwn;
const dist = (a, b) => Math.hypot(a.x - b.x, a.z - b.z);

/* ---------- lugares del mapa: refugio, objetivos propios y comunes (distrito); en mapas sin lugares, los puntos calientes ---------- */
let PL = null;
function places() {
  if (PL) return PL;
  PL = { ref: [], own: [[], [], [], []], shared: [], all: [] };
  for (let t = 0; t < 4; t++) { const s = M.spawn[t] || []; let x = 0, z = 0; for (const q of s) { x += q.x; z += q.z; } PL.ref[t] = s.length ? { x: x / s.length, z: z / s.length } : { x: 0, z: 0 }; }
  const info = MAPA.built && MAPA.built.info && MX.district ? MAPA.built.info : null;
  if (info) {
    for (const p of info.places) {
      if (['PUE', 'FAR', 'TIE', 'CLI', 'GRA'].includes(p.id) && p.fac >= 0) PL.own[KTEAM[p.fac]].push({ x: p.x, z: p.z, name: p.name.split(' · ')[0], id: p.id });
      else if (['FAB', 'EST', 'PLAZA'].includes(p.id)) PL.shared.push({ x: p.id === 'PLAZA' ? -30 : p.x, z: p.id === 'PLAZA' ? -30 : p.z, name: p.name, id: p.id });
    }
  } else for (const h of HOT) PL.shared.push({ x: h[0], z: h[1], name: 'Punto ' + Math.round(h[0]) + ',' + Math.round(h[1]), id: 'HOT' });
  for (const p of PL.shared) PL.all.push(p); for (const L of PL.own) for (const p of L) PL.all.push(p);
  return PL;
}
const navNear = (x, z) => { if (navAt(x, z)) return { x, z }; for (let r = 1; r <= 10; r += 1.5) for (let a = 0; a < 6.28; a += .5) { const px = x + Math.cos(a) * r, pz = z + Math.sin(a) * r; if (navAt(px, pz)) return { x: px, z: pz }; } return { x, z }; };

/* ---------- altas y bajas ---------- */
function mkSquad(team, mission) { const n = SQ.list.filter(s => s.team === team).reduce((a, s) => Math.max(a, s.n), 0) + 1;
  const s = { id: ++SQ.uid, team, n, name: TN[team] + '-' + n, members: [], leader: null, playerLead: false, mission: mission || { type: 'hold' }, order: null, mode: 'travel', contact: null, ap: null, mover: 0, legT: 0, missionT: 0, holdFace: 0, waitT: 0 };
  SQ.list.push(s); return s; }
function join(e, s, silent) {
  const o = e.sqd; if (o === s) return;
  if (o) { o.members = o.members.filter(m => m !== e); if (o.leader === e) o.leader = null;
    if (e.isPlayer) { o.playerLead = false; if (o.mission.type === 'free') { o.mission = { type: 'hold' }; o.baseType = 'hold'; o.missionT = -999; } o.order = null; }
    if (!o.members.length) SQ.list = SQ.list.filter(q => q !== o); else if (e.isPlayer || !o.leader) electLeader(o, true); }
  s.members.push(e); e.sqd = s; e.sq = s.id; e.slot = s.members.length - 1; e.goal = null; e.path = null;
  if (!silent && (s.members.includes(MX.pl) || (o && o.members.includes(MX.pl)))) toast(e.id + (e.isPlayer ? '' : '') + ' se une a ' + s.name);
}
SQ.init = () => {
  SQ.list = []; SQ.uid = 0; PL = null;
  for (let t = 0; t < 4; t++) {
    const ents = M.ents.filter(e => e.team === t); if (!ents.length) continue; let k = 0;
    for (let i = 0; i < SIZES.length && k < ents.length; i++) { const s = mkSquad(t, { type: ROLE0[i] }); for (let j = 0; j < SIZES[i] && k < ents.length; j++) join(ents[k++], s, true); }
    while (k < ents.length) join(ents[k++], SQ.list.filter(s => s.team === t)[0], true);
  }
  for (const e of M.ents) { e.vet = e.isPlayer ? 0 : rr(0, 4); e.lifeStart = 0; e.supp = 0; }
  const ps = MX.pl && MX.pl.sqd; if (ps) { ps.playerLead = true; ps.order = { type: 'follow' }; ps.mission = { type: 'free' }; }
  for (const s of SQ.list) electLeader(s, true);
  objInit();
};

/* ---------- liderazgo: el mejor vivo y en pie ---------- */
const merit = e => e.kills * 6 + (e.vet || 0) * 3 + Math.min(M.t - (e.lifeStart || 0), 600) / 60 - e.deaths * .5;
function electLeader(s, quiet) {
  const pl = MX.pl, prev = s.leader;
  if (s.playerLead && pl && pl.sqd === s && (pl.dead || pl.dwn)) {                   // el jugador líder cae: el mejor vivo toma el mando y la escuadra se queda donde está
    s.playerLead = false; s.order = null; let x = 0, z = 0, n = 0; for (const m of s.members) if (alive(m)) { x += m.p.x; z += m.p.z; n++; }
    s.mission = n ? { type: 'hold', x: x / n, z: z / n, name: 'posición' } : { type: 'hold' }; s.baseType = 'hold'; s.missionT = M.t; }
  let L = null;
  if (s.playerLead) L = pl;
  else { let bs = -1e9; for (const m of s.members) { if (!alive(m) || m.isPlayer) continue; const v = merit(m) + (m === prev ? 2 : 0); if (v > bs) { bs = v; L = m; } } }
  s.leader = L;
  if (!quiet && L && L !== prev && pl && pl.sqd === s) toast(L.isPlayer ? 'Tienes el mando de ' + s.name : L.id + ' toma el mando de ' + s.name);
}

/* ---------- mando de cada facción: misiones (cada ~12 s, escalonado) ---------- */
function strength(s) { return s.members.filter(alive).length; }
function assignMission(s) {
  if (s.playerLead) return;
  const pl = places(), t = s.team, ref = pl.ref[t], m = s.mission, st = strength(s), tot = s.members.length;
  if (m.type !== 'defend' && tot >= 2 && st <= Math.max(1, Math.floor(tot * .4))) { s.mission = { type: 'defend', x: ref.x, z: ref.z, regroup: true }; s.missionT = M.t; return; }   // muy mermada: se repliega a reorganizarse
  if (m.regroup && st >= Math.ceil(tot * .75)) s.mission = { type: s.baseType || 'hold' };                                                                  // reorganizada: vuelve a lo suyo
  if (!s.baseType) s.baseType = m.type;
  const type = s.mission.type;
  if (s.mission.x !== undefined) {                                                   // misión en curso: se cambia al cabo de un rato en el sitio (o si no llega nunca)
    const L = s.leader, there = L && dist(L.p, s.mission) < 15; if (there && !s.mission.arr) s.mission.arr = M.t;
    const stay = type === 'recon' ? 25 : type === 'attack' ? 90 : 240;
    if (!(s.mission.arr ? M.t - s.mission.arr > stay : M.t - s.missionT > 260)) return; }
  let tg = null;
  if (type === 'defend') { const c = { x: ref.x * .9, z: ref.z * .9 }; tg = navNear(c.x, c.z); tg.name = 'refugio'; }                                     // delante del portón
  else if (type === 'hold') { const lost = SQ.objs.filter(o => o.home === t && o.owner !== t).sort((a, b) => dist(a, ref) - dist(b, ref))[0];   // primero, recuperar lo propio perdido
    const own = pl.own[t]; const pue = own.find(p => p.id === 'PUE'); tg = lost || ((s.n % 2 === 1 && pue) ? pue : own[(rnd() * own.length) | 0] || ref); }
  else if (type === 'attack') {                                                      // objetivos comunes que no son nuestros; si los tenemos todos, el puesto avanzado enemigo más cercano
    const ob = SQ.objs.length ? SQ.objs.filter(o => o.shared && o.owner !== t) : pl.shared, alt = SQ.objs.filter(o => o.id === 'PUE' && o.owner !== t);
    const c = (ob.length ? ob : alt.length ? alt : pl.shared).map(p => ({ p, d: dist(p, ref) + rnd() * 120 + (p.id === 'PLAZA' ? 60 : 0) })).sort((a, b) => a.d - b.d); tg = c.length ? c[0].p : ref; }
  else if (type === 'recon') { const c = pl.all.filter(p => dist(p, ref) < 520 && dist(p, ref) > 40); tg = c.length ? c[(rnd() * c.length) | 0] : ref; }
  else tg = ref;
  s.mission = { type, x: tg.x, z: tg.z, name: tg.name || '' }; s.missionT = M.t; s.ap = null;
}
/* reparto profesional: rezagados se unen a la escuadra amiga cercana; escuadras de 1 se funden; las grandes ceden 2 a una muy pequeña */
function rebalance(team) {
  const sqs = SQ.list.filter(s => s.team === team), pl = MX.pl;
  for (const s of sqs) {
    const L = s.leader; if (!L || s.members.length < 2) continue;
    for (const m of s.members.slice()) {
      if (m.isPlayer || !alive(m) || m === L || dist(m.p, L.p) < 110) { m.strayT = 0; continue; }
      m.strayT = (m.strayT || 0) + SQ_BAL;                                       // lleva tiempo lejos de su escuadra (p. ej. tras reaparecer)
      if (m.strayT < 20) continue;
      const near = sqs.filter(q => q !== s && q.leader && q.members.length < MAXS && dist(q.leader.p, m.p) < 35).sort((a, b) => dist(a.leader.p, m.p) - dist(b.leader.p, m.p))[0];
      if (near) { join(m, near); m.strayT = 0; }
    }
  }
  for (const s of sqs) {
    if (s.members.length !== 1 || s.members[0].isPlayer || !SQ.list.includes(s)) continue;
    const m = s.members[0], tgt = sqs.filter(q => q !== s && SQ.list.includes(q) && q.members.length < MAXS).sort((a, b) => dist(a.leader ? a.leader.p : a.members[0].p, m.p) - dist(b.leader ? b.leader.p : b.members[0].p, m.p))[0];
    if (tgt) join(m, tgt);
  }
  const tiny = SQ.list.filter(s => s.team === team && s.members.length === 2 && !s.members.includes(pl) && s.mission.type !== 'recon');
  for (const s of tiny) { const big = SQ.list.filter(q => q.team === team && q.members.length >= 7 && !q.members.includes(pl))[0]; if (big) { for (const m of big.members.filter(x => !x.isPlayer && x !== big.leader).slice(-2)) join(m, s); } }
}
const SQ_BAL = 5;

/* ---------- objetivo de cada miembro (lo pide pickGoal / squadSync de partida.js) ---------- */
function facingOf(s) {
  const L = s.leader; if (!L) return 0;
  if (L.isPlayer) { const sp = Math.hypot(P.vel.x, P.vel.z); return sp > 1.5 ? Math.atan2(P.vel.x, P.vel.z) : P.aim; }
  if (L.goal) return Math.atan2(L.goal.x - L.p.x, L.goal.z - L.p.z); return L.yaw;
}
function slotOf(s, e) { let i = 0; for (const m of s.members) { if (m === e) return i; if (m !== s.leader) i++; } return 0; }
function formPoint(s, e, base, face, spread) {
  const o = FORM[slotOf(s, e) % FORM.length], k = spread || 1, ca = Math.cos(face), sa = Math.sin(face);
  return navNear(base.x + (o[0] * ca + o[1] * sa) * k, base.z + (-o[0] * sa + o[1] * ca) * k);
}
function holdPoint(s, e, c, face) {                                                  // posiciones en arco mirando a `face`, con cobertura cercana si la hay (se recuerda mientras no cambie)
  const key = Math.round(c.x) + ',' + Math.round(c.z) + ',' + Math.round(face * 10) + ',' + s.members.length + ',' + (s.leader === e); if (e._hpK === key) return e._hp;
  const q = holdPoint0(s, e, c, face); e._hpK = key; e._hp = q; return q;
}
function holdPoint0(s, e, c, face) {
  const i = slotOf(s, e) + (e === s.leader ? 0 : 1), n = Math.max(2, s.members.length), a = face + (i / (n - 1) - .5) * 2.2, r = 5 + (i % 2) * 3;
  const p = navNear(c.x + Math.sin(a) * r, c.z + Math.cos(a) * r);
  const cp = coverPoint({ p }, c.x + Math.sin(face) * 30, c.z + Math.cos(face) * 30); if (cp && dist(cp, p) < 5) return cp;
  return p;
}
SQ.goalFor = e => {                                                                  // → { x, z, speed, hold, face } o null (sin escuadra)
  const s = e.sqd; if (!s) return null; const L = s.leader; const pl = MX.pl;
  if (s.contact && M.t - s.contact.t < 10 && e.st !== 'fight') {                       // contacto: posición de apoyo cerca de quien lo ve, mirando a la amenaza
    const c = s.contact, anchor = c.by && alive(c.by) && c.by !== e ? c.by.p : e.p, face = Math.atan2(c.x - anchor.x, c.z - anchor.z);
    const side = (slotOf(s, e) % 2 ? 1 : -1) * (3 + (slotOf(s, e) % 3) * 2), px = anchor.x + Math.cos(face) * side - Math.sin(face) * 2.5, pz = anchor.z - Math.sin(face) * side - Math.cos(face) * 2.5;
    const key = Math.round(px / 2) + ',' + Math.round(pz / 2); let q;
    if (e._cpK === key) q = e._cp; else { q = navNear(px, pz); const cp = coverPoint({ p: q }, c.x, c.z); if (cp && dist(cp, q) < 6) q = cp; e._cpK = key; e._cp = q; }
    return { x: q.x, z: q.z, speed: 4.2, hold: true, face, crouch: true };
  }
  if (s.playerLead && L && L.isPlayer) {                                             // escuadra del jugador: sus órdenes
    const o = s.order || { type: 'follow' };
    if (o.type === 'hold' || o.type === 'cover') { const q = o.pts && o.pts.get(e) || holdPoint(s, e, o, o.face); if (o.pts) o.pts.set(e, q); return { x: q.x, z: q.z, speed: 4.6, hold: true, face: o.face, crouch: true }; }
    if (o.type === 'move') { const q = o.pts.get(e) || holdPoint(s, e, o, o.face); o.pts.set(e, q); return { x: q.x, z: q.z, speed: dist(e.p, q) > 25 ? 5.6 : 4.4, hold: true, face: o.face, crouch: dist(e.p, q) < 3 }; }
    const q = formPoint(s, e, P.pos, facingOf(s), 1); return { x: q.x, z: q.z, speed: o.type === 'regroup' || dist(e.p, P.pos) > 16 ? 6.4 : 4.8, hold: false, face: facingOf(s) };
  }
  if (!L) return null;
  if (e === L) {                                                                     // líder de bots: hacia la misión; espera a los rezagados; salto por equipos al atacar
    const m = s.mission; if (m.x === undefined) return null;
    const fol = s.members.filter(x => x !== L && alive(x) && (!x.isPlayer || dist(x.p, L.p) < 60)), far = fol.filter(x => dist(x.p, L.p) > 24).length;
    if (far > fol.length / 2 && dist(L.p, m) > 15) return { x: L.p.x, z: L.p.z, speed: 0, hold: true, face: L.yaw };                 // reagrupa antes de seguir
    const dm = dist(L.p, m);
    if (dm < 12) { const face = Math.atan2(-m.x, -m.z) + (m.type === 'defend' ? Math.PI : 0); s.holdFace = face; const q = holdPoint(s, e, m, face); return { x: q.x, z: q.z, speed: 3.6, hold: true, face, crouch: true }; }
    if (m.type === 'attack' && dm < 80) return bound(s, e, m);
    return { x: m.x, z: m.z, speed: m.type === 'recon' ? 4.4 : 5, hold: false };
  }
  const m = s.mission;
  if (m && m.x !== undefined && dist(L.p, m) < 12) { const q = holdPoint(s, e, m, s.holdFace); return { x: q.x, z: q.z, speed: 3.6, hold: true, face: s.holdFace, crouch: true }; }
  if (m && m.type === 'attack' && s.ap && dist(L.p, m) < 80) return bound(s, e, m);
  const q = formPoint(s, e, L.goal && !L.isPlayer ? { x: L.p.x, z: L.p.z } : L.p, facingOf(s), m && m.type === 'recon' ? 1.3 : 1);
  return { x: q.x, z: q.z, speed: dist(e.p, q) > 12 ? 6.2 : 5, hold: false, face: facingOf(s) };
};
/* avance por saltos: dos equipos; uno avanza 15 m hasta el punto de avance mientras el otro cubre agachado; luego al revés */
function bound(s, e, m) {
  const L = s.leader, team = e === L ? 0 : slotOf(s, e) % 2 === 0 ? 1 : 0, face = Math.atan2(m.x - L.p.x, m.z - L.p.z);
  if (!s.ap) { s.ap = [navNear(L.p.x, L.p.z), navNear(L.p.x, L.p.z)]; s.mover = 0; s.legT = M.t; }
  const movers = s.members.filter(x => alive(x) && (x === L ? 0 : slotOf(s, x) % 2 === 0 ? 1 : 0) === s.mover);
  const arrived = movers.every(x => dist(x.p, s.ap[s.mover]) < 7) || M.t - s.legT > 14;
  if (arrived) { const o = s.ap[s.mover], d = dist(o, m), k = Math.min(1, 15 / Math.max(d, 1)), nx = s.ap[1 - s.mover]; const base = d > 15 ? o : m;
    s.mover = 1 - s.mover; s.ap[s.mover] = navNear(base.x + (m.x - base.x) * (d > 15 ? k * 2 : 1), base.z + (m.z - base.z) * (d > 15 ? k * 2 : 1)); s.legT = M.t; void nx; }
  const c = s.ap[team], i = slotOf(s, e), side = (i % 2 ? 1 : -1) * (2 + (i >> 1) * 2.5), q = navNear(c.x + Math.cos(face) * side, c.z - Math.sin(face) * side);
  return team === s.mover ? { x: q.x, z: q.z, speed: 4.4, hold: false } : { x: q.x, z: q.z, speed: 3.4, hold: true, face, crouch: true };
}

/* ---------- contacto, apoyo y supresión ---------- */
SQ.contact = (e, seen) => {                                                          // un miembro ve a un enemigo: la escuadra lo sabe (radio de 60 m alrededor del líder)
  const s = e.sqd; if (!s || !seen || !seen.p || seen.team === undefined) return;
  s.contact = { x: seen.p.x, z: seen.p.z, t: M.t, by: e, foe: seen };
};
MX.bulletPass = (b, x0, z0, x1, z1) => {                                             // supresión: balas que pasan a < 2,5 m de alguien de otra facción
  if (!MX.campaign) return; const own = b.own || MX.pl, team = own ? own.team : 0, dx = x1 - x0, dz = z1 - z0, L2 = dx * dx + dz * dz || 1;
  for (const e of M.ents) {
    if (e.dead || e.team === team) continue;
    const ex = e.p.x, ez = e.p.z; if (ex < Math.min(x0, x1) - 3 || ex > Math.max(x0, x1) + 3 || ez < Math.min(z0, z1) - 3 || ez > Math.max(z0, z1) + 3) continue;
    const t = clamp(((ex - x0) * dx + (ez - z0) * dz) / L2, 0, 1), d = Math.hypot(x0 + dx * t - ex, z0 + dz * t - ez);
    if (d < 2.5) { e.supp = Math.min(1, (e.supp || 0) + (2.5 - d) * .16); e.suppT = M.t; if (own && own.p) { e.suppFrom = { x: own.p.x, z: own.p.z }; } }
  }
};

/* ---------- órdenes del jugador ---------- */
function aimPoint(d) { const a = P.aim; return navNear(P.pos.x + Math.sin(a) * d, P.pos.z + Math.cos(a) * d); }
SQ.cmd = (k, long) => {
  const pl = MX.pl; if (!MX.campaign || !pl || pl.dead) return; let s = pl.sqd;
  if (long) {
    if (k === 'join') { const c = SQ.list.filter(q => q.team === pl.team && q !== s && q.leader && alive(q.leader) && dist(q.leader.p, pl.p) < 60).sort((a, b) => dist(a.leader.p, pl.p) - dist(b.leader.p, pl.p))[0];
      if (!c) return toast('No hay ninguna escuadra amiga a menos de 60 m');
      join(pl, c, true); c.playerLead = false; electLeader(c, true); return toast('Te unes a ' + c.name + ' · líder ' + (c.leader ? c.leader.id : '—')); }
    if (k === 'lead') {
      if (!s) return;
      if (s.playerLead) { const best = s.members.filter(m => !m.isPlayer && alive(m)).sort((a, b) => merit(b) - merit(a))[0]; if (!best) return toast('No hay nadie en pie a quien ceder el mando');
        s.playerLead = false; s.order = null; s.mission = { type: 'hold' }; s.baseType = 'hold'; s.missionT = -999; electLeader(s, true); assignMission(s); return toast('Cedes el mando de ' + s.name + ' a ' + best.id); }
      s.playerLead = true; s.order = { type: 'follow' }; s.mission = { type: 'free' }; electLeader(s, true); return toast('Tomas el mando de ' + s.name);
    }
    if (k === 'leave') { if (!s || s.members.length === 1) return toast('Ya vas por libre'); const old = s, ns = mkSquad(pl.team, { type: 'free' }); join(pl, ns, true); ns.playerLead = true; ns.order = { type: 'follow' }; electLeader(ns, true); electLeader(old, true); assignMission(old); return toast('Vas por libre (' + ns.name + ')'); }
    if (k === 'regroup') { if (!s || !s.playerLead) return toast('No tienes el mando (mantén → para tomarlo)'); s.order = { type: 'regroup', t: M.t }; return toast('¡Reagrupad conmigo!'); }
    return;
  }
  if (!s || !s.playerLead) return toast('No tienes el mando de tu escuadra (mantén → para tomarlo)');
  if (k === 'follow') s.order = { type: 'follow' };
  else if (k === 'hold') { const q = { x: P.pos.x, z: P.pos.z }; s.order = { type: 'hold', x: q.x, z: q.z, face: P.aim, pts: new Map() }; }
  else if (k === 'move') { const q = aimPoint(22); s.order = { type: 'move', x: q.x, z: q.z, face: P.aim, pts: new Map() }; }
  else if (k === 'cover') { const q = { x: P.pos.x + Math.sin(P.aim) * 40, z: P.pos.z + Math.cos(P.aim) * 40 }; /* zona a batir: hacia donde apuntas, a 40 m */ s.order = { type: 'cover', x: P.pos.x, z: P.pos.z, face: P.aim, tx: q.x, tz: q.z, t: M.t, prev: s.order && s.order.type !== 'cover' ? s.order : { type: 'follow' }, pts: new Map() }; }
  for (const m of s.members) if (m.bot) { m.goal = null; m.path = null; if (m.st === 'search') m.st = 'push'; }
  toast('Orden: ' + ORDER_N[s.order.type]);
};
SQ.supPoint = e => {                                                                 // a dónde hace fuego de supresión este bot (o null)
  const s = e.sqd; if (!s) return null;
  if (s.order && s.order.type === 'cover' && M.t - s.order.t < 10) return { x: s.order.tx, z: s.order.tz };
  if (s.contact && M.t - s.contact.t < 6 && !e.vis) return { x: s.contact.x, z: s.contact.z };
  return null;
};

/* ---------- actualización ---------- */
let padPrev = [false, false, false, false], padT = [0, 0, 0, 0];
const PADK = [['move', 'regroup'], ['hold', 'leave'], ['follow', 'join'], ['cover', 'lead']];   // ↑ ↓ ← → (botones 12–15): toque / mantener
function padTick(dt) {
  const g = typeof getPad === 'function' ? getPad() : null; if (!g || MX.dpadLock) { padPrev = [false, false, false, false]; return; }
  for (let i = 0; i < 4; i++) { const b = g.buttons[12 + i], d = !!(b && (b.pressed || b.value > .5));
    if (d) { padT[i] += dt; if (padT[i] >= .55 && padT[i] - dt < .55) SQ.cmd(PADK[i][1], true); }
    else if (padPrev[i]) { if (padT[i] < .55) SQ.cmd(PADK[i][0], false); padT[i] = 0; }
    padPrev[i] = d; }
}
addEventListener('keydown', ev => {
  if (ev.repeat || !MX.on || !MX.campaign || (typeof RANGE !== 'undefined' && RANGE.on)) return; const m = /^Digit([1-8])$/.exec(ev.code); if (!m) return;
  const k = +m[1]; if (k <= 4) SQ.cmd(['follow', 'hold', 'move', 'cover'][k - 1], false); else SQ.cmd(['join', 'lead', 'leave', 'regroup'][k - 5], true);
});
SQ.update = dt => {
  if (!MX.campaign || !SQ.list.length) return;
  padTick(dt);
  for (const e of M.ents) { if (e.supp) e.supp = Math.max(0, e.supp - dt * (M.t - (e.suppT || 0) > 1.2 ? .35 : .08)); }
  SQ.eT = (SQ.eT || 0) - dt; if (SQ.eT <= 0) { SQ.eT = .5; for (const s of SQ.list) electLeader(s); }
  for (let t = 0; t < 4; t++) { SQ.cmdT[t] -= dt; if (SQ.cmdT[t] <= 0) { SQ.cmdT[t] = 12; for (const s of SQ.list) if (s.team === t) assignMission(s); } }
  SQ.balT -= dt; if (SQ.balT <= 0) { SQ.balT = SQ_BAL; for (let t = 0; t < 4; t++) rebalance(t); }
  const s = MX.pl && MX.pl.sqd;
  if (s && s.order) { if (s.order.type === 'cover' && M.t - s.order.t > 10) s.order = s.order.prev; if (s.order.type === 'regroup' && M.t - s.order.t > 12) s.order = { type: 'follow' }; }
  if (SQ.objs.length) { SQ.objT = (SQ.objT || 0) - dt; if (SQ.objT <= 0) { objTick(.5 - SQ.objT); SQ.objT = .5; } }
  hudTick(dt);
};
SQ.onDeath = e => { const s = e.sqd; if (s && s.leader === e) electLeader(s); };
SQ.onRespawn = e => { e.lifeStart = M.t; e.supp = 0; };

/* ---------- OBJETIVOS (capa estratégica, distrito): se capturan quedándose dentro sin enemigos; dan suministros y refuerzos ----------
   Propios de cada facción (puesto avanzado, farmacia, tienda, clínica, 2 granjas) empiezan siendo suyos; los comunes (2 Fábricas, 2 Estaciones, Plaza Mayor), de nadie.
   Captura: 20 s con un solo bando dentro (más rápido con más gente, hasta ×1,6); disputado = se congela. Recompensas para quien lo tiene:
   munición, granadas y kit al pasar por él (cada 25 s); cada objetivo común acorta la reaparición de toda la facción (9 s base, −1 s por objetivo común, mín. 4 s);
   con el puesto avanzado propio, la escuadra que opera cerca reaparece allí (si no hay enemigos a 35 m). El mando de cada facción ataca los comunes
   que no son suyos y recupera los propios perdidos. */
const OBJ_R = { PLAZA: 22, FAB: 18, EST: 18 }, CAP_T = 20, TEAM_COL = [0x4aa0ff, 0xff5a48, 0xffb020, 0xb07cff];
SQ.objs = [];
function objInit() {
  SQ.objs = []; const info = MAPA.built && MAPA.built.info && MX.district ? MAPA.built.info : null; if (!info) return;
  for (const p of info.places) {
    const own = ['PUE', 'FAR', 'TIE', 'CLI', 'GRA'].includes(p.id) && p.fac >= 0, shared = ['FAB', 'EST', 'PLAZA'].includes(p.id); if (!own && !shared) continue;
    SQ.objs.push({ id: p.id, name: p.name.split(' · ')[0] + (own ? ' ' + TN[KTEAM[p.fac]] : ''), x: p.x, z: p.z, r: OBJ_R[p.id] || 14, owner: own ? KTEAM[p.fac] : -1, home: own ? KTEAM[p.fac] : -1, shared, cap: 0, capBy: -1, contested: false, ring: null });
  }
}
function objTick(dt) {
  const pl = MX.pl;
  for (const o of SQ.objs) {
    const n = [0, 0, 0, 0]; for (const e of M.ents) if (alive(e) && (e.p.x - o.x) ** 2 + (e.p.z - o.z) ** 2 < o.r * o.r) n[e.team]++;
    const teams = n.map((c, t) => c ? t : -1).filter(t => t >= 0); o.contested = teams.length > 1; o.n = n;
    if (teams.length === 1 && teams[0] !== o.owner) {
      const t = teams[0]; if (o.capBy !== t) { o.capBy = t; o.cap = 0; }
      o.cap += dt / CAP_T * Math.min(1.6, 1 + (n[t] - 1) * .15);
      if (o.cap >= 1) { const prev = o.owner; o.owner = t; o.cap = 0; o.capBy = -1;
        if (pl && t === pl.team) toast('Hemos tomado ' + o.name); else if (pl && prev === pl.team) toast('Hemos perdido ' + o.name + ' (' + TN[t] + ')'); }
    } else if (!teams.length) o.cap = Math.max(0, o.cap - dt / CAP_T * .5);
    /* suministros para los dueños que pasan por él */
    if (o.owner >= 0) for (const e of M.ents) { if (!alive(e) || e.team !== o.owner || (e.p.x - o.x) ** 2 + (e.p.z - o.z) ** 2 > o.r * o.r || M.t - (e.supT || -99) < 25) continue;
      e.supT = M.t; if (e.isPlayer) { if (MX.refill) MX.refill(); e.kits = 1; if (MX.syncKit) MX.syncKit(e); toast('Reabastecido en ' + o.name); } else { e.ammo = e.w.max; e.gCount = Math.min(3, e.gCount + 1); e.kits = 1; } }
  }
}
SQ.respawnTime = e => { if (!SQ.objs.length) return null; const k = SQ.objs.filter(o => o.shared && o.owner === e.team).length; return Math.max(4, 9 - k) + (e.isPlayer ? 0 : rnd() * .8); };
SQ.spawnFor = e => {                                                                 // reaparición adelantada en el puesto avanzado propio
  const pue = SQ.objs.find(o => o.id === 'PUE' && o.owner === e.team && o.home === e.team); if (!pue) return null;
  if (M.ents.some(o => alive(o) && o.team !== e.team && dist(o.p, pue) < 35)) return null;
  const L = e.sqd && e.sqd.leader, ref = places().ref[e.team]; if (!L || L === e || dist(L.p, pue) > dist(L.p, ref)) return null;
  const q = navNear(pue.x + rr(-4, 4), pue.z + rr(-4, 4)); return { x: q.x, z: q.z, yaw: Math.atan2(-q.x, -q.z) };
};
function objHud() {
  for (const o of SQ.objs) {
    if (!o.ring) { o.ring = new THREE.Mesh(new THREE.RingGeometry(o.r - .35, o.r, 64), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: .35, depthWrite: false, side: THREE.DoubleSide })); o.ring.rotation.x = -Math.PI / 2; o.ring.position.set(o.x, .05, o.z); scene.add(o.ring); }
    o.ring.material.color.setHex(o.owner >= 0 ? TEAM_COL[o.owner] : 0xe8e8e8); o.ring.material.opacity = o.contested ? .35 + .25 * Math.sin(M.t * 8) : o.capBy >= 0 && o.cap > 0 ? .55 : .3;
  }
  const pl = MX.pl, here = pl && SQ.objs.find(o => dist(pl.p, o) < o.r);
  return here ? '<div style="margin-top:4px;padding-top:4px;border-top:1px solid #ffffff22">' + here.name + ': ' + (here.contested ? 'DISPUTADO' : here.owner === pl.team ? 'nuestro' : here.capBy === pl.team ? 'capturando ' + Math.round(here.cap * 100) + ' %' : here.owner >= 0 ? 'de ' + TN[here.owner] : 'de nadie') + '</div>' : '';
}
SQ.objHtml = () => { const own = [0, 0, 0, 0]; for (const o of SQ.objs) if (o.owner >= 0) own[o.owner]++; return SQ.objs.length ? '<div style="opacity:.8;margin-top:2px">Objetivos · ' + own.map((c, t) => '<span style="color:#' + TEAM_COL[t].toString(16).padStart(6, '0') + '">' + c + '</span>').join(' · ') + '</div>' : ''; };

/* ---------- HUD: panel de la escuadra (arriba a la izquierda), avisos y marca de la orden ---------- */
const panel = document.createElement('div'); panel.id = 'sqPanel';
panel.style.cssText = 'position:fixed;left:calc(12px + env(safe-area-inset-left));top:calc(100px + env(safe-area-inset-top));z-index:3;pointer-events:none;font:600 12px/1.35 system-ui,-apple-system,Segoe UI,sans-serif;color:#e8eef8;background:#0b0f18b0;border:1px solid #ffffff1c;border-radius:8px;padding:7px 10px;min-width:170px;display:none;text-shadow:0 1px 2px #000';
document.body.appendChild(panel);
const toastEl = document.createElement('div');
toastEl.style.cssText = 'position:fixed;left:50%;top:calc(64px + env(safe-area-inset-top));transform:translateX(-50%);z-index:3;pointer-events:none;font:700 14px system-ui,-apple-system,sans-serif;color:#fff;background:#0b0f18d0;border:1px solid #6dff9a55;border-radius:8px;padding:6px 14px;display:none;text-shadow:0 1px 2px #000';
document.body.appendChild(toastEl);
function toast(t) { SQ.toasts.push({ t, at: M.t }); if (SQ.toasts.length > 3) SQ.toasts.shift(); SQ.lastToast = t; }
SQ.toast = toast;
let hudAcc = 0;
function hudTick(dt) {
  const pl = MX.pl, s = pl && pl.sqd; hudAcc += dt;
  const live = SQ.toasts.filter(q => M.t - q.at < 3.2); SQ.toasts = live;
  toastEl.style.display = live.length ? 'block' : 'none'; if (live.length) toastEl.textContent = live[live.length - 1].t;
  if (!SQ.marker) { SQ.marker = new THREE.Mesh(new THREE.RingGeometry(1.1, 1.35, 32), new THREE.MeshBasicMaterial({ color: 0x6dff9a, transparent: true, opacity: .55, depthWrite: false, side: THREE.DoubleSide })); SQ.marker.rotation.x = -Math.PI / 2; SQ.marker.position.y = .06; scene.add(SQ.marker); }
  const o = s && s.playerLead && s.order; SQ.marker.visible = !!(o && (o.type === 'hold' || o.type === 'move' || o.type === 'cover'));
  if (SQ.marker.visible) { const tx = o.type === 'cover' ? o.tx : o.x, tz = o.type === 'cover' ? o.tz : o.z; SQ.marker.position.x = tx; SQ.marker.position.z = tz; SQ.marker.material.color.setHex(o.type === 'cover' ? 0xff7a3a : o.type === 'move' ? 0x4aa0ff : 0x6dff9a); }
  if (hudAcc < .25) return; hudAcc = 0;
  if (!s || !MX.on) { panel.style.display = 'none'; return; }
  panel.style.display = 'block';
  const L = s.leader, what = s.playerLead ? 'Orden: ' + ORDER_N[(s.order || { type: 'follow' }).type] : 'Misión: ' + (MISSION_N[s.mission.type] || '') + (s.mission.name ? ' · ' + s.mission.name : '');
  const rows = s.members.map(m => { const st = m.dead ? '✝' : m.dwn ? '⚠' : ''; const hp = m.dead ? 0 : Math.round(m.hp); const lead = m === L ? '★ ' : '';
    return '<div style="display:flex;gap:6px;align-items:center;opacity:' + (m.dead ? .45 : 1) + '"><span style="width:44px">' + lead + (m.isPlayer ? 'Tú' : m.id) + '</span><span style="flex:1;height:4px;background:#ffffff22;border-radius:2px;overflow:hidden"><span style="display:block;height:100%;width:' + hp + '%;background:' + (m.dwn ? '#ffb020' : hp < 40 ? '#ff6a4a' : '#6dff9a') + '"></span></span><span>' + st + '</span></div>'; }).join('');
  panel.innerHTML = SQ.objHtml() + '<div style="font-weight:800;letter-spacing:.04em">' + s.name.toUpperCase() + ' · ' + s.members.length + '</div><div style="opacity:.85">Líder: ' + (L ? (L.isPlayer ? 'tú' : L.id) : '—') + '</div><div style="opacity:.85;margin-bottom:4px">' + what + '</div>' + rows + objHud();
}
})();
