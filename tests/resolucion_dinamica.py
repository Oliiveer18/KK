"""R4: política de resolución dinámica. No baja por tirones sueltos ni por dos tipos de fotograma alternados; baja (hasta un suelo de ×0,9) solo con un fotograma típico lento y sostenido; recupera
en pocos segundos; registra el tiempo por debajo de ×1,0."""
import os
from playwright.sync_api import sync_playwright
bad = 0
def chk(c, m):
    global bad
    print(('OK  ' if c else 'FALLO ') + m); bad += 0 if c else 1
with sync_playwright() as p:
    b = p.chromium.launch(executable_path='/usr/bin/google-chrome', args=['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'])
    pg = b.new_page(viewport={'width': 844, 'height': 390}); errs = []; pg.on('pageerror', lambda e: errs.append(str(e))); ev = pg.evaluate
    pg.goto('file://' + os.path.abspath('index.html') + '?mapa=6'); pg.wait_for_timeout(1000); ev('begin()'); pg.wait_for_timeout(500)
    ev('''()=>{ const D=MX.DR; D.on=true; window.__t=performance.now()+1e6; window.feed=(ms,gen)=>{ const n=Math.round(ms/16.7); for(let i=0;i<n;i++){ window.__t+=16.7; MX.dinRes(window.__t, gen(i)) } return renderer.getPixelRatio()/D.base }; D.base=0; MX.dinRes(window.__t,16); }''')
    r = ev('()=>feed(20000,i=>i%2?22:11)')
    chk(r >= .999, 'dos tipos de fotograma alternados (11 y 22 ms: media 16,5 ms = 60 fps) durante 20 s: no baja (×%.2f)' % r)
    ev('()=>feed(20000,i=>i%2?25:11)'); r = ev('()=>renderer.getPixelRatio()/MX.DR.base')
    chk(r < .999, 'en cambio, 11 y 25 ms (media 18 ms = 55 fps, no se llega a 60) sí justifican bajar un poco (×%.2f)' % r)
    ev('()=>feed(30000,i=>12)')
    r = ev('()=>feed(20000,i=>i%60===0?70:14)')
    chk(r >= .999, 'tirones sueltos (70 ms uno de cada 60) con fotograma típico de 14 ms: no baja (×%.2f)' % r)
    r = ev('()=>feed(40000,i=>24)')
    chk(.89 <= r < .999, 'fotograma típico sostenido de 24 ms durante 40 s: baja un poco (×%.2f)' % r)
    r = ev('()=>feed(60000,i=>30)')
    chk(r >= .8999, 'aunque siga lento, nunca baja de ×0,9 (×%.2f)' % r)
    r = ev('()=>feed(25000,i=>12)')
    chk(r >= .999, 'con fotogramas de 12 ms recupera ×1,0 en menos de 25 s (×%.2f)' % r)
    r = ev('()=>({below:MX.DR.below, tot:MX.DR.tot})'); print(r)
    chk(0 < r['below'] < r['tot'] and r['tot'] > 100000, 'registra el tiempo por debajo de ×1,0 (%d de %d ms)' % (r['below'], r['tot']))
    chk(not errs, 'sin errores JS %s' % errs[:3])
    b.close()
print('FALLOS:', bad); raise SystemExit(1 if bad else 0)
