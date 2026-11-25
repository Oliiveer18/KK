from playwright.sync_api import sync_playwright
with sync_playwright() as p:
    b=p.chromium.launch(executable_path='/usr/bin/google-chrome',args=['--no-sandbox','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist'])
    pg=b.new_context(viewport={'width':390,'height':780},has_touch=True,is_mobile=True).new_page()
    errs=[];pg.on('pageerror',lambda e:errs.append(str(e)))
    pg.goto('file:///home/claude/prototipo_inline.html'); pg.wait_for_timeout(800)
    pg.tap('#go'); pg.wait_for_timeout(500)
    # dedo izquierdo: arrastrar; derecho: apuntar/disparar vía CDP
    cdp=pg.context.new_cdp_session(pg)
    def t(type,pts): cdp.send('Input.dispatchTouchEvent',{'type':type,'touchPoints':pts})
    t('touchStart',[{'x':80,'y':500,'id':1},{'x':300,'y':400,'id':2}])
    for i in range(1,20):
        t('touchMove',[{'x':80+i*2,'y':500-i*3,'id':1},{'x':300+i*3,'y':400,'id':2}]); pg.wait_for_timeout(60)
    pg.wait_for_timeout(500)
    print('ammo',pg.inner_text('#am'),'fps',pg.inner_text('#fps'),'mode',pg.inner_text('#mode'))
    pg.screenshot(path='/home/claude/t/shot.png')
    print('errs',errs)
    b.close()
