# Arquitectura — v0.3.9

## partida.js (mapa 3)
Cargado tras el juego, comparte el ámbito global. Interfaz `MX` (`on`, `start`, `update`, `hit`, `explosion`, `fireDmg`, `propGone`, `frozen`, `swapTick`, `ents`, `foes`, `M`). Secciones: mapa, armería/ranuras, navegación A*, personajes y pose, IA, reglas, HUD. Ganchos en `prototipo.html` solo actúan con `MX.on`.

Un único archivo HTML con tres bloques: HTML/CSS (HUD), script de arranque y script del juego (Three.js r128).

## Piezas principales (en `src/prototipo.html`)
- **Entrada**: teclado/ratón, Gamepad API (mapeo estándar, `BIND`/`AXU` reasignables, guardado en `localStorage` clave `bind4`), táctil con punteros.
- **Estado**: `P` (jugador), `W` (arma), `WP` (configuración de armas: `tr`/`ta` umbrales de gatillo, `rec` retroceso, `push`, `hap` vibración, `magSize`), `GAIT` (ciclo de marcha), `RC` (retroceso del cuerpo), `CS` (casquillos), `MG` (cargadores).
- **Rig**: primitivas (`rig.*`), `ik2` (IK de 2 huesos), `setLimb`.
- **Marcha**: fase global `GAIT.phase`; pie i en fase `(phase + i·0,5) % 1`. Apoyo si fase < β; vuelo si ≥ β. El pie apoyado queda fijo en el mundo; en vuelo se interpola con aterrizaje delante de la cadera. β baja con la velocidad (más vuelo al correr). Zancada acotada por el alcance de la pierna.
- **Altura de cadera**: postura suavizada + rebote por fase, limitada por el alcance real de las piernas.
- **Dash**: velocidad 17 m/s, duración 0,18 s ampliable manteniendo hasta ~0,45 s; frenado con aceleración 55–65 m/s² al terminar.
- **Casquillos y cargadores**: física propia (gravedad, rebotes, reposo plano).
- **Vibración**: `rumble(ms, fuerte, débil)` → `vibrationActuator.playEffect('dual-rumble')` y `navigator.vibrate` en táctil.

## Objetos destructibles (bloque «OBJETOS DESTRUCTIBLES» en `src/prototipo.html`)
- **Materiales**: tabla `MT` (penetración `pen`, multiplicador de daño `dm`) y materiales de partículas añadidos a `pMat` (`wood`, `plastic`, `metal`, `sand`, `water`, `fuel`, `chip`…).
- **Objetos**: `PSPEC` define cada tipo (material, vida, empujable, masa, fricción, `build`). `addProp`/`tryPlace`/`placeNear` los crean; cada uno es un `Group` de piezas (`mkPiece`) y registra un AABB en `boxes` con referencia `prop`. La disposición inicial está al final del bloque (lista `L`).
- **Daño**: `damageProp` (fases al 66 %/33 %, `shedPieces`) → `destroyProp` (trozos a `DEB` con `toDebris`, explosión si es explosivo). `bulletHitProp` aplica efectos, fugas, ignición y devuelve el daño restante (penetración).
- **Disparo**: `fire()` recoge todos los impactos en orden (`rayBox2`) y atraviesa según penetración; ignora el objeto de cobertura `P.cover`. `castRay` (láser/visión) también lo ignora.
- **Cobertura**: `updateProps` calcula `P.cover` (objeto bajo a < 0,8 m, histéresis 1 m); `P.hunk` baja la pelvis al esconderse.
- **Física/efectos**: `updateProps(dt)` (empuje, fugas, llamas, quemado), `updateDebris`, `updateFlames`, `updateFires`, `updatePuddles`, `updatePicks`. `collide()` empuja objetos al chocar. `explode(p, R, escala)` daña y empuja objetos y encadena barriles con `fuse`.
- **Rendimiento**: pool de partículas 360, trozos ≤ 260, llamas 70, charcos 14, marcas ≤ 16 por objeto.
- **Barra de dash**: se actualiza en el bloque HUD (`P.dashMax`, `P.deny`, `P.rdyFlash`).

## Audio (bloque «audio: motor de muestras» en `src/prototipo.html`)
- **Datos**: `SOUND_DATA` (de `src/sonidos.js`) = `{ nombre: [mp3 en base64, ...] }`. `loadSamples()` los decodifica al empezar (`initAudio`, tras el primer gesto) en `SND.buf[nombre] = [AudioBuffer]`.
- **Reproducción**: `playSnd(nombre, {vol, rate, wet})` elige variante sin repetir la anterior, varía el tono (`SND_VAR`), respeta `SND.maxVoices` y devuelve `false` si no hay muestra (para usar el respaldo). `wsnd(evento)` pide `cur.sid + '_' + evento`.
- **Niveles**: `SND_VOL` (nivel por sonido), `SND_WET` (envío a la reverberación), pico normalizado en el build.
- **Inicio**: `onsetOf` calcula al cargar el primer instante a menos de 40 dB del pico (salta silencio y retardo del codec).
- **Mezcla**: `mixBus` → compresor/limitador → salida; reverberación suave con respuesta generada.
- **Eventos conectados**: `fire()` (`_shot`), disparo con cargador vacío (`_dry`), cambio de arma (`_equip`), fases de recarga `W.rp` (`_rel1`, `_rel2`, `_rel3`). Sin conectar aún: casquillos y cargadores al tocar el suelo, impactos, objetos, fuego y granadas.
- **Build**: `tools/build.py` lee `assets/audio/manifest.json`, procesa y genera `src/sonidos.js` e `index.html`.

## Pruebas
`tests/audio.py` comprueba el audio de la P1 (carga, un disparo = un sonido, clic en vacío, sacar arma, respaldo en el resto). `tests/` contiene scripts de Playwright (Chrome headless con SwiftShader y mando simulado) y `sim.py`, que avanza `update(1/60)` a mano para medir el ciclo de pasos a 60 fps.

## Balística
- `BAL` (por arma) define v, ef, max, min, drag, pierce. `spawnBullet(x,y,z,dx,dz,arma)` crea un proyectil del pool `BUL` (260). `updateBullets(dt)` avanza cada proyectil con arrastre y comprueba todo lo que cruza el tramo recorrido (cajas/props, paredes, blancos). `bFall(arma, d)` da la fracción de daño. `bulletHitProp` recibe el daño ya reducido y devuelve la energía que sobrevive (penetración por `BW.pierce`).
- Polígono de medición: `rangeLane()` (pista), `popDmg()` (medidor flotante).

## v0.2.2: sistemas añadidos (todo en `src/prototipo.html`)
- **Lanzamiento de granadas**: estado `P.gState/gDir/gDist` (mano, distancia fija 7), `P.lDir/lDist` (lanzagranadas, 15), `P.lmH/lmL/lmPrev`; la cruceta ←→ gira `P.aimT`; `launchGrenade()` resuelve la velocidad vertical para la distancia a 24 m/s horizontal; `throwGrenade()` usa `solveVh` (bisección sobre una simulación a 60 Hz de `stepG`, espoleta 2,2 s / 1,4 s humo, `gVyOf(D)=5,2+1,5·clamp(D/12,0,1)`); el anillo de la vista previa coincide con el aterrizaje. Sin dash si `P.gState>0`.
- **Explosiones**: `const R_FRAG = 3.5, R_LAUNCH = 3` y `explode(p, R, escala, tipo)` (barril usa 4,2).
- **Humo**: `SMK` (billboards instanciados con `InstancedBufferGeometry`, atributos `ipos` y `idat`, `ShaderMaterial` con ruido fBm procedural 256²), relleno en `updateSmoke`; `SMOKE_R = 2.8`; `hiddenBySmoke` activo entre 0,8 y 12,2 s.
- **Diagnóstico**: objeto `DIAG`, GPU con `EXT_disjoint_timer_query_webgl2` (`diagGpuBegin/End`), `LIGHTS.warm` precompila las 4 combinaciones de luces, renderer con `stencil:false`.
- **Barriles**: `BARREL_N`/`BM`/`BGEO`/`buildBarrel` (8 placas curvas + base + tapa), `barrelBurst` (agua con charco, combustible con bola de fuego y tapa), agujeros `p.holes` con desplazamiento `ox/oz` respecto al barril (la fuga lo sigue).
- **Marcas de bala**: `HOLE_K`/`HOLE_GEO`/`HOLE_MAT` (geometría con color por vértice, 3 variantes por material), `holeDecal()` lanza un rayo contra las piezas del objeto (punto y normal reales; sin marca si pasa por un hueco), `WET_GEO` para el rastro mojado; `bulletHitProp(p, b, px, pz, dx, dz, dmg, inner, by)` usa la altura real `by` si la bala está dentro de la altura del objeto (el juego colisiona en 2D); en barriles calcula el cilindro real (radio 0,3). Máximo 16 marcas por objeto.
- **Pasos**: `footSnd(speed)` se llama cuando un pie aterriza en el bloque de marcha (`f.t >= 1` y `moving`); `STEP_walk` (2 variantes), volumen `SND_VOL.STEP_walk = .16`, no suena en dash/slide, más suave agachado.
- **Restos (física propia)**: `toDebris` crea el cuerpo (`d.X` centro, `d.Q`, `d.V`, `d.W`, `d.h` semiejes, `d.iI` inercia inversa); `updateDebris` integra 3 subpasos/fotograma, `solveContact` aplica impulsos de rebote (`DB.e` por material) y rozamiento (`DB.mu`), contactos por esquinas contra suelo y `boxes` (altura = `prop.h`, 3 para paredes), `debrisPose` coloca la malla (el origen de la malla puede estar desplazado respecto al centro). Sueño con 3+ apoyos. Máx. 260 trozos. Sin choques trozo-trozo (retirados). Marcas de bala: `stickDecal` (coordenadas mundo, válido en piezas estiradas). Tests: `restos_fisica.py`, `restos_choques.py`, `restos_apoyo.py`, `marcas_restos.py`, `restos.py`.

## v0.3.x: partida, HUD y sonido de combate
- **Selector de mapa**: bloque «selector de mapa» en `src/prototipo.html` (`MAPS`, `curMap()`, `chooseMap(n)`) dentro del menú de Options (`renderMenu`/`startRebind`/`menuTick`; los índices 0–2 son mapas, después acciones y sticks). 1↔2 con `rangeToggle()`, a 3 con `MX.start()`; desde 3 recarga con `?mapa=N` (el mapa 3 transforma la escena).
- **Cámara**: al final de `update`; `fov = (45 + slide·4 + velocidad·.25) × (vertical ? 1,4 : 1)`; altura 13, desplazamiento z 8,5, adelanto por apuntado hasta 2,6 m.
- **HUD de partida** (`src/partida.js`, bloque tras `hud`): `mkBar(w, h, num)`/`drawBar`/`placeBar` (barra del jugador `PB`, 5 segmentos de escudo, vida con chaflán inclinado −22°, trozo de daño naranja, pulso crítico `.mxlow`; barra de bots 60×4 px anclada a 2,3 m con rombo de equipo y fundido). Posición: `.mxpb` en el CSS de `prototipo.html` (abajo izquierda; arma y munición abajo derecha). `#help` y `#mode` están ocultos por CSS.
- **Kill feed** (`addFeed`/`updFeed`/`clearFeed`, `FEED_MAX = 5`, `FEED_T = 5`): se llama desde `kill()`; el arma sale de `e.lastSrc` (se guarda en `MX.hit`; sin arma = explosión/fuego «✸»).
- **Sonido de combate**: `bulletEnd(b, t, red, quiet)` (`quiet` = impacto en un personaje de la partida: sin `IMP_target`); `MX.hit(e, dmg, from, dx, dz, w)` reproduce `HIT_marker` solo si hay arma `w` (bala) del jugador contra un rival y no mata; `kill()` reproduce `HIT_kill` (con respaldo a `HIT_marker`). Sin muestra = silencio (no hay sonidos sintéticos).
- **Bucles de sonido**: `loopAt`/`loopTick`; en el bucle `frame`, con el menú abierto se llama a `loopTick(dt)` para que se apaguen con fundido.
- Decisión del usuario (25-11): **no** hay indicador de daño direccional; el juego es 2D con cámara fija y se ve de dónde disparan. No volver a proponerlo.
- **Aspecto y equipo** (`src/prototipo.html`, bloque «aspecto», tras `rig`): `FAC`/`FACM` (paletas y materiales por facción), `dress(R, facción, {helmet, vest, pack})` cuelga piezas de las mallas del rig (torso, pelvis, visor, hombros, rodillas, pies) dentro de un grupo con la escala inversa de la malla, y las fusiona por material con `mergeParts` (una malla por punto y material). Heredan la pose, así que `poseBot` y el bucle del jugador no cambian. Se llama con `dress(rig, 0)` para el jugador y `dress(e.R, e.team)` en `initBot`; volver a llamarla con otros niveles reconstruye el equipo. `playerCorpse` clona con hijos (`clone(true)`).
- **Colores y estados de personaje**: `FAC` ahora define `uni`, `pants`, `gear`, `acc`, `trim` y `dress` asigna también los materiales base del cuerpo (piel `SKIN`, pelo `HAIR`). `dress` admite `kit` (cruz roja) y `skin`. Abatido/reanimación en `src/partida.js` (tras `unbake`): `MX.setDowned(e, on, dx, dz)`, `MX.reviveFx(e, progreso|null)`, `dwnTick`; el bucle de `MX.update` no mueve ni dibuja la pose de un bot con `e.dwn`. Test: `tests/aspecto.py`.
