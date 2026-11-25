"""Bucles de sonido (humo, fuego, fugas): deben apagarse solos y no quedar sonando (también con el menú/pausa abiertos)."""
import os, sys
from playwright.sync_api import sync_playwright
errs = []; bad = 0
def chk(c, m):
    global bad
    print(('OK  ' if c else 'FALLO ') + m); bad += 0 if c else 1
with sync_playwright() as p:
    b = p.chromium.launch(executable_path='/usr/bin/google-chrome', args=['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--autoplay-policy=no-user-gesture-required'])
    pg = b.new_page(viewport={'width': 1100, 'height': 700}); pg.on('pageerror', lambda e: errs.append(str(e)))
    pg.goto('file://' + os.path.abspath('index.html') + '?mapa=3'); pg.wait_for_timeout(1200); ev = pg.evaluate
    ev('MX.want=true;begin()'); pg.wait_for_timeout(2500)
    ev('for(let i=0;i<60;i++) update(1/60)')
    n = lambda: ev('Object.keys(LOOPS).length')
    # bucle huérfano = su humo/fuego/objeto ya no existe (los bots también lanzan humo, así que no basta con contar)
    huer = lambda: ev('''()=>Object.keys(LOOPS).filter(k=>{const id=+k.slice(2);
      if(k.startsWith('sm')) return !clouds.some(c=>c.id===id);
      if(k.startsWith('fz')) return !FIRES.some(f=>f.id===id);
      return !props.some(p=>String(p.uid)===k.slice(2)&&!p.dead)})''')
    print('muestras SMOKE_loop', ev('(SND.buf.SMOKE_loop||[]).length'), 'FIRE_loop', ev('(SND.buf.FIRE_loop||[]).length'), 'ctx', ev('ac&&ac.state'))
    ev('MX.pl.hp=1e9')
    # humo + fuego cerca del jugador
    ev('()=>{for(let i=0;i<3;i++) popSmoke({x:P.pos.x+i,z:P.pos.z}); igniteZone(P.pos.x+2,P.pos.z+1,.8,3)}')
    ev('for(let i=0;i<120;i++) update(1/60)'); a = n(); print('bucles activos con humo+fuego:', a, ev('Object.keys(LOOPS)'))
    chk(a > 0, 'hay bucles sonando mientras hay humo/fuego')
    ev('for(let i=0;i<60*22;i++) update(1/60)'); b2 = huer(); print('22 s después: huérfanos', b2, 'activos', ev('Object.keys(LOOPS)'))
    chk(not b2, 'no queda ningún bucle huérfano al acabar humo/fuego')
    # pausa: con bucles activos se abre el menú (update no corre) y se simula el bucle de fotogramas
    ev('()=>{popSmoke({x:P.pos.x,z:P.pos.z})}'); ev('for(let i=0;i<30;i++) update(1/60)'); c = n()
    ev('openMenu()'); ev('()=>{for(let i=0;i<120;i++){ if(menuOpen){menuTick();loopTick(1/60)} else update(1/60); }}')
    d = ev('Object.values(LOOPS).map(l=>+l.g.gain.value.toFixed(3))'); print('en pausa: bucles', n(), 'ganancias', d)
    chk(c > 0 and n() == 0, 'con el menú abierto los bucles se silencian')
    ev('closeMenu()'); ev('for(let i=0;i<60;i++) update(1/60)'); chk(n() > 0, 'al cerrar el menú el humo vuelve a sonar')
    # partida larga con bots: sin acumulación
    ev('for(let i=0;i<60*120;i++) update(1/60)'); mx = ev('Object.keys(LOOPS).length'); print('tras 2 min de partida:', mx)
    ev('for(let i=0;i<60*30;i++) update(1/60)'); h = huer(); print('al final: huérfanos', h, 'activos', ev('Object.keys(LOOPS)'))
    chk(not h and n() <= 14, 'tras la partida larga no hay bucles huérfanos')
    print('ERRORES JS:', errs or 'ninguno'); bad += len(errs)
sys.exit(1 if bad else 0)
