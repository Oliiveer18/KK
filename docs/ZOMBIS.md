# Zombis de la campaña (v0.3.9, rama de campaña; `?mapa=4`)

## Postura y disparos en Distrito completo

Los cuatro tipos caminan con una inclinación moderada, hombros desiguales y movimiento de cabeza. En reposo y al rondar llevan los brazos más bajos; al perseguir o atacar los levantan. El láser y las balas comparten la comprobación de impacto en el plano del juego, con la posición animada de pecho y cabeza además del volumen del cuerpo. Con ratón, apuntar directamente al pecho o la cabeza tiene en cuenta la perspectiva de la cámara. Los impactos conservan el daño del arma y los obstáculos siguen interceptando los disparos.


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
- **HUD**: «☣ n» junto al título de la campaña. **Barra de vida** sobre cada zombi herido (4 s tras el último daño; máx. 14): chaflán inclinado como las de los combatientes, sin rombo, relleno verde/amarillo/rojo por porcentaje, drenaje suave con trozo naranja del daño reciente; el pesado la lleva más ancha y gruesa (74 px, 6 px). **Colocación común con las barras de los combatientes**: la barra sigue a la **cabeza real** de cada personaje (no a los pies: los zombis van encorvados y la cabeza se adelanta), centrada en ella y con su base 0,5 m por encima de la coronilla; se coloca al final del fotograma, con la cámara ya movida (`MX.placeBars` / `MX.zom.place`). Además salen los números de daño de tus impactos.

## Aspecto y rendimiento
Dibujo instanciado: 20 mallas para todos los zombis (pecho, abdomen, pelvis, hombros, cuello, cabeza, mandíbula, pelo, brazos de 3 segmentos con codo y mano, piernas de 3 segmentos con rodilla y pie, harapos delante y detrás, heridas, ojos hundidos y brillantes, hueso al aire, bultos). Añadir detalle no multiplica las llamadas de dibujo por zombi. Paleta sucia y apagada (piel verde-gris, ropa gastada oscura). Cada zombi es distinto: complexión, postura, hombros desiguales, pelo o calvo, brazos desnudos, heridas, harapos, hueso, calzado. Animación por fórmulas: marcha irregular con rodillas flexionadas y pie arrastrado (cojera), cabeza que bambolea y cae, espasmos ocasionales, mandíbula que se abre (más al gritar o atacar), brazos adelantados con antebrazo caído, golpe a dos brazos, grito con la cabeza hacia atrás, caída y levantarse. Pesado con barriga hinchada y hombros enormes; gritón con cuello hinchado. Con ~240 zombis unas 230 llamadas de dibujo en total (Chrome headless; sin medir en iPhone). Captura: `docs/img/zombis.png`.

## Sonidos (pendientes de generar con ElevenLabs; sin muestra callan)
`ZOM_groan` (dormido/rondar), `ZOM_alert` (empieza a perseguir), `ZOM_attack`, `ZOM_hurt`, `ZOM_death`, `ZOM_scream` (gritón), más pasos y ambiente de horda a decidir. Ya cableados con `playAt`.

## Pendiente / a probar jugando
Equilibrio (vida, daño, velocidades, cuántos zombis, la horda), infestación de refugios, puertas y brechas, simulación simplificada de grupos lejanos (LOD), pesado de más objetos, sonidos.

## Obstáculos y movimiento (v0.3.10)
- Rodeo inmediato: antes de avanzar miran 1,5 m por delante en la malla de navegación y, si hay obstáculo, giran hacia el lado libre (cada zombi tiene su lado). Si el objetivo está tapado (`MX.lineFree`), piden ruta A* ya, sin esperar a atascarse.
- Atasco detectado en 0,6 s (antes 1,2 s). La animación de andar sigue el avance real (`z.mv`): ya no caminan quietos.
- Cola de rutas justa: los que se quedan sin turno de A* acumulan prioridad (`z.starve`) y pasan antes.
- Sin ruta posible: golpean lo que tengan pegado (14 de daño, el pesado 45).
- La malla de navegación se rehace al instante con cualquier evento de `OBJ.on` (abrir, cerrar, romper, colocar), no sólo cada 0,5 s.
- Corredor flanquea al acercarse; gritón se frena a 9 m; al perder al objetivo van a donde iba, no a donde estaba.
- Test: `tests/zombis_obstaculos.py` (muro de 18 m, 40 zombis, paso que se abre). Sin probar: flanqueo, gritón y golpeo sin ruta (no tienen test propio), nada en iPhone.

## Población del distrito y simulación por cercanía (26-11)
- **Cuántos:** ~540–620 en el mapa 6 (antes ~80), con reposición hasta 560 vivos en grupos de 2–4, siempre a más de 70 m de cualquier combatiente (nunca aparecen a la vista). Límite de 720 simulados.
- **Dónde (como vivía la gente):** densidad por zona (residencial 14, casco 13, comercios y Fábrica/Estación 12, aldea 11, puesto avanzado 6, granjas 4, bosques 3 por zona del cuarto); 1 de cada 4 edificios tiene uno o dos dormidos dentro; refugios limpios al empezar. Se reparte en el cuarto Azul y se copia girado: **igual para las 4 facciones** (y los objetivos comunes, a 180°).
- **Hordas:** 4 (una por cuarto) que migran entre barrios a 120–320 m; acuden al ruido como antes. Si caen, aparece otra lejos de todos.
- **Simulación por cercanía:** completa sólo a menos de 75 m de algún combatiente (o si persiguen, investigan un ruido o están muertos); lejos, cada 0,5 s y barata (los dormidos no hacen nada; las hordas avanzan por la malla de navegación y, fuera de la vista de todos, rodean o saltan lo que las tapa).
- **Dibujo:** sólo los más cercanos a la cámara (≤ 46 m, máx. 180) en huecos compactos de las mallas instanciadas; al cambiar de hueco se copian sus colores. Coste medido (headless, 100 combatientes + ~600 zombis): ~3,5 ms por actualización.
- Tests: `tests/zombis_distrito.py` (nuevo), `tests/zombis.py` (límite 720 y máx. 180 dibujados).


## Más población (27-11)
~950 en el distrito al empezar (densidades ×1,6), 4 de cada 10 edificios con zombis dentro, 8 hordas (dos por cuarto) y reposición hasta 880 vivos; límite de 1.100 simulados. Coste medido: ~4 ms por actualización con 100 combatientes (headless).
