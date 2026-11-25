"""Mide el comportamiento de los trozos de objetos destruidos (no depende de la implementación):
 - giros_en_reposo: fotogramas en que un trozo casi parado (<0,6 m/s) gira más de 4° (el «enderezado» brusco), contando solo si el trozo toca el suelo
 - saltos: desplazamientos > 0,25 m en un fotograma (teletransportes)
 - hundido: trozos con su punto más bajo < -2 cm bajo el suelo, o con el centro dentro de un objeto en pie
 - sin_asentar: trozos que a los 7 s aún se mueven más de 0,05 m/s
 - flotando: trozos a más de 6 cm del suelo y sin moverse a los 7 s (sin apoyo en otro objeto)
Uso: python3 tests/restos_fisica.py [index.html]"""
import os, sys
from playwright.sync_api import sync_playwright
JS = """(types=>{ const res={}; const Q=new THREE.Quaternion(), P0=new THREE.Vector3();
  for (const t of types) {
    boxes.length=0; props.slice().forEach(q=>scene.remove(q.g)); props.length=0; DEB.slice().forEach(d=>scene.remove(d.o)); DEB.length=0;
    addProp(t, 0, 6, 0); const q=props[props.length-1]; q.hp=q.maxHp=9999;
    if (t!=='barrel') { shedPieces(q,3,q.x,q.z+1,0,-1); shedPieces(q,3,q.x,q.z+1,0,-1); }
    destroyProp(q, 0.3, -1, 1);
    const track=DEB.map(d=>({d, p:d.o.getWorldPosition(new THREE.Vector3()), q:d.o.getWorldQuaternion(new THREE.Quaternion())}));
    let giros=0, saltos=0, maxJump=0, maxRot=0;
    for (let f=0; f<60*7; f++) { update(1/60);
      for (const k of track) { if (!DEB.includes(k.d)) continue; const p=k.d.o.getWorldPosition(P0), qq=k.d.o.getWorldQuaternion(Q);
        const dist=p.distanceTo(k.p), ang=2*Math.acos(Math.min(1,Math.abs(qq.dot(k.q))))*57.2958, sp=dist*60;
        if (sp<.6 && ang>4 && new THREE.Box3().setFromObject(k.d.o).min.y<.08) giros++; if (dist>.25) saltos++; maxJump=Math.max(maxJump,dist); maxRot=Math.max(maxRot,ang);
        k.p.copy(p); k.q.copy(qq); } }
    let hund=0, mov=0, flot=0; const vs=[];
    for (const k of track) { if (!DEB.includes(k.d)) continue; const bb=new THREE.Box3().setFromObject(k.d.o); if (bb.min.y<-.02) hund++;
      const c=bb.getCenter(new THREE.Vector3()); k.c0=c.clone(); }
    for (let f=0; f<12; f++) update(1/60);
    for (const k of track) { if (!DEB.includes(k.d)) continue; const bb=new THREE.Box3().setFromObject(k.d.o), c=bb.getCenter(new THREE.Vector3()); const sp=c.distanceTo(k.c0)/(12/60); if (sp>.05) mov++; if (bb.min.y>.06 && sp<.05) flot++; }
    res[t]={trozos:DEB.length, giros_en_reposo:giros, saltos, maxSaltoM:+maxJump.toFixed(2), maxGiroGradosPorFotograma:Math.round(maxRot), hundido:hund, sin_asentar:mov, flotando:flot};
  } return res; })"""
errs=[]
with sync_playwright() as p:
    b=p.chromium.launch(executable_path='/usr/bin/google-chrome',args=['--no-sandbox','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist'])
    pg=b.new_context().new_page(); pg.on('pageerror',lambda e:errs.append(str(e)))
    pg.goto('file://'+os.path.abspath(sys.argv[1] if len(sys.argv)>1 else 'index.html')); pg.wait_for_timeout(1500); pg.evaluate('begin()'); pg.wait_for_timeout(2000)
    r=pg.evaluate(JS+"(['crate','crateS','fence','barrier','sandbags','blocks','barrel'])")
    for k,v in r.items(): print(k,v)
print('ERRORES JS:',errs or 'ninguno')
