"""Kill feed (mapa 3). Capturas en /tmp/feed_*.png"""
import os, sys, math
from playwright.sync_api import sync_playwright
errs = []; bad = 0
def chk(c, m):
    global bad
    print(('OK  ' if c else 'FALLO ') + m); bad += 0 if c else 1
with sync_playwright() as p:
    b = p.chromium.launch(executable_path='/usr/bin/google-chrome', args=['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'])
    for name, w, h in [('esc', 1100, 700), ('movil', 844, 390)]:
        pg = b.new_page(viewport={'width': w, 'height': h}, device_scale_factor=2); pg.on('pageerror', lambda e: errs.append(str(e)))
        pg.goto('file://' + os.path.abspath('index.html') + '?mapa=3'); pg.wait_for_timeout(1000); ev = pg.evaluate
        ev('MX.want=true;begin()'); pg.wait_for_timeout(300); ev('for(let i=0;i<200;i++) update(1/60)')
        run = lambda n: ev('()=>{for(let i=0;i<%d;i++){for(const e of MX.ents) if(e.bot&&e.dead) e.respT=1e9; update(1/60)}}' % n)
        ev('''()=>{boxes.length=0;const E=MX.ents;for(const e of E){e.inv=0;e.dead=false;e.hp=100;e.sh=50};E[0].p.set(0,0,0);E[0].hp=1e9;
          for(const e of E){ if(e.bot){ e.dead=true; e.respT=1e9; e.root.visible=false } } }''')   # bots inertes: así solo cuentan los impactos que provoca el test
        # --- kill feed: el jugador mata a R1, un bot mata a otro, un bot mata al jugador
        ev('''()=>{const E=MX.ents;E[0].inv=0;E[0].hp=1e9;const r=E[6];r.p.set(5,0,0);r.dead=false;r.hp=1;r.sh=0;r.inv=0;MX.hit(r,50,E[0],1,0,WP[MX.WI.F1])}''')
        ev('''()=>{const E=MX.ents;const a=E[7],v=E[8];a.dead=false;v.dead=false;v.hp=1;v.sh=0;v.inv=0;MX.hit(v,50,a,1,0,WP[MX.WI.S1])}''')
        n1 = ev("[...document.getElementById('mxFeed').children].filter(c=>c.style.display!=='none').length"); txt = ev("[...document.getElementById('mxFeed').children].filter(c=>c.style.display!=='none').map(c=>c.innerText).join(' | ')"); print('feed:', txt)
        chk(n1 == 2 and 'TÚ' in txt and 'F1' in txt, 'el feed muestra 2 bajas, con «TÚ» y el arma')
        ev('''()=>{const E=MX.ents;E[0].hp=1;E[0].sh=0;E[0].inv=0;const a=E[7];a.dead=false;a.p.set(8,0,0);MX.hit(E[0],50,a,1,0,WP[MX.WI.F1])}''')
        run(5); pg.screenshot(path='/tmp/feed_%s.png' % name)
        sh = ev("[...document.getElementById('mxFeed').children].filter(c=>c.style.display!=='none').map(c=>c.style.boxShadow.includes('255, 210, 74')?'dorado':c.style.boxShadow.includes('255, 90, 74')?'rojo':'neutro').join(',')"); print('bordes', sh)
        chk('dorado' in sh and 'rojo' in sh, 'borde dorado en tus bajas y rojo en la que te mata')
        for i in range(6):
            ev('''()=>{const E=MX.ents;const v=E[1+%d%%5];v.dead=false;v.hp=1;v.sh=0;v.inv=0;MX.hit(v,50,E[7],1,0,WP[MX.WI.F1])}''' % i)
        chk(ev("[...document.getElementById('mxFeed').children].filter(c=>c.style.display!=='none').length") == 5, 'el feed nunca pasa de 5 líneas')
        pg.wait_for_timeout(5400); chk(ev("[...document.getElementById('mxFeed').children].filter(c=>c.style.display!=='none').length") == 0, 'las líneas desaparecen solas a los 5 s')
        pg.close()
    print('ERRORES JS:', errs or 'ninguno'); bad += len(errs)
sys.exit(1 if bad else 0)
