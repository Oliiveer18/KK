/* Inventario de la campaña. Los estantes y los cuerpos conservan una sola reserva
   compartida. La distancia y las existencias se comprueban en cada transferencia. */
const INVENTARIO = (() => {
  const names = {material:'Material', ammo:'Munición', medkit:'Botiquín', revive:'Kit de reanimación'};
  const slots = {helmet:'Casco', vest:'Chaleco', pack:'Mochila'};
  for (const [key, name] of Object.entries(slots))
    for (let level = 1; level <= 3; level++) names[key + level] = name + ' ' + level;
  const shelves = {storeMat:['material'], storeAmmo:['ammo'], storeMed:['medkit','revive']};
  shelves.storeMat.push(...Object.keys(names).filter(k=>/^(helmet|vest|pack)/.test(k)));
  const catalog = {material:'material', 'munición':'ammo', 'botiquín':'medkit', 'kit de reanimación':'revive'};
  const containers = new Set();
  function gear(bag, slot) {
    for (let level = 3; level > 0; level--) if (bag[slot + level]) return level;
    return 0;
  }
  function capacity(bag) { return 6 + 4 * gear(bag, 'pack'); }
  function count(bag) { return Object.values(bag).reduce((sum, n) => sum + n, 0); }
  function spawn(e) {
    if (e.bag) return;
    e.bag = {helmet2:1, vest2:1, pack1:1, revive:1};
    Object.defineProperty(e, 'kits', {
      get() { return this.bag.revive || 0; },
      set(n) { this.bag.revive = n; }
    });
  }
  function appearance(e) {
    return {helmet:gear(e.bag,'helmet'), vest:gear(e.bag,'vest'), pack:gear(e.bag,'pack')};
  }
  function register(p) {
    const loot = OBJ.contents(p);
    if (!shelves[p.type] && !loot.length) return;
    p.stock = {};
    for (const {k,n} of loot) if (catalog[k])
      p.stock[catalog[k]] = n[0] + Math.floor(Math.random() * (1 + n[1] - n[0]));
    if (p.type === 'pharmaCab') p.stock.revive = 1;
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
  function transfer(e,s,key,deposit=false) {
    if (!e.bag || e.dead || e.dwn || !names[key] || !reachable(e,s)) return false;
    if (!containers.has(s) && !OBJ.pickups.includes(s)) return false;
    if (deposit && !shelves[s.type]?.includes(key)) return false;
    const world = stock(s), from = deposit ? e.bag : world, to = deposit ? world : e.bag;
    if (!(from[key]>0)) return false;
    if (deposit && count(e.bag)-1 > capacity({...e.bag,[key]:from[key]-1})) return false;
    if (!deposit && count(e.bag)+1 > capacity({...e.bag,[key]:(e.bag[key]||0)+1})) return false;
    from[key]--; to[key]=(to[key]||0)+1;
    if (s.kind && !count(world)) OBJ.removePickup(s);
    if (key==='revive' || /^(pack|helmet|vest)/.test(key)) MX.refreshGear(e);
    return true;
  }
  function use(e,key) {
    if (!e.bag?.[key] || e.dead || e.dwn) return false;
    if (key==='medkit' && e.hp<100) { e.hp=Math.min(100,e.hp+35); e.tgp.hp=e.hp; }
    else if (key==='ammo' && e.isPlayer && W.ammo<cur.max) { W.ammo=cur.ammo=cur.max; }
    else if (key==='ammo' && e.bot && e.ammo<e.w.max) e.ammo=e.w.max;
    else return false;
    e.bag[key]--; return true;
  }
  const openButton=document.createElement('button'), panel=document.createElement('dialog');
  openButton.textContent='Mochila'; openButton.hidden=true;
  openButton.style.cssText='position:fixed;right:12px;top:46%;z-index:12;padding:6px 10px';
  panel.style.cssText='max-width:min(90vw,390px);max-height:78vh;overflow:auto;background:#18212a;color:white;border:1px solid #73808e;border-radius:8px;padding:16px';
  document.body.append(openButton,panel);
  function close() { if(panel.open) panel.close(); }
  function render() {
    const e=MX.pl; panel.replaceChildren();
    function label(tag,value) { const node=document.createElement(tag);node.textContent=value;panel.append(node); }
    function button(value,action) {
      const b=document.createElement('button'); b.textContent=value;b.style.margin='3px';
      b.onclick=()=>{const index=buttons().indexOf(b);action();if(panel.open){render();const all=buttons();all[Math.min(index,all.length-1)].focus();}};
      panel.append(b);
    }
    label('strong','Mochila · '+count(e.bag)+' / '+capacity(e.bag));
    label('p',Object.entries(e.bag).filter(([,n])=>n>0).map(([k,n])=>names[k]+' ×'+n).join(' · ')||'Vacía');
    if(e.hp<100 && e.bag.medkit) button('Usar botiquín',()=>use(e,'medkit'));
    if(W.ammo<cur.max && e.bag.ammo) button('Usar munición',()=>use(e,'ammo'));
    for(const s of sources(e)) {
      const inventory=stock(s), allowed=shelves[s.type];
      if (!allowed && !count(inventory)) continue;
      label('p',s.ownerId?'Equipo de '+s.ownerId:s.meta?.name||'En el suelo');
      for(const [k,n] of Object.entries(inventory)) if(n>0) {
        const full=count(e.bag)+1>capacity({...e.bag,[k]:(e.bag[k]||0)+1});
        button((full?'Sin espacio · ':allowed?'Retirar ':'Recoger ')+names[k]+' ('+n+')',()=>transfer(e,s,k));
      }
      for(const k of allowed||[]) if(e.bag[k]) button('Depositar '+names[k],()=>transfer(e,s,k,true));
    }
    button('Cerrar',close);
  }
  function buttons(){return Array.from(panel.querySelectorAll('button'));}
  function open(){
    if(!MX.campaign || !MX.on || menuOpen || MX.pl.dead || MX.pl.dwn || panel.open)return;
    mouse.down=mouse.rdown=false;render();panel.showModal();buttons()[0].focus();
  }
  openButton.onclick=open;
  for(const el of [panel,openButton]) for(const ev of ['pointerdown','mousedown','touchstart']) el.addEventListener(ev,event=>event.stopPropagation());
  window.addEventListener('keydown',ev=>{
    if(!panel.open && (ev.code!=='KeyI' || !MX.campaign || menuOpen))return;
    if(panel.open && ev.code==='Tab'){ev.stopImmediatePropagation();return;}
    ev.stopImmediatePropagation();
    if(ev.code==='KeyI' || ev.code==='Escape'){ev.preventDefault();if(!ev.repeat)panel.open?close():open();}
  },true);
  let previous=[];
  function input(){
    if(!MX.campaign || !MX.on)return false;
    const pad=getPad(), down=pad?Array.from(pad.buttons,b=>b.pressed):[];
    const edge=i=>down[i]&&!previous[i], wasOpen=panel.open;
    if(edge(17)) panel.open?close():open();
    else if(panel.open){
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
    botClock+=dt;if(botClock<.12)return;botClock=0;
    const e=MX.ents[1+(botIndex++%(MX.ents.length-1))];
    if(e.dead||e.dwn||e.vis)return;
    if(e.hp<65 && use(e,'medkit'))return;
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
  return {spawn,appearance,start,death,transfer,use,capacity,count,input,tick,open};
})();
