from playwright.sync_api import sync_playwright
with sync_playwright() as p:
    b=p.chromium.launch(executable_path='/usr/bin/google-chrome',args=['--no-sandbox','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist'])
    pg=b.new_context(viewport={'width':900,'height':560}).new_page()
    errs=[];pg.on('pageerror',lambda e:errs.append(str(e)))
    pg.goto('file:///home/claude/prototipo_inline.html'); pg.wait_for_timeout(600); pg.click('#go')
    ev=pg.evaluate
    ev("window.__pad={connected:true,id:'DualSense',mapping:'standard',axes:[0,0,0,0],buttons:Array.from({length:17},()=>({pressed:false,value:0}))};navigator.getGamepads=()=>[window.__pad]")
    pg.wait_for_timeout(300)
    for w in range(3):
        if w: ev("window.__pad.buttons[3]={pressed:true,value:1}"); pg.wait_for_timeout(100); ev("window.__pad.buttons[3]={pressed:false,value:0}"); pg.wait_for_timeout(1500)
        r=[]
        for v in (.15,.3,.6,.9):
            ev("W.ammo=W.max;W.cd=0"); a=ev("W.ammo")
            ev(f"window.__pad.buttons[7]={{pressed:{str(v>.5).lower()},value:{v}}};window.__pad.buttons[6]={{pressed:{str(v>.5).lower()},value:{v}}}")
            pg.wait_for_timeout(250); r.append((v,ev("W.ammo")<a,ev("P.ads>.5")))
            ev("window.__pad.buttons[7]={pressed:false,value:0};window.__pad.buttons[6]={pressed:false,value:0}"); pg.wait_for_timeout(700)
        print(ev("cur.name"),r)
    print(errs); b.close()
