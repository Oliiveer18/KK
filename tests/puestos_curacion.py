"""Puestos de curación (?mapa=6): los grupos de camillas curan hasta 100 con un médico de la facción dentro y la zona despejada; el médico a pie sólo hasta 75; un enemigo cerca bloquea;
los bots heridos y sin combate acuden al puesto activo; un médico va a un puesto con heridos esperando."""
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
    ev('''()=>{menuOpen=true;MX.zom.noRestock=true;window.kz=()=>{for(const z of MX.zom.list){z.dead=true;z.st='dead';z.deadT=99}};kz();MX.pl.inv=1e9;for(let i=0;i<20;i++)update(1/60)}''')
    n = ev('()=>MX.stations.list.length'); print('puestos:', n)
    chk(n >= 8, 'hay puestos de curación en el mapa (%d)' % n)
    r = ev('''()=>{ const ST=MX.stations.list, E=MX.ents, st=ST.find(q=>q.n>=2), pl=MX.pl; const T=pl.team;
      const mates=E.filter(e=>e!==pl&&e.team===T&&!e.dead&&!e.isPlayer); const med=mates.find(e=>e.cls==='med')||mates[0]; med.cls='med'; const hurt=mates.filter(e=>e!==med).slice(0,2);
      const foes=E.filter(e=>e.team!==T&&!e.dead);
      const park=()=>{ for(const e of E){ if(e!==med&&!hurt.includes(e)&&e!==pl){ e.p.set(-600,0,-600); e.inv=1e9; } } kz(); };
      const run=(s)=>{ for(let i=0;i<60*s;i++){ park(); time+=1/60; update(1/60); } };
      const setup=()=>{ pl.p.set(-500,0,-500); P.pos.set(-500,0,-500); for(const e of [med,...hurt]){ e.dead=false; e.dwn=false; e.inv=1e9; e.hp=100; e.clsWait=null; e.stGo=null; e.vis=false; } hurt.forEach((e,i)=>{ e.p.set(st.x+1+i,0,st.z+1); e.hp=40; e.v.set(0,0,0); e.holdT=99; }); };
      const out={}; 
      setup(); med.p.set(st.x-1,0,st.z); run(9); out.activeHp=hurt.map(e=>Math.round(e.hp)); 
      setup(); med.p.set(st.x+st.r+9,0,st.z); hurt.forEach(e=>e.holdT=99); run(4); out.noMedHp=hurt.map(e=>Math.round(e.hp));
      setup(); med.p.set(st.x-1,0,st.z); const f=foes[0]; f.dead=false; f.dwn=false; f.p.set(st.x+2,0,st.z+2); f.inv=1e9; for(let i=0;i<60*3;i++){ park(); f.p.set(st.x+2,0,st.z+2); time+=1/60; update(1/60); } out.blockedHp=hurt.map(e=>Math.round(e.hp)); f.p.set(-600,0,-600);
      setup(); med.p.set(st.x+10+st.r,0,st.z); hurt.forEach(e=>{ e.p.set(st.x+st.r+9,0,st.z+2); e.hp=100; }); hurt[0].hp=30; hurt[0].p.set(st.x+st.r+12,0,st.z+2); med.hp=100; out.aura=0; run(5); out.auraHp=Math.round(hurt[0].hp);
      return out }''')
    print(r)
    chk(all(h >= 98 for h in r['activeHp']), 'con médico dentro y zona despejada, los heridos llegan a 100 (%s)' % r['activeHp'])
    chk(all(h <= 65 for h in r['noMedHp']), 'sin médico en el puesto sólo regenera hasta ~60 (%s)' % r['noMedHp'])
    chk(all(h <= 76 for h in r['blockedHp']), 'un enemigo dentro de la zona bloquea el puesto (sólo queda la ayuda del médico a pie, hasta 75) (%s)' % r['blockedHp'])
    chk(r['auraHp'] <= 76, 'el médico a pie fuera de un puesto cura como máximo hasta 75 (%s)' % r['auraHp'])
    # bots heridos acuden al puesto activo
    r2 = ev('''()=>{ const ST=MX.stations.list, E=MX.ents, st=ST.find(q=>q.n>=2), pl=MX.pl, T=pl.team; const mates=E.filter(e=>e!==pl&&e.team===T&&!e.dead&&!e.isPlayer); const med=mates[0]; med.cls='med'; const w=mates[1];
      for(const e of E){ if(e!==med&&e!==w&&e!==pl){ e.p.set(-600,0,-600); e.inv=1e9; } } pl.p.set(-500,0,-500); P.pos.set(-500,0,-500);
      for(const e of [med,w]){ e.dead=false; e.dwn=false; e.inv=1e9; e.clsWait=null; e.stGo=null; e.vis=false; e.tgt=null; e.lastHurt=-99; if(e.sqd){ e.sqd.playerLead=false; } }
      med.p.set(st.x,0,st.z); med.holdT=99; w.hp=30; const ang=Math.atan2(st.x,st.z); w.p.set(st.x+28,0,st.z+10); w.holdT=0; w.path=null; w.goal=null; const d0=Math.hypot(w.p.x-st.x,w.p.z-st.z);
      for(let i=0;i<60*30;i++){ for(const e of E){ if(e!==med&&e!==w&&e!==pl){ e.p.set(-600,0,-600); } } kz(); med.p.set(st.x,0,st.z); time+=1/60; update(1/60); }
      return {d0:Math.round(d0), d:Math.round(Math.hypot(w.p.x-st.x,w.p.z-st.z)), hp:Math.round(w.hp), go:!!w.stGo} }''')
    print(r2)
    chk(r2['d'] < r2['d0'] and (r2['d'] < 8 or r2['hp'] > 60), 'un bot herido sin combate acude al puesto activo y se cura (%s)' % r2)
    chk(not errs, 'sin errores JS ' + str(errs[:2]))
sys.exit(1 if bad else 0)
