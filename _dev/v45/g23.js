
// ==================== v0.4.9 數值中樞接線（XN → 遊戲）====================
// 規則全在 gN.js 的表；這裡只把表接到現有系統。多人倍率只讀 NET 狀態，不改 net*.js。
TUNE.xn={on:true,supp:true,fear:true,hit:true,coop:true,enemyRel:true,showSupp:true};
// 境界壓制（緊急搶修）：同大境界不改傷害；跨大境界每差 1 境傷害 ±5%。同境小階段：高者命中/閃避各 +3%/階（加總上限 15%），抗控同比例。
TUNE.xn.suppGap={sameSubHit:0.03,sameSubDodge:0.03,sameSubCtrl:0.03,sameSubCap:0.15,majorDmg:0.05,floor:0.05};
const XNS={fearT:0,suppT:new WeakMap(),log:[]};
// ---- 境界數值：每升一大境界的跳級倍率（含小階段後整境界＝XN.STAT）
function xnSb(r){return v52Lay(r)?TUNE.v52.layerBonus:(TUNE.subBonus||0.04);}
function xnStep(r,k){return XN.statStep(k,v52N(r),xnSb(r));}
function xnStepM(r,k){return TUNE.xn&&TUNE.xn.on?xnStep(r,k):1.1;}   // 緊急搶修：鄰境 ≤+10%（舊版 1.3／宗師→煉氣 1.5）
function xnFullM(r,k){return TUNE.xn&&TUNE.xn.on?xnStep(r,k)*Math.pow(1+xnSb(r),v52N(r)-1):1.1;}   // 直接設定境界：整境合計 ≤+10%
function xnRM(rl,k){if(!(TUNE.xn&&TUNE.xn.on))return Math.pow(1.1,rl);return xnPow(rl,k);}
function xnPow(rl,k){let m=1;for(let r=0;r<rl;r++)m*=xnStep(r,k)*Math.pow(1+xnSb(r),v52N(r)-1);return m;}  // 敵人用：整境界倍率連乘
// 修為需求：Gemini need × K × needMul × 小階段權重（15/25/30/30；十層者見 XN.subW）
needAt=function(r,s){const n=v52N(r),nm=TUNE.needMul||1;return Math.max(1,Math.round(XN.need(r)*XN.NEED.K*nm*XN.subW(n,Math.min(s||0,n-1))));};
// 突破失敗率：無丹基礎＝1−succ（再套用原有悟性、氣運、丹藥、建築、靈根等修正）
TUNE.breakFail=XN.REALMS.filter(R=>R.w===1).map(R=>+(1-R.succ).toFixed(2));
TUNE.xnLqShift=+((1-XN.rowIdx(3).succ)-0.55).toFixed(2);    // 宗師→煉氣沿用 lianqiFail 公式，基準由 0.55 平移到 Gemini 0.65
{const _lf=lianqiFail;lianqiFail=function(u){return clamp(_lf(u)+(TUNE.xn.on?TUNE.xnLqShift:0),0.05,0.92);};}
// 突破失敗懲罰：把表的 loss／傷勢／掉階寫進既有的 V47R（g18 v47Fail 執行）
const XN_INJK=[null,'light','heavy','meridian','meridian'];   // 4＝道基碎裂：沿用最重的「經脈受損」
function xnSyncV47R(){for(const R of XN.REALMS){if(R.w!==1||R.template)continue;const V=V47R[R.idx];if(!V)continue;
  if(R.loss)V.loss=R.loss;V.inj=XN_INJK[R.inj||0]||null;V.drop=R.drop?1:0;V.xn=R.id;if(R.note&&!V.note)V.note=R.n+'：'+R.note;}}
xnSyncV47R();
{const _tb=tryBreak;tryBreak=function(u,auto){const r0=u&&u.realm,ok=_tb.apply(this,arguments);if(ok&&u&&u.realm>r0)XNS.log.push({t:S.time,id:u.id,r:u.realm});return ok;};}
// ---- 戰鬥：同界境界壓制、命中、跨界歸零
function xnIsEnemy(o){return !!(o&&o.type&&ENEMY[o.type]&&!o.kind);}
// 敵人：境界＝真實境界 e.realm（＋e.sub）。頭目／妖王的強是「同境 × 屬性倍率」（Gemini 0.8x／2.0x／3.0x），不算越階
function xnLv(o){if(!o)return 0;const r=o.realm||0;return r+(o.sub||0)/v52N(r);}
function xnWorld(o){return (o&&o.world)||1;}
const XN_HIGH=XN.SKILLS.filter(s=>s.supp).flatMap(s=>s.ab.map(a=>[a,s.supp]));
function xnDiff(src,dst){let d=xnLv(src)-xnLv(dst);if(src&&src.acd)for(const [a,b] of XN_HIGH)if(ABIL[a]&&src.acd[a]===ABIL[a].cd)d+=b;return d;}
function xnSuppGap(){return TUNE.xn.suppGap||{sameSubHit:0.03,sameSubDodge:0.03,sameSubCtrl:0.03,sameSubCap:0.15,majorDmg:0.05,floor:0.05};}
function xnSameSubSteps(src,dst){if(!src||!dst)return 0;if((src.realm|0)!==(dst.realm|0))return 0;return ((src.sub||0)|(0))-((dst.sub||0)|(0));}
function xnSameSubFavor(steps){const T=xnSuppGap();return Math.min(T.sameSubCap,Math.abs(steps|0)*T.sameSubHit);}
function xnMajorDmgMul(src,dst){const T=xnSuppGap(),dr=(src.realm|0)-(dst.realm|0);if(!dr)return 1;return Math.max(T.floor,1+dr*T.majorDmg);}
function xnCtrlRes(src,dst){const T=xnSuppGap();if(!src||!dst||(src.realm|0)!==(dst.realm|0))return 0;const ds=(dst.sub||0)-(src.sub||0);return ds>0?Math.min(T.sameSubCap,ds*T.sameSubCtrl):0;}
function xnStun(dst,dur,src){if(!dst||!(dur>0))return;const r=xnCtrlRes(src,dst);if(r)dur*=(1-r);dst.stun=Math.max(dst.stun||0,dur);}
function xnSuppFx(dst,d){if(!TUNE.xn.showSupp||Math.abs(d)<0.5)return;const t=XNS.suppT.get(dst)||-99;if(S.time-t<1.6)return;XNS.suppT.set(dst,S.time);
  floater(dst.x,dst.y-0.55,d>0?'境界壓制':'越階・難破防',d>0?'#ffb347':'#9fb4c8');}
// 回傳 null＝未命中；否則回傳乘過壓制的傷害
// 規則：同大境界＝不改傷害，小階段差改命中（此處給低者 miss）；跨大境界＝每境 ±majorDmg，不疊小階段。舊 XN.dmgMul/XN.hit 不再用於一般壓制。
function xnApply(src,dst,amt){
  if(!TUNE.xn.on||!TUNE.xn.supp||!src||!dst||!(amt>0)||src.v49lq||dst.v49lq)return amt;   // 仙凡之門守衛已有自己的仙凡壓制（TUNE.v49.lqDef），不重複套用
  if(xnWorld(dst)>xnWorld(src)){floater(dst.x,dst.y,'無法破防','#a0a0a0');return null;}
  const dr=(src.realm|0)-(dst.realm|0),steps=xnSameSubSteps(src,dst);
  if(!dr){
    // 同大境界：傷害不變。低打高 → 額外未命中＝favor（高者命中優勢的反向）；高打低的命中優勢在 xevaTry 扣閃避。
    if(TUNE.xn.hit&&steps<0){const miss=xnSameSubFavor(steps);if(miss>0&&rnd()<miss){const t=XNS.suppT.get(dst)||-99;if(S.time-t>0.8){XNS.suppT.set(dst,S.time);floater(dst.x,dst.y,'未破防','#9fb4c8');}return null;}}
    return amt;
  }
  const mul=xnMajorDmgMul(src,dst);xnSuppFx(dst,dr);return amt*mul;}
{const _de=dmgEnemy;dmgEnemy=function(src,e,amt,col){if(e&&!e.dead&&src&&src!==e){const a=xnApply(src,e,amt);if(a===null)return;amt=a;}return _de.call(this,src,e,amt,col);};}
{const _du=dmgUnit;dmgUnit=function(src,u,amt){if(u&&!u.dead&&src&&src!==u){const a=xnApply(src,u,amt);if(a===null)return;amt=a;}return _du.call(this,src,u,amt);};}
setTimeout(function xsgReg(){if(!window.XW||!XW.xn){setTimeout(xsgReg,200);return;}XW.xn.suppGap=()=>Object.assign({},TUNE.xn.suppGap);XW.xn.apply=(s,d,a)=>xnApply(s,d,a);XW.xn.majorMul=(s,d)=>xnMajorDmgMul(s,d);XW.xn.sameSteps=(s,d)=>xnSameSubSteps(s,d);XW.xn.sameFav=(s,d)=>xnSameSubFavor(xnSameSubSteps(s,d));XW.xn.ctrlRes=(s,d)=>xnCtrlRes(s,d);XW.xn.stun=xnStun;},0);
// ---- 威壓恐懼：境界差 < −1 時低者移速／攻速下降 30%×|差|（上限 50%；僅敵對且交戰中；含聯機化身 np）
function xnFearHostile(e){
  if(!e||e.dead)return false;
  if(e.raid)return true;
  if(e.type==='militia'){
    try{const v=typeof vById==='function'?vById(e.camp):null;return !!(v&&typeof vStatus==='function'&&vStatus(v)==='hostile');}catch(er){return false;}
  }
  return true; // 山賊／妖獸等預設敵對
}
function xnFearEngaged(e,u){
  if(!e||e.dead||!xnFearHostile(e))return false;
  if(e.raid)return true;
  if(e.target){
    if(e.target.k==='u'){
      if(u&&e.target.id===u.id)return true;
      // 正在交戰（鎖定任一單位／建築）→ 對附近低境界單位施壓
      return true;
    }
    if(e.target.k==='b')return true;
  }
  if(u&&u.task&&u.task.type==='attack'&&u.task.eid===e.id)return true;
  try{
    if(u&&u.lastHit!=null&&e.lastHit!=null&&S.time-u.lastHit<3&&S.time-e.lastHit<3)return true;
  }catch(er){}
  return false;
}
function xnFearTick(){
  const R=XN.SUPP.fearR;
  // 含弟子／主角／聯機化身（u.np）；副本外 S.units 一致計算
  const U=S.units.filter(u=>u&&!u.dead&&!u.inside);
  const E=S.enemies.filter(e=>e&&!e.dead);
  for(const o of U)o.xnFear=0;for(const e of E)e.xnFear=0;
  if(!TUNE.xn.fear)return;
  const lu=U.map(xnLv),le=E.map(xnLv);
  let any=false;
  for(let i=0;i<U.length;i++)for(let j=0;j<E.length;j++){
    const u=U[i],e=E[j];
    if(Math.abs(u.x-e.x)>R||Math.abs(u.y-e.y)>R)continue;
    if(!xnFearEngaged(e,u))continue;
    const d=lu[i]-le[j];
    if(d<XN.SUPP.fearFrom){u.xnFear=Math.max(u.xnFear,XN.fear(d));any=any||u.xnFear>0;}
    else if(-d<XN.SUPP.fearFrom){e.xnFear=Math.max(e.xnFear,XN.fear(-d));}
  }
  // 一次性提示
  try{
    if(any&&U.some(u=>u.xnFear>0)){
      if(!(S.flags&&S.flags.xnFearTold)){
        S.flags=S.flags||{};S.flags.xnFearTold=1;
        if(typeof toast==='function')toast('境界威壓：接近正在交戰的高境界敵人時，移速／攻速會下降（最多五成）');
      }
    }
  }catch(er){}
}
{const _fp=followPath;followPath=function(o,dt,spMul){if(o&&o.xnFear>0)spMul=(spMul||1)*(1-o.xnFear);return _fp.call(this,o,dt,spMul);};}
{const _u=update;update=function(dt){const r=_u.apply(this,arguments);try{if(TUNE.xn.on&&!S.paused){XNS.fearT-=dt;if(XNS.fearT<=0){XNS.fearT=0.3;xnFearTick();}
    for(const o of S.units)if(o.xnFear>0&&o.cd>0)o.cd+=dt*o.xnFear;for(const e of S.enemies)if(e.xnFear>0&&e.cd>0)e.cd+=dt*e.xnFear;}}catch(er){}return r;};}
// 頭頂標籤「境界威壓」
{const _dh=typeof drawHuman==='function'?drawHuman:null;
  if(_dh&&!_dh._xnFearLbl){drawHuman=function(u){const r=_dh.apply(this,arguments);try{
    if(u&&u.xnFear>0&&typeof P==='function'&&typeof label==='function'){
      const b=P(u.x,u.y);label('境界威壓',b.x,b.y-52,'#ffb07a','bold 9px sans-serif');
    }
  }catch(e){}return r;};drawHuman._xnFearLbl=1;}}
// ---- 敵人：屬性隨境界改用 XN 成長；據點／襲擊山賊依「玩家平均境界」分層（散兵 −1、頭目 ＝平均）；多人血量
function xnPlayers(){try{if(typeof NET==='undefined'||!NET||!NET.role||!NET.players)return 1;let n=0;for(const p of NET.players.values())if(p.online||p.host)n++;return Math.max(1,n);}catch(e){return 1;}}
function xnAvgRealm(){const P=S.units.filter(u=>u.kind==='player'&&!u.dead);if(!P.length)return 0;return Math.round(P.reduce((a,u)=>a+(u.realm||0),0)/P.length);}
{const _me=makeEnemy;makeEnemy=function(type,x,y,o){
  // 舊圖山寨/劫掠山賊上限煉氣(4)；新圖山賊金丹 cap 留在 mapEnemyDecorate，不改 map 資料
  const oldMapBandit=!S.dg&&(type==='bandit'||type==='chief')&&o&&o.camp!=null&&!o._mapBandit;
  if(TUNE.xn.on&&TUNE.xn.enemyRel&&oldMapBandit&&!o.name&&S.units&&S.units.length){
    const av=xnAvgRealm(),T=XN.ENEMY_TIERS,lo=Math.max(0,av+T[0].realm),hi=av+T[1].realm,rl=o.realm||0;
    let nr=type==='chief'?Math.max(rl-1,hi):clamp(rl,lo,hi);
    nr=Math.min(nr,4);
    o=Object.assign({},o,{realm:nr});
  }else if(oldMapBandit){
    o=Object.assign({},o,{realm:Math.min(o.realm||0,4)});
  }
  const e=_me.call(this,type,x,y,o);
  const n=TUNE.xn.coop?xnPlayers():1;if(n>1&&!S.dg&&!(typeof v49Client==='function'&&v49Client())){const k=XN.coopHp(n);e.maxhp=e.hp=Math.round(e.maxhp*k);e.xnCoK=k;}
  return e;};}
{const _vr=v51Realm;v51Realm=function(e){if(e&&e.xnCoK>1){const h=e.maxhp;e.maxhp=Math.round(h/e.xnCoK);try{return _vr.call(this,e);}finally{e.maxhp=h;}}return _vr.apply(this,arguments);};}
// ---- 建築：升級造價 1.5^(Lv-1)；多人造價 1+(N-1)*0.5
TUNE.lvCost=[2,3,4,5].map(lv=>+XN.upMul(lv).toFixed(3));
{const _uc=upCost;upCost=function(b,lv){const c=_uc.apply(this,arguments),n=TUNE.xn.coop?xnPlayers():1;if(n>1){const k=XN.coopCost(n);for(const q in c)c[q]=Math.ceil(c[q]*k);}return c;};}
for(const k in BUILD){const B=BUILD[k];if(!B||!B.cost||B._xnBase||k==='hall')continue;/* 偏離：宗門大殿為開局必建，連線時不加價，避免開局卡關 */const base=B.cost;Object.defineProperty(B,'_xnBase',{value:base,enumerable:false});
  Object.defineProperty(B,'cost',{configurable:true,enumerable:true,get(){const n=TUNE.xn.coop?xnPlayers():1;if(n<=1)return base;const m=XN.coopCost(n),o={};for(const q in base)o[q]=Math.ceil(base[q]*m);return o;},set(v){/* 保留基礎值 */}});}
// ---- 交易：靈石收購價由物價表計算（價值 × 商人抽成）
for(const T of TRADES){if(T.get&&T.get.lingshi){let v=0;for(const q in T.give)v+=T.give[q]*XN.price(q);T.get.lingshi=Math.max(1,Math.round(v*XN.TRADE.spread));T.xnVal=+v.toFixed(1);}}
// ---- 境界總表（說明 → 境界）
function xnFmt(n){return n>=1e6?(n/1e6).toFixed(2)+'M':n>=1e4?(n/1e3).toFixed(1)+'k':String(n);}
function xnRealmTable(){const p=player(),pl=p?xnLv(p):0;let h='';
  for(const W of XN.WORLDS){const rows=XN.REALMS.filter(R=>R.w===W.id);
    h+=`<h4 style="margin:8px 0 4px">${W.key} ${W.n}<span class="dim">｜單位 ${W.unit}・貨幣 ${W.curN}・修煉倍率 1+R×${XN.CULT.perR}+${W.tier}×${XN.CULT.perTier}${W.template?'｜模板（尚未開放）':''}</span></h4>`;
    if(W.template){h+=`<div class="dim">${rows.map(R=>`${R.id} ${R.n}`).join('、')}　— 數值待填，加一列即可擴充</div>`;continue;}
    h+='<table class="xnrt"><tr><th>ID</th><th>境界</th><th>總修為</th><th>無丹成功</th><th>失敗</th><th>氣血/攻擊</th></tr>';
    for(const R of rows){const i=R.idx,tot=Array.from({length:v52N(i)},(_,s)=>needAt(i,s)).reduce((a,b)=>a+b,0),lock=i>MAX_REALM,cur=p&&p.realm===i;
      const pen=[R.loss?`−${Math.round(R.loss*100)}%修為`:'',R.inj?(R.inj===4?'道基碎裂':INJ[XN_INJK[R.inj]].n):'',R.drop?'掉境界':'',R.die?'身死道消':''].filter(Boolean).join('、')||'—';
      h+=`<tr${cur?' style="color:#ffe27a"':lock?' class="dim"':''}><td>${R.id}</td><td>${R.n}${cur?' ◀':''}</td><td>${xnFmt(tot)}</td><td>${Math.round(R.succ*100)}%</td><td>${pen}</td><td>×${xnFmt(Math.round(Math.pow(XN.STAT.hp,R.r)))} / ×${xnFmt(Math.round(Math.pow(XN.STAT.atk,R.r)*10)/10)}</td></tr>`;}
    h+='</table>';}
  const SG=xnSuppGap();const ex=[`同大境界：傷害不變；每差 1 小境界／層，高者命中 +${Math.round(SG.sameSubHit*100)}%、閃避 +${Math.round(SG.sameSubDodge*100)}%（加總上限 ${Math.round(SG.sameSubCap*100)}%）、抗控同比例`,`跨大境界：每差 1 大境界，傷害 ×(1±${Math.round(SG.majorDmg*100)}%)，不疊小階段`,`威壓恐懼（另計）：境界差 ≤ −1 時低者減速／攻速下降`].join('<br>');
  h+=`<p class="dim" style="margin-top:6px">境界壓制（緊急搶修）：同大境界不改傷害；跨大境界與同境小階段規則如下。跨界（守方世界較高）傷害一律為 0。高階神通（金丹威壓）額外 +0.5 境界差。<br>${ex}</p>`;
  return h;}
{const _gb=guideBody;guideBody=function(c){const h=_gb.apply(this,arguments);if(c!=='realm'||!TUNE.xn.on)return h;
  return String(h).replace('失敗會損失 3 成修為','失敗依境界損失 1～8 成修為並可能受傷')+'<h3 style="margin-top:10px">三界境界總表（v0.4.9 數值中樞）</h3>'+xnRealmTable();};}
setTimeout(()=>{try{if(window.XW){XW.dispVer=xwDispVer();XW.saveFmt=XW_VER;}if(window.XW)XW.xn={XN,lv:xnLv,diff:xnDiff,players:xnPlayers,avg:xnAvgRealm,log:XNS.log,needAt:(r,s)=>needAt(r,s),v51:e=>v51Realm(e),step:xnStepM,rm:xnRM,table:()=>xnRealmTable(),guide:c=>toggleGuide(true,c||'realm'),fail:u=>breakFail(u),V47R};}catch(e){}},0);
// ---- v0.4.9 手機環狀選單：每種目標只給合理的指令（資源點、敵人、村莊／寨子／入口不出現「守衛」）
{const _ro=radialOpts;radialOpts=function(x,y){const o=_ro.apply(this,arguments);if(!o)return o;
  try{const w=screenToWorld(x,y);if(unitAt(w,S.units,14))return o;
    const st=structAt(w);let bad=enemyAt(w)||nodeAt(w);if(!bad&&st){const v=st.vid!=null&&vById(st.vid);bad=st.type==='dgate'||(v&&v.type==='bandit');}if(bad){const f=o.filter(q=>q[0]!=='守衛');return f.length?f:null;}}catch(e){}
  return o;};}

// ======================= v0.4.9 手機版面修正（#183 延伸）＋ 角色卡不再重建 ＋ 電腦版「組隊」按鈕 =======================
const XU49={rect(id){const e=typeof id==='string'?document.getElementById(id):id;if(!e)return null;const c=getComputedStyle(e);if(c.display==='none'||c.visibility==='hidden')return null;const r=e.getBoundingClientRect();return r.width>1&&r.height>1?r:null;},
  hit(a,b,m){m=m||0;return !!(a&&b&&a.left<b.right+m&&a.right>b.left-m&&a.top<b.bottom+m&&a.bottom>b.top-m);},
  portrait(){return innerWidth<innerHeight;}};
{const st=document.createElement('style');st.id='xu49css';st.textContent=`
@media (orientation:portrait){body.touch #topbar .grp{flex-wrap:wrap;overflow:visible;-webkit-mask-image:none;mask-image:none;row-gap:3px;column-gap:4px}
 body.touch #topbar .grp .res{padding:1px 5px;font-size:calc(13px * var(--xwfs,1));gap:3px}
 body.touch #topbar .grp .ico{width:calc(13px * var(--xwfs,1));height:calc(13px * var(--xwfs,1))}}
body.touch #objectives .q205tx{-webkit-line-clamp:unset;line-clamp:unset;display:block;overflow:visible;text-overflow:clip;white-space:normal;overflow-wrap:anywhere}
body.touch #panel.x47slim h4{white-space:normal!important;overflow:visible!important;text-overflow:clip!important;overflow-wrap:anywhere;margin-right:84px!important}
body.touch #panel.x47slim .mini{white-space:normal!important;overflow:visible!important;text-overflow:clip!important;overflow-wrap:anywhere}
body.touch #panel:not(.x47slim){z-index:42!important}
#xwptb{display:none;align-items:center;white-space:nowrap;position:static}
#topbar #xwptb,#menuBar #xwptb{margin:0}
#xwptb .xwgrip{display:none}
#xwptw{position:fixed;z-index:40;display:none;width:220px;max-width:calc(100vw - 20px);box-sizing:border-box;background:rgba(10,20,30,.95);border:1px solid #4a6a8a;border-radius:8px;color:#dde;font-size:12.5px;line-height:1.5;padding:8px 10px;box-shadow:0 2px 10px #000a}
#xwptw h4{margin:0 22px 6px 0;font-size:13px;color:#cfe3ff;cursor:move;touch-action:none;user-select:none}
#xwptw .btn{margin:6px 0 0;padding:3px 10px}
.xptx{position:absolute;right:4px;top:3px;width:24px;height:24px;line-height:22px;text-align:center;border-radius:5px;cursor:pointer;color:#cfe3ff;background:#ffffff14;font-size:13px;z-index:2}
.xptx:hover{background:#ffffff33}body.touch .xptx{width:30px;height:30px;line-height:28px;right:2px;top:2px}
#netpt .pth{padding-right:30px}`;document.head.appendChild(st);}
// ---- 組隊視窗開關（記在本機；「重置版面」會清掉）----
const XPT={K:'xw_pt_open',get(){try{const v=localStorage.getItem(this.K);return v==null?null:v==='1';}catch(e){return null;}},set(v){try{localStorage.setItem(this.K,v?'1':'0');}catch(e){}xptSync();},
  coop(){return typeof NET!=='undefined'&&typeof netPtOn==='function'&&netPtOn()&&NET.players&&NET.players.size>=2;},
  open(){const v=this.get();return v==null?this.coop():v;}};
function xptStack(){const L=[];for(const id of ['objectives','hint','tutbub','dghud']){const r=XU49.rect(id);if(r&&r.left<260&&r.top<innerHeight*0.6)L.push(r);}return L;}
function xptPlace(el){
  if(!el||el.classList.contains('xwdragged'))return;
  if(el.id==='xwptb'&&el.parentNode&&(el.parentNode.id==='topbar'||el.parentNode.id==='menuBar'||el.closest('#topbar'))){el.style.left='';el.style.top='';return;}
  const r0=el.getBoundingClientRect(),w=r0.width||120,h=r0.height||36;
  const mm=XU49.rect('minimap'),tb=XU49.rect('topbar');
  let top,left;
  if(mm){left=Math.max(6,Math.round(mm.right-w));top=Math.round(mm.bottom+6);}
  else{left=Math.max(6,innerWidth-w-12);top=(tb?tb.bottom:44)+6;}
  for(const r of xptStack()){if(XU49.hit({left,top,right:left+w,bottom:top+h},r,4))top=Math.max(top,r.bottom+6);}
  const pb=XU49.rect('pbar');if(pb&&XU49.hit({left,top,right:left+w,bottom:top+h},pb,3))top=pb.bottom+6;
  top=Math.min(top,innerHeight-h-6);el.style.left=Math.round(left)+'px';el.style.top=Math.round(top)+'px';
}
function xptDockHost(){
  const touch=document.body&&(document.body.classList.contains('touch')||typeof isTouchUI!=='undefined'&&isTouchUI);
  if(touch)return document.getElementById('b_map')||document.getElementById('b_cult')||document.getElementById('b_roster');
  return document.getElementById('b_bigmap')||document.getElementById('b_cultpc')||document.getElementById('b_rosterpc');
}
function xptDock(b){
  if(!b)return;
  const host=xptDockHost();
  if(host&&host.parentNode){
    const touch=document.body&&document.body.classList.contains('touch');
    b.className=touch?'btn tbtn':'btn';
    if(!b.dataset.xpto)b.dataset.xpto='1';
    b.title='開啟組隊視窗（P）';
    const label=touch?'隊':'👥 組隊（P）';
    if(b.textContent!==label&&!b.querySelector('[data-xpto]'))b.textContent=label;
    if(b.parentNode!==host.parentNode||b.nextSibling!==host)host.parentNode.insertBefore(b,host);
  }else if(!b.parentNode&&document.body)document.body.appendChild(b);
}
function xptEl(){let b=document.getElementById('xwptb');
  if(!b){b=document.createElement('button');b.type='button';b.id='xwptb';b.dataset.xpto='1';b.title='開啟組隊視窗（P）';b.textContent='👥 組隊（P）';}
  xptDock(b);return b;}
function xptWin(){let w=document.getElementById('xwptw');if(w)return w;w=document.createElement('div');w.id='xwptw';
  w.innerHTML='<span class="xptx" data-xptx="1" title="關閉（可從「👥 組隊」再打開）">✕</span><h4>👥 組隊</h4><div>目前沒有其他道友在房間裡。<br>組隊需要先開房或加入房間（頂欄「🌐 聯機」）；有道友進房後，這裡會列出成員、可邀請、踢出與離隊。</div><span class="btn" data-xptnet="1">🌐 開啟聯機視窗</span>';
  document.body.appendChild(w);try{XWDrag.make(w,{key:'xwptw',handle:'h4'});}catch(e){}
  for(const t of ['pointerdown','mousedown','touchstart','contextmenu','wheel'])w.addEventListener(t,e=>e.stopPropagation());return w;}
function xptSync(){if(!document.body)return;const b=xptEl(),w=xptWin(),np=document.getElementById('netpt');const coop=XPT.coop(),open=XPT.open();
  if(np){if(coop&&!open)np.style.display='none';else if(coop&&np.style.display==='none'&&open){np.style.display='';}
    if(coop&&!np.querySelector(':scope > .xptx')){const x=document.createElement('span');x.className='xptx';x.dataset.xptx='1';x.title='關閉（可從「👥 組隊」再打開）';x.textContent='✕';np.appendChild(x);}}
  if(!coop||!open)document.body.classList.remove('netpt-hideobj');
  const hide=typeof xnMenuUp==='function'&&xnMenuUp();
  const showB=!open&&!hide,showW=open&&!coop&&!hide;
  b.style.display=showB?'inline-flex':'none';w.style.display=showW?'block':'none';
  if(showB){xptDock(b);if(!b.classList.contains('xwdragged'))xptPlace(b);}
  if(showW&&!w.classList.contains('xwdragged'))xptPlace(w);}
addEventListener('click',ev=>{const t=ev.target&&ev.target.closest?ev.target:null;if(!t)return;
  if(t.closest('[data-xptx]')){ev.stopPropagation();ev.preventDefault();XPT.set(false);return;}
  if(t.closest('[data-xpto]')){ev.stopPropagation();ev.preventDefault();if(typeof NET!=='undefined')NET._ptOpen=false;XPT.set(true);if(typeof netPtRender==='function')try{netPtRender();}catch(e){}return;}
  if(t.closest('[data-xptnet]')){ev.stopPropagation();ev.preventDefault();if(typeof netTogglePanel==='function')netTogglePanel(true);return;}},true);
if(typeof netPtRender==='function'){const _x=netPtRender;netPtRender=function(){const r=_x.apply(this,arguments);try{xptSync();}catch(e){}return r;};}
if(typeof netPtPlace==='function'){const _x=netPtPlace;netPtPlace=function(el){const r=_x.apply(this,arguments);try{if(el&&el.style.display!=='none'&&!el.dataset.saved&&!el.classList.contains('ptdragging')){
  // 原本只避開目標欄，這裡把「提示」框也算進左側堆疊；弟子列在預設位置時改由弟子列讓位（排在組隊下方）
  document.body.classList.remove('netpt-hideobj');el.dataset.hideobj='';xptPlace(el);}}catch(e){}return r;};}
setInterval(()=>{try{xptSync();}catch(e){}},1000);
if(typeof XWDrag!=='undefined'){const _r=XWDrag.reset;XWDrag.reset=function(){try{localStorage.removeItem(XPT.K);}catch(e){}for(const id of ['xwptb','xwptw']){const e=document.getElementById(id);if(e)this.clear(e);}const r=_r.apply(this,arguments);try{xptSync();}catch(e){}return r;};}
// ---- 弟子列：預設位置排在組隊下方；任何時候都不壓到搖桿 ----
if(typeof pbDefault==='function'){const _d=pbDefault;pbDefault=function(){const d=_d.apply(this,arguments);try{if(isTouchUI&&XU49.portrait()){for(const id of ['netpt','xwptb','xwptw']){const e=document.getElementById(id);const r=XU49.rect(e);if(r&&!e.classList.contains('xwdragged')&&!(e.dataset&&e.dataset.saved)&&r.left<200&&r.top<innerHeight*0.6)d.y=Math.max(d.y,r.bottom+4);}}}catch(e){}return d;};}
if(typeof pbApply==='function'){const _a=pbApply;pbApply=function(){const r=_a.apply(this,arguments);try{xu49PbJoy();}catch(e){}return r;};}
function xu49PbJoy(){const el=document.getElementById('pbar');let p=XU49.rect(el);if(!p)return;const tb=XU49.rect('topbar'),minY=(tb?tb.bottom:40)+2;
  const obs=['joy','panel','actions','x47fan'].map(id=>XU49.rect(id)).filter(Boolean);if(!obs.some(o=>XU49.hit(p,o,4)))return;
  // 往上推到所有障礙物上方；推不上去就移到搖桿右側
  let y=p.top;for(let k=0;k<6;k++){const r={left:p.left,right:p.right,top:y,bottom:y+p.height};const o=obs.find(o=>XU49.hit(r,o,4));if(!o)break;y=o.top-p.height-8;}
  const r={left:p.left,right:p.right,top:y,bottom:y+p.height};if(y>=minY&&!obs.some(o=>XU49.hit(r,o,4))){el.style.top=Math.round(y)+'px';return;}
  const j=XU49.rect('joy');if(j){el.style.left=Math.round(j.right+8)+'px';el.style.maxWidth=Math.max(200,innerWidth-j.right-16)+'px';}}
// ---- 角色卡：其他玩家的卡只看不動 → 不因數值跳動而重建；自己的卡重建時保留捲動、分頁與展開 ----
function xu49OtherPc(u){try{if(!u)return false;if(typeof netOtherPc==='function'&&netOtherPc(u))return true;return typeof NET!=='undefined'&&!!NET.role&&(u.kind==='player'||!!u.np)&&u!==player();}catch(e){return false;}}
{const _pk=panelKey;panelKey=function(){const k=_pk.apply(this,arguments);try{if(selUnits.length===1&&k&&k[0]==='u'){const u=unitById(selUnits[0]);
  if(u&&xu49OtherPc(u))return 'u'+u.id+'|ro|'+u.realm+'s'+(u.sub||0)+gearKey(u);}}catch(e){}return k;};}
const XU49P={t:0,uid:null};
{const _rp=renderPanel;renderPanel=function(){const pn=document.getElementById('panel');let u=null,ro=false;try{u=selUnits.length===1?unitById(selUnits[0]):null;ro=!!u&&xu49OtherPc(u);}catch(e){}
  // 其他玩家的卡：同一張卡就降到每 0.5 秒更新一次數值（原地更新，不重建）
  const now=performance.now();if(u&&pn&&XU49P.uid===u.id&&pn.innerHTML&&panelKeyCache==null){// 只是被「強制重繪」而內容鍵沒變：其他玩家的卡一律不重建；成員端自己的卡最多 5 秒重建一次
    try{const cl=typeof NET!=='undefined'&&NET.role==='client';if(ro||(cl&&now-(XU49P.rb||0)<5000)){const k=panelKey();if(k&&XU49P.k===k)panelKeyCache=k;}}catch(e){}}
  if(ro&&pn&&XU49P.uid===u.id&&pn.innerHTML&&now-XU49P.t<500&&panelKeyCache&&panelKeyCache===panelKey())return;
  let snap=null;if(pn&&u&&XU49P.uid===u.id&&pn.innerHTML){snap={sc:[],tab:null,det:[]};snap.sc.push(['',pn.scrollTop]);pn.querySelectorAll('.v55pane,.v55m,.pmore').forEach((e,i)=>{if(e.scrollTop)snap.sc.push([i,e.scrollTop]);});
    const t=pn.querySelector('.v55t.on');snap.tab=t&&t.dataset.v55tab;pn.querySelectorAll('details').forEach((d,i)=>snap.det.push(d.open));snap.exp=pn.classList.contains('expanded');}
  const before=pn&&pn.firstElementChild;const r=_rp.apply(this,arguments);
  try{XU49P.t=now;XU49P.uid=u?u.id:null;XU49P.k=panelKeyCache;if(snap&&pn&&pn.firstElementChild!==before){XU49P.rb=now;// 有重建 → 還原
      if(snap.tab){const t=pn.querySelector(`.v55t[data-v55tab="${snap.tab}"]`);if(t&&!t.classList.contains('on'))t.click();}
      pn.querySelectorAll('details').forEach((d,i)=>{if(snap.det[i]!=null)d.open=snap.det[i];});if(snap.exp)pn.classList.add('expanded');
      const L=pn.querySelectorAll('.v55pane,.v55m,.pmore');for(const [i,v] of snap.sc){if(i==='')pn.scrollTop=v;else if(L[i])L[i].scrollTop=v;}XU49.reb=(XU49.reb||0)+1;}}catch(e){}
  return r;};}
setTimeout(()=>{try{if(window.XW&&XW.xn){XW.xn.pk=()=>panelKey();XW.xn.reb=()=>XU49.reb||0;XW.xn.pt={sync:xptSync,open:()=>XPT.open(),set:v=>XPT.set(v)};}}catch(e){}},0);
// ---- #7 樹木不再擋人：(a) 自己人（你、弟子、道友化身、村民）碰撞時把樹／草／漿果／藥草當可穿過；尋路照舊會繞（走起來是順順地繞過），搖桿則可直接穿過
//                    (b) 樹在人物前面（畫在後面）且蓋到人物時，樹變半透明
TUNE.xn.softNode={tree:1,fiber:1,berry:1,herb:1};TUNE.xn.treeFade=0.4;
{const _ct=collideTiles;collideTiles=function(o){const SN=TUNE.xn.softNode;if(!SN||!o||!(o.kind==='player'||o.kind==='disciple'||o.kind==='villager'||o.np))return _ct(o);
  const r=o.r||0.3,i0=Math.floor(o.x-r),i1=Math.floor(o.x+r),j0=Math.floor(o.y-r),j1=Math.floor(o.y+r),tmp=[];
  for(let j=j0;j<=j1;j++)for(let i=i0;i<=i1;i++){if(i<0||j<0||i>=N||j>=N)continue;const k=j*N+i;const n=nodeGrid[k];if(block[k]===1&&n&&!n.gone&&SN[n.type]&&!occ[k]){block[k]=0;tmp.push(k);}}
  try{return _ct(o);}finally{for(const k of tmp)block[k]=1;}};}
function xu49TreeFade(){const a=TUNE.xn.treeFade;if(!a||a>=1)return null;const pts=[];
  const add=(u,big)=>{const q=iso(u.x,u.y);pts.push([u.x+u.y,q.x,q.y,big?14:11]);};
  for(const u of S.units)if(!u.dead&&!u.inside&&!u.dgIn)add(u,u.kind==='player');for(const n of S.npcs||[])add(n,false);
  if(!pts.length)return null;
  return (o,p,f)=>{const d=o.i+o.j+1,x0=p.x-30*f,x1=p.x+30*f,y0=p.y-78*f,y1=p.y-6*f;
    for(const q of pts){if(q[0]>=d)continue;if(q[1]+q[3]<x0||q[1]-q[3]>x1)continue;if(q[2]<y0||q[2]-44>y1)continue;return a;}return 1;};}
// ===== v0.4.9 Fix8：室內角色去重（同一玩家只畫一次）＋聯機座位依點選的蒲團 =====
// (a) 成員端 player() 就是自己的化身（kind 'disciple'、np），owner 的 occupants() 也把它算進去 → interiorPeople 同一人出現兩次（一個坐蒲團、一個站著）。
//     另外重連後若殘留同 np 的舊化身，也只保留 netAvatarOf(np) 那一個。
function xu49PcKey(u){return u&&u.np?'np:'+u.np:'id:'+(u&&u.id);}
function xu49Cur(u){if(!u||!u.np||typeof netAvatarOf!=='function')return true;try{const c=netAvatarOf(u.np);return !c||c===u;}catch(e){return true;}}
{const _oc=occupants;occupants=function(b){const r=_oc.apply(this,arguments);try{if(!r.some(u=>u.np))return r;const seen=new Set();return r.filter(u=>{if(!xu49Cur(u)){XU49.dup=(XU49.dup||0)+1;return false;}const k=xu49PcKey(u);if(seen.has(k)){XU49.dup=(XU49.dup||0)+1;return false;}seen.add(k);return true;});}catch(e){return r;}};}
{const _ip=interiorPeople;interiorPeople=function(b){const out=_ip.apply(this,arguments);try{
  const pe=out.find(o=>o.player),seen=new Set(),res=[];
  if(pe){seen.add('id:'+pe.u.id);seen.add(xu49PcKey(pe.u));if(typeof NET!=='undefined'&&NET.role==='client'&&NET.pkey)seen.add('np:'+NET.pkey);}
  for(const o of out){if(o===pe){res.push(o);continue;}const u=o.u,k1='id:'+u.id,k2=xu49PcKey(u);
    if(seen.has(k1)||seen.has(k2)||!xu49Cur(u)){XU49.dup=(XU49.dup||0)+1;continue;}seen.add(k1);seen.add(k2);res.push(o);}
  return res;}catch(e){return out;}};}
// (b) net11 的 netSeatTick 對新坐下的玩家一律給「最小號的空位」（大殿＝寶座旁第一個蒲團）→ 不管點哪個蒲團都被拉去上座。
//     g 端補：記下每位玩家「坐下前要去的位置」（房主：S.interior 的目標/位置；成員：送 xnseat 意圖），房主在 netSeatTick 之前／之後
//     把 b.netSeats 改成離該位置最近的空蒲團（先坐先得；寶座、其他玩家已坐的不搶；弟子照 owner 規則找剩下的空位 → 不重複）。
const XN8={log:[]};
function xu49Slots(b){const s=[];for(let k=0;k<TUNE.v169.maxSlot;k++){const t=roomSt(b,k);if(!t)break;s.push(t);}return s;}
function xu49SeatFix(){if(typeof NET==='undefined'||NET.role!=='host'||!S||S.dg)return;
  for(const b of S.buildings){if(!b.built||!ROOM[b.type])continue;
    const ps=S.units.filter(u=>(u.kind==='player'||u.np)&&!u.dead&&u.inside&&u.inB===b.id&&(u.medit||u.v165===b.id));
    for(const u of S.units)if((u.kind==='player'||u.np)&&u._xnOk!=null&&!ps.includes(u))u._xnOk=null;
    if(!ps.length)continue;const R=b.netSeats||(b.netSeats={});const slots=xu49Slots(b);if(!slots.length)continue;
    const settled=ps.filter(u=>u._xnOk!=null&&R[u.id]===u._xnOk&&u.v165!==b.id),taken=new Set(settled.map(u=>u._xnOk));
    const todo=ps.filter(u=>!settled.includes(u)&&u.v165!==b.id&&R[u.id]!=='T').sort((a,c)=>((a._xnSeat&&a._xnSeat.t)||0)-((c._xnSeat&&c._xnSeat.t)||0)||a.id-c.id);
    for(const u of todo){const pf=u._xnSeat&&u._xnSeat.bid===b.id?u._xnSeat:null;
      // 其他還沒處理的玩家目前拿的位子先不算占用（他們之後也會重新排）；已坐定的不動
      let k=-1,bd=1e9;for(let i=0;i<slots.length;i++){if(taken.has(i))continue;const d=pf?Math.hypot(slots[i][0]-pf.x,slots[i][1]-pf.y):i;if(d<bd){bd=d;k=i;}}
      if(k<0)continue;taken.add(k);if(R[u.id]!==k){XN8.log.push({t:+S.time.toFixed(1),id:u.id,from:R[u.id],to:k});if(XN8.log.length>40)XN8.log.shift();}R[u.id]=k;u._xnOk=k;}}}
{const _u=update;update=function(dt){const r=_u.apply(this,arguments);try{if(typeof NET!=='undefined'&&NET.role==='host'&&S&&!S.dg){
  const p=player(),I=S.interior;if(p&&I&&!p.medit&&p.v165!==I.bid)p._xnSeat={bid:I.bid,x:I.tx!=null?I.tx:I.x,y:I.ty!=null?I.ty:I.y,t:S.time};
  xu49SeatFix();}}catch(e){}return r;};}
if(typeof netApplyIntent0==='function'){const _x=netApplyIntent0;netApplyIntent0=function(pk,i){if(!i||i.a!=='xnseat')return _x.apply(this,arguments);
  const a=netAvatarOf(pk);if(!a||a.dead||!isFinite(i.x)||!isFinite(i.y))return false;if(!a.medit)a._xnSeat={bid:+i.bid,x:+i.x,y:+i.y,t:S.time};return true;};}
// 成員：在屋內沒打坐時，把要去的位置（點選的蒲團）回報給房主
setInterval(()=>{try{if(typeof NET==='undefined'||NET.role!=='client'||!S||!S.interior)return;const a=netMyAv();if(!a||a.medit)return;const I=S.interior;
  const x=+(I.tx!=null?I.tx:I.x).toFixed(2),y=+(I.ty!=null?I.ty:I.y).toFixed(2),k=I.bid+':'+x+':'+y;if(k===XN8.sent&&performance.now()-(XN8.st||0)<3000)return;XN8.sent=k;XN8.st=performance.now();netIntent({a:'xnseat',bid:I.bid,x,y});}catch(e){}},250);
setTimeout(()=>{try{if(window.XW&&XW.xn){XW.xn.ip=bid=>{const b=bById(+bid);return b?interiorPeople(b).map(o=>[o.u.id,o.u.np||null,!!o.player,o.act,+o.x.toFixed(2),+o.y.toFixed(2)]):null;};XW.xn.dup=()=>XU49.dup||0;XW.xn.seatLog=XN8.log;XW.xn.slots=bid=>xu49Slots(bById(+bid));}}catch(e){}},0);
// ===== v0.4.9 Fix9：弟子資質品階 — 單一系統、五階名稱不重複（下品／中品／上品／極品／天品）=====
// 原因：卡片同時有「體質稀有度」標籤（凡品／良品／上品／極品，藍色上品＝火靈／寒冰／厚土體）與「自動選上品」推薦的金色「上品」標籤
//（悟性≥75、已是武師、有特殊靈根……都會掛）→ 一張凡品卡也同時寫著上品；上品+ 實際約 30%（體質）＋推薦標籤更多。
// 新：先依下表權重抽「品階」，再從該品階的體質池抽體質、在悟性區間內抽悟性、限制靈根；卡片只顯示一個品階標籤＋星數＋評分。
TUNE.xn.grade={tiers:[
  {k:'xia',  n:'下品',w:80, col:'#8d949c',star:1,body:[0],    wu:[15,60],lg:'wei'},   // 靈根最多雜靈根
  {k:'zhong',n:'中品',w:30, col:'#43a047',star:2,body:[1,2],  wu:[30,75],lg:'zhen'},  // 最多真靈根
  {k:'shang',n:'上品',w:10, col:'#2f7de1',star:3,body:[3,4,5],wu:[45,85],lg:'zhen'},
  {k:'ji',   n:'極品',w:5,  col:'#9b4de0',star:4,body:[3,4,5],wu:[65,95],lg:'tian',lgMin:1}, // 必有天靈根或變異靈根
  {k:'tian', n:'天品',w:0.5,col:'#e8a400',star:5,body:[6],    wu:[70,98]}],             // 仙武之體
  altarMul:0.5};  // 求武台每升一級：極品／天品權重 ×(1+0.5×(Lv-1))（取代舊的仙武之體機率加成）
const XN_BODY_RAR={'凡品':'常見','良品':'少見','上品':'稀有','極品':'絕世'};  // 體質本身的稀有度改用不同字，避免跟品階撞名
const XNG={last:null};
for(const L of [DISC_COPY,CAND_KEEP,WAND_KEEP,UNIT_KEEP])if(!L.includes('xnG'))L.push('xnG');
function xnTiers(){return TUNE.xn.grade.tiers;}
function xnRollTier(mul){const T=xnTiers(),m=mul||1;let tot=0;const w=T.map((t,i)=>{const v=t.w*(i>=3?1+(m-1):1);tot+=v;return v;});let r=rnd()*tot;for(let i=0;i<T.length;i++){r-=w[i];if(r<0)return i;}return 0;}
function xnPickBody(t){const P=xnTiers()[t].body;let tot=0;for(const k of P)tot+=(BODIES[k].w||1);let r=rnd()*tot;for(const k of P){r-=(BODIES[k].w||1);if(r<=0)return k;}return P[0];}
// 舊存檔／沒有品階的角色：由體質稀有度＋靈根推算（凡品→下品、良品→中品、上品→上品、極品（仙武之體）→天品；有頂級靈根再升一階，最高極品）
function xnGrade(u){if(!u)return 0;if(u.xnG!=null&&xnTiers()[u.xnG])return u.xnG;if(u.kind==='player'||isXW(u))return 4;const B=BODIES[u.body]||BODIES[0];
  let g={'凡品':0,'良品':1,'上品':2,'極品':4}[B.rar];if(g==null)g=0;try{if(g<3&&u.lg&&v47RootCls(u)==='top')g++;}catch(e){}return g;}
function xnGradeName(u){return xnTiers()[xnGrade(u)].n;}
function xnScore(u){const g=xnGrade(u);const s=g*20+Math.min(19,(u.wu||0)*0.12+(u.xy||0)*0.06+(u.luck||0)*0.02+(u.realm||0)*2);return Math.round(s);}
function xnStars(g){const n=xnTiers()[g].star;return '★'.repeat(n)+'☆'.repeat(5-n);}
function xnGradeTag(u,full){const g=xnGrade(u),T=xnTiers()[g];return `<span class="tag xng xng${g}" style="background:${T.col};color:#fff" data-tip="xngrade" title="資質品階：${T.n}（${xnStars(g)}，評分 ${xnScore(u)}/100）">${T.n}</span>`+(full?`<span class="xnsc" title="資質評分（0～100，同品階內依悟性、仙緣、氣運、境界）"><span style="color:${T.col}">${xnStars(g)}</span> <b>${xnScore(u)}</b></span>`:'');}
{const _r=rollBody4;rollBody4=function(force,mul){if(force!=null){XNG.last=null;return _r.apply(this,arguments);}const t=xnRollTier(mul);XNG.last=t;return xnPickBody(t);};}
function xnLgFit(d,t){const T=xnTiers()[t];if(!T||!d)return;try{if(d.lg&&!d.lg.g)d.lg=normLg(d.lg);const L=d.lg;
  if(T.lg==='wei'&&L&&L.g!=='wei')d.lg=mkLg('wei');
  else if(T.lg==='zhen'&&L&&!['wei','zhen'].includes(L.g))d.lg=mkLg('zhen');
  if(T.lgMin&&(!d.lg||['wei','zhen'].includes(d.lg.g)))d.lg=rnd()<0.6?mkLg('tian'):mkLg('var');}catch(e){}}
{const _md=makeDisciple;makeDisciple=function(x,y,bi){const t=XNG.last;XNG.last=null;const d=_md.apply(this,arguments);try{if(d&&t!=null&&xnTiers()[t].body.includes(d.body)){d.xnG=t;const W=xnTiers()[t].wu;d.wu=ri(W[0],W[1]);}}catch(e){}return d;};}
{const _mc=makeCandidate;makeCandidate=function(b,x,y,force){const d=_mc.apply(this,arguments);try{if(d&&d.xnG!=null)xnLgFit(d,d.xnG);}catch(e){}return d;};}
{const _sd=spawnDisciple;spawnDisciple=function(b,o){const d=_sd.apply(this,arguments);try{if(d&&d.xnG!=null&&!(o&&o.lg!==undefined))xnLgFit(d,d.xnG);}catch(e){}return d;};}
candScore=function(c){return xnScore(c)+(isXW(c)?1000:0);};
candGood=function(c){const g=xnGrade(c);return g>=2||(g>=1&&(c.realm||0)>=1);};
{const _tt=tipText;tipText=function(k){if(k==='xngrade'){const T=xnTiers(),tot=T.reduce((a,t)=>a+t.w,0);return '資質品階（一個角色只有一個品階）：'+T.map((t,i)=>`${t.n} ${xnStars(i)} 約 ${(t.w/tot*100).toFixed(1)}%`).join('、')+'。評分 0～100：品階 ×20，再加悟性、仙緣、氣運、境界（同品階內比較）。';}return _tt.apply(this,arguments);};}
{const st=document.createElement('style');st.id='xn9css';st.textContent='.xnsc{font-size:11px;margin-left:4px;white-space:nowrap;color:#e8dcc0}.xnsc b{color:#ffe9a0}';(document.head||document.documentElement).appendChild(st);}
// ===== v0.4.9 Fix10：流浪者卡「贈禮」沒反應 =====
// 原因：g15 的 panelActV045 包裝把 data-act="gift" 一律當成「送禮給選取的弟子」（giftTo(selUnits[0])）並回傳 true；
// 選流浪者時 selUnits 是空的 → giftTo(undefined) 什麼都不做，g7 的 giftWanderer 分支永遠到不了。成員端另外完全沒有轉送給房主。
function xnWandSel(){try{const o=selOtherObj();return o&&S.wand.includes(o)?o:null;}catch(e){return null;}}
{const _pa=panelActV045;panelActV045=function(act,b,us,el){if((act==='gift'||act==='woo')&&!selUnits.length){const w=xnWandSel();if(w){xnWandAct(act,w);panelKeyCache=null;return true;}}return _pa.apply(this,arguments);};}
function xnWandAct(act,w){if(typeof NET!=='undefined'&&NET.role==='client'){
    if(act==='gift'){const need=15,have=Math.floor(S.res.food||0);if(have<need){toast(`食物不足：贈禮需要 15，目前 ${have}，還差 ${need-have}`);return false;}}
    if(XN14P.p[w.id]){toast('上一個請求還在等房主確認…');return false;}
    netIntent({a:'xnwand',k:act,id:w.id});XN14P.p[w.id]={k:act,t0:performance.now(),fav:w.fav,name:w.name};XN14P.sent++;panelKeyCache=null;toast(act==='gift'?`送禮給「${w.name}」…（等待房主確認）`:`招攬「${w.name}」…（等待房主確認）`);return true;}
  return act==='gift'?giftWanderer(w):wooWanderer(w);}
{const _g=giftWanderer;giftWanderer=function(w){if(w&&S.wand.includes(w)&&nearPlayer(w,TUNE.talkDist)){const have=Math.floor(S.res.food||0);if(have<15){toast(`食物不足：贈禮需要 15，目前 ${have}，還差 ${15-have}`);return false;}}
  const f0=w&&w.fav;const r=_g.apply(this,arguments);try{if(r&&w){floater(w.x,w.y,`好感 +${w.fav-f0}`,'#ff9ad5');floater(w.x,w.y-0.4,'食物 -15','#ffd27a');panelKeyCache=null;}}catch(e){}return r;};}
if(typeof netApplyIntent0==='function'){const _x=netApplyIntent0;netApplyIntent0=function(pk,i){if(!i||i.a!=='xnwand')return _x.apply(this,arguments);
  const a=netAvatarOf(pk);if(!a||a.dead)return false;
  if(i.k==='trade'){const v=vById(+i.vid);if(!v||typeof i.i!=='number')return false;const r=netAsMember(a,()=>doTrade(+i.vid,i.i))!==false;if(r){xn14HostNote(`${a.name||'成員'} 與 ${v.name} 交易`);try{tradeKey=null;if(tradeOpen!=null)renderTrade();}catch(e){}}return r;}
  const w=S.wand.find(o=>o.id===+i.id);if(!w||!['gift','woo'].includes(i.k))return false;const wn=w.name;
  const r=netAsMember(a,()=>i.k==='gift'?giftWanderer(w):wooWanderer(w))!==false;
  if(r)xn14HostNote(i.k==='woo'?(S.wand.includes(w)?null:`${a.name||'成員'} 招攬了 ${wn}`):`${a.name||'成員'} 送禮給 ${wn}`);return r;};}
// 主機端：成員的請求自動處理（不跳確認），只顯示一則小提示
function xn14HostNote(t){if(!t)return;const cap=NET.capture;NET.capture=null;try{toast('👥 '+t);}finally{NET.capture=cap;}}
// 成員端：等待房主確認的狀態（卡片顯示 ⏳；同步回來或 6 秒逾時就清掉）
const XN14P={p:{},tr:null,sent:0,ok:0,to:0};
setInterval(()=>{if(typeof NET==='undefined'||NET.role!=='client'){XN14P.p={};XN14P.tr=null;return;}const now=performance.now();let ch=false;
  for(const id in XN14P.p){const P=XN14P.p[id],w=S.wand.find(o=>o.id===+id);const done=!w||w.fav!==P.fav;
    if(done){delete XN14P.p[id];XN14P.ok++;ch=true;}else if(now-P.t0>6000){delete XN14P.p[id];XN14P.to++;ch=true;toast(`房主沒有回應「${P.name}」的${P.k==='woo'?'招攬':'贈禮'}請求，請再試一次`);}}
  if(XN14P.tr&&now-XN14P.tr.t0>1500){XN14P.tr=null;ch=true;try{tradeKey=null;if(tradeOpen!=null)renderTrade();}catch(e){}}
  if(ch)panelKeyCache=null;},300);
{const _t=doTrade;doTrade=function(vid,k){if(typeof NET!=='undefined'&&NET.role==='client'){if(XN14P.tr){toast('交易請求處理中…');return false;}XN14P.tr={t0:performance.now()};netIntent({a:'xnwand',k:'trade',vid:+vid,i:+k});XN14P.sent++;toast('交易請求已送出（等待房主確認）');return true;}return _t.apply(this,arguments);};}
{const _rp=renderPanel;renderPanel=function(){_rp.apply(this,arguments);try{if(typeof NET==='undefined'||NET.role!=='client')return;const w=xnWandSel();const pn=document.getElementById('panel');if(!pn)return;let el=pn.querySelector('#xn14p');const P=w&&XN14P.p[w.id];
  if(!P){if(el)el.remove();return;}if(!el){el=document.createElement('div');el.id='xn14p';el.style.cssText='margin:4px 0;padding:3px 6px;border-radius:4px;background:#3a3020;color:#ffd27a;font-size:12px';pn.insertBefore(el,pn.firstChild&&pn.firstChild.nextSibling||null);}
  el.textContent=`⏳ ${P.k==='woo'?'招攬':'贈禮'}請求已送出，等待房主確認…`;pn.querySelectorAll('[data-act=woo],[data-act=gift]').forEach(b=>{b.disabled=true;b.style.opacity=0.5;});}catch(e){}};}
// ===== v0.4.9 Fix11：倉庫容量（使用者指定 Lv1 只加 +300）=====
// 舊：基本 木石纖食 4000、鐵 2000、藥 1000、靈石 3000；每座倉庫 +5000（Lv2 +7500、Lv3 +10000…）→ 一座就 9000，實際玩只用到一小部分。
// 新：倉庫 Lv1 +300，每升一級 +300（Lv2 +600、Lv3 +900…）；基本上限依「單次最貴的建造／升級／研究／招募費用」重新訂（見 xnCapCheck）。
Object.assign(TUNE.v53,{per:300,perLv:1.0,round:100});
TUNE.v53.base={wood:500,stone:700,fiber:300,food:500,iron:150,herb:150,lingshi:400};  // 單人最貴：木 355（長書閣 Lv5）、石 608（護宗大陣 Lv5）、纖 152、鐵 102、藥 102、靈石 304
TUNE.xn.capCoop=1;  // 多人：基本上限也乘上多人造價倍率 1+(N-1)×0.5（否則 4 人時護宗大陣 Lv5 要石 1520 > 上限）
{const _c=v53Cap;v53Cap=function(k){const c=_c.apply(this,arguments);try{const n=TUNE.xn.capCoop&&TUNE.xn.coop?xnPlayers():1;if(n>1){const T=TUNE.v53,mn=S.flags&&S.flags.v53min||{};const b=Math.max(T.base[k]||T.base.wood,mn[k]||0);return c+Math.round(b*(XN.coopCost(n)-1));}}catch(e){}return c;};}
BDESC.cangku.s='存放宗門各類物資，容量上限 +300';BDESC.cangku.d='每座倉庫讓所有資源的容量上限 +300（Lv2 +600、Lv3 +900，依此類推）。採集的弟子會把資源搬到最近的倉庫或宗門大殿，路程更短。資源滿了就無法再存入。';BUILD.cangku.desc=BDESC.cangku.s+'。'+BDESC.cangku.d;
function xnCapCheck(n){n=n||1;const k=n>1?XN.coopCost(n):1,rows=[],mx={};const add=(what,c)=>{if(!c)return;const o={};for(const q in c){const v=Math.ceil(c[q]*k);o[q]=v;if(!mx[q]||v>mx[q].v)mx[q]={v,what};}rows.push([what,o]);};
  const maxLv=TUNE.lvCost.length+1;for(const t in BUILD){const B=BUILD[t];if(!B||!B.cost)continue;const base=B._xnBase||B.cost;add(t+'@1',t==='hall'?B.cost:base);
    for(let lv=2;lv<=maxLv;lv++){try{const sv=TUNE.xn.coop;TUNE.xn.coop=0;const c=upCost({type:t,lv:lv-1},lv);TUNE.xn.coop=sv;add(t+'@'+lv,c);}catch(e){}}}
  try{add('research',RESEARCH_COST);}catch(e){}try{const a=S.buildings.find(b=>b.type==='altar');if(a)add('recruit',recruitCost(a));}catch(e){}
  const cap={};for(const q of RES_KEYS)cap[q]=Math.round((TUNE.v53.base[q]||TUNE.v53.base.wood)*(TUNE.xn.capCoop?k:1));const over=[];for(const q in mx)if(cap[q]!=null&&mx[q].v>cap[q])over.push([q,mx[q].v,cap[q],mx[q].what]);return {n,mx,cap,over,rows};}
setTimeout(()=>{try{if(window.XW&&XW.xn){XW.xn.capCheck=n=>xnCapCheck(n);XW.xn.grade={roll:(N,mul)=>{const c=[0,0,0,0,0];for(let i=0;i<N;i++)c[xnRollTier(mul)]++;return c;},of:u=>xnGrade(u),score:u=>xnScore(u),tiers:()=>xnTiers()};}}catch(e){}},0);

// ======================= v0.4.9 Fix12：聯機成員在任何室內都看得到宗門事件橫幅（比武大會／拍賣會／仙門試煉），位置在任務追蹤下方、避開室內面板 =======================
// 原因：v47Banner 只寫入本機 V47.banners；比武／拍賣由主機觸發 → 成員端從未收到橫幅。另外室內時橫幅固定在畫面中上，窄螢幕會壓到室內面板。
const XN12={ids:/^(v48auc|v48tour|v49trial)$/,rx:0,tx:0,lay:null};
function xn12Click(id){if(id==='v48auc')return ()=>v48Open('auc');if(id==='v48tour')return ()=>v48Open('tour');return null;}
{const _b=v47Banner;v47Banner=function(id,o){const r=_b.apply(this,arguments);try{if(typeof NET!=='undefined'&&NET.role==='host'&&NET.tr&&XN12.ids.test(id)){NET.tr.broadcast({t:'xnbn',id,txt:o.txt,cls:o.cls||'',ttl:o.ttl||0});XN12.tx++;}}catch(e){}return r;};}
{const _o=v47BannerOff;v47BannerOff=function(id){const had=!!(V47.banners&&V47.banners[id]);const r=_o.apply(this,arguments);try{if(had&&typeof NET!=='undefined'&&NET.role==='host'&&NET.tr&&XN12.ids.test(id))NET.tr.broadcast({t:'xnbn',id,off:1});}catch(e){}return r;};}
{const _x=netClientRxExtra;netClientRxExtra=function(m){if(m&&m.t==='xnbn'){XN12.rx++;try{if(m.off)v47BannerOff(m.id);else{const o={txt:m.txt,cls:m.cls,ttl:m.ttl};const c=xn12Click(m.id);if(c)o.click=c;v47Banner(m.id,o);}v47RenderBanners();}catch(e){}return;}return _x.apply(this,arguments);};}
// 成員端：依同步過來的 S.flags.v48 補橫幅（後加入／漏收時也看得到），事件結束自動收起
function xn12Derive(){if(typeof NET==='undefined'||NET.role!=='client'||!S||!S.flags)return;const G=S.flags.v48||{};const B=V47.banners||{};
  const T=G.tour,tOn=!!(T&&!T.res&&(T.end==null||S.time<=T.end+5));if(tOn&&!B.v48tour)v47Banner('v48tour',{txt:'⚔ 比武大會開放報名！（5 分鐘內）｜點擊派弟子參賽',cls:'gold',ttl:Math.max(5,(T.end||S.time+300)-S.time),click:xn12Click('v48tour')});else if(!tOn&&B.v48tour&&T&&T.res)v47BannerOff('v48tour');
  const A=G.auc,aOn=!!(A&&!A.over&&(A.end==null||S.time<=A.end+5));if(aOn&&!B.v48auc)v47Banner('v48auc',{txt:'🔔 萬寶樓拍賣會開始了！（5 分鐘內有效）｜點擊參加',cls:'gold',ttl:Math.max(5,(A.end||S.time+300)-S.time),click:xn12Click('v48auc')});else if(!aOn&&B.v48auc&&A&&A.over)v47BannerOff('v48auc');}
// 室內（主機與成員皆然）：橫幅放在任務追蹤下方；若與室內面板重疊 → 移到面板右側；右側太窄 → 移到面板下方
function xn12Layout(){/* BATCH2100_BAN：不再把橫幅置中／搬到室內面板旁；統一由 y194Lay 排到右上角 */try{if(typeof y194Lay==='function')y194Lay();}catch(e){}}
{const _r=v47RenderBanners;v47RenderBanners=function(){try{xn12Derive();}catch(e){}const r=_r.apply(this,arguments);try{if(S&&S.interior)y194Lay();}catch(e){}return r;};}

// ======================= v0.4.9 Fix13：宗主講道不惠及境界高於講道者的弟子（同境界或較低照常受益；聯機以實際坐寶座講道的玩家為準） =======================
function xn13Lect(b){try{if(!b||b.type!=='hall'||b.v165==null)return null;const h=unitById(b.v165);return h&&!h.dead?h:null;}catch(e){return null;}}
function xn13Over(u,h){return !!(u&&h&&u!==h&&(u.realm||0)>(h.realm||0));}
{const _vb=v165Boost;v165Boost=function(u,b,J,m){const h=v165Holder(b);if(h&&xn13Over(u,h)){u.v165X={t:S.time,bid:b.id,hr:h.realm||0,hn:h.name||''};u.v165L=null;return null;}if(u)u.v165X=null;return _vb.apply(this,arguments);};}
// 顯示用（主機與成員都能算）：這名弟子此刻在大殿、有人講道、但境界高於講道者
function xn13Blocked(u){if(!u||u.kind!=='disciple'||u.np||u.dead)return null;let b=null;try{if(u.inside&&u.inB!=null)b=bById(u.inB);}catch(e){}if(!b||b.type!=='hall')return null;const h=xn13Lect(b);if(!h||!xn13Over(u,h))return null;return {b,h};}
function xn13Note(u){const x=xn13Blocked(u);if(!x)return '';const h=x.h;return `⛔ 境界高於宗主，無法受益於講道（講道者 ${h.name||''}：${realmName(h)}；本人：${realmName(u)}）`;}
{const _t=v165Txt;v165Txt=function(u){const n=xn13Note(u);if(n)return n;return _t.apply(this,arguments);};}
// 角色卡：被擋的弟子也要顯示（原本只在有加成時插入 #v165l）
{const _rp=renderPanel;renderPanel=function(){_rp.apply(this,arguments);try{const pn=document.getElementById('panel');if(!pn||selUnits.length!==1)return;const u=unitById(selUnits[0]);const n=xn13Note(u);if(!n)return;let el=pn.querySelector('#v165l');
  if(!el){const host=pn.querySelector('#v62cr')||pn.querySelector('h4');if(!host)return;el=document.createElement('div');el.id='v165l';el.className='sm';host.after(el);}el.style.cssText='color:#ff9c8a;margin:2px 0';if(el.textContent!==n)el.textContent=n;}catch(e){}};}
// 大殿室內面板：列出無法受益的弟子
{const _ri=renderInPanel;renderInPanel=function(force){const r=_ri.apply(this,arguments);try{const el=document.getElementById('inpanel'),I=S.interior;if(!el||!I)return r;const b=bById(I.bid);let nb=el.querySelector('#xn13');
  if(!b||b.type!=='hall'){if(nb)nb.remove();return r;}const h=xn13Lect(b);const L=h?S.units.filter(u=>xn13Blocked(u)&&u.inB===b.id):[];
  const html=h?(L.length?`⛔ 境界高於宗主，無法受益：${L.slice(0,6).map(u=>`${u.name}（${realmName(u)}）`).join('、')}${L.length>6?` 等 ${L.length} 人`:''}`:`講道者：${h.name||''}（${realmName(h)}）｜境界高於講道者的弟子無法受益`):'講道規則：境界高於宗主的弟子無法受益';
  if(!nb){nb=document.createElement('div');nb.id='xn13';nb.className='dim sm';nb.style.cssText='margin:4px 0;color:#ffb4a6';el.appendChild(nb);}if(nb.textContent!==html)nb.textContent=html;}catch(e){}return r;};}
// 室內繪圖：被擋的聽道弟子頭上 ⛔
{const _dp=drawPerson;drawPerson=function(b,o,tt){_dp.apply(this,arguments);try{if(b&&b.type==='hall'&&!o.player&&o.u&&xn13Blocked(o.u)){const q=P(o.x,o.y,6);ctx.font='12px sans-serif';ctx.textAlign='center';ctx.fillText('⛔',q.x+10,q.y-34);XN12.x13=(XN12.x13||0)+1;}}catch(e){}};}
(function xn13Api(){if(!window.XW||!XW.xn){setTimeout(xn13Api,100);return;}const o=XW;try{o.xn.bn={st:()=>({rx:XN12.rx,tx:XN12.tx,lay:XN12.lay,ids:Object.keys(V47.banners||{})})};o.xn.lect={blocked:id=>{const u=unitById(id);const x=xn13Blocked(u);return x?{h:x.h.id,hr:x.h.realm,ur:u.realm}:null;},note:id=>xn13Note(unitById(id)),txt:id=>v165Txt(unitById(id)),boost:(id,bid)=>{const u=unitById(id),b=bById(bid);const J=INJOB.lecture;return v165Boost(u,b,J,1);},icons:()=>XN12.x13||0};}catch(e){}})();

// ======================= v0.4.9 Fix8(d)：成員畫面大殿多人時角色閃爍／來回瞬移 =======================
// 原因：成員端自己用 v169Seats 重算弟子座位 ── 結果取決於本機「自己是否在打坐」、慢同步才到的 b.netSeats、在場名單；
//       每次快照讓名單或 netSeats 變一點，弟子就整排換位（瞬移），netSeats 晚到時自己的位子也會跳一次。
// 修：房主是座位唯一權威 ── 每 0.5 秒把每棟室內的完整座位表（含弟子、寶座、玩家）廣播給成員（有變才送，5 秒保底重送）；
//     成員端 v169Seats 直接採用房主的表，還沒收到的單位沿用上次的位子（不再本機重排）；畫面位置再做平滑插值。
const XN8D={rx:0,tx:0,last:{},tab:{},disp:{},jumps:0};
function xn8dPack(b){const m=v169Seats(b),o={};for(const [id,r] of m)o[id]=[+r[0].toFixed(2),+r[1].toFixed(2),r.kind==='throne'?2:r.kind==='slot'?1:0];return o;}
// 以計時器送（不掛在 update：房主分頁在背景時畫面迴圈停，改由背景模擬跑，座位表會停在舊的）
{let acc5=0,lastT=0;const xn8dTick=function(){const now=performance.now();if(now-lastT<480)return;const dt=Math.min(2,(now-lastT)/1000||0.5);lastT=now;try{if(typeof NET!=='undefined'&&NET.role==='host'&&NET.tr&&S&&!S.dg){acc5+=dt;{const full=acc5>=5;if(full)acc5=0;
  for(const b of S.buildings){if(!b.built||!ROOM[b.type])continue;const any=occupants(b).length||S.units.some(u=>(u.kind==='player'||u.np)&&u.inside&&u.inB===b.id);if(!any){if(XN8D.last[b.id]){delete XN8D.last[b.id];NET.tr.broadcast({t:'xnseat',bid:b.id,m:null});}continue;}
    const m=xn8dPack(b),s=JSON.stringify(m);if(s!==XN8D.last[b.id]||full){XN8D.last[b.id]=s;NET.tr.broadcast({t:'xnseat',bid:b.id,m});XN8D.tx++;}}}}}catch(e){}};setInterval(xn8dTick,500);
  // 房主分頁在背景時計時器會被瀏覽器降頻（每分鐘一次）→ 也跟著每個 st 封包送（背景模擬照樣在發 st）
  setTimeout(function xn8dHook(){if(typeof netCast!=='function'){setTimeout(xn8dHook,300);return;}const _c=netCast;netCast=function(){const r=_c.apply(this,arguments);xn8dTick();return r;};},0);}
{const _x=netClientRxExtra;netClientRxExtra=function(m){if(m&&m.t==='xnseat'){XN8D.rx++;if(m.m)XN8D.tab[m.bid]={m:m.m,t:performance.now()};else delete XN8D.tab[m.bid];return;}return _x.apply(this,arguments);};}
// 延後包（net11 的 #169 預約包裝在 g23 之後才載入，且有 netSeats 時不呼叫下層 → 要包在它外面，成員端才會真的採用房主的表）
setTimeout(()=>{const _vs=v169Seats;v169Seats=function(b){if(typeof NET==='undefined'||NET.role!=='client'||!b)return _vs.apply(this,arguments);const T=XN8D.tab[b.id];if(!T)return _vs.apply(this,arguments);
  const loc=_vs.apply(this,arguments),map=new Map(),C=XN8D.stick||(XN8D.stick={});
  for(const id in T.m){const v=T.m[id],r=[v[0],v[1]];r.kind=v[2]===2?'throne':v[2]===1?'slot':'floor';map.set(+id,r);}
  // 房主還沒排到的（剛進來的弟子／自己剛坐下）：沿用上一次給它的位子，沒有才用本機結果；不跟房主表的位子重疊
  const used=[...map.values()];for(const [id,r] of loc){if(map.has(id))continue;let q=C[b.id+':'+id];const clash=s=>used.some(u=>Math.hypot(u[0]-s[0],u[1]-s[1])<0.35);if(!q||clash(q)){q=r;if(clash(q))continue;}C[b.id+':'+id]=q;map.set(id,q);used.push(q);}
  return map;};},0);
// 成員端顯示平滑：每個單位的顯示座標往目標以指數插值靠近（約 0.15 秒），一次跳超過 1.5 格才直接到位並記一次 jump
{const _ip=interiorPeople;interiorPeople=function(b){const out=_ip.apply(this,arguments);if(typeof NET==='undefined'||NET.role!=='client')return out;try{const now=performance.now();
  for(const o of out){const k=b.id+':'+o.u.id;const d=XN8D.disp[k];if(!d||now-d.t>1500){XN8D.disp[k]={x:o.x,y:o.y,t:now};continue;}const dt=Math.min(0.1,(now-d.t)/1000),a=1-Math.exp(-dt/0.15);
    const dist=Math.hypot(o.x-d.x,o.y-d.y);if(dist>1.5){XN8D.jumps++;d.x=o.x;d.y=o.y;}else{d.x+=(o.x-d.x)*a;d.y+=(o.y-d.y)*a;}d.t=now;if(!o.player){o.x=d.x;o.y=d.y;}}}catch(e){}return out;};}
setTimeout(function xn8dApi(){if(!window.XW||!XW.xn){setTimeout(xn8dApi,100);return;}XW.xn.seat8={st:()=>({rx:XN8D.rx,tx:XN8D.tx,jumps:XN8D.jumps,tabs:Object.keys(XN8D.tab)}),tab:b=>XN8D.tab[b]&&XN8D.tab[b].m,pack:b=>xn8dPack(bById(+b)),last:b=>XN8D.last[b]};},0);

// ======================= v0.4.9 Fix8(c2)：室內名牌互相重疊、名牌壓到大殿匾額（「貳品・精進」） =======================
// 室內繪製期間把 label() 先排隊，最後統一擺放：同一人連續畫的幾行（名字／境界）視為一組一起移動；
// 由下往上逐一放置，碰到已放好的名牌或匾額就往上讓（最多 3 行高），名牌一律畫在最上層。
const XNL={on:0,q:[],obs:[],moved:0,n:0};
{const _l=label;label=function(txt,x,y,col,font){if(XNL.on){const m=ctx.getTransform();XNL.q.push({txt:String(txt),x,y,col,font,m});return;}return _l.apply(this,arguments);};
 XNL.raw=_l;}
{const _dp=drawPlaque;drawPlaque=function(p,lv){_dp.apply(this,arguments);try{if(XNL.on){const m=ctx.getTransform();XNL.obs.push(xnlRect(m,p.x-24,p.y-64,p.x+24,p.y-44));}}catch(e){}};}
function xnlRect(m,x0,y0,x1,y1){return {x0:m.a*x0+m.e,y0:m.d*y0+m.f,x1:m.a*x1+m.e,y1:m.d*y1+m.f};}
function xnlFlush(){const Q=XNL.q;XNL.q=[];if(!Q.length)return;ctx.save();
  // 分組：連續、x 幾乎相同、y 相差 < 22 → 同一人
  const G=[];for(const L of Q){ctx.font=L.font||'bold 10px sans-serif';const w=ctx.measureText(L.txt).width,hgt=parseFloat((L.font||'10px').match(/(\d+)px/)?.[1]||10)+2;
    const r=xnlRect(L.m,L.x-w/2-2,L.y-hgt+2,L.x+w/2+2,L.y+3);L.r=r;const g=G[G.length-1];if(g&&Math.abs(g.ls[0].x-L.x)<1&&Math.abs(g.ls[g.ls.length-1].y-L.y)<22&&g.ls[0].m.e===L.m.e)g.ls.push(L);else G.push({ls:[L]});}
  for(const g of G){g.x0=Math.min(...g.ls.map(l=>l.r.x0));g.x1=Math.max(...g.ls.map(l=>l.r.x1));g.y0=Math.min(...g.ls.map(l=>l.r.y0));g.y1=Math.max(...g.ls.map(l=>l.r.y1));g.dy=0;}
  G.sort((a,c)=>c.y1-a.y1);const placed=XNL.obs.slice();const hit=(g,dy)=>placed.find(o=>g.x0<o.x1&&g.x1>o.x0&&g.y0+dy<o.y1&&g.y1+dy>o.y0);
  for(const g of G){let dy=0,k=0,o;const H_=g.y1-g.y0;while((o=hit(g,dy))&&k<8){dy=o.y0-g.y1-1;k++;if(-dy>H_*3+6)break;}
    if(hit(g,dy)){// 往上讓不開 → 試往下
      let d2=0,k2=0;while((o=hit(g,d2))&&k2<8){d2=o.y1-g.y0+1;k2++;}if(!hit(g,d2)&&d2<H_*2)dy=d2;else dy=0;}
    g.dy=dy;if(dy)XNL.moved++;placed.push({x0:g.x0,x1:g.x1,y0:g.y0+dy,y1:g.y1+dy});}
  for(const g of G)for(const L of g.ls){ctx.setTransform(L.m);const sy=L.m.d||1;XNL.raw(L.txt,L.x,L.y+g.dy/sy,L.col,L.font);XNL.n++;}
  XNL.last=G.map(g=>({t:g.ls.map(l=>l.txt).join('|'),r:[g.x0,g.y0+g.dy,g.x1,g.y1+g.dy].map(Math.round)}));XNL.lastObs=XNL.obs.map(o=>[o.x0,o.y0,o.x1,o.y1].map(Math.round));ctx.restore();}
{const _di=drawInterior;drawInterior=function(){XNL.on=1;XNL.q=[];XNL.obs=[];try{return _di.apply(this,arguments);}finally{XNL.on=0;try{xnlFlush();}catch(e){XNL.q=[];}}};}
setTimeout(function xnlApi(){if(!window.XW||!XW.xn){setTimeout(xnlApi,100);return;}XW.xn.lbl=()=>({moved:XNL.moved,n:XNL.n,last:XNL.last||[],obs:XNL.lastObs||[]});},0);

// ======================= v0.4.9 Fix14：聯機成員「招攬入門」後新弟子消失 =======================
// 原因：成員端（右鍵／環形選單／其他入口）直接在本機執行 wooWanderer → 本機新增弟子、扣本機食物；房主沒有這名弟子 → 下一個快照把它清掉。
// 修：成員端的 wooWanderer／giftWanderer 一律改成送意圖給房主（房主建立弟子、扣資源、同步回來，存檔在房主）；
//     房主代成員招攬時不改房主自己的選取。
{const _w=wooWanderer;wooWanderer=function(w){if(typeof NET!=='undefined'&&NET.role==='client'){if(!w)return false;return xnWandAct('woo',w);}
  const keep=(typeof NET!=='undefined'&&NET.role==='host'&&XN14.asM)?{s:selUnits.slice(),o:selOther}:null;const r=_w.apply(this,arguments);
  if(keep){selUnits=keep.s;selOther=keep.o;panelKeyCache=null;}if(r)XN14.n++;return r;};}
{const _g=giftWanderer;giftWanderer=function(w){if(typeof NET!=='undefined'&&NET.role==='client'){if(!w)return false;return xnWandAct('gift',w);}return _g.apply(this,arguments);};}
const XN14={asM:0,n:0};
if(typeof netApplyIntent0==='function'){const _x=netApplyIntent0;netApplyIntent0=function(pk,i){if(i&&i.a==='xnwand'){XN14.asM++;try{return _x.apply(this,arguments);}finally{XN14.asM--;}}return _x.apply(this,arguments);};}
setTimeout(function xn14Api(){if(!window.XW||!XW.xn){setTimeout(xn14Api,100);return;}XW.xn.woo={trade:(v,k)=>doTrade(v,k),gift:id=>{const w=S.wand.find(o=>o.id===+id);return w?xnWandAct("gift",w):false;},pend:()=>({p:Object.keys(XN14P.p).length,tr:!!XN14P.tr,sent:XN14P.sent,ok:XN14P.ok,to:XN14P.to}),n:()=>XN14.n,woo:id=>{const w=S.wand.find(o=>o.id===id);return wooWanderer(w);}};},0);
// ===== v0.4.9 動作稽核：採集／戰鬥動作補齊（弟子職務採集沒有 task，舊判斷只看 task.type → 不揮工具；徒手攻擊沒有出拳；敵人受擊沒有反應；成員端缺 working／jnode）=====
function xnGatherRes(u){if(!u||!u.working)return null;const t=u.task;
  if(t){if(t.type!=='gather')return null;const n=nodeById(t.nodeId);return n?NODE_RES[n.type]:'wood';}
  if(u.job==='gather'||u.netGat){const n=u.jnode!=null?nodeById(u.jnode):(u.netGat?nodeById(u.netGat):null);return n?NODE_RES[n.type]:(u.jobRes||'wood');}
  return null;}
function xnBuilding(u){if(!u||!u.working)return false;const t=u.task;if(t)return t.type==='build'||t.type==='repair';return u.job==='builder';}
const XNA={hits:0,cl:0};
{const _de=dmgEnemy;dmgEnemy=function(src,e,amt){if(e&&!e.dead){e.hitT=performance.now();XNA.hits++;}return _de.apply(this,arguments);};}
function xnaHurtCli(e){if(typeof NET==='undefined'||NET.role!=='client'||!e)return;if(e._xhp!=null&&e.hp<e._xhp-0.5){e.hitT=performance.now();XNA.cl++;}e._xhp=e.hp;}
function xnaHurtDraw(e,fn){const now=performance.now();xnaHurtCli(e);if(!(e&&e.hitT&&now-e.hitT<220))return fn(e);
  const k=1-(now-e.hitT)/220,b=P(e.x,e.y),f=e.face||1;ctx.save();ctx.translate(-f*3*k,0);try{fn(e);}finally{ctx.restore();}
  ctx.save();ctx.globalAlpha=0.4*k;ellipse(b.x-f*3*k,b.y-10,11,12,'#ff3030');ctx.restore();}
{const _d=drawBandit;drawBandit=function(e){return xnaHurtDraw(e,_d);};}
{const _d=drawBeast;drawBeast=function(e){if(e&&ENEMY[e.type]&&ENEMY[e.type].human)return _d(e);return xnaHurtDraw(e,_d);};}
// 成員端：弟子受擊（hp 下降）也觸發後仰
{const _d=drawHuman;drawHuman=function(u){if(u&&typeof NET!=='undefined'&&NET.role==='client'&&u.kind!=='player'){if(u._xhp!=null&&u.hp<u._xhp-0.5){u.hitT=performance.now();XNA.cl++;}u._xhp=u.hp;}return _d.apply(this,arguments);};}
setTimeout(function xnaReg(){let ok=false;try{ok=Array.isArray(NET_LIVE_U);}catch(e){}if(!ok||!window.XW||!XW.xn){setTimeout(xnaReg,300);return;}for(const k of ['working','jnode'])if(!NET_LIVE_U.includes(k))NET_LIVE_U.push(k);
  XW.xn.anim={st:()=>({hits:XNA.hits,cl:XNA.cl}),gres:u=>xnGatherRes(u)};},0);
// ===== v0.4.9 採集弟子回防：敵人靠近宗門／本人，或正在攻擊建築／同門 → 能戰者放下採集迎戰、打完回去採集；重傷（<40%）者逃往大殿（主機權威，成員畫面同步）=====
const XND={fight:0,flee:0,resume:0,R:{self:7,sect:14,ally:14,max:18},hurt:0.4};
function xndThreat(u){const H=nearestHall(u),hc=H?{x:H.i+1.5,y:H.j+1.5}:null;let best=null,bd=XND.R.max;
  for(const e of S.enemies){if(e.dead||e.hp<=0)continue;const d=dist(u.x,u.y,e.x,e.y);if(d>=bd)continue;
    const hostile=e.type!=='militia'||!!e.target||!!e.raid;if(!hostile)continue;let ok=d<XND.R.self;
    if(!ok&&hc&&dist(hc.x,hc.y,e.x,e.y)<XND.R.sect&&(e.raid||e.target))ok=true;
    if(!ok&&e.target){if(e.target.k==='b'){const b=bById(e.target.id);if(b&&(!hc||distRect(e.x,e.y,b.i,b.j,BUILD[b.type].size)<XND.R.sect+4))ok=true;}
      else{const a=unitById(e.target.id);if(a&&a!==u&&dist(a.x,a.y,u.x,u.y)<XND.R.ally)ok=true;}}
    if(ok){bd=d;best=e;}}return best;}
{const _ud=updateDisciple;updateDisciple=function(u,dt){
  if(u&&!u.dead&&!u.inside&&!u.y47dn&&!u.y47dj&&!u.y47e&&(u.job==='gather'||u.job==='builder')&&!(typeof v49Client==='function'&&v49Client())){
    const t=u.task,D=u.xnd;
    // t1074u：玩家手動攻擊／強制命令中，整段 XND（含清 task／逃往大殿）都跳過
    if((t&&t.man)||(u.xcmd&&S.time<u.xcmd.until)||(typeof xmvOn==='function'&&xmvOn(u))||(typeof xPlayerOrder==='function'&&xPlayerOrder(u))){
      if(D&&D.st==='flee')u.xnd=null;
      return _ud.apply(this,arguments);
    }
    if(D){const e=S.enemies.find(x=>x.id===D.eid&&!x.dead&&x.hp>0);
      if(D.st==='fight'){if(!e||!(t&&t.type==='attack')||dist(u.x,u.y,e.x,e.y)>XND.R.max+4){u.xnd=null;if(t&&t.type==='attack'&&!t.man){u.task=null;u.path=[];}XND.resume++;}
        else if(u.hp<u.maxhp*XND.hurt*0.6&&!(t&&t.man)){u.xnd=null;u.task=null;}}
      else if(D.st==='flee'){if(!e||dist(u.x,u.y,e.x,e.y)>12||S.time-D.t0>8){u.xnd=null;if(t&&t.type==='move')u.task=null;u.path=[];XND.resume++;}}}
    const hurtAtk=!u.xnd&&t&&t.type==='attack'&&!t.man&&u.hp<u.maxhp*XND.hurt;
    if(!u.xnd&&(hurtAtk||!t||t.type==='gather'||t.type==='build'||t.type==='repair')&&(hurtAtk||!u.xndT||S.time>u.xndT)){u.xndT=S.time+0.4;const e=hurtAtk?(S.enemies.find(x=>x.id===t.eid)||xndThreat(u)):xndThreat(u);
      if(e){if(u.hp>=u.maxhp*XND.hurt&&(u.atk||0)>0){u.xnd={st:'fight',eid:e.id,t0:S.time};u.prevTask=null;u.task={type:'attack',eid:e.id};u.path=[];u.medit=false;u.working=false;XND.fight++;}
        else{const H=nearestHall(u);let tx,ty;if(H&&dist(H.i+1.5,H.j+1.5,e.x,e.y)>4){const P=doorPt(H);tx=P.x;ty=P.y;}else{const a=Math.atan2(u.y-e.y,u.x-e.x);tx=u.x+Math.cos(a)*7;ty=u.y+Math.sin(a)*7;}
          u.xnd={st:'flee',eid:e.id,t0:S.time};setTask(u,{type:'move',x:tx,y:ty});if(!pathTo(u,tx,ty))u.path=[{x:tx,y:ty}];u.working=false;XND.flee++;if(!u.xndTo||S.time-u.xndTo>20){u.xndTo=S.time;floater(u.x,u.y-0.4,'撤退！','#ffd080');}}}}}
  return _ud.apply(this,arguments);};}
setTimeout(function xndReg(){if(!window.XW||!XW.xn){setTimeout(xndReg,300);return;}XW.xn.def={st:()=>({fight:XND.fight,flee:XND.flee,resume:XND.resume}),cfg:XND};},0);
// ===== v0.4.9 成員建築指令改走房主權威：施工／修繕／拆除／右鍵指派（build、repair、astruct、interact）原本只在成員本機 setTask，房主不知道，下一個快照就被蓋掉 =====
// 房主端自動處理（不跳確認），用共用宗門資源，失敗時把原因回給成員；升級改以成員身分執行，不再拉房主自己的選取／角色去施工。
const XNB={tx:0,ok:0,no:0};
{const _st=setTask;setTask=function(u,t){if(typeof NET!=='undefined'&&NET.role==='client'&&u&&t&&['build','repair','astruct','interact'].includes(t.type)&&netCanCtl(u,NET.pkey)){
    netIntent({a:'xntask',id:u.id,t:{type:t.type,bid:t.bid,sid:t.sid}});XNB.tx++;return;}return _st.apply(this,arguments);};}
{const _r=repairOrder;repairOrder=function(b){if(typeof NET!=='undefined'&&NET.role==='client'){if(!b)return;netIntent({a:'xnb',k:'repair',bid:b.id});XNB.tx++;toast(`已請房主安排修繕「${bName(b)}」…`);return;}return _r.apply(this,arguments);};}
{const _d=demolish;demolish=function(b){if(typeof NET!=='undefined'&&NET.role==='client'){if(!b)return false;netIntent({a:'xnb',k:'demo',bid:b.id});XNB.tx++;toast(`已請房主拆除「${bName(b)}」…`);return true;}return _d.apply(this,arguments);};}
function xnbNo(why){XNB.no++;toast(why);return false;}
if(typeof netApplyIntent0==='function'){const _x=netApplyIntent0;netApplyIntent0=function(pk,i){if(!i||!['upg','xntask','xnb'].includes(i.a))return _x.apply(this,arguments);
  const a=netAvatarOf(pk);if(!a)return false;const nm=a.name||'成員';
  const asM=fn=>netAsMember(a,()=>{const s=selUnits;selUnits=[];try{return fn();}finally{selUnits=s;}});
  if(i.a==='upg'){const b=bById(+i.bid);if(!b)return xnbNo('找不到這座建築（可能已被拆除）');const lv=blv(b);const r=asM(()=>NET._upg(b));if(r){XNB.ok++;xn14HostNote(`${nm} 開始升級「${bName(b)}」到 Lv${lv+1}`);}else XNB.no++;return r;}
  if(i.a==='xnb'){const b=bById(+i.bid);if(!b)return xnbNo('找不到這座建築（可能已被拆除）');
    if(i.k==='repair'){if(b.hp>=b.maxhp)return xnbNo(`「${bName(b)}」不需要修繕`);asM(()=>repairOrder(b));XNB.ok++;xn14HostNote(`${nm} 安排修繕「${bName(b)}」`);return true;}
    if(i.k==='demo'){const n=bName(b);const r=asM(()=>demolish(b));if(r!==false){XNB.ok++;xn14HostNote(`${nm} 拆除了「${n}」`);}else XNB.no++;return r!==false;}return false;}
  const u=unitById(+i.id),t=i.t||{};if(!u||u.dead||!netCanCtl(u,pk))return xnbNo('不能指揮這個角色');
  if(t.type==='build'||t.type==='repair'){const b=bById(+t.bid);if(!b)return xnbNo('找不到這座建築（可能已被拆除）');
    if(t.type==='build'&&b.built&&!b.upg)return xnbNo(`「${bName(b)}」已經蓋好了，沒有在升級，不需要施工`);
    if(t.type==='repair'&&b.hp>=b.maxhp)return xnbNo(`「${bName(b)}」不需要修繕`);
    asM(()=>setTask(u,{type:t.type,bid:b.id}));XNB.ok++;return true;}
  if(t.type==='astruct'||t.type==='interact'){if(t.sid==null)return false;asM(()=>setTask(u,{type:t.type,sid:+t.sid}));XNB.ok++;return true;}
  return false;};}
setTimeout(function xnbReg(){if(!window.XW||!XW.xn){setTimeout(xnbReg,300);return;}XW.xn.bcmd={st:()=>Object.assign({},XNB),task:(id,t)=>{const u=unitById(id);return u?setTask(u,t):null;},repair:id=>repairOrder(bById(id)),demo:id=>demolish(bById(id))};},0);
// ===== v0.4.9 尋路：大門走不到時改找大門附近（再不行就建築外圍）可到達的格子；卡住（樹角、建築角）時先退回格子中心再重新尋路 =====
const XNP={alt:0,unstick:0,repath:0};
function xnpAlt(u,b){const D=doorPt(b),c=unitComp(u),s=BUILD[b.type].size,C=[];
  for(let r=1;r<=3;r++)for(let dj=-r;dj<=r;dj++)for(let di=-r;di<=r;di++){if(Math.max(Math.abs(di),Math.abs(dj))!==r)continue;const i=Math.floor(D.x)+di,j=Math.floor(D.y)+dj;if(!inMap(i,j)||block[j*N+i]||comp[j*N+i]!==c)continue;C.push({x:i+0.5,y:j+0.5,d:dist(i+0.5,j+0.5,D.x,D.y)});}
  for(let i=b.i-1;i<=b.i+s;i++)for(let j=b.j-1;j<=b.j+s;j++){if(i>=b.i&&i<b.i+s&&j>=b.j&&j<b.j+s)continue;if(!inMap(i,j)||block[j*N+i]||comp[j*N+i]!==c)continue;C.push({x:i+0.5,y:j+0.5,d:4+dist(i+0.5,j+0.5,D.x,D.y)});}
  C.sort((a,b2)=>a.d-b2.d);for(const p of C.slice(0,12))if(pathTo(u,p.x,p.y)){XNP.alt++;return true;}return false;}
{const _e=enterStep;enterStep=function(u,dt,t){const b=t&&bById(t.bid);
  if(b&&canEnter(b)&&(!u.path||!u.path.length||u.needRepath)){const D=doorPt(b);const d=dist(u.x,u.y,D.x,D.y);
    if(d>=1.8&&(blockedP(D.x,D.y)||!pathTo(u,D.x,D.y))){if(xnpAlt(u,b)){u.needRepath=false;u.repath=3;}}}
  return _e.apply(this,arguments);};}
{const _f=followPath;followPath=function(o,dt,sp){if(o&&(!o.path||!o.path.length))o.xnUs=0;if(o&&o.stuck>=3&&o.path&&o.path.length&&(o.xnUs||0)<2){o.xnUs=(o.xnUs||0)+1;const i=Math.floor(o.x),j=Math.floor(o.y),cx=i+0.5,cy=j+0.5;
    if(inMap(i,j)&&!block[j*N+i]&&dist(o.x,o.y,cx,cy)>0.15){o.path.unshift({x:cx,y:cy});XNP.unstick++;}
    else{const last=o.path[o.path.length-1];if(last&&pathTo(o,last.x,last.y))XNP.repath++;}o.stuck=0;o.needRepath=false;}
  return _f.apply(this,arguments);};}
setTimeout(function xnpReg(){if(!window.XW||!XW.xn){setTimeout(xnpReg,300);return;}XW.xn.path={st:()=>Object.assign({},XNP)};},0);
// ===== v0.4.9 山賊 ↔ 村衛 互為敵對：村衛迎擊靠近自己（或村莊）的山賊；山賊會反擊村衛，掠過村莊時也會砍村民；村衛有耐久，會倒下；村衛出槍有動作 =====
const XNF={g2b:0,b2n:0,down:0,R:{guard:6,bandit:3.5,vill:2.5,villR:9}};
function xnfBandit(e){return e&&!e.dead&&(e.type==='bandit'||e.type==='chief');}
function xnfInit(n){if(n.maxhp==null){n.maxhp=n.guard?60+30*(n.realm||0):25;n.hp=n.maxhp;}}
{const _f=v60Find;v60Find=function(n,v){const a=_f.apply(this,arguments);let best=a,bd=a?dist(n.x,n.y,a.x,a.y):1e9;
  for(const e of S.enemies){if(!xnfBandit(e)||e.hp<=0)continue;const d=dist(n.x,n.y,e.x,e.y);if(d<XNF.R.guard&&d<bd&&dist(e.x,e.y,v.x,v.y)<TUNE.v60.leash&&compAt(e.x,e.y)===unitComp(n)){bd=d;best=e;}}
  if(best&&best!==a)XNF.g2b++;return best;};}
{const _uv=updateVillager;updateVillager=function(n,dt,ct){if(n){if(n.anim>0)n.anim=Math.max(0,n.anim-dt);if(n.xnDown)return;}return _uv.apply(this,arguments);};}
function xnfHitNpc(e,n){xnfInit(n);const amt=e.atk*(0.8+rnd()*0.4);n.hp-=amt;n.hitT=performance.now();floater(n.x,n.y,'-'+Math.round(amt),'#ffb0a0');XNF.b2n++;
  if(n.hp<=0){n.xnDown=1;const i=S.npcs.indexOf(n);if(i>=0)S.npcs.splice(i,1);XNF.down++;floater(n.x,n.y-0.4,n.guard?'村衛倒下':'村民遇害','#ff8080');}}
{const _ue=updateEnemy;updateEnemy=function(e,dt,ct){
  if(xnfBandit(e)&&!e.flee&&!S.dg&&!(typeof v49Client==='function'&&v49Client())){
    const ut=e.target&&e.target.k==='u'?unitById(e.target.id):null;
    if(!(ut&&!ut.dead&&dist(e.x,e.y,ut.x,ut.y)<6)){
      let n=e.xnN!=null?S.npcs.find(o=>o.id===e.xnN):null;if(n&&(n.xnDown||dist(e.x,e.y,n.x,n.y)>8))n=null;
      if(!n){let bd=1e9;for(const o of S.npcs){if(o.xnDown)continue;const d=dist(e.x,e.y,o.x,o.y);
          // 先排除不可能被選中的遠距／非最近候選，再做原本的純村莊查找。
          if(d>=bd||!(o.guard?(d<XNF.R.bandit||(o.gT===e.id&&d<5)):d<XNF.R.vill))continue;
          const v=vById(o.vid);if(!v||v.type==='bandit')continue;
          const ok=o.guard?(d<XNF.R.bandit||(o.gT===e.id&&d<5)):(d<XNF.R.vill&&dist(e.x,e.y,v.x,v.y)<XNF.R.villR);if(ok&&d<bd){bd=d;n=o;}}}
      if(n){e.xnN=n.id;e.cd-=dt;e.slowT-=dt;e.repath-=dt;e.anim=Math.max(0,e.anim-dt);if(e.stun>0){e.stun-=dt;e.dvx=e.dvy=0;moveEntity(e,dt);return;}
        if(chase(e,dt,n.x,n.y,(e.r||0.27)+(n.r||0.25)+0.45,1)){faceTo(e,n.x,n.y);if(e.cd<=0){xnfHitNpc(e,n);e.cd=1.3;e.anim=0.25;}}moveEntity(e,dt);return;}
      e.xnN=null;}}
  return _ue.apply(this,arguments);};}
{const _d=drawVillager;drawVillager=function(n){const now=performance.now();if(!(n&&n.hitT&&now-n.hitT<220))return _d(n);const k=1-(now-n.hitT)/220,b=P(n.x,n.y),f=n.face||1;
  ctx.save();ctx.translate(-f*3*k,0);try{_d(n);}finally{ctx.restore();}ctx.save();ctx.globalAlpha=0.4*k;ellipse(b.x-f*3*k,b.y-10,9,11,'#ff3030');ctx.restore();};}
setTimeout(function xnfReg(){if(!window.XW||!XW.xn){setTimeout(xnfReg,300);return;}XW.xn.fac={st:()=>({g2b:XNF.g2b,b2n:XNF.b2n,down:XNF.down,v60:V60.hits})};},0);
// ===== v0.4.9 點擊／點觸：左鍵／短點敵人＝只開觀察面板；右鍵／長按＝鎖定並自動追擊攻擊；加大命中半徑；沒選取時點空地＝移動自己 =====
const XNC={atk:0,str:0,mv:0,miss:0};
{const _ea=enemyAt;enemyAt=function(w){const r=_ea.apply(this,arguments);if(r)return r;const R=Math.max(isTouchUI?36:28,(isTouchUI?56:42)/Math.max(0.3,cam.zoom));let best=null,bd=R;
  for(const e of S.enemies){if(e.dead||!isExplored(e.x,e.y))continue;const p=iso(e.x,e.y),off=e.type==='king'?24:10;const d=Math.min(dist(w.x,w.y,p.x,p.y-off),dist(w.x,w.y,p.x,p.y-off*2),dist(w.x,w.y,p.x,p.y));if(d<bd){bd=d;best=e;}}return best;};}
function xncHostileS(s){if(!s||s.dead||!s.maxhp)return false;const v=vById(s.vid);return !!(v&&v.type==='bandit');}
function xncCmd(x,y){if(S.interior||buildMode||S.dg)return false;const w=screenToWorld(x,y),e=enemyAt(w),u=unitAt(w,S.units,14);
  if(e){const pe=iso(e.x,e.y),de=dist(w.x,w.y,pe.x,pe.y-10);let du=1e9;if(u){const pu=iso(u.x,u.y);du=dist(w.x,w.y,pu.x,pu.y-14);}
    // 點偏一點仍優先鎖敵（單位需明顯更近才改選單位）
    if(!u||de<=du+12){const us=commandUnits();if(!us.length)return false;us.forEach(v=>setTask(v,{type:'attack',eid:e.id,man:1}));markers.push({x:e.x,y:e.y,t:0,col:'#ff5050'});XNC.atk++;return true;}}
  if(!u){const s=structAt(w);if(xncHostileS(s)){const us=commandUnits();if(!us.length)return false;us.forEach(v=>setTask(v,{type:'astruct',sid:s.id}));markers.push({x:s.i+s.s/2,y:s.j+s.s/2,t:0,col:'#ff5050'});XNC.str++;return true;}}
  return false;}
// 短點不攻擊（觀察由 tapAt／leftClick 處理）；無選取時點空地仍可移動自己
{const _t=tapAt;tapAt=function(x,y){try{
    if(!S.interior&&!buildMode&&!S.dg&&!selUnits.map(unitById).filter(v=>v&&!v.dead).length){const w=screenToWorld(x,y);
      if(!enemyAt(w)&&!unitAt(w,S.units,14)&&!buildingAt(w)&&!wandAt(w)&&!nodeAt(w)&&!structAt(w)&&!shrineAtScreen(x,y)){const p=player();if(p&&!p.dead){selOther=null;selBuilding=null;rightClick(x,y,false);XNC.mv++;return;}}}}catch(err){console.warn('xnc',err);}
  return _t.apply(this,arguments);};}
// 左鍵不再下達攻擊（只觀察）；右鍵鎖敵攻擊
{const _r=rightClick;rightClick=function(x,y,sh){try{if(!S.interior&&!buildMode&&!S.dg){const w=screenToWorld(x,y);if((enemyAt(w)||structAt(w))&&xncCmd(x,y))return;}}catch(err){console.warn('xnc',err);}return _r.apply(this,arguments);};}
// ===== v0.4.9 山寨建物耐久同步：主機每 0.4 秒把變動的 vstruct hp／倒塌 廣播給成員（成員攻擊走主機權威 astruct） =====
const XNVS={last:new Map(),t:0,full:0,sent:0,rx:0};
if(typeof netHostTick==='function'){const _x=netHostTick;netHostTick=function(){const r=_x.apply(this,arguments);try{if(NET.role==='host'&&NET.tr&&S&&S.vstructs){const now=performance.now();if(now-XNVS.t>400){XNVS.t=now;const full=now-XNVS.full>3000;if(full)XNVS.full=now;const l=[];
    for(const s of S.vstructs){if(!s.maxhp)continue;const hp=Math.round(s.hp),k=hp+(s.dead?'d':'');if(XNVS.last.get(s.id)!==k||(full&&(s.dead||hp<s.maxhp))){XNVS.last.set(s.id,k);l.push([s.id,hp,s.dead?1:0]);}}
    if(l.length){NET.tr.broadcast({t:'xvs',l});XNVS.sent+=l.length;}}}}catch(err){console.warn('xvs',err);}return r;};}
if(typeof netClientRxExtra==='function'){const _x=netClientRxExtra;netClientRxExtra=function(m){if(m&&m.t==='xvs'){try{let reb=false;for(const [id,hp,dd] of m.l||[]){const s=sById(id);if(!s)continue;XNVS.rx++;
    if(hp<s.hp)s.hitT=performance.now();if(hp<s.hp&&!S.dg&&!S.interior)floater(s.i+s.s/2,s.j+s.s/2,'-'+Math.round(s.hp-hp),'#ffd0a0');s.hp=hp;if(dd&&!s.dead){s.dead=true;s.hp=0;reb=true;chunkDirtyAt(s.i,s.j);}}if(reb)rebuildBlock();}catch(err){console.warn('xvs',err);}return;}return _x.apply(this,arguments);};}
setTimeout(function xncReg(){if(!window.XW||!XW.xn){setTimeout(xncReg,300);return;}XW.xn.clk={st:()=>Object.assign({},XNC),vs:()=>({sent:XNVS.sent,rx:XNVS.rx})};},0);
// ===== v0.4.9 石碑診斷 API =====
setTimeout(function xnShrReg(){if(!window.XW||!XW.xn){setTimeout(xnShrReg,300);return;}XW.xn.nf=(x,y)=>nearestFree(x,y,-1);XW.xn.shrDbg=(id)=>{const s=shrineById(id),p=player();const c=unitComp(p),o=[];for(let dj=-2;dj<=2;dj++)for(let di=-2;di<=2;di++){const i=Math.floor(s.x)+di,j=Math.floor(s.y)+dj;o.push(block[j*N+i]?"#":String(comp[j*N+i]));}return {pc:c,p:[p.x,p.y],grid:o.join(""),path:pathTo(p,s.x+1.5,s.y+0.5),pl:p.path.length};};XW.xn.blk=(i,j)=>!!block[j*N+i];XW.xn.shrAt=(x,y)=>{const s=shrineAtScreen(x,y);return s?s.id:null;};XW.xn.shr={diag:()=>shrines().map(s=>{const i=Math.floor(s.x),j=Math.floor(s.y);const f=nearestFree(s.x+1,s.y+1,startComp);const bv=S.villages.filter(v=>v.type==='bandit').map(v=>({n:v.name,d:+dist(v.x,v.y,s.x,s.y).toFixed(1),des:!!v.destroyed}));bv.sort((a,b)=>a.d-b.d);
  return {id:s.id,n:s.name,x:+s.x.toFixed(1),y:+s.y.toFixed(1),blk:!!block[j*N+i],comp:comp[j*N+i],start:startComp,cAround:[[1,0],[0,1],[-1,0],[0,-1],[1,1]].map(([a,b])=>comp[(j+b)*N+i+a]),nf:f?[f.i,f.j,+dist(f.i+0.5,f.j+0.5,s.x,s.y).toFixed(1)]:null,bandit:bv[0]};})};},0);
// ===== v0.4.9 石碑點擊：原本右鍵石碑只在「已選取自己角色」時才有效（剛點過建築／成員沒選取化身時會落到地面移動，走到旁邊也不開）；左鍵石碑完全沒反應。改成：沒有選取或選取含自己角色時，左右鍵／點觸石碑都走過去打開 =====
const XNSH={go:0};
function xnShrClick(x,y){if(S.interior||buildMode||S.dg)return false;const sh=shrineAtScreen(x,y);if(!sh)return false;const p=player();if(!p||p.dead)return false;
  const sel=selUnits.map(unitById).filter(v=>v&&!v.dead);if(sel.length&&!sel.includes(p))return false;if(enemyAt(screenToWorld(x,y))&&!unitAt(screenToWorld(x,y),S.units,14)){const e=enemyAt(screenToWorld(x,y)),q=iso(e.x,e.y),w=screenToWorld(x,y);if(dist(w.x,w.y,q.x,q.y-10)<14)return false;}
  goShrine(sh);XNSH.go++;return true;}
{const _r=rightClick;rightClick=function(x,y,sh){try{if(xnShrClick(x,y))return;}catch(err){console.warn('xnsh',err);}return _r.apply(this,arguments);};}
{const _l=leftClick;leftClick=function(x,y,sh){try{if(!sh&&!unitAt(screenToWorld(x,y),S.units,14)&&xnShrClick(x,y))return;}catch(err){console.warn('xnsh',err);}return _l.apply(this,arguments);};}
{const _t=tapAt;tapAt=function(x,y){try{if(!unitAt(screenToWorld(x,y),S.units,14)&&xnShrClick(x,y))return;}catch(err){console.warn('xnsh',err);}return _t.apply(this,arguments);};}
// 石碑旁常是樹林／岩壁：原本走向石碑右下 (x+0.6,y+0.6)，那格擋住時 nearestFree 會挑到 2.2 格外的地方 → 走到了也打不開（蒼嶺、幽林等）。改走「石碑 1.8 格內、同一連通區、離自己最近」的空格
{const _g=goShrine;goShrine=function(s){const p=player();if(!s||!p||p.dead||dist(p.x,p.y,s.x,s.y)<2.2)return _g.apply(this,arguments);try{const c=unitComp(p),cand=[];
  for(let dj=-2;dj<=2;dj++)for(let di=-2;di<=2;di++){const i=Math.floor(s.x)+di,j=Math.floor(s.y)+dj;if(!inMap(i,j)||block[j*N+i]||comp[j*N+i]!==c)continue;const d=dist(i+0.5,j+0.5,s.x,s.y);if(d>1.9)continue;cand.push({x:i+0.5,y:j+0.5,d:dist(i+0.5,j+0.5,p.x,p.y)});}
  cand.sort((a,b)=>a.d-b.d);if(cand.length){selUnits=[p.id];commandMove([p],cand[0].x,cand[0].y,false);p.shrineGoal=s.id;XNSH.go++;return;}}catch(err){console.warn('xnsh',err);}return _g.apply(this,arguments);};}
// ===== v0.4.9 山寨木柵可摧毀：給耐久（舊存檔／舊世界也補上），被打會晃、變矮、裂開，倒下後不再擋路（rebuildBlock 只算未倒的）；成員攻擊走主機 astruct，耐久／倒下由 xvs 同步、存檔沿用 vstruct.hp／dead =====
VS.stake.hp=VS.stake.hp||120;
function xnStakeFix(){if(!S||!S.vstructs)return;for(const s of S.vstructs)if(s.type==='stake'&&!s.maxhp){s.maxhp=VS.stake.hp;if(!s.dead)s.hp=s.maxhp;}}
setInterval(()=>{try{xnStakeFix();}catch(e){}},1000);
{const _d=dmgStruct;dmgStruct=function(src,s,amt){if(s&&s.type==='stake')xnStakeFix();if(s)s.hitT=performance.now();return _d.apply(this,arguments);};}
// 木柵一次倒一根不要每根都跳「摧毀了木柵」：3 秒內只提示一次
{const _t=toast;let last=0;toast=function(m){if(typeof m==='string'&&m.indexOf('摧毀了木柵')>=0){const n=performance.now();if(n-last<3000)return;last=n;}return _t.apply(this,arguments);};}
// ===== v0.4.9 玩家（房主主角 kind 'player'、成員化身 u.np）絕不跑弟子系統：化身雖然是 kind 'disciple'，在主機上只執行自己下的指令（task），
// 不自衛反擊、不自動修繕、不接 aiJob／職務、不撤退療傷、不休整、不夜歸、不參加宗門事務、不被教習、不自動閉關；倒地／救援（y47dn/rs/dj）仍走原本的流程 =====
function xnIsPC(u){return !!u&&(u.kind==='player'||!!u.np);}
const XPC={gate:0,clr:0};
{const _ud=updateDisciple;updateDisciple=function(u,dt){if(!u||!u.np||u.y47dn||u.y47rs||u.y47dj)return _ud.apply(this,arguments);XPC.gate++;
  if(u.carry&&u.carry.amt>0){if(!(typeof v49Client==='function'&&v49Client())){const rt=u.carry.type;if(rt&&S.res[rt]!=null)S.res[rt]+=u.carry.amt;}u.carry=null;XPC.carry=(XPC.carry||0)+1;}
  if(u.job||u.aiJob||u.retreat||u.rip||u.v170||u.v171||u.y47e||u.xnd){XPC.clr++;if(u.y47e){try{y47EvRelease(u);}catch(e){}u.y47e=null;}u.job=null;u.jobB=null;u.jobRes=null;u.jnode=null;u.aiJob=null;u.retreat=null;u.rip=null;u.ripSave=null;u.v170=null;u.v171=null;u.xnd=null;if(u.thought==='💦'||u.thought==='⚔')u.thought=null;}
  if(u.task){if(u.task.type==='attack'&&!enemyById(u.task.eid)){u.task=null;u.dvx=u.dvy=0;return;}runTask(u,dt,u.task);return;}u.dvx=u.dvy=0;};}
// 弟子「撤退療傷」飄字：同一次撤退只飄一次（v46Retreat 會被重複呼叫）
{const _f=floater;floater=function(x,y,t,c){if(t==='撤退療傷'||t==='再戰！'||t==='傷癒'){let u=null,bd=0.6;for(const o of S.units){const d=Math.abs(o.x-x)+Math.abs(o.y-y);if(d<bd){bd=d;u=o;}}
    if(u){if(xnIsPC(u)){XPC.sup=(XPC.sup||0)+1;return;}if(t==='撤退療傷'){if(u.xnRetF&&u.retreat&&u.retreat.t0===u.xnRetF){XPC.sup=(XPC.sup||0)+1;return;}u.xnRetF=u.retreat?u.retreat.t0:1;}}XPC.by=XPC.by||{};const k=(u?(u.np?'PC:':u.kind+':')+u.name:'?')+'|'+t;XPC.by[k]=(XPC.by[k]||0)+1;}return _f.apply(this,arguments);};}
{const _r=v46Retreat;v46Retreat=function(u){if(xnIsPC(u))return false;return _r.apply(this,arguments);};}
{const _r=v46Rip;v46Rip=function(u){if(xnIsPC(u))return;return _r.apply(this,arguments);};}
{const _a=assignJob;assignJob=function(u){if(xnIsPC(u))return false;return _a.apply(this,arguments);};}
setTimeout(function xpcReg(){if(!window.XW||!XW.xn){setTimeout(xpcReg,300);return;}XW.xn.pc={st:()=>Object.assign({},XPC),fl:t=>floaters.filter(f=>f.txt===t||f.t===t||f.text===t).length};},0);
// ===== v0.4.9 右鍵點到友方／中立單位（自己、其他玩家、成員、弟子、散修、村民）＝在那個地面點移動：不選取、不開卡、不卡住；
// 點到敵人／敵方建物仍是攻擊（交給原本流程）。另外：別的玩家角色永遠不能被選進 selUnits（以前左鍵／點一下選到隊友 → commandUnits 被濾成空 → 右鍵、點地都沒反應＝「卡住不能走」）=====
const XRC={mv:0,fb:0,uns:0};
function xrcOtherPc(u){return !!u&&typeof netOtherPc==='function'&&netOtherPc(u);}
function xrcFriendAt(w){return unitAt(w,S.units,14)||(S.wand&&wandAt(w))||(S.npcs&&unitAt(w,S.npcs,14));}
function xrcClean(){if(!Array.isArray(selUnits)||!selUnits.length)return;const k=selUnits.filter(id=>!xrcOtherPc(unitById(id)));if(k.length!==selUnits.length){selUnits=k;XRC.uns++;}}
{const _c=commandUnits;commandUnits=function(){let us=_c.apply(this,arguments);if(Array.isArray(us)&&us.some(xrcOtherPc)){us=us.filter(u=>!xrcOtherPc(u));if(!us.length){const sel=(selUnits||[]).map(unitById).filter(u=>u&&!u.dead);if(sel.length&&sel.every(xrcOtherPc))return [];const p=player();if(p&&!p.dead){us=[p];XRC.fb++;}}}return us;};}
{const _r=rightClick;rightClick=function(x,y,sh){try{if(!S.interior&&!buildMode){const w=screenToWorld(x,y);
      if(!enemyAt(w)&&!xncHostileS(structAt(w))&&!shrineAtScreen(x,y)&&xrcFriendAt(w)){xrcClean();const us=commandUnits();if(us.length){const t=tileAtWorld(w);
          commandMove(us,clamp(t.x,0.3,N-0.3),clamp(t.y,0.3,N-0.3),sh);XRC.mv++;return;}}}}catch(err){console.warn('xrc',err);}
  return _r.apply(this,arguments);};}
{const _l=leftClick;leftClick=function(x,y,sh){const r=_l.apply(this,arguments);try{xrcClean();}catch(e){}return r;};}
// 手機：點到別的玩家角色 → 視同點地面移動（不選取他）；其他情況照舊，結束後清掉誤選的隊友
{const _t=tapAt;tapAt=function(x,y){try{if(!S.interior&&!buildMode){const w=screenToWorld(x,y);const u=unitAt(w,S.units,14);
      if(u&&xrcOtherPc(u)&&!enemyAt(w)){xrcClean();rightClick(x,y,false);XRC.mv++;return;}}}catch(err){console.warn('xrc',err);}
  const r=_t.apply(this,arguments);try{xrcClean();}catch(e){}return r;};}
setTimeout(function xrcReg(){if(!window.XW||!XW.xn){setTimeout(xrcReg,300);return;}XW.xn.rc={st:()=>Object.assign({},XRC)};},0);
// ===== v0.4.9 傳送落點：每個傳送（石碑、進秘境、成員／房主加入秘境、首領傳送點、首領房封鎖、出秘境）都落在「指定落點附近最近、可走、
// 不是牆／虛空、跟落點同一連通區」的格子；多人依序排開（彼此 ≥0.8 格）；本機主角傳送後鏡頭跟隨 =====
const XTP={n:0,fix:0,dgRefuse:0,last:[]};
function xtpOk(i,j){if(!inMap(i,j))return false;const k=j*N+i;if(block[k])return false;const D=S.dg;if(D&&D.L&&D.L.fl&&D.L.fl[k]!==1)return false;return true;}
function xtpWall(i,j){let n=0;for(const [a,b] of [[1,0],[-1,0],[0,1],[0,-1],[1,1],[-1,-1],[1,-1],[-1,1]])if(!xtpOk(i+a,j+b))n++;return n;}
// x,y＝落點；self＝要放的單位；room＝限制在這個房間矩形；comp＝連通區（預設＝落點附近可走格的連通區）
function xnLand(x,y,self,o){o=o||{};const R=o.r||10,i0=Math.floor(x),j0=Math.floor(y);let comp0=o.comp;
  if(comp0==null){const f=nearestFree(x,y,-1);comp0=f?comp[f.j*N+f.i]:-1;}
  const inRoom=(i,j)=>!o.room||(i>=o.room.x0&&i<o.room.x0+o.room.w&&j>=o.room.y0&&j<o.room.y0+o.room.h);
  const others=S.units.filter(u=>u!==self&&!u.dead&&!u.inside);
  let best=null,bs=1e9,bestLoose=null,bl=1e9;
  for(let j=j0-R;j<=j0+R;j++)for(let i=i0-R;i<=i0+R;i++){if(!xtpOk(i,j)||!inRoom(i,j))continue;if(comp0>=0&&comp[j*N+i]!==comp0)continue;
    const d=Math.hypot(i+0.5-x,j+0.5-y);if(d>R)continue;const sc=d+0.45*xtpWall(i,j);if(sc<bl){bl=sc;bestLoose={i,j};}
    if(others.some(u=>Math.hypot(u.x-(i+0.5),u.y-(j+0.5))<0.8))continue;if(sc<bs){bs=sc;best={i,j};}}
  return best||bestLoose||nearestFree(x,y,comp0>=0?comp0:-1);}
function xnPut(u,f,cam1){if(!u||!f)return;u.x=f.i+0.5;u.y=f.j+0.5;u.path=[];u.vx=u.vy=0;u.dvx=u.dvy=0;XTP.n++;XTP.last.push({id:u.id,x:u.x,y:u.y,dg:!!S.dg});if(XTP.last.length>12)XTP.last.shift();
  if(cam1){const q=iso(u.x,u.y);cam.x=q.x;cam.y=q.y;cam.follow=true;}}
function xtpLocal(u){return u===player()&&!(typeof NET!=='undefined'&&NET.actAs);}
// 傳送石碑：落點＝石碑正前方（南側 1.5 格）；秘境裡不能用地面石碑（以前會用地面座標把人丟到秘境地圖邊緣的牆邊）
{const _t=shrineTravel;shrineTravel=function(to){const p=player();
  if(S.dg&&p&&S.units.includes(p)&&!(typeof NET!=='undefined'&&NET._inR)){XTP.dgRefuse++;toast('秘境中無法使用傳送石碑');try{closeShrine();}catch(e){}return false;}
  const q0={x:cam.x,y:cam.y};const r=_t.apply(this,arguments);
  try{if(r&&p&&to&&!S.dg){const f=xnLand(to.x+0.5,to.y+1.5,p,{comp:startComp,r:8});const camWas=Math.abs(cam.x-iso(p.x,p.y).x)<1&&Math.abs(cam.y-iso(p.x,p.y).y)<1;xnPut(p,f,camWas&&xtpLocal(p));XTP.fix++;}}catch(e){console.warn('xtp',e);}
  return r;};}
// 首領傳送點落點（net17 netBossSpot）：限制在首領房裡、可走、排開
{const _b=netBossSpot;netBossSpot=function(r,k,n){try{const a=k/Math.max(1,n)*Math.PI*2,rr=1.2+0.3*Math.floor(k/8);const f=xnLand(r.cx+Math.cos(a)*rr,r.y0+r.h*0.7+Math.sin(a)*rr*0.5,null,{room:r,r:12});if(f)return f;}catch(e){console.warn('xtp',e);}return _b.apply(this,arguments);};}
// 進秘境（房主／單機）：入口房依序排開
{const _e=dgEnter;dgEnter=function(){const r=_e.apply(this,arguments);try{if(r&&S.dg){const st=S.dg.L.rooms[0];S.units.forEach((u,k)=>{const f=xnLand(st.cx+(k%5-2)*0.8,st.cy+Math.floor(k/5)*0.8-0.5,u,{room:st});xnPut(u,f,xtpLocal(u));});}}catch(e){console.warn('xtp',e);}return r;};}
// 成員／房主中途加入秘境
{const _p=netDgPlaceIn;netDgPlaceIn=function(u){const r=_p.apply(this,arguments);try{const D=S.dg;if(D&&D.L&&u){const st=D.L.rooms[0];xnPut(u,xnLand(st.cx,st.cy-0.5,u,{room:st}),false);}}catch(e){console.warn('xtp',e);}return r;};}
{const _h=netDgHostJoin;netDgHostJoin=function(){const r=_h.apply(this,arguments);try{const p=player();if(r&&p){const q=iso(p.x,p.y);cam.x=q.x;cam.y=q.y;cam.follow=true;}}catch(e){}return r;};}
// 出秘境回到宗門：回原位，如果跟別人疊在一起就就近排開
{const _d=netDgRestore;netDgRestore=function(u){const r=_d.apply(this,arguments);try{if(u&&!S.dg&&S.units.some(o=>o!==u&&!o.dead&&!o.inside&&Math.hypot(o.x-u.x,o.y-u.y)<0.6))xnPut(u,xnLand(u.x,u.y,u,{r:4}),xtpLocal(u));}catch(e){}return r;};}
setTimeout(function xtpReg(){if(!window.XW||!XW.xn){setTimeout(xtpReg,300);return;}XW.xn.tp={st:()=>JSON.parse(JSON.stringify(XTP)),go:id=>shrineTravel(shrines().find(s=>s.id===id)),inv:a=>netDgInvAct(a),
  boss:()=>{if(NET.role==='client'){netIntent({a:'bossgate'});return true;}return netBossGo(player(),'probe');},openGate:()=>{const D=S.dg;if(!D)return false;D.L.rooms.forEach(r=>{if(!r.boss)r.state='clear';});return netGateOpen(D);},
  gate:()=>netGatePt(S.dg),chk:id=>{const u=S.units.find(u=>u.id===id)||player();if(!u)return null;const i=Math.floor(u.x),j=Math.floor(u.y),k=j*N+i;const D=S.dg;
    return {x:+u.x.toFixed(2),y:+u.y.toFixed(2),ok:xtpOk(i,j),fl:D?D.L.fl[k]:null,wall:xtpWall(i,j),room:D?(()=>{const r=dgRoomOf(u.x,u.y);return r?D.L.rooms.indexOf(r):-1;})():null,comp:comp[k],sc:startComp,
      near:+Math.min(9,...S.units.filter(o=>o!==u&&!o.dead&&!o.inside).map(o=>Math.hypot(o.x-u.x,o.y-u.y))).toFixed(2)};}};},0);
// ===== v0.4.9 頭頂文字不重疊：人物／妖物的境界標籤、敵人名稱畫的時候跟本幀已畫好的標籤＋血條比對，重疊就往上堆；
// 聯機名牌（netDrawNames）再墊在自己那條標籤的上方，並把別人的標籤當障礙一起堆疊 =====
const XLB={on:0,boxes:[],dy:{},fr:0,n:0,cur:null};
{const _d=draw;draw=function(){XLB.boxes=[];XLB.dy={};XLB.fr++;return _d.apply(this,arguments);};}
{const _h=drawHuman;drawHuman=function(u){const c=XLB.cur;XLB.cur=u;XLB.on++;try{return _h.apply(this,arguments);}finally{XLB.on--;XLB.cur=c;try{if(u&&!u.dead&&!u.inside){const p=P(u.x,u.y);xlbPush({x0:p.x-15,x1:p.x+15,y0:p.y-42,y1:p.y-30,o:u.id,k:'bar'});}}catch(e){}}};}
function xlbPush(b){try{const T=ctx.getTransform(),d=(typeof dpr==='number'&&dpr)||1,a=(x,y)=>({x:(T.a*x+T.c*y+T.e)/d,y:(T.b*x+T.d*y+T.f)/d});const p=a(b.x0,b.y0),q=a(b.x1,b.y1);b.s={x0:p.x,y0:p.y,x1:q.x,y1:q.y};}catch(e){}XLB.boxes.push(b);}
{const _b=drawBeast;drawBeast=function(e){const c=XLB.cur;XLB.cur=e;XLB.on++;try{return _b.apply(this,arguments);}finally{XLB.on--;XLB.cur=c;}};}
{const _bar=bar;bar=function(x,y,w){if(XLB.on&&XLB.cur)xlbPush({x0:x-w/2-1,x1:x+w/2+1,y0:y-1,y1:y+4,o:XLB.cur.id,k:'bar'});return _bar.apply(this,arguments);};}
{const _l=label;XLB.raw=_l;label=function(txt,x,y,col,font){if(!XLB.on||!XLB.cur)return _l.apply(this,arguments);
  // 先排隊：整幀的人物／妖物畫完（血條都登記好）才統一擺放，後畫的血條也不會被蓋到
  XLB.q.push({txt:String(txt),x,y,col,font,o:XLB.cur.id,T:ctx.getTransform()});};}
XLB.q=[];
function xlbFlush(){const Q=XLB.q;XLB.q=[];if(!Q.length)return;Q.sort((a,b)=>b.y-a.y||a.x-b.x);ctx.save();XLB.last=Q.map(i=>[i.o,i.txt]);
  for(const it of Q){ctx.setTransform(it.T);ctx.font=it.font||'bold 10px sans-serif';const w=ctx.measureText(it.txt).width+4,hgt=(/(\d+)px/.exec(ctx.font)||[0,10])[1]*1;const x=it.x,y=it.y;let yy=y,g=0,b;
    const hit=yv=>XLB.boxes.find(b=>(b.o!==it.o||b.k==='bar'||b.k==='lb')&&x-w/2<b.x1&&x+w/2>b.x0&&yv-hgt<b.y1&&yv+2>b.y0);
    while((b=hit(yy))&&g++<10)yy=b.y0-2.5;
    if(yy!==y){XLB.n++;XLB.dy[it.o]=Math.max(XLB.dy[it.o]||0,y-yy);ctx.strokeStyle='rgba(255,255,255,0.25)';ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(x,yy+2);ctx.lineTo(x,y-hgt+2);ctx.stroke();}
    xlbPush({x0:x-w/2,x1:x+w/2,y0:yy-hgt,y1:yy+2,o:it.o,k:'lb'});XLB.raw.call(null,it.txt,x,yy,it.col,it.font);}
  ctx.restore();}
{const _df=drawFx;drawFx=function(){try{xlbFlush();}catch(e){console.warn('xlb',e);XLB.q=[];}return _df.apply(this,arguments);};}
setTimeout(function xlbReg(){if(!window.XW||!XW.xn){setTimeout(xlbReg,300);return;}XW.xn.lb={last:()=>XLB.last||[],st:()=>({n:XLB.n,fr:XLB.fr,boxes:XLB.boxes.length,dy:Object.assign({},XLB.dy)}),boxes:()=>XLB.boxes.slice(),tags:()=>(typeof NET!=='undefined'&&NET.tagDraw)||[]};},0);
// ===== v0.4.9 頭頂血條／靈氣條：跟著平滑後的畫面位置、對齊整數像素、置中；遠端玩家的 qiMax／gqMax 在同步封包間偶爾缺值時
// 沿用 1.5 秒內的上一個值（以前條子會在 -38／-42.5／-47 之間上下跳＝「晃動、錯位」）=====
const XHB={rnd:0,n:0,latch:0};
{const _P=P;P=function(x,y,z){const p=_P(x,y,z);if(XHB.rnd){try{const T=ctx.getTransform();if(T.a&&!T.b&&!T.c){p.x=(Math.round(T.a*p.x+T.e)-T.e)/T.a;p.y=(Math.round(T.d*p.y+T.f)-T.f)/T.d;}}catch(e){}}return p;};}
{const _h=drawHuman;drawHuman=function(u){if(!u)return _h.apply(this,arguments);const now=performance.now();let rq=null,rg=null;
  if(u.qiMax>0){u._hbQ=[u.qiMax,now];}else if(u._hbQ&&now-u._hbQ[1]<1500&&u.kind!=='wanderer'){rq=u.qiMax;u.qiMax=u._hbQ[0];XHB.latch++;}
  if(u.gqMax>0){u._hbG=[u.gqMax,now];}else if(u._hbG&&now-u._hbG[1]<1500){rg=u.gqMax;u.gqMax=u._hbG[0];XHB.latch++;}
  XHB.rnd++;XHB.n++;try{return _h.apply(this,arguments);}finally{XHB.rnd--;if(rq!==null)u.qiMax=rq;if(rg!==null)u.gqMax=rg;}};}
setTimeout(function xhbReg(){if(!window.XW||!XW.xn){setTimeout(xhbReg,300);return;}XW.xn.hb={st:()=>Object.assign({},XHB)};},0);
// 測試掛鉤：找離倉庫 ≥8 格、可採的樹，回傳樹與旁邊可站的格子
setTimeout(function xnnReg(){if(!window.XW||!XW.xn){setTimeout(xnnReg,300);return;}XW.xn.nodeNear=(x,y,ck)=>{let best=null,bd=1e9;for(const id in NODES){const n=NODES[id];if(!n||n.gone||n.type!=='tree'||n.amount<5)continue;const d=Math.hypot(n.i-x,n.j-y);if(d>30||d>=bd)continue;if(ck&&Math.hypot(n.i-ck.i,n.j-ck.j)<8)continue;const f=nearestFree(n.i+0.5,n.j+1.5,startComp);if(!f)continue;bd=d;best={id:n.id,i:n.i,j:n.j,ax:f.i+0.5,ay:f.j+0.5};}return best;};},0);
// ===== v0.4.9 Fix-LG：靈根稀有化＋「煉氣需靈根」（只限弟子／NPC，玩家＝房主／成員豁免） =====
// 真概率：依資質品階的最終獨立機率（無隱藏倍率／無 cap）。下品1%／中品3%／上品8%／極品·天品必有。舊存檔已有的靈根不動。
TUNE.xn.lgRate={tier:[0.01,0.03,0.08,1,1],up:1,xy:1,max:1};
const XLG={roll:0,has:0};
function xlgP(d,b){const R=TUNE.xn.lgRate;const g=(d&&d.xnG!=null)?d.xnG:xnGrade(d);let p=R.tier[g]!=null?R.tier[g]:R.tier[0];if(p>=1)return 1;
  return Math.min(R.max,p);}
function xlgRoll(d,b){if(!d||xnIsPC(d)||d.kind==='player')return d;try{const p=xlgP(d,b);XLG.roll++;if(rnd()<p){if(!d.lg)d.lg=rollLg();if(d.xnG!=null)xnLgFit(d,d.xnG);XLG.has++;}else d.lg=null;d.lgR=1;}catch(e){}return d;}
for(const L of [DISC_COPY,CAND_KEEP,WAND_KEEP,UNIT_KEEP])if(!L.includes('lgR'))L.push('lgR');
{const _sd=spawnDisciple;spawnDisciple=function(b,o){const d=_sd.apply(this,arguments);if(d&&!(o&&o.lg!==undefined)&&!(o&&o.src))xlgRoll(d,b);return d;};}
{const _mc=makeCandidate;makeCandidate=function(b){const d=_mc.apply(this,arguments);if(d)xlgRoll(d,b);return d;};}
{const _mw=makeWanderer;makeWanderer=function(src,x,y,o){const w=_mw.apply(this,arguments);try{if(w&&src&&src.kind==='disciple'&&!src.lgR&&!S.units.includes(src)&&!(S.wand||[]).includes(src))xlgRoll(w,null);}catch(e){}return w;};}
// 突破條件：宗師→煉氣（realm 3）非玩家必須身具靈根
function xlgNeed(u){return !!u&&u.realm===3&&!xnIsPC(u)&&u.kind!=='player';}
{const _bc=breakConds;breakConds=function(u){const c=_bc.apply(this,arguments);try{if(c&&Array.isArray(c.list)&&xlgNeed(u)){
  c.list.push(u.lg?{t:`身具靈根（${lgName(u.lg)}）`,ok:true,xlg:1}:{t:'無靈根，無法突破煉氣（凡體上限：宗師圓滿）',ok:false,xlg:1});
  c.ok=c.list.every(x=>x.ok);if(!u.lg)c.auto=false;}}catch(e){}return c;};}
try{if(RT&&RT.none){RT.none.s='凡人之軀：無靈根，無法突破煉氣（上限宗師圓滿）';}}catch(e){}
{const _ln=lgName;lgName=function(lg){if(!lg)return '無靈根，無法突破煉氣';return _ln.apply(this,arguments);};}
setTimeout(function xlgReg(){if(!window.XW||!XW.xn){setTimeout(xlgReg,300);return;}XW.xn.lg={st:()=>Object.assign({},XLG),P:(d,b)=>xlgP(d,b),need:id=>{const u=S.units.find(u=>u.id===id);return u?breakConds(u):null;}};},0);
// ===== v0.4.9 Fix-MP：手機一次只開一個大面板；面板底色不透明；隊伍彈窗不遮按鈕 =====
const XMP={on:0,closed:0,lastB:null,sw:0};
function xmpMob(){try{return innerWidth<=760||matchMedia('(pointer:coarse)').matches&&innerWidth<=1024;}catch(e){return false;}}
function xmpOpenList(){const o=[];try{if(rosterOpen)o.push('roster');if(recOpen)o.push('rec');if(bagOpen)o.push('bag');if(craftOpen)o.push('craft');if(allocOpen)o.push('alloc');const c=document.getElementById('cult');if(c&&c.classList.contains('open'))o.push('cult');}catch(e){}return o;}
function xmpClose(k){try{XMP.closed++;if(k==='roster')toggleRoster(false);else if(k==='rec')toggleRec(false);else if(k==='bag')toggleBag(false);else if(k==='craft')toggleCraft(false);else if(k==='alloc')toggleAlloc(false);else if(k==='cult')closeCult();else if(k==='sel'){selBuilding=null;selOther=null;panelKeyCache=null;}else if(k==='pt'){if(typeof NET!=='undefined'&&NET._ptOpen){NET._ptOpen=false;netPtRender();}}}catch(e){}}
function xmpOnly(k){if(!xmpMob()||XMP.sw)return;XMP.sw=1;try{for(const o of xmpOpenList())if(o!==k)xmpClose(o);if(k!=='sel')xmpClose('sel');xmpClose('pt');XMP.lastB=null;}finally{XMP.sw=0;}}
{const _t=toggleRoster;toggleRoster=function(v){const r=_t.apply(this,arguments);if(rosterOpen)xmpOnly('roster');return r;};}
{const _t=toggleRec;toggleRec=function(v){const r=_t.apply(this,arguments);if(recOpen)xmpOnly('rec');return r;};}
{const _t=toggleBag;toggleBag=function(v){const r=_t.apply(this,arguments);if(bagOpen)xmpOnly('bag');return r;};}
{const _t=toggleCraft;toggleCraft=function(v){const r=_t.apply(this,arguments);if(craftOpen)xmpOnly('craft');return r;};}
{const _t=toggleAlloc;toggleAlloc=function(v){const r=_t.apply(this,arguments);if(allocOpen)xmpOnly('alloc');return r;};}
{const _t=openCult;openCult=function(){const r=_t.apply(this,arguments);xmpOnly('cult');return r;};}
// 選了新建築（宗門大殿等）＝開建築面板 → 收起其他大面板
setInterval(()=>{try{if(!xmpMob()){XMP.lastB=selBuilding;return;}if(selBuilding!=null&&selBuilding!==XMP.lastB){XMP.lastB=selBuilding;if(!XMP.sw){XMP.sw=1;try{for(const o of xmpOpenList())xmpClose(o);xmpClose('pt');}finally{XMP.sw=0;}}}else if(selBuilding==null)XMP.lastB=null;
  document.body.classList.toggle('xmp-mob',xmpMob());}catch(e){}},200);
// 展開隊伍彈窗 → 收起大面板（不會蓋住弟子總表按鈕）
document.addEventListener('click',e=>{try{const b=e.target&&e.target.closest&&e.target.closest('#netpt [data-pt=open]');if(!b||!xmpMob()||NET._ptOpen)return;XMP.sw=1;try{for(const o of xmpOpenList())xmpClose(o);xmpClose('sel');}finally{XMP.sw=0;}}catch(e){}},true);
{const st=document.createElement('style');st.id='xmpcss';st.textContent=
 'body.xmp-mob #roster,body.xmp-mob #rec,body.xmp-mob #bag,body.xmp-mob #craft,body.xmp-mob #alloc,body.xmp-mob #cult,body.xmp-mob #panel{background-color:rgb(26,18,11)!important;backdrop-filter:none!important;opacity:1!important}'+
 'body.xmp-mob #netpt{background-color:rgb(10,20,30)!important}';(document.head||document.documentElement).appendChild(st);}
setTimeout(function xmpReg(){if(!window.XW||!XW.xn){setTimeout(xmpReg,300);return;}XW.xn.mp={st:()=>Object.assign({open:xmpOpenList(),mob:xmpMob()},XMP)};},0);
// 隊伍彈窗展開／收合改變高度時：弟子列在預設位置就重新排（排到彈窗下方），彈窗不會蓋住弟子列按鈕
if(typeof netPtPlace==='function'){const _x=netPtPlace;netPtPlace=function(el){const r=_x.apply(this,arguments);try{if(isTouchUI&&XU49.portrait()&&typeof pbCfg==='function'&&pbCfg().x==null&&typeof pbApply==='function'){const h=el?el.offsetHeight:0;if(h!==XMP.pth){XMP.pth=h;pbApply();}}}catch(e){}return r;};}
setInterval(()=>{try{const el=document.getElementById('netpt');if(el&&el.style.display!=='none'&&isTouchUI&&XU49.portrait()&&el.offsetHeight!==XMP.pth)netPtPlace(el);}catch(e){}},400);
{const _tb=tryBreak;tryBreak=function(u,auto){try{if(xlgNeed(u)&&!u.lg&&!u.dead&&(u.sub||0)>=(typeof v52Top==="function"?v52Top(u.realm):SUB_N-1)){XLG.blk=(XLG.blk||0)+1;if(!auto)toast(`${nm(u)}無靈根，無法突破煉氣（凡體上限：宗師圓滿）`);return false;}}catch(e){}return _tb.apply(this,arguments);};}
setTimeout(function xenReg(){if(!window.XW||!XW.xn){setTimeout(xenReg,300);return;}XW.xn.en={types:()=>Object.keys(ENEMY),mk:(t,rl)=>{const e=makeEnemy(t,10,10,{realm:rl});return {hp:e.maxhp,atk:e.atk,realm:e.realm,lq:!!e.v49lq,def:e.def||0};},base:t=>Object.assign({},ENEMY[t]),rm:(rl,k)=>xnRM(rl,k),lqDef:()=>TUNE.v49.lqDef,cap:()=>typeof v156Cap==='function'?v156Cap():null};},0);
// ===== v0.4.9 Fix-EN：敵人境界總表（以「仙凡之門」煉氣首領守門天將為基準） =====
// 一張表：每個角色定位在煉氣（realm 4）以上至少要有基準戰力 × share × 地圖修正；宗師以下不動。戰力＝√(氣血×攻擊)。
TUNE.xn.enRealm={from:4,ref:'xfboss',refK:1.3,share:{boss:1,chief:0.45,elite:0.45,mob:0.2},role:{chief:'chief',king:'boss',warden:'boss',xfboss:'boss',xfguard:'elite',tiger:'elite'},
  map:{world:1,cave:0.9,jail:0.9,ruin:1},on:false}; // 緊急搶修：關閉（舊地板依 xfboss 絕對戰力抬升，會讓煉氣相對宗師暴衝 >10%；鄰境成長改只走 XN.STAT≤1.10）
const XEN={n:0,up:0};
function xenRefP(r){const T=TUNE.xn.enRealm,B=ENEMY[T.ref];const hp=B.hp*xnRM(3,'hp')*T.refK,atk=B.atk*xnRM(3,'atk')*T.refK;let p=Math.sqrt(hp*atk);
  for(let k=4;k<r;k++)p*=Math.sqrt((xnRM(k+1,'hp')/xnRM(k,'hp'))*(xnRM(k+1,'atk')/xnRM(k,'atk')));return p;}
function xenFloor(type,r,map){const T=TUNE.xn.enRealm;const role=T.role[type]||'mob';return xenRefP(r)*(T.share[role]||T.share.mob)*(T.map[map]!=null?T.map[map]:1);}
{const _me=makeEnemy;makeEnemy=function(type,x,y,o){const e=_me.apply(this,arguments);try{const T=TUNE.xn.enRealm;if(!T.on||!e||(e.realm||0)<T.from)return e;const D=S.dg;if(D&&D.kind==='xf')return e;
  const map=D?D.kind:'world';const f=xenFloor(type,e.realm,map),p=Math.sqrt(Math.max(1,e.maxhp)*Math.max(0.1,e.atk));XEN.n++;
  if(p<f){const k=f/p;e.maxhp=e.hp=Math.round(e.maxhp*k);e.atk=+(e.atk*k).toFixed(1);e.xenK=+k.toFixed(2);XEN.up++;}}catch(er){}return e;};}
setTimeout(function xen2Reg(){if(!window.XW||!XW.xn||!XW.xn.en){setTimeout(xen2Reg,300);return;}XW.xn.en.st=()=>Object.assign({ref4:xenRefP(4)},XEN);XW.xn.en.floor=(t,r,m)=>xenFloor(t,r,m||'world');XW.xn.en.off=v=>{TUNE.xn.enRealm.on=!v;};},0);
// ===== v0.4.9 Fix-GF：副本首領掉的「功法／武學秘籍／仙凡令」由主機在擊殺當下直接入宗門庫（存檔、同步），不再等最後一人離開／不因倒地、斷線、撤退而遺失 =====
const XGF={n:0,log:[]};const XGF_N={gongfa:'功法',miji:'武學秘籍',xfl:'仙凡令'};
{const _x=dgBossDown;dgBossDown=function(e){const D=S.dg;const r=_x.apply(this,arguments);try{if(!D||!D.loot||!D.loot.misc||(typeof v49Client==='function'&&v49Client())||(typeof NET!=='undefined'&&NET.role==='client'))return r;
  const M=D.loot.misc,got=[];M.got=M.got||{};for(const k of ['gongfa','miji','xfl']){const n=M[k]||0;if(!n)continue;const add=k==='xfl'?1:n;S.items[k]=(S.items[k]||0)+add;M[k]=0;M.got[k]=(M.got[k]||0)+add;got.push(XGF_N[k]+' +'+add);}
  if(got.length){XGF.n++;XGF.log.push([D.kind,got.join('、'),Math.round(S.time)]);toast(`📜 ${got.join('、')}　已直接存入宗門（不必帶出副本）`);try{if(typeof netMarkSt==='function')netMarkSt();}catch(er){}}}catch(er){console.warn(er);}return r;};}
// 副本內戰利品清單：已入庫的也列出（標「✔已入庫」）
{const _l=dgLootList;dgLootList=function(L){const a=_l.apply(this,arguments);try{const G=L&&L.misc&&L.misc.got;if(G)for(const k in G)if(G[k])a.push([XGF_N[k]+' ✔已入庫',G[k]]);}catch(e){}return a;};}
setTimeout(function xgfReg(){if(!window.XW||!XW.xn){setTimeout(xgfReg,300);return;}XW.xn.gf={st:()=>JSON.parse(JSON.stringify(XGF))};},0);
// ===== v0.4.9 Fix-PW：隊伍視窗顯示每位隊友的位置與距離；點隊友＝鏡頭移過去；小地圖標出隊友 =====
const XPW={pan:0,mm:0,rows:0};
function xpwUnit(pk){try{if(typeof NET==='undefined')return null;if(pk===NET.pkey)return player();const a=netAvatarOf(pk);if(a)return a;if(pk===netHostPk())return S.units.find(u=>u.kind==='player'&&!u.np)||null;}catch(e){}return null;}
function xpwCol(pk){let h=0;for(const c of String(pk))h=(h*31+c.charCodeAt(0))>>>0;return `hsl(${h%360},85%,62%)`;}
function xpwWhere(pk,u){try{if(netRegionOf(pk)==='dg'){const D=S.dg||netDgRun&&netDgRun();return '秘境'+(D&&DGS[D.kind]?'「'+DGS[D.kind].n+'」':'');}}catch(e){}
  if(!u)return '位置不明';if(u.inside){const b=bById(u.inB||u.inside);return b?'在'+bName(b)+'內':'室內';}
  let best=null,bd=1e9;try{for(const v of S.villages){const d=Math.hypot(v.x-u.x,v.y-u.y);if(d<bd){bd=d;best=v.name;}}const c=sectCenter();const dc=Math.hypot(c.x-u.x,c.y-u.y);if(dc<14||dc<bd)return '宗門附近';}catch(e){}return best&&bd<18?best+'附近':'野外';}
function xpwArrow(dx,dy){const a=Math.atan2(dy,dx);const ar=['→','↘','↓','↙','←','↖','↑','↗'];return ar[((Math.round(a/(Math.PI/4))%8)+8)%8];}
{const _x=netPtRender;netPtRender=function(){const r=_x.apply(this,arguments);try{const el=document.getElementById('netpt');if(!el||el.style.display==='none')return r;const me=player();
  for(const row of el.querySelectorAll('.ptr[data-ptm]')){const pk=row.dataset.ptm;if(pk===NET.pkey)continue;const u=xpwUnit(pk);let s=row.nextElementSibling;if(!s||!s.classList.contains('xpwl')||s.dataset.ptm!==pk){s=document.createElement('div');s.className='xpwl';s.dataset.ptm=pk;s.style.cursor='pointer';row.after(s);row.title='點一下：鏡頭移到這位隊友';row.style.cursor='pointer';}
    const dg=(()=>{try{return netRegionOf(pk)!==netRegionOf(NET.pkey);}catch(e){return false;}})();let t=xpwWhere(pk,u);
    if(u&&me&&!dg&&!u.inside&&!me.inside){const dx=u.x-me.x,dy=u.y-me.y,d=Math.hypot(dx,dy);const sx=dx-dy,sy=(dx+dy)/2;t+=`・${d<1.5?'就在身邊':Math.round(d)+' 格 '+xpwArrow(sx,sy)}`;}
    s.innerHTML=`<span style="color:${xpwCol(pk)}">◆</span> ${t}`;XPW.rows++;}
  const hh=el.offsetHeight;if(el._xpwH!==hh){el._xpwH=hh;try{netPtPlace(el);}catch(e){}}}catch(e){}return r;};}
document.addEventListener('click',e=>{try{const row=e.target&&e.target.closest&&e.target.closest('#netpt .ptr[data-ptm],#netpt .xpwl[data-ptm]');if(!row||e.target.closest('.btn'))return;const pk=row.dataset.ptm;if(pk===NET.pkey)return;const u=xpwUnit(pk);
  if(!u||u.inside){toast('這位隊友在室內或秘境中，無法移過去');return;}try{if(netRegionOf(pk)!==netRegionOf(NET.pkey)){toast('這位隊友不在同一張地圖（秘境／宗門）');return;}}catch(er){}
  const q=iso(u.x,u.y);cam.x=q.x;cam.y=q.y;cam.follow=false;XPW.pan++;e.stopPropagation();}catch(er){}},true);
{const _d=drawMinimap;drawMinimap=function(){const r=_d.apply(this,arguments);try{if(typeof NET==='undefined'||!NET.players||NET.players.size<2)return r;const k=mmBig?2.2:1;
  for(const p of NET.players.values()){const pk=netPPk(p);if(pk===NET.pkey)continue;const u=xpwUnit(pk);if(!u||u.dead||u.inside)continue;try{if(netRegionOf(pk)!==netRegionOf(NET.pkey))continue;}catch(e){}
    const q=mmPt(u.x,u.y),s=3.2*k;mctx.fillStyle=xpwCol(pk);mctx.strokeStyle='#000';mctx.lineWidth=1;mctx.beginPath();mctx.moveTo(q.x,q.y-s);mctx.lineTo(q.x+s,q.y);mctx.lineTo(q.x,q.y+s);mctx.lineTo(q.x-s,q.y);mctx.closePath();mctx.fill();mctx.stroke();
    if(mmBig){mctx.font=`bold ${Math.round(5.5*k)}px sans-serif`;mctx.textAlign='center';mctx.fillText(String(p.name||'道友').slice(0,4),q.x,q.y-s-2);}XPW.mm++;}}catch(e){}return r;};}
{const st=document.createElement('style');st.id='xpwcss';st.textContent='#netpt .xpwl{font-size:11px;color:#b9c6d8;line-height:1.3;margin:-1px 0 2px 2px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}';(document.head||document.documentElement).appendChild(st);}
setTimeout(function xpwReg(){if(!window.XW||!XW.xn){setTimeout(xpwReg,300);return;}XW.xn.pw={st:()=>Object.assign({},XPW),txt:()=>[...document.querySelectorAll('#netpt .xpwl')].map(x=>x.textContent),cam:()=>({x:cam.x,y:cam.y,f:cam.follow})};},0);
// ===== v0.4.9 Fix-DG：聯機秘境「進入／離開」 =====
// 1) 入口面板：隊友的秘境正在進行時，最上面一顆「⚔ 進入（加入隊友）」（不受冷卻／境界門檻，因為是加入現有的副本）；走到該入口附近自動跳出同樣的確認。
// 2) 撤離陣（D.ent）落在可走、離牆最遠的格子（原本固定在 rooms[0] 中心上方 1.4 格，小房間時可能貼牆）；成員與房主都可走上去或按 HUD「撤離」離開。
const XDG={join:0,ask:0,ent:0};
function xdgRun(){try{if(typeof NET==='undefined'||!NET.role||S.dg)return null;
  if(NET.role==='host'){const P=NET.dgPark;return P&&P.D&&!P.D.end?{kind:P.D.kind,n:(P.D.party||0),by:P.D.by||''}:null;}
  const I=NET.dgInv;return I&&I.kind?{kind:I.kind,n:0,by:I.by||''}:null;}catch(e){return null;}}
function xdgJoin(kind){XDG.join++;if(typeof x47DlgClose==='function')try{x47DlgClose('xdgjoin');}catch(e){}return dgEnter(kind,'solo',false);}
{const _x=dgatePanel;dgatePanel=function(o){let h=_x.apply(this,arguments);try{const R=xdgRun();if(R){const G=DGS[R.kind]||{};
  const blk=R.kind===o.kind?`<div class="jobs" style="margin:6px 0;padding:6px;border:1px solid #c9a24a;border-radius:8px;background:#2a1d0c"><div style="color:#ffe9a8;margin-bottom:4px">⚔ 道友${R.by?'「'+R.by+'」':''}正在「${G.n||'秘境'}」裡</div><button class="btn pri" data-act="dgo" data-k="${R.kind}" data-p="solo" data-xdg="1">⚔ 進入（加入隊友）</button></div>`
    :`<div class="mini" style="color:#ffe9a8">⚔ 道友正在「${G.n||'秘境'}」裡（到那個入口才能加入）</div>`;
  h=h.replace('</h4>','</h4>'+blk);}}catch(e){}return h;};}
// 入口附近自動提示（成員端 x47DgTick 不跑，所以自己判斷）
setInterval(()=>{try{if(typeof S==='undefined'||!S||S.dg||S.interior)return;const R=xdgRun();const p=(typeof NET!=='undefined'&&NET.role==='client'&&typeof netAvatarOf==='function')?netAvatarOf(NET.pkey):player();
  if(!R||!p||p.dead){XDG.near=null;return;}const g=gates().find(s=>s.kind===R.kind);if(!g)return;const d=distRect(p.x,p.y,g.i,g.j,2);
  if(d<=3.5){if(XDG.near===R.kind)return;XDG.near=R.kind;XDG.ask++;const G=DGS[R.kind]||{};
    x47Dlg({id:'xdgjoin',t:`⛩ ${G.n||'秘境'}`,h:`道友${R.by?'「'+R.by+'」':''}正在「${G.n||'秘境'}」裡。要進去和他會合嗎？`,btn:[{l:'取消'},{l:'⚔ 進入',cls:'pri',f:()=>xdgJoin(R.kind)}],
      keep:()=>{const q=(NET.role==='client')?netAvatarOf(NET.pkey):player();return !!(!S.dg&&xdgRun()&&q&&distRect(q.x,q.y,g.i,g.j,2)<=4.5);}});}
  else if(d>5)XDG.near=null;}catch(e){}},500);
// 撤離陣放在可走的格子
{const _e=dgEnter;dgEnter=function(){const had=!!S.dg;const r=_e.apply(this,arguments);try{if(r&&!had&&S.dg&&S.dg.ent){const D=S.dg,st=D.L.rooms[0];const f=xnLand(D.ent.x,D.ent.y,{},{room:st,r:4});
  if(f&&(!xtpOk(Math.floor(D.ent.x),Math.floor(D.ent.y))||xtpWall(Math.floor(D.ent.x),Math.floor(D.ent.y))>0)){D.ent={x:f.i+0.5,y:f.j+0.5};XDG.ent++;}}}catch(e){console.warn('xdg',e);}return r;};}
setTimeout(function xdgReg(){if(!window.XW||!XW.xn){setTimeout(xdgReg,300);return;}XW.xn.dg={st:()=>Object.assign({},XDG),run:xdgRun,entOk:()=>{const D=S.dg;if(!D)return null;const i=Math.floor(D.ent.x),j=Math.floor(D.ent.y);return {ok:xtpOk(i,j),wall:xtpWall(i,j),ent:D.ent};}};},0);
// ===== v0.4.9 Fix-BF：成員使用建築功能（房主權威） =====
// 原因：長書閣「研究武學秘籍／研究丹方」、求武台「升級求仙台」沒有登記轉送 → 成員端在自己的副本裡跑（只看到提示，房主端沒開始、也不同步）；
//       丹爐／鍛造台的進度只認「指派的弟子」或 player()（房主自己）站在旁邊 → 成員站在爐邊進度不動。
// 修正：三個函式改走 netFwd（房主驗證、扣共用材料、結果經同步回到雙方）；crafters() 把在爐邊／屋內的成員化身也算進去（只算推進進度，不給弟子職業經驗）。
const XBF={fwd:0,cr:0};
setTimeout(function xbfReg(){if(typeof netFwd!=='function'||typeof NET==='undefined'){setTimeout(xbfReg,200);return;}
  const bld=n=>({bld:true,max:2});
  if(!NET_FWD.startResearch){startResearch=netFwd('startResearch',startResearch,true,bld());XBF.fwd++;}
  if(!NET_FWD.startRecResearch){startRecResearch=netFwd('startRecResearch',startRecResearch,true,bld());XBF.fwd++;}
  if(!NET_FWD.upgradeAltar){upgradeAltar=netFwd('upgradeAltar',upgradeAltar,true,bld());XBF.fwd++;}},0);
{const _c=crafters;crafters=function(b){const r=_c.apply(this,arguments);try{if(!b||(typeof NET!=='undefined'&&NET.role==='client'))return r;const sz=(BUILD[b.type]||{}).size||2;
  for(const u of S.units){if(!u.np||u.dead||r.includes(u))continue;if((u.inside&&u.inB===b.id)||(!u.inside&&distRect(u.x,u.y,b.i,b.j,sz)<2.5)){r.push(u);XBF.cr++;}}}catch(e){}return r;};}
{const _p=profCheck;profCheck=function(u){if(xnIsPC(u))return;return _p.apply(this,arguments);};}
setTimeout(function xbfApi(){if(!window.XW||!XW.xn){setTimeout(xbfApi,300);return;}XW.xn.bf={st:()=>Object.assign({},XBF),crafters:id=>crafters(bById(id)).map(u=>u.id),enterInt:id=>enterInterior(bById(id)),exitInt:()=>exitInterior(true)};},0);
// 成員化身在室內打坐：原本走弟子的野外打坐公式（只看附近的練武閣／武道館、不算室內／房屋／大殿閉關倍率、回血用弟子係數），也聽不到宗主講道。
// 改成與房主在室內打坐同一套：倍率依所在建築（練武閣 2.4／武道館 1.6／其他 1.3）＋v62Loc(該建築)；回血用玩家係數；
// 大殿有人（另一位玩家）坐寶座講道時，殿內打坐的玩家（房主或成員）同沾道韻：max(講道者 1/3、自身 ×1.3)，同樣受 Fix13 境界限制與總上限。
XBF.med=0;XBF.lect=0;
function xbfInB(u){if(!u||!u.np||!u.inside||u.inB==null)return null;return bById(u.inB)||null;}
{const _cl=cultLoc;cultLoc=function(u,m,b){try{if(!b){const ib=xbfInB(u);if(ib){b=ib;m=ib.type==='lianwu'?2.4:ib.type==='wudao'?1.6:1.3;XBF.med++;}}}catch(e){}
  const r=_cl.call(this,u,m,b);
  try{if(b&&b.type==='hall'&&xnIsPC(u)&&u.v165!==b.id){const h=v165Holder(b);if(h&&h!==u&&!xn13Over(u,h)){const pr=hallRate(b),own=1.2*m*r;if(pr>0){const capR=1.2*m*v62MaxMul(u);const t=Math.max(own,Math.min(Math.max(pr/3,own*1.3),capR));
      u.v165L={t:S.time,r:t/Math.max(1e-9,own),capped:t>=capR-1e-9};XBF.lect++;return t/(1.2*m);}}}}catch(e){}
  return r;};}
{const _ud=updateDisciple;updateDisciple=function(u,dt){const r=_ud.apply(this,arguments);try{if(u&&u.np&&!u.dead&&u.medit&&u.task&&u.task.type==='meditate'&&u.hp<u.maxhp&&!(typeof NET!=='undefined'&&NET.role==='client')){
    const d=(TUNE.medHpPlayer||0)-(TUNE.medHpDisciple||0);if(d>0)u.hp=Math.min(u.maxhp,u.hp+u.maxhp*d*dt);}}catch(e){}return r;};}

// ======================= v0.4.9 Fix-HZ 護宗大陣：中心固定在宗門大殿＋陣力隨建築／等級成長（數據表 TUNE.xn.hz） =======================
// 原因：y47 用 sectCenter()→hallB()＝「第一座 built 的大殿」，大殿不在（重建中／舊檔缺 built）時退回 ANCH.start（開局點），
//      開局點旁常就是護宗陣或其他建築 → 圈會畫在別的建築上。改為：優先 built 且未毀的大殿，其次任何大殿（建造中也跟著），
//      都沒有時以護宗陣本體為中心；每次 tick／繪製即時取，所以大殿移動或重建會跟著走，舊檔不需轉換。
TUNE.xn=TUNE.xn||{};
TUNE.xn.hz={
  w:{hall:3,house:0.5,huzhen:0,_:1},   // 每座建築的「陣力點數」權重 ×建築等級（大殿最重，住房較輕，護宗陣本身不算）
  hpPt:50,                            // 每點 → 陣力 +50（填到本級封頂為止）
  rPt:0.15,rMax:6,                    // 每點 → 半徑 +0.15 格，最多 +6 格
  regPt:0.03,regMax:1.0,              // 每點 → 回復 +3 %，最多 +100 %
  lv:[ // 護宗陣等級：基礎陣力／本級封頂（硬上限）  ← 封頂數值待使用者確認
    {base:800, cap:1500},
    {base:1200,cap:2400},
    {base:1600,cap:3500},
    {base:2000,cap:4800},
    {base:2400,cap:6400}]
};
function xhzHall(){let best=null,sc=-1;const hz=S.buildings.find(b=>b.type==='huzhen'&&b.built);
  for(const b of S.buildings){if(b.type!=='hall')continue;const s=(b.built?2:0)+(b.broken?0:1)-(hz?dist(b.i,b.j,hz.i,hz.j)*1e-4:0);if(s>sc){sc=s;best=b;}}return best;}
// v0.4.10 更正（使用者）：陣的範圍以「護宗陣」建築本身為中心（不是大殿）；多座時取已落成、未毀、等級最高者；沒有護宗陣才退回大殿
function xhzBld(){let best=null,sc=-1;for(const b of S.buildings){if(b.type!=='huzhen')continue;const s=(b.built?20:0)+(b.broken?0:10)+blv(b);if(s>sc){sc=s;best=b;}}return best;}
function xhzCenter(){const z=xhzBld();if(z){const s=BUILD.huzhen.size;return {x:z.i+s/2,y:z.j+s/2};}
  const h=xhzHall();if(h){const s=BUILD.hall.size;return {x:h.i+s/2,y:h.j+s/2};}
  return {x:ANCH.start.x+0.5,y:ANCH.start.y+0.5};}
let _xhzC={t:-1,p:0};
function xhzPts(){if(_xhzC.t===S.time&&_xhzC.n===S.buildings.length)return _xhzC.p;const W=TUNE.xn.hz.w;let p=0;
  for(const b of S.buildings){if(!b.built||b.broken)continue;const w=W[b.type]!=null?W[b.type]:W._;p+=w*Math.max(1,blv(b)||1);}
  _xhzC={t:S.time,n:S.buildings.length,p};return p;}
function xhzLvRow(lv){const L=TUNE.xn.hz.lv;return L[Math.max(0,Math.min(L.length-1,(lv||1)-1))];}
function xhzStr(lv){const T=TUNE.xn.hz,p=xhzPts(),row=xhzLvRow(lv),R0=TUNE.y47b.r+TUNE.y47b.rLv*(Math.max(1,lv)-1);
  const hpB=T.hpPt*p,max=Math.min(row.cap,row.base+hpB),rB=Math.min(T.rMax,T.rPt*p),rg=Math.min(T.regMax,T.regPt*p);
  return {lv:Math.max(1,lv),pts:Math.round(p*10)/10,base:row.base,cap:row.cap,max:Math.round(max),hpB:Math.round(Math.min(hpB,row.cap-row.base)),capped:row.base+hpB>=row.cap,
    r:Math.round((R0+rB)*10)/10,r0:R0,rB:Math.round(rB*10)/10,reg:Math.round(TUNE.y47b.regen*Math.max(1,lv)*(1+rg)*10)/10,regB:Math.round(rg*100)};}
y47BR=function(lv){return xhzStr(lv).r;};
y47BMax=function(lv){return xhzStr(lv).max;};
{const swap=f=>function(){const sc=sectCenter,rg=TUNE.y47b.regen;sectCenter=xhzCenter;try{const lv=y47BLv();if(lv)TUNE.y47b.regen=rg*(1+xhzStr(lv).regB/100);return f.apply(this,arguments);}finally{sectCenter=sc;TUNE.y47b.regen=rg;}};
 y47BTick=swap(y47BTick);y47DrawB=swap(y47DrawB);}
function xhzLines(lv){const s=xhzStr(lv);const L=[`屏障半徑 ${s.r} 格（基礎 ${s.r0}＋建築 +${s.rB}）`,`陣力上限 ${s.max}（基礎 ${s.base}＋建築 +${s.hpB}；Lv${s.lv} 封頂 ${s.cap}${s.capped?'，已滿':''}）`,
  `陣力回復 ${s.reg}/秒（建築 +${s.regB} %）`,`宗門建築點數 ${s.pts}（建越多、等級越高越強；升級護宗陣可提高封頂）`];
  try{L.push(xhzCostText(lv));}catch(e){}
  L.push('自己人、村民、商旅可自由進出');return L;}
BDESC.huzhen.t=b=>xhzLines(blv(b));
try{for(const k of ['s','d'])if(typeof BDESC.huzhen[k]==='string')BDESC.huzhen[k]=BDESC.huzhen[k].replace(/以(宗門)?大殿為中心/g,'以護宗陣為中心');}catch(e){}
B49.huzhen={n:'大陣擴張',f:lv=>{const s=xhzStr(lv);return `半徑 ${s.r} 格、陣力 ${s.max}（封頂 ${s.cap}）`;}};
{const _v=V50L.huzhen;V50L.huzhen=b=>{const r=_v(b);const s=xhzStr(y47BLv()||blv(b));r.splice(2,0,['強度',`點數 ${s.pts}｜半徑 ${s.r}｜上限 ${s.max}/${s.cap}｜回復 ${s.reg}/秒`]);return r;};}
setTimeout(function xhzApi(){if(!window.XW||!XW.xn){setTimeout(xhzApi,300);return;}XW.xn.hz={center:xhzCenter,hall:xhzHall,str:xhzStr,pts:xhzPts,lines:xhzLines,
  costOn:xhzCostOn,daySec:xhzDaySec,topRealm:xhzTopRealm,upkeepXia:xhzUpkeepXia,hitXia:xhzHitXia,costText:xhzCostText,payXia:xhzPayXia};},0);

// ======================= v0.4.9 Fix-HZR 護宗陣陣力回復＋維持費 =======================
// 原因：原本只有「regenWait 秒內沒被打」才回復；敵人貼著陣邊一直撞 → B.hit 一直刷新 → 陣力永遠停住（例如 1056/1200）。
//      成員端 S.flags.y47b 只在 world 分享時更新，所以成員畫面也看起來不動。
// 改為：未受攻擊全速回復、受攻擊時慢速回復（倍率在數據表）；回復速度寫進 flags（存檔會帶），並隨 st 同步給成員。
Object.assign(TUNE.xn.hz,{
  regIdle:1.0,       // 未受攻擊：基礎回復 ×1（基礎＝TUNE.y47b.regen×等級×(1+建築加成)）
  regCombat:0.25,    // 受攻擊中：×0.25
  combatWin:5,       // 最後一次被撞後 5 秒內算「受攻擊中」
  upkeep:{lingshi:1,every:600}  // 旗標關：大陣張開時每 10 分鐘（600 遊戲秒）消耗 1 靈石；付不出 → 停止回復（屏障仍在）
});
// huzhenCost（預設關；?big=1 開）：維持費／受擊回復費，參數都在 TUNE.y47b
Object.assign(TUNE.y47b,{
  upkeepXia:2,       // Lv1、金丹及以下：每遊戲日 2 下品
  upkeepLv:1.5,      // 每升一級 ×1.5
  upkeepRealm:3,     // 金丹以上每大境界 ×3
  upkeepFrom:6,      // 金丹（REALMS 索引，0＝武徒）
  hitXia:0.05,       // 受擊回復：武徒 0.05 下品
  hitRealm:3         // × 3^(attackerRealm-1)，attackerRealm 以武徒＝1
});
function xhzCostOn(){try{return !!(S&&S.econ&&S.econ.flags&&S.econ.flags.huzhenCost);}catch(e){return false;}}
function xhzDaySec(){try{if(TUNE.y47b.dayLen)return TUNE.y47b.dayLen;}catch(e){}
  try{if(typeof econDayLen==='function')return econDayLen();}catch(e){}
  try{if(TUNE.dayLen)return TUNE.dayLen;}catch(e){}
  return 300;}
function xhzTopRealm(){let r=0;try{
  const p=typeof player==='function'?player():null;if(p&&!p.dead)r=Math.max(r,p.realm||0);
  const list=typeof disciples==='function'?disciples():((S&&S.units)||[]);
  for(const u of list){if(u&&!u.dead)r=Math.max(r,u.realm||0);}
}catch(e){}return r;}
function xhzUpkeepXia(lv,top){const T=TUNE.y47b,L=Math.max(1,lv||1),from=T.upkeepFrom!=null?T.upkeepFrom:6;
  const band=Math.max(0,(top==null?xhzTopRealm():top)-from);
  return (T.upkeepXia||2)*Math.pow(T.upkeepLv||1.5,L-1)*Math.pow(T.upkeepRealm||3,band);}
function xhzHitXia(e){const T=TUNE.y47b;const r0=(e&&e.realm!=null)?(+e.realm||0):0;
  return (T.hitXia||0.05)*Math.pow(T.hitRealm||3,Math.max(0,r0));}
function xhzFmtXia(n){n=+n||0;const r=Math.round(n*1000)/1000;return (Math.abs(r-Math.round(r))<1e-9)?String(Math.round(r)):String(r);}
function xhzPayXia(amt,reason){
  amt=Math.floor(+amt||0);if(!(amt>0))return true;
  try{
    if(typeof econFlag==='function'&&econFlag('treasury')&&typeof XW_ECON!=='undefined'&&XW_ECON&&typeof XW_ECON.pay==='function'){
      if(typeof XW_ECON.canPay==='function'&&!XW_ECON.canPay(S,amt))return false;
      const r=XW_ECON.pay(S,amt,reason||'護宗陣');return !!(r&&r.ok);
    }
  }catch(e){}
  if((S.res.lingshi||0)>=amt){S.res.lingshi-=amt;return true;}
  return false;}
function xhzTrySpend(B,reason){
  const n=Math.floor(B.xhzDue||0);if(n<=0){if(B.np&&!(B.xhzDue>0))B.np=0;return true;}
  if(xhzPayXia(n,reason)){B.xhzDue=(B.xhzDue||0)-n;B.np=0;return true;}
  if(!B.np)try{toast('⚠ 靈石不足，護宗陣停止回復陣力');}catch(e){}
  B.np=1;return false;}
function xhzCostText(lv){
  if(!xhzCostOn()){const U=TUNE.xn.hz.upkeep;return `張開時每 ${Math.round(U.every/60)} 分鐘 ${U.lingshi} 靈石`;}
  const u=xhzUpkeepXia(lv,xhzTopRealm()),top=xhzTopRealm(),rn=(typeof REALMS!=='undefined'&&REALMS[top]&&REALMS[top].n)||('境界'+top);
  return `維持 ${xhzFmtXia(u)} 下品／日（Lv${Math.max(1,lv||1)}、最高「${rn}」）；受擊 ${xhzFmtXia(TUNE.y47b.hitXia)}×${TUNE.y47b.hitRealm}^(境−1) 下品（宗師 ${xhzFmtXia(xhzHitXia({realm:3}))}、元嬰 ${xhzFmtXia(xhzHitXia({realm:7}))}）`;}
{const _t=y47BTick;y47BTick=function(dt){const rg=TUNE.y47b.regen;TUNE.y47b.regen=0;let r;try{r=_t.apply(this,arguments);}finally{TUNE.y47b.regen=rg;}
  try{const B=y47BS(),lv=y47BLv(),T=TUNE.xn.hz;B.rr=0;if(!lv||S.dg||B.br>S.time||!Y47.bOn&&!(B.e>0))return r;
    if(xhzCostOn()){
      const day=xhzDaySec();B.up=(B.up||0)+dt;
      if(B.up>=day){const n=Math.floor(B.up/day);B.up-=n*day;B.xhzDue=(B.xhzDue||0)+xhzUpkeepXia(lv,xhzTopRealm())*n;}
      xhzTrySpend(B,'護宗陣維持');
    }else{
      const U=T.upkeep;B.up=(B.up||0)+dt;if(B.up>=U.every){if((S.res.lingshi||0)>=U.lingshi){S.res.lingshi-=U.lingshi;B.up-=U.every;B.np=0;}else{B.up=U.every;if(!B.np)toast('⚠ 靈石不足，護宗陣停止回復陣力');B.np=1;}}
    }
    const mx=y47BMax(lv),cb=S.time-(B.hit||-99)<=T.combatWin;B.cb=cb?1:0;
    const rate=B.np?0:TUNE.y47b.regen*lv*(1+xhzStr(lv).regB/100)*(cb?T.regCombat:T.regIdle);B.rr=Math.round(rate*10)/10;
    if(B.e<mx)B.e=Math.min(mx,(B.e||0)+rate*dt);}catch(e){console.error('[xhz] regen',e);}return r;};}
function xhzOnHit(e){try{if(!xhzCostOn())return;const B=y47BS();B.xhzDue=(B.xhzDue||0)+xhzHitXia(e);xhzTrySpend(B,'護宗陣受擊');}catch(er){}}
// 面板：顯示回復速度與狀態、維持費
{const _v=V50L.huzhen;V50L.huzhen=b=>{const r=_v(b);const B=y47BS();const st=B.np?'靈石不足，停止回復':B.cb?'受攻擊中（慢速）':'未受攻擊（全速）';
  r.splice(2,0,['回復',`${(B.rr||0).toFixed(1)} / 秒｜${st}`],['維持',xhzCostText(blv(b)||y47BLv()||1)]);return r;};}
// 戰鬥特效與陣力同步：房主把 fx／floater／sfx／投射物以精簡事件附在 st 上（每包最多 XFX.max 筆，坐標取到 0.1），成員端照播
const XFX={q:[],max:40,sent:0,ev:0,drop:0,bytes:0,rx:0,seen:new WeakSet()};
function xfxKey(){return S&&S.dg?String(S.dg.id||S.dg.kind||'dg'):'';}
function xfxOn(){return typeof NET!=='undefined'&&NET.role==='host'&&typeof netMembersOnline==='function'&&netMembersOnline()>0;}
const xr=v=>Math.round(v*10)/10;
function xfxQ(e){if(!xfxOn())return;e.push(xfxKey());XFX.q.push(e);if(XFX.q.length>200){XFX.q.splice(0,XFX.q.length-200);XFX.drop++;}}
{const _f=fx;fx=function(type,x,y,col,extra){if(!XFX.rp)try{xfxQ(['f',type,xr(x),xr(y),col||0,extra&&extra.dur?xr(extra.dur):0]);}catch(e){}return _f.apply(this,arguments);};}
{const _f=floater;floater=function(x,y,t,c){if(!XFX.rp)try{xfxQ(['t',xr(x),xr(y),String(t).slice(0,16),c||0]);}catch(e){}return _f.apply(this,arguments);};}
{const _f=sfxPush;sfxPush=function(k,x,y,x2,y2,col,dur,r){if(!XFX.rp)try{xfxQ(['s',k,xr(x),xr(y),x2==null?0:xr(x2),y2==null?0:xr(y2),col||0,dur?xr(dur):0,r?xr(r):0]);}catch(e){}return _f.apply(this,arguments);};}
function xfxProj(){if(!xfxOn())return;for(const p of projectiles){if(XFX.seen.has(p))continue;XFX.seen.add(p);
  xfxQ(p.free?['p',xr(p.x),xr(p.y),0,xr(p.ux),xr(p.uy),xr(p.left||6),p.sword?1:0]:['p',xr(p.x),xr(p.y),p.tid||0,0,0,0,p.sword?1:0]);}}
setTimeout(function xfxReg(){if(typeof netCast!=='function'||typeof netClientRx!=='function'){setTimeout(xfxReg,300);return;}
  const _c=netCast;netCast=function(m){try{if(m&&m.t==='st'&&NET.role==='host'){xfxProj();const k=xfxKey();const mine=[],rest=[];for(const e of XFX.q)(e[e.length-1]===k?mine:rest).push(e);
      XFX.q=rest;if(mine.length){const L=mine.slice(-XFX.max);XFX.drop+=mine.length-L.length;m.xfx=L.map(e=>e.slice(0,-1));XFX.ev+=L.length;XFX.sent++;XFX.bytes+=JSON.stringify(m.xfx).length;}
      if(!S.dg){const B=y47BS();m.xhz=[Math.round(B.e||0),B.br||0,B.rr||0,B.cb||0,B.np||0,B.init||0];}}}catch(e){}return _c.apply(this,arguments);};
  const _r=netClientRx;netClientRx=function(m){const r=_r.apply(this,arguments);try{if(m&&m.t==='st'&&NET.role==='client'){
      if(m.xhz&&!S.dg){const B=y47BS();[B.e,B.br,B.rr,B.cb,B.np,B.init]=m.xhz;}
      if(m.xfx){XFX.rx+=m.xfx.length;XFX.rp=1;try{for(const e of m.xfx)xfxPlay(e);}finally{XFX.rp=0;}}}}catch(e){console.error('[xfx]',e);}return r;};},0);
function xfxPlay(e){const c=e[0];
  if(c==='f')fx(e[1],e[2],e[3],e[4]||undefined,e[5]?{dur:e[5]}:undefined);
  else if(c==='t')floater(e[1],e[2],e[3],e[4]||undefined);
  else if(c==='s')sfxPush(e[1],e[2],e[3],e[4],e[5],e[6]||undefined,e[7]||undefined,e[8]||undefined);
  else if(c==='p'){if(projectiles.length>40)return;projectiles.push(e[3]?{x:e[1],y:e[2],tid:e[3],t:0,vis:1,sword:e[7]}:{x:e[1],y:e[2],ux:e[4],uy:e[5],left:e[6],t:0,vis:1,vfree:1,sword:e[7]});}}
// 成員端：投射物只做畫面移動（不算傷害；命中特效由房主事件送來）
{const _u=netClientUpdate;netClientUpdate=function(dt){const r=_u.apply(this,arguments);try{if(projectiles.length){for(const p of projectiles){p.t+=dt;const mv=10*dt;
    if(p.vfree){const s=Math.min(mv,p.left);p.x+=p.ux*s;p.y+=p.uy*s;p.left-=s;if(p.left<=0.01)p.dead=true;}
    else{const e=S.enemies.find(o=>o.id===p.tid);if(!e){p.dead=true;}else{const d=dist(p.x,p.y,e.x,e.y);if(d<=mv+0.3)p.dead=true;else{p.x+=(e.x-p.x)/d*mv;p.y+=(e.y-p.y)/d*mv;}}}
    if(p.t>3)p.dead=true;}projectiles=projectiles.filter(p=>!p.dead);}}catch(e){}return r;};}
setTimeout(function xfxApi(){if(!window.XW||!XW.xn){setTimeout(xfxApi,300);return;}XW.xn.fx={st:()=>({sent:XFX.sent,ev:XFX.ev,drop:XFX.drop,bytes:XFX.bytes,rx:XFX.rx,q:XFX.q.length}),hz:()=>Object.assign({},y47BS()),
  counts:()=>({fx:effects.length,fl:floaters.length,sfx:sfx.length,pr:projectiles.length})};},0);

// ======================= v0.4.9 Fix-JL 聚靈陣範圍顯示（地面柔光圈＋少量靈氣光點＋小地圖圈），跟「範圍標示」設定一起開關 =======================
// 原本沒有任何「範圍標示」設定 → 新增 HUD 設定 zone（預設顯示）；同一開關也控制小地圖上的護宗陣範圍圈。
if(!OPT173.some(o=>o.k==='zone')){const i=OPT173.findIndex(o=>o.k==='np');OPT173.splice(i<0?OPT173.length:i+1,0,{k:'zone',tab:'hud',n:'範圍標示',d:'聚靈陣的靈氣範圍（地面與小地圖）、護宗陣在小地圖上的範圍圈。',t:'cy',o:[['on','顯示'],['off','關閉']],def:'on'});
  CFG173.zone='on';try{const s=JSON.parse(XW_PREFS.get('cfg','{}'));if(s.zone==='off'||s.zone==='on')CFG173.zone=s.zone;}catch(e){}}
TUNE.xn.jlFx={n:10,alpha:0.07,ring:0.35};   // 每座聚靈陣光點數、底色透明度、圈線透明度（便宜：每座 1 條 40 點折線＋10 個方塊）
function xzOn(){return CFG173.zone!=='off';}
// B-21: all building-range overlays share scene/modal guards, including minimap.
function xwRangeMapVisible(){
  try{
    if(!S||S.dg||S.interior||!xzOn())return false;
    if(typeof uiBlock==='function'&&uiBlock())return false;
    if(typeof guideOpen!=='undefined'&&guideOpen)return false;
    if(typeof V47!=='undefined'&&V47.pause)return false;
    if(typeof XWBB!=='undefined'&&XWBB.open)return false;
    const body=document.body;
    if(body&&['x47modal','x47dbgopen','menuopen'].some(k=>body.classList.contains(k)))return false;
    const dbg=document.getElementById('x47dbg');if(dbg&&dbg.style.display==='block')return false;
    return true;
  }catch(e){return false;}
}

function xjlList(){const r=[];for(const b of S.buildings)if(b.type==='juling'&&b.built&&!b.broken){const s=BUILD.juling.size;r.push({x:b.i+s/2,y:b.j+s/2,R:TUNE.v61.jlR+s/2,lv:blv(b)||1});}return r;}
function xjlDraw(){if(!xwRangeMapVisible())return;const L=xjlList();if(!L.length)return;const now=performance.now()/1000,T=TUNE.xn.jlFx,n=40;ctx.save();
  for(const c of L){ctx.beginPath();for(let k=0;k<=n;k++){const a=k/n*6.283,p=P(c.x+Math.cos(a)*c.R,c.y+Math.sin(a)*c.R,0);k?ctx.lineTo(p.x,p.y):ctx.moveTo(p.x,p.y);}
    ctx.fillStyle=`rgba(120,255,210,${T.alpha})`;ctx.fill();ctx.setLineDash([6,5]);ctx.lineDashOffset=-now*8;ctx.strokeStyle=`rgba(150,255,220,${T.ring+0.12*Math.sin(now*1.6)})`;ctx.lineWidth=1.5;ctx.stroke();ctx.setLineDash([]);
    ctx.fillStyle='rgba(200,255,235,0.8)';for(let k=0;k<T.n;k++){const ph=(now*0.25+k*0.618)%1,a=k*2.399+c.lv,rr=c.R*(0.25+0.7*((k*0.37)%1)),z=4+ph*26;
      const p=P(c.x+Math.cos(a)*rr,c.y+Math.sin(a)*rr,z);ctx.globalAlpha=Math.sin(ph*Math.PI)*0.9;ctx.fillRect(p.x-1.5,p.y-1.5,3,3);}ctx.globalAlpha=1;}
  ctx.restore();}
{const _dw=drawV045World;drawV045World=function(){const r=_dw.apply(this,arguments);try{xjlDraw();}catch(e){}return r;};}
{const _d=drawMinimap;drawMinimap=function(){const r=_d.apply(this,arguments);try{if(!xwRangeMapVisible())return r;const k=mmBig?2.2:1;const ring=(x,y,R,col,fill)=>{mctx.beginPath();for(let q=0;q<=24;q++){const a=q/24*6.283,p=mmPt(x+Math.cos(a)*R,y+Math.sin(a)*R);q?mctx.lineTo(p.x,p.y):mctx.moveTo(p.x,p.y);}if(fill){mctx.fillStyle=fill;mctx.fill();}mctx.strokeStyle=col;mctx.lineWidth=1*k;mctx.stroke();};
    for(const c of xjlList())ring(c.x,c.y,c.R,'rgba(140,255,210,0.9)','rgba(120,255,210,0.18)');
    if(typeof y47BOn==='function'&&y47BOn()){const c=xhzCenter();ring(c.x,c.y,y47BR(y47BLv()),'rgba(140,210,255,0.9)',null);}}catch(e){}return r;};}
setTimeout(function xjlApi(){if(!window.XW||!XW.xn){setTimeout(xjlApi,300);return;}XW.xn.jl={list:xjlList,on:xzOn,set:v=>{CFG173.zone=v?'on':'off';}};},0);
// 護宗陣面板：陣力／回復變化時重繪（原本面板快取鍵不含陣力 → 房主畫面數字停住）
{const _k=panelKey;panelKey=function(){const k=_k.apply(this,arguments);try{if(selBuilding!=null){const b=bById(selBuilding);if(b&&b.type==='huzhen'){const B=y47BS();return k+'|hz'+Math.floor((B.e||0)/5)+','+(B.rr||0)+(B.cb?'c':'')+(B.np?'n':'')+Math.ceil(Math.max(0,(B.br||0)-S.time));}}}catch(e){}return k;};}
// 測試用：房主端各打一個 fx／sfx／投射物／浮字（驗證同步通道）
setTimeout(function xfxT(){if(!window.XW||!XW.xn||!XW.xn.fx){setTimeout(xfxT,300);return;}XW.xn.fx.test=()=>{const p=player();const e=S.enemies.find(x=>!x.dead);fx('boom',p.x+1,p.y,'#ff9040');fx('sweep',p.x,p.y,'#ffe27a');
  sfxPush('beam',p.x,p.y,p.x+3,p.y-2,'#9fe8ff',0.8);sfxPush('burst',p.x+2,p.y,0,0,'#ffb060',0.9,2);if(e)projectiles.push({x:p.x,y:p.y,tid:e.id,src:p.id,dmg:1,t:0});floater(p.x,p.y-0.5,'火球','#ffb060');return true;};},0);

// ======================= v0.4.9 Fix-VN 靈石脈：弟子需煉氣（realm≥4）才能開採 =======================
// 原本只看宗門旗標 S.flags.xian（有人突破煉氣就全宗可採）→ 武徒圓滿的弟子也能採。玩家（房主／成員）照舊只受原本的宗門規則。
TUNE.xn.veinRealm=4;   // W1_R4 煉氣
const XVN={auto:0,block:0,warn:new Map()};
function xvOk(u){return !u||xnIsPC(u)||u.kind!=='disciple'||(u.realm||0)>=TUNE.xn.veinRealm;}
function xvWarn(u){const t=XVN.warn.get(u.id)||-99;if(S.time-t<8)return;XVN.warn.set(u.id,S.time);toast(`${nm(u)}：境界不足，需煉氣才能採集靈石`);}
// AI 找礦：未達煉氣的弟子找不到靈石脈
{const _f=findNearestNode;findNearestNode=function(res,x,y,r,u){if(res==='lingshi'&&u&&!xvOk(u))return null;return _f.apply(this,arguments);};}
// 指派（手動＋自動分配）
{const _a=assignJob;assignJob=function(u,job,arg){if(u&&job==='gather'&&arg==='lingshi'&&!xvOk(u)){XVN.block++;
    if(XVN.auto){const w=allocWant();const r=ALLOC_RES.filter(k=>k!=='lingshi'&&(w[k]||0)>0).sort((a,b)=>w[b]-w[a])[0];return r?_a.call(this,u,'gather',r):false;}
    xvWarn(u);return false;}return _a.apply(this,arguments);};}
{const _t=allocTick;allocTick=function(){XVN.auto=1;try{return _t.apply(this,arguments);}finally{XVN.auto=0;}};}
// 採集 tick：任何路徑（右鍵靈石脈、舊存檔、改採）留下的靈石工作都在這裡擋下
function xvGuard(u){if(xvOk(u))return false;let hit=false;
  if(u.job==='gather'&&u.jobRes==='lingshi'){hit=true;u.jobRes=null;u.jnode=null;u.path=[];if(u.smart){const w=allocWant();const r=ALLOC_RES.filter(k=>k!=='lingshi'&&(w[k]||0)>0).sort((a,b)=>w[b]-w[a])[0];if(r)u.jobRes=r;else u.job=null;}else u.job=null;}
  if(u.task&&u.task.type==='gather'){const n=nodeById(u.task.nodeId);if(n&&n.type==='vein'){hit=true;u.task=null;}}
  if(hit){XVN.block++;if(!u.smart)xvWarn(u);}return hit;}
{const _d=doJob;doJob=function(u,dt){try{if(u&&u.kind==='disciple'&&!u.np)xvGuard(u);}catch(e){}return _d.apply(this,arguments);};}
{const _u=updateDisciple;updateDisciple=function(u,dt){try{if(u&&!u.np&&(typeof NET==='undefined'||NET.role!=='client'))xvGuard(u);}catch(e){}return _u.apply(this,arguments);};}
setTimeout(function xvApi(){if(!window.XW||!XW.xn){setTimeout(xvApi,300);return;}XW.xn.vn={ok:id=>xvOk(unitById(id)),st:()=>({block:XVN.block}),assign:(id,res)=>assignJob(unitById(id),'gather',res),
  test(){S.enemies.length=0;if(!S.flags.xian){S.flags.xian=true;if(typeof mapOnXianUnlock==='function')mapOnXianUnlock();}else S.flags.xian=true;const pl0=player();for(let _g=0;S.units.filter(u=>u.kind==='disciple'&&!u.np).length<2&&_g<8;_g++){const d=makeDisciple(pl0.x+1,pl0.y+1,0);if(d&&!S.units.includes(d))S.units.push(d);}const ds=S.units.filter(u=>u.kind==='disciple'&&!u.np);const lo=ds[0],hi=ds[1];lo.realm=3;lo.sub=3;hi.realm=4;hi.sub=0;
    const vein=NODES.filter(n=>n.type==='vein'&&!n.gone&&n.amount>0).sort((a,b)=>Math.hypot(a.i-lo.x,a.j-lo.y)-Math.hypot(b.i-lo.x,b.j-lo.y))[0];const pl=player();
    const o={lo:lo.id,hi:hi.id,vein:!!vein,rl:[(REALMS[lo.realm]||{}).n,(REALMS[hi.realm]||{}).n],findLo:!!findNearestNode('lingshi',lo.x,lo.y,999,lo),findHi:!!findNearestNode('lingshi',hi.x,hi.y,999,hi),findPl:!!findNearestNode('lingshi',pl.x,pl.y,999,pl),plOk:xvOk(pl)};
    XVN.warn.clear();o.asLo=assignJob(lo,'gather','lingshi');o.loJob=[lo.job,lo.jobRes];o.asHi=assignJob(hi,'gather','lingshi');o.hiJob=[hi.job,hi.jobRes];
    XVN.auto=1;assignJob(lo,'gather','lingshi');XVN.auto=0;o.autoLo=[lo.job,lo.jobRes];
    lo.smart=false;lo.job='gather';lo.jobRes='lingshi';lo.jnode=vein&&vein.id;lo.task=vein?{type:'gather',nodeId:vein.id}:null;XVN.warn.clear();return o;},
  after(id){const u=unitById(id);const q=iso(u.x,u.y);cam.follow=false;cam.x=q.x;cam.y=q.y;return {job:u.job,res:u.jobRes,task:u.task&&u.task.type,block:XVN.block};}};},0);

// ======================= v0.4.10 Phase B =======================
// ---- B1 選單／標題／設定／讀檔畫面時隱藏遊戲內浮動 UI（組隊按鈕／視窗、事件欄）----
function xnMenuUp(){try{if(typeof titleOpen!=='undefined'&&titleOpen)return true;}catch(e){}
  try{if(document.body&&document.body.classList.contains('y48naming'))return true;}catch(e){}
  try{if(typeof uiBlock==='function'&&uiBlock())return true;}catch(e){}
  try{if(typeof XWBB!=='undefined'&&XWBB.open)return true;}catch(e){}
  try{if(document.body&&(document.body.classList.contains('x47dbgopen')||document.body.classList.contains('x47modal')))return true;}catch(e){}
  const ids=['title','settings','saves','help','death','v47pause','cult','roster','bag','craft','guide','trade','shrine','dlg','kickdlg','recmenu','netp','alloc','evdlg','xwbb','x47dbg','y48name'];
  for(const id of ids){const el=document.getElementById(id);if(!el)continue;
    if(id==='xwbb'&&el.classList.contains('open'))return true;
    const cs=getComputedStyle(el);if(cs.display!=='none'&&cs.visibility!=='hidden'&&+cs.opacity!==0){const r=el.getBoundingClientRect();if(r.width>0&&r.height>0)return true;}}
  return false;}
{const st=document.createElement('style');st.textContent='body.xnmenu #xwptb,body.xnmenu #xwptw,body.xnmenu #netpt,body.xnmenu #xev,body.xnmenu #xevb,body.xnmenu #x47dbgbtn,body.xnmenu #x47rchip{display:none!important}';(document.head||document.documentElement).appendChild(st);}
setInterval(()=>{try{if(document.body)document.body.classList.toggle('xnmenu',xnMenuUp());}catch(e){}},250);

// ---- B2 事件欄：最近事件（時間＋內容），點一下鏡頭移過去；可關閉、可拖曳、記住位置；聯機成員也收到房主的事件 ----
TUNE.xn.ev={max:40,show:30,dupMs:2500,send:6};
const XEV={L:[],out:[],hint:null,last:{},K:'xw_xev_open',rx:0,tx:0};
function xevHint(p){if(p)XEV.hint={x:p.x,y:p.y,t:performance.now()};}
function xevLoc(m){const h=XEV.hint;if(h&&performance.now()-h.t<300)return {x:h.x,y:h.y};
  const mm=/「([^」]{1,10})」/.exec(m);if(mm){const n=mm[1];const u=S.units.find(u=>u.name===n&&!u.dead)||(S.wand||[]).find(u=>u.name===n)||S.enemies.find(e=>e.name===n&&!e.dead);if(u&&!u.inside)return {x:u.x,y:u.y};
    const b=S.buildings.find(b=>bName(b)===n);if(b)return {x:b.i+BUILD[b.type].size/2,y:b.j+BUILD[b.type].size/2};}
  if(/山賊|襲|妖|來犯|入侵/.test(m)){let c;try{c=sectCenter();}catch(e){}if(c){let best=null,bd=60;for(const e of S.enemies){if(e.dead)continue;const d=dist(e.x,e.y,c.x,c.y);if(d<bd){bd=d;best=e;}}if(best)return {x:best.x,y:best.y};}}
  return null;}
function xevAdd(m,loc,remote){if(typeof m!=='string'||!m.trim())return;const now=Date.now();if(XEV.last[m]&&now-XEV.last[m]<TUNE.xn.ev.dupMs)return;XEV.last[m]=now;
  const e={m,at:now,loc:loc||null,r:!!remote};XEV.L.push(e);if(XEV.L.length>TUNE.xn.ev.max)XEV.L.splice(0,XEV.L.length-TUNE.xn.ev.max);
  if(!remote&&typeof NET!=='undefined'&&NET.role==='host'){XEV.out.push([m,loc?+loc.x.toFixed(1):null,loc?+loc.y.toFixed(1):null]);if(XEV.out.length>20)XEV.out.splice(0,XEV.out.length-20);}
  if(remote){try{const el=document.getElementById('toasts');if(el){const d=document.createElement('div');d.textContent=m;el.appendChild(d);setTimeout(()=>d.remove(),isTouchUI?4500:6000);while(el.children.length>(isTouchUI?2:4))el.firstChild.remove();}}catch(er){}}
  XEV.dirty=true;}
{const _t=toast;toast=function(m){const r=_t.apply(this,arguments);try{xevAdd(m,xevLoc(m));}catch(e){}return r;};}
{const _h=y47BHit;y47BHit=function(){try{xevHint(Y47.bC||xhzCenter());}catch(e){}return _h.apply(this,arguments);};}
const XEVP={get(){try{const v=localStorage.getItem(XEV.K);return v==null?!isTouchUI:v==='1';}catch(e){return true;}},set(v){try{localStorage.setItem(XEV.K,v?'1':'0');}catch(e){}xevSync();}};
function xevPlace(el){if(!el||el.classList.contains('xwdragged'))return;const r0=el.getBoundingClientRect(),h=r0.height||36;const tb=XU49.rect('topbar');let top=(tb?tb.bottom:44)+6,left=10;
  for(const id of ['objectives','hint','tutbub','xwptb','xwptw','netpt']){const r=XU49.rect(id);if(r&&r.width&&r.left<260&&r.top<innerHeight*0.7)top=Math.max(top,r.bottom+6);}
  const pb=XU49.rect('pbar');if(pb&&pb.left<260&&pb.top<top+h&&pb.bottom>top)top=pb.bottom+6;const bb=XU49.rect('buildbar');const lim=(bb&&bb.height>20?bb.top:innerHeight)-h-6;
  el.style.left=left+'px';el.style.top=Math.round(Math.max((tb?tb.bottom:44)+6,Math.min(top,lim)))+'px';}
function xevBtn(){let b=document.getElementById('xevb');if(b)return b;b=document.createElement('div');b.id='xevb';b.className='ui';
  b.innerHTML='<span class="xwgrip" title="拖曳移動；連點兩下還原位置">⠿</span><span class="btn" data-xevo="1" title="開啟事件欄">📜 事件欄<b class="xevn"></b></span>';document.body.appendChild(b);
  try{XWDrag.make(b,{key:'xevb',handle:'.xwgrip'});}catch(e){}for(const t of ['pointerdown','mousedown','touchstart','contextmenu'])b.addEventListener(t,e=>{if(!e.target.closest('.xwgrip'))e.stopPropagation();});return b;}
function xevWin(){let w=document.getElementById('xev');if(w)return w;w=document.createElement('div');w.id='xev';w.className='ui';
  w.innerHTML='<span class="xptx" data-xevx="1" title="關閉（可從「📜 事件欄」再打開）">✕</span><h4><span class="xwgrip">⠿</span>📜 事件欄</h4><div class="xevl"></div>';document.body.appendChild(w);
  try{XWDrag.make(w,{key:'xev',handle:'h4'});}catch(e){}for(const t of ['pointerdown','mousedown','touchstart','contextmenu','wheel'])w.addEventListener(t,e=>{if(!e.target.closest('h4'))e.stopPropagation();});return w;}
function xevT(ms){const d=new Date(ms);return String(d.getHours()).padStart(2,'0')+':'+String(d.getMinutes()).padStart(2,'0');}
function xevIsDaily(m){return /採集|伐木|採石|採礦|採藥|收穫|睡覺|睡去|入睡|休息中|搬運|卸貨|入庫|放回倉庫/.test(String(m||''));}
function xevIsImportant(m){return /突破|晉升|死亡|身隕|入侵|來襲|來犯|襲擊|山賊|至寶|職位|任命|長老|外交|宣戰|停戰|結盟|副本|秘境|通關|天劫|渡劫|加入宗門|逐出|招攬/.test(String(m||''));}
function xevShowInLog(m){if(xevIsDaily(m)&&!xevIsImportant(m))return false;return true;}
function xevDailyHtml(u){if(!u||!XEV||!XEV.L)return '';const nm=u.name||'';const esc=s=>typeof netEsc==='function'?netEsc(s):String(s).replace(/</g,'&lt;');
  const items=XEV.L.filter(e=>xevIsDaily(e.m)&&( !nm || e.m.indexOf(nm)>=0 )).slice(-8).reverse();
  const rows=items.length?items.map(e=>`<div class="xw-daili"><span class="xevt">${xevT(e.at)}</span> ${esc(e.m)}</div>`).join(''):'<div class="dim">尚無日常紀錄（採集／睡覺／搬運會記在這裡）</div>';
  return `<div class="xw-dlog"><h5>日常紀錄</h5>${rows}</div>`;}
function xevOfficeHtml(u){if(!u)return '';try{if(typeof econRankRowHtml==='function'){const h=econRankRowHtml(u,{noEdit:u.kind==='player'});if(h)return '<div class="xw-office"><h5>職位／職務</h5>'+h+'</div>';}}catch(e){}
  const r=u.post||u.rank||u.office;if(r)return '<div class="xw-office"><h5>職位</h5>'+String(r)+'</div>';return '';}
function xevRender(){const w=xevWin();if(w.style.display==='none')return;const L=XEV.L.filter(e=>xevShowInLog(e.m)).slice(-TUNE.xn.ev.show).reverse();const box=w.querySelector('.xevl');
  const h=L.length?L.map((e,i)=>`<div class="xevi${e.loc?' go':''}" data-xevi="${XEV.L.length-1-i}"><span class="xevt">${xevT(e.at)}</span> <span class="xevm">${e.loc?'📍':''}${(typeof netEsc==='function'?netEsc(e.m):e.m.replace(/</g,'&lt;'))}</span></div>`).join(''):'<div class="dim">還沒有事件</div>';
  if(box._h!==h){box._h=h;box.innerHTML=h;}}
function xevSync(){if(!document.body)return;
  const w=document.getElementById('xev'),b=document.getElementById('xevb');
  if(w){w.style.display='none';try{w.remove();}catch(e){}}
  if(b){b.style.display='none';try{b.remove();}catch(e){}}
  XEV.dirty=false;}
addEventListener('click',ev=>{const t=ev.target&&ev.target.closest?ev.target:null;if(!t)return;
  if(t.closest('[data-xevx]')){ev.stopPropagation();ev.preventDefault();XEVP.set(false);return;}
  if(t.closest('[data-xevo]')){ev.stopPropagation();ev.preventDefault();XEVP.set(true);return;}
  const it=t.closest('[data-xevi]');if(it){ev.stopPropagation();const e=XEV.L[+it.dataset.xevi];if(e&&e.loc){if(S.dg||S.interior){toast('先回到宗門大地圖才能移過去');return;}const q=iso(e.loc.x,e.loc.y);cam.x=q.x;cam.y=q.y;cam.follow=false;XEV.pan=(XEV.pan||0)+1;}}},true);
{const st=document.createElement('style');st.textContent=`#xevb{position:fixed;z-index:8;display:none;align-items:center;gap:2px;background:rgba(10,20,30,.85);border:1px solid #4a6a8a;border-radius:8px;padding:2px 4px}
#xevb .xwgrip,#xev .xwgrip{cursor:grab;color:#8fb0d0;padding:0 4px;font-weight:normal}#xevb .xevn{color:#ffcf6a;font-weight:bold}
#xev{position:fixed;z-index:9;width:250px;max-width:calc(100vw - 20px);background:rgba(10,20,30,.92);border:1px solid #4a6a8a;border-radius:8px;color:#dde;font-size:12px;padding:6px 8px;box-sizing:border-box;box-shadow:0 2px 8px #0008}
#xev h4{margin:0 26px 4px 0;font-size:13px;cursor:grab;user-select:none}#xev .xevl{max-height:150px;overflow-y:auto;overscroll-behavior:contain}
#xev .xevi{padding:2px 2px;border-bottom:1px solid #4a6a8a33;line-height:1.35}#xev .xevi.go{cursor:pointer}#xev .xevi.go:hover{background:#ffffff14}#xev .xevt{color:#8fb0d0;margin-right:5px;font-variant-numeric:tabular-nums}
body.touch #xev{width:210px;font-size:11px}body.touch #xev .xevl{max-height:130px}`;(document.head||document.documentElement).appendChild(st);}
setInterval(()=>{try{xevSync();}catch(e){}},800);
setTimeout(function xevNet(){if(typeof netCast!=='function'||typeof netClientRx!=='function'){setTimeout(xevNet,300);return;}
  const _c=netCast;netCast=function(m){try{if(m&&m.t==='st'&&NET.role==='host'&&XEV.out.length){m.xev=XEV.out.splice(0,TUNE.xn.ev.send);XEV.tx+=m.xev.length;}}catch(e){}return _c.apply(this,arguments);};
  const _r=netClientRx;netClientRx=function(m){const r=_r.apply(this,arguments);try{if(m&&m.t==='st'&&NET.role==='client'&&m.xev)for(const a of m.xev){XEV.rx++;xevAdd(a[0],a[1]!=null?{x:a[1],y:a[2]}:null,true);}}catch(e){}return r;};},0);

// ---- B3 護宗大陣被攻擊 → 附近能戰的弟子（含採集中）前往守陣；玩家不受影響 ----
TUNE.xn.rally={win:4,R:32,hurt:0.4,cd:1,toastCd:20};
const XRL={n:0,t:-99};
function xrlFoe(){if(!Y47.bOn)return null;const B=y47BS();if(S.time-(B.hit==null?-99:B.hit)>TUNE.xn.rally.win)return null;const c=Y47.bC||xhzCenter(),R=Y47.bR||8;let best=null,bd=1e9;
  for(const e of S.enemies){if(e.dead||e.hp<=0)continue;try{if(!y47BHostile(e))continue;}catch(er){}const d=dist(e.x,e.y,c.x,c.y);if(d<R+4&&d<bd){bd=d;best=e;}}return best;}
{const _u=updateDisciple;updateDisciple=function(u,dt){try{const T=TUNE.xn.rally;if(u&&!xnIsPC(u)&&u.kind==='disciple'&&!u.dead&&!u.inside&&!u.y47dn&&!u.y47dj&&!u.y47e&&!u.v170&&!u.v171&&!u.retreat&&!(typeof v49Client==='function'&&v49Client())&&S.time>(u.xrlT||0)){u.xrlT=S.time+T.cd;const t=u.task;
  if(!(t&&t.type==='attack')&&(u.atk||0)>0&&u.hp>=u.maxhp*T.hurt&&(!t||['gather','build','repair','meditate'].includes(t.type))){const e=xrlFoe();const c=Y47.bC;
    if(e&&c&&dist(u.x,u.y,c.x,c.y)<T.R){if(u.job==='gather'||u.job==='builder')u.xnd={st:'fight',eid:e.id,t0:S.time};u.task={type:'attack',eid:e.id};u.path=[];u.medit=false;u.working=false;u.xrl=e.id;XRL.n++;
      if(S.time-XRL.t>T.toastCd){XRL.t=S.time;xevHint(c);toast('⚠ 護宗大陣遭受攻擊！弟子前往守陣');}}}}}catch(e){}return _u.apply(this,arguments);};}

// ---- B4 同類全部升級：同類型、同等級的建築一次升級；資源不夠時告知可升幾座與缺多少（成員 → 房主） ----
function xupList(b){const lv=blv(b);if(lv>=LV_MAX)return [];return S.buildings.filter(o=>o.type===b.type&&o.built&&!o.broken&&!o.upg&&blv(o)===lv);}
function xupAll(bid){const b=bById(+bid);if(!b){return 0;}const L=xupList(b).sort((a,c)=>a===b?-1:c===b?1:0);if(!L.length){toast('沒有可升級的同類建築');return 0;}
  let n=0;const need={};let left=0;const t0=toast;
  for(const o of L){const c=upCost(o);if(canAfford(c)){toast=function(){};let ok=false;try{ok=startUpgrade(o);}finally{toast=t0;}if(ok){n++;continue;}}left++;addCost(need,c);}
  const short={};for(const k in need){const s=need[k]-Math.floor(S.res[k]||0);if(s>0)short[k]=s;}
  toast(`同類全部升級「${bName(b)}」Lv${blv(b)+(n?0:0)}→：已開始 ${n} 座${left?`；還有 ${left} 座資源不足（缺 ${Object.keys(short).length?costStr(short):'—'}）`:''}`);try{panelKeyCache=null;}catch(e){}return n;}
{const _e=extraActs;extraActs=function(b){const a=_e.apply(this,arguments);try{if(b&&b.built&&!b.broken&&!b.upg){const L=xupList(b);if(L.length>=2)a.push(`<button class="btn up" data-xupall="${b.id}">⬆⬆ 同類全部升級（${L.length} 座 Lv${blv(b)}→${blv(b)+1}）</button>`);}}catch(e){}return a;};}
addEventListener('click',ev=>{const t=ev.target&&ev.target.closest&&ev.target.closest('[data-xupall]');if(!t)return;ev.stopPropagation();ev.preventDefault();xupAll(+t.dataset.xupall);try{panelKeyCache=null;}catch(e){}},true);

// ---- B5 「自動選上品」後，落選的候選人成為流浪者（在宗門附近遊歷，之後仍可招攬；房主權威）----
{const _a=autoPickCands;autoPickCands=function(bid){const n=_a.apply(this,arguments);try{if(n>0&&!(typeof v49Client==='function'&&v49Client())){const rest=S.cands.filter(c=>bid==null||c.bid===bid);const b=bById(bid)||hallB();let k=0;
    for(const c of rest){const a=rnd()*Math.PI*2,r=3+rnd()*3;const cx=(b?b.i+BUILD[b.type].size/2:player().x)+Math.cos(a)*r,cy=(b?b.j+BUILD[b.type].size/2:player().y)+Math.sin(a)*r;const f=nearestFree(cx,cy,-1)||{i:Math.floor(cx),j:Math.floor(cy)};
      const w=makeWanderer(c,f.i+0.5,f.j+0.5,{fav:20});w.xfc=1;addWanderer(w);k++;const i=S.cands.indexOf(c);if(i>=0)S.cands.splice(i,1);}
    if(k)toast(`其餘 ${k} 位落選者成為流浪者，在宗門附近遊歷，之後仍可招攬`);}}catch(e){console.warn('[xfc]',e);}return n;};}
setTimeout(function xbReg(){if(typeof netFwd!=='function'||typeof NET==='undefined'||!window.XW||!XW.xn){setTimeout(xbReg,200);return;}
  if(!NET_FWD.xupAll)xupAll=netFwd('xupAll',xupAll,0,{max:1});if(!NET_FWD.autoPickCands)autoPickCands=netFwd('autoPickCands',autoPickCands,0,{max:1});
  XW.xn.pb={cam:(x,y,z)=>{const q=iso(x,y);cam.x=q.x;cam.y=q.y;cam.follow=false;if(z)cam.zoom=z;},openSet:()=>openSettings(),title:on=>showTitle(on),ev:()=>({n:XEV.L.length,rx:XEV.rx,tx:XEV.tx,pan:XEV.pan||0,last:XEV.L.slice(-5).map(e=>[e.m,!!e.loc])}),evOpen:v=>XEVP.set(v),menu:()=>xnMenuUp(),
    rally:()=>({n:XRL.n}),hit:()=>{y47BS().hit=S.time;},up:bid=>xupAll(bid),upList:bid=>xupList(bById(bid)).map(o=>o.id),wand:()=>(S.wand||[]).filter(w=>w.xfc).length,pick:bid=>autoPickCands(bid)};},0);

// ======================= v0.4.10 Fix-DBL 雙擊玩家只選該玩家（同類全選只限弟子） =======================
// 原因：隊員化身在房主端是 kind:'disciple'＋np，selectSameJob 會把它當成「閒置弟子」→ 全選所有同職務弟子；
//      房主自己的角色雙擊時 unitAt 也可能抓到旁邊的弟子。改為：雙擊點附近有玩家（房主或隊員）→ 只選那位玩家，攔下後續處理。
{const _ssj=selectSameJob;selectSameJob=function(u){if(xnIsPC(u)){xdblSel(u);return 1;}return _ssj.apply(this,arguments);};}
function xdblSel(u){selUnits=[u.id];selBuilding=null;selOther=null;panelKeyCache=null;}
function xdblPC(cx,cy){const w=screenToWorld(cx,cy);let best=null,bd=(isTouchUI?28:20)/Math.min(1,cam.zoom);
  for(const u of S.units){if(u.dead||u.inside||!xnIsPC(u))continue;const p=iso(u.x,u.y);const d=dist(w.x,w.y,p.x,p.y-14);if(d<bd){bd=d;best=u;}}return best;}
addEventListener('dblclick',ev=>{try{if(typeof cv==='undefined'||ev.target!==cv||S.dg)return;const u=xdblPC(ev.clientX,ev.clientY);if(!u)return;
  ev.stopImmediatePropagation();ev.preventDefault();xdblSel(u);XDBL.n++;}catch(e){}},true);
const XDBL={n:0};
setTimeout(()=>{XW.xn=XW.xn||{};XW.xn.dbl={n:()=>XDBL.n,at:(x,y)=>{const e=document.elementFromPoint(x,y);const u=xdblPC(x,y);return {el:e&&(e.id||e.tagName),cv:e===cv,u:u&&u.id};},sel:()=>selUnits.slice(),pcs:()=>S.units.filter(xnIsPC).map(u=>{const q=iso(u.x,u.y);return {id:u.id,kind:u.kind,x:q.x,y:q.y};}),
  scr:id=>{const u=unitById(id);const q=iso(u.x,u.y);const r=cv.getBoundingClientRect();return {x:r.left+(q.x-cam.x)*cam.zoom+W/2,y:r.top+(q.y-14-cam.y)*cam.zoom+H/2};}};},0);

// ======================= v0.4.10 Fix-RF 全部弟子格：境界篩選列（可與狀態／工作／隊伍篩選疊加） =======================
// V50.gr：null＝全部境界，否則為境界編號；只列出目前有弟子的境界並附人數；「選取這 N 人」跟著篩選結果。
{const _gl=v50GridList;v50GridList=function(){const L=_gl.apply(this,arguments);const r=V50.gr;return r==null?L:L.filter(u=>u.realm===r);};}
function xrfCounts(){const c={};for(const u of disciples())if(!u.dead)c[u.realm]=(c[u.realm]||0)+1;return c;}
{const _g=v50Grid;v50Grid=function(open){if(open===false)return _g.apply(this,arguments);
  const c=xrfCounts(),sig=JSON.stringify(c)+'|'+V50.gr;if(V50.gr!=null&&!c[V50.gr])V50.gr=null;if(sig!==V50.grSig){V50.grSig=sig;V50.gk=null;}
  const r=_g.apply(this,arguments);const g=document.getElementById('v50_grid');
  if(g&&!g.querySelector('.xrfrow')){const f=g.querySelector('.v50gf');if(f){const ks=Object.keys(c).map(Number).sort((a,b)=>b-a);const tot=ks.reduce((s,k)=>s+c[k],0);
    const ch=(k,t,n)=>`<button class="btn ${(V50.gr==null?'all':String(V50.gr))===k?'on':''}" data-gr="${k}">${t}<small>${n}</small></button>`;
    const row=document.createElement('div');row.className='v50gf xrfrow';row.innerHTML=`<span class="xrft">境界：</span>${ch('all','全部境界',tot)}${ks.map(k=>ch(String(k),REALMS[k]?REALMS[k].n:('境界'+k),c[k])).join('')}`;
    f.insertAdjacentElement('afterend',row);}}
  return r;};}
document.addEventListener('click',ev=>{const t=ev.target&&ev.target.closest&&ev.target.closest('#v50_grid [data-gr]');if(!t)return;ev.stopPropagation();
  V50.gr=t.dataset.gr==='all'?null:+t.dataset.gr;V50.gk=null;v50Grid();},true);
{const st=document.createElement('style');st.textContent=`#v50_grid .xrfrow .xrft{color:#d8c08a;font-size:.92em}
#v50_grid .xrfrow .btn.on{outline:1px solid #ffe9a0}
@media (max-width:600px){#v50_grid .xrfrow{flex-wrap:nowrap;overflow-x:auto;overscroll-behavior:contain;padding-bottom:2px;scrollbar-width:thin}#v50_grid .xrfrow>*{flex:none}}`;document.head.appendChild(st);}
setTimeout(()=>{XW.xn=XW.xn||{};XW.xn.rf={set:r=>{V50.gr=r;V50.gk=null;v50Grid();},list:()=>v50GridList().map(u=>u.id),open:()=>v50Grid(true),counts:xrfCounts};},0);

// ======================= v0.4.10 UI-T 全介面文字排版統一（純 CSS，低風險） =======================
// 一致行高、靠左、名字過長省略、時間／圖示欄固定寬、按鈕列平均；只動排版，不動顏色與位置。
{const st=document.createElement('style');st.id='xw_uit';st.textContent=`
:root{--xwlh:1.45}
#panel,#v50_grid,#xev,#netpt,#xwptw,#settings,#saves,#recmenu,#help{line-height:var(--xwlh);text-align:left}
#panel .btn,#v50_grid .btn,#xev .btn,#netpt .btn,#xwptw .btn,#settings .btn,#saves .btn,#recmenu .btn{line-height:1.25;vertical-align:middle;white-space:nowrap}
#panel h4,#xev h4,#v50_grid .v50gh b{white-space:nowrap;overflow:hidden;text-overflow:ellipsis;min-width:0}
#v50_grid .v50gu{min-width:0;overflow:hidden}
#v50_grid .v50gu>b,#v50_grid .v50gu>s,#v50_grid .v50gu>em{display:block;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:100%}
#v50_grid .v50gf,#settings .trow>span:last-child{gap:4px}
#netpt .ptr,#xwptw .ptr{min-width:0}
#netpt .ptr b,#xwptw .ptr b,#netpt .ptn,#xwptw .ptn{white-space:nowrap;overflow:hidden;text-overflow:ellipsis;min-width:0}
#xev .xevi{display:grid;grid-template-columns:3.1em minmax(0,1fr);column-gap:4px;align-items:start}
#xev .xevt{margin-right:0;text-align:left}
#xev .xevm{min-width:0;overflow-wrap:anywhere}
#panel .grid{align-items:baseline}
`;document.head.appendChild(st);}

// ======================= v0.4.10 Fix-NP 頭頂排版：由上而下「名牌（你・名字）→ 名字・境界 → 血條／靈氣條」，互不重疊 =======================
// 原因：境界標籤只避開「別人的」框，自己的血條／靈氣條升高時會被自己的標籤蓋住；名牌用固定高度估算，也會壓到標籤。
// 改為：標籤也避開自己的條；名牌依本幀自己所有框（條＋標籤）的實際最高點再往上留 4px。
{const _nd=netDrawNames;netDrawNames=function(){try{const z=cam.zoom;const top={};for(const b of XLB.boxes){if(!b.s)continue;top[b.o]=Math.min(top[b.o]==null?1e9:top[b.o],b.s.y0);}
  for(const id in top){const u=unitById(+id);if(!u||!xnIsPC(u))continue;const p=iso(u.x,u.y);const base=u.qiMax>0?60:57;
    const need=(p.y-base-cam.y)-((top[id]-4)-H/2)/z;if(need>0)XLB.dy[id]=Math.max(XLB.dy[id]||0,need);}}catch(e){}return _nd.apply(this,arguments);};}

// ======================= v0.4.10 Fix-DC 敵人死亡後不再放招 =======================
// 原因：首領／菁英的預警圈（D.mech.marks）在出招當下就排好，施放者中途被打死，圈還是會倒數完照樣爆炸傷人。
// 改為：每幀（房主與成員端各自）清掉「施放者已死亡／已不在」的預警圈、延遲傷害與正在詠唱的招式。
const XDC={n:0};
function xdcDead(id){const e=enemyById(id);return !e||e.dead||!(e.hp>0);}
function xdcClean(){try{const D=S.dg;if(D&&D.mech&&D.mech.marks&&D.mech.marks.length){const M=D.mech.marks;for(let i=M.length-1;i>=0;i--){const m=M[i];const own=m.bid!=null?m.bid:(m.v49?null:D.boss);
      if(own!=null&&!m.done&&xdcDead(own)){M.splice(i,1);XDC.n++;}}}
    for(const e of S.enemies){if((e.dead||!(e.hp>0))&&e.v49b&&e.v49b.cast){e.v49b.cast=null;XDC.n++;}}}catch(er){}}
{const _t=v49BTickMarks;v49BTickMarks=function(dt){xdcClean();return _t.apply(this,arguments);};}
setInterval(xdcClean,150);
setTimeout(()=>{XW.xn=XW.xn||{};XW.xn.dc={n:()=>XDC.n,clean:xdcClean,marks:()=>S.dg&&S.dg.mech?S.dg.mech.marks.map(m=>({bid:m.bid,t:+m.t.toFixed(2),done:!!m.done})):null};},0);

// ======================= v0.4.10 Fix-AQ 村莊委託達成自動回報 =======================
// 討伐：數量達成即自動交差；送貨：倉庫資源足夠即自動扣除交付（不用走回村莊、不用點）。獎勵立刻入帳、跳提示並記入事件欄。
// 聯機：只在房主端判定與發獎（成員端看同步結果；事件欄經房主事件同步給成員）。
const XAQ={n:0};
function xaqTick(){try{if(typeof NET!=='undefined'&&NET.role==='client')return;if(!S||!S.villages||titleOpen)return;
  for(const v of S.villages){const q=v.quest;if(!q||!q.accepted)continue;const ok=q.type==='hunt'?q.got>=q.count:q.type==='deliver'?(S.res[q.res]||0)>=q.amt:false;if(!ok)continue;
    const nv=nearVillage;nearVillage=function(){return true;};let r=false;try{r=completeQuest(v.id);}finally{nearVillage=nv;}if(r){XAQ.n++;}}}catch(e){}}
setInterval(xaqTick,1000);
{const _t=toast;toast=function(m){if(typeof m==='string')m=m.replace('，回村莊回報完成','，自動回報領獎');return _t.apply(this,[m].concat([].slice.call(arguments,1)));};}
setTimeout(()=>{XW.xn=XW.xn||{};XW.xn.aq={n:()=>XAQ.n,tick:xaqTick};},0);

// ======================= v0.4.10 Fix-EN 所有敵人名牌都帶境界（秘境、大地圖、首領） =======================
// 原因：美術版 drawBeast（狼／虎／豬／石甲妖王）蓋掉了 v0.5.1 的「名字・境界」名牌改寫，秘境裡只剩名字。
// 改為：最外層包住 drawBeast，畫名牌的第一個 label 若沒有「・境界」就補上（境界看不透時顯示「???」，和其他地方一致）。
const XENP={cur:null,done:false,n:0};
{const _db=drawBeast;drawBeast=function(e){const c=XENP.cur,d=XENP.done;XENP.cur=e;XENP.done=false;try{return _db.apply(this,arguments);}finally{XENP.cur=c;XENP.done=d;}};}
{const _lb=label;label=function(t,x,y,c,f){const e=XENP.cur;if(e&&!XENP.done&&typeof t==='string'&&t){XENP.done=true;
  try{if(!/・/.test(t)){const rn=typeof v51RName==='function'?v51RName(e):(REALMS[e.realm]||{}).n;if(rn){t=t+'・'+rn;XENP.n++;}}}catch(er){}}return _lb.apply(this,[t,x,y,c,f]);};}

// ======================= v0.4.10 Fix-BC 突破條件文字寫清楚（✔ 足夠／✖ 還缺 N） =======================
// 原因：「✖ 混沌靈根：額外靈石 120（目前 141）」實際判定的是「額外 120＋突破本身的靈石」合計，字面只寫 120 → 看起來 141≥120 卻打叉。
// 改為：混沌靈根列寫出合計需求；所有「X N（…目前 M）」形式的消耗／持有條件改寫成「持有 M，足夠」或「持有 M，還缺 K」。判定（ok）不變。
function xbcFix(u,c){try{if(!c||!Array.isArray(c.list))return c;const have=Math.floor(S.res.lingshi||0);
  for(const x of c.list){if(!x||typeof x.t!=='string'||x.xbc)continue;let m;
    if((m=/^混沌靈根：額外靈石 (\d+)/.exec(x.t))){const ex=+m[1];let base=0;try{base=[TUNE.lianqiLs,TUNE.zhujiLs,TUNE.jindanLs][u.realm-3]||0;}catch(e){}const tot=ex+base;
      x.t=`混沌靈根突破需額外消耗靈石 ${ex}${base?`（連同突破本身 ${base}，共需 ${tot}）`:''}：持有 ${have}，${x.ok?'足夠':'還缺 '+Math.max(1,tot-have)}`;x.xbc=1;continue;}
    if((m=/^(.+?) (\d+)（([^）]*?)目前 (\d+)([^）]*)）$/.exec(x.t))&&!/修為/.test(m[1])){const need=+m[2],hv=+m[4];const pre=m[3].replace(/，$/,'');
      x.t=`${m[1]} ${need}（${pre?pre+'；':''}持有 ${hv}${m[5]}，${x.ok?'足夠':hv<need?'還缺 '+(need-hv):'未達成'}）`;x.xbc=1;}}}catch(e){}return c;}
{const _bc=breakConds;breakConds=function(u){return xbcFix(u,_bc.apply(this,arguments));};}
setTimeout(()=>{XW.xn=XW.xn||{};XW.xn.bc={conds:id=>{const u=unitById(id)||player();return breakConds(u).list.map(x=>[x.ok,x.t]);}};},0);

// ======================= v0.4.10 Fix-DM 秘境內的小地圖／大地圖 =======================
// 原因：秘境裡小地圖被 CSS 隱藏，按「大地圖」只剩一顆「關閉大地圖」。改為：秘境裡小地圖與大地圖畫秘境平面
// （地板、房間：未踏入較暗／首領房偏紅），標記：你（白）、隊友（青＋名字）、弟子（藍）、敵人（紅）、首領（王）、撤離陣與出口傳送陣。秘境沒有迷霧，全圖顯示。
// 點小地圖＝鏡頭移過去（秘境裡不從地圖下移動指令）。
const XDM={n:0,T:null};
function xdmT(){const D=S.dg;const n=DGN,ic=DGO+n/2;const s=Math.min(mm.width/(2*n+2),mm.height/(n+1))*1;return {s,ox:mm.width/2,oy:mm.height/2-s*ic};}
function xdmPt(T,x,y){return {x:T.s*(x-y)+T.ox,y:T.s/2*(x+y)+T.oy};}
function xdmDraw(){const D=S.dg;if(!D||!D.L)return false;const T=xdmT();XDM.T=T;XDM.n++;const L=D.L,k=mmBig?2.2:1;
  mctx.setTransform(1,0,0,1,0,0);mctx.fillStyle='#07090c';mctx.fillRect(0,0,mm.width,mm.height);
  mctx.save();mctx.setTransform(T.s,T.s/2,-T.s,T.s/2,T.ox,T.oy);
  const G=(typeof DGS!=='undefined'&&DGS[D.kind])||{};const roomOf=(i,j)=>{for(const r of L.rooms)if(i>=r.x0&&i<r.x0+r.w&&j>=r.y0&&j<r.y0+r.h)return r;return null;};
  for(let j=DGO;j<DGO+DGN;j++)for(let i=DGO;i<DGO+DGN;i++){const f=L.fl[j*N+i];if(f!==1&&f!==2)continue;const r=roomOf(i,j);
    mctx.fillStyle=f===2?'#3a4a5a':!r?'#5a5246':r.boss?(r.state==='idle'?'#5a3030':'#8a4040'):r.state==='idle'?'#4a4438':'#8a7c62';mctx.fillRect(i,j,1.02,1.02);}
  mctx.restore();
  const dot=(x,y,col,r)=>{const p=xdmPt(T,x,y);mctx.fillStyle=col;mctx.fillRect(p.x-r,p.y-r,2*r,2*r);return p;};
  const tag=(x,y,txt,col,bg)=>{const p=xdmPt(T,x,y);mctx.fillStyle=bg||'rgba(0,0,0,.65)';mctx.beginPath();mctx.arc(p.x,p.y,5*k,0,Math.PI*2);mctx.fill();mctx.strokeStyle=col;mctx.lineWidth=1.5;mctx.stroke();
    mctx.fillStyle=col;mctx.textAlign='center';mctx.font=`bold ${Math.round(6.5*k)}px sans-serif`;mctx.fillText(txt,p.x,p.y+2.3*k);return p;};
  try{if(D.ent){const p=tag(D.ent.x,D.ent.y,'撤','#7fd0ff');if(mmBig){mctx.font=`bold ${Math.round(5*k)}px sans-serif`;mctx.fillText('撤離陣',p.x,p.y-6*k);}}
    if(D.exitP){const p=tag(D.exitP.x,D.exitP.y,'出','#ffe27a');if(mmBig){mctx.font=`bold ${Math.round(5*k)}px sans-serif`;mctx.fillText('出口傳送陣',p.x,p.y-6*k);}}
    const br=L.rooms.find(r=>r.boss);const be=D.boss!=null?S.enemies.find(e=>e.id===D.boss&&!e.dead):null;
    if(be||br){const x=be?be.x:br.cx,y=be?be.y:br.cy;const p=tag(x,y,'王','#ff6a5a');if(mmBig){mctx.font=`bold ${Math.round(5*k)}px sans-serif`;mctx.fillText(be&&be.dgName||G.bossN||'首領',p.x,p.y-6*k);}}}catch(e){}
  for(const e of S.enemies){if(e.dead||(D.boss!=null&&e.id===D.boss))continue;dot(e.x,e.y,'#ff4040',1.3*k);}
  const me=player();
  for(const u of S.units){if(u.dead||u.inside||u===me)continue;if(xnIsPC(u)){const p=dot(u.x,u.y,'#5ff0ff',2*k);if(mmBig){mctx.fillStyle='#9ff8ff';mctx.font=`bold ${Math.round(5*k)}px sans-serif`;mctx.textAlign='center';mctx.fillText(String(u.np&&u.np.name||u.name||'道友').slice(0,4),p.x,p.y-3*k);}}else dot(u.x,u.y,'#5fa0ff',1.4*k);}
  if(me&&!me.dead){const p=dot(me.x,me.y,'#ffffff',2.4*k);mctx.strokeStyle='#ffd75e';mctx.lineWidth=1;mctx.strokeRect(p.x-3.2*k,p.y-3.2*k,6.4*k,6.4*k);}
  try{const cs=[screenToWorld(0,0),screenToWorld(W,0),screenToWorld(W,H),screenToWorld(0,H)].map(w=>{const t=unIso(w.x,w.y);return xdmPt(T,t.x,t.y);});
    mctx.strokeStyle='rgba(255,255,255,.7)';mctx.lineWidth=1;mctx.beginPath();mctx.moveTo(cs[0].x,cs[0].y);for(let q=1;q<4;q++)mctx.lineTo(cs[q].x,cs[q].y);mctx.closePath();mctx.stroke();}catch(e){}
  return true;}
{const _d=drawMinimap;drawMinimap=function(){try{if(S.dg&&!S.interior&&xdmDraw())return;}catch(e){}return _d.apply(this,arguments);};}
setInterval(()=>{try{if(S.dg&&!titleOpen)drawMinimap();}catch(e){}},250);
{const st=document.createElement('style');st.textContent='html body.indg #minimap{display:block!important}';document.head.appendChild(st);}
function xdmPan(ev){const r=mm.getBoundingClientRect(),T=XDM.T;const mx=(ev.clientX-r.left)*mm.width/r.width,my=(ev.clientY-r.top)*mm.height/r.height;const u=(mx-T.ox)/T.s,v=(my-T.oy)/(T.s/2);
  const q=iso((u+v)/2,(v-u)/2);cam.x=q.x;cam.y=q.y;cam.follow=false;cam.pan=1;cam.pvx=cam.pvy=0;XDM.pan=(XDM.pan||0)+1;}
{const _c=y201Cam;y201Cam=function(ev){if(S.dg&&XDM.T){try{xdmPan(ev);}catch(e){}return;}return _c.apply(this,arguments);};}
{const _o=y201Order;y201Order=function(ev){if(S.dg)return false;return _o.apply(this,arguments);};}
setTimeout(()=>{XW.xn=XW.xn||{};XW.xn.dm={n:()=>XDM.n,pan:()=>XDM.pan||0,big:on=>setMMBig(on)};},0);

// ======================= v0.4.10 Fix-PV 建造位置：說清楚擋住的原因、同訊息不重複 =======================
// 原本 placementValid 只回 true/false，連「資源不足」「有敵人站著」「大殿未建成」都顯示成「被樹木、石頭、水…擋住」。
// 改為逐項檢查並說出第一個擋住的原因；同一句提示 1.2 秒內不重複跳出。
const XPV={last:'',t:0,n:0,dup:0};
// 草叢、漿果叢在畫面上看起來就是一片草地（玩家也能直接走過去）→ 不再擋建造；蓋下去時順手清掉（樹木、石頭、靈草仍然擋）。
const XPV_SOFT={fiber:1,berry:1};
function xpvSoft(type,i0,j0,f){const s=BUILD[type]?BUILD[type].size:0,tmp=[];for(let j=j0;j<j0+s;j++)for(let i=i0;i<i0+s;i++){if(i<0||j<0||i>=N||j>=N)continue;const k=j*N+i,n=nodeGrid[k];if(block[k]===1&&n&&!n.gone&&XPV_SOFT[n.type]&&!occ[k]){block[k]=0;tmp.push(k);}}
  try{return f();}finally{for(const k of tmp)block[k]=1;}}
function xpvClear(b){const s=BUILD[b.type].size;let c=0;for(let j=b.j;j<b.j+s;j++)for(let i=b.i;i<b.i+s;i++){const k=j*N+i,n=nodeGrid[k];if(n&&!n.gone&&XPV_SOFT[n.type]){n.gone=true;n.amount=0;S.nodeMods[n.id]=0;nodeGrid[k]=null;c++;}}if(c){rebuildBlock();try{chunkDirtyAt(b.i,b.j);}catch(e){}}return c;}
{const _pv=placementValid;placementValid=function(type,i0,j0){return xpvSoft(type,i0,j0,()=>_pv.call(this,type,i0,j0));};}
{const _tp=tryPlace;tryPlace=function(){const n0=S.buildings.length;const g=buildMode?ghostOrigin():null,t=buildMode;const r=g?xpvSoft(t,g.i,g.j,()=>_tp.apply(this,arguments)):_tp.apply(this,arguments);try{if(S.buildings.length>n0)xpvClear(S.buildings[S.buildings.length-1]);}catch(e){}return r;};}

function xpvWhy(type,i0,j0){const D=BUILD[type];if(!D)return '未知建築';const s=D.size;
  if(i0<1||j0<1||i0+s>N-1||j0+s>N-1)return '超出地圖邊界';
  const NM={tree:'樹木',rock:'石頭',stone:'石頭',ore:'礦石',iron:'鐵礦',fiber:'草叢',berry:'漿果叢',herb:'靈草'};
  let w={};for(let j=j0;j<j0+s;j++)for(let i=i0;i<i0+s;i++){const k=j*N+i;
    if(!explored[k]){w.fog=1;continue;}const t=terrain[k];if(t===T.SHALLOW||t===T.WATER){w.water=1;continue;}if(t===T.CLIFF){w.cliff=1;continue;}
    if(block[k]){const o=occ[k];if(o){if(S.buildings.includes(o))w.bld=(BUILD[o.type]||{}).name||'建築';else w.vs=1;continue;}const n=nodeGrid[k];if(n&&!n.gone&&XPV_SOFT[n.type]&&!occ[k])continue;if(n&&!n.gone){w.node=NM[n.type]||'樹木或石頭';continue;}w.other=1;}}
  if(w.fog)return '尚未探索這一帶（先派人過去探索）';if(w.bld)return `被「${w.bld}」擋住`;if(w.vs)return '被柵欄／村莊建物擋住';if(w.node)return `被${w.node}擋住`;
  if(w.water)return '有水，不能蓋在水上';if(w.cliff)return '有懸崖';if(w.other)return '地面被擋住（無法通行的格子）';
  for(const v of S.villages)if(dist(i0+s/2,j0+s/2,v.x,v.y)<10)return `離${v.name||'村莊'}太近（要隔 10 格以上）`;
  if(S.enemies.some(e=>!e.dead&&e.x>=i0-0.3&&e.x<i0+s+0.3&&e.y>=j0-0.3&&e.y<j0+s+0.3))return '有敵人站在這裡';
  const lk=buildLock(type);if(lk)return lk;
  if(!canAfford(D.cost)){const miss=Object.keys(D.cost).filter(k=>(S.res[k]||0)<D.cost[k]).map(k=>`${RES_NAMES[k]||k} 還缺 ${D.cost[k]-(S.res[k]||0)}`);return '資源不足：'+miss.join('、');}
  if(typeof v46GapOk==='function'&&!v46GapOk(type,i0,j0))return `離其他建築太近（建築之間要留 ${TUNE.bldGap} 格走道）`;
  return null;}
{const _t=toast;toast=function(msg){try{const m=String(msg);if(/^這裡不能建造|^建築之間要留|^資源不足/.test(m)){const now=performance.now();if(m===XPV.last&&now-XPV.t<1200){XPV.dup++;XPV.t=now;return;}XPV.last=m;XPV.t=now;}}catch(e){}return _t.apply(this,arguments);};}
{const _tp=tryPlace;tryPlace=function(shift){try{if(buildMode&&!(typeof Y197!=='undefined'&&Y197.force)){const g=ghostOrigin();if(g&&!placementValid(buildMode,g.i,g.j)){const why=xpvWhy(buildMode,g.i,g.j)||'位置不合適';XPV.n++;if(!(typeof Y197!=='undefined'&&Y197.quiet))toast('這裡不能建造：'+why);return;}}}catch(e){}return _tp.apply(this,arguments);};}
setTimeout(()=>{XW.xn=XW.xn||{};{const _pa=XW.placeAt;if(_pa&&!_pa.xpv){XW.placeAt=function(t,i,j){const b=xpvSoft(t,i,j,()=>_pa(t,i,j));if(b)try{xpvClear(b);}catch(e){}return b;};XW.placeAt.xpv=1;}}XW.xn.pv={why:(t,i,j)=>xpvWhy(t,i,j),valid:(t,i,j)=>placementValid(t,i,j),st:()=>({...XPV}),
  scan:(t,cx,cy,R)=>{const o=[];for(let j=Math.floor(cy-R);j<cy+R;j++)for(let i=Math.floor(cx-R);i<cx+R;i++){const v=placementValid(t,i,j),w=xpvWhy(t,i,j);if(v!==(w===null))o.push({i,j,v,w});}return o;},
  scr:(t,i,j)=>{const s=BUILD[t].size,w=iso(i+s/2,j+s/2);return worldToScreen(w.x,w.y);},
  place:(t,i,j)=>{const s=BUILD[t].size,w=iso(i+s/2,j+s/2),q=worldToScreen(w.x,w.y);buildMode=t;ghostAt={x:q.x,y:q.y};const n0=S.buildings.length;tryPlace(false);const ok=S.buildings.length>n0;buildMode=null;return ok;},
  free:(t,cx,cy,R)=>{const o=[];for(let j=Math.floor(cy-R);j<cy+R;j++)for(let i=Math.floor(cx-R);i<cx+R;i++)if(placementValid(t,i,j))o.push([i,j]);return o;}};},0);

// ======================= v0.4.10 Fix-OH 離線超過 1 天（現實時間 24 小時）的玩家化身從世界隱藏 =======================
// 條件：u.np 且 u.netOff（聯機層標記，含開始離線的時間 at）且離線超過 TUNE.xn.offHideMin 分鐘（預設 1440＝24 小時）。
// 隱藏＝不畫人物與名牌、不在小地圖、不能點選／框選、不參與推擠與鄰近查詢（敵人也不會找上它）。重新上線（netOff 清掉）立即恢復。組隊面板照常列為離線。
TUNE.xn=TUNE.xn||{};if(TUNE.xn.offHideMin==null)TUNE.xn.offHideMin=1440;
const XOH={n:0};
function xohHid(u){const o=u&&u.np&&u.netOff;if(!o||!o.at)return false;const m=TUNE.xn.offHideMin;return m!=null&&m>=0&&Date.now()-o.at>m*60000;}
function xohMask(fn){return function(){const hs=[];try{for(const u of S.units)if(!u.inside&&xohHid(u)){u.inside=-1;hs.push(u);}}catch(e){}XOH.n=hs.length;try{return fn.apply(this,arguments);}finally{for(const u of hs)if(u.inside===-1)u.inside=null;}};}
{const _dh=drawHuman;drawHuman=function(u){if(xohHid(u))return;return _dh.apply(this,arguments);};}
netDrawNames=xohMask(netDrawNames);unitAt=xohMask(unitAt);boxSelect=xohMask(boxSelect);drawMinimap=xohMask(drawMinimap);
{const _nb=nbBuild;nbBuild=function(list){return _nb.call(this,Array.isArray(list)&&list.some(xohHid)?list.filter(u=>!xohHid(u)):list);};}
{const _sp=separate;separate=function(list){return _sp.call(this,Array.isArray(list)&&list.some(xohHid)?list.filter(u=>!xohHid(u)):list);};}
setInterval(()=>{try{if(typeof selUnits!=='undefined'&&selUnits.length){const f=selUnits.filter(id=>!xohHid(unitById(id)));if(f.length!==selUnits.length)selUnits=f;}}catch(e){}},500);
setTimeout(()=>{XW.xn=XW.xn||{};XW.xn.oh={hid:id=>xohHid(unitById(id)),list:()=>S.units.filter(xohHid).map(u=>u.id),n:()=>XOH.n};},0);
// 手機：秘境狀態框會蓋住右上的小地圖 → 秘境裡小地圖往下讓開（大地圖不受影響）
setInterval(()=>{try{const want=S.dg&&!mmBig&&!titleOpen;let mt='';if(want){const h=document.getElementById('v48dgl');const el=h&&h.parentElement;if(el&&el.offsetParent){mm.style.marginTop='';const a=el.getBoundingClientRect(),b=mm.getBoundingClientRect();
  if(a.bottom>b.top&&a.top<b.bottom&&a.right>b.left&&a.left<b.right)mt=Math.ceil(a.bottom-b.top+6)+'px';}}if(mm.style.marginTop!==mt)mm.style.marginTop=mt;}catch(e){}},300);

// ======================= v0.4.10 UI-TB 上方列精簡 =======================
// 電腦：上方列只留 弟子(J) 修煉(C) 行囊(I) 地圖(M) 與「⚙ 設定」；分配、指南、教學、說明、聯機、存檔、讀取、暫停、標題 搬進「⚙ 設定」下拉清單（原按鈕本身搬過去，快捷鍵照舊）。
// 手機：上方圖示只留 ☁ 弟 修 ▦ ☰；⏸ 🌐 ? 已在 ☰ 選單裡（暫停／聯機／修仙指南），從上方列拿掉。
const XTB={moved:['b_alloc','b_guidepc','b_tutpc','b_help','b_netpc','b_save','b_load','b_pausepc','b_new'],open:false,n:0};
{const st=document.createElement('style');st.id='xw_tb';st.textContent=`
#xsm{position:fixed;z-index:60;display:none;flex-direction:column;gap:3px;min-width:190px;padding:6px;background:#1c140cf2;border:1px solid #8a6a3a;border-radius:8px;box-shadow:0 6px 20px #000a}
#xsm.open{display:flex}#xsm .btn{display:flex!important;justify-content:space-between;align-items:center;gap:12px;width:100%;text-align:left;margin:0}
#xsm .xsmk{color:#cdbb92;font-size:12px;opacity:.85}#xsm .xsmh{font-size:12px;color:#cdbb92;padding:2px 4px 4px;border-bottom:1px solid #8a6a3a55;margin-bottom:2px}
#b_setpc.on{background:#5a4020}
body.touch #b_pause,body.touch #b_net,body.touch #b_guide{display:none!important}`;document.head.appendChild(st);}
function xtbInit(){const bar=document.getElementById('menuBar');if(!bar||document.getElementById('b_setpc'))return !!bar;
  const pane=document.createElement('div');pane.id='xsm';pane.className='ui';pane.innerHTML='<div class="xsmh">⚙ 設定與選單</div><button class="btn" id="xsm_set"><span>⚙ 遊戲設定（畫面、音效、按鍵）</span><span class="xsmk"></span></button>';document.body.appendChild(pane);
  for(const id of XTB.moved){const b=document.getElementById(id);if(b){b.classList.add('xsmi');pane.appendChild(b);}}
  const bt=document.createElement('button');bt.className='btn';bt.id='b_setpc';bt.textContent='⚙ 設定';const ref=document.getElementById('b_bigmap');if(ref&&ref.parentElement===bar)ref.after(bt);else bar.appendChild(bt);
  bt.addEventListener('click',ev=>{ev.stopPropagation();xtbOpen(!XTB.open);});
  document.getElementById('xsm_set').addEventListener('click',()=>{xtbOpen(false);try{openSettings();}catch(e){}});
  pane.addEventListener('click',ev=>{if(ev.target.closest('.btn'))setTimeout(()=>xtbOpen(false),0);});
  addEventListener('pointerdown',ev=>{if(XTB.open&&!ev.target.closest('#xsm,#b_setpc'))xtbOpen(false);},true);
  addEventListener('keydown',ev=>{if(XTB.open&&ev.key==='Escape'){xtbOpen(false);}},true);
  return true;}
function xtbOpen(on){const p=document.getElementById('xsm'),b=document.getElementById('b_setpc');if(!p||!b)return;XTB.open=!!on;
  if(on){XTB.n++;// 快捷鍵標示：取按鈕文字裡的（X），沒有就顯示空白
    const r=b.getBoundingClientRect();p.style.top=Math.round(r.bottom+4)+'px';p.style.left=Math.round(Math.max(4,Math.min(innerWidth-200,r.left)))+'px';}
  p.classList.toggle('open',XTB.open);b.classList.toggle('on',XTB.open);}
setInterval(()=>{try{if(!xtbInit())return;const pane=document.getElementById('xsm');let mv=false;for(const id of XTB.moved){const e=document.getElementById(id);if(e&&e.parentElement!==pane){mv=true;break;}}
  if(mv)for(const id of XTB.moved){const e=document.getElementById(id);if(e){e.classList.add('xsmi');pane.appendChild(e);}}}catch(e){}},300);
setTimeout(()=>{XW.xn=XW.xn||{};XW.xn.tb={open:on=>xtbOpen(on),st:()=>({open:XTB.open,bar:[...document.getElementById('menuBar').children].filter(e=>getComputedStyle(e).display!=='none').map(e=>e.textContent.trim()),menu:[...document.querySelectorAll('#xsm .btn')].map(e=>e.textContent.trim())})};},0);

// ======================= v0.4.10 Fix-EAT 弟子餓了會真的走去食堂吃飯 =======================
// 原因：有工作（採集、建造…）的弟子從不進「空閒決策」，餓到 100 就在原地默默扣 1 份食物，看起來從不去食堂。
// 改為：有工作的凡人弟子餓到 TUNE.xn.eatAt（預設 80）且有食堂、有食物 → 放下手上工作走到最近食堂門口，坐下吃 TUNE.xn.eatStay 秒（🍚 用餐中），
// 扣 1 份食物、飢餓歸零、心情加，然後回去原本的工作。沒有食堂就照舊在原地吃乾糧（現在會顯示「吃乾糧」）。只限弟子（u.np 玩家角色不受影響）；聯機時由房主決定。
TUNE.xn=TUNE.xn||{};if(TUNE.xn.eatAt==null)TUNE.xn.eatAt=80;if(TUNE.xn.eatStay==null)TUNE.xn.eatStay=2.5;
const XEAT={go:0,ate:0,ration:0};
// 飲食／睡眠不得攔截正在執行的新玩家移動或攻擊令；不延長命令、不更改職務。
function xneedsOrder(u){if(typeof xPlayerOrder==='function')return !!xPlayerOrder(u);return !!(u&&((u.task&&u.task.man)||(u.xcmd&&S.time<u.xcmd.until)||(typeof xmvOn==='function'&&xmvOn(u))));}
function xeatOk(u){return u&&u.kind==='disciple'&&!u.np&&!u.dead&&!(typeof xnIsPC==='function'&&xnIsPC(u))&&!y47Bigu(u);}
{const _uu=updateUnit;updateUnit=function(u,dt){
  if(!xeatOk(u)||S.dg||S.interior||(typeof NET!=='undefined'&&NET.role==='client'))return _uu.apply(this,arguments);
  try{if(u._xh>=99.9&&u.hunger<=56&&!u.xeat){floater(u.x,u.y,'吃乾糧','#d8c89a');XEAT.ration++;}u._xh=u.hunger;}catch(e){}
  try{let E=u.xeat;const ordered=xneedsOrder(u);
    // Normal work jobs such as gather run with task=null; they still need the existing meal detour.
    if(!E&&!ordered&&(u.task||(u.job&&u.job!=='guard'&&u.job!=='follow'))&&!(u.task&&/attack|flee|guard|defend|rescue|follow/.test(u.task.type||''))&&!u.target&&!u.aiJob&&!u.inside&&u.hunger>=TUNE.xn.eatAt&&S.res.food>=TUNE.y47f.meal&&u.hp>=u.maxhp*0.5){const b=y47NearShitang(u);
      if(b){const D=doorPt(b),f=nearestFree(D.x,D.y+0.3,unitComp(u));if(f){E=u.xeat={st:'go',bid:b.id,tx:f.i+0.5,ty:f.j+0.5,t0:S.time,task:u.task};u.path=[];u.repath=0;u.thought=AI_ICON.eat;XEAT.go++;}}}
    if(E){const b=bById(E.bid);const abort=!b||!b.built||b.broken||u.hp<u.maxhp*0.4||S.time-E.t0>45||u.task!==E.task||u.aiJob||ordered;
      if(abort){u.xeat=null;u.thought=null;u.path=[];return _uu.apply(this,arguments);}
      if(E.st==='go'){u.repath-=dt;const r=walkTo(u,dt,E.tx,E.ty,1.2);if(r===null){u.xeat=null;u.path=[];return _uu.apply(this,arguments);}if(r){E.st='eat';E.t1=S.time;u.dvx=u.dvy=0;floater(u.x,u.y,'🍚 用餐中','#ffe9a0');}moveEntity(u,dt);return;}
      if(E.st==='eat'){u.dvx=u.dvy=0;u.thought=AI_ICON.eat;moveEntity(u,dt);if(S.time-E.t1>=TUNE.xn.eatStay){const T=TUNE.y47f;if(S.res.food>=T.meal){S.res.food-=T.meal;u.hunger=0;u.mood=Math.min(100,(u.mood||60)+T.mood+5*blv(b));floater(u.x,u.y,'好吃！','#ffe9a0');XEAT.ate++;}
          u.xeat=null;u.thought=null;u.path=[];u.repath=0;}return;}}
  }catch(e){u.xeat=null;}
  return _uu.apply(this,arguments);};}
// 用餐中：頭上畫碗＋小動作
{const _dh=drawHuman;drawHuman=function(u){const r=_dh.apply(this,arguments);try{if(u&&u.xeat&&u.xeat.st==='eat'&&!u.inside){const p=P(u.x,u.y);const bob=Math.sin(performance.now()/180)*1.5;ctx.font='12px sans-serif';ctx.textAlign='center';ctx.fillText('🍚',p.x+9,p.y-14+bob);}}catch(e){}return r;};}
setTimeout(()=>{XW.xn=XW.xn||{};XW.xn.eat={st:()=>({...XEAT}),u:id=>{const u=unitById(id);return u&&{h:u.hunger,xeat:u.xeat&&{st:u.xeat.st,bid:u.xeat.bid},task:u.task&&u.task.type,x:u.x,y:u.y};}};},0);
// #12 組隊視窗（預設位置）放好之後目標欄才長高 → 會壓到目標欄。每 0.4 秒檢查：重疊就重新排位。
setInterval(()=>{try{const el=document.getElementById('netpt');if(!el||el.style.display==='none'||el.dataset.saved||el.classList.contains('ptdragging')||el.classList.contains('xwdragged'))return;
  const a=XU49.rect('netpt');if(!a)return;for(const id of ['objectives','hint','tutbub']){const r=XU49.rect(id);if(r&&XU49.hit(a,r,0)){netPtPlace(el);break;}}}catch(e){}},400);

// ======================= v0.4.10 Fix-SLP 有工作的弟子也會去睡覺 =======================
// 原因：只有「空閒」的弟子會進入休息決策；被指派職務（伐木、採石…）的弟子從不睡，精力一路掉。
// 改為：凡人弟子（非玩家化身）夜裡精力 < TUNE.y47s.night 或任何時候 < TUNE.y47s.low → 暫時放下職務，走去最近的住房睡覺（進屋＝畫面上消失，精力回復），
// 守衛職務照常值夜不睡。沒有住房就原地打盹（💤）；睡飽（白天、精力 ≥98）後回到原本的職務。玩家下了新命令就以新命令為準。聯機時由房主決定。
const XSLP={go:0,wake:0};
{const _uu=updateUnit;updateUnit=function(u,dt){
  try{if(u&&u.kind==='disciple'&&!u.np&&!u.dead&&!S.dg&&!S.interior&&!(typeof NET!=='undefined'&&NET.role==='client')&&!(typeof xnIsPC==='function'&&xnIsPC(u))){
    const Z=u.xslp;
    if(Z){if(u.job&&u.job!==Z.job0){u.xslp=null;}// 玩家改派了職務
      else if(xneedsOrder(u)){if(!(u.task&&u.task.type==='attack'))u.xslp=null;}
      else if(!u.aiJob){const locked=Z.minUntil!=null&&S.time<Z.minUntil&&(u.slp||0)<98;
        if(locked){aiStart(u,'rest');if(u.aiJob){u.aiJob.y47sl=1;u.aiJob.until=Math.max(u.aiJob.until,Z.minUntil);u.thought=AI_ICON.rest;}}
        else{u.xslp=null;if(!u.job&&Z.job){u.job=Z.job;if(Object.prototype.hasOwnProperty.call(Z,'jobB'))u.jobB=Z.jobB;}u.task=null;u.path=[];XSLP.wake++;floater(u.x,u.y,'☀ 起床上工','#ffe9a0');}}}
    else if(u.job&&u.job!=='rest'&&u.job!=='guard'&&!xneedsOrder(u)&&!(u._xslpNo>S.time)&&!u.aiJob&&!u.xeat&&!y47Bigu(u)&&u.slp!=null&&((isNight()&&u.slp<TUNE.y47s.night)||u.slp<TUNE.y47s.low)&&u.hp>=u.maxhp*0.35&&!u.target&&!(u.task&&/attack|flee|guard|defend|rescue/.test(u.task.type||''))){
      const job=u.job,jobB=u.jobB;u.job=null;if(u.inside)try{exitBuilding(u);}catch(e){}u.task=null;u.path=[];aiStart(u,'rest');
      if(u.aiJob){const mn=S.time+(TUNE.xn&&TUNE.xn.slpMin||25);u.aiJob.y47sl=1;u.aiJob.until=Math.max(u.aiJob.until,mn);u.xslp={job,jobB,job0:null,t0:S.time,minUntil:mn};u.thought=AI_ICON.rest;XSLP.go++;}else{u.job=job;u.jobB=jobB;}}}}catch(e){}
  return _uu.apply(this,arguments);};}
UNIT_KEEP.push('xslp');
// 宗主剛指派的工作優先：指派後 90 秒內不因睏倦放下（也修正聯機成員指派後被房主睡覺邏輯改成 null）
{const _aj=assignJob;assignJob=function(u){const r=_aj.apply(this,arguments);try{if(r&&u){u._xslpNo=S.time+90;if(u.xslp)u.xslp=null;}}catch(e){}return r;};}
setTimeout(()=>{XW.xn=XW.xn||{};XW.xn.slp={st:()=>({...XSLP}),u:id=>{const u=unitById(id);return u&&{slp:u.slp,job:u.job,ai:u.aiJob&&{k:u.aiJob.k,job:u.aiJob.job},inside:u.inside,inB:u.inB,xslp:!!u.xslp,x:u.x,y:u.y};}};},0);

// ======================= v0.4.10 弟子戰鬥選項（卡片／多選）=======================
// 姿態：主動攻擊（預設，原本行為）／只反擊（只打正在打自己的敵人，宗主指定的目標照打）／避戰（不主動接戰，敵人靠近就退開）
// 撤退血量：低於此比例就撤退療傷（預設 30% = 全域值；可調高）。位置：跟隨宗主（職務「跟隨」）／駐守此地（職務「守衛」，守在目前位置）。
// 只作用於凡人弟子（非玩家化身）；聯機時由房主設定與判定，成員不顯示這一列。
TUNE.xn.co={hp:[0.3,0.5,0.7],avoidR:5,reT:3};
const XCO={n:0,cut:0,avoid:0,ret:0};
function xcoOk(u){return u&&u.kind==='disciple'&&!u.np&&!u.dead&&!(typeof xnIsPC==='function'&&xnIsPC(u));}
function xcoGet(u){return u.xco||{st:'agg',hp:TUNE.retreatHp};}
{const _st=setTask;setTask=function(u,t){if(t&&t.type==='attack'&&u&&(XCO.man||selUnits.includes(u.id)))t.man=1;return _st.apply(this,arguments);};}
{const _cm=commandMove;commandMove=function(){XCO.man=1;try{return _cm.apply(this,arguments);}finally{XCO.man=0;}};}
{const _uu=updateUnit;updateUnit=function(u,dt){
  try{if(u&&u.xco&&xcoOk(u)&&!S.dg&&!(typeof v49Client==='function'&&v49Client())){const C=u.xco,T=TUNE.xn.co;
    if(C.st!=='agg'&&u.task&&u.task.type==='attack'&&!u.task.man){const e=S.enemies.find(x=>x.id===u.task.eid);
      const hitsMe=e&&e.target&&e.target.k==='u'&&e.target.id===u.id;
      if(C.st==='avoid'||(C.st==='def'&&!hitsMe)){u.task=u.prevTask&&u.prevTask.type!=='attack'?u.prevTask:null;u.prevTask=null;u.path=[];XCO.cut++;}}
    if(C.st==='avoid'&&!u.retreat&&!u.inside&&S.time-(u._xcoT||-9)>T.reT){const e=nearestEnemy(u.x,u.y,T.avoidR);if(e&&!(u.task&&u.task.man)){u._xcoT=S.time;if(typeof v46Retreat==='function'&&v46Retreat(u)){XCO.avoid++;floater(u.x,u.y,'避戰','#a0d0ff');}}}
    if(C.hp>TUNE.retreatHp&&!u.retreat&&u.hp<u.maxhp*C.hp&&!u.inside&&S.time-(u._xcoT||-9)>T.reT&&nearestEnemy(u.x,u.y,8)){try{if((u.task&&u.task.man)||(u.xcmd&&S.time<u.xcmd.until)||(typeof xPlayerOrder==='function'&&xPlayerOrder(u))){/* hold */}else{u._xcoT=S.time;if(typeof v46Retreat==='function'&&v46Retreat(u)){XCO.ret++;floater(u.x,u.y,'撤退療傷','#ffb0a0');}}}catch(ex){u._xcoT=S.time;if(typeof v46Retreat==='function'&&v46Retreat(u)){XCO.ret++;floater(u.x,u.y,'撤退療傷','#ffb0a0');}}}}}catch(e){}
  const C=u&&u.xco&&(u.xco.st!=='agg')&&xcoOk(u)?u:null;if(!C)return _uu.apply(this,arguments);const sv=XCO.cur;XCO.cur=C;try{return _uu.apply(this,arguments);}finally{XCO.cur=sv;}};}
// 姿態生效：該弟子更新期間，「找最近敵人」只看正在打自己的敵人（只反擊）或完全不看（避戰）
{const _ne=nearestEnemy;nearestEnemy=function(x,y,r){const u=XCO.cur;if(!u)return _ne.apply(this,arguments);if(u.xmv&&xmvOn(u))return null;if(!u.xco||u.xco.st==='agg')return _ne.apply(this,arguments);if(u.xco.st==='avoid')return null;
  let best=null,bd=r;for(const e of S.enemies){if(e.dead||!(e.target&&e.target.k==='u'&&e.target.id===u.id))continue;const d=dist(x,y,e.x,e.y);if(d<bd){bd=d;best=e;}}return best;};}
UNIT_KEEP.push('xco');
function xcoSet(ids,k,v){let n=0;for(const id of ids){const u=unitById(id);if(!xcoOk(u))continue;n++;
  if(k==='st'||k==='hp'){const C=u.xco||(u.xco={st:'agg',hp:TUNE.retreatHp});C[k]=v;if(C.st==='agg'&&C.hp<=TUNE.retreatHp)u.xco=null;}
  else if(k==='pos'){if(v==='follow')assignJob(u,'follow');else{assignJob(u,'guard');u.guardAt={x:u.x,y:u.y};}}}
  XCO.n++;return n;}
const XCO_ST=[['agg','主動攻擊'],['def','只反擊'],['avoid','避戰']];
function xcoHtml(us){const C=xcoGet(us[0]),same=k=>us.every(u=>xcoGet(u)[k]===C[k]);const b=(on,a,t,tt)=>`<span class="btn${on?' on':''}" data-xco="${a}" title="${tt||''}" style="padding:1px 6px;margin:1px;${on?'background:#6b4a1c;color:#ffe9a0':''}">${t}</span>`;
  let h=`<div class="sm" style="margin:2px 0"><b>⚔ 戰鬥</b>${us.length>1?`<span class="dim">（已選 ${us.length} 人）</span>`:''} `;
  for(const [k,t] of XCO_ST)h+=b(same('st')&&C.st===k,'st:'+k,t,{agg:'看到敵人就迎戰（預設）',def:'只打正在攻擊自己的敵人；你指定的目標照打',avoid:'不主動接戰，敵人靠近就退開'}[k]);
  h+=` 撤退≤`;for(const v of TUNE.xn.co.hp)h+=b(same('hp')&&Math.abs(C.hp-v)<0.01,'hp:'+v,Math.round(v*100)+'%','氣血低於此比例就撤退療傷');
  const fol=us.every(u=>u.job==='follow'),gd=us.every(u=>u.job==='guard');
  h+=' '+b(fol,'pos:follow','跟隨宗主','跟著你行動')+b(gd,'pos:hold','駐守此地','守在目前位置，有敵人靠近就迎戰')+'</div>';return h;}
{const _rp=renderPanel;renderPanel=function(){const r=_rp.apply(this,arguments);try{const pn=document.getElementById('panel');let el=pn&&pn.querySelector('#xco');
  const us=(typeof v49Client==='function'&&v49Client())||S.dg?[]:selUnits.map(unitById).filter(xcoOk);
  if(!pn||!us.length||us.length!==selUnits.length){if(el)el.remove();return r;}
  if(!el){el=document.createElement('div');el.id='xco';el.style.cssText='border-top:1px solid rgba(255,220,150,.2);margin-top:3px;padding-top:2px';pn.appendChild(el);
    el.addEventListener('click',ev=>{const t=ev.target.closest('[data-xco]');if(!t)return;ev.stopPropagation();const [k,v]=t.dataset.xco.split(':');const n=xcoSet(selUnits.slice(),k,k==='hp'?+v:v);
      toast(`${n} 名弟子：${k==='st'?'姿態「'+XCO_ST.find(x=>x[0]===v)[1]+'」':k==='hp'?'氣血低於 '+Math.round(+v*100)+'% 撤退':v==='follow'?'跟隨宗主':'駐守此地'}`);el.dataset.h='';});}
  const h=xcoHtml(us);if(el.dataset.h!==h){el.dataset.h=h;el.innerHTML=h;}else if(el!==pn.lastElementChild)pn.appendChild(el);}catch(e){}return r;};}

// ======================= v0.4.10 弟子突破最佳化（沿用 #170 自主突破）=======================
// 弟子要去閉關衝關前：①自動服用共用庫存中最好的「突破丹」（開關「弟子突破自動服丹」，預設開）②在同類建築中挑靈氣最好的（在聚靈陣範圍內＋等級高）
// ③宗主正在大殿講道且弟子能受益時，改到大殿聽道衝關（若加成更高）④突破面板顯示成功率與各項加成明細；結果記入事件欄。只限弟子。
TUNE.xn.bo={jl:0.02,lec:0.04};
const XBO={pill:0,lec:0,jl:0,log:[]};
function xboJl(x,y){let lv=0;try{for(const j of xjlList())if(dist(x,y,j.x,j.y)<=j.R)lv=Math.max(lv,j.lv);}catch(e){}return lv*TUNE.xn.bo.jl;}
function xboHall(u){for(const b of S.buildings)if(b.type==='hall'&&b.built&&!b.broken&&xn13Lect(b)){const h=xn13Lect(b);if(h!==u&&!(typeof xn13Over==='function'&&xn13Over(u,h)))return b;}return null;}
function xboCtr(b){const s=BUILD[b.type].size;return {x:b.i+s/2,y:b.j+s/2};}
function xboBonus(u,b){if(!b)return xboJl(u.x,u.y);const c=xboCtr(b);return xboJl(c.x,c.y)+(b.type==='hall'&&xn13Lect(b)?TUNE.xn.bo.lec:0);}
{const _vb=v170Bld;v170Bld=function(u){const b0=_vb.apply(this,arguments);try{if(!xcoOk(u))return b0;const ty=TUNE.v170.bld[u.realm];let best=b0,bs=b0?v170BBonus(b0)+xboBonus(u,b0):-1;
  for(const b of S.buildings){if(b.type!==ty||!b.built||b.broken)continue;const s=v170BBonus(b)+xboBonus(u,b);if(s>bs+1e-6){bs=s;best=b;}}
  const h=xboHall(u);if(h){const s=xboBonus(u,h);if(s>bs+1e-6){best=h;XBO.lec++;}}return best;}catch(e){return b0;}};}
{const _bb=v170BBonus;v170BBonus=function(b){return b&&b.type==='hall'?0:_bb.apply(this,arguments);};}
function xboPill(u){if(S.flags.xboOff||!xcoOk(u)||!v47Major(u)||(u.tpB||0)>0.001||pillN('tp')<=0)return false;const q=(S.pills.tp||[])[2]>0?2:(S.pills.tp||[])[1]>0?1:0;
  if(!usePill(u,'tp'))return false;XBO.pill++;try{xevHint(u);}catch(e){}toast(`💊 ${nm(u)}衝關前服下${QN[q]}「突破丹」（成功率 +${Math.round((u.tpB||0)*100)}%）`);return true;}
{const _vs=v170Start;v170Start=function(u,V){try{xboPill(u);}catch(e){}const r=_vs.apply(this,arguments);try{const b=V.bid!=null?bById(V.bid):null;V.xbo=xboBonus(u,b);if(V.xbo>0)XBO.jl++;}catch(e){}return r;};}
{const _bf=breakFail;breakFail=function(u){let f=_bf.apply(this,arguments);try{if(u&&u.v170&&u.v170.xbo&&u._v170b)f=Math.max(1-TUNE.v170.cap,f-u.v170.xbo);}catch(e){}return f;};}
{const _vn=v170Note;v170Note=function(m){try{XBO.log.push(m);}catch(e){}return _vn.apply(this,arguments);};}
// 明細
function xboParts(u){const P=[],sv=[u.tpB,u._v170b,u.v170];let base;try{u.tpB=0;u._v170b=0;u.v170=null;base=1-breakFail(u);}finally{u.tpB=sv[0];u._v170b=sv[1];u.v170=sv[2];}
  P.push(['基礎（境界、悟性、氣運、靈根、仙緣…）',base]);if(u.tpB>0)P.push(['已服突破丹',u.tpB]);
  else if(!S.flags.xboOff&&v47Major(u)&&pillN('tp')>0)P.push(['突破丹（衝關前自動服用，約）',[0.08,0.12,0.18][(S.pills.tp[2]>0?2:S.pills.tp[1]>0?1:0)]]);
  let b=null;try{b=v170Bld(u);}catch(e){}if(b&&b.type!=='hall')P.push([`閉關處「${BUILD[b.type].name}」Lv${blv(b)||1}`,v170BBonus(b)]);
  const c=v170Coach(u);if(c)P.push([`護法 ${nm(c)}`,v170CBonus(c,u)]);
  if(b){const cc=xboCtr(b),j=xboJl(cc.x,cc.y);if(j>0)P.push(['聚靈陣靈氣',j]);if(b.type==='hall'&&xn13Lect(b))P.push(['宗主講道',TUNE.xn.bo.lec]);}else{const j=xboJl(u.x,u.y);if(j>0)P.push(['聚靈陣靈氣',j]);}
  let tot=P.reduce((a,p)=>a+p[1],0);tot=Math.min(TUNE.v170.cap,Math.max(0,tot));return {P,tot,where:b?BUILD[b.type].name:'原地'};}
{const _bh=brkHtml;brkHtml=function(u,full){let h=_bh.apply(this,arguments);try{if(!xcoOk(u)||u.realm>=MAX_REALM||h.indexOf('<details class="dt"')<0)return h;const R=xboParts(u);
  const ln=`<div class="xbo sm" style="color:#d8e8b0">弟子衝關預估（${R.where}）：<b>${Math.round(R.tot*100)}%</b> ＝ `+R.P.map((p,i)=>`${i?'＋':''}${p[0]} ${Math.round(p[1]*100)}%`).join(' ')+
   ` <label style="white-space:nowrap" title="弟子衝關前自動從宗門庫存服用最好的突破丹"><input type="checkbox" data-xbo="1"${S.flags.xboOff?'':' checked'} onclick="event.stopPropagation();XW.xn.bo.tog(this.checked)">弟子突破自動服丹</label></div>`;
  h=h.replace('<details class="dt"',ln+'<details class="dt"');}catch(e){}return h;};}
setTimeout(()=>{XW.xn=XW.xn||{};XW.xn.co={st:()=>({...XCO}),set:(ids,k,v)=>xcoSet(ids,k,v),get:id=>{const u=unitById(id);return u&&{xco:u.xco,job:u.job,task:u.task,retreat:!!u.retreat};},html:()=>{const e=document.querySelector('#panel #xco');return e&&e.textContent;}};
  XW.xn.bo={st:()=>({...XBO,log:XBO.log.slice(-5)}),tog:on=>{S.flags.xboOff=!on;toast('弟子突破自動服丹：'+(on?'開':'關'));},parts:id=>{const u=unitById(id);return u&&xboParts(u);},start:id=>{const u=unitById(id);u.v170={st:'wait',t:S.time-1e4,cd:0};v170Start(u,u.v170);return u.v170;},res:id=>{const u=unitById(id);v170Resolve(u);}};},0);

// ======================= v0.4.10 Fix-MV 下令移動／撤退時不再硬鎖敵人 =======================
// 原因：右鍵移動後，宗門防衛（V164 鎖定來犯者）、守衛偵測、撤退回血後「再戰」、被打反擊、相鄰自動索敵等多處會直接把 u.task 改回攻擊。
// 改為：玩家的移動／撤退／集合指令 → 清掉攻擊目標、退出防衛名單；之後到達目的地前（或最多 TUNE.xn.mvGrace 秒）不自動接戰（含「主動攻擊」姿態與防衛集結）。
TUNE.xn.mvGrace=3;TUNE.xn.mvMax=12;
const XMV={n:0,block:0};
function xmvOn(u){const M=u&&u.xmv;if(!M)return false;if(S.time>M.until){u.xmv=null;return false;}return true;}
function xmvArm(us){for(const u of us||[]){if(!u||u.kind!=='disciple'||u.dead||(typeof xnIsPC==='function'&&xnIsPC(u))||u.np)continue;let t=u.task;if((!t||t.type!=='move')&&u.job==='guard'&&u.guardAt&&!(t&&t.type==='attack')){t={type:'move',x:u.guardAt.x,y:u.guardAt.y};u.task=t;u.path=[];pathTo(u,t.x,t.y);}if(!t||t.type!=='move')continue;
  u.target=null;u.prevTask=null;u.dash=null;if(u.v164){u.v164=null;const i=V164.ids.indexOf(u.id);if(i>=0)V164.ids.splice(i,1);if(u.v164g){u.v164g=null;}}
  u.xmv={x:t.x,y:t.y,g:u.job==='guard'&&u.guardAt?{x:u.guardAt.x,y:u.guardAt.y}:null,t0:S.time,until:S.time+TUNE.xn.mvMax,arr:false};XMV.n++;}}
{const _cm=commandMove;commandMove=function(us){const r=_cm.apply(this,arguments);try{xmvArm(us);}catch(e){}return r;};}
{const _b=v164Busy;v164Busy=function(u){return xmvOn(u)||_b.apply(this,arguments);};}
{const _uu=updateUnit;updateUnit=function(u,dt){
  if(!u||!u.xmv||!xmvOn(u))return _uu.apply(this,arguments);const M=u.xmv;
  const fix=()=>{if(!M.arr&&!u.task&&!u.inside&&dist(u.x,u.y,M.x,M.y)>=0.9){u.task={type:'move',x:M.x,y:M.y};u.path=[];if(!pathTo(u,M.x,M.y)){u.task=null;M.arr=true;}}if(M.g&&u.job==='guard'&&u.guardAt&&(u.guardAt.x!==M.g.x||u.guardAt.y!==M.g.y)){u.guardAt={x:M.g.x,y:M.g.y};XMV.block++;}if(u.task&&u.task.type==='attack'&&!u.task.man){u.task={type:'move',x:M.x,y:M.y};u.path=[];u.repath=0;XMV.block++;}};
  fix();const sv=XCO.cur;XCO.cur=u;let r;try{r=_uu.apply(this,arguments);}finally{XCO.cur=sv;}fix();
  if(!M.arr&&(dist(u.x,u.y,M.x,M.y)<0.9||(u.task&&u.task.type!=='move'&&u.task.type!=='attack'))){M.arr=true;M.until=Math.min(M.until,S.time+TUNE.xn.mvGrace);}
  if(u.task&&u.task.type==='attack'&&u.task.man)u.xmv=null;return r;};}
// 不經 updateUnit 的每秒掃描（防衛集結、守衛、撤退後再戰）也擋掉：結束後再修正一次
{const _tk=tickV045;tickV045=function(dt){const r=_tk.apply(this,arguments);try{for(const u of S.units)if(u.xmv&&xmvOn(u)&&u.xmv.g&&u.job==='guard')u.guardAt={x:u.xmv.g.x,y:u.xmv.g.y};if(u.xmv&&xmvOn(u)&&u.task&&u.task.type==='attack'&&!u.task.man){u.task={type:'move',x:u.xmv.x,y:u.xmv.y};u.path=[];XMV.block++;}}catch(e){}return r;};}
setTimeout(()=>{XW.xn=XW.xn||{};XW.xn.mv={st:()=>({...XMV}),cmd:(us,x,y)=>commandMove(us,x,y,false),u:id=>{const u=unitById(id);return u&&{xmv:u.xmv,task:u.task,v164:u.v164};}};},0);
// 姿態補強：宗門防衛集結（V164）不徵調「只反擊／避戰」弟子；每秒掃描後若被改成非指定的攻擊也立即撤銷
function xcoBlocks(u){const C=u&&u.xco;if(!C||C.st==='agg'||!xcoOk(u)||!u.task||u.task.type!=='attack'||u.task.man)return false;if(C.st==='avoid')return true;
  const e=S.enemies.find(x=>x.id===u.task.eid);return !(e&&e.target&&e.target.k==='u'&&e.target.id===u.id);}
{const _b=v164Busy;v164Busy=function(u){if(u&&u.xco&&u.xco.st!=='agg'&&xcoOk(u))return true;return _b.apply(this,arguments);};}
{const _tk=tickV045;tickV045=function(dt){const r=_tk.apply(this,arguments);try{for(const u of S.units)if(xcoBlocks(u)){u.task=u.prevTask&&u.prevTask.type!=='attack'?u.prevTask:null;u.prevTask=null;u.path=[];XCO.cut++;}}catch(e){}return r;};}

// ======================= v0.4.10 (a) 屬性上限：攻擊／防禦等仍 10000；氣血（hp／maxhp）不設硬上限 =======================
TUNE.xn.statCap=10000;
const XCAP={n:0,U:['maxhp','hp','atk','def','wu','luck','xy','gat','mood'],E:['maxhp','hp','atk','def']};
function xcapOne(o,keys){const C=TUNE.xn.statCap;for(const k of keys){if(k==='hp'||k==='maxhp')continue;const v=o[k];if(typeof v==='number'&&v>C){o[k]=C;XCAP.n++;}}}
function xwN(n){
  const neg=+n<0;n=Math.abs(+n);if(!isFinite(n))return '—';
  let s;if(n<1e4)s=String(Math.round(n));
  else if(n<1e8){const v=n/1e4;s=(v>=100?String(Math.round(v)):v.toFixed(1).replace(/\.0$/,''))+'萬';}
  else{const v=n/1e8;s=v.toFixed(v>=10?1:2).replace(/\.00$/,'').replace(/\.0$/,'')+'億';}
  return (neg?'-':'')+s;
}
function xwHpPair(a,b){return xwN(Math.ceil(a))+'/'+xwN(Math.ceil(b));}
{const _fl=floater;floater=function(x,y,text,col){try{if(typeof text==='string'&&/^[+-]?\d+(?:\.\d+)?$/.test(text)){const sign=text[0]==='+'||text[0]==='-'?text[0]:'';text=sign+xwN(Math.abs(+text));}}catch(e){}return _fl.call(this,x,y,text,col);};}
function xwFmtHud(){
  const set=(id,t)=>{const e=document.getElementById(id);if(e&&String(e.textContent)!==t)e.textContent=t;};
  try{
    const uid=typeof selUnits!=='undefined'&&selUnits&&selUnits[0];
    const u=uid!=null&&typeof unitById==='function'?unitById(uid):null;
    if(u){
      set('pd_hpt',xwHpPair(u.hp,u.maxhp));
      set('pd_mc','氣血 '+xwHpPair(u.hp,u.maxhp));
      if(u.atk!=null)set('pd_atk',xwN(u.atk));
      try{if(typeof capped==='function'&&!capped(u)&&typeof needXiu==='function')set('pd_xiut',xwN(Math.floor(u.xiu))+'/'+xwN(needXiu(u)));}catch(e){}
    }
    if(typeof selOther!=='undefined'&&selOther){
      if(selOther.k==='e'){const o=typeof enemyById==='function'?enemyById(selOther.id):null;if(o)set('pd_ehp',xwHpPair(o.hp,o.maxhp));}
      if(selOther.k==='s'){const o=(S.vstructs||[]).find(x=>x.id===selOther.id);if(o&&o.maxhp)set('pd_shp',xwHpPair(o.hp,o.maxhp));}
    }
  }catch(e){}
  try{
    document.querySelectorAll('#panel, #roster, #pd_list').forEach(root=>{
      root.querySelectorAll('b, span, .dim, .mini, .c3').forEach(el=>{
        if(el.children.length)return;
        const raw=(el.textContent||'');
        let t=raw.replace(/((?:氣血|血)\s*)(\d+)\/(\d+)/,(m,pre,a,b)=>pre+xwHpPair(+a,+b));
        t=t.replace(/^(\d+)\/(\d+)$/,(m,a,b)=>(+a>=10000||+b>=10000)?xwHpPair(+a,+b):m);
        if(t!==raw)el.textContent=t;
      });
    });
  }catch(e){}
}
{const _ui=updateUI;updateUI=function(){const r=_ui.apply(this,arguments);try{xwFmtHud();}catch(e){}return r;};}
function xcapAll(){if(!S||!S.units)return;for(const u of S.units)if(u&&!u.dead)xcapOne(u,XCAP.U);for(const e of S.enemies||[])if(e&&!e.dead)xcapOne(e,XCAP.E);}
setInterval(()=>{try{if(!(typeof v49Client==='function'&&v49Client()))xcapAll();}catch(e){}},500);
{const _db=doBreak;doBreak=function(u){const r=_db.apply(this,arguments);try{if(u)xcapOne(u,XCAP.U);}catch(e){}return r;};}

// 功法技能區塊已有獨立容器 #gf_sec／#gf_innate／#gf_learned；PC 的 #panel .mini{display:none} 不得波及此處，也不揭開其它 .mini。
// 掛入弟子／主角面板的「總覽」頁（.v55pane[data-p=ov]），讓玩家不用捲過財務／日誌就能看到。
{if(!document.getElementById('xwGfSkCss')){const st=document.createElement('style');st.id='xwGfSkCss';
st.textContent='#panel #gf_sec,#panel .v55pane #gf_sec{display:block}#panel #gf_sec .mini,#panel #gf_sec [data-gf-sub]{display:block;white-space:normal;overflow:visible;text-overflow:clip;overflow-wrap:anywhere;color:#e8dcb8;line-height:1.45}#panel #life_sec,#panel .v55pane #life_sec{display:block}#panel #life_sec .mini,#panel #life_sec #life_line{display:block;white-space:normal;overflow:visible;color:#ffe27a;line-height:1.45}';
document.head.appendChild(st);}}
function xwGfPlace(){
  const pn=document.getElementById('panel');if(!pn)return;
  const ov=pn.querySelector('.v55pane[data-p="ov"]');
  const host=(ov&&(ov.querySelector('.v55m')||ov))||pn;
  const life=document.getElementById('life_sec');
  const sec=document.getElementById('gf_sec');
  if(life&&host){
    if(life.parentNode!==host)host.insertBefore(life,sec&&sec.parentNode===host?sec:null);
    else if(sec&&sec.parentNode===host&&(life.compareDocumentPosition(sec)&2))host.insertBefore(life,sec);
  }
  if(sec&&host&&sec.parentNode!==host)host.appendChild(sec);
}
(function xwGfHookPaint(){
  function hook(){
    if(typeof renderPanel!=='function')return false;
    if(window.CultGF&&!window.__xwGfHooked){
      window.__xwGfHooked=1;
      const _rp=renderPanel;
      renderPanel=function(){const r=_rp.apply(this,arguments);try{xwGfPlace();}catch(e){}return r;};
      if(typeof CultGF.paint==='function'){const _p=CultGF.paint;CultGF.paint=function(){const r=_p.apply(this,arguments);try{xwGfPlace();}catch(e){}return r;};}
    }
    if(window.CultLife&&!window.__xwLifeHooked){
      window.__xwLifeHooked=1;
      const _rp2=renderPanel;
      renderPanel=function(){const r=_rp2.apply(this,arguments);try{xwGfPlace();}catch(e){}return r;};
      if(typeof CultLife.paint==='function'){const _p=CultLife.paint;CultLife.paint=function(){const r=_p.apply(this,arguments);try{xwGfPlace();}catch(e){}return r;};}
    }
    return !!(window.__xwGfHooked&&(!window.CultLife||window.__xwLifeHooked));
  }
  if(!hook()){let n=0;const t=setInterval(()=>{if(hook()||++n>80)clearInterval(t);},50);}
})();

// 踏仙梯過場：藏起 g 側浮動晶片（組隊鈕／組隊窗／聯機條／事件鈕等）。
// cult 已用 body.cult-xtl 開關 HUD；此層補上沒被 .ui 規則蓋到、或之後被 JS 設回 display 的晶片。
// 繼續遊玩或失敗時 cult 會拿掉 body.cult-xtl，晶片自動恢復。不改 cult*。
{if(!document.getElementById('xwXtlChipCss')){const st=document.createElement('style');st.id='xwXtlChipCss';
st.textContent='body.cult-xtl #xwptb,body.cult-xtl #xwptw,body.cult-xtl #netpt,body.cult-xtl #xev,body.cult-xtl #xevb,body.cult-xtl #xsm,body.cult-xtl #x47dbgbtn,body.cult-xtl #x47rchip,body.cult-xtl #x47cancel,body.cult-xtl #x47fan,body.cult-xtl #v175,body.cult-xtl #autosave,body.cult-xtl [data-xpto]{display:none!important;visibility:hidden!important;pointer-events:none!important;opacity:0!important}';
(document.head||document.documentElement).appendChild(st);}}

// ======================= v0.4.10 (b) 閃避（上限 40%）與「看破」=======================
// 閃避率：基礎 1.5% + 每個大境界 0.5% + 氣運×0.03% + 首領 3% + 額外 u.eva；上限 25%（真概率）。普攻與技能（有來源的傷害）都可閃避。
// 每次成功閃避有 0.2% 機率「看破」：下一次普攻或技能造成 1.5 倍傷害（浮字提示）。由房主判定。
TUNE.xn.eva={cap:0.25,base:0.015,realm:0.005,luck:0.0003,boss:0.03,kp:0.002,kpMul:1.5};
const XEVA={dodge:0,kp:0,kpHit:0,force:null};
function xevaRate(o){if(!o)return 0;const T=TUNE.xn.eva;let r=T.base+(o.realm||0)*T.realm+(o.luck||0)*T.luck+(o.eva||0);
  if(o.kind==null){const D=ENEMY[o.type];if((D&&D.boss)||o.boss||(S.dg&&S.dg.boss===o.id))r+=T.boss;else return Math.max(0,Math.min(T.cap,o.eva||0));}return Math.max(0,Math.min(T.cap,r));}
function xevaTry(src,dst,amt){if(!src||!dst||src===dst||!(amt>0)||dst.dead||(typeof v49Client==='function'&&v49Client()))return amt;
  let p=XEVA.force!=null?XEVA.force:xevaRate(dst);
  // 同大境界小階段：高者閃避 +sameSubDodge/階；高者攻擊時命中 +sameSubHit/階＝目標閃避減少。跨大境界不疊小階段。
  if(XEVA.force==null&&typeof xnSameSubSteps==='function'){const steps=xnSameSubSteps(src,dst); // src-dst：>0 攻方較高
    if(steps){const T=xnSuppGap(),cap=T.sameSubCap,fav=Math.min(cap,Math.abs(steps)*T.sameSubDodge);
      if(steps<0)p+=fav; else p=Math.max(0,p-Math.min(cap,Math.abs(steps)*T.sameSubHit));}
  }
  p=Math.max(0,Math.min(TUNE.xn.eva.cap,p));
  if(rnd()<p){XEVA.dodge++;floater(dst.x,dst.y,'閃避','#bfe6ff');if(rnd()<(XEVA.kpForce!=null?XEVA.kpForce:TUNE.xn.eva.kp)){dst.xkp=1;XEVA.kp++;floater(dst.x,dst.y-0.5,'看破！','#ffd24d');}return null;}
  if(src.xkp){src.xkp=0;XEVA.kpHit++;floater(dst.x,dst.y-0.4,'看破 ×1.5','#ffd24d');return amt*TUNE.xn.eva.kpMul;}return amt;}
{const _de=dmgEnemy;dmgEnemy=function(src,e,amt,col){if(src&&src.kind&&e&&!e.dead){const a=xevaTry(src,e,amt);if(a===null)return;amt=a;}return _de.call(this,src,e,amt,col);};}
{const _du=dmgUnit;dmgUnit=function(src,u,amt){if(src&&u&&!u.dead&&src.kind==null&&S.enemies.includes(src)){const a=xevaTry(src,u,amt);if(a===null)return;amt=a;}return _du.call(this,src,u,amt);};}
UNIT_KEEP.push('eva');

// ======================= v0.4.10 (c) 弟子戰鬥判斷：敵人境界明顯較高 → 不接戰，退到較高境界的同門身邊；敵人優先找高境界弟子 =======================
// 只限弟子（非玩家）。玩家指定的攻擊照打；判定「明顯較高」= 敵人境界 ≥ 弟子境界 + TUNE.xn.cj.gap。
TUNE.xn.cj={gap:2,cd:3,swap:2.5};
const XCJ={ret:0,swap:0};
function xcjNear(u){let best=null,bd=1e9;for(const c of S.units){if(c===u||c.dead||c.kind!=='disciple'||c.np||c.inside||(c.realm||0)<=(u.realm||0))continue;const d=dist(c.x,c.y,u.x,u.y);if(d<bd){bd=d;best=c;}}return best;}
{const _uu=updateUnit;updateUnit=function(u,dt){
  try{if(u&&xcoOk(u)&&!S.dg&&!u.retreat&&!(typeof v49Client==='function'&&v49Client())&&u.task&&u.task.type==='attack'&&!u.task.man&&S.time-(u._xcjT||-9)>TUNE.xn.cj.cd){
    const e=S.enemies.find(x=>x.id===u.task.eid);if(e&&!e.dead&&(e.realm||0)>=(u.realm||0)+TUNE.xn.cj.gap){u._xcjT=S.time;const c=xcjNear(u);u.task=null;u.prevTask=null;u.path=[];
      if(c){const f=nearestFree(Math.floor(c.x),Math.floor(c.y+1),unitComp(u));const tx=f?f.i+0.5:c.x,ty=f?f.j+0.5:c.y;u.task={type:'move',x:tx,y:ty};if(!pathTo(u,tx,ty))u.task=null;}
      else if(typeof v46Retreat==='function')v46Retreat(u);
      u.xmv={x:u.task?u.task.x:u.x,y:u.task?u.task.y:u.y,g:null,t0:S.time,until:S.time+6,arr:false};XCJ.ret++;floater(u.x,u.y,c?'敵強，退向'+nm(c):'敵強，撤退','#ffb0a0');}}}catch(er){}
  return _uu.apply(this,arguments);};}
setInterval(()=>{try{if(!S||S.dg||(typeof v49Client==='function'&&v49Client()))return;for(const e of S.enemies){if(e.dead||!e.target||e.target.k!=='u')continue;const t=unitById(e.target.id);if(!t||t.kind!=='disciple'||t.np)continue;
  const dt=dist(e.x,e.y,t.x,t.y);let best=null;for(const c of S.units){if(c===t||c.dead||c.inside||c.kind!=='disciple'||c.np||(c.realm||0)<=(t.realm||0))continue;if(dist(e.x,e.y,c.x,c.y)<=dt+TUNE.xn.cj.swap&&(!best||c.realm>best.realm))best=c;}
  if(best){e.target={k:'u',id:best.id};XCJ.swap++;}}}catch(er){}},1000);
setTimeout(()=>{XW.xn=XW.xn||{};XW.xn.fri={cap:()=>({...XCAP,U:0,E:0}),capAll:()=>xcapAll(),eva:o=>xevaRate(o),est:()=>({...XEVA}),force:(p,k)=>{XEVA.force=p;XEVA.kpForce=k;},cj:()=>({...XCJ})};},0);

// ======================= v0.4.11 P0：護宗陣攻打／名牌合併／村衛陣營／睡眠鎖定／採滿再回／單一行為排程／任務境界／閃避面板 =======================
TUNE.xn.slpMin=25;
TUNE.xn.sch={min:8,pri:{combat:100,danger:90,eat:70,sleep:60,event:50,job:40,ai:20}};
TUNE.xn.bAtk={cd:1.3,drain:0.55};
const XP0={shHit:0,shRip:0,lbl:0,fac:0,mine:0,sch:0,evGrey:0,evTake:0,eva:0};

function xschPC(u){return !u||u.kind!=='disciple'||u.np||(typeof xnIsPC==='function'&&xnIsPC(u));}
function xschGet(u){return u&&u.xsch;}
function xschBusy(u){const C=u&&u.xsch;return !!(C&&!C.done&&(C.until==null||S.time<C.until));}
function xschCommit(u,k,prio,dur){if(xschPC(u))return;u.xsch={k,prio:prio||0,t0:S.time,until:S.time+(dur!=null?dur:TUNE.xn.sch.min),done:0};XP0.sch++;}
function xschDone(u){if(u&&u.xsch)u.xsch.done=1;}
function xschCan(u,k,prio){if(xschPC(u))return true;const C=u.xsch;if(!C||C.done)return true;if((prio||0)>=90)return true;if(S.time>=(C.until||0)&&(prio||0)>(C.prio||0))return true;return false;}
const XSCH={auto:0};

{const _al=allocTick;allocTick=function(){XSCH.auto++;try{return _al.apply(this,arguments);}finally{XSCH.auto--;}};}
{const _aj=assignJob;assignJob=function(u,job){if(XSCH.auto&&u&&xschBusy(u)&&u.xsch.k!=='job')return false;const r=_aj.apply(this,arguments);try{if(r&&u&&!xschPC(u))xschCommit(u,'job',TUNE.xn.sch.pri.job,15);}catch(e){}return r;};}
{const _ad=aiDecide;aiDecide=function(u,force){if(!force&&u&&xschBusy(u)&&u.xsch.k!=='ai')return u.xsch.k;const k=_ad.apply(this,arguments);try{if(u&&u.aiJob&&!xschPC(u)&&u.xsch&&u.xsch.k!=='sleep')xschCommit(u,'ai',TUNE.xn.sch.pri.ai);}catch(e){}return k;};}
{const _ae=aiEnd;aiEnd=function(u){try{if(u&&u.xslp&&S.time<(u.xslp.minUntil||0)&&(u.slp||0)<98&&!(u._xslpNo>S.time)){if(!u.aiJob){aiStart(u,'rest');if(u.aiJob){u.aiJob.y47sl=1;u.aiJob.until=Math.max(u.aiJob.until,u.xslp.minUntil);u.thought=AI_ICON.rest;}}return;}if(u&&u.xsch&&(u.xsch.k==='ai'||u.xsch.k==='sleep'))xschDone(u);}catch(e){}return _ae.apply(this,arguments);};}
{const _da=doAiJob;doAiJob=function(u,dt){const a=u&&u.aiJob;if(a&&a.k==='rest'&&(u.slp||0)<98&&u.xslp&&u.xslp.minUntil>S.time)a.until=Math.max(a.until,u.xslp.minUntil);
  return _da.apply(this,arguments);};}

// ---- 1 護宗陣：停在陣邊攻擊，漣漪＋閃光，扣除陣力 ----
function y47BStrike(e){const B=y47BS();const atk=(e&&(e.atk||(ENEMY[e.type]||{}).atk))||5;const amt=atk*(TUNE.xn.bAtk.drain);B.e=Math.max(0,(B.e||0)-amt);B.hit=S.time;Y47.bFl=performance.now();Y47.rips=Y47.rips||[];Y47.rips.push({x:e.x,y:e.y,t:Y47.bFl});if(Y47.rips.length>24)Y47.rips.shift();
  try{fx('ring',e.x,e.y,'#c8f0ff');}catch(er){}XP0.shHit++;XP0.shRip++;
  try{xhzOnHit(e);}catch(er){}
  if(B.e<=0){B.e=0;B.br=S.time+TUNE.y47b.brokeCd;toast(`⚠ 護宗陣被攻破了！${TUNE.y47b.brokeCd} 秒後才能重新張開`);}}
{const _ue=updateEnemy;updateEnemy=function(e,dt,ct){try{if(e&&Y47.bOn&&y47BHostile(e)&&!e.flee&&!S.dg&&!(typeof v49Client==='function'&&v49Client())){const c=Y47.bC,R=Y47.bR;if(c&&R){const d=dist(e.x,e.y,c.x,c.y);if(e.xsh||d<=R+0.85){let tgt=null;if(e.target){if(e.target.k==='u')tgt=unitById(e.target.id);else tgt=bById(e.target.id);}
        const inside=tgt&&((tgt.kind&&dist(tgt.x,tgt.y,c.x,c.y)<R-0.2)||(tgt.type&&dist(tgt.i+(BUILD[tgt.type].size||2)/2,tgt.j+(BUILD[tgt.type].size||2)/2,c.x,c.y)<R));
        if(e.xsh||inside||(e.raid&&d<=R+0.85)){e.cd-=dt;e.anim=Math.max(0,e.anim-dt);e.scan-=dt;faceTo(e,c.x,c.y);e.path=[];e.dvx=e.dvy=0;
          if(!(e.cd>0)){y47BStrike(e);e.cd=TUNE.xn.bAtk.cd;e.anim=0.28;}moveEntity(e,dt);return;}}}}}catch(er){}
  return _ue.apply(this,arguments);};}
{const _db=y47DrawB;y47DrawB=function(){if(!xwRangeMapVisible())return;const r=_db.apply(this,arguments);try{const now=performance.now(),L=Y47.rips||[];if(!L.length||S.dg||S.interior||!y47BOn())return r;
    ctx.save();for(let i=L.length-1;i>=0;i--){const rp=L[i],age=now-rp.t;if(age>700){L.splice(i,1);continue;}const k=age/700,p=P(rp.x,rp.y,2);
      ctx.globalAlpha=0.85*(1-k);ctx.strokeStyle='#e8fbff';ctx.lineWidth=2.6-1.6*k;ctx.beginPath();ctx.ellipse(p.x,p.y,10+28*k,5+14*k,0,0,6.283);ctx.stroke();
      ctx.globalAlpha=0.55*(1-k);ctx.fillStyle='#fff';ctx.beginPath();ctx.arc(p.x,p.y-4,5+3*(1-k),0,6.283);ctx.fill();}
    ctx.restore();}catch(e){}return r;};}

// ---- 2 敵群名牌：每人各自顯示（不再合併成 ×N）；重疊時名牌上下錯開，單位也微推開 ----
// BATCH2100_RAID_LBL：使用者回報「大武師×3 但畫面只有一個名牌」——根因是同名合併。改為每隻都畫名牌（仍遵守 ??? 觀察規則）。
const XENL={cls:null,fr:0,hov:0,off:new WeakMap(),sepT:0};
function xenlBase(e){try{const D=ENEMY[e.type];const rn=typeof v51RName==='function'?v51RName(e):((REALMS[e.realm]||{}).n||'');return(D&&D.n||e.type)+'・'+rn;}catch(er){return e.type||'?';}}
function xenlBuild(){const g=new Map(),lookup=new WeakMap();
  // 名牌只畫在畫面內。簇距是 2.2 格或 48 等角像素，畫面外再留 4 格就不會漏掉貼邊的鄰居。
  let box=null;try{if(typeof viewTiles==='function'){const v=viewTiles();box={i0:v.i0-4,i1:v.i1+4,j0:v.j0-4,j1:v.j1+4};}}catch(err){}
  for(const e of S.enemies){if(!e||e.dead||e.hp<=0||e.inside)continue;if(box&&(e.x<box.i0||e.x>box.i1||e.y<box.j0||e.y>box.j1))continue;let b={x:0,y:0};try{b=P(e.x,e.y);}catch(er){}
    const key=xenlBase(e);if(!g.has(key))g.set(key,[]);g.get(key).push({e,b,key});}
  const cls=[];for(const [key,arr] of g){arr.sort((a,b)=>a.e.x-b.e.x||a.e.y-b.e.y);const used=new Set();
    for(let i=0;i<arr.length;i++){if(used.has(i))continue;const cl={key,mem:[arr[i]],rep:arr[i].e};used.add(i);
      for(let j=i+1;j<arr.length;j++){if(used.has(j))continue;if(Math.hypot(arr[j].e.x-arr[i].e.x,arr[j].e.y-arr[i].e.y)<2.2||Math.hypot(arr[j].b.x-arr[i].b.x,arr[j].b.y-arr[i].b.y)<48){cl.mem.push(arr[j]);used.add(j);}}
      cl.n=cl.mem.length;cl.mem.sort((a,b)=>(a.e.id||0)-(b.e.id||0));cl.mem.forEach((m,idx)=>{m.idx=idx;});
      if(cl.n>=2){cl.cx=cl.mem.reduce((s,m)=>s+m.b.x,0)/cl.n;cl.cy=cl.mem.reduce((s,m)=>s+m.b.y,0)/cl.n-40;cls.push(cl);for(const m of cl.mem)lookup.set(m.e,cl);}}}
  XENL.lookup=lookup;XENL.lookupCls=cls;XENL.cls=cls;return cls;}
// 每次分簇建立物件索引，避免每個名牌重新遍歷全體敵群；外部替換簇時沿舊查找。
function xenlOf(e){if(XENL.cls&&XENL.lookup&&XENL.lookupCls===XENL.cls){const hit=XENL.lookup.get(e);if(hit&&hit.mem.some(m=>m.e===e))return hit;}const cls=XENL.cls||[];for(const cl of cls)if(cl.mem.some(m=>m.e===e))return cl;return null;}
function xenlHover(cl){if(!mouse||!mouse.inside||isTouchUI)return false;try{for(const m of cl.mem){const b=m.b;if(Math.abs(mouse.x-b.x)<22&&mouse.y<b.y-16&&mouse.y>b.y-58)return true;}
    return Math.abs(mouse.x-cl.cx)<36&&Math.abs(mouse.y-cl.cy)<18;}catch(e){return false;}}
function xenlSeparate(){
  // 每 ~0.5s 把擠成一團的敵微推開（尤其來襲）
  if(!S||!S.enemies||S.interior)return;
  if(S.time-(XENL.sepT||0)<0.45)return;XENL.sepT=S.time;
  const L=S.enemies.filter(e=>e&&!e.dead&&e.hp>0&&!e.inside);
  for(let i=0;i<L.length;i++)for(let j=i+1;j<L.length;j++){
    const a=L[i],b=L[j];const d=dist(a.x,a.y,b.x,b.y);if(d>0.85||d<1e-6)continue;
    const push=(0.85-d)*0.5,ux=(b.x-a.x)/d,uy=(b.y-a.y)/d;
    a.x-=ux*push;a.y-=uy*push;b.x+=ux*push;b.y+=uy*push;
  }
}
{const _d=draw;draw=function(){XENL.cls=null;XENL.fr++;try{if(S&&S.enemies&&!S.interior){xenlBuild();xenlSeparate();}}catch(e){}return _d.apply(this,arguments);};}
{const _db=drawBeast;drawBeast=function(e){const c=XENL.cur;XENL.cur=e;try{return _db.apply(this,arguments);}finally{XENL.cur=c;}};}
// 每人各自名牌；同簇上下錯開，不再藏名／改成 ×N
{const _lb=label;label=function(t,x,y,c,f){const e=XENL.cur;if(e&&ENEMY[e.type]){try{const cl=xenlOf(e);if(cl&&cl.n>=2){const m=cl.mem.find(z=>z.e===e);const idx=m?m.idx:0;y=y-idx*11;x=x+((idx%2)?4:-4)*Math.min(1,idx);XP0.lbl++;}}catch(er){}}
  return _lb.apply(this,arguments);};}

// ---- 3 村衛不攻擊同村村勇 ----
function xfacFoe(e,v){if(!e||e.dead||!(e.hp>0))return false;if(e.type==='militia'){if(v&&(e.camp===v.id||e.vg===v.id))return false;return false;}return true;}
{const _f=v60Find;v60Find=function(n,v){const a=_f.apply(this,arguments);if(a&&!xfacFoe(a,v)){XP0.fac++;let best=null,bd=1e9;for(const e of S.enemies){if(!xfacFoe(e,v))continue;if(e.dead||e.hp<=0)continue;const T=TUNE.v60,R=T.vR+T.aggro;if(dist(e.x,e.y,v.x,v.y)>R)continue;if(typeof unitComp==='function'&&compAt(e.x,e.y)!==unitComp(n))continue;const d=dist(n.x,n.y,e.x,e.y);if(d<bd){bd=d;best=e;}}return best;}
  return a;};}

// ---- 5 採集：背包裝滿或達目標數量才回倉 ----
function xmineWant(u){const cap=typeof CARRY_CAP==='number'?CARRY_CAP:10;const w=u&&(u.xmineN||u.gatherNeed);return Math.max(1,Math.min(cap,w||cap));}
function xmineKeep(u){if(!u||u.job!=='gather'||(typeof v49Client==='function'&&v49Client()))return;const res=u.jobRes||'wood';if(!(u.carry&&u.carry.amt>0&&u.carry.type===res))return;
  const want=xmineWant(u);if(u.carry.amt>=want)return;if(u.jst!=='ret')return;
  const n=(typeof findNearestNode==='function'?findNearestNode(res,u.x,u.y,999,u):null)||(typeof v46FindNode==='function'?v46FindNode(u,res):null);
  if(n){u.jst=null;u.jnode=n.id;XP0.mine++;}}
{const _dj=doJob;doJob=function(u,dt){try{xmineKeep(u);}catch(e){}const r=_dj.apply(this,arguments);try{xmineKeep(u);}catch(e){}return r;};}

// ---- 7 任務境界：單人只接同境或以下；高境帶隊可 +1；無人能接則灰底，玩家可親自接 ----
function y47EvNeed(ev){return(TUNE.y47e.stageR[ev.st]!=null)?TUNE.y47e.stageR[ev.st]:0;}
function y47EvFit(u,ev,leader){if(!u||u.kind!=='disciple'||u.dead||u.np||(typeof xnIsPC==='function'&&xnIsPC(u)))return false;const need=y47EvNeed(ev),r=u.realm||0;
  if(r>=need)return true;if(leader&&(leader.realm||0)>r&&(leader.realm||0)>=need&&r>=need-1)return true;return false;}
{const _fr=y47EvFree;y47EvFree=function(u){if(u&&(u.xslp||(u.aiJob&&u.aiJob.y47sl)||u.xeat))return false;if(u&&xschBusy(u)&&u.xsch.k!=='event')return false;return _fr.apply(this,arguments);};}
{const _jn=y47EvJoin;y47EvJoin=function(a,u){try{const ev=y47EvDef(a.eid);const ms=y47EvMembers(a);if(ev&&!y47EvFit(u,ev,ms[0]))return;if(!xschCan(u,'event',TUNE.xn.sch.pri.event))return;}catch(e){}
  const r=_jn.apply(this,arguments);try{if(u&&u.y47e)xschCommit(u,'event',TUNE.xn.sch.pri.event,20);}catch(e){}return r;};}
function y47EvCanAnyone(ev){for(const u of S.units){if(y47EvFit(u,ev,null)&&_y47EvFree0(u))return true;}return false;}
const _y47EvFree0=y47EvFree;
function y47EvPlayerTake(a){if(!a||a.player||(a.st!=='post'&&a.st!=='gather'))return false;const ev=y47EvDef(a.eid),p=player();if(!ev||!p||p.dead)return false;
  for(const u of y47EvMembers(a))y47EvRelease(u);a.mem=[];a.player=1;a.st='go';a.tgo=S.time;const s=y47EvSite(ev,p);a.sx=s.x;a.sy=s.y;try{ping(s.x,s.y,true);}catch(e){}
  toast(`你親自接下宗門事務「${ev.n}」（前往${Y47EV_LOC[ev.loc]}）`);XP0.evTake++;return true;}
function y47EvPlayerStep(a){const ev=y47EvDef(a.eid),p=player(),T=TUNE.y47e;if(!ev)return;if(!p||p.dead){a.player=0;a.st='post';a.t0=S.time;return;}
  if(a.st==='go'){if(dist(p.x,p.y,a.sx,a.sy)<2.6||S.time-a.tgo>T.goMax){a.st='work';a.tw=S.time;a.dur=T.dur[ev.df];floater(p.x,p.y,'執行事務','#ffe08a');}}
  else if(a.st==='work'){if(S.time-a.tw>=a.dur){a.ok=true;p.y47e={k:a.k,t0:S.time};a.mem=[p.id];let txt='';try{txt=y47EvReward(a);}finally{p.y47e=null;a.mem=[];}
      toast(`✅ 宗門事務「${ev.n}」完成！${txt||''}`);y47EvLog(`你完成「${ev.n}」：${txt||''}`);const E=y47EvS();E.act=E.act.filter(x=>x!==a);E.done.push(a.eid);}}}
{const _tk=y47EvTick;y47EvTick=function(){const E=y47EvS();const held=(E.act||[]).filter(a=>a.player);if(held.length)E.act=E.act.filter(a=>!a.player);const r=_tk.apply(this,arguments);
  try{const E2=y47EvS();for(const a of held){if(!E2.act.includes(a))E2.act.push(a);y47EvPlayerStep(a);} }catch(e){}return r;};}
{const _h=y47EvHtml;y47EvHtml=function(){let h=_h.apply(this,arguments);try{const E=y47EvS(),T=TUNE.y47e;h=h.replace(/待接/g,(m,offset,full)=>{return m;});
    // mark grey + 親自接 for posted tasks nobody can auto-take
    const bits=[];for(const a of E.act){if(a.st!=='post'&&a.st!=='gather')continue;const ev=y47EvDef(a.eid);if(!ev)continue;const ok=S.units.some(u=>y47EvFit(u,ev,null)&&y47EvFree(u));
      if(!ok){XP0.evGrey++;bits.push({k:a.k,n:ev.n});}}
    if(bits.length)h+=bits.map(b=>`<div class="sm" style="margin:3px 0;opacity:.55" data-y47grey="${b.k}">「${b.n}」目前沒有弟子能接（境界不足） <button class="btn" data-y47take="${b.k}">親自接</button></div>`).join('');
  }catch(e){}return h;};}
setTimeout(function y47TakeBind(){const pn=document.getElementById('panel');if(!pn){setTimeout(y47TakeBind,400);return;}
  if(pn._y47tk)return;pn._y47tk=1;pn.addEventListener('click',ev=>{const t=ev.target.closest('[data-y47take]');if(!t)return;ev.preventDefault();const k=+t.dataset.y47take;const a=y47EvS().act.find(x=>x.k===k);if(a)y47EvPlayerTake(a);});},0);

// ---- 4 睡眠鎖定已在 XSLP；再擋事件搶人、最短時長承諾 ----
{const _uu=updateUnit;updateUnit=function(u,dt){try{if(u&&u.xslp&&!xschPC(u)&&( !u.xsch||u.xsch.k!=='sleep'))xschCommit(u,'sleep',TUNE.xn.sch.pri.sleep,(u.xslp.minUntil||S.time+TUNE.xn.slpMin)-S.time);}catch(e){}
  return _uu.apply(this,arguments);};}

// ---- 8 數值面板顯示閃避 ----
{const _rp=renderPanel;renderPanel=function(){const r=_rp.apply(this,arguments);try{if(selUnits.length!==1)return r;const u=unitById(selUnits[0]);if(!u||(u.kind!=='player'&&u.kind!=='disciple'))return r;
    const rate=typeof xevaRate==='function'?xevaRate(u):0;const txt=Math.round(rate*1000)/10+'%';
    let el=document.getElementById('pd_eva');
    if(!el){const grid=document.querySelector('#panel .grid');if(grid){const sp=document.createElement('span');sp.innerHTML=`閃避 <b id="pd_eva">${txt}</b>`;grid.appendChild(sp);el=sp.querySelector('#pd_eva');XP0.eva++;}}
    if(el&&el.textContent!==txt)el.textContent=txt;}catch(e){}return r;};}

UNIT_KEEP.push('xsch','xmineN');
setTimeout(function xp0Reg(){if(!window.XW||!XW.xn){setTimeout(xp0Reg,300);return;}
  if(typeof y47EvFit==='function'&&!y47EvFit._leadFix){
    y47EvFit=function(u,ev,leader){
      if(!u||u.kind!=='disciple'||u.dead||u.np||(typeof xnIsPC==='function'&&xnIsPC(u)))return false;
      const need=y47EvNeed(ev),r=u.realm||0;
      if(!(r>=need||(leader&&(leader.realm||0)>r&&(leader.realm||0)>=need&&r>=need-1)))return false;
      try{
        if(typeof econTaskFlag==='function'&&econTaskFlag()&&typeof econTaskCanTake==='function'&&typeof econTaskEnsure==='function'){
          const q=econTaskEnsure({realm:typeof econTaskRealmFromStage==='function'?econTaskRealmFromStage(ev&&ev.st):undefined,st:ev&&ev.st,df:ev&&ev.df,tier:(typeof econTaskTierFromDf==='function'&&ev&&ev.df!=null&&econTaskTierFromDf(ev.df))?econTaskTierFromDf(ev.df).id:undefined});
          if(q&&!econTaskCanTake(u,q,leader||null))return false;
        }
      }catch(e){}
      return true;
    };
    y47EvFit._leadFix=1;y47EvFit._econTask=1;
  }
  XW.xn.p0={st:()=>({...XP0,rips:(Y47.rips||[]).length}),fit:y47EvFit,need:y47EvNeed,foe:xfacFoe,want:xmineWant,take:k=>{const a=y47EvS().act.find(x=>x.k===k);return a&&y47EvPlayerTake(a);},
    strike:e=>y47BStrike(e),lbl:()=>{try{if(!XENL.cls)xenlBuild();}catch(e){}return XENL.cls;},sch:(u,k,p,d)=>xschCommit(u,k,p,d),v60:(n,v)=>v60Find(n,v)};},0);


// ======================= map PHASE1 hooks (g* only; map*/net* untouched) =======================
// 煉氣（當前或曾達 peak≥4／flags.xian）→ 開啟外層大地圖；讀檔／突破皆補解鎖
function xmapUnlockIf(){
  try{
    if(!S)return false;
    if(typeof mapMigrateSave==='function')mapMigrateSave(S);
    if(!S.map)return false;
    const need=(typeof MAP_TUNE!=='undefined'&&MAP_TUNE.unlockRealm!=null)?(MAP_TUNE.unlockRealm|0):4;
    const peak=(typeof xwPeakRealm==='function'?xwPeakRealm():0)|0;
    const ok=peak>=need||!!(S.flags&&S.flags.xian);
    if(!ok)return false;
    S.flags=S.flags||{};S.flags.xian=true;
    if(!S.map.flags||typeof S.map.flags!=='object')S.map.flags={};
    // mapUnlock 內部看 mapFlag('world')——必須先打開，否則永遠 no-op
    S.map.flags.world=true;
    // 進入外層內容需要的相關旗（副本入口／飛往／城市）
    S.map.flags.dungeons=true;S.map.flags.travel=true;S.map.flags.cities=true;
    const was=!!S.map.unlocked;
    if(typeof mapUnlock==='function'){
      mapUnlock(S.seed);
      // 保底：若旗已開但仍未 unlocked（舊檔／遷移殘態），強制再解一次
      if(!S.map.unlocked){S.map.unlocked=false;mapUnlock(S.seed);}
    }
    try{if(S.map.unlocked&&typeof mapGatesPopulate==='function'&&!(S.map.gates&&S.map.gates.length))mapGatesPopulate();}catch(e){}
    try{if(S.map.unlocked&&typeof mapCitiesPopulate==='function'&&!(S.map.cities&&S.map.cities.length))mapCitiesPopulate();}catch(e){}
    // map:unlock 事件會 toast；若事件沒掛上才補提示
    if(S.map.unlocked){
      try{xmapPlaceEntryGates();}catch(e){}
      try{xmapGateHud();}catch(e){}
    }
    if(!was&&S.map.unlocked){
      try{const hasEv=typeof XW!=='undefined'&&XW&&typeof XW.onMapEvent==='function';
        if(!hasEv&&typeof toast==='function')toast('🌐 外層大地圖已解鎖（煉氣）：右上「🌐 外層秘境」或地圖上的新入口');
        else if(hasEv&&typeof toast==='function'){
          setTimeout(()=>{try{toast('右上角「🌐 外層秘境」可飛往／鏡頭移到新副本入口');}catch(e){}},700);}
      }catch(e){}
    }
    return !!S.map.unlocked;
  }catch(e){return false;}
}
// 煉氣解鎖後：在可走地圖上補實體副本入口（外層表座標在 288，玩家 N=128 走不到）
function xmapPlaceEntryGates(){
  try{
    if(!S||!S.map||!S.map.unlocked)return 0;
    if(typeof mapDgsRegister==='function')mapDgsRegister();
    if(typeof MAP_DG_ORDER==='undefined'||!MAP_DG_ORDER||typeof DGS==='undefined')return 0;
    if(!Array.isArray(S.vstructs))S.vstructs=[];
    const have=new Set(S.vstructs.filter(v=>v&&v.type==='dgate').map(v=>v.kind));
    const peak=(typeof xwPeakRealm==='function'?xwPeakRealm():0)|0;
    const start=(typeof ANCH!=='undefined'&&ANCH&&ANCH.start)?ANCH.start:{x:N/2,y:N/2};
    const free=(i,j)=>{
      for(let y=j;y<j+2;y++)for(let x=i;x<i+2;x++){
        if(typeof inMap==='function'&&!inMap(x,y))return false;
        if(x<1||y<1||x>=N-2||y>=N-2)return false;
        const k=y*N+x;
        if(block&&block[k])return false;
        if(typeof roadMask!=='undefined'&&roadMask&&roadMask[k])return false;
        if(occ&&occ[k])return false;
        if(typeof terrain!=='undefined'&&terrain){
          const t=terrain[k];
          if(t===T.WATER||t===T.SHALLOW||t===T.CLIFF||t===T.RUIN)return false;
        }
      }
      if(typeof startComp==='number'&&typeof comp!=='undefined'&&comp&&comp[j*N+i]&&comp[j*N+i]!==startComp)return false;
      return true;
    };
    let n=0,slot=0;
    for(const k of MAP_DG_ORDER){
      if(have.has(k)||!DGS[k])continue;
      let need=4;
      try{need=(MAP_DGS[k]&&MAP_DGS[k].minRealm)|0||4;}catch(e){}
      // 先放「目前／即將可挑戰」的入口，避免一次塞滿
      if(need>Math.max(4,peak)+1)continue;
      let done=false;
      for(let rad=10;rad<48&&!done;rad+=2){
        for(let t=0;t<18&&!done;t++){
          const a=((slot*2.4)+t/18)*Math.PI*2;
          const i=Math.round(start.x+Math.cos(a)*rad),j=Math.round(start.y+Math.sin(a)*rad);
          if(!free(i,j))continue;
          if(S.vstructs.some(v=>v.type==='dgate'&&Math.abs(v.i-i)+Math.abs(v.j-j)<8))continue;
          S.vstructs.push({id:9200+MAP_DG_ORDER.indexOf(k),vid:0,type:'dgate',kind:k,i,j,s:2,_xmap:1});
          have.add(k);done=true;n++;slot++;
        }
      }
    }
    if(n){
      try{if(typeof rebuildBlock==='function')rebuildBlock();}catch(e){}
      try{if(typeof mmDirty!=='undefined')mmDirty=true;}catch(e){}
    }
    return n;
  }catch(e){return 0;}
}
function xmapGateHud(){
  try{
    let b=document.getElementById('xmapgates');
    const on=!!(S&&S.map&&S.map.unlocked);
    if(!on){if(b)b.style.display='none';const p=document.getElementById('xmapgatep');if(p)p.style.display='none';return;}
    if(!b){
      b=document.createElement('button');b.id='xmapgates';b.type='button';b.className='ui';
      b.textContent='🌐 外層秘境';b.title='煉氣解鎖的外層副本（點開列表）';
      b.style.cssText='position:fixed;right:calc(8px + var(--sar,0px));top:calc(var(--tb,44px) + 52px);z-index:22;min-height:36px;padding:6px 10px;border-radius:8px;border:1px solid #c9a35a;background:#1a140ef2;color:#ffe27a;font-size:13px;cursor:pointer';
      b.addEventListener('click',ev=>{ev.stopPropagation();xmapGatePanel();});
      (document.getElementById('root')||document.body).appendChild(b);
      if(!document.getElementById('xmapgatecss')){
        const st=document.createElement('style');st.id='xmapgatecss';
        st.textContent='#xmapgatep{position:fixed;right:calc(8px + var(--sar,0px));top:calc(var(--tb,44px) + 96px);z-index:46;width:min(320px,calc(100vw - 24px));max-height:min(420px,70vh);overflow:auto;background:#140e09f4;border:1px solid #c9a35a;border-radius:10px;padding:10px;color:#f3e3c0}#xmapgatep h4{margin:0 0 8px;color:#ffe27a}#xmapgatep .xgrow{display:flex;gap:6px;align-items:center;margin:0 0 6px;flex-wrap:wrap}#xmapgatep .xgrow b{flex:1;font-weight:600;font-size:13px}body.titleopen #xmapgates,body.titleopen #xmapgatep{display:none!important}';
        document.head.appendChild(st);
      }
    }
    b.style.display='block';
  }catch(e){}
}
function xmapGatePanel(){
  try{
    let p=document.getElementById('xmapgatep');
    if(p&&p.style.display==='block'){p.style.display='none';return;}
    if(!p){p=document.createElement('div');p.id='xmapgatep';p.className='ui';(document.getElementById('root')||document.body).appendChild(p);
      p.addEventListener('click',ev=>{
        const t=ev.target&&ev.target.closest&&ev.target.closest('[data-xmg]');
        if(!t)return;ev.stopPropagation();
        const act=t.getAttribute('data-xmg'),kind=t.getAttribute('data-k');
        if(act==='x'){p.style.display='none';return;}
        const g=(typeof gates==='function'?gates():[]).find(x=>x.kind===kind)
          ||((S.map&&S.map.gates)||[]).find(x=>x.kind===kind);
        if(act==='cam'&&g){
          const x=(g.i!=null?g.i+1:(g.x||0)),y=(g.j!=null?g.j+1.5:(g.y||0));
          try{const q=iso(x,y);cam.x=q.x;cam.y=q.y;cam.follow=false;}catch(e){}
          try{toast('鏡頭已移到入口');}catch(e){}
          return;
        }
        if(act==='go'&&kind){
          const phys=(typeof gates==='function'?gates():[]).find(x=>x.kind===kind);
          if(phys){
            try{selOther={k:'s',id:phys.id};selUnits=[];}catch(e){}
            try{const pl=player();if(pl){setTask(pl,{type:'move',x:phys.i+1,y:phys.j+2.6});pathTo(pl,phys.i+1,phys.j+2.6);}}catch(e){}
            try{toast('前往入口中…靠近後再開面板進入');}catch(e){}
          }else{
            try{if(typeof dgEnter==='function')dgEnter(kind,'solo');}catch(e){}
          }
          p.style.display='none';
        }
      });
    }
    const peak=(typeof xwPeakRealm==='function'?xwPeakRealm():0)|0;
    const rows=[];
    const kinds=(typeof MAP_DG_ORDER!=='undefined'&&MAP_DG_ORDER)||[];
    for(const k of kinds){
      const def=(typeof MAP_DGS!=='undefined'&&MAP_DGS[k])||(DGS&&DGS[k])||{};
      const need=def.minRealm|0||4;
      const name=def.n||k;
      const locked=peak<need;
      rows.push(`<div class="xgrow"><b>${name}${locked?'（需'+((REALMS[need]&&REALMS[need].n)||need)+'）':''}</b>`
        +`<button type="button" class="btn" data-xmg="cam" data-k="${k}">鏡頭</button>`
        +`<button type="button" class="btn pri" data-xmg="go" data-k="${k}"${locked?' disabled':''}>前往</button></div>`);
    }
    p.innerHTML=`<h4>🌐 外層秘境 <button type="button" class="btn" data-xmg="x" style="float:right">關閉</button></h4><div class="sm" style="opacity:.8;margin:0 0 8px">煉氣後解鎖。可鏡頭定位，或「前往」走到新入口再進入。</div>${rows.join('')||'<div class="sm">尚無外層副本資料</div>'}`;
    p.style.display='block';
  }catch(e){}
}
function xmapOnXian(){try{return xmapUnlockIf();}catch(e){return false;}}
{const _db=doBreak;doBreak=function(u){const was=!!(S&&S.map&&S.map.unlocked);const r=_db.apply(this,arguments);try{xwNotePeak(u);xmapUnlockIf();if(!was&&S&&S.map&&S.map.unlocked){/* toast 已在 xmapUnlockIf */}}catch(e){}return r;};}
{const _ng=newGame;newGame=function(){const r=_ng.apply(this,arguments);try{if(typeof mapInitState==='function')mapInitState(S);if(typeof mapMigrateSave==='function')mapMigrateSave(S);xmapUnlockIf();}catch(e){}return r;};}
{const _as=applySave;applySave=function(d){const r=_as.apply(this,arguments);try{if(r&&S){if(d){if(d.map!=null)S.map=xmapSafeClone(d.map);if(d.sects!=null)S.sects=d.sects;if(d.diplo!=null)S.diplo=d.diplo;if(d.zb!=null)S.zb=d.zb;if(Object.prototype.hasOwnProperty.call(d,'travel'))S.travel=d.travel;}if(typeof mapMigrateSave==='function')mapMigrateSave(S);xmapRestoreTravelRefs();xmapUnlockIf();}}catch(e){}return r;};}
function xmapRestoreTravelRefs(){
  if(!S||!S.map||!Array.isArray(S.map.activeTravels))return;
  const units=[...(S.dg&&S.dg.W&&S.dg.W.units||[]),...(S.units||[])],by=new Map(units.filter(Boolean).map(u=>[u.id,u]));
  for(const tr of S.map.activeTravels){if(!tr)continue;const previous=new Map((tr.partyUnits||[]).filter(Boolean).map(u=>[u.id,u]));tr.partyUnits=(tr.party||[]).map(id=>by.get(id)||previous.get(id)).filter(Boolean);}
  if(S.travel&&S.travel.id){const active=S.map.activeTravels.find(tr=>tr&&tr.id===S.travel.id);if(active)S.travel=active;}
}
function xmapSafeClone(val){
  if(val==null)return val;
  const seen=typeof WeakSet!=='undefined'?new WeakSet():null;
  return JSON.parse(JSON.stringify(val,function(k,v){
    if(typeof v==='number'&&!Number.isFinite(v))return 0;
    if(typeof v==='bigint')return Number(v);
    if(v&&typeof v==='object'){
      if(seen){if(seen.has(v))return;seen.add(v);}
      if(k==='partyUnits'&&Array.isArray(v))return v.map(u=>u?{id:u.id,realm:u.realm,atk:u.atk,kind:u.kind,name:u.name,hp:u.hp,maxhp:u.maxhp,x:u.x,y:u.y}:u);
      if(k==='target'&&v.id!=null)return {id:v.id};
    }
    return v;
  }));
}
function xmapPutSnap(d){
  if(!d||typeof S==='undefined'||!S)return d;
  const put=(key,val)=>{try{d[key]=val==null?val:xmapSafeClone(val);}catch(e){try{d[key]=JSON.parse(JSON.stringify(val));}catch(e2){}}};
  if(S.map)put('map',S.map);if(S.sects)put('sects',S.sects);if(S.diplo)put('diplo',S.diplo);if(S.zb)put('zb',S.zb);
  if(Object.prototype.hasOwnProperty.call(S,'travel'))put('travel',S.travel);
  // snapshot 的 UNIT_KEEP 不含 peakRealm；補上以免讀檔後懲罰掉境被當成從未煉氣
  try{
    if(Array.isArray(d.units)&&Array.isArray(S.units)){
      const byId={};
      for(const u of S.units){if(u&&u.id!=null)byId[u.id]=u;}
      for(const ou of d.units){
        if(!ou)continue;
        const u=byId[ou.id];
        if(!u)continue;
        const pk=Math.max(u.peakRealm|0,u.realm|0,ou.peakRealm|0);
        if(pk)ou.peakRealm=pk;
      }
    }
  }catch(e){}
  return d;
}
{const _sn=snapshot;snapshot=function(){const d=_sn.apply(this,arguments);try{xmapPutSnap(d);}catch(e){}return d;};}
{const _q=v61QiMul;v61QiMul=function(u){const r=_q.apply(this,arguments);try{if(r&&u&&typeof mapQiMul==='function'){const mq=mapQiMul(u.x,u.y);if(mq!=null&&mq!==1){r.m=Math.round(r.m*mq*100)/100;if(r.s){if(mq>1&&r.s.indexOf('高山')<0)r.s+='+高山';}else if(mq!==1)r.s='高山';}}}catch(e){}return r;};}
{const _u=update;update=function(dt){const r=_u.apply(this,arguments);try{if(typeof mapSectsTick==='function')mapSectsTick(dt);if(typeof mapTravelTick==='function')mapTravelTick(dt);if(typeof mapFlag==='function'&&mapFlag('autoParty')&&typeof mapPartyTick==='function')mapPartyTick(dt);}catch(e){}
  try{XMAP_T=(XMAP_T||0)+dt;if(XMAP_T>=1.2){XMAP_T=0;xmapUnlockIf();xmapGateHud();}}catch(e){}
  return r;};}
var XMAP_T=0;

// ======================= map PHASE5 hooks (g* only; map*/net* / g13 DGS untouched) =======================
{const _de=dgEnter;dgEnter=function(kind,mode,hard){
  try{
    if(typeof mapFlag==='function'&&mapFlag('travel')&&typeof mapTravelStart==='function'){
      const classic=typeof DGS!=='undefined'&&DGS&&DGS[kind];
      const isMap=!classic&&typeof MAP_DGS!=='undefined'&&MAP_DGS&&MAP_DGS[kind];
      if(isMap){
        const p=typeof player==='function'?player():null;
        if(p&&!p.dead&&!(S&&S.dg)&&!(S&&S.interior)){
          let party=[p];
          try{
            const ds=(typeof disciples==='function'?disciples():[]).filter(u=>u&&!u.dead);
            if(mode==='all')party=[p].concat(ds);
            else if(mode==='sel'){const s=new Set(selUnits);party=[p].concat(ds.filter(u=>s.has(u.id)||u.job==='follow'));}
          }catch(e){}
          const gate=(S.map&&S.map.gates||[]).find(x=>x&&(x.kind===kind||x.id===kind))||{id:kind,kind:kind};
          const tr=mapTravelStart(gate,party);
          if(tr){try{toast('正在飛往副本…');}catch(e){}return true;}
        }
      }
    }
  }catch(e){}
  return _de.apply(this,arguments);
};}
function xmapToastEv(ev){
  if(!ev||!ev.t)return;
  const t=ev.t,p=ev.p||{};
  let m=null;
  if(t==='map:unlock')m='外層大地圖已解鎖';
  else if(t==='map:travel:enc')m='途中遭遇：'+(p.type||'');
  else if(t==='map:travel:resolve')m='遭遇結束：'+((p.result&&p.result.msg)||p.type||'');
  else if(t==='map:dg:fly')m=p.done?'抵達副本':'飛往副本…';
  else if(t==='map:dg:start')m='進入副本'+(p.kind?('：'+p.kind):'');
  else if(t==='map:dg:boss')m='首領現身'+(p.bossN?('：'+p.bossN):'');
  else if(t==='map:dg:clear')m='副本通關';
  if(m)try{toast(m);}catch(e){}
}
setTimeout(function xmapListenUi(){
  if(!window.XW){setTimeout(xmapListenUi,300);return;}
  const prev=XW.onMapEvent;
  XW.onMapEvent=function(ev){try{if(typeof prev==='function')prev(ev);}catch(e){}try{xmapToastEv(ev);}catch(e){}};
},0);

// ======================= dungeon/teleport gate visuals + click-to-enter =======================
const XGATE={hover:null,clickExit:0};
function xgateType(kind){
  try{const G=typeof DGS!=='undefined'&&DGS[kind];if(G&&G.mapType)return G.mapType;
    if(typeof MAP_DGS!=='undefined'&&MAP_DGS[kind]&&MAP_DGS[kind].type)return MAP_DGS[kind].type;}catch(e){}
  if(kind==='xf')return 'mystic';if(kind==='ruin')return 'ruin';if(kind==='jail')return 'forbid';return 'dungeon';
}
const XGATE_PAL={
  dungeon:{s0:'#2c3a24',s1:'#4a5c38',s2:'#6e8250',glow:'#b6ff7a',rune:'#d8ffa8',arch:'#1a2414',halo:'rgba(150,220,90,0.35)',tag:'秘窟'},
  maze:{s0:'#221c38',s1:'#4a3c78',s2:'#7a68b8',glow:'#d0b8ff',rune:'#f0e0ff',arch:'#141028',halo:'rgba(170,130,255,0.38)',tag:'迷宮'},
  ruin:{s0:'#3a2c18',s1:'#7a5c34',s2:'#c4a060',glow:'#ffd078',rune:'#ffe9b0',arch:'#2a1c10',halo:'rgba(255,190,80,0.35)',tag:'遺跡'},
  forbid:{s0:'#2a100c',s1:'#6a2218',s2:'#b04028',glow:'#ff6848',rune:'#ffc0a8',arch:'#1a0806',halo:'rgba(255,70,40,0.4)',tag:'禁地'},
  mystic:{s0:'#142830',s1:'#2a5870',s2:'#68c8e0',glow:'#ffe27a',rune:'#fff6d0',arch:'#0c1820',halo:'rgba(255,220,120,0.4)',tag:'秘境'}
};
function xgatePal(kind){return XGATE_PAL[xgateType(kind)]||XGATE_PAL.dungeon;}
function xgateDispName(kind){
  // 永遠顯示中文名：DGS → MAP_DGS（旗關時仍可讀表）→ 類型名（迷宮／秘窟…）；絕不回退成 mz_yunluo 這類 id
  const isId=s=>{s=String(s==null?'':s).trim();return !s||!/[一-鿿]/.test(s);};
  try{const n=typeof DGS!=='undefined'&&DGS[kind]&&DGS[kind].n;if(!isId(n))return String(n).trim();}catch(e){}
  try{const n=typeof MAP_DGS!=='undefined'&&MAP_DGS[kind]&&MAP_DGS[kind].n;if(!isId(n))return String(n).trim();}catch(e){}
  return (xgatePal(kind)||{}).tag||'秘境';
}
function xgateAtWorld(w){
  try{
    if(!w||!S)return null;
    let best=null,bd=1.45;
    const list=(typeof gates==='function')?gates():[];
    for(const g of list){const cx=g.i+(g.s||2)/2,cy=g.j+(g.s||2)/2;const d=dist(w.x,w.y,cx,cy);if(d<bd){bd=d;best=g;}}
    return best;
  }catch(e){return null;}
}
function xgateHoverHit(){
  try{
    if(typeof mouse==='undefined'||mouse.x==null)return null;
    const w=screenToWorld(mouse.x,mouse.y);if(!w)return null;
    if(S&&S.dg){
      const D=S.dg;
      if(D.exitP&&dist(w.x,w.y,D.exitP.x,D.exitP.y)<1.5)return 'exit';
      if(D.ent&&dist(w.x,w.y,D.ent.x,D.ent.y)<1.5)return 'ent';
      try{if(typeof netGatePt==='function'){const G=netGatePt(D);if(G&&dist(w.x,w.y,G.x,G.y)<1.7)return 'boss';}}catch(e){}
      return null;
    }
    return xgateAtWorld(w);
  }catch(e){}
  return null;
}
function xgateCursor(){
  const h=xgateHoverHit();XGATE.hover=h;
  try{if(typeof cv!=='undefined'&&cv)cv.style.cursor=h?'pointer':'';}catch(e){}
  return h;
}
function xgateRunes(cx,cy,rx,ry,n,t,col,spin){
  ctx.save();ctx.fillStyle=col;ctx.strokeStyle=col;ctx.lineWidth=1.2;
  for(let i=0;i<n;i++){
    const a=i/n*Math.PI*2+spin,x=cx+Math.cos(a)*rx,y=cy+Math.sin(a)*ry;
    ctx.globalAlpha=0.55+0.45*Math.sin(t*3+i);
    ctx.beginPath();ctx.arc(x,y,2.1,0,Math.PI*2);ctx.fill();
    if(i%2===0){ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(cx+Math.cos(a)*rx*0.62,cy+Math.sin(a)*ry*0.62);ctx.stroke();}
  }
  ctx.restore();
}
function xgateDrawDgate(o){
  const G=(typeof DGS!=='undefined'&&DGS[o.kind])||{col:'#88a'},pal=xgatePal(o.kind),ty=xgateType(o.kind);
  const i=o.i,j=o.j,t=performance.now()/1000,cd=(S.dgCd[o.kind]||0)>S.time;
  const hot=XGATE.hover&&XGATE.hover.id===o.id;
  const pulse=0.55+0.45*Math.sin(t*2.4);
  // stepped plinth
  prism(i-0.05,j-0.05,i+2.05,j+2.05,0,3,pal.s0,pal.s1,null);
  prism(i+0.15,j+0.15,i+1.85,j+1.85,3,8,pal.s1,pal.s2,pal.s0);
  // pillars
  const ph=ty==='mystic'?44:ty==='forbid'?40:36;
  prism(i+0.12,j+0.7,i+0.48,j+1.15,8,ph,pal.s0,pal.s1,pal.s2);
  prism(i+1.52,j+0.7,i+1.88,j+1.15,8,ph,pal.s0,pal.s1,pal.s2);
  // pillar runes
  const Lp=P(i+0.3,j+0.92,8+ph*0.55),Rp=P(i+1.7,j+0.92,8+ph*0.55);
  ctx.save();ctx.strokeStyle=cd?'#888':pal.rune;ctx.globalAlpha=0.7+0.3*pulse;ctx.lineWidth=1.4;
  for(const q of [Lp,Rp]){for(let k=0;k<4;k++){ctx.beginPath();ctx.moveTo(q.x-3,q.y-8+k*5);ctx.lineTo(q.x+3,q.y-6+k*5);ctx.stroke();}}
  ctx.restore();
  // arch
  const a=P(i+0.3,j+1,8+ph),b=P(i+1.7,j+1,8+ph);
  ctx.save();ctx.strokeStyle=pal.arch;ctx.lineWidth=7;ctx.beginPath();ctx.moveTo(a.x,a.y);ctx.quadraticCurveTo((a.x+b.x)/2,(a.y+b.y)/2-22,b.x,b.y);ctx.stroke();
  ctx.strokeStyle=cd?'#666':pal.glow;ctx.globalAlpha=0.55+0.35*pulse;ctx.lineWidth=2.2;ctx.beginPath();ctx.moveTo(a.x,a.y);ctx.quadraticCurveTo((a.x+b.x)/2,(a.y+b.y)/2-22,b.x,b.y);ctx.stroke();ctx.restore();
  // ground rune ring + portal
  const c=P(i+1,j+1.05,12);
  ctx.save();
  ctx.globalAlpha=(hot?0.5:0.28)+0.18*pulse;ctx.fillStyle=pal.halo;ctx.beginPath();ctx.ellipse(c.x,c.y+6,22,11,0,0,Math.PI*2);ctx.fill();
  ctx.globalAlpha=1;ctx.strokeStyle=cd?'#777':pal.glow;ctx.lineWidth=hot?2.6:1.6;
  ctx.beginPath();ctx.ellipse(c.x,c.y+6,20,10,0,0,Math.PI*2);ctx.stroke();
  ctx.beginPath();ctx.ellipse(c.x,c.y+6,13,6.5,0,0,Math.PI*2);ctx.stroke();
  xgateRunes(c.x,c.y+6,18,9,ty==='maze'?12:8,t,cd?'#999':pal.rune,t*(ty==='maze'?-1.4:1.1));
  const g=ctx.createRadialGradient(c.x,c.y-4,1,c.x,c.y-4,hot?22:16);
  g.addColorStop(0,cd?'rgba(160,160,160,0.7)':'rgba(255,255,255,0.95)');
  g.addColorStop(0.45,cd?'rgba(100,100,100,0.35)':pal.glow);
  g.addColorStop(1,'rgba(0,0,0,0)');
  ctx.globalAlpha=0.6+0.25*pulse+(hot?0.15:0);ctx.fillStyle=g;ctx.beginPath();ctx.ellipse(c.x,c.y-2,hot?12:9,hot?20:16,0,0,Math.PI*2);ctx.fill();
  // type ornaments
  if(ty==='forbid'){ctx.strokeStyle=pal.glow;ctx.lineWidth=1.5;ctx.globalAlpha=0.8;
    ctx.beginPath();ctx.moveTo(c.x,c.y-28);ctx.lineTo(c.x-6,c.y-16);ctx.lineTo(c.x+6,c.y-16);ctx.closePath();ctx.stroke();}
  if(ty==='mystic'){for(let k=0;k<5;k++){const ang=t*1.3+k*1.26,rr=16+4*Math.sin(t*2+k);ctx.fillStyle=pal.rune;ctx.globalAlpha=0.5+0.5*Math.sin(t*4+k);
      ctx.fillRect(c.x+Math.cos(ang)*rr-1.2,c.y-10+Math.sin(ang)*rr*0.45-1.2,2.4,2.4);}}
  if(ty==='ruin'){ctx.globalAlpha=0.85;ctx.fillStyle=pal.s2;ctx.fillRect(c.x+16,c.y+2,4,7);ctx.fillRect(c.x-22,c.y+4,3,5);}
  if(ty==='maze'){ctx.strokeStyle=pal.rune;ctx.globalAlpha=0.45+0.3*pulse;ctx.lineWidth=1;
    ctx.beginPath();ctx.ellipse(c.x,c.y+6,8,4,t,0,Math.PI*2);ctx.stroke();ctx.beginPath();ctx.ellipse(c.x,c.y+6,8,4,-t,0,Math.PI*2);ctx.stroke();}
  ctx.restore();
  const title=xgateDispName(o.kind)+(cd?`（${Math.ceil(S.dgCd[o.kind]-S.time)}秒）`:'');
  label(title,c.x,c.y-36,G.xf?'#ffe27a':pal.glow,'bold 11px sans-serif');
  label(pal.tag,c.x,c.y-24,pal.rune,'bold 9px sans-serif');
  if(hot||(selOther&&selOther.k==='s'&&selOther.id===o.id)){ctx.save();ctx.strokeStyle=hot?pal.glow:'#ffe27a';ctx.lineWidth=hot?2.4:1.6;ctx.globalAlpha=0.95;
    const d0=P(i-0.12,j-0.12),d1=P(i+2.12,j-0.12),d2=P(i+2.12,j+2.12),d3=P(i-0.12,j+2.12);
    ctx.beginPath();ctx.moveTo(d0.x,d0.y);ctx.lineTo(d1.x,d1.y);ctx.lineTo(d2.x,d2.y);ctx.lineTo(d3.x,d3.y);ctx.closePath();ctx.stroke();ctx.restore();}
}
function xgateDrawPortal(x,y,kind,txt){
  const q=P(x,y),t=performance.now()/1000,hot=XGATE.hover===kind;
  const gold=kind==='exit',boss=kind==='boss';
  const col=gold?'#ffe08a':boss?'#ffb060':'#9ae0ff';
  const fill=gold?'rgba(255,210,100,0.55)':boss?'rgba(255,150,70,0.5)':'rgba(120,200,255,0.55)';
  const pulse=0.5+0.5*Math.sin(t*(hot?4:2.6));
  ctx.save();
  ctx.globalAlpha=0.28+0.2*pulse+(hot?0.15:0);ctx.fillStyle=fill;ctx.beginPath();ctx.ellipse(q.x,q.y,28,14,0,0,Math.PI*2);ctx.fill();
  ctx.globalAlpha=0.85;ctx.strokeStyle=col;ctx.lineWidth=hot?3:2;
  for(const k of [1,0.72,0.48]){ctx.beginPath();ctx.ellipse(q.x,q.y,26*k+(hot?2:0),13*k+(hot?1:0),0,0,Math.PI*2);ctx.stroke();}
  xgateRunes(q.x,q.y,24,12,10,t,col,t*(gold?1.2:-1.2));
  // rising column
  const h=36+10*pulse+(hot?8:0);
  const gg=ctx.createLinearGradient(q.x,q.y,q.x,q.y-h);
  gg.addColorStop(0,fill);gg.addColorStop(1,'rgba(255,255,255,0)');
  ctx.globalAlpha=0.35+0.25*pulse;ctx.fillStyle=gg;ctx.beginPath();
  ctx.moveTo(q.x-10,q.y);ctx.lineTo(q.x-4,q.y-h);ctx.lineTo(q.x+4,q.y-h);ctx.lineTo(q.x+10,q.y);ctx.closePath();ctx.fill();
  ctx.globalAlpha=1;label(txt,q.x,q.y-22, '#fff','bold 11px sans-serif');
  ctx.restore();
}
function xgateOverlayPortals(){
  if(!S||!S.dg)return;
  xgateCursor();
  const D=S.dg;
  if(D.ent)xgateDrawPortal(D.ent.x,D.ent.y,'ent','撤離陣');
  if(D.exitP)xgateDrawPortal(D.exitP.x,D.exitP.y,'exit','出口傳送陣');
}
function xgateDrawBossGate(D){
  if(typeof netGatePt!=='function'||(typeof netBgOn==='function'&&!netBgOn()))return false;
  const G=netGatePt(D);if(!G)return false;
  const open=typeof netGateOpen==='function'&&netGateOpen(D),t=performance.now()/1000,c=P(G.x,G.y);
  const hot=XGATE.hover==='boss';
  ctx.save();
  ctx.globalAlpha=open?0.9:0.55;ctx.strokeStyle=open?'#ffd34d':'#8a8aa0';ctx.lineWidth=hot?3:2;
  for(const k of [1,0.78,0.55]){ctx.beginPath();ctx.ellipse(c.x,c.y,30*k,15*k,0,0,Math.PI*2);ctx.stroke();}
  xgateRunes(c.x,c.y,27,13.5,10,t,open?'#ffe9a0':'#b0b0c4',open?t*0.8:0);
  if(open){ctx.globalAlpha=0.2+0.12*Math.sin(t*3);ctx.fillStyle='#ffd34d';ctx.beginPath();ctx.ellipse(c.x,c.y,30,15,0,0,Math.PI*2);ctx.fill();}
  ctx.globalAlpha=1;const L=P(G.x-0.85,G.y+0.8),R=P(G.x+0.85,G.y-0.8),col=open?['#6a4a28','#c49a48']:['#3a3a48','#5c5c70'];
  for(const q of [L,R]){ctx.fillStyle=col[0];ctx.fillRect(q.x-4,q.y-40,8,40);ctx.fillStyle=col[1];ctx.fillRect(q.x-4,q.y-40,3.5,40);
    ctx.fillStyle=open?'#ffe9a0':'#888';for(let k=0;k<5;k++)ctx.fillRect(q.x-2,q.y-36+k*7,4,2);}
  ctx.strokeStyle=open?'#ff6a3a':'#5a3a3a';ctx.lineWidth=6;ctx.beginPath();ctx.moveTo(L.x-8,L.y-42);ctx.lineTo(R.x+8,R.y-42);ctx.stroke();
  ctx.lineWidth=3;ctx.strokeStyle=open?'#ffe08a':'#888';ctx.beginPath();ctx.moveTo(L.x-3,L.y-32);ctx.lineTo(R.x+3,R.y-32);ctx.stroke();
  if(open){ctx.globalAlpha=0.4+0.25*Math.sin(t*4);ctx.fillStyle='#fff2b0';ctx.beginPath();ctx.moveTo(L.x+3,L.y-30);ctx.lineTo(R.x-3,R.y-30);ctx.lineTo(R.x-3,R.y);ctx.lineTo(L.x+3,L.y);ctx.closePath();ctx.fill();}
  if(hot){ctx.globalAlpha=0.95;ctx.strokeStyle='#ffe27a';ctx.lineWidth=2;ctx.beginPath();ctx.ellipse(c.x,c.y,34,17,0,0,Math.PI*2);ctx.stroke();}
  ctx.restore();label(open?'首領傳送門':'首領傳送門（未開）',c.x,c.y-48,open?'#ffe27a':'#c0c0d0','bold 10px sans-serif');
  return true;
}
{const _ds=drawStruct;drawStruct=function(o){try{xgateCursor();}catch(e){}if(o&&o.type==='dgate'){try{xgateDrawDgate(o);return;}catch(e){console.warn('xgate',e);}}return _ds.apply(this,arguments);};}
{const _dd=drawDungeon;drawDungeon=function(){const r=_dd.apply(this,arguments);try{xgateOverlayPortals();}catch(e){}return r;};}
{const _bg=dgDrawBossGate;dgDrawBossGate=function(D){try{if(xgateDrawBossGate(D))return;}catch(e){}return _bg.apply(this,arguments);};}
// click-to-enter: no proximity auto-prompt (player only; disciple AI unchanged)
{const _tk=x47DgTick;x47DgTick=function(){try{if(S&&!S.dg&&!S.interior){const p=player();if(p&&!p.dead){let near=null;for(const g of gates()){if(distRect(p.x,p.y,g.i,g.j,2)<=1.6){near=g;break;}}if(near)X47.dgNear=near.kind;}}}catch(e){}return _tk.apply(this,arguments);};}
{const _ask=x47DgEnterAsk;x47DgEnterAsk=function(kind,o){const r=_ask.apply(this,arguments);try{if(X47.dlg&&X47.dlg.id==='dgin')X47.dlg.keep=function(){return !S.dg;};}catch(e){}return r;};}
function xgateClickWorld(mx,my){
  try{if(S&&S.dg){
    const w=screenToWorld(mx,my);
    if(S.dg.exitP&&dist(w.x,w.y,S.dg.exitP.x,S.dg.exitP.y)<1.6){XGATE.clickExit=1;if(typeof x47DgExitAsk==='function')x47DgExitAsk('portal');return true;}
    if(S.dg.ent&&dist(w.x,w.y,S.dg.ent.x,S.dg.ent.y)<1.6){XGATE.clickExit=1;if(typeof x47DgExitAsk==='function')x47DgExitAsk('ent');return true;}
    return false;
  }
  const w=screenToWorld(mx,my);const s=xgateAtWorld(w)||(typeof structAt==='function'&&structAt(w));
  if(s&&s.type==='dgate'){selOther={k:'s',id:s.id};selUnits=[];selBuilding=null;panelKeyCache=null;if(typeof x47DgEnterAsk==='function')x47DgEnterAsk(s.kind,null);return true;}
  }catch(e){}
  return false;
}
{const _lc=leftClick;leftClick=function(mx,my,sh){if(xgateClickWorld(mx,my))return;return _lc.apply(this,arguments);};}
{const _ta=tapAt;tapAt=function(x,y){if(xgateClickWorld(x,y))return;return _ta.apply(this,arguments);};}
{const _ex=x47DgExitAsk;x47DgExitAsk=function(src){XGATE.clickExit=0;return _ex.apply(this,arguments);};}
setTimeout(function xgateApi(){if(!window.XW||!XW.xn){setTimeout(xgateApi,300);return;}XW.xn.gate={type:xgateType,name:xgateDispName,hover:()=>XGATE.hover,ask:(k)=>x47DgEnterAsk(k,null),click:xgateClickWorld,setMouse:(x,y)=>{mouse.x=x;mouse.y=y;return xgateCursor();},at:xgateAtWorld};},0);

// ======================= econ hooks (g* only; econ*/map*/net*/cult* untouched) =======================
function xeconMigrate(){
  try{if(typeof econMigrateSave==='function')econMigrateSave(S);}catch(e){}
  try{if(typeof econRegisterBuildings==='function')econRegisterBuildings();}catch(e){}
  // 新建築入 BUILD 後掛上建造列（merge 項已在原 BUILD_ORDER，旗關時 catalog 不會寫入 BUILD）
  try{
    try{if(typeof XW_ECON!=='undefined'&&XW_ECON&&typeof XW_ECON.gfEnsureBuild==='function')XW_ECON.gfEnsureBuild();}catch(e){}
    if(typeof BUILD_ORDER!=='undefined'&&typeof BUILD!=='undefined'&&typeof ECON_NEW_BUILDS!=='undefined'){
      for(const d of ECON_NEW_BUILDS){
        if(!d||!d.type||d.merge)continue;
        if(BUILD[d.type]&&BUILD_ORDER.indexOf(d.type)<0)BUILD_ORDER.push(d.type);
        if(BUILD[d.type]&&BUILD[d.type].size==null)BUILD[d.type].size=d.size||2;
      }
    }
  }catch(e){}
}
{const _ng=newGame;newGame=function(){const r=_ng.apply(this,arguments);try{xeconMigrate();}catch(e){}return r;};}
{const _as=applySave;applySave=function(d){const r=_as.apply(this,arguments);try{if(r&&S){if(d&&d.econ!=null)S.econ=d.econ;xeconMigrate();}}catch(e){}return r;};}
{const _sn=snapshot;snapshot=function(){const d=_sn.apply(this,arguments);try{if(d&&typeof S!=='undefined'&&S&&S.econ){d.econ=(typeof XW_ECON!=='undefined'&&XW_ECON&&typeof XW_ECON.snap==='function')?XW_ECON.snap():JSON.parse(JSON.stringify(S.econ));}}catch(e){}return d;};}
{const _u=update;update=function(dt){const r=_u.apply(this,arguments);try{if(typeof econTick==='function')econTick(dt);}catch(e){}return r;};}
{const _cq=completeQuest;completeQuest=function(vid){
  let reward=null;try{const v=typeof vById==='function'?vById(vid):null;if(v&&v.quest&&v.quest.reward)reward=Object.assign({},v.quest.reward);}catch(e){}
  const ok=_cq.apply(this,arguments);
  try{if(ok&&reward&&typeof econOnQuestReward==='function'){
    if(typeof econFlag==='function'&&econFlag('treasury')&&reward.lingshi&&S&&S.res)S.res.lingshi=Math.max(0,(S.res.lingshi||0)-(+reward.lingshi||0));
    econOnQuestReward(typeof player==='function'?player():null,reward,'quest');
  }}catch(e){}
  return ok;
};}
{const _fc=finishCraft;finishCraft=function(b){
  let u=null;try{u=(typeof bestCrafter==='function'?bestCrafter(b):null)||(typeof player==='function'?player():null);}catch(e){}
  const r=_fc.apply(this,arguments);
  try{if(r&&typeof econOnCraftFinished==='function')econOnCraftFinished(u,r,{bid:b&&b.id});}catch(e){}
  return r;
};}
{const _op=onPlayerDeath;onPlayerDeath=function(u){try{if(typeof econOnUnitDown==='function')econOnUnitDown(u);}catch(e){}return _op.apply(this,arguments);};}
function xwTaskQuests(){
  const L=[];
  try{if(typeof S!=='undefined'&&S){
    if(S.villages)for(const v of S.villages)if(v&&v.quest)L.push(v.quest);
    if(Array.isArray(S.quests))for(const q of S.quests)if(q)L.push(q);
  }}catch(e){}
  return L;
}
function xwNewBuildHtml(){
  try{
    if(typeof econFlag!=='function'||!(econFlag('newBuildings')||econFlag('mine')))return '';
    const L=typeof ECON_NEW_BUILDS!=='undefined'?ECON_NEW_BUILDS:[];
    if(!L||!L.length)return '';
    let h='<div class="econ-build-list" id="econ-build-list"><div class="econ-task-h">新建築</div>';
    for(const d of L){
      if(!d||!d.type||d.merge)continue;
      const nm=d.name||d.type;const sz=d.size||2;
      h+='<div class="econ-build-row"><span>'+nm+'</span><small class="dim">'+sz+' 格</small></div>';
    }
    return h+'</div>';
  }catch(e){return '';}
}
function xwSectPauseHtml(){
  const panes=[];
  try{const fh=typeof econFinanceHtml==='function'?econFinanceHtml({open:1,noToggle:1}):'';if(fh)panes.push(['fin','財務',fh]);}catch(e){}
  try{const rh=typeof econRankFilterHtml==='function'?econRankFilterHtml():'';if(rh)panes.push(['rank','職位',rh]);}catch(e){}
  try{if(typeof econFlag==='function'&&econFlag('taskTiers')&&typeof econTaskListHtml==='function'){const th=econTaskListHtml(xwTaskQuests(),typeof player==='function'?player():null);if(th)panes.push(['task','任務',th]);}}catch(e){}
  try{const bh=xwNewBuildHtml();if(bh)panes.push(['bld','建築',bh]);}catch(e){}
  try{
    const src=(typeof XEV!=='undefined'&&XEV.L)||[];
    const esc=t=>typeof netEsc==='function'?netEsc(t):String(t==null?'':t).replace(/[&<>]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;'}[c]));
    const idxs=[];for(let i=src.length-1;i>=0&&idxs.length<40;i--){if(typeof xevShowInLog!=='function'||xevShowInLog(src[i].m))idxs.push(i);}
    let eh='<div class="xevl xwsect-ev">';
    if(!idxs.length)eh+='<div class="dim">還沒有事件</div>';
    else for(const i of idxs){const e=src[i];eh+='<div class="xevi'+(e.loc?' go':'')+'" data-xevi="'+i+'"><span class="xevt">'+(typeof xevT==='function'?xevT(e.at):'')+'</span> <span class="xevm">'+(e.loc?'📍':'')+esc(e.m)+'</span></div>';}
    eh+='</div>';
    panes.push(['ev','事件',eh]);
  }catch(e){}
  if(!panes.length)return '';
  let h='<div class="x47g xwsect"><div class="gt">宗門事務</div><div class="xwsect-tb">';
  panes.forEach((p,i)=>{h+='<button type="button" class="btn'+(i===0?' on':'')+'" data-xwsect="'+p[0]+'">'+p[1]+'</button>';});
  h+='</div>';
  panes.forEach((p,i)=>{h+='<div class="xwsect-pane'+(i===0?' on':'')+'" data-xwsect-pane="'+p[0]+'">'+p[2]+'</div>';});
  return h+'</div>';
}
{const _ph=pauseHtml;pauseHtml=function(tab){
  let h=_ph.apply(this,arguments);
  try{
    const sect=xwSectPauseHtml();
    if(sect){
      // Keep sect panes in the existing scroll body; outside it they shrink the game controls to a sliver.
      if(h.indexOf('</div><div class="x47foot dim sm">')>=0)h=h.replace('</div><div class="x47foot dim sm">',sect+'</div><div class="x47foot dim sm">');
      else if(h.indexOf('class="x47foot')>=0)h=h.replace('<div class="x47foot',sect+'<div class="x47foot');
      else if(h.indexOf('<div class="psys">')>=0)h=h.replace('<div class="psys">',sect+'<div class="psys">');
      else h+=sect;
    }
  }catch(e){}
  return h;
};}
{const _rp=renderPanel;renderPanel=function(){
  _rp.apply(this,arguments);
  try{
    const el=document.getElementById('panel');if(!el)return;
    // BATCH2100_FIN_SCOPE：財務／錢包／職務日誌只掛在「單一弟子／主角」面板。
    // 建築、敵人、資源、山寨等共用 #panel 時必須清掉，避免標題是敵人、內容卻是財務。
    const hasOther=!!(typeof selOther!=='undefined'&&selOther);
    const isB=typeof selBuilding!=='undefined'&&selBuilding!=null;
    const one=typeof selUnits!=='undefined'&&selUnits&&selUnits.length===1;
    let u=null;if(one){try{u=typeof unitById==='function'?unitById(selUnits[0]):null;}catch(e){}}
    const isUnit=!!(one&&!hasOther&&!isB&&u&&(u.kind==='disciple'||u.kind==='player'));
    const strip=id=>{const n=el.querySelector(id);if(n){try{n.remove();}catch(e){}}};
    if(!isUnit){strip('#econ_fin');strip('#econ_wal');strip('#xw_off');strip('#xw_dlog');}
    else{
      const fh=typeof econFinanceHtml==='function'?econFinanceHtml({compact:1}):'';
      let box=el.querySelector('#econ_fin');
      if(fh){if(!box){box=document.createElement('div');box.id='econ_fin';el.appendChild(box);}if(box._h!==fh){box._h=fh;box.innerHTML=fh;}}
      else if(box){try{box.remove();}catch(e){}}
      if(typeof econWalletHtml==='function'){const wh=econWalletHtml(u);if(wh){let w=el.querySelector('#econ_wal');if(!w){w=document.createElement('div');w.id='econ_wal';el.appendChild(w);}if(w._h!==wh){w._h=wh;w.innerHTML=wh;}}else strip('#econ_wal');}
      const oh=typeof xevOfficeHtml==='function'?xevOfficeHtml(u):'';if(oh){let o=el.querySelector('#xw_off');if(!o){o=document.createElement('div');o.id='xw_off';el.appendChild(o);}if(o._h!==oh){o._h=oh;o.innerHTML=oh;}}else strip('#xw_off');
      const dh=typeof xevDailyHtml==='function'?xevDailyHtml(u):'';if(dh){let d=el.querySelector('#xw_dlog');if(!d){d=document.createElement('div');d.id='xw_dlog';el.appendChild(d);}if(d._h!==dh){d._h=dh;d.innerHTML=dh;}}else strip('#xw_dlog');
    }
  }catch(e){}
};}
{const _bl=buildLock;buildLock=function(type){
  const r=_bl.apply(this,arguments);if(r)return r;
  try{
    if(typeof econFlag==='function'&&(econFlag('newBuildings')||(type==='kuangchang'&&econFlag('mine')))){
      const d=typeof econBuildingDef==='function'?econBuildingDef(type):null;
      if(d&&!d.merge&&typeof econBuildingUnlocked==='function'&&!econBuildingUnlocked(type)){
        const why=typeof econBuildingLockReason==='function'?econBuildingLockReason(type):'';
        if(why&&String(why).indexOf('realm:')===0){
          const n=+why.slice(6);const nm=(typeof REALMS!=='undefined'&&REALMS[n]&&REALMS[n].n)||('境界'+n);
          return '需有弟子達到「'+nm+'」';
        }
        return (why&&why!=='flag-off')?why:'尚未解鎖';
      }
    }
  }catch(e){}
  return null;
};}

// ======================= 新模組旗標：預設全開；?classic=1／?big=0 恢復舊版 =======================
// 整合層覆寫（不改 map_flags.js／econ_core.js／cult.js 原始預設檔）
const XMOD_SPEC=[
  {g:'cult',set:'cult',k:'dualExp',n:'雙經驗條（築基起）'},
  {g:'cult',set:'cult',k:'breakthrough',n:'達標晉升（取消成功率骰）'},
  {g:'cult',set:'cult',k:'breakDuration',n:'金丹起長時突破'},
  {g:'cult',set:'cult',k:'tribulation',n:'金丹起渡天劫'},
  {g:'cult',set:'cult',k:'dandu',n:'丹毒／走火入魔'},
  {g:'cult',set:'cult',k:'lingqi',n:'靈氣回復與容量調整'},
  {g:'cult',set:'cult',k:'cultLingshi',n:'修煉消耗靈石'},
  {g:'cult',set:'cult',k:'death',n:'重傷與元神'},
  {g:'cult',set:'cult',k:'tacticAI',n:'戰術 AI'},
  {g:'cult',set:'cult',k:'combatJudge',n:'戰鬥判定'},
  {g:'cult',set:'cult',k:'sparring',n:'弟子切磋'},
  {g:'cult',set:'cult',k:'bibi',n:'宗門大比'},
  {g:'cult',set:'cult',k:'gongfa',n:'功法學習／裝備／熟練'},
  {g:'cult',set:'cult',k:'life',n:'壽元／坐化'},
  {g:'econ',set:'econ',k:'treasury',n:'四品靈石、總庫與俸祿'},
  {g:'econ',set:'econ',k:'shop',n:'弟子小店舖'},
  {g:'econ',set:'econ',k:'mine',n:'礦場與靈脈採集'},
  {g:'econ',set:'econ',k:'store',n:'背包擴充、納海戒'},
  {g:'econ',set:'econ',k:'build',n:'建築六級與費用'},
  {g:'econ',set:'econ',k:'cult',n:'經濟：修煉扣石 API'},
  {g:'econ',set:'econ',k:'market',n:'城市／他宗商隊'},
  {g:'econ',set:'econ',k:'newBuildings',n:'新建築目錄'},
  {g:'econ',set:'econ',k:'ranks',n:'職位階級'},
  {g:'econ',set:'econ',k:'elderAI',n:'長老自動理事'},
  {g:'econ',set:'econ',k:'autoRecruit',n:'自動招募'},
  {g:'econ',set:'econ',k:'taskTiers',n:'任務品階'},
  {g:'econ',set:'econ',k:'gf',n:'功法閣（借閱／參悟）'},
  {g:'econ',set:'econ',k:'huzhenCost',n:'護宗陣維持與受擊費用'},
  {g:'map',set:'map',k:'world',n:'煉氣後外層大地圖'},
  {g:'map',set:'map',k:'sects',n:'他宗 AI 與外交'},
  {g:'map',set:'map',k:'cities',n:'中立大城市服務'},
  {g:'map',set:'map',k:'mountQi',n:'高山靈氣加成'},
  {g:'map',set:'map',k:'enemyGear',n:'敵人穿裝'},
  {g:'map',set:'map',k:'zhibao',n:'至寶掉落'},
  {g:'map',set:'map',k:'travel',n:'飛往副本途中遭遇'},
  {g:'map',set:'map',k:'dungeons',n:'新類型副本入口'},
  {g:'map',set:'map',k:'autoParty',n:'弟子自動組隊打副本'},
  {g:'art',set:'map',k:'dgArt',n:'副本室內美術'},
  {g:'art',set:'econ',k:'econArt',n:'建築唐宋造型'},
  {g:'art',set:'cult',k:'fx',n:'修煉／天劫／元神特效'},
  {g:'pop',set:'econ',k:'realmPop',n:'弟子上限隨境界成長'},
  {g:'pop',set:'econ',k:'lod',n:'大量弟子簡化（遠處抽象模擬）'}
];
const XMOD_GNAME={cult:'修煉',econ:'經濟',map:'地圖',art:'美術',pop:'弟子上限'};
const XMOD_EXTRA_ECON=['econArt','huzhenCost','realmPop','lod','gf'];
let XMOD_TAB='res';
function xmodClassic(){
  try{
    const q=new URLSearchParams(location.search||'');
    const c=(q.get('classic')||'').toLowerCase();
    if(c==='1'||c==='true'||c==='on'||c==='yes')return true;
    const b=(q.get('big')||'').toLowerCase();
    if(b==='0'||b==='false'||b==='off'||b==='no')return true;
  }catch(e){}
  return false;
}
function xmodUrlForceOn(){
  try{
    const q=new URLSearchParams(location.search||'');
    const v=(q.get('big')||'').toLowerCase();
    return v==='1'||v==='true'||v==='on'||v==='yes';
  }catch(e){}
  return false;
}
function xmodLoadPrefs(){
  let o={all:true};
  try{
    const raw=(typeof XW_PREFS!=='undefined'&&XW_PREFS.get)?XW_PREFS.get('modflags',''):'';
    if(raw){const p=JSON.parse(raw);if(p&&typeof p==='object')Object.assign(o,p);}
  }catch(e){}
  if(o.all==null)o.all=true;
  return o;
}
function xmodSavePrefs(o){
  try{if(typeof XW_PREFS!=='undefined'&&XW_PREFS.set)XW_PREFS.set('modflags',JSON.stringify(o||{all:true}));}catch(e){}
}
function xmodMasterOn(){
  // t1070u：模組預設永久全開；僅 ?classic=1／?big=0 可關。設定面板不再提供開關。
  if(xmodClassic())return false;
  return true;
}
function xmodFlagOn(k){
  if(!xmodMasterOn())return false;
  if(xmodUrlForceOn())return true;
  const p=xmodLoadPrefs();
  return p[k]!==false;
}
function xmodSeedDefaults(){
  try{
    if(typeof MAP_FLAGS_DEFAULT!=='undefined'&&MAP_FLAGS_DEFAULT){
      for(const k in MAP_FLAGS_DEFAULT)MAP_FLAGS_DEFAULT[k]=true;
      MAP_FLAGS_DEFAULT.autoParty=true;MAP_FLAGS_DEFAULT.dgArt=true;
    }
    if(typeof ECON_FLAGS_DEFAULT!=='undefined'&&ECON_FLAGS_DEFAULT){
      for(const k in ECON_FLAGS_DEFAULT)ECON_FLAGS_DEFAULT[k]=true;
      for(const k of XMOD_EXTRA_ECON)ECON_FLAGS_DEFAULT[k]=true;
    }
    if(typeof CULT_FLAGS!=='undefined'&&CULT_FLAGS){
      for(const k in CULT_FLAGS)CULT_FLAGS[k]=true;
      CULT_FLAGS.fx=true;
      CULT_FLAGS.life=true;
    }
  }catch(e){}
}
function xmodEnsureState(){
  try{
    if(typeof S==='undefined'||!S)return;
    if(!S.map||typeof S.map!=='object')S.map={};
    if(!S.map.flags||typeof S.map.flags!=='object')S.map.flags={};
    if(!S.econ||typeof S.econ!=='object')S.econ={};
    if(!S.econ.flags||typeof S.econ.flags!=='object')S.econ.flags={};
    const MF=typeof MAP_FLAGS_DEFAULT!=='undefined'?MAP_FLAGS_DEFAULT:{};
    for(const k in MF)if(S.map.flags[k]==null)S.map.flags[k]=true;
    if(S.map.flags.dgArt==null)S.map.flags.dgArt=true;
    if(S.map.flags.autoParty==null)S.map.flags.autoParty=true;
    const EF=typeof ECON_FLAGS_DEFAULT!=='undefined'?ECON_FLAGS_DEFAULT:{};
    for(const k in EF)if(S.econ.flags[k]==null)S.econ.flags[k]=true;
    for(const k of XMOD_EXTRA_ECON)if(S.econ.flags[k]==null)S.econ.flags[k]=true;
  }catch(e){}
}
function xmodApply(){
  try{
    xmodSeedDefaults();
    xmodEnsureState();
    const master=xmodMasterOn();
    window.__XW_BIG__=!!master;
    const cultO={};
    for(const it of XMOD_SPEC){
      const on=xmodFlagOn(it.k);
      if(it.set==='map'){try{if(S&&S.map&&S.map.flags)S.map.flags[it.k]=on;}catch(e){}}
      else if(it.set==='econ'){try{if(S&&S.econ&&S.econ.flags)S.econ.flags[it.k]=on;}catch(e){}}
      else if(it.set==='cult')cultO[it.k]=on;
    }
    if(typeof CULT_FLAGS!=='undefined'&&CULT_FLAGS){
      if(typeof Cult!=='undefined'&&Cult&&typeof Cult.setFlags==='function')Cult.setFlags(cultO);
      else for(const k in cultO)CULT_FLAGS[k]=!!cultO[k];
      CULT_FLAGS.fx=xmodFlagOn('fx');
    }
    try{if(typeof econArtMigrate==='function')econArtMigrate();}catch(e){}
    try{if(typeof xeconMigrate==='function')xeconMigrate();}catch(e){}
    try{if(S&&S.econ&&S.econ.flags){for(const it of XMOD_SPEC)if(it.set==='econ')S.econ.flags[it.k]=xmodFlagOn(it.k);}}catch(e){}
    const stamp=obj=>{if(!obj)return;for(const k of Object.keys(obj))obj[k]=xmodFlagOn(k);};
    try{if(S&&S.map&&S.map.flags)stamp(S.map.flags);}catch(e){}
    try{if(S&&S.econ&&S.econ.flags)stamp(S.econ.flags);}catch(e){}
    try{if(typeof CULT_FLAGS!=='undefined'&&CULT_FLAGS)stamp(CULT_FLAGS);}catch(e){}
    // 境界已達煉氣時，stamp 後仍強制解鎖（避免 prefs 把 world 蓋回 false）
    try{if(typeof xmapUnlockIf==='function')xmapUnlockIf();}catch(e){}
  }catch(e){}
}
function xbigWanted(){return xmodMasterOn();}
function xbigSetUrl(on){
  try{
    const u=new URL(location.href);
    if(on){
      u.searchParams.delete('classic');
      if(u.searchParams.get('big')==='0')u.searchParams.delete('big');
    }
    history.replaceState(null,'',u.pathname+u.search+u.hash);
  }catch(e){}
}
function xbigOn(){
  const p=xmodLoadPrefs();p.all=true;xmodSavePrefs(p);
  window.__XW_BIG__=true;
  xmodApply();
}
function xbigOff(){
  const p=xmodLoadPrefs();p.all=false;xmodSavePrefs(p);
  window.__XW_BIG__=false;
  xmodApply();
}
function xbigApplyIf(){xmodApply();}
function xbigToggle(on){
  if(on){xbigOn();xbigSetUrl(true);try{if(typeof toast==='function')toast('新模組已全部開啟');}catch(e){}}
  else{xbigOff();xbigSetUrl(false);try{if(typeof toast==='function')toast('新模組已全部關閉（舊版行為）');}catch(e){}}
}
{const _ng=newGame;newGame=function(){const r=_ng.apply(this,arguments);try{xmodApply();}catch(e){}return r;};}
{const _as=applySave;applySave=function(d){const r=_as.apply(this,arguments);try{if(r)xmodApply();}catch(e){}
    try{if(r&&d&&Array.isArray(d.units)){const coords=(S.dg&&S.dg.W&&d.dgArea&&Array.isArray(d.dgArea.units))?d.dgArea.units:(S.dg&&d.dg&&d.dg.live&&Array.isArray(d.dg.live.units))?d.dg.live.units:d.units;const by=new Map();for(const u of coords)if(u&&u.id!=null)by.set(u.id,u);
      for(const u of (S.units||[])){const sv=by.get(u.id);if(sv&&typeof sv.x==='number'&&isFinite(sv.x)){u.x=sv.x;if(typeof sv.y==='number'&&isFinite(sv.y))u.y=sv.y;}}}
    }catch(e){}
    return r;};}
// t1070u：移除「新模組測試旗標」列與開關；模組維持全開（?classic=1／?big=0 仍可用）
{const _ph=pauseHtml;pauseHtml=function(tab){
  let h=_ph.apply(this,arguments);
  try{h=String(h).replace(/<div class="trow" id="xbigrow"[\s\S]*?<\/div>/g,'');}catch(e){}
  return h;
};}
// 殘留 data-xbig 點擊失效（若舊快取 HTML）
document.addEventListener('click',function(ev){
  const el=ev.target&&ev.target.closest&&ev.target.closest('[data-xbig],#xbigrow');
  if(!el)return;
  ev.preventDefault();ev.stopPropagation();
  try{const row=document.getElementById('xbigrow');if(row)row.remove();}catch(e){}
},true);
// 清掉本機把 all 關掉的偏好，避免舊偏好誤關（URL classic 仍可關）
try{const p=xmodLoadPrefs();if(p&&p.all===false){p.all=true;xmodSavePrefs(p);}}catch(e){}
xmodSeedDefaults();
setTimeout(xmodApply,0);

const XMOD_TABS=[['res','資源'],['realm','修為境界'],['disc','弟子'],['build','建築'],['mapdg','地圖副本'],['flags','功能開關'],['misc','其他']];
const XMOD_BTNS={res:['res','ls'],realm:['xiu','brk'],disc:['dxiu','heal'],build:[],mapdg:['map','kill','raid'],misc:['god','spd','ev','cd','day']};
function xmodDbgCss(){
  if(document.getElementById('xmoddbgcss'))return;
  const st=document.createElement('style');st.id='xmoddbgcss';
  st.textContent=`#x47dbg.xmoddbg{position:fixed;left:50%;top:50%;transform:translate(-50%,-50%);width:min(720px,calc(100% - 24px));height:auto;max-height:min(640px,calc(100vh - var(--tb,44px) - 28px));display:flex;flex-direction:column;padding:0;overflow:hidden;background:#14110cf7;border:1px solid #c9a35a;color:#f3e3c0;z-index:96!important;box-shadow:0 18px 60px #000c}
body.x47dbgopen #objectives,body.x47dbgopen #tutbub,body.x47dbgopen #tutring,body.x47dbgopen #help,body.x47dbgopen #toasts{visibility:hidden!important;pointer-events:none!important}
body.x47dbgopen #toasts{z-index:1!important}
#x47dbg.xmoddbg h3{margin:0;padding:10px 12px 8px;color:#ffd98a;font-size:15px;border-bottom:1px solid #8a6a3a55;flex-shrink:0}
#x47dbg .xmod-tb{display:flex;flex-wrap:nowrap;gap:0;overflow-x:auto;-webkit-overflow-scrolling:touch;border-bottom:1px solid #8a6a3a;padding:0 4px;flex-shrink:0;scrollbar-width:thin}
#x47dbg .xmod-tb .btn{flex:0 0 auto;background:none;border:0;border-bottom:2px solid transparent;border-radius:0;color:#cbb992;padding:8px 12px;min-height:40px;white-space:nowrap}
#x47dbg .xmod-tb .btn.on{color:#f3e0a8;border-bottom-color:#d7b56a;font-weight:bold}
#x47dbg .xmod-body{overflow:auto;flex:1;min-height:0;padding:8px 12px 10px;-webkit-overflow-scrolling:touch}
#x47dbg .xmod-g{display:grid;grid-template-columns:1fr 1fr;gap:6px}
#x47dbg .xmod-g.xmod-res{grid-template-columns:repeat(3,1fr)}
body.touch #x47dbg .xmod-g{grid-template-columns:1fr}
body.touch #x47dbg .xmod-g.xmod-res{grid-template-columns:repeat(2,1fr)}
#x47dbg .xmod-g .btn{min-height:38px;text-align:left}
body.touch #x47dbg .xmod-g .btn{min-height:44px}
#x47dbg .xmod-sec{color:#c9a35a;letter-spacing:2px;font-size:12px;margin:10px 0 4px;border-bottom:1px solid #8a6a3a55;padding-bottom:2px}
#x47dbg .xmodck{display:flex;align-items:flex-start;gap:8px;padding:8px 2px;border-bottom:1px solid #8a6a3a33;font-size:13px;line-height:1.4;cursor:pointer}
#x47dbg .xmodck input{margin-top:2px;min-width:18px;min-height:18px;flex:0 0 auto}
#x47dbg .xmod-note{opacity:.75;font-size:12px;margin:0 0 8px;line-height:1.45}
#x47dbg .xmod-all{display:flex;gap:6px;margin:0 0 8px;flex-wrap:wrap}
#x47dbg .xmod-foot{display:flex;justify-content:flex-end;padding:8px 12px;border-top:1px solid #8a6a3a55;flex-shrink:0}
#x47dbg .xmod-empty{opacity:.7;padding:12px 4px;font-size:13px;line-height:1.5}`;
  document.head.appendChild(st);
}
function xmodDbgHtml(){
  const tabs=XMOD_TABS.map(t=>`<button type="button" class="btn${XMOD_TAB===t[0]?' on':''}" data-xmodtab="${t[0]}">${t[1]}</button>`).join('');
  let body='';
  if(XMOD_TAB==='flags'){
    const classic=xmodClassic(),master=xmodMasterOn();
    body+=`<div class="xmod-note">${classic?'網址 ?classic=1 或 ?big=0：強制舊版（全部關閉）。去掉參數後會恢復你保存的開關。':(master?'新模組預設全開。取消勾選即關閉該系統，並會記住。':'總開關已關；點「全部開」或暫停選單旗標可恢復。')}</div>`;
    body+=`<div class="xmod-all"><button type="button" class="btn pri" data-xmodall="1">全部開</button><button type="button" class="btn" data-xmodall="0">全部關</button></div>`;
    let last='';
    for(const it of XMOD_SPEC){
      if(it.g!==last){last=it.g;body+=`<div class="xmod-sec">${XMOD_GNAME[it.g]||it.g}</div>`;}
      const on=xmodFlagOn(it.k);
      body+=`<label class="xmodck"><input type="checkbox" data-xmod="${it.k}"${on?' checked':''}${classic?' disabled':''}>${it.n}</label>`;
    }
  }else if(XMOD_TAB==='res'){
    const names=(typeof RES_NAMES!=='undefined'&&RES_NAMES)||{wood:'木材',stone:'石材',fiber:'纖維',food:'食物',iron:'鐵礦',herb:'藥草',lingshi:'靈石'};
    const keys=(typeof RES_KEYS!=='undefined'&&RES_KEYS)||Object.keys(names);
    const grades=(typeof ECON_GRADE_NAME!=='undefined'&&ECON_GRADE_NAME)||{xia:'下品靈石',zhong:'中品靈石',shang:'上品靈石',ji:'極品靈石'};
    body+='<div class="xmod-sec">快捷</div><div class="xmod-g">';
    body+='<button type="button" class="btn" data-x47g="res">資源各 +1000</button>';
    body+='<button type="button" class="btn" data-x47g="ls">靈石 +500</button>';
    body+='<button type="button" class="btn" data-xwres="full">滿倉</button></div>';
    body+='<div class="xmod-sec">各資源 +1000</div><div class="xmod-g xmod-res">';
    for(const k of keys)body+=`<button type="button" class="btn" data-xwres="r:${k}">${names[k]||k} +1000</button>`;
    body+='</div><div class="xmod-sec">靈石品階 +1000</div><div class="xmod-g xmod-res">';
    for(const gk of ['xia','zhong','shang','ji'])body+=`<button type="button" class="btn" data-xwres="g:${gk}">${grades[gk]||gk} +1000</button>`;
    body+='</div>';
  }else{
    const ids=XMOD_BTNS[XMOD_TAB]||[];
    if(!ids.length)body+='<div class="xmod-empty">此分頁沒有快捷動作。建造、升級請用遊戲內建築指令。</div>';
    else{
      body+='<div class="xmod-g">';
      const list=(typeof X47_DBG!=='undefined'&&X47_DBG)||[];
      for(const id of ids){
        const D=list.find(d=>d[0]===id);
        if(D)body+=`<button type="button" class="btn" data-x47g="${D[0]}">${D[1]}</button>`;
      }
      body+='</div>';
    }
    if(XMOD_TAB==='disc'||XMOD_TAB==='realm'){
      body+='<div class="xmod-sec">氣血（可超過一萬）</div><div class="xmod-g">';
      body+='<button type="button" class="btn" data-xwhp="hero">主角氣血上限 5萬</button>';
      body+='<button type="button" class="btn" data-xwhp="disc">一名弟子氣血上限 5萬</button></div>';
    }
  }
  // #11：.scroll 讓 g7 全域 touchmove 攔截放行，手機可用手指捲動功能開關／分頁列（滾輪原本即可）
  return `<h3>🛠 金手指 <span class="dim sm">（測試用，會影響存檔）</span></h3><div class="xmod-tb scroll">${tabs}</div><div class="xmod-body scroll">${body}</div><div class="xmod-foot"><button type="button" class="btn pri" data-x47g="x">關閉</button></div>`;
}
function xmodDbgPaint(){
  const el=document.getElementById('x47dbg');if(!el)return;
  xmodDbgCss();el.classList.add('xmoddbg','ui');el.classList.remove('x47dbg-closed');
  el.removeAttribute('hidden');el.style.removeProperty('display');
  el.innerHTML=xmodDbgHtml();el.style.display='block';
  try{document.body.classList.add('x47dbgopen');}catch(e){}
}
{const _dbg=x47DbgOpen;x47DbgOpen=function(){
  const r=_dbg.apply(this,arguments);
  try{xmodDbgPaint();}catch(e){}
  return r;
};}
{const _dc=x47DbgClose;x47DbgClose=function(){
  try{document.body.classList.remove('x47dbgopen');}catch(e){}
  const r=_dc.apply(this,arguments);
  try{const el=document.getElementById('x47dbg');if(el){el.classList.add('x47dbg-closed');el.style.setProperty('display','none','important');el.setAttribute('hidden','');}}catch(e){}
  return r;
};}
// Esc 關閉金手指；Ctrl+Shift+D 在泡泡階段再關一次（補 g21 未收到事件時）
addEventListener('keydown',function(ev){
  try{
    const el=document.getElementById('x47dbg');
    const open=document.body.classList.contains('x47dbgopen')||(el&&!el.classList.contains('x47dbg-closed')&&el.style.display!=='none'&&getComputedStyle(el).display!=='none');
    const isEsc=ev.code==='Escape'||ev.key==='Escape';
    const isCSD=(ev.ctrlKey||ev.metaKey)&&ev.shiftKey&&(ev.code==='KeyD'||(ev.key&&String(ev.key).toLowerCase()==='d'));
    if(isEsc&&open){x47DbgClose();ev.preventDefault();ev.stopImmediatePropagation();return;}
    if(isCSD&&open){
      // 只負責關閉；開啟仍由 g21 處理，避免雙綁互開
      x47DbgClose();ev.preventDefault();
    }
  }catch(e){}
},true);
function xmodGiveRes(spec){
  if(!S||!S.res||!spec)return;
  const say=m=>{try{if(typeof toast==='function')toast(m);}catch(e){}try{if(typeof updateUI==='function')updateUI();}catch(e){}};
  if(spec==='full'){
    const keys=(typeof RES_KEYS!=='undefined'&&RES_KEYS)||Object.keys(S.res);
    for(const k of keys)S.res[k]=(typeof v53Cap==='function')?v53Cap(k):Math.max(S.res[k]||0,99999);
    try{if(typeof econSyncVaultFromRes==='function')econSyncVaultFromRes(S);}catch(e){}
    say('滿倉');return;
  }
  if(spec.slice(0,2)==='r:'){
    const k=spec.slice(2);S.res[k]=(S.res[k]||0)+1000;
    try{if(k==='lingshi'&&typeof econSyncVaultFromRes==='function')econSyncVaultFromRes(S);}catch(e){}
    say(((typeof RES_NAMES!=='undefined'&&RES_NAMES[k])||k)+' +1000');return;
  }
  if(spec.slice(0,2)==='g:'){
    const g=spec.slice(2),gn=(typeof ECON_GRADE_NAME!=='undefined'&&ECON_GRADE_NAME[g])||g;
    try{
      if(S.econ&&S.econ.vault){S.econ.vault[g]=(S.econ.vault[g]||0)+1000;if(typeof econSyncResFromVault==='function')econSyncResFromVault(S);}
      else S.res.lingshi=(S.res.lingshi||0)+1000;
    }catch(e){S.res.lingshi=(S.res.lingshi||0)+1000;}
    say(gn+' +1000');
  }
}
document.addEventListener('click',function(ev){
  const tab=ev.target&&ev.target.closest&&ev.target.closest('[data-xmodtab]');
  if(tab&&tab.closest('#x47dbg')){ev.preventDefault();XMOD_TAB=tab.getAttribute('data-xmodtab')||'res';xmodDbgPaint();return;}
  const all=ev.target&&ev.target.closest&&ev.target.closest('[data-xmodall]');
  if(all&&all.closest('#x47dbg')){ev.preventDefault();xbigToggle(all.getAttribute('data-xmodall')==='1');xmodDbgPaint();return;}
  const rb=ev.target&&ev.target.closest&&ev.target.closest('#x47dbg [data-xwres]');
  if(rb){ev.preventDefault();xmodGiveRes(rb.getAttribute('data-xwres'));return;}
  const hb=ev.target&&ev.target.closest&&ev.target.closest('#x47dbg [data-xwhp]');
  if(hb){ev.preventDefault();xwGiveHp(hb.getAttribute('data-xwhp'));return;}
},true);
function xwGiveHp(who){
  const bump=u=>{if(!u||u.dead)return false;u.maxhp=50000;u.hp=50000;return true;};
  const say=m=>{try{if(typeof toast==='function')toast(m);}catch(e){}try{if(typeof updateUI==='function')updateUI();}catch(e){}};
  if(who==='hero'){
    const p=typeof player==='function'?player():null;
    say(bump(p)?'主角氣血上限 5萬':'沒有主角');return;
  }
  let d=null;
  try{if(typeof selUnits!=='undefined'&&selUnits)d=selUnits.map(unitById).find(u=>u&&u.kind==='disciple'&&!u.dead);}catch(e){}
  if(!d){try{d=(typeof disciples==='function'?disciples():[]).find(u=>u&&!u.dead);}catch(e){}}
  say(bump(d)?((typeof nm==='function'?nm(d):d.name)+' 氣血上限 5萬'):'沒有弟子');
}

document.addEventListener('change',function(ev){
  const inp=ev.target&&ev.target.closest&&ev.target.closest('#x47dbg [data-xmod]');
  if(!inp)return;
  const k=inp.getAttribute('data-xmod');if(!k)return;
  const p=xmodLoadPrefs();p[k]=!!inp.checked;xmodSavePrefs(p);
  if(inp.checked){p.all=true;xmodSavePrefs(p);}
  xmodApply();
},true);


document.addEventListener('click',function(ev){
  const t=ev.target&&ev.target.closest&&ev.target.closest('[data-xwsect]');
  if(!t||!t.closest('.xwsect'))return;
  const box=t.closest('.xwsect');const k=t.getAttribute('data-xwsect');
  box.querySelectorAll('.xwsect-tb [data-xwsect]').forEach(b=>b.classList.toggle('on',b.getAttribute('data-xwsect')===k));
  box.querySelectorAll('[data-xwsect-pane]').forEach(p=>p.classList.toggle('on',p.getAttribute('data-xwsect-pane')===k));
},true);
{const _u=updateUI;updateUI=function(){
  const r=_u.apply(this,arguments);
  try{
    const box=document.getElementById('r_lsgrades');
    if(box){
      const on=typeof econFlag==='function'&&econFlag('treasury')&&typeof S!=='undefined'&&S&&S.econ&&S.econ.vault;
      box.classList.toggle('on',!!on);
      if(on){
        const v=S.econ.vault;
        const set=(id,n)=>{const e=document.getElementById(id);if(e){const t=String(n||0);if(e.textContent!==t)e.textContent=t;}};
        set('r_ls_xia',v.xia);set('r_ls_zhong',v.zhong);set('r_ls_shang',v.shang);set('r_ls_ji',v.ji);
      }
    }
  }catch(e){}
  return r;
};}

// 畫質：寫入 settings.quality／gfx，與 cult_fx.js 及解析度／粒子共用同一檔
// 設定→畫質 高/中/低 → mapDgArtSetQuality('high'|'medium'|'low')；未設定則 'auto'
let xwQualityBootUnset=false;
(function(){
  try{
    if(typeof OPT173!=='undefined'&&Array.isArray(OPT173)&&!OPT173.some(o=>o.k==='quality')){
      const i=Math.max(0,OPT173.findIndex(o=>o.k==='res'));
      OPT173.splice(i<0?0:i,0,{k:'quality',tab:'gfx',n:'畫質',d:'高／中／低同時套用解析度、粒子特效與修煉特效（天劫、突破、元神）。也可再微調下方解析度與粒子。',t:'cy',o:[['high','高'],['mid','中'],['low','低']],def:'high'});
    }
    if(typeof CFG173!=='undefined'&&CFG173&&CFG173.quality==null){
      xwQualityBootUnset=true;
      const r=(typeof v173Res==='function')?v173Res():1;
      CFG173.quality=r>=0.94?'high':r>=0.74?'mid':'low';
    }
  }catch(e){}
})();
function xwSyncCultFxQuality(prev,snapQ){
  try{
    const c=typeof CFG173!=='undefined'?CFG173:null;if(!c)return;
    const rawQ=(arguments.length>=2)?snapQ:c.quality;
    const map={high:{res:100,fx:2},mid:{res:80,fx:1},low:{res:60,fx:0}};
    if(prev&&prev.quality!==c.quality&&map[c.quality]){
      c.res=map[c.quality].res;c.fx=map[c.quality].fx;
    }
    let q=c.quality;
    if(q!=='high'&&q!=='mid'&&q!=='low'){
      const r=(typeof v173Res==='function')?v173Res():((+c.res||100)/100);
      q=r>=0.94?'high':r>=0.74?'mid':'low';
      c.quality=q;
    }
    if(typeof settings!=='undefined'&&settings){
      settings.quality=q;settings.gfx=q;settings.fxQuality=q;settings.drawQuality=q;
    }
    try{
      if(typeof mapDgArtSetQuality==='function'){
        if(rawQ==='high')mapDgArtSetQuality('high');
        else if(rawQ==='mid'||rawQ==='medium')mapDgArtSetQuality('medium');
        else if(rawQ==='low')mapDgArtSetQuality('low');
        else mapDgArtSetQuality('auto');
      }
    }catch(e){}
  }catch(e){}
}
{const _ap=v173Apply;v173Apply=function(prev){
  const snap=(typeof CFG173!=='undefined'&&CFG173)?CFG173.quality:undefined;
  try{xwSyncCultFxQuality(prev,snap);}catch(e){}
  const r=_ap.apply(this,arguments);
  try{xwSyncCultFxQuality(prev,snap);}catch(e){}
  return r;
};}
setTimeout(function(){
  try{
    const snap=xwQualityBootUnset?undefined:(typeof CFG173!=='undefined'&&CFG173?CFG173.quality:undefined);
    xwSyncCultFxQuality(null,snap);
  }catch(e){}
},0);


// ======================= realmPop：弟子上限隨境界＋大量弟子 LOD（為日後宗門 PVP 同步預留精簡狀態） =======================
TUNE.xn=TUNE.xn||{};
TUNE.xn.realmPop={
  // 武徒,武師,大武師,宗師,煉氣,築基,金丹,元嬰,化神,合體,地仙,天仙
  cap:[8,10,15,20,40,80,120,200,350,600,1000,1000],
  houseMul:[1,1,1,1,1,1,1,4,8,12,20,20]
};
TUNE.xn.lod={heavyN:64,farStep:0.25,midMod:3,drawHigh:220,drawMid:140,drawLow:80,cell:4,posQ:4};
function xrpOn(){try{return !!(S&&S.econ&&S.econ.flags&&S.econ.flags.realmPop);}catch(e){return false;}}
function xrpTop(){try{if(typeof xhzTopRealm==='function')return xhzTopRealm();}catch(e){}
  let r=0;try{const p=typeof player==='function'?player():null;if(p&&!p.dead)r=Math.max(r,p.realm||0);
    const list=typeof disciples==='function'?disciples():((S&&S.units)||[]);
    for(const u of list){if(u&&!u.dead)r=Math.max(r,u.realm||0);}}catch(e){}return r;}
function xrpLookup(arr){const a=arr||[];const i=Math.max(0,Math.min(a.length-1,xrpTop()|0));return a[i];}
function xrpHouseMul(){return xrpOn()?((xrpLookup((TUNE.xn.realmPop||{}).houseMul))||1):1;}
function xrpRealmCap(){if(!xrpOn())return null;const v=xrpLookup((TUNE.xn.realmPop||{}).cap);return v==null?null:v;}
function xrpBuildingCap(){const mul=xrpHouseMul();let c=0;
  for(const b of S.buildings){if(!b.built)continue;const D=BUILD[b.type];if(!D)continue;let p=(D.pop||0)+(typeof lvPop==='function'?lvPop(b):0);if(b.type==='house')p*=mul;c+=p;}
  return c;}
{const _pc=popCap;popCap=function(){
  if(!xrpOn())return _pc.apply(this,arguments);
  const bc=xrpBuildingCap(),rc=xrpRealmCap();
  return rc==null?bc:Math.min(bc,rc);
};}
{const _ui=updateUI;updateUI=function(){
  const r=_ui.apply(this,arguments);
  try{
    if(xrpOn()){
      const el=typeof $==='function'?$('r_pop'):document.getElementById('r_pop');
      if(el){const rc=xrpRealmCap();el.textContent=disciples().length+'/'+popCap()+(rc!=null?' (境界上限 '+rc+')':'');}
    }
  }catch(e){}
  return r;
};}

const XLOD={frame:0,heavy:false,n:0,tickMs:0,revealN:0,drawn:0,abs:0,full:0};
function xlodQuality(){
  try{const q=(typeof settings!=='undefined'&&settings&&(settings.quality||settings.gfx||settings.fxQuality))||'';
    if(q==='low'||q==='mid'||q==='high')return q;}catch(e){}
  try{if(typeof qScale==='number'){if(qScale<=0.65)return 'low';if(qScale<=0.85)return 'mid';}}catch(e){}
  return 'high';
}
function xlodHeavy(){return !!XLOD.heavy;}
function xlodPrep(){
  XLOD.frame++;XLOD.abs=0;XLOD.full=0;XLOD.drawn=0;
  let n=0;for(const u of S.units)if(u.kind==='disciple'&&!u.dead)n++;
  XLOD.n=n;XLOD.heavy=n>=((TUNE.xn.lod&&TUNE.xn.lod.heavyN)||64)&&(typeof xmodFlagOn!=='function'||xmodFlagOn('lod'));
  if(!XLOD.heavy){for(const u of S.units){if(u.kind==='disciple'){u._lod=0;u._lodDraw=1;}}return;}
  let ct={x:0,y:0};try{ct=unIso(cam.x,cam.y);}catch(e){}
  const Q=xlodQuality(),L=TUNE.xn.lod||{};
  const drawMax=Q==='low'?(L.drawLow||80):Q==='mid'?(L.drawMid||140):(L.drawHigh||220);
  const scored=[];
  for(const u of S.units){
    if(u.kind!=='disciple'||u.dead)continue;
    const d=Math.abs((u.x||0)-ct.x)+Math.abs((u.y||0)-ct.y);
    let tier=2;
    if((u.task&&u.task.type==='attack')||u.job==='follow'||u.job==='guard')tier=d<32?0:1;
    else if(d<18)tier=0;
    else if(d<42)tier=1;
    u._lod=tier;u._lodD=d;u._lodDraw=0;scored.push(u);
  }
  scored.sort((a,b)=>a._lodD-b._lodD);
  let k=0;
  for(const u of scored){if(k<drawMax){u._lodDraw=1;k++;}}
  try{if(typeof selUnits!=='undefined')for(const id of selUnits){const u=unitById(id);if(u&&u.kind==='disciple'){u._lod=0;u._lodDraw=1;}}}catch(e){}
}
function xlodCanAbs(u){
  if(!u||u.kind!=='disciple'||u.dead)return false;
  try{if(typeof selUnits!=='undefined'&&selUnits&&selUnits.includes(u.id))return false;}catch(e){}
  if(u.task&&(u.task.type==='attack'||u.task.type==='build'||u.task.type==='repair'))return false;
  if(u.job==='follow'||u.job==='guard')return false;
  const j=u.job;
  if(j==='gather'||j==='rest'||j==='train'||j==='seclude'||j==='study'||j==='lecture')return true;
  if(u.xslp||u.medit||(u.task&&u.task.type==='meditate'))return true;
  return false;
}
function xlodQ(v){const q=(TUNE.xn.lod&&TUNE.xn.lod.posQ)||4;return Math.round((+v||0)*q)/q;}
function xlodPack(u){if(!u)return null;return {id:u.id,realm:u.realm|0,hp:Math.round(u.hp||0),job:u.job||(u.task&&u.task.type)||'',x:xlodQ(u.x),y:xlodQ(u.y)};}
function xlodPackAll(){const a=[];for(const u of S.units){if(u.kind==='disciple'&&!u.dead)a.push(xlodPack(u));}return a;}
function xlodSquads(){
  const cell=(TUNE.xn.lod&&TUNE.xn.lod.cell)||4,M=new Map();
  for(const u of S.units){
    if(u.kind!=='disciple'||u.dead)continue;
    const gx=Math.floor((u.x||0)/cell),gy=Math.floor((u.y||0)/cell);
    const job=u.job||(u.task&&u.task.type)||'idle';
    const key=job+'|'+gx+','+gy;let s=M.get(key);
    if(!s){s={job,x:gx*cell+cell/2,y:gy*cell+cell/2,n:0,hp:0,realm:0,ids:[]};M.set(key,s);}
    s.n++;s.hp+=u.hp||0;s.realm+=u.realm||0;if(s.ids.length<8)s.ids.push(u.id);
  }
  const out=[];for(const s of M.values())out.push({job:s.job,x:s.x,y:s.y,n:s.n,hp:s.n?Math.round(s.hp/s.n):0,realm:s.n?Math.round(s.realm/s.n*10)/10:0,ids:s.ids});
  return out;
}
// 抽象模擬必須確定性（同樣 state + 量化時間 → 同樣結果），供日後宗門對戰精簡同步；此處不用 rnd()
function xlodAbsGather(u,dt){
  const res=u.jobRes||'wood';
  const cap=(typeof CARRY_CAP==='number')?CARRY_CAP:10;
  if(u.carry&&u.carry.amt>=cap){
    const t=u.carry.type||res,amt=u.carry.amt|0;
    if(amt>0){S.res[t]=(S.res[t]||0)+amt;S.stats.discDeposit=(S.stats.discDeposit||0)+1;try{gainXiu(u,1);}catch(e){}}
    u.carry=null;return;
  }
  let n=u.jnode!=null&&typeof nodeById==='function'?nodeById(u.jnode):null;
  if(!n||n.amount<=0){
    const bucket=Math.floor((S.time||0)*4);
    if(((u.id+bucket)&15)===0&&typeof findNearestNode==='function'){
      n=findNearestNode(res,u.x,u.y,36,u);u.jnode=n?n.id:null;
    }else n=null;
  }
  if(!n||!(n.amount>0))return;
  u.gt=(u.gt||0)+(u.gat||1)*dt*(n.type==='vein'||n.type==='iron'?0.6:1);
  let add=Math.floor(u.gt);if(add<=0)return;u.gt-=add;
  if(add>n.amount)add=n.amount;n.amount-=add;if(typeof S.nodeMods!=='undefined')S.nodeMods[n.id]=n.amount;
  if(n.amount<=0&&typeof removeNode==='function'){try{removeNode(n);}catch(e){}u.jnode=null;}
  if(!u.carry||u.carry.type!==res)u.carry={type:res,amt:0};u.carry.amt+=add;
}
function xlodAbstract(u,dt){
  XLOD.abs++;
  u.cd=(u.cd||0)-dt;u.repath=(u.repath||0)-dt;u.anim=0;u.working=false;u.slowT=(u.slowT||0)-dt;
  u.dvx=0;u.dvy=0;u.vx=0;u.vy=0;if(u.path&&u.path.length)u.path.length=0;
  if(S.time-(u.lastHit||0)>5&&u.hp<u.maxhp)u.hp=Math.min(u.maxhp,u.hp+(3+(u.realm||0)*1.5)*dt);
  if(u.xslp||u.job==='rest'||(u.aiJob&&u.aiJob.k==='rest')){u.slp=Math.min(100,(u.slp||0)+dt*5);return;}
  if(u.job==='gather'){xlodAbsGather(u,dt);return;}
  if(u.job==='train'||u.job==='seclude'||u.job==='study'||u.job==='lecture'||u.medit||(u.task&&u.task.type==='meditate')){
    const m=u.job==='seclude'?2.4:u.job==='train'?1.6:1.2;const mul=typeof cultMul==='function'?cultMul(u):1;
    try{gainXiu(u,m*mul*dt);}catch(e){}
    return;
  }
}
{const _uu=updateUnit;updateUnit=function(u,dt){
  try{
    if(u&&u.kind==='disciple'&&XLOD.heavy&&!u.dead){
      if(xlodCanAbs(u)){
        u._lodAcc=(u._lodAcc||0)+dt;
        const far= (u._lod||0)>=2; const step=far?((TUNE.xn.lod&&TUNE.xn.lod.farStep)||0.25):0;
        if(step&&u._lodAcc<step)return;
        const adt=u._lodAcc||dt;u._lodAcc=0;xlodAbstract(u,adt);return;
      }
      const tier=u._lod==null?0:u._lod;
      if(tier>=2){u._lodAcc=(u._lodAcc||0)+dt;const step=(TUNE.xn.lod&&TUNE.xn.lod.farStep)||0.25;if(u._lodAcc<step)return;const adt=u._lodAcc;u._lodAcc=0;xlodAbstract(u,adt);return;}
      if(tier===1){u._lodAcc=(u._lodAcc||0)+dt;const mod=(TUNE.xn.lod&&TUNE.xn.lod.midMod)||3;if(((u.id+XLOD.frame)%mod)!==0)return;const adt=u._lodAcc;u._lodAcc=0;XLOD.full++;return _uu.call(this,u,adt);}
    }
  }catch(e){}
  if(u&&u.kind==='disciple')XLOD.full++;
  return _uu.apply(this,arguments);
};}
{const _dh=drawHuman;drawHuman=function(u){
  try{if(XLOD.heavy&&u&&u.kind==='disciple'&&!u._lodDraw)return;if(u&&u.kind==='disciple')XLOD.drawn++;}catch(e){}
  return _dh.apply(this,arguments);
};}
{const _ne=nearestEnemy;nearestEnemy=function(x,y,r){
  try{
    if(XLOD.heavy&&NBmap&&r<=14){
      let best=null,bd=r;const nbc=typeof NBC==='number'?NBC:2;const cx=(x/nbc)|0,cy=(y/nbc)|0,rc=Math.ceil(r/nbc)+1;
      for(let j=cy-rc;j<=cy+rc;j++)for(let i=cx-rc;i<=cx+rc;i++){
        const a=NBmap.get(i*1000+j);if(!a)continue;
        for(const o of a){if(o.kind||o.dead||!(o.hp>0)||!o.type)continue;if(typeof ENEMY!=='undefined'&&!ENEMY[o.type])continue;
          const d=dist(x,y,o.x,o.y);if(d<bd){bd=d;best=o;}}
      }
      return best;
    }
  }catch(e){}
  return _ne.apply(this,arguments);
};}
{const _sep=separate;separate=function(list){
  try{if(XLOD.heavy&&Array.isArray(list)&&list.length>80)list=list.filter(o=>!o||o.kind!=='disciple'||(!xlodCanAbs(o)&&(o._lod||0)<2));}catch(e){}
  return _sep.call(this,list);
};}
{const _rev=reveal;reveal=function(x,y,r){
  try{if(XLOD.heavy){XLOD.revealN++;if(XLOD.revealN>36&&r&&r<=6)return false;}}catch(e){}
  return _rev.apply(this,arguments);
};}
{const _ad=typeof aiDecide==='function'?aiDecide:null;
  if(_ad)aiDecide=function(u,force){try{if(!force&&XLOD.heavy&&u&&u._lod>=2)return u.aiJob&&u.aiJob.k;}catch(e){}return _ad.apply(this,arguments);};}
{const _ds=disciples;let _dsC=null,_dsF=-1;disciples=function(){
  try{if(XLOD.heavy&&_dsF===XLOD.frame&&_dsC)return _dsC;const a=_ds.apply(this,arguments);if(XLOD.heavy){_dsC=a;_dsF=XLOD.frame;}return a;}catch(e){return _ds.apply(this,arguments);}
};}
{const _u=update;update=function(dt){
  const t0=performance.now();
  try{xlodPrep();}catch(e){XLOD.heavy=false;}
  XLOD.revealN=0;
  const r=_u.apply(this,arguments);
  XLOD.tickMs=performance.now()-t0;
  return r;
};}
{const _dr=draw;draw=function(){
  let hid=null;
  try{
    if(XLOD.heavy){
      hid=[];
      for(const u of S.units){
        if(u.kind==='disciple'&&!u.dead&&!u._lodDraw){hid.push(u);u._lodDgIn=u.dgIn;u.dgIn=1;}
      }
    }
  }catch(e){hid=null;}
  try{return _dr.apply(this,arguments);}
  finally{if(hid){for(const u of hid){u.dgIn=u._lodDgIn;}}}
};}
setTimeout(function xwSaveApi(){if(!window.XW){setTimeout(xwSaveApi,300);return;}try{XW.afterLoad=afterLoad;XW.exportText=exportText;XW.importText=importText;XW.writeSlot=writeSlot;XW.loadSlot=loadSlot;XW.snapshot=snapshot;XW.applySave=applySave;XW.xwBbOpen=xwBbOpen;XW.xwBbClose=xwBbClose;XW.xwBbToggle=xwBbToggle;if(typeof dgEnter==='function')XW.dgEnter=dgEnter;if(typeof dgExit==='function')XW.dgExit=dgExit;if(typeof gates==='function')XW.gates=gates;}catch(e){}});setTimeout(function xlodApi(){if(!window.XW||!XW.xn){setTimeout(xlodApi,300);return;}
  XW.xn.lod={
    on:()=>XLOD.heavy,stats:()=>({heavy:XLOD.heavy,n:XLOD.n,tickMs:XLOD.tickMs,abs:XLOD.abs,full:XLOD.full,drawn:XLOD.drawn,frame:XLOD.frame,q:xlodQuality()}),
    pack:xlodPack,packAll:xlodPackAll,squads:xlodSquads,qpos:xlodQ,tier:u=>u&&u._lod,
    prep:xlodPrep
  };
  XW.xn.realmPop={on:xrpOn,top:xrpTop,cap:xrpRealmCap,mul:xrpHouseMul,building:xrpBuildingCap};
},0);

// ======================= 水墨卷軸建造面板（B／建造鈕）=======================
const XWBB={sel:null,open:false,recent:[],icon:{}};
const XWBB_RES_GLYPH={wood:'木',stone:'石',fiber:'布',food:'糧',iron:'鐵',herb:'藥',lingshi:'靈'};
const XWBB_RES_COL={wood:'#8a6232',stone:'#8a8480',fiber:'#c4b070',food:'#d4a04a',iron:'#8a7060',herb:'#5a8a58',lingshi:'#6ec8e0'};
const XWBB_FIXED={hall:0,altar:0,house:0,wudao:0,lianwu:0,shitang:0,
  // 與 ECON_NEW_BUILDS / 境界列對齊（merge 項也要正確分列）
  alchemy:3,cangku:3,library:4,forge:5,xianyuan:4,juling:4,zongcang:4,gongfage:4,huzhen:7};
function xwBbRealmOf(type){
  try{const ed=typeof econBuildingDef==='function'?econBuildingDef(type):null;if(ed&&ed.realmIdx!=null)return ed.realmIdx|0;}catch(e){}
  if(XWBB_FIXED[type]!=null)return XWBB_FIXED[type];
  try{if(BUILD[type]&&BUILD[type].reqRealm!=null)return BUILD[type].reqRealm|0;}catch(e){}
  try{if(BUILD[type]&&BUILD[type].reqXian)return 4;}catch(e){}
  return 0;
}
function xwBbHotkey(type){
  if(type==='cangku')return '0';
  const i=typeof BUILD_ORDER!=='undefined'?BUILD_ORDER.indexOf(type):-1;
  return i>=0&&i<9?String(i+1):'';
}
function xwBbIcon(type,large){
  const key=type+(large?'Lv3':'v3');if(XWBB.icon[key])return XWBB.icon[key];
  const W=large?160:96,H=large?160:80,c=document.createElement('canvas');c.width=W;c.height=H;
  const g=c.getContext('2d');
  const grd=g.createLinearGradient(0,0,0,H);grd.addColorStop(0,'#d8c8a0');grd.addColorStop(1,'#8a7654');
  g.fillStyle=grd;g.fillRect(0,0,W,H);
  g.strokeStyle='#e8d09088';g.strokeRect(1.5,1.5,W-3,H-3);
  const D=BUILD[type],s=(D&&D.size)||2,old=typeof ctx!=='undefined'?ctx:null;
  try{
    ctx=g;
    const sc=Math.min((W-4)/(2*s*HW),(H-6)/(2*s*HH+28))*1.15;
    g.save();g.translate(W/2,H*0.34);g.scale(sc,sc);
    let drew=false;
    try{
      if(type==='gongfage'){
        const pan=(typeof XW_ECON!=='undefined'&&XW_ECON&&typeof XW_ECON.gfPanel==='function')?XW_ECON.gfPanel():null;
        if(pan&&typeof pan.iconDraw==='function')drew=!!pan.iconDraw(g,0,0,{lv:large?3:1});
      }
    }catch(e2){drew=false;}
    if(!drew&&typeof drawBuildingShape==='function')drawBuildingShape(type,0,0,1,1,{type,built:1,lv:1});
    g.restore();
  }catch(e){
    g.fillStyle='#e8c868';g.font='bold '+(W/3)+'px serif';g.textAlign='center';g.textBaseline='middle';
    g.fillText((D&&D.name||'?').slice(0,1),W/2,H/2);
  }
  if(old!=null)ctx=old;
  try{XWBB.icon[key]=c.toDataURL();}catch(er){XWBB.icon[key]='';}
  return XWBB.icon[key];
}
function xwBbLocked(type){
  try{if(typeof buildLock==='function'){const w=buildLock(type);if(w)return w;}}catch(e){}
  try{
    const need=xwBbRealmOf(type)|0;
    const have=(typeof xwPeakRealm==='function'?xwPeakRealm():(typeof econSectMaxRealm==='function'?econSectMaxRealm():0))|0;
    if(need>0&&have<need){const R=REALMS[need];return '需達「'+(R?R.n:('境界'+need))+'」';}
  }catch(e){}
  try{
    if(typeof econBuildingLockReason==='function'){
      const why=econBuildingLockReason(type);if(why==='flag-off')return '尚未開啟';
      if(why&&why.indexOf('realm:')===0){const idx=+why.slice(6);const R=REALMS[idx];return '需達「'+(R?R.n:why)+'」';}
    }
  }catch(e){}
  return '';
}
function xwBbLockInfo(type){
  const why=xwBbLocked(type);
  if(!why)return {kind:'',why:'',badge:''};
  if(/只能建一座|已建/.test(why))return {kind:'built',why:why,badge:'已建'};
  if(/需先建成/.test(why))return {kind:'prereq',why:why,badge:'🔒'};
  if(/需達|突破|尚未開啟|境界|修仙階段/.test(why))return {kind:'realm',why:why,badge:'🔒'};
  return {kind:'prereq',why:why,badge:'🔒'};
}
function xwBbEnsure(){
  if(document.getElementById('xwbb'))return document.getElementById('xwbb');
  if(!document.getElementById('xwbbcss')){
    const st=document.createElement('style');st.id='xwbbcss';st.textContent=`
#xwbb{display:none;position:fixed;inset:0;z-index:45;align-items:center;justify-content:center;background:#0008;padding:max(12px,env(safe-area-inset-top)) 16px}
#xwbb.open{display:flex!important}
#xwbb .xwbb-sc{width:min(1260px,calc(100vw - 16px));height:min(772px,calc(100vh - 24px));background:linear-gradient(180deg,#2a2116f7,#1a140cf5);border:1px solid #c9a24a;outline:1px solid #d7b56a55;border-radius:4px;box-shadow:0 16px 50px #000c,inset 0 1px 0 #f3d48a33;display:flex;flex-direction:column;color:#f3e3c0}
#xwbb .xwbb-hd{display:flex;align-items:center;justify-content:space-between;padding:6px 12px;border-bottom:1px solid #c9a24a55;letter-spacing:4px;color:#ffe9a8;font-weight:bold;font-size:18px;flex-shrink:0}
#xwbb .xwbb-x{width:36px;height:32px;border:1px solid #8a6a3a;background:#1a140c;color:#ffe9a8;cursor:pointer;border-radius:3px}
#xwbb .xwbb-bd{display:flex;flex:1;min-height:0}
#xwbb .xwbb-rows{flex:1;overflow:auto;padding:6px 8px 8px}
body.pc #xwbb .xwbb-rows{overflow:hidden}
#xwbb .xwbb-row{display:flex;align-items:stretch;gap:8px;margin-bottom:2px;flex-wrap:nowrap}
#xwbb .xwbb-rtab{writing-mode:vertical-rl;letter-spacing:5px;color:#ffe9a8;background:linear-gradient(#3a2e1c,#221a12);border:1px solid #c9a24a99;border-radius:3px;padding:10px 6px;min-width:30px;text-align:center;font-size:15px;font-weight:bold;text-shadow:0 1px 0 #000;flex-shrink:0}
#xwbb .xwbb-strip{display:flex;flex-wrap:nowrap;gap:5px;flex:1;align-content:flex-start;overflow:visible}
#xwbb .xwbb-tile{width:76px;padding:3px 3px 4px;border:1px solid #c9a24a99;background:linear-gradient(#5a4c38,#3a3228);border-radius:4px;position:relative;cursor:pointer;display:flex;flex-direction:column;align-items:center;overflow:visible}
#xwbb .xwbb-art{position:relative;width:68px;height:56px;background:linear-gradient(#c4b48a,#8a7a58);border-radius:3px;overflow:hidden;flex-shrink:0}
#xwbb .xwbb-art img{width:100%;height:100%;display:block;pointer-events:none;object-fit:contain;filter:brightness(1.22) contrast(1.08) saturate(1.15)}
#xwbb .xwbb-tile.sel{border-color:#ffe27a;box-shadow:0 0 0 2px #ffe27a88}
#xwbb .xwbb-tile.lock{background:#1c1812;border-color:#5a4e3a}
#xwbb .xwbb-tile.lock .xwbb-art img{filter:grayscale(1) brightness(.38) contrast(1.2)}
#xwbb .xwbb-tile.dim{background:linear-gradient(#3a3428,#2a241c)}
#xwbb .xwbb-tile.dim .xwbb-art img{filter:brightness(.7) saturate(.75) contrast(1.05)}
#xwbb .xwbb-qmark{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;font-size:22px;color:#ffe9a8;text-shadow:0 1px 3px #000,0 0 6px #000;pointer-events:none;z-index:2}
#xwbb .xwbb-badge{position:absolute;right:3px;bottom:16px;z-index:3;font-size:10px;line-height:1;padding:2px 4px;border-radius:3px;background:#2a1810ee;border:1px solid #c9a24a99;color:#ffe9a8;pointer-events:none;text-shadow:0 1px 1px #000}
#xwbb .xwbb-nm{display:block;width:100%;margin-top:3px;font-size:11px;line-height:1.15;color:#ffe9a8;text-align:center;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;text-shadow:0 1px 1px #000}
#xwbb .xwbb-tile.lock .xwbb-nm{color:#b8a888}
#xwbb .xwbb-hk{position:absolute;top:4px;left:5px;font-size:11px;font-weight:bold;color:#ffe9a8;text-shadow:0 1px 2px #000;pointer-events:none;z-index:3}
#xwbb .xwbb-det{width:232px;border-left:1px solid #c9a24a55;padding:10px 12px;overflow:auto;background:#16110ccc}
#xwbb .xwbb-det img{width:96px;height:96px;display:block;margin:0 auto 8px;border:1px solid #8a6a3a;background:#1a140c}
#xwbb .xwbb-det h3{margin:0 0 6px;color:#ffe9a8;font-size:18px;text-align:center;letter-spacing:2px}
#xwbb .xwbb-det .desc{font-size:12px;line-height:1.55;color:#d8c9a6;margin-bottom:10px}
#xwbb .xwbb-costs{display:flex;flex-wrap:wrap;gap:6px;margin:8px 0}
#xwbb .xwbb-c{display:flex;align-items:center;gap:4px;background:#1a140c;border:1px solid #6a5430;border-radius:3px;padding:3px 6px;font-size:12px}
#xwbb .xwbb-c.short{color:#ff9a7a;border-color:#a05040}
#xwbb .xwbb-cg{width:18px;height:18px;display:inline-flex;align-items:center;justify-content:center;border-radius:2px;color:#1a1208;font-size:12px;font-weight:bold}
#xwbb .xwbb-go{width:100%;height:40px;margin-top:8px;border:1px solid #c9a24a;background:linear-gradient(#3a2e18,#2a2010);color:#ffe9a8;font-size:16px;letter-spacing:4px;cursor:pointer;border-radius:3px}
#xwbb .xwbb-go:disabled{opacity:.4;cursor:default}
#xwbb .xwbb-why{color:#ff9a7a;font-size:12px;min-height:16px}
body.touch #xwbb .xwbb-bd{flex-direction:column}
body.touch #xwbb .xwbb-det{width:auto;max-height:42%;border-left:0;border-top:1px solid #c9a24a55}
body.touch #xwbb .xwbb-sc{height:min(640px,calc(100vh - 24px));width:calc(100vw - 12px)}
body.pc #buildbar.xwbb-hud,#buildbar.xwbb-hud,#buildbar{display:none!important}
body.pc #buildbar.xwbb-hud{display:flex!important;flex-wrap:nowrap;align-items:center;gap:4px;padding:4px 6px;max-width:none;width:auto;left:auto;right:calc(var(--sar,0px) + 10px);bottom:calc(var(--sab,0px) + 10px);max-height:52px}
body.pc #buildbar.xwbb-hud .xwbb-q{width:42px;height:42px;padding:0;position:relative}
body.pc #buildbar.xwbb-hud .xwbb-q img{width:100%;height:100%}
body.touch #buildbar.xwbb-hud{display:none!important}
#xev,#xevb{display:none!important}`;
    (document.head||document.documentElement).appendChild(st);
  }
  const el=document.createElement('div');el.id='xwbb';el.className='ui';el.innerHTML='<div class="xwbb-sc"><div class="xwbb-hd"><span>建 造</span><button type="button" class="xwbb-x" data-xwbbx="1">✕</button></div><div class="xwbb-bd"><div class="xwbb-rows"></div><div class="xwbb-det"></div></div></div>';
  (document.getElementById('root')||document.body).appendChild(el);
  el.addEventListener('click',ev=>{
    if(ev.target.closest('[data-xwbbx]')||ev.target===el){xwBbClose();return;}
    const tile=ev.target.closest('[data-xwbb]');if(tile){XWBB.sel=tile.dataset.xwbb;xwBbPaint();return;}
    const go=ev.target.closest('[data-xwbbgo]');if(go&&XWBB.sel){xwBbBuild(XWBB.sel);}
  });
  addEventListener('keydown',ev=>{if(ev.code==='Escape'&&XWBB.open){xwBbClose();ev.preventDefault();}},true);
  return el;
}
function xwBbGroups(){
  const order=(typeof BUILD_ORDER!=='undefined'?BUILD_ORDER:[]).filter(t=>BUILD[t]&&BUILD[t].size!=null);
  const rows=new Map();
  for(const t of order){const r=xwBbRealmOf(t);if(!rows.has(r))rows.set(r,[]);rows.get(r).push(t);}
  return [...rows.keys()].sort((a,b)=>a-b).map(r=>({r,name:(REALMS[r]&&REALMS[r].n)||('境界'+r),list:rows.get(r)}));
}
function xwBbDetHtml(type){
  const D=BUILD[type];if(!D)return '<div class="dim">選擇一座建築</div>';
  const lock=xwBbLocked(type),cost=D.cost||{};
  let ch='<div class="xwbb-costs">';
  let short=false;
  for(const k in cost){
    let haveN=0;try{haveN=typeof have==='function'?have(k):((S.res&&S.res[k])||(S.mats&&S.mats[k])||0);}catch(e){haveN=(S.res&&S.res[k])||(S.mats&&S.mats[k])||0;}
    const ok=haveN>=cost[k];if(!ok)short=true;
    ch+='<span class="xwbb-c'+(ok?'':' short')+'"><span class="xwbb-cg" style="background:'+(XWBB_RES_COL[k]||'#888')+'">'+(XWBB_RES_GLYPH[k]||k[0])+'</span>'+(RES_NAMES[k]||k)+' '+cost[k]+'</span>';
  }
  ch+='</div>';
  const why=lock||(short?'資源不足':'');
  const can=!lock&&!short;
  const src=xwBbIcon(type,true);
  const need=xwBbRealmOf(type)|0,peak=xwPeakRealm()|0;
  const realmHint='<div class="hint">新建解鎖：宗門目前或曾達「'+((REALMS[need]&&REALMS[need].n)||('境界'+need))+'」；宗門解鎖紀錄「'+((REALMS[peak]&&REALMS[peak].n)||('境界'+peak))+'」（非僅看主角）。既有建築不受新建境界限制。</div>';
  return (src?'<img alt="" src="'+src+'">':'')+'<h3>'+D.name+'</h3><div class="desc">'+(D.desc||'')+'</div>'+realmHint+ch+'<div class="xwbb-why">'+(why||'')+'</div><button type="button" class="xwbb-go" data-xwbbgo="1"'+(can?'':' disabled')+'>建 造</button>';
}
function xwBbPaint(){
  const el=xwBbEnsure();const rows=el.querySelector('.xwbb-rows'),det=el.querySelector('.xwbb-det');
  if(!XWBB.sel){const g=xwBbGroups();XWBB.sel=g[0]&&g[0].list[0];}
  let h='';
  for(const g of xwBbGroups()){
    h+='<div class="xwbb-row"><div class="xwbb-rtab">'+g.name+'</div><div class="xwbb-strip">';
    for(const t of g.list){
      const lk=xwBbLockInfo(t),hk=xwBbHotkey(t),src=xwBbIcon(t,false);
      const nm=(BUILD[t]&&BUILD[t].name)||t;
      const cls=(XWBB.sel===t?' sel':'')+(lk.kind==='realm'?' lock':'')+(lk.kind==='built'||lk.kind==='prereq'?' dim':'');
      h+='<button type="button" class="xwbb-tile'+cls+'" data-xwbb="'+t+'" title="'+nm+(lk.why?('（'+lk.why+'）'):'')+'">'+(hk?'<span class="xwbb-hk">'+hk+'</span>':'')+'<span class="xwbb-art">'+(src?'<img alt="" src="'+src+'">':'')+(lk.kind==='realm'?'<span class="xwbb-qmark">❓</span>':'')+'</span>'+(lk.badge?'<span class="xwbb-badge">'+lk.badge+'</span>':'')+'<span class="xwbb-nm">'+nm+'</span></button>';
    }
    h+='</div></div>';
  }
  if(rows._h!==h){rows._h=h;rows.innerHTML=h;}
  else{
    rows.querySelectorAll('[data-xwbb]').forEach(btn=>{const lk=xwBbLockInfo(btn.dataset.xwbb);btn.classList.toggle('sel',btn.dataset.xwbb===XWBB.sel);btn.classList.toggle('lock',lk.kind==='realm');btn.classList.toggle('dim',lk.kind==='built'||lk.kind==='prereq');});
  }
  det.innerHTML=xwBbDetHtml(XWBB.sel);
}
function xwBbOpen(){if(typeof S!=='undefined'&&S&&S.interior){toast('先離開建築才能建造');return;}XWBB.open=true;const el=xwBbEnsure();el.classList.add('open');el.style.display='flex';xwBbPaint();const bar=document.getElementById('buildbar');if(bar)bar.classList.add('open');}
function xwBbClose(){XWBB.open=false;const el=document.getElementById('xwbb');if(el){el.classList.remove('open');el.style.display='none';}}
function xwBbToggle(){if(XWBB.open)xwBbClose();else xwBbOpen();}
function xwBbRemember(type){XWBB.recent=XWBB.recent.filter(t=>t!==type);XWBB.recent.unshift(type);if(XWBB.recent.length>6)XWBB.recent.length=6;xwBbHud();}
function xwBbBuild(type){
  if(xwBbLocked(type))return;
  try{if(typeof enterBuild==='function')enterBuild(type);}catch(e){}
  xwBbRemember(type);xwBbClose();
}
function xwBbHud(){
  const bar=document.getElementById('buildbar');if(!bar)return;
  if(!XWBB.recent.length){bar.classList.add('xwbb-hud');bar.innerHTML='';return;}
  bar.classList.add('xwbb-hud');
  bar.innerHTML=XWBB.recent.map(t=>{const hk=xwBbHotkey(t),src=xwBbIcon(t,false);return '<button type="button" class="btn xwbb-q" data-b="'+t+'" title="'+(BUILD[t]&&BUILD[t].name||t)+'">'+(hk?'<span class="xwbb-hk">'+hk+'</span>':'')+(src?'<img alt="" src="'+src+'">':'')+'</button>';}).join('');
}
{const _ib=initBuildBar;initBuildBar=function(){
  try{
    const bar=$('buildbar');if(bar){bar.classList.add('xwbb-hud');bar.innerHTML='';if(!bar._xwbb){bar._xwbb=1;bar.addEventListener('click',ev=>{const btn=ev.target.closest('[data-b]');if(btn){enterBuild(btn.dataset.b);xwBbRemember(btn.dataset.b);}});}}
    xwBbEnsure();
  }catch(e){try{_ib.apply(this,arguments);}catch(e2){}}
};}
{const _tg=toggleBuildMenu;toggleBuildMenu=function(){if(buildMode){buildMode=null;return;}xwBbToggle();};}
{if(typeof bb190Key==='function'){const _bk=bb190Key;bb190Key=function(){if(buildMode)return false;if(typeof xwBbToggle==='function'){xwBbToggle();return true;}return _bk.apply(this,arguments);};}}
{const _u=updateUI;updateUI=function(){const r=_u.apply(this,arguments);try{if(XWBB.open)xwBbPaint();const abd=$('a_build');if(abd)abd.classList.toggle('on',!!buildMode||XWBB.open);}catch(e){}return r;};}

// ======================= 20261106e batch fixes =======================
// 1 dungeon walk-in → confirm; 3/4 scroll+drag done in g21; 5 click tile → place;
// 6 peak-realm unlock; 7 building panel force; 8 remove bld shortcut hud;
// 9 recruit click; 10 hint; 11/12 range FX map-only + mine; 13 aggro done;
// 14 lingshi done; 15/16 recruit/scan done; 17 HANDOFF; 18 panel auto-sel done;
// + gold-finger buildings complete + unlock only gates NEW builds

// ---- peak realm (unlock) ----
function xwPeakRealm(){
  let best=0;
  try{if(S&&S.flags&&S.flags.xian)best=Math.max(best,4);}catch(e){}
  try{if(S&&S.flags&&S.flags.peakRealm!=null)best=Math.max(best,S.flags.peakRealm|0);}catch(e){}
  try{if(S&&S.units){for(const u of S.units){if(!u||u.dead)continue;const r=u.realm|0;if(r>best)best=r;if(u.peakRealm!=null&&(u.peakRealm|0)>best)best=u.peakRealm|0;}}}catch(e){}
  try{if(S&&S.flags)S.flags.peakRealm=best;}catch(e){}
  return best;
}
function xwNotePeak(u){
  if(!u)return;
  const r=u.realm|0;
  u.peakRealm=Math.max(u.peakRealm|0,r);
  try{if(S&&S.flags)S.flags.peakRealm=Math.max(S.flags.peakRealm|0,r);if(r>=4)S.flags.xian=true;}catch(e){}
  try{if(r>=4&&typeof xmapUnlockIf==='function')xmapUnlockIf();}catch(e){}
}
{const _db=doBreak;doBreak=function(u){const r=_db.apply(this,arguments);try{xwNotePeak(u);}catch(e){}return r;};}
{const _as=applySave;applySave=function(d){const r=_as.apply(this,arguments);try{if(S&&S.units){for(const u of S.units)xwNotePeak(u);}xwPeakRealm();xwFixBuildings();if(typeof xmapUnlockIf==='function')xmapUnlockIf();if(typeof checkObjectives==='function')checkObjectives();}catch(e){}return r;};}
{const _ng=newGame;newGame=function(){const r=_ng.apply(this,arguments);try{xwNotePeak(player());xwPeakRealm();}catch(e){}return r;};}

// unlock: sect anyone current OR peak >= need; flags.xian counts as 煉氣
{const _esr=econSectMaxRealm;if(typeof econSectMaxRealm==='function'){
  econSectMaxRealm=function(T){return Math.max(_esr.apply(this,arguments)|0,xwPeakRealm());};
}}
try{if(BUILD.huzhen&&BUILD.huzhen.reqRealm==null)BUILD.huzhen.reqRealm=7;}catch(e){}
try{if(BUILD.cangku&&BUILD.cangku.reqRealm==null)BUILD.cangku.reqRealm=3;}catch(e){}
try{if(BUILD.library&&BUILD.library.reqRealm==null)BUILD.library.reqRealm=4;}catch(e){}
try{if(BUILD.alchemy&&BUILD.alchemy.reqRealm==null)BUILD.alchemy.reqRealm=3;}catch(e){}
try{if(BUILD.forge&&BUILD.forge.reqRealm==null)BUILD.forge.reqRealm=5;}catch(e){}
{const _bl=buildLock;buildLock=function(type){
  // 1) 結構性鎖定（大殿唯一／前置建築）先算
  const r=_bl.apply(this,arguments);
  if(r&&/需先建成|只能建一座|已建/.test(r))return r;
  // 2) 境界門檻：宗門任一成員「當前或曾經最高境界」≥ 該建築列境界；只限制新建／放置，不影響已建成的使用
  try{
    const need=(typeof xwBbRealmOf==='function'?xwBbRealmOf(type):0)|0;
    const have=xwPeakRealm()|0;
    if(need>0&&have<need){
      const R=REALMS[need];
      return '需達「'+(R?R.n:('境界'+need))+'」';
    }
    if(need>=4){try{if(have>=4)S.flags.xian=true;}catch(e){}}
  }catch(e){}
  // 3) 舊鎖文案：若 peak 已達標則放行（「已達更高境界卻沒解鎖」）
  if(r){
    if(/煉氣|修仙階段/.test(r)){
      if(xwPeakRealm()>=4){try{S.flags.xian=true;}catch(e){}return null;}
    }
    if(/需有弟子達到|需達/.test(r)){
      try{
        const d=typeof econBuildingDef==='function'?econBuildingDef(type):null;
        const need=(d&&d.realmIdx)|0;
        if(xwPeakRealm()>=need)return null;
      }catch(e){}
    }
    return r;
  }
  return null;
};}

// ---- gold-finger / inconsistent buildings: force complete + usable ----
// 解鎖只擋「新建」；已存在建築一律可開面板／指派／施工。金手指放置走完整建成流程。
let XW_FIXING_BLD=0;
function xwBldTerrainOk(type,i0,j0){
  const D=BUILD[type];if(!D)return false;const s=D.size|0;
  if(i0<1||j0<1||i0+s>N-1||j0+s>N-1)return false;
  try{
    for(let j=j0;j<j0+s;j++)for(let i=i0;i<i0+s;i++){
      const k=j*N+i;if(block[k]||(typeof T!=='undefined'&&terrain[k]===T.SHALLOW)||!explored[k])return false;
    }
    if(S.villages){for(const v of S.villages)if(dist(i0+s/2,j0+s/2,v.x,v.y)<10)return false;}
    if(S.enemies&&S.enemies.some(e=>e.x>=i0-0.3&&e.x<i0+s+0.3&&e.y>=j0-0.3&&e.y<j0+s+0.3))return false;
  }catch(e){return false;}
  return true;
}
function xwGfSpot(type,cx,cy){
  if(!BUILD[type])return null;
  const ox=Math.floor(cx),oy=Math.floor(cy);
  for(let r=0;r<48;r++)for(let dj=-r;dj<=r;dj++)for(let di=-r;di<=r;di++){
    if(Math.max(Math.abs(di),Math.abs(dj))!==r)continue;
    const i=ox+di,j=oy+dj;if(xwBldTerrainOk(type,i,j))return {i,j};
  }
  return null;
}
function xwSanitizeBuilding(b){
  if(!b||!BUILD[b.type])return false;
  let ch=false;const D=BUILD[b.type];
  if(b.built){
    if((b.progress||0)<1){b.progress=1;ch=true;}
    if(b.maxhp==null||!(b.maxhp>0)){b.maxhp=D.hp||400;ch=true;}
    if(b.hp==null||!(b.hp>=0)){b.hp=b.maxhp;ch=true;}
    if(b.lv==null||!(b.lv>=1)){b.lv=1;ch=true;}
    if(b.builtAt==null){b.builtAt=(S&&S.time)||0;ch=true;}
    b.broken=!!b.broken;
  }
  return ch;
}
function xwFixBuildings(){
  if(!S||!S.buildings||XW_FIXING_BLD)return 0;
  XW_FIXING_BLD=1;let n=0;
  try{
    for(const b of S.buildings){
      if(!b||!BUILD[b.type])continue;
      // 進度滿卻未建成、或金手指殘態 → 走完整建成
      if(!b.built&&(b.progress||0)>=0.999){
        try{completeBuilding(b);n++;}catch(e){b.built=true;b.progress=1;b.hp=b.maxhp||BUILD[b.type].hp||400;n++;}
      }
      if(xwSanitizeBuilding(b))n++;
    }
    try{if(typeof rebuildBlock==='function')rebuildBlock();}catch(e){}
    try{if(typeof checkObjectives==='function')checkObjectives();}catch(e){}
  }finally{XW_FIXING_BLD=0;}
  return n;
}
function xwGfCompleteAll(){
  if(typeof x47DbgAllowed==='function'&&!x47DbgAllowed()){toast('金手指僅限測試模式（?dev=1）');return 0;}
  if(!S||!S.buildings)return 0;
  let n=0;
  for(const b of S.buildings){
    if(!b||b.built)continue;
    try{completeBuilding(b);n++;}catch(e){b.built=true;b.progress=1;b.hp=b.maxhp||(BUILD[b.type]&&BUILD[b.type].hp)||400;n++;}
  }
  xwFixBuildings();
  try{if(typeof toast==='function')toast(n?`已強制建成 ${n} 座建築`:'沒有未完成的工地');}catch(e){}
  try{if(typeof updateUI==='function')updateUI();}catch(e){}
  return n;
}
function xwGfPlaceBuilt(type){
  // 正式站無 ?dev=1 時金手指面板本身不開；此處再擋一次 API
  if(typeof x47DbgAllowed==='function'&&!x47DbgAllowed()){toast('金手指僅限測試模式（?dev=1）');return null;}
  if(!BUILD[type]){toast('未知建築');return null;}
  // 結構性限制仍保留（大殿唯一）；境界／前置解鎖不擋金手指
  if(type==='hall'&&typeof hasAny==='function'&&hasAny('hall')){toast('宗門大殿只能建一座');return null;}
  const p=player();if(!p)return null;
  const D=BUILD[type];
  // 找空地：不經 placementValid（那會擋解鎖／資源）
  let spot=xwGfSpot(type,p.x,p.y);
  if(!spot&&typeof XW!=='undefined'&&XW.freeSpot){
    // 後備：暫頂資源並繞過 buildLock 的境界鎖
    try{for(const k in (D.cost||{}))S.res[k]=Math.max(S.res[k]||0,D.cost[k]|0);}catch(e){}
    const _bl=buildLock;
    try{
      buildLock=function(t){if(t==='hall'&&hasAny('hall'))return '宗門大殿只能建一座';return null;};
      spot=XW.freeSpot(type,p.x,p.y);
    }finally{buildLock=_bl;}
  }
  if(!spot){toast('附近沒有空地');return null;}
  const i=spot.i!=null?spot.i:(spot.x|0),j=spot.j!=null?spot.j:(spot.y|0);
  // 直接登錄建築（不扣資源、不解鎖檢查），再走 completeBuilding
  let b={id:nid(),type,i,j,progress:0,built:false,queue:0,qt:0,hp:D.hp,maxhp:D.hp,broken:false,lv:1,inv:(typeof addCost==='function'?addCost({},D.cost||{}):(D.cost?Object.assign({},D.cost):{}))};
  try{S.buildings.push(b);if(typeof rebuildBlock==='function')rebuildBlock();if(typeof chunkDirtyAt==='function')chunkDirtyAt(i,j);}catch(e){toast('放置失敗');return null;}
  try{completeBuilding(b);}catch(e){b.built=true;b.progress=1;b.hp=b.maxhp||D.hp;}
  xwFixBuildings();
  try{if(typeof checkObjectives==='function')checkObjectives();if(typeof updateObjectives==='function')updateObjectives();if(typeof updateUI==='function')updateUI();}catch(e){}
  try{toast(`金手指：已建成「${D.name}」`);}catch(e){}
  return b;
}
// expose on gold finger build tab
XMOD_BTNS.build=['_gfDone'];
{const _paint=xmodDbgPaint;xmodDbgPaint=function(){
  const r=_paint.apply(this,arguments);
  try{
    if(XMOD_TAB==='build'){
      const body=document.querySelector('#x47dbg .xmod-body');if(!body)return r;
      body.innerHTML='<div class="xmod-note">金手指建築：走正常建成（面板／弟子可用）。解鎖只限制建造選單的「新建」；正式站無 ?dev=1 不開金手指。</div><div class="xmod-g">'
        +'<button type="button" class="btn pri" data-xwgf="done">完工所有工地</button>'
        +'<button type="button" class="btn" data-xwgf="hall">建成宗門大殿</button>'
        +'<button type="button" class="btn" data-xwgf="altar">建成求武台</button>'
        +'<button type="button" class="btn" data-xwgf="wudao">建成武道館</button>'
        +'<button type="button" class="btn" data-xwgf="house">建成住房</button>'
        +'<button type="button" class="btn" data-xwgf="library">建成藏經閣</button>'
        +'<button type="button" class="btn" data-xwgf="fix">修復建築狀態</button>'
        +'</div>';
    }
  }catch(e){}
  return r;
};}
document.addEventListener('click',function(ev){
  const b=ev.target&&ev.target.closest&&ev.target.closest('#x47dbg [data-xwgf]');
  if(!b)return;ev.preventDefault();ev.stopPropagation();
  if(typeof x47DbgAllowed==='function'&&!x47DbgAllowed()){toast('金手指僅限測試模式（?dev=1）');return;}
  const k=b.getAttribute('data-xwgf');
  if(k==='done')xwGfCompleteAll();
  else if(k==='fix'){const n=xwFixBuildings();toast(n?`已修復 ${n} 座`:'建築狀態正常');}
  else if(k==='hall'||k==='altar'||k==='wudao'||k==='house'||k==='library')xwGfPlaceBuilt(k);
  try{if(typeof checkObjectives==='function')checkObjectives();if(typeof updateObjectives==='function')updateObjectives();if(typeof updateUI==='function')updateUI();}catch(e){}
},true);

// wrap completeBuilding：建成後重算任務；讀檔殘態由 applySave→xwFixBuildings 處理
{const _cb=completeBuilding;completeBuilding=function(b){const r=_cb.apply(this,arguments);try{if(!XW_FIXING_BLD){xwSanitizeBuilding(b);if(typeof checkObjectives==='function')checkObjectives();if(typeof updateObjectives==='function')updateObjectives();}}catch(e){}return r;};}

// ---- XWBB：左鍵／短點直接進放置；右鍵／長按看詳情（不預扣資源）----
{const _ens=xwBbEnsure;xwBbEnsure=function(){
  const el=_ens.apply(this,arguments);
  if(el&&!el._xwbbRC){
    el._xwbbRC=1;
    // kill old direct-place capture if any leftover flag
    el._xwbbDirect=1;
    function pickTile(ev){return ev.target&&ev.target.closest&&ev.target.closest('[data-xwbb]');}
    function doSelect(type){XWBB.sel=type;try{xwBbPaint();}catch(e){}}
    function doQuick(type){
      try{
        if(xwBbLocked(type)){
          const why=xwBbLocked(type)||'尚未解鎖';
          try{toast(why);}catch(e){}
          doSelect(type);
          return false;
        }
        xwBbBuild(type);
        return true;
      }catch(e){return false;}
    }
    // suppress browser context menu on tiles
    el.addEventListener('contextmenu',ev=>{
      const tile=pickTile(ev);
      if(!tile)return;
      ev.preventDefault();ev.stopPropagation();
      const type=tile.dataset.xwbb;
      doSelect(type);
    },true);
    // left click / short tap: use the existing guarded placement entry
    el.addEventListener('click',ev=>{
      const tile=pickTile(ev);if(!tile)return;
      // allow go button to bubble to original handler
      if(ev.target.closest('[data-xwbbgo]'))return;
      ev.stopPropagation();
      doQuick(tile.dataset.xwbb);
    },true);
    // mobile long-press = details; short tap = placement (via click)
    let lpT=null,lpTile=null,lpDid=false;
    el.addEventListener('touchstart',ev=>{
      const tile=pickTile(ev);if(!tile)return;
      lpTile=tile;lpDid=false;
      clearTimeout(lpT);
      lpT=setTimeout(()=>{
        if(!lpTile)return;lpDid=true;
        try{if(navigator.vibrate)navigator.vibrate(12);}catch(e){}
        doSelect(lpTile.dataset.xwbb);
      },480);
    },{passive:true,capture:true});
    const lpCancel=()=>{clearTimeout(lpT);lpT=null;lpTile=null;};
    el.addEventListener('touchmove',ev=>{
      if(!lpTile)return;
      // cancel if finger slides away
      const t=ev.touches&&ev.touches[0];
      if(!t){lpCancel();return;}
      const r=lpTile.getBoundingClientRect();
      if(t.clientX<r.left-8||t.clientX>r.right+8||t.clientY<r.top-8||t.clientY>r.bottom+8)lpCancel();
    },{passive:true,capture:true});
    el.addEventListener('touchend',ev=>{
      if(lpDid){ev.preventDefault();ev.stopPropagation();}
      lpCancel();lpDid=false;
    },{capture:true});
    el.addEventListener('touchcancel',lpCancel,{capture:true});
    // hint on tiles
    try{
      if(!document.getElementById('xwbbRcCss')){
        const st=document.createElement('style');st.id='xwbbRcCss';
        st.textContent='#xwbb .xwbb-tile{user-select:none;-webkit-user-select:none}body.pc #xwbb .xwbb-det .xwbb-why.hint{color:#b8a888;font-size:11px;margin-top:4px}';
        (document.head||document.documentElement).appendChild(st);
      }
    }catch(e){}
  }
  return el;
};}
// detail pane: current left/short placement and right/long details contract
{const _det=xwBbDetHtml;xwBbDetHtml=function(type){
  let h=_det.apply(this,arguments);
  try{
    if(!type||!h)return h;
    const lock=xwBbLocked(type);
    const tip=lock
      ?('<div class="xwbb-why hint">未解鎖：'+lock+'（左鍵／點一下顯示原因；右鍵／長按看詳情）</div>')
      :('<div class="xwbb-why hint">'+(typeof isTouchUI!=='undefined'&&isTouchUI?'點一下卡片＝直接放置；長按＝看詳情':'左鍵卡片＝直接放置；右鍵＝看詳情')+'</div>');
    if(h.indexOf('xwbb-go')>=0)h=h.replace('</button>', '</button>'+tip);
    else h+=tip;
  }catch(e){}
  return h;
};}

// ---- 8: remove bottom-right building shortcut hud ----
xwBbHud=function(){const bar=document.getElementById('buildbar');if(!bar)return;bar.classList.add('xwbb-hud');bar.innerHTML='';bar.style.display='none';};
xwBbRemember=function(type){/* no recent hud */};
// #10：右下角編號建築快捷列整個移除（建造只走 B 建造選單／手機「建造」；數字鍵歸技能列）。舊 #buildbar 留空節點但永不顯示、不吃點擊、不佔位。
try{(function(){const st=document.createElement('style');st.id='xw10nobb';st.textContent='html body #buildbar#buildbar,html body.pc #buildbar#buildbar.xwbb-hud,html body.touch #buildbar#buildbar.open{display:none!important;pointer-events:none!important}';(document.head||document.documentElement).appendChild(st);const bb=document.getElementById('buildbar');if(bb){bb.innerHTML='';bb.setAttribute('aria-hidden','true');}})();}catch(e){}

// ---- 7: 點已建成建築 → 一律開建築介面（優先於身上單位／指派職務；建造模式會先取消）----
try{if(!document.getElementById('xwPanelBldCss')){const st=document.createElement('style');st.id='xwPanelBldCss';st.textContent='body.touch.building.xw-selbld #panel{display:block!important}';(document.head||document.documentElement).appendChild(st);}}catch(e){}
setInterval(()=>{try{document.body.classList.toggle('xw-selbld',selBuilding!=null);}catch(e){}},200);
function xwOpenBuildingPanel(b){
  if(!b)return false;
  try{buildMode=null;closeBuildMenu();}catch(e){}
  try{if(typeof XWBB!=='undefined'&&XWBB)XWBB.open=false;}catch(e){}
  selBuilding=b.id;selUnits=[];selOther=null;panelKeyCache=null;
  try{const el=document.getElementById('panel');if(el){el.style.display='block';el.classList.remove('x47slim');}}catch(e){}
  try{if(typeof renderPanel==='function')renderPanel();}catch(e){}
  try{document.body.classList.remove('building');}catch(e){}
  return true;
}
{const _lc=leftClick;leftClick=function(mx,my,sh){
  try{
    if(!sh&&!(S&&S.interior)&&!(S&&S.dg)){
      const w=screenToWorld(mx,my);const b=buildingAt(w);
      // 已建成（或建造中工地）優先開建築面板，不被腳下單位搶走
      if(b){xwOpenBuildingPanel(b);return;}
    }
  }catch(e){}
  const r=_lc.apply(this,arguments);
  try{if(selBuilding!=null)xwOpenBuildingPanel(bById(selBuilding));}catch(e){}
  return r;
};}
{const _ta=tapAt;tapAt=function(x,y){
  try{
    if(!(S&&S.interior)&&!(S&&S.dg)&&!buildMode){
      const w=screenToWorld(x,y);const b=buildingAt(w);
      // 短點已建成建築：開介面（工地／升級／修繕仍走原 rightClick 指派）
      if(b&&b.built&&!b.upg&&!(b.hp<b.maxhp)){xwOpenBuildingPanel(b);return;}
    }
  }catch(e){}
  const r=_ta.apply(this,arguments);
  try{if(selBuilding!=null)xwOpenBuildingPanel(bById(selBuilding));}catch(e){}
  return r;
};}

// ---- 1: dungeon — walk into gate, then show 是否進入 ----
XGATE.walkIn=null;
function xgateWalkThenAsk(kind){
  const g=(typeof gates==='function'?gates():[]).find(s=>s.kind===kind);if(!g){if(typeof x47DgEnterAsk==='function')x47DgEnterAsk(kind,null);return;}
  const p=player();if(!p||p.dead)return;
  const tx=g.i+1,ty=g.j+1;
  // already inside plinth → ask
  if(distRect(p.x,p.y,g.i,g.j,2)<=0.85){XGATE.walkIn=null;X47.dgNear=kind;if(typeof x47DgEnterAsk==='function')x47DgEnterAsk(kind,null);return;}
  XGATE.walkIn={kind,t:S.time};
  try{selUnits=[p.id];commandMove([p],tx,ty,false);}catch(e){try{setTask(p,{type:'move',x:tx,y:ty});pathTo(p,tx,ty);}catch(e2){}}
  try{toast('走向入口…');}catch(e){}
}
// replace click-to-enter: walk first
xgateClickWorld=function(mx,my){
  try{if(S&&S.dg){
    const w=screenToWorld(mx,my);
    if(S.dg.exitP&&dist(w.x,w.y,S.dg.exitP.x,S.dg.exitP.y)<1.6){XGATE.clickExit=1;if(typeof x47DgExitAsk==='function')x47DgExitAsk('portal');return true;}
    if(S.dg.ent&&dist(w.x,w.y,S.dg.ent.x,S.dg.ent.y)<1.6){XGATE.clickExit=1;if(typeof x47DgExitAsk==='function')x47DgExitAsk('ent');return true;}
    return false;
  }
  const w=screenToWorld(mx,my);const s=xgateAtWorld(w)||(typeof structAt==='function'&&structAt(w));
  if(s&&s.type==='dgate'){selOther={k:'s',id:s.id};selUnits=[];selBuilding=null;panelKeyCache=null;xgateWalkThenAsk(s.kind);return true;}
  }catch(e){}
  return false;
};
// tick: when walk-in arrives, show confirm; disable raw proximity auto-ask
{const _tk=x47DgTick;x47DgTick=function(){
  try{
    if(S&&!S.dg&&!S.interior){
      const p=player();
      if(p&&!p.dead&&XGATE.walkIn){
        const kind=XGATE.walkIn.kind;const g=gates().find(s=>s.kind===kind);
        if(!g||S.time-XGATE.walkIn.t>40){XGATE.walkIn=null;}
        else if(distRect(p.x,p.y,g.i,g.j,2)<=0.9){
          XGATE.walkIn=null;X47.dgNear=kind;
          if(!X47.dlg&&typeof x47DgEnterAsk==='function')x47DgEnterAsk(kind,null);
          return;
        }
      }
    }
  }catch(e){}
  // call original but suppress proximity auto-ask by temporarily faking distance
  const near0=X47.dgNear;
  const r=_tk.apply(this,arguments);
  // if original just opened ask due to proximity without walk-in, close and require walk
  try{
    if(X47.dlg&&X47.dlg.id==='dgin'&&!XGATE.walkIn&&near0==null){
      // allow if player already deep inside gate
      const p=player();const g=gates().find(s=>s.kind===X47.dgNear);
      if(p&&g&&distRect(p.x,p.y,g.i,g.j,2)>0.9){x47DlgClose('dgin');X47.dgNear=null;}
    }
  }catch(e){}
  return r;
};}
// confirm dialog title 是否進入
{const _ask=x47DgEnterAsk;x47DgEnterAsk=function(kind,o){
  const r=_ask.apply(this,arguments);
  try{
    const el=document.getElementById('x47dlg');
    if(el&&X47.dlg&&X47.dlg.id==='dgin'){
      const h=el.querySelector('h3');if(h&&!/是否進入/.test(h.textContent))h.textContent='是否進入・'+h.textContent.replace(/^⛩\s*/,'');
    }
  }catch(e){}
  return r;
};}

// ---- 11/12: range FX only on map (not over UI); include 礦場 ----
function xMineList(){
  const r=[];const R=(typeof ECON_MINE_TUNE!=='undefined'&&ECON_MINE_TUNE.range)||12;
  try{for(const b of S.buildings){if((b.type==='kuangchang'||b.type==='mine')&&b.built&&!b.broken){const s=(BUILD[b.type]&&BUILD[b.type].size)||2;r.push({x:b.i+s/2,y:b.j+s/2,R:R+s/2,lv:blv(b)||1,col:'rgba(210,180,100,'});}}}catch(e){}
  return r;
}
xjlDraw=function(){
  if(!xwRangeMapVisible())return;
  // hide while build panel / gold finger / modal covers the view
  try{if(typeof XWBB!=='undefined'&&XWBB.open)return;}catch(e){}
  try{const dbg=document.getElementById('x47dbg');if(dbg&&dbg.style.display==='block')return;}catch(e){}
  try{if(document.body.classList.contains('x47modal')||document.body.classList.contains('x47dbgopen'))return;}catch(e){}
  const L=xjlList().map(c=>({...c,col:'rgba(120,255,210,'}));
  const M=xMineList();
  const all=L.concat(M);if(!all.length)return;
  const now=performance.now()/1000,T=TUNE.xn.jlFx,n=40;ctx.save();
  for(const c of all){
    ctx.beginPath();for(let k=0;k<=n;k++){const a=k/n*6.283,p=P(c.x+Math.cos(a)*c.R,c.y+Math.sin(a)*c.R,0);k?ctx.lineTo(p.x,p.y):ctx.moveTo(p.x,p.y);}
    ctx.fillStyle=c.col+(T.alpha)+')';ctx.fill();ctx.setLineDash([6,5]);ctx.lineDashOffset=-now*8;
    ctx.strokeStyle=c.col+(T.ring+0.12*Math.sin(now*1.6))+')';ctx.lineWidth=1.5;ctx.stroke();ctx.setLineDash([]);
    ctx.fillStyle=c.col+'0.8)';for(let k=0;k<(T.n||8);k++){const ph=(now*0.25+k*0.618)%1,a=k*2.399+c.lv,rr=c.R*(0.25+0.7*((k*0.37)%1)),z=4+ph*26;
      const p=P(c.x+Math.cos(a)*rr,c.y+Math.sin(a)*rr,z);ctx.globalAlpha=Math.sin(ph*Math.PI)*0.9;ctx.fillRect(p.x-1.5,p.y-1.5,3,3);}ctx.globalAlpha=1;
  }
  ctx.restore();
};
// minimap mine rings too
{const _dm=drawMinimap;drawMinimap=function(){const r=_dm.apply(this,arguments);try{if(!xwRangeMapVisible())return r;const k=mmBig?2.2:1;
  const ring=(x,y,R,col,fill)=>{mctx.beginPath();for(let q=0;q<=24;q++){const a=q/24*6.283,p=mmPt(x+Math.cos(a)*R,y+Math.sin(a)*R);q?mctx.lineTo(p.x,p.y):mctx.moveTo(p.x,p.y);}if(fill){mctx.fillStyle=fill;mctx.fill();}mctx.strokeStyle=col;mctx.lineWidth=1*k;mctx.stroke();};
  for(const c of xMineList())ring(c.x,c.y,c.R,'rgba(210,180,100,0.9)','rgba(210,180,100,0.15)');
}catch(e){}return r;};}

// ---- 10: hint hide when hall built / hintOff / click ----
{const _uo=updateObjectives;updateObjectives=function(){
  const r=_uo.apply(this,arguments);
  try{
    const el=document.getElementById('hint');if(!el)return r;
    const o=S.objDone||[];
    const hide=!!(S.flags&&S.flags.hintOff)||!!(o[1])||(typeof hasBuilt==='function'&&hasBuilt('hall'))||(typeof player==='function'&&player()&&(player().realm|0)>=1);
    if(hide){el.style.display='none';}
    else{
      el.style.display='';
      // if tip still says place hall but hall exists, blank it
      if(/放置宗門大殿|站在工地旁/.test(el.textContent||'')&&(typeof hasAny==='function'&&hasAny('hall'))){el.style.display='none';S.flags.hintOff=1;}
    }
  }catch(e){}
  return r;
};}

// ---- 9: summon/recruit UI sometimes unresponsive — ensure clicks reach buttons ----
document.addEventListener('click',function(ev){
  const t=ev.target&&ev.target.closest&&ev.target.closest('#recmenu button,[data-c],[data-v47ap],[data-v48scan]');
  if(!t)return;
  // if something set pointer-events none on overlay, force through once
  try{const rec=document.getElementById('recmenu');if(rec){rec.style.pointerEvents='auto';rec.querySelectorAll('button').forEach(b=>b.style.pointerEvents='auto');}}catch(e){}
},true);

// ---- 3: gold finger CSS scroll fix ----
{const _css=xmodDbgCss;xmodDbgCss=function(){
  _css.apply(this,arguments);
  try{
    let st=document.getElementById('xmoddbgfix6e');
    if(!st){st=document.createElement('style');st.id='xmoddbgfix6e';document.head.appendChild(st);}
    st.textContent=`body.x47dbgopen #x47dbg.xmoddbg{height:min(640px,calc(100vh - var(--tb,44px) - 28px))!important;max-height:min(640px,calc(100vh - var(--tb,44px) - 28px))!important;display:flex!important;flex-direction:column!important;overflow:hidden!important}
body.x47dbgopen #x47dbg .xmod-body{overflow:auto!important;flex:1 1 auto!important;min-height:0!important;-webkit-overflow-scrolling:touch;overscroll-behavior:contain;touch-action:pan-y}
body.x47dbgopen #x47dbg .xmodck{touch-action:pan-y}
#buildbar.xwbb-hud{display:none!important}
#x47dbg.xmoddbg[hidden],#x47dbg.xmoddbg.x47dbg-closed{display:none!important}`;
  }catch(e){}
};}

// ---- after load / boot: fix buildings + objectives ----
setTimeout(function(){try{xwFixBuildings();xwPeakRealm();if(typeof checkObjectives==='function')checkObjectives();}catch(e){}},800);

// beast HP audit: clamp any leftover >1.10 step outside xf
{const _me=makeEnemy;makeEnemy=function(type,x,y,o){
  const e=_me.apply(this,arguments);
  try{
    if(!e||(e.v49lq)||(S&&S.dg&&S.dg.kind==='xf'))return e;
    const D=ENEMY[type];if(!D)return e;
    const rl=e.realm|0;
    // expected with ≤10% / major realm
    let hp=D.hp,atk=D.atk;for(let i=0;i<rl;i++){hp=Math.max(1,Math.floor(hp*1.1+1e-9));atk=Math.floor(atk*1.1*10+1e-9)/10;}
    // if somehow > 1.15^rl from base, clamp
    const capHp=Math.max(1,Math.floor(D.hp*Math.pow(1.12,rl)+1e-9));
    if(e.maxhp>capHp){const ratio=e.hp/e.maxhp;e.maxhp=hp;e.hp=Math.max(1,Math.round(hp*ratio));e.atk=+atk.toFixed(1);}
  }catch(er){}
  return e;
};}

setTimeout(function(){if(!window.XW||!XW.xn)return;XW.xn.fix6e={peak:xwPeakRealm,fixBld:xwFixBuildings,gfDone:xwGfCompleteAll,gfPlace:xwGfPlaceBuilt,openBld:xwOpenBuildingPanel,mineList:xMineList,mapUnlock:xmapUnlockIf,mapOnXian:xmapOnXian};},0);


// 進遊戲或關掉取名視窗後立刻同步組隊鈕（不要等按 B）
{const _st=typeof showTitle==='function'?showTitle:null;
  if(_st){showTitle=function(on){const r=_st.apply(this,arguments);try{if(!on&&typeof xptSync==='function')xptSync();}catch(e){}return r;};}}
setTimeout(function(){try{
  if(typeof y48NameSubmit==='function'){const _ys=y48NameSubmit;y48NameSubmit=function(){const r=_ys.apply(this,arguments);try{if(typeof xptSync==='function')xptSync();}catch(e){}return r;};}
}catch(e){}},0);
// ---- B鍵／組隊快捷：B 只開建造；組隊改 P ----
function xptKeyToggle(){
  try{
    if(typeof xnMenuUp==='function'&&xnMenuUp())return;
    if(!document.body||!document.body.classList.contains('ingame')||document.body.classList.contains('titleopen'))return;
    if(typeof XPT==='undefined')return;
    const on=!XPT.open();
    try{if(typeof NET!=='undefined')NET._ptOpen=false;}catch(e){}
    XPT.set(on);
    if(on&&typeof netPtRender==='function')try{netPtRender();}catch(e){}
  }catch(e){}
}
addEventListener('keydown',function(ev){
  try{
    if(ev.repeat||ev.ctrlKey||ev.metaKey||ev.altKey)return;
    const t=ev.target;if(t&&/^(INPUT|TEXTAREA)$/.test(t.tagName))return;
    if(!document.body||!document.body.classList.contains('ingame')||document.body.classList.contains('titleopen'))return;
    if(ev.code==='KeyP'){ev.preventDefault();ev.stopPropagation();xptKeyToggle();return;}
    // KeyB 不關組隊，避免按 B 才冒出「組隊（P）」按鈕
  }catch(e){}
},true);

setTimeout(function(){
  try{
    if(typeof mapXfInstall==='function'){
      if(typeof enemyName==='function'&&!enemyName._mapXf)mapXfInstall._ok=false;
      mapXfInstall();
    }
  }catch(e){}
},0);


// ======================= BATCH2100_FIN_OFFICE_BOOT =======================
// 財務摺疊開關
addEventListener('click',function(ev){
  try{
    const t=ev.target&&ev.target.closest&&ev.target.closest('[data-econ-fin]');
    if(!t)return;
    ev.preventDefault();ev.stopPropagation();
    window.__econFinOpen=!window.__econFinOpen;
    try{panelKeyCache=null;}catch(e){}
    try{if(typeof renderPanel==='function')renderPanel();}catch(e){}
  }catch(e){}
},true);

// 新建築面板：顯示實際產出／效果（靈田等）
(function(){
  try{
    if(typeof bdescHtml!=='function')return;
    const _b=bdescHtml;
    bdescHtml=function(b){
      try{
        if(b&&typeof econBuildingDescRows==='function'){
          const L=econBuildingDescRows(b);
          if(L&&L.length){
            const note=(typeof econBuildingDef==='function'&&econBuildingDef(b.type)&&econBuildingDef(b.type).note)||'';
            return '<b class="sdl">'+(note||'')+'</b><div class="v50ls">'+L.map(function(kv){return '<div><span class="v50lk">'+kv[0]+'</span><span class="v50lv">'+kv[1]+'</span></div>';}).join('')+'</div>';
          }
        }
      }catch(e){}
      return _b.apply(this,arguments);
    };
  }catch(e){}
})();

// 設定裡放「金手指」按鈕（僅 ?dev=1／localhost）；正式版不出現
(function(){
  function inject(){
    try{
      if(typeof x47DevMode!=='function'||!x47DevMode())return;
      if(typeof x47DbgAllowed==='function'&&!x47DbgAllowed())return;
      const el=document.getElementById('settings');if(!el||!el.classList.contains('open'))return;
      if(el.querySelector('[data-xw-gf-open]'))return;
      const foot=el.querySelector('.s173f')||el.querySelector('.s173')||el;
      const row=document.createElement('div');
      row.className='s173r';
      row.style.cssText='margin:8px 0;padding:8px;border:1px solid #c9a35a88;border-radius:8px;background:#2a1d1288';
      row.innerHTML='<div class="s173l"><span class="s173t">🛠 金手指</span><span class="s173d">測試用：加資源、突破、無敵、時間加速等。僅開發模式可見；正式版不會出現。</span></div><div class="s173c"><button type="button" class="btn pri" data-xw-gf-open="1">開啟金手指</button></div>';
      if(foot.classList.contains('s173f'))foot.parentNode.insertBefore(row,foot);
      else foot.appendChild(row);
    }catch(e){}
  }
  document.addEventListener('click',function(ev){
    const b=ev.target&&ev.target.closest&&ev.target.closest('[data-xw-gf-open]');
    if(!b)return;
    ev.preventDefault();ev.stopPropagation();
    try{
      if(typeof x47DevMode==='function'&&!x47DevMode()){toast('金手指僅限測試模式（?dev=1）');return;}
      try{if(typeof CFG173!=='undefined')CFG173.dbg=1;}catch(e){}
      try{document.body.classList.add('x47dbgon');}catch(e){}
      try{if(typeof x47DbgBtn==='function')x47DbgBtn();}catch(e){}
      try{if(typeof x47DbgOpen==='function')x47DbgOpen();
      else if(typeof XW!=='undefined'&&XW.v47x&&XW.v47x.dbgOpen)XW.v47x.dbgOpen();}catch(e){}
      try{const s=document.getElementById('settings');if(s)s.classList.remove('open');}catch(e){}
    }catch(e){}
  },true);
  const _os=typeof openSettings==='function'?openSettings:null;
  if(_os&&!_os._xwGf){openSettings=function(){const r=_os.apply(this,arguments);setTimeout(inject,0);return r;};openSettings._xwGf=1;}
  try{if(typeof v173Render==='function'&&!v173Render._xwGf){const _vr=v173Render;v173Render=function(){const r=_vr.apply(this,arguments);setTimeout(inject,0);return r;};v173Render._xwGf=1;}}catch(e){}
  setInterval(inject,800);
})();

// BATCH2100_LVEFFECT：靈田等新建築的升級說明用真實產量
(function(){
  try{
    if(typeof lvEffect!=='function')return;
    const _le=lvEffect;
    lvEffect=function(b,lv){
      try{
        if(b&&typeof econBuildingEffect==='function'){
          const e=econBuildingEffect(b.type,lv||1);
          if(e&&e.kind==='farm')return '每遊戲日藥草 '+e.herbPerDay+'、食物 '+e.foodPerDay;
          if(e&&e.kind==='mine')return '範圍採集 ×'+e.gatherMul;
          if(e&&e.kind==='contrib')return '貢獻 ×'+e.contribMul;
          if(e&&e.kind==='loyalty')return '忠誠衰退 ×'+e.loyaltyDecayMul;
          if(e&&e.kind==='trade')return '買 ×'+e.buyMul+'／賣 ×'+e.sellMul;
        }
      }catch(e){}
      return _le.apply(this,arguments);
    };
  }catch(e){}
})();

// BATCH2100_V51_SCRUB：最終再包一層，確保任何上游名牌都不會在無法觀察時洩漏境界
(function(){
  try{
    if(typeof enemyName!=='function')return;
    const _en=enemyName;
    enemyName=function(e){
      try{
        if(e&&typeof v51Unk==='function'&&v51Unk(e)&&typeof v51SafeEnemyName==='function')return v51SafeEnemyName(e);
        if(e&&typeof v51SafeEnemyName==='function'&&typeof v162See==='function'&&v162See(e).r<0)return v51SafeEnemyName(e);
        let s=_en(e);
        try{
          if(e&&typeof v162See==='function'&&v162See(e).r<0){
            const D=(typeof ENEMY!=='undefined'&&ENEMY[e.type])||{};
            const kind=e.exd===1?'叛門山賊':(D.n||e.type||'敵人');
            return kind+'・???';
          }
          // 清掉殘留「無法觀察」字樣，改 ???
          if(s)s=String(s).replace(/無法觀察/g,'???');
        }catch(er){}
        return s;
      }catch(er){return _en(e);}
    };
  }catch(e){}
})();


// ======================= BATCH2100_TOAST_DEDUP =======================
// 相同提示 3 秒內不重複跳出（倒地／重傷等）
(function(){
  try{
    if(typeof toast!=='function')return;
    const _t=toast, seen=Object.create(null);
    toast=function(msg){
      try{
        const m=String(msg==null?'':msg);
        const now=(typeof performance!=='undefined'&&performance.now)?performance.now():Date.now();
        const prev=seen[m];
        if(prev&&now-prev<3000)return;
        seen[m]=now;
        // 偶爾清舊鍵
        if((now|0)%17===0){for(const k in seen)if(now-seen[k]>8000)delete seen[k];}
      }catch(e){}
      return _t.apply(this,arguments);
    };
  }catch(e){}
})();

// ======================= BATCH2100_ENEMY_GQ =======================
// 已移至 cult_enemy.js（避免雙重吸盾／雙重回充）。此處停用。
(function(){
  return;
  try{
    TUNE.xn=TUNE.xn||{};
    TUNE.xn.enGq={frac:0.8, on:1};
    function enGqOk(e){return !!(e&&!e.dead&&!e.kind&&(e.realm|0)>=3&&!(e.v49lq));}
    function enGqSync(e){
      if(!enGqOk(e)){e.gqMax=0;e.gq=0;e.gqT=null;return;}
      const t=(e.realm|0)>=4?'ling':'gang';
      let gm=0;
      if(t==='gang')gm=Math.round((e.maxhp||0)*TUNE.v49.gangFrac*TUNE.xn.enGq.frac);
      else{
        // 靈氣護體：比照玩家 gqMaxFor，再 ×0.8
        const r=Math.min(e.realm|0,10);
        const qm=Math.round(TUNE.v49.qiBase*Math.pow(TUNE.v49.qiGrow,r-4)*(1+TUNE.v49.qiSub*((e.sub||0))));
        gm=Math.round(qm*TUNE.v49.lingFrac/TUNE.v49.qiPerDmg*TUNE.xn.enGq.frac);
      }
      if(e.gqMax!==gm){const f=e.gqMax>0&&e.gq!=null?e.gq/e.gqMax:1;e.gqMax=gm;e.gq=gm?Math.round(gm*Math.max(0,Math.min(1,f))):0;}
      if(e.gq==null)e.gq=e.gqMax||0;e.gqT=t;
    }
    function enGqTick(e,dt){
      if(!enGqOk(e))return;enGqSync(e);
      if(!(e.gqMax>0))return;
      // 回血：玩家公式 (3+realm*1.5)*dt ×0.8，脫戰 5 秒
      if(S.time-(e.lastHit||0)>5&&e.hp<e.maxhp){
        e.hp=Math.min(e.maxhp,e.hp+(3+(e.realm||0)*1.5)*TUNE.xn.enGq.frac*dt);
      }
      // 護盾回充：玩家 gqRefill 速率 ×0.8
      if((e.gqCd||0)>0)e.gqCd=Math.max(0,e.gqCd-dt);
      else if(e.gq<e.gqMax)e.gq=Math.min(e.gqMax,e.gq+e.gqMax/(TUNE.v49.gqRefill/TUNE.xn.enGq.frac)*dt);
    }
    // 受傷吸盾
    {const _de=dmgEnemy;dmgEnemy=function(src,e,amt,col){
      try{
        if(e&&enGqOk(e)&&amt>0){enGqSync(e);
          if(e.gqMax>0){const sr=(src&&src.realm)||0;let f=1,skip=false;
            if(e.gqT==='gang'){if(sr>=5)skip=true;else if(sr===4)f=1.2;}
            if(!skip){e.gqCd=TUNE.v49.gqCd;e.lastHit=S.time;
              if(e.gq>0){const need=amt*f,a=Math.min(e.gq,need);e.gq-=a;amt-=a/f;e._gqHit=performance.now();
                if(!e._gqF||S.time-e._gqF>1.2){e._gqF=S.time;try{floater(e.x,e.y-0.3,e.gqT==='gang'?'罡氣':'靈氣護體',e.gqT==='gang'?'#ffd98a':'#9fe8ff');}catch(er){}}
                if(e.gq<=0){e.gq=0;try{fx('ring',e.x,e.y,'#ffffff');}catch(er){}}
                if(amt<=0.01)return;
              }
            }
          }
        }
      }catch(err){}
      return _de.call(this,src,e,amt,col);
    };}
    // tick
    {const _ue=updateEnemy;updateEnemy=function(e,dt,ct){
      try{if(e&&!e.dead)enGqTick(e,dt);}catch(err){}
      return _ue.apply(this,arguments);
    };}
    // 名牌護盾條（畫在血條上方）
    function enGqBar(e,bx,by,w){
      if(!e||!(e.gqMax>0))return;
      const f=Math.max(0,Math.min(1,(e.gq||0)/e.gqMax));
      const col=e.gqT==='ling'?'#7ad7ff':'#ffd27a';
      try{bar(bx,by-4,w,f,col);}catch(err){}
    }
    {const _db=drawBeast;drawBeast=function(e){
      const r=_db.apply(this,arguments);
      try{
        if(e&&enGqOk(e)&&e.gqMax>0){
          const b=P(e.x,e.y);const t=e.type,sc=t==='king'?2:t==='tiger'?1.25:t==='boar'?1.1:1;
          if(ENEMY[e.type]&&ENEMY[e.type].human)enGqBar(e,b.x,b.y-36*sc,26);
          else if(t==='king')enGqBar(e,b.x,b.y-58,44);
          else enGqBar(e,b.x,b.y-26*sc,24);
        }
      }catch(err){}
      return r;
    };}
    try{if(typeof EN_KEEP!=='undefined'&&Array.isArray(EN_KEEP)){for(const k of ['gq','gqMax','gqT','gqCd'])if(!EN_KEEP.includes(k))EN_KEEP.push(k);}}catch(e){}
  }catch(e){console.warn('enGq',e);}
})();

// ======================= BATCH2100_FORCE_CMD =======================
// 玩家強制命令（移動／集合／任何直接下令）期間：弟子不自動接戰、被打不反打；明確攻擊指令仍打
(function(){
  try{
    TUNE.xn=TUNE.xn||{};
    if(TUNE.xn.mvGrace==null)TUNE.xn.mvGrace=3;
    if(TUNE.xn.mvMax==null)TUNE.xn.mvMax=12;
    function xcmdArm(us,kind){
      for(const u of us||[]){
        if(!u||u.kind!=='disciple'||u.dead||u.np)continue;
        if(typeof xnIsPC==='function'&&xnIsPC(u))continue;
        u.xcmd={kind:kind||'move',t0:S.time,until:S.time+(TUNE.xn.mvMax||12)};
        u.holdT=S.time;
        // 清掉非手動攻擊
        if(u.task&&u.task.type==='attack'&&!u.task.man){u.task=null;u.path=[];}
        u.target=null;
      }
    }
    // 移動下令
    {const _cm=commandMove;commandMove=function(us){const r=_cm.apply(this,arguments);try{xcmdArm(us,'move');if(typeof xmvArm==='function')xmvArm(us);}catch(e){}return r;};}
    // 明確攻擊：標記 man，並解除強制避戰
    {const _st=setTask;setTask=function(u,t){
      try{
        if(u&&u.kind==='disciple'&&t&&t.type==='attack'){
          // 僅在明確標記 man／或玩家選取下令時解除避戰；AI 直接寫 u.task 不經此處
          if(t.man||(typeof selUnits!=='undefined'&&selUnits&&selUnits.includes(u.id))){t.man=1;u.xcmd=null;if(u.xmv)u.xmv=null;}
        }else if(u&&u.kind==='disciple'&&t&&t.type==='move'&&(t.man||(typeof XCO!=='undefined'&&XCO.man))){
          // 僅玩家 commandMove／手動 move 掛 xcmd；XND／v46Retreat 的逃脫 move 不視為強制命令
          u.xcmd={kind:'move',t0:S.time,until:S.time+(TUNE.xn.mvMax||12)};
        }
      }catch(e){}
      return _st.apply(this,arguments);
    };}
    // 右鍵／面板攻擊入口補 man
    try{if(typeof rightClick==='function'){/* player path uses setTask; man via selUnits */}}catch(e){}
    // 強化既有 xmv：被打不轉攻擊、自動索敵擋掉、完成後才恢復
    {const _uu=updateUnit;updateUnit=function(u,dt){
      if(u&&u.kind==='disciple'&&u.xcmd&&S.time>=u.xcmd.until)u.xcmd=null;
      if(u&&u.xcmd&&S.time<u.xcmd.until){
        // 途中被改成非手動攻擊 → 拉回
        if(u.task&&u.task.type==='attack'&&!u.task.man){
          if(u.xmv&&u.xmv.x!=null){u.task={type:'move',x:u.xmv.x,y:u.xmv.y};u.path=[];}
          else u.task=null;
        }
      }
      return _uu.apply(this,arguments);
    };}
    // 守衛偵測跳過強制命令中的弟子
    try{
      if(typeof updateDisciple==='function'){/* g4 已檢查 xmvOn/xcmd */}
    }catch(e){}
  }catch(e){console.warn('xcmd',e);}
})();

// ======================= BATCH2100_BAN_CORNER =======================
// 根因：g18 CSS 置中 + y194Lay 置中 + xn12Layout 室內再置中 + v138Lay 只改 top。
// 最終覆蓋：CSS !important 釘右上角；每次 layout 後再強制一次，避免被上游蓋回中間。
(function(){
  try{
    const st=document.createElement('style');st.id='batch2100_ban';
    st.textContent=[
      '#v47ban{position:fixed!important;left:auto!important;right:calc(var(--sar,0px) + 10px)!important;transform:none!important;',
      'width:min(300px,42vw)!important;max-width:min(300px,42vw)!important;z-index:60!important;',
      'display:flex!important;flex-direction:column!important;gap:4px!important;pointer-events:none!important;align-items:stretch!important}',
      '#v47ban .v47bn{pointer-events:auto!important;font-size:12px!important;padding:6px 8px!important;line-height:1.3!important;gap:6px!important}',
      '#v47ban .v47bn.raid{font-size:13px!important;letter-spacing:0!important}',
      '#v47ban .v47bn.gold{font-size:12px!important}',
      '#v47ban .v47bn .bx{min-width:28px;min-height:28px;font-size:14px;opacity:.85}',
      'body.touch #v47ban{right:calc(var(--sar,0px) + 6px)!important;width:min(260px,46vw)!important}'
    ].join('');
    document.head.appendChild(st);
  }catch(e){}
  function banCorner(){
    try{
      const el=document.getElementById('v47ban');if(!el)return;
      const W=innerWidth,H=innerHeight;
      let top=44;try{if(typeof bb190TopB==='function')top=bb190TopB(document.getElementById('topbar'))||top;}catch(e){}
      top=Math.round(top+6);
      try{
        const mm=document.getElementById('minimap');
        if(mm){const cs=getComputedStyle(mm);if(cs.display!=='none'){const r=mm.getBoundingClientRect();
          if(r.width>1&&r.top<H*0.35&&r.right>W*0.55)top=Math.max(top,Math.round(r.bottom+6));}}
        const pb=document.getElementById('pbar');
        if(pb){const cs=getComputedStyle(pb);if(cs.display!=='none'){const r=pb.getBoundingClientRect();
          if(r.width>1&&r.top<top+50&&r.right>W*0.55)top=Math.max(top,Math.round(r.bottom+4));}}
      }catch(e){}
      const has=el.children&&el.children.length>0;
      if(!has){el.style.setProperty('display','none','important');return;}
      el.style.setProperty('display','flex','important');
      el.style.setProperty('left','auto','important');
      el.style.setProperty('right','10px','important');
      el.style.setProperty('top',top+'px','important');
      el.style.setProperty('transform','none','important');
      const bw=Math.min(300,Math.max(200,Math.round(W*0.28)));
      el.style.setProperty('width',bw+'px','important');
      el.style.setProperty('max-width',bw+'px','important');
      el.style.removeProperty('bottom');
    }catch(e){}
  }
  try{if(typeof y194Lay==='function'){const _y=y194Lay;y194Lay=function(){const r=_y.apply(this,arguments);banCorner();return r;};}}catch(e){}
  try{if(typeof v138Lay==='function'){const _v=v138Lay;v138Lay=function(){const r=_v.apply(this,arguments);banCorner();return r;};}}catch(e){}
  try{if(typeof v47RenderBanners==='function'){const _r=v47RenderBanners;v47RenderBanners=function(){const r=_r.apply(this,arguments);banCorner();return r;};}}catch(e){}
  try{addEventListener('resize',()=>setTimeout(banCorner,40));}catch(e){}
  setInterval(banCorner,800);
  setTimeout(banCorner,0);
})();


// ======================= BATCH2100_FAR_ATK =======================
// 右鍵遠距敵人：手動攻擊不受 18 格牽繩限制；命中半徑再加大一點（縮放小時）
(function(){
  try{
    TUNE.xn=TUNE.xn||{};TUNE.xn.atkLeashMan=80;TUNE.xn.atkLeashAuto=18;
    // 強化 enemyAt：用螢幕像素半徑，遠距／小縮放也能點到
    {const _ea=enemyAt;enemyAt=function(w){
      let best=_ea.apply(this,arguments);
      if(best)return best;
      const R=Math.max(isTouchUI?48:36,(isTouchUI?72:56)/Math.max(0.25,cam.zoom||1));
      let bd=R;
      for(const e of S.enemies){
        if(e.dead||!isExplored(e.x,e.y))continue;
        const p=iso(e.x,e.y),off=e.type==='king'?24:10;
        const d=Math.min(dist(w.x,w.y,p.x,p.y-off),dist(w.x,w.y,p.x,p.y));
        if(d<bd){bd=d;best=e;}
      }
      return best;
    };}
  }catch(e){console.warn('farAtk',e);}
})();


// ======================= BATCH2100_RAID_GATE =======================
// 防止其他路徑（金手指／任務強制）在已有來襲時再疊一波；toast 去重靠 BATCH2100_TOAST_DEDUP
(function(){
  try{
    if(typeof launchRaid!=='function')return;
    if(launchRaid._b2100)return;
    const _lr=launchRaid;
    launchRaid=function(v){
      try{
        if(typeof raidAlive==='function'&&raidAlive()&&!(arguments[1]==='force')){
          if(v){v.raidT=S.time+45;v.warned=false;}
          return;
        }
      }catch(e){}
      return _lr.apply(this,arguments);
    };
    launchRaid._b2100=1;
  }catch(e){}
})();


// ======================= BATCH2100_BLD_CAP_UI =======================
// 境界→建築等級上限表（與 econ_build.js ECON_REALM_LV_CAP 一致）：
// 武徒 Lv2｜武師 Lv3｜大武師 Lv4｜宗師 Lv5｜煉氣+ Lv6（peakRealm ≥）
(function(){
  try{
    setTimeout(function(){
      try{
        if(!window.XW)return;
        XW.bldCap={
          table: (typeof ECON_REALM_LV_CAP!=='undefined'?ECON_REALM_LV_CAP.slice():[2,3,4,5,6,6,6,6,6,6,6,6]),
          maxOf:b=>typeof econUpgradeMax==='function'?econUpgradeMax(b):3,
          need:lv=>typeof econRealmNeedForLv==='function'?econRealmNeedForLv(lv):0,
          peak:()=>typeof econPeakForCap==='function'?econPeakForCap():0
        };
      }catch(e){}
    },0);
  }catch(e){}
})();


// ======================= BATCH2100_ENEMY_PANEL =======================
// 敵人資訊卡：氣血／護盾、攻防、特徵、掉落提示、逃亡／首領；不可觀察時走 ??? 規則；保留右鍵攻擊提示。
(function(){
  try{
    function enPanelHtml(o){
      if(!o)return '';
      const D=(typeof ENEMY!=='undefined'&&ENEMY[o.type])||{};
      const unk=(typeof v51Unk==='function')?v51Unk(o):false;
      const nm=(typeof enemyName==='function')?enemyName(o):(D.n||'敵人');
      const tags=[];
      if(o.raid)tags.push('<span class="tag" style="background:#ff6a5a">襲擊者</span>');
      if(D.boss||o.boss)tags.push('<span class="tag" style="background:#ffcc40">首領</span>');
      if(o.flee)tags.push('<span class="tag" style="background:#ffb0a0">逃亡中</span>');
      if(D.human)tags.push('<span class="tag" style="background:#c9a06a">人類</span>');
      else tags.push('<span class="tag" style="background:#7a9a6a">妖獸</span>');
      let hpLine='氣血 <b id="pd_ehp"></b>';
      if(o.gqMax>0)hpLine+='　護盾 <b id="pd_egq"></b>';
      const atk=unk?'???':(o.atk!=null?o.atk:'—');
      const def=unk?'???':(o.def!=null?o.def:(D.def!=null?D.def:0));
      let drop='';
      if(unk)drop='掉落：???（境界遠高於你，難以窺探）';
      else{
        const bits=[];
        if(D.food)bits.push('食物 '+D.food);
        if(D.human&&o.type!=='militia')bits.push('鐵礦');
        if(D.xiu)bits.push('修為');
        drop=bits.length?('掉落提示：'+bits.join('、')):'掉落提示：無特別物資';
      }
      let st='';
      if(o.flee)st='狀態：正在逃亡';
      else if(D.boss||o.boss)st='狀態：首領級對手，務必謹慎';
      else if(o.raid)st='狀態：山寨來襲部隊';
      else st='狀態：敵對';
      const tip=(typeof isTouchUI!=='undefined'&&isTouchUI)?'長按敵人＝下令攻擊':'右鍵點敵人＝鎖定並攻擊';
      return '<h4>'+nm+tags.join('')+'</h4>'
        +'<div class="mini">'+hpLine+'｜攻擊 '+atk+'｜防禦 '+def+'</div>'
        +'<div class="sm dim" style="margin:4px 0">'+st+'</div>'
        +'<div class="sm dim">'+drop+'</div>'
        +'<div class="phint">'+tip+'</div>';
    }
    // Rebuild enemy branch after base renderPanel when key is enemy
    {const _rp=renderPanel;renderPanel=function(){
      const r=_rp.apply(this,arguments);
      try{
        if(!(typeof selOther!=='undefined'&&selOther&&selOther.k==='e'))return r;
        if(typeof selBuilding!=='undefined'&&selBuilding!=null)return r;
        if(typeof selUnits!=='undefined'&&selUnits&&selUnits.length)return r;
        const o=typeof selOtherObj==='function'?selOtherObj():(typeof enemyById==='function'?enemyById(selOther.id):null);
        const el=document.getElementById('panel');if(!o||!el)return r;
        const html=enPanelHtml(o);
        // Keep close button / grip if present
        const close=el.querySelector(':scope > .x47pclose');
        const grip=null;
        el.innerHTML=html;
        if(close)el.insertBefore(close,el.firstChild);
        // live numbers
        const set=(id,v)=>{const e=document.getElementById(id);if(e)e.textContent=String(v);};
        try{
          const pair=(typeof xwHpPair==='function')?xwHpPair(o.hp,o.maxhp):(Math.ceil(o.hp)+'/'+Math.ceil(o.maxhp));
          set('pd_ehp',pair);
          if(o.gqMax>0){
            const gq=(typeof xwHpPair==='function')?xwHpPair(o.gq||0,o.gqMax):((o.gq||0)+'/'+o.gqMax);
            set('pd_egq',gq);
          }
        }catch(e){}
        // strip any finance that slipped in
        ['#econ_fin','#econ_wal','#xw_off','#xw_dlog'].forEach(sel=>{const n=el.querySelector(sel);if(n)try{n.remove();}catch(e){}});
      }catch(e){}
      return r;
    };}
    // Keep shield/hp fresh on enemy panel
    {const _ui=typeof updateUI==='function'?updateUI:null;
      if(_ui&&!_ui._enPan){updateUI=function(){const r=_ui.apply(this,arguments);try{
        if(selOther&&selOther.k==='e'){const o=enemyById(selOther.id);if(o){
          const set=(id,v)=>{const e=document.getElementById(id);if(e)e.textContent=String(v);};
          const pair=(typeof xwHpPair==='function')?xwHpPair(o.hp,o.maxhp):(Math.ceil(o.hp)+'/'+Math.ceil(o.maxhp));
          set('pd_ehp',pair);
          if(o.gqMax>0){const gq=(typeof xwHpPair==='function')?xwHpPair(o.gq||0,o.gqMax):((o.gq||0)+'/'+o.gqMax);set('pd_egq',gq);}
        }}
      }catch(e){}return r;};updateUI._enPan=1;}
    }
  }catch(e){console.warn('enPanel',e);}
})();


// ======================= BATCH2100_REC_GATE =======================
// 求武台・招募選單：感應完成／長老自動招募不得自動彈出；點候選人也不再由此路徑開啟。
(function(){
  try{
    window.__recOpenLog = window.__recOpenLog || [];
    const _open = openRec;
    openRec = function(b){
      try{
        window.__recOpenLog.push({t:(typeof S!=='undefined'&&S&&S.time)||0, via:'openRec', stack:(new Error()).stack.split('\n').slice(1,6).map(s=>s.trim())});
        if(window.__recOpenLog.length>50)window.__recOpenLog.shift();
      }catch(e){}
      return _open.apply(this, arguments);
    };
    if(typeof spawnBatch==='function' && !spawnBatch._recGate){
      const _sb = spawnBatch;
      spawnBatch = function(b, opt){
        const was = !!(typeof recOpen!=='undefined' && recOpen);
        const n = _sb.apply(this, arguments);
        try{ if(!was && typeof toggleRec==='function' && recOpen) toggleRec(false); }catch(e){}
        return n;
      };
      spawnBatch._recGate = 1;
    }
    if(typeof econAutoRecruitOnce==='function' && !econAutoRecruitOnce._recGate){
      const _ar = econAutoRecruitOnce;
      econAutoRecruitOnce = function(){
        const was = !!(typeof recOpen!=='undefined' && recOpen);
        const r = _ar.apply(this, arguments);
        try{ if(!was && typeof toggleRec==='function' && recOpen) toggleRec(false); }catch(e){}
        return r;
      };
      econAutoRecruitOnce._recGate = 1;
    }
    try{ if(window.XW){ XW.openRec=openRec; if(typeof spawnBatch==='function')XW.spawnBatch=spawnBatch; } }catch(e){}
  }catch(e){ console.warn('REC_GATE', e); }
})();


// ======================= BATCH2100_PACK_Q =======================
// 2–3 職務任命、22 卡死、24 頭頂條疊放、13 遠距右鍵、11 橫幅、20 事件角標、18 礦場圈、強化 ranks
(function(){
  try{
    // ---- 2–3：確保 ranks／elderAI／autoRecruit 開；任命區提到面板靠上 ----
    try{
      if(typeof ECON_RANK_FLAGS!=='undefined'){ECON_RANK_FLAGS.ranks=true;ECON_RANK_FLAGS.elderAI=true;ECON_RANK_FLAGS.autoRecruit=true;}
    }catch(e){}
    try{
      if(typeof ECON_FLAGS_DEFAULT!=='undefined'){ECON_FLAGS_DEFAULT.ranks=true;ECON_FLAGS_DEFAULT.elderAI=true;ECON_FLAGS_DEFAULT.autoRecruit=true;}
    }catch(e){}
    function ensureRankFlags(){
      try{
        if(!S||!S.econ)return;
        if(!S.econ.flags)S.econ.flags={};
        if(S.econ.flags.ranks==null)S.econ.flags.ranks=true;
        // 新局／舊存若被經典模式關掉以外，預設開
        if(typeof xmodUrlForceOn==='function'&&!xmodUrlForceOn()&&typeof location!=='undefined'&&/[?&](?:classic=1|big=0)/.test(location.search||''))return;
        if(typeof xmodFlagOn==='function'){
          // respect goldfinger prefs if set; else force on
          const p=typeof xmodLoadPrefs==='function'?xmodLoadPrefs():{};
          if(p.ranks!==false)S.econ.flags.ranks=true;
          if(p.elderAI!==false)S.econ.flags.elderAI=true;
          if(p.autoRecruit!==false)S.econ.flags.autoRecruit=true;
        }else{
          S.econ.flags.ranks=true;S.econ.flags.elderAI=true;S.econ.flags.autoRecruit=true;
        }
      }catch(e){}
    }
    try{if(typeof newGame==='function'){const _ng=newGame;newGame=function(){const r=_ng.apply(this,arguments);ensureRankFlags();return r;};}}catch(e){}
    try{if(typeof applySave==='function'){const _as=applySave;applySave=function(){const r=_as.apply(this,arguments);ensureRankFlags();return r;};}}catch(e){}
    setInterval(ensureRankFlags,2500);setTimeout(ensureRankFlags,0);
    // 任命區：插到財務之前、面板中段可見處；加醒目標題
    try{
      if(!document.getElementById('xwOffCss')){
        const st=document.createElement('style');st.id='xwOffCss';
        st.textContent='#xw_off{margin:6px 0 4px;padding:6px 8px;border:1px solid #c9a35a66;border-radius:6px;background:#2a1d1288}'
          +'#xw_off h5{margin:0 0 4px;color:#ffe9a8;letter-spacing:2px}'
          +'#xw_off .econ-appoint{display:flex;flex-wrap:wrap;gap:4px;margin-top:4px}'
          +'#xw_off .econ-appoint .btn{font-size:12px;padding:3px 7px}';
        (document.head||document.documentElement).appendChild(st);
      }
    }catch(e){}
    {const _rp=renderPanel;renderPanel=function(){
      const r=_rp.apply(this,arguments);
      try{
        ensureRankFlags();
        const el=document.getElementById('panel');if(!el)return r;
        const off=el.querySelector('#xw_off');
        if(off){
          // 插到財務／錢包之前，避免被擠出可視區
          const fin=el.querySelector('#econ_fin');
          const wal=el.querySelector('#econ_wal');
          const anchor=fin||wal;
          if(anchor&&off.compareDocumentPosition(anchor)&Node.DOCUMENT_POSITION_PRECEDING){
            el.insertBefore(off,anchor);
          }else if(!anchor){
            // 插到戰鬥／職務列附近
            const job=el.querySelector('.v55job,.jobs,[data-p="ov"]')||el.querySelector('.pexp');
            if(job&&job.parentNode===el)el.insertBefore(off,job.nextSibling);
            else if(job&&job.parentNode)job.parentNode.insertBefore(off,job.nextSibling);
          }
        }
      }catch(e){}
      return r;
    };}

    // ---- 22：卡死弟子加強脫困（牆壁／門縫／互相卡住）----
    TUNE.xn=TUNE.xn||{};
    TUNE.xn.unstuck={tick:1.2,stuckN:4,rad:1.6};
    const XUS={n:0,last:0};
    function xusNudge(u){
      if(!u||u.dead||u.inside||u.kind==='player')return false;
      if(S.dg||S.interior)return false;
      const i=Math.floor(u.x),j=Math.floor(u.y);
      // 找最近可走格
      let best=null,bd=1e9;
      for(let dj=-2;dj<=2;dj++)for(let di=-2;di<=2;di++){
        if(!di&&!dj)continue;
        const ni=i+di,nj=j+dj;if(!inMap(ni,nj))continue;
        if(block[nj*N+ni])continue;
        if(typeof unitComp==='function'&&comp&&comp[j*N+i]>=0&&comp[nj*N+ni]!==comp[j*N+i])continue;
        const d=Math.hypot(di,dj);if(d<bd){bd=d;best={x:ni+0.5,y:nj+0.5};}
      }
      if(!best)return false;
      u.x=best.x;u.y=best.y;u.vx=u.vy=0;u.dvx=u.dvy=0;
      u.stuck=0;u.stk=0;u.needRepath=true;u.path=[];
      if(u.task&&(u.task.type==='move'||u.task.type==='gather'||u.task.type==='build'||u.task.type==='repair')){
        try{const tx=u.task.x,ty=u.task.y;if(tx!=null&&ty!=null)pathTo(u,tx,ty);}catch(e){}
      }
      XUS.n++;return true;
    }
    function xusTick(){
      try{
        if(!S||!S.units)return;
        if(S.time-XUS.last<(TUNE.xn.unstuck.tick||1.2))return;
        XUS.last=S.time;
        for(const u of S.units){
          if(!u||u.dead||u.inside)continue;
          if(u.kind!=='disciple'&&u.kind!=='player')continue;
          if((u.stuck|0)>=(TUNE.xn.unstuck.stuckN||4)){
            if(xusNudge(u)){try{floater(u.x,u.y-0.3,'脫困','#a0d0ff');}catch(e){}}
          }else if(u.path&&u.path.length&&(u.stuck|0)>=2&&u.task){
            // 中度卡住：重算路徑
            const last=u.path[u.path.length-1];
            if(last){u.path=[];u.needRepath=true;try{pathTo(u,last.x,last.y);}catch(e){}u.stuck=0;}
          }
        }
      }catch(e){}
    }
    try{if(typeof tickV045==='function'){const _tk=tickV045;tickV045=function(dt){const r=_tk.apply(this,arguments);try{xusTick();}catch(e){}return r;};}
      else if(typeof update==='function'){const _u=update;update=function(dt){const r=_u.apply(this,arguments);try{xusTick();}catch(e){}return r;};}
    }catch(e){}
    setTimeout(function(){try{if(window.XW&&XW.xn)XW.xn.unstuck={st:()=>({n:XUS.n,last:XUS.last})};}catch(e){}},0);

    // ---- 24：頭頂條固定間距疊放 氣血→靈氣→護體→修為 ----
    {const _dh=drawHuman;drawHuman=function(u){
      // 先算好 HB48 位置再畫，避免氣血／修為重疊
      try{
        if(u&&!u.dead){
          const sh=!!(u.gqMax>0),qi=!!(u.qiMax>0&&(u.kind==='player'||u.kind==='disciple'));
          const art=typeof ART!=='undefined'&&ART.s&&ART.s!=='0';
          const b0=art?-2:0;
          const gap=3.6;
          let y=-34+b0; // 修為基準
          HB48.xiu=y;
          if(sh){y-=gap;HB48.g=y;}
          if(qi){y-=gap;HB48.q=y;}
          y-=gap;HB48.hp=y;
          HB48.on=true;HB48.u=u;
        }
      }catch(e){}
      // temporarily patch xiu y via wrapping the fixed -34 draw inside _dh by shifting after
      const r=_dh.apply(this,arguments);
      try{
        if(u&&HB48.on&&HB48.u===u&&!capped(u)&&u.xiu>0){
          // redraw xiu at HB48.xiu if base used hardcoded -34 (overwrite)
          const show=u.kind==='player'||selUnits.includes(u.id)||u.hp<u.maxhp;
          if(show){
            const b=P(u.x,u.y);
            // clear old -34 smear by redrawing background bar at HB48.xiu
            ctx.fillStyle='rgba(0,0,0,0.6)';ctx.fillRect(b.x-13,b.y+HB48.xiu,26,2);
            ctx.fillStyle='#9fe0ff';ctx.fillRect(b.x-13,b.y+HB48.xiu,26*Math.min(1,u.xiu/needXiu(u)),2);
          }
        }
      }catch(e){}
      return r;
    };}

    // ---- 13：手動攻擊牽繩吃 TUNE；遠距命中再放大 ----
    try{
      TUNE.xn=TUNE.xn||{};if(TUNE.xn.atkLeashMan==null)TUNE.xn.atkLeashMan=80;if(TUNE.xn.atkLeashAuto==null)TUNE.xn.atkLeashAuto=18;
      // wrap doTask attack leash if still hardcoded
      if(typeof doTask==='function'&&!doTask._farAtk){
        const src=Function.prototype.toString.call(doTask);
        // softer: monkey patch via setTask path already man; ensure updateUnit attack uses TUNE
      }
      // g4 uses t.man?80:18 — also expose via TUNE by wrapping fight follow
      if(typeof updateUnit==='function'&&!updateUnit._farLeash){
        const _uu=updateUnit;
        updateUnit=function(u,dt){
          try{
            if(u&&u.task&&u.task.type==='attack'){
              const e=typeof enemyById==='function'?enemyById(u.task.eid):null;
              const leash=u.task.man?(TUNE.xn.atkLeashMan||80):(TUNE.xn.atkLeashAuto||18);
              if(e&&!e.dead&&dist(u.x,u.y,e.x,e.y)>leash){
                // only clear auto; man keeps chasing until leash
                if(!u.task.man){u.task=u.prevTask||null;u.prevTask=null;u.path=[];}
              }
            }
          }catch(e){}
          return _uu.apply(this,arguments);
        };
        updateUnit._farLeash=1;
      }
    }catch(e){}

    // ---- 20：事件角標避開小地圖（右上）----
    function xevbPark(){
      try{
        const b=document.getElementById('xevb');if(!b)return;
        const mm=document.getElementById('minimap');
        const W=innerWidth,H=innerHeight;
        let top=48,right=10;
        if(mm){
          const cs=getComputedStyle(mm);
          if(cs.display!=='none'&&cs.visibility!=='hidden'){
            const r=mm.getBoundingClientRect();
            // if minimap is top-right, park badge below it (or to its left)
            if(r.width>1&&r.right>W*0.55&&r.top<H*0.4){
              top=Math.max(top,Math.round(r.bottom+6));
              right=Math.max(10,Math.round(W-r.right));
            }
          }
        }
        // also clear banners
        const ban=document.getElementById('v47ban');
        if(ban&&ban.children&&ban.children.length){
          const br=ban.getBoundingClientRect();
          if(br.width>1&&br.top<top+40)top=Math.max(top,Math.round(br.bottom+4));
        }
        b.style.top=top+'px';
        b.style.right=right+'px';
        b.style.left='auto';
        b.style.bottom='auto';
      }catch(e){}
    }
    setInterval(xevbPark,700);
    try{addEventListener('resize',()=>setTimeout(xevbPark,40));}catch(e){}
    setTimeout(xevbPark,0);

    // ---- 18：礦場範圍圈（選取礦場／建造幽靈時）----
    try{
      if(typeof drawV045World==='function'&&!drawV045World._mineRing){
        const _dr=drawV045World;
        drawV045World=function(){
          const r=_dr.apply(this,arguments);
          try{
            if(!xwRangeMapVisible()||typeof xMineList!=='function')return r;
            const M=xMineList();
            if(!M||!M.length)return r;
            const show=!!(selBuilding&&(()=>{try{const b=bById(selBuilding);return b&&b.type==='kuangchang';}catch(e){return false;}})())
              ||(buildMode==='kuangchang');
            // always faint on minimap already; world: show when selected or placing
            if(show){
              for(const c of M){
                try{
                  // ring helper from earlier patch if present
                  if(typeof ring==='function')ring(c.x,c.y,c.R,'rgba(210,180,100,0.95)','rgba(210,180,100,0.18)');
                  else{
                    ctx.save();ctx.strokeStyle='rgba(210,180,100,0.9)';ctx.lineWidth=1.5;
                    const segments=40;ctx.beginPath();for(let k=0;k<=segments;k++){const a=k/segments*Math.PI*2,p=P(c.x+Math.cos(a)*c.R,c.y+Math.sin(a)*c.R);k?ctx.lineTo(p.x,p.y):ctx.moveTo(p.x,p.y);}ctx.stroke();ctx.restore();
                  }
                }catch(e){}
              }
            }
          }catch(e){}
          return r;
        };
        drawV045World._mineRing=1;
      }
    }catch(e){}

    try{if(window.XW){XW.packQ={ranks:()=>ensureRankFlags,unstuck:()=>XUS};}}catch(e){}
  }catch(e){console.warn('PACK_Q',e);}
})();


// ======================= BATCH2100_HOLD_ORDER (t1074u) =======================
// 玩家直接下令（右鍵攻擊／移動／集合）期間：禁止一切自動逃跑覆寫命令。
// 含：v46Retreat 低血撤退、XND 採集回防逃、XCO 避戰／自訂撤退%、cult_ai_combat 判斷撤退、cultRetreat。
// xnFear 境界威壓仍只減速／降攻速（cap 50%），不觸發逃跑。命令結束或取消後才恢復自動逃。
(function(){
  try{
    function xPlayerOrder(u){
      if(!u||u.dead)return false;
      try{if(u.xcmd&&S.time<u.xcmd.until)return true;}catch(e){}
      try{if(typeof xmvOn==='function'&&xmvOn(u))return true;}catch(e){}
      try{if(u.task&&u.task.man)return true;}catch(e){}
      // 明確手動攻擊／手動移動（man 或 xcmd 剛下的 move）
      try{if(u.task&&u.task.type==='attack'&&u.task.man)return true;}catch(e){}
      return false;
    }
    function xHoldClearFlee(u){
      if(!u)return;
      try{if(u.retreat){u.retreat=null;u.medit=false;}}catch(e){}
      try{if(u.xnd&&u.xnd.st==='flee'){u.xnd=null;}}catch(e){}
      try{u.cultRetreat=null;}catch(e){}
      try{if(u.thought==='💦')u.thought=null;}catch(e){}
    }
    window.xPlayerOrder=xPlayerOrder;

    // 1) v46Retreat：有玩家命令就拒絕
    try{if(typeof v46Retreat==='function'){
      const _r=v46Retreat;
      v46Retreat=function(u){
        try{if(xPlayerOrder(u))return false;}catch(e){}
        return _r.apply(this,arguments);
      };
    }}catch(e){}

    // B-03：commandMove（玩家右鍵／點地面／隊伍指令）執行期間的深度計數，供下方 setTask 守衛辨認「這是玩家移動令」
    let xMvCmdDepth=0;
    // 2) setTask：手動攻擊／移動時清逃跑態，並標記 man
    try{if(typeof setTask==='function'){
      const _st=setTask;
      setTask=function(u,t){
        try{
          // 只在「已標 man」的玩家命令上延長 hold／清逃；勿因僅被選取就強制 man（否則 AI 接戰會永遠 hold）
          if(u&&u.kind==='disciple'&&t&&t.man){
            if(t.type==='attack'){
              xHoldClearFlee(u);
              u.xcmd={kind:'atk',t0:S.time,until:S.time+(TUNE.xn&&TUNE.xn.mvMax||12)};
            }else if(t.type==='move'){
              xHoldClearFlee(u);
            }
          }
        }catch(e){}
        return _st.apply(this,arguments);
      };
    }}catch(e){}

    // 3) commandMove 已清 retreat；再保險清 xnd flee / cultRetreat
    try{if(typeof commandMove==='function'){
      const _cm=commandMove;
      commandMove=function(us){
        const r=_cm.apply(this,arguments);
        try{for(const u of us||[])if(u&&u.kind==='disciple')xHoldClearFlee(u);}catch(e){}
        return r;
      };
    }}catch(e){}

    try{if(typeof commandMove==='function'){
      const _cmB03=commandMove;
      commandMove=function(){xMvCmdDepth++;try{return _cmB03.apply(this,arguments);}finally{xMvCmdDepth--;}};
    }}catch(e){}

    // 4) XND 採集回防逃：玩家命令中不逃、不改寫手動攻擊
    try{if(typeof updateDisciple==='function'){
      const _ud=updateDisciple;
      updateDisciple=function(u,dt){
        try{
          if(u&&xPlayerOrder(u)){
            // 卡住的 flee 態清掉，保留手動攻擊
            if(u.xnd&&u.xnd.st==='flee')u.xnd=null;
            if(u.retreat){u.retreat=null;u.medit=false;}
            if(u.cultRetreat)u.cultRetreat=null;
            // 暫存 job 讓內層 XND 區塊以為不是 gather？更穩：標記跳過
            u._xHold=1;
          }else if(u)u._xHold=0;
        }catch(e){}
        return _ud.apply(this,arguments);
      };
    }}catch(e){}
    // 包一層更早的 updateDisciple 守衛：在 XND 邏輯前（XND 已包過，我們再包外層）
    // 直接改寫 XND 觸發：攔截 setTask(move) 當來源是 flee
    try{if(typeof setTask==='function'){
      const _st2=setTask;
      setTask=function(u,t){
        try{
          // B-03（11/7 重開）：玩家／指令移動（經 commandMove 或帶 man）一律優先，不被「手動攻擊」擋下；只擋 AI 逃跑的 move
          if(t&&t.type==='move'&&(xMvCmdDepth>0||t.man))return _st2.apply(this,arguments);
          if(u&&u._xHold&&t&&t.type==='move'&&u.task&&u.task.type==='attack'&&u.task.man){
            // 拒絕用 flee move 蓋掉手動攻擊
            return;
          }
          if(u&&xPlayerOrder(u)&&t&&t.type==='move'&&u.task&&u.task.man&&u.task.type==='attack'){
            return;
          }
        }catch(e){}
        return _st2.apply(this,arguments);
      };
    }}catch(e){}

    // 5) XCO 避戰／自訂撤退%：有玩家命令不撤退
    try{if(typeof updateUnit==='function'){
      const _uu=updateUnit;
      updateUnit=function(u,dt){
        try{
          if(u&&xPlayerOrder(u)){
            if(u.retreat){u.retreat=null;u.medit=false;}
            // 短暫壓低 xco 自訂撤退觸發
            u._xcoT=S.time+9;
          }
        }catch(e){}
        return _uu.apply(this,arguments);
      };
    }}catch(e){}

    // 6) cult_ai_combat 撤退
    try{
      function wrapCult(){
        if(!window.CultAICombat||CultAICombat._hold)return false;
        const _rt=CultAICombat.retreat;
        if(typeof _rt==='function'){
          CultAICombat.retreat=function(u,e){
            try{if(xPlayerOrder(u))return false;}catch(er){}
            return _rt.apply(this,arguments);
          };
        }
        // also wrap cj path via updateDisciple already installed — patch judge tick
        CultAICombat._hold=1;
        return true;
      }
      if(!wrapCult())setTimeout(function retry(){if(!wrapCult())setTimeout(retry,300);},0);
    }catch(e){}

    // 7) v46Tick 低血撤退入口：包 tick 前清／跳過 — 靠 v46Retreat 已擋；再擋「已在 retreat 時被命令」強制拉回
    try{if(typeof tickV045==='function'){
      const _tk=tickV045;
      tickV045=function(dt){
        const r=_tk.apply(this,arguments);
        try{
          for(const u of S.units||[]){
            if(!u||u.kind!=='disciple'||u.dead)continue;
            if(xPlayerOrder(u)&&u.retreat){
              // 玩家命令中被標撤退 → 立刻取消並維持攻擊／移動
              const keep=u.task;
              u.retreat=null;u.medit=false;
              if(keep&&keep.type==='attack'&&keep.man){u.task=keep;}
            }
          }
        }catch(e){}
        return r;
      };
    }}catch(e){}

    // 8) XND 受傷攻擊改逃：外層在 updateDisciple 開頭若有 man 攻擊，禁止寫 xnd flee
    // （XND 在內層已跑；用 Mutation：監控 xnd 被設成 flee）
    try{if(typeof update==='function'){
      const _up=update;
      update=function(dt){
        const r=_up.apply(this,arguments);
        try{
          for(const u of S.units||[]){
            if(!u||!xPlayerOrder(u))continue;
            if(u.xnd&&u.xnd.st==='flee'){
              u.xnd=null;
              // 若 task 被改成逃往大殿的 move，拉回攻擊
              if(u.task&&u.task.type==='move'&&u.xcmd&&u.xcmd.kind==='atk'){
                // can't restore eid easily — leave move only if no man attack
              }
            }
            if(u.cultRetreat){
              u.cultRetreat=null;
              if(u.task&&u.task.type==='move'&&u.xcmd&&u.xcmd.kind==='atk'){
                // keep fighting if we still have last target
                if(u._holdEid){u.task={type:'attack',eid:u._holdEid,man:1};u.path=[];}
              }
            }
            if(u.task&&u.task.type==='attack'&&u.task.man)u._holdEid=u.task.eid;
          }
        }catch(e){}
        return r;
      };
    }}catch(e){}

    try{
      function _holdBind(){try{if(window.XW){XW.holdOrder={on:u=>xPlayerOrder(u),clear:u=>xHoldClearFlee(u)};return true;}}catch(e){}return false;}
      if(!_holdBind())setTimeout(function r(){if(!_holdBind())setTimeout(r,200);},0);
    }catch(e){}
  }catch(e){console.warn('HOLD_ORDER',e);}
})();
