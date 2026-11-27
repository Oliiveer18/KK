# Rendimiento (regla de oro: no quitar calidad visual)

## Medición en el móvil (`src/rendimiento.js`, `PERF`)
Toca el cuadro de FPS (diagnóstico) y sale un panel abajo a la izquierda: **p50 / p95 / p99 / máx del tiempo entre fotogramas**, % de fotogramas >20 ms y >33 ms, reparto lógica / preparación / dibujo CPU, las partes de la lógica (MX.update, zombis, escuadras, findPath, cull…) y los **últimos tirones con su causa** (lógica, dibujo CPU o «GPU / basura / navegador»). Avisa si la mediana pasa de 28 ms (pantalla a 30 Hz por el modo ahorro de iOS, o equipo lento). `PERF.informe()` da el texto para copiar. Interruptor `?noperf`. Es sólo medición: no cambia nada de lo que se ve.

## Navegación del distrito completo

La cuadrícula inicial se calcula entera. Al actualizarla durante la partida, el índice de colisiones marca las zonas de 8 m afectadas por altas, bajas y movimientos de obstáculos, incluido el margen de paso y la huella anterior. Cada zona se recalcula con todos los obstáculos que aún se solapan. Se conserva el ritmo de actualización y de respuesta a las puertas. Las búsquedas A* reutilizan el registro de visitados con dos marcas por búsqueda y limpian el registro completo al agotar las marcas disponibles.

Verificación contra `a4d8b4e9` en Chromium: ocho estados del terreno, 1.016.064 celdas por estado, 262 rutas idénticas y tres capturas idénticas (refugio azul, plaza y estación oeste). Para repetir la comparación se puede ejecutar `python3 tests/navegacion_distrito.py --referencia /ruta/al/index-anterior.html`. Con 120 desplazamientos de una caja en el distrito cargado, la actualización de navegación pasó de 2,88 a 0,02 ms de media en la máquina de prueba. El tiempo corresponde únicamente a esa operación.


### Streaming de mallas por sectores (`MAPA.freezeAll` / `thawAll` / `cull`, `src/mapa.js`; `?nostream` lo desactiva)
El 99,9 % de los objetos del distrito está dormido y lejos de la cámara, pero cada malla era un nodo de Three.js (~1,5 KB y trabajo para el recolector de basura). Un sector lejos de la cámara guarda ahora sólo la **receta** de sus mallas (geometría, material y banderas, que ya se compartían) y de sus lotes instanciados (la matriz de cada copia); al acercarse la cámara se recrean idénticos. Los grupos de cada objeto se quedan (otros sistemas leen su posición) y despertar un objeto de un sector congelado funciona igual (su copia del lote se oculta en los datos).
- Un sector a la vista **nunca** se dibuja congelado (se recrea al momento); además se anticipan los sectores a ≤ 3 de distancia (2 por fotograma) y se congelan los de ≥ 5 (2 por fotograma). Recrear un sector cuesta ~0,3–0,5 ms en el PC.
- **Medido** (headless): nodos de Three.js **92.700 → 42.700**; nodos `Object3D` retenidos 139 → 69 MB; montículo vivo tras recoger basura **239 → 167 MB**; un `gc()` completo 136 → 101 ms. Imagen: **0 píxeles distintos** entre sector congelado-recreado y todo vivo en 12 puntos (`tests/streaming_sectores.py`), y los tests de píxeles anteriores (`fusion_identico`, `dedupe_identico`, `sectores_identico`) siguen pasando.
- Lo que sigue vivo (~43.000 nodos): los grupos de los 17.600 objetos, 8.100 piezas no soldables (cristales…), 7.700 de edificios y 6.400 del terreno y las calles. Siguiente paso posible: congelar también edificios y piezas no soldables (más delicado: techos y puertas animados).

## Segunda tanda (27-11): tirones puntuales tras medir en el iPhone (p50 17 ms, p95 17, p99 25; picos de 37–79 ms y uno de 597 ms)
Ya iba a 60 fps; lo que quedaba eran picos aislados. Simulación de 3 minutos de juego (10.800 fotogramas, headless, `lógica + recorte`; no sustituye al iPhone):
- **Rutas (A*) repartidas en el tiempo** (`MX.pathAsync` / `MX.pathPump`, `src/partida.js`): una ruta larga llegaba a 12–14 ms en el PC (hasta 22.000 nodos) y era el pico más frecuente de la lógica (varias por fotograma al empezar o al cambiar de objetivo). Ahora bots, zombis y hordas piden la ruta a una cola y comparten ~2,5 ms por fotograma; mientras llega, el bot sigue la ruta anterior. `findPath` síncrona sigue existiendo (tests). Montículo del A* en arrays tipados (sin basura por búsqueda).
- **Explosiones**: antes copiaban los ~17.600 objetos (`props.slice()`) y rompían todos los alcanzados en el mismo fotograma (8–13 ms en el PC, el triple en el móvil). Ahora se recorren sin copiar, los 4 más cercanos reciben el daño ya y el resto en los siguientes fotogramas (≤ 3 ms por fotograma; 1–3 fotogramas de retraso en lo más lejano). Primer fotograma de la explosión: ~8,8 → ~4,5 ms de media. Mismo resultado final (`tests/explosion_reparto.py`). Interruptor `?noboom2`.
- **Edificios en reposo**: `buildingsTick` recorría los 400 edificios cada fotograma (0,33 ms); ahora se salta el que tiene el techo entero y el jugador lejos.
- Bucles `for…of` de la IA (bots, zombis, escuadras) a bucles con índice.
- **Medición con contexto**: el panel de FPS, al registrar un tirón, dice qué eventos hubo en el último segundo y medio (explosión, humo, destrucción, baja, reaparición) y si la GPU recibió shaders, geometrías o texturas nuevos. Los tiempos por parte sólo se acumulan con el panel abierto (no cuestan nada si no).
- **Lo que no se puede arreglar con un parche**: quedan tirones de 80–140 ms (en la simulación, en `escuadras`/`zombis`/`botTick` sin causa de código) que cuadran con una pausa del recolector de basura. El montón vivo es de ~254 MB y estable (sin fugas, comprobado 4 min con `gc()`), y 139 MB son **92.700 nodos de Three.js** (56.000 mallas, 20.600 grupos, 15.600 instanciadas) a ~1,5 KB cada uno. Reducir esos nodos (congelar los objetos dormidos en datos y quitar su Object3D) es el siguiente paso grande, ver propuesta.

## Hecho el 26-11 (tras medir en el iPhone: p50 24 ms, p95 30, p99 39; límite = CPU, lógica 12 ms + dibujo 6 ms)
1. **Lista de objetos despiertos (`AWAKE`)**: `updateProps`, el `tick` de objetos y `hotExplosives` recorrían los ~17.600 objetos cada fotograma (tres veces) aunque el 99,9 % estuviera dormido (soldado e intacto). Ahora sólo se atiende a los despiertos (`MAPA.wake` los añade; `lazify` los quita; una mecha o un incendio directo los añade a mano). Perfil en PC: 5,9 → 4,9 ms de lógica por fotograma (−17 %); en el iPhone se espera más. Sin cambio visual ni de comportamiento (tests `objetos`, `fusion_identico`, `rendimiento`, `escuadras`, `dominio`).

2. **Sombras en fotogramas alternos (`SOMBRA`, `src/rendimiento.js`)**: la pasada de sombra repite desde el sol todas las llamadas de dibujo de lo que proyecta (en el peor punto del distrito: 110 llamadas de cámara + ~450 de sombra). Se rehace cada 2 fotogramas (30 Hz; 16 ms de desfase en la sombra de alguien que corre, imperceptible) y la cámara de sombra se ancla a la cuadrícula de texels, así que el borde de las sombras estáticas ya no «baila». Test `tests/sombra_alterna.py`: ≤ 239 de 450.000 píxeles distintos (sólo bordes de sombra) y el fotograma sin sombra hace 2–5× menos llamadas. Interruptor `?nosombra2`.
3. **HUD sin escrituras repetidas**: el HUD asignaba el mismo texto ~9 veces por fotograma (arma, granadas, modo, toast, números de vida…), y cada asignación rehace el nodo de texto y ensucia estilo/maquetación. Ahora `textContent` sólo escribe si el texto cambia (`?nodomcache` para comparar); además `status.hidden` (obras) y `dataset.s` (barras) sólo se escriben si cambian. 1.080 mutaciones del DOM por 120 fotogramas → 21.

4. **Basura por fotograma 1.168 → 488 KB** (muestreo del montón en 300 fotogramas; en iOS el recolector de basura se nota como micro-tirones, y era la causa probable de los tirones de 35–45 ms «GPU / basura / navegador»): `Math.hypot(x, z)` reserva memoria en cada llamada (V8 no lo integra) y se llamaba miles de veces por fotograma entre bots, zombis y balas. La versión de 2 argumentos usa `sqrt` (mismo resultado salvo la última cifra). Interruptor `?nohypot`. Queda: `moveBot` ~190 KB y `MX.zom.update` ~100 KB (objetos temporales), siguiente objetivo si los tirones siguen.

5. **Bomba de humo** (mismo aspecto: ≤ 78 de 450.000 píxeles distintos en 4 momentos de la nube, sólo bordes): lo constante por bocanada (giro, desplazamientos del ruido, aparición y disolución) se calcula una vez por vértice y no por píxel; se descartan antes de leer el ruido los píxeles que no pueden verse (bajo el suelo, fuera del círculo, disolución avanzada); cada bocanada es un disco de 16 lados en vez de un cuadrado (21 % menos píxeles lanzados); sin objetos temporales por fotograma (buffers fijos y ordenación por inserción). Medido: la CPU del humo ya era despreciable (0,012 ms/fotograma) y no compila shaders nuevos al lanzarlo; el coste es de GPU: 2 nubes cubren ~14 % de la pantalla con ~6 capas de media (hasta 17) = ~0,8 fragmentos por píxel de pantalla. Para comparar en el móvil: `?sinhumo` no dibuja el humo (FPS con y sin él en el panel). Si aun así pesa, el siguiente paso sería limitar las capas del centro de la nube (las de detrás de ~5 capas no se ven), que ya cambia el aspecto y habría que aprobarlo.

## Hecho el 28-11 (distrito, `?mapa=6`): memoria, carga y llamadas de dibujo, sin quitar calidad
Medido en Chrome headless (swiftshader); en el iPhone se ve en el diagnóstico (tocar el contador de FPS: ahora muestra también carga, geometrías,
texturas y memoria JS cuando el navegador la da).

| | Antes | Ahora |
|---|---|---|
| Memoria JS (heap) | 373 MB | ~200 MB |
| Mallas en la escena | 168.000 | 48.000 (+ lotes instanciados) |
| Materiales | 7.994 | ~1.000 |
| Texturas en la GPU | 875 (37,4 MPx) | 50 (3,7 MPx) |
| Geometrías en la GPU | 4.351 | ~3.400 (formas soldadas compartidas) |
| Llamadas de dibujo (5 puntos de prueba) | 205 · 693 · 282 · 233 · 429 | 98 · 489 · 157 · 237 · 206 |

1. **Compartir materiales, texturas y geometrías idénticos** (`MAPA.dedupe`, `src/mapa.js`): mismas propiedades → un solo objeto. Los tejados que se desvanecen al entrar conservan su material propio (`userData.noShare`). Test `tests/dedupe_identico.py`: **0 píxeles distintos**.
2. **Colores de zombis compactos** (`src/zombis.js`): un `Float32Array` por zombi en vez de ~27 `THREE.Color`. Ahorro pequeño (1–3 MB).
3. **Objetos intactos soldados** (`MAPA.lazify` / `MAPA.wake`): mientras un objeto está intacto se dibuja con una malla por material y sus piezas se liberan (eran ~215 MB). Al tocarlo (bala, explosión, fuego, empujón, abrir/cerrar, romper, obras) vuelve a construir sus piezas reales **idénticas**: cada objeto guarda la semilla de su azar (`p.seed`), su facción y sus medidas. Lo transparente (cristales, brillos) no se suelda. Las formas soldadas iguales se comparten (receta de piezas y posiciones locales).
4. **Dibujo en lote** (`MAPA.instance`): dentro de cada sector, las formas soldadas iguales con el mismo material se dibujan con una malla instanciada; al despertar un objeto, su copia del lote se oculta. El precalentado compila también la variante normal de esos materiales (la que usan al despertar): ningún sombreado nuevo al disparar.
5. **Carga progresiva con barra** (`beginProgressive`, `src/prototipo.html`): pantalla de carga con barra por pasos (calles y edificios → materiales → objetos soldados → lotes → sombreados); el juego no corre ni se dibuja mientras carga. Los tests automáticos cargan de una vez salvo con `?progresivo=1`. Test `tests/carga_progresiva.py`.
6. **Construir por zonas según cercanía**: queda cubierto por el punto 3 (las piezas sólo existen donde se ha tocado algo). La carga sigue construyendo todo una vez antes de soldar: el pico de memoria al cargar es el de antes; si el iPhone se cierra al cargar, el siguiente paso es soldar sobre la marcha mientras se genera el mapa.

Imagen: con piezas reales, soldado y en lote, y tras devolver las piezas a todos los objetos se compara píxel a píxel desde 12 puntos (`tests/fusion_identico.py`). Tras despertar: **0 píxeles distintos**. Soldado/en lote: como mucho ~70 de 450.000 píxeles sueltos en bordes de triángulo y de sombra (los vértices se calculan una vez en la CPU en vez de en la GPU: diferencias de millonésimas de metro); estable, no parpadea y no quita detalle. Desactivables con `?nodedupe`, `?nolazy`, `?noinst` para comparar.

### Parpadeo de píxeles al entrar en tiendas (corregido)
Causa: superficies opacas exactamente en el mismo plano (z-fighting). Al entrar, el tejado deja de tapar el interior y al moverse la cámara la GPU alterna cuál va delante (en el móvil, con menos precisión de profundidad, se nota más). Había 14.694 pares de caras coincidentes dentro de objetos (franjas a ras, baldas, palés, estanterías de góndola) y 256 en fachadas (franjas de marca, remates). Arreglo:
- Al construir cada objeto y cada edificio (`noCoplanar`, `src/prototipo.html`): si dos piezas de distinto material comparten cara mirando al mismo lado, la más pequeña sale 2 mm (invisible a la vista). Persianas enrolladas: láminas separadas décimas de milímetro.
- Bajo cada edificio se recortan las superficies de terreno a la altura de su suelo o por encima (tierra, hormigón, adoquín): el suelo de la tienda se ve como está diseñado. Zócalo a 1,5 cm (coincidía con el asfalto a 1 cm); marcas amarillas 0,6 mm por encima de las blancas; suelo del refugio a 5,8 cm (coincidía con el umbral de las puertas).
- Test `tests/sin_parpadeo.py`: 0 pares en objetos y fachadas y suelos de tienda limpios.

## Hecho el 26-11 (distrito v3, `?mapa=6`): sin cambiar nada de lo que se ve
- **Índice espacial de cajas (`BOXG`, `src/prototipo.html`)**: celdas de 8 m mantenidas solas por `boxes.push/splice` (y `boxMoved` para lo empujado). Colisiones, balas, rayos, granadas, restos, colocación y visión de bots (`segClear`, `wallBetween`, `coverPoint`, cobertura) sólo miran las cajas cercanas. `collide` era el 24 % del JS; ya no aparece en el perfil.
- **Bots**: `dangerVec` (explosivos a punto de estallar) se calcula una vez por fotograma, no una por bot sobre los 11.000 objetos; `coverPoint` y la cobertura miran sólo 17 m / 1,5 m alrededor.
- **Sectores de 32 m (`MAPA.cull`, `src/mapa.js`)**: objetos, edificios, vías y árboles cuelgan de grupos por sector; cada fotograma sólo quedan visibles los que tocan lo que ve la cámara (con 12 m de margen para sombras y objetos grandes). Three.js deja de recorrer, calcular matrices y recortar las ~140.000 piezas del resto (había 80.000 llamadas a `intersectsObject` y `updateMatrixWorld` por fotograma). Test `tests/sectores_identico.py`: **0 píxeles distintos** con y sin recorte en 12 puntos; de 4 a 8 sectores visibles de 776.
- **Árboles por sector**: lotes instanciados por sector (3 mallas cada uno) en vez de 3 mallas con los 1.500 árboles siempre dibujados.
- **Precalentado reducido**: en mapas por sectores, `warmAll` dibuja una pieza de cada material y de cada geometría en vez de todo el mapa. Mismos programas (59), ninguno nuevo al recorrer el mapa (comprobado en `tests/sectores_identico.py` y `tests/rendimiento.py`, que ahora incluye el mapa 6). Carga (`begin`) de 6,4 s → 2,6 s en headless.
- Cifras (headless, swiftshader; no sustituyen al iPhone): dibujo CPU 55 → ~9 ms; lógica 48 → 15–26 ms (lo que queda es la IA: `findPath`); 400 casas, 11.400 objetos, 138.000 mallas, ~410 MB de memoria JS. **La memoria es ahora el límite a vigilar en el iPhone**: cada casa trae ~190 piezas (paredes, puertas y muebles rompibles).
- Siguiente si hace falta: materializar los interiores (muebles) sólo de los sectores cercanos, y fusionar la geometría de objetos intactos (punto 2 de abajo) para bajar llamadas y memoria.

## Hecho en v0.3.12
- **Precalentado completo (`warmAll`, `src/prototipo.html`)**: al tocar para empezar (y al cambiar a los mapas 3/4/5) se compilan todos los shaders (las 4 combinaciones de luces del fogonazo/explosión, también los objetos fuera de cámara) y se suben todas las geometrías a la GPU con un único dibujo. Antes sólo se compilaba lo que estaba en pantalla en el primer fotograma: al disparar (la luz del fogonazo cambia el shader de todo) o al entrar en zonas nuevas aparecían tirones de ~1–2 s. Medido en Chrome headless (mapa 5): antes 9 programas nuevos durante el juego con picos de 60–235 ms; ahora 0 y sin picos > 80 ms. El coste se paga una vez en el toque de inicio (`begin()` ≈ 0,9 s en headless).
- **Carga de sonidos** en tandas de ~6 ms (antes una tarea larga con todos los MP3).
- **Zombis**: más población en el distrito (16 grupos de 3–5 + horda, ~80 al empezar; repone por debajo de 90). Coste medido: +4 ms de lógica con ~80 zombis.
- Tests: `tests/rendimiento.py` (ningún shader nuevo ni picos tras empezar, mapas 3 y 5).

## Medido (headless, mapa 5, no sustituye al iPhone)
Lógica 4–5 ms/fotograma; dibujo CPU 4–9 ms; 80–611 llamadas de dibujo según la zona; 47 programas; 7.900 mallas en 9.200 nodos.

## Pendiente (por orden de valor; ninguno reduce calidad)
1. **Medir en el iPhone** (cuadro de FPS → clic = diagnóstico): es la única cifra que falta para saber si el límite es GPU o CPU.
2. Fusionar la geometría estática de objetos intactos (`mergeParts`) y descongelarla al dañarla: menos llamadas y menos nodos (7.900 mallas, 6.900 proyectan sombra). Requiere tocar `objetos.js` con cuidado (piezas que se rompen, puertas que se mueven).
3. Congelar matrices (`matrixAutoUpdate=false`) de lo estático: `updateMatrixWorld` es ~20 % de la lógica.
4. LOD y carga por sectores (M2) para el distrito grande.
5. Reutilizar (pool) las piezas al destruir muchos objetos a la vez (25 a la vez: pico de 65 ms).

- Kill feed (v0.3.14): 5 filas reutilizadas y animadas con la Web Animations API (sólo opacity/transform en capa propia) en vez de crear/destruir DOM y escribir estilos cada fotograma; las sombras difuminadas ya no se repintan por fotograma.

- Precalentado (v0.3.17): también se compilan los materiales que aún no cuelgan de la escena (agujeros de bala `HOLE_MAT`, casquillos, charcos, ropa, piel…) con malla de prueba, y los de color de vértice en RGB y RGBA (son shaders distintos). Era la causa del shader nuevo al primer disparo contra un objeto (test `rendimiento.py` intermitente; 8 ejecuciones seguidas ya sin fallo).


## Fase 1 del plan de FPS estables: picos y basura (27-11)
Medido en simulación de escritorio (sin dibujar, 2 min, 200 bots + ~1.600 zombis):
- **Causa de los picos**: las recolecciones de basura (scavenge de 16–20 ms cada ~0,5 s y marcado mayor), que caían sobre cualquier función. La tasa de asignación era de ~34 MB/s (474 KB por fotograma).
- **Arreglos**: (1) poner `length = 0` en un array **libera su almacén** y se reserva de nuevo al rellenarlo: las rejillas de zombis (`grid`, `ZG`) y de combatientes (`GRID`), las copias `ZS`, `cand`, `vis` y la salida de `gridRect` ahora son arrays reutilizados con **contador** (`a.n`, `gridRectN`); (2) la animación de los zombis se hace cada fotograma a < 14 m, uno de cada 2 a 14–28 m y uno de cada 3 más lejos; (3) argumentos numéricos de `put`/`fr` por `Float64Array` (sin encajar decimales); (4) la capa fija del mapa y minimapa se dibuja una sola vez a 1024 px (antes se rehacía ~90 ms al cambiar el tamaño); (5) aparición escalonada de guarniciones (10 → 3 por paso, antes 45) y presupuesto de cálculos de puestos de vigilancia (1 por fotograma) y de cobertura de puestos (2).
- **Resultado**: 474 → 204 KB/fotograma; lógica p95 8,5–9,1 → 6,9 ms, p99 11–12,4 → 8,8 ms; fotogramas > 16 ms en 2 min: 14–26 → 3; > 30 ms: 5–6 → 1.

## Fase 2: presupuesto de render (27-11)
- **Estado medido**: 77 programas de shader (estables: tras la carga y visitando 5 zonas del mapa no aparece ninguno nuevo, así que no hay compilaciones en pleno juego), 176–273 llamadas de dibujo en la pasada principal según la zona (409 con la pasada de sombras), 145–200 k triángulos, ~27.000 objetos de escena (recorrer y actualizar sus matrices cuesta 0,25 ms: no es el cuello de botella).
- **Cámara a 66 m** (antes 200): la niebla (24–58 m) lo oculta todo más lejos, así que el recorte por distancia no cambia nada de lo que se ve y mejora la precisión de profundidad.
- **Resolución dinámica de seguridad** (`src/rendimiento.js`, `?nodinres` la desactiva): solo actúa si el 90 % de los últimos 90 fotogramas supera 18,5 ms durante 2 s; baja un 10 % (mínimo 80 %) como máximo cada 4 s y vuelve a la nativa tras 8 s por debajo de 15,5 ms. No actúa a 30 Hz ni en los primeros 6 s. El panel PERF muestra `res ×0,9` cuando está activa.
- **Zombis por niveles**: completo (cada fotograma) si están activos o a < 60 m del jugador; medio (uno de cada 3 fotogramas con el dt acumulado) si solo están cerca de algún bot; lejos (cada 0,5 s). Con 200 bots casi todo el mapa quedaba «cerca» de alguien.

## Fase 3: presupuesto de CPU y crecimiento con el tiempo (27-11)
- **Objetos despiertos**: cualquier bala, explosión o empujón despertaba su objeto fusionado (≈ 6 por segundo en combate) y nunca volvía a dormir: tras 3 min había 1.159 despiertos y +17.000 nodos de escena (memoria, recolector y trabajo por fotograma crecían con la partida). Arreglo: (1) un objeto dormido a > 60 m del jugador (la niebla acaba a 58 m) no se despierta por decals, empujones, agujeros ni daños pequeños —solo resta vida y detiene la bala— hasta quedarle ≤ 50 %, o si es explosivo/fluido/fuego; (2) cada 1,5 s se vuelven a soldar (`MAPA.resleep`, máx. 16) los despiertos hace > 10 s, quietos y sin estado visual propio. Resultado a los 3 min de simulación: 247 despiertos y 30.600 nodos (antes 1.159 y 45.700).
- Balas: los combatientes se buscan en la rejilla (antes se recorrían los 200 por bala y fotograma) y los buffers se reutilizan; `boxesIn` devuelve la propia celda cuando el rectángulo cabe en una; las barras de vida de zombis se recorren desde una lista de heridos (antes los ~1.600); la rejilla de zombis para balas solo incluye los cercanos y se rehace solo si alguien la consulta.
- La resolución dinámica se desactiva en navegadores automatizados (`navigator.webdriver`): las pruebas de imagen píxel a píxel cambiaban de resolución a mitad de la medición.

## Fases 4 y 5: memoria y presupuesto automático (27-11)
- **Memoria** (tras recoger basura): 153 MB tras la carga (antes 190 con el mapa de 1 km y las funciones nuevas), ~164 MB al minuto de partida y +4,5 MB/min después (11,4 MB retenidos en 150 s, sobre todo nodos de escena de objetos despiertos cerca del jugador). Reparto de los 162 MB del montón: 58 MB nativos (búferes de arrays tipados, lienzos), 33 MB de arrays, 15 MB de números en caja y ~25 MB de objetos de Three.js (≈ 28.000 nodos de escena × ~12 sub-objetos cada uno). Texturas: 54 lienzos, 15 MB de CPU.
- **`tests/presupuesto.py`** (ejecutar antes de cada subida; 2 min de simulación con 200 bots y ~1.600 zombis): lógica p50 ≤ 5 ms / p95 ≤ 8,5 / p99 ≤ 11, ningún fotograma > 120 ms y ≤ 4 de > 30 ms, basura ≤ 330 KB por fotograma, ≤ 330 llamadas de dibujo en la pasada principal (refugio 266, calle 176, plaza 312), ≤ 80 programas de shader y ninguno nuevo en juego, memoria tras la carga ≤ 190 MB, crecimiento ≤ 6 MB/min, ≤ 600 objetos despiertos, ≤ 40.000 nodos.
- **Resultado actual**: lógica p50 3,9 / p95 6,0 / p99 7,6 ms (al empezar el plan: 4,5 / 8,2 / 12,4), máximo 54 ms (antes 96), 1 fotograma > 30 ms en 2 min, basura ~210 KB por fotograma (antes 474).
- **Pendiente de medir en el iPhone**: los FPS reales y la efectividad de la resolución dinámica (el panel PERF muestra `res ×0,9` cuando actúa).

## Minimapa en caché (27-11)
- Medido: con el minimapa desactivado el peor fotograma de 4 min de simulación era 27 ms; con él, 88–99 ms. Las paradas eran del lienzo 2D (texto y degradados radiales 10 veces por segundo). Ahora los números y etiquetas (`drawTxt`) y las manchas de fuego (`drawBlob`) se pintan una vez en lienzos pequeños y solo se copian con `drawImage`; el aspecto es el mismo. Peor fotograma: 42–61 ms. Queda algo de ruido en el lienzo del minimapa en el navegador de pruebas (software); en el iPhone el lienzo 2D va por GPU y no se ha podido medir.
