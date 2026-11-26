# Distrito v3 (simétrico) — ubicaciones oficiales (generado por `tools/foto_distrito.py`; no editar a mano)

Coordenadas del mundo en metros: **x** hacia la derecha (este), **z** hacia abajo (sur); norte arriba; el centro del mapa es (0, 0) y el mapa va de −500 a +500. La foto `docs/img/distrito_v3.png` es un dibujo del propio juego (cámara ortográfica sobre los datos reales) con una retícula cada 125 m (línea gruesa cada 250 m): lo que ves ahí es lo que hay en el juego, en ese sitio. Ampliaciones: `distrito_v3_azul_noroeste.png`, `_rojo_noreste`, `_violeta_sureste`, `_ambar_suroeste`, `_centro` (retícula cada 25 m). Los mismos datos están en `MAPA.data.M2` (`src/mapa_distrito.js`).

**Igualdad:** el cuarto de cada facción es el del Azul girado 90° (Rojo), 180° (Violeta) o 270° (Ámbar) alrededor del centro: mismas cosas a las mismas distancias. Cada refugio está a 618 m de la Plaza Mayor y a 437 m de sus dos objetivos de borde (una Fábrica y una Estación con supermercado).

## Zonas (rectángulos x de … a, z de … a)
| Zona | x | z |
|---|---|---|
| Refugio · Azul | -456 … -434 | -436 … -420 |
| Refugio · Rojo | 420 … 436 | -456 … -434 |
| Refugio · Violeta | 434 … 456 | 420 … 436 |
| Refugio · Ámbar | -436 … -420 | 434 … 456 |
| Plaza Mayor (norte) | -50 … 50 | -50 … 50 |
| Fábrica (norte) | -125 … 125 | -500 … -379 |
| Fábrica (sur) | -125 … 125 | 379 … 500 |
| Estación y supermercado (oeste) | -500 … -379 | -125 … 125 |
| Estación y supermercado (este) | 379 … 500 | -125 … 125 |
| Granja 1 · Azul | -250 … -125 | -500 … -379 |
| Granja 1 · Rojo | 379 … 500 | -250 … -125 |
| Granja 1 · Violeta | 125 … 250 | 379 … 500 |
| Granja 1 · Ámbar | -500 … -379 | 125 … 250 |
| Granja 2 · Azul | -500 … -379 | -250 … -125 |
| Granja 2 · Rojo | 125 … 250 | -500 … -379 |
| Granja 2 · Violeta | 379 … 500 | 125 … 250 |
| Granja 2 · Ámbar | -250 … -125 | 379 … 500 |
| Aldea · Azul | -375 … -250 | -375 … -250 |
| Aldea · Rojo | 250 … 375 | -375 … -250 |
| Aldea · Violeta | 250 … 375 | 250 … 375 |
| Aldea · Ámbar | -375 … -250 | 250 … 375 |
| Residencial 1 · Azul | -125 … 0 | -375 … -250 |
| Residencial 1 · Rojo | 250 … 375 | -125 … 0 |
| Residencial 1 · Violeta | 0 … 125 | 250 … 375 |
| Residencial 1 · Ámbar | -375 … -250 | 0 … 125 |
| Residencial 2 · Azul | -375 … -250 | -125 … 0 |
| Residencial 2 · Rojo | 0 … 125 | -375 … -250 |
| Residencial 2 · Violeta | 250 … 375 | 0 … 125 |
| Residencial 2 · Ámbar | -125 … 0 | 250 … 375 |
| Puesto avanzado · Azul | -250 … -125 | -250 … -125 |
| Puesto avanzado · Rojo | 125 … 250 | -250 … -125 |
| Puesto avanzado · Violeta | 125 … 250 | 125 … 250 |
| Puesto avanzado · Ámbar | -250 … -125 | 125 … 250 |
| Casco 1 (farmacia) · Azul | -125 … 0 | -250 … -125 |
| Casco 1 (farmacia) · Rojo | 125 … 250 | -125 … 0 |
| Casco 1 (farmacia) · Violeta | 0 … 125 | 125 … 250 |
| Casco 1 (farmacia) · Ámbar | -250 … -125 | 0 … 125 |
| Casco 2 (tienda) · Azul | -250 … -125 | -125 … 0 |
| Casco 2 (tienda) · Rojo | 0 … 125 | -250 … -125 |
| Casco 2 (tienda) · Violeta | 125 … 250 | 0 … 125 |
| Casco 2 (tienda) · Ámbar | -125 … 0 | 125 … 250 |
| Comercios · Azul | -125 … 0 | -125 … 0 |
| Comercios · Rojo | 0 … 125 | -125 … 0 |
| Comercios · Violeta | 0 … 125 | 0 … 125 |
| Comercios · Ámbar | -125 … 0 | 0 … 125 |
| Bosque 1 · Azul | -410 … -258 | -495 … -386 |
| Bosque 1 · Rojo | 386 … 495 | -410 … -258 |
| Bosque 1 · Violeta | 258 … 410 | 386 … 495 |
| Bosque 1 · Ámbar | -495 … -386 | 258 … 410 |
| Bosque 2 · Azul | -495 … -386 | -366 … -258 |
| Bosque 2 · Rojo | 258 … 366 | -495 … -386 |
| Bosque 2 · Violeta | 386 … 495 | 258 … 366 |
| Bosque 2 · Ámbar | -366 … -258 | 386 … 495 |

## Calles (todas rectas)
| Calle | Ancho (m) | De (x, z) | A (x, z) |
|---|---|---|---|
| Avenida Mayor (E-O) | 14 | (-375, 0) | (375, 0) |
| Avenida Norte-Sur | 14 | (0, -375) | (0, 375) |
| Ronda interior este | 11 | (250, -259) | (250, 259) |
| Ronda interior norte | 11 | (-259, -250) | (259, -250) |
| Ronda interior oeste | 11 | (-250, -259) | (-250, 259) |
| Ronda interior sur | 11 | (-259, 250) | (259, 250) |
| Acceso al refugio | 8 | (375, -445) | (415, -445) |
| Acceso al refugio | 8 | (-415, 445) | (-375, 445) |
| Acceso al refugio | 8 | (-445, -415) | (-445, -375) |
| Acceso al refugio | 8 | (445, 375) | (445, 415) |
| Ronda exterior este | 8 | (375, -452) | (375, 375) |
| Ronda exterior norte | 8 | (-452, -375) | (375, -375) |
| Ronda exterior oeste | 8 | (-375, -375) | (-375, 452) |
| Ronda exterior sur | 8 | (-375, 375) | (452, 375) |
| Calle de barrio x -125 | 7 | (-125, -375) | (-125, 375) |
| Calle de barrio x 125 | 7 | (125, -375) | (125, 375) |
| Calle de barrio z -125 | 7 | (-375, -125) | (375, -125) |
| Calle de barrio z 125 | 7 | (-375, 125) | (375, 125) |
| Calle de la aldea | 7 | (-375, -312) | (-125, -312) |
| Calle de la aldea | 7 | (125, -312) | (375, -312) |
| Calle de la aldea | 7 | (-375, 312) | (-125, 312) |
| Calle de la aldea | 7 | (125, 312) | (375, 312) |
| Calle de la aldea | 7 | (-312, -375) | (-312, -125) |
| Calle de la aldea | 7 | (-312, 125) | (-312, 375) |
| Calle de la aldea | 7 | (312, -375) | (312, -125) |
| Calle de la aldea | 7 | (312, 125) | (312, 375) |

## Lugares y objetivos (★ = objetivo capturable)
| Lugar | Facción | x | z |
|---|---|---|---|
| ★ Estación y supermercado (este) | común | 430 | 0 |
| ★ Estación y supermercado (oeste) | común | -430 | 0 |
| ★ Fábrica (norte) | común | 0 | -425 |
| ★ Fábrica (sur) | común | 0 | 425 |
| ★ Plaza Mayor (objetivo central) | común | 0 | 0 |
| Aldea (cruce) | Azul | -312 | -312 |
| ★ Clínica | Azul | -80 | -16 |
| ★ Farmacia | Azul | -15 | -187 |
| ★ Granja | Azul | -187 | -399 |
| ★ Granja | Azul | -399 | -187 |
| ★ Puesto avanzado | Azul | -187 | -146 |
| Refugio Azul | Azul | -445 | -428 |
| Subestación | Azul | -344 | -346 |
| ★ Tienda | Azul | -187 | -15 |
| Aldea (cruce) | Rojo | 312 | -312 |
| ★ Clínica | Rojo | 16 | -80 |
| ★ Farmacia | Rojo | 187 | -15 |
| ★ Granja | Rojo | 399 | -187 |
| ★ Granja | Rojo | 187 | -399 |
| ★ Puesto avanzado | Rojo | 146 | -187 |
| Refugio Rojo | Rojo | 428 | -445 |
| Subestación | Rojo | 346 | -344 |
| ★ Tienda | Rojo | 15 | -187 |
| Aldea (cruce) | Violeta | 312 | 312 |
| ★ Clínica | Violeta | 80 | 16 |
| ★ Farmacia | Violeta | 15 | 187 |
| ★ Granja | Violeta | 187 | 399 |
| ★ Granja | Violeta | 399 | 187 |
| ★ Puesto avanzado | Violeta | 187 | 146 |
| Refugio Violeta | Violeta | 445 | 428 |
| Subestación | Violeta | 344 | 346 |
| ★ Tienda | Violeta | 187 | 15 |
| Aldea (cruce) | Ámbar | -312 | 312 |
| ★ Clínica | Ámbar | -16 | 80 |
| ★ Farmacia | Ámbar | -187 | 15 |
| ★ Granja | Ámbar | -399 | 187 |
| ★ Granja | Ámbar | -187 | 399 |
| ★ Puesto avanzado | Ámbar | -146 | 187 |
| Refugio Ámbar | Ámbar | -428 | 445 |
| Subestación | Ámbar | -346 | 344 |
| ★ Tienda | Ámbar | -15 | 187 |

## Retenes (R en la foto): chicane de vehículos con sacos en la acera, sin muros en la calzada
(0, -312), (312, 0), (0, 312), (-312, 0), (-200, -375), (375, -200), (200, 375), (-375, 200), (-375, -200), (200, -375), (375, 200), (-200, 375)

## Nidos de zombis (N en la foto)
| Nido | Facción | x | z |
|---|---|---|---|
| Nido de zombis (residencial 1) | Azul | -62 | -312 |
| Nido de zombis (residencial 1) | Rojo | 312 | -62 |
| Nido de zombis (residencial 1) | Violeta | 62 | 312 |
| Nido de zombis (residencial 1) | Ámbar | -312 | 62 |
| Nido de zombis (residencial 2) | Azul | -312 | -62 |
| Nido de zombis (residencial 2) | Rojo | 62 | -312 |
| Nido de zombis (residencial 2) | Violeta | 312 | 62 |
| Nido de zombis (residencial 2) | Ámbar | -62 | 312 |
| Nido de zombis (bosque 1) | Azul | -330 | -448 |
| Nido de zombis (bosque 1) | Rojo | 448 | -330 |
| Nido de zombis (bosque 1) | Violeta | 330 | 448 |
| Nido de zombis (bosque 1) | Ámbar | -448 | 330 |
| Nido de zombis (bosque 2) | Azul | -448 | -330 |
| Nido de zombis (bosque 2) | Rojo | 330 | -448 |
| Nido de zombis (bosque 2) | Violeta | 448 | 330 |
| Nido de zombis (bosque 2) | Ámbar | -330 | 448 |
| Nido de zombis (casco) | Azul | -62 | -187 |
| Nido de zombis (casco) | Rojo | 187 | -62 |
| Nido de zombis (casco) | Violeta | 62 | 187 |
| Nido de zombis (casco) | Ámbar | -187 | 62 |

Árboles: 1500.

## Edificios (436)
| Tipo | x | z |
|---|---|---|
| clinic | -80 | -16 |
| clinic | -16 | 80 |
| clinic | 16 | -80 |
| clinic | 80 | 16 |
| gascanopy | -235 | 160 |
| gascanopy | -160 | -235 |
| gascanopy | 160 | 235 |
| gascanopy | 235 | -160 |
| gasshop | -237 | 205 |
| gasshop | -205 | -237 |
| gasshop | 205 | 237 |
| gasshop | 237 | -205 |
| house | -387 | -232 |
| house | -387 | -142 |
| house | -387 | 142 |
| house | -387 | 232 |
| house | -363 | -104 |
| house | -363 | -78 |
| house | -363 | -52 |
| house | -363 | -26 |
| house | -363 | 26 |
| house | -363 | 52 |
| house | -363 | 78 |
| house | -363 | 104 |
| house | -352 | -113 |
| house | -352 | -15 |
| house | -352 | 15 |
| house | -352 | 113 |
| house | -326 | -113 |
| house | -326 | -15 |
| house | -326 | 15 |
| house | -326 | 113 |
| house | -324 | -292 |
| house | -324 | -266 |
| house | -324 | -240 |
| house | -324 | -214 |
| house | -324 | -188 |
| house | -324 | -162 |
| house | -324 | 162 |
| house | -324 | 188 |
| house | -324 | 214 |
| house | -324 | 240 |
| house | -324 | 266 |
| house | -324 | 292 |
| house | -301 | -266 |
| house | -301 | -240 |
| house | -301 | -214 |
| house | -301 | -188 |
| house | -301 | -162 |
| house | -301 | 162 |
| house | -301 | 188 |
| house | -301 | 214 |
| house | -301 | 240 |
| house | -301 | 266 |
| house | -300 | -113 |
| house | -300 | -15 |
| house | -300 | 15 |
| house | -300 | 113 |
| house | -292 | -324 |
| house | -292 | 324 |
| house | -274 | -113 |
| house | -274 | -15 |
| house | -274 | 15 |
| house | -274 | 113 |
| house | -266 | -324 |
| house | -266 | -301 |
| house | -266 | 301 |
| house | -266 | 324 |
| house | -264 | -236 |
| house | -264 | -210 |
| house | -264 | -184 |
| house | -264 | -158 |
| house | -264 | -104 |
| house | -264 | -78 |
| house | -264 | -52 |
| house | -264 | -26 |
| house | -264 | 26 |
| house | -264 | 52 |
| house | -264 | 78 |
| house | -264 | 104 |
| house | -264 | 158 |
| house | -264 | 184 |
| house | -264 | 210 |
| house | -264 | 236 |
| house | -240 | -324 |
| house | -240 | -301 |
| house | -240 | 301 |
| house | -240 | 324 |
| house | -236 | -264 |
| house | -236 | -104 |
| house | -236 | -78 |
| house | -236 | -52 |
| house | -236 | -26 |
| house | -236 | -15 |
| house | -236 | 26 |
| house | -236 | 52 |
| house | -236 | 78 |
| house | -236 | 104 |
| house | -236 | 137 |
| house | -236 | 264 |
| house | -232 | -387 |
| house | -232 | 387 |
| house | -214 | -324 |
| house | -214 | -301 |
| house | -214 | 301 |
| house | -214 | 324 |
| house | -210 | -264 |
| house | -210 | -15 |
| house | -210 | 137 |
| house | -210 | 264 |
| house | -204 | -113 |
| house | -204 | 113 |
| house | -188 | -324 |
| house | -188 | -301 |
| house | -188 | 301 |
| house | -188 | 324 |
| house | -184 | -264 |
| house | -184 | 137 |
| house | -184 | 264 |
| house | -178 | -113 |
| house | -178 | 113 |
| house | -162 | -324 |
| house | -162 | -301 |
| house | -162 | 301 |
| house | -162 | 324 |
| house | -158 | -264 |
| house | -158 | -15 |
| house | -158 | 137 |
| house | -158 | 264 |
| house | -152 | -113 |
| house | -152 | 113 |
| house | -142 | -387 |
| house | -142 | 387 |
| house | -137 | -236 |
| house | -137 | -210 |
| house | -137 | -184 |
| house | -137 | -158 |
| house | -137 | -104 |
| house | -137 | -78 |
| house | -137 | -52 |
| house | -137 | -26 |
| house | -137 | 26 |
| house | -137 | 52 |
| house | -137 | 78 |
| house | -137 | 104 |
| house | -113 | -352 |
| house | -113 | -326 |
| house | -113 | -300 |
| house | -113 | -274 |
| house | -113 | -204 |
| house | -113 | -178 |
| house | -113 | -152 |
| house | -113 | -104 |
| house | -113 | -78 |
| house | -113 | -52 |
| house | -113 | 52 |
| house | -113 | 78 |
| house | -113 | 152 |
| house | -113 | 178 |
| house | -113 | 204 |
| house | -113 | 274 |
| house | -113 | 300 |
| house | -113 | 326 |
| house | -113 | 352 |
| house | -104 | -363 |
| house | -104 | -264 |
| house | -104 | -236 |
| house | -104 | -137 |
| house | -104 | 113 |
| house | -104 | 137 |
| house | -104 | 236 |
| house | -104 | 264 |
| house | -104 | 363 |
| house | -78 | -363 |
| house | -78 | -264 |
| house | -78 | -236 |
| house | -78 | -137 |
| house | -78 | -113 |
| house | -78 | 113 |
| house | -78 | 137 |
| house | -78 | 236 |
| house | -78 | 264 |
| house | -78 | 363 |
| house | -52 | -363 |
| house | -52 | -264 |
| house | -52 | -236 |
| house | -52 | -137 |
| house | -52 | -113 |
| house | -52 | 113 |
| house | -52 | 137 |
| house | -52 | 236 |
| house | -52 | 264 |
| house | -52 | 363 |
| house | -26 | -363 |
| house | -26 | -264 |
| house | -26 | -236 |
| house | -26 | -137 |
| house | -26 | 137 |
| house | -26 | 236 |
| house | -26 | 264 |
| house | -26 | 363 |
| house | -15 | -352 |
| house | -15 | -326 |
| house | -15 | -300 |
| house | -15 | -274 |
| house | -15 | 158 |
| house | -15 | 210 |
| house | -15 | 236 |
| house | -15 | 274 |
| house | -15 | 300 |
| house | -15 | 326 |
| house | -15 | 352 |
| house | 15 | -352 |
| house | 15 | -326 |
| house | 15 | -300 |
| house | 15 | -274 |
| house | 15 | -236 |
| house | 15 | -210 |
| house | 15 | -158 |
| house | 15 | 274 |
| house | 15 | 300 |
| house | 15 | 326 |
| house | 15 | 352 |
| house | 26 | -363 |
| house | 26 | -264 |
| house | 26 | -236 |
| house | 26 | -137 |
| house | 26 | 137 |
| house | 26 | 236 |
| house | 26 | 264 |
| house | 26 | 363 |
| house | 52 | -363 |
| house | 52 | -264 |
| house | 52 | -236 |
| house | 52 | -137 |
| house | 52 | -113 |
| house | 52 | 113 |
| house | 52 | 137 |
| house | 52 | 236 |
| house | 52 | 264 |
| house | 52 | 363 |
| house | 78 | -363 |
| house | 78 | -264 |
| house | 78 | -236 |
| house | 78 | -137 |
| house | 78 | -113 |
| house | 78 | 113 |
| house | 78 | 137 |
| house | 78 | 236 |
| house | 78 | 264 |
| house | 78 | 363 |
| house | 104 | -363 |
| house | 104 | -264 |
| house | 104 | -236 |
| house | 104 | -137 |
| house | 104 | -113 |
| house | 104 | 137 |
| house | 104 | 236 |
| house | 104 | 264 |
| house | 104 | 363 |
| house | 113 | -352 |
| house | 113 | -326 |
| house | 113 | -300 |
| house | 113 | -274 |
| house | 113 | -204 |
| house | 113 | -178 |
| house | 113 | -152 |
| house | 113 | -78 |
| house | 113 | -52 |
| house | 113 | 52 |
| house | 113 | 78 |
| house | 113 | 104 |
| house | 113 | 152 |
| house | 113 | 178 |
| house | 113 | 204 |
| house | 113 | 274 |
| house | 113 | 300 |
| house | 113 | 326 |
| house | 113 | 352 |
| house | 137 | -104 |
| house | 137 | -78 |
| house | 137 | -52 |
| house | 137 | -26 |
| house | 137 | 26 |
| house | 137 | 52 |
| house | 137 | 78 |
| house | 137 | 104 |
| house | 137 | 158 |
| house | 137 | 184 |
| house | 137 | 210 |
| house | 137 | 236 |
| house | 142 | -387 |
| house | 142 | 387 |
| house | 152 | -113 |
| house | 152 | 113 |
| house | 158 | -264 |
| house | 158 | -137 |
| house | 158 | 15 |
| house | 158 | 264 |
| house | 162 | -324 |
| house | 162 | -301 |
| house | 162 | 301 |
| house | 162 | 324 |
| house | 178 | -113 |
| house | 178 | 113 |
| house | 184 | -264 |
| house | 184 | -137 |
| house | 184 | 264 |
| house | 188 | -324 |
| house | 188 | -301 |
| house | 188 | 301 |
| house | 188 | 324 |
| house | 204 | -113 |
| house | 204 | 113 |
| house | 210 | -264 |
| house | 210 | -137 |
| house | 210 | 15 |
| house | 210 | 264 |
| house | 214 | -324 |
| house | 214 | -301 |
| house | 214 | 301 |
| house | 214 | 324 |
| house | 232 | -387 |
| house | 232 | 387 |
| house | 236 | -264 |
| house | 236 | -137 |
| house | 236 | -104 |
| house | 236 | -78 |
| house | 236 | -52 |
| house | 236 | -26 |
| house | 236 | 15 |
| house | 236 | 26 |
| house | 236 | 52 |
| house | 236 | 78 |
| house | 236 | 104 |
| house | 236 | 264 |
| house | 240 | -324 |
| house | 240 | -301 |
| house | 240 | 301 |
| house | 240 | 324 |
| house | 264 | -236 |
| house | 264 | -210 |
| house | 264 | -184 |
| house | 264 | -158 |
| house | 264 | -104 |
| house | 264 | -78 |
| house | 264 | -52 |
| house | 264 | -26 |
| house | 264 | 26 |
| house | 264 | 52 |
| house | 264 | 78 |
| house | 264 | 104 |
| house | 264 | 158 |
| house | 264 | 184 |
| house | 264 | 210 |
| house | 264 | 236 |
| house | 266 | -324 |
| house | 266 | -301 |
| house | 266 | 301 |
| house | 266 | 324 |
| house | 274 | -113 |
| house | 274 | -15 |
| house | 274 | 15 |
| house | 274 | 113 |
| house | 292 | -324 |
| house | 292 | 324 |
| house | 300 | -113 |
| house | 300 | -15 |
| house | 300 | 15 |
| house | 300 | 113 |
| house | 301 | -266 |
| house | 301 | -240 |
| house | 301 | -214 |
| house | 301 | -188 |
| house | 301 | -162 |
| house | 301 | 162 |
| house | 301 | 188 |
| house | 301 | 214 |
| house | 301 | 240 |
| house | 301 | 266 |
| house | 324 | -292 |
| house | 324 | -266 |
| house | 324 | -240 |
| house | 324 | -214 |
| house | 324 | -188 |
| house | 324 | -162 |
| house | 324 | 162 |
| house | 324 | 188 |
| house | 324 | 214 |
| house | 324 | 240 |
| house | 324 | 266 |
| house | 324 | 292 |
| house | 326 | -113 |
| house | 326 | -15 |
| house | 326 | 15 |
| house | 326 | 113 |
| house | 352 | -113 |
| house | 352 | -15 |
| house | 352 | 15 |
| house | 352 | 113 |
| house | 363 | -104 |
| house | 363 | -78 |
| house | 363 | -52 |
| house | 363 | -26 |
| house | 363 | 26 |
| house | 363 | 52 |
| house | 363 | 78 |
| house | 363 | 104 |
| house | 387 | -232 |
| house | 387 | -142 |
| house | 387 | 142 |
| house | 387 | 232 |
| market | -80 | 17 |
| market | -17 | -80 |
| market | 17 | 80 |
| market | 80 | -17 |
| mini | -187 | -15 |
| mini | -15 | 187 |
| mini | 15 | -187 |
| mini | 187 | 15 |
| pharm | -187 | 15 |
| pharm | -15 | -187 |
| pharm | 15 | 187 |
| pharm | 187 | -15 |
| station | -458 | 0 |
| station | 458 | 0 |
| substation | -346 | 344 |
| substation | -344 | -346 |
| substation | 344 | 346 |
| substation | 346 | -344 |
| super | -392 | 0 |
| super | 393 | 0 |
| warehouse | -70 | -391 |
| warehouse | -70 | 391 |
| warehouse | 70 | -391 |
| warehouse | 70 | 391 |

## Objetos colocados (por tipo)
bwallSolid 4308, bwallGlass 1656, door 416, tvUnit 400, sofa 400, kitchenUnit 400, table 400, bed 400, wardrobe 400, car 388, chainFence 252, wall1 160, fence 160, sandbags 136, barrier 88, wallLow1 84, wall2 84, dumpster 70, floodlight 64, crateS 60, barrel 58, wheelie 56, pallet 56, bench 52, crate 52, cart 48, planter 48, palletBoxes 46, pillar 46, wall3 46, fridge 44, palletRack 40, cage 38, stall 36, cot 32, pharmaCab 28, pump 28, shopDoor 24, blocks 24, counter 20, gondola3 20, busStop 20, supplyMed 18, waitSeat 16, gate1 16, supplyMat 14, shelf 14, forklift 12, checkout 12, slideGate 12, switchCab 12, shutter 12, glassPane 12, tower1 12, supplyAmmo 10, rollDoor 8, gondola4 8, transformer 8, rack 8, barrelFuel 8, tower2 8, board 6, locker 4, gateInner 4, storeMat 4, storeAmmo 4, storeMed 4, kiosk 4, stairs 4, gate2 4, gate3 2, tower3 2, catwalk 2, emblem0 1, emblem1 1, emblem3 1, emblem2 1

## Puntos de aparición de cada refugio (primero de 6)
Azul (-455, -427), Rojo (427, -455), Ámbar (-427, 435), Violeta (435, 427)
