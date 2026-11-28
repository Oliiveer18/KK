"""Fuego amigo con granadas (?mapa=6): una granada NO hiere ni empuja a los compañeros de equipo; sí a los rivales y al propio lanzador. Vale para la del jugador y la de un bot. Los barriles siguen hiriendo a todos."""
import os, sys
from playwright.sync_api import sync_playwright
bad = 0
def chk(c, m):
    global bad
    print(('OK  ' if c else 'FALLO ') + m); bad += 0 if c else 1
with sync_playwright() as p:
    b = p.chromium.launch(executable_path='/usr/bin/google-chrome', args=['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'])
    pg = b.new_page(viewport={'width': 900, 'height': 500}); errs = []; pg.on('pageerror', lambda e: errs.append(str(e))); ev = pg.evaluate
    pg.goto('file://' + os.path.abspath('index.html') + '?mapa=6'); pg.wait_for_timeout(1000); ev('begin()'); pg.wait_for_timeout(300)
    r = ev('''()=>{ const E=MX.ents, pl=MX.pl; const mates=E.filter(e=>e!==pl&&e.team===pl.team&&!e.dead).slice(0,2), foe=E.find(e=>e.team!==pl.team&&!e.dead); const out={}, O=new V3();
      const setup=()=>{ for(const e of E){ if(e!==pl&&!mates.includes(e)&&e!==foe) e.p.set(300,0,300); e.inv=0; e.dead=false; e.dwn=false; e.hp=100; e.sh=50; } const x=pl.p.x,z=pl.p.z; O.set(x+1.5,.5,z+1.5); pl.p.set(x,0,z); mates[0].p.set(x+3,0,z+1.5); mates[1].p.set(x+1.5,0,z+3); foe.p.set(x+1.5,0,z); };
      const hp=e=>e.hp+(e.sh||0);
      setup(); explode(O, undefined, 1, undefined, null); out.player={mate0:hp(mates[0]),mate1:hp(mates[1]),foe:hp(foe),self:hp(pl)};
      setup(); const bot=mates[0]; explode(O, undefined, 1, undefined, bot); out.bot={self:hp(bot),other:hp(mates[1]),player:hp(pl),foe:hp(foe)};
      setup(); explode(O, 4.2, .85, 'barrel', null); out.barrel={mate0:hp(mates[0]),self:hp(pl)}; return out }''')
    print(r)
    pl = r['player']; chk(pl['mate0'] == 150 and pl['mate1'] == 150, 'granada del jugador: los compañeros no pierden vida (%s)' % [pl['mate0'], pl['mate1']])
    chk(pl['foe'] < 150, 'granada del jugador: el rival sí la pierde (%s)' % pl['foe']); chk(pl['self'] < 150, 'el lanzador se hiere con su propia granada (%s)' % pl['self'])
    bt = r['bot']; chk(bt['other'] == 150 and bt['player'] == 150, 'granada de un bot: ni el jugador ni su compañero pierden vida')
    chk(bt['foe'] < 150, 'granada de un bot: el rival sí la pierde (%s)' % bt['foe'])
    br = r['barrel']; chk(br['mate0'] < 150 or br['self'] < 150, 'un barril explosivo sigue hiriendo a todos (%s)' % br)
    chk(not errs, 'sin errores JS ' + str(errs[:2]))
sys.exit(1 if bad else 0)
