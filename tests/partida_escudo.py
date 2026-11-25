import os
from playwright.sync_api import sync_playwright
errs=[]
with sync_playwright() as p:
    b=p.chromium.launch(executable_path='/usr/bin/google-chrome',args=['--no-sandbox','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist'])
    pg=b.new_page(viewport={'width':1100,'height':700}); pg.on('pageerror',lambda e:errs.append(str(e)))
    pg.goto('file://'+os.path.abspath('index.html')); pg.wait_for_timeout(1500); ev=pg.evaluate
    ev('MX.want=true;begin()'); run=lambda n:ev('for(let i=0;i<%d;i++) update(1/60)'%n)
    run(200); pl='MX.pl'
    print('inicio hp/sh',ev('[MX.pl.hp,MX.pl.sh]'))
    run(120); ev('MX.hit(MX.pl,30,MX.ents[7],1,0)'); print('30 dmg ->',ev('[MX.pl.hp,MX.pl.sh]'),'(100/20)')
    ev('MX.hit(MX.pl,35,MX.ents[7],1,0)'); print('+35 ->',ev('[MX.pl.hp,MX.pl.sh]'),'(85/0)')
    run(60); pg.screenshot(path='/home/claude/shot_barra.png')
    run(240); print('4s ->',ev('[MX.pl.hp,MX.pl.sh]'),'(sin regenerar)')
    run(300); print('+5s ->',ev('[Math.round(MX.pl.hp),Math.round(MX.pl.sh)]'),'(escudo primero)')
    run(600); print('final',ev('[Math.round(MX.pl.hp),Math.round(MX.pl.sh)]'),'(100/50)')
    ev('MX.hit(MX.ents[7],20,MX.pl,1,0)'); run(5); print('bot hp/sh',ev('[MX.ents[7].hp,MX.ents[7].sh]'),'barra visible',ev('MX.ents[7].bar.el.style.display'),'nums',ev('document.querySelectorAll("#mxScore ~ div").length'))
    ev('MX.hit(MX.pl,500,MX.ents[7],1,0)'); print('muere',ev('MX.pl.dead')); run(240); print('reaparece',ev('[MX.pl.hp,MX.pl.sh,MX.pl.dead]'))
    run(8000); print('marcador',ev('MX.M.score'),ev('MX.ents.filter(e=>e.bot).map(e=>e.kills).join(",")'))
    b.close()
print('ERRORES:',errs or 'ninguno')
