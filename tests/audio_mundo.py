import sys, os
from playwright.sync_api import sync_playwright
errs=[]
with sync_playwright() as p:
    b=p.chromium.launch(executable_path='/usr/bin/google-chrome',args=['--no-sandbox','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist','--autoplay-policy=no-user-gesture-required'])
    pg=b.new_context().new_page(); pg.on('pageerror',lambda e:errs.append(str(e)))
    pg.goto('file://'+os.path.abspath(sys.argv[1] if len(sys.argv)>1 else 'index.html')); pg.wait_for_timeout(1500); pg.evaluate('begin()'); pg.wait_for_timeout(1500)
    ev=pg.evaluate
    def run(n): ev('for(let i=0;i<%d;i++) update(1/60)'%n)
    # armas: ciclo completo
    ev('window.__ids=[]')
    for i in range(10):
        run(60)
        sid=ev('cur.sid')
        ev('SND.count={}')
        ev('mouse.down=true; for(let i=0;i<8;i++) update(1/60); mouse.down=false'); run(60)
        shot=ev("Object.keys(SND.count).filter(k=>/_shot$/.test(k)).join(',')")
        ev('W.ammo=0; mouse.down=true; for(let i=0;i<6;i++) update(1/60); mouse.down=false'); run(200)
        c=ev('SND.count'); print(sid,'disparo:',shot or 'NINGUNO','| seco',c.get(sid+'_dry',0),'rel1/2/3',c.get(sid+'_rel1',0),c.get(sid+'_rel2',0),c.get(sid+'_rel3',0),'| otros',{k:v for k,v in c.items() if k.startswith(('C_','MAG_','E1_pump','E2_action','EXP','GREN'))})
        ev('flags.swap=true'); run(60)
    # mundo
    ev('SND.count={}')
    ev("""(()=>{ const t=['crate','barrel','fence','barrier','sandbags','blocks']; })()""")
    print('tipos de prop:',ev('Object.keys(PSPEC).join(",")'))
    for ty in ev('Object.keys(PSPEC)'):
        ev('SND.count={}')
        ev("""(ty=>{ addProp(ty, P.pos.x+3, P.pos.z+3, 0); const p=props[props.length-1];
           const b=new THREE.Vector3(); bulletHitProp(p,{},p.x,p.z,1,0,5,false); destroyProp(p,1,0,1); })""".replace('(ty=>','(ty=>')+"('%s')"%ty)
        run(180)
        c=ev('SND.count'); print(' ',ty,{k:v for k,v in c.items() if k.startswith(('IMP','BRK','DEB','FIRE','EXP','LEAK'))})
    # granadas, humo, explosión, fuego, fugas, empuje
    ev('SND.count={}; P.gType="frag"; P.gState=1'); run(5); ev('P.gState=1')
    ev('explode(new THREE.Vector3(P.pos.x+6,.5,P.pos.z+6),4.2,.85,"barrel")'); run(30)
    ev('explode(new THREE.Vector3(P.pos.x+6,.5,P.pos.z-6))'); run(30)
    ev('popSmoke(new THREE.Vector3(P.pos.x+4,0,P.pos.z))'); run(120)
    ev('igniteZone(P.pos.x+3,P.pos.z+3,1.2,4)'); run(60)
    ev('window.__n=Object.keys(LOOPS).length'); print('bucles activos',ev('window.__n'),'(máx 14)')
    c=ev('SND.count'); print('mundo:',{k:v for k,v in c.items() if k.startswith(('GREN','SMOKE','FIRE','EXP','IMP'))})
    ev('launchGrenade()'); run(150); print('lanzagranadas explosión',ev('SND.count.EXP_frag||0'))
    ev('throwGrenade()'); run(120); print('lanzar:',ev('SND.count.GREN_throw||0'),'rebote',ev('SND.count.GREN_bounce||0'))
    run(600); print('bucles tras 10 s',ev('Object.keys(LOOPS).length'))
    b.close()
print('ERRORES:',errs or 'ninguno')
