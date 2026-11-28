"""La escuadra del jugador vuelve con él al reaparecer (F2): al caer el líder-jugador la escuadra se queda en «mantener»; al reaparecer recupera el mando y se reagrupa (después, «Seguirme»). Si cedió el mando a propósito, no."""
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
    r = ev('''()=>{ renderer.render=()=>{}; const M=MX.M, pl=MX.pl, s=pl.sqd; const kz=()=>{for(const z of MX.zom.list){z.dead=true;z.st='dead';z.deadT=99}};
      s.playerLead=true; s.order={type:'follow'}; for(let i=0;i<120;i++){ kz(); time+=1/60; update(1/60); }
      pl.inv=0; MX.hit(pl,1e6,null,0,0,undefined,'TEST'); for(let i=0;i<30;i++){ kz(); time+=1/60; update(1/60); } const perdido={lead:s.playerLead, lost:!!s.plLost, pl:pl.dead||pl.dwn};
      let vio=false; for(let i=0;i<60*90;i++){ kz(); time+=1/60; update(1/60); if(pl.dead||pl.dwn) vio=true; else if(vio) break; } for(let i=0;i<60*14;i++){ kz(); time+=1/60; update(1/60); }
      const mem=s.members.filter(m=>!m.isPlayer&&!m.dead); const d=mem.map(m=>Math.round(Math.hypot(m.p.x-P.pos.x,m.p.z-P.pos.z)));
      return {perdido, lead:s.playerLead, order:s.order&&s.order.type, alive:!pl.dead, d} }''')
    print(r)
    chk(r['perdido']['lost'] and not r['perdido']['lead'], 'al caer, la escuadra pierde el mando del jugador (se queda donde está)')
    chk(r['lead'] and r['alive'], 'al reaparecer, recupera el mando')
    chk(r['order'] in ('regroup', 'follow'), 'y la orden es reagrupar / seguirme (%s)' % r['order'])
    chk(max(r['d']) <= 60, 'los miembros están a ≤ 60 m del jugador a los 14 s (%s)' % r['d'])
    r2 = ev('''()=>{ const pl=MX.pl, s=pl.sqd; s.playerLead=false; s.plLost=0; s.order=null; s.mission={type:'hold'}; SQ=MX.SQ; SQ.onRespawn(pl); return {lead:s.playerLead} }''')
    chk(not r2['lead'], 'si cedió el mando a propósito, no se lo devuelve')
    chk(not errs, 'sin errores JS ' + str(errs[:2]))
sys.exit(1 if bad else 0)
