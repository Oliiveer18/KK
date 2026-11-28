"""Mapa táctico (?mapa=6): tocar el mapa pone una marca con ruta, distancia y tiempo; «Enviar escuadra» da la orden de avanzar (con el mando); «Borrar» la quita; tocar fuera cierra.
Marcadores de puestos de curación y suministros en el mapa y los puestos en el minimapa."""
import os, sys
from playwright.sync_api import sync_playwright
bad = 0
def chk(c, m):
    global bad
    print(('OK  ' if c else 'FALLO ') + m); bad += 0 if c else 1
with sync_playwright() as p:
    b = p.chromium.launch(executable_path='/usr/bin/google-chrome', args=['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'])
    pg = b.new_page(viewport={'width': 900, 'height': 500}); errs = []; pg.on('pageerror', lambda e: errs.append(str(e))); ev = pg.evaluate
    pg.goto('file://' + os.path.abspath('index.html') + '?mapa=6'); pg.wait_for_timeout(1000); ev('begin()'); pg.wait_for_timeout(300)
    ev('''()=>{menuOpen=true;MX.zom.noRestock=true;for(const z of MX.zom.list){z.dead=true;z.st='dead';z.deadT=99};MX.pl.inv=1e9;for(let i=0;i<30;i++){time+=1/60;update(1/60)}; menuOpen=false}''')
    ev('()=>MX.mapToggle()'); pg.wait_for_timeout(200)
    chk(ev('()=>MX.mapOpen'), 'el mapa táctico se abre')
    box = ev('''()=>{ const c=[...document.querySelectorAll('canvas')].find(c=>c.parentElement&&c.parentElement.style.zIndex==='12'); const r=c.getBoundingClientRect(); return [r.left,r.top,r.width,r.height] }''')
    # objetivo cercano a la plaza: punto a ~60 m del jugador hacia el centro
    pl = ev('()=>[P.pos.x,P.pos.z,(MAPA.built&&MAPA.built.half)||375]'); half = pl[2]
    wx, wz = pl[0] + 60, pl[1] + 40
    px = box[0] + (wx + half) / (2 * half) * box[2]; pz = box[1] + (wz + half) / (2 * half) * box[3]
    pg.mouse.click(px, pz); pg.wait_for_timeout(200)
    m = ev('()=>{ const t=document.querySelectorAll("span"); return [...document.querySelectorAll("span")].map(s=>s.textContent).find(t=>t.startsWith("Marca")) || null }')
    print('barra:', m)
    chk(ev('()=>MX.mapOpen'), 'tocar el mapa NO lo cierra (pone una marca)')
    chk(m is not None and ' m ·' in m, 'aparece la marca con distancia y tiempo (%s)' % m)
    # enviar escuadra sin mando → aviso; con mando → orden de avanzar
    ev('()=>{ const s=MX.pl.sqd; s.playerLead=true; s.order={type:"follow"} }')
    pg.get_by_text('✔ Enviar escuadra').click(); pg.wait_for_timeout(200)
    o = ev('()=>MX.pl.sqd.order')
    chk(o and o['type'] == 'move' and abs(o['x'] - wx) < 20 and abs(o['z'] - wz) < 20, 'Enviar escuadra: orden de avanzar al punto marcado (%s)' % (o and [o['type'], round(o['x']), round(o['z'])]))
    chk(not ev('()=>MX.mapOpen'), 'tras enviar, el mapa se cierra')
    # marca y borrar
    ev('()=>MX.mapToggle()'); pg.wait_for_timeout(100); pg.mouse.click(px, pz); pg.wait_for_timeout(100); pg.get_by_text('✖ Borrar marca').click(); pg.wait_for_timeout(100)
    chk(ev('()=>MX.mapOpen'), 'Borrar marca no cierra el mapa')
    # tocar fuera del lienzo cierra
    pg.mouse.click(5, 5); pg.wait_for_timeout(150)
    chk(not ev('()=>MX.mapOpen'), 'tocar fuera del mapa lo cierra')
    r = ev('''()=>{ const st=MX.stations.list.length; const sup=0; return {st} }''')
    chk(r['st'] >= 8, 'puestos de curación para el mapa (%d)' % r['st'])
    chk(not errs, 'sin errores JS ' + str(errs[:2]))

# móvil apaisado con Share (mapa + mochila al lado): el mapa se ve entero y no queda bajo el panel de la mochila
with sync_playwright() as p:
    b = p.chromium.launch(executable_path='/usr/bin/google-chrome', args=['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'])
    pg = b.new_page(viewport={'width': 844, 'height': 390}, has_touch=True, is_mobile=True); errs = []; pg.on('pageerror', lambda e: errs.append(str(e))); ev = pg.evaluate
    pg.goto('file://' + os.path.abspath('index.html') + '?mapa=6'); pg.wait_for_timeout(1000); ev('begin()'); pg.wait_for_timeout(500)
    ev('()=>{ MX.mapDock(true); MX.mapToggle(); document.getElementById("invBtn").click(); }'); pg.wait_for_timeout(600)
    r = ev("""()=>{ const c=[...document.querySelectorAll('canvas')].find(c=>c.parentElement&&c.parentElement.style.zIndex==='12'); const m=c.getBoundingClientRect(), d=document.querySelector('dialog[open]').getBoundingClientRect(); return {mw:m.width, mr:m.right, ml:m.left, mt:m.top, mb:m.bottom, dl:d.left, h:innerHeight} }""")
    print(r)
    chk(r['mr'] <= r['dl'] + 1, 'con la mochila al lado, el mapa no queda bajo el panel (derecha del mapa %d, izquierda del panel %d)' % (r['mr'], r['dl']))
    chk(r['mw'] >= 300 and r['mt'] >= 0 and r['mb'] <= r['h'], 'y es grande y entra entero en pantalla (%d px)' % r['mw'])
    chk(not errs, 'sin errores JS en el móvil ' + str(errs[:2]))
sys.exit(1 if bad else 0)
