# Zombis de la campaña (v0.3.9, rama de campaña; `?mapa=4`)

Implementado en `src/zombis.js` (se incrusta con `tools/build.py`). Decisiones del usuario (25-11): los zombis atacan por igual a las 4 facciones y hay 4 tipos. **Los combatientes caídos NO se convierten en zombis** (se había implementado y se quitó el mismo día).

## Tipos
| Tipo | Vida | Daño | Velocidad (rondar / perseguir) | Notas |
|---|---|---|---|---|
| Caminante | 70 | 12 | 0,9 / 2,4 m/s | el común; cojea de una pierna al azar |
| Corredor | 45 | 8 (golpe rápido) | 1,2 / 5,0 m/s | raro, más campo de visión (18 m) |
| Pesado | 320 | 38 | 1,0 / 2,0 m/s | ×1,32 de tamaño; destruye cajas, vallas y barriles que tiene delante |
| Gritón | 60 | 6 | 1,0 / 2,3 m/s | grita (ruido de 48 m) cada 7–12 s mientras persigue y despierta a los dormidos |

## Comportamiento
- **Estados**: dormido, rondar, investigar un ruido, perseguir, atacar y caído (se hunde a los 14 s).
- **Población**: zombis locales dormidos en puntos del mapa y una horda itinerante (17 miembros) que recorre el mapa por rutas A*. Se repuebla sola (hasta 60 vivos, grupos de 3–4 lejos de los combatientes) y, si la horda cae, aparece otra a los ~24 s. Máximo 240.
- **Ruido** (`MX.zom.shot/noise/blast`): disparos 24–55 m según arma, explosiones 62 m, gritos 48 m. Los dormidos oyen al 65 % del radio. Un ruido fuerte cerca desvía a la horda.
- **Atacan a todos** los combatientes vivos o abatidos (jugador y bots, cualquier facción) a ≤14 m (5,5 m si duermen). Al ver a uno, alertan a los cercanos.
- **Bots**: ven a los zombis como amenaza (24 m) y les disparan; las balas de cualquiera dañan a los zombis (`MX.zom.hit` desde `updateBullets`). El marcador no cuenta zombis.
- **HUD**: «☣ n» junto al título de la campaña. **Barra de vida** sobre cada zombi herido (4 s tras el último daño; máx. 14): chaflán inclinado como las de los combatientes, sin rombo, relleno verde/amarillo/rojo por porcentaje, drenaje suave con trozo naranja del daño reciente; el pesado la lleva más ancha y gruesa (74 px, 6 px). **Colocación común con las barras de los combatientes**: centrada sobre el personaje y con la base 0,5 m por encima de la coronilla (combatiente: 1,8 m − 0,25·agachado; zombi: altura de coronilla según su postura y tamaño); se colocan al final del fotograma, con la cámara ya movida (`MX.placeBars` / `MX.zom.place`), para que no vayan un fotograma por detrás. Además salen los números de daño de tus impactos.

## Aspecto y rendimiento
Dibujo instanciado: 20 mallas para todos los zombis (pecho, abdomen, pelvis, hombros, cuello, cabeza, mandíbula, pelo, brazos de 3 segmentos con codo y mano, piernas de 3 segmentos con rodilla y pie, harapos delante y detrás, heridas, ojos hundidos y brillantes, hueso al aire, bultos). Añadir detalle no multiplica las llamadas de dibujo por zombi. Paleta sucia y apagada (piel verde-gris, ropa gastada oscura). Cada zombi es distinto: complexión, postura, hombros desiguales, pelo o calvo, brazos desnudos, heridas, harapos, hueso, calzado. Animación por fórmulas: marcha irregular con rodillas flexionadas y pie arrastrado (cojera), cabeza que bambolea y cae, espasmos ocasionales, mandíbula que se abre (más al gritar o atacar), brazos adelantados con antebrazo caído, golpe a dos brazos, grito con la cabeza hacia atrás, caída y levantarse. Pesado con barriga hinchada y hombros enormes; gritón con cuello hinchado. Con ~240 zombis unas 230 llamadas de dibujo en total (Chrome headless; sin medir en iPhone). Captura: `docs/img/zombis.png`.

## Sonidos (pendientes de generar con ElevenLabs; sin muestra callan)
`ZOM_groan` (dormido/rondar), `ZOM_alert` (empieza a perseguir), `ZOM_attack`, `ZOM_hurt`, `ZOM_death`, `ZOM_scream` (gritón), más pasos y ambiente de horda a decidir. Ya cableados con `playAt`.

## Pendiente / a probar jugando
Equilibrio (vida, daño, velocidades, cuántos zombis, la horda), infestación de refugios, puertas y brechas, simulación simplificada de grupos lejanos (LOD), pesado de más objetos, sonidos.
