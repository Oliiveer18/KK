"use strict";
/* ===================== REFUGIOS DESTRUIBLES (campaña) =====================
   Cada tramo del perímetro (muro bajo y portón) tiene vida propia; la INTEGRIDAD de un refugio es la vida total de sus tramos (0 % = todos destruidos). Daño por arma: las balas hacen
   daño considerable; los explosivos están limitados (≈ 8 % por tramo, con rendimiento decreciente); el fuego propio no daña el refugio propio (balas, granadas, barriles, fuego). Se anota
   cuánto daño ha hecho cada facción rival (los infectados no cuentan): al llegar a 0 % se reparten 150 puntos entre ellas según su parte. Los muros no sueltan botín.
   ALMACÉN: la estantería de material de cada refugio tiene vida propia; si cae se pierde el stock de esa facción (si el refugio cae pero el almacén no, el stock se conserva).
   REFUGIO CAÍDO: la facción NO queda eliminada; reaparece en un punto propio a salvo (sin punto, no reaparece hasta controlar uno) por oleadas de 3 cada 8 s con 3 s de protección.
   Sin refugio, sin puntos y sin soldados vivos queda eliminada (el jugador observa). Los refugios ya no se capturan: se destruyen. */
(function () {
const M = MX.M, SQ = MX.SQ, ECO = MX.ECO, dist = (a, b) => Math.hypot(a.x - b.x, a.z - b.z);
ECO.wallHp = 14000; ECO.gateHp = 11000; ECO.warehouseHp = 9000; ECO.dmgMuro = { bullet: 1, blast: .08, blastDecay: .6, blastWindow: 12, fire: .15 };
const REF = { seg: [[], [], [], []], ware: [null, null, null, null], dmgBy: [[0, 0, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0]], destroyed: [false, false, false, false], pct: [100, 100, 100, 100], atkT: [-99, -99, -99, -99],
  eliminated: [false, false, false, false], wave: [{ t: -99, n: 0 }, { t: -99, n: 0 }, { t: -99, n: 0 }, { t: -99, n: 0 }], key: null, on: !/[?&]norefugios\b/.test(location.search), pts: [0, 0, 0, 0], awarded: false, wareLost: [false, false, false, false], tick: 0 };
MX.REF = REF;
REF.attacked = t => M.t - REF.atkT[t] < 8;
function build() {
  REF.key = MAPA.built || null; for (let t = 0; t < 4; t++) { REF.seg[t] = []; REF.ware[t] = null; REF.dmgBy[t] = [0, 0, 0, 0]; REF.destroyed[t] = false; REF.eliminated[t] = false; REF.pct[t] = 100; REF.wareLost[t] = false; }
  const rr = REF.key && REF.key.info && REF.key.info.refugeRects; if (!rr) return;
  for (const p of props) { if (p.dead) continue; const isW = p.type === 'wallLow1' || p.type === 'gate1', isS = p.type === 'storeMat'; if (!isW && !isS) continue;
    const q = rr.find(r => Math.abs(p.x - r.x) <= r.hx + .6 && Math.abs(p.z - r.z) <= r.hz + .6); if (!q) continue;
    p.ref = { team: q.fac, kind: isS ? 'ware' : 'wall', blastN: 0, blastT: -99 };
    p.ref.spec = { type: p.type, x: p.x, z: p.z, rot: p.g.rotation.y, fac: p.lzFac, param: p.lzParam }; if (isS) { p.maxHp = p.hp = ECO.warehouseHp; REF.ware[q.fac] = p; } else { p.maxHp = p.hp = p.type === 'gate1' ? ECO.gateHp : ECO.wallHp; REF.seg[q.fac].push(p); } }
}
/* filtro de daño a objetos del refugio (lo llama damageProp). Devuelve el daño efectivo (0 = ninguno). */
REF.filter = (p, dmg, kind) => {
  const r = p.ref; if (!r || !REF.on) return dmg; const by = p.by, team = by && by.team !== undefined ? by.team : -1;
  if (team === r.team) return 0;                                                  // fuego propio: nada
  let eff;
  if (kind === 'blast') { if (M.t - r.blastT > ECO.dmgMuro.blastWindow) r.blastN = 0; eff = p.maxHp * ECO.dmgMuro.blast * Math.min(1.3, dmg / 150) * Math.pow(ECO.dmgMuro.blastDecay, r.blastN); r.blastN += .5; r.blastT = M.t; }   // 0,5 por tramo y explosión: varias seguidas rinden cada vez menos
  else if (kind === 'fire') { if (team < 0) return 0; eff = dmg * ECO.dmgMuro.fire; }
  else eff = dmg * ECO.dmgMuro.bullet;
  if (team >= 0) { REF.dmgBy[r.team][team] += Math.min(eff, Math.max(0, p.hp)); REF.atkT[r.team] = M.t; }
  return eff / ((typeof MT !== 'undefined' && MT[p.mat]) ? MT[p.mat].dm : 1);       // el multiplicador del material se compensa: el daño efectivo es el calculado
};
function pctOf(t) { let a = 0, b = 0; for (const p of REF.seg[t]) { b += p.maxHp; if (!p.dead) a += Math.max(0, p.hp); } return b ? 100 * a / b : 0; }
const teamName = t => ['Azul', 'Rojo', 'Ámbar', 'Violeta'][t];
function award(t) {                                                                // reparto de 150 puntos entre las facciones rivales según su daño
  const d = REF.dmgBy[t], tot = d.reduce((s, v, k) => s + (k === t ? 0 : v), 0); REF.pts[t] = 0; if (tot <= 0) return;
  let given = 0, best = -1; const pts = [0, 0, 0, 0]; for (let k = 0; k < 4; k++) { if (k === t || d[k] <= 0) continue; pts[k] = Math.floor(150 * d[k] / tot); given += pts[k]; if (best < 0 || d[k] > d[best]) best = k; }
  if (best >= 0) pts[best] += 150 - given;
  for (let k = 0; k < 4; k++) if (pts[k]) SQ.score[k] += pts[k]; REF.pts[t] = pts; REF.lastPts = pts;
  const txt = pts.map((v, k) => v ? teamName(k) + ' +' + v : '').filter(Boolean).join(' · '); SQ.toast('Refugio ' + teamName(t) + ' destruido · ' + txt); if (SQ.beep) SQ.beep('lost');
  const w = SQ.score.findIndex(v => v >= (SQ.meta ? SQ.meta.goal || 1000 : 1000)); if (w >= 0 && SQ.endCampaign) SQ.endCampaign(w);
}
function aliveOf(t) { for (const e of M.ents) if (e.team === t && !e.dead) return true; return false; }
function ownsPoint(t) { return SQ.objs.some(o => !o.refuge && o.owner === t); }
function tick() {
  if (!REF.on) return;
  for (let t = 0; t < 4; t++) {
    REF.pct[t] = pctOf(t);
    const rf = SQ.objs.find(o => o.refuge && o.home === t);
    if (!REF.destroyed[t] && REF.seg[t].length && REF.pct[t] <= 0) { REF.destroyed[t] = true; if (rf) rf.destroyed = true; award(t); }
    else if (REF.destroyed[t] && REF.pct[t] > 0) { REF.destroyed[t] = false; if (rf) rf.destroyed = false; }
    const w = REF.ware[t]; if (w && w.dead && !REF.wareLost[t]) { REF.wareLost[t] = true; const s = ECO.stock[t]; s.madera = s.piedra = s.hierro = 0; SQ.toast('¡Almacén ' + teamName(t) + ' destruido! Stock perdido'); ECO.log(t, 'Almacén destruido'); }
    if (REF.destroyed[t] && !REF.eliminated[t] && !ownsPoint(t) && !aliveOf(t)) { REF.eliminated[t] = true; SQ.toast('Facción ' + teamName(t) + ' eliminada'); const pl = MX.pl; if (pl && pl.team === t) SQ.toast('Tu facción ha sido eliminada · observas la partida');
      const left = [0, 1, 2, 3].filter(k => !REF.eliminated[k]); if (left.length === 1 && SQ.endCampaign) SQ.endCampaign(left[0]); }
  }
}
/* reaparición con el refugio caído: oleadas de 3 cada 8 s, solo si hay un punto propio a salvo */
MX.canRespawn = e => {
  if (!REF.on || !MX.campaign || !REF.destroyed[e.team]) return true; if (REF.eliminated[e.team]) return false;
  if (!SQ.spawnFor(e)) return false;
  const W = REF.wave[e.team]; if (M.t - W.t >= 8) { W.t = M.t; W.n = 0; } if (W.n >= 3) return false; W.n++; return true;
};
const onResp = SQ.onRespawn; SQ.onRespawn = e => { onResp(e); if (MX.campaign && REF.destroyed[e.team]) e.inv = Math.max(e.inv || 0, 3); };
const sqUpdate = SQ.update; let ts = 0;
SQ.update = dt => {
  sqUpdate(dt); if (!MX.campaign) return; if (REF.key !== (MAPA.built || null) || (!REF.seg[0].length && !REF.built)) { build(); REF.built = true; }
  ts += dt; if (ts >= .25) { ts = 0; tick(); }
  const pl = MX.pl; if (pl && pl.dead && REF.eliminated[pl.team]) {                                // eliminado: observa a una facción viva
    let tgt = REF.spec; if (!tgt || tgt.dead) { tgt = REF.spec = M.ents.find(e => !e.dead && !e.isPlayer && !REF.eliminated[e.team]) || null; } if (tgt) { P.pos.x = tgt.p.x; P.pos.z = tgt.p.z; } }
};
const rs = MX.restart; if (rs) MX.restart = function () { const r = rs.apply(this, arguments); REF.key = null; REF.built = false; REF.spec = null; for (let t = 0; t < 4; t++) { REF.wave[t].t = -99; REF.wave[t].n = 0; } return r; };
})();
