"""F8 (destrucción): al llegar a 0 % se reparten 150 puntos según el daño de cada facción rival (sin infectados), la facción no queda eliminada, sin puntos no reaparece, con un punto reaparece por
oleadas de 3 cada 8 s con 3 s de protección, sin nada y sin vivos queda eliminada, el stock sobrevive a los muros pero se pierde con el almacén, el refugio no se captura."""
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
      for(const z of MX.zom.list){z.dead=true;z.st='dead';z.deadT=99}
      for(const e of MX.ents) if(e!==MX.pl&&e.team!==0){ e.p.set(e.team===1?300:(e.team===2?-300:250),0,e.team===1?-300:300); e.inv=1e9; }
      MX.SQ.objs.forEach(o=>{ if(!o.refuge) o.owner=-1; }); window.foes=[1,2,3].map(t=>MX.ents.find(e=>e.team===t&&!e.isPlayer)); MX.pl.p.set(-100,0,100); P.pos.set(-100,0,100); run(1) }''')
    # stock y muros
    ev('()=>{ MX.ECO.stock[0].hierro=100; }')
    # daño: facción 1 el 75 %, facción 3 el 25 % (por cada tramo)
    r = ev('''()=>{ const R=MX.REF; const sc0=MX.SQ.score.slice(); const f1=foes[0], f3=foes[2]; for(const s of R.seg[0]){ s.by=f1; damageProp(s, s.maxHp*.75/ MX.ECO.dmgMuro.bullet, s.x, s.z, 1, 0, 'bullet'); if(s.dead) continue; s.by=f3; damageProp(s, s.maxHp, s.x, s.z, 1, 0, 'bullet'); }
      run(1); return {pct:R.pct[0], destroyed:R.destroyed[0], sc0, sc1:MX.SQ.score.slice(), dmg:R.dmgBy[0], pts:R.pts[0], stock:MX.ECO.stock[0].hierro, rf:MX.SQ.objs.find(o=>o.refuge&&o.home===0).destroyed} }''')
    print(r)
    chk(r['destroyed'] and r['pct'] == 0 and r['rf'], 'a 0 %% de integridad el refugio queda destruido (%s)' % r['pct'])
    pts = r['pts']; chk(isinstance(pts, list) and sum(pts) == 150 and pts[1] == 112 + (150 - 112 - 38 - 0) * 0 or sum(pts) == 150, 'se reparten 150 puntos según el daño %s' % pts)
    chk(pts[1] > pts[3] > 0 and pts[0] == 0 and pts[2] == 0, 'solo cobran las facciones que dañaron (la 1 más que la 3) %s' % pts)
    chk(r['sc1'][1] - r['sc0'][1] >= pts[1] and r['sc1'][3] - r['sc0'][3] >= pts[3], 'los puntos se suman al marcador %s -> %s' % (r['sc0'], r['sc1']))
    chk(r['stock'] == 100, 'el stock sobrevive a la caída de los muros (%d)' % r['stock'])
    # HUD
    txt = ev('()=>{ menuOpen=false; MX.SQ.capTick(); const t=document.getElementById("domScore").textContent; menuOpen=true; return t }')
    chk('✖' in txt, 'la barra superior marca el refugio destruido (%s)' % txt)
    # sin puntos: no reaparece
    r = ev('''()=>{ const m=MX.ents.filter(e=>e.team===0&&!e.isPlayer).slice(0,6); for(const e of m){ e.dead=true; e.respT=0; e.p.set(-100,0,100); } run(3); return m.filter(e=>!e.dead).length }''')
    chk(r == 0, 'sin ningún punto propio no se reaparece (%d)' % r)
    # con un punto: oleadas de 3 cada 8 s con 3 s de protección
    r = ev('''()=>{ const o=MX.SQ.objs.find(q=>q.code==='D'); o.owner=0; for(const e of MX.ents) if(e.team!==0&&e!==MX.pl) e.p.set(e.team===1?300:(e.team===2?-300:250),0,e.team===1?-300:300);
      const m=MX.ents.filter(e=>e.team===0&&!e.isPlayer).slice(0,6); for(const e of m){ e.dead=true; e.respT=0; e.p.set(-100,0,100); } const out=[]; run(.3); out.push(m.filter(e=>!e.dead).length); const prot=m.filter(e=>!e.dead).map(e=>+e.inv.toFixed(1)); const at=m.filter(e=>!e.dead).map(e=>Math.hypot(e.p.x-o.x,e.p.z-o.z)<60); run(4); out.push(m.filter(e=>!e.dead).length); run(5); out.push(m.filter(e=>!e.dead).length); run(8); out.push(m.filter(e=>!e.dead).length);
      return {out, prot, at:at.length>0&&at.every(x=>x)} }''')
    print(r)
    chk(r['out'][0] == 3 and r['out'][1] == 3 and r['out'][2] == 6, 'reaparecen en oleadas de 3 cada 8 s %s' % r['out'])
    chk(all(v > 2 for v in r['prot']) and r['at'], 'con 3 s de protección y en el punto propio (%s)' % r)
    # no se captura
    r = ev('''()=>{ const rf=MX.SQ.objs.find(o=>o.refuge&&o.home===0); const e=foes[0]; e.dead=false; e.dwn=false; for(let i=0;i<60*25;i++){ e.p.set(rf.x,0,rf.z); for(const z of MX.zom.list){z.dead=true;z.st='dead'}; time+=1/60; update(1/60) } e.p.set(300,0,-300); return {owner:rf.owner, cap:rf.cap} }''')
    chk(r['owner'] == 0, 'el refugio no se captura aunque un rival se quede dentro (%s)' % r)
    # almacén
    r = ev('''()=>{ const R=MX.REF; for(const s of R.seg[1]) s.hp=s.maxHp; MX.ECO.stock[1].hierro=77; const w=R.ware[1]; w.by=foes[1]; damageProp(w, w.maxHp*2, w.x, w.z, 1, 0, 'bullet'); run(1); return {lost:R.wareLost[1], stock:MX.ECO.total(1), dead:w.dead} }''')
    chk(r['lost'] and r['stock'] == 0, 'si cae el almacén se pierde el stock (%s)' % r)
    # eliminación
    r = ev('''()=>{ const R=MX.REF; for(const o of MX.SQ.objs) if(!o.refuge&&o.owner===0) o.owner=-1; for(const e of MX.ents) if(e.team===0){ e.dead=true; e.respT=0; } run(2); return {el:R.eliminated[0], alive:MX.ents.filter(e=>e.team===0&&!e.dead).length} }''')
    chk(r['el'] and r['alive'] == 0, 'sin refugio, sin puntos y sin vivos la facción queda eliminada (%s)' % r)
    chk(not errs, 'sin errores JS %s' % errs[:3])
    b.close()
print('FALLOS:', bad); raise SystemExit(1 if bad else 0)
