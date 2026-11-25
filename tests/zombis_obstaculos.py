"""Zombis y obstáculos: rodean muros, no caminan quietos, la cola de rutas es justa."""
import os, sys
from playwright.sync_api import sync_playwright
errs = []; bad = 0
def chk(c, m):
    global bad
    print(('OK  ' if c else 'FALLO ') + m); bad += 0 if c else 1
with sync_playwright() as p:
    b = p.chromium.launch(executable_path='/usr/bin/google-chrome', args=['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'])
    pg = b.new_page(viewport={'width': 1100, 'height': 700}); pg.on('pageerror', lambda e: errs.append(str(e)))
    pg.goto('file://' + os.path.abspath('index.html') + '?mapa=4&bots=4'); pg.wait_for_timeout(1000); ev = pg.evaluate
    ev('begin()'); pg.wait_for_timeout(300)
    ev('''()=>{MX.zom.noRestock=true;const E=MX.ents;window.E=E;MX.M.over=false;for(const z of MX.zom.list.slice()){z.dead=true;z.st="dead";z.deadT=99}
      for(const e of E){e.dwn=false;e.dead=true;e.respT=1e9}
      boxes.length=0;MX.M.navT=0;window.ZT=E.find(e=>e.bot);ZT.dead=false;ZT.dwn=false;ZT.hp=1e9;ZT.inv=1e9;ZT.sh=0;ZT.p.set(0,0,12)}''')
    def run(n): ev('()=>{for(let i=0;i<%d;i++){ZT.p.set(window.PX,0,window.PZ);ZT.fireCd=1e9;update(1/60)}}' % n)
    ev('()=>{window.PX=0;window.PZ=12}')
    # muro largo entre el zombi y el jugador
    ev('()=>{boxes.push({x:0,z:0,hx:9,hz:.5,h:3});MX.M.navT=0;update(1/60);window.Q=[];for(let i=0;i<3;i++){const q=MX.zom.spawn("walker",-2+i*2,-9,{st:"chase"});q.tgt=ZT;q.tgtT=1e9;Q.push(q)}}')
    ev('()=>{for(const q of Q){q.tgt=ZT;q.tgtT=1e9}}')
    quiet = 0; tot = 0
    for i in range(30):
        run(30)
        r = ev('()=>Q.map(q=>({mv:q.mv,v:Math.hypot(q.v.x,q.v.z),z:q.p.z}))')
        for s in r:
            tot += 1
            if s['v'] > .8 and s['mv'] < .2: quiet += 1
    r = ev('()=>Q.map(q=>({z:q.p.z,x:q.p.x,st:q.st}))'); print('final:', r)
    chk(all(s['z'] > 1 for s in r), 'los 3 zombis rodean un muro de 18 m y llegan al otro lado')
    chk(quiet / max(tot, 1) < .08, 'caminan quietos sólo %d de %d muestras' % (quiet, tot))
    # cola de rutas justa: 40 zombis tras el muro, todos acaban llegando
    ev('()=>{window.PZ=16;boxes.length=0;boxes.push({x:0,z:0,hx:9,hz:.5,h:3});MX.M.navT=0;update(1/60);window.Q=[];for(let i=0;i<40;i++){const q=MX.zom.spawn("walker",-9+(i%10)*2,-8-((i/10)|0)*1.5,{st:"chase"});q.tgt=ZT;q.tgtT=1e9;Q.push(q)}}')
    run(60*28)
    n = ev('()=>Q.filter(q=>q.p.z>1).length'); print('pasan:', n)
    chk(n >= 36, 'una masa de 40 zombis pasa el muro (%d/40)' % n)
    # una puerta que se abre o rompe cambia la ruta
    ev('()=>{PZ=12;boxes.length=0;const a={x:-5,z:0,hx:4,hz:.5,h:3},c={x:5,z:0,hx:4,hz:.5,h:3};boxes.push(a,c);MX.M.navT=0;update(1/60);window.Q=[];const q=MX.zom.spawn("walker",0,-8,{st:"chase"});q.tgt=ZT;q.tgtT=1e9;Q.push(q)}')
    run(60*3)
    ev('()=>{boxes.length=0;boxes.push({x:-5,z:0,hx:4,hz:.5,h:3});for(const f of OBJ.on)f("break",{})}')   # el hueco en el medio... luego el lado derecho se abre
    run(60*10)
    chk(ev('()=>Q[0].p.z')>1, 'tras abrirse un paso, el zombi lo toma (ruta recalculada)')
    chk(not errs, 'sin errores JS ' + str(errs[:2]))
sys.exit(1 if bad else 0)
