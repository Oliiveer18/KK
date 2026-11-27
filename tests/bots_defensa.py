"""Bots profesionales (campaña, ?mapa=6):
1. Defensa viva: una escuadra que guarda un punto de dominio se reparte DENTRO de la zona, cada uno vigilando un sector distinto, y nunca está quieta
   como una estatua: barre su sector con la mirada, da pasos cortos, se recoloca junto a su puesto, cambia de postura; sin salir de la zona.
2. Reacción humana: al ver a alguien nuevo tardan un instante en disparar (más si les pilla de espaldas) y los primeros disparos fallan más.
3. Emboscada a campo abierto contra un grupo de 5 (a la distancia de la pantalla: los bots ven lo mismo que el jugador): combate realista (se cae rápido), pero hay tiempo para reaccionar (no muerte instantánea)."""
import os, sys, math
from playwright.sync_api import sync_playwright
bad = 0
def chk(c, m):
    global bad
    print(('OK  ' if c else 'FALLO ') + m); bad += 0 if c else 1
with sync_playwright() as p:
    b = p.chromium.launch(executable_path='/usr/bin/google-chrome', args=['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'])
    pg = b.new_page(viewport={'width': 900, 'height': 500}); errs = []; pg.on('pageerror', lambda e: errs.append(str(e))); ev = pg.evaluate
    pg.goto('file://' + os.path.abspath('index.html') + '?mapa=6'); pg.wait_for_timeout(1000); ev('begin()'); pg.wait_for_timeout(300)
    ev('''()=>{menuOpen=true;MX.zom.noRestock=true;window.kz=()=>{for(const z of MX.zom.list){z.dead=true;z.st='dead';z.deadT=99}};kz();MX.pl.inv=1e9;MX.pl.hp=1e9;P.pos.set(470,0,470);MX.pl.p.set(470,0,470)}''')
    # 1. defensa viva en un punto de dominio (sin enemigos cerca)
    r = ev('''()=>{const S=MX.SQ,o=S.objs.find(q=>q.code==='B');const s=S.list.find(q=>q.team===1&&!q.members.includes(MX.pl)&&q.members.length>=4);
      for(const e of MX.ents)if(e.team!==1){e.p.set(480,0,480);e.inv=1e9}
      s.playerLead=false;s.mission={type:'hold',x:o.x,z:o.z,name:o.name};s.missionT=MX.M.t;s.baseType='hold';
      s.members.forEach((e,i)=>{e.dead=false;e.dwn=false;e.hp=100;e.inv=1e9;e.p.set(o.x+(i-2)*2,0,o.z+3);e.st='push';e.goal=null;e.path=null;e.holdT=0});
      const park=()=>{kz();for(const e of MX.ents)if(e.team!==1){e.p.set(480,0,480)}};
      for(let i=0;i<60*70;i++){park();update(1/60)}                                     /* llegan a sus puestos */
      const m=s.members.filter(e=>!e.dead&&!e.isPlayer),T={};m.forEach(e=>T[e.id]={y:[],x:[],z:[],c:[],x0:e.p.x,z0:e.p.z});
      for(let i=0;i<60*40;i++){park();update(1/60);if(i%6===0)for(const e of m){const t=T[e.id];t.y.push(e.yaw);t.x.push(e.p.x);t.z.push(e.p.z);t.c.push(e.crouch>.5?1:0)}}
      const res=m.map(e=>{const t=T[e.id];let turn=0;for(let k=1;k<t.y.length;k++){let d=t.y[k]-t.y[k-1];d=Math.atan2(Math.sin(d),Math.cos(d));turn+=Math.abs(d)}
        let path=0,maxOff=0;for(let k=1;k<t.x.length;k++)path+=Math.hypot(t.x[k]-t.x[k-1],t.z[k]-t.z[k-1]);for(let k=0;k<t.x.length;k++)maxOff=Math.max(maxOff,Math.hypot(t.x[k]-t.x0,t.z[k]-t.z0));
        let sw=0;for(let k=1;k<t.c.length;k++)if(t.c[k]!==t.c[k-1])sw++;
        const mD=Math.max(...t.x.map((x,k)=>Math.hypot(x-o.x,t.z[k]-o.z))); const inZone=t.x.every((x,k)=>Math.hypot(x-o.x,t.z[k]-o.z)<o.r+4);return {mD:+mD.toFixed(1),r:o.r,cls:(MX.classOf&&MX.classOf(e)||{}).name,turn:+turn.toFixed(1),path:+path.toFixed(1),maxOff:+maxOff.toFixed(1),sw,inZone,face:e.sqFace}});
      const faces=m.map(e=>e.sqFace).filter(f=>f!==undefined);let spread=0;for(let i=0;i<faces.length;i++)for(let j=i+1;j<faces.length;j++){const d=Math.abs(Math.atan2(Math.sin(faces[i]-faces[j]),Math.cos(faces[i]-faces[j])));spread=Math.max(spread,d)}
      return {n:m.length,res,spread:+spread.toFixed(2),owner:o.owner}}''')
    print(r)
    R = r['res']
    chk(all(q['inZone'] or q['cls'] in ('Apoyo', 'Francotirador') for q in R), 'todos dentro de la zona del punto durante 40 s (salvo apoyo y francotirador: defensa en capas, vigilan desde fuera)')
    chk(r['spread'] > 2.0, 'cada uno vigila un sector distinto (máxima separación entre direcciones %.1f rad)' % r['spread'])
    chk(all(q['turn'] > 3 for q in R), 'barren su sector con la mirada (giro acumulado %s rad)' % [q['turn'] for q in R])
    chk(all(q['path'] > .3 for q in R) and all(q['maxOff'] < 3.5 for q in R), 'no son estatuas: pasos cortos y recolocaciones (%s m) sin alejarse de su puesto' % [q['path'] for q in R])
    chk(sum(1 for q in R if q['sw'] >= 2) >= len(R) - 1, 'cambian de postura (agacharse / asomarse) %s' % [q['sw'] for q in R])
    chk(r['owner'] == 1, 'y el punto acaba siendo suyo')
    # 2. reacción: un bot ve aparecer a un enemigo de frente y de espaldas
    r = ev('''()=>{const res={};for(const back of [false,true]){const e=MX.ents.filter(q=>q.bot&&q.team===2&&!q.w.launch&&q.w.pellets===1)[back?1:0],f=MX.ents.filter(q=>q.bot&&q.team===3)[back?1:0];
      for(const q of MX.ents)if(q!==e&&q!==f){q.p.set(490,0,490)}
      e.dead=false;e.dwn=false;e.hp=1e9;e.inv=0;e.reloadT=-1;e.ammo=e.w.max;e.tgt=null;e.vis=false;e.reactT=0;e.engT=0;e.st='push';e.goal=null;const D=Math.min(14,MX.SIGHT.hd*.75);e.p.set(0,0,-280-D);e.yaw=back?Math.PI:0;e.body=e.yaw;
      f.dead=false;f.dwn=false;f.hp=1e9;f.inv=0;f.p.set(0,0,-280);f.st='push';f.fireCd=1e9;
      BUL.forEach(b=>{b.on=false});if(e.sqd)e.sqd.contact=null;let t=0,shot=-1,seen=-1;
      for(let i=0;i<60*4&&shot<0;i++){kz();f.p.set(0,0,-280);f.v.set(0,0,0);update(1/60);t+=1/60;if(seen<0&&e.vis){seen=t;window.__pre=new Set(BUL.filter(b=>b.on))}if(seen>=0&&BUL.some(b=>b.on&&b.own===e&&!__pre.has(b)))shot=t-seen}
      res[back?'espaldas':'frente']=+shot.toFixed(2)}return res}''')
    print(r)
    chk(.45 <= r['frente'] <= 1.4, 'de frente tarda un instante humano en disparar (%.2f s)' % r['frente'])
    chk(r['espaldas'] > r['frente'] + .1, 'si le pillan de espaldas tarda más (%.2f s)' % r['espaldas'])
    # 3. emboscada: el jugador a campo abierto a 22 m de un grupo de 5 que lo ve de golpe
    sp = ev('''()=>{const W=Math.min(10,MX.SIGHT.hw*.8);for(let x=-420;x<=420;x+=14)for(let z=-420;z<=420;z+=14){const ok=[[0,0]].concat([0,1,2,3,4].map(i=>[-W,-4+i*2]));
      if(!ok.every(([dx,dz])=>MX.navAt(x+dx,z+dz)&&boxesIn(x+dx-2.5,z+dz-2.5,x+dx+2.5,z+dz+2.5).length===0))continue;if(!ok.slice(1).every(([dx,dz])=>MX.segClear(x+dx,z+dz,x,z,null,null,false)))continue;return [x,z,W]}return null}''')
    print('campo abierto para la emboscada', sp)
    r = ev('''([X,Z,W])=>{const T=[];for(let k=0;k<4;k++){const pl=MX.pl,G=MX.ents.filter(q=>q.bot&&q.team===1&&!q.w.launch).slice(0,5);
      for(const q of MX.ents)if(!G.includes(q)&&q!==pl){q.p.set(490,0,490);q.inv=1e9}
      G.forEach((e,i)=>{e.dead=false;e.dwn=false;e.hp=1e9;e.inv=0;e.reloadT=-1;e.ammo=e.w.max;e.tgt=null;e.vis=false;e.reactT=0;e.engT=0;e.st='push';e.goal=null;e.holdT=1e9;e.p.set(X-W,0,Z-4+i*2);e.yaw=Math.PI/2;e.body=e.yaw;e.gCd=0});
      BUL.forEach(b=>{b.on=false});for(const g of grens){g.on=false;g.m.visible=false}clouds.length=0;FIRES.length=0;for(const e of G)if(e.sqd)e.sqd.contact=null;pl.dead=false;pl.dwn=false;pl.inv=0;pl.hp=100;pl.sh=0;MX.pl.kits=0;P.pos.set(X,0,Z);pl.p.set(X,0,Z);let t=0;
      for(let i=0;i<60*6;i++){kz();P.pos.set(X,0,Z);update(1/60);t+=1/60;if(pl.dead||pl.dwn||pl.hp<=0)break}T.push(+t.toFixed(2));pl.hp=1e9;pl.inv=1e9;pl.dwn=false;pl.dead=false}return T}''', sp)
    print('emboscada: segundos hasta caer', r, 'vista', ev('[MX.SIGHT.hw,MX.SIGHT.hd]'))
    avg = sum(r) / len(r)
    chk(1.0 <= avg <= 3.5, 'emboscada por 5 a campo abierto: combate realista, se cae rápido pero no al instante (media %.2f s)' % avg)
    chk(not errs, 'sin errores JS ' + str(errs[:2]))
sys.exit(1 if bad else 0)
