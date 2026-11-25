from playwright.sync_api import sync_playwright
with sync_playwright() as p:
    b=p.chromium.launch(executable_path='/usr/bin/google-chrome',args=['--no-sandbox','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist'])
    pg=b.new_context(viewport={'width':900,'height':560}).new_page()
    errs=[];pg.on('pageerror',lambda e:errs.append(str(e)))
    pg.goto('file:///home/claude/prototipo_inline.html'); pg.wait_for_timeout(600); pg.click('#go'); pg.mouse.move(450,100)
    pg.keyboard.down('KeyD'); pg.keyboard.down('ShiftLeft'); pg.wait_for_timeout(1200)
    pg.keyboard.down('KeyC'); pg.wait_for_timeout(300)
    print(pg.evaluate("({sld:P.sld,py:+P.py.toFixed(2),f0:feet.map(f=>[+(f.pos.x-P.pos.x).toFixed(2),+f.h.toFixed(2)]),nan:[...feet.map(f=>f.pos.x),P.py].some(isNaN)})"))
    pg.screenshot(path='t/slide.png'); pg.keyboard.up('KeyC'); pg.wait_for_timeout(200)
    print(errs); b.close()
