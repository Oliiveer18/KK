"""Sonido de impacto en personajes (mapa 3): un bot que da a alguien NO hace golpe metálico; el jugador oye HIT_marker al dar a un rival (y HIT_kill/HIT_marker al matar)."""
import os, sys
from playwright.sync_api import sync_playwright
errs = []; bad = 0
def chk(c, m):
    global bad
    print(('OK  ' if c else 'FALLO ') + m); bad += 0 if c else 1
with sync_playwright() as p:
    b = p.chromium.launch(executable_path='/usr/bin/google-chrome', args=['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--autoplay-policy=no-user-gesture-required'])
    pg = b.new_page(viewport={'width': 1100, 'height': 700}); pg.on('pageerror', lambda e: errs.append(str(e)))
    pg.goto('file://' + os.path.abspath('index.html') + '?mapa=3'); pg.wait_for_timeout(1000); ev = pg.evaluate
    ev('MX.want=true;begin()'); pg.wait_for_timeout(500); ev('for(let i=0;i<200;i++) update(1/60)')
    ev('''()=>{window.__L=[];const a=window.playAt,s=window.playSnd;window.playAt=function(n,...r){window.__L.push('at:'+n);return a.call(this,n,...r)};window.playSnd=function(n,...r){window.__L.push('snd:'+n);return s.call(this,n,...r)}}''')
    # bala de un bot contra el jugador y contra otro bot; bala del jugador contra un rival
    def shoot(owner, target_idx, own_idx=None):
        ev('''([o,t])=>{const E=MX.ents,own=E[o],tg=E[t];tg.inv=0;tg.dead=false;tg.hp=100;tg.sh=50;own.dead=false;
          const dx=tg.p.x-own.p.x,dz=tg.p.z-own.p.z,d=Math.hypot(dx,dz)||1;
          boxes.length=boxes.filter(b=>b.wall).length?boxes.length:0;
          window.__L.length=0;
          for(const b of BUL){b.on=false}
          spawnBullet(own.p.x,1.1,own.p.z,dx/d,dz/d,WP[WI?WI.F1:0]);
        }''', [owner, target_idx])
    ev('()=>{window.WI=MX.WI}')
    # colocar rival a 6 m del jugador, en línea libre
    ev('''()=>{boxes.length=0;const pl=MX.ents[0],r=MX.ents[7],b=MX.ents[1];pl.p.set(0,0,0);r.p.set(6,0,0);b.p.set(-6,0,0);for(const e of MX.ents){if(e!==pl&&e!==r&&e!==b){e.p.set(40,0,25)}};for(const e of MX.ents){e.inv=0}}''')
    # 1) disparo del jugador a un rival
    ev('''()=>{const pl=MX.ents[0],r=MX.ents[7];r.dead=false;r.hp=100;r.sh=50;r.inv=0;window.__L.length=0;const w=WP[MX.WI.F1];spawnBullet(pl.p.x,1.1,pl.p.z,1,0,w,pl)}''')
    ev('for(let i=0;i<30;i++) update(1/60)'); L = ev('window.__L')
    print('jugador -> rival:', L)
    chk('snd:HIT_marker' in L, 'el jugador oye HIT_marker al dar a un rival')
    chk('at:IMP_target' not in L, 'sin golpe metálico (IMP_target) al dar a un rival')
    n = ev("(SND.buf.HIT_marker||[]).length"); print('muestras HIT_marker cargadas:', n, 'reproducciones:', ev("SND.count.HIT_marker||0"))
    if n:
        chk(ev("SND.count.HIT_marker||0") >= 1, 'con muestra cargada, HIT_marker se reproduce de verdad al dar a un rival')
        chk(0.05 < ev("SND.buf.HIT_marker[0].duration") < 0.3, 'duración de HIT_marker razonable (%.0f ms)' % (ev("SND.buf.HIT_marker[0].duration") * 1000))
    # 2) disparo de un bot rival al jugador
    ev('''()=>{const pl=MX.ents[0],r=MX.ents[7];pl.dead=false;pl.hp=100;pl.sh=50;pl.inv=0;r.dead=false;r.inv=0;window.__L.length=0;const w=WP[MX.WI.F1];spawnBullet(r.p.x,1.1,r.p.z,-1,0,w,r)}''')
    ev('for(let i=0;i<30;i++) update(1/60)'); L = ev('window.__L')
    print('bot -> jugador:', L)
    chk('at:IMP_target' not in L and not any(x.startswith('snd:HIT') for x in L), 'un disparo de bot al jugador no hace golpe metálico ni «hit»')
    # 3) disparo de un bot rival a un compañero... (bot contra bot aliado del jugador)
    ev('''()=>{const a=MX.ents[1],r=MX.ents[7];a.dead=false;a.hp=100;a.sh=50;a.inv=0;r.dead=false;r.inv=0;a.p.set(-6,0,0);r.p.set(6,0,0);window.__L.length=0;const w=WP[MX.WI.F1];spawnBullet(r.p.x,1.1,r.p.z,-1,0,w,r)}''')
    ev('for(let i=0;i<40;i++) update(1/60)'); L = ev('window.__L')
    print('bot -> bot:', L)
    chk('at:IMP_target' not in L and not any(x.startswith('snd:HIT') for x in L), 'bot contra bot: sin golpe metálico ni «hit»')
    # 4) baja del jugador
    ev('''()=>{const pl=MX.ents[0],r=MX.ents[7];pl.p.set(0,0,0);r.p.set(6,0,0);r.dead=false;r.hp=5;r.sh=0;r.inv=0;window.__L.length=0;const w=WP[MX.WI.F1];spawnBullet(pl.p.x,1.1,pl.p.z,1,0,w,pl)}''')
    ev('for(let i=0;i<30;i++) update(1/60)'); L = ev('window.__L')
    print('baja:', L)
    chk('snd:HIT_kill' in L and 'snd:HIT_marker' not in L[:L.index('snd:HIT_kill')+1], 'al matar suena solo HIT_kill (sin HIT_marker encima)')
    n2 = ev("(SND.buf.HIT_kill||[]).length"); print('muestras HIT_kill:', n2, 'reproducciones:', ev("SND.count.HIT_kill||0"))
    chk(n2 == 1 and ev("SND.count.HIT_kill||0") >= 1 and 0.1 < ev("SND.buf.HIT_kill[0].duration") < 0.45, 'HIT_kill cargado y reproducido (%.0f ms)' % (ev("SND.buf.HIT_kill[0].duration") * 1000))
    print('ERRORES JS:', errs or 'ninguno'); bad += len(errs)
sys.exit(1 if bad else 0)
