from playwright.sync_api import sync_playwright
with sync_playwright() as p:
    b=p.chromium.launch(executable_path='/usr/bin/google-chrome',args=['--no-sandbox','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist'])
    pg=b.new_context(viewport={'width':800,'height':600}).new_page()
    pg.goto('file:///home/claude/prototipo_inline.html'); pg.wait_for_timeout(600); pg.click('#go')
    pg.mouse.move(400,170); pg.wait_for_timeout(300)
    pg.keyboard.down('KeyH'); pg.wait_for_timeout(350); pg.screenshot(path='t/prev.png'); pg.keyboard.up('KeyH')
    pg.wait_for_timeout(4500); pg.screenshot(path='t/smoke2.png')
    print(pg.eval_on_selector('#err','e=>e.textContent'), pg.evaluate('clouds.length'))
    b.close()
