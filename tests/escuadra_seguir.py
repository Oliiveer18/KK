"""«Seguirme» (?mapa=6): la escuadra del jugador no se detiene por avistamientos. El jugador cruza el distrito a 7 m/s con infectados y enemigos por el camino y un contacto nuevo cada segundo (un compañero avista algo a 25 m):
antes todos iban a posiciones de apoyo y se quedaban atrás hasta 235 m el 96 % del tiempo; ahora tienen que seguirlo (≤ 40 m en todo momento y ≤ 10 % del tiempo a más de 14 m)."""
import os, sys, json
from playwright.sync_api import sync_playwright
bad = 0
def chk(c, m):
    global bad
    print(('OK  ' if c else 'FALLO ') + m); bad += 0 if c else 1
with sync_playwright() as p:
    b = p.chromium.launch(executable_path='/usr/bin/google-chrome', args=['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'])
    pg = b.new_page(viewport={'width': 900, 'height': 500}); errs = []; pg.on('pageerror', lambda e: errs.append(str(e))); ev = pg.evaluate
    pg.goto('file://' + os.path.abspath('index.html') + '?mapa=6'); pg.wait_for_timeout(1200); ev('begin()'); pg.wait_for_timeout(2500)
    r = ev('''()=>{ renderer.render=()=>{}; const M=MX.M, pl=MX.pl; pl.inv=1e9; pl.hp=1e9; const s=pl.sqd; s.playerLead=true; s.order={type:'follow'}; 
      const mem=s.members.filter(m=>!m.isPlayer&&m.bot); const why={}; const lag=mem.map(()=>({max:0,t25:0,n:0})); let t=0;
      // el jugador cruza el distrito de refugio hacia la plaza y más allá a 7 m/s con infectados vivos
      const A=MX.SQ.objs.find(o=>o.code==='A'); const sx=pl.p.x, sz=pl.p.z; const ex=A.x+40, ez=A.z-30; const L=Math.hypot(ex-sx,ez-sz); const dirx=(ex-sx)/L, dirz=(ez-sz)/L; let walked=0; const zs=MX.zom.list.filter(z=>!z.dead).slice(0,60); zs.forEach((z,i)=>{ const f=(i+1)/zs.length*L*.9; const off=(i%2?1:-1)*(7+(i%5)*2); z.p.set(sx+dirx*f+(-dirz)*off, 0, sz+dirz*f+(dirx)*off); z.st='wander'; z.v.set(0,0,0); });
      const foes=M.ents.filter(e=>!e.isPlayer&&e.team!==pl.team&&!e.dead).slice(0,10); foes.forEach((e,i)=>{ const f=(i+2)/12*L; const off=(i%2?1:-1)*(10+(i%3)*3); e.p.set(sx+dirx*f+(-dirz)*off,0,sz+dirz*f+dirx*off); e.path=null; e.goal=null; e.holdT=0; });
      for(let i=0;i<60*70;i++){ time+=1/60; const step=7*(1/60); if(walked<L){ walked+=step; P.pos.x+=dirx*step; P.pos.z+=dirz*step; pl.p.set(P.pos.x,0,P.pos.z); P.vel.set(dirx*7,0,dirz*7); pl.v&&pl.v.set(dirx*7,0,dirz*7); } else { P.vel.set(0,0,0); } pl.inv=1e9; pl.hp=1e9; if(i%60===0&&mem[0]&&!mem[0].dead){ s.contact={x:P.pos.x+22,z:P.pos.z+12,t:M.t,by:mem[0],foe:null,team:-1}; } update(1/60);
        if(i%12===0 && walked>10){ mem.forEach((m,k)=>{ if(m.dead) return; const d=Math.hypot(m.p.x-P.pos.x,m.p.z-P.pos.z), q=lag[k]; q.n++; q.max=Math.max(q.max,d); if(d>14){ q.t25++; const tg=m.tgt?(m.tgt.team===-1?'zombi':(m.tgt.team===m.team?'aliado':'enemigo')):'-'; const key=[m.st, m.vis?'vis':'novis', tg, m.cover?'cov':'-', m.sqCatch?'catch':'-', m.holdT>0?'hold':'-', m.clsWait?'clsWait':'-', m.stGo?'stGo':'-', m.gar?'GAR':'-', m.lg?'LG':'-', m.eng?'ENG':'-', m.siege?'SIEGE':'-', s.playerLead?'pl':'NOPL', m.cls, Math.hypot(m.v.x,m.v.z)<.3?'quieto':'mueve'].join('|'); why[key]=(why[key]||0)+1 } }) } }
      const m0=mem[0]; const dbg=m0&&{mem:mem.map(q=>[q.cls,!!q.clsWait,!!q.stGo,!!q.medCall,!!q.gar,!!q.lg,!!q.eng,!!q.siege,q.st]), g:MX.SQ.goalFor(m0), goal:m0.goal&&[Math.round(m0.goal.x),Math.round(m0.goal.z)], P:[Math.round(P.pos.x),Math.round(P.pos.z)], me:[Math.round(m0.p.x),Math.round(m0.p.z)], lead:s.leader&&s.leader.id, pl:pl.id, ord:s.order&&s.order.type, pL:s.playerLead, holdT:m0.holdT, path:!!m0.path, nav:MX.NV.w}; return JSON.stringify({dbg, walked:Math.round(walked), lag:lag.map(q=>({max:Math.round(q.max),frac14:+(q.t25/Math.max(1,q.n)).toFixed(2)})), why}) }''')
    d = json.loads(r); print(d['walked'], d['lag'], (d['why'], d['dbg']) if max(q['max'] for q in d['lag'])>60 else '')
    chk(d['walked'] > 300, 'el jugador recorrió el trayecto (%d m)' % d['walked'])
    chk(max(q['max'] for q in d['lag']) <= 25, 'ningún miembro se queda a más de 25 m (máx. %d m)' % max(q['max'] for q in d['lag']))
    chk(max(q['frac14'] for q in d['lag']) <= .05, 'a más de 14 m como mucho el 5 %% del tiempo (%s)' % [q['frac14'] for q in d['lag']])
    chk(not errs, 'sin errores JS ' + str(errs[:2]))
sys.exit(1 if bad else 0)
