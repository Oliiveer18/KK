"""Distrito completo (?mapa=6, v3 simétrico): 11 tipos de edificio (4 de cada objetivo propio, uno por facción), casas, retenes y atascos; sin solapes; refugios con salida y todos los puntos de interés alcanzables a pie desde los 4 refugios."""
import os, sys, time
from playwright.sync_api import sync_playwright
bad = 0; errs = []
def chk(c, m):
    global bad
    print(('OK  ' if c else 'FALLO ') + m); bad += 0 if c else 1
with sync_playwright() as p:
    b = p.chromium.launch(executable_path='/usr/bin/google-chrome', args=['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'])
    pg = b.new_page(viewport={'width': 1200, 'height': 800}); pg.on('pageerror', lambda e: errs.append(str(e))); ev = pg.evaluate
    pg.goto('file://' + os.path.abspath('index.html') + '?mapa=6'); pg.wait_for_timeout(1000)
    t = ev('()=>{const t=performance.now();begin();return Math.round(performance.now()-t)}'); pg.wait_for_timeout(1500)
    r = ev('''()=>{const D=MAPA.built,c={};for(const b of OBJ.buildings)c[b.kind]=(c[b.kind]||0)+1;let m=0;scene.traverse(o=>{if(o.isMesh)m++});
      const ps=props.filter(p=>!p.dead&&p.hx!==undefined);let ov=0,out=0;const E=.05;
      for(let i=0;i<ps.length;i++){const a=ps[i];if(Math.abs(a.x)+a.hx>D.half+.1||Math.abs(a.z)+a.hz>D.half+.1)out++;
        for(let j=i+1;j<ps.length;j++){const q=ps[j];if(Math.abs(a.x-q.x)<a.hx+q.hx-E&&Math.abs(a.z-q.z)<a.hz+q.hz-E){ov++;if(window.__ovs===undefined)window.__ovs=[];if(__ovs.length<6)__ovs.push([a.type,q.type,+a.x.toFixed(0),+a.z.toFixed(0)])}}}
      return {c,m,props:ps.length,ov,out,spawns:D.spawns.map(a=>a.length),hot:D.hot.length,ovs:window.__ovs||[]}}''')
    print('begin() %d ms · mallas %d · props %d · edificios %s' % (t, r['m'], r['props'], r['c']))
    chk(len(r['c']) == 11 - 0 and r['c'].get('house', 0) >= 40 and r['c'].get('gascanopy') == 4, 'los 11 tipos de edificio y %d casas' % r['c'].get('house', 0))
    chk(r['spawns'] == [6, 6, 6, 6], 'cada refugio tiene 6 puntos de aparición')
    print('solapes de props:', r['ov'], r['ovs'])
    chk(r['ov'] <= 16, 'solapes de objetos entre sí: %d (sólo los de siempre: emblema sobre el portón del refugio ×8 y las esquinas de muro de la clínica ×8)' % r['ov'])
    chk(r['out'] == 0, 'todo dentro del mapa')
    # alcanzabilidad sobre la malla de navegación (la misma que usan bots y zombis)
    a = ev('''()=>{const N=MX.NV,D=MAPA.built,cell=(x,z)=>Math.floor((z-N.oz)/N.cs)*N.w+Math.floor((x-N.ox)/N.cs);
      const free=c=>!N.bl[c];const out=[];
      for(let tm=0;tm<4;tm++){const s=D.spawns[tm][0];let st=cell(s.x,s.z);if(N.bl[st]){out.push({tm,error:'aparición bloqueada'});continue}
        const seen=new Uint8Array(N.n);const q=[st];seen[st]=1;for(let h=0;h<q.length;h++){const c=q[h],cx=c%N.w,cz=(c/N.w)|0;for(const [dx,dz] of [[1,0],[-1,0],[0,1],[0,-1]]){const nx=cx+dx,nz=cz+dz;if(nx<0||nz<0||nx>=N.w||nz>=N.h)continue;const k=nz*N.w+nx;if(!seen[k]&&!N.bl[k]){seen[k]=1;q.push(k)}}}
        const bad=[];for(const h of D.hot){let c=cell(h[0],h[1]);let ok=seen[c];if(!ok){for(let r=1;r<=3&&!ok;r++)for(let dz=-r;dz<=r&&!ok;dz++)for(let dx=-r;dx<=r;dx++){const k=c+dz*N.w+dx;if(k>=0&&k<N.n&&seen[k]){ok=1;break}}}if(!ok)bad.push([Math.round(h[0]),Math.round(h[1])])}
        out.push({tm,alcanzable:q.length,total:N.n,sinAlcanzar:bad})}
      return out}''')
    print(a)
    chk(all('error' not in x and not x['sinAlcanzar'] for x in a), 'desde los 4 refugios se llega a pie a todos los puntos de interés')
    chk(not errs, 'sin errores JS ' + str(errs[:2]))
sys.exit(1 if bad else 0)
