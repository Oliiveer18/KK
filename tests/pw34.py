import sys
from playwright.sync_api import sync_playwright
with sync_playwright() as p:
    b=p.chromium.launch(executable_path='/usr/bin/google-chrome',args=['--no-sandbox','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist'])
    pg=b.new_context(viewport={'width':700,'height':440}).new_page()
    errs=[];pg.on('pageerror',lambda e:errs.append(str(e)))
    pg.goto('file:///home/claude/'+sys.argv[1]); pg.wait_for_timeout(700); pg.click('#go')
    r=pg.evaluate("""(()=>{started=true;mode='kb';mouse.x=innerWidth/2;mouse.y=60;const out={};
      for(const [name,hold,keep] of [['dash corto, suelto el stick',0,false],['dash corto, sigo con el stick',0,true],['dash largo, suelto el stick',.3,false]]){
        for(let i=0;i<150;i++)update(1/60); keys.KeyA=true; for(let i=0;i<30;i++)update(1/60);
        keys.Space=true;flags.dash=true;let t=0;for(;t<200;t++){if(t/60>hold)keys.Space=false;if(!keep&&t==2)keys.KeyA=false;update(1/60);if(P.dash<=0&&t>3)break;}
        const v0=P.vel.length();let t1=0;for(;t1<200&&P.vel.length()>(keep?8.3:.5);t1++)update(1/60);
        out[name]={velAlTerminar:+v0.toFixed(1),segundosParaFrenar:+(t1/60).toFixed(2)};keys.KeyA=false;}
      return out})()""")
    for k,v in r.items(): print(k,v)
    print(errs); b.close()
