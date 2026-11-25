import sys
from playwright.sync_api import sync_playwright
f=sys.argv[1]
with sync_playwright() as p:
    b=p.chromium.launch(executable_path='/usr/bin/google-chrome',args=['--no-sandbox','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist'])
    pg=b.new_context(viewport={'width':700,'height':440}).new_page()
    errs=[];pg.on('pageerror',lambda e:errs.append(str(e)))
    pg.goto('file:///home/claude/'+f); pg.wait_for_timeout(800); pg.click('#go'); ev=pg.evaluate
    ev("""window.knee=()=>{let o=[];for(let i=0;i<2;i++){const h=hip[i],k=rig.knee[i].position,a=feet[i].pos;const u=new THREE.Vector3().subVectors(h,k).normalize(),v=new THREE.Vector3().set(a.x,a.y+feet[i].h+.09,a.z).sub(k).normalize();o.push(Math.round(180-u.angleTo(v)*180/Math.PI))}return o}""")
    pg.wait_for_timeout(600); print('de pie, flexión rodillas °',ev("knee()"),'py',ev("+P.py.toFixed(2)"))
    pg.keyboard.down('KeyW'); pg.wait_for_timeout(700); print('andar',ev("knee()"))
    pg.keyboard.down('ShiftLeft'); pg.wait_for_timeout(700); print('correr',ev("knee()"),'py',ev("+P.py.toFixed(2)")); pg.keyboard.up('KeyW'); pg.keyboard.up('ShiftLeft'); pg.wait_for_timeout(500)
    pg.keyboard.press('KeyC'); pg.wait_for_timeout(700); print('agachado',ev("knee()"),'py',ev("+P.py.toFixed(2)"))
    print(errs); b.close()
