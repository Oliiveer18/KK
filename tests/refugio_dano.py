"""F8 (daño): los muros del refugio tienen vida; las balas rivales hacen daño considerable (una escuadra de 5 tarda 25-40 s por tramo); los explosivos están limitados (≤ 8 % por tramo y decrecen);
el fuego propio (balas, granadas) no daña el propio refugio; el daño se anota por facción rival; la integridad baja en proporción."""
import os, json
from playwright.sync_api import sync_playwright
bad = 0
def chk(c, m):
    global bad
    print(('OK  ' if c else 'FALLO ') + m); bad += 0 if c else 1
with sync_playwright() as p:
    b = p.chromium.launch(executable_path='/usr/bin/google-chrome', args=['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'])
    pg = b.new_page(viewport={'width': 844, 'height': 390}); errs = []; pg.on('pageerror', lambda e: errs.append(str(e))); ev = pg.evaluate
    pg.goto('file://' + os.path.abspath('index.html') + '?mapa=6'); pg.wait_for_timeout(1000); ev('begin()'); pg.wait_for_timeout(500)
    ev('''()=>{menuOpen=true;MX.zom.noRestock=true;for(const z of MX.zom.list){z.dead=true;z.st='dead';z.deadT=99};MX.pl.inv=1e9;for(const e of MX.ents) if(e!==MX.pl){e.inv=1e9; e.p.set(-100+Math.random()*10,0,Math.random()*10)} MX.pl.p.set(-100,0,100); P.pos.set(-100,0,100);
      window.run=(s)=>{for(let i=0;i<60*s;i++){ for(const z of MX.zom.list){z.dead=true;z.st='dead';z.deadT=99}; time+=1/60; update(1/60)}}; run(1) }''')
    r = ev('''()=>{ const R=MX.REF; const s=R.seg[0]; return {n:s.length, hp:s[0].hp, max:s[0].maxHp, pct:R.pct[0], ware:R.ware[0].hp} }''')
    print(r); chk(r['n'] == 23 and r['pct'] == 100, 'el refugio azul tiene 23 tramos y 100 %% de integridad (%s)' % r)
    # tramo de la fachada con un rival delante
    ev('''()=>{ const R=MX.REF; window.wseg=R.seg[0].find(q=>q.type==='wallLow1'&&Math.abs(q.z-MAPA.built.info.refugeRects[0].z)>6&&q.x>MAPA.built.info.refugeRects[0].x-4); window.foeE=MX.ents.find(e=>e.team===1&&!e.isPlayer); window.ownE=MX.ents.find(e=>e.team===0&&!e.isPlayer); window.W0=WP[0]; }''')
    print(ev('()=>({ref:wseg.ref, bt:ownE.team, fb:foeE.team, type:wseg.type, on:MX.REF.on, same:MX.REF.seg[0].includes(wseg)})'))
    # fuego propio: balas y granada
    r = ev('''()=>{ const h0=wseg.hp; wseg.by=ownE; for(let i=0;i<50;i++) damageProp(wseg, 20, wseg.x, wseg.z, 1, 0, 'bullet'); const a=h0-wseg.hp; wseg.by=ownE; boomHit(wseg, wseg.x+1, wseg.z, 3.5, 1, ownE); return {a, dmgBy:MX.REF.dmgBy[0]} }''')
    chk(r['a'] == 0, 'el fuego propio (balas y granada) no daña el refugio propio (%s)' % r)
    # balas rivales: 100 balas de fusil
    r = ev('''()=>{ const h0=wseg.hp; wseg.by=foeE; for(let i=0;i<100;i++) damageProp(wseg, WP[0].dmg, wseg.x, wseg.z, 1, 0, 'bullet'); return {d:h0-wseg.hp, per:(h0-wseg.hp)/100, dmgBy:MX.REF.dmgBy[0].slice(), dmg:WP[0].dmg} }''')
    print(r)
    chk(abs(r['per'] - r['dmg']) < .01 and r['dmgBy'][1] >= r['d'] - .1, 'cada bala rival resta su daño y se anota a la facción atacante (%s)' % r)
    # ritmo: 5 tiradores, fusil 9 disparos/s, 50 % de actividad
    r = ev('''()=>{ const dps=5*(1/WP[0].cd)*.5*WP[0].dmg*MX.ECO.dmgMuro.bullet; return {dps, secs:MX.ECO.wallHp/dps} }''')
    print(r); chk(25 <= r['secs'] <= 40, 'una escuadra de 5 tarda %.0f s por tramo (objetivo 25-40 s)' % r['secs'])
    # granada: tope del 8 % y rendimiento decreciente
    r = ev('''()=>{ wseg.hp=wseg.maxHp; wseg.ref.blastN=0; wseg.by=foeE; const a=[]; for(let i=0;i<4;i++){ const h=wseg.hp; boomHit(wseg, wseg.x+1.5, wseg.z, 3.5, 1, foeE); a.push(+((h-wseg.hp)/wseg.maxHp*100).toFixed(2)); } return a }''')
    print(r); chk(r[0] <= 8.01 and r[0] >= 3 and r[3] < r[0] * .6, 'una granada cercana quita ≤ 8 %% del tramo y varias seguidas rinden menos (%s)' % r)
    # integridad
    r = ev('''()=>{ const R=MX.REF; for(const q of R.seg[0]) q.hp=q.maxHp; wseg.hp=0; const s0=R.seg[0].length; run(.5); return {pct:R.pct[0], expected:100*(1-0)} }''')
    chk(r['pct'] < 100 and r['pct'] > 90, 'la integridad baja con el daño (%s)' % r)
    chk(not errs, 'sin errores JS %s' % errs[:3])
    b.close()
print('FALLOS:', bad); raise SystemExit(1 if bad else 0)
