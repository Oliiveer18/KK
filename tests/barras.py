"""Barras de vida/escudo (mapa 3): segmentos de escudo, números, estado crítico, barra de bots con fundido. Capturas en /tmp/barras_*.png"""
import os, sys
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
        ev('MX.want=true;begin()'); pg.wait_for_timeout(300); ev("for(let i=0;i<200;i++) update(1/60)")
        run = lambda n: ev('for(let i=0;i<%d;i++) update(1/60)' % n)
        txt = lambda: ev('[MX.PB.shN.textContent,MX.PB.hpN.textContent,MX.PB.hb.classList.contains("mxlow")]')
        print(name, 'inicio', txt(), 'segmentos escudo', ev('MX.PB.segs.map(g=>g.f.style.transform).join(" ")'))
        ev('MX.hit(MX.pl,85,MX.ents[7],1,0)'); run(40); t = txt(); print('tras 85 de daño', t)
        chk(t[0] == '0' and t[1] == '65', 'números: escudo 0 / vida 65')
        ev('MX.hit(MX.pl,45,MX.ents[7],1,0)'); run(60); t = txt(); print('tras 45 más', t)
        chk(t[1] == '20' and t[2], 'vida crítica: 20 HP con pulso rojo')
        pg.screenshot(path='/tmp/barras_%s_critica.png' % name)
        # bot cercano con daño: barra sobre la cabeza
        ev('()=>{const e=MX.ents[7];e.p.set(P.pos.x+3,0,P.pos.z+2);e.hp=100;e.sh=50;e.bH.fill=e.bH.chunk=100;e.bS.fill=e.bS.chunk=50;e.dead=false}')
        ev('MX.pl.hp=100;MX.pl.sh=50;MX.pl.bH.fill=MX.pl.bH.chunk=100;MX.pl.bS.fill=MX.pl.bS.chunk=50'); run(5)
        ev('MX.hit(MX.ents[7],70,MX.pl,1,0)'); run(10)
        chk(ev('MX.ents[7].bar.el.style.display') == 'block', 'barra del bot visible tras daño (display=' + ev('MX.ents[7].bar.el.style.display') + ')')
        print('bot', ev('[MX.ents[7].hp,MX.ents[7].sh]'), 'opacidad', ev('MX.ents[7].bar.el.style.opacity'), 'rombo', ev('MX.ents[7].bar.pip.style.background'))
        pg.screenshot(path='/tmp/barras_%s_bot.png' % name)
        run(60 * 5); chk(ev('()=>{const e=MX.ents[7];return (e.bar.el.style.display==="none")===!(!e.dead&&e.root.visible&&MX.M.t-(e.bShow||-99)<4)}'), 'barra del bot visible solo durante 4 s tras el último daño (otros bots también le disparan)')
        ev('()=>{const r=MX.PB.el.getBoundingClientRect();window.__r=[r.left,r.top,r.right,r.bottom]}'); r = ev('window.__r')
        chk(r[0] >= 0 and r[1] >= 0 and r[2] <= w and r[3] <= h, 'barra del jugador dentro de pantalla %s' % [round(x) for x in r])
        pg.close()
    print('ERRORES JS:', errs or 'ninguno'); bad += len(errs)
sys.exit(1 if bad else 0)
