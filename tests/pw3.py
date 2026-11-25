from playwright.sync_api import sync_playwright
import math
with sync_playwright() as p:
    b=p.chromium.launch(executable_path='/usr/bin/google-chrome',args=['--no-sandbox','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist'])
    pg=b.new_context(viewport={'width':800,'height':600}).new_page()
    errs=[];pg.on('pageerror',lambda e:errs.append(str(e)))
    pg.goto('file:///home/claude/prototipo_inline.html'); pg.wait_for_timeout(600); pg.click('#go'); pg.wait_for_timeout(300)
    # táctil: solo mover a la derecha, sin apuntar
    pg.evaluate("mode='touch'; T.move={id:1,sx:100,sy:300,x:160,y:300}")
    pg.wait_for_timeout(1500)
    print('mover der: aim',round(pg.evaluate('P.aim'),2),'body',round(pg.evaluate('P.body'),2),'(esperado ~1.57)')
    pg.evaluate("T.move={id:1,sx:100,sy:300,x:100,y:360}"); pg.wait_for_timeout(1500)
    print('mover abajo: aim',round(pg.evaluate('P.aim'),2),'body',round(pg.evaluate('P.body'),2),'(esperado ~0)')
    # teclado: ratón arriba (aim fijo), moverse a la derecha => piernas giran, torso mira al ratón
    pg.evaluate("T.move=null; mode='kb'; mouse.x=400; mouse.y=100")
    pg.keyboard.down('KeyD'); pg.wait_for_timeout(1500)
    a,bo=pg.evaluate('P.aim'),pg.evaluate('P.body'); print('strafe: aim',round(a,2),'body',round(bo,2),'twist',round(abs(a-bo),2),'(<=1.15)')
    steps=pg.evaluate('feet.map(f=>f.stepping)'); print('steps',steps, 'speed',round(pg.evaluate('P.vel.length()'),1))
    pg.screenshot(path='/home/claude/t/shot2.png')
    pg.keyboard.up('KeyD'); pg.keyboard.down('KeyS'); pg.wait_for_timeout(1200)
    print('atrás: aim',round(pg.evaluate('P.aim'),2),'body',round(pg.evaluate('P.body'),2))
    print('errs',errs); b.close()
