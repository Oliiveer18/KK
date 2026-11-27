"""Objetos de campaña (src/objetos.js): carga, huella, rotura, accesos que se abren, alarma, cristales, recogibles y disparos contra muros.
Uso: python3 -I tests/objetos.py   (lee index.html de la raíz). Con un argumento guarda capturas en esa carpeta."""
import os, sys
from playwright.sync_api import sync_playwright
errs = []; fallos = []
def chk(ok, msg):
    print(('  OK  ' if ok else '  FALLA ') + msg)
    if not ok: fallos.append(msg)
with sync_playwright() as p:
    b = p.chromium.launch(executable_path='/usr/bin/google-chrome', args=['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'])
    pg = b.new_page(viewport={'width': 900, 'height': 600}); pg.on('pageerror', lambda e: errs.append(str(e))); pg.on('console', lambda m: errs.append(m.text) if m.type == 'error' else None)
    pg.goto('file://' + os.path.abspath('index.html')); pg.wait_for_timeout(1500); ev = pg.evaluate
    ev('begin()'); pg.wait_for_timeout(300)
    run = lambda n: ev('for(let i=0;i<%d;i++) update(1/60)' % n)
    n = ev('OBJ.types.length'); chk(n == 75, 'hay 75 tipos de objeto: los 68 del catálogo, los 3 parapetos de los refugios y los 4 de objetivos (%d)' % n)

    rows = ev('OBJ.measure()')
    bad = [r['type'] for r in rows if not (r['w'] > .2 and r['d'] > .1 and r['h'] > .1 and r['pieces'] >= 3)]
    chk(not bad, 'todos tienen huella, altura y piezas coherentes ' + str(bad))
    big = [r['type'] for r in rows if r['pieces'] > 90]
    chk(not big, 'ninguno pasa de 90 piezas (coste de dibujo) ' + str(big))
    print('  piezas totales de los 75 tipos:', sum(r['pieces'] for r in rows), '· máximo', max(r['pieces'] for r in rows))

    r = ev("""(() => {
      const out = {};
      for (const t of OBJ.types) {
        OBJ.gallery([t]); const p = props[0];
        const ok = !!p && boxes.includes(p.box) && p.hp === PSPEC[t].hp && isFinite(p.hx) && isFinite(p.hz) && p.pieces.length > 0 && p.meta && p.meta.name;
        const nb = boxes.length;
        damageProp(p, 99999, p.x, p.z, 1, 0, 'bullet');
        out[t] = { ok, dead: p.dead, boxesLeft: boxes.length, deb: DEB.length };
        for (const d of DEB.slice()) scene.remove(d.o); DEB.length = 0;
      }
      return out;
    })()""")
    chk(all(v['ok'] for v in r.values()), 'cada tipo se crea con su caja de colisión y vida: ' + str([k for k, v in r.items() if not v['ok']]))
    IND = {'monument'}   # indestructible a propósito (centro de la Plaza Mayor)
    chk(all(v['dead'] and v['boxesLeft'] == 0 for k, v in r.items() if k not in IND), 'al destruirse todos liberan su colisión: ' + str([k for k, v in r.items() if k not in IND and not (v['dead'] and v['boxesLeft'] == 0)]))
    chk(not r['monument']['dead'], 'el monumento de la plaza resiste 99.999 de daño (indestructible)')
    chk(all(v['deb'] > 0 for k, v in r.items() if k not in IND), 'todos sueltan restos al romperse: ' + str([k for k, v in r.items() if k not in IND and v['deb'] == 0]))
    hp = ev('["wall1","wall2","wall3"].map(t=>PSPEC[t].hp).concat(["gate1","gate2","gate3"].map(t=>PSPEC[t].hp))')
    chk(hp[0] < hp[1] < hp[2] if False else (hp[0] < hp[1] < hp[2] and hp[3] < hp[4] < hp[5]), 'la vida sube con el nivel de muro y portón ' + str(hp))

    # accesos que se abren y cierran
    for t in ['gate1', 'gate2', 'gate3', 'gateInner', 'door', 'slideGate', 'shutter']:
        res = ev("""(() => {
          OBJ.gallery(['%s']); const p = props[0], o = {};
          o.full = boxes.length; const pz0 = p.pieces.map(q => q.obj.position.x + ',' + q.obj.position.z + ',' + q.obj.scale.y).join('|');
          P.pos.set(p.x, 0, p.z + 6);
          o.opened = OBJ.setOpen(p, true); o.openBoxes = boxes.length;
          for (let i = 0; i < 90; i++) update(1/60);
          o.moved = p.pieces.map(q => q.obj.position.x + ',' + q.obj.position.z + ',' + q.obj.scale.y).join('|') !== pz0;
          P.pos.set(p.x, 0, p.z);                                   // alguien en el paso: no se puede cerrar
          o.refused = OBJ.setOpen(p, false) === false;
          P.pos.set(p.x, 0, p.z + 6);
          o.closed = OBJ.setOpen(p, false); o.closedBoxes = boxes.length;
          for (let i = 0; i < 90; i++) update(1/60);
          o.back = p.pieces.map(q => q.obj.position.x + ',' + q.obj.position.z + ',' + q.obj.scale.y).join('|') === pz0 || Math.abs(p.oT) < 1e-6;
          OBJ.setOpen(p, true); const nb = boxes.length; damageProp(p, 99999, p.x, p.z, 1, 0, 'bullet'); o.destroyedOpen = p.dead && boxes.length === 0;
          return o;
        })()""" % t)
        chk(res['opened'] and res['moved'] and res['refused'] and res['closed'] and res['back'] and res['destroyedOpen'] and res['closedBoxes'] == res['full'], '%s: abre, se mueve, no cierra con alguien dentro, vuelve y se puede romper abierto %s' % (t, res if not (res['opened'] and res['moved'] and res['refused'] and res['closed'] and res['back'] and res['destroyedOpen']) else ''))
    r = ev("(()=>{OBJ.gallery(['gate1']); const p = props[0], f = boxes.length; OBJ.setOpen(p, true); return [f, boxes.length, p.xb.length]})()")
    chk(r[0] == 1 and r[1] == 2, 'el portón abierto deja solo las dos postes como colisión %s' % r)
    r = ev("(()=>{OBJ.gallery(['shutter']); const p = props[0]; OBJ.setOpen(p, true); return boxes.length})()")
    chk(r == 0, 'la persiana abierta no deja colisión (%s)' % r)

    # cristal y alarma
    r = ev("""(() => {
      OBJ.gallery(['glassPane']); const p = props[0]; damageProp(p, 30, p.x, p.z, 1, 0, 'bullet'); return [p.dead, DEB.length];
    })()""")
    chk(r[0] and r[1] >= 4, 'la cristalera se rompe de un golpe y suelta cristales %s' % r)
    r = ev("""(() => {
      OBJ.gallery(['bwallGlass']); const p = props[0], calls = []; const nz = MX.zom.noise; MX.zom.noise = (x, z, R) => { calls.push(R); };
      const before = OBJ.alarms.length; const g0 = p.o.glassPcs.filter(q => !q.gone).length;
      damageProp(p, 5, p.x - 1, p.z, 0, 1, 'bullet'); const g1 = p.o.glassPcs.filter(q => !q.gone).length;
      const on = p.alarmOn, n = OBJ.alarms.length;
      for (let i = 0; i < 60 * 5; i++) update(1/60);
      const loud = calls.length; for (let i = 0; i < 60 * 17; i++) update(1/60);
      const out = [g0, g1, on, n, loud >= 2, OBJ.alarms.length, p.alarmOn, p.dead]; MX.zom.noise = nz; return out;
    })()""")
    chk(r[0] >= 2 and r[1] == r[0] - 1 and r[2] and r[3] == 1 and r[4] and r[5] == 0 and not r[6] and not r[7], 'escaparate: un impacto rompe un cristal, salta la alarma (ruido repetido) y se apaga a los 20 s %s' % r)

    # foco: sin lámpara no hay luz
    r = ev("""(() => { OBJ.gallery(['floodlight']); const p = props[0], v0 = p.o.glow.visible; launchPiece(p, p.o.lamp, 0, 0, 1, 1); update(1/60); return [v0, p.o.glow.visible]; })()""")
    chk(r[0] is True and r[1] is False, 'el foco apaga su haz al perder la lámpara %s' % r)

    # surtidor: fuga de combustible por un agujero
    r = ev("""(() => { OBJ.gallery(['pump']); const p = props[0]; return [p.fluid, p.fluidKind, p.explosive]; })()""")
    chk(r[0] == 1 and r[1] == 'fuel' and not r[2], 'el surtidor tiene combustible y no explota %s' % r)

    # impactos de bala contra muros y cristal
    r = ev("""(() => {
      const out = {}; const W = WP.find(w => w.sid === 'F1');
      for (const t of ['wall1', 'wall3', 'glassPane', 'supplyMat']) {
        OBJ.gallery([t]); const p = props[0]; BUL.forEach(q => { q.on = false; }); const hp0 = p.hp;
        P.pos.set(p.x, 0, p.z + 8); spawnBullet(p.x + .2, 1.2, p.z + 3, 0, -1, W); const bu = BUL.find(q => q.on);
        for (let f = 0; f < 200 && bu.on; f++) update(1/60);
        out[t] = [hp0 - p.hp, p.dead, (p.decals || []).length];
      }
      return out;
    })()""")
    chk(r['wall1'][0] > 0 and r['wall1'][2] >= 1, 'una bala daña el muro y deja marca %s' % r['wall1'])
    chk(r['wall3'][0] > 0 and r['wall3'][0] <= r['wall1'][0], 'el muro reforzado recibe igual o menos daño por bala %s' % r['wall3'])
    chk(r['glassPane'][1], 'una bala rompe la cristalera %s' % r['glassPane'])
    chk(r['supplyMat'][0] > 0, 'una bala daña la caja de suministros %s' % r['supplyMat'])

    # recogibles y raíles
    r = ev("""(() => { const out = []; for (const k of OBJ.pickupKinds) { const q = OBJ.pickup(k, 0, 0); out.push(!!q && q.g.children.length >= 2); } for (let i = 0; i < 90; i++) update(1/60); const n = OBJ.pickups.length; for (const q of OBJ.pickups.slice()) OBJ.removePickup(q); const g = OBJ.rails(0, 0, 12, 0); return [out.every(Boolean), out.length, n, OBJ.pickups.length, g.children.length]; })()""")
    chk(r[0] and r[1] == 13 and r[2] == 13 and r[3] == 0 and r[4] >= 4, 'recogibles (13 clases) y raíles %s' % r)

    # API del generador de mapas
    r = ev("""(() => {
      OBJ.gallery([]); const out = {}; boxes.length = 0;
      const w = placeObject('wall2', 10, 5, .3, { fac: 2 }), g = placeObject('gate1', 0, 5, Math.PI / 2, { abierto: true }), c = placeObject('car', -10, 5, 3, {}), m = placeObject('bwallSolid', 20, 5, 0, { len: 2 });
      out.w = [w.type, w.faction, Math.abs(w.hx - 1.6) < .1];                      // giro 0,3 -> 0: huella normal
      out.g = [g.type, g.open, Math.abs(g.g.rotation.y - Math.PI / 2) < 1e-6];
      out.c = [c.type, Math.abs(Math.abs(c.g.rotation.y) - Math.PI) < 1e-6, c.hz > c.hx];   // giro 3 -> π: sigue siendo el eje x largo? (π no cambia huella)
      out.len = m.hx;                                                                 // tramo de 2 m
      const bld = placeObject('mini', 40, 0, 0, { fac: 1 }); out.bld = [bld.isBuilding, bld.props.length > 10, OBJ.buildings.length];
      out.none = placeObject('noexiste', 0, 0, 0); out.fp = [OBJ.footprint('wall2', 0), OBJ.footprint('wall2', Math.PI / 2), OBJ.footprint('mini', 0)];
      OBJ.removeObject(w); out.removed = [props.includes(w), w.dead]; OBJ.removeObject(bld); out.bldGone = OBJ.buildings.length;
      return out;
    })()""")
    chk(r['w'][0] == 'wall2' and r['w'][1] == 2 and r['w'][2], 'placeObject: tipo, facción y huella %s' % r['w'])
    chk(r['g'][0] == 'gate1' and r['g'][1] is True and r['g'][2], 'placeObject: giro ajustado a π/2 y portón abierto %s' % r['g'])
    chk(__import__('math').fabs(r['len'] - 1.0) < .05, 'placeObject: opción len (muro de edificio de 2 m) %s' % r['len'])
    chk(r['bld'][0] and r['bld'][1] and r['bld'][2] == 1, 'placeObject: edificio por tipo %s' % r['bld'])
    chk(r['none'] is None, 'placeObject: tipo desconocido devuelve null')
    chk(r['fp'][0] and r['fp'][1]['hx'] == r['fp'][0]['hz'] and r['fp'][2]['hx'] > 5, 'footprint: giro intercambia ejes y edificio da su huella %s' % r['fp'])
    chk(r['removed'] == [False, True] and r['bldGone'] == 0, 'removeObject: quita objetos y edificios')
    # no rompe el resto: galería completa y partida del mapa 3
    ev('OBJ.gallery()'); run(120)
    chk(ev('props.length') == 75, 'la galería completa coloca los 75 tipos')
    if len(sys.argv) > 1:
        pg.screenshot(path=os.path.join(sys.argv[1], 'galeria.png'))
    b.close()
print('ERRORES JS:', errs or 'ninguno')
print('FALLOS:', fallos or 'ninguno')
sys.exit(1 if (fallos or errs) else 0)
