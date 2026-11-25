# Prototipo shooter 3D de movimiento procedural — v0.2.2

Prototipo jugable en el navegador, **sin modelos ni animaciones prefabricadas**: el personaje es un esqueleto de primitivas animado por código (IK de 2 huesos, pasos por fases, retroceso con muelles). Pensado como base de un futuro juego online por facciones y mundo persistente.

## Cómo jugarlo
1. Abre `index.html` en un navegador moderno (Chrome, Safari o Edge). Es un único archivo con Three.js r128 incluido, no necesita internet ni servidor.
2. Pulsa **EMPEZAR**.
   (v0.2.2: 10 armas con sonido, balística, granadas y humo nuevos, barriles y marcas de bala con relieve, pasos; ver `docs/CHANGELOG.md`.)
3. Mando PS5 (DualSense), teclado y ratón, o táctil (los controles táctiles son invisibles pero funcionan).

## Contenido
| Ruta | Qué es |
|---|---|
| `index.html` | Juego completo, autocontenido (esto es lo que se publica) |
| `src/prototipo.html` | Código fuente editable (carga Three.js desde CDN) |
| `src/three.min.r128.js` | Three.js r128 (se incrusta en `index.html`) |
| `src/objetos.js` | Objetos de campaña (49 tipos, recogibles, raíles); ver `docs/CATALOGO_OBJETOS.md` |
| `src/sonidos.js` | Audio incrustado (generado por `tools/build.py`, no editar a mano) |
| `assets/audio/` | Sonidos originales (`originales/`) y `manifest.json` con recorte, fundido y nivel de cada uno |
| `tools/build.py` | Procesa el audio, genera `src/sonidos.js` y regenera `index.html` |
| `docs/CONTROLES.md` | Mapa de controles |
| `docs/CHANGELOG.md` | Historial de cambios |
| `docs/ESTADO.md` | Estado, qué se ha verificado y qué falta |
| `docs/PENDIENTE.md` | Propuestas pendientes (gatillos y vibración), sin implementar |
| `docs/CATALOGO_OBJETOS.md` | Catálogo de objetos y ubicaciones de la campaña, con su implementación |
| `docs/HANDOFF.md` | Traspaso a una nueva sesión: reglas, flujo y estado |
| `docs/ARQUITECTURA.md` | Cómo está hecho el código |
| `tests/` | Scripts de prueba (Playwright / simulación) |

## Regenerar `index.html` desde el fuente
Ejecutar `python3 tools/build.py` desde la raíz del proyecto (necesita `ffmpeg` y `numpy`). Procesa los sonidos de `assets/audio/`, genera `src/sonidos.js` y sustituye en `src/prototipo.html` las etiquetas de Three.js y `sonidos.js` por su contenido para crear `index.html`.

## Reglas del proyecto
- Sonidos: solo los que el usuario genera y aprueba (arma por arma, uno a uno). Mientras falte una muestra, el juego usa el sonido sintético de respaldo; no se añaden sonidos inventados.
- Controles táctiles: invisibles pero funcionales.
- Sin dependencias externas ni assets.
