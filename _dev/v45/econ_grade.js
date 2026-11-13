// ================== 礦獲品級（使用者 11:27 定案）==================
// 挖到靈石礦時逐顆擲品級：下品 99%、中品 0.8%、上品 0.2%，取得時告知，直接入同品級庫存（四品總庫 S.econ.vault）。
// 採集經驗提升中／上品機率：使用者已定「會提升」，但曲線與上限未定 → MINE_GRADE_EXP_BONUS 先回 0（擴充入口，未完成）。
// 限制：僅在四品總庫啟用（treasury）時有分品級的庫存；關閉時舊 S.res.lingshi 只有單一數值，無處存中／上品 → 維持原樣全記下品（待權威帳本遷移）。
const MINE_GRADE_P={zhong:0.008,shang:0.002}; // 下品＝1－其餘（0.99）
function MINE_GRADE_EXP_BONUS(u){return {zhong:0,shang:0};} // 待使用者定曲線／上限
var MINE_GRADE={rng:Math.random,n:0,got:{xia:0,zhong:0,shang:0}};
function mineRollGrades(n,u){const b=MINE_GRADE_EXP_BONUS(u)||{},pz=MINE_GRADE_P.zhong+(+b.zhong||0),ps=MINE_GRADE_P.shang+(+b.shang||0);const o={xia:0,zhong:0,shang:0};
  for(let i=0;i<n;i++){const r=MINE_GRADE.rng();if(r<ps)o.shang++;else if(r<ps+pz)o.zhong++;else o.xia++;}return o;}
{const _g=econGrant;econGrant=function(who,xia,note,prefer){if(note!=='mine-deposit'||who!=='vault'||!econFlag('treasury')||!S.econ||!S.econ.vault)return _g.apply(this,arguments);
  const n=Math.floor(+xia||0);if(n<=0)return _g.apply(this,arguments);const o=mineRollGrades(n,MINE_GRADE.cur);
  const r=o.xia>0?_g.call(this,who,o.xia,note,'xia'):{ok:true,got:0};const v=S.econ.vault;{const X=typeof econXws==='function'?econXws():null;if(X){if(o.zhong)X.add('zhong',o.zhong,'mine-deposit');if(o.shang)X.add('shang',o.shang,'mine-deposit');}else{v.zhong=(v.zhong||0)+o.zhong;v.shang=(v.shang||0)+o.shang;}}
  try{econSyncResFromVault(S);}catch(e){}MINE_GRADE.n++;for(const k in o)MINE_GRADE.got[k]+=o[k];
  try{if(o.zhong||o.shang)toast(`⛏ 挖到 ${o.shang?o.shang+' 上品':''}${o.shang&&o.zhong?'、':''}${o.zhong?o.zhong+' 中品':''}靈石！（另 ${o.xia} 下品）`);}catch(e){}
  return Object.assign({},r,{grades:o});};}
{const _d=econGatherDeposit;econGatherDeposit=function(u){MINE_GRADE.cur=u;try{return _d.apply(this,arguments);}finally{MINE_GRADE.cur=null;}};}
try{setTimeout(function mgReg(){if(!window.XW){setTimeout(mgReg,300);return;}XW.mineGrade={st:MINE_GRADE,roll:mineRollGrades,P:MINE_GRADE_P};},0);}catch(e){}
// ===== 正式品級庫存（11:33；不靠 treasury 開關）=====
// 帳本語義（沿用既有鏡像，不另造貨幣）：S.econ.vault 四品為宗門靈石；下品數＝S.res.lingshi（舊模組照舊讀寫），中／上／極只在 vault。
// 12:18 原定案：舊檔分品公庫 xia 為準並備份舊值。11:13 修正：res.lingshi 與 vault.xia 皆有效時取較大值（等同 vault + max(0, res−vault)），不得丟資產；兩者本為同一份下品鏡像，加總會翻倍故不採用。選定後寫回兩邊，再交 grSync 綁定。
// treasury 開時礦獲走上方 econGrant 包裝；關時走下方 econGatherDeposit 包裝（不會兩邊都擲）。
// 11:4x 查證：新遊戲預設 S.econ.flags.treasury＝true（正式），四品總庫本來就是正常玩法的宗門帳；以下拆分支付／顯示兩種模式都適用（下品永遠＝S.res.lingshi，與 econSyncVaultFromRes 同語義）。
function grFormal(){return typeof S!=='undefined'&&S&&S.econ&&S.econ.vault&&S.res;}
function grOff(){return grFormal()&&!(typeof econFlag==='function'&&econFlag('treasury'));}
// 即時鏡像只是一份資產的兩個入口：完成既有 grSync 對齊後，以同一個 vault.xia 作底層值。
// 舊檔只由 grCurrencyLoadPlan/applySave 完成顯式版本化遷移；grSync/new snapshot rebind 不代表舊檔已遷移。
// 綁定留在 runtime WeakMap，不寫存檔；enumerable getter/setter 保留 JSON 數字形狀。
var GR_LIVE_LINK=new WeakMap(),GR_LIVE_ACCESSOR=new WeakMap();
function grSync(){if(!grFormal())return;const v=S.econ.vault;if(!['xia','zhong','shang','ji'].every(g=>Number.isSafeInteger(v[g])&&v[g]>=0))throw new TypeError('Invalid live currency grades');grBindLive(S.res,v);}
function grBindLive(res,v){if(GR_LIVE_LINK.get(res)!==v){const get=function(){return v.xia;},set=function(n){v.xia=n;};Object.defineProperty(res,'lingshi',{enumerable:true,configurable:true,get,set});GR_LIVE_LINK.set(res,v);GR_LIVE_ACCESSOR.set(res,{get,set,vault:v});}}
// 房主完整經濟快照是替換，不是收入；不得讓舊 res getter 決定新 vault 的值。
function grApplyAuthoritativeEcon(next){
  if(!next||typeof next!=='object'||!next.vault||typeof next.vault!=='object')throw new TypeError('Invalid authoritative economy snapshot');
  const v=next.vault;for(const g of ['xia','zhong','shang','ji'])if(!Number.isSafeInteger(v[g])||v[g]<0)throw new TypeError('Invalid authoritative currency grade: '+g);
  if(typeof S==='undefined'||!S||!S.res)throw new TypeError('No live currency state');
  grBindLive(S.res,v);S.econ=next;return next;
}
try{setTimeout(function grPublic(){if(!window.XW_ECON){setTimeout(grPublic,100);return;}window.XW_ECON.applyAuthoritativeSnapshot=grApplyAuthoritativeEcon;},0);}catch(e){}
// 僅供同步傳送 transaction 的限定貨幣還原；runtime identity 不可序列化／跨世界使用。
function grCurrencyGrades(v){return {xia:v.xia,zhong:v.zhong,shang:v.shang,ji:v.ji};}
function grCurrencySame(a,b){return ['xia','zhong','shang','ji'].every(g=>a[g]===b[g]);}
function grCaptureCurrencySnapshot(who,opt){
  if(!grFormal()||GR_LIVE_LINK.get(S.res)!==S.econ.vault)return null;opt=opt||{};const n=opt.expectedDebit==null?0:opt.expectedDebit;
  if(!Number.isSafeInteger(n)||n<0)return null;
  const unit=who&&typeof who==='object'&&who.id!=null?who:null,bag=unit&&S.econ.wallets?S.econ.wallets[String(unit.id)]:(!unit&&(who==null||who==='vault'||who==='sect')?S.econ.vault:null);
  if(!bag||!Array.isArray(S.econ.ledgers))return null;const grades=grCurrencyGrades(bag),expected=Object.assign({},grades);
  if(!['xia','zhong','shang','ji'].every(g=>Number.isSafeInteger(grades[g])&&grades[g]>=0)||econBagXia(expected)<n||!econDeductXia(expected,n))return null;
  const total=grCurrencySafeTotal(bag),missing=unit&&!Object.prototype.hasOwnProperty.call(unit,'lingshi');if(total==null||unit&&!missing&&unit.lingshi!==total)return null;if(missing&&(!(S.units||[]).includes(unit)||!Object.isExtensible(unit)))return null; // 只補真缺欄，不裁決矛盾。
  const ledgers=[{ref:S.econ.ledgers,items:S.econ.ledgers.slice(),json:JSON.stringify(S.econ.ledgers),cap:ECON_TUNE.ledgerMax}];
  if(unit){if(!Array.isArray(bag.ledger))return null;ledgers.push({ref:bag.ledger,items:bag.ledger.slice(),json:JSON.stringify(bag.ledger),cap:80});}
  if(missing)unit.lingshi=total;
  return {schema:'xw-currency-live-v2',state:S,econ:S.econ,res:S.res,vault:S.econ.vault,bag,unit,mirror:unit&&unit.lingshi,grades:Object.freeze(grades),expected:Object.freeze(expected),debit:n,note:opt.note,ledgers,used:false};
}
function grRestoreCurrencySnapshot(s){
  const fail=why=>{if(s)s.conflict=why;return false;};
  if(!s||s.used||s.schema!=='xw-currency-live-v2'||S!==s.state||S.econ!==s.econ||S.res!==s.res||S.econ.vault!==s.vault)return fail('state-identity');
  if((s.unit&&S.econ.wallets[String(s.unit.id)]!==s.bag)||(!s.unit&&s.bag!==S.econ.vault)||GR_LIVE_LINK.get(S.res)!==S.econ.vault)return fail('account-identity');
  const states=[];
  for(let i=0;i<s.ledgers.length;i++){
    const q=s.ledgers[i],current=i? s.bag.ledger:S.econ.ledgers;if(current!==q.ref)return fail('ledger-identity');
    if(JSON.stringify(current)===q.json){states.push(0);continue;}
    const r=current[current.length-1],actor=s.unit?s.unit.id:null;
    if(!s.debit||!r||r.kind!=='charge'||r.xia!==s.debit||r.actorId!==actor||(s.note!=null&&r.note!==s.note))return fail('unowned-ledger');
    const items=q.items.concat(r).slice(-q.cap);if(current.length!==items.length||!current.every((x,k)=>x===items[k])||JSON.stringify(q.items)!==q.json)return fail('interleaved-ledger');states.push(1);
  }
  if(states.some(n=>n!==states[0]))return fail('ledger-disagreement');
  const paid=grCurrencySame(s.bag,s.expected),unchanged=grCurrencySame(s.bag,s.grades),prepared=s.prepared&&grCurrencySame(s.bag,s.prepared);
  if(!paid&&(states[0]||(!unchanged&&!prepared)))return fail('interleaved-balance');
  if(s.unit&&s.unit.lingshi!==econBagXia(s.bag))return fail('unit-mirror');
  Object.assign(s.bag,s.grades);if(s.unit)s.unit.lingshi=s.mirror;else grBindLive(S.res,s.bag);
  if(states[0])for(const q of s.ledgers)q.ref.splice(0,q.ref.length,...q.items);
  s.used=true;return true;
}
function grCommitCurrencySnapshot(s){if(!s||s.used)return false;s.used=true;return true;}
function grPrepareLow(cost){if(!grFormal()||!Number.isFinite(cost)||cost<0||Math.floor(cost)!==cost)return false;grSync();const v=S.econ.vault;if(v.xia>=cost)return true;
  const t={xia:v.xia,zhong:v.zhong,shang:v.shang,ji:v.ji};if(econBagXia(t)<cost||!econDeductXia(t,cost))return false;
  {const X=typeof econXws==='function'?econXws():null;if(X){const r=X.take('lingshi',cost,'grSplit');if(!r||!r.ok)return false;X.add('xia',cost,'grSplit');return true;}}
  t.xia+=cost;Object.assign(v,t);return true;}
// 不複製玩家流程／不改單價：只在原框選傳送呼叫的同步區段準備下品找零。
function grQuickCurrency(cost,fn,start){if(!grFormal())return fn();const snap=grCaptureCurrencySnapshot('vault',{expectedDebit:start?0:cost});if(!snap||!grPrepareLow(cost))return fn();
  const ready=Object.assign({},S.econ.vault);snap.prepared=Object.freeze(grCurrencyGrades(ready));try{const r=fn();if(start||r===false){if(['xia','zhong','shang','ji'].every(g=>S.econ.vault[g]===ready[g]))grRestoreCurrencySnapshot(snap);}grCommitCurrencySnapshot(snap);return r;}
  catch(e){if(!grRestoreCurrencySnapshot(snap))console.error('currency rollback conflict',snap.conflict);throw e;}}
// 必須位於安全落點 transaction 外層，才能連 transaction 的末端例外一起還原四品。
(function grInstallQuick(k){if(typeof mapStpStart!=='function'||typeof mapStpArrive!=='function'||!mapStpStart._mapSafe||!mapStpArrive._mapSafe){if(k<200&&typeof setTimeout==='function')setTimeout(()=>grInstallQuick(k+1),50);return;}
  if(mapStpStart._grQuick)return;const start=mapStpStart,arrive=mapStpArrive;
  mapStpStart=function(toId,units){if(mapStpClient())return start.apply(this,arguments);const args=arguments,self=this;return grQuickCurrency(mapStpCost(units||mapStpSel()),()=>start.apply(self,args),true);};
  mapStpArrive=function(){if(mapStpClient()||!MAP_STP.run)return arrive.apply(this,arguments);const us=MAP_STP.run.ids.map(unitById).filter(u=>u&&!u.dead&&!u.inside),args=arguments,self=this;return grQuickCurrency(mapStpCost(us),()=>arrive.apply(self,args),false);};
  mapStpStart._mapSafe=mapStpArrive._mapSafe=mapStpStart._grQuick=mapStpArrive._grQuick=1;
  if(window.XWMAP&&window.XWMAP.stp)window.XWMAP.stp.start=mapStpStart;
})(0);
try{setTimeout(function grTransactionPublic(){if(!window.XW_ECON){setTimeout(grTransactionPublic,100);return;}Object.assign(window.XW_ECON,{captureCurrencySnapshot:grCaptureCurrencySnapshot,restoreCurrencySnapshot:grRestoreCurrencySnapshot,commitCurrencySnapshot:grCommitCurrencySnapshot});},0);}catch(e){}
// 新局在第一個收入／扣款前接好；讀檔不在 applySave 提前接，以免搶在 grLegacy 備份之前裁決舊值。
{const _ng=newGame;newGame=function(){GR_CURRENCY_NEW_GAME++;try{const r=_ng.apply(this,arguments);grSync();if(grFormal()){S.flags=S.flags||{};S.flags.grCurrencyPolicy={v:1,policy:'vault-xia',origin:'new-game'};}return r;}finally{GR_CURRENCY_NEW_GAME--;}};}
function grTotal(){grSync();return econBagXia(S.econ.vault);}
// 建築升級等走 canAfford/pay 的花費：下品不足時按既定 1中＝100下、1上＝100中 拆開，找零保留（econDeductXia），不向上合成
{const _c=canAfford;canAfford=function(cost){if(!grFormal()||!cost||!(+cost.lingshi>0))return _c.apply(this,arguments);
  for(const k in cost){if(k==='lingshi'){if(grTotal()<cost[k])return false;}else if((S.res[k]||0)<cost[k])return false;}return true;};}
{const _p=pay;pay=function(cost){try{if(grFormal()&&cost&&+cost.lingshi>(S.res.lingshi||0)){grSync();const v=S.econ.vault,need=+cost.lingshi-Math.floor(S.res.lingshi||0);
    const t={xia:0,zhong:v.zhong,shang:v.shang,ji:v.ji};if(econBagXia(t)>=need&&econDeductXia(t,need)){v.zhong=t.zhong;v.shang=t.shang;v.ji=t.ji;S.res.lingshi=Math.floor(S.res.lingshi||0)+need+t.xia;GRADE_FORMAL.split++;}}}catch(e){console.warn('grade pay',e);}
  const r=_p.apply(this,arguments);try{grSync();}catch(e){}return r;};}
var GRADE_FORMAL={split:0,mine:0};
// 正常礦獲：入庫後把這批靈石逐顆擲品級，中／上品從下品數移到對應品級（總顆數不變）
{const _d=econGatherDeposit;econGatherDeposit=function(u){const r=_d.apply(this,arguments);try{if(grOff()&&r&&r.types&&r.types.lingshi>0){const n=Math.floor(r.types.lingshi),o=mineRollGrades(n,u);
    const up=o.zhong+o.shang;if(up>0){const X=typeof econXws==='function'?econXws():null;const v=S.econ.vault;
      if(X&&(v.xia||0)>=up){X.take('xia',up,'mine-grade');if(o.zhong)X.add('zhong',o.zhong,'mine-grade');if(o.shang)X.add('shang',o.shang,'mine-grade');}
      else{S.res.lingshi=Math.max(0,(S.res.lingshi||0)-up);v.zhong=(v.zhong||0)+o.zhong;v.shang=(v.shang||0)+o.shang;}}grSync();GRADE_FORMAL.mine++;r.grades=o;
    if(up>0)try{toast(`⛏ 挖到 ${o.shang?o.shang+' 上品':''}${o.shang&&o.zhong?'、':''}${o.zhong?o.zhong+' 中品':''}靈石！（另 ${o.xia} 下品）`);}catch(e){}}}catch(e){console.warn('grade mine',e);}return r;};}
// 頂欄只列下／中／上三品；legacy 下品鏡像不另列單位。舊 ji 只留帳，不轉換／刪除。
function grCurrencyTopbar(){
  if(typeof document==='undefined')return;
  const formal=grFormal(),v=formal?S.econ.vault:null,valid=n=>Number.isSafeInteger(n)&&n>=0;
  for(const g of ['xia','zhong','shang']){const e=document.getElementById('r_ls_'+g);if(!e)continue;
    const n=v?v[g]:(g==='xia'&&typeof S!=='undefined'&&S.res?S.res.lingshi:null);
    const t=valid(n)?String(n):(v?'待核對':'—');if(e.textContent!==t)e.textContent=t;
  }
  const old=document.getElementById('r_ls_legacy');if(old){const warn=v&&(!valid(v.ji)||v.ji!==0);
    old.style.display=warn?'inline':'none';old.title=warn?'舊欄位 ji 保留值：'+String(v.ji)+'；不併入三品，需人工核對。':'';
  }
}
{const _u=updateUI;updateUI=function(){const r=_u.apply(this,arguments);
  // 保留原正式模式的 runtime alias 綁定；顯示 helper 本身不裁決／寫入帳本。
  try{if(grFormal())grSync();}catch(e){}
  try{grCurrencyTopbar();}catch(e){}return r;};}
// 12:18 使用者明確採分品公庫下品；在上游 legacy default/normalize 之前檢視 raw JSON。
var GR_MIGRATION_LAST=null,GR_CURRENCY_LOADING=0,GR_CURRENCY_NEW_GAME=0;
function grCurrencyLoadPlan(d){
  const reject=(reason,details)=>({ok:false,reason,details:details||null});
  const own=(o,k)=>o!=null&&Object.prototype.hasOwnProperty.call(o,k),valid=n=>Number.isSafeInteger(n)&&n>=0;
  if(!d||typeof d!=='object'||![3,4,5,6,7].includes(d.v))return reject('unknown-save-version');
  if(d.res!=null&&(typeof d.res!=='object'||Array.isArray(d.res)))return reject('invalid-resource-record');
  const hasRes=own(d.res,'lingshi'),oldRes=hasRes?d.res.lingshi:null;if(hasRes&&!valid(oldRes))return reject('invalid-res-lingshi');
  const e=d.econ,hasEcon=e!=null;if(hasEcon&&(typeof e!=='object'||Array.isArray(e)))return reject('invalid-econ-record');
  if(hasEcon&&e.v!=null&&e.v!==1)return reject('unknown-econ-version');
  const flags=d.flags;if(flags!=null&&(typeof flags!=='object'||Array.isArray(flags)))return reject('invalid-flags-record');
  const mark=flags&&flags.grCurrencyPolicy;
  if(mark!=null&&(!mark||mark.v!==1||mark.policy!=='vault-xia'||!['new-game','saved-vault','legacy-res-no-econ'].includes(mark.origin)))return reject('unknown-currency-policy-version');
  const hasVault=hasEcon&&own(e,'vault');let chosen,origin;
  if(hasVault){if(!e.vault||typeof e.vault!=='object'||Array.isArray(e.vault)||!['xia','zhong','shang','ji'].every(g=>own(e.vault,g)&&valid(e.vault[g])))return reject('invalid-or-incomplete-vault');chosen=hasRes?Math.max(oldRes,e.vault.xia):e.vault.xia;origin='saved-vault';}
  else {if(hasEcon)return reject('incomplete-econ-missing-vault');if(!hasRes)return reject('legacy-without-currency');chosen=oldRes;origin='legacy-res-no-econ';}
  const legacy=flags&&flags.grLegacy;if(legacy!=null&&!Array.isArray(legacy))return reject('invalid-legacy-backups');
  const adopted=(legacy||[]).filter(x=>x&&x.pick==='res');
  if(adopted.length)return reject('historical-res-adoption-needs-review',{currentRes:oldRes,currentVault:hasVault?Object.assign({},e.vault):null,candidates:adopted.map(x=>({res:x.res,vxia:x.vxia,zhong:x.zhong,shang:x.shang,ji:x.ji,t:x.t,structuralMatch:hasVault&&oldRes===x.res&&e.vault.xia===x.res&&['zhong','shang','ji'].every(g=>e.vault[g]===x[g])})),canAutomaticallyRecover:false,why:'舊備份無來源世代／後續交易序列，吻合數值不證明沒有後來支出或權威快照；不重播舊額、不任取一筆。'});
  const backups=flags&&flags.grCurrencyBackups;if(backups!=null&&(!Array.isArray(backups)||backups.some(x=>!x||x.v!==1||typeof x.key!=='string'||!x.raw)))return reject('unknown-currency-backup-version');
  let next;try{next=JSON.parse(JSON.stringify(d,function(k,v){if(typeof v==='number'&&!Number.isFinite(v))throw new TypeError('Non-finite save number');return v;}));}catch(err){return reject('non-json-save');}
  const raw={res:{present:hasRes,value:oldRes},econ:{present:hasEcon,versionPresent:hasEcon&&own(e,'v'),version:hasEcon&&e.v!=null?e.v:null,vaultPresent:hasVault,vault:hasVault?JSON.parse(JSON.stringify(e.vault)):null}};
  const key=JSON.stringify(raw);next.flags=next.flags||{};next.flags.grCurrencyBackups=next.flags.grCurrencyBackups||[];
  if(!mark||!hasRes||oldRes!==chosen){if(!next.flags.grCurrencyBackups.some(x=>x.key===key))next.flags.grCurrencyBackups.push({v:1,policy:'vault-xia',origin,key,raw,at:Date.now()});}
  next.flags.grCurrencyPolicy={v:1,policy:'vault-xia',origin:mark?mark.origin:origin};next.res=next.res||{};next.res.lingshi=chosen;if(hasVault)next.econ.vault.xia=chosen;
  return {ok:true,data:next,chosen,origin,raw};
}
function grCurrencySetLoadStatus(plan){GR_MIGRATION_LAST={ok:plan.ok,reason:plan.reason||null,details:plan.details||null,chosen:plan.chosen,origin:plan.origin};if(!plan.ok)try{toast('貨幣存檔未載入：'+plan.reason+'（原檔未改，請保留備份）');}catch(e){}}
{const _as=applySave;applySave=function(d){const plan=grCurrencyLoadPlan(d);grCurrencySetLoadStatus(plan);
  if(!plan.ok)return false;
  GR_CURRENCY_LOADING++;try{const r=_as.call(this,plan.data);if(r&&grFormal())grSync();return r;}finally{GR_CURRENCY_LOADING--;}};}
// g23 在 econ 初始化後還會檢查objective等合法收支；先接好已由raw plan選定的庫，不能等整個applySave返回才綁。
{const migrate=econMigrateSave;econMigrateSave=function(target){const r=migrate.apply(this,arguments);if((GR_CURRENCY_LOADING>0||GR_CURRENCY_NEW_GAME>0)&&(!target||target===S)&&grFormal())grSync();return r;};}
// 更老的 migrateOld 原本只搬木石糧，遇到帶貨幣的未知格式不可讓它丟失靈石後假成功。
if(typeof migrateOld==='function'){const old=migrateOld;migrateOld=function(raw){let d;try{d=JSON.parse(raw);}catch(e){return old.apply(this,arguments);}
  if(d&&((d.res&&Object.prototype.hasOwnProperty.call(d.res,'lingshi'))||d.econ!=null)){const plan=grCurrencyLoadPlan(d);if(!plan.ok){grCurrencySetLoadStatus(plan);return false;}return applySave(d);}
  return old.apply(this,arguments);};}
// runtime 重綁不建立政策標記／不覆寫 vault；只有上方 raw-load migration 才寫入版本與備份。
{const _a=afterLoad;afterLoad=function(){if(grFormal())grSync();const r=_a.apply(this,arguments);if(grFormal())grSync();return r;};}
try{setTimeout(function grMigrationPublic(){if(!window.XW_ECON){setTimeout(grMigrationPublic,100);return;}window.XW_ECON.inspectCurrencySave=grCurrencyLoadPlan;window.XW_ECON.currencyLoadStatus=()=>GR_MIGRATION_LAST;},0);}catch(e){}

// 同步雙帳 transfer group v1：自有實際 receipt、共同驗證再共同還原。
var GR_TRANSFER_STATES=new WeakMap(),GR_TRANSFER_LOCKS=new WeakMap(),GR_TRANSFER_RECORDING=null;
function grCurrencySafeTotal(b){if(!b||!['xia','zhong','shang','ji'].every(g=>Number.isSafeInteger(b[g])&&b[g]>=0))return null;const n=BigInt(b.xia)+BigInt(b.zhong)*100n+BigInt(b.shang)*10000n+BigInt(b.ji)*1000000n;return n<=BigInt(Number.MAX_SAFE_INTEGER)?Number(n):null;}
function grTransferError(code,reason){return {ok:false,code,reason:reason||code};}
function grTransferAccount(who){const vault=who==='vault'||who==='sect';let unit=null,bag;
 if(vault)bag=S.econ.vault;else {if(!who||typeof who!=='object'||who.id==null||!(S.units||[]).includes(who))return null;unit=who;bag=S.econ.wallets&&S.econ.wallets[String(unit.id)];}
 if(!bag)return null;const total=grCurrencySafeTotal(bag);if(total==null)return null;
 for(const g of ['xia','zhong','shang','ji']){const d=Object.getOwnPropertyDescriptor(bag,g);if(!d||!('value'in d)||!d.writable)return null;}
 const missing=unit&&!Object.prototype.hasOwnProperty.call(unit,'lingshi');if(unit){if(missing){if(!Object.isExtensible(unit))return null;}else{const d=Object.getOwnPropertyDescriptor(unit,'lingshi');if(!d||!('value'in d)||!d.writable||unit.lingshi!==total)return null;}if(!Array.isArray(bag.ledger))return null;}
 return {who:vault?'vault':unit,unit,bag,total,missing,actor:unit?unit.id:null,grades:grCurrencyGrades(bag)};
}
function grTransferArrayWritable(a){return Array.isArray(a)&&Object.getPrototypeOf(a)===Array.prototype&&Object.getOwnPropertyDescriptor(a,'length').writable&&Object.keys(a).filter(k=>/^(0|[1-9][0-9]*)$/.test(k)).every(k=>{const d=Object.getOwnPropertyDescriptor(a,k);return d&&'value'in d&&d.writable&&d.configurable;});}
function grTransferLedger(a,cap){try{if(!grTransferArrayWritable(a)||!Number.isSafeInteger(cap)||cap<2||a.length>cap||new Set(a).size!==a.length)return null;return {ref:a,items:a.slice(),json:JSON.stringify(a),cap};}catch(e){return null;}}
function grTransferLiveVault(){if(!grFormal())return false;const a=GR_LIVE_ACCESSOR.get(S.res),d=Object.getOwnPropertyDescriptor(S.res,'lingshi');return !!(a&&d&&a.vault===S.econ.vault&&GR_LIVE_LINK.get(S.res)===a.vault&&d.get===a.get&&d.set===a.set&&S.res.lingshi===a.vault.xia);}
function grTransferWorld(){const n=typeof NET!=='undefined'&&NET?NET:null;return [S.flags&&S.flags.netWid||null,n&&n.wid||null,n&&n.role||null,n&&n.pkey||null,S.flags&&S.flags.netOwner||null];}
function grTransferUnlock(t,s){for(const a of s.accounts)if(GR_TRANSFER_LOCKS.get(a.bag)===t)GR_TRANSFER_LOCKS.delete(a.bag);}
function grCaptureTransferSnapshot(from,to,opt){
 if(!grFormal()||!econFlag('treasury')||!grTransferLiveVault())return grTransferError('unsupported-state');
 if(!opt||!Number.isSafeInteger(opt.amount)||opt.amount<=0||typeof opt.debitNote!=='string'||!opt.debitNote||typeof opt.creditNote!=='string'||!opt.creditNote)return grTransferError('invalid-transfer');
 const a=grTransferAccount(from),b=grTransferAccount(to);if(!a||!b)return grTransferError('missing-or-conflicting-account');if(a.bag===b.bag)return grTransferError('same-account');if(GR_TRANSFER_LOCKS.has(a.bag)||GR_TRANSFER_LOCKS.has(b.bag))return grTransferError('busy');
 if(!b.unit&&opt.creditNote==='mine-deposit')return grTransferError('unsupported-credit-note');
 const n=opt.amount;if(a.total<n)return grTransferError('insufficient');if(!Number.isSafeInteger(b.total+n)||!Number.isSafeInteger(b.bag.xia+n))return grTransferError('unsafe-total');
 const root=grTransferLedger(S.econ.ledgers,ECON_TUNE.ledgerMax);if(!root)return grTransferError('invalid-ledger');
 for(const x of [a,b]){x.ledger=x.unit?grTransferLedger(x.bag.ledger,80):null;if(x.unit&&!x.ledger)return grTransferError('invalid-wallet-ledger');}
 const beforeCarry=S.econ.cultCarry,carryHas=Object.prototype.hasOwnProperty.call(S.econ,'cultCarry');let afterCarry=beforeCarry;
 if(!a.unit){const cd=Object.getOwnPropertyDescriptor(S.econ,'cultCarry');if(carryHas&&(!cd||!('value'in cd)||!cd.writable)||!carryHas&&!Object.isExtensible(S.econ))return grTransferError('unsafe-vault-carry-descriptor');const c=beforeCarry==null?0:beforeCarry;if(typeof c!=='number'||!Number.isFinite(c)||c<0||c>=1)return grTransferError('unsafe-vault-carry');const due=c+n,whole=Math.floor(due+1e-9);if(whole!==n)return grTransferError('non-exact-vault-charge');afterCarry=due-whole;if(afterCarry<0)afterCarry=0;}
 a.after=Object.assign({},a.grades);b.after=Object.assign({},b.grades);if(!econDeductXia(a.after,n))return grTransferError('insufficient');b.after.xia+=n;
 const token={schema:'xw-transfer-v1',used:false,conflict:null},s={state:S,econ:S.econ,res:S.res,vault:S.econ.vault,world:grTransferWorld(),wallets:S.econ.wallets,accounts:[a,b],amount:n,debitNote:opt.debitNote,creditNote:opt.creditNote,root,receipts:{},phase:'none',busy:false,used:false,expired:false,carryHas,beforeCarry,afterCarry};
 const repairs=[];for(const x of [a,b])if(x.missing){x.unit.lingshi=x.total;repairs.push({unitId:x.unit.id,field:'lingshi',value:x.total});}GR_TRANSFER_STATES.set(token,s);for(const x of [a,b])GR_TRANSFER_LOCKS.set(x.bag,token);
 token.debit=()=>grTransferOperation(token,'debit');token.credit=()=>grTransferOperation(token,'credit');
 const expire=()=>{if(!s.used){s.expired=true;grTransferUnlock(token,s);}};if(typeof queueMicrotask==='function')queueMicrotask(expire);else Promise.resolve().then(expire);
 return {ok:true,token,repairs};
}
function grTransferCheckRaw(token,allowPhase){const s=token&&GR_TRANSFER_STATES.get(token);if(!s)return grTransferError('invalid-token');if(s.used)return grTransferError('consumed');if(s.expired)return grTransferError('expired');if(s.busy)return grTransferError('conflict','operation-reentry');
 const fail=why=>{token.conflict=why;return grTransferError('conflict',why);};
 if(S!==s.state||S.econ!==s.econ||S.res!==s.res||S.econ.vault!==s.vault||JSON.stringify(grTransferWorld())!==JSON.stringify(s.world)||!econFlag('treasury')||!grTransferLiveVault()||S.econ.wallets!==s.wallets)return fail('world-or-state-identity');
 const a=s.accounts[0],b=s.accounts[1],owned=[s.receipts.debit,s.receipts.credit].filter(Boolean);let phase=s.receipts.credit?'complete':s.receipts.debit?'debit':'none';if(s.receipts.credit&&!s.receipts.debit)return fail('invalid-receipt-order');
 for(let i=0;i<2;i++){const x=s.accounts[i];if(GR_TRANSFER_LOCKS.get(x.bag)!==token)return fail('account-lock');if(x.unit){if(x.unit.id!==x.actor||!(S.units||[]).includes(x.unit)||S.econ.wallets[String(x.unit.id)]!==x.bag||!Object.getOwnPropertyDescriptor(x.unit,'lingshi')||!Object.getOwnPropertyDescriptor(x.unit,'lingshi').writable)return fail('account-identity');}else if(x.bag!==S.econ.vault)return fail('account-identity');
  const expected=(i===0?phase!=='none':phase==='complete')?x.after:x.grades;if(!grCurrencySame(x.bag,expected)||grCurrencySafeTotal(x.bag)==null||(x.unit&&x.unit.lingshi!==grCurrencySafeTotal(x.bag)))return fail('interleaved-account-balance');
  for(const g of ['xia','zhong','shang','ji']){const d=Object.getOwnPropertyDescriptor(x.bag,g);if(!d||!('value'in d)||!d.writable)return fail('account-descriptor');}
 }
 if(!a.unit){const cd=Object.getOwnPropertyDescriptor(S.econ,'cultCarry');if(cd&&(!('value'in cd)||!cd.writable||!s.carryHas&&!cd.configurable)||!cd&&!s.carryHas&&!Object.isExtensible(s.econ))return fail('carry-descriptor');const expected=phase==='none'?s.beforeCarry:s.afterCarry;if(S.econ.cultCarry!==expected)return fail('interleaved-carry');}
 for(const r of owned)if(JSON.stringify(r.row)!==r.json)return fail('receipt-mutated');
 const q=s.root,cur=S.econ.ledgers;if(cur!==q.ref||JSON.stringify(q.items)!==q.json||!grTransferArrayWritable(cur))return fail('ledger-identity-or-mutation');
 let suffix;if(q.items.length){const drop=q.items.indexOf(cur[0]);if(drop<0)return fail('ledger-history-truncated');const prefix=q.items.slice(drop);if(cur.length<prefix.length||!prefix.every((r,i)=>cur[i]===r))return fail('ledger-not-append-only');suffix=cur.slice(prefix.length);if(drop!==Math.max(0,q.items.length+suffix.length-q.cap))return fail('ledger-truncation');}
 else {if(cur.length>=q.cap)return fail('ledger-history-truncated');suffix=cur.slice();}
 if(cur.length>q.cap||new Set(cur).size!==cur.length)return fail('invalid-ledger');
 for(const r of owned)if(suffix.filter(x=>x===r.row).length!==1)return fail('owned-receipt-truncated');if(phase==='complete'&&suffix.indexOf(s.receipts.debit.row)>=suffix.indexOf(s.receipts.credit.row))return fail('owned-receipt-order');
 const foreign=[];for(const row of suffix){if(owned.some(r=>r.row===row))continue;const actor=row&&row.actorId;
  if(!row||!['charge','grant'].includes(row.kind)||!Number.isSafeInteger(row.xia)||row.xia<=0||typeof row.note!=='string'||actor===a.actor||actor===b.actor||!(actor==null||S.econ.wallets&&S.econ.wallets[String(actor)]))return fail('unowned-or-shared-account-ledger');foreign.push(row);}
 const walletPlans=[];for(let i=0;i<2;i++){const x=s.accounts[i];if(!x.ledger)continue;const l=x.ledger,receipt=i===0?s.receipts.debit:s.receipts.credit,expected=l.items.concat(receipt?[receipt.row]:[]).slice(-l.cap);if(x.bag.ledger!==l.ref||JSON.stringify(l.items)!==l.json||!grTransferArrayWritable(l.ref)||l.ref.length!==expected.length||!l.ref.every((r,k)=>r===expected[k]))return fail('wallet-ledger-conflict');walletPlans.push(l);}
 if(allowPhase&&phase!==allowPhase)return grTransferError('incomplete',phase);
 return {ok:true,s,phase,foreign,rootNext:q.items.concat(foreign).slice(-q.cap),walletPlans};
}
function grTransferCheck(token,phase){try{return grTransferCheckRaw(token,phase);}catch(e){if(token)token.conflict='unreadable-state';return grTransferError('conflict','unreadable-state');}}
function grTransferOperation(token,kind){const checked=grTransferCheck(token);if(!checked.ok)return checked;const s=checked.s;if((kind==='debit'&&checked.phase!=='none')||(kind==='credit'&&checked.phase!=='debit'))return grTransferError('wrong-phase',checked.phase);
 const a=s.accounts[kind==='debit'?0:1],before=GR_TRANSFER_RECORDING;s.busy=true;GR_TRANSFER_RECORDING={s,kind};let result,error;
 try{const E=window.XW_ECON;result=kind==='debit'?E.pay(a.who,s.amount,s.debitNote):E.gain(a.who,s.amount,s.creditNote);}catch(e){error=e;}
 finally{GR_TRANSFER_RECORDING=before;s.busy=false;}
 if(error)return grTransferError('operation-threw',String(error.message||error));if(!result||!result.ok)return {ok:false,code:'operation-rejected',result};
 const post=grTransferCheck(token);if(!post.ok)return post;if(!s.receipts[kind])return grTransferError('conflict','missing-owned-receipt');return {ok:true,result,phase:post.phase};
}
function grRestoreTransferSnapshot(token){const c=grTransferCheck(token);if(!c.ok)return c;const s=c.s;
 // 以下只有已共同驗證的plain writable數字/陣列，不呼叫pay/gain或任何遊戲callback。
 for(const a of s.accounts){Object.assign(a.bag,a.grades);if(a.unit)a.unit.lingshi=a.total;}
 if(!s.accounts[0].unit){if(s.carryHas)s.econ.cultCarry=s.beforeCarry;else delete s.econ.cultCarry;}
 Array.prototype.splice.call(s.root.ref,0,s.root.ref.length,...c.rootNext);for(const q of c.walletPlans)Array.prototype.splice.call(q.ref,0,q.ref.length,...q.items);
 s.used=token.used=true;grTransferUnlock(token,s);return {ok:true,phase:c.phase,preservedRows:c.foreign.length};
}
function grCommitTransferSnapshot(token){const c=grTransferCheck(token,'complete');if(!c.ok)return c;c.s.used=token.used=true;grTransferUnlock(token,c.s);return {ok:true,phase:c.phase,preservedRows:c.foreign.length};}
{const log=econLog;econLog=function(kind,entry){const row=log.apply(this,arguments),active=GR_TRANSFER_RECORDING;if(active&&row){const s=active.s,k=active.kind,a=s.accounts[k==='debit'?0:1],note=k==='debit'?s.debitNote:s.creditNote;
 if(!s.receipts[k]&&row.kind===(k==='debit'?'charge':'grant')&&row.actorId===a.actor&&row.xia===s.amount&&row.note===note)s.receipts[k]={row,json:JSON.stringify(row)};
 }return row;};}
try{setTimeout(function grTransferPublic(){if(!window.XW_ECON){setTimeout(grTransferPublic,100);return;}Object.assign(window.XW_ECON,{captureTransferSnapshot:grCaptureTransferSnapshot,restoreTransferSnapshot:grRestoreTransferSnapshot,commitTransferSnapshot:grCommitTransferSnapshot});},0);}catch(e){}
