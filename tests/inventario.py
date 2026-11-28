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
    page.evaluate('''() => { const p=MX.pl; p.p.set(-40,0,-5);
      OBJ.pickup('revive',p.p.x,p.p.z); }''')
    page.get_by_role('button',name='Mochila',exact=True).click()
    page.get_by_role('button',name='Recoger Kit de reanimación',exact=False).first.click()
    assert page.evaluate('MX.pl.kits')==2
    page.get_by_role('button',name='Cerrar',exact=True).click()
    page.evaluate("""() => {
      const [me,ally]=MX.ents, rival=MX.ents.find(e=>e.team===1);
      const shelf=props.find(p=>p.type==='storeMed');
      for(const e of [me,ally,rival]) e.p.set(shelf.x,0,shelf.z);
      const check=(v,s)=>{if(!v) throw Error(s)};
      check(INVENTARIO.transfer(me,shelf,'revive',true),'depósito');
      check(INVENTARIO.transfer(ally,shelf,'revive'),'retirada compartida');
      check(!INVENTARIO.transfer(rival,shelf,'revive'),'doble retirada');
      me.inv=0; MX.hit(me,500,rival,0,1);
      check(me.dwn && !me.dead && me.kits===1,'abatido conserva inventario');
      ally.vis=false; ally.lastHurt=-99;
      // El jugador salva a otro aliado con el sistema normal de rescate.
      MX.hit(me,500,rival,0,1);
      check(me.dead && me.kits===0,'muerte y vaciado');
      const loot=OBJ.pickups.find(s=>s.ownerId===me.id);
      check(loot && loot.stock.pack1===1,'equipo en el suelo');
      check(INVENTARIO.transfer(rival,loot,'revive'),'rival recupera kit');
      check(!INVENTARIO.transfer(ally,loot,'revive'),'mismo kit agotado');
      const material=OBJ.pickup('material',rival.p.x,rival.p.z);
      rival.bag.material=INVENTARIO.capacity(rival.bag)-INVENTARIO.count(rival.bag);
      check(!INVENTARIO.transfer(rival,material,'material'),'límite de capacidad');
      me.respT=0; MX.update(.016);
      check(!me.dead && INVENTARIO.count(me.bag)===0,'reaparición vacía');
      ally.inv=0; MX.hit(ally,500,rival,0,1); check(ally.dwn,'objetivo abatido');
      const kit=OBJ.pickup('revive',me.p.x,me.p.z); INVENTARIO.transfer(me,kit,'revive');
      ally.p.copy(me.p);me.lastHurt=-99;keys.KeyE=true;
      for(let i=0;i<360 && ally.dwn;i++){MX.rev=true;MX.update(1/60);}
      keys.KeyE=false;
      check(!ally.dwn && !ally.dead && me.kits===0,'reanimación consume el kit');
    }""")
    assert not errors, errors
    page.goto('http://kk.test/index.html?mapa=6&bots=4', timeout=120000)
    page.evaluate('begin()')
    assert page.evaluate("""() => {
      const cabinet=props.find(p=>p.type==='pharmaCab'), shelf=props.find(p=>p.type==='storeMed');
      if (!cabinet || !shelf) return false;
      const p=MX.pl; p.p.set(cabinet.x,0,cabinet.z);
      if (!INVENTARIO.transfer(p,cabinet,'revive')) return false;
      p.p.set(shelf.x,0,shelf.z);
      return INVENTARIO.transfer(p,shelf,'revive',true);
    }""")
    assert not errors, errors
    browser.close()
print('Inventario, almacén, muerte y reanimación: OK')
