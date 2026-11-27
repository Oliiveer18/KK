"""Escuadras de la campaña (src/escuadras.js): tamaños realistas e iguales para las 4 facciones, líder por mérito y relevo al caer, órdenes del jugador
(seguir, mantener, avanzar, cobertura, reagrupar), tomar y ceder el mando, unirse a otra escuadra, ir por libre, fusiones de escuadras mermadas, supresión
y estabilidad con 100 combatientes. Mapa 4 (campaña pequeña, 99 × 59 m)."""
import os, sys, time
from playwright.sync_api import sync_playwright
errs = []; bad = 0
def chk(c, m):
    global bad
    print(('OK  ' if c else 'FALLO ') + m); bad += 0 if c else 1
with sync_playwright() as p:
    b = p.chromium.launch(executable_path='/usr/bin/google-chrome', args=['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'])
    pg = b.new_page(viewport={'width': 1100, 'height': 700}); pg.on('pageerror', lambda e: errs.append(str(e)))
    pg.goto('file://' + os.path.abspath('index.html') + '?mapa=4'); pg.wait_for_timeout(1000); ev = pg.evaluate
    ev('begin()'); pg.wait_for_timeout(400); ev('MX.zom.noRestock=true')
    ev('''()=>{window.__noZ=()=>{for(const z of MX.zom.list){z.dead=true;z.st="dead";z.deadT=99}};
      window.__run=(n,f)=>{for(let i=0;i<n;i++){__noZ();if(f)f();update(1/60)}};
      window.__only=t=>()=>{for(const e of MX.ents) if(e.team!==t&&e.bot){e.dead=true;e.respT=1e9}};
      window.__sq=e=>e.sqd; window.__S=()=>MX.SQ.list}''')
    r = ev('''()=>({teams:[0,1,2,3].map(t=>MX.SQ.list.filter(s=>s.team===t).map(s=>s.members.length).sort((a,b)=>a-b).join(',')),
      tot:[0,1,2,3].map(t=>MX.ents.filter(e=>e.team===t).length),pl:MX.pl.sqd.name,lead:MX.pl.sqd.leader===MX.pl,plLead:MX.pl.sqd.playerLead,size:MX.pl.sqd.members.length})''')
    print(r)
    chk(r['tot'] == [50, 50, 50, 50], '50 combatientes por facción')
    chk(len(set(r['teams'])) == 1 and r['teams'][0] == '3,3,3,4,4,4,4,5,5,5,5,5', '12 escuadras por tipo (asalto 5, línea 5, apoyo 4, flanco 3, reserva 4, guarnición 3: mismos tamaños en las 4 facciones): %s' % r['teams'][0])
    chk(r['lead'] and r['plLead'] and r['size'] == 5, 'el jugador lidera su escuadra (%s, 5 miembros)' % r['pl'])
    # líder por mérito y relevo al caer
    r = ev('''()=>{const s=MX.SQ.list.find(q=>q.team===1&&q.members.length===5&&q.kind==='asalto');const m=s.members;m.forEach(e=>{e.cls='fus';e.kills=0;e.vet=0;e.lifeStart=MX.M.t});m[3].kills=5;m[4].kills=3;
      for(let i=0;i<40;i++)update(1/60);const a=s.leader===m[3];m[3].inv=0;m[3].revived=true;m[3].hp=1;MX.hit(m[3],999,null,0,1,null);for(let i=0;i<40;i++)update(1/60);const b2=s.leader===m[4];return {a,b:b2}}''')
    chk(r['a'], 'el líder de una escuadra de bots es el mejor (más bajas)')
    chk(r['b'], 'si el líder cae, el siguiente mejor vivo toma el mando')
    # órdenes del jugador (sin enemigos)
    ev('__only(0)()'); ev('()=>{MX.pl.hp=1e9;MX.pl.inv=1e9;P.pos.set(-20,0,0)}'); ev('()=>__run(60*8,__only(0))')
    med = lambda: ev('()=>{const s=MX.pl.sqd,d=s.members.filter(e=>e.bot&&!e.dead&&!e.dwn).map(e=>Math.hypot(e.p.x-P.pos.x,e.p.z-P.pos.z)).sort((a,b)=>a-b);return d.length?d[d.length>>1]:99}')
    d_follow = med(); print('seguir: mediana a %.1f m' % d_follow)
    chk(d_follow < 14, 'SEGUIRME: la escuadra va con el jugador en formación abierta (mediana %.1f m)' % d_follow)
    ev("MX.SQ.cmd('hold',false)"); ev('()=>{P.pos.set(25,0,10)}'); ev('()=>__run(60*8,__only(0))')
    r = ev('()=>{const s=MX.pl.sqd,o=s.order;return {t:o.type,d:s.members.filter(e=>e.bot&&!e.dead).map(e=>Math.round(Math.hypot(e.p.x-o.x,e.p.z-o.z)))}}')
    print('mantener:', r)
    chk(r['t'] == 'hold' and max(r['d']) < 14, 'MANTENER: se quedan en el punto aunque el jugador se vaya (máx. %d m)' % max(r['d']))
    ev('()=>{P.pos.set(-20,0,0);P.aim=Math.PI/2}'); ev("MX.SQ.cmd('move',false)"); ev('()=>__run(60*12,__only(0))')
    r = ev('()=>{const s=MX.pl.sqd,o=s.order;return {t:o.type,x:Math.round(o.x),z:Math.round(o.z),d:s.members.filter(e=>e.bot&&!e.dead).map(e=>Math.round(Math.hypot(e.p.x-o.x,e.p.z-o.z)))}}')
    print('avanzar:', r)
    chk(r['t'] == 'move' and sorted(r['d'])[len(r['d']) // 2] < 12, 'AVANZAR: la escuadra llega al punto al que apunta el jugador (22 m delante)')
    ev("()=>{MX.pl.sqd.members.forEach(e=>{if(e.bot){e.ammo=e.w.max;e.shots=0}});window.__sh=0;const f=MX.pl.sqd.members.filter(e=>e.bot);f.forEach(e=>{e.__a=e.ammo})}")
    # sin enemigos a 50 m: no hay orden; con un enemigo a 20 m delante: la escuadra lo bate (solo con línea de tiro)
    ev("()=>{const z=MX.zom.spawn('brute', P.pos.x+Math.sin(P.aim)*20, P.pos.z+Math.cos(P.aim)*20, {st:'dorm'}); z.hp=z.maxhp=100000; window.__foe=z}")
    ev("MX.SQ.cmd('cover',false)"); ord0 = ev('()=>MX.pl.sqd.order.type'); ev('()=>__run(60*6,__only(0))')
    r = ev('()=>{const s=MX.pl.sqd;return {t:s.order.type,shots:s.members.filter(e=>e.bot).reduce((a,e)=>a+Math.max(0,(e.__a-e.ammo+(e.reloadT>=0?e.w.max:0))),0)}}')
    print('cobertura:', r)
    chk(ord0 == 'cover', 'FUEGO DE COBERTURA: encuentra al enemigo más cercano (infectado a 20 m) y da la orden (disparo real: tests/estrategia.py / simulación del distrito)')
    ev("()=>{ if(window.__foe){ window.__foe.hp=1; MX.zom.hit(window.__foe,50,{x:0,z:0},0,0,null) } }")
    # mando: ceder y tomar; unirse; por libre
    r = ev('''()=>{MX.SQ.cmd('lead',true);const s=MX.pl.sqd,a=!s.playerLead&&s.leader&&s.leader.bot;MX.SQ.cmd('lead',true);const b2=s.playerLead&&s.leader===MX.pl;return {a,b:b2}}''')
    chk(r['a'], 'CEDER EL MANDO: lo toma el mejor de la escuadra')
    chk(r['b'], 'TOMAR EL MANDO: el jugador vuelve a liderar')
    r = ev('''()=>{const o=MX.SQ.list.find(q=>q.team===0&&q!==MX.pl.sqd&&q.leader);P.pos.set(o.leader.p.x+2,0,o.leader.p.z);const old=MX.pl.sqd;MX.SQ.cmd('join',true);
      const s=MX.pl.sqd;return {joined:s!==old&&s.team===0,lead:s.leader&&s.leader.bot,oldLead:old.leader&&old.leader.bot,n:s.members.length}}''')
    chk(r['joined'] and r['lead'], 'UNIRSE: el jugador entra en la escuadra amiga más cercana y sigue a su líder')
    chk(r['oldLead'], 'su antigua escuadra sigue con un líder bot')
    r = ev('''()=>{MX.SQ.cmd('leave',true);const s=MX.pl.sqd;return {n:s.members.length,lead:s.playerLead}}''')
    chk(r['n'] == 1 and r['lead'], 'POR LIBRE: el jugador forma su propia escuadra de 1')
    # fusión: una escuadra que se queda en 1 miembro se une a otra
    r = ev('''()=>{const s=MX.SQ.list.find(q=>q.team===0&&q.members.length===3&&!q.members.includes(MX.pl));if(!s)return {skip:true};const m=s.members[1],m2=s.members[2],left=s.members[0];const o=MX.SQ.list.find(q=>q.team===0&&q!==s&&!q.members.includes(MX.pl)&&q.leader);
      o.members.push(m,m2);s.members=s.members.filter(x=>x!==m&&x!==m2);m.sqd=o;m.sq=o.id;m2.sqd=o;m2.sq=o.id;for(let i=0;i<60*12;i++){__noZ();__only(0)();update(1/60)}return {merged:left&&left.sqd!==s,size:left&&left.sqd.members.length}}''')
    print('fusión:', r)
    chk(r.get('merged'), 'una escuadra que se queda con 1 miembro se une a otra de su facción')
    # supresión
    r = ev('''()=>{const e=MX.ents.find(q=>q.team===1);e.dead=false;e.respT=0;e.p.set(10,0,10);e.supp=0;spawnBullet(0,1,10.8,1,0,WP[1],null);for(let i=0;i<20;i++)updateBullets(1/60);return e.supp}''')
    chk(r > .1, 'SUPRESIÓN: una bala que pasa a menos de 1 m sube la supresión del enemigo (%.2f)' % r)
    # estabilidad y ritmo con las 4 facciones
    ev('()=>{for(const e of MX.ents)if(e.bot){e.respT=0}MX.pl.inv=1e9;MX.pl.hp=1e9}')
    t0 = time.time(); ev('()=>__run(60*40)'); ms = (time.time() - t0) / (60 * 40) * 1000
    r = ev('()=>({vivos:MX.ents.filter(e=>!e.dead).length,atasc:MX.ents.filter(e=>e.bot&&!e.dead&&e.stuckN>1).length,bajas:MX.M.score.reduce((a,b)=>a+b,0),sq:MX.SQ.list.length})')
    print('40 s con 100 combatientes: %.1f ms por actualización (headless)' % ms, r)
    chk(r['atasc'] < 8, 'sin atascos masivos (%d)' % r['atasc'])
    print('ERRORES JS:', errs or 'ninguno'); bad += len(errs)
sys.exit(1 if bad else 0)
