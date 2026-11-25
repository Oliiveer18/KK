"""Choques de los trozos con objetos en pie, paredes y suelo, y coste por fotograma.
 - dentro: trozos con el centro dentro de un objeto en pie tras 6 s (debe ser 0)
 - encima: trozos que acabaron apoyados encima de un objeto (válido)
 - coste: ms por fotograma de updateDebris con muchos trozos despiertos
Uso: python3 tests/restos_choques.py [index.html]"""
import os, sys
from playwright.sync_api import sync_playwright
errs=[]
with sync_playwright() as p:
    b=p.chromium.launch(executable_path='/usr/bin/google-chrome',args=['--no-sandbox','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist'])
    pg=b.new_context().new_page(); pg.on('pageerror',lambda e:errs.append(str(e)))
    pg.goto('file://'+os.path.abspath(sys.argv[1] if len(sys.argv)>1 else 'index.html')); pg.wait_for_timeout(1500); pg.evaluate('begin()'); pg.wait_for_timeout(2000)
    r=pg.evaluate("""(()=>{ const out={};
      for (const [name,wall] of [['bloques','blocks'],['barrera','barrier'],['caja','crate']]) {
        boxes.length=0; props.slice().forEach(q=>scene.remove(q.g)); props.length=0; DEB.slice().forEach(d=>scene.remove(d.o)); DEB.length=0;
        addProp(wall, 2.0, 6, 0); const w=props[props.length-1]; w.hp=w.maxHp=9999;
        addProp('crate', 0, 6, 0); const c=props[props.length-1]; c.hp=c.maxHp=9999;
        destroyProp(c, 1, 0, 1.6);                                                           // los trozos salen hacia el otro objeto
        for (let f=0; f<60*6; f++) update(1/60);
        let dentro=0, encima=0; const bx=w.box;
        for (const d of DEB) { const x=d.X.x, y=d.X.y, z=d.X.z; if (Math.abs(x-bx.x)<bx.hx-.02 && Math.abs(z-bx.z)<bx.hz-.02 && y<w.h-.02 && y>0) dentro++; if (Math.abs(x-bx.x)<bx.hx && Math.abs(z-bx.z)<bx.hz && y>=w.h-.02) encima++; }
        out[name]={trozos:DEB.length, dentro, encima, dormidos:DEB.filter(d=>d.sleep).length}; }
      // coste: 250 trozos despiertos
      boxes.length=0; DEB.length=0; for (let k=0;k<26;k++){ addProp('crate', (k%13)*.8-5, 6+(k>>4)*2, 0); const q=props[props.length-1]; q.hp=q.maxHp=9999; destroyProp(q,(Math.random()-.5)*2,1,1.4); }
      const n0=DEB.length; let t=performance.now(); for (let f=0; f<30; f++) updateDebris(1/60); out.coste={trozos:n0, msPorFotograma:+((performance.now()-t)/30).toFixed(2)};
      return out; })()""")
    for k,v in r.items(): print(k,v)
print('ERRORES JS:',errs or 'ninguno')
