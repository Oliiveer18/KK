# Estado — v0.3.9 (25-11-2026)

## Primera tanda de campaña (rama de desarrollo)

La pantalla inicial y el selector de mapas ofrecen «Campaña · cuatro facciones». También se entra con `?mapa=4`. En el escenario de prueba hay cuatro grupos de cuatro combatientes, con el jugador en Azul y quince bots. Se reutilizan los personajes y las armas actuales. Cada facción tiene una zona de reaparición. El combate continúa al superar las 100 bajas. Los refugios de campaña, los frentes persistentes y los infectados quedan para las siguientes entregas.

Comprobado en Chromium mediante Playwright: arranque por botón, selector y URL, cuatro facciones, dieciséis identificadores únicos y entrada al mapa 3 con doce combatientes. Pendiente de jugar en iPhone con DualSense.


Todo lo de abajo está comprobado **solo con tests automáticos y capturas** (Chrome headless, sin GPU ni altavoces). El usuario lo prueba en iPhone con DualSense. Nada se ha escuchado ni visto en el dispositivo real.

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
