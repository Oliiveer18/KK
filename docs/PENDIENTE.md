# Propuestas pendientes (índice) — NO empezar ninguna sin que el usuario la pida

- Mapa 3: probar a mano (mando/móvil), ajustar dificultad, ambiente y tamaño; sonidos propios de partida (ElevenLabs). Hecho en v0.3.9: HUD (barras, kill feed), tabla de resultados, selector de mapa, `HIT_marker`/`HIT_kill`.
- Sonidos de combate: más variantes de `HIT_marker` y `HIT_kill` (renombrar a `_01`, `_02`…); si el marker no se oye en el altavoz del iPhone, tomas con más clic (2–4 kHz). Críticos de cabeza (zona de cabeza en impactos).

Todas están aplazadas; son propuestas, no tareas en curso.
1. **Sonidos de movimiento:** aterrizaje/frenada tras el dash (2 variantes), roce de ropa y equipo (2), 3.ª toma de paso opcional; pasos por superficie más adelante. El usuario genera los audios; hay que darle el prompt y la duración de cada uno.
2. **Sistema de rareza** (común → legendaria, mejora única 0/3/6/9/12 %): idea aprobada; falta una propuesta corta escrita antes de implementar nada.
3. **Volúmenes** (`SND_VOL`): ajustar a oído con el feedback del usuario.
4. **Modelos de armas con Meshy:** pendiente.
5. **Gatillos adaptativos del DualSense** (WebHID, Chrome/Edge de escritorio): aplazado.
6. **Calidad adaptativa por resolución en Mac:** solo si el usuario la pide (no bajar calidad visual por defecto).
7. **Marcas de bala:** posible ajuste de tamaño/contraste (la mancha de quemado ya se suavizó en v0.2.2).
8. **Vida de los restos de la valla:** se ofreció acortarla a ~8 s; sin respuesta del usuario.
9. **Código sin usar:** `spawnPick`/`updatePicks` (granada recogible desactivada a petición del usuario).
Retirado por el usuario: choques entre trozos de restos (no volver a proponer).

---

# Pendiente: propuestas (gatillos y vibración)

Estado: **sin implementar**. Decisión aplazada por el usuario. El código de v0.1.0 no cambia por este documento.

## Problema
Probado por el usuario con DualSense real en iPhone (Safari):
- La **vibración** no funciona.
- La **dureza de los gatillos** no se puede controlar desde el navegador.
- Los **umbrales analógicos** de L2/R2 por arma (fusil, pistola y escopeta) no se notan, así que no aportan nada ahora mismo.

## Propuesta A — Usar la presión del gatillo en el juego (sin hardware)
Es la opción que se notaría sin depender de vibración.
- **L2 progresivo:** apretar a medias cierra la mira y el zoom a medias; a fondo se apunta del todo.
- **R2 por arma:**
  - Escopeta: solo dispara al apretar a fondo (pulsación deliberada).
  - Pistola: dispara a media pulsación (semiautomática).
  - Fusil: a más presión, algo más de cadencia (automático).
- **Ventajas:** funciona con cualquier mando que dé valores analógicos; no depende del navegador de vibración.
- **Riesgos:** si Safari/iOS reporta los gatillos casi como botón (pulsado o no), el efecto sería pobre. Habría que medir el rango real de `buttons[6]` y `buttons[7]` en el iPhone antes de decidir.

## Propuesta B — Vibración real en otro entorno
- **Chrome de escritorio** (Windows, Mac o Linux): `vibrationActuator` con `dual-rumble` probablemente funciona. Sin confirmar. Es una prueba rápida y no requiere cambios de código.
- **App nativa** (iOS o PC): permite vibración completa y gatillos adaptativos del DualSense.
  - iOS: GameController framework (haptics y gatillos adaptativos).
  - PC: motor como Unity o Unreal, o una librería específica del DualSense.
- **Ventajas:** gatillos con resistencia distinta por arma, vibración fina.
- **Riesgos:** deja de ser una página web y hay que replantear el desarrollo y la distribución.

## Propuesta C — Mantener solo lo visual
Sin vibración ni gatillos adaptativos, compensar con feedback visual y de cámara:
- Más retroceso y temblor de cámara por arma.
- Destello de boca de cañón y casquillos ya implementados.

## Decisión pendiente
Elegir A, B, C o una combinación. Antes de decidir, medir en el iPhone el rango real de L2/R2 (si son analógicos o casi todo/nada).

## Referencias en el código
- Umbrales por arma: `tr` (R2) y `ta` (L2) en `WP`, y la lectura en el bloque de entrada del mando.
- Vibración: función `rumble(ms, fuerte, débil)`.

- Gatillos adaptativos del DualSense (aplazado por decisión del usuario): requeriría WebHID (Chrome/Edge de escritorio), botón opcional "Activar gatillos", un perfil por arma y un disco de prueba en el polígono. Duda abierta: el enlace publicado probablemente lo bloquea (sandbox); funcionaría abriendo el index.html en local. No se puede probar sin un DualSense real.

## Rendimiento en Mac (30 FPS en pantalla grande)
- Medido (clic en el cuadro de FPS → diagnóstico): lógica 0,7 ms, dibujo CPU 4,4 ms, 93 llamadas, 3k triángulos, 2092×1168 → la CPU no limita.
- Falta el dato «GPU X ms» (Chrome) y saber si hay Modo de bajo consumo/batería. Sin ese dato no se optimiza nada.
- Regla del usuario: no bajar calidad visual. Las optimizaciones de CPU (instancing, etc.) no ayudarían.

## Estado de la v0.2.2 (25-11)
- Rendimiento Mac: hecho lo posible sin bajar calidad (13,3 → 8,5 ms GPU a pantalla casi completa; ~14 ms/40 FPS a pantalla muy grande). El usuario dijo que si no se puede mejorar, lo deja. Opción solo si la pide: calidad adaptativa según resolución.
- Sonidos de movimiento pendientes: aterrizaje/frenada tras el dash (2 variantes), roce de ropa y equipo (2), una 3.ª toma de paso; pasos por superficie quedan para más adelante.
- Rareza (común → legendaria, mejora única 0/3/6/9/12 %): aprobada en idea; falta una propuesta **corta escrita** antes de implementar nada.
- Volúmenes (`SND_VOL`): ajustar a oído con el feedback del usuario.
- Modelos de armas con Meshy: pendiente. Gatillos adaptativos (WebHID): aplazado.
- Marcas de bala: posible ajuste de tamaño/contraste; la mancha negra tras una explosión ya se suavizó (v0.2.2).
- Código sin usar: `spawnPick`/`updatePicks` (granada recogible, desactivada a petición del usuario).
- Choques entre trozos: probados y retirados a petición del usuario (no volver a proponer salvo que lo pida).
