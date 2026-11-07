// ================== v0.4.x map PHASE5：飛往副本＋途中遭遇 ==================
function mapTravelCap(){return (MAP_TRAVEL_TUNE&&MAP_TRAVEL_TUNE.maxConcurrent)||(MAP_TUNE.spawn&&MAP_TUNE.spawn.travelEnc)||3;}
function mapTravelActiveCount(){
  if(typeof S==='undefined'||!S||!S.map)return 0;
  if(!Array.isArray(S.map.activeTravels))S.map.activeTravels=[];
  return S.map.activeTravels.length;
}
function mapTravelMulberry(seed){
  let a=(seed>>>0)||1;
  return function(){a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return ((t^t>>>14)>>>0)/4294967296;};
}
function mapTravelMakeBanditFoe(tr,rng){
  const cap=(typeof mapBanditRealmCap==='function')?mapBanditRealmCap():2;
  const fx=(tr&&tr.x!=null)?tr.x:((tr&&tr.gate&&tr.gate.x)||0);
  const fy=(tr&&tr.y!=null)?tr.y:((tr&&tr.gate&&tr.gate.y)||0);
  const range=(typeof mapBanditRealmRange==='function')?mapBanditRealmRange({type:'bandit',x:fx,y:fy},{type:'bandit',x:fx,y:fy}):{min:0,max:cap};
  let partyMax=0;for(const u of (tr&&tr.partyUnits)||[])if(u&&u.realm!=null)partyMax=Math.max(partyMax,u.realm|0);
  const realm=Math.min(cap,range.max,partyMax>0?Math.max(range.min,partyMax):range.min);
  let _hp=70,_atk=10;
  if(typeof xnScaleStat==='function'){_hp=xnScaleStat(70,realm,'hp');_atk=xnScaleStat(10,realm,'atk');}
  else{for(let i=0;i<(realm|0);i++){_hp=Math.max(1,Math.floor(_hp*1.1+1e-9));_atk=Math.floor(_atk*1.1*10+1e-9)/10;}}
  const foe={
    id:'tr_bandit_'+((tr&&tr.id)||'x')+'_'+(Math.floor((typeof rng==='function'?rng():Math.random())*1e6)),
    type:'bandit',name:'山賊',_mapBandit:1,realm,
    atk:+_atk.toFixed(1),maxhp:_hp,hp:_hp,speed:2.2,def:Math.min(realm,3),
    x:fx,y:fy,home:{x:fx,y:fy},path:[],target:null,lod:0,cd:0,scan:0,repath:0,anim:0,slowT:0,stun:0,wt:0
  };
  if(typeof mapEnemyDecorate==='function'){
    mapEnemyDecorate(foe,{type:'bandit',isBandit:true,refRealm:realm,rng:rng||Math.random,allowCarrier:true});
  }else if(foe.realm>cap)foe.realm=cap;
  if(typeof mapEnsureEntityXY==='function')mapEnsureEntityXY(foe,fx,fy);
  return foe;
}
function mapTravelPickOther(rng,preferBandit){
  // 他宗／散修／山賊（山賊境≤大武師）
  if(!preferBandit&&S.sects&&S.sects.length&&rng()<0.70){
    const s=S.sects[Math.floor(rng()*S.sects.length)];
    return {kind:'sect',id:s.id,name:s.name,align:s.align};
  }
  if(preferBandit||rng()<0.45){
    const cap=(typeof mapBanditRealmCap==='function')?mapBanditRealmCap():2;
    return {kind:'rogue',id:'bandit',name:'山賊',align:'xie',bandit:true,realmCap:cap};
  }
  return {kind:'rogue',id:'rogue',name:'過路散修',align:'neutral'};
}
function mapTravelEncWeight(type,other,partyAlign){
  const row=MAP_TRAVEL_ENC.find(e=>e.k===type);if(!row)return 0;
  let w=row.w;
  if(other.kind==='sect'&&typeof mapDiploGet==='function'){
    const d=mapDiploGet(partyAlign||'player',other.id)||mapDiploGet('qingheng',other.id);
    // partyAlign may be player sect id 'player' — use first friendly heuristic via rel to other
    const rel=d?d.rel:0;const st=d?d.state:'neutral';
    if(type==='robbery'||type==='duel'){if(st==='ally'||st==='peace')w*=0.15;if(st==='rival'||st==='war')w*=1.8;if(rel<0)w*=1.2;}
    if(type==='trade'||type==='teach'||type==='banter'){if(st==='ally'||st==='peace')w*=1.5;if(st==='war')w*=0.2;}
    if(type==='ignore'){if(st==='neutral')w*=1.2;}
  }else{
    if(type==='robbery')w*=0.9;if(type==='trade')w*=1.1;
  }
  // 同 align 降低劫殺
  if(other.align&&partyAlign&&other.align===partyAlign&&(type==='robbery'||type==='duel'))w*=0.4;
  return Math.max(0,w);
}
function mapTravelRollEnc(tr,rng){
  const other=mapTravelPickOther(rng,false);
  const partyAlign=(tr.partyAlign)||null;
  // 安全區禁劫殺
  let x=(tr.encX!=null)?tr.encX:tr.x,y=(tr.encY!=null)?tr.encY:tr.y;
  if(x==null&&tr.gate){x=tr.gate.x;y=tr.gate.y;}
  const inSafe=(typeof mapCityInSafe==='function')&&mapCityInSafe(x||0,y||0);
  const opts=[];
  for(const row of MAP_TRAVEL_ENC){
    if(row.k==='robbery'&&inSafe)continue;
    if(row.k==='robbery'&&mapFlag('cities')&&inSafe)continue;
    opts.push({k:row.k,w:mapTravelEncWeight(row.k,other,partyAlign)});
  }
  let sum=0;for(const o of opts)sum+=o.w;if(!(sum>0))return {type:'ignore',other};
  let r=rng()*sum,pick=opts[0];for(const o of opts){r-=o.w;if(r<=0){pick=o;break;}}
  const enc={type:pick.k,other,inSafe:!!inSafe};
  // 劫殺／山賊散修：掛山賊敵（境界≤大武師）；弟子／玩家同規則
  if(enc.type==='robbery'||(other&&(other.bandit||other.id==='bandit'))){
    other.bandit=true;other.name=other.name||'山賊';
    enc.foe=mapTravelMakeBanditFoe(tr,rng);
    enc.foeRealm=enc.foe.realm;
  }
  return enc;
}
function mapTravelResolveEnc(tr,enc,rng){
  const T=MAP_TRAVEL_TUNE;const type=enc.type;const other=enc.other;
  const result={type,ok:true,xiu:0,relDelta:0,msg:'',ls:0,defeat:null};
  const party=tr.partyUnits||[];
  const payer=party[0]||{lingshi:(typeof S!=='undefined'&&S&&S.res&&S.res.lingshi)||0};
  if(type==='ignore'){result.msg='雙方錯身而過';}
  else if(type==='trade'){
    const cost=(T.tradeLs!=null)?T.tradeLs:(2+Math.floor(rng()*4));
    const pay=typeof mapPay==='function'?mapPay(payer,cost,'travel_trade'):{ok:true,paid:0};
    if(pay.ok){
      const gain=Math.max(1,Math.floor(cost*0.8+rng()*3));
      if(typeof mapGain==='function')mapGain(payer,gain,'travel_trade');
      result.ls=gain-cost;result.relDelta=T.tradeRel;result.msg='以靈石互通有無（淨 '+result.ls+'）';
      if(other.kind==='sect'&&tr.playerSectId)try{mapDiploAdjust(tr.playerSectId,other.id,T.tradeRel);}catch(e){}
    }else{result.ok=false;result.msg='靈石不足，交易作罷';result.type='ignore';}
  }else if(type==='teach'){
    const xiu=T.teachXiu[0]+Math.floor(rng()*(T.teachXiu[1]-T.teachXiu[0]+1));
    result.xiu=xiu;result.msg='互傳修煉心得（+' + xiu + '）';
    for(const u of party){if(u&&u.xiu!=null)u.xiu=(u.xiu||0)+xiu;else if(u)u._mapTeachXiu=(u._mapTeachXiu||0)+xiu;}
  }else if(type==='duel'){
    const win=rng()<0.5+(tr.partyPower||0)/500;
    result.win=win;result.relDelta=win?T.duelWinRel:T.duelWinRel*0.5;
    result.msg=win?'比武占優':'比武落於下風';
    const foe=enc.foe||{realm:4,maxhp:80,hp:80};
    const wUnit=win?(party[0]||payer):foe;const lUnit=win?foe:(party[0]||payer);
    if(typeof mapDefeatResolve==='function')result.defeat=mapDefeatResolve(wUnit,lUnit,{kind:'duel',lethal:false,src:'travel'});
    if(other.kind==='sect'&&tr.playerSectId)try{mapDiploAdjust(tr.playerSectId,other.id,result.relDelta);}catch(e){}
  }else if(type==='robbery'){
    if(enc.inSafe||(typeof mapCityAllowsRobbery==='function'&&tr.x!=null&&!mapCityAllowsRobbery(tr.x,tr.y))){
      result.ok=false;result.msg='安全區內不得劫殺';result.type='ignore';
    }else{
      const win=rng()<0.45+(tr.partyPower||0)/400;
      result.win=win;result.relDelta=T.robRel;
      const foe=enc.foe||{type:'bandit',realm:4,maxhp:100,hp:100,_mapBandit:1};
      const wUnit=win?(party[0]||payer):foe;const lUnit=win?foe:(party[0]||{realm:5,maxhp:100,hp:100});
      if(typeof mapDefeatResolve==='function'){
        result.defeat=mapDefeatResolve(wUnit,lUnit,{kind:'robbery',lethal:true,src:'travel'});
        if(result.defeat&&result.defeat.soulId){result.soulId=result.defeat.soulId;result.pendingSoul=result.defeat.soulId;}
      }
      const df=result.defeat;
      result.msg=win?(df&&df.outcome==='flee'?'擊退劫修，對方重傷逃走':(df&&df.outcome==='soulDestroyed'?'擊退並滅其神魂':(df&&df.soulId?'擊退，敵元神逃逸':'擊退劫修'))):'苦戰脫身';
      if(other.kind==='sect'&&tr.playerSectId)try{mapDiploAdjust(tr.playerSectId,other.id,T.robRel);}catch(e){}
    }
  }else if(type==='banter'){
    result.relDelta=T.banterRel;result.msg='唇槍舌戰一場';
    if(other.kind==='sect'&&tr.playerSectId)try{mapDiploAdjust(tr.playerSectId,other.id,T.banterRel);}catch(e){}
  }
  enc.result=result;
  try{if(typeof mapGfOnTravelResolve==='function')result.gf=mapGfOnTravelResolve(tr,enc,result);}catch(e){}
  try{mapEmit('map:travel:resolve',{type:result.type,other,result,travelId:tr.id});}catch(e){}
  return result;
}
function mapTravelArrive(tr){
  tr.phase='arrive';
  try{mapEmit('map:dg:fly',{kind:tr.gate&&tr.gate.kind,travelId:tr.id,done:true});}catch(e){}
  // 交接進副本（旗 dungeons 開才自動開打）
  let entered=false;
  if(mapFlag('dungeons')&&tr.gate&&typeof mapDgEnter==='function'){
    entered=!!mapDgEnter(tr.gate.kind,{fromTravel:tr.id,party:tr.party});
  }
  tr.entered=entered;
  // 從 active 移除
  if(S.map&&Array.isArray(S.map.activeTravels)){
    S.map.activeTravels=S.map.activeTravels.filter(t=>t.id!==tr.id);
  }
  if(S.travel&&S.travel.id===tr.id)S.travel=null;
  return tr;
}
// gate: {id,kind,x,y}｜kind 字串；party: [unitId]|[{id,...}]
function mapTravelStart(gate,party){
  if(!mapFlag('travel'))return null;
  if(typeof S==='undefined'||!S)return null;
  if(!S.map)mapMigrateSave(S);
  if(!S.map.unlocked&&!mapFlag('world'))return null;
  if(!Array.isArray(S.map.activeTravels))S.map.activeTravels=[];
  if(S.map.activeTravels.length>=mapTravelCap())return null;
  let g=gate;
  if(typeof gate==='string'){
    g=(S.map.gates||[]).find(x=>x.kind===gate||x.id===gate)||{id:gate,kind:gate,x:0,y:0};
  }
  if(!g||!g.kind)return null;
  const T=MAP_TRAVEL_TUNE;
  const rng=(typeof mapRngStream==='function')?mapRngStream('travel',(S.map.seedExtra||1)^(S.time*1000|0)^0x5452564c):mapTravelMulberry((S.map.seedExtra||1)^(S.time*1000|0)^0x5452564c);
  const fly=T.flySec[0]+Math.floor(rng()*(T.flySec[1]-T.flySec[0]+1));
  const ids=(party||[]).map(p=>typeof p==='object'?p.id:p);
  const units=(party||[]).map(p=>{
    if(typeof p==='object')return p;
    try{if(typeof unitById==='function')return unitById(p);}catch(e){}
    return {id:p};
  }).filter(Boolean);
  let power=0;for(const u of units)power+=(u.atk||10)+(u.realm||0)*8;
  const ownerId=(g&&g.ownerId)||(typeof mapCoopPkeyFallback==='function'?mapCoopPkeyFallback():'local');
  const tr={
    id:'tr_'+(S.map.seedExtra||0)+'_'+(S.map.activeTravels.length)+'_'+(S.time|0),
    phase:'fly',gate:{id:g.id,kind:g.kind,x:g.x,y:g.y},
    party:ids,partyUnits:units,partyPower:power,
    playerSectId:'player',partyAlign:null,
    ownerId:ownerId,volunteers:[],
    t0:S.time||0,eta:(S.time||0)+fly,encAt:null,enc:null,
    x:g.x,y:g.y
  };
  // 起飛點（弟子／玩家同規則：以宗門大廳或地圖中央為起點）
  tr.fromX=144;tr.fromY=144;
  try{if(S.sects){const ps=S.sects.find(s=>s.id==='qingheng')||S.sects[0];if(ps&&ps.hall){tr.fromX=ps.hall.x;tr.fromY=ps.hall.y;}}}catch(e){}
  // 預先決定是否遭遇
  if(rng()<T.encChance){
    const f=0.35+rng()*0.4;tr.encAt=tr.t0+fly*f;
    tr.encX=tr.fromX+(g.x-tr.fromX)*f;tr.encY=tr.fromY+(g.y-tr.fromY)*f;
  }
  S.map.activeTravels.push(tr);
  S.travel=tr;
  try{mapEmit('map:dg:fly',{kind:g.kind,travelId:tr.id,eta:tr.eta});}catch(e){}
  return tr;
}
function mapTravelTick(dt){
  if(!mapFlag('travel')){
    try{if(typeof S!=='undefined'&&S&&S.map&&S.map.unlocked&&typeof mapSanitizeSharedEntities==='function')mapSanitizeSharedEntities();}catch(e){}
    return;
  }
  try{if(typeof S!=='undefined'&&S&&S.map&&S.map.unlocked&&typeof mapSanitizeSharedEntities==='function')mapSanitizeSharedEntities();}catch(e){}
  if(typeof S==='undefined'||!S||!S.map)return;
  if(!Array.isArray(S.map.activeTravels)||!S.map.activeTravels.length){
    if(S.travel&&S.travel.phase){/* 單一相容 */}else return;
  }
  if(!(dt>0)||!Number.isFinite(dt))return;
  const list=S.map.activeTravels.slice();
  // 若只有 S.travel 未進 active（舊狀態）則納入
  if(S.travel&&!list.some(t=>t.id===S.travel.id))list.push(S.travel);
  const rng=(typeof mapRngStream==='function')?mapRngStream('travel',(S.map.seedExtra||1)^((S.time*10)|0)^0x5449434b):mapTravelMulberry((S.map.seedExtra||1)^((S.time*10)|0)^0x5449434b);
  for(const tr of list){
    if(!tr||tr.phase==='arrive')continue;
    if(tr.phase==='fly'){
      if(tr.encAt!=null&&!tr.enc&&(S.time||0)>=tr.encAt){
        tr.phase='enc';
        tr.enc=mapTravelRollEnc(tr,rng);
        tr.enc.t=S.time;
        tr.enc.until=(S.time||0)+(MAP_TRAVEL_TUNE.encResolveSec[0]+Math.floor(rng()*(MAP_TRAVEL_TUNE.encResolveSec[1]-MAP_TRAVEL_TUNE.encResolveSec[0]+1)));
        try{mapEmit('map:travel:enc',{type:tr.enc.type,other:tr.enc.other,travelId:tr.id});}catch(e){}
      }else if((S.time||0)>=tr.eta){
        mapTravelArrive(tr);
      }
    }else if(tr.phase==='enc'){
      if((S.time||0)>=(tr.enc&&tr.enc.until||0)){
        mapTravelResolveEnc(tr,tr.enc,rng);
        tr.phase='fly';
        tr.encAt=null;
        // 剩餘路程：若已過 eta 則直接到達
        if((S.time||0)>=tr.eta)mapTravelArrive(tr);
      }
    }
  }
}
