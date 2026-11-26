# Estado — v0.3.9 (25-11-2026)

- Facción Roja saturada (uniforme granate `0x8c3030`, acento `0xff3b2e`): se lee claramente roja y no marrón. Botón táctil de reanimar/reaparecer = mantener RECARG. (`T.relHeld` → `MX.rev`). Sonidos de zombi: eventos cableados, pendientes de los audios del usuario. Variantes de `HIT_*`: aplazadas por el usuario.

## Primera tanda de campaña (rama de desarrollo)

La pantalla inicial y el selector de mapas ofrecen «Campaña · cuatro facciones». También se entra con `?mapa=4`. En el escenario de prueba hay cuatro grupos de cuatro combatientes, con el jugador en Azul y quince bots. Se reutilizan los personajes y las armas actuales. Cada facción tiene una zona de reaparición. El combate continúa al superar las 100 bajas. Los refugios de campaña, los frentes persistentes y los infectados quedan para las siguientes entregas.

Comprobado en Chromium mediante Playwright: arranque por botón, selector y URL, cuatro facciones, dieciséis identificadores únicos y entrada al mapa 3 con doce combatientes. Pendiente de jugar en iPhone con DualSense.


Todo lo de abajo está comprobado **solo con tests automáticos y capturas** (Chrome headless, sin GPU ni altavoces). El usuario lo prueba en iPhone con DualSense. Nada se ha escuchado ni visto en el dispositivo real.

- Sin anillos de equipo bajo los personajes (decisión del usuario): la facción se reconoce por los colores. Los anillos de abatido (ámbar) y de infección (verde) se mantienen.

## Distrito (M1) · mapa grande por datos (rama `claude/mapa-m1`, sin fusionar en `main`)
`?mapa=5` (o Options → «Distrito (M1)»): primer sector de **250 × 250 m** generado por datos (`src/mapa.js` = generador, `src/mapa_distrito.js` = datos del sector `MAPA.data.M1`). Cuadrícula de calles (Avenida Mayor de 12 m con doble línea amarilla, calle central y 4 perimetrales de 8–9 m con marcas discontinuas, bordes, pasos de cebra y aceras que se cortan en los cruces), plaza de adoquín, aparcamiento con plazas marcadas, gasolinera, una vía, 4 refugios provisionales en las esquinas (muros bajos con el color de su facción, hueco de portón, emblema y 6 puntos de aparición cada uno) y 3 tiendas con interior (supermercado, farmacia, minimarket) con **el techo que se oculta al entrar**. Suelos y marcas fusionados por material: ~150 llamadas de dibujo con todo cargado. Navegación A* reajustada al tamaño del mundo (`navResize`); desde cada refugio hay ruta a los 16 puntos de interés; los bots recorren el distrito (mediana 90 m en 40 s, 0 atascos). Los objetos y edificios vienen de la rama de la otra sesión (`objetos.js`, `placeObject`), ya fusionada en esta rama. Test: `tests/mapa.py`. Pendiente: sectores 2 a 4 (M2), techo y paredes transparentes con paredes cercanas en edificios propios (hoy lo hacen los edificios de `objetos.js`), refugio definitivo (Entrega 2), población y carga por sectores, casas y estación. Sin probar en iPhone.

## Campaña: 25 combatientes por facción en escuadras de 5 (decisión del usuario, 25-11)
`?mapa=4` arranca con **100 combatientes: 25 por facción** (el jugador cuenta dentro de Azul: 24 bots) divididos en **5 escuadras de 5** por facción (`e.sq`, `e.slot`). El líder de cada escuadra es su primer miembro vivo y en pie; en la escuadra 0 de Azul lidera el jugador y los 4 bots le siguen en formación. Los seguidores van a su puesto junto al destino del líder, se reagrupan si se alejan más de 30 m y comparten avisos de enemigos con su escuadra (35 m). Aparición dispersa (±3 m) junto a los puntos de cada base; zona de las facciones 2 y 3 ensanchada. Solo se dibujan y posan los combatientes a menos de 32 m del jugador. Medido (Chrome headless): 2,6 ms por actualización con 100, 0 atascos en 60 s, ~580 llamadas de dibujo con la cámara en el jugador. `?mapa=4&bots=N` (4–25) reduce la población para pruebas (los tests de zombis y reanimación usan `bots=4`). Test: `tests/escuadras.py`. Sin probar en iPhone; el mapa de 99 × 59 m es muy denso para 100 (el distrito de 1 km² lo resolverá). Todavía sin guardia de refugio, destinos por escuadra ni otras reglas de compañía del diseño.

## Campaña: zombis (en `main`)
Actualización 25-11: **los combatientes caídos ya no se convierten en zombis** (decisión del usuario) y los zombis heridos muestran **barra de vida** y números de daño.
4 tipos (caminante, corredor, pesado, gritón), zombis locales dormidos + horda itinerante, ruido (disparos, explosiones, gritos), bots que los combaten, repoblación automática. Ver `docs/ZOMBIS.md`. Test `tests/zombis.py` (19 comprobaciones). En 100 s de partida con 16 bots no hay errores ni atascos; los bots eliminan a los zombis con rapidez en este mapa pequeño (queda por equilibrar jugando). Solo automático, sin probar en iPhone; sin sonidos de zombi todavía.

## Campaña de cuatro facciones: abatido y reanimación (rama `claude/abatido-campana`, sobre la de ChatGPT)
Solo en `?mapa=4`. Reglas (primera versión de equilibrio del diseño): al llegar a 0 de vida un combatiente con aliados en pie queda **abatido** 25 s con 40 de vida extra (sigue recibiendo daño; si se agota o pasa el tiempo, muere y reaparece como antes). Un aliado con **kit** (1 por vida, gasta uno por reanimación) se acerca (los bots solos si no ven enemigos ni les hieren) o el jugador **mantiene □ (mando) o R/E** a ≤1,5 m durante 3 s (junto a un abatido el □ no recarga). Estando abatido, el jugador puede **mantener □ (R) 0,8 s para reaparecer al instante en su refugio** en vez de esperar ayuda o morir (`SUR_T`): vuelve con 50 de vida, sin escudo. **Una reanimación por vida**; un solo rescatador por caído; recibir daño interrumpe al rescatador (progreso a 0, sin gastar kit); sin aliados en pie el golpe letal mata directamente; los enemigos no reaniman. El jugador abatido queda tumbado (rig oculto) y los bots pueden reanimarle. HUD: indicador de kits (✚) junto al escudo y mensaje central. Test `tests/abatido_campana.py` (13 comprobaciones) + 100 s de partida con 16 bots sin errores (107 caídas, 0 atascos; los bots reaniman poco porque en pleno tiroteo no ven seguro). La cruz roja de la mochila se ve mientras se lleva un kit (`syncKit`) y desaparece al gastarlo. Sin probar en iPhone con DualSense; sin botón táctil de reanimar.

## Qué hay ahora
- **Aspecto de los personajes (v0.3.9)**: paleta rehecha (uniforme apagado, equipo oscuro y un solo color vivo de facción en casco, hombreras, banda del pecho, mochila y hebilla; piel, pelo y guantes aparte) para las 4 facciones (azul, rojo, ámbar, violeta; `FAC` en `src/prototipo.html`). Equipo con 3 niveles visibles (0 sin pieza, 1 ligero, 2 medio, 3 pesado; hoy todos llevan casco 2, chaleco 2, mochila 1; `dress(R, facción, {helmet, vest, pack, kit, skin})`). Kit de reanimación = cruz roja en la mochila. **Estado abatido y reanimación solo visual**: `MX.setDowned(e, on)` (cuerpo tumbado + anillo ámbar + cruz flotante; el bot no actúa) y `MX.reviveFx(e, p)` (anillo de progreso verde); no está conectado a reglas del mapa 3 ni al jugador. Capturas en `docs/img/` (`facciones.png`: 4 facciones × 3 niveles; `abatido.png`). Coste con 12 personajes visibles: 437 → 618 llamadas de dibujo (Chrome headless, no medido en iPhone). Sin zombis. Estadísticas de equipo sin implementar (`docs/EQUIPO_Y_VIDA.md`).
- **Mapas** (menú de Options, en pausa): 1 Arena, 2 Polígono, 3 Partida 6 vs 6 a 100 bajas. De 1/2 a 3 al instante; de 3 a 1/2 recarga la página. También `?mapa=1|2|3`.
- **Partida (mapa 3)**: bots con IA y A*, escudo 50 + vida 100, armería en la base azul, ranuras 2 principales + pistola, pantalla final con tabla por jugador y REVANCHA.
- **HUD**: vida y escudo abajo a la izquierda (número grande, 5 segmentos de escudo, estado crítico con pulso); arma, munición, granadas y dash abajo a la derecha; kill feed arriba a la derecha (bajo los FPS); barras pequeñas con rombo de equipo sobre los bots. Sin chuleta de controles ni texto de depuración en pantalla.
- **Cámara**: horizontal con fov 45 (igual que escritorio); vertical ×1,4.
- **Sonido de combate**: los impactos en personajes ya no hacen golpe metálico (solo suena el disparo); `HIT_marker` al dar a un rival (sonido de interfaz) y `HIT_kill` al matar (suena solo, sin el marker). Bucles (humo, fuego, fugas) se apagan al pausar.
- **Publicación**: GitHub Pages desde `main`; subir con `git push origin HEAD:main`. Un despliegue puede fallar con error 500 de GitHub (pasó el 25-11); se relanza o se sube otro commit.

## Audio de combate (medidas)
- `HIT_marker` (1 toma): 0,49 s, golpe grave y mate (60–500 Hz, centroide ~196 Hz, casi sin agudos), recortado a 0,15 s, `SND_VOL` .6. Riesgo: en el altavoz del iPhone puede oírse flojo; si pasa, generar tomas con más clic (2–4 kHz).
- `HIT_kill` (1 toma): 0,49 s, silencio inicial ~24 ms, cuerpo ~250 ms, mucho 500–1000 Hz; inicio 0,015 s, recorte 0,3 s, `SND_VOL` .75.
- Pendiente: más variantes de ambos (al añadirlas, renombrar a `_01`, `_02`…).

## Pendiente (ver `docs/PENDIENTE.md`)
Críticos de cabeza, ambiente del mapa 3, sonidos propios de partida, rareza de armas, volúmenes a oído, modelos Meshy, gatillos adaptativos (WebHID).

## Tests (todos deben dar 0 fallos / sin errores)
`partida`, `partida_armas`, `partida_escudo`, `horizontal`, `barras`, `feed_dano` (kill feed), `hit_sonido`, `sonidos_bucles`, `audio.py index.html`, `audio_mundo.py index.html`, `balistica`, `granadas`, `pasos`.

---

# Histórico

## Estado al cierre del 25-11-2026 (v0.3.8)
- Mapa 3: partida 6 vs 6 a 100 bajas (`src/partida.js`), escudo 50 + vida 100, barras profesionales y números de daño, bots con IA y A*, armería en la base azul, ranuras 2 principales + pistola (△ tocar / mantener). Tests: `partida.py`, `partida_armas.py`, `partida_escudo.py`, `horizontal.py`.
- Móvil: horizontal con cámara fov ×1,05 y HUD en las esquinas; vertical sin cambios. Todo probado solo en automático + capturas; el usuario lo prueba en iPhone.
- Pendiente anotado: críticos de cabeza (zona de cabeza en impactos); ambiente del mapa 3; sonidos propios de partida (ElevenLabs); causa del "mando no detectado" en iPhone ya aclarada (WebKit).

**v0.3.0**: añadido mapa 3 (partida 6 vs 6 a 100 bajas) en `src/partida.js`. Probado solo con tests automáticos.

**Resumen v0.2.2 (25-11):** publicada. Todo comprobado solo con pruebas automáticas y capturas (Playwright/SwiftShader, sin GPU real): `balistica`, `granadas`, `pasos`, `audio`, `audio_mundo`, `poligono_mando` con 0 fallos y sin errores JS. **Sin probar por el usuario con mando y altavoces:** granadas fijas con cruceta, humo nuevo, barriles nuevos, marcas de bala con relieve (altura real de la bala), fuga que sigue al barril, pasos (volumen `.16`), física propia de restos (sin choques entre trozos, por decisión del usuario), marcas de bala en restos (`stickDecal`), mancha de quemado difusa, rendimiento real en el Mac. Detalle de lo hecho en `docs/HANDOFF.md` (sección «Estado y decisiones») y `docs/CHANGELOG.md`. Lo que sigue abajo es el histórico de v0.1–v0.2.1.

# Histórico — v0.2.1

**Veredicto:** v0.1.0 fue probada por el usuario con DualSense real. La v0.2.0 (objetos destructibles, cobertura, barra de dash) fue aprobada por el usuario tras probarla. La v0.2.1 (motor de audio y primeros sonidos de la pistola) está comprobada solo con pruebas automáticas; falta que la pruebe con altavoces y su mando.

**Versión anterior estable:** v0.1.0. El usuario la ha probado con su DualSense real (iPhone) y confirma que lo implementado está bien, salvo lo indicado en «No funciona».

## Verificado
- v0.2.1: carga sin errores; las muestras de la P1 se decodifican (disparo, clic en vacío, sacar arma); un disparo = un sonido; el clic suena una vez y arranca la recarga; el inicio de la muestra queda a ~2 ms del transitorio original; el fusil y la escopeta siguen con el respaldo sintético sin errores (prueba automática en Chrome headless, `tests/audio.py`). Sin probar: el sonido real con altavoces, el nivel relativo entre sonidos y Safari/iPhone.
- Carga sin errores en consola (Chrome headless, SwiftShader).
- Simulación a 60 fps (`tests/sim.py`): pies en contrafase al caminar y correr en las cuatro direcciones; solo 1–2 fotogramas con ambos pies en el aire por paso al correr.
- Dash corto/largo y frenado (`tests/pw32.py`, `tests/pw34.py`).
- Controles con mando simulado (`tests/pw26.py`), umbrales de gatillos (`tests/pw15.py`), vibración por arma (`tests/pw31.py`).
- Casquillos (`tests/pw28.py`, `pw29.py`) y cargadores (en reposo sobre el suelo, probado con las tres armas).

- v0.2.0: rotura de cajas y vallas, fugas de barril, cadena de explosiones, empuje, penetración por material, cobertura (de pie/agachado/lejos), barra de dash en todos sus estados (`tests/pw40.py`, `pw42.py`–`pw45.py`). Carga sin errores.
- No medido: rendimiento en móvil con muchos objetos a la vez.

## Probado por el usuario con DualSense real
Movimiento, piernas, dash (corto y largo), agacharse, correr, apuntado, armas, casquillos, cargadores y retroceso.

## No funciona (limitación conocida)
- **Vibración del mando**: no vibra. El código usa `vibrationActuator.playEffect('dual-rumble')` y `navigator.vibrate`, pero Safari en iPhone no expone la vibración del DualSense a páginas web. Probablemente sí funcione en Chrome de escritorio (Windows/Mac/Linux); sin confirmar.
- **Gatillos adaptativos (dureza/resistencia)**: no se pueden controlar desde el navegador. Se probaron umbrales analógicos de pulsación en L2/R2 por arma; el usuario confirma que no se nota la diferencia.

## Pendiente
- Sonidos: tanda 1 en curso (P1 hecha: disparo 1/3 variantes, clic y sacar; faltan recarga 1-3). Lista completa y prompts en el documento de sonidos. Tras la P1, F1 y E1, casquillos y cargadores, impactos y explosiones.
- Rarezas (común, poco común, rara, épica, legendaria) con porcentaje único y ficha de barras: aprobado en propuesta, sin implementar. Rasgos épico y legendario: provisionales, sin implementar hasta probar si resultan intuitivos.
- Armas nuevas (P2, S1, S2, F2, E2, H1, H2) y modelos con Meshy: pendientes.
- Decidir cómo tratar vibración y gatillos adaptativos. Propuestas en `docs/PENDIENTE.md` (aplazado por el usuario).
- Ajuste fino por feedback: retroceso, frenado del dash, tamaño de casquillos.

- Enemigos con IA: la cobertura es solo visual/de disparo del jugador, los blancos son fijos.
- Ventaja táctica al agacharse en cobertura (menos dispersión, menor visibilidad).

## Siguientes ideas (no empezadas)
- Multijugador online y mundo persistente por facciones.
- Estrategia y tácticas.
- Más armas, animaciones de recarga por arma, impactos y daño.

## Audio (actualización)
Muestras: 104 de 105 sonidos (sin capas de rareza, descartadas por ahora). Falta `C_44_multi` (se construye a partir de un `C_44` suelto). Solo suenan hoy: P1, F1 (disparo, vacío, equip, recarga), casquillos C_9mm/C_556, cargadores MAG_pistol/MAG_rifle y E1 (disparo, vacío, recarga). El resto está cargado pero sin conectar. Prueba: `python3 tests/audio.py` (sin errores). No probado a oído en navegador.

## v0.2.2 (sin publicar) - sonido completo y 7 armas provisionales
- Armas provisionales (geometría y stats por ajustar): P2 revólver, S1 subfusil, S2 subfusil .45, F2 precisión, E2 escopeta semi, H1 ametralladora, H2 lanzagranadas. E1 ahora hace el bombeo con E1_pump.
- Sonidos de mundo conectados: impactos por material, roturas, escombros, empujes, fugas, fuego, explosiones, granadas, humo (bucles con límite de 14).
- Ayudantes de audio: playAt (distancia + panorama), loopAt/loopTick, later/tickTQ. Build: opciones inicio, quitar, bucle, apilar.
- Capas de rareza: descartadas. Nuevo test: tests/audio_mundo.py.
- Probado: automático (Playwright, sin errores JS; las 10 armas disparan, seco, recarga; 8 props; explosiones, humo, fuego). NO probado: escucha real en navegador, volúmenes, fugas, empuje.

## Visión de los bots (v0.3.13)
Los bots ven lo mismo que el jugador: un enemigo sólo se detecta si cabe en el rectángulo de pantalla de la cámara real alrededor del bot (`SIGHT.hw`/`SIGHT.hd`, medidos cada 0,5 s con rayos de la cámara; ±10 m de ancho y ±8 m de fondo en una ventana de escritorio, más ancho en un iPhone en horizontal, más estrecho en vertical). Sin cono: el jugador también ve a su espalda dentro de la pantalla. Los zombis que amenazan a los bots usan la misma regla. Test: `tests/vision_bots.py`. Siguen igual los avisos de escuadra (`squadAlert`) y ir hacia quien les dispara.

## Avisos de escuadra y disparos (v0.3.15)
- Aviso de escuadra: sólo cuando un bot VE (con la visión igual a la del jugador) a un enemigo por primera vez o a uno nuevo, no con seguimiento continuo; alcance de radio 25 m; los compañeros que no lo ven van a donde estaba (`search`).
- Herido por alguien que no ve: va hacia la DIRECCIÓN del impacto (`hitSrc`: 10 m atrás ±2,5 m), no a la posición real del atacante; tampoco lo fija como objetivo. El bot herido con poca vida huye de ese punto.
- Test: `tests/avisos_bots.py`.

## M2 · tanda 1 (v0.3.16)
- `src/mapa.js`: **calles curvas**. Una calle con `pts: [[x,z],…]` y `w` (en lugar de `axis/c/a0/a1`) se suaviza (Catmull-Rom), se remuestrea cada 2 m y se dibuja con asfalto, aceras cortadas donde se cruza otra calle, bordes y línea central (doble amarilla si `w ≥ 10`, discontinua si no). Fusionado por material (4 mallas para 3 calles). `MAPA.pathPts(pts, paso)` da los puntos y tangentes para colocar objetos a lo largo de la calle (atascos, farolas). Las calles de rejilla de M1 no cambian.
- `tests/calles_curvas.py` (captura `docs/img/calles_curvas.png`) y `tests/mapa_cobertura.py` (guía: hoy faltan 45 de 76 tipos, 8 de 11 edificios y 13 de 13 recogibles; `--estricto` fallará hasta terminar el montaje).
- Siguiente: composiciones reutilizables (atasco, barricada con portón, puesto de control, cruce con torre, fachada con aparcamiento) y colocación a lo largo de las calles; luego montar el trazado del boceto.

## M2 · tanda 2 (v0.3.17): composiciones
- `src/composiciones.js` (`COMP`, se carga tras `mapa.js`): bloques de objetos ya montados, deterministas (semilla) y sin solapes (cada colocación comprueba la huella de todo lo ya puesto, `D.occ`): `jam` (atasco a lo largo de una calle, curva o recta), `barricade` (muros + portón por nivel 1–3, sacos y cajas, cobertura detrás), `checkpoint` (barricada + torre + coches y barriles cruzados + foco), `towerPost`, `scatter` (restos), `street` (mobiliario urbano a lo largo de una calle), `storefront` (edificio + aparcamiento + contenedor + banco + carros), `camp` (puestos y carros), `yard` (valla metálica con verja corredera + palés, jaulas, carretilla, contenedor).
- `MAPA.put(t,x,z,g,o)`: coloca cualquier objeto del proyecto; **`placeObject` no conoce los 8 de siempre** (cajas, vallas de madera, barreras de plástico, barriles, sacos, bloques), así que `put` los crea con `addProp`. `D.objects` del generador ya usa `MAPA.put`. `MAPA.fp(t,g)` mide cualquier tipo.
- Test `tests/composiciones.py` (captura `docs/img/composiciones.png`): 217 objetos, 0 solapes, todo dentro del mapa, determinista, usa los 8 originales.
- Limitación: los giros son múltiplos de π/2 (caja de colisión alineada con los ejes), así que los coches en una curva diagonal quedan alineados al eje dominante.

## M2 · tanda 3 (v0.3.18): distrito completo `?mapa=6` (A1–A3 del plan)
- `MAPA.data.M2` (en `src/mapa_distrito.js`): trazado del boceto aprobado en 1 km² (`half 500`): 11 arterias curvas, ~110 calles de barrio (rejilla girada por zona, con T en las arterias), vía curva en tramos, plaza adoquinada fuera de las calles, aparcamiento y patio de carga, 4 refugios provisionales con su equipamiento (`COMP.refugeKit`: almacén, armería, camillas, tablón, focos, sacos).
- **Edificios:** los 11 tipos (super, pharm, mini, clinic, market, gasshop+gascanopy, station, warehouse ×3, substation) y 56 casas con la puerta a la calle (límite por coste de dibujo). `COMP.building` / `COMP.frontage` colocan sin solapes y fuera del asfalto.
- **Objetos:** 12 cortes (barricadas) + 8 puestos de control (nivel 1–3) con atascos delante, 8 torres, atascos largos en avenida y calle central, mobiliario y locales cerrados (persianas, cristaleras, quioscos), pasarelas, subestación con transformadores, restos alrededor de los 8 objetivos y los 8 nidos. **Cobertura: 76/76 tipos y 11/11 edificios** (los 13 recogibles son el punto A4, sin hacer).
- Motor: índice espacial de calles (`MAPA.roadIndex`), `pathPts` con paso configurable, `findPath` con tope de 22.000 nodos (en 1 km² una ruta larga ya no puede congelar el juego: devuelve el mejor tramo y se replanifica), `MX.dataId` ('M1' | 'M2'), entrada 6 en el menú (marcada «en construcción»).
- Tests: `tests/distrito_completo.py` (11 edificios, casas, 6 aparición por refugio, ≤12 solapes, todo dentro, **alcanzabilidad a pie desde los 4 refugios a todos los puntos de interés**), `tests/mapa_cobertura.py 6`.
- **Rendimiento (medido en headless, no en iPhone):** ~40.000 mallas, 2.380 objetos; lógica 13–23 ms y dibujo CPU 14–22 ms por fotograma (M1: 4 + 4). Es el motivo de que el siguiente paso sea B7–B9 (carga por sectores, fusión de geometría y matrices congeladas) antes de jugarlo en el iPhone. `begin()` tarda ~2,2 s.

## Distrito v3 (26-11): cuadrícula recta y simétrica, igualdad entre facciones (`?mapa=6`)
Sustituye al v2. Decisión del usuario (26-11): igualdad total entre facciones (nadie con un bosque o un objetivo más cerca), mapa más cuadriculado y recto, sin curvas innecesarias, organizado de forma profesional. Aprobó el boceto `docs/img/mapa_v3_boceto.png` (`tools/boceto_simetrico.py`) y pidió las ubicaciones oficiales. **Lista exacta y foto real: `docs/DISTRITO_V3.md`, `docs/img/distrito_v3.png` (+ 5 ampliaciones: un cuarto por facción y el centro)**; se regeneran con `python3 -I tools/foto_distrito.py`.
- **Igualdad por construcción:** se diseña el cuarto Azul (noroeste) y se copia girado 90/180/270° (Rojo, Violeta, Ámbar). `D.sym = 4` hace que `COMP.put` / `COMP.building` / `COMP.reserve` coloquen cada cosa en las 4 copias o en ninguna (y giran el color de facción). Objetivos de borde con `D.sym = 2`: Fábrica al norte y al sur, Estación con supermercado al este y al oeste (cada facción tiene uno de cada a 437 m). Plaza Mayor en el centro exacto (618 m de cada refugio). Test de igualdad en `tests/distrito_sentido.py` (0 objetos sin copia de 2.040).
- **Calles rectas** en 4 categorías: avenidas en cruz (14 m), ronda interior a ±250 (11 m), ronda exterior a ±375 (8 m), calles de barrio y de aldea (7 m); manzanas de 125 m. Las calles de rejilla ahora tienen índice espacial (`MAPA.roadIndex`), las aceras sólo se cortan del lado por el que sale la otra calle (las T quedan con la acera entera enfrente) y los pasos de cebra no se pintan fuera de la calle.
- **Cada facción:** refugio 50 × 50 en su esquina con acceso a la ronda exterior y 2 torres; bosque propio en L (2 manzanas); 2 granjas (recinto de madera, campo y casas); aldea con cruce, torre y subestación vallada; 2 manzanas residenciales; puesto avanzado (gasolinera + recinto de piedra con torre); casco con farmacia y tienda; comercios junto a la plaza (clínica y mercado); 3 retenes (media avenida y 2 en la ronda exterior con torre); 5 nidos de zombis.
- Relleno (tras optimizar, ver `RENDIMIENTO.md`): parcelas de 26 m en todas las calles de barrio, aldea y rondas, con jardín trasero arbolado y un coche aparcado delante de cada dos casas. Cifras: 436 edificios (400 casas), ~2.060 objetos colocados por el generador, 1.500 árboles, 12 retenes, 52 puntos calientes; ~11.400 props con interiores.

## Distrito v2 (v0.3.19, sustituido por el v3): cuadrícula orgánica coherente (`?mapa=6`)
Sustituye al trazado diagonal anterior. Decisión del usuario (26-11): las carreteras estaban a trozos y había muros, puertas y sacos sin sentido en la calzada; mejor una cuadrícula con pequeñas curvas, con sitios para bosques. (Su lista y fotos se han borrado; están en el historial de git.)
- 3 arterias N-S y 3 E-O cada ~250 m con pequeñas curvas, que se cruzan en nodos exactos (N00…N22); 18 calles de barrio ortogonales que nacen y mueren sobre otra calle (test: ningún extremo suelto). Vía férrea E-O al sur del centro.
- Norma de colocación (la comprueba `tests/distrito_sentido.py`): muros, portones, torres, sacos, farolas y mobiliario nunca en la calzada; árboles a >8 m del asfalto; edificios fuera de calle y acera; retenes = chicane de vehículos con sacos en la acera, siempre franqueables (12/12), lejos de los cruces; atascos por carril alineados con la calle; recintos amurallados (nivel 1/2/3) sólo en parcelas junto a una calle con el portón hacia ella; refugios con portón de madera y torre.
- 750 árboles instanciados (3 mallas) con caja de colisión en el tronco; bosque norte, este y oeste, arboleda noreste y parque sur.
- 11 tipos de edificio, 64 casas, 76/76 tipos de objeto. Pendiente: recogibles (A4), ambiente (A5), rendimiento B7–B9 (~38.000 mallas).

## Campaña táctica (26-11): escuadras, zombis y objetivos
- **Escuadras** (`src/escuadras.js`): 2–6 por escuadra, iguales en las 4 facciones; misión del mando de cada facción; líder por mérito y relevo; formación abierta, avance por saltos, apoyo y supresión, sin persecuciones; el jugador da órdenes con la cruceta (ver `CONTROLES.md`), toma/cede el mando, se une a otra escuadra o va por libre; los bots se reparten entre escuadras.
- **Coches**: cobertura baja en capó y maletero, alta en la cabina.
- **Zombis**: ~600 en el distrito por zonas e interiores, 4 hordas migratorias; simulación por cercanía y dibujo sólo de los cercanos (`ZOMBIS.md`).
- **Objetivos**: 29 capturables con suministros y refuerzos.
- Medido en headless (100 combatientes + ~600 zombis): ~4 ms por actualización de lógica. Ritmo: primer combate a los ~2,5 min, capturas a partir de los ~2 min. **Nada de esto se ha probado en iPhone.**
