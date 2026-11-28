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
   - Formaciones automáticas (cuña, columna por calles, círculo al parar, línea en contacto) con puestos que se anticipan al líder.
   - Cruceta en dos tiempos: la 1.ª pulsación abre la tarjeta (3,5 s); pulsar una flecha con ella abierta ejecuta la orden y la cierra al instante; 1,5 s después se puede encadenar otra sin tarjeta.
   - Órdenes del jugador cuando lidera (cruceta del mando PS5; teclado 1–8):
       ← toque: SEGUIRME · ↓ toque: MANTENER posición · ↑ toque: AVANZAR al punto al que apuntas · → toque: FUEGO DE COBERTURA hacia donde apuntas (10 s)
       ← mantener: UNIRSE a la escuadra amiga más cercana · → mantener: TOMAR / CEDER el mando · ↓ mantener: IR POR LIBRE · ↑ mantener: REAGRUPAR (a mí, ya)
       Teclado: 1 seguir · 2 mantener · 3 avanzar · 4 cobertura · 5 unirse · 6 tomar/ceder mando · 7 por libre · 8 reagrupar. */
(function () {
const M = MX.M, rnd = Math.random, rr = (a, b) => a + (b - a) * rnd(), navAt = (x, z) => MX.navAt(x, z), coverPoint = (e, x, z) => MX.coverPoint(e, x, z), HOT = MX.HOT;
const SQ = MX.SQ = { list: [], uid: 0, cmdT: [3, 6, 9, 12], balT: 15, toasts: [], marker: null };
const TN = ['Azul', 'Rojo', 'Ámbar', 'Violeta'], SIZES = [5, 6, 5, 4, 3, 2], ROLE0 = ['attack', 'hold', 'attack', 'hold', 'defend', 'recon'];   // 12 por facción: 4 atacan, 4 mantienen/capturan (80 % en puntos), 2 defienden el refugio, 2 exploran
const KTEAM = [0, 1, 3, 2];                                                         // índice de copia del mapa simétrico (NO, NE, SE, SO) → facción
const MAXS = 8;
/* formación (lateral, atrás) en metros respecto al líder y su rumbo: cuña abierta, nunca en piña */
const FORM = [[-3.5, -3], [3.5, -3], [-6, -7], [6, -7], [0, -9], [-8.5, -11], [8.5, -11], [0, -14]];
const MISSION_N = { defend: 'Defender el refugio', hold: 'Mantener', attack: 'Atacar', recon: 'Reconocimiento', reserve: 'Reserva', free: 'Por libre' };
const ORDER_N = { follow: 'Seguirme', hold: 'Mantener posición', move: 'Avanzar', cover: 'Fuego de cobertura', regroup: 'Reagrupar' };
const alive = e => e && !e.dead && !e.dwn;
const dist = (a, b) => Math.sqrt((a.x - b.x) * (a.x - b.x) + (a.z - b.z) * (a.z - b.z));

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
/* TIPOS DE ESCUADRA (50 por facción = 12 escuadras; mismo presupuesto en todas, con variaciones del MISMO tamaño al azar en cada partida: línea↔asalto, reserva↔apoyo, flanco↔guarnición).
   asalto 5 (abre puntos) · línea 5 (captura y sostiene) · apoyo 4 (bate desde lejos, fija al enemigo) · flanco 3 (rodea y embosca) · reserva 4 (refuerza y recupera) · guarnición 3 (defiende refugio y puesto). */
const KINDS = {
  asalto: { cls: ['asa', 'asa', 'fus', 'med', 'fla'], mission: 'attack', name: 'Asalto' },
  linea: { cls: ['fus', 'fus', 'fus', 'med', 'apo'], mission: 'hold', name: 'Línea' },
  apoyo: { cls: ['apo', 'apo', 'fra', 'med'], mission: 'attack', name: 'Apoyo' },
  flanco: { cls: ['fla', 'fla', 'fra'], mission: 'attack', name: 'Flanco' },
  reserva: { cls: ['fus', 'fus', 'asa', 'med'], mission: 'reserve', name: 'Reserva' },
  guarnicion: { cls: ['fus', 'fus', 'apo'], mission: 'defend', name: 'Guarnición' }
};
MX.KINDS = KINDS;
function squadPlan() {
  const plan = ['linea', 'asalto', 'linea', 'apoyo', 'flanco', 'reserva', 'asalto', 'linea', 'apoyo', 'flanco', 'reserva', 'guarnicion'];           // la 1.ª (con el jugador en la facción Azul) es línea
  const swaps = [['linea', 'asalto'], ['reserva', 'apoyo'], ['flanco', 'guarnicion']];
  for (let n = 0; n < 2; n++) if (rnd() < .65) { const [x, y] = swaps[(rnd() * swaps.length) | 0], from = rnd() < .5 ? x : y, to = from === x ? y : x, idx = plan.map((k, i) => k === from && i > 0 ? i : -1).filter(i => i > 0); if (idx.length > 1) plan[idx[(rnd() * idx.length) | 0]] = to; }
  return plan;
}
/* RASGOS SUAVES de cada facción (invisibles, ±15 % al azar en cada partida; no son una personalidad): agresividad, atracción por el centro y rivalidad con quien va ganando */
SQ.traits = [0, 1, 2, 3].map(() => ({ aggr: .85 + .3 * rnd(), center: .85 + .3 * rnd(), rival: .85 + .3 * rnd() }));
SQ.init = () => {
  SQ.list = []; SQ.uid = 0; PL = null; SQ.traits = [0, 1, 2, 3].map(() => ({ aggr: .85 + .3 * rnd(), center: .85 + .3 * rnd(), rival: .85 + .3 * rnd() }));
  for (let t = 0; t < 4; t++) {
    const ents = M.ents.filter(e => e.team === t); if (!ents.length) continue; let k = 0; const plan = squadPlan();
    for (let i = 0; i < plan.length && k < ents.length; i++) { const kd = KINDS[plan[i]], s = mkSquad(t, { type: kd.mission }); s.kind = plan[i]; for (let j = 0; j < kd.cls.length && k < ents.length; j++) join(ents[k++], s, true); }
    while (k < ents.length) join(ents[k++], SQ.list.filter(s => s.team === t)[0], true);
  }
  for (let i_e = 0; i_e < M.ents.length; i_e++) { const e = M.ents[i_e]; e.vet = e.isPlayer ? 0 : rr(0, 4); e.lifeStart = 0; e.supp = 0; }
  const ps = MX.pl && MX.pl.sqd; if (ps) { ps.playerLead = true; ps.order = { type: 'follow' }; ps.mission = { type: 'free' }; }
  for (const s of SQ.list) electLeader(s, true);
  objInit(); try { mapBase(); } catch (e) { }                                           // precalienta la capa fija de los mapas (pantalla de carga)
};

/* ---------- liderazgo: el mejor vivo y en pie ---------- */
const merit = e => e.kills * 6 + (e.vet || 0) * 3 + Math.min(M.t - (e.lifeStart || 0), 600) / 60 - e.deaths * .5 + (MX.classBias ? MX.classBias(e) : 0);   // el líder es fusilero o de asalto, no el francotirador ni el médico
function electLeader(s, quiet) {
  const pl = MX.pl, prev = s.leader;
  if (s.playerLead && pl && pl.sqd === s && (pl.dead || pl.dwn)) {                   // el jugador líder cae: el mejor vivo toma el mando y la escuadra se queda donde está
    s.playerLead = false; s.plLost = M.t; s.order = null; let x = 0, z = 0, n = 0; for (const m of s.members) if (alive(m)) { x += m.p.x; z += m.p.z; n++; }
    s.mission = n ? { type: 'hold', x: x / n, z: z / n, name: 'posición' } : { type: 'hold' }; s.baseType = 'hold'; s.missionT = M.t; }
  let L = null;
  if (s.playerLead) L = pl;
  else { let bs = -1e9; for (let i_m = 0; i_m < s.members.length; i_m++) { const m = s.members[i_m]; if (!alive(m) || m.isPlayer) continue; const v = merit(m) + (m === prev ? 2 : 0); if (v > bs) { bs = v; L = m; } } }
  s.leader = L;
  if (!quiet && L && L !== prev && pl && pl.sqd === s) toast(L.isPlayer ? 'Tienes el mando de ' + s.name : L.id + ' toma el mando de ' + s.name);
}

/* ---------- mando de cada facción: misiones (cada ~12 s, escalonado) ---------- */
function strength(s) { return s.members.filter(alive).length; }
/* MANDO DE LA FACCIÓN: cada punto se puntúa por valor (la Plaza vale más; robar uno enemigo, más), distancia, carga (cuántas escuadras propias ya van) y presencia enemiga; una escuadra
   de reserva o de mantener acude como refuerzo a un punto propio donde hay más enemigos que amigos. */
function objLoad(t, o, except) { let n = 0; for (const q of SQ.list) if (q.team === t && q !== except && q.mission && q.mission.x !== undefined && Math.abs(q.mission.x - o.x) < 5 && Math.abs(q.mission.z - o.z) < 5) n++; return n; }
function objThreat(t, o) {                                                           // el mando solo sabe lo que ve su facción: hay enemigos contados si hay amigos en el punto (ven) o se vieron hace < 25 s
  let foes = 0, fr = 0; const R = o.r + 28, seen = SQ.seen && SQ.seen[t];
  for (let i = 0; i < M.ents.length; i++) { const e = M.ents[i]; if (e.dead || e.dwn) continue; const d = dist(e.p, o); if (d > R) continue; if (e.team === t) fr++; else if (e.team >= 0) foes += (seen && M.t - (seen.get(e) || -99) < 25) ? 1 : (1e-3); }
  return { foes: fr > 0 ? Math.round(foes) : Math.round(foes), fr };
}
SQ.objThreat = objThreat;
function leaderOf(t) { let b = -1, bs = -1; for (let q = 0; q < 4; q++) if (q !== t && SQ.score[q] > bs) { bs = SQ.score[q]; b = q; } return bs > 0 ? b : -1; }   // la facción que va primera entre las demás
function pickObjective(s, t, ref, mode) {
  const lf = SQ.lastFoe && SQ.lastFoe[t]; let best = null, bs = -1e9;
  for (const o of SQ.objs) {
    if (o.id === 'REF') continue; const mine = o.owner === t || (o.home === t && o.owner < 0);
    if (mode === 'attack' ? o.owner === t : !(mine || (o.owner < 0 && o.home < 0 && dist(o, ref) < 420))) continue;
    const th = objThreat(t, o), d = dist(o, ref), tr = SQ.traits[t] || { aggr: 1, center: 1, rival: 1 }, lead = leaderOf(t), gap = lead >= 0 ? Math.max(0, SQ.score[lead] - SQ.score[t]) : 0, risk = tr.aggr * (1 + Math.min(.5, gap / 200));
    const soft = (mode === 'attack' && lead >= 0 && o.owner === lead ? .7 * tr.rival * Math.min(1, gap / 150) : 0) + (o.id === 'PLAZA' ? (tr.center - 1) * 1.5 : o.id === 'PUE' ? (1 - tr.center) * .5 : 0) + (mode === 'attack' && o._lostT && o._lostT[t] && M.t - o._lostT[t] < 120 && o.owner !== t ? .5 : 0);
    const sc = soft + (o.id === 'PLAZA' ? 1.35 : 1) + (mode === 'attack' ? (o.owner >= 0 ? .5 : 0) : (o.owner !== t ? .6 : 0)) - d / 650 - objLoad(t, o, s) * .55
      + (mode === 'attack' ? -Math.min(1, th.foes / 12) * .35 / risk : Math.min(1.2, Math.max(0, th.foes - th.fr) / 5)) + (lf && M.t - lf.t < 150 && dist(lf, o) < 90 ? .25 : 0) + rnd() * .25;
    if (sc > bs) { bs = sc; best = o; } }
  return best;
}
function assignMission(s) {
  if (s.playerLead) return;
  const pl = places(), t = s.team, ref = pl.ref[t], m = s.mission, st = strength(s), tot = s.members.length;
  if (m.type !== 'defend' && tot >= 2 && st <= Math.max(1, Math.floor(tot * .4))) { s.mission = { type: 'defend', x: ref.x, z: ref.z, regroup: true }; s.missionT = M.t; return; }   // muy mermada: se repliega a reorganizarse
  if (m.regroup && st >= Math.ceil(tot * .75)) s.mission = { type: s.baseType || 'hold' };                                                                  // reorganizada: vuelve a lo suyo
  if (!s.baseType) s.baseType = m.type;
  const type = s.mission.type;
  if ((type === 'hold' || type === 'recon') && SQ.objs.length && !m.regroup) {                                   // refuerzo a un punto propio amenazado
    let bo = null, bsc = 0; for (const o of SQ.objs) { if (o.id === 'REF' || o.owner !== t) continue; const th = objThreat(t, o), sc = th.foes - th.fr; if (sc >= 2 && dist(s.leader ? s.leader.p : ref, o) < 320 && objLoad(t, o, s) < 2 && sc > bsc) { bsc = sc; bo = o; } }
    if (bo && !(s.mission.x !== undefined && Math.abs(s.mission.x - bo.x) < 5 && Math.abs(s.mission.z - bo.z) < 5)) { s.mission = { type: 'hold', x: bo.x, z: bo.z, name: 'refuerzo · ' + bo.name }; s.missionT = M.t; s.ap = null; return; } }
  if (s.mission.x !== undefined) {                                                   // misión en curso: se cambia al cabo de un rato en el sitio (o si no llega nunca)
    const L = s.leader, there = L && dist(L.p, s.mission) < 15; if (there && !s.mission.arr) s.mission.arr = M.t;
    const stay = type === 'recon' ? 25 : type === 'attack' ? (s.mission.role === 'ambush' ? 150 : 90) : s.kind === 'reserva' ? 70 : 240;
    if (!(s.mission.arr ? M.t - s.mission.arr > stay : M.t - s.missionT > 260)) return; }
  let tg = null;
  if (s.kind === 'guarnicion' && !s.mission.regroup) {                                                         // guarnición: refugio si el enemigo anda cerca de él; si no, el puesto avanzado propio
    const rf = refugeOf(t), near = rf && M.ents.some(e2 => alive(e2) && e2.team !== t && dist(e2.p, rf) < 150), pue = SQ.objs.find(o => o.id === 'PUE' && o.home === t);
    s.mission = near || !pue ? { type: 'defend', x: rf ? rf.x : ref.x, z: rf ? rf.z : ref.z, name: 'refugio' } : { type: 'hold', x: pue.x, z: pue.z, name: 'guarnición · ' + pue.name }; s.missionT = M.t; s.ap = null; return; }
  if (type === 'reserve' || s.kind === 'reserva') {                                                              // reserva: recuperar lo perdido > reforzar lo amenazado > el mejor punto propio/neutral
    let bo = null, why = ''; for (const o of SQ.objs) { if (o.id === 'REF') continue; if (o._lostT && o._lostT[t] && M.t - o._lostT[t] < 120 && o.owner !== t) { bo = o; why = 'recuperar'; break; } }
    if (!bo) { let bsc = 1; for (const o of SQ.objs) { if (o.id === 'REF' || o.owner !== t) continue; const th = objThreat(t, o); if (th.foes - th.fr >= bsc) { bsc = th.foes - th.fr; bo = o; why = 'refuerzo'; } } }
    if (!bo) bo = pickObjective(s, t, ref, 'hold'), why = 'reserva';
    s.mission = bo ? { type: 'hold', x: bo.x, z: bo.z, name: why + ' · ' + bo.name } : { type: 'hold' }; s.missionT = M.t; s.ap = null; return; }
  if (s.kind === 'flanco' && type === 'attack' && !s.mission.partner) {                                          // flanco sin pareja: emboscada en la ruta del rival, o ataque por el flanco al punto elegido
    const rv = leaderOf(t), rf = rv >= 0 ? places().ref[rv] : null; const pk = pickObjective(s, t, ref, 'attack');
    if (pk && rf && rnd() < .5) { const k = .5 + .1 * rnd(), q = navNear(pk.x + (rf.x - pk.x) * k * .8 + rr(-18, 18), pk.z + (rf.z - pk.z) * k * .8 + rr(-18, 18)); s.mission = { type: 'attack', x: q.x, z: q.z, name: 'emboscada', role: 'ambush' }; s.missionT = M.t; s.ap = null; return; }
    if (pk) { s.mission = { type: 'attack', x: pk.x, z: pk.z, name: pk.name, role: 'flank' }; s.missionT = M.t; s.ap = null; return; } }
  if (type === 'defend') { const rf = refugeOf(t); tg = rf ? { x: rf.x, z: rf.z } : navNear(ref.x * .9, ref.z * .9); tg.name = 'refugio'; }                 // el refugio: sus defensores ocupan los puestos junto al muro bajo
  else if (type === 'hold') { const pk = SQ.objs.length ? pickObjective(s, t, ref, 'hold') : null;                    // mantener/capturar: el punto propio o neutral con más valor y menos carga (los amenazados atraen refuerzos)
    if (pk) tg = { x: pk.x, z: pk.z, name: pk.name };
    else { const lost = SQ.objs.filter(o => o.home === t && o.owner !== t).sort((a, b) => dist(a, ref) - dist(b, ref))[0]; const own = pl.own[t]; const pue = own.find(p => p.id === 'PUE'); tg = lost || ((s.n % 2 === 1 && pue) ? pue : own[(rnd() * own.length) | 0] || ref); } }
  else if (type === 'attack') {                                                      // objetivos comunes que no son nuestros; si los tenemos todos, el puesto avanzado enemigo más cercano
    const ob = SQ.objs.length ? SQ.objs.filter(o => o.shared && o.owner !== t) : pl.shared, alt = SQ.objs.filter(o => o.id === 'PUE' && o.owner !== t);
    const pk = SQ.objs.length ? pickObjective(s, t, ref, 'attack') : null; if (pk) tg = pk; else { const c = (ob.length ? ob : alt.length ? alt : pl.shared).map(p => ({ p, d: dist(p, ref) + rnd() * 120 + (p.id === 'PLAZA' ? 60 : 0) })).sort((a, b) => a.d - b.d); tg = c.length ? c[0].p : ref; }
    const lf = SQ.lastFoe && SQ.lastFoe[t]; if (lf && M.t - lf.t < 150 && rnd() < .3) { const q = navNear(lf.x, lf.z); if (q) tg = { x: q.x, z: q.z, name: 'último contacto' }; } }   // a menudo ataca hacia donde se vio al enemigo: los encuentros se buscan, no se esperan
  else if (type === 'recon') { const c = pl.all.filter(p => dist(p, ref) < 520 && dist(p, ref) > 40); tg = c.length ? c[(rnd() * c.length) | 0] : ref; }
  else tg = ref;
  s.mission = { type, x: tg.x, z: tg.z, name: tg.name || '' }; s.missionT = M.t; s.ap = null;
  if (type === 'attack' && (s.kind === 'asalto') && tg.id) pairSupport(s, tg, t);
}
/* MANIOBRA: un asalto elige punto y recluta, si están libres, un APOYO (fija al enemigo desde lejos) y un FLANCO. 70 %: pinza (el flanco rodea y entra a la vez); 30 %: finta (el flanco ataca de frente
   y es el asalto quien rodea). */
function pairSupport(s, tg, t) {
  const free = k => SQ.list.find(q => q.team === t && q.kind === k && q !== s && !q.playerLead && q.leader && !(q.mission && q.mission.partner && M.t - q.missionT < 120) && q.members.some(alive) && dist(q.leader.p, tg) < 750);
  const ap = free('apoyo'), fl = free('flanco'), feint = rnd() < .3;
  if (ap) { ap.mission = { type: 'attack', x: tg.x, z: tg.z, name: 'apoyo · ' + (tg.name || ''), role: 'fix', partner: s.id }; ap.missionT = M.t; ap.ap = null; }
  if (fl) { fl.mission = { type: 'attack', x: tg.x, z: tg.z, name: (feint ? 'finta · ' : 'flanco · ') + (tg.name || ''), role: feint ? 'feint' : 'flank', partner: s.id }; fl.missionT = M.t; fl.ap = null; }
  if (feint && fl) { s.mission.role = 'flank'; s.mission.partner = fl.id; s.mission.name = 'flanco · ' + (tg.name || ''); }
  if (ap || fl) s.mission.pair = { ap: ap ? ap.id : 0, fl: fl ? fl.id : 0 };
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
  if (L.isPlayer) { const sp = Math.sqrt((P.vel.x) * (P.vel.x) + (P.vel.z) * (P.vel.z)); return sp > 1.5 ? Math.atan2(P.vel.x, P.vel.z) : P.aim; }
  if (L.goal) return Math.atan2(L.goal.x - L.p.x, L.goal.z - L.p.z); return L.yaw;
}
function slotOf(s, e) { let i = 0; for (let i_m = 0; i_m < s.members.length; i_m++) { const m = s.members[i_m]; if (m === e) return i; if (m !== s.leader) i++; } return 0; }
/* FORMACIONES (la escuadra de quien lidera: tú o un bot). Se elige sola según lo que hace el líder, con histéresis (no cambia a cada paso):
   · cuña (campo abierto en marcha: dos alas escalonadas detrás y a los lados, nunca en fila)  · columna escalonada (por calle o pasillo: alternando lados de la calzada, cada uno vigila un lado)
   · círculo (líder parado más de 1,5 s: perímetro a 6–8 m, cada uno mirando hacia fuera y con cobertura cercana si la hay)  · línea (en contacto sin orden: frente abierto de 4 m entre cada uno).
   Los puestos se anticipan: apuntan donde estará el líder en ~1 s (velocidad × 0,9, máx. 5 m), no donde estaba, y la velocidad de cada uno se ajusta a la del líder y a su distancia al puesto. */
const FORMS = {
  wedge: [[-3.5, -2.5], [3.5, -2.5], [-7, -6.5], [7, -6.5], [0, -9.5], [-10.5, -10], [10.5, -10], [0, -14]],
  line: [[-4, -1], [4, -1], [-8, -1.5], [8, -1.5], [-12, -2], [12, -2], [0, -5], [0, -8]],
  column: [[-1.8, -4], [1.8, -8], [-1.8, -12], [1.8, -16], [-1.8, -20], [1.8, -24], [0, -28], [0, -32]]
};
const FORM_N = { wedge: 'cuña', line: 'línea', column: 'columna', ring: 'círculo' };
let ROADSEG = null;
function onRoad(x, z) {
  if (!ROADSEG) { ROADSEG = []; const r = MAPA.built && MAPA.built.info && MAPA.built.info.roads; if (r) for (const q of r) if (q.pts && q.pts.length >= 2) ROADSEG.push([q.pts[0][0], q.pts[0][1], q.pts[1][0], q.pts[1][1], q.w / 2 + 6]); }
  for (let i = 0; i < ROADSEG.length; i++) { const r = ROADSEG[i], dx = r[2] - r[0], dz = r[3] - r[1], l2 = dx * dx + dz * dz || 1, u = Math.max(0, Math.min(1, ((x - r[0]) * dx + (z - r[1]) * dz) / l2)), px = r[0] + dx * u - x, pz = r[1] + dz * u - z; if (px * px + pz * pz < r[4] * r[4]) return true; }
  return false;
}
function leaderSpeed(s) { const L = s.leader; if (!L) return 0; return L.isPlayer ? Math.sqrt(P.vel.x * P.vel.x + P.vel.z * P.vel.z) : Math.sqrt(L.v.x * L.v.x + L.v.z * L.v.z); }
function formKind(s) {
  if (s.formPref && s.formPref !== 'auto') return s.formPref;
  if (s._fkT !== undefined && M.t - s._fkT < .5) return s._fk; s._fkT = M.t;
  const L = s.leader; if (!L) return s._fk = 'wedge';
  const sp = leaderSpeed(s), lp = L.isPlayer ? P.pos : L.p; s.stillT = sp < .6 ? (s.stillT || 0) + .5 : 0;
  const want = s.stillT > 1.5 ? 'ring' : (s.contact && M.t - s.contact.t < 8) ? 'line' : onRoad(lp.x, lp.z) ? 'column' : 'wedge';
  if (want !== s._fk && (s._fkC === undefined || M.t - s._fkC > 1.5 || !s._fk)) { s._fk = want; s._fkC = M.t; if (s.playerLead) toast('Formación: ' + FORM_N[want]); }
  return s._fk || want;
}
function leadBase(s, base) { const L = s.leader; if (!L || !L.isPlayer || base !== P.pos) return base; const k = .9, mx = 5; let dx = P.vel.x * k, dz = P.vel.z * k, d = Math.sqrt(dx * dx + dz * dz); if (d > mx) { dx *= mx / d; dz *= mx / d; } return { x: base.x + dx, z: base.z + dz }; }
function formPoint(s, e, base, face, spread) {
  const kind = formKind(s), i = slotOf(s, e); base = leadBase(s, base);
  if (kind === 'ring') {                                                             // círculo: cada uno a su sector, mirando hacia fuera
    const n = Math.max(2, s.members.length - 1), a = face + Math.PI + (i + .5) / n * Math.PI * 2, r = 6 + (i % 2) * 2, key = Math.round(base.x / 2) + ',' + Math.round(base.z / 2) + ',' + i + ',' + n;
    if (e._rgK === key) return e._rg;
    let q = navNear(base.x + Math.sin(a) * r, base.z + Math.cos(a) * r); const cp = coverPoint({ p: q }, base.x + Math.sin(a) * 30, base.z + Math.cos(a) * 30); if (cp && dist(cp, q) < 4) q = cp;
    e._rgK = key; e._rg = q; e._ringFace = a; return q; }
  const o = (FORMS[kind] || FORMS.wedge)[i % FORMS.wedge.length], k = spread || 1, ca = Math.cos(face), sa = Math.sin(face);
  return navNear(base.x + (o[0] * ca + o[1] * sa) * k, base.z + (-o[0] * sa + o[1] * ca) * k);
}
/* ponerse al día: el jugador corre a 8,2 m/s y hace dash (17 m/s × 0,18 s cada 0,9 s). Los seguidores igualan su velocidad (hasta 9,4 m/s) y, si van a más de 16 m de su puesto, encadenan dashes
   (catchUp → partida.js) cada ~1,2 s por el camino libre, sin romper el que tengan que hacer para cubrirse. */
const FORM_LIST = ['auto', 'wedge', 'line', 'column', 'ring'];
function setFormation(s, pref) { s.formPref = pref; s._fkT = undefined; showFormPreview(s); for (const m of s.members) if (m.bot) { m.goal = null; m.path = null; } }
/* ---- RUEDA DE FORMACIONES (mantén ▼ en la cruceta): aparece en el centro con las 5 formaciones (croquis de cada una); R3 (stick derecho) apunta a una, ◀ ▶ también las cambian; al soltar ▼ se
   aplica (y sale la vista previa). Mientras está abierta el stick derecho no mueve la cámara. ---- */
const WHEEL = { on: false, sel: 0, el: null, items: [] };
const WNAME = { auto: 'Auto', wedge: 'Cuña', line: 'Línea', column: 'Columna', ring: 'Círculo' };
function wheelIcon(kind) {
  const c = document.createElement('canvas'); c.width = c.height = 96; const x = c.getContext('2d'), W = 96;
  if (kind === 'auto') { x.strokeStyle = '#7cc4ff'; x.lineWidth = 4; x.beginPath(); x.arc(W / 2, W / 2, 24, 0.4, 5.6); x.stroke(); x.fillStyle = '#7cc4ff'; x.beginPath(); x.moveTo(W / 2 + 24, W / 2 - 14); x.lineTo(W / 2 + 36, W / 2 + 2); x.lineTo(W / 2 + 14, W / 2 + 2); x.fill(); x.font = '800 22px system-ui'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText('A', W / 2, W / 2 + 1); return c; }
  const offs = slotOffsets(kind, 4), ext = Math.max(8, Math.max.apply(null, offs.map(o => Math.hypot(o[0], o[1])))) + 3, sc = W / 2 / ext;
  x.strokeStyle = '#ffffff22'; x.lineWidth = 1.5; for (const o of offs) { x.beginPath(); x.moveTo(W / 2, W / 2); x.lineTo(W / 2 + o[0] * sc, W / 2 - o[1] * sc); x.stroke(); }
  x.fillStyle = '#e8f0ff'; for (const o of offs) { x.beginPath(); x.arc(W / 2 + o[0] * sc, W / 2 - o[1] * sc, 7, 0, 6.283); x.fill(); }
  x.fillStyle = '#7cc4ff'; x.beginPath(); x.moveTo(W / 2, W / 2 - 11); x.lineTo(W / 2 + 8, W / 2 + 8); x.lineTo(W / 2, W / 2 + 3); x.lineTo(W / 2 - 8, W / 2 + 8); x.closePath(); x.fill(); return c;
}
{ const st = document.createElement('style'); st.textContent = `
#sqWheel{position:fixed;left:50%;top:50%;width:340px;height:340px;margin:-170px 0 0 -170px;z-index:15;display:none;opacity:0;pointer-events:none;transition:opacity .12s;font:600 12px system-ui,-apple-system,sans-serif;color:#e9eef7}
#sqWheel.on{opacity:1}
#sqWheel .bg{position:absolute;inset:0;border-radius:50%;background:radial-gradient(circle,#0f1520f0 0 38%,#141c29d8 39% 100%);border:1px solid #33425c;box-shadow:0 18px 50px rgba(0,0,0,.6),inset 0 1px 0 rgba(255,255,255,.06)}
#sqWheel .it{position:absolute;width:84px;height:84px;margin:-42px 0 0 -42px;border-radius:50%;display:flex;flex-direction:column;align-items:center;justify-content:center;background:#141b27;border:2px solid #2a3750;transition:transform .1s,border-color .1s,background .1s}
#sqWheel .it canvas{width:46px;height:46px}#sqWheel .it span{font-size:10px;font-weight:800;letter-spacing:.06em;text-transform:uppercase;color:#9fb0cc;margin-top:1px}
#sqWheel .it.sel{transform:scale(1.18);border-color:#7cc4ff;background:linear-gradient(180deg,#1f3a5c,#173050);box-shadow:0 0 0 4px rgba(124,196,255,.2)}#sqWheel .it.sel span{color:#fff}#sqWheel .it.cur::after{content:'';position:absolute;right:10px;top:10px;width:8px;height:8px;border-radius:50%;background:#4ee08a}
#sqWheel .ct{position:absolute;left:50%;top:50%;width:132px;margin:-46px 0 0 -66px;text-align:center}#sqWheel .ct small{display:block;font-size:9px;letter-spacing:.16em;text-transform:uppercase;color:#7e8fb0}#sqWheel .ct b{display:block;font-size:18px;color:#fff;margin:2px 0}#sqWheel .ct em{display:block;font-style:normal;font-size:10px;line-height:1.3;color:#9fb0cc}`; document.head.appendChild(st); }
function openWheel() {
  const s = MX.pl && MX.pl.sqd; if (!s || !s.playerLead) return toast('No tienes el mando de tu escuadra (Mochila → Escuadra → Tomar el mando)');
  if (!WHEEL.el) { const el = WHEEL.el = document.createElement('div'); el.id = 'sqWheel'; el.innerHTML = '<div class="bg"></div><div class="ct"><small>Formación</small><b></b><em></em></div>'; document.body.appendChild(el);
    FORM_LIST.forEach((k, i) => { const a = i / 5 * Math.PI * 2, it = document.createElement('div'); it.className = 'it'; it.style.left = (170 + Math.sin(a) * 120) + 'px'; it.style.top = (170 - Math.cos(a) * 120) + 'px'; it.appendChild(wheelIcon(k)); const sp = document.createElement('span'); sp.textContent = WNAME[k]; it.appendChild(sp); el.appendChild(it); WHEEL.items.push(it); }); }
  WHEEL.on = true; MX.wheelOpen = true; WHEEL.sel = Math.max(0, FORM_LIST.indexOf(s.formPref || 'auto')); WHEEL.cur = WHEEL.sel; WHEEL.el.style.display = 'block'; void WHEEL.el.offsetWidth; WHEEL.el.classList.add('on'); wheelPaint(); padHide(); SQ.padOpenT = -99;
}
function wheelPaint() { WHEEL.items.forEach((it, i) => { it.classList.toggle('sel', i === WHEEL.sel); it.classList.toggle('cur', i === WHEEL.cur); }); const k = FORM_LIST[WHEEL.sel], e = WHEEL.el.querySelector('.ct'); e.querySelector('b').textContent = WNAME[k]; e.querySelector('em').textContent = FORM_DESC[k] + ' · suelta ▼ para aplicar'; }
function closeWheel(apply) {
  if (!WHEEL.on) return; WHEEL.on = false; MX.wheelOpen = false; WHEEL.el.classList.remove('on'); setTimeout(() => { if (!WHEEL.on) WHEEL.el.style.display = 'none'; }, 140);
  const s = MX.pl && MX.pl.sqd; if (apply && s && s.playerLead) { const k = FORM_LIST[WHEEL.sel]; if ((s.formPref || 'auto') !== k) setFormation(s, k); else showFormPreview(s); }
}
function wheelTick() {                                                                // R3 apunta a una formación (5 sectores de 72°); ◀ ▶ la mueven de una en una
  const rs = MX.rs; if (rs && rs[2] > .5) { const a = (Math.atan2(rs[0], -rs[1]) + Math.PI * 2) % (Math.PI * 2), i = Math.round(a / (Math.PI * 2 / 5)) % 5; if (i !== WHEEL.sel) { WHEEL.sel = i; wheelPaint(); } }
}
/* ---- VISTA PREVIA DE LA FORMACIÓN: al cambiarla, durante ~3 s una tarjeta con el croquis visto desde arriba (tú en el centro mirando arriba, cada compañero con su clase) y marcas fantasma
   en el suelo, pegadas a ti, donde se colocaría cada uno. Con «Auto» muestra la que elige ahora mismo. ---- */
const FORM_DESC = { auto: 'Automática (se adapta al terreno)', wedge: 'Cuña: dos alas escalonadas, abierta al frente', line: 'Línea: frente abierto de lado a lado', column: 'Columna: escalonada por la calle', ring: 'Círculo: perímetro de 360°' };
function slotOffsets(kind, n) {                                                       // (lateral, atrás) de cada compañero respecto al jugador mirando "arriba"; la columna y la cuña, como las reales
  const out = []; if (kind === 'ring') { for (let i = 0; i < n; i++) { const a = Math.PI + (i + .5) / Math.max(2, n) * Math.PI * 2, r = 6 + (i % 2) * 2; out.push([Math.sin(a) * r, Math.cos(a) * r]); } return out; }
  const F = FORMS[kind] || FORMS.wedge; for (let i = 0; i < n; i++) out.push(F[i % F.length].slice()); return out;
}
const fpCard = document.createElement('div'); fpCard.id = 'sqForm'; document.body.appendChild(fpCard);
{ const st = document.createElement('style'); st.textContent = `
#sqForm{position:fixed;left:50%;top:calc(58px + env(safe-area-inset-top));transform:translate(-50%,-8px);z-index:14;display:none;opacity:0;pointer-events:none;transition:opacity .14s,transform .14s;font:600 12px system-ui,-apple-system,sans-serif;color:#e9eef7}
#sqForm.on{opacity:1;transform:translate(-50%,0)}
#sqForm .b{display:flex;align-items:center;gap:12px;padding:8px 14px 8px 8px;border-radius:14px;background:linear-gradient(180deg,#171f2cf2,#10161fee);border:1px solid #33425c;box-shadow:0 12px 34px rgba(0,0,0,.5),inset 0 1px 0 rgba(255,255,255,.06)}
#sqForm canvas{width:96px;height:96px;border-radius:10px;background:#0d1219;border:1px solid #232f45}
#sqForm .t{display:flex;flex-direction:column;gap:2px;max-width:190px}#sqForm .t small{font-size:9.5px;letter-spacing:.14em;text-transform:uppercase;color:#7e8fb0}#sqForm .t b{font-size:15px;color:#fff;letter-spacing:.02em}#sqForm .t span{font-size:11px;color:#9fb0cc;line-height:1.3}`; document.head.appendChild(st); }
const fpGhost = { grp: null, pool: [], until: 0, kind: 'wedge', n: 0, mats: {} };
function showFormPreview(s) {
  const kind = formKind(s), mem = s.members.filter(m => !m.isPlayer && !m.dead), n = Math.max(1, mem.length), offs = slotOffsets(kind, n);
  fpCard.innerHTML = '<div class="b"><canvas width="192" height="192"></canvas><div class="t"><small>Formación</small><b>' + FORM_N[kind].replace(/^./, c => c.toUpperCase()) + (s.formPref === 'auto' || !s.formPref ? ' · auto' : '') + '</b><span>' + FORM_DESC[s.formPref || 'auto'] + '</span></div></div>';
  const cv = fpCard.querySelector('canvas'), x = cv.getContext('2d'), W = 192, ext = Math.max(8, Math.max.apply(null, offs.map(o => Math.hypot(o[0], o[1])))) + 3, sc = W / 2 / ext;                        // escala según la formación
  x.fillStyle = '#0d1219'; x.fillRect(0, 0, W, W); x.strokeStyle = '#ffffff14'; x.lineWidth = 1; for (let r = 5; r <= ext; r += 5) { x.beginPath(); x.arc(W / 2, W / 2, r * sc, 0, 6.283); x.stroke(); }
  x.beginPath(); x.moveTo(W / 2, 4); x.lineTo(W / 2, W - 4); x.moveTo(4, W / 2); x.lineTo(W - 4, W / 2); x.stroke();
  mem.forEach((m, i) => { const o = offs[i], px = W / 2 + o[0] * sc, pz = W / 2 - o[1] * sc, cl = MX.classOf(m), c = '#' + cl.col.toString(16).padStart(6, '0'); x.strokeStyle = '#ffffff30'; x.setLineDash([3, 3]); x.beginPath(); x.moveTo(W / 2, W / 2); x.lineTo(px, pz); x.stroke(); x.setLineDash([]);
    x.fillStyle = c; x.strokeStyle = '#0b0f18'; x.lineWidth = 2; x.beginPath(); x.arc(px, pz, 11, 0, 6.283); x.fill(); x.stroke(); x.fillStyle = '#0b0f18'; x.font = '800 12px system-ui'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText(cl.tag, px, pz + .5); });
  x.fillStyle = '#fff'; x.strokeStyle = '#000'; x.lineWidth = 1.5; x.beginPath(); x.moveTo(W / 2, W / 2 - 13); x.lineTo(W / 2 + 9, W / 2 + 9); x.lineTo(W / 2, W / 2 + 4); x.lineTo(W / 2 - 9, W / 2 + 9); x.closePath(); x.fill(); x.stroke();   // tú, mirando arriba
  fpCard.style.display = 'block'; void fpCard.offsetWidth; fpCard.classList.add('on'); SQ.fpUntil = M.t + 3.2;
  /* marcas fantasma en el suelo, pegadas al jugador */
  if (!fpGhost.grp) { fpGhost.grp = new THREE.Group(); scene.add(fpGhost.grp); }
  while (fpGhost.pool.length < n) { const m = new THREE.Mesh(new THREE.RingGeometry(.5, .72, 24), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: .8, depthWrite: false, side: THREE.DoubleSide, polygonOffset: true, polygonOffsetFactor: -3, polygonOffsetUnits: -3 })); m.rotation.x = -Math.PI / 2; fpGhost.pool.push(m); fpGhost.grp.add(m); }
  fpGhost.pool.forEach((m, i) => { m.visible = i < n; if (i < n) m.material.color.setHex(MX.classOf(mem[i]).col); });
  fpGhost.kind = kind; fpGhost.offs = offs; fpGhost.n = n; fpGhost.until = M.t + 3.2;
}
function fpTick() {
  if (fpCard.classList.contains('on') && M.t > SQ.fpUntil) { fpCard.classList.remove('on'); setTimeout(() => { if (!fpCard.classList.contains('on')) fpCard.style.display = 'none'; }, 180); }
  const g = fpGhost; if (!g.grp) return; const left = g.until - M.t; g.grp.visible = left > 0; if (left <= 0) return;
  const face = P.aim, ca = Math.cos(face), sa = Math.sin(face), a = Math.min(1, left / .8);
  for (let i = 0; i < g.n; i++) { const o = g.offs[i], m = g.pool[i]; m.position.set(P.pos.x + o[0] * ca + o[1] * sa, .09, P.pos.z - o[0] * sa + o[1] * ca); m.material.opacity = .85 * a; const k = 1 + .08 * Math.sin(M.t * 9 + i); m.scale.set(k, k, 1); }
}
function followSpeed(s, e, q) { const d = dist(e.p, q), ls = leaderSpeed(s); return Math.max(2.6, Math.min(9.4, ls * 1.08 + d * .55)); }
let HPN = 0;
function holdPoint(s, e, c, face) {                                                  // posiciones en arco mirando a `face`, con cobertura cercana si la hay (se recuerda mientras no cambie)
  const key = Math.round(c.x) + ',' + Math.round(c.z) + ',' + Math.round(face * 10) + ',' + s.members.length + ',' + (s.leader === e); if (e._hpK === key) return e._hp;
  if (HPN >= 2 && e._hp) return e._hp; HPN++;                                         // presupuesto: 2 cálculos de puesto (con búsqueda de cobertura) por fotograma; el resto sigue con el anterior y se recalcula en el siguiente
  const q = holdPoint0(s, e, c, face); e._hpK = key; e._hp = q; return q;
}
function holdPoint0(s, e, c, face) {
  const ob = SQ.objs.find(o => Math.sqrt((o.x - c.x) * (o.x - c.x) + (o.z - c.z) * (o.z - c.z)) < 3);
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
  /* Escuadra del jugador en «Seguirme» o «Reagrupar»: un avistamiento NO la detiene (antes cualquier contacto, p. ej. un infectado a 40 m, mandaba a todos a posiciones de apoyo durante 10 s aunque el jugador
     siguiera corriendo, y con avistamientos seguidos se quedaban atrás sin parar). Sólo se pliegan al contacto si está cerca del jugador (< 25 m) y el jugador está parado; los que ya combaten siguen combatiendo. */
  const plSq = s.playerLead && L && L.isPlayer, ordF = plSq ? (s.order || { type: 'follow' }).type : '', ignoraContacto = plSq && (ordF === 'follow' || ordF === 'regroup') && s.contact && (ordF === 'regroup' || dist(P.pos, s.contact) > 25 || Math.hypot(P.vel.x, P.vel.z) > 1.5);
  if (s.contact && M.t - s.contact.t < 10 && e.st !== 'fight' && !ignoraContacto) {     // contacto: posición de apoyo cerca de quien lo ve, mirando a la amenaza
    const c = s.contact, anchor = c.by && alive(c.by) && c.by !== e ? c.by.p : e.p, face = Math.atan2(c.x - anchor.x, c.z - anchor.z);
    const side = (slotOf(s, e) % 2 ? 1 : -1) * (3 + (slotOf(s, e) % 3) * 2), px = anchor.x + Math.cos(face) * side - Math.sin(face) * 2.5, pz = anchor.z - Math.sin(face) * side - Math.cos(face) * 2.5;
    const key = Math.round(px / 2) + ',' + Math.round(pz / 2); let q;
    if (e._cpK === key) q = e._cp; else { q = navNear(px, pz); const cp = coverPoint({ p: q }, c.x, c.z); if (cp && dist(cp, q) < 6) q = cp; e._cpK = key; e._cp = q; }
    return { x: q.x, z: q.z, speed: 4.2, hold: true, face, crouch: true };
  }
  if (s.playerLead && L && L.isPlayer) {                                             // escuadra del jugador: sus órdenes
    const o = s.order || { type: 'follow' };
    if (o.type === 'cover' && o.tgt && !o.tgt.dead && !o.known) {                      // sin enemigo a la vista: cobertura = vigilan la zona desde su puesto; ataque = avanzan hacia el área en abanico y buscan
      const A = o.area;
      if (!o.assault) { const q = o.pts.get(e) || holdPoint(s, e, o, o.face); o.pts.set(e, q); return { x: q.x, z: q.z, speed: 4.8, hold: true, face: Math.atan2(A.x - q.x, A.z - q.z), crouch: true }; }
      const a0 = Math.atan2(e.p.x - A.x, e.p.z - A.z) + ((e.slot || 0) % 5 - 2) * .35, r = Math.max(5, Math.min(e.ideal || 10, (MX.SIGHT ? MX.SIGHT.hd : 9) * .85)) + ((e.slot || 0) % 2) * 3, px = A.x + Math.sin(a0) * r, pz = A.z + Math.cos(a0) * r, q = navAt(px, pz) ? { x: px, z: pz } : navNear(px, pz);
      return { x: q.x, z: q.z, speed: 6, hold: true, face: Math.atan2(A.x - q.x, A.z - q.z), crouch: false }; }
    if (o.type === 'cover' && o.tgt && !o.tgt.dead) {                                  // fuego de cobertura: a un puesto con línea de tiro al objetivo (el propio de formación si ya la tiene)
      const f = o.tgt, rg = Math.min(e.w.bal.max * .9, 55); let q = o.pts.get(e) || holdPoint(s, e, o, o.face); o.pts.set(e, q);
      if (o.assault) {                                                                 // ataque: cada uno se acerca al objetivo hasta su distancia ideal de combate, con línea de tiro y por un lado distinto
        const c = e._asq; if (c && c.f === f && M.t - c.t < 1.2) q = c.q; else { const ideal = Math.max(5, Math.min(e.ideal || 10, (MX.SIGHT ? MX.SIGHT.hd : 9) * .85)); /* dentro de lo que ven (su campo de visión) */ let bq = null, bd = 1e9;
          for (let a = 0; a < 6.28; a += .55) for (let r = ideal; r <= ideal + 8; r += 4) { const px = f.p.x + Math.sin(a) * r, pz = f.p.z + Math.cos(a) * r; if (!navAt(px, pz)) continue; const cp = { x: px, z: pz }; if (!MX.lineFree(cp, f.p)) continue; const d = dist(cp, e.p) + Math.abs(((a - (e.slot || 0) * .9) % 6.28)) * 2; if (d < bd) { bd = d; bq = cp; } }
          q = bq || q; e._asq = { f, q, t: M.t }; }
        return { x: q.x, z: q.z, speed: 6.4, hold: true, face: Math.atan2(f.p.x - q.x, f.p.z - q.z), crouch: false }; }
      if (!(dist(q, f.p) <= rg && MX.lineFree(q, f.p))) {
        const c = e._cvq; if (c && c.f === f && M.t - c.t < 1.5) q = c.q; else {
          let bq = null, bd = 1e9; for (let r = 3; r <= 16; r += 3.4) for (let a = 0; a < 6.28; a += .7) { const px = P.pos.x + Math.sin(a) * r, pz = P.pos.z + Math.cos(a) * r; if (!navAt(px, pz)) continue; const cp = { x: px, z: pz }; if (dist(cp, f.p) > rg || !MX.lineFree(cp, f.p)) continue; const d = dist(cp, e.p); if (d < bd) { bd = d; bq = cp; } }
          q = bq || q; e._cvq = { f, q, t: M.t }; } }
      return { x: q.x, z: q.z, speed: 5.2, hold: true, face: Math.atan2(f.p.x - q.x, f.p.z - q.z), crouch: dist(e.p, q) < 2 }; }
    if (o.type === 'hold' || o.type === 'cover') { const q = o.pts && o.pts.get(e) || holdPoint(s, e, o, o.face); if (o.pts) o.pts.set(e, q); return { x: q.x, z: q.z, speed: 4.6, hold: true, face: o.face, crouch: true }; }
    if (o.type === 'move') { const q = o.pts.get(e) || holdPoint(s, e, o, o.face); o.pts.set(e, q); const dq = dist(e.p, q); return { x: q.x, z: q.z, speed: dq > 25 ? 8.4 : dq > 8 ? 6.2 : 4.4, hold: true, face: o.face, crouch: dq < 3, catchUp: dq > 30 }; }
    const q = formPoint(s, e, P.pos, facingOf(s), 1);
    if (formKind(s) === 'ring' && o.type !== 'regroup') return { x: q.x, z: q.z, speed: followSpeed(s, e, q), hold: true, face: e._ringFace !== undefined ? e._ringFace : facingOf(s), crouch: false };
    return { x: q.x, z: q.z, speed: o.type === 'regroup' ? Math.max(8.6, followSpeed(s, e, q)) : followSpeed(s, e, q), hold: false, face: facingOf(s), catchUp: dist(e.p, q) > 16 };
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
  if (formKind(s) === 'ring') return { x: q.x, z: q.z, speed: followSpeed(s, e, q), hold: true, face: e._ringFace !== undefined ? e._ringFace : facingOf(s), crouch: false };
  return { x: q.x, z: q.z, speed: dist(e.p, q) > 12 ? 6.2 : Math.max(3, followSpeed(s, e, q)), hold: false, face: facingOf(s) };
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
SQ.seen = [new Map(), new Map(), new Map(), new Map()];                            // enemigos vistos por cada facción (cuándo)
SQ.contact = (e, seen) => {
  if (seen && seen.team >= 0 && e.team >= 0) SQ.seen[e.team].set(seen, M.t);                                                          // un miembro ve a un enemigo: la escuadra lo sabe (radio de 60 m alrededor del líder)
  const s = e.sqd; if (!s || !seen || !seen.p || seen.team === undefined) return;
  s.contact = { x: seen.p.x, z: seen.p.z, t: M.t, by: e, foe: seen };
  if (seen.team >= 0 && seen.team !== e.team) { SQ.lastFoe = SQ.lastFoe || []; SQ.lastFoe[e.team] = { x: seen.p.x, z: seen.p.z, t: M.t, name: 'contacto' }; }   // último enemigo de otra facción visto por cualquier escuadra de este equipo
};
MX.bulletPass = (b, x0, z0, x1, z1) => {                                             // supresión: balas que pasan a < 2,5 m de alguien de otra facción
  if (!MX.campaign) return; const own = b.own || MX.pl, team = own ? own.team : 0, dx = x1 - x0, dz = z1 - z0, L2 = dx * dx + dz * dz || 1;
  for (let i_e = 0; i_e < M.ents.length; i_e++) { const e = M.ents[i_e];
    if (e.dead || e.team === team) continue;
    const ex = e.p.x, ez = e.p.z; if (ex < Math.min(x0, x1) - 3 || ex > Math.max(x0, x1) + 3 || ez < Math.min(z0, z1) - 3 || ez > Math.max(z0, z1) + 3) continue;
    const t = clamp(((ex - x0) * dx + (ez - z0) * dz) / L2, 0, 1), d = Math.sqrt((x0 + dx * t - ex) * (x0 + dx * t - ex) + (z0 + dz * t - ez) * (z0 + dz * t - ez));
    if (d < 2.5) { if (MX.combat) MX.combat('hit', e.p.x, e.p.z, team, e.team); e.supp = Math.min(1, (e.supp || 0) + (2.5 - d) * .16); e.suppT = M.t; if (own && own.p) { e.suppFrom = { x: own.p.x, z: own.p.z }; } }
  }
};

/* ---------- órdenes del jugador ---------- */
function aimPoint(d) { const a = P.aim; return navNear(P.pos.x + Math.sin(a) * d, P.pos.z + Math.cos(a) * d); }
const COVER_R = 50, ATK_R = 60;                                                                  // radio de búsqueda del fuego de cobertura (m)
function knownFoe(o) {                                                                // solo se puede ordenar atacar a lo que alguien de la escuadra o tú veis (mismo campo de visión que el juego)
  const S = MX.SIGHT || { hw: 13, hd: 8 }, dx = o.p.x - P.pos.x, dz = o.p.z - P.pos.z;
  if (Math.abs(dx) < S.hw * 1.1 && Math.abs(dz) < S.hd * 1.1 && MX.lineFree(P.pos, o.p)) return true;
  const s = MX.pl && MX.pl.sqd; if (s) for (const m of s.members) if (!m.dead && !m.dwn && m.tgt === o && (m.vis || M.t - (m.seenT || -9) < 2)) return true;
  return false;
}
function nearestFoeAny(x, z, R, team, except) {                                      // el más cercano, lo vea alguien o no (si lo ordenas es porque lo ves o lo supones)
  let best = null, bd = R * R; const test = o => { if (!o || o.dead || o === except) return; const dx = o.p.x - x, dz = o.p.z - z, d = dx * dx + dz * dz; if (d < bd) { bd = d; best = o; } };
  for (let i = 0; i < M.ents.length; i++) { const e = M.ents[i]; if (e.team !== team && !e.dwn) test(e); } const Z = MX.zom && MX.zom.list; if (Z) for (let i = 0; i < Z.length; i++) test(Z[i]); return best;
}
/* BÚSQUEDA: si nadie lo ve, la escuadra no conoce su posición exacta: busca en un ÁREA de ±8 m alrededor del más cercano (una pista, no una coordenada exacta), avanza hasta ella y solo dispara
   a lo que ve. Si llega y no hay nadie, pasa al siguiente más cercano; sin más, informa «zona despejada». */
function orderFoe(o) { return o.tgt && !o.tgt.dead ? o.tgt : null; }
function orderPt(o) { return o.known ? o.tgt.p : o.area; }
function newOrderTarget(R, team, area0, unc) {
  const k = nearestFoe(P.pos.x, P.pos.z, R, team); if (k) return { tgt: k, known: true, area: null };
  const f = nearestFoeAny(area0 ? area0.x : P.pos.x, area0 ? area0.z : P.pos.z, R, team, null); if (!f) return null;
  const u = unc || 8; return { tgt: f, known: false, area: { x: f.p.x + rr(-u, u), z: f.p.z + rr(-u, u) }, unc: u };
}
function nearestFoe(x, z, R, team, except) {
  let best = null, bd = R * R; const test = o => { if (!o || o.dead || o === except) return; const dx = o.p.x - x, dz = o.p.z - z, d = dx * dx + dz * dz; if (d < bd && knownFoe(o)) { bd = d; best = o; } };
  for (let i = 0; i < M.ents.length; i++) { const e = M.ents[i]; if (e.team !== team && !e.dwn) test(e); }
  const Z = MX.zom && MX.zom.list; if (Z) for (let i = 0; i < Z.length; i++) test(Z[i]);
  return best;
}
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
    if (k === 'capture' || k === 'fallback' || k === 'formation' || k === 'attack' || k === 'wheel') {
      if (!s || !s.playerLead) return toast('No tienes el mando de tu escuadra (Mochila → Escuadra → Tomar el mando)');
      if (k === 'formation') { const L = FORM_LIST; setFormation(s, L[(L.indexOf(s.formPref || 'auto') + 1) % L.length]); return; }
      if (k === 'wheel') return openWheel();
      if (k === 'capture') { let bo = null, bd = 1e9; for (const o of SQ.objs) { if (o.id === 'REF' || o.owner === pl.team) continue; const d = dist(o, P.pos); if (d < bd) { bd = d; bo = o; } }
        if (!bo) return toast('Tu facción ya tiene todos los puntos'); s.order = { type: 'move', x: bo.x, z: bo.z, face: Math.atan2(bo.x - P.pos.x, bo.z - P.pos.z), pts: new Map(), cap: bo }; toast('Capturar ' + bo.name + ' · ' + Math.round(bd) + ' m'); }
      else if (k === 'fallback') { const rf = refugeOf(pl.team); if (!rf) return; s.order = { type: 'move', x: rf.x, z: rf.z, face: Math.atan2(rf.x - P.pos.x, rf.z - P.pos.z), pts: new Map() }; toast('Replegarse al refugio'); }
      else { const T = newOrderTarget(ATK_R, pl.team); if (!T) return toast('Atacar: no hay enemigos cerca (≤ ' + ATK_R + ' m)'); const pt = orderPt(T);
        s.order = { type: 'cover', assault: true, dur: 22, x: P.pos.x, z: P.pos.z, tgt: T.tgt, known: T.known, area: T.area, face: Math.atan2(pt.x - P.pos.x, pt.z - P.pos.z), tx: pt.x, tz: pt.z, t: M.t, prev: s.order && s.order.type !== 'cover' ? s.order : { type: 'follow' }, pts: new Map() };
        toast(T.known ? '¡Atacad! ' + (T.tgt.team >= 0 ? 'Enemigo más cercano' : 'Infectados más cercanos') + ' · ' + Math.round(dist(T.tgt.p, P.pos)) + ' m' : '¡Atacad! Buscando al enemigo más cercano · ~' + Math.round(dist(T.tgt.p, P.pos)) + ' m'); }
      for (const m of s.members) if (m.bot) { m.goal = null; m.path = null; if (m.st === 'search') m.st = 'push'; } return; }
    if (k === 'regroup') { if (!s || !s.playerLead) return toast('No tienes el mando (Mochila → Escuadra → Tomar el mando)'); s.order = { type: 'regroup', t: M.t }; return toast('¡Reagrupad conmigo!'); }
    return;
  }
  if (!s || !s.playerLead) return toast('No tienes el mando de tu escuadra (Mochila → Escuadra → Tomar el mando)');
  if (k === 'follow') s.order = { type: 'follow' };
  else if (k === 'hold') { const q = { x: P.pos.x, z: P.pos.z }; s.order = { type: 'hold', x: q.x, z: q.z, face: P.aim, pts: new Map() }; }
  else if (k === 'move') { const q = aimPoint(22); s.order = { type: 'move', x: q.x, z: q.z, face: P.aim, pts: new Map() }; }
  else if (k === 'cover') {                                                           // FUEGO DE COBERTURA: la escuadra se queda cerca de ti y bate al enemigo más cercano (≤ 50 m) desde puestos con línea de tiro; si no lo ve nadie, vigila esa zona
    const T = newOrderTarget(COVER_R, pl.team); if (!T) return toast('Fuego de cobertura: no hay enemigos cerca (≤ ' + COVER_R + ' m)');
    const pt = orderPt(T); s.order = { type: 'cover', x: P.pos.x, z: P.pos.z, tgt: T.tgt, known: T.known, area: T.area, face: Math.atan2(pt.x - P.pos.x, pt.z - P.pos.z), tx: pt.x, tz: pt.z, t: M.t, prev: s.order && s.order.type !== 'cover' ? s.order : { type: 'follow' }, pts: new Map() };
    toast(T.known ? 'Fuego de cobertura sobre ' + (T.tgt.team >= 0 ? 'el enemigo más cercano' : 'los infectados más cercanos') + ' · ' + Math.round(dist(T.tgt.p, P.pos)) + ' m' : 'Fuego de cobertura: vigilando la zona del enemigo más cercano · ~' + Math.round(dist(T.tgt.p, P.pos)) + ' m'); return; }
  for (const m of s.members) if (m.bot) { m.goal = null; m.path = null; if (m.st === 'search') m.st = 'push'; }
  toast('Orden: ' + ORDER_N[s.order.type]);
};
SQ.supPoint = e => {                                                                 // a dónde hace fuego de supresión este bot (o null)
  const s = e.sqd; if (!s) return null;
  if (s.order && s.order.type === 'cover' && M.t - s.order.t < (s.order.dur || 10) && s.order.tgt && !s.order.tgt.dead && s.order.known) {          // solo dispara al objetivo si tiene línea de tiro y alcance (no a ciegas)
    const f = s.order.tgt, d = dist(e.p, f.p); if (d <= Math.min(e.w.bal.max * .9, 55) && MX.lineFree(e.p, f.p)) return { x: f.p.x, z: f.p.z }; return null; }
  if (s.contact && s.contact.foe && s.contact.foe.dead) s.contact = null;          // el enemigo ha caído: se deja de batir la zona
  /* los bots NUNCA disparan a algo que no ven: ya no hay fuego de supresión automático sobre un contacto (solo la orden explícita de «fuego de cobertura» del jugador, arriba). El contacto
     sigue sirviendo para que la escuadra tome posiciones de apoyo y mire hacia la amenaza, pero apuntar y disparar exige ver al enemigo. */
  return null;
};

/* ---------- actualización ---------- */
let padPrev = [false, false, false, false], padT = [0, 0, 0, 0];
const PADK = [['move', 'capture'], ['hold', 'wheel'], ['follow', 'fallback'], ['cover', 'attack']];   // ↑ ↓ ← → (botones 12–15): toque / mantener
/* CRUCETA EN DOS TIEMPOS: la primera pulsación NO da la orden: abre una tarjeta que enseña qué hace cada flecha (toque y mantener) con la pulsada resaltada; mientras la tarjeta está visible
   (6 s, y 3 s más tras cada orden), volver a pulsar una flecha ejecuta su orden (toque = la principal, mantener = la secundaria). Así no hay órdenes por error y, aunque se olvide qué hace cada
   flecha, la primera pulsación lo recuerda. El teclado (1–8) sigue siendo directo. */
const PAD_INFO = [['▲', 'Avanzar', 'Capturar'], ['▼', 'Mantener', 'Rueda de formación'], ['◀', 'Seguirme', 'Replegarse'], ['▶', 'Cobertura', 'Atacar']];
const PAD_DESC = ['a donde apuntas', 'aquí', 'en formación', 'fuego a donde apuntas', ];
const padCard = document.createElement('div'); padCard.id = 'sqPad'; document.body.appendChild(padCard);
{ const st = document.createElement('style'); st.textContent = `
#sqPad{position:fixed;left:50%;bottom:max(86px,calc(70px + env(safe-area-inset-bottom)));transform:translate(-50%,10px);z-index:14;display:none;opacity:0;pointer-events:none;transition:opacity .14s,transform .14s;font:600 12px system-ui,-apple-system,'Segoe UI',sans-serif;color:#e9eef7}
#sqPad.on{opacity:1;transform:translate(-50%,0)}
#sqPad .box{display:grid;grid-template-columns:repeat(3,112px);grid-template-rows:repeat(3,auto);gap:6px;padding:10px;border-radius:16px;background:linear-gradient(180deg,#171f2cf2,#10161fee);border:1px solid #33425c;box-shadow:0 14px 40px rgba(0,0,0,.55),inset 0 1px 0 rgba(255,255,255,.06);backdrop-filter:blur(6px)}
#sqPad .k{display:flex;flex-direction:column;align-items:center;gap:1px;padding:7px 6px 6px;border-radius:10px;background:#141b27;border:1px solid #2a3750;text-align:center;transition:background .1s,border-color .1s,transform .1s}
#sqPad .k b{font-size:15px;color:#7cc4ff;line-height:1}#sqPad .k span{font-weight:800;font-size:12.5px;letter-spacing:.02em}#sqPad .k small{font-size:10.5px;color:#8ea0bf;font-weight:600}#sqPad .k small i{font-style:normal;color:#ffb020}
#sqPad .k.hl{background:linear-gradient(180deg,#1f3a5c,#173050);border-color:#7cc4ff;transform:scale(1.05);box-shadow:0 0 0 3px rgba(124,196,255,.2)}
#sqPad .u{grid-column:2;grid-row:1}#sqPad .l{grid-column:1;grid-row:2}#sqPad .r{grid-column:3;grid-row:2}#sqPad .d{grid-column:2;grid-row:3}
#sqPad .c{grid-column:2;grid-row:2;display:flex;align-items:center;justify-content:center;text-align:center;font-size:10.5px;line-height:1.3;color:#9fb0cc;padding:0 4px}
#sqPad .c em{display:block;font-style:normal;color:#fff;font-weight:800;font-size:11px;letter-spacing:.08em;text-transform:uppercase}
#sqPad .ft{grid-column:1/4;grid-row:4;text-align:center;font-size:11px;color:#ffb020;font-weight:700;min-height:0}
@media (max-width:700px){#sqPad .box{grid-template-columns:repeat(3,98px)}}`; document.head.appendChild(st); }
const PAD_POS = ['u', 'd', 'l', 'r'];
function padShow(i) {
  const lead = MX.pl && MX.pl.sqd && MX.pl.sqd.playerLead;
  padCard.innerHTML = '<div class="box">' + PAD_INFO.map((q, k) => '<div class="k ' + PAD_POS[k] + (k === i ? ' hl' : '') + '"><b>' + q[0] + '</b><span>' + q[1] + '</span><small>mantener: <i>' + q[2] + '</i></small></div>').join('')
    + '<div class="c"><div><em>Cruceta</em>Pulsa otra vez la flecha para dar la orden</div></div>' + (lead ? '' : '<div class="ft">No tienes el mando: Mochila → Escuadra → Tomar el mando</div>') + '</div>';
  padCard.style.display = 'block'; void padCard.offsetWidth; padCard.classList.add('on');
}
function padHide() { padCard.classList.remove('on'); setTimeout(() => { if (!padCard.classList.contains('on')) padCard.style.display = 'none'; }, 180); }
SQ.padOpenT = -99; SQ.padGraceT = -99;
/* Tarjeta: 1.ª pulsación → se abre (3,5 s). Con ella abierta, pulsar una flecha ejecuta la orden Y LA CIERRA AL INSTANTE (no se vuelve a mostrar). Tras ejecutar hay 1,5 s en que otra flecha
   ejecuta directamente (encadenar órdenes sin tarjeta). */
const PAD_LONG = [.55, .28, .55, .55];                                               // ▼ abre la rueda a los 0,28 s; el resto, 0,55 s
function padTick(dt) {
  const g = typeof getPad === 'function' ? getPad() : null; if (!g || MX.dpadLock) { padPrev = [false, false, false, false]; if (padCard.classList.contains('on')) { SQ.padOpenT = -99; padHide(); } if (WHEEL.on) closeWheel(false); return; }
  const open = M.t < SQ.padOpenT, grace = M.t < SQ.padGraceT; if (!open && padCard.classList.contains('on')) padHide();
  const run = (i, long) => { SQ.cmd(PADK[i][long ? 1 : 0], long); SQ.padOpenT = -99; SQ.padGraceT = M.t + 1.5; padHide(); };
  if (WHEEL.on) wheelTick();
  for (let i = 0; i < 4; i++) { const b = g.buttons[12 + i], d = !!(b && (b.pressed || b.value > .5));
    if (WHEEL.on && (i === 2 || i === 3)) { if (padPrev[i] && !d) { WHEEL.sel = (WHEEL.sel + (i === 3 ? 1 : 4)) % 5; wheelPaint(); } padPrev[i] = d; continue; }   // con la rueda abierta, ◀ ▶ la mueven
    if (d) { padT[i] += dt; if (padT[i] >= PAD_LONG[i] && padT[i] - dt < PAD_LONG[i]) { if (i === 1) { SQ.cmd('wheel', true); } else if (open || grace) run(i, true); else { SQ.padOpenT = M.t + 3.5; padShow(i); } } }
    else if (padPrev[i]) { if (i === 1 && WHEEL.on) { closeWheel(true); SQ.padGraceT = M.t + 1.5; } else if (padT[i] < PAD_LONG[i]) { if (open || grace) run(i, false); else { SQ.padOpenT = M.t + 3.5; padShow(i); } } padT[i] = 0; }
    padPrev[i] = d; }
}
addEventListener('keydown', ev => {
  if (ev.repeat || !MX.on || !MX.campaign || (typeof RANGE !== 'undefined' && RANGE.on)) return; const m = /^Digit([1-8])$/.exec(ev.code); if (!m) return;
  const k = +m[1]; if (k <= 4) SQ.cmd(['follow', 'hold', 'move', 'cover'][k - 1], false); else SQ.cmd(['join', 'lead', 'leave', 'regroup'][k - 5], true);
});
SQ.pm = {};                                                                           // diagnóstico: máximo (ms) de cada sección de SQ.update
SQ.update = dt => {
  restorePlayerLead();
  HPN = 0; if (!MX.campaign || !SQ.list.length) return;
  const t0 = performance.now(); padTick(dt); fpTick(); SQ.pm.pad = Math.max(SQ.pm.pad || 0, performance.now() - t0);
  for (let i_e = 0; i_e < M.ents.length; i_e++) { const e = M.ents[i_e]; if (e.supp) e.supp = Math.max(0, e.supp - dt * (M.t - (e.suppT || 0) > 1.2 ? .35 : .08)); }
  let tA = performance.now(); SQ.eT = (SQ.eT || 0) - dt; if (SQ.eT <= 0) { SQ.eT = .5; for (const s of SQ.list) electLeader(s); } let tB = performance.now(); SQ.pm.elect = Math.max(SQ.pm.elect || 0, tB - tA); tA = tB;
  for (let t = 0; t < 4; t++) { SQ.cmdT[t] -= dt; if (SQ.cmdT[t] <= 0) { SQ.cmdT[t] = 12; for (const s of SQ.list) if (s.team === t) assignMission(s); } }
  tB = performance.now(); SQ.pm.assign = Math.max(SQ.pm.assign || 0, tB - tA); tA = tB; SQ.balT -= dt; if (SQ.balT <= 0) { SQ.balT = SQ_BAL; for (let t = 0; t < 4; t++) rebalance(t); } tB = performance.now(); SQ.pm.rebal = Math.max(SQ.pm.rebal || 0, tB - tA); tA = tB;
  const s = MX.pl && MX.pl.sqd;
  if (s && s.order) { if (s.order.type === 'cover') { const o = s.order; if (M.t - o.t > (o.dur || 10)) s.order = o.prev;
      else { const f = orderFoe(o); if (f && !o.known && knownFoe(f)) o.known = true;
        let need = !f || (o.known && dist(f.p, P.pos) > (o.assault ? ATK_R : COVER_R) + 20);
        if (!need && !o.known && o.assault && s.members.some(m => !m.isPlayer && !m.dead && dist(m.p, o.area) < 7)) need = true;       // llegaron al área y no hay nadie: siguiente
        if (!need && !o.known && !o.assault && M.t - o.t > 6) need = true;
        if (need) { const T = newOrderTarget(o.assault ? ATK_R : COVER_R, MX.pl.team, o.area, Math.max(2, (o.unc || 8) * .5)); if (T) { o.tgt = T.tgt; o.known = T.known; o.area = T.area; o.unc = T.unc;      // cada vez que se llega y no se ve, el área se estrecha (rastros): ±8 → ±4 → ±2 m
          o.t = Math.max(o.t, M.t - (o.dur || 10) + 4); } else { toast('Zona despejada'); s.order = o.prev; } }
        if (s.order === o && o.tgt) { const pt = orderPt(o); o.tx = pt.x; o.tz = pt.z; o.face = Math.atan2(o.tx - P.pos.x, o.tz - P.pos.z); } } } if (s.order.type === 'regroup' && M.t - s.order.t > 12) s.order = { type: 'follow' }; }
  tB = performance.now(); SQ.pm.order = Math.max(SQ.pm.order || 0, tB - tA); tA = tB; SQ.mapTick(); tB = performance.now(); SQ.pm.mapTick = Math.max(SQ.pm.mapTick || 0, tB - tA); tA = tB; miniTick(dt); tB = performance.now(); SQ.pm.mini = Math.max(SQ.pm.mini || 0, tB - tA); tA = tB;
  if (SQ.objs.length) { SQ.objT = (SQ.objT || 0) - dt; if (SQ.objT <= 0) { objTick(.5 - SQ.objT); SQ.objT = .5; } }
  tB = performance.now(); SQ.pm.obj = Math.max(SQ.pm.obj || 0, tB - tA); tA = tB; hudTick(dt); SQ.pm.hud = Math.max(SQ.pm.hud || 0, performance.now() - tA);
};
SQ.onDeath = e => { const s = e.sqd; if (s && s.leader === e) electLeader(s); };
function restorePlayerLead() {                                                          // al reaparecer O al ser reanimado, el jugador que era líder recupera el mando y su escuadra se reagrupa con él (antes: «mantener» a 100–470 m); si cedió el mando a propósito, no
  const e = MX.pl; if (!e || e.dead || e.dwn || !e.sqd || !e.sqd.plLost || M.t - e.sqd.plLost < 1) return; const s = e.sqd; if (!s.members.some(m => !m.isPlayer && !m.dead)) return;
  s.plLost = 0; s.playerLead = true; s.order = { type: 'regroup', t: M.t, fin: M.t + 14 }; s.mission = { type: 'free' }; electLeader(s, true);
  for (const m of s.members) if (m.bot) { m.goal = null; m.path = null; } toast('Tu escuadra se reagrupa contigo');
}
SQ.onRespawn = e => { e.lifeStart = M.t; e.supp = 0; if (e.isPlayer && e.sqd && e.sqd.plLost) e.sqd.plLost = Math.min(e.sqd.plLost, M.t - 1); restorePlayerLead(); };

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
    if (t >= 0 && t !== o.owner && !(o.refuge && MX.REF && MX.REF.on)) {              // atacantes solos dentro (los refugios ya no se capturan: se destruyen)
      if (o.capBy !== t) { if (o.cap > 0 && o.capBy >= 0) { o.cap = Math.max(0, o.cap - dt / CAP_N * 2); continue; } o.capBy = t; o.cap = 0; }   // otro bando a medias: primero lo deshace
      o.cap += dt / (o.owner >= 0 ? CAP_N : CAP_C) * Math.min(1.6, 1 + (n[t] - 1) * .15);
      if (o.cap >= 1) {
        const prev = o.owner; o.cap = 0;
        if (prev >= 0) { (o._lostT = o._lostT || [])[prev] = M.t; o.owner = -1; o.capBy = t;                                  // neutralizado: sigue la captura sin soltar
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
  SQ.scoreT += dt; while (SQ.scoreT >= TICK) { SQ.scoreT -= TICK; for (const o of SQ.objs) if (o.owner >= 0 && !o.refuge) SQ.score[o.owner] += o.shared ? 2 : 1; }   /* el refugio ya no puntúa por existir (sigue dando reaparición, armería y suministros); puntúan los comunes (0,4/s) y los puestos avanzados (0,2/s) */
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
  if (rf && (rf.destroyed || rf.owner !== e.team)) {                                  // refugio destruido (o, antes, capturado): se reaparece en el punto propio más cercano a él que esté a salvo
    const ok = SQ.objs.filter(o => !o.refuge && o.owner === e.team && !M.ents.some(q => alive(q) && q.team !== e.team && dist(q.p, o) < 35)).sort((a, b) => dist(a, rf) - dist(b, rf))[0];
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
      /* anillo de progreso: UNA geometría fija de 128 sectores; el progreso solo cambia cuántos se dibujan (setDrawRange): sin recrear mallas ni parpadeos. polygonOffset evita el cruce con el suelo y el anillo exterior */
      o.fill = new THREE.Mesh(new THREE.RingGeometry(o.r - .9, o.r - .35, 128, 1, Math.PI / 2, -Math.PI * 2), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: .7, depthWrite: false, side: THREE.DoubleSide, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 })); o.fill.rotation.x = -Math.PI / 2; o.fill.position.set(o.x, .075, o.z); o.fill.renderOrder = 3; o.fill.geometry.setDrawRange(0, 0); o.fillS = 0; scene.add(o.fill);
      o.ring.material.polygonOffset = true; o.ring.material.polygonOffsetFactor = -1; o.ring.material.polygonOffsetUnits = -1; o.ring.renderOrder = 2; }
    const col = o.owner >= 0 ? TEAM_COL[o.owner] : 0xe8e8e8; o.ring.material.color.setHex(col); o.flagM.color.setHex(col);
    const dt = Math.min(.1, M.t - (o.hudT === undefined ? M.t : o.hudT)), k = 1 - Math.exp(-dt * 7); o.hudT = M.t;                                     // todo lo que se ve se suaviza: sin saltos aunque la captura suba y baje
    o.ring.material.opacity = o.contested ? .4 + .1 * Math.sin(M.t * 3) : .45;
    const fy = 3.7 - (o.capBy >= 0 && o.owner >= 0 ? o.cap * 1.6 : 0); o.flagY = o.flagY === undefined ? fy : o.flagY + (fy - o.flagY) * k; o.flag.position.y = o.flagY; o.flag.rotation.y = Math.sin(M.t * 2.1 + o.x) * .25;
    const prog = o.capBy >= 0 ? o.cap : 0; o.fillS += (prog - o.fillS) * k; if (Math.abs(prog - o.fillS) < .004) o.fillS = prog;
    const vis = o.fill.visible ? o.fillS > .004 : o.fillS > .02; o.fill.visible = vis;
    if (vis) { const seg = Math.max(1, Math.min(128, Math.round(o.fillS * 128))); if (seg !== o.fillSeg) { o.fillSeg = seg; o.fill.geometry.setDrawRange(0, seg * 6); } }
    if (o.fill.visible) o.fill.material.color.setHex(TEAM_COL[o.capBy]);
  }
}
/* marcador de dominio (arriba en el centro) y barra de captura (abajo en el centro, sólo dentro de un punto) */
{ const st = document.createElement('style'); st.textContent = `
#domScore{position:fixed;left:50%;top:calc(6px + env(safe-area-inset-top));transform:translateX(-50%);z-index:3;pointer-events:none;display:none;gap:3px;align-items:center;font:800 12px/1 system-ui,-apple-system,sans-serif;font-variant-numeric:tabular-nums;text-shadow:0 1px 2px #000}
#domScore .f{position:relative;min-width:30px;padding:2px 3px 4px;border-radius:5px;background:#0b0f18b8;text-align:center}#domScore .f.me{box-shadow:inset 0 0 0 1px #ffffff55}
#domScore .f i{position:absolute;left:3px;right:3px;bottom:1px;height:2px;background:#ffffff1c;border-radius:1px;overflow:hidden}#domScore .f i b{display:block;height:100%}
#domScore .f em.r{font-style:normal;font-size:8px;font-weight:700;margin-left:2px;opacity:.9;color:#dfe6f2}#domScore .f em.r.low{color:#ff6a4a}#domScore .f em.r.dead{color:#ff3b30}#domScore .f em.r.atk{animation:refAtk .55s steps(2,jump-none) infinite}@keyframes refAtk{50%{opacity:.25;color:#ff5a48}}
#domScore .f s{text-decoration:none;font-size:8px;opacity:.75;margin-left:2px;font-weight:700}#domScore .m{font-size:8px;opacity:.6;margin-left:2px;font-weight:700}
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
  domEl.innerHTML = [0, 1, 2, 3].map(t => '<div class="f' + (pl && t === pl.team ? ' me' : '') + '" style="color:' + hex(t) + '">' + SQ.score[t] + '<s>' + held[t] + '⚑</s>' + (MX.REF && MX.REF.on ? '<em class="r' + (MX.REF.destroyed[t] ? ' dead' : MX.REF.attacked(t) ? ' atk' : '') + (MX.REF.pct[t] < 30 ? ' low' : '') + '">' + (MX.REF.eliminated[t] ? 'ELIM.' : MX.REF.destroyed[t] ? '✖' : Math.ceil(MX.REF.pct[t]) + '%') + '</em>' : '') + '<i><b style="width:' + Math.min(100, SQ.score[t] / META * 100) + '%;background:' + hex(t) + '"></b></i></div>').join('') + '<span class="m">/' + META + '</span>';
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
  if (k === 'shot' && last && last.k === 'shot' && M.t - last.t < .15 && Math.sqrt((last.x - x) * (last.x - x) + (last.z - z) * (last.z - z)) < 6) return;   // ráfagas: un evento cada 0,15 s por zona
  if (k === 'hit') { for (let i = CMB.length - 1; i >= 0 && M.t - CMB[i].t < .5; i--) if (CMB[i].k === 'hit' && CMB[i].vic === vic && Math.hypot(CMB[i].x - x, CMB[i].z - z) < 8) return; }
  CMB.push({ x, z, t: M.t, k, team: team === undefined ? -1 : team, vic: vic === undefined ? -1 : vic }); if (CMB.length > 1500) CMB.splice(0, CMB.length - 1500); };
/* qué ve la facción `team` desde (px,pz): los disparos y explosiones que oye (a su alcance) y, a cualquier distancia, el fuego contra su facción */
SQ.combatCells = (t, x, z, a) => combatCells(t, x, z, a || FADE);
function combatCells(team, px, pz, maxAge) {
  const cells = new Map();
  for (const e of CMB) { const age = M.t - e.t; if (age > maxAge) continue;
    const ally = e.vic === team, d = Math.sqrt((e.x - px) * (e.x - px) + (e.z - pz) * (e.z - pz));
    if (!ally && (e.k === 'hit' || (e.k === 'shot' && d > HEAR_R) || (e.k === 'boom' && d > BOOM_R))) continue;
    const key = (ally ? 'a' : 'f') + Math.floor(e.x / 20) + ',' + Math.floor(e.z / 20), c = cells.get(key) || { x: 0, z: 0, w: 0, boom: 0, young: 99, ally };
    const w = (e.k === 'boom' ? 6 : e.k === 'hit' ? 3 : 1) * (1 - age / maxAge); c.x += e.x * w; c.z += e.z * w; c.w += w; if (e.k === 'boom') c.boom = Math.max(c.boom, 1 - age / maxAge); c.young = Math.min(c.young, age); cells.set(key, c); }
  return [...cells.values()].filter(c => c.w > 0);
}
const TM = { open: false, cv: null, ctx: null, base: null, baseKey: '', t0: 0 };
const mapEl = document.createElement('div');
mapEl.style.cssText = 'position:fixed;inset:0;z-index:12;display:none;flex-direction:column;gap:6px;align-items:center;justify-content:center;background:#05070bcc;backdrop-filter:blur(3px);-webkit-backdrop-filter:blur(3px)';
const mapCv = document.createElement('canvas'); mapCv.style.cssText = 'border-radius:10px;box-shadow:0 10px 40px #000c,0 0 0 1px #ffffff22';
const mapLeg = document.createElement('div'); mapLeg.style.cssText = 'position:static;max-width:94vw;text-align:center;line-height:1.5;font:600 clamp(9px,1.6vw,12px) system-ui,-apple-system,sans-serif;color:#dfe6f2;background:#0b0f18d0;border:1px solid #ffffff1c;border-radius:8px;padding:4px 10px;white-space:normal;text-shadow:0 1px 2px #000';
mapLeg.innerHTML = '<span style="color:#4ee08a">✚</span> curación (verde: con médico) <span style="color:#4ee08a">+</span> botiquines <span style="color:#ffc24a">●</span> munición <span style="color:#6ab4ff">■</span> material <span style="color:#d28bff">★</span> equipo · <b>toca el mapa: marca y ruta</b> &nbsp; <span style="color:#ff7a2a">●</span> disparos que oyes (150 m) &nbsp; <span style="color:#ff4a4a">●</span> aliados bajo fuego &nbsp; <span style="color:#ffd24a">✸</span> explosión &nbsp; <span style="color:#ff4a2a">▲</span> incendio &nbsp; <span style="color:#fff">➤</span> tú &nbsp; ★ líder &nbsp; ◯ objetivo (color del dueño) &nbsp; · Share / M para cerrar';
const mapHead = document.createElement('div'); mapHead.style.cssText = 'font:700 clamp(10px,1.8vw,13px) system-ui,-apple-system,sans-serif;color:#dfe6f2;text-shadow:0 1px 2px #000;max-width:94vw;white-space:normal;text-align:center';
const mapSide = document.createElement('div'); mapSide.style.cssText = 'display:contents;flex-direction:column;gap:8px;justify-content:center';
mapHead.style.order = 0; mapCv.style.order = 1; mapLeg.style.order = 3; mapSide.append(mapHead, mapLeg); mapEl.append(mapSide, mapCv); document.body.appendChild(mapEl);
for (const ev of ['pointerdown', 'mousedown', 'touchstart']) mapEl.addEventListener(ev, e => { e.stopPropagation(); MX.mapClose(); });
/* MARCAR UN PUNTO: tocar el mapa pone una marca con la ruta sugerida desde tu posición (evita las zonas calientes si hay una alternativa razonable), la distancia y el tiempo; «Enviar escuadra» da la orden
   de avanzar a ese punto (hace falta llevar el mando) y «Borrar» la quita. Tocar fuera del mapa (o ○ / M) lo cierra. */
const mapBar = document.createElement('div'); mapBar.style.cssText = 'display:none;gap:8px;align-items:center;justify-content:center;flex-wrap:wrap;font:700 clamp(10px,1.8vw,13px) system-ui,-apple-system,sans-serif;color:#dfe6f2';
const mapInfo = document.createElement('span'); mapInfo.style.cssText = 'background:#0b0f18d0;border:1px solid #ffffff22;border-radius:999px;padding:3px 10px';
const mkBtn = (t, bg) => { const b = document.createElement('button'); b.textContent = t; b.style.cssText = 'font:700 clamp(10px,1.8vw,13px) system-ui,sans-serif;color:#fff;background:' + bg + ';border:1px solid #ffffff33;border-radius:999px;padding:4px 12px'; return b; };
const mapSend = mkBtn('✔ Enviar escuadra', '#1f7a45'), mapClr = mkBtn('✖ Borrar marca', '#444b5a'); mapBar.append(mapInfo, mapSend, mapClr); mapBar.style.order = 2; mapSide.insertBefore(mapBar, mapLeg);
for (const ev of ['pointerdown', 'mousedown', 'touchstart']) { mapBar.addEventListener(ev, e => e.stopPropagation()); }
mapEl.addEventListener('pointerdown', e => { if (e.target === mapEl) return; });
const routeLen = r => { let l = 0; for (let i = 1; i < r.length; i++) l += Math.hypot(r[i].x - r[i - 1].x, r[i].z - r[i - 1].z); return l; };
function routeExposure(r, hot) { let e = 0; for (let i = 1; i < r.length; i++) { const a = r[i - 1], b = r[i], L = Math.hypot(b.x - a.x, b.z - a.z), n = Math.max(1, Math.ceil(L / 8));
    for (let k = 0; k < n; k++) { const x = a.x + (b.x - a.x) * k / n, z = a.z + (b.z - a.z) * k / n; for (const h of hot) { const d = Math.hypot(x - h.x, z - h.z); if (d < 30) e += (30 - d) / 30; } } } return e; }
function planRoute(gx, gz, team) {
  const hot = combatCells(team, P.pos.x, P.pos.z, FADE).filter(h => h.w > 2).map(h => ({ x: h.x / h.w, z: h.z / h.w })), A = { x: P.pos.x, z: P.pos.z };
  const mk = (a, b) => { try { const p = MX.findPath(a.x, a.z, b.x, b.z); return p && p.length ? [a, ...p] : [a, b]; } catch (e) { return [a, b]; } };
  let best = mk(A, { x: gx, z: gz }), ex = routeExposure(best, hot), sc = routeLen(best) + ex * 90, detour = false;
  if (ex > 0 && hot.length) {                                                          // rodeo: por un punto a un lado de la zona caliente más peligrosa de la ruta
    let hz = null, hd = 1e9; for (const h of hot) for (const q of best) { const d = Math.hypot(q.x - h.x, q.z - h.z); if (d < hd) { hd = d; hz = h; } }
    const dx = gx - A.x, dz = gz - A.z, L = Math.hypot(dx, dz) || 1, nx = -dz / L, nz = dx / L;
    for (const side of [1, -1]) { const v = { x: hz.x + nx * side * 70, z: hz.z + nz * side * 70 }; if (!MX.navAt(v.x, v.z)) continue;
      const r1 = mk(A, v), r2 = mk(v, { x: gx, z: gz }), r = r1.concat(r2.slice(1)), e2 = routeExposure(r, hot), s2 = routeLen(r) + e2 * 90; if (s2 < sc - 20 && routeLen(r) < routeLen(best) * 1.9 + 60) { best = r; ex = e2; sc = s2; detour = true; } } }
  return { r: best, len: routeLen(best), ex, detour };
}
mapCv.addEventListener('pointerdown', e => { e.stopPropagation(); mapPick(e); });
for (const ev of ['mousedown', 'touchstart']) mapCv.addEventListener(ev, e => e.stopPropagation());
function mapPick(e) {
  const g = mapGeom(), rc = mapCv.getBoundingClientRect(); if (!rc.width) return; const px = (e.clientX - rc.left) * g.sz / rc.width, pz = (e.clientY - rc.top) * g.sz / rc.height, pl = MX.pl; if (!pl || pl.dead) return;
  const gx = Math.max(-g.half + 4, Math.min(g.half - 4, px / g.k - g.half)), gz = Math.max(-g.half + 4, Math.min(g.half - 4, pz / g.k - g.half));
  const pt = MX.navAt && !MX.navAt(gx, gz) ? null : { x: gx, z: gz };
  if (!pt) { toast('Ahí no se puede llegar (edificio o muro)'); return; }
  const R = planRoute(gx, gz, pl.team); TM.mark = { x: gx, z: gz, r: R.r, len: R.len, ex: R.ex, detour: R.detour, t: M.t }; mapBarUpdate(); if (TM.open) mapDraw();
}
function mapBarUpdate() {
  const m = TM.mark; mapBar.style.display = m ? 'flex' : 'none'; if (!m) return; const s = Math.round(m.len / 5.4), lead = MX.pl && MX.pl.sqd && MX.pl.sqd.playerLead;
  mapInfo.innerHTML = 'Marca · ' + Math.round(m.len) + ' m · ~' + Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0') + (m.detour ? ' · <span style="color:#7ee0ff">rodea la zona caliente</span>' : m.ex > 0 ? ' · <span style="color:#ff9a4a">⚠ cruza zona caliente</span>' : '') + (lead ? '' : ' · <span style="color:#ffd24a">sin el mando de la escuadra</span>');
}
mapSend.onclick = () => { const m = TM.mark, pl = MX.pl, s = pl && pl.sqd; if (!m || !s) return; if (!s.playerLead) { toast('No tienes el mando de tu escuadra (Mochila → Escuadra → Tomar el mando)'); return; }
  s.order = { type: 'move', x: m.x, z: m.z, face: Math.atan2(m.x - P.pos.x, m.z - P.pos.z), pts: new Map() }; for (const q of s.members) if (q.bot) { q.goal = null; q.path = null; if (q.st === 'search') q.st = 'push'; }
  toast('Orden: avanzar a la marca · ' + Math.round(m.len) + ' m'); s.expandT = M.t; SQ.expandT = M.t; TM.mark = null; mapBarUpdate(); MX.mapClose(); };
mapClr.onclick = () => { TM.mark = null; mapBarUpdate(); if (TM.open) mapDraw(); };
/* suministros conocidos, agrupados por celdas de 36 m: médicos (cajas médicas y farmacias), munición, material y equipo; sólo mientras queda algo. Se recalcula cada 2 s. */
function supplyCells() {
  if (TM.supT !== undefined && M.t - TM.supT < 2 && TM.sup) return TM.sup; TM.supT = M.t; const cells = new Map(), K = { supplyMed: 'med', pharmaCab: 'med', supplyAmmo: 'ammo', locker: 'ammo', supplyMat: 'mat', storeMat: 'eq' };
  for (const p of props) { const k = K[p.type]; if (!k || p.dead || !p.stock) continue; let n = 0; for (const v in p.stock) n += p.stock[v]; if (n <= 0) continue;
    const CS = k === 'med' || k === 'eq' ? 36 : 80, key = k + Math.floor(p.x / CS) + ',' + Math.floor(p.z / CS); let c = cells.get(key); if (!c) cells.set(key, c = { k, x: 0, z: 0, n: 0 }); c.x += p.x; c.z += p.z; c.n++; }
  TM.sup = [...cells.values()].map(c => ({ k: c.k, x: c.x / c.n, z: c.z / c.n, n: c.n })); return TM.sup;
}
const SUP_COL = { med: '#4ee08a', ammo: '#ffc24a', mat: '#6ab4ff', eq: '#d28bff' }, SUP_TXT = { med: '+', ammo: '●', mat: '■', eq: '★' };

MX.mapToggle = () => TM.open ? MX.mapClose() : mapOpen();
MX.mapClose = () => { TM.open = false; mapEl.style.display = 'none'; MX.mapDock(false); };
/* con el inventario al lado (Share): el mapa se arrima a la izquierda y deja sitio al panel de la derecha */
MX.mapDock = on => { TM.dock = !!on; mapEl.style.alignItems = on ? 'flex-start' : 'center'; mapEl.style.paddingLeft = on ? 'calc(14px + env(safe-area-inset-left))' : '0'; if (TM.open) mapDraw(); };
Object.defineProperty(MX, 'mapOpen', { get: () => TM.open });
addEventListener('keydown', ev => { if (ev.code === 'KeyM' && !ev.repeat && MX.on && MX.campaign && !menuOpen) { ev.preventDefault(); MX.mapToggle(); } });
function mapOpen() { if (!MX.on || !MX.campaign || menuOpen) return; TM.open = true; mapEl.style.display = 'flex'; TM.t0 = M.t; if (TM.mark && M.t - TM.mark.t > 90) TM.mark = null; mapBarUpdate(); mapDraw(); }
function mapGeom() {                                                                   // tamaño del lienzo (cabe en pantalla) y escala mundo → píxeles
  const half = (MAPA.built && MAPA.built.half) || (typeof WORLD !== 'undefined' ? Math.max(WORLD.x, WORLD.z) : 50), avail = TM.dock ? innerWidth - Math.min(340, innerWidth * .46) - 44 : innerWidth * .94;
  /* apaisado en un móvil (poca altura): el mapa ocupa casi toda la altura y cabecera, marca y leyenda van en una columna a su lado (antes la leyenda se comía la mitad del mapa) */
  const land0 = innerHeight < 520 && innerWidth > innerHeight * 1.4, W = Math.max(210, Math.min(300, Math.floor(innerWidth * .3)));
  /* con la mochila al lado (Share) en un móvil apaisado: sólo el mapa, a toda la altura y en el hueco de la izquierda (cabecera y leyenda ocultas; la barra de la marca sí) */
  if (land0 && TM.dock) { mapHead.style.display = mapLeg.style.display = 'none'; if (TM.land !== 'dock') { TM.land = 'dock'; mapSide.style.display = 'contents'; mapEl.style.flexDirection = 'column'; mapEl.style.gap = '6px'; mapSide.style.width = ''; }
    mapBar.style.justifyContent = 'center'; const sz = Math.max(120, Math.min(Math.floor(avail), Math.floor(innerHeight - 20 - (mapBar.style.display !== 'none' ? mapBar.offsetHeight + 6 : 0)))); return { half, sz, k: sz / (2 * half) }; }
  mapHead.style.display = mapLeg.style.display = '';
  const land = land0;
  if (TM.land !== land) { TM.land = land; mapSide.style.display = land ? 'flex' : 'contents'; mapEl.style.flexDirection = land ? 'row' : 'column'; mapEl.style.gap = land ? '14px' : '6px'; }
  if (land) { mapSide.style.width = W + 'px'; mapHead.style.maxWidth = mapLeg.style.maxWidth = W + 'px'; mapHead.style.textAlign = 'left'; mapLeg.style.textAlign = 'left'; mapBar.style.justifyContent = 'flex-start';
    const sz = Math.max(120, Math.min(Math.floor(avail - W - 14), Math.floor(innerHeight - 20))); return { half, sz, k: sz / (2 * half) }; }
  mapHead.style.textAlign = 'center'; mapLeg.style.textAlign = 'center'; mapBar.style.justifyContent = 'center'; mapSide.style.width = '';
  const sz0 = Math.floor(Math.min(avail, innerHeight * .97));
  mapHead.style.maxWidth = mapLeg.style.maxWidth = Math.max(260, sz0) + 'px';                                   // cabecera y leyenda del ancho del mapa (se parten en líneas) y su altura real se descuenta: nada tapa el mapa
  const sz = Math.max(120, Math.min(sz0, Math.floor(innerHeight - Math.max(mapHead.offsetHeight, 34) - mapLeg.offsetHeight - (mapBar.style.display !== 'none' ? mapBar.offsetHeight + 6 : 0) - 6 * 2 - 24 - 8)));
  return { half, sz, k: sz / (2 * half) };
}
/* La capa fija del mapa (suelo, zonas, calles, edificios, refugios) se dibuja UNA vez a 1024 px, independiente del tamaño de la pantalla y de la interfaz: el mapa grande y el minimapa solo la escalan
   (antes se rehacía —~90 ms— cada vez que cambiaba el tamaño del lienzo o se destruía un edificio, y el minimapa leía medidas del DOM 10 veces por segundo). Se precalienta al empezar la partida. */
function mapG0() { const half = (MAPA.built && MAPA.built.half) || (typeof WORLD !== 'undefined' ? Math.max(WORLD.x, WORLD.z) : 50); return { half, sz: 1024, k: 1024 / (2 * half) }; }
function mapBase(g0) {                                                                 // capa fija: suelo, zonas, calles, edificios, refugios
  const g = mapG0(), key = g.half + '|' + (MAPA.built ? MAPA.built.half : 0) + '|' + (MAPA.built && MAPA.built.info ? MAPA.built.info.zones.length : 0); if (TM.baseKey === key && TM.base) return TM.base;
  const c = document.createElement('canvas'), dpr = 1; c.width = c.height = 1024; const x = c.getContext('2d'); x.scale(dpr, dpr);
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
  TM.base = c; TM.baseKey = key; TM.bmp = null; if (typeof createImageBitmap === 'function') createImageBitmap(c).then(bm => { if (TM.base === c) TM.bmp = bm; }).catch(() => { });   // copia inmutable para el minimapa (dibujar desde un lienzo obliga a refrescar su instantánea)
  return c;
}
/* ---- ALIADOS EN LOS MAPAS (minimapa y mapa táctico): tu escuadra siempre suelta (color de su clase y su inicial en el mapa grande); el resto de tu facción AGRUPADO en celdas (10 m en el
   minimapa, 14 m en el mapa grande): un punto si es uno solo, un círculo con el número si son varios, así nunca se amontonan; aro ámbar si hay abatidos y estrella si lleva un líder.
   En el minimapa, los grupos fuera del radio salen como flechas en el borde con su número (por sectores de 22,5°). En el mapa grande, cada escuadra dibuja una línea suave a su objetivo. ---- */
/* TEXTO Y DEGRADADOS DEL MINIMAPA EN CACHÉ: dibujar texto (fillText/strokeText) y crear degradados radiales 10 veces por segundo provocaba paradas de 40–60 ms en el lienzo 2D (medido: sin el minimapa
   el peor fotograma pasaba de 88 a 27 ms). Cada número/etiqueta se pinta una vez en un lienzo pequeño (a 2× de resolución) y después solo se copia con drawImage; igual con las manchas de fuego. */
const TXC = new Map(), BLC = new Map();
function drawTxt(x, text, cx, cy, size, weight, fill, stroke) {
  const key = text + '|' + size + '|' + weight + '|' + fill + '|' + (stroke || ''); let c = TXC.get(key);
  if (!c) { const w = Math.ceil(size * .75 * text.length + 8), h = Math.ceil(size * 1.6) + 4; c = document.createElement('canvas'); c.width = w * 2; c.height = h * 2; const g = c.getContext('2d'); g.scale(2, 2);
    g.font = weight + ' ' + size + 'px system-ui,sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; if (stroke) { g.strokeStyle = stroke; g.lineWidth = 2.4; g.strokeText(text, w / 2, h / 2); } g.fillStyle = fill; g.fillText(text, w / 2, h / 2); c.__w = w; c.__h = h; TXC.set(key, c); }
  x.drawImage(c, cx - c.__w / 2, cy - c.__h / 2, c.__w, c.__h);
}
function drawBlob(x, px, pz, r, rgb, alpha) {
  let c = BLC.get(rgb); if (!c) { c = document.createElement('canvas'); c.width = c.height = 64; const g = c.getContext('2d'), gr = g.createRadialGradient(32, 32, 0, 32, 32, 32); gr.addColorStop(0, 'rgba(' + rgb + ',1)'); gr.addColorStop(1, 'rgba(' + rgb + ',0)'); g.fillStyle = gr; g.fillRect(0, 0, 64, 64); BLC.set(rgb, c); }
  const ga = x.globalAlpha; x.globalAlpha = ga * alpha; x.drawImage(c, px - r, pz - r, 2 * r, 2 * r); x.globalAlpha = ga;
}
function friendClusters(team, cell, mineSq) {
  const cells = new Map(), mine = []; let n = 0;
  for (let i = 0; i < M.ents.length; i++) { const e = M.ents[i]; if (e.dead || e.team !== team || e.isPlayer) continue; n++;
    if (mineSq && e.sqd === mineSq) { mine.push(e); continue; }
    const k = Math.floor(e.p.x / cell) * 4096 + Math.floor(e.p.z / cell); let c = cells.get(k); if (!c) cells.set(k, c = { x: 0, z: 0, n: 0, dwn: 0, lead: 0 }); c.x += e.p.x; c.z += e.p.z; c.n++; if (e.dwn) c.dwn++; if (e.sqd && e.sqd.leader === e) c.lead++; }
  const groups = []; for (const c of cells.values()) { c.x /= c.n; c.z /= c.n; groups.push(c); } return { mine, groups, total: n };
}
function drawFriends(x, toPx, size, team, mineSq, big, rEdge) {
  const col = '#' + TEAM_COL[team].toString(16).padStart(6, '0'), F = friendClusters(team, big ? 14 : 10, mineSq), bins = new Array(16).fill(0), cx0 = size / 2;
  for (const c of F.groups) { const [px, pz] = toPx(c.x, c.z);
    if (rEdge ? Math.hypot(px - cx0, pz - cx0) > cx0 - 4 : (px < 0 || pz < 0 || px > size || pz > size)) { if (rEdge) { const a = Math.atan2(pz - cx0, px - cx0); bins[((Math.round(a / (Math.PI / 8)) % 16) + 16) % 16] += c.n; } continue; }
    if (c.n === 1) { x.globalAlpha = .62; x.fillStyle = c.dwn ? '#ffb020' : col; x.beginPath(); x.arc(px, pz, big ? 2.6 : 2.1, 0, 6.283); x.fill(); x.globalAlpha = 1; }
    else { const r = Math.min(big ? 13 : 9, (big ? 5 : 3.6) + Math.sqrt(c.n) * (big ? 1.7 : 1.2));
      x.globalAlpha = .28; x.fillStyle = col; x.beginPath(); x.arc(px, pz, r + 2.5, 0, 6.283); x.fill(); x.globalAlpha = .92; x.beginPath(); x.arc(px, pz, r, 0, 6.283); x.fill(); x.globalAlpha = 1;
      x.strokeStyle = c.dwn ? '#ffb020' : '#ffffffcc'; x.lineWidth = c.dwn ? 2 : 1.1; x.beginPath(); x.arc(px, pz, r, 0, 6.283); x.stroke();
      drawTxt(x, String(c.n), px, pz + .5, Math.round(r * 1.05), 800, '#0b0f18');
      if (c.lead && big) drawTxt(x, '★', px, pz - r - 5, 9, 700, '#fff'); } }
  for (const e of F.mine) { const [px, pz] = toPx(e.p.x, e.p.z), cl = MX.classOf ? MX.classOf(e) : null, cc = cl ? '#' + cl.col.toString(16).padStart(6, '0') : col;
    if (px < -4 || pz < -4 || px > size + 4 || pz > size + 4) continue;
    x.fillStyle = e.dwn ? '#ffb020' : cc; x.strokeStyle = '#0b0f18'; x.lineWidth = 1.2; x.beginPath(); x.arc(px, pz, big ? 4.4 : 3.3, 0, 6.283); x.fill(); x.stroke();
    if (big && cl) drawTxt(x, cl.tag, px, pz + .4, 7, 800, '#0b0f18');
    if (e.sqd && e.sqd.leader === e) drawTxt(x, '★', px, pz - (big ? 9 : 7), 9, 700, '#fff'); }
  if (rEdge) for (let b = 0; b < 16; b++) { const n = bins[b]; if (!n) continue; const a = b * Math.PI / 8, ex = cx0 + Math.cos(a) * (cx0 - 8), ez = cx0 + Math.sin(a) * (cx0 - 8);
    x.save(); x.translate(ex, ez); x.rotate(a); x.fillStyle = col; x.globalAlpha = .9; x.beginPath(); x.moveTo(6, 0); x.lineTo(-3.5, -4.6); x.lineTo(-3.5, 4.6); x.closePath(); x.fill(); x.restore();
    x.globalAlpha = 1; drawTxt(x, String(n), cx0 + Math.cos(a) * (cx0 - 19), cx0 + Math.sin(a) * (cx0 - 19), 9, 800, '#fff', '#000b'); }
  return F;
}
function mapDraw() {
  if (!TM.open) return;
  const g = mapGeom(), dpr = Math.min(2, devicePixelRatio || 1); if (mapCv.width !== Math.round(g.sz * dpr)) { mapCv.width = mapCv.height = Math.round(g.sz * dpr); mapCv.style.width = mapCv.style.height = g.sz + 'px'; }
  const x = mapCv.getContext('2d'); x.setTransform(dpr, 0, 0, dpr, 0, 0); x.drawImage(mapBase(g), 0, 0, g.sz, g.sz);
  const P2 = v => (v + g.half) * g.k, pl = MX.pl, team = pl ? pl.team : 0, col = t => '#' + TEAM_COL[t].toString(16).padStart(6, '0');
  /* fuego: los disparos que se oyen (≤ 150 m de ti; explosiones ≤ 250 m) y, a cualquier distancia, el fuego contra tu facción (rojo, late); se apagan en 20 s */
  const cells = combatCells(team, P.pos.x, P.pos.z, FADE), pulse = .5 + .5 * Math.sin(M.t * 6);
  { const H = combatCells(team, P.pos.x, P.pos.z, 75); for (const h of H) { if (h.young < 5) continue; drawBlob(x, P2(h.x / h.w), P2(h.z / h.w), Math.min(34, 10 + Math.sqrt(h.w) * 4), h.ally ? '255,60,60' : '255,140,40', Math.min(.34, .08 + h.w * .02)); } }   // zonas calientes: actividad de los últimos 75 s (mancha tenue)
  if (pl) { x.strokeStyle = '#ffffff22'; x.setLineDash([3, 4]); x.lineWidth = 1; x.beginPath(); x.arc(P2(P.pos.x), P2(P.pos.z), HEAR_R * g.k, 0, 6.283); x.stroke(); x.setLineDash([]); }   // alcance del oído
  for (const h of cells) { const cx = P2(h.x / h.w), cz = P2(h.z / h.w), r = Math.min(26, 6 + Math.sqrt(h.w) * 3.2), a = Math.min(.85, .25 + h.w * .05), rgb = h.ally ? '255,60,60' : '255,140,40';
    const gr = x.createRadialGradient(cx, cz, 0, cx, cz, r); gr.addColorStop(0, 'rgba(' + rgb + ',' + a + ')'); gr.addColorStop(1, 'rgba(' + rgb + ',0)'); x.fillStyle = gr; x.beginPath(); x.arc(cx, cz, r, 0, 6.283); x.fill();
    if (h.young < 3) { x.strokeStyle = h.ally ? 'rgba(255,110,110,' + (.5 + .5 * pulse) + ')' : 'rgba(255,190,90,' + (.4 + .5 * pulse) + ')'; x.lineWidth = h.ally ? 2.2 : 1.5; x.beginPath(); x.arc(cx, cz, r * .55 + pulse * 3, 0, 6.283); x.stroke(); }   // ahora mismo: late
    if (h.boom > 0) { x.fillStyle = 'rgba(255,215,80,' + (.4 + .6 * h.boom) + ')'; x.font = '700 ' + Math.round(10 + 6 * h.boom) + 'px system-ui'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText('✸', cx, cz); }
    if (h.ally && h.young < 6) { x.fillStyle = '#ff8a8a'; x.font = '800 10px system-ui'; x.textAlign = 'center'; x.textBaseline = 'bottom'; x.fillText('ALIADOS BAJO FUEGO', cx, cz - r * .6 - 2); } }
  if (typeof FIRES !== 'undefined') for (const f of FIRES) { x.fillStyle = '#ff4a2a'; x.beginPath(); const fx = P2(f.x), fz = P2(f.z); x.moveTo(fx, fz - 5); x.lineTo(fx + 4.5, fz + 3.5); x.lineTo(fx - 4.5, fz + 3.5); x.closePath(); x.fill(); }
  for (const c of supplyCells()) { const minor = c.k === 'ammo' || c.k === 'mat'; x.globalAlpha = minor ? .6 : 1; drawTxt(x, SUP_TXT[c.k], P2(c.x), P2(c.z), c.k === 'eq' ? 13 : minor ? 7 : 11, 800, SUP_COL[c.k], '#000c'); } x.globalAlpha = 1;
  if (MX.stations) for (const st of MX.stations.list) { const cx = P2(st.x), cz = P2(st.z), on = st.act[team] > 0 && M.t - st.act[team] < .7; if (!on && st.n < 2) continue;
    x.fillStyle = '#0b0f18d8'; x.strokeStyle = on ? '#4ee08a' : '#8d98a8'; x.lineWidth = on ? 2 : 1.3; x.beginPath(); x.arc(cx, cz, 5.2, 0, 6.283); x.fill(); x.stroke(); drawTxt(x, '✚', cx, cz + .5, 8, 800, on ? '#4ee08a' : '#aab4c2'); }
  /* objetivos con el color del dueño y su progreso de captura */
  for (const o of SQ.objs) { const cx = P2(o.x), cz = P2(o.z), r = Math.max(4, o.r * g.k); x.lineWidth = 2.2; x.strokeStyle = o.owner >= 0 ? col(o.owner) : '#e8e8e8'; x.globalAlpha = o.contested ? .5 + .5 * pulse : 1; x.beginPath(); x.arc(cx, cz, r, 0, 6.283); x.stroke(); x.globalAlpha = 1;
    if (o.capBy >= 0 && o.cap > 0) { x.strokeStyle = col(o.capBy); x.lineWidth = 3; x.beginPath(); x.arc(cx, cz, r + 3, -1.571, -1.571 + 6.283 * o.cap); x.stroke(); }
    if (o.refuge && MX.REF && MX.REF.on) { const R = MX.REF, a = R.attacked(o.home); x.save(); x.font = '800 12px system-ui,sans-serif'; x.textAlign = 'center'; x.fillStyle = R.pct[o.home] < 30 || R.destroyed[o.home] ? '#ff6a4a' : '#fff'; if (a) x.globalAlpha = .45 + .55 * pulse; x.fillText(R.destroyed[o.home] ? 'DESTRUIDO' : '⌂ ' + Math.ceil(R.pct[o.home]) + '%' + (a ? ' ¡ATACADO!' : ''), cx, cz - r - 6); if (a) { x.strokeStyle = '#ff3b30'; x.lineWidth = 3; x.beginPath(); x.arc(cx, cz, r + 6 + pulse * 3, 0, 6.283); x.stroke(); } x.restore(); }
    if (o.pile && o.pile.n > 0 && o.owner === MX.pl.team) { x.save(); x.fillStyle = '#ffd86a'; x.font = '700 11px system-ui,sans-serif'; x.textAlign = 'left'; x.fillText('▣ ' + o.pile.n + '/60', cx + r + 4, cz + 4); x.restore(); }
    if (o.code) { x.globalAlpha = 1; x.fillStyle = o.owner >= 0 ? col(o.owner) : '#0c1018'; x.font = '800 ' + Math.max(11, Math.round(r * 1.1)) + 'px system-ui,sans-serif'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText(o.code, cx, cz); } }
  /* aliados (los enemigos no se ven): tu escuadra suelta con la clase de cada uno; el resto agrupado por zonas con su número; cada escuadra dibuja una línea suave a su objetivo */
  const ps = pl && pl.sqd;
  x.lineWidth = 1.2; x.setLineDash([3, 4]); for (const q of SQ.list) { if (q.team !== team || q === ps || !q.mission || q.mission.x === undefined) continue; let ax = 0, az = 0, an = 0; for (const m of q.members) if (!m.dead) { ax += m.p.x; az += m.p.z; an++; } if (!an) continue;
    x.strokeStyle = col(team); x.globalAlpha = .32; x.beginPath(); x.moveTo(P2(ax / an), P2(az / an)); x.lineTo(P2(q.mission.x), P2(q.mission.z)); x.stroke(); }
  x.setLineDash([]); x.globalAlpha = 1;
  const FR = drawFriends(x, (wx, wz) => [P2(wx), P2(wz)], g.sz, team, ps, true, false);
  if (TM.mark) { const m = TM.mark; x.save(); x.lineWidth = 2.2; x.setLineDash([6, 5]); x.lineDashOffset = -M.t * 14; x.strokeStyle = m.ex > 0 ? '#ff9a4a' : m.detour ? '#7ee0ff' : '#ffffff'; x.globalAlpha = .9; x.beginPath();
    m.r.forEach((q, i) => { const px = P2(q.x), pz = P2(q.z); if (i) x.lineTo(px, pz); else x.moveTo(P2(P.pos.x), P2(P.pos.z)); }); x.stroke(); x.restore();
    const mx = P2(m.x), mz = P2(m.z), pu = .5 + .5 * Math.sin(M.t * 5); x.strokeStyle = '#ffd24a'; x.lineWidth = 2; x.beginPath(); x.arc(mx, mz, 7 + pu * 3, 0, 6.283); x.stroke(); x.fillStyle = '#ffd24a'; x.beginPath(); x.arc(mx, mz, 3, 0, 6.283); x.fill();
    drawTxt(x, Math.round(m.len) + ' m', mx, mz - 15, 11, 800, '#fff', '#000c'); }
  if (ps && ps.playerLead && ps.order && ps.order.x !== undefined) { const ox = P2(ps.order.type === 'cover' ? ps.order.tx : ps.order.x), oz = P2(ps.order.type === 'cover' ? ps.order.tz : ps.order.z); x.strokeStyle = ps.order.type === 'cover' ? '#ff7a3a' : ps.order.type === 'move' ? '#4aa0ff' : '#6dff9a'; x.lineWidth = 2; x.setLineDash([4, 3]); x.beginPath(); x.moveTo(P2(P.pos.x), P2(P.pos.z)); x.lineTo(ox, oz); x.stroke(); x.setLineDash([]); x.beginPath(); x.arc(ox, oz, 5, 0, 6.283); x.stroke(); }
  if (pl && !pl.dead) { const cx = P2(P.pos.x), cz = P2(P.pos.z), a = P.aim; x.save(); x.translate(cx, cz); x.rotate(-a + Math.PI); x.fillStyle = '#fff'; x.strokeStyle = '#000'; x.lineWidth = 1.5; x.beginPath(); x.moveTo(0, -9); x.lineTo(6, 6); x.lineTo(0, 3); x.lineTo(-6, 6); x.closePath(); x.fill(); x.stroke(); x.restore(); }
  /* encabezado: facción, objetivos por facción y combate activo */
  const live = cells.filter(h => !h.ally && h.young < 5).length, allyF = cells.filter(h => h.ally && h.young < 8).length, own = [0, 0, 0, 0]; for (const o of SQ.objs) if (o.owner >= 0) own[o.owner]++;
  let h = '<span style="color:' + col(team) + '">MAPA TÁCTICO · ' + TN[team].toUpperCase() + '</span>' + (live ? ' · <span style="color:#ff9a4a">' + live + (live === 1 ? ' zona con disparos cerca' : ' zonas con disparos cerca') + '</span>' : ' · sin disparos cerca') + (allyF ? ' · <span style="color:#ff6a6a">' + allyF + (allyF === 1 ? ' grupo aliado bajo fuego' : ' grupos aliados bajo fuego') + '</span>' : '');
  h += ' · <span style="color:' + col(team) + '">' + (FR.total + (pl && !pl.dead ? 1 : 0)) + ' en pie</span>';
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
  const tb0 = performance.now(); const G = mapG0(), base0 = mapBase(G), base = TM.bmp || base0; SQ.pm.mbase = Math.max(SQ.pm.mbase || 0, performance.now() - tb0); const k = size / (2 * MM.R), cx = P.pos.x, cz = P.pos.z, pl = MX.pl, team = pl ? pl.team : 0, col = t => '#' + TEAM_COL[t].toString(16).padStart(6, '0');
  const m0 = performance.now(); x.fillStyle = '#1d2619'; x.fillRect(0, 0, size, size);
  const bs = base0.width / G.sz; x.drawImage(base, (cx - MM.R + G.half) * G.k * bs, (cz - MM.R + G.half) * G.k * bs, 2 * MM.R * G.k * bs, 2 * MM.R * G.k * bs, 0, 0, size, size);
  const m1 = performance.now(); SQ.pm.m_base = Math.max(SQ.pm.m_base || 0, m1 - m0);
  const W2 = (wx, wz) => [(wx - cx + MM.R) * k, (wz - cz + MM.R) * k], pulse = .5 + .5 * Math.sin(M.t * 6);
  for (const h of combatCells(team, cx, cz, FADE)) { let [px, pz] = W2(h.x / h.w, h.z / h.w); const out = px < 6 || pz < 6 || px > size - 6 || pz > size - 6;
    if (out) { if (!h.ally) continue; const dx = px - size / 2, dz = pz - size / 2, l = Math.sqrt((dx) * (dx) + (dz) * (dz)) || 1; px = size / 2 + dx / l * (size / 2 - 9); pz = size / 2 + dz / l * (size / 2 - 9);   // aliados bajo fuego fuera del minimapa: flecha en el borde
      x.save(); x.translate(px, pz); x.rotate(Math.atan2(dz, dx)); x.fillStyle = 'rgba(255,80,80,' + (.6 + .4 * pulse) + ')'; x.beginPath(); x.moveTo(7, 0); x.lineTo(-4, -5); x.lineTo(-4, 5); x.closePath(); x.fill(); x.restore(); continue; }
    const r = Math.min(14, 4 + Math.sqrt(h.w) * 2), rgb = h.ally ? '255,60,60' : '255,140,40'; drawBlob(x, px, pz, r, rgb, Math.min(.9, .3 + h.w * .06));
    if (h.young < 2.5) { x.strokeStyle = 'rgba(' + rgb + ',' + (.5 + .5 * pulse) + ')'; x.lineWidth = 1.4; x.beginPath(); x.arc(px, pz, r * .5 + pulse * 2, 0, 6.283); x.stroke(); } }
  const m2 = performance.now(); SQ.pm.m_cells = Math.max(SQ.pm.m_cells || 0, m2 - m1);
  for (const o of SQ.objs) { const [px, pz] = W2(o.x, o.z); if (px < -10 || pz < -10 || px > size + 10 || pz > size + 10) continue; x.strokeStyle = o.owner >= 0 ? col(o.owner) : '#e8e8e8'; x.lineWidth = 1.6; x.beginPath(); x.arc(px, pz, Math.max(3, o.r * k), 0, 6.283); x.stroke(); if (o.code) drawTxt(x, o.code, px, pz, 9, 800, o.owner >= 0 ? col(o.owner) : '#0c1018'); }
  if (MX.REF && MX.REF.on) for (const o of SQ.objs) { if (!o.refuge) continue; const [px, pz] = W2(o.x, o.z); if (px < -10 || pz < -10 || px > size + 10 || pz > size + 10) continue; const R = MX.REF, atk = R.attacked(o.home), low = R.pct[o.home] < 30;
    if (atk || low || R.destroyed[o.home]) { x.strokeStyle = 'rgba(255,60,48,' + (atk ? .4 + .6 * pulse : .8) + ')'; x.lineWidth = 2; x.beginPath(); x.arc(px, pz, Math.max(5, o.r * k) + 3, 0, 6.283); x.stroke(); }
    drawTxt(x, R.destroyed[o.home] ? '✖' : Math.ceil(R.pct[o.home]) + '%', px, pz + Math.max(8, o.r * k) + 4, 8, 800, low || R.destroyed[o.home] ? '#ff6a4a' : '#e8eef8', '#000c'); }
  if (MX.stations) for (const st of MX.stations.list) { const on = st.act[team] > 0 && M.t - st.act[team] < .7; if (!on && st.n < 2) continue;   /* puestos de curación: sólo los activos destacan; los inactivos (> 1 camilla) pequeños y tenues; con ~24 en el mapa llenaban el minimapa de cruces */
    const [px, pz] = W2(st.x, st.z); if (px < 4 || pz < 4 || px > size - 4 || pz > size - 4) continue; const ga = x.globalAlpha; x.globalAlpha = on ? 1 : .45; drawTxt(x, '✚', px, pz, on ? 10 : 7, 800, on ? '#4ee08a' : '#aab4c2', on ? '#000c' : undefined); x.globalAlpha = ga; }
  const m3 = performance.now(); SQ.pm.m_objs = Math.max(SQ.pm.m_objs || 0, m3 - m2); drawFriends(x, W2, size, team, pl && pl.sqd, false, true); SQ.pm.m_friends = Math.max(SQ.pm.m_friends || 0, performance.now() - m3);
  x.save(); x.translate(size / 2, size / 2); x.rotate(-P.aim + Math.PI); x.fillStyle = '#fff'; x.strokeStyle = '#000'; x.lineWidth = 1.2; x.beginPath(); x.moveTo(0, -7); x.lineTo(5, 5); x.lineTo(0, 2.5); x.lineTo(-5, 5); x.closePath(); x.fill(); x.stroke(); x.restore();
  drawTxt(x, 'N', size / 2, 3 + 7, 9, 700, '#ffffffaa');
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
#sqPanel .ex div{display:flex;gap:6px;align-items:center}#sqPanel .ex b{width:98px;font-weight:700;white-space:nowrap}#sqPanel .ex span{flex:1;height:3px;background:#ffffff22;border-radius:2px;overflow:hidden}#sqPanel .ex span i{display:block;height:100%}
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
  if (!SQ.marker) { SQ.marker = new THREE.Mesh(new THREE.RingGeometry(1.1, 1.35, 32), new THREE.MeshBasicMaterial({ color: 0x6dff9a, transparent: true, opacity: .55, depthWrite: false, side: THREE.DoubleSide, polygonOffset: true, polygonOffsetFactor: -3, polygonOffsetUnits: -3 })); SQ.marker.rotation.x = -Math.PI / 2; SQ.marker.position.y = .06; scene.add(SQ.marker); }
  const o = s && s.playerLead && s.order; SQ.marker.visible = !!(o && (o.type === 'hold' || o.type === 'move' || o.type === 'cover'));
  if (SQ.marker.visible) { const tx = o.type === 'cover' ? o.tx : o.x, tz = o.type === 'cover' ? o.tz : o.z; SQ.marker.position.x = tx; SQ.marker.position.z = tz; SQ.marker.material.color.setHex(o.type === 'cover' ? 0xff7a3a : o.type === 'move' ? 0x4aa0ff : 0x6dff9a); }
  if (hudAcc < .25) return; hudAcc = 0;
  if (s && s.playerLead && s.order && s.order.type === 'regroup' && s.order.fin && M.t > s.order.fin) s.order = { type: 'follow' };   // tras reagruparse vuelven a «Seguirme»
  if (!s || !MX.on) { panel.style.display = 'none'; return; }
  panel.style.display = 'block';
  const L = s.leader, what = s.playerLead ? ORDER_N[(s.order || { type: 'follow' }).type] : (MISSION_N[s.mission.type] || '') + (s.mission.name ? ' · ' + s.mission.name : '');
  const hpc = m => m.dwn ? '#ffb020' : m.hp < 40 ? '#ff6a4a' : '#6dff9a', num = m => m.isPlayer ? 'TÚ' : String(m.id).replace(/^\D+/, '');
  const chips = s.members.map(m => '<div class="c' + (m === L ? ' ld' : '') + (m.isPlayer ? ' me' : '') + (m.dead ? ' dd' : m.dwn ? ' dn' : '') + '">' + (m.dead ? '✝' : num(m) + (MX.classOf ? '<u style="text-decoration:none;font-size:8px;opacity:.75;margin-left:1px">' + MX.classOf(m).tag + '</u>' : '')) + '<i style="width:' + (m.dead ? 0 : Math.round(m.hp)) + '%;background:' + hpc(m) + '"></i></div>').join('');
  const open = M.t - (SQ.expandT || -99) < 3;                                         // desplegado 3 s tras una orden o un cambio en la escuadra
  const ex = open ? '<div class="ex"><div style="opacity:.8;margin-bottom:2px">Líder: ' + (L ? (L.isPlayer ? 'tú' : L.id) : '—') + '</div>' + s.members.map(m => '<div style="opacity:' + (m.dead ? .45 : 1) + '"><b>' + (m === L ? '★ ' : '') + (m.isPlayer ? 'Tú' : m.id) + (MX.classOf ? ' · ' + MX.classOf(m).name : '') + '</b><span><i style="width:' + (m.dead ? 0 : Math.round(m.hp)) + '%;background:' + hpc(m) + '"></i></span>' + (m.dead ? '✝' : m.dwn ? '⚠' : '') + '</div>').join('') + '</div>' : '';
  panel.innerHTML = '<div class="hd"><span class="nm">' + s.name.toUpperCase() + '</span><span class="od">' + (s.playerLead ? '★ ' : '') + what + '</span></div><div class="ch">' + chips + '</div>' + ex;
  if (SQ.capTick) SQ.capTick();
}
})();
