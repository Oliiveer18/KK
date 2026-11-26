"""Carga progresiva del distrito (?mapa=6&progresivo=1, que es lo que ve el jugador real): al empezar aparece una pantalla con barra que avanza por
pasos (calles y edificios → materiales → objetos soldados → lotes → sombreados) y desaparece al terminar; el juego no corre mientras carga y, al acabar,
la partida queda igual que con la carga de una vez (objetos soldados y en lotes, sin sombreados por compilar)."""
import os, sys
from playwright.sync_api import sync_playwright
bad = 0
def chk(c, m):
    global bad
    print(('OK  ' if c else 'FALLO ') + m); bad += 0 if c else 1
with sync_playwright() as p:
    b = p.chromium.launch(executable_path='/usr/bin/google-chrome', args=['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'])
    pg = b.new_page(viewport={'width': 900, 'height': 500}); errs = []; pg.on('pageerror', lambda e: errs.append(str(e))); ev = pg.evaluate
    pg.goto('file://' + os.path.abspath('index.html') + '?mapa=6&progresivo=1'); pg.wait_for_timeout(1000)
    ev('''()=>{window.__seen=[];window.__t=[];const mo=new MutationObserver(()=>{const t=document.getElementById('loadTxt'),p=document.getElementById('loadPct');if(t&&p){const s=t.textContent+'|'+p.textContent;if(__seen[__seen.length-1]!==s)__seen.push(s)}});
      mo.observe(document.body,{subtree:true,childList:true,characterData:true});window.__p=begin()}''')
    pg.wait_for_timeout(50); vis = ev("!!document.getElementById('loadUI')")
    ev('()=>window.__p')
    r = ev('''()=>({seen:__seen,gone:!document.getElementById('loadUI'),loading:LOADING,lz:props.filter(p=>p.lz).length,props:props.length,inst:MAPA.built.inst,ms:Math.round(MX.loadMs),progs:renderer.info.programs.length,on:MX.on})''')
    print(r)
    chk(vis, 'al empezar se ve la pantalla de carga')
    pct = [int(s.split('|')[1].rstrip(' %')) for s in r['seen']]
    chk(len(r['seen']) >= 5 and pct == sorted(pct) and pct[-1] == 100, 'la barra avanza por pasos hasta el 100 %% %s' % pct)
    chk(r['gone'] and not r['loading'] and r['on'], 'al terminar la pantalla desaparece y la partida está en marcha (%d ms)' % r['ms'])
    chk(r['lz'] > r['props'] * .9 and r['inst'] and r['inst']['lotes'] > 1000, 'objetos soldados (%d de %d) y en lotes (%s)' % (r['lz'], r['props'], r['inst']))
    p0 = r['progs']; ev('()=>{menuOpen=false}'); pg.wait_for_timeout(1500); p1 = ev('renderer.info.programs.length')
    chk(p1 == p0, 'ningún sombreado nuevo al jugar después de cargar (%d → %d)' % (p0, p1))
    chk(not errs, 'sin errores JS ' + str(errs[:2]))
sys.exit(1 if bad else 0)
