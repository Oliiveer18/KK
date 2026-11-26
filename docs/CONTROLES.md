# Controles — v0.3.9

## Cambiar de mapa (en cualquier momento)
- **Options** (mando) / **P·Esc** (teclado) / botón **⚙ Menú** (táctil): abre el menú con el juego en pausa. Arriba está MAPA: ↑↓ elegir, ✕ aceptar (o tocar la fila). Options vuelve a cerrar.
- Mapas 1 (arena) y 2 (polígono) y paso a mapa 3: al instante. Desde el mapa 3 a 1/2 se recarga la página (hay que tocar la pantalla para empezar). También por URL: `?mapa=1|2|3`.

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

## Escuadra (campaña, mapas 4–6)
Las órdenes sólo funcionan si tienes el mando de tu escuadra (★ en el panel de la izquierda). La cruceta no da órdenes mientras apuntas una granada o el lanzagranadas, ni en el polígono.

| Mando PS5 (cruceta) | Toque | Mantener (½ s) | Teclado |
|---|---|---|---|
| ← | **Seguirme**: formación abierta detrás de ti | **Unirse** a la escuadra amiga más cercana (< 60 m) | 1 · 5 |
| ↓ | **Mantener posición**: se reparten en arco donde estás, a cubierto, mirando hacia donde apuntas | **Ir por libre** (escuadra de 1) | 2 · 7 |
| ↑ | **Avanzar**: van al punto 22 m delante de donde apuntas y lo mantienen | **Reagrupar**: todos contigo, ya | 3 · 8 |
| → | **Fuego de cobertura**: 10 s de supresión hacia donde apuntas | **Tomar / ceder el mando** (lo recibe el mejor de la escuadra) | 4 · 6 |

- Si el líder cae (también tú), el mejor vivo de la escuadra toma el mando. Para recuperarlo, mantén →.
- Un anillo en el suelo marca el punto de la orden: verde (mantener), azul (avanzar) o naranja (zona de cobertura).

