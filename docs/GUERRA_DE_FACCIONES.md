# Guerra de facciones, refugios y zombis

Diseño acordado el 25 de noviembre de 2026 para el nuevo modo de KK. La primera campaña se probará en solitario con bots. El paso a multijugador depende de que la experiencia resulte entretenida. Las cifras de población, distancias, tiempos, costes y rendimiento son objetivos de prueba. Los límites concretos de reanimación que figuran aquí son una primera propuesta de equilibrio.

## 1. Experiencia y objetivo

Una región continua con un mínimo de cuatro facciones, varios frentes simultáneos, infectados dispersos y hordas móviles desde la primera prueba. Cada facción empieza con un refugio y capacidades comparables. El jugador escoge con quién salir, dónde combatir, qué defender y cuándo retirarse. Puede jugar solo, incorporarse a una compañía que ya está en marcha, separarse o proponer un destino a compañeros disponibles. En el futuro online, un amigo debe poder reunirse con el grupo durante la campaña.

El objetivo colectivo es sostener presencia operativa en la región. Importan las instalaciones utilizables, las compañías que regresan y los puntos donde todavía puede reagruparse la facción. La campaña continúa al caer el jugador. La primera prueba prescinde del límite de bajas. Quedan por validar la duración de las campañas y las condiciones de victoria online. La persistencia jugable implica que al volver a un barrio encuentras sus brechas, reparaciones, reservas y cambios de control. La persistencia entre sesiones y el alojamiento de la campaña requieren diseño técnico posterior.

## 2. Base existente

El mapa 3 es el ensayo de combate 6 contra 6. Los bots ya navegan con A*, perciben enemigos y humo, buscan cobertura, disparan, recargan y usan granadas. Jugador y bots comparten el sistema de proyectiles, con lógica propia para ejecutar acciones. El juego ya dispone de salud, escudo, reaparición, armería por proximidad, audio, casquillos, coberturas y objetos con física, empuje, impactos por material, destrucción progresiva y restos. Revisar [partida.js](../src/partida.js), [el prototipo](../src/prototipo.html), [arquitectura](ARQUITECTURA.md) y [estado](ESTADO.md) antes de modificar un sistema. El nuevo modo amplía la toma de decisiones de las compañías, las interacciones con el entorno y las reglas de campaña. Las reglas de reposición de objetos de la arena deberán distinguirse de las reparaciones persistentes del nuevo modo.

## 3. Región, escala y lectura del mapa

- Horizonte de diseño de 4 × 4 km (16 km²), con ciudad central, barrios residenciales, industria y periferia rural. El primer distrito será de alrededor de 1 × 1 km, a escala final y ampliable por sectores.
- Para ese distrito se plantean cuatro refugios iniciales, al menos dos frentes simultáneos, dos o tres compañías por facción, infectados locales y una horda itinerante. Buscar una primera decisión interesante a unos 30–60 segundos desde la base. Medir tiempos de marcha y regreso en el dispositivo real antes de extender la región.
- Cada zona ofrece accesos y recorridos con consecuencias distintas. Ejemplo: avenida visible, patio de carga amplio y salida lateral estrecha que se abre desde dentro. Conservar referencias reconocibles desde la calle y rutas para retirarse.
- El mapa muestra actividad aliada, compañías y destinos conocidos, última información sobre amenazas, reservas descubiertas y puestos de reaparición válidos. Diferenciar el propietario de una instalación de su estado operativo. Mostrar solo la información necesaria en el HUD.

| Lugar | Acción y valor estratégico |
|---|---|
| Refugio | Equiparse, consultar frentes, reagruparse, recibir compañías, auxiliar, almacenar, reparar, mejorar y organizar salidas. |
| Tienda, supermercado y farmacia | Recoger provisiones o botiquines para uso propio, un compañero o el almacén. Salida a pie y salida de carga pueden ser distintas. |
| Gasolinera | Punto reconocible de abastecimiento y encuentro por carretera. Tiendas y gasolineras son de uso libre. En la primera prueba se prescinde de transportar bidones y generadores. |
| Clínica | Auxiliar y recuperar aliados. Puede servir como puesto avanzado cuando se habilita, está asegurada y su zona de reaparición es utilizable. |
| Estación, depósito y puente | Conectar barrios y abrir o perder rutas. Una estación despejada puede permitir el reagrupamiento aunque quede lejos del refugio. Una horda en los andenes puede inutilizarla. |
| Taller y almacén | Encontrar materiales, reparar elementos y habilitar un puesto de reserva en un lugar asegurado. |
| Mercado, viviendas y plaza | Explorar interiores, patios y alturas, encontrar grupos, cruzar una zona evacuada por la horda o evitar una avenida ocupada. |
| Subestación e infraestructura regional | Posible ampliación para restablecer servicios con una interacción local y efectos visibles en otro barrio. Validar tras el primer distrito. El transporte ferroviario funcional y los vehículos también son ampliaciones, no requisitos iniciales. |

### Control de ubicaciones en la región completa

Propuesta de distribución para probar. Los puntos capturables llevan un único icono de control. El resto de los edificios y rutas se usa directamente. El mapa distingue propiedad, disponibilidad del servicio y posibilidad de reaparecer.

| Ubicación | Control y efecto |
|---|---|
| Refugio de facción | Capturable al asegurar el patio. Da acceso al almacén y, estando operativo, a la reaparición. Destruido o infestado queda inhabilitado. |
| Clínica de distrito | Capturable. Recuperación y posible puesto avanzado una vez habilitado y seguro. Las farmacias pequeñas son de acceso libre. |
| Estación principal y depósito ferroviario | Un único recinto capturable. Su control permite habilitar un punto de reagrupamiento junto al corredor ferroviario. |
| Taller central con almacén | Capturable. Guarda materiales, facilita reparaciones y puede habilitarse como puesto alternativo. Los pequeños talleres y almacenes de barrio son libres. |
| Subestación regional | Capturable en la ampliación que introduzca electricidad por sectores. Controla el servicio eléctrico local. No otorga reaparición. |
| Tiendas, supermercados, farmacias, gasolineras y mercado | Acceso libre para buscar, recoger o transportar suministros. |
| Viviendas, patios, plazas, aparcamientos y naves industriales comunes | Acceso libre. Ofrecen rutas, cobertura y espacio para expediciones e infectados. |
| Puentes, vías, carreteras y caminos rurales | Control físico. Se pueden vigilar, bloquear o despejar sin cambiar de propietario en el mapa. |

## 4. Zombis y frentes

Los infectados son una población independiente que ocupa edificios, calles y barrios. Los cercanos investigan ruidos locales. Una pelea sostenida o una alarma puede desviar una horda existente. El jugador debe poder oírla, verla llegar, interpretar por dónde avanza y aprovechar la zona que deja libre. Alternar lugares tranquilos, interiores con pocos infectados y concentraciones grandes. La distancia de atracción y la persistencia del ruido se ajustarán jugando.

Los zombis pueden dañar elementos del refugio, atravesar brechas e infestar instalaciones. Varias facciones pueden coincidir, evitarse o colaborar circunstancialmente. Comprobar si la horda crea decisiones diferentes a disparar o huir, y si sigue habiendo enfrentamientos entre facciones que se resuelven sin atraerla.

## 5. Objetos interactivos y destrucción

Ampliar el sistema existente de materiales y objetos. Ya hay cajas, vallas, barreras de plástico, sacos, bloques y barriles con fugas o explosiones. Para cada pieza nueva definir material, movilidad, respuesta al impacto, sonido, estados de daño, colisión, reparación si procede y efecto en navegación. Una abertura visible debe ser transitable por humanos y bots según su tamaño. Reservar las físicas detalladas para elementos que las necesitan y conservar el estado lógico al descargar un sector.

| Familia | Piezas previstas y función |
|---|---|
| Accesos | Portones, puertas dobles, verjas correderas, persianas, pasarelas, escaleras de servicio y tramos de muro reforzado. Alteran recorridos, protección y visibilidad. |
| Mobiliario urbano | Bancos de hormigón, jardineras, marquesinas, quioscos y contenedores con ruedas. Distinguir de un vistazo lo fijo, lo rompible y lo empujable. |
| Comercio y transporte | Carros de carga, palés, jaulas metálicas, mostradores, estanterías, taquillas, armarios de farmacia y cajas de suministros. Los objetos se recogen y transportan en el inventario personal. |
| Sonido y visibilidad | Alarmas de tienda, persianas ruidosas, focos de patio y cristaleras. Sus cambios se ven o se oyen desde el entorno. |
| Refugio | Puesto de recepción, camillas, mesas de reparación, depósitos de munición, tablón de expediciones y módulos de almacén. Cada pieza comunica qué se puede hacer cerca de ella. |

## 6. Vida, logística y mejora del refugio

Cada facción mantiene una guardia y distribuye a los demás agentes según las necesidades. El jugador puede asumir cualquiera de estas tareas o dejar que las atiendan los bots.

1. **Recibir compañías.** Vigilar accesos, abrir a quienes regresan y decidir cuándo cerrar si se aproxima una horda.
2. **Auxiliar y reparar.** Atender a los caídos, cerrar brechas y devolver instalaciones a su estado operativo. Los agentes priorizan peligro inmediato y accesos críticos.
3. **Organizar expediciones.** Reunirse en el patio, señalar el destino y dejar que el jugador se incorpore. Mantener personal suficiente en casa.
4. **Gestionar suministros.** Depositar y retirar objetos entre el inventario personal y el almacén. Los agentes gestionan las reservas y despachan material a quienes lo necesitan. Tres reservas físicas y reconocibles: materiales, munición y material médico. La reserva médica distingue botiquines de curación y kits de reanimación. El almacén muestra sus existencias mediante estantes, símbolos y cajas visibles. Se puede cargar, entregar o escoltar a quien transporta. Evitar medidores de hambre o sed y cadenas obligatorias de fabricación.

### Identidad visual de los cuatro refugios iniciales

Cada facción tiene un único refugio: la base fortificada donde empieza su gente. Las ubicaciones secundarias habilitadas para volver a la partida se llaman puntos de reaparición. Cada refugio cuenta con un patio de salida desde el que se reconocen la armería, el almacén y el puesto de auxilio. Los cuatro comparten un acceso de carga, un paso peatonal y un lenguaje de construcción: muros de bloque con juntas visibles y pilares de hormigón, portones de acero, cubiertas de chapa y estructuras de madera formadas por listones y travesaños, como las cajas y vallas actuales. Mantener proporciones, grosores, biseles y desgaste coherentes, legibles desde la cámara del juego en iPhone.

Cada facción se distingue por el emblema, una franja de color y la silueta de la entrada. Probar el emblema sobre un travesaño, entre dos pilares, en una marquesina corta o en un panel escalonado. Igualar protección inicial, anchura útil de los accesos y distancia de reaparición a la salida. Al conquistar un refugio cambian las señales de propiedad; las piezas, mejoras y reparaciones siguen contando la historia del edificio.

Desde dentro del refugio, jugadores y bots pueden ocupar los puestos de vigilancia y disparar a rivales o zombis con línea de visión, incluso cuando ya han cruzado una brecha. Cada puesto cubre un acceso distinto con protección parcial. La defensa depende de quién ocupa cada puesto y de cuándo se desplaza a cubrir el patio. La instalación interior que organiza las reparaciones se llama **Mantenimiento**. El término «taller» se reserva para ubicaciones del mapa.

### Reparación y mejora por pieza

Cada pieza tiene un nivel y una integridad independientes. Una reparación recupera al 100 % una pieza dañada o reconstruye una pieza rota en su nivel anterior. Una mejora exige que la pieza elegida esté intacta al 100 % y avanza exactamente un nivel. Los daños de otra pieza permiten seguir mejorando las que estén intactas. Cada tramo de muro se gestiona por separado. Las cuatro facciones comienzan con las seis partes en nivel 1, con idénticas opciones hasta el nivel 3. El refugio carece de nivel global.

| Parte | Nivel 1 | Nivel 2 | Nivel 3 |
|---|---|---|---|
| Muro, por tramo | Bloques con pilares. | Contrafuertes que aumentan la resistencia. | Revestimiento reforzado que retrasa la apertura de una brecha. |
| Portón principal | Portón de acero estándar. | Marco y hojas reforzados. | Segunda puerta interior que permite cerrar el paso aunque caiga la exterior. |
| Almacén | Un módulo de estantería por tipo de reserva. | Dos módulos por reserva, el doble de capacidad inicial. | Tres módulos por reserva, el triple de capacidad inicial. |
| Enfermería | Una camilla operativa. | Dos aliados atendidos simultáneamente. | Tres aliados atendidos simultáneamente. |
| Mantenimiento | Un puesto de reparación. | Dos reparaciones simultáneas. | Tres reparaciones simultáneas. Cada trabajo requiere un agente y materiales disponibles. |
| Puesto de vigilancia | Un puesto en la entrada. | Segundo puesto que cubre otro sector. | Tercer puesto para el acceso trasero. Cada puesto requiere un agente y visión directa. |

Al acercarse a una pieza dañada se ofrece «Reparar». Una vez intacta, si aún puede subir de nivel, la acción indica la mejora concreta, su coste y su efecto antes de confirmar. Ejemplo: un portón de nivel 2 al 40 % primero se repara; al llegar al 100 % permite elegir «Mejorar a nivel 3 · Añadir puerta interior». En nivel 3 sigue siendo reparable.

Los agentes atienden reparaciones ordinarias con las existencias del almacén. El jugador elige las inversiones de su facción y las facciones controladas por bots priorizan según daños, ocupación y reservas. Al confirmar una mejora, el almacén reserva los materiales una vez. Un agente ejecuta el trabajo, el jugador puede ayudar y una alarma permite interrumpirlo y retomarlo. La reparación se reconoce por las piezas repuestas y la mejora por la nueva estructura visible. Quedan por equilibrar costes y tiempos, y por decidir cómo se autoriza el gasto compartido en el futuro online.

## 7. Pérdida de refugios, ocupación y reaparición

Una brecha abre un acceso. El refugio todavía puede defenderse. Una facción rival que despeja y mantiene el patio puede conquistar el recinto. Si lo desbordan los zombis queda infestado. Las reservas que siguen dentro pueden caer en manos del conquistador o quedar allí para una recuperación posterior. Poder evacuar suministros en el inventario o a un compañero antes de perder la base da valor a la retirada.

**Un refugio destruido jamás sirve como punto de reaparición mientras siga destruido.** Tampoco se reaparece en un recinto infestado o perdido ante otra facción. El estado de cada punto debe comprobarse al reaparecer, incluso si cambió después de seleccionarlo. Los supervivientes conservan su ubicación. La facción puede haber habilitado otra clínica, taller o puesto seguro antes de perder la base, o buscar uno después. Quienes caigan esperan si no existe un puesto operativo. Para la campaña de prueba, se propone eliminación cuando la facción se queda sin puesto y sin miembros vivos capaces de recuperarla. No se concede un refugio permanente ni una reaparición automática en las afueras.

## 8. Reanimación de compañeros

**Acuerdo:** una caída reciente puede dar lugar a un rescate. Reanimar ocurre en el lugar de la caída, antes de la muerte definitiva. Reaparecer usa un puesto válido después de morir. Perder un refugio afecta a la reaparición, incluso si un compañero todavía puede auxiliarte sobre el terreno.

**Primera regla de equilibrio propuesta, pendiente de probar:** al agotarse la vida, un aliado queda abatido por un tiempo limitado. Mientras esté abatido deja de combatir y se señala a los aliados próximos. Un jugador o bot que lleve un kit de reanimación se acerca y mantiene «Reanimar». Un indicador muestra el tiempo restante. Alejarse, soltar la acción o recibir daño interrumpe al rescatador. La reanimación completada consume un kit de reanimación de un solo uso y devuelve al compañero con salud parcial. Un único rescate puede completarse por caído, con un solo consumo aunque dos aliados lo intenten. El abatido sigue recibiendo daño de enemigos y zombis. Si ese daño resulta letal o se agota el plazo, muere y queda sujeto a las reglas de reaparición. Si muere durante el rescate, se cancela la acción sin consumir el kit. El botiquín común sirve para curar a un aliado en pie.

Como punto de partida, permitir **una reanimación por vida**. Si el mismo personaje vuelve a caer antes de reaparecer, pasa a muerte definitiva. La duración, salud recuperada y disponibilidad de kits de reanimación se ajustarán en partidas. La IA debe valorar si puede alcanzar al herido y evitar que varios agentes abandonen la guardia por un mismo rescate. Probar también la caída simultánea de los últimos aliados, para resolver la campaña sin esperas indefinidas.

## 9. IA, rendimiento y futura red

- La facción distribuye guardia, logística, expediciones y puestos alternativos. La compañía puede cambiar su plan al sufrir bajas, perder una ruta, avistar una horda o llevar carga valiosa. Cada agente responde a percepción propia y avisos aliados. Conservar la última posición conocida cuando se pierde contacto.
- Los agentes deben poder usar las interacciones del entorno bajo las mismas reglas del jugador, incluidas puertas, inventarios, almacenes, reparación y reanimación. Reutilizar los sistemas de combate existentes y añadir decisiones donde hagan falta.
- Simulación detallada cerca de los participantes y simplificada para grupos lejanos. Conservar identidad, integrantes, bajas, posición, carga, destino y estado del territorio al pasar de un nivel de detalle a otro. Poder volver al segundo frente y encontrar el resultado de lo ocurrido.
- Escalar de 32 a 64 y después a 128 combatientes regionales, con zombis contabilizados aparte. Primera meta jugable de 64 en total, un jugador y 63 bots. Ensayo concentrado de 24–32 combatientes y una horda con destrucción, humo y audio. Medir tiempos de fotograma y simulación, tirones, navegación y respuesta del mando en iPhone con DualSense. Son objetivos sin rendimiento validado.
- Si se decide pasar a online, el servidor mantendrá la autoridad sobre daño, recursos, refugios, rescates y reapariciones. Un humano podrá ocupar una plaza del sistema de facciones. El nivel de detalle dependerá de todos los jugadores presentes. Complementar bots con clientes de red simulados, latencia y dispositivo real. La cifra de bots por sí sola no valida la concurrencia online.

## 10. Orden de implementación y pruebas de aceptación

| Etapa | Entrega jugable | Cómo saber si funciona |
|---|---|---|
| 1. Distrito y guerra | Cuatro facciones, compañías, dos frentes, infectados y una horda. | Entrar, elegir entre dos destinos y encontrar un frente cambiado al regresar. La horda se aproxima por una ruta legible y altera una decisión. |
| 2. Entorno y refugios | Primer recorrido entre tienda, gasolinera, clínica, estación, taller y refugio. Accesos y materiales con comportamientos distintos. | Bot y jugador usan una brecha recién abierta. Probar la defensa desde dentro con un jugador y un bot ante enemigos que llegan al portón o atraviesan una brecha. Al volver se entiende en segundos si conviene abrir, auxiliar o reparar. |
| 3. Logística y mejoras | Recogida, entrega y reservas. Validar primero portón, almacén y enfermería, y completar las seis partes y sus tres niveles. | Un integrante recoge materiales en su inventario y los deposita en el almacén para reparar una entrada. Comprobar que reparar conserva el nivel, que solo se mejora la pieza elegida al 100 % y que interrumpir o repetir la acción no duplica materiales. Verificar el efecto de cada nivel, incluida la segunda puerta tras caer la exterior. |
| 4. Caídas y cambios de control | Reanimación, conquista, infestación, destrucción, retirada y puesto alternativo. | Probar rescate sin kit, muerte por daño durante el rescate, rescate interrumpido, rescate simultáneo, segunda caída y pérdida del puesto durante la espera. Con la base destruida se reaparece únicamente en otro puesto válido. |
| 5. Escala y decisión online | Multiplicar compañías y sectores tras validar el primer distrito. | Probar quince minutos sin límite de bajas, tanto en un sector concurrido como entre frentes. Registrar decisiones espontáneas, rescates repetidos, tiempos de regreso y rendimiento real. Decidir después si avanzar al ensayo multijugador. |

Para trabajar en paralelo, dividir por entregas que puedan probarse y coordinar cambios que compartan navegación, reglas de vida o generación del juego. Documentar en cada entrega lo verificado automáticamente, lo probado jugando y lo pendiente en dispositivo real.
