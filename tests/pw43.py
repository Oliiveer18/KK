from playwright.sync_api import sync_playwright
with sync_playwright() as p:
    b=p.chromium.launch(executable_path='/usr/bin/google-chrome',args=['--no-sandbox','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist'])
    pg=b.new_context(viewport={'width':900,'height':600}).new_page(); pg.on('pageerror',lambda e:print('ERR',e))
    pg.goto('file:///home/claude/prototipo_inline.html'); pg.wait_for_timeout(1000)
    print(pg.evaluate("""()=>{const r={};const bar=props.find(p=>p.type==='barrier'),h0=bar.hp;
      P.pos.set(bar.x,0,bar.z+.9); const ray=()=>castRay(P.pos.x,P.pos.z,0,-1);
      P.crouch=0; for(let i=0;i<3;i++)update(1/60); r.standing=[ray().t>2?'over':ray().hit,!!P.cover];
      P.crouch=1; P.crouchT=1; for(let i=0;i<3;i++){P.crouch=1;update(1/60);} r.crouched=[ray().t>2?'over':ray().hit,!!P.cover];
      P.pos.set(bar.x,0,bar.z+4); P.crouch=1; update(1/60); r.far=!!P.cover;
      const c=props.find(p=>p.type==='crate'); P.pos.set(c.x,0,c.z+1.3); P.crouch=1; update(1/60); r.tallCrate=!!P.cover; return r;}"""))
    b.close()
