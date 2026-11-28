"""F7: logística. Bots recicladores (apoyo / recién reaparecidos) trabajan solo si están a salvo, llegan al depósito y el stock sube; abandonan ante el peligro; el botín de un caído
(con su material) lo puede coger cualquier facción manteniendo □."""
import os, json
from playwright.sync_api import sync_playwright
bad = 0
def chk(c, m):
    global bad
    print(('OK  ' if c else 'FALLO ') + m); bad += 0 if c else 1
with sync_playwright() as p:
    b = p.chromium.launch(executable_path='/usr/bin/google-chrome', args=['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'])
    pg = b.new_page(viewport={'width': 844, 'height': 390}); errs = []; pg.on('pageerror', lambda e: errs.append(str(e))); ev = pg.evaluate
    pg.goto('file://' + os.path.abspath('index.html') + '?mapa=6'); pg.wait_for_timeout(1000); ev('begin()'); pg.wait_for_timeout(300)
    ev('''()=>{menuOpen=true;MX.zom.noRestock=true;for(const z of MX.zom.list){z.dead=true;z.st='dead';z.deadT=99};MX.pl.inv=1e9;window.kz=()=>{for(const z of MX.zom.list){z.dead=true;z.st='dead';z.deadT=99}};
      window.run=(s)=>{for(let i=0;i<60*s;i++){ kz(); time+=1/60; update(1/60)}}; MX.pl.p.set(-100,0,100); P.pos.set(-100,0,100); }''')
    # hacer que una facción rival (equipo 1) tenga apoyos libres y que nadie les moleste
    r = ev('''()=>{ const T=1; const es=MX.ents.filter(e=>e.team===T&&!e.isPlayer); const sup=es.filter(e=>(e.cls||'fus')==='sup'); sup.forEach(e=>{e.inv=1e9}); return {n:es.length, sup:sup.length, max:MX.LG?1:0} }''')
    print(r)
    # aislar a los bots de otras facciones lejos para que no haya contacto
    ev('''()=>{ for(const e of MX.ents) if(e.team!==1&&!e.isPlayer){ e.p.set(e.team===0?-300:300,0,e.team===0?300:-300); e.inv=1e9; } }''')
    s0 = ev('()=>({st:MX.ECO.stock[1].madera+MX.ECO.stock[1].piedra+MX.ECO.stock[1].hierro, jobs:MX.LG.stats.jobs[1]})')
    for i in range(6):
        ev('()=>{ for(const e of MX.ents) if(e.team!==1&&!e.isPlayer){ e.p.set(e.team===0?-300:300,0,e.team===0?300:-300); } run(20) }')
        print(ev('()=>({st:MX.ECO.stock[1].madera+MX.ECO.stock[1].piedra+MX.ECO.stock[1].hierro, jobs:MX.LG.stats.jobs, ab:MX.LG.stats.aborts, why:MX.LG.stats.why, dep:MX.ECO.stat.deposited, act:MX.ents.filter(e=>e.lg).map(e=>e.id+":"+e.lg.st+":"+e.lg.kind)})'))
    r = ev('()=>({st:MX.ECO.stock[1].madera+MX.ECO.stock[1].piedra+MX.ECO.stock[1].hierro, jobs:MX.LG.stats.jobs[1], dep:MX.ECO.stat.deposited[1], gained:MX.ECO.stat.gained[1]})')
    chk(r['jobs'] > 0, 'los bots de la facción 1 emprenden trabajos (%d)' % r['jobs'])
    chk(r['dep'] > 0 and r['st'] > s0['st'], 'depositan material y el stock sube (%d -> %d, depositado %d)' % (s0['st'], r['st'], r['dep']))
    # peligro: un rival a 15 m del trabajo lo aborta
    r = ev('''()=>{ const e=MX.ents.find(q=>q.team===1&&q.lg&&q.lg.st!=='depot'); if(!e) { return {sinTrabajo:true}; } const foe=MX.ents.find(q=>q.team===0&&!q.isPlayer); foe.p.set(e.lg.ax+8,0,e.lg.az); foe.inv=1e9; const ab0=MX.LG.stats.aborts[1]; run(3); return {ab:MX.LG.stats.aborts[1]-ab0, still:!!e.lg&&e.lg.st!=='depot'} }''')
    print(r)
    chk(r.get('sinTrabajo') or r['ab'] >= 1, 'ante un enemigo cerca el bot abandona el trabajo %s' % r)
    # botín del caído
    r = ev('''()=>{ const v=MX.ents.find(q=>q.team===1&&!q.isPlayer&&!q.dead); MX.ECO.addCarry(v,'hierro',9); const x=-100, z=100; v.p.set(x+3,0,z); v.inv=0; v.hp=1; MX.hit(v, 500, MX.pl, 1, 0); MX.hit(v, 500, MX.pl, 1, 0); run(.2); const k=OBJ.pickups.find(q=>q.ownerId===v.id); return k?{mats:k.mats, x:k.x, z:k.z}:null }''')
    print(r)
    chk(r and r['mats'] and r['mats']['hierro'] == 9, 'el caído suelta su material como botín %s' % r)
    if r:
        r2 = ev('''(k)=>{ MX.pl.mat=null; MX.pl.bag={pack1:1}; MX.pl.p.set(k.x+1,0,k.z); P.pos.set(k.x+1,0,k.z); P.aim=-Math.PI/2; MX.pl.yaw=-Math.PI/2; for(let i=0;i<60*2.5;i++){ MX.rev=true; kz(); time+=1/60; update(1/60) } MX.rev=false; return {load:MX.ECO.load(MX.pl), hierro:MX.pl.mat&&MX.pl.mat.hierro} }''', r)
        chk(r2['hierro'] == 9, 'cualquier facción recoge el botín manteniendo □ %s' % r2)
    chk(not errs, 'sin errores JS %s' % errs[:3])
    b.close()
print('FALLOS:', bad); raise SystemExit(1 if bad else 0)
