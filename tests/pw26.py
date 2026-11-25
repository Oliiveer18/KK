from playwright.sync_api import sync_playwright
with sync_playwright() as p:
    b=p.chromium.launch(executable_path='/usr/bin/google-chrome',args=['--no-sandbox','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist'])
    pg=b.new_context(viewport={'width':700,'height':440}).new_page()
    errs=[];pg.on('pageerror',lambda e:errs.append(str(e)))
    pg.goto('file:///home/claude/prototipo_inline.html'); pg.wait_for_timeout(600); pg.click('#go'); ev=pg.evaluate
    ev("window.__pad={connected:true,id:'DualSense',mapping:'standard',axes:[0,0,0,0],buttons:Array.from({length:17},()=>({pressed:false,value:0}))};navigator.getGamepads=()=>[window.__pad]")
    def press(i):
        ev(f"__pad.buttons[{i}]={{pressed:true,value:1}}"); pg.wait_for_timeout(120); ev(f"__pad.buttons[{i}]={{pressed:false,value:0}}"); pg.wait_for_timeout(500)
    press(1); print('○ agacha',ev("P.crouchT"),'dash',ev("P.dashCD>0"))
    press(1); print('○ levanta',ev("P.crouchT"))
    press(11); print('R3 dash',ev("P.dashCD>0")); print(errs); b.close()
