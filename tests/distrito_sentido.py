"""El distrito completo (?mapa=6) tiene sentido: carreteras unidas, nada que no deba estar en la calzada, retenes por los que se puede pasar, edificios y árboles fuera de las calles,
refugios con salida, todo alcanzable a pie, los 76 tipos y los 11 edificios presentes."""
import os, sys
from playwright.sync_api import sync_playwright
bad = 0; errs = []
def chk(c, m):
    global bad
    print(('OK  ' if c else 'FALLO ') + m); bad += 0 if c else 1
with sync_playwright() as p:
    b = p.chromium.launch(executable_path='/usr/bin/google-chrome', args=['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'])
    pg = b.new_page(viewport={'width': 1100, 'height': 700}); pg.on('pageerror', lambda e: errs.append(str(e))); ev = pg.evaluate
    pg.goto('file://' + os.path.abspath('index.html') + '?mapa=6'); pg.wait_for_timeout(1000); ev('begin()'); pg.wait_for_timeout(1500)
    # 1) carreteras unidas: cada extremo de calle está en el borde del mapa o sobre otra calle
    r = ev('''()=>{const D=MAPA.data.M2(),RI=MAPA.roadIndex(D.roads),out=[];for(const r of D.roads){for(const [i,e] of [[0,r.pts[0]],[1,r.pts[r.pts.length-1]]]){
        const edge=Math.abs(e[0])>=495||Math.abs(e[1])>=495;let onOther=false;if(!edge){onOther=RI.near(e[0],e[1],0.5,r)}if(!edge&&!onOther)out.push([r.name,i?'fin':'inicio',Math.round(e[0]),Math.round(e[1])])}}
      return {sueltas:out,n:D.roads.length}}''')
    print('calles:', r['n'], '· extremos sueltos:', r['sueltas'])
    chk(not r['sueltas'], 'todas las carreteras se unen entre sí o llegan al borde del mapa (sin trozos sueltos)')
    # 2) nada que no deba estar en la calzada; árboles y edificios fuera de las calles
    r = ev('''()=>{const D=MAPA.data.M2(),RI=MAPA.roadIndex(D.roads);const OKA=new Set(['car','barrier','blocks','crate','crateS','barrel','barrelFuel','dumpster','wheelie','cart','pallet','forklift']);
      const mal=[];for(const o of D.objects){const f=MAPA.fp(o.t,o.g||0);if(!f)continue;let on=false;for(const [px,pz] of [[0,0],[1,1],[1,-1],[-1,1],[-1,-1]])if(RI.gap(o.x+px*f.hx,o.z+pz*f.hz)<-0.2)on=true;if(on&&!OKA.has(o.t))mal.push([o.t,Math.round(o.x),Math.round(o.z)])}
      let arb=0;for(const t of D.trees)if(RI.gap(t[0],t[1])<8)arb++;
      let ed=0;for(const b of D.buildings){const f=OBJ.footprint(b.k,b.rot||0,{});for(const [px,pz] of [[1,1],[1,-1],[-1,1],[-1,-1]])if(RI.gap(b.x+px*f.hx,b.z+pz*f.hz)<3){ed++;break}}
      return {mal:mal.slice(0,8),nmal:mal.length,arb,ed,nobj:D.objects.length,nedif:D.buildings.length,ntrees:D.trees.length}}''')
    print(r)
    chk(r['nmal'] == 0, 'ningún muro, portón, torre, saco, farola ni mobiliario en la calzada (sólo vehículos, vallas, bloques, cajas y barriles) %s' % r['mal'][:3])
    chk(r['arb'] == 0, 'ningún árbol a menos de 8 m del asfalto (%d)' % r['ntrees'])
    chk(r['ed'] == 0, 'ningún edificio invade la calle ni la acera (%d edificios)' % r['nedif'])
    # 3) retenes pasables: hay un camino entre 14 m antes y 14 m después que no se sale de la calle (asfalto + acera) y no da un rodeo largo
    r = ev('''()=>{const D=MAPA.built.info,Dd=MAPA.data.M2(),RI=MAPA.roadIndex(Dd.roads),res=[];const rets=D.places.filter(p=>p.id==='RET');
      for(const p of rets){let best=null;for(const [dx,dz] of [[1,0],[0,1]]){const a={x:p.x-dx*14,z:p.z-dz*14},b={x:p.x+dx*14,z:p.z+dz*14};if(RI.gap(a.x,a.z)>2||RI.gap(b.x,b.z)>2)continue;
          const path=MX.findPath(a.x,a.z,b.x,b.z);if(!path)continue;let L=0,fuera=0;for(let i=1;i<path.length;i++)L+=Math.hypot(path[i].x-path[i-1].x,path[i].z-path[i-1].z);for(const q of path)if(RI.gap(q.x,q.z)>3.4)fuera++;
          if(best===null||L<best.L)best={L:+L.toFixed(1),fuera}}
        res.push(best)}
      return {n:res.length,ok:res.filter(x=>x&&x.fuera===0&&x.L<40).length,malos:res.map((x,i)=>x?null:[rets[i].x,rets[i].z]).filter(x=>x)}}''')
    print('retenes:', r)
    chk(r['n'] >= 12 and r['ok'] == r['n'], 'se puede cruzar cada retén por la calle sin salirse de ella (%d de %d)' % (r['ok'], r['n']))
    # 4) lo demás: edificios, refugios, alcanzabilidad, cobertura
    r = ev('''()=>{const D=MAPA.built,c={};for(const b of OBJ.buildings)c[b.kind]=(c[b.kind]||0)+1;
      const N=MX.NV,cell=(x,z)=>Math.floor((z-N.oz)/N.cs)*N.w+Math.floor((x-N.ox)/N.cs),res=[];
      for(let tm=0;tm<4;tm++){const s=D.spawns[tm][0],st=cell(s.x,s.z);if(N.bl[st]){res.push('bloqueada');continue}const seen=new Uint8Array(N.n);const q=[st];seen[st]=1;for(let h=0;h<q.length;h++){const c=q[h],cx=c%N.w,cz=(c/N.w)|0;for(const [dx,dz] of [[1,0],[-1,0],[0,1],[0,-1]]){const nx=cx+dx,nz=cz+dz;if(nx<0||nz<0||nx>=N.w||nz>=N.h)continue;const k=nz*N.w+nx;if(!seen[k]&&!N.bl[k]){seen[k]=1;q.push(k)}}}
        let bad=0;for(const h of D.hot){if(!seen[cell(h[0],h[1])]){let ok=false;for(let d=-3;d<=3&&!ok;d++)for(let e=-3;e<=3;e++){const k=cell(h[0],h[1])+d*N.w+e;if(k>=0&&k<N.n&&seen[k]){ok=true;break}}if(!ok)bad++}}res.push(bad)}
      const used=new Set(props.map(p=>p.type));const all=[...OBJ.types,"crate","crateS","barrier","barrel","barrelFuel","fence","sandbags","blocks"];
      return {kinds:Object.keys(c).length,houses:c.house||0,spawns:D.spawns.map(a=>a.length),alc:res,faltan:all.filter(k=>!used.has(k))}}''')
    print(r)
    chk(r['kinds'] == 11 and r['houses'] >= 40, 'los 11 tipos de edificio y %d casas' % r['houses'])
    chk(r['spawns'] == [6, 6, 6, 6] and all(x == 0 for x in r['alc']), 'desde los 4 refugios se llega a pie a todos los puntos de interés %s' % r['alc'])
    chk(not r['faltan'], 'los 76 tipos de objeto aparecen en el mapa %s' % r['faltan'])
    chk(not errs, 'sin errores JS ' + str(errs[:2]))
sys.exit(1 if bad else 0)
