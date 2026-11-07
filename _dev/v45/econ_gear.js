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
  const ECON_SMITH_FEE_LV=3;            // 待使用者確認：熟練達此（含）玩家委製也收費
  const ECON_SMITH_FEE_BASE=2;          // 待使用者確認：工錢（下品／件）
  const ECON_SMITH_FEE_PER_LV=1;        // 待使用者確認
  const ECON_SMITH_Q_SHIFT_PER_LV=2;    // 待使用者確認：熟練每級從凡品挪走的權重點
  const ECON_SMITH_Q_SHIFT_CAP=20;
  const ECON_FQ_BULK_N=5;
  const ECON_FQ_BULK_DISC=0.9;          // 與 TUNE.v49.batchDisc 相同
  const QI_WORD='靈氣'; // 面板資源名為「靈氣」；「靈力」僅出現在護盾說明，詞綴統一用靈氣

  const AFFIX_DEFS=[
    {k:'qiSkillAtk',name:QI_WORD+'技能攻擊',lo:1,hi:10,off:1},
    {k:'crit',name:'暴擊率',lo:5,hi:10,off:1},
    {k:'critDmg',name:'暴擊傷害',lo:10,hi:30,off:1},
    {k:'dodge',name:'閃避',lo:1,hi:5,def:1},
    {k:'atkPct',name:'攻擊力',lo:1,hi:10,off:1},
    {k:'defPct',name:'防禦力',lo:1,hi:10,def:1},
    {k:'qiRegen',name:QI_WORD+'恢復速度',lo:1,hi:10,def:1},
    {k:'move',name:'移動速度',lo:1,hi:10,off:0},
    {k:'qiCost',name:QI_WORD+'消耗',lo:-5,hi:-1,def:1,neg:1},
    {k:'shield',name:'護盾容量',lo:10,hi:30,def:1}
  ];
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
    }catch(e){}
  }
  function keysForRealm(r){
    const out=[];
    if(r===0){
      try{
        const GO=gearObj()||{};
        if(typeof GEAR_ORDER!=='undefined')GEAR_ORDER.forEach(function(k){const G=GO[k];if(G&&(G.realm|0)===0)out.push(k);});
      }catch(e){}
      if(out.length)return out;
    }
    for(const kind of KIND_ORDER){
      if(kind==='faqi'&&r<4)continue;
      const id=gearId(r,kind);
      try{const GO=gearObj();if(GO&&GO[id])out.push(id);}catch(e){}
    }
    if(r===4){
      try{if(typeof GEAR!=='undefined'&&GEAR.faqi&&out.indexOf('faqi')<0)out.push('faqi');}catch(e){}
    }
    return out;
  }

  function qNameOf(it){
    if(!it)return '凡品';
    if(it.econQName)return it.econQName;
    try{
      if(it.q!=null&&typeof QN!=='undefined'&&QN[it.q])return QN[it.q];
    }catch(e){}
    return '凡品';
  }
  function scaleAffix(def, qName){
    const sc=ECON_AFFIX_Q_SCALE[qName]!=null?ECON_AFFIX_Q_SCALE[qName]:1;
    const span=def.hi-def.lo;
    let v;
    if(def.neg){
      // 消耗為負：品質越好越接近 hi（-1，減耗更少？）使用者：−1~−5%；品質應讓減耗更多（更負）
      const t=rnd01()*sc; // 0..sc
      v=def.lo+span*(1-Math.min(1,t)); // closer to lo (-5) when high quality? 
      // 再想：品質高 → 減耗更強 → 更接近 -5（lo）。t 大 → v 接近 lo。
      v=def.hi-span*Math.min(1,rnd01()*sc);
    }else{
      v=def.lo+span*Math.min(1,rnd01()*sc);
    }
    return Math.round(v);
  }
  function rollAffixes(it){
    if(!it)return [];
    if(it.affixes&&it.affixes.length)return it.affixes;
    const qn=qNameOf(it);
    const pool=AFFIX_DEFS.slice();
    const picked=[];
    const n=Math.min(ECON_AFFIX_COUNT,pool.length);
    for(let i=0;i<n;i++){
      const idx=Math.floor(rnd01()*pool.length);
      const def=pool.splice(idx,1)[0];
      let v=scaleAffix(def,qn);
      if(def.neg){if(v>def.hi)v=def.hi;if(v<def.lo)v=def.lo;}
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
  function affixText(it){
    const a=it&&it.affixes||[];
    return a.map(function(x){return x.name+' '+(x.v>0?('+'+x.v):(''+x.v))+'%';}).join('、');
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
    if(!keys.length){
      const rr=Math.min(6,realm);
      keys=KIND_ORDER.filter(function(kind){return !(kind==='faqi'&&rr<4);}).map(function(kind){return gearId(rr,kind);});
    }
    if(!keys.length)return [];
    const n=rnd01()<0.35?2:1;
    const out=[];
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
      }
      const GO2=gearObj()||{};
      it.realm=GO2[k]&&GO2[k].realm!=null?GO2[k].realm:realm;
      attachAffixes(it);
      out.push(it);
    }
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
  function fqAdd(b,k,n,inf){
    if(!b||b.type!=='forge')return {ok:false};
    n=Math.max(1,Math.min(20,n|0));
    const q=qState(b,true);
    const last=q[q.length-1];
    if(last&&last.k===k&&!!last.inf===!!inf){last.n=Math.min(20,last.n+n);}
    else q.push({id:(b._fqn=(b._fqn||1)+1),k:k,n:n,inf:!!inf});
    return {ok:true,n:q.length};
  }
  function fqDel(b,id){
    const q=qState(b,true);
    b.econForgeQ=q.filter(function(x){return x.id!==id;});
    return {ok:true};
  }
  function fqSetN(b,id,n){
    n=Math.max(1,Math.min(20,n|0));
    const q=qState(b,true);
    q.forEach(function(x){if(x.id===id)x.n=n;});
    return {ok:true};
  }
  function fqKick(b){
    if(!b||b.type!=='forge'||b.craft)return {ok:false,reason:'busy'};
    const q=qState(b,true);
    while(q.length){
      const line=q[0];
      const c=batchCostOf(line.k,line.n,line.inf);
      let can=true;
      try{can=(typeof canPay2==='function')?canPay2(c):true;}catch(e){}
      if(!can){
        try{if(typeof toast==='function')toast('材料不足，跳過 '+itemLabel(line.k)+' ×'+line.n);}catch(e){}
        q.shift();
        continue;
      }
      let ok=false;
      if(line.n>1&&typeof v49Batch==='function'){
        try{ok=!!v49Batch(b.id,line.k,line.n,line.inf);}catch(e){ok=false;}
      }else if(typeof startCraft==='function'){
        try{ok=!!startCraft(b,line.k,line.inf);}catch(e){ok=false;}
      }
      q.shift();
      if(ok)return {ok:true,started:line};
      try{if(typeof toast==='function')toast('無法開爐，跳過 '+itemLabel(line.k)+' ×'+line.n);}catch(e){}
    }
    return {ok:false,reason:'empty'};
  }

  function smithFeeOf(u,n){
    n=Math.max(1,n|0);
    const lv=(typeof v59Lv==='function')?v59Lv(u,'forge'):0;
    if(lv<ECON_SMITH_FEE_LV)return {xia:0,lv:lv,charge:false};
    const xia=(ECON_SMITH_FEE_BASE+Math.max(0,lv-ECON_SMITH_FEE_LV)*ECON_SMITH_FEE_PER_LV)*n;
    return {xia:xia,lv:lv,charge:true};
  }
  function canSmithPay(fee){
    if(!fee||!fee.charge||!(fee.xia>0))return true;
    const T=(typeof S!=='undefined'?S:null);
    const p=(typeof player==='function'?player():null);
    const need=fee.xia;
    try{if(typeof econCanPay==='function'&&econCanPay(p||'vault',need))return true;}catch(e){}
    try{if(p&&typeof econContribCanPay==='function'&&econContribCanPay(p,need))return true;}catch(e){}
    try{if(T&&T.res&&T.res.lingshi>=need)return true;}catch(e){}
    return false;
  }
  function smithPay(smith, fee, n){
    if(!fee||!fee.charge||!(fee.xia>0))return {ok:true,skipped:true};
    const T=(typeof S!=='undefined'?S:null);
    const p=(typeof player==='function'?player():null);
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
    if(!box){
      box=document.createElement('div');
      box.id='econ-gear-ui';
      box.style.cssText='margin:8px 0;padding:8px;border:1px solid #6a542044;border-radius:8px;max-height:min(52vh,420px);overflow:auto;-webkit-overflow-scrolling:touch;';
      const host=el.querySelector('#v49cf')||el;
      if(host.parentNode&&host!==el)host.parentNode.insertBefore(box,host);
      else el.appendChild(box);
    }
    const inf=!!(typeof craftInf!=='undefined'&&craftInf);
    const q=qState(b,true);
    const tot=queueTotal(b,inf);
    const peak=peakRealm();
    const open=maxOpenRealm();
    const lock=tabUnlocked(fqTab);
    let h='<div class="econ-fq"><div class="gt">批量佇列</div>';
    h+='<div class="dim sm">可加入多種裝備與各自數量（例如 長劍×3＋拳套×5＋護身符×2），依序打造；單一品項滿 '+ECON_FQ_BULK_N+' 件材料九折。材料不足會跳過該項並提示。</div>';
    if(b.craft){
      const cn=itemLabel(b.craft.k);
      const left=q.length?('，佇列尚餘 '+q.length+' 項'):'';
      h+='<div>打造中：'+cn+(b.craft.n>1?(' ×'+b.craft.n):'')+' '+Math.floor((b.craft.t/b.craft.T)*100)+'%'+left+'</div>';
    }
    h+='<div class="jobs" style="flex-wrap:wrap">境界：';
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
    h+='</div>';
    if(!lock.ok){
      h+='<div class="dim">🔒 '+realmName(fqTab)+'：'+lock.why+'</div>';
    }else{
      const smith=(typeof bestCrafter==='function'?bestCrafter(b):null);
      if(smith&&smith.kind==='disciple'){
        const fee=smithFeeOf(smith,fqPickN);
        const how=(function(){try{const m=typeof econPayMode==='function'?econPayMode():'lsThenCb';return m==='cbOnly'||m==='cbFirst'?'貢獻優先':'靈石／貢獻';}catch(e){return '靈石／貢獻';}})();
        h+='<div class="dim">這位弟子收費 '+(fee.charge?fee.xia+' 下品（'+how+'）':'免收（熟練未達 '+ECON_SMITH_FEE_LV+'）')+'</div>';
      }
      h+='<div class="jobs">數量：';
      [1,3,5,10].forEach(function(n){
        h+='<button type="button" class="btn '+(fqPickN===n?'on':'')+'" data-eg-qn="'+n+'">×'+n+'</button>';
      });
      h+=' <input data-eg-qn-in type="number" min="1" max="20" value="'+fqPickN+'" style="width:52px"></div>';
      h+='<div class="jobs" style="flex-wrap:wrap">';
      keysForRealm(fqTab).forEach(function(k){
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
        h+='<div class="econ-task-row">'+ (i+1)+'. '+itemLabel(line.k)+' <input data-eg-setn="'+line.id+'" type="number" min="1" max="20" value="'+line.n+'" style="width:48px"> 件';
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
    box.innerHTML=h;
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

  function onCraftClick(ev){
    const t=ev.target&&ev.target.closest&&ev.target.closest('[data-eg-tab],[data-eg-qn],[data-eg-add],[data-eg-del],[data-eg-start],[data-eg-setn],[data-eg-qn-in]');
    if(!t)return;
    const b=(typeof bById==='function'&&typeof craftB!=='undefined')?bById(craftB):null;
    if(!b)return;
    if(t.hasAttribute('data-eg-tab')){
      fqTab=+t.getAttribute('data-eg-tab')||0;
    }else if(t.hasAttribute('data-eg-qn')){
      fqPickN=+t.getAttribute('data-eg-qn')||1;
    }else if(t.hasAttribute('data-eg-qn-in')&&ev.type==='change'){
      fqPickN=Math.max(1,Math.min(20,+t.value||1));
    }else if(t.hasAttribute('data-eg-add')){
      const k=t.getAttribute('data-eg-add');
      const G=GEAR[k];
      let why='';
      if(G&&G.lv&&(typeof blv==='function'?blv(b):1)<G.lv)why='需要鍛造坊 Lv'+G.lv;
      if(why){try{toast(why);}catch(e){}return;}
      fqAdd(b,k,fqPickN,typeof craftInf!=='undefined'&&craftInf);
    }else if(t.hasAttribute('data-eg-del')){
      fqDel(b,+t.getAttribute('data-eg-del'));
    }else if(t.hasAttribute('data-eg-setn')&&ev.type==='change'){
      fqSetN(b,+t.getAttribute('data-eg-setn'),+t.value||1);
    }else if(t.hasAttribute('data-eg-start')){
      fqKick(b);
    }else return;
    try{if(typeof craftKey!=='undefined')craftKey=null;}catch(e){}
    try{if(typeof renderCraft==='function')renderCraft();}catch(e){}
    ev.preventDefault();
    ev.stopPropagation();
  }

  function tooltipExtra(it){
    if(!it)return '';
    attachAffixes(it);
    const val=econGearValue(it);
    const qn=qNameOf(it);
    const ax=affixText(it);
    return '品質：'+qn+'。詞綴：'+(ax||'無')+'。'+val.label+'。';
  }

  function install(){
    installCatalog();
    try{
      if(typeof makeItem==='function'&&!makeItem._econGear){
        const _m=makeItem;
        makeItem=function(t,q,el){
          const it=_m.apply(this,arguments);
          try{if(it){attachAffixes(it);if(GEAR&&GEAR[t]&&GEAR[t].realm!=null)it.realm=GEAR[t].realm;}}catch(e){}
          return it;
        };
        makeItem._econGear=1;
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
      if(typeof tipText==='function'&&!tipText._econGear){
        const _tt=tipText;
        tipText=function(k){
          const r=_tt.apply(this,arguments);
          try{
            if(k&&typeof k==='string'&&k.startsWith('it:')){
              const id=+k.slice(3);
              let it=null;
              if(typeof S!=='undefined'&&S&&S.inv)it=S.inv.find(function(x){return x&&x.id===id;});
              if(!it&&S&&S.units){
                for(const u of S.units){
                  for(const s in (u.eq||{}))if(u.eq[s]&&u.eq[s].id===id)it=u.eq[s];
                }
              }
              if(it)return (r||'')+' '+tooltipExtra(it);
            }
          }catch(e){}
          return r;
        };
        tipText._econGear=1;
      }
    }catch(e){}
    try{
      if(typeof itemStats==='function'&&!itemStats._econGear){
        const _is=itemStats;
        itemStats=function(it){
          let s=_is.apply(this,arguments)||'';
          try{if(it){attachAffixes(it);const ax=affixText(it);const val=econGearValue(it);if(ax)s+=(s?'、':'')+ax;if(val)s+='　'+val.label;}}catch(e){}
          return s;
        };
        itemStats._econGear=1;
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
      A.forgeQueueAdd=fqAdd;
      A.forgeQueueDel=fqDel;
      A.forgeQueueSetN=fqSetN;
      A.forgeQueueKick=fqKick;
      A.forgeQueueTotal=queueTotal;
      A.forgeBatchCost=batchCostOf;
      A.gearKeysForRealm=keysForRealm;
      A.gearInstallCatalog=installCatalog;
      A.smithFeeOf=smithFeeOf;
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
    }else install();
  }catch(e){}
})();
