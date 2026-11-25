from playwright.sync_api import sync_playwright
INIT=open('t/pw4.py').read().split('INIT="""')[1].split('"""')[0]
INIT+="""window.mkax=(down,axes)=>{const p=mkpad(down);p.axes=axes;return p};"""
with sync_playwright() as p:
    b=p.chromium.launch(executable_path='/usr/bin/google-chrome',args=['--no-sandbox','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist'])
    pg=b.new_context(viewport={'width':900,'height':560}).new_page(); pg.add_init_script(INIT)
    errs=[];pg.on('pageerror',lambda e:errs.append(str(e)))
    pg.goto('file:///home/claude/prototipo_inline.html'); pg.wait_for_timeout(600); pg.click('#go'); pg.wait_for_timeout(300)
    ev=pg.evaluate; sp=lambda: round(ev('P.vel.length()'),1)
    ev("window.__pad=mkax([],[0,-1,0,0])"); pg.wait_for_timeout(1200); print('andando:',sp())
    ev("window.__pad=mkax([10],[0,-1,0,0])"); pg.wait_for_timeout(200); ev("window.__pad=mkax([],[0,-1,0,0])"); pg.wait_for_timeout(1200)
    print('tras 1 toque L3 y soltar, sigo moviendo:',sp(),'latch',ev('P.sprintLatch'))
    ev("window.__pad=mkax([],[0,0,0,0])"); pg.wait_for_timeout(900); print('paro -> latch',ev('P.sprintLatch'))
    ev("window.__pad=mkax([10],[0,0,0,0])"); pg.wait_for_timeout(200); ev("window.__pad=mkax([],[0,0,0,0])"); pg.wait_for_timeout(300)
    print('toque L3 parado -> latch',ev('P.sprintLatch'),'(armado)')
    ev("window.__pad=mkax([],[0,-1,0,0])"); pg.wait_for_timeout(1200); print('empiezo a moverme:',sp())
    ev("window.__pad=mkax([7],[0,-1,0,0])"); pg.wait_for_timeout(300); print('disparar cancela -> latch',ev('P.sprintLatch'))
    print('errs',errs,pg.eval_on_selector('#err','e=>e.textContent')); b.close()
