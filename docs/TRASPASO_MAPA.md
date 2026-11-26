# Traspaso: mapa de 1 km² y lo hecho el 25–26-11-2026 (leer antes de tocar el mapa)

## 0. Actualización 26-11 (tarde): distrito v3
El usuario pidió **igualdad total entre facciones** y un mapa **recto y cuadriculado**. Aprobó el boceto simétrico (`docs/img/mapa_v3_boceto.png`) y las dos opciones: Fábrica en N/S y Estación con supermercado en E/O. Ya está en el juego como `?mapa=6` con las ubicaciones oficiales: `docs/DISTRITO_V3.md` y `docs/img/distrito_v3*.png`. Cómo funciona y cifras: `ESTADO.md` → «Distrito v3». Lo de abajo (§1–§6) es la historia del v2.

## 1. Estado en una frase (v2, histórico)
El motor del mapa y las herramientas están hechos y probados, pero **el usuario NO está convencido del trazado actual (distrito v2, `?mapa=6`)** y no ha dicho todavía qué cambiaría. La próxima sesión debe empezar **preguntando qué no le convence** (en el chat, frases sencillas; ver §6) antes de volver a tocar el trazado. Nada de lo siguiente se ha probado en iPhone.

## 2. Historia de las propuestas y lo que dijo el usuario (para no repetir errores)
1. **Plan inicial (`PLAN_DEL_MAPA.md` §2):** cruz de dos calles, refugios en las esquinas. → «demasiado cuadriculado, muy medido, poco natural».
2. **Boceto v1 (orgánico, con río):** → «no pongas río, sería mucho mapa inusable». Pidió sensación de suspense/apocalipsis.
3. **Boceto v2 (sin río, apocalíptico):** → «acuérdate de los objetos interactivos: el mapa debe estar pensado para un juego estratégico y táctico».
4. **Boceto v3 (capa táctica: ejes cubierto/rápido/flanco, cortes, puntos fuertes, nidos, horda, 8 objetivos):** → «me parece bien». (Sigue siendo la referencia de intención: `docs/img/mapa_propuesta_1km.png`, `PLAN_DEL_MAPA.md` §6.)
5. **Implementación M2 (trazado diagonal del boceto, calles curvas libres):** → «todo muy mal organizado, carreteras a trozos, muros de piedra con puertas en medio de las carreteras sin sentido, igual que los sacos de arena; nada tiene sentido. Alternativa: más cuadriculado con pequeñas curvas y sitios para bosques. Quiero ver las ubicaciones exactas de todo y que carreteras y todo tengan coherencia visual».
6. **Distrito v2 (cuadrícula orgánica, actual):** → «sigue sin convencerme» (sin más detalle). Decidió parar y dejarlo documentado.
**Hipótesis para la próxima sesión (no confirmadas):** bloques entre calles vacíos (solo 64 casas), vía férrea casi invisible, sin ambiente apocalíptico (el suelo es verde plano y brillante), calles demasiado uniformes, tamaño/ritmo de manzanas, bosques demasiado rectangulares, falta de detalle urbano (aceras con farolas, fachadas, vallas, vegetación), sensación de «mapa generado» frente a diseñado a mano. Preguntar, no suponer.

## 3. Reglas del usuario sobre el mapa (acumuladas)
- Realismo/naturalidad, sin rejilla rígida; suspense y apocalipsis; **sin río**; bosques; 1 km² (25 combatientes por facción en escuadras de 5, zombis aparte).
- Juego **estratégico y táctico**: ejes de avance, cuellos de botella, puntos fuertes, objetivos capturables, zombis como tercer actor.
- **Todos los objetos creados deben usarse** (los 8 de siempre + 68 + 11 edificios + 13 recogibles): `COLOCACION_OBJETOS.md`, `tests/mapa_cobertura.py`.
- **Todo lo del mapa es interactivo** (muros, portones, torres, cristales con alarma, cajas empujables…).
- **Carreteras unidas, coherencia visual, ubicaciones exactas visibles en la foto** (la foto debe ser lo que hay en el juego).
- **Nada sin sentido:** muros/portones/sacos/torres/farolas/mobiliario nunca en la calzada; los muros y portones solo cierran refugios y recintos.
- Regla de oro: **no bajar calidad visual**; optimizar de forma profesional. Responder en español, breve; decir siempre qué se probó y qué no; subir a `main` al terminar cada tanda y avisar cuando Pages esté listo.

## 4. Qué existe (archivos y API)
- `src/mapa.js` (generador): calles de rejilla (`axis,c,a0,a1,w`) y **curvas** (`pts,w,step`: Catmull-Rom remuestreado, aceras cortadas en los cruces, marcas), aparcamientos, refugios provisionales, vías (`OBJ.rails`), edificios y objetos (`MAPA.put`), **árboles instanciados** (`D.trees`), `MAPA.pathPts`, `MAPA.roadIndex` (índice espacial: `near/gap/nearest`), `MAPA.fp` (medidas de cualquier tipo), `MAPA.put` (placeObject **+ los 8 originales con addProp**; `placeObject` no conoce los originales).
- `src/composiciones.js` (`COMP`): `jam`, `barricade`, `checkpoint`, `roadblock` (chicane con sacos en la acera), `nest`, `towerPost`, `scatter`, `street` (mobiliario en acera, evita cruces), `storefront`, `camp`, `yard`, `fenceRect`, `compound` (recinto amurallado nivel 1–3 junto a una calle), `fenceRun`, `footbridge`, `refugeKit`, `building`, `frontage`, `cut`, `put`, `reserve`, `nearest`, `roadNear`. Deterministas por semilla; sin solapes (`D.occ`).
- `src/mapa_distrito.js`: `MAPA.data.M1` (sector de prueba 250 m, `?mapa=5`, no tocar: regresión) y `MAPA.data.M2` (distrito v2, `?mapa=6`; **es lo que hay que rehacer/ajustar**). `MX.dataId` ('M1'|'M2') elige los datos en `partida.js` (`buildDistrict`).
- Herramientas: `tools/foto_distrito.py` (foto cenital exacta con cámara ortográfica del propio juego + retícula + etiquetas → `docs/img/distrito_v3*.png` y **`docs/DISTRITO_V3.md`**, lista exacta de ubicaciones; **se regenera tras cualquier cambio**), `tools/boceto_mapa.py` (boceto 2D en SVG de las propuestas v1–v3; solo diseño).
- Tests del mapa: `tests/distrito_sentido.py` (calles unidas, nada indebido en la calzada, árboles/edificios fuera de calles, retenes franqueables, alcanzabilidad desde los 4 refugios, 11 edificios, 76 tipos), `distrito_completo.py`, `composiciones.py`, `calles_curvas.py`, `mapa_cobertura.py [N] [--estricto]`, `mapa.py` (M1), `rendimiento.py`.
- Cómo cambiar el trazado (v3): editar `MAPA.data.M2` **sólo en coordenadas del cuarto Azul** (calles `SEG`, refugio, retenes `rb(...)`, edificios con `front(...)`/`COMP.building`, casas con `row(...)`, bosques `FOR`); la copia girada a las otras 3 facciones es automática (`D.sym`). Objetivos de borde dentro de `withSym(2, …)`. Después `python3 -I tools/build.py`, `python3 -I tests/distrito_sentido.py` (incluye el test de igualdad), `python3 -I tools/foto_distrito.py`, y enseñar `docs/img/distrito_v3.png`.

## 5. Lecciones técnicas (ahorran horas)
- **Giros de objetos múltiplos de π/2** (colisión por cajas alineadas con los ejes): las calles diagonales dejan coches y edificios desalineados; por eso funciona mejor una cuadrícula con curvas suaves. Si se quiere diagonal real, hay que cambiar la colisión (Entrega 2).
- `collide()` recorre **todas** las cajas por entidad y fotograma; con miles de cajas (árboles, objetos) pesa. Un índice espacial de `boxes` es prioritario antes de añadir más densidad.
- El mapa 6 tiene ~38.000 mallas y 2.400 objetos: lógica 13–23 ms y dibujo CPU 14–22 ms por fotograma en headless (M1: 4+4). **Antes de rellenar más hace falta B7–B9** (carga por sectores/LOD, fusión de geometría estática con `mergeParts`, matrices congeladas) y medir en iPhone.
- `findPath` tiene tope de 22.000 nodos (en 1 km² una ruta larga devuelve el mejor tramo y se replanifica).
- Capturas: el bucle del juego repinta con su cámara; para fotos propias poner `menuOpen=true`, anular `renderer.render` y pintar una vez (ver `tools/foto_distrito.py`); `scene.fog=null` o todo se pierde a >58 m.
- Precalentado de shaders (`warmAll`): incluye materiales fuera de escena y color de vértice RGB/RGBA; `tests/rendimiento.py` lo vigila (era la causa del tirón al primer disparo/impacto).
- Pausar el bucle real en pruebas (`menuOpen=true`) hace los tests deterministas; `T` es el objeto táctil global (no usar como nombre).
- `OBJ.on` ya avisa de abrir/cerrar/romper/colocar y la malla de navegación se rehace al instante.

## 6. Qué preguntar al usuario primero (frases sencillas, en el chat)
1. ¿Qué es lo que más te chirría al ver la foto: las calles, los edificios, el vacío entre manzanas, los bosques o la forma general?
2. ¿Prefieres una ciudad más densa (más edificios, menos campo) o un mapa más abierto con zonas separadas?
3. ¿Las calles deben ser más irregulares (con calles estrechas, callejones y plazas) o está bien una retícula con curvas?
4. ¿Qué lugares importantes faltan o sobran, y dónde los pondrías tú?
5. ¿Quieres que antes de tocar el trazado haga el ambiente (niebla, suciedad, humo, coches quemados) para juzgarlo con el tono final?
Después: nueva foto exacta (`tools/foto_distrito.py`) y aprobación antes de colocar objetos.

## 7. Pendiente, por orden
1. Preguntas de §6 y nueva propuesta de trazado **con foto exacta** (el usuario quiere ver las ubicaciones exactas y que todo coincida con el juego).
2. B7–B9: carga por sectores + LOD, índice espacial de cajas, fusión de geometría estática, matrices congeladas; medir en iPhone (FPS por zona, llamadas de dibujo).
3. A4 recogibles (13 tipos por nivel) y A5 ambientación apocalíptica (niebla, luz fría, suelo apagado, humo e incendios, coches quemados, cráter, helicóptero, puesto militar, valla de cuarentena; ver la maqueta de tono de las capturas del 26-11).
4. Más casas y relleno de manzanas (depende de 2); parque/lago, campos.
5. B10 minimapa/mapa estratégico; B11 población y hordas por sector.
6. Entrega 2: refugio definitivo ×4, visión de bots a través de cristales, altura transitable, torres ocupables, aspilleras.
7. Entregas 3–5: inventario y equipo, reparar y mejorar (`wall1→wall2`…), conquista e infestación, guardia y destinos por grupo.
8. Sonidos (los aprueba el usuario uno a uno): zombis (`ZOM_*`), cristal, alarma, roturas; variantes de `HIT_*` aplazadas.

## 8. Otras cosas hechas en esta sesión (ver `ESTADO.md` y `ZOMBIS.md`)
Zombis: rodeo de obstáculos, atasco en 0,6 s, marcha según avance real, cola de rutas justa, flanqueo del corredor, memoria del objetivo (`tests/zombis_obstaculos.py`). Bots: visión idéntica a la del jugador (rectángulo de pantalla de la cámara, `SIGHT`), avisos de escuadra solo al ver al enemigo (radio 25 m), reacción al disparo por dirección del impacto, no por posición real (`tests/vision_bots.py`, `tests/avisos_bots.py`). Kill feed con filas reutilizadas y animadas por el compositor. Precalentado de shaders y carga de sonidos por tandas (`docs/RENDIMIENTO.md`). Más zombis (~80 al empezar). La rama de objetos y edificios (`claude/funny-hypatia-uvl1wv`) ya está fusionada en `main`.

## 9. Flujo de trabajo
Editar `src/prototipo.html`, `src/partida.js`, `src/zombis.js`, `src/mapa*.js`, `src/composiciones.js`, `src/objetos.js` → `python3 -I tools/build.py` → tests con `python3 -I tests/X.py` → commit con las líneas de atribución → `git push origin main` → comprobar el despliegue (`gh api repos/Oliiveer18/KK/actions/runs?per_page=1`) y avisar al usuario. No crear PR salvo petición. Autorizado subir directo a `main`.
