"""Compartir materiales, texturas y geometrías idénticos (MAPA.dedupe) no cambia la imagen: el distrito (?mapa=6) se dibuja igual con y sin
deduplicar (?nodedupe), desde varios puntos, píxel a píxel; y de verdad ahorra (muchas menos texturas, materiales y geometrías en la GPU).
Las piezas que el juego reconoce por identidad (tablón → carbonizado) siguen funcionando y cada tejado se sigue desvaneciendo por su cuenta."""
import os, sys, io
import numpy as np
from PIL import Image
from playwright.sync_api import sync_playwright
bad = 0
def chk(c, m):
    global bad
    print(('OK  ' if c else 'FALLO ') + m); bad += 0 if c else 1
PUNTOS = [(-445, -445), (-445, -400), (0, -312), (-30, -30), (0, 0), (-330, -440), (0, -430), (-430, 0), (250, 250), (-187, -187), (380, -200), (-495, 0)]
ARGS = ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist']
def shots(pg):
    ev = pg.evaluate; out = []
    for (x, z) in PUNTOS:
        ev('''([x,z])=>{camera.position.set(x+__off.x,__off.y+P.pos.y,z+__off.z);sun.target.position.set(x,0,z);sun.position.set(x-8,16,z+6);MAPA.cull(camera);__orig(scene,camera)}''', [x, z])
        pg.wait_for_timeout(120); out.append(np.asarray(Image.open(io.BytesIO(pg.screenshot())).convert('RGB')).astype(int))
    return out
with sync_playwright() as p:
    b = p.chromium.launch(executable_path='/usr/bin/google-chrome', args=ARGS)
    pg = b.new_page(viewport={'width': 900, 'height': 500}); errs = []; pg.on('pageerror', lambda e: errs.append(str(e))); ev = pg.evaluate
    pg.goto('file://' + os.path.abspath('index.html') + '?mapa=6&nodedupe&nolazy'); pg.wait_for_timeout(1200); ev('begin()'); pg.wait_for_timeout(1500)
    ev('''()=>{menuOpen=true;for(const el of [...document.body.children]){if(el!==renderer.domElement)el.style.visibility='hidden'}
      window.__orig=renderer.render.bind(renderer);renderer.render=()=>{};window.__off=camera.position.clone().sub(P.pos)}''')
    A = shots(pg); ia = ev('({tex:renderer.info.memory.textures,geo:renderer.info.memory.geometries})')
    d = ev('()=>{const B=MAPA.built;B.dedupe=MAPA.dedupe([B.group].concat(B.sectors));return B.dedupe}')
    B = shots(pg); ib = ev('({tex:renderer.info.memory.textures,geo:renderer.info.memory.geometries})')
    peor = 0
    for (x, z), a, c in zip(PUNTOS, A, B):
        px = int((np.abs(a - c).max(axis=2) > 2).sum()); peor = max(peor, px); print('  (%d, %d): píxeles distintos %d' % (x, z, px))
    print('sin deduplicar', ia, '· deduplicado', ib, d)
    chk(peor == 0, 'misma imagen con y sin deduplicar en %d puntos (peor: %d píxeles distintos)' % (len(PUNTOS), peor))
    chk(ib['tex'] * 5 < ia['tex'], 'muchas menos texturas en la GPU (%d → %d)' % (ia['tex'], ib['tex']))
    chk(ib['geo'] * 2 < ia['geo'], 'muchas menos geometrías en la GPU (%d → %d)' % (ia['geo'], ib['geo']))
    chk(d.get('materiales') and d['materiales'][1] * 4 < d['materiales'][0], 'muchos menos materiales %s' % d.get('materiales'))
    r = ev('''()=>{const pr=props.find(p=>!p.dead&&p.pieces&&p.pieces.some(pc=>pc.obj&&pc.obj.material===PM.plank));
      const B=OBJ.buildings.filter(b=>b.roofs&&b.roofs.length).slice(0,2);const m0=B[0].roofs[0].slab.material,m1=B[1].roofs[0].slab.material;
      m0.opacity=.3;const ok=m1.opacity===1;m0.opacity=1;return {plank:!!pr,roofs:m0!==m1&&ok}}''')
    chk(r['plank'], 'los tablones siguen siendo PM.plank (se carbonizan al arder)')
    chk(r['roofs'], 'cada tejado conserva su propio material (se desvanece sólo el del edificio en el que entras)')
    chk(not errs, 'sin errores JS ' + str(errs[:2]))
sys.exit(1 if bad else 0)
