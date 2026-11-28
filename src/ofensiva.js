"use strict";
/* ===================== OFENSIVA Y ATAQUES AL REFUGIO (campaña) =====================
   RIVAL ASIGNADO: cada facción elige el rival cuyo refugio tiene más cerca (se revisa cada 5 min). OLEADAS COORDINADAS: no antes del minuto 5, cada facción lanza una oleada de 1 escuadra
   (2 desde el minuto 12; 3 si el rival es el líder) contra su puesto avanzado y, si ya no es suyo, contra su refugio. Mientras no hay oleada en curso pasa un mínimo de 150 s por facción.
   ASEDIO: la escuadra elige el tramo de muro más cercano, se coloca a 8–12 m en abanico, y dispara al muro por tandas (balas reales: dan en el parapeto si no hay nadie de pie detrás); en cuanto
   ve a un enemigo combate como siempre. Se retira si queda con menos de la mitad, si pasan 240 s desde que llegan (480 s en total), o si el refugio cae. Solo disparan al muro los fusiles/subfusiles/ametralladoras (las escopetas y pistolas dan cobertura); una oleada necesita ≥ 3 de ellos. INFECTADOS: el ruido junto a un refugio los atrae; los que quedan pegados al
   muro con alguien dentro lo atacan (3 de daño por segundo cada uno; los pesados, 10). EVENTO DE HORDA: como mucho uno cada 5 min desde el minuto 6, contra un refugio por turnos, de 30 a 60 infectados.
   No implementado todavía: reconocimiento previo con un explorador, humo y granadas contra el muro (el tope de explosivos ya existe en refugios.js). */
(function () {
const M = MX.M, SQ = MX.SQ, ECO = MX.ECO, REF = MX.REF, DEF = MX.DEF, dist = (a, b) => Math.hypot(a.x - b.x, a.z - b.z);
const OFF = { rival: [-1, -1, -1, -1], rivalT: -999, next: [300, 330, 360, 390], siege: [], stats: { waves: [0, 0, 0, 0], sieges: [0, 0, 0, 0], retreats: [0, 0, 0, 0], shots: [0, 0, 0, 0], zomDmg: 0, hordes: 0, hordeSize: [] }, horde: { next: 360, k: 0 }, on: !/[?&]nooferiva\b/.test(location.search), t0: 300 };
MX.OFF = OFF;
const rect = t => { const r = MAPA.built && MAPA.built.info && MAPA.built.info.refugeRects; return r ? r.find(q => q.fac === t) : null; };
const teamName = t => ['Azul', 'Rojo', 'Ámbar', 'Violeta'][t];
const alive = e => !e.dead && !e.dwn;
const breaker = e => e.w && e.w.kind === 'rifle' && !e.w.launch;                    // solo los fusiles, subfusiles y ametralladoras rompen muros; las escopetas y pistolas dan cobertura
function pickRivals() {
  for (let t = 0; t < 4; t++) { const a = rect(t); if (!a || REF.eliminated[t]) continue; let b = -1, bd = 1e9;
    for (let q = 0; q < 4; q++) { if (q === t || REF.eliminated[q] || REF.destroyed[q] && !M.ents.some(e => e.team === q && !e.dead)) continue; const r = rect(q); if (!r) continue; const d = dist(a, r) - (SQ.score[q] > SQ.score[t] ? 80 : 0); if (d < bd) { bd = d; b = q; } }
    OFF.rival[t] = b; }
  OFF.rivalT = M.t;
}
const maxSq = t => (M.t > OFF.t0 + 420 ? 2 : 1) + (OFF.rival[t] >= 0 && SQ.score[OFF.rival[t]] === Math.max(...SQ.score) && M.t > OFF.t0 + 600 ? 1 : 0);
function segTarget(rv, from) {                                                       // tramo vivo más cercano (a la posición de la escuadra); evita el portón
  let b = null, bd = 1e9; for (const p of REF.seg[rv]) { if (p.dead || !p.ref || /^gate/.test(p.ref.spec.type)) continue; const d = dist(p.ref.spec, from); if (d < bd) { bd = d; b = p; } } return b;
}
function startWave(t) {
  const rv = OFF.rival[t]; if (rv < 0) return false; const r = rect(rv); if (!r) return false;
  const mine = OFF.siege.filter(w => w.team === t); if (mine.length >= maxSq(t)) return false;
  const cands = SQ.list.filter(s => s.team === t && !s.playerLead && !s.siege && s.leader && !s.members.includes(MX.pl) && s.members.filter(alive).length >= 3 && s.members.filter(e => alive(e) && breaker(e)).length >= 3 && s.mission && s.mission.type !== 'defend' && s.kind !== 'guarnicion' && s.kind !== 'reserva')
    .sort((a, b) => dist(a.leader.p, r) - dist(b.leader.p, r)); const s = cands[0]; if (!s) return false;
  const pue = SQ.objs.find(o => o.id === 'PUE' && o.home === rv);
  OFF.stats.waves[t]++;
  if (pue && pue.owner === rv) {                                                    // 1.º el puesto avanzado
    s.mission = { type: 'attack', x: pue.x, z: pue.z, name: 'oleada · ' + pue.name, role: 'wave' }; s.missionT = M.t; s.baseType = 'attack'; s.ap = null; s.wave = { t0: M.t, rv, phase: 'outpost', n0: s.members.filter(alive).length }; return true; }
  return beginSiege(t, s, rv);
}
function beginSiege(t, s, rv) {
  const seg = segTarget(rv, s.leader.p); if (!seg) return false;
  const w = { team: t, rv, s, seg, t0: M.t, n0: s.members.filter(alive).length, init: s.members.filter(alive), pos: new Map() }; OFF.siege.push(w); s.siege = w; OFF.stats.sieges[t]++;
  s.mission = { type: 'attack', x: seg.ref.spec.x, z: seg.ref.spec.z, name: 'asedio · refugio ' + teamName(rv), role: 'siege' }; s.missionT = M.t; s.ap = null;
  return true;
}
function endSiege(w, why) {
  (OFF.stats.end || (OFF.stats.end = {}))[why] = ((OFF.stats.end || {})[why] || 0) + 1;
  const i = OFF.siege.indexOf(w); if (i >= 0) OFF.siege.splice(i, 1); if (w.s) { w.s.siege = null; w.s.wave = null; w.s.mission = { type: 'hold' }; w.s.missionT = M.t - 999; w.s.ap = null; }
  for (const e of w.init || []) e.siege = null; if (why === 'retirada') OFF.stats.retreats[w.team]++; OFF.next[w.team] = M.t + 150;
}
function sitePos(w, e, k, n) {                                                       // puesto de tiro de cada miembro: 8–12 m del tramo, hacia fuera del refugio, en abanico
  const r = rect(w.rv), sp = w.seg.ref.spec, dx = sp.x - r.x, dz = sp.z - r.z, l = Math.hypot(dx, dz) || 1, ux = dx / l, uz = dz / l, lat = (k - (n - 1) / 2) * 2.2, d = 9 + (k % 3) * 1.4;
  for (const dd of [d, d + 2, d - 2, d + 4]) { const x = sp.x + ux * dd - uz * lat, z = sp.z + uz * dd + ux * lat; if (!MX.inMainNav || MX.inMainNav(x, z)) return { x, z }; } return { x: sp.x + ux * d, z: sp.z + uz * d };
}
function siegeTick(dt) {
  for (const w of OFF.siege.slice()) {
    const s = w.s, rv = w.rv, mem = w.init.filter(alive);
    if (REF.destroyed[rv] || REF.eliminated[rv]) { endSiege(w, 'fin'); continue; } if (!SQ.list.includes(s)) { endSiege(w, 'escuadra'); continue; }
    if (mem.length * 2 < w.init.length) { endSiege(w, 'retirada'); continue; } const ready = mem.filter(e => breaker(e) && e.sitePos && dist(e.p, e.sitePos) < 3.5).length; if (ready >= 2 && !w.arr) w.arr = M.t; if ((w.arr && M.t - w.arr > 240) || M.t - w.t0 > 480) { endSiege(w, 'tiempo'); continue; }
    if (w.seg.dead) { const nx = segTarget(rv, w.seg.ref.spec); if (!nx) { endSiege(w, 'fin'); continue; } w.seg = nx; w.pos.clear(); }
    mem.forEach((e, k) => { if (e.isPlayer) return; let p = w.pos.get(e); if (!p) { p = sitePos(w, e, k, mem.length); w.pos.set(e, p); } e.siege = w; e.sitePos = p; });
  }
}
function shootTick(dt) {                                                             // cadencia propia: ráfagas de 7 disparos y una pausa (≈ 65 % de actividad)
  for (const w of OFF.siege) { const sp = w.seg.ref.spec; for (const e of w.init) {
    if (!e.siege || e.siege !== w || e.isPlayer || !alive(e) || !breaker(e) || (e.vis && e.tgt) || e.st === 'fight' || !e.sitePos) continue; e.sgT = (e.sgT || 0) - dt;
    if (dist(e.p, sp) > 22) continue;                                           // desde 22 m ya se dispara al muro aunque aún se esté colocando if (e.reloadT >= 0) continue; if (e.ammo <= 0) { e.reloadT = 0; e.rp = 0; e.burst = 0; continue; }
    if (e.sgT > 0) continue; const yaw = Math.atan2(sp.x - e.p.x, sp.z - e.p.z); e.yaw = yaw; e.body = yaw; MX.shootBot(e); OFF.stats.shots[w.team]++;
    e.sgN = (e.sgN || 0) + 1; e.sgT = e.w.cd * (e.w.auto ? 1.05 : 1.5) + (e.sgN % 7 === 0 ? .6 : 0); } }
}
/* infectados contra el muro */
let zt = 0;
function zombieSiege(dt) {
  if (!MX.zom) return;
  for (let t = 0; t < 4; t++) { const r = rect(t); if (!r || REF.destroyed[t]) continue; const inside = M.ents.some(e => e.team === t && alive(e) && Math.abs(e.p.x - r.x) < r.hx && Math.abs(e.p.z - r.z) < r.hz); if (!inside) continue;
    for (const z of MX.zom.list) { if (z.dead || z.st === 'dorm' || z.st === 'dead') continue; if (Math.abs(z.p.x - r.x) > r.hx + 5 || Math.abs(z.p.z - r.z) > r.hz + 5) continue;
      let b = null, bd = 2.6; for (const p of REF.seg[t]) { if (p.dead) continue; const sp = p.ref.spec, d = Math.hypot(sp.x - z.p.x, sp.z - z.p.z); if (d < bd) { bd = d; b = p; } }
      if (!b) continue; const dmg = (z.type === 'brute' ? 10 : 3) * dt; b.by = null; damageProp(b, dmg, b.x, b.z, 0, 0, 'melee'); OFF.stats.zomDmg += dmg; z.st = z.st === 'invest' ? 'chase' : z.st; } }
}
/* evento de horda */
function horde() {
  if (M.t < OFF.horde.next) return; const order = [0, 1, 2, 3].filter(t => !REF.eliminated[t]); if (!order.length) return; const t = order[OFF.horde.k++ % order.length], r = rect(t); if (!r) return;
  const dx = r.x, dz = r.z, l = Math.hypot(dx, dz) || 1, px = r.x - dx / l * 40, pz = r.z - dz / l * 40;                                 // punto del mapa visto desde el refugio hacia el centro (40 m)
  const cand = MX.zom.list.filter(z => !z.dead && z.st !== 'dead' && z.st !== 'chase' && z.st !== 'attack').map(z => ({ z, d: Math.hypot(z.p.x - r.x, z.p.z - r.z) })).sort((a, b) => a.d - b.d), n = Math.min(60, Math.max(30, Math.round(45 + (Math.random() - .5) * 20)));
  const pick = cand.slice(0, n); if (pick.length < 20) { OFF.horde.next = M.t + 60; return; }
  pick.forEach((o, i) => { const z = o.z; z.st = 'invest'; z.hx = px + (Math.random() - .5) * 14; z.hz = pz + (Math.random() - .5) * 14; z.noiseDelay = Math.random() * 4 + o.d * .01; z.path = null; z.wait = 0; });
  OFF.horde.next = M.t + 300 + Math.random() * 60; OFF.stats.hordes++; OFF.stats.hordeSize.push(pick.length);
  SQ.toast(MX.pl && MX.pl.team === t ? '¡Horda de ' + pick.length + ' infectados hacia tu refugio!' : 'Una horda de infectados va hacia el refugio ' + teamName(t)); if (MX.combat) MX.combat('boom', px, pz);
}
const sqGoal = SQ.goalFor;
SQ.goalFor = e => {
  const w = e.siege; if (w && OFF.on && !e.isPlayer && e.sitePos && SQ.list.includes(w.s)) { const sp = w.seg.ref.spec; return { x: e.sitePos.x, z: e.sitePos.z, speed: 5.6, hold: true, face: Math.atan2(sp.x - e.sitePos.x, sp.z - e.sitePos.z), crouch: false }; }
  return sqGoal(e);
};
let ta = 0, ts = 0; const sqUpdate = SQ.update;
SQ.update = dt => {
  sqUpdate(dt); if (!MX.campaign || !OFF.on || !REF.built) return;
  if (M.t - OFF.rivalT > 300 || OFF.rival[0] < 0) pickRivals();
  ta += dt; if (ta >= 2) { ta = 0; siegeTick(2); if (M.t >= OFF.t0) { for (let t = 0; t < 4; t++) { if (REF.eliminated[t] || M.t < OFF.next[t] || (DEF && DEF.level[t] >= 2)) continue; if (startWave(t)) OFF.next[t] = M.t + 150; } horde(); } }
  shootTick(dt); zt += dt; if (zt >= .5) { zombieSiege(zt); zt = 0; }
  for (const s of SQ.list) if (s.wave && s.wave.phase === 'outpost' && !s.siege && M.t - s.wave.t0 > 90 && s.members.filter(e => alive(e) && breaker(e)).length >= 3) { const wv = s.wave; s.wave = null; beginSiege(s.team, s, wv.rv); }   // el puesto resiste: se pasa al refugio
  for (const s of SQ.list) if (s.wave && s.wave.phase === 'outpost' && (M.t - s.wave.t0 > 200 || !SQ.objs.some(o => o.id === 'PUE' && o.home === s.wave.rv && o.owner === s.wave.rv))) s.wave = null;
};
const rs = MX.restart; if (rs) MX.restart = function () { const r = rs.apply(this, arguments); OFF.siege.length = 0; OFF.rivalT = -999; OFF.next = [300, 330, 360, 390]; OFF.horde.next = 360; OFF.horde.k = 0; for (const k of ['waves', 'sieges', 'retreats', 'shots']) OFF.stats[k] = [0, 0, 0, 0]; OFF.stats.zomDmg = 0; OFF.stats.hordes = 0; OFF.stats.hordeSize = []; for (const e of M.ents) e.siege = null; return r; };
})();
