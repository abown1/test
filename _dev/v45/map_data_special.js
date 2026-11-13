// ================== 特殊副本資料（與共用 MAP_DGS 分開；每本獨立曲線／房間／門／獎勵）==================
// 新增下一本：在 MAP_SPECIAL 加一筆，並在 MAP_TUNE 放同名可調項；邏輯走 map_special.js。
var MAP_SPECIAL={
  xf:{
    id:'xf',
    n:'仙凡之門',
    classic:true,            // 房間生成沿用 g13 genDungeon，再由 map_special 補門／夾制
    gateRealm:4,             // 叩門境界＝煉氣；只有首領用這個境
    roster:['xfguard','wisp','golem','xfguard'],
    boss:{type:'xfboss',n:'試煉王',realm:4,sub:1,v49lq:1},  // 名牌動態：REALMS + v52SubName（sub 1＝煉氣二層，勿寫死中期）
    realm:{
      minionMin:2,           // 大武師
      minionCap:3,           // 宗師
      eliteRealm:3,
      eliteSub:2,            // 宗師後期
      eliteChance:0.15,
      trashSubMax:2          // 散兵最多「後期」，避免全是圓滿
    },
    layout:{
      rooms:5,
      doorInset:2.2,         // 僅作找不到開口時的後備，不再當主要落點
      bossSafe:8,            // 次要：開口距首領太近才再推開
      visibleDoor:true,
      gateN:'試煉門',
      gateOpen:'試煉門',
      gateShut:'試煉門（未開）'
    },
    evac:{use:'ent'},        // 沿用 g* D.ent 撤離陣
    exit:{use:'exitP'},      // 沿用 g* D.exitP 出口傳送陣
    rewards:{xfl:true,desc:'闖過可得仙凡令（既有擊殺掉落，不改 g*）'},
    pack:{min:3,max:5,bossAdds:4,partyFair:8}
  },
  dg_qingyan:{
    id:'dg_qingyan',
    n:'青巖秘窟',
    classic:true,
    gateRealm:4,
    roster:['wolf','boar','tiger'],
    boss:{type:'king',n:'青巖妖王',realm:4,sub:0,v49lq:1},  // 名牌動態：REALMS + v52SubName（sub 0＝煉氣一層，勿寫死初期）
    realm:{
      minionMin:2,
      minionCap:3,
      eliteRealm:3,
      eliteSub:2,
      eliteChance:0.12,
      trashSubMax:2
    },
    layout:{
      rooms:4,
      doorInset:2.2,
      bossSafe:8,
      visibleDoor:true,
      gateN:'首領殿門',
      gateOpen:'首領殿門',
      gateShut:'首領殿門（已封）'
    },
    evac:{use:'ent'},
    exit:{use:'exitP'},
    rewards:{desc:'青巖秘窟既有掉落（不改 g*）'},
    pack:{min:3,max:5,bossAdds:3,partyFair:8}
  },
  st_luoxia:{
    id:'st_luoxia',
    n:'落霞仙尊之墓',
    classic:true,
    story:1,
    chapter:1,
    gateRealm:5,
    roster:['golem','wisp','xfguard'],
    boss:{type:'golem',n:'守護傀儡·天罡',realm:6,sub:0,v49lq:1},
    realm:{
      minionMin:5,
      minionCap:5,
      eliteRealm:5,
      eliteSub:6,
      eliteChance:0.10,
      trashSubMax:8
    },
    layout:{
      rooms:5,
      doorInset:2.2,
      bossSafe:8,
      visibleDoor:true,
      gateN:'墓門',
      gateOpen:'墓門',
      gateShut:'墓門（已封）'
    },
    evac:{use:'ent'},
    exit:{use:'exitP'},
    rewards:{desc:'落霞仙尊之墓既有掉落（規格未另訂獎勵，不改 g*）'},
    pack:{min:3,max:5,bossAdds:3,partyFair:8}
  },
  st_zangxian:{
    id:'st_zangxian',n:'葬仙萬骨荒塚',classic:true,story:2,chapter:2,
    gateRealm:7,roster:['golem','wisp','xfguard'],
    boss:{type:'golem',n:'萬骨冥王',realm:8,sub:0,v49lq:1},
    realm:{minionMin:7,minionCap:7,eliteRealm:7,eliteSub:9,eliteChance:0.10,trashSubMax:9},
    layout:{rooms:5,doorInset:2.2,bossSafe:8,visibleDoor:true,gateN:'荒塚門',gateOpen:'荒塚門',gateShut:'荒塚門（已封）'},
    evac:{use:'ent'},exit:{use:'exitP'},
    rewards:{desc:'葬仙萬骨荒塚既有掉落（規格未另訂獎勵）'},
    pack:{min:3,max:5,bossAdds:3,partyFair:8}
  },
  st_wuxing:{
    id:'st_wuxing',n:'五行通天靈脈',classic:true,story:3,chapter:3,
    gateRealm:9,roster:['xfguard','wisp','golem'],
    boss:{type:'xfboss',n:'通天靈脈守使',realm:10,sub:0,v49lq:1},
    realm:{minionMin:9,minionCap:9,eliteRealm:9,eliteSub:9,eliteChance:0.10,trashSubMax:9},
    layout:{rooms:5,doorInset:2.2,bossSafe:8,visibleDoor:true,gateN:'靈脈門',gateOpen:'靈脈門',gateShut:'靈脈門（已封）'},
    evac:{use:'ent'},exit:{use:'exitP'},
    rewards:{desc:'五行通天靈脈既有掉落；天道玉髓採集即生效，不進背包'},
    pack:{min:3,max:5,bossAdds:3,partyFair:8}
  }
};
// 第二、三章預設隱藏；旗沒開就不註冊 DGS／入口。機制見 map_special.js。
var MAP_STORY_CHAPS={
  st_luoxia:{chapter:1,n:'落霞仙尊之墓',kind:'st_luoxia'},
  st_zangxian:{chapter:2,n:'葬仙萬骨荒塚',kind:'st_zangxian',hidden:true},
  st_wuxing:{chapter:3,n:'五行通天靈脈',kind:'st_wuxing',hidden:true}
};
function mapSpecialDef(kind){
  try{return (MAP_SPECIAL&&MAP_SPECIAL[kind])||null;}catch(e){return null;}
}
function mapSpecialKindOf(D){
  try{const k=D&&D.kind;if(k&&mapSpecialDef(k))return k;}catch(e){}
  return null;
}
function mapSpecialTune(kind){
  kind=kind||'xf';
  const D=mapSpecialDef(kind)||{};
  const T=(typeof MAP_TUNE!=='undefined'&&MAP_TUNE&&MAP_TUNE[kind])||{};
  const R=D.realm||{}, L=D.layout||{}, P=D.pack||{}, B=D.boss||{};
  return {
    kind:kind,
    n:D.n||kind,
    bossType:B.type||'xfboss',
    bossN:T.bossN||B.n||'試煉王',
    bossRealm:T.bossRealm!=null?T.bossRealm|0:(B.realm!=null?B.realm|0:4),
    bossSub:T.bossSub!=null?T.bossSub|0:(B.sub!=null?B.sub|0:1),
    bossDisplay:B.display||null,
    minionMin:T.minionMin!=null?T.minionMin|0:(R.minionMin!=null?R.minionMin|0:2),
    minionCap:T.minionCap!=null?T.minionCap|0:(R.minionCap!=null?R.minionCap|0:3),
    eliteRealm:T.eliteRealm!=null?T.eliteRealm|0:(R.eliteRealm!=null?R.eliteRealm|0:3),
    eliteSub:T.eliteSub!=null?T.eliteSub|0:(R.eliteSub!=null?R.eliteSub|0:2),
    eliteChance:T.eliteChance!=null?+T.eliteChance:(R.eliteChance!=null?+R.eliteChance:0.15),
    trashSubMax:R.trashSubMax!=null?R.trashSubMax|0:2,
    doorInset:T.doorInset!=null?+T.doorInset:(L.doorInset!=null?+L.doorInset:2.2),
    bossSafe:T.bossSafe!=null?+T.bossSafe:(L.bossSafe!=null?+L.bossSafe:8),
    rooms:T.rooms!=null?T.rooms|0:(L.rooms!=null?L.rooms|0:5),
    visibleDoor:L.visibleDoor!==false,
    gateN:T.gateN||L.gateN||'試煉門',
    gateOpen:T.gateOpen||L.gateOpen||L.gateN||'試煉門',
    gateShut:T.gateShut||L.gateShut||((T.gateN||L.gateN||'試煉門')+'（未開）'),
    packMin:T.packMin!=null?T.packMin|0:(P.min!=null?P.min|0:3),
    packMax:T.packMax!=null?T.packMax|0:(P.max!=null?P.max|0:5),
    bossAdds:T.bossAdds!=null?T.bossAdds|0:(P.bossAdds!=null?P.bossAdds|0:4),
    partyFair:T.partyFair!=null?T.partyFair|0:(P.partyFair!=null?P.partyFair|0:8),
    partyHpPer:T.partyHpPer!=null?+T.partyHpPer:0.08,
    roster:(D.roster&&D.roster.slice)?D.roster.slice():null,
    evac:D.evac||{use:'ent'},
    exit:D.exit||{use:'exitP'},
    rewards:D.rewards||null
  };
}
