import os
from playwright.sync_api import sync_playwright
with sync_playwright() as p:
    b=p.chromium.launch(executable_path='/usr/bin/google-chrome',args=['--no-sandbox','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist'])
    errs=[];pg=b.new_context().new_page();pg.on('pageerror',lambda e:errs.append(str(e)))
    pg.goto('file://'+os.path.abspath('index.html'));pg.wait_for_timeout(1500);pg.evaluate('begin()');pg.wait_for_timeout(2000)
    r=pg.evaluate("""(()=>{ boxes.length=0; props.slice().forEach(q=>scene.remove(q.g)); props.length=0;
      addProp('barrel',0,6,0); const q=props[props.length-1]; q.hp=q.maxHp=9999; q.pushable=false; q.fluid=1;
      const ang=.9, R=4, ox=q.x+Math.sin(ang)*R, oz=q.z+Math.cos(ang)*R, dx=-Math.sin(ang), dz=-Math.cos(ang);
      spawnBullet(ox,.45,oz,dx,dz,cur); for(let i=0;i<30;i++) update(1/60);
      const h=q.holes[0]; const out={hole:[+h.x.toFixed(2),+h.y.toFixed(2),+h.z.toFixed(2)], normal:[+h.nx.toFixed(2),+h.nz.toFixed(2)]};
      // partículas de agua recién nacidas: cerca del agujero y saliendo hacia fuera
      let near=0,total=0,outward=0,maxd=0; const samples=[];
      for(let f=0;f<30;f++){ update(1/60); for(const pt of parts){ if(pt.life<=0||pt.m.material!==pMat.water) continue; total++; const d=Math.hypot(pt.m.position.x-h.x,pt.m.position.y-h.y,pt.m.position.z-h.z); if(pt.life>.62){ near++; maxd=Math.max(maxd,d); if(pt.v.x*h.nx+pt.v.z*h.nz>0) outward++; } } }
      out.nuevas=near; out.salenHaciaFuera=outward; out.distMaxDelAgujeroAlNacer=+maxd.toFixed(3);
      out.charco=PUDDLES.filter(c=>c.on!==false&&c.r>0).map(c=>[+c.m.position.x.toFixed(2),+c.m.position.z.toFixed(2),+c.r.toFixed(2)]).slice(0,2);
      out.fluidoRestante=+q.fluid.toFixed(3); return out; })()""")
    print(r,errs)
