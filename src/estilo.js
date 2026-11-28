"use strict";
/* ===================== ESTILO VISUAL (dirección de arte) =====================
   Prueba de look: tres direcciones de arte intercambiables sobre el mismo mundo, sin tocar la geometría ni añadir llamadas de dibujo.
     ?look=d  MEZCLA C + A  — noche gris: la base oscura y de contraste de C con menos tinte azul y el grano y la suciedad de A.
     ?look=a  GRIS MILITAR   — realista y sucio: gris frío y apagado, luz dura, mucho contraste, el naranja del peligro como único color vivo.
     ?look=b  POLVO          — posapocalíptico cálido: tierra, ocres y polvo, luz dorada baja, desgaste medio.
     ?look=c  NOCHE FRÍA     — azul y verde oscuros, mucho contraste, el color de las facciones y el fuego destacan.
   Por defecto se aplica el estilo D (?look=off lo desactiva y deja el original; las pruebas automatizadas no lo aplican salvo con ?look=x). También: LOOK.set('a'|'b'|'c'|'') desde la consola.
   Cómo: (1) los colores de los materiales del mundo (no personajes ni infectados) se gradúan desde su color original (saturación, claridad, contraste, tinte);
   (2) luz del sol, luz de cielo, niebla y fondo cambian de color e intensidad; (3) los materiales del SUELO (asfalto, hierba, bosque, tierra, hormigón, acera, adoquín y la pintura de las
   calles) reciben detalle procedural en su shader (ruido en coordenadas del mundo: manchas, grietas, parches, hojarasca, juntas, desgaste de pintura): cero llamadas de dibujo, cero texturas;
   (4) viñeta en los bordes (capa CSS); (5) los infectados llevan un tinte verdoso enfermizo para destacar sobre el suelo gris. */
(function () {
const QP = (location.search.match(/[?&]look=([a-z0-9]*)/) || [])[1];
/* por defecto: estilo D en los navegadores reales; ?look=off (o 0) lo desactiva; en navegadores automatizados (pruebas de imagen) no se aplica salvo que se pida con ?look=x */
const Q = QP !== undefined && QP !== '' ? QP : (navigator.webdriver ? '' : 'd');
const LK = window.LOOK = { cur: '', u: { uG: { value: new THREE.Vector4(1, 1, 1, 1) }, tK: { value: null }, tF: { value: null }, tR: { value: null }, tT: { value: null }, tB: { value: null } }, mats: new Map(), done: null };
const STY = {
  a: { name: 'Gris militar', zom: [1.02, 1.2, .86], sat: .5, lum: .86, con: 1.14, tint: [.95, .985, 1.04], keep: 1.15, gs: 1.5, gl: .82, sun: [0xfff1de, 1.12], hemi: [0x8398b0, 0x14171c, .34], fog: 0x0f1319, grime: 1.0, litter: 1.0, crack: 1.0, vig: .5, rough: 1 },
  b: { name: 'Polvo', zom: [1.0, 1.12, .9], sat: .68, lum: .96, con: 1.06, tint: [1.07, 1.0, .88], keep: 1.0, gs: 1.15, gl: .9, sun: [0xffd49a, 1.15], hemi: [0xffe3b8, 0x3a2b1c, .44], fog: 0x2b2117, grime: .75, litter: .8, crack: .7, vig: .38, rough: 1 },
  d: { name: 'Noche gris (mezcla C + A)', zom: [1.02, 1.22, .86], sat: .62, lum: .73, con: 1.17, tint: [.9, .975, 1.07], keep: 1.2, gs: 1.3, gl: .84, sun: [0xd2dcf0, 1.06], hemi: [0x4c6288, 0x0a0d14, .44], fog: 0x0a0e15, grime: 1.0, litter: 1.0, crack: 1.0, vig: .58, rough: .65 },
  c: { name: 'Noche fría', zom: [1.02, 1.22, .86], sat: .78, lum: .68, con: 1.2, tint: [.84, .95, 1.12], keep: 1.25, gs: 1.2, gl: .85, sun: [0xa7c4ff, 1.0], hemi: [0x3f5f9a, 0x080c16, .5], fog: 0x060a13, grime: .9, litter: .9, crack: .9, vig: .62, rough: .55 }
};
/* colores originales de las superficies (src/mapa.js) → tipo de detalle */
const GROUND = { 0x35383e: 1, 0x56713f: 2, 0x3d5a31: 3, 0x6c5a44: 4, 0x85827c: 5, 0x7a6d60: 6, 0x6c685f: 5, 0x9d9b92: 5, 0xdbd8cb: 7, 0xe3b942: 7 };
/* DETALLE HORNEADO: el ruido del suelo se calcula UNA vez, al cargar, en cuatro texturas pequeñas periódicas con mipmaps (una pasada de GPU por textura) y el shader del suelo sólo las lee
   (3 lecturas por píxel en vez de ~25 evaluaciones de ruido). El aspecto es el mismo que con el ruido calculado en cada píxel, pero cuesta mucho menos y los mipmaps filtran el detalle fino
   con la distancia: se acaba el parpadeo («vibración») del empedrado y las juntas al moverse.
     tK (64 m):  R manchas anchas · G manchas de aceite/suciedad · B barro · A zona de grietas
     tF (4 m):   R grano fino · G hojarasca · B guijarros · A desgaste de pintura fino
     tR (8 m):   R grietas · G pintura vial gastada
     tT (2 m):   R juntas de losa · tB (4,545 m = 10 × 20 adoquines): G juntas de adoquín · B tono de cada adoquín */
const BAKE = `
float bh(vec2 p){ p=fract(p*vec2(.1031,.1030)); p+=dot(p,p.yx+33.33); return fract((p.x+p.y)*p.x); }
float bn(vec2 p, float P){ vec2 i=floor(p), f=fract(p); f=f*f*(3.-2.*f); vec2 a=mod(i,P), b=mod(i+1.,P); return mix(mix(bh(a),bh(vec2(b.x,a.y)),f.x), mix(bh(vec2(a.x,b.y)),bh(b),f.x), f.y); }
float bf(vec2 p, float P){ return bn(p,P)*.55+bn(p*2.+vec2(7.,3.),P*2.)*.3+bn(p*4.+vec2(3.,7.),P*4.)*.15; }
varying vec2 vUv;
void main(){ vec2 u=vUv; vec4 o=vec4(0.);
#if MODE==0
  o=vec4(bf(u*22.,22.), smoothstep(.55,.82,bf(u*8.,8.)), smoothstep(.6,.78,bf(u*13.,13.)), bf(u*5.,5.));
#elif MODE==1
  o=vec4(bn(u*36.,36.), bn(u*24.,24.), bn(u*68.,68.), bn(u*12.,12.));
#elif MODE==2
  float cr=1.-smoothstep(.0,.014,abs(bf(u*6.+bf(u*14.,14.)*.5,6.)-.5)); o=vec4(cr, smoothstep(.3,.6,bf(u*26.,26.)), 0., 1.);
#elif MODE==3
  vec2 g=abs(fract(u)-.5); o=vec4(smoothstep(.478,.5,max(g.x,g.y)), 0., 0., 1.);
#else
  vec2 q=vec2(u.x*10.,u.y*20.); q.x+=floor(q.y)*.5; vec2 g=abs(fract(q)-.5); o=vec4(0., smoothstep(.44,.5,max(g.x,g.y)), bh(mod(floor(q),vec2(10.,20.))), 1.);
#endif
  gl_FragColor=o; }`;
function bakeTextures() {
  const mk = (mode, size) => { const rt = new THREE.WebGLRenderTarget(size, size, { minFilter: THREE.LinearMipmapLinearFilter, magFilter: THREE.LinearFilter, wrapS: THREE.RepeatWrapping, wrapT: THREE.RepeatWrapping, depthBuffer: false, stencilBuffer: false });
    rt.texture.generateMipmaps = true; rt.texture.anisotropy = Math.min(+((location.search.match(/aniso=(\d+)/) || [])[1] || 4), renderer.capabilities.getMaxAnisotropy ? renderer.capabilities.getMaxAnisotropy() : 1);
    const m = new THREE.ShaderMaterial({ defines: { MODE: mode }, vertexShader: 'varying vec2 vUv; void main(){ vUv=uv; gl_Position=vec4(position.xy*2.,0.,1.); }', fragmentShader: BAKE, depthTest: false, depthWrite: false });
    const q = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), m); q.frustumCulled = false; const sc = new THREE.Scene(); sc.add(q), cam = new THREE.Camera();
    return { rt, m, q, sc, cam }; };
  let cam; const prevRT = renderer.getRenderTarget(), prevAuto = renderer.shadowMap.autoUpdate; renderer.shadowMap.autoUpdate = false;
  const out = [[0, 256], [1, 512], [2, 512], [3, 256], [4, 512]].map(([mode, size]) => { const o = mk(mode, size); renderer.setRenderTarget(o.rt); renderer.render(o.sc, o.cam); return o; });
  renderer.setRenderTarget(prevRT); renderer.shadowMap.autoUpdate = prevAuto;
  for (const o of out) { o.m.dispose(); o.q.geometry.dispose(); }                                              // el shader de horneado ya no hace falta (su programa se libera)
  return out.map(o => o.rt.texture);
}
const GLSL = `
uniform sampler2D tK, tF, tR, tT, tB;
float lkh(vec2 p){ p=fract(p*vec2(.1031,.1030)); p+=dot(p,p.yx+33.33); return fract((p.x+p.y)*p.x); }
vec3 lkd(vec2 p, int T, vec4 G){
  vec4 K=texture2D(tK,p/64.), F=texture2D(tF,p/4.); float m=K.r, fine=F.r, st=K.g;
  if(T==1){ vec4 R=texture2D(tR,p/8.); float cr=R.r*smoothstep(.5,.72,K.a); float pa=step(.8,lkh(floor(p/5.)))*(.1+.1*K.r);
    float mk=smoothstep(.62,.7,F.a)*.35; float v=(.8+.38*m)*(.93+.12*fine)*(1.-.4*st*G.x)*(1.-.5*cr*G.z)+pa*G.x-mk*G.x*.2; return vec3(v,v,v*1.02); }
  if(T==2||T==3){ float mu=K.b, lit=smoothstep(.74,.9,F.g), sp=F.b;
    float v=(.7+.6*m)*(.9+.2*sp); vec3 c=vec3(v); c=mix(c, vec3(1.2,.8,.5)*v, lit*.65*G.y); c=mix(c, vec3(.55,.45,.36)*v, mu*.7*G.x*(T==3?1.:.6)); return c*(T==3?.92:1.); }
  if(T==4){ float pb=smoothstep(.84,.9,F.b); float v=(.72+.5*m)*(.92+.14*fine)+pb*.16; return vec3(v,v*.97,v*.92); }
  if(T==5){ float j=texture2D(tT,p/2.).r; float v=(.8+.36*m)*(.94+.1*fine)*(1.-.4*st*G.x)*(1.-.5*j*G.x); return vec3(v); }
  if(T==6){ vec4 B=texture2D(tB,p*.22); float v=(.78+.42*B.b)*(1.-.55*B.g*G.x)*(1.-.3*st*G.x); return vec3(v); }
  vec4 R=texture2D(tR,p/8.); return vec3(mix(1.,.62+.38*R.g,G.x*.8)*(.86+.16*fine));          // 7: pintura vial gastada
}`;
function patchGround(m, type) {
  if (m.userData.lkp) return; m.userData.lkp = 1; const prev = m.onBeforeCompile;
  m.onBeforeCompile = sh => { if (prev) prev.call(m, sh); sh.uniforms.uG = LK.u.uG; sh.uniforms.tK = LK.u.tK; sh.uniforms.tF = LK.u.tF; sh.uniforms.tR = LK.u.tR; sh.uniforms.tT = LK.u.tT; sh.uniforms.tB = LK.u.tB;
    sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nvarying vec3 lkW;').replace('#include <begin_vertex>', '#include <begin_vertex>\n{ vec4 lkp = vec4(transformed, 1.0);\n#ifdef USE_INSTANCING\n lkp = instanceMatrix * lkp;\n#endif\n lkW = (modelMatrix * lkp).xyz; }');
    sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nvarying vec3 lkW; uniform vec4 uG;\n' + GLSL).replace('#include <color_fragment>', '#include <color_fragment>\n diffuseColor.rgb *= mix(vec3(1.0), lkd(lkW.xz, ' + type + ', uG), clamp(uG.w, 0.0, 1.0));'); };
  m.customProgramCacheKey = () => 'lk' + type; m.needsUpdate = true;
}
const HSL = { h: 0, s: 0, l: 0 }, _c = new THREE.Color();
function grade(m, S) {
  const c0 = m.userData.lkc || (m.userData.lkc = m.color.clone()); _c.copy(c0); _c.getHSL(HSL); let { h, s, l } = HSL;
  const accent = s > .55 && h > .03 && h < .14 && l > .3;                                                          // naranja de peligro: se conserva
  const green = h > .2 && h < .45; s *= accent ? S.keep : green ? Math.min(1, S.sat * S.gs) : S.sat; if (green) l *= S.gl; l = Math.max(0, Math.min(1, (l - .5) * S.con + .5)) * S.lum * (accent ? 1.12 : 1); _c.setHSL(h, Math.min(1, s), Math.min(1, l));
  m.color.setRGB(_c.r * S.tint[0], _c.g * S.tint[1], _c.b * S.tint[2]);
}
function collect() {
  const skip = new Set(); if (MX && MX.M) for (const e of MX.M.ents) { if (e.root) skip.add(e.root); } if (MX.zom && MX.zom.IM) for (const k in MX.zom.IM) skip.add(MX.zom.IM[k]);
  const out = new Set(); (function walk(o) { if (skip.has(o)) return; if (o.isMesh && o.material) { for (const m of Array.isArray(o.material) ? o.material : [o.material]) if (m.isMeshStandardMaterial && !m.userData.lkx) out.add(m); } for (const c of o.children) walk(c); })(scene);
  return out;
}
let vig = null;
LK.set = function (k) {
  if (STY[k] && !LK.baked) { LK.baked = true; const t = bakeTextures(); LK.u.tK.value = t[0]; LK.u.tF.value = t[1]; LK.u.tR.value = t[2]; LK.u.tT.value = t[3]; LK.u.tB.value = t[4]; }
  LK.cur = k; const S = STY[k]; const hemi = scene.children.find(o => o.isHemisphereLight);
  if (!LK.orig) LK.orig = { sun: [sun.color.getHex(), sun.intensity], hemi: hemi ? [hemi.color.getHex(), hemi.groundColor.getHex(), hemi.intensity] : null, bg: scene.background.getHex(), fog: scene.fog.color.getHex() };
  if (MX.zom && MX.zom.IM) for (const q in MX.zom.IM) { const m = MX.zom.IM[q].material; if (m.isMeshStandardMaterial) { const z = S ? S.zom : [1, 1, 1]; m.color.setRGB(z[0], z[1], z[2]); } }   /* infectados: tinte verdoso enfermizo (se multiplica sobre sus colores, que conservan su variedad) para que destaquen sobre el suelo gris */
  if (!S) { const O = LK.orig; sun.color.setHex(O.sun[0]); sun.intensity = O.sun[1]; if (hemi && O.hemi) { hemi.color.setHex(O.hemi[0]); hemi.groundColor.setHex(O.hemi[1]); hemi.intensity = O.hemi[2]; } scene.background.setHex(O.bg); scene.fog.color.setHex(O.fog);
    LK.u.uG.value.set(1, 1, 1, 0); for (const [m, c] of LK.mats) { m.color.copy(c); if (m.userData.lkr !== undefined) m.roughness = m.userData.lkr; } if (vig) vig.style.opacity = 0; return; }
  for (const m of collect()) { if (!LK.mats.has(m)) { LK.mats.set(m, m.color.clone()); m.userData.lkr = m.roughness; } const g = GROUND[m.userData.lkc ? m.userData.lkc.getHex() : m.color.getHex()]; if (g) patchGround(m, g); }
  for (const [m] of LK.mats) { m.color.copy(LK.mats.get(m)); grade(m, S); const g = GROUND[LK.mats.get(m).getHex()]; if (g === 1) m.roughness = Math.min(1, m.userData.lkr * S.rough); }
  sun.color.setHex(S.sun[0]); sun.intensity = S.sun[1]; if (hemi) { hemi.color.setHex(S.hemi[0]); hemi.groundColor.setHex(S.hemi[1]); hemi.intensity = S.hemi[2]; }
  scene.background.setHex(S.fog); scene.fog.color.setHex(S.fog); LK.u.uG.value.set(S.grime, S.litter, S.crack, 1);
  if (/[?&]novig\b/.test(location.search)) return;                                                   // ?novig: sin viñeta (para comparar FPS con y sin ella)
  if (!vig) { vig = document.createElement('div'); vig.style.cssText = 'position:fixed;inset:0;pointer-events:none;z-index:1;transition:opacity .4s'; document.body.appendChild(vig); }
  vig.style.background = 'radial-gradient(ellipse at 50% 55%, rgba(0,0,0,0) 48%, rgba(0,0,0,' + S.vig + ') 100%)'; vig.style.opacity = 1;
};
/* en la carga, justo antes de precompilar los shaders (así los shaders del suelo ya salen con detalle y no hay compilaciones durante la partida) */
LK.boot = () => { if (Q && STY[Q] && typeof MAPA !== 'undefined' && MAPA.built) { LK.done = MAPA.built; LK.set(Q);
  if (!LK.probes) { LK.probes = []; const seen = new Set();                              // una malla de prueba (sin instanciar, invisible) por tipo de suelo: warmAll() compila también esas variantes y no hay compilaciones al ver, p. ej., la glorieta
    for (const [m, c] of LK.mats) { const g = GROUND[c.getHex()]; if (g && !seen.has(g)) { seen.add(g); const q = new THREE.Mesh(geoBox, m); q.visible = false; q.frustumCulled = false; q.position.set(0, -60, 0); q.receiveShadow = true; scene.add(q); LK.probes.push(q); } } } } };
/* se aplica cuando el mapa está construido (y otra vez si se reconstruye) */
if (Q && STY[Q]) setInterval(() => { if (typeof MAPA !== 'undefined' && MAPA.built && MAPA.built !== LK.done && MX && MX.M && MX.M.ents.length && started) { LK.done = MAPA.built; LK.set(Q); } }, 400);
})();
