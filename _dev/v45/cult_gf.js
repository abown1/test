// ================== cult_gf.js：功法學習／參悟／裝備／熟練（旗標預設 ON）==================
(globalThis.__cultQS)||(globalThis.__cultQS=(function(){/* P0 2026-11-13：網址參數只在第一次用到時解析一次並快取（遊戲執行中只有 g23 改 big/classic，不動 cult 參數）；?caiqs=0 回到每次重新解析 */let p=null,off=false;const rd=function(){try{return (typeof location!=='undefined'&&location.search)||'';}catch(e){return '';}};off=/(?:^|[?&])caiqs=(0|off|false)(?:&|$)/.test(rd());const g=function(){if(off)return new URLSearchParams(rd());if(p===null)p=new URLSearchParams(rd());return p;};g.off=off;g.gen=0;g.reset=function(){p=null;g.gen++;};/* 測試或換網址後呼叫 reset() */return g;})());
(globalThis.__cultStore)||(globalThis.__cultStore=(function(){/* singlestore 2026-11-13：宗門倉庫唯一存放。XW_STORE 存在且 enabled() 才走它；?cultstore=0 或 ?singlestore=0 回舊寫法。add/take 失敗（客機唯讀、未綁定等）一律回 false，呼叫端照舊寫法處理 */const X=function(){try{const q=globalThis.__cultQS&&globalThis.__cultQS();if(q&&/^(0|off|false)$/.test(q.get('cultstore')||''))return null;const s=(typeof XW_STORE!=='undefined')?XW_STORE:null;return s&&typeof s.enabled==='function'&&s.enabled()?s:null;}catch(e){return null;}};X.add=function(k,n,why,opt){const s=X();if(!s||!(n>0))return false;try{const r=s.add(k,n,why,opt);return !!(r&&r.ok);}catch(e){return false;}};X.take=function(k,n,why){const s=X();if(!s||!(n>0))return false;try{const r=s.take(k,n,why);return !!(r&&r.ok);}catch(e){return false;}};X.get=function(k){const s=X();try{return s?s.get(k):undefined;}catch(e){return undefined;}};return X;})());
(function(){
if(typeof CULT_FLAGS==='undefined')window.CULT_FLAGS={};
if(CULT_FLAGS.gongfa==null)CULT_FLAGS.gongfa=true;

const GF_CFG={
  auxSlots:[0,0,0,0,1,1,2,2,2,3,3],
  sameSchool:0.08,
  auxCult:0.35,
  counterMul:1.06,
  switchPenMul:0.75,
  switchPenSec:90,
  caps:{cultMul:1.50,dmgRed:0.35},
  cultCap:1.50,
  drCap:0.35,
  priceLow:50,priceMid:200,priceHigh:800,
  saveVer:1,
  studyBase:{low:30,mid:90,high:240},
  studyWu:0.008,
  studyMinMul:0.35,
  profNeed:[0,25,55,90],
  profNames:['入門','小成','大成','圓滿'],
  profCult:[0,0.04,0.08,0.14],
  profPerSec:0.35,
  profOnHit:0.8,
  barSlots:5,
  // 卷軸「學習」改為參悟中需時間（gflearn；?gflearn=0 關回一按學成）。單位：遊戲秒 S.time（1× 速度＝實秒；YEAR_SEC=300 秒一年）。
  // 品階 gradeOf：下品 xia／中品 zhong／上品 shang／極品 ji，每升一階 ×1.5。
  // 悟性縮短：有效悟性 wuEff=u.wu×rbAXk（g27 10～1000 尺度換回 1～100），縮短＝min(0.30, wuEff×0.003)，悟性 100 起封頂 −30%。
  //   品階   基礎秒數   悟性封頂（−30%）
  //   下品     90         63
  //   中品    135         95
  //   上品    203        142
  //   極品    304        213
  learn:{base:{xia:90,zhong:135,shang:203,ji:304},wuK:0.003,wuCap:0.30},
  cond:{
    hpLt:0.20,          // 待確認：低血觸發門檻
    hpLtAtk:0.20,       // 待確認：低血時攻擊加成
    qiFull:1,           // 待確認：滿靈力判定（比例，1＝全滿）
    qiFullSpd:0.15,     // 待確認：滿靈力時移動速度加成
    hpGt:0.80,          // 待確認：高血觸發門檻
    hpGtDr:0.08,        // 待確認：高血時減傷
    atkAlways:0.08,     // 待確認：常時攻擊加成
    spdAlways:0.10,     // 待確認：常時移動速度加成
    drAlways:0.06,      // 待確認：常時減傷
    qiLt:0.30,          // 待確認：低靈力觸發門檻
    qiLtAtk:0.12        // 待確認：低靈力時攻擊加成
  }
};
window.GF_CFG=GF_CFG;
window.CULT_GF_CFG=GF_CFG;
function capOf(key){
  const caps=GF_CFG.caps||{};
  if(key==='cultMul')return caps.cultMul!=null?+caps.cultMul:(GF_CFG.cultCap!=null?+GF_CFG.cultCap:1.50);
  if(key==='dmgRed')return caps.dmgRed!=null?+caps.dmgRed:(GF_CFG.drCap!=null?+GF_CFG.drCap:0.35);
  return caps[key];
}

const CATALOG=(typeof GF_CATALOG!=='undefined'&&GF_CATALOG)||window.GF_CATALOG||[];
const BY={};for(const r of CATALOG)BY[r.id]=r;
const COUNTER={zheng:'xie',xie:'xian',xian:'zheng'};
const ITEM_PF='gfman:';

function on(){return !!(typeof CULT_FLAGS!=='undefined'&&CULT_FLAGS.gongfa);}
function getS(){if(typeof S!=='undefined'&&S)return S;if(window.XW&&XW.S)return XW.S;return window.S||null;}
function now(){const s=getS();return (s&&s.time)||0;}
function isClient(){try{const n=(typeof XW!=='undefined'&&XW.net)||(window.XW&&XW.net);return !!(n&&n.role==='client');}catch(e){return false;}}
function emit(n,d){try{if(window.Cult&&typeof Cult.emit==='function')Cult.emit(n,d);}catch(e){}try{window.dispatchEvent(new CustomEvent(n,{detail:d}));}catch(e){}}
function bag(){const s=getS();if(!s)return {};if(!s.gfBag)s.gfBag={};return s.gfBag;}
function get(id){return BY[id]||null;}
function parseItemId(s){if(!s)return null;if(typeof s!=='string')return s;return s.indexOf(ITEM_PF)===0?s.slice(ITEM_PF.length):s;}
function itemId(id){return ITEM_PF+id;}
function migrateUnit(u){
  if(!u)return u;
  if(!u.gf)u.gf={v:1,learned:{},main:null,aux:[],pen:null,study:null,holding:[],entry:0};
  const g=u.gf;
  if(!g.learned||typeof g.learned!=='object')g.learned={};
  if(!Array.isArray(g.aux))g.aux=[];
  if(!Array.isArray(g.holding))g.holding=[];
  if(!Array.isArray(g.bar))g.bar=[];
  while(g.bar.length<(GF_CFG.barSlots||5))g.bar.push(null);
  if(g.bar.length>(GF_CFG.barSlots||5))g.bar.length=GF_CFG.barSlots||5;
  if(Array.isArray(u.econGf)){
    for(const eid of u.econGf){
      if(eid&&get(eid)&&!g.learned[eid])g.learned[eid]={prof:0,tier:0};
    }
  }
  for(const id in g.learned){
    let rec=g.learned[id];
    if(!rec||typeof rec!=='object')rec=g.learned[id]={prof:0,tier:0};
    rec.prof=+rec.prof||0;rec.tier=profTier(rec.prof);
  }
  return u;
}
function pack(u){migrateUnit(u);return u&&u.gf?JSON.parse(JSON.stringify(u.gf)):null;}
function unpack(u,data){if(!u)return u;u.gf=data?JSON.parse(JSON.stringify(data)):null;return migrateUnit(u);}
function catalog(){return CATALOG.map(r=>Object.assign({},r));}
function priceHint(id){
  const r=get(id);if(!r)return null;
  const xia=r.price!=null?r.price:(r.tier==='high'?GF_CFG.priceHigh:r.tier==='mid'?GF_CFG.priceMid:GF_CFG.priceLow);
  return {id:r.id,itemId:itemId(r.id),tier:r.tier,school:r.school,minRealm:r.minRealm,xia:xia,label:r.name};
}
function bagCount(id){return (bag()[id]|0);}
function grantManual(id,n){if(!get(id))return 0;const b=bag();b[id]=(b[id]|0)+Math.max(0,n|0);return b[id];}
function consumeManual(id,n){n=Math.max(1,n|0);const b=bag();if((b[id]|0)<n)return false;b[id]-=n;if(!b[id])delete b[id];return true;}
function owned(u,id){migrateUnit(u);return !!(u&&u.gf&&u.gf.learned&&u.gf.learned[id]);}
function profTier(p){const need=GF_CFG.profNeed;let t=0;for(let i=0;i<need.length;i++)if((p||0)>=need[i])t=i;return t;}
function profName(t){return GF_CFG.profNames[t]||GF_CFG.profNames[0];}
function recOf(u,id){migrateUnit(u);return u&&u.gf&&u.gf.learned?u.gf.learned[id]:null;}
function addProf(u,id,amt){
  const rec=recOf(u,id);if(!rec)return 0;
  rec.prof=Math.min(100,rec.prof+(+amt||0));
  rec.tier=profTier(rec.prof);
  return rec.prof;
}
function gfAXk(u){try{if(typeof rbAXk==='function'){const k=+rbAXk(u);if(k>0&&isFinite(k))return k;}}catch(e){}return 1;}
function studyDur(u,id){
  const r=get(id);if(!r)return 0;
  const base=GF_CFG.studyBase[r.tier]||GF_CFG.studyBase.low;
  const wu=((u&&u.wu)||0)*gfAXk(u); // g27 悟性 10～1000 尺度：已換算單位 ×0.1
  return Math.max(base*GF_CFG.studyMinMul,base/(1+wu*GF_CFG.studyWu));
}
function slots(u){const r=Math.max(0,(u&&u.realm)|0);const a=GF_CFG.auxSlots;return {main:1,aux:a[Math.min(r,a.length-1)]|0};}
function fail(reason,extra){const o={ok:false,reason:reason};if(reason==='already')o.notice='已習得此功法';if(extra)Object.assign(o,extra);return o;}
const REASON_ZH={
  already:'已習得此功法','no-unit':'找不到可操作的角色','no-disciple':'請先選擇弟子',
  learning:'這部功法正在參悟中',busy:'正在參悟其他功法，請先完成或取消','target-busy':'該弟子正在參悟其他功法','not-learning':'目前沒有參悟中的功法',
  'flag-off':'功法系統未開啟',client:'請由房主執行此操作',unknown:'找不到這部功法',realm:'境界不足，尚不能學習此功法','no-manual':'沒有可用的功法卷',
  'confirmation-required':'請先確認後再執行','no-econ':'經濟系統未就緒','quote-changed':'借閱報價已變更，請重新確認',operation:'無法執行這個操作',no:'無法完成此操作',
  slot:'技能欄位無效',slots:'輔修欄位已滿','is-main':'已是主修功法',mismatch:'功法不符','not-held':'手中沒有這卷功法','not-learned':'尚未學會此功法',
  'not-learned-active':'尚未解鎖此招式','passive-no-bar':'被動功法不能裝上技能欄','origin-unrecorded':'此卷來源未登記，無法歸還','legacy-origin-unrecorded':'此卷來源未登記，無法歸還',
  'policy-unavailable':'功法閣規則尚未載入','inventory-id-exhausted':'行囊物品編號已用盡',
  wire:'連線異常，已改在本機重試',actor:'目前不能操作這個角色',disconnected:'尚未連上房主','request-conflict':'重複的操作請求','already-processed':'這項操作已經處理過了',
  'journal-capacity':'操作紀錄已滿，請稍後再試','no-result':'沒有回傳結果',
  'no-stock':'館藏已借完','no-slot':'研習席位已滿','no-hall':'需先建成功法閣才能參悟',insufficient:'俸祿不足，付不起借閱費','no-pay':'付款失敗，未能借閱',
  post:'職位不足，無法借閱此品階',contrib:'貢獻度不足，無法借閱此品階','not-borrowed':'尚未借閱此卷','no-loan':'沒有借卷可歸還',
  'no-token':'沒有功法入門憑證','no-id':'缺少功法編號','no-state':'存檔狀態未就緒','no-live':'角色不在場','no-tech':'找不到這項技藝','catalog-not-stock':'此卷不在館藏中','learn-error':'學習時發生錯誤'
};
function reasonText(r){const k=(r&&typeof r==='object')?(r.reason||r.code):r;return REASON_ZH[k]||null;}
function announce(r){
  const zh=reasonText(r);
  const t=r&&r.pending?'等待房主確認':r&&r.ok&&r.learning?'開始參悟（參悟中）':r&&r.ok&&r.cancel?'已取消參悟，卷軸歸還、進度保留':r&&r.ok?'操作完成':(zh||('未完成：'+(r&&(r.reason||r.code)||'unknown')));
  try{CultGF._actionResult=t;}catch(e){}
  try{if(zh)toast(zh);}catch(e){}
  return r;
}
function countInvOf(s,id){
  let n=0;for(const x of s&&s.inv||[]){
    if(!x)continue;
    const gid=x.gfId||parseItemId(x.itemId||'');
    if(gid===id)n+=Math.max(1,x.n|0||1);
  }
  return n;
}

function learn(u,id,src){
  if(!on())return fail('flag-off');
  if(!u)return fail('no-unit');
  if(isClient()&&src!=='sync')return fail('client');
  const row=get(id);if(!row)return fail('unknown');
  migrateUnit(u);
  if(u.gf.learned[id]){try{toast('已習得此功法');}catch(e){}return fail('already',{id:id,notice:'已習得此功法'});}
  if((u.realm|0)<(row.minRealm|0))return fail('realm',{id:id});
  src=src||'bag';
  if(src==='bag'||src==='manual'){
    const fromInv=consumeInvManual(u,id,1);
    if(!fromInv&&!consumeManual(id,1))return fail('no-manual',{id:id});
    if(u.gf.holding.indexOf(id)<0)u.gf.holding.push(id);
    if(!fromInv){u.gf.manualOrigins=u.gf.manualOrigins||{};u.gf.manualOrigins[id]={source:'warehouse'};}
  }
  u.gf.learned[id]={prof:0,tier:0};
  if(row.entry)u.gf.entry=1;
  try{
    const pc=window.Cult&&typeof Cult.isPlayerChar==='function'&&Cult.isPlayerChar(u);
    if(u.kind==='disciple'&&!pc&&!u.np&&src!=='dev')autoPickBar(u);
  }catch(e){}
  emit('cult:gfLearn',{id:id,unitId:u.id,src:src});
  return {ok:true,id:id};
}

function econApi(){try{return (typeof XW_ECON!=='undefined'&&XW_ECON)||window.XW_ECON||null;}catch(e){return null;}}
function isGongfaGeSrc(src){return src==='gongfaGe'||src==='gongfa_ge'||src==='gfge';}
function studySpeedMul(u){
  const wu=((u&&u.wu)||0)*gfAXk(u); // g27 悟性 10～1000 尺度：已換算單位 ×0.1
  const raw=1+wu*GF_CFG.studyWu;
  const cap=1/(GF_CFG.studyMinMul||0.35);
  return Math.min(cap,Math.max(1,raw));
}
function gradeOf(row){
  if(!row)return 'xia';
  if(row.grade==='xia'||row.grade==='zhong'||row.grade==='shang'||row.grade==='ji')return row.grade;
  if(row.tier==='high')return ((row.minRealm|0)>=8)?'ji':'shang';
  if(row.tier==='mid')return 'zhong';
  return 'xia';
}
function toEconRow(row){
  if(!row)return null;
  return Object.assign({},row,{
    id:row.id,name:row.name,realm:row.minRealm|0,grade:gradeOf(row),
    kind:isPassiveRow(row)?'passive':'active',hasActive:!isPassiveRow(row)&&!!(row.ab||(row.unlocks&&row.unlocks.some(function(un){return !!(un&&un.ab);}))),hasPassive:true,school:row.school,tier:row.tier,
    price:row.price,minRealm:row.minRealm,blurb:describe(row),how:howOf(row)
  });
}
function list(){return CATALOG.map(toEconRow);}
function getEcon(id){const r=get(parseItemId(id));return r?toEconRow(r):null;}
// Canonical scroll ownership is boundTo (grant/map_gongfa); never expose another player's copy.
function manualUsable(u,it){return !!(u&&it&&(it.boundTo==null||String(it.boundTo)===String(u.id)));}
function manualCounts(u){const out={};for(const id in bag())if(get(id)&&bag()[id]>0)out[id]=bag()[id];
 const s=getS();for(const it of s&&s.inv||[]){if(!manualUsable(u,it)||!(it.t==='gongfa'||it.type==='gongfa'))continue;const id=parseItemId(it.gfId||it.itemId);if(get(id))out[id]=(out[id]||0)+Math.max(1,it.n|0||1);}return out;}
// Real inventory objects need numeric ids: core applyV045 reserves id+1 for every entry.
// Only repair known gongfa records; never rewrite another module's items or hide a bad JSON save.
function manualItem(it){return !!(it&&(it.t==='gongfa'||it.type==='gongfa'||it.gfId)&&get(parseItemId(it.gfId||it.itemId||it.id)));}
function validInventoryId(id){return Number.isSafeInteger(id)&&id>=0&&id<Number.MAX_SAFE_INTEGER;}
function allocateManualId(s,root){
  if(!s)throw new Error('manual-id-state');
  let next=Number.isSafeInteger(s.nextItem)&&s.nextItem>0?s.nextItem:1;
  const seen=new WeakSet(),ids=new Set();
  function reserve(o){if(!o||typeof o!=='object'||seen.has(o))return;seen.add(o);
    if(Number.isSafeInteger(o.id)&&o.id>=0){ids.add(o.id);next=Math.max(next,o.id+1);}
    for(const k of Object.keys(o))reserve(o[k]);
  }
  reserve(root||s);
  while(ids.has(next))next++;
  if(!validInventoryId(next))throw new Error('manual-id-exhausted');
  s.nextItem=next+1;return next;
}
function reserveManualIds(s,root){
  if(!s||!Array.isArray(s.inv))return;
  const books=s.inv.filter(manualItem);if(!books.length)return;
  for(const it of books){
    if(!validInventoryId(it.id)||s.inv.some(x=>x&&x!==it&&x.id===it.id))it.id=allocateManualId(s,root||s);
    else if(!Number.isSafeInteger(s.nextItem)||s.nextItem<=it.id)s.nextItem=it.id+1;
  }
}
function restoreManual(u,id){const g=u.gf,origin=g.manualOrigins&&g.manualOrigins[id];
 if(origin&&origin.source==='inventory'&&origin.item){const s=getS();s.inv=s.inv||[];const it=JSON.parse(JSON.stringify(origin.item));if(!validInventoryId(it.id)||s.inv.some(x=>x&&x.id===it.id))it.id=allocateManualId(s);else if(!Number.isSafeInteger(s.nextItem)||s.nextItem<=it.id)s.nextItem=it.id+1;s.inv.push(it);}
 else grantManual(id,1);if(g.manualOrigins)delete g.manualOrigins[id];}
function consumeInvManual(u,id,n){
  const s=getS();if(!s||!Array.isArray(s.inv))return false;
  n=Math.max(1,n|0);
  let left=n;
  for(let i=s.inv.length-1;i>=0&&left>0;i--){
    const it=s.inv[i];if(!it)continue;
    const gid=it.gfId||parseItemId(it.itemId||'');
    if(!(it.t==='gongfa'||it.type==='gongfa'||gid))continue;
    if(gid!==id)continue;
    if(!manualUsable(u,it))continue;
    migrateUnit(u);u.gf.manualOrigins=u.gf.manualOrigins||{};u.gf.manualOrigins[id]={source:'inventory',item:JSON.parse(JSON.stringify(Object.assign({},it,{n:1})))};
    const amt=Math.max(1,it.n|0||1);
    if(amt>left){u.gf.manualOrigins[id].item.id=allocateManualId(s);it.n=amt-left;left=0;}
    else{left-=amt;s.inv.splice(i,1);}
  }
  return left===0;
}
function migrateInv(s,root){
  if(!s||!Array.isArray(s.inv))return s;
  for(const it of s.inv){
    if(!it)continue;
    if(!(it.t==='gongfa'||it.type==='gongfa'||it.gfId))continue;
    const id=parseItemId(it.gfId||it.itemId||it.id);
    if(!id||!get(id))continue;
    it.t='gongfa';it.type='gongfa';it.gfId=id;it.itemId=itemId(id);
    it.n=Math.max(1,it.n|0||1);
  }
  reserveManualIds(s,root||s);
  return s;
}
function grant(unit,gfId,src){
  if(!on())return {ok:false,reason:'flag-off'};
  const id=parseItemId(gfId);const row=get(id);
  if(!row)return {ok:false,reason:'unknown'};
  const ref=itemId(id);
  const s=getS();
  const it={t:'gongfa',type:'gongfa',gfId:id,itemId:ref,n:1,q:row.tier==='high'?3:row.tier==='mid'?2:1};
  if(unit&&unit.id!=null)it.boundTo=unit.id;
  if(s&&Array.isArray(s.inv)){
    try{it.id=allocateManualId(s);}catch(e){return {ok:false,reason:'inventory-id-exhausted'};}
    const adder=(typeof addItem==='function')?addItem:(window.XW&&typeof XW.addItem==='function'?XW.addItem:null);
    if(adder){
      try{
        const before=countInvOf(s,id);
        const ok=adder(it,unit&&unit.x,unit&&unit.y);
        if(s.inv.indexOf(it)>=0)return {ok:true,itemRef:ref,via:'S.inv'};
        if(ok!==false&&countInvOf(s,id)>before)return {ok:true,itemRef:ref,via:'S.inv'};
      }catch(e){}
    }
    if(s.inv.indexOf(it)<0)s.inv.push(it);
    return {ok:true,itemRef:ref,via:'S.inv'};
  }
  grantManual(id,1);
  return {ok:true,itemRef:ref,via:'S.gfBag'};
}
function takeInvManual(u,id){
  const st=getS();if(!st||!Array.isArray(st.inv))return false;
  for(let i=st.inv.length-1;i>=0;i--){
    const it=st.inv[i];if(!it)continue;
    const gid=it.gfId||parseItemId(it.itemId||'');
    if(gid!==id)continue;
    if(u&&!manualUsable(u,it))continue;
    const amt=Math.max(1,it.n|0||1);
    if(amt>1)it.n=amt-1;else st.inv.splice(i,1);
    return true;
  }
  return false;
}
function giveManual(fromU,toU,id){
  if(!toU)return fail('no-unit');
  id=parseItemId(id);if(!get(id))return fail('unknown',{id:id});
  if(owned(toU,id)){try{toast('已習得此功法');}catch(e){}return fail('already',{id:id,notice:'已習得此功法'});}
  const st=getS();let it=null;
  for(const x of st&&st.inv||[]){
    if(!x)continue;
    const gid=x.gfId||parseItemId(x.itemId||'');
    if(gid!==id)continue;
    if(fromU&&!manualUsable(fromU,x))continue;
    it=x;break;
  }
  if(!it)return fail('no-manual',{id:id});
  it.boundTo=toU.id;
  return {ok:true,id:id,to:toU.id,itemId:it.id};
}
function sellManual(u,id){
  id=parseItemId(id);
  const row=get(id);if(!row)return fail('unknown',{id:id});
  if(!takeInvManual(u,id)&&!consumeManual(id,1))return fail('no-manual',{id:id});
  const hint=priceHint(id);const xia=(hint&&hint.xia)|0;
  const st=getS();if(st&&!globalThis.__cultStore.add('lingshi',xia,'gfSell')){st.res=st.res||{};st.res.lingshi=(st.res.lingshi||0)+xia;}
  try{toast('出售「'+(row.name||id)+'」，得靈石 '+xia);}catch(e){}
  return {ok:true,id:id,xia:xia};
}
function giveTarget(from){
  try{
    const st=getS();
    if(typeof selUnits!=='undefined'&&selUnits&&selUnits.length){
      for(const id of selUnits){
        const u=(st.units||[]).find(x=>x&&String(x.id)===String(id));
        if(u&&u!==from&&(u.kind==='disciple'||u.kind==='player')&&!u.dead)return u;
      }
    }
    if(typeof bagUnit!=='undefined'&&typeof unitById==='function'){
      const u=unitById(bagUnit);
      if(u&&u!==from&&!u.dead)return u;
    }
  }catch(e){}
  return null;
}
function xwLearn(u,id,src){return learn(u,id,src==null?'trade':src);}

// ---------- gflearn：卷軸學習需時間（參悟中） ----------
function gfLearnOn(){
  try{if(window.CULT_FLAGS&&CULT_FLAGS.gflearn===false)return false;}catch(e){}
  try{const q=globalThis.__cultQS().get('gflearn');if(q==='0'||q==='off'||q==='false')return false;}catch(e){}
  return true;
}
function gfLearnRed(u){const L=GF_CFG.learn;const wu=((u&&u.wu)||0)*gfAXk(u);return Math.min(L.wuCap,Math.max(0,wu*L.wuK));}
function gfLearnBase(id){const r=get(id);if(!r)return 0;const L=GF_CFG.learn;return L.base[gradeOf(r)]||L.base.xia;}
function gfLearnDur(u,id){return Math.round(gfLearnBase(id)*(1-gfLearnRed(u))*10)/10;}
function gfFighting(u){
  if(!u)return false;
  try{if(typeof v46Combat==='function')return !!v46Combat(u);}catch(e){}
  const t=now();return t-(u.lastHit==null?-99:u.lastHit)<=5||t-(u.lastAtk==null?-99:u.lastAtk)<=5;
}
function gfLearnOf(u){const L=u&&u._gfLearn;return (L&&L.id&&get(L.id))?L:null;}
function gfLearnPct(u){const L=gfLearnOf(u);return L?Math.min(100,Math.floor((L.p||0)/Math.max(0.1,L.t||1)*100)):null;}
function beginLearn(u,id,src){
  if(!on())return fail('flag-off');
  if(!u)return fail('no-unit');
  if(isClient()&&src!=='sync')return fail('client');
  id=parseItemId(id);const row=get(id);if(!row)return fail('unknown');
  migrateUnit(u);
  if(u.gf.learned[id]){try{toast('已習得此功法');}catch(e){}return fail('already',{id:id,notice:'已習得此功法'});}
  const cur=gfLearnOf(u);
  if(cur)return fail(cur.id===id?'learning':'busy',{id:id});
  if((u.realm|0)<(row.minRealm|0))return fail('realm',{id:id});
  const fromInv=consumeInvManual(u,id,1);
  if(!fromInv){if(!consumeManual(id,1))return fail('no-manual',{id:id});u.gf.manualOrigins=u.gf.manualOrigins||{};u.gf.manualOrigins[id]={source:'warehouse'};}
  const t=gfLearnDur(u,id);
  let p=0;const K=u._gfLearnKeep;
  if(K&&K[id]!=null){p=Math.max(0,Math.min(t*0.999,+K[id]||0));delete K[id];if(!Object.keys(K).length)delete u._gfLearnKeep;}
  u._gfLearn={id:id,p:p,t:t};
  emit('cult:gfLearnStart',{id:id,unitId:u.id,t:t,p:p,src:src||'bag'});
  try{toast('開始參悟「'+(row.name||id)+'」（約 '+Math.ceil(t-p)+' 秒）');}catch(e){}
  return {ok:true,id:id,learning:true,t:t,p:p};
}
function cancelLearn(u,why){
  const L=gfLearnOf(u);if(!L){if(u&&u._gfLearn)delete u._gfLearn;return fail('not-learning');}
  migrateUnit(u);
  u._gfLearnKeep=u._gfLearnKeep||{};u._gfLearnKeep[L.id]=+L.p||0;
  delete u._gfLearn;
  if(u.gf.manualOrigins&&u.gf.manualOrigins[L.id])restoreManual(u,L.id);else grantManual(L.id,1);
  emit('cult:gfLearnCancel',{id:L.id,unitId:u.id,p:L.p,why:why||'cancel'});
  return {ok:true,id:L.id,cancel:true,p:L.p};
}
function finishLearn(u){
  const L=gfLearnOf(u);if(!L)return;
  delete u._gfLearn;migrateUnit(u);
  const id=L.id,row=get(id);
  if(u.gf.learned[id]){if(u.gf.manualOrigins&&u.gf.manualOrigins[id])restoreManual(u,id);return;}
  u.gf.learned[id]={prof:0,tier:0};
  if(u.gf.holding.indexOf(id)<0)u.gf.holding.push(id);
  if(row&&row.entry)u.gf.entry=1;
  try{const pc=window.Cult&&typeof Cult.isPlayerChar==='function'&&Cult.isPlayerChar(u);if(u.kind==='disciple'&&!pc&&!u.np)autoPickBar(u);}catch(e){}
  emit('cult:gfLearn',{id:id,unitId:u.id,src:'gflearn'});
  try{toast((u.name?u.name+' ':'')+'參悟完成，習得「'+(row?row.name:id)+'」');}catch(e){}
}
function tickLearn(u,dt){
  const L=gfLearnOf(u);if(!L){if(u&&u._gfLearn)delete u._gfLearn;return;}
  if(isClient())return;
  if(gfFighting(u))return; // 戰鬥中暫停
  L.p=(+L.p||0)+Math.max(0,+dt||0);
  if(L.p>=L.t)finishLearn(u);
}

function startStudy(u,ref,src){
  if(!on())return fail('flag-off');
  if(!u)return fail('no-unit');
  if(isClient()&&src!=='sync')return fail('client');
  const id=parseItemId(ref);const row=get(id);if(!row)return fail('unknown');
  migrateUnit(u);
  if(u.gf.learned[id]){try{toast('已習得此功法');}catch(e){}return fail('already',{id:id,notice:'已習得此功法'});}
  if(u.gf.study)return fail('busy');
  if(gfLearnOf(u)&&gfLearnOf(u).id===id)return fail('learning',{id:id});
  if((u.realm|0)<(row.minRealm|0))return fail('realm',{id:id});
  src=src||'warehouse';
  if(isGongfaGeSrc(src)){
    const E=econApi();
    if(E&&typeof E.gfBeginStudy==='function'){
      const er=E.gfBeginStudy(u,id);
      if(!er||!er.ok)return fail((er&&er.reason)||'econ',{econ:er});
      emit('cult:gfStudyStart',{id:id,unitId:u.id,dur:0,via:'econ'});
      return {ok:true,dur:0,id:id,via:'econ',study:er.study};
    }
  }
  if(consumeManual(id,1)){u.gf.manualOrigins=u.gf.manualOrigins||{};u.gf.manualOrigins[id]={source:'warehouse'};}
  else if(!consumeInvManual(u,id,1))return fail('no-manual',{id:id});
  const dur=studyDur(u,id);
  u.gf.study={id:id,t0:now(),dur:dur,held:true,from:src};
  emit('cult:gfStudyStart',{id:id,unitId:u.id,dur:dur});
  return {ok:true,dur:dur,id:id,via:'self'};
}

function studyProgress(u){
  migrateUnit(u);
  const st=u&&u.gf&&u.gf.study;if(!st)return null;
  const left=Math.max(0,st.dur-(now()-st.t0));
  return {id:st.id,t0:st.t0,dur:st.dur,left:left,p:st.dur?Math.min(1,1-left/st.dur):1};
}

function finishStudy(u){
  const st=u.gf.study;if(!st)return;
  const id=st.id;
  if(!u.gf.learned[id])u.gf.learned[id]={prof:0,tier:0};
  if(u.gf.holding.indexOf(id)<0)u.gf.holding.push(id);
  u.gf.study=null;
  const row=get(id);if(row&&row.entry)u.gf.entry=1;
  emit('cult:gfStudyDone',{id:id,unitId:u.id});
}

function holdingIdx(u,id){const h=u.gf.holding||[];return h.indexOf(id);}
function returnManual(u,ref,dest){
  if(!on())return fail('flag-off');
  if(!u)return fail('no-unit');
  if(isClient())return fail('client');
  const id=parseItemId(ref);if(!get(id)&&id){/* still allow return of unknown held? */ }
  if(!get(id))return fail('unknown');
  migrateUnit(u);
  dest=dest==='gongfaGe'?'gongfaGe':'warehouse';
  if(dest==='warehouse'&&!(u.gf.manualOrigins&&u.gf.manualOrigins[id]))return fail('origin-unrecorded',{id:id});
  let reason='return';
  if(u.gf.study&&u.gf.study.id===id){
    u.gf.study=null;reason='interrupt';
  }else{
    const i=holdingIdx(u,id);
    if(i<0&&dest!=='gongfaGe')return fail('not-held',{id:id});
    if(i>=0)u.gf.holding.splice(i,1);
  }
  if(dest==='gongfaGe'){
    const E=econApi();
    if(E&&typeof E.gfReturn==='function'){
      const er=E.gfReturn(u,id,'manual');
      emit('cult:gfStudyReturn',{id:id,unitId:u.id,dest:dest,reason:reason,via:'econ'});
      if(er&&er.ok)return {ok:true,id:id,dest:dest,reason:reason,via:'econ'};
      if(E.gfStore){const st=E.gfStore(null,id,1);if(st&&st.ok!==false)return {ok:true,id:id,dest:dest,reason:reason,via:'econ-store'};}
    }
  }
  restoreManual(u,id);
  emit('cult:gfStudyReturn',{id:id,unitId:u.id,dest:dest,reason:reason});
  return {ok:true,id:id,dest:dest,reason:reason};
}

function returnAll(u,dest,reason){
  migrateUnit(u);
  dest=dest||'warehouse';
  const ids=[];
  if(u.gf.study&&u.gf.study.id){ids.push(u.gf.study.id);u.gf.study=null;}
  for(const id of (u.gf.holding||[]).slice()){ids.push(id);}
  u.gf.holding=[];
  for(const id of ids){if(!(u.gf.manualOrigins&&u.gf.manualOrigins[id])){const s=getS();s.cultGFNet=s.cultGFNet||{v:1,journal:{}};const q=s.cultGFNet.quarantine||(s.cultGFNet.quarantine=[]);if(!q.some(x=>x.unitId===u.id&&x.gfId===id))q.push({unitId:u.id,pk:u.np||s.flags&&s.flags.netOwner||null,gfId:id,reason:'legacy-origin-unrecorded'});continue;}restoreManual(u,id);emit('cult:gfStudyReturn',{id:id,unitId:u.id,dest:dest,reason:reason||'interrupt'});}
  return ids;
}

function maybeEntry(u){
  if(!on()||!u)return {ok:false,reason:'no'};
  migrateUnit(u);
  if(u.gf.entry||owned(u,'zheng_low_01')){u.gf.entry=1;return {ok:false,reason:'already'};}
  const s=getS();
  if((u.realm|0)<3)return {ok:false,reason:'realm'};
  if(!s||!s.items||!(s.items.gongfa>0))return {ok:false,reason:'no-token'};
  const r=learn(u,'zheng_low_01','auto');
  if(r.ok)u.gf.entry=1;
  return r;
}

// 功法主修／輔修裝備（改名 gfEquip／gfUnequip，避免與 g12 裝備穿脫 equip／unequip 同名混淆；對外仍匯出 CultGF.equip／unequip）
function gfEquip(u,id,slot){
  if(!on())return fail('flag-off');
  if(!u)return fail('no-unit');
  if(isClient())return fail('client');
  const row=get(id);if(!row)return fail('unknown');
  migrateUnit(u);
  if(!owned(u,id))return fail('not-learned');
  slot=slot||'main';
  if(slot==='main'){
    if(u.gf.main&&u.gf.main!==id){
      u.gf.pen={t:now()+GF_CFG.switchPenSec,mul:GF_CFG.switchPenMul};
    }
    const ai=u.gf.aux.indexOf(id);if(ai>=0)u.gf.aux.splice(ai,1);
    u.gf.main=id;
    return {ok:true,id:id,slot:'main'};
  }
  if(u.gf.main===id)return fail('is-main');
  const n=slots(u).aux;
  if(u.gf.aux.indexOf(id)>=0)return {ok:true,id:id,slot:'aux'};
  if(u.gf.aux.length>=n)return fail('slots');
  u.gf.aux.push(id);
  return {ok:true,id:id,slot:'aux'};
}

function gfUnequip(u,slot,id){
  if(!on())return fail('flag-off');
  if(!u)return fail('no-unit');
  migrateUnit(u);
  if(slot==='main'){if(id&&u.gf.main!==id)return fail('mismatch');u.gf.main=null;return {ok:true};}
  if(id){const i=u.gf.aux.indexOf(id);if(i>=0)u.gf.aux.splice(i,1);}
  else u.gf.aux=[];
  return {ok:true};
}

function pushFx(out,type,v,src,extra){
  if(!type||!(+v||v===0))return;
  const e={type:type,v:+v||0,src:src||null};
  if(extra)Object.assign(e,extra);
  out.push(e);
}
function collectEffects(u){
  const out=[];
  if(!u)return out;
  migrateUnit(u);
  if(on()){
    const g=u.gf;
    const main=g.main&&get(g.main);
    if(main){
      pushFx(out,'cultMain',main.cult||1,g.main);
      const rec=g.learned[g.main];
      const extra=GF_CFG.profCult[rec?rec.tier:0]||0;
      if(extra)pushFx(out,'profCult',extra,g.main);
    }
    for(const id of (g.aux||[])){
      const row=get(id);if(!row)continue;
      pushFx(out,'auxCult',((row.cult||1)-1)*GF_CFG.auxCult,id);
    }
    if(main){
      for(const id of (g.aux||[])){const row=get(id);if(row&&row.school===main.school){pushFx(out,'sameSchool',GF_CFG.sameSchool,id);break;}}
    }
    if(g.pen&&now()<g.pen.t)pushFx(out,'switchPen',g.pen.mul||1,'pen');
    const equipped=equippedIds(u);
    function takeSkill(s){
      if(!s)return;
      if(s.source==='learned'&&!s.equipped&&s.kind!=='passive'){/* unequipped actives: combat fx only if on bar or equipped */}
      const applyCombat=!(s.source==='learned')||s.equipped||s.kind==='passive';
      if(applyCombat&&s.dr)pushFx(out,'dmgRed',s.dr,s.id);
      if(Array.isArray(s.effects)){
        for(const fx of s.effects){
          if(!fx||!fx.type)continue;
          if(!condMet(u,fx.when))continue;
          if(fx.type==='cultMain'||fx.type==='profCult'||fx.type==='auxCult'||fx.type==='sameSchool'||fx.type==='switchPen')continue;
          if(fx.type==='dmgRed'&&!applyCombat)continue;
          pushFx(out,fx.type,fx.v,s.id,fx.when?{when:fx.when}:null);
        }
      }
    }
    for(const s of innateSkills(u))takeSkill(s);
    for(const s of learnedSkills(u))takeSkill(s);
    for(const id of equipped){
      const row=get(id);if(!row)continue;
      /* 已學會的戰鬥效果由 learnedSkills／takeSkill 套用，此處只補未列入技能模型的列上減傷（且避開重複） */
      if(row.dr&&!(g.learned&&g.learned[id]))pushFx(out,'dmgRed',row.dr,id);
    }
  }
  return out;
}
function stackEffects(effects){
  const sum={};
  for(const e of effects||[]){
    if(!e||!e.type)continue;
    sum[e.type]=(sum[e.type]||0)+(+e.v||0);
  }
  return sum;
}
function foldCult(sum){
  let m=1;
  if(sum.cultMain)m*=sum.cultMain;
  if(sum.profCult)m*=1+sum.profCult;
  if(sum.auxCult)m+=sum.auxCult;
  if(sum.sameSchool)m*=1+sum.sameSchool;
  if(sum.switchPen)m*=sum.switchPen;
  const cap=capOf('cultMul');
  if(m>cap)m=cap;
  if(m<0.01)m=0.01;
  return m;
}
function mul(u){
  if(!on()||!u)return 1;
  return foldCult(stackEffects(collectEffects(u)));
}
function dmgRedOf(u){
  if(!on()||!u)return 0;
  let dr=stackEffects(collectEffects(u)).dmgRed||0;
  const cap=capOf('dmgRed');
  if(dr>cap)dr=cap;
  if(dr<0)dr=0;
  return dr;
}
function scaleIncoming(u,amt){
  const dr=dmgRedOf(u);
  if(dr>0)amt=(+amt||0)*(1-dr);
  return amt;
}
let _origDmgUnit=null;
function gfDmgUnit(src,u,amt){
  if(on()&&u&&amt>0)amt=scaleIncoming(u,amt);
  if(_origDmgUnit)return _origDmgUnit(src,u,amt);
  if(!u||u.dead)return;
  if(u.shield>0){const a=Math.min(u.shield,amt);u.shield-=a;amt-=a;}
  if(amt<=0)return;
  u.hp-=amt;
  const s=getS();if(s)u.lastHit=s.time;
  return amt;
}
function healUnit(u,amt){
  if(!u||!(+amt>0))return 0;
  const before=+u.hp||0;
  const next=before+(+amt||0);
  u.hp=(u.maxhp!=null)?Math.min(u.maxhp,next):next;
  return u.hp-before;
}

function unlockedAbs(u,id){
  const row=get(id);if(!row)return [];
  const rec=recOf(u,id);const t=rec?rec.tier:0;
  const out=[];
  if(row.ab)out.push(row.ab);
  if(row.unlocks)for(const un of row.unlocks)if((un.at|0)<=t&&un.ab)out.push(un.ab);
  return out;
}
function grantsAb(u,ab){
  if(!on()||!u||!ab)return false;
  migrateUnit(u);
  if(u.gf.main&&unlockedAbs(u,u.gf.main).indexOf(ab)>=0)return true;
  const bar=u.gf.bar||[];
  if(bar.indexOf(ab)<0)return false;
  for(const id in (u.gf.learned||{})){if(unlockedAbs(u,id).indexOf(ab)>=0)return true;}
  return false;
}

const AB_KIND={charge:'active',sweep:'active',fireball:'active',flysword:'active',jindan:'active',guard:'passive'};
const AB_META={
  charge:{n:'衝鋒',cd:8,desc:'衝向 5 格內的敵人（貼身時直接撞擊），造成 1.6 倍傷害並擊暈'},
  sweep:{n:'橫掃',cd:10,desc:'掃擊身邊所有敵人（1.2 倍傷害）'},
  guard:{n:'氣勁護體',cd:25,desc:'氣血低於 65% 時張開護盾，吸收 40% 氣血上限的傷害'},
  fireball:{n:'御氣・火球',cd:4,desc:'對 6 格內的敵人射出火球（2.2 倍傷害，小範圍波及）'},
  flysword:{n:'御劍術',cd:5,desc:'祭出飛劍刺向 8 格內的敵人（3 倍傷害）'},
  jindan:{n:'金丹威壓',cd:12,desc:'震懾身邊 2.5 格內所有敵人（2.5 倍傷害並擊暈）'}
};
const REALM_ABS_FALLBACK=[
  {n:'武徒'},{n:'武師',ab:'charge'},{n:'大武師',ab:'sweep'},{n:'宗師',ab:'guard'},
  {n:'煉氣',ab:'fireball'},{n:'築基',ab:'flysword'},{n:'金丹',ab:'jindan'}
];
const innateSources=[];
function realmTable(){
  const RS=(typeof REALMS!=='undefined'&&REALMS)||(window.XW&&XW.REALMS)||window.REALMS;
  return (RS&&RS.length)?RS:REALM_ABS_FALLBACK;
}
function abilOf(ab){
  const A=(typeof ABIL!=='undefined'&&ABIL&&ABIL[ab])||(window.XW&&XW.ABIL&&XW.ABIL[ab])||(window.ABIL&&window.ABIL[ab])||AB_META[ab]||null;
  return A;
}
function gfFlagOff(k){
  try{if(window.CULT_FLAGS&&CULT_FLAGS[k]===false)return true;}catch(e){}
  try{const q=globalThis.__cultQS().get(k);if(q==='0'||q==='off'||q==='false')return true;}catch(e){}
  return false;
}
// caiweiya：威壓顯示名／說明改由 g1 abilName／abilDesc 依施放者境界取（只影響顯示，傷害仍由 g1 abilMul 決定）；?caiweiya=0 退回舊寫死文字
function abInfo(ab,u){
  const A=abilOf(ab);
  const kind=AB_KIND[ab]||((A&&A.cd!=null)?'active':'passive');
  let name=(A&&(A.n||A.name))||ab,desc=A?A.desc:undefined;
  if(ab==='jindan'&&u&&!gfFlagOff('caiweiya')){
    try{if(typeof abilName==='function'){const n=abilName(u,ab);if(n)name=n;}}catch(e){}
    try{if(typeof abilDesc==='function'){const d=abilDesc(u,ab);if(d)desc=d;}}catch(e){}
  }
  return {ab:ab,name:name,cd:A?A.cd:undefined,desc:desc,kind:kind};
}
function skillKind(ab){return abInfo(ab).kind;}
function makeInnateAbSkill(ab,realm,u){
  const info=abInfo(ab,u);
  return {id:ab,name:info.name,source:'innate',kind:info.kind,ab:ab,cd:info.kind==='active'?info.cd:undefined,unlocked:true,tier:null,realm:realm,desc:info.desc};
}
function normalizeInnate(s){
  if(!s||typeof s!=='object')return null;
  const info=s.ab?abInfo(s.ab):{};
  const kind=(s.kind||info.kind||'passive')==='active'?'active':'passive';
  const o={id:s.id||s.ab||s.name,name:s.name||info.name||s.id,source:'innate',kind:kind,ab:s.ab,gfId:s.gfId,cd:kind==='active'?(s.cd!=null?s.cd:info.cd):undefined,unlocked:s.unlocked!==false,tier:s.tier==null?null:s.tier,desc:s.desc||info.desc};
  if(s.dr)o.dr=s.dr;
  if(Array.isArray(s.effects))o.effects=s.effects;
  return o;
}
function innateSkills(u){
  const out=[];
  if(u){
    const RS=realmTable();
    const realm=u.realm|0;
    for(let r=1;r<=realm;r++){
      const R=RS[r];
      if(R&&R.ab)out.push(makeInnateAbSkill(R.ab,r,u));
    }
  }
  for(const src of innateSources){
    try{
      const extra=typeof src==='function'?src(u):src;
      if(Array.isArray(extra))for(const s of extra){const n=normalizeInnate(s);if(n)out.push(n);}
    }catch(e){}
  }
  return out;
}
function equippedIds(u){
  migrateUnit(u);
  const ids=[];
  if(u&&u.gf){
    if(u.gf.main)ids.push(u.gf.main);
    if(u.gf.aux)for(const id of u.gf.aux)if(id&&ids.indexOf(id)<0)ids.push(id);
  }
  return ids;
}
function makeLearnedActive(row,rec,ab,needTier,eq,u){
  const info=abInfo(ab,u);
  const tier=rec?rec.tier:0;
  return {id:'gf:'+row.id+':'+ab,name:(row.name||row.id)+'・'+(info.name||ab),source:'learned',kind:'active',gfId:row.id,ab:ab,cd:info.cd,unlocked:(tier|0)>=(needTier|0),equipped:!!eq,tier:tier,needTier:needTier|0,desc:info.desc};
}
function learnedSkills(u){
  migrateUnit(u);
  if(!u||!u.gf||!u.gf.learned)return [];
  const out=[];
  const eqSet={};for(const id of equippedIds(u))eqSet[id]=1;
  for(const id in u.gf.learned){
    const row=get(id)||{id:id,name:id,cult:1};
    const rec=u.gf.learned[id]||{prof:0,tier:0};
    const eq=!!eqSet[id];
    const pass={id:'gf:'+id+':cult',name:(row.name||id)+'・修煉',source:'learned',kind:'passive',gfId:id,unlocked:true,equipped:eq,tier:rec.tier,cult:row.cult,profBonus:GF_CFG.profCult[rec.tier]||0,desc:row.desc};
    const cfx=rowCombatEffects(row);
    if(cfx.length)pass.effects=cfx;
    if(row.dr)pass.dr=row.dr;
    out.push(pass);
    if(!isPassiveRow(row)){
      if(row.ab)out.push(makeLearnedActive(row,rec,row.ab,0,eq,u));
      if(row.unlocks)for(const un of row.unlocks)if(un&&un.ab)out.push(makeLearnedActive(row,rec,un.ab,un.at|0,eq,u));
    }
  }
  return out;
}
function skillsByGroup(u){
  const g={innate:{active:[],passive:[]},learned:{active:[],passive:[]}};
  for(const s of innateSkills(u))(s.kind==='active'?g.innate.active:g.innate.passive).push(s);
  for(const s of learnedSkills(u))(s.kind==='active'?g.learned.active:g.learned.passive).push(s);
  return g;
}
function allAbilities(u){
  const out=[];
  function add(ab){if(ab&&out.indexOf(ab)<0)out.push(ab);}
  for(const s of innateSkills(u))add(s.ab||(s.kind==='active'?s.id:null));
  migrateUnit(u);
  if(on()&&u&&u.gf&&u.gf.main)for(const ab of unlockedAbs(u,u.gf.main))add(ab);
  return out;
}
let _origHasAb=null;
function realmHasAb(u,ab){
  if(!u||!ab)return false;
  const RS=realmTable();
  for(let r=1;r<=(u.realm|0);r++)if(RS[r]&&RS[r].ab===ab)return true;
  return false;
}
function queryHasAb(u,ab){
  if(!ab)return false;
  if(_origHasAb){try{if(_origHasAb(u,ab))return true;}catch(e){}}
  else if(realmHasAb(u,ab))return true;
  return grantsAb(u,ab);
}

function rollDrop(opt){
  opt=opt||{};
  const rng=opt.rng||Math.random;
  const realm=opt.realm==null?99:opt.realm;
  const list=CATALOG.filter(r=>(r.minRealm|0)<=realm&&(!opt.school||r.school===opt.school));
  if(!list.length)return null;
  return list[Math.floor(rng()*list.length)%list.length].id;
}

function schoolOf(u){migrateUnit(u);const r=u&&u.gf&&u.gf.main&&get(u.gf.main);return r?r.school:null;}
function counters(a,b){const sa=schoolOf(a),sb=schoolOf(b);return !!(sa&&sb&&COUNTER[sa]===sb);}

function gfTick(dt){
  if(!on())return;
  const s=getS();if(!s||!s.units)return;
  if(s.flags)s.flags.gf=s.flags.gf||{v:GF_CFG.saveVer};
  for(const u of s.units){
    if(!u)continue;
    migrateUnit(u);
    if(u.dead){if(u._gfLearn)cancelLearn(u,'death');if(u.gf.study||(u.gf.holding&&u.gf.holding.length))returnAll(u,'warehouse','death');continue;}
    if(u._gfLearn)tickLearn(u,dt);
    if(u.gf.pen&&now()>=u.gf.pen.t)u.gf.pen=null;
    if(u.gf.study){
      const p=studyProgress(u);
      if(p&&p.left<=0)finishStudy(u);
    }
    if(u.gf.main&&u.gf.learned[u.gf.main])addProf(u,u.gf.main,GF_CFG.profPerSec*(dt||0));
    try{
      const pc=window.Cult&&typeof Cult.isPlayerChar==='function'&&Cult.isPlayerChar(u);
      if(u.kind==='disciple'&&!pc&&!u.np){
        const filled=(u.gf.bar||[]).some(Boolean);
        if(!filled)autoPickBar(u);
      }
    }catch(e2){}
    maybeEntry(u);
  }
}

function plainCult(mul){
  const m=+mul||1;
  const pct=Math.round((m-1)*100);
  if(!pct)return '修煉速度不變';
  return '修煉速度 '+(pct>0?'+':'')+pct+'%';
}
function qiCostOf(ab){
  try{
    const T=(typeof TUNE!=='undefined'&&TUNE&&TUNE.v49)||(window.TUNE&&window.TUNE.v49)||{};
    if(ab==='sp')return T.spellCost||80;
    if(T.abCost&&T.abCost[ab]!=null)return T.abCost[ab];
  }catch(e){}
  const fb={charge:0,sweep:0,fireball:30,flysword:60,jindan:120};
  return fb[ab]||0;
}
function abQi(ab){
  try{if(typeof qiCostOf==='function'){const v=qiCostOf(ab);if(v!=null&&isFinite(+v))return +v;}}catch(e){}
  return 0;
}
function qiLabel(ab,style){
  const qi=abQi(ab);
  if(!(qi>0))return '不耗靈氣';
  return (style==='qi'?'靈氣 ':'靈力 ')+qi;
}
function cdOf(ab){const info=abInfo(ab);return info&&info.cd!=null?info.cd:undefined;}
function howOf(row){
  if(!row)return '可在坊市、功法閣借閱，或於秘境與出行機緣中求得秘本。';
  if(row.how)return row.how;
  if(row.entry)return '宗門持有功法卷、且已達宗師時，可自動領悟這門入門功法。';
  return '可在坊市求購、功法閣借閱，或於秘境、出行機緣中求得秘本。';
}
function isPassiveRow(row){
  if(!row)return false;
  if(row.kind==='passive')return true;
  if(row.kind==='active')return false;
  const hasAb=!!(row.ab||(row.unlocks&&row.unlocks.some(function(un){return !!(un&&un.ab);})));
  return !hasAb;
}
function hpRatio(u){
  const mx=+(u&&u.maxhp||0);
  if(!(mx>0))return 1;
  return Math.max(0,(+u.hp||0)/mx);
}
function qiRatio(u){
  const mx=+(u&&((u.qiMax!=null?u.qiMax:u.maxqi)||0));
  if(!(mx>0))return 0;
  return Math.max(0,Math.min(1,(+u.qi||0)/mx));
}
function condMet(u,when){
  if(!when)return true;
  if(!u)return false;
  const hr=hpRatio(u),qr=qiRatio(u);
  if(when.hpLt!=null&&!(hr<+when.hpLt))return false;
  if(when.hpLte!=null&&!(hr<=+when.hpLte))return false;
  if(when.hpGt!=null&&!(hr>+when.hpGt))return false;
  if(when.hpGte!=null&&!(hr>=+when.hpGte))return false;
  if(when.qiFull||when.qiGte===1||when.qiGte===1.0){
    const need=(when.qiGte!=null&&when.qiGte!==1&&when.qiGte!==1.0)?+when.qiGte:0.999;
    if(qiRatio(u)<=0&&!(u&&(u.qiMax>0||u.maxqi>0)))return false;
    if(!(qr>=need))return false;
  }else if(when.qiGte!=null&&!(qr>=+when.qiGte))return false;
  if(when.qiLt!=null){
    if(!(u&&(u.qiMax>0||u.maxqi>0)))return false;
    if(!(qr<+when.qiLt))return false;
  }
  if(when.qiLte!=null){
    if(!(u&&(u.qiMax>0||u.maxqi>0)))return false;
    if(!(qr<=+when.qiLte))return false;
  }
  return true;
}
function rowCombatEffects(row){
  const out=[];
  if(!row)return out;
  if(Array.isArray(row.effects)){
    for(let i=0;i<row.effects.length;i++){
      const e=row.effects[i];
      if(e&&e.type)out.push(e);
    }
  }
  if(row.cond){
    const c=row.cond,when={};
    if(c.hpLt!=null)when.hpLt=+c.hpLt;
    if(c.hpLte!=null)when.hpLte=+c.hpLte;
    if(c.hpGt!=null)when.hpGt=+c.hpGt;
    if(c.hpGte!=null)when.hpGte=+c.hpGte;
    if(c.qiLt!=null)when.qiLt=+c.qiLt;
    if(c.qiLte!=null)when.qiLte=+c.qiLte;
    if(c.qiGte!=null)when.qiGte=+c.qiGte;
    if(c.qiFull)when.qiFull=true;
    if(c.atk)out.push({type:'atkMul',v:+c.atk,when:when});
    if(c.spd)out.push({type:'spdMul',v:+c.spd,when:when});
    if(c.dmgRed!=null||c.dr!=null)out.push({type:'dmgRed',v:+(c.dmgRed!=null?c.dmgRed:c.dr),when:when});
  }
  return out;
}
function plainPct(v){
  const p=Math.round((+v||0)*100);
  return (p>0?'+':'')+p+'%';
}
function effectPhrase(fx){
  if(!fx||!fx.type)return '';
  if(fx.type==='atkMul')return '攻擊 '+plainPct(fx.v);
  if(fx.type==='spdMul')return '移動速度 '+plainPct(fx.v);
  if(fx.type==='dmgRed')return '受到傷害減少 '+Math.round((+fx.v||0)*100)+'%';
  return '';
}
function whenPhrase(when){
  if(!when)return '';
  if(when.hpLt!=null)return '血量低於 '+Math.round(+when.hpLt*100)+'% 時';
  if(when.hpLte!=null)return '血量不高於 '+Math.round(+when.hpLte*100)+'% 時';
  if(when.hpGt!=null)return '血量高於 '+Math.round(+when.hpGt*100)+'% 時';
  if(when.hpGte!=null)return '血量不少於 '+Math.round(+when.hpGte*100)+'% 時';
  if(when.qiFull||when.qiGte===1||when.qiGte===1.0)return '靈力全滿時';
  if(when.qiGte!=null)return '靈力不少於 '+Math.round(+when.qiGte*100)+'% 時';
  if(when.qiLt!=null)return '靈力低於 '+Math.round(+when.qiLt*100)+'% 時';
  if(when.qiLte!=null)return '靈力不高於 '+Math.round(+when.qiLte*100)+'% 時';
  return '';
}
function condLine(fx){
  const ef=effectPhrase(fx);if(!ef)return '';
  const wh=whenPhrase(fx.when);
  return wh?wh+'，'+ef:('學會後，'+ef);
}
function describe(ref,u){
  const id=(ref&&typeof ref==='object')?ref.id:ref;
  const row=(ref&&typeof ref==='object'&&ref.name)?ref:get(id);
  if(!row)return '';
  const sc=schoolName(row.school);
  const tier=((typeof GF_TIERS!=='undefined'?GF_TIERS:window.GF_TIERS)||{})[row.tier];
  const tierN=tier&&tier.n?tier.n:(row.tier==='high'?'高階神通':row.tier==='mid'?'中階功法':'低階功法');
  const lines=[];
  lines.push((row.name||id)+'（'+sc+'派・'+tierN+'）');
  if(row.desc)lines.push(row.desc);
  lines.push('效果：'+plainCult(row.cult||1)+'（主修享全部；輔修大約三成五）。');
  const fx=rowCombatEffects(row);
  for(let i=0;i<fx.length;i++){
    const line=condLine(fx[i]);
    if(line)lines.push(line+'。');
  }
  if(isPassiveRow(row)){
    lines.push('主修：完整享受修煉加成；輔修：不佔技能欄，只得部分修煉加成。');
    lines.push('被動：學會後即永久生效，沒有可施放招式，不必放進技能欄。');
  }else{
    lines.push('主修：完整享受修煉加成，並把這門招式視為已備；輔修：不佔技能欄，只得部分修煉加成。');
    lines.push('被動：學會後即永久生效，不必放進技能欄。');
    const abs=[];
    if(row.ab)abs.push(row.ab);
    if(row.unlocks)for(const un of row.unlocks)if(un&&un.ab)abs.push(un.ab);
    if(abs.length){
      const bits=abs.map(function(ab){
        const info=abInfo(ab,u);
        const qi=qiCostOf(ab),cd=info.cd;
        let t=info.name||ab;
        if(info.kind==='active'){
          t+='，'+qiLabel(ab);
          if(cd!=null)t+='，冷卻 '+cd+' 秒';
        }else t+='（被動）';
        if(info.desc)t+='。'+info.desc;
        return t;
      });
      lines.push('招式：'+bits.join('；'));
    }
  }
  lines.push('取得：'+howOf(row));
  return lines.join('\n');
}
function combatAtkMul(u){
  if(!on()||!u)return 1;
  let m=1;
  const fx=collectEffects(u);
  for(let i=0;i<fx.length;i++)if(fx[i]&&fx[i].type==='atkMul')m*=(1+(+fx[i].v||0));
  if(m<0.01)m=0.01;
  return m;
}
function combatSpdMul(u){
  if(!on()||!u)return 1;
  let m=1;
  const fx=collectEffects(u);
  for(let i=0;i<fx.length;i++)if(fx[i]&&fx[i].type==='spdMul')m*=(1+(+fx[i].v||0));
  if(m<0.01)m=0.01;
  return m;
}
function tipHtml(ref,u){
  return htmlEsc(describe(ref,u)).replace(/\n/g,'<br>');
}
function barOf(u){
  migrateUnit(u);
  return (u&&u.gf&&u.gf.bar)||[];
}
function equipBar(u,ab,slot){
  if(isClient())return fail('client');
  if(!on())return fail('flag-off');
  if(!u||!ab)return fail('no');
  const asRow=get(ab);
  if(asRow&&isPassiveRow(asRow))return fail('passive-no-bar');
  if(!activeIds(u).includes(ab))return fail('not-learned-active');
  migrateUnit(u);
  const n=GF_CFG.barSlots||5;
  let i=slot;
  if(i==null||i<0||i>=n){
    i=u.gf.bar.indexOf(null);
    if(i<0)i=0;
  }
  const prev=u.gf.bar.indexOf(ab);
  if(prev>=0&&prev!==i){u.gf.bar[prev]=u.gf.bar[i];}
  u.gf.bar[i]=ab;
  return {ok:true,ab:ab,slot:i,bar:u.gf.bar.slice()};
}
function unequipBar(u,slot){
  if(isClient())return fail('client');
  if(!u)return fail('no-unit');
  migrateUnit(u);
  if(slot==null){u.gf.bar=u.gf.bar.map(function(){return null;});return {ok:true};}
  if(slot>=0&&slot<u.gf.bar.length)u.gf.bar[slot]=null;
  return {ok:true,bar:u.gf.bar.slice()};
}
function knownActives(u){
  const out=[],seen={};
  for(const s of learnedSkills(u)){
    if(s.kind!=='active'||!s.ab||!s.unlocked)continue;
    if(seen[s.ab])continue;seen[s.ab]=1;
    out.push(s);
  }
  for(const s of innateSkills(u)){
    if(s.kind!=='active'||!s.ab)continue;
    if(seen[s.ab])continue;seen[s.ab]=1;
    out.push(s);
  }
  return out;
}
function activeIds(u){const ids=knownActives(u).map(s=>s.ab);if(u&&(u.realm|0)>=4&&u.lg)ids.push('sp');return [...new Set(ids)];}
function libraryQuote(u,id){const E=econApi(),tech=E&&E.gfGet&&E.gfGet(id);
 if(!E||!tech||typeof E.gfCanAccess!=='function'||typeof econIsPlayerUnit!=='function'||typeof ECON_GF_TUNE==='undefined')return fail('policy-unavailable');
 const access=E.gfCanAccess(u,tech);if(!access.ok)return access;
 // PC exemption, disciple fee and duration are existing econ rules (econGfBorrow/econFeeCharge), not new fees or eligibility.
 if(!(ECON_GF_TUNE.borrowSec>0))return fail('policy-unavailable');
 const f=libraryFee(u,tech);
 return {ok:true,fee:f.fee,cur:f.cur,free:f.free,seconds:ECON_GF_TUNE.borrowSec};
}
// 借閱費試算：與 econGfBorrow 實扣同一公式（宗主 pc 免付；弟子 econFeeResolvedAmt('gfBorrow', 公式價÷基價)）。只讀，不扣款。
function libraryFee(u,tech){
 try{if(typeof econIsPlayerUnit==='function'&&econIsPlayerUnit(u))return {fee:0,cur:'lingshi',free:true};}catch(e){}
 const E=econApi();tech=typeof tech==='object'&&tech?tech:(E&&E.gfGet?E.gfGet(tech):null);
 if(!E||!tech)return {fee:0,cur:'lingshi',free:false,unknown:true};
 const formula=+E.gfPrice(tech,'borrow')||0;
 try{
  if(typeof econFeeResolvedAmt==='function'&&typeof econFeeGet==='function'&&typeof econFeeCharge==='function'){
   try{if(typeof econFeeRegisterDefaults==='function')econFeeRegisterDefaults();}catch(e0){}
   const rec=econFeeGet('gfBorrow');
   const base=(rec&&rec.defAmt>0)?rec.defAmt:((typeof ECON_GF_TUNE!=='undefined'&&ECON_GF_TUNE.borrowBaseXia)||8);
   const r=econFeeResolvedAmt('gfBorrow',base>0?(formula/base):1,u);
   return {fee:+r.amt||0,cur:(r.f&&r.f.cur)||'lingshi',free:!(r.amt>0)};
  }
 }catch(e){}
 return {fee:formula,cur:'lingshi',free:!(formula>0)};
}
function performAction(u,i){if(isClient())return fail('client');
 if(!u&&i&&(i.op==='learn'||i.op==='learnCancel')){try{u=(typeof player==='function'&&player())||(window.XW&&XW.player&&XW.player())||null;}catch(e){}}
 if(!u||!i)return fail('no-unit');
 if(i.op==='bar'){
  if(!Number.isInteger(i.slot)||i.slot<0||i.slot>=5)return fail('slot');
  const r=i.ab==null?unequipBar(u,i.slot):equipBar(u,i.ab,i.slot);if(r.ok){const seen=new Set(),allowed=new Set(activeIds(u)),order=[i.slot,...[0,1,2,3,4].filter(x=>x!==i.slot)];for(const j of order){const ab=u.gf.bar[j];if(!ab||!allowed.has(ab)||seen.has(ab))u.gf.bar[j]=null;else seen.add(ab);}u.gf.barConfigured=true;r.bar=u.gf.bar.slice();}return r;
 }
 if(i.op==='learn'){const src=i.src||'bag';if(gfLearnOn()&&(src==='bag'||src==='manual'))return beginLearn(u,i.gfId,src);return learn(u,i.gfId,src);}
 if(i.op==='learnCancel')return cancelLearn(u,'cancel');
 if(i.op==='give'){
  const st=getS();const to=i.to!=null?(st.units||[]).find(x=>x&&String(x.id)===String(i.to)):giveTarget(u);
  if(!to)return fail('no-disciple');
  if(gfLearnOn()){const tl=gfLearnOf(to);if(tl)return fail(tl.id===parseItemId(i.gfId)?'learning':'target-busy');}
  const g=giveManual(u,to,i.gfId);if(!g.ok)return g;
  if(to&&!owned(to,i.gfId))return gfLearnOn()?beginLearn(to,i.gfId,'bag'):learn(to,i.gfId,'bag');
  return g;
 }
 if(i.op==='sell')return sellManual(u,i.gfId);
 if(i.op==='study'){if(i.confirm!==true)return fail('confirmation-required');return startStudy(u,i.gfId,'warehouse');}
 const E=econApi();if(!E)return fail('no-econ');
 if(i.op==='borrow'){if(i.confirm!==true)return fail('confirmation-required');const q=libraryQuote(u,i.gfId);if(!q.ok)return q;
  if(i.seconds!==q.seconds||i.fee!==q.fee)return fail('quote-changed');return E.gfBorrow(u,i.gfId);}
 if(i.op==='libraryStudy')return E.gfBeginStudy(u,i.gfId);
 if(i.op==='return')return i.source==='library'?E.gfReturn(u,i.gfId,'manual'):returnManual(u,i.gfId,'warehouse');
 return fail('operation');
}
function sendAction(u,i){
  let r;
  i=i||{};
  // 未選角色：學習／取消參悟預設主角（bagActor→主角）；傳授沒有對象→「請先選擇弟子」，不再出現「未完成：no-unit」。
  if(!u&&(i.op==='learn'||i.op==='learnCancel'||i.op==='give'||i.op==='sell'))u=bagActor();
  if(!u)return announce(fail('no-unit'));
  if(i.op==='give'&&i.to==null){const to=giveTarget(u);if(!to)return announce(fail('no-disciple'));i=Object.assign({},i,{to:to.id});}
  if(window.CultGFNet&&(u.kind==='player'||u.np||isClient())){
    r=CultGFNet.request(u,i);
    if(r&&r.reason==='wire'&&!isClient())r=performAction(u,i);
  }else r=performAction(u,i);
  return announce(r);
}
function autoPickBar(u){
  if(!u)return [];
  if(isClient())return barOf(u).slice();
  migrateUnit(u);
  const n=GF_CFG.barSlots||5;
  const acts=knownActives(u);
  const picked=[];
  for(const s of acts){
    if(picked.indexOf(s.ab)>=0)continue;
    picked.push(s.ab);
    if(picked.length>=n)break;
  }
  while(picked.length<n)picked.push(null);
  u.gf.bar=picked.slice(0,n);
  return u.gf.bar.slice();
}
function htmlEsc(s){return String(s==null?'':s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));}
function schoolName(sc){const m=(typeof GF_SCHOOLS!=='undefined'?GF_SCHOOLS:window.GF_SCHOOLS)||{};return (m[sc]&&m[sc].n)||sc;}
function bagActor(){
  try{
    if(typeof bagUnit!=='undefined'&&bagUnit!=null&&typeof unitById==='function'){
      const u=unitById(bagUnit);if(u&&!u.dead)return u;
    }
  }catch(e){}
  try{if(typeof player==='function'){const p=player();if(p&&!p.dead)return p;}}catch(e){}
  try{if(window.XW&&typeof XW.player==='function'){const p=XW.player();if(p&&!p.dead)return p;}}catch(e){}
  return selUnit();
}
function selOtherOrBld(){
  try{if(typeof selOther!=='undefined'&&selOther)return true;}catch(e){}
  try{if(typeof selBuilding!=='undefined'&&selBuilding!=null)return true;}catch(e2){}
  return false;
}
function selAllyUnit(){
  try{
    const ids=(typeof selUnits!=='undefined')?selUnits:((window.XW&&XW.sel)||window.selUnits);
    const st=getS();
    if(ids&&ids.length&&st&&st.units){
      const u=st.units.find(x=>x&&x.id===ids[0]);
      if(u&&(u.kind==='player'||u.kind==='disciple'))return u;
    }
  }catch(e){}
  return null;
}
function playerUnit(){
  try{if(typeof player==='function'){const p=player();if(p)return p;}}catch(e){}
  try{if(window.XW&&typeof XW.player==='function'){const p=XW.player();if(p)return p;}}catch(e2){}
  return null;
}
function selUnit(){
  try{
    // 選到敵人／建築／資源時不退回主角，避免 paintPanel 把 #gf_sec 插進他人 #panel
    if(selOtherOrBld())return null;
    const u=selAllyUnit();
    if(u)return u;
    // 僅在功法抽屜開啟、且未選他人時，才退回主角（開啟抽屜／無選取學習）
    if(typeof CultGF!=='undefined'&&CultGF._panelOpen)return playerUnit();
  }catch(e){}
  return null;
}
function fmtSkillNames(arr){
  if(!arr||!arr.length)return '（無）';
  return arr.map(s=>{
    let t=s.name;
    if(s.source==='learned'&&s.tier!=null)t+='（'+profName(s.tier)+'）';
    if(s.kind==='active'&&s.cd!=null)t+=' CD'+s.cd;
    if(s.kind==='passive'&&s.cult)t+=' '+plainCult(s.cult);
    if(s.source==='learned'&&s.equipped)t+=' ·已裝備';
    if(s.source==='learned'&&s.kind==='active'&&!s.unlocked)t+=' ·未解鎖';
    return t;
  }).join('、');
}
function panelHtml(u){
  migrateUnit(u);
  const g=u.gf,row=g.main&&get(g.main);
  const sl=slots(u);
  const grp=skillsByGroup(u);
  let h='<div class="sec" id="'+(CultGF._panelOpen?'gf_drawer_sec':'gf_sec')+'">';
  const cf=CultGF._confirmUI;if(cf&&cf.unitId===u.id){h+=`<p class="mini">確認${cf.op==='study'?'暫取1卷參悟（可歸還）':'借閱：'+libFeeText(cf)+'／期限 '+cf.seconds+'秒'}「${htmlEsc(get(cf.gfId).name)}」？</p><button class="btn" data-gf="confirmStudy">確認</button><button class="btn" data-gf="cancelStudy">取消</button>`;}
  h+='<div id="gf_innate"><b>固有技能</b>';
  h+=`<div class="mini" data-gf-sub="innate-active">主動：${htmlEsc(fmtSkillNames(grp.innate.active))}</div>`;
  h+=`<div class="mini" data-gf-sub="innate-passive">被動：${htmlEsc(fmtSkillNames(grp.innate.passive))}</div></div>`;
  h+='<div id="gf_learned"><b>學習技能</b>';
  const gl=gfLearnOf(u);
  if(gl){const rowL=get(gl.id);
    h+=`<div class="mini" data-gf-sub="learning">參悟中「${htmlEsc(rowL?rowL.name:gl.id)}」 <span data-gf-live="gflearn">參悟中 ${gfLearnPct(u)}%${gfFighting(u)?'（戰鬥中暫停）':''}</span> <button class="btn" data-gf="learnCancel">取消參悟</button></div>`;
  }
  if(g.study){
    const p=studyProgress(u);const rowS=get(g.study.id);
    h+=`<div class="mini">參悟「${htmlEsc(rowS?rowS.name:g.study.id)}」 <span data-gf-live="study">${Math.round((p?p.p:0)*100)}%</span></div>`;
  }
  h+=`<div class="mini" data-gf-sub="learned-active">主動：${htmlEsc(fmtSkillNames(grp.learned.active))}</div>`;
  h+=`<div class="mini" data-gf-sub="learned-passive">被動：${htmlEsc(fmtSkillNames(grp.learned.passive))}</div>`;
  h+=`<div class="mini">主修：${row?htmlEsc(row.name)+' · '+schoolName(row.school):'無'}　輔修 ${g.aux.length}/${sl.aux}</div>`;
  if(row){
    h+=`<div class="mini gf-tip" data-gf="tip" data-id="${htmlEsc(row.id)}" title="${htmlEsc(describe(row,u))}">${htmlEsc(row.desc||'')}　${htmlEsc(plainCult(row.cult||1))}。點此看完整說明。</div>`;
  }
  if(g.holding&&g.holding.length){
    h+='<div class="jobs">';
    for(const id of g.holding){
      const rr=get(id);
      h+=`<button class="btn" data-gf="ret" data-id="${htmlEsc(id)}">歸還「${htmlEsc(rr?rr.name:id)}」</button>`;
    }
    h+='</div>';
  }
  const manuals=manualCounts(u);
  const invN={};const st=getS();
  for(const it of st&&st.inv||[]){if(!manualUsable(u,it)||!(it.t==='gongfa'||it.type==='gongfa'))continue;const id=parseItemId(it.gfId||it.itemId);if(get(id))invN[id]=(invN[id]||0)+Math.max(1,it.n|0||1);}
  h+='<div id="gf_learning"><b>卷軸參悟</b><p class="mini">先確認才暫取一卷，學成仍持有可歸還；私有卷歸還原持有人，不變成公卷。背包裡的功法卷可學習、傳授或出售。</p>';
  const seen={};
  for(const id in invN){const rr=get(id);if(!rr)continue;seen[id]=1;
    h+=`<div class="mini">「${htmlEsc(rr.name)}」×${invN[id]} <button class="btn" data-gf="learn" data-id="${htmlEsc(id)}">學習</button> <button class="btn" data-gf="give" data-id="${htmlEsc(id)}">傳授給選中弟子</button> <button class="btn" data-gf="sell" data-id="${htmlEsc(id)}">出售</button></div>`;}
  for(const id in manuals){if(seen[id])continue;const rr=get(id);if(!rr)continue;
    h+=`<button class="btn" data-gf="study" data-id="${htmlEsc(id)}">參悟「${htmlEsc(rr.name)}」 ×${manuals[id]}</button>`;}
  // caigfout：戶外（#gf_sec／功法抽屜）不再顯示功法閣借閱區塊，借閱改到功法閣建築面板；?caigfout=0 恢復
  const gfOut=!gfFlagOff('caigfout');
  if(!gfOut)h+='<button class="btn" data-gf="library">功法閣借閱（'+(CultGF._libraryOpen?'收起':'展開館藏')+'）</button>';
  if(!gfOut&&CultGF._libraryOpen){const E=econApi(),G=getS().econ&&getS().econ.gf;
   h+='<p class="mini">宗主借閱免費；弟子借閱要用自己的俸祿付借閱費，這筆錢進宗門庫房。沿用功法閣原庫存、資格與期限，借閱與參悟分開確認。</p>';
   for(const row of G&&G.scrolls||[]){const rr=get(row.gfId);if(!rr)continue;const loan=E&&E.gfLoanOf&&E.gfLoanOf(u,rr.id);
    h+=`<div class="mini">${htmlEsc(rr.name)} · 庫存${row.n|0}${!row.stockSource||row.stockSource==='legacy-unverified'?'（舊庫存來源未核實）':''} `;
    if(loan)h+=`借卷中 <button class="btn" data-gf="libraryStudy" data-id="${htmlEsc(rr.id)}">參悟借卷</button> <button class="btn" data-gf="libReturn" data-id="${htmlEsc(rr.id)}">歸還借卷</button>`;
    else if(!owned(u,rr.id)&&row.n>0)h+=`<button class="btn" data-gf="borrow" data-id="${htmlEsc(rr.id)}">借閱</button>`;
    else if(!owned(u,rr.id))h+='無可借庫存';h+='</div>';
   }
  }
  if(CultGF._actionResult)h+='<p role="status">'+htmlEsc(CultGF._actionResult)+'</p>';h+='</div>';
  const learnedIds=Object.keys(g.learned);
  if(learnedIds.length){
    h+='<div class="jobs">';
    for(const id of learnedIds){
      const rr=get(id);const onM=g.main===id;
      h+=`<button class="btn${onM?' on':''}" data-gf="eq" data-id="${htmlEsc(id)}" data-slot="main" title="${htmlEsc(describe(rr||id,u))}">${onM?'主修中':'主修'} ${htmlEsc(rr?rr.name:id)}</button>`;
      h+=`<button class="btn" data-gf="tip" data-id="${htmlEsc(id)}">說明</button>`;
      if(sl.aux>0)h+=`<button class="btn${g.aux.indexOf(id)>=0?' on':''}" data-gf="aux" data-id="${htmlEsc(id)}">${g.aux.indexOf(id)>=0?'輔修中':'輔修'}</button>`;
    }
    h+='</div>';
  }
  const bar=barOf(u),acts=knownActives(u);
  h+='<div id="gf_bar"><b>技能欄</b><span class="mini">　主動最多 5 格（拖放或點選替換）；被動學會即生效、不佔格</span></div>';
  h+='<div class="jobs" id="gf_bar_slots">';
  for(let i=0;i<((GF_CFG.barSlots)|0||5);i++){
    const ab=bar[i];
    const info=ab?abInfo(ab,u):null;
    const lab=info?info.name:('空 '+ (i+1));
    const qi=ab?abQi(ab):0,cd=info&&info.cd;
    const extra=ab?(' '+qiLabel(ab)+(cd!=null?(' 冷卻'+cd+'秒'):'')):'';
    h+=`<button class="btn${ab?' on':''}" draggable="true" data-gf="bar" data-slot="${i}" data-ab="${htmlEsc(ab||'')}" title="${htmlEsc(ab?((info&&info.desc)||lab)+extra:'點選已學招式以裝上此格')}">${htmlEsc(lab)}${htmlEsc(extra)}</button>`;
  }
  h+='</div>';
  if(acts.length){
    h+='<div class="jobs" id="gf_bar_pool">';
    for(const s of acts){
      const onB=bar.indexOf(s.ab)>=0;
      const qi=abQi(s.ab),cd=s.cd;
      h+=`<button class="btn${onB?' on':''}" draggable="true" data-gf="barput" data-ab="${htmlEsc(s.ab)}" title="${htmlEsc((s.desc||s.name)+' '+qiLabel(s.ab)+(cd!=null?(' 冷卻'+cd+'秒'):''))}">${htmlEsc(s.name)}${onB?' ·已上欄':''}</button>`;
    }
    h+='</div>';
  }
  if(g.pen&&now()<g.pen.t)h+=`<div class="mini">換修調息 <span data-gf-live="pen">${Math.ceil(g.pen.t-now())}</span> 秒</div>`;
  const cm=mul(u),pct=Math.round((cm-1)*100);
  h+=`<div class="mini">功法修煉 ${pct?((pct>0?'+':'')+pct+'%'):'無額外加成'}</div></div></div>`;
  return h;
}
// 重繪節流：以「去掉每秒數字」的簽章判斷結構是否變了；沒變只更新 [data-gf-live] 的 textContent，按鈕節點不換。
// 主程式 renderPanel（g7.js:50–101）在 panelKey 變動時整個改寫 #panel.innerHTML，這時把快取的同一個 #gf_sec 節點放回去。
// 滑鼠按住在功法區塊內時延後重建，放開（click 觸發後）再補畫。
const GF_LIVE_RE=/(<span data-gf-live="([^"]*)">)([^<]*)(<\/span>)/g;
function liveSig(html){return String(html).replace(GF_LIVE_RE,'$1$4');}
function liveApply(root,html){if(!root)return 0;let n=0;String(html).replace(GF_LIVE_RE,(m,a,k,v)=>{const e=root.querySelector('[data-gf-live="'+k+'"]');
 const t=v.replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/&quot;/g,'"').replace(/&amp;/g,'&');if(e&&e.textContent!==t){e.textContent=t;n++;}return m;});return n;}
function htmlNode(html){const w=document.createElement('div');w.innerHTML=html;return w.firstElementChild;}
function ptrInGf(){return !!CultGF._ptrIn;}
function stripPanelGf(){
  const old=document.getElementById('gf_sec');
  if(old)old.remove();
  try{
    if(CultGF._gfNode&&CultGF._gfNode.id==='gf_sec'&&CultGF._gfNode.parentNode)CultGF._gfNode.remove();
  }catch(e){}
  CultGF._gfNode=null;CultGF._gfSig=null;
}
function paintPanel(){
  if(!on()){stripPanelGf();return;}
  const drawer=!!CultGF._panelOpen,wantId=drawer?'gf_drawer_sec':'gf_sec';
  const el=drawer?document.getElementById('cultGFBody'):document.getElementById('panel');
  // 非抽屜：選到他人／建築／或非我方時，不把快取 #gf_sec 插回 #panel（已插入則移除）
  if(!drawer){
    try{
      if(selOtherOrBld()||!selAllyUnit()){stripPanelGf();return;}
    }catch(e){stripPanelGf();return;}
  }
  if(!el||(!drawer&&el.style.display==='none'))return;
  let u=selUnit();
  // 抽屜在選到他人時仍畫主角，避免功法／卷軸抽屜被清空；絕不把 #gf_sec 掛到 #panel
  if(drawer&&!u)u=playerUnit();
  let prev=el.querySelector('#'+wantId);
  if(drawer)for(const node of document.querySelectorAll('#gf_sec'))if(!el.contains(node))node.remove();
  if(!u){if(prev)prev.remove();if(!drawer)stripPanelGf();else{CultGF._gfNode=null;CultGF._gfSig=null;}return;}
  const html=panelHtml(u),sig=liveSig(html);
  const cache=CultGF._gfNode&&CultGF._gfNode.id===wantId?CultGF._gfNode:null;
  if(!prev&&cache&&(CultGF._gfSig===sig||ptrInGf())){el.appendChild(cache);prev=cache;CultGF._gfReinsert=(CultGF._gfReinsert|0)+1;}
  if(prev&&prev===cache&&CultGF._gfSig===sig){liveApply(prev,html);return;}
  if(prev&&ptrInGf()){CultGF._gfDirty=1;liveApply(prev,html);return;}
  const nxt=htmlNode(html);if(!nxt)return;
  if(prev)prev.replaceWith(nxt);else el.appendChild(nxt);
  CultGF._gfNode=nxt;CultGF._gfSig=sig;CultGF._renderedPanel=html;CultGF._gfBuilds=(CultGF._gfBuilds|0)+1;CultGF._gfDirty=0;
}
function bindPtrGuard(){if(CultGF._ptrBound)return;CultGF._ptrBound=1;
 const inside=t=>!!(t&&t.closest&&t.closest('#gf_sec,#gf_drawer_sec,#cultGfLib'));
 const down=ev=>{if(inside(ev.target))CultGF._ptrIn=true;};
 const up=()=>{if(!CultGF._ptrIn)return;setTimeout(()=>{CultGF._ptrIn=false;try{if(CultGF._gfDirty)paintPanel();}catch(e){}try{if(CultGF._lib&&CultGF._lib._dirty)libPaint(false);}catch(e){}},0);};
 for(const k of ['pointerdown','mousedown','touchstart'])document.addEventListener(k,down,true);
 for(const k of ['pointerup','mouseup','touchend','pointercancel','touchcancel'])document.addEventListener(k,up,true);
 window.addEventListener('blur',up);
}
function showTip(html){
  let box=document.getElementById('gf_tipbox');
  if(!box){
    box=document.createElement('div');box.id='gf_tipbox';
    box.style.cssText='position:fixed;z-index:40;max-width:320px;padding:10px 12px;background:#1a140cdc;color:#f3e3c0;border:1px solid #8a6a3a;border-radius:8px;font-size:13px;line-height:1.45;display:none;pointer-events:auto;';
    document.body.appendChild(box);
    box.addEventListener('click',function(ev){ev.stopPropagation();});
  }
  box.innerHTML=html+'<div class="mini" style="margin-top:6px;opacity:.75">再點一次或點空白處關閉</div>';
  box.style.display='block';
  box.style.left=Math.max(8,Math.min(window.innerWidth-340,(window._gfTipX||80)))+'px';
  box.style.top=Math.max(8,Math.min(window.innerHeight-180,(window._gfTipY||80)))+'px';
  CultGF._tipOn=true;
}
function hideTip(){const box=document.getElementById('gf_tipbox');if(box)box.style.display='none';CultGF._tipOn=false;CultGF._tipPick=null;}
function mountGFPanel(){if(document.getElementById('cultGFPanel'))return;
 const style=document.createElement('style');style.textContent='#cultGFPanel{position:fixed;z-index:11500;right:8px;top:90px;width:min(450px,calc(100vw - 16px));max-height:calc(100vh - 110px);overflow:auto;box-sizing:border-box;background:#211b13fa;border:1px solid #a9864b;border-radius:8px;color:#f3e3c0;padding:12px;font-size:14px}#cultGFPanel[hidden]{display:none}#cultGFPanel .btn{min-height:36px;white-space:normal;margin:3px}#cultGFPanel .mini{white-space:normal;overflow-wrap:anywhere}';document.head.appendChild(style);
 const panel=document.createElement('section');panel.id='cultGFPanel';panel.hidden=true;panel.setAttribute('aria-label','功法與卷軸');panel.innerHTML='<h3>功法／卷軸 <button class="btn" data-gf="closePanel">關閉</button></h3><div id="cultGFBody"></div>';document.body.appendChild(panel);
 const b=document.createElement('button');b.id='cultGFBtn';b.className='btn';b.textContent='功法／卷軸';b.onclick=()=>openGFPanel(!CultGF._panelOpen);(document.getElementById('menuBar')||document.body).appendChild(b);
}
function openGFPanel(on){mountGFPanel();const prev=document.getElementById('gf_sec');if(prev)prev.remove();CultGF._panelOpen=!!on;document.getElementById('cultGFPanel').hidden=!on;CultGF._renderedPanel=null;CultGF._gfSig=null;CultGF._gfNode=null;paintPanel();}
function bindUi(){
  if(CultGF._ui)return;CultGF._ui=1;
  document.addEventListener('click',ev=>{
    const t=ev.target&&ev.target.closest&&ev.target.closest('[data-gf]');
    if(!t){if(CultGF._tipOn&&!ev.target.closest('#gf_tipbox'))hideTip();return;}
    const act=t.getAttribute('data-gf'),id=t.getAttribute('data-id');
    if(act==='closePanel'){openGFPanel(false);ev.stopPropagation();return;}
    let u=selUnit();
    if(!u&&(act==='learn'||act==='give'||act==='learnCancel')){try{u=(typeof player==='function'&&player())||(window.XW&&XW.player&&XW.player())||null;}catch(e){}}
    if(!u)return;
    window._gfTipX=(ev.clientX||80)+12;window._gfTipY=(ev.clientY||80)+12;
    if(act==='learn'){sendAction(bagActor()||u,{op:'learn',gfId:id,src:'bag'});paintPanel();ev.stopPropagation();return;}
    if(act==='give'){const from=bagActor()||u;const to=giveTarget(from)||(u&&u!==from?u:null);
      if(!to){announce(fail('no-disciple'));paintPanel();ev.stopPropagation();return;}
      sendAction(from,{op:'give',gfId:id,to:to.id});paintPanel();ev.stopPropagation();return;}
    if(act==='learnCancel'){sendAction(u,{op:'learnCancel'});paintPanel();ev.stopPropagation();return;}
    if(act==='sell'){sendAction(bagActor()||u,{op:'sell',gfId:id});paintPanel();ev.stopPropagation();return;}
    if(act==='study'||act==='borrow'){
      const q=act==='borrow'?libraryQuote(u,id):{ok:true};
      if(q.ok)CultGF._confirmUI={unitId:u.id,op:act,gfId:id,...q};else announce(q);
      paintPanel();if(CultGF._panelOpen)document.getElementById('cultGFPanel').scrollTop=0;ev.stopPropagation();return;
    }
    if(act==='confirmStudy'){const q=CultGF._confirmUI;if(q&&q.unitId===u.id)sendAction(u,{op:q.op,gfId:q.gfId,confirm:true,...(q.op==='borrow'?{fee:q.fee,seconds:q.seconds}:{})});CultGF._confirmUI=null;paintPanel();ev.stopPropagation();return;}
    if(act==='cancelStudy'){CultGF._confirmUI=null;paintPanel();ev.stopPropagation();return;}
    if(act==='library'){CultGF._libraryOpen=!CultGF._libraryOpen;paintPanel();ev.stopPropagation();return;}
    if(act==='libraryStudy'||act==='libReturn'){sendAction(u,{op:act==='libraryStudy'?'libraryStudy':'return',source:'library',gfId:id});paintPanel();ev.stopPropagation();return;}
    if(act==='eq')gfEquip(u,id,t.getAttribute('data-slot')||'main');
    if(act==='ret')sendAction(u,{op:'return',gfId:id,source:'manual'});
    if(act==='aux')gfEquip(u,id,'aux');
    if(act==='tip'){
      const html=tipHtml(id,u);
      if(CultGF._tipOn&&CultGF._tipId===id)hideTip();
      else{CultGF._tipId=id;showTip(html);}
      ev.stopPropagation();return;
    }
    if(act==='bar'){
      const slot=+t.getAttribute('data-slot');
      if(CultGF._tipPick){sendAction(u,{op:'bar',ab:CultGF._tipPick,slot});CultGF._tipPick=null;}
      else if(t.getAttribute('data-ab'))sendAction(u,{op:'bar',ab:null,slot});
      paintPanel();ev.stopPropagation();return;
    }
    if(act==='barput'){
      const ab=t.getAttribute('data-ab');
      const empty=(u.gf.bar||[]).indexOf(null);
      if(empty>=0)sendAction(u,{op:'bar',ab,slot:empty});
      else CultGF._tipPick=ab;
      paintPanel();ev.stopPropagation();return;
    }
    paintPanel();
    ev.stopPropagation();
  });
  document.addEventListener('dragstart',ev=>{
    const t=ev.target&&ev.target.closest&&ev.target.closest('[data-gf="barput"],[data-gf="bar"]');
    if(!t||!ev.dataTransfer)return;
    const ab=t.getAttribute('data-ab')||'';
    const slot=t.getAttribute('data-slot');
    ev.dataTransfer.setData('text/plain',slot!=null?'s:'+slot:'a:'+ab);
    CultGF._drag=slot!=null?{k:'s',v:+slot}:{k:'a',v:ab};
  });
  document.addEventListener('dragover',ev=>{
    if(ev.target&&ev.target.closest&&ev.target.closest('[data-gf="bar"]'))ev.preventDefault();
  });
  document.addEventListener('drop',ev=>{
    const t=ev.target&&ev.target.closest&&ev.target.closest('[data-gf="bar"]');
    if(!t)return;
    ev.preventDefault();
    const u=selUnit();if(!u)return;
    const slot=+t.getAttribute('data-slot');
    let raw='';
    try{raw=ev.dataTransfer.getData('text/plain')||'';}catch(e){}
    const d=CultGF._drag||(raw?{k:raw.split(':')[0],v:raw.split(':').slice(1).join(':')}:null);
    if(!d)return;
    if(d.k==='s'){
      const j=+d.v,bar=barOf(u);if(bar[j])sendAction(u,{op:'bar',ab:bar[j],slot});
    }else if(d.k==='a'&&d.v)sendAction(u,{op:'bar',ab:d.v,slot});
    CultGF._drag=null;paintPanel();
  });
}

function migrate(d){
  if(!d)return d;
  d.gfBag=d.gfBag||{};
  d.flags=d.flags||{};
  d.flags.gf=d.flags.gf||{v:GF_CFG.saveVer};
  migrateInv(d);
  if(d.v45)migrateInv(d.v45,d);
  if(d.units)for(const u of d.units)migrateUnit(u);
  try{
    const owned=d.econ&&d.econ.gf&&d.econ.gf.owned;
    if(owned&&d.units){
      for(const u of d.units){
        const o=owned[u.id];if(!o)continue;
        migrateUnit(u);
        for(const id in o){if(o[id]&&get(id)&&!u.gf.learned[id])u.gf.learned[id]={prof:0,tier:0};}
      }
    }
  }catch(e){}
  return d;
}

// ===== 功法閣館藏面板（室內入口）：cultGfOpenLibrary(b)／CultGF.openLibrary(b) =====
// 由整合者在功法閣室內（b.type==='gongfage'）呼叫。只沿用既有借閱／參悟／歸還（performAction→XW_ECON.gfBorrow／gfBeginStudy／gfReturn），
// 不新增規則或數字。宗主借閱免費；弟子借閱費由弟子自己的俸祿錢包支付，收入進宗門庫房。非全螢幕、不鎖畫面；b 可為 null。
const LIB_REASON={already:'已借閱此卷',insufficient:'俸祿不足，付不起借閱費','no-stock':'館藏已借完',post:'職位不足，無法借閱此品階',contrib:'貢獻度不足，無法借閱此品階',
 'no-slot':'研習席位已滿','no-hall':'需先建成功法閣才能參悟','not-borrowed':'尚未借閱','no-loan':'沒有借卷可歸還','flag-off':'功法閣未開啟','quote-changed':'費用已變動，請重新確認',
 'policy-unavailable':'功法閣規則尚未載入','no-econ':'經濟模組未載入',client:'聯機成員請由房主操作',actor:'聯機時只能替自己的化身借閱'};
function libReason(r){const k=r&&(r.reason||r.code);return LIB_REASON[k]||REASON_ZH[k]||('未完成：'+(k||'unknown'));}
function libCurName(c){return c==='contrib'?'貢獻度':'靈石';}
function libFeeText(q){if(!q)return '';if(q.free||!(q.fee>0))return '免費';return '俸祿 '+q.fee+' '+libCurName(q.cur)+'（入宗門庫房）';}
function libIsPC(u){try{return typeof econIsPlayerUnit==='function'?econIsPlayerUnit(u):!!(u&&u.kind==='player');}catch(e){return !!(u&&u.kind==='player');}}
function libPlayer(){try{if(typeof player==='function')return player();}catch(e){}try{return window.XW&&XW.player?XW.player():null;}catch(e){return null;}}
function libBorrowers(){const st=getS(),out=[];const p=libPlayer();if(p&&!p.dead)out.push(p);
 for(const u of (st&&st.units)||[]){if(!u||u.dead||u===p||libIsPC(u)||u.kind!=='disciple')continue;out.push(u);}return out;}
function libWho(){const L=libBorrowers();const id=CultGF._lib&&CultGF._lib.who;let u=L.find(x=>x&&x.id===id);if(!u)u=L[0]||null;if(CultGF._lib&&u)CultGF._lib.who=u.id;return u;}
function libWallet(u){const E=econApi();try{if(E&&E.wallet&&E.bagXia){const w=E.wallet(u.id,false);if(w)return E.bagXia(w);}}catch(e){}return Math.floor(+u.lingshi||0);}
function libBldg(){const L=CultGF._lib;let b=L&&L.b;try{if(b&&b.id!=null&&typeof bById==='function'){const bb=bById(b.id);if(bb)b=bb;}}catch(e){}
 if(!b||b.type!=='gongfage'){try{const st=getS();b=((st&&st.buildings)||[]).filter(x=>x&&x.type==='gongfage'&&x.built&&!x.broken).sort((a,c)=>(c.lv||1)-(a.lv||1))[0]||null;}catch(e){b=null;}}return b;}
function libStudyOf(uid,gfId){const st=getS(),G=st&&st.econ&&st.econ.gf;for(const s of (G&&G.studies)||[]){if(s&&!s.done&&s.unitId===uid&&s.gfId===gfId)return s;}return null;}
function libListHtml(){
 const E=econApi(),st=getS(),G=st&&st.econ&&st.econ.gf,u=libWho(),b=libBldg();
 let h='';
 if(!u)return '<p class="mini">沒有可借閱的人。</p>';
 const pc=libIsPC(u);
 h+='<p class="mini" data-gflib-rule>宗主借閱免費；弟子借閱要用自己的俸祿付借閱費，這筆錢進宗門庫房。學成後卷軸自動歸還。</p>';
 h+='<p class="mini" data-gflib-who>借閱人：'+htmlEsc(u.name||('#'+u.id))+(pc?'（宗主・免費）':'（弟子・錢包 '+libWallet(u)+' 靈石）')+'</p>';
 let cap=0,used=0;try{cap=E&&E.gfSlots?E.gfSlots(b||undefined):0;for(const s of (G&&G.studies)||[]){if(s&&!s.done&&!s.paused)used++;}}catch(e){}
 h+='<p class="mini">'+(b?('功法閣 Lv'+(b.lv||1)+'　'):'尚未建成功法閣　')+'研習席 '+used+'/'+cap+'</p>';
 if(CultGF._lib.msg)h+='<p role="status" data-gflib-msg>'+htmlEsc(CultGF._lib.msg)+'</p>';
 const cf=CultGF._lib.confirm;
 const rows=((G&&G.scrolls)||[]).filter(r=>r&&get(r.gfId));
 if(!rows.length)h+='<p class="mini">館藏目前沒有功法卷。</p>';
 for(const row of rows){const rr=get(row.gfId),id=rr.id;const loan=E&&E.gfLoanOf?E.gfLoanOf(u,id):null;
  const q=libraryQuote(u,id);
  h+='<div class="mini" data-gflib-row="'+htmlEsc(id)+'" style="border-top:1px solid #a9864b55;padding:4px 0">「'+htmlEsc(rr.name)+'」 庫存 '+(row.n|0);
  if(owned(u,id)&&!loan){h+='　已習得</div>';continue;}
  if(loan){const sd=libStudyOf(u.id,id);const need=(sd&&sd.need)||loan.studyNeed||1;const pr=Math.min(100,Math.round(((sd?sd.prog:loan.studyT)||0)/need*100));
   h+='　借卷中'+(sd&&!sd.paused?('・參悟 <span data-gf-live="lp-'+htmlEsc(id)+'">'+pr+'%</span>'):(pr>0?('・已讀 '+pr+'%'):''))+' ';
   if(!(sd&&!sd.paused))h+='<button class="btn" data-gflib="study" data-id="'+htmlEsc(id)+'">參悟</button>';
   h+='<button class="btn" data-gflib="ret" data-id="'+htmlEsc(id)+'">歸還</button></div>';continue;}
  if(!q.ok){h+='　'+htmlEsc(libReason(q))+'</div>';continue;}
  h+='　費用 <span data-gflib-fee="'+htmlEsc(id)+'">'+htmlEsc(libFeeText(q))+'</span> ';
  if(!(row.n>0)){h+='館藏已借完</div>';continue;}
  if(cf&&cf.gfId===id&&cf.unitId===u.id)h+='<br>確認借閱（'+htmlEsc(libFeeText(cf))+'／期限 '+cf.seconds+' 秒）？ <button class="btn" data-gflib="ok" data-id="'+htmlEsc(id)+'">確認</button><button class="btn" data-gflib="no">取消</button>';
  else h+='<button class="btn" data-gflib="borrow" data-id="'+htmlEsc(id)+'">借閱</button>';
  h+='</div>';
 }
 return h;
}
function libWhoHtml(){const L=libBorrowers(),u=libWho();
 return '<label class="mini">借閱人 <select data-gflib-pick>'+L.map(x=>'<option value="'+htmlEsc(x.id)+'"'+(u&&x.id===u.id?' selected':'')+'>'+htmlEsc((x.name||('#'+x.id))+(libIsPC(x)?'（宗主）':''))+'</option>').join('')+'</select></label>';}
function libMount(){let el=document.getElementById('cultGfLib');if(el)return el;
 const css=document.createElement('style');css.textContent='#cultGfLib{position:fixed;z-index:11600;left:50%;top:80px;transform:translateX(-50%);width:min(520px,calc(100vw - 16px));max-height:calc(100vh - 100px);overflow:auto;box-sizing:border-box;background:#211b13fa;border:1px solid #a9864b;border-radius:8px;color:#f3e3c0;padding:12px;font-size:14px}#cultGfLib[hidden]{display:none}#cultGfLib .btn{min-height:32px;margin:2px}#cultGfLib .mini{white-space:normal;overflow-wrap:anywhere}#cultGfLib select{font-size:14px}';document.head.appendChild(css);
 el=document.createElement('section');el.id='cultGfLib';el.hidden=true;el.setAttribute('aria-label','功法閣館藏');
 el.innerHTML='<h3 style="margin:0 0 6px">功法閣・館藏 <button class="btn" data-gflib="close">關閉</button></h3><div id="cultGfLibWho"></div><div id="cultGfLibList"></div>';
 document.body.appendChild(el);
 el.addEventListener('click',libClick);
 el.addEventListener('change',ev=>{const t=ev.target;if(t&&t.matches&&t.matches('[data-gflib-pick]')){const v=t.value;const L=libBorrowers();const u=L.find(x=>String(x.id)===String(v));if(u)CultGF._lib.who=u.id;CultGF._lib.confirm=null;CultGF._lib.msg='';libPaint(true);}ev.stopPropagation();});
 for(const k of ['mousedown','pointerdown','wheel','contextmenu'])el.addEventListener(k,ev=>ev.stopPropagation());
 return el;}
function libPaint(full){const el=document.getElementById('cultGfLib');if(!el||el.hidden)return;const L=CultGF._lib;
 const whoEl=el.querySelector('#cultGfLibWho'),pick=el.querySelector('[data-gflib-pick]'),wh=libWhoHtml();
 if(!pick||(L._whoHtml!==wh&&(full||document.activeElement!==pick))){whoEl.innerHTML=wh;L._whoHtml=wh;}
 const html=libListHtml(),sig=liveSig(html),box=el.querySelector('#cultGfLibList');
 if(L._sig===sig&&box.firstChild){liveApply(box,html);return;}
 if(!full&&ptrInGf()&&box.firstChild){L._dirty=1;liveApply(box,html);return;}
 L._sig=sig;L._html=html;L._dirty=0;box.innerHTML=html;L._builds=(L._builds|0)+1;}
function libAct(u,i){const r=sendAction(u,i);CultGF._lib.msg=r&&r.pending?'等待房主確認':(r&&r.ok?(i.op==='borrow'?('已借閱'+(r.fee>0?('，付 '+r.fee+' '+libCurName(CultGF._lib.cur)):'（免費）')):i.op==='libraryStudy'?'開始參悟':'已歸還'):libReason(r));return r;}
function libClick(ev){const t=ev.target&&ev.target.closest&&ev.target.closest('[data-gflib]');ev.stopPropagation();if(!t)return;
 const act=t.getAttribute('data-gflib'),id=t.getAttribute('data-id');
 if(act==='close'){closeLibrary();return;}
 const u=libWho();if(!u)return;
 if(act==='borrow'){const q=libraryQuote(u,id);if(q.ok){CultGF._lib.confirm={unitId:u.id,gfId:id,...q};CultGF._lib.msg='';}else CultGF._lib.msg=libReason(q);}
 else if(act==='no')CultGF._lib.confirm=null;
 else if(act==='ok'){const q=CultGF._lib.confirm;CultGF._lib.confirm=null;if(q&&q.unitId===u.id&&q.gfId===id){CultGF._lib.cur=q.cur;libAct(u,{op:'borrow',gfId:id,confirm:true,fee:q.fee,seconds:q.seconds});}}
 else if(act==='study')libAct(u,{op:'libraryStudy',source:'library',gfId:id});
 else if(act==='ret')libAct(u,{op:'return',source:'library',gfId:id});
 libPaint(true);}
function openLibrary(b,opt){
 try{
  if(!on()){try{toast('功法未開啟');}catch(e){}return false;}
  const E=econApi();if(!E||(typeof E.gfFlag==='function'&&!E.gfFlag())){try{toast('功法閣未開啟');}catch(e){}return false;}
  CultGF._lib=CultGF._lib||{};const L=CultGF._lib;
  L.b=(b&&typeof b==='object')?b:null;L.confirm=null;L.msg='';L._html=null;L._sig=null;L._whoHtml=null;
  let who=opt&&opt.who!=null?opt.who:null;
  if(who==null){try{const s=selUnit();if(s&&!s.dead&&s.kind==='disciple')who=s.id;}catch(e){}}
  if(who!=null)L.who=(typeof who==='object'&&who)?who.id:who;
  const el=libMount();el.hidden=false;libPaint(true);
  if(L._iv)clearInterval(L._iv);L._iv=setInterval(()=>{try{const e2=document.getElementById('cultGfLib');if(!e2||e2.hidden){clearInterval(L._iv);L._iv=null;return;}libPaint(false);}catch(e){}},1000);
  return true;
 }catch(e){try{console.warn('cultGfOpenLibrary',e);}catch(e2){}return false;}
}
function closeLibrary(){const el=document.getElementById('cultGfLib');if(el)el.hidden=true;const L=CultGF._lib;if(L){L.confirm=null;if(L._iv){clearInterval(L._iv);L._iv=null;}}return true;}
function libraryOpen(){const el=document.getElementById('cultGfLib');return !!(el&&!el.hidden);}

const CultGF={
  CFG:GF_CFG,CATALOG:CATALOG,
  on:on,get:get,catalog:catalog,itemId:itemId,parseItemId:parseItemId,priceHint:priceHint,
  openPanel:openGFPanel,openLibrary:openLibrary,closeLibrary:closeLibrary,libraryOpen:libraryOpen,libraryFee:libraryFee,libraryHtml:function(){return libListHtml();},manualCounts:manualCounts,libraryQuote:libraryQuote,performAction:performAction,sendAction:sendAction,activeIds:activeIds,learn:learn,startStudy:startStudy,beginLearn:beginLearn,cancelLearn:cancelLearn,learnOf:gfLearnOf,learnPct:gfLearnPct,learnDur:gfLearnDur,learnRed:gfLearnRed,learnOn:gfLearnOn,fighting:gfFighting,studyProgress:studyProgress,returnManual:returnManual,returnAll:returnAll,
  owned:owned,bagCount:bagCount,grantManual:grantManual,consumeManual:consumeManual,giveManual:giveManual,sellManual:sellManual,reasonText:reasonText,qiLabel:qiLabel,abQi:abQi,
  setAbCost:function(map){try{const T=(typeof TUNE!=='undefined'&&TUNE)||window.TUNE;if(!T||!T.v49)return false;T.v49.abCost=Object.assign({},T.v49.abCost||{},map||{});if(typeof v158Ui==='function')v158Ui();return true;}catch(e){return false;}},
  equip:gfEquip,unequip:gfUnequip,
  // 別名經由 CultGF.equip／unequip 轉發，保留 net20_authority 對 CultGF.equip／unequip 的客機唯讀包裝
  gfEquip:function(){return CultGF.equip.apply(this,arguments);},gfUnequip:function(){return CultGF.unequip.apply(this,arguments);},slots:slots,mul:mul,grantsAb:grantsAb,maybeEntry:maybeEntry,
  studyDur:studyDur,studySpeedMul:studySpeedMul,profTier:profTier,profName:profName,addProf:addProf,unlockedAbs:unlockedAbs,
  pack:pack,unpack:unpack,migrate:migrate,migrateUnit:migrateUnit,migrateInv:migrateInv,rollDrop:rollDrop,
  grant:grant,list:list,tick:gfTick,paint:paintPanel,counters:counters,schoolOf:schoolOf,
  AB_KIND:AB_KIND,innateSources:innateSources,innateSkills:innateSkills,learnedSkills:learnedSkills,
  allAbilities:allAbilities,skillsByGroup:skillsByGroup,skillKind:skillKind,abInfo:abInfo,panelHtml:panelHtml,hasAb:queryHasAb,
  caps:function(){return {cultMul:capOf('cultMul'),dmgRed:capOf('dmgRed')};},
  collectEffects:collectEffects,stackEffects:stackEffects,dmgRed:dmgRedOf,scaleIncoming:scaleIncoming,
  dmgUnit:gfDmgUnit,heal:healUnit,
  describe:describe,tipHtml:tipHtml,plainCult:plainCult,qiCostOf:qiCostOf,howOf:howOf,
  barOf:barOf,equipBar:equipBar,unequipBar:unequipBar,autoPickBar:autoPickBar,knownActives:knownActives,
  isPassiveRow:isPassiveRow,condMet:condMet,rowCombatEffects:rowCombatEffects,condLine:condLine,
  combatAtkMul:combatAtkMul,combatSpdMul:combatSpdMul,hpRatio:hpRatio,qiRatio:qiRatio,
  applyDmgEnemy:function(src,e,amt,col){
    const fn=(typeof dmgEnemy==='function')?dmgEnemy:(window._cultGfDmgEnemy||window.dmgEnemy);
    if(typeof fn==='function')return fn(src,e,amt,col);
  },
  applyMoveEntity:function(o,dt){
    const fn=(typeof moveEntity==='function')?moveEntity:(window._cultGfMoveEntity||window.moveEntity);
    if(typeof fn==='function')return fn(o,dt);
  }
};
window.CultGF=CultGF;
window.cultGfOpenLibrary=openLibrary;window.cultGfCloseLibrary=closeLibrary;
window.XW_GF={
  list:list,get:getEcon,learn:xwLearn,owns:owned,grant:grant,
  itemId:itemId,parseItemId:parseItemId,rollDrop:rollDrop,studySpeedMul:studySpeedMul
};
try{if(window.XW)XW.gf=window.XW_GF;}catch(e){}
try{
  if(window.Cult)Cult.grantGongfa=grant;
  window.XW_CULT=window.XW_CULT||window.Cult||{};
  window.XW_CULT.grantGongfa=grant;
}catch(e){}

function install(){
  if(CultGF._installed)return;CultGF._installed=1;
  try{if(typeof UNIT_KEEP!=='undefined'&&UNIT_KEEP.indexOf('gf')<0)UNIT_KEEP.push('gf');}catch(e){}
  try{for(const k of ['_gfLearn','_gfLearnKeep']){if(typeof UNIT_KEEP!=='undefined'&&UNIT_KEEP.indexOf(k)<0)UNIT_KEEP.push(k);if(window.XW&&Array.isArray(XW.UNIT_KEEP)&&XW.UNIT_KEEP.indexOf(k)<0)XW.UNIT_KEEP.push(k);}}catch(e){}
  if(typeof cultMul==='function'){const _cm=cultMul;cultMul=function(u){return _cm(u)*mul(u);};}
  if(typeof hasAb==='function'&&hasAb!==queryHasAb){_origHasAb=hasAb;hasAb=queryHasAb;}
  try{window.hasAb=queryHasAb;}catch(e){}
  if(typeof dmgUnit==='function'&&dmgUnit!==gfDmgUnit){_origDmgUnit=dmgUnit;dmgUnit=gfDmgUnit;}
  try{window.dmgUnit=gfDmgUnit;}catch(e){}
  if(typeof doBreak==='function'){const _db=doBreak;doBreak=function(u){const r=_db.apply(this,arguments);try{maybeEntry(u);}catch(e){}return r;};}
  if(typeof dmgEnemy==='function'&&!dmgEnemy._cultGfAtk){const _de=dmgEnemy;dmgEnemy=function(src,e,amt,col){
    try{
      if(on()&&src&&e&&counters(src,e))amt=(amt||0)*GF_CFG.counterMul;
      if(on()&&src)amt=(amt||0)*combatAtkMul(src);
      if(on()&&src&&src.gf&&src.gf.main)addProf(src,src.gf.main,GF_CFG.profOnHit);
    }catch(e2){}
    return _de.call(this,src,e,amt,col);
  };dmgEnemy._cultGfAtk=1;}
  try{if(typeof dmgEnemy==='function')window._cultGfDmgEnemy=dmgEnemy;}catch(e3){}
  if(typeof moveEntity==='function'&&!moveEntity._cultGfSpd){const _mv=moveEntity;moveEntity=function(o,dt){
    if(o&&(o.flyOn||o.flee||o.cultXtl||o.xtlOn))return _mv.apply(this,arguments);
    let saved=null;
    try{
      const sm=combatSpdMul(o);
      if(sm!==1&&o){saved={dvx:o.dvx,dvy:o.dvy};o.dvx=(+o.dvx||0)*sm;o.dvy=(+o.dvy||0)*sm;}
    }catch(e2){}
    try{return _mv.apply(this,arguments);}
    finally{
      if(saved&&o){o.dvx=saved.dvx;o.dvy=saved.dvy;}
    }
  };moveEntity._cultGfSpd=1;}
  try{if(typeof moveEntity==='function')window._cultGfMoveEntity=moveEntity;}catch(e4){}
  if(window.Cult&&typeof Cult.tick==='function'){const _ct=Cult.tick.bind(Cult);Cult.tick=function(dt){const r=_ct(dt);try{gfTick(dt);}catch(e){}return r;};}
  else if(typeof tickV045==='function'){const _tk=tickV045;tickV045=function(dt){const r=_tk.apply(this,arguments);try{gfTick(dt);}catch(e){}return r;};}
  // 滑鼠按住 #panel 內的功法鈕時，暫緩這一輪 renderPanel（g7.js:50–101 可能整個改寫 #panel.innerHTML，按下的節點被拔掉就不會觸發 click）；放開後下一幀照常。
  if(typeof renderPanel==='function'){const _rp=renderPanel;renderPanel=function(){
    try{const n=CultGF._gfNode;if(CultGF._ptrIn&&n&&n.isConnected&&n.closest&&n.closest('#panel')){CultGF._hostDeferred=(CultGF._hostDeferred|0)+1;return;}}catch(e){}
    const r=_rp.apply(this,arguments);try{paintPanel();}catch(e){}return r;};}
  if(typeof snapshot==='function'){const _sn=snapshot;snapshot=function(){
    migrateInv(getS());
    const d=_sn.apply(this,arguments);
    try{
      const s=getS();
      if(d&&s){d.gfBag=JSON.parse(JSON.stringify(s.gfBag||{}));d.flags=d.flags||{};d.flags.gf=(s.flags&&s.flags.gf)||{v:GF_CFG.saveVer};
        if(d.units&&s.units)for(let i=0;i<d.units.length&&i<s.units.length;i++){if(s.units[i]&&s.units[i].gf)d.units[i].gf=JSON.parse(JSON.stringify(s.units[i].gf));if(s.units[i]&&d.units[i]&&s.units[i].id===d.units[i].id){for(const k of ['_gfLearn','_gfLearnKeep'])if(s.units[i][k])d.units[i][k]=JSON.parse(JSON.stringify(s.units[i][k]));}}
      }
    }catch(e){}
    return d;
  };}
  if(typeof applySave==='function'){const _as=applySave;applySave=function(d){
    // Validate the original raw boundary FIRST, then migrate a private clone. Never wash
    // NaN/Infinity (including a bad nextItem) or mutate the caller's legacy snapshot.
    try{if(d){const E=econApi(),plan=typeof grCurrencyLoadPlan==='function'?grCurrencyLoadPlan:(E&&E.inspectCurrencySave);
      if(typeof plan==='function'){const p=plan(d);if(!p.ok){if(typeof grCurrencySetLoadStatus==='function')grCurrencySetLoadStatus(p);return false;}d=p.data;}
      else d=JSON.parse(JSON.stringify(d,function(k,v){if(typeof v==='number'&&!Number.isFinite(v))throw new TypeError('Non-finite save number');return v;}));
      migrate(d);
    }}catch(e){return false;}
    const args=Array.from(arguments);args[0]=d;const r=_as.apply(this,args);
    try{
      const s=getS();
      if(r&&s){if(d&&d.gfBag)s.gfBag=JSON.parse(JSON.stringify(d.gfBag));migrateInv(s);if(s.units)for(const u of s.units)migrateUnit(u);}
    }catch(e){}
    return r;
  };}
  try{if(typeof TUNE!=='undefined'&&TUNE)window.TUNE=TUNE;}catch(e){}
  bindUi();bindPtrGuard();setTimeout(mountGFPanel,0);
  try{
    if(typeof addItem==='function'&&!addItem._gfKeep){
      const _ai=addItem;
      addItem=function(it,x,y){
        if(manualItem(it)){
          const st=getS();
          if(st&&Array.isArray(st.inv)){
            if(st.inv.indexOf(it)<0)st.inv.push(it);
            try{if(x!=null&&typeof floater==='function')floater(x,y,'獲得 '+(typeof itemName==='function'?itemName(it):(it.gfId||'功法')),'#ffe27a');}catch(e0){}
            return true;
          }
        }
        return _ai.apply(this,arguments);
      };
      addItem._gfKeep=1;
    }
  }catch(e){}
  try{
    if(typeof itemName==='function'&&!itemName._gfName){
      const _in=itemName;
      itemName=function(it){
        try{if(manualItem(it)){const r=get(parseItemId(it.gfId||it.itemId));if(r&&r.name)return r.name+(it.n>1?(' ×'+it.n):'');}}catch(e){}
        return _in.apply(this,arguments);
      };
      itemName._gfName=1;
    }
  }catch(e){}
  try{
    const patchBar=function(){
      const el=document.getElementById('v158bar');if(!el)return;
      const slots=typeof v158Slots==='function'?v158Slots():[];
      const K=typeof V158K!=='undefined'?V158K:['Q','E','R','T','1','2','3','4','5','6'];
      for(let i=0;i<el.children.length;i++){
        const b=el.children[i],ab=slots[i];if(!ab||!b)continue;
        const nm=typeof v158Name==='function'?v158Name(ab):ab;
        b.title=(K[i]||'')+'：'+nm+'（'+qiLabel(ab,'qi')+'）— 點一下換技能';
      }
    };
    const patchPick=function(){
      const pk=document.getElementById('v158pk');if(!pk)return;
      pk.querySelectorAll('[data-v158a]').forEach(function(btn){
        const ab=btn.getAttribute('data-v158a');if(!ab)return;
        const span=btn.querySelector('span');if(span)span.textContent=qiLabel(ab,'qi');
      });
    };
    if(typeof v158Ui==='function'&&!v158Ui._gfQiTip){
      const _ui=v158Ui;v158Ui=function(){const r=_ui.apply(this,arguments);try{patchBar();}catch(e){}return r;};v158Ui._gfQiTip=1;
    }
    if(typeof v158Pick==='function'&&!v158Pick._gfQiTip){
      const _pk=v158Pick;v158Pick=function(){const r=_pk.apply(this,arguments);try{patchPick();}catch(e){}return r;};v158Pick._gfQiTip=1;
    }
    setTimeout(function(){try{if(typeof v158Ui==='function')v158Ui();}catch(e){}},0);
  }catch(e){}
  try{
    if(typeof renderBag==='function'&&!renderBag._gfBag){
      const _rb=renderBag;
      renderBag=function(){
        const r=_rb.apply(this,arguments);
        try{
          const el=document.getElementById('bag');if(!el)return r;
          const it=(typeof bagPick!=='undefined')&&getS()&&(getS().inv||[]).find(x=>x&&x.id===bagPick);
          if(!manualItem(it)){const old=el.querySelector('#gf_bag_acts');if(old)old.remove();return r;}
          const row=get(parseItemId(it.gfId||it.itemId));if(!row)return r;
          let box=el.querySelector('#gf_bag_acts');if(!box){box=document.createElement('div');box.id='gf_bag_acts';box.className='jobs';el.appendChild(box);}
          box.innerHTML='<button class="btn" data-gf="learn" data-id="'+htmlEsc(row.id)+'">學習</button> <button class="btn" data-gf="give" data-id="'+htmlEsc(row.id)+'">傳授給選中弟子</button> <button class="btn" data-gf="sell" data-id="'+htmlEsc(row.id)+'">出售</button>';
        }catch(e){}
        return r;
      };
      renderBag._gfBag=1;
    }
  }catch(e){}
  try{
    if(typeof v158Learned==='function'&&!v158Learned._cultGf){
      const _vl=v158Learned;
      v158Learned=function(p){
        const o=_vl.apply(this,arguments)||[];
        try{
          if(on()&&p&&p.gf&&p.gf.bar){
            for(const ab of p.gf.bar){if(ab&&o.indexOf(ab)<0)o.push(ab);}
          }
        }catch(e){}
        return o;
      };
      v158Learned._cultGf=1;
    }
  }catch(e){}
}
try{install();}catch(e){console.warn('CultGF.install',e);}
})();
