# Catálogo de objetos y ubicaciones de la campaña

Fuente: `GUERRA_DE_FACCIONES.md` §3, §5 y §6 (rama `docs/diseno-guerra-facciones`) más lo ya existente en `src/prototipo.html` (`PSPEC`). Las filas marcadas **(propuesta)** no están en el diseño: son mías para cubrir huecos y se pueden quitar. Todo sin implementar salvo la tabla 1.

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
