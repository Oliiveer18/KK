import os,math
from playwright.sync_api import sync_playwright
with sync_playwright() as p:
    b=p.chromium.launch(executable_path='/usr/bin/google-chrome',args=['--no-sandbox','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist'])
    errs=[];pg=b.new_context().new_page();pg.on('pageerror',lambda e:errs.append(str(e)))
    pg.goto('file://'+os.path.abspath('index.html'));pg.wait_for_timeout(1500);pg.evaluate('begin()');pg.wait_for_timeout(2000)
    r=pg.evaluate("""(()=>{ boxes.length=0; props.slice().forEach(q=>scene.remove(q.g)); props.length=0; const res=[];
      for (const [ang,y] of [[0,.3],[.6,.5],[-.9,.65],[1.8,.4],[3.1,.55],[-2.2,.7]]) {
        boxes.length=0; addProp('barrel',0,6,0); const q=props[props.length-1]; q.hp=q.maxHp=9999; q.pushable=false; q.holes=[]; q.decals=[]; q.fluid=1;
        const R=4, ox=q.x+Math.sin(ang)*R, oz=q.z+Math.cos(ang)*R, off=.12;                       // tiro con desplazamiento lateral
        const dx0=q.x-ox, dz0=q.z-oz, l=Math.hypot(dx0,dz0), dx=dx0/l, dz=dz0/l, sx=-dz*off, sz=dx*off;
        spawnBullet(ox+sx,y,oz+sz,dx,dz,cur);
        for(let i=0;i<40;i++) update(1/60);
        const h=q.holes[0], dc=q.decals.filter(m=>m.geometry!==WET_GEO)[0], w=new THREE.Vector3(); if(dc) dc.getWorldPosition(w);
        // distancia del punto de la marca a la recta de la bala y radio respecto al eje
        const px=w.x-(ox+sx), pz=w.z-(oz+sz), tt=px*dx+pz*dz, perp=Math.abs(px*(-dz)+pz*dx), rad=Math.hypot(w.x-q.x,w.z-q.z);
        res.push({ang,y,marca:!!dc, perp:+perp.toFixed(3), radio:+rad.toFixed(3), yMarca:dc?+w.y.toFixed(2):null, tieneAgujero:!!h, agujeroY:h&&+h.y.toFixed(2),
          dirFuga:h&&+(h.nx*dx+h.nz*dz).toFixed(2), rastro:q.decals.length-(dc?1:0), antesDelBarril: tt< Math.hypot(ox+sx-q.x,oz+sz-q.z)});
        scene.remove(q.g); props.pop(); }
      return res; })()""")
    for x in r: print(x)
    print(errs)
