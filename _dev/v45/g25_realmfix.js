// ================== g25_realmfix.js：元嬰起閉關扣高階靈石；一般突破停在地仙 ==================
// 不改 cult*：以 wrap 補上 TUNE.highLs 扣費，並把一般突破上限鎖在 MAX_REALM（地仙）。
// 踏仙梯（cult_xtl.js）以 ascended 標記飛升，不把 realm 設成 11，不受此上限阻擋。
(function(){
  function capRealm(){return typeof MAX_REALM==='number'?MAX_REALM:10;}
  function highCost(r){try{return (typeof TUNE!=='undefined'&&TUNE.highLs&&TUNE.highLs[r])||0;}catch(e){return 0;}}
  function haveLs(){try{return Math.floor((typeof S!=='undefined'&&S&&S.res&&S.res.lingshi)||0);}catch(e){return 0;}}
  function nextName(r){try{return (REALMS[r+1]&&REALMS[r+1].n)||'';}catch(e){return '';}}
  function who(u){try{return typeof nm==='function'?nm(u):'';}catch(e){return '';}}

  function clampCfg(){try{if(typeof CULT_CFG!=='undefined'&&CULT_CFG)CULT_CFG.maxRealm=capRealm();}catch(e){}}
  clampCfg();

  if(typeof cultRealmOpen==='function'){const _ro=cultRealmOpen;cultRealmOpen=function(u){clampCfg();if(!u||(u.realm||0)>=capRealm())return false;return _ro.apply(this,arguments);};}

  if(typeof cultPayBreak==='function'){const _pb=cultPayBreak;cultPayBreak=function(u){
    _pb.apply(this,arguments);
    try{
      if(u&&!u.cultBrk)u._cultHighLsPaid=null; // N5: 不在閉關中的付款＝新嘗試（含擲骰失敗那次），重新收費
      if(!u||u._cultHighLsPaid!=null)return;
      const r=u.realm,L=highCost(r);
      if(L&&r>=6&&r<capRealm()&&typeof S!=='undefined'&&S&&S.res){
        S.res.lingshi-=L;
        u._cultHighLsPaid=r;
      }
    }catch(e){}
  };}

  if(typeof cultStartBreak==='function'){const _cs=cultStartBreak;cultStartBreak=function(u,auto,_tb){
    clampCfg();
    if(u&&!u.dead&&!u.cultBrk){
      const r=u.realm||0;
      if(r>=capRealm()){
        if(!auto&&typeof toast==='function')toast(who(u)+'已達本版本最高境界（地仙大圓滿後請闖踏仙梯飛升）');
        return false;
      }
      const L=highCost(r);
      if(L){
        const have=haveLs();
        if(have<L){
          if(!auto&&typeof toast==='function')toast(who(u)+'靈石不足，突破「'+nextName(r)+'」需 '+L+'（目前 '+have+'，還缺 '+(L-have)+'）');
          return false;
        }
      }
    }
    return _cs.apply(this,arguments);
  };}

  if(typeof doBreak==='function'){const _db=doBreak;doBreak=function(u){
    let hid=null;
    if(u&&u._cultHighLsPaid!=null&&typeof TUNE!=='undefined'&&TUNE.highLs){hid=TUNE.highLs;TUNE.highLs=null;}
    try{return _db.apply(this,arguments);}
    finally{if(hid)TUNE.highLs=hid;if(u)u._cultHighLsPaid=null;}
  };}

  try{if(typeof UNIT_KEEP!=='undefined'&&UNIT_KEEP.indexOf('_cultHighLsPaid')<0)UNIT_KEEP.push('_cultHighLsPaid');}catch(e){}
  try{if(window.XW&&Array.isArray(XW.UNIT_KEEP)&&XW.UNIT_KEEP.indexOf('_cultHighLsPaid')<0)XW.UNIT_KEEP.push('_cultHighLsPaid');}catch(e){}
})();

// 雷劫v2（創意家2026-11-10定）：預設開啟，取代舊 tribulation
try{if(typeof CULT_TRIB2!=="undefined"&&CULT_TRIB2)CULT_TRIB2.on=true;}catch(e){}
