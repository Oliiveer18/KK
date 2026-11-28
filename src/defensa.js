"use strict";
/* ===================== DEFENSA PROFESIONAL DEL REFUGIO (campaña) =====================
   NIVELES DE ALERTA por facción: VERDE (nada cerca), ÁMBAR (enemigo dentro del radio de alerta del refugio: 120 m, más con la torre de vigilancia, o una horda de infectados cerca) y
   ROJO (muro atacado, enemigo a < 45 m o brecha con enemigo a < 90 m). GUARNICIÓN por turnos: 6 soldados en verde, 8 en ámbar y 12 en rojo, tomados de los que están cerca del refugio y no
   van con el jugador ni trabajan de ingenieros/recicladores; ocupan los puestos de defensa pegados al muro (mirando fuera) y, con una brecha, los más cercanos a ella; el exceso se coloca
   en la segunda línea (tras el tabique interior, defensa en profundidad). Cada turno dura 150 s y se relevan si no hay peligro. Con brecha y enemigos junto a ella, un defensor lanza
   una granada hacia la abertura (cada 12 s como mucho por facción). Los ingenieros solo reparan en calma (ingenieros.js). La protección de 3 s al reaparecer y la ausencia de caza del punto de
   aparición vienen de refugios.js/partida.js. */
(function () {
const M = MX.M, SQ = MX.SQ, ECO = MX.ECO, REF = MX.REF, dist = (a, b) => Math.hypot(a.x - b.x, a.z - b.z);
const DEF = { level: [0, 0, 0, 0], size: [6, 6, 6, 6], want: [6, 8, 12], stats: { red: [0, 0, 0, 0], amber: [0, 0, 0, 0], grenades: [0, 0, 0, 0], shifts: [0, 0, 0, 0] }, on: !/[?&]nodefensa\b/.test(location.search), lastG: [-99, -99, -99, -99], redT: [0, 0, 0, 0] };
MX.DEF = DEF;
const rect = t => { const r = MAPA.built && MAPA.built.info && MAPA.built.info.refugeRects; return r ? r.find(q => q.fac === t) : null; };
const posts = t => { const d = MAPA.built && MAPA.built.info && MAPA.built.info.defense; const q = d && d.find(x => x.team === t); return q ? q.pts : []; };
function breachOf(t) { let best = null; for (const p of REF.seg[t]) if (p.dead && p.ref) best = best || p.ref.spec; return best; }
function nearestFoe(t, x, z, R) { let b = 1e9; for (const e of M.ents) { if (e.dead || e.dwn || e.team === t) continue; const d = Math.hypot(e.p.x - x, e.p.z - z); if (d < b) b = d; } return b; }
function hordeNear(x, z, R) { let n = 0; if (MX.zom) for (const z0 of MX.zom.list) { if (z0.dead || z0.st === 'dorm') continue; if (Math.hypot(z0.p.x - x, z0.p.z - z) < R && ++n >= 6) return true; } return false; }
function evalLevels() {
  for (let t = 0; t < 4; t++) { const r = rect(t); if (!r || REF.eliminated[t]) { DEF.level[t] = 0; continue; }
    const df = nearestFoe(t, r.x, r.z), br = breachOf(t), L0 = DEF.level[t];
    let L = 0; if (df < REF.alertRadius(t) || hordeNear(r.x, r.z, 80)) L = 1;
    if (REF.attacked(t) || df < 45 || (br && nearestFoe(t, br.x, br.z) < 90)) L = 2;
    if (L === 2) DEF.redT[t] = M.t; else if (L < L0 && M.t - DEF.redT[t] < 12) L = L0;                   // histéresis: de rojo no se baja de golpe
    DEF.level[t] = L; if (L > L0) { if (L === 2) DEF.stats.red[t]++; else DEF.stats.amber[t]++; } }
}
const busy = e => e.lg || e.eng || e.clsWait || e.medCall || e.siege || e.stGo;
function eligible(e, r) { return !e.isPlayer && !e.dead && !e.dwn && e.sqd && !e.sqd.playerLead && !busy(e) && e.hp >= 40 && M.t >= (e.garCool || 0) && Math.hypot(e.p.x - r.x, e.p.z - r.z) < 150; }
function garrison() {
  for (let t = 0; t < 4; t++) { const r = rect(t); if (!r || REF.eliminated[t] || REF.destroyed[t]) { for (const e of M.ents) if (e.team === t && e.gar) e.gar = null; continue; }
    const want = DEF.want[DEF.level[t]]; DEF.size[t] = want; const G = M.ents.filter(e => e.team === t && e.gar && !e.dead && !e.dwn);
    for (const e of M.ents) if (e.team === t && e.gar && (e.dead || e.dwn)) e.gar = null;
    if (G.length < want) { const c = M.ents.filter(e => e.team === t && !e.gar && eligible(e, r)).sort((a, b) => dist(a.p, r) - dist(b.p, r)); for (let i = 0; i < c.length && G.length < want; i++) { c[i].gar = { t0: M.t, post: null }; G.push(c[i]); DEF.stats.shifts[t]++; } }
    else if (G.length > want && DEF.level[t] === 0) { G.sort((a, b) => a.gar.t0 - b.gar.t0); for (let i = 0; i < G.length - want; i++) if (M.t - G[i].gar.t0 > 150) { G[i].garCool = M.t + 60; G[i].gar = null; } }
    else if (DEF.level[t] === 0) for (const e of G) if (M.t - e.gar.t0 > 150 && M.ents.some(o => o.team === t && !o.gar && eligible(o, r))) { e.garCool = M.t + 60; e.gar = null; }   // relevo
    /* reparto de puestos: con brecha, los más cercanos a ella primero; el exceso, segunda línea */
    const live = M.ents.filter(e => e.team === t && e.gar && !e.dead && !e.dwn), P = posts(t).map(q => ({ x: q[0], z: q[1], yaw: q[2], by: null })), br = breachOf(t);
    if (br) P.sort((a, b) => dist(a, br) - dist(b, br));
    for (const e of live) { let pi = e.gar.post; if (pi && P.includes(pi) && !pi.by) { pi.by = e; continue; } e.gar.post = null; }
    for (const e of live) { if (e.gar.post) continue; let b = null, bd = 1e9; for (const q of P) { if (q.by) continue; const d = dist(q, e.p); if (d < bd) { bd = d; b = q; } } if (b) { b.by = e; e.gar.post = b; } else { const k = live.indexOf(e); const a = k * 1.3; e.gar.post = { x: r.x + Math.cos(a) * 3.2, z: r.z - 3.8 + Math.sin(a) * 1.6, yaw: Math.PI * (1 + .5), deep: true }; } }
  }
}
function throwAtBreach() {
  for (let t = 0; t < 4; t++) { if (DEF.level[t] < 2 || M.t - DEF.lastG[t] < 12) continue; const br = breachOf(t); if (!br) continue;
    let tgt = null, td = 1e9; for (const e of M.ents) { if (e.dead || e.dwn || e.team === t) continue; const d = Math.hypot(e.p.x - br.x, e.p.z - br.z); if (d < 14 && d < td) { td = d; tgt = e; } }
    if (!tgt) continue; const g = M.ents.find(e => e.team === t && e.gar && !e.dead && !e.dwn && e.gCount > 0 && !e.wantThrow && e.reloadT < 0 && dist(e.p, tgt.p) > 5 && dist(e.p, tgt.p) < 26); if (!g) continue;
    g.wantThrow = 'frag'; g.throwT = 0; g.vis = false; g.tgt = null; g.ls = { x: tgt.p.x, z: tgt.p.z }; DEF.lastG[t] = M.t; DEF.stats.grenades[t]++; }
}
const sqGoal = SQ.goalFor;
SQ.goalFor = e => {
  const g = e.gar; if (g && DEF.on && !e.isPlayer && g.post) { const q = g.post; return { x: q.x, z: q.z, speed: 6.4, hold: true, face: q.yaw !== undefined ? q.yaw : 0, crouch: false }; }
  return sqGoal(e);
};
let t1 = 0, t2 = 0; const sqUpdate = SQ.update;
SQ.update = dt => {
  sqUpdate(dt); if (!MX.campaign || !DEF.on || !REF.built) return;
  t1 += dt; if (t1 >= 1) { t1 = 0; evalLevels(); throwAtBreach(); } t2 += dt; if (t2 >= 2) { t2 = 0; garrison(); }
};
const rs = MX.restart; if (rs) MX.restart = function () { const r = rs.apply(this, arguments); for (let t = 0; t < 4; t++) { DEF.level[t] = 0; DEF.lastG[t] = -99; DEF.redT[t] = 0; for (const k in DEF.stats) DEF.stats[k][t] = 0; } for (const e of M.ents) { e.gar = null; e.garCool = 0; } return r; };
})();
