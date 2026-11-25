# Catálogo de objetos y ubicaciones de la campaña

Fuente: `GUERRA_DE_FACCIONES.md` §3, §5 y §6 (rama `docs/diseno-guerra-facciones`) más lo ya existente en `src/prototipo.html` (`PSPEC`). Las filas marcadas **(propuesta)** no están en el diseño: son mías para cubrir huecos y se pueden quitar. **Estado:** las tablas 2 a 7 están construidas en `src/objetos.js` (46 tipos de objeto, 13 recogibles y raíles); ver la sección 11. Los edificios completos (§8) y la lógica de inventario siguen pendientes.

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
Los 46 tipos se crean con el mismo sistema que las cajas y barriles (piezas reales, vida por material, huella 2D en `boxes`, marcas de bala, fases de daño y restos con física). Medido con `OBJ.measure()`:

| Tipo | Nombre | Material | Vida | Huella (m) | Alto | Piezas |
|---|---|---|---|---|---|---|
| `wall1` | Muro de bloques | block | 400 | 3.2×0.46 | 2.5 | 12 |
| `wall2` | Muro con contrafuertes | block | 650 | 3.2×0.96 | 2.5 | 20 |
| `wall3` | Muro reforzado | block | 1000 | 3.2×1.06 | 2.5 | 30 |
| `gate1` | Portón de acero | metal | 280 | 4.2×0.54 | 2.8 | 19 |
| `gate2` | Portón reforzado | metal | 450 | 4.2×0.54 | 2.8 | 23 |
| `gate3` | Portón reforzado (nivel 3) | metal | 700 | 4.2×0.54 | 2.8 | 23 |
| `gateInner` | Puerta interior del portón | metal | 350 | 3.2×0.54 | 2.5 | 22 |
| `door` | Puerta doble | wood | 90 | 2×0.26 | 2.34 | 21 |
| `slideGate` | Verja corredera | metal | 200 | 4.2×0.44 | 2.4 | 31 |
| `shutter` | Persiana | metal | 90 | 2.6×0.26 | 2.5 | 16 |
| `tower` | Puesto de vigilancia elevado | wood | 320 | 2.6×2.8 | 3.9 | 34 |
| `catwalk` | Pasarela elevada | metal | 260 | 4.4×1.3 | 3.45 | 31 |
| `stairs` | Escalera de servicio | metal | 220 | 3.36×1.1 | 3.3 | 24 |
| `bench` | Banco de hormigón | block | 150 | 1.9×0.46 | 0.93 | 4 |
| `planter` | Jardinera | block | 170 | 1.56×0.84 | 0.95 | 8 |
| `busStop` | Marquesina | metal | 110 | 3.4×1.5 | 2.65 | 14 |
| `kiosk` | Quiosco | wood | 200 | 2.7×2.9 | 2.4 | 13 |
| `wheelie` | Contenedor con ruedas | plastic | 60 | 0.62×0.7 | 1.08 | 7 |
| `dumpster` | Contenedor de basura | metal | 190 | 1.9×0.95 | 1.33 | 8 |
| `pallet` | Palé | wood | 30 | 1.2×1 | 0.18 | 11 |
| `palletBoxes` | Palé con cajas | wood | 70 | 1.2×1 | 1.1 | 20 |
| `cage` | Jaula metálica | metal | 110 | 1.2×0.8 | 1.7 | 36 |
| `counter` | Mostrador | wood | 130 | 2.48×0.75 | 1.35 | 6 |
| `shelf` | Estantería | metal | 90 | 2.2×0.55 | 1.9 | 38 |
| `locker` | Taquilla | metal | 80 | 1.56×0.5 | 1.91 | 14 |
| `pharmaCab` | Armario de farmacia | metal | 70 | 1.16×0.49 | 1.96 | 27 |
| `supplyMat` | Caja de materiales | wood | 40 | 0.8×0.55 | 0.55 | 7 |
| `supplyAmmo` | Caja de munición | wood | 45 | 0.8×0.55 | 0.55 | 7 |
| `supplyMed` | Caja médica | plastic | 40 | 0.8×0.55 | 0.55 | 7 |
| `car` | Coche abandonado | metal | 320 | 4.3×1.8 | 1.5 | 25 |
| `stall` | Puesto de mercado | wood | 100 | 2.9×1.9 | 2.3 | 15 |
| `glassPane` | Cristalera | glass | 22 | 2×0.16 | 2.2 | 10 |
| `shopFront` | Escaparate de tienda | block | 300 | 4.4×0.4 | 3 | 10 |
| `pharmFront` | Escaparate de farmacia | block | 300 | 4.4×0.4 | 3 | 12 |
| `floodlight` | Foco de patio | metal | 80 | 0.5×0.5 | 4.5 | 6 |
| `pump` | Surtidor de gasolinera | metal | 120 | 0.9×0.7 | 1.85 | 11 |
| `storeMat` | Módulo de almacén: materiales | metal | 160 | 1.96×0.7 | 2.08 | 40 |
| `storeAmmo` | Módulo de almacén: munición | metal | 160 | 1.96×0.7 | 2.08 | 34 |
| `storeMed` | Módulo de almacén: material médico | metal | 160 | 1.96×0.7 | 2.08 | 46 |
| `cot` | Camilla | metal | 80 | 0.9×2.04 | 0.8 | 15 |
| `board` | Tablón de expediciones | wood | 70 | 2.04×0.2 | 2.3 | 12 |
| `rack` | Expositor de armas (armería) | metal | 100 | 1.7×0.32 | 1.5 | 22 |
| `emblem0` | Emblema de facción Azul | block | 260 | 2.8×0.54 | 2.8 | 9 |
| `emblem1` | Emblema de facción Rojo | block | 260 | 2.8×0.54 | 2.8 | 9 |
| `emblem2` | Emblema de facción Ámbar | block | 260 | 2.8×0.54 | 2.8 | 9 |
| `emblem3` | Emblema de facción Violeta | block | 260 | 2.8×0.54 | 2.8 | 9 |

Novedades que aporta además de los modelos:
- **Material nuevo `glass`** (cristal: pen 0,85, rotura inmediata, esquirlas y grietas en las marcas de bala).
- **Accesos que se abren y cierran** (`OBJ.setOpen(p, on)` / `OBJ.toggle(p)`): `gate1-3`, `gateInner`, `door`, `slideGate` y `shutter`. Abiertos dejan como colisión solo lo que queda en pie (postes, hoja plegada). No se cierran con alguien en el paso. Se pueden romper abiertos.
- **Alarma de tienda** (`shopFront`, `pharmFront`): cada impacto rompe el cristal más cercano, salta la alarma 20 s (baliza roja, ruido de 55 m cada 2,2 s que atrae a los infectados).
- **Foco de patio**: su haz de luz desaparece al perder la lámpara. **Surtidor**: fuga de combustible (sin explosión).
- **Persiana y cristalera** hacen ruido (`noiseOnMove` 30 m / `noiseOnBreak` 40 m).
- **Recogibles** (`OBJ.pickup(clase, x, z)`): material, munición, botiquín, kit de reanimación, y casco, chaleco y mochila en 3 niveles. Solo son el modelo; recoger y guardar llega con el inventario.
- **Raíles** (`OBJ.rails(x, z, largo, giro)`), decoración sin colisión.
- **Galería de pruebas**: `index.html?galeria=1` coloca los 46 tipos en filas; `OBJ.gallery([tipos])` coloca los que se pidan.
- **Contenido**: `OBJ.contents(p)` devuelve la lista de lo que lleva (`loot`) cada caja o armario; sin lógica de inventario todavía.
- **Eventos** (`OBJ.on.push(f)`): `add`, `open`, `close`, `break`, `alarm`; para que la navegación dinámica de la entrega 2 invalide rutas.

Límites conocidos (a resolver en las entregas indicadas):
- El juego colisiona en 2D: pasarela, escalera, puesto elevado y cristaleras son sólidos o dejan ver como una caja. La altura transitable, ocupar el puesto y la visión real a través de aberturas son de la **entrega 2** (los modelos ya llevan `seats` y el ancho de los pasos).
- Las **aspilleras** a ras de suelo del diseño no se han hecho: necesitan huecos reales en la colisión (entrega 2).
- Rendimiento: cada pieza es una malla. Los 46 tipos suman 841 piezas (máximo 46 por objeto). Un distrito entero con cientos de objetos necesitará fusionar la geometría de lo intacto (entrega 6); medir en el iPhone antes.
- Los sonidos nuevos (`IMP_glass`, `ALARM_loop`, rotura de cada tipo) no existen todavía: callan hasta que el usuario los genere. Las roturas reutilizan los sonidos de caja, barrera y bloques.
- Edificios completos (tiendas, clínica, estación, viviendas, puentes), la colocación en el mapa y el uso por el mando/bots no están hechos.
