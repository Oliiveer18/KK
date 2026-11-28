import os, math
from playwright.sync_api import sync_playwright
errs=[]; fails=[]
def chk(c,m):
    print(('  OK  ' if c else '  FALLA ')+m)
    if not c: fails.append(m)
with sync_playwright() as p:
    b=p.chromium.launch(executable_path='/usr/bin/google-chrome', args=['--use-gl=swiftshader','--enable-unsafe-swiftshader','--no-sandbox'])
    pg=b.new_page(viewport={'width':1100,'height':700}); pg.on('pageerror',lambda e:errs.append(str(e)))
    pg.goto('file://'+os.path.abspath('index.html')); pg.wait_for_timeout(1500)
    pg.evaluate("""window.__b=new Array(18).fill(0); window.__a=[0,0,0,0];
      navigator.getGamepads=()=>[{connected:true,id:'DualSense',mapping:'standard',axes:window.__a,buttons:window.__b.map(v=>({pressed:!!v,value:v}))}];""")
    pg.evaluate('begin()'); ev=pg.evaluate
    def run(n): ev('for(let i=0;i<%d;i++) update(1/60)'%n)
    ev('window.__a=[0,0,.3,0]'); run(10); ev('window.__a=[0,0,0,0]'); run(10)   # el mando manda (modo pad)
    ev('rangeToggle&&RANGE.on&&rangeToggle(); P.pos.x=0;P.pos.z=0; P.aimT=P.aim=Math.PI; P.gCount=3; P.sCount=2')   # mirando "arriba" (−z) en pantalla
    ev("RANGE.on&&(RANGE.tg||[]).forEach(t=>t.hp=-1)"); ev('boxes.length=0')   # sin obstáculos en el camino
    def hand(ry,rx=0,hold=40):
        ev('P.gCount=3;P.pos.x=0;P.pos.z=0;P.aimT=P.aim=Math.PI;P.vel.set(0,0,0)')
        ev('P.gCount=3;P.pos.x=0;P.pos.z=0;P.aimT=P.aim=Math.PI;P.vel.set(0,0,0);window.__a=[0,0,%f,%f];window.__b[5]=1;for(let i=0;i<%d;i++) update(1/60)'%(rx,ry,hold))
        rd=ev('[landRing.visible,landRing.position.x,landRing.position.z,P.gDist,P.gDir,P.aim]'); print('   gDist',rd[3],'gDir %.2f'%rd[4])
        ev('window.__b[5]=0'); run(1)
        # seguir hasta que la granada esté a punto de estallar y medir dónde está
        ev("window.__gp=null"); 
        for i in range(140):
            run(1); r=ev("(()=>{const g=grens.find(q=>q.on&&!q.launched);return g?[g.p.x,g.p.z,g.fuse]:null})()")
            if r and r[2]<.05: break
            if r: ev("window.__gp=%s"%r)
        gp=ev("window.__gp"); run(80); ev('window.__a=[0,0,0,0]'); run(40)
        return rd,gp
    for ry,name,exp in [(-1,'stick arriba',7),(0,'stick centro',7),(1,'stick abajo',7)]:
        rd,gp=hand(ry)
        d_ring=math.hypot(rd[1]-0,rd[2]-0); d_gr=math.hypot(gp[0],gp[1]) if gp else -1
        print(name,'anillo a %.2f m, granada acabó a %.2f m (objetivo %s), dir aim %.2f (π=3.14)'%(d_ring,d_gr,exp,rd[5]))
        chk(rd[0] and abs(d_ring-exp)<.8,f'{name}: el anillo marca ≈{exp} m')
        chk(gp is not None and abs(d_gr-d_ring)<1.0,f'{name}: la granada cae en el anillo (±1 m)')
        chk(abs(math.atan2(rd[1],rd[2])-rd[5]+math.pi)%(2*math.pi)-math.pi<.1 or abs(((math.atan2(rd[1],rd[2])-rd[5]+math.pi)%(2*math.pi))-math.pi)<.1,f'{name}: el anillo apunta hacia donde mira el personaje')
    # girar con el stick derecho (derecha = sentido horario en pantalla: de arriba hacia la derecha)
    ev('P.gCount=3;P.pos.x=0;P.pos.z=0;P.aimT=P.aim=Math.PI;P.vel.set(0,0,0)')
    ev('window.__a=[0,0,0,0];window.__b[5]=1;window.__b[15]=1;for(let i=0;i<30;i++) update(1/60)')
    a1=ev('[P.gDir,P.aim,P.weaponIdx===undefined?wi:wi]'); ev('window.__b[5]=0;window.__b[15]=0'); run(60); run(120)
    chk(a1[0]<math.pi-.5,f'cruceta → gira en sentido horario (gDir {a1[0]:.2f} < π)')
    # la cruceta no cambia de arma mientras se prepara el lanzamiento
    ev('P.gCount=3;P.aimT=P.aim=Math.PI;window.__b[5]=1;window.__b[15]=1;for(let i=0;i<10;i++) update(1/60)'); w1=ev('wi'); ev('window.__b[5]=0;window.__b[15]=0'); run(80)
    chk(w1==ev('wi'),'la cruceta no cambia de arma durante el lanzamiento')
    # el stick derecho da la dirección como al apuntar (derecha en pantalla = +x), con la distancia fija de 7 m
    ev('P.gCount=3;P.pos.x=0;P.pos.z=0;P.aimT=P.aim=Math.PI;window.__a=[0,0,1,0];window.__b[5]=1;for(let i=0;i<40;i++) update(1/60)'); a3=ev('[landRing.position.x,landRing.position.z,P.gDist]'); ev('window.__b[5]=0;window.__a=[0,0,0,0]'); run(100)
    chk(a3[0]>6 and abs(a3[1])<1 and a3[2]==7,'stick derecho → el anillo va hacia la derecha a 7 m (%.1f, %.1f)'%(a3[0],a3[1]))
    # moviendo con el stick izquierdo la dirección es la del movimiento, como siempre
    ev('P.gCount=3;P.pos.x=0;P.pos.z=0;P.aimT=P.aim=Math.PI;window.__a=[1,0,0,0];window.__b[5]=1;for(let i=0;i<40;i++) update(1/60)'); a4=ev('[landRing.position.x,landRing.position.z]'); ev('window.__b[5]=0;window.__a=[0,0,0,0]'); run(100)
    chk(a4[0]>3,'stick izquierdo a la derecha: dirección de movimiento, como siempre (anillo x=%.1f)'%a4[0])
    # sin dash con la granada en mano
    ev('P.gCount=3;P.pos.x=0;P.pos.z=0;P.dashCD=0;P.dash=0;window.__a=[0,-1,0,0];window.__b[5]=1;for(let i=0;i<10;i++) update(1/60)')
    ev('window.__b[11]=1;for(let i=0;i<4;i++) update(1/60)'); d=ev('[P.dash,P.vel.length()]'); ev('window.__b[11]=0;window.__b[5]=0;window.__a=[0,0,0,0]'); run(100)
    chk(d[0]==0 and d[1]<7,'R3 con la granada en mano no hace dash (vel %.1f)'%d[1])
    # sí hay dash sin granada
    ev('P.pos.x=0;P.pos.z=0;P.dashCD=0;P.dash=0;window.__a=[0,-1,0,0];window.__b[11]=1;for(let i=0;i<4;i++) update(1/60)'); d2=ev('P.vel.length()'); ev('window.__b[11]=0;window.__a=[0,0,0,0]'); run(100)
    chk(d2>12,'sin granada, R3 sigue haciendo dash (vel %.1f)'%d2)
    # lanzagranadas
    idx=ev("WP.findIndex(w=>w.sid==='H2')"); print('índice H2',idx)
    ev("rangeWeapon(%d)"%idx)
    run(60); print('arma',ev('cur.sid'))
    chk(ev('cur.sid')=='H2','lanzagranadas equipado')
    ev("(()=>{window.__ex=[]; const _e=explode; explode=function(p,R,sc,k){window.__ex.push([p.x,p.z,R]); return _e.apply(this,arguments)}; return 1})()")
    for ry,name,exp in [(-1,'lanzagranadas stick arriba',15),(0,'lanzagranadas centro',15),(1,'lanzagranadas stick abajo',15)]:
        ev('P.pos.x=0;P.pos.z=0;P.aimT=P.aim=Math.PI;P.vel.set(0,0,0);W.ammo=W.max;W.cd=0;W.reload=-1;window.__ex=[]')
        ev('window.__a=[0,0,0,%f];window.__b[6]=1;for(let i=0;i<40;i++) update(1/60)'%ry)
        rd=ev('[landRing.visible,landRing.position.x,landRing.position.z,P.lDist,P.aim]')
        ev('window.__b[7]=1'); run(4); ev('window.__b[7]=0'); run(90)
        ex=ev('window.__ex'); ev('window.__b[6]=0;window.__a=[0,0,0,0]'); run(30)
        d_ring=math.hypot(rd[1],rd[2]); d_ex=math.hypot(ex[0][0],ex[0][1]) if ex else -1
        print(name,'anillo %.2f m, explosión %.2f m, objetivo %s'%(d_ring,d_ex,exp))
        chk(rd[0] and abs(d_ring-exp)<.8,f'{name}: anillo ≈{exp} m')
        chk(ex and abs(d_ex-d_ring)<1.0,f'{name}: explota en el anillo (±1 m)')
        chk(abs(((math.atan2(rd[1],rd[2])-rd[4]+math.pi)%(2*math.pi))-math.pi)<.1,f'{name}: el anillo apunta hacia donde mira el personaje')
    # lanzagranadas: la cruceta gira y no cambia de arma
    ev('P.pos.x=0;P.pos.z=0;P.aimT=P.aim=Math.PI;P.vel.set(0,0,0);window.__a=[0,0,0,0];window.__b[6]=1;window.__b[14]=1;for(let i=0;i<30;i++) update(1/60)')
    r=ev('[P.lDir,wi,cur.sid]'); ev('window.__b[6]=0;window.__b[14]=0'); run(60)
    chk(r[0]>math.pi+.5 and r[2]=='H2','lanzagranadas: cruceta ← gira en sentido antihorario y no cambia de arma (lDir %.2f, %s)'%(r[0],r[2]))
    # sin apuntar (solo R2): 15 m como antes
    ev('P.pos.x=0;P.pos.z=0;P.aimT=P.aim=Math.PI;P.vel.set(0,0,0);W.ammo=W.max;W.cd=0;window.__ex=[]'); run(30)
    ev('window.__b[7]=1'); run(4); ev('window.__b[7]=0'); run(90); ex=ev('window.__ex')
    chk(ex and abs(math.hypot(ex[0][0],ex[0][1])-15)<1.2,'sin apuntar: explota a ≈15 m como antes (%.1f)'%(math.hypot(ex[0][0],ex[0][1]) if ex else -1))
    b.close()
print('ERRORES JS:',errs or 'ninguno'); print('FALLOS:',len(fails))
