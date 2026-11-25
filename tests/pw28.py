from playwright.sync_api import sync_playwright
with sync_playwright() as p:
    b=p.chromium.launch(executable_path='/usr/bin/google-chrome',args=['--no-sandbox','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist'])
    pg=b.new_context(viewport={'width':900,'height':560},device_scale_factor=2).new_page()
    errs=[];pg.on('pageerror',lambda e:errs.append(str(e)))
    pg.goto('file:///home/claude/prototipo_inline.html'); pg.wait_for_timeout(700); pg.click('#go'); pg.mouse.move(450,100); ev=pg.evaluate
    cnt="CS.pool.filter(c=>c.life>0).length"
    def burst(name,n):
        ev("W.ammo=W.max;W.cd=0")
        for _ in range(n): pg.mouse.down(); pg.wait_for_timeout(120); pg.mouse.up(); pg.wait_for_timeout(350 if name=='ESCOPETA' else 60); ev("W.ammo=W.max")
        pg.wait_for_timeout(900)
        print(name,'casquillos activos',ev(cnt),'en reposo',ev("CS.pool.filter(c=>c.life>0&&c.rest).length"),'rojos',ev("CS.pool.filter(c=>c.life>0&&c.m.material===csMat.hull).length"),'nan',ev("CS.pool.some(c=>isNaN(c.m.position.x))"))
    burst('FUSIL',6)
    pr=ev("(()=>{const v=P.pos.clone().project(camera);return [(v.x+1)/2*innerWidth,(1-v.y)/2*innerHeight]})()")
    pg.screenshot(path='t/cas_rifle.png',clip={'x':pr[0]-120,'y':pr[1]-70,'width':240,'height':140})
    ev("CS.pool.forEach(c=>{c.life=0;c.m.visible=false})")
    pg.keyboard.press('KeyQ'); pg.wait_for_timeout(1200); pg.keyboard.press('KeyQ'); pg.wait_for_timeout(1200)
    print(ev("cur.name")); burst('PISTOLA' if ev("cur.kind")=='pistol' else ev("cur.name"),4)
    pg.keyboard.press('KeyQ'); pg.wait_for_timeout(1200); print(ev("cur.name")); burst(ev("cur.name"),3)
    pg.screenshot(path='t/cas_shot.png',clip={'x':pr[0]-120,'y':pr[1]-70,'width':240,'height':140})
    print(errs); b.close()
