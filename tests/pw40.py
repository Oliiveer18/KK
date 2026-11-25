from playwright.sync_api import sync_playwright
with sync_playwright() as p:
    b=p.chromium.launch(executable_path='/usr/bin/google-chrome',args=['--no-sandbox','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist'])
    pg=b.new_context(viewport={'width':900,'height':600}).new_page(); pg.on('pageerror',lambda e:print('ERR',e))
    pg.goto('file:///home/claude/prototipo_inline.html'); pg.wait_for_timeout(1200)
    print(pg.evaluate("""()=>{
      const r={placed:window.__propsPlaced,props:props.length,types:{}};
      props.forEach(p=>r.types[p.type]=(r.types[p.type]||0)+1);
      // crate: dispara pellets hasta romper
      const c=props.find(p=>p.type==='crate'); const n0=boxes.length;
      for(let i=0;i<8;i++) damageProp(c,10,c.x,c.z,1,0,'bullet');
      for(let i=0;i<120;i++) update(1/60);
      r.crateDead=c.dead; r.boxesDelta=n0-boxes.length; r.deb=DEB.length;
      // barril de agua: agujero+fuga
      const w=props.find(p=>p.type==='barrel'); bulletHitProp(w,w.box,w.x-.3,w.z,1,0,20,.6);
      for(let i=0;i<120;i++) update(1/60); r.fluid=w.fluid; r.pud=PUDDLES.filter(q=>q.life>0).length;
      // barril explosivo en cadena
      const f=props.filter(p=>p.type==='barrelFuel'); let a=f.find(q=>props.some(o=>o!==q&&o.explosive&&Math.hypot(o.x-q.x,o.z-q.z)<2.5)); r.nf=f.length; r.fpos=f.map(q=>[q.x.toFixed(1),q.z.toFixed(1)]); a=a||f[0];
      const nb=props.filter(p=>p.explosive).length; damageProp(a,999,a.x,a.z,1,0,'bullet');
      for(let i=0;i<120;i++) update(1/60); r.exp=[nb,props.filter(p=>p.explosive).length]; r.fires=FIRES.length;
      // barrera empujada
      const bar=props.find(p=>p.type==='barrier'); const x0=bar.x; pushProp(bar,10,0); for(let i=0;i<60;i++) update(1/60); r.moved=bar.x-x0;
      // penetracion: madera reduce daño
      const w2=props.find(p=>p.type==='crateS'); r.pen=bulletHitProp(w2,w2.box,w2.x-.3,w2.z,1,0,25,.6);
      const m=props.find(p=>p.type==='blocks'); r.penBlock=bulletHitProp(m,m.box,m.x,m.z-.1,0,1,25,.2);
      return r;}"""))
    pg.wait_for_timeout(300); pg.screenshot(path='t/p40.png'); b.close()
