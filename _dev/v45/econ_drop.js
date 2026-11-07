// ================== 仙武經濟：敵裝落地掉落（地面可拾取）==================
(function(){
  const ECON_DROP_PICK_R = 1.35;      // 待使用者確認：走近自動拾取半徑（格）
  const ECON_DROP_PICK_DELAY = 0.85;  // 待使用者確認：落地後延遲自動拾取（秒），避免近戰擊殺瞬間進包
  const ECON_DROP_SEEN_MS = 2500;     // 待使用者確認：同一敵人去重視窗
  const recent = [];
  let nid = 1;

  function A(){
    try{ if(typeof window!=='undefined'){ window.XW_ECON=window.XW_ECON||{}; return window.XW_ECON; } }catch(e){}
    return {};
  }
  function isClient(){
    try{ if(typeof v49Client==='function' && v49Client()) return true; }catch(e){}
    try{ if(typeof NET!=='undefined' && NET && NET.role==='client') return true; }catch(e){}
    return false;
  }
  function rnd01(){
    try{ if(typeof rnd==='function'){ const r=rnd(); if(typeof r==='number' && isFinite(r)) return r<0?0:r>=1?0.999999:r; } }catch(e){}
    return Math.random();
  }
  function dropRate(){
    return 0.02; // Unified live item policy; old per-pool overrides/force must not add independent chances.
  }
  function pile(){
    try{
      if(typeof S==='undefined'||!S) return [];
      S.econ=S.econ||{};
      if(!Array.isArray(S.econ.groundGear)) S.econ.groundGear=[];
      return S.econ.groundGear;
    }catch(e){ return []; }
  }
  function inDungeon(){
    try{ return !!(typeof S!=='undefined' && S && S.dg); }catch(e){ return false; }
  }
  function enemyKey(e){
    if(!e) return '';
    if(e.id!=null) return 'id:'+e.id;
    const x=Math.round((+e.x||0)*10), y=Math.round((+e.y||0)*10);
    return 'xy:'+x+','+y+':'+(e.type||'');
  }
  function already(e){
    const k=enemyKey(e);
    if(!k) return true;
    const t=(typeof performance!=='undefined' && performance.now)?performance.now():Date.now();
    for(let i=recent.length-1;i>=0;i--) if(t-recent[i].t>ECON_DROP_SEEN_MS) recent.splice(i,1);
    if(recent.some(function(x){ return x.k===k; })) return true;
    recent.push({k:k,t:t});
    return false;
  }
  function rollFn(){
    const E=A();
    if(typeof E.econRollEnemyGear==='function') return E.econRollEnemyGear;
    try{ if(typeof window!=='undefined' && typeof window.econRollEnemyGear==='function') return window.econRollEnemyGear; }catch(e){}
    return null;
  }
  function spawnGround(e, items){
    const list=pile();
    const dg=inDungeon();
    const x=+e.x||0, y=+e.y||0;
    items.forEach(function(it, i){
      if(!it) return;
      const ang=(i/Math.max(1,items.length))*Math.PI*2;
      const rec={
        id:'egd'+(nid++)+'_'+(typeof S!=='undefined'&&S&&S.nextItem?S.nextItem:0),
        x:x+Math.cos(ang)*0.22,
        y:y+Math.sin(ang)*0.22,
        item:it,
        t:(typeof S!=='undefined'&&S&&S.time)||0,
        dg:dg
      };
      list.push(rec);
      try{
        if(typeof floater==='function'){
          const nm=typeof itemName==='function'?itemName(it):'裝備';
          const col=(typeof QC!=='undefined'&&it.q!=null&&QC[it.q])||'#ffe27a';
          floater(rec.x, rec.y-0.25, '掉落 '+nm, col);
        }
      }catch(err){}
    });
    if(items.length){
      try{ toast('敵人落下了裝備（走近或點選拾取）'); }catch(err){}
    }
  }
  function onKillDrop(e){
    if(!e || isClient()) return;
    if(typeof enemyItemDropPermit!=='function'||!enemyItemDropPermit(e,'ground')) return;
    const fn=rollFn();
    if(typeof fn!=='function') return;
    let items=[];
    try{ items=fn(e.realm||0)||[]; }catch(err){ items=[]; }
    if(!items.length) return;
    spawnGround(e, items);
  }

  function nearestDropXY(x,y,r){
    let best=null, bd=r;
    const dg=inDungeon();
    const list=pile();
    for(let i=0;i<list.length;i++){
      const d=list[i];
      if(!!d.dg!==dg) continue;
      const dd=Math.hypot((d.x||0)-x,(d.y||0)-y);
      if(dd<bd){ bd=dd; best=d; }
    }
    return best;
  }
  function nearestDropIso(w, rad){
    if(!w) return null;
    let best=null, bd=rad||64;
    const dg=inDungeon();
    const list=pile();
    for(let i=0;i<list.length;i++){
      const d=list[i];
      if(!!d.dg!==dg) continue;
      try{
        const p=iso(d.x,d.y);
        const dd=Math.hypot(w.x-p.x, w.y-p.y);
        if(dd<bd){ bd=dd; best=d; }
      }catch(e){}
    }
    return best;
  }
  function pickup(d){
    if(!d||!d.item) return false;
    try{
      if(typeof S!=='undefined'&&S&&S.inv){
        const cap=typeof econInvCap==='function'?econInvCap(typeof player==='function'?player():null):(typeof TUNE!=='undefined'&&TUNE.invCap)||99;
        if(S.inv.length>=cap){ try{ toast('行囊已滿'); }catch(e){} return false; }
      }
    }catch(e){}
    let ok=true;
    try{ ok=addItem(d.item, d.x, d.y); }catch(e){ ok=false; }
    if(ok===false) return false;
    try{ S.econ.groundGear=pile().filter(function(x){ return x!==d; }); }catch(e){}
    try{ toast('拾取 '+(typeof itemName==='function'?itemName(d.item):'裝備')); }catch(e){}
    return true;
  }
  function pickupNear(){
    try{
      const p=typeof player==='function'?player():null;
      if(p&&!p.dead){
        const d=nearestDropXY(p.x,p.y,ECON_DROP_PICK_R);
        if(!d) return;
        const age=((typeof S!=='undefined'&&S&&S.time)||0)-(d.t||0);
        if(age<ECON_DROP_PICK_DELAY) return;
        pickup(d);
      }
    }catch(e){}
  }

  function drawDrops(){
    const list=pile();
    if(!list.length) return;
    const dg=inDungeon();
    for(let i=0;i<list.length;i++){
      const d=list[i];
      if(!!d.dg!==dg) continue;
      let sx,sy;
      try{
        const q=iso(d.x,d.y);
        const s=worldToScreen(q.x,q.y);
        sx=s.x; sy=s.y;
      }catch(e){ continue; }
      try{
        ctx.save();
        ctx.beginPath();
        const bob=Math.sin(((typeof S!=='undefined'&&S&&S.time)||0)*4 + i)*2;
        ctx.fillStyle='rgba(255,214,80,0.95)';
        ctx.strokeStyle='#fff6c8';
        ctx.lineWidth=1.6;
        const r=7;
        ctx.moveTo(sx, sy-r-3+bob);
        ctx.lineTo(sx+r, sy+bob);
        ctx.lineTo(sx, sy+r-2+bob);
        ctx.lineTo(sx-r, sy+bob);
        ctx.closePath();
        ctx.fill(); ctx.stroke();
        const n=typeof itemName==='function'?itemName(d.item):'裝備';
        ctx.fillStyle='#ffe27a';
        ctx.strokeStyle='rgba(0,0,0,0.55)';
        ctx.lineWidth=3;
        ctx.font='bold 11px sans-serif';
        ctx.textAlign='center';
        ctx.strokeText(n, sx, sy-16+bob);
        ctx.fillText(n, sx, sy-16+bob);
        ctx.restore();
      }catch(e){ try{ctx.restore();}catch(e2){} }
    }
  }

  function econStrip(u){
    const g=u&&u.econGb;
    if(!g) return;
    u.atk=+(u.atk-(g.atk||0)).toFixed(1);
    u.maxhp=Math.round(u.maxhp-(g.hp||0));
    u.speed=+(u.speed-(g.spd||0)).toFixed(2);
    u.def=+((u.def||0)-(g.def||0)).toFixed(1);
    if(u.hp>u.maxhp) u.hp=u.maxhp;
    u.econGb=null;
  }
  function econApply(u){
    if(!u) return;
    if(u.econGb) econStrip(u);
    const stFn=A().econGearStats || (typeof window!=='undefined'?window.econGearStats:null);
    if(typeof stFn!=='function') return;
    const extra={atk:0,hp:0,def:0,spd:0};
    const eq=u.eq||{};
    const baseAtk=u.atk, baseHp=u.maxhp, baseDef=u.def||0, baseSpd=u.speed;
    for(const k in eq){
      const it=eq[k];
      if(!it) continue;
      let st;
      try{ st=stFn(it); }catch(e){ continue; }
      const pct=(st&&st.pct)||{};
      extra.atk+=baseAtk*((pct.atkPct||0)/100);
      extra.def+=baseDef*((pct.defPct||0)/100);
      extra.spd+=baseSpd*((pct.move||0)/100);
    }
    extra.atk=+extra.atk.toFixed(1);
    extra.hp=Math.round(extra.hp);
    extra.def=+extra.def.toFixed(1);
    extra.spd=+extra.spd.toFixed(2);
    if(!extra.atk && !extra.hp && !extra.def && !extra.spd){ u.econGb=null; return; }
    u.atk=+(u.atk+extra.atk).toFixed(1);
    u.maxhp=Math.round(u.maxhp+extra.hp);
    u.speed=+(u.speed+extra.spd).toFixed(2);
    u.def=+((u.def||0)+extra.def).toFixed(1);
    u.econGb=extra;
    if(u.hp>u.maxhp) u.hp=u.maxhp;
  }

  function wrapOnce(name, flag, fn){
    try{
      const g=typeof window!=='undefined'?window:null;
      // functions live in IIFE scope, not window — use bare names
    }catch(e){}
    try{ fn(); }catch(e){}
  }

  function install(){
    try{
      if(typeof killEnemy==='function' && !killEnemy._econDrop){
        const _ke=killEnemy;
        killEnemy=function(src,e){
          if(!e||e.dead)return;
          const r=_ke.apply(this, arguments);
          try{ onKillDrop(e); }catch(err){}
          return r;
        };
        killEnemy._econDrop=1;
      }
    }catch(e){}
    try{
      if(typeof rollDrops==='function' && !rollDrops._econDrop){
        const _rd=rollDrops;
        rollDrops=function(e,cb){
          const r=_rd.apply(this, arguments);
          try{ onKillDrop(e); }catch(err){}
          return r;
        };
        rollDrops._econDrop=1;
      }
    }catch(e){}
    try{
      if(typeof dgKill==='function' && !dgKill._econDrop){
        const _dk=dgKill;
        dgKill=function(src,e){
          if(!e||e.dead)return;
          const r=_dk.apply(this, arguments);
          try{ onKillDrop(e); }catch(err){}
          return r;
        };
        dgKill._econDrop=1;
      }
    }catch(e){}
    try{
      if(typeof dgExit==='function' && !dgExit._econDrop){
        const _ex=dgExit;
        dgExit=function(keep){
          try{
            const left=pile().filter(function(d){ return d&&d.dg; });
            if(keep){
              left.forEach(function(d){
                try{ addItem(d.item); }catch(err){}
              });
            }
            S.econ.groundGear=pile().filter(function(d){ return d&&!d.dg; });
          }catch(err){}
          return _ex.apply(this, arguments);
        };
        dgExit._econDrop=1;
      }
    }catch(e){}
    try{
      if(typeof draw==='function' && !draw._econDrop){
        const _d=draw;
        draw=function(){
          const r=_d.apply(this, arguments);
          try{ drawDrops(); }catch(err){}
          return r;
        };
        draw._econDrop=1;
      }
    }catch(e){}
    try{
      if(typeof update==='function' && !update._econDrop){
        const _u=update;
        update=function(dt){
          const r=_u.apply(this, arguments);
          try{ pickupNear(); }catch(err){}
          return r;
        };
        update._econDrop=1;
      }
    }catch(e){}
    try{
      if(typeof tapAt==='function' && !tapAt._econDrop){
        const _t=tapAt;
        tapAt=function(x,y){
          try{
            if(typeof screenToWorld==='function'){
              const w=screenToWorld(x,y);
              const d=nearestDropIso(w, 72);
              if(d && pickup(d)) return;
            }
          }catch(err){}
          return _t.apply(this, arguments);
        };
        tapAt._econDrop=1;
      }
    }catch(e){}
    try{
      if(typeof rightClick==='function' && !rightClick._econDrop){
        const _r=rightClick;
        rightClick=function(mx,my,shift){
          try{
            if(typeof screenToWorld==='function'){
              const w=screenToWorld(mx,my);
              const d=nearestDropIso(w, 72);
              if(d && pickup(d)) return;
            }
          }catch(err){}
          return _r.apply(this, arguments);
        };
        rightClick._econDrop=1;
      }
    }catch(e){}
    try{
      if(typeof gearApply==='function' && !gearApply._econDrop){
        const _ga=gearApply;
        gearApply=function(u){
          try{ if(u&&u.econGb) econStrip(u); }catch(err){}
          const r=_ga.apply(this, arguments);
          try{ econApply(u); }catch(err){}
          return r;
        };
        gearApply._econDrop=1;
      }
    }catch(e){}
    try{
      if(typeof stripGear==='function' && !stripGear._econDrop){
        const _sg=stripGear;
        stripGear=function(u){
          try{ if(u&&u.econGb) econStrip(u); }catch(err){}
          return _sg.apply(this, arguments);
        };
        stripGear._econDrop=1;
      }
    }catch(e){}
    attach();
  }

  function screenOf(tx,ty){
    try{
      const q=iso(tx,ty);
      return worldToScreen(q.x,q.y);
    }catch(e){ return null; }
  }

  function attach(){
    try{
      if(typeof window==='undefined') return;
      const E=A();
      if(typeof E.ENEMY_GEAR_DROP!=='number') E.ENEMY_GEAR_DROP=0.02;
      E.DROP_PICK_R=ECON_DROP_PICK_R;
      E.DROP_PICK_DELAY=ECON_DROP_PICK_DELAY;
      E.econOnEnemyKill=onKillDrop;
      E.econPickupGround=pickup;
      E.econGroundList=function(){ return pile().slice(); };
      E.econDropSpawnEnemy=function(type,x,y,realm){
        if(typeof makeEnemy!=='function' || typeof S==='undefined' || !S) return null;
        const e=makeEnemy(type||'wolf', x, y, {realm:realm||0});
        S.enemies=S.enemies||[];
        S.enemies.push(e);
        return e;
      };
      E.econWorldScreen=screenOf;
      E.econDropRate=dropRate;
      E.econDropForce=function(on){ E.ENEMY_GEAR_DROP_FORCE=!!on; return dropRate(); };
      if(window.XW) window.XW.econ=E;
    }catch(e){}
  }

  attach();
  try{
    if(typeof setTimeout==='function'){
      setTimeout(function(){ install(); }, 0);
      setTimeout(function(){ install(); }, 80);
      setTimeout(function(){ install(); }, 400);
    }else install();
  }catch(e){}
})();
