"""Sin parpadeo de píxeles (z-fighting) dentro de las tiendas del distrito (?mapa=6). Al entrar, el tejado deja de tapar el interior; si dos superficies
opacas están exactamente en el mismo plano, la GPU no sabe cuál va delante y los píxeles «bailan» al moverse (más en el móvil).
Comprueba: (1) el suelo de cada edificio no coincide con ninguna otra superficie opaca (rayos verticales por toda la planta); (2) dentro de cada objeto
ninguna pieza de distinto material comparte cara con otra mirando al mismo lado; (3) lo mismo en las franjas y remates de la fachada del edificio."""
import os, sys
from playwright.sync_api import sync_playwright
bad = 0
def chk(c, m):
    global bad
    print(('OK  ' if c else 'FALLO ') + m); bad += 0 if c else 1
with sync_playwright() as p:
    b = p.chromium.launch(executable_path='/usr/bin/google-chrome', args=['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'])
    pg = b.new_page(viewport={'width': 900, 'height': 500}); errs = []; pg.on('pageerror', lambda e: errs.append(str(e))); ev = pg.evaluate
    pg.goto('file://' + os.path.abspath('index.html') + '?mapa=6&nolazy'); pg.wait_for_timeout(1000); ev('begin()'); ev('()=>{menuOpen=true}')
    r = ev('''()=>{scene.updateMatrixWorld(true);const rc=new THREE.Raycaster(),floor={},box=new THREE.Box3();
      const SH=['super','mini','pharm','clinic','warehouse','station','gasshop'];
      for(const bd of OBJ.buildings){if(!SH.includes(bd.kind))continue;let n=0;
        for(let i=-6;i<=6;i++)for(let j=-6;j<=6;j++){const sw=Math.abs(Math.sin(bd.rot))>.5,hx=(sw?bd.D:bd.W)/2-.4,hz=(sw?bd.W:bd.D)/2-.4;
          rc.set(new THREE.Vector3(bd.x+i/6*hx,.5,bd.z+j/6*hz),new THREE.Vector3(0,-1,0));rc.far=.6;
          const hs=rc.intersectObjects(scene.children,true).filter(h=>!h.object.material.transparent&&h.object.visible);if(hs.length<2)continue;
          if(Math.abs(hs[0].distance-hs[1].distance)<.003&&hs[0].object.material!==hs[1].object.material)n++}
        floor[bd.kind]=(floor[bd.kind]||0)+n}
      const same=(G)=>{const L=[];for(const o of G.children){if(!o.isMesh||o.rotation.x||o.rotation.y||o.rotation.z)continue;const g=o.geometry;if(g.type!=='BoxGeometry'&&g.attributes.position.count!==24)continue;
          if(!g.boundingBox)g.computeBoundingBox();box.copy(g.boundingBox);const s=o.scale,q=o.position;
          L.push({m:o.material,mn:[box.min.x*s.x+q.x,box.min.y*s.y+q.y,box.min.z*s.z+q.z],mx:[box.max.x*s.x+q.x,box.max.y*s.y+q.y,box.max.z*s.z+q.z]})}
        let n=0;for(let i=0;i<L.length;i++)for(let j=i+1;j<L.length;j++){const a=L[i],c=L[j];if(a.m===c.m)continue;
          for(let k=0;k<3;k++){const u=(k+1)%3,v=(k+2)%3;if(Math.min(a.mx[u],c.mx[u])-Math.max(a.mn[u],c.mn[u])<=.001||Math.min(a.mx[v],c.mx[v])-Math.max(a.mn[v],c.mn[v])<=.001)continue;
            if(Math.abs(a.mx[k]-c.mx[k])<2e-4)n++;if(k!==1&&Math.abs(a.mn[k]-c.mn[k])<2e-4)n++}}return n};
      let props_=0,bld=0;for(const p of props)props_+=same(p.g);for(const bd of OBJ.buildings)bd.group.traverse(o=>{if(!o.isMesh&&o.children.length)bld+=same(o)});
      return {floor,props:props_,bld}}''')
    print(r)
    chk(all(v == 0 for v in r['floor'].values()), 'el suelo de las tiendas no coincide con ninguna otra superficie (rayos por toda la planta) %s' % r['floor'])
    chk(r['props'] == 0, 'ninguna pieza de un objeto comparte cara con otra de distinto material (%d)' % r['props'])
    chk(r['bld'] == 0, 'ninguna franja o remate de fachada comparte cara con la pared (%d)' % r['bld'])
    chk(not errs, 'sin errores JS ' + str(errs[:2]))
sys.exit(1 if bad else 0)
