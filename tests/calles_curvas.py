"""Calles curvas del generador de mapas: asfalto, aceras cortadas en los cruces, marcas; sin errores y con pocas mallas. Captura en docs/img/calles_curvas.png."""
import os, sys
from playwright.sync_api import sync_playwright
bad = 0; errs = []
def chk(c, m):
    global bad
    print(('OK  ' if c else 'FALLO ') + m); bad += 0 if c else 1
with sync_playwright() as p:
    b = p.chromium.launch(executable_path='/usr/bin/google-chrome', args=['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'])
    pg = b.new_page(viewport={'width': 1200, 'height': 800}); pg.on('pageerror', lambda e: errs.append(str(e))); ev = pg.evaluate
    pg.goto('file://' + os.path.abspath('index.html') + '?mapa=5'); pg.wait_for_timeout(1000); ev('begin()'); pg.wait_for_timeout(600)
    r = ev('''()=>{const D={half:100,ground:'grass',roads:[{axis:'x',c:0,a0:-100,a1:100,w:12},{pts:[[-100,60],[-50,40],[0,10],[30,-30],[80,-60],[110,-70]],w:9},{pts:[[-60,-90],[-40,-40],[-20,0],[-10,50],[-20,100]],w:7}],surfaces:[],lots:[],refuges:[],buildings:[],objects:[],rails:[],hot:[]};
      const before=scene.children.length;const out=MAPA.build(D);let meshes=0;out.group.traverse(o=>{if(o.isMesh)meshes++});
      const P=MAPA.pathPts(D.roads[1].pts,2);let L=0;for(let i=1;i<P.length;i++)L+=Math.hypot(P[i].x-P[i-1].x,P[i].z-P[i-1].z);
      return {meshes,pts:P.length,len:Math.round(L)}}''')
    print(r)
    chk(r['pts'] > 40 and 150 < r['len'] < 330, 'la curva se remuestrea cada 2 m (%d puntos, %d m)' % (r['pts'], r['len']))
    chk(r['meshes'] <= 12, 'calles curvas fusionadas por material (%d mallas)' % r['meshes'])
    ev('()=>{menuOpen=true;MX.on=false;scene.fog=null;camera.fov=50;camera.updateProjectionMatrix();camera.position.set(0,150,1);camera.lookAt(0,0,0);renderer.render(scene,camera)}')
    pg.wait_for_timeout(500); pg.screenshot(path='docs/img/calles_curvas.png')
    chk(not errs, 'sin errores JS ' + str(errs[:2]))
sys.exit(1 if bad else 0)
