// ================== v0.3.1：存檔欄位、自動存檔、靈脈石碑、標題畫面、身隕畫面 ==================
const SLOT_AUTO=['auto0','auto1','auto2'],SLOT_MAN=['m0','m1','m2','m3','m4'],SLOT_IDS=['quick',...SLOT_AUTO,...SLOT_MAN];
const LS_PREFIX='xianwu_slot_',SETTINGS_KEY='xianwu_settings',MIG_FLAG='xianwu_migrated_v031',SAVE_FMT=1;
function slotLabel(id){return id==='quick'?'快速存檔':id.startsWith('auto')?'自動存檔 '+(+id[4]+1):'手動存檔 '+(+id[1]+1);}
let settings={autoMin:3,showHelp:true,tut:true};try{Object.assign(settings,JSON.parse(localStorage.getItem(SETTINGS_KEY)||'{}'));}catch(e){}
function saveSettings(){try{localStorage.setItem(SETTINGS_KEY,JSON.stringify(settings));}catch(e){}}
function hashStr(s){let h=0x811c9dc5;for(let i=0;i<s.length;i++){h^=s.charCodeAt(i);h=Math.imul(h,0x01000193);}return (h>>>0).toString(16);}
function esc(s){return String(s==null?'':s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
function isQuota(e){return !!e&&(e.name==='QuotaExceededError'||e.name==='NS_ERROR_DOM_QUOTA_REACHED'||e.code===22||e.code===1014);}
function quotaErr(){const e=new Error('儲存空間不足：請刪除不需要的存檔，或先「匯出」備份後再刪除');e.quota=true;return e;}

// ---- 儲存層：優先 IndexedDB，失敗時退回 localStorage（先寫暫存鍵再提交）----
let idb=null,idbFailed=false,idbP=null;
function idbOpen(){if(idb)return Promise.resolve(idb);if(idbFailed||!window.indexedDB)return Promise.resolve(null);if(idbP)return idbP;
  idbP=new Promise(res=>{let done=false;const fin=v=>{if(!done){done=true;idbP=null;res(v);}};
    try{const rq=indexedDB.open('xianwu_saves',1);rq.onupgradeneeded=()=>{try{rq.result.createObjectStore('slots');}catch(e){}};
      rq.onsuccess=()=>{idb=rq.result;fin(idb);};rq.onerror=()=>{idbFailed=true;fin(null);};rq.onblocked=()=>fin(null);
      setTimeout(()=>{if(!done){idbFailed=true;fin(null);}},2500);}catch(e){idbFailed=true;fin(null);}});return idbP;}
function idbDo(mode,fn){return idbOpen().then(db=>{if(!db)throw new Error('noidb');return new Promise((res,rej)=>{let out;
  const tx=db.transaction('slots',mode),st=tx.objectStore('slots');const r=fn(st);if(r)r.onsuccess=()=>{out=r.result;};
  tx.oncomplete=()=>res(out);tx.onerror=()=>rej(tx.error||new Error('IndexedDB 錯誤'));tx.onabort=()=>rej(tx.error||new Error('IndexedDB 中止'));});});}
async function storePut(id,str){
  try{await idbDo('readwrite',st=>st.put(str,id));try{localStorage.removeItem(LS_PREFIX+id);}catch(e){}return 'idb';}
  catch(err){if(isQuota(err))throw quotaErr();}
  const k=LS_PREFIX+id;
  try{localStorage.setItem(k+'_tmp',str);localStorage.setItem(k,str);localStorage.removeItem(k+'_tmp');return 'ls';}
  catch(err){try{localStorage.removeItem(k+'_tmp');}catch(e){}throw isQuota(err)?quotaErr():err;}
}
async function storeGet(id){let v=null;try{v=await idbDo('readonly',st=>st.get(id));}catch(e){}
  if(v==null){try{v=localStorage.getItem(LS_PREFIX+id);}catch(e){}}return v==null?null:v;}
async function storeDel(id){try{await idbDo('readwrite',st=>st.delete(id));}catch(e){}try{localStorage.removeItem(LS_PREFIX+id);localStorage.removeItem(LS_PREFIX+id+'_tmp');}catch(e){}}
function parseRec(str){if(!str)return null;try{const r=JSON.parse(str);if(!r||typeof r.data!=='string'||!r.meta)return {bad:'格式不符'};
  if(r.sum!==hashStr(r.data))return {bad:'檢查碼不符（檔案可能損毀）',meta:r.meta};return r;}catch(e){return {bad:'無法解析'};}}
let slotCache=null;
async function listSlots(){if(slotCache)return slotCache;const out={};for(const id of SLOT_IDS){const s=await storeGet(id);out[id]=s?parseRec(s):null;}slotCache=out;return out;}
function latestSlot(all){let best=null;for(const id of SLOT_IDS){const r=all[id];if(r&&!r.bad&&(!best||r.meta.savedAt>all[best].meta.savedAt))best=id;}return best;}

// ---- 存檔內容 ----
const SHICHEN='子丑寅卯辰巳午未申酉戌亥';
function gameDay(t){return {day:Math.floor(t/300)+1,sc:SHICHEN[Math.floor((t%300)/25)]+'時'};}
function fmtDur(t){t=Math.floor(t);const h=Math.floor(t/3600),m=Math.floor(t%3600/60),s=t%60;return (h?h+' 小時 ':'')+m+' 分 '+(h?'':s+' 秒');}
function fmtDate(ms){try{return new Date(ms).toLocaleString('zh-TW',{hour12:false,year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit'});}catch(e){return new Date(ms).toISOString();}}
const REGION_AT=[['start','宗門山谷',14],['qinghe','青禾村一帶',13],['liuxi','柳溪村一帶',13],['heifeng','黑風寨附近',12],['chilang','赤狼寨附近',12],['ruin','上古遺跡',12],['lake','鏡湖之畔',12]];
function regionName(x,y){let best=null,bd=1e9;for(const [k,n,r] of REGION_AT){const a=ANCH&&ANCH[k];if(!a)continue;const d=dist(x,y,a.x,a.y);if(d<r&&d<bd){bd=d;best=n;}}
  if(best)return best;const k=clamp(Math.floor(y),0,N-1)*N+clamp(Math.floor(x),0,N-1);return (BIOME_NAME[biome[k]]||'荒野');}
function makeThumb(){try{const tw=192,th=108,c=document.createElement('canvas');c.width=tw;c.height=th;const g=c.getContext('2d');
  const sw=cv.width,sh=cv.height,r=tw/th;let w=sw,h=sw/r;if(h>sh){h=sh;w=sh*r;}g.drawImage(cv,(sw-w)/2,(sh-h)/2,w,h,0,0,tw,th);return c.toDataURL('image/jpeg',0.6);}catch(e){return null;}}
function slotMeta(id,prev,opt){opt=(!opt||typeof opt!=='object')?{reason:typeof opt==='string'?opt:''}:opt;const p=player()||{x:0,y:0,realm:0},gd=gameDay(S.time||0);const keep=prev&&!prev.bad&&prev.meta&&prev.meta.custom&&!opt.auto;
  const rn=(REALMS[p.realm]&&REALMS[p.realm].n)||'';
  return {id,name:opt.name||(keep?prev.meta.name:regionName(p.x||0,p.y||0)+'・'+rn),custom:!!(opt.name||keep),realm:rn,nd:typeof disciples==='function'?disciples().length:0,
    day:gd.day,sc:gd.sc,play:S.time,savedAt:Date.now(),region:regionName(p.x||0,p.y||0),ver:XW_VER,reason:opt.reason||''};}
async function writeSlot(id,opt={}){
  const all=await listSlots();
  const snap=snapshot();
  if(!snap||typeof snap!=='object')throw new Error('存檔內容為空');
  if(snap.v==null)snap.v=SAVE_VER;
  const data=JSON.stringify(snap);if(typeof data!=='string')throw new Error('存檔序列化失敗');
  const rec={fmt:SAVE_FMT,meta:slotMeta(id,all[id],opt),data,thumb:makeThumb(),sum:hashStr(data)};
  slotCache=null;await storePut(id,JSON.stringify(rec));return rec.meta;}
async function loadSlot(id){
  const r=parseRec(await storeGet(id));if(!r)throw new Error('這一格沒有存檔');if(r.bad)throw new Error('存檔損毀：'+r.bad);
  if(r.legacy==='v1'){if(!migrateOld(r.data))throw new Error('舊存檔轉換失敗');}
  else{const d=JSON.parse(r.data);if(typeof dgValidateLive==='function')dgValidateLive(d);if(!applySave(d))throw new Error('讀檔失敗');}
  afterLoad();return r.meta;}
function afterLoad(){S._shr=null;shrines();deathShow(false);closeSaves();closeShrine();showTitle(false);autoT=0;const p=player();if(p&&p.dead&&!p.cultYS){p.dead=false;p.hp=p.maxhp;}}

// ---- 自動存檔 ----
let autoT=0,autoBusy=false,lastAuto=-1e9,spinT=null;
function showSpin(on){const el=$('autosave');if(!el)return;clearTimeout(spinT);if(on)el.classList.add('on');else spinT=setTimeout(()=>el.classList.remove('on'),700);}
function tickAutosave(dt){if(!settings.autoMin)return;autoT+=dt;if(autoT>=settings.autoMin*60){autoT=0;autoSave('定時',true);}}
function autoSaveSoon(reason){setTimeout(()=>autoSave(reason),400);}
async function autoSave(reason,force){
  if(autoBusy||titleOpen)return false;const p=player();if(!p||p.dead)return false;if(!force&&performance.now()-lastAuto<15000)return false;
  autoBusy=true;lastAuto=performance.now();showSpin(true);
  try{const all=await listSlots();let tgt=SLOT_AUTO.find(i=>!all[i]||all[i].bad);if(!tgt)tgt=SLOT_AUTO.slice().sort((a,b)=>all[a].meta.savedAt-all[b].meta.savedAt)[0];
    await writeSlot(tgt,{auto:true,reason});S.stats.autosaves=(S.stats.autosaves||0)+1;return tgt;}
  catch(err){toast('自動存檔失敗：'+err.message);return false;}
  finally{autoBusy=false;showSpin(false);}}
async function quickSave(){try{showSpin(true);await writeSlot('quick',{reason:'快速存檔'});toast('已快速存檔');return true;}catch(err){toast('存檔失敗：'+err.message);return false;}finally{showSpin(false);}}
async function quickLoad(){const all=await listSlots();if(!all.quick){toast('還沒有快速存檔（F5）');return false;}
  if(!await dlg('讀取快速存檔？目前未存檔的進度會遺失。',{ok:'讀取'}))return false;try{await loadSlot('quick');toast('已讀取快速存檔');return true;}catch(err){toast(err.message);return false;}}

// ---- 舊存檔轉換：v0.3.0（localStorage 單一存檔）與 v0.2.x 變成自動存檔欄位 ----
async function migrateLegacy(){
  try{if(localStorage.getItem(MIG_FLAG))return 0;}catch(e){return 0;}
  let n=0;const all=await listSlots();const free=SLOT_AUTO.filter(i=>!all[i]);
  const put=async(meta,data,legacy)=>{const id=free.shift();if(!id)return;const rec={fmt:SAVE_FMT,meta:Object.assign({id,custom:true,savedAt:Date.now(),ver:'舊版',reason:'舊存檔轉入'},meta),data,thumb:null,sum:hashStr(data)};if(legacy)rec.legacy=legacy;await storePut(id,JSON.stringify(rec));n++;};
  try{const raw=localStorage.getItem(SAVE_KEY);if(raw){const d=JSON.parse(raw);const pl=(d.units||[]).find(u=>u.kind==='player')||{};const gd=gameDay(d.time||0);
      await put({name:'v0.3.0 舊存檔',realm:(REALMS[pl.realm|0]||REALMS[0]).n,nd:(d.units||[]).filter(u=>u.kind==='disciple').length,day:gd.day,sc:gd.sc,play:d.time||0,region:'（舊版存檔）'},raw);}}catch(e){console.warn('v0.3.0 存檔轉換略過',e);}
  try{const raw=localStorage.getItem(OLD_SAVE_KEY);if(raw){const o=JSON.parse(raw);const pl=(o.units||[]).find(u=>u.kind==='player')||{};
      await put({name:'v0.2 舊存檔（會轉到大地圖）',realm:(REALMS[clamp(pl.realm|0,0,3)]).n,nd:(o.units||[]).filter(u=>u.kind!=='player').length,day:1,sc:'子時',play:o.time||0,region:'（舊版存檔）'},raw,'v1');}}catch(e){console.warn('v0.2 存檔轉換略過',e);}
  slotCache=null;try{localStorage.setItem(MIG_FLAG,'1');}catch(e){}
  if(n)toast(`已把 ${n} 個舊版存檔放進「自動存檔」欄位（原資料保留）`);return n;}

// ---- 匯出／匯入 ----
async function exportText(id){
  if(id==null||id===''){
    const snap=snapshot();if(!snap||typeof snap!=='object')throw new Error('這一格無法匯出');
    if(snap.v==null)snap.v=SAVE_VER;
    const data=JSON.stringify(snap);if(typeof data!=='string')throw new Error('這一格無法匯出');
    const rec={fmt:SAVE_FMT,meta:slotMeta('export',null,{reason:'匯出'}),data,thumb:null,sum:hashStr(data)};
    return JSON.stringify({app:'仙武之體',kind:'save',fmt:SAVE_FMT,rec});
  }
  const s=await storeGet(id);const r=parseRec(s);if(!r||r.bad)throw new Error('這一格無法匯出');return JSON.stringify({app:'仙武之體',kind:'save',fmt:SAVE_FMT,rec:JSON.parse(s)});
}
async function exportSlot(id){let txt;try{txt=await exportText(id);}catch(err){toast(err.message);return;}
  const r=JSON.parse(txt).rec;const fname=`仙武之體_${r.meta.name}_${new Date(r.meta.savedAt).toISOString().slice(0,10)}.json`.replace(/[\\/:*?"<>|\s]/g,'_');
  const msg=IN_WECHAT?'匯出存檔：微信內建瀏覽器無法下載檔案。請按「複製文字」，或長按下面的文字框 →「全選」→「拷貝」，再貼到備忘錄或傳給自己（例如「檔案傳輸助手」）。換裝置時用「匯入」貼上即可還原。'
    :'匯出存檔：可以下載成檔案，或複製下面的文字貼到備忘錄（換手機／電腦時用「匯入」還原）。';
  const act=await dlg(msg,IN_WECHAT?{text:txt,readonly:true,copy:true,ok:'完成',cancel:false}:{text:txt,readonly:true,copy:true,ok:'下載檔案',cancel:'關閉'});
  if(act==='ok'&&!IN_WECHAT){try{const blob=new Blob([txt],{type:'application/json'});const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=fname;document.body.appendChild(a);a.click();setTimeout(()=>{URL.revokeObjectURL(a.href);a.remove();},3000);toast('已下載 '+fname+'（若沒有反應，請改用「複製文字」）');}catch(e){toast('下載失敗，請改用「複製文字」');}}}
// 複製：在點擊當下同步執行（iOS／微信需要使用者手勢），失敗時保留視窗並選取文字，讓玩家長按拷貝
function dlgCopy(){const ta=$('dlg_ta'),st=$('dlg_st');if(!ta)return;const txt=ta.value;let done=false;
  try{const ro=ta.readOnly;ta.readOnly=false;ta.focus();ta.select();ta.setSelectionRange(0,txt.length);done=document.execCommand&&document.execCommand('copy');ta.readOnly=ro;}catch(e){done=false;}
  const okMsg=()=>{if(st){st.textContent='✔ 已複製存檔文字，可以貼到備忘錄或聊天室保存';st.className='dst ok';}toast('已複製存檔文字');};
  const failMsg=()=>{try{ta.focus();ta.select();ta.setSelectionRange(0,txt.length);}catch(e){}if(st){st.textContent='無法自動複製：請長按上面的文字框 →「全選」→「拷貝」';st.className='dst no';}};
  if(done){okMsg();return;}
  if(navigator.clipboard&&navigator.clipboard.writeText){navigator.clipboard.writeText(txt).then(okMsg,failMsg);}else failMsg();}
async function importText(txt,target){
  let o;try{o=JSON.parse(String(txt).trim());}catch(e){throw new Error('不是有效的存檔文字');}
  const rec=o&&o.rec;if(!o||o.app!=='仙武之體'||!rec||typeof rec.data!=='string'||!rec.meta)throw new Error('不是仙武之體的存檔');
  if(rec.sum!==hashStr(rec.data))throw new Error('檢查碼不符：存檔內容不完整或被修改過');
  if(!rec.legacy){try{const d=JSON.parse(rec.data);if(!d||!(d.v===SAVE_VER||d.v===3||d.v===4||d.v===5||d.v===6||d.v===7))throw 0;if(typeof dgValidateLive==='function')dgValidateLive(d);}catch(e){throw new Error('存檔資料損毀，未更動目前進度或本機欄位');}}
  const all=await listSlots();let id=target||SLOT_MAN.find(i=>!all[i]);
  if(!id){if(!await dlg('手動存檔已滿，要覆蓋最舊的一格嗎？',{ok:'覆蓋'}))return null;id=SLOT_MAN.slice().sort((a,b)=>((all[a].meta||{}).savedAt||0)-((all[b].meta||{}).savedAt||0))[0];}
  rec.meta=Object.assign({},rec.meta,{id,custom:true,name:rec.meta.name||'匯入的存檔'});slotCache=null;await storePut(id,JSON.stringify(rec));
  if(!rec.legacy){const d=JSON.parse(rec.data);if(!applySave(d))throw new Error('讀檔失敗');afterLoad();}
  return id;}
async function importFlow(){
  const r=await dlg('匯入存檔：貼上之前匯出的文字，或選擇 .json 檔案。會放進第一個空的「手動存檔」欄位。',{text:'',file:true,ok:'匯入',cancel:'取消'});
  if(!r||r==='cancel')return;try{const id=await importText(dlgVal,null);if(id){toast('已匯入到「'+slotLabel(id)+'」');renderSaves();}}catch(err){toast('匯入失敗：'+err.message);}}

// ---- 通用對話框（不用瀏覽器原生 confirm，手機上比較好按）----
let dlgOpen=false,dlgRes=null,dlgVal='';
const IN_WECHAT=/MicroMessenger/i.test(navigator.userAgent);
function dlg(msg,o={}){return new Promise(res=>{dlgOpen=true;dlgRes=res;dlgVal=o.value||o.text||'';const el=$('dlg');
  el.innerHTML=`<div class="dbox"><div class="dmsg">${esc(msg)}</div>${o.input!=null?`<input id="dlg_in" maxlength="24" value="${esc(o.value||'')}">`:''}${o.text!=null?`<textarea id="dlg_ta" ${o.readonly?'readonly':''} placeholder="在這裡貼上存檔文字">${esc(o.text)}</textarea>${o.copy?'<div id="dlg_st" class="dst"></div>':''}`:''}${o.file?'<label class="btn dfile">選擇檔案…<input type="file" id="dlg_file" accept=".json,application/json,text/plain"></label>':''}
  <div class="dbtns">${o.cancel!==false?`<button class="btn" data-d="cancel">${esc(o.cancel||'取消')}</button>`:''}${o.copy?'<button class="btn" data-c="copy">📋 複製文字</button>':''}${o.alt?`<button class="btn" data-d="alt">${esc(o.alt)}</button>`:''}<button class="btn pri" data-d="ok">${esc(o.ok||'確定')}</button></div></div>`;
  el.classList.add('open');const inp=$('dlg_in');if(inp)setTimeout(()=>{inp.focus();inp.select();},50);
  const f=$('dlg_file');if(f)f.addEventListener('change',()=>{const fl=f.files&&f.files[0];if(!fl)return;const rd=new FileReader();rd.onload=()=>{$('dlg_ta').value=rd.result;};rd.readAsText(fl);});});}
function dlgClose(v){const el=$('dlg');const ta=$('dlg_ta'),inp=$('dlg_in');dlgVal=inp?inp.value:ta?ta.value:dlgVal;el.classList.remove('open');el.innerHTML='';dlgOpen=false;const r=dlgRes;dlgRes=null;
  if(r)r(v==='ok'?(inp?dlgVal:(ta&&!ta.readOnly?'ok':'ok')):v==='alt'?'alt':false);}
document.getElementById('dlg').addEventListener('click',ev=>{if(ev.target.closest('[data-c="copy"]')){dlgCopy();return;}const b=ev.target.closest('[data-d]');if(b){dlgClose(b.dataset.d);return;}if(ev.target===$('dlg'))dlgClose('cancel');});

// ---- 存檔欄位列表 ----
let savesOpen=false,savesMode='load';
async function openSaves(mode){savesMode=mode;savesOpen=true;setMenu(false);closeOverlays();$('saves').classList.add('open');await renderSaves();}
function closeSaves(){savesOpen=false;$('saves').classList.remove('open');}
function slotCard(id,r){
  const empty=!r,bad=r&&r.bad,m=r&&r.meta||{};const inGame=!titleOpen;
  const canWrite=savesMode==='save'&&inGame&&!id.startsWith('auto');
  let btns='';
  if(canWrite)btns+=`<button class="btn pri" data-s="write">${empty?'存到這格':'覆蓋'}</button>`;
  if(r&&!bad)btns+=`<button class="btn ${savesMode==='load'?'pri':''}" data-s="load">讀取</button><button class="btn" data-s="rename">重新命名</button><button class="btn" data-s="export">匯出</button>`;
  if(r)btns+=`<button class="btn warn" data-s="del">刪除</button>`;
  const th=r&&r.thumb?`<img src="${r.thumb}" alt="">`:`<span>${empty?'空':'無縮圖'}</span>`;
  const info=empty?'<div class="sm">（空的欄位）</div>':bad?`<div class="sm no">⚠ 存檔損毀：${esc(r.bad)}</div>`:
    `<div class="sm"><b class="rl">${esc(m.realm)}</b>・弟子 ${m.nd|0} 名・第 ${m.day|0} 天 ${esc(m.sc||'')}</div><div class="sm">${esc(m.region||'')}・遊玩 ${fmtDur(m.play||0)}</div><div class="sm dim">${fmtDate(m.savedAt)}${m.reason?'・'+esc(m.reason):''}</div>`;
  return `<div class="slot${empty?' empty':''}" data-id="${id}"><div class="th">${th}</div><div class="si"><div class="sn"><small>${slotLabel(id)}</small> ${empty?'':esc(m.name||'')}</div>${info}<div class="sa">${btns}</div></div></div>`;}
async function renderSaves(){
  const all=await listSlots();const el=$('saves');const sc=el.scrollTop;
  el.innerHTML=`<button class="btn x" data-s="close">✖ 關閉</button><h3>${savesMode==='save'?'存檔':'讀取存檔'}</h3>
  <div class="stools"><button class="btn" data-s="mode">${savesMode==='save'?'切換到「讀取」':'切換到「存檔」'}</button><button class="btn" data-s="import">匯入存檔</button><span class="dim">${idb?'儲存在本機 IndexedDB':'儲存在本機 localStorage'}；換裝置請用「匯出／匯入」${IN_WECHAT?'<br>⚠ 在微信內遊玩：登出微信或清除微信快取時，存檔可能會被清空，請常用「匯出 → 複製文字」備份':''}</span></div>
  <div class="sec"><b>快速存檔</b> <span class="dim">（電腦 F5 存、F9 讀）</span></div>${slotCard('quick',all.quick)}
  <div class="sec"><b>自動存檔</b> <span class="dim">（每 ${settings.autoMin||'—'} 分鐘、突破、建築完成、石碑靜坐時輪流寫入）</span></div>${SLOT_AUTO.map(i=>slotCard(i,all[i])).join('')}
  <div class="sec"><b>手動存檔</b></div>${SLOT_MAN.map(i=>slotCard(i,all[i])).join('')}`;
  el.scrollTop=sc;}
document.getElementById('saves').addEventListener('click',async ev=>{const b=ev.target.closest('[data-s]');if(!b)return;const a=b.dataset.s,card=b.closest('.slot'),id=card&&card.dataset.id;
  if(a==='close'){closeSaves();if(titleOpen)renderTitle();return;}
  if(a==='mode'){if(titleOpen){toast('請先開始或讀取遊戲才能存檔');return;}savesMode=savesMode==='save'?'load':'save';renderSaves();return;}
  if(a==='import'){importFlow();return;}
  const all=await listSlots();const r=all[id];
  if(a==='write'){if(r&&!await dlg(`覆蓋「${slotLabel(id)}」${r.meta&&r.meta.name?'（'+r.meta.name+'）':''}？`,{ok:'覆蓋'}))return;
    try{showSpin(true);await writeSlot(id,{reason:'手動存檔'});toast('已存到「'+slotLabel(id)+'」');}catch(err){toast('存檔失敗：'+err.message);}finally{showSpin(false);}renderSaves();return;}
  if(a==='load'){if(!titleOpen&&!(player()&&player().dead)&&S.time>20&&!await dlg(`讀取「${r.meta.name}」？目前未存檔的進度會遺失。`,{ok:'讀取'}))return;
    try{await loadSlot(id);toast('已讀取：'+r.meta.name);}catch(err){toast(err.message);}return;}
  if(a==='rename'){const v=await dlg('新的存檔名稱：',{input:'',value:r.meta.name||'',ok:'改名'});if(v===false||v==null)return;const nmv=String(v).trim().slice(0,24);if(!nmv)return;
    r.meta.name=nmv;r.meta.custom=true;try{slotCache=null;await storePut(id,JSON.stringify({fmt:r.fmt||SAVE_FMT,meta:r.meta,data:r.data,thumb:r.thumb,sum:r.sum,legacy:r.legacy}));}catch(err){toast(err.message);}renderSaves();return;}
  if(a==='export'){exportSlot(id);return;}
  if(a==='del'){if(!await dlg(`確定刪除「${slotLabel(id)}」${r.meta&&r.meta.name?'（'+r.meta.name+'）':''}？刪除後無法復原。`,{ok:'刪除'}))return;slotCache=null;await storeDel(id);toast('已刪除');renderSaves();if(titleOpen)renderTitle();}
});

// ---- 靈脈石碑 ----
const SHRINE_DEF=[['起源','start',3,3],['青禾','qinghe',5,4],['柳溪','liuxi',-5,-4],['鏡湖','lake',-6,5],['古蹟','ruin',-7,-6],['蒼嶺',null,96,30],['幽林',null,76,84]];
function shrines(){if(S._shr)return S._shr;const out=[];if(!ANCH)return out;
  SHRINE_DEF.forEach(([n,a,dx,dy],k)=>{const x=a?ANCH[a].x+dx:dx+xwWorldOff(),y=a?ANCH[a].y+dy:dy+xwWorldOff();const f=nearestFree(clamp(x,2,N-3),clamp(y,2,N-3),startComp)||nearestFree(x,y,-1);if(f)out.push({id:k,name:'靈脈石碑・'+n,short:n,i:f.i,j:f.j,x:f.i+0.5,y:f.j+0.5});});
  S._shr=out;if(!S.flags.shr)S.flags.shr={found:[0],rs:0};return out;}
const shrFound=s=>S.flags.shr&&S.flags.shr.found.includes(s.id);
function shrineById(id){return shrines().find(s=>s.id===id);}
function nearShrine(r){const p=player();if(!p||p.dead)return null;let best=null,bd=r||2.2;for(const s of shrines()){const d=dist(p.x,p.y,s.x,s.y);if(d<bd){bd=d;best=s;}}return best;}
function shrineAtScreen(x,y){for(const s of shrines()){const q=iso(s.x,s.y),sp=worldToScreen(q.x,q.y),z=cam.zoom;if(Math.abs(x-sp.x)<16*z&&y<sp.y+8*z&&y>sp.y-58*z)return s;}return null;}
function tickShrines(){const p=player();if(!p||p.dead)return;
  for(const s of shrines())if(!shrFound(s)&&dist(p.x,p.y,s.x,s.y)<7){S.flags.shr.found.push(s.id);fx('ring',s.x,s.y,'#8fe8ff');ping(s.x,s.y);mmDirty=true;toast(`發現「${s.name}」：靠近按 V（手機按「石碑」）可靜坐、傳送、設為復甦點`);}
  if(p.shrineGoal!=null){const s=shrineById(p.shrineGoal);if(s&&dist(p.x,p.y,s.x,s.y)<2.2){p.shrineGoal=null;openShrine(s);}else if(!p.task)p.shrineGoal=null;}
  const dp=S.flags.drop;if(dp&&dist(p.x,p.y,dp.x,dp.y)<1.4){p.xiu+=(dp.xiu||0);const res=dp.res||{};for(const k in res)S.res[k]=(S.res[k]||0)+res[k];S.flags.drop=null;fx('ring',p.x,p.y,'#d8a0ff');mmDirty=true;toast('取回了遺落之物：修為 +'+(dp.xiu||0)+(Object.keys(res).length?'、資源已歸還':''));}}
function goShrine(s){const p=player();if(!p||p.dead)return;if(dist(p.x,p.y,s.x,s.y)<2.2){openShrine(s);return;}selUnits=[p.id];commandMove([p],s.x+0.6,s.y+0.6,false);p.shrineGoal=s.id;}
let shrineOpen=null;
function openShrine(s){closeOverlays();shrineOpen=s.id;if(!shrFound(s)){S.flags.shr.found.push(s.id);mmDirty=true;}const p=player();p.task=null;p.path=[];p.vx=p.vy=0;renderShrine();$('shrine').classList.add('open');}
function closeShrine(){shrineOpen=null;$('shrine').classList.remove('open');}
function renderShrine(){const s=shrineById(shrineOpen);if(!s)return;const rs=S.flags.shr.rs,p=player();
  const others=shrines().filter(o=>o.id!==s.id&&shrFound(o));
  $('shrine').innerHTML=`<button class="btn x" data-h="close">✖ 離開</button><h3>${esc(s.name)}</h3><div class="dim">${esc(regionName(s.x,s.y))}・靈脈在石中流轉，盤坐其前可以調息。${rs===s.id?'<b class="ok">（目前的復甦點）</b>':''}</div>
  <div class="hbtns"><button class="btn pri big" data-h="rest">🧘 靜坐調息</button><button class="btn big" data-h="rs" ${rs===s.id?'disabled':''}>${rs===s.id?'✔ 已是復甦點':'設為復甦點'}</button><button class="btn big" data-h="saves">存檔／讀檔</button></div>
  <div class="dim sm">靜坐：氣血全滿、技能冷卻歸零、身旁弟子一起回復、自動存檔並設為復甦點；<span class="no">但野外的妖獸也會重新出沒</span>。氣血 ${Math.round(p.hp)}/${p.maxhp}</div>
  <div class="sec"><b>傳送</b> <span class="dim">（只能前往已發現、已點亮的石碑）</span></div>
  ${others.length?others.map(o=>`<div class="trow"><span>◆ ${esc(o.name)} <span class="dim">${esc(regionName(o.x,o.y))}・約 ${Math.round(dist(o.x,o.y,s.x,s.y))} 格</span></span><button class="btn" data-h="tp" data-id="${o.id}">傳送</button></div>`).join(''):'<div class="dim">還沒有發現其他石碑。走遍大地圖，石碑靠近時會亮起。</div>'}
  <div class="dim sm" style="margin-top:6px">已發現 ${S.flags.shr.found.length}／${shrines().length} 座石碑</div>`;}
function shrineRest(s){const p=player();p.hp=p.maxhp;p.shield=0;for(const k in p.acd)p.acd[k]=0;p.medit=false;
  for(const d of disciples())if(!d.dead&&dist(d.x,d.y,p.x,p.y)<8)d.hp=d.maxhp;S.flags.shr.rs=s.id;
  let n=0;for(const z of ZONES){const cur=S.enemies.filter(e=>e.zone===z.id).length;for(let k=cur;k<z.cap;k++){if(dist(z.x,z.y,p.x,p.y)<10)continue;if(spawnInZone(z))n++;}}
  for(const e of S.enemies)if(e.zone!=null&&!e.raid){e.hp=e.maxhp;}
  S.stats.rests=(S.stats.rests||0)+1;fx('ring',p.x,p.y,'#8fe8ff');fx('break',p.x,p.y,'#8fe8ff');
  toast(`靜坐調息完畢：氣血全滿，已設為復甦點${n?`；野外有 ${n} 隻妖獸重新出沒`:''}`);autoSave('石碑靜坐',true);renderShrine();return n;}
function shrineTravel(to){const p=player();if(!p||p.dead||!shrFound(to))return false;const f=nearestFree(to.x+1,to.y+1,startComp)||{i:to.i,j:to.j};
  fx('ring',p.x,p.y,'#8fe8ff');p.x=f.i+0.5;p.y=f.j+0.5;p.path=[];p.task=null;if(p.queue)p.queue.length=0;p.vx=p.vy=0;p.shrineGoal=null;
  for(const d of disciples())if(d.job==='follow'&&!d.dead&&!d.inside){const g=nearestFree(p.x+rnd()*2-1,p.y+rnd()*2-1,startComp);if(g){d.x=g.i+0.5;d.y=g.j+0.5;d.path=[];}}
  const q=iso(p.x,p.y);cam.x=q.x;cam.y=q.y;cam.follow=true;reveal(p.x,p.y,10);mmDirty=true;fx('ring',p.x,p.y,'#8fe8ff');closeShrine();toast('傳送至「'+to.name+'」');S.stats.travels=(S.stats.travels||0)+1;return true;}
document.getElementById('shrine').addEventListener('click',ev=>{const b=ev.target.closest('[data-h]');if(!b)return;const s=shrineById(shrineOpen);if(!s)return;const a=b.dataset.h;
  if(a==='close')closeShrine();else if(a==='rest')shrineRest(s);else if(a==='rs'){S.flags.shr.rs=s.id;toast('已將「'+s.name+'」設為復甦點');renderShrine();}
  else if(a==='saves'){closeShrine();openSaves('save');}else if(a==='tp')shrineTravel(shrineById(+b.dataset.id));});
function drawShrine(s){const lit=shrFound(s),t=performance.now()/1000,p=iso(s.x,s.y);
  ellipse(p.x,p.y+2,18,8,'rgba(0,0,0,0.3)');
  prism(s.x-0.42,s.y-0.42,s.x+0.42,s.y+0.42,0,5,'#5b5f63','#474b4f','#6e7377');
  prism(s.x-0.2,s.y-0.12,s.x+0.2,s.y+0.12,5,44,lit?'#7d8a8f':'#6a6f72',lit?'#5e6a70':'#55595c',lit?'#94a3a8':'#7a7f82');
  const top=P(s.x,s.y,44);poly([{x:top.x-9,y:top.y+2},{x:top.x,y:top.y-6},{x:top.x+9,y:top.y+2}],lit?'#9aa8ad':'#7c8184');
  if(lit){const a=0.55+0.35*Math.sin(t*2+s.id);ctx.globalAlpha=a;ctx.strokeStyle='#8fe8ff';ctx.lineWidth=1.6;const c=P(s.x+0.2,s.y,30);
    ctx.beginPath();for(let k=0;k<4;k++){ctx.moveTo(c.x-3,c.y-10+k*6);ctx.lineTo(c.x+3,c.y-12+k*6);}ctx.stroke();
    const g=ctx.createRadialGradient(c.x,c.y,1,c.x,c.y,26);g.addColorStop(0,'rgba(143,232,255,0.35)');g.addColorStop(1,'rgba(143,232,255,0)');ctx.fillStyle=g;ctx.fillRect(c.x-26,c.y-26,52,52);ctx.globalAlpha=1;ctx.lineWidth=1;
    if(isExplored(s.x,s.y))label(s.short+'碑',p.x,p.y-56,S.flags.shr.rs===s.id?'#ffe27a':'#bff4ff');}
  else if(isExplored(s.x,s.y))label('？',p.x,p.y-56,'#bbb');}
function drawDrop(){const d=S.flags.drop;if(!d)return;const p=P(d.x,d.y,14+3*Math.sin(performance.now()/300));const g=ctx.createRadialGradient(p.x,p.y,1,p.x,p.y,14);g.addColorStop(0,'rgba(230,190,255,0.95)');g.addColorStop(1,'rgba(160,90,255,0)');ctx.fillStyle=g;ctx.fillRect(p.x-14,p.y-14,28,28);label('遺落之物',p.x,p.y-16,'#e6c8ff');}
function mmShrines(k){mctx.textAlign='center';for(const s of shrines()){const p=mmPt(s.x,s.y),lit=shrFound(s);if(!lit&&!isExplored(s.x,s.y))continue;mctx.fillStyle=lit?(S.flags.shr.rs===s.id?'#ffe27a':'#8fe8ff'):'#888';mctx.beginPath();mctx.moveTo(p.x,p.y-3.5*k);mctx.lineTo(p.x+2.5*k,p.y);mctx.lineTo(p.x,p.y+3.5*k);mctx.lineTo(p.x-2.5*k,p.y);mctx.closePath();mctx.fill();
  if(mmBig&&lit){mctx.font=`bold ${Math.round(5*k)}px sans-serif`;mctx.fillText(s.short+'碑',p.x,p.y-5*k);}}
  const d=S.flags.drop;if(d){const p=mmPt(d.x,d.y);mctx.fillStyle='#d8a0ff';mctx.fillRect(p.x-2*k,p.y-2*k,4*k,4*k);}}

// ---- 身隕與復甦 ----
let deathOpen=false;
const DEATH_GEAR_LOSS_CHANCE=0.15;
const DEATH_GEAR_SAFE_SLOTS={z1:1,z2:1,z3:1,z4:1,z5:1};
const DEATH_GEAR_SLOT_ORDER=['w','a','hd','hn','pt','sh','f','c1','c2','c3','c4'];
function deathGearBound(it){
  if(!it)return true;
  if(it.slot==='z'||it.gfId||it.t==='gongfa'||it.type==='gongfa')return true;
  if(it.bound||it.soulbound||it.quest)return true;
  if(it.boundTo!=null&&it.boundTo!=='')return true;
  if(it.imprint!=null&&it.imprint!=='')return true;
  if(it.questId!=null&&it.questId!=='')return true;
  return false;
}
function deathGearCandidates(p){
  const eq=p&&p.eq||{},seen={},out=[];
  const keys=DEATH_GEAR_SLOT_ORDER.concat(Object.keys(eq));
  for(const s of keys){
    if(seen[s]||!eq[s])continue;seen[s]=1;
    if(DEATH_GEAR_SAFE_SLOTS[s]||s==='z'||/^z[1-5]$/.test(s))continue;
    if(deathGearBound(eq[s]))continue;
    out.push(s);
  }
  return out;
}
function deathLoseGear(p){
  const slots=deathGearCandidates(p);
  if(!slots.length||Math.random()>=DEATH_GEAR_LOSS_CHANCE)return null;
  const s=slots[Math.floor(Math.random()*slots.length)];
  const it=p.eq[s];if(!it)return null;
  const name=typeof itemName==='function'?itemName(it):(it.n||it.t||'裝備');
  p.eq[s]=null;
  try{if(typeof gearApply==='function')gearApply(p);}catch(e){}
  return name;
}
function onPlayerDeath(u){if(!u||(u.dead&&u.respawn>1e8))return;u.dead=true;u.respawn=1e9;u.task=null;u.path=[];u.vx=u.vy=u.dvx=u.dvy=0;u.medit=false;u.deathAt={x:u.x,y:u.y};S.stats.deaths=(S.stats.deaths||0)+1;closeOverlays();closeShrine();setTimeout(()=>deathShow(true),700);}
function deathPenalty(){const p=player();return {xiu:Math.floor((p.xiu||0)*0.3),res:{}};}
function deathShow(on){deathOpen=on;const el=$('death');if(!on){el.classList.remove('open');return;}const p=player();const pen=deathPenalty();const rs=shrineById(S.flags.shr&&S.flags.shr.rs)||shrines()[0];
  const gearPct=Math.round(DEATH_GEAR_LOSS_CHANCE*100);
  el.innerHTML=`<div class="dbox"><div class="dt">身 隕</div><div class="ds">氣血耗盡，倒在了 ${esc(regionName(p.x,p.y))}……</div>
  <button class="btn pri big" data-x="revive">在石碑復甦 <span class="tag">建議</span><br><small>於「${esc(rs?rs.name:'起點')}」醒來；修為 −${pen.xiu}。材料不會遺落，裝備有${gearPct}%機率被路過的修仙者拿走。<br>遺落之物（修為）會留在倒下處，回去就能取回${S.flags.drop?'（上一次未取回的會消散）':''}</small></button>
  <button class="btn big" data-x="load">讀取存檔<br><small>回到之前的存檔（自動存檔／手動存檔）</small></button></div>`;
  el.classList.add('open');}
function revive(){const p=player();if(!p)return;const pen=deathPenalty();const at=p.deathAt||{x:p.x,y:p.y};
  p.xiu-=pen.xiu;
  const lostGear=deathLoseGear(p);
  S.flags.drop=pen.xiu>0?{x:at.x,y:at.y,xiu:pen.xiu,res:{}}:null;
  const s=shrineById(S.flags.shr.rs)||shrines()[0];const f=s?nearestFree(s.x+1,s.y+1,startComp):nearestFree(ANCH.start.x,ANCH.start.y,startComp);
  p.x=f.i+0.5;p.y=f.j+0.5;p.hp=p.maxhp;p.dead=false;p.respawn=0;p.path=[];p.task=null;p.vx=p.vy=0;
  for(const e of S.enemies)if(e.target&&e.target.k==='u'&&e.target.id===p.id)e.target=null;
  const q=iso(p.x,p.y);cam.x=q.x;cam.y=q.y;cam.follow=true;selUnits=[p.id];reveal(p.x,p.y,9);mmDirty=true;deathShow(false);fx('ring',p.x,p.y,'#8fe8ff');
  toast(`在「${s?s.name:'起點'}」復甦。${S.flags.drop?'倒下處留有紫色的「遺落之物」（小地圖紫點），回去就能取回':''}`);
  if(lostGear)toast(`遺落的${lostGear}被路過的修仙者拿走了`);}
document.getElementById('death').addEventListener('click',ev=>{const b=ev.target.closest('[data-x]');if(!b)return;if(b.dataset.x==='revive')revive();else openSaves('load');});


// ---- 開機載入遮罩：蓋住「讀取中…」半就緒標題，存檔檢查完再淡出（最長 8 秒）----
function xwBootDone(why){
  try{
    if(window.__xwBootDone)return;window.__xwBootDone=1;
    const el=document.getElementById('xwboot');
    if(el){el.classList.add('hide');setTimeout(()=>{try{el.remove();}catch(e){}},500);}
    try{document.body.classList.remove('xwbooting');}catch(e){}
  }catch(e){}
}
try{setTimeout(function(){xwBootDone('timeout');},8000);}catch(e){}

// ---- 標題畫面（原創水墨風，程式即時繪製）----
let titleOpen=false;
function drawTitleArt(){const c=$('titleArt');const w=c.clientWidth||innerWidth,h=c.clientHeight||innerHeight,d=Math.min(2,devicePixelRatio||1);c.width=Math.round(w*d);c.height=Math.round(h*d);const g=c.getContext('2d');g.setTransform(d,0,0,d,0,0);
  const bg=g.createLinearGradient(0,0,0,h);bg.addColorStop(0,'#efe6d2');bg.addColorStop(0.6,'#ddd0b4');bg.addColorStop(1,'#c9b994');g.fillStyle=bg;g.fillRect(0,0,w,h);
  const r=mulberry32(7);const sun={x:w*0.74,y:h*0.22,r:Math.min(w,h)*0.07};g.fillStyle='rgba(178,58,40,0.85)';g.beginPath();g.arc(sun.x,sun.y,sun.r,0,Math.PI*2);g.fill();
  for(let L=0;L<5;L++){const base=h*(0.42+L*0.12),amp=h*(0.16-L*0.022),col=`rgba(${30+L*8},${36+L*8},${34+L*6},${0.18+L*0.16})`;g.fillStyle=col;g.beginPath();g.moveTo(0,h);
    const ph=r()*10,f1=2+r()*2,f2=6+r()*4;for(let x=0;x<=w;x+=4){const t=x/w;const y=base-amp*(0.55*Math.abs(Math.sin(t*f1+ph))+0.3*Math.sin(t*f2+ph*2)+0.15*Math.sin(t*23+L));g.lineTo(x,y);}g.lineTo(w,h);g.closePath();g.fill();
    const mist=g.createLinearGradient(0,base-amp*0.2,0,base+h*0.06);mist.addColorStop(0,'rgba(239,230,210,0)');mist.addColorStop(1,'rgba(239,230,210,0.55)');g.fillStyle=mist;g.fillRect(0,base-amp*0.2,w,h*0.1+amp*0.2);}
  g.strokeStyle='rgba(20,20,20,0.55)';g.lineWidth=1.2;for(let k=0;k<5;k++){const bx=w*(0.12+k*0.05+r()*0.02),by=h*(0.3+r()*0.05);g.beginPath();g.moveTo(bx-6,by);g.quadraticCurveTo(bx,by-4,bx+1,by);g.quadraticCurveTo(bx+2,by-4,bx+8,by);g.stroke();}}
async function renderTitle(){try{const all=await listSlots();const id=latestSlot(all);const m=id&&all[id].meta;
  $('t_cont').disabled=!id;$('t_cont').innerHTML='繼續遊戲'+(m?`<small>${esc(m.name)}・${esc(m.realm)}・${fmtDate(m.savedAt)}</small>`:'<small>尚無存檔</small>');
  $('t_ver').textContent='v'+xwDispVer()+'・原創修仙宗門經營＋即時戰略原型';
  }finally{try{if(typeof xwBootDone==='function')xwBootDone('title-ready');}catch(e){}}}
function showTitle(on){titleOpen=on;$('title').classList.toggle('open',on);document.body.classList.toggle('titleopen',on);document.body.classList.toggle('ingame',!on);if(on){setHelp(false);closeOverlays();closeShrine();closeSaves();deathShow(false);
  // 返回標題：清掉會蓋住標題按鈕的遊戲層（建造選單／暫停／金手指／對話／聯機殘留等）
  try{if(typeof xwBbClose==='function')xwBbClose();const xb=document.getElementById('xwbb');if(xb){xb.classList.remove('open');xb.style.display='none';}if(typeof XWBB!=='undefined')XWBB.open=false;}catch(e){}
  try{if(typeof openPause==='function')openPause(false);const pz=document.getElementById('v47pause');if(pz)pz.classList.remove('open');if(typeof V47!=='undefined')V47.pause=false;}catch(e){}
  try{if(typeof x47DbgClose==='function')x47DbgClose();const dbg=document.getElementById('x47dbg');if(dbg)dbg.style.display='none';document.body.classList.remove('x47dbgopen','x47dbgon','x47modal');}catch(e){}
  try{if(typeof x47DlgClose==='function')x47DlgClose();const xd=document.getElementById('x47dlg');if(xd){xd.style.display='none';xd.innerHTML='';}}catch(e){}
  try{if(typeof dlgClose==='function')dlgClose('cancel');$('dlg').classList.remove('open');dlgOpen=false;}catch(e){}
  try{if(typeof netTogglePanel==='function')netTogglePanel(false);else if(window.XW&&XW.net&&XW.net.panel)XW.net.panel(false);}catch(e){}
  try{buildMode=null;confirmCb=null;recOpen=false;const rm=document.getElementById('recmenu');if(rm)rm.classList.remove('open');}catch(e){}
  try{$('settings').classList.remove('open');}catch(e){}
  try{const el=$('title');if(el){el.style.pointerEvents='auto';el.style.zIndex='';}}catch(e){}
  try{const b=$('t_cont');if(b&&!/small/i.test(b.innerHTML))b.innerHTML='繼續遊戲<small>讀取中…</small>';}catch(e){}drawTitleArt();renderTitle();}try{document.title='仙武之體 · 原型 Demo v'+xwDispVer();}catch(e){}}
async function backToTitle(){const r=await dlg('回到標題畫面？未存檔的進度會遺失（可先存檔）。',{ok:'直接回到標題',alt:'快速存檔後回到標題'});if(!r)return;if(r==='alt')await quickSave();showTitle(true);}
function titleNew(){newGame();showTitle(false);autoT=0;toast('新的修行開始了！（按 H 看操作說明、修仙指南看完整玩法）');}// #199：開局不再自動跳出舊版說明視窗
async function titleContinue(){const all=await listSlots();const id=latestSlot(all);if(!id)return;try{await loadSlot(id);toast('繼續：'+all[id].meta.name);}catch(err){toast(err.message);}}
function openSettings(){const el=$('settings');el.innerHTML=`<button class="btn x" data-g="close">✖</button><h3>設定</h3>
  <div class="trow"><span>自動存檔間隔</span><span>${[0,1,3,5].map(v=>`<button class="btn ${settings.autoMin===v?'pri':''}" data-g="auto" data-v="${v}">${v?v+' 分':'關閉'}</button>`).join('')}</span></div>
  <div class="dim sm">（突破、建築完成、石碑靜坐時仍會自動存檔；關閉後只停止定時存檔）</div>
  <div class="trow"><span>操作說明（H）</span><button class="btn" data-g="helpnow">⌨ 查看</button></div>
  <div class="trow"><span>面板位置（可拖曳標題列移動）</span><button class="btn" data-g="dragreset">↺ 重置版面</button></div>
  <div class="trow"><span>新遊戲時啟用新手教學</span><button class="btn ${settings.tut?'pri':''}" data-g="tut">${settings.tut?'開':'關'}</button></div>
  ${titleOpen?'':'<div class="trow"><span>新手教學／修仙指南</span><span><button class="btn" data-g="tutnow">🎓 重播教學</button><button class="btn" data-g="guide">📖 指南</button></span></div>'}
  <div class="dim sm">存檔位置：${idb?'IndexedDB':'localStorage'}（本機瀏覽器）。清除瀏覽器資料會刪除存檔，建議定期「匯出」。</div>`;el.classList.add('open');}
document.getElementById('settings').addEventListener('click',ev=>{const b=ev.target.closest('[data-g]');if(!b)return;const a=b.dataset.g;if(a==='close'){$('settings').classList.remove('open');return;}
  if(a==='auto')settings.autoMin=+b.dataset.v;if(a==="dragreset"){if(typeof XWDrag!=="undefined")XWDrag.reset();return;}if(a==='helpnow'){$('settings').classList.remove('open');setHelp(true);return;}if(a==='tut')settings.tut=!settings.tut;
  if(a==='tutnow'||a==='guide'){$('settings').classList.remove('open');if(a==='tutnow')tutStart();else toggleGuide(true);return;}saveSettings();openSettings();});
document.getElementById('title').addEventListener('click',ev=>{const b=ev.target.closest('button');if(!b)return;
  if(b.id==='t_cont')titleContinue();else if(b.id==='t_new')titleNew();else if(b.id==='t_load')openSaves('load');else if(b.id==='t_set')openSettings();});
addEventListener('resize',()=>{if(titleOpen)drawTitleArt();});
function uiBlock(){return evOpen||titleOpen||deathOpen||savesOpen||dlgOpen||shrineOpen!=null||$('settings').classList.contains('open');}
// 鍵盤：F5 快速存檔、F9 快速讀檔；對話框／選單開著時不讓遊戲吃到按鍵
addEventListener('keydown',ev=>{const c=ev.code,typing=ev.target&&/^(INPUT|TEXTAREA)$/.test(ev.target.tagName);
  if(c==='F5'){ev.preventDefault();ev.stopPropagation();if(!titleOpen&&!deathOpen&&!dlgOpen)quickSave();return;}
  if(c==='F9'){ev.preventDefault();ev.stopPropagation();if(!dlgOpen)quickLoad();return;}
  if(dlgOpen){if(c==='Escape')dlgClose('cancel');else if(c==='Enter'&&!(ev.target&&ev.target.tagName==='TEXTAREA'))dlgClose('ok');ev.stopPropagation();return;}
  if(typing){ev.stopPropagation();return;}
  if(uiBlock()){if(c==='Escape'){if($('settings').classList.contains('open'))$('settings').classList.remove('open');else if(savesOpen){closeSaves();if(titleOpen)renderTitle();}else if(shrineOpen!=null)closeShrine();}
    else if((c==='KeyE'||c==='KeyV')&&shrineOpen!=null)closeShrine();ev.stopPropagation();ev.preventDefault();}
},true);
