
// ================== v0.4.5：境界小階段、修煉節奏、丹藥、裝備、煉丹房／鍛造坊 ==================
// 節奏數值（全部可在這裡調整）
Object.assign(TUNE,{
  xiuMul:0.45,        // 所有修為獲得 ×0.45（約為 v0.4.0 的 45%）
  xiuBase:45,         // 武徒初期需要的修為
  xiuGrow:1.19,       // 每一個小階段需求 ×1.19（指數曲線；12 個小階段≈×8）
  xiuXian:[1,1,1,1,1.5,2.0,2.5],  // 各大境界額外倍率（煉氣 ×1.5、築基 ×2、金丹 ×2.5）
  subBonus:0.04,      // 小階段提升：氣血／攻擊 +4%
  breakFail:[0.05,0.05,0.10,0.18,0.40,0.50],  // 大境界突破基礎失敗率（從 r 突破到 r+1；宗師→煉氣另有公式）
  breakFailLoss:0.30, // 失敗損失 3 成修為
  lianqiLs:20,zhujiLs:50,jindanLs:120,highLs:{6:300,7:700,8:1500,9:3000},
  elWin:1.25,elLose:0.85,   // 五行相剋（GDD：待測試，先用溫和數值）
  craftBase:{pill:22,gear:26}, // 煉製基本秒數
  dgCooldown:90,        // 副本冷卻（秒）
  invCap:60
});
const SUB_N=4;
const KE={0:1,1:4,2:3,3:0,4:2};   // 金剋木、木剋土、水剋火、火剋金、土剋水
function elMul(a,b){if(a==null||b==null||a<0||b<0)return 1;if(KE[a]===b)return TUNE.elWin;if(KE[b]===a)return TUNE.elLose;return 1;}
const EL_COL=['#e8e0b0','#7fd38a','#7fb6ff','#ff8a5a','#c9a060'];
Object.assign(ENEMY.wolf,{el:1});Object.assign(ENEMY.boar,{el:4});Object.assign(ENEMY.tiger,{el:0});Object.assign(ENEMY.king,{el:4});
Object.assign(ENEMY,{
  golem:{n:'遺跡石傀',hp:140,atk:12,spd:1.7,r:0.36,xiu:30,aggro:7,leash:30,el:4,look:'golem'},
  wisp:{n:'幽冥鬼火',hp:60,atk:10,spd:2.6,r:0.26,xiu:22,aggro:8,leash:30,el:3,look:'wisp'},
  warden:{n:'地牢牢頭',hp:520,atk:20,spd:2.3,r:0.32,xiu:150,aggro:9,leash:40,human:true,boss:true},
  xfboss:{n:'守門天將',hp:1800,atk:34,spd:2.1,r:0.5,xiu:400,aggro:12,leash:60,el:0,boss:true,look:'golem'},
  xfguard:{n:'仙門金甲衛',hp:260,atk:21,spd:2.4,r:0.34,xiu:60,aggro:10,leash:50,el:0,look:'golem'}
});

// ---- 境界 ----
function realmName(u){const R=REALMS[u.realm];return (R.full&&u.realm>=REALMS.length-1?R.full:R.n)+(u.realm<=MAX_REALM?SUB[u.sub||0]:'');}
function capped(u){return u.realm>=MAX_REALM&&(u.sub||0)>=SUB_N-1&&u.xiu>=needXiu(u);}
function xiuIdx(r,s){return r*SUB_N+(s||0);}
function needAt(r,s){return Math.round(TUNE.xiuBase*Math.pow(TUNE.xiuGrow,xiuIdx(r,s))*(TUNE.xiuXian[r]||3));}
needXiu=function(u){return needAt(Math.min(u.realm,MAX_REALM),u.sub||0);};
function cumXiu(r,s){let t=0;for(let k=0;k<xiuIdx(r,s);k++)t+=needAt(Math.floor(k/SUB_N),k%SUB_N);return t;}
function stripGear(u){const g=u.gb;if(!g)return;u.atk=+(u.atk-g.atk).toFixed(1);u.maxhp=Math.round(u.maxhp-g.hp);u.speed=+(u.speed-g.spd).toFixed(2);u.def=0;u.gb=null;}
function advanceSub(u){stripGear(u);u.sub=(u.sub||0)+1;u.xiu=0;const m=1+TUNE.subBonus;u.maxhp=Math.round(u.maxhp*m);u.atk=+(u.atk*m).toFixed(1);gearApply(u);u.hp=Math.min(u.maxhp,u.hp+u.maxhp*0.2);
  floater(u.x,u.y,SUB[u.sub]+'！','#bfe8ff');fx('ring',u.x,u.y,'#bfe8ff');if(u.kind==='player'||selUnits.includes(u.id))toast(`${nm(u)}修為精進：${realmName(u)}`);}
gainXiu=function(u,amt){
  if(!u||capped(u))return;amt*=TUNE.xiuMul;if(u.tox)amt*=1;
  const need=needXiu(u),was=u.xiu>=need;u.xiu=Math.min(need,u.xiu+amt);
  if(u.xiu<need)return;
  if((u.sub||0)<SUB_N-1){advanceSub(u);return;}
  if(was||u.realm>=MAX_REALM)return;
  const c=breakConds(u);
  if(c.auto&&c.ok){tryBreak(u,true);}
  else if(u.kind==='player'||selUnits.includes(u.id))toast(`${nm(u)}${realmName(u)}，可以嘗試突破「${realmNextName(u.realm)}」${c.ok?'（按「突破」）':'（條件未滿，見修煉面板）'}`);
};
function pillN(k){const a=S.pills[k];return a?a[0]+a[1]+a[2]:0;}
function takePill(k){const a=S.pills[k];if(!a)return -1;for(let q=2;q>=0;q--)if(a[q]>0){a[q]--;return q;}return -1;}
function breakFail(u){const r=u.realm;let f;
  if(r===3)f=lianqiFail(u);
  else f=(TUNE.breakFail[r]||0.6)-u.wu*0.002-u.luck*0.0008-(isXW(u)?0.08:0);
  f-=(u.tpB||0);if(r===4||r===5){const k=r===4?'zj':'ny',a=S.pills[k];if(a&&a[2])f-=0.08;else if(a&&a[1])f-=0.04;}
  return clamp(f,r<=1?0.02:0.04,0.9);}
breakConds=function(u){
  const r=u.realm,list=[];if(r>=MAX_REALM)return {ok:false,list:[{t:'已達本版本最高境界（地仙之後請走踏仙梯）',ok:false}],auto:false,fail:0};
  const sub=u.sub||0;
  list.push({t:`修為圓滿（${SUB[sub]} ${Math.floor(u.xiu)}/${needXiu(u)}）`,ok:sub>=SUB_N-1&&u.xiu>=needXiu(u)});
  if(r===1)list.push({t:'宗門建有「練武閣」',ok:hasBuilt('lianwu')});
  if(r===2)list.push({t:`宗門持有「武學秘籍」（長書閣研究／村莊任務／遺跡）目前 ${S.items.miji}`,ok:S.items.miji>0});
  if(r===3){list.push({t:`持有「功法」（遺跡可得）目前 ${S.items.gongfa}`,ok:S.items.gongfa>0});
    list.push({t:u.lg?`身具靈根（${lgName(u.lg)}）`:`仙緣 ≥ ${lianqiNeedXY(u)}（目前 ${u.xy}${isXW(u)?'，仙武之體門檻減半':''}）`,ok:!!u.lg||u.xy>=lianqiNeedXY(u)});
    // singlestore（API.md／經濟 g.diff）：仙凡令＝該成員行囊＋宗門倉合計；弟子只算倉；無 API 或 ?singlestore=0 照舊讀 S.items.xfl
    {const xfOwner=u.np!=null?u.np:u.id;const xfN=typeof xwItemCount==="function"?xwItemCount("item:xfl",xfOwner):(typeof XW_STORE!=="undefined"&&XW_STORE&&typeof XW_STORE.count==="function"?XW_STORE.count("item:xfl",{owner:xfOwner}):(S.items.xfl||0));
    list.push({t:`「仙凡令」（闖過副本「仙凡之門」取得）目前 ${xfN}`,ok:xfN>0});}
    list.push({t:`靈石 ${TUNE.lianqiLs}（突破時消耗，目前 ${Math.floor(S.res.lingshi)}）`,ok:S.res.lingshi>=TUNE.lianqiLs});}
  if(r===4){list.push({t:`築基丹 ×1（煉丹房煉製）目前 ${pillN('zj')}`,ok:pillN('zj')>0});list.push({t:`靈石 ${TUNE.zhujiLs}（目前 ${Math.floor(S.res.lingshi)}）`,ok:S.res.lingshi>=TUNE.zhujiLs});}
  if(r===5){list.push({t:`凝元丹 ×1（煉丹房 Lv3 煉製）目前 ${pillN('ny')}`,ok:pillN('ny')>0});list.push({t:`靈石 ${TUNE.jindanLs}（目前 ${Math.floor(S.res.lingshi)}）`,ok:S.res.lingshi>=TUNE.jindanLs});}
  if(r>=6&&TUNE.highLs&&TUNE.highLs[r]){const L=TUNE.highLs[r];list.push({t:`靈石 ${L}（突破時消耗，目前 ${Math.floor(S.res.lingshi)}）`,ok:S.res.lingshi>=L});}
  return {ok:list.every(c=>c.ok),list,auto:r<=1,fail:breakFail(u)};
};
tryBreak=function(u,auto){
  if(!u||u.dead)return false;
  if((u.sub||0)<SUB_N-1){if(u.xiu>=needXiu(u)){advanceSub(u);return true;}if(!auto)toast(`${nm(u)}修為未滿（${realmName(u)}）`);return false;}
  const c=breakConds(u);
  if(!c.ok){if(!auto)toast(`${nm(u)}尚未滿足突破條件：`+c.list.filter(x=>!x.ok).map(x=>x.t).join('；'));return false;}
  const r=u.realm,f=c.fail;
  if(r===3)S.res.lingshi-=TUNE.lianqiLs;if(r===4){S.res.lingshi-=TUNE.zhujiLs;takePill('zj');}if(r===5){S.res.lingshi-=TUNE.jindanLs;takePill('ny');}if(r>=6&&TUNE.highLs&&TUNE.highLs[r])S.res.lingshi-=TUNE.highLs[r];
  u.tpB=0;
  if(rnd()<f){u.xiu=Math.floor(u.xiu*(1-TUNE.breakFailLoss));u.hp=Math.max(1,Math.floor(u.hp/2));fx('ring',u.x,u.y,'#ff6060');floater(u.x,u.y,'突破失敗','#ff8080');
    toast(`${nm(u)}衝擊「${realmNextName(r)}」失敗，氣血翻湧、修為倒退（失敗率 ${Math.round(f*100)}%）`);return false;}
  if(r===3){const xfOwner=u.np!=null?u.np:u.id;let tk=null;
    try{if(typeof xwItemTake==="function")tk=xwItemTake("item:xfl",1,{owner:xfOwner,reason:"lianqiBreak"});
    else if(typeof XW_STORE!=="undefined"&&XW_STORE&&XW_STORE.take&&(!XW_STORE.enabled||XW_STORE.enabled()))tk=XW_STORE.take("item:xfl",1,{owner:xfOwner,reason:"lianqiBreak"});}catch(e){tk=null;}
    // 先扣該成員行囊再扣宗門倉；不足不連扣；客機 client-readonly 時照舊本機扣（房主快照覆蓋）
    if(!tk||(!tk.ok&&tk.reason!=="insufficient"))S.items.xfl=Math.max(0,(S.items.xfl||0)-1);}
  doBreak(u);return true;
};
doBreak=function(u){
  stripGear(u);const m=xnStepM(u.realm,'hp'),ma=xnStepM(u.realm,'atk');u.realm++;u.sub=0;u.xiu=0;u.maxhp=Math.round(u.maxhp*m);u.atk=+(u.atk*ma).toFixed(1);u.speed=+(u.speed+0.08).toFixed(2);gearApply(u);u.hp=u.maxhp;
  S.stats.breaks++;fx('break',u.x,u.y,'#ffe27a');autoSaveSoon('突破');floater(u.x,u.y,'突破！','#ffe27a');
  const R=REALMS[u.realm];toast(`突破！${nm(u)}晉升「${R.n}」${R.ab?'，領悟「'+(typeof abilName==='function'?abilName(u,R.ab):ABIL[R.ab].n)+'」':''}`);
  if(u.realm>=4&&!S.flags.xian){S.flags.xian=true;setTimeout(()=>toast('宗門踏入修仙階段：住房化為洞府（修煉加成）、可建仙緣閣、求武台可升級為求仙台、山中靈石脈可開採'),600);chunkDirtyAll();}
};
function subLadder(p){if(!p)return '';return '<div class="ladder sub">'+SUB.map((s,k)=>`<span class="${k<(p.sub||0)?'done':k===(p.sub||0)?'cur':''}">${REALMS[p.realm].n}${s}</span>`).join('')+'</div>';}
// 新技能：築基「御劍術」、金丹起「威壓」（鍵名 jindan，顯示名與倍率隨境界）
{const _ta=tryAbilities;tryAbilities=function(u,e,manual){
  if(e&&!u.dash){const d=dist(u.x,u.y,e.x,e.y);
    if(hasAb(u,'jindan')&&!(u.acd.jindan>0)){const near=S.enemies.filter(x=>dist(u.x,u.y,x.x,x.y)<2.5);if(near.length>=2||(manual&&near.length)){u.acd.jindan=ABIL.jindan.cd;fx('break',u.x,u.y,'#ffe27a');floater(u.x,u.y,typeof abilName==='function'?abilName(u,'jindan'):'金丹威壓','#ffe27a');near.forEach(x=>{dmgEnemy(u,x,skillDmg(u,'jindan'),'#ffe27a');if(!x.dead){if(typeof xnStun==='function')xnStun(x,1.2,u);else x.stun=1.2;}});return true;}}
    if(hasAb(u,'flysword')&&!(u.acd.flysword>0)&&d<=8&&los(u.x,u.y,e.x,e.y,0.05)){projectiles.push({x:u.x,y:u.y,tid:e.id,src:u.id,dmg:skillDmg(u,'flysword'),t:0,sword:1});u.acd.flysword=ABIL.flysword.cd;u.anim=0.3;faceTo(u,e.x,e.y);floater(u.x,u.y,'御劍','#bfffd8');return true;}}
  return _ta(u,e,manual);};}

// ---- 材料、丹藥、丹方 ----
const MAT_NAMES={hide:'獸皮',bone:'獸骨',core:'妖丹',lingzhi:'靈芝',xuantie:'玄鐵'};
/* 貴重分類只依 /workspace/xianwu_records/specs/REALM_MATERIALS_20261113.txt，不新增表內尚未實裝的材料。
   hide 獸皮 → 表內常規「野狼皮」（武徒）；bone 獸骨 → 表中無此名（不進閘門）；
   core 妖丹 → 表內唯一「妖丹」條目為貴重「蠻牛妖丹」（大武師）；
   lingzhi 靈芝 → 表中無此名（不進閘門）；xuantie 玄鐵 → 對應常規「玄鐵砂／玄重鐵」，不與貴重「黑曜精鐵」視為同一項。
   裝備與功法仍走共用 2% 閘門。 */
const MAT_PRECIOUS={core:1};
function matIsPrecious(k){return !!(typeof MAT_PRECIOUS!=='undefined'&&MAT_PRECIOUS[k]);}
const MAT_DESC={hide:'妖獸的皮，可做拳套、皮甲',bone:'妖獸骨頭，入藥或做護符',core:'妖獸體內的內丹，煉丹與注入五行用',lingzhi:'稀有靈藥，副本與奇遇可得，煉築基丹必需',xuantie:'深藏地底的玄鐵，煉凝元丹、打造法器與法寶用'};
const PQ=['下品','中品','上品'];
const PILLS={
  hx:{n:'回血丹',cost:{herb:3},diff:0,desc:'立刻恢復氣血（下 35%／中 50%／上 70%）'},
  jq:{n:'聚氣丹',cost:{herb:5,lingshi:1,bone:1},diff:0.1,desc:'增加修為（目前小階段需求的 12%／20%／30%），連續服用會累積丹毒、效果遞減'},
  tp:{n:'突破丹',cost:{herb:6,lingshi:3,core:1},diff:0.2,desc:'服用後下一次大境界突破的失敗率降低（8%／12%／18%）'},
  xs:{n:'洗髓丹',cost:{herb:8,lingshi:5,lingzhi:1,bone:2},diff:0.3,desc:'悟性 +3／+5／+8，有機會覺醒或提升靈根（每人最多 3 顆）'},
  zj:{n:'築基丹',cost:{herb:10,lingshi:10,core:2,lingzhi:1},diff:0.35,lv:2,desc:'煉氣圓滿突破築基的必需品（品質越高越穩）'},
  ny:{n:'凝元丹',cost:{herb:15,lingshi:25,core:4,lingzhi:2,xuantie:1},diff:0.45,lv:3,desc:'築基圓滿凝結金丹的必需品'}
};
const PILL_ORDER=['hx','jq','tp','xs','zj','ny'];
const QN=['凡品','良品','精品','靈器','法寶'],QC=['#cfc6b0','#7fd38a','#7fb6ff','#d08aff','#ffd34d'],QMUL=[1,1.3,1.7,2.3,3.2];
const GEAR={
  sword:{n:'長劍',slot:'w',atk:4,cost:{iron:6,wood:2},desc:'均衡的兵器'},
  saber:{n:'環首刀',slot:'w',atk:5,hp:5,cost:{iron:8,wood:2},desc:'厚重的大刀，攻擊高'},
  spear:{n:'長槍',slot:'w',atk:4.5,spd:0.05,cost:{iron:6,wood:4},desc:'長兵，略增身法'},
  fist:{n:'拳套',slot:'w',atk:3,spd:0.15,cost:{hide:2,fiber:4,iron:2},desc:'輕巧靈活，增加速度'},
  robe:{n:'青布道袍',slot:'a',hp:20,def:2,cost:{fiber:10,hide:1},desc:'輕便的衣甲'},
  leather:{n:'獸皮甲',slot:'a',hp:30,def:4,cost:{hide:5,iron:3},desc:'結實的皮甲，防禦較高'},
  talisman:{n:'護身符',slot:'c',hp:10,def:1,cost:{fiber:3,lingshi:2,bone:1},desc:'飾品：護體'},
  jade:{n:'玉佩',slot:'c',atk:1.5,spd:0.05,cost:{stone:6,lingshi:3},desc:'飾品：凝神'},
  faqi:{n:'飛梭法器',slot:'f',atk:6,hp:15,cost:{xuantie:1,lingshi:10,core:1},lv:2,realm:4,desc:'法器：需鍛造坊 Lv2 與煉氣以上的匠人；煉氣以上才能佩戴'}
};
const GEAR_ORDER=['sword','saber','spear','fist','robe','leather','talisman','jade','faqi'];
const SLOT_NAMES={w:'武器',a:'衣甲',c1:'飾品一',c2:'飾品二',f:'法器'};
{const _ns=newState;newState=function(seed){const s=_ns(seed);Object.assign(s,{mats:{hide:0,bone:0,core:0,lingzhi:0,xuantie:0},pills:{},recipes:{hx:1},inv:[],nextItem:1,squads:[[],[],[],[]],alloc:{mode:'off',w:{wood:3,stone:2,fiber:1,food:2,iron:1,herb:1,lingshi:0},idle:false},dgCd:{},dgClears:0,ev:{t:200,seen:{},mk:null},hint:{}});s.items.xfl=0;return s;};}
function have(k){return k in MAT_NAMES?S.mats[k]||0:S.res[k]||0;}
function canPay2(c){for(const k in c)if(have(k)<c[k])return false;return true;}
function pay2(c){for(const k in c){if(k in MAT_NAMES)S.mats[k]-=c[k];else S.res[k]-=c[k];}}
function cname(k){return MAT_NAMES[k]||RES_NAMES[k]||k;}
function costStr2(c){return Object.keys(c).map(k=>`<span class="${have(k)>=c[k]?'':'lack'}">${cname(k)} ${c[k]}</span>`).join('、');}
function addMat(k,n,x,y){S.mats[k]=(S.mats[k]||0)+n;if(x!=null)floater(x,y,`+${n} ${MAT_NAMES[k]}`,'#e8d0ff');}
function addPill(k,q,n){S.pills[k]=S.pills[k]||[0,0,0];S.pills[k][q]+=n||1;}

// ---- 裝備 ----
function makeItem(t,q,el){
  let T=(typeof GEAR!=='undefined'&&GEAR[t])||null;
  if(!T){
    try{
      const m=/^eg(\d+)_(.+)$/.exec(String(t||''));
      if(m&&window.XW_ECON&&typeof XW_ECON.slot16NewEntry==='function'){
        T=XW_ECON.slot16NewEntry(+m[1],m[2]);
        if(T&&typeof GEAR==='object')GEAR[t]=T;
      }
    }catch(e){}
  }
  if(!T)return {id:S.nextItem++,t,slot:'c',q:q||0,el:el==null?-1:el,atk:0,hp:0,def:0,spd:0,n:String(t||'裝備')};
  const m=QMUL[q]||1;
  return {id:S.nextItem++,t,slot:T.slot,q,el:el==null?-1:el,atk:+((T.atk||0)*m).toFixed(1),hp:Math.round((T.hp||0)*m),def:+((T.def||0)*m).toFixed(1),spd:+((T.spd||0)*(1+q*0.2)).toFixed(2)};
}
function itemName(it){if(!it)return '物品';const G=typeof GEAR!=='undefined'&&GEAR[it.t];if(G&&G.n)return `${it.q!=null&&typeof QN!=='undefined'&&QN[it.q]?QN[it.q]:''}${it.el>=0?'・'+LG_EL[it.el]:''}・${G.n}`;if(it.n)return String(it.n);if(it.t==='gongfa'||it.type==='gongfa')return it.gfId?String(it.gfId):'功法';return String(it.t||it.type||'物品');}
function itemStats(it){const a=[];if(it.atk)a.push('攻擊 +'+it.atk);if(it.hp)a.push('氣血 +'+it.hp);if(it.def)a.push('防禦 +'+it.def);if(it.spd)a.push('速度 +'+it.spd);if(it.el>=0)a.push(`${LG_EL[it.el]}屬性（剋${LG_EL[KE[it.el]]}）`);return a.join('、');}

// ---- 倉庫唯一存放（g* 端，singlestore）使用者 11/13：預設 ON，?singlestore=0 回舊
// 行囊／裝備庫走契約 XW_STORE.invAdd／invTake／gear／gearTake；P2 尚未掛上時退回 S.store.gear
function xwStoreOn(){
  try{if(typeof XW_STORE!=='undefined'&&XW_STORE&&typeof XW_STORE.enabled==='function')return !!XW_STORE.enabled();}catch(e){}
  try{return new URLSearchParams(((typeof location!=='undefined'&&location&&location.search)||'')).get('singlestore')!=='0';}catch(e2){return true;}
}
function xwStoreRebind(why){
  try{
    if(typeof XW_STORE!=='undefined'&&XW_STORE&&typeof XW_STORE.rebind==='function'){XW_STORE.rebind(why||'g');return 'store';}
    if(typeof grSync==='function'){grSync();return 'grSync';}
  }catch(e){try{console.warn('xwStoreRebind',e);}catch(e2){}}
  return null;
}
function xwInvApi(){
  try{return !!(typeof XW_STORE!=='undefined'&&XW_STORE&&xwStoreOn()&&typeof XW_STORE.invAdd==='function');}catch(e){return false;}
}
function xwGearEnsure(){
  if(typeof S==='undefined'||!S)return null;
  if(!S.store||typeof S.store!=='object')S.store={v:1};
  if(!Array.isArray(S.store.gear))S.store.gear=[];
  return S.store.gear;
}
function xwGearList(){
  try{if(typeof XW_STORE!=='undefined'&&XW_STORE&&typeof XW_STORE.gear==='function'){const a=XW_STORE.gear();if(Array.isArray(a))return a;}}catch(e){}
  return xwGearEnsure()||[];
}
function xwInvAdd(it,reason){
  if(!it)return {ok:false,reason:'bad-item'};
  if(xwInvApi())return XW_STORE.invAdd(it,reason||'g');
  if(!xwStoreOn())return {ok:false,reason:'off'};
  const cap=(typeof econInvCap==='function'?econInvCap(typeof player==='function'?player():null):(typeof TUNE!=='undefined'&&TUNE&&TUNE.invCap)||60);
  const inv=(S&&S.inv)||(S.inv=[]);
  if(inv.length<cap){inv.push(it);return {ok:true,to:'inv'};}
  xwGearEnsure().push(it);return {ok:true,to:'gear'};
}
function xwInvTake(id,reason){
  if(xwInvApi()&&typeof XW_STORE.invTake==='function')return XW_STORE.invTake(id,reason||'g');
  const inv=(S&&S.inv)||[];
  const i=inv.findIndex(x=>x&&x.id===id);
  if(i<0)return {ok:false,reason:'not-found'};
  const it=inv.splice(i,1)[0];return {ok:true,item:it};
}
function xwGearTake(id,reason){
  if(typeof XW_STORE!=='undefined'&&XW_STORE&&xwStoreOn()&&typeof XW_STORE.gearTake==='function')return XW_STORE.gearTake(id,reason||'g');
  const g=xwGearList();
  const i=g.findIndex(x=>x&&x.id===id);
  if(i<0)return {ok:false,reason:'not-found'};
  const it=g.splice(i,1)[0];return {ok:true,item:it};
}
function xwCopyInto(dst,src,isArr){
  if(isArr){
    if(!Array.isArray(dst))return (src||[]).slice? (src||[]).slice():(src||[]);
    dst.length=0;for(const x of (src||[]))dst.push(x);return dst;
  }
  if(!dst||typeof dst!=='object')return src&&typeof src==='object'?Object.assign({},src):src||{};
  for(const k of Object.keys(dst))delete dst[k];
  Object.assign(dst,src||{});return dst;
}

function xwItemKey(key){key=String(key||'');return key.indexOf(':')>=0?key:'item:'+key;}
function xwItemId(key){return String(key||'').replace(/^item:/,'');}
function xwItemCount(key,owner){
  key=xwItemKey(key);
  try{
    if(typeof XW_STORE!=='undefined'&&XW_STORE){
      if(typeof XW_STORE.count==='function')return +(XW_STORE.count(key,owner!=null?{owner}:undefined)||0);
      if(typeof XW_STORE.get==='function'){
        const sect=+(XW_STORE.get(key)||0);
        if(owner==null)return sect;
        return sect+(+(XW_STORE.get(key,{owner})||0));
      }
    }
  }catch(e){}
  try{return +((typeof S!=='undefined'&&S&&S.items&&S.items[xwItemId(key)])||0);}catch(e2){return 0;}
}
function xwItemTake(key,n,opt){
  key=xwItemKey(key);n=n==null?1:+n;opt=opt&&typeof opt==='object'?opt:{};
  try{if(typeof XW_STORE!=='undefined'&&XW_STORE&&typeof XW_STORE.take==='function'&&(!opt||opt.forceApi!==false)&&(typeof xwStoreOn!=='function'||xwStoreOn())){
    const r=XW_STORE.take(key,n,opt);if(r&&r.ok)return r;if(r&&r.reason&&r.reason!=='off')return r;
  }}catch(e){}
  const id=xwItemId(key);if(typeof S==='undefined'||!S||!S.items)return {ok:false,reason:'no-state'};
  if((S.items[id]||0)<n)return {ok:false,reason:'insufficient'};S.items[id]-=n;return {ok:true,took:n};
}
function xwItemAdd(key,n,opt){
  key=xwItemKey(key);n=n==null?1:+n;opt=opt&&typeof opt==='object'?opt:{};
  try{if(typeof XW_STORE!=='undefined'&&XW_STORE&&typeof XW_STORE.add==='function'&&(typeof xwStoreOn!=='function'||xwStoreOn())){
    const r=XW_STORE.add(key,n,opt);if(r&&r.ok)return r;
  }}catch(e){}
  const id=xwItemId(key);if(typeof S==='undefined'||!S)return {ok:false};
  S.items=S.items||{};S.items[id]=(S.items[id]||0)+n;return {ok:true,added:n};
}
function addItem(it,x,y){
  // singlestore ON：滿了送宗門裝備庫（契約 invAdd），不再化靈石；=0 維持舊行為
  if(typeof xwStoreOn==='function'&&xwStoreOn()){
    const r=xwInvAdd(it,'pickup');
    if(r&&r.ok){
      try{if(it&&it._gotT==null&&typeof S!=='undefined'&&S&&typeof S.time==='number')it._gotT=S.time;}catch(e){}
      if(r.to==='gear'){toast(`行囊已滿，${itemName(it)}已送入宗門裝備庫`);if(x!=null)floater(x,y,'入庫 '+itemName(it),QC[it.q]);return true;}
      if(x!=null)floater(x,y,'獲得 '+itemName(it),QC[it.q]);return true;
    }
    try{toast(`無法收入「${itemName(it)}」`);}catch(e2){}
    return false;
  }
  const _icap=typeof econInvCap==='function'?econInvCap(typeof player==='function'?player():null):TUNE.invCap;if(S.inv.length>=_icap){S.res.lingshi+=1+it.q;toast(`行囊已滿，${itemName(it)}化為靈石 ${1+it.q}`);return false;}try{if(it&&it._gotT==null&&typeof S!=='undefined'&&S&&typeof S.time==='number')it._gotT=S.time;}catch(e){}S.inv.push(it);if(x!=null)floater(x,y,'獲得 '+itemName(it),QC[it.q]);return true;}
function gearApply(u){if(u.gb)stripGear(u);const g={atk:0,hp:0,def:0,spd:0};const eq=u.eq||{};for(const k in eq){const it=eq[k];if(!it)continue;g.atk+=it.atk;g.hp+=it.hp;g.def+=it.def;g.spd+=it.spd;}
  if(!g.atk&&!g.hp&&!g.def&&!g.spd){u.gb=null;u.def=0;return;}
  u.atk=+(u.atk+g.atk).toFixed(1);u.maxhp=Math.round(u.maxhp+g.hp);u.speed=+(u.speed+g.spd).toFixed(2);u.def=g.def;u.gb=g;u.hp=Math.min(u.hp,u.maxhp);}
function slotFor(u,it){if(it.slot!=='c')return it.slot;const eq=u.eq||{};return !eq.c1?'c1':!eq.c2?'c2':'c1';}
function canWear(u,it,slot){if((slot||it.slot)==='f'&&u.realm<4)return '法器欄在煉氣後開放';if(it.q>=3&&u.realm<4)return `${QN[it.q]}需要煉氣以上才能駕馭`;return '';}
function equip(u,itId,slot){if(!u)return false;
  if(typeof XW_STORE!=='undefined'&&XW_STORE&&typeof XW_STORE.equipSwap==='function'&&(typeof xwStoreOn!=='function'||xwStoreOn())){
    let it0=(S.inv||[]).find(x=>x&&x.id===itId);if(!it0&&typeof xwGearList==='function')it0=xwGearList().find(x=>x&&x.id===itId);
    slot=slot||(it0?slotFor(u,it0):null);if(slot){const r=XW_STORE.equipSwap(u,itId,slot);
      if(r&&r.ok){toast(`${nm(u)}裝備了 ${itemName(r.on||it0)}`);return true;}
      if(r&&r.reason==='cannot-wear'){toast(r.why||'無法裝備');return false;}
      if(r&&r.reason==='not-found')return false;}
  }
  let it=null,from='inv';
  const tk=typeof xwInvTake==='function'?xwInvTake(itId,'equip'):null;
  if(tk&&tk.ok)it=tk.item;
  else{const gt=typeof xwGearTake==='function'?xwGearTake(itId,'equip'):null;if(gt&&gt.ok){it=gt.item;from='gear';}}
  if(!it){it=(S.inv||[]).find(x=>x&&x.id===itId);if(!it)return false;from='inv-legacy';}
  slot=slot||slotFor(u,it);const why=canWear(u,it,slot);if(why){
    if(from==='gear'){try{xwGearList().push(it);}catch(e){}}
    else if(from!=='inv-legacy'){try{xwInvAdd(it,'equip-deny');}catch(e2){}}
    toast(why);return false;}
  u.eq=u.eq||{};const old=u.eq[slot];
  if(from==='inv-legacy')S.inv=S.inv.filter(x=>x!==it);
  if(old){if(typeof xwStoreOn==='function'&&xwStoreOn()&&typeof xwInvAdd==='function')xwInvAdd(old,'unequip');else S.inv.push(old);}
  u.eq[slot]=it;gearApply(u);toast(`${nm(u)}裝備了 ${itemName(it)}`);return true;}
function unequip(u,slot){if(!u||!u.eq||!u.eq[slot])return false;
  // 契約 v2：滿袋卸下不再拒絕；走 equipSwap(null) 或 invAdd，超出上限的脫下件進 S.store.gear
  if(typeof XW_STORE!=='undefined'&&XW_STORE&&typeof XW_STORE.equipSwap==='function'&&(typeof xwStoreOn!=='function'||xwStoreOn())){
    const r=XW_STORE.equipSwap(u,null,slot);
    if(r&&r.ok){if(r.to==='gear')toast('行囊已滿，已放入宗門裝備庫');return true;}
  }
  if(typeof xwStoreOn==='function'&&xwStoreOn()&&typeof xwInvAdd==='function'){
    const r=xwInvAdd(u.eq[slot],'unequip');
    if(!r||!r.ok){toast('行囊已滿');return false;}
    if(r.to==='gear')toast('行囊已滿，已放入宗門裝備庫');
    u.eq[slot]=null;gearApply(u);return true;
  }
  const _icap=typeof econInvCap==='function'?econInvCap(u):TUNE.invCap;if(S.inv.length>=_icap){toast('行囊已滿');return false;}
  S.inv.push(u.eq[slot]);u.eq[slot]=null;gearApply(u);return true;}
function gearKey(u){const e=u.eq;if(!e)return '';let s='';for(const k in e)if(e[k])s+=e[k].id+',';return s;}
function gearLine(u){const e=u.eq||{},a=[];for(const k of ['w','a','c1','c2','f'])if(e[k])a.push(`<span style="color:${QC[e[k].q]}">${itemName(e[k])}</span>`);return `<div>裝備：${a.length?a.join('、'):'（無，點「行囊」穿戴）'}${u.def?'　防禦 '+u.def:''}</div>`;}
function weaponEl(u){const w=u.eq&&u.eq.w;if(w&&w.el>=0)return w.el;return -1;}
// 傷害：五行相剋＋防禦
{const _de=dmgEnemy;dmgEnemy=function(src,e,amt,col){if(src&&src.kind&&e&&!e.dead){const D=ENEMY[e.type];const m=elMul(weaponEl(src),D?D.el:-1);if(m!==1){amt*=m;if(m>1&&rnd()<0.3)floater(e.x,e.y-0.4,'剋！','#ffe27a');}}return _de(src,e,amt,col);};}
{const _du=dmgUnit;dmgUnit=function(src,u,amt){if(u&&!u.dead){if(u.def)amt=Math.max(amt*0.3,amt-u.def*0.5);const ar=u.eq&&u.eq.a;if(ar&&ar.el>=0&&src&&ENEMY[src.type]){const m=elMul(ar.el,ENEMY[src.type].el);if(m>1)amt*=0.85;}
  if(S.dg&&S.dg.kind!=='xf'&&u.hp-amt<=0&&(u.shield||0)<=0){dgDown(u);return;}}return _du(src,u,amt);};}
// 擊殺掉落材料／裝備（副本內改進入副本戰利品）
const DROPS={wolf:[['hide',0.25,1],['bone',0.15,1]],boar:[['hide',0.30,2],['bone',0.20,1]],tiger:[['hide',0.35,2],['bone',0.25,1],['core',0.10,1]],king:[['core',0.80,2],['lingzhi',0.50,1],['xuantie',0.50,1]],
  chief:[['lingzhi',0.12,1],['core',0.12,1]],golem:[['xuantie',0.08,1],['core',0.12,1]],wisp:[['core',0.15,1]],xfguard:[['core',0.20,1],['xuantie',0.08,1]],warden:[['lingzhi',0.25,1],['core',0.40,1]],xfboss:[['xuantie',0.55,1],['lingzhi',0.55,1],['core',0.70,2]]};
// One 2% item-event roll per defeated entity, shared by legacy materials/gear and ground gear.
// Runtime-only state: no asset/save mutation. Each channel settles once, including callback reentry.
const ENEMY_ITEM_DROP_ROLLS=new WeakMap();
function enemyItemDropReset(e){if(e&&typeof e==='object')ENEMY_ITEM_DROP_ROLLS.delete(e);}
function enemyItemDropPermit(e,channel){
  if(!e||typeof e!=='object'||!['legacy','ground','map-zb','map-gf'].includes(channel))return false;
  if(!e.dead&&!((e.hp||0)<=0))return false;
  let rec=ENEMY_ITEM_DROP_ROLLS.get(e);
  if(!rec){rec={pass:rnd()<0.02,legacy:false,ground:false};ENEMY_ITEM_DROP_ROLLS.set(e,rec);}
  if(rec[channel])return false;
  rec[channel]=true;
  return rec.pass;
}
function rollDrops(e,cb){
  let legacy=null;const allowLegacy=function(){if(legacy==null)legacy=enemyItemDropPermit(e,'legacy');return legacy;};
  for(const [k,p,n] of DROPS[e.type]||[]){
    if(matIsPrecious(k)&&!allowLegacy())continue;
    if(rnd()<p)cb('m',k,n);
  }
  const gp={bandit:0.05,chief:0.15,warden:0.25,golem:0.08,xfguard:0.12,xfboss:0.40}[e.type]||0;
  if(gp&&allowLegacy()&&rnd()<gp){const t=pick(GEAR_ORDER.slice(0,8));const q=Math.min(4,(rnd()<0.15?1:0)+(e.type==='chief'||e.type==='warden'?1:0)+(e.type==='xfboss'?2:0)+(e.realm>=3&&rnd()<0.15?1:0));cb('g',t,q);}
}
{const _ke=killEnemy;killEnemy=function(src,e){if(S.dg){dgKill(src,e);return;}_ke(src,e);rollDrops(e,(k,a,b)=>{if(k==='m')addMat(a,b,e.x,e.y);else addItem(makeItem(a,b,rnd()<0.10?ri(0,4):-1),e.x,e.y);});};}

// ---- 煉丹房／鍛造坊 ----
INJOB.alchemy={b:'alchemy',act:'craft',xiu:0.4,hp:0,label:'煉丹'};INJOB.forge={b:'forge',act:'craft',xiu:0.4,hp:0,label:'鍛造'};
JOB_OF.alchemy='alchemy';JOB_OF.forge='forge';JOB_SLOTS.alchemy=2;JOB_SLOTS.forge=2;LV_SLOT_ADD.alchemy=1;LV_SLOT_ADD.forge=1;

function crafters(b){const r=occupants(b).filter(u=>u.job===JOB_OF[b.type]);const p=player();if(p&&!p.dead&&!p.inside&&distRect(p.x,p.y,b.i,b.j,2)<2.5)r.push(p);return r;}
function craftSkill(u,b){if(!u)return 0;let s=0.15+u.wu*0.0055+u.realm*0.02+(blv(b)-1)*0.08;
  if(b.type==='alchemy'){if(u.lg&&u.lg.e===3)s+=0.1+0.05*u.lg.q;if(BODIES[u.body].n==='火靈體')s+=0.1;}
  else{if(u.lg&&u.lg.e===0)s+=0.1+0.05*u.lg.q;const bn=BODIES[u.body].n;if(bn==='金剛體'||bn==='厚土體')s+=0.08;}
  return s;}
function bestCrafter(b){let best=null,bs=-1;for(const u of crafters(b)){const s=craftSkill(u,b);if(s>bs){bs=s;best=u;}}return best;}
function startCraft(b,k,infuse){
  if(!b||!b.built||b.broken)return false;if(b.craft){toast('爐火正旺，請等這一爐完成');return false;}
  if(b.type==='alchemy'){const P=PILLS[k];if(!P||!S.recipes[k]){toast('尚未習得這個丹方');return false;}if(P.lv&&blv(b)<P.lv){toast(`需要煉丹房 Lv${P.lv}`);return false;}
    if(!canPay2(P.cost)){toast('材料不足');return false;}pay2(P.cost);b.craft={k,t:0,T:TUNE.craftBase.pill+P.diff*60,fire:0,hits:0,cd:0};}
  else{const G=GEAR[k];if(!G)return false;if(G.lv&&blv(b)<G.lv){toast(`需要鍛造坊 Lv${G.lv}`);return false;}
    const c=Object.assign({},G.cost);if(infuse){c.lingshi=(c.lingshi||0)+3;c.core=(c.core||0)+1;}
    if(!canPay2(c)){toast('材料不足');return false;}pay2(c);b.craft={k,t:0,T:TUNE.craftBase.gear,fire:0,hits:0,cd:0,inf:!!infuse};}
  if(!crafters(b).length)toast(`已開爐！記得指派弟子「${INJOB[JOB_OF[b.type]].label}」或你站在旁邊，進度才會前進`);else toast('開爐！按「控火／鍛打」抓準時機可提升品質');
  return true;}
function fireGauge(){return 0.5+0.5*Math.sin(S.time*2.2);}
function fireTap(b){if(!b||!b.craft)return;const c=b.craft;if(c.cd>0)return;c.cd=0.6;const g=fireGauge();
  if(Math.abs(g-0.75)<0.12){if(c.hits<3){c.hits++;c.fire=Math.min(0.15,c.fire+0.05);}floater(b.i+1,b.j+1,'火候正好！','#ffe27a');}
  else{c.fire=Math.max(-0.06,c.fire-0.03);floater(b.i+1,b.j+1,'火候偏了','#ff9a7a');}}
function finishCraft(b){const c=b.craft;b.craft=null;const u=bestCrafter(b)||player();const s=craftSkill(u,b)+c.fire;
  if(b.type==='alchemy'){const P=PILLS[c.k];const waste=clamp(0.35+P.diff-0.6*s,0.03,0.85);
    if(rnd()<waste){toast(`這一爐煉成了廢丹……（${P.n}，廢丹率 ${Math.round(waste*100)}%）`);floater(b.i+1,b.j+1,'廢丹','#9a8a7a');S.stats.waste=(S.stats.waste||0)+1;return null;}
    const r=rnd()+s*0.5-P.diff*0.5,q=r>1.05?2:r>0.7?1:0,n=blv(b)>=3?3:2;addPill(c.k,q,n);floater(b.i+1,b.j+1,`${PQ[q]}${P.n} ×${n}`,QC[q+1]);toast(`煉成 ${PQ[q]}${P.n} ×${n}！`);S.stats.pills=(S.stats.pills||0)+n;return {k:c.k,q,n};}
  const G=GEAR[c.k];let r=rnd()*0.6+s*0.8,q=r>1.25?4:r>1.0?3:r>0.75?2:r>0.5?1:0;
  if(q>=3&&(blv(b)<2||u.realm<4))q=2;if(q===4&&(blv(b)<3||u.realm<5||!S.mats.xuantie))q=3;if(q===4)S.mats.xuantie--;
  const el=c.inf?(u.lg?u.lg.e:ri(0,4)):-1;const it=makeItem(c.k,q,el);addItem(it,b.i+1,b.j+1);toast(`打造出 ${itemName(it)}！`);S.stats.gear=(S.stats.gear||0)+1;return it;}
function tickCraft(dt){for(const b of S.buildings){if(!b.craft||!b.built||b.broken)continue;const c=b.craft;if(c.cd>0)c.cd-=dt;
  const n=crafters(b).length;if(!n){continue;}c.t+=dt*(1+0.25*(blv(b)-1))*(1+0.3*(n-1));if(c.t>=c.T)finishCraft(b);}}
function drawCraftBar(b){const q=P(b.i+1,b.j+1,66);bar(q.x,q.y,46,b.craft.t/b.craft.T,b.type==='alchemy'?'#9fe8b0':'#ffc070');
  const nm2=b.type==='alchemy'?PILLS[b.craft.k].n:GEAR[b.craft.k].n;label((crafters(b).length?'':'⚠無人 ')+nm2,q.x,q.y-4,'#fff','11px sans-serif');
  if(selBuilding===b.id){const g=fireGauge(),x0=q.x-23;ctx.fillStyle='rgba(0,0,0,0.6)';ctx.fillRect(x0,q.y+5,46,4);ctx.fillStyle='rgba(255,226,122,0.7)';ctx.fillRect(x0+46*0.63,q.y+5,46*0.24,4);ctx.fillStyle='#fff';ctx.fillRect(x0+46*g-1,q.y+3,2,8);}}
function extraActs(b){const a=[];
  if(b.type==='alchemy')a.push('<button class="btn pri" data-act="craft">⚗ 丹爐（煉丹）</button>');
  if(b.type==='forge')a.push('<button class="btn pri" data-act="craft">⚒ 鍛造台</button>');
  if(b.craft)a.push(`<button class="btn on" data-act="fire">${b.type==='alchemy'?'🔥 控火':'🔨 鍛打'}</button>`);
  if(b.type==='library')a.push(`<button class="btn" data-act="rres">研究丹方（${costStr(RREC_COST)}）</button>`);
  return a;}
const RREC_COST={wood:30,fiber:10,herb:8},RREC_TIME=60,RREC_ORDER=['jq','tp','xs','zj','ny'];
function startRecResearch(b){if(!b||b.type!=='library'||!b.built||b.broken)return false;if(b.research){toast('長書閣正在研究中');return false;}
  if(!RREC_ORDER.some(k=>!S.recipes[k])){toast('已習得所有丹方');return false;}
  if(!canAfford(RREC_COST)){toast('研究丹方需要 '+costStr(RREC_COST));return false;}pay(RREC_COST);b.research={t:0,k:'rec',T:RREC_TIME};toast('長書閣開始研究丹方（約 60 秒）');return true;}
function learnRecipe(k,src){if(!k){k=RREC_ORDER.find(x=>!S.recipes[x]);}if(!k||S.recipes[k])return false;S.recipes[k]=1;toast(`習得丹方「${PILLS[k].n}」${src?'（'+src+'）':''}`);return true;}
{const _us=updateSect;updateSect=function(dt){const held=[];for(const b of S.buildings)if(b.type==='library'&&b.research&&b.research.k==='rec'){held.push([b,b.research]);b.research=null;}
  _us(dt);for(const [b,r] of held){b.research=r;if(b.built&&!b.broken){r.t+=dt*(1+0.25*(blv(b)-1));if(r.t>=r.T){b.research=null;learnRecipe(null,'長書閣');}}}};}
// 服用丹藥
function usePill(u,k){const a=S.pills[k];if(!u||u.dead||!a)return false;let q=-1;for(let x=2;x>=0;x--)if(a[x]>0){q=x;break;}if(q<0)return false;
  if(k==='zj'||k==='ny'){toast(`${PILLS[k].n}會在突破時自動使用`);return false;}
  if(k==='hx'){if(u.hp>=u.maxhp){toast('氣血已滿');return false;}u.hp=Math.min(u.maxhp,u.hp+u.maxhp*[0.35,0.5,0.7][q]);floater(u.x,u.y,'回血','#7dff7d');}
  else if(k==='jq'){if(capped(u)){toast('已達最高境界');return false;}const g=needXiu(u)*[0.12,0.2,0.3][q]*(1-(u.tox||0));u.tox=Math.min(0.6,(u.tox||0)+0.12);gainXiu(u,g/TUNE.xiuMul);floater(u.x,u.y,'修為湧動','#9fe0ff');}
  else if(k==='tp'){u.tpB=Math.max(u.tpB||0,[0.08,0.12,0.18][q]);floater(u.x,u.y,'心神凝定','#ffe27a');}
  else if(k==='xs'){if((u.xsN||0)>=3){toast(`${nm(u)}已服過 3 顆洗髓丹，再服無效`);return false;}u.xsN=(u.xsN||0)+1;const g=[3,5,8][q];u.wu=Math.min(100,u.wu+g);
    let msg=`悟性 +${g}`;if(rnd()<[0.1,0.2,0.35][q]){if(!u.lg){u.lg={e:ri(0,4),q:0};msg+=`，覺醒靈根「${lgName(u.lg)}」！`;}else if(u.lg.q<2){u.lg.q++;msg+=`，靈根提升為「${lgName(u.lg)}」！`;}}toast(`${nm(u)}服下洗髓丹：${msg}`);}
  a[q]--;return true;}
function tickV045a(dt){tickCraft(dt);for(const u of S.units)if(u.tox>0)u.tox=Math.max(0,u.tox-dt*0.003);}

// ---- 築基之後的新丹藥、結嬰／渡劫、分境界加成丹（資料表產生）----
const PILL_HEAL_Q={hx:[0.35,0.5,0.7],hxz:[0.45,0.6,0.75],hxj:[0.55,0.7,0.85],hxy:[0.65,0.8,0.95]};
const PILL_HEAL_QI={hx:[0,0,0],hxz:[0.15,0.25,0.35],hxj:[0.25,0.35,0.5],hxy:[0.35,0.5,0.7]};
Object.assign(PILLS,{
  hxz:{n:'築基回血丹',kind:'heal',needRealm:5,cost:{herb:8,lingshi:4,core:1,lingzhi:1},diff:0.25,lv:3,recRealm:5,desc:'立刻恢復氣血（下 45%／中 60%／上 75%），並回復靈力上限的 15%／25%／35%（需築基以上）'},
  hxj:{n:'金丹回血丹',kind:'heal',needRealm:6,cost:{herb:12,lingshi:10,core:2,lingzhi:1,xuantie:1},diff:0.35,lv:4,recRealm:6,desc:'立刻恢復氣血（下 55%／中 70%／上 85%），並回復靈力上限的 25%／35%／50%（需金丹以上）'},
  hxy:{n:'元嬰回血丹',kind:'heal',needRealm:7,cost:{herb:16,lingshi:18,core:3,lingzhi:2,xuantie:2},diff:0.45,lv:5,recRealm:7,desc:'立刻恢復氣血（下 65%／中 80%／上 95%），並回復靈力上限的 35%／50%／70%（需元嬰以上）'},
  jqz:{n:'築基聚氣丹',kind:'jq',needRealm:5,cost:{herb:10,lingshi:6,core:1,bone:2},diff:0.25,lv:3,recRealm:5,desc:'增加修為（目前小階段需求的 12%／20%／30%），需築基以上服用；低一境效果減半，再低不能服。連續服用會累積丹毒'},
  jqj:{n:'金丹聚氣丹',kind:'jq',needRealm:6,cost:{herb:14,lingshi:12,core:2,lingzhi:1,bone:2},diff:0.35,lv:4,recRealm:6,desc:'增加修為（目前小階段需求的 12%／20%／30%），需金丹以上服用；低一境效果減半，再低不能服。連續服用會累積丹毒'},
  jqy:{n:'元嬰聚氣丹',kind:'jq',needRealm:7,cost:{herb:18,lingshi:20,core:3,lingzhi:2,xuantie:1},diff:0.45,lv:5,recRealm:7,desc:'增加修為（目前小階段需求的 12%／20%／30%），需元嬰以上服用；低一境效果減半，再低不能服。連續服用會累積丹毒'},
  jy:{n:'結嬰丹',kind:'jy',needRealm:6,cost:{herb:16,lingshi:20,core:3,lingzhi:2,xuantie:1},diff:0.4,lv:4,recRealm:6,desc:'金丹圓滿衝擊元嬰時提高成功率（下 8%／中 12%／上 18%，與突破丹共用上限，突破後歸零）。不是必需品'},
  dj:{n:'渡劫丹',kind:'dj',cost:{herb:12,lingshi:16,core:2,lingzhi:2,xuantie:1},diff:0.4,lv:4,recRealm:4,desc:'服用後下一次雷劫減傷（需打坐；由修煉系統結算）。材料暫以靈芝、妖丹、玄鐵代替雷紋紫芝'}
});
const PILL_BF_KINDS=[
  {id:'atk',n:'銳鋒',stat:'攻擊',hook:'atk',half:0},
  {id:'def',n:'鐵壁',stat:'防禦',hook:'def',half:0},
  {id:'hp',n:'固本',stat:'氣血上限',hook:'hp',half:0},
  {id:'spd',n:'疾行',stat:'移動速度',hook:'spd',half:1},
  {id:'crit',n:'破隙',stat:'暴擊率',hook:'crit',half:1},
  {id:'qi',n:'生息',stat:'靈氣回復',hook:'qi',half:0},
  {id:'cult',n:'潛修',stat:'修煉速度',hook:'cult',half:0},
  {id:'gat',n:'豐收',stat:'採集效率',hook:'gat',half:0},
  {id:'drop',n:'覓寶',stat:'掉落率',hook:'drop',half:1}
];
const PILL_BF_TIERS=[
  {id:0,n:'凡品',realm:0,recRealm:0,pct:[0.05,0.08,0.10],cost:{herb:4,lingshi:1},diff:0.05,lv:1},
  {id:1,n:'煉氣',realm:4,recRealm:4,pct:[0.10,0.13,0.15],cost:{herb:6,lingshi:2,bone:1},diff:0.12,lv:2},
  {id:2,n:'築基',realm:5,recRealm:5,pct:[0.13,0.17,0.20],cost:{herb:8,lingshi:4,core:1},diff:0.2,lv:2},
  {id:3,n:'金丹',realm:6,recRealm:6,pct:[0.16,0.20,0.25],cost:{herb:10,lingshi:8,core:2,lingzhi:1},diff:0.28,lv:3},
  {id:4,n:'元嬰',realm:7,recRealm:7,pct:[0.20,0.25,0.30],cost:{herb:12,lingshi:12,core:3,lingzhi:1},diff:0.35,lv:3},
  {id:5,n:'化神',realm:8,recRealm:8,pct:[0.24,0.30,0.35],cost:{herb:15,lingshi:18,core:4,lingzhi:2,xuantie:1},diff:0.42,lv:4},
  {id:6,n:'合體',realm:9,recRealm:9,pct:[0.28,0.34,0.40],cost:{herb:18,lingshi:24,core:5,lingzhi:2,xuantie:2},diff:0.5,lv:5},
  {id:7,n:'地仙',realm:10,recRealm:10,pct:[0.32,0.40,0.50],cost:{herb:22,lingshi:32,core:6,lingzhi:3,xuantie:3},diff:0.58,lv:6}
];
const PILL_BF_DUR=300,PILL_CRIT_CAP=0.5;
function pillBfAlchMax(){try{return (typeof ECON_LV_MAX==='number'?ECON_LV_MAX:(typeof LV_MAX==='number'?LV_MAX:3))|0;}catch(e){return 3;}}
function pillBfKey(kind,tier){return 'bf'+kind+tier;}
function pillBfTierOfRealm(r){r=r|0;return r<=3?0:Math.min(7,r-3);}
function _pillInitBf(){
  const mx=pillBfAlchMax();
  for(const T of PILL_BF_TIERS){
    const lv=Math.max(1,Math.min(mx,T.lv||1));
    for(const K of PILL_BF_KINDS){
      const k=pillBfKey(K.id,T.id),half=!!K.half;
      const p0=T.pct[0]*(half?0.5:1),p1=T.pct[1]*(half?0.5:1),p2=T.pct[2]*(half?0.5:1);
      const fmt=x=>+(x*100).toFixed(1);
      const unit=K.hook==='crit'?' 百分點':'%';
      const cost=Object.assign({},T.cost);
      if(half){cost.lingshi=(cost.lingshi||0)+Math.max(1,T.id);if(T.id>=2)cost.core=(cost.core||0)+1;}
      PILLS[k]={n:T.n+K.n+'丹',kind:'bf',bf:K.hook,bfId:K.id,tier:T.id,needTier:T.id,needRealm:T.realm,recRealm:T.recRealm,lv:lv,cost:cost,diff:T.diff+(half?0.05:0),
        pct:[p0,p1,p2],half:half,stat:K.stat,
        desc:T.n+K.stat+'丹：下／中／上 +'+fmt(p0)+'／'+fmt(p1)+'／'+fmt(p2)+unit+'，持續約 5 分鐘。同種類只取實際效果最高者並刷新時間。境界不足不能服，高於丹級則每高一檔效果減半'};
    }
  }
}
_pillInitBf();
(function _pillOrder(){
  const add=['hxz','jqz','hxj','jqj','jy','dj','hxy','jqy'];
  for(const T of PILL_BF_TIERS)for(const K of PILL_BF_KINDS)add.push(pillBfKey(K.id,T.id));
  for(const k of add)if(PILL_ORDER.indexOf(k)<0)PILL_ORDER.push(k);
  const rec=['hxz','jqz','hxj','jqj','jy','dj','hxy','jqy'];
  for(const T of PILL_BF_TIERS)for(const K of PILL_BF_KINDS)rec.push(pillBfKey(K.id,T.id));
  for(const k of rec)if(RREC_ORDER.indexOf(k)<0)RREC_ORDER.push(k);
})();
function pillSectPeak(){
  try{if(typeof econSectMaxRealm==='function')return econSectMaxRealm()|0;}catch(e){}
  let b=0;
  try{if(typeof S!=='undefined'&&S&&S.units)for(const u of S.units){if(!u||u.dead)continue;b=Math.max(b,u.realm|0,u.peakRealm|0);}}catch(e){}
  try{if(typeof S!=='undefined'&&S&&S.flags&&S.flags.peakRealm!=null)b=Math.max(b,S.flags.peakRealm|0);}catch(e){}
  return b;
}
function pillAlchBest(){
  let lv=0;
  try{if(typeof S!=='undefined'&&S&&S.buildings)for(const b of S.buildings){if(!b||b.type!=='alchemy'||!b.built||b.broken)continue;lv=Math.max(lv,typeof blv==='function'?blv(b):(b.lv||1)|0);}}catch(e){}
  return lv;
}
function pillRecOk(k){
  const P=typeof PILLS!=='undefined'&&PILLS[k];if(!P)return false;
  const needR=P.recRealm||0,needLv=P.lv||0;
  if(needR&&pillSectPeak()<needR)return false;
  if(needLv&&pillAlchBest()<needLv)return false;
  return true;
}
function pillRecWhy(k){
  const P=PILLS[k];if(!P)return '找不到這個丹方';
  const needR=P.recRealm||0,needLv=P.lv||0,peak=pillSectPeak(),al=pillAlchBest();
  const rn=(typeof REALMS!=='undefined'&&REALMS[needR]&&REALMS[needR].n)||('境界 '+needR);
  if(needR&&peak<needR)return `研究「${P.n}」需宗門最高境界達到「${rn}」（目前 ${ (REALMS[peak]&&REALMS[peak].n)||peak }）`;
  if(needLv&&al<needLv)return `研究「${P.n}」需煉丹房 Lv${needLv}（目前 ${al||0}）`;
  return `尚不能研究「${P.n}」`;
}
function pillNextRec(){return RREC_ORDER.find(k=>!(typeof S!=='undefined'&&S&&S.recipes&&S.recipes[k])&&pillRecOk(k));}
startRecResearch=function(b){
  if(!b||b.type!=='library'||!b.built||b.broken)return false;
  if(b.research){toast('長書閣正在研究中');return false;}
  if(!pillNextRec()){
    if(RREC_ORDER.every(k=>S&&S.recipes&&S.recipes[k])){toast('已習得所有丹方');return false;}
    const w=RREC_ORDER.find(k=>!(S&&S.recipes&&S.recipes[k]));
    toast(w?pillRecWhy(w):'已習得所有丹方');return false;
  }
  if(typeof canAfford!=='function'||!canAfford(RREC_COST)){toast('研究丹方需要 '+(typeof costStr==='function'?costStr(RREC_COST):'木材 30、纖維 10、藥草 8'));return false;}
  pay(RREC_COST);b.research={t:0,k:'rec',T:RREC_TIME};toast('長書閣開始研究丹方（約 60 秒）');return true;
};
learnRecipe=function(k,src){
  if(!k)k=pillNextRec();
  if(!k||(typeof S!=='undefined'&&S&&S.recipes&&S.recipes[k]))return false;
  if(!pillRecOk(k)){if(src)toast(pillRecWhy(k));return false;}
  S.recipes=S.recipes||{};S.recipes[k]=1;
  const n=(PILLS[k]&&PILLS[k].n)||k;
  toast(`習得丹方「${n}」${src?'（'+src+'）':''}`);return true;
};
function pillTpCap(){
  try{if(TUNE&&TUNE.v57&&TUNE.v57.brkPill)return +TUNE.v57.brkPill;}catch(e){}
  try{if(TUNE&&TUNE.tpCap)return +TUNE.tpCap;}catch(e2){}
  return 0.20;
}
function pillBfPctOf(P,q){if(!P||!P.pct)return 0;return P.pct[Math.max(0,Math.min(2,q|0))]||0;}
function pillBfActual(u,k,q){
  const P=PILLS[k];if(!P||P.kind!=='bf'||!u)return 0;
  const ut=pillBfTierOfRealm(u.realm|0),need=P.needTier|0;
  if(ut<need)return 0;
  let p=pillBfPctOf(P,q);
  if(ut>need)p*=Math.pow(0.5,ut-need);
  return p<0.01?0:p;
}
function pillBfMul(u,hook){
  if(!u||!u.pbf||typeof S==='undefined'||!S)return 1;
  const b=u.pbf[hook];if(!b||!(S.time<b.t))return 1;
  return 1+(b.p||0);
}
function pillBfVal(u,hook){
  if(!u||!u.pbf||typeof S==='undefined'||!S)return 0;
  const b=u.pbf[hook];if(!b||!(S.time<b.t))return 0;
  return b.p||0;
}
function pillBfLeft(u,hook){
  if(!u||!u.pbf||typeof S==='undefined'||!S)return 0;
  const b=u.pbf[hook];if(!b)return 0;
  return Math.max(0,(b.t||0)-S.time);
}
function pillBfSweep(u){
  if(!u||!u.pbf)return;
  if(typeof S==='undefined'||!S)return;
  for(const h in u.pbf){const b=u.pbf[h];if(!b||!(S.time<b.t))delete u.pbf[h];}
  if(!Object.keys(u.pbf).length)u.pbf=null;
}
function pillBfSyncHp(u){
  if(!u)return;
  const base=(u.maxhp||0)-(u._pbfHpAdd||0);
  const mul=pillBfMul(u,'hp');
  const want=mul>1?Math.round(base*(mul-1)):0;
  const cur=u._pbfHpAdd||0;
  if(want===cur)return;
  u.maxhp=Math.max(1,base+want);
  if(want>cur)u.hp=Math.min(u.maxhp,(u.hp||0)+(want-cur));
  else u.hp=Math.min(u.maxhp,u.hp||0);
  u._pbfHpAdd=want;
}
function pillBfApply(u,k,q){
  const P=PILLS[k];if(!P||!u)return 0;
  const p=pillBfActual(u,k,q);if(!(p>0))return 0;
  u.pbf=u.pbf||{};
  const h=P.bf,old=u.pbf[h];
  const keep=(old&&typeof S!=='undefined'&&S&&S.time<old.t&&(old.p||0)>p)?old.p:p;
  const keepK=(old&&S&&S.time<old.t&&(old.p||0)>p)?old.k:k;
  const keepQ=(old&&S&&S.time<old.t&&(old.p||0)>p)?old.q:q;
  u.pbf[h]={k:keepK,q:keepQ,p:keep,t:S.time+PILL_BF_DUR,hook:h};
  if(h==='hp')pillBfSyncHp(u);
  return keep;
}
function pillBfHtml(u){
  if(!u)return '';
  pillBfSweep(u);
  const parts=[];
  if(u.cultTribPill)parts.push('渡劫丹藥力（下一次雷劫）');
  if(u.pbf){
    const names={atk:'攻擊',def:'防禦',hp:'氣血上限',spd:'速度',crit:'暴擊',qi:'靈氣回復',cult:'修煉',gat:'採集',drop:'掉落'};
    for(const h in u.pbf){
      const b=u.pbf[h],left=pillBfLeft(u,h),sec=Math.ceil(left);
      if(sec<=0)continue;
      const pct=h==='crit'?('+'+(+(b.p*100).toFixed(1))+' 百分點'):('+'+(+(b.p*100).toFixed(1))+'%');
      parts.push((names[h]||h)+' '+pct+'（剩 '+Math.floor(sec/60)+':'+(sec%60<10?'0':'')+(sec%60)+'）');
    }
  }
  return parts.length?'<div class="dim">藥力：'+parts.join('　')+'</div>':'';
}
function useHealPill(u,k,q){
  const P=PILLS[k];if(!P||!u)return false;
  const need=P.needRealm||0;
  if(need&&(u.realm|0)<need){toast(`${nm(u)}境界不足，無法承受「${P.n}」藥力`);return false;}
  const hpQ=PILL_HEAL_Q[k]||PILL_HEAL_Q.hx,qiQ=PILL_HEAL_QI[k]||[0,0,0];
  const hpFull=u.hp>=u.maxhp,qiMax=(typeof u.qiMax==='number'?u.qiMax:0),qiFull=!qiMax||(u.qi||0)>=qiMax;
  if(hpFull&&qiFull){toast(qiMax?'氣血與靈力已滿':'氣血已滿');return false;}
  const add=u.maxhp*hpQ[q];if(!hpFull)u.hp=Math.min(u.maxhp,u.hp+add);
  if(qiMax&&qiQ[q])u.qi=Math.min(qiMax,(u.qi||0)+qiMax*qiQ[q]);
  floater(u.x,u.y,k==='hx'?'回血':'回血・回靈','#7dff7d');return true;
}
function useJqPill(u,k,q){
  const P=PILLS[k];if(!P||!u)return false;
  if(typeof capped==='function'&&capped(u)){toast('已達最高境界');return false;}
  const need=P.needRealm||0,r=u.realm|0;
  let mul=1;
  if(need){
    if(r<need-1){toast(`${nm(u)}境界不足，無法承受「${P.n}」藥力`);return false;}
    if(r===need-1)mul=0.5;
  }
  const g=needXiu(u)*[0.12,0.2,0.3][q]*(1-(u.tox||0))*mul;
  u.tox=Math.min(0.6,(u.tox||0)+0.12);
  gainXiu(u,g/(typeof TUNE!=='undefined'&&TUNE.xiuMul?TUNE.xiuMul:1));
  floater(u.x,u.y,mul<1?'修為略湧':'修為湧動','#9fe0ff');
  if(mul<1)toast(`${nm(u)}境界低於「${P.n}」，藥力只發揮一半`);
  return true;
}
{const _up=usePill;usePill=function(u,k){
  const a=typeof S!=='undefined'&&S&&S.pills?S.pills[k]:null;
  if(!u||u.dead||!a)return _up.apply(this,arguments);
  let q=-1;for(let x=2;x>=0;x--)if(a[x]>0){q=x;break;}if(q<0)return _up.apply(this,arguments);
  const P=PILLS[k];if(!P)return _up.apply(this,arguments);
  if(P.kind==='heal'&&k!=='hx'){
    const ok=useHealPill(u,k,q);if(ok)a[q]--;return ok;
  }
  if(P.kind==='jq'){
    const ok=useJqPill(u,k,q);if(ok)a[q]--;return ok;
  }
  if(P.kind==='jy'){
    if((u.realm|0)!==6){toast('結嬰丹只能在金丹境界服用，用以衝擊元嬰');return false;}
    const cap=pillTpCap(),cur=u.tpB||0;
    if(cur>=cap-0.001){toast(`${nm(u)}藥力已飽和（+${Math.round(cur*100)}%），再服無效`);return false;}
    const add=[0.08,0.12,0.18][q]*(1-(u.tox||0)*0.8);
    u.tpB=Math.min(cap,cur+add);
    if(u.tpP!=null)u.tpP=Math.min(cap,(u.tpP||cur)+(u.tpB-cur));
    u.tox=Math.min(1,(u.tox||0)+0.10);
    floater(u.x,u.y,'結嬰凝神','#ffe27a');
    toast(`${nm(u)}服下結嬰丹：下次突破成功率 +${Math.round((u.tpB||0)*100)}%（上限 ${Math.round(cap*100)}%）`);
    a[q]--;if(typeof bagKey!=='undefined')bagKey=null;return true;
  }
  if(P.kind==='dj'){
    if(u.cultTribPill){toast(`${nm(u)}體內已有渡劫丹藥力，下一次雷劫結束前不必再服`);return false;}
    u.cultTribPill=1;
    floater(u.x,u.y,'雷劫將減傷（需打坐）','#c8d8ff');
    toast(`${nm(u)}服下渡劫丹，下一次雷劫將減輕傷害`);
    a[q]--;if(typeof bagKey!=='undefined')bagKey=null;return true;
  }
  if(P.kind==='bf'){
    const ut=pillBfTierOfRealm(u.realm|0);
    if(ut<(P.needTier|0)){toast('境界不足，無法承受藥力');return false;}
    const p=pillBfActual(u,k,q);
    if(!(p>0)){toast(`「${P.n}」對${nm(u)}藥力幾乎無效（低於 1%）`);return false;}
    const keep=pillBfApply(u,k,q);
    const unit=P.bf==='crit'?' 百分點':'%';
    floater(u.x,u.y,P.stat+' +'+(+(keep*100).toFixed(1))+unit,'#bfe8ff');
    toast(`${nm(u)}服下${P.n}：${P.stat} +${(+(keep*100).toFixed(1))}${unit}，約 5 分鐘`);
    a[q]--;if(typeof bagKey!=='undefined')bagKey=null;return true;
  }
  return _up.apply(this,arguments);
};}
{const _tk=tickV045a;tickV045a=function(dt){
  _tk(dt);
  try{if(typeof S!=='undefined'&&S&&S.units)for(const u of S.units){pillBfSweep(u);pillBfSyncHp(u);}}catch(e){}
};}
try{if(typeof UNIT_KEEP!=='undefined'&&UNIT_KEEP.indexOf('pbf')<0)UNIT_KEEP.push('pbf','cultTribPill','_pbfHpAdd');}catch(e){}
function pillHookCombat(){
  if(pillHookCombat._on)return;pillHookCombat._on=1;
  try{if(typeof UNIT_KEEP!=='undefined'){for(const k of ['pbf','cultTribPill','_pbfHpAdd'])if(UNIT_KEEP.indexOf(k)<0)UNIT_KEEP.push(k);}
    if(window.XW&&Array.isArray(XW.UNIT_KEEP)){for(const k of ['pbf','cultTribPill','_pbfHpAdd'])if(XW.UNIT_KEEP.indexOf(k)<0)XW.UNIT_KEEP.push(k);}}catch(e){}
  if(typeof dmgEnemy==='function'){const _de=dmgEnemy;dmgEnemy=function(src,e,amt,col){
    if(src&&src.kind){const m=pillBfMul(src,'atk');if(m>1)amt*=m;
      const cr=Math.min(PILL_CRIT_CAP,pillBfVal(src,'crit'));
      if(cr>0&&typeof rnd==='function'&&rnd()<cr){amt*=2;try{floater(e.x,e.y-0.4,'暴擊','#ffe27a');}catch(er){}}}
    return _de(src,e,amt,col);};}
  if(typeof dmgUnit==='function'){const _du=dmgUnit;dmgUnit=function(src,u,amt){
    if(u&&!u.dead){const m=pillBfMul(u,'def');if(m>1)amt=amt/m;}
    return _du(src,u,amt);};}
  if(typeof updateUnit==='function'){const _uu=updateUnit;updateUnit=function(u,dt){
    if(!u)return _uu.apply(this,arguments);
    const m=pillBfMul(u,'spd');if(!(m>1))return _uu.apply(this,arguments);
    const s=u.speed;u.speed=+(s*m).toFixed(4);
    try{return _uu.apply(this,arguments);}finally{u.speed=s;}};}
  if(typeof doJob==='function'){const _dj=doJob;doJob=function(u,dt){
    if(!u)return _dj.apply(this,arguments);
    const m=pillBfMul(u,'gat');if(!(m>1))return _dj.apply(this,arguments);
    const g=u.gat;u.gat=g*m;try{return _dj.apply(this,arguments);}finally{u.gat=g;}};}
  if(typeof cultMul==='function'){const _cm=cultMul;cultMul=function(u){return _cm(u)*pillBfMul(u,'cult');};}
  if(typeof v49PoolTick==='function'){const _pt=v49PoolTick;v49PoolTick=function(u,dt){
    const q0=u&&u.qi,r=_pt.apply(this,arguments);
    try{const m=pillBfMul(u,'qi');if(m>1&&u&&u.qi>q0)u.qi=Math.min(u.qiMax||u.qi,q0+(u.qi-q0)*m);}catch(e){}
    return r;};}
  if(typeof v61QiMul==='function'){const _qm=v61QiMul;v61QiMul=function(u){
    const r=_qm(u);try{const m=pillBfMul(u,'qi');if(m>1){if(r&&typeof r==='object'){r.m=(r.m||1)*m;if(Array.isArray(r.s))r.s.push(['丹藥',m-1,'buff']);}else if(typeof r==='number')return r*m;}}catch(e){}
    return r;};}
  let dropSrc=null;
  if(typeof killEnemy==='function'){const _ke=killEnemy;killEnemy=function(src,e){const p=dropSrc;dropSrc=src;try{return _ke.apply(this,arguments);}finally{dropSrc=p;}};}
  if(typeof rollDrops==='function'){const _rd=rollDrops;rollDrops=function(e,cb){
    const m=pillBfMul(dropSrc,'drop');if(!(m>1))return _rd.apply(this,arguments);
    const _rnd=rnd;rnd=function(){return _rnd()/m;};try{return _rd.apply(this,arguments);}finally{rnd=_rnd;}};}
  if(typeof doBreak==='function'){const _db=doBreak;doBreak=function(u){if(u)u._pbfHpAdd=0;const r=_db.apply(this,arguments);try{pillBfSyncHp(u);}catch(e){}return r;};}
  if(typeof gearApply==='function'){const _ga=gearApply;gearApply=function(u){if(u){const add=u._pbfHpAdd||0;u.maxhp=(u.maxhp||0)-add;u._pbfHpAdd=0;}const r=_ga.apply(this,arguments);try{pillBfSyncHp(u);}catch(e){}return r;};}
  if(typeof renderPanel==='function'){const _rp=renderPanel;renderPanel=function(){
    const r=_rp.apply(this,arguments);
    try{
      const u=(typeof selUnits!=='undefined'&&selUnits.length===1&&typeof unitById==='function')?unitById(selUnits[0]):null;
      if(!u)return r;
      const html=pillBfHtml(u);if(!html)return r;
      const el=document.getElementById('panel');if(!el)return r;
      let box=el.querySelector('#pd_pbf');if(!box){box=document.createElement('div');box.id='pd_pbf';const host=el.querySelector('.pmore')||el;host.appendChild(box);}
      if(box.innerHTML!==html)box.innerHTML=html;
      const atk=document.getElementById('pd_atk');if(atk){const m=pillBfMul(u,'atk');const t=m>1?(+(u.atk*m).toFixed(1)+'（+'+Math.round((m-1)*100)+'%）'):String(u.atk);if(atk.textContent!==t)atk.textContent=t;}
    }catch(e){}
    return r;};}
}
function pillBfFixLv(){const mx=pillBfAlchMax();for(const T of PILL_BF_TIERS){const lv=Math.max(1,Math.min(mx,T.lv||1));for(const K of PILL_BF_KINDS){const P=PILLS[pillBfKey(K.id,T.id)];if(P)P.lv=lv;}}}
try{setTimeout(function(){try{pillBfFixLv();}catch(e){}try{pillHookCombat();}catch(e2){}
  try{if(typeof TOX_ADD==='object'&&TOX_ADD){const add={hxz:0.04,hxj:0.04,hxy:0.04,jqz:0.12,jqj:0.12,jqy:0.12};for(const k in add)if(TOX_ADD[k]==null)TOX_ADD[k]=add[k];}}catch(e3){}
},0);}catch(e){try{pillBfFixLv();pillHookCombat();}catch(e4){}}


// ================== 地面裝備拾取修正（2026-11-11）==================
// 現象：野外「凡品・麻布護腕」黃字＋菱形看得到，主角與弟子站在旁邊卻撿不起來。
// 根因在 econ_drop：點選只在 1.5 格內才撿，否則把點擊交給原 tapAt，旁邊的弟子／名牌會被選走；
// 自動撿半徑只有 1.35 格且只檢查主角；行囊滿時若走到 addItem 還會把裝備化成靈石但物品留在地上。
// 此處只動 g*：點到掉落（含名牌）優先於單位；2.2 格內立撿；更遠則走過去再撿；弟子也可自動撿；
// 行囊滿只出中文提示、物品留在地上。TUNE.pickFix={on:false} 可關。
(function(){
  const CFG={on:true,r:2.2,clickR:44,delay:0.85};
  function cfg(){
    const o=Object.assign({},CFG);
    try{if(typeof TUNE!=='undefined'&&TUNE&&TUNE.pickFix)Object.assign(o,TUNE.pickFix);}catch(e){}
    try{if(window.XW_ECON&&XW_ECON.PICK_FIX)Object.assign(o,XW_ECON.PICK_FIX);}catch(e2){}
    return o;
  }
  function on(){return cfg().on!==false;}
  function pile(){
    try{
      if(typeof S==='undefined'||!S)return [];
      S.econ=S.econ||{};
      if(!Array.isArray(S.econ.groundGear))S.econ.groundGear=[];
      return S.econ.groundGear;
    }catch(e){return [];}
  }
  function capOf(u){
    try{if(typeof econInvCap==='function')return econInvCap(u||(typeof player==='function'?player():null));}catch(e){}
    try{if(typeof TUNE!=='undefined'&&TUNE&&TUNE.invCap)return TUNE.invCap;}catch(e2){}
    return 60;
  }
  function invFull(){
    try{if(typeof xwStoreOn==='function'&&xwStoreOn())return false;return !!(S&&S.inv&&S.inv.length>=capOf());}catch(e){return false;}
  }
  function nmOf(it){
    try{if(typeof itemName==='function')return itemName(it);}catch(e){}
    return (it&&(it.n||it.t))||'裝備';
  }
  function dropAtScreen(mx,my){
    if(typeof worldToScreen!=='function'||typeof iso!=='function')return null;
    const C=cfg();
    const rad=(typeof isTouchUI!=='undefined'&&isTouchUI)?Math.max(C.clickR,56):C.clickR;
    let best=null,bd=rad;
    const dg=!!(typeof S!=='undefined'&&S&&S.dg);
    const list=pile();
    for(let i=0;i<list.length;i++){
      const d=list[i];if(!d||!!d.dg!==dg)continue;
      try{
        const q=iso(d.x,d.y),s=worldToScreen(q.x,q.y);
        const dd=Math.min(Math.hypot(mx-s.x,my-s.y),Math.hypot(mx-s.x,my-(s.y-16)));
        if(dd<bd){bd=dd;best=d;}
      }catch(e){}
    }
    return best;
  }
  let lastFullT=-99;
  function pickOne(d,u,forceToast){
    if(!d||!d.item)return false;
    if(invFull()){
      const now=(typeof S!=='undefined'&&S&&S.time)||0;
      if(forceToast||now-lastFullT>1.2){
        try{toast('行囊已滿，無法拾取「'+nmOf(d.item)+'」');}catch(e){}
        lastFullT=now;
      }
      return false;
    }
    let ok=true;
    try{ok=addItem(d.item,d.x,d.y);}catch(e){ok=false;}
    if(ok===false)return false;
    try{S.econ.groundGear=pile().filter(function(x){return x!==d;});}catch(e){}
    try{
      const who=(u&&typeof nm==='function')?nm(u):(u&&(u.name||''))||'';
      toast((who?who+' 拾取 ':'拾取 ')+nmOf(d.item));
    }catch(e){}
    return true;
  }
  function living(){
    const us=[];
    try{const p=typeof player==='function'?player():null;if(p&&!p.dead&&!p.inside)us.push(p);}catch(e){}
    try{
      const ds=(typeof disciples==='function')?disciples():((S&&S.units)||[]).filter(function(x){return x&&x.kind==='disciple';});
      for(let i=0;i<ds.length;i++){const u=ds[i];if(u&&!u.dead&&!u.inside)us.push(u);}
    }catch(e2){}
    return us;
  }
  function nearestHolder(d,r){
    let best=null,bd=r;
    const us=living();
    for(let i=0;i<us.length;i++){
      const u=us[i],dd=Math.hypot((u.x||0)-(d.x||0),(u.y||0)-(d.y||0));
      if(dd<bd){bd=dd;best=u;}
    }
    return best;
  }
  function autoTick(){
    if(!on())return;
    try{if(typeof S!=='undefined'&&S&&S.interior)return;}catch(e){return;}
    const C=cfg(),list=pile(),dg=!!(S&&S.dg),t=(S&&S.time)||0;
    for(let i=0;i<list.length;i++){
      const d=list[i];if(!d||!!d.dg!==dg)continue;
      if(t-(d.t||0)<(C.delay||0))continue;
      const u=nearestHolder(d,C.r);
      if(u){if(!pickOne(d,u,false))break;}
    }
  }
  function goPick(d){
    if(!d)return false;
    const C=cfg();
    const u=nearestHolder(d,C.r);
    if(u)return pickOne(d,u,true);
    if(invFull()){pickOne(d,null,true);return true;}
    let us=[];
    try{if(typeof commandUnits==='function')us=(commandUnits()||[]).filter(function(x){return x&&!x.dead;});}catch(e){}
    if(!us.length){
      try{const p=typeof player==='function'?player():null;if(p&&!p.dead)us=[p];}catch(e2){}
    }
    if(!us.length)return true;
    try{
      if(typeof commandMove==='function')commandMove(us,d.x,d.y,false);
      else us.forEach(function(x){if(typeof setTask==='function')setTask(x,{type:'move',x:d.x,y:d.y});});
    }catch(e){}
    return true;
  }
  function hook(){
    if(!on())return;
    if(typeof tapAt==='function'&&!tapAt._xwPick){
      const _t=tapAt;
      tapAt=function(x,y){
        try{
          if(on()&&!(typeof S!=='undefined'&&S&&S.interior)){
            const d=dropAtScreen(x,y);
            if(d){goPick(d);return;}
          }
        }catch(e){}
        return _t.apply(this,arguments);
      };
      tapAt._xwPick=1;
    }
    if(typeof rightClick==='function'&&!rightClick._xwPick){
      const _r=rightClick;
      rightClick=function(mx,my,shift){
        try{
          if(on()&&!(typeof S!=='undefined'&&S&&S.interior)&&!((typeof buildMode!=='undefined')&&buildMode)){
            const d=dropAtScreen(mx,my);
            if(d){goPick(d);return;}
          }
        }catch(e){}
        return _r.apply(this,arguments);
      };
      rightClick._xwPick=1;
    }
    if(typeof playerInteract==='function'&&!playerInteract._xwPick){
      const _v=playerInteract;
      playerInteract=function(){
        try{
          if(on()&&!(typeof S!=='undefined'&&S&&S.interior)){
            const p=typeof player==='function'?player():null;
            if(p&&!p.dead){
              const C=cfg();
              let best=null,bd=C.r,list=pile(),dg=!!(S&&S.dg);
              for(let i=0;i<list.length;i++){
                const d=list[i];if(!d||!!d.dg!==dg)continue;
                const dd=Math.hypot(p.x-d.x,p.y-d.y);
                if(dd<bd){bd=dd;best=d;}
              }
              if(best){goPick(best);return;}
            }
          }
        }catch(e){}
        return _v.apply(this,arguments);
      };
      playerInteract._xwPick=1;
    }
    if(typeof update==='function'&&!update._xwPick){
      const _u=update;
      update=function(dt){
        const r=_u.apply(this,arguments);
        try{if(on())autoTick();}catch(e){}
        return r;
      };
      update._xwPick=1;
    }
    try{
      if(window.XW_ECON){
        XW_ECON.PICK_FIX=XW_ECON.PICK_FIX||CFG;
        XW_ECON.xwPickGround=pickOne;
        XW_ECON.xwDropAtScreen=dropAtScreen;
        XW_ECON.xwGoPick=goPick;
      }
      if(window.XW){XW.xwPickGround=pickOne;XW.xwDropAtScreen=dropAtScreen;XW.xwGoPick=goPick;}
    }catch(e){}
  }
  try{if(typeof TUNE!=='undefined'&&TUNE&&TUNE.pickFix==null)TUNE.pickFix={on:true,r:2.2,clickR:44,delay:0.85};}catch(e){}
  hook();
  if(typeof setTimeout==='function'){setTimeout(hook,0);setTimeout(hook,200);setTimeout(hook,600);setTimeout(hook,1400);}
})();

/* 剛入手裝備為玩家保留 60 遊戲秒；弟子於此期間不能取用／自動購買。TUNE.gearHold.on=false 可關。 */
(function(){
  try{if(typeof TUNE!=='undefined'&&TUNE&&TUNE.gearHold==null)TUNE.gearHold={on:true,sec:60};}catch(e){}
  function cfg(){try{return (typeof TUNE!=='undefined'&&TUNE&&TUNE.gearHold)||{on:true,sec:60};}catch(e){return {on:true,sec:60};}}
  function on(){const c=cfg();return c&&c.on!==false;}
  function sec(){const n=+cfg().sec;return n>0?n:60;}
  function nowT(){try{return (typeof S!=='undefined'&&S&&typeof S.time==='number')?S.time:0;}catch(e){return 0;}}
  // 遊戲時間 S.time（秒）。無 _gotT 的舊物品視為已過保留期。
  function held(it){if(!on()||!it||it._gotT==null)return false;const t=+it._gotT;if(!(t>=0))return false;return (nowT()-t)<sec();}
  function remain(it){if(!held(it))return 0;return Math.max(0,sec()-(nowT()-(+it._gotT)));}
  function stamp(it){if(it&&it._gotT==null){try{it._gotT=nowT();}catch(e){}}return it;}
  function maskRsv(fn,ctx,args){
    const marked=[];
    try{
      if(on()&&typeof S!=='undefined'&&S&&Array.isArray(S.inv)){
        for(const it of S.inv){
          if(held(it)&&!it.rsv){it.rsv=1;it._xhRsv=1;marked.push(it);}
        }
      }
      return fn.apply(ctx,args||[]);
    }finally{
      for(const it of marked){if(it&&it._xhRsv){delete it.rsv;delete it._xhRsv;}}
    }
  }
  function wrapWant(){
    try{
      if(typeof v171Want!=='function'||v171Want._gearHold)return;
      const _f=v171Want;
      v171Want=function(){return maskRsv(_f,this,arguments);};
      v171Want._gearHold=1;
    }catch(e){}
  }
  function wrapTick(){
    try{
      if(typeof v171Tick!=='function'||v171Tick._gearHold)return;
      const _f=v171Tick;
      v171Tick=function(){return maskRsv(_f,this,arguments);};
      v171Tick._gearHold=1;
    }catch(e){}
  }
  function wrapDo(){
    try{
      if(typeof v171Do!=='function'||v171Do._gearHold)return;
      const _f=v171Do;
      v171Do=function(){return maskRsv(_f,this,arguments);};
      v171Do._gearHold=1;
    }catch(e){}
  }
  function wrapShelf(){
    try{
      if(typeof gtShelfTick!=='function'||gtShelfTick._gearHold)return;
      const _f=gtShelfTick;
      gtShelfTick=function(){
        const saved=[];
        try{
          if(on()&&typeof S!=='undefined'&&S&&Array.isArray(S.inv)){
            for(const it of S.inv){
              if(it&&it.shelf&&held(it)){delete it.shelf;it._xhShelf=1;saved.push(it);}
            }
          }
          return _f.apply(this,arguments);
        }finally{
          for(const it of saved){if(it&&it._xhShelf){it.shelf=1;delete it._xhShelf;}}
        }
      };
      gtShelfTick._gearHold=1;
    }catch(e){}
  }
  function hook(){
    wrapWant();wrapTick();wrapDo();wrapShelf();
    try{
      const X=(typeof window!=='undefined')?window.XW:null;
      if(X){
        X.gearHold=cfg();
        X.xwGearHeld=held;
        X.xwGearHoldRemain=remain;
        X.xwGearStamp=stamp;
        if(X.gt&&typeof gtShelfTick==='function')X.gt.shelfTick=gtShelfTick;
      }
      const E=(typeof window!=='undefined')?window.XW_ECON:null;
      if(E){E.xwGearHeld=held;E.xwGearHoldRemain=remain;E.xwGearStamp=stamp;}
    }catch(e){}
  }
  hook();
  if(typeof setTimeout==='function'){
    setTimeout(hook,0);setTimeout(hook,200);setTimeout(hook,600);
    setTimeout(hook,1400);setTimeout(hook,1800);
  }
})();
