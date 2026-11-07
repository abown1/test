// ===== net13：副本中倒下（#10）=====
// 每個玩家自己的倒下面板（只在自己的頁面，不暫停、不擋別人）：⟳ 復活（等 NET13.revDelay 毫秒）／👁 觀戰／🚪 離開。
// 成員：角色重傷送回宗門（hp=1，跟以前一樣不會永久隕落），但畫面留在副本觀戰；復活 → 半血回到副本入口；離開 → 回宗門。
// 房主：主角重傷送回宗門（副本停放給隊友），面板 → 復活（半血回入口）／留在宗門。
// 永不卡住：副本結束、斷線、回到隊伍、離開房間 → 面板自動關閉。
const NET13={on:NET_FLAGS.dgdeath,revDelay:5000,revHp:0.5}; // 開關：?netexp=-dgdeath 回到舊行為（倒下直接送回宗門）
NET.down=null; // 本頁的倒下面板狀態 {t0,host,min}
function netDownShow(host){NET.down={t0:Date.now(),host:!!host,min:false};netDownRender();}
function netDownClose(){if(!NET.down)return;NET.down=null;netDownRender();}
function netDownLeft(){const D=NET.down;return D?Math.max(0,NET13.revDelay-(Date.now()-D.t0)):0;}
function netDownRender(){let el=document.getElementById('netdown');const D=NET.down;
  if(!D){if(el)el.style.display='none';return;}
  if(!el){el=document.createElement('div');el.id='netdown';el.style.cssText='position:fixed;left:50%;transform:translateX(-50%);z-index:60;background:rgba(30,12,12,.92);border:1px solid #a55;border-radius:8px;color:#fdd;font-size:14px;box-shadow:0 2px 12px #000a';
    el.addEventListener('click',e=>{const b=e.target.closest('[data-nd]');if(b){e.stopPropagation();netDownAct(b.dataset.nd);}});document.body.appendChild(el);}
  const s=Math.ceil(netDownLeft()/1000);const rev=s>0?`⟳ 復活（${s}）`:'⟳ 復活';
  const h=D.min?`<div style="padding:5px 12px;cursor:pointer" data-nd="max">💀 重傷・觀戰中　<b data-nd="rev">${rev}</b>　<span data-nd="leave">🚪 離開</span></div>`
    :`<div style="padding:12px 16px;text-align:center"><div style="font-size:16px;margin-bottom:6px">💀 你重傷倒下</div><div style="opacity:.8;margin-bottom:10px">${D.host?'隊友還在秘境裡，你被送回宗門。':'角色已被送回宗門療傷，畫面留在秘境。'}</div>
      <button class="btn" data-nd="rev" ${s>0?'disabled':''}>${rev}</button> ${D.host?'':'<button class="btn" data-nd="spec">👁 觀戰</button> '}<button class="btn" data-nd="leave">${D.host?'🏯 留在宗門':'🚪 離開'}</button></div>`;
  if(el._h!==h){el._h=h;el.innerHTML=h;}el.style.top=D.min?'52px':'30%';el.style.display='';}
function netDownAct(a){const D=NET.down;if(!D)return false;
  if(a==='rev'){if(netDownLeft()>0)return false;if(D.host){const ok=netDgRevHost();if(ok)netDownClose();return ok;}netIntent({a:'dgrev'});return true;}
  if(a==='spec'){D.min=true;netDownRender();return true;}
  if(a==='max'){D.min=false;netDownRender();return true;}
  if(a==='leave'){if(!D.host)netIntent({a:'dgspecx'});else if(NET.dgInv){NET.dgInv.open=false;netDgInvRender();}netDownClose();return true;}
  return false;}
// 房主：復活回副本
function netDgRevHost(){if(!NET.dgPark||!netDgRun())return false;const hp=netHostPlayerU();if(!hp||hp.dead)return false;
  hp.hp=Math.max(hp.hp,Math.round(hp.maxhp*NET13.revHp));hp.dgHurt=false;return !!netDgHostJoin();}
// 主機：成員倒下 → 角色送回宗門，玩家改成觀戰並收到倒下面板；房主倒下（隊友還在）→ 房主自己的面板
{const _x=netDgLeaveNow;netDgLeaveNow=function(u,why){
  if(!NET13.on||why!=='down'||NET.role!=='host'||!u)return _x.apply(this,arguments);
  const p=u.np?NET.players.get(u.np):null;const live=p&&p.online&&p.cid!=null&&!p.host;
  if(live)p.spec=true; // 不送 dgout：留在副本畫面
  const r=_x.apply(this,arguments);
  const D=netDgRun();
  if(live){if(D&&!D.end&&p.spec){p.downAt=Date.now();try{NET.tr.send(p.cid,{t:'dgdown',d:NET13.revDelay});}catch(e){}netLog('member down → spectating',u.np);}
    else if(!D&&p.spec)p.spec=false;}
  else if(u.kind==='player'&&!u.np&&D&&NET.dgPark){netDownShow(true);netLog('host down → parked, revive panel');}
  return r;};}
{const _x=netIntentRegion;netIntentRegion=function(pk,i){if(i&&i.a==='dgrev')return null;return _x.apply(this,arguments);};}
{const _x=netApplyIntent0;netApplyIntent0=function(pk,i){if(!i||i.a!=='dgrev')return _x.apply(this,arguments);
  const p=NET.players.get(pk),a=netAvatarOf(pk),D=netDgRun();
  if(!NET13.on||!p||!p.spec||!D||D.end||!a||a.dead||netDgUnits().includes(a))return false;
  if(p.downAt&&Date.now()-p.downAt<NET13.revDelay-300)return false; // 不信任成員端的倒數
  a.hp=Math.max(a.hp,Math.round(a.maxhp*NET13.revHp));a.dgHurt=false;const r=netDgJoin(pk);if(r){p.downAt=0;NET.stats.applied++;}return !!r;};}
// 成員端
{const _x=netClientRxExtra;netClientRxExtra=function(m){if(m&&m.t==='dgdown'){if(S.dg)netDownShow(false);return;}return _x.apply(this,arguments);};}
{const _x=netDgClientStart;netDgClientStart=function(m){const r=_x.apply(this,arguments);try{const a=netAvatarOf(NET.pkey);if(a&&(m.ids||[]).includes(a.id))netDownClose();}catch(e){}return r;};}
{const _x=netDgClientEnd;netDgClientEnd=function(){const r=_x.apply(this,arguments);netDownClose();return r;};}
// 房主回到副本（邀請「加入」或面板）→ 關面板；保底：狀態不再成立就自動關
{const _x=netDgHostJoin;netDgHostJoin=function(){const r=_x.apply(this,arguments);if(r)netDownClose();return r;};}
setInterval(()=>{const D=NET.down;if(!D)return;
  const stale=D.host?(NET.role!=='host'||!NET.dgPark||!netDgRun()):(NET.role!=='client'||!S.dg);
  if(stale)netDownClose();else netDownRender();},250);
{const _x=XW045;XW045=function(){const o=_x.apply(this,arguments);if(o.net){o.net.down={act:netDownAct,cfg:NET13,get st(){const D=NET.down;return D?{host:D.host,min:D.min,left:netDownLeft()}:null;}};}return o;};}
