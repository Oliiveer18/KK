"""R1 — sectores sin tirones: al volver a un sector ya visitado se reutilizan los lotes instanciados congelados (sin mallas, arrays ni búferes nuevos). Se recorre dos veces un circuito de 600 m; la segunda vuelta tiene que reutilizar casi todo y descongelar más barato."""
import os, sys
from playwright.sync_api import sync_playwright
bad = 0
def chk(c, m):
    global bad
    print(('OK  ' if c else 'FALLO ') + m); bad += 0 if c else 1
with sync_playwright() as p:
    b = p.chromium.launch(executable_path='/usr/bin/google-chrome', args=['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'])
    pg = b.new_page(viewport={'width': 900, 'height': 500}); errs = []; pg.on('pageerror', lambda e: errs.append(str(e))); ev = pg.evaluate
    pg.goto('file://' + os.path.abspath('index.html') + '?mapa=6'); pg.wait_for_timeout(1200); ev('begin()'); pg.wait_for_timeout(2500)
    def vuelta():
        return ev('''()=>{ renderer.render=()=>{}; const ST=MAPA.stream; const a0=[ST.poolHit,ST.poolMiss,ST.thawMs,ST.thawN]; MX.pl.inv=1e9; for(const z of MX.zom.list){z.dead=true;z.st='dead';z.deadT=99}
          const pts=[[-250,-250],[-100,-250],[-100,-100],[-250,-100],[-250,-250]]; let max=0; const fr=[];
          for(let k=0;k<pts.length-1;k++){ const [x0,z0]=pts[k],[x1,z1]=pts[k+1]; const L=Math.hypot(x1-x0,z1-z0); for(let d=0;d<L;d+=7/60){ P.pos.set(x0+(x1-x0)*d/L,0,z0+(z1-z0)*d/L); MX.pl.p.set(P.pos.x,0,P.pos.z); camera.position.set(P.pos.x,13,P.pos.z+8.6); camera.lookAt(P.pos.x,0,P.pos.z); camera.updateMatrixWorld(); const t0=performance.now(); MAPA.cull(camera); const dt=performance.now()-t0; fr.push(dt); if(dt>max) max=dt; } }
          fr.sort((a,b)=>a-b); return {hit:ST.poolHit-a0[0], miss:ST.poolMiss-a0[1], thawMs:ST.thawMs-a0[2], thawN:ST.thawN-a0[3], max:+max.toFixed(1), p99:+fr[Math.floor(fr.length*.99)].toFixed(2), pool:ST.poolList.length} }''')
    v1 = vuelta(); v2 = vuelta(); print(v1); print(v2)
    chk(v2['miss'] <= max(2, v2['hit'] * .1), 'segunda vuelta: casi todo se reutiliza (aciertos %d, fallos %d)' % (v2['hit'], v2['miss']))
    chk(v2['thawMs'] <= v1['thawMs'] * .8 or v1['thawN'] == 0, 'descongelar cuesta menos en la segunda vuelta (%.1f → %.1f ms)' % (v1['thawMs'], v2['thawMs']))
    chk(v2["pool"] <= 120, 'la reserva queda acotada (%d sectores ≤ 120)' % v2['pool'])
    chk(v2['max'] <= 25, 'ningún fotograma de cull pasa de 25 ms (máx. %.1f ms)' % v2['max'])
    chk(not errs, 'sin errores JS ' + str(errs[:2]))
sys.exit(1 if bad else 0)
