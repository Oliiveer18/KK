"""Tras 7 s, ¿algún trozo queda apoyado sobre un canto (menos de 3 esquinas en el suelo)? Repite 12 veces con direcciones al azar.
Uso: python3 tests/restos_apoyo.py [index.html]"""
import os, sys
from playwright.sync_api import sync_playwright
with sync_playwright() as p:
    b=p.chromium.launch(executable_path='/usr/bin/google-chrome',args=['--no-sandbox','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist'])
    errs=[];pg=b.new_context().new_page();pg.on('pageerror',lambda e:errs.append(str(e)))
    pg.goto('file://'+os.path.abspath(sys.argv[1] if len(sys.argv)>1 else 'index.html'));pg.wait_for_timeout(1500);pg.evaluate('begin()');pg.wait_for_timeout(2000)
    print(pg.evaluate("""(()=>{ const res={trozos:0,dormidos:0,sobreCanto:0}; for(let r=0;r<12;r++){ boxes.length=0; props.slice().forEach(q=>scene.remove(q.g)); props.length=0; DEB.length=0;
      for (const t of ['crate','fence','barrier','blocks']) { addProp(t,(Math.random()-.5)*6,6,0); const q=props[props.length-1]; q.hp=q.maxHp=9999; destroyProp(q,(Math.random()-.5)*2,Math.random()-.5,1+Math.random()); }
      for(let f=0;f<60*7;f++) update(1/60);
      for (const d of DEB) { res.trozos++; if(d.sleep) res.dormidos++; const R=new THREE.Matrix4().makeRotationFromQuaternion(d.Q).elements; let low=0;
        for(let a=0;a<8;a++){ const lx=(a&1?1:-1)*d.h[0], ly=(a&2?1:-1)*d.h[1], lz=(a&4?1:-1)*d.h[2]; const y=d.X.y+R[1]*lx+R[5]*ly+R[9]*lz; if(y<.03) low++; }
        if (low<3) res.sobreCanto++; } } return res; })()"""),errs or 'sin errores JS')
