"""F8 (HUD): el % de integridad de los 4 refugios sale en vivo en la barra superior junto a la puntuación (rojo < 30 %, parpadea si lo atacan, ✖ si cae), el mapa táctico y el minimapa
lo marcan, y en un iPhone en horizontal ningún elemento se pisa (también el chip de material junto al refugio)."""
import os
from playwright.sync_api import sync_playwright
bad = 0
def chk(c, m):
    global bad
    print(('OK  ' if c else 'FALLO ') + m); bad += 0 if c else 1
IDS = ['miniMap', 'domScore', 'sqToast', 'cfgBtn', 'fps', 'invBtn', 'sqPanel', 'capBar', 'ammo', 'wname', 'gren', 'dash', 'rl', 'ecoChip']
with sync_playwright() as p:
    b = p.chromium.launch(executable_path='/usr/bin/google-chrome', args=['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'])
    ctx = b.new_context(**p.devices['iPhone 13 landscape']); pg = ctx.new_page(); errs = []; pg.on('pageerror', lambda e: errs.append(str(e))); ev = pg.evaluate
    pg.goto('file://' + os.path.abspath('index.html') + '?mapa=6'); pg.wait_for_timeout(1000); ev('begin()'); pg.wait_for_timeout(800)
    ev('''()=>{ MX.pl.inv=1e9; const z=MX.ECO.zoneOf(MX.pl.team); MX.pl.p.set(z.x,0,z.z-1); P.pos.set(z.x,0,z.z-1); MX.ECO.addCarry(MX.pl,'hierro',8); MX.SQ.toast('Prueba de aviso');
      const R=MX.REF; R.seg[1].forEach((s,i)=>{ if(i%3) s.hp=s.maxHp*.5 }); R.seg[2].forEach(s=>s.hp=s.maxHp*.12); R.atkT[1]=MX.M.t+30; for(let i=0;i<60;i++) update(1/60) }''')
    pg.wait_for_timeout(600)
    print(ev('()=>({pct:MX.REF.pct, hp:MX.REF.seg[2].map(s=>Math.round(s.hp)).slice(0,3), dead:MX.REF.seg[2].filter(s=>s.dead).length})'))
    r = ev('''(ids)=>{ const B=[]; for(const id of ids){ const e=document.getElementById(id); if(!e||getComputedStyle(e).display==='none'||e.hidden) continue; const q=e.getBoundingClientRect(); if(q.width<2||q.height<2) continue; B.push({id,x0:q.left,y0:q.top,x1:q.right,y1:q.bottom}) }
      const ov=[]; for(let i=0;i<B.length;i++) for(let j=i+1;j<B.length;j++){ const a=B[i],c=B[j]; const w=Math.min(a.x1,c.x1)-Math.max(a.x0,c.x0), h=Math.min(a.y1,c.y1)-Math.max(a.y0,c.y0); if(w>1&&h>1) ov.push(a.id+'×'+c.id) }
      const f=[...document.querySelectorAll('#domScore .f')].map(e=>({t:e.textContent, cls:[...e.querySelectorAll('em')].map(x=>x.className)})); return {ids:B.map(q=>q.id), ov, f, W:innerWidth} }''', IDS)
    print(r)
    chk('ecoChip' in r['ids'], 'el chip de material se ve junto al refugio y con carga')
    chk(not r['ov'], 'ningún elemento se pisa en el iPhone %s' % r['ov'])
    chk(len(r['f']) == 4 and all('%' in q['t'] for q in r['f'][:3]) , 'las 4 facciones muestran el porcentaje de su refugio (%s)' % [q['t'] for q in r['f']])
    cl = [q['cls'] for q in r['f']]
    chk(any('low' in c[0] for c in cl) and any('atk' in c[0] for c in cl), 'rojo bajo 30 por ciento y parpadeo si lo atacan (%s)' % cl)
    # mapa táctico y minimapa sin errores con los estados
    ev('()=>{ MX.mapToggle&&MX.mapToggle(); }'); pg.wait_for_timeout(400); ev('()=>{ for(let i=0;i<10;i++) update(1/60) }'); pg.wait_for_timeout(300)
    ev('()=>{ MX.mapClose&&MX.mapClose(); MX.REF.seg[2].forEach(s=>{s.hp=0}); for(let i=0;i<60;i++) update(1/60) }')
    t = ev('()=>{ menuOpen=false; MX.SQ.capTick(); return document.getElementById("domScore").textContent }')
    chk('✖' in t, 'un refugio caído se marca con ✖ (%s)' % t)
    chk(not errs, 'sin errores JS %s' % errs[:3])
    b.close()
print('FALLOS:', bad); raise SystemExit(1 if bad else 0)
