import os
from playwright.sync_api import sync_playwright
with sync_playwright() as p:
    b=p.chromium.launch(executable_path='/usr/bin/google-chrome',args=['--no-sandbox','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist'])
    errs=[];pg=b.new_context().new_page();pg.on('pageerror',lambda e:errs.append(str(e)))
    pg.goto('file://'+os.path.abspath('index.html'));pg.wait_for_timeout(1500);pg.evaluate('begin()');pg.wait_for_timeout(2000)
    r=pg.evaluate("""(()=>{ boxes.length=0; addProp('barrel',P.pos.x+3,P.pos.z+3,0); const q=props[props.length-1];
      q.holes.push({y:.3,nx:1,nz:0,x:q.x+.3,z:q.z,ox:.3,oz:0,burning:false});
      for(let i=0;i<10;i++) update(1/60);
      pushProp(q,4,0); const x0=q.x; for(let i=0;i<60;i++) update(1/60);
      const h=q.holes[0]; return {moved:+(q.x-x0).toFixed(2), holeToBarrel:+(h.x-q.x).toFixed(2), fluid:+q.fluid.toFixed(3)} })()""")
    print(r,errs)
