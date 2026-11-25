from playwright.sync_api import sync_playwright
with sync_playwright() as p:
    b=p.chromium.launch(executable_path='/usr/bin/google-chrome',args=['--no-sandbox','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist'])
    pg=b.new_context(viewport={'width':900,'height':600}).new_page(); pg.on('pageerror',lambda e:print('ERR',e))
    pg.goto('file:///home/claude/prototipo_inline.html'); pg.wait_for_timeout(1000)
    pg.evaluate("""()=>{const c=props.find(p=>p.type==='crate'); P.pos.set(c.x-4,0,c.z+4); camLook.x=c.x;camLook.z=c.z;
      for(let i=0;i<10;i++)bulletHitProp(c,c.box,c.x-.5,c.z+.2,1,0,12,.6);
      damageProp(c,50,c.x,c.z,1,0,'bullet'); const f=props.find(p=>p.type==='barrelFuel'); bulletHitProp(f,f.box,f.x-.3,f.z,1,0,10,.6);
      for(let i=0;i<20;i++)update(1/60);}""")
    pg.wait_for_timeout(300); pg.screenshot(path='t/p41.png'); b.close()
