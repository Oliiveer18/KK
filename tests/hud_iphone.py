"""Interfaz de la campaña en un iPhone en horizontal (iPhone 13, 750 × 342 puntos): todo en las esquinas y nada se pisa. Arriba a la izquierda el minimapa;
arriba en el centro el marcador de dominio y los avisos; arriba a la derecha ⚙ y FPS discretos; abajo a la izquierda la vida y, encima, la escuadra
compacta; abajo en el centro la barra de captura (sólo dentro de un punto); abajo a la derecha el arma. La interfaz ocupa poco de la pantalla y el centro queda libre.
Con mando conectado no se ve el botón «Mochila» (se abre manteniendo el touchpad)."""
import os, sys
from playwright.sync_api import sync_playwright
bad = 0
def chk(c, m):
    global bad
    print(('OK  ' if c else 'FALLO ') + m); bad += 0 if c else 1
IDS = ['miniMap', 'domScore', 'sqToast', 'cfgBtn', 'fps', 'invBtn', 'sqPanel', 'capBar', 'ammo', 'wname', 'gren', 'dash', 'rl', 'ecoChip']
with sync_playwright() as p:
    b = p.chromium.launch(executable_path='/usr/bin/google-chrome', args=['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'])
    ctx = b.new_context(**p.devices['iPhone 13 landscape']); pg = ctx.new_page(); errs = []; pg.on('pageerror', lambda e: errs.append(str(e))); ev = pg.evaluate
    pg.goto('file://' + os.path.abspath('index.html') + '?mapa=6'); pg.wait_for_timeout(1000); ev('begin()'); pg.wait_for_timeout(500)
    ev('''()=>{const o=MX.SQ.objs.find(q=>q.code==='A');MX.pl.inv=1e9;MX.pl.p.set(o.x+2,0,o.z);P.pos.set(o.x+2,0,o.z);MX.SQ.toast('Orden: Mantener posición');MX.SQ.expandT=-99}''')
    pg.wait_for_function('()=>getComputedStyle(document.getElementById("capBar")).display!=="none"&&getComputedStyle(document.getElementById("sqPanel")).display!=="none"', timeout=10000); pg.wait_for_timeout(300)
    r = ev('''(ids)=>{const B=[];for(const id of ids){const e=document.getElementById(id);if(!e||getComputedStyle(e).display==='none'||e.hidden)continue;const q=e.getBoundingClientRect();if(q.width<2||q.height<2)continue;B.push({id,x0:q.left,y0:q.top,x1:q.right,y1:q.bottom})}
      const pb=MX.PB&&MX.PB.el.getBoundingClientRect();if(pb)B.push({id:'vida',x0:pb.left,y0:pb.top,x1:pb.right,y1:pb.bottom});
      const ov=[];for(let i=0;i<B.length;i++)for(let j=i+1;j<B.length;j++){const a=B[i],c=B[j];const w=Math.min(a.x1,c.x1)-Math.max(a.x0,c.x0),h=Math.min(a.y1,c.y1)-Math.max(a.y0,c.y0);if(w>1&&h>1)ov.push(a.id+'/'+c.id)}
      const W=innerWidth,H=innerHeight,G=4;let cov=0,tot=0;for(let x=0;x<W;x+=G)for(let y=0;y<H;y+=G){tot++;if(B.some(q=>x>=q.x0&&x<q.x1&&y>=q.y0&&y<q.y1))cov++}
      const cen=B.filter(q=>q.x1>W*.3&&q.x0<W*.7&&q.y1>H*.3&&q.y0<H*.7).map(q=>q.id);
      const out=B.filter(q=>q.x0<-1||q.y0<-1||q.x1>W+1||q.y1>H+1).map(q=>q.id);
      return {ids:B.map(q=>q.id),ov,cov:Math.round(cov/tot*1000)/10,cen,out}}''', IDS)
    print(r)
    chk(not r['ov'], 'ningún elemento de la interfaz pisa a otro %s' % r['ov'])
    chk(r['cov'] <= 17, 'la interfaz ocupa poco de la pantalla incluso con aviso, barra de captura y botón Mochila a la vez (%.1f %% en cajas)' % r['cov'])
    chk(not r['cen'], 'el centro de la pantalla queda libre %s' % r['cen'])
    chk(not r['out'], 'nada se sale de la pantalla %s' % r['out'])
    chk(all(i in r['ids'] for i in ['miniMap', 'domScore', 'sqPanel', 'capBar', 'vida', 'ammo']), 'están el minimapa, el marcador, la escuadra, la barra de captura, la vida y la munición')
    ev('''()=>{mode="pad";document.body.classList.add("pad");const o=MX.SQ.objs.find(q=>q.code==='A');MX.pl.p.set(o.x+40,0,o.z);P.pos.set(o.x+40,0,o.z);MX.SQ.toasts.length=0}'''); pg.wait_for_timeout(900)
    c2 = ev('''(ids)=>{const B=[];for(const id of ids){const e=document.getElementById(id);if(!e||getComputedStyle(e).display==='none'||e.hidden)continue;const q=e.getBoundingClientRect();if(q.width<2||q.height<2)continue;B.push(q)}
      const pb=MX.PB.el.getBoundingClientRect();B.push(pb);const W=innerWidth,H=innerHeight,G=4;let cov=0,tot=0;for(let x=0;x<W;x+=G)for(let y=0;y<H;y+=G){tot++;if(B.some(q=>x>=q.left&&x<q.right&&y>=q.top&&y<q.bottom))cov++}return Math.round(cov/tot*1000)/10}''', IDS)
    chk(c2 <= 13, 'jugando normal con mando (sin avisos ni captura): %.1f %% de la pantalla (antes 16,4 %% medido igual, con la escuadra pisando la vida)' % c2)
    chk(ev("getComputedStyle(document.getElementById('invBtn')).display==='none'"), 'con mando no se ve el botón «Mochila»')
    chk(not errs, 'sin errores JS ' + str(errs[:2]))
sys.exit(1 if bad else 0)
