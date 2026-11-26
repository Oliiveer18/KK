"""Refugio compacto del distrito (?mapa=6): muro bajo de troncos en todo el perímetro (21 tramos), portón alto de dos hojas y tabique con puerta interior,
igual en las 4 facciones; todo registrado como obras de su facción. El muro bajo cubre al que está pegado a él y agachado, que dispara por encima;
las balas del atacante desde fuera chocan con el muro. Se mejora de troncos a piedra con las obras. La escuadra que defiende ocupa los puestos junto al muro."""
import os, sys
from playwright.sync_api import sync_playwright
bad = 0
def chk(c, m):
    global bad
    print(('OK  ' if c else 'FALLO ') + m); bad += 0 if c else 1
with sync_playwright() as p:
    b = p.chromium.launch(executable_path='/usr/bin/google-chrome', args=['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'])
    pg = b.new_page(viewport={'width': 900, 'height': 500}); errs = []; pg.on('pageerror', lambda e: errs.append(str(e))); ev = pg.evaluate
    pg.goto('file://' + os.path.abspath('index.html') + '?mapa=6'); pg.wait_for_timeout(1000); ev('begin()'); pg.wait_for_timeout(300); ev('()=>{menuOpen=true;MX.zom.noRestock=true;MX.pl.inv=1e9;MX.pl.hp=1e9}')
    r = ev('''()=>{const R=MAPA.built.info.refugeRects,c=R.map(q=>{const n={};for(const p of props){if(p.dead)continue;if(Math.abs(p.x-q.x)<=q.hx&&Math.abs(p.z-q.z)<=q.hz)n[p.type]=(n[p.type]||0)+1}return n});
      const per=R.map(q=>4*(q.hx+q.hz-1.2));return {c,per,sites:OBRAS.sites.length,fac:R.map(q=>OBRAS.sites.filter(s=>s.prop.faction===q.fac).length)}}''')
    print(r)
    chk(all(x.get('wallLow1') == 21 and x.get('gate1') == 2 and x.get('gateInner') == 1 and x.get('wall1') == 6 for x in r['c']), 'cada refugio: 21 tramos de muro bajo, portón de 2 hojas y tabique con puerta interior')
    chk(max(r['per']) < 90, 'perímetro compacto (%.0f m)' % max(r['per']))
    chk(r['fac'] == [30, 30, 30, 30], 'cada refugio tiene sus 30 obras (muro, portón, tabique y puerta) de su facción')
    # parapeto de 1,2 m: agachado cubre y oculta pero no deja disparar; de pie se dispara por encima, expuesto de hombros arriba
    r = ev('''()=>{const w=props.find(p=>p.type==='wallLow1'&&p.faction===0&&p.z>-421&&p.x<-450);window.WL=w;
      P.pos.set(w.x,0,w.z-.95);for(let i=0;i<5;i++)updateProps(1/60);const cov=P.cover===w;
      const shot=(x0,z0,dz,st)=>{BUL.forEach(q=>{q.on=false});w.hp=w.maxHp;P.crouch=st?0:1;spawnBullet(x0,st?1.12:.86,z0,0,dz,WP[1],null);for(let f=0;f<40;f++)updateBullets(1/60);return w.hp<w.maxHp};
      const crouchHit=shot(w.x,w.z-.6,1,false),standHit=shot(w.x,w.z-.6,1,true);
      /* desde fuera: un atacante (bala sin dueño cubierto) dispara hacia el defensor agachado y hacia el defensor de pie */
      P.cover=null;let pc=0,ps=0;const N=40;for(let k=0;k<N;k++){P.crouch=1;if(!shotOut())pc++;P.crouch=0;if(!shotOut())ps++}
      function shotOut(){BUL.forEach(q=>{q.on=false});w.hp=w.maxHp;const save=P.cover;spawnBullet(w.x,1.12,w.z+14,0,-1,WP[1],{crouch:0,cover:null,team:1,p:{x:w.x,z:w.z+14}});P.cover=save;for(let f=0;f<40;f++)updateBullets(1/60);return w.hp<w.maxHp}
      return {cov,h:w.h,crouchHit,standHit,passCrouch:pc/N,passStand:ps/N}}''')
    print(r)
    chk(r['cov'] and abs(r['h'] - 1.2) < .01, 'pegado al parapeto por dentro, es cobertura (altura %.2f m)' % r['h'])
    chk(r['crouchHit'] and not r['standHit'], 'agachado, la bala del defensor da en el muro; de pie, pasa por encima')
    chk(r['passCrouch'] == 0, 'al defensor agachado no le llega ninguna bala desde fuera: todas dan en el muro')
    chk(.25 <= r['passStand'] <= .75, 'al defensor de pie le llega la mitad (expuesto de hombros arriba): %.0f %% pasa' % (r['passStand'] * 100))
    r = ev('''()=>{const e=MX.ents.find(q=>q.bot&&q.team===1);e.dead=false;e.dwn=false;e.p.set(WL.x,0,WL.z+9);e.yaw=Math.PI;const pl=MX.pl;P.pos.set(WL.x,0,WL.z-.95);
      for(let i=0;i<5;i++)updateProps(1/60);P.crouch=1;const hid=MX.hiddenBehind(pl,e.p.x,e.p.z);P.crouch=0;const vis=!MX.hiddenBehind(pl,e.p.x,e.p.z);return {hid,vis}}''')
    chk(r['hid'] and r['vis'], 'desde fuera no se ve al que está agachado tras el parapeto; al que está de pie, sí')
    # mejora con las obras: troncos → piedra (el jugador elige «Mejorar» en el primer tramo a su alcance; la obra dura 8 s y cuesta 2 materiales)
    r = ev('''()=>{const pl=MX.pl;pl.bag.material=10;P.pos.set(WL.x,0,WL.z-1.2);let begun=false;
      OBRAS.controls(pl,()=>{},(t,f)=>{if(/Mejorar/.test(t)&&!begun){begun=true;f()}},()=>{});const s=OBRAS.sites.find(q=>q.worker===pl);if(!s)return {begun,started:false};
      for(let i=0;i<60*9;i++){P.pos.set(WL.x,0,WL.z-1.2);OBRAS.tick(1/60)}return {begun,started:true,type:s.prop.type,level:s.level,mat:pl.bag.material,fac:s.prop.faction}}''')
    print(r)
    chk(r.get('started') and r['type'] == 'wallLow2' and r['level'] == 2 and r['mat'] == 8 and r['fac'] == 0, 'el muro bajo se mejora de troncos a piedra con las obras (2 materiales, sigue siendo azul)')
    r = ev('()=>MAPA.built.info.defense.map(d=>d.pts.filter(q=>!MX.navAt(q[0],q[1])).length)')
    chk(r == [0, 0, 0, 0], 'todos los puestos de defensa son accesibles (libres en la malla de navegación) %s' % r)
    # la escuadra que defiende ocupa los puestos junto al muro
    r = ev('''()=>{const s=MX.SQ.list.find(q=>q.team===1&&q.mission.type==='defend');for(let i=0;i<60*25;i++){for(const z of MX.zom.list){z.dead=true;z.st='dead';z.deadT=99}update(1/60)}
      const dp=MAPA.built.info.defense.find(d=>d.team===1).pts,m=s.members.filter(e=>!e.dead&&!e.dwn);
      return {n:m.length,near:m.filter(e=>dp.some(q=>Math.hypot(q[0]-e.p.x,q[1]-e.p.z)<1.6)).length,crouch:m.filter(e=>e.crouch>.5).length}}''')
    print(r)
    chk(r['near'] >= max(1, r['n'] - 1), 'la escuadra que defiende ocupa los puestos junto al muro (%d de %d)' % (r['near'], r['n']))
    chk(r['crouch'] <= 1, 'y espera de pie tras el muro, lista para disparar por encima (%d agachados)' % r['crouch'])
    chk(not errs, 'sin errores JS ' + str(errs[:2]))
sys.exit(1 if bad else 0)
