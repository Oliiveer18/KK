# Distrito completo v2 — ubicaciones exactas (generado por `tools/foto_distrito.py`; no editar a mano)

Coordenadas del mundo en metros: **x** hacia la derecha (este), **z** hacia abajo (sur); norte arriba; el centro del mapa es (0, 0) y el mapa va de −500 a +500. La foto `docs/img/distrito_v2.png` es un dibujo del propio juego (cámara ortográfica sobre los datos reales) con una retícula cada 100 m (línea gruesa cada 250 m): lo que ves ahí es lo que hay en el juego, en ese sitio. Los mismos datos están en `MAPA.data.M2` (`src/mapa_distrito.js`).

## Cruces de arterias (nodos exactos: en cada uno se unen dos calles)
| Nodo | x | z |
|---|---|---|
| N00 | -262 | -242 |
| N01 | -242 | 14 |
| N02 | -264 | 244 |
| N10 | 10 | -260 |
| N11 | 0 | 0 |
| N12 | 12 | 260 |
| N20 | 264 | -238 |
| N21 | 240 | -12 |
| N22 | 256 | 236 |

## Calles (nombre, ancho en metros, puntos de control: la calle pasa por todos y empieza/termina sobre otra calle o en el borde)
| Calle | Ancho | Puntos (x, z) |
|---|---|---|
| Arteria N-S oeste | 10 | (-256, -498) → (-262, -242) → (-266, -114) → (-242, 14) → (-241, 129) → (-264, 244) → (-263, 371) → (-242, 498) |
| Calle Central | 12 | (6, -498) → (10, -260) → (17, -130) → (0, 0) → (-4, 130) → (12, 260) → (26, 379) → (8, 498) |
| Arteria N-S este | 10 | (244, -498) → (264, -238) → (242, -125) → (240, -12) → (264, 112) → (256, 236) → (243, 367) → (258, 498) |
| Arteria E-O norte | 10 | (-498, -244) → (-262, -242) → (-126, -239) → (10, -260) → (137, -259) → (264, -238) → (381, -231) → (498, -256) |
| Avenida Mayor | 12 | (-498, 6) → (-242, 14) → (-121, -3) → (0, 0) → (120, 10) → (240, -12) → (369, -23) → (498, -6) |
| Arteria E-O sur | 10 | (-498, 256) → (-264, 244) → (-126, 268) → (12, 260) → (134, 234) → (256, 236) → (377, 252) → (498, 244) |
| Acceso Azul | 7 | (-498, -330) → (-419, -327) → (-341, -333) → (-260, -330) |
| Barrio Colina | 7 | (-420, -498) → (-419, -414) → (-421, -330) → (-420, -243) |
| Acceso Rojo | 7 | (259, -330) → (338, -333) → (417, -327) → (498, -330) |
| Barrio Fábrica | 7 | (420, -498) → (422, -412) → (418, -326) → (420, -237) |
| Acceso Ámbar | 7 | (-498, 330) → (-421, 332) → (-345, 328) → (-266, 330) |
| Barrio Colegio | 7 | (-420, 251) → (-421, 332) → (-419, 414) → (-420, 498) |
| Acceso Violeta | 7 | (245, 330) → (328, 332) → (412, 328) → (498, 330) |
| Barrio Granjas | 7 | (420, 251) → (420, 332) → (420, 414) → (420, 498) |
| Calle Residencial O | 7 | (-498, -125) → (-422, -122) → (-345, -128) → (-267, -125) |
| Calle Residencial O (N-S) | 7 | (-375, -243) → (-376, -159) → (-374, -75) → (-375, 11) |
| Calle del Casco 1 | 7 | (-265, -190) → (-172, -190) → (-80, -190) → (15, -190) |
| Calle del Casco 2 | 7 | (-259, -70) → (-170, -70) → (-81, -70) → (10, -70) |
| Calle del Casco 3 | 7 | (-190, -239) → (-193, -157) → (-187, -75) → (-190, 9) |
| Calle del Casco 4 | 7 | (-60, -249) → (-61, -168) → (-59, -87) → (-60, -3) |
| Calle Comercial | 7 | (17, -140) → (92, -139) → (167, -141) → (245, -140) |
| Calle del Mercado | 7 | (125, -260) → (127, -171) → (123, -82) → (125, 10) |
| Calle del Casco Sur | 7 | (-239, 85) → (-161, 81) → (-84, 89) → (-5, 85) |
| Calle de la Iglesia | 7 | (-125, -3) → (-128, 87) → (-122, 176) → (-125, 268) |
| Calle de la Estación | 7 | (-5, 85) → (83, 81) → (170, 89) → (260, 85) |
| Calle de la Vía | 7 | (125, 10) → (127, 84) → (123, 158) → (125, 235) |
| Calle Residencial E | 7 | (260, 85) → (339, 86) → (417, 84) → (498, 85) |
| Calle Residencial E (N-S) | 7 | (400, -21) → (401, 69) → (399, 159) → (400, 252) |
| Calle Industrial | 7 | (22, 330) → (96, 333) → (169, 327) → (245, 330) |
| Calle de las Naves | 7 | (125, 235) → (128, 322) → (122, 409) → (125, 498) |

**Vía férrea:** (-500, 194) → (-250, 188) → (0, 182) → (250, 188) → (500, 196)

## Lugares y objetivos
| Marca | Lugar | x | z |
|---|---|---|---|
| REF-Azul | Refugio Azul | -390 | -362 |
| REF-Rojo | Refugio Rojo | 390 | -362 |
| REF-Ámbar | Refugio Ámbar | -390 | 362 |
| REF-Violeta | Refugio Violeta | 390 | 362 |
| PLAZA | Plaza Mayor (campamento) | 38 | -40 |
| CLI | Clínica | -130 | -83 |
| FAR | Farmacia | -145 | -15 |
| MIN | Tienda | -79 | -18 |
| SUP | Supermercado | 146 | -12 |
| MER | Mercado | 146 | -154 |
| GAS | Gasolinera | 203 | 11 |
| GASM | Marquesina | 218 | 9 |
| EST | Estación | 60 | 150 |
| NAV | Nave | 60 | 306 |
| NAV | Nave | 150 | 306 |
| NAV | Nave | 90 | 354 |
| SUB | Subestación | 330 | 40 |
| PAT | Patio de carga | 205 | 392 |
| REC | Fábrica: recinto de piedra | 154 | -281 |
| REC | Depósito: recinto de hierro | -145 | 235 |
| REC | Granja: recinto de madera | -349 | -106 |
| OBJ | Plaza Mayor | 62 | -40 |
| OBJ | Clínica | -130 | -105 |
| OBJ | Supermercado | 140 | -30 |
| OBJ | Gasolinera | 200 | 25 |
| OBJ | Estación | 60 | 175 |
| OBJ | Naves | 119 | 341 |
| OBJ | Calle de la Iglesia | -116 | 125 |
| OBJ | Colegio | -330 | 320 |

## Retenes (R en la foto): chicane de vehículos con sacos en la acera, sin muros en la calzada
(-70, -3), (69, 8), (10, -69), (-4, 69), (-300, -332), (300, -332), (-300, 329), (300, 332), (-263, -212), (262, -208), (-260, 215), (259, 207)

## Nidos de zombis (N en la foto)
(-190, 120), (180, 150), (-69, -182), (190, -190), (-247, -60), (253, 106), (60, 260), (-100, 300)

## Bosques y parque (rectángulos con árboles; los árboles esquivan calles, vía, edificios y refugios)
| Zona | x de … a | z de … a |
|---|---|---|
| Bosque norte | -232 … -18 | -498 … -262 |
| Bosque este | 262 … 498 | -232 … -18 |
| Bosque oeste | -498 … -262 | 22 … 232 |
| Parque y campo sur | -232 … -20 | 280 … 498 |
| Arboleda noreste | 30 … 238 | -498 … -280 |

Árboles: 750.

## Edificios (76)
| Tipo | x | z |
|---|---|---|
| clinic | -130 | -83 |
| gascanopy | 218 | 9 |
| gasshop | 203 | 11 |
| house | -485 | -317 |
| house | -483 | -341 |
| house | -483 | 319 |
| house | -468 | -316 |
| house | -451 | -315 |
| house | -450 | 344 |
| house | -433 | -297 |
| house | -432 | -484 |
| house | -432 | -366 |
| house | -431 | -450 |
| house | -409 | 282 |
| house | -407 | -399 |
| house | -407 | 469 |
| house | -400 | -136 |
| house | -362 | -76 |
| house | -331 | 340 |
| house | -297 | -139 |
| house | -281 | -319 |
| house | -281 | -114 |
| house | -280 | 317 |
| house | -208 | 71 |
| house | -202 | -5 |
| house | -201 | -105 |
| house | -201 | -22 |
| house | -199 | -56 |
| house | -160 | -82 |
| house | -143 | -58 |
| house | -141 | 95 |
| house | -140 | 62 |
| house | -139 | 114 |
| house | -126 | -58 |
| house | -110 | 215 |
| house | -109 | -82 |
| house | -98 | -202 |
| house | -92 | -82 |
| house | -75 | -58 |
| house | -73 | -218 |
| house | -73 | -167 |
| house | -73 | -150 |
| house | -72 | 77 |
| house | -71 | -82 |
| house | -47 | -202 |
| house | -47 | -99 |
| house | -30 | -202 |
| house | -13 | -178 |
| house | 273 | -342 |
| house | 275 | 73 |
| house | 291 | -319 |
| house | 292 | 73 |
| house | 307 | -344 |
| house | 310 | 344 |
| house | 374 | -318 |
| house | 387 | 163 |
| house | 410 | -450 |
| house | 412 | 27 |
| house | 412 | 231 |
| house | 432 | 282 |
| house | 433 | -467 |
| house | 443 | -316 |
| house | 445 | 72 |
| house | 462 | 73 |
| house | 463 | 317 |
| house | 476 | -341 |
| house | 478 | 97 |
| market | 146 | -154 |
| mini | -79 | -18 |
| pharm | -145 | -15 |
| station | 60 | 150 |
| substation | 330 | 40 |
| super | 146 | -12 |
| warehouse | 60 | 306 |
| warehouse | 90 | 354 |
| warehouse | 150 | 306 |

## Objetos colocados (por tipo)
bwallSolid 765, bwallGlass 274, car 185, fence 139, sandbags 90, door 70, tvUnit 64, sofa 64, kitchenUnit 64, table 64, bed 64, wardrobe 64, chainFence 60, barrel 58, barrier 55, floodlight 44, crateS 39, dumpster 33, palletRack 30, pallet 28, planter 27, crate 25, cart 23, wall3 21, cot 20, wheelie 20, wall2 19, wall1 18, palletBoxes 17, fridge 15, bench 14, barrelFuel 14, pillar 13, cage 13, blocks 13, stall 9, gate1 9, shopDoor 8, rack 8, busStop 8, pharmaCab 7, forklift 7, counter 6, supplyMat 6, rollDoor 6, waitSeat 5, supplyMed 5, shelf 5, gondola3 5, supplyAmmo 5, board 5, tower1 5, checkout 4, gondola4 4, pump 4, storeMat 4, storeAmmo 4, storeMed 4, gateInner 4, shutter 4, glassPane 4, slideGate 3, switchCab 3, tower2 3, locker 2, transformer 2, kiosk 2, stairs 2, emblem0 1, emblem1 1, emblem2 1, emblem3 1, catwalk 1, gate2 1, gate3 1, tower3 1

## Puntos de aparición de cada refugio (primero de 6)
Azul (-400, -349), Rojo (380, -349), Ámbar (-400, 349), Violeta (380, 349)
