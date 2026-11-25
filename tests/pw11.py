from playwright.sync_api import sync_playwright
INIT=open('t/pw4.py').read().split('INIT="""')[1].split('"""')[0]
INIT+="""window.mkax=(down,axes)=>{const p=mkpad(down);p.axes=axes;return p};"""
with sync_playwright() as p:
    b=p.chromium.launch(executable_path='/usr/bin/google-chrome',args=['--no-sandbox','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist'])
    for name,vp in [('land',{'width':900,'height':560}),('port',{'width':390,'height':780})]:
        pg=b.new_context(viewport=vp).new_page(); pg.add_init_script(INIT)
        errs=[];pg.on('pageerror',lambda e:errs.append(str(e)))
        pg.goto('file:///home/claude/prototipo_inline.html'); pg.wait_for_timeout(600); pg.click('#go'); pg.wait_for_timeout(300)
        ev=pg.evaluate
        # apunta hacia arriba-derecha con el stick derecho + L2
        ev("window.__pad=mkax([6],[0,0,.7,-.7])"); pg.wait_for_timeout(1500)
        print(name,'ads',round(ev('P.ads'),2),'aim',round(ev('P.aim'),2),'lead',round(ev('Math.hypot(camLook.x-P.pos.x,camLook.z-P.pos.z)'),2),'laser',ev('laser.visible'))
        pg.screenshot(path=f't/ads_{name}.png'); print(' err',errs,pg.eval_on_selector('#err','e=>e.textContent'))
    pg=b.new_context(viewport={'width':900,'height':560}).new_page(); pg.add_init_script(INIT); pg.goto('file:///home/claude/prototipo_inline.html'); pg.wait_for_timeout(600); pg.click('#go')
    ev=pg.evaluate
    ev("window.__pad=mkpad([1])"); pg.wait_for_timeout(150); ev("window.__pad=mkpad([])"); pg.wait_for_timeout(500)
    ev("window.__pad=mkax([10],[0,-1,0,0])"); pg.wait_for_timeout(1500)
    print('correr agachado: crouchT',ev('P.crouchT'),'velocidad',round(ev('P.vel.length()'),1),'(agachado andando ~2.7, de pie corriendo 8.2)')
    pg.screenshot(path='t/crouchrun.png'); b.close()
