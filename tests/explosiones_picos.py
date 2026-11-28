"""R2 — explosiones sin tirones: ráfaga de 24 explosiones y 24 objetos rotos (barriles incluidos) cerca del jugador; el máximo de la lógica por fotograma y la basura se mantienen acotados y las manchas de quemado salen de la reserva."""
import os, sys
from playwright.sync_api import sync_playwright
bad = 0
def chk(c, m):
    global bad
    print(('OK  ' if c else 'FALLO ') + m); bad += 0 if c else 1
with sync_playwright() as p:
    b = p.chromium.launch(executable_path='/usr/bin/google-chrome', args=['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'])
    pg = b.new_page(viewport={'width': 900, 'height': 500}); errs = []; pg.on('pageerror', lambda e: errs.append(str(e))); ev = pg.evaluate
    pg.goto('file://' + os.path.abspath('index.html') + '?mapa=6'); pg.wait_for_timeout(1500); ev('begin()'); pg.wait_for_timeout(3000)
    r = ev('''()=>{ renderer.render=()=>{}; MX.pl.inv=1e9; for(const z of MX.zom.list){z.dead=true;z.st='dead';z.deadT=99}; const x=0,z=12; P.pos.set(x,0,z); MX.pl.p.set(x,0,z); for(let i=0;i<120;i++){ time+=1/60; update(1/60); MAPA.cull(camera); }
      const fr=[]; const barrels=props.filter(q=>!q.dead&&q.explosive).slice(0,12); const crates=props.filter(q=>!q.dead&&!q.explosive&&Math.hypot(q.x-x,q.z-z)<30).slice(0,24);
      for(let i=0;i<60*8;i++){ time+=1/60; if(i%10===0&&i/10<24){ const k=i/10; explode(new V3(x+Math.cos(k)*8,.5,z+Math.sin(k)*8)); if(crates[k]&&!crates[k].dead) destroyProp(crates[k],1,0,1); if(barrels[k>>1]&&k%2===0&&!barrels[k>>1].dead) destroyProp(barrels[k>>1],1,0,1); }
        const t0=performance.now(); update(1/60); fr.push(performance.now()-t0); if(i%10===0) MAPA.cull(camera); }
      fr.sort((a,b)=>a-b); return {max:+fr[fr.length-1].toFixed(1), p99:+fr[Math.floor(fr.length*.99)].toFixed(1), p50:+fr[Math.floor(fr.length*.5)].toFixed(1), scorch:SCORCH.length, pool:SCPOOL.length} }''')
    print(r)
    chk(r['max'] <= 40, 'máximo de lógica por fotograma en la ráfaga ≤ 40 ms (%.1f ms)' % r['max'])
    chk(r['p99'] <= 14, 'p99 de la ráfaga ≤ 14 ms (%.1f ms)' % r['p99'])
    chk(r['scorch'] + r['pool'] >= 8, 'las manchas de quemado salen de la reserva (%d en uso, %d libres)' % (r['scorch'], r['pool']))
    chk(not errs, 'sin errores JS ' + str(errs[:2]))
sys.exit(1 if bad else 0)
