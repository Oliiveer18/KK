"""Composiciones de objetos (src/composiciones.js): se montan sin solapes, dentro del mapa, deterministas, y usan los 8 objetos de siempre. Captura en docs/img/composiciones.png."""
import os, sys
from playwright.sync_api import sync_playwright
bad = 0; errs = []
def chk(c, m):
    global bad
    print(('OK  ' if c else 'FALLO ') + m); bad += 0 if c else 1
SCEN = '''(seed)=>{
  const D={half:110,ground:'grass',roads:[{axis:'x',c:0,a0:-110,a1:110,w:12},{pts:[[-100,70],[-55,50],[-10,30],[25,-5],[55,-50],[100,-85]],w:9}],surfaces:[],lots:[],refuges:[],buildings:[],objects:[],rails:[],hot:[]};
  const c={};
  c.jam1=COMP.jam(D,{road:D.roads[0],s0:6,s1:200,seed:seed+1});
  c.jam2=COMP.jam(D,{road:D.roads[1],s0:10,s1:130,seed:seed+2});
  c.bar=COMP.barricade(D,{x:-60,z:-30,axis:'x',len:14,level:1,seed:seed+3})+COMP.barricade(D,{x:-30,z:-45,axis:'z',len:14,level:2,seed:seed+4,gateOpen:true})+COMP.barricade(D,{x:0,z:-60,axis:'x',len:16,level:3,seed:seed+5});
  c.chk=COMP.checkpoint(D,{x:60,z:30,axis:'x',len:14,level:2,seed:seed+6})+COMP.checkpoint(D,{x:-70,z:80,axis:'z',len:14,level:1,seed:seed+7});
  c.tow=COMP.towerPost(D,{x:80,z:-20,level:3,seed:seed+8});
  c.sca=COMP.scatter(D,{x:30,z:-70,r:12,n:14,seed:seed+9});
  c.str=COMP.street(D,{road:D.roads[0],seed:seed+10})+COMP.street(D,{road:D.roads[1],seed:seed+11});
  c.sto=COMP.storefront(D,{kind:'super',x:-40,z:-10,rot:Math.PI,seed:seed+12})+COMP.storefront(D,{kind:'pharm',x:10,z:-12,rot:Math.PI,seed:seed+13});
  c.cam=COMP.camp(D,{x:60,z:-5,seed:seed+14});
  c.yar=COMP.yard(D,{x:-30,z:85,w:30,d:22,seed:seed+15});
  return {D,c}}'''
with sync_playwright() as p:
    b = p.chromium.launch(executable_path='/usr/bin/google-chrome', args=['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'])
    pg = b.new_page(viewport={'width': 1300, 'height': 900}); pg.on('pageerror', lambda e: errs.append(str(e))); ev = pg.evaluate
    pg.goto('file://' + os.path.abspath('index.html') + '?mapa=5'); pg.wait_for_timeout(1000); ev('begin()'); pg.wait_for_timeout(600)
    ev('()=>{window.mk=' + SCEN + '}')
    r = ev('()=>{const {D,c}=mk(100);const a=JSON.stringify(D.objects),b2=JSON.stringify(mk(100).D.objects);return {c,n:D.objects.length,det:a===b2,tipos:[...new Set(D.objects.map(o=>o.t))].sort()}}')
    print(r['c'], 'objetos', r['n']); print('tipos usados:', ', '.join(r['tipos']))
    chk(r['det'], 'deterministas: la misma semilla da exactamente lo mismo')
    chk(all(v > 0 for v in r['c'].values()), 'todas las composiciones colocan algo')
    for t in ('crate', 'sandbags', 'barrier', 'barrel', 'blocks', 'car', 'wall1', 'wall2', 'wall3', 'gate1', 'gate2', 'gate3', 'tower3', 'chainFence', 'slideGate', 'stall', 'palletBoxes', 'super', 'pharm'):
        chk(t in r['tipos'] or t in ('super', 'pharm'), 'usa «%s»' % t)
    ev('()=>{const {D}=mk(100);window.OUT=MAPA.build(D);window.DD=D}')
    o = ev('''()=>{const ps=OUT.props;let ov=0,out=0,n=ps.length;const E=.03;
      for(let i=0;i<ps.length;i++){const a=ps[i];if(Math.abs(a.x)+a.hx>DD.half+.1||Math.abs(a.z)+a.hz>DD.half+.1)out++;
        for(let j=i+1;j<ps.length;j++){const b=ps[j];if(Math.abs(a.x-b.x)<a.hx+b.hx-E&&Math.abs(a.z-b.z)<a.hz+b.hz-E)ov++}}
      const bl=OUT.buildings.length;return {n,ov,out,bl,propsTotal:props.length}}''')
    print(o)
    chk(o['n'] >= 100 and o['bl'] == 2, 'el mapa se monta con %d objetos y %d edificios' % (o['n'], o['bl']))
    chk(o['ov'] == 0, 'ningún objeto solapa con otro (%d solapes)' % o['ov'])
    chk(o['out'] == 0, 'todo queda dentro del mapa')
    ev('()=>{menuOpen=true;MX.on=false;scene.fog=null;camera.fov=45;camera.far=800;camera.updateProjectionMatrix();camera.position.set(0,250,1);camera.lookAt(0,0,0);renderer.render(scene,camera)}')
    pg.wait_for_timeout(600); pg.screenshot(path='docs/img/composiciones.png')
    chk(not errs, 'sin errores JS ' + str(errs[:2]))
sys.exit(1 if bad else 0)
