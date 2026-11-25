# Traspaso de objetos y edificios (para la sesión del mapa y la entrega 2)

Escrito el 25-11-2026 por la sesión de objetos. Rama: `claude/funny-hypatia-uvl1wv` (ya incluye `main` fusionado; se integra sin conflictos). Catálogo y medidas: `docs/CATALOGO_OBJETOS.md`. Todo está en `src/objetos.js` (se carga antes que `mapa.js`). Tests: `tests/objetos.py`, `tests/edificios.py`.

## Qué hay
- **68 tipos de objeto** (`OBJ.types`) creados con el sistema de props de siempre (piezas reales, vida por material, caja 2D en `boxes`, marcas de bala, fases de daño y restos): accesos y defensa (muros, portones y torres en 3 niveles), mobiliario urbano, comercio, hogar, almacén, refugio (almacén por reservas, camilla, tablón, armero, emblemas), estructuras (pilar, valla metálica, transformador…).
- **11 edificios recorribles** (`OBJ.buildingKinds`): `mini`, `pharm`, `super`, `gasshop`, `gascanopy`, `clinic`, `station`, `house`, `market`, `substation`, `warehouse`. Interior amueblado, puertas abiertas al crearse, escaparates con alarma, techo y friso que se ocultan al entrar y muros del lado de la cámara recortados al 28 %. Paleta de color exterior elegida al crearlos.
- **13 recogibles** (`OBJ.pickup(clase, x, z)`): material, munición, botiquín, kit de reanimación, casco, chaleco y mochila en 3 niveles. Solo modelo, sin lógica de recogida.
- **Raíles** (`OBJ.rails`), **galería** (`?galeria=1`, `OBJ.gallery([tipos])`) y **medida** (`OBJ.measure()`).

## Decisiones del usuario que ya están aplicadas (no revertir)
- **Niveles madera → piedra → hierro** para muro (`wall1-3`: 250/600/1100 de vida), portón (`gate1-3`: 180/420/750, y `gateInner` de hierro) y torre (`tower1-3`). La madera arde y las balas la atraviesan un 55 %; piedra y hierro no. Sustituye a los «bloques con pilares» del diseño (`GUERRA_DE_FACCIONES.md` aún lo dice: hay que actualizarlo).
- **Color de facción en líneas** (franja y dos filetes, `lines()`), nunca telas ni cintas. Se pone con `placeObject(..., { fac: 0..3 })` / `OBJ.fac`. Los emblemas llevan su color a bloque.
- **Locales de hoy, no medievales**: fachada de aluminio y vidrio, rótulo iluminado, parapeto plano, aire acondicionado. Sin toldos de rayas ni ladrillo.
- **Colores**: el usuario rechaza el gris. Paleta cálida y saturada (la luz del juego es fría y apaga los colores). Los edificios eligen paleta en `BLD[tipo].pal`.
- **Almacén**: lo que hay es de todos; quien quiera algo, lo lleva encima. Equipo de un muerto: lo recoge cualquiera. La vida base no se regenera sola. Condición de victoria: una sola facción en pie o controlando todo.
- **Interiores recorribles**: los edificios deben ser lo bastante grandes para interactuar dentro (pasillos de ≥ 2 m para la rejilla de bots, que infla 0,62 m).

## API para el mapa (ya usada por `mapa.js`)
`placeObject(tipo, x, z, giro, opciones)` · `OBJ.footprint(tipo, giro, opciones)` · `OBJ.removeObject(r)`. Contrato completo en `CATALOGO_OBJETOS.md` §15. Otras funciones útiles:
- `OBJ.setOpen(p, on, instantáneo)` / `OBJ.toggle(p)`: abre o cierra `gate1-3`, `gateInner`, `door`, `shopDoor`, `slideGate`, `shutter`, `rollDoor`. No cierra con alguien dentro. Abierto, la caja pasa a ser solo los postes.
- `OBJ.on.push(f)`: avisa `add`, `open`, `close`, `break`, `alarm`. **Úsalo para invalidar rutas** (la navegación del mapa 3 es estática).
- `OBJ.insideBuilding(x, z)`, `OBJ.near(x, z, r)`, `OBJ.contents(p)` (lista `loot` de cajas y armarios), `OBJ.clearBuildings()`.
- `OBJ.place(tipo, x, z, giro, fac, param)`: igual que `placeObject` pero sin snap de giro ni edificios. `param.len` solo vale para `bwallSolid`, `bwallGlass`, `shopDoor`, `rollDoor` y `chainFence`; `param.H` para muros, pilares y puertas enrollables.

## Cómo añadir cosas
- **Tipo nuevo**: `def(nombre, meta, { mat, hp, push, mass, fric, pen?, fluid?, alarm?, build(g) })` en `src/objetos.js`. `build` devuelve `{ out, hx, hz, h }` (+ `leaves`, `openBoxes`, `glassPcs`, `seats`…). Usa `bx`/`tx`/`cy`/`log`/`spike`; **no** metas materiales `tm` (con color de vértice) en `mkPiece(geoBox, …)` directamente: salen negros. Las piezas con `loose=true` saltan al romperse.
- **Edificio nuevo**: entrada en `BLD` (tamaño, puertas y ventanas por pared en `walls`, `partitions`, `pal`, `fix`, `extra`). El test `tests/edificios.py` lo recorre solo (alcanzable a pie, sin solapes).
- Tras cambiar el código: `python3 -I tools/build.py` y los tests.

## Limitaciones conocidas (por entrega, para cuando toquen)
- **Entrega 2 (refugio, navegación, altura)**: la colisión es 2D con cajas alineadas a los ejes (giros múltiplos de π/2). Pasarela, escalera y torres son sólidas; la altura transitable, ocupar el puesto (`seats` ya está en el modelo), las aspilleras a ras de suelo y la **visión de los bots a través de cristales** (`segClear` trata toda caja como opaca) están sin hacer. `rebuild` de `navBuild` tras colocar o romper (usa `OBJ.on`).
- **Refugios de facción** con piezas definitivas (muros y portones por niveles ya existen; falta el patio, el paso interior, las brechas coordinadas y la geometría funcional): `mapa.js` usa refugios provisionales.
- **Entrega 3 (inventario)**: recoger, guardar y usar; los recogibles y `loot` son solo datos.
- **Entrega 4 (economía y mejoras)**: costes y tiempos provisionales en `CATALOGO_OBJETOS.md` §10; subir de nivel = cambiar el tipo (`wall1`→`wall2`) conservando la posición.
- **Entrega 6 (rendimiento)**: cada pieza es una malla. 68 tipos suman unas 1560 piezas (máx. 64 por objeto); el supermercado son ~44 objetos y la nave ~38. Un distrito entero necesita fusionar geometría estática de lo intacto (ya existe `mergeParts` en `prototipo.html`) y medir en el iPhone.
- **Sonidos**: `IMP_glass`, `ALARM_loop` y la rotura de cada tipo no existen y callan; las roturas reutilizan `BRK_crate`, `BRK_barrier` y `BRK_blocks`.
- **Pendientes de edificios**: bloques de pisos (una sola planta transitable), almacén trasero en tiendas, más detalle interior, gasolinera como conjunto (`gasshop` + `gascanopy` se colocan por separado), alarma de tienda por sector.

## Reglas del usuario que importan aquí
Responder en español y breve; verificar y decir qué se probó y qué no; sonidos solo los que él aprueba; no bajar la calidad visual; nada de cambios no pedidos; las cosas pendientes se hacen «en orden profesional cuando toque».
