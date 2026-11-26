"""Efecto visual del dash (DASHFX, src/efectos.js): sin dash no cuesta nada (0 mallas visibles); con dash son 3 llamadas de dibujo como mucho, ningún shader nuevo,
(el dash de los bots usa las mismas llamadas desde partida.js). Y los bots corren: con velocidad alta toman la pose de carrera (torso inclinado, e.run → 1)."""
import os, sys
from playwright.sync_api import sync_playwright
bad = 0
def chk(c, m):
    global bad
    print(('OK  ' if c else 'FALLO ') + m); bad += 0 if c else 1
with sync_playwright() as p:
    b = p.chromium.launch(executable_path='/usr/bin/google-chrome', args=['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'])
    pg = b.new_page(viewport={'width': 900, 'height': 500}); errs = []; pg.on('pageerror', lambda e: errs.append(str(e))); ev = pg.evaluate
    pg.goto('file://' + os.path.abspath('index.html') + '?mapa=6'); pg.wait_for_timeout(1200); ev('begin()'); pg.wait_for_timeout(2000)
    ev('()=>{menuOpen=true;renderer.info.autoReset=false}')
    n0 = ev('renderer.info.programs.length')
    r = ev('''()=>{ const idle=DASHFX.mallas.filter(m=>m.visible).length; const out={idle};
      renderer.info.reset(); renderer.render(scene,camera); out.callsIdle=renderer.info.render.calls;
      DASHFX.start(P.pos.x,P.pos.z,1,0,0x7ec0ff); for(let i=0;i<4;i++){DASHFX.trail(P,P.pos.x+i*.3,P.pos.z,1,0,0x7ec0ff);DASHFX.update(1/60);}
      out.vis=DASHFX.mallas.filter(m=>m.visible).length; renderer.info.reset(); renderer.render(scene,camera); out.callsDash=renderer.info.render.calls;
      for(let i=0;i<60;i++)DASHFX.update(1/60); out.after=DASHFX.vivos; out.visAfter=DASHFX.mallas.filter(m=>m.visible).length; return out}''')
    print(r)
    chk(r['idle'] == 0, 'sin dash no hay ninguna malla de efecto visible')
    chk(0 < r['vis'] <= 3 and r['callsDash'] - r['callsIdle'] <= 3 + 3, 'con dash: %d mallas, %d llamadas más (las 3 del efecto como mucho; la sombra no las dibuja)' % (r['vis'], r['callsDash'] - r['callsIdle']))
    chk(r['after'] == 0 and r['visAfter'] == 0, 'a los ~1 s todo se ha apagado y devuelto a la reserva')
    chk(ev('renderer.info.programs.length') == n0, 'ningún shader nuevo por el efecto (%d programas)' % n0)
    # carrera: pose
    r3 = ev('''()=>{ const e=MX.M.ents.find(o=>o.bot&&!o.dead); e.firing=false; e.st='push'; e.crouch=0; e.yaw=0;
      const out=[]; for(const v of [2.5,8]){ e.v.set(0,0,v); for(let i=0;i<40;i++){ MX.poseBot(e,1/60) } out.push([v, +e.run.toFixed(2), +e.R.torso.position.z.toFixed(3)-+e.p.z.toFixed(3)]); } return out }''')
    print(r3)
    chk(r3[0][1] < .05 and r3[1][1] > .9, 'al paso e.run ≈ 0 y a 8 m/s e.run ≈ 1')
    chk(not errs, 'sin errores JS ' + str(errs[:2]))
sys.exit(1 if bad else 0)
