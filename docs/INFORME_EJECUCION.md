# Informe de la ejecución autónoma del plan v4 (economía, refugios y rendimiento)

Todo lo hecho está en `main` (un commit por fase, con su entrada en `docs/CHANGELOG.md`). Las cifras de la partida simulada salen de `tests/partida_simulada.py` (200 bots, ~1.500 infectados, `?mapa=6`, sin pintar) y de `tests/calibracion.py` (varias partidas en paralelo; resumen en `docs/calibracion_f13.json`).

## 1. Estado por fase

| Fase | Estado | Qué hay | Cómo se comprobó |
|---|---|---|---|
| F0 Infraestructura de medición | **hecha** | `tests/partida_simulada.py`: partida completa sin pintar, informe JSON, causas de muerte | corre 15 min de juego en ≈ 4–5 min; 0 errores JS |
| F1 Médicos y puestos | **hecha** | puestos de curación con demanda, médico acude, pedir médico (✕ mantenido / tecla Y / pulsación larga) | `puestos_demanda`, `puestos_curacion` |
| F2 Anti-atasco y escuadra | **hecha** | componentes de navegación, recolocación de atrapados, la escuadra vuelve al jugador al reaparecer | `mapa_bolsas`, `escuadra_reaparece` |
| F3 Puntuación | **hecha** | refugio 0; +1 por baja a rival; comunes 0,4/s; puestos avanzados 0,2/s | `puntuacion`, `dominio` (actualizado al diseño v4) |
| R0–R2 Rendimiento medible | **hechas** | banco `?bench`, sectores sin tirones, explosiones sin asignaciones | `streaming_pool`, `explosiones_picos`, `presupuesto` |
| F4 Interacción mantenida | **hecha** | `src/interactuar.js`, aro de progreso, herramientas en el inventario | `interactuar`, `hud_iphone` |
| F5 Materiales y depósito | **hecha** | `src/economia.js`, zona de depósito, almacén por facción, HUD | `deposito` |
| F6 Desguace y tala | **hecha** | `src/desguace.js`: desguace por etapas con restos persistentes, tala con tocón y tronco, herramienta en la mano | `desguace` + capturas |
| F7 Goteo, botín y logística | **hecha** | pilas por punto, botín de caídos, bots recicladores seguros (`src/logistica.js`) | `goteo`, `logistica` |
| F8 Refugios destruibles | **hecha** | `src/refugios.js`: integridad, daño por arma, fuego propio 0, reparto de 150 puntos, oleadas de reaparición, eliminación, almacén, HUD en vivo | `refugio_dano`, `refugio_destruccion`, `refugio_hud` |
| F9 Ingenieros y mejoras | **hecha** | `src/ingenieros.js`: reparar/reconstruir/mejorar con material y tiempo, consola del refugio | `ingenieros`, `mejoras` |
| F10 Defensa | **hecha** | `src/defensa.js`: alertas verde/ámbar/rojo, guarnición 6/8/12, granada a la brecha | `defensa_refugio` |
| F11 Ofensiva e infectados | **hecha (parcial)** | `src/ofensiva.js`: rival, oleadas, asedio con balas reales, retirada, infectados contra el muro, hordas | `ofensiva`, `zombis_refugio` |
| F12 Ecosistema, clases, arranque | **hecha (ajustes de datos)** | reposición de infectados, munición no malgastada, asalto más prudente | partida simulada (ver §3) |
| F13 Calibración | **hecha con las partidas que cupieron** | ver §3 | `tests/calibracion.py` |
| R3 GPU a ×1,0 | **no aplicada** | solo se aplican cambios demostrables idénticos y depende de tu captura `?bench` | — |
| R4 Resolución dinámica | **hecha** | decide con el fotograma típico y el p95, suelo ×0,9, recuperación rápida, registro del tiempo bajo ×1,0 | `resolucion_dinamica` |

No quedó ninguna fase bloqueada ni revertida.

## 2. Pruebas

Pasan: `interactuar`, `deposito`, `desguace`, `goteo`, `logistica`, `refugio_dano`, `refugio_destruccion`, `refugio_hud`, `ingenieros`, `mejoras`, `defensa_refugio`, `ofensiva`, `zombis_refugio`, `resolucion_dinamica`, `hud_iphone`, `puestos_curacion`, `mapa_bolsas`, `dominio`, `presupuesto` (la basura por fotograma y los tirones de lógica oscilan entre ejecuciones con la carga de la máquina).

Tests tocados por decisión de diseño: `dominio` y `objetivos` (los refugios ya no se capturan ni puntúan). No se rebajó ningún umbral.
Conocido y anterior a esta sesión: `tests/objetivos.py` falla en una parte porque busca una escuadra de 6 y ahora son de 5. No lo arreglé.

## 3. Calibración (6 partidas simuladas completas, `docs/calibracion_f13.json`)

| KPI | Objetivo | Medido (media, rango) |
|---|---|---|
| Duración con 1.000 puntos | 17–24 min | **18,9 min** (16,9–20,8); 0 errores JS |
| Primer contacto | < 2 min | **115 s** (99–130) |
| Bajas por infectados | 10–15 % | **11,7 %** (9–13,5) |
| Infectados vivos al final | ≥ 50 % del inicio | 1.017 de ≈ 1.470 (≈ 69 %) |
| Bajas/muertes por clase | 0,8–1,6 | fusilero 1,15 · apoyo 1,17 · francotirador 1,35 · médico 0,76 · flanqueador 0,76 · **asalto 0,38** |
| Material | ingreso ≈ gasto ±20 % | ganado ≈ 1.068, depositado ≈ 756, **gastado ≈ 319**, stock final ≈ 877 |
| Oleadas / asedios / refugios destruidos | ≥ 1 ataque al refugio tras el minuto 5 | ≈ 23 oleadas, **0 asedios, 0 refugios destruidos** |

## 4. Lo que NO se cumple todavía (hay que decidirlo)

1. **Ningún asedio en partida.** Las oleadas van contra el puesto avanzado, pero el rival casi nunca lo pierde, así que nunca pasan a atacar el refugio. El asedio solo está probado en test. Propuesta: atacar el refugio también si el puesto sigue siendo del rival tras 90 s de oleada.
2. **Economía descompensada:** se gasta ~30 % de lo ingresado y el almacén se llena (tope 600). Sin ataques apenas hay nada que reparar. Propuesta: subir los costes de mejora ×2–3 o bajar el goteo.
3. **Asalto con 0,38 de bajas/muertes.** Los ajustes de F12 (más distancia, menos dispersión de escopeta) no bastaron.
4. Reciclaje: ~360 trabajos por partida pero ~280 abortos, casi todos por contacto: los bots dejan el trabajo correctamente, pero lo reintentan a menudo.
5. Se hicieron 6 partidas, no las 20 del plan (≈ 30 min de reloj cada una).

## 5. No implementado

Reconocimiento previo con explorador; humo y granadas de los atacantes contra el muro; reparar un tramo con ■ (el jugador repara solo desde la consola); R3 (GPU) completo.

## 6. No probado

Rendimiento en el iPhone real, táctil real, mando real (solo se simulan las entradas), sonido y comparación visual completa con la versión anterior (solo capturas puntuales de zona de depósito, tala y HUD).

## 7. Qué capturar con `?bench`

Abre el juego con `?bench`, ponte en la Plaza durante un tiroteo y toca «BANCO GPU» (arriba a la izquierda). Espera a que termine y envíame la captura entera del resultado. Repítelo cerca de tu refugio. Con eso decidimos R3 y el suelo de ×0,9 de R4. La resolución dinámica ahora muestra en el panel el % del tiempo que pasa por debajo de ×1,0.

## 8. Interruptores de URL

`?nologistica`, `?nodefensa`, `?nooferiva`, `?norefugios`, `?nodinres`, `?bench`.
