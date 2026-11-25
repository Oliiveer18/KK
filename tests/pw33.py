from playwright.sync_api import sync_playwright
with sync_playwright() as p:
    b=p.chromium.launch(executable_path='/usr/bin/google-chrome',args=['--no-sandbox','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist'])
    pg=b.new_context(viewport={'width':900,'height':560},device_scale_factor=2).new_page()
    errs=[];pg.on('pageerror',lambda e:errs.append(str(e)))
    pg.goto('file:///home/claude/prototipo_inline.html'); pg.wait_for_timeout(700); pg.click('#go'); ev=pg.evaluate
    r=ev("""(()=>{started=true;mode='kb';mouse.x=innerWidth/2;mouse.y=60;for(let i=0;i<60;i++)update(1/60);
      const out={};for(const w of ['rifle','pistol','shot']){while(cur.kind!==w){flags.swap=true;for(let i=0;i<40;i++)update(1/60)}
        W.ammo=0;W.reload=0;W.dropped=false;let ymax=0,t=0,restAt=-1;let c=null;
        for(let i=0;i<300;i++){update(1/60);const m=MG.pool.find(q=>q.life>0);if(m){c=m;if(m.rest&&restAt<0)restAt=i/60;}}
        const f=MG.pool.filter(q=>q.life>0).map(q=>({y:+q.m.position.y.toFixed(3),hy:+q.hy.toFixed(3),rest:q.rest,w:q.w.length().toFixed(2)}));
        out[w]=f}
      return out})()""")
    for k,v in r.items(): print(k,v)
    print(errs); b.close()
