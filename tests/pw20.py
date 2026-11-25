from playwright.sync_api import sync_playwright
with sync_playwright() as p:
    b=p.chromium.launch(executable_path='/usr/bin/google-chrome',args=['--no-sandbox','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist'])
    pg=b.new_context(viewport={'width':900,'height':560},device_scale_factor=2).new_page()
    errs=[];pg.on('pageerror',lambda e:errs.append(str(e)))
    pg.goto('file:///home/claude/prototipo_inline.html'); pg.wait_for_timeout(600); pg.click('#go'); pg.mouse.move(450,100)
    pg.keyboard.down('KeyA'); pg.keyboard.down('ShiftLeft'); pg.wait_for_timeout(900)
    pg.keyboard.down('KeyC')
    for i,t in enumerate((150,250)):
        pg.wait_for_timeout(t)
        pr=pg.evaluate("(()=>{const v=P.pos.clone().project(camera);return [(v.x+1)/2*innerWidth,(1-v.y)/2*innerHeight]})()")
        pg.screenshot(path=f't/sl{i}.png',clip={'x':pr[0]-110,'y':pr[1]-90,'width':220,'height':150})
        print(pg.evaluate("({v:+P.vel.length().toFixed(1),sk:+P.sk.toFixed(2),py:+P.py.toFixed(2),nan:isNaN(P.py)})"))
    pg.keyboard.up('KeyC'); pg.wait_for_timeout(500); print(pg.evaluate("({sld:P.sld,sk:+P.sk.toFixed(2),ct:P.crouchT})")); print(errs); b.close()
