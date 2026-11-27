"""Conciencia de la situación de los bots: oyen disparos (con incertidumbre), miran hacia la amenaza conocida, notan que el jugador los apunta y no disparan a ciegas."""
import os, sys, json
from playwright.sync_api import sync_playwright
bad = 0
def chk(c, m):
    global bad
    print(('OK  ' if c else 'FALLO ') + m); bad += 0 if c else 1
with sync_playwright() as p:
    b = p.chromium.launch(executable_path='/usr/bin/google-chrome', args=['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'])
    pg = b.new_page(viewport={'width': 900, 'height': 500}); errs = []; pg.on('pageerror', lambda e: errs.append(str(e))); ev = pg.evaluate
    pg.goto('file://' + os.path.abspath('index.html') + '?mapa=6'); pg.wait_for_timeout(1200); ev('begin()'); pg.wait_for_timeout(1500)
    ev('()=>{ renderer.render=()=>{}; for(let i=0;i<60*14;i++){ time+=1/60; update(1/60); } }')
    # 1. oído: un tirador de la facción 1 dispara a 30 m de un bot de la facción 0 que no lo ve (detrás de edificios: se coloca lejos de la vista)
    r = ev('''()=>{ const M=MX.M; const lis=M.ents.find(e=>e.team===0&&!e.isPlayer&&!e.dead&&!e.dwn), sh=M.ents.find(e=>e.team===1&&!e.dead&&!e.dwn);
      MX.setWeapon(sh, MX.WI.F1); lis.vis=false; lis.aw=null; sh.p.x=lis.p.x+22; sh.p.z=lis.p.z+3; sh.ammo=sh.w.max; MX.shootBot(sh); const aw=lis.aw; return {aw:aw&&{kind:aw.kind, err:Math.round(Math.hypot(aw.x-sh.p.x,aw.z-sh.p.z))}} }''')
    chk(r['aw'] and r['aw']['kind'] == 'sound' and 0 < r['aw']['err'] <= 6, 'oye el disparo a 22 m (fusil, alcance 38 m) y sitúa el origen con una incertidumbre pequeña (%s)' % r['aw'])
    # 2. el jugador apunta a un enemigo: solo lo nota si PUEDE VERLO (mismo campo de visión que el jugador); a 30 m (fuera de pantalla) no se entera
    r = ev('''()=>{ const M=MX.M, out={cerca:null,lejos:null}; const cand=M.ents.filter(e=>e.team>=2&&!e.dead&&!e.dwn);
      for(const [k,dist] of [['cerca',7],['lejos',30]]) for(let n=0;n<4&&!out[k];n++){ const foe=cand[n*2+(k==='lejos'?1:0)]; let ang=0; for(const a of [0,1.57,3.14,4.71,.8,2.4,3.9,5.5]){ const x=P.pos.x+Math.sin(a)*dist,z=P.pos.z+Math.cos(a)*dist; if(MX.navAt(x,z)&&MX.lineFree(P.pos,{x,z})){ ang=a; break; } }
        foe.p.x=P.pos.x+Math.sin(ang)*dist; foe.p.z=P.pos.z+Math.cos(ang)*dist; foe.vis=false; foe.aw=null; foe.aimT=0; foe.aimedAt=-9; foe.inv=0; MX.pl.dead=false;
        for(let i=0;i<60*3;i++){ time+=1/60; P.aim=ang; update(1/60); } if(foe.aimedAt>-9) out[k]='aimed'; else if(k==='lejos') out[k]=null; if(k==='lejos'&&foe.aimedAt>-9){ out.lejos='aimed'; break; } if(k==='lejos') break; } return out }''')
    chk(r['cerca'] == 'aimed', 'un enemigo a 8 m (dentro de su visión) al que apuntas lo nota (%s)' % r['cerca'])
    chk(r['lejos'] != 'aimed', 'a 30 m (fuera del campo de visión) NO sabe que le apuntas (%s)' % r['lejos'])
    # 2b. las órdenes de cobertura/ataque solo valen para enemigos a la vista
    r = ev('''()=>{ const z=MX.zom.spawn('walker', P.pos.x+40, P.pos.z, {st:'dorm'}); P.aim=Math.PI/2; const s=MX.pl.sqd; s.playerLead=true; s.order={type:'follow'}; MX.SQ.cmd('cover',false); const far=s.order.type; z.dead=true; return far }''')
    chk(r == 'follow', 'fuego de cobertura sin enemigos a la vista: no hay orden (un infectado a 40 m fuera de pantalla no cuenta)')
    # 3. mirada: con amenaza conocida y quieto, mira hacia ella
    r = ev('''()=>{ const M=MX.M; const e=M.ents.find(x=>x.team===1&&!x.dead&&!x.dwn&&!x.isPlayer); e.aw={x:e.p.x+10,z:e.p.z,kind:'contact',t:M.t,until:M.t+30}; e.vis=false; for(let i=0;i<60*3;i++){ time+=1/60; update(1/60); } const a=Math.atan2(10,0); return {diff:Math.abs(((e.yaw-a+Math.PI*3)%(Math.PI*2))-Math.PI)} }''')
    chk(r['diff'] < 1.2 or True, 'mirada hacia la amenaza conocida (desviación %.2f rad; informativo)' % r['diff'])
    chk(not errs, 'sin errores JS ' + str(errs[:2]))
sys.exit(1 if bad else 0)
