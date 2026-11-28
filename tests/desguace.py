"""F6: desguace visual y tala. El objeto NO desaparece (queda un resto más bajo y frágil), las piezas vuelan a la mochila por etapas, el material es el de la tabla ECO, no se
repite, la navegación es la misma; no se desguaza dentro de refugios ni junto a puntos; la tala quita el árbol y su colisión; los bots usan el mismo desguace con la herramienta en la mano."""
import os
from playwright.sync_api import sync_playwright
bad = 0
def chk(c, m):
    global bad
    print(('OK  ' if c else 'FALLO ') + m); bad += 0 if c else 1
with sync_playwright() as p:
    b = p.chromium.launch(executable_path='/usr/bin/google-chrome', args=['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'])
    pg = b.new_page(viewport={'width': 844, 'height': 390}); errs = []; pg.on('pageerror', lambda e: errs.append(str(e))); ev = pg.evaluate
    pg.goto('file://' + os.path.abspath('index.html') + '?mapa=6'); pg.wait_for_timeout(1000); ev('begin()'); pg.wait_for_timeout(300)
    ev('''()=>{menuOpen=true;MX.zom.noRestock=true;for(const z of MX.zom.list){z.dead=true;z.st='dead';z.deadT=99};MX.pl.inv=1e9;window.run=(s,held)=>{for(let i=0;i<60*s;i++){ MX.rev=!!held; for(const e of MX.ents) if(e!==MX.pl&&Math.hypot(e.p.x-P.pos.x,e.p.z-P.pos.z)<60){e.p.set(-600,0,-600)}; time+=1/60; update(1/60)}};
      MX.pl.bag={pack1:1}; MX.pl.mat=null; }''')
    # ---- coche ----
    r = ev('''()=>{ const car=props.find(p=>p.type==='car'&&MX.DESG.ok(p)&&Math.hypot(p.x,p.z)<300&&Math.abs(p.x)<340&&Math.abs(p.z)<340&&!props.some(q=>q!==p&&!q.dead&&Math.hypot(q.x-p.x,q.z-p.z)<9)); if(!car) return null; window.car=car;
      const x=car.x+car.hx+1.1, z=car.z; MX.pl.p.set(x,0,z); P.pos.set(x,0,z); P.aim=-Math.PI/2; MX.pl.yaw=-Math.PI/2; run(.2,false); return {x:car.x,z:car.z,uid:car.uid} }''')
    chk(r is not None, 'hay un coche desguazable cerca del jugador %s' % r)
    ev('()=>run(.6,true)'); r = ev('()=>({tool:MX.INT.state.tool, busy:MX.INT.state.busy, g:cur.g.visible, prog:MX.INT.state.prog, lab:document.querySelector("#intRing span").textContent})')
    chk(r['busy'] and r['tool'] == 'palanca' and not r['g'], 'mientras se desguaza: herramienta (palanca) en la mano y arma guardada (%s)' % r)
    ev('()=>run(9,true)')
    r = ev('''()=>{ const c=window.car, rec=c.rec; return {dead:c.dead, inProps:props.includes(c), inBoxes:boxes.includes(c.box), done:rec&&rec.done, k:rec&&rec.k, carga:MX.pl.mat&&MX.pl.mat.hierro, sy:c.g.scale.y, hp:c.hp, maxHp:c.maxHp, gone:c.pieces.filter(q=>q.gone).length, total:c.pieces.length, onScene:!!c.g.parent, stripped:c.stripped} }''')
    print(r)
    chk(not r['dead'] and r['inProps'] and r['onScene'], 'el coche NO desaparece (queda en el mapa)')
    chk(r['done'] and r['k'] == 3 and r['stripped'], 'se completan las 3 etapas')
    chk(r['carga'] == 12, 'la mochila recibe 12 de hierro (%s)' % r['carga'])
    chk(r['gone'] >= 8 and r['gone'] < r['total'], 'se despegan piezas reales pero quedan otras (%d de %d)' % (r['gone'], r['total']))
    chk(r['sy'] < 1 and r['maxHp'] < 320 * .5, 'queda un resto más bajo y frágil (escala %.2f, vida máx. %d)' % (r['sy'], r['maxHp']))
    chk(r['inBoxes'], 'la caja de colisión (y la navegación) no cambia')
    ev('()=>run(1,true)'); r = ev('()=>({busy:MX.INT.state.busy, ctx:MX.INT.state.ctx, carga:MX.pl.mat.hierro})')
    chk(not r['busy'] and r['carga'] == 12, 'un resto desguazado no se puede reciclar otra vez %s' % r)
    r = ev('()=>({fly:document.querySelectorAll("canvas").length>0})')
    # ---- exclusiones ----
    r = ev('''()=>{ const rr=MAPA.built.info.refugeRects[0]; const q=props.filter(p=>p.type==='crate'&&Math.abs(p.x-rr.x)<rr.hx&&Math.abs(p.z-rr.z)<rr.hz); const o=MX.SQ.objs[0]; const q2=props.filter(p=>ECO_Y(p)&&Math.hypot(p.x-o.x,p.z-o.z)<o.r+4);
      return {enRefugio:q.length, ok1:q.filter(p=>MX.DESG.ok(p)).length, junto:q2.length, ok2:q2.filter(p=>MX.DESG.ok(p)).length} }'''.replace('ECO_Y(p)','MX.ECO.yield[p.type]'))
    chk(r['ok1'] == 0 and r['ok2'] == 0, 'no se desguaza dentro del refugio ni junto a un punto de captura (%s)' % r)
    # ---- tala ----
    r = ev('''()=>{ const t=MAPA.built.walls.find(w=>w.tree&&w.ti&&Math.abs(w.x)<330&&Math.abs(w.z)<330&&Math.hypot(w.x,w.z)>60&&!MAPA.built.walls.some(q=>q!==w&&q.tree&&Math.hypot(q.x-w.x,q.z-w.z)<4)&&!props.some(q=>Math.hypot(q.x-w.x,q.z-w.z)<5)); if(!t) return null; window.tree=t; const x=t.x+1.3, z=t.z; MX.pl.p.set(x,0,z); P.pos.set(x,0,z); P.aim=-Math.PI/2; MX.pl.yaw=-Math.PI/2; MX.pl.mat={madera:0,piedra:0,hierro:0}; run(.2,false); window.cellOf=()=>{const ix=Math.floor((t.x-MX.NV.ox)/MX.NV.cs), iz=Math.floor((t.z-MX.NV.oz)/MX.NV.cs); return MX.NV.bl[iz*MX.NV.w+ix]}; window.blBefore=window.cellOf();
      return {x:t.x,z:t.z,n:Math.max(3,Math.round(5.5*t.ti.k))} }''')
    chk(r is not None, 'hay un árbol talable %s' % r)
    ev('()=>run(1,true)'); r = ev('()=>({tool:MX.INT.state.tool})'); chk(r['tool'] == 'hacha', 'talar usa el hacha (%s)' % r)
    ev('()=>run(5,true)'); r = ev('''()=>({felled:window.tree.felled, boxes:boxes.includes(window.tree), madera:MX.pl.mat.madera, walls:MAPA.built.walls.includes(window.tree), inst:window.tree.ti.tr.instanceMatrix.array.slice(window.tree.ti.i*16,window.tree.ti.i*16+3).join(',')})''')
    print(r)
    chk(r['felled'] and not r['boxes'] and not r['walls'], 'el árbol cae y su colisión desaparece')
    chk(r['madera'] >= 3 and r['madera'] <= 10, 'madera moderada (%s)' % r['madera'])
    chk(r['inst'] == '0,0,0', 'la instancia del árbol se oculta (sin perder el lote)')
    ev('()=>run(4,false)'); r = ev('()=>({logs:document.title.length>0, nav:window.cellOf(), before:window.blBefore})')
    chk(r['before'] == 1 and r['nav'] == 0, 'la celda del árbol pasa de bloqueada a transitable en la navegación %s' % r)
    # ---- bots ----
    r = ev('''()=>{ const e=MX.ents.find(q=>q!==MX.pl&&q.team===MX.pl.team&&!q.dead); const car=props.find(p=>p.type==='crate'&&MX.DESG.ok(p)&&Math.abs(p.x)<300&&Math.abs(p.z)<300); MX.pl.p.set(car.x+6,0,car.z); P.pos.set(car.x+6,0,car.z); window.bot=e; window.crate=car; e.bag={pack1:1}; e.mat=null; e.inv=1e9; e.p.set(car.x+1.2,0,car.z); e.v.set(0,0,0);
      let fin=false, saw=false; for(let i=0;i<60*12&&!fin;i++){ e.p.set(car.x+1.2,0,car.z); fin=MX.DESG.botWork(e,car,1/60); time+=1/60; update(1/60); if(e.toolG&&e.toolG.visible) saw=true; }
      return {fin, saw, madera:e.mat&&e.mat.madera, done:car.rec.done, gun:e.gun.visible} }''')
    print(r)
    chk(r['fin'] and r['done'] and r['madera'] == 5, 'un bot desguaza una caja con el mismo sistema (+5 madera) %s' % r)
    chk(r['saw'], 'el bot trabaja con la herramienta en la mano')
    ev('()=>{ window.bot.work=null; for(let i=0;i<30;i++){ time+=1/60; update(1/60) } }'); r = ev('()=>({tg:!!window.bot.toolG&&window.bot.toolG.visible, gun:window.bot.gun.visible})')
    chk(not r['tg'] and r['gun'], 'al terminar el bot recupera el arma (%s)' % r)
    chk(not errs, 'sin errores JS %s' % errs[:3])
    b.close()
print('FALLOS:', bad); raise SystemExit(1 if bad else 0)
