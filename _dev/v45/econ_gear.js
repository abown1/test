// 包裝登記：install() 會在 0/80/400/1200ms 重跑；若期間別的模組（如 cult_gf）又包了一層，函式上的 _econAffix 標記會被蓋掉，
// 舊寫法就會再包第二次（吸血、暴擊等變兩倍）。改用模組層登記，每個函式只包一次。
var ECON_GEAR_WRAPPED={};
// ================== 仙武經濟：鍛造佇列（t1173）＋裝備體系（t1174／75／79／80／81／82／83）==================
(function(){
  const ECON_GEAR_REALM_STAT=0.35;      // 待使用者確認：每境基礎屬性倍率增量
  const ECON_GEAR_REALM_COST=0.40;      // 待使用者確認：每境材料增量
  const ECON_GEAR_BASE_XIA=8;           // 待使用者確認：估價基礎下品
  const ECON_GEAR_XIA_PER_REALM=6;      // 待使用者確認
  const ECON_AFFIX_Q_SCALE={'凡品':0.75,'中品':0.90,'上品':1.00,'極品':1.12,'完美':1.25,'良品':0.90,'精品':1.00,'靈器':1.12,'法寶':1.18,'仙器':1.25};
  const ECON_AFFIX_COUNT=4;
  const ECON_ENEMY_GEAR_DROP=0.02;      // 使用者指定：單次擊殺物品事件2%，由共用gate執行
  const ECON_ENEMY_GEAR_Q=['凡品','凡品','中品','中品','上品'];
  const ECON_VALUE_OFF=0.035;           // 待使用者確認：攻擊向詞綴估價係數／每 1%
  const ECON_VALUE_DEF=0.028;           // 待使用者確認：生存向詞綴估價係數／每 1%
  const ECON_VALUE_QMUL=[1,1.25,1.55,2.1,2.4,3.2];
  const ECON_SMITH_FEE_LV=3;            // 熟練達此（含）弟子委製收費；宗主與聯機玩家化身（econIsPlayerUnit）免費
  const ECON_SMITH_FEE_BASE=2;          // 待使用者確認：工錢（下品／件）
  const ECON_SMITH_FEE_PER_LV=1;        // 待使用者確認
  const ECON_SMITH_Q_SHIFT_PER_LV=2;    // 待使用者確認：熟練每級從凡品挪走的權重點
  const ECON_SMITH_Q_SHIFT_CAP=20;
  const ECON_FQ_BULK_N=5;
  const ECON_FQ_BULK_DISC=0.9;          // 與 TUNE.v49.batchDisc 相同
  const QI_WORD='靈氣'; // 面板資源名為「靈氣」；「靈力」僅出現在護盾說明，詞綴統一用靈氣

  const ECON_TRIB_BODY_CAP=0.05;        // 全身詞條雷劫減傷合計上限（分數 5%）
  const ECON_LEECH_BODY_CAP=0.10;       // 全身詞條吸血合計上限（分數 10%）
  const ECON_QICOST_BODY_CAP=0.30;      // 全身詞條靈氣消耗減少合計上限（分數 30%）
  const AFFIX_DEFS=[
    {k:'hpPct',name:'氣血',lo:1,hi:10,def:1},
    {k:'atkPct',name:'攻擊力',lo:1,hi:10,off:1},
    {k:'defPct',name:'防禦力',lo:1,hi:10,def:1},
    {k:'qiMax',name:QI_WORD+'上限',lo:1,hi:10,def:1},
    {k:'qiRegen',name:QI_WORD+'回復',lo:1,hi:10,def:1},
    {k:'gang',name:'罡氣',lo:1,hi:10,def:1},
    {k:'crit',name:'暴擊率',lo:5,hi:10,off:1},
    {k:'critDmg',name:'暴擊傷害',lo:10,hi:30,off:1},
    {k:'atkSpd',name:'攻速',lo:1,hi:10,off:1},
    {k:'move',name:'移動速度',lo:1,hi:10,off:0},
    {k:'skillCd',name:'技能冷卻',lo:1,hi:10,off:1},
    {k:'leech',name:'吸血',lo:0.1,hi:2,off:1,dec:1}, // 新擲 0.1～2%；舊裝備已存數值不重洗，全身合計另封頂 10%
    {k:'dodge',name:'閃避',lo:1,hi:5,def:1},
    {k:'cultSpd',name:'修煉速度',lo:1,hi:10,off:1},
    {k:'breakSucc',name:'突破成功率',lo:1,hi:5,off:1},
    {k:'tribRed',name:'雷劫減傷（需打坐）',lo:0.2,hi:1,def:1,tribBand:1,dec:2},
    {k:'gather',name:'採集挖礦',lo:1,hi:10,off:1},
    {k:'craft',name:'煉丹煉器',lo:1,hi:10,off:1},
    {k:'dropRate',name:'掉落率',lo:1,hi:10,off:1},
    {k:'qiSkillAtk',name:QI_WORD+'技能攻擊',lo:1,hi:10,off:1},
    {k:'qiCost',name:QI_WORD+'消耗',lo:-5,hi:-1,def:1,neg:1} // 每件仍 1～5% 減耗；全身合計減耗封頂 30%；舊裝備不重洗
  ];
  // 舊詞條 shield（護盾容量）仍計入罡氣，但不進新詞條池
  const REALM_N=['武徒','武師','大武師','宗師','煉氣','築基','金丹','元嬰','化神','合體','地仙','天仙'];
  // 原創名，避免小說／動畫名
  const SETS={
    0:{sword:['練習劍',4,0,{iron:6,wood:2}],saber:['劈柴刀',5,5,{iron:8,wood:2}],spear:['木桿槍',4.5,0,{iron:6,wood:4}],fist:['布拳套',3,0,{hide:2,fiber:4,iron:2}],robe:['粗布道袍',0,20,{fiber:10,hide:1}],armor:['藤甲',0,30,{hide:5,iron:3}],charm:['安神符',0,10,{fiber:3,lingshi:2,bone:1}],pendant:['河石佩',1.5,0,{stone:6,lingshi:3}]},
    1:{sword:['精鐵劍',6,0,{iron:9,wood:3}],saber:['開山刀',7,8,{iron:12,wood:3}],spear:['精鐵槍',6.5,0,{iron:9,wood:5}],fist:['鐵爪套',5,0,{hide:3,fiber:5,iron:4}],robe:['青布勁袍',0,28,{fiber:14,hide:2}],armor:['鐵皮甲',0,42,{hide:6,iron:6}],charm:['護心符',0,14,{fiber:4,lingshi:3,bone:1}],pendant:['青石佩',2,0,{stone:8,lingshi:4}]},
    2:{sword:['玄鋒劍',8,0,{iron:13,wood:4}],saber:['厚背刀',9,12,{iron:16,wood:4}],spear:['點鋼槍',8.5,0,{iron:13,wood:6}],fist:['勁力拳套',7,0,{hide:4,fiber:6,iron:5}],robe:['勁裝道袍',0,38,{fiber:18,hide:3}],armor:['鎮脈甲',0,55,{hide:8,iron:9}],charm:['固元符',0,18,{fiber:5,lingshi:5,bone:2}],pendant:['墨玉佩',2.6,0,{stone:10,lingshi:6}]},
    3:{sword:['宗門佩劍',11,0,{iron:18,wood:5}],saber:['斷岳刀',12,16,{iron:22,wood:5}],spear:['鎮魂槍',11.5,0,{iron:18,wood:8}],fist:['裂石拳套',9,0,{hide:5,fiber:8,iron:7}],robe:['玄紋道袍',0,50,{fiber:22,hide:4}],armor:['精鋼甲',0,72,{hide:10,iron:13}],charm:['避邪符',0,24,{fiber:6,lingshi:7,bone:2}],pendant:['寒玉佩',3.4,0,{stone:12,lingshi:8}]},
    4:{sword:['靈紋劍',14,0,{iron:24,wood:6,lingshi:4}],saber:['裁雲刀',16,20,{iron:28,wood:6,lingshi:4}],spear:['追星槍',15,0,{iron:24,wood:10,lingshi:4}],fist:['氣勁拳套',12,0,{hide:6,fiber:10,iron:9,lingshi:3}],robe:['聚靈道袍',0,66,{fiber:28,hide:5,lingshi:4}],armor:['靈織甲',0,92,{hide:12,iron:16,lingshi:5}],charm:['養氣符',0,32,{fiber:8,lingshi:10,bone:2}],pendant:['凝神佩',4.2,0,{stone:14,lingshi:12}],faqi:['飛星法器',18,24,{xuantie:1,lingshi:14,core:1}]},
    5:null,6:null
  };
  SETS[5]={
    sword:['穿岩劍',18,0,{iron:30,wood:7,lingshi:6}],saber:['裂風刀',20,26,{iron:34,wood:7,lingshi:6}],spear:['穿雲槍',19,0,{iron:30,wood:12,lingshi:6}],fist:['叠浪拳套',15,0,{hide:7,fiber:12,iron:11,lingshi:5}],robe:['禦氣道袍',0,84,{fiber:34,hide:6,lingshi:6}],armor:['玄鐵甲',0,118,{hide:14,iron:20,lingshi:8,xuantie:1}],charm:['定海符',0,40,{fiber:10,lingshi:14,bone:3}],pendant:['碧玉佩',5.2,0,{stone:16,lingshi:16}],faqi:['迴光法器',24,34,{xuantie:1,lingshi:20,core:2}]
  };
  SETS[6]={
    sword:['金霞劍',23,0,{iron:38,wood:8,lingshi:10}],saber:['焚金刀',26,34,{iron:42,wood:8,lingshi:10}],spear:['鎮海槍',24,0,{iron:38,wood:14,lingshi:10}],fist:['碎岳拳套',19,0,{hide:8,fiber:14,iron:14,lingshi:8}],robe:['金紋道袍',0,108,{fiber:42,hide:7,lingshi:10}],armor:['金鱗甲',0,150,{hide:16,iron:26,lingshi:12,xuantie:1}],charm:['固丹符',0,52,{fiber:12,lingshi:18,bone:3}],pendant:['金髓佩',6.5,0,{stone:18,lingshi:22}],faqi:['金梭法器',30,44,{xuantie:2,lingshi:28,core:2}]
  };

  const KIND_META={
    sword:{slot:'w',desc:'劍：攻勢均衡'},saber:{slot:'w',desc:'刀：厚重偏攻'},spear:{slot:'w',desc:'槍：兼顧身法'},fist:{slot:'w',desc:'拳套：輕巧'},
    robe:{slot:'a',desc:'道袍：輕便護體'},armor:{slot:'a',desc:'甲：厚重防護'},charm:{slot:'c',desc:'護符：護體'},pendant:{slot:'c',desc:'佩：凝神'},
    faqi:{slot:'f',desc:'法器：需煉氣佩戴、鍛造坊 Lv2'}
  };
  const KIND_ORDER=['sword','saber','spear','fist','robe','armor','charm','pendant','faqi'];

  // ----- 16 格（t1190）：頭／手／褲／鞋 新目錄；旗標 slot16 關時不進鍛造／掉落，只裝進 GEAR（無害）-----
  const NEW_KINDS=['head','hands','pants','shoes'];
  const NEW_SLOT={head:'hd',hands:'hn',pants:'pt',shoes:'sh'};
  // 待使用者確認：對「同境界甲」的氣血／防禦／材料倍率；手另加同境劍攻擊 ×0.2，鞋另加速度 0.03＋0.005×境界
  const NEW_RATIO={head:0.50,hands:0.35,pants:0.60,shoes:0.35};
  const NEW_DESC={head:'頭：護首',hands:'手：護腕增勁',pants:'褲：護腿',shoes:'鞋：輕身'};
  // 原創名（0 武徒 … 8 化神）
  const NEW_NAMES={
    head:['粗布頭巾','鐵皮盔','束髮鐵冠','玄紋護額','聚靈頭冠','禦氣玄盔','金紋法冠','嬰光玉冠','澄虛雲冠'],
    hands:['麻布護腕','鐵片護手','勁力護腕','精鋼手甲','靈紋護腕','玄鐵手甲','金鱗護手','紫霞護腕','星沉手甲'],
    pants:['粗麻長褲','青布綁腿褲','鎮脈護腿','玄紋戰褲','聚靈護腿','禦氣玄褲','金鱗腿甲','紫鱗護腿','雲紋腿甲'],
    shoes:['草編鞋','牛皮快靴','踏石短靴','精鋼戰靴','輕靈布履','穿雲靴','金霞履','逐光靴','凌空雲履']
  };
  const NEW_MAX_REALM=8;
  // 第④輪 新裝備表（gearV2，本檔尾段）：模組在本 IIFE 之後載入，執行期才取用
  let _gvSrc=null; // 品級擲骰來源：econRollEnemyGear 期間＝'drop'，其餘 makeItem＝'forge'
  function V2(){try{return (typeof window!=='undefined'&&window.econGearV2)||null;}catch(e){return null;}}
  function v2On(){const v=V2();try{return !!(v&&v.on());}catch(e){return false;}}
  function slot16On(){try{return typeof econSlot16On==='function'&&!!econSlot16On();}catch(e){return false;}}
  function dgArmorRow(r,kind){
    try{if(typeof MAP_DG_LOOT_NEW_GEAR!=='undefined'&&MAP_DG_LOOT_NEW_GEAR&&MAP_DG_LOOT_NEW_GEAR['mdg'+r+'_'+kind])return MAP_DG_LOOT_NEW_GEAR['mdg'+r+'_'+kind];}catch(e){}
    return null;
  }
  function chestBase(r){
    if(r<=6&&SETS[r]&&SETS[r].armor){const row=SETS[r].armor;return {hp:row[2],def:4+r,cost:row[3],atk:SETS[r].sword?SETS[r].sword[1]:0};}
    const a=dgArmorRow(r,'armor'),w=dgArmorRow(r,'sword');
    if(a)return {hp:+a.hp||0,def:+a.def||0,cost:a.cost||{},atk:w?(+w.atk||0):0};
    const b=chestBase(6),m=Math.pow(1.27,r-6),c={};for(const k in b.cost)c[k]=Math.ceil(b.cost[k]*m);
    return {hp:Math.round(b.hp*m),def:Math.round(b.def*m),cost:c,atk:+(b.atk*m).toFixed(1)};
  }
  function newKindEntry(r,kind){
    if(NEW_KINDS.indexOf(kind)<0||r<0||r>NEW_MAX_REALM)return null;
    const b=chestBase(r),k=NEW_RATIO[kind];
    const cost={};for(const q in b.cost)cost[q]=Math.max(1,Math.ceil((+b.cost[q]||0)*k));
    const G={n:NEW_NAMES[kind][r],slot:NEW_SLOT[kind],atk:0,hp:Math.round(b.hp*k),def:+(b.def*k).toFixed(1),spd:0,cost:cost,realm:r,desc:NEW_DESC[kind]+'（'+realmName(r)+'）',econSet:1,econSlot16:1};
    if(kind==='hands')G.atk=+(b.atk*0.2).toFixed(1);
    if(kind==='shoes')G.spd=+(0.03+0.005*r).toFixed(3);
    if(r>6)G.dgOnly=1;
    return G;
  }
  function rnd01(){
    try{if(typeof rnd==='function'){const r=rnd();if(typeof r==='number'&&isFinite(r))return r<0?0:r>=1?0.999999:r;}}catch(e){}
    return Math.random();
  }
  function ri(a,b){return a+Math.floor(rnd01()*(b-a+1));}
  function realmName(i){
    try{if(typeof REALMS!=='undefined'&&REALMS[i]&&REALMS[i].n)return REALMS[i].n;}catch(e){}
    return REALM_N[i]||('境'+i);
  }
  function maxOpenRealm(){
    try{if(typeof MAX_REALM==='number')return MAX_REALM|0;}catch(e){}
    return 6;
  }
  function peakRealm(){
    try{if(typeof S!=='undefined'&&S&&S.peakRealm!=null)return S.peakRealm|0;}catch(e){}
    try{const p=typeof player==='function'?player():null;if(p&&p.realm!=null)return p.realm|0;}catch(e){}
    return 0;
  }
  function gearId(r,kind){return 'eg'+r+'_'+kind;}
  function catalogEntry(r,kind){
    if(NEW_KINDS.indexOf(kind)>=0)return newKindEntry(r,kind);
    const row=SETS[r]&&SETS[r][kind]; if(!row)return null;
    const meta=KIND_META[kind];
    const def={atk:0,hp:0,def:0,spd:0};
    if(kind==='sword'||kind==='saber'||kind==='spear'||kind==='fist'||kind==='pendant'||kind==='faqi')def.atk=row[1];
    if(kind==='robe'||kind==='armor'||kind==='charm'||kind==='faqi'||kind==='saber')def.hp=row[2];
    if(kind==='robe'||kind==='armor'||kind==='charm')def.def=kind==='armor'?4+r:2+Math.floor(r*0.6);
    if(kind==='spear')def.spd=0.05+r*0.01;
    if(kind==='fist')def.spd=0.15+r*0.015;
    if(kind==='pendant')def.spd=0.05;
    const G={n:row[0],slot:meta.slot,atk:def.atk,hp:def.hp,def:def.def,spd:def.spd,cost:Object.assign({},row[3]),realm:r,desc:meta.desc+'（'+realmName(r)+'）',econSet:1};
    if(kind==='faqi'){G.lv=2;G.realm=Math.max(4,r);}
    return G;
  }
  function gearObj(){
    try{
      if(typeof GEAR!=='undefined'&&GEAR)return GEAR;
    }catch(e){}
    try{
      if(typeof window!=='undefined'){
        window.GEAR=window.GEAR||{};
        return window.GEAR;
      }
    }catch(e){}
    return null;
  }
  function installCatalog(){
    try{
      try{if(typeof mapDgLootInstallGear==='function')mapDgLootInstallGear();}catch(e0){}
      const GEAR=gearObj();
      if(!GEAR)return;
      if(!GEAR.sword)GEAR.sword={n:'長劍',slot:'w',atk:4,cost:{iron:6,wood:2},desc:'均衡的兵器',realm:0};
      if(!GEAR.sword.realm&&GEAR.sword.realm!==0)GEAR.sword.realm=0;
      if(GEAR.saber&&GEAR.saber.realm==null)GEAR.saber.realm=0;
      if(GEAR.spear&&GEAR.spear.realm==null)GEAR.spear.realm=0;
      if(GEAR.fist&&GEAR.fist.realm==null)GEAR.fist.realm=0;
      if(GEAR.robe&&GEAR.robe.realm==null)GEAR.robe.realm=0;
      if(GEAR.leather&&GEAR.leather.realm==null)GEAR.leather.realm=0;
      if(GEAR.talisman&&GEAR.talisman.realm==null)GEAR.talisman.realm=0;
      if(GEAR.jade&&GEAR.jade.realm==null)GEAR.jade.realm=0;
      if(GEAR.faqi&&GEAR.faqi.realm==null)GEAR.faqi.realm=4;
      for(let r=0;r<=6;r++){
        for(const kind of KIND_ORDER){
          if(kind==='faqi'&&r<4)continue;
          const id=gearId(r,kind);
          const G=catalogEntry(r,kind);
          if(!G)continue;
          if(!GEAR[id])GEAR[id]=G;
        }
      }
      for(let r=0;r<=NEW_MAX_REALM;r++)for(const kind of NEW_KINDS){const id=gearId(r,kind);if(!GEAR[id]){const G=newKindEntry(r,kind);if(G)GEAR[id]=G;}}
      try{const v=V2();if(v)v.installCatalog(GEAR);}catch(eV){}
    }catch(e){}
  }
  function newKeysForRealm(r){
    const out=[];if(!slot16On()||r>6)return out;
    const GO=gearObj()||{};
    for(const kind of NEW_KINDS){const id=gearId(r,kind);if(GO[id]&&!GO[id].dgOnly)out.push(id);}
    return out;
  }
  function keysForRealm(r){
    const out=[];
    if(r===0){
      try{
        const GO=gearObj()||{};
        if(typeof GEAR_ORDER!=='undefined')GEAR_ORDER.forEach(function(k){const G=GO[k];if(G&&(G.realm|0)===0)out.push(k);});
      }catch(e){}
      if(out.length)return out.concat(newKeysForRealm(0),v2KeysForRealm(0));
    }
    for(const kind of KIND_ORDER){
      if(kind==='faqi'&&r<4)continue;
      const id=gearId(r,kind);
      try{const GO=gearObj();if(GO&&GO[id])out.push(id);}catch(e){}
    }
    if(r===4){
      try{if(typeof GEAR!=='undefined'&&GEAR.faqi&&out.indexOf('faqi')<0)out.push('faqi');}catch(e){}
    }
    newKeysForRealm(r).forEach(function(k){if(out.indexOf(k)<0)out.push(k);});
    v2KeysForRealm(r).forEach(function(k){if(out.indexOf(k)<0)out.push(k);});
    return out;
  }
  // 新表武器＋飾品（套裝件另走鍛造面板「套裝」分類）；旗標關＝空
  function v2KeysForRealm(r){const v=V2();if(!v||!v2On()||r>maxOpenRealm())return [];const GO=gearObj()||{};return v.keys('w',r).concat(v.keys('c',r)).filter(function(k){return !!GO[k];});}

  function qNameOf(it){
    if(!it)return '凡品';
    try{const v=V2();if(v&&typeof v.xianQiDisplay==='function'){const xn=v.xianQiDisplay(it);if(xn)return xn;}}catch(e){}
    if(it.econQName)return it.econQName;
    try{
      if(it.q!=null&&typeof QN!=='undefined'&&QN[it.q])return QN[it.q];
    }catch(e){}
    const fb=['凡品','良品','精品','靈器','法寶','仙器'];
    if(it.q!=null&&fb[it.q])return fb[it.q];
    return '凡品';
  }
  function qIndexOf(it){
    if(!it)return 0;
    if(it.q!=null&&isFinite(it.q))return Math.max(0,Math.min(5,it.q|0));
    return qnFromName(qNameOf(it));
  }
  // 與 map_dg_loot.js mapDgLootTribBand 相同：凡品 0.2，逐檔 +0.16，仙器 0.84–1.0
  function tribBand(q){
    try{if(typeof mapDgLootTribBand==='function'){const b=mapDgLootTribBand(q);if(b&&b.length===2)return b;}}catch(e){}
    const qq=Math.max(0,Math.min(5,q==null?0:(q|0)));
    const hi=Math.round((0.2+0.16*qq)*100)/100;
    return [qq===0?0.2:Math.round((hi-0.16)*100)/100,hi];
  }
  function isTribAffix(a){
    if(!a)return false;
    if(a.name&&/雷劫/.test(a.name))return true;
    if(a.k&&/trib|thunder|leijie/i.test(a.k))return true;
    return false;
  }
  function scaleAffix(def, qName, q){
    if(def&&(def.k==='tribRed'||def.tribBand)){
      const qq=(q!=null&&isFinite(q))?Math.max(0,Math.min(5,q|0)):qnFromName(qName);
      const b=tribBand(qq),lo=b[0],hi=b[1];
      if(hi<=lo)return lo;
      return Math.round((lo+rnd01()*(hi-lo))*100)/100;
    }
    const sc=ECON_AFFIX_Q_SCALE[qName]!=null?ECON_AFFIX_Q_SCALE[qName]:1;
    const span=def.hi-def.lo;
    let v;
    if(def.neg){
      // 品質高 → 減耗更強 → 更接近 lo（-5）
      v=def.hi-span*Math.min(1,rnd01()*sc);
    }else{
      v=def.lo+span*Math.min(1,rnd01()*sc);
    }
    if(def.dec!=null)return Math.round(v*Math.pow(10,def.dec))/Math.pow(10,def.dec);
    return Math.round(v);
  }
  function rollAffixes(it){
    if(!it)return [];
    if(it.affixes&&it.affixes.length)return it.affixes;
    const qn=qNameOf(it);
    const qq=qIndexOf(it);
    const pool=AFFIX_DEFS.slice();
    const picked=[];
    let n=Math.min(ECON_AFFIX_COUNT,pool.length);
    try{const v=V2();if(v&&v.isV2(it))n=Math.min(v.AFFIX_N,pool.length);}catch(eV){} // 新表裝備 2 條
    for(let i=0;i<n;i++){
      const idx=Math.floor(rnd01()*pool.length);
      const def=pool.splice(idx,1)[0];
      let v=scaleAffix(def,qn,qq);
      if(def.k==='tribRed'||def.tribBand){
        const b=tribBand(qq);
        if(v<b[0])v=b[0];if(v>b[1])v=b[1];
        v=Math.round(v*100)/100;
      }else if(def.neg){if(v>def.hi)v=def.hi;if(v<def.lo)v=def.lo;}
      else{if(v<def.lo)v=def.lo;if(v>def.hi)v=def.hi;}
      picked.push({k:def.k,v:v,name:def.name});
    }
    it.affixes=picked;
    it.econQName=qn;
    return picked;
  }
  function attachAffixes(it){
    if(!it||!it.t)return it;
    try{if(typeof GEAR==='undefined'||!GEAR[it.t])return it;}catch(e){return it;}
    rollAffixes(it);
    return it;
  }
  function fmtAffixV(v){
    const n=+v;
    if(!isFinite(n))return '0';
    if(Math.abs(n-Math.round(n))<1e-9)return String(Math.round(n));
    return String(Math.round(n*100)/100);
  }
  function affixText(it){
    const a=it&&it.affixes||[];
    return a.map(function(x){const t=fmtAffixV(x.v);return x.name+' '+(x.v>0?('+'+t):t)+'%';}).join('、');
  }
  function econGearWornPct(u){
    const o={hpPct:0,atkPct:0,defPct:0,qiMax:0,qiRegen:0,gang:0,crit:0,critDmg:0,atkSpd:0,move:0,skillCd:0,leech:0,dodge:0,cultSpd:0,breakSucc:0,gather:0,craft:0,dropRate:0,qiSkillAtk:0,qiCost:0};
    if(!u||!u.eq)return o;
    for(const s in u.eq){
      const it=u.eq[s];
      if(!it||!it.affixes)continue;
      for(let i=0;i<it.affixes.length;i++){
        const a=it.affixes[i];
        if(!a)continue;
        let k=a.k;
        if(k==='shield')k='gang';
        if(k in o)o[k]+=(+a.v||0);
      }
    }
    // 新表固定次要＋套效（旗標關＝{}）；閃避只允許把全身合計推到 25%
    try{const v=V2();if(v){const x=v.extra(u),d0=o.dodge;for(const k in x)if(k in o)o[k]+=x[k];if(x.dodge)o.dodge=Math.min(o.dodge,Math.max(d0,25));}}catch(eV){}
    // 合計封頂只作用於全身加總；單件已存詞條不改寫
    if(o.leech>ECON_LEECH_BODY_CAP*100)o.leech=ECON_LEECH_BODY_CAP*100;
    if(o.qiCost<-ECON_QICOST_BODY_CAP*100)o.qiCost=-ECON_QICOST_BODY_CAP*100;
    return o;
  }
  function econGearTribRed(u){
    if(!u||!u.eq)return 0;
    let pct=0;
    for(const s in u.eq){
      const it=u.eq[s];
      if(!it||!it.affixes)continue;
      for(let i=0;i<it.affixes.length;i++){
        if(isTribAffix(it.affixes[i]))pct+=(+it.affixes[i].v||0);
      }
    }
    try{const v=V2();if(v){const x=v.extra(u);if(x.tribRed)pct+=x.tribRed;}}catch(eV){}
    const cap=ECON_TRIB_BODY_CAP;
    return Math.max(0,Math.min(cap,pct/100));
  }
  function econGearLeech(u){
    if(!u||!u.eq)return 0;
    let pct=0;
    for(const s in u.eq){
      const it=u.eq[s];
      if(!it||!it.affixes)continue;
      for(let i=0;i<it.affixes.length;i++){
        const a=it.affixes[i];
        if(a&&a.k==='leech')pct+=(+a.v||0);
      }
    }
    try{const v=V2();if(v){const x=v.extra(u);if(x.leech)pct+=x.leech;}}catch(eV){}
    return Math.max(0,Math.min(ECON_LEECH_BODY_CAP,pct/100));
  }
  function econGearQiCostRed(u){
    if(!u||!u.eq)return 0;
    let pct=0;
    for(const s in u.eq){
      const it=u.eq[s];
      if(!it||!it.affixes)continue;
      for(let i=0;i<it.affixes.length;i++){
        const a=it.affixes[i];
        if(a&&a.k==='qiCost')pct+=Math.max(0,-(+a.v||0));
      }
    }
    try{const v=V2();if(v){const x=v.extra(u);if(x.qiCost)pct+=Math.max(0,-x.qiCost);}}catch(eV){}
    return Math.max(0,Math.min(ECON_QICOST_BODY_CAP,pct/100));
  }
  function econGearStats(item){
    const it=item||{};
    attachAffixes(it);
    const pct={};
    (it.affixes||[]).forEach(function(a){pct[a.k]=a.v;});
    return {
      atk:+it.atk||0,hp:+it.hp||0,def:+it.def||0,spd:+it.spd||0,
      pct:pct,
      affixes:(it.affixes||[]).slice(),
      quality:qNameOf(it),
      text:affixText(it),
      qiWord:QI_WORD
    };
  }
  function sumAffixScore(it, flag){
    let s=0;
    (it.affixes||[]).forEach(function(a){
      const def=AFFIX_DEFS.filter(function(d){return d.k===a.k;})[0];
      if(!def)return;
      if(flag==='off'&&def.off)s+=Math.abs(a.v);
      if(flag==='def'&&def.def)s+=Math.abs(a.v);
    });
    return s;
  }
  function econGearValue(item){
    const it=item||{};
    attachAffixes(it);
    let G=null;try{G=(typeof GEAR!=='undefined'&&GEAR[it.t])||null;}catch(e){}
    const realm=(it.realm!=null?it.realm:(G&&G.realm)||0)|0;
    const q=it.q|0;
    const qm=ECON_VALUE_QMUL[Math.min(ECON_VALUE_QMUL.length-1,q)]||1;
    let base=ECON_GEAR_BASE_XIA+realm*ECON_GEAR_XIA_PER_REALM;
    try{
      const cost=G&&G.cost||{};
      for(const k in cost) base+=(+cost[k]||0)*0.4;
    }catch(e){}
    const off=sumAffixScore(it,'off'), defv=sumAffixScore(it,'def');
    const xia=Math.max(1,Math.round(base*qm*(1+off*ECON_VALUE_OFF+defv*ECON_VALUE_DEF)));
    return {xia:xia,off:off,def:defv,realm:realm,quality:qNameOf(it),label:'估價 '+xia+' 下品'};
  }
  function pickEnemyQuality(){
    return ECON_ENEMY_GEAR_Q[Math.floor(rnd01()*ECON_ENEMY_GEAR_Q.length)]||'凡品';
  }
  function qnFromName(name){
    try{if(typeof XW_ECON==='object'&&XW_ECON&&typeof XW_ECON.forgeMapQ==='function')return XW_ECON.forgeMapQ(name);}catch(e){}
    const map={'凡品':0,'中品':1,'良品':1,'上品':2,'精品':2,'極品':3,'靈器':3,'法寶':4,'完美':5,'仙器':5};
    return map[name]!=null?map[name]:0;
  }
  function econRollEnemyGear(realm){
    realm=Math.max(0,realm|0);
    installCatalog();
    let keys=keysForRealm(Math.min(6,realm));
    // 新表開：舊表／新武器／新飾品／新套裝件 四類等機率挑一類（有東西的類才算），境界到 MAX_REALM
    try{const v=V2();const pool=v&&v2On()?v.dropPool(Math.min(maxOpenRealm(),realm)):null;
      if(pool){const old=realm<=6?keysForRealm(realm).filter(function(k){return !(v.isV2({t:k}));}):[];const GO=gearObj()||{};
        const cats=[old,pool.w,pool.c,pool.s].map(function(L){return L.filter(function(k){return !!GO[k];});}).filter(function(L){return L.length;});
        if(cats.length)keys=cats[Math.floor(rnd01()*cats.length)];}}catch(eV){}
    if(!keys.length){
      const rr=Math.min(6,realm);
      keys=KIND_ORDER.filter(function(kind){return !(kind==='faqi'&&rr<4);}).map(function(kind){return gearId(rr,kind);});
    }
    if(!keys.length)return [];
    const n=rnd01()<0.35?2:1;
    const out=[];
    const _ps=_gvSrc;_gvSrc='drop';
    try{
    const used={};
    for(let i=0;i<n;i++){
      const k=keys[Math.floor(rnd01()*keys.length)];
      if(used[k])continue; used[k]=1;
      const qn=qnFromName(pickEnemyQuality());
      let it=null;
      try{if(typeof makeItem==='function')it=makeItem(k,qn,-1);}catch(e){}
      if(!it){
        const GO=gearObj()||{};
        const G=GO[k]||(function(){const m=/^eg(\d+)_(.+)$/.exec(k);return m?catalogEntry(+m[1],m[2]):catalogEntry(0,'sword');})();
        it={id:0,t:k,slot:G.slot,q:qn,el:-1,atk:G.atk||0,hp:G.hp||0,def:G.def||0,spd:G.spd||0,realm:G.realm||realm};
        try{const v=V2();if(v&&v.isV2(it))v.rescale(it);}catch(eV){}
      }
      const GO2=gearObj()||{};
      it.realm=GO2[k]&&GO2[k].realm!=null?GO2[k].realm:realm;
      try{const v=V2();if(v)v.ensureGr(it,'drop');}catch(eV){}
      attachAffixes(it);
      out.push(it);
    }
    }finally{_gvSrc=_ps;}
    return out;
  }

  // ----- 佇列 -----
  function qState(b,create){
    if(!b)return null;
    if(!Array.isArray(b.econForgeQ)){
      if(!create)return [];
      b.econForgeQ=[];
    }
    return b.econForgeQ;
  }
  function batchCostOf(k,n,inf){
    n=Math.max(1,n|0);
    try{if(typeof batchCost==='function')return batchCost(k,n,inf);}catch(e){}
    let G=null;try{const GO=gearObj();G=GO&&GO[k];}catch(e){}
    if(!G){
      const m=/^eg(\d+)_(.+)$/.exec(k||'');
      if(m)G=catalogEntry(+m[1],m[2]);
      else if(k==='sword')G=catalogEntry(0,'sword');
    }
    if(!G)return {};
    const c={}; for(const q in G.cost)c[q]=G.cost[q];
    if(inf){c.lingshi=(c.lingshi||0)+3;c.core=(c.core||0)+1;}
    const d=n>=ECON_FQ_BULK_N?ECON_FQ_BULK_DISC:1;
    for(const q in c)c[q]=Math.ceil(c[q]*n*d);
    return c;
  }
  function addCosts(a,b){const o=Object.assign({},a||{});for(const k in (b||{}))o[k]=(o[k]||0)+b[k];return o;}
  function queueTotal(b,inf){
    const q=qState(b,false)||[];
    let tot={};
    q.forEach(function(line){tot=addCosts(tot,batchCostOf(line.k,line.n,line.inf!=null?line.inf:inf));});
    return tot;
  }
  function itemLabel(k){
    try{if(typeof GEAR!=='undefined'&&GEAR[k])return GEAR[k].n;}catch(e){}
    return k;
  }
  const FQ_CHUNK=20;  // g20.js v49Batch clamp(n,1,20)
  function fqAdd(b,k,n,inf){
    if(!b||b.type!=='forge')return {ok:false};
    const MX=(typeof econFqMax==='function'?econFqMax():20);
    n=Math.max(1,Math.min(MX,n|0));
    const q=qState(b,true);
    const last=q[q.length-1];
    if(last&&last.k===k&&!!last.inf===!!inf){last.n=Math.min(MX,last.n+n);}
    else q.push({id:(b._fqn=(b._fqn||1)+1),k:k,n:n,inf:!!inf});
    return {ok:true,n:q.length};
  }
  function fqDel(b,id){
    const q=qState(b,true);
    b.econForgeQ=q.filter(function(x){return x.id!==id;});
    return {ok:true};
  }
  function fqSetN(b,id,n){
    n=Math.max(1,Math.min((typeof econFqMax==='function'?econFqMax():20),n|0));
    const q=qState(b,true);
    q.forEach(function(x){if(x.id===id)x.n=n;});
    return {ok:true};
  }
  function fqKick(b){
    if(!b||b.type!=='forge'||b.craft)return {ok:false,reason:'busy'};
    const q=qState(b,true);
    while(q.length){
      const line=q[0];
      const nn=Math.min(line.n,FQ_CHUNK);   // BUG-026：g20 v49Batch 一爐最多 20，超過分爐
      const c=batchCostOf(line.k,nn,line.inf);
      let can=true;
      try{can=(typeof canPay2==='function')?canPay2(c):true;}catch(e){}
      if(!can){
        try{if(typeof toast==='function')toast('材料不足，跳過 '+itemLabel(line.k)+' ×'+line.n);}catch(e){}
        q.shift();
        continue;
      }
      let ok=false;
      if(nn>1&&typeof v49Batch==='function'){
        try{ok=!!v49Batch(b.id,line.k,nn,line.inf);}catch(e){ok=false;}
      }else if(typeof startCraft==='function'){
        try{ok=!!startCraft(b,line.k,line.inf);}catch(e){ok=false;}
      }
      if(ok&&nn<line.n){line.n-=nn;return {ok:true,started:{id:line.id,k:line.k,n:nn,inf:line.inf},rest:line.n};}
      q.shift();
      if(ok)return {ok:true,started:line};
      try{if(typeof toast==='function')toast('無法開爐，跳過 '+itemLabel(line.k)+' ×'+line.n);}catch(e){}
    }
    return {ok:false,reason:'empty'};
  }
  function fqUseShared(){
    try{return typeof econCraftQOn==='function'&&econCraftQOn()&&typeof econCraftQAdd==='function';}catch(e){return false;}
  }
  function fqAddPub(b,k,n,inf){return fqUseShared()?econCraftQAdd(b,k,n,inf):fqAdd(b,k,n,inf);}
  function fqDelPub(b,id){return fqUseShared()?econCraftQDel(b,id):fqDel(b,id);}
  function fqSetNPub(b,id,n){return fqUseShared()?econCraftQSetN(b,id,n):fqSetN(b,id,n);}
  function fqKickPub(b){return fqUseShared()?econCraftQKick(b):fqKick(b);}
  function queueTotalPub(b,inf){return fqUseShared()?econCraftQTotal(b,inf):queueTotal(b,inf);}
  function fqRegisterShared(){
    if(typeof econCraftQRegister!=='function')return false;
    try{
      econCraftQRegister('forge',{
        qKey:'econForgeQ',idKey:'_fqn',maxN:20,chunk:FQ_CHUNK,
        start:function(b,k,n,inf){
          if(n>1&&typeof v49Batch==='function'){try{return !!v49Batch(b.id,k,n,inf);}catch(e){return false;}}
          if(typeof startCraft==='function'){try{return !!startCraft(b,k,inf);}catch(e){return false;}}
          return false;
        },
        cost:function(k,n,inf){return batchCostOf(k,n,inf);},
        label:function(k){return itemLabel(k);},
        canPay:function(c){try{return (typeof canPay2==='function')?canPay2(c):true;}catch(e){return true;}}
      });
      return true;
    }catch(e){return false;}
  }

  function smithFeeOf(u,n){
    n=Math.max(1,n|0);
    const lv=(typeof v59Lv==='function')?v59Lv(u,'forge'):0;
    if(lv<ECON_SMITH_FEE_LV)return {xia:0,lv:lv,charge:false};
    const xia=(ECON_SMITH_FEE_BASE+Math.max(0,lv-ECON_SMITH_FEE_LV)*ECON_SMITH_FEE_PER_LV)*n;
    return {xia:xia,lv:lv,charge:true};
  }
  function smithOrderer(who){
    if(who)return who;
    try{if(typeof player==='function')return player();}catch(e){}
    return null;
  }
  // 下單者是否為玩家（房主主角或聯機化身）。沿用 econIsPlayerUnit（xnIsPC／u.np），不另寫判斷函式。
  function smithOrderIsPlayer(who){
    const u=smithOrderer(who);
    try{if(typeof econIsPlayerUnit==='function')return !!econIsPlayerUnit(u);}catch(e){}
    return !!(u&&(u.kind==='player'||u.np));
  }
  function canSmithPay(fee, who){
    if(!fee||!fee.charge||!(fee.xia>0))return true;
    if(smithOrderIsPlayer(who))return true;
    const T=(typeof S!=='undefined'?S:null);
    const p=smithOrderer(who);
    const need=fee.xia;
    try{if(typeof econCanPay==='function'&&econCanPay(p||'vault',need))return true;}catch(e){}
    try{if(p&&typeof econContribCanPay==='function'&&econContribCanPay(p,need))return true;}catch(e){}
    try{if(T&&T.res&&T.res.lingshi>=need)return true;}catch(e){}
    return false;
  }
  function smithPay(smith, fee, n, who){
    if(!fee||!fee.charge||!(fee.xia>0))return {ok:true,skipped:true};
    if(smithOrderIsPlayer(who))return {ok:true,skipped:true,free:'player'};
    const T=(typeof S!=='undefined'?S:null);
    const p=smithOrderer(who);
    let mode='lsThenCb';
    try{if(typeof econPayMode==='function')mode=econPayMode(T);}catch(e){}
    const need=fee.xia;
    function payLs(){
      try{
        if(typeof econCharge==='function'){const r=econCharge(p||'vault',need,'smith-fee');return !!(r&&r.ok);}
      }catch(e){}
      try{if(T&&T.res&&T.res.lingshi>=need){T.res.lingshi-=need;return true;}}catch(e){}
      return false;
    }
    function payCb(){
      try{if(p&&typeof econContribPay==='function'){const r=econContribPay(p,need,'smith-fee');return !!(r&&r.ok);}}catch(e){}
      return false;
    }
    let ok=false;
    if(mode==='cbOnly'||mode==='cbFirst') ok=payCb()||payLs();
    else ok=payLs()||payCb();
    if(ok&&smith){
      try{if(typeof econGain==='function')econGain(smith,need,'smith-wage');}catch(e){}
    }
    if(!ok){try{if(typeof toast==='function')toast('工錢不足（需 '+need+' 下品或等額貢獻）');}catch(e){}}
    return {ok:ok,xia:need};
  }
  function smithOnFinish(b,smith){
    if(!b||!smith||smith.kind!=='disciple')return;
    const n=(b._lastCraftN)|0 || 1;
    const fee=smithFeeOf(smith,n);
    if(fee.charge)smithPay(smith,fee,n);
  }

  let fqTab=0;
  let fqPickN=1;
  let fqCat='all';   // 新表開時：all 全部｜old 舊式｜w 新武器｜c 新飾品｜s 新套裝
  let fqSet=0;
  function tabUnlocked(r){
    const open=maxOpenRealm();
    if(r>open)return {ok:false,why:'本版本尚未開放（最高 '+realmName(open)+'）'};
    if(peakRealm()<r)return {ok:false,why:'需宗門有人達到'+realmName(r)};
    return {ok:true};
  }
  function costHtml(c){
    try{if(typeof costStr2==='function')return costStr2(c);}catch(e){}
    return Object.keys(c||{}).map(function(k){return k+' '+c[k];}).join('、')||'（無）';
  }
  // ── 2026-11-11 鍛造佇列面板點擊修補（旗標 craftQUi，預設開；?cqui=0 或 S.econ.flags.craftQUi=false 關回舊畫法）──
  const FQ_PROG_TOKEN='\u0001EGPROG\u0001';
  let _fqLastBox=null;
  function fqUiOn(){try{return typeof econCraftQUiOn==='function'?!!econCraftQUiOn():true;}catch(e){return true;}}
  function fqEsc(t){return String(t).replace(/[&<>]/g,function(c){return c==='&'?'&amp;':c==='<'?'&lt;':'&gt;';});}
  const FQ_KEYS=['data-eg-qn-in','data-eg-setn'];
  function fqKey(e){if(!e||!e.getAttribute)return null;for(const a of FQ_KEYS){if(e.hasAttribute(a))return a+'='+e.getAttribute(a);}return null;}
  function fqSnap(box){
    const act=(typeof document!=='undefined'&&document.activeElement&&box.contains(document.activeElement))?document.activeElement:null;
    let sel=null;try{if(act&&act.selectionStart!=null)sel=[act.selectionStart,act.selectionEnd];}catch(e){}
    const drafts=[];
    box.querySelectorAll('input').forEach(function(i){const k=fqKey(i);if(k&&i.value!==i.defaultValue)drafts.push([k,i.value,i.defaultValue]);});
    return {st:box.scrollTop,sl:box.scrollLeft,ak:fqKey(act),av:act&&act.value,ad:act&&act.defaultValue,sel:sel,drafts:drafts};
  }
  function fqRestore(box,st){
    const find=function(k){const m=/^([^=]+)=(.*)$/.exec(k||'');if(!m)return null;return [...box.querySelectorAll('['+m[1]+']')].find(function(x){return x.getAttribute(m[1])===m[2];})||null;};
    for(const d of st.drafts){const e=find(d[0]);if(e&&e.defaultValue===d[2]&&e.value!==d[1])e.value=d[1];}
    if(st.ak){const e=find(st.ak);if(e&&document.activeElement!==e){try{e.focus({preventScroll:true});}catch(x){try{e.focus();}catch(x2){}}if(st.sel)try{e.setSelectionRange(st.sel[0],st.sel[1]);}catch(x){}}}
    if(box.scrollTop!==st.st)box.scrollTop=st.st;
    if(box.scrollLeft!==st.sl)box.scrollLeft=st.sl;
    box._egST=box.scrollTop;
  }
  function injectPanel(el,b){
    if(!el||!b||b.type!=='forge')return;
    try{
      if(el.id==='craft'||el.closest){
        const c=document.getElementById('craft');
        if(c){
          c.style.maxHeight='min(92vh, 820px)';
          c.style.overflow='auto';
          if(window.innerWidth&&window.innerWidth<500){c.style.top='6px';c.style.bottom='6px';c.style.maxHeight='calc(100vh - 12px)';}
        }
      }
    }catch(e){}
    installCatalog();
    let box=el.querySelector('#econ-gear-ui');
    // 2026-11-11 點擊修補：g14 renderCraft 內容一變（資源每次入帳）就整段重建 #craft，舊的 #econ-gear-ui 被丟掉。
    // 同一座鍛造坊時把上一個節點接回去（按鈕、輸入框、捲動都是同一批節點），不再每 0.3 秒換新節點。
    if(!box&&fqUiOn()&&_fqLastBox&&_fqLastBox._egB===b.id&&!_fqLastBox.isConnected){
      box=_fqLastBox;
      const host0=el.querySelector('#v49cf')||el;
      if(host0.parentNode&&host0!==el)host0.parentNode.insertBefore(box,host0);else el.appendChild(box);
      if(box._egST!=null&&box.scrollTop!==box._egST)box.scrollTop=box._egST;
    }
    if(!box){
      box=document.createElement('div');
      box.id='econ-gear-ui';
      box.style.cssText='margin:8px 0;padding:8px;border:1px solid #6a542044;border-radius:8px;max-height:min(52vh,420px);overflow:auto;-webkit-overflow-scrolling:touch;';
      box.addEventListener('scroll',function(){box._egST=box.scrollTop;},{passive:true});
      const host=el.querySelector('#v49cf')||el;
      if(host.parentNode&&host!==el)host.parentNode.insertBefore(box,host);
      else el.appendChild(box);
    }
    const inf=!!(typeof craftInf!=='undefined'&&craftInf);
    const q=qState(b,true);
    const tot=queueTotalPub(b,inf);
    const peak=peakRealm();
    const open=maxOpenRealm();
    const lock=tabUnlocked(fqTab);
    let prog='';
    let h='<div class="econ-fq"><div class="gt">批量佇列</div>';
    h+='<div class="dim sm">可加入多種裝備與各自數量（例如 長劍×3＋拳套×5＋護身符×2），依序打造；單一品項滿 '+ECON_FQ_BULK_N+' 件材料九折。材料不足會跳過該項並提示。</div>';
    if(b.craft){
      const cn=itemLabel(b.craft.k);
      const left=q.length?('，佇列尚餘 '+q.length+' 項'):'';
      prog='打造中：'+cn+(b.craft.n>1?(' ×'+b.craft.n):'')+' '+Math.floor((b.craft.t/b.craft.T)*100)+'%'+left;
      h+='<div data-eg-prog>'+FQ_PROG_TOKEN+'</div>';
    }
    h+='<div class="jobs" style="flex-wrap:wrap">境界：';
    if(v2On()){
      // 新表：境界頁籤開到 MAX_REALM（未達者鎖）
      for(let r=0;r<=11;r++){const un=tabUnlocked(r);h+='<button type="button" class="btn '+(fqTab===r?'on':'')+'" data-eg-tab="'+r+'">'+(un.ok?realmName(r):('🔒 '+realmName(r)))+'</button>';}
    }else{
    for(let r=0;r<=11;r++){
      if(r>6&&r!==7)continue;
      if(r>7)break;
      const un=tabUnlocked(r);
      const on=fqTab===r?'on':'';
      h+='<button type="button" class="btn '+on+'" data-eg-tab="'+r+'">'+(un.ok?realmName(r):('🔒 '+realmName(r)))+'</button>';
    }
    for(let r=8;r<=11;r++){
      h+='<button type="button" class="btn" data-eg-tab="'+r+'">🔒 '+realmName(r)+'</button>';
    }
    }
    h+='</div>';
    let v2Keys=null;let shownKeys=[];
    if(v2On()&&lock.ok){
      const v=V2();
      h+='<div class="jobs" style="flex-wrap:wrap" data-eg-cats>類別：';
      [['all','全部'],['old','舊式'],['w','武器（新）'],['c','飾品（新）'],['s','套裝（新）']].forEach(function(c){h+='<button type="button" class="btn '+(fqCat===c[0]?'on':'')+'" data-eg-cat="'+c[0]+'">'+c[1]+'</button>';});
      h+='</div>';
      const all=keysForRealm(fqTab);
      if(fqCat==='old')v2Keys=all.filter(function(k){return !v.isV2({t:k});});
      else if(fqCat==='w'||fqCat==='c')v2Keys=v.keys(fqCat,fqTab);
      else if(fqCat==='s'){
        const L=v.SET_FORGE?v.setsForRealm(fqTab):[];
        if(!L.length){h+='<div class="dim sm">'+(v.SET_FORGE?'此境界沒有套裝件':'套裝件只從秘境／首領掉落')+'</div>';v2Keys=[];}
        else{
          if(!L.some(function(x){return x.id===fqSet;}))fqSet=L[0].id;
          h+='<div class="jobs" style="flex-wrap:wrap" data-eg-sets>套裝：';
          L.forEach(function(x){h+='<button type="button" class="btn '+(fqSet===x.id?'on':'')+'" data-eg-set="'+x.id+'">'+x.n+'</button>';});
          h+='</div>';
          const one=L.filter(function(x){return x.id===fqSet;})[0];
          try{h+='<div class="dim sm" data-eg-setinfo>'+v.setText({t:one.ids[0]},null)+'</div>';}catch(eS){}
          v2Keys=one.ids.slice();
        }
      }else v2Keys=all;
    }
    if(!lock.ok){
      h+='<div class="dim">🔒 '+realmName(fqTab)+'：'+lock.why+'</div>';
    }else{
      const smith=(typeof bestCrafter==='function'?bestCrafter(b):null);
      let hfLine='';
      try{if(typeof econHelperFeeLine==='function'&&typeof econHelperFeeOn==='function'&&econHelperFeeOn())hfLine=econHelperFeeLine(b);}catch(eH){}
      if(hfLine){
        h+=hfLine;
      }else if(smith&&smith.kind==='disciple'){
        const fee=smithFeeOf(smith,fqPickN);
        const how=(function(){try{const m=typeof econPayMode==='function'?econPayMode():'lsThenCb';return m==='cbOnly'||m==='cbFirst'?'貢獻優先':'靈石／貢獻';}catch(e){return '靈石／貢獻';}})();
        h+='<div class="dim">這位弟子收費 '+(fee.charge?fee.xia+' 下品（'+how+'，弟子自付，宗主免費）':'免收（熟練未達 '+ECON_SMITH_FEE_LV+'；宗主免費）')+'</div>';
      }
      h+='<div class="jobs">數量：';
      [1,3,5,10].forEach(function(n){
        h+='<button type="button" class="btn '+(fqPickN===n?'on':'')+'" data-eg-qn="'+n+'">×'+n+'</button>';
      });
      h+=' <input data-eg-qn-in '+(typeof econQtyAttrs==='function'?econQtyAttrs((typeof econFqMax==='function'?econFqMax():20)):'type="number" min="1" max="20"')+' value="'+fqPickN+'" style="width:52px"></div>';
      h+='<div class="jobs" style="flex-wrap:wrap">';
      shownKeys=(v2Keys||keysForRealm(fqTab)).filter(function(k){return !!GEAR[k];});
      (v2Keys||keysForRealm(fqTab)).forEach(function(k){
        const G=GEAR[k]; if(!G)return;
        let why='';
        if(G.lv&&(typeof blv==='function'?blv(b):1)<G.lv)why='需要鍛造坊 Lv'+G.lv;
        if(G.slot==='f'&&peak<4)why=why||'需煉氣才能打造／佩戴法器';
        const c=batchCostOf(k,fqPickN,inf);
        const ok=!why&&(typeof canPay2==='function'?canPay2(c):true);
        const tip=((costHtml(c)||'').replace(/<[^>]+>/g,'').replace(/"/g,'')+(why?('｜'+why):''));
        h+='<button type="button" class="btn '+(ok?'':'dis')+'" data-eg-add="'+k+'" title="'+tip+'">＋ '+G.n+'×'+fqPickN+(why?' 🔒':'')+'</button>';
      });
      h+='</div>';
    }
    if(q.length){
      h+='<div class="econ-fq-list">';
      q.forEach(function(line,i){
        h+='<div class="econ-task-row">'+ (i+1)+'. '+itemLabel(line.k)+' <input data-eg-setn="'+line.id+'" '+(typeof econQtyAttrs==='function'?econQtyAttrs((typeof econFqMax==='function'?econFqMax():20)):'type="number" min="1" max="20"')+' value="'+line.n+'" style="width:48px"> 件';
        if(line.n>=ECON_FQ_BULK_N)h+=' <span class="dim">（九折）</span>';
        h+=' <button type="button" class="btn" data-eg-del="'+line.id+'">刪</button></div>';
      });
      h+='</div>';
      h+='<div>合計材料：'+costHtml(tot)+'</div>';
      if(!b.craft)h+='<button type="button" class="btn pri" data-eg-start="1">開始佇列</button>';
    }else{
      h+='<div class="dim sm">佇列是空的。點上方「＋ 品名」加入。</div>';
    }
    h+='</div>';
    box._egB=b.id;_fqLastBox=box;
    // 內容（不含進度百分比）沒變就不重畫；變了才重畫，並保留捲動、輸入中的數量與焦點
    if(!fqUiOn()||box._egSig!==h){
      const st=fqUiOn()?fqSnap(box):null;
      box.innerHTML=h.replace(FQ_PROG_TOKEN,fqEsc(prog));
      box._egSig=h;
      if(st)fqRestore(box,st);
    }else if(prog){
      const pe=box.querySelector('[data-eg-prog]');
      if(pe&&pe.textContent!==prog)pe.textContent=prog;
    }
    try{fqInfoCard(el,b,shownKeys);}catch(eI){}
    // hide old single-type batch picker to avoid confusion, keep 熔鍊
    try{
      const v=el.querySelector('#v49cf');
      if(v){
        const secs=v.querySelectorAll('.v49sec');
        secs.forEach(function(s){
          const t=s.textContent||'';
          if(/批量鍛造/.test(t)&&!/熔鍊/.test(t))s.style.display='none';
        });
      }
    }catch(e){}
  }


  // ── 2026-11-13 BUG-021／024：鍛造資訊卡（旗標 forgeUi，?forgeui=0 關）──
  // 021 原因：上方是 g14 renderCraft 的固定舊表（9 件舊式），下方 econ 佇列換境界／類別／品項時沒有任何地方跟著顯示所選裝備。
  // 024 原因：g14 只顯示「已鍛打 n 次」，沒顯示品級與品質機率；econ_forge 依鍛打次數換機率表，但面板看不到。
  // 修補：在 #craft 頂端放一張資訊卡，跟著下方選取（滑過／點「＋品名」／切境界或類別＝該頁第一件）更新：
  //   主屬性、材料（×數量）、需求、品級（新表件＝擲骰機率；舊式＝依境界固定）、品質機率（0～3 次鍛打，目前那欄標亮）、靈器規則與靈石費用；
  //   爐火進行中時顯示目前打造品項、已鍛打次數、最近一次鍛打結果。
  let fqInfoK=null,fqInfoKeysSig='';
  function fqUiCardOn(){try{return typeof econForgeUiOn==='function'?!!econForgeUiOn():true;}catch(e){return true;}}
  function fqPct(x){return (Math.round(x*10)/10)+'%';}
  function fqQName(q){try{if(typeof QN!=='undefined'&&QN[q])return QN[q];}catch(e){}return ['凡品','良品','精品','靈器','法寶'][q]||('品'+q);}
  function fqQCol(q){try{if(typeof QC!=='undefined'&&QC[q])return QC[q];}catch(e){}return '#ccc';}
  function fqSmithOf(b){let u=null;try{u=typeof bestCrafter==='function'?bestCrafter(b):null;}catch(e){}if(!u){try{u=typeof player==='function'?player():null;}catch(e){}}return u;}
  function fqGradeLine(k,b){
    try{
      const v=V2();if(!v||!v2On()||!v.gradeOn||!v.gradeOn())return '';
      const G=GEAR[k];const r=(G&&G.realm!=null)?(G.realm|0):fqTab;
      if(!v.isV2({t:k}))return '品級：'+v.GRADES[v.gradeIdx(r)].n+'（舊式裝備依境界固定）';
      const A=(typeof window!=='undefined'&&window.XW_ECON)||{};
      const smith=b?fqSmithOf(b):null;const smithR=smith&&smith.realm!=null?(smith.realm|0):-1;
      const sure=!!(A.lqSureOn&&A.lqSureOn()&&A.forgeSureWant&&A.forgeSureWant());
      let w;
      if(typeof v.forgeWeightsFor==='function'){
        w=v.forgeWeightsFor(r,sure,smithR); // 14:09：只看所選裝備境界 r（GEAR[k].realm）；保底資格另看宗主／鍛造者
      }else{
        w=(v.GRADE_TUNE.weight.forge||[]).slice();const tmr=+v.GRADE_TUNE.topMinRealm||0;const cap=v.GRADE_TUNE.realmCap&&v.GRADE_TUNE.realmCap[r];
        if(cap)for(let i=cap;i<w.length;i++)w[i]=0;if(tmr>0&&r<tmr)w[4]=0;
      }
      let tot=0;w.forEach(function(x){tot+=x;});if(!(tot>0))return '';
      const names=(i)=>{
        if(i===4)return '仙器（下／中／上）';
        return v.GRADES[i]?v.GRADES[i].n:'';
      };
      return '品級機率（不受鍛打影響）：'+w.map(function(x,i){return x>0?names(i)+' '+fqPct(x*100/tot):'';}).filter(Boolean).join('／');
    }catch(e){return '';}
  }
  function fqOddsRow(k,b,hits,smith){
    const A=(typeof window!=='undefined'&&window.XW_ECON)||{};
    if(typeof A.forgeOddsEff!=='function')return '';
    const G=GEAR[k]||null;let lv=0;try{if(smith&&smith.kind==='disciple'&&typeof v59Lv==='function')lv=v59Lv(smith,'forge');}catch(e){}
    let h='<table class="sm" style="border-collapse:collapse;margin:2px 0"><tr><td class="dim">鍛打</td>';
    const rows=[];const qs={};
    for(let n=0;n<=3;n++){const o=A.forgeOddsEff(n,G,lv,smith);rows.push(o);for(const q in o)qs[q]=1;}
    const ql=Object.keys(qs).map(Number).sort(function(a,c){return a-c;});
    ql.forEach(function(q){h+='<td style="padding:0 6px;color:'+fqQCol(q)+'">'+fqQName(q)+'</td>';});h+='</tr>';
    rows.forEach(function(o,n){
      const on=(hits!=null&&n===hits);
      h+='<tr'+(on?' style="background:#ffd34d33;font-weight:bold"':'')+'><td class="dim">'+n+' 次'+(on?' ◀':'')+'</td>';
      ql.forEach(function(q){h+='<td style="padding:0 6px">'+fqPct(o[q]||0)+'</td>';});h+='</tr>';
    });
    return h+'</table>';
  }
  function fqInfoHtml(b,k){
    const G=GEAR[k];if(!G)return '';
    const A=(typeof window!=='undefined'&&window.XW_ECON)||{};
    const smith=fqSmithOf(b);const c=b.craft;const busy=!!(c&&c.k);
    const kk=busy?c.k:k;const GG=GEAR[kk]||G;
    let h='<div class="gt">裝備資訊'+(busy?'（爐火進行中）':'（下方選取）')+'</div>';
    const st=[];if(GG.atk)st.push('攻擊 '+GG.atk);if(GG.hp)st.push('氣血 '+GG.hp);if(GG.def)st.push('防禦 '+GG.def);if(GG.spd)st.push('速度 '+GG.spd);
    const slotN=(function(){try{return (SLOT_NAMES[GG.slot==='c'?'c1':GG.slot]||GG.slot||'').replace('一','');}catch(e){return GG.slot||'';}})();
    h+='<div><b>'+fqEsc(GG.n)+'</b> <span class="dim">'+fqEsc(slotN)+(GG.realm!=null?'｜'+fqEsc(realmName(GG.realm|0)):'')+'</span></div>';
    h+='<div class="dim sm">'+fqEsc(GG.desc||'')+'</div>';
    h+='<div>基礎（凡品）：'+(st.join('、')||'—')+'</div>';
    if(busy){
      h+='<div>目前打造：<b>'+fqEsc(GG.n)+'</b>'+(c.n>1?' ×'+c.n:'')+'　已鍛打 <b>'+(c.hits|0)+'/3</b> 次'+(c.autoHit?'（弟子自動鍛打）':'')+'</div>';
      try{const T=A.forgeLastTap&&A.forgeLastTap();if(T&&T.bid===b.id&&Date.now()-T.at<4000){const m={hit:'🔨 火候正好！品質機率已提升',miss:'火候偏了（這次沒有加成，指針進金色區再按）',cd:'冷卻中（0.6 秒後再按）',full:'已鍛打 3 次（上限）'}[T.res]||'';if(m)h+='<div style="color:#ffd34d">'+m+'</div>';}}catch(eT){}
    }else{
      try{const cc=batchCostOf(k,fqPickN,!!(typeof craftInf!=='undefined'&&craftInf));h+='<div>材料（×'+fqPickN+'）：'+costHtml(cc)+'</div>';}catch(eC){}
      if(G.lv)h+='<div class="dim sm">需要鍛造坊 Lv'+G.lv+'</div>';
    }
    const gl=fqGradeLine(kk,b);if(gl)h+='<div>'+gl+'</div>';
    h+='<div>品質機率（依鍛打次數'+(busy?'，目前這爐標亮':'')+'）：</div>'+fqOddsRow(kk,b,busy?(c.hits|0):null,smith);
    try{
      if(typeof A.forgeRuleOn==='function'&&A.forgeRuleOn()){
        const R=A.FORGE_RULE||{};const ok=A.forgeSmithRealmOk(smith);
        const sn=smith?((typeof pnm==='function'?pnm(smith):(smith.name||''))+'（'+realmName(smith.realm|0)+'）'):'（無人）';
        h+='<div class="sm" style="color:'+(ok?'#9fe8b0':'#ff9a7a')+'">主事：'+fqEsc(sn)+'。'+(ok?'可鍛出靈器以上':'宗師以下鍛不出靈器：靈器以上機率併入精品')+'</div>';
        // P2（使用者 14:03）：宗主宗師以下不能付靈石打造→隱藏保底勾選與所有靈石費用，只留一行說明（不顯示數字）
        const ownerPay=!(typeof A.forgeOwnerCanPay==='function')||A.forgeOwnerCanPay();
        if(!ownerPay){
          h+='<div class="dim sm" data-eg-lqlow="1">宗主宗師以下：不能付靈石打造（無保底、不收靈石），品質照一般機率；宗主煉氣以上才開放。</div>';
        }else if(A.lqSureOn&&A.lqSureOn()){
          const n=(typeof A.forgeLqCost==='function')?A.forgeLqCost(3):10;
          const want=!!(A.forgeSureWant&&A.forgeSureWant());
          const dis=ok?'':' disabled';
          h+='<div class="sm" style="margin:4px 0"><label><input type="checkbox" data-eg-lqsure="1"'+dis+(want&&ok?' checked':'')+'> 付 '+n+' 下品靈石保證靈器'+(ok?'':'（宗師以下不可用）')+'</label></div>';
          if(ok)h+='<div class="dim sm">勾選才扣費：保證靈器；擲出法寶以上且付得起則保留。靈石不足則不保底，照一般規則。</div>';
        }else{
          h+='<div class="dim sm">靈器以上（含靈器）成品時另扣靈石：靈器 '+(typeof A.forgeLqCost==='function'?A.forgeLqCost(3):10)+'、法寶 '+(typeof A.forgeLqCost==='function'?A.forgeLqCost(4):30)+'（宗門庫房，費用依宗主境界）；靈石不足則以較低品質出爐。</div>';
        }
      }
    }catch(eR){}
    return h;
  }
  function fqInfoCard(el,b,keys){
    let card=el.querySelector('#econ-forge-info');
    if(!fqUiCardOn()||b.type!=='forge'){if(card)card.remove();return;}
    if(keys){
      const sig=fqTab+'|'+fqCat+'|'+fqSet+'|'+keys.join(',');
      if(sig!==fqInfoKeysSig){fqInfoKeysSig=sig;if(keys.indexOf(fqInfoK)<0)fqInfoK=keys[0]||null;}
    }
    if(!fqInfoK&&!b.craft){if(card)card.remove();return;}
    if(!card){
      card=document.createElement('div');card.id='econ-forge-info';
      card.style.cssText='margin:6px 0;padding:6px 8px;border:1px solid #c9a35a66;border-radius:8px;background:#00000033;';
    }
    // 放在 g14 舊表（table）之前；g14 每次重建 #craft 後重新接回
    const anchor=el.querySelector(':scope > label')||el.querySelector(':scope > table')||el.querySelector('#econ-gear-ui');
    if(card.parentNode!==el||(anchor&&card.nextSibling!==anchor)){if(anchor)el.insertBefore(card,anchor);else el.appendChild(card);}
    const html=fqInfoHtml(b,fqInfoK||(b.craft&&b.craft.k));
    if(card._sig!==html){card.innerHTML=html;card._sig=html;}
  }
  function fqInfoPick(k){
    if(!k||!GEAR[k]||fqInfoK===k)return;fqInfoK=k;
    try{const el=document.getElementById('craft');const b=(typeof bById==='function'&&typeof craftB!=='undefined')?bById(craftB):null;if(el&&b)fqInfoCard(el,b,null);}catch(e){}
  }
  function onCraftClick(ev){
    const t=ev.target&&ev.target.closest&&ev.target.closest('[data-eg-tab],[data-eg-qn],[data-eg-add],[data-eg-del],[data-eg-start],[data-eg-setn],[data-eg-qn-in],[data-eg-cat],[data-eg-set]');
    if(!t)return;
    const b=(typeof bById==='function'&&typeof craftB!=='undefined')?bById(craftB):null;
    if(!b)return;
    if(t.hasAttribute('data-eg-tab')){
      fqTab=+t.getAttribute('data-eg-tab')||0;
    }else if(t.hasAttribute('data-eg-cat')){
      if(ev.type!=='click')return;fqCat=t.getAttribute('data-eg-cat')||'all';
    }else if(t.hasAttribute('data-eg-set')){
      if(ev.type!=='click')return;fqSet=+t.getAttribute('data-eg-set')||0;
    }else if(t.hasAttribute('data-eg-qn')){
      fqPickN=+t.getAttribute('data-eg-qn')||1;
    }else if(t.hasAttribute('data-eg-qn-in')&&ev.type==='change'){
      fqPickN=(typeof econQtyParse==='function'?econQtyParse(t.value,(typeof econFqMax==='function'?econFqMax():20)):Math.max(1,Math.min(20,+t.value||1)));
    }else if(t.hasAttribute('data-eg-add')){
      const k=t.getAttribute('data-eg-add');
      if(ev.type!=='click')return;
      try{fqInfoPick(k);}catch(eI){}
      const G=GEAR[k];
      let why='';
      if(G&&G.lv&&(typeof blv==='function'?blv(b):1)<G.lv)why='需要鍛造坊 Lv'+G.lv;
      if(why){try{toast(why);}catch(e){}return;}
      fqAddPub(b,k,fqPickN,typeof craftInf!=='undefined'&&craftInf);
    }else if(t.hasAttribute('data-eg-del')){
      fqDelPub(b,+t.getAttribute('data-eg-del'));
    }else if(t.hasAttribute('data-eg-setn')&&ev.type==='change'){
      fqSetNPub(b,+t.getAttribute('data-eg-setn'),(typeof econQtyParse==='function'?econQtyParse(t.value,(typeof econFqMax==='function'?econFqMax():20)):Math.max(1,Math.min(20,+t.value||1))));
    }else if(t.hasAttribute('data-eg-start')){
      fqKickPub(b);
    }else return;
    try{if(typeof craftKey!=='undefined')craftKey=null;}catch(e){}
    try{if(typeof renderCraft==='function')renderCraft();}catch(e){}
    ev.preventDefault();
    ev.stopPropagation();
  }

  function tooltipExtra(it,owner){
    if(!it)return '';
    attachAffixes(it);
    const val=econGearValue(it);
    const qn=qNameOf(it);
    const ax=affixText(it);
    let v2='';
    try{const v=V2();if(v){const gt=v2On()?v.gradeText(it):'';if(gt)v2=gt+'。';if(v.isV2(it)){
      if(!v2On())v2='新表效果已關閉（只計主屬性）。';
      else{const st=v.secText(it);const se=v.setText(it,owner||(typeof player==='function'?player():null));v2+=(st?'固定：'+st+'。':'')+(se?se+'。':'');}
    }}}catch(eV){}
    return '品質：'+qn+'。詞綴：'+(ax||'無')+'。'+v2+val.label+'。';
  }

  function install(){
    installCatalog();
    try{const v=V2();if(v)v.sweep();}catch(eV){}
    try{
      if(typeof applySave==='function'&&!ECON_GEAR_WRAPPED['applySave_gv2']){
        const _as=applySave;
        applySave=function(d){const r=_as.apply(this,arguments);try{const v=V2();if(v&&r!==false)v.sweep();}catch(e){}return r;};
        ECON_GEAR_WRAPPED['applySave_gv2']=1;
      }
    }catch(eA){}
    try{fqRegisterShared();}catch(eQ){}
    try{installAffixHooks();}catch(eH){}
    try{
      if(typeof itemName==='function'&&!itemName._lqXian){
        const _in=itemName;
        itemName=function(it){
          const n=_in.apply(this,arguments);
          try{
            const v=V2();const xn=v&&v.xianQiDisplay?v.xianQiDisplay(it):'';
            if(xn&&typeof n==='string'){
              if(/^仙器/.test(n))return n.replace(/^仙器/,xn);
              if(/^靈器|^法寶/.test(n)&&(it.gr|0)===5)return n.replace(/^(靈器|法寶)/,xn);
            }
          }catch(e){}
          return n;
        };
        itemName._lqXian=1;
      }
    }catch(eN){}
    try{
      if(typeof makeItem==='function'&&!makeItem._econGear&&!ECON_GEAR_WRAPPED['makeItem_econGear']){
        const _m=makeItem;
        makeItem=function(t,q,el){
          const it=_m.apply(this,arguments);
          try{if(it){const v=V2();if(v&&v.isV2(it))v.rescale(it);if(v)v.ensureGr(it,_gvSrc||'forge');attachAffixes(it);if(GEAR&&GEAR[t]&&GEAR[t].realm!=null)it.realm=GEAR[t].realm;}}catch(e){}
          return it;
        };
        makeItem._econGear=1;ECON_GEAR_WRAPPED['makeItem_econGear']=1;
      }
      // P2：新地圖副本掉落直接改寫 it.gr（map_dg_loot mapGearV2ApplyGrade）；擲到仙品時同樣補寫 it.xsub（不改 map 檔）
      if(typeof mapGearV2ApplyGrade==='function'&&!mapGearV2ApplyGrade._econXsub&&!ECON_GEAR_WRAPPED['mapGearV2ApplyGrade_xsub']){
        const _mg=mapGearV2ApplyGrade;
        mapGearV2ApplyGrade=function(it){
          const r=_mg.apply(this,arguments);
          try{const v=V2();if(v&&v.stampXianSub)v.stampXianSub(r&&typeof r==='object'?r:it);}catch(e){}
          return r;
        };
        mapGearV2ApplyGrade._econXsub=1;ECON_GEAR_WRAPPED['mapGearV2ApplyGrade_xsub']=1;
      }
    }catch(e){}
    try{
      if(typeof addItem==='function'&&!addItem._econGearVal){
        const _ai=addItem;
        addItem=function(it,x,y){
          try{if(it)attachAffixes(it);}catch(e){}
          return _ai.apply(this,arguments);
        };
        addItem._econGearVal=1;
      }
    }catch(e){}
    try{
      if(typeof tipText==='function'&&!tipText._econGear&&!ECON_GEAR_WRAPPED['tipText_econGear']){
        const _tt=tipText;
        tipText=function(k){
          const r=_tt.apply(this,arguments);
          try{
            if(k&&typeof k==='string'&&k.startsWith('it:')){
              const id=+k.slice(3);
              let it=null,own=null;
              if(typeof S!=='undefined'&&S&&S.inv)it=S.inv.find(function(x){return x&&x.id===id;});
              if(!it&&S&&S.units){
                for(const u of S.units){
                  for(const s in (u.eq||{}))if(u.eq[s]&&u.eq[s].id===id){it=u.eq[s];own=u;}
                }
              }
              if(it)return (r||'')+' '+tooltipExtra(it,own);
            }
          }catch(e){}
          return r;
        };
        tipText._econGear=1;ECON_GEAR_WRAPPED['tipText_econGear']=1;
      }
    }catch(e){}
    try{
      if(typeof itemStats==='function'&&!itemStats._econGear&&!ECON_GEAR_WRAPPED['itemStats_econGear']){
        const _is=itemStats;
        itemStats=function(it){
          let s=_is.apply(this,arguments)||'';
          try{if(it){attachAffixes(it);const ax=affixText(it);const val=econGearValue(it);if(ax)s+=(s?'、':'')+ax;
            try{const v=V2();if(v&&v2On()){const g=v.gradeOf(it);if(g)s=g.n+'｜'+s;if(v.isV2(it)){const st=v.secText(it);if(st)s+=(s?'、':'')+st;}}}catch(eV){}
            if(val)s+='　'+val.label;}}catch(e){}
          return s;
        };
        itemStats._econGear=1;ECON_GEAR_WRAPPED['itemStats_econGear']=1;
      }
    }catch(e){}
    try{
      if(typeof renderCraft==='function'&&!renderCraft._econGearUi){
        const _rc=renderCraft;
        renderCraft=function(){
          const r=_rc.apply(this,arguments);
          try{
            const el=document.getElementById('craft');
            const b=(typeof bById==='function'&&typeof craftB!=='undefined')?bById(craftB):null;
            if(el&&b&&(typeof craftOpen==='undefined'||craftOpen))injectPanel(el,b);
          }catch(e){}
          return r;
        };
        renderCraft._econGearUi=1;
      }
    }catch(e){}
    try{
      if(typeof document!=='undefined'&&!document._econGearClick){
        document._econGearClick=1;
        document.addEventListener('click',onCraftClick,true);
        document.addEventListener('change',onCraftClick,true);
        // BUG-021：滑過／鍵盤聚焦「＋品名」時資訊卡跟著換；BUG-022：數量邊打邊記（不用先離開欄位）
        document.addEventListener('mouseover',function(ev){try{if(!fqUiCardOn())return;const t=ev.target&&ev.target.closest&&ev.target.closest('#econ-gear-ui [data-eg-add]');if(t)fqInfoPick(t.getAttribute('data-eg-add'));}catch(e){}},true);
        document.addEventListener('focusin',function(ev){try{if(!fqUiCardOn())return;const t=ev.target&&ev.target.closest&&ev.target.closest('#econ-gear-ui [data-eg-add]');if(t)fqInfoPick(t.getAttribute('data-eg-add'));}catch(e){}},true);
        document.addEventListener('input',function(ev){try{const t=ev.target;if(t&&t.hasAttribute&&t.hasAttribute('data-eg-qn-in')&&fqUiCardOn()&&String(t.value).replace(/[^0-9]/g,'')!==''){fqPickN=(typeof econQtyParse==='function'?econQtyParse(t.value,(typeof econFqMax==='function'?econFqMax():20)):Math.max(1,+t.value|0));}}catch(e){}},true);
      }
    }catch(e){}
    try{
      if(typeof startCraft==='function'&&!startCraft._econGearFee){
        const _sc=startCraft;
        startCraft=function(b,k,inf){
          try{
            if(b&&b.type==='forge'){
              const smith=(typeof bestCrafter==='function'?bestCrafter(b):null);
              if(smith&&smith.kind==='disciple'){
                const fee=smithFeeOf(smith,1);
                if(fee.charge&&!canSmithPay(fee)){try{toast('工錢不足（需 '+fee.xia+' 下品或等額貢獻）');}catch(e){}return false;}
              }
            }
          }catch(e){}
          const r=_sc.apply(this,arguments);
          try{
            if(r&&b&&b.type==='forge'){
              const smith=(typeof bestCrafter==='function'?bestCrafter(b):null);
              if(smith&&smith.kind==='disciple'){
                const fee=smithFeeOf(smith,1);
                if(fee.charge) smithPay(smith,fee,1);
              }
            }
          }catch(e){}
          return r;
        };
        startCraft._econGearFee=1;
      }
    }catch(e){}
    try{
      if(typeof v49Batch==='function'&&!v49Batch._econGearFee){
        const _vb=v49Batch;
        v49Batch=function(bid,k,n,inf){
          try{
            const b0=(typeof bById==='function')?bById(bid):null;
            if(b0){
              const smith=(typeof bestCrafter==='function'?bestCrafter(b0):null);
              if(smith&&smith.kind==='disciple'){
                const fee=smithFeeOf(smith,n);
                if(fee.charge&&!canSmithPay(fee)){try{toast('工錢不足（需 '+fee.xia+' 下品或等額貢獻）');}catch(e){}return false;}
              }
            }
          }catch(e){}
          const r=_vb.apply(this,arguments);
          try{
            const b=(typeof bById==='function')?bById(bid):null;
            if(r&&b){
              const smith=(typeof bestCrafter==='function'?bestCrafter(b):null);
              if(smith&&smith.kind==='disciple'){
                const fee=smithFeeOf(smith,n);
                if(fee.charge) smithPay(smith,fee,n);
              }
            }
          }catch(e){}
          return r;
        };
        v49Batch._econGearFee=1;
      }
    }catch(e){}
  }


  let _econSkill=0,_econCostU=null;
  function wornOf(u){
    try{return econGearWornPct(u);}catch(e){return {};}
  }
  function dropActor(e){
    try{
      if(typeof S!=='undefined'&&S&&S.units){
        for(let i=0;i<S.units.length;i++){
          const u=S.units[i];
          if(u&&!u.dead&&u.task&&u.task.type==='attack'&&e&&u.task.eid===e.id)return u;
        }
      }
      if(typeof player==='function')return player();
    }catch(ex){}
    return null;
  }
  function wrapFn(holder,name,flag,maker){
    try{
      if(typeof holder[name]!=='function')return false;
      if(holder[name][flag])return true;
      const _o=holder[name];
      const nw=maker(_o);
      if(typeof nw==='function'){nw[flag]=1;holder[name]=nw;return true;}
    }catch(e){}
    return false;
  }
  function installAffixHooks(){
    // 修煉速度
    try{
      if(typeof cultMul==='function'&&!cultMul._econAffix&&!ECON_GEAR_WRAPPED['cultMul_econAffix']){
        const _cm=cultMul;
        cultMul=function(u){let m=_cm.apply(this,arguments);try{const p=wornOf(u);if(p.cultSpd)m*=(1+p.cultSpd/100);}catch(e){}return m;};
        cultMul._econAffix=1;ECON_GEAR_WRAPPED['cultMul_econAffix']=1;
      }
    }catch(e){}
    // 突破成功率：降低失敗率
    try{
      if(typeof breakFail==='function'&&!breakFail._econAffix&&!ECON_GEAR_WRAPPED['breakFail_econAffix']){
        const _bf=breakFail;
        breakFail=function(u){let f=_bf.apply(this,arguments);try{const p=wornOf(u);if(p.breakSucc)f=Math.max(0,f-p.breakSucc/100);}catch(e){}return f;};
        breakFail._econAffix=1;ECON_GEAR_WRAPPED['breakFail_econAffix']=1;
      }
    }catch(e){}
    // 靈氣上限
    try{
      if(typeof qiMaxFor==='function'&&!qiMaxFor._econAffix&&!ECON_GEAR_WRAPPED['qiMaxFor_econAffix']){
        const _qm=qiMaxFor;
        qiMaxFor=function(u){let b=_qm.apply(this,arguments);try{const p=wornOf(u);if(b>0&&p.qiMax)b=Math.max(1,Math.round(b*(1+p.qiMax/100)));}catch(e){}return b;};
        qiMaxFor._econAffix=1;ECON_GEAR_WRAPPED['qiMaxFor_econAffix']=1;
      }
    }catch(e){}
    // 罡氣／靈氣護體（含舊詞條 護盾容量）
    try{
      if(typeof gqMaxFor==='function'&&!gqMaxFor._econAffix&&!ECON_GEAR_WRAPPED['gqMaxFor_econAffix']){
        const _gq=gqMaxFor;
        gqMaxFor=function(u){let b=_gq.apply(this,arguments);try{const p=wornOf(u);if(b>0&&p.gang)b=Math.max(1,Math.round(b*(1+p.gang/100)));}catch(e){}return b;};
        gqMaxFor._econAffix=1;ECON_GEAR_WRAPPED['gqMaxFor_econAffix']=1;
      }
    }catch(e){}
    // 靈氣回復
    try{
      if(typeof v49PoolTick==='function'&&!v49PoolTick._econAffix&&!ECON_GEAR_WRAPPED['v49PoolTick_econAffix']){
        const _pt=v49PoolTick;
        v49PoolTick=function(u,dt){
          const q0=u&&u.qi;
          const r=_pt.apply(this,arguments);
          try{
            if(u&&u.qiMax>0&&q0!=null){
              const d=u.qi-q0,p=wornOf(u);
              if(d>0&&p.qiRegen)u.qi=Math.min(u.qiMax,q0+d*(1+p.qiRegen/100));
            }
          }catch(e){}
          return r;
        };
        v49PoolTick._econAffix=1;ECON_GEAR_WRAPPED['v49PoolTick_econAffix']=1;
      }
    }catch(e){}
    try{
      if(typeof cultQiRegen==='function'&&!cultQiRegen._econAffix&&!ECON_GEAR_WRAPPED['cultQiRegen_econAffix']){
        const _cr=cultQiRegen;
        cultQiRegen=function(u){let r=_cr.apply(this,arguments);try{const p=wornOf(u);if(p.qiRegen)r*=(1+p.qiRegen/100);}catch(e){}return r;};
        cultQiRegen._econAffix=1;ECON_GEAR_WRAPPED['cultQiRegen_econAffix']=1;
      }
    }catch(e){}
    // 雷劫減傷：wrap Cult.tribDmgHook；踏仙梯走 tianleiReduce，不會進這條。trib2.reduce 已在 hook 後套 25% 總帽。
    try{
      const C=typeof window!=='undefined'?window.Cult:null;
      if(C&&!C._econGearTribHook){
        const apply=function(u,dmg){
          const r=econGearTribRed(u);
          if(r>0&&dmg>0)dmg=dmg*(1-r);
          return dmg;
        };
        const prev=C.tribDmgHook;
        C.tribDmgHook=function(u,dmg,i){
          if(typeof prev==='function'){
            try{const x=prev(u,dmg,i);if(x>=0)dmg=x;}catch(e){}
          }
          return apply(u,dmg);
        };
        C.tribDmgHook._econGear=1;ECON_GEAR_WRAPPED['tribDmgHook_econGear']=1;
        C._econGearTribHook=1;
      }
    }catch(e){}
    // 暴擊／暴傷／吸血／靈氣技能攻擊
    try{
      if(typeof dmgEnemy==='function'&&!dmgEnemy._econAffix&&!ECON_GEAR_WRAPPED['dmgEnemy_econAffix']){
        const _de=dmgEnemy;
        dmgEnemy=function(src,e,amt,col){
          try{
            const p=wornOf(src);
            if((_econSkill||(typeof window!=='undefined'&&window.__econSkill))&&p.qiSkillAtk)amt=amt*(1+p.qiSkillAtk/100);
            if(p.crit>0&&rnd01()*100<p.crit){
              amt=amt*(1.5+(p.critDmg||0)/100);
              try{if(e&&typeof floater==='function')floater(e.x,e.y-0.4,'暴擊','#ffe27a');}catch(e2){}
            }
            const r=_de(src,e,amt,col);
            const lee=econGearLeech(src);
            if(lee&&src&&!src.dead&&amt>0){
              src.hp=Math.min(src.maxhp||src.hp, (src.hp||0)+amt*lee);
            }
            return r;
          }catch(e3){return _de.apply(this,arguments);}
        };
        dmgEnemy._econAffix=1;ECON_GEAR_WRAPPED['dmgEnemy_econAffix']=1;
      }
    }catch(e){}
    const markSkill=function(_fn){
      return function(u){
        const prev=_econSkill,prevU=_econCostU;
        _econSkill=1;_econCostU=u||_econCostU;
        try{return _fn.apply(this,arguments);}finally{_econSkill=prev;_econCostU=prevU;}
      };
    };
    try{
      if(typeof tryAbilities==='function'&&!tryAbilities._econAffix&&!ECON_GEAR_WRAPPED['tryAbilities_econAffix']){
        tryAbilities=markSkill(tryAbilities);tryAbilities._econAffix=1;ECON_GEAR_WRAPPED['tryAbilities_econAffix']=1;
      }
    }catch(e){}
    try{
      if(typeof castSpell==='function'&&!castSpell._econAffix&&!ECON_GEAR_WRAPPED['castSpell_econAffix']){
        castSpell=markSkill(castSpell);castSpell._econAffix=1;ECON_GEAR_WRAPPED['castSpell_econAffix']=1;
      }
    }catch(e){}
    try{
      if(typeof v158CastAb==='function'&&!v158CastAb._econAffix&&!ECON_GEAR_WRAPPED['v158CastAb_econAffix']){
        v158CastAb=markSkill(v158CastAb);v158CastAb._econAffix=1;ECON_GEAR_WRAPPED['v158CastAb_econAffix']=1;
      }
    }catch(e){}
    // 靈氣消耗（負向詞條）；施法期間用施術者，其餘退回玩家（UI 顯示）
    const costMul=function(){
      const u=_econCostU||(typeof player==='function'?player():null);
      const red=econGearQiCostRed(u);
      return Math.max(0,1-red);
    };
    try{
      if(typeof v158Cost==='function'&&!v158Cost._econAffix&&!ECON_GEAR_WRAPPED['v158Cost_econAffix']){
        const _vc=v158Cost;
        v158Cost=function(ab){return Math.round(_vc.apply(this,arguments)*costMul());};
        v158Cost._econAffix=1;ECON_GEAR_WRAPPED['v158Cost_econAffix']=1;
      }
    }catch(e){}
    try{
      if(typeof qiCostOf==='function'&&!qiCostOf._econAffix&&!ECON_GEAR_WRAPPED['qiCostOf_econAffix']){
        const _qc=qiCostOf;
        qiCostOf=function(ab){return Math.round(_qc.apply(this,arguments)*costMul());};
        qiCostOf._econAffix=1;ECON_GEAR_WRAPPED['qiCostOf_econAffix']=1;
      }
    }catch(e){}
    // 攻速：縮短近戰間隔
    try{
      if(typeof meleeHit==='function'&&!meleeHit._econAffix&&!ECON_GEAR_WRAPPED['meleeHit_econAffix']){
        const _mh=meleeHit;
        meleeHit=function(u,e){
          const r=_mh.apply(this,arguments);
          try{const p=wornOf(u);if(u&&p.atkSpd&&u.cd>0)u.cd=u.cd/(1+p.atkSpd/100);}catch(e2){}
          return r;
        };
        meleeHit._econAffix=1;ECON_GEAR_WRAPPED['meleeHit_econAffix']=1;
      }
    }catch(e){}
    // 技能冷卻：加速 acd 遞減
    try{
      if(typeof updateUnit==='function'&&!updateUnit._econAffix&&!ECON_GEAR_WRAPPED['updateUnit_econAffix']){
        const _uu=updateUnit;
        updateUnit=function(u,dt){
          const r=_uu.apply(this,arguments);
          try{
            const p=wornOf(u);
            if(p.skillCd>0&&u&&u.acd){
              const extra=dt*(p.skillCd/100);
              for(const k in u.acd)if(u.acd[k]>0)u.acd[k]=Math.max(0,u.acd[k]-extra);
            }
          }catch(e2){}
          return r;
        };
        updateUnit._econAffix=1;ECON_GEAR_WRAPPED['updateUnit_econAffix']=1;
      }
    }catch(e){}
    // 煉丹煉器：成功率／品質＋爐時
    try{
      if(typeof craftSkill==='function'&&!craftSkill._econAffix&&!ECON_GEAR_WRAPPED['craftSkill_econAffix']){
        const _cs=craftSkill;
        craftSkill=function(u,b){let s=_cs.apply(this,arguments);try{const p=wornOf(u);if(p.craft)s+=p.craft/100;}catch(e){}return s;};
        craftSkill._econAffix=1;ECON_GEAR_WRAPPED['craftSkill_econAffix']=1;
      }
    }catch(e){}
    try{
      if(typeof tickCraft==='function'&&!tickCraft._econAffix&&!ECON_GEAR_WRAPPED['tickCraft_econAffix']){
        const _tc=tickCraft;
        tickCraft=function(dt){
          try{
            if(typeof S!=='undefined'&&S&&S.buildings){
              for(let i=0;i<S.buildings.length;i++){
                const b=S.buildings[i];
                if(!b||!b.craft||!b.built||b.broken||b.craft._econAffixT)continue;
                const u=typeof bestCrafter==='function'?bestCrafter(b):null;
                const p=wornOf(u);
                if(p.craft>0&&b.craft.T>0){b.craft.T=b.craft.T/(1+p.craft/100);b.craft._econAffixT=1;}
              }
            }
          }catch(e){}
          return _tc.apply(this,arguments);
        };
        tickCraft._econAffix=1;ECON_GEAR_WRAPPED['tickCraft_econAffix']=1;
      }
    }catch(e){}
    // 掉落率：偏置共用 2% gate 的第一次 rnd
    try{
      if(typeof enemyItemDropPermit==='function'&&!enemyItemDropPermit._econAffix&&!ECON_GEAR_WRAPPED['enemyItemDropPermit_econAffix']){
        const _ep=enemyItemDropPermit;
        enemyItemDropPermit=function(e,ch){
          const act=dropActor(e);
          const p=wornOf(act);
          const mul=p.dropRate?1+p.dropRate/100:1;
          if(mul===1||typeof rnd!=='function')return _ep.apply(this,arguments);
          const _r=rnd;
          let used=0;
          rnd=function(){const x=_r.apply(this,arguments);if(!used){used=1;rnd=_r;return Math.min(0.999999,x/mul);}return x;};
          try{return _ep.apply(this,arguments);}finally{if(rnd!==_r)rnd=_r;}
        };
        enemyItemDropPermit._econAffix=1;ECON_GEAR_WRAPPED['enemyItemDropPermit_econAffix']=1;
      }
    }catch(e){}
    try{
      if(typeof rollDrops==='function'&&!rollDrops._econAffix&&!ECON_GEAR_WRAPPED['rollDrops_econAffix']){
        const _rd=rollDrops;
        rollDrops=function(e,cb){
          const act=dropActor(e);
          const p=wornOf(act);
          const mul=p.dropRate?1+p.dropRate/100:1;
          if(mul===1||typeof rnd!=='function')return _rd.apply(this,arguments);
          const _r=rnd;
          rnd=function(){return Math.min(0.999999,_r.apply(this,arguments)/mul);};
          try{return _rd.apply(this,arguments);}finally{rnd=_r;}
        };
        rollDrops._econAffix=1;ECON_GEAR_WRAPPED['rollDrops_econAffix']=1;
      }
    }catch(e){}
  }

  function attach(){
    try{
      if(typeof window==='undefined')return;
      window.XW_ECON=window.XW_ECON||{};
      const A=window.XW_ECON;
      A.econGearStats=econGearStats;
      A.econRollEnemyGear=econRollEnemyGear;
      A.econGearValue=econGearValue;
      A.gearStats=econGearStats;
      A.rollEnemyGear=econRollEnemyGear;
      A.gearValue=econGearValue;
      A.rollAffixes=rollAffixes;
      A.forgeQueueAdd=fqAddPub;
      A.forgeQueueDel=fqDelPub;
      A.forgeQueueSetN=fqSetNPub;
      A.forgeQueueKick=fqKickPub;
      A.forgeQueueTotal=queueTotalPub;
      A.forgeBatchCost=batchCostOf;
      A.gearKeysForRealm=keysForRealm;
      A.gearInstallCatalog=installCatalog;
      A.smithFeeOf=smithFeeOf;
      A.smithPay=smithPay;
      A.canSmithPay=canSmithPay;
      A.smithOnFinish=function(b,u){ /* 工錢在開爐時已收；此處保留鉤子 */ };
      A.SMITH_FEE_LV=ECON_SMITH_FEE_LV;
      A.SMITH_FEE_BASE=ECON_SMITH_FEE_BASE;
      A.SMITH_FEE_PER_LV=ECON_SMITH_FEE_PER_LV;
      A.SMITH_Q_SHIFT_PER_LV=ECON_SMITH_Q_SHIFT_PER_LV;
      A.SMITH_Q_SHIFT_CAP=ECON_SMITH_Q_SHIFT_CAP;
      A.ENEMY_GEAR_DROP=ECON_ENEMY_GEAR_DROP;
      A.AFFIX_DEFS=AFFIX_DEFS;
      A.AFFIX_Q_SCALE=ECON_AFFIX_Q_SCALE;
      A.QI_WORD=QI_WORD;
      A.ECON_AFFIX_COUNT=ECON_AFFIX_COUNT;
      A.ECON_TRIB_BODY_CAP=ECON_TRIB_BODY_CAP;
      A.ECON_LEECH_BODY_CAP=ECON_LEECH_BODY_CAP;
      A.ECON_QICOST_BODY_CAP=ECON_QICOST_BODY_CAP;
      A.econGearTribRed=econGearTribRed;
      A.econGearLeech=econGearLeech;
      A.econGearQiCostRed=econGearQiCostRed;
      A.econGearWornPct=econGearWornPct;
      A.rollAffixes=rollAffixes;
      A.tribBand=tribBand;
      A.isTribAffix=isTribAffix;
      A.slot16NewKinds=NEW_KINDS.slice();
      A.slot16NewSlot=Object.assign({},NEW_SLOT);
      A.slot16Ratio=Object.assign({},NEW_RATIO);
      A.slot16NewEntry=newKindEntry;
      A.slot16NewIds=function(){const o=[];for(let r=0;r<=NEW_MAX_REALM;r++)for(const k of NEW_KINDS)o.push(gearId(r,k));return o;};
      window.econGearTribRed=econGearTribRed;
      window.econGearLeech=econGearLeech;
      window.econGearQiCostRed=econGearQiCostRed;
      window.econGearWornPct=econGearWornPct;
      if(typeof window.econGearStats!=='function')window.econGearStats=econGearStats;
      if(typeof window.econRollEnemyGear!=='function')window.econRollEnemyGear=econRollEnemyGear;
      if(typeof window.econGearValue!=='function')window.econGearValue=econGearValue;
      if(window.XW)window.XW.econ=A;
    }catch(e){}
  }
  attach();
  try{
    if(typeof setTimeout==='function'){
      setTimeout(function(){attach();install();},0);
      setTimeout(function(){install();installCatalog();},80);
      setTimeout(function(){install();},400);
      setTimeout(function(){install();},1200);
    }else install();
  }catch(e){}
})();

// ================== 仙武經濟：第④輪 新裝備表 gearV2（2026-11-11）==================
// 規格：specs/gear_tables_20261110/CONVERSION_SPEC.md。旗標預設開；?gearv2=0／S.econ.flags.gearV2=false／window.ECON_GEARV2_FORCE=false 全部回舊表。
// 不放進 ECON_FLAGS_DEFAULT（g23 ?dev=1 會把該表全設 true）。目錄（GEAR）不論旗標都裝，讓存檔裡已有的新裝備仍顯示名稱、主屬性照舊（數值存在物品上）；
// 旗標關時：不進鍛造／掉落，固定次要與套裝效果、新表全身上限都不生效，詞條照舊 4 條規則（已存詞條不改）。
var ECON_GEARV2_DEFAULT=true;
function econGearV2On(){
  try{if(typeof window!=='undefined'&&typeof window.ECON_GEARV2_FORCE==='boolean')return window.ECON_GEARV2_FORCE;}catch(e){}
  try{if(typeof location!=='undefined'&&location.search){const m=/[?&]gearv2=([01])/.exec(location.search);if(m)return m[1]==='1';}}catch(e){}
  try{if(typeof S!=='undefined'&&S&&S.econ&&S.econ.flags&&S.econ.flags.gearV2!=null)return !!S.econ.flags.gearV2;}catch(e){}
  return !!ECON_GEARV2_DEFAULT;
}
// 資料：[編號,名稱,kind,境界r,[遊戲版次要]]；套裝 [編號,套名,階,[頭,胸,手,褲,鞋],[2件欄位],[5件欄位]]。名稱已套 SPEC 第5節必換。
var ECON_GEARV2_DATA={"acc":[["1","狼牙護身吊墜","necklace",0,["hpPct"]],["2","粗鐵指環","ring",0,["crit"]],["3","辟邪木符","pendant",0,["defPct","dodge"]],["4","熟銅手鐲","bracelet",0,["defPct","hpPct"]],["5","淬火石珠","orb",0,["crit","atkPct"]],["6","鑌鐵鏈項鍊","necklace",1,["atkPct"]],["7","狂暴鋼戒","ring",1,["crit","atkPct"]],["8","翠玉護心佩","pendant",1,["hpPct","gang"]],["9","風行銅環","bracelet",1,["move","atkSpd"]],["10","烈焰瑪瑙珠","orb",1,["qiSkillAtk","critDmg"]],["11","怒獅金骨項鍊","necklace",2,["atkPct","defPct"]],["12","血煞戒","ring",2,["leech","atkPct"]],["13","寒鐵沉香佩","pendant",2,["defPct","hpPct"]],["14","疾風鐵手環","bracelet",2,["atkSpd","dodge"]],["15","星芒石寶珠","orb",2,["crit","atkPct"]],["16","宗師紫金鏈","necklace",3,["atkPct"]],["17","乾坤扳指","ring",3,["crit","critDmg"]],["18","龍鳳雙喜玉佩","pendant",3,["hpPct","defPct"]],["19","白玉金剛手鐲","bracelet",3,["dodge","defPct"]],["20","降魔定神珠","orb",3,["qiMax"]],["21","聚靈紫竹吊墜","necklace",4,["qiMax","qiSkillAtk"]],["22","清風流雲戒","ring",4,["qiSkillAtk","skillCd"]],["23","養魂溫玉佩","pendant",4,["qiRegen","qiSkillAtk"]],["24","寒潭碧水手環","bracelet",4,["qiSkillAtk"]],["25","迅雷引雷珠","orb",4,["qiSkillAtk"]],["26","築基紫雲項鍊","necklace",5,["qiCost","qiSkillAtk"]],["27","赤炎飛天戒","ring",5,["crit","atkPct"]],["28","凝霜琉璃玉佩","pendant",5,["qiSkillAtk","atkPct"]],["29","百花九香手環","bracelet",5,["hpPct","qiSkillAtk"]],["30","蒼龍氣勁珠","orb",5,["atkPct","qiSkillAtk"]],["31","金丹大道項鍊","necklace",6,["atkPct","qiSkillAtk"]],["32","紫霄雷霆戒","ring",6,["qiSkillAtk","critDmg"]],["33","太極陰陽玉佩","pendant",6,["atkPct","defPct"]],["34","星辰隕鐵手環","bracelet",6,["defPct","hpPct"]],["35","萬毒噬心珠","orb",6,["atkPct","leech"]],["36","元嬰出竅項鍊","necklace",7,["atkPct","qiSkillAtk"]],["37","脩羅血獄戒指","ring",7,["leech","atkPct"]],["38","九天玄女玉佩","pendant",7,["qiSkillAtk","skillCd"]],["39","不動明王手環","bracelet",7,["defPct","hpPct"]],["40","大日金烏寶珠","orb",7,["qiSkillAtk","atkPct"]],["41","化神大道項鍊","necklace",8,["skillCd","atkPct"]],["42","荒古帝威戒指","ring",8,["atkPct","crit"]],["43","幽冥閻羅玉佩","pendant",8,["qiSkillAtk","atkPct"]],["44","蝕日墨蓮手環","bracelet",8,["gang","leech"]],["45","列宿星輝珠","orb",8,["crit","critDmg"]],["46","仙武至尊項鍊","necklace",10,["atkPct","hpPct"]],["47","鴻蒙無上戒指","ring",10,["crit","atkPct"]],["48","萬劫天道玉佩","pendant",10,["defPct","hpPct"]],["49","狂魔屠神手環","bracelet",10,["atkPct","critDmg"]],["50","仙武歸元珠","orb",10,["qiCost","atkPct"]],["H1","合元鎖靈鏈","necklace",9,["atkPct","crit"]],["H2","雙儀合契戒","ring",9,["crit","critDmg"]],["H3","歸一凝體佩","pendant",9,["hpPct","gang"]],["H4","同心鎮脈鐲","bracelet",9,["defPct","hpPct"]],["H5","合道星輝珠","orb",9,["qiSkillAtk","skillCd"]]],"wep":[[1,"木質練習劍","sword",0,["atkPct"]],[2,"粗鐵長槍","spear",0,["crit"]],[3,"鐵皮護手","fist",0,["atkSpd"]],[4,"獵戶重弓","bow",0,["crit","move"]],[5,"精鐵菜刀","dagger",0,["atkPct","crit"]],[6,"生鐵大棒","blunt",0,["atkPct"]],[7,"淬火短劍","sword",0,["crit"]],[8,"鑌鐵環首刀","saber",1,["atkPct"]],[9,"百鍊鋼槍","spear",1,["dodge","defPct"]],[10,"熟銅雙鐧","blunt",1,["atkPct"]],[11,"精鋼刺爪","fist",1,["atkSpd","leech"]],[12,"風行雙刃","dagger",1,["move","crit"]],[13,"寒鐵護臂","fist",1,["defPct"]],[14,"破風鐵長弓","bow",1,["crit"]],[15,"怒火重斬刀","saber",2,["critDmg"]],[16,"覆鐵霸王槍","spear",2,["atkPct"]],[17,"狼牙流星錘","blunt",2,["atkPct"]],[18,"淬毒暗影匕","dagger",2,["critDmg","atkPct"]],[19,"玄鐵巨盾劍","sword",2,["defPct","dodge"]],[20,"疾風鐵骨扇","dagger",2,["atkSpd","dodge"]],[21,"龍筋強木弓","bow",2,["atkPct"]],[22,"宗師紫金劍","sword",3,["qiSkillAtk"]],[23,"撼山金剛棍","spear",3,["defPct","hpPct"]],[24,"裂岳大刀","saber",3,["atkPct"]],[25,"修羅血煞爪","fist",3,["leech","atkPct"]],[26,"乾坤雙輪","blunt",3,["defPct","atkPct"]],[27,"破空追魂弩","bow",3,["crit","critDmg"]],[28,"宗師降魔杵","blunt",3,["defPct"]],[29,"紫竹聚靈法杖","staff",4,["qiRegen"]],[30,"辟邪桃木仙劍","sword",4,["qiSkillAtk"]],[31,"清風流雲扇","staff",4,["qiSkillAtk","move"]],[32,"烈火溫養葫蘆","staff",4,["qiSkillAtk","qiMax"]],[33,"寒潭碧水珠","staff",4,["qiSkillAtk"]],[34,"玄木滋養杖","staff",4,["hpPct","qiSkillAtk"]],[35,"厚土鎮岳印","staff",4,["defPct","hpPct"]],[36,"迅雷引雷針","dagger",4,["qiSkillAtk"]],[37,"築基紫雲劍","sword",5,["qiCost","qiSkillAtk"]],[38,"赤炎飛天刀","dagger",5,["crit","atkPct"]],[39,"凝霜琉璃刺","fist",5,["qiSkillAtk","atkPct"]],[40,"金剛伏魔杵","blunt",5,["atkPct","qiSkillAtk"]],[41,"百花九香鈴","staff",5,["qiSkillAtk","atkPct"]],[42,"墨玉毒蛇劍","sword",5,["atkPct","dodge"]],[43,"蒼龍氣勁槍","spear",5,["atkPct","move"]],[44,"聚靈星芒陣旗","staff",5,["skillCd","qiSkillAtk"]],[45,"金丹大道劍","sword",6,["atkPct","qiSkillAtk"]],[46,"紫霄雷霆錘","blunt",6,["qiSkillAtk","critDmg"]],[47,"赤焰蓮心法杖","staff",6,["qiSkillAtk","atkPct"]],[48,"萬毒噬心葫蘆","staff",6,["leech","atkPct"]],[49,"太極陰陽雙爻劍","sword",6,["atkPct"]],[50,"星辰隕鐵重劍","sword",6,["atkPct","defPct"]],[51,"幻影千殺暗刃","dagger",6,["crit","critDmg"]],[52,"巨靈鎮海盾","blunt",6,["defPct","gang"]],[53,"元嬰出竅法劍","sword",7,["atkPct","qiSkillAtk"]],[54,"四野獨步魔槍","spear",7,["atkPct"]],[55,"脩羅血獄狂刀","saber",7,["leech","atkPct"]],[56,"九天玄女羽扇","staff",7,["qiSkillAtk","skillCd"]],[57,"不動明王金剛尊","blunt",7,["hpPct","defPct"]],[58,"大日金烏焚天劍","sword",7,["atkPct","atkSpd"]],[59,"虛空破滅斷空刃","dagger",7,["critDmg"]],[60,"化神天地大道杖","staff",8,["qiCost","qiSkillAtk"]],[61,"荒古帝威重槍","spear",8,["atkPct","crit"]],[62,"幽冥閻羅招魂幡","staff",8,["qiSkillAtk","leech"]],[63,"蝕日墨蓮鎮台","staff",8,["gang","leech"]],[64,"列宿星圖","staff",8,["crit","qiSkillAtk"]],[65,"萬劫天劫雷霆錘","blunt",8,["tribRed","defPct"]],[66,"輪迴生死環","staff",8,["atkPct","leech"]],[67,"神魔同體交織刃","dagger",9,["atkPct","qiSkillAtk"]],[68,"太初元氣劍","sword",9,["atkPct","atkSpd"]],[69,"混沌開天闢地斧","blunt",9,["atkPct"]],[70,"長生不朽造化杖","staff",9,["hpPct"]],[71,"屠神滅佛逆天刀","saber",9,["crit","critDmg"]],[72,"陰陽太極萬法鏡","staff",9,["defPct","gang"]],[73,"蒼龍破空神威戟","spear",9,["atkPct","critDmg"]],[74,"仙武至尊乾坤劍","sword",10,["atkPct","hpPct"]],[75,"開天闢地始源槍","spear",10,["atkPct"]],[76,"鴻蒙無上道尊杖","staff",10,["qiSkillAtk","skillCd"]],[77,"萬劫天道輪迴印","staff",10,["tribRed","qiSkillAtk"]],[78,"蝕日墨蓮歸元台","staff",10,["leech","gang"]],[79,"狂魔屠神逆天刃","saber",10,["atkSpd","crit","critDmg"]],[80,"仙武終極混元珠","staff",10,["qiCost","atkPct"]]],"sets":[[1,"鐵骨金身",1,["鐵骨盔","鑌鐵鎧","鐵勁手","鑌鐵褲","鑄鐵履"],["defPct","hpPct"],["gang","defPct"]],[2,"清風靈動",1,["清風冠","清風道袍","清風護腕","清風道褲","疾風履"],["move","dodge"],["crit","qiRegen"]],[3,"烈陽剛勁",1,["烈陽冠","烈陽戰甲","烈陽護臂","烈陽長褲","赤足履"],["atkPct","defPct"],["crit","atkPct"]],[4,"寒潭碧水",1,["碧水帽","碧水長衫","護水腕","碧水綢褲","踏波履"],["qiMax","qiSkillAtk"],["qiSkillAtk","skillCd"]],[5,"蠻牛霸體",1,["蠻牛角盔","蠻牛皮甲","蠻牛皮手套","蠻牛護腿","牛筋靴"],["hpPct","defPct"],["gang","hpPct"]],[6,"迅雷流光",1,["迅雷冠","迅雷勁裝","迅雷護手","迅雷勁褲","奔雷靴"],["atkSpd","qiSkillAtk"],["critDmg","atkSpd"]],[7,"玄木滋養",1,["綠藤冠","玄木藤甲","生木護手","玄木長褲","踏青鞋"],["hpPct","qiRegen"],["gang","hpPct"]],[8,"厚土沉重",2,["磐石冠","厚土重鎧","石護手","厚土長褲","踏石靴"],["defPct","hpPct"],["defPct","gang"]],[9,"血煞穿心",2,["血煞面具","血煞胸甲","血煞爪套","血煞束腿","血踏靴"],["crit","leech"],["critDmg","skillCd"]],[10,"百鍊罡氣",2,["罡氣帽","百鍊道袍","罡氣護臂","百鍊長褲","雲履"],["gang","defPct"],["gang","qiSkillAtk"]],[11,"九幽陰風",2,["幽冥冠","九幽羽衣","陰風護手","九幽綢褲","冥步履"],["dodge","move"],["dodge","critDmg"]],[12,"紫霄正雷",2,["紫霄道冠","紫霄雷甲","正雷護手","紫霄法褲","踏雷靴"],["critDmg","qiSkillAtk"],["crit","atkPct"]],[13,"赤蓮焚心",2,["赤蓮法冠","焚心法袍","赤蓮腕甲","焚心長褲","焚天靴"],["qiSkillAtk","atkPct"],["qiSkillAtk","critDmg"]],[14,"玄冰凝霜",2,["凝霜冠","冰心琉璃鎧","霜華護手","凝霜長褲","踏雪靴"],["qiSkillAtk","skillCd"],["atkPct","crit"]],[15,"金剛不壞",3,["羅漢帽","金剛袈裟","羅漢護腕","金剛束腿","無痕履"],["hpPct","defPct"],["gang","atkPct"]],[16,"幻影千殺",3,["影流面具","夜行暗甲","千殺刃套","影流長褲","無聲靴"],["critDmg","atkSpd"],["crit","dodge"]],[17,"天靈共鳴",3,["聚靈冠","天靈法衫","共鳴護手","天靈綢褲","雲遊靴"],["skillCd","qiRegen"],["qiSkillAtk","qiCost"]],[18,"噬魂毒煞",3,["萬毒冠","噬魂毒藤甲","毒煞護手","萬毒長褲","踏毒履"],["atkPct","leech"],["atkSpd","critDmg"]],[19,"星辰隕鐵",3,["星芒冠","星辰重鎧","隕鐵護臂","星辰長褲","踏星靴"],["defPct","hpPct"],["gang","defPct"]],[20,"蒼龍出海",3,["龍角冠","龍鱗戰甲","龍爪護手","龍鱗綁腿","游龍靴"],["atkPct","move"],["atkSpd","crit"]],[21,"太極陰陽",3,["陰陽道冠","太極道袍","陰陽雙爻手","太極法褲","凌雲靴"],["atkPct","defPct"],["leech","atkPct"]],[22,"四野霸主",4,["帝王冠","四野皇袍","獨尊護臂","四野戰褲","御天靴"],["atkPct","critDmg"],["crit","atkPct"]],[23,"脩羅血獄",4,["脩羅面具","血獄戰甲","殺戮爪套","血獄長褲","踏血履"],["crit","critDmg"],["leech","atkPct"]],[24,"九天玄女",4,["霓裳冠","玄女羽衣","織雲護手","霓裳羽褲","凌波靴"],["qiSkillAtk","qiRegen"],["qiSkillAtk","skillCd"]],[25,"不動明王",4,["明王冠","不動尊鎧","金剛怒目手","不動明王褲","鎮魔靴"],["hpPct","gang"],["defPct","atkPct"]],[26,"大日金烏",4,["太陽冠","金烏羽鎧","扶桑護手","金烏長褲","踏日靴"],["qiSkillAtk","atkPct"],["atkSpd","qiSkillAtk"]],[27,"虛空破滅",4,["裂空面具","虛空長袍","破滅護手","虛空法褲","破虛靴"],["atkPct","crit"],["critDmg","atkPct"]],[28,"萬法歸一",4,["萬法冠","無極道袍","歸一護手","無極法褲","踏法履"],["skillCd","qiCost"],["qiSkillAtk","skillCd"]],[29,"荒古戰帝",5,["荒古冠","戰帝重鎧","帝威護手","戰帝腿甲","踏天靴"],["atkPct","hpPct"],["critDmg","defPct"]],[30,"幽冥閻羅",5,["閻羅冠","黃泉死魔甲","判官護手","黃泉長褲","踏冥履"],["qiSkillAtk","leech"],["atkPct","crit"]],[31,"混沌開天",5,["混沌始源冠","開天神魔鎧","破曉護手","始源神褲","踏虛靴"],["atkPct","qiSkillAtk"],["critDmg","crit"]],[32,"太初道尊",5,["太初道冠","無上太初袍","元氣護手","太初法褲","逍遙靴"],["skillCd","qiMax"],["qiSkillAtk","gang"]],[33,"神魔同體",5,["神魔雙面冠","神怒魔劫鎧","交織護手","神魔長褲","踏界靴"],["atkPct","crit"],["leech","qiSkillAtk"]],[34,"蝕日墨蓮",5,["蝕日墨冠","墨蓮魔鎧","毀滅護爪","墨蓮魔褲","踏滅靴"],["atkPct","leech"],["gang","leech"]],[35,"諸天星宿",6,["列宿星冠","星宿天衣","二十八宿手","星宿長褲","巡星靴"],["crit","critDmg"],["qiSkillAtk","critDmg"]],[36,"不朽仙尊",6,["長生冠","不朽仙袍","造化護手","長生法褲","踏仙履"],["hpPct","gang"],["hpPct","defPct"]],[37,"萬劫陰陽",6,["劫波冠","渡劫魔鎧","萬劫護手","劫波長褲","渡劫靴"],["defPct","tribRed"],["gang","hpPct"]],[38,"大輪迴術",6,["輪迴法冠","六道輪迴袍","生死護手","輪迴綢褲","踏輪履"],["qiSkillAtk","leech"],["atkPct","skillCd"]],[39,"屠神滅佛",6,["戮神冠","狂魔逆天鎧","屠魔爪套","逆天戰褲","踏神靴"],["atkPct","crit"],["critDmg","atkPct"]],[40,"仙武至尊",6,["仙武極道冠","仙武帝尊鎧","至尊乾坤手","仙武帝尊褲","踏天至尊靴"],["atkPct","hpPct"],["defPct","leech"]]]};
(function(){
  const D=ECON_GEARV2_DATA;
  // g27 境界基準（SPEC 2.2）：A 攻、H 血；KA/KH 上限係數。合體 KH=0.20（血 +8%，隊長定案）。11 天仙預留不開放。
  const A=[30,125,185,270,385,525,700,950,1300,1750,2300,2600];
  const H=[3600,5500,6700,8400,10700,13500,17000,22000,29000,38000,41000,50000];
  const KA=[1,1,1,1,0.88,0.80,0.85,0.88,0.82,0.75,1,1];
  const KH=[1,0.53,0.60,0.65,0.62,0.62,0.70,0.75,0.72,0.20,1,1];
  const SEC_BASE={crit:1.5,critDmg:5,atkSpd:2,move:2,skillCd:2,dodge:1,leech:0.3,qiMax:3,qiRegen:3,qiCost:-2,qiSkillAtk:3,atkPct:1.5,hpPct:1.5,defPct:3,gang:3,tribRed:0.1,cultSpd:2,breakSucc:0.5};
  const SET_V={atkPct:[2,3.5],hpPct:[2,3.5],defPct:[5,8],crit:[3,4],critDmg:[8,12],dodge:[2,3],move:[5,7],atkSpd:[4,6],skillCd:[4,6],qiMax:[6,10],qiRegen:[6,10],qiCost:[-4,-6],leech:[0.8,1.2],gang:[6,10],qiSkillAtk:[4,6],tribRed:[0.3,0.5]};
  const TIER_M=[0,1.0,1.1,1.2,1.3,1.4,1.5];
  const KIND_SEC={sword:'crit',saber:'critDmg',spear:'move',fist:'atkSpd',bow:'crit',dagger:'atkSpd',blunt:'defPct',staff:'qiSkillAtk'};
  const KIND_N={sword:'劍',saber:'刀',spear:'槍',fist:'拳套',bow:'弓',dagger:'短刃',blunt:'鈍器',staff:'法杖',necklace:'項鍊',ring:'戒指',pendant:'玉佩',bracelet:'手鐲',orb:'寶珠'};
  const ACC_MAIN={necklace:{atk:0.04},ring:{atk:0.04},orb:{atk:0.03},pendant:{hp:0.05},bracelet:{hp:0.04,def:0.03}};
  // 頭胸手褲鞋：[kind,slot,血係數,防係數,材料倍率]
  const PART=[['head','hd',0.04,0.06,0.5],['armor','a',0.06,0.09,1],['hands','hn',0.025,0.04,0.35],['pants','pt',0.05,0.07,0.6],['shoes','sh',0.025,0.04,0.35]];
  const PART_N={head:'頭',armor:'胸',hands:'手',pants:'褲',shoes:'鞋'};
  const SET_SLOTS=['hd','a','hn','pt','sh'];
  const AFFIX_N=2;                 // 新裝備隨機詞條 2 條（SPEC 2.4）；舊裝備仍 4 條
  const Q_SCALE=[0.75,0.90,1.00,1.12,1.18,1.25]; // 凡品…仙器（沿用詞條品質縮放，不乘舊 QMUL）
  const SET_FORGE=(function(){try{return !/[?&]gv2setforge=0\b/.test(location.search);}catch(e){return true;}})(); // 套裝件可鍛造（鍛造坊 Lv2）；待隊長定，?gv2setforge=0 改只掉落
  const KEY_N={crit:'暴擊率',critDmg:'暴擊傷害',atkSpd:'攻速',move:'移動速度',skillCd:'技能冷卻',dodge:'閃避',leech:'吸血',qiMax:'靈氣上限',qiRegen:'靈氣回復',qiCost:'靈氣消耗',qiSkillAtk:'靈氣技能攻擊',atkPct:'攻擊力',hpPct:'氣血',defPct:'防禦力',gang:'罡氣',tribRed:'雷劫減傷',cultSpd:'修煉速度',breakSucc:'突破成功率'};
  const REALM_N=['武徒','武師','大武師','宗師','煉氣','築基','金丹','元嬰','化神','合體','地仙','天仙'];
  // F-073 裝備品級（11-11 08:36 改為「每件各自帶品級」）：物品欄位 it.gr（1 下品…5 仙品），與詞條品質（凡品…仙器）分開。
  // 每件：最終＝(基礎＋品級加值)×品級乘數。加值依「物品境界＋境界內順序」在品級區間內線性（不隨機，不另存）；
  // 品級原生境界以下取下限、以上取上限。武徒歸下品、取下限 100。仙品 5000 固定。
  const GRADES=[
    {n:'下品',mul:1,lo:100,hi:300,r0:1,r1:4},
    {n:'中品',mul:1.05,lo:500,hi:1000,r0:5,r1:6},
    {n:'上品',mul:1.10,lo:1200,hi:2200,r0:7,r1:8},
    {n:'極品',mul:1.15,lo:2500,hi:4000,r0:9,r1:10},
    {n:'仙品',mul:1.20,lo:5000,hi:5000,r0:11,r1:11} // mul 僅後備；實際改由 xianSubMul 取代
  ];
  const qs=function(re){try{return re.test(location.search);}catch(e){return false;}};
  const GRADE_ON=!qs(/[?&]gv2grade=0\b/);  // ?gv2grade=0：品級整個關（不寫欄位、不加值、不乘、不顯示）
  const GMUL_ON=!qs(/[?&]gv2gmul=0\b/);    // ?gv2gmul=0：只關乘數（加值仍在）；使用者 08:40 已確認要乘，預設開
  function gradeIdx(r,top){if(top)return 4;r=r|0;return r<=4?0:r<=6?1:r<=8?2:3;}
  function rn(r){try{if(typeof REALMS!=='undefined'&&REALMS[r]&&REALMS[r].n)return REALMS[r].n;}catch(e){}return REALM_N[r]||('境'+r);}
  const r1=v=>Math.round(v*10)/10, r2=v=>Math.round(v*100)/100;
  function tierOf(r){r=r|0;return r>=10?6:1+Math.floor(Math.max(0,r)/2);}
  function tierLabel(t){return t===6?rn(10):rn((t-1)*2)+'～'+rn((t-1)*2+1);}
  function secVal(k,r,isW){return r2(SEC_BASE[k]*(1+r/10)*(isW?1.5:1));}
  function baseCost(r,kind,GO){
    let row=null;try{const S0=GO||((typeof GEAR!=='undefined'&&GEAR)?GEAR:{});const g=S0['eg'+Math.min(6,r)+'_'+kind];if(g&&g.cost)row=g.cost;}catch(e){}
    if(!row)row=kind==='pendant'?{stone:6,lingshi:3}:kind==='armor'?{hide:5,iron:3}:{iron:6,wood:2};
    const m=r>6?Math.pow(1.27,r-6):1,o={};for(const k in row)o[k]=Math.max(1,Math.ceil(row[k]*m));return o;
  }
  function mulCost(c,m){const o={};for(const k in c)o[k]=Math.max(1,Math.ceil(c[k]*m));return o;}
  const CAT={};const BY_REALM={w:{},c:{},s:{}};const SETS={};
  function push(cat,r,id){(BY_REALM[cat][r]=BY_REALM[cat][r]||[]).push(id);}
  // 武器：q 0.85→1.00，依原文編號在境界內平均分配
  (function(){
    const g={};D.wep.forEach(x=>{(g[x[3]]=g[x[3]]||[]).push(x);});
    for(const r in g){const L=g[r];L.forEach((x,i)=>{
      const rr=+r,q=r2(0.85+0.15*(L.length>1?i/(L.length-1):1)),kind=x[2];
      const sec=[];const add=k=>{if(!sec.some(s=>s[0]===k))sec.push([k,secVal(k,rr,1)]);};
      add(KIND_SEC[kind]);x[4].forEach(add);
      const id='gw'+rr+'_'+x[0];
      CAT[id]={n:x[1],slot:'w',atk:r1(A[rr]*0.18*q*KA[rr]),hp:0,def:0,spd:0,cost:{},_cs:['sword',0.9+0.2*(q-0.85)/0.15],realm:rr,
        desc:KIND_N[kind]+'（'+rn(rr)+'・新表）',econSet:1,gv2:{t:'w',kind:kind,q:q,no:x[0],sec:sec}};
      push('w',rr,id);
    });}
  })();
  // 飾品：q 0.92→1.00；主屬性依 kind；寶珠另 +靈氣上限 3%
  (function(){
    const g={};D.acc.forEach(x=>{(g[x[3]]=g[x[3]]||[]).push(x);});
    for(const r in g){const L=g[r];L.forEach((x,i)=>{
      const rr=+r,q=r2(0.92+0.08*(L.length>1?i/(L.length-1):1)),kind=x[2],M=ACC_MAIN[kind]||{};
      const sec=[];x[4].forEach(k=>{const v=secVal(k,rr,0);const s=sec.find(s=>s[0]===k);if(s)s[1]=r2(s[1]+v);else sec.push([k,v]);});
      if(kind==='orb'){const s=sec.find(s=>s[0]==='qiMax');if(s)s[1]=r2(s[1]+3);else sec.push(['qiMax',3]);}
      const id='ga'+rr+'_'+String(x[0]).toLowerCase();
      CAT[id]={n:x[1],slot:'c',atk:M.atk?r1(A[rr]*M.atk*q*KA[rr]):0,hp:M.hp?Math.round(H[rr]*M.hp*q*KH[rr]):0,def:M.def?r1(A[rr]*M.def*q*KA[rr]):0,spd:0,
        cost:{},_cs:['pendant',1],realm:rr,desc:KIND_N[kind]+'（'+rn(rr)+'・新表）',econSet:1,gv2:{t:'c',kind:kind,q:q,no:x[0],sec:sec}};
      push('c',rr,id);
    });}
  })();
  // 套裝：每 2 境一階；同套在階內兩境各一版件（地仙階只 r10）
  D.sets.forEach(s=>{
    const no=s[0],tier=s[2],realms=tier===6?[10]:[(tier-1)*2,(tier-1)*2+1];
    SETS[no]={no:no,n:s[1],tier:tier,m:TIER_M[tier],pieces:s[3],e2:s[4],e5:s[5],ids:[]};
    realms.forEach(rr=>{PART.forEach((p,pi)=>{
      const id='gs'+no+'_'+p[0]+'_'+rr;
      CAT[id]={n:s[3][pi],slot:p[1],atk:0,hp:Math.round(H[rr]*p[2]*KH[rr]),def:r1(A[rr]*p[3]*KA[rr]),defSpec:r1(A[rr]*p[3]*KA[rr]),spd:p[0]==='shoes'?r2(0.03+0.005*rr):0,
        cost:{},_cs:['armor',p[4]*1.2],realm:rr,lv:2,desc:'【'+s[1]+'】'+PART_N[p[0]]+'（'+rn(rr)+'・'+tierLabel(tier)+'套）',econSet:1,
        gv2:{t:'s',kind:p[0],q:1,setId:no,part:p[0],sec:[]}};
      SETS[no].ids.push(id);push('s',rr,id);
    });});
  });
  // 境界內順序 ord（0→1）：武器／飾品照原編號；套件照套號（同套 5 部位同序）
  (function(){
    ['w','c'].forEach(cat=>{for(const r in BY_REALM[cat]){const L=BY_REALM[cat][r];L.forEach((id,i)=>{CAT[id].gv2.ord=L.length>1?i/(L.length-1):0;});}});
    for(const r in BY_REALM.s){const L=BY_REALM.s[r];const sets=[];L.forEach(id=>{const n=CAT[id].gv2.setId;if(sets.indexOf(n)<0)sets.push(n);});
      L.forEach(id=>{const k=sets.indexOf(CAT[id].gv2.setId);CAT[id].gv2.ord=sets.length>1?k/(sets.length-1):0;});}
  })();
  // 可調表（常數物件）：品級出現權重（下品→上古）、各境界品級上限（null＝不設）、武器／飾品加值換算
  const GRADE_TUNE=(typeof window!=='undefined'&&window.ECON_GEARV2_GRADE_TUNE)||{
    // 權重（%）：下品／中品／上品／極品／上古；低品多、高品稀有。xtl＝地仙圓滿／踏仙梯來源（由 cult 呼叫）必出上古
    weight:{forge:[55,28,12,4.5,0.5],drop:[60,26,10,3.6,0.4],xtl:[0,0,0,0,100]},
    // 「仙品」是品級（gr=5，11-11 使用者改名，原稱上古至寶），不是「至寶」特殊物品（slot z，新地圖端）。
    // topMinRealm：物品境界 < 此值時擲不出仙品品級（所有來源）。元嬰＝7（使用者 11-11 定：元嬰以下最高極品；0＝不限／11＝只有地仙圓滿來源）。
    // src='xtl'（地仙圓滿／踏仙梯來源）一律當境界 11 算。
    topMinRealm:7,
    // realmCap：額外的「物品境界→最高品級（1–5）」表，擲骰時封頂；預設 null＝不封頂（下品～極品不照境界封頂）。
    realmCap:null,
    armorSlots:['hd','a','hn','pt','sh'],
    wcDefShare:0.10,        // 待確認：武器／飾品的品級加值以 10% 加在防禦（攻／血不受品級加值，KA/KH 上限不動）
    oldBonus:false,         // 待確認：舊目錄裝備只補品級欄位與顯示，不加值不乘（10:19：加值維持；倍率改套所有帶 gr 的裝備）
    xianMergeTarget:0,
    xianMergeWeight:0.5,
    xianSub:[70,25,5],
    xianSubNames:['下品','中品','上品'],
    xianSubMul:[1.5,1.75,2],
    legacyXianMul:false     // 隊長定：維持 false、不加存檔欄位；無法逐件區分新舊仙品
  };
  try{if(typeof window!=='undefined')window.ECON_GEARV2_GRADE_TUNE=GRADE_TUNE;}catch(e){}
  (function fillLqSureTune(){
    const T=GRADE_TUNE;
    T.weight=T.weight||{};
    if(!T.weight.lqsure)T.weight.lqsure=[58.5,28,12,1,0.5];
    if(T.xianMergeTarget==null)T.xianMergeTarget=0;
    if(T.xianMergeWeight==null)T.xianMergeWeight=0.5;
    if(!T.xianSub)T.xianSub=[70,25,5];
    if(!T.xianSubNames)T.xianSubNames=['下品','中品','上品'];
    if(!T.xianSubMul)T.xianSubMul=[1.5,1.75,2];
    if(T.legacyXianMul==null)T.legacyXianMul=false;
  })();
  function gearRealmOf(it){try{if(it.realm!=null&&isFinite(it.realm))return it.realm|0;}catch(e){}try{const g=(typeof GEAR!=='undefined'&&GEAR)?GEAR[it.t]:null;if(g&&g.realm!=null)return g.realm|0;}catch(e){}return CAT[it.t]?CAT[it.t].realm:0;}
  function defaultGr(r){return gradeIdx(r)+1;}
  function isGear(it){if(!it||!it.t||typeof it.t!=='string')return false;if(CAT[it.t])return true;try{const g=(typeof GEAR!=='undefined'&&GEAR)?GEAR[it.t]:null;return !!(g&&g.slot&&it.slot);}catch(e){return false;}}
  function gradeOn(){return econGearV2On()&&GRADE_ON;}
  function lqSureFeatOn(){
    try{const A=typeof window!=='undefined'&&window.XW_ECON;if(A&&typeof A.lqSureOn==='function')return A.lqSureOn();}catch(e){}
    try{if(typeof location!=='undefined'){const m=/[?&]lqsure=([01])\b/.exec(location.search);if(m)return m[1]==='1';}}catch(e){}
    return true;
  }
  function mergeXianWeight(w){
    w=w.slice();
    const ti=GRADE_TUNE.xianMergeTarget!=null?GRADE_TUNE.xianMergeTarget:0;
    const add=GRADE_TUNE.xianMergeWeight!=null?+GRADE_TUNE.xianMergeWeight:(w[4]||0);
    if(ti>=0&&ti<=3){w[ti]=(w[ti]||0)+add;w[4]=0;}
    else w[4]=0;
    return w;
  }
  // 14:09 使用者「一當下選擇武器境界」：鍛造品級機率只看所打造裝備本身的境界（gearRealmOf：it.realm→GEAR[t].realm→目錄 realm），不看宗主、不看鍛造者。
  //  裝備境界 ≤3（宗師以下）＝55.5／28／12／4.5／0（仙品 0.5 併入下品）；≥4（煉氣以上）＝55／28／12／4.5／0.5（鍛造不套 topMinRealm）。
  //  付靈石保底（lqsure）表 58.5／28／12／1／0.5 不變；保底資格：lqsure 開＋宗主煉氣以上（forgeOwnerCanPay）＋鍛造者煉氣以上（smithR 未給則不檢）。
  function forgeItemOpt(itemR){return (itemR|0)<=3?{mergeXian:true}:{skipTopMin:true};}
  function forgeWeightsFor(itemR,sure,smithR){
    itemR=itemR==null?0:(itemR|0);
    try{const A=typeof window!=='undefined'&&window.XW_ECON;if(sure&&A&&typeof A.forgeOwnerCanPay==='function'&&!A.forgeOwnerCanPay())sure=false;}catch(e){}
    if(sure&&lqSureFeatOn()&&(smithR==null||(smithR|0)>=4))return gradeWeightsOf('lqsure',itemR,{skipTopMin:true});
    return gradeWeightsOf('forge',itemR,forgeItemOpt(itemR));
  }
  function gradeWeightsOf(src,r,opt){
    // 物件形式：gradeWeightsOf({itemRealm|item|realm: 裝備境界, sure, smith|smithRealm: 鍛造者境界（只判保底資格）})＝forgeWeightsFor（14:09 起 realm 指裝備境界）
    if(src&&typeof src==='object'){
      const o=src,ir=o.itemRealm!=null?o.itemRealm:(o.item!=null?o.item:o.realm),sm=o.smith!=null?o.smith:o.smithRealm;
      return forgeWeightsFor(ir,!!o.sure,sm);
    }
    opt=opt||{};
    // 'forge' 無選項（makeItem→ensureGr 鍛造預設）＝依裝備境界規則；要原表＋topMinRealm 用 {raw:true}
    if((src||'forge')==='forge'&&!opt.mergeXian&&!opt.skipTopMin&&!opt.raw)opt=forgeItemOpt(r);
    let w;
    if(src==='lqsure')w=(GRADE_TUNE.weight.lqsure||[58.5,28,12,1,0.5]).slice();
    else w=(GRADE_TUNE.weight[src||'forge']||GRADE_TUNE.weight.forge).slice();
    if(opt.mergeXian)w=mergeXianWeight(w);
    const rEff=src==='xtl'?11:(r|0);
    const cap=GRADE_TUNE.realmCap&&GRADE_TUNE.realmCap[rEff];
    const tmr=+GRADE_TUNE.topMinRealm||0;
    if(cap)for(let i=cap;i<w.length;i++)w[i]=0;
    if(!opt.mergeXian&&src!=='lqsure'&&!opt.skipTopMin&&tmr>0&&rEff<tmr)w[4]=0;
    return w;
  }
  function rollGrade(r,src,opt){
    let w=gradeWeightsOf(src||'forge',r,opt);
    let tot=0;w.forEach(x=>tot+=x);
    if(tot<=0){w=gradeWeightsOf('forge',r,opt);tot=0;w.forEach(x=>tot+=x);if(tot<=0)return 1;}
    let x=rand01()*tot;
    for(let i=0;i<w.length;i++){x-=w[i];if(x<0)return i+1;}return 1;
  }
  function rand01(){try{if(typeof rnd==='function'){const v=rnd();if(isFinite(v))return v;}}catch(e){}return Math.random();}
  // P2（11-13 13:31 隊長）：舊雜湊對連號 id 近似線性（id 1–51 全下、52–115 全中…），不隨機。
  // 新件：生成當下擲 xianSub 權重、寫入 it.xsub（0／1／2，存檔隨物件 JSON 保存）；
  // 舊件（無 it.xsub）：沿用原 id 雜湊，讀檔子品級不跳動。?xsubroll=0 回舊行為（不寫欄位）。
  const XSUB_ROLL_ON=!qs(/[?&]xsubroll=0\b/);
  function xianSubLegacyIdx(it){
    if(!it||it.id==null||!isFinite(+it.id))return null;
    let h=(Math.imul((+it.id)>>>0,16777619)^2166136261)>>>0;
    const w=GRADE_TUNE.xianSub||[70,25,5];
    let tot=0;for(let i=0;i<w.length;i++)tot+=w[i];
    if(!(tot>0))return 0;
    let x=(h/4294967296)*tot;
    for(let i=0;i<w.length;i++){x-=w[i];if(x<0)return i;}
    return w.length-1;
  }
  function xianSubValid(it){const w=GRADE_TUNE.xianSub||[70,25,5];return !!(it&&typeof it.xsub==='number'&&(it.xsub|0)===it.xsub&&it.xsub>=0&&it.xsub<w.length);}
  function xianSubIdx(it){
    if(xianSubValid(it))return it.xsub;
    return xianSubLegacyIdx(it);
  }
  function rollXianSub(){
    const w=GRADE_TUNE.xianSub||[70,25,5];
    let tot=0;for(let i=0;i<w.length;i++)tot+=Math.max(0,+w[i]||0);
    if(!(tot>0))return 0;
    let x=rand01()*tot;
    for(let i=0;i<w.length;i++){x-=Math.max(0,+w[i]||0);if(x<0)return i;}
    return w.length-1;
  }
  // 新生成且擲到仙品（gr=5）時呼叫：已有合法 xsub 不重擲（穩定）；非仙品不寫
  function stampXianSub(it){
    if(!XSUB_ROLL_ON||!it||(it.gr|0)!==5||xianSubValid(it))return it;
    it.xsub=rollXianSub();return it;
  }
  function xianSubMulOf(it){
    const i=xianSubIdx(it);
    const m=GRADE_TUNE.xianSubMul||[1.5,1.75,2];
    if(i==null)return +m[0]||1.5;
    return +m[i]||1;
  }
  function xianQiDisplay(it){
    if(!it||(it.gr|0)!==5)return '';
    const i=xianSubIdx(it);
    const N=GRADE_TUNE.xianSubNames||['下品','中品','上品'];
    return '仙器'+(N[i==null?0:i]||'');
  }
  function gradeMulOf(it){
    if(!GMUL_ON)return 1;
    const i=grIdxOf(it);
    if(i<0)return 1;
    if(i===4)return xianSubMulOf(it);
    const g=GRADES[i];
    return g&&g.mul!=null?+g.mul:1;
  }
  function gradeNameOf(it){
    if(it&&(it.gr|0)===5)return xianQiDisplay(it)||'仙器下品';
    const i=grIdxOf(it);return (i>=0&&GRADES[i])?GRADES[i].n:'';
  }
  function forgeApplyCraftGrade(it,opt){
    opt=opt||{};
    if(!it||!lqSureFeatOn())return it;
    const smith=opt.smith;
    const smithR=smith&&smith.realm!=null?(smith.realm|0):-1;
    let sure=!!opt.sure;
    // P2：宗主宗師以下時保底一律失效（含舊存檔已勾選的爐／委託），改走無保底權重
    try{const A=typeof window!=='undefined'&&window.XW_ECON;if(sure&&A&&typeof A.forgeOwnerCanPay==='function'&&!A.forgeOwnerCanPay())sure=false;}catch(e){}
    if(sure&&smithR>=4){
      if(gradeOn()){it.gr=rollGrade(gearRealmOf(it),'lqsure',{skipTopMin:true});stampXianSub(it);}
      if((it.gr|0)===5&&(it.q|0)===3){
        it.q=5;
        try{if(isV2(it))rescale(it);
          else if(typeof GEAR!=='undefined'&&GEAR&&GEAR[it.t]&&typeof QMUL!=='undefined'){
            const T=GEAR[it.t],m=QMUL[5]!=null?QMUL[5]:4.6;
            it.atk=+(((T.atk||0)*m).toFixed(1));it.hp=Math.round((T.hp||0)*m);it.def=+(((T.def||0)*m).toFixed(1));
            it.spd=+(((T.spd||0)*(1+5*0.2)).toFixed(2));
          }
        }catch(e){}
      }
      return it;
    }
    // 14:09：不勾保底（或保底失效）一律依裝備境界重擲（不看鍛造者／宗主）
    if(gradeOn()){const ir=gearRealmOf(it);it.gr=rollGrade(ir,'forge',forgeItemOpt(ir));stampXianSub(it);}
    return it;
  }
  // 補欄位：只在品級開時寫 it.gr；已有就不動。新表件未帶品級＝擲骰（鍛造／掉落），舊目錄件＝照境界預設
  function ensureGr(it,src){
    if(!gradeOn()||!isGear(it))return it;
    if(it.gr>=1&&it.gr<=5)return it;
    if(isV2(it)&&src){it.gr=rollGrade(gearRealmOf(it),src);stampXianSub(it);}
    else it.gr=defaultGr(gearRealmOf(it));
    return it;
  }
  function grIdxOf(it){if(it&&it.gr>=1&&it.gr<=5)return (it.gr|0)-1;return isGear(it)?gradeIdx(gearRealmOf(it)):-1;}
  function gradeOf(it){if(!gradeOn())return null;const i=grIdxOf(it);return i>=0?GRADES[i]:null;}
  function gradeAdd(it){
    const i=grIdxOf(it);if(i<0)return 0;const g=GRADES[i];if(g.lo===g.hi)return g.lo;
    const r=gearRealmOf(it),ord=CAT[it.t]&&CAT[it.t].gv2.ord!=null?CAT[it.t].gv2.ord:0;
    if(r<g.r0)return g.lo;if(r>g.r1)return g.hi;
    const span=g.r1-g.r0+1;
    // 低境低號→高境高號；非最後一境的境內最高件停在 0.9 格，不追平下一境第一件
    const t=span>1?((r-g.r0)+ord*(r===g.r1?1:0.9))/span:ord;
    return Math.round(g.lo+(g.hi-g.lo)*Math.max(0,Math.min(1,t)));
  }
  // 單件品級明細：{gr,n,base:{atk,hp,def},add,addTo,mul,fin:{...},extra:{...}}（extra＝fin−base，給 econApply 加到穿戴者）
  function gradeDetail(it){
    if(!gradeOn()||!isGear(it))return null;
    const i=grIdxOf(it);if(i<0)return null;const g=GRADES[i];
    const base={atk:+it.atk||0,hp:+it.hp||0,def:+it.def||0,spd:+it.spd||0};
    const v2=isV2(it);
    const mul=gradeMulOf(it);
    const nm=gradeNameOf(it)||g.n;
    if(!v2&&!GRADE_TUNE.oldBonus){
      const fin={atk:r1(base.atk*mul),hp:Math.round(base.hp*mul),def:r1(base.def*mul),spd:r2(base.spd*mul)};
      return {gr:i+1,n:nm,base,add:0,addTo:'',mul,fin,extra:{atk:r1(fin.atk-base.atk),hp:fin.hp-base.hp,def:r1(fin.def-base.def),spd:r2(fin.spd-base.spd)},old:1};
    }
    const armor=GRADE_TUNE.armorSlots.indexOf(it.slot)>=0;
    const add=r1(gradeAdd(it)*(armor?1:GRADE_TUNE.wcDefShare));
    const fin={atk:r1(base.atk*mul),hp:Math.round(base.hp*mul),def:r1((base.def+add)*mul),spd:r2(base.spd*mul)};
    return {gr:i+1,n:nm,base,add,addTo:'def',mul,fin,extra:{atk:r1(fin.atk-base.atk),hp:fin.hp-base.hp,def:r1(fin.def-base.def),spd:r2(fin.spd-base.spd)}};
  }
  function gradeExtra(u){const o={atk:0,hp:0,def:0,spd:0};if(!gradeOn()||!u||!u.eq)return o;for(const s in u.eq){const it=u.eq[s];if(!it)continue;ensureGr(it);const d=gradeDetail(it);if(d){o.atk+=d.extra.atk;o.hp+=d.extra.hp;o.def+=d.extra.def;o.spd+=d.extra.spd||0;}}o.atk=r1(o.atk);o.def=r1(o.def);o.spd=r2(o.spd);return o;}
  function gradeText(it){const d=gradeDetail(it);if(!d)return '';return '品級：'+d.n+(d.old?'（舊裝備：加值不加，倍率 ×'+d.mul+'）':'（防禦 +'+d.add+'，×'+d.mul+(GMUL_ON?'':'，乘數已關')+'）');}
  // 讀檔／開局補欄位：行囊、單位裝備與個人行囊、地上裝備
  function sweep(){
    if(!gradeOn())return 0;let n=0;
    const f=it=>{if(it&&isGear(it)&&!(it.gr>=1&&it.gr<=5)){ensureGr(it);n++;}};
    try{if(typeof S==='undefined'||!S)return 0;(S.inv||[]).forEach(f);
      (S.units||[]).forEach(u=>{if(!u)return;for(const k in (u.eq||{}))f(u.eq[k]);(u.gbag||[]).forEach(f);});
      if(S.econ&&Array.isArray(S.econ.groundGear))S.econ.groundGear.forEach(d=>f(d&&d.item));}catch(e){}
    return n;
  }
  function G(t){try{if(typeof GEAR!=='undefined'&&GEAR&&GEAR[t]&&GEAR[t].gv2)return GEAR[t];}catch(e){}return CAT[t]||null;}
  function isV2(it){return !!(it&&it.t&&CAT[it.t]);}
  // 材料：同境（>金丹取金丹×1.27^差）舊劍／舊佩／舊甲材料 × 倍率；在舊目錄裝好後才算
  function costFor(id,GO){const T=CAT[id];if(!T._cs)return T.cost;return mulCost(baseCost(T.realm,T._cs[0],GO),T._cs[1]);}
  function installCatalog(GO){if(!GO)return 0;let n=0;for(const id in CAT){const T=CAT[id];if(!T._cd&&GO['eg0_sword']){T.cost=costFor(id,GO);T._cd=1;}
    if(!GO[id]||(GO[id].gv2&&!GO[id]._cd&&T._cd)){const o=Object.assign({},T,{cost:Object.assign({},T.cost)});delete o._cs;GO[id]=o;n++;}}return n;}
  function qScale(q){q=Math.max(0,Math.min(5,(q|0)));return Q_SCALE[q];}
  // makeItem 後：主屬性改用品質縮放（不乘 QMUL）
  function rescale(it){
    if(!isV2(it))return it;const T=CAT[it.t],s=qScale(it.q);
    it.atk=r1((T.atk||0)*s);it.hp=Math.round((T.hp||0)*s);it.def=r1((T.def||0)*s);it.realm=T.realm;return it;
  }
  function uRealm(u){return Math.max(0,Math.min(11,(u&&u.realm)|0));}
  function setCounts(u){
    const out={};const eq=u&&u.eq||{};
    SET_SLOTS.forEach(sl=>{const it=eq[sl];if(!it||!isV2(it))return;const g=CAT[it.t].gv2;if(!g.setId||g.part==null)return;
      if(PART.find(p=>p[0]===g.part)[1]!==sl)return;
      const o=out[g.setId]=out[g.setId]||{n:0,minR:99,parts:{}};if(o.parts[g.part])return;o.parts[g.part]=1;o.n++;o.minR=Math.min(o.minR,CAT[it.t].realm);});
    return out;
  }
  function setEffects(u){
    const sc=setCounts(u),list=[],pct={};
    for(const id in sc){const S0=SETS[id],c=sc[id];if(!S0)continue;const tier=tierOf(c.minR),m=TIER_M[tier];
      const act=[];
      if(c.n>=2)S0.e2.forEach(k=>{const v=r2(SET_V[k][0]*m);pct[k]=(pct[k]||0)+v;act.push([k,v,2]);});
      if(c.n>=5)S0.e5.forEach(k=>{const v=r2(SET_V[k][1]*m);pct[k]=(pct[k]||0)+v;act.push([k,v,5]);});
      list.push({id:+id,n:S0.n,count:c.n,tier:tier,m:m,act:act});}
    return {list:list,pct:pct};
  }
  function secOf(u){const pct={};const eq=u&&u.eq||{};for(const s in eq){const it=eq[s];if(!it||!isV2(it))continue;CAT[it.t].gv2.sec.forEach(x=>{pct[x[0]]=(pct[x[0]]||0)+x[1];});}return pct;}
  function caps(u){const r=uRealm(u);return {atkPct:r2(11*KA[r]),hpPct:r2(11*KH[r])};}
  // 新表來源（固定次要＋套效）合計；攻擊力% ≤ 11%×KA、氣血% ≤ 11%×KH（依穿戴者境界）。tribRed 不在這裡（武器次要走 econGearTribRed；套效走 econSetBonus）
  // 每幀會被 wornOf／吸血／減耗多次呼叫：以「旗標＋境界＋所穿物品 id／t」為鍵快取（不存檔，WeakMap）
  const XC=typeof WeakMap==='function'?new WeakMap():null;
  function extra(u){
    if(!econGearV2On()||!u||!u.eq)return {};
    let key='';if(XC){key=uRealm(u)+'|';const eq=u.eq;for(const s in eq){const it=eq[s];if(it)key+=s+':'+(it.id||0)+':'+it.t+',';}
      const c=XC.get(u);if(c&&c.k===key)return c.v;}
    const v=extra0(u);if(XC)XC.set(u,{k:key,v:v});return v;
  }
  function extra0(u){
    const o={};
    const a=secOf(u),b=setEffects(u).pct;
    for(const k in a)o[k]=(o[k]||0)+a[k];for(const k in b)if(k!=='tribRed')o[k]=(o[k]||0)+b[k];
    const c=caps(u);if(o.atkPct>c.atkPct)o.atkPct=c.atkPct;if(o.hpPct>c.hpPct)o.hpPct=c.hpPct;
    for(const k in o)o[k]=r2(o[k]);
    return o;
  }
  function setTrib(u){if(!econGearV2On())return 0;const p=setEffects(u).pct;return Math.max(0,(p.tribRed||0)/100);}
  function fmt(k,v){const t=(Math.abs(v-Math.round(v))<1e-9)?String(Math.round(v)):String(r2(v));return (KEY_N[k]||k)+' '+(v>0?'+':'')+t+'%';}
  function secText(it){if(!isV2(it))return '';return CAT[it.t].gv2.sec.map(x=>fmt(x[0],x[1])).join('、');}
  function setText(it,u){
    if(!isV2(it))return '';const g=CAT[it.t].gv2;if(!g.setId)return '';const S0=SETS[g.setId];const m=S0.m;
    let have=0;try{const c=u?setCounts(u)[g.setId]:null;have=c?c.n:0;}catch(e){}
    return '套裝【'+S0.n+'】'+(u?('已穿 '+have+'/5，'):'')+'2件：'+S0.e2.map(k=>fmt(k,r2(SET_V[k][0]*m))).join('、')+'；5件：'+S0.e5.map(k=>fmt(k,r2(SET_V[k][1]*m))).join('、')+'（'+tierLabel(S0.tier)+'，×'+m+'）';
  }
  function keys(cat,r){if(!econGearV2On())return [];if(cat==='s'&&!SET_FORGE)return [];return (BY_REALM[cat][r]||[]).slice();}
  function setsForRealm(r){const o=[];const L=BY_REALM.s[r]||[];L.forEach(id=>{const s=CAT[id].gv2.setId;if(o.indexOf(s)<0)o.push(s);});return o.map(s=>({id:s,n:SETS[s].n,ids:L.filter(id=>CAT[id].gv2.setId===s)}));}
  function dropPool(r){if(!econGearV2On())return null;return {w:(BY_REALM.w[r]||[]).slice(),c:(BY_REALM.c[r]||[]).slice(),s:(BY_REALM.s[r]||[]).slice()};}
  const API={on:econGearV2On,CAT:CAT,SETS:SETS,BY_REALM:BY_REALM,A:A,H:H,KA:KA,KH:KH,SEC_BASE:SEC_BASE,SET_V:SET_V,TIER_M:TIER_M,AFFIX_N:AFFIX_N,Q_SCALE:Q_SCALE,SET_FORGE:SET_FORGE,
    GRADES:GRADES,GRADE_ON:GRADE_ON,GMUL_ON:GMUL_ON,GRADE_TUNE:GRADE_TUNE,gradeIdx:gradeIdx,gradeOf:gradeOf,gradeText:gradeText,gradeAdd:gradeAdd,gradeDetail:gradeDetail,gradeExtra:gradeExtra,
    ensureGr:ensureGr,rollGrade:rollGrade,gradeWeightsOf:gradeWeightsOf,mergeXianWeight:mergeXianWeight,
    xianSubIdx:xianSubIdx,xianSubLegacyIdx:xianSubLegacyIdx,stampXianSub:stampXianSub,rollXianSub:rollXianSub,XSUB_ROLL_ON:XSUB_ROLL_ON,forgeWeightsFor:forgeWeightsFor,forgeItemOpt:forgeItemOpt,xianSubMulOf:xianSubMulOf,xianQiDisplay:xianQiDisplay,gradeMulOf:gradeMulOf,gradeNameOf:gradeNameOf,
    forgeApplyCraftGrade:forgeApplyCraftGrade,defaultGr:defaultGr,sweep:sweep,gradeOn:gradeOn,lqSureFeatOn:lqSureFeatOn,
    isV2:isV2,installCatalog:installCatalog,rescale:rescale,extra:extra,setEffects:setEffects,setCounts:setCounts,setTrib:setTrib,caps:caps,secText:secText,setText:setText,
    keys:keys,setsForRealm:setsForRealm,dropPool:dropPool,tierOf:tierOf,tierLabel:tierLabel,G:G,count:function(){return Object.keys(CAT).length;}};
  try{if(typeof window!=='undefined'){window.XW_ECON=window.XW_ECON||{};window.XW_ECON.gearV2=API;window.econGearV2=API;window.XW_ECON.forgeApplyCraftGrade=forgeApplyCraftGrade;window.XW_ECON.xianQiDisplay=xianQiDisplay;window.XW_ECON.gradeMulOf=gradeMulOf;window.XW_ECON.xianSubIdx=xianSubIdx;window.XW_ECON.xianSubMulOf=xianSubMulOf;}}catch(e){}
  try{if(typeof module!=='undefined'&&module.exports)module.exports.gearV2=API;}catch(e){}
  // 套裝加成給 cult：保留舊欄位 cultSpd/breakAdd/tribRed（小數）；另附 pct／sets 供面板。若別人已定義就疊加。
  try{
    if(typeof window!=='undefined'){
      const prev=typeof window.econSetBonus==='function'&&!window.econSetBonus._gv2?window.econSetBonus:null;
      const fn=function(u){
        let o={cultSpd:0,breakAdd:0,tribRed:0};
        if(prev){try{const p=prev(u)||{};['cultSpd','breakAdd','tribRed'].forEach(k=>{if(isFinite(+p[k]))o[k]+=+p[k];});}catch(e){}}
        if(!econGearV2On())return Object.assign(o,{pct:{},sets:[]});
        const se=setEffects(u);
        let gt=0;try{if(typeof econGearTribRed==='function')gt=econGearTribRed(u);}catch(e){}
        o.tribRed=r2((o.tribRed+Math.min(setTrib(u),Math.max(0,0.05-gt)))*10000)/10000; // 雷劫裝備合計 ≤5%
        o.pct=extra(u);o.sets=se.list;return o;
      };
      fn._gv2=1;window.econSetBonus=fn;
    }
  }catch(e){}
})();
