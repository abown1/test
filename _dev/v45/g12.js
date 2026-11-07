
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
  lianqiLs:20,zhujiLs:50,jindanLs:120,
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
  else if(u.kind==='player'||selUnits.includes(u.id))toast(`${nm(u)}${realmName(u)}，可以嘗試突破「${REALMS[u.realm+1].n}」${c.ok?'（按「突破」）':'（條件未滿，見修煉面板）'}`);
};
function pillN(k){const a=S.pills[k];return a?a[0]+a[1]+a[2]:0;}
function takePill(k){const a=S.pills[k];if(!a)return -1;for(let q=2;q>=0;q--)if(a[q]>0){a[q]--;return q;}return -1;}
function breakFail(u){const r=u.realm;let f;
  if(r===3)f=lianqiFail(u);
  else f=(TUNE.breakFail[r]||0.6)-u.wu*0.002-u.luck*0.0008-(isXW(u)?0.08:0);
  f-=(u.tpB||0);if(r===4||r===5){const k=r===4?'zj':'ny',a=S.pills[k];if(a&&a[2])f-=0.08;else if(a&&a[1])f-=0.04;}
  return clamp(f,r<=1?0.02:0.04,0.9);}
breakConds=function(u){
  const r=u.realm,list=[];if(r>=MAX_REALM)return {ok:false,list:[{t:'已達本版本最高境界（元嬰尚未開放）',ok:false}],auto:false,fail:0};
  const sub=u.sub||0;
  list.push({t:`修為圓滿（${SUB[sub]} ${Math.floor(u.xiu)}/${needXiu(u)}）`,ok:sub>=SUB_N-1&&u.xiu>=needXiu(u)});
  if(r===1)list.push({t:'宗門建有「練武閣」',ok:hasBuilt('lianwu')});
  if(r===2)list.push({t:`宗門持有「武學秘籍」（長書閣研究／村莊任務／遺跡）目前 ${S.items.miji}`,ok:S.items.miji>0});
  if(r===3){list.push({t:`持有「功法」（遺跡可得）目前 ${S.items.gongfa}`,ok:S.items.gongfa>0});
    list.push({t:u.lg?`身具靈根（${lgName(u.lg)}）`:`仙緣 ≥ ${lianqiNeedXY(u)}（目前 ${u.xy}${isXW(u)?'，仙武之體門檻減半':''}）`,ok:!!u.lg||u.xy>=lianqiNeedXY(u)});
    list.push({t:`「仙凡令」（闖過副本「仙凡之門」取得）目前 ${S.items.xfl||0}`,ok:(S.items.xfl||0)>0});
    list.push({t:`靈石 ${TUNE.lianqiLs}（突破時消耗，目前 ${Math.floor(S.res.lingshi)}）`,ok:S.res.lingshi>=TUNE.lianqiLs});}
  if(r===4){list.push({t:`築基丹 ×1（煉丹房煉製）目前 ${pillN('zj')}`,ok:pillN('zj')>0});list.push({t:`靈石 ${TUNE.zhujiLs}（目前 ${Math.floor(S.res.lingshi)}）`,ok:S.res.lingshi>=TUNE.zhujiLs});}
  if(r===5){list.push({t:`凝元丹 ×1（煉丹房 Lv3 煉製）目前 ${pillN('ny')}`,ok:pillN('ny')>0});list.push({t:`靈石 ${TUNE.jindanLs}（目前 ${Math.floor(S.res.lingshi)}）`,ok:S.res.lingshi>=TUNE.jindanLs});}
  return {ok:list.every(c=>c.ok),list,auto:r<=1,fail:breakFail(u)};
};
tryBreak=function(u,auto){
  if(!u||u.dead)return false;
  if((u.sub||0)<SUB_N-1){if(u.xiu>=needXiu(u)){advanceSub(u);return true;}if(!auto)toast(`${nm(u)}修為未滿（${realmName(u)}）`);return false;}
  const c=breakConds(u);
  if(!c.ok){if(!auto)toast(`${nm(u)}尚未滿足突破條件：`+c.list.filter(x=>!x.ok).map(x=>x.t).join('；'));return false;}
  const r=u.realm,f=c.fail;
  if(r===3)S.res.lingshi-=TUNE.lianqiLs;if(r===4){S.res.lingshi-=TUNE.zhujiLs;takePill('zj');}if(r===5){S.res.lingshi-=TUNE.jindanLs;takePill('ny');}
  u.tpB=0;
  if(rnd()<f){u.xiu=Math.floor(u.xiu*(1-TUNE.breakFailLoss));u.hp=Math.max(1,Math.floor(u.hp/2));fx('ring',u.x,u.y,'#ff6060');floater(u.x,u.y,'突破失敗','#ff8080');
    toast(`${nm(u)}衝擊「${REALMS[r+1].n}」失敗，氣血翻湧、修為倒退（失敗率 ${Math.round(f*100)}%）`);return false;}
  if(r===3)S.items.xfl=Math.max(0,(S.items.xfl||0)-1);
  doBreak(u);return true;
};
doBreak=function(u){
  stripGear(u);const m=xnStepM(u.realm,'hp'),ma=xnStepM(u.realm,'atk');u.realm++;u.sub=0;u.xiu=0;u.maxhp=Math.round(u.maxhp*m);u.atk=+(u.atk*ma).toFixed(1);u.speed=+(u.speed+0.08).toFixed(2);gearApply(u);u.hp=u.maxhp;
  S.stats.breaks++;fx('break',u.x,u.y,'#ffe27a');autoSaveSoon('突破');floater(u.x,u.y,'突破！','#ffe27a');
  const R=REALMS[u.realm];toast(`突破！${nm(u)}晉升「${R.n}」${R.ab?'，領悟「'+ABIL[R.ab].n+'」':''}`);
  if(u.realm>=4&&!S.flags.xian){S.flags.xian=true;setTimeout(()=>toast('宗門踏入修仙階段：住房化為洞府（修煉加成）、可建仙緣閣、求武台可升級為求仙台、山中靈石脈可開採'),600);chunkDirtyAll();}
};
function subLadder(p){if(!p)return '';return '<div class="ladder sub">'+SUB.map((s,k)=>`<span class="${k<(p.sub||0)?'done':k===(p.sub||0)?'cur':''}">${REALMS[p.realm].n}${s}</span>`).join('')+'</div>';}
// 新技能：築基「御劍術」、金丹「金丹威壓」
{const _ta=tryAbilities;tryAbilities=function(u,e,manual){
  if(e&&!u.dash){const d=dist(u.x,u.y,e.x,e.y);
    if(hasAb(u,'jindan')&&!(u.acd.jindan>0)){const near=S.enemies.filter(x=>dist(u.x,u.y,x.x,x.y)<2.5);if(near.length>=2||(manual&&near.length)){u.acd.jindan=ABIL.jindan.cd;fx('break',u.x,u.y,'#ffe27a');floater(u.x,u.y,'金丹威壓','#ffe27a');near.forEach(x=>{dmgEnemy(u,x,u.atk*2.5,'#ffe27a');if(!x.dead){if(typeof xnStun==='function')xnStun(x,1.2,u);else x.stun=1.2;}});return true;}}
    if(hasAb(u,'flysword')&&!(u.acd.flysword>0)&&d<=8&&los(u.x,u.y,e.x,e.y,0.05)){projectiles.push({x:u.x,y:u.y,tid:e.id,src:u.id,dmg:u.atk*3,t:0,sword:1});u.acd.flysword=ABIL.flysword.cd;u.anim=0.3;faceTo(u,e.x,e.y);floater(u.x,u.y,'御劍','#bfffd8');return true;}}
  return _ta(u,e,manual);};}

// ---- 材料、丹藥、丹方 ----
const MAT_NAMES={hide:'獸皮',bone:'獸骨',core:'妖丹',lingzhi:'靈芝',xuantie:'玄鐵'};
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
function makeItem(t,q,el){const T=GEAR[t],m=QMUL[q];return {id:S.nextItem++,t,slot:T.slot,q,el:el==null?-1:el,atk:+((T.atk||0)*m).toFixed(1),hp:Math.round((T.hp||0)*m),def:+((T.def||0)*m).toFixed(1),spd:+((T.spd||0)*(1+q*0.2)).toFixed(2)};}
function itemName(it){if(!it)return '物品';const G=typeof GEAR!=='undefined'&&GEAR[it.t];if(G&&G.n)return `${it.q!=null&&typeof QN!=='undefined'&&QN[it.q]?QN[it.q]:''}${it.el>=0?'・'+LG_EL[it.el]:''}・${G.n}`;if(it.n)return String(it.n);if(it.t==='gongfa'||it.type==='gongfa')return it.gfId?String(it.gfId):'功法';return String(it.t||it.type||'物品');}
function itemStats(it){const a=[];if(it.atk)a.push('攻擊 +'+it.atk);if(it.hp)a.push('氣血 +'+it.hp);if(it.def)a.push('防禦 +'+it.def);if(it.spd)a.push('速度 +'+it.spd);if(it.el>=0)a.push(`${LG_EL[it.el]}屬性（剋${LG_EL[KE[it.el]]}）`);return a.join('、');}
function addItem(it,x,y){const _icap=typeof econInvCap==='function'?econInvCap(typeof player==='function'?player():null):TUNE.invCap;if(S.inv.length>=_icap){S.res.lingshi+=1+it.q;toast(`行囊已滿，${itemName(it)}化為靈石 ${1+it.q}`);return false;}S.inv.push(it);if(x!=null)floater(x,y,'獲得 '+itemName(it),QC[it.q]);return true;}
function gearApply(u){if(u.gb)stripGear(u);const g={atk:0,hp:0,def:0,spd:0};const eq=u.eq||{};for(const k in eq){const it=eq[k];if(!it)continue;g.atk+=it.atk;g.hp+=it.hp;g.def+=it.def;g.spd+=it.spd;}
  if(!g.atk&&!g.hp&&!g.def&&!g.spd){u.gb=null;u.def=0;return;}
  u.atk=+(u.atk+g.atk).toFixed(1);u.maxhp=Math.round(u.maxhp+g.hp);u.speed=+(u.speed+g.spd).toFixed(2);u.def=g.def;u.gb=g;u.hp=Math.min(u.hp,u.maxhp);}
function slotFor(u,it){if(it.slot!=='c')return it.slot;const eq=u.eq||{};return !eq.c1?'c1':!eq.c2?'c2':'c1';}
function canWear(u,it,slot){if((slot||it.slot)==='f'&&u.realm<4)return '法器欄在煉氣後開放';if(it.q>=3&&u.realm<4)return `${QN[it.q]}需要煉氣以上才能駕馭`;return '';}
function equip(u,itId,slot){const it=S.inv.find(x=>x.id===itId);if(!u||!it)return false;slot=slot||slotFor(u,it);const why=canWear(u,it,slot);if(why){toast(why);return false;}
  u.eq=u.eq||{};const old=u.eq[slot];S.inv=S.inv.filter(x=>x!==it);if(old)S.inv.push(old);u.eq[slot]=it;gearApply(u);toast(`${nm(u)}裝備了 ${itemName(it)}`);return true;}
function unequip(u,slot){if(!u||!u.eq||!u.eq[slot])return false;const _icap=typeof econInvCap==='function'?econInvCap(u):TUNE.invCap;if(S.inv.length>=_icap){toast('行囊已滿');return false;}S.inv.push(u.eq[slot]);u.eq[slot]=null;gearApply(u);return true;}
function gearKey(u){const e=u.eq;if(!e)return '';let s='';for(const k in e)if(e[k])s+=e[k].id+',';return s;}
function gearLine(u){const e=u.eq||{},a=[];for(const k of ['w','a','c1','c2','f'])if(e[k])a.push(`<span style="color:${QC[e[k].q]}">${itemName(e[k])}</span>`);return `<div>裝備：${a.length?a.join('、'):'（無，點「行囊」穿戴）'}${u.def?'　防禦 '+u.def:''}</div>`;}
function weaponEl(u){const w=u.eq&&u.eq.w;if(w&&w.el>=0)return w.el;return -1;}
// 傷害：五行相剋＋防禦
{const _de=dmgEnemy;dmgEnemy=function(src,e,amt,col){if(src&&src.kind&&e&&!e.dead){const D=ENEMY[e.type];const m=elMul(weaponEl(src),D?D.el:-1);if(m!==1){amt*=m;if(m>1&&rnd()<0.3)floater(e.x,e.y-0.4,'剋！','#ffe27a');}}return _de(src,e,amt,col);};}
{const _du=dmgUnit;dmgUnit=function(src,u,amt){if(u&&!u.dead){if(u.def)amt=Math.max(amt*0.3,amt-u.def*0.5);const ar=u.eq&&u.eq.a;if(ar&&ar.el>=0&&src&&ENEMY[src.type]){const m=elMul(ar.el,ENEMY[src.type].el);if(m>1)amt*=0.85;}
  if(S.dg&&u.hp-amt<=0&&(u.shield||0)<=0){dgDown(u);return;}}return _du(src,u,amt);};}
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
function rollDrops(e,cb){if(!enemyItemDropPermit(e,'legacy'))return;for(const [k,p,n] of DROPS[e.type]||[])if(rnd()<p)cb('m',k,n);
  const gp={bandit:0.05,chief:0.15,warden:0.25,golem:0.08,xfguard:0.12,xfboss:0.40}[e.type]||0;if(rnd()<gp){const t=pick(GEAR_ORDER.slice(0,8));const q=Math.min(4,(rnd()<0.15?1:0)+(e.type==='chief'||e.type==='warden'?1:0)+(e.type==='xfboss'?2:0)+(e.realm>=3&&rnd()<0.15?1:0));cb('g',t,q);}}
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
