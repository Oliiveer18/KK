from playwright.sync_api import sync_playwright
with sync_playwright() as p:
    b=p.chromium.launch(executable_path='/usr/bin/google-chrome',args=['--no-sandbox','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist'])
    pg=b.new_context(viewport={'width':900,'height':600}).new_page(); pg.on('pageerror',lambda e:print('ERR',e))
    pg.goto('file:///home/claude/prototipo_inline.html'); pg.wait_for_timeout(800)
    print(pg.evaluate("""()=>{const w=()=>[$('dashb').style.width.slice(0,4),$('dashb').style.background,$('dash').style.opacity];const r=[];
      P.pos.set(0,0,0);for(let i=0;i<5;i++)update(1/60);r.push(['listo',...w()]);
      flags.dash=true;update(1/60);r.push(['dash',...w()]);for(let i=0;i<8;i++)update(1/60);r.push(['dash+8',...w()]);
      for(let i=0;i<20;i++)update(1/60);r.push(['cd',...w()]);flags.dash=true;update(1/60);r.push(['deny',...w()]);
      for(let i=0;i<60;i++)update(1/60);r.push(['cd2',...w()]);for(let i=0;i<30;i++)update(1/60);r.push(['rdy',...w()]);for(let i=0;i<150;i++)update(1/60);r.push(['idle',...w()]);return r}"""))
    b.close()
