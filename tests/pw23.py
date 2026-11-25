import sys
from playwright.sync_api import sync_playwright
f=sys.argv[1]
with sync_playwright() as p:
    b=p.chromium.launch(executable_path='/usr/bin/google-chrome',args=['--no-sandbox','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist'])
    pg=b.new_context(viewport={'width':700,'height':440}).new_page()
    errs=[];pg.on('pageerror',lambda e:errs.append(str(e)))
    pg.goto('file:///home/claude/'+f); pg.wait_for_timeout(600); pg.click('#go'); pg.mouse.move(350,80)
    ev=pg.evaluate
    ev("window.S={n:0,lo:0,hi:0,vmax:0};(function l(){S.n++;if(feet[0].stepping&&feet[1].stepping){if(P.vel.length()<6.2)S.lo++;else S.hi++}requestAnimationFrame(l)})()")
    import random; random.seed(3)
    keys=['KeyW','KeyA','KeyS','KeyD']
    for i in range(40):
        ks=random.sample(keys,random.choice([1,2]))
        if random.random()<.5: ks.append('ShiftLeft')
        for k in ks: pg.keyboard.down(k)
        pg.wait_for_timeout(random.choice([120,200,350,600]))
        for k in ks: pg.keyboard.up(k)
        if random.random()<.3: pg.wait_for_timeout(250)
    print(f,ev("({n:S.n,dosPiesAireLento:S.lo,dosPiesAireRapido:S.hi})"),errs); b.close()
