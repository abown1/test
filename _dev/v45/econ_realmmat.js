// ================== 仙武經濟：11 境材料、關聯物品、新裝備 80×3（econ_realmmat）==================
// 規格：/workspace/xianwu_records/specs/REALM_MATERIALS_20261113.txt；盤點 /tmp/econ_realmmat/INVENTORY.md。
// 使用者 09:51 定案：現有 370 件套裝保留不動；另加 80×3（防具／武器／護符各 72 套裝件＋8 單件）；極強單件＝方案甲（主屬 ×1.10）；
// 靈石＝四品貨幣，不新增物品、不改名。名稱不同的 24 條維持遊戲現名，不重複新增。
// 旗標預設關：econRealmMatOn()。優先序：window.ECON_REALMMAT_FORCE（true/false）→ 網址 ?realmmat=1/0 → S.econ.flags.realmmat（布林，明確設定才算）→ ECON_REALMMAT_DEFAULT。
// 不放進 ECON_FLAGS_DEFAULT（g23 ?dev=1 會把那張表全設 true）。
// 存檔：只用既有通用表 S.mats／S.pills／S.inv（物品另帶 it.n 名稱，讓旗標關時仍能顯示）。不改 SAVE_VER、不新增 S 頂層欄位。
// 旗標關：MAT_NAMES／MAT_DESC／MAT_PRECIOUS／PILLS／PILL_ORDER／GEAR 一個鍵都不加（已加過就移除）；存檔裡的數量照樣保留在 S.mats／S.pills，只是不顯示。
// 未定數值（掉落率、價格、合成工時與靈石、丹藥／符籙／陣盤效果、新裝備取得方式）一律不猜：效果欄 pending，無遊戲作用。見 /tmp/econ_realmmat/PENDING_NUMBERS.md。
var ECON_REALMMAT_DEFAULT=false;
function econRealmMatOn(){
  try{if(typeof window!=='undefined'&&typeof window.ECON_REALMMAT_FORCE==='boolean')return window.ECON_REALMMAT_FORCE;}catch(e){}
  try{if(typeof location!=='undefined'&&location.search){const m=/[?&]realmmat=([01])/.exec(location.search);if(m)return m[1]==='1';}}catch(e){}
  try{if(typeof S!=='undefined'&&S&&S.econ&&S.econ.flags&&typeof S.econ.flags.realmmat==='boolean')return S.econ.flags.realmmat;}catch(e){}
  return !!ECON_REALMMAT_DEFAULT;
}
var ECON_RM_SYN_RATIO=10;          // 使用者定：10:1
var ECON_RM_SYN_EXTRA_COST=null;   // 待定：合成另需靈石／工時（目前不收）
var ECON_RM_STRONG_MUL=1.10;       // 使用者定（方案甲）：極強單件主屬＝同境同部位套裝件 ×1.10
// 極強防過強（使用者 10:15 定）：極強不計入套裝件數；同時最多穿 2 件（主角、弟子、一鍵最佳／全員最佳皆同）。
// 旗標：econStrongCapOn()＝realmmat 開 且 未被 window.ECON_STRONGCAP_FORCE=false／?strongcap=0／S.econ.flags.strongCap=false 關掉。
// 舊檔已穿超過 2 件：不強制卸下，只擋「讓件數變多」的新穿（同欄換另一件極強照准）。
var ECON_RM_STRONG_MAX_EQUIP=2;    // 同時最多裝幾件極強
var ECON_RM_STRONG_SET_COUNT=false;// 極強不計入套裝件數（新件 setId=0，econ_gear setCounts 只數 gs*，本來就不會算進去）
var ECON_RM_MIX_SET_MUL=1;         // 混穿時套裝加成倍率（使用者未採用打折；保留常數不讀）
// 收集圖鑑（使用者 10:15 同意方案二）：存檔欄位 S.econ.codex={v:1,seen:{'m:材料id'|'p:丹藥id'|'g:裝備目錄id':首次取得遊戲秒(≥1)}}。
// 旗標：econCodexOn()＝realmmat 開 且 未被 window.ECON_CODEX_FORCE=false／?codex=0／S.econ.flags.codex=false 關掉。旗標關：完全不讀不寫。

var ECON_RM=(function(){
  const RN=['武徒','武師','大武師','宗師','煉氣','築基','金丹','元嬰','化神','合體','地仙'];
  // ---- 材料：[id, 名稱, 境界, 說明]。常規 rmc{境}_{序}，貴重 rmp{境}_{序}。id 一經發佈不可改（存檔用）。
  const REG=[
    [0,['百年黃精']],
    [1,['百煉精鋼','幽冥草','風狼筋']],
    [2,['秘銀礦','巨蟒鱗片','紫雲芝','雷擊木']],
    [3,['碧玉髓','龍血藤','千年人參']],
    [4,['聚靈草','青銅靈木','陰風砂']],
    [5,['赤銅精金','冰心蓮','火蜥蜴皮']],
    [6,['星辰鐵砂','佛門金剛木','幻影蝶翼']],
    [7,['萬毒花王','隕星鐵塊','蛟龍筋']],
    [8,['法則碎片（木）','法則碎片（火）','法則碎片（水）','法則碎片（雷）','陰陽靈泉水','鳳凰尾羽（雜血）','建木枝幹']],
    [9,['空間結晶','太陽真火灰燼','虛空精金','輪迴草']],
    [10,['仙靈之氣結晶','混沌頑石','星辰本源砂','不朽神木']]
  ];
  const PRE=[
    [0,[['赤血朱果','蘊含純陽氣血'],['黑曜精鐵','深層地底伴生礦']]],
    [1,[['地火炎晶','火山口火屬性晶石'],['寒潭玄冰髓','極寒水底精華']]],
    [2,[['天雷竹心','歷經九次雷劈的靈竹核心']]],
    [3,[['萬年石乳','地脈靈氣積聚靈液'],['血煞妖魂晶','戰場怨氣與精血凝結']]],
    [4,[['九幽陰火種','地底幽冥裂縫冷火'],['紫霄雷紋石','蘊含天地正雷印記']]],
    [5,[['地心紅蓮子','岩漿業火紅蓮種子'],['玄冰萬載玉','萬年不化極寒神玉']]],
    [6,[['菩提金剛子','古佛道場肉身舍利'],['虛空幻影石','折射空間光影的異界礦石']]],
    [7,[['太古蒼龍逆鱗','真龍後裔護心鱗片'],['天魔噬魂花','吞噬神魂成長的魔花']]],
    [8,[['太極陰陽魚眼','陰陽交匯先天靈物'],['脩羅血海結晶','無盡殺戮凝結血鑽']]],
    [9,[['大日金烏精血','三足金烏本源真血'],['虛空裂縫核心','空間風暴中心穩定奇點']]],
    [10,[['開天混沌母氣','世界誕生本源之氣'],['十二品滅世黑蓮瓣','毀滅法則具象化神物'],['不朽仙王骨','上古仙人遺留仙骨']]]
  ];
  // 大武師的蠻牛妖丹＝現有 core「妖丹」（名稱不同，不重複新增）。
  const MATS={},ORDER=[];
  REG.forEach(([r,L])=>L.forEach((n,i)=>{const id='rmc'+r+'_'+(i+1);MATS[id]={id,n,r,cat:'reg',desc:'【'+RN[r]+'・常規】鍛造、煉丹、陣法與強化用。可在鍛造坊 10 合 1 成高一境常規材料（掉落與用途數值待定）'};ORDER.push(id);}));
  PRE.forEach(([r,L])=>L.forEach((x,i)=>{const id='rmp'+r+'_'+(i+1);MATS[id]={id,n:x[0],r,cat:'pre',desc:'【'+RN[r]+'・貴重】'+x[1]+'。只從秘境、世界 Boss、拍賣會取得；不可合成（來源機率與價格待定）'};ORDER.push(id);}));
  // ---- 關聯物品：丹藥進 PILLS（kind:'rmpend'，不能服、不進丹方）；符籙／陣盤／傀儡進 S.mats（分類 item）
  const PEND='（效果待定：目前沒有任何作用，不能服用）';
  const PILLS_RM=[
    ['rmd_1','武徒突破散',0,'總表：突破武師必備。'],
    ['rmd_2','烈陽真氣丹',1,'總表：武師境關聯丹藥。'],
    ['rmd_3','寒冰護脈丹',1,'總表：武師境關聯丹藥。'],
    ['rmd_4','宗師破境丹',3,'總表：踏入修仙煉氣的關鍵丹藥。'],
    ['rmd_5','神識擴張丹',5,'總表：築基境關聯丹藥。'],
    ['rmd_6','本命法寶溫養液',6,'總表：金丹境關聯物品。'],
    ['rmd_7','元神出竅香',7,'總表：元嬰境關聯物品。'],
    ['rmd_8','化神悟道茶',8,'總表：提升領域領悟度。'],
    ['rmd_9','仙武合體丹',9,'總表：肉身與元神徹底融合的關鍵。'],
    ['rmd_10','九轉地仙丹',10,'總表：大幅增加壽元與全屬性。']
  ];
  const ITEMS_RM=[
    ['rmf_1','雷鳴爆裂符',2,'符籙','總表：戰鬥消耗品。'],
    ['rmf_2','罡氣護體符',3,'符籙','總表：宗師境關聯符籙。'],
    ['rmf_3','御風飛行符',4,'符籙','總表：煉氣境關聯符籙。'],
    ['rmf_4','空間挪移符',9,'符籙','總表：無視距離逃生寶物。'],
    ['rmz_1','初級聚靈陣盤',1,'陣盤','總表：武師境關聯陣盤。'],
    ['rmz_2','洞府初級聚靈陣旗',4,'陣盤','總表：煉氣境關聯陣旗。'],
    ['rmz_3','中級傳送陣盤',5,'陣盤','總表：築基境關聯陣盤。'],
    ['rmz_4','渡劫避雷針／護道陣',10,'陣盤','總表：飛升天仙終極消耗品（1 件或拆 2 件待定）。'],
    ['rmk_1','金丹期傀儡核心',6,'傀儡','總表：金丹境關聯物品。'],
    ['rmk_2','替死傀儡',8,'傀儡','總表：抵擋一次致命傷害。']
  ];
  ITEMS_RM.forEach(x=>{MATS[x[0]]={id:x[0],n:x[1],r:x[2],cat:'item',kind:x[3],desc:'【'+RN[x[2]]+'・'+x[3]+'】'+x[4]+PEND.replace('服用','使用')};ORDER.push(x[0]);});
  const PILL_DEF={};PILLS_RM.forEach(x=>{PILL_DEF[x[0]]={n:x[1],kind:'rmpend',rmPending:1,needRealm:x[2],cost:{},diff:0,desc:'【'+RN[x[2]]+'】'+x[3]+PEND};});

  // ---- 新裝備 80×3（使用者 09:39／09:41／09:51）。數值公式抄自 econ_gear.js gearV2（A／H／KA／KH／部位係數，q＝1.00），同步維護。
  const A=[30,125,185,270,385,525,700,950,1300,1750,2300,2600];
  const H=[3600,5500,6700,8400,10700,13500,17000,22000,29000,38000,41000,50000];
  const KA=[1,1,1,1,0.88,0.80,0.85,0.88,0.82,0.75,1,1];
  const KH=[1,0.53,0.60,0.65,0.62,0.62,0.70,0.75,0.72,0.20,1,1];
  const ACC_MAIN={necklace:{atk:0.04},ring:{atk:0.04},orb:{atk:0.03},pendant:{hp:0.05},bracelet:{hp:0.04,def:0.03}};
  const ARM={a:[0.06,0.09],hd:[0.04,0.06]};
  const r1=v=>Math.round(v*10)/10;
  const SETN=['','鐵骨金身','清風靈動','烈陽剛勁','寒潭碧水','蠻牛霸體','迅雷流光','玄木滋養','厚土沉重','血煞穿心','百鍊罡氣','九幽陰風','紫霄正雷','赤蓮焚心','玄冰凝霜','金剛不壞','幻影千殺','天靈共鳴','噬魂毒煞','星辰隕鐵','蒼龍出海','太極陰陽','四野霸主','脩羅血獄','九天玄女','不動明王','大日金烏','虛空破滅','萬法歸一','荒古戰帝','幽冥閻羅','混沌開天','太初道尊','神魔同體','蝕日墨蓮','諸天星宿','不朽仙尊','萬劫陰陽','大輪迴術','屠神滅佛','仙武至尊'];
  // 規格歸境（INVENTORY §6.3）：[境界, 套號起, 套號迄, 第二件數, 單件數]
  const PLAN=[[0,1,1,1,1],[1,2,4,2,1],[2,5,7,2,0],[3,8,10,2,1],[4,11,12,2,1],[5,13,14,2,0],[6,15,17,2,1],[7,18,20,2,0],[8,21,24,3,1],[9,25,30,6,1],[10,31,40,8,1]];
  const WK=['sword','saber','spear','fist','bow','dagger','blunt','staff'],WN={sword:'劍',saber:'刀',spear:'槍',fist:'拳套',bow:'弓',dagger:'短刃',blunt:'錘',staff:'杖'};
  const CK=['necklace','ring','pendant','bracelet','orb'],CN={necklace:'項鍊',ring:'戒',pendant:'玉佩',bracelet:'手鐲',orb:'寶珠'};
  // 總表泛稱裝備（11 筆「要新增」）對應到哪一件：寫在 desc
  const GENERIC={'w0s':'木杖','w5_13':'本命法寶胚胎（築基）','w7_18':'極品法寶','a7_18':'元嬰護體靈寶','w8s':'後天靈寶','w9s':'先天靈寶','w10s':'極道帝兵','c4s':'靈氣戒指','c6s':'金丹期屬性寶珠','c9s':'合體期高階飾品','c10s':'地仙專屬仙器飾品'};
  // 單件（原創名）：[境界, 武器名, 武器種類, 防具名, 護符名, 護符種類, 極強?]
  const SINGLE=[
    [0,'樵山木杖','staff','粗麻護心衣','粗鐵護腕','bracelet',0],
    [1,'千錘精鋼刀','saber','鐵鱗短甲','青銅辟邪鈴','pendant',0],
    [3,'鎮嶽名鋒','sword','玄紋重鎧','凝脂玉佩','pendant',0],
    [4,'流螢飛劍','sword','凝霧法袍','聚靈石戒','ring',0],
    [6,'熔金曜日劍','sword','金曦護身甲','五炁寶珠','orb',1],
    [8,'斷川靈刃','dagger','玄淵鎮魂鎧','歸元護魂珠','orb',1],
    [9,'蒼穹裂空槍','spear','虛衍流光衣','合璧雙魂墜','necklace',0],
    [10,'萬古鎮世戟','spear','太素仙甲','天衍仙紋佩','necklace',1]
  ];
  function wStat(r){return {atk:r1(A[r]*0.18*KA[r]),hp:0,def:0};}
  function aStat(r,sl){const c=ARM[sl];return {atk:0,hp:Math.round(H[r]*c[0]*KH[r]),def:r1(A[r]*c[1]*KA[r])};}
  function cStat(r,k){const M=ACC_MAIN[k]||{};return {atk:M.atk?r1(A[r]*M.atk*KA[r]):0,hp:M.hp?Math.round(H[r]*M.hp*KH[r]):0,def:M.def?r1(A[r]*M.def*KA[r]):0};}
  function mul(s,m){return {atk:r1(s.atk*m),hp:Math.round(s.hp*m),def:r1(s.def*m)};}
  const GEARS={},GORDER=[];
  function addG(id,o){GEARS[id]=o;GORDER.push(id);}
  PLAN.forEach(([r,s0,s1,sec,sg])=>{
    for(let no=s0;no<=s1;no++){
      const k=no-s0,two=k<sec,sn=SETN[no];
      const wk=WK[(no-1)%8],wk2=WK[no%8],ck=CK[(no-1)%5],ck2=CK[no%5];
      const tag=(t)=>GENERIC[t+r+'_'+no]?('；對應總表「'+GENERIC[t+r+'_'+no]+'」'):'';
      addG('rmgw'+r+'_'+no+'a',{n:sn+WN[wk],type:'w',slot:'w',kind:wk,r,setId:no,st:wStat(r),extra:tag('w')});
      if(two)addG('rmgw'+r+'_'+no+'b',{n:sn+WN[wk2],type:'w',slot:'w',kind:wk2,r,setId:no,st:wStat(r),extra:''});
      addG('rmga'+r+'_'+no+'a',{n:sn+'護甲',type:'a',slot:'a',kind:'armor',r,setId:no,st:aStat(r,'a'),extra:tag('a')});
      if(two)addG('rmga'+r+'_'+no+'b',{n:sn+'冠',type:'a',slot:'hd',kind:'head',r,setId:no,st:aStat(r,'hd'),extra:''});
      addG('rmgc'+r+'_'+no+'a',{n:sn+CN[ck],type:'c',slot:'c',kind:ck,r,setId:no,st:cStat(r,ck),extra:''});
      if(two)addG('rmgc'+r+'_'+no+'b',{n:sn+CN[ck2],type:'c',slot:'c',kind:ck2,r,setId:no,st:cStat(r,ck2),extra:''});
    }
    if(sg){const S1=SINGLE.find(x=>x[0]===r);const strong=!!S1[6],m=strong?ECON_RM_STRONG_MUL:1;
      const g=(t)=>GENERIC[t+r+'s']?('；對應總表「'+GENERIC[t+r+'s']+'」'):'';
      addG('rmgw'+r+'_s',{n:S1[1],type:'w',slot:'w',kind:S1[2],r,setId:0,strong,st:mul(wStat(r),m),extra:g('w')});
      addG('rmga'+r+'_s',{n:S1[3],type:'a',slot:'a',kind:'armor',r,setId:0,strong,st:mul(aStat(r,'a'),m),extra:g('a')});
      // 方案甲比較對象：同境同部位套裝件。護符取「同境第一套主護符」的種類當基準，極強件沿用同種類
      const refK=strong?CK[(s0-1)%5]:S1[5];
      addG('rmgc'+r+'_s',{n:S1[4],type:'c',slot:'c',kind:refK,r,setId:0,strong,st:mul(cStat(r,refK),m),extra:g('c')});
    }
  });
  const TYPE_N={w:'武器',a:'防具',c:'護符'};
  for(const id of GORDER){const G=GEARS[id];
    G.desc=(G.setId?('【'+SETN[G.setId]+'】套裝件（新表 80×3；套效計數待定）'):(G.strong?'【極強單件】主屬性比同境同部位套裝件高 10%':'【單件】'))+'・'+TYPE_N[G.type]+'（'+RN[G.r]+'）'+G.extra+'。數值暫依新表公式，取得方式待定';
  }
  return {RN,MATS,ORDER,PILL_DEF,PILL_ORDER_RM:PILLS_RM.map(x=>x[0]),GEARS,GORDER,SETN,PLAN,
    stat:{wStat,aStat,cStat,mul}};
})();

(function(){
  const R=ECON_RM;let installed=false;
  function G(){try{return (typeof GEAR!=='undefined'&&GEAR)?GEAR:null;}catch(e){return null;}}
  function gearDef(id){const g=R.GEARS[id];return {n:g.n,slot:g.slot,atk:g.st.atk,hp:g.st.hp,def:g.st.def,spd:0,cost:{},realm:g.r,desc:g.desc,rmg:1,rmSet:g.setId||0,rmStrong:g.strong?1:0};}
  function install(){
    if(installed)return;
    try{if(typeof MAT_NAMES!=='undefined')for(const id of R.ORDER){MAT_NAMES[id]=R.MATS[id].n;if(typeof MAT_DESC!=='undefined')MAT_DESC[id]=R.MATS[id].desc;}}catch(e){}
    try{if(typeof MAT_PRECIOUS!=='undefined')for(const id of R.ORDER)if(R.MATS[id].cat==='pre')MAT_PRECIOUS[id]=1;}catch(e){}
    try{if(typeof PILLS!=='undefined'){for(const id of R.PILL_ORDER_RM)PILLS[id]=Object.assign({},R.PILL_DEF[id],{cost:{}});if(typeof PILL_ORDER!=='undefined')for(const id of R.PILL_ORDER_RM)if(PILL_ORDER.indexOf(id)<0)PILL_ORDER.push(id);}}catch(e){}
    try{const g=G();if(g)for(const id of R.GORDER)if(!g[id])g[id]=gearDef(id);}catch(e){}
    installed=true;
  }
  function uninstall(){
    if(!installed)return;
    try{if(typeof MAT_NAMES!=='undefined')for(const id of R.ORDER){delete MAT_NAMES[id];if(typeof MAT_DESC!=='undefined')delete MAT_DESC[id];}}catch(e){}
    try{if(typeof MAT_PRECIOUS!=='undefined')for(const id of R.ORDER)delete MAT_PRECIOUS[id];}catch(e){}
    try{if(typeof PILLS!=='undefined')for(const id of R.PILL_ORDER_RM)delete PILLS[id];if(typeof PILL_ORDER!=='undefined')for(const id of R.PILL_ORDER_RM){const i=PILL_ORDER.indexOf(id);if(i>=0)PILL_ORDER.splice(i,1);}}catch(e){}
    try{const g=G();if(g)for(const id of R.GORDER)if(g[id]&&g[id].rmg)delete g[id];}catch(e){}
    installed=false;
  }
  function sync(){const on=econRealmMatOn();if(on)install();else uninstall();return on;}
  function isReg(k){const m=R.MATS[k];return !!(m&&m.cat==='reg');}
  function isPre(k){const m=R.MATS[k];return !!(m&&m.cat==='pre');}
  function synthTargets(inK){const m=R.MATS[inK];if(!m||m.cat!=='reg')return [];return R.ORDER.filter(k=>R.MATS[k].cat==='reg'&&R.MATS[k].r===m.r+1);}
  // 10:1 合成：投入 10×某境常規 → 1×高一境常規（產出由玩家選）。貴重、符籙等一律拒絕。工時／靈石待定＝不收。
  function synth(inK,outK,times){
    times=Math.max(1,Math.floor(+times||1));
    if(!sync())return {ok:false,why:'off'};
    if(isPre(inK)||isPre(outK))return {ok:false,why:'precious'};
    if(!isReg(inK)||!isReg(outK))return {ok:false,why:'notreg'};
    if(R.MATS[outK].r!==R.MATS[inK].r+1)return {ok:false,why:'tier'};
    const need=ECON_RM_SYN_RATIO*times,haveN=(S.mats&&S.mats[inK])||0;
    if(haveN<need)return {ok:false,why:'lack',need,have:haveN};
    {const X=typeof econXws==='function'?econXws():null; if(X&&X.take('mat:'+inK,need,'rmSynth').ok)X.add('mat:'+outK,times,'rmSynth');else{S.mats[inK]=haveN-need;S.mats[outK]=(S.mats[outK]||0)+times;}}
    try{if(S.stats)S.stats.rmSynth=(S.stats.rmSynth||0)+times;}catch(e){}
    return {ok:true,in:inK,out:outK,n:times,spent:need};
  }
  // 測試／其他組（新地圖秘境、世界 Boss、拍賣）取得用：旗標關時不給
  function grantMat(k,n){if(!sync()||!R.MATS[k])return false;n=Math.max(0,n|0);const X=typeof econXws==='function'?econXws():null; if(n>0&&X&&X.add('mat:'+k,n,'grantMat').ok)return true;S.mats[k]=(S.mats[k]||0)+n;return true;}
  function grantPill(k,q,n){if(!sync()||!R.PILL_DEF[k])return false;if(typeof addPill==='function')addPill(k,q|0,n||1);else{const X=typeof econXws==='function'?econXws():null; if(!(X&&X.add('pill:'+k+':'+Math.max(0,Math.min(2,q|0)),n||1,'grantPill').ok)){S.pills[k]=S.pills[k]||[0,0,0];S.pills[k][q|0]+=n||1;}}return true;}
  const Q_SCALE=[0.75,0.90,1.00,1.12,1.18,1.25]; // 同 econ_gear.js gearV2 品質縮放（暫用）
  function makeGear(id,q){
    if(!sync()||!R.GEARS[id])return null;q=Math.max(0,Math.min(4,q|0));
    const g=R.GEARS[id],s=Q_SCALE[q];
    let it=null;try{if(typeof makeItem==='function')it=makeItem(id,q,-1);}catch(e){}
    if(!it)it={id:(S.nextItem=(S.nextItem||1)+1)-1,t:id,slot:g.slot,q,el:-1};
    it.atk=Math.round(g.st.atk*s*10)/10;it.hp=Math.round(g.st.hp*s);it.def=Math.round(g.st.def*s*10)/10;it.spd=0;
    it.slot=g.slot;it.realm=g.r;it.n=g.n; // it.n：旗標關、目錄不在時 itemName 仍顯示名稱（通用欄位，不改存檔結構）
    return it;
  }
  function grantGear(id,q){const it=makeGear(id,q);if(!it)return null;try{if(typeof addItem==='function'){if(!addItem(it))return null;}else{const X=typeof econXws==='function'?econXws():null; if(!(X&&X.invAdd(it,'grantGear').ok))S.inv.push(it);}}catch(e){return null;}return it;}
  function counts(){
    const c={reg:0,pre:0,item:0,pill:R.PILL_ORDER_RM.length,gear:{w:0,a:0,c:0},gearSet:{w:0,a:0,c:0},gearSingle:{w:0,a:0,c:0},strong:{w:0,a:0,c:0}};
    for(const k of R.ORDER)c[R.MATS[k].cat]++;
    for(const id of R.GORDER){const g=R.GEARS[id];c.gear[g.type]++;if(g.setId)c.gearSet[g.type]++;else c.gearSingle[g.type]++;if(g.strong)c.strong[g.type]++;}
    return c;
  }
  const API={on:econRealmMatOn,sync,install,uninstall,isReg,isPre,synthTargets,synth,grantMat,grantPill,makeGear,grantGear,counts,data:R};
  try{if(typeof window!=='undefined'){window.XW_ECON=window.XW_ECON||{};window.XW_ECON.realmMat=API;window.econRealmMat=API;}}catch(e){}
  sync();

  // ---- 掛鉤（全在本檔 wrap，不改 g*.js）----
  if(typeof usePill==='function'&&!usePill._rm){const _up=usePill;usePill=function(u,k){try{if(k&&R.PILL_DEF[k]){if(typeof toast==='function')toast((R.PILL_DEF[k].n)+'的效果待定，目前不能服用');return false;}}catch(e){}return _up.apply(this,arguments);};usePill._rm=1;}
  function esc(s){return String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));}
  function matTableHtml(){
    const base=Object.keys(MAT_NAMES).filter(k=>!R.MATS[k]);
    const row=k=>`<tr data-tip="mat:${k}"><td>${esc(MAT_NAMES[k])}</td><td><b>${(S.mats&&S.mats[k])||0}</b></td><td class="dim">${esc(MAT_DESC[k]||'')}</td></tr>`;
    let h=base.map(row).join('');
    const sec=(title,keys)=>{if(!keys.length)return '';return `<tr><td colspan="3" class="gt" style="padding-top:6px"><b>${title}</b></td></tr>`+keys.map(row).join('');};
    for(let r=0;r<=10;r++){h+=sec(R.RN[r]+'・常規材料',R.ORDER.filter(k=>R.MATS[k].cat==='reg'&&R.MATS[k].r===r));}
    h+=sec('貴重材料（秘境／世界 Boss／拍賣；不可合成）',R.ORDER.filter(k=>R.MATS[k].cat==='pre'));
    h+=sec('符籙・陣盤・傀儡（效果待定）',R.ORDER.filter(k=>R.MATS[k].cat==='item'));
    return h;
  }
  if(typeof renderBag==='function'&&!renderBag._rm){const _rb=renderBag;renderBag=function(){sync();const r=_rb.apply(this,arguments);try{
      if(!econRealmMatOn()||typeof bagOpen==='undefined'||!bagOpen)return r;const el=document.getElementById('bag');if(!el)return r;
      if(bagTab==='mat'){const t=el.querySelector('table');if(t&&!t.hasAttribute('data-rm')){t.setAttribute('data-rm','1');t.innerHTML=matTableHtml();}}
      if(bagTab==='pill'){el.querySelectorAll('[data-use]').forEach(b=>{if(R.PILL_DEF[b.getAttribute('data-use')]){const s=document.createElement('small');s.className='dim';s.textContent='效果待定，暫不能服用';b.replaceWith(s);}});}
    }catch(e){}return r;};renderBag._rm=1;}
  // 鍛造坊（＝總表「煉器爐」）合成面板
  let selIn=null,selOut=null,lastMsg='',boxKey=null,boxHtml='';
  function synHtml(){
    const regs=R.ORDER.filter(k=>R.MATS[k].cat==='reg'&&R.MATS[k].r<10);
    const own=k=>(S.mats&&S.mats[k])||0;
    if(!selIn||!R.MATS[selIn]||R.MATS[selIn].r>=10){selIn=regs.slice().sort((a,b)=>own(b)-own(a))[0];}
    const outs=synthTargets(selIn);if(!selOut||outs.indexOf(selOut)<0)selOut=outs[0];
    const n=own(selIn),can=Math.floor(n/ECON_RM_SYN_RATIO);
    let h='<div class="gt"><b>常規材料 10 合 1</b>（鍛造坊即總表「煉器爐」；試行・旗標 ?realmmat=1）</div>';
    h+='<div class="dim sm">投入 10 個某境常規材料 → 得 1 個高一境常規材料。貴重材料不可合成。額外工時／靈石待定，目前不收。</div>';
    h+='<div class="jobs" style="flex-wrap:wrap;gap:6px">投入 <select data-rm-in>'+regs.map(k=>`<option value="${k}"${k===selIn?' selected':''}>${R.RN[R.MATS[k].r]}・${esc(R.MATS[k].n)}（${own(k)}）</option>`).join('')+'</select>';
    h+=' → 產出 <select data-rm-out>'+outs.map(k=>`<option value="${k}"${k===selOut?' selected':''}>${R.RN[R.MATS[k].r]}・${esc(R.MATS[k].n)}（${own(k)}）</option>`).join('')+'</select></div>';
    h+=`<div class="jobs"><button type="button" class="btn ${can>=1?'pri':'dis'}" data-rm-syn="1" ${can>=1?'':'disabled'}>合成 ×1（耗 ${ECON_RM_SYN_RATIO}）</button><button type="button" class="btn ${can>=10?'pri':'dis'}" data-rm-syn="10" ${can>=10?'':'disabled'}>合成 ×10（耗 ${ECON_RM_SYN_RATIO*10}）</button><span class="dim sm">可合成 ${can} 次</span></div>`;
    if(lastMsg)h+=`<div class="sm" data-rm-msg>${esc(lastMsg)}</div>`;
    const c=counts();
    h+=`<details><summary>新裝備目錄（防具 ${c.gear.a}／武器 ${c.gear.w}／護符 ${c.gear.c}；取得方式與數值待定）</summary><div class="dim sm" style="max-height:200px;overflow:auto">`;
    for(let r=0;r<=10;r++){const L=R.GORDER.filter(id=>R.GEARS[id].r===r);if(!L.length)continue;h+=`<div><b>${R.RN[r]}</b>：`+L.map(id=>{const g=R.GEARS[id];return (g.strong?'★':'')+esc(g.n);}).join('、')+'</div>';}
    h+='</div></details>';
    return h;
  }
  function injectSyn(){
    try{
      if(!econRealmMatOn())return;const el=document.getElementById('craft');if(!el)return;
      const b=(typeof bById==='function'&&typeof craftB!=='undefined')?bById(craftB):null;if(!b||b.type!=='forge')return;
      if(typeof craftOpen!=='undefined'&&!craftOpen)return;
      const key=JSON.stringify([selIn,selOut,lastMsg,R.ORDER.map(k=>(S.mats&&S.mats[k])||0)]);
      let box=el.querySelector('#econ-rm-syn');
      if(key!==boxKey||!boxHtml){boxKey=key;boxHtml=synHtml();if(box)box.innerHTML=boxHtml;}
      if(!box){box=document.createElement('div');box.id='econ-rm-syn';box.style.cssText='margin:8px 0;padding:8px;border:1px solid #5a8a6a66;border-radius:8px;';box.innerHTML=boxHtml;el.appendChild(box);}
    }catch(e){}
  }
  function rmClick(ev){
    try{const t=ev.target;if(!t||!t.closest)return;
      const sIn=t.closest('[data-rm-in]'),sOut=t.closest('[data-rm-out]');
      if(ev.type==='change'&&sIn){selIn=sIn.value;selOut=null;lastMsg='';boxKey=null;injectSyn();return;}
      if(ev.type==='change'&&sOut){selOut=sOut.value;boxKey=null;injectSyn();return;}
      const bt=ev.type==='click'&&t.closest('#econ-rm-syn [data-rm-syn]');
      if(bt){ev.stopPropagation();const n=+bt.getAttribute('data-rm-syn')||1;const r=synth(selIn,selOut,n);
        lastMsg=r.ok?('合成成功：'+R.MATS[r.out].n+' +'+r.n+'（耗 '+R.MATS[r.in].n+' '+r.spent+'）'):(r.why==='lack'?('數量不足：需要 '+r.need+'，現有 '+r.have):r.why==='precious'?'貴重材料不可合成':'無法合成');
        try{if(typeof toast==='function')toast(lastMsg);}catch(e){}boxKey=null;injectSyn();}
    }catch(e){}
  }
  if(typeof renderCraft==='function'&&!renderCraft._rm){const _rc=renderCraft;renderCraft=function(){sync();const r=_rc.apply(this,arguments);injectSyn();return r;};renderCraft._rm=1;}
  try{if(typeof document!=='undefined'&&document.addEventListener&&!document._rmClick){document._rmClick=1;document.addEventListener('click',rmClick,true);document.addEventListener('change',rmClick,true);}}catch(e){}
  // 旗標可能在讀檔後由 S.econ.flags 改變：每秒對齊一次（便宜，只比布林）；鍛造面板開著時順便刷新數量
  try{if(typeof setInterval==='function'&&typeof document!=='undefined')setInterval(function(){try{sync();if(typeof craftOpen!=='undefined'&&craftOpen)injectSyn();}catch(e){}},1000);}catch(e){}
})();

// ================== 極強件數上限（strongcap）＋收集圖鑑（codex）==================
function econStrongCapOn(){
  if(!econRealmMatOn())return false;
  try{if(typeof window!=='undefined'&&typeof window.ECON_STRONGCAP_FORCE==='boolean')return window.ECON_STRONGCAP_FORCE;}catch(e){}
  try{if(typeof location!=='undefined'&&location.search){const m=/[?&]strongcap=([01])/.exec(location.search);if(m)return m[1]==='1';}}catch(e){}
  try{if(typeof S!=='undefined'&&S&&S.econ&&S.econ.flags&&typeof S.econ.flags.strongCap==='boolean')return S.econ.flags.strongCap;}catch(e){}
  return true;
}
function econCodexOn(){
  if(!econRealmMatOn())return false;
  try{if(typeof window!=='undefined'&&typeof window.ECON_CODEX_FORCE==='boolean')return window.ECON_CODEX_FORCE;}catch(e){}
  try{if(typeof location!=='undefined'&&location.search){const m=/[?&]codex=([01])/.exec(location.search);if(m)return m[1]==='1';}}catch(e){}
  try{if(typeof S!=='undefined'&&S&&S.econ&&S.econ.flags&&typeof S.econ.flags.codex==='boolean')return S.econ.flags.codex;}catch(e){}
  return true;
}
(function(){
  const R=ECON_RM;
  // ---------- 極強上限 ----------
  function isStrong(it){try{if(!it||!it.t)return false;const g=R.GEARS[it.t];return !!(g&&g.strong);}catch(e){return false;}}
  function strongWorn(u,exceptSlot){let n=0;const eq=(u&&u.eq)||{};for(const s in eq){if(s===exceptSlot)continue;if(isStrong(eq[s]))n++;}return n;}
  function strongWhy(u,it,slot){
    if(!econStrongCapOn()||!isStrong(it)||!u)return '';
    const eq=u.eq||{};
    if(slot&&eq[slot]&&eq[slot]===it)return '';          // 已經穿著同一件
    if(slot&&isStrong(eq[slot]))return '';                // 同欄換另一件極強：件數不變，照准（舊檔超量也不擋）
    const mx=+ECON_RM_STRONG_MAX_EQUIP||0;if(mx<=0)return '';
    const n=strongWorn(u,slot);
    return n>=mx?('極強單件同時最多穿 '+mx+' 件（目前已穿 '+n+' 件），請先卸下一件極強'):'';
  }
  function wrapCanWear(){
    if(typeof canWear!=='function'||canWear._rmStrong)return false;
    const _cw=canWear;
    canWear=function(u,it,slot){const w=_cw.apply(this,arguments);if(w)return w;try{const s=slot||(typeof slotFor==='function'?slotFor(u,it):it&&it.slot);const why=strongWhy(u,it,s);if(why)return why;}catch(e){}return w;};
    canWear._rmStrong=1;return true;
  }
  wrapCanWear();
  // 其他檔（econ_slot16）稍後若重包 canWear，是包在本層外面，仍會經過本層（最外層沒有標記時再包一次也無害：同一檢查跑兩次）
  try{if(typeof setInterval==='function'&&typeof document!=='undefined')setInterval(function(){try{if(typeof canWear==='function'&&!canWear._rmStrong)wrapCanWear();}catch(e){}},1000);}catch(e){}

  // ---------- 收集圖鑑 ----------
  function codexObj(create){
    try{if(typeof S==='undefined'||!S||!S.econ||typeof S.econ!=='object')return null;
      let c=S.econ.codex;
      if(!c||typeof c!=='object'||Array.isArray(c)){if(!create)return null;c=S.econ.codex={v:1,seen:{}};}
      if(!c.seen||typeof c.seen!=='object'||Array.isArray(c.seen))c.seen={};
      if(c.v==null)c.v=1;
      return c;}catch(e){return null;}
  }
  function nowT(){try{return Math.max(1,Math.floor(+S.time||0));}catch(e){return 1;}}
  function mark(key){if(!key||!econCodexOn())return false;const c=codexObj(true);if(!c)return false;if(!c.seen[key]){c.seen[key]=nowT();return true;}return false;}
  function markItem(it){try{if(it&&it.t&&typeof it.t==='string'&&typeof GEAR!=='undefined'&&(GEAR[it.t]||/^rmg/.test(it.t)))return mark('g:'+it.t);}catch(e){}return false;}
  // 補掃：讀檔後與每 2 秒一次，只加不刪；舊檔沒有欄位就建空表再補
  function scan(){
    if(!econCodexOn())return 0;const c=codexObj(true);if(!c)return 0;let n=0;
    try{for(const k in (S.mats||{}))if((S.mats[k]||0)>0&&(typeof MAT_NAMES==='undefined'||MAT_NAMES[k]||R.MATS[k]))n+=mark('m:'+k)?1:0;}catch(e){}
    try{for(const k in (S.pills||{})){const a=S.pills[k];if(Array.isArray(a)&&(a[0]+a[1]+a[2])>0)n+=mark('p:'+k)?1:0;}}catch(e){}
    try{for(const it of (S.inv||[]))n+=markItem(it)?1:0;}catch(e){}
    try{for(const u of (S.units||[])){const eq=(u&&u.eq)||{};for(const s in eq)n+=markItem(eq[s])?1:0;}}catch(e){}
    return n;
  }
  if(typeof addMat==='function'&&!addMat._rmCx){const _a=addMat;addMat=function(k){const r=_a.apply(this,arguments);try{mark('m:'+k);}catch(e){}return r;};addMat._rmCx=1;}
  if(typeof addPill==='function'&&!addPill._rmCx){const _a=addPill;addPill=function(k){const r=_a.apply(this,arguments);try{mark('p:'+k);}catch(e){}return r;};addPill._rmCx=1;}
  if(typeof addItem==='function'&&!addItem._rmCx){const _a=addItem;addItem=function(it){const r=_a.apply(this,arguments);try{if(r!==false)markItem(it);}catch(e){}return r;};addItem._rmCx=1;}
  try{const A=window.econRealmMat;if(A&&!A._cx){const _gm=A.grantMat,_sy=A.synth;
    A.grantMat=function(k,n){const r=_gm.apply(this,arguments);if(r&&n>0)mark('m:'+k);return r;};
    A.synth=function(){const r=_sy.apply(this,arguments);if(r&&r.ok)mark('m:'+r.out);return r;};A._cx=1;}}catch(e){}

  // 目錄（顯示用）
  const CATS=[['mat','材料'],['pill','丹藥'],['item','符籙・陣盤・傀儡'],['w','武器'],['a','防具'],['c','護符'],['set','套裝']];
  function realmOfGear(g){const r=g&&g.realm!=null?(g.realm|0):0;return Math.max(0,Math.min(10,r));}
  function gearCat(g){const s=g&&g.slot;if(s==='w'||s==='f')return 'w';if(s==='c')return 'c';if(['a','hd','hn','pt','sh'].indexOf(s)>=0)return 'a';return null;}
  function entries(cat){
    const out=[];
    if(cat==='mat'){try{for(const k in MAT_NAMES){const m=R.MATS[k];if(m&&m.cat==='item')continue;out.push({key:'m:'+k,n:MAT_NAMES[k],r:m?m.r:0,hint:m&&m.cat==='pre'?'秘境、世界 Boss、拍賣':(m?'常規材料（來源待定）／10 合 1':'打怪、副本')});}}catch(e){}}
    else if(cat==='item'){for(const k of R.ORDER){const m=R.MATS[k];if(m.cat==='item')out.push({key:'m:'+k,n:m.n,r:m.r,hint:'取得方式待定'});}}
    else if(cat==='pill'){try{for(const k of PILL_ORDER){const P=PILLS[k];if(!P)continue;out.push({key:'p:'+k,n:P.n,r:P.needRealm!=null?Math.min(10,P.needRealm|0):(P.recRealm|0),hint:P.rmPending?'效果與丹方待定':'煉丹房'});}}catch(e){}}
    else if(cat==='w'||cat==='a'||cat==='c'){try{for(const k in GEAR){const g=GEAR[k];if(!g||!g.n||gearCat(g)!==cat)continue;out.push({key:'g:'+k,n:g.n,r:realmOfGear(g),hint:g.rmg?'取得方式待定':'鍛造、掉落',star:!!g.rmStrong});}}catch(e){}}
    return out;
  }
  function setRows(){
    const sets={};
    try{for(const k in GEAR){const g=GEAR[k];if(!g)continue;const sid=(g.gv2&&g.gv2.setId)||g.rmSet||0;if(!sid)continue;(sets[sid]=sets[sid]||[]).push('g:'+k);}}catch(e){}
    return Object.keys(sets).map(Number).sort((a,b)=>a-b).map(id=>({id,n:R.SETN[id]||('套裝 '+id),keys:sets[id]}));
  }
  let cxCat='mat',cxRealm=-1;
  function esc(s){return String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));}
  function codexHtml(){
    const c=codexObj(true);const seen=(c&&c.seen)||{};
    let tot=0,got=0;for(const [k] of CATS){if(k==='set')continue;for(const e of entries(k)){tot++;if(seen[e.key])got++;}}
    let h='<div id="econ-codex" class="sec"><div class="gt"><b>收集圖鑑</b>　已收集 '+got+' / '+tot+'（'+(tot?Math.round(got/tot*1000)/10:0)+'%）<span class="dim sm">　取得過就永久記錄（試行・旗標 ?realmmat=1）</span></div>';
    h+='<div class="jobs" style="flex-wrap:wrap">'+CATS.map(([k,n])=>'<button type="button" class="btn '+(cxCat===k?'on':'')+'" data-cx-cat="'+k+'">'+n+'</button>').join('')+'</div>';
    if(cxCat==='set'){
      h+='<table>'+setRows().map(s=>{const g=s.keys.filter(k=>seen[k]).length;return '<tr><td>'+s.id+'</td><td><b>'+esc(s.n)+'</b></td><td>'+g+' / '+s.keys.length+'</td><td style="min-width:90px"><div class="bar"><i style="width:'+(s.keys.length?g/s.keys.length*100:0)+'%;background:#d9b45a"></i></div></td></tr>';}).join('')+'</table>';
    }else{
      const L=entries(cxCat);
      h+='<div class="jobs" style="flex-wrap:wrap">'+'<button type="button" class="btn '+(cxRealm<0?'on':'')+'" data-cx-r="-1">全部</button>'+R.RN.map((n,i)=>{const sub=L.filter(e=>e.r===i);if(!sub.length)return '';const g=sub.filter(e=>seen[e.key]).length;return '<button type="button" class="btn '+(cxRealm===i?'on':'')+'" data-cx-r="'+i+'">'+n+' '+g+'/'+sub.length+'</button>';}).join('')+'</div>';
      const show=L.filter(e=>cxRealm<0||e.r===cxRealm);
      const g=show.filter(e=>seen[e.key]).length;
      h+='<div class="dim sm">本頁 '+g+' / '+show.length+'</div><div class="items" data-cx-grid>'+show.map(e=>seen[e.key]
        ?'<div class="item" data-cx-k="'+esc(e.key)+'" style="border-color:#d9b45a"><b>'+(e.star?'★':'')+esc(e.n)+'</b><small>'+R.RN[e.r]+'・已收集</small></div>'
        :'<div class="item dim" data-cx-k="'+esc(e.key)+'"><b>？？？</b><small>'+R.RN[e.r]+'・'+esc(e.hint)+'</small></div>').join('')+'</div>';
    }
    return h+'</div>';
  }
  if(typeof renderBag==='function'&&!renderBag._rmCx){const _rb=renderBag;renderBag=function(){
      if(typeof bagTab!=='undefined'&&bagTab==='codex'&&!econCodexOn())bagTab='mat';
      const r=_rb.apply(this,arguments);
      try{
        if(!econCodexOn()||typeof bagOpen==='undefined'||!bagOpen)return r;
        const el=document.getElementById('bag');if(!el)return r;
        const cats=el.querySelector('.gcats');
        if(cats&&!cats.querySelector('[data-btab="codex"]'))cats.insertAdjacentHTML('beforeend','<button class="btn '+(bagTab==='codex'?'on':'')+'" data-btab="codex">圖鑑</button>');
        if(bagTab==='codex'){scan();const old=el.querySelector('#econ-codex');const html=codexHtml();
          if(old){if(old.outerHTML!==html)old.outerHTML=html;}else el.insertAdjacentHTML('beforeend',html);}
      }catch(e){}
      return r;};renderBag._rmCx=1;}
  function cxClick(ev){try{const t=ev.target;if(!t||!t.closest)return;const a=t.closest('#econ-codex [data-cx-cat]'),b=t.closest('#econ-codex [data-cx-r]');
    if(!a&&!b)return;ev.stopPropagation();if(a){cxCat=a.getAttribute('data-cx-cat');cxRealm=-1;}if(b)cxRealm=+b.getAttribute('data-cx-r');
    try{bagKey=null;}catch(e){}if(typeof renderBag==='function')renderBag();}catch(e){}}
  try{if(typeof document!=='undefined'&&document.addEventListener&&!document._rmCxClick){document._rmCxClick=1;document.addEventListener('click',cxClick,true);}}catch(e){}
  try{if(typeof setInterval==='function'&&typeof document!=='undefined')setInterval(function(){try{scan();}catch(e){}},2000);}catch(e){}
  const API={strongCapOn:econStrongCapOn,isStrong,strongWorn,strongWhy,codexOn:econCodexOn,codex:codexObj,mark,scan,entries,setRows,codexHtml};
  try{if(typeof window!=='undefined'&&window.econRealmMat)Object.assign(window.econRealmMat,API);}catch(e){}
})();
