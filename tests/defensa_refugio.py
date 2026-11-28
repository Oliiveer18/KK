"""F10: niveles de alerta (verde/ámbar/rojo), guarnición de 6/8/12 en los puestos de defensa del refugio, sin quitar soldados a la escuadra del jugador, relevo por turnos y granada a la brecha."""
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
    ev('''()=>{menuOpen=true;MX.zom.noRestock=true;MX.pl.inv=1e9;
      window.run=(s)=>{for(let i=0;i<60*s;i++){ for(const z of MX.zom.list){z.dead=true;z.st='dead';z.deadT=99}; time+=1/60; update(1/60)}};
      window.park=(except)=>{ for(const e of MX.ents) if(e!==MX.pl&&e.team!==0&&e!==except){ e.p.set(e.team===1?330:(e.team===2?-330:300),0,e.team===1?-330:330); e.inv=1e9; } };
      park(); MX.pl.p.set(0,0,0); P.pos.set(0,0,0); window.rr=MAPA.built.info.refugeRects.find(r=>r.fac===0);
      const z=MX.ECO.zoneOf(0); for(const e of MX.ents.filter(e=>e.team===0&&!e.isPlayer)){ e.p.set(z.x+(Math.random()-.5)*20,0,z.z+(Math.random()-.5)*10); e.inv=1e9; e.dead=false; e.dwn=false; e.hp=100 } run(10) }''')
    g = lambda: ev('()=>({lv:MX.DEF.level[0], gar:MX.ents.filter(e=>e.team===0&&e.gar&&!e.dead).length, want:MX.DEF.size[0], plSq:MX.ents.filter(e=>e.team===0&&e.gar&&e.sqd&&e.sqd.playerLead).length})')
    r = g(); print(r); chk(r['lv'] == 0 and r['gar'] == 6, 'verde: guarnición de 6 (%s)' % r)
    # ámbar: enemigo a ~100 m
    ev('''()=>{ const e=MX.ents.find(q=>q.team===1&&!q.isPlayer); window.foe=e; e.p.set(rr.x+100,0,rr.z); e.inv=1e9; window.park=(x)=>{ for(const q of MX.ents) if(q!==MX.pl&&q.team!==0&&q!==foe){ q.p.set(q.team===1?330:(q.team===2?-330:300),0,q.team===1?-330:330); } }; for(let i=0;i<60*12;i++){ park(); foe.p.set(rr.x+100,0,rr.z); for(const z of MX.zom.list){z.dead=true;z.st='dead'} time+=1/60; update(1/60) } }''')
    r = g(); print(r); chk(r['lv'] == 1 and r['gar'] == 8, 'ámbar (enemigo a 100 m): guarnición de 8 (%s)' % r)
    ev('''()=>{ for(let i=0;i<60*12;i++){ park(); foe.p.set(rr.x+30,0,rr.z); for(const z of MX.zom.list){z.dead=true;z.st='dead'} time+=1/60; update(1/60) } }''')
    r = g(); print(r); chk(r['lv'] == 2 and r['gar'] == 12, 'rojo (enemigo a 30 m): guarnición de 12 (%s)' % r)
    chk(r['plSq'] == 0, 'la guarnición no se lleva a los de la escuadra del jugador')
    # ocupan sus puestos
    ev('()=>{ for(let i=0;i<60*20;i++){ park(); foe.p.set(rr.x+30,0,rr.z); for(const z of MX.zom.list){z.dead=true;z.st=\'dead\'} time+=1/60; update(1/60) } }')
    r = ev('''()=>{ const G=MX.ents.filter(e=>e.team===0&&e.gar&&!e.dead&&e.gar.post); return {n:G.length, ok:G.filter(e=>Math.hypot(e.p.x-e.gar.post.x,e.p.z-e.gar.post.z)<3).length, uniq:new Set(G.map(e=>e.gar.post)).size} }''')
    print(r); chk(r['n'] >= 10 and r['ok'] >= r['n'] * .75 and r['uniq'] == r['n'], 'ocupan puestos distintos del refugio (%s)' % r)
    # brecha + enemigo junto a ella: granada
    r = ev('''()=>{ const R=MX.REF; const w=R.seg[0].find(q=>q.type==='wallLow1'&&!q.dead); const sp=w.ref.spec; w.by=foe; damageProp(w, w.maxHp*3, w.x, w.z, 1, 0, 'bullet'); const dx=sp.x-rr.x, dz=sp.z-rr.z, l=Math.hypot(dx,dz);
      for(const e of MX.ents.filter(e=>e.team===0&&e.gar)){ e.gCount=3; } const g0=MX.DEF.stats.grenades[0];
      for(let i=0;i<60*30;i++){ park(); foe.p.set(sp.x+dx/l*9, 0, sp.z+dz/l*9); for(const z of MX.zom.list){z.dead=true;z.st='dead'} time+=1/60; update(1/60) } return {g:MX.DEF.stats.grenades[0]-g0} }''')
    print(r); chk(r['g'] >= 1, 'con brecha y un enemigo junto a ella, un defensor lanza granada a la abertura (%s)' % r)
    # relevo: en calma, tras 150 s
    r = ev('''()=>{ const sh0=MX.DEF.stats.shifts[0]; for(let i=0;i<60*200;i++){ park(); foe.p.set(330,0,-330); for(const z of MX.zom.list){z.dead=true;z.st='dead'} time+=1/60; update(1/60) } return {lv:MX.DEF.level[0], gar:MX.ents.filter(e=>e.team===0&&e.gar&&!e.dead).length, shifts:MX.DEF.stats.shifts[0]-sh0, att:MX.REF.attacked(0), atk:MX.M.t-MX.REF.atkT[0], near:Math.round(Math.min(...MX.ents.filter(e=>e.team!==0&&!e.dead).map(e=>Math.hypot(e.p.x-rr.x,e.p.z-rr.z)))), br:MX.REF.seg[0].filter(q=>q.dead).length} }''')
    print(r); chk(r['lv'] == 0 and r['gar'] == 6 and r['shifts'] >= 1, 'en calma vuelve a 6 y se relevan por turnos (%s)' % r)
    chk(not errs, 'sin errores JS %s' % errs[:3])
    b.close()
print('FALLOS:', bad); raise SystemExit(1 if bad else 0)
