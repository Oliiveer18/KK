"""F9 (ingenieros): los bots disponibles reconstruyen tramos destruidos y reparan los dañados con material del almacén (por tipo) y tiempo; paran si falta material y si el refugio está bajo ataque;
no trabajan en combate; el gasto sale del almacén."""
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
      for(const e of MX.ents) if(e!==MX.pl&&e.team!==0){ e.p.set(e.team===1?300:(e.team===2?-300:250),0,e.team===1?-300:300); e.inv=1e9; }
      MX.pl.p.set(-100,0,100); P.pos.set(-100,0,100); run(1);
      // jugador fuera del equipo de ingenieros: sus compañeros de la facción 0 se reparten por el refugio y siguen a su líder si no
      window.eng=()=>MX.ents.filter(e=>e.team===0&&!e.isPlayer&&e.eng).length; MX.pl.sqd&&(MX.pl.sqd.playerLead=true); }''')
    # preparar: ingenieros = soldados del equipo 0 que no van con el jugador, recién reaparecidos en el refugio
    ev('''()=>{ const z=MX.ECO.zoneOf(0); window.team0=MX.ents.filter(e=>e.team===0&&!e.isPlayer&&(!e.sqd||!e.sqd.playerLead)); for(const e of team0){ e.dead=false; e.dwn=false; e.hp=100; e.inv=1e9; e.lifeStart=MX.M.t; e.p.set(z.x+(Math.random()-.5)*6,0,z.z+(Math.random()-.5)*4); e.clsWait=null; } }''')
    r = ev('''()=>({n:window.team0.length})'''); print(r); chk(r['n'] >= 10, 'hay soldados de la facción 0 fuera de la escuadra del jugador (%d)' % r['n'])
    # tramo dañado y tramo destruido
    r = ev('''()=>{ const R=MX.REF, S=R.seg[0]; window.dmg=S.find(q=>q.type==='wallLow1'); window.dead=S.filter(q=>q.type==='wallLow1'&&q!==dmg)[3]; dmg.hp=dmg.maxHp*.3; dead.by=MX.ents.find(e=>e.team===1); damageProp(dead, dead.maxHp*3, dead.x, dead.z, 1, 0, 'bullet'); run(.5); window.deadSpec={x:dead.ref.spec.x,z:dead.ref.spec.z};
      MX.ECO.stock[0].madera=300; MX.ECO.stock[0].piedra=100; MX.ECO.stock[0].hierro=50; window.s0=Object.assign({},MX.ECO.stock[0]); R.atkT[0]=-99; return {pct:R.pct[0], dead:dead.dead, hp:dmg.hp/dmg.maxHp} }''')
    print(r); chk(r['dead'] and r['hp'] < .35, 'un tramo destruido y otro al 30 %')
    ev('()=>run(60)')
    r = ev('''()=>{ const R=MX.REF, S=R.seg[0]; const alive=S.filter(q=>!q.dead).length; const repaired=S.filter(q=>!q.dead&&q.hp>=q.maxHp*.97).length; const q=S.find(x=>x.ref.spec.x===deadSpec.x&&x.ref.spec.z===deadSpec.z); const st=MX.ECO.stock[0];
      return {alive, n:S.length, q:q?{dead:q.dead,hp:q.hp/q.maxHp}:null, dmgHp:dmg.hp/dmg.maxHp, stock:[st.madera,st.piedra,st.hierro], s0:[s0.madera,s0.piedra,s0.hierro], stats:R.stats, act:MX.ents.filter(e=>e.eng).map(e=>e.eng.k+':'+e.eng.st)} }''')
    print(r)
    chk(r['q'] is not None and not r['q']['dead'], 'el tramo destruido se reconstruye (queda un tramo nuevo en su sitio)')
    chk(r['dmgHp'] >= .99, 'el tramo dañado se repara por completo (%.2f)' % r['dmgHp'])
    chk(r['stock'][0] < r['s0'][0] and r['stock'][1] < r['s0'][1], 'el material sale del almacén por tipo (madera/piedra) %s -> %s' % (r['s0'], r['stock']))
    # sin material: se detiene
    r = ev('''()=>{ const R=MX.REF, S=R.seg[0]; const w=S.find(q=>!q.dead&&q.type==='wallLow1'&&q!==dmg); w.hp=w.maxHp*.2; const st=MX.ECO.stock[0]; st.madera=0; st.piedra=0; st.hierro=0; const hp0=w.hp; run(40); return {hp0:hp0/w.maxHp, hp1:w.hp/w.maxHp} }''')
    chk(r['hp1'] - r['hp0'] < .03, 'sin material no se repara (%s)' % r)
    # bajo ataque: no trabajan y se detienen
    r = ev('''()=>{ const R=MX.REF; const st=MX.ECO.stock[0]; st.madera=300; st.piedra=100; R.seg[0].filter(q=>!q.dead).slice(0,8).forEach(q=>{q.hp=q.maxHp*.3}); R.atkT[0]=-99; team0.forEach(e=>{e.lifeStart=MX.M.t}); run(4); const eng0=eng(); R.atkT[0]=MX.M.t+20; run(3); return {eng0, eng1:eng()} }''')
    print(r); chk(r['eng0'] > 0 and r['eng1'] == 0, 'con el refugio bajo ataque los ingenieros dejan de trabajar (%s)' % r)
    chk(not errs, 'sin errores JS %s' % errs[:3])
    b.close()
print('FALLOS:', bad); raise SystemExit(1 if bad else 0)
