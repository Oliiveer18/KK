"""Objetivos como zonas de combate (Fase A): cada punto de captura tiene cobertura repartida en su zona, una pieza central en la Plaza y sigue siendo accesible.
Por objetivo se mide: objetos de cobertura (altura ≥ 0,9 m) en su radio + 4 m, qué parte de los puntos andables de la zona tiene cobertura a ≤ 3 m, cuántas direcciones
(8 sectores de 45°) tienen cobertura a ≤ 12 m desde el centro, y si hay ruta desde 4 puntos a 40 m del centro (con rodeo razonable). Umbrales por tipo de objetivo."""
import os, sys
from playwright.sync_api import sync_playwright
bad = 0
def chk(c, m):
    global bad
    print(('OK  ' if c else 'FALLO ') + m); bad += 0 if c else 1
MIN = {'PLAZA': dict(obj=28, cov3=.80, dirs=8), 'FAB': dict(obj=20, cov3=.65, dirs=7), 'EST': dict(obj=18, cov3=.60, dirs=6), 'PUE': dict(obj=16, cov3=.60, dirs=5)}
with sync_playwright() as p:
    b = p.chromium.launch(executable_path='/usr/bin/google-chrome', args=['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'])
    pg = b.new_page(viewport={'width': 900, 'height': 500}); errs = []; pg.on('pageerror', lambda e: errs.append(str(e))); ev = pg.evaluate
    pg.goto('file://' + os.path.abspath('index.html') + '?mapa=6'); pg.wait_for_timeout(1200); ev('begin()'); pg.wait_for_timeout(2500)
    R = ev('''()=>{ const out=[]; const cov=(x,z,R)=>{ let best=1e9; for(const b of boxesIn(x-R,z-R,x+R,z+R)){ const p=b.prop; const h=p?p.h:(b.wall?2.5:0); if(h<.9) continue; if(p&&p.dead) continue; const dx=Math.max(Math.abs(x-b.x)-b.hx,0), dz=Math.max(Math.abs(z-b.z)-b.hz,0); const d=Math.hypot(dx,dz); if(d<best)best=d } return best };
      for(const o of MX.SQ.objs){ if(o.id==='REF') continue; const r=o.r; let alt=0,baj=0; const tipos={}; for(const p of props){ if(p.dead)continue; if(Math.hypot(p.x-o.x,p.z-o.z)>r+4) continue; if(p.h>=1.5)alt++; else if(p.h>=.9)baj++; if(p.h>=.9) tipos[p.type]=(tipos[p.type]||0)+1 }
        let n=0,c=0; for(let x=-r;x<=r;x+=1.5) for(let z=-r;z<=r;z+=1.5){ if(x*x+z*z>r*r) continue; if(!MX.navAt(o.x+x,o.z+z)) continue; n++; if(cov(o.x+x,o.z+z,3)<=3) c++ }
        let dirs=0; for(let k=0;k<8;k++){ let ok=false; for(let d=2.5; d<=12&&!ok; d+=1){ const a=k*Math.PI/4, a2=a+Math.PI/8; for(const aa of [a-Math.PI/8,a,a+Math.PI/8]){ const x=o.x+Math.cos(aa)*d, z=o.z+Math.sin(aa)*d; for(const b of boxesIn(x-.3,z-.3,x+.3,z+.3)){ const p=b.prop; const h=p?p.h:(b.wall?2.5:0); if(h>=.9&&Math.abs(x-b.x)<=b.hx&&Math.abs(z-b.z)<=b.hz){ok=true;break} } if(ok)break } } if(ok)dirs++ }
        let rutas=0, rodeo=0; for(const [dx,dz] of [[40,0],[-40,0],[0,40],[0,-40]]){ const sx=o.x+dx, sz=o.z+dz; if(!MX.navAt(sx,sz)) { rutas++; continue } const path=MX.findPath(sx,sz,o.x,o.z); if(path&&path.length){ rutas++; let L=0,px=sx,pz=sz; for(const q of path){ L+=Math.hypot(q.x-px,q.z-pz); px=q.x;pz=q.z } L+=Math.hypot(o.x-px,o.z-pz); rodeo=Math.max(rodeo,L/40) } }
        out.push({id:o.id,code:o.code,name:o.name,x:Math.round(o.x),z:Math.round(o.z),r,altos:alt,bajos:baj,obj:alt+baj,cov3:+(c/Math.max(1,n)).toFixed(2),dirs,rutas,rodeo:+rodeo.toFixed(2),tipos:Object.entries(tipos).sort((a,b)=>b[1]-a[1]).slice(0,5).map(e=>e.join(':')).join(' ')}) }
      return out }''')
    for o in R: print('  %-34s r=%2d  objetos %2d (altos %2d, bajos %2d) · cobertura ≤3 m %3d%% · direcciones %d/8 · rutas %d/4 (rodeo ×%.2f) · %s' % (o['name'][:34], o['r'], o['obj'], o['altos'], o['bajos'], o['cov3'] * 100, o['dirs'], o['rutas'], o['rodeo'], o['tipos']))
    for o in R:
        m = MIN.get(o['id'])
        if not m: continue
        chk(o['obj'] >= m['obj'] and o['cov3'] >= m['cov3'] and o['dirs'] >= m['dirs'], '%s: cobertura suficiente (objetos ≥ %d, ≤3 m ≥ %d%%, direcciones ≥ %d)' % (o['name'], m['obj'], m['cov3'] * 100, m['dirs']))
        chk(o['rutas'] == 4 and o['rodeo'] <= 1.8, '%s: accesible desde los 4 lados (rodeo ×%.2f ≤ 1,8)' % (o['name'], o['rodeo']))
    chk(not errs, 'sin errores JS ' + str(errs[:2]))
sys.exit(1 if bad else 0)
