// ================== net21：踏仙梯聯機殼（host 事件廣播＋晚加入 elapsed；客機只播視覺）==================
// 不改 cult_xtl*.js／build.py／g*。不重做 FX。遠端 intent 只允許 a/id，忽略一切作弊參數。
// host 驗權後硬寫 start(u,{netAuthorized:true})，不把 client 的 flag 往下傳。
const NET21={v:2,sent:0,rx:0,late:0,intent:0,awaitCanStartNp:false,lastBlock:null,lastAuth:null};
const NET_XTL_LIVE=['ascended','cultXtlWeak'];
function netXtlApi(){return window.XW_XTL||window.CultXTL||(window.Cult&&Cult.xtl)||null;}
function netXtlClean(ev){
  if(!ev||typeof ev!=='object')return ev;
  const o={};for(const k in ev){if(k==='type'||k==='t')continue;o[k]=ev[k];}
  if(o.runId==null&&o.id!=null)o.runId=o.id;
  if(o.id==null&&o.runId!=null)o.id=o.runId;
  return o;
}
function netXtlBroadcast(evName,payload,extra){
  if(typeof NET==='undefined'||NET.role!=='host'||!NET.tr)return false;
  const m=Object.assign({t:'xtl',ev:evName,p:netXtlClean(payload)},extra||{});
  try{NET.tr.broadcast(m);NET21.sent++;return true;}catch(e){return false;}
}
function netXtlCidOk(cid){
  if(cid==null||typeof NET==='undefined'||NET.role!=='host'||!NET.cid2pk||!NET.players)return false;
  const pk=NET.cid2pk.get(cid);
  if(!pk)return false;
  const p=NET.players.get(pk);
  if(!p||p.cid!==cid)return false;
  if(p.host)return (p.pkey||p.pk)===NET.pkey;
  return !!p.online;
}
function netXtlSendLate(cid){
  if(!netXtlCidOk(cid)||!NET.tr)return;
  const api=netXtlApi();if(!api||typeof api.snapshotRun!=='function')return;
  const snap=api.snapshotRun();if(!snap||!snap.payload)return;
  try{NET.tr.send(cid,{t:'xtl',ev:'start',p:netXtlClean(snap.payload),elapsed:snap.elapsed||0,late:1});NET21.late++;}catch(e){}
}
function netXtlOwn(pk,u){
  if(!u||!pk)return false;
  if(u.np)return u.np===pk;
  if(u.kind==='player'&&!u.np){
    const p=NET.players&&NET.players.get(pk);
    return !!(p&&p.host&&(p.pkey||p.pk)===NET.pkey);
  }
  return false;
}
function netXtlIntent(pk,i){
  const api=netXtlApi();if(!api||typeof api.start!=='function')return false;
  let u=null;
  try{if(i&&i.id!=null&&typeof unitById==='function')u=unitById(+i.id);}catch(e){}
  if(!u){
    try{const p=NET.players.get(pk);u=(p&&p.host&&(p.pkey||p.pk)===NET.pkey&&typeof player==='function')?player():(typeof netAvatarOf==='function'?netAvatarOf(pk):null);}catch(e2){}
  }
  if(!netXtlOwn(pk,u))return false;
  // 遠端只承認 a/id：force／forceStats／success／stats／outcome／plan／seed 一律丟棄，不傳入 start
  const gate=api.canStart?api.canStart(u):{ok:false,reason:'no-api'};
  if(gate&&gate.ok){
    const r=api.start(u,{netAuthorized:true});
    NET21.intent++;NET21.awaitCanStartNp=false;NET21.lastBlock=null;
    NET21.lastAuth={id:u&&u.id,np:u&&u.np||null,netAuthorized:true,dropped:['force','forceStats','success']};
    try{
      const me=typeof player==='function'?player():null;
      if(r&&r.ok&&me&&u&&me.id!==u.id&&typeof api.playFromNet==='function'){
        const snap=api.snapshotRun&&api.snapshotRun();
        if(snap&&snap.payload)api.playFromNet(snap.payload,{observer:true,elapsed:snap.elapsed||0});
      }
    }catch(e4){}
    return !!(r&&r.ok);
  }
  NET21.lastBlock={reason:(gate&&gate.reason)||'denied',id:u&&u.id,np:u&&u.np||null};
  return false;
}
function netXtlApplyClient(m){
  if(typeof NET==='undefined'||NET.role!=='client')return;
  const api=netXtlApi();if(!api||!m||!m.p)return;
  const opt={};
  if(m.elapsed!=null)opt.elapsed=+m.elapsed;
  try{
    const me=(typeof netAvatarOf==='function'&&NET.pkey&&netAvatarOf(NET.pkey))||(typeof player==='function'?player():null);
    const uid=m.p.unitId!=null?m.p.unitId:null;
    if(opt.observer==null&&me&&uid!=null)opt.observer=me.id!==uid&&String(me.id)!==String(uid);
  }catch(e){}
  NET21.rx++;
  // 過場特效僅飛升者本機播放（observer → tipOnly）；此處仍同步狀態／結算投影
  if(m.ev==='start'&&typeof api.playFromNet==='function'){
    const r=api.playFromNet(m.p,opt);
    try{
      if(opt.observer&&typeof toast==='function'){
        const nm=(m.p&&(m.p.name||m.p.n))||'有人';
        toast(nm+'正在飛升');
      }
    }catch(eT){}
    return r;
  }
  else if(m.ev==='strike'&&typeof api.netStrike==='function')api.netStrike(m.p,opt);
  else if(m.ev==='end'&&typeof api.netEnd==='function')api.netEnd(m.p,opt);
}
function netXtlCopyFields(d){
  if(!d||typeof S==='undefined'||!S)return;
  if(S.ascended!=null)d.ascended=!!S.ascended;
  const byId=new Map();
  try{if(S.units)for(const u of S.units)if(u&&u.id!=null)byId.set(u.id,u);}catch(e){}
  try{if(S.dg&&S.dg.W&&S.dg.W.units)for(const u of S.dg.W.units)if(u&&u.id!=null)byId.set(u.id,u);}catch(e2){}
  const lists=[];if(d.units)lists.push(d.units);if(d.dg&&d.dg.W&&d.dg.W.units)lists.push(d.dg.W.units);
  for(const list of lists){
    for(const o of list){
      if(!o||o.id==null)continue;
      const u=byId.get(o.id);if(!u)continue;
      if(u.ascended!=null)o.ascended=!!u.ascended;
      if(u.cultXtlWeak)o.cultXtlWeak=JSON.parse(JSON.stringify(u.cultXtlWeak));
      else if(Object.prototype.hasOwnProperty.call(o,'cultXtlWeak')&&!u.cultXtlWeak)o.cultXtlWeak=null;
    }
  }
}
function netXtlPatchStart(api){
  if(!api||typeof api.start!=='function'||api.start._net21)return api&&api.start;
  const _st=api.start;
  api.start=function(u,opt){
    if(typeof NET!=='undefined'&&NET.role==='client'){
      const target=u||(typeof player==='function'?player():null);
      try{if(typeof netIntent==='function')netIntent({a:'xtl',id:target&&target.id});}catch(e){}
      return {ok:false,reason:'client',sent:true};
    }
    return _st.apply(this,arguments);
  };
  api.start._net21=1;
  return api.start;
}
function netXtlInstall(){
  if(NET21._in)return;NET21._in=1;
  if(typeof NET_LIVE_U!=='undefined'&&Array.isArray(NET_LIVE_U)){
    for(const k of NET_XTL_LIVE)if(NET_LIVE_U.indexOf(k)<0)NET_LIVE_U.push(k);
  }
  if(window.Cult&&typeof Cult.on==='function'){
    Cult.on(function(ev){
      if(!ev||typeof NET==='undefined'||NET.role!=='host')return;
      if(ev.type==='cult:xtlStart')netXtlBroadcast('start',ev);
      else if(ev.type==='cult:xtlStrike')netXtlBroadcast('strike',ev);
      else if(ev.type==='cult:xtlEnd')netXtlBroadcast('end',ev);
    });
  }
  if(typeof netClientRxExtra==='function'){
    const _x=netClientRxExtra;netClientRxExtra=function(m){
      if(m&&m.t==='xtl'){try{netXtlApplyClient(m);}catch(e){}return;}
      return _x.apply(this,arguments);
    };
  }
  if(typeof netHostRx==='function'){
    const _rx=netHostRx;netHostRx=function(cid,m){
      if(m&&m.t==='xtl')return; // 偽造 xtl 事件不由 host 結算
      if(m&&m.t==='hello'&&(m.proto!=null||m.ver!=null||m.bh!=null)){
        try{
          if(typeof NET_PROTO!=='undefined'&&m.proto!=null&&m.proto!==NET_PROTO)return _rx.apply(this,arguments);
          if(typeof XW_VER!=='undefined'&&m.ver!=null&&m.ver!==XW_VER)return _rx.apply(this,arguments);
        }catch(e){}
      }
      const r=_rx.apply(this,arguments);
      try{
        if(m&&(m.t==='hello'||m.t==='need')&&typeof NET!=='undefined'&&NET.role==='host'&&netXtlCidOk(cid))netXtlSendLate(cid);
      }catch(e){}
      return r;
    };
  }
  if(typeof netApplyIntent0==='function'){
    const _in=netApplyIntent0;netApplyIntent0=function(pk,i){
      if(i&&i.a==='xtl'){try{return netXtlIntent(pk,i);}catch(e){return false;}}
      return _in.apply(this,arguments);
    };
  }
  if(typeof netCast==='function'){
    const _cast=netCast;netCast=function(m){
      try{if(m&&m.t==='st'&&typeof NET!=='undefined'&&NET.role==='host'&&typeof S!=='undefined'&&S)m.ascended=!!S.ascended;}catch(e){}
      return _cast.apply(this,arguments);
    };
  }
  if(typeof netApplySt==='function'){
    const _st=netApplySt;netApplySt=function(m){
      const r=_st.apply(this,arguments);
      try{
        if(m&&Object.prototype.hasOwnProperty.call(m,'ascended')&&typeof NET!=='undefined'&&NET.role==='client'&&typeof S!=='undefined'&&S)
          S.ascended=!!m.ascended;
      }catch(e){}
      return r;
    };
  }
  if(typeof snapshot==='function'){
    const _sn=snapshot;snapshot=function(){
      const d=_sn.apply(this,arguments);
      try{netXtlCopyFields(d);}catch(e){}
      return d;
    };
  }
  const api=netXtlApi();
  const wrapped=netXtlPatchStart(api);
  try{if(window.CultXTL&&window.CultXTL!==api)netXtlPatchStart(window.CultXTL);}catch(e){}
  try{if(window.Cult&&Cult.xtl&&Cult.xtl!==api)netXtlPatchStart(Cult.xtl);}catch(e2){}
  try{if(window.Cult&&wrapped)Cult.startXtl=wrapped;}catch(e3){}
  try{
    if(window.XW&&XW.net&&!XW.net.xtl){
      Object.defineProperty(XW.net,'xtl',{configurable:true,get:function(){return NET21;}});
    }
  }catch(e4){}
  if(typeof XW045==='function'){
    const _xw=XW045;XW045=function(){
      const o=_xw.apply(this,arguments);
      try{if(o&&o.net&&!o.net.xtl)Object.defineProperty(o.net,'xtl',{configurable:true,get:function(){return NET21;}});}catch(e5){}
      return o;
    };
  }
}
try{netXtlInstall();}catch(e){console.warn('[net21] install',e);}
