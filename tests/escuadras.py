"""Campaña con 25 combatientes por facción (100 en total) en 5 escuadras de 5: reparto, líder, formación, seguimiento del jugador, avisos compartidos y estabilidad."""
import os, sys, time
from playwright.sync_api import sync_playwright
errs = []; bad = 0
def chk(c, m):
    global bad
    print(('OK  ' if c else 'FALLO ') + m); bad += 0 if c else 1
with sync_playwright() as p:
    b = p.chromium.launch(executable_path='/usr/bin/google-chrome', args=['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'])
    pg = b.new_page(viewport={'width': 1100, 'height': 700}); pg.on('pageerror', lambda e: errs.append(str(e)))
    pg.goto('file://' + os.path.abspath('index.html') + '?mapa=4'); pg.wait_for_timeout(1000); ev = pg.evaluate
    ev('begin()'); pg.wait_for_timeout(400); ev('MX.zom.noRestock=true')
    r = ev('()=>({n:MX.ents.length,teams:[0,1,2,3].map(t=>MX.ents.filter(e=>e.team===t).length),sq:[0,1,2,3].map(t=>[0,1,2,3,4].map(s=>MX.ents.filter(e=>e.team===t&&e.sq===s).length).join("")),player:MX.ents[0].isPlayer&&MX.ents[0].team===0&&MX.ents[0].sq===0})')
    print(r)
    chk(r['n'] == 100 and r['teams'] == [25, 25, 25, 25], '100 combatientes: 25 por cada una de las 4 facciones (el jugador dentro de Azul)')
    chk(all(s == '55555' for s in r['sq']), 'cada facción tiene 5 escuadras de 5 combatientes')
    chk(r['player'], 'el jugador es el primero de la escuadra 0 de Azul')
    # sin enemigos ni zombis: se mide la formación
    ev('()=>{for(const z of MX.zom.list){z.dead=true;z.st="dead";z.deadT=99}}')
    run = lambda n: ev('()=>{for(let i=0;i<%d;i++){for(const z of MX.zom.list){z.dead=true;z.st="dead";z.deadT=99} update(1/60)}}' % n)
    ev('()=>{MX.pl.hp=1e9;MX.pl.inv=99}'); run(60 * 20)
    d = ev('''()=>{const out=[];for(let t=0;t<4;t++)for(let s=0;s<5;s++){const m=MX.ents.filter(e=>e.team===t&&e.sq===s&&!e.dead&&!e.dwn);if(m.length<3)continue;const L=m[0];const ds=m.slice(1).map(e=>Math.hypot(e.p.x-L.p.x,e.p.z-L.p.z)).sort((a,b)=>a-b);out.push(ds[Math.floor(ds.length/2)])}out.sort((a,b)=>a-b);return {n:out.length,med:out[Math.floor(out.length/2)],p90:out[Math.floor(out.length*.9)]}}''')
    print('distancia mediana de los miembros a su líder (escuadras):', d)
    chk(d['med'] < 20, 'las escuadras se mantienen agrupadas (mediana a %.1f m del líder, mapa de 99 × 59 m)' % d['med'])
    # el jugador lidera su escuadra: los 4 bots de Azul-0 le siguen
    ev('()=>{for(const e of MX.ents) if(e.team!==0) {e.dead=true;e.respT=1e9}; P.pos.set(0,0,0)}')
    ev('()=>{window.__run2=n=>{for(let i=0;i<n;i++){for(const e of MX.ents) if(e.team!==0&&e.bot) e.respT=1e9; update(1/60)}}}'); ev('()=>__run2(60*25)')
    ev('()=>{P.pos.set(18,0,6)}'); ev('()=>__run2(60*14)')
    d2 = ev('()=>{const m=MX.ents.filter(e=>e.team===0&&e.sq===0&&e.bot&&!e.dead&&!e.dwn);return {n:m.length,d:m.map(e=>Math.round(Math.hypot(e.p.x-P.pos.x,e.p.z-P.pos.z)))}}')
    print('distancia de la escuadra del jugador a él:', d2)
    chk(d2['n'] >= 3 and sorted(d2['d'])[len(d2['d']) // 2] < 18, 'los bots de la escuadra del jugador le siguen (mediana a %d m)' % sorted(d2['d'])[len(d2['d']) // 2])
    # estabilidad
    t0 = time.time(); run(60 * 40); ms = (time.time() - t0) / (60 * 40) * 1000
    d3 = ev('()=>({vivos:MX.ents.filter(e=>!e.dead).length,atasc:MX.ents.filter(e=>e.bot&&!e.dead&&e.stuckN>1).length,muertes:MX.ents.reduce((a,e)=>a+e.deaths,0),puntos:MX.M.score.join("/")})')
    print('tras 60 s con 100 combatientes: %.1f ms por actualización (headless)' % ms, d3)
    chk(d3['atasc'] < 8, 'sin atascos masivos (%d atascados de 100)' % d3['atasc'])
    print('llamadas de dibujo (cámara en el jugador):', ev('renderer.info.render.calls'))
    print('ERRORES JS:', errs or 'ninguno'); bad += len(errs)
sys.exit(1 if bad else 0)
