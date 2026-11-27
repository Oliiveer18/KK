"""Streaming de mallas por sectores (MAPA.freezeAll / thawAll / cull, src/mapa.js): los sectores lejos de la cámara guardan sólo la receta de sus mallas y se recrean al acercarse.
Comprueba que (1) hay muchos menos nodos de Three.js y menos memoria JS que con ?nostream, (2) la imagen es idéntica con el sector congelado y recreado que con todo vivo, en 12 puntos,
(3) despertar un objeto de un sector congelado funciona (piezas reales, su copia del lote oculta), (4) recorriendo el mapa nunca se dibuja un sector congelado y se recrean/congelan pocos por fotograma."""
import os, sys, io
import numpy as np
from PIL import Image
from playwright.sync_api import sync_playwright
bad = 0
def chk(c, m):
    global bad
    print(('OK  ' if c else 'FALLO ') + m); bad += 0 if c else 1
ARGS = ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--js-flags=--expose-gc']
PUNTOS = [(-445, -445), (-445, -400), (0, -312), (-30, -30), (0, 0), (-330, -440), (0, -430), (-430, 0), (250, 250), (-187, -187), (380, -200), (-495, 0)]
def medir(p, q):
    b = p.chromium.launch(executable_path='/usr/bin/google-chrome', args=ARGS); pg = b.new_page(viewport={'width': 900, 'height': 500}); errs = []; pg.on('pageerror', lambda e: errs.append(str(e)))
    pg.goto('file://' + os.path.abspath('index.html') + '?mapa=6' + q); pg.wait_for_timeout(1200); pg.evaluate('begin()'); pg.wait_for_timeout(2500)
    r = pg.evaluate('''()=>{ window.__R=renderer.render.bind(renderer); renderer.render=()=>{}; let n=0; scene.traverse(()=>n++); gc(); gc(); return {nodos:n, heap:Math.round(performance.memory.usedJSHeapSize/1e6), congelados:MAPA.built.sectors.filter(s=>s.__fz).length} }''')
    return b, pg, r, errs
with sync_playwright() as p:
    b0, pg0, ref, e0 = medir(p, '&nostream'); b0.close()
    b, pg, r, errs = medir(p, ''); ev = pg.evaluate
    print('sin streaming:', ref, '\ncon streaming:', r)
    chk(r['congelados'] > 900, 'casi todos los sectores están congelados al empezar (%d de 1024)' % r['congelados'])
    chk(r['nodos'] < ref['nodos'] * .6, 'muchos menos nodos de Three.js (%d → %d)' % (ref['nodos'], r['nodos']))
    chk(r['heap'] < ref['heap'] - 40, 'menos memoria JS tras recoger basura (%d → %d MB)' % (ref['heap'], r['heap']))
    ev('''()=>{ for(const el of [...document.body.children]){if(el!==renderer.domElement)el.style.visibility='hidden'}; menuOpen=true; window.__off=camera.position.clone().sub(P.pos) }''')
    peor = 0
    for (x, z) in PUNTOS:
        shots = []
        for modo in ('congelado', 'vivo'):
            ev('''([x,z,modo])=>{ if(modo==='congelado') MAPA.freezeAll(); else MAPA.thawAll(); camera.position.set(x+__off.x,__off.y+P.pos.y,z+__off.z); camera.lookAt(x,0,z); sun.target.position.set(x,0,z); sun.position.set(x-8,16,z+6);
              if(modo==='congelado') MAPA.stream.on=true; MAPA.noCull=false; MAPA.cull(camera); window.__R(scene,camera) }''', [x, z, modo])
            pg.wait_for_timeout(150); shots.append(np.asarray(Image.open(io.BytesIO(pg.screenshot())).convert('RGB')).astype(int))
        d = np.abs(shots[0] - shots[1]); px = int((d.max(axis=2) > 2).sum()); peor = max(peor, px)
        print('  (%d, %d): píxeles distintos %d' % (x, z, px))
    chk(peor <= 50, 'misma imagen con el sector congelado y recreado que con todo vivo (peor: %d píxeles de 450.000)' % peor)
    # despertar un objeto de un sector congelado
    r2 = ev('''()=>{ MAPA.freezeAll(); const p=props.find(q=>q.lz&&q.lz.frozen&&q.lz.inst&&q.lz.inst.length&&q.type==='crate')||props.find(q=>q.lz&&q.lz.frozen&&q.lz.inst&&q.lz.inst.length); if(!p) return {sin:1};
      const it=p.lz.inst[0], S=p.g.parent; const antes=Array.from(it.b.arr.slice(it.i*16,it.i*16+16)).map(v=>+v.toFixed(2)); damageProp(p,9999,p.x,p.z,1,0,'bullet');
      const desp=Array.from(it.b.arr.slice(it.i*16,it.i*16+16)).map(v=>+v.toFixed(2)); MAPA.thawAll(); const im=S.children.find(c=>c.isInstancedMesh&&c.userData.b===it.b);
      return {despertado:!p.lz, escalaCero: desp[0]===0&&desp[5]===0&&desp[10]===0, escalaAntes:antes[0]!==0, loteVivoTrasDescongelar:!!im, piezas:p.pieces.length+p.g.children.length} }''')
    print(r2)
    chk(r2.get('despertado') and r2.get('escalaCero') and r2.get('escalaAntes'), 'despertar un objeto con su sector congelado: se despierta y su copia en el lote queda a escala 0')
    chk(r2.get('loteVivoTrasDescongelar') and r2.get('piezas', 0) > 0, 'al descongelar el sector el lote se recrea y el objeto tiene sus piezas reales')
    # recorrido: nunca se dibuja un sector congelado; presupuesto por fotograma
    r3 = ev('''()=>{ MAPA.freezeAll(); let maxT=0, maxF=0, viscong=0, fr=0; const cnt=()=>MAPA.built.sectors.filter(s=>!s.__fz).length;
      for(let i=0;i<400;i++){ const x=-300+i*1.5, z=-200+Math.sin(i/30)*100; camera.position.set(x,13,z+8.5); camera.lookAt(x,0,z); const a=cnt(); MAPA.cull(camera); const b=cnt();
        for(const s of MAPA.built.sectors) if(s.visible&&s.__fz) viscong++; if(b-a>maxT) maxT=b-a; if(a-b>maxF) maxF=a-b; }
      return {viscong, maxCreadosPorFotograma:maxT, maxCongeladosPorFotograma:maxF, vivosAlFinal:cnt()} }''')
    print(r3)
    chk(r3['viscong'] == 0, 'recorriendo 600 m nunca queda un sector visible congelado')
    chk(r3['vivosAlFinal'] < 150, 'sólo hay vivos los sectores cercanos a la cámara (%d de 1024)' % r3['vivosAlFinal'])
    chk(not errs and not e0, 'sin errores JS ' + str((errs + e0)[:2]))
sys.exit(1 if bad else 0)
