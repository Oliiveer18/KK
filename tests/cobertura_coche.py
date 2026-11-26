"""Cobertura por zonas del coche: agachado junto al capó o al maletero es cobertura baja (se dispara por encima, la bala no toca el coche); junto a la cabina
es cobertura alta (la bala choca con el coche). También: una bala que cruzaría la cabina desde el capó choca, y los bots buscan puntos junto al capó y el maletero."""
import os, sys
from playwright.sync_api import sync_playwright
bad = 0
def chk(c, m):
    global bad
    print(('OK  ' if c else 'FALLO ') + m); bad += 0 if c else 1
with sync_playwright() as p:
    b = p.chromium.launch(executable_path='/usr/bin/google-chrome', args=['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'])
    pg = b.new_page(viewport={'width': 900, 'height': 500}); errs = []; pg.on('pageerror', lambda e: errs.append(str(e))); ev = pg.evaluate
    pg.goto('file://' + os.path.abspath('index.html') + '?mapa=1'); pg.wait_for_timeout(1200); ev('begin()'); pg.wait_for_timeout(800)
    for rot in (0, 1.5708, 3.1416):
        r = ev('''(rot)=>{menuOpen=true;for(const q of props.slice()){if(Math.hypot(q.x-20,q.z-20)<9)OBJ.removeObject(q)}
          const c=addProp('car',20,20,rot),g=rot,ax=[Math.cos(g),-Math.sin(g)],pr=[Math.sin(g),Math.cos(g)],at=(a,s)=>[20+ax[0]*a+pr[0]*s*1.5,20+ax[1]*a+pr[1]*s*1.5];
          const hood=at(1.5,1),cab=at(-.2,1),trunk=at(-1.8,-1);
          const out={hoodLow:lowCoverAt(c,...hood),trunkLow:lowCoverAt(c,...trunk),cabLow:lowCoverAt(c,...cab)};
          // disparo agachado junto al capó, cruzando el capó hacia el otro lado: no toca el coche
          const shot=(from,to)=>{BUL.forEach(q=>{q.on=false});c.hp=c.maxHp;const dx=to[0]-from[0],dz=to[1]-from[1],l=Math.hypot(dx,dz);P.cover=c;
            spawnBullet(from[0],.86,from[1],dx/l,dz/l,WP[1],null);for(let f=0;f<40;f++)updateBullets(1/60);return c.hp<c.maxHp};
          out.hitHood=shot(hood,at(1.5,-4));out.hitCab=shot(cab,at(-.2,-4));out.hitDiag=shot(hood,at(-2.5,-4));
          P.cover=null;OBJ.removeObject(c);return out}''', rot)
        print('  giro %.2f:' % rot, r)
        chk(r['hoodLow'] and r['trunkLow'] and not r['cabLow'], 'giro %.2f: capó y maletero son cobertura baja; la cabina no' % rot)
        chk(not r['hitHood'], 'giro %.2f: agachado junto al capó, la bala pasa por encima sin tocar el coche' % rot)
        chk(r['hitCab'] and r['hitDiag'], 'giro %.2f: la bala choca con el coche si cruza la cabina (desde la cabina o en diagonal desde el capó)' % rot)
    chk(not errs, 'sin errores JS ' + str(errs[:2]))
sys.exit(1 if bad else 0)
