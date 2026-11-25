import sys, os
from playwright.sync_api import sync_playwright
errs=[]
with sync_playwright() as p:
    b=p.chromium.launch(executable_path='/usr/bin/google-chrome',args=['--no-sandbox','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist','--autoplay-policy=no-user-gesture-required'])
    pg=b.new_page(viewport={'width':1100,'height':700}); pg.on('pageerror',lambda e:errs.append(str(e)))
    pg.goto('file://'+os.path.abspath('index.html')); pg.wait_for_timeout(1500); pg.evaluate('begin()'); pg.wait_for_timeout(800)
    ev=pg.evaluate
    print('arranca en polígono:',ev('RANGE.on')); pg.wait_for_timeout(300)
    print('props polígono',ev('RANGE.props.length'),'(16)','blancos',ev('RANGE.tg.length'),'(5)','etiquetas',ev('RANGE.labels.length'))
    for k in ['Digit4','Digit9','Digit0']:
        pg.keyboard.press(k); pg.wait_for_timeout(900)
        print(k,'->',ev('cur.sid'))
    pg.keyboard.press('Digit1'); pg.wait_for_timeout(900)
    ev('W.ammo=1; P.gCount=0'); pg.keyboard.press('KeyU'); print('U:',ev('W.ammo==W.max'),ev('P.gCount'),ev('P.sCount'))
    pg.keyboard.press('KeyT'); pg.wait_for_timeout(1000); pg.screenshot(path='/home/claude/shot_materiales.png')
    ev('RANGE.props.forEach(p=>destroyProp(p,0,-1,1))'); ev('for(let i=0;i<120;i++) update(1/60)')
    print('tras destruir, props vivos',ev('RANGE.props.filter(p=>!p.dead).length'))
    pg.keyboard.press('KeyY'); pg.wait_for_timeout(500); print('reponer',ev('RANGE.props.filter(p=>!p.dead).length'),'cajas en boxes',ev('boxes.length'))
    pg.keyboard.press('KeyT'); pg.keyboard.press('KeyT'); pg.wait_for_timeout(1000); pg.screenshot(path='/home/claude/shot_blancos.png')
    pg.keyboard.press('F2'); print('salir ok',ev('!RANGE.on'))
    b.close()
print('ERRORES:',errs or 'ninguno')
