"""Pasada de sombra con sectores recortados (SOMBRA, src/rendimiento.js): el mapa de sombra tiene que ser EXACTAMENTE el mismo que con la pasada completa (un objeto fuera de la caja de ±14 m del sol no puede
proyectar sombra dentro de ella) y la pasada hace bastantes menos llamadas y triángulos. Se compara en 6 puntos del distrito, con zombis y combatientes en escena."""
import os, sys
from playwright.sync_api import sync_playwright
bad = 0
def chk(c, m):
    global bad
    print(('OK  ' if c else 'FALLO ') + m); bad += 0 if c else 1
PUNTOS = [(-445, -445), (0, -312), (-30, -30), (0, 0), (250, 250), (-187, -187), (110, -60)]
with sync_playwright() as p:
    b = p.chromium.launch(executable_path='/usr/bin/google-chrome', args=['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'])
    pg = b.new_page(viewport={'width': 900, 'height': 500}); errs = []; pg.on('pageerror', lambda e: errs.append(str(e))); ev = pg.evaluate
    pg.goto('file://' + os.path.abspath('index.html') + '?mapa=6&look=d&progresivo=1'); pg.wait_for_timeout(1200); ev('begin()'); pg.wait_for_function('()=>!document.getElementById("loadUI")', timeout=120000); pg.wait_for_timeout(1500)
    ev('()=>{ MX.pl.inv=1e9; for(let i=0;i<120;i++){ time+=1/60; update(1/60); } }')
    tot = {'cull': [0, 0], 'full': [0, 0]}; dif_total = 0
    for (x, z) in PUNTOS:
        r = ev('''([x,z])=>{ P.pos.set(x,0,z); MX.pl.p.set(x,0,z); for(let i=0;i<30;i++){ time+=1/60; update(1/60); MAPA.cull(camera); }
          const sm=renderer.shadowMap; camera.updateMatrixWorld(); sun.target.position.set(x,0,z); sun.position.set(x-8,16,z+6); renderer.render(scene,camera);
          let dc=0; const orig=renderer.renderBufferDirect.bind(renderer); renderer.renderBufferDirect=function(cam,fog,geo,mat,obj,grp){ if(mat.type==='MeshDepthMaterial'||mat.isMeshDistanceMaterial) dc++; return orig(cam,fog,geo,mat,obj,grp) };
          const S=sun.shadow.mapSize.x; const read=()=>{ const a=new Uint8Array(S*S*4); renderer.readRenderTargetPixels(sun.shadow.map,0,0,S,S,a); return a };
          // 1) con recorte: pre() hasta que toque fotograma de sombra
          sun.target.position.set(x,0,z); sun.position.set(x-8,16,z+6); let n=0; do { SOMBRA.pre(); n++; if(sm.needsUpdate||n>3) break; SOMBRA.post(); } while(true);
          const hid=SOMBRA.hidden; const sp=sun.position.clone(), tp=sun.target.position.clone(); dc=0; renderer.render(scene,camera); const c1=dc; const A=read(); SOMBRA.post();
          // 2) pasada completa de three con la misma posición del sol
          sun.position.copy(sp); sun.target.position.copy(tp); sm.autoUpdate=false; sm.needsUpdate=true; dc=0; renderer.render(scene,camera); const c2=dc; const B=read(); sm.autoUpdate=true;
          renderer.renderBufferDirect=orig; let d=0; for(let i=0;i<A.length;i++) if(A[i]!==B[i]) d++; return {d, c1, c2, hid} }''', [x, z])
        print((x, z), r)
        dif_total += r['d']; tot['cull'][0] += r['c1']; tot['full'][0] += r['c2']
    chk(dif_total == 0, 'el mapa de sombra es idéntico byte a byte con y sin recorte (%d bytes distintos en %d puntos)' % (dif_total, len(PUNTOS)))
    chk(tot['cull'][0] < tot['full'][0], 'menos llamadas en la pasada de sombra: %d frente a %d (%.0f %% menos; en las zonas de borde del mapa, hasta todas)' % (tot['cull'][0], tot['full'][0], 100 * (1 - tot['cull'][0] / max(1, tot['full'][0]))))
    chk(not errs, 'sin errores JS ' + str(errs[:2]))
sys.exit(1 if bad else 0)
