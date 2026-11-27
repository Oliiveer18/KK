"""Remate: un enemigo abatido (esperando reanimación) puede ser rematado a tiros por los bots rivales y por el jugador (las balas lo alcanzan)."""
import os, sys
from playwright.sync_api import sync_playwright
bad = 0
def chk(c, m):
    global bad
    print(('OK  ' if c else 'FALLO ') + m); bad += 0 if c else 1
with sync_playwright() as p:
    b = p.chromium.launch(executable_path='/usr/bin/google-chrome', args=['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'])
    pg = b.new_page(viewport={'width': 900, 'height': 500}); errs = []; pg.on('pageerror', lambda e: errs.append(str(e))); ev = pg.evaluate
    pg.goto('file://' + os.path.abspath('index.html') + '?mapa=6'); pg.wait_for_timeout(1200); ev('begin()'); pg.wait_for_timeout(1500)
    r = ev('''()=>{ renderer.render=()=>{}; const M=MX.M; for(let i=0;i<60*14;i++){ time+=1/60; update(1/60); }
      const foe=M.ents.find(e=>e.team===1&&!e.dead&&!e.dwn&&!e.isPlayer); foe.p.x=P.pos.x+14; foe.p.z=P.pos.z; foe.inv=0; foe.revived=false; foe.hp=1; foe.sh=0; MX.hit(foe,50,MX.pl,1,0,null); const out={dwn:foe.dwn};
      let shots=0, kill=-1; const mem=MX.pl.sqd.members.filter(m=>!m.isPlayer);
      for(let i=0;i<60*8;i++){ time+=1/60; update(1/60); for(const m of mem) if(m.firing&&m.tgt===foe) shots++; if(foe.dead&&kill<0) kill=i/60; }
      out.shots=shots; out.kill=kill; return out }''')
    chk(r['dwn'], 'el enemigo queda abatido (esperando reanimación)')
    chk(r['shots'] > 0 and 0 <= r['kill'] < 8, 'los bots rivales le disparan y lo rematan (%s disparos, %.1f s)' % (r['shots'], r['kill']))
    r = ev('''()=>{ const M=MX.M; const foe=M.ents.find(e=>e.team===2&&!e.dead&&!e.dwn); foe.inv=0; foe.revived=false; foe.hp=1; foe.sh=0; MX.hit(foe,50,MX.pl,1,0,null); const d=foe.dwn; MX.hit(foe,60,MX.pl,1,0,null); return {d, dead:foe.dead} }''')
    chk(r['d'] and r['dead'], 'el jugador (o cualquier rival) remata con el daño que recibe un abatido')
    chk(not errs, 'sin errores JS ' + str(errs[:2]))
sys.exit(1 if bad else 0)
