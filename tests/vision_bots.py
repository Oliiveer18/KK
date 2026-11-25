"""Visión de los bots = la del jugador: ven a un enemigo sólo si cabe en el rectángulo de pantalla (ancho y fondo de la cámara real), sin cono."""
import os, sys
from playwright.sync_api import sync_playwright
bad = 0
with sync_playwright() as p:
    b = p.chromium.launch(executable_path='/usr/bin/google-chrome', args=['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'])
    pg = b.new_page(viewport={'width': 1100, 'height': 700}); errs = []; pg.on('pageerror', lambda e: errs.append(str(e)))
    pg.goto('file://' + os.path.abspath('index.html') + '?mapa=3&bots=4'); pg.wait_for_timeout(1000); ev = pg.evaluate
    ev('begin()'); pg.wait_for_timeout(300)
    hw, hd = ev('()=>[MX.SIGHT.hw,MX.SIGHT.hd]'); print('pantalla del jugador: ±%.1f m ancho, ±%.1f m fondo' % (hw, hd))
    for dist, ax, esperado in ((hw * .85, 'x', True), (hw * 1.2, 'x', False), (hd * .85, 'z', True), (hd * 1.25, 'z', False), (hw * .6, 'back', True)):
        ev('''([d,ax])=>{boxes.length=0;const E=MX.ents;MX.M.over=false;for(const e of E){e.dead=true;e.respT=1e9}
          const a=E.find(e=>e.bot&&e.team===1),t=E.find(e=>e.bot&&e.team===0);window.A=a;a.dead=false;a.dwn=false;a.hp=100;a.inv=0;a.fireCd=1e9;t.dead=false;t.dwn=false;t.hp=1e9;t.inv=0;t.sh=0;window.Tt=t;
          window.D=d;window.AX=ax;}''', [dist, ax])
        ev('()=>{for(let i=0;i<40;i++){A.p.set(0,0,0);A.yaw=AX==="back"?-Math.PI/2:Math.PI/2;Tt.p.set(AX==="z"?0:D,0,AX==="z"?D:0);A.fireCd=1e9;Tt.fireCd=1e9;update(1/60)}}')
        v = ev('()=>A.vis')
        ok = (v == esperado); print(('OK  ' if ok else 'FALLO ') + 'a %.1f m en %s con vista libre: ve=%s (esperado %s)' % (dist, ax, v, esperado)); bad += 0 if ok else 1
    print('ERRORES JS:', errs or 'ninguno')
sys.exit(1 if bad or errs else 0)
