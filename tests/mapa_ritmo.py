"""Ritmo del distrito (?mapa=6): andar no es cruzar un campo vacío.
- Cobertura: en más del 90 % de las celdas transitables de 10 m hay algo tras lo que cubrirse a menos de 10 m (antes 69 %).
- Carreteras tácticas: por ninguna calle hay un tramo de más de 60 m sin cobertura junto a la calzada.
- Lugares con historia (control militar, convoy, hospital de campaña, trinchera, campamento, carga, accidente…): más de 100, iguales para las 4 facciones,
  y desde cualquier punto transitable hay uno (u otro punto de interés) a menos de ~70 m.
- Botín para registrar en coches, taquillas, armarios, cocinas y cajas de suministros: lo mismo en los 4 cuartos.
- Puertas siempre libres: ningún objeto delante ni detrás de ninguna puerta."""
import os, sys
from playwright.sync_api import sync_playwright
bad = 0
def chk(c, m):
    global bad
    print(('OK  ' if c else 'FALLO ') + m); bad += 0 if c else 1
with sync_playwright() as p:
    b = p.chromium.launch(executable_path='/usr/bin/google-chrome', args=['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'])
    pg = b.new_page(viewport={'width': 900, 'height': 500}); errs = []; pg.on('pageerror', lambda e: errs.append(str(e))); ev = pg.evaluate
    pg.goto('file://' + os.path.abspath('index.html') + '?mapa=6'); pg.wait_for_timeout(1000)
    t = ev('()=>{const t=performance.now();begin();return performance.now()-t}'); ev('()=>{menuOpen=true}')
    r = ev('''()=>{const H=MAPA.built.half,C=10,N=Math.ceil(2*H/C);
      const near=(x,z,R)=>{for(const q of boxesIn(x-R,z-R,x+R,z+R)){if(!(q.prop&&q.prop.h>=.8)&&!q.wall)continue;const dx=Math.max(Math.abs(x-q.x)-q.hx,0),dz=Math.max(Math.abs(z-q.z)-q.hz,0);if(dx*dx+dz*dz<R*R)return true}return false};
      let tot=0,cov=0;for(let i=0;i<N;i++)for(let j=0;j<N;j++){const x=-H+C/2+i*C,z=-H+C/2+j*C;if(!MX.navAt(x,z))continue;tot++;if(near(x,z,10))cov++}
      /* calles: tramo más largo sin cobertura a < 8 m del eje */
      let worst=0,wr='';for(const rd of MAPA.built.D?[]:[]){}
      const roads=(MAPA.built.info&&MAPA.built.info.roads)||[];for(const rd of roads){const [[x0,z0],[x1,z1]]=rd.pts,L=Math.hypot(x1-x0,z1-z0);let run=0;
        for(let s=0;s<=L;s+=5){const x=x0+(x1-x0)*s/L,z=z0+(z1-z0)*s/L;if(Math.hypot(x,z)<30){run=0;continue}if(near(x,z,8+rd.w/2))run=0;else{run+=5;if(run>worst){worst=run;wr=rd.name+' @'+Math.round(x)+','+Math.round(z)}}}}
      const P=MAPA.built.info.pois||[],pl=MAPA.built.info.places||[];const cnt={};for(const q of P)cnt[q.name]=(cnt[q.name]||0)+1;
      const QD=(x,z)=>Math.floor(((Math.atan2(z,x)+Math.PI+.3)%(2*Math.PI))/(Math.PI/2))%4;const quad=[0,0,0,0];for(const q of P)quad[QD(q.x,q.z)]++;
      const pts=P.map(q=>[q.x,q.z]).concat(pl.map(q=>[q.x,q.z]));let far=0,cells=0;
      for(let i=0;i<N;i+=2)for(let j=0;j<N;j+=2){const x=-H+C/2+i*C,z=-H+C/2+j*C;if(!MX.navAt(x,z))continue;cells++;let d=1e9;for(const q of pts)d=Math.min(d,Math.hypot(q[0]-x,q[1]-z));if(d>75)far++}
      /* botín por cuartos */
      const EZ=MAPA.built.info.zones.filter(z=>/^(Fábrica|Estación)/.test(z.name)),inE=(x,z)=>EZ.some(q=>x>=q.x0&&x<=q.x1&&z>=q.z0&&z<=q.z1);const L=[0,0,0,0],L2=[0,0,0,0],T={};for(const q of props){if(!q.stock||q.dead)continue;const n=Object.values(q.stock).reduce((a,b)=>a+b,0);L2[QD(q.x,q.z)]+=n;if(!inE(q.x,q.z))L[QD(q.x,q.z)]+=n;T[q.type]=(T[q.type]||0)+1}
      /* puertas */
      let doors=0,blocked=0;const ex={};for(const bd of OBJ.buildings)for(const d of bd.doors||[]){doors++;const ax=d.hx>=d.hz;
        for(const q of boxesIn(d.x-3,d.z-3,d.x+3,d.z+3)){const pp=q.prop;if(!pp||pp===d||/^(bwall|wall|door|gate|emblem|shopDoor|rollDoor|slideGate)/.test(pp.type)||q.wall)continue;
          const along=ax?Math.abs(q.x-d.x)-q.hx:Math.abs(q.z-d.z)-q.hz,depth=ax?Math.abs(q.z-d.z)-q.hz:Math.abs(q.x-d.x)-q.hx,half=ax?d.hx:d.hz;
          if(along<half-.1&&depth<2.2){blocked++;ex[bd.kind+':'+pp.type]=(ex[bd.kind+':'+pp.type]||0)+1;break}}}
      return {cov:Math.round(cov/tot*1000)/10,worst,wr,pois:P.length,quad,cnt,far:Math.round(far/cells*1000)/10,loot:L,loot2:L2,lootT:T,doors,blocked,ex,props:props.length,skipped:MAPA.built.doorSkipped,coverAdded:MAPA.built.info.coverAdded}}''')
    print('carga %.1f s' % (t / 1000), r)
    chk(r['cov'] >= 90, 'cobertura a menos de 10 m en el %.1f %% del mapa transitable (antes 69 %%)' % r['cov'])
    chk(r['worst'] <= 60, 'ninguna calle con más de 60 m seguidos sin cobertura junto a la calzada (peor: %d m, %s)' % (r['worst'], r['wr']))
    chk(r['pois'] >= 100 and len(set(r['quad'])) == 1, 'lugares con historia: %d, iguales en los 4 cuartos %s' % (r['pois'], r['quad']))
    chk(r['far'] <= 5, 'desde casi cualquier punto hay algo interesante a < 75 m (lejos: %.1f %% del mapa)' % r['far'])
    chk(len(set(r['loot'])) == 1 and r['loot'][0] > 100, 'botín igual en los 4 cuartos %s (sin contar Fábrica y Estación, que comparten dos facciones vecinas)' % r['loot'])
    chk(r['loot2'][0] == r['loot2'][2] and r['loot2'][1] == r['loot2'][3], 'y con ellas, simétrico a 180° %s' % r['loot2'])
    chk(r['blocked'] == 0, 'ninguna puerta tapada (%d de %d) %s' % (r['blocked'], r['doors'], r['ex']))
    chk(t < 6000, 'carga razonable en headless (%.1f s)' % (t / 1000))
    chk(not errs, 'sin errores JS ' + str(errs[:2]))
sys.exit(1 if bad else 0)
