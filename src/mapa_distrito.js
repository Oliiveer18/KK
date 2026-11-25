"use strict";
/* ===================== DATOS DEL DISTRITO (sector de prueba M1: 250 × 250 m) =====================
   Cuadrícula de calles (x e z = −70, 0, +70), un refugio provisional por esquina (Azul NO, Rojo NE, Ámbar SO, Violeta SE), plaza al noreste del cruce central,
   tiendas sobre la Avenida Mayor, gasolinera, aparcamiento y una vía. Norte = z negativo. Se amplía por sectores (M2/M3). */
(function () {
const fp = (k, g) => OBJ.footprint(k, g || 0, {});
MAPA.data.M1 = function () {
  const SW = 3.2, AV = 12, CALLE = 8, half = 125;
  const D = { half, ground: 'grass', roads: [], surfaces: [], lots: [], refuges: [], buildings: [], objects: [], rails: [], hot: [] };
  D.roads.push({ axis: 'x', c: 0, a0: -half, a1: half, w: AV }, { axis: 'z', c: 0, a0: -half, a1: half, w: 9 });                         // Avenida Mayor y Calle Central
  for (const c of [-70, 70]) D.roads.push({ axis: 'x', c, a0: -half, a1: half, w: CALLE }, { axis: 'z', c, a0: -half, a1: half, w: CALLE });   // calles perimetrales
  /* refugios (provisionales): portón hacia la calle más cercana */
  D.refuges.push({ fac: 0, x: -98, z: -98, w: 44, d: 40, face: 's', gate: 8 }, { fac: 1, x: 98, z: -98, w: 44, d: 40, face: 's', gate: 8 },
                 { fac: 2, x: -98, z: 98, w: 44, d: 40, face: 'n', gate: 8 }, { fac: 3, x: 98, z: 98, w: 44, d: 40, face: 'n', gate: 8 });
  /* tiendas en la acera norte de la Avenida Mayor (puerta hacia +z, a la avenida) */
  const front = AV / 2 + SW + .3, put = (k, x, side, fac) => { const f = fp(k), D_ = f.hz, z = side * (front + D_); D.buildings.push({ k, x, z, rot: side < 0 ? 0 : Math.PI, fac }); return [x, z]; };
  const s1 = put('super', -38, -1), s2 = put('pharm', -9, -1), s3 = put('mini', 22, 1);
  D.hot.push([s1[0], -6], [s2[0], -6], [s3[0], 6]);
  /* plaza al noreste del cruce central */
  D.surfaces.push({ t: 'cobble', x: 36, z: -37, w: 44, d: 44 });
  D.objects.push({ t: 'bench', x: 24, z: -26 }, { t: 'bench', x: 48, z: -26 }, { t: 'planter', x: 26, z: -48, g: 0 }, { t: 'planter', x: 46, z: -48 }, { t: 'kiosk', x: 36, z: -50 }, { t: 'busStop', x: 12, z: -8.5 },
                 { t: 'bench', x: 24, z: -50 }, { t: 'floodlight', x: 36, z: -36 });
  D.hot.push([36, -37]);
  /* gasolinera al sureste */
  D.surfaces.push({ t: 'concrete', x: 40, z: 38, w: 36, d: 24 });
  D.objects.push({ t: 'pump', x: 30, z: 36 }, { t: 'pump', x: 38, z: 36 }, { t: 'pump', x: 46, z: 36 }, { t: 'kiosk', x: 50, z: 46 }, { t: 'car', x: 34, z: 44, g: Math.PI / 2 }, { t: 'dumpster', x: 56, z: 30 });
  D.hot.push([40, 38]);
  /* aparcamiento al suroeste */
  D.lots.push({ x: -36, z: 40, w: 40, d: 24 });
  D.objects.push({ t: 'car', x: -48, z: 36, g: Math.PI / 2 }, { t: 'car', x: -42, z: 44, g: Math.PI / 2 }, { t: 'car', x: -30, z: 36, g: Math.PI / 2 }, { t: 'car', x: -24, z: 44, g: Math.PI / 2 },
                 { t: 'wheelie', x: -56, z: 30 }, { t: 'dumpster', x: -54, z: 52 }, { t: 'pallet', x: -16, z: 52 });
  D.hot.push([-36, 40]);
  /* una vía al sur, entre los dos refugios del sur */
  D.surfaces.push({ t: 'dirt', x: 0, z: 100, w: 120, d: 10 });
  D.rails.push({ x: 0, z: 100, len: 120, ry: 0 });
  D.hot.push([0, 100], [0, -70], [0, 70], [-70, 0], [70, 0], [-70, -70], [70, -70], [-70, 70], [70, 70], [0, 0]);
  return D;
};
})();
