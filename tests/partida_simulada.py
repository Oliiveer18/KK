"""Partida simulada completa (?mapa=6, sin pintar): 200 bots, infectados y un jugador que recorre el mapa con su escuadra. Escribe el informe JSON (SIM_OUT) y falla sólo con errores JS, posiciones NaN o bots fuera del mapa.
Uso: python3 tests/partida_simulada.py [minutos=15]   (≈ 4 min de reloj para 15 de juego)"""
import os, sys, json, time
from playwright.sync_api import sync_playwright
MIN = float(sys.argv[1]) if len(sys.argv) > 1 else 15
with sync_playwright() as p:
    b = p.chromium.launch(executable_path='/usr/bin/google-chrome', args=['--no-sandbox','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist','--js-flags=--expose-gc'])
    pg = b.new_page(viewport={'width': 900, 'height': 500}); errs=[]; pg.on('pageerror', lambda e: errs.append(str(e))); pg.on('console', lambda m: errs.append('console:'+m.text[:200]) if m.type=='error' else None); ev = pg.evaluate
    pg.goto('file://' + os.path.abspath('index.html') + '?mapa=6'); pg.wait_for_timeout(1500); ev('begin()'); pg.wait_for_timeout(3000)
    ev('''()=>{ renderer.render=()=>{}; window.SIM={ t0:MX.M.t, frames:[], deaths:[], stuck:new Map(), idle:new Map(), prevDead:new Map(), nan:0, oob:0, fr:[], samples:[], pathFail:0, lastOwners:null, capEvents:[], kills0:null };
      const M=MX.M; const oc=MX.combat; MX.combat=function(k,x,z,team,vic){ if(k==='hit'&&team!==undefined&&vic!==undefined&&team!==vic&&SIM.firstHit===undefined) SIM.firstHit=+M.t.toFixed(1); return oc.apply(this,arguments) }; for(const e of M.ents){ SIM.prevDead.set(e,!!e.dead); } SIM.owners0=MX.SQ.objs.map(o=>o.owner); }''')
    total = int(MIN*60); step = 30  # segundos por bloque
    for blk in range(total//step):
        ev('''(S)=>{ const M=MX.M, pl=MX.pl, SQ=MX.SQ; const half=(MAPA.built&&MAPA.built.half)||375; const q=(a,x)=>a[Math.floor(a.length*x)];
          for(let i=0;i<60*S;i++){
            time+=1/60;
            // el jugador (como una persona): va al punto no suyo más cercano, se queda allí; su escuadra le sigue
            if(!pl.dead){ if(i%120===0){ let best=null,bd=1e9; for(const o of SQ.objs){ if(o.id==='REF'||o.owner===pl.team) continue; const d=Math.hypot(o.x-P.pos.x,o.z-P.pos.z); if(d<bd){bd=d;best=o} } if(best!==SIM.tgt||!SIM.wp){ SIM.tgt=best; } if(best){ const d=Math.hypot(best.x-P.pos.x,best.z-P.pos.z); if(d>6){ const pth=MX.findPath(P.pos.x,P.pos.z,best.x,best.z); SIM.wp=pth&&pth.length?pth.slice():null; SIM.wi=0; } else SIM.wp=null; } }
              if(SIM.wp&&SIM.wi<SIM.wp.length){ const w=SIM.wp[SIM.wi], dx=w.x-P.pos.x, dz=w.z-P.pos.z, d=Math.hypot(dx,dz); if(d<1) SIM.wi++; else { const st=Math.min(6.5/60,d); P.pos.x+=dx/d*st; P.pos.z+=dz/d*st; pl.p.set(P.pos.x,0,P.pos.z); } } }
            const t0=performance.now(); update(1/60); SIM.fr.push(performance.now()-t0); if(i%10===0) MAPA.cull(camera);
            if(i%30===0){ // muestras
              for(const e of M.ents){ const was=SIM.prevDead.get(e); if(e.dead&&!was){ SIM.deaths.push({t:+(M.t).toFixed(0), id:e.id, team:e.team, cls:e.cls, src:e.lastSrc||'?', att:e.lastAtt?e.lastAtt.team:(e.lastAtt===null?'-':'?'), isPl:!!e.isPlayer, x:Math.round(e.p.x), z:Math.round(e.p.z)}); } SIM.prevDead.set(e,!!e.dead);
                if(!isFinite(e.p.x)||!isFinite(e.p.z)||!isFinite(e.p.y)) SIM.nan++; if(Math.abs(e.p.x)>half+2||Math.abs(e.p.z)>half+2) SIM.oob++;
                if(e.dead||e.isPlayer) continue;
                // atascado: quiere ir a algún sitio (goal) pero no avanza 12 s
                let s=SIM.stuck.get(e); if(!s){ s={x:e.p.x,z:e.p.z,t:M.t,rep:false}; SIM.stuck.set(e,s); }
                const mv=Math.hypot(e.p.x-s.x,e.p.z-s.z); if(mv>1.5||!e.goal||e.holdT>0||e.dwn||e.st==='cover'||e.clsWait){ s.x=e.p.x; s.z=e.p.z; s.t=M.t; s.rep=false; } else if(M.t-s.t>14 && !s.rep){ s.rep=true; (SIM.stuckList=SIM.stuckList||[]).push({t:+M.t.toFixed(0), id:e.id, st:e.st, cls:e.cls, x:Math.round(e.p.x), z:Math.round(e.p.z), gx:Math.round(e.goal.x), gz:Math.round(e.goal.z), path:!!e.path, pj:!!e.pj, vis:!!e.vis, sq:e.sqd&&e.sqd.mission&&e.sqd.mission.type}); }
              }
            }
            if(i%300===0){ const al=[0,0,0,0], bots=[0,0,0,0]; for(const e of M.ents){ if(!e.dead){ al[e.team]++; if(e.dwn) bots[e.team]++; } }
              const own=[0,0,0,0]; for(const o of SQ.objs) if(o.owner>=0) own[o.owner]++; const zl=MX.zom.list; let za=0,zc=0; for(const z of zl){ if(!z.dead){ za++; if(z.st==='chase'||z.st==='attack') zc++; } }
              const sqs=SQ.list.filter(s=>s.members.some(m=>!m.dead)); let aw=0; for(const p of AWAKE) aw++;
              SIM.samples.push({t:+(M.t).toFixed(0), score:M.score.slice(), own, alive:al, down:bots, zom:za, chasing:zc, squads:sqs.length, awake:aw, plHp:Math.round(pl.hp), plDead:!!pl.dead, plPos:[Math.round(P.pos.x),Math.round(P.pos.z)], over:!!M.over, sq:SQ.score.slice(), sqOwn:SQ.objs.map(o=>o.owner), sqd:(pl.sqd?pl.sqd.members.filter(m=>!m.isPlayer&&!m.dead).map(m=>Math.round(Math.hypot(m.p.x-P.pos.x,m.p.z-P.pos.z))):[]), plSqLead:!!(pl.sqd&&pl.sqd.playerLead), plOrder:pl.sqd&&pl.sqd.order&&pl.sqd.order.type}); }
            if(M.over) break; }
          return M.over }''', step)
        done = ev('()=>!!MX.M.over')
        print('bloque', blk+1, '/', total//step, 't=', ev('()=>Math.round(MX.M.t)'), 'score', ev('()=>MX.M.score.join("/")'), 'errs', len(errs), flush=True)
        if done: break
    rep = ev('''()=>{ const s=SIM, fr=[...s.fr].sort((a,b)=>a-b); const q=x=>fr[Math.floor(fr.length*x)];
      const byTeam=[0,0,0,0], bySrc={}, byPair={}; for(const d of s.deaths){ byTeam[d.team]++; bySrc[d.src]=(bySrc[d.src]||0)+1; }
      const kills=MX.M.ents.map(e=>({id:e.id,team:e.team,cls:e.cls,k:e.kills|0,d:e.deaths|0,isPl:!!e.isPlayer}));
      const kt=[0,0,0,0], dt=[0,0,0,0]; for(const k of kills){ kt[k.team]+=k.k; dt[k.team]+=k.d; }
      const cls={}; for(const k of kills){ const c=k.cls||'?'; (cls[c]=cls[c]||{n:0,k:0,d:0}); cls[c].n++; cls[c].k+=k.k; cls[c].d+=k.d; }
      return JSON.stringify({v4:(MX.REF?{firstHit:SIM.firstHit,pct:MX.REF.pct.map(v=>Math.round(v)),destroyed:MX.REF.destroyed,eliminated:MX.REF.eliminated,dmgBy:MX.REF.dmgBy.map(a=>a.map(Math.round)),refStats:MX.REF.stats,def:MX.DEF&&MX.DEF.stats,off:MX.OFF&&MX.OFF.stats,up:MX.REF.up,zomAlive:MX.zom.count()}:null),eco:(MX.ECO?{stock:MX.ECO.stock.map(q=>q.madera+q.piedra+q.hierro),gained:MX.ECO.stat.gained,deposited:MX.ECO.stat.deposited,spent:MX.ECO.stat.spent,lg:{jobs:MX.LG.stats.jobs,aborts:MX.LG.stats.aborts,why:MX.LG.stats.why},desg:MX.DESG.stats}:null),simT:Math.round(MX.M.t), frames:fr.length, logic:{p50:+q(.5).toFixed(1),p95:+q(.95).toFixed(1),p99:+q(.99).toFixed(1),max:+fr[fr.length-1].toFixed(0), over30:fr.filter(x=>x>30).length}, deaths:s.deaths.length, byTeam, bySrc, nan:s.nan, oob:s.oob, stuckList:(s.stuckList||[]).slice(0,30), nstuck:(s.stuckList||[]).length, samples:s.samples, kt, dt, cls, final:{sq:MX.SQ.score, winner:MX.SQ.winner, score:MX.M.score, own:MX.SQ.objs.map(o=>[o.code||o.name,o.owner]), over:!!MX.M.over}, plDeaths:s.deaths.filter(d=>d.isPl).length}) }''')
    open(os.environ.get('SIM_OUT','/tmp/partida_simulada.json'),'w').write(rep)
    d = json.loads(rep); print(json.dumps({k: d[k] for k in ['v4','eco','simT','logic','deaths','byTeam','bySrc','nan','oob','nstuck','plDeaths','kt','dt','final']}))
    print('ERRORES_JS', len(errs), errs[:3])
    sys.exit(1 if (errs or d['nan'] or d['oob']) else 0)
