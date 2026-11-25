"""Edificios de campaña (OBJ.building): que se pueda entrar y recorrer, sin objetos solapados, techo que se oculta al entrar y muros cercanos recortados.
Uso: python3 -I tests/edificios.py [carpeta_capturas]"""
import os, sys
from playwright.sync_api import sync_playwright
errs = []; fallos = []
def chk(ok, msg):
    print(('  OK  ' if ok else '  FALLA ') + msg)
    if not ok: fallos.append(msg)
JS_WALK = """(kind) => {
  OBJ.clearBuildings(); for (const p of props.slice()) { scene.remove(p.g); props.splice(props.indexOf(p), 1); } boxes.length = 0;
  const b = OBJ.building(kind, 0, 0, 0, 0), r = .4, cs = .25, hw = b.W / 2 + 6, hd = b.D / 2 + 8;
  const free = (x, z) => { for (const q of boxes) if (Math.abs(x - q.x) < q.hx + r && Math.abs(z - q.z) < q.hz + r) return false; return true; };
  const nx = Math.round(hw * 2 / cs), nz = Math.round(hd * 2 / cs), idx = (i, j) => j * nx + i, seen = new Uint8Array(nx * nz);
  const X = i => -hw + (i + .5) * cs, Z = j => -b.D / 2 - 3 + (j + .5) * cs;
  let si = Math.round((0 + hw) / cs), sj = Math.round((b.D / 2 + 5 + b.D / 2 + 3) / cs) ; // salida: 5 m delante de la puerta
  const q = [[si, sj]]; seen[idx(si, sj)] = 1; let n = 0;
  while (q.length) { const [i, j] = q.pop(); n++; for (const [di, dj] of [[1,0],[-1,0],[0,1],[0,-1]]) { const a = i + di, c = j + dj; if (a < 0 || c < 0 || a >= nx || c >= nz || seen[idx(a, c)]) continue; if (!free(X(a), Z(c))) continue; seen[idx(a, c)] = 1; q.push([a, c]); } }
  let inside = 0, reached = 0;
  for (let j = 0; j < nz; j++) for (let i = 0; i < nx; i++) { const x = X(i), z = Z(j); if (Math.abs(x) < b.W / 2 - .2 && Math.abs(z) < b.D / 2 - .2 && free(x, z)) { inside++; if (seen[idx(i, j)]) reached++; } }
  // solapes entre objetos del edificio
  let overlaps = []; const ps = b.props.filter(p => p.box && boxes.includes(p.box));
  for (let a = 0; a < ps.length; a++) for (let c = a + 1; c < ps.length; c++) { const A = ps[a], B = ps[c]; const WL = ['bwallSolid','bwallGlass','shopDoor','door','rollDoor','slideGate','chainFence']; if (WL.includes(A.type) && WL.includes(B.type)) continue; if (Math.abs(A.x - B.x) < A.hx + B.hx - .02 && Math.abs(A.z - B.z) < A.hz + B.hz - .02) overlaps.push(A.type + '+' + B.type); }
  let lost = []; for (let j = 0; j < nz; j += 2) for (let i = 0; i < nx; i += 2) { const x = X(i), zz = Z(j); if (Math.abs(x) < b.W / 2 - .2 && Math.abs(zz) < b.D / 2 - .2 && free(x, zz) && !seen[idx(i, j)]) lost.push([+x.toFixed(1), +zz.toFixed(1)]); }
  return { lost: lost.slice(0, 12), props: b.props.length, inside, reached, overlaps, start: free(X(si), Z(sj)), doorOpen: b.doors.length ? b.doors[0].open : true };
}"""
with sync_playwright() as p:
    b = p.chromium.launch(executable_path='/usr/bin/google-chrome', args=['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'])
    pg = b.new_page(viewport={'width': 900, 'height': 600}); pg.on('pageerror', lambda e: errs.append(str(e))); pg.on('console', lambda m: errs.append(m.text) if m.type == 'error' else None)
    pg.goto('file://' + os.path.abspath('index.html')); pg.wait_for_timeout(1500); ev = pg.evaluate; ev('begin()'); pg.wait_for_timeout(300)
    for kind in ev('OBJ.buildingKinds'):
        r = ev(JS_WALK, kind)
        chk(r['start'] and r['doorOpen'], '%s: puerta abierta y exterior libre' % kind)
        chk(not r['overlaps'], '%s: ningún objeto solapado %s' % (kind, r['overlaps']))
        frac = r['reached'] / max(1, r['inside'])
        chk(frac > .9, '%s: se puede llegar a pie al %d %% del interior libre (%d de %d celdas) %s' % (kind, frac * 100, r['reached'], r['inside'], r['lost'] if frac <= .9 else ''))
        print('    %s: %d objetos' % (kind, r['props']))
    # techo y muros cercanos
    r = ev("""(() => {
      OBJ.clearBuildings(); for (const p of props.slice()) { scene.remove(p.g); props.splice(props.indexOf(p), 1); } boxes.length = 0;
      const b = OBJ.building('mini', 0, 0, 0, 0), out = {}; P.pos.set(0, 0, 9); for (let i = 0; i < 40; i++) update(1/60);
      out.roofOut = b.roofs[0].g.visible; out.nearOut = b.near[0].g.scale.y;
      P.pos.set(0, 0, 0); for (let i = 0; i < 90; i++) update(1/60);
      out.roofIn = b.roofs[0].g.visible; out.nearIn = b.near[0].g.scale.y; out.inside = b.inside;
      P.pos.set(0, 0, 9); for (let i = 0; i < 90; i++) update(1/60); out.roofBack = b.roofs[0].g.visible; out.nearBack = b.near[0].g.scale.y;
      // romper un muro recortado: la escala vuelve a 1 antes de soltar trozos
      P.pos.set(0, 0, 0); for (let i = 0; i < 60; i++) update(1/60); const w = b.near[0]; damageProp(w, 99999, w.x, w.z, 0, 1, 'bullet'); out.dead = w.dead; out.debrisScale = DEB.length ? DEB[DEB.length - 1].o.scale.y : null;
      // ventana: un impacto rompe un cristal y salta la alarma
      const win = b.props.find(q => q.type === 'bwallGlass'); const g0 = win.o.glassPcs.filter(c => !c.gone).length; damageProp(win, 5, win.x, win.z + 1, 0, -1, 'bullet'); out.panes = [g0, win.o.glassPcs.filter(c => !c.gone).length, win.alarmOn];
      return out;
    })()""")
    chk(r['roofOut'] and r['nearOut'] == 1, 'fuera: techo visible y muro delantero entero %s' % [r['roofOut'], r['nearOut']])
    chk(r['inside'] and not r['roofIn'] and r['nearIn'] < .4, 'dentro: techo oculto y muro delantero recortado %s' % [r['roofIn'], round(r['nearIn'], 2)])
    chk(r['roofBack'] and r['nearBack'] > .98, 'al salir: vuelve el techo y el muro %s' % [r['roofBack'], round(r['nearBack'], 2)])
    chk(r['dead'], 'se puede romper un muro del edificio')
    chk(r['panes'][1] == r['panes'][0] - 1 and r['panes'][2], 'un impacto en el escaparate rompe un cristal y salta la alarma %s' % r['panes'])
    if len(sys.argv) > 1:
        for kind, px, pz, fn in [('mini', 0, 6.6, 'f_mini_fuera'), ('mini', 0, 1, 'f_mini_dentro'), ('pharm', 0, 6.6, 'f_pharm_fuera'), ('pharm', 0, 1, 'f_pharm_dentro'), ('super', 0, 10.5, 'f_super_fuera'), ('super', 0, 3, 'f_super_dentro')]:
            pg.evaluate("""([k, px, pz]) => { for (const d of DEB.splice(0)) scene.remove(d.o); OBJ.clearBuildings(); for (const p of props.slice()) { scene.remove(p.g); props.splice(props.indexOf(p), 1); } boxes.length = 0; OBJ.building(k, 0, 0, 0, k === 'mini' ? 0 : k === 'pharm' ? 1 : 2); P.pos.set(px, 0, pz); for (let i = 0; i < 90; i++) update(1/60); }""", [kind, px, pz])
            pg.wait_for_timeout(200); pg.screenshot(path=os.path.join(sys.argv[1], fn + '.png'))
    b.close()
print('ERRORES JS:', errs or 'ninguno')
print('FALLOS:', fallos or 'ninguno')
sys.exit(1 if (fallos or errs) else 0)
