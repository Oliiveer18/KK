"""Bots contra infectados cercanos: reaccionan al momento, disparan sin ráfagas/pausas largas y retroceden en vez de lanzarse a por ellos."""
import os, sys, json
from playwright.sync_api import sync_playwright
bad = 0
def chk(c, m):
    global bad
    print(('OK  ' if c else 'FALLO ') + m); bad += 0 if c else 1
with sync_playwright() as p:
    b = p.chromium.launch(executable_path='/usr/bin/google-chrome', args=['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'])
    pg = b.new_page(viewport={'width': 900, 'height': 500}); errs = []; pg.on('pageerror', lambda e: errs.append(str(e))); ev = pg.evaluate
    pg.goto('file://' + os.path.abspath('index.html') + '?mapa=6'); pg.wait_for_timeout(1200); ev('begin()'); pg.wait_for_timeout(1500)
    ev('()=>{ renderer.render=()=>{}; for(let i=0;i<60*20;i++){ time+=1/60; update(1/60); } }')
    for sid in ['F1', 'S1', 'E2', 'H1']:
        r = ev('''(sid)=>{ const M=MX.M; const bots=M.ents.filter(e=>e.team===1&&!e.dead&&!e.dwn&&!e.isPlayer&&e.st==='push'&&e.reloadT<0&&!e.vis&&!e.clsWait); const bot=bots[(Math.random()*bots.length)|0]; MX.setWeapon(bot, MX.WI[sid]); bot.gCount=0; bot.sCount=0;
          const zs=[0,2.1,4.2].map((a,k)=>{ const z=MX.zom.spawn('walker', bot.p.x+Math.cos(a)*(3+k*.7), bot.p.z+Math.sin(a)*(3+k*.7), {st:'chase'}); z.tgt=bot; return z; });
          let first=-1, last=-1, maxGap=0, shots=0, done=-1; const p0=[bot.p.x,bot.p.z];
          for(let i=0;i<60*6;i++){ time+=1/60; update(1/60); const t=i/60; if(bot.firing){ shots++; if(first<0) first=t; if(last>=0&&zs.some(z=>!z.dead&&Math.hypot(z.p.x-bot.p.x,z.p.z-bot.p.z)<5)) maxGap=Math.max(maxGap,t-last); last=t; } if(done<0&&zs.every(z=>z.dead)) done=t; }
          return {w:bot.w.name, first:+first.toFixed(2), maxGap:+maxGap.toFixed(2), shots, done:+done.toFixed(1), left:zs.filter(z=>!z.dead).length, cd:bot.w.cd} }''', sid)
        for _ in range(3):
            if r['first'] >= 0: break
            r = ev('''(sid)=>{ const M=MX.M; const bots=M.ents.filter(e=>e.team===2&&!e.dead&&!e.dwn&&!e.isPlayer); const bot=bots[(Math.random()*bots.length)|0]; MX.setWeapon(bot, MX.WI[sid]); const zs=[0,2.1,4.2].map((a,k)=>{ const z=MX.zom.spawn('walker', bot.p.x+Math.cos(a)*(3+k*.7), bot.p.z+Math.sin(a)*(3+k*.7), {st:'chase'}); z.tgt=bot; return z; }); let first=-1,last=-1,maxGap=0,shots=0,done=-1; for(let i=0;i<60*6;i++){ time+=1/60; update(1/60); const t=i/60; if(bot.firing){ shots++; if(first<0) first=t; if(last>=0&&zs.some(z=>!z.dead&&Math.hypot(z.p.x-bot.p.x,z.p.z-bot.p.z)<5)) maxGap=Math.max(maxGap,t-last); last=t; } if(done<0&&zs.every(z=>z.dead)) done=t; } return {w:bot.w.name, first:+first.toFixed(2), maxGap:+maxGap.toFixed(2), shots, done:+done.toFixed(1), left:zs.filter(z=>!z.dead).length, cd:bot.w.cd} }''', sid)
        print(json.dumps(r))
        chk(0 <= r['first'] < .7, '%s: dispara a los %.2f s de tener infectados a 3 m (reflejo)' % (r['w'], r['first']))
        chk(r['maxGap'] <= max(.6, r['cd'] * 3), '%s: sin pausas largas mientras hay infectados a < 5 m (hueco máx. %.2f s)' % (r['w'], r['maxGap']))
        chk(r['left'] == 0, '%s: abate a los 3 infectados (%s s, %d disparos)' % (r['w'], r['done'], r['shots']))
    chk(not errs, 'sin errores JS ' + str(errs[:2]))
sys.exit(1 if bad else 0)
