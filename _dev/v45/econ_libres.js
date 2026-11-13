// ================== 仙武經濟：長書閣駐閣研究（econ_libres.js，2026-11-10）==================
// 一名弟子駐守長書閣，閣裡空著就自動接著研究（先研丹方，沒有可研的丹方就整理武學秘籍；可在面板改成只研其中一種）。
// 速度＝玩家親自研究的速度（長書閣等級倍率 1+0.25×(Lv−1)）× 弟子能力倍率 econLibresMul(u)：
//   mul = clamp(0.8 + 悟性/250 + 0.04×境界序, 0.8, 1.5)（悟性 50、煉氣(4) ≈ 1.16；悟性 0、凡人 = 0.8）。
// 弟子須在閣內（u.inside && u.inB===閣）才有進度；材料照舊從宗門資源扣（與玩家相同成本）。
// 酬勞：駐閣弟子每完成 5 次研究，庫房付該弟子一次酬勞＝「目前單次研究成本」的材料總數折下品靈石（第 1–4 次免費）。
//   庫房不夠：研究暫停、提示「庫房不足，研究暫停」，庫房絕不扣成負數；庫房夠了自動補付並繼續。
// 玩家仍可親自研究（原按鈕不變）；駐閣弟子只在閣空著時接手。
// 排除：已死、帶傷（inj.k／cultWound／cultComa／cultZouhuo）、突破中（cultBrk）、氣血 <30%。
// 駐閣中若出現上述狀況、或被改派（job 不再是 study）、離開宗門 → 自動撤駐，手上那項研究改回一般研究（原速度、無人也會走）。
// 存檔：S.econ.libres={uid,bid,n,fees,feeXia,owe,mode,paused}；研究中的項目在 b.research.lr（＝弟子 id）。
// 旗標 libRes：預設開（隊長決定）；?libres=0 或 S.econ.flags.libRes=false 關閉。聯機客端不跑（主機權威）。
// 只用包裝：updateSect（最外層，只包一次）、renderInPanel（在長書閣室內附加 #econLibresBox）。不改任何 g*.js。
var ECON_LIBRES_DEFAULT=true;
var ECON_LIBRES_TUNE={every:5,feeMul:1,mulBase:0.8,mulWu:1/250,mulRealm:0.04,mulMin:0.8,mulMax:1.5,hpMin:0.3};
var ECON_LIBRES_WRAPPED={};
var ECON_LIBRES_RT={t:0,warn:{},panelKey:null};
function econLibresOn(){
  try{if(typeof window!=='undefined'&&window.ECON_LIBRES_FORCE!=null)return !!window.ECON_LIBRES_FORCE;}catch(e){}
  try{if(typeof location!=='undefined'){const m=/[?&]libres=([01])\b/.exec(location.search);if(m)return m[1]==='1';}}catch(e){}
  try{const f=S&&S.econ&&S.econ.flags;if(f&&f.libRes!=null)return !!f.libRes;}catch(e){}
  return ECON_LIBRES_DEFAULT;
}
function econLibresClient(){try{return typeof NET!=='undefined'&&NET&&NET.role==='client';}catch(e){return false;}}
function econLibresState(){
  if(typeof S==='undefined'||!S)return null;
  const host=S.econ||(S.flags=S.flags||{});
  let L=host.libres;
  if(!L||typeof L!=='object'){L=host.libres={uid:null,bid:null,n:0,fees:0,feeXia:0,owe:0,mode:'auto',paused:null};}
  if(!(L.n>=0))L.n=0;if(!(L.fees>=0))L.fees=0;if(!(L.feeXia>=0))L.feeXia=0;if(!(L.owe>=0))L.owe=0;
  if(['auto','rec','miji'].indexOf(L.mode)<0)L.mode='auto';
  return L;
}
function econLibresLib(bid){
  try{
    if(bid!=null){const b=bById(bid);if(b&&b.type==='library')return b;}
    return (S.buildings||[]).find(b=>b&&b.type==='library'&&b.built)||null;
  }catch(e){return null;}
}
function econLibresUnit(){const L=econLibresState();if(!L||L.uid==null)return null;try{return unitById(L.uid)||null;}catch(e){return null;}}
function econLrAXk(u){try{if(typeof rbAXk==='function'){const k=+rbAXk(u);if(k>0&&isFinite(k))return k;}}catch(e){}return 1;}   // 悟性換回舊 0～100 口徑
function econLibresMul(u){
  const T=ECON_LIBRES_TUNE;if(!u)return 1;
  const m=T.mulBase+(+u.wu||0)*econLrAXk(u)*T.mulWu+(u.realm|0)*T.mulRealm;
  return Math.round(Math.max(T.mulMin,Math.min(T.mulMax,m))*100)/100;
}
function econLibresBusy(u){
  if(!u||u.dead)return 'dead';
  if(u.kind!=='disciple')return 'kind';
  if(u.cultBrk)return 'break';
  if(u.inj&&u.inj.k)return 'inj';
  if(u.cultWound||u.cultComa||u.cultZouhuo)return 'wound';
  try{if(u.maxhp&&u.hp<u.maxhp*ECON_LIBRES_TUNE.hpMin)return 'hp';}catch(e){}
  return false;
}
var ECON_LIBRES_WHY={dead:'已身故',kind:'非弟子',break:'正在突破',inj:'帶傷',wound:'重創／走火／昏迷',hp:'氣血過低',gone:'已離開宗門',job:'被改派他務',lib:'長書閣不在了'};
function econLibresCost(kind){
  try{return kind==='rec'?RREC_COST:RESEARCH_COST;}catch(e){return {};}
}
function econLibresNextKind(){
  const L=econLibresState();const m=L?L.mode:'auto';
  let recOk=false;
  try{recOk=(typeof pillNextRec==='function')?!!pillNextRec():(typeof RREC_ORDER!=='undefined'&&RREC_ORDER.some(k=>!(S.recipes&&S.recipes[k])));}catch(e){}
  if(m==='rec')return recOk?'rec':null;
  if(m==='miji')return 'miji';
  return recOk?'rec':'miji';
}
// 「目前單次研究成本」：下一項（或正在研究的那項）材料總數 × feeMul，折下品靈石
function econLibresFeeXia(kind){
  const b=econLibresLib(econLibresState()&&econLibresState().bid);
  if(!kind)kind=(b&&b.research)?(b.research.k==='rec'?'rec':'miji'):(econLibresNextKind()||'miji');
  const c=econLibresCost(kind);let n=0;for(const k in c)n+=(+c[k]||0);
  return Math.max(0,Math.round(n*ECON_LIBRES_TUNE.feeMul));
}
function econLibresVaultXia(){
  try{if(S.econ&&S.econ.vault&&typeof econBagXia==='function'&&typeof econFlag==='function'&&econFlag('treasury'))return econBagXia(S.econ.vault);}catch(e){}
  try{const X=typeof econXws==='function'?econXws():null;if(X)return +X.get('lingshi')||0;}catch(e){}
  return Math.max(0,Math.floor(+((S.res&&S.res.lingshi)||0)));
}
function econLibresPayFee(u,xia){
  if(!(xia>0))return {ok:true,paid:0};
  if(econLibresVaultXia()<xia)return {ok:false,reason:'insufficient'};
  let r=null;
  try{if(typeof econCharge==='function')r=econCharge('vault',{xia:xia},'libres-fee');}catch(e){r=null;}
  if(!r||(!r.ok&&r.reason!=='insufficient')){
    // 金庫旗標關：退回舊資源 S.res.lingshi
    const have=Math.floor(+S.res.lingshi||0);if(have<xia)return {ok:false,reason:'insufficient'};
    {const X=typeof econXws==='function'?econXws():null; if(!(X&&X.take('lingshi',xia,'libres-fee').ok))S.res.lingshi=have-xia;}r={ok:true,paid:xia,legacy:true};
    try{u.lingshi=(u.lingshi||0)+xia;}catch(e){}
    return r;
  }
  if(!r.ok)return r;
  try{if(typeof econGrant==='function')econGrant(u,xia,'libres-fee','xia');}catch(e){}
  try{if(typeof econMirrorUnitWallet==='function')econMirrorUnitWallet(u);}catch(e){}
  return {ok:true,paid:xia};
}
function econLibresHint(key,msg,gap){
  const W=ECON_LIBRES_RT.warn,t=(S&&S.time)||0;
  if(W[key]!=null&&t-W[key]<(gap||45))return;W[key]=t;
  try{toast(msg);}catch(e){}
}
// 駐閣期間套用手令鎖，避免長老 AI／自動派工在玩家離開室內後把 job 清掉（先前 8b 失敗原因）
function econLibresMan(){try{return (typeof XW_ECON!=='undefined'&&XW_ECON)||(typeof window!=='undefined'&&window.XW_ECON)||null;}catch(e){return null;}}
function econLibresLock(u){
  if(!u)return;
  const A=econLibresMan();
  try{if(A&&typeof A.manualLock==='function'){A.manualLock(u,'study','study');return;}}catch(e){}
  try{const t=(S&&S.time)||0;u.manualUntil=t+300;u.manualKind='study';u.manualJob='study';u.manualSnap={jobRes:null,jobB:u.jobB||null,guardAt:null,holdAt:null};}catch(e){}
}
function econLibresClearLock(u){
  if(!u)return;
  const A=econLibresMan();
  try{if(A&&typeof A.manualClear==='function'){A.manualClear(u);return;}}catch(e){}
  try{u.manualUntil=null;u.manualJob=undefined;u.manualKind=null;u.manualSnap=null;}catch(e2){}
}
function econLibresKeepLock(u){
  if(!u)return;
  const A=econLibresMan();
  try{
    if(A&&typeof A.manualLocked==='function'&&A.manualLocked(u)&&u.manualJob==='study'){
      if(u.manualUntil!=null&&S.time+120>u.manualUntil)econLibresLock(u);
      return;
    }
  }catch(e){}
  econLibresLock(u);
}
function econLibresReassign(u,b){
  if(!u||!b)return false;
  let ok=false;try{ok=assignJob(u,'study',{bid:b.id});}catch(e){ok=false;}
  if(u.job!=='study'){try{u.job='study';}catch(e){}}
  if(u.jobB!==b.id){try{u.jobB=b.id;}catch(e){}}
  econLibresLock(u);
  return u.job==='study';
}
function econLibresStation(u,b){
  if(!econLibresOn())return {ok:false,reason:'flag-off'};
  b=b||econLibresLib();if(!b||!b.built||b.broken)return {ok:false,reason:'no-lib'};
  if(!u)return {ok:false,reason:'no-unit'};
  const busy=econLibresBusy(u);if(busy)return {ok:false,reason:busy};
  const L=econLibresState();
  if(L.uid!=null&&L.uid!==u.id)econLibresUnstation('swap',true);
  if(!econLibresReassign(u,b))return {ok:false,reason:'assign'};
  L.uid=u.id;L.bid=b.id;L.paused=null;
  try{toast((u.name||'弟子')+' 駐守長書閣，閣中空著時自動研究（速度 ×'+econLibresMul(u)+'）');}catch(e){}
  ECON_LIBRES_RT.panelKey=null;
  return {ok:true};
}
function econLibresUnstation(why,quiet){
  const L=econLibresState();if(!L||L.uid==null)return false;
  const u=econLibresUnit(),b=econLibresLib(L.bid);
  if(b&&b.research&&b.research.lr!=null){delete b.research.lr;}
  if(u&&!u.dead&&why==='player'){try{u.job=null;u.jobB=null;if(typeof setTask==='function')setTask(u,null);econLibresClearLock(u);}catch(e){}}
  const nm=(u&&u.name)||'駐閣弟子';
  try{L.last={why:why||null,uid:L.uid,t:Math.round(((S&&S.time)||0)*10)/10,job:u?u.job:null,jobB:u?u.jobB:null};}catch(e){}
  L.uid=null;L.paused=null;ECON_LIBRES_RT.panelKey=null;
  if(!quiet){try{toast(nm+' 撤離長書閣'+(why&&why!=='player'&&ECON_LIBRES_WHY[why]?'（'+ECON_LIBRES_WHY[why]+'）':''));}catch(e){}}
  return true;
}
function econLibresPresent(u,b){return !!(u&&b&&u.inside&&u.inB===b.id&&!u.dead);}
function econLibresFinish(b,r,u){
  b.research=null;
  const nm=(u&&u.name)||'駐閣弟子';
  if(r.k==='rec'){try{learnRecipe(null,'長書閣・'+nm);}catch(e){}}
  else{{const X=typeof econXws==='function'?econXws():null; if(!(X&&X.add('item:miji',1,'libres').ok))S.items.miji=(S.items.miji||0)+1;}try{toast('長書閣整理出一部「武學秘籍」！（'+nm+' 駐閣研究）');}catch(e){}}
  const L=econLibresState();L.n++;
  try{S.stats.libres=(S.stats.libres||0)+1;}catch(e){}
  if(L.n%ECON_LIBRES_TUNE.every===0){
    const fee=econLibresFeeXia(r.k==='rec'?'rec':'miji');
    const p=econLibresPayFee(u,fee);
    if(p.ok){L.fees++;L.feeXia+=fee;try{toast('庫房支付 '+nm+' 駐閣研究酬勞 '+fee+' 下品靈石（第 '+L.n+' 次）');}catch(e){}}
    else{L.owe=fee;L.paused='vault';econLibresHint('vault','庫房不足，研究暫停（需付 '+nm+' 駐閣酬勞 '+fee+' 下品靈石）',1);}
  }
  ECON_LIBRES_RT.panelKey=null;
}
function econLibresAdvance(b,r,dt,u){
  if(!b.built||b.broken)return;
  if(!econLibresPresent(u,b))return;
  const rate=1+0.25*(((typeof blv==='function')?blv(b):(b.lv||1))-1);
  r.t+=dt*rate*econLibresMul(u);
  const T=r.T||(typeof RESEARCH_TIME!=='undefined'?RESEARCH_TIME:45);
  if(r.t>=T)econLibresFinish(b,r,u);
}
function econLibresTryStart(b,u){
  const L=econLibresState();
  if(b.research||!b.built||b.broken)return false;
  if(!econLibresPresent(u,b)){L.paused='away';return false;}
  if(L.owe>0){
    const p=econLibresPayFee(u,L.owe);
    if(!p.ok){L.paused='vault';econLibresHint('vault','庫房不足，研究暫停',60);return false;}
    L.fees++;L.feeXia+=L.owe;try{toast('庫房補付 '+(u.name||'弟子')+' 駐閣研究酬勞 '+L.owe+' 下品靈石，研究繼續');}catch(e){}L.owe=0;
  }
  const k=econLibresNextKind();
  if(!k){L.paused='none';return false;}
  const cost=econLibresCost(k);
  if(!(typeof canAfford==='function'&&canAfford(cost))){L.paused='mat';econLibresHint('mat','長書閣材料不足（'+(typeof costStr==='function'?costStr(cost):'')+'），駐閣研究暫停',60);return false;}
  const _t=toast;let ok=false;
  try{toast=function(m){if(/^長書閣開始/.test(String(m)))return;return _t.apply(this,arguments);};
    ok=k==='rec'?startRecResearch(b):startResearch(b);}catch(e){ok=false;}finally{toast=_t;}
  if(ok&&b.research){b.research.lr=u.id;L.paused=null;ECON_LIBRES_RT.panelKey=null;return true;}
  return false;
}
function econLibresCheck(){
  const L=econLibresState();if(!L||L.uid==null)return null;
  const u=econLibresUnit();
  if(!u){econLibresUnstation('gone');return null;}
  const busy=econLibresBusy(u);if(busy){econLibresUnstation(busy);return null;}
  const b=econLibresLib(L.bid);
  if(!b||b.type!=='library'){econLibresUnstation('lib');return null;}
  if(u.jobB!=null&&u.jobB!==b.id){econLibresUnstation('job');return null;}
  if(u.job&&u.job!=='study'){econLibresUnstation('job');return null;}
  // job 被清空（例如室內離開後 AI 洗掉、或讀檔後職務遺失）不算改派，依存檔 uid 重新派駐
  if(u.job!=='study'||u.jobB==null){if(!econLibresReassign(u,b)){econLibresUnstation('assign');return null;}}
  econLibresKeepLock(u);
  return {u,b};
}
function econLibresTick(dt){
  if(!econLibresOn()||econLibresClient())return;
  const RT=ECON_LIBRES_RT;RT.t+=dt;if(RT.t<0.5)return;RT.t=0;
  const c=econLibresCheck();if(!c)return;
  if(!c.b.research)econLibresTryStart(c.b,c.u);
  else if(c.b.research.lr==null){const L=econLibresState();L.paused='player';}
}
function econLibresStatus(){
  const L=econLibresState();if(!L)return null;
  const u=econLibresUnit(),b=econLibresLib(L.bid);const r=b&&b.research;
  const every=ECON_LIBRES_TUNE.every;
  return {on:econLibresOn(),uid:L.uid,name:u&&u.name,mul:u?econLibresMul(u):null,present:econLibresPresent(u,b),bid:b&&b.id,
    research:r?{k:r.k==='rec'?'rec':'miji',t:+(+r.t).toFixed(2),T:r.T||(typeof RESEARCH_TIME!=='undefined'?RESEARCH_TIME:45),lr:r.lr!=null?r.lr:null}:null,
    n:L.n,fees:L.fees,feeXia:L.feeXia,owe:L.owe,paused:L.paused,mode:L.mode,nextFeeAt:(Math.floor(L.n/every)+1)*every,feeNow:econLibresFeeXia(),vault:econLibresVaultXia()};
}
// ---- 室內面板（長書閣）----
function econLibresCands(b){
  const L=econLibresState();
  try{return disciples().filter(u=>!u.dead&&u.id!==(L&&L.uid)&&!econLibresBusy(u)).sort((a,c)=>econLibresMul(c)-econLibresMul(a)||(c.realm-a.realm)).slice(0,8);}catch(e){return [];}
}
function econLibresEsc(s){return String(s==null?'':s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));}
function econLibresPanelHtml(b){
  if(!econLibresOn())return '';
  b=b||econLibresLib();if(!b)return '';
  const s=econLibresStatus();const every=ECON_LIBRES_TUNE.every;
  const PZ={vault:'⛔ 庫房不足，研究暫停（待付 '+s.owe+' 下品靈石）',mat:'⚠ 材料不足，研究暫停',away:'前往長書閣中…',none:'沒有可研究的項目',player:'宗主正在親自研究，等候中'};
  let st='';
  if(s.uid==null)st='尚無弟子駐閣';
  else if(s.research&&s.research.lr!=null)st='研究'+(s.research.k==='rec'?'丹方':'秘籍')+' '+Math.floor(s.research.t/s.research.T*100)+'%'+(s.present?'':'（弟子不在閣內，暫停）');
  else st=PZ[s.paused]||'待命';
  let h='<div class="sec"><b>駐閣研究</b> <span class="dim sm">（每 '+every+' 次由庫房付一次酬勞，第 1–'+(every-1)+' 次免費）</span></div>';
  if(s.uid!=null){
    h+='<div class="irow" data-libres-row="cur"><span class="nm">'+econLibresEsc(s.name)+'</span><span class="dim">速度 ×'+s.mul+'</span><button class="btn" data-libres="unstation">撤回</button></div>';
  }
  h+='<div class="dim sm" id="econLibresSt">'+econLibresEsc(st)+'</div>';
  h+='<div class="dim sm">已完成 '+s.n+' 次・已付酬勞 '+s.fees+' 次（共 '+s.feeXia+'）・下次付酬於第 '+s.nextFeeAt+' 次，約 '+s.feeNow+' 下品靈石・庫房 '+s.vault+'</div>';
  h+='<div class="ibtns">'+[['auto','自動'],['rec','只研丹方'],['miji','只研秘籍']].map(m=>'<button class="btn '+(s.mode===m[0]?'on':'')+'" data-libres="mode" data-mode="'+m[0]+'">'+m[1]+'</button>').join('')+'</div>';
  const cs=econLibresCands(b);
  if(cs.length){h+='<div class="dim sm">選一名弟子駐閣：</div>'+cs.map(u=>'<div class="irow"><span class="nm">'+econLibresEsc(u.name)+'</span><span class="dim">'+((typeof REALMS!=='undefined'&&REALMS[u.realm])?REALMS[u.realm].n:'')+'・悟性 '+(u.wu|0)+'・×'+econLibresMul(u)+'</span><button class="btn" data-libres="station" data-u="'+u.id+'">駐閣</button></div>').join('');}
  else h+='<div class="dim sm">沒有可駐閣的弟子（帶傷／突破中者不可）</div>';
  return h;
}
// 給 g9 renderInPanel 或其他面板呼叫：在 el（預設 #inpanel）裡建立／更新 #econLibresBox；不是長書閣就移除
function econLibresPanelEntry(b,el){
  try{
    if(typeof document==='undefined')return false;
    el=el||document.getElementById('inpanel');if(!el)return false;
    let box=el.querySelector('#econLibresBox');
    if(!b){const I=S.interior;b=I?bById(I.bid):null;}
    if(!b||b.type!=='library'||!econLibresOn()){if(box)box.remove();return false;}
    const html=econLibresPanelHtml(b);
    if(!box){box=document.createElement('div');box.id='econLibresBox';box.style.cssText='margin-top:4px;border-top:1px solid rgba(255,255,255,.12);padding-top:4px';const ib=el.querySelector('.ib');(ib||el).appendChild(box);ECON_LIBRES_RT.panelKey=null;}
    if(ECON_LIBRES_RT.panelKey!==html){
      if(typeof uiHold!=='undefined'&&uiHold&&box.innerHTML)return true;
      box.innerHTML=html;ECON_LIBRES_RT.panelKey=html;
    }
    return true;
  }catch(e){return false;}
}
function econLibresClick(ev){
  const t=ev.target&&ev.target.closest&&ev.target.closest('[data-libres]');if(!t)return;
  ev.stopPropagation();ev.preventDefault();
  const a=t.getAttribute('data-libres');const L=econLibresState();
  if(a==='station'){const u=unitById(+t.getAttribute('data-u'));const r=econLibresStation(u,econLibresLib(S.interior&&S.interior.bid));
    if(!r.ok){try{toast('無法駐閣：'+(ECON_LIBRES_WHY[r.reason]||r.reason));}catch(e){}}}
  else if(a==='unstation')econLibresUnstation('player');
  else if(a==='mode'){L.mode=t.getAttribute('data-mode')||'auto';}
  ECON_LIBRES_RT.panelKey=null;
  try{if(typeof inKey!=='undefined')inKey=null;}catch(e){}
  econLibresPanelEntry();
}
function econLibresInstall(){
  try{
    if(typeof updateSect==='function'&&!ECON_LIBRES_WRAPPED.us){
      const _us=updateSect;
      updateSect=function(dt){
        const held=[];
        let on=false;try{on=econLibresOn()&&!econLibresClient();}catch(e){}
        if(on){try{for(const b of S.buildings)if(b&&b.type==='library'&&b.research&&b.research.lr!=null){held.push([b,b.research]);b.research=null;}}catch(e){}}
        let r;
        try{r=_us.apply(this,arguments);}
        finally{
          for(const h of held){const b=h[0],rr=h[1];if(!b.research)b.research=rr;
            try{const L=econLibresState();const u=(L&&L.uid===rr.lr)?econLibresUnit():null;
              if(!u){delete rr.lr;}else econLibresAdvance(b,rr,dt,u);}catch(e){}}
        }
        if(on){try{econLibresTick(dt);}catch(e){}}
        return r;
      };
      ECON_LIBRES_WRAPPED.us=1;
    }
    if(typeof renderInPanel==='function'&&!ECON_LIBRES_WRAPPED.rip){
      const _ri=renderInPanel;
      renderInPanel=function(){const r=_ri.apply(this,arguments);try{econLibresPanelEntry();}catch(e){}return r;};
      ECON_LIBRES_WRAPPED.rip=1;
    }
    if(typeof document!=='undefined'&&!ECON_LIBRES_WRAPPED.click){document.addEventListener('click',econLibresClick,true);ECON_LIBRES_WRAPPED.click=1;}
    if(typeof setInterval==='function'&&!ECON_LIBRES_WRAPPED.iv){setInterval(function(){try{if(S&&S.interior)econLibresPanelEntry();}catch(e){}},700);ECON_LIBRES_WRAPPED.iv=1;}
    try{if(typeof ECON_LEDGER_LABEL!=='undefined'&&!ECON_LEDGER_LABEL['libres-fee'])ECON_LEDGER_LABEL['libres-fee']='長書閣駐閣研究酬勞';}catch(e){}
    if(typeof window!=='undefined'&&window.XW_ECON){const A=window.XW_ECON;
      A.libresOn=econLibresOn;A.libresState=econLibresState;A.libresStatus=econLibresStatus;A.libresStation=econLibresStation;A.libresUnstation=econLibresUnstation;
      A.libresMul=econLibresMul;A.libresFeeXia=econLibresFeeXia;A.libresPanelHtml=econLibresPanelHtml;A.libresPanelEntry=econLibresPanelEntry;A.LIBRES_TUNE=ECON_LIBRES_TUNE;}
  }catch(e){}
}
// 等 g12／g20／g23 的 updateSect／renderInPanel 包裝都掛好再掛（最外層）；有登記，只掛一次
try{if(typeof setTimeout==='function'){setTimeout(econLibresInstall,0);setTimeout(econLibresInstall,300);setTimeout(econLibresInstall,1200);}}catch(e){}
