"""Comparación determinista del distrito con un index.html previo (--referencia)."""
import argparse
import hashlib
import json
from pathlib import Path
from playwright.sync_api import sync_playwright

parser = argparse.ArgumentParser()
parser.add_argument('--referencia', type=Path)
args = parser.parse_args()
current = Path(__file__).resolve().parents[1] / 'index.html'


def simulate(browser, html):
    page = browser.new_page(viewport={'width': 800, 'height': 450})
    errors = []
    page.on('pageerror', lambda error: errors.append(str(error)))
    page.add_init_script("""let seed=93271;
      Math.random=()=>((seed=(Math.imul(1664525,seed)+1013904223)>>>0)/4294967296);
      const raf=window.requestAnimationFrame;
      window.requestAnimationFrame=fn=>fn.name==='frame'?0:raf.call(window,fn);""")
    page.goto(html.resolve().as_uri()+'?mapa=6', timeout=120000)
    print("Cargando", html.name, flush=True)
    page.evaluate('begin()')
    print("Distrito cargado", flush=True)
    result = page.evaluate("""async () => {
      const nav=MX.NV, checks=[];
      async function check(label) {
        const expected=new Uint8Array(nav.n);
        for (const b of boxes) {
          const minX=Math.max(0,Math.floor(b.x-b.hx-.62-nav.ox));
          const maxX=Math.min(nav.w-1,Math.floor(b.x+b.hx+.62-nav.ox));
          const minZ=Math.max(0,Math.floor(b.z-b.hz-.62-nav.oz));
          const maxZ=Math.min(nav.h-1,Math.floor(b.z+b.hz+.62-nav.oz));
          for (let z=minZ;z<=maxZ;z++) for (let x=minX;x<=maxX;x++) {
            const dx=Math.max(0,Math.abs(nav.ox+x+.5-b.x)-b.hx);
            const dz=Math.max(0,Math.abs(nav.oz+z+.5-b.z)-b.hz);
            if(dx*dx+dz*dz<.62*.62)expected[z*nav.w+x]=1;
          }
        }
        const diff=expected.findIndex((v,i)=>v!==nav.bl[i]);
        if(diff>=0)throw Error(label+' celda '+diff);
        checks.push(label);
      }
      function tick(){MX.M.navT=0; MX.update(.016)}
      tick();await check('inicio');
      const a={x:7.8,z:15.9,hx:1.3,hz:.8}, b={...a,x:8.3};
      boxes.push(a,b);tick();await check('solapamiento');
      a.x+=.35;boxMoved(a);tick();await check('movimiento corto');
      a.z-=23;boxMoved(a);tick();await check('cruce de sectores');
      boxes.splice(boxes.indexOf(b),1);tick();await check('retirada');
      boxes.splice(boxes.indexOf(a),1);tick();await check('brecha');
      const door=props.find(p=>p.type==='gate1' && OBJ.setOpen(p,false,true));
      if (!door || !OBJ.setOpen(door,true,true)) throw Error('apertura');
      tick();await check('portón abierto');
      if(!OBJ.setOpen(door,false,true))throw Error('cierre');
      tick();await check('portón cerrado');
      let paths=[];
      for(let i=0;i<260;i++)
        paths.push(MX.findPath(-25+i%31,4+i%13,35-i%23,35-i%17));
      paths.push(MX.findPath(-445,-428,0,0), MX.findPath(430,0,-430,0));
      if(!paths.some(p=>p?.length))throw Error('rutas vacías');
      return {checks,paths,cells:nav.n};
    }""")
    result['paths'] = hashlib.sha256(json.dumps(result['paths']).encode()).hexdigest()
    # Desactivar el HUD para comparar la escena sin contadores de tiempo real.
    page.evaluate("""()=>{for(const el of document.body.children)
      if(el!==renderer.domElement) el.style.visibility='hidden'}""")
    shots = []
    for x, z in [(-445,-428), (0,0), (-430,0)]:
        page.evaluate("""([x,z])=>{camera.position.set(x+4,13,z+8);camera.lookAt(x,0,z);
          sun.target.position.set(x,0,z);sun.position.set(x-8,16,z+6);
          MAPA.cull(camera);renderer.render(scene,camera)}""", [x,z])
        shots.append(hashlib.sha256(page.locator('canvas').first.screenshot()).hexdigest())
    assert len(set(shots)) == 3, 'Escenas indistinguibles'
    assert not errors, errors
    page.close()
    return result, shots


with sync_playwright() as pw:
    browser = pw.chromium.launch(executable_path='/usr/bin/google-chrome', args=['--use-angle=swiftshader','--enable-unsafe-swiftshader'])
    actual = simulate(browser, current)
    if args.referencia:
        baseline = simulate(browser, args.referencia)
        assert actual[0] == baseline[0], (actual[0],baseline[0])
        assert actual[1] == baseline[1], 'Imágenes diferentes'
    print(actual[0])
    print('Tres escenas idénticas a la referencia' if args.referencia else 'Tres escenas verificadas')
    browser.close()
