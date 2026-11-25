from playwright.sync_api import sync_playwright
import random
with sync_playwright() as p:
    b=p.chromium.launch(executable_path='/usr/bin/google-chrome',args=['--no-sandbox','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist'])
    pg=b.new_context(viewport={'width':700,'height':440}).new_page()
    errs=[];pg.on('pageerror',lambda e:errs.append(str(e)))
    pg.goto('file:///home/claude/prototipo_inline.html'); pg.wait_for_timeout(600); pg.click('#go'); pg.mouse.move(350,80)
    ev=pg.evaluate
    ev("window.S={n:0,lo:0,hi:0,maxd:0,rel:0};(function l(){S.n++;const sp=P.vel.length();if(feet[0].stepping&&feet[1].stepping){if(sp<6.2)S.lo++;else S.hi++}for(let i=0;i<2;i++){const d=Math.hypot(feet[i].pos.x-hip[i].x,feet[i].pos.z-hip[i].z);if(!feet[i].stepping&&d>S.maxd)S.maxd=d}requestAnimationFrame(l)})()")
    random.seed(5)
    keys=['KeyW','KeyA','KeyS','KeyD']
    for i in range(40):
        ks=random.sample(keys,random.choice([1,2]))
        if random.random()<.5: ks.append('ShiftLeft')
        for k in ks: pg.keyboard.down(k)
        pg.wait_for_timeout(random.choice([120,200,350,600]))
        for k in ks: pg.keyboard.up(k)
        pg.wait_for_timeout(random.choice([0,150,400]))
    print(ev("({n:S.n,dosPiesLento:S.lo,dosPiesRapido:S.hi,maxDistPieApoyado:+S.maxd.toFixed(2)})"),errs); b.close()
