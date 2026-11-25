from playwright.sync_api import sync_playwright
INIT=open('t/pw4.py').read().split('INIT="""')[1].split('"""')[0]
with sync_playwright() as p:
    b=p.chromium.launch(executable_path='/usr/bin/google-chrome',args=['--no-sandbox','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist'])
    pg=b.new_context(viewport={'width':800,'height':600}).new_page(); pg.add_init_script(INIT)
    errs=[];pg.on('pageerror',lambda e:errs.append(str(e)))
    pg.goto('file:///home/claude/prototipo_inline.html'); pg.wait_for_timeout(600); pg.click('#go'); pg.wait_for_timeout(300)
    ev=pg.evaluate
    ev("window.__pad=mkpad([4])"); pg.wait_for_timeout(500); print('L1 mantener: gState',ev('P.gState'),ev('P.gType'),'dash',ev('P.dash'),'dashCD',round(ev('P.dashCD'),2))
    ev("window.__pad=mkpad([])"); pg.wait_for_timeout(300); print(' lanzada: sCount',ev('P.sCount'),'activas',ev('grens.filter(g=>g.on).length'))
    pg.wait_for_timeout(2200); print(' humo: nubes',ev('clouds.length'),'bocanadas',ev('puffs.filter(q=>q.life>0).length'))
    pg.wait_for_timeout(1500); pg.screenshot(path='t/smoke.png')
    ev("window.__pad=mkpad([11])"); pg.wait_for_timeout(150); ev("window.__pad=mkpad([])"); print('R3 dash cd',round(ev('P.dashCD'),2))
    pg.wait_for_timeout(1200); ev("window.__pad=mkpad([5])"); pg.wait_for_timeout(300); ev("window.__pad=mkpad([])"); pg.wait_for_timeout(2700)
    print('frag ok: gCount',ev('P.gCount'),'booms',ev('booms.filter(b=>b.t>=0).length')>=0)
    pg.wait_for_timeout(8000); print('puffs vivas tras 12 s',ev('puffs.filter(q=>q.life>0).length'),'nubes',ev('clouds.length'))
    print('errs',errs,pg.eval_on_selector('#err','e=>e.textContent')); b.close()
