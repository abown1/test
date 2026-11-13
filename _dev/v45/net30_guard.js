// ================== net30_guard.js：房主拒收客機封包裡的異常數值（F-041、F-043） ==================
// 規格：F-041「房主權威：客機封包 hp<0、exp NaN 就拒收」、F-043「客機封包信任度超出範圍就丟棄」；
//   specs/XMZT_DUNGEON_STORY_20261108.md:20「聯機只補 hp<0、NaN 檢查，maxHp 不寫死 10000」（F-042 maxHp>10000 已被取代，不檢查上限）。
// 欄位（依源碼）：氣血 hp／maxhp；經驗＝修為 xiu、戰鬥經驗 combatExp、通用 exp；信任度＝忠誠 loyal（g3/g14/g15/g22 皆夾在 0..100）。
// 現況：客機送房主的只有 hello／hb／leave／in（意圖）／need／chat／trade:*，正常流程不帶這些欄位；這裡是房主端最後一道防線。
// 做法：在 netHostRx 最外層深度掃描整個封包（深度 ≤8、節點 ≤4000），任一欄位不合法 → 整包丟棄（不夾值、不寫進存檔），
//   每一種違規只 console.warn 一次，其餘計數在 NET30.drop。單機不經過 netHostRx，不受影響。
// 開關：NET_FLAGS.syncGuard 預設 true（安全檢查，正常封包不會被擋）；?netexp=-syncGuard 關閉，執行期 NET30.set(false)。
const NET30={on:true,drop:{},warned:{},seen:0,last:null,
  set(v){NET30.on=!!v;try{if(typeof NET_FLAGS!=='undefined')NET_FLAGS.syncGuard=NET30.on;}catch(e){}return NET30.on;}};
try{if(typeof NET_FLAGS!=='undefined'){if(!('syncGuard' in NET_FLAGS))NET_FLAGS.syncGuard=true;
  const q=/[?&]netexp=([^&]*)/.exec(location.search);if(q)for(const t of decodeURIComponent(q[1]).split(','))if(t.replace(/^[-+]/,'')==='syncGuard')NET_FLAGS.syncGuard=!t.startsWith('-');
  NET30.on=!!NET_FLAGS.syncGuard;}}catch(e){}
const NET30_HP=new Set(['hp','maxhp']),NET30_EXP=new Set(['xiu','exp','combatExp']),NET30_TRUST=new Set(['loyal']);
const NET30_TRUST_MIN=0,NET30_TRUST_MAX=100;
function n30Num(v){if(typeof v==='number')return v;if(typeof v==='string'&&v.trim()!=='')return Number(v);return undefined;}
// 回傳違規種類（'hp'／'exp'／'trust'）或 null
function n30Bad(m){
  let nodes=0;const st=[[m,0]];
  while(st.length){const [o,d]=st.pop();if(!o||typeof o!=='object'||d>8)continue;if(++nodes>4000)return null;
    for(const k in o){if(!Object.prototype.hasOwnProperty.call(o,k))continue;const v=o[k];
      if(v&&typeof v==='object'){st.push([v,d+1]);continue;}
      if(NET30_HP.has(k)){const n=n30Num(v);if(n!==undefined&&(!Number.isFinite(n)||n<0))return {kind:'hp',k,v:String(v)};}
      else if(NET30_EXP.has(k)){const n=n30Num(v);if(n!==undefined&&!Number.isFinite(n))return {kind:'exp',k,v:String(v)};}
      else if(NET30_TRUST.has(k)){const n=n30Num(v);if(n!==undefined&&(!Number.isFinite(n)||n<NET30_TRUST_MIN||n>NET30_TRUST_MAX))return {kind:'trust',k,v:String(v)};}
    }}
  return null;
}
if(typeof netHostRx==='function'){const _x=netHostRx;netHostRx=function(cid,m){
  try{if(NET30.on&&NET.role==='host'&&m&&typeof m==='object'&&m.t!=='hb'){NET30.seen++;const b=n30Bad(m);
    if(b){NET30.drop[b.kind]=(NET30.drop[b.kind]||0)+1;NET30.last={kind:b.kind,k:b.k,v:b.v,t:m.t,a:m.i&&m.i.a,cid:String(cid)};
      if(!NET30.warned[b.kind]){NET30.warned[b.kind]=1;console.warn('[net30] 拒收客機封包：'+b.k+'='+b.v+'（'+b.kind+'，'+(m.t||'?')+'）；同類之後只計數');}
      try{netLog('guard drop',b.kind,b.k,b.v,m.t,m.i&&m.i.a);}catch(e){}
      try{const pk=NET.cid2pk&&NET.cid2pk.get(cid),pp=pk&&NET.players.get(pk);if(pp)pp.lastRx=Date.now();}catch(e){} // 仍算有封包，不因此被判離線
      return;}}}catch(e){}
  return _x.apply(this,arguments);};}
