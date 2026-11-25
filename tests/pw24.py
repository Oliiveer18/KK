from playwright.sync_api import sync_playwright
with sync_playwright() as p:
    b=p.chromium.launch(executable_path='/usr/bin/google-chrome',args=['--no-sandbox','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist'])
    pg=b.new_context(viewport={'width':900,'height':560},device_scale_factor=2).new_page()
    errs=[];pg.on('pageerror',lambda e:errs.append(str(e)))
    pg.goto('file:///home/claude/prototipo_inline.html'); pg.wait_for_timeout(600); pg.click('#go'); pg.mouse.move(450,100)
    pg.keyboard.down('KeyA'); pg.wait_for_timeout(500)
    pg.keyboard.press('Space'); pg.evaluate('P.dash=3'); pg.wait_for_timeout(250)
    pr=pg.evaluate("(()=>{const v=P.pos.clone().project(camera);return [(v.x+1)/2*innerWidth,(1-v.y)/2*innerHeight]})()")
    pg.screenshot(path='t/dash.png',clip={'x':pr[0]-140,'y':pr[1]-90,'width':260,'height':150})
    print(pg.evaluate("({pyP:P.pyP,sl:P.slide,sk:P.sk,sld:P.sld,cr:P.crouch,d:P.dash,py:+P.py.toFixed(2),nan:isNaN(P.py),g:GH.g.map(g=>+g.life.toFixed(2))})"))
    pg.wait_for_timeout(800); print(pg.evaluate("({d:P.dash,g:GH.g.map(g=>g.meshes[0].visible)})"),errs); b.close()
