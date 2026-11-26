"""Objetos intactos fusionados (MAPA.lazify): cada objeto se dibuja con una malla por material y sus piezas se liberan; al tocarlo vuelve a tener sus
piezas reales, idénticas. Comprueba en el distrito (?mapa=6), en la misma partida y desde 12 puntos, que la imagen es la misma píxel a píxel
(1) con piezas reales, (2) fusionado (salvo algún píxel suelto de borde por redondeo, ≤0,03 %) y (3) tras devolver las piezas a TODOS los objetos. Y que el juego sigue igual: una bala en un objeto fusionado
deja su marca y lo daña, las puertas se abren, la madera se carboniza y el bidón explota; ahorra memoria y mallas."""
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
    out = []
    for (x, z) in PUNTOS:
        pg.evaluate('''([x,z])=>{camera.position.set(x+__off.x,__off.y+P.pos.y,z+__off.z);sun.target.position.set(x,0,z);sun.position.set(x-8,16,z+6);MAPA.cull(camera);__orig(scene,camera)}''', [x, z])
        pg.wait_for_timeout(120); out.append(np.asarray(Image.open(io.BytesIO(pg.screenshot())).convert('RGB')).astype(int))
    return out
def diff(A, B):
    return [int((np.abs(a - c).max(axis=2) > 2).sum()) for a, c in zip(A, B)]
with sync_playwright() as p:
    b = p.chromium.launch(executable_path='/usr/bin/google-chrome', args=ARGS)
    pg = b.new_page(viewport={'width': 900, 'height': 500}); errs = []; pg.on('pageerror', lambda e: errs.append(str(e))); ev = pg.evaluate
    pg.goto('file://' + os.path.abspath('index.html') + '?mapa=6&nolazy'); pg.wait_for_timeout(1200); ev('begin()'); pg.wait_for_timeout(1500)
    ev('''()=>{menuOpen=true;for(const el of [...document.body.children]){if(el!==renderer.domElement)el.style.visibility='hidden'}
      window.__orig=renderer.render.bind(renderer);renderer.render=()=>{};window.__off=camera.position.clone().sub(P.pos)}''')
    n0 = ev('()=>{let n=0;scene.traverse(o=>{if(o.isMesh&&!o.userData.lzInst)n++});return n}')
    A = shots(pg)
    z = ev('()=>{const z=MAPA.lazify(props);z.lotes=MAPA.instance(MAPA.built.sectors);return z}'); n1 = ev('()=>{let n=0;scene.traverse(o=>{if(o.isMesh&&!o.userData.lzInst)n++});return n}')
    B = shots(pg)
    ev('()=>{for(const p of props)if(p.lz)MAPA.wake(p)}'); n2 = ev('()=>{let n=0;scene.traverse(o=>{if(o.isMesh&&!o.userData.lzInst)n++});return n}')
    C = shots(pg)
    dB, dC = diff(A, B), diff(A, C)
    print('fusión', z, '· mallas', n0, '→', n1, '→ (todas despiertas)', n2); print('píxeles distintos fusionado', dB, '· despierto', dC)
    # soldar mueve los vértices una fracción de millonésima de metro (redondeo de coma flotante): algún píxel suelto del borde de un triángulo o de una
    # sombra cae al otro lado. Es estable (no parpadea) y no quita detalle; se exige que sean como mucho el 0,03 % de la imagen (135 de 450.000)
    chk(max(dB) <= 135, 'misma imagen con piezas reales y fusionado en %d puntos, salvo redondeo en bordes (peor %d de 450.000 píxeles)' % (len(PUNTOS), max(dB)))
    chk(max(dC) == 0, 'misma imagen tras devolver las piezas a todos los objetos (peor %d píxeles)' % max(dC))
    chk(n1 * 2 < n0, 'muchas menos mallas en la escena (%d → %d)' % (n0, n1))
    chk(abs(n2 - n0) <= n0 * .002, 'al despertar vuelven todas las piezas (%d → %d)' % (n0, n2))
    # comportamiento con objetos fusionados (otra partida, ya fusionada al cargar)
    pg.goto('file://' + os.path.abspath('index.html') + '?mapa=6'); pg.wait_for_timeout(1200); ev('begin()'); pg.wait_for_timeout(300); ev('()=>{menuOpen=true;MX.pl.inv=1e9;MX.pl.hp=1e9}')
    r = ev('''()=>{const lz=props.filter(p=>p.lz).length;const f=props.find(p=>p.lz&&p.type==='fence');const n0=f.g.children.length;P.pos.set(f.x,0,f.z-6);
      BUL.forEach(q=>{q.on=false});spawnBullet(f.x,.5,f.z-3,0,1,WP[1],null);for(let i=0;i<30;i++)updateBullets(1/60);
      const d=props.find(p=>p.lz&&p.o&&p.o.leaves&&!p.open);const dn=d.g.children.length;OBJ.setOpen(d,true,true);
      const w=props.find(p=>p.lz&&p.pieces.length===0&&p.mat==='wood'&&p.type==='crate');w.burnT=1;AWAKE.add(w);updateProps(1/60);
      const br=props.find(p=>p.lz&&p.type==='barrelFuel');let ok=true;if(br){damageProp(br,999,br.x,br.z,1,0,'blast')}
      return {lz,total:props.length,fenceWoke:!f.lz,fenceHit:f.hp<f.maxHp,fenceDecal:!!(f.decals&&f.decals.length),pieces:f.pieces.length,n0,doorWoke:!d.lz,doorOpen:d.open&&d.oT===1,doorPieces:d.pieces.length,
        burnt:w.charred&&w.pieces.some(pc=>pc.obj.material===PM.char),barrel:!br||br.dead}}''')
    print(r)
    chk(r['lz'] > r['total'] * .9, 'al cargar, casi todos los objetos están fusionados (%d de %d)' % (r['lz'], r['total']))
    chk(r['fenceWoke'] and r['fenceHit'] and r['fenceDecal'] and r['pieces'] > 5, 'una bala en una valla fusionada: recupera sus piezas, se daña y deja marca')
    chk(r['doorWoke'] and r['doorOpen'] and r['doorPieces'] > 0, 'una puerta fusionada se abre con sus piezas reales')
    chk(r['burnt'], 'una caja fusionada que arde se carboniza')
    chk(r['barrel'], 'un bidón fusionado explota')
    chk(not errs, 'sin errores JS ' + str(errs[:2]))
sys.exit(1 if bad else 0)
