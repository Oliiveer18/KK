from playwright.sync_api import sync_playwright
with sync_playwright() as p:
    b=p.chromium.launch(executable_path='/usr/bin/google-chrome',args=['--no-sandbox','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist'])
    pg=b.new_context(viewport={'width':900,'height':600}).new_page(); pg.on('pageerror',lambda e:print('ERR',e))
    pg.goto('file:///home/claude/prototipo_inline.html'); pg.wait_for_timeout(1000)
    print(pg.evaluate("""()=>{const f=props.filter(p=>p.type==='fence'),r={n:f.length};const a=f[0];
      r.pen=bulletHitProp(a,a.box,a.x-.5,a.z-.1,0,1,20,.2);
      for(let i=0;i<4;i++)damageProp(a,12,a.x,a.z,0,1,'bullet'); for(let i=0;i<90;i++)update(1/60);
      r.dead=a.dead; r.deb=DEB.length; const c=f[1]; c.burnT=5; for(let i=0;i<200;i++)update(1/60); r.burn=c.hp; return r;}"""))
    b.close()
