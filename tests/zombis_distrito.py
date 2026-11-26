"""Población de zombis del distrito (?mapa=6): cientos repartidos por zonas como vivía la gente, igual para las 4 facciones (por cuartos), algunos dormidos
dentro de los edificios, 4 hordas que migran entre barrios, refugios limpios al empezar, simulación barata lejos de los combatientes y dibujo sólo de
los cercanos a la cámara."""
import os, sys, time
from playwright.sync_api import sync_playwright
bad = 0
def chk(c, m):
    global bad
    print(('OK  ' if c else 'FALLO ') + m); bad += 0 if c else 1
with sync_playwright() as p:
    b = p.chromium.launch(executable_path='/usr/bin/google-chrome', args=['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'])
    pg = b.new_page(viewport={'width': 900, 'height': 500}); errs = []; pg.on('pageerror', lambda e: errs.append(str(e))); ev = pg.evaluate
    pg.goto('file://' + os.path.abspath('index.html') + '?mapa=6'); pg.wait_for_timeout(1000); ev('begin()'); pg.wait_for_timeout(300); ev('()=>{menuOpen=true}')
    r = ev('''()=>{const Z=MX.zom.list,q=[0,0,0,0];for(const z of Z){if(z.horde)continue;q[(z.p.x<0?0:1)+(z.p.z<0?0:2)]++}
      const inB=Z.filter(z=>OBJ.insideBuilding(z.p.x,z.p.z)).length, hordes=new Set(Z.filter(z=>z.horde).map(z=>z.horde)).size;
      const nearRef=Z.filter(z=>MX.M.spawn.some(a=>a.some(s=>Math.hypot(s.x-z.p.x,s.z-z.p.z)<40))).length;
      const c={};for(const z of Z)c[z.type]=(c[z.type]||0)+1;return {n:Z.length,q,inB,hordes,nearRef,c,h0:Z.filter(z=>z.horde).map(z=>[z.p.x,z.p.z]).slice(0,1)[0]}}''')
    print(r)
    chk(450 <= r['n'] <= 720, 'cientos de zombis en el distrito (%d; antes ~80)' % r['n'])
    chk(max(r['q']) - min(r['q']) <= max(r['q']) * .08, 'igual para las 4 facciones: por cuartos %s' % r['q'])
    chk(r['inB'] >= 40, 'dormidos dentro de casas y tiendas (%d)' % r['inB'])
    chk(r['hordes'] == 4, '4 hordas que migran entre barrios')
    chk(r['nearRef'] == 0, 'ninguno a menos de 40 m de un refugio al empezar')
    chk(r['c'].get('runner', 0) > 20 and r['c'].get('brute', 0) > 15 and r['c'].get('screamer', 0) > 15, 'mezcla de tipos %s' % r['c'])
    t0 = time.time(); ev('()=>{MX.pl.inv=1e9;MX.pl.hp=1e9;for(let i=0;i<60*30;i++)update(1/60)}'); ms = (time.time() - t0) / 1800 * 1000
    r2 = ev('''()=>{const Z=MX.zom.list;return {n:Z.length,near:Z.filter(z=>z.near).length,drawn:Z.filter(z=>z.ri>=0).length,h:Z.filter(z=>z.horde).map(z=>[z.p.x,z.p.z])[0]}}''')
    mv = ((r2['h'][0] - r['h0'][0]) ** 2 + (r2['h'][1] - r['h0'][1]) ** 2) ** .5 if r2['h'] and r['h0'] else 0
    print('tras 30 s: %.1f ms por actualización (headless, con 100 combatientes)' % ms, r2, 'horda movida %.0f m' % mv)
    chk(r2['near'] < r2['n'] * .5, 'simulación completa sólo cerca de los combatientes (%d de %d)' % (r2['near'], r2['n']))
    chk(r2['drawn'] <= 180, 'dibujados sólo los cercanos a la cámara (%d)' % r2['drawn'])
    chk(mv > 10, 'las hordas migran (%.0f m en 30 s)' % mv)
    chk(ms < 25, 'actualización completa por debajo de 25 ms en headless (%.1f ms)' % ms)
    chk(not errs, 'sin errores JS ' + str(errs[:2]))
sys.exit(1 if bad else 0)
