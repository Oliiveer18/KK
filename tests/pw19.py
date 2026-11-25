from playwright.sync_api import sync_playwright
with sync_playwright() as p:
    b=p.chromium.launch(executable_path='/usr/bin/google-chrome',args=['--no-sandbox','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist'])
    pg=b.new_context(viewport={'width':900,'height':560}).new_page()
    pg.goto('file:///home/claude/prototipo_inline.html'); pg.wait_for_timeout(600); pg.click('#go'); pg.mouse.move(450,100)
    ev=pg.evaluate
    ev("window.S={n:0,both:0,tog:0};(function l(){S.n++;if(feet[0].stepping&&feet[1].stepping)S.both++;requestAnimationFrame(l)})()")
    def run(name,keys,ms):
        ev("S.n=0;S.both=0")
        for k in keys: pg.keyboard.down(k)
        pg.wait_for_timeout(ms); print(name,ev("({n:S.n,both:S.both,pct:Math.round(100*S.both/S.n),v:+P.vel.length().toFixed(1)})"))
        for k in keys: pg.keyboard.up(k)
        pg.wait_for_timeout(500)
    run('andar',['KeyW'],2000); run('correr',['KeyW','ShiftLeft'],2000); run('lado correr',['KeyD','ShiftLeft'],2000)
    run('atrás',['KeyS'],2000)
    pg.keyboard.press('KeyC'); pg.wait_for_timeout(400); run('agachado correr',['KeyW','ShiftLeft'],2000)
    b.close()
