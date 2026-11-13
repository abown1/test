// ================== g30：建築加成總表＋選取／放置範圍圈 ==================
// 隊長整合層。不改存檔結構、不部署。範圍數值只讀既有常數，不自創。
// 總表由「宗門事務」的「加成」分頁進入（既有宗門介面加一個分頁按鈕）。
(function(){
  const BT_COL={
    juling:'rgba(120,255,210,',
    kuangchang:'rgba(210,180,100,',
    mine:'rgba(210,180,100,',
    huzhen:'rgba(140,210,255,',
    laozu:'rgba(140,190,255,',
    lingmai:'rgba(180,140,255,'
  };
  const BT_CLASS={
    hall:'B',altar:'A',house:'A',wudao:'A',lianwu:'A',library:'A',alchemy:'A',forge:'A',
    cangku:'A',shitang:'A',lingtian:'A',
    xianyuan:'B',juling:'B',huzhen:'B',zongcang:'B',tianjietai:'B',renwutang:'B',gongfage:'B',
    kuangchang:'B',zhifatang:'B',waishitang:'B',qingxinge:'B',chuangong:'B',huanjingta:'B',
    yinglieci:'B',laozu:'B',lingmai:'B',
    biwutai:'C',fuluge:'C',lingshou:'C'
  };
  const BT_ORDER=['hall','altar','house','wudao','lianwu','library','alchemy','forge','xianyuan',
    'cangku','shitang','lingtian','juling','huzhen','zongcang','renwutang','gongfage','kuangchang',
    'zhifatang','waishitang','tianjietai','qingxinge','chuangong','huanjingta','yinglieci','laozu',
    'lingmai','biwutai','fuluge','lingshou'];
  function btCultOn(k){
    try{if(typeof CULT_FLAGS!=='undefined'&&CULT_FLAGS[k]===false)return false;}catch(e){}
    try{const v=new URLSearchParams(location.search).get(k);if(v==='0'||v==='off'||v==='false')return false;}catch(e2){}
    return true;
  }
  const BT_HOOK={
    // hook: 'on' 已接到實際計算／行為；'off' 只有說明或匯出函式；'part' 場所已接、數值加成未接
    hall:{hook:'on',owner:''},
    altar:{hook:'on',owner:''},
    house:{hook:'on',owner:''},
    wudao:{hook:'on',owner:''},
    lianwu:{hook:'on',owner:''},
    library:{hook:'on',owner:'',get note(){return (typeof ECON_BLD5!=='undefined'&&ECON_BLD5)?'功法研讀速度已接入（econ_gf／自學）':'econ artsCap（功法品階上限）尚未被 cult_gf／econ_gf 消耗';}},
    alchemy:{hook:'on',owner:''},
    forge:{hook:'on',owner:''},
    xianyuan:{hook:'on',owner:'',note:'靈光／感應改為只算最高等；「仙緣天降」醍醐機率原本即取最高等'},
    cangku:{hook:'on',owner:'',note:'容量與文案皆為 g23 覆寫後的每座 Lv1 +300（每級再 +300），不是 g20 原稿 +5000'},
    shitang:{hook:'on',owner:''},
    lingtian:{hook:'on',owner:''},
    juling:{hook:'on',owner:''},
    huzhen:{hook:'on',owner:''},
    zongcang:{hook:'on',owner:''},
    renwutang:{hook:'on',owner:''},
    gongfage:{hook:'on',owner:''},
    kuangchang:{hook:'on',owner:''},
    tianjietai:{hook:'on',owner:''},
    biwutai:{hook:'on',owner:'',note:'場所（切磋／大比）已接上，沒有全宗數值光環'},
    waishitang:{get hook(){return (typeof ECON_BLD5!=='undefined'&&ECON_BLD5)?'on':'part';},owner:'經濟',file:'econ_shop.js',need:'econTradeUnitPrice 應乘上 econBuildingEffectNow(\'waishitang\').buyMul／sellMul',get note(){return (typeof ECON_BLD5!=='undefined'&&ECON_BLD5)?'已接入坊市／萬寶買賣價（賣價不高於買價−1）':'作為外事堂／坊市場所已接上，買省賣加倍率尚未接入售價';}},
    zhifatang:{hook:'off',owner:'經濟',file:'econ_rank.js／econ_core.js 或忠誠 tick',need:'呼叫 econLoyaltyDecayMul()',note:'執法職位解鎖會看是否有執法堂，但「降低忠誠衰退」未被消耗'},
    qingxinge:{get hook(){return btCultOn('caiqx')?'on':'off';},owner:'修煉',file:'cult.js／cult_trib2.js 或丹毒／走火邏輯',need:'呼叫 econDeviationMul()、econToxClearMul()',get note(){return btCultOn('caiqx')?'已接入走火／清丹毒倍率（econDeviationMul／econToxClearMul）':'經濟已匯出減走火／清丹毒倍率，修煉側尚未乘上';}},
    chuangong:{get hook(){return btCultOn('caicg')?'on':'off';},owner:'修煉',file:'cult.js 或修煉速度（cultMul／v62Cult）',need:'呼叫 econJuniorCultMul()，並處理 insight／juniorMaxDelta',get note(){return btCultOn('caicg')?'已接入低階弟子修煉倍率（econJuniorCultMul）':'經濟已匯出低階修煉倍率，修煉側尚未乘上';}},
    yinglieci:{hook:'off',owner:'修煉',file:'cult.js／氣運或凝聚力計算',need:'消耗 econBuildingEffectNow(\'yinglieci\') 的 cohesionMul／fortuneMul',note:'尚無 getter 被戰鬥或修煉呼叫'},
    laozu:{hook:'off',owner:'修煉',file:'cult.js 修煉速度（範圍內）',need:'在範圍 8 格內乘上 econBuildingEffectNow(\'laozu\').cultMul',note:'範圍常數已寫在 ECON_NEW_BUILDS，尚未套用'},
    lingmai:{hook:'off',owner:'修煉',file:'cult.js 靈氣回復與臨時資質光環',need:'在範圍 6 格內套用 qiMul 與 aptitudeAura（不可寫入永久屬性）',note:'範圍常數已寫在 ECON_NEW_BUILDS，尚未套用'},
    huanjingta:{hook:'off',owner:'修煉',file:'cult.js 或副本／試煉經驗',need:'消耗 econBuildingEffectNow(\'huanjingta\') 的 combatXpMul／noDeath',note:'室內已可進入，戰鬥經驗加成與無死亡試煉尚未接上'},
    fuluge:{hook:'off',owner:'經濟',file:'econ_buildings.js 或新的符籙系統',need:'消耗 talisman slots／craftMul',note:'尚無符籙製作流程讀取此效果'},
    lingshou:{hook:'off',owner:'經濟',file:'econ_buildings.js 或新的靈獸系統',need:'消耗 beasts slots',note:'尚無靈獸欄位邏輯讀取此效果'}
  };

  function btEsc(s){return String(s==null?'':s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));}
  function btName(type){
    try{if(typeof BUILD!=='undefined'&&BUILD[type]&&BUILD[type].name)return BUILD[type].name;}catch(e){}
    try{if(typeof econBuildingDef==='function'){const d=econBuildingDef(type);if(d&&d.name)return d.name;}}catch(e){}
    const fb={hall:'宗門大殿',altar:'求武台',house:'住房／洞府',wudao:'武道館',lianwu:'練武閣',library:'長書閣',alchemy:'煉丹房',forge:'鍛造坊',xianyuan:'仙緣閣',cangku:'倉庫',shitang:'食堂',lingtian:'靈田',juling:'聚靈陣',huzhen:'護宗陣',zongcang:'總倉',renwutang:'任務堂',gongfage:'功法閣',kuangchang:'礦場',zhifatang:'執法堂',waishitang:'外事堂',tianjietai:'天劫台',qingxinge:'清心閣',chuangong:'傳功殿',huanjingta:'幻境試煉塔',yinglieci:'英烈祠',laozu:'老祖隱居地',lingmai:'靈脈源頭',biwutai:'比武台',fuluge:'符籙閣',lingshou:'靈獸欄'};
    return fb[type]||type;
  }
  function btClassLabel(k){return k==='A'?'A 疊加':k==='B'?'B 不疊加（只算最高等）':k==='C'?'C 未定（場所／功能）':'—';}
  function btCount(type){
    let n=0,maxLv=0;
    try{
      if(S&&S.buildings){
        for(const b of S.buildings){
          if(!b||b.type!==type||!b.built||b.broken)continue;
          n++;
          const lv=(typeof blv==='function'?blv(b):(b.lv||1))||1;
          if(lv>maxLv)maxLv=lv;
        }
      }
    }catch(e){}
    return {n,maxLv};
  }
  function btSize(type){
    try{if(typeof BUILD!=='undefined'&&BUILD[type]&&BUILD[type].size)return BUILD[type].size;}catch(e){}
    return 2;
  }
  function btEconNow(type){
    try{if(typeof econBuildingEffectNow==='function')return econBuildingEffectNow(type);}catch(e){}
    return null;
  }
  function btEconCalc(type,lv){
    try{if(typeof econBuildingEffectCalc==='function')return econBuildingEffectCalc(type,lv||1);}catch(e){}
    return null;
  }
  function btRangeInfo(type,lv){
    lv=Math.max(1,lv||1);
    if(type==='juling'){
      const R=(typeof TUNE!=='undefined'&&TUNE.v61&&TUNE.v61.jlR!=null)?TUNE.v61.jlR:null;
      if(R==null)return {kind:'sect',txt:'全宗'};
      return {kind:'radius',R:+R,txt:'半徑 '+R+' 格'};
    }
    if(type==='kuangchang'||type==='mine'){
      let R=null;
      try{if(typeof ECON_MINE_TUNE!=='undefined'&&ECON_MINE_TUNE.range!=null)R=+ECON_MINE_TUNE.range;}catch(e){}
      if(R==null){const e=btEconCalc(type,lv)||btEconNow(type);if(e&&e.range)R=+e.range;}
      if(R==null)R=12;
      return {kind:'radius',R:R,txt:'半徑 '+R+' 格'};
    }
    if(type==='huzhen'){
      let R=null;
      try{if(typeof xhzStr==='function')R=xhzStr(lv).r;}catch(e){}
      try{if(R==null&&typeof y47BR==='function')R=y47BR(lv);}catch(e){}
      if(R==null&&typeof TUNE!=='undefined'&&TUNE.y47b)R=TUNE.y47b.r+TUNE.y47b.rLv*(lv-1);
      if(R==null)return {kind:'sect',txt:'全宗'};
      return {kind:'radius',R:+R,txt:'半徑 '+R+' 格'};
    }
    if(type==='laozu'||type==='lingmai'){
      const e=btEconCalc(type,lv)||btEconNow(type);
      const R=e&&e.range;
      if(R)return {kind:'radius',R:+R,txt:'半徑 '+R+' 格'};
    }
    return {kind:'sect',txt:'全宗'};
  }
  function btPct(x){return (Math.round((+x||0)*1000)/10).toString().replace(/\.0$/,'');}
  function btLive(type,st){
    const lv=st.maxLv,n=st.n;
    if(!n)return '—';
    try{
      if(type==='hall'){
        const H=(typeof TUNE!=='undefined'&&TUNE.v49&&TUNE.v49.hall)||[4,10,20];
        const mul=H[Math.min(Math.max(1,lv),H.length)-1];
        return '殿內閉關 ×'+mul;
      }
      if(type==='altar')return '此台感應的候選人悟性 +'+(3*lv);
      if(type==='house'){
        let cave='凡人階段尚無洞府修煉加成';
        try{
          if(S&&S.flags&&S.flags.xian){
            const T=TUNE.v62||{};const cc=(typeof caveCount==='function'?caveCount():n);
            const add=Math.min(T.caveMax||0.6,(T.cave||0.12)*cc);
            cave='洞府修煉 +'+btPct(add)+'%（'+cc+' 座 ×'+btPct(T.cave||0.12)+'%，上限 '+btPct(T.caveMax||0.6)+'%）';
          }
        }catch(e){}
        return cave+'；脫戰回血 '+(0.3*lv).toFixed(1)+'%／秒（只算最高等）';
      }
      if(type==='wudao')return '全宗攻擊 +'+(3*lv)+'%（只算最高等）';
      if(type==='lianwu')return '靈氣回復 +'+(15*lv)+'%（只算最高等）';
      if(type==='library'){
        const bLw=(typeof TUNE!=='undefined'&&TUNE.v49&&TUNE.v49.bLw)||0.0003;
        const _sm=(typeof ECON_BLD5!=='undefined'&&ECON_BLD5)?(1+Math.min(0.10,0.02*Math.min(5,lv))):0;
        return '領悟機率 +'+(bLw*100*lv).toFixed(1)+'%（只算最高等）'+(_sm?'、研讀速度 ×'+_sm.toFixed(2):'');
      }
      if(type==='alchemy')return '全宗修煉 +'+(3*lv)+'%（只算最高等）';
      if(type==='forge')return '熔鍊回收 +'+(10*lv)+'%、批量工時 -'+(5*lv)+'%（只算最高等）';
      if(type==='xianyuan'){
        const bTh=(typeof TUNE!=='undefined'&&TUNE.v49&&TUNE.v49.bTh)||0.0003;
        let extra='';
        try{
          if(typeof v56Per==='function'&&typeof v56Best==='function'){
            const b=v56Best();if(b)extra='；靈光每年約 '+v56Per(b)+' 輪（只算最高等）';
          }else if(typeof v56Per==='function'&&typeof v56Gap==='function'&&TUNE.v56){
            extra='；靈光每年約 '+(Math.round(v56Gap()/TUNE.v56.tick[Math.max(1,Math.min(3,lv))-1]*100)/100)+' 輪（只算最高等）';
          }
        }catch(e){}
        return '醍醐灌頂機率 +'+(bTh*100*lv).toFixed(1)+'%'+extra;
      }
      if(type==='cangku'){
        let capAdd=0,per=0;
        try{
          if(typeof v53Per==='function'){
            for(const b of S.buildings){if(b.type==='cangku'&&b.built&&!b.broken)capAdd+=v53Per(b);}
            const one=S.buildings.find(b=>b.type==='cangku'&&b.built&&!b.broken);
            if(one)per=v53Per(one);
          }else if(TUNE.v53){
            per=Math.round(TUNE.v53.per*(1+TUNE.v53.perLv*(lv-1)));
            capAdd=per*n;
          }
        }catch(e){}
        const dep=Math.round(((TUNE.v53&&TUNE.v53.dep)||0.05)*100*lv);
        return '容量合計 +'+capAdd+'（每座目前 +'+per+'，疊加）；卸貨 +'+dep+'%（只算最高等）';
      }
      if(type==='shitang'){
        const mood=(typeof TUNE!=='undefined'&&TUNE.y47f&&TUNE.y47f.mood)||0;
        return '用餐心情 +'+(mood+5*lv)+'（依入座那座食堂等級）';
      }
      if(type==='lingtian'){
        const e=btEconNow('lingtian')||btEconCalc('lingtian',lv);
        if(!e)return '靈田效果（旗標未開時無法計算）';
        return '每期約 '+(e.yieldPerHarvest||e.xiacaoPerDay||'?')+' 株仙草、'+((e.slots)||'?')+' 工位';
      }
      if(type==='juling'){
        let add=null;
        try{if(typeof v61JlAdd==='function')add=v61JlAdd(lv);}catch(e){}
        if(add==null&&TUNE.v61)add=(TUNE.v61.jl||0)+(TUNE.v61.jlLv||0)*(lv-1);
        return '範圍內靈氣回復 +'+btPct(add)+'%（只算最高等）';
      }
      if(type==='huzhen'){
        let s=null;
        try{if(typeof xhzStr==='function')s=xhzStr(lv);}catch(e){}
        try{
          if(s)return '半徑 '+s.r+' 格、陣力 '+(s.max!=null?s.max:(typeof y47BMax==='function'?y47BMax(lv):'—'));
          if(typeof y47BR==='function')return '半徑 '+y47BR(lv)+' 格、陣力 '+(typeof y47BMax==='function'?y47BMax(lv):'—');
        }catch(e){}
        return '護宗屏障（只算最高等）';
      }
      if(type==='zongcang'){
        let cd='';
        try{if(typeof v171Cd==='function')cd='領取冷卻 '+Math.round(v171Cd())+' 秒';}catch(e){}
        return (cd||('領取冷卻 -'+(10*lv)+'%'))+'（只算最高等）';
      }
      if(type==='renwutang'){
        const e=btEconNow('renwutang')||btEconCalc('renwutang',lv);
        return e&&e.contribMul!=null?('貢獻 ×'+e.contribMul):'任務堂場所';
      }
      if(type==='gongfage')return '功法閣借閱／參悟場所（只算最高等加速）';
      if(type==='kuangchang'){
        let mul=null;
        try{if(typeof econMineMul==='function'){/* may need position */}}catch(e){}
        const e=btEconNow('kuangchang')||btEconCalc('kuangchang',lv);
        if(e&&e.gatherMul)mul=e.gatherMul;
        else if(typeof ECON_MINE_TUNE!=='undefined')mul=1+ECON_MINE_TUNE.perLv*lv;
        return '範圍內採集 ×'+(mul!=null?mul:'—')+'（只算最高等）';
      }
      if(type==='tianjietai'){
        let e=null;
        try{if(typeof econTribulationBonus==='function')e=econTribulationBonus();}catch(err){}
        if(!e)e=btEconNow('tianjietai')||btEconCalc('tianjietai',lv);
        if(e)return '渡劫減傷 ×'+(e.dmgMul!=null?e.dmgMul:'—')+'、存活 +'+btPct(e.surviveBonus)+'%';
        return '天劫台場所';
      }
      if(type==='biwutai')return '切磋／大比場所';
      if(type==='waishitang'){
        const e=btEconNow('waishitang')||btEconCalc('waishitang',lv);
        return e?('場所已開；買 ×'+(e.buyMul||'—')+'／賣 ×'+(e.sellMul||'—')+((typeof ECON_BLD5!=='undefined'&&ECON_BLD5===false)?'（倍率尚未接入售價）':'')):'外事堂場所';
      }
      const e=btEconNow(type)||btEconCalc(type,lv);
      if(e){
        if(e.kind==='loyalty')return '忠誠衰退 ×'+e.loyaltyDecayMul+'（尚未接入衰退計算）';
        if(e.kind==='study')return '研讀速度 ×'+(e.studyMul||'—');
        if(e.kind==='later')return '後續開放';
        if(e.kind==='calm')return '走火 ×'+e.deviationMul+'、清丹毒 ×'+e.toxClearMul+(btCultOn('caiqx')?'（已接入）':'（尚未接入）');
        if(e.kind==='teach')return '低階修煉 ×'+e.juniorMul+(btCultOn('caicg')?'（已接入）':'（尚未接入）');
        if(e.kind==='fortune')return '凝聚力 ×'+e.cohesionMul+'、氣運 ×'+e.fortuneMul+'（尚未接入）';
        if(e.kind==='seclude')return '範圍內修煉 ×'+e.cultMul+'（尚未接入）';
        if(e.kind==='vein')return '靈氣 ×'+e.qiMul+'、資質光環 +'+btPct(e.aptitudeAura)+'%（尚未接入）';
        if(e.kind==='trial')return '戰鬥經驗 ×'+e.combatXpMul+'（尚未接入）';
        if(e.kind==='talisman')return '符籙位 '+(e.slots||0)+'（尚未接入）';
        if(e.kind==='beasts')return '靈獸位 '+(e.slots||0)+'（尚未接入）';
      }
    }catch(err){return '（計算失敗）';}
    return '見說明';
  }
  function btEffectText(type){
    try{
      if(type==='library'&&typeof ECON_BLD5!=='undefined'&&ECON_BLD5){
        return '研讀速度 +2%/級，滿 +10%（只算最高等）';
      }
    }catch(e){}
    try{if(typeof B49!=='undefined'&&B49[type]&&typeof B49[type].f==='function')return '★'+(B49[type].n||'')+'：'+B49[type].f(1);}catch(e){}
    try{
      if(typeof BUILD!=='undefined'&&BUILD[type]&&BUILD[type].desc){
        const d=String(BUILD[type].desc);const i=d.indexOf('★');if(i>=0)return d.slice(i).split('。')[0];
        return d.split('。')[0];
      }
    }catch(e){}
    try{const d=typeof econBuildingDef==='function'?econBuildingDef(type):null;if(d&&(d.note||d.effect))return d.note||d.effect.kind;}catch(e){}
    const fb={
      hall:'宗門核心；殿內閉關加速、聽道弟子同沾道韻',
      house:'弟子上限；修仙後洞府加全宗修煉；脫戰回血',
      lingtian:'種植仙草，派駐弟子可提高產量',
      qingxinge:'降低走火入魔機率、加速清丹毒',
      chuangong:'加速低階弟子修煉、提高頓悟機率',
      yinglieci:'提高氣運與凝聚力',
      laozu:'範圍內閉關修煉加成',
      lingmai:'範圍內靈氣與臨時資質光環',
      zhifatang:'降低忠誠衰退',
      waishitang:'外交／交易；升級可省買加賣',
      fuluge:'符籙／布陣台',
      lingshou:'靈獸欄位',
      huanjingta:'無死亡試煉、提高戰鬥經驗',
      biwutai:'弟子切磋、宗門大比',
      tianjietai:'提高渡劫存活與減傷',
      gongfage:'借閱與參悟功法',
      kuangchang:'範圍內採集加速',
      renwutang:'宗門任務與貢獻'
    };
    return fb[type]||'—';
  }
  function btStatus(type,st,hook){
    if(hook==='off')return st.n?'尚未接上':'尚未接上';
    if(hook==='part')return st.n?'部分生效':'本存檔未建';
    if(!st.n)return '本存檔未建';
    return '生效中';
  }
  function btNote(type,st){
    const bits=[];
    const H=BT_HOOK[type]||{};
    if(type==='house')bits.push('洞府光環依座數疊加，程式為每座 +12%、上限 +60%（說明寫 +10%、上限 +50%，未改碼，只註記）');
    if(type==='xianyuan')bits.push('修正前每座都會收成靈光並擲感應；現改為只算最高等');
    if(type==='cangku')bits.push('g23 把每座加成改成 +300（使用者曾指定），與 g20 原稿 +5000 不同；文案與生效值已對齊 +300');
    if(type==='wudao'||type==='lianwu'||type==='library'||type==='alchemy'||type==='forge'||type==='altar'){
      bits.push('專屬加成實際取最高等（v49Lv），與 A 類「可疊加」設計可能不一致');
    }
    if(H.note)bits.push(H.note);
    return bits.join('；')||'—';
  }
  function btKnownTypes(){
    const s=new Set(BT_ORDER);
    try{if(typeof BUILD!=='undefined')for(const k in BUILD)if(BUILD[k]&&BUILD[k].name)s.add(k);}catch(e){}
    try{if(typeof ECON_NEW_BUILDS!=='undefined')for(const d of ECON_NEW_BUILDS)if(d&&d.type&&!d.merge)s.add(d.type);}catch(e){}
    const skip=new Set(['vhouse','trade','well','shop','mine']);
    const out=[];
    for(const t of BT_ORDER)if(s.has(t)&&!skip.has(t))out.push(t);
    for(const t of s)if(!BT_ORDER.includes(t)&&!skip.has(t))out.push(t);
    return out;
  }
  function btRow(type){
    const st=btCount(type);
    const cls=BT_CLASS[type]||'C';
    const hook=(BT_HOOK[type]&&BT_HOOK[type].hook)||'off';
    const rg=btRangeInfo(type,st.maxLv||1);
    return {
      type,name:btName(type),effect:btEffectText(type),cls,clsLabel:btClassLabel(cls),
      n:st.n,maxLv:st.maxLv,live:btLive(type,st),range:rg.txt,rangeKind:rg.kind,rangeR:rg.R||0,
      status:btStatus(type,st,hook),hook,note:btNote(type,st),
      owner:(BT_HOOK[type]&&BT_HOOK[type].owner)||'',
      file:(BT_HOOK[type]&&BT_HOOK[type].file)||'',
      need:(BT_HOOK[type]&&BT_HOOK[type].need)||''
    };
  }
  function btRows(){return btKnownTypes().map(btRow);}
  function btTableHtml(){
    const rows=btRows();
    let h='<div class="xw-bt-wrap"><div class="dim sm" style="margin:0 0 8px">每種建築一列。範圍型選取或放置時會在地圖上畫圈；全宗效果不畫圈。狀態依程式是否真正消耗效果判定。</div>';
    h+='<div class="xw-bt-sc"><table class="xw-bt"><thead><tr>';
    for(const c of ['建築','特殊加成','類別','數量／最高等','目前實際值','範圍','狀態','備註'])h+='<th>'+c+'</th>';
    h+='</tr></thead><tbody>';
    for(const r of rows){
      const stCls=r.status==='生效中'?'ok':r.status==='尚未接上'?'off':r.status==='部分生效'?'part':'none';
      h+='<tr data-bt-type="'+btEsc(r.type)+'">';
      h+='<td>'+btEsc(r.name)+'</td>';
      h+='<td>'+btEsc(r.effect)+'</td>';
      h+='<td>'+btEsc(r.clsLabel)+'</td>';
      h+='<td>'+(r.n?('×'+r.n+'　Lv'+r.maxLv):'0')+'</td>';
      h+='<td>'+btEsc(r.live)+'</td>';
      h+='<td>'+btEsc(r.range)+'</td>';
      h+='<td class="xw-bt-st '+stCls+'">'+btEsc(r.status)+'</td>';
      h+='<td class="dim">'+btEsc(r.note)+'</td>';
      h+='</tr>';
    }
    h+='</tbody></table></div></div>';
    return h;
  }
  function btCss(){
    if(typeof document==='undefined')return;
    if(document.getElementById('xw-bt-css'))return;
    const st=document.createElement('style');st.id='xw-bt-css';
    st.textContent='#econ-sect .xw-bt-sc,.xwsect .xw-bt-sc,#xw-bt-panel .xw-bt-sc{overflow:auto;max-height:min(70vh,560px);-webkit-overflow-scrolling:touch}'
      +'.xw-bt{width:100%;border-collapse:collapse;font-size:12px;color:#f3e3c0}'
      +'.xw-bt th,.xw-bt td{border:1px solid #8a6a3a55;padding:4px 6px;vertical-align:top;text-align:left}'
      +'.xw-bt th{position:sticky;top:0;background:#2a1d12;color:#f3d48a;z-index:1;white-space:nowrap}'
      +'.xw-bt-st.ok{color:#9ee7a8;font-weight:bold}.xw-bt-st.off{color:#ff9a7a;font-weight:bold}.xw-bt-st.part{color:#ffe27a;font-weight:bold}.xw-bt-st.none{color:#cbb992}'
      +'#xw-bt-panel{display:none;position:fixed;z-index:89;left:50%;top:calc(var(--sat,0px) + 46px);transform:translateX(-50%);width:min(920px,calc(100vw - 16px));max-height:calc(100dvh - var(--sat,0px) - 54px);overflow:hidden;flex-direction:column;background:linear-gradient(180deg,#241c14f8,#16120cf4);border:1px solid #c9a35a;border-radius:4px;color:#f3e3c0;box-shadow:0 12px 40px #000c}'
      +'#xw-bt-panel.open{display:flex}#xw-bt-panel .xw-bt-hd{display:flex;align-items:center;justify-content:space-between;gap:8px;padding:8px 10px;border-bottom:1px solid #8a6a3a55}'
      +'#xw-bt-panel .xw-bt-bd{overflow:auto;flex:1;padding:8px 10px 12px}'
      +'#econ-sect{background:linear-gradient(180deg,#241c14,#16120c)}'
      +'#econ-sect .econ-sect-hd{background:#241c14}'
      +'#econ-sect .xwsect>.gt{display:none}';
    (document.head||document.documentElement).appendChild(st);
  }
  function btInject(h){
    if(!h||/data-xwsect="bonus"/.test(h))return h;
    const btn='<button type="button" class="btn" data-xwsect="bonus" id="xw-bt-tab">加成</button>';
    const pane='<div class="xwsect-pane" data-xwsect-pane="bonus" id="xw-bt-pane">'+btTableHtml()+'</div>';
    if(/<div class="xwsect-tb">/.test(h)){
      return h.replace(/<div class="xwsect-tb">([\s\S]*?)<\/div>/,function(_,inner){
        return '<div class="xwsect-tb">'+inner+btn+'</div>'+pane;
      });
    }
    return h+pane;
  }
  function btHookPanel(){
    try{
      if(typeof xwSectPauseHtml==='function'&&!xwSectPauseHtml._bt){
        const _x=xwSectPauseHtml;
        xwSectPauseHtml=function(){let h=_x.apply(this,arguments);try{h=btInject(h);}catch(e){}return h;};
        xwSectPauseHtml._bt=1;
      }
    }catch(e){}
    try{
      if(typeof econSectPanelHtml==='function'&&!econSectPanelHtml._bt){
        const _e=econSectPanelHtml;
        econSectPanelHtml=function(){let h=_e.apply(this,arguments);try{h=btInject(h);}catch(e){}return h;};
        econSectPanelHtml._bt=1;
      }
    }catch(e){}
  }
  function btRefreshPanes(){
    try{
      document.querySelectorAll('[data-xwsect-pane="bonus"]').forEach(function(p){
        const on=p.classList.contains('on');
        const sl=p.scrollLeft,st=p.scrollTop;
        p.innerHTML=btTableHtml();
        if(on)p.classList.add('on');
        p.scrollLeft=sl;p.scrollTop=st;
      });
    }catch(e){}
  }
  function btOpenStandalone(){
    btCss();
    let el=document.getElementById('xw-bt-panel');
    if(!el){
      el=document.createElement('div');el.id='xw-bt-panel';el.className='ui';
      el.innerHTML='<div class="xw-bt-hd"><div class="gt">建築加成總表</div><button type="button" class="btn" data-xw-bt="x">✕</button></div><div class="xw-bt-bd"></div>';
      (document.body||document.documentElement).appendChild(el);
      el.addEventListener('click',function(ev){if(ev.target&&ev.target.closest&&ev.target.closest('[data-xw-bt="x"]')){el.classList.remove('open');ev.preventDefault();}});
    }
    const bd=el.querySelector('.xw-bt-bd');if(bd)bd.innerHTML=btTableHtml();
    el.classList.add('open');
    return el;
  }
  function btWantType(){
    try{if(typeof buildMode==='string'&&buildMode)return buildMode;}catch(e){}
    try{if(typeof selBuilding!=='undefined'&&selBuilding!=null&&typeof bById==='function'){const b=bById(selBuilding);return b&&b.type;}}catch(e){}
    return null;
  }
  function btCenterOf(b){
    const s=btSize(b.type);return {x:b.i+s/2,y:b.j+s/2};
  }
  function btDrawR(type,lv){
    const rg=btRangeInfo(type,lv||1);
    if(rg.kind!=='radius'||!(rg.R>0))return 0;
    // 與既有聚靈／礦場圈一致：遊戲判定多為外緣距離，畫面圈用中心＋半邊長
    return rg.R+btSize(type)/2;
  }
  function btRangeTargets(){
    const L=[];const typ=btWantType();if(!typ)return L;
    const rg=btRangeInfo(typ,1);if(rg.kind!=='radius')return L;
    const col=BT_COL[typ]||'rgba(200,200,160,';
    try{
      if(S&&S.buildings){
        for(const b of S.buildings){
          if(!b||b.type!==typ||!b.built||b.broken)continue;
          const lv=(typeof blv==='function'?blv(b):b.lv)||1;
          let c=btCenterOf(b);
          if(typ==='huzhen'){try{if(typeof xhzCenter==='function')c=xhzCenter();}catch(e){}}
          const R=btDrawR(typ,lv);if(R)L.push({x:c.x,y:c.y,R,col,type:typ,lv,src:'built'});
        }
      }
    }catch(e){}
    try{
      if(typeof buildMode==='string'&&buildMode===typ&&typeof ghostOrigin==='function'){
        const g=ghostOrigin();if(g){
          const s=btSize(typ);
          L.push({x:g.i+s/2,y:g.j+s/2,R:btDrawR(typ,1),col,type:typ,lv:1,src:'ghost'});
        }
      }
    }catch(e){}
    return L.filter(c=>c.R>0);
  }
  function btRangeVisible(){
    try{if(typeof xwRangeMapVisible==='function')return xwRangeMapVisible();}catch(e){}
    try{if(!S||S.dg||S.interior)return false;if(typeof xzOn==='function'&&!xzOn())return false;}catch(e){return false;}
    return true;
  }
  function btDrawWorld(){
    if(!btRangeVisible())return;
    const L=btRangeTargets();if(!L.length)return;
    if(typeof ctx==='undefined'||typeof P!=='function')return;
    const now=(typeof performance!=='undefined'?performance.now():0)/1000,n=40,alpha=0.11,ring=0.45;
    ctx.save();
    for(const c of L){
      ctx.beginPath();
      for(let k=0;k<=n;k++){const a=k/n*6.283,p=P(c.x+Math.cos(a)*c.R,c.y+Math.sin(a)*c.R,0);k?ctx.lineTo(p.x,p.y):ctx.moveTo(p.x,p.y);}
      ctx.fillStyle=c.col+alpha+')';ctx.fill();
      ctx.setLineDash(c.src==='ghost'?[4,6]:[7,5]);ctx.lineDashOffset=-now*10;
      ctx.strokeStyle=c.col+(ring+0.12*Math.sin(now*1.6))+')';ctx.lineWidth=c.src==='ghost'?2:2.2;ctx.stroke();ctx.setLineDash([]);
    }
    ctx.restore();
  }
  function btDrawMini(){
    if(!btRangeVisible())return;
    const L=btRangeTargets();if(!L.length)return;
    if(typeof mctx==='undefined'||typeof mmPt!=='function')return;
    const k=(typeof mmBig!=='undefined'&&mmBig)?2.2:1;
    for(const c of L){
      mctx.beginPath();
      for(let q=0;q<=24;q++){const a=q/24*6.283,p=mmPt(c.x+Math.cos(a)*c.R,c.y+Math.sin(a)*c.R);q?mctx.lineTo(p.x,p.y):mctx.moveTo(p.x,p.y);}
      mctx.fillStyle=c.col+'0.16)';mctx.fill();
      mctx.strokeStyle=c.col+'0.95)';mctx.lineWidth=1.4*k;mctx.stroke();
    }
  }
  function btHookDraw(){
    try{
      if(typeof drawV045World==='function'&&!drawV045World._btRange){
        const _dw=drawV045World;
        drawV045World=function(){const r=_dw.apply(this,arguments);try{btDrawWorld();}catch(e){}return r;};
        drawV045World._btRange=1;
      }
    }catch(e){}
    try{
      if(typeof drawMinimap==='function'&&!drawMinimap._btRange){
        const _dm=drawMinimap;
        drawMinimap=function(){const r=_dm.apply(this,arguments);try{btDrawMini();}catch(e){}return r;};
        drawMinimap._btRange=1;
      }
    }catch(e){}
  }

  function btBoot(){
    btCss();btHookPanel();btHookDraw();
    try{
      if(typeof document!=='undefined'&&!document._btTab){
        document._btTab=1;
        document.addEventListener('click',function(ev){
          const t=ev.target&&ev.target.closest&&ev.target.closest('[data-xwsect]');
          if(!t)return;
          const k=t.getAttribute('data-xwsect');
          try{if(k==='bonus')btRefreshPanes();}catch(e){}
          try{
            const sect=document.getElementById('econ-sect');
            if(sect)sect.style.width=(k==='bonus')?'min(920px,calc(100vw - 16px))':'';
          }catch(e){}
        },true);
      }
    }catch(e){}
    try{
      if(window.XW){
        XW.bt={
          rows:btRows,html:btTableHtml,open:btOpenStandalone,refresh:btRefreshPanes,
          rangeList:btRangeTargets,rangeInfo:btRangeInfo,want:btWantType,
          drawWorld:btDrawWorld,status:type=>btRow(type),hooks:BT_HOOK,
          ev:function(s){return eval(s);}
        };
      }
    }catch(e){}
  }
  if(typeof document!=='undefined'&&document.readyState==='loading')document.addEventListener('DOMContentLoaded',btBoot);
  else btBoot();
  setTimeout(btBoot,0);setTimeout(btBoot,200);setTimeout(btBoot,800);
})();

// ---------- 裝備函式修復：cult_gf 的 function equip/unequip 與 g12 同名，IIFE 提升後蓋掉裝備穿脫 ----------
// 真正根因修法：cult_gf.js 應把函式改名為 gfEquip／gfUnequip（見 /tmp/statinfo/suggested_cult_equip_rename.patch）。
// 此處在 cult／net 之後做分流：行囊物品走裝備欄，功法 id 走 CultGF.equip，互不誤穿。
(function(){
  function gfItem(it){return !!(it&&(it.t==='gongfa'||it.type==='gongfa'||it.gfId)&&!(typeof GEAR!=='undefined'&&GEAR&&it.t&&GEAR[it.t]));}
  function gearItem(it){
    if(!it||gfItem(it))return false;
    if(it.slot){
      try{if(typeof ECON_SLOT16_BY_TYPE!=='undefined'&&ECON_SLOT16_BY_TYPE[it.slot])return true;}catch(e){}
      if(['w','a','c','c1','c2','f','hd','hn','pt','sh','z'].indexOf(it.slot)>=0)return true;
    }
    try{if(it.t&&typeof GEAR!=='undefined'&&GEAR[it.t])return true;}catch(e){}
    return false;
  }
  function findInv(itId){if(itId==null||typeof S==='undefined'||!S||!S.inv)return null;return S.inv.find(x=>x&&String(x.id)===String(itId))||null;}
  function looksGfId(a){
    if(a==null)return false;
    if(typeof a==='string'&&!/^\d+$/.test(a))return true;
    try{if(window.CultGF&&typeof CultGF.get==='function'&&CultGF.get(a))return true;}catch(e){}
    return false;
  }
  function gearSlots(){
    try{if(typeof ECON_SLOT16_KEYS!=='undefined'&&ECON_SLOT16_KEYS&&ECON_SLOT16_KEYS.length)return ECON_SLOT16_KEYS;}catch(e){}
    return ['hd','a','hn','pt','sh','w','f','c1','c2','c3','c4','z1','z2','z3','z4','z5'];
  }
  function gearEquip(u,itId,slot){
    if(!u)return false;
    const it=findInv(itId);
    if(!it)return false;
    if(gfItem(it)){try{toast('這是功法卷，請到功法面板學習，不能穿在裝備欄');}catch(e){}return false;}
    if(!gearItem(it)){try{toast('這件物品不能裝備');}catch(e){}return false;}
    try{if(typeof econSlot16On==='function'&&econSlot16On()&&typeof econSlot16Migrate==='function')econSlot16Migrate(u);}catch(e){}
    try{if(!(it.affixes&&it.affixes.length)&&window.XW_ECON&&XW_ECON.rollAffixes)XW_ECON.rollAffixes(it);}catch(e){}
    slot=slot||(typeof slotFor==='function'?slotFor(u,it):it.slot);
    if(!slot){try{toast('沒有對應的裝備欄');}catch(e){}return false;}
    try{if(typeof econSlot16On==='function'&&econSlot16On()&&typeof econSlot16Fits==='function'&&!econSlot16Fits(it,slot)){toast(((typeof ECON_SLOT16_NAMES!=='undefined'&&ECON_SLOT16_NAMES[slot])||slot)+'欄不能裝這件');return false;}}catch(e){}
    const why=typeof canWear==='function'?canWear(u,it,slot):'';
    if(why){try{toast(why);}catch(e){}return false;}
    u.eq=u.eq||{};
    const old=u.eq[slot];
    S.inv=S.inv.filter(x=>x!==it);
    if(old)S.inv.push(old);
    u.eq[slot]=it;
    try{if(typeof gearApply==='function')gearApply(u);}catch(e){}
    try{toast(`${nm(u)}裝備了 ${itemName(it)}`);}catch(e){}
    return true;
  }
  // 捕捉 g12／econ_gtrade／net4 已包好的 equip／unequip（含 equipSwap 臨時欄）。
  // 本 IIFE 若自行重寫滿包檢查，會蓋掉 g12 的溢出進庫，導致 B3：滿包 unequip 回 false。
  let _origEquip=null,_origUnequip=null;
  function captureOrig(){
    try{
      if(!_origEquip&&typeof equip==='function'&&!equip._xwGear)_origEquip=equip;
      if(!_origUnequip&&typeof unequip==='function'&&!unequip._xwGear)_origUnequip=unequip;
    }catch(e){}
  }
  captureOrig();
  function gearUnequip(u,slot){
    if(!u||!u.eq||!u.eq[slot])return false;
    // singlestore ON：滿包仍可卸，脫下件走臨時欄／溢出 S.store.gear（主角與弟子皆同）；=0 維持舊拒絕
    if(_origUnequip)return _origUnequip(u,slot);
    if(typeof XW_STORE!=='undefined'&&XW_STORE&&typeof XW_STORE.equipSwap==='function'&&(typeof xwStoreOn!=='function'||xwStoreOn())){
      const r=XW_STORE.equipSwap(u,null,slot);
      if(r&&r.ok){if(r.to==='gear')try{toast('行囊已滿，已放入宗門裝備庫');}catch(e){}return true;}
    }
    if(typeof xwStoreOn==='function'&&xwStoreOn()&&typeof xwInvAdd==='function'){
      const r=xwInvAdd(u.eq[slot],'unequip');
      if(!r||!r.ok){try{toast('行囊已滿');}catch(e){}return false;}
      if(r.to==='gear')try{toast('行囊已滿，已放入宗門裝備庫');}catch(e){}
      u.eq[slot]=null;
      try{if(typeof gearApply==='function')gearApply(u);}catch(e){}
      return true;
    }
    const _icap=typeof econInvCap==='function'?econInvCap(u):(typeof TUNE!=='undefined'&&TUNE&&TUNE.invCap)||99;
    if(S.inv.length>=_icap){try{toast('行囊已滿');}catch(e){}return false;}
    S.inv.push(u.eq[slot]);u.eq[slot]=null;
    try{if(typeof gearApply==='function')gearApply(u);}catch(e){}
    return true;
  }
  function dispatchEquip(u,a,b){
    const it=findInv(a);
    if(it&&gfItem(it)){try{toast('這是功法卷，請到功法面板學習，不能穿在裝備欄');}catch(e){}return false;}
    if(!it&&looksGfId(a)&&window.CultGF&&typeof CultGF.equip==='function')return CultGF.equip(u,a,b);
    if(_origEquip)return _origEquip(u,a,b);
    return gearEquip(u,a,b);
  }
  function dispatchUnequip(u,a,b){
    if(a==='main'||a==='aux'){if(window.CultGF&&typeof CultGF.unequip==='function')return CultGF.unequip(u,a,b);}
    const gs=gearSlots();
    if(gs.indexOf(a)>=0||(u&&u.eq&&u.eq[a])){
      if(_origUnequip)return _origUnequip(u,a);
      return gearUnequip(u,a);
    }
    if(window.CultGF&&typeof CultGF.unequip==='function')return CultGF.unequip(u,a,b);
    if(_origUnequip)return _origUnequip(u,a);
    return gearUnequip(u,a);
  }
  function wrap(name,fn,ret){
    let out=fn;
    try{if(typeof netFwd==='function')out=netFwd(name,fn,ret,{unit:true});}catch(e){}
    out._xwGear=1;
    return out;
  }
  function install(){
    try{
      captureOrig();
      if(typeof equip==='function'&&equip._xwGear&&typeof unequip==='function'&&unequip._xwGear)return;
      equip=wrap('equip',dispatchEquip,true);
      unequip=wrap('unequip',dispatchUnequip,true);
    }catch(e){try{console.warn('xw gear dispatch',e);}catch(e2){}}
  }
  try{
    install();
    setTimeout(install,0);setTimeout(install,450);setTimeout(install,1400);
  }catch(e){}
})();

// ---------- 功法學習／傳授：未選角色與英文錯誤碼 ----------
// 根因在 cult_gf.js（REASON_ZH 幾乎只有 already；give 沒弟子時 fail('no-unit')；
// bindUi 在 selUnit() 為空時直接 return）。此處不改 cult*，只在後期分流與中文化。
(function(){
  const ZH={
    'no-unit':'找不到可操作的角色',
    'no-disciple':'請先選擇弟子',
    already:'已習得此功法',
    'flag-off':'功法系統未開啟',
    client:'請由房主執行此操作',
    unknown:'找不到這部功法',
    realm:'境界不足，尚不能學習此功法',
    'no-manual':'沒有可用的功法卷',
    busy:'正在參悟其他功法',
    'confirmation-required':'請先確認後再執行',
    'no-econ':'經濟系統未就緒',
    'quote-changed':'借閱報價已變更，請重新確認',
    operation:'無法執行這個操作',
    slot:'技能欄位無效',
    slots:'輔修欄位已滿',
    wire:'連線異常，已改在本機重試',
    actor:'目前不能操作這個角色',
    'not-learned':'尚未學會此功法',
    'not-learned-active':'尚未解鎖此招式',
    'is-main':'已是主修功法',
    mismatch:'功法不符',
    'not-held':'手中沒有這卷功法',
    'not-borrowed':'尚未借閱此卷',
    'no-loan':'沒有借卷可歸還',
    'origin-unrecorded':'此卷來源未登記，無法歸還',
    'passive-no-bar':'被動功法不能裝上技能欄',
    'policy-unavailable':'功法閣規則尚未載入',
    'inventory-id-exhausted':'行囊物品編號已用盡',
    disconnected:'尚未連上房主',
    'request-conflict':'重複的操作請求',
    'already-processed':'這項操作已經處理過了',
    'journal-capacity':'操作紀錄已滿，請稍後再試',
    'no-result':'沒有回傳結果',
    'no-stock':'館藏已借完',
    'no-slot':'研習席位已滿',
    'no-hall':'需先建成功法閣才能參悟',
    insufficient:'俸祿不足，付不起借閱費',
    post:'職位不足，無法借閱此品階',
    contrib:'貢獻度不足，無法借閱此品階',
    no:'無法完成此操作'
  };
  function playerOf(){
    try{if(typeof player==='function'){const p=player();if(p&&!p.dead)return p;}}catch(e){}
    try{if(window.XW&&typeof XW.player==='function'){const p=XW.player();if(p&&!p.dead)return p;}}catch(e){}
    return null;
  }
  function unitOf(id){
    if(id==null)return null;
    try{if(typeof unitById==='function'){const u=unitById(+id)||unitById(id);if(u)return u;}}catch(e){}
    try{
      const st=(typeof S!=='undefined'&&S)||(window.XW&&XW.S);
      if(st&&st.units)return st.units.find(x=>x&&String(x.id)===String(id))||null;
    }catch(e){}
    return null;
  }
  function selectedUnits(){
    const out=[];
    try{
      const ids=(typeof selUnits!=='undefined')?selUnits:((window.XW&&XW.sel)||window.selUnits);
      if(ids&&ids.length){for(const id of ids){const u=unitOf(id);if(u&&!u.dead)out.push(u);}}
    }catch(e){}
    return out;
  }
  function bagUnitOf(){
    try{
      if(typeof bagUnit!=='undefined'&&bagUnit!=null){
        const u=unitOf(bagUnit);if(u&&!u.dead)return u;
      }
    }catch(e){}
    return null;
  }
  function learnActor(u){
    if(u&&!u.dead)return u;
    const b=bagUnitOf();if(b)return b;
    const sel=selectedUnits();if(sel[0])return sel[0];
    return playerOf();
  }
  function giveTargetOf(from,i){
    if(i&&i.to!=null){const t=unitOf(i.to);if(t&&!t.dead&&t!==from)return t;}
    const sel=selectedUnits();
    for(const u of sel){if(u&&u!==from&&(u.kind==='disciple'||u.kind==='player')&&!u.dead)return u;}
    const b=bagUnitOf();
    if(b&&b!==from&&(b.kind==='disciple'||b.kind==='player')&&!b.dead)return b;
    return null;
  }
  function zhOf(r){
    const k=(r&&typeof r==='object')?(r.reason||r.code):r;
    if(k==null||k==='')return null;
    return ZH[k]||null;
  }
  function install(){
    try{
      if(typeof reasonText==='function'&&!reasonText._xwZh){
        const _rt=reasonText;
        reasonText=function(r){return _rt.apply(this,arguments)||zhOf(r);};
        reasonText._xwZh=1;
        try{if(window.CultGF)CultGF.reasonText=reasonText;}catch(e){}
      }
    }catch(e){}
    try{
      if(typeof libReason==='function'&&!libReason._xwZh){
        const _lr=libReason;
        libReason=function(r){const t=_lr.apply(this,arguments);if(t&&String(t).indexOf('未完成：')!==0)return t;return zhOf(r)||t;};
        libReason._xwZh=1;
      }
    }catch(e){}
    try{
      if(typeof announce==='function'&&!announce._xwZh){
        const _an=announce;
        announce=function(r){
          const zh=typeof reasonText==='function'?reasonText(r):zhOf(r);
          const t=r&&r.pending?'等待房主確認':r&&r.ok?'操作完成':(zh||('未完成：'+(r&&(r.reason||r.code)||'未知錯誤')));
          try{if(window.CultGF)CultGF._actionResult=t;}catch(e){}
          try{if(!r||!r.ok){if(t)toast(t);}else if(zh)toast(zh);}catch(e){}
          return r;
        };
        announce._xwZh=1;
      }
    }catch(e){}
    try{
      if(typeof selUnit==='function'&&!selUnit._xwId){
        const _su=selUnit;
        selUnit=function(){
          let u=null;
          try{u=_su.apply(this,arguments);}catch(e){}
          if(u)return u;
          const sel=selectedUnits();if(sel[0])return sel[0];
          return playerOf();
        };
        selUnit._xwId=1;
      }
    }catch(e){}
    function announceZh(r){
      const zh=zhOf(r)||(typeof reasonText==='function'?reasonText(r):null);
      const t=r&&r.pending?'等待房主確認':r&&r.ok?'操作完成':(zh||('未完成：'+(r&&(r.reason||r.code)||'未知錯誤')));
      try{if(window.CultGF)CultGF._actionResult=t;}catch(e){}
      try{if(!r||!r.ok){if(t)toast(t);}else if(zh)toast(zh);}catch(e){}
      return r;
    }
    try{
      const C=window.CultGF;
      if(C&&typeof C.sendAction==='function'&&!C.sendAction._xwUnit){
        const _sa=C.sendAction;
        const wrapped=function(u,i){
          i=i||{};
          if(i.op==='learn'){
            u=learnActor(u);
            if(!u)return announceZh({ok:false,reason:'no-unit'});
          }else if(i.op==='give'){
            const me=playerOf();
            let to=giveTargetOf(me,i);
            if(!to){
              const b=bagUnitOf();
              if(b&&b!==me&&!b.dead)to=b;
            }
            if(!to)return announceZh({ok:false,reason:'no-disciple'});
            const from=me||learnActor(u);
            i=Object.assign({},i,{to:to.id});
            u=from;
          }else if(!u){
            u=learnActor(null);
          }
          const r=_sa.call(C,u,i);
          try{
            if(C&&typeof C._actionResult==='string'&&C._actionResult.indexOf('未完成：')===0){
              const zh2=zhOf(r);
              if(zh2){C._actionResult=zh2;try{toast(zh2);}catch(e0){}}
            }
          }catch(e){}
          return r;
        };
        wrapped._xwUnit=1;
        C.sendAction=wrapped;
      }
    }catch(e){}
    try{
      if(typeof document!=='undefined'&&document.addEventListener&&!document._xwGfClick){
        document.addEventListener('click',function(ev){
          const t=ev.target&&ev.target.closest&&ev.target.closest('[data-gf]');
          if(!t)return;
          const act=t.getAttribute('data-gf'),id=t.getAttribute('data-id');
          if(act!=='learn'&&act!=='give'&&act!=='sell')return;
          ev.stopPropagation();
          try{if(ev.stopImmediatePropagation)ev.stopImmediatePropagation();}catch(e){}
          const i={op:act,gfId:id};
          if(act==='learn')i.src='bag';
          try{
            const C=window.CultGF;
            if(C&&typeof C.sendAction==='function')C.sendAction(null,i);
          }catch(e){try{console.warn('xw gf click',e);}catch(e2){}}
          try{if(window.CultGF&&typeof CultGF.paint==='function')CultGF.paint();}catch(e){}
          try{bagKey=null;if(typeof renderBag==='function')renderBag();}catch(e){}
        },true);
        document._xwGfClick=1;
      }
    }catch(e){}
  }
  try{install();setTimeout(install,0);setTimeout(install,450);setTimeout(install,1400);}catch(e){}
})();
