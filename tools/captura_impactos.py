"""Captura de cerca de los impactos de bala en varios objetos (herramienta, no es un test).
Uso: python3 -I tools/captura_impactos.py crate,barrel,sandbags NOMBRE X Y ANCHO ALTO
Coloca los objetos en fila, les dispara 7 balas a cada uno y guarda el recorte en /tmp/impactos_NOMBRE.png."""
import os,sys
from playwright.sync_api import sync_playwright
if len(sys.argv) < 7: sys.exit(__doc__)
types=sys.argv[1].split(',')
with sync_playwright() as p:
    b=p.chromium.launch(executable_path='/usr/bin/google-chrome',args=['--no-sandbox','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist'])
    errs=[];ctx=b.new_context(viewport={'width':900,'height':560},device_scale_factor=3);pg=ctx.new_page();pg.on('pageerror',lambda e:errs.append(str(e)))
    pg.goto('file://'+os.path.abspath('index.html'));pg.wait_for_timeout(1500);pg.evaluate('begin()');pg.wait_for_timeout(2000)
    pg.evaluate("""(types=>{ boxes.length=0; props.slice().forEach(q=>scene.remove(q.g)); props.length=0; P.pos.set(0,0,-4);
      types.forEach((t,i)=>{ addProp(t, -2.4*(types.length-1)/2+i*2.4, -1.2, 0); const q=props[props.length-1]; q.hp=q.maxHp=9999;
        q.pushable=false; for(let k=0;k<7;k++) spawnBullet(q.x+(k-3)*.1,.3+k*.06,q.z+4,0,-1,cur); }); })""",types)
    for _ in range(90): pg.evaluate('update(1/60)')
    pg.screenshot(path='/tmp/impactos_%s.png'%sys.argv[2],clip={'x':float(sys.argv[3]),'y':float(sys.argv[4]),'width':float(sys.argv[5]),'height':float(sys.argv[6])})
    print(errs)
