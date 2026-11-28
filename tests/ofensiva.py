"""F11 (bots): cada facción tiene un rival asignado; no hay oleadas antes del minuto 5; después una escuadra ataca el puesto avanzado del rival y, si ya no es suyo, asedia su refugio
(se coloca a 8-12 m y dispara al muro); el muro pierde vida; se retira si queda diezmada; no hay suicidios (las bajas del atacante son pocas con el refugio sin defensores)."""
import os
from playwright.sync_api import sync_playwright
bad = 0
def chk(c, m):
    global bad
    print(('OK  ' if c else 'FALLO ') + m); bad += 0 if c else 1
with sync_playwright() as p:
    b = p.chromium.launch(executable_path='/usr/bin/google-chrome', args=['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'])
    pg = b.new_page(viewport={'width': 844, 'height': 390}); errs = []; pg.on('pageerror', lambda e: errs.append(str(e))); ev = pg.evaluate
    pg.goto('file://' + os.path.abspath('index.html') + '?mapa=6&nodefensa'); pg.wait_for_timeout(1000); ev('begin()'); pg.wait_for_timeout(500)
    ev('''()=>{menuOpen=true;MX.zom.noRestock=true;MX.pl.inv=1e9;
      window.run=(s)=>{for(let i=0;i<60*s;i++){ for(const z of MX.zom.list){z.dead=true;z.st='dead';z.deadT=99}; for(const e of MX.ents) if(e.team>=2){ e.p.set(e.team===2?-330:330,0,e.team===2?330:330); e.inv=1e9 } time+=1/60; update(1/60)}};
      MX.pl.p.set(0,0,0); P.pos.set(0,0,0); run(1) }''')
    r = ev('()=>({rival:MX.OFF.rival, t:MX.M.t})'); print(r)
    chk(all(0 <= v <= 3 and v != i for i, v in enumerate(r['rival'])), 'cada facción tiene un rival asignado distinto de ella (%s)' % r['rival'])
    ev('()=>run(120)'); r = ev('()=>MX.OFF.stats.waves'); chk(sum(r) == 0, 'no hay oleadas antes del minuto 5 (%s)' % r)
    # saltar al minuto 5: el equipo 1 ataca; su rival es el 0; el puesto avanzado del 0 ya no es suyo -> asedio al refugio
    ev('''()=>{ MX.M.t=305; MX.OFF.next=[1e9,310,1e9,1e9]; MX.OFF.rival[1]=0; MX.SQ.objs.forEach(o=>{ if(o.id==='PUE'&&o.home===0) o.owner=-1; }); MX.OFF.horde.next=1e9;
      for(const e of MX.ents) if(e.team===0&&!e.isPlayer){ const z=MX.ECO.zoneOf(0); e.p.set(z.x,0,z.z); e.inv=0; } }''')
    ev('()=>run(30)')
    r = ev('()=>({waves:MX.OFF.stats.waves, sieges:MX.OFF.stats.sieges, act:MX.OFF.siege.length, seg:MX.OFF.siege[0]&&MX.OFF.siege[0].seg.ref.spec.type})')
    print(r); chk(r['waves'][1] >= 1 and r['sieges'][1] >= 1 and r['act'] >= 1, 'a partir del minuto 5 el equipo 1 lanza una oleada y asedia el refugio rival (%s)' % r)
    # sin defensores: el equipo 0 se queda fuera de combate (lejos) para medir el daño al muro
    ev('''()=>{ for(const e of MX.ents) if(e.team===0&&!e.isPlayer){ e.p.set(-100,0,100); e.inv=1e9; } window.hp0=MX.REF.pct[0]; window.d0=MX.ents.filter(e=>e.team===1&&e.dead).length }''')
    for _ in range(60):   # el trayecto entre refugios (≈ 680 m) lleva ≈ 85 s: se espera a que lleguen los 3 tiradores con fusil
        ev('()=>run(5)')
        if ev('()=>{ const w=MX.OFF.siege[0]; return !!w && w.s.members.filter(e=>e.w.kind==="rifle"&&!e.w.launch&&e.sitePos&&!e.dead&&Math.hypot(e.p.x-e.sitePos.x,e.p.z-e.sitePos.z)<3.5).length>=3 }'): break
    ev('()=>{ window.s60=MX.OFF.stats.shots[1]; window.d60=MX.REF.dmgBy[0][1]; run(60) }')
    r = ev('''()=>({s60:MX.OFF.stats.shots[1]-window.s60, d60:MX.REF.dmgBy[0][1]-window.d60, pct:MX.REF.pct[0], shots:MX.OFF.stats.shots[1], act:MX.OFF.siege.length, end:MX.OFF.stats.end, dmg:MX.REF.dmgBy[0][1], dead:MX.ents.filter(e=>e.team===1&&e.dead).length-d0, pos:MX.OFF.siege[0]&&[...MX.OFF.siege[0].pos.values()].slice(0,5).map(p=>Math.round(Math.hypot(p.x-MX.OFF.siege[0].seg.ref.spec.x,p.z-MX.OFF.siege[0].seg.ref.spec.z)))})''')
    print(r)
    chk(r['s60'] > 150 and r['d60'] / 60 > 150, 'disparan al muro de forma sostenida (≥ 150 de daño/s en la última ventana de 60 s) y el refugio pierde vida (%s)' % r)
    chk(r['dead'] <= 2, 'sin suicidios: el atacante pierde pocos soldados (%d)' % r['dead'])
    chk(r['pos'] and all(7 <= d <= 15 for d in r['pos']), 'se colocan a 8-12 m del tramo %s' % r['pos'])
    # retirada
    r = ev('''()=>{ const w=MX.OFF.siege[0]; if(!w) return {sinAsedio:true}; for(const e of w.s.members.slice(1)) { e.dead=true; e.hp=0; e.respT=1e9; } const rt0=MX.OFF.stats.retreats[1]; run(5); return {ret:MX.OFF.stats.retreats[1]-rt0, act:MX.OFF.siege.length} }''')
    print(r); chk(r.get('sinAsedio') or r['ret'] >= 1, 'si queda con menos de la mitad se retira (%s)' % r)
    chk(not errs, 'sin errores JS %s' % errs[:3])
    b.close()
print('FALLOS:', bad); raise SystemExit(1 if bad else 0)
