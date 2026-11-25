"""Rendimiento sin tirones: tras begin() ya están compilados todos los shaders (todas las combinaciones de luces) y subidas las geometrías.
Comprueba que explosión, destrucción de objetos y disparos no compilan programas nuevos ni disparan picos de dibujo (CPU) de más de 80 ms."""
import os, sys
from playwright.sync_api import sync_playwright
bad = 0
def chk(c, m):
    global bad
    print(('OK  ' if c else 'FALLO ') + m); bad += 0 if c else 1
with sync_playwright() as p:
    b = p.chromium.launch(executable_path='/usr/bin/google-chrome', args=['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'])
    pg = b.new_page(viewport={'width': 900, 'height': 500}); errs = []; pg.on('pageerror', lambda e: errs.append(str(e))); ev = pg.evaluate
    pg.add_init_script("""window.__H=[];window.__tag='x';
      const wrap=()=>{ if(typeof renderer==="undefined"||!renderer||window.__w) return; window.__w=1;
        const r=renderer.render.bind(renderer); renderer.render=function(a,c){const t=performance.now();r(a,c);const d=performance.now()-t;if(d>80)__H.push([__tag,Math.round(d)])}; }; setInterval(wrap,20);""")
    for mapa in ('3', '5'):
        pg.goto('file://' + os.path.abspath('index.html') + '?mapa=' + mapa); pg.wait_for_timeout(1200)
        ev('begin()'); pg.wait_for_timeout(1500)
        n0 = ev('()=>renderer.info.programs.length'); ev('()=>{__H.length=0;__tag="juego"}')
        pg.mouse.move(600, 250); pg.mouse.down(); pg.wait_for_timeout(2000); pg.mouse.up()
        ev('()=>{explode({x:P.pos.x+6,y:.3,z:P.pos.z},6,1,"frag",null)}'); pg.wait_for_timeout(1200)
        ev('()=>{let n=0;for(const p of props.slice()){if(p.dead||!p.type)continue;damageProp(p,9999,p.x,p.z,1,0,"bullet");if(++n>=15)break}}'); pg.wait_for_timeout(2000)
        n1 = ev('()=>renderer.info.programs.length'); H = ev('()=>__H')
        chk(n1 == n0, 'mapa %s: ningún shader nuevo tras empezar (%d → %d programas)' % (mapa, n0, n1))
        chk(not H, 'mapa %s: sin picos de dibujo > 80 ms durante disparos, explosión y destrucción %s' % (mapa, H[:3]))
    chk(not errs, 'sin errores JS ' + str(errs[:2]))
sys.exit(1 if bad else 0)
