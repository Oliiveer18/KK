from playwright.sync_api import sync_playwright
with sync_playwright() as p:
    b=p.chromium.launch(executable_path='/usr/bin/google-chrome',args=['--no-sandbox','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist'])
    pg=b.new_context(viewport={'width':900,'height':600}).new_page(); pg.on('pageerror',lambda e:print('ERR',e))
    pg.goto('file:///home/claude/prototipo_inline.html'); pg.wait_for_timeout(1000)
    print(pg.evaluate("""()=>{const bar=props.find(p=>p.type==='barrier');P.pos.set(bar.x,0,bar.z+.9);P.aim=Math.PI;
      const run=(ads,n)=>{for(let i=0;i<n;i++){P.crouch=1;P.ads=ads;update(1/60);}return +P.pyP.toFixed(3)};
      return {hid:run(0,90),peek:run(1,60),hid2:run(0,90),hunk:P.hunk}}"""))
    b.close()
