// ================== v0.4.x map：弟子自動組隊打突破副本（flags.autoParty）==================
// 規則對齊 plans §B：人數／戰力判定；高兩境 100%、高一境 +40%；<30% 不出發；HP<40% 撤退只傷；留護衛
function mapPartyTune(){return (MAP_TUNE&&MAP_TUNE.party)||{};}
const MAP_PARTY_RUN_PREFIX='aprun_',MAP_PARTY_OWNER='autoParty';
function mapPartyDgName(kind){
  try{const d=(typeof MAP_DGS!=='undefined'&&MAP_DGS[kind])||(typeof DGS!=='undefined'&&DGS&&DGS[kind]);if(d&&d.n)return d.n;}catch(e){}
  return '秘境';
}
function mapPartyEnsure(){
  if(typeof S==='undefined'||!S||!S.map)return null;
  if(!Array.isArray(S.map.autoParties))S.map.autoParties=[];
  if(S.map.partyAcc==null)S.map.partyAcc=0;
  return S.map.autoParties;
}
// 找弟子：世界 S.units，或玩家在副本時暫存在核心 S.dg.W.units 的世界單位
function mapPartyUnitAnywhere(id){
  let u=null;
  try{if(typeof unitById==='function')u=unitById(id);}catch(e){}
  if(!u)u=(S.units||[]).find(x=>x&&x.id===id)||null;
  if(!u&&S.dg&&S.dg.W&&Array.isArray(S.dg.W.units))u=S.dg.W.units.find(x=>x&&x.id===id)||null;
  return u;
}
// 隊伍已結束或不存在，但弟子仍掛著 _mapPartyOut → 清掉（避免弟子永遠無法再組隊）
function mapPartyClearStaleOut(){
  const live={};for(const q of (S.map&&S.map.autoParties)||[])if(q&&q.phase!=='done')live[q.id]=1;
  const lists=[S.units||[]];if(S.dg&&S.dg.W&&Array.isArray(S.dg.W.units))lists.push(S.dg.W.units);
  let n=0;for(const L of lists)for(const u of L)if(u&&u._mapPartyOut&&!live[u._mapPartyOut]){delete u._mapPartyOut;n++;}
  return n;
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
    kind:formed.gate.kind,n:mapPartyDgName(formed.gate.kind),tier:formed.tier,est:formed.est,
    hp,maxhp,t0:S.time||0,
    eta:(S.time||0)+(T.runSec?T.runSec[0]+Math.floor(Math.random()*(T.runSec[1]-T.runSec[0]+1)):15),
    result:null,runId:null
  };
  for(const u of formed.members)u._mapPartyOut=party.id;
  S.map.autoParties.push(party);
  try{mapEmit('map:party:form',{id:party.id,members:party.memberIds,kind:party.kind,n:party.n,est:party.est,leaderId:party.leaderId});}catch(e){}
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
    if(ok&&S.map&&S.map.dgRuns&&S.map.dgRuns[wantId])runId=wantId;   // 分區只寫 dgRuns，不看玩家焦點 dgRun
  }
  if(!runId){
    runId=wantId;
    if(typeof mapDgRunsEnsure==='function')mapDgRunsEnsure();
    if(S.map){
      if(!S.map.dgRuns)S.map.dgRuns={};
      if(!S.map.dgRuns[runId]){
        S.map.dgRuns[runId]={runId,kind:party.kind,n:mapPartyDgName(party.kind),type:'dungeon',party:(party.memberIds||[]).slice(),ownerId:'autoParty',members:['autoParty'],t0:S.time||0,autoParty:true,cleared:false,exitOpen:false};
      }
    }
  }
  party.runId=runId;
  try{mapEmit('map:party:depart',{id:party.id,kind:party.kind,n:party.n||mapPartyDgName(party.kind),runId,eta:party.eta});}catch(e){}
  return true;
}
function mapPartyResolve(party,rng){
  if(!party||party.phase==='done')return party;
  rng=rng||Math.random;
  const T=mapPartyTune();
  const members=(party.memberIds||[]).map(mapPartyUnitAnywhere).filter(Boolean);
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
    const foe={realm:party.tier,maxhp:100,hp:100,id:'dg_'+party.kind,n:mapPartyDgName(party.kind),name:mapPartyDgName(party.kind)};
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
  try{mapEmit('map:party:result',{id:party.id,kind:party.kind,n:party.n||mapPartyDgName(party.kind),result:outcome,est:party.est,hpRatio,soulIds:party.soulIds||null});}catch(e){}
  return party;
}
function mapPartyTick(dt){
  try{mapPartyClearStrayDg();}catch(e){}       // 舊版殘留：玩家 S.dg 被弟子分區蓋掉 → 安全清除（不呼叫 dgExit）
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
  try{mapPartyClearStaleOut();}catch(e){}
  // 嘗試新組隊
  const accNeed=T.tickAcc!=null?T.tickAcc:8;
  if(S.map.partyAcc>=accNeed){
    S.map.partyAcc=0;
    mapPartyForm();
  }
  // 裁切完成記錄
  if(S.map.autoParties.length>20){
    const drop=S.map.autoParties.slice(0,-12);S.map.autoParties=S.map.autoParties.slice(-12);
    // 一併移除已結束隊伍的分區記錄（只刪 autoParty 自己的 run，玩家副本不受影響）
    for(const q of drop)if(q&&q.phase==='done'&&q.runId&&S.map.dgRuns&&S.map.dgRuns[q.runId]&&(S.map.dgRuns[q.runId].ownerId===MAP_PARTY_OWNER||S.map.dgRuns[q.runId].autoParty)){
      delete S.map.dgRuns[q.runId];if(S.map.memberRun&&S.map.memberRun[MAP_PARTY_OWNER]===q.runId)delete S.map.memberRun[MAP_PARTY_OWNER];}
  }
}

// ---- 舊版殘留清理：S.dg 是弟子自動組隊的分區（玩家實際上在世界）----
// 判斷依據（三者皆成立才算殘留）：
//  1) dg._map 為真且沒有 dg._mapCore（玩家實際進場的副本一律由核心 dgEnter 建立，帶 _mapCore 或沒有 _map）；
//  2) dg.runId 以 'aprun_' 開頭，或 map.dgRuns[runId] 的 ownerId==='autoParty'／autoParty 為真（只有 mapPartyDepart 會產生）；
//  3) 不是副本格存檔：dg.L.block 不是 DG_N² 的副本牆（分區從未生成副本格）。
// 清理只拿掉玩家的 dg 與 dgRun 焦點；世界（units／enemies／npcs／buildings／vstructs／time）保持存檔內容，不呼叫 dgExit、不刪存檔。
function mapPartyIsStrayDg(D,map){
  if(!D||typeof D!=='object'||!D._map||D._mapCore)return false;
  const L=D.L;const dgN=(typeof DG_N==='number')?DG_N:128;
  if(L&&L.block&&L.block.length===dgN*dgN)return false;
  const rid=D.runId!=null?String(D.runId):'';
  const run=rid&&map&&map.dgRuns?map.dgRuns[rid]:null;
  return rid.indexOf(MAP_PARTY_RUN_PREFIX)===0||!!(run&&(run.ownerId===MAP_PARTY_OWNER||run.autoParty));
}
function mapPartyClearStrayDg(){
  if(typeof S==='undefined'||!S||!S.dg||!mapPartyIsStrayDg(S.dg,S.map))return false;
  const rid=S.dg.runId;
  S.dg=null;
  if(S.map&&S.map.dgRun&&S.map.dgRun.runId===rid)S.map.dgRun=null;
  try{if(typeof document!=='undefined'&&document.body)document.body.classList.remove('indg');}catch(e){}
  mapPartyClearStrayDg.n=(mapPartyClearStrayDg.n|0)+1;
  return true;
}
// 讀檔前：存檔 d.dg 為上述殘留 → 用去掉 dg 的淺拷貝讀入（d 本身＝副本前的世界快照，原物件不改）
function mapPartyScrubSave(d){
  if(!d||typeof d!=='object'||!d.dg||!mapPartyIsStrayDg(d.dg,d.map))return d;
  const rid=d.dg.runId;
  const out=Object.assign({},d);delete out.dg;
  if(out.map&&typeof out.map==='object'){out.map=Object.assign({},out.map);if(out.map.dgRun&&out.map.dgRun.runId===rid)out.map.dgRun=null;}
  mapPartyScrubSave.n=(mapPartyScrubSave.n|0)+1;mapPartyScrubSave.last=rid;
  return out;
}
function mapPartySaveGuardInstall(){
  if(mapPartySaveGuardInstall._ok)return true;
  if(typeof applySave!=='function')return false;
  if(!applySave._mapPartyScrub){
    const _as=applySave;
    applySave=function(d){let dd=d;try{dd=mapPartyScrubSave(d);}catch(e){dd=d;}return _as.call(this,dd);};
    applySave._mapPartyScrub=1;
    try{if(typeof window!=='undefined'&&window.XW)window.XW.applySave=applySave;}catch(e){}
  }
  mapPartySaveGuardInstall._ok=true;return true;
}
mapPartySaveGuardInstall._ok=false;
if(typeof setTimeout==='function'){
  setTimeout(function mapPartySaveGuardBoot(){if(!mapPartySaveGuardInstall())setTimeout(mapPartySaveGuardBoot,40);},0);
}
