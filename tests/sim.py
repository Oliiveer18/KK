import sys,json
from playwright.sync_api import sync_playwright
with sync_playwright() as p:
    b=p.chromium.launch(executable_path='/usr/bin/google-chrome',args=['--no-sandbox','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist'])
    pg=b.new_context(viewport={'width':700,'height':440}).new_page()
    errs=[];pg.on('pageerror',lambda e:errs.append(str(e)))
    pg.goto('file:///home/claude/'+(sys.argv[1] if len(sys.argv)>1 else 'prototipo_inline.html')); pg.wait_for_timeout(700); pg.click('#go'); ev=pg.evaluate
    r=ev("""(()=>{
      started=true; const out={};
      const run=(name,ks,sprint,frames)=>{
        for(const k of ['KeyW','KeyA','KeyS','KeyD','ShiftLeft'])keys[k]=false;
        for(let i=0;i<90;i++)update(1/60);               // parado
        for(const k of ks)keys[k]=true; keys.ShiftLeft=sprint;
        let tl=[],both=0,bothSlow=0,maxd=0,hopFrames=0;
        for(let i=0;i<frames;i++){update(1/60);const a=feet[0].stepping,b2=feet[1].stepping,sp=P.vel.length();
          tl.push(a&&b2?'B':a?'L':b2?'R':'.'); if(a&&b2){both++; if(sp<6.4)bothSlow++}
          for(let j=0;j<2;j++){const d=Math.hypot(feet[j].pos.x-hip[j].x,feet[j].pos.z-hip[j].z);if(!feet[j].stepping)maxd=Math.max(maxd,d)}}
        out[name]={tl:tl.join('').replace(/(.)\\1{2,}/g,(m,c)=>c+m.length+' ').slice(0,200),both,bothSlow,maxd:+maxd.toFixed(2)};
        for(const k of ks)keys[k]=false; keys.ShiftLeft=false; for(let i=0;i<60;i++)update(1/60);
      };
      mouse.x=innerWidth/2; mouse.y=60; mode='kb';
      run('andar W',['KeyW'],false,90); run('correr W',['KeyW'],true,90); run('correr D (lado)',['KeyD'],true,90); run('correr diag SD',['KeyS','KeyD'],true,90); run('correr S (atrás)',['KeyS'],true,90); run('andar A',['KeyA'],false,90);
      return out})()""")
    for k,v in r.items(): print(k,v)
    print(errs); b.close()
