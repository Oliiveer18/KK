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

river = smooth([(300,-10),(345,110),(285,215),(330,330),(430,420),(560,500),(600,610),(690,720),(700,840),(650,1010)])
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
A('<svg xmlns="http://www.w3.org/2000/svg" viewBox="-20 -20 1040 1040" width="1700" height="1700" font-family="Helvetica,Arial,sans-serif">')
A('<defs><clipPath id="c"><rect x="0" y="0" width="1000" height="1000"/></clipPath>'
  '<pattern id="hatch" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(35)"><line x1="0" y1="0" x2="0" y2="6" stroke="#9fb27a" stroke-width="1.4" opacity=".5"/></pattern></defs>')
A('<rect x="-20" y="-20" width="1040" height="1040" fill="#e9e4d4"/>')
A('<g clip-path="url(#c)">')
A('<rect width="1000" height="1000" fill="#d6dcb4"/>')
# campos de cultivo
random.seed(3)
for (cx,cy,rx,ry,ang) in [(850,880,150,130,12),(930,720,70,60,12),(120,1000,200,70,0),(990,990,160,100,0),(700,960,120,60,8)]:
    n=0
    for i in range(14):
        x=cx-rx+random.random()*2*rx; y=cy-ry+random.random()*2*ry
        if in_ell(x,y,cx,cy,rx,ry):
            w=random.randint(45,95); h=random.randint(30,70); col=random.choice(['#c9cf8a','#dccd8a','#b9c785','#d9d79b','#c4b47a'])
            A('<rect x="%.0f" y="%.0f" width="%d" height="%d" fill="%s" stroke="#9aa569" stroke-width="1" transform="rotate(%d %.0f %.0f)"/>'%(x,y,w,h,col,ang+random.choice([-4,0,5]),x,y))
# bosques
def blob(cx,cy,r,n=14,j=.35):
    pts=[]
    for i in range(n):
        a=2*math.pi*i/n; rr=r*(1-j/2+random.random()*j); pts.append((cx+rr*math.cos(a),cy+rr*math.sin(a)))
    return smooth(pts+[pts[0],pts[1]],6)
for (cx,cy,r) in [(70,30,110),(990,330,90),(980,820,70),(30,620,70),(520,1010,90),(250,540,40),(780,230,45),(690,100,60)]:
    A('<path d="%s Z" fill="#8fb06a" opacity=".75"/>'%d(blob(cx,cy,r)))
    A('<path d="%s Z" fill="url(#hatch)"/>'%d(blob(cx,cy,r)))
# parque central y lago
A('<path d="%s Z" fill="#a8c882"/>'%d(blob(385,305,48,12,.25)))
A('<path d="%s Z" fill="#7fb3c4"/>'%d(blob(405,305,16,10,.3)))
# río
A('<path d="%s" fill="none" stroke="#9fc9d6" stroke-width="34" stroke-linecap="round" stroke-linejoin="round"/>'%d(river))
A('<path d="%s" fill="none" stroke="#7fb3c4" stroke-width="26" stroke-linecap="round" stroke-linejoin="round"/>'%d(river))
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
    if kind=='old': return random.choice(['#c9a27a','#b98f6c','#d2b08a','#a9825f','#c8b199'])
    if kind=='sub': return random.choice(['#d8c0a0','#cdb292','#e0cfb2','#bda585'])
    if kind=='ind': return random.choice(['#a7a59b','#98968c','#b3b0a4'])
    return random.choice(['#c9a27a','#b98f6c'])
for z in ZONES:
    segs,blocks,a=zone_streets(z)
    for s in segs: A('<path d="%s" fill="none" stroke="#f2efe6" stroke-width="5.5" stroke-linecap="round"/>'%d(s))
    for s in segs: A('<path d="%s" fill="none" stroke="#c7c2b2" stroke-width="3.6" stroke-linecap="round"/>'%d(s))
    kind=z[8]
    for (u0,u1,v0,v1,tr) in blocks:
        du,dv=u1-u0,v1-v0
        if kind=='sub':
            n=random.randint(2,4)
            for k in range(n):
                bu=u0+random.random()*(du-18); bv=v0+random.random()*(dv-18); bw=random.randint(10,17); bh=random.randint(9,14)
                x,y=tr(bu,bv); A('<rect x="%.1f" y="%.1f" width="%d" height="%d" fill="%s" stroke="#7a6a58" stroke-width=".6" transform="rotate(%.1f %.1f %.1f)"/>'%(x,y,bw,bh,bcolor(kind),math.degrees(a),x,y))
        elif kind=='ind':
            bw=min(du-8,random.randint(40,90)); bh=min(dv-8,random.randint(30,60)); bu=u0+4; bv=v0+4
            x,y=tr(bu,bv); A('<rect x="%.1f" y="%.1f" width="%d" height="%d" fill="%s" stroke="#6f6d64" stroke-width=".8" transform="rotate(%.1f %.1f %.1f)"/>'%(x,y,bw,bh,bcolor(kind),math.degrees(a),x,y))
        elif kind=='farm':
            if random.random()<.4:
                bu=u0+random.random()*(du-20); bv=v0+random.random()*(dv-20); x,y=tr(bu,bv)
                A('<rect x="%.1f" y="%.1f" width="16" height="11" fill="#b58a63" stroke="#6b5640" stroke-width=".6" transform="rotate(%.1f %.1f %.1f)"/>'%(x,y,math.degrees(a),x,y))
        else:
            # casco antiguo: manzana casi llena de edificios pegados
            bu=u0; 
            while bu<u1-10:
                bw=random.randint(12,22); bv=v0; 
                while bv<v1-10:
                    bh=random.randint(12,20)
                    if random.random()<.85:
                        x,y=tr(bu,bv); A('<rect x="%.1f" y="%.1f" width="%d" height="%d" fill="%s" stroke="#6b5640" stroke-width=".6" transform="rotate(%.1f %.1f %.1f)"/>'%(x,y,min(bw,u1-bu),min(bh,v1-bv),bcolor(kind),math.degrees(a),x,y))
                    bv+=bh+1
                bu+=bw+1
# arterias principales
for nm,pl,w in MAIN:
    A('<path d="%s" fill="none" stroke="#a79f8c" stroke-width="%d" stroke-linecap="round" stroke-linejoin="round"/>'%(d(pl),w+3))
for nm,pl,w in MAIN:
    A('<path d="%s" fill="none" stroke="#f7f3e8" stroke-width="%d" stroke-linecap="round" stroke-linejoin="round"/>'%(d(pl),w))
for nm,pl,w in MAIN[:2]:
    A('<path d="%s" fill="none" stroke="#e5c24a" stroke-width="1" stroke-dasharray="8 7"/>'%d(pl))
# ferrocarril
A('<path d="%s" fill="none" stroke="#5d5a54" stroke-width="7"/>'%d(rail))
A('<path d="%s" fill="none" stroke="#e9e4d4" stroke-width="3.5" stroke-dasharray="5 5"/>'%d(rail))
# puentes
for (x,y,ang) in [(332,335,40),(448,398,28),(590,590,80),(672,700,25),(692,722,30)]:
    pass
# lugares singulares
def box(x,y,w,h,fill,label=None,ang=0,stroke='#4b4136'):
    A('<rect x="%.0f" y="%.0f" width="%d" height="%d" fill="%s" stroke="%s" stroke-width="1.6" rx="2" transform="rotate(%d %.0f %.0f)"/>'%(x-w/2,y-h/2,w,h,fill,stroke,ang,x,y))
# plaza triangular del mercado (donde la avenida se une a la calle central)
A('<path d="M470,455 L545,480 L520,545 L455,520 Z" fill="#e6d8b8" stroke="#a79f8c" stroke-width="2"/>')
for (x,y) in [(485,480),(505,495),(495,520),(525,505),(470,500)]:
    A('<rect x="%d" y="%d" width="9" height="6" fill="#d98a4a" stroke="#6b5640" stroke-width=".6"/>'%(x,y))
# supermercado + aparcamiento
A('<rect x="610" y="350" width="105" height="55" fill="#cfcabd" stroke="#a79f8c"/>')
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
A('<circle cx="430" cy="395" r="16" fill="#e6d8b8" stroke="#a79f8c" stroke-width="2"/>'); box(430,395,10,18,'#b98f6c')
# refugios (4)
REF=[('AZUL',120,110,'#2f7bd9'),('ROJO',905,175,'#e04a3d'),('ÁMBAR',130,840,'#e8a321'),('VIOLETA',860,835,'#8d4fd6')]
for nm,x,y,col in REF:
    A('<circle cx="%d" cy="%d" r="46" fill="%s" opacity=".18"/>'%(x,y,col))
    A('<path d="M%d,%d l30,0 l0,10 l-8,0 l0,18 l-14,0 l0,-18 l-8,0 z" fill="none"/>'%(x-15,y-15))
    A('<rect x="%d" y="%d" width="44" height="34" fill="#d9d2c0" stroke="%s" stroke-width="4"/>'%(x-22,y-17,col))
    A('<rect x="%d" y="%d" width="14" height="14" fill="%s"/>'%(x-7,y-7,col))
    A('<text x="%d" y="%d" font-size="13" font-weight="800" fill="%s" text-anchor="middle" stroke="#fff" stroke-width="3" paint-order="stroke">REFUGIO %s</text>'%(x,y+50,col,nm))
A('</g>')
# etiquetas
def lab(x,y,t,size=14,col='#3a332a',w=700,anchor='middle',rot=0):
    A('<text x="%.0f" y="%.0f" font-size="%d" font-weight="%d" fill="%s" text-anchor="%s" stroke="#fff" stroke-width="3.5" paint-order="stroke" transform="rotate(%d %.0f %.0f)">%s</text>'%(x,y,size,w,col,anchor,rot,x,y,t))
lab(300,495,'AVENIDA MAYOR',13,rot=-4); lab(545,255,'CALLE CENTRAL',12,rot=88)
lab(500,508,'Plaza del Mercado',12); lab(660,343,'Supermercado',12); lab(805,455,'Gasolinera',11); lab(408,447,'Clínica',11)
lab(540,653,'Estación',12); lab(660,853,'Naves y patio de carga',12); lab(430,377,'Iglesia',11); lab(380,355,'Parque y lago',11)
lab(332,150,'Río',14,'#3a7690',rot=70); lab(130,722,'Ferrocarril',11,'#5d5a54'); lab(395,560,'Casco antiguo',13,w=800)
lab(260,235,'Residencial «colina»',12); lab(860,255,'Antigua fábrica',12); lab(150,935,'Colegio y viviendas',12); lab(860,935,'Granjas y silos',12)
lab(60,95,'Bosque',12,'#4c6b3c'); lab(960,365,'Bosque',12,'#4c6b3c')
# puentes (marcas)
br=[]
for nm,pl,w in MAIN+[('rail',rail,7)]:
    last=None
    for i,(px,py) in enumerate(pl):
        dm=min(((px-rx)**2+(py-ry)**2,(rx,ry)) for rx,ry in river)
        if dm[0]<14**2 and (last is None or i-last>12):
            if all((px-bx)**2+(py-by)**2>60**2 for bx,by,_ in br):
                j=min(i+1,len(pl)-1); ang=math.degrees(math.atan2(pl[j][1]-pl[i-1][1],pl[j][0]-pl[i-1][0])); br.append((px,py,ang))
            last=i
for (x,y,ang) in br:
    A('<rect x="%.0f" y="%.0f" width="40" height="15" fill="#e9e4d4" stroke="#4b4136" stroke-width="2" transform="rotate(%.0f %.0f %.0f)"/>'%(x-20,y-7.5,ang,x,y))
print('puentes',len(br))
# escala, norte
A('<g transform="translate(40,985)"><rect x="0" y="0" width="200" height="6" fill="#3a332a"/><rect x="0" y="0" width="100" height="6" fill="#fff" stroke="#3a332a"/><text x="0" y="-5" font-size="12" font-weight="700">0 m</text><text x="92" y="-5" font-size="12" font-weight="700">100</text><text x="190" y="-5" font-size="12" font-weight="700">200 m</text></g>')
A('<g transform="translate(960,60)"><path d="M0,-30 L9,10 L0,2 L-9,10 Z" fill="#3a332a"/><text x="-5" y="-36" font-size="16" font-weight="800">N</text></g>')
A('<rect x="0" y="0" width="1000" height="1000" fill="none" stroke="#3a332a" stroke-width="3"/>')
A('</svg>')
open('/tmp/claude-0/prof/map/mapa.svg','w').write('\n'.join(svg))
