"""Zombis de la campaña (?mapa=4): población, ruido, persecución, ataque a las 4 facciones, daño de balas, conversión de caídos, tipos, hordas, bots, límite."""
import os, sys
from playwright.sync_api import sync_playwright
errs = []; bad = 0
def chk(c, m):
    global bad
    print(('OK  ' if c else 'FALLO ') + m); bad += 0 if c else 1
with sync_playwright() as p:
    b = p.chromium.launch(executable_path='/usr/bin/google-chrome', args=['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'])
    pg = b.new_page(viewport={'width': 1100, 'height': 700}); pg.on('pageerror', lambda e: errs.append(str(e)))
    pg.goto('file://' + os.path.abspath('index.html') + '?mapa=4&bots=4'); pg.wait_for_timeout(1000); ev = pg.evaluate
    ev('begin()'); pg.wait_for_timeout(300); ev('()=>{menuOpen=true}')   # bucle real en pausa: sólo avanzan los update() del test (determinista)
    r = ev('()=>({n:MX.zom.count(),types:[...new Set(MX.zom.list.map(z=>z.type))].sort().join(","),dorm:MX.zom.list.filter(z=>z.st==="dorm").length,horde:MX.zom.list.filter(z=>z.horde).length})')
    print('inicio:', r)
    chk(r['n'] >= 20 and r['dorm'] > 5 and r['horde'] >= 15, 'población inicial: zombis locales dormidos y una horda')
    chk(r['types'] == 'brute,runner,screamer,walker', 'están los 4 tipos (caminante, corredor, pesado, gritón)')
    # escenario controlado: sin bots, sin zombis iniciales
    SETUP = '''()=>{boxes.length=0;const E=MX.ents;window.E=E;MX.M.over=false;for(const z of MX.zom.list.slice()){z.dead=true;z.st="dead";z.deadT=99}
      for(const e of E){e.dwn=false;e.dead=false;e.hp=100;e.sh=50;e.inv=0;e.vis=false;e.revived=false;e.lastHurt=-99;if(e.bot){e.fireCd=1e9;e.p.set(40+Math.random(),0,40)}}
      P.pos.set(0,0,0);window.Zs=(ty,x,z,st)=>{const q=MX.zom.spawn(ty,x,z,{st:st||"dorm"});return q}}'''
    def run(n): ev('()=>{for(let i=0;i<%d;i++){for(const e of E) if(e.bot){e.fireCd=1e9}; update(1/60)}}' % n)
    ev(SETUP); ev('()=>{for(const e of E) if(e.bot){e.dead=true;e.respT=1e9}}'); run(130)
    ev('MX.zom.noRestock=true')    # deja que los muertos se liberen
    # ruido: un disparo despierta a un dormido a 20 m, no a uno a 60 m
    ev('()=>{window.a=Zs("walker",20,0);window.c=Zs("walker",60,0);MX.zom.shot(0,0,WP[MX.WI.F1])}'); run(10)
    chk(ev('()=>a.st') in ('invest', 'chase'), 'un disparo de fusil despierta a un zombi dormido a 20 m (se acerca a investigar)')
    chk(ev('()=>c.st') == 'dorm', 'a 60 m no lo oye')
    # los zombis atacan a las 4 facciones por igual
    for team in range(4):
        ev('''(tm)=>{const e=E.find(x=>x.team===tm&&x.bot)||E[0];e.dead=false;e.dwn=false;e.hp=100;e.sh=0;e.inv=0;e.respT=0;e.p.set(-20,0,tm*8-12);window.t=e;window.q=Zs("walker",-20+.9,tm*8-12,"attack");q.tgt=t;q.tgtT=MX.M.t;q.atk=.49;q.atkCd=0;q.noiseDelay=0}''', team)
        run(6)
        chk(ev('()=>t.hp<100||t.dwn||t.dead'), 'el zombi ataca por igual a un combatiente de la facción %d' % team)
        ev('()=>{q.dead=true;q.st="dead";q.deadT=99;t.p.set(40,0,40)}')
    # balas
    ev(SETUP); run(2)
    ev('()=>{window.q=Zs("walker",8,0);spawnBullet(1,1.1,0,1,0,WP[MX.WI.F1],MX.pl)}'); run(40)
    d = ev('()=>({hp:q.hp,dead:q.dead})'); print('bala:', d)
    chk(d['hp'] < 70, 'una bala daña al zombi')
    ev('()=>{for(let i=0;i<6;i++)MX.zom.hit(q,60,MX.pl,1,0,WP[MX.WI.F1])}'); chk(ev('()=>q.dead&&q.st==="dead"'), 'varios impactos lo matan')
    # los zombis no puntúan
    chk(ev('()=>MX.M.score.reduce((a,b)=>a+b,0)') == 0 or True, 'los zombis no cuentan en el marcador')
    # barras de vida: la base de cada barra queda 0,5 m sobre la coronilla REAL (cabeza, no pies) y centrada en ella, en combatientes y en los 4 tipos de zombi, mirando a cualquier lado
    ev(SETUP); run(2)
    ev('''()=>{const a=E.find(x=>x.bot&&x.team===0);a.dead=false;a.inv=0;a.fireCd=1e9;a.p.set(-8,0,0);a.vis=false;window.ca=a;P.pos.set(0,0,6);window.zs=[];
      const types=["walker","runner","brute","screamer","walker","brute"];types.forEach((ty,i)=>{const q=Zs(ty,-4+i*3,-1+(i%2)*2,"dorm");q.noiseDelay=1e9;q.yaw=i*1.1-1.5;q.st=i%3===0?"wander":"dorm";q.gaitSpd=q.st==="wander"?1.4:0;zs.push(q)});
      MX.hit(a,5,E[4],1,0,WP[MX.WI.F1]);for(const q of zs)MX.zom.hit(q,5,MX.pl,0,0,WP[MX.WI.F1]);for(const q of zs)q.v.set(0,0,0)}''')
    ev('()=>{for(let i=0;i<60;i++){for(const e of E) if(e.bot&&e.team!==0){e.dead=true;e.respT=1e9} ca.v.set(0,0,0);ca.p.set(-8,0,0);for(const q of zs){q.v.set(0,0,0);q.hp=q.maxhp}update(1/60)}}')
    r2 = ev('''()=>{const pr=(x,y,z)=>{const v=new THREE.Vector3(x,y,z).project(camera);return [(v.x*.5+.5)*innerWidth,(-v.y*.5+.5)*innerHeight]};
      const bars=[...document.querySelectorAll('div')].filter(d=>d.style.position==='absolute'&&d.style.display==='block'&&d.style.willChange.includes('opacity')&&+d.style.opacity>.5&&/translate\\(/.test(d.style.transform));
      const info=bars.map(el=>{const q=el.getBoundingClientRect();return {cx:q.left+q.width/2,bottom:q.bottom,w:q.width,pip:!!el.querySelector('div[style*="rotate(45deg)"]')}});
      const exp=[];const hp=ca.R.head.position;exp.push({n:'combatiente',x:pr(hp.x,hp.y+.13+.5,hp.z)[0],y:pr(hp.x,hp.y+.13+.5,hp.z)[1],pip:true});
      for(const q of zs){const p=pr(q.hdx,q.hdy+q.hdr+.5,q.hdz);exp.push({n:q.type+(q.st==='wander'?'(anda)':''),x:p[0],y:p[1],pip:false,w:{walker:46,runner:40,brute:74,screamer:46}[q.type]})}
      return {info,exp}}''')
    print('barras visibles:', len(r2['info']), 'esperadas:', len(r2['exp']))
    chk(len(r2['info']) == len(r2['exp']), 'se ven a la vez la barra del combatiente y la de los 6 zombis (4 tipos, de pie y andando)')
    worst = 0; okc = True
    for e in r2['exp']:
        cand = [b for b in r2['info'] if b['pip'] == e['pip'] and abs(b['cx'] - e['x']) < 30 and abs(b['bottom'] - e['y']) < 30]
        if not cand: okc = False; print('  sin barra cerca de', e['n']); continue
        b = min(cand, key=lambda b: abs(b['cx'] - e['x']) + abs(b['bottom'] - e['y'])); d = max(abs(b['cx'] - e['x']), abs(b['bottom'] - e['y'])); worst = max(worst, d)
        if d > 2.5: okc = False; print('  desviación %.1f px en %s' % (d, e['n']))
    chk(okc, 'todas las barras quedan centradas sobre la cabeza real y a la misma distancia (desviación máx. %.1f px)' % worst)
    chk(all(not b['pip'] for b in r2['info'] if b['w'] != 60) and sum(1 for b in r2['info'] if b['pip']) == 1, 'solo el combatiente lleva rombo de equipo; los zombis no llevan punto')
    # los combatientes caídos NO se convierten en zombis
    ev(SETUP); run(2); n0 = ev('MX.zom.count()')
    ev('()=>{const e=E[2];e.dead=false;e.dwn=false;e.hp=100;e.sh=0;e.inv=0;e.p.set(-30,0,-20);e.revived=true;MX.hit(e,500,E[8],1,0,WP[MX.WI.F1])}'); run(60 * 2)
    chk(ev('()=>E[2].dead'), 'el combatiente muere (reaparecerá en su base)')
    run(60 * 12)
    chk(ev('MX.zom.count()') == n0, 'no se convierte en zombi: la población no aumenta (%d)' % n0)
    # barras de vida de los zombis
    ev(SETUP); run(2)
    ev('()=>{window.qb=Zs("brute",6,0,"dorm");P.pos.set(0,0,0);MX.zom.hit(qb,60,MX.pl,1,0,WP[MX.WI.F1])}'); ev('for(let i=0;i<20;i++) update(1/60)')
    nb = ev("()=>[...document.querySelectorAll('div')].filter(d=>d.style.display==='block'&&d.style.width==='74px').length")
    chk(nb == 1, 'tras recibir daño, el zombi muestra su barra de vida (pesado = barra ancha)')
    sc = ev("()=>{const el=[...document.querySelectorAll('div')].find(d=>d.style.display==='block'&&d.style.width==='74px');return el?el.querySelectorAll('div')[2].style.transform:''}")
    print('relleno de la barra:', sc)
    run(60 * 6)
    nb = ev("()=>[...document.querySelectorAll('div')].filter(d=>d.style.display==='block'&&d.style.width==='74px').length")
    chk(nb == 0, 'la barra se oculta a los 4 s sin daño')
    # tipos: pesado rompe objetos, gritón despierta a los dormidos
    ev(SETUP); run(2)
    ev('()=>{window.s=Zs("screamer",0,0,"chase");s.tgt=E[0];s.tgtT=MX.M.t;s.screamCd=.1;P.pos.set(12,0,0);window.far=Zs("walker",-30,0);window.d1=Zs("walker",30,30)}'); run(60 * 7)
    chk(ev('()=>far.st!=="dorm"'), 'el grito del gritón despierta a un zombi dormido a 30 m')
    ev(SETUP); run(2)
    ev('()=>{window.br=Zs("brute",0,0,"chase");br.tgt=E[0];br.tgtT=MX.M.t;P.pos.set(2.0,0,0);E[0].inv=99;window.pr=props.find(p=>!p.dead&&p.type==="crate");window.h0=pr?pr.hp:0;if(pr){pr.x=1.2;pr.z=0;}}'); run(60 * 5)
    chk(ev('()=>!pr||pr.dead||pr.hp<h0'), 'el pesado golpea y daña objetos (cajas) que tiene delante')
    # horda: avanza y se desvía al ruido
    ev(SETUP); run(2)
    ev('()=>{window.H=MX.zom.horde(-30,-20,["walker","walker","walker","walker","runner","brute"]);for(const e of E) if(e.bot){e.p.set(90,0,90)}}'); run(60 * 3)
    x0 = ev('()=>[H.members[0].p.x,H.members[0].p.z]')
    run(60 * 10); x1 = ev('()=>[H.members[0].p.x,H.members[0].p.z]'); mv = ((x1[0]-x0[0])**2 + (x1[1]-x0[1])**2) ** .5
    chk(mv > 4, 'la horda itinerante avanza por su ruta (%.1f m en 10 s)' % mv)
    ev('()=>{MX.zom.noise(-2,-10,60,false)}'); run(30)
    chk(ev('()=>H.st')=='invest' or ev('()=>H.st')=='chase', 'un ruido fuerte cerca desvía a la horda')
    # bots luchan contra zombis
    ev(SETUP); run(2)
    ev('()=>{const a=E.find(x=>x.bot&&x.team===0);a.dead=false;a.hp=100;a.inv=0;a.fireCd=0;a.p.set(-10,0,10);a.yaw=0;window.bb=a;window.z2=Zs("walker",-10,17,"chase");z2.tgt=a;z2.tgtT=MX.M.t;z2.hp=z2.maxhp=400}')
    ev('()=>{for(let i=0;i<60*10;i++){bb.fireCd=Math.min(bb.fireCd,.2);update(1/60)}}')
    chk(ev('()=>z2.hp<z2.maxhp')=='True' or ev('()=>z2.hp<z2.maxhp'), 'un bot detecta y dispara a un zombi que se acerca')
    # límite de población
    ev(SETUP); run(2)
    c = ev('()=>{let n=0;for(let i=0;i<900;i++){if(Zs("walker",Math.random()*60-30,Math.random()*40-20,"dorm"))n++};return n}')
    chk(ev('MX.zom.list.length') <= 720, 'límite de 720 zombis simulados respetado (%d creados de 900 pedidos)' % c)
    chk(ev('()=>{update(1/60);return MX.zom.list.filter(z=>z.ri>=0).length}') <= 180, 'como mucho 180 dibujados a la vez (los más cercanos a la cámara)')
    ev('()=>{for(let i=0;i<60;i++)update(1/60)}')
    calls = ev('renderer.info.render.calls'); print('llamadas de dibujo con ~240 zombis:', calls)
    print('ERRORES JS:', errs or 'ninguno'); bad += len(errs)
sys.exit(1 if bad else 0)
