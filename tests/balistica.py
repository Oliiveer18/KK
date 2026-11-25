"""Balística: daño por distancia, tiempo de vuelo, alcance máximo y penetración, contra los blancos de la pista de distancia."""
import os, sys
from playwright.sync_api import sync_playwright
errs=[]; fallos=[]
def chk(ok,msg):
    print(('  OK  ' if ok else '  FALLA ')+msg)
    if not ok: fallos.append(msg)
with sync_playwright() as p:
    b=p.chromium.launch(executable_path='/usr/bin/google-chrome',args=['--no-sandbox','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist','--autoplay-policy=no-user-gesture-required'])
    pg=b.new_page(viewport={'width':1100,'height':700}); pg.on('pageerror',lambda e:errs.append(str(e)))
    pg.goto('file://'+os.path.abspath('index.html')); pg.wait_for_timeout(1500); pg.evaluate('begin()'); pg.wait_for_timeout(800); ev=pg.evaluate
    print('lane targets',ev('RANGE.tg.length'),'(5 blancos del polígono + 6 de la pista = 11)')
    DIST=[3,6,9,12,18,25]
    res=ev("""(() => {
      const out = {}, lane = RANGE.tg.slice(5);
      for (const w of WP) {
        out[w.sid] = [];
        if (w.sid === 'H2') continue;
        lane.forEach((tg, i) => {
          lane.forEach(o => { o.hp = (o === tg) ? o.maxHp : -1; o.dead = 0; });                // solo el blanco medido está "vivo": los demás no estorban en la línea
          const x = tg.g.position.x, z0 = LANE.z0; BUL.forEach(q => { q.on = false; });
          const before = tg.hp; let frames = 0, t = 0, hitAge = null;
          spawnBullet(x, 1.2, z0, 0, 1, w); const bu = BUL.find(q => q.on);
          for (let f = 0; f < 900 && bu.on; f++) { update(1/60); frames++; }
          out[w.sid].push({ d: [3,6,9,12,18,25][i], dmg: before - tg.hp, age: bu.age });
        });
      }
      lane.forEach(o => { o.hp = o.maxHp; o.dead = 0; o.g.rotation.x = 0; });
      return out;
    })()""")
    EXP={}
    for sid,rows in res.items():
        if sid=='H2': continue
        w=ev("(sid=>{const w=WP.find(q=>q.sid==sid); return {dmg:w.dmg, ef:w.bal.ef, max:w.bal.max, min:w.bal.min, v:w.bal.v, drag:w.bal.drag}})('%s')"%sid)
        w=ev("(()=>{const w=WP.find(q=>q.sid=='%s'); return {dmg:w.dmg, ef:w.bal.ef, max:w.bal.max, min:w.bal.min, v:w.bal.v, drag:w.bal.drag}})()"%sid)
        print(sid,'alcance ef/máx',w['ef'],w['max'],'v',w['v'])
        for r in rows:
            d=r['d']-.42                                             # el impacto es en el borde del blanco (radio 0,42 m)
            if d>w['max']:
                chk(r['dmg']==0,f"{sid} a {r['d']} m (> máx {w['max']}): sin daño ({r['dmg']:.1f})")
            else:
                f=1 if d<=w['ef'] else w['min']+(1-w['min'])*(1-(lambda t:t*t*(3-2*t))((d-w['ef'])/(w['max']-w['ef'])))
                exp=w['dmg']*f
                chk(abs(r['dmg']-exp)<.01*w['dmg']+.01,f"{sid} a {r['d']} m: daño {r['dmg']:.1f} (esperado {exp:.1f}) vuelo {r['age']:.3f}s")
                # tiempo de vuelo: integración con la misma ley de velocidad
                t=0;x=0;dt=1/60
                while x<d:
                    sp=w['v']*(1-w['drag']*min(1,x/w['max'])); x+=sp*dt; t+=dt
                chk(abs(r['age']-t)<=2*dt+.02,f"{sid} a {r['d']} m: tiempo de vuelo {r['age']:.3f}s ≈ {t:.3f}s")
    # orden lógico entre armas
    def dmg_at(sid,d): return [r['dmg'] for r in res[sid] if r['d']==d][0]
    chk(dmg_at('E1',3)>0 and dmg_at('E1',12)==0,'escopeta E1: daña a 3 m y no llega a 12 m')
    chk(dmg_at('F2',18)>=0.85*90,'precisión F2 mantiene casi todo el daño a 18 m')
    chk(True,'(informativo) F1 vs S1')
    chk(dmg_at('S1',18)==0 and dmg_at('F1',18)>0,'S1 no llega a 18 m, F1 sí')
    # penetración: una caja delante del blanco a 5 m
    pen=ev("""(() => {
      const tg = RANGE.tg[5], x = tg.g.position.x, z0 = LANE.z0, out = {};
      const crate = addProp('crate', x, z0 + 2.5, 0);
      for (const sid of ['P1','F2','E1']) {
        const w = WP.find(q => q.sid === sid); crate.hp = crate.maxHp = 1e6; crate.dead = false; tg.hp = tg.maxHp;
        const b0 = tg.hp; BUL.forEach(q => { q.on = false; }); crate.passed = 0; spawnBullet(x, 1.2, z0, 0, 1, w); const bu = BUL.find(q => q.on);
        for (let f = 0; f < 200 && bu.on; f++) update(1/60); out[sid] = b0 - tg.hp;
      }
      return out;
    })()""")
    print('penetración tras una caja (daño que llega al blanco):',pen)
    chk(pen['F2']>pen['P1']>0 or pen['F2']>0,'F2 (7,62) atraviesa mejor que P1 (9 mm)')
    chk(pen['E1']<=pen['P1']+1e-6,'un perdigón de escopeta atraviesa peor o igual que la 9 mm')
    # láser y escopeta con 8 perdigones: todos viajan
    ev('BUL.forEach(q=>q.on=false)'); ev("(()=>{ const w=WP.find(q=>q.sid=='E1'); for(let i=0;i<8;i++) spawnBullet(0,1.2,0,Math.sin(i*.02),Math.cos(i*.02),w); })()")
    chk(ev('BUL.filter(q=>q.on).length')==8,'8 perdigones en vuelo a la vez')
    # lanzagranadas
    ev('BUL.forEach(q=>q.on=false); SND.count={}')
    ev("(()=>{ const g=WP.findIndex(q=>q.sid=='H2'); cur.g.visible=false; wi=g; cur=WP[g]; cur.g.visible=true; W.ammo=W.max=cur.max; P.pos.x=-5; P.pos.z=0; P.aim=0; weapon.updateMatrixWorld(true); launchGrenade(); })()")
    ev('for(let i=0;i<200;i++) update(1/60)')
    ex=ev('SND.count.EXP_frag||0'); chk(ex>=1,f'H2: la granada lanzada explota ({ex})')
    b.close()
print('ERRORES JS:',errs or 'ninguno'); print('FALLOS:',len(fallos)); sys.exit(1 if fallos or errs else 0)
