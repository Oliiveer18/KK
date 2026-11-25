# Plan del mapa de la campaña (propuesta para confirmar; 25-11-2026)

Cubre la Entrega 6 del plan («distrito completo», ~1 km²) y lo que hay que construir antes. Nada de esto está implementado todavía. Las duraciones son **estimaciones de trabajo**, no promesas: dependen de cuántas sesiones haya, de las pruebas en iPhone con DualSense entre tandas y de que la otra sesión (objetos) y ChatGPT (diseño) integren a tiempo.

## 1. Cómo se hará
- **El mapa como datos.** Un archivo (`src/mapa_distrito.js`) describe sectores de 250×250 m: suelos, calles, aceras/paseos, raíles, edificios (huella, puertas, plantas), plazas, aparcamientos, refugios y objetos (por tipo de `objetos.js`). Un generador (`src/mapa.js`) lo convierte en la escena. Ajustar un sector = cambiar datos.
- **Suelos y vías** en pocas mallas combinadas por material (asfalto con marcas viales, acera/paseo, hierba, hormigón, adoquín, balasto con traviesas, tierra): casi no cuestan llamadas de dibujo.
- **Edificios con techo y paredes transparentes** (decisión del usuario, confirmada): cada edificio tiene techo; si entra el jugador (o un aliado que controla) el techo se desvanece. Las paredes que quedan entre la cámara y su personaje se vuelven transparentes y las demás siguen opacas. Solo hay materiales transparentes en los edificios cercanos.
- **Carga y simulación por sectores:** solo se dibujan y simulan en detalle los sectores cercanos; los lejanos se simplifican (bots y zombis como grupos con posición y recuento; el estado se conserva). La navegación (A*) se construye por sector.
- **Reutiliza** lo ya hecho: cámara, balística, objetos, bots, zombis, abatido y reanimación, mapa 4 como referencia de regresión (no se toca).

## 2. Lugares (disposición propuesta, 1000×1000 m; norte arriba)
```
 x:  -500                    0                    +500
 +500 ┌──────────────────────────────────────────────┐
      │ [AZUL]        naves/industria       [ROJO]   │  Refugios en las 4 esquinas
      │  refugio     (patio de carga)       refugio  │  (≈ 120 m del borde)
      │  tienda          ║                  tienda   │
      │  viviendas       ║ Calle Central    viviendas│  Avenida Mayor (E-O) y Calle
      │                  ║                           │  Central (N-S) se cruzan en la
 +0   │════ Av. Mayor ═══╬═══ PLAZA + MERCADO ══════│  plaza central: nodo disputado.
      │  supermercado    ║  clínica        gasolinera│
      │  farmacia        ║                           │
      │  viviendas       ║   estación + depósito     │  Raíles E-O con puentes a ±200 m;
      │ ═══════════ raíles en desuso ═══════════════ │  la estación es el segundo frente.
      │ [ÁMBAR]          ║                  [VIOLETA]│
 -500 └──────────────────────────────────────────────┘
```
- **Refugios (×4):** esquinas; patio de salida con armería, almacén y enfermería; acceso de carga, paso peatonal y salida lateral estrecha.
- **Primera decisión a 30–60 s de la base** (150–350 m a pie): cada refugio tiene tienda y viviendas a ~150–250 m, y la plaza/mercado y la gasolinera a ~300–400 m.
- **Dos frentes simultáneos:** la plaza central (comercio y mercado) y el corredor de la estación/raíles; las naves industriales son un tercer nodo con patio de carga.
- **Rutas:** avenida visible (rápida, expuesta), calles secundarias entre viviendas (cobertura), patio de carga y salida lateral estrecha, puentes sobre los raíles (cuellos de botella), caminos rurales por los bordes (retirada).
- **Capturables:** los 4 refugios, la clínica y la estación con el depósito. Libres: tiendas, supermercado, farmacia, gasolinera, mercado, viviendas, plazas, aparcamientos, naves.

## 3. Cuándo (en tandas de trabajo; 1 tanda ≈ 1 sesión)
| Hito | Qué se podrá probar | Tandas | Depende de |
|---|---|---|---|
| M1 · Motor del mapa (**hecho en la rama `claude/mapa-m1`**) | Generador por datos, suelos, calles con marcas, aceras, raíles, techo y paredes transparentes, un sector de 250×250 con 3 edificios; tests y capturas | 1–2 | — |
| M2 · Cuatro sectores (500×500) | Navegación y carga por sectores, zombis y horda por sectores, tienda y gasolinera con interior, entrada «Campaña · distrito» en el menú | 2 | M1 |
| Entrega 2 · Refugio de referencia | Un refugio con piezas definitivas, defendible desde dentro, brechas y rutas recalculadas; se replica en los 4 | 2–3 | M1 y los objetos de la otra sesión |
| M3 · Distrito completo | Los 16 sectores con todos los lugares de la tabla, población de zombis y horda, 4 refugios | 3–4 | M2 y Entrega 2 |
| Rendimiento en iPhone | Medición real (fotogramas, tirones) y ajustes sin bajar calidad | 1–2 | M3 y tu prueba en el dispositivo |
| Entregas 3 a 5 | Inventario y equipo, reparar y mejorar, conquista e infestación | ~3 cada una | Entrega 2 |

**Total orientativo hasta el distrito completo y jugable (M1–M3 + rendimiento): ~9–13 tandas.** Con una tanda al día serían unas 2–3 semanas; si hay tandas más cortas o pruebas intermedias, más. Las Entregas 3–5 añadirían otras ~9 tandas. La Entrega 7 (región 4×4 km y online) no se puede estimar hasta validar el distrito.

## 4. Decisiones ya tomadas / pendientes
- Hecho: techos y paredes transparentes (como los juegos profesionales); mapa estratégico y grande; refugios por esquinas (propuesta).
- Pendiente de confirmar: la disposición de §2 (¿refugios en las esquinas?), los nombres de las calles, y si la clínica y la estación van como en el dibujo.

## 5. Población: 25 combatientes por facción (decisión del usuario, 25-11)
**25 por facción = 100 combatientes en total** (1 jugador + 99 bots; el jugador cuenta dentro de Azul), más los zombis aparte. Encaja con el plan (meta de 64 y escalado 32 → 64 → 128). **Decisión del usuario (25-11): 5 grupos de 5 por facción desde ya** (no 3 compañías). Implementado como escuadras en la campaña (ver `ESTADO.md`); la guardia del refugio y los destinos por compañía llegan con las entregas 2 y 5.

Medición hecha el mismo día en el mapa 4 actual con `?mapa=4&bots=N` (parámetro nuevo, por defecto 4; solo para pruebas de escala; Chrome headless, no iPhone). Peor caso: todos los combatientes a la vez en pantalla:

| Combatientes | Lógica por actualización | Llamadas de dibujo | Triángulos |
|---|---|---|---|
| 16 (4 por facción) | 2,0 ms | 514 | 54 k |
| 32 (8) | 2,1 ms | 1.000 | 83 k |
| 64 (16) | 3,9 ms | 1.429 | 107 k |
| 100 (25) | 3,9 ms | 2.210 | 157 k |

Lectura: la **lógica** (IA, navegación) aguanta 100; el límite es el **dibujo**: cada combatiente cuesta ~22 llamadas, y 2.210 en pantalla son demasiadas para un iPhone. En una partida real nunca se ven los 100 a la vez (la cámara abarca ~40 × 25 m de un kilómetro), pero hay que garantizarlo con: (1) solo se dibujan y animan los combatientes de los sectores cercanos a la cámara; (2) versión simplificada del personaje (pocas mallas) a media distancia; (3) simulación abstracta (grupos con posición, recuento y destino) en los sectores lejanos; (4) límite de combatientes en detalle completo a la vez (~30) y ruido/IA reducidos fuera de la vista. Esto entra en M2 y en la medición en iPhone.

## 6. Propuesta de trazado natural y apocalíptico (26-11, boceto v2; sustituye la cruz de §2 si el usuario la aprueba)
Imagen: `docs/img/mapa_propuesta_1km.png` (generada con `tools/boceto_mapa.py`; boceto 2D, no el mapa del juego). Decisiones del usuario: sensación de suspense y apocalipsis; **sin río** (haría el mapa inusable).
- Sin rejilla global: avenidas curvas; cada barrio con su propia orientación de calles (casco antiguo ~24°, residenciales ~−30°, industria ~−10°); manzanas y edificios de tamaños variados.
- Jerarquía vial: Avenida Mayor y Calle Central (línea central) se unen en una plaza triangular; carreteras a cada refugio; calles locales irregulares; ferrocarril curvo con estación y naves (cruces a nivel, sin puentes).
- Ambientación: atascos congelados de coches abandonados en las arterias, barricadas y cortes (cuellos de botella y rutas obligadas), zonas quemadas e incendios con columnas de humo, cráter, helicóptero caído, puesto militar abandonado, valla de cuarentena, supermercado saqueado, gasolinera incendiada, iglesia con el campanario caído, plaza convertida en campamento, vegetación invadiendo el asfalto, niebla y paleta apagada (luz fría y sucia, acentos naranja de fuego).
- Refugios fuera de las esquinas exactas: colina residencial (azul), fábrica abandonada (rojo), colegio y viviendas (ámbar), granjas y silos (violeta).
Pendiente de aprobar. Implementarlo exige que `mapa.js` admita calles curvas (polilíneas/splines), niebla/atmósfera y objetos de ambientación (coches, barricadas, restos); es parte de M2.

### Diseño táctico y estratégico (26-11; el mapa se diseña para el juego, no sólo para verse bien)
Todo lo del boceto son objetos interactivos reales de `objetos.js` (muros y portones `wall1-3`/`gate1-3`, torres `tower1-3`, coches y cajas empujables, ventanas rompibles con alarma, edificios recorribles) y se coloca con `placeObject`.
- **Cuatro facciones, tres relaciones:** cada refugio tiene dos vecinos (esquinas contiguas) y un rival en diagonal; los frentes se cruzan en el centro (plaza + clínica, objetivo 1) y en los corredores (supermercado 3, gasolinera 4, estación 5, naves 6).
- **Tres tipos de eje por refugio hacia el centro:** cubierto (calles y edificios, ritmo medio), rápido y expuesto (la avenida: línea de tiro larga de ~250 m, con coches empujables como cobertura móvil) y flanco (bosque y campo: lento, silencioso, pero con nidos de zombis).
- **Visión limitada:** como los bots (y tú) sólo veis lo de la pantalla (~±10–13 m), las calles locales no pasan de ~60–80 m rectos y hay esquinas, patios y edificios cada pocas decenas de metros: los combates son de 20–50 m. Sólo la avenida es larga a propósito.
- **Cuellos de botella reales:** cada eje cubierto pasa por un corte (muro + portón) que se refuerza (madera → piedra → hierro), se abre, se cierra o se revienta; el bando que lo tiene decide quién pasa. Las barricadas ✕ cierran calles laterales y obligan a rodear.
- **Puntos fuertes:** torres ocupables en cruces y junto a cada refugio (vigía y fuego sobre la calle); cada refugio se defiende con un cuello de unos 120 m.
- **Riesgo y recompensa:** los edificios con más botín (supermercado, farmacia, clínica, gasolinera) tienen escaparates con alarma: entrar rompiendo hace ruido y atrae a los zombis; hacerlo en silencio por la puerta es más lento.
- **Zombis como tercer actor:** nidos dormidos repartidos entre los ejes y una horda itinerante que recorre la Calle Central de norte a sur; el ruido de combate la desvía hacia donde se pelea.
- **Mapa por capas de lectura:** zonas de partida (~165 m), tierra de nadie, objetivos numerados, rutas de flanqueo. Los sectores lejanos se simplifican (M2) sin perder esto.
Imagen: `docs/img/mapa_propuesta_1km.png` (con la leyenda táctica).

## 7. Lo que queda para terminar el mapa de 1 km² (26-11, estado real)
Hecho: motor de mapa por datos, calles curvas, composiciones, `MAPA.put`/`MAPA.fp` (los 76 tipos), objetos y edificios (otra sesión), navegación reactiva a `OBJ.on`, zombis con rodeo de obstáculos, precalentado de shaders, boceto aprobado (v3). Mapa 5 sigue siendo M1 (250×250, rejilla recta, 31/76 tipos).
**A. Montar el distrito (M2→M3)**
1. ✅ (26-11, `?mapa=6`) Datos del trazado del boceto (calles curvas, manzanas, plaza, vía) en 1 km². Faltan parque con lago, bosques y campos como superficies.
2. ✅ Composiciones colocadas: atascos, 12 cortes, 8 puestos de control, 8 torres, mobiliario, restos, 8 objetivos y 8 nidos (76/76 tipos).
3. ✅ Edificios: los 11 tipos colocados con aparcamiento y entorno; 56 casas (más casas exigen B9).
4. Recogibles (13 tipos) repartidos por nivel.
5. Ambientación apocalíptica: niebla y luz, coches quemados, humo e incendios, cráter, helicóptero, puesto militar, valla de cuarentena (objetos nuevos o composiciones).
6. `tests/mapa_cobertura.py --estricto` en verde (76 tipos, 11 edificios, 13 recogibles) + test de jugabilidad: sin solapes, pasillos ≥ 2 m, objetivos alcanzables desde los 4 refugios, cortes rodeables o forzables, bots sin atascos.
**B. Motor (M2)**
7. Carga y simulación por sectores y LOD: sólo los sectores cercanos en detalle; bots y zombis lejanos como grupos (posición y recuento) que se reanudan al acercarse.
8. Navegación por sector (A* por sectores o jerárquico; hoy una malla de 258×258 para 250 m, para 1 km² haría falta jerarquía).
9. Fusión de geometría estática (hoy ~7.900 mallas; 16 sectores se disparan) y descongelado al dañar.
10. Minimapa / mapa estratégico (ver todo el distrito, objetivos, frentes).
11. Población: 100 combatientes y zombis repartidos por sectores; reaparición y hordas por sector.
**C. Entrega 2 (refugio y combate táctico)**
12. Refugio definitivo ×4 (patio, paso interior, brechas, armería, almacén, enfermería, tablón).
13. Visión de los bots a través de cristales; altura transitable; torres ocupables; aspilleras a ras de suelo.
**D. Rendimiento**
14. Medir en iPhone (FPS por zona, llamadas de dibujo) y ajustar sin bajar calidad.
**E. Lo que decide o prueba el usuario**
15. Probar `?mapa=5` y las composiciones en iPhone; aprobar sonidos (cristal, alarma, rotura, zombis); decidir los nombres de calles y lugares.
**F. Fuera del mapa pero lo hace jugable como campaña (entregas 3–5)**
16. Inventario y equipo; reparar y mejorar (muro → portón → torre por niveles); conquista e infestación de refugios; guardia y destinos por grupo.
