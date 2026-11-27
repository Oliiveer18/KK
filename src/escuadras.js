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
  for (let i_e = 0; i_e < M.ents.length; i_e++) { const e = M.ents[i_e]; e.vet = e.isPlayer ? 0 : rr(0, 4); e.lifeStart = 0; e.supp = 0; }
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
  else { let bs = -1e9; for (let i_m = 0; i_m < s.members.length; i_m++) { const m = s.members[i_m]; if (!alive(m) || m.isPlayer) continue; const v = merit(m) + (m === prev ? 2 : 0); if (v > bs) { bs = v; L = m; } } }
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
  if (type === 'defend') { const rf = refugeOf(t); tg = rf ? { x: rf.x, z: rf.z } : navNear(ref.x * .9, ref.z * .9); tg.name = 'refugio'; }                 // el refugio: sus defensores ocupan los puestos junto al muro bajo
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
function slotOf(s, e) { let i = 0; for (let i_m = 0; i_m < s.members.length; i_m++) { const m = s.members[i_m]; if (m === e) return i; if (m !== s.leader) i++; } return 0; }
function formPoint(s, e, base, face, spread) {
  const o = FORM[slotOf(s, e) % FORM.length], k = spread || 1, ca = Math.cos(face), sa = Math.sin(face);
  return navNear(base.x + (o[0] * ca + o[1] * sa) * k, base.z + (-o[0] * sa + o[1] * ca) * k);
}
function holdPoint(s, e, c, face) {                                                  // posiciones en arco mirando a `face`, con cobertura cercana si la hay (se recuerda mientras no cambie)
  const key = Math.round(c.x) + ',' + Math.round(c.z) + ',' + Math.round(face * 10) + ',' + s.members.length + ',' + (s.leader === e); if (e._hpK === key) return e._hp;
  const q = holdPoint0(s, e, c, face); e._hpK = key; e._hp = q; return q;
}
function holdPoint0(s, e, c, face) {
  const ob = SQ.objs.find(o => Math.hypot(o.x - c.x, o.z - c.z) < 3);
  if (ob) {                                                                          // punto de dominio: todos DENTRO de la zona, repartidos en círculo, cada uno vigilando su sector
    const i = slotOf(s, e) + (e === s.leader ? 0 : 1), n = Math.max(1, s.members.length), a = face + i / n * Math.PI * 2, r = ob.r * (i % 2 ? .45 : .7);
    let p = navNear(c.x + Math.sin(a) * r, c.z + Math.cos(a) * r); const cp = coverPoint({ p }, c.x + Math.sin(a) * 30, c.z + Math.cos(a) * 30);
    if (cp && dist(cp, p) < 3 && dist(cp, ob) < ob.r - 1) p = cp; if (dist(p, ob) > ob.r - 1) p = navNear(c.x + Math.sin(a) * ob.r * .4, c.z + Math.cos(a) * ob.r * .4);
    e._hpFace = a; return p;
  }
  e._hpFace = undefined;
  const i = slotOf(s, e) + (e === s.leader ? 0 : 1), n = Math.max(2, s.members.length), a = face + (i / (n - 1) - .5) * 2.2, r = 5 + (i % 2) * 3;
  const p = navNear(c.x + Math.sin(a) * r, c.z + Math.cos(a) * r);
  const cp = coverPoint({ p }, c.x + Math.sin(face) * 30, c.z + Math.cos(face) * 30); if (cp && dist(cp, p) < 5) return cp;
  return p;
}
const refugeOf = t => { const r = MAPA.built && MAPA.built.info && MAPA.built.info.refugeRects; return r ? r.find(q => q.fac === t) : null; };
const defensePts = t => { const d = MAPA.built && MAPA.built.info && MAPA.built.info.defense; const q = d && d.find(x => x.team === t); return q ? q.pts : null; };
SQ.goalFor = e => {                                                                  // → { x, z, speed, hold, face } o null (sin escuadra)
  const s = e.sqd; if (!s) return null; const L = s.leader; const pl = MX.pl;
  if (!s.playerLead && s.mission.type === 'defend' && L && s.mission.x !== undefined && dist(L.p, s.mission) < 32 && !(s.contact && M.t - s.contact.t < 10 && e.st !== 'fight' && dist(e.p, s.mission) > 20)) {
    const dp = defensePts(s.team);                                                     // defensa del refugio: cada uno a su puesto pegado al muro bajo, agachado y mirando fuera
    if (dp) { const i = (e === L ? 0 : slotOf(s, e) + 1) % dp.length, q = dp[i]; return { x: q[0], z: q[1], speed: dist(e.p, { x: q[0], z: q[1] }) > 10 ? 5 : 3.2, hold: true, face: q[2], crouch: false }; }
  }
  if (s.contact && s.contact.foe && s.contact.foe.dead) s.contact = null;
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
    if (dm < 12) { const face = Math.atan2(-m.x, -m.z) + (m.type === 'defend' ? Math.PI : 0); s.holdFace = face; const q = holdPoint(s, e, m, face); return { x: q.x, z: q.z, speed: 3.6, hold: true, face: e._hpFace !== undefined ? e._hpFace : face, crouch: true }; }
    if (m.type === 'attack' && dm < 80) return bound(s, e, m);
    return { x: m.x, z: m.z, speed: m.type === 'recon' ? 4.4 : 5, hold: false };
  }
  const m = s.mission;
  if (m && m.x !== undefined && dist(L.p, m) < 12) { const q = holdPoint(s, e, m, s.holdFace); return { x: q.x, z: q.z, speed: 3.6, hold: true, face: e._hpFace !== undefined ? e._hpFace : s.holdFace, crouch: true }; }
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
  for (let i_e = 0; i_e < M.ents.length; i_e++) { const e = M.ents[i_e];
    if (e.dead || e.team === team) continue;
    const ex = e.p.x, ez = e.p.z; if (ex < Math.min(x0, x1) - 3 || ex > Math.max(x0, x1) + 3 || ez < Math.min(z0, z1) - 3 || ez > Math.max(z0, z1) + 3) continue;
    const t = clamp(((ex - x0) * dx + (ez - z0) * dz) / L2, 0, 1), d = Math.hypot(x0 + dx * t - ex, z0 + dz * t - ez);
    if (d < 2.5) { if (MX.combat) MX.combat('hit', e.p.x, e.p.z, team, e.team); e.supp = Math.min(1, (e.supp || 0) + (2.5 - d) * .16); e.suppT = M.t; if (own && own.p) { e.suppFrom = { x: own.p.x, z: own.p.z }; } }
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
  if (s.contact && s.contact.foe && s.contact.foe.dead) s.contact = null;          // el enemigo ha caído: se deja de batir la zona
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
  for (let i_e = 0; i_e < M.ents.length; i_e++) { const e = M.ents[i_e]; if (e.supp) e.supp = Math.max(0, e.supp - dt * (M.t - (e.suppT || 0) > 1.2 ? .35 : .08)); }
  SQ.eT = (SQ.eT || 0) - dt; if (SQ.eT <= 0) { SQ.eT = .5; for (const s of SQ.list) electLeader(s); }
  for (let t = 0; t < 4; t++) { SQ.cmdT[t] -= dt; if (SQ.cmdT[t] <= 0) { SQ.cmdT[t] = 12; for (const s of SQ.list) if (s.team === t) assignMission(s); } }
  SQ.balT -= dt; if (SQ.balT <= 0) { SQ.balT = SQ_BAL; for (let t = 0; t < 4; t++) rebalance(t); }
  const s = MX.pl && MX.pl.sqd;
  if (s && s.order) { if (s.order.type === 'cover' && M.t - s.order.t > 10) s.order = s.order.prev; if (s.order.type === 'regroup' && M.t - s.order.t > 12) s.order = { type: 'follow' }; }
  SQ.mapTick(); miniTick(dt);
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
const OBJ_R = { PLAZA: 12, FAB: 12, EST: 12, REF: 12 }, CAP_N = 10, CAP_C = 10, TEAM_COL = [0x4aa0ff, 0xff5a48, 0xffb020, 0xb07cff];
/* DOMINIO: cada punto se toma quedándose dentro, como en los juegos de dominio. Si es enemigo, primero se NEUTRALIZA (10 s, pasa a gris) y después se
   CAPTURA (10 s, pasa a tu color). Más compañeros dentro aceleran (hasta ×1,6). Con enemigos vivos dentro: DISPUTADO (se congela). Si sales, lo avanzado
   baja poco a poco (y deprisa si los dueños vuelven a pisarlo). Cada 5 s cada facción suma 1 punto por punto propio y 2 por punto común: la primera en
   llegar a la META gana la partida. Zonas de 8 m (12 m la Plaza, las Fábricas y las Estaciones); los comunes llevan letra (A–E). */
const META = 1000, TICK = 5, CODES = { PLAZA: ['A'], FAB: ['B', 'C'], EST: ['D', 'E'] };
SQ.objs = []; SQ.score = [0, 0, 0, 0]; SQ.meta = META; SQ.scoreT = 0; SQ.winner = -1;
function objInit() {
  SQ.objs = []; SQ.score = [0, 0, 0, 0]; SQ.scoreT = 0; SQ.winner = -1; const info = MAPA.built && MAPA.built.info && MX.district ? MAPA.built.info : null; if (!info) return;
  const used = {};
  for (const p of info.places) {
    const own = p.id === 'PUE' && p.fac >= 0,   /* 13 puntos: 4 refugios, 4 puestos avanzados y 5 comunes (farmacia, tienda, clínica y granjas quedan como lugares con botín) */ shared = ['FAB', 'EST', 'PLAZA'].includes(p.id); if (!own && !shared) continue;
    const code = shared ? CODES[p.id][used[p.id] = (used[p.id] || 0) + 1, used[p.id] - 1] || p.id[0] : '';
    SQ.objs.push({ id: p.id, code, name: (code ? code + ' · ' : '') + p.name.split(' · ')[0].replace(/\s*\(.*?\)/g, '') + (own ? ' ' + TN[KTEAM[p.fac]] : ''), x: p.x, z: p.z, r: OBJ_R[p.id] || 8, owner: -1, home: own ? KTEAM[p.fac] : -1, shared, cap: 0, capBy: -1, contested: false, ring: null, n: [0, 0, 0, 0] });
  }
  /* el refugio de cada facción también se domina: es lo ÚNICO que cada una tiene al empezar (todo lo demás empieza neutral) y vale 2 puntos */
  for (const q of info.refugeRects || []) SQ.objs.push({ id: 'REF', code: '', name: 'Refugio ' + TN[q.fac], x: q.x, z: q.z, r: OBJ_R.REF, owner: q.fac, home: q.fac, shared: false, refuge: true, cap: 0, capBy: -1, contested: false, ring: null, n: [0, 0, 0, 0] });
}
SQ.objState = o => o.contested ? 'DISPUTADO' : o.capBy >= 0 && o.cap > 0 ? (o.owner >= 0 ? 'Neutralizando' : 'Capturando') : o.owner >= 0 ? 'de ' + TN[o.owner] : 'Neutral';
function objTick(dt) {
  const pl = MX.pl; if (SQ.winner >= 0) return;
  for (const o of SQ.objs) {
    const n = [0, 0, 0, 0]; for (const e of M.ents) if (alive(e) && (e.p.x - o.x) ** 2 + (e.p.z - o.z) ** 2 < o.r * o.r) n[e.team]++;
    const teams = n.map((c, t) => c ? t : -1).filter(t => t >= 0); o.contested = teams.length > 1; o.n = n;
    if (o.contested) continue;                                                       // disputado: congelado
    const t = teams.length ? teams[0] : -1;
    if (t >= 0 && t !== o.owner) {                                                   // atacantes solos dentro
      if (o.capBy !== t) { if (o.cap > 0 && o.capBy >= 0) { o.cap = Math.max(0, o.cap - dt / CAP_N * 2); continue; } o.capBy = t; o.cap = 0; }   // otro bando a medias: primero lo deshace
      o.cap += dt / (o.owner >= 0 ? CAP_N : CAP_C) * Math.min(1.6, 1 + (n[t] - 1) * .15);
      if (o.cap >= 1) {
        const prev = o.owner; o.cap = 0;
        if (prev >= 0) { o.owner = -1; o.capBy = t;                                  // neutralizado: sigue la captura sin soltar
          if (pl && t === pl.team) { toast('Neutralizado ' + o.name); beep('neu'); } else if (pl && prev === pl.team) { toast('Nos han neutralizado ' + o.name); beep('lost'); } }
        else { o.owner = t; o.capBy = -1;
          if (pl && t === pl.team) { toast('Capturado ' + o.name); beep('cap'); } else if (pl && dist(pl.p, o) < 120) toast(TN[t] + ' captura ' + o.name); }
      } else if (pl && t !== pl.team && o.owner === pl.team && (!o.warnT || M.t - o.warnT > 20)) { o.warnT = M.t; toast('¡Están tomando ' + o.name + '!'); beep('warn'); }
    } else if (t === o.owner && t >= 0) o.cap = Math.max(0, o.cap - dt / CAP_N * 1.5);   // los dueños lo pisan: deshacen lo avanzado
    else if (t < 0) { o.cap = Math.max(0, o.cap - dt / (CAP_N * 4)); if (o.cap <= 0) o.capBy = -1; }   // vacío: lo avanzado baja poco a poco
    /* suministros para los dueños que pasan por él */
    if (o.owner >= 0) for (let i_e = 0; i_e < M.ents.length; i_e++) { const e = M.ents[i_e]; if (!alive(e) || e.team !== o.owner || (e.p.x - o.x) ** 2 + (e.p.z - o.z) ** 2 > o.r * o.r || M.t - (e.supT || -99) < 25) continue;
      e.supT = M.t; if (e.isPlayer) { if (MX.refill) MX.refill(); e.kits = 1; if (MX.syncKit) MX.syncKit(e); toast('Reabastecido en ' + o.name); } else { e.ammo = e.w.max; e.gCount = Math.min(3, e.gCount + 1); e.kits = 1; } }
  }
  /* puntuación de dominio */
  SQ.scoreT += dt; while (SQ.scoreT >= TICK) { SQ.scoreT -= TICK; for (const o of SQ.objs) if (o.owner >= 0) SQ.score[o.owner] += o.shared || o.refuge ? 2 : 1; }
  const w = SQ.score.findIndex(v => v >= META); if (w >= 0) endCampaign(w);
}
/* tonos cortos sintetizados para el dominio (sin muestras): capturado, neutralizado, aviso, perdido */
function beep(k) {
  try { const a = typeof ac !== 'undefined' && ac, bus = typeof mixBus !== 'undefined' && mixBus; if (!a || !bus) return; const t0 = a.currentTime;
    const seq = { cap: [[660, 0], [880, .09], [1320, .18]], neu: [[520, 0], [700, .1]], warn: [[440, 0], [440, .16]], lost: [[520, 0], [390, .12], [300, .24]] }[k] || [];
    for (const [f, d] of seq) { const o = a.createOscillator(), g = a.createGain(); o.type = 'triangle'; o.frequency.value = f; g.gain.setValueAtTime(0, t0 + d); g.gain.linearRampToValueAtTime(.12, t0 + d + .012); g.gain.exponentialRampToValueAtTime(.001, t0 + d + .16); o.connect(g); g.connect(bus); o.start(t0 + d); o.stop(t0 + d + .18); }
  } catch (e) { }
}
SQ.beep = beep;
/* fin de partida: gana la primera facción en llegar a la meta */
const endEl = document.createElement('div'); endEl.id = 'domEnd'; endEl.style.cssText = 'position:fixed;inset:0;z-index:7;display:none;align-items:center;justify-content:center;background:#0c1018d9;font:600 14px system-ui,-apple-system,sans-serif;color:#e8eef8;padding:16px';
document.body.appendChild(endEl);
function endCampaign(w) {
  if (SQ.winner >= 0) return; SQ.winner = w; M.over = true; M.endT = 0; const pl = MX.pl, mine = pl && w === pl.team, hex = t => '#' + TEAM_COL[t].toString(16).padStart(6, '0');
  const order = [0, 1, 2, 3].sort((a, b) => SQ.score[b] - SQ.score[a]);
  const best = M.ents.filter(e => pl && e.team === pl.team).sort((a, b) => b.kills - a.kills).slice(0, 5);
  endEl.innerHTML = '<div style="background:#151b28;border:1px solid #2b3650;border-radius:14px;padding:18px 26px;text-align:center;max-width:min(520px,92vw)"><div style="font-size:26px;font-weight:800;color:' + hex(w) + '">' + (mine ? 'VICTORIA' : 'DERROTA') + '</div>' +
    '<div style="opacity:.75;margin:2px 0 12px">' + (mine ? 'Tu facción domina el distrito' : 'Gana ' + TN[w]) + '</div>' +
    '<div style="display:flex;gap:14px;justify-content:center;font-variant-numeric:tabular-nums;margin-bottom:12px">' + order.map(t => '<div style="color:' + hex(t) + '"><div style="font-size:12px;opacity:.8">' + TN[t].toUpperCase() + '</div><div style="font-size:20px;font-weight:800">' + SQ.score[t] + '</div></div>').join('') + '</div>' +
    '<div style="font-size:12px;opacity:.7;margin-bottom:4px">Mejores de tu facción (bajas)</div><div style="font-size:13px">' + best.map(e => (e.isPlayer ? '<b style="color:#ffd24a">TÚ</b>' : e.id) + ' ' + e.kills).join(' · ') + '</div>' +
    '<button id="domRe" style="margin-top:16px;font-size:15px;padding:10px 26px;border-radius:8px;border:0;background:#ff9440;color:#111;font-weight:700;cursor:pointer">JUGAR OTRA VEZ</button></div>';
  endEl.style.display = 'flex'; const re = () => location.reload(); document.getElementById('domRe').addEventListener('click', re); document.getElementById('domRe').addEventListener('touchstart', e => { e.preventDefault(); re(); });
  beep(mine ? 'cap' : 'lost');
}
SQ.endCampaign = endCampaign;
SQ.respawnTime = e => { if (!SQ.objs.length) return null; const k = SQ.objs.filter(o => o.shared && o.owner === e.team).length; return Math.max(4, 9 - k) + (e.isPlayer ? 0 : rnd() * .8); };
SQ.spawnFor = e => {                                                                 // reaparición adelantada en el puesto avanzado propio
  const rf = SQ.objs.find(o => o.refuge && o.home === e.team);
  if (rf && rf.owner !== e.team) {                                                   // nos han quitado el refugio: se reaparece en el punto propio más cercano a él que esté a salvo
    const ok = SQ.objs.filter(o => o.owner === e.team && !M.ents.some(q => alive(q) && q.team !== e.team && dist(q.p, o) < 35)).sort((a, b) => dist(a, rf) - dist(b, rf))[0];
    if (ok) { const q = navNear(ok.x + rr(-4, 4), ok.z + rr(-4, 4)); return { x: q.x, z: q.z, yaw: Math.atan2(-q.x, -q.z) }; }
    return null; }
  const pue = SQ.objs.find(o => o.id === 'PUE' && o.owner === e.team && o.home === e.team); if (!pue) return null;
  if (M.ents.some(o => alive(o) && o.team !== e.team && dist(o.p, pue) < 35)) return null;
  const L = e.sqd && e.sqd.leader, ref = places().ref[e.team]; if (!L || L === e || dist(L.p, pue) > dist(L.p, ref)) return null;
  const q = navNear(pue.x + rr(-4, 4), pue.z + rr(-4, 4)); return { x: q.x, z: q.z, yaw: Math.atan2(-q.x, -q.z) };
};
function objHud() {
  for (const o of SQ.objs) {
    if (!o.ring) { o.ring = new THREE.Mesh(new THREE.RingGeometry(o.r - .3, o.r, 64), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: .35, depthWrite: false, side: THREE.DoubleSide })); o.ring.rotation.x = -Math.PI / 2; o.ring.position.set(o.x, .05, o.z); scene.add(o.ring);
      /* mástil con banderola del color del dueño en el centro */
      const g = new THREE.Group(); g.position.set(o.x, 0, o.z); const pole = new THREE.Mesh(new THREE.CylinderGeometry(.05, .06, 4.2, 6), new THREE.MeshStandardMaterial({ color: 0x9aa3ad, metalness: .6, roughness: .4 }));
      pole.position.y = 2.1; pole.castShadow = true; g.add(pole); o.flagM = new THREE.MeshStandardMaterial({ color: 0xe8e8e8, roughness: .8, side: THREE.DoubleSide, flatShading: true });
      o.flag = new THREE.Mesh(new THREE.PlaneGeometry(1.2, .75), o.flagM); o.flag.position.set(.62, 3.7, 0); o.flag.castShadow = true; g.add(o.flag); scene.add(g); o.pole = g;
      o.fill = new THREE.Mesh(new THREE.RingGeometry(o.r - .9, o.r - .35, 64, 1, 0, .001), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: .7, depthWrite: false, side: THREE.DoubleSide })); o.fill.rotation.x = -Math.PI / 2; o.fill.position.set(o.x, .055, o.z); scene.add(o.fill); }
    const col = o.owner >= 0 ? TEAM_COL[o.owner] : 0xe8e8e8; o.ring.material.color.setHex(col); o.flagM.color.setHex(col);
    o.ring.material.opacity = o.contested ? .35 + .3 * Math.sin(M.t * 8) : .45; o.flag.position.y = 3.7 - (o.capBy >= 0 && o.owner >= 0 ? o.cap * 1.6 : 0); o.flag.rotation.y = Math.sin(M.t * 2.1 + o.x) * .25;
    const prog = o.capBy >= 0 ? o.cap : 0; o.fill.visible = prog > .005;
    if (o.fill.visible && Math.abs((o.fillP || 0) - prog) > .01) { o.fill.geometry.dispose(); o.fill.geometry = new THREE.RingGeometry(o.r - .9, o.r - .35, 64, 1, Math.PI / 2, -prog * Math.PI * 2); o.fillP = prog; }
    if (o.fill.visible) o.fill.material.color.setHex(TEAM_COL[o.capBy]);
  }
}
/* marcador de dominio (arriba en el centro) y barra de captura (abajo en el centro, sólo dentro de un punto) */
{ const st = document.createElement('style'); st.textContent = `
#domScore{position:fixed;left:50%;top:calc(6px + env(safe-area-inset-top));transform:translateX(-50%);z-index:3;pointer-events:none;display:none;gap:4px;align-items:center;font:800 12px/1 system-ui,-apple-system,sans-serif;font-variant-numeric:tabular-nums;text-shadow:0 1px 2px #000}
#domScore .f{position:relative;min-width:40px;padding:3px 5px 5px;border-radius:5px;background:#0b0f18b8;text-align:center}#domScore .f.me{box-shadow:inset 0 0 0 1px #ffffff55}
#domScore .f i{position:absolute;left:3px;right:3px;bottom:2px;height:2px;background:#ffffff1c;border-radius:1px;overflow:hidden}#domScore .f i b{display:block;height:100%}
#domScore .f s{text-decoration:none;font-size:9px;opacity:.75;margin-left:3px;font-weight:700}#domScore .m{font-size:9px;opacity:.6;margin-left:4px;font-weight:700}
#capBar{position:fixed;left:50%;bottom:calc(22px + env(safe-area-inset-bottom));transform:translateX(-50%);z-index:3;pointer-events:none;display:none;width:min(260px,40vw);text-align:center;font:700 11px/1.2 system-ui,-apple-system,sans-serif;color:#fff;text-shadow:0 1px 2px #000}
#capBar .t{margin-bottom:4px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}#capBar .b{height:6px;border-radius:3px;background:#0b0f18c8;box-shadow:inset 0 0 0 1px #ffffff26;overflow:hidden}#capBar .b i{display:block;height:100%;transition:width .2s}
@media (min-height:521px){#domScore{font-size:15px;top:calc(10px + env(safe-area-inset-top))}#domScore .f{min-width:60px}#capBar{font-size:13px;bottom:calc(40px + env(safe-area-inset-bottom))}}
`; document.head.appendChild(st); }
const domEl = document.createElement('div'); domEl.id = 'domScore'; document.body.appendChild(domEl);
const capEl = document.createElement('div'); capEl.id = 'capBar'; document.body.appendChild(capEl);
SQ.capTick = () => {
  objHud(); const pl = MX.pl, on = MX.on && SQ.objs.length && !menuOpen && !TM.open;
  domEl.style.display = on ? 'flex' : 'none'; if (!on) { capEl.style.display = 'none'; return; }
  const hex = t => '#' + TEAM_COL[t].toString(16).padStart(6, '0'), held = [0, 0, 0, 0]; for (const o of SQ.objs) if (o.owner >= 0) held[o.owner]++;
  domEl.innerHTML = [0, 1, 2, 3].map(t => '<div class="f' + (pl && t === pl.team ? ' me' : '') + '" style="color:' + hex(t) + '">' + SQ.score[t] + '<s>' + held[t] + '⚑</s><i><b style="width:' + Math.min(100, SQ.score[t] / META * 100) + '%;background:' + hex(t) + '"></b></i></div>').join('') + '<span class="m">/' + META + '</span>';
  const here = pl && !pl.dead && SQ.objs.find(o => dist(pl.p, o) < o.r);
  capEl.style.display = here ? 'block' : 'none'; if (!here) return;
  const st = SQ.objState(here), prog = here.capBy >= 0 ? here.cap : here.owner >= 0 ? 1 : 0, c = here.contested ? '#ffd24a' : hex(here.capBy >= 0 ? here.capBy : here.owner >= 0 ? here.owner : pl.team);
  capEl.innerHTML = '<div class="t">' + here.name + ' · ' + (here.contested ? '<span style="color:#ffd24a">DISPUTADO</span>' : here.owner === pl.team && !(here.capBy >= 0 && here.cap > 0) ? 'Nuestro' : here.capBy >= 0 && here.cap > 0 ? st + ' ' + Math.round(here.cap * 100) + ' %' : here.owner >= 0 ? 'de ' + TN[here.owner] + ' · quédate para neutralizarlo' : 'Neutral · quédate para capturarlo') + '</div><div class="b"><i style="width:' + Math.round(prog * 100) + '%;background:' + c + '"></i></div>';
};
SQ.objHtml = () => '';
/* ---------- MAPA TÁCTICO (touchpad del mando · tecla M): el distrito entero con calles, zonas y edificios, refugios, objetivos con el color de su dueño,
   tu escuadra, tus aliados y DÓNDE HAY FUEGO: disparos y explosiones recientes (se apagan en 30 s) e incendios. Los enemigos no se ven (sólo el ruido del combate).
   Capa fija dibujada una vez por mapa; capa viva cada fotograma mientras está abierto. Mientras está abierto, el personaje no se mueve ni dispara. ---------- */
const CMB = [];                                                                       // eventos de combate: { x, z, t, k: 'shot' | 'boom' | 'hit', team (quien dispara), vic (facción atacada) }
const HEAR_R = 150, BOOM_R = 250, FADE = 20;                                         // se oyen los disparos a 150 m y las explosiones a 250 m; la marca dura 20 s
MX.combat = (k, x, z, team, vic) => { if (!MX.on || !MX.campaign) return; const last = CMB[CMB.length - 1];
  if (k === 'shot' && last && last.k === 'shot' && M.t - last.t < .15 && Math.hypot(last.x - x, last.z - z) < 6) return;   // ráfagas: un evento cada 0,15 s por zona
  if (k === 'hit') { for (let i = CMB.length - 1; i >= 0 && M.t - CMB[i].t < .5; i--) if (CMB[i].k === 'hit' && CMB[i].vic === vic && Math.hypot(CMB[i].x - x, CMB[i].z - z) < 8) return; }
  CMB.push({ x, z, t: M.t, k, team: team === undefined ? -1 : team, vic: vic === undefined ? -1 : vic }); if (CMB.length > 1500) CMB.splice(0, CMB.length - 1500); };
/* qué ve la facción `team` desde (px,pz): los disparos y explosiones que oye (a su alcance) y, a cualquier distancia, el fuego contra su facción */
SQ.combatCells = (t, x, z, a) => combatCells(t, x, z, a || FADE);
function combatCells(team, px, pz, maxAge) {
  const cells = new Map();
  for (const e of CMB) { const age = M.t - e.t; if (age > maxAge) continue;
    const ally = e.vic === team, d = Math.hypot(e.x - px, e.z - pz);
    if (!ally && (e.k === 'hit' || (e.k === 'shot' && d > HEAR_R) || (e.k === 'boom' && d > BOOM_R))) continue;
    const key = (ally ? 'a' : 'f') + Math.floor(e.x / 20) + ',' + Math.floor(e.z / 20), c = cells.get(key) || { x: 0, z: 0, w: 0, boom: 0, young: 99, ally };
    const w = (e.k === 'boom' ? 6 : e.k === 'hit' ? 3 : 1) * (1 - age / maxAge); c.x += e.x * w; c.z += e.z * w; c.w += w; if (e.k === 'boom') c.boom = Math.max(c.boom, 1 - age / maxAge); c.young = Math.min(c.young, age); cells.set(key, c); }
  return [...cells.values()].filter(c => c.w > 0);
}
const TM = { open: false, cv: null, ctx: null, base: null, baseKey: '', t0: 0 };
const mapEl = document.createElement('div');
mapEl.style.cssText = 'position:fixed;inset:0;z-index:12;display:none;flex-direction:column;gap:6px;align-items:center;justify-content:center;background:#05070bcc;backdrop-filter:blur(3px);-webkit-backdrop-filter:blur(3px)';
const mapCv = document.createElement('canvas'); mapCv.style.cssText = 'border-radius:10px;box-shadow:0 10px 40px #000c,0 0 0 1px #ffffff22';
const mapLeg = document.createElement('div'); mapLeg.style.cssText = 'position:absolute;left:50%;bottom:calc(10px + env(safe-area-inset-bottom));transform:translateX(-50%);max-width:94vw;text-align:center;line-height:1.5;font:600 clamp(9px,1.6vw,12px) system-ui,-apple-system,sans-serif;color:#dfe6f2;background:#0b0f18d0;border:1px solid #ffffff1c;border-radius:8px;padding:4px 10px;white-space:normal;text-shadow:0 1px 2px #000';
mapLeg.innerHTML = '<span style="color:#ff7a2a">●</span> disparos que oyes (150 m) &nbsp; <span style="color:#ff4a4a">●</span> aliados bajo fuego &nbsp; <span style="color:#ffd24a">✸</span> explosión &nbsp; <span style="color:#ff4a2a">▲</span> incendio &nbsp; <span style="color:#fff">➤</span> tú &nbsp; ★ líder &nbsp; ◯ objetivo (color del dueño) &nbsp; · Share / M para cerrar';
const mapHead = document.createElement('div'); mapHead.style.cssText = 'font:700 clamp(10px,1.8vw,13px) system-ui,-apple-system,sans-serif;color:#dfe6f2;text-shadow:0 1px 2px #000;max-width:94vw;white-space:normal;text-align:center';
mapEl.append(mapHead, mapCv, mapLeg); document.body.appendChild(mapEl);
for (const ev of ['pointerdown', 'mousedown', 'touchstart']) mapEl.addEventListener(ev, e => { e.stopPropagation(); MX.mapClose(); });
MX.mapToggle = () => TM.open ? MX.mapClose() : mapOpen();
MX.mapClose = () => { TM.open = false; mapEl.style.display = 'none'; MX.mapDock(false); };
/* con el inventario al lado (Share): el mapa se arrima a la izquierda y deja sitio al panel de la derecha */
MX.mapDock = on => { TM.dock = !!on; mapEl.style.alignItems = on ? 'flex-start' : 'center'; mapEl.style.paddingLeft = on ? 'calc(14px + env(safe-area-inset-left))' : '0'; if (TM.open) mapDraw(); };
Object.defineProperty(MX, 'mapOpen', { get: () => TM.open });
addEventListener('keydown', ev => { if (ev.code === 'KeyM' && !ev.repeat && MX.on && MX.campaign && !menuOpen) { ev.preventDefault(); MX.mapToggle(); } });
function mapOpen() { if (!MX.on || !MX.campaign || menuOpen) return; TM.open = true; mapEl.style.display = 'flex'; TM.t0 = M.t; mapDraw(); }
function mapGeom() {                                                                   // tamaño del lienzo (cabe en pantalla) y escala mundo → píxeles
  const half = (MAPA.built && MAPA.built.half) || (typeof WORLD !== 'undefined' ? Math.max(WORLD.x, WORLD.z) : 50), sz = Math.floor(Math.min(TM.dock ? innerWidth - Math.min(380, innerWidth * .44) - 44 : innerWidth * .94, (innerHeight - 110) * .97));
  return { half, sz, k: sz / (2 * half) };
}
function mapBase(g) {                                                                  // capa fija: suelo, zonas, calles, edificios, refugios
  const key = g.sz + '|' + g.half + '|' + (MAPA.built ? MAPA.built.half : 0) + '|' + OBJ.buildings.length; if (TM.baseKey === key && TM.base) return TM.base;
  const c = document.createElement('canvas'), dpr = Math.min(2, devicePixelRatio || 1); c.width = c.height = Math.round(g.sz * dpr); const x = c.getContext('2d'); x.scale(dpr, dpr);
  const P2 = v => (v + g.half) * g.k; x.fillStyle = '#2d3a28'; x.fillRect(0, 0, g.sz, g.sz);
  const info = MAPA.built && MAPA.built.info;
  if (info && info.zones) for (const z of info.zones) { const n = z.name; x.fillStyle = /^Bosque/.test(n) ? '#203a1f' : /^Granja/.test(n) ? '#4a4530' : /^(Fábrica|Estación)/.test(n) ? '#3c4048' : /^Plaza/.test(n) ? '#5a5248' : /^Refugio/.test(n) ? '#4a4a52' : '#38432f'; x.fillRect(P2(z.x0), P2(z.z0), (z.x1 - z.x0) * g.k, (z.z1 - z.z0) * g.k); }
  x.strokeStyle = '#8e939c'; x.lineCap = 'square';
  if (info && info.roads) for (const r of info.roads) { x.lineWidth = Math.max(1.2, (r.w + 6.4) * g.k); x.beginPath(); x.moveTo(P2(r.pts[0][0]), P2(r.pts[0][1])); for (const q of r.pts.slice(1)) x.lineTo(P2(q[0]), P2(q[1])); x.stroke(); }
  if (info && info.roads) { x.strokeStyle = '#4b4f57'; for (const r of info.roads) { x.lineWidth = Math.max(.8, r.w * g.k); x.beginPath(); x.moveTo(P2(r.pts[0][0]), P2(r.pts[0][1])); for (const q of r.pts.slice(1)) x.lineTo(P2(q[0]), P2(q[1])); x.stroke(); } }
  x.fillStyle = '#b9ad98'; x.strokeStyle = '#00000066'; x.lineWidth = .6;
  for (const b of OBJ.buildings) { const sw = Math.abs(Math.sin(b.rot || 0)) > .5, hx = (sw ? b.D : b.W) / 2, hz = (sw ? b.W : b.D) / 2; x.fillRect(P2(b.x - hx), P2(b.z - hz), 2 * hx * g.k, 2 * hz * g.k); x.strokeRect(P2(b.x - hx), P2(b.z - hz), 2 * hx * g.k, 2 * hz * g.k); }
  if (!info) { x.fillStyle = '#5b6272'; for (const w of M.walls) x.fillRect(P2(w.x - w.hx), P2(w.z - w.hz), 2 * w.hx * g.k, 2 * w.hz * g.k); }
  if (info && info.refugeRects) for (const r of info.refugeRects) { x.fillStyle = '#' + TEAM_COL[r.fac].toString(16).padStart(6, '0') + '55'; x.strokeStyle = '#' + TEAM_COL[r.fac].toString(16).padStart(6, '0'); x.lineWidth = 2; x.fillRect(P2(r.x - r.hx), P2(r.z - r.hz), 2 * r.hx * g.k, 2 * r.hz * g.k); x.strokeRect(P2(r.x - r.hx), P2(r.z - r.hz), 2 * r.hx * g.k, 2 * r.hz * g.k); }
  x.strokeStyle = '#ffffff14'; x.lineWidth = 1; for (let v = -g.half; v <= g.half; v += 125) { x.beginPath(); x.moveTo(P2(v), 0); x.lineTo(P2(v), g.sz); x.stroke(); x.beginPath(); x.moveTo(0, P2(v)); x.lineTo(g.sz, P2(v)); x.stroke(); }
  TM.base = c; TM.baseKey = key; return c;
}
function mapDraw() {
  if (!TM.open) return;
  const g = mapGeom(), dpr = Math.min(2, devicePixelRatio || 1); if (mapCv.width !== Math.round(g.sz * dpr)) { mapCv.width = mapCv.height = Math.round(g.sz * dpr); mapCv.style.width = mapCv.style.height = g.sz + 'px'; }
  const x = mapCv.getContext('2d'); x.setTransform(dpr, 0, 0, dpr, 0, 0); x.drawImage(mapBase(g), 0, 0, g.sz, g.sz);
  const P2 = v => (v + g.half) * g.k, pl = MX.pl, team = pl ? pl.team : 0, col = t => '#' + TEAM_COL[t].toString(16).padStart(6, '0');
  /* fuego: los disparos que se oyen (≤ 150 m de ti; explosiones ≤ 250 m) y, a cualquier distancia, el fuego contra tu facción (rojo, late); se apagan en 20 s */
  const cells = combatCells(team, P.pos.x, P.pos.z, FADE), pulse = .5 + .5 * Math.sin(M.t * 6);
  if (pl) { x.strokeStyle = '#ffffff22'; x.setLineDash([3, 4]); x.lineWidth = 1; x.beginPath(); x.arc(P2(P.pos.x), P2(P.pos.z), HEAR_R * g.k, 0, 6.283); x.stroke(); x.setLineDash([]); }   // alcance del oído
  for (const h of cells) { const cx = P2(h.x / h.w), cz = P2(h.z / h.w), r = Math.min(26, 6 + Math.sqrt(h.w) * 3.2), a = Math.min(.85, .25 + h.w * .05), rgb = h.ally ? '255,60,60' : '255,140,40';
    const gr = x.createRadialGradient(cx, cz, 0, cx, cz, r); gr.addColorStop(0, 'rgba(' + rgb + ',' + a + ')'); gr.addColorStop(1, 'rgba(' + rgb + ',0)'); x.fillStyle = gr; x.beginPath(); x.arc(cx, cz, r, 0, 6.283); x.fill();
    if (h.young < 3) { x.strokeStyle = h.ally ? 'rgba(255,110,110,' + (.5 + .5 * pulse) + ')' : 'rgba(255,190,90,' + (.4 + .5 * pulse) + ')'; x.lineWidth = h.ally ? 2.2 : 1.5; x.beginPath(); x.arc(cx, cz, r * .55 + pulse * 3, 0, 6.283); x.stroke(); }   // ahora mismo: late
    if (h.boom > 0) { x.fillStyle = 'rgba(255,215,80,' + (.4 + .6 * h.boom) + ')'; x.font = '700 ' + Math.round(10 + 6 * h.boom) + 'px system-ui'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText('✸', cx, cz); }
    if (h.ally && h.young < 6) { x.fillStyle = '#ff8a8a'; x.font = '800 10px system-ui'; x.textAlign = 'center'; x.textBaseline = 'bottom'; x.fillText('ALIADOS BAJO FUEGO', cx, cz - r * .6 - 2); } }
  if (typeof FIRES !== 'undefined') for (const f of FIRES) { x.fillStyle = '#ff4a2a'; x.beginPath(); const fx = P2(f.x), fz = P2(f.z); x.moveTo(fx, fz - 5); x.lineTo(fx + 4.5, fz + 3.5); x.lineTo(fx - 4.5, fz + 3.5); x.closePath(); x.fill(); }
  /* objetivos con el color del dueño y su progreso de captura */
  for (const o of SQ.objs) { const cx = P2(o.x), cz = P2(o.z), r = Math.max(4, o.r * g.k); x.lineWidth = 2.2; x.strokeStyle = o.owner >= 0 ? col(o.owner) : '#e8e8e8'; x.globalAlpha = o.contested ? .5 + .5 * pulse : 1; x.beginPath(); x.arc(cx, cz, r, 0, 6.283); x.stroke(); x.globalAlpha = 1;
    if (o.capBy >= 0 && o.cap > 0) { x.strokeStyle = col(o.capBy); x.lineWidth = 3; x.beginPath(); x.arc(cx, cz, r + 3, -1.571, -1.571 + 6.283 * o.cap); x.stroke(); }
    if (o.code) { x.globalAlpha = 1; x.fillStyle = o.owner >= 0 ? col(o.owner) : '#0c1018'; x.font = '800 ' + Math.max(11, Math.round(r * 1.1)) + 'px system-ui,sans-serif'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText(o.code, cx, cz); } }
  /* aliados (los enemigos no se ven): tu escuadra más grande; líderes con estrella */
  const ps = pl && pl.sqd;
  for (let i_e = 0; i_e < M.ents.length; i_e++) { const e = M.ents[i_e]; if (e.dead || e.team !== team || e.isPlayer) continue; const mine = ps && e.sqd === ps, cx = P2(e.p.x), cz = P2(e.p.z);
    x.fillStyle = e.dwn ? '#ffb020' : col(team); x.globalAlpha = mine ? 1 : .55; x.beginPath(); x.arc(cx, cz, mine ? 3.2 : 2.2, 0, 6.283); x.fill(); x.globalAlpha = 1;
    if (e.sqd && e.sqd.leader === e) { x.fillStyle = '#fff'; x.font = '700 10px system-ui'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText('★', cx, cz - 7); } }
  if (ps && ps.playerLead && ps.order && ps.order.x !== undefined) { const ox = P2(ps.order.type === 'cover' ? ps.order.tx : ps.order.x), oz = P2(ps.order.type === 'cover' ? ps.order.tz : ps.order.z); x.strokeStyle = ps.order.type === 'cover' ? '#ff7a3a' : ps.order.type === 'move' ? '#4aa0ff' : '#6dff9a'; x.lineWidth = 2; x.setLineDash([4, 3]); x.beginPath(); x.moveTo(P2(P.pos.x), P2(P.pos.z)); x.lineTo(ox, oz); x.stroke(); x.setLineDash([]); x.beginPath(); x.arc(ox, oz, 5, 0, 6.283); x.stroke(); }
  if (pl && !pl.dead) { const cx = P2(P.pos.x), cz = P2(P.pos.z), a = P.aim; x.save(); x.translate(cx, cz); x.rotate(-a + Math.PI); x.fillStyle = '#fff'; x.strokeStyle = '#000'; x.lineWidth = 1.5; x.beginPath(); x.moveTo(0, -9); x.lineTo(6, 6); x.lineTo(0, 3); x.lineTo(-6, 6); x.closePath(); x.fill(); x.stroke(); x.restore(); }
  /* encabezado: facción, objetivos por facción y combate activo */
  const live = cells.filter(h => !h.ally && h.young < 5).length, allyF = cells.filter(h => h.ally && h.young < 8).length, own = [0, 0, 0, 0]; for (const o of SQ.objs) if (o.owner >= 0) own[o.owner]++;
  let h = '<span style="color:' + col(team) + '">MAPA TÁCTICO · ' + TN[team].toUpperCase() + '</span>' + (live ? ' · <span style="color:#ff9a4a">' + live + (live === 1 ? ' zona con disparos cerca' : ' zonas con disparos cerca') + '</span>' : ' · sin disparos cerca') + (allyF ? ' · <span style="color:#ff6a6a">' + allyF + (allyF === 1 ? ' grupo aliado bajo fuego' : ' grupos aliados bajo fuego') + '</span>' : '');
  if (SQ.objs.length) h += ' &nbsp;·&nbsp; ' + [0, 1, 2, 3].map(t => '<span style="color:' + col(t) + '">' + SQ.score[t] + ' (' + own[t] + '⚑)</span>').join(' ') + ' /' + META;
  if (mapHead.innerHTML !== h) mapHead.innerHTML = h;
}
/* ---- minimapa (arriba a la izquierda, siempre visible en campaña): centrado en ti, norte arriba, 220 × 220 m; mismas reglas de fuego que el mapa grande ---- */
const MM = { el: null, cv: null, t: 0, R: 110 };
function miniTick(dt) {
  if (!MM.el) { MM.el = document.createElement('div'); MM.el.id = 'miniMap'; MM.el.style.cssText = 'position:fixed;left:calc(12px + env(safe-area-inset-left));top:calc(8px + env(safe-area-inset-top));z-index:3;pointer-events:none;border-radius:50%;overflow:hidden;box-shadow:0 0 0 2px #ffffff30,0 4px 14px #000a;display:none';
    MM.cv = document.createElement('canvas'); MM.el.appendChild(MM.cv); document.body.appendChild(MM.el); }
  const on = MX.on && MX.campaign && !TM.open && !menuOpen; MM.el.style.display = on ? 'block' : 'none';
  if (!on) return; MM.t -= dt; if (MM.t > 0) return; MM.t = .1;                     // 10 veces por segundo basta
  const size = Math.round(Math.min(140, Math.max(84, Math.min(innerWidth, innerHeight) * .26))), dpr = Math.min(2, devicePixelRatio || 1); MM.size = size;
  if (MM.cv.width !== size * dpr) { MM.cv.width = MM.cv.height = size * dpr; MM.cv.style.width = MM.cv.style.height = size + 'px'; }
  const x = MM.cv.getContext('2d'); x.setTransform(dpr, 0, 0, dpr, 0, 0);
  const G = mapGeom(), base = mapBase(G), k = size / (2 * MM.R), cx = P.pos.x, cz = P.pos.z, pl = MX.pl, team = pl ? pl.team : 0, col = t => '#' + TEAM_COL[t].toString(16).padStart(6, '0');
  x.fillStyle = '#1d2619'; x.fillRect(0, 0, size, size);
  const bs = base.width / G.sz; x.drawImage(base, (cx - MM.R + G.half) * G.k * bs, (cz - MM.R + G.half) * G.k * bs, 2 * MM.R * G.k * bs, 2 * MM.R * G.k * bs, 0, 0, size, size);
  const W2 = (wx, wz) => [(wx - cx + MM.R) * k, (wz - cz + MM.R) * k], pulse = .5 + .5 * Math.sin(M.t * 6);
  for (const h of combatCells(team, cx, cz, FADE)) { let [px, pz] = W2(h.x / h.w, h.z / h.w); const out = px < 6 || pz < 6 || px > size - 6 || pz > size - 6;
    if (out) { if (!h.ally) continue; const dx = px - size / 2, dz = pz - size / 2, l = Math.hypot(dx, dz) || 1; px = size / 2 + dx / l * (size / 2 - 9); pz = size / 2 + dz / l * (size / 2 - 9);   // aliados bajo fuego fuera del minimapa: flecha en el borde
      x.save(); x.translate(px, pz); x.rotate(Math.atan2(dz, dx)); x.fillStyle = 'rgba(255,80,80,' + (.6 + .4 * pulse) + ')'; x.beginPath(); x.moveTo(7, 0); x.lineTo(-4, -5); x.lineTo(-4, 5); x.closePath(); x.fill(); x.restore(); continue; }
    const r = Math.min(14, 4 + Math.sqrt(h.w) * 2), rgb = h.ally ? '255,60,60' : '255,140,40', gr = x.createRadialGradient(px, pz, 0, px, pz, r);
    gr.addColorStop(0, 'rgba(' + rgb + ',' + Math.min(.9, .3 + h.w * .06) + ')'); gr.addColorStop(1, 'rgba(' + rgb + ',0)'); x.fillStyle = gr; x.beginPath(); x.arc(px, pz, r, 0, 6.283); x.fill();
    if (h.young < 2.5) { x.strokeStyle = 'rgba(' + rgb + ',' + (.5 + .5 * pulse) + ')'; x.lineWidth = 1.4; x.beginPath(); x.arc(px, pz, r * .5 + pulse * 2, 0, 6.283); x.stroke(); } }
  for (const o of SQ.objs) { const [px, pz] = W2(o.x, o.z); if (px < -10 || pz < -10 || px > size + 10 || pz > size + 10) continue; x.strokeStyle = o.owner >= 0 ? col(o.owner) : '#e8e8e8'; x.lineWidth = 1.6; x.beginPath(); x.arc(px, pz, Math.max(3, o.r * k), 0, 6.283); x.stroke(); if (o.code) { x.fillStyle = o.owner >= 0 ? col(o.owner) : '#0c1018'; x.font = '800 9px system-ui,sans-serif'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText(o.code, px, pz); } }
  const ps = pl && pl.sqd; for (let i_e = 0; i_e < M.ents.length; i_e++) { const e = M.ents[i_e]; if (e.dead || e.team !== team || e.isPlayer) continue; const [px, pz] = W2(e.p.x, e.p.z); if (px < 0 || pz < 0 || px > size || pz > size) continue; x.fillStyle = e.dwn ? '#ffb020' : col(team); x.globalAlpha = ps && e.sqd === ps ? 1 : .55; x.beginPath(); x.arc(px, pz, ps && e.sqd === ps ? 2.6 : 1.8, 0, 6.283); x.fill(); x.globalAlpha = 1; }
  x.save(); x.translate(size / 2, size / 2); x.rotate(-P.aim + Math.PI); x.fillStyle = '#fff'; x.strokeStyle = '#000'; x.lineWidth = 1.2; x.beginPath(); x.moveTo(0, -7); x.lineTo(5, 5); x.lineTo(0, 2.5); x.lineTo(-5, 5); x.closePath(); x.fill(); x.stroke(); x.restore();
  x.fillStyle = '#ffffffaa'; x.font = '700 9px system-ui'; x.textAlign = 'center'; x.textBaseline = 'top'; x.fillText('N', size / 2, 3);
}
SQ.mapTick = () => { if (TM.open) { if (!MX.on || menuOpen || (MX.pl && (MX.pl.dead || MX.pl.dwn))) { if (!MX.on || menuOpen) MX.mapClose(); } mapDraw(); } };

/* ---------- HUD: panel de la escuadra (arriba a la izquierda), avisos y marca de la orden ---------- */
/* Diseño por esquinas (pensado primero para el iPhone en horizontal): arriba a la izquierda el minimapa; arriba en el centro el marcador de
   facciones y los avisos cortos; abajo a la izquierda la vida y, justo encima, la escuadra en compacto; abajo a la derecha el arma.
   La escuadra se ve en una línea (nombre y orden) y una ficha por miembro con su vida; al dar una orden o cambiar la escuadra se despliega 3 s. */
{ const st = document.createElement('style'); st.textContent = `
#sqPanel{position:fixed;left:calc(14px + env(safe-area-inset-left));bottom:calc(64px + env(safe-area-inset-bottom));z-index:3;pointer-events:none;font:600 11px/1.3 system-ui,-apple-system,Segoe UI,sans-serif;color:#e8eef8;text-shadow:0 1px 2px #000;display:none;max-width:min(300px,40vw)}
#sqPanel .hd{display:flex;gap:6px;align-items:baseline;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;margin-bottom:4px}
#sqPanel .nm{font-weight:800;letter-spacing:.06em}#sqPanel .od{opacity:.8;overflow:hidden;text-overflow:ellipsis}
#sqPanel .ch{display:flex;gap:3px;flex-wrap:wrap}
#sqPanel .c{position:relative;width:26px;height:18px;border-radius:3px;background:#0b0f18c0;box-shadow:inset 0 0 0 1px #ffffff26;overflow:hidden;font:700 9px/18px system-ui,sans-serif;text-align:center}
#sqPanel .c i{position:absolute;left:0;bottom:0;height:3px;background:#6dff9a}#sqPanel .c.ld{box-shadow:inset 0 0 0 1px #ffd24a}#sqPanel .c.me{background:#1d3352d0}
#sqPanel .c.dn{background:#4a3208d0}#sqPanel .c.dd{opacity:.35}
#sqPanel .ex{margin-top:5px;background:#0b0f18b8;border-radius:6px;padding:5px 8px;box-shadow:inset 0 0 0 1px #ffffff1c}
#sqPanel .ex div{display:flex;gap:6px;align-items:center}#sqPanel .ex b{width:40px;font-weight:700}#sqPanel .ex span{flex:1;height:3px;background:#ffffff22;border-radius:2px;overflow:hidden}#sqPanel .ex span i{display:block;height:100%}
#sqToast{position:fixed;left:50%;top:calc(40px + env(safe-area-inset-top));transform:translateX(-50%);z-index:3;pointer-events:none;font:700 12px system-ui,-apple-system,sans-serif;color:#fff;background:#0b0f18c8;border-radius:6px;padding:4px 12px;display:none;text-shadow:0 1px 2px #000;white-space:nowrap;max-width:70vw;overflow:hidden;text-overflow:ellipsis}
@media (min-height:521px){#sqPanel{bottom:calc(92px + env(safe-area-inset-bottom));font-size:12px}#sqPanel .c{width:30px;height:20px;line-height:20px;font-size:10px}#sqToast{top:calc(52px + env(safe-area-inset-top));font-size:14px}}
`; document.head.appendChild(st); }
const panel = document.createElement('div'); panel.id = 'sqPanel'; document.body.appendChild(panel);
const toastEl = document.createElement('div'); toastEl.id = 'sqToast'; document.body.appendChild(toastEl);
function toast(t) { SQ.toasts.push({ t, at: M.t }); if (SQ.toasts.length > 3) SQ.toasts.shift(); SQ.lastToast = t; SQ.expandT = M.t; }
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
  const L = s.leader, what = s.playerLead ? ORDER_N[(s.order || { type: 'follow' }).type] : (MISSION_N[s.mission.type] || '') + (s.mission.name ? ' · ' + s.mission.name : '');
  const hpc = m => m.dwn ? '#ffb020' : m.hp < 40 ? '#ff6a4a' : '#6dff9a', num = m => m.isPlayer ? 'TÚ' : String(m.id).replace(/^\D+/, '');
  const chips = s.members.map(m => '<div class="c' + (m === L ? ' ld' : '') + (m.isPlayer ? ' me' : '') + (m.dead ? ' dd' : m.dwn ? ' dn' : '') + '">' + (m.dead ? '✝' : num(m)) + '<i style="width:' + (m.dead ? 0 : Math.round(m.hp)) + '%;background:' + hpc(m) + '"></i></div>').join('');
  const open = M.t - (SQ.expandT || -99) < 3;                                         // desplegado 3 s tras una orden o un cambio en la escuadra
  const ex = open ? '<div class="ex"><div style="opacity:.8;margin-bottom:2px">Líder: ' + (L ? (L.isPlayer ? 'tú' : L.id) : '—') + '</div>' + s.members.map(m => '<div style="opacity:' + (m.dead ? .45 : 1) + '"><b>' + (m === L ? '★ ' : '') + (m.isPlayer ? 'Tú' : m.id) + '</b><span><i style="width:' + (m.dead ? 0 : Math.round(m.hp)) + '%;background:' + hpc(m) + '"></i></span>' + (m.dead ? '✝' : m.dwn ? '⚠' : '') + '</div>').join('') + '</div>' : '';
  panel.innerHTML = '<div class="hd"><span class="nm">' + s.name.toUpperCase() + '</span><span class="od">' + (s.playerLead ? '★ ' : '') + what + '</span></div><div class="ch">' + chips + '</div>' + ex;
  if (SQ.capTick) SQ.capTick();
}
})();
