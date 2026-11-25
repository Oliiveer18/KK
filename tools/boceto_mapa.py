import math, random, json
random.seed(7)
W = 1000
def bez(p0,p1,p2,p3,n=40):
    out=[]
    for i in range(n+1):
        t=i/n; a=(1-t)**3; b=3*(1-t)**2*t; c=3*(1-t)*t*t; d=t**3
        out.append((a*p0[0]+b*p1[0]+c*p2[0]+d*p3[0], a*p0[1]+b*p1[1]+c*p2[1]+d*p3[1]))
    return out
def smooth(pts, n=14):
    # Catmull-Rom a polilínea suave
    out=[]; P=[pts[0]]+pts+[pts[-1]]
    for i in range(1,len(P)-2):
        p0,p1,p2,p3=P[i-1],P[i],P[i+1],P[i+2]
        for k in range(n):
            t=k/n; t2=t*t; t3=t2*t
            out.append((0.5*((2*p1[0])+(-p0[0]+p2[0])*t+(2*p0[0]-5*p1[0]+4*p2[0]-p3[0])*t2+(-p0[0]+3*p1[0]-3*p2[0]+p3[0])*t3),
                        0.5*((2*p1[1])+(-p0[1]+p2[1])*t+(2*p0[1]-5*p1[1]+4*p2[1]-p3[1])*t2+(-p0[1]+3*p1[1]-3*p2[1]+p3[1])*t3)))
    out.append(pts[-1]); return out
def d(pts): return 'M'+' L'.join('%.1f,%.1f'%p for p in pts)

river = [(-999,-999)]
rail  = smooth([(-10,742),(140,735),(300,700),(430,708),(540,690),(700,650),(850,600),(1010,585)])
avenue= smooth([(-10,470),(120,455),(260,470),(380,500),(500,475),(640,420),(780,402),(900,430),(1010,415)])
central=smooth([(470,-10),(500,90),(450,210),(470,330),(500,475),(520,590),(500,700),(520,830),(490,1010)])
ring_n = smooth([(60,200),(180,250),(270,180)])  # conecta suburbio NO con río
road_nw= smooth([(90,90),(160,150),(230,250),(300,330),(380,430),(500,475)])
road_ne= smooth([(930,70),(850,140),(790,250),(740,340),(640,420)])
road_sw= smooth([(80,900),(170,830),(260,760),(400,640),(500,475)])
road_se= smooth([(930,920),(840,860),(760,760),(690,690),(540,690)])
road_se2=smooth([(1010,760),(900,700),(790,640),(700,650)])
road_n2= smooth([(640,420),(670,300),(640,190),(600,80),(590,-10)])
road_s2= smooth([(300,700),(260,830),(300,930),(330,1010)])
road_w2= smooth([(260,470),(220,380),(150,330),(60,300),(-10,290)])
road_e2= smooth([(780,402),(830,500),(920,560),(1010,540)])
MAIN=[('Avenida Mayor',avenue,9),('Calle Central',central,8),('Carretera NO',road_nw,6),('Carretera NE',road_ne,6),('Carretera SO',road_sw,6),('Carretera SE',road_se,6),
      ('road',road_se2,5),('road',road_n2,5),('road',road_s2,5),('road',road_w2,5),('road',road_e2,5)]
ROADPTS=[p for _,pl,_ in MAIN for p in pl]
def near(pts, x, y, r):
    r2=r*r
    return any((px-x)**2+(py-y)**2<r2 for px,py in pts)
RIVPTS=[p for p in river]
RAILPTS=[p for p in rail]
def in_ell(x,y,cx,cy,rx,ry,ang=0):
    a=math.radians(ang); dx=x-cx; dy=y-cy
    u=dx*math.cos(a)+dy*math.sin(a); v=-dx*math.sin(a)+dy*math.cos(a)
    return (u/rx)**2+(v/ry)**2<=1
# zonas: (nombre, cx,cy,rx,ry,ang, ángulo_calles, separación, tipo)
ZONES=[('casco',470,440,215,170,20,24,60,'old'),
       ('azul',150,165,150,130,0,-32,68,'sub'),
       ('rojo',870,160,140,120,0,14,80,'ind'),
       ('ambar',160,830,150,120,0,-20,72,'sub'),
       ('violeta',850,850,150,130,0,38,95,'farm'),
       ('mercado_s',600,560,60,50,0,10,60,'old'),
       ('industria',640,760,130,70,-10,-10,90,'ind'),
       ('res_oeste',130,470,90,110,0,-12,62,'sub'),
       ('res_este',930,470,70,100,0,20,66,'sub'),
       ('norte',650,215,120,105,0,-8,70,'sub'),('este_c',800,320,85,60,0,16,64,'sub'),('sur_c',330,885,120,95,0,12,74,'sub'),
       ('oeste_s',110,630,85,75,0,-6,66,'sub'),('centro_n',390,150,60,70,0,30,66,'sub'),('sur_e',720,540,60,50,0,-14,64,'old')]
svg=[]
A=svg.append
A('<svg xmlns="http://www.w3.org/2000/svg" viewBox="-20 -20 1040 1290" width="1700" height="2110" font-family="Helvetica,Arial,sans-serif">')
A('<defs><clipPath id="c"><rect x="0" y="0" width="1000" height="1000"/></clipPath>'
  '<pattern id="hatch" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(35)"><line x1="0" y1="0" x2="0" y2="6" stroke="#9fb27a" stroke-width="1.4" opacity=".5"/></pattern></defs>')
A('<rect x="-20" y="-20" width="1040" height="1040" fill="#14130f"/>')
A('<rect x="-40" y="-40" width="1100" height="1400" fill="#14130f"/>')
A('<g clip-path="url(#c)">')
A('<rect width="1000" height="1000" fill="#6f7258"/>')
# campos de cultivo
random.seed(3)
for (cx,cy,rx,ry,ang) in [(850,880,150,130,12),(930,720,70,60,12),(120,1000,200,70,0),(990,990,160,100,0),(700,960,120,60,8)]:
    n=0
    for i in range(14):
        x=cx-rx+random.random()*2*rx; y=cy-ry+random.random()*2*ry
        if in_ell(x,y,cx,cy,rx,ry):
            w=random.randint(45,95); h=random.randint(30,70); col=random.choice(['#7d7f55','#8a7f52','#6d7a4b','#85845a','#756a47'])
            A('<rect x="%.0f" y="%.0f" width="%d" height="%d" fill="%s" stroke="#9aa569" stroke-width="1" transform="rotate(%d %.0f %.0f)"/>'%(x,y,w,h,col,ang+random.choice([-4,0,5]),x,y))
# bosques
def blob(cx,cy,r,n=14,j=.35):
    pts=[]
    for i in range(n):
        a=2*math.pi*i/n; rr=r*(1-j/2+random.random()*j); pts.append((cx+rr*math.cos(a),cy+rr*math.sin(a)))
    return smooth(pts+[pts[0],pts[1]],6)
for (cx,cy,r) in [(70,30,110),(990,330,90),(980,820,70),(30,620,70),(520,1010,90),(250,540,40),(780,230,45),(690,100,60)]:
    A('<path d="%s Z" fill="#4a5a3a" opacity=".75"/>'%d(blob(cx,cy,r)))
    A('<path d="%s Z" fill="url(#hatch)"/>'%d(blob(cx,cy,r)))
# parque central y lago
A('<path d="%s Z" fill="#56663f"/>'%d(blob(385,305,48,12,.25)))
A('<path d="%s Z" fill="#5d6d63"/>'%d(blob(405,305,16,10,.3)))
# río

# calles locales (rejillas giradas por zona, recortadas a elipses)
def zone_streets(z):
    name,cx,cy,rx,ry,ang,sang,sp,kind=z
    a=math.radians(sang); out=[]; blocks=[]
    R=max(rx,ry)+40
    us=[]; u=-R
    while u<R: us.append(u); u+=sp*(.8+random.random()*.5)
    vs=[]; v=-R
    while v<R: vs.append(v); v+=sp*(.8+random.random()*.5)
    def tr(u,v): return (cx+u*math.cos(a)-v*math.sin(a), cy+u*math.sin(a)+v*math.cos(a))
    segs=[]
    for u in us:
        pts=[]
        for v in [x*8-R for x in range(int(2*R/8)+1)]:
            x,y=tr(u+math.sin(v*.02+u)*6,v); 
            if in_ell(x,y,cx,cy,rx,ry,ang): pts.append((x,y))
            else:
                if len(pts)>1: segs.append(pts)
                pts=[]
        if len(pts)>1: segs.append(pts)
    for v in vs:
        pts=[]
        for u in [x*8-R for x in range(int(2*R/8)+1)]:
            x,y=tr(u,v+math.sin(u*.02+v)*6)
            if in_ell(x,y,cx,cy,rx,ry,ang): pts.append((x,y))
            else:
                if len(pts)>1: segs.append(pts)
                pts=[]
        if len(pts)>1: segs.append(pts)
    # manzanas -> edificios
    for i in range(len(us)-1):
        for j in range(len(vs)-1):
            u0,u1=us[i]+9,us[i+1]-9; v0,v1=vs[j]+9,vs[j+1]-9
            if u1-u0<14 or v1-v0<14: continue
            cxm,cym=tr((u0+u1)/2,(v0+v1)/2)
            if not in_ell(cxm,cym,cx,cy,rx*.97,ry*.97,ang): continue
            if near(ROADPTS,cxm,cym,20) or near(RIVPTS,cxm,cym,30) or near(RAILPTS,cxm,cym,26): continue
            blocks.append((u0,u1,v0,v1,tr))
    return segs,blocks,a
def bcolor(kind):
    if kind=='old': return random.choice(['#6b5646','#5d4a3c','#74604e','#4f4034','#665a4e'])
    if kind=='sub': return random.choice(['#756a5a','#6a5f50','#7d7262','#5f5547'])
    if kind=='ind': return random.choice(['#55544e','#4a4944','#5e5d56'])
    return random.choice(['#c9a27a','#b98f6c'])
for z in ZONES:
    segs,blocks,a=zone_streets(z)
    for s in segs: A('<path d="%s" fill="none" stroke="#5b564c" stroke-width="5.5" stroke-linecap="round"/>'%d(s))
    for s in segs: A('<path d="%s" fill="none" stroke="#403c34" stroke-width="3.6" stroke-linecap="round"/>'%d(s))
    kind=z[8]
    for (u0,u1,v0,v1,tr) in blocks:
        du,dv=u1-u0,v1-v0
        if kind=='sub':
            n=random.randint(2,4)
            for k in range(n):
                bu=u0+random.random()*(du-18); bv=v0+random.random()*(dv-18); bw=random.randint(10,17); bh=random.randint(9,14)
                x,y=tr(bu,bv); A('<rect x="%.1f" y="%.1f" width="%d" height="%d" fill="%s" stroke="#2a241d" stroke-width=".6" transform="rotate(%.1f %.1f %.1f)"/>'%(x,y,bw,bh,bcolor(kind),math.degrees(a),x,y))
        elif kind=='ind':
            bw=min(du-8,random.randint(40,90)); bh=min(dv-8,random.randint(30,60)); bu=u0+4; bv=v0+4
            x,y=tr(bu,bv); A('<rect x="%.1f" y="%.1f" width="%d" height="%d" fill="%s" stroke="#6f6d64" stroke-width=".8" transform="rotate(%.1f %.1f %.1f)"/>'%(x,y,bw,bh,bcolor(kind),math.degrees(a),x,y))
        elif kind=='farm':
            if random.random()<.4:
                bu=u0+random.random()*(du-20); bv=v0+random.random()*(dv-20); x,y=tr(bu,bv)
                A('<rect x="%.1f" y="%.1f" width="16" height="11" fill="#b58a63" stroke="#241d16" stroke-width=".6" transform="rotate(%.1f %.1f %.1f)"/>'%(x,y,math.degrees(a),x,y))
        else:
            # casco antiguo: manzana casi llena de edificios pegados
            bu=u0; 
            while bu<u1-10:
                bw=random.randint(12,22); bv=v0; 
                while bv<v1-10:
                    bh=random.randint(12,20)
                    if random.random()<.85:
                        x,y=tr(bu,bv); A('<rect x="%.1f" y="%.1f" width="%d" height="%d" fill="%s" stroke="#241d16" stroke-width=".6" transform="rotate(%.1f %.1f %.1f)"/>'%(x,y,min(bw,u1-bu),min(bh,v1-bv),bcolor(kind),math.degrees(a),x,y))
                    bv+=bh+1
                bu+=bw+1
# arterias principales
for nm,pl,w in MAIN:
    A('<path d="%s" fill="none" stroke="#2b2823" stroke-width="%d" stroke-linecap="round" stroke-linejoin="round"/>'%(d(pl),w+3))
for nm,pl,w in MAIN:
    A('<path d="%s" fill="none" stroke="#8a8374" stroke-width="%d" stroke-linecap="round" stroke-linejoin="round"/>'%(d(pl),w))
for nm,pl,w in MAIN[:2]:
    A('<path d="%s" fill="none" stroke="#8f7d33" stroke-width="1" stroke-dasharray="8 7"/>'%d(pl))
# ferrocarril
A('<path d="%s" fill="none" stroke="#5d5a54" stroke-width="7"/>'%d(rail))
A('<path d="%s" fill="none" stroke="#2b2a27" stroke-width="3.5" stroke-dasharray="5 5"/>'%d(rail))
# puentes
for (x,y,ang) in [(332,335,40),(448,398,28),(590,590,80),(672,700,25),(692,722,30)]:
    pass
# lugares singulares
def box(x,y,w,h,fill,label=None,ang=0,stroke='#4b4136'):
    A('<rect x="%.0f" y="%.0f" width="%d" height="%d" fill="%s" stroke="%s" stroke-width="1.6" rx="2" transform="rotate(%d %.0f %.0f)"/>'%(x-w/2,y-h/2,w,h,fill,stroke,ang,x,y))
# plaza triangular del mercado (donde la avenida se une a la calle central)
A('<path d="M470,455 L545,480 L520,545 L455,520 Z" fill="#e6d8b8" stroke="#2b2823" stroke-width="2"/>')
for (x,y) in [(485,480),(505,495),(495,520),(525,505),(470,500)]:
    A('<rect x="%d" y="%d" width="9" height="6" fill="#d98a4a" stroke="#241d16" stroke-width=".6"/>'%(x,y))
# supermercado + aparcamiento
A('<rect x="610" y="350" width="105" height="55" fill="#55524a" stroke="#2b2823"/>')
for i in range(4):
    for j in range(7): A('<line x1="%d" y1="%d" x2="%d" y2="%d" stroke="#fff" stroke-width="1"/>'%(614+j*14,356+i*12,614+j*14,364+i*12))
box(690,372,48,30,'#e0b25a'); 
# gasolinera en cruce
box(790,432,28,22,'#d0cdc2'); box(805,414,14,10,'#e0b25a')
# clínica
box(408,468,34,24,'#f2f2f0'); A('<path d="M402,468 h12 M408,462 v12" stroke="#d22" stroke-width="3"/>')
# estación
box(540,672,54,22,'#c8c3b7',ang=-4); A('<rect x="500" y="684" width="96" height="6" fill="#bfbab0" stroke="#6b6860" stroke-width=".8" transform="rotate(-6 540 690)"/>')
# nave de carga industrial
for (x,y,w,h) in [(610,780,80,40),(705,790,60,36),(650,830,70,32),(760,740,50,30)]: box(x,y,w,h,'#a7a59b',ang=-8)
# iglesia/plaza antigua
A('<circle cx="430" cy="395" r="16" fill="#e6d8b8" stroke="#2b2823" stroke-width="2"/>'); box(430,395,10,18,'#b98f6c')

random.seed(11)
def car(x,y,ang,col=None):
    col=col or random.choice(['#4a4c50','#5a3f35','#3f4a52','#554f3f','#44403a'])
    A('<rect x="%.1f" y="%.1f" width="9" height="4.4" rx="1.2" fill="%s" stroke="#14120e" stroke-width=".7" transform="rotate(%.0f %.1f %.1f)"/>'%(x-4.5,y-2.2,col,ang,x,y))
def tangent(pl,i):
    j=min(i+1,len(pl)-1); k=max(i-1,0); return math.degrees(math.atan2(pl[j][1]-pl[k][1],pl[j][0]-pl[k][0]))
# vehículos abandonados en las arterias (atascos congelados)
for nm,pl,w in MAIN[:6]:
    for i in range(6,len(pl)-6,random.randint(9,16)):
        if random.random()<.55:
            ang=tangent(pl,i)+random.choice([0,0,0,180,12,-14,90]); nx=math.cos(math.radians(tangent(pl,i)+90))*random.uniform(-3,3); ny=math.sin(math.radians(tangent(pl,i)+90))*random.uniform(-3,3)
            car(pl[i][0]+nx,pl[i][1]+ny,ang)
# barricadas y cortes (X rojas) = cuellos de botella
BARR=[(325,300),(560,418),(420,590),(655,520),(235,258),(760,340),(500,640),(300,520),(640,650),(840,500),(120,640),(850,720)]
for (x,y) in BARR:
    A('<g stroke="#a8321f" stroke-width="3" stroke-linecap="round"><line x1="%d" y1="%d" x2="%d" y2="%d"/><line x1="%d" y1="%d" x2="%d" y2="%d"/></g>'%(x-7,y-7,x+7,y+7,x-7,y+7,x+7,y-7))
    A('<circle cx="%d" cy="%d" r="11" fill="none" stroke="#a8321f" stroke-width="1.2" stroke-dasharray="3 3"/>'%(x,y))
# zonas quemadas y derrumbes
for (cx,cy,r) in [(805,415,34),(360,490,26),(610,330,30),(205,885,28),(745,505,22),(480,600,20)]:
    A('<path d="%s Z" fill="#0f0e0b" opacity=".55"/>'%d(blob(cx,cy,r,12,.5)))
for (cx,cy,r) in [(425,395,0),(930,240,0),(560,520,0)]:
    pass
# incendios y columnas de humo
for (x,y) in [(805,420),(362,488),(612,328),(207,880),(900,300),(560,560)]:
    A('<circle cx="%d" cy="%d" r="9" fill="#ff7a1a" opacity=".35"/><circle cx="%d" cy="%d" r="4" fill="#ffb347"/>'%(x,y,x,y))
    A('<path d="M%d,%d c-10,-30 12,-55 -2,-85 c-8,-18 6,-36 18,-50" fill="none" stroke="#2c2a27" stroke-width="12" opacity=".35" stroke-linecap="round"/>'%(x,y-8))
# cráter y helicóptero caído
A('<circle cx="545" cy="150" r="22" fill="#1b1914" stroke="#4b463b" stroke-width="3"/><circle cx="545" cy="150" r="12" fill="#0f0e0b"/>')
A('<g transform="translate(700,140) rotate(25)"><rect x="-14" y="-4" width="28" height="8" rx="3" fill="#3e4a3a" stroke="#14120e"/><line x1="-26" y1="-12" x2="26" y2="10" stroke="#14120e" stroke-width="2"/></g>')
# puesto militar abandonado + valla de cuarentena
A('<rect x="676" y="600" width="26" height="16" fill="#3e4a3a" stroke="#14120e" stroke-width="1.4"/><path d="M660,596 L720,596 L720,624 L660,624 Z" fill="none" stroke="#c9b24a" stroke-width="1.6" stroke-dasharray="6 4"/>')
A('<path d="M20,300 L20,610" stroke="#c9b24a" stroke-width="2" stroke-dasharray="7 5"/>')
# grietas y edificio colapsado
A('<path d="M520,505 l14,10 l-6,12 l16,9" fill="none" stroke="#14120e" stroke-width="2"/>')
# hierba/vegetación invadiendo (puntos oscuros verdosos sobre asfalto)
for i in range(120):
    x=random.uniform(0,1000); y=random.uniform(0,1000)
    A('<circle cx="%.0f" cy="%.0f" r="%.1f" fill="#4a5a3a" opacity=".55"/>'%(x,y,random.uniform(1.5,4)))

# refugios (4)
REF=[('AZUL',120,110,'#4aa0ff'),('ROJO',905,175,'#ff5a48'),('ÁMBAR',130,840,'#ffb92e'),('VIOLETA',860,835,'#b377ff')]
for nm,x,y,col in REF:
    A('<circle cx="%d" cy="%d" r="46" fill="%s" opacity=".18"/>'%(x,y,col))
    A('<path d="M%d,%d l30,0 l0,10 l-8,0 l0,18 l-14,0 l0,-18 l-8,0 z" fill="none"/>'%(x-15,y-15))
    A('<rect x="%d" y="%d" width="44" height="34" fill="#d9d2c0" stroke="%s" stroke-width="4"/>'%(x-22,y-17,col))
    A('<rect x="%d" y="%d" width="14" height="14" fill="%s"/>'%(x-7,y-7,col))
    A('<text x="%d" y="%d" font-size="13" font-weight="800" fill="%s" text-anchor="middle" stroke="#0b0a08" stroke-width="4" paint-order="stroke">REFUGIO %s</text>'%(x,y+50,col,nm))

# ================= CAPA TÁCTICA / ESTRATÉGICA =================
A('<g>')
# influencia de cada facción (zona de partida)
for nm,x,y,col in REF:
    A('<circle cx="%d" cy="%d" r="165" fill="%s" opacity=".10"/>'%(x,y,col)); A('<circle cx="%d" cy="%d" r="165" fill="none" stroke="%s" stroke-width="1.5" stroke-dasharray="3 6" opacity=".7"/>'%(x,y,col))
# ejes de avance
def route(pts,col,w=3,dash=None,arrow=True):
    pl=smooth(pts)
    A('<path d="%s" fill="none" stroke="%s" stroke-width="%s" stroke-linecap="round" %s opacity=".95"/>'%(d(pl),col,w,('stroke-dasharray="%s"'%dash) if dash else ''))
    if arrow:
        (x1,y1),(x2,y2)=pl[-6],pl[-1]; a=math.atan2(y2-y1,x2-x1)
        A('<path d="M%.0f,%.0f l%.0f,%.0f l%.0f,%.0f z" fill="%s"/>'%(x2,y2,-12*math.cos(a-.45),-12*math.sin(a-.45),-12*math.cos(a+.45)+12*math.cos(a-.45),-12*math.sin(a+.45)+12*math.sin(a-.45),col))
FAST='#ff5a48'; COVER='#7fd1ff'; FLANK='#8fe070'
# kill-lane de la avenida (larga, expuesta, rápida)
A('<path d="%s" fill="none" stroke="#ff5a48" stroke-width="26" opacity=".16" stroke-linecap="round"/>'%d(avenue[8:50]))
route([(150,170),(230,255),(320,350),(420,430),(480,470)],COVER)          # azul → plaza por calles locales
route([(160,110),(260,200),(300,330)],FLANK,3,'8 6')                         # azul flanco por bosque y parque
route([(870,190),(800,300),(700,410),(540,480)],COVER)                       # rojo → plaza
route([(930,240),(985,360),(960,480),(880,560)],FLANK,3,'8 6')               # rojo flanco por el bosque este
route([(170,830),(260,760),(400,650),(500,520)],COVER)                       # ámbar → plaza
route([(60,780),(30,620),(60,540)],FLANK,3,'8 6')                            # ámbar flanco oeste
route([(840,810),(730,720),(600,640),(520,560)],COVER)                       # violeta → plaza (por naves y estación)
route([(900,890),(980,800),(1000,640)],FLANK,3,'8 6')                        # violeta flanco por campos
route([(140,470),(300,478),(470,490)],FAST); route([(880,420),(760,410),(540,480)],FAST)   # avenida desde oeste y este
# horda itinerante (recorrido) y nidos
A('<path d="%s" fill="none" stroke="#c78bff" stroke-width="3" stroke-dasharray="2 7" stroke-linecap="round" opacity=".95"/>'%d(smooth([(500,60),(470,200),(480,330),(500,470),(520,600),(510,740),(520,880)])))
def zom(x,y,r=22,n=7):
    A('<circle cx="%d" cy="%d" r="%d" fill="#7ad04c" opacity=".16" stroke="#7ad04c" stroke-width="1.2" stroke-dasharray="3 3"/>'%(x,y,r))
    for i in range(n):
        a=random.random()*6.28; rr=random.random()*r*.8; A('<circle cx="%.0f" cy="%.0f" r="2.6" fill="#9be36a" stroke="#1c2a12" stroke-width=".6"/>'%(x+math.cos(a)*rr,y+math.sin(a)*rr))
for (x,y,r,n) in [(300,600,30,7),(610,560,26,6),(760,260,26,6),(420,780,30,8),(220,380,26,6),(590,270,24,6),(940,620,24,5),(330,990,24,5)]: zom(x,y,r,n)
# puntos fuertes: muro + portón en accesos, torres
def wallgate(x,y,ang,lv=1):
    A('<g transform="translate(%d,%d) rotate(%d)"><rect x="-26" y="-4" width="20" height="8" fill="#b08a55" stroke="#15130f" stroke-width="1.2"/><rect x="-5" y="-5" width="10" height="10" fill="#e8c26a" stroke="#15130f" stroke-width="1.2"/><rect x="6" y="-4" width="20" height="8" fill="#b08a55" stroke="#15130f" stroke-width="1.2"/></g>'%(x,y,ang))
def tower(x,y):
    A('<path d="M%d,%d l9,16 l-18,0 z" fill="#e8c26a" stroke="#15130f" stroke-width="1.6"/><circle cx="%d" cy="%d" r="30" fill="none" stroke="#e8c26a" stroke-width="1" stroke-dasharray="2 4" opacity=".7"/>'%(x,y-9,x,y))
for (x,y,a) in [(225,235,35),(840,262,-40),(255,770,-35),(765,770,40),(345,370,40),(690,420,-35),(440,640,-35),(600,640,25)]: wallgate(x,y,a)
for (x,y) in [(180,150),(870,220),(190,800),(830,800),(500,455),(655,375),(540,665),(790,425)]: tower(x,y)
# numeración de objetivos
OBJ=[(1,500,505,'Plaza + clínica'),(2,430,395,'Iglesia · casco'),(3,660,380,'Supermercado'),(4,790,432,'Gasolinera'),(5,540,672,'Estación'),(6,670,795,'Naves de carga'),(7,385,305,'Parque · lago'),(8,210,880,'Colegio')]
for n,x,y,nm in OBJ:
    A('<circle cx="%d" cy="%d" r="14" fill="#f0e6c8" stroke="#15130f" stroke-width="2.5"/><text x="%d" y="%d" font-size="16" font-weight="900" fill="#15130f" text-anchor="middle">%d</text>'%(x,y,x,y+5.5,n))
A('</g>')

A('<rect width="1000" height="1000" fill="#0b0d0f" opacity=".12"/>')
A('<defs><radialGradient id="vg" cx="50%" cy="50%" r="72%"><stop offset="55%" stop-color="#000" stop-opacity="0"/><stop offset="100%" stop-color="#000" stop-opacity=".72"/></radialGradient>'
  '<linearGradient id="fog" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#9aa3a0" stop-opacity=".30"/><stop offset=".45" stop-color="#9aa3a0" stop-opacity="0"/><stop offset="1" stop-color="#9aa3a0" stop-opacity=".22"/></linearGradient></defs>')
A('<rect width="1000" height="1000" fill="url(#fog)"/><rect width="1000" height="1000" fill="url(#vg)"/>')
A('</g>')
# etiquetas
def lab(x,y,t,size=14,col='#d8d2c0',w=700,anchor='middle',rot=0):
    A('<text x="%.0f" y="%.0f" font-size="%d" font-weight="%d" fill="%s" text-anchor="%s" stroke="#17160f" stroke-width="3.5" paint-order="stroke" transform="rotate(%d %.0f %.0f)">%s</text>'%(x,y,size,w,col,anchor,rot,x,y,t))
lab(300,495,'AVENIDA MAYOR',13,rot=-4); lab(545,255,'CALLE CENTRAL',12,rot=88)
lab(560,525,'Plaza del Mercado',11); lab(660,343,'Supermercado saqueado',12); lab(805,455,'Gasolinera (incendiada)',11); lab(408,447,'Clínica',11)
lab(540,653,'Estación',12); lab(660,853,'Naves · patio de carga',12); lab(430,377,'Iglesia (campanario caído)',10); lab(380,355,'Parque (estanque seco)',11)
lab(130,722,'Ferrocarril',11,'#5d5a54'); lab(395,560,'Casco antiguo · zona cero',13,w=800)
lab(260,235,'Residencial «colina»',12); lab(860,255,'Fábrica abandonada',12); lab(150,935,'Colegio y viviendas',12); lab(860,935,'Granjas y silos',12)
lab(60,95,'Bosque',12,'#4c6b3c'); lab(960,365,'Bosque',12,'#4c6b3c')
# puentes (marcas)

# escala, norte
A('<g transform="translate(40,985)"><rect x="0" y="0" width="200" height="6" fill="#d8d2c0"/><rect x="0" y="0" width="100" height="6" fill="#fff" stroke="#d8d2c0"/><text x="0" y="-5" font-size="12" font-weight="700">0 m</text><text x="92" y="-5" font-size="12" font-weight="700">100</text><text x="190" y="-5" font-size="12" font-weight="700">200 m</text></g>')
A('<g transform="translate(960,60)"><path d="M0,-30 L9,10 L0,2 L-9,10 Z" fill="#d8d2c0"/><text x="-5" y="-36" font-size="16" font-weight="800">N</text></g>')
A('<rect x="0" y="0" width="1000" height="1000" fill="none" stroke="#d8d2c0" stroke-width="3"/>')
A('<g font-size="12" fill="#d8d2c0" transform="translate(2000,2000)"><text x="0" y="0" fill="#ff6a52" font-weight="800">✕ barricada / corte</text><text x="125" y="0" fill="#ff9a3a" font-weight="800">● incendio</text><text x="200" y="0" fill="#c9b24a" font-weight="800">┄ cuarentena</text></g>')

# ---- panel de leyenda ----
A('<g transform="translate(0,1040)" font-size="13" fill="#e6e0cf">')
A('<text x="0" y="12" font-size="18" font-weight="800">LECTURA TÁCTICA</text>')
def L(x,y,sym,txt): A('<g transform="translate(%d,%d)">%s<text x="26" y="4" font-size="13">%s</text></g>'%(x,y,sym,txt))
L(0,42,'<line x1="0" y1="0" x2="20" y2="0" stroke="#7fd1ff" stroke-width="3"/>','Eje cubierto: calles y edificios, ritmo medio')
L(0,68,'<line x1="0" y1="0" x2="20" y2="0" stroke="#ff5a48" stroke-width="3"/>','Eje rápido y expuesto: avenida (línea de tiro larga)')
L(0,94,'<line x1="0" y1="0" x2="20" y2="0" stroke="#8fe070" stroke-width="3" stroke-dasharray="6 4"/>','Flanco: bosque y campo, lento y silencioso')
L(0,120,'<line x1="0" y1="0" x2="20" y2="0" stroke="#c78bff" stroke-width="3" stroke-dasharray="2 6"/>','Recorrido de la horda itinerante')
L(0,146,'<circle r="8" fill="#7ad04c" opacity=".5"/>','Nido de zombis dormidos (se despiertan con el ruido)')
L(0,172,'<circle r="8" fill="#f0e6c8" stroke="#15130f" stroke-width="2"/>','Objetivos capturables o disputados (números)')
L(500,42,'<rect x="-2" y="-4" width="8" height="8" fill="#b08a55"/><rect x="7" y="-4" width="6" height="8" fill="#e8c26a"/><rect x="14" y="-4" width="8" height="8" fill="#b08a55"/>','Muro + portón mejorable (madera → piedra → hierro)')
L(500,68,'<path d="M10,-8 l9,16 l-18,0 z" fill="#e8c26a"/>','Torre ocupable: vigía y fuego sobre la calle')
L(500,94,'<g stroke="#ff6a52" stroke-width="3"><line x1="1" y1="-6" x2="15" y2="8"/><line x1="1" y1="8" x2="15" y2="-6"/></g>','Corte / barricada: se refuerza, se abre o se revienta')
L(500,120,'<rect x="0" y="-3" width="16" height="7" rx="2" fill="#5a3f35"/>','Coches y objetos empujables: cobertura móvil')
L(500,146,'<circle r="9" fill="#4aa0ff" opacity=".25" stroke="#4aa0ff" stroke-dasharray="3 5"/>','Zona de partida de cada facción (~165 m)')
L(500,172,'<circle r="9" fill="#ff7a1a" opacity=".6"/>','Incendio / zona quemada (bloquea o canaliza el paso)')
A('</g>')

A('</svg>')
open('/tmp/claude-0/prof/map/mapa.svg','w').write('\n'.join(svg))
