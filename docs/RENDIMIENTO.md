# Rendimiento (regla de oro: no quitar calidad visual)

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
