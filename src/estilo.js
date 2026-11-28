"use strict";
/* ===================== ESTILO VISUAL (dirección de arte) =====================
   Prueba de look: tres direcciones de arte intercambiables sobre el mismo mundo, sin tocar la geometría ni añadir llamadas de dibujo.
     ?look=a  GRIS MILITAR   — realista y sucio: gris frío y apagado, luz dura, mucho contraste, el naranja del peligro como único color vivo.
     ?look=b  POLVO          — posapocalíptico cálido: tierra, ocres y polvo, luz dorada baja, desgaste medio.
     ?look=c  NOCHE FRÍA     — azul y verde oscuros, mucho contraste, el color de las facciones y el fuego destacan.
   Sin ?look el juego se ve como siempre (estilo original). También: LOOK.set('a'|'b'|'c'|'') desde la consola.
   Cómo: (1) los colores de los materiales del mundo (no personajes ni infectados) se gradúan desde su color original (saturación, claridad, contraste, tinte);
   (2) luz del sol, luz de cielo, niebla y fondo cambian de color e intensidad; (3) los materiales del SUELO (asfalto, hierba, bosque, tierra, hormigón, acera, adoquín y la pintura de las
   calles) reciben detalle procedural en su shader (ruido en coordenadas del mundo: manchas, grietas, parches, hojarasca, juntas, desgaste de pintura): cero llamadas de dibujo, cero texturas;
   (4) viñeta en los bordes (capa CSS). */
(function () {
const Q = (location.search.match(/[?&]look=([a-z]*)/) || [])[1] || '';
const LK = window.LOOK = { cur: '', u: { uG: { value: new THREE.Vector4(1, 1, 1, 1) } }, mats: new Map(), done: null };
const STY = {
  a: { name: 'Gris militar', sat: .5, lum: .86, con: 1.14, tint: [.95, .985, 1.04], keep: 1.15, gs: 1.5, gl: .82, sun: [0xfff1de, 1.12], hemi: [0x8398b0, 0x14171c, .34], fog: 0x0f1319, grime: 1.0, litter: 1.0, crack: 1.0, vig: .5, rough: 1 },
  b: { name: 'Polvo', sat: .68, lum: .96, con: 1.06, tint: [1.07, 1.0, .88], keep: 1.0, gs: 1.15, gl: .9, sun: [0xffd49a, 1.15], hemi: [0xffe3b8, 0x3a2b1c, .44], fog: 0x2b2117, grime: .75, litter: .8, crack: .7, vig: .38, rough: 1 },
  c: { name: 'Noche fría', sat: .78, lum: .68, con: 1.2, tint: [.84, .95, 1.12], keep: 1.25, gs: 1.2, gl: .85, sun: [0xa7c4ff, 1.0], hemi: [0x3f5f9a, 0x080c16, .5], fog: 0x060a13, grime: .9, litter: .9, crack: .9, vig: .62, rough: .55 }
};
/* colores originales de las superficies (src/mapa.js) → tipo de detalle */
const GROUND = { 0x35383e: 1, 0x56713f: 2, 0x3d5a31: 3, 0x6c5a44: 4, 0x85827c: 5, 0x7a6d60: 6, 0x6c685f: 5, 0x9d9b92: 5, 0xdbd8cb: 7, 0xe3b942: 7 };
const GLSL = `
float lkh(vec2 p){ p=fract(p*vec2(.1031,.1030)); p+=dot(p,p.yx+33.33); return fract((p.x+p.y)*p.x); }
float lkn(vec2 p){ vec2 i=floor(p), f=fract(p); f=f*f*(3.-2.*f); return mix(mix(lkh(i),lkh(i+vec2(1.,0.)),f.x), mix(lkh(i+vec2(0.,1.)),lkh(i+vec2(1.,1.)),f.x), f.y); }
float lkf(vec2 p){ return lkn(p)*.55+lkn(p*2.03+7.1)*.3+lkn(p*4.1+3.7)*.15; }
vec3 lkd(vec2 p, int T, vec4 G){
  float m=lkf(p*.35), fine=lkn(p*9.), st=smoothstep(.55,.82,lkf(p*.12+9.));
  if(T==1){ float cr=(1.-smoothstep(.0,.014,abs(lkf(p*.7+lkf(p*1.7)*.5)-.5)))*smoothstep(.5,.72,lkf(p*.07+3.)); float pa=step(.8,lkh(floor(p/5.)))*(.1+.1*lkn(p*.7));
    float mk=smoothstep(.62,.7,lkn(p*3.+vec2(5.,2.)))*.35; float v=(.8+.38*m)*(.93+.12*fine)*(1.-.4*st*G.x)*(1.-.5*cr*G.z)+pa*G.x-mk*G.x*.2; return vec3(v*1.0,v*1.0,v*1.02); }
  if(T==2||T==3){ float ml=lkf(p*.5), mu=smoothstep(.6,.78,lkf(p*.2+4.)), lit=smoothstep(.74,.9,lkn(p*6.+3.)), sp=lkn(p*16.);
    float v=(.7+.6*ml)*(.9+.2*sp); vec3 c=vec3(v); c=mix(c, vec3(1.2,.8,.5)*v, lit*.65*G.y); c=mix(c, vec3(.55,.45,.36)*v, mu*.7*G.x*(T==3?1.:.6)); return c*(T==3?.92:1.); }
  if(T==4){ float pb=step(.86,lkn(p*17.)); float v=(.72+.5*m)*(.92+.14*fine)+pb*.16; return vec3(v,v*.97,v*.92); }
  if(T==5){ vec2 g=abs(fract(p/2.)-.5); float j=smoothstep(.478,.5,max(g.x,g.y)); float v=(.8+.36*m)*(.94+.1*fine)*(1.-.4*st*G.x)*(1.-.5*j*G.x); return vec3(v); }
  if(T==6){ vec2 q=p*vec2(2.2,4.4); q.x+=floor(q.y)*.5; vec2 g=abs(fract(q)-.5); float j=smoothstep(.44,.5,max(g.x*1.0,g.y)); float v=(.78+.42*lkh(floor(q)))*(1.-.55*j*G.x)*(1.-.3*st*G.x); return vec3(v); }
  float w=smoothstep(.3,.6,lkf(p*3.2)); return vec3(mix(1.,.62+.38*w,G.x*.8)*(.86+.16*fine));          // 7: pintura vial gastada
}`;
function patchGround(m, type) {
  if (m.userData.lkp) return; m.userData.lkp = 1; const prev = m.onBeforeCompile;
  m.onBeforeCompile = sh => { if (prev) prev.call(m, sh); sh.uniforms.uG = LK.u.uG;
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
  LK.cur = k; const S = STY[k]; const hemi = scene.children.find(o => o.isHemisphereLight);
  if (!LK.orig) LK.orig = { sun: [sun.color.getHex(), sun.intensity], hemi: hemi ? [hemi.color.getHex(), hemi.groundColor.getHex(), hemi.intensity] : null, bg: scene.background.getHex(), fog: scene.fog.color.getHex() };
  if (!S) { const O = LK.orig; sun.color.setHex(O.sun[0]); sun.intensity = O.sun[1]; if (hemi && O.hemi) { hemi.color.setHex(O.hemi[0]); hemi.groundColor.setHex(O.hemi[1]); hemi.intensity = O.hemi[2]; } scene.background.setHex(O.bg); scene.fog.color.setHex(O.fog);
    LK.u.uG.value.set(1, 1, 1, 0); for (const [m, c] of LK.mats) { m.color.copy(c); if (m.userData.lkr !== undefined) m.roughness = m.userData.lkr; } if (vig) vig.style.opacity = 0; return; }
  for (const m of collect()) { if (!LK.mats.has(m)) { LK.mats.set(m, m.color.clone()); m.userData.lkr = m.roughness; } const g = GROUND[m.userData.lkc ? m.userData.lkc.getHex() : m.color.getHex()]; if (g) patchGround(m, g); }
  for (const [m] of LK.mats) { m.color.copy(LK.mats.get(m)); grade(m, S); const g = GROUND[LK.mats.get(m).getHex()]; if (g === 1) m.roughness = Math.min(1, m.userData.lkr * S.rough); }
  sun.color.setHex(S.sun[0]); sun.intensity = S.sun[1]; if (hemi) { hemi.color.setHex(S.hemi[0]); hemi.groundColor.setHex(S.hemi[1]); hemi.intensity = S.hemi[2]; }
  scene.background.setHex(S.fog); scene.fog.color.setHex(S.fog); LK.u.uG.value.set(S.grime, S.litter, S.crack, 1);
  if (!vig) { vig = document.createElement('div'); vig.style.cssText = 'position:fixed;inset:0;pointer-events:none;z-index:1;transition:opacity .4s'; document.body.appendChild(vig); }
  vig.style.background = 'radial-gradient(ellipse at 50% 55%, rgba(0,0,0,0) 48%, rgba(0,0,0,' + S.vig + ') 100%)'; vig.style.opacity = 1;
};
/* se aplica cuando el mapa está construido (y otra vez si se reconstruye) */
if (Q && STY[Q]) setInterval(() => { if (typeof MAPA !== 'undefined' && MAPA.built && MAPA.built !== LK.done && MX && MX.M && MX.M.ents.length) { LK.done = MAPA.built; LK.set(Q); } }, 400);
})();
