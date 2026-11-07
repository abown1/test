// ================== cult_fly.js：御劍飛行（旗標 CULT_FLAGS.yujianFly，預設 ON）==================
// 插在 cult_hall.js 之後、net1_transport.js 之前（仍在 g1 IIFE 內）。
// 築基（未至金丹）需飛劍；金丹起可御空（無劍）。兩者無視障礙、同靈力消耗。副本／BOSS 房預設不可起飛。
(function(){
  try{
    if(typeof CULT_FLAGS!=='undefined'){
      if(CULT_FLAGS.yujianFly==null)CULT_FLAGS.yujianFly=true;
    }
  }catch(e0){}

  const CFG={
    realmNeed:5,          // 築基起可飛
    selfFlyRealm:6,       // 金丹起可無劍御空
    allowInDungeon:false, // 秘境／副本／BOSS 房預設不可飛越牆壁
    drainPer:10,          // 每 drainSec 遊戲秒消耗的靈力（劍飛與御空相同）
    drainSec:30,
    speedMul:1.10,        // 劍飛行速倍率（相對步行）
    selfSpeedMul:1.18,    // 金丹御空略快
    hoverPx:22,
    landSearch:10,
    swordTypes:['sword'], // GEAR 無獨立「飛劍」；長劍 type=sword
    hotkey:'KeyU',
    minQi:0.01
  };
  window.CULT_FLY_CFG=CFG;

  function flagOn(){try{return !!(typeof CULT_FLAGS!=='undefined'&&CULT_FLAGS.yujianFly);}catch(e){return false;}}
  function getS(){try{if(typeof S!=='undefined'&&S)return S;}catch(e){}try{if(window.XW&&XW.S)return XW.S;}catch(e2){}return null;}
  function isPC(u){
    if(!u)return false;
    if(u.kind==='player')return true;
    try{if(window.Cult&&typeof Cult.isPlayerChar==='function'&&Cult.isPlayerChar(u))return true;}catch(e){}
    return false;
  }
  function realmOf(u){return (u&&u.realm)|0;}
  function inDungeon(){
    const s=getS();
    if(!s)return false;
    if(s.dg)return true;
    try{if(s.map&&s.map.boss)return true;}catch(e){}
    return false;
  }
  function dungeonBlocked(){return !CFG.allowInDungeon&&inDungeon();}
  function mustCollide(o){return !isFlying(o)||dungeonBlocked();}

  function itemLooksSword(it){
    if(!it)return false;
    const types=CFG.swordTypes||['sword'];
    const t=it.t||it.type;
    if(t&&types.indexOf(t)>=0)return true;
    let n='';
    try{if(it.n)n+=String(it.n);}catch(e){}
    try{if(typeof itemName==='function')n+=itemName(it);}catch(e2){}
    if(/飛劍/.test(n))return true;
    return false;
  }

  // 裝備欄（含武器槽 w）或主角行囊中，類型屬 CULT_FLY_CFG.swordTypes（預設 sword／長劍）或名稱含「飛劍」
  function cultHasFlySword(u){
    if(!u)return false;
    try{
      const eq=u.eq||{};
      for(const k in eq){if(itemLooksSword(eq[k]))return true;}
    }catch(e){}
    try{
      if(u.kind==='player'){
        const s=getS();
        const inv=(s&&s.inv)||[];
        for(let i=0;i<inv.length;i++){if(itemLooksSword(inv[i]))return true;}
      }
    }catch(e2){}
    return false;
  }

  function flyModeFor(u){
    if(!u)return null;
    if(realmOf(u)>=CFG.selfFlyRealm)return 'self';
    if(realmOf(u)>=CFG.realmNeed&&cultHasFlySword(u))return 'sword';
    return null;
  }

  function isFlying(u){return !!(u&&u.flyOn);}

  function canTakeOff(u){
    if(!flagOn())return {ok:false,reason:'flag'};
    if(!isPC(u))return {ok:false,reason:'not-player'};
    if(!u||u.dead||u.y47dn)return {ok:false,reason:'down'};
    if(realmOf(u)<CFG.realmNeed)return {ok:false,reason:'realm'};
    if(dungeonBlocked())return {ok:false,reason:'dungeon'};
    const mode=flyModeFor(u);
    if(!mode)return {ok:false,reason:'nosword'};
    const qi=u.qi==null?0:u.qi;
    if((u.qiMax||0)>0&&qi<CFG.minQi)return {ok:false,reason:'qi'};
    return {ok:true,mode:mode};
  }

  function snapLand(u){
    if(!u)return null;
    const maxR=CFG.landSearch||10;
    const i=Math.floor(u.x),j=Math.floor(u.y);
    function ok(a,b){
      try{
        if(typeof inMap==='function'&&!inMap(a,b))return false;
        if(typeof blockedT==='function')return !blockedT(a,b);
      }catch(e){}
      return true;
    }
    if(ok(i,j)){u.x=i+0.5;u.y=j+0.5;return {i:i,j:j};}
    for(let r=1;r<=maxR;r++){
      let best=null,bd=1e9;
      for(let dj=-r;dj<=r;dj++)for(let di=-r;di<=r;di++){
        if(Math.max(Math.abs(di),Math.abs(dj))!==r)continue;
        if(ok(i+di,j+dj)){const d=di*di+dj*dj;if(d<bd){bd=d;best={i:i+di,j:j+dj};}}
      }
      if(best){u.x=best.i+0.5;u.y=best.j+0.5;return best;}
    }
    try{
      if(typeof nearestFree==='function'){
        const f=nearestFree(i,j,-1);
        if(f){u.x=f.i+0.5;u.y=f.j+0.5;return f;}
      }
    }catch(e2){}
    return null;
  }

  function land(u,why){
    if(!u||!u.flyOn)return false;
    u.flyOn=false;
    u.flyMode=null;
    u.flyHover=0;
    u.flyWhy=why||'land';
    try{snapLand(u);}catch(e){}
    try{if(typeof floater==='function')floater(u.x,u.y,'落地','#c8e0ff');}catch(e2){}
    refreshBtn();
    return true;
  }

  function takeOff(u){
    const c=canTakeOff(u);
    if(!c.ok)return c;
    u.flyOn=true;
    u.flyMode=c.mode;
    u.flyHover=CFG.hoverPx;
    u.flyWhy='fly';
    try{if(typeof floater==='function')floater(u.x,u.y,c.mode==='self'?'御空':'御劍','#9fd0ff');}catch(e){}
    refreshBtn();
    return c;
  }

  function setFlying(u,on){
    if(on)return takeOff(u);
    if(u&&u.flyOn){land(u,'toggle');return {ok:true,mode:null};}
    return {ok:true,mode:null};
  }

  function toggle(u){
    u=u||(typeof player==='function'?player():null);
    if(!u)return {ok:false,reason:'no-unit'};
    if(u.flyOn)return setFlying(u,false);
    const r=takeOff(u);
    if(!r.ok){
      const msg={flag:'御劍未開啟',realm:'需築基方可御劍',nosword:'需裝備或攜帶飛劍（長劍）',dungeon:'秘境之中不可御劍',qi:'靈力不足',down:'無法起飛', 'not-player':'僅主角可御劍'}[r.reason]||'無法起飛';
      try{if(typeof toast==='function')toast(msg);}catch(e){}
    }
    return r;
  }

  function drainRate(){return (CFG.drainPer||10)/(CFG.drainSec||30);}

  function speedMulOf(u){
    if(!isFlying(u))return 1;
    return u.flyMode==='self'?(CFG.selfSpeedMul||1.18):(CFG.speedMul||1.10);
  }

  function flyTick(dt){
    try{refreshBtn();}catch(e0){}
    if(!flagOn())return;
    const s=getS();
    if(!s||!s.units)return;
    const rate=drainRate();
    for(let i=0;i<s.units.length;i++){
      const u=s.units[i];
      if(!u||!u.flyOn)continue;
      if(u.dead||u.y47dn){land(u,'down');continue;}
      if(dungeonBlocked()){land(u,'dungeon');continue;}
      if((u.qiMax||0)>0){
        u.qi=Math.max(0,(u.qi||0)-rate*dt);
        if(u.qi<=0){u.qi=0;land(u,'qi');}
      }
    }
  }

  function drawFlySword(b){
    try{
      const ctx=typeof window!=='undefined'?(window._flyCtx||null):null;
    }catch(e){}
    if(typeof ctx==='undefined')return;
    // drawn via outer ctx from drawHuman wrap
  }

  function paintGroundShadow(b){
    if(typeof ctx==='undefined')return;
    try{ellipse(b.x,b.y+4,20,9,'rgba(0,0,0,0.28)');}catch(e){}
    try{ellipse(b.x,b.y+4,14,6,'rgba(0,0,0,0.45)');}catch(e2){
      ctx.beginPath();ctx.ellipse(b.x,b.y+4,16,7,0,0,Math.PI*2);ctx.fillStyle='rgba(0,0,0,0.45)';ctx.fill();
    }
  }

  function paintSwordUnderFeet(b){
    if(typeof ctx==='undefined')return;
    const x=b.x,y=b.y+5;
    ctx.save();
    ctx.translate(x,y);
    ctx.beginPath();
    ctx.moveTo(-24,0);ctx.lineTo(-18,-4);ctx.lineTo(18,-3.5);ctx.lineTo(26,0);ctx.lineTo(18,3.5);ctx.lineTo(-18,4);
    ctx.closePath();
    ctx.fillStyle='#e8eef8';
    ctx.strokeStyle='#2a3548';
    ctx.lineWidth=1.6;
    ctx.fill();ctx.stroke();
    ctx.beginPath();ctx.moveTo(-16,0);ctx.lineTo(16,0);
    ctx.strokeStyle='#8fa0bc';ctx.lineWidth=1;ctx.stroke();
    ctx.fillStyle='#d4a84a';
    ctx.fillRect(-3.5,-7,5,14);
    ctx.strokeStyle='#6a4e1a';ctx.strokeRect(-3.5,-7,5,14);
    ctx.fillStyle='#6b4424';
    ctx.fillRect(-13,-2.4,10,4.8);
    ctx.restore();
  }

  function paintSelfAura(b){
    if(typeof ctx==='undefined')return;
    const t=(typeof performance!=='undefined'?performance.now():0)/420;
    const pulse=Math.sin(t);
    const a=0.28+0.12*pulse;
    try{ellipse(b.x,b.y-12,22+pulse*2,28+pulse*2,'rgba(160,215,255,'+a+')');}catch(e){
      ctx.beginPath();ctx.ellipse(b.x,b.y-12,22,28,0,0,Math.PI*2);ctx.fillStyle='rgba(160,215,255,'+a+')';ctx.fill();
    }
    try{ellipse(b.x,b.y-12,12,16,'rgba(230,245,255,0.22)');}catch(e2){}
  }

  function paintSelfRing(b){
    if(typeof ctx==='undefined')return;
    ctx.save();
    ctx.strokeStyle='rgba(170,225,255,0.9)';
    ctx.lineWidth=2.2;
    ctx.beginPath();ctx.ellipse(b.x,b.y-10,16,21,0,0,Math.PI*2);ctx.stroke();
    ctx.strokeStyle='rgba(255,236,170,0.55)';
    ctx.lineWidth=1.2;
    ctx.beginPath();ctx.ellipse(b.x,b.y-10,11,15,0,0,Math.PI*2);ctx.stroke();
    ctx.restore();
  }

  function wrapDraw(){
    if(typeof drawHuman!=='function'||drawHuman._flyW)return;
    const _dh=drawHuman;
    drawHuman=function(u){
      if(!flagOn()||!u||!u.flyOn)return _dh.apply(this,arguments);
      let b;
      try{b=P(u.x,u.y);}catch(e){return _dh.apply(this,arguments);}
      const h=u.flyHover||CFG.hoverPx||22;
      paintGroundShadow(b);
      ctx.save();
      ctx.translate(0,-h);
      if(u.flyMode==='self')paintSelfAura(b);
      const r=_dh.apply(this,arguments);
      if(u.flyMode==='sword')paintSwordUnderFeet(b);
      else if(u.flyMode==='self')paintSelfRing(b);
      ctx.restore();
      return r;
    };
    drawHuman._flyW=1;
  }

  function wrapMove(){
    if(typeof collideTiles==='function'&&!collideTiles._flyW){
      const _ct=collideTiles;
      collideTiles=function(o){
        if(flagOn()&&o&&o.flyOn&&!mustCollide(o))return;
        return _ct.apply(this,arguments);
      };
      collideTiles._flyW=1;
    }
    if(typeof pathTo==='function'&&!pathTo._flyW){
      const _pt=pathTo;
      pathTo=function(o,tx,ty,exact){
        if(flagOn()&&o&&o.flyOn&&!mustCollide(o)){
          o.path=[{x:tx,y:ty}];
          o.needRepath=false;
          o.stuck=0;
          return true;
        }
        return _pt.apply(this,arguments);
      };
      pathTo._flyW=1;
    }
    if(typeof moveEntity==='function'&&!moveEntity._flyW){
      const _me=moveEntity;
      moveEntity=function(o,dt){
        if(flagOn()&&o&&o.flyOn&&!mustCollide(o)){
          const mul=speedMulOf(o);
          const odx=o.dvx,ody=o.dvy;
          o.dvx=(o.dvx||0)*mul;o.dvy=(o.dvy||0)*mul;
          const r=_me.apply(this,arguments);
          o.dvx=odx;o.dvy=ody;
          return r;
        }
        return _me.apply(this,arguments);
      };
      moveEntity._flyW=1;
    }
    if(typeof los==='function'&&!los._flyW){
      const _los=los;
      los=function(x0,y0,x1,y1,r){
        try{
          if(flagOn()){
            const s=getS();
            if(s&&s.units){
              for(let i=0;i<s.units.length;i++){
                const u=s.units[i];
                if(u&&u.flyOn&&Math.hypot((u.x||0)-x0,(u.y||0)-y0)<0.35)return true;
              }
            }
          }
        }catch(e){}
        return _los.apply(this,arguments);
      };
      los._flyW=1;
    }
  }

  function wrapCombat(){
    if(typeof tryAbilities==='function'&&!tryAbilities._flyW){
      const _ta=tryAbilities;
      tryAbilities=function(u,e,manual){
        if(flagOn()&&u&&u.flyOn&&typeof los==='function'){
          const _los=los;
          los=function(){return true;};
          try{return _ta.apply(this,arguments);}
          finally{los=_los;}
        }
        return _ta.apply(this,arguments);
      };
      tryAbilities._flyW=1;
    }

    if(typeof y47Down==='function'&&!y47Down._flyW){
      const _yd=y47Down;
      y47Down=function(u){try{if(u&&u.flyOn)land(u,'down');}catch(e){}return _yd.apply(this,arguments);};
      y47Down._flyW=1;
    }
    if(typeof onPlayerDeath==='function'&&!onPlayerDeath._flyW){
      const _pd=onPlayerDeath;
      onPlayerDeath=function(u){try{if(u&&u.flyOn)land(u,'death');}catch(e){}return _pd.apply(this,arguments);};
      onPlayerDeath._flyW=1;
    }
  }

  function wrapTick(){
    try{
      if(typeof showTitle==='function'&&!showTitle._flyW){
        const _st=showTitle;
        showTitle=function(){const r=_st.apply(this,arguments);try{refreshBtn();}catch(e){}return r;};
        showTitle._flyW=1;
      }
    }catch(e0){}
    if(window.Cult&&typeof Cult.tick==='function'&&!Cult.tick._flyW){
      const _tk=Cult.tick.bind(Cult);
      Cult.tick=function(dt){
        let r;
        try{r=_tk(dt);}catch(e){}
        try{if(flagOn())flyTick(dt);}catch(e2){}
        return r;
      };
      Cult.tick._flyW=1;
    }
  }

  function keepFields(){
    const fs=['flyOn','flyMode','flyHover'];
    function add(arr){
      if(!arr||!arr.push)return;
      for(let i=0;i<fs.length;i++){if(arr.indexOf(fs[i])<0)arr.push(fs[i]);}
    }
    try{if(typeof UNIT_KEEP!=='undefined')add(UNIT_KEEP);}catch(e){}
    try{if(window.XW&&Array.isArray(XW.UNIT_KEEP))add(XW.UNIT_KEEP);}catch(e2){}
  }

  function overlayBlocksHud(){
    try{if(typeof titleOpen!=='undefined'&&titleOpen)return true;}catch(e){}
    try{if(window.XW&&XW.titleOpen)return true;}catch(e2){}
    try{
      if(document.body.classList.contains('titleopen'))return true;
      if(document.body.classList.contains('menuopen'))return true;
    }catch(e3){}
    try{
      const title=document.getElementById('title');
      if(title&&title.classList.contains('open'))return true;
    }catch(e4){}
    try{
      if(document.body.classList.contains('xwbooting')&&!document.body.classList.contains('ingame'))return true;
      const boot=document.getElementById('xwboot');
      if(boot&&!boot.classList.contains('hide')&&!document.body.classList.contains('ingame')){
        const st=typeof getComputedStyle==='function'?getComputedStyle(boot):null;
        if(!st||(st.display!=='none'&&st.visibility!=='hidden'&&parseFloat(st.opacity||'1')>0.05))return true;
      }
    }catch(e5){}
    try{
      const set=document.getElementById('settings');
      if(set&&set.classList.contains('open'))return true;
    }catch(e6){}
    return false;
  }
  function hudShouldShow(){
    if(!flagOn())return false;
    if(typeof document==='undefined')return false;
    if(overlayBlocksHud())return false;
    try{
      const p=typeof player==='function'?player():null;
      if(!p||p.dead)return false;
      if(((p.realm)|0)<(CFG.realmNeed||5))return false;
    }catch(e){return false;}
    return true;
  }
  function refreshBtn(){
    const el=typeof document!=='undefined'?document.getElementById('cultFlyBtn'):null;
    if(!el)return;
    const show=hudShouldShow();
    const display=show?'block':'none';
    if(el.style.display!==display)el.style.display=display;
    let flying=false;
    try{const p=typeof player==='function'?player():null;flying=!!(p&&p.flyOn);}catch(e){}
    el.classList.toggle('on',flying);
    const label=flying?'落地':'御劍';
    if(el.textContent!==label)el.textContent=label;
  }

  function ensureBtn(){
    if(typeof document==='undefined'||!document.body)return;
    let el=document.getElementById('cultFlyBtn');
    if(!el){
      el=document.createElement('button');
      el.id='cultFlyBtn';
      el.type='button';
      el.textContent='御劍';
      el.style.cssText='position:fixed;right:14px;bottom:86px;z-index:40;padding:6px 10px;font:13px sans-serif;background:#1a2433;color:#dce8ff;border:1px solid #6a83a8;border-radius:6px;cursor:pointer;display:none';
      el.addEventListener('click',function(ev){
        ev.preventDefault();
        try{toggle(typeof player==='function'?player():null);}catch(e){}
        refreshBtn();
      });
      document.body.appendChild(el);
    }
    refreshBtn();
  }

  function bindKeys(){
    if(typeof document==='undefined'||document._cultFlyKey)return;
    document._cultFlyKey=1;
    document.addEventListener('keydown',function(ev){
      if(!flagOn())return;
      if(overlayBlocksHud())return;
      if(ev.code!==(CFG.hotkey||'KeyU'))return;
      const t=ev.target;
      if(t&&(t.tagName==='INPUT'||t.tagName==='TEXTAREA'||t.isContentEditable))return;
      ev.preventDefault();
      try{toggle(typeof player==='function'?player():null);}catch(e){}
      refreshBtn();
    },true);
  }

  function setEnabled(on){
    try{if(typeof CULT_FLAGS!=='undefined')CULT_FLAGS.yujianFly=!!on;}catch(e){}
    if(!on){
      const s=getS();
      if(s&&s.units){for(let i=0;i<s.units.length;i++){const u=s.units[i];if(u&&u.flyOn)land(u,'flag');}}
    }
    refreshBtn();
    return flagOn();
  }

  window.CultFly={
    CFG:CFG,
    flagOn:flagOn,
    canTakeOff:canTakeOff,
    cultHasFlySword:cultHasFlySword,
    flyModeFor:flyModeFor,
    isFlying:isFlying,
    takeOff:takeOff,
    land:land,
    toggle:toggle,
    setFlying:setFlying,
    tick:flyTick,
    drainRate:drainRate,
    speedMulOf:speedMulOf,
    snapLand:snapLand,
    inDungeon:inDungeon,
    hudShouldShow:hudShouldShow,
    refreshBtn:refreshBtn,
    setEnabled:setEnabled,
    enable:function(){return setEnabled(true);},
    disable:function(){return setEnabled(false);},
    tryAbilities:function(u,e,manual){if(typeof tryAbilities==='function')return tryAbilities(u,e,manual!==false);return false;}
  };

  function install(){
    if(install._ok)return;install._ok=1;
    wrapMove();
    wrapDraw();
    wrapCombat();
    wrapTick();
    keepFields();
    bindKeys();
    try{ensureBtn();}catch(e){}
    if(typeof document!=='undefined'){
      if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',ensureBtn);
      else setTimeout(ensureBtn,0);
    }
  }
  install();
})();
