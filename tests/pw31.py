from playwright.sync_api import sync_playwright
with sync_playwright() as p:
    b=p.chromium.launch(executable_path='/usr/bin/google-chrome',args=['--no-sandbox','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist'])
    pg=b.new_context(viewport={'width':700,'height':440}).new_page()
    errs=[];pg.on('pageerror',lambda e:errs.append(str(e)))
    pg.goto('file:///home/claude/prototipo_inline.html'); pg.wait_for_timeout(700); pg.click('#go'); pg.mouse.move(350,60); ev=pg.evaluate
    ev("window.L=[];window.__pad={connected:true,id:'DualSense',mapping:'standard',axes:[0,0,0,0],buttons:Array.from({length:17},()=>({pressed:false,value:0})),vibrationActuator:{playEffect:(t,o)=>{L.push([cur.kind,o.duration,o.strongMagnitude,o.weakMagnitude]);return Promise.resolve()}}};navigator.getGamepads=()=>[window.__pad]")
    for w in ('rifle','pistol','shot'):
        while ev("cur.kind")!=w: pg.keyboard.press('KeyQ'); pg.wait_for_timeout(900)
        ev("W.ammo=W.max;W.cd=0;L.length=0"); pg.mouse.down(); pg.wait_for_timeout(120); pg.mouse.up(); pg.wait_for_timeout(700); print(w,ev("L"))
    print(errs); b.close()
