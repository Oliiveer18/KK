import os
from playwright.sync_api import sync_playwright
with sync_playwright() as p:
    b=p.chromium.launch(executable_path='/usr/bin/google-chrome',args=['--no-sandbox','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist'])
    errs=[];pg=b.new_context().new_page();pg.on('pageerror',lambda e:errs.append(str(e)))
    pg.goto('file://'+os.path.abspath('index.html'));pg.wait_for_timeout(1500);pg.evaluate('begin()');pg.wait_for_timeout(2000)
    r=pg.evaluate("""(()=>{ const out={}; boxes.length=0; props.slice().forEach(q=>scene.remove(q.g)); props.length=0;
      const T=['barrel','crate','crateS','fence','barrier','sandbags','blocks'];
      for (const t of T) { DEB.length=0; boxes.length=0; PICKS.slice().forEach(k=>{}); addProp(t, 0, 4, 0); const q=props[props.length-1];
        if (t!=='barrel') { shedPieces(q,3,q.x,q.z+1,0,-1); shedPieces(q,3,q.x,q.z+1,0,-1); } for(let i=0;i<40;i++) updateDebris(1/60); destroyProp(q, 0, 1, 1);
        for(let i=0;i<60*8;i++) updateDebris(1/60);
        const bad=[]; for (const d of DEB) { const bb=new THREE.Box3().setFromObject(d.o); if (bb.min.y>.07 || bb.max.y<.0) bad.push([+bb.min.y.toFixed(2),+bb.max.y.toFixed(2),d.rest,d.o.geometry.type, d.o.scale.toArray().map(x=>+x.toFixed(2)).join('/')]); }
        out[t]={n:DEB.length,bad:bad.slice(0,6),nbad:bad.length}; }
      return out; })()""")
    for k,v in r.items(): print(k,v)
    print(errs)
