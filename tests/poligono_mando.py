import os
from playwright.sync_api import sync_playwright
errs=[]
with sync_playwright() as p:
    b=p.chromium.launch(executable_path='/usr/bin/google-chrome',args=['--no-sandbox','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist','--autoplay-policy=no-user-gesture-required'])
    pg=b.new_page(viewport={'width':1100,'height':700}); pg.on('pageerror',lambda e:errs.append(str(e)))
    pg.goto('file://'+os.path.abspath('index.html')); pg.wait_for_timeout(1500)
    pg.evaluate("""window.__b=new Array(18).fill(0);
      navigator.getGamepads=()=>[{connected:true,id:'DualSense',mapping:'standard',axes:[0,0,0,0],buttons:window.__b.map(v=>({pressed:!!v,value:v}))}];""")
    pg.evaluate('begin()'); ev=pg.evaluate
    def run(n): ev('for(let i=0;i<%d;i++) update(1/60)'%n)
    def tap(k):
        ev('window.__b[%d]=1'%k); run(3); ev('window.__b[%d]=0'%k); run(60)
    def go(x,z): ev('P.pos.x=%f;P.pos.z=%f'%(x,z)); run(70)
    print('arranca en polígono:',ev('RANGE.on')); tap(8); tap(8); print('Share activa:',ev('RANGE.on'),'zona',ev('RANGE_ZONES[RANGE.zi][0]'),'pos',ev('[Math.round(P.pos.x),Math.round(P.pos.z)]'))
    pg.screenshot(path='/home/claude/shot_armeria0.png')
    for i,(x,z) in enumerate([(-35,-7),(-31,0),(-35,7)]):
        go(x,z); print('pedestal',x,z,'->',ev('cur.sid'))
    go(-31,-7); run(60); print('pedestal (-31,-7) ->',ev('cur.sid'),'(5to = S1)')
    pg.screenshot(path='/home/claude/shot_armeria1.png')
    ev('W.ammo=1;P.gCount=0'); go(-35,12); print('pad MUNICIÓN:',ev('W.ammo==W.max'),ev('P.gCount'))
    ev('RANGE.props.forEach(p=>destroyProp(p,0,-1,1))'); go(-33,12); print('pad REPONER:',ev('RANGE.props.filter(p=>!p.dead).length'),'(16)')
    go(-31,12); print('→ MATERIALES:',ev('RANGE_ZONES[RANGE.zi][0]'),ev('[Math.round(P.pos.x),Math.round(P.pos.z)]'))
    go(35.5,-29.7); print('← ARMERÍA:',ev('RANGE_ZONES[RANGE.zi][0]'))
    go(-29,12); print('→ BLANCOS:',ev('RANGE_ZONES[RANGE.zi][0]')); go(-35,21.5); print('← ARMERÍA (blancos):',ev('RANGE_ZONES[RANGE.zi][0]'))
    go(-27,12); print('→ CENTRO:',ev('RANGE_ZONES[RANGE.zi][0]')); go(4,0); print('← ARMERÍA (centro):',ev('RANGE_ZONES[RANGE.zi][0]'))
    tap(15); print('→ cruceta arma:',ev('cur.sid'))
    tap(8); print('Share sale:',ev('!RANGE.on'))
    b.close()
print('ERRORES:',errs or 'ninguno')
