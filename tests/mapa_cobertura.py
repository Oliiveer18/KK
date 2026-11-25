"""Cobertura de objetos en el distrito (guía de M2): lista qué tipos de objeto, edificios y recogibles aún NO aparecen en el mapa 5.
Sin argumentos informa y sale con 0; con --estricto falla si falta alguno (se activará al terminar el montaje del distrito)."""
import os, sys
from playwright.sync_api import sync_playwright
with sync_playwright() as p:
    b = p.chromium.launch(executable_path='/usr/bin/google-chrome', args=['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'])
    pg = b.new_page(viewport={'width': 900, 'height': 500}); errs = []; pg.on('pageerror', lambda e: errs.append(str(e)))
    pg.goto('file://' + os.path.abspath('index.html') + '?mapa=' + (sys.argv[1] if len(sys.argv) > 1 and sys.argv[1].isdigit() else '5')); pg.wait_for_timeout(1000); pg.evaluate('begin()'); pg.wait_for_timeout(1500)
    r = pg.evaluate('''()=>{const orig=["crate","crateS","barrier","barrel","barrelFuel","fence","sandbags","blocks"];
      const used=new Set(props.map(p=>p.type));const bl=new Set((MAPA.built&&MAPA.built.buildings||[]).map(x=>x.type||x.kind||x.k));
      const pk=new Set((OBJ.pickups||[]).map(k=>k.kind));
      return {tipos:[...orig,...OBJ.types].filter(k=>!used.has(k)),nTipos:orig.length+OBJ.types.length,
              edif:OBJ.buildingKinds.filter(k=>!(OBJ.buildings||[]).some(b=>b.kind===k||b.type===k||b.k===k)),nEdif:OBJ.buildingKinds.length,
              rec:OBJ.pickupKinds.filter(k=>!pk.has(k)),nRec:OBJ.pickupKinds.length}}''')
    print('tipos de objeto sin usar: %d de %d' % (len(r['tipos']), r['nTipos'])); print('  ', ', '.join(r['tipos']))
    print('edificios sin colocar: %d de %d' % (len(r['edif']), r['nEdif'])); print('  ', ', '.join(r['edif']))
    print('recogibles sin colocar: %d de %d' % (len(r['rec']), r['nRec'])); print('  ', ', '.join(r['rec']))
    falta = len(r['tipos']) + len(r['edif']) + len(r['rec'])
    print('ERRORES JS:', errs or 'ninguno')
    if '--estricto' in sys.argv: sys.exit(1 if falta or errs else 0)
    sys.exit(1 if errs else 0)
