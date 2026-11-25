# Catálogo de objetos y ubicaciones de la campaña

Fuente: `GUERRA_DE_FACCIONES.md` §3, §5 y §6 (rama `docs/diseno-guerra-facciones`) más lo ya existente en `src/prototipo.html` (`PSPEC`). Las filas marcadas **(propuesta)** no están en el diseño: son mías para cubrir huecos y se pueden quitar. **Estado:** las tablas 2 a 7 están construidas en `src/objetos.js` (68 tipos de objeto, 13 recogibles y raíles); ver la sección 11. Los edificios completos (§8) y la lógica de inventario siguen pendientes.

Leyenda de comportamiento: **Fijo** (no se mueve), **Empujable**, **Rompible** (vida y fases de daño como los actuales), **Reparable** (conserva nivel), **Recogible** (va al inventario).

## 1. Ya existentes (8)
| Objeto | Material | Vida | Comportamiento |
|---|---|---|---|
| Caja grande | madera | 70 | Empujable, rompible, trozos con física |
| Caja pequeña | madera | 45 | Empujable, rompible, sirve de cobertura baja |
| Valla de madera | madera | 40 | Fija, rompible, penetración 75 % |
| Barrera de plástico | plástico | 55 | Empujable, rompible, cobertura baja |
| Barril de agua | metal | 110 | Empujable, fuga y charco |
| Barril explosivo | metal | 70 | Empujable, fuga, fuego, explosión en cadena |
| Sacos de arena | arena | 140 | Fijos, rompibles, absorben balas (15 % pasa) |
| Muro de bloques | bloque | 220 | Fijo, rompible, no se atraviesa |

## 2. Accesos y defensa (diseño §5)
| Objeto | Material | Comportamiento |
|---|---|---|
| Portón de acero | metal | Fijo, rompible por tramos, reparable, 3 niveles (el 3 añade puerta interior). Abrir/cerrar |
| Puerta doble | madera/metal | Rompible, abrir/cerrar, bloquea visión y ruta |
| Verja corredera | metal | Rompible, abrir/cerrar desde dentro |
| Persiana | metal | Rompible, ruidosa al moverla (alerta) |
| Pasarela y escalera de servicio | metal/madera | Fijas, dan altura y rutas; navegación vertical |
| Tramo de muro reforzado | bloque | Fijo, rompible, reparable, 3 niveles (bloques → contrafuertes → revestimiento) |
| Puesto de vigilancia elevado | madera/chapa | Fijo, ocupable por un agente, 3 posiciones por refugio |
| Aberturas de defensa a nivel del suelo | — | Hueco real para disparar y para pasar; navegación lo tiene en cuenta |
| Brecha | — | Resultado de destruir un tramo: abre ruta real a humanos, bots y zombis |

## 3. Mobiliario urbano (diseño §5)
| Objeto | Material | Comportamiento |
|---|---|---|
| Banco de hormigón | bloque | Fijo, cobertura baja, rompible lento |
| Jardinera | bloque/tierra | Fija, cobertura baja |
| Marquesina | metal/cristal | Fija, rompible (cristal), cobertura parcial |
| Quiosco | madera/chapa | Fijo, rompible, se puede entrar |
| Contenedor con ruedas | metal/plástico | Empujable, cobertura, hace ruido al moverse |

## 4. Comercio y transporte (diseño §5)
| Objeto | Material | Comportamiento |
|---|---|---|
| Palé | madera | Empujable, rompible, apilable (propuesta de apilado) |
| Jaula metálica | metal | Empujable, contiene suministros |
| Mostrador | madera/metal | Fijo, cobertura media |
| Estantería | metal | Fija o volcable, contiene suministros (propuesta: se derriba al romperse) |
| Taquilla | metal | Fija, rompible, contenedor |
| Armario de farmacia | metal/cristal | Fijo, contiene botiquines |
| Caja de suministros | madera/plástico | Rompible/abrible, **recogible** el contenido |
| Coche abandonado **(propuesta)** | metal | Fijo o empujable con esfuerzo, cobertura alta, rompible por fases; no transportable |
| Contenedor de basura **(propuesta)** | metal | Empujable, cobertura |

## 5. Sonido y visibilidad (diseño §5)
| Objeto | Comportamiento |
|---|---|
| Alarma de tienda | Se activa al abrir/romper; ruido grande que atrae infectados |
| Persiana ruidosa | Ver §2 |
| Foco de patio | Ilumina, rompible, apagarlo oculta |
| Cristalera | Rompible, ruido al romperse, línea de visión abierta tras romper |

## 6. Dentro del refugio (diseño §5–6)
| Pieza | Función |
|---|---|
| Patio de recepción | Zona de salida y reunión de compañías |
| Armería | Peanas por proximidad (ya existe una versión en el mapa 3) |
| Almacén | Módulos de estantería por reserva: materiales, munición, médica (botiquines y kits). Capacidad ×1/×2/×3 por nivel |
| Enfermería | Camillas: 1/2/3 aliados a la vez |
| Depósito de munición | Reserva visible de munición |
| Tablón de expediciones | Elegir destino y reunir compañía |
| Puesto de vigilancia | Ver §2 |
| Emblema y franja de facción | Identidad visual; cambia al conquistar |
| Camilla, puesto de reparación **(propuesta)** | Punto de interacción «Reparar/Mejorar» junto a cada pieza dañada |

## 7. Objetos recogibles, inventario y equipo
| Objeto | Detalle |
|---|---|
| Materiales | Reserva física; se gastan una sola vez al reparar/mejorar |
| Munición | Reserva; recarga del arma y reposición en peanas |
| Botiquín | Cura a un aliado en pie |
| Kit de reanimación | De un solo uso; 1 por vida del jugador; reanima a un abatido |
| Granadas de mano, de humo y de lanzagranadas | Ya existen; pasan a depender de la capacidad de la mochila |
| Casco ligero / medio / pesado | +10 / +20 / +30 de vida |
| Chaleco ligero / medio / pesado | +25 / +50 / +70 de vida |
| Mochila ligera / media / pesada | Capacidad de carga (sin vida) |
| Armas | Las 10 actuales; reparto por tiendas/almacén por decidir |

Equipo en cuerpo caído: **lo recoge cualquiera** tras la muerte definitiva (decisión del usuario, 25-11), hasta el límite de su propia mochila.

**Almacén:** lo que hay en el almacén es de todos (decisión del usuario, 25-11). Quien quiera quedarse algo, lo lleva encima. Así no hace falta ningún sistema de permisos sobre las reservas.

## 8. Edificios y ubicaciones (diseño §3)
Cada uno se construye con las mismas piezas de las tablas anteriores.
| Ubicación | Control | Interior |
|---|---|---|
| Refugio de facción (×4) | Capturable | Patio, armería, almacén, enfermería, vigilancia |
| Clínica de distrito | Capturable; puesto avanzado | Camillas, farmacia |
| Estación principal y depósito ferroviario | Un solo recinto capturable; reagrupamiento | Andenes, raíles en desuso, taquillas |
| Subestación regional | Capturable (ampliación) | Servicio eléctrico por sector, sin reaparición |
| Tienda, supermercado, farmacia | Libre | Mostradores, estanterías, armarios, cajas |
| Gasolinera | Libre | Surtidores, quiosco, depósito (sin transporte de bidones) |
| Mercado | Libre | Puestos, jaulas, palés |
| Viviendas, patios, plazas, aparcamientos, naves | Libre | Mobiliario, cobertura, coches |
| Puentes, vías, carreteras, caminos rurales | Control físico (bloquear/despejar) | Rutas alternativas |

## 9. Seres y entidades
Combatientes de 4 facciones (azul, rojo, ámbar, violeta), zombis (caminante, corredor, pesado, gritón; hecho), horda itinerante (hecho) y, en el futuro, otros humanos en red. Los zombis dañan piezas del refugio (el pesado ya rompe cajas, vallas y barriles).

## 10. Valores de equilibrio propuestos (provisionales)
Reserva única de **materiales**; unidad = 1 «lote». Un lote = una caja de suministros pequeña.

| Parte | Reparar (por 100 % de integridad faltante) | Mejorar a nivel 2 | Mejorar a nivel 3 | Tiempo de trabajo (reparar / mejorar) |
|---|---|---|---|---|
| Muro (tramo) | 1 | 3 | 6 | 4 s / 10 s |
| Portón | 2 | 4 | 8 | 5 s / 12 s |
| Almacén | 1 | 4 | 8 | 3 s / 12 s |
| Enfermería | 1 | 3 | 6 | 3 s / 10 s |
| Vigilancia | 1 | 3 | 6 | 4 s / 10 s |

- La reparación es proporcional a la integridad faltante (redondeo hacia arriba, mínimo 1). Una brecha completa se reconstruye con el coste del 100 %.
- Una alarma interrumpe el trabajo; al retomarlo no se vuelve a pagar el coste ya gastado.
- Un caminante tira un tramo de muro nivel 1 en unos 25–30 s en solitario; el nivel 3 duplica ese tiempo (a probar jugando).
- Reanimación: abatido 25 s, 3 s de rescate, vuelve con 50 de vida (ya implementado en la campaña).
- Todo se ajusta con partidas; no hay valores validados.

## 11. Implementación (`src/objetos.js`)
Los 68 tipos se crean con el mismo sistema que las cajas y barriles (piezas reales, vida por material, huella 2D en `boxes`, marcas de bala, fases de daño y restos con física). Medido con `OBJ.measure()`:

| Tipo | Nombre | Material | Vida | Huella (m) | Alto | Piezas |
|---|---|---|---|---|---|---|
| `wall1` | Empalizada de madera | wood | 250 | 3.2×0.6 | 2.75 | 31 |
| `wall2` | Muro de piedra | block | 600 | 3.2×0.66 | 2.72 | 28 |
| `wall3` | Muro de hierro | metal | 1100 | 3.2×0.62 | 2.75 | 35 |
| `gate1` | Portón de madera | wood | 180 | 4.2×0.54 | 3.1 | 28 |
| `gate2` | Portón de piedra y roble | block | 420 | 4.2×0.66 | 3.1 | 56 |
| `gate3` | Portón de hierro | metal | 750 | 4.2×0.54 | 3.1 | 40 |
| `gateInner` | Puerta interior de hierro | metal | 400 | 3.2×0.54 | 2.8 | 30 |
| `door` | Puerta doble | wood | 90 | 2×0.28 | 2.38 | 22 |
| `slideGate` | Verja corredera | metal | 200 | 4.2×0.48 | 2.55 | 53 |
| `shutter` | Persiana | metal | 90 | 2.6×0.3 | 2.5 | 17 |
| `tower1` | Torre de vigilancia de madera | wood | 220 | 2.6×2.8 | 3.9 | 43 |
| `tower2` | Torre de vigilancia con base de piedra | block | 450 | 2.6×2.8 | 3.9 | 51 |
| `tower3` | Torre de vigilancia de hierro | metal | 750 | 2.6×2.8 | 3.9 | 49 |
| `catwalk` | Pasarela elevada | metal | 260 | 4.4×1.3 | 3.45 | 42 |
| `stairs` | Escalera de servicio | metal | 220 | 3.36×1.1 | 3.3 | 24 |
| `bench` | Banco de piedra y madera | block | 150 | 1.9×0.46 | 0.95 | 8 |
| `planter` | Jardinera | block | 170 | 1.56×0.84 | 1.1 | 15 |
| `busStop` | Marquesina | metal | 110 | 3.4×1.5 | 2.65 | 17 |
| `kiosk` | Quiosco de prensa | metal | 200 | 2.6×2.7 | 2.5 | 18 |
| `wheelie` | Contenedor con ruedas | plastic | 60 | 0.62×0.7 | 1.08 | 8 |
| `dumpster` | Contenedor de basura | metal | 190 | 1.9×0.95 | 1.33 | 10 |
| `pallet` | Palé | wood | 30 | 1.2×1 | 0.18 | 11 |
| `palletBoxes` | Palé con cajas | wood | 70 | 1.2×1 | 1.1 | 25 |
| `cage` | Jaula metálica | metal | 110 | 1.2×0.8 | 1.7 | 37 |
| `counter` | Mostrador | wood | 130 | 2.48×0.75 | 1.35 | 10 |
| `shelf` | Estantería | metal | 90 | 2.2×0.55 | 1.9 | 38 |
| `locker` | Taquilla | metal | 80 | 1.56×0.5 | 1.91 | 15 |
| `pharmaCab` | Armario de farmacia | metal | 70 | 1.16×0.49 | 1.98 | 28 |
| `supplyMat` | Caja de materiales | wood | 40 | 0.8×0.55 | 0.55 | 7 |
| `supplyAmmo` | Caja de munición | wood | 45 | 0.8×0.55 | 0.55 | 8 |
| `supplyMed` | Caja médica | plastic | 40 | 0.8×0.55 | 0.55 | 7 |
| `car` | Coche abandonado | metal | 320 | 4.3×1.8 | 1.5 | 32 |
| `stall` | Puesto de mercado | metal | 100 | 2.9×1.9 | 2.3 | 16 |
| `glassPane` | Cristalera | glass | 22 | 2×0.18 | 2.2 | 10 |
| `floodlight` | Foco de patio | metal | 80 | 0.5×0.5 | 4.5 | 8 |
| `pump` | Surtidor de gasolinera | metal | 120 | 1×0.76 | 1.9 | 16 |
| `storeMat` | Módulo de almacén: materiales | wood | 160 | 1.96×0.7 | 2.1 | 47 |
| `storeAmmo` | Módulo de almacén: munición | wood | 160 | 1.96×0.7 | 2.1 | 47 |
| `storeMed` | Módulo de almacén: material médico | wood | 160 | 1.96×0.7 | 2.1 | 59 |
| `cot` | Camilla | metal | 80 | 0.9×2.28 | 0.8 | 15 |
| `board` | Tablón de expediciones | wood | 70 | 2.04×0.2 | 2.4 | 17 |
| `rack` | Expositor de armas (armería) | metal | 100 | 1.7×0.32 | 1.5 | 23 |
| `emblem0` | Emblema de facción Azul | block | 260 | 3×0.66 | 2.9 | 15 |
| `emblem1` | Emblema de facción Rojo | block | 260 | 3×0.66 | 2.9 | 15 |
| `emblem2` | Emblema de facción Ámbar | block | 260 | 3×0.66 | 2.9 | 15 |
| `emblem3` | Emblema de facción Violeta | block | 260 | 3×0.66 | 2.9 | 15 |
| `bwallSolid` | Muro de edificio | block | 520 | 4×0.36 | 3.2 | 4 |
| `bwallGlass` | Escaparate / ventana de edificio | glass | 400 | 3.5×0.36 | 2.55 | 10 |
| `shopDoor` | Puerta de local | glass | 200 | 1.8×0.2 | 2.5 | 15 |
| `gondola3` | Góndola de tienda (3 m) | metal | 130 | 3×0.9 | 1.78 | 40 |
| `gondola4` | Góndola de tienda (4 m) | metal | 150 | 4×0.9 | 1.78 | 48 |
| `fridge` | Vitrina frigorífica | metal | 140 | 2.4×0.8 | 2.05 | 64 |
| `checkout` | Caja registradora | metal | 120 | 2×0.9 | 1.35 | 10 |
| `cart` | Carro de compra | metal | 30 | 0.6×1.05 | 0.95 | 24 |
| `waitSeat` | Banco de espera | metal | 80 | 1.8×0.55 | 1 | 9 |
| `pillar` | Pilar de hormigón | block | 450 | 0.6×0.6 | 4.6 | 5 |
| `sofa` | Sofá | wood | 80 | 2×0.9 | 1 | 8 |
| `bed` | Cama | wood | 90 | 1.58×2.12 | 0.95 | 7 |
| `table` | Mesa con sillas | wood | 70 | 1.4×1.95 | 1.2 | 15 |
| `wardrobe` | Armario | wood | 90 | 1.36×0.64 | 2.06 | 6 |
| `kitchenUnit` | Cocina | wood | 110 | 2.8×0.65 | 1.9 | 16 |
| `tvUnit` | Mueble con televisor | wood | 60 | 1.4×0.45 | 1.35 | 4 |
| `chainFence` | Valla metálica | metal | 80 | 3.5×0.16 | 1.9 | 6 |
| `transformer` | Transformador | metal | 320 | 2.9×2.2 | 2.4 | 20 |
| `switchCab` | Armario eléctrico | metal | 120 | 1.2×0.7 | 2.2 | 9 |
| `palletRack` | Estantería de palés | metal | 200 | 3×1.1 | 4.2 | 35 |
| `forklift` | Carretilla elevadora | metal | 200 | 1.44×2.7 | 2.1 | 18 |
| `rollDoor` | Puerta enrollable industrial | metal | 160 | 4.5×0.38 | 4.3 | 26 |

Novedades que aporta además de los modelos:
- **Material nuevo `glass`** (cristal: pen 0,85, rotura inmediata, esquirlas y grietas en las marcas de bala).
- **Accesos que se abren y cierran** (`OBJ.setOpen(p, on)` / `OBJ.toggle(p)`): `gate1-3`, `gateInner`, `door`, `slideGate` y `shutter`. Abiertos dejan como colisión solo lo que queda en pie (postes, hoja plegada). No se cierran con alguien en el paso. Se pueden romper abiertos.
- **Alarma de tienda** (`shopFront`, `pharmFront`): cada impacto rompe el cristal más cercano, salta la alarma 20 s (baliza roja, ruido de 55 m cada 2,2 s que atrae a los infectados).
- **Foco de patio**: su haz de luz desaparece al perder la lámpara. **Surtidor**: fuga de combustible (sin explosión).
- **Persiana y cristalera** hacen ruido (`noiseOnMove` 30 m / `noiseOnBreak` 40 m).
- **Recogibles** (`OBJ.pickup(clase, x, z)`): material, munición, botiquín, kit de reanimación, y casco, chaleco y mochila en 3 niveles. Solo son el modelo; recoger y guardar llega con el inventario.
- **Raíles** (`OBJ.rails(x, z, largo, giro)`), decoración sin colisión.
- **Galería de pruebas**: `index.html?galeria=1` coloca los 68 tipos en filas; `OBJ.gallery([tipos])` coloca los que se pidan.
- **Contenido**: `OBJ.contents(p)` devuelve la lista de lo que lleva (`loot`) cada caja o armario; sin lógica de inventario todavía.
- **Eventos** (`OBJ.on.push(f)`): `add`, `open`, `close`, `break`, `alarm`; para que la navegación dinámica de la entrega 2 invalide rutas.

Límites conocidos (a resolver en las entregas indicadas):
- El juego colisiona en 2D: pasarela, escalera, puesto elevado y cristaleras son sólidos o dejan ver como una caja. La altura transitable, ocupar el puesto y la visión real a través de aberturas son de la **entrega 2** (los modelos ya llevan `seats` y el ancho de los pasos).
- Las **aspilleras** a ras de suelo del diseño no se han hecho: necesitan huecos reales en la colisión (entrega 2).
- Rendimiento: cada pieza es una malla. Los 68 tipos suman 1560 piezas (máximo 64 por objeto). Un distrito entero con cientos de objetos necesitará fusionar la geometría de lo intacto (entrega 6); medir en el iPhone antes.
- Los sonidos nuevos (`IMP_glass`, `ALARM_loop`, rotura de cada tipo) no existen todavía: callan hasta que el usuario los genere. Las roturas reutilizan los sonidos de caja, barrera y bloques.
- Edificios completos (tiendas, clínica, estación, viviendas, puentes), la colocación en el mapa y el uso por el mando/bots no están hechos.

## 12. Niveles: madera → piedra → hierro (decisión del usuario, 25-11)
Sustituye a los «bloques con pilares» del diseño original (`GUERRA_DE_FACCIONES.md`, a actualizar cuando se integre).

| | Nivel 1 · Madera | Nivel 2 · Piedra | Nivel 3 · Hierro |
|---|---|---|---|
| Muro | Empalizada de troncos con puntas, atados con cuerda (250) | Sillería ocre con esquinas de sillares y remate de tejas (600) | Planchas remachadas en vigas en H, púas y franja de aviso (1100) |
| Portón | Tablones con herrajes en dos postes de tronco (180) | Arco de piedra con puertas de roble y bandas de hierro (420) | Hierro remachado con puntas y diagonales (750) |
| Torre de vigilancia | Rollizos, chapa de techo (220) | Base de piedra, plataforma de madera, tejas (450) | Estructura y parapeto de hierro (750) |
| Balas | Atraviesan ~55 % | No atraviesan | No atraviesan y rebotan |
| Fuego | Arde | No arde | No arde |

La puerta interior del portón nivel 3 (`gateInner`, 400) es de hierro. Todos llevan el color de la facción (`OBJ.fac` 0–3): cinta en la empalizada, franja pintada en piedra y hierro, estandarte en los portones de madera y piedra, bandera en la torre.

## 13. Estilo visual
Paleta cálida y saturada (la luz del juego es fría y apaga los colores), texturas procedurales (madera con vetas y clavos, sillería irregular, planchas con óxido, ladrillo, chapa oxidada, tejas), suciedad y musgo en la base por color de vértice, colores propios por objeto (puertas, taquillas, contenedores y coches de distintos colores) y rótulos iluminados de tienda. `OBJ.setGround(hex)` permite probar otro color de suelo sin cambiar el juego.

## 14. Edificios recorribles (25-11)
El usuario señaló que los locales eran demasiado pequeños para interactuar dentro. Las fachadas de una sola pieza se sustituyen por **edificios completos con interior** (`OBJ.building(tipo, x, z, giro, facción)`; lista en `OBJ.buildingKinds`):

| Edificio | Interior | Puerta | Contenido |
|---|---|---|---|
| Minimarket | 10 × 7 m | 1,8 m | 4 vitrinas frigoríficas, 2 góndolas, caja, palé con cajas, estantería, cajas de suministros |
| Farmacia | 10 × 7 m | 1,8 m | 4 armarios, 2 mostradores con acceso al trasero, 2 góndolas, sala de espera, camilla, cajas médicas, cruz verde de bandera |
| Supermercado `super` | 18 × 12 m | 2,4 m | 8 vitrinas, 4 góndolas de 4 m, 3 estanterías, 2 cajas, 4 carros, palés, cajas de suministros |
| Tienda de gasolinera `gasshop` | 9 × 6 m | 1,8 m | 3 vitrinas, góndola, caja, cajas de suministros |
| Marquesina de gasolinera `gascanopy` | 14 × 9 m, abierta | — | cubierta de 4,8 m con rótulo y luces, 4 pilares, 2 isletas con 4 surtidores |
| Clínica `clinic` | 14 × 9 m | 2,4 m | recepción, sala de espera, 3 consultas con puerta (camilla y armario), cruz verde de bandera |
| Estación `station` | 16 × 8 m + andén | 2,4 m | taquillas, bancos, consignas, tablón, 2 puertas al andén con marquesina de 18 m, bancos, focos y vías |
| Vivienda `house` | 9 × 7 m | 2,0 m | cubierta a dos aguas con tejas, ventanas, salón (sofá y televisor), cocina con mesa, cama y armario; color de fachada al azar |
| Mercado cubierto `market` | 16 × 10 m, abierto | — | cubierta de 4,2 m, 6 pilares, 6 puestos con carpa lisa de colores y palés |
| Subestación `substation` | 14 × 10 m, vallada | portón corredizo 4,2 m | valla metálica, 2 transformadores, 3 armarios eléctricos, foco |
| Nave logística `warehouse` | 22 × 14 m, 5,2 m de alto | 2 puertas enrollables de 4,5 m + puerta | 10 estanterías de palés, carretilla, palés con cajas, jaulas |

- Cada edificio está hecho de muros (`bwallSolid`, tramos de ≤ 4 m), escaparates (`bwallGlass`, cristales independientes con alarma) y una puerta de cristal (`shopDoor`, abierta al crearlo). Todo es destructible: una brecha abre un acceso real.
- Suelo de baldosa, luz cálida interior, friso con rótulo iluminado de la marca, línea de color, cubierta plana con peto y equipos de aire.
- **Recorte de cámara:** al entrar, el techo y el friso se ocultan y los muros del lado de la cámara se recortan al 28 % (su colisión y su vida no cambian); al salir vuelven.
- Pasillos de ≥ 2 m (la rejilla de navegación de los bots infla 0,62 m). Mobiliario nuevo: góndola de 3 y 4 m, vitrina, caja registradora, carro, banco de espera.
- Medido (`tests/edificios.py`): se llega a pie a todo el interior libre desde 5 m fuera de la puerta, sin objetos solapados.
- Los edificios abiertos (marquesinas, mercado) ocultan su cubierta al entrar. La estación tiene una segunda cubierta sobre el andén. La vivienda tiene cubierta a dos aguas.
- Pendiente: rendimiento (el supermercado son unos 44 objetos y la nave unos 38; fusionar geometría estática en la entrega 6), más detalle interior, bloques de pisos (varias plantas), refugios de facción, uso por los bots (la navegación del mapa 3 es estática: hay que reconstruirla al colocar edificios) y que los cristales no corten la visión de los bots.

## 15. API para el generador de mapas
`placeObject(tipo, x, z, giro, opciones)` (global, también `OBJ.placeObject`), definida en `src/objetos.js`, que debe cargarse **antes** que `mapa.js` y `mapa_distrito.js`.
- `tipo`: cualquiera de `OBJ.types` (`wall1`, `gate2`, `car`, `shelf`…) o de edificio (`mini`, `pharm`, `super`; lista en `OBJ.buildingKinds`). Tipo desconocido: avisa una vez y devuelve `null`.
- `x, z`: centro en metros. `giro`: radianes, se ajusta al múltiplo de π/2 más cercano (la colisión es una caja alineada con los ejes); 0 = frente hacia +z.
- `opciones`: `{ fac: 0..3, len, param, abierto }`. `len` solo vale para `bwallSolid`, `bwallGlass` y `shopDoor`. `abierto` abre o cierra puertas y portones al colocarlos.
- Devuelve el prop (`p.type`, `p.x`, `p.z`, `p.hx`, `p.hz`, `p.h`) o, para un edificio, `{ isBuilding: true, kind, props, doors, group }`. No rechaza solapes.
- `OBJ.footprint(tipo, giro, opciones)` → `{ hx, hz, h }` sin colocar nada (para que el generador reparta sin solapar). `OBJ.removeObject(resultado)` quita un objeto o un edificio.
- Tras colocar o quitar objetos, las listas `props` y `boxes` del juego se actualizan solas; la navegación de los bots del mapa 3 es estática y hay que reconstruirla (`navBuild`) al terminar de colocar. `OBJ.on.push(f)` avisa de cada alta, rotura, apertura y alarma.
