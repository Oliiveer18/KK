"""Foto cenital EXACTA del distrito completo (?mapa=6, v3 simétrico): se dibuja con el propio juego (cámara ortográfica sobre los datos reales) y se superpone una retícula de coordenadas y las etiquetas
colocadas en sus coordenadas reales. Genera docs/img/distrito_v3.png (+ 5 ampliaciones) y docs/DISTRITO_V3.md (lista exacta de ubicaciones). Uso: python3 -I tools/foto_distrito.py"""
import os, sys, json
from playwright.sync_api import sync_playwright
RAIZ = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
def main():
    with sync_playwright() as p:
        b = p.chromium.launch(executable_path='/usr/bin/google-chrome', args=['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'])
        W = 2400
        pg = b.new_page(viewport={'width': W, 'height': W}); ev = pg.evaluate
        pg.goto('file://' + RAIZ + '/index.html?mapa=6'); pg.wait_for_timeout(1000); ev('begin()'); pg.wait_for_timeout(2500)
        data = ev('''()=>{const I=MAPA.built.info,c={};for(const p of props)if(!p.dead)c[p.type]=(c[p.type]||0)+1;
          return {info:I,buildings:OBJ.buildings.map(b=>({kind:b.kind,x:Math.round(b.group.position.x),z:Math.round(b.group.position.z)})),count:c,trees:MAPA.built.walls.filter(w=>w.tree).length,
            spawns:MAPA.built.spawns.map(a=>a[0]),hot:MAPA.built.hot.map(h=>[Math.round(h[0]),Math.round(h[1])])}}''')
        def prep(cx, cz, ext, ov):
            ev('''([cx,cz,ext,W])=>{menuOpen=true;MX.on=false;scene.fog=null;for(const e of MX.ents){if(e.root)e.root.visible=false;if(e.ring)e.ring.visible=false;if(e.bar&&e.bar.el)e.bar.el.style.display='none'}
              for(const z of MX.zom.list){z.dead=true;z.st='dead'}
              for(const el of [...document.body.children]){if(el!==renderer.domElement)el.style.display='none'}
              renderer.domElement.style.cssText='position:fixed;left:0;top:0;width:'+W+'px;height:'+W+'px';renderer.setPixelRatio(1);renderer.setSize(W,W);
              const cam=new THREE.OrthographicCamera(cx-ext,cx+ext,cz-ext,cz+ext,1,3000);cam.position.set(cx,1500,cz);cam.up.set(0,0,-1);cam.lookAt(cx,0,cz);cam.left=-ext;cam.right=ext;cam.top=ext;cam.bottom=-ext;
              cam.position.set(cx,1500,cz);cam.lookAt(cx,0,cz);cam.updateProjectionMatrix();window.__cam=cam;
              scene.traverse(o=>{if(o.isDirectionalLight){o.position.set(cx-60,300,cz+90)}});
              if(!window.__orig){window.__orig=renderer.render.bind(renderer);renderer.render=()=>{}}   /* el bucle del juego ya no repinta encima */
              try{weapon.visible=false;handMag.visible=false}catch(e){}
              window.__orig(scene,cam)}''', [cx, cz, ext, W])
            pg.wait_for_timeout(900)
        def overlay(cx, cz, ext, items, grid, fs):
            ev('''([cx,cz,ext,W,items,grid,fs])=>{document.querySelectorAll('#ovl').forEach(e=>e.remove());const px=x=>(x-cx+ext)/(2*ext)*W,pz=z=>(z-cz+ext)/(2*ext)*W;let s='<svg id="ovl" xmlns="http://www.w3.org/2000/svg" width="'+W+'" height="'+W+'" style="position:fixed;left:0;top:0;font-family:Helvetica,Arial,sans-serif">';
              for(let g=Math.ceil((cx-ext)/grid)*grid;g<=cx+ext;g+=grid){const x=px(g);s+='<line x1="'+x+'" y1="0" x2="'+x+'" y2="'+W+'" stroke="#fff" stroke-opacity="'+(g%250===0?.55:.25)+'" stroke-width="'+(g%250===0?2.5:1)+'" '+(g%250===0?'':'stroke-dasharray="8 8"')+'/><text x="'+(x+6)+'" y="'+(fs+4)+'" font-size="'+fs+'" fill="#fff" stroke="#000" stroke-width="'+fs/6+'" paint-order="stroke" font-weight="700">x '+g+'</text>'}
              for(let g=Math.ceil((cz-ext)/grid)*grid;g<=cz+ext;g+=grid){const y=pz(g);s+='<line x1="0" y1="'+y+'" x2="'+W+'" y2="'+y+'" stroke="#fff" stroke-opacity="'+(g%250===0?.55:.25)+'" stroke-width="'+(g%250===0?2.5:1)+'" '+(g%250===0?'':'stroke-dasharray="8 8"')+'/><text x="6" y="'+(y-6)+'" font-size="'+fs+'" fill="#fff" stroke="#000" stroke-width="'+fs/6+'" paint-order="stroke" font-weight="700">z '+g+'</text>'}
              for(const it of items){const x=px(it.x),y=pz(it.z);if(x<-50||y<-50||x>W+50||y>W+50)continue;s+='<circle cx="'+x+'" cy="'+y+'" r="'+fs*.42+'" fill="'+(it.c||'#ffd24a')+'" stroke="#000" stroke-width="3"/><text x="'+(x+fs*.6)+'" y="'+(y+fs*.35)+'" font-size="'+fs+'" fill="#fff" stroke="#000" stroke-width="'+fs/5+'" paint-order="stroke" font-weight="800">'+it.t+'</text>'}
              s+='</svg>';document.body.insertAdjacentHTML('beforeend',s)}''', [cx, cz, ext, W, items, grid, fs])
        I = data['info']; items = []
        STAR = {'PLAZA', 'FAB', 'EST', 'CLI', 'FAR', 'TIE', 'PUE', 'GRA'}
        FCOL = ['#4aa0ff', '#ff5a48', '#b377ff', '#ffb92e']
        for pl in I['places']:
            i = pl['id']
            if i == 'RET': items.append({'x': pl['x'], 'z': pl['z'], 't': 'R', 'c': '#ff7a1a'}); continue
            if i == 'NIDO': items.append({'x': pl['x'], 'z': pl['z'], 't': 'N', 'c': '#7ad04c'}); continue
            nm = pl['name'].split(' · ')[0]
            c = FCOL[pl['fac']] if pl.get('fac', -1) >= 0 else '#ffffff'
            items.append({'x': pl['x'], 'z': pl['z'], 't': ('★ ' if i in STAR else '') + nm, 'c': c})
        for bl in I['blocks']: items.append({'x': (bl['x0'] + bl['x1']) / 2, 'z': (bl['z0'] + bl['z1']) / 2, 't': 'Bosque', 'c': '#3d5a31'})
        prep(0, 0, 520, 0); overlay(0, 0, 520, items, 125, 30); pg.screenshot(path=RAIZ + '/docs/img/distrito_v3.png')
        for nm, (cx, cz) in {'azul_noroeste': (-250, -250), 'rojo_noreste': (250, -250), 'violeta_sureste': (250, 250), 'ambar_suroeste': (-250, 250), 'centro': (0, 0)}.items():
            prep(cx, cz, 270, 0); overlay(cx, cz, 270, items, 25, 22); pg.screenshot(path=RAIZ + '/docs/img/distrito_v3_%s.png' % nm)
        fac = lambda pl: ['Azul', 'Rojo', 'Violeta', 'Ámbar'][pl['fac']] if pl.get('fac', -1) >= 0 else 'común'
        md = ['# Distrito v3 (simétrico) — ubicaciones oficiales (generado por `tools/foto_distrito.py`; no editar a mano)', '',
              'Coordenadas del mundo en metros: **x** hacia la derecha (este), **z** hacia abajo (sur); norte arriba; el centro del mapa es (0, 0) y el mapa va de −500 a +500. '
              'La foto `docs/img/distrito_v3.png` es un dibujo del propio juego (cámara ortográfica sobre los datos reales) con una retícula cada 125 m (línea gruesa cada 250 m): lo que ves ahí es lo que hay en el juego, en ese sitio. '
              'Ampliaciones: `distrito_v3_azul_noroeste.png`, `_rojo_noreste`, `_violeta_sureste`, `_ambar_suroeste`, `_centro` (retícula cada 25 m). Los mismos datos están en `MAPA.data.M2` (`src/mapa_distrito.js`).', '',
              '**Igualdad:** el cuarto de cada facción es el del Azul girado 90° (Rojo), 180° (Violeta) o 270° (Ámbar) alrededor del centro: mismas cosas a las mismas distancias. '
              'Cada refugio está a 618 m de la Plaza Mayor y a 437 m de sus dos objetivos de borde (una Fábrica y una Estación con supermercado).', '',
              '## Zonas (rectángulos x de … a, z de … a)', '| Zona | x | z |', '|---|---|---|']
        md += ['| %s | %d … %d | %d … %d |' % (zn['name'], zn['x0'], zn['x1'], zn['z0'], zn['z1']) for zn in I['zones']]
        md += ['', '## Calles (todas rectas)', '| Calle | Ancho (m) | De (x, z) | A (x, z) |', '|---|---|---|---|']
        md += ['| %s | %d | (%d, %d) | (%d, %d) |' % (r['name'], r['w'], round(r['pts'][0][0]), round(r['pts'][0][1]), round(r['pts'][1][0]), round(r['pts'][1][1])) for r in sorted(I['roads'], key=lambda r: (-r['w'], r['name']))]
        md += ['', '## Lugares y objetivos (★ = objetivo capturable)', '| Lugar | Facción | x | z |', '|---|---|---|---|']
        md += ['| %s%s | %s | %d | %d |' % ('★ ' if pl['id'] in STAR else '', pl['name'].split(' · ')[0], fac(pl), pl['x'], pl['z']) for pl in sorted(I['places'], key=lambda p: (p.get('fac', -1), p['name'])) if pl['id'] not in ('RET', 'NIDO')]
        md += ['', '## Retenes (R en la foto): chicane de vehículos con sacos en la acera, sin muros en la calzada', ', '.join('(%d, %d)' % (pl['x'], pl['z']) for pl in I['places'] if pl['id'] == 'RET')]
        md += ['', '## Nidos de zombis (N en la foto)', '| Nido | Facción | x | z |', '|---|---|---|---|']
        md += ['| %s | %s | %d | %d |' % (pl['name'].split(' · ')[0], fac(pl), pl['x'], pl['z']) for pl in I['places'] if pl['id'] == 'NIDO']
        md += ['', 'Árboles: %d.' % data['trees']]
        md += ['', '## Edificios (%d)' % len(data['buildings']), '| Tipo | x | z |', '|---|---|---|']
        md += ['| %s | %d | %d |' % (b['kind'], b['x'], b['z']) for b in sorted(data['buildings'], key=lambda b: (b['kind'], b['x'], b['z']))]
        md += ['', '## Objetos colocados (por tipo)', ', '.join('%s %d' % (k, v) for k, v in sorted(data['count'].items(), key=lambda kv: -kv[1]))]
        md += ['', '## Puntos de aparición de cada refugio (primero de 6)', ', '.join('%s (%d, %d)' % (n, round(sp['x']), round(sp['z'])) for n, sp in zip(['Azul', 'Rojo', 'Ámbar', 'Violeta'], data['spawns']))]
        open(RAIZ + '/docs/DISTRITO_V3.md', 'w').write('\n'.join(md) + '\n')
        print('ok', len(data['buildings']), 'edificios', data['trees'], 'árboles')
main()
