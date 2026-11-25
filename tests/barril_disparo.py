import os, json
from playwright.sync_api import sync_playwright
with sync_playwright() as p:
    b=p.chromium.launch(executable_path='/usr/bin/google-chrome',args=['--no-sandbox','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist'])
    errs=[];pg=b.new_context().new_page();pg.on('pageerror',lambda e:errs.append(str(e)))
    pg.goto('file://'+os.path.abspath('index.html'));pg.wait_for_timeout(1500);pg.evaluate('begin()');pg.wait_for_timeout(2000)
    r=pg.evaluate("""(()=>{ boxes.length=0; props.slice().forEach(q=>scene.remove(q.g)); props.length=0; P.pos.set(0,0,-8);
      const cases=[]; const out={rows:[],water:[]};
      const cap=[]; const so=spawn; spawn=function(t,pos,vel){ if(t==='water') cap.push([pos.x,pos.y,pos.z,vel.x,vel.y,vel.z]); return so.apply(this,arguments) };
      // casos: [ángulo del disparo respecto a +z (grados), desplazamiento lateral, altura]
      const T=[[0,0,.45],[0,.2,.3],[0,-.25,.6],[35,.0,.45],[-50,.1,.35],[80,0,.45],[20,.28,.5],[0,.29,.45]];
      T.forEach((c,i)=>{ boxes.length=0; props.slice().forEach(q=>scene.remove(q.g)); props.length=0; const bx=0, bz=0; addProp('barrel',bx,bz,0); const q=props[props.length-1]; q.hp=q.maxHp=9999; q.pushable=false;
        const a=c[0]*Math.PI/180, dx=-Math.sin(a), dz=-Math.cos(a);          // la bala viaja hacia el barril desde +z (rotada)
        const sx=bx+Math.sin(a)*3+(Math.cos(a))*c[1], sz=bz+Math.cos(a)*3-(Math.sin(a))*c[1];
        cap.length=0; q.decals=[]; spawnBullet(sx,c[2],sz,dx,dz,cur);
        for(let k=0;k<40;k++) update(1/60);
        const h=q.holes[0]; const d=q.decals||[]; let dp=null;
        if(d.length){ const w=new THREE.Vector3(); d[0].getWorldPosition(w); dp=w; }
        // distancia del punto de la marca a la trayectoria de la bala y al eje del barril
        let dist=null,rad=null; if(dp){ const vx=dp.x-sx, vz=dp.z-sz; dist=Math.abs(vx*dz-vz*dx); rad=Math.hypot(dp.x-bx,dp.z-bz); }
        // el chorro: primeras partículas tras el agujero
        const ws=cap.slice(0,20); let dot=null, from=null; if(h&&ws.length){ let sd=0,sf=0; for(const w of ws){ sd+=(w[3]*h.nx+w[5]*h.nz)/(Math.hypot(w[3],w[5])||1); sf+=Math.hypot(w[0]-h.x,w[2]-h.z)+Math.abs(w[1]-h.y); } dot=sd/ws.length; from=sf/ws.length; }
        out.rows.push({caso:c,hit:!!h,marca:d.length,distMarcaATrayectoria:dist===null?null:+dist.toFixed(3),radioMarca:rad===null?null:+rad.toFixed(3),alturaMarca:dp?+dp.y.toFixed(2):null,
          normalHueco:h?[+h.nx.toFixed(2),+h.nz.toFixed(2)]:null,hacia_tirador:h?+(h.nx*-dx+h.nz*-dz).toFixed(2):null,chorro_dir_dot_normal:dot===null?null:+dot.toFixed(2),chorro_origen_dist_agujero:from===null?null:+from.toFixed(3)});
      });
      return out; })()""")
    for x in r['rows']: print(x)
    print(errs)
