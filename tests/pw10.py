from playwright.sync_api import sync_playwright
INIT=open('t/pw4.py').read().split('INIT="""')[1].split('"""')[0]
INIT+="""window.mkax=(down,axes)=>{const p=mkpad(down);p.axes=axes;return p};"""
with sync_playwright() as p:
    b=p.chromium.launch(executable_path='/usr/bin/google-chrome',args=['--no-sandbox','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist'])
    pg=b.new_context(viewport={'width':800,'height':640}).new_page(); pg.add_init_script(INIT)
    errs=[];pg.on('pageerror',lambda e:errs.append(str(e)))
    pg.goto('file:///home/claude/prototipo_inline.html'); pg.wait_for_timeout(600); pg.click('#go'); pg.wait_for_timeout(300)
    ev=pg.evaluate
    def press(btns,ms=200):
        ev("window.__pad=mkpad(%s)"%btns); pg.wait_for_timeout(ms); ev("window.__pad=mkpad([])"); pg.wait_for_timeout(200)
    press([9]); print('Options abre menú:',ev('menuOpen'))
    press([13]); press([13]); print(' sel tras 2×↓:',ev('selIdx'))
    press([12]); press([12]); press([0]); print(' ✕ inicia rebind:',ev('JSON.stringify(rebind)'))
    press([5]); print(' R1 -> reload; BIND.reload',ev('BIND.reload'),'rebind',ev('rebind'))
    pg.screenshot(path='t/menu.png')
    ev("window.__pad=mkpad([])"); pg.click('.row[data-i="0"]'); print(' clic fila0 -> rebind',ev('rebind&&rebind.key'))
    press([0]); print(' fire->✕: BIND.fire',ev('BIND.fire'))
    press([9]); print('cierra menú:',ev('menuOpen'),'| persistido:',ev("localStorage.getItem('bind')")[:40])
    a=ev('W.ammo'); press([7],400); print('R2 ya no dispara:',a==ev('W.ammo')); press([0],400); print('✕ dispara:',ev('W.ammo')<a)
    # calibrar stick derecho (ejes 2/5 como mando sin mapeo)
    press([9]); ev("selIdx=10"); press([0]); print('calibrando:',ev('rebind&&rebind.type'))
    ev("window.__pad=mkax([],[0,0,0,0,0,0])"); pg.wait_for_timeout(300); ev("window.__pad=mkax([],[0,0,.9,0,0,0])"); pg.wait_for_timeout(250); ev("window.__pad=mkax([],[0,0,0,0,0,0])"); pg.wait_for_timeout(250)
    ev("window.__pad=mkax([],[0,0,0,0,0,.9])"); pg.wait_for_timeout(250); ev("window.__pad=mkax([],[0,0,0,0,0,0])"); pg.wait_for_timeout(250)
    print(' AXU',ev('JSON.stringify(AXU)'))
    press([9]); print('touch visible: opacity btn',ev("getComputedStyle($('bDash')).opacity"),'| errs',errs,pg.eval_on_selector('#err','e=>e.textContent')); b.close()
