from playwright.sync_api import sync_playwright
with sync_playwright() as p:
    b=p.chromium.launch(executable_path='/usr/bin/google-chrome',args=['--no-sandbox','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist'])
    pg=b.new_context(viewport={'width':900,'height':560},device_scale_factor=2).new_page()
    errs=[];pg.on('pageerror',lambda e:errs.append(str(e)))
    pg.goto('file:///home/claude/prototipo_inline.html'); pg.wait_for_timeout(700); pg.click('#go'); pg.mouse.move(450,100); ev=pg.evaluate
    for w,n in (('rifle',8),('pistol',5),('shot',3)):
        while ev("cur.kind")!=w: pg.keyboard.press('KeyQ'); pg.wait_for_timeout(900)
        for _ in range(n): ev("W.ammo=W.max;W.cd=0"); pg.mouse.down(); pg.wait_for_timeout(110); pg.mouse.up(); pg.wait_for_timeout(450)
        print(w,'activos',ev("CS.pool.filter(c=>c.life>0).length"),'rojos',ev("CS.pool.filter(c=>c.life>0&&c.m.material===csMat.hull).length"))
    pg.wait_for_timeout(600)
    pr=ev("(()=>{const v=P.pos.clone().project(camera);return [(v.x+1)/2*innerWidth,(1-v.y)/2*innerHeight]})()")
    pg.screenshot(path='t/cas_all.png',clip={'x':pr[0]-110,'y':pr[1]-60,'width':220,'height':120}); print(errs); b.close()
