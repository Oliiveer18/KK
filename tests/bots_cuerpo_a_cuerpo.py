"""Cuerpo a cuerpo (?mapa=6): un bot sano con el enemigo a la vista a menos de 7 m no se queda clavado como una torreta. 20 bots rivales, uno a uno, a 2 m de un jugador agachado tras una cobertura baja:
la racha media más larga sin moverse tiene que ser corta, y casi ninguno puede pasar de 3 s quieto (reposicionan tras la cobertura, rodean si no tienen línea de tiro y salen de «cubrirse» si el enemigo está encima)."""
import os, sys, json
from playwright.sync_api import sync_playwright
bad = 0
def chk(c, m):
    global bad
    print(('OK  ' if c else 'FALLO ') + m); bad += 0 if c else 1
with sync_playwright() as p:
    b = p.chromium.launch(executable_path='/usr/bin/google-chrome', args=['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'])
    pg = b.new_page(viewport={'width': 900, 'height': 500}); errs = []; pg.on('pageerror', lambda e: errs.append(str(e))); ev = pg.evaluate
    pg.goto('file://' + os.path.abspath('index.html') + '?mapa=6'); pg.wait_for_timeout(1200); ev('begin()'); pg.wait_for_timeout(2500)
    r = ev('''()=>{ renderer.render=()=>{}; const M=MX.M, pl=MX.pl; const kz=()=>{ for(const z of MX.zom.list){z.dead=true;z.st='dead';z.deadT=99} }; kz(); const A=MX.SQ.objs.find(o=>o.code==='A');
      const covers=props.filter(q=>!q.dead&&(q.type==='sandbags'||q.type==='jersey')&&Math.hypot(q.x-A.x,q.z-A.z)<40).slice(0,3);
      const foes=M.ents.filter(e=>!e.isPlayer&&e.team!==pl.team&&!e.dead).slice(0,20); for(const e of M.ents) if(!e.isPlayer && !foes.includes(e)){ e.p.set(-600,0,-600); e.inv=1e9; }
      const res=[]; let ci=0;
      for(const foe of foes){ for(const f of foes) if(f!==foe) f.p.set(-600,0,-600); const c=covers[(ci++)%covers.length]; const px=c.x+(c.hx+.5), pz=c.z; P.pos.set(px,0,pz); pl.p.set(px,0,pz);
        foe.p.set(px+2.0,0,pz+0.3); foe.dead=false; foe.dwn=false; foe.hp=100; foe.inv=0; foe.path=null; foe.goal=null; foe.holdT=0; foe.st='push'; foe.coverT=0; foe.reposT=0; foe.ammo=foe.w.max;
        let n=0,vis=0,run=0,maxStill=0,shots0=foe.ammo, tdet=0; const hp0=pl.hp; const d0=[];
        for(let i=0;i<60*12;i++){ time+=1/60; P.pos.set(px,0,pz); pl.p.set(px,0,pz); pl.inv=0; pl.hp=1e9; pl.crouch=1; kz(); update(1/60); if(i%6===0){ const d=Math.hypot(foe.p.x-px,foe.p.z-pz), sp=Math.hypot(foe.v.x,foe.v.z); if(d<7&&foe.vis&&foe.hp>=50){ n++; if(sp<.2){ run+=.1; maxStill=Math.max(maxStill,run) } else run=0 } else run=0 } }
        res.push({cls:foe.cls,w:foe.w.sid,n,maxStill:+maxStill.toFixed(1)}); }
      const act=res.filter(r=>r.n>8); return JSON.stringify({act:act.length, mediaMax:+(act.reduce((a,b)=>a+b.maxStill,0)/Math.max(1,act.length)).toFixed(1), peor:Math.max(...act.map(r=>r.maxStill)), sobre3:act.filter(r=>r.maxStill>3).length, sobre6:act.filter(r=>r.maxStill>6).length, lista:act.map(r=>r.cls+':'+r.w+':'+r.maxStill).join(' ')}) }''')
    d = json.loads(r); print(d['lista'])
    chk(d['act'] >= 10, 'bots evaluados (%d)' % d['act'])
    chk(d['mediaMax'] <= 2.5, 'racha media máxima sin moverse ≤ 2,5 s (%.1f s)' % d['mediaMax'])
    chk(d['sobre3'] <= max(2, d['act'] * .25), 'a lo sumo el 25 %% pasa de 3 s quieto (%d de %d)' % (d['sobre3'], d['act']))
    chk(not errs, 'sin errores JS ' + str(errs[:2]))
sys.exit(1 if bad else 0)
