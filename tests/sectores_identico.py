"""La optimización por sectores (MAPA.cull) no cambia la imagen: en el distrito completo (?mapa=6) se dibuja el mismo fotograma con los sectores
recortados y con todo el mapa visible, desde varios puntos (refugio, calles, plaza, bosque, fábrica, borde), y se comparan píxel a píxel.
También comprueba que el precalentado reducido no deja shaders sin compilar y que el recorte deja fuera la mayor parte del mapa (si no, no ahorraría nada)."""
import os, sys, io
import numpy as np
from PIL import Image
from playwright.sync_api import sync_playwright
bad = 0
def chk(c, m):
    global bad
    print(('OK  ' if c else 'FALLO ') + m); bad += 0 if c else 1
PUNTOS = [(-445, -445), (-445, -400), (0, -312), (-30, -30), (0, 0), (-330, -440), (0, -430), (-430, 0), (250, 250), (-187, -187), (380, -200), (-495, 0)]
with sync_playwright() as p:
    b = p.chromium.launch(executable_path='/usr/bin/google-chrome', args=['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'])
    pg = b.new_page(viewport={'width': 900, 'height': 500}); errs = []; pg.on('pageerror', lambda e: errs.append(str(e))); ev = pg.evaluate
    pg.goto('file://' + os.path.abspath('index.html') + '?mapa=6'); pg.wait_for_timeout(1200); ev('begin()'); pg.wait_for_timeout(2500)
    ev('''()=>{menuOpen=true;for(const el of [...document.body.children]){if(el!==renderer.domElement)el.style.visibility='hidden'}
      window.__orig=renderer.render.bind(renderer);renderer.render=()=>{};window.__off=camera.position.clone().sub(P.pos)}''')
    peor = 0; vis = []; prog0 = ev('renderer.info.programs.length')
    for (x, z) in PUNTOS:
        shots = []
        for cull in (True, False):
            n = ev('''([x,z,cull])=>{camera.position.set(x+__off.x,__off.y+P.pos.y,z+__off.z);sun.target.position.set(x,0,z);sun.position.set(x-8,16,z+6);
              MAPA.noCull=!cull;if(cull)MAPA.cull(camera);else for(const g of MAPA.built.sectors)g.visible=true;__orig(scene,camera);
              return MAPA.built.sectors.filter(g=>g.visible).length}''', [x, z, cull])
            pg.wait_for_timeout(150)
            shots.append(np.asarray(Image.open(io.BytesIO(pg.screenshot())).convert('RGB')).astype(int))
            if cull: vis.append(n)
        d = np.abs(shots[0] - shots[1]); px = int((d.max(axis=2) > 2).sum()); peor = max(peor, px)
        print('  (%d, %d): sectores visibles %d de %d · píxeles distintos %d' % (x, z, vis[-1], ev('MAPA.built.sectors.length'), px))
    tot = ev('MAPA.built.sectors.length'); prog1 = ev('renderer.info.programs.length')
    chk(prog1 == prog0, 'el precalentado (una pieza por material y geometría) ya compiló todo: ningún shader nuevo al recorrer el mapa (%d → %d)' % (prog0, prog1))
    chk(peor == 0, 'misma imagen con y sin recorte de sectores en %d puntos (peor: %d píxeles distintos)' % (len(PUNTOS), peor))
    chk(max(vis) < tot * .15, 'el recorte deja fuera la mayor parte del mapa (máx. %d de %d sectores visibles)' % (max(vis), tot))
    chk(not errs, 'sin errores JS ' + str(errs[:2]))
sys.exit(1 if bad else 0)
