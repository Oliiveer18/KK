"""Presupuesto de rendimiento (plan de FPS estables). Simulación sin dibujar de 2 min con 200 bots y ~1.600 zombis más mediciones de dibujo y memoria.
Presupuestos (equipo de pruebas de escritorio; en el iPhone la lógica cuesta ~2–3 veces más, de ahí los márgenes ajustados):
  · lógica por fotograma: p50 ≤ 5 ms, p95 ≤ 8,5 ms, p99 ≤ 11 ms; ningún fotograma > 120 ms y a lo sumo 4 de > 30 ms en 2 min
  · basura: ≤ 330 KB por fotograma (mediana de 3 mediciones) (recolecciones de 16–20 ms cada ~0,5 s si se pasa)
  · dibujo: ≤ 370 llamadas en la pasada principal (varía ±40 según los soldados a la vista) y ≤ 400 con la pasada de sombras (3 zonas), ≤ 85 programas de shader y ninguno nuevo durante el juego
  · memoria tras la carga ≤ 190 MB (con recogida de basura) y crecimiento ≤ 6 MB/min tras 1 min de calentamiento; objetos despiertos a los 2 min ≤ 600; nodos de escena ≤ 40.000
Uso: python3 tests/presupuesto.py [minutos=2]"""
import os, sys, json
from playwright.sync_api import sync_playwright
MIN = float(sys.argv[1]) if len(sys.argv) > 1 else 2
bad = 0
def chk(c, m):
    global bad
    print(('OK  ' if c else 'FALLO ') + m); bad += 0 if c else 1
with sync_playwright() as p:
    b = p.chromium.launch(executable_path='/usr/bin/google-chrome', args=['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--js-flags=--expose-gc', '--enable-precise-memory-info'])
    pg = b.new_page(viewport={'width': 844, 'height': 390}); errs = []; pg.on('pageerror', lambda e: errs.append(str(e))); ev = pg.evaluate
    pg.goto('file://' + os.path.abspath('index.html') + '?mapa=6'); pg.wait_for_timeout(1500); ev('begin()'); pg.wait_for_timeout(3500)
    prog0 = ev('()=>renderer.info.programs.length')
    heap0 = ev('()=>{ gc(); return Math.round(performance.memory.usedJSHeapSize/1e6) }')
    # dibujo en tres zonas (refugio, calle, plaza)
    calls = {}
    for nombre, (x, z) in {'refugio': (None, None), 'calle': (110, 0), 'plaza': (0, 25)}.items():
        calls[nombre] = ev('''(a)=>{ const [x,z]=a; for(let i=0;i<60*5;i++){ time+=1/60; update(1/60); } if(x!==null){ P.pos.x=x; P.pos.z=z; for(let i=0;i<60*4;i++){ time+=1/60; update(1/60); } }
          renderer.info.reset(); camera.updateMatrixWorld(); renderer.render(scene,camera); const total=renderer.info.render.calls; renderer.shadowMap.autoUpdate=false; renderer.info.reset(); renderer.render(scene,camera); const main=renderer.info.render.calls; renderer.shadowMap.autoUpdate=true; return [main,total] }''', [x, z])
    print('llamadas de dibujo [principal, con sombras]:', calls)
    chk(max(v[0] for v in calls.values()) <= 370, 'dibujo: ≤ 370 llamadas en la pasada principal (máx %d)' % max(v[0] for v in calls.values()))
    chk(max(v[1] for v in calls.values()) <= 400, 'dibujo: ≤ 400 llamadas con la pasada de sombras (máx %d)' % max(v[1] for v in calls.values()))
    # calentamiento de 1 min (la población de zombis y las cachés crecen al principio) y simulación medida
    ev('()=>{ renderer.render=()=>{}; for(let i=0;i<3600;i++){ time+=1/60; update(1/60); if(i%10===0) MAPA.cull(camera); } }')
    heapA = ev('()=>{ gc(); return Math.round(performance.memory.usedJSHeapSize/1e6) }')
    r = ev('''(MIN)=>{ renderer.render=()=>{}; const M=MX.M, fr=[]; for(let i=0;i<MIN*3600;i++){ time+=1/60; const t0=performance.now(); update(1/60); fr.push(performance.now()-t0); if(i%10===0) MAPA.cull(camera); }
      const s=[...fr].sort((a,b)=>a-b), q=x=>s[Math.floor(s.length*x)]; let nodos=0; scene.traverse(()=>nodos++);
      return {p50:q(.5), p95:q(.95), p99:q(.99), max:s[s.length-1], over30:fr.filter(x=>x>30).length, awake:AWAKE.size, nodos, zom:MX.zom.list.filter(z=>!z.dead).length, vivos:M.ents.filter(e=>!e.dead).length} }''', MIN)
    print(json.dumps({k: (round(v, 2) if isinstance(v, float) else v) for k, v in r.items()}))
    chk(r['p50'] <= 5, 'lógica p50 ≤ 5 ms (%.1f)' % r['p50'])
    chk(r['p95'] <= 8.5, 'lógica p95 ≤ 8,5 ms (%.1f)' % r['p95'])
    chk(r['p99'] <= 11, 'lógica p99 ≤ 11 ms (%.1f)' % r['p99'])
    chk(r['max'] <= 120 and r['over30'] <= 4, 'sin tirones de lógica: máx %.0f ms, %d fotogramas > 30 ms en %g min' % (r['max'], r['over30'], MIN))
    chk(r['awake'] <= 600, 'objetos despiertos ≤ 600 (%d)' % r['awake'])
    chk(r['nodos'] <= 40000, 'nodos de escena ≤ 40.000 (%d)' % r['nodos'])
    chk(ev('()=>renderer.info.programs.length') <= 85 and ev('()=>renderer.info.programs.length') == prog0, 'shaders: ≤ 85 programas y ninguno nuevo durante el juego (%d → %d)' % (prog0, ev('()=>renderer.info.programs.length')))
    # basura por fotograma y memoria
    kbs = sorted(ev('''()=>{ const o=[]; for(let r=0;r<3;r++){ gc(); const a=performance.memory.usedJSHeapSize; for(let i=0;i<30;i++){ time+=1/60; update(1/60); } o.push(Math.round((performance.memory.usedJSHeapSize-a)/30/1024)); } return o }'''))
    kb = kbs[1]
    chk(kb <= 330, 'basura ≤ 330 KB por fotograma (mediana %d KB; %s)' % (kb, kbs))
    heap1 = ev('()=>{ gc(); return Math.round(performance.memory.usedJSHeapSize/1e6) }')
    chk(heap0 <= 190, 'memoria tras la carga ≤ 190 MB (%d MB)' % heap0)
    chk((heap1 - heapA) / MIN <= 6, 'crecimiento de memoria ≤ 6 MB/min tras el calentamiento (%d → %d MB en %g min)' % (heapA, heap1, MIN))
    chk(not errs, 'sin errores JS ' + str(errs[:2]))
sys.exit(1 if bad else 0)
