// ================== 仙武經濟：敵裝落地掉落（地面可拾取）==================
(function(){
  // pick2（2026-11-11，收回隊長 g12 TUNE.pickFix）：預設開，?pick2=0 關回舊行為
  const ECON_PICK2 = (function(){ try{ return !/[?&]pick2=0\b/.test(location.search); }catch(e){ return true; } })();
  const ECON_DROP_PICK_R = ECON_PICK2 ? 2.2 : 1.35;  // 走近自動拾取半徑（格）
  const ECON_PICK_CLICK_R = 44;       // 點擊判定（螢幕 px，觸控 56）：菱形或上方 16px 黃字
  const ECON_DROP_PICK_DELAY = 0.85;  // 待使用者確認：落地後延遲自動拾取（秒），避免近戰擊殺瞬間進包
  const ECON_DROP_SEEN_MS = 2500;     // 待使用者確認：同一敵人去重視窗
  const recent = [];
  const DROP_WRAPPED = {};           // install() 跑三次；別的模組中途再包一層會蓋掉函式上的標記 → 改用模組內登記，每個只包一次
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
  let lastFullT=-99;
  function nmItem(it){ try{ if(typeof itemName==='function') return itemName(it); }catch(e){} return (it&&(it.n||it.t))||'裝備'; }
  function pickup(d,u,forceToast){
    if(!d||!d.item) return false;
    try{
      if(typeof S!=='undefined'&&S&&S.inv){
        const cap=typeof econInvCap==='function'?econInvCap(typeof player==='function'?player():null):(typeof TUNE!=='undefined'&&TUNE.invCap)||99;
        if((typeof econInvUsedX==='function'?econInvUsedX():S.inv.length)>=cap){
          if(!ECON_PICK2){ try{ toast('行囊已滿'); }catch(e){} return false; }
          const now=S.time||0;
          if(forceToast!==false||now-lastFullT>1.2){ try{ toast('行囊已滿，無法拾取「'+nmItem(d.item)+'」'); }catch(e){} lastFullT=now; }
          return false;   // 不走 addItem 的「化為靈石」分支，物品留在地上
        }
      }
    }catch(e){}
    let ok=true;
    try{ ok=addItem(d.item, d.x, d.y); }catch(e){ ok=false; }
    if(ok===false) return false;
    try{ S.econ.groundGear=pile().filter(function(x){ return x!==d; }); }catch(e){}
    try{
      const pl=playerP();
      const who=(u&&u!==pl)?((typeof nm==='function'?nm(u):(u.name||''))||''):'你';
      toast((ECON_PICK2&&who?who+' 拾取 ':'拾取 ')+nmItem(d.item));
    }catch(e){}
    return true;
  }
  // pick2：主角與未入室、未死亡的弟子都能撿（共用行囊），取最近者
  function holders(){
    const us=[];
    try{ const p=playerP(); if(p&&!p.dead&&!p.inside) us.push(p); }catch(e){}
    if(!ECON_PICK2) return us;
    try{
      const ds=(typeof disciples==='function')?disciples():((S&&S.units)||[]).filter(function(x){ return x&&x.kind==='disciple'; });
      for(let i=0;i<ds.length;i++){ const u=ds[i]; if(u&&!u.dead&&!u.inside&&us.indexOf(u)<0) us.push(u); }
    }catch(e){}
    return us;
  }
  function nearestHolder(d,r){
    let best=null, bd=r;
    const us=holders();
    for(let i=0;i<us.length;i++){ const u=us[i], dd=Math.hypot((u.x||0)-(d.x||0),(u.y||0)-(d.y||0)); if(dd<=bd){ bd=dd; best=u; } }
    return best;
  }
  // pick2：螢幕座標判定，與 drawDrops 一致（菱形 + 上方 16px 黃字）
  function dropAtScreen(mx,my){
    if(typeof worldToScreen!=='function'||typeof iso!=='function') return null;
    let rad=ECON_PICK_CLICK_R;
    try{ if(typeof isTouchUI!=='undefined'&&isTouchUI) rad=Math.max(rad,56); }catch(e){}
    let best=null, bd=rad;
    const dg=inDungeon(), list=pile();
    for(let i=0;i<list.length;i++){
      const d=list[i]; if(!d||!!d.dg!==dg) continue;
      const s=screenOf(d.x,d.y); if(!s) continue;
      const dd=Math.min(Math.hypot(mx-s.x,my-s.y),Math.hypot(mx-s.x,my-(s.y-16)));
      if(dd<bd){ bd=dd; best=d; }
    }
    return best;
  }
  // 點到掉落：近者立撿；遠者指揮中的單位（無則主角）走過去，主角在其中就登記「抵達再撿」
  function goPick(d,shift){
    if(!d) return false;
    const u=nearestHolder(d,ECON_DROP_PICK_R);
    if(u) return pickup(d,u,true);
    try{ if(S&&S.inv&&(typeof econInvUsedX==='function'?econInvUsedX():S.inv.length)>=(typeof econInvCap==='function'?econInvCap(playerP()):(TUNE&&TUNE.invCap)||99)){ pickup(d,null,true); return true; } }catch(e){}
    let us=[];
    try{ if(typeof commandUnits==='function') us=(commandUnits()||[]).filter(function(x){ return x&&!x.dead; }); }catch(e){}
    const p=playerP();
    if(!us.length && p && !p.dead) us=[p];
    if(!us.length) return true;
    try{
      if(typeof commandMove==='function') commandMove(us,d.x,d.y,!!shift);
      else us.forEach(function(x){ if(typeof setTask==='function') setTask(x,{type:'move',x:d.x,y:d.y}); });
      if(p && us.indexOf(p)>=0 && p.task && p.task.type==='move'){ p.task.x=d.x; p.task.y=d.y; pend={id:d.id,t:(S&&S.time)||0,dg:inDungeon()}; }
    }catch(e){}
    return true;
  }
  // B2：室內完全不理會戶外掉落（座標系不同，室內座標可能剛好和戶外掉落重疊）
  function indoor(){ try{ return !!(typeof S!=='undefined'&&S&&S.interior); }catch(e){ return false; } }
  const ECON_DROP_DIRECT_R = ECON_PICK2 ? 2.2 : 1.5;     // 右鍵拾取：1.5 格內直接撿；更遠先走過去，抵達再撿
  let pend=null;                      // {id,t}：走向中的掉落；玩家下別的移動指令就取消
  function playerP(){ try{ return typeof player==='function'?player():null; }catch(e){ return null; } }
  function pendTick(){
    if(!pend) return;
    try{
      if(indoor()||inDungeon()!==pend.dg){ pend=null; return; }
      const p=playerP(); if(!p||p.dead){ pend=null; return; }
      const d=pile().find(function(x){ return x&&x.id===pend.id; });
      if(!d){ pend=null; return; }
      const dd=Math.hypot(p.x-d.x,p.y-d.y);
      if(dd<=ECON_DROP_DIRECT_R){ pend=null; pickup(d); return; }
      const tk=p.task;
      if(tk&&tk.type==='move'&&tk.x!=null&&Math.hypot(tk.x-d.x,tk.y-d.y)>2){ pend=null; return; }   // 改走別處
      if(tk&&tk.type&&tk.type!=='move'){ pend=null; return; }                                       // 改做別的事
      if(!tk&&!(p.path&&p.path.length)&&S.time-pend.t>0.6){ pend=null; return; }                    // 停在別處
    }catch(e){ pend=null; }
  }
  function pickupNear(){
    try{
      if(indoor()) return;
      const p=typeof player==='function'?player():null;
      if(ECON_PICK2){
        const list=pile().slice(), dg=inDungeon(), t=(S&&S.time)||0;
        for(let i=0;i<list.length;i++){
          const d=list[i]; if(!d||!!d.dg!==dg) continue;
          if(t-(d.t||0)<ECON_DROP_PICK_DELAY) continue;
          const u=nearestHolder(d,ECON_DROP_PICK_R);
          if(u && !pickup(d,u,false)) break;   // 行囊滿：停止並保留在地上
        }
        return;
      }
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
    if(indoor()) return;
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

  function wornPctOf(u){
    try{
      const fn=A().econGearWornPct || (typeof window!=='undefined'?window.econGearWornPct:null);
      if(typeof fn==='function')return fn(u);
    }catch(e){}
    const o={hpPct:0,atkPct:0,defPct:0,move:0,dodge:0,gather:0};
    const eq=u&&u.eq||{};
    for(const k in eq){
      const it=eq[k];
      if(!it||!it.affixes)continue;
      for(let i=0;i<it.affixes.length;i++){
        const a=it.affixes[i];
        if(a&&a.k&&a.k in o)o[a.k]+=(+a.v||0);
      }
    }
    return o;
  }
  function econStrip(u){
    const g=u&&u.econGb;
    if(!g) return;
    u.atk=+(u.atk-(g.atk||0)).toFixed(1);
    u.maxhp=Math.round(u.maxhp-(g.hp||0));
    u.speed=+(u.speed-(g.spd||0)).toFixed(2);
    u.def=+((u.def||0)-(g.def||0)).toFixed(1);
    if(g.eva)u.eva=+((u.eva||0)-g.eva);
    if(g.gat)u.gat=+((u.gat||0)-g.gat).toFixed(3);
    if(u.hp>u.maxhp) u.hp=u.maxhp;
    u.econGb=null;
  }
  function econApply(u){
    if(!u) return;
    if(u.econGb) econStrip(u);
    const pct=wornPctOf(u);
    const extra={atk:0,hp:0,def:0,spd:0,eva:0,gat:0};
    const baseAtk=u.atk, baseHp=u.maxhp, baseDef=u.def||0, baseSpd=u.speed;
    extra.atk=+(baseAtk*((pct.atkPct||0)/100)).toFixed(1);
    extra.hp=Math.round(baseHp*((pct.hpPct||0)/100));
    extra.def=+(baseDef*((pct.defPct||0)/100)).toFixed(1);
    // 第④輪 F-073 每件品級：各件 (基礎＋加值)×乘數 − 基礎，先加總；百分比詞條也作用在這部分（品級關＝0）
    try{const V=A().gearV2||(typeof window!=='undefined'?window.econGearV2:null);if(V&&typeof V.gradeExtra==='function'){const ge=V.gradeExtra(u);
      if(ge.atk||ge.hp||ge.def||ge.spd){extra.atk=+(extra.atk+ge.atk*(1+(pct.atkPct||0)/100)).toFixed(1);extra.hp=Math.round(extra.hp+ge.hp*(1+(pct.hpPct||0)/100));extra.def=+(extra.def+ge.def*(1+(pct.defPct||0)/100)).toFixed(1);if(ge.spd)extra.spd=+(extra.spd+ge.spd*(1+(pct.move||0)/100)).toFixed(2);}}}catch(e){}
    extra.spd=+(baseSpd*((pct.move||0)/100)).toFixed(2);
    extra.eva=(pct.dodge||0)/100;
    extra.gat=+((u.gat||0)*((pct.gather||0)/100)).toFixed(3);
    const any=extra.atk||extra.hp||extra.def||extra.spd||extra.eva||extra.gat;
    if(!any){ u.econGb=null; return; }
    u.atk=+(u.atk+extra.atk).toFixed(1);
    u.maxhp=Math.round(u.maxhp+extra.hp);
    u.speed=+(u.speed+extra.spd).toFixed(2);
    u.def=+((u.def||0)+extra.def).toFixed(1);
    if(extra.eva)u.eva=(u.eva||0)+extra.eva;
    if(extra.gat)u.gat=+((u.gat||0)+extra.gat).toFixed(3);
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
      if(typeof killEnemy==='function' && !killEnemy._econDrop && !DROP_WRAPPED.killEnemy){
        const _ke=killEnemy;
        killEnemy=function(src,e){
          if(!e||e.dead)return;
          const r=_ke.apply(this, arguments);
          try{ onKillDrop(e); }catch(err){}
          return r;
        };
        killEnemy._econDrop=1; DROP_WRAPPED.killEnemy=1;
      }
    }catch(e){}
    try{
      if(typeof rollDrops==='function' && !rollDrops._econDrop && !DROP_WRAPPED.rollDrops){
        const _rd=rollDrops;
        rollDrops=function(e,cb){
          const r=_rd.apply(this, arguments);
          try{ onKillDrop(e); }catch(err){}
          return r;
        };
        rollDrops._econDrop=1; DROP_WRAPPED.rollDrops=1;
      }
    }catch(e){}
    try{
      if(typeof dgKill==='function' && !dgKill._econDrop && !DROP_WRAPPED.dgKill){
        const _dk=dgKill;
        dgKill=function(src,e){
          if(!e||e.dead)return;
          const r=_dk.apply(this, arguments);
          try{ onKillDrop(e); }catch(err){}
          return r;
        };
        dgKill._econDrop=1; DROP_WRAPPED.dgKill=1;
      }
    }catch(e){}
    try{
      if(typeof dgExit==='function' && !dgExit._econDrop && !DROP_WRAPPED.dgExit){
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
        dgExit._econDrop=1; DROP_WRAPPED.dgExit=1;
      }
    }catch(e){}
    try{
      if(typeof draw==='function' && !draw._econDrop && !DROP_WRAPPED.draw){
        const _d=draw;
        draw=function(){
          const r=_d.apply(this, arguments);
          try{ drawDrops(); }catch(err){}
          return r;
        };
        draw._econDrop=1; DROP_WRAPPED.draw=1;
      }
    }catch(e){}
    try{
      if(typeof update==='function' && !update._econDrop && !DROP_WRAPPED.update){
        const _u=update;
        update=function(dt){
          const r=_u.apply(this, arguments);
          try{ pendTick(); }catch(err){}
          try{ pickupNear(); }catch(err){}
          return r;
        };
        update._econDrop=1; DROP_WRAPPED.update=1;
      }
    }catch(e){}
    try{
      if(typeof tapAt==='function' && !tapAt._econDrop && !DROP_WRAPPED.tapAt){
        const _t=tapAt;
        tapAt=function(x,y){
          try{
            if(ECON_PICK2 && !indoor()){
              const d=dropAtScreen(x,y);
              if(d){ pend=null; goPick(d,false); return; }   // 掉落優先於單位／名牌選取
            }else if(!indoor() && typeof screenToWorld==='function'){
              const w=screenToWorld(x,y);
              const d=nearestDropIso(w, 72);
              const p=playerP();
              // 點按只在 1.5 格內直接撿；遠的照原本點按（走近後由 pickupNear 自動撿）
              if(d && p && Math.hypot(p.x-d.x,p.y-d.y)<=ECON_DROP_DIRECT_R && pickup(d)) return;
            }
          }catch(err){}
          return _t.apply(this, arguments);
        };
        tapAt._econDrop=1; DROP_WRAPPED.tapAt=1;
      }
    }catch(e){}
    try{
      if(typeof rightClick==='function' && !rightClick._econDrop && !DROP_WRAPPED.rightClick){
        const _r=rightClick;
        rightClick=function(mx,my,shift){
          pend=null;                                   // 任何新的右鍵指令都取消先前的「走去撿」
          if(indoor()) return _r.apply(this, arguments); // 室內：原樣交給室內移動／入座
          if(ECON_PICK2){
            try{
              if(!buildMode){ const d2=dropAtScreen(mx,my); if(d2){ goPick(d2,shift); return; } }
            }catch(err){}
            return _r.apply(this, arguments);
          }
          let d=null;
          try{
            if(!buildMode && typeof screenToWorld==='function'){
              const w=screenToWorld(mx,my);
              d=nearestDropIso(w, 72);
              const p=playerP();
              if(d && p && !p.dead){
                if(Math.hypot(p.x-d.x,p.y-d.y)<=ECON_DROP_DIRECT_R){ if(pickup(d)) return; d=null; }
              }else d=null;
            }
          }catch(err){ d=null; }
          // 遠處掉落：點到的是掉落（不是敵人）→ 指揮中的單位走過去；主角在其中就登記「抵達再撿」
          try{
            const p=playerP();
            const w=d?screenToWorld(mx,my):null;
            const foe=w&&typeof enemyAt==='function'?enemyAt(w):null;
            const us=d&&!foe&&typeof commandUnits==='function'?commandUnits():[];
            if(d && p && us.indexOf(p)>=0 && typeof commandMove==='function'){
              commandMove(us, d.x, d.y, shift);
              if(p.task && p.task.type==='move'){
                p.task.x=d.x; p.task.y=d.y;
                pend={id:d.id,t:(S&&S.time)||0,dg:inDungeon()};
              }
              return;
            }
          }catch(err){}
          return _r.apply(this, arguments);
        };
        rightClick._econDrop=1; DROP_WRAPPED.rightClick=1;
      }
    }catch(e){}
    try{
      if(typeof gearApply==='function' && !gearApply._econDrop && !DROP_WRAPPED.gearApply){
        const _ga=gearApply;
        gearApply=function(u){
          try{ if(u&&u.econGb) econStrip(u); }catch(err){}
          const r=_ga.apply(this, arguments);
          try{ econApply(u); }catch(err){}
          return r;
        };
        gearApply._econDrop=1; DROP_WRAPPED.gearApply=1;
      }
    }catch(e){}
    try{
      if(typeof stripGear==='function' && !stripGear._econDrop && !DROP_WRAPPED.stripGear){
        const _sg=stripGear;
        stripGear=function(u){
          try{ if(u&&u.econGb) econStrip(u); }catch(err){}
          return _sg.apply(this, arguments);
        };
        stripGear._econDrop=1; DROP_WRAPPED.stripGear=1;
      }
    }catch(e){}
    try{
      if(ECON_PICK2 && typeof playerInteract==='function' && !playerInteract._econDrop && !DROP_WRAPPED.playerInteract){
        const _pi=playerInteract;
        playerInteract=function(){
          try{
            if(!indoor()){
              const p=playerP();
              if(p&&!p.dead){ const d=nearestDropXY(p.x,p.y,ECON_DROP_PICK_R); if(d){ goPick(d,false); return; } }
            }
          }catch(err){}
          return _pi.apply(this, arguments);
        };
        playerInteract._econDrop=1; DROP_WRAPPED.playerInteract=1;
      }
    }catch(e){}
    // pick2：econ 已收回拾取邏輯 → 關掉隊長 g12 的暫時包覆（TUNE.pickFix），避免兩層同時處理
    if(ECON_PICK2){
      try{ if(typeof TUNE!=='undefined'&&TUNE){ TUNE.pickFix=Object.assign({},TUNE.pickFix||{},{on:false}); } }catch(e){}
      try{ const E=A(); if(E.PICK_FIX) E.PICK_FIX.on=false; else E.PICK_FIX={on:false}; }catch(e){}
    }
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
      E.ECON_PICK2=ECON_PICK2;
      if(ECON_PICK2){
        E.econDropAtScreen=dropAtScreen; E.econGoPick=goPick;
        E.xwPickGround=pickup; E.xwDropAtScreen=dropAtScreen; E.xwGoPick=goPick;
        if(window.XW){ window.XW.xwPickGround=pickup; window.XW.xwDropAtScreen=dropAtScreen; window.XW.xwGoPick=goPick; }
      }
      E.econDropPending=function(){ return pend?Object.assign({},pend):null; };
      E.DROP_DIRECT_R=ECON_DROP_DIRECT_R;
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
