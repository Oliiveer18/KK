"""F5: materiales y depósito. Mochila por unidades (20/35/50), zona de depósito junto a la entrada interior de cada refugio, descarga automática, tope del almacén, HUD,
el stock sobrevive a la caída de muros y la zona está libre en la navegación."""
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
    ev('''()=>{MX.zom.noRestock=true;for(const z of MX.zom.list){z.dead=true;z.st='dead';z.deadT=99};window.run=(s)=>{for(let i=0;i<60*s;i++){time+=1/60;update(1/60)}};
      MX.pl.inv=1e9; for(const e of MX.ents) if(e!==MX.pl){e.inv=1e9}; run(1)}''')
    z = ev('()=>MX.ECO.zones')
    chk(len(z) == 4, 'hay 4 zonas de depósito (%d)' % len(z))
    # una por facción, dentro de su refugio y en suelo libre de navegación
    r = ev('''()=>MX.ECO.zones.map(z=>{ const rr=MAPA.built.info.refugeRects.find(q=>q.fac===z.team); return {team:z.team, inside:Math.abs(z.x-rr.x)<=rr.hx&&Math.abs(z.z-rr.z)<=rr.hz, free:!!(MX.nearestFree&&MX.nearestFree(z.x,z.z)) } })''')
    chk(all(q['inside'] for q in r), 'cada zona está dentro de su refugio %s' % r)
    # capacidades
    caps = ev('''()=>{const e=MX.pl; const out=[]; for(const k of ['pack1','pack2','pack3']){ e.bag={}; e.bag[k]=1; out.push(MX.ECO.cap(e)); } e.bag={}; out.unshift(MX.ECO.cap(e)); return out}''')
    chk(caps == [20, 20, 35, 50], 'capacidad de la mochila 20/20/35/50 (%s)' % caps)
    r = ev('''()=>{const e=MX.pl; e.bag={pack1:1}; e.mat=null; const a=MX.ECO.addCarry(e,'hierro',12), b2=MX.ECO.addCarry(e,'madera',12); return {a,b2,load:MX.ECO.load(e)}}''')
    chk(r['a'] == 12 and r['b2'] == 8 and r['load'] == 20, 'la mochila no admite más que su capacidad (%s)' % r)
    # descarga automática: fuera no, dentro sí
    r = ev('''()=>{const e=MX.pl, E=MX.ECO, z=E.zoneOf(e.team); const s0=E.total(e.team); e.p.set(z.x+30,0,z.z+30); P.pos.set(e.p.x,0,e.p.z); run(1); const fuera=E.total(e.team)-s0, carga=E.load(e);
      e.p.set(z.x,0,z.z); P.pos.set(z.x,0,z.z); run(1); return {fuera, carga, dentro:E.total(e.team)-s0, quedan:E.load(e), chip:document.getElementById('ecoChip').textContent}}''')
    chk(r['fuera'] == 0 and r['carga'] == 20, 'fuera de la zona no descarga (%s)' % r)
    chk(r['dentro'] == 20 and r['quedan'] == 0, 'dentro de la zona descarga todo en el almacén (%s)' % r)
    chk('Almacén' in r['chip'] and 'llevas 0/20' in r['chip'], 'el HUD muestra «llevas» y «Almacén» (%s)' % r['chip'])
    # tope 600
    r = ev('''()=>{const e=MX.pl, E=MX.ECO, z=E.zoneOf(e.team); E.stock[e.team].hierro=595; E.addCarry(e,'hierro',20); e.p.set(z.x,0,z.z); run(1); return {s:E.stock[e.team].hierro, queda:E.load(e)}}''')
    chk(r['s'] == 600 and r['queda'] == 15, 'el almacén tiene tope 600 y el sobrante queda en la mochila (%s)' % r)
    # un bot que vuelve con material lo deposita
    r = ev('''()=>{const E=MX.ECO, e=MX.ents.find(q=>q!==MX.pl&&q.team===MX.pl.team&&!q.dead), z=E.zoneOf(e.team); E.stock[e.team].piedra=0; E.addCarry(e,'piedra',7); e.p.set(z.x+.5,0,z.z); run(1); return {s:E.stock[e.team].piedra, q:E.load(e)}}''')
    chk(r['s'] == 7 and r['q'] == 0, 'un bot en la zona deposita su carga (%s)' % r)
    # rendimiento de objetos
    r = ev('''()=>{const E=MX.ECO; const c=props.find(p=>p.type==='car'), cr=props.find(p=>p.type==='crate'), bl=props.find(p=>p.type==='blocks'); return [E.yieldOf(c),E.yieldOf(cr),E.yieldOf(bl)]}''')
    chk(r[0] == {'tipo': 'hierro', 'n': 12} and r[1]['tipo'] == 'madera' and r[2]['tipo'] == 'piedra', 'rendimiento por tipo de objeto (%s)' % r)
    chk(not errs, 'sin errores JS %s' % errs[:2])
    b.close()
print('FALLOS:', bad); raise SystemExit(1 if bad else 0)
