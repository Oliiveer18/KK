"""Dominio de ubicaciones (campaña, ?mapa=6), como en los juegos de dominio: un punto neutral se captura quedándose dentro 10 s; uno enemigo primero se
neutraliza (10 s) y después se captura (10 s); con enemigos dentro queda DISPUTADO y se congela; al salir lo avanzado baja poco a poco; cada 5 s cada
facción suma 1 punto por punto propio y 2 por común, y la primera en llegar a la META gana (pantalla de fin). Barra de captura y marcador en pantalla."""
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
    ev('''()=>{menuOpen=true;MX.zom.noRestock=true;for(const z of MX.zom.list){z.dead=true;z.st='dead';z.deadT=99}const pl=MX.pl;pl.inv=1e9;pl.hp=1e9;
      /* sólo el jugador cerca de los puntos de prueba: el resto de combatientes, lejos y quietos */
      window.park=()=>{for(const e of MX.ents)if(!e.isPlayer){e.p.set(470+(e.team*3),0,470);e.inv=1e9}};
      window.at=(o,dx)=>{pl.p.set(o.x+(dx||1),0,o.z);P.pos.set(o.x+(dx||1),0,o.z);pl.v&&pl.v.set(0,0,0)};
      window.run=s=>{for(let i=0;i<s*60;i++){park();const o=window.__at;if(o)at(o);update(1/60)}};menuOpen=false}''')
    S = 'MX.SQ'
    r = ev('''()=>{const A=MX.SQ.objs.find(o=>o.code==='A');MX.SQ.score=[0,0,0,0];window.__at=A;run(5);const mid=[A.owner,A.capBy,+A.cap.toFixed(2)];
      const bar=document.getElementById('capBar'),txt=bar.textContent,vis=getComputedStyle(bar).display!=='none';run(5.6);return {mid,owner:A.owner,txt,vis,r:A.r}}''')
    print(r)
    chk(r['mid'][0] == -1 and r['mid'][1] == 0 and .4 <= r['mid'][2] <= .6, 'punto neutral: a los 5 s va por la mitad (%s)' % r['mid'])
    chk(r['owner'] == 0, 'a los 10 s es nuestro')
    chk(r['vis'] and 'Capturando' in r['txt'], 'barra de captura en pantalla: «%s»' % r['txt'])
    chk(r['r'] == 12, 'zona de 12 m en la Plaza')
    r = ev('''()=>{const F=MX.SQ.objs.find(o=>o.owner===1&&!o.shared);window.__at=F;run(10.3);const a=[F.owner,F.capBy];run(10.3);return {a,b:F.owner,r:F.r}}''')
    print(r)
    chk(r['a'] == [-1, 0], 'punto enemigo: a los 10 s queda neutralizado (gris) y seguimos capturando')
    chk(r['b'] == 0, 'a los 20 s es nuestro')
    chk(r['r'] == 8, 'zona de 8 m en los puntos de cada facción')
    r = ev('''()=>{const B=MX.SQ.objs.find(o=>o.code==='B');window.__at=B;run(4);const c0=B.cap;
      const foe=MX.ents.find(e=>e.team===2&&!e.dead);window.park=()=>{for(const e of MX.ents)if(!e.isPlayer&&e!==foe){e.p.set(470,0,470);e.inv=1e9}};foe.p.set(B.x-2,0,B.z);foe.inv=1e9;foe.hp=1e9;foe.dead=false;foe.dwn=false;
      for(let i=0;i<180;i++){park();at(B);foe.p.set(B.x-2,0,B.z);update(1/60)}const c1=B.cap,cont=B.contested,txt=document.getElementById('capBar').textContent;
      foe.p.set(470,0,470);window.park=()=>{for(const e of MX.ents)if(!e.isPlayer){e.p.set(470+(e.team*3),0,470);e.inv=1e9}};window.__at=null;MX.pl.p.set(B.x+40,0,B.z);P.pos.set(B.x+40,0,B.z);run(4);const c2=B.cap;
      return {c0,c1,cont,c2,txt}}''')
    print(r)
    chk(r['cont'] and abs(r['c1'] - r['c0']) < .01 and 'DISPUTADO' in r['txt'], 'con un enemigo dentro: DISPUTADO y congelado')
    chk(0 < r['c2'] < r['c1'] and r['c1'] - r['c2'] < .15, 'al salir, lo avanzado baja poco a poco (%.2f → %.2f)' % (r['c1'], r['c2']))
    r = ev('''()=>{window.__at=null;MX.SQ.score=[0,0,0,0];MX.SQ.scoreT=0;const held=[0,0,0,0],sh=[0,0,0,0];for(const o of MX.SQ.objs)if(o.owner>=0)(o.shared?sh:held)[o.owner]++;
      run(5.6);const s=MX.SQ.score.slice();MX.SQ.score[0]=MX.SQ.meta-1;run(5.6);const end=document.getElementById('domEnd');
      return {s,exp:held.map((h,t)=>h+2*sh[t]),win:MX.SQ.winner,over:MX.M.over,endVis:getComputedStyle(end).display!=='none',txt:end.textContent.slice(0,40),score:document.getElementById('domScore').textContent}}''')
    print(r)
    chk(r['s'] == r['exp'], 'cada 5 s: +1 por punto propio y +2 por común %s' % r['s'])
    chk(r['win'] == 0 and r['over'] and r['endVis'] and 'VICTORIA' in r['txt'], 'al llegar a la meta gana la facción y sale la pantalla de fin («%s»)' % r['txt'])
    chk('/1500' in r['score'], 'marcador de dominio arriba con la meta (%s)' % r['score'])
    chk(not errs, 'sin errores JS ' + str(errs[:2]))
sys.exit(1 if bad else 0)
