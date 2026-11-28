"""Prueba de campaña con el HTML autocontenido; usar PLAYWRIGHT_BROWSERS_PATH si procede."""
import os
from pathlib import Path
from playwright.sync_api import sync_playwright

root = Path(__file__).resolve().parents[1]
with sync_playwright() as pw:
    browser = pw.chromium.launch(executable_path='/usr/bin/google-chrome', args=['--use-angle=swiftshader','--enable-unsafe-swiftshader'])
    page = browser.new_page(viewport={'width':844,'height':390}, has_touch=True)
    errors = []
    page.on('pageerror', lambda e: errors.append(str(e)))
    page.route('http://kk.test/**', lambda r: r.fulfill(path=str(root/'index.html'))
               if r.request.url.split('?')[0].endswith('/index.html') else r.fulfill(status=204))
    page.goto('http://kk.test/index.html?mapa=4&bots=4', timeout=120000)
    page.evaluate('begin()')
    page.evaluate("""() => {
      const [p,b]=MX.ents, rival=MX.ents.find(e=>e.team!==p.team);
      const assert=(v,msg)=>{if(!v) throw Error(msg)};
      const hit=(e,n)=>{e.inv=0;MX.hit(e,n,rival,0,1)};
      const shelf=props.find(s=>s.type==='storeMat');
      p.p.set(shelf.x,0,shelf.z);
      const click=(prefix)=>{const btn=[...document.querySelectorAll('dialog button')].find(b=>b.textContent.startsWith(prefix));
        assert(btn,prefix);btn.click()};
      INVENTARIO.open();
      click('Retirar Casco 3');click('Equipar Casco 3');
      click('Retirar Chaleco 3');click('Equipar Chaleco 3');click('Cerrar');
      assert(p.hp+p.sh===200 && p.worn.helmet.points===30,'máximo');
      hit(p,20);
      assert(p.sh===80 && p.worn.helmet.points===24 && p.worn.vest.points===56,'desgaste');
      const worn=p.worn.helmet;
      assert(INVENTARIO.transfer(p,shelf,'helmet3',true,worn),'guardar');
      assert(p.sh===56 && INVENTARIO.transfer(p,shelf,'helmet3') && p.worn.helmet===worn && p.sh===80,'retirar mismo casco');
      INVENTARIO.open();click('Retirar Kit de reparación');[...document.querySelectorAll('dialog button')].find(b=>b.textContent==='Reparar con kit' && b.previousElementSibling.textContent.startsWith('Casco 3')).click();click('Cerrar');
      assert(p.bag.repair===0 && p.sh===86 && p.hp===100,'kit repara pieza equipada');
      assert(INVENTARIO.transfer(p,shelf,'vest3',true),'guardar chaleco');
      assert(INVENTARIO.transfer(p,shelf,'vest1'),'equipo mixto');
      assert(p.sh===55,'mixto');
      assert(b.sh===70,'bot con piezas medias');hit(b,20);
      assert(Math.abs(b.sh-50)<1e-8 && b.hp===100,'bot recibe daño proporcional');
      // Actualización normal, resistencia a daños nuevos durante la espera.
      p.inv=100;p.lastHurt=-100;
      for(let i=0;i<30;i++) MX.update(1/60);
      assert(p.sh===55,'sin regeneración de equipo');
      const start=MX.M.spawn[p.team][0];p.p.set(start.x,0,start.z);
      const material=OBJ.pickup('material',p.p.x,p.p.z);
      assert(INVENTARIO.transfer(p,material,'material'),'recoger material');
      hit(p,11);INVENTARIO.open();click('Reparar con material');click('Cerrar');
      assert(p.bag.material===0 && p.worn.helmet.points===30 && p.sh===50,'reparar en refugio');
      hit(p,65);assert(p.hp===85 && p.sh===0,'sobrante a vida');
      hit(p,500);assert(p.dwn && !p.dead,'abatido conserva equipo');
      hit(p,500);const corpse=OBJ.pickups.find(s=>s.ownerId===p.id);
      rival.p.copy(p.p);
      assert(corpse && INVENTARIO.transfer(rival,corpse,'helmet3',false,worn) && worn.points===0,'botín desgastado');
      p.respT=0;MX.update(.016);assert(p.hp===100 && !p.sh,'sin equipo tras muerte');
    }""")
    page.goto('http://kk.test/index.html?mapa=3',timeout=120000)
    page.evaluate('begin()')
    assert page.evaluate("""() => {
      const p=MX.pl;p.inv=0;MX.hit(p,60,MX.ents[7],0,1);
      return !MX.campaign && p.hp===90 && p.sh===0;
    }""")
    assert not errors, errors
    browser.close()
print('Protección, reparación, botín y regresión del mapa 3: OK')
