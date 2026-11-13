// ===== net12：成員角色與主角同等（#9） =====
// 新成員的化身：以主角模板（makePlayer：基礎數值、混沌靈根）建立一次，綁 pkey，之後永不重擲（u.netPar 旗標，存檔保留）。
// 舊存檔裡已存在的化身（無靈根、弟子數值）：遷移一次 → 補上主角的靈根、基礎數值取兩者較高（不降低）。
// 煉氣門檻（g4 breakConds：有靈根或仙緣 ≥50）因此與主角一致；其他境界上限本來就不分主角／弟子。
// 功能開關（net12 起的新功能）：?netexp=名稱 打開、?netexp=-名稱 關閉（逗號分隔）。預設值見下；未完成的功能預設 false。
const NET_FLAGS={dgdeath:true,party:true,vote:true,hostbg:true,hostmig:true,bossgate:true,y47:true,revive:true,gather:true,pcro:true,farAtk:true,liveCgr:true};
try{const q=/[?&]netexp=([^&]*)/.exec(location.search);if(q)for(const t of decodeURIComponent(q[1]).split(',')){const k=t.replace(/^[-+]/,'');if(k in NET_FLAGS)NET_FLAGS[k]=!t.startsWith('-');}}catch(e){}
// u.cgr（修煉品級 {g,jm,ss}）即時同步；?netexp=-liveCgr 關閉。不改存檔結構（cult_grade 已把 cgr 放進 UNIT_KEEP）。
try{if(NET_FLAGS.liveCgr&&typeof NET_LIVE_U!=='undefined'&&!NET_LIVE_U.includes('cgr'))NET_LIVE_U.push('cgr');}catch(e){}
if(typeof UNIT_KEEP!=='undefined'&&!UNIT_KEEP.includes('netPar'))UNIT_KEEP.push('netPar');
const NET_PC_STATS=['body','hp','maxhp','atk','speed','gat','wu','xy','luck','loyal','person','r'];
function netPCParity(u,fresh){if(!u||u.netPar)return u;const t=makePlayer(u.x,u.y);
  if(fresh){for(const k of NET_PC_STATS)if(t[k]!==undefined)u[k]=t[k];u.lg=t.lg;u.realm=0;u.sub=0;u.xiu=0;}
  else{if(!u.lg)u.lg=t.lg;for(const k of ['wu','xy','luck','speed','gat'])if(typeof t[k]==='number')u[k]=Math.max(+u[k]||0,t[k]);
    if((u.realm|0)===0&&!(u.sub|0)&&(u.maxhp||0)<t.maxhp){u.hp=Math.round((u.hp||0)*t.maxhp/Math.max(1,u.maxhp||1));u.maxhp=t.maxhp;}if((u.realm|0)===0&&!(u.sub|0))u.atk=Math.max(+u.atk||0,t.atk);}
  {const f=u.v47t||'';u.v47t=f+(f.includes('x')?'':'x')+(f.includes('r')?'':'r');} // g18 v47Talent 只加給非主角：化身與主角同等 → 標記為已套用，不再額外加成
  u.netPar=1;netLog(fresh?'avatar created with protagonist template':'avatar migrated to protagonist parity',u.np,u.id);return u;}
{const _x=netEnsureAvatar;netEnsureAvatar=function(pk,name){const had=!!netAvatarOf(pk);const u=_x.apply(this,arguments);try{netPCParity(u,!had);}catch(e){netLog('parity err',String(e&&e.message||e));}return u;};}
// 開房／讀檔時：已存在的化身一律遷移一次
function netPCMigrateAll(){const L=S.units.concat(S.dg&&S.dg.W&&S.dg.W.units||[],typeof netParkUnits==='function'?netParkUnits():[]);for(const u of L)if(u&&u.np&&!u.netPar)netPCParity(u,false);}
{const _x=applySave;applySave=function(d){const r=_x.apply(this,arguments);try{if(r)netPCMigrateAll();}catch(e){}return r;};}
{const _x=XW045;XW045=function(){const o=_x.apply(this,arguments);if(o.net){o.net.test=Object.defineProperties(o.net.test||{},{
  pc:{value:pk=>{const u=pk?netAvatarOf(pk):player();if(!u)return null;return {id:u.id,kind:u.kind,np:u.np||null,lg:u.lg?JSON.stringify(u.lg):null,wu:u.wu,xy:u.xy,luck:u.luck,maxhp:u.maxhp,atk:u.atk,speed:u.speed,gat:u.gat,netPar:!!u.netPar,realm:u.realm,name:u.name};},configurable:true},
  migrate:{value:()=>netPCMigrateAll(),configurable:true}});}return o;};}

// ---- 雲端存檔入口預設隱藏（main 2026-11-11）----
// 入口只有 cloud_save.js（build 第 136 項）在 body 末端插入的左下角「雲端存檔」按鈕（#xwCloudLaunch）與其面板 section（#xwCloudPanel）；先找 id，缺 id 才退回文字比對；
// 標題畫面、存讀檔面板、設定裡沒有雲端項目（g*／part1.html 無寫死入口）。不刪程式與資料，只加 data-xw-cloud 標記＋CSS 隱藏。
// 開回：?cloud=1，或 ?netexp=+cloudSave，或執行期 XW_CLOUD.set(true)。本機存檔路徑不經過這裡。
NET_FLAGS.cloudSave=false;
try{const q=new URLSearchParams(location.search);if(q.get('cloud')==='1')NET_FLAGS.cloudSave=true;
  const x=q.get('netexp');if(x&&/(^|,)\+?cloudSave(,|$)/.test(decodeURIComponent(x)))NET_FLAGS.cloudSave=true;}catch(e){}
const XW_CLOUD={tagged:0,
  isEntry(el){try{if(!el||el.nodeType!==1)return false;
    if(el.tagName==='BUTTON'&&(el.textContent||'').trim()==='雲端存檔'&&el.style&&el.style.position==='fixed')return true;
    if(el.tagName==='SECTION'){const h=el.querySelector('h2');if(h&&/雲端存檔/.test(h.textContent||''))return true;}
  }catch(e){}return false;},
  // 先用 cloud_save.js 的固定 id（main 2026-11-11 加），找不到才退回文字比對
  IDS:['xwCloudLaunch','xwCloudPanel'],
  mark(el){if(el&&el.nodeType===1&&!el.hasAttribute('data-xw-cloud')){el.setAttribute('data-xw-cloud','1');XW_CLOUD.tagged++;return true;}return false;},
  byId(){let n=0;for(const id of XW_CLOUD.IDS){const el=document.getElementById(id);if(el){n++;XW_CLOUD.mark(el);}}return n;},
  scan(root){try{if(XW_CLOUD.byId()===XW_CLOUD.IDS.length)return;const els=(root||document).querySelectorAll?(root||document).querySelectorAll('button,section'):[];for(const el of els)if(!el.hasAttribute('data-xw-cloud')&&XW_CLOUD.isEntry(el)){el.setAttribute('data-xw-cloud','1');XW_CLOUD.tagged++;}}catch(e){}},
  apply(){try{document.documentElement.classList.toggle('xw-cloud-on',!!NET_FLAGS.cloudSave);}catch(e){}},
  set(on){NET_FLAGS.cloudSave=!!on;XW_CLOUD.apply();return NET_FLAGS.cloudSave;}};
try{
  const st=document.createElement('style');st.id='xw-cloud-hide';st.textContent='html:not(.xw-cloud-on) [data-xw-cloud]{display:none!important}';
  (document.head||document.documentElement).appendChild(st);XW_CLOUD.apply();
  const start=()=>{XW_CLOUD.scan(document.body);try{new MutationObserver(ms=>{for(const m of ms)for(const n of m.addedNodes){if(n.nodeType!==1)continue;if(n.id&&XW_CLOUD.IDS.includes(n.id))XW_CLOUD.mark(n);else if(XW_CLOUD.isEntry(n))XW_CLOUD.mark(n);if(n.querySelectorAll)XW_CLOUD.scan(n);}}).observe(document.body,{childList:true,subtree:false});}catch(e){}};
  if(document.body)start();else document.addEventListener('DOMContentLoaded',start);
  window.XW_CLOUD=XW_CLOUD;
}catch(e){console.warn('[cloud hide]',e);}
