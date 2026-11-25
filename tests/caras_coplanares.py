import os
from playwright.sync_api import sync_playwright
with sync_playwright() as p:
    b=p.chromium.launch(executable_path='/usr/bin/google-chrome',args=['--no-sandbox','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist'])
    errs=[];pg=b.new_context().new_page();pg.on('pageerror',lambda e:errs.append(str(e)))
    pg.goto('file://'+os.path.abspath('index.html'));pg.wait_for_timeout(1500);pg.evaluate('begin()');pg.wait_for_timeout(2000)
    print(pg.evaluate("({near:camera.near,far:camera.far,fov:camera.fov, log:renderer.capabilities.logarithmicDepthBuffer})"))
    r=pg.evaluate("""(()=>{ boxes.length=0; props.slice().forEach(q=>scene.remove(q.g)); props.length=0; const out={};
      for (const t of ['crate','crateS','fence','barrier','sandbags','blocks','barrel']) { addProp(t,0,5,0); const q=props[props.length-1]; q.g.updateMatrixWorld(true);
        const bx=q.pieces.map(pc=>{ const b=new THREE.Box3().setFromObject(pc.obj); return {b, c:pc.obj.material.color.getHex(), g:pc.obj.geometry.type}; }).filter(x=>x.g==='BoxGeometry');
        const hits=[]; const E=1e-4;
        for(let i=0;i<bx.length;i++) for(let j=i+1;j<bx.length;j++){ const A=bx[i].b,B=bx[j].b; if(bx[i].c===bx[j].c) continue;
          for (const [ax,u,v] of [['x','y','z'],['y','x','z'],['z','x','y']]) for (const side of ['min','max']) {
            if (Math.abs(A[side][ax]-B[side][ax])<E) {
              const ou=Math.min(A.max[u],B.max[u])-Math.max(A.min[u],B.min[u]), ov=Math.min(A.max[v],B.max[v])-Math.max(A.min[v],B.min[v]);
              if (ou>E && ov>E) hits.push([ax+side, +ou.toFixed(3), +ov.toFixed(3)]); } } }
        out[t]={pairs:hits.length, ej:hits.slice(0,3)}; scene.remove(q.g); props.pop(); }
      return out; })()""")
    for k,v in r.items(): print(k,v)
