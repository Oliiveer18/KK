from playwright.sync_api import sync_playwright
with sync_playwright() as p:
    b=p.chromium.launch(executable_path='/usr/bin/google-chrome',args=['--no-sandbox','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist'])
    pg=b.new_context(viewport={'width':700,'height':440}).new_page()
    errs=[];pg.on('pageerror',lambda e:errs.append(str(e)))
    pg.goto('file:///home/claude/prototipo_inline.html'); pg.wait_for_timeout(700); pg.click('#go'); ev=pg.evaluate
    r=ev("""(()=>{started=true;mode='kb';mouse.x=innerWidth/2;mouse.y=60;const out={};
      for(const hold of [0,.12,.3,.6]){ for(let i=0;i<120;i++)update(1/60); keys.KeyD=true; for(let i=0;i<30;i++)update(1/60);
        const x0=P.pos.x; keys.Space=true; flags.dash=true; update(1/60); const cd0=P.dashCD; let t=1; for(;t<200;t++){ if(t/60>hold)keys.Space=false; update(1/60); if(P.dash<=0)break;}
        out['mantener '+hold+'s']={duracion:+(t/60).toFixed(2),distancia:+(P.pos.x-x0).toFixed(1),recarga:+P.dashCD.toFixed(2)};
        keys.Space=false;keys.KeyD=false; for(let i=0;i<150;i++)update(1/60);}
      return out})()""")
    for k,v in r.items(): print(k,v)
    print(errs); b.close()
