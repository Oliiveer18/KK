"""Médicos y puestos (F1): heridos sin combate eligen el puesto aunque no esté activo, el médico acude a la demanda y los cura; pedir médico (callMedic) manda al más cercano; sin médico avisa."""
import os, sys, json
from playwright.sync_api import sync_playwright
bad = 0
def chk(c, m):
    global bad
    print(('OK  ' if c else 'FALLO ') + m); bad += 0 if c else 1
with sync_playwright() as p:
    b = p.chromium.launch(executable_path='/usr/bin/google-chrome', args=['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'])
    pg = b.new_page(viewport={'width': 900, 'height': 500}); errs = []; pg.on('pageerror', lambda e: errs.append(str(e))); ev = pg.evaluate
    pg.goto('file://' + os.path.abspath('index.html') + '?mapa=6'); pg.wait_for_timeout(1000); ev('begin()'); pg.wait_for_timeout(300)
    ev('''()=>{menuOpen=true;window.kz=()=>{for(const z of MX.zom.list){z.dead=true;z.st='dead';z.deadT=99}};kz();MX.pl.inv=1e9;for(let i=0;i<20;i++)update(1/60)}''')
    r = ev('''()=>{ const ST=MX.stations.list, E=MX.ents, pl=MX.pl, T=pl.team; const st=ST.filter(q=>q.n>=2).sort((a,b)=>Math.hypot(a.x+60,a.z+60)-Math.hypot(b.x+60,b.z+60))[0];
      const mates=E.filter(e=>e!==pl&&e.team===T&&!e.dead&&(!e.sqd||!e.sqd.playerLead)); const med=mates.find(e=>e.cls==='med'); const hurt=mates.filter(e=>e!==med&&e.cls!=='med').slice(0,3);
      for(const e of E) if(!e.isPlayer && e!==med && !hurt.includes(e)){ e.p.set(-600,0,-600); e.inv=1e9; } pl.p.set(-500,0,-500); P.pos.set(-500,0,-500);
      hurt.forEach((e,i)=>{ e.p.set(st.x+30+i*2,0,st.z+10); e.hp=35; e.inv=1e9; e.lastHurt=-99; e.dwn=false; e.clsWait=null; e.stGo=null; e.vis=false; e.tgt=null; e.path=null; e.goal=null; e.st='push'; if(e.sqd) e.sqd.playerLead=false; });
      med.p.set(st.x+45,0,st.z+20); med.hp=100; med.inv=1e9; med.clsWait=null; med.stGo=null; med.vis=false; med.tgt=null; med.lastHurt=-99; if(med.sqd) med.sqd.playerLead=false;
      for(let i=0;i<60*60;i++){ for(const e of E){ if(e!==med&&!hurt.includes(e)&&e!==pl) e.p.set(-600,0,-600) } kz(); time+=1/60; update(1/60); }
      return {hurtDist:hurt.map(e=>Math.round(Math.hypot(e.p.x-st.x,e.p.z-st.z))), hurtHp:hurt.map(e=>Math.round(e.hp)), r:Math.round(st.r), medDist:Math.round(Math.hypot(med.p.x-st.x,med.p.z-st.z))} }''')
    print(r)
    chk(all(h >= 75 for h in r['hurtHp']), 'heridos sin médico en el puesto: acuden, llega el médico y se curan (vida %s)' % r['hurtHp'])
    r2 = ev('''()=>{ const E=MX.ents, pl=MX.pl, T=pl.team; for(const e of E) if(!e.isPlayer){ e.medCall=null; } pl._medCallT=-99; P.pos.set(-300,0,-300); pl.p.set(-300,0,-300);
      const meds=E.filter(e=>e!==pl&&e.team===T&&!e.dead&&e.cls==='med'); for(const m of meds){ m.p.set(-200,0,-300); m.dwn=false; m.dead=false; m.clsWait=null; m.vis=false; m.tgt=null; m.st='push'; m.hp=100; }
      const ok=MX.callMedic(); const called=meds.filter(m=>m.medCall).length; const again=MX.callMedic(); const d0=Math.hypot(meds[0].p.x+300,meds[0].p.z+300);
      for(let i=0;i<60*45;i++){ for(const e of E) if(!e.isPlayer && !meds.includes(e)) e.p.set(-600,0,-600); kz(); time+=1/60; update(1/60); }
      const near=Math.min(...meds.map(m=>Math.hypot(m.p.x+300,m.p.z+300)));
      for(const m of meds){ m.dead=true; } pl._medCallT=-99; const none=MX.callMedic(); return {ok,called,again,near:Math.round(near),none} }''')
    print(r2)
    chk(r2['ok'] and r2['called'] == 1 and not r2['again'], 'pedir médico: lo recibe un solo médico y hay enfriamiento (%s)' % r2)
    chk(r2['near'] <= 12, 'el médico llega hasta el jugador (a %d m)' % r2['near'])
    chk(not r2['none'], 'sin médicos vivos: avisa y no pide')
    chk(not errs, 'sin errores JS ' + str(errs[:2]))
sys.exit(1 if bad else 0)
