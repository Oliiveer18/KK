# Rendimiento (regla de oro: no quitar calidad visual)

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
