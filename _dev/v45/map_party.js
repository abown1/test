// ================== v0.4.x map：弟子自動組隊打突破副本（flags.autoParty）==================
// 規則對齊 plans §B：人數／戰力判定；高兩境 100%、高一境 +40%；<30% 不出發；HP<40% 撤退只傷；留護衛
function mapPartyTune(){return (MAP_TUNE&&MAP_TUNE.party)||{};}
function mapPartyEnsure(){
  if(typeof S==='undefined'||!S||!S.map)return null;
  if(!Array.isArray(S.map.autoParties))S.map.autoParties=[];
  if(S.map.partyAcc==null)S.map.partyAcc=0;
  return S.map.autoParties;
}
function mapPartyIsGuard(u){
  if(!u)return false;
  const r=u.role||u.job;
  return r==='guard'||r==='守衛'||r==='zhifa'||u._mapGuard===1||(u.office==='zhifa');
}
function mapPartyDisciples(){
  if(typeof S==='undefined'||!S||!Array.isArray(S.units))return [];
  return S.units.filter(u=>u&&u.kind==='disciple'&&!u.dead&&!u._mapPartyOut&&!u.inside);
}
function mapPartyHomeGuards(pool){
  return (pool||mapPartyDisciples()).filter(mapPartyIsGuard);
}
function mapPartyPowerOf(u){
  if(!u)return 0;
  return (u.atk||10)+(u.realm||0)*12+((u.maxhp||u.hp||50)/20);
}
function mapPartyTeamPower(members){
  let p=0;for(const u of members)p+=mapPartyPowerOf(u);return p;
}
function mapPartyPickLeader(members){
  let best=null,br=-1;
  for(const u of members){const r=u.realm|0;if(r>br){br=r;best=u;}}
  return best;
}
function mapPartyDgTier(kind){
  const def=(typeof MAP_DGS!=='undefined'&&MAP_DGS[kind])||null;
  return def&&def.minRealm!=null?def.minRealm|0:4;
}
function mapPartyEstSuccess(members,tier){
  const T=mapPartyTune();
  if(!members||!members.length)return 0;
  const lead=mapPartyPickLeader(members);const lr=lead?(lead.realm|0):0;
  const diff=lr-tier;
  let s=(T.baseSuccess!=null?T.baseSuccess:0.20);
  s+=(members.length-2)*((T.perExtraMember!=null)?T.perExtraMember:0.04);
  s+=mapPartyTeamPower(members)*((T.powerScale!=null)?T.powerScale:0.0005);
  if(diff>=2)s+=(T.leadPlus2!=null?T.leadPlus2:0.25);
  else if(diff===1)s+=(T.leadPlus1!=null?T.leadPlus1:0.15);
  else if(diff===0)s+=0.05;
  else if(diff<0)s+=diff*0.12; // 低境懲罰
  const cap=(T.successCap!=null)?T.successCap:0.75;
  return Math.max(0,Math.min(cap,s));
}
function mapPartyPickGate(members){
  const gates=(S.map&&S.map.gates)||(typeof MAP_DG_GATES!=='undefined'?MAP_DG_GATES:[]);
  if(!gates.length)return null;
  const lead=mapPartyPickLeader(members);const lr=lead?(lead.realm|0):0;
  // 優先同境或低一境突破本
  let best=null,bestScore=-1e9;
  for(const g of gates){
    const tier=mapPartyDgTier(g.kind);
    if(tier>lr+1)continue; // 太高不接
    const est=mapPartyEstSuccess(members,tier);
    const score=est*100-(Math.abs(lr-tier)*5);
    if(score>bestScore){bestScore=score;best={gate:g,tier,est};}
  }
  return best;
}
function mapPartyCanForm(pool){
  const T=mapPartyTune();
  const keep=T.keepGuards!=null?T.keepGuards:1;
  const guards=mapPartyHomeGuards(pool);
  const minS=T.minSize||2,maxS=T.maxSize||6;
  // 候選：非唯一護衛（若護衛不足則護衛不可全體外出）
  const avail=[];
  let guardLeft=guards.length;
  for(const u of pool){
    if(mapPartyIsGuard(u)){
      if(guardLeft<=keep)continue;
      guardLeft--;
    }
    avail.push(u);
  }
  if(avail.length<minS)return null;
  // 取境界最高若干人
  avail.sort((a,b)=>(b.realm|0)-(a.realm|0)||mapPartyPowerOf(b)-mapPartyPowerOf(a));
  const members=avail.slice(0,Math.min(maxS,avail.length));
  if(members.length<minS)return null;
  // 再確認留家護衛
  const outIds={};for(const m of members)outIds[m.id]=1;
  const homeGuards=pool.filter(u=>mapPartyIsGuard(u)&&!outIds[u.id]);
  if(homeGuards.length<keep){
    // 踢出一名護衛級隊員
    for(let i=members.length-1;i>=0&&homeGuards.length+(members.filter(mapPartyIsGuard).length-1)<keep;i--){
      if(mapPartyIsGuard(members[i]))members.splice(i,1);
    }
  }
  if(members.length<minS)return null;
  const pick=mapPartyPickGate(members);if(!pick)return null;
  const minSuc=T.minSuccess!=null?T.minSuccess:0.30;
  if(pick.est<minSuc)return null;
  return {members,gate:pick.gate,tier:pick.tier,est:pick.est,leader:mapPartyPickLeader(members)};
}
function mapPartyForm(){
  if(!mapFlag('autoParty'))return null;
  if(!mapFlag('dungeons')&&!(S.map&&S.map.gates&&S.map.gates.length))return null;
  mapPartyEnsure();
  const T=mapPartyTune();
  const maxC=T.maxConcurrent!=null?T.maxConcurrent:2;
  if(S.map.autoParties.filter(p=>p&&p.phase!=='done').length>=maxC)return null;
  const pool=mapPartyDisciples();
  const formed=mapPartyCanForm(pool);if(!formed)return null;
  const id='ap_'+(S.map.seedExtra||0)+'_'+(S.time|0)+'_'+S.map.autoParties.length;
  const hp=formed.members.reduce((s,u)=>s+(u.hp!=null?u.hp:(u.maxhp||50)),0);
  const maxhp=formed.members.reduce((s,u)=>s+(u.maxhp||u.hp||50),0);
  const party={
    id,phase:'formed',
    memberIds:formed.members.map(u=>u.id),
    leaderId:formed.leader&&formed.leader.id,
    kind:formed.gate.kind,tier:formed.tier,est:formed.est,
    hp,maxhp,t0:S.time||0,
    eta:(S.time||0)+(T.runSec?T.runSec[0]+Math.floor(Math.random()*(T.runSec[1]-T.runSec[0]+1)):15),
    result:null,runId:null
  };
  for(const u of formed.members)u._mapPartyOut=party.id;
  S.map.autoParties.push(party);
  try{mapEmit('map:party:form',{id:party.id,members:party.memberIds,kind:party.kind,est:party.est,leaderId:party.leaderId});}catch(e){}
  return party;
}
function mapPartyDepart(party){
  if(!party||party.phase!=='formed')return false;
  party.phase='away';
  // 進入 dgRuns 分區（不強制覆寫玩家 S.dg）；runId 必賦值（dgEnter 失敗／未設 dgRun 時自建）
  const wantId='aprun_'+party.id;
  let runId=null;
  if(typeof mapDgEnter==='function'&&mapFlag('dungeons')){
    const ok=mapDgEnter(party.kind,{force:true,partition:true,party:party.memberIds,ownerId:'autoParty',members:['autoParty'],runId:wantId});
    if(ok&&S.map&&S.map.dgRun&&S.map.dgRun.runId)runId=S.map.dgRun.runId;
    else if(ok&&S.map&&S.map.dgRuns&&S.map.dgRuns[wantId])runId=wantId;
  }
  if(!runId){
    runId=wantId;
    if(typeof mapDgRunsEnsure==='function')mapDgRunsEnsure();
    if(S.map){
      if(!S.map.dgRuns)S.map.dgRuns={};
      if(!S.map.dgRuns[runId]){
        S.map.dgRuns[runId]={runId,kind:party.kind,type:'dungeon',party:(party.memberIds||[]).slice(),ownerId:'autoParty',members:['autoParty'],t0:S.time||0,autoParty:true,cleared:false,exitOpen:false};
      }
    }
  }
  party.runId=runId;
  try{mapEmit('map:party:depart',{id:party.id,kind:party.kind,runId,eta:party.eta});}catch(e){}
  return true;
}
function mapPartyResolve(party,rng){
  if(!party||party.phase==='done')return party;
  rng=rng||Math.random;
  const T=mapPartyTune();
  const members=(party.memberIds||[]).map(id=>{
    try{if(typeof unitById==='function')return unitById(id);}catch(e){}
    return (S.units||[]).find(u=>u&&u.id===id);
  }).filter(Boolean);
  // 抽象戰鬥：依 est 擲骰；中途血量掉到撤退線則撤退
  const retreatHp=T.retreatHp!=null?T.retreatHp:0.40;
  // 模擬損血
  const dmgFrac=0.25+rng()*0.55; // 25–80%
  let hpRatio=Math.max(0.05,1-dmgFrac*(1.1-party.est));
  let outcome='success';
  if(hpRatio<retreatHp&&party.est<0.95){
    outcome='retreat';
    hpRatio=Math.max(0.15,hpRatio);
  }else if(rng()>party.est){
    outcome='fail';
  }
  // 套用血量／受傷
  for(const u of members){
    const mh=u.maxhp||u.hp||50;
    u.hp=Math.max(1,Math.floor(mh*hpRatio*(0.85+rng()*0.3)));
    if(outcome==='retreat'||outcome==='fail'){u._mapWound=1;}
  }
  // 失敗：對部分隊員走敗北（lethal；元嬰前 flee）
  if(outcome==='fail'&&typeof mapDefeatResolve==='function'){
    const foe={realm:party.tier,maxhp:100,hp:100,id:'dg_'+party.kind};
    for(const u of members){
      if(rng()>0.55)continue; // 部分人受「擊敗」結算
      const dr=mapDefeatResolve(foe,u,{kind:'dungeon',lethal:true,src:'autoParty'});
      if(dr&&dr.soulId){party.soulIds=party.soulIds||[];party.soulIds.push(dr.soulId);}
    }
  }
  // 成功：標記 run clear
  if(outcome==='success'&&party.runId&&S.map&&S.map.dgRuns&&S.map.dgRuns[party.runId]){
    S.map.dgRuns[party.runId].cleared=true;S.map.dgRuns[party.runId].exitOpen=true;
  }
  party.phase='done';party.result=outcome;party.hpRatio=hpRatio;
  for(const u of members)delete u._mapPartyOut;
  // 清分區焦點無關的 auto run（保留記錄短時）
  try{mapEmit('map:party:result',{id:party.id,kind:party.kind,result:outcome,est:party.est,hpRatio,soulIds:party.soulIds||null});}catch(e){}
  return party;
}
function mapPartyTick(dt){
  if(!mapFlag('autoParty'))return;
  if(typeof S==='undefined'||!S||!S.map||!S.map.unlocked)return;
  if(!(dt>0)||!Number.isFinite(dt))return;
  try{if(typeof mapSanitizeSharedEntities==='function')mapSanitizeSharedEntities();}catch(e){}
  mapPartyEnsure();
  const T=mapPartyTune();
  S.map.partyAcc=(S.map.partyAcc||0)+dt;
  // 推進既有隊伍
  for(const p of S.map.autoParties){
    if(!p||p.phase==='done')continue;
    if(p.phase==='formed')mapPartyDepart(p);
    else if(p.phase==='away'&&(S.time||0)>=p.eta)mapPartyResolve(p);
  }
  // 嘗試新組隊
  const accNeed=T.tickAcc!=null?T.tickAcc:8;
  if(S.map.partyAcc>=accNeed){
    S.map.partyAcc=0;
    mapPartyForm();
  }
  // 裁切完成記錄
  if(S.map.autoParties.length>20)S.map.autoParties=S.map.autoParties.slice(-12);
}
