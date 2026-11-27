"""Estrategia y clases (simulación rápida, sin dibujar): reparto en puntos, táctica por clase, refuerzos, primer contacto entre facciones y coste por fotograma.
Uso: python3 tests/estrategia.py [minutos=4]"""
import os, sys, json
from playwright.sync_api import sync_playwright
MIN = float(sys.argv[1]) if len(sys.argv) > 1 else 4
bad = 0
def chk(c, m):
    global bad
    print(('OK  ' if c else 'FALLO ') + m); bad += 0 if c else 1
with sync_playwright() as p:
    b = p.chromium.launch(executable_path='/usr/bin/google-chrome', args=['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'])
    pg = b.new_page(viewport={'width': 900, 'height': 500}); errs = []; pg.on('pageerror', lambda e: errs.append(str(e))); ev = pg.evaluate
    pg.goto('file://' + os.path.abspath('index.html') + '?mapa=6'); pg.wait_for_timeout(1200); ev('begin()'); pg.wait_for_timeout(1500)
    r = ev('''(MIN)=>{ renderer.render=()=>{}; const N=Math.round(MIN*3600), fr=[], out={samples:[], refuerzo:0, firstContact:-1, tact:{}, onpt:[]}; const M=MX.M, SQ=MX.SQ; const seen=new Set();
      const cd={}; const ob=SQ.objs.filter(o=>o.id!=='REF');
      for(let i=0;i<N;i++){ time+=1/60; const t0=performance.now(); update(1/60); fr.push(performance.now()-t0);
        if(out.firstContact<0 && M.ents.some(e=>!e.dead&&e.tgt&&e.tgt.team>=0&&e.tgt.team!==e.team&&e.vis)) out.firstContact=+M.t.toFixed(1);
        if(i%300===0){ // cada 5 s de juego
          for(const s of SQ.list){ if(s.playerLead||!s.mission) continue; if(s.mission.name&&/refuerzo/.test(s.mission.name)&&!seen.has(s.id+':'+Math.round(s.missionT))){ seen.add(s.id+':'+Math.round(s.missionT)); out.refuerzo++; }
            if(s.mission.x!==undefined&&(s.mission.type==='attack')&&s.leader){ const L=s.leader; if(Math.hypot(L.p.x-s.mission.x,L.p.z-s.mission.z)<45 && !(s.contact&&M.t-s.contact.t<8)){ for(const m of s.members){ if(m.dead||m.clsWait) continue; const d=Math.hypot(m.p.x-s.mission.x,m.p.z-s.mission.z); (cd[m.cls]=cd[m.cls]||[]).push(d); } } } }
          let near=0, alive=0; for(const e of M.ents){ if(e.dead||e.isPlayer) continue; alive++; if(ob.some(o=>Math.hypot(o.x-e.p.x,o.z-e.p.z)<o.r+25)) near++; }
          out.onpt.push(+(near/alive).toFixed(2)); out.samples.push([Math.round(M.t), SQ.score.map(x=>Math.round(x)).join('/'), ob.map(o=>o.owner).join('')]); } }
      for(const k in cd){ const a=cd[k]; out.tact[k]=[Math.round(a.reduce((x,y)=>x+y,0)/a.length), a.length]; }
      const s=[...fr].sort((a,b)=>a-b); out.p50=+s[Math.floor(s.length*.5)].toFixed(2); out.p95=+s[Math.floor(s.length*.95)].toFixed(2); out.p99=+s[Math.floor(s.length*.99)].toFixed(2); out.t=+M.t.toFixed(0);
      out.kills=M.ents.reduce((a,e)=>a+e.kills,0); return out }''', MIN)
    print(json.dumps(r))
    t = r['tact']
    if 'fra' in t and 'asa' in t: chk(t['fra'][0] > t['asa'][0], 'francotirador más lejos del punto que el asalto (%s m vs %s m)' % (t['fra'][0], t['asa'][0]))
    if 'apo' in t and 'asa' in t: chk(t['apo'][0] > t['asa'][0], 'apoyo más lejos del punto que el asalto (%s m vs %s m)' % (t['apo'][0], t['asa'][0]))
    chk(r['firstContact'] > 0, 'primer contacto entre facciones a los %s s de partida' % r['firstContact'])
    late = r['onpt'][len(r['onpt']) // 3:]
    chk(sum(late) / len(late) > .3, 'proporción de soldados en/junto a un punto tras el primer tercio: %.0f %%' % (100 * sum(late) / len(late)))
    chk(not errs, 'sin errores JS ' + str(errs[:2]))
sys.exit(1 if bad else 0)
