# Colocación de objetos en el distrito (plan; 26-11-2026)

Regla del usuario: **todos los objetos creados se usan en el mapa, ninguno se olvida** — los 8 de siempre (cajas, vallas de madera, barreras de plástico, barriles, sacos, bloques), los 68 de `objetos.js`, los 11 edificios y los 13 recogibles. Hoy el distrito M1 usa **31 de 76 tipos** y 3 de 11 edificios; los 8 originales no aparecen todavía. Boceto de referencia: `docs/img/mapa_propuesta_1km.png` (+ `PLAN_DEL_MAPA.md` §6).

## Cómo se garantiza que no falta ninguno
1. Cada sector se describe en datos con **composiciones** (atasco, barricada con portón, puesto de control, cruce con torre, fachada con aparcamiento, patio de carga, campamento…) hechas de estos objetos.
2. `tests/mapa_cobertura.py` (por escribir): recorre `OBJ.types` + los 8 originales + `OBJ.buildingKinds` + `OBJ.pickupKinds` y **falla si alguno no aparece al menos una vez** en el distrito (o en el refugio, para los exclusivos de refugio). Hoy daría 45 tipos sin usar.
3. Además comprueba: sin solapes, pasillos libres ≥ 2 m, objetivos alcanzables desde los 4 refugios, cortes rodeables o forzables, bots sin atascos.

## Dónde va cada cosa (zona → objetos; densidad orientativa por 250×250 m)
| Zona / función | Objetos | Para qué (táctica) |
|---|---|---|
| **Calles y avenida** (atascos congelados) | `car` (muchos, algunos empujables), `dumpster`, `wheelie`, `barrier` (barrera de plástico), `blocks`, `sandbags`, `barrel`, `barrelFuel` | Cobertura móvil y alta en la línea de tiro larga; barriles explosivos como trampa; bloques y sacos para cortes improvisados |
| **Cortes y barricadas** (✕ del boceto) | `wall1-3`, `gate1-3`, `gateInner`, `fence` (valla de madera), `sandbags`, `blocks`, `barrier`, `pallet`, `crate`, `crateS` | Cuellos de botella que se refuerzan (madera → piedra → hierro), abren, cierran o revientan |
| **Puntos fuertes** | `tower1-3`, `catwalk`, `stairs`, `floodlight`, `sandbags`, `slideGate` | Vigía y fuego sobre la calle; el foco se rompe para esconderse |
| **Mobiliario urbano** (plaza, paradas, parque) | `bench`, `planter`, `busStop`, `kiosk`, `stall` (puesto de mercado), `cart`, `wheelie`, `dumpster`, `glassPane` | Coberturas bajas y medias, entrar al quiosco, mercado de la plaza |
| **Supermercado** | edificio `super`; `gondola3`, `gondola4`, `fridge`, `checkout`, `cart`, `counter`, `shelf`, `shutter`, `shopDoor`, `bwallGlass`, `supplyMat`, `supplyAmmo`, `supplyMed`, `pallet`, `palletBoxes`, `cage` | Botín y cobertura interior; escaparates con alarma |
| **Farmacia, tienda, clínica** | edificios `pharm`, `mini`, `clinic`; `pharmaCab`, `counter`, `shelf`, `cot`, `locker`, `waitSeat`, `supplyMed`, `medkit`, `revive` | Material médico; la clínica es objetivo capturable |
| **Gasolinera** | `gasshop` + `gascanopy`, `pump`, `barrelFuel`, `car`, `shutter`, `floodlight` | Explosiones en cadena, fuego, ruido |
| **Estación y vía** | edificio `station`, `waitSeat`, `bench`, `locker`, `kiosk`, `busStop`, raíles (`OBJ.rails`), `pillar`, `catwalk`, `stairs`, `chainFence` | Segundo frente; pasos elevados y vallas |
| **Naves y patio de carga** | edificio `warehouse`; `palletRack`, `forklift`, `pallet`, `palletBoxes`, `cage`, `rollDoor`, `crate`, `crateS`, `dumpster`, `chainFence`, `floodlight` | Almacén de todos; patio para emboscar |
| **Subestación** | edificio `substation`; `transformer`, `switchCab`, `chainFence` | Tercer nodo industrial; apagón posible |
| **Casas y viviendas** | edificio `house`; `sofa`, `bed`, `table`, `wardrobe`, `kitchenUnit`, `tvUnit`, `door`, `planter`, `fence`, `bench` | Cobertura interior, pasillos estrechos, botín doméstico |
| **Mercado** | edificio `market`; `stall`, `counter`, `fridge`, `cart`, `crate`, `crateS`, `pallet` | Campamento de la plaza; cobertura media |
| **Refugios (×4)** | `wall1-3`, `gate1-3`, `gateInner`, `slideGate`, `tower1-3`, `catwalk`, `stairs`, `floodlight`, `storeMat`, `storeAmmo`, `storeMed`, `cot`, `board`, `rack` (armería), `emblem0-3`, `sandbags`, `crate`, `crateS`, `barrel` | Patio, armería, almacén, enfermería, tablón, vigilancia |
| **Industria y fábrica abandonada** (rojo) | `crate`, `crateS`, `barrel`, `barrelFuel`, `pallet`, `palletBoxes`, `forklift`, `rollDoor`, `chainFence`, `pillar`, `transformer` | Mucha cobertura baja y trampas explosivas |
| **Granjas y silos** (violeta) | `fence` (valla de madera), `crate`, `crateS`, `barrel`, `pallet`, `car`, `forklift`, `slideGate` | Campo abierto con vallas que se rompen |
| **Bosque y flancos** | `fence`, `blocks`, `crateS`, `barrier` | Restos y cortes sueltos en los senderos |
| **Recogibles** (13) | `material`, `ammo`, `medkit`, `revive`, `helmet1-3`, `vest1-3`, `pack1-3` | Nivel 1 en zonas de partida y viviendas, nivel 2 en comercios, nivel 3 en nidos y objetivos 1, 3 y 5 |

Todos los tipos de las tablas de `CATALOGO_OBJETOS.md` (§1–§6, §14) quedan cubiertos por alguna fila (comprobado a mano contra `OBJ.types`: Accesos y defensa 14, Sonido y visibilidad 4, Mobiliario urbano 6, Comercio y transporte 18, Refugio 10, Edificios 8, Hogar 6, Almacén 2, + los 8 originales). El test automático de arriba lo hará cumplir.

## Qué falta construir para colocarlos
Calles curvas en `mapa.js` · composiciones reutilizables · el test de cobertura y de jugabilidad · fusionar la geometría estática (7.900 mallas hoy) y cargar por sectores (M2) · refugio definitivo, torres ocupables, visión a través de cristales (entrega 2).
