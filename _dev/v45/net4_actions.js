// ================== v0.5 聯機：成員操作轉送（net4_actions.js；v0.5.1 起併入原 net6_actions2.js）==================
// 成員端呼叫這些函式時不在本機執行，而是把「函式名＋參數（物件換成 id）」送給房主；房主驗證後以「該成員的化身」為 player() 執行原函式
// （原本的檢查照常生效），結果經下一次同步回到成員端，提示訊息也轉回該成員。
// 唯一的轉送登記表 NET_FWD：netFwd(名稱, 原函式, 成員端回傳值, 選項) —— net4／net8 及之後的檔案都用它，不再各自包 netApplyCall。
// 選項：unit 第一個參數是角色（須是自己能控制、未倒下）；pc 無參數、以自己的化身為主角；bld 第一個參數是建築；
//   max 參數上限（預設 4）；chk(原始參數) 額外驗證；fix(參數) 轉型；run(pk,化身,參數) 自訂執行；keepSel 執行後還原房主的選取；
//   strict 回傳 null／undefined 也算失敗；after() 執行成功後；trim 成員端去掉尾端的 null 參數。
const NET_FWD={};
function netEnc(v){if(v&&typeof v==='object'&&S&&v.id!=null){if(S.units.includes(v))return {$u:v.id};if(S.buildings.includes(v))return {$b:v.id};}return v;}
function netDec(v,pk){if(v&&typeof v==='object'&&!Array.isArray(v)){
    if('$u' in v){const u=unitById(+v.$u);if(!netCanCtl(u,pk))throw new Error('不能操作這個角色');return u;}
    if('$b' in v)return bById(+v.$b)||null;return null;}
  return v;}
function netFwd(name,orig,ret,opt){const o=opt||{};NET_FWD[name]={f:orig,o};
  return function(){if(NET.role==='client'){const args=Array.from(arguments);if(o.trim)while(args.length&&args[args.length-1]==null)args.length--;
      netIntent({a:'call',f:name,args:args.map(netEnc)});return ret;}return orig.apply(this,arguments);};}
// 以成員化身為 player() 執行 fn（巢狀呼叫安全：還原成呼叫前的 actAs）
function netAsMember(a,fn){const sa=NET.actAs;NET.actAs=a;try{return fn();}finally{NET.actAs=sa;}}
function netApplyCall(pk,i){const E=i&&typeof i.f==='string'&&Object.prototype.hasOwnProperty.call(NET_FWD,i.f)&&NET_FWD[i.f];if(!E||!Array.isArray(i.args))return false;const o=E.o;
  if(i.args.length>(o.max!=null?o.max:4))return false;if(o.chk&&!o.chk(i.args))return false;
  let args;try{args=i.args.map(a=>netDec(a,pk));}catch(e){toast(e.message);return false;}
  const a=netAvatarOf(pk);if(!a)return false;
  if(o.unit){if(!args[0]||args[0].dead)return false;}else if(a.dead)return false; // 沒有化身（或化身倒下）就不能操作
  if(o.pc&&args.length)return false;
  if(o.bld){const b=args[0];if(!b||!S.buildings.includes(b))return false;}
  if(o.fix)args=o.fix(args)||args;
  if(o.run){const r=o.run(pk,a,args);NET.stats.applied++;return r;}
  const so=selOther;
  try{const r=netAsMember(a,()=>E.f.apply(null,args));NET.stats.applied++;if(o.after)o.after();return o.strict?(r!==false&&r!=null):r!==false;}
  finally{if(o.keepSel){selOther=so;panelKeyCache=null;}}}
// 裝備／卸下／自動配裝／服丹（第一個參數是角色）
equip=netFwd('equip',equip,true,{unit:true});
unequip=netFwd('unequip',unequip,true,{unit:true});
usePill=netFwd('usePill',usePill,true,{unit:true});
equipBest=netFwd('equipBest',equipBest,true,{unit:true});
// 打坐、施放技能（以化身為主角）、煉丹／鍛造開爐、控火鍛打（建築）
toggleMeditate=netFwd('toggleMeditate',toggleMeditate,undefined,{pc:true,max:3});
castSkill=netFwd('castSkill',castSkill,undefined,{pc:true,max:3});
startCraft=netFwd('startCraft',startCraft,true,{bld:true,max:3,chk:a=>typeof a[1]==='string'&&a[1].length<=32});
fireTap=netFwd('fireTap',fireTap,undefined,{bld:true,max:3});
// 行囊「分解」是 g14 點擊處理裡的內嵌程式（沒有函式可包），成員端用捕獲階段的監聽器攔下改送意圖
function netApplySell(pk,i){const id=+i.id,it=S.inv.find(x=>x.id===id);if(!it)return false;S.inv=S.inv.filter(x=>x!==it);S.res.lingshi+=1+it.q;toast(`分解 ${itemName(it)}，得靈石 ${1+it.q}`);NET.stats.applied++;return true;}
function netInitActions(){const bag=document.getElementById('bag');if(!bag||bag._net)return;bag._net=1;
  bag.addEventListener('click',ev=>{if(NET.role!=='client')return;const x=ev.target.closest&&ev.target.closest('[data-sell]');if(!x)return;ev.stopImmediatePropagation();netIntent({a:'sell',id:+x.dataset.sell});},true);}
{const _x=XW045;XW045=function(){const o=_x.apply(this,arguments);try{netInitActions();}catch(e){console.error('[net] actions',e);}
  if(o.net){o.net.sell=id=>{if(NET.role==='client')netIntent({a:'sell',id});else netApplySell(NET.pkey,{id});};o.net.simDrop=netSimDrop;o.net.loadPeer=netLoadPeerJS;Object.defineProperty(o.net,'reconn',{get:()=>NET.reconn&&{n:NET.reconn.n,why:NET.reconn.why}});
    o.net.fwd=()=>Object.keys(NET_FWD);}
  return o;};}
// 測試用：模擬網路中斷（不送「離開」，直接斷掉傳輸）
function netSimDrop(){const tr=NET.tr;if(!tr)return false;netLog('SIM drop',tr.kind);
  if(tr.kind==='ws'&&tr.ws){tr.ws.close();return true;}
  if(tr.kind==='bc'&&tr.ch){tr.ch.onmessage=null;tr.ch.close();tr.ch=null;return true;}
  if(tr.peer){try{tr.peer.destroy();}catch(e){}return true;}return false;}
