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
      const p=MX.pl, shelf=props.find(s=>s.type==='storeMat');
      const buttons=()=>[...document.querySelectorAll('dialog[open] button')];
      const find=t=>buttons().find(b=>b.textContent.startsWith(t));
      const click=t=>{const b=find(t); if(!b)throw Error('Falta acción '+t); b.click()};
      const check=(ok,t)=>{if(!ok)throw Error(t)};
      const damage=(piece,n)=>damageProp(piece,n,piece.x,piece.z,0,1,'blast');
      const advance=seconds=>{for(let i=0;i<Math.ceil(seconds*60)+1;i++)OBRAS.tick(1/60)};
      for(const e of MX.ents) if(e!==p)e.p.set(20,0,20);
      for(const z of MX.zom.list)z.p.set(25,0,25);
      function supplies(n){
        p.p.set(shelf.x,0,shelf.z);
        for(const item of ['helmet2','vest2']) if(p.bag[item]) INVENTARIO.transfer(p,shelf,item,true);
        while ((p.bag.material||0)<n) check(INVENTARIO.transfer(p,shelf,'material'),'sacar materiales');
      }
      for(const kind of ['wall','gate']){
        let cost2=kind==='wall'?3:4,cost3=kind==='wall'?6:8;
        let piece=props.find(s=>s.type===kind+'1');
        const approach=()=>p.p.set(piece.x+1.4,0,piece.z);
        const fresh=level=>props.find(s=>s.type===kind+level && s.x===piece.x && s.z===piece.z);
        const open=()=>{approach();INVENTARIO.open()};
        damage(piece,20);open();
        check(!find('Mejorar')&&!find('Reparar'),'sin materiales o mejora sobre daño');document.querySelector('dialog').close();
        supplies(1);open();click('Reparar');advance(1);
        p.p.x+=8;advance(.1);check(p.bag.material===1,'interrupción sin cobro');
        open();click('Retomar');advance(5);
        piece=fresh(1);check(piece && piece.hp===piece.maxHp && !p.bag.material,'reparación al mismo nivel');
        supplies(cost2);open();click('Mejorar');advance(13);
        piece=fresh(2);check(piece && piece.hp===piece.maxHp && !p.bag.material,'mejorar nivel 2');
        damage(piece,100000);check(piece.dead,'brecha');
        MX.update(.016);check(MX.navAt(piece.x,piece.z),'navegación por brecha');
        supplies(kind==='wall'?1:2);open();click('Reparar');p.p.set(piece.x,0,piece.z);
        advance(6);check(!fresh(2) && p.bag.material>0,'esperar a que se despeje la brecha');
        approach();advance(.1);piece=fresh(2);
        check(piece && !p.bag.material,'reconstrucción sin duplicados');MX.update(.016);
        check(!MX.navAt(piece.x,piece.z),'colisión recuperada');
        supplies(cost3);open();click('Mejorar');advance(13);
        piece=fresh(3);check(piece && !p.bag.material,'mejorar nivel 3');
        open();check(!find('Mejorar'),'tope tres');
        if(kind==='gate'){click('Abrir puerta');check(piece.open,'portón transitable');
          check(props.filter(s=>s.type==='gateInner').length===1,'segunda puerta');}
        document.querySelector('dialog').close();
      }
      // Recorrer el menú con los botones del DualSense, incluido el panel táctil.
      const pad={connected:true,buttons:Array.from({length:18},()=>({pressed:false}))};
      Object.defineProperty(navigator,'getGamepads',{configurable:true,value:()=>[pad]});
      function press(i){pad.buttons[i].pressed=true;INVENTARIO.input();pad.buttons[i].pressed=false;INVENTARIO.input()}
      function hold(i){pad.buttons[i].pressed=true;for(let k=0;k<40;k++)INVENTARIO.input();pad.buttons[i].pressed=false;INVENTARIO.input()}   // touchpad: toque = mapa; mantener = mochila y obras
      for (const kind of ['wall','gate']){
        const piece=props.find(s=>s.type===kind+'3');
        damage(piece,20);supplies(1);p.p.set(piece.x+1.4,0,piece.z);
        hold(17);const btn=find('Reparar');
        check(btn,'acción del mando');
        for(let n=0; n<buttons().length && document.activeElement!==btn; n++)press(13);
        press(0);check(p.buildSite,'confirmación con cruz');
        advance(1);p.lastHurt=MX.M.t;advance(.01);check(!p.buildSite,'interrupción por daño');
        hold(17);const resume=find('Retomar');
        for(let n=0;n<buttons().length && document.activeElement!==resume;n++)press(13);
        press(0);advance(6);check(!p.bag.material && !p.buildSite,'reanudar con mando');
        p.lastHurt=-99;
      }
    }""")
    assert not errors, errors
    browser.close()
print('Mapa 4: materiales, daños, obras interrumpidas, brechas, navegación y niveles 1–3 OK')
