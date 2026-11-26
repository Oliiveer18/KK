"""Objetivos del distrito (capa estratégica, escuadras.js): 24 propios (6 por facción, empiezan siendo suyos) y 5 comunes (de nadie); captura por dominio (10 s neutralizar + 10 s capturar)
con un solo bando dentro, se congela si está disputado; suministros al pasar por uno propio; la reaparición se acorta con los comunes que se tienen;
reaparición adelantada en el puesto avanzado propio; el mando ataca los comunes que no son suyos."""
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
    ev('''()=>{menuOpen=true;MX.zom.noRestock=true;window.__clear=()=>{for(const z of MX.zom.list){z.dead=true;z.st="dead";z.deadT=99}for(const e of MX.ents)if(e.bot&&!e.keep){e.dead=true;e.respT=1e9}};
      window.__run=n=>{for(let i=0;i<n;i++){__clear();update(1/60)}};MX.pl.inv=1e9;MX.pl.hp=1e9;P.pos.set(-445,0,-430)}''')
    r = ev('()=>({n:MX.SQ.objs.length,own:[0,1,2,3].map(t=>MX.SQ.objs.filter(o=>o.owner===t).length),neutral:MX.SQ.objs.filter(o=>o.owner<0).length})')
    print(r)
    chk(r['n'] == 29 and r['own'] == [6, 6, 6, 6] and r['neutral'] == 5, '29 objetivos: 6 propios por facción y 5 comunes de nadie')
    # captura de la farmacia azul por un rojo
    r = ev('''()=>{const o=MX.SQ.objs.find(q=>q.id==="FAR"&&q.home===0);window.O=o;const R=MX.ents.find(e=>e.bot&&e.team===1);R.keep=true;window.Rb=R;R.dead=false;R.dwn=false;R.hp=1e9;R.inv=1e9;R.fireCd=1e9;
      R.sqd.mission={type:'hold',x:o.x,z:o.z};R.sqd.missionT=MX.M.t;R.p.set(o.x,0,o.z);__run(60*10.6);const half=[o.owner,o.capBy];__run(60*10.6);return {half,owner:o.owner}}''')
    print(r)
    chk(r['half'] == [-1, 1] and r['owner'] == 1, 'un rojo solo dentro de la Farmacia azul: a los 10 s la neutraliza (%s) y a los 20 s es suya' % r['half'])
    r = ev('''()=>{const o=MX.SQ.objs.find(q=>q.id==="TIE"&&q.home===0);const A=MX.ents.find(e=>e.bot&&e.team===0);A.keep=true;A.dead=false;A.dwn=false;A.hp=1e9;A.inv=1e9;A.fireCd=1e9;Rb.fireCd=1e9;
      Rb.p.set(o.x,0,o.z);A.p.set(o.x+2,0,o.z);for(let i=0;i<60*12;i++){__clear();Rb.p.set(o.x,0,o.z);A.p.set(o.x+2,0,o.z);Rb.fireCd=A.fireCd=1e9;update(1/60)}return {owner:o.owner,cap:o.cap,cont:o.contested}}''')
    print(r)
    chk(r['owner'] == 0 and r['cont'], 'con los dos bandos dentro, disputado: no cambia de dueño')
    # suministros al jugador en un objetivo propio
    r = ev('''()=>{const o=MX.SQ.objs.find(q=>q.id==="PUE"&&q.home===0);P.gCount=0;MX.pl.supT=-99;P.pos.set(o.x,0,o.z);__run(60*2);return P.gCount}''')
    chk(r == 3, 'al pasar por un objetivo propio, el jugador se reabastece (granadas %d)' % r)
    # reaparición: 9 s sin comunes; 7 s con 2 comunes
    r = ev('''()=>{const a=MX.SQ.respawnTime(MX.pl);MX.SQ.objs.filter(o=>o.shared).slice(0,2).forEach(o=>o.owner=0);const b2=MX.SQ.respawnTime(MX.pl);return [a,b2]}''')
    chk(abs(r[0] - 9) < .01 and abs(r[1] - 7) < .01, 'reaparición 9 s sin objetivos comunes y 7 s con dos (%s)' % r)
    # reaparición adelantada
    r = ev('''()=>{const pue=MX.SQ.objs.find(o=>o.id==="PUE"&&o.home===0);const q=MX.SQ.list.find(s=>s.team===0&&!s.playerLead&&s.members.length>=2),L=q.members[0],A=q.members[1];
      L.keep=true;L.dead=false;L.dwn=false;q.leader=L;L.p.set(pue.x+5,0,pue.z);const s=MX.SQ.spawnFor(A);return s&&Math.hypot(s.x-pue.x,s.z-pue.z)}''')
    chk(r is not None and r < 10, 'con el puesto avanzado propio y su líder cerca, el bot reaparece allí (a %s m)' % r)
    # el mando ataca comunes que no son suyos
    r = ev('''()=>{const s=MX.SQ.list.find(q=>q.team===2&&q.members.length===6);for(const m of s.members){m.keep=true;m.dead=false;m.dwn=false;m.hp=1e9;m.inv=1e9;m.fireCd=1e9}s.missionT=-999;s.mission={type:'attack'};s.baseType='attack';MX.SQ.objs.filter(o=>o.shared).forEach(o=>o.owner=2);
      const plaza=MX.SQ.objs.find(o=>o.id==="PLAZA");plaza.owner=-1;for(let i=0;i<60*13;i++){update(1/60)}const m=s.mission;return {x:m.x,z:m.z,px:plaza.x,pz:plaza.z}}''')
    print(r)
    chk(abs(r['x'] - r['px']) < 1 and abs(r['z'] - r['pz']) < 1, 'el mando manda atacar el único objetivo común que no es suyo (la Plaza)')
    chk(not errs, 'sin errores JS ' + str(errs[:2]))
sys.exit(1 if bad else 0)
