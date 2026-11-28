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
