import sys
from playwright.sync_api import sync_playwright
f=sys.argv[1]
with sync_playwright() as p:
    b=p.chromium.launch(executable_path='/usr/bin/google-chrome',args=['--no-sandbox','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist'])
    ctx=b.new_context(viewport={'width':390,'height':780},has_touch=True,is_mobile=True)
    pg=ctx.new_page()
    pg.on('console',lambda m:print('CONSOLE',m.type,m.text[:200]))
    pg.on('pageerror',lambda e:print('PAGEERROR',str(e)[:300]))
    pg.goto('file://'+f); pg.wait_for_timeout(2500)
    print('err box:',pg.eval_on_selector('#err','e=>e.style.display+"|"+e.textContent'))
    print('btn display:',pg.eval_on_selector('#bDash','e=>getComputedStyle(e).display'))
    pg.screenshot(path='/home/claude/t/shot.png')
    b.close()
