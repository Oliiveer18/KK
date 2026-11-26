# Controles — v0.3.9

## Cambiar de mapa (en cualquier momento)
- **Options** (mando) / **P·Esc** (teclado) / botón **⚙ Menú** (táctil): abre el menú con el juego en pausa. Arriba está MAPA: ↑↓ elegir, ✕ aceptar (o tocar la fila). Options vuelve a cerrar.
- Mapas 1 (arena) y 2 (polígono) y paso a mapa 3: al instante. Desde el mapa 3 a 1/2 se recarga la página (hay que tocar la pantalla para empezar). También por URL: `?mapa=1|2|3`.

## Mochila y almacenes (campaña)

Abre **Mochila** en pantalla, pulsa **I** en teclado o el panel táctil del DualSense. En el mando recorre las opciones con ↑/↓, elige con ✕ y cierra con ○. La mochila muestra cantidades, espacio ocupado y acciones para los suministros que estén a tu alcance. En las estanterías puedes depositar y retirar una unidad por acción.

Los materiales, la munición, el botiquín para curar y el kit para reanimar viajan en el inventario. En la mochila puedes usar un botiquín si estás herido o munición si el cargador está incompleto. Para rescatar a un aliado se usa el control de reanimación de siempre. Los depósitos médicos guardan ambos tipos de kit. El equipo se guarda en la estantería de materiales. La primera calibración admite 6 unidades sin mochila y 10, 14 o 18 según su nivel.

Al caer abatido conservas tus objetos. Tras la muerte definitiva, una mochila en el lugar de la baja identifica el equipo del eliminado. Aliados y rivales comparten ese botín. Reapareces con el inventario vacío. Los puntos de recogida, botines y reservas duran la partida actual.

## Campaña (?mapa=4)
- **Reanimar** a un aliado abatido: acércate (≤1,5 m) y **mantén □ (mando) o R/E (teclado)** 3 s. Necesitas kit (✚ junto al escudo). Junto a un abatido el □ no recarga el arma. Soltar, alejarte o recibir daño lo interrumpe.
- **Si caes abatido** (25 s): espera ayuda o **mantén □ (R) 0,8 s para reaparecer al instante en tu refugio** (cuenta como baja; reapareces con la vida completa y sin esperar). Un mensaje en pantalla te lo recuerda.
- **Táctil:** mantener el botón (invisible) de RECARG. hace lo mismo que □: reanima junto a un abatido o reaparece si estás abatido.

## Mapa 3 (partida 6 vs 6)
- Pantalla: vida y escudo abajo a la izquierda; arma, munición, granadas y dash abajo a la derecha; kill feed arriba a la derecha (tus bajas con borde dorado). Ya no hay chuleta de controles en pantalla: están aquí.
- △/Q: tocar = alternar las 2 principales; mantener (≥0,3 s) = pistola, mantener otra vez = volver a la principal.
- Armería en la base azul (izquierda): pisar una peana equipa el arma; pad verde = munición completa.
- Tras terminar: REVANCHA (botón o ✕ del mando).

## Mando PS5 (DualSense)
| Botón | Acción |
|---|---|
| Stick izquierdo | Mover |
| Stick derecho | Girar / apuntar (giro directo) |
| L2 | Apuntar (ADS). Umbral según arma: fusil ~15 %, pistola ~35 %, escopeta ~60 % |
| R2 | Disparar. Umbral según arma: fusil ~18 %, pistola ~50 %, escopeta ~80 % |
| ■ (cuadrado) | Recargar |
| ● (círculo) | Agacharse / levantarse (alterna) |
| ▲ (triángulo) | Cambiar de arma |
| R1 | Granada de mano: mantener = ver dónde cae (distancia fija 7 m); stick derecho = dirección, cruceta ←→ afina; soltar = lanzar. Sin dash ni cambio de arma con la cruceta mientras se sostiene |
| L1 | Bomba de humo (igual que la granada, fuse 1,4 s) |
| L2 (lanzagranadas H2) | Apuntar con distancia fija de 15 m; stick derecho dirección, cruceta ←→ afina |
| R3 (pulsar) | Dash. Toque = corto; mantener = más largo (hasta ~0,47 s) |
| L3 (pulsar) | Correr. Un toque y sigues corriendo mientras te muevas |
| Options | Menú de configuración (reasignar botones y calibrar sticks) |

## Teclado y ratón
WASD mover · ratón girar · clic izq. disparar · clic der. apuntar · R recargar · C agacharse · Q arma · G granada · H humo · Espacio dash (mantener = más largo) · Shift correr · P/Esc menú.

## Táctil
Stick flotante izquierdo (mover) y derecho (apuntar/disparar), además de botones. Los controles visuales están ocultos por decisión de diseño, pero funcionan.

## Cobertura y objetos (v0.2.0)
- Pégate a un objeto bajo (barrera de plástico, valla, sacos, bloques, caja pequeña) y disparas por encima de él, sin romperlo. Aléjate (> 1 m) para dispararle.
- Agachado (●) tras la cobertura te escondes más; al apuntar o disparar te asomas.
- Camina contra cajas, barreras y barriles para empujarlos; el dash empuja más fuerte.
- Barra DASH: azul = lista, celeste = en uso, gris = recargando, parpadeo rojo = pulsado sin estar lista.

## Cuadro de FPS (clic) = diagnóstico
Clic en el cuadro de FPS muestra GPU, lógica, dibujo (CPU), llamadas, triángulos y resolución (el Mac del usuario no tiene teclas F; F3 hace lo mismo en otros teclados).

## Notas
- Los controles guardados en el navegador usan la clave `bind4`; los valores por defecto anteriores se descartaron.
- Vibración: implementada con Gamepad API (`dual-rumble`) y `navigator.vibrate`, pero **no funciona en Safari de iPhone** con DualSense (comprobado por el usuario). Los gatillos adaptativos (resistencia física) no se pueden controlar desde el navegador.

### Protección en campaña

Casco ligero, medio y pesado aportan 10, 20 y 30 de protección. Los chalecos aportan 25, 50 y 70. La mochila muestra el estado actual y máximo de cada pieza. Usa **Equipar** para cambiarla. Al recoger una pieza con la ranura vacía se equipa automáticamente. El daño se reparte entre las piezas equipadas según la protección restante. El exceso alcanza la vida. Guardar, retirar o recuperar la pieza de un eliminado conserva su desgaste.

Desde la mochila, una unidad de material cerca de un punto de salida del refugio propio o un kit de reparación en cualquier lugar restaura una pieza. Las estanterías de materiales ofrecen equipo y un kit inicial, y las cajas de materiales también contienen un kit. La protección no se regenera sola.

### Mapa 4 · Obras en el refugio azul

Retira materiales de la estantería del refugio (48 unidades iniciales en esta prueba). Acércate al portón o a la empalizada contigua, en el lado de la base que da al centro. Abre la mochila con el panel táctil del DualSense o con **I**. Usa ↑/↓ y ✕ para elegir la obra. El coste y el tiempo restante aparecen antes de confirmar. Quédate cerca y deja libre el hueco al terminar. La puerta también se puede abrir o cerrar desde la mochila.

| Pieza | Reparación de una brecha | Mejora a nivel 2 | Mejora a nivel 3 |
|---|---|---|---|
| Tramo de muro | 1 material, 4 s | 3 materiales, 10 s | 6 materiales, 10 s |
| Portón | 2 materiales, 5 s | 4 materiales, 12 s | 8 materiales, 12 s |

La reparación parcial cuesta en proporción al daño, con un mínimo de una unidad. Reconstruir conserva el nivel. Solo una pieza intacta admite mejora. El tercer nivel del portón añade una segunda puerta que se puede abrir y reparar por separado. Alejarse, recibir daño o una alarma a menos de 25 m interrumpe la obra. Al retomar la misma acción se conserva el avance y los materiales se descuentan una sola vez, al terminar. El distrito oficial conserva su propia distribución.
