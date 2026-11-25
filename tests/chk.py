from playwright.sync_api import sync_playwright
with sync_playwright() as p:
    b=p.chromium.launch(executable_path='/usr/bin/google-chrome',args=['--no-sandbox','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist'])
    pg=b.new_context().new_page(); pg.on('pageerror',lambda e:print('ERR',e)); pg.on('console',lambda m:print('C',m.text[:200]) if m.type=='error' else None)
    pg.goto('file:///home/claude/prototipo_inline.html'); pg.wait_for_timeout(1500); b.close()
