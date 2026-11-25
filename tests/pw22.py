from playwright.sync_api import sync_playwright
with sync_playwright() as p:
    b=p.chromium.launch(executable_path='/usr/bin/google-chrome',args=['--no-sandbox','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist'])
    pg=b.new_context(viewport={'width':900,'height':560}).new_page()
    errs=[];pg.on('pageerror',lambda e:errs.append(str(e)))
    pg.goto('file:///home/claude/prototipo_inline.html'); pg.wait_for_timeout(600); pg.click('#go')
    ev=pg.evaluate
    ev("window.__pad={connected:true,id:'DualSense',mapping:'standard',axes:[0,0,0,0],buttons:Array.from({length:17},()=>({pressed:false,value:0}))};navigator.getGamepads=()=>[window.__pad]")
    ev("window.M={max:0,last:null};(function l(){if(M.last!==null)M.max=Math.max(M.max,Math.abs(P.py-M.last));M.last=P.py;requestAnimationFrame(l)})()")
    def press(i,ms=150):
        ev(f"__pad.buttons[{i}]={{pressed:true,value:1}}"); pg.wait_for_timeout(ms); ev(f"__pad.buttons[{i}]={{pressed:false,value:0}}"); pg.wait_for_timeout(500)
    press(13); print("cruceta agacha",ev("P.crouchT"))
    ev("M.max=0"); pg.wait_for_timeout(600); press(13); pg.wait_for_timeout(600); print("cruceta levanta",ev("P.crouchT"),'salto máx py/frame',round(ev("M.max"),3))
    ev("__pad.axes=[1,0,0,0]"); pg.wait_for_timeout(500); press(1,100); print('○ dash',ev("({d:P.dash>0||P.dashCD>0,v:+P.vel.length().toFixed(1),ct:P.crouchT,sld:P.sld})"))
    ev("__pad.axes=[0,0,0,0]"); pg.wait_for_timeout(1200); press(11,100); print('R3 dash',ev('P.dashCD>0'))
    pg.keyboard.down('KeyD'); pg.keyboard.down('ShiftLeft'); pg.wait_for_timeout(1000); pg.keyboard.press('KeyC'); pg.wait_for_timeout(800); print('C agachado corriendo',ev("({ct:P.crouchT,sld:P.sld})"))
    print(errs); b.close()
