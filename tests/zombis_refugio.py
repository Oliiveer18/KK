"""F11 (infectados): los infectados pegados al muro de un refugio con alguien dentro lo atacan (los pesados más); el evento de horda manda de 30 a 60 infectados contra un refugio, como mucho uno
cada 5 minutos; el daño de infectados no se anota a ninguna facción (no cuentan para el reparto de puntos)."""
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
      window.run=(s)=>{for(let i=0;i<60*s;i++){ for(const e of MX.ents) if(e!==MX.pl&&e.team!==0){ e.p.set(e.team===1?330:(e.team===2?-330:300),0,e.team===1?-330:330); e.inv=1e9 } time+=1/60; update(1/60)}};
      MX.pl.p.set(0,0,0); P.pos.set(0,0,0); window.rr=MAPA.built.info.refugeRects.find(r=>r.fac===0); run(1); }''')
    # infectados pegados al muro con un bot dentro
    r = ev('''()=>{ const R=MX.REF; const w=R.seg[0].find(q=>q.type==='wallLow1'&&!q.dead&&Math.abs(q.ref.spec.z-rr.z)>6); const sp=w.ref.spec; const dx=sp.x-rr.x, dz=sp.z-rr.z, l=Math.hypot(dx,dz);
      const z=MX.ECO.zoneOf(0); const bot=MX.ents.find(e=>e.team===0&&!e.isPlayer); bot.p.set(rr.x+dx/l*4, 0, rr.z+dz/l*4); bot.inv=1e9; window.bot=bot;
      const Z=MX.zom.list.filter(z=>!z.dead).slice(0,12); window.ZS=Z; const hp0=w.hp; const by0=R.dmgBy[0].slice();
      for(let i=0;i<60*20;i++){ for(const e of MX.ents) if(e!==MX.pl&&e.team!==0){ e.p.set(e.team===1?330:(e.team===2?-330:300),0,e.team===1?-330:330) } bot.p.set(rr.x+dx/l*4, 0, rr.z+dz/l*4); Z.forEach((q,k)=>{ q.dead=false; q.st='chase'; q.hp=q.hp||100; q.p.set(sp.x+dx/l*1.2+(k%4)*.5, 0, sp.z+dz/l*1.2+Math.floor(k/4)*.4) }); time+=1/60; update(1/60) }
      return {lost:hp0-w.hp, by:R.dmgBy[0].map((v,i)=>v-by0[i])} }''')
    print(r)
    chk(r['lost'] > 100, 'los infectados pegados al muro con alguien dentro le quitan vida (%d)' % r['lost'])
    chk(all(abs(v) < 1e-6 for v in r['by']), 'el daño de infectados no se anota a ninguna facción %s' % r['by'])
    # evento de horda
    r = ev('''()=>{ const O=MX.OFF; MX.M.t=400; O.horde.next=0; const h0=O.stats.hordes; const n0=O.stats.hordeSize.length; run(3); return {h:O.stats.hordes-h0, size:O.stats.hordeSize.slice(n0), next:Math.round(O.horde.next-MX.M.t)} }''')
    print(r)
    chk(r['h'] == 1 and all(30 <= n <= 60 for n in r['size']), 'el evento de horda manda entre 30 y 60 infectados (%s)' % r['size'])
    chk(r['next'] >= 290, 'el siguiente evento no llega antes de 5 minutos (%d s)' % r['next'])
    r = ev('''()=>{ const h0=MX.OFF.stats.hordes; run(120); return MX.OFF.stats.hordes-h0 }''')
    chk(r == 0, 'no hay otro evento de horda en los 2 minutos siguientes (%d)' % r)
    chk(not errs, 'sin errores JS %s' % errs[:3])
    b.close()
print('FALLOS:', bad); raise SystemExit(1 if bad else 0)
