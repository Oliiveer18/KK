"""Clases (Fase B2): reparto por escuadra, puesto de clases en cada refugio (bots se equipan en su chapa, el jugador al pisarla) y aura del médico."""
import os, sys, json
from playwright.sync_api import sync_playwright
bad = 0
def chk(c, m):
    global bad
    print(('OK  ' if c else 'FALLO ') + m); bad += 0 if c else 1
with sync_playwright() as p:
    b = p.chromium.launch(executable_path='/usr/bin/google-chrome', args=['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'])
    pg = b.new_page(viewport={'width': 900, 'height': 560}); errs = []; pg.on('pageerror', lambda e: errs.append(str(e))); ev = pg.evaluate
    pg.goto('file://' + os.path.abspath('index.html') + '?mapa=6'); pg.wait_for_timeout(1200); ev('begin()'); pg.wait_for_timeout(600)
    r = ev('''()=>{ const c={}, byT=[{},{},{},{}]; for(const e of MX.M.ents){ c[e.cls]=(c[e.cls]||0)+1; byT[e.team][e.cls]=(byT[e.team][e.cls]||0)+1 } return {c, byT, waiting:MX.M.ents.filter(e=>e.clsWait).length, pads:MAPA.built.info.classPads.map(t=>t.pts.length)} }''')
    print(json.dumps(r))
    chk(all(v == 6 for v in r['pads']) and len(r['pads']) == 4, '4 refugios con 6 chapas de clase')
    chk(all(sum(t.values()) == 50 for t in r['byT']), 'cada facción 50 soldados con clase')
    chk(all(t.get('med', 0) == 12 and t.get('fra', 0) == 2 for t in r['byT']), 'cada facción: 12 médicos y 2 francotiradores (misma composición)')
    chk(r['waiting'] > 150, 'al aparecer, los bots van a su chapa (%d esperando)' % r['waiting'])
    pg.wait_for_function('()=>MX.M.t>16', timeout=90000)
    r = ev('''()=>{ const e=MX.M.ents.filter(x=>!x.isPlayer), ok=e.filter(x=>!x.clsWait && x.w.sid===MX.CLASSES[x.cls].sid).length; return {total:e.length, equipped:ok, waiting:e.filter(x=>x.clsWait).length, med:e.filter(x=>x.cls==='med'&&x.bag&&x.bag.medkit===4).length} }''')
    print(json.dumps(r))
    chk(r['equipped'] > 0.8 * r['total'], 'tras unos segundos casi todos llevan el arma de su clase (%d/%d)' % (r['equipped'], r['total']))
    chk(r['med'] > 30, 'los médicos llevan su kit (4 botiquines)')
    # jugador: pisa la chapa del médico (4.ª de izquierda a derecha)
    r = ev('''()=>{ const pad=MAPA.built.info.classPads.find(t=>t.team===MX.pl.team).pts[3]; P.pos.x=pad[0]; P.pos.z=pad[1]; return pad }'''); pg.wait_for_timeout(1500)
    r = ev('()=>({cls:MX.pl.cls, bag:MX.pl.bag})'); print(json.dumps(r))
    chk(r['cls'] == 'med' and r['bag'].get('medkit') == 4, 'el jugador pisa la chapa del Médico y cambia de clase y de equipo')
    # médico cura a un aliado herido
    r = ev('''()=>{ const a=MX.M.ents.find(e=>!e.isPlayer&&e.team===MX.pl.team&&!e.dead&&!e.dwn); a.p.x=P.pos.x+2; a.p.z=P.pos.z; a.hp=30; a.lastHurt=MX.M.t; a.clsWait=null; a.goal=null; a.goalHold=true; window.__t0=MX.M.t; return a.id }'''); pg.wait_for_function('()=>MX.M.t>window.__t0+1.5', timeout=30000)
    r2 = ev('''(id)=>{ const a=MX.M.ents.find(e=>e.id===id); return a.hp }''', r); print('hp tras 1,5 s de juego con médico', r2)
    chk(r2 > 36, 'el médico cura (+8/s) a un aliado a 2 m')
    chk(not errs, 'sin errores JS ' + str(errs[:2]))
sys.exit(1 if bad else 0)
