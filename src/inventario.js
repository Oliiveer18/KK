/* Inventario de la campaña. Los estantes y los cuerpos conservan una sola reserva
   compartida. La distancia y las existencias se comprueban en cada transferencia. */
const INVENTARIO = (() => {
  const names = {repair:'Kit de reparación', material:'Material', ammo:'Munición', medkit:'Botiquín', revive:'Kit de reanimación'};
  const slots = {helmet:'Casco', vest:'Chaleco', pack:'Mochila'};
  for (const [key, name] of Object.entries(slots))
    for (let level = 1; level <= 3; level++) names[key + level] = name + ' ' + level;
  const shelves = {storeMat:['material','repair'], storeAmmo:['ammo'], storeMed:['medkit','revive']};
  shelves.storeMat.push(...Object.keys(names).filter(k=>/^(helmet|vest|pack)/.test(k)));
  const catalog = {material:'material', 'munición':'ammo', 'botiquín':'medkit', 'kit de reanimación':'revive'};
  const containers = new Set();
  function gear(bag, slot) {
    for (let level = 3; level > 0; level--) if (bag[slot + level]) return level;
    return 0;
  }
  function capacity(bag) { return 6 + 4 * gear(bag, 'pack'); }
  function count(bag) { return Object.values(bag).reduce((sum, n) => sum + n, 0); }
  const limits = {helmet1:10, helmet2:20, helmet3:30, vest1:25, vest2:50, vest3:70};
  const piecesByStock = new WeakMap();
  function pieces(stock) {
    if (!piecesByStock.has(stock)) {
      const items = [];
      for (const key of Object.keys(limits))
        for (let i=0; i<(stock[key] || 0); i++) items.push({key, points:limits[key]});
      piecesByStock.set(stock, items);
    }
    return piecesByStock.get(stock);
  }
  function slotOf(item) { return item.key.slice(0,-1); }
  function protection(e) {
    return Object.values(e.worn).reduce((sum,item)=>sum+item.points,0);
  }
  function equip(e,item) {
    if (e.dead || e.dwn || !pieces(e.bag).includes(item)) return false;
    e.worn[slotOf(item)] = item;
    e.sh = protection(e);
    MX.refreshGear(e);
    return true;
  }
  function absorb(e,damage) {
    const total = protection(e);
    if (!total) return damage;
    const remaining = Math.max(0,total-damage);
    for (const item of Object.values(e.worn)) item.points *= remaining/total;
    e.sh = protection(e);
    return Math.max(0,damage-total);
  }
  function nearRefuge(e) {
    return MX.M.spawn[e.team].some(s=>Math.hypot(s.x-e.p.x,s.z-e.p.z)<=4);
  }
  function repair(e,item,resource) {
    if (e.dead || e.dwn || !pieces(e.bag).includes(item) || item.points>=limits[item.key]) return false;
    if (resource!=='repair' && !(resource==='material' && nearRefuge(e))) return false;
    if (!e.bag[resource]) return false;
    e.bag[resource]--;
    item.points = limits[item.key];
    e.sh = protection(e);
    return true;
  }
  function describe(item) {
    return names[item.key]+' · '+Math.round(item.points*10)/10+' / '+limits[item.key];
  }
  function spawn(e) {
    if (e.bag) return;
    e.bag = {helmet2:1, vest2:1, pack1:1, revive:1};
    e.worn = {};
    for (const item of pieces(e.bag)) e.worn[slotOf(item)] = item;
    Object.defineProperty(e, 'kits', {
      get() { return this.bag.revive || 0; },
      set(n) { this.bag.revive = n; }
    });
  }
  /* equipo de clase: sustituye la mochila y lo puesto por el del kit (piezas de mejor nivel puestas) y recarga la protección */
  function setKit(e, kit) {
    e.bag = Object.assign({}, kit); e.worn = {};
    if (!Object.getOwnPropertyDescriptor(e,'kits')) Object.defineProperty(e, 'kits', { get() { return this.bag.revive || 0; }, set(n) { this.bag.revive = n; } });
    for (const item of pieces(e.bag)) { const sl = slotOf(item), w = e.worn[sl]; if (!w || limits[item.key] > limits[w.key]) e.worn[sl] = item; }
    e.sh = protection(e); MX.refreshGear && MX.refreshGear(e);
  }
  function appearance(e) {
    return {helmet:Number(e.worn.helmet?.key.slice(-1)||0), vest:Number(e.worn.vest?.key.slice(-1)||0), pack:gear(e.bag,'pack')};
  }
  function register(p) {
    const loot = OBJ.contents(p);
    if (!shelves[p.type] && !loot.length) return;
    p.stock = {};
    /* distrito: la misma cantidad en el mismo contenedor de los 4 cuartos (semilla según |x| y |z|, que no cambian al girar el mapa): botín igual para todas las facciones */
    let seed = MX.district ? (Math.round(Math.min(Math.abs(p.x), Math.abs(p.z)) * 7) * 73856093 ^ Math.round(Math.max(Math.abs(p.x), Math.abs(p.z)) * 7) * 19349663) >>> 0 : 0;
    const R = () => { if (!MX.district) return Math.random(); seed = (seed + 0x6D2B79F5) >>> 0; let t = seed; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
    for (const {k,n} of loot) if (catalog[k])
      p.stock[catalog[k]] = n[0] + Math.floor(R() * (1 + n[1] - n[0]));
    if (p.type === 'pharmaCab') p.stock.revive = 1;
    if (p.type==='storeMat') Object.assign(p.stock,{helmet1:1,helmet3:1,vest1:1,vest3:1,repair:1});
    if (p.type==='supplyMat') p.stock.repair=1;
    containers.add(p);
  }
  function start() {
    props.forEach(register);
    OBJ.on.push((event,p) => {
      if (event === 'add') register(p);
      if (event === 'break') containers.delete(p);
    });
    // El escenario de ensayo también ofrece las tres estanterías y suministros.
    if (!MX.district) {
      ['storeMat','storeAmmo','storeMed'].forEach((key,i) => OBJ.place(key,-42+2*i,-8,0,0));
      const reserves=props.find(p=>p.type==='storeMat');
      reserves.stock.material=48;
      OBRAS.start();
      ['material','ammo','medkit','revive'].forEach((key,i) => OBJ.pickup(key,-42+i*1.1,-5));
    }
    openButton.hidden = false;
  }
  function death(e) {
    if (!e.bag || !count(e.bag)) return;
    const marker = OBJ.pickup('pack1',e.p.x,e.p.z);
    marker.stock = e.bag;
    marker.ownerId = e.id;
    e.bag = {};
    e.worn = {};
    e.sh = 0;
  }
  function distance(e,s) {
    return Math.hypot(Math.max(0,Math.abs(e.p.x-s.x)-(s.hx||0)),
                      Math.max(0,Math.abs(e.p.z-s.z)-(s.hz||0)));
  }
  function reachable(e,s) { return !s.dead && distance(e,s)<=2.1 && MX.reachSupply(e,s); }
  function sources(e) {
    return [...containers,...OBJ.pickups].filter(s => reachable(e,s));
  }
  function stock(s) {
    if (!s.stock) s.stock = {[s.kind]:1};
    return s.stock;
  }
  function transfer(e,s,key,deposit=false,selected=null) {
    if (!e.bag || e.dead || e.dwn || !names[key] || !reachable(e,s)) return false;
    if (!containers.has(s) && !OBJ.pickups.includes(s)) return false;
    if (deposit && !shelves[s.type]?.includes(key)) return false;
    const world = stock(s), from = deposit ? e.bag : world, to = deposit ? world : e.bag;
    if (!(from[key]>0)) return false;
    if (deposit && count(e.bag)-1 > capacity({...e.bag,[key]:from[key]-1})) return false;
    if (!deposit && count(e.bag)+1 > capacity({...e.bag,[key]:(e.bag[key]||0)+1})) return false;
    if (limits[key]) {
      const source = pieces(from), dest = pieces(to);
      const item = selected || source.find(x=>x.key===key && (!deposit || e.worn[slotOf(x)]!==x))
                            || source.find(x=>x.key===key);
      if (!item || item.key!==key || !source.includes(item)) return false;
      source.splice(source.indexOf(item),1);
      dest.push(item);
      const slot = slotOf(item);
      if (deposit && e.worn[slot]===item) delete e.worn[slot];
      if (!deposit && (!e.worn[slot] || (e.bot && item.points>e.worn[slot].points))) e.worn[slot]=item;
      e.sh = protection(e);
    }
    from[key]--; to[key]=(to[key]||0)+1;
    if (s.kind && !count(world)) OBJ.removePickup(s);
    if (key==='revive' || /^(pack|helmet|vest)/.test(key)) MX.refreshGear(e);
    return true;
  }
  function use(e,key) {
    if (!e.bag?.[key] || e.dead || e.dwn) return false;
    if (key==='medkit' && e.hp+(e.hot||0)<100) { e.hot=(e.hot||0)+35; }                // curación progresiva (~14 puntos por segundo)
    else if (key==='ammo' && e.isPlayer && W.ammo<cur.max) { W.ammo=cur.ammo=cur.max; }
    else if (key==='ammo' && e.bot && e.ammo<e.w.max) e.ammo=e.w.max;
    else return false;
    e.bag[key]--; return true;
  }
  const openButton=document.createElement('button'), panel=document.createElement('dialog');
  openButton.textContent='Mochila'; openButton.hidden=true;
  openButton.id='invBtn'; openButton.style.cssText='position:fixed;right:max(14px,env(safe-area-inset-right));top:calc(56px + env(safe-area-inset-top));z-index:12;padding:4px 9px;font:600 11px system-ui,-apple-system,sans-serif;color:#e8eef8;background:#151b28cc;border:1px solid #2b3650;border-radius:8px;opacity:.75';   /* con mando no se muestra (se abre manteniendo el touchpad) */
  panel.className='inv'; panel.style.cssText='';
  document.body.append(openButton,panel);
  { const st=document.createElement('style'); st.textContent=`
dialog.dock::backdrop{background:transparent}
dialog.inv::backdrop{background:transparent}
dialog.inv{width:min(330px,94vw);max-height:calc(100vh - 20px);max-height:calc(100dvh - 20px);overflow:auto;padding:0;margin:auto max(10px,env(safe-area-inset-right)) auto auto;color:#e9eef7;font:500 12px/1.3 system-ui,-apple-system,'Segoe UI',sans-serif;background:linear-gradient(180deg,#1a2230f2 0%,#121823f2 100%);border:1px solid #33425c;border-radius:12px;box-shadow:0 12px 36px rgba(0,0,0,.55),inset 0 1px 0 rgba(255,255,255,.06);scrollbar-width:thin;scrollbar-color:#3a4a66 transparent}
dialog.inv[open]{animation:invIn .14s ease-out}
@keyframes invIn{from{opacity:0;transform:translateX(10px)}to{opacity:1;transform:none}}
.inv .hd{position:sticky;top:0;z-index:2;display:flex;align-items:center;gap:8px;padding:8px 12px;background:#1b2433f5;border-bottom:1px solid #2a3750}
.inv .hd h2{margin:0;font:800 12px system-ui;letter-spacing:.14em;text-transform:uppercase;color:#fff;flex:1}
.inv .cap{font:700 10.5px ui-monospace,Menlo,monospace;color:#9fb0cc}.inv .cap.full{color:#ffb020}
.inv .sec{padding:7px 12px 2px}.inv .sec>h3{margin:0 0 5px;font:700 9.5px system-ui;letter-spacing:.16em;text-transform:uppercase;color:#7e8fb0}
.inv .vit{display:grid;gap:4px}.inv .bar{position:relative;height:16px;border-radius:5px;background:#0d121b;border:1px solid #2a3750;overflow:hidden}
.inv .bar b{position:absolute;inset:0 auto 0 0;transition:width .25s}.inv .bar.hp b{background:linear-gradient(90deg,#3fcf7a,#7be39d)}.inv .bar.hp.low b{background:linear-gradient(90deg,#e0443a,#ff7a66)}.inv .bar.sh b{background:linear-gradient(90deg,#3a8dff,#7cc4ff)}
.inv .bar u{position:absolute;top:0;bottom:0;width:0;border-left:2px dashed #ffffff90;opacity:.7}.inv .bar span{position:absolute;inset:0;display:flex;align-items:center;justify-content:space-between;padding:0 7px;font:700 10px ui-monospace,Menlo,monospace;color:#fff;text-shadow:0 1px 2px #000a}
.inv .slots{display:grid;grid-template-columns:repeat(3,1fr);gap:5px}
.inv .slot{display:flex;align-items:center;gap:6px;padding:5px 7px;border-radius:8px;background:#141b27;border:1px solid #2a3750}.inv .slot.on{border-color:#4aa0ff;background:#17253a}
.inv .slot svg{flex:none;width:20px;height:20px;stroke:#9fb0cc;fill:none;stroke-width:1.6;stroke-linecap:round;stroke-linejoin:round}.inv .slot.on svg{stroke:#7cc4ff}
.inv .slot div{min-width:0;line-height:1.15}.inv .slot em{display:block;font:700 8.5px system-ui;letter-spacing:.1em;text-transform:uppercase;color:#7e8fb0}.inv .slot strong{display:block;font:700 11px system-ui}
.inv .chips{display:flex;flex-wrap:wrap;gap:4px}.inv .chip{display:flex;align-items:center;gap:4px;padding:3px 8px 3px 6px;border-radius:999px;background:#141b27;border:1px solid #2a3750;font-weight:600;font-size:11px}.inv .chip svg{width:13px;height:13px;stroke:#9fb0cc;fill:none;stroke-width:1.7;stroke-linecap:round;stroke-linejoin:round}.inv .chip b{color:#7cc4ff;font-family:ui-monospace,Menlo,monospace}
.inv .row{display:flex;align-items:center;gap:7px;padding:4px 7px;margin:0 0 4px;border-radius:8px;background:#141b27;border:1px solid #232f45}.inv .row .tx{flex:1;min-width:0}.inv .row .tx b{display:block;font-weight:700;color:#f1f5fc;font-size:11.5px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.inv .row .tx small{display:block;color:#8394b3;font-size:10px}
.inv .row .pt{height:2px;border-radius:2px;background:#26324a;margin-top:3px;overflow:hidden}.inv .row .pt i{display:block;height:100%;background:linear-gradient(90deg,#4aa0ff,#7cc4ff)}
.inv button{font:700 11px system-ui;color:#e9eef7;background:#233048;border:1px solid #38496a;border-radius:7px;padding:4px 9px;cursor:pointer;transition:background .12s}.inv button:hover{background:#2c3c5a}.inv button:active{transform:scale(.97)}
.inv button:focus-visible,.inv button:focus{outline:2px solid #7cc4ff;outline-offset:1px;background:#2f4468}
.inv .row button{white-space:nowrap}.inv .ctl{display:flex;flex-wrap:wrap;gap:4px}.inv .ctl p,.inv .sec>p{margin:0;color:#aebbd4;font-size:11px;width:100%;padding:4px 8px;border-radius:7px;background:#141b27;border:1px solid #232f45}.inv .ctl strong{color:#fff}
.inv .ft{position:sticky;bottom:0;display:flex;align-items:center;gap:8px;padding:6px 12px;background:#121823f5;border-top:1px solid #2a3750}.inv .ft .hint{flex:1;color:#7e8fb0;font-size:10px}.inv .ft button{background:#2a1d22;border-color:#5a3340}.inv .ft button:focus{background:#4a2a35}
@media (max-width:560px){dialog.inv{width:min(300px,62vw)}}
`; document.head.appendChild(st); }
  let dock=false;                                                                 // abierto con Share: panel a la derecha y mapa a la izquierda
  function close() { if(panel.open) panel.close(); if(dock){ dock=false; if(MX.mapClose)MX.mapClose(); } }
  const ICON = {
    helmet:'<path d="M5 15a7 7 0 0 1 14 0v2H5z"/><path d="M5 15h14M12 8v4"/>', vest:'<path d="M7 4l-3 4v11h16V8l-3-4-3 2h-4z"/><path d="M9 12h6M9 16h6"/>', pack:'<rect x="6" y="6" width="12" height="14" rx="3"/><path d="M9 6V4h6v2M9 12h6"/>',
    medkit:'<rect x="4" y="7" width="16" height="12" rx="2"/><path d="M12 10v6M9 13h6M9 7V5h6v2"/>', revive:'<path d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.5A4 4 0 0 1 19 10c0 5.6-7 10-7 10z"/><path d="M9 11h6M12 8v6"/>',
    ammo:'<path d="M9 20V9l3-4 3 4v11z"/><path d="M9 14h6"/>', material:'<path d="M4 9l8-4 8 4v8l-8 4-8-4z"/><path d="M4 9l8 4 8-4M12 13v8"/>', repair:'<path d="M14 6a4 4 0 0 0 4 4l-9 9a2.1 2.1 0 0 1-3-3l9-9a4 4 0 0 0-1-1z"/>' };
  const ico=(k,cls)=>'<svg viewBox="0 0 24 24"'+(cls?' class="'+cls+'"':'')+'>'+(ICON[k]||ICON.material)+'</svg>';
  const baseKey=k=>k.replace(/\d$/,'');
  function render() {
    const e=MX.pl; panel.replaceChildren(); let box=panel;
    const mk=(tag,cls,html)=>{const n=document.createElement(tag); if(cls)n.className=cls; if(html!==undefined)n.innerHTML=html; return n;};
    const section=title=>{const sec=mk('div','sec'); if(title)sec.append(mk('h3','',title)); panel.append(sec); box=sec; return sec;};
    function label(tag,value) { const node=document.createElement(tag);node.textContent=value;box.append(node); }
    function button(value,action,host) {
      const b=document.createElement('button'); b.textContent=value;
      b.onclick=()=>{const index=buttons().indexOf(b);action();if(panel.open){render();const all=buttons();all[Math.min(index,all.length-1)].focus();}};
      (host||box).append(b); return b;
    }
    function row(key,title,sub,pts,btnText,action){ const r=mk('div','row'); r.innerHTML=ico(baseKey(key)).replace('<svg','<svg style="width:26px;height:26px;stroke:#9fb0cc;fill:none;stroke-width:1.6;stroke-linecap:round;stroke-linejoin:round;flex:none"'); const tx=mk('div','tx','<b></b><small></small>'); tx.firstChild.textContent=title; tx.lastChild.textContent=sub||''; if(pts!=null){tx.append(mk('div','pt','<i style="width:'+Math.round(pts*100)+'%"></i>'));} r.append(tx); if(btnText)button(btnText,action,r); box.append(r); }
    const used=count(e.bag), capN=capacity(e.bag), prot=protection(e), protMax=Object.keys(slots).reduce((a,sl)=>a+(limits[sl+gear(e.bag,sl)]||0),0)||1;
    /* cabecera: título, clase (si hay) y capacidad */
    const hd=mk('div','hd'); hd.append(mk('h2','','Mochila')); const cl=MX.classOf&&MX.classOf(e); if(cl)hd.append(mk('span','cap',cl.name)); hd.append(mk('span','cap'+(used>=capN?' full':''),'🎒 '.slice(0,0)+used+' / '+capN)); panel.append(hd);
    /* (la capacidad va en la cabecera; sin barra aparte) */
    /* estado: vida (con la marca del tope de regeneración natural) y protección */
    section(''); const vit=mk('div','vit'); const hp=Math.max(0,Math.ceil(e.hp)), cap=MX.regenCap?MX.regenCap(e):60;
    vit.append(mk('div','bar hp'+(hp<35?' low':''),'<b style="width:'+Math.min(100,hp)+'%"></b><u style="left:'+cap+'%"></u><span><i style="font-style:normal">VIDA</i><i style="font-style:normal">'+hp+(e.hot>0?' <small>+'+Math.ceil(e.hot)+'</small>':'')+'</i></span>'));
    vit.append(mk('div','bar sh','<b style="width:'+Math.min(100,Math.round(100*prot/protMax))+'%"></b><span><i style="font-style:normal">PROTECCIÓN</i><i style="font-style:normal">'+Math.ceil(prot)+'</i></span>'));
    box.append(vit); vit.title='La vida se recupera sola hasta '+cap+' (marca ┆); por encima solo curan botiquines y médicos.';
    /* equipo puesto: casco, chaleco, mochila */
    section('Equipo'); const sl=mk('div','slots'); for(const k of Object.keys(slots)){ const lv=gear(e.bag,k), w=e.worn[k]; sl.append(mk('div','slot'+(w||lv&&k==='pack'?' on':''),ico(k)+'<div><em>'+slots[k]+'</em><strong>'+(lv?'Nivel '+lv:'—')+'</strong></div>')); } box.append(sl);
    /* en la mochila */
    const bagItems=Object.entries(e.bag).filter(([k,n])=>n>0 && !limits[k] && !/^pack/.test(k)); if(bagItems.length){ section('En la mochila'); const ch=mk('div','chips'); for(const [k,n] of bagItems) ch.append(mk('div','chip',ico(k)+'<span>'+names[k]+'</span><b>×'+n+'</b>')); box.append(ch); }
    /* obras (construcción), si las hay */
    { const host=section('Acciones'); const ctl=mk('div','ctl'); host.append(ctl); box=ctl; OBRAS.controls(e,label,button,close); if(!ctl.children.length) host.remove(); box=panel; }
    /* piezas de protección */
    const ps=pieces(e.bag); if(ps.length){ section('Protección'); for(const item of ps){
      const worn=e.worn[slotOf(item)]===item, can=item.points<limits[item.key];
      row(item.key,describe(item),(worn?'Equipado · ':'')+Math.ceil(item.points)+' / '+limits[item.key]+' pts',item.points/limits[item.key],worn?'':'Equipar',()=>equip(e,item));
      if(can){ if(e.bag.repair) button('Reparar con kit',()=>repair(e,item,'repair')); if(e.bag.material && nearRefuge(e)) button('Reparar con material',()=>repair(e,item,'material')); } } }
    if((e.hp+(e.hot||0)<100 && e.bag.medkit)||(W.ammo<cur.max && e.bag.ammo)){ section('Usar'); if(e.hp+(e.hot||0)<100 && e.bag.medkit) button('Usar botiquín (+35 vida)',()=>use(e,'medkit')); if(W.ammo<cur.max && e.bag.ammo) button('Usar munición',()=>use(e,'ammo')); }
    for(const s of sources(e)) {
      const inventory=stock(s), allowed=shelves[s.type];
      if (!allowed && !count(inventory)) continue;
      section(s.ownerId?'Equipo de '+s.ownerId:s.meta?.name||'En el suelo');
      for(const [k,n] of Object.entries(inventory)) if(n>0 && !limits[k]) {
        const full=count(e.bag)+1>capacity({...e.bag,[k]:(e.bag[k]||0)+1});
        row(k,names[k],'Disponibles: '+n,null,full?'Sin espacio':(allowed?'Retirar':'Recoger'),()=>transfer(e,s,k));
      }
      for (const item of pieces(inventory)) row(item.key,describe(item),Math.ceil(item.points)+' / '+limits[item.key]+' pts',item.points/limits[item.key],allowed?'Retirar':'Recoger',()=>transfer(e,s,item.key,false,item));
      for (const item of pieces(e.bag)) if (allowed?.includes(item.key))
        row(item.key,describe(item)+(e.worn[slotOf(item)]===item?' · equipado':''),'En tu mochila',null,'Depositar',()=>transfer(e,s,item.key,true,item));
      for(const k of allowed||[]) if(e.bag[k] && !limits[k]) row(k,names[k],'En tu mochila: '+e.bag[k],null,'Depositar',()=>transfer(e,s,k,true));
    }
    const ft=mk('div','ft'); ft.append(mk('span','hint','↑ ↓ elegir · ✕ usar · ○ cerrar')); box=ft; button('Cerrar',close); panel.append(ft);
  }
  function buttons(){return Array.from(panel.querySelectorAll('button'));}
  function open(){
    if(!MX.campaign || !MX.on || menuOpen || MX.pl.dead || MX.pl.dwn || panel.open)return;
    mouse.down=mouse.rdown=false;render();panel.showModal();buttons()[0].focus({preventScroll:true});panel.scrollTop=0;
  }
  openButton.onclick=open;
  for(const el of [panel,openButton]) for(const ev of ['pointerdown','mousedown','touchstart']) el.addEventListener(ev,event=>event.stopPropagation());
  window.addEventListener('keydown',ev=>{
    if(!panel.open && (ev.code!=='KeyI' || !MX.campaign || menuOpen))return;
    if(panel.open && ev.code==='Tab'){ev.stopImmediatePropagation();return;}
    ev.stopImmediatePropagation();
    if(ev.code==='KeyI' || ev.code==='Escape'){ev.preventDefault();if(!ev.repeat)panel.open?close():open();}
  },true);
  let previous=[], tpT=0, tpDone=false;
  function input(){
    if(!MX.campaign || !MX.on)return false;
    const pad=getPad(), down=pad?Array.from(pad.buttons,b=>b.pressed):[];
    const edge=i=>down[i]&&!previous[i], wasOpen=panel.open;
    /* Share: mapa táctico con el inventario al lado (cruceta para elegir, ✕ para usar, ○ o Share para cerrar). Es lo fiable en el iPhone: Safari no da el touchpad */
    if(edge(8)){ if(panel.open||MX.mapOpen){ close(); if(MX.mapClose)MX.mapClose(); } else { if(MX.mapToggle){ MX.mapDock(true); MX.mapToggle(); } dock=true; open(); if(!panel.open){ dock=false; } } }
    /* touchpad (donde el navegador lo da): toque = mapa táctico; mantener 0,5 s = mochila. Con la mochila abierta, un toque la cierra */
    if(down[17]){ tpT=(tpT||0)+1/60; if(!tpDone && tpT>=.5 && !panel.open){ tpDone=true; if(MX.mapClose)MX.mapClose(); open(); } }
    else if(previous[17]){ if(!tpDone){ if(panel.open) close(); else if(MX.mapToggle) MX.mapToggle(); } tpT=0; tpDone=false; }
    if(panel.open){
      const list=buttons(), current=list.indexOf(document.activeElement);
      if(edge(12)||edge(13))list[(current+(edge(12)?-1:1)+list.length)%list.length].focus();
      if(edge(0))document.activeElement.click();
      if(edge(1))close();
    }
    previous=down;
    return wasOpen||panel.open;
  }
  let botClock=0, botIndex=0;
  function tick(dt){
    OBRAS.tick(dt);
    botClock+=dt;if(botClock<.12)return;botClock=0;
    const e=MX.ents[1+(botIndex++%(MX.ents.length-1))];
    if(e.dead||e.dwn||e.vis)return;
    if(OBRAS.botRepair(e))return;
    if(e.hp<65 && use(e,'medkit'))return;
    for (const item of Object.values(e.worn)) {
      if (item.points<limits[item.key]/2 && (repair(e,item,'material') || repair(e,item,'repair'))) return;
    }
    for(const s of sources(e)){
      const keys=shelves[s.type];
      if(keys){
        for(const k of keys){
          if(e.bag[k]>1 && transfer(e,s,k,true))return;
          if(!e.bag[k] && transfer(e,s,k))return;
        }
      } else for(const k of Object.keys(stock(s))) if(transfer(e,s,k))return;
    }
  }
  return {absorb,protection,spawn,setKit,appearance,start,death,transfer,use,capacity,count,input,tick,open};
})();
