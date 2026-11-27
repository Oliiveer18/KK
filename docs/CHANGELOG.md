# Changelog

## Coherencia de la percepción y tiroteo contra infectados (27-11)
- **Nadie sabe lo que no puede ver** (mismo campo de visión que el jugador, ~13–20 m): un bot solo nota que lo apuntas si puede verte (campo de visión, línea libre, sin humo ni agachado tras cobertura); el oído se reduce a un fusil 38 m, subfusil 28, escopeta 32, ametralladora 48, precisión 60, y tras muros a partir del 65 % del alcance no llega, con 18 % de error; el aviso por radio de la escuadra se limita a 60 m y llega con 0,7 s de retraso; el contacto de escuadra solo orienta la mirada a < 70 m.
- **Las órdenes valen para lo que se ve**: «Fuego de cobertura» y «Atacar» solo eligen enemigos a la vista del jugador o de algún miembro de la escuadra (antes, cualquiera a ≤ 50/60 m aunque estuviera fuera de pantalla). El mando de la facción solo cuenta enemigos que su facción haya visto en los últimos 25 s o que estén junto a un amigo.
- **Infectados cerca = fuego continuo**: reacción de reflejo (≤ 0,1 s a < 8 m, antes ~1 s), sin ráfagas ni pausas (cadencia máxima del arma), sin reiniciar la reacción al cambiar de un infectado al siguiente, y retroceden disparando si hay uno a < 3,4 m en vez de ir a por él. Contra otra facción siguen las ráfagas, pausas y coberturas. `tests/zombis_tiroteo.py`: fusil, subfusil, escopeta y ametralladora abaten 3 infectados a 3–5 m en 0,6–1,9 s, empezando a disparar a los 0,2–0,45 s.

## Bots conscientes de la situación (27-11)
- **Amenaza conocida** (`e.aw`): de dónde cree el bot que viene el peligro (contacto perdido, impacto, sonido, aviso de su escuadra o alguien que le apunta). Mira hacia ella con un barrido corto en vez de a «su sector» al azar, y si camina lo hace con pasos cautos.
- **Oído**: oyen disparos de otras facciones (subfusil 40 m, fusil 55, escopeta 50, ametralladora 70, lanzagranadas 80, precisión 85) con una incertidumbre del 12 % de la distancia. Nunca disparan a ciegas.
- **Notan que los apuntan**: si el jugador apunta a un bot (< 45 m, línea libre, error < ~6°) tras ~0,35 s se agacha, se gira hacia él y busca cobertura.
- **Riesgo**: no salen de la cobertura antes de tiempo si hay 2+ enemigos a la vista a < 30 m, y con 3+ y poca vida se repliegan. Al perder de vista al enemigo recuerdan su última posición 7 s.
- Test: `tests/conciencia.py`.

## Remate de abatidos (27-11)
- Un enemigo abatido (esperando reanimación) se puede rematar: las balas del jugador y de cualquier rival lo alcanzan (40 de vida extra) y los bots lo tienen como objetivo, pero **después** de los enemigos en pie. El kill feed marca «· remate». `tests/remate.py`.

## Escuadras por tipo y mando con maniobras (27-11)
- **12 escuadras por facción, 6 tipos** (50 soldados, mismos tamaños en las 4 facciones): asalto 5 (2 asalto, fusilero, médico, flanqueador), línea 5 (3 fusileros, médico, apoyo), apoyo 4 (2 apoyo, francotirador, médico), flanco 3 (2 flanqueadores, francotirador), reserva 4 (2 fusileros, asalto, médico) y guarnición 3. Cada partida varía al azar, a igual tamaño, línea↔asalto, reserva↔apoyo y flanco↔guarnición. Tu escuadra es una línea.
- **Rasgos suaves por facción** (±15 % al azar por partida, no una personalidad): agresividad (aumenta si va por detrás), atracción por el centro y rivalidad con la facción que va primera. Además, recuperar un punto perdido pesa más durante 2 minutos.
- **Maniobras**: un asalto recluta, si están libres, un apoyo (fija al enemigo desde 36–62 m) y un flanco. 70 % pinza (el flanco rodea 40 m por un lado, espera a que su pareja esté a < 60 m del punto o 35 s, y entra); 30 % finta (el flanco ataca de frente y el asalto rodea). Un flanco sin pareja embosca en la ruta del rival o ataca por el flanco.
- **Defensa**: la reserva recupera puntos perdidos (120 s), refuerza los amenazados o toma el mejor punto; la guarnición defiende el refugio si hay enemigos a < 150 m y si no, el puesto avanzado propio; en una línea, los de largo alcance se colocan hacia donde viene la amenaza (último contacto o centro).
- **Medido** (5 min de partida simulada): 9 apoyos «fix», 9 flancos, 1 finta, 1 emboscada, 3 recuperaciones y 5 refuerzos; marcador final equilibrado (181/208/224/180); p95 de lógica 8,1 ms; primer contacto entre facciones a los ~116 s.

## Cruceta táctica y vista previa de la formación (27-11)
- **Cruceta (toque / mantener)**: ▲ Avanzar / Capturar el punto no propio más cercano · ▼ Mantener / Replegarse al refugio · ◀ Seguirme / Cambiar formación (auto → cuña → línea → columna → círculo) · ▶ Fuego de cobertura / Atacar (todos se acercan al enemigo más cercano a ≤ 60 m, cada uno por un lado, con línea de tiro; 16 s).
- **Gestión de escuadra** (unirse, por libre, tomar/ceder el mando, reagrupar) pasa a Mochila → Escuadra (y siguen las teclas 5–8).
- **Vista previa de la formación**: al cambiarla, ~3 s de tarjeta con el croquis visto desde arriba (tú al centro, cada compañero con la inicial y el color de su clase) y marcas fantasma en el suelo pegadas a ti.

## Mapas con toda tu facción y zombis con marcha anclada al suelo (27-11)
- **Aliados en el minimapa y el mapa táctico**: tu escuadra siempre suelta (en el mapa grande con el color y la inicial de su clase); el resto de tu facción agrupado en celdas (10 m en el minimapa, 14 m en el grande) con un círculo y su número, sin solaparse; aro ámbar si hay abatidos, estrella si lleva líder. En el minimapa los grupos fuera de radio salen como flechas en el borde con su número (16 sectores). En el mapa grande, cada escuadra dibuja una línea suave a su objetivo y la cabecera dice cuántos de tu facción siguen en pie.
- **Zombis**: la fase de la marcha avanza con la distancia recorrida (una zancada por tipo: caminante 1,9 m, corredor 3,4 m, pesado 2,3 m) con la amplitud de pierna que corresponde a esa zancada, de modo que el pie apoyado no patina; giro visual con velocidad angular limitada (5,5 rad/s; 9 corredor; 3,2 pesado) y miran hacia donde caminan.

## Fuego de cobertura sobre el enemigo más cercano (27-11)
- La orden busca el enemigo más cercano (soldado o infectado) a ≤ 50 m del jugador, en cualquier lugar; la escuadra se coloca con línea de tiro (a ≤ 90 % del alcance de su arma) y solo dispara si lo ve/tiene línea; si cae, pasa al siguiente más cercano; sin enemigos avisa y no da la orden. Medido en el distrito: 36 disparos en 9 s, 0 a ciegas.

## Cruceta: la tarjeta se cierra al ejecutar (27-11)
- La tarjeta ya no vuelve a aparecer tras dar una orden: 1.ª pulsación = abre (3,5 s); pulsar una flecha con ella abierta ejecuta y la cierra al instante; durante 1,5 s después otra flecha ejecuta directamente (encadenar órdenes sin tarjeta).

## Escuadra al día y sin disparos a ciegas (27-11)
- **Seguir al jugador a la carrera**: los seguidores igualan la velocidad del jugador (hasta 9,4 m/s; él corre a 8,2) y, a más de 16 m de su puesto, encadenan dashes (cada ~1,2 s por el camino libre). «Avanzar» y «Reagrupar» también van a la carrera. Medido: con el jugador corriendo 25 s en línea recta, los 4 compañeros se quedan a 4–8 m (12 dashes).
- **Sin disparar a lo que no ven**: se elimina el fuego de supresión automático sobre contactos; solo queda la orden explícita «fuego de cobertura» del jugador. Medido: 0 disparos de 814 sin ver al objetivo.

## Correcciones: inventario, mapa táctico, disparos sin motivo y vibraciones (27-11)
- **Inventario** compacto (≈ la mitad de alto), anclado a la derecha y sin velo ni desenfoque: el minimapa y el mundo se ven siempre; la capacidad va en la cabecera y el equipo en una sola fila.
- **Mapa táctico**: la leyenda y la cabecera ya no tapan el mapa; el tamaño del mapa descuenta su altura real.
- **Bots disparando sin enemigo**: el fuego de supresión exige contacto de menos de 4 s, a ≤ 32 m de quien dispara (50 m el de apoyo), que no vea ya a nadie, y un presupuesto de 6 disparos por contacto (16 el de apoyo). Antes bastaba un contacto en cualquier punto de la escuadra durante 6 s. Medido: 0 de ~1.500–1.800 disparos sin enemigo ni zombi a menos de 45 m.
- **Vibraciones**: el anillo de progreso de captura usa una sola geometría (128 sectores, `setDrawRange`) y su progreso, la bandera y el parpadeo de disputa están suavizados; anillos y marcadores con `polygonOffset` para que no se crucen con el suelo.

## Bots profesionales: clases, mando de facción, formaciones y cruceta en dos tiempos (27-11)
- **Clases** (`src/clases.js`, 6 con las armas que ya existen): Fusilero (fusil), Asalto (escopeta semiautomática + chaleco 3), Apoyo (ametralladora + más munición), Médico (subfusil, 4 botiquines, 3 kits de reanimación), Flanqueador (subfusil .45) y Francotirador (precisión). Reparto fijo por escuadra: 2 → Fusilero + Médico; 3 → + Asalto; 4 → + Apoyo; 5 → + Flanqueador; 6 → + Francotirador (cada facción: 12 F, 12 M, 10 A, 8 P, 6 L, 2 T). El líder de una escuadra es fusilero o de asalto.
- **Puesto de clases**: 6 chapas con su nombre en cada refugio (delante del tabique interior). El jugador cambia de clase pisándolas (arma y equipo al instante, se conserva al reaparecer). Los bots que aparecen en el refugio caminan a su chapa, ~0,7 s, y salen con el arma y el kit de su clase.
- **Médico**: cura a los aliados a < 7 m (8 puntos/s, hasta 100) y con él al lado el tope de regeneración natural sube de 60 a 75. Los bots médicos acuden al herido de su escuadra.
- **Vida**: regeneración natural lenta (7 s sin daño; luego de 1,5 a 4,5 por segundo) y solo hasta 60 (75 con médico); el botiquín cura +35 de forma progresiva (~14/s).
- **Mando de la facción**: roles por escuadra 4 atacan, 4 capturan/mantienen, 2 defienden el refugio, 2 exploran. Cada punto se puntúa por valor, distancia, escuadras ya asignadas y presencia enemiga; las escuadras de mantener/explorar acuden como refuerzo a un punto propio donde hay 2+ enemigos más que amigos.
- **Táctica por clase**: apoyo y francotirador toman puestos de vigilancia a 38 y 62 m del punto (con línea al centro y cobertura cerca); el asalto entra el primero; el flanqueador se desvía 32 m del eje.
- **Escuadra del jugador**: formaciones automáticas (cuña, columna por calles, círculo al parar, línea en contacto) con puestos que anticipan el movimiento; cruceta en dos tiempos (la 1.ª pulsación enseña qué hace cada flecha, la siguiente la ejecuta).
- **Inventario** rediseñado (cabecera con capacidad, barras de vida y protección con la marca del tope de regeneración, equipo en tarjetas, mochila en chips, filas de recoger/depositar, foco claro para el mando).

## Mapa de 750 × 750 m (27-11)
- **Escala única** `ESC` en el generador (`src/mapa_distrito.js`, `?escala=1` devuelve el mapa de 1 km): las posiciones del diseño (calles, refugios, zonas, objetivos) pasan por `P()`; los edificios y objetos conservan su tamaño. Dentro de la ronda exterior todo ×0,75; fuera de ella los primeros 60 m (portones, patios, recintos) no se tocan y el resto se comprime hasta el borde.
- Refugio → Plaza: 618 → 481 m en línea recta (ruta 452 m); refugio → objetivo de borde vecino 445 → 346 m. Props 22.211 → 14.885, edificios 436 → 308 (menos memoria y menos mallas dormidas).
- Escuadras de ataque: con 60 % de probabilidad van hacia el último contacto enemigo visto por su equipo (hasta 150 s) en vez de a un objetivo fijo.
- Zombis: densidad por zona ×0,75, objetivo de población 1.250 (incluye guarniciones), 12 hordas (3 sitios × 4 giros) con posiciones según la escala.
- Guarnición de puntos: 150 en la Plaza y 50 en los demás (60 % al empezar, 100 % con la meta cerca); la dificultad sube solo con los puntos de la mejor facción.
- Pendiente: los 4 puntos de borde nuevos (no se han añadido: los objetivos de borde actuales ya son comunes a dos refugios vecinos) y medir FPS en iPhone.

## Fase B: 50 combatientes por facción (200 en total) (27-11)
- **Por defecto 50 por facción** (antes 25; `?bots=N` de 4 a 50): 12 escuadras por facción con la misma composición (2,2,3,3,4,4,5,5,5,5,6,6).
- **Bots dibujados por instanciación** (`BI`, `src/partida.js`): cada bot eran ~42 mallas (~100 llamadas de dibujo con su sombra). La figura se monta y se posa igual sobre un grupo suelto fuera de la escena y cada fotograma sus mallas visibles se copian a mallas instanciadas por (geometría, material). Con 40 bots a la vista: **3.824 → 676 llamadas de dibujo**, constantes. Imagen equivalente (0,08 % de píxeles distintos > 16, sólo bordes de sombra). El equipo de los bots con la misma facción comparte geometría (3.184 geometrías únicas → 0). `?noinstbot` lo desactiva.
- **IA**: rejilla espacial de combatientes y zombis (percepción, separación y rescates ya no recorren a todos; `?nogrid`); desplazamiento directo cuando el destino está a < 26 m con la línea libre y reutilización de rutas largas (`?noruta2`); **A\* grueso** de 4 m para rutas de > 70 m, alisado y comprobado con la malla fina, 9–10× más rápido con rutas un 5 % más largas de media (`?nogrueso`); bots a > 50 m del jugador a 30 Hz alternando fotogramas (`?nolodbot`) y decisiones a 0,26 s fuera de la vista; `Math.hypot` de dos argumentos simples sustituido por `sqrt` en el código de la IA.
- Medido en escritorio (simulación de 2–3 min): con 50 por facción la lógica cuesta ~+50 % que con 25 (p95 ≈ 7,5 ms frente a ≈ 5 ms), pero los bots a la vista ya no cuestan dibujo. Con la IA al ritmo de ahora, 200 combatientes cuestan ~0,9 ms de mediana.

## Fase A2: vehículos, carreteras tácticas, cobertura general y bosques (27-11)
- **Vehículos** (5 tipos nuevos: furgoneta, pickup, camión, taxi, coche de policía; el coche abandonado se mantiene): **pesados** (masa 900, ya no se empujan con un roce), **puerta del conductor que se abre** (botón «Abrir puerta», cobertura lateral), **daño por etapas** (humo al 66 % de vida; al 33 % puede arder y explotar a los 2,5–6 s, con explosión que daña a los vecinos en cadena) y **giro libre** (choques y atravesados a cualquier ángulo, colisión de 3 cajas). La alarma de coche que atrae zombis NO se hace (decisión del usuario).
- **Carreteras tácticas** (`COMP.roadTactics`, todas las calles, misma disposición en las calles idénticas): cobertura a los lados cada ~11–15 m alternando carriles (vehículos en el bordillo, cruzados o girados, barreras de hormigón, bloques) y un **rompe-líneas** cada ~50 m (vehículo girado contra un bordillo que cruza el eje y deja ≥ 3 m al otro lado). Visión libre por la calzada: mediana 300 m → 20 m (el 97 % de los puntos veía más de 100 m; ahora el 15 %). Las 36 rutas refugio → objetivo siguen existiendo (rodeo ≤ 1,5).
- **Cobertura general**: pase de cobertura garantizada a ≤ 6 m (antes 9) con piezas propias de cada zona (setos y arbustos en patios y campos, barreras y contenedores en el casco). Puntos andables con cobertura a ≤ 5 m: **57 % → 75 %** (a ≤ 10 m: 98 %). 6 tipos nuevos de naturaleza: roca pequeña, mediana y peñasco (indestructibles), tronco caído, arbusto y seto (las balas casi los atraviesan: ocultan, cubren poco).
- **Bosques**: ~260 árboles de 3 especies (conífera, frondoso, seco) en rodales, 3 claros con anillo de rocas, troncos y arbustos unidos por senderos sin árboles, y sotobosque. Objetos por bosque 51 → 249; puntos sin ningún objeto a > 10 m: 67 % → 1–3 %. **Copas que se desvanecen** (tramado) cerca del jugador y entre él y la cámara.
- **Memoria**: vehículos, arbustos y setos usan variantes deterministas (3 × 6) que comparten geometría soldada (con `rnd()` cada uno ocupaba memoria propia: +87 MB), y el streaming de sectores congela también las piezas no soldables sencillas (cristales): nodos de Three.js 43.600 con 22.200 objetos, montículo ~190 MB.

## Fase A: objetivos como zonas de combate (27-11)
- **Antes**: la Plaza Mayor (el punto central y más disputado) era un cruce de calles vacío (0 objetos, 0 % de cobertura); Fábricas 8 objetos y 22 %; Estaciones 3 y 14 %; Puestos avanzados 7 y ~70 %.
- **Piezas nuevas** (4 tipos, ahora 75): monumento de la plaza (indestructible), barrera de hormigón, contenedor de carga y autobús siniestrado (`docs/CATALOGO_OBJETOS.md` §16).
- **Diseño por objetivo** en `src/mapa_distrito.js` (`ringPut`; `COMP.compound` admite `fill`): glorieta con monumento y molinillo de cobertura en la Plaza, patio de contenedores en las Fábricas, andén con autobuses y quioscos en las Estaciones, barreras y sacos en los Puestos. Simétrico para las 4 facciones.
- **Después** (`tests/cobertura_objetivos.py`): Plaza 33 objetos y 97 % de la zona con cobertura a ≤ 3 m, 8/8 direcciones, accesible desde los 4 lados (rodeo ×1,65); Fábricas 21 y ~89 %; Estaciones 18 y 93 %; Puestos 16 y ~96 %.
- **Los bots lo usan** (4 min de juego simulado, bots dentro de la zona del objetivo + 3 m, % a ≤ 1,6 m de una cobertura): Fábrica B 14 → 49 %, Fábrica C 8 → 65 %, Estación D 17 → 84 %, Estación E 9 → 56 %. La Plaza no llegó a ocuparse en esos 4 min (está a ~620 m de cada refugio).
- Sin cambio en las reglas de captura ni en los zombis (decisión del usuario: se quedan como están).

## Rendimiento en móvil, efecto del dash y NPCs corriendo (26-11)
- **Medición**: tocar el cuadro de FPS muestra p50/p95/p99, % de fotogramas lentos, reparto lógica/dibujo, partes de la lógica y los últimos tirones con su causa (`src/rendimiento.js`).
- **Optimizaciones sin cambio visual** (detalle y cifras en `docs/RENDIMIENTO.md`): lista de objetos despiertos (`AWAKE`), sombras en fotogramas alternos con anclaje a texels (`?nosombra2`), HUD sin escrituras repetidas (`?nodomcache`).
- **Efecto del dash** (`src/efectos.js`, `DASHFX`): marcas de viento, 3 líneas finas blancas y translúcidas al empezar y una suelta cada ~45 ms mientras dura, afinadas en las puntas y que se encogen hasta desaparecer; para el jugador y los bots. Una malla instanciada (1 llamada, 0 sin dash), sin shaders nuevos y fuera de la pasada de sombra. Sustituye a las 3 siluetas fantasma (~75 mallas translúcidas) y al anillo/polvo/estelas de colores de la primera versión.
- **NPCs corriendo**: pose de carrera continua según la velocidad (`e.run`: torso inclinado hacia delante, zancada y rodillas más altas, más vaivén, arma baja) y, en tramos largos de más de 20 m sin peligro, corren a la velocidad del jugador (8,2 m/s).
- Tests nuevos: `tests/sombra_alterna.py`, `tests/dash_fx.py`.

## 13 puntos de dominio (28-11)
- Se dejan 13 puntos capturables: los 4 refugios, los 4 puestos avanzados (uno por cuarto) y los 5 comunes (A Plaza Mayor, B/C Fábricas, D/E Estación y supermercado). Farmacia, tienda, clínica y granjas siguen siendo lugares con botín, sin bandera. Puntos cada 5 s: puesto avanzado +1, comunes y refugios +2; meta 1.000.

## Refugios dominables, todo neutral al empezar y Share para mapa y mochila (28-11)
- Cada facción empieza teniendo sólo su refugio; los otros 29 puntos (24 de los cuartos y 5 comunes) empiezan neutrales y se capturan. El refugio también se domina (zona de 12 m) y suma 2 puntos cada 5 s, como los comunes. Si te lo quitan, se reaparece en el punto propio más cercano a él que esté a salvo (o en el refugio si no queda ninguno); los bots van a recuperarlo primero.
- Share (mando): mapa táctico con la mochila al lado; ○ o Share cierran. Safari en el iPhone no da el touchpad del DualSense, por eso no abría nada. En campaña Share ya no abre el polígono de tiro. En el menú de Options, ○ sale al momento.
- Tests `tests/share_mapa.py`; `objetivos` y `dominio` con la nueva propiedad inicial.

## Mapa con ritmo: carreteras tácticas, lugares con historia, botín y puertas libres (28-11)
- Algo interesante cada 50–70 m andando: 228 lugares con historia (57 por facción, idénticos girados): control militar, convoy emboscado, hospital de campaña, posición atrincherada, campamento, carga abandonada, restos de una defensa y accidentes en la mitad de los cruces. Cada uno con su caja de botín.
- Carreteras tácticas: atascos en todas las calles (también las de barrio y de la aldea): se avanza de coche en coche; ningún tramo de calle de más de 30 m sin cobertura.
- Cobertura garantizada: el 95,9 % del mapa transitable tiene algo tras lo que cubrirse a menos de 10 m (antes 69 %).
- Botín para registrar en coches (maletero), taquillas, armarios, cocinas y neveras, además de las cajas de suministros; la misma cantidad en el mismo contenedor de los 4 cuartos.
- Puertas siempre libres: nada del mapa ni del mobiliario interior delante o detrás de ninguna puerta (antes 24 de 452 tapadas). Vallas con huecos irregulares, no cada 18 m exactos.
- Coste: ~17.600 objetos (antes 13.300); memoria JS ~240 MB y carga ~3,9 s en headless. Test `tests/mapa_ritmo.py`.

## Dominio con meta e interfaz por esquinas (28-11)
- Dominio de ubicaciones: zonas de 8 m (12 m Plaza, Fábricas y Estaciones) con mástil y banderola del color del dueño y aro de progreso en el suelo. Punto enemigo: neutralizar 10 s (gris) y capturar 10 s; neutral: 10 s. Más compañeros aceleran (hasta ×1,6); con enemigos dentro, DISPUTADO (congelado); al salir lo avanzado baja poco a poco. Comunes con letra A–E (también en el mapa y el minimapa).
- Puntuación: cada 5 s, +1 por punto propio y +2 por común; la primera facción en llegar a 1.500 gana (pantalla de fin con marcador y mejores de tu facción; «Jugar otra vez»). Tonos cortos al capturar, neutralizar, perder y cuando te están tomando un punto.
- Interfaz por esquinas (iPhone primero): minimapa arriba a la izquierda; marcador de dominio arriba en el centro; ⚙ y FPS discretos arriba a la derecha; vida abajo a la izquierda con la escuadra compacta encima (una ficha por miembro con su vida; se despliega 3 s al dar una orden); barra de captura abajo en el centro sólo dentro de un punto; arma abajo a la derecha. Fuera el título de la partida; con mando no se ve «Mochila». Nada se pisa y el centro queda libre.
- Tests `tests/dominio.py`, `tests/hud_iphone.py`; `tests/objetivos.py` con la captura en dos fases.
- Bots: al guardar un punto se reparten DENTRO de la zona en círculo, cada uno vigilando un sector distinto (72° con 5), y nunca son estatuas: barren su sector con la mirada, dan pasos cortos, se recolocan junto a su puesto cada 25–45 s, se agachan o se asoman un rato y recargan en calma; tiempos al azar para que nadie se mueva a la vez. En el refugio siguen de pie tras el muro bajo (sólo se agachan para recargar o con poca vida).
- Reacción humana: al ver a alguien nuevo tardan ~0,75 s en disparar de frente y ~1 s si les pillan de espaldas, y la puntería se asienta en ~1,1 s (los primeros disparos fallan más). Emboscada de 5 a campo abierto: antes 1,05 s de media hasta caer, ahora 1,39 s (combate realista, con un instante para reaccionar). Sin indicador de dirección de daño. Test `tests/bots_defensa.py`.

## Optimización sin perder calidad y parpadeo en tiendas (28-11)
- Memoria JS del distrito 373 → ~200 MB, mallas 168.000 → 48.000, texturas en la GPU 37,4 → 3,7 MPx, ~30–50 % menos llamadas de dibujo: materiales/texturas/geometrías compartidos, objetos intactos soldados (vuelven a sus piezas reales idénticas al tocarlos), dibujo en lote de lo repetido y colores de zombis compactos. Detalle y cifras en `docs/RENDIMIENTO.md`.
- Carga con pantalla y barra de progreso por pasos.
- Diagnóstico (tocar FPS): también tiempo de carga, geometrías, texturas y memoria JS.
- Corregido el parpadeo de píxeles al entrar en tiendas (caras coincidentes: z-fighting). Tests `dedupe_identico`, `fusion_identico`, `carga_progresiva`, `sin_parpadeo`.

## Relleno táctico de las zonas (27-11)
- Ninguna manzana es un campo abierto: líneas de vallas que parten los patios (con pasos de 4,5 m cada 18 m), barricadas improvisadas (coche cruzado, bloques y sacos), arboledas, contenedores y restos; vallas de huerto en la aldea, cercado de los campos de las granjas, campamentos abandonados en los bosques, nidos alrededor del puesto avanzado y carga apilada en la Fábrica y la Estación. Igual para las 4 facciones.
- Cifras: ~4.000 objetos colocados por el generador (antes ~2.240), 1.228 vallas, 1.572 árboles; carga 3,3 s y ~435 MB en headless.

## Más zombis y recarga a cubierto (27-11)
- ~950 zombis en el distrito (antes ~600), 8 hordas migratorias, más dormidos dentro de edificios; igual para las 4 facciones.
- Bots: con poca munición y el enemigo a la vista, van a cubierto a recargar y no salen hasta tener el cargador listo.

## Bots: dash y espacio personal (27-11)
- Todos los bots tienen dash (17 m/s, 0,18 s, como el jugador), usado con criterio: apartarse de granadas y explosivos, cruzar a la carrera hasta la cobertura bajo fuego o con poca vida, salir de una zona batida; espera de 2,5–4,5 s y sólo con el tramo libre.
- Espacio personal de 1,7 m entre compañeros en campaña (antes 0,85 m): mediana al compañero más cercano 3,6 m. Test `tests/bots_pro.py`.

## Mapa táctico y minimapa (27-11)
- Touchpad: toque = mapa táctico (antes lo ocupaba la mochila: ahora se abre manteniéndolo). Disparos que se oyen (150 m, 20 s) y fuego contra tu facción a cualquier distancia; objetivos, escuadra y aliados. Minimapa siempre visible. Tests `tests/mapa_tactico.py`; `tests/obras.py` abre el panel manteniendo el touchpad.

## Refugio compacto con muro bajo (26-11)
- Refugios del distrito de 23,4 × 16 m (79 m de perímetro, antes 200): todo el perímetro es parapeto de troncos (`wallLow1`, 1,2 m: de pie se dispara por encima; agachado cubre), portón alto de dos hojas, tabique alto con puerta interior (almacén, armero y catres detrás), nidos de sacos fuera del portón y 25 m despejados delante. Igual en las 4 facciones.
- Nuevos `wallLow1/2/3` (troncos, piedra, hierro), 1,2 m: de pie se dispara por encima (expuesto de hombros arriba: le llega la mitad de las balas); agachado, cubierto y oculto. Los bots defienden de pie y se agachan sólo para recargar o con poca vida. Se reparan y mejoran con las obras (`OBRAS.adopt` registra los 30 elementos de cada refugio con su facción; la puerta interior del portón de hierro se coloca hacia dentro en cualquier orientación).
- La escuadra que defiende ocupa los puestos junto al muro, agachada y mirando fuera. Sin torres (se descartan hasta que haya altura transitable). Test `tests/refugio.py`.

## Objetivos, suministros y refuerzos (26-11)
- 29 objetivos en el distrito: 6 propios por facción (empiezan siendo suyos) y 5 comunes (2 Fábricas, 2 Estaciones, Plaza Mayor). Captura en ~20 s con un solo bando dentro (hasta ×1,6 con más gente); disputado = congelado. Anillo en el suelo con el color del dueño.
- Recompensas: munición, granadas y kit al pasar por uno propio (cada 25 s); reaparición 9 s menos 1 s por objetivo común (mín. 4 s); reaparición adelantada en el puesto avanzado propio. El mando ataca los comunes que no son suyos y recupera los propios perdidos.
- Panel: objetivos por facción y estado del objetivo en el que estás. Test `tests/objetivos.py`.

## Muchos más zombis, realistas (26-11)
- Distrito: ~600 zombis por zonas (casco y comercios llenos, bosques casi vacíos), dormidos dentro de edificios, 4 hordas que migran; igual para las 4 facciones. Simulación barata lejos de los combatientes y dibujo sólo de los cercanos a la cámara. Detalle en `docs/ZOMBIS.md`.

## Escuadras realistas, órdenes y cobertura de coches (26-11)
- Coches: capó y maletero son cobertura baja (agachado, se dispara por encima si la bala cruza el capó o el maletero); la cabina es cobertura alta. Los bots buscan el capó y el maletero. Test `tests/cobertura_coche.py`.
- Nuevo `src/escuadras.js`: escuadras de 2–6 (iguales en las 4 facciones) con misión del mando de su facción (defender, mantener, atacar, reconocer); líder = el mejor vivo, relevo al caer; formación abierta, avance por saltos al atacar, posiciones de apoyo y fuego de supresión en contacto, sin persecuciones; supresión por balas cercanas; rezagados que se unen a otra escuadra y escuadras mermadas que se funden o se repliegan a reorganizarse.
- El jugador: órdenes con la cruceta del mando PS5 (y teclas 1–8), tomar/ceder el mando, unirse a otra escuadra, ir por libre. Panel de escuadra y avisos. Ver `docs/CONTROLES.md`.
- Tests: `tests/escuadras.py` reescrito (18 comprobaciones), `tests/avisos_bots.py` adaptado.

## Optimización sin pérdida visual y mapa lleno (26-11)
- Índice espacial de cajas, sectores de 32 m con recorte por cámara (0 píxeles distintos), árboles por sector, precalentado reducido, bots sin recorrer todos los objetos. Detalle y cifras en `docs/RENDIMIENTO.md`.
- Distrito v3 relleno: 400 casas con jardín y coches aparcados. Test nuevo `tests/sectores_identico.py`; `tests/rendimiento.py` incluye el mapa 6.

## Distrito v3 simétrico (26-11, rama claude/practical-euler-9gm8eq)
- `?mapa=6` pasa a ser una cuadrícula recta con los 4 cuartos idénticos (copia girada del cuarto Azul): igualdad total entre facciones. Fábrica N/S, Estación con supermercado E/O, Plaza Mayor en el centro.
- `COMP` con simetría (`D.sym` 4 o 2, `COMP.rot`, `COMP.facRot`); `MAPA.roadIndex` también para calles rectas; aceras de las T sin cortar del lado contrario; pasos de cebra sólo dentro de la calle.
- Ubicaciones oficiales y foto real: `docs/DISTRITO_V3.md`, `docs/img/distrito_v3*.png` (sustituyen a las del v2). Boceto: `tools/boceto_simetrico.py` → `docs/img/mapa_v3_boceto.png`.
- Tests: `distrito_sentido.py` con test de igualdad; `distrito_completo.py` ajustado a 4 objetivos por tipo. Sólo probado en Chrome headless; no en iPhone.

## Caída del jugador

El cuerpo conserva una sola copia del equipo al morir o quedar abatido. La estela del dash utiliza las mismas mallas base. Prueba de regresión: `tests/caida_jugador.py`.

## Objetos de campaña (sin versionar; rama claude/funny-hypatia-uvl1wv)
- Nuevo `src/objetos.js`: 68 tipos de objeto del catálogo (accesos, muros y portones de 3 niveles, puesto de vigilancia, pasarela y escalera, mobiliario urbano, comercio y transporte, escaparates con alarma, foco, surtidor, almacén por reservas, camilla, tablón, armero y emblemas de las 4 facciones), 13 recogibles (material, munición, botiquín, kit, casco/chaleco/mochila en 3 niveles) y raíles. Material nuevo `glass`.
- Revisión de estilo (25-11): muros, portones y torres en 3 niveles madera → piedra → hierro, paleta cálida, texturas procedurales, desgaste, color de facción (`OBJ.fac`) y colores propios por objeto. Ver `docs/CATALOGO_OBJETOS.md` §12–13.
- Edificios con paleta de color exterior (fachada, zócalo, remate y cubierta por tipo; variantes por instancia).
- Edificios recorribles (`OBJ.building`): minimarket, farmacia, supermercado, tienda y marquesina de gasolinera, clínica con consultas, estación con andén, vivienda con tejado a dos aguas, mercado cubierto, subestación vallada y nave logística, con interior amueblado, puertas, escaparates con alarma, techo que se oculta al entrar y muros cercanos recortados. Quiosco, puesto y surtidor modernos; líneas de facción tipo filete. 68 tipos. Test `tests/edificios.py`. Ver `docs/CATALOGO_OBJETOS.md` §14.
- Puertas, portones, verja y persiana se abren y cierran por código (`OBJ.setOpen`); alarma de tienda con ruido que atrae infectados. Sin inventario ni interacción por mando todavía.
- `?galeria=1` muestra todos los objetos. `tools/build.py` incrusta el módulo. Test nuevo `tests/objetos.py` (26 comprobaciones). Regresión: partida, partida_armas, partida_escudo, horizontal, zombis, balistica, aspecto, abatido_campana, barras y restos_fisica sin fallos.
- Solo comprobado en Chrome headless con capturas; no se ha visto en iPhone ni medido el rendimiento allí.

## v0.3.8 · Mando en iPhone: acceso directo sin modo app
- En iOS los mandos funcionan en Safari pero no en apps añadidas a la pantalla de inicio en modo standalone (error conocido de WebKit, bug 214336). Se quitan las metas `apple-mobile-web-app-capable`/`mobile-web-app-capable` y el manifest pasa a `display: browser`: el icono abre la página en Safari y el mando se detecta. Pantalla completa en iPhone: Aa → Ocultar barra de herramientas, en horizontal.

## v0.3.7 · Añadir a pantalla de inicio
- El "Script error. (línea 0:0)" salía al abrir el menú Compartir de Safari (error sin origen inyectado por el navegador, no del juego): el cuadro de error ya ignora errores sin archivo/línea/pila.
- Carpeta `web/` (manifest.json + iconos 180/192/512): se copian junto a `index.html` en el repositorio. Con ellos "Añadir a pantalla de inicio" abre a pantalla completa y con icono propio.

## v0.3.6 · Mando más robusto
- Al desconectar el mando se vuelve a táctil/teclado; respaldo `webkitGetGamepads`. Con mando simulado el juego lo detecta en móvil y escritorio; el "mando no detectado" del iPhone viene del navegador (no entrega el mando hasta pulsar un botón en la página).

## v0.3.5 · HUD horizontal pegado a las esquinas
- Móvil apaisado: munición, arma, granadas, dash y barra de vida van en la esquina inferior derecha (margen 14 px o el seguro de la muesca); FPS y texto de entrada más cerca de las esquinas superiores. Los botones táctiles (invisibles) siguen en su sitio.

## v0.3.4 · Horizontal más cerca
- Móvil apaisado: fov ×1,05 (antes ×1,28, se veía todo lejos). Ajustable en `shortL ? 1.05 : 1` (cámara de `update`).

## v0.3.3 · Aviso de error con detalle y arranque táctil
- El cuadro de error ahora muestra archivo, línea y pila (antes solo "Script error. (línea 0)" en Safari/iPhone, sin pistas). Pendiente: averiguar la causa real del error visto en iPhone al abrir en GitHub Pages.
- En táctil ya no arranca solo el polígono a los 6 s: espera a que elijas EMPEZAR o MAPA 3.

## v0.3.2 · Modo horizontal (móvil)
- Móvil apaisado (alto < 520 px): cámara con más campo (fov ×1,28) para ver rivales arriba y abajo; HUD y botones táctiles recolocados (caben en 375 px de alto), márgenes seguros para muesca (`viewport-fit=cover`, `env(safe-area-inset-*)`), marcador sin saltos de línea. Vertical y escritorio sin cambios.
- Al girar el móvil se reajusta el tamaño (`orientationchange`, `visualViewport`). Metas para modo app (iOS/Android). En táctil, al empezar se pide pantalla completa (solo funciona en página propia, p. ej. GitHub Pages; no en el artefacto).
- Test: `tests/horizontal.py` (5 tamaños: sin botones fuera de pantalla). No probado a mano en móvil real.

## v0.3.1 · Escudo y barras de vida (mapa 3)
- Escudo de 50 sobre los 100 de vida para todos (jugador y bots), completo al reaparecer. Absorbe primero; el sobrante pasa a la vida en el mismo golpe (también explosiones y fuego). Tras 5 s sin daño se recarga a 15/s y después se regenera la vida (22/s).
- Barras nuevas: escudo (azul) sobre vida (verde/amarillo/rojo), drenaje suave, trozo naranja de daño que se vacía tras ~0,55 s, destello, pulso y sacudida. Los bots llevan barra sobre la cabeza durante 4 s tras recibir daño. Números de daño flotantes (tamaño según daño, salen a lados alternos) solo en golpes que das o recibes. Críticos de cabeza: pendiente.
- Test: `tests/partida_escudo.py`. No probado a mano.

## v0.3.0 · Mapa 3: partida 6 vs 6 a 100 bajas
- Nuevo `src/partida.js` (el build lo incrusta). Se entra con el botón "MAPA 3 · PARTIDA 6 vs 6" de la pantalla de inicio o con `?mapa=3`. EMPEZAR sigue arrancando el polígono; arena original y polígono no cambian (`MX.on=false`).
- Mapa simétrico 100×60 m con todos los tipos de objeto, muros, búnker, bloques y dos bases con puertas. Sin blancos: los rivales son bots.
- Equipo azul = jugador + 5 bots; rojo = 6 bots. Gana el primero en 100 bajas; marcador arriba, barra de vida, pantalla final (B/M) y REVANCHA (también con ✕ del mando). Vida 100, regeneración tras 5 s, reaparición 3 s con 1,8 s de invulnerabilidad, props rotos se reponen a los 40 s.
- Bots: navegación por cuadrícula + A*, percepción con campo de visión y humo, cobertura, granadas (7 m) y lanzagranadas (15 m), armas aleatorias, 3 dificultades (`MX.M.diff`, por defecto 1).
- Jugador: 2 principales + pistola. △ tocar alterna principales; △ mantener = pistola (y otra vez mantener vuelve). Armería en la base azul: al pisar una peana se equipa el arma; pad de MUNICIÓN.
- Pruebas automáticas: `tests/partida.py [frames]` (simulación bot vs bot: reparto de bajas ≈50 %, sin atascos), `tests/partida_armas.py`. No probado a mano.

## v0.2.2 · Choques entre trozos retirados + marcas de bala en restos
- Decisión del usuario: se QUITAN los choques entre trozos (vuelven a atravesarse). El código está en `/home/claude/backup/prototipo.v0.2.2-choques-trozos.html` (no incluido en el zip) por si se quiere recuperar; `restos_trozos.py` queda sin sentido con este código.
- Corrección: las marcas de bala pegadas a trozos estirados (tablas de caja) salían 10 veces más grandes y deformadas al caer los restos (marca negra grande "en el aire"). Ahora `stickDecal` calcula la marca en coordenadas mundo con tamaño uniforme. Test: `marcas_restos.py` (ninguna marca fuera de su pieza ni mayor de 0,25 m).
- La mancha de quemado bajo un barril explosivo ya no es un disco negro duro de 3,2 m: es una textura difusa de ~2 m que se desvanece en los últimos 8 s (`scorchTex`, `updateScorch`).
- No probado a mano.

## v0.2.2 · Choques entre trozos
- Los trozos chocan entre sí como cajas rígidas (`pairPoints` detecta puntos de uno dentro de la caja del otro; `solvePair` resuelve impulso con rebote y rozamiento del material). Un trozo dormido actúa como fijo y se despierta si lo golpean fuerte o si desaparece el que lo sostenía.
- Los trozos recién nacidos del mismo objeto no chocan entre sí los primeros 0,25 s (nacen solapados); después sí.
- Separación posicional suave (40 %→60 % de la penetración, tope 9 cm) repartida por masas inversas; más subpasos si el trozo va rápido.
- Cada 6 fotogramas se revisan los pares dormidos que se solapan más de 2 cm y se despiertan para separarse.
- Medido con `restos_trozos.py` (6 repeticiones, 7 objetos mezclados, 594 trozos): puntos de contacto con más de 2,5 cm de penetración 81 → 4 (máx. 9,6 → 3,8 cm); coste medio 1,4 ms/fotograma (swiftshader). Suite completa sin fallos.
- Tests: `restos_trozos.py`. No probado a mano.

## v0.2.2 · Física de restos (trozos de objetos destruidos)
- Cada trozo es ahora una caja rígida con giro (masa 1, inercia de caja con mínimo para listones finos): cae, rebota según el material (madera .22, plástico .3, metal .28, bloque .12, arena .04), rueda y se desliza con rozamiento de Coulomb (madera .55 … arena 1) y se asienta por una cara estable. Sin «enderezado» forzado.
- Contacto por esquinas (+ puntos medios en piezas largas) contra suelo, objetos en pie (pueden aterrizar encima) y paredes; sin teletransportes al borde. 3 subpasos × 4 iteraciones por fotograma.
- Se duermen con 3+ apoyos tras 0,3 s casi quietos (a los 1,6 s sí o sí); velocidad angular limitada a 20 rad/s.
- El centro de la caja física se calcula de la geometría real: las placas curvas del barril ya no quedan hundidas bajo el suelo.
- Medido (mismo test antes/después): giros bruscos con el trozo casi parado en caja 56→5-12, valla 34→10-27 (variable por azar), barril 29→4-9; trozos hundidos en el suelo 8→0; giro máximo por fotograma 37°→≈20°; coste con 260 trozos ≈0,2 ms por fotograma; 672 trozos en 12 repeticiones, todos dormidos y ninguno sobre un canto.
- Corrección: los trozos que se sueltan de un objeto en pie ignoran su caja hasta salir de ella (antes podían quedar posados encima como si fuera un suelo), y al destruirse un objeto se despiertan los trozos que descansaban encima.
- Choques entre trozos: ver entrada siguiente (ya no se atraviesan).
- Tests: `restos_fisica.py`, `restos_choques.py`, `restos_apoyo.py`. No probado a mano.

## v0.2.2 · Cajas sin parpadeo de textura
- Las tablas de la caja compartían plano exacto con el marco en 28 pares de caras (parpadeo de textura al mover la cámara, peor en móvil). Ahora las tablas sobresalen 4 mm. Comprobado con un detector de caras coplanares: 0 pares en todos los objetos (`tests/caras_coplanares.py`).

> **v0.2.2 (publicada, ver HANDOFF):** las entradas «v0.2.2 …» están en el orden en que se hicieron las tandas, de la más reciente (arriba) a la más antigua; las de abajo del todo («v0.2.2 (sin publicar)», «balística profesional», «equilibrio», «rendimiento», «granadas», «radio y humo») son anteriores a las de arriba. Resumen de lo último: sin granadas recogibles → marcas de bala con relieve y posición exacta → fuga de agua que sigue al barril + pasos → pasos al caminar → barriles nuevos → radio de explosión y humo → granadas de distancia fija → rendimiento → equilibrio de armas → balística → sonido completo.

## v0.2.2 · Parpadeo de texturas en cajas y barril cilíndrico
- Cajas: las tablas y el marco compartían caras en el mismo plano (28 pares por caja, tiras de 1 cm), lo que provocaba un parpadeo mínimo de textura (z-fighting) al mover la cámara, peor en móvil. Las tablas ahora sobresalen 4 mm (`eo` en `buildCrate`). `tests/caras_coplanares.py` busca estos pares en todos los objetos: ahora 0.
- Barril: la colisión de las balas es ahora un cilindro (radio 0,3). Antes una bala que rozaba la esquina de su caja envolvente contaba como impacto y la marca quedaba hasta 9 cm fuera de su trayectoria.
- `tests/barril_disparo.py`: 8 disparos con distintos ángulos, desplazamientos y alturas; marca a ≤ 6 mm de la trayectoria y sobre la chapa (radio 0,30), altura exacta, normal hacia el tirador, chorro saliendo del agujero en la dirección de la normal.

## v0.2.2 · Sin granadas recogibles
- Las cajas de madera ya no sueltan la granada recogible que flotaba y giraba (parecía un trozo de caja). El código de recogida queda sin usar.

## v0.2.2 · Marcas de bala con relieve
- Las marcas dejan de ser un disco plano: centro hundido y oscuro, borde elevado que recibe la luz (3 variantes por material, geometría y material compartidos).
- Madera: cráter con astillas claras. Plástico: agujero limpio con grietas finas. Bloques: desconchón con grietas. Sacos de arena: rasgón con borde de arena (antes no dejaban marca). Metal: borde de chapa doblada.
- Barriles: el impacto se calcula contra el cilindro real (punto y normal de la superficie curva), no contra la caja que lo envuelve. La fuga sale en esa dirección real.
- Barril con fuga: rastro mojado (agua) u oscuro (combustible) que baja por la chapa bajo el agujero.
- Agujero de salida más abierto en madera, plástico y arena cuando la bala atraviesa. Máximo de marcas por objeto 14 → 16.
- Corrección: la marca se coloca con un rayo contra las piezas reales del objeto, a la altura REAL de la bala y en el punto exacto del impacto; si pasa por un hueco (entre listones) no hay marca. Si la bala vuela por encima del objeto (el juego colisiona en 2D), la marca va a media altura.
- Sin cambios de daño, penetración ni sonidos. Comprobado con capturas de cerca y tests automáticos; no jugado a mano.

## v0.2.2 · Fuga de agua y pasos
- Arreglo: al empujar un barril con fugas (agua o combustible), los agujeros y el chorro lo siguen (antes el agua se quedaba cayendo en el aire).
- Pasos: quitado el paso 3 (no gustaba); quedan 2 variantes (`STEP_walk_01`, `_02`).

## v0.2.1 — motor de audio y sonidos de la pistola (2026-11-23)
- Motor de audio con muestras: carga y decodificación de sonidos incrustados, variantes aleatorias sin repetir seguidas, variación de tono (±3 %), límite de 24 voces, limitador suave en la mezcla y reverberación de sala suave por sonido.
- Cada arma tiene un identificador de sonido (`sid`: F1, P1, E1) y los eventos piden `ID_evento`: `_shot`, `_dry`, `_equip`, `_rel1`, `_rel2`, `_rel3`. Si la muestra no existe, se usa el sonido sintético anterior (disparo) o no suena nada (resto).
- Recarga con tres fases de sonido ligadas a la animación (0,25 / 1,05 / 1,3).
- Sonidos de la pistola P1 integrados: disparo (1 de 3 variantes), clic en vacío y sacar el arma.
- El inicio de cada muestra se detecta al cargar, para saltar el silencio previo y el retardo del codec MP3 del navegador.
- Canalización de audio: `assets/audio/manifest.json` + `tools/build.py` (mono, recorte, fundido, nivel a pico, MP3 a 128 kbps, `src/sonidos.js` e `index.html`).
- Puerta de ruido suave en el build (`gate` por sonido, -42 dB por defecto) para bajar el siseo de fondo de los audios generados.
- Sonido del casquillo de 9 mm (3 variantes) al tocar el suelo, ligado al primer contacto de la física.
- Sin cambios de movimiento, armas ni objetos.

## v0.2.0 — objetos destructibles y cobertura (2026-11-23)
### Objetos destructibles
- Sistema de materiales (madera, plástico, metal, arena, bloque): impactos, partículas, marcas de bala/abolladuras y daño según material.
- Objetos: cajas de madera (grande y pequeña), vallas de madera, barreras de plástico, barriles metálicos (fugan agua), barriles explosivos (combustible), sacos de arena y muros de bloques. 56 piezas repartidas por el mapa.
- Rotura progresiva (se sueltan trozos al 66 % y 33 % de vida) y destrucción final en trozos con física (caen, rebotan y se asientan; máx. 260, desaparecen a ~22 s).
- Cajas, barreras y barriles se pueden empujar; el dash empuja con más fuerza.
- Penetración por material: madera ≈55 %, valla 75 %, plástico 40 %, arena 15 %, metal y bloque 0 %.
- Barriles: agujeros con fuga de líquido y charcos; los de combustible pueden prenderse, explotar y encadenarse. Fuego que daña enemigos y quema madera. Cráter tras explosión.
- Las cajas de madera pueden soltar granadas o humo recogibles.
- Las explosiones (`explode(p, R, escala)`) dañan y empujan objetos. Sin sonidos nuevos.
### Cobertura
- Pegado a un objeto bajo (altura ≤ 0,95: barrera, valla, sacos, bloques, caja pequeña) se dispara por encima de él, de pie o agachado; el láser también lo ignora. Entra a < 0,8 m y sale a > 1 m. HUD: «COBERTURA».
- Agachado tras la cobertura el personaje se encoge; al apuntar o disparar se asoma.
### Barra de dash
- Se vacía durante el dash (según lo que se mantenga R3), se recarga con el tiempo real, destella al estar lista, parpadea en rojo si se pulsa sin estar lista y se atenúa tras 2 s en reposo.

## v0.1.0 — estable (2026-11-23)
Primera versión estable del prototipo.

### Personaje y movimiento
- Esqueleto procedural con IK de 2 huesos para piernas y brazos.
- Locomoción por fases: el estado de cada pie es función de la fase del ciclo (pies siempre en contrafase). Cubre caminar, correr, de lado, atrás, agachado y correr agachado.
- Zancada limitada al alcance de la pierna; rodillas más flexionadas al correr; menos encorvado al correr.
- Postura de pie con rodillas poco flexionadas (antes parecía semiagachado).
- Transiciones suaves entre de pie y agachado.
- Corregido el "salto de canguro" (dos pies despegando y aterrizando a la vez) y el pie que se quedaba atrás al arrancar desde parado.

### Dash
- Dash en R3 (y Espacio). Mantener = dash más largo (hasta ~0,47 s) con recarga proporcional.
- Zancada de impulso, estela sutil de 3 siluetas, polvo al arrancar.
- Frenado rápido al terminar (0,27 s parado; 0,17 s si sigues con el stick).
- Deslizamiento eliminado (se probaron varias poses y se descartó).

### Armas
- Fusil, pistola y escopeta con umbrales analógicos de L2/R2 distintos.
- Casquillos por arma (latón en fusil y pistola; cartucho rojo en escopeta al bombear), con física, rebotes y reposo.
- Cargadores que caen al suelo y quedan tumbados (sin flotar).
- Retroceso del cuerpo y de la cámara con muelle amortiguado; empuje real en escopeta y pistola.
- Vibración distinta por arma y por explosión (implementada, pero no funciona en Safari/iPhone; ver ESTADO).
- Granadas y bombas de humo (humo con nubes que ocultan blancos).

### Controles
- Círculo = agacharse; R3 = dash; L3 = correr con latch; menú de reasignación y calibración (Options).
- Controles táctiles invisibles pero funcionales.

### Base técnica
- Three.js r128 incrustado (sin CDN), WebGL, un único archivo.
- Arreglado el fallo de arranque ("Script error") causado por una constante llamada `top`.

## 0.2.1 (audio profesional) — sonidos integrados
- 105 sonidos de la lista en `assets/audio/manifest.json`: las 10 armas (P1, P2, S1, S2, F1, F2, E1, E2, H1, H2) con disparo, vacío, equip y recargas; casquillos y cargadores; impactos, roturas, escombros, empujes, fugas, fuego, explosiones, granadas, humo;.
- Build (`tools/build.py`): puerta de ruido, recorte, `inicio` (sacar un sonido de un trozo de otro), `quitar` (eliminar huecos de silencio), `bucle` (cruce de 0,25 s, sale en WAV sin pérdida), igualado de sonoridad y cola entre variantes.
- `tools/consistencia.py`: mide brillo, caída, sonoridad y bandas entre variantes (CONSISTENTE / REVISAR). Variantes atípicas movidas a `assets/audio/descartados/`.
- `*_equip` de E1, S1, S2, P2, F2, H1, H2 derivados del cerrojo/cierre de cada arma (ElevenLabs no interpreta bien el sonido de sacar el arma).
- PENDIENTE de conectar al código (cargados pero sin reproducir): impactos, roturas, escombros, empujes, fugas, fuego, explosiones, granadas, humo, `E1_pump`, `E2_action`, capas de rareza y el soporte de bucles; armas nuevas (P2, S1, S2, F2, E2, H1, H2) aún no existen en el juego.
- Faltan: `C_44` / `C_44_multi`. Capas de rareza (`LAYER_rare`, `LAYER_epic`, `LAYER_legendary`) descartadas por ahora: solo salió bien la rara y sin las otras dos no se usa.

## v0.2.2 (sin publicar) - sonido completo y 7 armas provisionales
- Armas provisionales (geometría y stats por ajustar): P2 revólver, S1 subfusil, S2 subfusil .45, F2 precisión, E2 escopeta semi, H1 ametralladora, H2 lanzagranadas. E1 ahora hace el bombeo con E1_pump.
- Sonidos de mundo conectados: impactos por material, roturas, escombros, empujes, fugas, fuego, explosiones, granadas, humo (bucles con límite de 14).
- Ayudantes de audio: playAt (distancia + panorama), loopAt/loopTick, later/tickTQ. Build: opciones inicio, quitar, bucle, apilar.
- Capas de rareza: descartadas. Nuevo test: tests/audio_mundo.py.
- Probado: automático (Playwright, sin errores JS; las 10 armas disparan, seco, recarga; 8 props; explosiones, humo, fuego). NO probado: escucha real en navegador, volúmenes, fugas, empuje.
- Polígono de pruebas (tecla F2, solo cuando se activa): 2 filas de las 8 piezas (impactos / roturas-explosiones), 5 blancos (3 fijos, 2 móviles), etiquetas en el suelo, panel con teclas. 1-9,0 elige arma, U repone munición/granadas/humo, Y repone piezas y blancos, T teletransporta entre zonas. Aparta los obstáculos aleatorios que caen en las pistas y los devuelve al salir. Test: tests/poligono.py.
- Polígono (actualizado, pensado para mando PS5): Share lo activa y te lleva a la ARMERÍA (oeste). Pisar un pedestal equipa esa arma; estaciones de suelo: MUNICIÓN, REPONER PIEZAS y teletransportes a Materiales/Blancos/Centro, con pad de vuelta a la armería en cada zona. Atajos: cruceta ←/→ arma, ↑ munición, ↓ reponer, touchpad cambia de zona. Tests: tests/poligono_mando.py (mando simulado) y tests/poligono.py.

## v0.2.2 - balística profesional
- Cada disparo/perdigón es un proyectil con tiempo de vuelo (`spawnBullet`/`updateBullets`): velocidad de salida por arma, arrastre (pierde velocidad con la distancia), colisión continua (barrido por fotograma, sin atravesar objetos finos), alcance máximo (la bala desaparece), trazador que se mueve y cuyo largo depende de la velocidad.
- Caída de daño por arma (`BAL`: v, ef, max, min, drag, pierce): daño completo hasta el alcance efectivo, curva suave hasta el mínimo en el alcance máximo. Alcances: P1 18/35, P2 24/45, S1 16/32, S2 18/36, F1 35/60, F2 70/100, E1 7/18, E2 6/16, H1 40/65 m; H2 lanza la granada a ~30 m y explota al impacto.
- Penetración por calibre (`pierce`): F2 atraviesa más que 9 mm; los perdigones casi nada. La energía que sobrevive tras un objeto se conserva en el proyectil.
- El láser de apuntar llega al alcance máximo del arma.
- Polígono: pista de distancia (zona 6, pad "→ PISTA") con marcas cada 10 m y blancos a 5/10/20/35/50/70 m en zigzag (no se tapan), blancos con vida enorme; medidor de daño flotante (daño, % del arma, distancia, tiempo de vuelo; perdigones agrupados); armería con alcance de cada arma bajo su nombre.
- Tests: tests/balistica.py (97 controles: daño por distancia, tiempo de vuelo, alcance máximo, penetración, 8 perdigones, granada del lanzagranadas).
- Valores PROVISIONALES, a ajustar jugando. Sin enemigos todavía: no se ha implementado el alcance auditivo del disparo.
- Escopetas niveladas: E1 dmg 12->11 por perdigón, cd .75->.85, dispersión .13->.16, alcance 7/18->6/16 m; E2 dmg 10->7, cd .30->.34, dispersión .15->.18, alcance 6/16->5/14 m (daño por segundo de la E2 a 5 m: 267->154). Test de balística sin fallos.
- Equilibrio entre armas (paso 1; los alcances y velocidades NO se tocan): H1 dmg 17->15, cd .075->.08, dispersión .04->.05; P2 dmg 55->50, cd .42->.5; F1 cd .1->.11; S1 cd .065->.06. F2 queda en 90. Pendiente: acortar alcances a escala de pantalla, pista de 30 m, cámara de la F2 (opcional).

## v0.2.2 · Equilibrio paso 2 · alcances a escala de pantalla
- Alcances efectivo/máximo reducidos a lo que el jugador ve en pantalla (≈11 m lateral, 10 m arriba, 6 m abajo): pistolas 7–9/14–17 m, subfusiles 6–7/12–14, F1 12/22, F2 18/30, escopetas 3–3.5/7–9, H1 13/24.
- Velocidades de bala, tiempos de vuelo y daño de F2 (90) sin tocar.
- Lanzagranadas vuelve a ~15 m (24 de velocidad, 5.5 vertical).
- Test `balistica.py` actualizado a los nuevos alcances (0 fallos).

## v0.2.2 · Equilibrio paso 3 · pista de distancia a 30 m
- Pista del polígono: de 70 m a 30 m, marcas cada 5 m, blancos en zigzag a 3/6/9/12/18/25 m.
- Paso 4 (cámara adelantada con la F2) descartado por el usuario: daría ventaja de visión.
- `balistica.py` adaptado a las nuevas distancias (0 fallos).

## v0.2.2 · Rendimiento sin cambio visual
- Diagnóstico oculto: clic en el cuadro de FPS → lógica, dibujo CPU, tiempo GPU (Chrome), llamadas, triángulos, resolución.
- Medido en Mac: CPU ~5 ms, GPU ~13 ms a 2092×1168 (límite: GPU, poco margen).
- Luces puntuales (fogonazo, explosión) se apagan mientras valen 0 (no aportaban nada pero se calculaban en cada píxel); las 4 combinaciones de luces se precompilan en un frame de calentamiento al empezar para evitar tirones.
- Buffer de stencil desactivado (no se usa).
- Sin tocar escala de píxeles, antialiasing ni sombras.

## v0.2.2 · Lanzamiento de granadas y lanzagranadas (distancia fija)
- Granada de mano/humo (R1/L1) y lanzagranadas (L2 + R2): distancia siempre fija (mano 7 m, lanzagranadas 15 m). La dirección es la de apuntar/mover de siempre (stick derecho, o el movimiento del stick izquierdo; ratón: cursor); la cruceta ←→ afina el giro y no cambia de arma mientras se prepara el lanzamiento.
- Con la granada de mano en la mano no hay dash (R3); sin ella sigue igual.
- Descartado por el usuario: distancia variable con el stick y dirección bloqueada.
- Anillo + arco muestran dónde cae de verdad (mano: dónde acaba rodando; lanzagranadas: punto de impacto); cae en el anillo (±0,1 m). Velocidad del lanzagranadas sin cambios (24 m/s). La cámara se adelanta para ver el anillo.
- Test nuevo: `tests/granadas.py` (mando simulado, 0 fallos).

## v0.2.2 · Pasos al caminar
- Sonido de paso (`STEP_walk`, 3 variantes) cuando cada pie toca el suelo caminando o corriendo: sincronizado con la animación, más fuerte cuanto más rápido, más suave agachado, sin sonar parado, en dash ni deslizando.
- Audios de ElevenLabs mejorados: recorte, filtro de graves inútiles, algo más de definición, menos "caja", cola corta y mismo nivel entre variantes.
- Volumen bajado (`STEP_walk` .5 → .16; sonaban más fuertes que los disparos). Una toma sustituida por otra nueva (la quitada está en backup).
- Test nuevo: `tests/pasos.py`.

## v0.2.2 · Barriles: rotura nueva
- El cuerpo se abre en 8 placas curvas (como una flor); solo la base y la tapa son discos aparte.
- Barril de agua: chorro de agua, salpicadura y charco (sin fuego).
- Barril explosivo: bola de fuego, placas chamuscadas, humo negro y UNA tapa lanzada hacia arriba girando.
- Sin aviso previo. Daño, radio de 4,2 m y sonidos sin cambios.
- Los objetos de metal siguen sin soltar bandas por las balas (corrige una afirmación mía anterior).
- Probado solo con tests automáticos y capturas; no jugado a mano.

## v0.2.2 · Radio de explosión y humo nuevo
- Radio de explosión: granada de mano 4,6 → 3,5 m; lanzagranadas 3,8 → 3 m (`R_FRAG`, `R_LAUNCH`). Daño máximo y falloff sin tocar (mata a 100 PV a ≤ ~0,8 m; a 2 m hace ~56; a 3 m ~19). Barriles sin cambios. El anillo visible de la explosión sigue el radio.
- Granada de humo: nube de radio 2,8 m (antes 3,6 m y visualmente ~6 m de radio). Reconstruida: ~26 billboards por nube en UN solo dibujo instanciado (`SMK`), con ruido fBm procedural (textura 256² teselable generada al cargar), sombreado suave, borde erosionado, fundido cerca del suelo y disolución al final (~10–13 s). Ya no usa las 130 esferas transparentes compartidas (liberan el pool para polvo/chispas).
- Medido en renderizado por software (solo orientativo): coste extra con humo ≈ 10× menor que el humo anterior.
- `hiddenBySmoke` oculta blancos hasta t = 12,2 s (antes 13,5) para coincidir con la disolución visual.
