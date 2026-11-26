# Equipo y vida de los personajes (campaña de facciones)

Reglas de campaña implementadas en la rama de protección. La prueba reproducible está en `tests/proteccion.py`.

## Reglas
1. **Vida**: 100 sin ninguna equipación y **hasta 200 en total**, repartida entre las equipaciones.
2. **Huecos**: casco, chaleco y mochila. Tres niveles por pieza: ligero, medio y pesado. Se ven en el personaje (forma y placas; el color es el de la facción).
3. **Reparto propuesto** (máximo +100): casco +10 / +20 / +30; chaleco +25 / +50 / +70. La mochila **no** da vida: da capacidad de carga (granadas, kits de reanimación, cajas de suministros).
4. **Sin regeneración**: el escudo/vida que aporta el equipo **no se regenera solo**. Se repone con reparación en el refugio y con kits.
5. **Al morir se pierde todo** el equipo y el contenido de la mochila. Aliados y rivales pueden recoger las piezas con el desgaste que tenían.
6. **Cómo se consigue**: tiendas, farmacias, taller y almacén; se mejora en el refugio. Sin recetas de fabricación.
7. Opcional propuesto, sin cerrar: el chaleco pesado penaliza algo la velocidad y el dash. El casco reduce el daño de los disparos a la cabeza.

## Relación con lo que existe
- El mapa 3 usa hoy escudo 50 + vida 100 con recarga del escudo a los 5 s y luego de la vida. El modo de facciones usa en su lugar la protección de las piezas equipadas.
- Los kits de reanimación y la regla de una reanimación por vida siguen como en `GUERRA_DE_FACCIONES.md`.

## Pendiente de decidir
- Si la vida base (los 100 sin equipo) se regenera sola o solo con botiquín.
- Calibración inicial de reparación: una unidad de material en los puntos de salida del refugio propio o un kit portátil restauran una pieza. La mejora de nivel del equipo en el refugio pertenece a otra entrega.

## Aspecto
Los personajes se construyen con primitivas y **piezas modulares** (casco, chaleco, mochila) para que el equipo se vea sin rehacerlos. Paletas provisionales de facción: azul, rojo, ámbar y violeta (sin verde, reservado a zombis y barras de vida).
