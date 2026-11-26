/* Una obra pertenece al tramo físico. La pieza puede desaparecer durante una
   brecha; su ubicación, nivel y progreso siguen perteneciendo al refugio. */
const OBRAS = (() => {
  const rules = {
    wall: {name:'Muro', repair:1, upgrades:[3,6], seconds:[4,10]},
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
  function add(kind,x,z,level=1) {
    const type = kind==='gateInner' ? kind : kind+level;
    const prop = OBJ.place(type,x,z,Math.PI/2,0);
    const site = {kind,level,prop,progress:0,operation:null,worker:null};
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
        (inner && occupied(old.x-1.6,old.z,.35,1.6))) {
      if (site.worker.bot) { pause(site); return; }
      message(site.worker,'Despeja el paso para terminar la obra');
      return;
    }
    const type=site.kind==='gateInner'?site.kind:site.kind+nextLevel;
    const opened=old.open && !old.dead;
    if (!old.dead) OBJ.removeObject(old);
    site.prop=OBJ.place(type,old.x,old.z,old.g.rotation.y,old.faction);
    if (opened) OBJ.setOpen(site.prop,true,true);
    if (inner) add('gateInner',old.x-1.6,old.z,3);
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
    if (MX.M.t>messageUntil) status.hidden=true;
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
  return {start,tick,controls,botRepair};
})();
