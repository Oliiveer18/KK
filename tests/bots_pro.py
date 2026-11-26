"""Comportamiento profesional de los bots (campaña): no van en piña (espacio personal de 1,7 m con sus compañeros), usan el dash como el jugador
(para apartarse de una granada y para cruzar hasta la cobertura bajo fuego) y siguen siendo estables con 100 combatientes."""
import os, sys, time
from playwright.sync_api import sync_playwright
bad = 0
def chk(c, m):
    global bad
    print(('OK  ' if c else 'FALLO ') + m); bad += 0 if c else 1
with sync_playwright() as p:
    b = p.chromium.launch(executable_path='/usr/bin/google-chrome', args=['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'])
    pg = b.new_page(viewport={'width': 900, 'height': 500}); errs = []; pg.on('pageerror', lambda e: errs.append(str(e))); ev = pg.evaluate
    pg.goto('file://' + os.path.abspath('index.html') + '?mapa=6'); pg.wait_for_timeout(1000); ev('begin()'); pg.wait_for_timeout(300)
    ev('()=>{menuOpen=true;MX.pl.inv=1e9;MX.pl.hp=1e9}')
    t0 = time.time(); ev('()=>{for(let i=0;i<60*60;i++)update(1/60)}'); ms = (time.time() - t0) / 3600 * 1000
    r = ev('''()=>{const B=MX.ents.filter(e=>e.bot&&!e.dead&&!e.dwn);const nn=B.map(e=>{let m=99;for(const o of MX.ents)if(o!==e&&!o.dead&&o.team===e.team)m=Math.min(m,Math.hypot(o.p.x-e.p.x,o.p.z-e.p.z));return m}).sort((a,b)=>a-b);
      return {n:B.length,med:nn[nn.length>>1],tight:nn.filter(d=>d<1.0).length,dash:MX.ents.reduce((a,e)=>a+(e.dashN||0),0)}}''')
    print('60 s en el distrito: %.1f ms por actualización (headless)' % ms, r)
    chk(r['med'] >= 1.6, 'no van en piña: distancia mediana al compañero más cercano %.1f m' % r['med'])
    chk(r['tight'] <= r['n'] * .1, 'pocos pegados a menos de 1 m de un compañero (%d de %d)' % (r['tight'], r['n']))
    # granada a los pies de un bot: se aparta con un dash
    r = ev('''()=>{const e=MX.ents.find(q=>q.bot&&!q.dead&&!q.dwn&&q.team===2);e.dashCD=0;e.dashN=0;e.reloadT=-1;const g=grens.find(q=>!q.on);g.on=true;g.own=null;g.type='frag';g.fuse=1.8;g.launched=false;g.bt=0;
      g.p.set(e.p.x+1.2,.09,e.p.z);g.v.set(0,0,0);g.m.visible=true;const x0=e.p.x,z0=e.p.z;for(let i=0;i<40;i++)update(1/60);return {dash:e.dashN,moved:Math.hypot(e.p.x-x0,e.p.z-z0)}}''')
    print(r)
    chk(r['dash'] >= 1 and r['moved'] > 2.5, 'ante una granada a sus pies, el bot se aparta con un dash (%.1f m)' % r['moved'])
    # herido y con un enemigo a la vista: va a cubierto con un dash
    r = ev('''()=>{const e=MX.ents.find(q=>q.bot&&!q.dead&&!q.dwn&&q.team===3);e.dashCD=0;e.dashN=0;e.reloadT=-1;e.hp=25;e.lastHurt=MX.M.t;
      for(let i=0;i<60*3;i++){e.lastHurt=MX.M.t;update(1/60)}return {dash:e.dashN,st:e.st}}''')
    print(r)
    chk(r['dash'] >= 1 or r['st'] != 'cover', 'herido y bajo fuego, cruza a la carrera hasta la cobertura (dash %d, estado %s)' % (r['dash'], r['st']))
    chk(ms < 40, 'estable con 100 combatientes y ~600 zombis (%.1f ms por actualización en headless)' % ms)
    chk(not errs, 'sin errores JS ' + str(errs[:2]))
sys.exit(1 if bad else 0)
