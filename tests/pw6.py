from playwright.sync_api import sync_playwright
INIT=open('t/pw4.py').read().split('INIT="""')[1].split('"""')[0]
with sync_playwright() as p:
    b=p.chromium.launch(executable_path='/usr/bin/google-chrome',args=['--no-sandbox','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist'])
    pg=b.new_context(viewport={'width':800,'height':600}).new_page(); pg.add_init_script(INIT)
    pg.goto('file:///home/claude/prototipo_inline.html'); pg.wait_for_timeout(800); pg.click('#go'); pg.wait_for_timeout(800)
    print('err after click:',pg.eval_on_selector('#err','e=>e.textContent')[:80])
    r=pg.evaluate("""()=>{const bad=[];scene.traverse(o=>{if(o.isMesh){const g=o.geometry;if(!g||!g.attributes.position)bad.push(o.type+':nogeom');else{g.computeBoundingSphere();const p=g.attributes.position.array;if(!g.boundingSphere||isNaN(g.boundingSphere.radius))bad.push('nanBS '+g.type);} if(isNaN(o.position.x+o.position.y+o.position.z+o.scale.x+o.scale.y+o.scale.z))bad.push('NaNpos '+(o.geometry&&o.geometry.type)+' '+o.position.toArray()+' '+o.scale.toArray());}});return bad.slice(0,8)}""")
    print(r)
    ev=pg.evaluate
    def chk(tag):
        print(tag,'|',pg.eval_on_selector('#err','e=>e.textContent')[:90].replace('\n',' '))
    ev("window.__pad=mk([1])"); pg.wait_for_timeout(300); ev("window.__pad=mk([])"); pg.wait_for_timeout(300); chk('circulo')
    print(ev("JSON.stringify({py:P.py,cr:P.crouch,pel:pel.toArray(),sh:shC.toArray(),f0:feet[0].pos.toArray(),k:rig.knee[0].position.toArray()})"))
    print(ev("JSON.stringify({cam:camera.position.toArray(),look:camLook.toArray(),ads:P.ads,fov:camera.fov,aim:P.aim,aimT:P.aimT,mode:mode})"))
    print(ev("(()=>{const bad=[];scene.traverse(o=>{if(o.geometry&&!o.geometry.boundingSphere)bad.push(o.type+' '+o.geometry.type+' vis'+o.visible)});return JSON.stringify(bad.slice(0,6))})()"))
    print(ev("(()=>{const bad=[];scene.traverse(o=>{if(o.geometry&&!o.geometry.boundingSphere)bad.push([o.position.toArray(),o.geometry.constructor.name,Object.keys(o.geometry).slice(0,5),o.parent&&o.parent.type])});return JSON.stringify(bad)})()"))
    b.close()
