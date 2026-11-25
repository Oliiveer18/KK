from playwright.sync_api import sync_playwright
with sync_playwright() as p:
    b=p.chromium.launch(executable_path='/usr/bin/google-chrome',args=['--no-sandbox','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist'])
    pg=b.new_context(viewport={'width':800,'height':600}).new_page()
    pg.goto('file:///home/claude/prototipo_inline.html'); pg.wait_for_timeout(1500)
    print(pg.eval_on_selector('#err','e=>e.style.display+"|"+e.textContent'))
    b.close()
