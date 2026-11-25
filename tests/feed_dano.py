"""Kill feed y indicador de daño direccional (mapa 3). Capturas en /tmp/feed_*.png"""
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
        # --- indicador de daño: atacante al este / norte / sur
        def hitFrom(x, z):
            ev('''([x,z])=>{const a=MX.ents[7];a.p.set(x,0,z);a.inv=0;MX.hit(MX.ents[0],30,a,1,0,WP[MX.WI.F1])}''', [x, z])
        res = {}
        for nm, (x, z) in {'este': (10, 0), 'norte': (0, -10), 'sur': (0, 10)}.items():
            ev('()=>{MX.ents[0].inv=0}'); hitFrom(x, z); run(3)
            ang = ev('''()=>{const DE=()=>{const h=[...document.body.children].find(e=>e.style.zIndex==='2'&&e.style.position==='fixed'&&e.children.length);return [...h.children].find(c=>c.style.overflow==='hidden')};const els=[...DE().children];if(!els.length)return null;const m=/rotate\\(([-0-9.e]+)rad\\)/.exec(els[els.length-1].style.transform);return +m[1]*180/Math.PI}''')
            res[nm] = ang if ang is not None else 999; ev('()=>{MX.ents[0].inv=0}'); run(100)
        print(name, 'ángulos', {k: round(v) for k, v in res.items()})
        chk(abs(res['este'] - 90) < 3 and abs(res['norte']) < 3 and abs(abs(res['sur']) - 180) < 3, 'el arco apunta al atacante (este 90°, norte 0°, sur 180°)')
        if name == 'esc':
            ev('()=>{MX.ents[0].inv=0}'); hitFrom(10, 0); run(20); pg.screenshot(path='/tmp/feed_esc_dir.png')
        run(120); print('arcos vivos:', ev('''()=>{const h=[...document.body.children].find(e=>e.style.zIndex==="2"&&e.style.position==="fixed"&&e.children.length);return [...h.children].find(c=>c.style.overflow==="hidden").children.length}'''), 'pl.hp', ev('MX.ents[0].hp'), 'sh', ev('MX.ents[0].sh'))
        chk(ev('''()=>{const DE=()=>{const h=[...document.body.children].find(e=>e.style.zIndex==='2'&&e.style.position==='fixed'&&e.children.length);return [...h.children].find(c=>c.style.overflow==='hidden')};return DE().children.length}''') == 0, 'el indicador se apaga solo (~1,5 s)')
        # --- kill feed: el jugador mata a R1, un bot mata a otro, un bot mata al jugador
        ev('''()=>{const E=MX.ents;E[0].inv=0;E[0].hp=1e9;const r=E[6];r.p.set(5,0,0);r.dead=false;r.hp=1;r.sh=0;r.inv=0;MX.hit(r,50,E[0],1,0,WP[MX.WI.F1])}''')
        ev('''()=>{const E=MX.ents;const a=E[7],v=E[8];a.dead=false;v.dead=false;v.hp=1;v.sh=0;v.inv=0;MX.hit(v,50,a,1,0,WP[MX.WI.S1])}''')
        n1 = ev("document.getElementById('mxFeed').children.length"); txt = ev("document.getElementById('mxFeed').innerText.replace(/\\n/g,' | ')"); print('feed:', txt)
        chk(n1 == 2 and 'TÚ' in txt and 'F1' in txt, 'el feed muestra 2 bajas, con «TÚ» y el arma')
        ev('''()=>{const E=MX.ents;E[0].hp=1;E[0].sh=0;E[0].inv=0;const a=E[7];a.dead=false;a.p.set(8,0,0);MX.hit(E[0],50,a,1,0,WP[MX.WI.F1])}''')
        run(5); pg.screenshot(path='/tmp/feed_%s.png' % name)
        sh = ev("[...document.getElementById('mxFeed').children].map(c=>c.style.boxShadow.includes('255, 210, 74')?'dorado':c.style.boxShadow.includes('255, 90, 74')?'rojo':'neutro').join(',')"); print('bordes', sh)
        chk('dorado' in sh and 'rojo' in sh, 'borde dorado en tus bajas y rojo en la que te mata')
        for i in range(6):
            ev('''()=>{const E=MX.ents;const v=E[1+%d%%5];v.dead=false;v.hp=1;v.sh=0;v.inv=0;MX.hit(v,50,E[7],1,0,WP[MX.WI.F1])}''' % i)
        chk(ev("document.getElementById('mxFeed').children.length") == 5, 'el feed nunca pasa de 5 líneas')
        run(60 * 6); chk(ev("document.getElementById('mxFeed').children.length") == 0, 'las líneas desaparecen solas a los 5 s')
        pg.close()
    print('ERRORES JS:', errs or 'ninguno'); bad += len(errs)
sys.exit(1 if bad else 0)
