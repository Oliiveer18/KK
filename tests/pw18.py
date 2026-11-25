from playwright.sync_api import sync_playwright
with sync_playwright() as p:
    b=p.chromium.launch(executable_path='/usr/bin/google-chrome',args=['--no-sandbox','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist'])
    pg=b.new_context(viewport={'width':900,'height':560},device_scale_factor=2).new_page()
    pg.goto('file:///home/claude/prototipo_inline.html'); pg.wait_for_timeout(600); pg.click('#go'); pg.mouse.move(450,100)
    pg.keyboard.down('KeyA'); pg.keyboard.down('ShiftLeft'); pg.wait_for_timeout(900)
    pg.keyboard.down('KeyC'); pg.wait_for_timeout(250)
    pr=pg.evaluate("(()=>{const v=P.pos.clone().project(camera);return [(v.x+1)/2*innerWidth,(1-v.y)/2*innerHeight]})()")
    pg.screenshot(path='t/slide2.png',clip={'x':pr[0]-110,'y':pr[1]-90,'width':220,'height':150}); b.close()
