"""Puntuación (F3): el refugio no puntúa; los puntos comunes dan 2 por tick de 5 s y los puestos avanzados 1; cada baja a un rival suma 1 punto a su facción; una baja a un aliado o a un infectado no suma."""
import os, sys
from playwright.sync_api import sync_playwright
bad = 0
def chk(c, m):
    global bad
    print(('OK  ' if c else 'FALLO ') + m); bad += 0 if c else 1
with sync_playwright() as p:
    b = p.chromium.launch(executable_path='/usr/bin/google-chrome', args=['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'])
    pg = b.new_page(viewport={'width': 900, 'height': 500}); errs = []; pg.on('pageerror', lambda e: errs.append(str(e))); ev = pg.evaluate
    pg.goto('file://' + os.path.abspath('index.html') + '?mapa=6'); pg.wait_for_timeout(1200); ev('begin()'); pg.wait_for_timeout(2500)
    r = ev('''()=>{ renderer.render=()=>{}; const M=MX.M, SQ=MX.SQ; const kz=()=>{for(const z of MX.zom.list){z.dead=true;z.st='dead';z.deadT=99}}; kz(); MX.pl.inv=1e9;
      const run=s=>{ for(let i=0;i<60*s;i++){ kz(); time+=1/60; update(1/60); } };
      // 1) sólo refugios: 0 puntos
      for(const o of SQ.objs){ o.owner=o.refuge?o.owner:-1; o.cap=0; o.capBy=-1; } SQ.score=[0,0,0,0]; SQ.scoreT=0; const refOwned=SQ.objs.filter(o=>o.refuge&&o.owner>=0).length; run(30); const a=SQ.score.slice();
      // 2) un común y un puesto avanzado
      const com=SQ.objs.find(o=>o.shared), pue=SQ.objs.find(o=>o.id==='PUE'); com.owner=0; pue.owner=1; SQ.score=[0,0,0,0]; SQ.scoreT=0; run(30); const b=SQ.score.slice(); com.owner=-1; pue.owner=-1;
      // 3) bajas: rival +1, aliado 0
      const t0=M.ents.filter(e=>!e.isPlayer&&e.team===0&&!e.dead), t1=M.ents.filter(e=>!e.isPlayer&&e.team===1&&!e.dead); const k=t0[0], v=t1[0], al=t0[1]; SQ.score=[0,0,0,0];
      for(const e of M.ents) if(e!==k&&e!==v&&e!==al&&!e.isPlayer){ e.p.set(-600,0,-600); e.inv=1e9; } v.inv=0; al.inv=0; k.p.set(-100,0,-100); v.p.set(-98,0,-100); al.p.set(-102,0,-100);
      for(let i=0;i<3;i++) MX.hit(v,1e6,k,1,0,undefined,'TEST'); const c1=SQ.score.slice(); for(let i=0;i<3;i++) MX.hit(al,1e6,k,1,0,undefined,'TEST'); const c2=SQ.score.slice();
      return {refOwned,a,b,c1,c2,vDead:v.dead,alDead:al.dead} }''')
    print(r)
    chk(r['refOwned'] == 4 and r['a'] == [0, 0, 0, 0], 'con sólo los refugios, nadie puntúa (%s)' % r['a'])
    chk(8 <= r['b'][0] <= 14, 'un punto común da ~2 por 5 s (%d en 30 s)' % r['b'][0])
    chk(4 <= r['b'][1] <= 7, 'un puesto avanzado da ~1 por 5 s (%d en 30 s)' % r['b'][1])
    chk(r['vDead'] and r['c1'][0] == 1, 'una baja a un rival suma 1 punto (%s)' % r['c1'])
    chk(r['alDead'] and r['c2'][0] == 1, 'una baja a un aliado no suma (%s)' % r['c2'])
    chk(not errs, 'sin errores JS ' + str(errs[:2]))
sys.exit(1 if bad else 0)
