import os
from playwright.sync_api import sync_playwright
errs=[]; bad=0
with sync_playwright() as p:
    b=p.chromium.launch(executable_path='/usr/bin/google-chrome',args=['--no-sandbox','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist'])
    for name,w,h in [('vertical',390,844),('horizontal 844x390',844,390),('horizontal 932x430',932,430),('horizontal 667x375',667,375),('escritorio',1280,720)]:
        ctx=b.new_context(viewport={'width':w,'height':h},has_touch=True,is_mobile=w<1000); pg=ctx.new_page(); pg.on('pageerror',lambda e:errs.append(str(e)))
        pg.goto('file://'+os.path.abspath('index.html')); pg.wait_for_timeout(1000); ev=pg.evaluate
        ev('MX.want=true;begin()'); ev('for(let i=0;i<200;i++) update(1/60)')
        r=ev('''(()=>{const o=[];for(const id of ['bDash','bRel','bCrouch','bSwap','bGren','bSmk','ammo','dash','gren','wname','mxScore']){const e=document.getElementById(id);if(!e||getComputedStyle(e).display==='none')continue;const q=e.getBoundingClientRect();if(q.left<0||q.top<0||q.right>innerWidth+1||q.bottom>innerHeight+1)o.push(id)}return [o,camera.fov]})()''')
        print(name,'fuera de pantalla:',r[0] or 'ninguno','fov',round(r[1],1)); bad+=len(r[0]); ctx.close()
    b.close()
print('ERRORES:',errs or 'ninguno','| botones/HUD fuera de pantalla:',bad)
