"""F4: interacción mantenida. Un interactuable de prueba se trabaja mientras se mantiene □/E: aro de progreso, fin a tiempo, cancelar al soltar o al ser herido,
reanimar tiene prioridad, el aro cabe en 844x390 y las herramientas aparecen en el inventario."""
import os
from playwright.sync_api import sync_playwright
bad = 0
def chk(c, m):
    global bad
    print(('OK  ' if c else 'FALLO ') + m); bad += 0 if c else 1
with sync_playwright() as p:
    b = p.chromium.launch(executable_path='/usr/bin/google-chrome', args=['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'])
    pg = b.new_page(viewport={'width': 844, 'height': 390}); errs = []; pg.on('pageerror', lambda e: errs.append(str(e))); ev = pg.evaluate
    pg.goto('file://' + os.path.abspath('index.html') + '?mapa=6'); pg.wait_for_timeout(1000); ev('begin()'); pg.wait_for_timeout(300)
    ev('''()=>{menuOpen=true;MX.zom.noRestock=true;for(const z of MX.zom.list){z.dead=true;z.st='dead';z.deadT=99};MX.pl.inv=1e9;
      for(const e of MX.ents){ if(e!==MX.pl){ e.p.set(-600,0,-600); e.inv=1e9; } } MX.pl.p.set(-340,0,-330); P.pos.set(-340,0,-330);
      window.done=0; window.item={x:-340,z:-328.5,label:'Prueba',time:2,tool:'palanca',key:'t1',done:()=>{window.done++}};
      MX.INT.reg('test',(pl,out)=>{ if(window.item) out.push(window.item) }); MX.INT.scanners.splice(0,MX.INT.scanners.length,MX.INT.scanners.find(s=>s.id==='test'));
      window.run=(s,held)=>{ for(let i=0;i<60*s;i++){ MX.rev=held; time+=1/60; update(1/60); } }; }''')
    ev('()=>{MX.pl.yaw=0;P.aim=0}')
    ev('()=>run(.5,true)'); r = ev('()=>({p:MX.INT.state.prog,tool:MX.INT.state.tool,busy:MX.INT.state.busy,d:window.done})')
    chk(.15 < r['p'] < .4 and r['busy'] and r['tool'] == 'palanca' and r['d'] == 0, 'a 0,5 s el progreso ronda 25 %% con la palanca (%s)' % r)
    box = ev('()=>{const e=document.getElementById("intRing");const r=e.getBoundingClientRect();return {d:getComputedStyle(e).display,l:r.left,t:r.top,r:r.right,b:r.bottom}}')
    chk(box['d'] != 'none' and box['l'] >= 0 and box['t'] >= 0 and box['r'] <= 844 and box['b'] <= 390, 'el aro es visible y cabe en 844x390 (%s)' % box)
    ev('()=>run(.5,false)'); r = ev('()=>MX.INT.state.prog'); chk(r < .2, 'al soltar el progreso retrocede (%.2f)' % r)
    ev('()=>run(1.2,true)'); ev('()=>{MX.pl.lastHurt=MX.M.t;}'); ev('()=>run(.1,true)'); r = ev('()=>({p:MX.INT.state.prog,d:window.done})')
    chk(r['d'] == 0, 'recibir daño detiene el trabajo (%s)' % r)
    ev('()=>run(3,true)'); r = ev('()=>window.done'); chk(r == 1, 'mantenido el tiempo completo termina exactamente una vez (%d)' % r)
    ev('()=>{window.item=null; run(.3,true)}'); r = ev('()=>({c:MX.INT.state.ctx,d:getComputedStyle(document.getElementById("intRing")).display})')
    chk(not r['c'] and r['d'] == 'none', 'sin interactuable no hay aro (%s)' % r)
    # reanimar tiene prioridad
    r = ev('''()=>{ window.item={x:-340,z:-328.5,label:'Prueba',time:1,key:'t2',done:()=>{window.done+=10}}; const a=MX.ents.find(e=>e!==MX.pl&&e.team===MX.pl.team&&!e.dead); a.dwn=true; a.p.set(-340,0,-329.2); a.dwT=0; a.revP=0; MX.pl.kits=3; const d0=window.done; run(1.5,true); const out={d:window.done-d0, rev:a.revP}; a.dwn=false; return out }''')
    chk(r['d'] == 0 and r['rev'] > 0, 'con un aliado abatido cerca, □ reanima y no interactúa (%s)' % r)
    # herramientas en el inventario
    ev('()=>{ menuOpen=false; MX.pl.dwn=false; MX.pl.dead=false; document.querySelector("dialog")&&0; }')
    txt = ev('()=>{ const f=document.querySelector("button#invBtn,#invBtn"); return null }')
    html = ev('''()=>{ const b=[...document.querySelectorAll('button')].find(x=>/inventario|mochila|🎒/i.test(x.id+x.title+x.textContent+x.className)); if(b) b.click(); const d=document.querySelector('dialog[open]'); return d?d.textContent:'' }''')
    chk('Herramientas' in html and 'Hacha' in html and 'Mazo' in html and 'Palanca' in html, 'el inventario muestra la sección Herramientas con hacha, mazo y palanca')
    chk(not errs, 'sin errores JS %s' % errs[:2])
    b.close()
print('FALLOS:', bad); raise SystemExit(1 if bad else 0)
