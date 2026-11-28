"""Anti-atasco (F2): el mapa de navegación no tiene bolsas aisladas donde haya aparición, objetivos, puestos de curación o puntos de espera, y un bot colocado dentro de una bolsa se recoloca solo en la zona principal."""
import os, sys
from playwright.sync_api import sync_playwright
bad = 0
def chk(c, m):
    global bad
    print(('OK  ' if c else 'FALLO ') + m); bad += 0 if c else 1
with sync_playwright() as p:
    b = p.chromium.launch(executable_path='/usr/bin/google-chrome', args=['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'])
    pg = b.new_page(viewport={'width': 900, 'height': 500}); errs = []; pg.on('pageerror', lambda e: errs.append(str(e))); ev = pg.evaluate
    pg.goto('file://' + os.path.abspath('index.html') + '?mapa=6'); pg.wait_for_timeout(1200); ev('begin()'); pg.wait_for_timeout(2500)
    r = ev('''()=>{ const M=MX.M, SQ=MX.SQ, C=MX.navComp(true); const bad=[]; const chk=(n,x,z)=>{ if(!MX.inMainNav(x,z)) bad.push(n+'@'+Math.round(x)+','+Math.round(z)); };
      for(const o of SQ.objs){ let ok=false; for(let r=0;r<=8&&!ok;r+=2) for(let a=0;a<6.3&&!ok;a+=.8) if(MX.inMainNav(o.x+Math.cos(a)*r,o.z+Math.sin(a)*r)) ok=true; if(!ok) bad.push('obj:'+(o.code||o.name)); }   /* el centro de un objetivo puede ser un obstáculo (monumento): basta una celda libre a ≤ 8 m */ for(const st of MX.stations.list) chk('puesto', st.x, st.z);
      for(const e of M.ents) if(!e.isPlayer) chk('bot:'+e.id, e.p.x, e.p.z); for(const t of (M.spawn||[])) for(const s of (Array.isArray(t)?t:[t])) if(s&&s.x!==undefined) chk('spawn', s.x, s.z);
      const pockets=C.sizes.map((n,i)=>[n,i]).filter(a=>a[1]!==C.main&&a[0]>=40).length;
      return {bad:bad.slice(0,12), nbad:bad.length, comps:C.sizes.length, pockets} }''')
    print(r)
    chk(r['nbad'] == 0, 'objetivos, puestos de curación, apariciones y bots iniciales están en la zona principal (%d fuera: %s)' % (r['nbad'], r['bad']))
    # un bot dentro de una bolsa (o de un muro de bolsa) se recoloca solo
    r2 = ev('''()=>{ const M=MX.M, C=MX.navComp(true); const W=MX.NV.w; let pk=-1; for(let i=0;i<C.comp.length;i++){ const c=C.comp[i]; if(c>=0&&c!==C.main&&C.sizes[c]>=3){ pk=i; break } }
      if(pk<0) return {sinBolsa:true}; const x=MX.NV.ox+((pk%W)+.5), z=MX.NV.oz+(((pk/W)|0)+.5); const e=M.ents.find(q=>!q.isPlayer&&!q.dead&&!q.dwn&&q.team===1); e.p.set(x,0,z); e.goal={x:0,z:0}; e.clsWait=null; P.pos.set(-600,0,-600); MX.pl.p.set(-600,0,-600);
      for(let i=0;i<60*4;i++){ time+=1/60; update(1/60); } return {antes:[Math.round(x),Math.round(z)], despues:[Math.round(e.p.x),Math.round(e.p.z)], enPrincipal:MX.inMainNav(e.p.x,e.p.z)} }''')
    print(r2)
    chk(r2.get('sinBolsa') or r2.get('enPrincipal'), 'un bot dentro de una bolsa aislada se recoloca en la zona principal')
    chk(not errs, 'sin errores JS ' + str(errs[:2]))
sys.exit(1 if bad else 0)
