# Plan de implementación v4 — Economía, refugios destruibles y facciones competitivas

Estado: **plan cerrado y ajustado para ejecución desatendida; sin implementar hasta la confirmación del usuario** (27-11-2026; bloque R añadido con la captura del iPhone del mismo día). Se empieza cuando lo diga el usuario. Cada fase se prueba con tests y con la partida simulada, y se sube a `main` al terminarla.

## 0. Principios (no negociables)
- **Calidad visual:** nunca se baja. Todo lo nuevo es adición (el estilo D y el detalle de suelo se mantienen).
- **Rendimiento:** cada fase pasa `tests/presupuesto.py` (lógica p50 ≤ 5 ms, p99 ≤ 11 ms; ≤ 370 llamadas de dibujo; shaders ≤ 110 y 0 nuevos jugando; basura ≤ 330 KB/fotograma; memoria). Todo lo nuevo se dibuja instanciado o con los sistemas existentes (partículas instanciadas, barras instanciadas).
- **Sin sonidos inventados:** solo los que ya existen (golpes de metal, madera, hormigón, roturas…).
- **Controles táctiles invisibles:** los gestos nuevos no añaden botones fijos; teclado y táctil tienen su equivalente.
- **Verificación honesta:** cada entrega dice qué se probó y qué no (en especial lo que solo se puede medir en el iPhone).
- **Cada sistema tiene interruptor** de URL para desactivarlo y comparar (`?nodesguace`, `?norefugiohp`…).

## 0b. Protocolo de ejecución desatendida (arranca solo con la palabra «confirmado» del usuario)
**Objetivo:** implementar todo sin intervención, sin romper nada y dejando constancia. Nada de esto se ejecuta hasta la confirmación.

**Ciclo de cada fase (siempre el mismo):**
1. Implementar con interruptor de URL (`?no<sistema>`), siguiendo las decisiones de la tabla del apartado 1.
2. Pasar los tests nuevos de la fase **y** los anteriores relacionados (`escuadras`, `conciencia`, `bots_pro`, `bots_defensa`, `clases`, `estrategia`, `remate`, `zombis_tiroteo`, `mapa_tactico`, `share_mapa`, `sombra_cull`, `granadas_equipo`…).
3. Pasar `tests/presupuesto.py` y repetir la partida simulada (0 errores JS, 0 NaN, sin bots fuera del mapa).
4. Si hay cambio visual: comparación de imágenes antes/después en carretera, bosque, plaza, aldea y refugio; sin pérdida de calidad.
5. Anotar en `docs/CHANGELOG.md` y en la tabla de estado de este documento (qué se probó y qué no).
6. `git pull --rebase origin main` y `git push origin main` (nunca `--force`). Un commit por fase con el mensaje de la fase.

**Si algo falla:**
- Hasta **3 intentos** de arreglo razonados por cada test o presupuesto que falle.
- Si no se resuelve: **revertir el commit de esa fase con `git revert`** (el historial queda), marcarla `BLOQUEADA` con la causa en el registro, y continuar con la siguiente fase que no dependa de ella.
- Un test que ya fallaba antes (los conocidos: `fusion_identico`, `rendimiento` mapa 3, los de Chromium ausente) no cuenta como regresión.
- Jamás se borran ni se debilitan tests para que pasen. Los umbrales solo se cambian con justificación escrita y medida.
- Nada de cambios destructivos fuera del repositorio; nada que dependa de red externa.

**Decisiones por defecto cuando falte información:** la opción más conservadora y reversible, escrita en el registro. Los números de equilibrio van en `ECO` y se calibran con simulación (F13).

**Control de contexto:** al terminar cada fase se actualiza la tabla de estado de este documento para poder retomar sin perder nada.

**Salida:** al terminar (o al agotar lo que se puede hacer sin el iPhone) se escribe `docs/INFORME_EJECUCION.md`: fases hechas, bloqueadas, medidas (simulación y presupuesto), lo no probado y qué captura necesitas hacer (`?bench`).

**Límites duros:** calidad visual intacta, sin sonidos inventados, controles táctiles invisibles, presupuesto de rendimiento respetado, nada de `?look` ni estilos modificados sin comparación de imágenes.

### Tabla de estado (se actualiza en cada fase)
| Fase | Estado | Commit | Probado | No probado |
|---|---|---|---|---|
| F0–F12, R0–R2 | hecho | ver `git log` | tests propios + presupuesto + partida simulada de 8 min (0 errores JS) | rendimiento de GPU real (iPhone); calibración de ritmos (F13) |
| F13, R4 | hecho (con carencias, ver informe) | ver `git log` | 6 partidas simuladas | asedios en partida, economía, asalto |
| R3 | no aplicada | — | — | depende de tu captura `?bench` |

## 1. Decisiones cerradas
| Tema | Decisión |
|---|---|
| Objetivo de partida | 1.000 puntos (≈ 19 min estimados; recalibrar en F13) |
| Puntúa | bajas a rivales (+1, **sin infectados**), puntos comunes (0,4/s), puestos avanzados (0,2/s), reparto al destruir un refugio |
| No puntúa | el refugio por existir; las capturas (sin bonus); derribar un muro |
| Sin ayuda al que va por detrás | no hay compensación para el líder ni el último |
| Refugio destruido | integridad de los muros = 0 % |
| Recompensa por destruirlo | 150 puntos repartidos por el **daño** que hizo cada facción rival (infectados no puntúan) |
| Muro caído | sin botín ni puntos |
| Fuego propio | ni granadas ni balas dañan el refugio de la propia facción |
| Daño a muros | las balas hacen daño considerable; explosivos limitados (~8 % de un tramo, rendimiento decreciente) |
| Ritmo de rotura | una escuadra de 5 disparando seguido: 25–40 s por tramo |
| Almacén | una estructura con vida dentro del refugio; el stock **solo** se pierde si el almacén es destruido |
| Refugio caído | la facción no se elimina; reaparece en su puesto avanzado con retraso |
| Facción sin ningún punto | no reaparece hasta controlar uno; al capturar, reaparece por **oleadas de 3 cada 8 s con 3 s de protección** |
| Facción eliminada | sin refugio, sin puntos y sin nadie vivo; su jugador **observa** hasta el final |
| Ataque a refugios | no antes del minuto 5; una escuadra rival por refugio al principio |
| Reconstrucción | los muros caídos solo se reparan con material y tiempo |
| Materiales | **madera, piedra y hierro**; un solo almacén por facción |
| Tipos por origen | madera: cajas, tarimas, vallas de madera, árboles; piedra: bloques, barreras, sacos; hierro: coches, camiones, barriles, contenedores |
| Goteo | cada punto mantenido genera en **su montón** (tope 60), que hay que recoger y llevar. Plaza Mayor: los 3 tipos; Fábricas: hierro; Estaciones: madera; Puestos avanzados: mezcla. Se vacía al perder el punto |
| Reciclar | **desguace progresivo y visible**: el objeto no desaparece, queda un resto desguazado (cobertura baja más débil); finito |
| Talar | árboles finitos con rendimiento moderado; caen con animación y dejan tocón y tronco caído |
| Mochila | 20 / 35 / 50 unidades según nivel (jugador y bots) |
| Herramientas | hacha (madera), mazo (piedra), palanca/llave (hierro); en el inventario de todos; se usa la adecuada automáticamente; iguales para todos por ahora |
| Botín de eliminados | sus materiales, algo de munición y botiquines; lo recoge cualquier facción |
| Bots recicladores | los de apoyo y los recién reaparecidos, solo cuando están seguros |
| Entradas (PS5) | **mantener ■** = reciclar / talar / recoger montón / saquear (aro de progreso visible); **mantener ✕** = pedir médico; ■ tocar = recargar |
| Puestos de curación | arreglar el bloqueo (heridos eligen puesto, médicos acuden, médicos ociosos a la enfermería) |
| HUD | % de integridad del refugio de cada facción, en vivo, junto a la puntuación; también en mapa y minimapa |

## 2. Reglas transversales de ingeniería
- **Datos primero:** todos los números (costes, ritmos, daños, tiempos) viven en una tabla `ECO` (nuevo `src/economia.js`) para calibrarlos sin tocar la lógica.
- **Guardado:** nada persistente en esta versión (la progresión entre partidas es otro plan); el estado de partida se reconstruye al cargar.
- **Navegación:** cualquier cambio del mundo (muro caído, resto desguazado, árbol talado) avisa al sistema de rutas y refresca solo la zona afectada (`refreshNav` incremental) y el mapa táctico.
- **Telemetría:** `tests/partida_simulada.py` (versión estable de `match.py`) mide: puntuación, bajas por causa y facción, bots atrapados, material ingresado/gastado, integridad de refugios, ataques y brechas, curaciones en puesto, tiempos. Se ejecuta tras cada fase.
- **Orden de archivos:** `escuadras.js` (misiones/objetivos/HUD de facciones), `partida.js` (bots, daño, reaparición), `clases.js` (médicos, puestos, ingenieros), `zombis.js` (horda y muros), `objetos.js` (props, piezas, desguace), `inventario.js` (herramientas, mochila, depósito), `mapa_distrito.js`/`composiciones.js` (refugio, almacén, depósito), nuevo `economia.js` (tabla y stock) y `refugios.js` (muros, integridad, daño). Cada módulo nuevo se registra en `tools/build.py`.

## 3. Fases

### Bloque R — Rendimiento en el iPhone (captura del 27-11, antes de las fases de juego)
**Lo que dice la captura (partida larga, 456 llamadas, 157 k triángulos, 1012×468 con `res ×0,8`):**

| | captura 1 (antes del estilo D) | captura con estilo D sin hornear | **esta captura** |
|---|---|---|---|
| p50 / p95 / p99 | 18 / 23 / 24 ms | 19 / 24 / 28 ms | **18,0 / 23,0 / 24,0 ms** |
| fotogramas > 20 ms | 7,0 % | 23,3 % | **1,6 %** |
| fotogramas > 33 ms | 0,1 % | 0,5 % | **0,1 %** |
| máximo | 27 ms | 74 ms | **28 ms** |
| llamadas | 540 | 692 | **456** |
| resolución | ×0,8 | ×0,8 | **×0,8** |

- El suelo horneado y el recorte de sombras **resolvieron la regresión** del estilo D (de 23,3 % a 1,6 % de fotogramas largos).
- **CPU por fotograma ≈ 12 ms** (lógica 7,1 + dibujo 4,9): sobra margen. El límite es la **GPU** (≥ 18 ms): por eso la resolución dinámica sigue en ×0,8. **Objetivo del bloque: mantener ×1,0 con p50 ≤ 16,7 ms** (sin bajar calidad).
- p50 18 frente a p95 23 sugiere dos tipos de fotograma (con y sin pasada de sombra): hipótesis a confirmar, no un hecho.
- **Tirones** (6 en ~100 s: 35, 35, 71, 66, 35 y 83 ms): **todos con `explode`**; 3 con `destroyProp`; 2 de los 3 mayores (66 y 83 ms) coinciden con **`sectores`** (carga o descarga de sectores). El panel los clasifica como "GPU / basura / navegador": la lógica no es la causa.
- Partes del coste de lógica (media/máx por llamada): MX.update 2,89/11,0 ms, updateProps 0,67, zombis 0,60, updateBullets 0,58, escuadras 0,18, updateDebris 0,08. Suman ~5 de los 7,1 ms: hay ~2 ms de lógica sin desglosar.
- Comprobado en el código: la interfaz siempre visible **no** usa `backdrop-filter` (solo el mapa y el menú, que se muestran en pausa); el lienzo usa MSAA (`antialias: true`) con densidad de píxel tope 1,5.

**R0 — Medir donde hoy no se puede (primero).**
- Banco de GPU `?bench` en el panel: repite el dibujo N veces por fotograma (para superar el límite de 60 Hz) y mide, con la escena detenida, el coste de cada configuración: base, sin sombras, sombra básica, sin viñeta, sin etiquetas de escuadra, sin humo/bocanadas, sin detalle de suelo, densidad de píxel 1,0 frente a 1,5. Una sola captura da el reparto real de la GPU.
- Telemetría de tirones ampliada: separar `sectores` en carga/descarga con milisegundos y nº de lotes, contar subidas de búferes instanciados por fotograma, y variaciones de geometrías, texturas y programas.
- Desglose de los ~2 ms de lógica sin atribuir (HUD, sonido, cámara, granadas).

**R1 — Sectores sin tirones.** Reutilizar los búferes y matrices de los lotes (hoy cada carga crea `InstancedMesh` y arrays nuevos: basura y reservas de GPU), subir por rangos, cargar por lotes con presupuesto de tiempo por fotograma, anticipar con mayor radio y no cargar justo cuando hay una explosión. Test: tirones al correr por el mapa (`streaming_sectores` + máximo por fotograma).

**R2 — Explosiones y objetos rotos sin tirones.** Preparar al cargar todo lo que hoy se crea al vuelo (material y textura de la quemadura, trozos, humo), reutilizar una sola malla instanciada de marcas de quemado en vez de una malla y un material nuevos por barril, repartir el lanzamiento de piezas entre fotogramas y limitar los despertados por explosión por fotograma. Test: ráfaga de explosiones con el máximo por fotograma de lógica ≤ 16 ms.

**R3 — Presupuesto de GPU a ×1,0 (según lo que diga R0).** Candidatos por orden de riesgo visual: (a) pasada de sombra (distribución de la caja, coste del filtrado `PCFSoft`; permitido por ti profesionalizarla si hace falta, comprobando con comparación de imágenes); (b) MSAA frente a suavizado barato con la misma calidad percibida; (c) normales de cara precalculadas en vez de derivadas por píxel (idéntico); (d) solapes de transparencias (humo, bocanadas, anillos); (e) capas de la interfaz (viñeta, etiquetas con `will-change`). Cada cambio con comparación de imágenes antes/después y medida con el banco.

**R4 — Política de resolución dinámica.** Que no baje por dos tipos de fotograma ni por tirones puntuales: decidir con p50 y p95, suelo en ×0,9, recuperación rápida y registro de cuánto tiempo pasa por debajo de ×1,0. Objetivo: ≥ 95 % del tiempo a ×1,0.

**Aceptación del bloque (medido en el iPhone):** p50 ≤ 16,7 ms a ×1,0; fotogramas > 20 ms ≤ 1 %; a lo sumo 1 tirón > 33 ms cada 2 min; sin cambios visibles (comparación de imágenes). En mi entorno solo se pueden comprobar la lógica y las comparaciones de imagen; el resto exige tu captura con `?bench`.


### F0 — Infraestructura de medición
- Convertir `match.py` en `tests/partida_simulada.py` con jugador que recorre el mapa, KPIs y umbrales (informativo, no bloqueante).
- Añadir contadores de causa de muerte completos (arreglar el 8 % de bajas sin arma registrada).
- **Aceptación:** corre 15 min en < 6 min de reloj y emite el informe JSON; 0 errores JS.

### F1 — Médicos y puestos de curación
- `clases.js` (`stGoal`, `stTick`): el herido (< 55 de vida, sin combate, que no sigue al jugador) **elige el puesto más cercano esté o no activo** y registra demanda (`st.want`); el médico libre más cercano acude y se queda mientras haya heridos dentro o en camino; los médicos ociosos de una escuadra parada en el refugio van a la enfermería.
- **Pedir médico:** mantener ✕ (0,4 s) → aviso "Médico solicitado" y el médico más cercano de la facción va; sin médico, "No hay médico disponible". Teclado: tecla Y; táctil: pulsación larga en el HUD de vida. Enfriamiento de 8 s.
- Avisos en el puesto: "médico en camino", "sin médico", "zona no despejada".
- **Tests:** `puestos_curacion.py` ampliado (heridos+médico a 50 m deben converger y curarse hasta 100); `pedir_medico.py`.
- **Aceptación:** en la partida simulada, ≥ 15 curaciones en puesto por partida.

### F2 — Anti-atasco y escuadra del jugador
- Componentes conectados de la navegación al cargar (aislamientos); `nearestMain()`.
- Bot con destino y sin ruta 8 s (o dentro de una bolsa) → recolocación a la celda libre conectada más cercana, solo fuera de la vista del jugador.
- Revisar las 4 torres con muros y sacos (±126, ±154) y las bolsas de edificios; abrir lo que esté cerrado por error en `composiciones.js`.
- Al reaparecer el jugador que era líder: recupera el mando y la orden "Seguirme" con aviso, salvo que lo hubiera cedido a propósito (`escuadras.js`, `electLeader`/`SQ.onRespawn`).
- **Tests:** `mapa_bolsas.py` (0 zonas aisladas donde haya aparición/objetivo/espera), `escuadra_reaparece.py`.
- **Aceptación:** avisos de bots atrapados 52 → ≤ 3 por partida; la escuadra vuelve a < 40 m tras cada reaparición.

### F3 — Puntuación
- `escuadras.js` (`SQ.score` tick): refugio 0; +1 por baja a rival (no infectados); comunes 0,4/s; puestos avanzados 0,2/s; sin bonus de captura.
- HUD de facciones: sin cambios de formato aún (el % del refugio llega en F8).
- **Test:** `puntuacion.py` (un equipo que no sale de casa no puntúa; las bajas de infectados no suman).
- **Aceptación:** la partida simulada no da puntos por quedarse en el refugio.

### F4 — Entrada ■ mantenida e inventario de herramientas
- Registro de **interactuables** (`interactuar.js` dentro de `inventario.js`): cada uno define `puede(e)`, `tiempo`, `herramienta`, `alTerminar`. Tipos: desguace de objeto, árbol, montón de punto, botín de caído.
- Detección del más cercano al frente (≤ 2 m), aro de progreso y etiqueta ("Desguazar · hierro 12"), cancelación al soltar o ser atacado.
- Entrada: PS5 ■ mantenido (gamepad button 2), teclado E, táctil toque largo sobre el objeto. ■ tocar sigue recargando.
- **Inventario:** sección "Herramientas" (hacha, mazo, palanca) con iconos y estado; selección automática; la herramienta aparece en la mano al trabajar.
- **Tests:** `interactuar.py`, ampliación de `hud_iphone.py` (sin solapes).
- **Aceptación:** sin regresión en recarga; el aro no tapa HUD en 844×390.

### F5 — Materiales, mochila, depósito y almacén
- `economia.js`: tabla `ECO` y stock por facción `{madera, piedra, hierro}`; tope del almacén 600.
- `inventario.js`: mochila por unidades (20/35/50) con tipos; contenedores del mapa tipados (coche = hierro, caja de obra = piedra/madera…).
- `composiciones.js`/`mapa_distrito.js`: **zona de depósito** marcada junto a la entrada interior de cada refugio (suelo, cajas, cartel, luz) y **almacén** como estructura con vida.
- Entrar en la zona = descarga automática (jugador y bots) con "+12 hierro" y registro en el feed.
- HUD: "llevas 8/20" y "Almacén 148 (m/p/h)".
- **Tests:** `deposito.py`, `almacen.py`.
- **Aceptación:** un bot que vuelve con material lo deposita y el stock sube; el stock sobrevive a la caída de muros.

### F6 — Desguace visual y tala
- **Desguace progresivo** (`objetos.js`, sistema de piezas existente: `shedPieces`/`launchPiece`):
  - coche: ruedas → puertas → capó/maletero → motor; caja: tablas; barril: tapa y aro; bloque: se pica;
  - cada pieza se despega, cae y **vuela a la mochila**; aro por etapa;
  - queda un **resto desguazado** (chasis sin ruedas, oxidado) con cobertura baja y vida reducida; no se repite; icono apagado en el mapa.
- **Personaje:** pose de trabajo agachado con golpes y la herramienta en la mano (`poseBot` y modelo del jugador); partículas de astillas, chispas y polvo (pool instanciado existente); sonidos existentes.
- **Tala:** árbol → trabajo con hacha → cae con animación → tocón + tronco caído (objeto `log`); madera según tamaño. Los árboles pasan de decoración a elementos con estado (`felled`), con colisión y rutas actualizadas y sin pérdida de instanciación.
- **Reglas:** solo objetos neutrales (nunca muros de refugio, construcciones de facción ni coberturas junto a un punto); hace ruido (atrae infectados).
- **Tests:** `desguace.py` (el objeto no desaparece; resto persistente; navegación coherente), `tala.py`, captura visual antes/después.
- **Aceptación:** presupuesto de rendimiento intacto con 20 desguaces simultáneos.

### F7 — Goteo de los puntos
- `escuadras.js`/`economia.js`: cada objetivo mantenido tiene `pila {tipo→n}` (tope 60) y tasa: Plaza (m/p/h), Fábricas (hierro), Estaciones (madera), Puestos avanzados (mezcla 3/2/2 por min). Se vacía al cambiar de dueño.
- Recoger con ■ mantenido (jugador y bots); se ve la pila sobre el punto ("34/60") y en el mapa táctico.
- Bots recolectores (apoyo/recién reaparecidos): viaje seguro punto → depósito.
- **Test:** `goteo.py` (tasas, tope, vaciado al perder el punto).
- **Aceptación:** aportación del goteo a la economía de una facción ≈ 15–25 % del total.

### F8 — Refugios destruibles
- `refugios.js`: cada tramo del perímetro (`wallLow1`) con `hp`; integridad total %; daño por **arma** (tabla `ECO.dmgMuro`: balas considerables, explosivos con tope y rendimiento decreciente); fuego propio = 0; daño de infectados.
- Muro a 0 → escombros y brecha (navegación); barra de vida solo en tramos dañados (instanciada, como las de los infectados).
- **HUD en vivo:** % del refugio de cada facción en la barra superior, con barrita y parpadeo si es atacado, rojo < 30 %; mapa táctico y minimapa con aviso "bajo ataque".
- **Destrucción (0 %):** registro del daño por facción y **reparto de 150 puntos**; estado "refugio destruido"; la facción reaparece en su puesto avanzado con retraso; sin ningún punto, **no reaparece** hasta controlar uno y entonces por oleadas (3 cada 8 s, 3 s de protección); sin refugio, puntos ni vivos → **eliminada** (el jugador observa).
- **Almacén:** vida propia; si cae, se pierde el stock.
- **Tests:** `refugio_dano.py` (ritmos: 25–40 s por tramo con una escuadra de 5; granada ≤ 8 %; fuego propio 0), `refugio_destruccion.py`, `refugio_hud.py`.
- **Aceptación:** ningún abuso con granadas; el reparto de puntos suma 150.

### F9 — Ingenieros y mejoras
- Lista de trabajos del refugio (`clases.js`): reparar el tramo más dañado → portón → mejoras. Los bots disponibles (recién reaparecidos, sin misión de combate) hacen de ingeniero y pasan a defender bajo ataque.
- Reparación visible (barra de progreso sobre el tramo) y gasto del almacén por tipo.
- Mejoras por niveles: muros reforzados, portón reforzado, torre de vigilancia, enfermería mejorada, armería. Costes iniciales de `ECO`.
- **Consola del refugio** (interactuable): ver almacén, elegir "Reparar"/"Mejorar".
- **Tests:** `ingenieros.py`, `mejoras.py`.

### F10 — Defensa profesional
- Guarnición mínima por turnos (6–8 por refugio), niveles de alerta verde/ámbar/rojo (contacto < 120 m / muro atacado), defensa en profundidad ante brecha, granadas hacia la abertura, ingenieros reparando, protección corta al reaparecer (sin caza del punto de aparición).
- **Test:** `defensa_refugio.py` (defensores suficientes, sin desguarnecer, sin quedarse estáticos: se reutiliza `bots_cuerpo_a_cuerpo`).

### F11 — Ofensiva y ataques (bots e infectados)
- **Rival asignado** por facción; oleadas coordinadas (2–3 escuadras con apoyo y flanco) contra su puesto avanzado y, desde el minuto 5, su refugio.
- Reconocimiento previo; humo y granadas contra muros con tope; retirada si hay muchas bajas; tiempo entre oleadas y máximo de escuadras simultáneas.
- **Infectados:** el ruido junto a un refugio los atrae; si no hay camino, atacan el muro que bloquea (en grupo, los brutos con más daño); evento de horda ≤ 1 cada 5 min, repartido entre facciones, 30–60 infectados.
- **Tests:** `ofensiva.py` (puestos avanzados disputados; ataques al refugio ≥ 1 por partida tras el minuto 5; sin suicidios), `zombis_refugio.py`.

### F12 — Ecosistema de infectados, clases y arranque
- Reposición de infectados mucho más rápida fuera de combate (objetivo: ≥ 50 % de los del inicio a los 14 min); bots sin gastar munición en infectados lejanos que no los persiguen; infectados más peligrosos en grupo (objetivo: 10–15 % de las bajas de bots).
- Asalto y flanqueador: aproximación por cobertura y humo; revisión de escopeta (dispersión, alcance).
- Arranque: primer contacto antes del minuto 2.
- **Aceptación:** bajas/muertes de cada clase entre 0,8 y 1,6.

### F13 — Calibración final y verificación
- 20 partidas simuladas con semillas distintas: duración con objetivo 1.000 (objetivo ≈ 19 min, rango 17–24), cambios de dueño en puntos comunes, ataques y brechas, ingreso/gasto de material (calibrar costes de `ECO` hasta que reparar sea sostenible sin sobrar ni faltar), cuántos recorridos de bots reciclan con seguridad.
- Verificar explícitamente que **los bots reciclan de forma profesional**: solo si están a salvo, no dejan el combate, llegan al depósito, respetan la capacidad, no se atascan trabajando, no desguazan cobertura crítica.
- Informe final con lo probado y lo no probado (iPhone).

## 4. Dependencias y orden
**Orden de ejecución desatendida** (primero lo que puede verificarse por completo en simulación; lo que necesita el iPhone, al final y en versión segura):
F0 → F1 → F2 → F3 → R0 → R1 → R2 → F4 → F5 → F6 → F7 → F8 → F9 → F10 → F11 → F12 → F13 → **R3 → R4**.
- **R0** (banco `?bench` y telemetría) va pronto porque deja listo lo que tú medirás por la mañana.
- **R1–R2** se verifican con métricas de CPU y máximos por fotograma en simulación.
- **R3–R4** se dejan para el final y **solo se aplican los cambios que se puedan demostrar idénticos con comparación de imágenes** (por ejemplo normales precalculadas, política de resolución más prudente, y las partes del suelo y la sombra que no alteren la imagen); lo que dependa de la GPU real queda detrás de interruptor y descrito en el informe para decidir con tu captura.
- Esquema anterior (referencia): R0 → R1 → R2 → R3 → R4, después F0 → F1 → F2 → F3 → F4 → F5 → F6 → F7 → F8 → F9 → F10 → F11 → F12 → F13.
Dependen especialmente: F6 y F7 de F4 y F5; F9 de F5 y F8; F10 de F8 y F9; F11 de F8 y F10; F13 de todo. F1–F3 se pueden entregar ya y son independientes del resto.

## 5. Riesgos y mitigación
- **Rendimiento** (muros reales, desguaces, árboles con estado, más infectados): límites de elementos activos, instanciación, barras instanciadas, presupuesto en cada fase.
- **Navegación al cambiar el mundo:** refresco incremental y pruebas de bolsas tras cada cambio.
- **Abusos (granadas, spawn-camp, atracar el almacén):** topes, protección al reaparecer, almacén detrás de brecha.
- **Balance:** todo en `ECO` y calibrado con la simulación, no a ojo.
- **Entradas en el iPhone:** ■/✕ mantenidos solo existen en mando; teclado y táctil con equivalentes; el aro de progreso se comprueba a 844×390.
- **Cambio de comportamiento de bots:** cada cambio de IA pasa los tests de conciencia, defensa, escuadras y estrategia.

## 6. Tests nuevos
`partida_simulada`, `pedir_medico`, `mapa_bolsas`, `escuadra_reaparece`, `puntuacion`, `interactuar`, `deposito`, `almacen`, `desguace`, `tala`, `goteo`, `refugio_dano`, `refugio_destruccion`, `refugio_hud`, `ingenieros`, `mejoras`, `defensa_refugio`, `ofensiva`, `zombis_refugio`; ampliar `puestos_curacion`, `hud_iphone`, `presupuesto`.

## 7. Medidas que solo pueden hacerse en el iPhone
FPS con desguaces, árboles talados y refugios con muros; reparto real de la GPU (`?bench`); tirones de explosiones y sectores; coste de las barras y del HUD en vivo; legibilidad del aro de progreso y de los porcentajes de refugio.

## 8. KPIs de aceptación de la partida simulada
- 0 errores JS; ningún NaN ni bot fuera del mapa; bots atrapados ≤ 3 por partida.
- Duración ≈ 19 min (17–24) con objetivo 1.000; cambios de dueño en los comunes.
- ≥ 1 ataque a refugio tras el minuto 5; brechas y reparaciones registradas; reparto de 150 puntos correcto.
- Economía equilibrada: ingreso ≈ gasto ± 20 %; reciclaje y goteo aportan lo previsto.
- ≥ 15 curaciones en puesto por partida; infectados ≥ 50 % del inicio a los 14 min.
- Lógica p50 ≤ 5 ms y p99 ≤ 11 ms en la simulación.
- En el iPhone: p50 ≤ 16,7 ms a ×1,0, fotogramas > 20 ms ≤ 1 %, tirones > 33 ms ≤ 1 cada 2 min (bloque R).
