"""F9 (mejoras): la cola de mejoras por niveles (muros, portón, torre, enfermería, armería) cuesta material, se levanta tramo a tramo y cambia de verdad lo que hace el refugio; la consola
del refugio muestra el almacén y deja encolar; sin material no se encola."""
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
      const z=MX.ECO.zoneOf(0); for(const e of MX.ents.filter(e=>e.team===0&&!e.isPlayer&&(!e.sqd||!e.sqd.playerLead))){ e.dead=false; e.dwn=false; e.hp=100; e.inv=1e9; e.lifeStart=MX.M.t; e.p.set(z.x+(Math.random()-.5)*6,0,z.z+(Math.random()-.5)*4); e.clsWait=null; } }''')
    # sin material no se encola
    r = ev('''()=>{ const st=MX.ECO.stock[0]; st.madera=st.piedra=st.hierro=0; return MX.REF.enqueue(0,'muros') }''')
    chk(r is False, 'sin material no se puede encolar una mejora')
    # muros nivel 2: coste, tramo a tramo
    r = ev('''()=>{ const st=MX.ECO.stock[0]; st.madera=400; st.piedra=400; st.hierro=400; const s0=st.piedra; const ok=MX.REF.enqueue(0,'muros'); const q=MX.REF.queue[0][0]; return {ok, left:q.left, per:q.per, up:MX.REF.up[0].muros} }''')
    print(r); chk(r['ok'] and r['left'] >= 20 and r['up'] == 1, 'la mejora de muros se encola y afecta a todos los tramos (%s)' % r)
    ev('()=>run(120)')
    r = ev('''()=>{ const R=MX.REF; const S=R.seg[0].filter(q=>!q.dead&&/^wallLow/.test(q.ref.spec.type)); const lv=S.map(q=>+q.ref.spec.type.slice(-1)); const st=MX.ECO.stock[0];
      return {lv2:lv.filter(x=>x===2).length, n:lv.length, up:R.up[0].muros, q:R.queue[0].length, maxHp:S.find(q=>q.ref.spec.type==='wallLow2')&&S.find(q=>q.ref.spec.type==='wallLow2').maxHp, piedra:st.piedra, upg:R.stats.upgraded[0], types:[...new Set(S.map(q=>q.type))]} }''')
    print(r)
    chk(r['lv2'] > 0 and r['maxHp'] == 22400 and 'wallLow2' in r['types'], 'los tramos mejorados pasan a parapeto de piedra con más vida (%s)' % r)
    chk(r['piedra'] < 400, 'la mejora gasta material del almacén (%d)' % r['piedra'])
    ev('()=>run(200)'); r = ev('()=>({up:MX.REF.up[0].muros, q:MX.REF.queue[0].length, pct:MX.REF.pct[0]})')
    chk(r['up'] == 2 and r['q'] == 0, 'al terminar todos los tramos el nivel de los muros sube a 2 (%s)' % r)
    # enfermería y armería
    r = ev('''()=>{ const st=MX.ECO.stock[0]; st.madera=400; st.piedra=400; st.hierro=400; const a=MX.REF.enqueue(0,'enfermeria'), b=MX.REF.enqueue(0,'armeria'), c=MX.REF.enqueue(0,'torre'); MX.ents.filter(e=>e.team===0&&!e.isPlayer).forEach(e=>{e.lifeStart=MX.M.t}); run(150); const U=MX.REF.up[0];
      const z=MX.ECO.zoneOf(0); return {a,b,c,enf:U.enfermeria, arm:U.armeria, torre:U.torre, heal:MX.REF.healMul(z.x,z.z,0), healFuera:MX.REF.healMul(0,0,0), alert:MX.REF.alertRadius(0)} }''')
    print(r)
    chk(r['a'] and r['b'] and r['c'], 'se encolan enfermería, armería y torre')
    chk(r['enf'] == 1 and r['arm'] == 1 and r['torre'] == 1, 'los ingenieros las levantan (%s)' % r)
    chk(r['heal'] == 1.5 and r['healFuera'] == 1 and r['alert'] == 160, 'efectos reales: camillas del refugio curan ×1,5 y la torre amplía el radio de alerta a 160 m (%s)' % r)
    # armería: reaparecer con más granadas
    r = ev('''()=>{ const e=MX.ents.find(q=>q.team===0&&!q.isPlayer&&(!q.sqd||!q.sqd.playerLead)); e.dead=true; e.respT=0; e.gCount=0; run(1.5); return {alive:!e.dead, g:e.gCount} }''')
    chk(r['alive'] and r['g'] >= 3, 'con armería se reaparece con más granadas (%s)' % r)
    # consola
    r = ev('''()=>{ MX.REFCON.open(); const d=document.getElementById('refCon'); const t=d.textContent; const btn=[...d.querySelectorAll('button')].map(x=>x.textContent+(x.disabled?' [x]':'')); d.close(); return {t:t.slice(0,160), btn} }''')
    print(r); chk('Almacén' in r['t'] and any('Mejorar' in x or 'nivel' in x for x in r['btn']), 'la consola del refugio muestra el almacén y las mejoras')
    chk(not errs, 'sin errores JS %s' % errs[:3])
    b.close()
print('FALLOS:', bad); raise SystemExit(1 if bad else 0)
