"""Campaña (?mapa=4): abatido y reanimación. Una reanimación por vida, kit de un solo uso, un rescatador por caído, el daño interrumpe, el abatido muere por daño o por tiempo."""
import os, sys
from playwright.sync_api import sync_playwright
errs = []; bad = 0
def chk(c, m):
    global bad
    print(('OK  ' if c else 'FALLO ') + m); bad += 0 if c else 1
with sync_playwright() as p:
    b = p.chromium.launch(executable_path='/usr/bin/google-chrome', args=['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'])
    pg = b.new_page(viewport={'width': 1100, 'height': 700}); pg.on('pageerror', lambda e: errs.append(str(e)))
    pg.goto('file://' + os.path.abspath('index.html') + '?mapa=4&bots=4'); pg.wait_for_timeout(1000); ev = pg.evaluate
    ev('begin()'); pg.wait_for_timeout(300); ev('()=>{menuOpen=true;MX.pl.inv=99}')   # bucle real en pausa: el tiempo de juego sólo avanza con los update() del test (determinista)
    ev('MX.zom.noRestock=true')
    ev('for(let i=0;i<120;i++) update(1/60)')
    def run(n): ev('()=>{for(let i=0;i<%d;i++){for(const e of MX.ents) if(e.bot&&e.dead) e.respT=1e9; update(1/60)}}' % n)
    # escenario: equipos 1-3 fuera; A1 jugador, A2..A4 aliados
    SETUP = '''()=>{boxes.length=0;const E=MX.ents;window.E=E;for(const k of OBJ.pickups.slice())OBJ.removePickup(k);   /* cada escenario sin objetos sueltos: las mochilas de los caídos (con su kit) no pasan al siguiente */if(MX.zom){for(const z of MX.zom.list){z.dead=true;z.st='dead';z.deadT=99}}
      for(const e of E){e.inv=0;e.dwn=false;e.revived=false;e.kits=1;e.rescuer=null;e.rt=null;e.revP=0;e.dead=false;e.hp=100;e.sh=50;e.vis=false;e.lastHurt=-99}
      for(const e of E) if(e.team!==0){e.dead=true;e.respT=1e9}
      for(const e of E) if(e.bot){e.fireCd=1e9;e.gCount=0;e.sCount=0;e.gCd=e.sCd=1e9}
      const pl=E[0];P.pos.set(0,0,0);pl.dead=false;pl.dwn=false;pl.hp=100;pl.sh=50;
      E[1].p.set(6,0,0);E[2].p.set(9,0,3);E[3].p.set(9,0,-3);window.hitL=(e)=>MX.hit(e,500,E[4]||null,1,0,WP[MX.WI.F1])}'''
    ev(SETUP); run(3)
    # a) golpe letal -> abatido, no muerto
    ev('()=>{E[2].kits=0;E[3].kits=0;E[1].p.set(6,0,0);hitL(E[1])}'); run(2)
    d = ev('()=>({dwn:E[1].dwn,dead:E[1].dead,deaths:E[1].deaths,fx:!!E[1].dwnFx})')
    chk(d['dwn'] and not d['dead'] and d['deaths'] == 0 and d['fx'], 'golpe letal con aliados en pie: queda abatido (no muerto) y con marcador')
    # b) el jugador lo reanima (A3/A4 sin kit)
    ev('()=>{P.pos.set(6.8,0,0)}'); ev('()=>{MX.rev=true}')
    ev('()=>{update(1/60)}'); msg = ev("[...document.querySelectorAll('div')].find(d=>d.style.color==='rgb(255, 226, 160)').textContent"); print('mensaje:', msg)
    ev('()=>{for(let i=0;i<240&&E[1].dwn;i++){P.pos.set(6.8,0,0);MX.rev=true;update(1/60)}}')               # mantiene ✕ hasta que se completa (máx. 4 s): la vida se mira en ese instante, antes de que se cure o regenere
    d = ev('()=>({dwn:E[1].dwn,hp:Math.round(E[1].hp),rev:E[1].revived,kits:E[0].kits,fx:!!E[1].dwnFx})')
    print('reanimado por el jugador:', d)
    chk(not d['dwn'] and d['hp'] == 50 and d['rev'] and d['kits'] == 0 and not d['fx'], 'jugador mantiene ✕ 3 s: vuelve con 50 de vida, gasta su kit y desaparece el marcador')
    # c) una reanimación por vida: segundo golpe letal = muerte
    ev('()=>{E[1].inv=0;hitL(E[1])}'); run(2)
    chk(ev('()=>E[1].dead&&!E[1].dwn'), 'segunda caída en la misma vida: muerte definitiva (sin segunda reanimación)')
    # d) rescate por bot: un solo rescatador, gasta un solo kit
    ev(SETUP); run(3)
    ev('()=>{E[1].p.set(6,0,0);E[2].p.set(9,0,3);E[3].p.set(9,0,-3);E[0].kits=0;hitL(E[1])}'); run(5)
    d = ev('()=>({res:E[1].rescuer?E[1].rescuer.id:null,rts:[E[2].rt&&E[2].rt.id,E[3].rt&&E[3].rt.id]})'); print('rescatadores:', d)
    chk(d['res'] is not None and sum(1 for x in d['rts'] if x) == 1, 'varios aliados cerca: solo uno reserva el rescate')
    run(60 * 9)
    d = ev('()=>({dwn:E[1].dwn,hp:Math.round(E[1].hp),kits:[E[2].kits,E[3].kits],rev:E[1].revived})'); print('tras el rescate:', d)
    chk(not d['dwn'] and d['rev'] and sum(d['kits']) == 1, 'un bot lo reanima y solo se gasta un kit entre los dos')
    # e) interrupción por daño al rescatador
    ev(SETUP); run(3)
    ev('()=>{E[1].p.set(6,0,0);E[2].p.set(7.0,0,0);E[3].kits=0;E[0].kits=0;hitL(E[1])}'); run(60 * 2)
    pr = ev('()=>({p:E[1].revP,res:!!E[1].rescuer,kits:E[2].kits})'); print('rescate en curso:', pr)
    ev('()=>{E[2].inv=0;MX.hit(E[2],5,E[4],1,0,WP[MX.WI.F1])}'); run(2)
    d = ev('()=>({p:E[1].revP,res:!!E[1].rescuer,kits:E[2].kits,dwn:E[1].dwn})'); print('tras recibir daño el rescatador:', d)
    chk(d['p'] == 0 and d['kits'] == 1 and d['dwn'], 'si el rescatador recibe daño, se interrumpe (progreso a 0, sin gastar kit)')
    # f) el abatido sigue recibiendo daño
    ev('()=>{E[1].inv=0;MX.hit(E[1],60,E[4],1,0,WP[MX.WI.F1])}'); run(2)
    chk(ev('()=>E[1].dead'), 'el abatido muere si su vida extra (40) se agota por daño')
    # g) se desangra
    ev(SETUP); run(3)
    ev('()=>{E[1].p.set(6,0,0);for(const e of [E[0],E[2],E[3]])e.kits=0;hitL(E[1])}'); run(60 * 12)
    chk(ev('()=>E[1].dwn&&!E[1].dead'), 'a los 12 s sigue abatido')
    run(60 * 15)
    chk(ev('()=>E[1].dead&&!E[1].dwn'), 'a los 25 s sin ayuda muere')
    # h) sin aliados en pie no hay abatido
    ev(SETUP); run(3)
    ev('()=>{for(const e of [E[1],E[2],E[3]]){e.dead=true;e.respT=1e9};hitL(E[0])}'); run(2)
    chk(ev('()=>E[0].dead&&!E[0].dwn'), 'sin aliados en pie, el golpe letal mata directamente')
    # i) el jugador abatido es reanimado por un bot
    ev(SETUP); run(3)
    ev('()=>{E[2].p.set(1.0,0,0);E[1].kits=0;E[3].kits=0;E[1].p.set(30,0,30);E[3].p.set(30,0,-30);hitL(E[0])}'); run(3)
    d = ev('()=>({dwn:E[0].dwn,corpse:MX.corpse(),rig:rig.torso.visible})'); print('jugador abatido:', d)
    chk(d['dwn'] and d['corpse'] and not d['rig'], 'jugador abatido: cuerpo tumbado, rig oculto')
    ev('()=>{for(let i=0;i<60*8&&E[0].dwn;i++){for(const e of MX.ents) if(e.bot&&e.dead) e.respT=1e9; update(1/60)}}')   # hasta que lo reanimen (máx. 8 s): la vida se mira en ese instante, antes de que empiece la regeneración
    d = ev('()=>({dwn:E[0].dwn,hp:Math.round(E[0].hp),corpse:MX.corpse(),rig:rig.torso.visible,dead:E[0].dead})'); print('jugador tras rescate:', d)
    chk(not d['dwn'] and not d['dead'] and d['hp'] == 50 and not d['corpse'] and d['rig'], 'un bot reanima al jugador: vuelve con 50 de vida, rig visible y sin cadáver')
    # j) un enemigo no reanima a un rival
    ev(SETUP); run(3)
    ev('()=>{const r=E[4];r.dead=false;r.hp=100;r.kits=1;r.fireCd=1e9;r.p.set(8,0,0);for(const e of [E[0],E[2],E[3]])e.kits=0;E[1].p.set(6,0,0);hitL(E[1])}'); run(60 * 6)
    chk(ev('()=>E[1].dwn&&!E[1].revived&&!E[1].rescuer'), 'un enemigo cercano con kit no reanima a un rival')
    # abatido: mantener □ (MX.rev) vuelve al refugio sin esperar
    ev(SETUP); run(3)
    ev('()=>{for(const e of [E[1],E[2],E[3]]){e.kits=0;e.p.set(30,0,30)};E[0].p.set(0,0,0);E[0].deaths=0;hitL(E[0])}'); run(3)
    chk(ev('()=>E[0].dwn'), 'el jugador cae abatido')
    msg = ev("[...document.querySelectorAll('div')].find(d=>d.style.color==='rgb(255, 226, 160)').textContent"); print('mensaje:', msg)
    chk('reaparecer' in msg, 'el mensaje avisa de que se puede reaparecer manteniendo el botón')
    ev('()=>{for(let i=0;i<30;i++){MX.rev=true;update(1/60)}}')
    chk(ev('()=>E[0].dwn&&!E[0].dead'), 'una pulsación corta (0,5 s) no basta: sigue abatido')
    ev('()=>{for(let i=0;i<30;i++){update(1/60)}}')
    ev('()=>{for(let i=0;i<70;i++){MX.rev=true;update(1/60)}}')
    ev('()=>{for(let i=0;i<60*2;i++)update(1/60)}')                                                 # pasa el parpadeo de invulnerabilidad (1,8 s) antes de mirar si se ve el cuerpo
    d = ev('()=>({dwn:E[0].dwn,dead:E[0].dead,deaths:E[0].deaths,x:Math.round(P.pos.x),hp:E[0].hp,rig:rig.torso.visible,corpse:MX.corpse()})'); print('tras mantener:', d)
    chk(not d['dwn'] and not d['dead'] and d['deaths'] == 1 and d['x'] < -30 and d['hp'] == 100 and d['rig'] and not d['corpse'], 'manteniendo 0,8 s reaparece en su refugio con la vida completa (cuenta como baja)')
    # reanimar con □: junto a un aliado abatido no se recarga el arma
    ev(SETUP); run(3)
    ev('()=>{for(const e of [E[2],E[3]]){e.kits=0;e.p.set(30,0,30)};E[1].p.set(6,0,0);hitL(E[1]);P.pos.set(6.8,0,0);E[0].kits=1;W.ammo=10}'); run(3)
    ev('()=>{P.pos.set(6.8,0,0);update(1/60)}')
    chk(ev('()=>MX.revCtx'), 'junto a un abatido con kit, el botón es de reanimar (se desactiva recargar)')
    # táctil: mantener el botón RECARG. también reaparece estando abatido y reanima junto a un abatido
    ev(SETUP); run(3)
    ev('()=>{for(const e of [E[1],E[2],E[3]]){e.kits=0;e.p.set(30,0,30)};E[0].p.set(0,0,0);E[0].deaths=0;hitL(E[0])}'); run(3)
    ev('()=>{const b=document.getElementById("bRel");b.dispatchEvent(new PointerEvent("pointerdown",{bubbles:true}))}')
    ev('()=>{for(let i=0;i<70;i++){update(1/60)}}')
    d = ev('()=>({dwn:E[0].dwn,dead:E[0].dead,deaths:E[0].deaths,x:Math.round(P.pos.x)})'); print('táctil, abatido:', d)
    ev('()=>{document.getElementById("bRel").dispatchEvent(new PointerEvent("pointerup",{bubbles:true}))}')
    chk(not d['dwn'] and d['deaths'] == 1 and d['x'] < -30, 'táctil: mantener RECARG. abatido lleva al refugio (0,8 s)')
    ev(SETUP); run(3)
    ev('()=>{for(const e of [E[2],E[3]]){e.kits=0;e.p.set(30,0,30)};E[1].p.set(6,0,0);hitL(E[1]);E[0].kits=1;P.pos.set(6.8,0,0)}'); run(3)
    ev('()=>{document.getElementById("bRel").dispatchEvent(new PointerEvent("pointerdown",{bubbles:true}))}')
    ev('()=>{for(let i=0;i<200;i++){P.pos.set(6.8,0,0);update(1/60)}}')
    ev('()=>{document.getElementById("bRel").dispatchEvent(new PointerEvent("pointerup",{bubbles:true}))}')
    chk(ev('()=>!E[1].dwn&&E[1].revived&&E[0].kits===0'), 'táctil: mantener RECARG. junto a un abatido lo reanima (3 s) y gasta el kit')
    print('ERRORES JS:', errs or 'ninguno'); bad += len(errs)
sys.exit(1 if bad else 0)
