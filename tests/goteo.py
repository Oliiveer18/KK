"""F7 (goteo): cada punto mantenido deja una pila de material (tope 60) con su ritmo; se recoge con □ mantenido; se vacía al perder el punto; se ve sobre el punto."""
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
    ev('''()=>{menuOpen=true;MX.zom.noRestock=true;for(const z of MX.zom.list){z.dead=true;z.st='dead';z.deadT=99};MX.pl.inv=1e9;for(const e of MX.ents) if(e!==MX.pl){e.inv=1e9; e.p.set(-600,0,-600)}
      window.run=(s,held)=>{for(let i=0;i<60*s;i++){ MX.rev=!!held; for(const e of MX.ents) if(e!==MX.pl&&Math.hypot(e.p.x-P.pos.x,e.p.z-P.pos.z)<60){e.p.set(-600,0,-600)}; time+=1/60; update(1/60)}};
      MX.SQ.objs.forEach(o=>{o.owner=-1}); run(1) }''')
    # sin dueño: nada
    r = ev('()=>MX.SQ.objs.filter(o=>o.pile).map(o=>o.pile.n)'); chk(all(n == 0 for n in r), 'un punto sin dueño no deja material %s' % r)
    # Plaza (A) del equipo 0, fábrica B del 1, estación D del 2, puesto avanzado del 3
    ev('''()=>{ const g=c=>MX.SQ.objs.find(o=>o.code===c); g('A').owner=0; g('B').owner=1; g('D').owner=2; window.out=MX.SQ.objs.find(o=>/Puesto avanzado/.test(o.name)); out.owner=3; run(61) }''')
    r = ev('''()=>{ const g=c=>MX.SQ.objs.find(o=>o.code===c).pile; return {A:[g('A').madera,g('A').piedra,g('A').hierro], B:[g('B').madera,g('B').piedra,g('B').hierro], D:[g('D').madera,g('D').piedra,g('D').hierro], out:[out.pile.madera,out.pile.piedra,out.pile.hierro]} }''')
    print(r)
    chk(sum(r['A']) in range(5, 8) and all(v > 0 for v in r['A']), 'la Plaza da los tres materiales (~2/2/2 por minuto) %s' % r['A'])
    chk(r['B'][2] in range(5, 8) and r['B'][0] == 0 and r['B'][1] == 0, 'la Fábrica solo da hierro (~6 por minuto) %s' % r['B'])
    chk(r['D'][0] in range(5, 8) and r['D'][1] == 0 and r['D'][2] == 0, 'la Estación solo da madera (~6 por minuto) %s' % r['D'])
    chk(sum(r['out']) in range(5, 9) and all(v > 0 for v in r['out']), 'un puesto avanzado da una mezcla %s' % r['out'])
    # tope 60
    ev('()=>run(600)'); r = ev('()=>MX.SQ.objs.filter(o=>o.pile).map(o=>o.pile.n)'); chk(max(r) == 60 and all(n <= 60 for n in r), 'la pila no pasa de 60 %s' % r)
    # recoger con el cuadrado mantenido (solo el dueño)
    r = ev('''()=>{ const o=MX.SQ.objs.find(q=>q.code==='A'), q=o.pile; MX.pl.team=0; MX.pl.bag={pack1:1}; MX.pl.mat=null; MX.pl.p.set(q.pos.x+1.2,0,q.pos.z); P.pos.set(q.pos.x+1.2,0,q.pos.z); P.aim=-Math.PI/2; MX.pl.yaw=-Math.PI/2; run(.3,false);
      const n0=q.n; run(1.2,true); const a=MX.ECO.load(MX.pl); run(.6,true); return {n0, a, load:MX.ECO.load(MX.pl), left:q.n, lab:document.querySelector('#intRing span').textContent} }''')
    print(r)
    chk(r['load'] == 20 and r['left'] == r['n0'] - 20, 'mantener recoge hasta llenar la mochila (20) y la pila baja %s' % r)
    r = ev('''()=>{ const o=MX.SQ.objs.find(q=>q.code==='B'), q=o.pile; MX.pl.mat=null; MX.pl.p.set(q.pos.x+1.2,0,q.pos.z); P.pos.set(q.pos.x+1.2,0,q.pos.z); run(.3,false); const n0=q.n; run(3,true); return {n0, left:q.n, load:MX.ECO.load(MX.pl)} }''')
    chk(r['left'] == r['n0'] and r['load'] == 0, 'el equipo rival no recoge la pila ajena %s' % r)
    # se vacía al perder el punto
    r = ev('''()=>{ const o=MX.SQ.objs.find(q=>q.code==='A'); const n0=o.pile.n; o.owner=1; run(2); return {n0, n:o.pile.n, own:o.pile.own} }''')
    chk(r['n0'] > 0 and r['n'] == 0 and r['own'] == 1, 'la pila se vacía al cambiar de dueño %s' % r)
    # visible
    r = ev('''()=>{ const o=MX.SQ.objs.find(q=>q.code==='D'); const q=o.pile; MX.pl.p.set(q.pos.x+8,0,q.pos.z); P.pos.set(q.pos.x+8,0,q.pos.z); run(.5); let vis=0; scene.traverse(x=>{ if(x.isSprite&&x.visible&&Math.hypot(x.parent.position.x-q.pos.x,x.parent.position.z-q.pos.z)<.1) vis++ }); return vis }''')
    chk(r >= 1, 'la pila se ve sobre el punto con su cantidad (%d)' % r)
    chk(not errs, 'sin errores JS %s' % errs[:3])
    b.close()
print('FALLOS:', bad); raise SystemExit(1 if bad else 0)
