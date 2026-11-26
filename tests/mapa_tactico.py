"""Mapa táctico (campaña): un toque del touchpad (botón 17) lo abre y otro lo cierra; mantenerlo abre la mochila. Muestra dónde hay fuego (disparos y
explosiones recientes), el mundo sigue en marcha y el personaje no se mueve mientras está abierto. Tecla M igual."""
import os, sys
from playwright.sync_api import sync_playwright
bad = 0
def chk(c, m):
    global bad
    print(('OK  ' if c else 'FALLO ') + m); bad += 0 if c else 1
with sync_playwright() as p:
    b = p.chromium.launch(executable_path='/usr/bin/google-chrome', args=['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'])
    pg = b.new_page(viewport={'width': 1100, 'height': 700}); errs = []; pg.on('pageerror', lambda e: errs.append(str(e))); ev = pg.evaluate
    pg.goto('file://' + os.path.abspath('index.html') + '?mapa=6'); pg.wait_for_timeout(1000); ev('begin()'); pg.wait_for_timeout(300)
    ev('''()=>{menuOpen=true;const pad={connected:true,mapping:'standard',axes:[0,0,0,0],buttons:Array.from({length:18},()=>({pressed:false,value:0}))};Object.defineProperty(navigator,'getGamepads',{configurable:true,value:()=>[pad]});window.PAD=pad;
      window.tap=i=>{pad.buttons[i].pressed=true;INVENTARIO.input();pad.buttons[i].pressed=false;INVENTARIO.input()};
      window.hold=i=>{pad.buttons[i].pressed=true;for(let k=0;k<40;k++)INVENTARIO.input();pad.buttons[i].pressed=false;INVENTARIO.input()};menuOpen=false}''')
    ev('tap(17)'); chk(ev('MX.mapOpen'), 'un toque del touchpad abre el mapa táctico')
    ev('tap(17)'); chk(not ev('MX.mapOpen'), 'otro toque lo cierra')
    ev('hold(17)'); r = ev('()=>({map:MX.mapOpen,bag:!!document.querySelector("dialog[open]")})'); chk(not r['map'] and r['bag'], 'mantener el touchpad abre la mochila (no el mapa)')
    ev('()=>{const d=document.querySelector("dialog[open]");if(d)d.close()}')
    r = ev('''()=>{Object.defineProperty(navigator,'getGamepads',{configurable:true,value:()=>[]});mode='kb';menuOpen=true;MX.pl.inv=1e9;const px=P.pos.x,pz=P.pos.z,R=MX.ents.find(e=>e.team===1);
      spawnBullet(px+60,1,pz+40,1,0,WP[1],R);                                                     /* disparo a ~70 m: se oye */
      spawnBullet(300,1,300,1,0,WP[1],R);                                                          /* disparo muy lejos, sin aliados: no se oye */
      const ally=MX.ents.find(e=>e.team===0&&e.bot);ally.dead=false;ally.dwn=false;ally.inv=0;ally.hp=1e9;ally.p.set(400,0,-300);MX.hit(ally,5,R,1,0,WP[1]);   /* aliado bajo fuego a 850 m */
      menuOpen=false;MX.mapToggle();const t0=MX.M.t,x0=P.pos.x;keys.KeyD=true;for(let i=0;i<60;i++)update(1/60);keys.KeyD=false;
      const head=[...document.querySelectorAll('div')].find(d=>/MAPA TÁCTICO/.test(d.textContent)&&d.children.length<8);const C=MX.SQ.combatCells(0,px,pz),near=C.some(c=>!c.ally&&Math.hypot(c.x/c.w-px-60,c.z/c.w-pz-40)<25),far=C.some(c=>!c.ally&&Math.hypot(c.x/c.w-300,c.z/c.w-300)<30);return {open:MX.mapOpen,moved:Math.abs(P.pos.x-x0),dt:MX.M.t-t0,head:head?head.textContent:'',near,far}}''')
    print(r)
    chk(r['open'] and r['near'] and not r['far'], 'el mapa marca los disparos que se oyen (a menos de 150 m) y no los lejanos sin aliados')
    chk('1 grupo aliado bajo fuego' in r['head'], 'el fuego contra un aliado se ve aunque esté a 850 m')
    chk(r['dt'] > .9 and r['moved'] < .05, 'con el mapa abierto el mundo sigue (%.1f s) y el personaje no se mueve' % r['dt'])
    ev('()=>{const e=new KeyboardEvent("keydown",{code:"KeyM"});dispatchEvent(e)}'); chk(not ev('MX.mapOpen'), 'la tecla M también lo cierra')
    chk(not errs, 'sin errores JS ' + str(errs[:2]))
sys.exit(1 if bad else 0)
