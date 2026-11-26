# Rendimiento (regla de oro: no quitar calidad visual)

## Navegación del distrito completo

La cuadrícula inicial se calcula entera. Al actualizarla durante la partida, el índice de colisiones marca las zonas de 8 m afectadas por altas, bajas y movimientos de obstáculos, incluido el margen de paso y la huella anterior. Cada zona se recalcula con todos los obstáculos que aún se solapan. Se conserva el ritmo de actualización y de respuesta a las puertas. Las búsquedas A* reutilizan el registro de visitados con dos marcas por búsqueda y limpian el registro completo al agotar las marcas disponibles.

Verificación contra `a4d8b4e9` en Chromium: ocho estados del terreno, 1.016.064 celdas por estado, 262 rutas idénticas y tres capturas idénticas (refugio azul, plaza y estación oeste). Para repetir la comparación se puede ejecutar `python3 tests/navegacion_distrito.py --referencia /ruta/al/index-anterior.html`. Con 120 desplazamientos de una caja en el distrito cargado, la actualización de navegación pasó de 2,88 a 0,02 ms de media en la máquina de prueba. El tiempo corresponde únicamente a esa operación.


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
