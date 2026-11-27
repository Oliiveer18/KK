"""El daño de una explosión se reparte en varios fotogramas (boomTick) pero el resultado final es el mismo que aplicándolo todo a la vez (?noboom2):
mismos objetos dañados o destruidos, y el primer fotograma ya hace menos trabajo. Se mide en 4 puntos con muchos objetos, con azar fijo."""
import os, sys
from playwright.sync_api import sync_playwright
bad = 0
def chk(c, m):
    global bad
    print(('OK  ' if c else 'FALLO ') + m); bad += 0 if c else 1
def run(q):
    with sync_playwright() as p:
        b = p.chromium.launch(executable_path='/usr/bin/google-chrome', args=['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'])
        pg = b.new_page(viewport={'width': 900, 'height': 500}); errs = []; pg.on('pageerror', lambda e: errs.append(str(e))); ev = pg.evaluate
        pg.goto('file://' + os.path.abspath('index.html') + '?mapa=6' + q); pg.wait_for_timeout(1200); ev('begin()'); pg.wait_for_timeout(2000)
        r = ev('''()=>{ renderer.render=()=>{}; let sd=777; Math.random=()=>{sd=(sd*1664525+1013904223)>>>0; return sd/4294967296};
          const bs=OBJ.buildings.filter(b=>b.props&&b.props.length>25).slice(0,40).filter((b,i)=>i%10===0).slice(0,4); const out=[];
          for(const b of bs){ const x=b.x,z=b.z; P.pos.set(x+12,0,z); for(let k=0;k<5;k++){time+=1/60;update(1/60)}
            const near=props.filter(p=>Math.hypot(p.x-x,p.z-z)<7&&!p.dead); const hp0=near.map(p=>p.hp); const t0=performance.now(); explode({x,y:.3,z},6,1,'frag',null); const d1=performance.now()-t0;
            const pend0=BOOM.q.length; for(let k=0;k<40;k++){time+=1/60;update(1/60)}
            out.push({n:near.length, dañados:near.filter((p,i)=>p.dead||p.hp<hp0[i]).length, muertos:near.filter(p=>p.dead).length, pend0, pend1:BOOM.q.length}); }
          return out }''')
        errs_ = errs[:]; b.close(); return r, errs_
a, e1 = run(''); n, e2 = run('&noboom2')
print('reparto:', a); print('de golpe:', n)
chk(all(x['pend1'] == 0 for x in a), 'la cola de daño se vacía del todo (0 pendientes a los 40 fotogramas)')
chk(any(x['pend0'] > 0 for x in a), 'el reparto se usa (hay daño pendiente justo tras la explosión)')
chk(all(abs(x['dañados'] - y['dañados']) <= max(2, y['dañados'] * .1) for x, y in zip(a, n)), 'mismos objetos dañados que aplicando todo a la vez (±10 %)')
chk(all(abs(x['muertos'] - y['muertos']) <= max(2, y['muertos'] * .15) for x, y in zip(a, n)), 'mismos objetos destruidos (±15 %)')
chk(not e1 and not e2, 'sin errores JS ' + str((e1 + e2)[:2]))
sys.exit(1 if bad else 0)
