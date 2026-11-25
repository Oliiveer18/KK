# Traspaso a una nueva sesión — v0.3.9

Lee esto primero. Resume lo necesario para seguir sin perder contexto.

## Proyecto
Prototipo de shooter 3D en el navegador, sin assets externos (personaje procedural con IK, mando PS5 + teclado + táctil). Meta a largo plazo: juego online de mundo persistente por facciones, con estrategia y tácticas. El usuario quiere que destaque por los **detalles** y que todo se haga «profesionalmente».

## Reglas del usuario (obligatorias)
- Responder **siempre en español**, breve y directo.
- Autónomo: ejecutar sin pedir confirmaciones innecesarias; no ampliar el alcance ni hacer cambios no pedidos.
- Preguntas: como mensaje normal en el chat, **no** con ventana de opciones, y claras y sencillas.
- **Sonidos**: solo los que el usuario genera con ElevenLabs y aprueba, **uno a uno**. Yo le doy cada prompt listo para copiar (con nombre de archivo, duración, si va en bucle y número de variantes) y **siempre le digo qué sonido es y cuándo suena en el juego**. Mido cada audio que envía (cola de reverberación, duración, nivel) y se lo digo antes de integrarlo. No invento sonidos.
- Controles táctiles: **invisibles pero funcionales**.
- Efectos visuales sencillos y eficaces, nada molesto para la vista.
- Verificar antes de decir que algo está hecho; decir qué se ha probado y qué no. El usuario prueba con su DualSense real; yo solo con pruebas automáticas.
- Nada destructivo ni cambios irreversibles sin permiso.
- **No mencionar el peso del archivo** ni recortar calidad de audio. **Nunca bajar calidad visual** (si hay que optimizar, solo cambios invisibles).
- **No tocar velocidades de bala ni tiempo de vuelo** (aprobados). F2 se queda en 90 de daño. Alcances de armas pensados en los metros que se ven en pantalla (ver `BAL`).
- Granadas de mano y lanzagranadas: **distancia fija** (7 m / 15 m); la dirección es el stick derecho y la cruceta ←→ afina; **sin dash con la granada en la mano**.
- No hay teclas F útiles en el Mac del usuario: las ayudas de depuración se activan **con clic** (cuadro de FPS = diagnóstico).
- Los sonidos nunca se escuchan «a mano» por mí: solo pruebas automáticas. El usuario prueba con su mando PS5 (no con teclado).
- No leer las instrucciones demasiado al pie de la letra; ir **paso a paso, en orden**, y pedir confirmación solo si hay una decisión real. Si algo no sale bien, el usuario prefiere volver a como estaba.
- Si el usuario dice «quítalo», se quita (ej.: la granada recogible de las cajas).

## Archivos
- Fuente editable: `src/prototipo.html` (Three.js por CDN). Juego publicable: `index.html` (autocontenido).
- Regenerar `index.html`: `python3 tools/build.py` (procesa `assets/audio/manifest.json`, genera `src/sonidos.js` y sustituye las etiquetas de Three.js y `sonidos.js` por su contenido). Para añadir un sonido: copiar el WAV a `assets/audio/originales/`, añadir su entrada al manifiesto (variantes: `ID_01`, `ID_02`...) y, si hace falta, su nivel en `SND_VOL`.
- Documentos: `docs/` (CHANGELOG, ESTADO, ARQUITECTURA, CONTROLES, PENDIENTE). Pruebas: `tests/`.
- Al terminar cada tanda: actualizar docs, regenerar `index.html`, pasar los tests y subir a `main` (ver Publicación). Ya no se hacen zips: todo va por GitHub.
- Flujo de sonidos: el usuario va enviando cada audio; yo lo mido, lo integro en el proyecto y le doy el siguiente prompt en el mismo mensaje.

## Publicación (desde 25-11-2026)
- **El juego se publica en GitHub Pages**, no en el artefacto: repositorio https://github.com/Oliiveer18/KK (rama `main`), juego en https://oliiveer18.github.io/KK/ (mapa 3 directo: `?mapa=3`). El usuario prueba ahí (iPhone + DualSense). **No publiques más artefactos** salvo que lo pida (orden del 25-11).
- El repositorio contiene TODO el proyecto (`src/`, `tools/`, `tests/`, `docs/`, `assets/`, `VERSION`) y, en la raíz, `index.html` generado + `manifest.json` + `icon-*.png` (copias de `web/`). Al empezar una sesión: `git clone --depth 1 https://github.com/Oliiveer18/KK`, trabaja ahí o en copia, y empuja al terminar cada tanda: `index.html` regenerado con `python3 -I tools/build.py` + cambios de código + docs. El usuario autorizó (25-11) subir **directamente a `main`**, aunque la sesión indique otra rama de trabajo. Para empujar hace falta que la sesión tenga el repo añadido con permiso de escritura (la app de Claude en GitHub ya está instalada en la cuenta del usuario).
- Al copiar `web/*` a la raíz del repositorio tras cada build, no se pierden manifest ni iconos. Ya no se rehace ningún zip.
- iPhone: los mandos NO se detectan en apps añadidas a la pantalla de inicio en modo standalone (bug WebKit 214336). Por eso el juego no lleva `apple-mobile-web-app-capable` y el manifest es `display: browser`: el acceso directo abre Safari. No los vuelvas a poner. Pantalla completa en iPhone: Aa → Ocultar barra de herramientas (horizontal).

## Entorno de trabajo (sesión en la nube)
- Dependencias: `ffmpeg`, `numpy`, `google-chrome` ya están; falta `playwright` de Python: `pip install -q playwright` (no instalar navegadores; los tests usan `/usr/bin/google-chrome`).
- Ejecutar siempre con `python3 -I`. Comprobación rápida tras un cambio: `python3 -I tools/build.py` y luego `tests/partida.py`, `partida_armas.py`, `partida_escudo.py`, `horizontal.py` (+ `balistica.py`/`granadas.py`/`audio.py index.html` si se toca eso). Los tests leen `index.html` desde la raíz del repo.
- Subida: `git add -A && git commit && git push origin HEAD:main`.

## Pruebas (cómo se hacen)
- Playwright + Chrome headless (`/usr/bin/google-chrome`, args `--no-sandbox --use-gl=angle --use-angle=swiftshader --enable-unsafe-swiftshader --ignore-gpu-blocklist`). Ver `tests/chk.py` (detecta errores de carga).
- Para medir animación o física: avanzar `update(1/60)` a mano dentro de la página (en headless el FPS real es ~20 y engaña). Ver `tests/sim.py` y `tests/pw40.py`–`pw45.py`.
- Mando simulado: `window.__pad` y sobrescribir `navigator.getGamepads`.
- Tras cada edición comprobar siempre que la página carga sin `pageerror` (un `const` repetido rompe todo el script).
- Tests actuales (todos deben dar 0 fallos / sin errores): `tests/balistica.py`, `sonidos_bucles.py`, `barras.py`, `hit_sonido.py`, `aspecto.py`, `abatido_campana.py`, `zombis.py`, `granadas.py`, `pasos.py`, `audio.py index.html`, `audio_mundo.py index.html`, `poligono_mando.py`, y de comprobación visual `impactos_cerca.py` (capturas de cerca de marcas de bala, `python3 tests/impactos_cerca.py barrel,crate x 370 330 180 110`), `restos.py` (trozos asentados en el suelo), `restos_fisica.py`, `restos_choques.py`, `restos_apoyo.py` (física de restos), `marcas_restos.py` (marcas de bala en trozos), `caras_coplanares.py` (parpadeo de texturas), `barril_impacto.py`, `barril_fuga_agua.py`, `fuga_barril.py` (la fuga sigue al barril), `barril_disparo.py` (impacto, marca y chorro del barril), `caras_coplanares.py` (detecta parpadeo por caras en el mismo plano). Los viejos `pw*.py`/`sim*.py` son de la v0.1/0.2.0.
- Trucos de prueba: `update(1/60)` y `window.__n++` a mano; para tiempo de juego en lugar de real, sobrescribir `performance.now` (ver `pasos.py`); `window.__b/__a` y `navigator.getGamepads` para el mando; llamar a `update` en el mismo `evaluate` que el cambio de entrada (el bucle real corre en paralelo). Con muchas pruebas de física `boxes.length=0` evita obstáculos. En una cadena de JS con varias sentencias usa una función flecha anónima: Playwright trata una cadena con `function` como función a llamar.
- Hacer copia de seguridad del fuente antes de cambios grandes.

## Estado y decisiones
Estado actual (v0.3.9): ver `docs/ESTADO.md` (cabecera) y `docs/ARQUITECTURA.md` (sección v0.3.x). Reglas añadidas por el usuario el 25-11: sin chuleta ni texto de depuración en pantalla; vida y escudo abajo a la izquierda, arma y munición abajo a la derecha; al dañar personajes solo suena el disparo (el «hit» del jugador va aparte, sonidos de ElevenLabs aprobados uno a uno); las propuestas deben ser cosas que hago yo, no tareas para el usuario; **no** quiere indicador de daño direccional (retirado). Histórico de v0.2.2 a continuación.

### Decisiones del usuario sobre equipo y vida (25-11, para el modo de facciones; sin implementar)
- Equipo en 3 huecos: casco, chaleco y mochila; 3 niveles (ligero, medio, pesado), visibles en el personaje.
- Vida: **100 sin ninguna equipación y hasta 200 en total**, repartida entre las equipaciones (propuesta de Claude: casco +10/+20/+30 y chaleco +25/+50/+70, máximo +100; la mochila da capacidad de carga, no vida). Sustituye al esquema actual de escudo 50 + vida 100 del mapa 3, que se mantiene mientras no exista el equipo.
- **Al morir se pierde todo** el equipo (queda en el cuerpo; una compañía podría recuperarlo, a decidir con el diseño).
- **El escudo/vida del equipo no se regenera** (se repone en el refugio y con kits). Detalle completo en `docs/EQUIPO_Y_VIDA.md`.
- Sin recetas de fabricación; el equipo se consigue en tiendas, farmacias, taller y almacén y se mejora en el refugio.
- El aspecto de los personajes se construye con piezas modulares (casco, chaleco, mochila) para que el equipo se vea sin rehacer el personaje. Pendiente de cerrar: si la vida base se regenera y si el equipo caído se puede recoger.

### v0.2.2
Hecho en esta versión (detalle en `docs/CHANGELOG.md`, estado en `docs/ESTADO.md`, arquitectura en `docs/ARQUITECTURA.md`):
- 10 armas con sonido, balística profesional con alcances a escala de pantalla (tabla `BAL`), equilibrio pasos 2 y 3 (el paso 4 lo descartó el usuario), pista de práctica a 30 m.
- Rendimiento invisible para Mac + diagnóstico con clic en el cuadro de FPS (GPU, lógica, dibujo, llamadas, resolución). En Mac a pantalla casi completa: GPU 13,3 → 8,5 ms; a pantalla muy grande ~14 ms/40 FPS (sin más mejoras posibles sin bajar calidad; el usuario dijo que lo deja).
- Granadas de mano y lanzagranadas con distancia fija; radio de explosión 3,5 m (mano) y 3 m (lanzagranadas), barriles 4,2 m. Humo nuevo, realista y optimizado (partículas instanciadas, `SMOKE_R` 2,8).
- Barriles: rotura en 8 placas + base y tapa, agua con charco, combustible con bola de fuego y una tapa disparada. Sin aviso previo (decisión del usuario).
- Marcas de bala con relieve por material, puestas con un rayo contra las piezas reales, a la altura real de la bala; barril con impacto sobre el cilindro real, rastro mojado y agujero de salida. La fuga de un barril empujado lo sigue.
- Física de restos propia (cajas rígidas con giro, rebote y rozamiento por material, aterrizan sobre objetos, se duermen apoyadas). Los trozos NO chocan entre sí (el usuario lo pidió quitar).
- Pasos al caminar/correr (`STEP_walk`, 2 variantes, volumen bajo `.16`). Quitado el paso 3 y otro por molestos.
- Las cajas de madera **ya no sueltan granadas recogibles** (código `spawnPick`/`updatePicks` sin usar).
- Controles: ● agacharse (alternar), R3 dash (mantener = más largo), L3 correr, ▲ cambiar arma, R1 granada, L1 humo, ■ recargar, L2/R2 apuntar/disparar. El slide se eliminó a petición del usuario.
- Limitaciones conocidas: vibración y gatillos adaptativos no funcionan en Safari/iPhone (la vibración sí le va con su mando según el último dato); propuestas en `docs/PENDIENTE.md`.
- Los enemigos son blancos fijos, sin IA. La cobertura es solo para los disparos del jugador.
- **Nada de lo nuevo se ha probado a mano ni a oído**: solo pruebas automáticas y capturas. Decirlo siempre.

## Lo siguiente (por orden; no empezar sin que el usuario lo pida)
1. Más sonidos de movimiento: aterrizaje/frenada al acabar el dash (2 variantes), roce de ropa/equipo (2). Dash ya tiene `DASH_start`/`DASH_hold`. Quedó pendiente una 3.ª toma de paso para tener 3 variantes (opcional). Flujo: le doy el prompt de ElevenLabs (0,5 s mínimo), él manda el WAV, yo lo proceso/integro.
2. Propuesta corta **escrita** del sistema de rareza (sin implementar).
3. Ajuste de volúmenes a oído (`SND_VOL`) con su feedback.
4. Modelos de armas con Meshy.
5. Gatillos adaptativos con WebHID (en `docs/PENDIENTE.md`).
6. Opcional, solo si lo pide: calidad adaptativa a la resolución en Mac.
7. (retirado por el usuario) Choques entre trozos de restos.
8. Ajustes posibles de marcas de bala (tamaño/contraste) y de la marca negra de explosión del suelo (grande, ya era así).

## Sonidos y armas: plan acordado con el usuario
- 10 armas, 2 por clase: P1 pistola 9 mm (sonido completo), P2 revólver .44, S1 subfusil 9 mm, S2 subfusil .45, F1 fusil de asalto 5,56, F2 fusil de precisión 7,62, E1 escopeta de bombeo, E2 escopeta semiautomática, H1 ametralladora ligera con cinta, H2 lanzagranadas 40 mm.
- Por arma: `_shot` (3 variantes), `_dry`, `_equip`, `_rel1`, `_rel2`, `_rel3` (E1 usa `E1_pump`, E2 `E2_action`). Además casquillos por calibre, cargadores, impactos por material, rotura de objetos, fuego, granadas y 3 capas de rareza: 109 prompts y 185 archivos en total. El documento con la lista completa de prompts se llama «Sonidos del shooter: lista completa y prompts para ElevenLabs» (artefacto en claude.ai).
- Estado de sonido: las 10 armas, casquillos, cargadores, impactos, roturas, empujes, fugas, fuego, explosiones, granadas, humo, dash y pasos ya suenan. Falta `C_44_multi`. Capas de rareza descartadas por ahora. Siguientes sonidos: ver «Lo siguiente».
- Los prompts de disparo deben decir «extremely dry, anechoic chamber, close microphone, no reverb, no echo»: el primer intento sin eso trajo una cola de 1,1 s. Duración exacta de la columna Dur. del documento (no automática). Solo van en bucle `LEAK_water`, `LEAK_fuel`, `FIRE_loop` y `SMOKE_loop`.
- Rarezas acordadas (sin implementar): común, poco común, rara, épica y legendaria con mejora única del 0, 3, 6, 9 y 12 % repartida igual en todas las armas (daño +P/2, control +P, cargador +P, recarga P/2 más rápida), ficha con cuatro barras y color. Los rasgos épico y legendario de cada arma son **provisionales**: se probarán con pocos para ver si son intuitivos antes de seguir. Propuesta de estadísticas en el documento «Armas: estadísticas, rarezas y rasgos (propuesta)», pendiente de confirmación del usuario.
- Modelos de armas con Meshy: pendiente.

## Ideas siguientes (no empezadas, sin orden pedido)
- Enemigos con IA que usen cobertura y vean/ataquen al jugador.
- Ventaja táctica al agacharse en cobertura.
- Más objetos y armas, recargas por arma, daño y heridas.
- Estructura para multijugador online y facciones.

## Texto para pegar al empezar la nueva sesión
> Continuamos mi shooter 3D del navegador. Clona https://github.com/Oliiveer18/KK (rama main), lee `docs/HANDOFF.md`, `docs/ESTADO.md`, `docs/PENDIENTE.md` y `docs/ARQUITECTURA.md` y sigue las reglas del handoff. Trabaja sobre `src/prototipo.html` y `src/partida.js`, regenera `index.html` con `tools/build.py` y empuja a GitHub (no publiques artefactos). Dime siempre en español y breve qué has probado y qué no.
