/* Una obra pertenece al tramo físico. La pieza puede desaparecer durante una
   brecha; su ubicación, nivel y progreso siguen perteneciendo al refugio. */
const OBRAS = (() => {
  const rules = {
    wall: {name:'Muro', repair:1, upgrades:[3,6], seconds:[4,10]},
    wallLow: {name:'Parapeto', repair:1, upgrades:[2,4], seconds:[3,8]},
    gate: {name:'Portón', repair:2, upgrades:[4,8], seconds:[5,12]},
    gateInner: {name:'Puerta interior', repair:2, upgrades:[], seconds:[5,12]}
  };
  const sites = [];
  const status = document.createElement('div');
  status.style.cssText='position:fixed;bottom:20%;left:50%;transform:translateX(-50%);color:white;background:#17222ded;border-radius:5px;padding:5px 9px;pointer-events:none;z-index:11;text-align:center';
  status.hidden = true;
  document.body.append(status);
  let messageUntil = 0;
  function message(e,text) {
    if (!e.isPlayer) return;
    status.textContent = text;
    status.hidden = false;
    messageUntil = MX.M.t+2;
  }
  function add(kind,x,z,level=1,rot=Math.PI/2,fac=0,inward=[-1,0]) {
    const type = kind==='gateInner' ? kind : kind+level;
    const prop = OBJ.place(type,x,z,rot,fac);
    const site = {kind,level,prop,progress:0,operation:null,worker:null,inward};
    sites.push(site);
    return site;
  }
  function start() {
    const gate=add('gate',-37.6,-5.5);
    OBJ.setOpen(gate.prop,true,true);
    add('wall',-37.6,-1.5);
    rangeLabel('PORTÓN',-37.6,-5.5,2.6);
    rangeLabel('MURO',-37.6,-1.5,2.6);
  }
  function nearby(e,site) {
    const p=site.prop;
    return e.team===p.faction && !e.dead && !e.dwn &&
      Math.hypot(Math.max(0,Math.abs(e.p.x-p.x)-p.hx),Math.max(0,Math.abs(e.p.z-p.z)-p.hz))<=2.1 &&
      MX.reachSupply(e,p);
  }
  function quote(site) {
    const p=site.prop, r=rules[site.kind];
    if (p.dead || p.hp<p.maxHp) {
      const missing=p.dead?1:1-p.hp/p.maxHp;
      return {name:'Reparar',cost:Math.max(1,Math.ceil(r.repair*missing)),seconds:r.seconds[0]};
    }
    const cost=r.upgrades[site.level-1];
    return cost ? {name:'Mejorar',cost,seconds:r.seconds[1]} : null;
  }
  function alarm(site) {
    return OBJ.alarms.some(p=>Math.hypot(p.x-site.prop.x,p.z-site.prop.z)<25);
  }
  function begin(e,site,shown) {
    const q=quote(site);
    if (!q || !nearby(e,site) || site.worker || e.buildSite) return false;
    if (alarm(site) || q.name!==shown.name || q.cost!==shown.cost || !(e.bag.material>=q.cost)) return false;
    if (site.operation!==q.name) site.progress=0;
    site.operation=q.name;
    site.worker=e;
    e.buildSite=site;
    site.cost=q.cost;
    site.lastHurt=e.lastHurt;
    return true;
  }
  function pause(site) {
    message(site.worker,rules[site.kind].name+' · obra interrumpida');
    site.worker.buildSite=null;
    site.worker=null;
  }
  function occupied(x,z,hx,hz) {
    const inside=e=>!e.dead && Math.abs(e.p.x-x)<hx+.52 && Math.abs(e.p.z-z)<hz+.52;
    return MX.ents.some(inside) || MX.zom?.list.some(inside) || boxes.some(b=>b.prop?.pushable &&
      Math.abs(b.x-x)<hx+b.hx && Math.abs(b.z-z)<hz+b.hz);
  }
  function finish(site,q) {
    const old=site.prop, upgrade=q.name==='Mejorar';
    const nextLevel=site.level+(upgrade?1:0);
    const inner=upgrade && site.kind==='gate' && nextLevel===3;
    if (occupied(old.x,old.z,Math.max(.35,old.hx),old.hz) ||
        (inner && occupied(old.x+site.inward[0]*1.6,old.z+site.inward[1]*1.6,.35,1.6))) {
      if (site.worker.bot) { pause(site); return; }
      message(site.worker,'Despeja el paso para terminar la obra');
      return;
    }
    const type=site.kind==='gateInner'?site.kind:site.kind+nextLevel;
    const opened=old.open && !old.dead;
    if (!old.dead) OBJ.removeObject(old);
    site.prop=OBJ.place(type,old.x,old.z,old.g.rotation.y,old.faction);
    if (opened) OBJ.setOpen(site.prop,true,true);
    if (inner) add('gateInner',old.x+site.inward[0]*1.6,old.z+site.inward[1]*1.6,3,old.g.rotation.y,old.faction,site.inward);   // la puerta interior, 1,6 m hacia dentro del refugio
    site.worker.bag.material-=q.cost;
    site.level=nextLevel;
    message(site.worker,rules[site.kind].name+' · nivel '+nextLevel+' · intacto');
    site.worker.buildSite=null;
    site.worker=null;
    site.operation=null;
    site.progress=0;
  }
  function tick(dt) {
    if (!sites.length) return;
    if (MX.M.t>messageUntil && !status.hidden) status.hidden=true;
    for (const site of sites) {
      const e=site.worker;
      if (!e) continue;
      const q=quote(site);
      if (!q || q.name!==site.operation || q.cost!==site.cost || !nearby(e,site) ||
          !(e.bag.material>=q.cost) || e.lastHurt!==site.lastHurt || (e.bot && (e.vis || e.rt)) || alarm(site)) {
        pause(site); continue;
      }
      site.progress=Math.min(q.seconds,site.progress+dt);
      if (site.progress>=q.seconds) finish(site,q);
      else message(e,site.operation+' · '+rules[site.kind].name+' · '+Math.floor(100*site.progress/q.seconds)+' %');
    }
  }
  function controls(e,label,button,close) {
    for (const site of sites) {
      if (!nearby(e,site)) continue;
      const p=site.prop, q=quote(site);
      label('p',rules[site.kind].name+' · nivel '+site.level+' · '+(p.dead?'brecha':Math.ceil(p.hp)+' / '+p.maxHp));
      if (p.o?.leaves && !p.dead) button(p.open?'Cerrar puerta':'Abrir puerta',()=>OBJ.toggle(p));
      if (site.worker===e) { button('Pausar obra',()=>pause(site)); continue; }
      if (!q) continue;
      const progress=site.operation===q.name?site.progress:0;
      const text=(progress?'Retomar · ':'')+q.name+' · '+q.cost+' material'+(q.cost===1?'':'es')+' · '+Math.ceil(q.seconds-progress)+' s';
      if (site.worker) label('p','Obra en curso');
      else if (alarm(site)) label('p','Obra pausada por alarma');
      else if (!(e.bag.material>=q.cost)) label('p',text+' · faltan materiales');
      else button(text,()=>{if (begin(e,site,q)) close();});
    }
  }
  function botRepair(e) {
    if (!e.bag.material || e.vis) return false;
    for (const site of sites) {
      const q=quote(site);
      if (q?.name==='Reparar' && begin(e,site,q)) return true;
    }
    return false;
  }
  /* refugios del distrito: los tramos de muro (bajo y alto), el portón y la puerta interior que ya pone el mapa pasan a ser obras de su facción */
  function adopt(rects) {
    const kindOf = {wallLow1:['wallLow',1],wallLow2:['wallLow',2],wallLow3:['wallLow',3],wall1:['wall',1],wall2:['wall',2],wall3:['wall',3],gate1:['gate',1],gate2:['gate',2],gate3:['gate',3],gateInner:['gateInner',1]};
    for (const p of props) {
      const k = kindOf[p.type]; if (!k || p.dead || sites.some(s=>s.prop===p)) continue;
      const r = rects.find(q=>Math.abs(p.x-q.x)<=q.hx && Math.abs(p.z-q.z)<=q.hz); if (!r) continue;
      if (p.faction===null || p.faction===undefined) p.faction=r.fac;
      const dx=r.x-p.x, dz=r.z-p.z, inward = Math.abs(dx)>Math.abs(dz) ? [Math.sign(dx),0] : [0,Math.sign(dz)];
      sites.push({kind:k[0],level:k[1],prop:p,progress:0,operation:null,worker:null,inward});
    }
    return sites.length;
  }
  return {start,tick,controls,botRepair,adopt,sites};
})();
