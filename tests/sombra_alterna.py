"""Sombras en fotogramas alternos (SOMBRA, src/rendimiento.js): la imagen es la misma que con la sombra rehecha en cada fotograma, salvo el redondeo del anclaje a texels
en los bordes de las sombras, y el fotograma sin pasada de sombra hace bastantes menos llamadas de dibujo. Se compara en 6 puntos del distrito."""
import os, sys, io
import numpy as np
from PIL import Image
from playwright.sync_api import sync_playwright
bad = 0
def chk(c, m):
    global bad
    print(('OK  ' if c else 'FALLO ') + m); bad += 0 if c else 1
PUNTOS = [(-445, -445), (0, -312), (-30, -30), (0, 0), (250, 250), (-187, -187)]
with sync_playwright() as p:
    b = p.chromium.launch(executable_path='/usr/bin/google-chrome', args=['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'])
    pg = b.new_page(viewport={'width': 900, 'height': 500}); errs = []; pg.on('pageerror', lambda e: errs.append(str(e))); ev = pg.evaluate
    pg.goto('file://' + os.path.abspath('index.html') + '?mapa=6'); pg.wait_for_timeout(1200); ev('begin()'); pg.wait_for_timeout(2500)
    ev('''()=>{menuOpen=true;for(const el of [...document.body.children]){if(el!==renderer.domElement)el.style.visibility='hidden'}
      renderer.info.autoReset=false;window.__orig=(a,b)=>{renderer.info.reset();renderer.render.__o?0:0;return window.__o(a,b)};window.__o=renderer.render.bind(renderer);renderer.render=()=>{};window.__off=camera.position.clone().sub(P.pos)}''')
    peor = 0; ahorro = []
    for (x, z) in PUNTOS:
        shots = []; calls = []
        for alt in (False, True):
            r = ev('''([x,z,alt])=>{camera.position.set(x+__off.x,__off.y+P.pos.y,z+__off.z);sun.target.position.set(x,0,z);sun.position.set(x-8,16,z+6);MAPA.cull(camera);
              const c=[];
              if(!alt){renderer.shadowMap.autoUpdate=true;__orig(scene,camera);c.push(renderer.info.render.calls,renderer.info.render.calls);}
              else{for(let i=0;i<4;i++){sun.target.position.set(x,0,z);sun.position.set(x-8,16,z+6);SOMBRA.pre();__orig(scene,camera);SOMBRA.post();c.push(renderer.info.render.calls)}}
              return c}''', [x, z, alt])
            pg.wait_for_timeout(150)
            shots.append(np.asarray(Image.open(io.BytesIO(pg.screenshot())).convert('RGB')).astype(int)); calls.append(r)
        d = np.abs(shots[0] - shots[1]); px = int((d.max(axis=2) > 12).sum()); peor = max(peor, px)
        # fotogramas: SOMBRA.pre alterna k; el que actualiza la sombra tiene más llamadas que el que no
        c = calls[1]; ahorro.append((max(c), min(c)))
        print('  (%d, %d): píxeles distintos %d de %d · llamadas fotograma con sombra %d / sin sombra %d' % (x, z, px, 900 * 500, max(c), min(c)))
    chk(peor <= 900 * 500 * .004, 'misma imagen (peor: %d píxeles distintos, máx. 0,4 %%: sólo bordes de sombra por el anclaje a texels)' % peor)
    chk(all(a[1] < a[0] for a in ahorro), 'el fotograma sin pasada de sombra hace menos llamadas de dibujo (%s)' % ahorro)
    chk(not errs, 'sin errores JS ' + str(errs[:2]))
sys.exit(1 if bad else 0)
