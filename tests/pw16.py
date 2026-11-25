from playwright.sync_api import sync_playwright
with sync_playwright() as p:
    b=p.chromium.launch(executable_path='/usr/bin/google-chrome',args=['--no-sandbox','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist'])
    pg=b.new_context(viewport={'width':900,'height':560}).new_page()
    errs=[];pg.on('pageerror',lambda e:errs.append(str(e)))
    pg.goto('file:///home/claude/prototipo_inline.html'); pg.wait_for_timeout(600); pg.click('#go')
    ev=pg.evaluate
    pg.keyboard.down('KeyD'); pg.wait_for_timeout(900)
    pg.keyboard.press('KeyC'); pg.wait_for_timeout(700); print('andando+toque',ev("({sld:P.sld,ct:P.crouchT})"))
    pg.keyboard.up('KeyD'); pg.keyboard.press('KeyC'); pg.wait_for_timeout(300)
    pg.keyboard.down('KeyD'); pg.keyboard.down('ShiftLeft'); pg.wait_for_timeout(1200)
    pg.keyboard.press('KeyC'); pg.wait_for_timeout(1500); print('corriendo+toque',ev("({sld:P.sld,ct:P.crouchT,v:+P.vel.length().toFixed(1)})"))
    print(errs); b.close()
