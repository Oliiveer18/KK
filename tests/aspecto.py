"""Aspecto de personajes: equipo modular (3 niveles), 4 paletas, kit, y estado abatido/reanimación (mapa 3)."""
import os, sys
from playwright.sync_api import sync_playwright
errs = []; bad = 0
def chk(c, m):
    global bad
    print(('OK  ' if c else 'FALLO ') + m); bad += 0 if c else 1
with sync_playwright() as p:
    b = p.chromium.launch(executable_path='/usr/bin/google-chrome', args=['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'])
    pg = b.new_page(viewport={'width': 1100, 'height': 700}); pg.on('pageerror', lambda e: errs.append(str(e)))
    pg.goto('file://' + os.path.abspath('index.html') + '?mapa=3'); pg.wait_for_timeout(1000); ev = pg.evaluate
    ev('MX.want=true;begin()'); pg.wait_for_timeout(300); ev('for(let i=0;i<200;i++) update(1/60)')
    # equipo: más nivel = más piezas y más triángulos; 4 paletas; kit añade piezas
    r = ev('''()=>{const R=MX.ents.find(e=>e.bot).R;const tri=()=>{let n=0;R._gear.forEach(g=>g.traverse(o=>{if(o.isMesh)n+=o.geometry.index.count/3}));return n};
      const out={};for(const t of [0,1,2,3]){dress(R,0,{helmet:t,vest:t,pack:t});out['n'+t]=tri()}
      dress(R,0,{helmet:2,vest:2,pack:2,kit:false});out.sinkit=tri();dress(R,0,{helmet:2,vest:2,pack:2,kit:true});out.conkit=tri();
      out.cols=FAC.map((f,i)=>{dress(R,i,{});return R.torso.material.color.getHex().toString(16)});out.fac=FAC.length;return out}''')
    print(r)
    chk(r['n0'] < r['n1'] < r['n2'] < r['n3'], 'más nivel de equipo = más piezas (0<1<2<3)')
    chk(r['conkit'] > r['sinkit'], 'el kit de reanimación añade la cruz roja a la mochila')
    chk(r['fac'] == 4 and len(set(r['cols'])) == 4, '4 facciones con uniformes de colores distintos')
    # abatido
    ev('()=>{const e=MX.ents.filter(x=>x.bot)[3];e.dead=false;e.inv=9;window.__e=e;MX.setDowned(e,true,1,0)}')
    ev('for(let i=0;i<40;i++) update(1/60)')
    d = ev('()=>{const e=__e;return {dwn:e.dwn,fx:!!e.dwnFx,rot:+(2*Math.acos(Math.min(1,Math.abs(e.root.quaternion.w)))).toFixed(2),vel:e.v.length(),n:scene.children.includes(e.dwnFx.g)}}')
    print('abatido:', d)
    chk(d['dwn'] and d['fx'] and d['n'], 'abatido: estado activo y marcador en escena')
    chk(1.2 < d['rot'] < 1.4, 'abatido: el cuerpo queda tumbado (~1,3 rad)')
    chk(d['vel'] < .01, 'abatido: no se mueve ni actúa')
    ev('()=>{MX.reviveFx(__e,.5)}'); chk(ev('()=>!!__e.dwnFx.pm'), 'anillo de progreso de reanimación visible')
    ev('()=>{MX.reviveFx(__e,null)}'); chk(ev('()=>!__e.dwnFx.pm'), 'anillo de progreso se retira')
    ev('()=>{MX.setDowned(__e,false)}'); ev('for(let i=0;i<10;i++) update(1/60)')
    d2 = ev('()=>({dwn:__e.dwn,fx:!!__e.dwnFx,q:Math.abs(__e.root.quaternion.w)})')
    chk(not d2['dwn'] and not d2['fx'] and d2['q'] > .99, 'reanimado: se incorpora y desaparece el marcador')
    print('ERRORES JS:', errs or 'ninguno'); bad += len(errs)
sys.exit(1 if bad else 0)
