from playwright.sync_api import sync_playwright
with sync_playwright() as p:
    b=p.chromium.launch(executable_path='/usr/bin/google-chrome',args=['--no-sandbox','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist'])
    pg=b.new_context(viewport={'width':700,'height':440}).new_page()
    pg.goto('file:///home/claude/prototipo_inline.html'); pg.wait_for_timeout(700); pg.click('#go')
    r=pg.evaluate("""(()=>{started=true;mouse.x=innerWidth/2;mouse.y=60;mode='kb';for(let i=0;i<60;i++)update(1/60);keys.KeyW=true;keys.ShiftLeft=true;const o=[];
      for(let i=0;i<110;i++){update(1/60);if(i>=60&&i<100){const ph=j=>((GAIT.phase+j*.5)%1).toFixed(2);const d=j=>Math.hypot(feet[j].pos.x-hip[j].x,feet[j].pos.z-hip[j].z).toFixed(2);
      o.push([i,P.vel.length().toFixed(1),ph(0),ph(1),feet[0].stepping?'S':'-',feet[1].stepping?'S':'-',feet[0].armed?'a':'.',feet[1].armed?'a':'.',d(0),d(1),P.py.toFixed(2)].join(' '))}}return o.join('\\n')})()""")
    print(r); b.close()
