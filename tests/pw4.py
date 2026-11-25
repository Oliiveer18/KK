from playwright.sync_api import sync_playwright
INIT="""window.__pad=null;navigator.getGamepads=()=>[window.__pad];
window.mkpad=(down)=>({connected:true,id:'DualSense',mapping:'standard',axes:[0,0,0,0],buttons:Array.from({length:17},(_,i)=>({pressed:down.includes(i),value:down.includes(i)?1:0}))});"""
with sync_playwright() as p:
    b=p.chromium.launch(executable_path='/usr/bin/google-chrome',args=['--no-sandbox','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist'])
    pg=b.new_context(viewport={'width':800,'height':600}).new_page(); pg.add_init_script(INIT)
    errs=[];pg.on('pageerror',lambda e:errs.append(str(e)))
    pg.goto('file:///home/claude/prototipo_inline.html'); pg.wait_for_timeout(600); pg.click('#go'); pg.wait_for_timeout(300)
    ev=pg.evaluate
    def press(btns,ms=120):
        ev("window.__pad=mkpad(%s)"%btns); pg.wait_for_timeout(ms); ev("window.__pad=mkpad([])"); pg.wait_for_timeout(150)
    press([1]); print('círculo agacha: crouchT',ev('P.crouchT'),'dash',ev('P.dash'))
    pg.wait_for_timeout(600); print(' pelvis y',round(ev('P.py'),2)); pg.screenshot(path='t/crouch.png')
    press([1]); pg.wait_for_timeout(600); print(' levanta: crouchT',ev('P.crouchT'),'py',round(ev('P.py'),2))
    press([4]); print('L1 dash cd',round(ev('P.dashCD'),2)); pg.wait_for_timeout(1200)
    ammo=ev('W.ammo'); ev("window.__pad=mkpad([5])"); pg.wait_for_timeout(500)
    print('R1 mantener: gState',ev('P.gState'),'dots',ev('dots.filter(d=>d.visible).length'),'ammo igual',ammo==ev('W.ammo')); pg.screenshot(path='t/gren.png')
    ev("window.__pad=mkpad([])"); pg.wait_for_timeout(300); print(' suelta: gCount',ev('P.gCount'),'activas',ev('grens.filter(g=>g.on).length'))
    pg.wait_for_timeout(2300); print(' explotó: booms',ev('booms.filter(b=>b.t>=0).length'),'activas',ev('grens.filter(g=>g.on).length'))
    ev("window.__pad=mkpad([7])"); pg.wait_for_timeout(300); print('R2 dispara: ammo',ev('W.ammo'));ev("window.__pad=mkpad([])")
    ev("window.__pad=mkpad([6])"); pg.wait_for_timeout(500); print('L2 apuntar: ads',round(ev('P.ads'),2)); ev("window.__pad=mkpad([])")
    press([3]); pg.wait_for_timeout(600); print('△ arma:',ev('cur.name'),ev('W.max')); press([3]); pg.wait_for_timeout(600); print('△ arma:',ev('cur.name'))
    press([3]); pg.wait_for_timeout(600); print('△ arma:',ev('cur.name'))
    ev("window.__pad=mkpad([5])"); pg.wait_for_timeout(300); ev("window.__pad=mkpad([])"); pg.wait_for_timeout(300); pg.screenshot(path='t/throw.png')
    print('errs',errs,pg.eval_on_selector('#err','e=>e.textContent')); b.close()
