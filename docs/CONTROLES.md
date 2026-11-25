# Controles — v0.2.2

## Cambiar de mapa (en cualquier momento)
- **Options** (mando) / **P·Esc** (teclado) / botón **⚙ Menú** (táctil): abre el menú con el juego en pausa. Arriba está MAPA: ↑↓ elegir, ✕ aceptar (o tocar la fila). Options vuelve a cerrar.
- Mapas 1 (arena) y 2 (polígono) y paso a mapa 3: al instante. Desde el mapa 3 a 1/2 se recarga la página (hay que tocar la pantalla para empezar). También por URL: `?mapa=1|2|3`.

## Mapa 3 (partida 6 vs 6)
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
