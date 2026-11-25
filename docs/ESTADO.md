# Estado — v0.3.9

- Sonidos en bucle (humo, fuego, fugas): con el menú abierto (pausa) seguían sonando; ahora se apagan con fundido y vuelven al cerrar. Test nuevo `tests/sonidos_bucles.py` (sin bucles huérfanos tras 2,5 min de partida con bots). Solo automático; sin probar a oído.

- 25-11: dos despliegues de Pages fallaron con error 500 de GitHub y el reintento se quedó en cola; se forzó un despliegue nuevo con este commit de docs.

- Cámara horizontal: quitado el campo ampliado ×1,05 (fov 47,3 → 45, igual que escritorio). Personaje 8,1 % → 8,5 % de la altura. Solo automático. La vertical (×1,4) no cambia.

- v0.3.9: selector de mapa en el menú de Options (pausa el juego). Probado solo en automático (cambio 1↔2↔3, recarga desde 3, navegación con mando simulado); sin probar en iPhone con DualSense.

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
