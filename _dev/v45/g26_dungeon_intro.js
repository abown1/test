// ================== g26：副本介紹置中＋「可獲得物品」收合清單 ==================
// 適用所有 DGS 副本（經典 4 本＋map 註冊的外層副本）。入口資訊卡（dgatePanel）、走到入口的「進入秘境？」對話框、
// 聯機「加入隊友」對話框、🌐 世間秘葬清單都會附上可收合的掉落清單。掉落內容一律由程式中的實際表讀出：
//   g13 dgKill（食物／鐵礦／靈石）、g13 dgBossDown（首領通關）、g12 DROPS＋rollDrops 裝備機率、
//   g12 enemyItemDropPermit（每隻敵人 2% 物品事件）、g20 v51 功法規則、econ_drop 地面裝備、map_enemies 至寶（旗標開啟時）。
// 不改 econ*/cult*/net*/map*：只包 dgatePanel／renderPanel／x47Dlg／x47DgEnterAsk，並以 CSS 重新定位。
const DGI={open:false,dec:0,inj:0,tog:0,kind:null};
try{DGI.open=localStorage.getItem('xw_dgi_open')==='1';}catch(e){}
const DGI_ITEM_EVENT=0.02;   // 與 g12 enemyItemDropPermit 的 rnd()<0.02 相同
const DGI_GEAR_P={bandit:0.05,chief:0.15,warden:0.25,golem:0.08,xfguard:0.12,xfboss:0.40};   // 與 g12 rollDrops 的 gp 表相同
function dgiPct(p){p=+p||0;const v=p*100;return (v>=10?Math.round(v):v>=1?+v.toFixed(1):+v.toFixed(2))+'%';}
function dgiN(k){try{return cname(k);}catch(e){return k;}}
function dgiEnemyN(t){try{return (ENEMY[t]&&ENEMY[t].n)||t;}catch(e){return t;}}
function dgiTune(){try{return TUNE.v51||{};}catch(e){return {};}}
// 既有首領通關獎勵（與分級掉落並存）：對照 g13 dgBossDown（經典四本）與 g20 v51 功法規則
function dgiBoss(kind){const T=dgiTune(),A=[];const r=(a,b)=>a===b?String(a):a+'～'+b;
  if(kind==='cave'){A.push([dgiN('herb'),r(10,20)],[dgiN('hide'),r(3,6)],[dgiN('core'),'2'],[dgiN('lingzhi'),'1（50%）'],['丹方','1（25%，學會未學過的）']);}
  else if(kind==='jail'){A.push([dgiN('iron'),r(15,30)],[dgiN('lingshi'),r(5,10)],['裝備','1 件（隨機款式）'],['武學秘籍','1（20%）']);}
  else if(kind==='ruin'){A.push([dgiN('xuantie'),'1'],[dgiN('lingshi'),r(10,20)],[dgiN('lingzhi'),'1'],['丹方','1（40%）'],['功法',`約 ${dgiPct(T.gfRuinDg!=null?T.gfRuinDg:0.06)}（太密集時改為功法殘頁＋靈石 ${T.gfDupLs!=null?T.gfDupLs:'?'}）`]);}
  else if(kind==='xf'){A.push(['仙凡令','1（突破煉氣必需）'],[dgiN('lingshi'),'30'],[dgiN('xuantie'),'2'],[dgiN('lingzhi'),'2'],['功法',`首次通關必得，之後 ${dgiPct(T.gfXfRepeat!=null?T.gfXfRepeat:0.1)}（太密集時改為功法殘頁）`]);}
  return A;}
// 仙武新地圖的分級掉落（map_dg_loot.js mapDgLootList(kind)）：每次開啟清單時即時讀取，為主要來源。
// 回傳 [{tier,tierN,type,typeN,id,name,q,p,bossP,skills:[{n,qi}]}]；檔機率讀 MAP_DG_LOOT_RATES／MAP_DG_LOOT_BOSS_RATES。
function dgiTierList(kind){try{if(typeof mapDgLootOn==='function'&&!mapDgLootOn())return null;if(typeof mapDgLootList!=='function')return null;const L=mapDgLootList(kind);return Array.isArray(L)&&L.length?L:null;}catch(e){return null;}}
function dgiTierRates(){let a=null,b=null;try{a=typeof MAP_DG_LOOT_RATES!=='undefined'?MAP_DG_LOOT_RATES:null;}catch(e){}try{b=typeof MAP_DG_LOOT_BOSS_RATES!=='undefined'?MAP_DG_LOOT_BOSS_RATES:null;}catch(e){}return {room:a,boss:b};}
function dgiTierHtml(kind,L){const R=dgiTierRates(),ic={good:'🟨',mid:'🟦',bad:'⬜'},out=[];
  const rr=(W,k)=>W&&typeof W[k]==='number'?dgiPct(W[k]):'?';
  out.push(`<div class="dgi-s">每清完一間有敵人的一般房擲 1 次：好 ${rr(R.room,'good')}／中 ${rr(R.room,'mid')}／爛 ${rr(R.room,'bad')}；擊敗首領：好 ${rr(R.boss,'good')}／中 ${rr(R.boss,'mid')}／爛 ${rr(R.boss,'bad')}。同檔內每樣機率相同。</div>`);
  for(const t of ['good','mid','bad']){const A=L.filter(x=>x.tier===t);if(!A.length)continue;
    out.push(`<div class="dgi-h">${ic[t]} ${A[0].tierN||({good:'好',mid:'中',bad:'爛'})[t]}（${A.length} 樣）</div><ul>${A.map(x=>{
      let q='';try{if(x.q!=null&&typeof QN!=='undefined'&&QN[x.q]&&!String(x.name||'').includes(QN[x.q]))q='・'+QN[x.q];}catch(e){}
      const sk=Array.isArray(x.skills)&&x.skills.length?`<span class="dgi-s">（${x.skills.map(k=>k.n+(k.qi?` 靈氣 ${k.qi}`:'（不耗靈氣）')).join('、')}）</span>`:'';
      return `<li><span class="dgi-ty">${x.typeN||x.type}</span> ${x.name||x.id}${q}　<span class="dgi-q">一般 ${dgiPct(x.p)}／首領 ${dgiPct(x.bossP)}</span>${sk}</li>`;}).join('')}</ul>`);}
  return out.join('');}
function dgiLootHtml(kind,opt){opt=opt||{};const G=(typeof DGS!=='undefined'&&DGS[kind])||null;if(!G)return '';
  const TL=dgiTierList(kind);
  const types=[];for(const t of (G.mobs||[]))if(types.indexOf(t)<0)types.push(t);const boss=G.boss;
  const all=types.slice();if(boss&&all.indexOf(boss)<0)all.push(boss);
  const sec=[];
  if(TL)sec.push(`<div class="dgi-h dgi-h1">🎲 分級掉落（裝備／功法${TL.some(x=>x.type==='treasure')?'／至寶':''}）</div>`+dgiTierHtml(kind,TL));
  const B=dgiBoss(kind);
  if(B.length)sec.push(`<div class="dgi-h">👑 首領「${G.bossN||dgiEnemyN(boss)}」通關獎勵</div><ul>${B.map(x=>`<li>${x[0]}　<span class="dgi-q">${x[1]}</span></li>`).join('')}</ul><div class="dgi-s">困難模式：首領獎勵數量 ×1.5</div>`);
  else sec.push(`<div class="dgi-h">👑 首領「${G.bossN||dgiEnemyN(boss)}」</div><div class="dgi-s">${TL?'擊敗首領時擲 1 次分級掉落（首領機率），另有下方的擊殺掉落。':'此副本沒有額外的通關寶箱，獎勵來自下方的擊殺掉落。'}</div>`);
  // 每隻敵人的固定掉落（g13 dgKill）
  let food=false,human=false;for(const t of all){const E=ENEMY[t]||{};if(E.food)food=true;if(E.human)human=true;}
  const base=[];if(food)base.push(`${dgiN('food')}（妖獸）`);if(human)base.push(`${dgiN('iron')}（人形敵）`);base.push(`${dgiN('lingshi')}（35%）`);
  sec.push(`<div class="dgi-h">⚔ 擊殺敵人</div><ul><li>${base.join('、')}</li></ul>`);
  // 稀有掉落（g12 DROPS／gp，受 2% 物品事件限制）
  const rows=[];
  for(const t of all){const L=[];try{for(const d of (DROPS[t]||[]))L.push(`${dgiN(d[0])}×${d[2]} ${dgiPct(d[1])}`);}catch(e){}
    if(DGI_GEAR_P[t])L.push(`裝備 ${dgiPct(DGI_GEAR_P[t])}`);
    if(L.length)rows.push(`<li><b>${t===boss?(G.bossN||dgiEnemyN(t))+'（首領）':dgiEnemyN(t)}</b>：${L.join('、')}</li>`);}
  let eg=false;try{eg=typeof window.econRollEnemyGear==='function'||!!(window.XW&&XW.econ&&XW.econ.econRollEnemyGear);}catch(e){}
  if(eg)rows.push(`<li><b>所有敵人</b>：地上掉落裝備 1～2 件（款式、品質隨機，依敵人境界）</li>`);
  if(rows.length)sec.push(`<div class="dgi-h">✦ 稀有掉落</div><div class="dgi-s">每隻敵人只有 ${dgiPct(DGI_ITEM_EVENT)} 機率觸發物品掉落，觸發後再依下列機率</div><ul>${rows.join('')}</ul>`);
  // 至寶（map 旗標開啟時；map_enemies mapZbDropOnKill）
  try{if(!TL&&typeof mapFlag==='function'&&mapFlag('zhibao')&&typeof MAP_TUNE!=='undefined'&&MAP_TUNE.zb){const mr=MAP_TUNE.zb.minRealm||7;const rr=Math.max(mr,(G.minRealm|0));
    const p=typeof mapZbRollRate==='function'?mapZbRollRate(0,false,rr):MAP_TUNE.zb.dungeonBase;
    sec.push(`<div class="dgi-h">💠 至寶</div><ul><li>你或敵人達「${(REALMS[mr]&&REALMS[mr].n)||'元嬰'}」以上時，觸發物品掉落後約 ${dgiPct(p)}</li></ul>`);}}catch(e){}
  if(kind==='xf')sec.push('<div class="dgi-s" style="color:#ff9a7a">仙凡之門未通關就離開：本次戰利品全部不保留。</div>');
  else sec.push('<div class="dgi-s">中途撤離可保住已得戰利品；你倒下則戰利品全失。</div>');
  const open=opt.row?false:DGI.open;DGI.src=TL?'mapDgLootList':'code';
  return `<div class="dgi${open?' open':''}${opt.row?' dgi-row':''}" data-dgk="${kind}"><button type="button" class="btn dgi-t" data-dgi="${opt.row?'row':'1'}">${open?'▲ 收起':'▼ 可獲得物品'}</button><div class="dgi-b">${sec.join('')}</div></div>`;}
function dgiIntroHtml(kind){const G=DGS[kind];if(!G)return '';let t='';
  try{t=`固定難度：${REALMS[dgTier(kind,false)].n}級（困難：${REALMS[Math.min(7,dgTier(kind,true))].n}級）`;}catch(e){}
  return `<div class="dgi-intro">${G.desc?`<div>${G.desc}</div>`:''}${t?`<div class="dgi-s">${t}</div>`:''}</div>`;}
// 切換：主清單的開合狀態記在 localStorage；世間秘葬清單逐列獨立
document.addEventListener('click',ev=>{const b=ev.target&&ev.target.closest&&ev.target.closest('[data-dgi]');if(!b)return;ev.stopPropagation();ev.preventDefault();DGI.tog++;
  const box=b.closest('.dgi');if(!box)return;
  if(b.dataset.dgi==='row'){const o=!box.classList.contains('open');box.classList.toggle('open',o);b.textContent=o?'▲ 收起':'▼ 可獲得物品';return;}
  DGI.open=!box.classList.contains('open');try{localStorage.setItem('xw_dgi_open',DGI.open?'1':'0');}catch(e){}
  document.querySelectorAll('.dgi:not(.dgi-row)').forEach(x=>{x.classList.toggle('open',DGI.open);const t=x.querySelector('.dgi-t');if(t)t.textContent=DGI.open?'▲ 收起':'▼ 可獲得物品';});},true);
['pointerdown','mousedown','touchstart'].forEach(t=>document.addEventListener(t,ev=>{if(ev.target&&ev.target.closest&&ev.target.closest('[data-dgi]'))ev.stopPropagation();},true));
// 1) 入口資訊卡：加上掉落清單，並讓 #panel 置中
{const _x=dgatePanel;dgatePanel=function(o){let h=_x.apply(this,arguments);try{if(o&&o.kind)h=h+dgiLootHtml(o.kind);}catch(e){console.warn('dgi',e);}return h;};}
function dgiPanelIsGate(){try{if(selBuilding!=null||selUnits.length||!selOther||selOther.k!=='s')return false;const el=document.getElementById('panel');if(!el||!el.querySelector('.dgi'))return false;const o=selOtherObj();return !!(o&&o.type==='dgate');}catch(e){return false;}}
{const _r=renderPanel;renderPanel=function(){const r=_r.apply(this,arguments);try{const on=dgiPanelIsGate()&&!S.dg;const B=document.body;if(B.classList.contains('dgintro')!==on)B.classList.toggle('dgintro',on);}catch(e){}return r;};}
// 2) 走到入口的確認框（dgin）與聯機加入框（xdgjoin）：置中＋介紹＋掉落清單
{const _a=x47DgEnterAsk;x47DgEnterAsk=function(kind){DGI.kind=kind;try{return _a.apply(this,arguments);}finally{DGI.kind=null;}};}
{const _d=x47Dlg;x47Dlg=function(o){const el=_d.apply(this,arguments);try{const id=o&&o.id;let kind=null;
    if(id==='dgin')kind=DGI.kind;else if(id==='xdgjoin'){try{const R=xdgRun();kind=R&&R.kind;}catch(e){}}
    el.classList.toggle('dgi-c',!!kind||id==='dgexit');
    if(kind&&DGS[kind]){const row=el.querySelector('.row');const html=dgiIntroHtml(kind)+dgiLootHtml(kind);if(row)row.insertAdjacentHTML('beforebegin',html);else el.insertAdjacentHTML('beforeend',html);DGI.inj++;}
    document.body.classList.toggle('dgidlg',!!kind);}catch(e){console.warn('dgi',e);}return el;};}
{const _c=x47DlgClose;x47DlgClose=function(id){const r=_c.apply(this,arguments);try{const el=document.getElementById('x47dlg');if(!el||el.style.display==='none'){document.body.classList.remove('dgidlg');if(el)el.classList.remove('dgi-c');}}catch(e){}return r;};}
// 3) 🌐 世間秘葬清單：置中（CSS）＋每列可收合掉落
function dgiDecorList(){const p=document.getElementById('xmapgatep');if(!p||p.style.display==='none')return;
  p.querySelectorAll('.xgrow').forEach(r=>{if(r.nextElementSibling&&r.nextElementSibling.classList&&r.nextElementSibling.classList.contains('dgi-row'))return;
    const b=r.querySelector('[data-k]');const k=b&&b.getAttribute('data-k');if(!k||typeof DGS==='undefined')return;
    try{if(!DGS[k]&&typeof mapDgsRegister==='function')mapDgsRegister();}catch(e){}if(!DGS[k])return;
    r.insertAdjacentHTML('afterend',dgiLootHtml(k,{row:1}));DGI.dec++;});}
setInterval(()=>{try{dgiDecorList();}catch(e){}},300);
{const st=document.createElement('style');st.id='dgicss';st.textContent=`
body.dgintro #panel,body.touch.dgintro #panel,body.pc.dgintro #panel{left:50%!important;top:50%!important;right:auto!important;bottom:auto!important;transform:translate(-50%,-50%)!important;width:min(460px,calc(100vw - 16px))!important;max-width:calc(100vw - 16px)!important;max-height:min(82vh,calc(100vh - 24px))!important;overflow-y:auto!important;margin:0!important;z-index:70;font-size:13px;line-height:1.55}
body.dgintro.dgidlg #panel{display:none!important}
#x47dlg.dgi-c{top:50%!important;max-height:calc(100vh - 24px);overflow-y:auto;width:min(460px,calc(100vw - 24px));box-sizing:border-box}
#xmapgatep{left:50%!important;top:50%!important;right:auto!important;bottom:auto!important;transform:translate(-50%,-50%)!important;width:min(420px,calc(100vw - 24px))!important;max-height:min(80vh,calc(100vh - 24px))!important}
.dgi{margin:8px 0 2px;border-top:1px dashed #8a6a3a88;padding-top:6px}
.dgi .dgi-t{min-height:30px;padding:2px 10px;font-size:12.5px}
.dgi .dgi-b{display:none;margin-top:6px;background:#0e0a07aa;border:1px solid #6a5030;border-radius:6px;padding:6px 10px;font-size:12px;line-height:1.5;color:#f0e0c0;text-align:left}
.dgi.open .dgi-b{display:block}
.dgi ul{margin:2px 0 6px;padding-left:18px}.dgi li{margin:1px 0}
.dgi .dgi-h{color:#ffd98a;font-weight:bold;margin-top:4px}.dgi .dgi-s{opacity:.75;font-size:11.5px}.dgi .dgi-q{color:#9fe8b0}.dgi .dgi-ty{display:inline-block;font-size:10.5px;padding:0 4px;border:1px solid #8a6a3a;border-radius:3px;color:#ffe9a8;margin-right:2px}.dgi .dgi-h1{font-size:13px;color:#ffe27a}
.dgi-intro{margin:6px 0;font-size:13px}.dgi-intro .dgi-s{opacity:.75;font-size:12px}
.dgi.dgi-row{margin:-2px 0 6px;border-top:none;padding-top:0}.dgi.dgi-row .dgi-t{min-height:24px;font-size:11.5px;padding:0 8px}
body.touch .dgi .dgi-t{min-height:38px}
`;(document.head||document.documentElement).appendChild(st);}
setTimeout(function dgiReg(){if(!window.XW){setTimeout(dgiReg,300);return;}XW.dgi={st:()=>Object.assign({},DGI),loot:dgiLootHtml,intro:dgiIntroHtml,tier:dgiTierList};},0);

// ================== 副本弟子自由行事（t1627u，可關） ==================
// 進副本不再強制跟隨。弟子預設在玩家附近自主戰鬥（同房、有限索敵），
// 不衝去全圖或遠處怪群，也不自動長距衝鋒。玩家下令（移動／攻擊／跟隨／待命）
// 期間以命令為準，直到命令完成或玩家改令。TUNE.dgAi.on=false 或網址 ?dgai=0 可關。
TUNE.dgAi=TUNE.dgAi||{on:true,alert:3.0,playerLeash:6.0,chase:5.0,sameRoom:true,autoCharge:2.4,recall:8.0};
function dgAiOn(){
  try{if(typeof location!=='undefined'&&/[?&]dgai=0(?:&|$)/.test(location.search||''))return false;}catch(e){}
  try{if(TUNE.dgAi&&TUNE.dgAi.on===false)return false;}catch(e){}
  return true;
}
function dgAiCfg(){return (typeof TUNE!=='undefined'&&TUNE.dgAi)||{};}
function dgAiDisc(u){
  if(!u||u.kind!=='disciple'||u.dead||u.np)return false;
  try{if(typeof xnIsPC==='function'&&xnIsPC(u))return false;}catch(e){}
  try{if(window.Cult&&typeof Cult.isPlayerChar==='function'&&Cult.isPlayerChar(u))return false;}catch(e){}
  return true;
}
function dgAiIn(){try{return !!(typeof S!=='undefined'&&S&&S.dg&&dgAiOn());}catch(e){return false;}}
function dgAiHasCmd(u){
  if(!u||u.dead)return false;
  try{if(typeof xPlayerOrder==='function'&&xPlayerOrder(u))return true;}catch(e){}
  try{if(u.xcmd&&typeof S!=='undefined'&&S.time<u.xcmd.until)return true;}catch(e){}
  try{if(typeof xmvOn==='function'&&xmvOn(u))return true;}catch(e){}
  try{if(u.task&&u.task.man)return true;}catch(e){}
  if(u.job==='follow'||u.job==='guard')return true;
  return false;
}
function dgAiHold(u){return !!(u&&!u.job&&u.holdAt&&Number.isFinite(u.holdAt.x)&&Number.isFinite(u.holdAt.y));}
function dgAiSameRoom(u,e){
  const C=dgAiCfg();
  if(C.sameRoom===false)return true;
  if(!u||!e||typeof dgRoomOf!=='function')return true;
  let ru=null,re=null;
  try{ru=dgRoomOf(u.x,u.y);re=dgRoomOf(e.x,e.y);}catch(ex){return true;}
  if(ru&&re)return ru===re;
  const lim=(C.alert!=null?C.alert:3.0)+0.4;
  try{return dist(u.x,u.y,e.x,e.y)<=lim;}catch(ex){return true;}
}
function dgAiMelee(u,e){
  if(!u||!e)return false;
  try{return dist(u.x,u.y,e.x,e.y)<=((u.r||0.3)+(e.r||0.3)+0.55);}catch(ex){return false;}
}
function dgAiCanAuto(u,e){
  if(!u||!e||e.dead||!(e.hp>0))return false;
  if(dgAiMelee(u,e))return true;
  if(!dgAiSameRoom(u,e))return false;
  const C=dgAiCfg();
  let p=null;try{p=typeof player==='function'?player():null;}catch(ex){}
  const leash=C.playerLeash!=null?C.playerLeash:6.0,chase=C.chase!=null?C.chase:5.0,alert=C.alert!=null?C.alert:3.0;
  try{
    if(p&&!p.dead){
      if(dist(p.x,p.y,e.x,e.y)>leash+0.4)return false;
      if(dist(p.x,p.y,u.x,u.y)>chase+0.6&&!dgAiMelee(u,e))return false;
    }
    if(dist(u.x,u.y,e.x,e.y)>alert+2.2)return false;
  }catch(ex){}
  return true;
}
function dgAiCanPick(u,e){
  if(!dgAiCanAuto(u,e))return false;
  if(dgAiMelee(u,e))return true;
  const C=dgAiCfg(),alert=C.alert!=null?C.alert:3.0,leash=C.playerLeash!=null?C.playerLeash:6.0;
  try{
    if(dist(u.x,u.y,e.x,e.y)>alert)return false;
    const p=typeof player==='function'?player():null;
    if(p&&!p.dead&&dist(p.x,p.y,e.x,e.y)>leash)return false;
    if(dgAiHold(u)&&u.holdAt&&dist(u.holdAt.x,u.holdAt.y,e.x,e.y)>Math.min(1.6,alert))return false;
  }catch(ex){}
  return true;
}
function dgAiClearDone(u){
  if(!u||!u.xcmd||typeof S==='undefined'||!S)return;
  const cmd=u.xcmd,t=u.task;
  if(S.time<cmd.until){
    if(cmd.kind==='move'&&(!t||t.type!=='move')){u.xcmd=null;return;}
    if((cmd.kind==='atk'||cmd.kind==='attack')&&(!t||t.type!=='attack')){u.xcmd=null;return;}
    return;
  }
  // 逾時但命令尚未完成：副本內延長到完成，避免走一半被 AI 蓋掉
  if(t&&((cmd.kind==='move'&&t.type==='move')||((cmd.kind==='atk'||cmd.kind==='attack')&&t.type==='attack'))){
    u.xcmd.until=S.time+4;return;
  }
  u.xcmd=null;
}
function dgAiDropAuto(u){
  if(!u||!u.task||u.task.type!=='attack'||u.task.man)return;
  let e=null;try{e=typeof enemyById==='function'?enemyById(u.task.eid):null;}catch(ex){}
  if(e&&dgAiCanAuto(u,e))return;
  const prev=u.prevTask;
  u.task=prev&&prev.type!=='attack'&&prev.type!=='move'&&!prev.dgRecall?prev:null;
  u.prevTask=null;u.path=[];u.dvx=0;u.dvy=0;
}
function dgAiRecall(u,dt){
  if(!u||u.task||u.job||u.dash||dgAiHasCmd(u)||dgAiHold(u))return;
  let p=null;try{p=typeof player==='function'?player():null;}catch(e){}
  if(!p||p.dead)return;
  const C=dgAiCfg(),rec=C.recall!=null?C.recall:8.0,near=2.6;
  let d=0;try{d=dist(u.x,u.y,p.x,p.y);}catch(e){return;}
  if(d<=rec)return;
  const ang=Math.atan2(u.y-p.y,u.x-p.x),tx=p.x+Math.cos(ang)*near,ty=p.y+Math.sin(ang)*near;
  try{if(typeof chase==='function')chase(u,dt||0.05,tx,ty,near);}catch(e){}
}

(function(){
  let ctx=null;
  function inCtx(u){return !!(dgAiIn()&&u&&dgAiDisc(u));}

  if(typeof dgEnter==='function'&&!dgEnter._dgAi){
    const _de=dgEnter;
    dgEnter=function(){
      const r=_de.apply(this,arguments);
      try{
        if(r&&dgAiIn()){
          let p=null;try{p=typeof player==='function'?player():null;}catch(e){}
          for(const u of (S.units||[])){
            if(!dgAiDisc(u)||u===p)continue;
            // 解除進本強制跟隨，改為自由行事；原地待命座標不能帶到副本地圖
            u.job=null;u.jobB=null;u.aiJob=null;u.holdAt=null;
            if(u.task&&!u.task.man){u.task=null;u.path=[];}
            u.dash=null;u.dvx=0;u.dvy=0;
          }
        }
      }catch(e){console.warn('dgAi enter',e);}
      return r;
    };
    dgEnter._dgAi=1;
  }

  if(typeof nearestEnemy==='function'&&!nearestEnemy._dgAi){
    const _ne=nearestEnemy;
    nearestEnemy=function(x,y,r){
      const first=_ne.apply(this,arguments);
      const u=ctx;
      if(!inCtx(u))return first;
      // 玩家移動／待命中不自動索敵（跟隨仍可打附近）；手動攻擊維持原目標，不在此改
      if(dgAiHasCmd(u)&&u.job!=='follow'&&u.job!=='guard')return null;
      if(first&&dgAiCanPick(u,first))return first;
      let best=null,bd=r;
      try{
        for(const e of (S.enemies||[])){
          if(!dgAiCanPick(u,e))continue;
          const d=dist(x,y,e.x,e.y);if(d<bd){bd=d;best=e;}
        }
      }catch(ex){}
      return best;
    };
    nearestEnemy._dgAi=1;
  }

  if(typeof updateDisciple==='function'&&!updateDisciple._dgAi){
    const _ud=updateDisciple;
    updateDisciple=function(u,dt){
      const prev=ctx;ctx=u;
      try{
        if(inCtx(u)){
          dgAiClearDone(u);
          if(u.task&&u.task.dgRecall&&!u.task.man)u.task=null;
          if(!(dgAiHasCmd(u)&&u.job!=='follow'&&u.job!=='guard'&&!(u.task&&u.task.man)))dgAiDropAuto(u);
        }
        const r=_ud.apply(this,arguments);
        try{if(inCtx(u)){dgAiClearDone(u);if(!dgAiHasCmd(u)){dgAiDropAuto(u);dgAiRecall(u,dt);}}}catch(e){}
        return r;
      }finally{ctx=prev;}
    };
    updateDisciple._dgAi=1;
  }

  if(typeof runTask==='function'&&!runTask._dgAi){
    const _rt=runTask;
    runTask=function(u,dt,tsk){
      if(inCtx(u)&&tsk&&tsk.type==='attack'&&!tsk.man){
        let e=null;try{e=typeof enemyById==='function'?enemyById(tsk.eid):null;}catch(ex){}
        if(!e||!dgAiCanAuto(u,e)){dgAiDropAuto(u);return;}
      }
      return _rt.apply(this,arguments);
    };
    runTask._dgAi=1;
  }

  if(typeof fightStep==='function'&&!fightStep._dgAi){
    const _fs=fightStep;
    fightStep=function(u,dt,e){
      if(inCtx(u)&&e&&!(u.task&&u.task.man)){
        if(!dgAiCanAuto(u,e)){try{u.dvx=u.dvy=0;u.path=[];}catch(ex){}return;}
        try{
          const p=typeof player==='function'?player():null,C=dgAiCfg(),chase=C.chase!=null?C.chase:5.0;
          if(p&&!p.dead&&dist(p.x,p.y,u.x,u.y)>chase&&!dgAiMelee(u,e)){u.dvx=u.dvy=0;u.path=[];return;}
        }catch(ex){}
      }
      return _fs.apply(this,arguments);
    };
    fightStep._dgAi=1;
  }

  if(typeof tryAbilities==='function'&&!tryAbilities._dgAi){
    const _ta=tryAbilities;
    tryAbilities=function(u,e,manual){
      const man=!!(manual||(u&&u.task&&u.task.man));
      if(inCtx(u)&&!man&&e){
        const C=dgAiCfg();
        const max=C.autoCharge;
        let d=0;try{d=dist(u.x,u.y,e.x,e.y);}catch(ex){}
        const block=max===0||max==null||!(d<=max)||!dgAiSameRoom(u,e);
        if(block){
          const acd=u.acd||(u.acd={});
          const old=acd.charge;
          acd.charge=Math.max(old||0,0.05);
          try{return _ta.apply(this,arguments);}
          finally{acd.charge=old||0;}
        }
      }
      return _ta.apply(this,arguments);
    };
    tryAbilities._dgAi=1;
  }

  function wrapCult(){
    const A=window.CultAI;if(!A||A._dgAi)return !!A&&!!A._dgAi;
    const _cand=A.aggroCandidate,_keep=A.aggroKeep,_pick=A.aggroPick;
    if(typeof _cand==='function')A.aggroCandidate=function(u,e){
      if(!_cand.apply(this,arguments))return false;
      if(dgAiIn()&&dgAiDisc(u)&&!(u.task&&u.task.man))return dgAiCanPick(u,e);
      return true;
    };
    if(typeof _keep==='function')A.aggroKeep=function(u,e){
      if(!_keep.apply(this,arguments))return false;
      if(dgAiIn()&&dgAiDisc(u)&&!(u.task&&u.task.man))return dgAiCanAuto(u,e);
      return true;
    };
    if(typeof _pick==='function')A.aggroPick=function(u){
      if(!(dgAiIn()&&dgAiDisc(u)))return _pick.apply(this,arguments);
      if(dgAiHasCmd(u)&&u.job!=='follow'&&u.job!=='guard')return null;
      const e=_pick.apply(this,arguments);
      if(e&&dgAiCanPick(u,e))return e;
      return null;
    };
    A._dgAi=1;return true;
  }
  if(!wrapCult())setTimeout(function retry(){if(!wrapCult())setTimeout(retry,300);},0);

  function bind(){
    try{
      if(!window.XW)return false;
      XW.dgAi={
        on:dgAiOn,in:dgAiIn,cfg:dgAiCfg,disc:dgAiDisc,hasCmd:dgAiHasCmd,hold:dgAiHold,
        sameRoom:dgAiSameRoom,melee:dgAiMelee,canAuto:dgAiCanAuto,canPick:dgAiCanPick,
        clearDone:dgAiClearDone,dropAuto:dgAiDropAuto,recall:dgAiRecall
      };
      return true;
    }catch(e){return false;}
  }
  if(!bind())setTimeout(function r(){if(!bind())setTimeout(r,200);},0);
})();
