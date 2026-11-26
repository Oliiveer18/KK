"""Impactos con la pose visible y oclusión en el distrito completo."""
from pathlib import Path
from playwright.sync_api import sync_playwright

with sync_playwright() as pw:
    browser = pw.chromium.launch(args=['--use-angle=swiftshader','--enable-unsafe-swiftshader'])
    page = browser.new_page()
    page.goto((Path(__file__).resolve().parents[1]/'index.html').as_uri()+'?mapa=6&bots=4')
    page.evaluate('begin()')
    print(page.evaluate("""() => {
      const check=(ok,msg)=>{if(!ok)throw Error(msg)};
      const zs=MX.zom;
      // Un pasillo libre del distrito, lejos de combatientes y otros zombis.
      let x,z;
      outer:for (let a=-480;a<480;a+=5) for (let b=-480;b<480;b+=5) {
        if (boxesIn(a-6,b-4,a+6,b+4).some(o=>Math.abs(a-o.x)<6+o.hx && Math.abs(b-o.z)<4+o.hz)) continue;
        if ([...MX.ents,...zs.list].some(e=>Math.hypot(a-e.p.x,b-e.p.z)<10)) continue;
        x=a;z=b;break outer;
      }
      check(x!==undefined,'zona libre');
      MX.pl.p.set(x-5,0,z);camera.position.set(x+5,12,z+7);camera.lookAt(x,1,z);camera.updateMatrixWorld();
      const fire=b=>{spawnBullet(x-3,1.2,b,1,0,WP[0],MX.pl);for(let i=0;i<15;i++)updateBullets(.016)};
      for (const type of ['walker','runner','brute','screamer']) {
        const target=zs.spawn(type,x,z,{st:'wander',yaw:0});
        check(target,'aparición');target.thinkT=100;target.wait=100;
        for(const state of ['dorm','wander','chase','attack']){
          target.st=state;target.atk=state==='attack' ? .28 : -1;target.v.set(0,0,state==='chase'?2:0);
          zs.update(.001);check(target.ri>=0,'pose visible');
          const head=new V3(target.hdx,target.hdy,target.hdz);
          const chest=new V3(target.chx,target.chy,target.chz);
          if(state==='dorm'||state==='wander')
            check(Math.hypot(head.x-target.p.x,head.z-target.p.z)<.4*target.sc,'postura '+type);
          const pointer=new THREE.Ray(camera.position.clone(),head.clone().sub(camera.position).normalize());
          const aim=new V3();zs.aimAtPose(pointer,aim);
          check(aim.distanceTo(head)<.001,'apuntar a la cabeza visible');
          for(const pos of [head,chest]){
            const t=zs.hitDistance(target,x-3,pos.z,1,0,0,5);
            check(Number.isFinite(t),'trayectoria sobre pose');
            check(castRay(x-3,pos.z,1,0,5).hit===target,'mira');
            target.hp=1000;fire(pos.z);check(target.hp<1000,'impacto real '+type);
          }
          check(zs.hitDistance(target,head.x,head.z,1,0,0,1)===0,'contacto a quemarropa');
        }
        target.hp=1000;fire(z+2.5);check(target.hp===1000,'disparo fuera de silueta');
        const wall={x:x-1.6,z,hx:.25,hz:1.5,h:4,wall:true};boxes.push(wall);
        check(castRay(x-3,z,1,0,6).hit==='wall','mira contra muro');
        fire(z);check(target.hp===1000,'cobertura');
        boxes.splice(boxes.indexOf(wall),1);target.dead=true;
      }
      return 'Cuatro tipos: postura, mira, impactos, disparos fallidos y cobertura OK';
    }"""))
    browser.close()
