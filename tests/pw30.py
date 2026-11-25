from playwright.sync_api import sync_playwright
with sync_playwright() as p:
    b=p.chromium.launch(executable_path='/usr/bin/google-chrome',args=['--no-sandbox','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist'])
    pg=b.new_context(viewport={'width':700,'height':440}).new_page()
    errs=[];pg.on('pageerror',lambda e:errs.append(str(e)))
    pg.goto('file:///home/claude/prototipo_inline.html'); pg.wait_for_timeout(700); pg.click('#go'); pg.mouse.move(350,60); ev=pg.evaluate
    ev("window.M={mx:0,vx:0};(function l(){M.mx=Math.max(M.mx,Math.hypot(RC.x,RC.z));M.vx=Math.max(M.vx,P.vel.length());requestAnimationFrame(l)})()")
    for w in ('rifle','pistol','shot'):
        while ev("cur.kind")!=w: pg.keyboard.press('KeyQ'); pg.wait_for_timeout(900)
        ev("M.mx=0;M.vx=0;W.ammo=W.max;W.cd=0")
        for _ in range(4 if w!='rifle' else 12): pg.mouse.down(); pg.wait_for_timeout(100); pg.mouse.up(); pg.wait_for_timeout(120 if w=='rifle' else 700); ev("W.ammo=W.max")
        pg.wait_for_timeout(600)
        print(w,'desplazamiento máx torso m',round(ev("M.mx"),3),'empuje vel máx',round(ev("M.vx"),2),'reposo',round(ev("Math.hypot(RC.x,RC.z)"),4),'nan',ev("isNaN(RC.x)"))
    print(errs); b.close()
