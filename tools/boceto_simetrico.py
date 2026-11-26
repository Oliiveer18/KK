# Boceto 2D del mapa v3 (1 km², cuadrícula recta, igualdad total entre facciones).
# Se diseña UN cuarto (el del Azul, noroeste) y se copia girándolo 90°, así las 4 facciones tienen exactamente
# lo mismo a las mismas distancias. Coordenadas del juego: x → este, z → sur, centro (0,0), de -500 a 500.
# Uso: python3 -I tools/boceto_simetrico.py  → docs/img/mapa_v3_boceto.png (y .svg)
import os, sys
OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'docs', 'img')
S = 1.6                                   # px por metro
P = lambda v: (v + 500) * S + 40          # metro → píxel (margen 40)

def rots(x, z):                           # las 4 copias: Azul NO, Rojo NE, Violeta SE, Ámbar SO (giro horario)
    return [(x, z), (-z, x), (-x, -z), (z, -x)]
def rect_rots(x0, z0, x1, z1):
    out = []
    for (ax, az), (bx, bz) in zip(rots(x0, z0), rots(x1, z1)):
        out.append((min(ax, bx), min(az, bz), max(ax, bx), max(az, bz)))
    return out

FAC = [('Azul', '#4aa0ff'), ('Rojo', '#ff5a48'), ('Violeta', '#b07cff'), ('Ámbar', '#ffb020')]
svg = []
A = svg.append
W = 1000 * S + 80
A(f'<svg xmlns="http://www.w3.org/2000/svg" width="{W:.0f}" height="{W + 230:.0f}" font-family="DejaVu Sans, Arial" >')
A(f'<rect width="100%" height="100%" fill="#14161a"/>')
A(f'<rect x="{P(-500)}" y="{P(-500)}" width="{1000*S}" height="{1000*S}" fill="#6f7a5c"/>')

def R(x0, z0, x1, z1, fill, op=1, stroke=None, dash=None):
    st = f' stroke="{stroke}" stroke-width="2"' + (f' stroke-dasharray="{dash}"' if dash else '') if stroke else ''
    A(f'<rect x="{P(x0):.1f}" y="{P(z0):.1f}" width="{(x1-x0)*S:.1f}" height="{(z1-z0)*S:.1f}" fill="{fill}" opacity="{op}"{st}/>')
def T(x, z, txt, size=13, col='#fff', anchor='middle', bold=True):
    A(f'<text x="{P(x):.1f}" y="{P(z):.1f}" font-size="{size}" fill="{col}" text-anchor="{anchor}" font-weight="{"bold" if bold else "normal"}" '
      f'stroke="#000" stroke-width="3" paint-order="stroke">{txt}</text>')

# ---------- usos del suelo de un cuarto (en coordenadas del Azul) ----------
# celdas de 125 m: bordes -500, -375, -250, -125, 0
ZONAS = [  # (x0,z0,x1,z1, color, opacidad, etiqueta)
    (-500, -500, -375, -375, '#3b4050', 1, ''),                      # refugio (se dibuja aparte)
    (-375, -500, -250, -375, '#2f4a2a', 1, 'Bosque'),                # bosque propio en L
    (-500, -375, -375, -250, '#2f4a2a', 1, 'Bosque'),
    (-375, -375, -250, -250, '#7d6b55', 1, 'Aldea'),                 # casas + torre
    (-250, -500, -125, -375, '#8f8a4e', 1, 'Granja'),                # campos y recinto de madera
    (-500, -250, -375, -125, '#8f8a4e', 1, 'Granja'),
    (-250, -375, -125, -250, '#86735c', 1, 'Residencial'),
    (-375, -250, -250, -125, '#86735c', 1, 'Residencial'),
    (-125, -375, 0, -250, '#86735c', 1, 'Residencial'),
    (-375, -125, -250, 0, '#86735c', 1, 'Residencial'),
    (-250, -250, -125, -125, '#5b6068', 1, 'Puesto avanzado'),       # gasolinera + recinto de piedra
    (-125, -250, 0, -125, '#9a7c62', 1, 'Casco'),                     # tienda, farmacia, casas
    (-250, -125, -125, 0, '#9a7c62', 1, 'Casco'),
    (-125, -125, 0, 0, '#a5855f', 1, 'Comercios'),                    # clínica pequeña + farmacia
]
for (x0, z0, x1, z1, col, op, lab) in ZONAS:
    for r in rect_rots(x0, z0, x1, z1):
        R(*r, col, op)
        if lab:
            T((r[0] + r[2]) / 2, (r[1] + r[3]) / 2 + 5, lab, 12, '#f3ecd8', bold=False)

# objetivos de borde (comunes a dos facciones vecinas, a igual distancia de las dos)
for (x0, z0, x1, z1, lab) in [(-125, -500, 125, -375, 'FÁBRICA'), (-125, 375, 125, 500, 'FÁBRICA'),
                              (375, -125, 500, 125, 'ESTACIÓN Y SÚPER'), (-500, -125, -375, 125, 'ESTACIÓN Y SÚPER')]:
    R(x0, z0, x1, z1, '#4b4f57', 1, '#f0e6c8')
    T((x0 + x1) / 2, (z0 + z1) / 2 + 5, lab, 14, '#f0e6c8')

# ---------- calles (todas rectas; jerarquía por anchura) ----------
def road(x0, z0, x1, z1, w, col='#3a3d44', edge='#9aa0a8'):
    if x0 == x1:
        R(x0 - w / 2 - 3, z0, x0 + w / 2 + 3, z1, edge); R(x0 - w / 2, z0, x0 + w / 2, z1, col)
    else:
        R(x0, z0 - w / 2 - 3, x1, z0 + w / 2 + 3, edge); R(x0, z0 - w / 2, x1, z0 + w / 2, col)
# calles de barrio (7 m) dentro de la ronda interior y en las esquinas
for c in (-125, 125):
    road(c, -250, c, 250, 7); road(-250, c, 250, c, 7)
# ronda exterior (8 m) a ±375, ronda interior (11 m) a ±250
for c in (-375, 375):
    road(c, -375, c, 375, 8); road(-375, c, 375, c, 8)
for c in (-250, 250):
    road(c, -250, c, 250, 11); road(-250, c, 250, c, 11)
# calles de unión entre rondas (7 m) en la mitad de cada banda: siguen las de barrio hasta la ronda exterior
for c in (-125, 125):
    road(c, -375, c, -250, 7); road(c, 250, c, 375, 7); road(-375, c, -250, c, 7); road(250, c, 375, c, 7)
# accesos de cada refugio (8 m): dos tramos cortos desde sus portones (este y sur) hasta la esquina de la ronda exterior
for (x0, z0, x1, z1) in [(-407, -437, -375, -437), (-375, -437, -375, -375), (-437, -407, -437, -375), (-437, -375, -375, -375)]:
    for (a, b), (c, d) in zip(rots(x0, z0), rots(x1, z1)):
        road(min(a, c), min(b, d), max(a, c), max(b, d), 8)
# avenidas (14 m) en cruz, del objetivo de borde al de enfrente, cruzando la Plaza Mayor
road(0, -375, 0, 375, 14); road(-375, 0, 375, 0, 14)
# ---------- Plaza Mayor (centro exacto) ----------
R(-40, -40, 40, 40, '#a7a08f', 1, '#f0e6c8')
T(0, -6, 'PLAZA MAYOR', 13, '#fff'); T(0, 12, 'campamento militar', 11, '#fff', bold=False)

# ---------- refugios, torres, retenes y nidos (todo girado igual) ----------
for i, (name, col) in enumerate(FAC):
    (x, z) = rots(-437, -437)[i]
    R(x - 30, z - 30, x + 30, z + 30, col, .35, col)
    A(f'<circle cx="{P(x)}" cy="{P(z)}" r="9" fill="{col}" stroke="#000" stroke-width="2"/>')
    T(x, z + 28, 'Refugio ' + name, 13, '#fff')
def mark(x, z, kind):
    for (a, b) in rots(x, z):
        if kind == 'ret':   A(f'<g stroke="#ff6a52" stroke-width="3"><line x1="{P(a)-6}" y1="{P(b)-6}" x2="{P(a)+6}" y2="{P(b)+6}"/><line x1="{P(a)-6}" y1="{P(b)+6}" x2="{P(a)+6}" y2="{P(b)-6}"/></g>')
        if kind == 'torre': A(f'<path d="M{P(a)},{P(b)-8} l8,14 l-16,0 z" fill="#e8c26a" stroke="#000"/>')
        if kind == 'nido':  A(f'<circle cx="{P(a)}" cy="{P(b)}" r="8" fill="#7ad04c" opacity=".75" stroke="#000"/>')
        if kind == 'obj':   A(f'<circle cx="{P(a)}" cy="{P(b)}" r="7" fill="#f0e6c8" stroke="#000" stroke-width="2"/>')
# retenes: en la avenida al entrar en la ronda interior, y en la ronda exterior saliendo de cada refugio (los dos lados, simétricos)
for (x, z) in [(0, -250 - 18), (-375, -300), (-300, -375)]:
    mark(x, z, 'ret')
for (x, z) in [(-345, -405), (-405, -345), (-235, -235)]:
    mark(x, z, 'torre')
for (x, z) in [(-187, -340), (-340, -187), (-90, -30)]:
    mark(x, z, 'nido')
for (x, z) in [(-187, -205), (-62, -205), (-187, -80)]:
    mark(x, z, 'obj')
# distancias iguales: líneas del refugio Azul a los objetivos
A(f'<g stroke="#4aa0ff" stroke-width="2" stroke-dasharray="6 6" opacity=".9" fill="none">'
  f'<line x1="{P(-437)}" y1="{P(-437)}" x2="{P(0)}" y2="{P(0)}"/>'
  f'<line x1="{P(-437)}" y1="{P(-437)}" x2="{P(0)}" y2="{P(-437)}"/>'
  f'<line x1="{P(-437)}" y1="{P(-437)}" x2="{P(-437)}" y2="{P(0)}"/></g>')
for i in range(4): pass
T(-190, -232, '', 1)
# retícula de coordenadas
for v in range(-500, 501, 125):
    A(f'<text x="{P(v)}" y="30" font-size="11" fill="#aaa" text-anchor="middle">x {v}</text>')
    A(f'<text x="6" y="{P(v)+4}" font-size="11" fill="#aaa">z {v}</text>')
# leyenda
y0 = 1000 * S + 80
L = [('<g stroke="#ff6a52" stroke-width="3"><line x1="0" y1="-6" x2="12" y2="6"/><line x1="0" y1="6" x2="12" y2="-6"/></g>', 'Retén (chicane de coches, sacos en la acera)'),
     ('<path d="M6,-8 l8,14 l-16,0 z" fill="#e8c26a" stroke="#000"/>', 'Torre'),
     ('<circle cx="6" r="8" fill="#7ad04c" opacity=".75" stroke="#000"/>', 'Nido de zombis'),
     ('<circle cx="6" r="7" fill="#f0e6c8" stroke="#000" stroke-width="2"/>', 'Objetivo capturable de cada facción (mismo en las 4)'),
     ('<line x1="0" y1="0" x2="16" y2="0" stroke="#4aa0ff" stroke-width="2" stroke-dasharray="6 6"/>', 'Distancias del Azul: centro 618 m, los dos objetivos de borde 437 m (igual para todos)')]
for k, (ico, txt) in enumerate(L):
    x = 40 + (k % 2) * 760; y = y0 + 30 + (k // 2) * 34
    A(f'<g transform="translate({x},{y})">{ico}</g>'); A(f'<text x="{x+28}" y="{y+5}" font-size="15" fill="#ddd">{txt}</text>')
A(f'<text x="40" y="{y0+150}" font-size="15" fill="#ddd">Calles: avenidas 14 m (cruz) · ronda interior 11 m (±250) · ronda exterior 8 m (±375) · calles de barrio 7 m. Manzanas de 125 m.</text>')
A(f'<text x="40" y="{y0+176}" font-size="15" fill="#ddd">Cada cuarto es una copia girada 90° del cuarto Azul: mismo bosque, aldea, granjas, puesto avanzado, casco y comercios a las mismas distancias.</text>')
A('</svg>')

os.makedirs(OUT, exist_ok=True)
sp = os.path.join(OUT, 'mapa_v3_boceto.svg')
open(sp, 'w').write('\n'.join(svg))
from playwright.sync_api import sync_playwright
with sync_playwright() as p:
    b = p.chromium.launch(executable_path='/usr/bin/google-chrome', args=['--no-sandbox']); pg = b.new_page(viewport={'width': int(W), 'height': int(W + 230)})
    pg.goto('file://' + os.path.abspath(sp)); pg.screenshot(path=os.path.join(OUT, 'mapa_v3_boceto.png')); b.close()
print('ok', sp)
