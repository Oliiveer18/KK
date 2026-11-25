"""Distrito M1 (?mapa=5): generador del mapa por datos, suelos y calles, edificios con techo que se oculta, navegación y bots."""
import os, sys, time
from playwright.sync_api import sync_playwright
errs = []; bad = 0
def chk(c, m):
    global bad
    print(('OK  ' if c else 'FALLO ') + m); bad += 0 if c else 1
with sync_playwright() as p:
    b = p.chromium.launch(executable_path='/usr/bin/google-chrome', args=['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'])
    pg = b.new_page(viewport={'width': 1100, 'height': 700}); pg.on('pageerror', lambda e: errs.append(str(e)))
    pg.goto('file://' + os.path.abspath('index.html') + '?mapa=5&bots=8'); pg.wait_for_timeout(1500); ev = pg.evaluate
    ev('begin()'); pg.wait_for_timeout(500); ev('MX.zom.noRestock=true;MX.pl.hp=1e9;MX.pl.inv=99')
    r = ev('()=>({built:!!MAPA.built,half:MAPA.built.half,walls:MAPA.built.walls.length,builds:OBJ.buildings.length,rails:MAPA.built.rails.length,nav:MX.NV.w,world:WORLD.x,ents:MX.ents.length,grid:grid.visible})')
    print(r)
    chk(r['built'] and r['half'] == 125 and r['nav'] >= 258 and r['world'] > 120, 'el distrito de 250 × 250 m se genera y el mundo y la navegación se ajustan a su tamaño')
    chk(r['builds'] == 3 and r['rails'] == 1 and r['walls'] >= 20, 'tiene 3 tiendas (supermercado, farmacia, minimarket), una vía y 4 refugios con muros')
    chk(not r['grid'], 'la cuadrícula de la arena no se dibuja en el distrito')
    # spawns libres y rutas
    s = ev('''()=>{const out=[];for(let t=0;t<4;t++){const sp=M_().spawn[t];out.push(sp.length)}return out}'''.replace('M_()','MX.M')) 
    print('puntos de aparición por facción:', s)
    chk(all(n >= 4 for n in s), 'cada facción tiene puntos de aparición en su refugio')
    d = ev('''()=>{const res=[];const hot=MX.HOT;for(let t=0;t<4;t++){const sp=MX.M.spawn[t][0];let ok=0;for(const h of hot){if(MX.findPath(sp.x,sp.z,h[0],h[1]))ok++}res.push(ok+"/"+hot.length)}return res}''')
    print('rutas desde cada refugio hacia los puntos de interés:', d)
    chk(all(x.split('/')[0] == x.split('/')[1] for x in d), 'desde cada refugio hay ruta (A*) a todos los puntos de interés del distrito')
    # techo del supermercado: se oculta al entrar
    ev('()=>{const b=OBJ.buildings.find(x=>x.kind==="super");window.bs=b;P.pos.set(b.x,0,b.z)}')
    ev('()=>{for(let i=0;i<40;i++)update(1/60)}')
    ins = ev('()=>({inside:OBJ.insideBuilding(P.pos.x,P.pos.z)?true:false,roofVis:bs.roof.visible,cut:+bs.cut.toFixed(2)})'); print('dentro del supermercado:', ins)
    chk(ins['inside'] and (not ins['roofVis'] or ins['cut'] > .9), 'al entrar al supermercado el techo se oculta')
    ev('()=>{P.pos.set(0,0,0);for(let i=0;i<40;i++)update(1/60)}')
    ins2 = ev('()=>({roofVis:bs.roof.visible,cut:+bs.cut.toFixed(2)})'); chk(ins2['roofVis'] and ins2['cut'] < .1, 'al salir vuelve el techo (cut=%s)' % ins2['cut'])
    calls = ev('renderer.info.render.calls'); print('llamadas de dibujo (jugador en el cruce central):', calls); chk(calls < 450, 'pocas llamadas de dibujo con el distrito entero cargado (%d)' % calls)
    # los bots se mueven por el distrito sin atascarse
    ev('()=>{for(const e of MX.ents)if(e.team!==0)e.fireCd=1e9;for(const z of MX.zom.list){z.dead=true;z.st="dead";z.deadT=99}}')
    x0 = ev('()=>MX.ents.filter(e=>e.bot).map(e=>[e.p.x,e.p.z])')
    t0 = time.time(); ev('()=>{for(let i=0;i<60*40;i++){for(const z of MX.zom.list){z.dead=true;z.st="dead";z.deadT=99}update(1/60)}}'); ms = (time.time() - t0) / (60 * 40) * 1000
    x1 = ev('()=>MX.ents.filter(e=>e.bot).map(e=>[e.p.x,e.p.z])'); mv = sorted(((a[0]-c[0])**2+(a[1]-c[1])**2)**.5 for a, c in zip(x0, x1))
    print('desplazamiento mediano de los bots en 40 s: %.0f m · %.2f ms por actualización' % (mv[len(mv)//2], ms), '| atascados', ev('MX.ents.filter(e=>e.bot&&!e.dead&&e.stuckN>1).length'))
    chk(mv[len(mv)//2] > 20, 'los bots recorren el distrito (mediana %.0f m en 40 s)' % mv[len(mv)//2])
    print('ERRORES JS:', errs or 'ninguno'); bad += len(errs)
sys.exit(1 if bad else 0)
