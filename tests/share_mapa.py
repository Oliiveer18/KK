"""Mando en campaña (?mapa=6): el botón Share abre el mapa táctico con el inventario al lado (en el iPhone Safari no da el touchpad); la cruceta recorre
el inventario, ○ o Share cierran los dos. En campaña Share ya no abre el polígono de tiro. En el menú de Options, ○ sale al momento."""
import os, sys
from playwright.sync_api import sync_playwright
bad = 0
def chk(c, m):
    global bad
    print(('OK  ' if c else 'FALLO ') + m); bad += 0 if c else 1
with sync_playwright() as p:
    b = p.chromium.launch(executable_path='/usr/bin/google-chrome', args=['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'])
    pg = b.new_page(viewport={'width': 1100, 'height': 600}); errs = []; pg.on('pageerror', lambda e: errs.append(str(e))); ev = pg.evaluate
    pg.goto('file://' + os.path.abspath('index.html') + '?mapa=6'); pg.wait_for_timeout(1000); ev('begin()'); pg.wait_for_timeout(300)
    ev('''()=>{MX.pl.inv=1e9;MX.pl.hp=1e9;const pad={connected:true,mapping:'standard',axes:[0,0,0,0],buttons:Array.from({length:18},()=>({pressed:false,value:0}))};Object.defineProperty(navigator,'getGamepads',{configurable:true,value:()=>[pad]});window.PAD=pad;
      window.tap=i=>{pad.buttons[i].pressed=true;INVENTARIO.input();pad.buttons[i].pressed=false;INVENTARIO.input()}}''')
    ev('tap(8)'); r = ev('()=>{const d=document.querySelector("dialog[open]");return {map:MX.mapOpen,bag:!!d,dock:!!d&&d.classList.contains("inv"),range:RANGE.on,txt:d?d.textContent.slice(0,30):""}}')
    print(r)
    chk(r['map'] and r['bag'] and r['dock'], 'Share abre el mapa táctico con el inventario al lado («%s»)' % r['txt'])
    chk(not r['range'], 'en campaña Share no abre el polígono de tiro')
    ev('tap(1)'); r = ev('()=>({map:MX.mapOpen,bag:!!document.querySelector("dialog[open]")})')
    chk(not r['map'] and not r['bag'], '○ cierra el mapa y el inventario')
    ev('tap(8)'); ev('tap(8)'); r = ev('()=>({map:MX.mapOpen,bag:!!document.querySelector("dialog[open]")})')
    chk(not r['map'] and not r['bag'], 'Share otra vez también cierra los dos')
    # menú de Options: ○ sale al momento
    ev('()=>{openMenu();prevBtn.fill&&prevBtn.fill(false)}'); pg.wait_for_timeout(100)
    ev('()=>{PAD.buttons[1].pressed=true;menuTick();PAD.buttons[1].pressed=false;menuTick()}')
    chk(not ev('menuOpen'), 'en el menú de Options, ○ sale al momento')
    chk(not errs, 'sin errores JS ' + str(errs[:2]))
sys.exit(1 if bad else 0)
