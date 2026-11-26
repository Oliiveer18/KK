"""Avisos de escuadra y reacción a disparos coherentes con la visión (campaña, escuadras.js): se avisa sólo si el bot VE al enemigo; el compañero avisado
no corre hacia el enemigo: la escuadra marca el contacto y toma posiciones de apoyo. Herido por alguien que no ve, el contacto se marca en la dirección
del impacto (±2,5 m a 10 m), no en la posición real del atacante, y no lo fija como objetivo."""
import os, sys
from playwright.sync_api import sync_playwright
bad = 0
def chk(c, m):
    global bad
    print(('OK  ' if c else 'FALLO ') + m); bad += 0 if c else 1
with sync_playwright() as p:
    b = p.chromium.launch(executable_path='/usr/bin/google-chrome', args=['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'])
    pg = b.new_page(viewport={'width': 1100, 'height': 700}); errs = []; pg.on('pageerror', lambda e: errs.append(str(e))); ev = pg.evaluate
    pg.goto('file://' + os.path.abspath('index.html') + '?mapa=4&bots=8'); pg.wait_for_timeout(1000); ev('begin()'); pg.wait_for_timeout(400); ev('()=>{menuOpen=true}')   # el bucle real queda en pausa: sólo corren los update() del test
    SET = '''()=>{boxes.length=0;MX.zom.noRestock=true;for(const z of MX.zom.list.slice()){z.dead=true;z.st="dead";z.deadT=99}
      const E=MX.ents;for(const e of E){e.dead=true;e.respT=1e9}
      const mates=E.filter(e=>e.bot&&e.team===1);const A=mates[0];const B=mates.find(e=>e!==A&&e.sq===A.sq);const X=E.find(e=>e.bot&&e.team===2);
      window.A=A;window.B=B;window.X=X;for(const e of [A,B,X]){e.dead=false;e.dwn=false;e.hp=1e9;e.sh=0;e.inv=0;e.fireCd=1e9;e.st="push";e.alertT=-99;e.hitSrc=null;e.lastAtt=null;e.tgt=null;e.vis=false;e.sqAlert=-99}
      A.sqd.contact=null;A.p.set(0,0,0);B.p.set(-8,0,0);return !!B}'''
    chk(ev(SET), 'hay dos compañeros de escuadra y un enemigo')
    step = lambda n, f='': ev('()=>{for(let i=0;i<%d;i++){%s A.fireCd=1e9;B.fireCd=1e9;X.fireCd=1e9;update(1/60)}}' % (n, f))
    hw = ev('()=>MX.SIGHT.hw')
    # 1) A ve al enemigo (dentro de su pantalla): B (que no lo ve) recibe el aviso
    step(30, 'A.p.set(0,0,0);A.yaw=Math.PI/2;B.p.set(-8,0,0);X.p.set(%f,0,0);' % (hw * .6))
    chk(ev('()=>A.vis'), 'A ve al enemigo dentro de su campo de visión')
    chk(ev('()=>!!(B.sqd.contact&&B.sqd.contact.by===A)'), 'B recibe el aviso de A (contacto de escuadra)')
    g = ev('()=>{const g=MX.SQ.goalFor(B);return g&&{hold:g.hold,d:Math.hypot(g.x-A.p.x,g.z-A.p.z)}}')
    chk(g and g['hold'] and g['d'] < 12, 'B toma posición de apoyo junto a A (a %.1f m), no corre hacia el enemigo' % (g['d'] if g else -1))
    # 2) A NO ve al enemigo (fuera de su campo): B no recibe aviso
    ev(SET); step(30, 'A.p.set(0,0,0);B.p.set(-8,0,0);X.p.set(%f,0,0);' % (hw * 1.5))
    print(ev('()=>({Av:A.vis,Bv:B.vis,alert:B.alertT,st:B.st,hw:MX.SIGHT.hw,hd:MX.SIGHT.hd})'))
    chk(not ev('()=>A.vis') and ev('()=>!B.sqd.contact') and ev('()=>B.st!=="search"'), 'si A no ve al enemigo, no hay aviso')
    # 3) herido por alguien que no ve: va hacia la dirección del impacto, no hacia el atacante
    ev(SET); step(5, 'A.p.set(0,0,0);B.p.set(-8,0,40);X.p.set(70,0,-70);')
    ev('()=>{A.p.set(0,0,0);A.hp=1e9;MX.hit(A,10,X,1,0,WP[MX.WI.F1])}'); step(20, 'X.p.set(70,0,-70);B.p.set(-8,0,40);')
    r = ev('()=>({st:A.st,c:A.sqd.contact&&[A.sqd.contact.x,A.sqd.contact.z],hs:A.hitSrc})'); print(r)
    chk(r['hs'] and r['c'] and abs(r['c'][0] - (-10)) < 3.5 and abs(r['c'][1]) < 3.5, 'el contacto se marca en la dirección de donde vino el disparo (≈ x=-10), no en la posición real del atacante (70,-70)')
    chk(ev('()=>A.tgt!==X'), 'no fija como objetivo a un atacante que no ve')
    print('ERRORES JS:', errs or 'ninguno'); bad += len(errs)
sys.exit(1 if bad else 0)
