from playwright.sync_api import sync_playwright
import json
with sync_playwright() as p:
    b=p.chromium.launch(executable_path='/usr/bin/google-chrome',args=['--no-sandbox','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist'])
    pg=b.new_context(viewport={'width':900,'height':560}).new_page()
    errs=[];pg.on('pageerror',lambda e:errs.append(str(e)))
    pg.goto('file:///home/claude/prototipo_inline.html'); pg.wait_for_timeout(600); pg.click('#go'); pg.mouse.move(450,100)
    ev=pg.evaluate
    # grabador: estiramiento de piernas y deslizamiento de pies en apoyo
    ev("""window.R={n:0,over:0,maxr:0,slide:0,maxslide:0,prev:[null,null]};
    setInterval(()=>{R.n++;for(let i=0;i<2;i++){const f=feet[i],h=hip[i];const d=Math.hypot(f.pos.x-h.x,f.pos.y+f.h+.09-h.y,f.pos.z-h.z);const r=d/1.08;R.maxr=Math.max(R.maxr,r);if(r>1.0)R.over++;
      const pv=R.prev[i];if(pv&&!f.stepping&&!pv.s){const s=Math.hypot(f.pos.x-pv.x,f.pos.z-pv.z);R.maxslide=Math.max(R.maxslide,s)}R.prev[i]={x:f.pos.x,z:f.pos.z,s:f.stepping}}},16)""")
    def run(name,keys,ms,crouch=False):
        ev("R.n=0;R.over=0;R.maxr=0;R.maxslide=0")
        for k in keys: pg.keyboard.down(k)
        pg.wait_for_timeout(ms)
        r=ev("({n:R.n,over:R.over,maxr:+R.maxr.toFixed(3),maxslide:+R.maxslide.toFixed(4),speed:+P.vel.length().toFixed(1),py:+P.py.toFixed(2)})")
        for k in keys: pg.keyboard.up(k)
        print(name,r)
    run('andar',['KeyD'],1500)
    pg.keyboard.up('KeyD'); pg.wait_for_timeout(500)
    run('correr',['KeyD','ShiftLeft'],1800)
    # zig-zag rápido lateral
    ev("R.n=0;R.over=0;R.maxr=0;R.maxslide=0")
    for k in range(8):
        pg.keyboard.down('ShiftLeft'); pg.keyboard.down('KeyA' if k%2 else 'KeyD'); pg.wait_for_timeout(320); pg.keyboard.up('KeyA'); pg.keyboard.up('KeyD')
    print('zigzag lateral rápido',ev("({n:R.n,over:R.over,maxr:+R.maxr.toFixed(3),maxslide:+R.maxslide.toFixed(4)})")); pg.keyboard.up('ShiftLeft'); pg.wait_for_timeout(500)
    pg.keyboard.press('KeyC'); pg.wait_for_timeout(500)
    run('agachado andar',['KeyW'],1500)
    run('agachado correr',['KeyW','ShiftLeft'],1500)
    pg.screenshot(path='t/legs.png')
    print('errs',errs,pg.eval_on_selector('#err','e=>e.textContent')); b.close()
