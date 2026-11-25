import sys, os
from playwright.sync_api import sync_playwright
errs=[];fail=0
def chk(ok,msg):
    global fail
    print('  '+('OK  ' if ok else 'FALLA ')+msg); fail+= (not ok)
with sync_playwright() as p:
    b=p.chromium.launch(executable_path='/usr/bin/google-chrome',args=['--no-sandbox','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist','--autoplay-policy=no-user-gesture-required'])
    pg=b.new_context().new_page(); pg.on('pageerror',lambda e:errs.append(str(e)))
    pg.goto('file://'+os.path.abspath(sys.argv[1] if len(sys.argv)>1 else 'index.html')); pg.wait_for_timeout(1500); pg.evaluate('begin()'); pg.wait_for_timeout(2500)
    ev=pg.evaluate
    ev('window.__n=0; performance.now=()=>window.__n*1000/60')   # reloj del juego = fotogramas simulados
    print('variantes cargadas:',ev("(SND.buf.STEP_walk||[]).length"))
    chk(ev("(SND.buf.STEP_walk||[]).length")>=2,'variantes de paso cargadas')
    def walk(keys,n):
        ev('SND.count={}; footT=0')
        return ev("""(k)=>{ keys.clear&&0; return 0 }""".replace('keys.clear&&0','0'),keys) if False else None
    # mover con teclado
    def test(codes,sec,label):
        ev('SND.count={}')
        ev("(c)=>{ window.__k=c; c.forEach(x=>window.dispatchEvent(new KeyboardEvent('keydown',{code:x}))); }",codes)
        for _ in range(sec*60//30): ev('for(let i=0;i<30;i++) {update(1/60); window.__n++}')
        ev("(c)=>c.forEach(x=>window.dispatchEvent(new KeyboardEvent('keyup',{code:x})))",codes)
        n=ev("SND.count.STEP_walk||0"); print(' ',label,sec,'s ->',n,'pasos'); return n
    ev('boxes.length=0; P.pos.set(0,0,0)')
    n0=ev("SND.count.STEP_walk||0")
    ev('for(let i=0;i<60;i++) {update(1/60); window.__n++}'); chk(ev("SND.count.STEP_walk||0")==n0,'parado: sin pasos')
    nw=test(['KeyW'],4,'caminar'); chk(12<=nw<=28,'caminar: ritmo razonable (%d en 4 s)'%nw)
    ev('P.pos.set(0,0,0)')
    nr=test(['KeyW','ShiftLeft'],4,'correr'); chk(nr>=nw,'correr: al menos tantos pasos como caminar (%d)'%nr)
    ev('P.pos.set(0,0,0)')
    ev('SND.count={}'); ev("window.dispatchEvent(new KeyboardEvent('keydown',{code:'KeyW'}))")
    ev('for(let i=0;i<20;i++) {update(1/60); window.__n++}'); ev("flags.dash=true; for(let i=0;i<10;i++){update(1/60); window.__n++}")
    print('  durante dash pasos:',ev("SND.count.STEP_walk||0"))
    chk(not errs,'sin errores JS '+str(errs))
print('FALLOS:',fail)
