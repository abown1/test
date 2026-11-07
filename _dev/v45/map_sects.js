// ================== v0.4.x map PHASE3：他宗 populate／外交／日常＋遠征 AI ==================
// 機制靈感取自「領地」類日常生產＋外出征戰；名稱全原創。旗關 → 全 no-op。
function mapMulberry(seed){
  let a=(seed>>>0)||1;
  return function(){a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return ((t^t>>>14)>>>0)/4294967296;};
}
function mapClamp(v,lo,hi){return v<lo?lo:v>hi?hi:v;}
function mapSectById(id){if(!S||!S.sects)return null;for(let i=0;i<S.sects.length;i++)if(S.sects[i].id===id)return S.sects[i];return null;}
function mapSectNpcCount(){
  if(!S||!S.sects)return 0;let n=0;for(const s of S.sects)n+=(s.npcs&&s.npcs.length)||0;return n;
}
function mapSectCap(){return (MAP_TUNE&&MAP_TUNE.spawn&&MAP_TUNE.spawn.sectNpcs)||80;}
function mapSectExpCap(){return (MAP_TUNE&&MAP_TUNE.spawn&&MAP_TUNE.spawn.sectExpeditions)||1;}
function mapSectHasOuting(sect){
  if(!sect||!sect.orders)return false;
  const OUT={claim_mount:1,escort:1,raid:1,contest:1};
  for(const o of sect.orders)if(o&&OUT[o.k]&&(o.until==null||o.until>S.time))return true;
  return false;
}
function mapNpcStats(realm,rng){
  const slack=MAP_TUNE.npcBaseStatSlack||0.1;
  const m=1+(rng()*2-1)*slack;
  // 緊急搶修：鄰境屬性差 ≤10%（逐步 ×1.1 再取整，保證不超）
  let hp=50,atk=10;const n=Math.max(0,realm|0);
  for(let i=0;i<n;i++){hp=Math.max(1,Math.floor(hp*1.1+1e-9));atk=Math.floor(atk*1.1*10+1e-9)/10;}
  hp=Math.max(1,Math.round(hp*m));atk=+(atk*m).toFixed(1);
  return {realm:realm|0,hp,maxhp:hp,atk,eq:null,zbId:null};
}
function mapMakeSectNpcs(def,rng,budget){
  const T=MAP_SECT_TUNE;const nWant=T.npcsPerSect[0]+Math.floor(rng()*(T.npcsPerSect[1]-T.npcsPerSect[0]+1));
  const n=Math.max(0,Math.min(nWant,budget));
  const out=[];
  for(let i=0;i<n;i++){
    const elder=i===0||(i<3&&rng()<0.35);
    const rr=elder?T.realmElder:T.realmDisc;
    const realm=rr[0]+Math.floor(rng()*(rr[1]-rr[0]+1));
    const st=mapNpcStats(realm,rng);
    const hx=def.hall&&def.hall.x||0,hy=def.hall&&def.hall.y||0;
    const ox=(rng()-0.5)*6,oy=(rng()-0.5)*6;
    out.push(Object.assign({
      id:def.id+'_n'+i,
      role:elder?(i===0?'patriarch':'elder'):(i%3===0?'guard':(i%3===1?'farmer':'disciple')),
      sectId:def.id,
      x:hx+ox,y:hy+oy,home:{x:hx+ox,y:hy+oy}
    },st));
  }
  return out;
}
function mapSectPowerOf(sect){
  if(!sect)return 0;
  let p=sect.power0||0;
  for(const u of sect.npcs||[]){
    let add=8+(u.realm||0)*6+(u.atk||0)*0.5;
    if(u.zbId)add*=1+mapZbPowerMul((u.realm||0)%10/10);
    if(u.eq)add*=1.05;
    p+=add;
  }
  const v=Math.round(p*10)/10;
  return Number.isFinite(v)?v:0;
}
function mapDiploGet(a,b){
  if(!S||!S.diplo||a===b)return null;
  return S.diplo[mapDiploKey(a,b)]||null;
}
function mapDiploSet(a,b,rel,state,cd){
  if(!S||!S.diplo||a===b)return null;
  const k=mapDiploKey(a,b);
  const prev=S.diplo[k];
  const next={
    rel:mapClamp(rel!=null?rel:(prev?prev.rel:0),-100,100),
    state:state||(prev&&prev.state)||'neutral',
    cd:cd!=null?cd:(prev&&prev.cd)||0
  };
  if(!Number.isFinite(next.rel))next.rel=0;
  const changed=!prev||prev.state!==next.state||prev.rel!==next.rel;
  S.diplo[k]=next;
  if(changed&&prev&&prev.state!==next.state){
    try{mapEmit('map:diplo:change',{a,b,from:prev.state,to:next.state,rel:next.rel});}catch(e){}
  }
  return next;
}
function mapDiploAdjust(a,b,dRel,forceState){
  const cur=mapDiploGet(a,b)||{rel:0,state:'neutral',cd:0};
  let st=forceState||cur.state;
  const rel=mapClamp(cur.rel+dRel,-100,100);
  if(!forceState){
    if(rel<=-60)st='war';else if(rel<=-25)st='rival';else if(rel>=50)st='ally';else if(rel>=15)st='peace';else st='neutral';
  }
  const cd=(forceState&&st!==cur.state)?(MAP_SECT_TUNE.diploCd||90):(cur.cd||0);
  return mapDiploSet(a,b,rel,st,cd);
}
function mapBuildDiplo(rng){
  const D={};const list=MAP_SECTS;
  for(let i=0;i<list.length;i++)for(let j=i+1;j<list.length;j++){
    const A=list[i],B=list[j];const k=mapDiploKey(A.id,B.id);
    let init=null;for(const row of MAP_DIPLO_INIT){if(mapDiploKey(row.a,row.b)===k){init=row;break;}}
    const base=init?{rel:init.rel,state:init.state}:mapDiploDefault(A.align,B.align);
    const jitter=(rng()*6-3);
    D[k]={rel:mapClamp(base.rel+jitter,-100,100),state:base.state,cd:0};
  }
  return D;
}
function mapSectsClone(rng){
  let budget=mapSectCap();
  const out=[];
  // 先均分預算，餘數給前列
  const per=Math.floor(budget/MAP_SECTS.length);
  let rem=budget-per*MAP_SECTS.length;
  for(let i=0;i<MAP_SECTS.length;i++){
    const def=MAP_SECTS[i];
    const allow=per+(rem>0?1:0);if(rem>0)rem--;
    const npcs=mapMakeSectNpcs(def,rng,allow);
    budget-=npcs.length;
    const sect={
      id:def.id,name:def.n,align:def.align,
      hall:{x:def.hall.x,y:def.hall.y},
      territory:def.territory.map(t=>({cx:t.cx,cy:t.cy,r:t.r})),
      power0:def.power0,temper:def.temper,
      power:0,stance:'idle',
      npcs,orders:[],stock:{food:0,iron:0,herb:0,lingshi:0},need:{food:0.5,qi:0.4,sec:0.5,fame:0.3},
      nextDaily:0,acc:0
    };
    sect.power=mapSectPowerOf(sect);
    out.push(sect);
  }
  return out;
}
function mapSectsPopulate(){
  if(!mapFlag('sects'))return false;
  if(typeof S==='undefined'||!S||!S.map||!S.map.unlocked)return false;
  if(Array.isArray(S.sects)&&S.sects.length>=MAP_SECTS.length){
    const have={};for(const s of S.sects)have[s.id]=1;
    let ok=true;for(const d of MAP_SECTS)if(!have[d.id]){ok=false;break;}
    if(ok){
      if(!S.diplo||typeof S.diplo!=='object')S.diplo=mapBuildDiplo(mapMulberry((S.map.seedExtra||1)^0x53454354));
      if(S.map.spawn)S.map.spawn.sectNpcs=mapSectNpcCount();
      return true;
    }
  }
  const rng=mapMulberry((S.map.seedExtra||S.seed||1)^0x53454354);
  S.sects=mapSectsClone(rng);
  S.diplo=mapBuildDiplo(mapMulberry((S.map.seedExtra||1)^0x4449504c));
  if(S.map.spawn)S.map.spawn.sectNpcs=mapSectNpcCount();
  return true;
}
function mapSectPickMount(sect,rng){
  if(!S.map||!S.map.mounts||!S.map.mounts.length)return null;
  const cands=[];
  for(const m of S.map.mounts){
    if(m.ownerSect===sect.id)continue;
    let w=1.2;
    if(!m.ownerSect)w+=1.5;
    else{
      const d=mapDiploGet(sect.id,m.ownerSect);
      if(d&&(d.state==='ally'||d.state==='peace'))w*=0.15;
      if(d&&(d.state==='rival'||d.state==='war'))w*=1.8;
    }
    // 距離：近者優先
    const dist=Math.hypot(m.cx-sect.hall.x,m.cy-sect.hall.y);
    w*=1/(1+dist/80);
    w*=0.6+sect.need.qi;
    cands.push({m,w});
  }
  if(!cands.length)return null;
  let sum=0;for(const c of cands)sum+=c.w;let r=rng()*sum;
  for(const c of cands){r-=c.w;if(r<=0)return c.m;}
  return cands[cands.length-1].m;
}
function mapSectPickRaidTarget(sect,rng){
  const cands=[];
  for(const o of S.sects){
    if(o.id===sect.id)continue;
    const d=mapDiploGet(sect.id,o.id);if(!d)continue;
    if(d.state!=='rival'&&d.state!=='war'&&d.rel>-20)continue;
    let w=(d.state==='war'?2.2:1.2)*sect.temper*(0.5+sect.need.fame);
    if(sect.power>o.power)w*=1.3;else w*=0.7;
    cands.push({o,w});
  }
  if(!cands.length)return null;
  let sum=0;for(const c of cands)sum+=c.w;if(!(sum>0))return null;
  let r=rng()*sum;for(const c of cands){r-=c.w;if(r<=0)return c.o;}
  return cands[cands.length-1].o;
}
function mapSectEnsureDaily(sect,rng){
  const T=MAP_SECT_TUNE;const home=['farm','mine','refine','patrol','guard'];
  const keep=sect.orders.filter(o=>o&&(o.k==='claim_mount'||o.k==='escort'||o.k==='raid'||o.k==='contest')&&(o.until==null||o.until>S.time));
  const daily=[];
  for(const k of home){
    const w=(T.weights[k]||0.8)*(k==='farm'||k==='mine'||k==='refine'?sect.need.food:k==='guard'?sect.need.sec:sect.need.sec*0.8+0.2);
    daily.push({k,w,t:S.time,until:S.time+T.dailyRefresh,home:true});
  }
  daily.sort((a,b)=>b.w-a.w);
  sect.orders=keep.concat(daily.slice(0,3).map(({k,t,until,home})=>({k,t,until,home:!!home})));
  sect.nextDaily=S.time+T.dailyRefresh*(0.85+rng()*0.3);
  sect.stance='idle';
}
function mapSectTryOuting(sect,rng){
  if(mapSectHasOuting(sect))return;
  if((sect.orders.filter(o=>!o.home).length)>=mapSectExpCap())return;
  const T=MAP_SECT_TUNE;const W=T.weights;
  const opts=[];
  // claim_mount
  if(S.map&&S.map.mounts&&S.map.mounts.length){
    opts.push({k:'claim_mount',w:W.claim_mount*sect.need.qi*(0.7+sect.temper*0.5)});
  }
  opts.push({k:'escort',w:W.escort*(1.1-sect.temper)* (0.5+sect.need.fame*0.5)});
  opts.push({k:'raid',w:W.raid*sect.temper*(0.4+sect.need.fame)});
  if(S.map&&S.map.gates&&S.map.gates.length)opts.push({k:'contest',w:W.contest*(0.5+sect.need.fame)});
  else opts.push({k:'contest',w:W.contest*0.25*sect.need.fame}); // 無門也低權重占位
  let sum=0;for(const o of opts)sum+=Math.max(0,o.w);if(!(sum>0))return;
  // 機率出門：temper 與 need
  if(rng()>0.35+sect.temper*0.25+sect.need.fame*0.1)return;
  let r=rng()*sum,pick=opts[0];for(const o of opts){r-=Math.max(0,o.w);if(r<=0){pick=o;break;}}
  const dur=T.outingDur[0]+Math.floor(rng()*(T.outingDur[1]-T.outingDur[0]+1));
  const order={k:pick.k,t:S.time,until:S.time+dur,home:false,target:null};
  if(pick.k==='claim_mount'){
    const m=mapSectPickMount(sect,rng);if(!m)return;order.target=m.id;
  }else if(pick.k==='raid'){
    const tg=mapSectPickRaidTarget(sect,rng);if(!tg)return;order.target=tg.id;
  }else if(pick.k==='contest'){
    const g=(S.map.gates&&S.map.gates[Math.floor(rng()*S.map.gates.length)]);
    order.target=g?g.id:'gate_stub';
  }else if(pick.k==='escort'){
    const cities=S.map.cities||[];order.target=cities.length?cities[Math.floor(rng()*cities.length)].id:null;
  }
  sect.orders.push(order);sect.stance=pick.k;
}
function mapSectResolveOuting(sect,order,rng){
  const T=MAP_SECT_TUNE;
  if(order.k==='claim_mount'&&order.target&&S.map&&S.map.mounts){
    const m=S.map.mounts.find(x=>x.id===order.target);if(m){
      const prev=m.ownerSect;let ok=true;
      if(prev&&prev!==sect.id){
        const own=mapSectById(prev);const pd=mapSectPowerOf(sect),po=mapSectPowerOf(own);
        ok=rng()<mapClamp(0.35+(pd-po)/200,0.1,0.85);
        if(ok)mapDiploAdjust(sect.id,prev,T.claimRel);
      }
      if(ok){
        m.ownerSect=sect.id;sect.need.qi=mapClamp(sect.need.qi-0.25,0.05,1);
        try{mapEmit('map:mount:claim',{mountId:m.id,sectId:sect.id,prev:prev||null});}catch(e){}
      }
    }
  }else if(order.k==='raid'&&order.target){
    const tg=mapSectById(order.target);
    if(tg){
      const pd=mapSectPowerOf(sect),po=mapSectPowerOf(tg);
      const win=rng()<mapClamp(0.4+(pd-po)/180,0.15,0.9);
      mapDiploAdjust(sect.id,tg.id,win?T.raidRel:T.raidRel*0.5);
      if(win){
        const a=mapSectEnsureStock(sect),b=mapSectEnsureStock(tg);
        const take=Math.min(b.food*0.1+2, b.food);b.food-=take;a.food+=take;
        const ls=Math.min((b.lingshi||0)*0.1+1,b.lingshi||0);b.lingshi-=ls;a.lingshi+=ls;
        // 戰敗方可走敗北規則（示意單位）
        if(typeof mapDefeatResolve==='function'){
          const dr=mapDefeatResolve({realm:6,sectId:sect.id,_mapSoulDestroy:false},{realm:7,maxhp:100,hp:100,id:tg.id+'_npc',sectId:tg.id},{kind:'raid',lethal:true,src:'sect_raid'});
          if(dr&&dr.soulId){order.soulId=dr.soulId;try{mapEmit('map:soul:escape',{soulId:dr.soulId,from:sect.id,to:tg.id,src:'sect_raid'});}catch(e){}}
        }
      }
      if(win){sect.need.fame=mapClamp(sect.need.fame-0.2,0.05,1);tg.need.sec=mapClamp(tg.need.sec+0.15,0.05,1);}
      else{sect.need.sec=mapClamp(sect.need.sec+0.1,0.05,1);}
      try{mapEmit('map:sect:raid',{from:sect.id,to:tg.id,target:tg.hall,win:!!win});}catch(e){}
    }
  }else if(order.k==='escort'){
    sect.need.fame=mapClamp(sect.need.fame-0.05,0.05,1);
    sect.need.food=mapClamp(sect.need.food-0.08,0.05,1);
    // 輕微改善與隨機他宗關係
    const others=S.sects.filter(s=>s.id!==sect.id);if(others.length){
      const o=others[Math.floor(rng()*others.length)];mapDiploAdjust(sect.id,o.id,T.escortRel);
    }
  }else if(order.k==='contest'){
    sect.need.fame=mapClamp(sect.need.fame-0.1,0.05,1);
    sect.need.qi=mapClamp(sect.need.qi+0.05,0.05,1);
  }
}
function mapSectTickNeeds(sect,dt){
  const k=dt/120; // 緩慢回升需求
  sect.need.food=mapClamp(sect.need.food+0.04*k,0.05,1);
  sect.need.qi=mapClamp(sect.need.qi+0.03*k,0.05,1);
  sect.need.sec=mapClamp(sect.need.sec+0.03*k,0.05,1);
  sect.need.fame=mapClamp(sect.need.fame+0.02*k,0.05,1);
  // 佔山降 qi 需求
  if(S.map&&S.map.mounts){
    let owned=0;for(const m of S.map.mounts)if(m.ownerSect===sect.id)owned++;
    if(owned)sect.need.qi=mapClamp(sect.need.qi-0.02*owned*k,0.05,1);
  }
  for(const o of sect.orders||[]){
    if(o.k==='farm'&&o.home)sect.need.food=mapClamp(sect.need.food-0.05*k,0.05,1);
    if(o.k==='guard'&&o.home)sect.need.sec=mapClamp(sect.need.sec-0.04*k,0.05,1);
    if(o.k==='patrol'&&o.home)sect.need.sec=mapClamp(sect.need.sec-0.02*k,0.05,1);
  }
}
function mapDiploTick(dt){
  if(!S.diplo)return;
  for(const k in S.diplo){
    const d=S.diplo[k];if(!d)continue;
    if(d.cd>0)d.cd=Math.max(0,d.cd-dt);
    // 自然回中
    const drift=MAP_SECT_TUNE.relDrift*dt/10;
    if(d.rel>0)d.rel=Math.max(0,d.rel-drift);
    else if(d.rel<0)d.rel=Math.min(0,d.rel+drift);
    if(!Number.isFinite(d.rel))d.rel=0;
    d.rel=mapClamp(d.rel,-100,100);
  }
}
function mapSectEnsureStock(sect){
  if(!sect.stock)sect.stock={food:0,iron:0,herb:0,lingshi:0};
  for(const k of ['food','iron','herb','lingshi'])if(sect.stock[k]==null)sect.stock[k]=0;
  return sect.stock;
}
function mapSectProduce(sect,dt){
  // 領地式日常：農／礦／煉 → 入宗門庫存（概念精簡）
  if(!sect||!(dt>0))return;
  const P=(MAP_TUNE&&MAP_TUNE.sectProd)||{};
  const st=mapSectEnsureStock(sect);
  let farm=0,mine=0,ref=0;
  for(const o of sect.orders||[]){
    if(!o||!o.home)continue;
    if(o.k==='farm')farm++;else if(o.k==='mine')mine++;else if(o.k==='refine')ref++;
  }
  // 無訂單時農民角色仍有微產
  const farmers=(sect.npcs||[]).filter(n=>n&&n.role==='farmer').length;
  farm=Math.max(farm,farmers?1:0);
  st.food+=(P.farmFood||0.08)*farm*dt;
  st.iron+=(P.mineIron||0.04)*mine*dt;
  st.lingshi+=(P.mineLs||0.02)*mine*dt+(P.refineLs||0.01)*ref*dt;
  st.herb+=(P.refineHerb||0.05)*ref*dt;
  sect.need.food=mapClamp(sect.need.food-0.01*farm*dt/30,0.05,1);
}
function mapSectsTick(dt){
  if(!mapFlag('sects')){
    // 旗關仍做輕量衛生（元神等缺 home 會炸 updateEnemy）
    if(typeof S!=='undefined'&&S&&S.map&&S.map.unlocked){try{if(typeof mapSanitizeSharedEntities==='function')mapSanitizeSharedEntities();}catch(e){}}
    return;
  }
  if(typeof S==='undefined'||!S||!S.map||!S.map.unlocked)return;
  if(!Array.isArray(S.sects)||!S.sects.length)return;
  if(!(dt>0)||!Number.isFinite(dt))return;
  try{if(typeof mapSanitizeSharedEntities==='function')mapSanitizeSharedEntities();}catch(e){}
  const rng=(typeof mapRngStream==='function')?mapRngStream('sects',((S.map.seedExtra||1)^(Math.floor(S.time*10)|0)^0x5449434b)>>>0):mapMulberry(((S.map.seedExtra||1)^(Math.floor(S.time*10)|0)^0x5449434b)>>>0);
  mapDiploTick(dt);
  for(const sect of S.sects){
    if(!sect.need)sect.need={food:0.5,qi:0.4,sec:0.5,fame:0.3};
    if(!Array.isArray(sect.orders))sect.orders=[];
    sect.acc=(sect.acc||0)+dt;
    mapSectTickNeeds(sect,dt);
    mapSectProduce(sect,dt);
    // 結束到期遠征
    const remain=[];
    for(const o of sect.orders){
      if(!o)continue;
      if(!o.home&&o.until!=null&&o.until<=S.time){
        mapSectResolveOuting(sect,o,rng);
        continue;
      }
      if(o.home&&o.until!=null&&o.until<=S.time)continue;
      remain.push(o);
    }
    sect.orders=remain;
    if(sect.nextDaily==null||S.time>=sect.nextDaily)mapSectEnsureDaily(sect,rng);
    if(sect.acc>=MAP_SECT_TUNE.tickAcc){
      sect.acc=0;
      mapSectTryOuting(sect,rng);
    }
    sect.power=mapSectPowerOf(sect);
    if(!Number.isFinite(sect.power))sect.power=0;
  }
  // 硬裁 NPC 總數
  let total=mapSectNpcCount();
  const cap=mapSectCap();
  if(total>cap){
    for(let i=S.sects.length-1;i>=0&&total>cap;i--){
      const s=S.sects[i];while(s.npcs&&s.npcs.length>1&&total>cap){s.npcs.pop();total--;}
      s.power=mapSectPowerOf(s);
    }
  }
  if(S.map.spawn)S.map.spawn.sectNpcs=mapSectNpcCount();
}
