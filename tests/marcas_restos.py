import os
from playwright.sync_api import sync_playwright
with sync_playwright() as p:
    b=p.chromium.launch(executable_path='/usr/bin/google-chrome',args=['--no-sandbox','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist'])
    errs=[];pg=b.new_context().new_page();pg.on('pageerror',lambda e:errs.append(str(e)))
    pg.goto('file://'+os.path.abspath('index.html'));pg.wait_for_timeout(1500);pg.evaluate('begin()');pg.wait_for_timeout(2000)
    r=pg.evaluate("""(()=>{ const res=[];
      for (const t of ['crate','crateS','fence','barrier','blocks','sandbags','barrel','barrelX']) { for(let rep=0;rep<3;rep++){
        boxes.length=0; props.slice().forEach(q=>scene.remove(q.g)); props.length=0; DEB.slice().forEach(d=>scene.remove(d.o)); DEB.length=0;
        const before=scene.children.length; addProp(t.replace('X',''),0,6,0); const q=props[props.length-1]; q.hp=q.maxHp=9999; q.pushable=false; if(t==='barrelX'){q.explosive=true;}
        for(let k=0;k<7;k++){ const ang=Math.random()*6.28, y=.2+Math.random()*.6, R=4, ox=Math.sin(ang)*R, oz=6+Math.cos(ang)*R, dx=-Math.sin(ang), dz=-Math.cos(ang); spawnBullet(ox,y,oz,dx,dz,cur); for(let i=0;i<20;i++) update(1/60); }
        const ds=q.decals.slice(); destroyProp(q,1,0,1);
        for(let i=0;i<60*3;i++) update(1/60);
        const bad=[]; const w=new THREE.Vector3(), sc=new THREE.Vector3();
        for(const m of ds){ m.getWorldPosition(w); m.getWorldScale(sc); const par=m.parent; let inScene=false; let a=m; while(a){ if(a===scene){inScene=true;break;} a=a.parent; }
          const big=Math.max(sc.x,sc.y); bad.push({parent:par?(par.geometry?'pieza':'otro'):'nada', inScene, y:+w.y.toFixed(2), tam:+big.toFixed(2), vis:m.visible}); }
        const raros=bad.filter(x=>!x.inScene||x.tam>.25||x.y>1.5||x.parent!=='pieza');
        const extra=scene.children.filter(c=>c.material&&c.material.color&&c.material.color.getHex()===0x050505).map(c=>({y:+c.position.y.toFixed(2),s:+c.scale.x.toFixed(2)}));
        res.push({t,rep,n:ds.length,raros:raros.slice(0,3),manchasNegras:extra}); } }
      return res; })()""")
    for x in r: print(x)
    print(errs)
