import sys
from playwright.sync_api import sync_playwright
errs=[]
with sync_playwright() as p:
    b=p.chromium.launch(executable_path='/usr/bin/google-chrome',args=['--no-sandbox','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist','--autoplay-policy=no-user-gesture-required'])
    pg=b.new_context().new_page(); pg.on('pageerror',lambda e:errs.append(str(e)))
    pg.goto('file://'+__import__('os').path.abspath(sys.argv[1] if len(sys.argv)>1 else 'index.html')); pg.wait_for_timeout(1500); pg.evaluate('begin()'); pg.wait_for_function('()=>["P1_shot","P1_dry","P1_equip","C_9mm","P1_rel1","P1_rel3","F1_shot"].every(k=>SND.buf[k]&&SND.buf[k].length)', timeout=30000)   # la decodificación va por tandas en segundo plano: se espera a que estén, no un tiempo fijo
    print('inicio decodificado (s): shot',round(pg.evaluate('SND.buf.P1_shot[0]._off'),4),'dry',round(pg.evaluate('SND.buf.P1_dry[0]._off'),4))
    pg.evaluate('flags.swap=true; for(let i=0;i<40;i++) update(1/60)')
    assert pg.evaluate('cur.sid')=='P1'; print('equip sonado',pg.evaluate('SND.count.P1_equip||0'),'inicio equip',round(pg.evaluate('SND.buf.P1_equip[0]._off'),3))
    for n in range(3):
        pg.evaluate('mouse.down=true; for(let i=0;i<3;i++) update(1/60); mouse.down=false; for(let i=0;i<20;i++) update(1/60)')
    pg.evaluate('for(let i=0;i<90;i++) update(1/60)'); print('casquillos sonados',pg.evaluate('SND.count.C_9mm||0'),'(3 disparos = 3)'); print('munición',pg.evaluate('W.ammo'),'(12-3=9)','sonidos shot',pg.evaluate('SND.count.P1_shot||0'))
    pg.evaluate('W.ammo=0; mouse.down=true; for(let i=0;i<10;i++) update(1/60); mouse.down=false')
    print('clic vacío',pg.evaluate('SND.count.P1_dry||0'),'recarga iniciada',pg.evaluate('W.reload>=0'))
    pg.evaluate('for(let i=0;i<150;i++) update(1/60)'); print('rel1/rel3 sonados',pg.evaluate('SND.count.P1_rel1||0'),pg.evaluate('SND.count.P1_rel3||0'),'(1 y 1 = una vez por recarga)'); print('cargador sonado',pg.evaluate('SND.count.MAG_pistol||0'),'(1 por recarga)'); print('recarga terminada',pg.evaluate('W.reload<0 && W.ammo==W.max'),'rp',pg.evaluate('W.rp'))
    pg.evaluate('flags.swap=true; for(let i=0;i<40;i++) update(1/60)')
    print('arma',pg.evaluate('cur.sid'))
    pg.evaluate('mouse.down=true; for(let i=0;i<5;i++) update(1/60); mouse.down=false')
    print('sonido E1 con muestra',pg.evaluate('SND.count.E1_shot||0'),'(0 = respaldo sintético, sin errores)')
    pg.evaluate('flags.swap=true; for(let i=0;i<40;i++) update(1/60)'); print('arma',pg.evaluate('cur.sid')); pg.evaluate('mouse.down=true; for(let i=0;i<30;i++) update(1/60); mouse.down=false'); n=pg.evaluate('30-0'); print('fusil en ráfaga: balas gastadas',pg.evaluate('W.max-W.ammo'),'sonidos F1_shot',pg.evaluate('SND.count.F1_shot||0'))
    b.close()
print('ERRORES:',errs or 'ninguno')
