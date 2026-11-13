// ================== 仙武新地圖：副本分級掉落（讀 MAP_DG_LOOT）==================
// 只改 map*：資料在 map_data_dgloot.js。所有副本掉落都可重複獲得（無首通／已擁有限制）。
// 關閉：S.map.flags.dgLoot===false（預設開啟，創意家 19:52 指定）。
// 掛鉤（皆在本檔 wrap，不改 g*）：dgBossDown（首領房擲一次 bossRates）、dgUpdate（每清一間非首領房擲一次 rates）。
function mapDgLootOn(){
  try{if(typeof S!=='undefined'&&S&&S.map&&S.map.flags&&S.map.flags.dgLoot===false)return false;}catch(e){}
  return true;
}

function mapGearV2Api(){
  try{if(typeof econGearV2!=='undefined'&&econGearV2)return econGearV2;}catch(e){}
  try{if(typeof window!=='undefined'&&window.econGearV2)return window.econGearV2;}catch(e){}
  try{if(typeof XW_ECON!=='undefined'&&XW_ECON&&XW_ECON.gearV2)return XW_ECON.gearV2;}catch(e){}
  return null;
}
function mapGearV2On(){
  try{if(typeof window!=='undefined'&&typeof window.ECON_GEARV2_FORCE==='boolean')return window.ECON_GEARV2_FORCE;}catch(e){}
  try{if(typeof location!=='undefined'&&location.search){const m=/[?&]gearv2=([01])/.exec(location.search);if(m)return m[1]==='1';}}catch(e){}
  try{if(typeof econGearV2On==='function')return !!econGearV2On();}catch(e){}
  try{const api=mapGearV2Api();if(api&&typeof api.on==='function')return !!api.on();}catch(e){}
  try{if(typeof S!=='undefined'&&S&&S.econ&&S.econ.flags&&S.econ.flags.gearV2!=null)return !!S.econ.flags.gearV2;}catch(e){}
  try{if(MAP_TUNE&&MAP_TUNE.gearV2&&MAP_TUNE.gearV2.on===false)return false;}catch(e){}
  return true;
}
function mapZbMinRealm(){
  try{if(MAP_TUNE&&MAP_TUNE.zb&&MAP_TUNE.zb.minRealm!=null)return MAP_TUNE.zb.minRealm|0;}catch(e){}
  return 7; // 元嬰（REALMS idx）
}
function mapZbCarrierMinRealm(){
  try{if(MAP_TUNE&&MAP_TUNE.gearV2&&MAP_TUNE.gearV2.carrierMinRealm!=null)return MAP_TUNE.gearV2.carrierMinRealm|0;}catch(e){}
  return mapZbMinRealm();
}
// 裝備品級可調上限（與至寶物品門檻分開）。null／未設＝只走經濟權重表，map 端不加封頂。
// 例 MAP_TUNE.gearV2.gradeCapBelowRealm={below:7, cap:4}：境界 <7 時最高品級 4。
function mapGearV2GradeCap(realm){
  try{
    const G=MAP_TUNE&&MAP_TUNE.gearV2&&MAP_TUNE.gearV2.gradeCapBelowRealm;
    if(!G||G.below==null||G.cap==null)return 0;
    if((realm|0)<(G.below|0))return Math.max(1,G.cap|0);
  }catch(e){}
  return 0;
}
function mapGearV2RollGrade(realm,sub,src,rng){
  rng=typeof rng==='function'?rng:Math.random;
  let w=[60,26,10,4,0]; // 僅在經濟 API 尚未載入時的後備，與經濟 drop 表預設相同，非寫死規則
  try{
    const api=mapGearV2Api();
    const W=api&&api.GRADE_TUNE&&api.GRADE_TUNE.weight;
    const key=src||'drop';
    if(W){if(W[key])w=W[key].slice();else if(W.drop)w=W.drop.slice();}
  }catch(e){}
  w=w.map(x=>+x||0);
  const cap=mapGearV2GradeCap(realm);
  if(cap>0){for(let i=cap;i<w.length;i++)w[i]=0;}
  let tot=0;for(const x of w)tot+=x;
  if(tot<=0)return 1;
  let x=rng()*tot;
  for(let i=0;i<w.length;i++){x-=w[i];if(x<0)return i+1;}
  return 1;
}
function mapGearV2ApplyGrade(it,realm,sub,src,rng){
  if(!it||!mapGearV2On())return it;
  it.gr=mapGearV2RollGrade(realm,sub,src||'drop',rng);
  const cap=mapGearV2GradeCap(realm);
  if(cap>0&&(it.gr|0)>cap)it.gr=cap;
  return it;
}
// 經濟未提供 econMakeSetDrop；用 dropPool＋既有 makeItem 組副本掉落項
function mapDgLootV2Entries(realm,q){
  if(!mapGearV2On())return [];
  const api=mapGearV2Api();
  if(!api||typeof api.dropPool!=='function')return [];
  let pool=null;
  try{pool=api.dropPool(realm|0);}catch(e){return [];}
  if(!pool)return [];
  const ids=[].concat(pool.w||[],pool.c||[],pool.s||[]);
  const qq=q==null?2:(q|0);
  return ids.filter(Boolean).map(id=>({type:'gear',id:id,q:qq,_v2:1}));
}

function mapDgLootIsClient(){
  try{if(typeof v49Client==='function'&&v49Client())return true;}catch(e){}
  try{if(typeof NET!=='undefined'&&NET&&NET.role==='client')return true;}catch(e){}
  return false;
}
function mapDgLootZbMin(){try{return (MAP_TUNE&&MAP_TUNE.zb&&MAP_TUNE.zb.minRealm)|0||7;}catch(e){return 7;}}
// 副本境界：核心 dgBaseTier（經典＝DG_FIXED_TIER；map 副本＝minRealm）→ 表內 realm 備援
function mapDgLootRealm(kind){
  try{if(typeof dgBaseTier==='function'&&typeof DGS!=='undefined'&&DGS&&DGS[kind])return dgBaseTier(kind)|0;}catch(e){}
  try{if(typeof MAP_DGS!=='undefined'&&MAP_DGS[kind]&&MAP_DGS[kind].minRealm!=null)return MAP_DGS[kind].minRealm|0;}catch(e){}
  const T=MAP_DG_LOOT[kind];return T?(T.realm|0):0;
}
function mapDgLootQiTier(realm){
  let T=null;try{if(typeof TUNE!=='undefined'&&TUNE&&TUNE.v49&&TUNE.v49.qiTier)T=TUNE.v49.qiTier;}catch(e){}
  const F=MAP_DG_LOOT_QI_TIER;const r=Math.min(10,Math.max(0,realm|0));
  const b=(T&&T[r])||F[r];return b?[+b[0],+b[1]]:null;
}
// 16 格新部位（s16:1）只在經濟旗標 econSlot16On() 開時進表；關時濾掉，舊表原樣（機率檔位不變）
function mapDgLootS16On(){try{return typeof econSlot16On==='function'&&!!econSlot16On();}catch(e){return false;}}
function mapDgLootS16View(T,R){
  if(!T)return T;const on=mapDgLootS16On();let need=!on;
  if(on&&R!=null){for(const t of ['bad','mid','good'])for(const x of (T[t]||[]))if(x.s16&&!new RegExp('^eg'+(R|0)+'_').test(x.id)){need=true;break;}}
  if(!need)return T;
  const fix=x=>{if(!x.s16)return x;if(!on)return null;if(R==null||R<0||R>8)return x;const m=/^eg\d+_(head|hands|pants|shoes)$/.exec(x.id);return m?Object.assign({},x,{id:'eg'+(R|0)+'_'+m[1]}):x;};
  const o=Object.assign({},T);for(const t of ['bad','mid','good'])o[t]=(T[t]||[]).map(fix).filter(Boolean);return o;
}
// 沒有表的新副本（例如之後新增的）：用境界最接近的表當範本（不改 MAP_DG_LOOT 本身）

function mapDgLootMergeV2(T,R){
  if(!T||!mapGearV2On())return T;
  const add=function(tier,q){
    const extra=mapDgLootV2Entries(R,q);
    if(!extra.length)return T[tier]||[];
    const have={};
    for(const x of (T[tier]||[]))if(x&&x.id)have[x.id]=1;
    const out=(T[tier]||[]).slice();
    for(const x of extra)if(x&&!have[x.id]){out.push(x);have[x.id]=1;}
    return out;
  };
  const o=Object.assign({},T);
  o.bad=add('bad',1);o.mid=add('mid',2);o.good=add('good',3);
  o._v2=1;
  return o;
}
function mapDgLootFor(kind){
  if(MAP_DG_LOOT[kind])return mapDgLootMergeV2(mapDgLootS16View(MAP_DG_LOOT[kind], mapDgLootRealm(kind)), mapDgLootRealm(kind));
  const R=mapDgLootRealm(kind);let best=null,bd=1e9;
  for(const k in MAP_DG_LOOT){const d=Math.abs((MAP_DG_LOOT[k].realm|0)-R);if(d<bd||(d===bd&&(MAP_DG_LOOT[k].realm|0)<=R)){bd=d;best=MAP_DG_LOOT[k];}}
  if(!best)return null;
  const zbMin=mapDgLootZbMin();
  const strip=L=>R<zbMin?L.filter(x=>x.type!=='treasure'):L;
  return mapDgLootMergeV2(mapDgLootS16View({n:(typeof DGS!=='undefined'&&DGS[kind]&&DGS[kind].n)||kind,realm:R,bad:strip(best.bad),mid:strip(best.mid),good:strip(best.good),_from:Object.keys(MAP_DG_LOOT).find(k=>MAP_DG_LOOT[k]===best)},R),R);
}
// 元嬰／化神新裝備註冊到 GEAR（GEAR 在 g12 宣告，延後安裝；已存在不覆蓋）
function mapDgLootInstallGear(){
  let G=null;try{G=GEAR;}catch(e){return false;}
  if(!G)return false;
  for(const k in MAP_DG_LOOT_NEW_GEAR)if(!G[k])G[k]=JSON.parse(JSON.stringify(MAP_DG_LOOT_NEW_GEAR[k]));
  return true;
}
function mapDgLootEntryName(x){
  try{
    if(x.type==='gear'){mapDgLootInstallGear();const G=GEAR[x.id];if(G&&typeof QN!=='undefined')return QN[x.q]+'・'+G.n;}
    if(x.type==='treasure'){const z=mapZbByTid(x.id);if(z)return z.n;}
    if(x.type==='gongfa'){const A=typeof mapGfApi==='function'?mapGfApi():null;const g=A&&typeof A.get==='function'?A.get(x.id):null;if(g&&g.name)return g.name;}
  }catch(e){}
  return x.name||x.id;
}
function mapDgLootSkills(x,realm){
  if(x.type!=='gongfa'||!x.skills)return null;
  const B=mapDgLootQiTier(realm);const K={fireball:0,guard:0.3,flysword:0.6,jindan:1};
  return x.skills.map(s=>{if(s.ab==='charge'||s.ab==='sweep')return {ab:s.ab,n:s.n,qi:0};
    if(!B)return {ab:s.ab,n:s.n,qi:s.qi};
    const q=Math.round(B[0]+(B[1]-B[0])*(K[s.ab]!=null?K[s.ab]:0.5));return {ab:s.ab,n:s.n,qi:Math.max(B[0],Math.min(B[1],q))};});
}
/** 副本介紹用：回傳 [{tier,tierN,type,typeN,id,q,name,p,bossP,skills}]；opts.tier 可只取一檔 */
function mapDgLootList(kind,opts){
  opts=opts||{};const T=mapDgLootFor(kind);if(!T)return [];
  const R=mapDgLootRealm(kind),zbMin=mapDgLootZbMin();const out=[];
  for(const t of ['good','mid','bad']){
    if(opts.tier&&opts.tier!==t)continue;
    const L=(T[t]||[]).filter(x=>!(x.type==='treasure'&&R<zbMin));
    for(const x of L){
      const o={tier:t,tierN:MAP_DG_LOOT_TIER_N[t],type:x.type,typeN:MAP_DG_LOOT_TYPE_N[x.type]||x.type,id:x.id,name:mapDgLootEntryName(x),
        p:MAP_DG_LOOT_RATES[t]/L.length,bossP:MAP_DG_LOOT_BOSS_RATES[t]/L.length};
      if(x.q!=null)o.q=x.q;
      const sk=mapDgLootSkills(x,R);if(sk)o.skills=sk;
      out.push(o);
    }
  }
  return out;
}
function mapDgLootRollTier(boss,rng){
  const r=(typeof rng==='function'?rng:Math.random)();const W=boss?MAP_DG_LOOT_BOSS_RATES:MAP_DG_LOOT_RATES;
  if(r<W.good)return 'good';if(r<W.good+W.mid)return 'mid';return 'bad';
}
// 擲一次：回傳 {tier,entry}（不發放）。元嬰以下即使表被改到也不出至寶（換成同檔裝備）
function mapDgLootPick(kind,boss,rng){
  rng=typeof rng==='function'?rng:Math.random;
  const T=mapDgLootFor(kind);if(!T)return null;
  const R=mapDgLootRealm(kind),zbMin=mapDgLootZbMin();
  const tier=mapDgLootRollTier(!!boss,rng);
  let L=(T[tier]||[]).slice();
  if(R<zbMin)L=L.filter(x=>x.type!=='treasure');
  if(!L.length)return null;
  let e=L[Math.floor(rng()*L.length)%L.length];
  return {tier,entry:e,realm:R};
}
// 雷劫減傷詞條（隊長 20:03 定案）：每件 0.2～1%，品級越高數值越高（凡品 0.2…仙器 1.0，每品一段 0.16）；
// 全身合計封頂 5%、所有來源合計封頂 40% 屬穿戴／結算端（econ／cult），不在掉落處理。
// 目前 econ 詞條池沒有此詞條；詞條仍由 econ 產生（每件 4 條），這裡只把數值夾進該品級的區間。
function mapDgLootTribBand(q){
  const qq=Math.max(0,Math.min(5,q==null?5:(q|0)));const hi=Math.round((0.2+0.16*qq)*100)/100;
  return [qq===0?0.2:Math.round((hi-0.16)*100)/100,hi];
}
function mapDgLootClampTrib(it){
  try{
    const A=it&&it.affixes;if(!Array.isArray(A))return it;
    const B=mapDgLootTribBand(it.q);let seen=false;
    for(const a of A){
      const isT=/雷劫/.test(a.name||'')||/trib|thunder|leijie/i.test(a.k||'');
      if(!isT)continue;
      if(seen){a.v=0;continue;} // 每件只算一條
      seen=true;a.v=Math.round(Math.max(B[0],Math.min(B[1],+a.v||0))*100)/100;
    }
  }catch(e){}
  return it;
}
function mapDgLootPlayer(){try{return typeof player==='function'?player():null;}catch(e){return null;}}
function mapDgLootFallbackGear(T,tier){
  const L=(T&&T[tier]||[]).filter(x=>x.type==='gear');return L.length?L[Math.floor(Math.random()*L.length)]:null;
}
// 發放：裝備進本次戰利品（D.loot.items，照現有撤離／倒下規則）；功法經 XW_GF.grant 進宗門行囊（重複就是多一本）；至寶進 S.zb.inv
function mapDgLootGrant(kind,pick,ctx){
  ctx=ctx||{};if(!pick||!pick.entry)return null;
  let e=pick.entry;const T=mapDgLootFor(kind);
  if(e.type==='treasure'){
    if(pick.realm<mapDgLootZbMin()){e=mapDgLootFallbackGear(T,pick.tier);if(!e)return null;}
    else if(typeof mapFlag==='function'&&!mapFlag('zhibao')){const g=mapDgLootFallbackGear(T,pick.tier);if(g)e=g;}
  }
  const D=(typeof S!=='undefined'&&S)?S.dg:null;const res={tier:pick.tier,type:e.type,id:e.id,name:mapDgLootEntryName(e)};
  if(e.type==='gear'){
    mapDgLootInstallGear();
    if(typeof makeItem!=='function'||typeof GEAR==='undefined'||!GEAR[e.id])return null;
    const it=makeItem(e.id,e.q|0,Math.random()<0.35?Math.floor(Math.random()*5):-1);
    try{if(mapGearV2On())mapGearV2ApplyGrade(it,pick.realm,0,'drop');}catch(eG){}
    mapDgLootClampTrib(it);it.dgLoot=pick.tier;
    if(D&&D.loot&&Array.isArray(D.loot.items)&&!ctx.direct)D.loot.items.push(it);
    else{
      let put=false;
      try{
        const api=typeof mapStoreApi==='function'?mapStoreApi():null;
        if(api&&typeof api.invAdd==='function'){const r=api.invAdd(it,'dgLoot');put=!!(r&&r.ok);}
      }catch(e){}
      if(!put){
        if(typeof addItem==='function')addItem(it);
        else if(S&&Array.isArray(S.inv))S.inv.push(it);
      }
    }
    res.item=it;
  }else if(e.type==='gongfa'){
    const u=ctx.unit||mapDgLootPlayer();
    const r=typeof mapGfGrant==='function'?mapGfGrant(u,e.id,'dgLoot:'+kind):{ok:false,reason:'no_fn'};
    res.ok=!!(r&&r.ok);res.via=r&&r.via;
  }else if(e.type==='treasure'){
    if(typeof mapZbInst!=='function'||typeof mapZbLootToInv!=='function')return null;
    const inst=mapZbInst(e.id,Math.random);mapDgLootClampTrib(inst);mapZbLootToInv(inst,'dgLoot');
    try{mapEmit('map:zb:drop',{tid:inst.tid,src:'dgLoot',kind});}catch(er){}
    res.inst=inst.id;
  }
  try{if(D&&D.loot){D.loot.misc=D.loot.misc||{};D.loot.misc.dgLootN=(D.loot.misc.dgLootN|0)+1;}}catch(er){}
  try{mapEmit('map:dg:loot',{kind,tier:res.tier,type:res.type,id:res.id});}catch(er){}
  try{if(typeof floater==='function'&&ctx.x!=null){const c={good:'#ffd34d',mid:'#7fb6ff',bad:'#cfc6b0'}[res.tier];floater(ctx.x,ctx.y-0.4,'獲得 '+res.name+'（'+MAP_DG_LOOT_TIER_N[res.tier]+'）',c);}}catch(er){}
  return res;
}
function mapDgLootRoll(kind,opts){
  opts=opts||{};if(!mapDgLootOn())return null;if(mapDgLootIsClient()&&!opts.force)return null;
  const pk=mapDgLootPick(kind,!!opts.boss,opts.rng);if(!pk)return null;
  return mapDgLootGrant(kind,pk,opts);
}
// 測試用：只統計不發放
function mapDgLootSim(kind,n,boss){
  const R=mapDgLootRealm(kind);const c={bad:0,mid:0,good:0,gear:0,gongfa:0,treasure:0,ids:{}};
  for(let i=0;i<n;i++){const p=mapDgLootPick(kind,boss);if(!p)continue;let e=p.entry;if(e.type==='treasure'&&R<mapDgLootZbMin())e={type:'gear'};c[p.tier]++;c[e.type]++;c.ids[e.id]=(c.ids[e.id]|0)+1;}
  return c;
}
// ---- 掛鉤 ----
const MAP_DG_LOOT_ROOMS=new WeakMap(); // D → Set(已擲房)，只存在記憶體；讀檔回到副本時已清房先標記，不重擲
function mapDgLootRoomsFor(D){
  let s=MAP_DG_LOOT_ROOMS.get(D);
  if(!s){s=new Set();MAP_DG_LOOT_ROOMS.set(D,s);
    try{const rooms=D.L&&D.L.rooms||[];for(let i=0;i<rooms.length;i++)if(rooms[i].state==='clear')s.add(i);}catch(e){}}
  return s;
}
// 只在「打過（fight）→ 清除（clear）」時擲；強制清房（直入首領、聯機收尾）不給房間掉落
const MAP_DG_LOOT_FOUGHT=new WeakMap();
// dgUpdate 前先記下正在打的房（同一幀內 fight→clear 也接得到）
function mapDgLootMarkFight(){
  if(typeof S==='undefined'||!S||!S.dg)return;const D=S.dg;const rooms=D.L&&D.L.rooms;if(!rooms)return;
  mapDgLootRoomsFor(D);
  let f=MAP_DG_LOOT_FOUGHT.get(D);if(!f){f=new Set();MAP_DG_LOOT_FOUGHT.set(D,f);}
  for(let i=0;i<rooms.length;i++)if(rooms[i].state==='fight')f.add(i);
}
function mapDgLootTickRooms(){
  if(typeof S==='undefined'||!S||!S.dg||!mapDgLootOn()||mapDgLootIsClient())return;
  const D=S.dg;const rooms=D.L&&D.L.rooms;if(!rooms||!rooms.length)return;
  const done=mapDgLootRoomsFor(D);
  let f=MAP_DG_LOOT_FOUGHT.get(D);if(!f){f=new Set();MAP_DG_LOOT_FOUGHT.set(D,f);}
  for(let i=0;i<rooms.length;i++){const r=rooms[i];
    if(r.state==='fight'){f.add(i);continue;}
    if(done.has(i)||r.state!=='clear')continue;done.add(i);
    if(r.boss||!f.has(i))continue; // 首領房由 dgBossDown 擲
    mapDgLootRoll(D.kind,{boss:false,x:r.cx,y:r.cy});
  }
}

// 戰利品入宗門倉：走 XW_STORE.add／invAdd。
// 失敗分支（kind==='xf' && !cleared）不入倉、不呼叫 restore、不改 D.loot。
// 靈石：xfSettleOn() 開時只入非靈石，留下 S.dg.loot.res.lingshi 給內層 econ xwsXfHook；
// 函式不存在或旗關時，成功分支照舊由地圖入靈石。不要清／刪 lingshi 鍵（econ 失敗池還要讀）。
function mapXfSettleHost(){
  try{if(typeof window!=='undefined'&&window.XW_STORE)return window.XW_STORE;}catch(e){}
  try{if(typeof XW_STORE!=='undefined'&&XW_STORE)return XW_STORE;}catch(e){}
  return null;
}
function mapXfSettleByEcon(){
  try{if(typeof mapXfSettleByEcon._q==='boolean')return mapXfSettleByEcon._q;}catch(e){}
  try{
    const v=MAP_TUNE&&MAP_TUNE.store&&MAP_TUNE.store.xfSettleByEcon;
    if(v===true)return true;if(v===false)return false;
  }catch(e){}
  try{
    const loc=(typeof location!=='undefined'&&location)||(typeof window!=='undefined'&&window.location)||null;
    const q=loc&&loc.search;
    if(q){
      const m=/[?&]xfsettle=([01]|off|false|on|true)(?:&|$)/i.exec(String(q));
      if(m){
        const s=String(m[1]).toLowerCase();
        if(s==='0'||s==='off'||s==='false')return false;
        if(s==='1'||s==='on'||s==='true')return true;
      }
    }
  }catch(e){}
  try{
    const host=mapXfSettleHost();
    if(host&&typeof host.xfSettleOn==='function'){
      try{return !!host.xfSettleOn();}catch(e){}
    }
  }catch(e){}
  try{if(typeof xfSettleOn==='function')return !!xfSettleOn();}catch(e){}
  return false;
}

// 破關人頭／弟子份額。聯機契約（NET_DG_PARTICIPANTS.md／net35_dgpart）：
// 結算時房主呼叫一次 XW.net.dgParticipants()；份額用 XW.net.dgCredit(pid,{key,n,reason})。
// 弟子數用 XW.net.dgDisciples()（uid 陣列，不含化身）；不存在或回 null 時退回本機算法（排除 u.np）。
// 化身（kind:'disciple' 且帶 u.np）是玩家，出現在 dgParticipants，不算弟子。
// 函式不存在或回 null＝單人，照 1 人（本機主角）。dgCredit 不存在＝照舊本機入帳。
// key 用 'item:xfl'（對齊 XW_STORE.add／net35Legacy /^item:/）。靈石不在此入帳。失敗不結算。
var MAP_DG_PARTY_PENDING=[];
function mapDgPartyOn(){
  try{if(typeof mapDgPartyOn._q==='boolean')return mapDgPartyOn._q;}catch(e){}
  try{
    const loc=(typeof location!=='undefined'&&location)||(typeof window!=='undefined'&&window.location)||null;
    const q=loc&&loc.search;
    if(q){
      const m=/[?&]dgparty=([01]|off|false|on|true)(?:&|$)/i.exec(String(q));
      if(m){
        const v=String(m[1]).toLowerCase();
        if(v==='0'||v==='off'||v==='false')return false;
        if(v==='1'||v==='on'||v==='true')return true;
      }
    }
  }catch(e){}
  try{if(MAP_TUNE&&MAP_TUNE.dgParty&&MAP_TUNE.dgParty.on===true)return true;}catch(e){}
  return false;
}
function mapDgPartyCfg(){
  const d={on:false,perHead:['xfl'],discRatioMin:0.30,discRatioMax:1.00,discDest:'sect'};
  try{if(MAP_TUNE&&MAP_TUNE.dgParty){const T=MAP_TUNE.dgParty;if(T.perHead)d.perHead=T.perHead;if(T.discRatioMin!=null)d.discRatioMin=+T.discRatioMin;if(T.discRatioMax!=null)d.discRatioMax=+T.discRatioMax;if(T.discDest)d.discDest=T.discDest;d.on=T.on===true;}}catch(e){}
  return d;
}
function mapDgNet(){
  try{if(typeof XW!=='undefined'&&XW&&XW.net)return XW.net;}catch(e){}
  try{if(typeof window!=='undefined'&&window.XW&&window.XW.net)return window.XW.net;}catch(e){}
  return null;
}
function mapDgPartyLocalUnit(){
  try{if(typeof player==='function'){const u=player();if(u)return u;}}catch(e){}
  try{
    const units=(typeof S!=='undefined'&&S&&S.units)||[];
    for(let i=0;i<units.length;i++){
      const u=units[i];
      if(u&&(u.kind==='player'||u.isPlayer||u.person==='player'))return u;
    }
    if(units[0])return units[0];
  }catch(e){}
  return null;
}
function mapDgPartySolo(){
  return [{pid:'host',uid:null,isHost:true,unit:mapDgPartyLocalUnit()}];
}
function mapDgPartyPlayers(){
  try{
    const net=mapDgNet();
    if(net&&typeof net.dgParticipants==='function'){
      const list=net.dgParticipants();
      if(list==null)return mapDgPartySolo();
      if(Array.isArray(list)&&list.length)return list;
      return mapDgPartySolo();
    }
  }catch(e){}
  return mapDgPartySolo();
}
function mapDgPartyCreditLocal(payload){
  payload=payload||{};
  const key=payload.key||'item:xfl';
  const n=+payload.n||0;
  const reason=payload.reason||'dgParty';
  if(!(n>0))return {ok:false};
  try{
    const api=typeof mapStoreApi==='function'?mapStoreApi():null;
    if(api&&typeof api.add==='function'){
      const r=api.add(key,n,reason);
      return {ok:!!(r&&r.ok),via:'store',r:r};
    }
  }catch(e){}
  try{
    if(typeof S!=='undefined'&&S){
      S.items=S.items||{};
      const ik=key.indexOf('item:')===0?key.slice(5):key;
      S.items[ik]=(S.items[ik]||0)+n;
      return {ok:true,via:'items'};
    }
  }catch(e){}
  return {ok:false};
}
function mapDgPartyCredit(pid,payload){
  payload=payload||{};
  try{
    const net=mapDgNet();
    if(net&&typeof net.dgCredit==='function'){
      return net.dgCredit(pid,{key:payload.key,n:payload.n,reason:payload.reason});
    }
  }catch(e){}
  return mapDgPartyCreditLocal(payload);
}
function mapDgPartyHasCredit(){
  try{
    const net=mapDgNet();
    return !!(net&&typeof net.dgCredit==='function');
  }catch(e){}
  return false;
}
function mapDgPartyDisciplesFromNet(){
  try{
    const net=mapDgNet();
    if(net&&typeof net.dgDisciples==='function'){
      const list=net.dgDisciples();
      if(list==null)return null;
      if(Array.isArray(list))return list;
    }
  }catch(e){}
  return null;
}
function mapDgPartyIsAvatar(u){
  try{return !!(u&&u.np);}catch(e){}
  return false;
}
function mapDgPartyDiscipleCountLocal(players){
  try{
    if(typeof S!=='undefined'&&S&&Array.isArray(S.units)&&S.units.length){
      let n=0;
      for(let i=0;i<S.units.length;i++){
        const u=S.units[i];
        // 化身帶 u.np，是玩家（進 dgParticipants），不要算進弟子數
        if(u&&u.kind==='disciple'&&!mapDgPartyIsAvatar(u))n++;
      }
      return n;
    }
  }catch(e){}
  try{
    const D=(typeof S!=='undefined'&&S)?S.dg:null;
    const pn=(players&&players.length)||1;
    if(D&&D.party>0)return Math.max(0,(D.party|0)-pn);
  }catch(e){}
  return 0;
}
function mapDgPartyDiscipleCount(players){
  try{
    const list=mapDgPartyDisciplesFromNet();
    if(Array.isArray(list))return list.length;
  }catch(e){}
  return mapDgPartyDiscipleCountLocal(players);
}
function mapDgPartyRollRatio(){
  try{if(typeof mapDgPartyRollRatio._q==='number'&&isFinite(mapDgPartyRollRatio._q))return mapDgPartyRollRatio._q;}catch(e){}
  const C=mapDgPartyCfg();
  let lo=+C.discRatioMin,hi=+C.discRatioMax;
  if(!isFinite(lo))lo=0.30;if(!isFinite(hi))hi=1;
  if(lo>hi){const t=lo;lo=hi;hi=t;}
  lo=Math.max(0,lo);hi=Math.min(1,hi);
  let r=0.3;
  try{r=(typeof rnd==='function')?rnd():Math.random();}catch(e){r=Math.random();}
  return lo+(hi-lo)*r;
}
function mapDgPartyDiscipleShares(nDisc,ratio){
  nDisc=+nDisc||0;ratio=+ratio;
  if(!(nDisc>0)||!isFinite(ratio))return 0;
  return Math.round(ratio*nDisc);
}
function mapDgPartyPending(){
  return MAP_DG_PARTY_PENDING.slice();
}
function mapDgPartyNotePending(rec){
  try{
    MAP_DG_PARTY_PENDING.push(rec);
    const D=(typeof S!=='undefined'&&S)?S.dg:null;
    if(D){
      D._mapDgPartyPending=D._mapDgPartyPending||[];
      D._mapDgPartyPending.push(rec);
    }
  }catch(e){}
}
function mapDgPartyTrySettle(D,opt){
  opt=opt||{};
  try{
    if(!mapDgPartyOn()&&!opt.force)return null;
    D=D||((typeof S!=='undefined'&&S)?S.dg:null);
    if(!D)return {ok:false,reason:'no-dg'};
    if(opt.fail||D._mapDgPartySettled)return {ok:false,reason:'skip'};
    const C=mapDgPartyCfg();
    const keys=C.perHead||['xfl'];
    const players=mapDgPartyPlayers();
    const hasCredit=mapDgPartyHasCredit();
    const out={ok:true,players:players.length,credits:[],disc:0,discRatio:0,pending:[]};
    for(let i=0;i<keys.length;i++){
      const raw=keys[i];
      const key=raw==='xfl'||raw==='item:xfl'?'item:xfl':(String(raw).indexOf(':')>=0?String(raw):('item:'+raw));
      const reason='dgParty:'+(raw==='item:xfl'?'xfl':raw);
      if(hasCredit){
        for(let p=0;p<players.length;p++){
          const pid=players[p]&&players[p].pid!=null?players[p].pid:'host';
          try{mapDgPartyCredit(pid,{key:key,n:1,reason:reason});}catch(e){}
          out.credits.push({pid:pid,key:key,n:1});
        }
      }else{
        // 聯機入帳函式不存在：照舊本機入帳一次（不依人數加倍）
        try{mapDgPartyCreditLocal({key:key,n:1,reason:reason});}catch(e){}
        out.credits.push({pid:'host',key:key,n:1,via:'local'});
      }
    }
    const nDisc=mapDgPartyDiscipleCount(players);
    const ratio=mapDgPartyRollRatio();
    const nShare=mapDgPartyDiscipleShares(nDisc,ratio);
    out.disc=nShare;out.discRatio=ratio;out.nDisc=nDisc;
    if(nShare>0){
      for(let i=0;i<keys.length;i++){
        const raw=keys[i];
        const key=raw==='xfl'||raw==='item:xfl'?'item:xfl':(String(raw).indexOf(':')>=0?String(raw):('item:'+raw));
        const reason='dgParty:'+(raw==='item:xfl'?'xfl':raw)+':disciple';
        const rec={key:key,n:nShare,reason:reason,dest:'sect',confirm:'captain',pending:true};
        try{mapDgPartyCreditLocal({key:key,n:nShare,reason:reason});}catch(e){}
        mapDgPartyNotePending(rec);
        out.pending.push(rec);
      }
    }
    try{D._mapDgPartySettled=1;}catch(e){}
    return out;
  }catch(e){
    try{console.warn('[dgParty]',e);}catch(e2){}
    return {ok:false,error:true};
  }
}

function mapStoreIsLingshiKey(k){k=String(k||'');return k==='lingshi'||k==='xia'||k==='zhong'||k==='shang'||k==='ji';}
function mapStoreApplyDgLoot(L,reason,opt){
  const api=typeof mapStoreApi==='function'?mapStoreApi():null;
  if(!api||!L)return null;
  reason=reason||'dgExit';opt=opt||{};
  const skipLs=!!opt.skipLingshi;
  const got=[];
  try{
    if(L.res){
      for(const k in L.res){
        if(skipLs&&mapStoreIsLingshiKey(k))continue;
        const n=+L.res[k]||0;if(!(n>0))continue;
        const key=k==='lingshi'||k==='xia'?'lingshi':k;
        if(typeof api.add==='function'){
          const r=api.add(key,n,reason);
          if(r&&r.ok)got.push(key+' '+n);
        }
      }
    }
    if(L.mats){
      for(const k in L.mats){
        const n=+L.mats[k]||0;if(!(n>0))continue;
        if(typeof api.add==='function'){
          const r=api.add('mat:'+k,n,reason);
          if(r&&r.ok)got.push('mat:'+k+' '+n);
        }
      }
    }
    if(Array.isArray(L.items)){
      for(const it of L.items){
        if(!it)continue;
        if(typeof api.invAdd==='function'){
          const r=api.invAdd(it,reason);
          if(r&&r.ok)got.push((it.n||it.id||'item')+'');
        }else if(typeof addItem==='function'){addItem(it);got.push((it.n||it.id||'item')+'');}
        else if(typeof S!=='undefined'&&S&&Array.isArray(S.inv)){S.inv.push(it);got.push((it.n||it.id||'item')+'');}
      }
    }
    if(L.misc){
      const M=L.misc;
      if(M.miji&&typeof api.add==='function'){api.add('item:miji',M.miji,reason);got.push('武學秘籍');}
      if(M.gongfa&&typeof api.add==='function'){api.add('item:gongfa',M.gongfa,reason);got.push('功法');}
      if(M.xfl&&!(opt&&opt.skipXfl)&&typeof api.add==='function'){
        let pid=null;
        try{if(typeof mapStoreOwnerPid==='function')pid=mapStoreOwnerPid();}catch(e){}
        if(pid==null){
          try{const u=typeof player==='function'?player():null;if(u){if(u.np)pid=u.np;else if(u.id!=null)pid=u.id;}}catch(e){}
        }
        api.add('item:xfl',1,pid!=null?{owner:pid,reason:reason}:{reason:reason});
        got.push('仙凡令');
      }
    }
  }catch(e){try{console.warn('[singlestore loot]',e);}catch(e2){}}
  return got;
}
function mapStoreZeroDgLootApplied(L,opt){
  if(!L)return;
  opt=opt||{};
  let keep=null;
  try{
    if(opt.keepLingshi&&L.res){
      keep={};
      for(const k in L.res)if(mapStoreIsLingshiKey(k))keep[k]=L.res[k];
    }
  }catch(e){}
  try{L.res={};}catch(e){}
  try{if(keep){for(const k in keep)L.res[k]=keep[k];}}catch(e){}
  try{L.mats={};}catch(e){}
  try{L.items=[];}catch(e){}
  try{if(L.misc){L.misc.miji=0;L.misc.gongfa=0;L.misc.xfl=0;}}catch(e){}
}
function mapStoreInstallDgExit(){
  try{
    if(typeof dgExit!=='function'||dgExit._mapSingleStore)return !!(typeof dgExit==='function'&&dgExit._mapSingleStore);
    const _ex=dgExit;
    dgExit=function(keep){
      let toastOrig=null;
      try{
        const api=typeof mapStoreApi==='function'?mapStoreApi():null;
        const D=(typeof S!=='undefined'&&S)?S.dg:null;
        const xfFail=!!(D&&D.kind==='xf'&&!D.cleared);
        const econLs=typeof mapXfSettleByEcon==='function'&&mapXfSettleByEcon();
        // 失敗：不入倉、不碰 D.loot（靈石若由經濟累積／結算，留給經濟掛鉤）。
        // 成功：旗開則只入非靈石，D.loot.res.lingshi 留給經濟（不重複入倉、不提前清掉以免漏扣）。
        if(api&&D&&D.loot&&keep&&!xfFail){
          let party=null;
          try{if(typeof mapDgPartyTrySettle==='function')party=mapDgPartyTrySettle(D);}catch(e){}
          const skipXfl=!!(party&&party.ok);
          const got=mapStoreApplyDgLoot(D.loot,'dgExit',{skipLingshi:!!econLs,skipXfl:skipXfl})||[];
          mapStoreZeroDgLootApplied(D.loot,{keepLingshi:!!econLs});
          if(typeof toast==='function'&&got.length){
            toastOrig=toast;
            toast=function(msg){
              try{
                if(typeof msg==='string'&&msg.indexOf('沒有戰利品')>=0)
                  msg=msg.replace('沒有戰利品',got.slice(0,8).join('、')+(got.length>8?'…':''));
              }catch(e){}
              return toastOrig.apply(this,arguments);
            };
          }
        }else if(D&&keep&&!xfFail){
          try{if(typeof mapDgPartyTrySettle==='function')mapDgPartyTrySettle(D);}catch(e){}
        }
      }catch(e){try{console.warn('[singlestore dgExit]',e);}catch(e2){}}
      try{return _ex.apply(this,arguments);}
      finally{try{if(toastOrig)toast=toastOrig;}catch(e){}}
    };
    dgExit._mapSingleStore=1;
    return true;
  }catch(e){return false;}
}
function mapDgLootInstall(){
  let n=0;
  try{
    if(typeof dgBossDown==='function'&&!dgBossDown._mapDgLoot){
      const _bd=dgBossDown;
      dgBossDown=function(e){
        const D=(typeof S!=='undefined'&&S)?S.dg:null;const was=!!(D&&D.cleared);
        const r=_bd.apply(this,arguments);
        try{if(D&&!was&&D.kind){const s=mapDgLootRoomsFor(D);const rooms=D.L&&D.L.rooms||[];const bi=rooms.length-1;
          if(!s.has('boss')){s.add('boss');if(bi>=0)s.add(bi);mapDgLootRoll(D.kind,{boss:true,x:e&&e.x,y:e&&e.y});}}}catch(err){console.warn('[dgLoot]',err);}
        return r;
      };
      dgBossDown._mapDgLoot=1;n++;
    }
  }catch(e){}
  try{
    if(typeof dgUpdate==='function'&&!dgUpdate._mapDgLoot){
      const _du=dgUpdate;
      dgUpdate=function(){
        try{mapDgLootMarkFight();}catch(err){}
        const r=_du.apply(this,arguments);
        try{mapDgLootTickRooms();}catch(err){}
        return r;
      };
      dgUpdate._mapDgLoot=1;n++;
    }
  }catch(e){}
  mapDgLootInstallGear();
  try{mapStoreInstallDgExit();}catch(e){}
  mapDgLootInstall._ok=!!(typeof dgBossDown==='function'&&dgBossDown._mapDgLoot&&typeof dgUpdate==='function'&&dgUpdate._mapDgLoot);
  return n;
}
try{mapDgLootInstall();}catch(e){}
if(typeof setTimeout==='function'){
  setTimeout(function mapDgLootRetry(){
    try{mapDgLootInstall();}catch(e){}
    try{mapStoreInstallDgExit();}catch(e){}
    try{if(typeof window!=='undefined'){window.MAP_DG_LOOT=MAP_DG_LOOT;window.mapDgLootList=mapDgLootList;window.XWMAP&&(window.XWMAP.dgLootList=mapDgLootList,window.XWMAP.dgLootRoll=mapDgLootRoll,window.XWMAP.dgLootSim=mapDgLootSim);}}catch(e){}
    if(!mapDgLootInstall._ok||(typeof dgExit==='function'&&!dgExit._mapSingleStore))setTimeout(mapDgLootRetry,500);
  },0);
}
