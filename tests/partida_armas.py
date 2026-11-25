import os
from playwright.sync_api import sync_playwright
errs=[]
with sync_playwright() as p:
    b=p.chromium.launch(executable_path='/usr/bin/google-chrome',args=['--no-sandbox','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist'])
    pg=b.new_page(viewport={'width':1100,'height':700}); pg.on('pageerror',lambda e:errs.append(str(e)))
    pg.goto('file://'+os.path.abspath('index.html')); pg.wait_for_timeout(1500); ev=pg.evaluate
    ev('MX.want=true;begin()'); run=lambda n:ev('for(let i=0;i<%d;i++) update(1/60)'%n)
    run(60); ev('MX.M.ents.forEach(e=>{if(e.bot)e.team===0?0:0})')
    def sw(sec): ev('window.__q=1'); ev('keys.KeyQ=true'); run(int(sec*60)); ev('keys.KeyQ=false'); run(40)
    print('inicio',ev('cur.sid'),ev('MX.M.slot'))
    sw(.1); print('tap ->',ev('cur.sid'),'(S1)')
    sw(.1); print('tap ->',ev('cur.sid'),'(F1)')
    sw(.6); print('mantener ->',ev('cur.sid'),'(P1)')
    sw(.6); print('mantener ->',ev('cur.sid'),'(F1)')
    ev('P.pos.x=-47.6;P.pos.z=-7.2'); run(80); print('peana P1 ->',ev('cur.sid'))
    ev('P.pos.x=-44.4;P.pos.z=3.6'); run(80); print('peana S2 ->',ev('cur.sid'),ev('MX.M.slots.map(i=>WP[i].sid)'))
    ev('MX.hit(MX.pl,200,MX.ents[7],1,0)'); print('muerto',ev('MX.pl.dead')); run(240); print('reaparece',ev('!MX.pl.dead'),ev('[P.pos.x,P.pos.z]'))
    b.close()
print('ERRORES:',errs or 'ninguno')
