// ================== g28_dglabel.js：副本入口／清單／介紹／HUD 標示「特殊副本／特殊試煉」與境界 ==================
// 創意家 2026-11-10：「沒有標示特殊副本與境界」。不改 map*/cult*/econ*/net*；不包名牌（名牌由 map_enemies mapPlateInstall／mapRaidPlateName 與 map_special 負責）。
// 特殊副本境界只讀既有資料：mapSpecialTune（小怪）＋ mapSpecialBossRS（首領；困難 +1 境、仙凡之門除外）。一般副本用既有 g13 dgTier（困難 +1，clamp 0–7）。
function dglIsSpecial(kind){
  if(!kind)return false;
  try{if(typeof mapSpecialDef==='function'&&mapSpecialDef(kind))return true;}catch(e){}
  try{if(typeof MAP_SPECIAL!=='undefined'&&MAP_SPECIAL&&MAP_SPECIAL[kind])return true;}catch(e){}
  return kind==='xf'||kind==='dg_qingyan';
}
function dglTag(kind){
  if(!dglIsSpecial(kind))return '';
  return kind==='xf'?'特殊試煉':'特殊副本';
}
function dglTune(kind){
  try{if(typeof mapSpecialTune==='function')return mapSpecialTune(kind);}catch(e){}
  try{
    const D=(typeof MAP_SPECIAL!=='undefined'&&MAP_SPECIAL&&MAP_SPECIAL[kind])||null;
    if(!D)return null;
    const R=D.realm||{},B=D.boss||{};
    return {kind:kind,bossRealm:B.realm!=null?B.realm|0:4,bossSub:B.sub!=null?B.sub|0:0,
      minionMin:R.minionMin!=null?R.minionMin|0:2,minionCap:R.minionCap!=null?R.minionCap|0:3};
  }catch(e){}
  return null;
}
function dglRealmN(r,s){
  try{if(s!=null&&typeof mapSpecialRealmLabel==='function'){const t=mapSpecialRealmLabel(r,s);if(t)return t;}}catch(e){}
  let n='';
  try{n=(typeof REALMS!=='undefined'&&REALMS[r]&&REALMS[r].n)||'';}catch(e){}
  if(s==null||s===undefined||s==='')return n;
  let sub='';
  try{if(typeof v52SubName==='function')sub=v52SubName(r,s);}catch(e){}
  if(!sub){try{sub=(typeof SUB!=='undefined'&&SUB[s])||'';}catch(e){}}
  return n+sub;
}
// hard=true 時依 mapSpecialBossRS 同一條規則自己算（入場前沒有 S.dg.hard）
function dglBossRS(kind,hard){
  if(!hard){
    try{if(typeof mapSpecialBossRS==='function'){const rs=mapSpecialBossRS(kind);if(rs&&rs.r!=null)return rs;}}catch(e){}
  }
  const T=dglTune(kind)||{};
  let r=T.bossRealm|0,s=T.bossSub|0;
  if(hard&&kind!=='xf'){const mx=(typeof MAX_REALM==='number')?MAX_REALM:10;r=Math.min(mx,r+1);}
  return {r,s};
}
function dglMobRange(kind){
  const T=dglTune(kind);if(!T)return '';
  const lo=dglRealmN(T.minionMin),hi=dglRealmN(T.minionCap);
  if(!lo&&!hi)return '';
  if(!hi||lo===hi)return lo||hi;
  return lo+'～'+hi;
}
function dglRealmText(kind,opt){
  opt=opt||{};
  const hard=!!opt.hard,live=!!opt.live;
  if(dglIsSpecial(kind)){
    const T=dglTune(kind);if(!T)return '';
    const mobs=dglMobRange(kind);
    const showHard=live?hard:false;
    const rs=dglBossRS(kind,showHard);
    const boss=dglRealmN(rs.r,rs.s);
    let t=(boss?('首領：'+boss):'')+(mobs?((boss?'・':'')+'小怪：'+mobs):'');
    if(!live&&kind!=='xf'){
      const rh=dglBossRS(kind,true);
      if(rh.r!==rs.r||rh.s!==rs.s){
        const hb=dglRealmN(rh.r,rh.s);
        if(hb&&hb!==boss)t+='（困難：首領'+hb+'）';
      }
    }
    return t;
  }
  try{
    if(typeof dgTier!=='function'||typeof REALMS==='undefined')return '';
    if(live)return (REALMS[dgTier(kind,hard)]&&REALMS[dgTier(kind,hard)].n||'')+'級';
    const a=REALMS[dgTier(kind,false)]&&REALMS[dgTier(kind,false)].n;
    const b=REALMS[Math.min(7,dgTier(kind,true))]&&REALMS[Math.min(7,dgTier(kind,true))].n;
    if(!a)return '';
    return a+'級（困難：'+(b||'')+'級）';
  }catch(e){return '';}
}
function dglTagHtml(kind){
  const tag=dglTag(kind);if(!tag)return '';
  return '<span class="tag dgl-tag" style="background:#c44a3a">'+tag+'</span>';
}

function dglPatchPanel(h,kind){
  if(!h||!kind)return h;
  const tag=dglTag(kind);
  if(tag&&h.indexOf('>'+tag+'<')<0)h=h.replace(/<h4>([^<]*)/,'<h4>$1'+dglTagHtml(kind));
  const rs=dglRealmText(kind);
  if(!rs)return h;
  if(dglIsSpecial(kind)){
    if(/固定難度（不隨你的境界改變）：/.test(h))
      h=h.replace(/固定難度（不隨你的境界改變）：[^。<]*/,'固定難度（不隨你的境界改變）：'+rs);
    else if(h.indexOf(rs)<0&&h.indexOf('class="pdesc"')>=0)
      h=h.replace(/<div class="pdesc">/,'<div class="pdesc">'+rs+'。');
  }else if(!/固定難度/.test(h)&&h.indexOf('class="pdesc"')>=0){
    h=h.replace(/<div class="pdesc">/,'<div class="pdesc">固定難度（不隨你的境界改變）：'+rs+'。');
  }
  return h;
}
{const _p=dgatePanel;dgatePanel=function(o){let h=_p.apply(this,arguments);try{if(o&&o.kind)h=dglPatchPanel(h,o.kind);}catch(e){}return h;};}

{const _i=dgiIntroHtml;dgiIntroHtml=function(kind){let h=_i.apply(this,arguments);try{
  if(!kind)return h;
  const tag=dglTag(kind),rs=dglRealmText(kind);
  if(!h)h='<div class="dgi-intro"></div>';
  if(tag&&h.indexOf(tag)<0)h=h.replace(/<div class="dgi-intro">/,'<div class="dgi-intro"><div class="dgl-tagline"><span class="tag dgl-tag" style="background:#c44a3a">'+tag+'</span></div>');
  if(rs){
    if(/固定難度：/.test(h))h=h.replace(/固定難度：[^<]*/,(dglIsSpecial(kind)?rs:'固定難度：'+rs));
    else if(h.indexOf(rs)<0)h=h.replace(/<\/div>\s*$/,'<div class="dgi-s">'+rs+'</div></div>');
  }
}catch(e){}return h;};}

{const _d=x47Dlg;x47Dlg=function(o){
  try{
    if(o&&(o.id==='dgin'||o.id==='xdgjoin')){
      let kind=null;
      try{if(typeof DGI!=='undefined'&&DGI.kind)kind=DGI.kind;}catch(e){}
      if(!kind&&o.id==='xdgjoin'){try{const R=typeof xdgRun==='function'?xdgRun():null;kind=R&&R.kind;}catch(e){}}
      const tag=kind?dglTag(kind):'';
      if(tag&&o.t&&String(o.t).indexOf(tag)<0){o=Object.assign({},o);o.t=o.t+'　'+tag;}
    }
  }catch(e){}
  return _d.apply(this,arguments);
};}

function dglDecorList(){
  const p=document.getElementById('xmapgatep');if(!p||p.style.display==='none')return;
  p.querySelectorAll('.xgrow').forEach(r=>{
    if(r.getAttribute('data-dgl')==='1')return;
    let k=null;const b=r.querySelector('[data-k]');if(b)k=b.getAttribute('data-k');
    if(!k&&r.getAttribute('data-map-xf'))k='xf';
    if(!k)return;
    const nameEl=r.querySelector('b');if(!nameEl)return;
    const tag=dglTag(k),rs=dglRealmText(k);
    let extra='';
    if(tag)extra+=' <span class="dgl-tag" style="background:#c44a3a;color:#fff;font-size:10px;padding:0 4px;border-radius:3px;font-weight:600">'+tag+'</span>';
    if(rs)extra+='<small class="dgl-rs" style="display:block;opacity:.85;font-weight:400;font-size:11px;margin-top:2px">'+rs+'</small>';
    if(extra)nameEl.insertAdjacentHTML('beforeend',extra);
    r.setAttribute('data-dgl','1');
  });
}
try{if(typeof dgiDecorList==='function'&&!dgiDecorList._dgl){const _l=dgiDecorList;dgiDecorList=function(){const r=_l.apply(this,arguments);try{dglDecorList();}catch(e){}return r;};dgiDecorList._dgl=1;}}catch(e){}
try{if(typeof xmapGatePanel==='function'&&!xmapGatePanel._dgl){const _p=xmapGatePanel;xmapGatePanel=function(){const r=_p.apply(this,arguments);try{dglDecorList();}catch(e){}return r;};xmapGatePanel._dgl=1;}}catch(e){}
setInterval(function(){try{dglDecorList();}catch(e){}},300);

try{if(typeof xgateDrawDgate==='function'&&!xgateDrawDgate._dgl){const _x=xgateDrawDgate;xgateDrawDgate=function(o){
  if(typeof label!=='function')return _x.apply(this,arguments);
  const _lb=label;let n=0;
  label=function(t,x,y,c,f){
    try{
      n++;
      if(o&&o.kind&&n===2){
        const tag=dglTag(o.kind);if(tag)t=tag;
        const r=_lb.call(this,t,x,y,c,f);
        const rs=dglRealmText(o.kind);
        if(rs)_lb.call(this,rs,x,y+12,c,'bold 8px sans-serif');
        return r;
      }
    }catch(e){}
    return _lb.apply(this,arguments);
  };
  try{return _x.apply(this,arguments);}finally{label=_lb;}
};xgateDrawDgate._dgl=1;}}catch(e){}

{const _h=renderDgHud;renderDgHud=function(){const r=_h.apply(this,arguments);try{
  if(typeof S==='undefined'||!S||!S.dg)return r;
  const el=(typeof $$==='function'?$$('dghud'):null)||(typeof document!=='undefined'?document.getElementById('dghud'):null);
  if(!el||!el.innerHTML||el.style.display==='none')return r;
  if(el.innerHTML.indexOf('dgl-hud')>=0)return r;
  const kind=S.dg.kind,tag=dglTag(kind),rs=dglRealmText(kind,{live:1,hard:!!S.dg.hard});
  let chip='';
  if(tag)chip+=' <span class="dgl-hud dgl-tag" style="background:#c44a3a;color:#fff;font-size:11px;padding:0 4px;border-radius:3px">'+tag+'</span>';
  if(rs)chip+=' <span class="dgl-hud dgl-rs" style="opacity:.9">'+rs+'</span>';
  if(!chip)return r;
  el.innerHTML=el.innerHTML.replace(/(<b style="color:[^"]+">[^<]+<\/b>)(・困難)?/,function(m,b,h){return b+chip+(h||'');});
}catch(e){}return r;};}

setTimeout(function dglApi(){if(!window.XW){setTimeout(dglApi,300);return;}
  XW.dgl={special:dglIsSpecial,tag:dglTag,realm:dglRealmText,tune:dglTune,boss:dglBossRS,mobs:dglMobRange};
},0);

// ================== 宗門遭襲參戰（t1635u，可關） ==================
// 山賊／頭目打進宗門時，有戰鬥能力、且未被玩家手動鎖定待命／守衛／跟隨的弟子
// 都應趕往戰場（距離預設 22 格，涵蓋 8–20 格的閒置／採集者）。
// 根因：v50DefTick 會掛「❗」並指派攻擊，但 cult_ai 閒置警戒 1.2／追擊 3.5／丟失 6.5，
// 遠距任務被立刻取消，頭上標記卻留下。本層在 cult_ai 之後補派並自己追擊。
// 不介入 S.dg（保留副本 dgAi）。TUNE.raidJoin.on=false 或網址 ?raidjoin=0 可關。
TUNE.raidJoin=TUNE.raidJoin||{on:true,range:22,hp:0.30,areaPad:8};
function rjOn(){
  try{if(typeof location!=='undefined'&&/[?&]raidjoin=0(?:&|$)/.test(location.search||''))return false;}catch(e){}
  try{if(TUNE.raidJoin&&TUNE.raidJoin.on===false)return false;}catch(e){}
  return true;
}
function rjCfg(){return (typeof TUNE!=='undefined'&&TUNE.raidJoin)||{};}
function rjOverworld(){try{return !!(typeof S!=='undefined'&&S&&!S.dg&&!S.interior);}catch(e){return false;}}
function rjDisc(u){
  if(!u||u.kind!=='disciple'||u.dead||u.np)return false;
  try{if(typeof xnIsPC==='function'&&xnIsPC(u))return false;}catch(e){}
  return true;
}
function rjLocked(u){
  if(!u)return true;
  if(u.job==='guard'||u.job==='follow')return true;
  try{if(typeof xmvOn==='function'&&xmvOn(u))return true;}catch(e){}
  try{if(u.xcmd&&typeof S!=='undefined'&&S.time<u.xcmd.until)return true;}catch(e){}
  try{if(u.task&&u.task.man)return true;}catch(e){}
  try{if(typeof xPlayerOrder==='function'&&xPlayerOrder(u)&&!(u.task&&u.task.raidJoin))return true;}catch(e){}
  if(!u.job&&u.holdAt&&Number.isFinite(u.holdAt.x)&&Number.isFinite(u.holdAt.y))return true;
  return false;
}
function rjEligible(u){
  if(!rjDisc(u)||u.inside||u.inB)return false;
  if(rjLocked(u))return false;
  if(u.job==='seclude'||u.job==='dual')return false;
  try{if(u.away||u.mission||u.expd||u.dgIn)return false;}catch(e){}
  if(u.retreat||u.cultRetreat)return false;
  const hp=u.hp/(u.maxhp||1),need=rjCfg().hp!=null?rjCfg().hp:0.30;
  if(!(u.hp>0)||hp<need)return false;
  try{if(u.inj&&(u.inj.k==='heavy'||u.inj.k==='meridian'||u.inj.k==='重傷'))return false;}catch(e){}
  try{if(u.xco&&u.xco.st==='avoid')return false;}catch(e){}
  return true;
}
function rjIsRaider(e){
  if(!e||e.dead||!(e.hp>0)||e.flee)return false;
  if(e.raid!=null)return true;
  if(e.type==='bandit'||e.type==='chief')return true;
  try{if(e._mapRaid)return true;}catch(ex){}
  try{
    const D=typeof ENEMY!=='undefined'&&ENEMY[e.type];
    if(D&&D.human&&e.raid!==undefined)return true;
  }catch(ex){}
  return false;
}
function rjThreats(){
  if(!rjOverworld()||!S.enemies)return [];
  const C=rjCfg();
  let area=null;
  try{if(typeof v164Area==='function')area=v164Area();}catch(e){}
  if(!area){
    try{
      const sc=typeof sectCenter==='function'?sectCenter():{x:0,y:0};
      area={x:sc.x,y:sc.y,R:(C.range||22)+(C.areaPad||8)};
    }catch(e){area={x:0,y:0,R:30};}
  }
  const pad=C.areaPad!=null?C.areaPad:8;
  const out=[];
  for(const e of S.enemies){
    if(!rjIsRaider(e))continue;
    let near=false;
    try{near=dist(e.x,e.y,area.x,area.y)<=(area.R||16)+pad;}catch(ex){near=true;}
    if(near||e.raid!=null)out.push(e);
  }
  return out;
}
function rjPick(u,foes){
  if(!u||!foes||!foes.length)return null;
  const R=rjCfg().range!=null?rjCfg().range:22;
  let best=null,bd=R;
  try{
    const cur=u.task&&u.task.type==='attack'?foes.find(e=>e.id===u.task.eid):null;
    if(cur&&dist(u.x,u.y,cur.x,cur.y)<=R)return cur;
    for(const e of foes){
      const d=dist(u.x,u.y,e.x,e.y);
      if(d<bd){bd=d;best=e;}
    }
  }catch(ex){}
  return best;
}
function rjAssign(u,e){
  if(!u||!e)return false;
  if(!u._raidJoinSave)u._raidJoinSave={job:u.job,jobB:u.jobB,jobRes:u.jobRes,task:u.task&&!u.task.raidJoin?u.task:null,holdAt:u.holdAt};
  u.prevTask=null;
  u.task={type:'attack',eid:e.id,raidJoin:1};
  u.path=[];u.medit=false;u.dash=null;
  try{u.thought='❗';u.thT=S.time;}catch(ex){}
  return true;
}
function rjPursue(u,dt,e){
  if(!u||!e)return;
  const reach=((u.r||0.3)+(e.r||0.3)+0.55);
  let d=0;try{d=dist(u.x,u.y,e.x,e.y);}catch(ex){return;}
  if(d>reach){
    try{if(typeof chase==='function')chase(u,dt||0.05,e.x,e.y,reach);}catch(ex){}
    return;
  }
  try{if(typeof faceTo==='function')faceTo(u,e.x,e.y);}catch(ex){}
  try{if(typeof tryAbilities==='function'&&tryAbilities(u,e))return;}catch(ex){}
  try{if(u.cd<=0&&typeof meleeHit==='function')meleeHit(u,e);}catch(ex){}
}
function rjClear(u){
  if(!u||!u._raidJoinSave)return;
  const p=u._raidJoinSave;
  if(u.task&&u.task.raidJoin){
    u.task=p.task||null;u.path=[];
  }
  u._raidJoinSave=null;
}
function rjTickUnit(u,dt){
  if(!rjOn()||!rjOverworld()||!rjEligible(u))return false;
  const foes=rjThreats();
  if(!foes.length){if(u._raidJoinSave||(u.task&&u.task.raidJoin))rjClear(u);return false;}
  const e=rjPick(u,foes);
  if(!e){if(u.task&&u.task.raidJoin)rjClear(u);return false;}
  rjAssign(u,e);
  rjPursue(u,dt,e);
  return true;
}

(function(){
  let oursUD=null,oursVT=null;
  function wrapUD(){
    if(typeof updateDisciple!=='function')return false;
    if(updateDisciple===oursUD)return true;
    const _ud=updateDisciple;
    oursUD=updateDisciple=function(u,dt){
      try{if(typeof S!=='undefined'&&S&&S.dg)return _ud.apply(this,arguments);}catch(e){}
      const r=_ud.apply(this,arguments);
      try{if(rjOn()&&rjOverworld()&&rjEligible(u))rjTickUnit(u,dt);}catch(e){}
      return r;
    };
    updateDisciple._raidJoin=1;
    return true;
  }
  function wrapVT(){
    if(typeof v50DefTick!=='function')return false;
    if(v50DefTick===oursVT)return true;
    const _t=v50DefTick;
    oursVT=v50DefTick=function(st){
      const r=_t.apply(this,arguments);
      try{
        if(!rjOn()||!rjOverworld())return r;
        const foes=rjThreats();
        if(!foes.length){
          for(const u of (S.units||[]))if(u&&(u._raidJoinSave||(u.task&&u.task.raidJoin)))rjClear(u);
          return r;
        }
        for(const u of (S.units||[])){
          if(!rjEligible(u))continue;
          const e=rjPick(u,foes);if(!e)continue;
          rjAssign(u,e);
        }
      }catch(e){}
      return r;
    };
    v50DefTick._raidJoin=1;
    return true;
  }
  function install(){wrapUD();wrapVT();}
  install();
  setTimeout(install,0);
  setTimeout(install,12);
  function bind(){
    try{
      if(!window.XW)return false;
      XW.raidJoin={
        on:rjOn,overworld:rjOverworld,locked:rjLocked,eligible:rjEligible,
        threats:rjThreats,pick:rjPick,assign:rjAssign,pursue:rjPursue,tick:rjTickUnit,cfg:rjCfg
      };
      return true;
    }catch(e){return false;}
  }
  if(!bind())setTimeout(function r(){if(!bind())setTimeout(r,200);},0);
})();
