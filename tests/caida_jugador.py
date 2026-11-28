"""Comprueba la geometría visible durante la caída y al reaparecer en el mapa 3."""
from pathlib import Path
from playwright.sync_api import sync_playwright

with sync_playwright() as pw:
    browser = pw.chromium.launch(executable_path='/usr/bin/google-chrome', args=['--use-angle=swiftshader', '--enable-unsafe-swiftshader'])
    page = browser.new_page()
    page.goto((Path(__file__).resolve().parents[1] / 'index.html').as_uri() + '?mapa=3')
    page.evaluate('begin()')
    for x, z in [(-40, 5), (0, 0), (12, 15)]:
        maximum = page.evaluate("""([x,z]) => {
          const p = MX.pl;
          p.p.set(x,0,z);
          update(.016);
          const before = new Set(scene.children);
          p.inv = 0;
          MX.hit(p,500,MX.ents[7],1,0);
          const body = scene.children.find(o => !before.has(o) && o.userData.ax);
          if (!p.dead || !body || body.children.some(o => !o.isMesh))
            throw Error('Hay accesorios independientes en la caída');
          const equipment = body.children.flatMap(o => o.children).filter(o => o.isGroup);
          if (equipment.length !== rig._gear.length || !equipment.length)
            throw Error('El cuerpo no conserva todo el equipo');
          let maximum = 0;
          for (let frame=0; frame<40; frame++) {
            const size = new THREE.Box3().setFromObject(body).getSize(new V3());
            maximum = Math.max(maximum,size.x,size.y,size.z);
            MX.update(1/60);
          }
          if (maximum>=3) throw Error('Cuerpo sobredimensionado: '+maximum);
          p.respT=0;
          MX.update(.016);
          if (p.dead || body.parent || !rig.torso.visible) throw Error('Reaparición incorrecta');
          return maximum;
        }""", [x, z])
        print(f'Posición ({x}, {z}): dimensión máxima durante la caída {maximum:.2f} m')
    browser.close()
