import os,sys
from playwright.sync_api import sync_playwright
errs=[]
with sync_playwright() as p:
    b=p.chromium.launch(executable_path='/usr/bin/google-chrome',args=['--no-sandbox','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist','--autoplay-policy=no-user-gesture-required'])
    pg=b.new_page(viewport={'width':1100,'height':700}); pg.on('pageerror',lambda e:errs.append(str(e)))
    pg.on('console',lambda m:errs.append('C '+m.text[:200]) if m.type=='error' else None)
    pg.goto('file://'+os.path.abspath('index.html')+'?mapa=3'); pg.wait_for_timeout(1500)
    ev=pg.evaluate
    ev('MX.want=true;begin()'); pg.wait_for_timeout(500)
    print('MX.on',ev('MX.on'),'ents',ev('MX.ents.length'),'props',ev('MX.M.props.length'))
    ev('for(let i=0;i<120;i++) update(1/60)')
    print('vivos',ev('MX.ents.filter(e=>!e.dead).length'))
    N=int(sys.argv[1]) if len(sys.argv)>1 else 6000
    ev('MX.pl.hp=1e9') 
    ev('for(let i=0;i<%d;i++) update(1/60)'%N)
    print('marcador',ev('MX.M.score'),'t',round(ev('MX.M.t')),'over',ev('MX.M.over'))
    print('K/D',ev('MX.ents.map(e=>e.id+":"+e.kills+"/"+e.deaths).join(" ")'))
    print('atascados?',ev('MX.ents.filter(e=>e.bot&&!e.dead&&e.stuckN>1).length'))
    pg.screenshot(path='/home/claude/shot_partida.png')
    b.close()
print('ERRORES:',errs or 'ninguno')
