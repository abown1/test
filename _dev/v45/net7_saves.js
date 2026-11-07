// ================== v0.5 聯機：用現有存檔開房（net7_saves.js）==================
// 聯機面板加「用現有存檔開房」：列出本機存檔格（快速、自動 ×3、手動 ×5），房主選一格 → 讀檔 → 立刻開房。
// 「建立房間」：遊戲已在進行（離開過標題畫面）時直接以目前的世界開房，不再開新局。
// 舊存檔（沒有 net05 欄位）：歸屬預設給房主；房主的主角、名字、靈根原樣保留（不改名、不重擲）。
NET.live=false; // 是否已離開過標題畫面（新遊戲／讀檔／繼續）
{const _x=showTitle;showTitle=function(on){if(!on)NET.live=true;return _x.apply(this,arguments);};}
const NET_SLOT_NAME={quick:'快速存檔',auto0:'自動存檔 1',auto1:'自動存檔 2',auto2:'自動存檔 3',m0:'存檔 1',m1:'存檔 2',m2:'存檔 3',m3:'存檔 4',m4:'存檔 5'};
// 讀進來的存檔若曾由別的房主開過房（netOwner 不是我）：跟世界副本一樣，把我的化身換成主角、原主角變成對方的化身
function netClaimWorld(){if(typeof netReclaim==='function')return netReclaim();} // 與 net2 netAdoptWorld 共用同一套（#14）
// keepName：開房時不要把主角改名成聯機名號（用現有世界時）
{const _x=netHost;netHost=async function(opt){const keep=opt&&opt.keepName;const pp=keep&&player();const nm=pp&&pp.name;
  if(keep)netClaimWorld();const r=await _x.apply(this,arguments);if(pp&&S.units.includes(pp)){if(nm==null)delete pp.name;else pp.name=nm;}return r;};}
async function netHostSlot(id){slotCache=null;const all=await listSlots();const r=all[id];if(!r||r.bad)throw new Error(r&&r.bad?'存檔損毀：'+r.bad:'這一格沒有存檔');
  await loadSlot(id);if(titleOpen)showTitle(false);
  {const p=player();NET._preHost=p&&{id:p.id,name:p.name==null?null:p.name,realm:p.realm,lg:JSON.stringify(p.lg||null),kind:p.kind};}NET.live=true;NET._slotsOpen=false;
  const code=await netHost({keepName:true});netLog('hosted from save',id,(r.meta||{}).name||'');return code;}
async function netLoadSlotList(){slotCache=null;NET._slots=await listSlots();}
{const _x=netUiAct;netUiAct=async function(a,w){
  try{
    if(a==='host'&&(NET.live||!titleOpen)){const nm=netEl('np_name');if(nm)netSetName(nm.value);netStatus('以目前的世界建立房間中……');if(titleOpen)showTitle(false);await netHost({keepName:true});netRender();return;}
    if(a==='slots'){NET._slotsOpen=!NET._slotsOpen;if(NET._slotsOpen)await netLoadSlotList();netRender();return;}
    if(a==='hosts'){const r=(NET._slots||{})[w];const go=async()=>{try{netStatus('讀取存檔並開房中……');await netHostSlot(w);netRender();toast('已讀取「'+((r&&r.meta&&r.meta.name)||NET_SLOT_NAME[w])+'」並建立房間');}catch(e){netStatus('失敗：'+(e&&e.message||e),true);netLog('ui error',String(e&&e.message||e));}};
      if(NET.live&&!titleOpen)showConfirm(`讀取「${netEsc((r&&r.meta&&r.meta.name)||NET_SLOT_NAME[w])}」並以它開房？<br>目前未存檔的進度會遺失。`,'讀取並開房',go);else await go();return;}
  }catch(e){netStatus('失敗：'+(e&&e.message||e),true);netLog('ui error',String(e&&e.message||e));return;}
  return _x.apply(this,arguments);};}
function netSlotsHtml(){if(NET.role)return '';let h=`<div class="row"><button class="btn" data-n="slots">📂 用現有存檔開房${NET._slotsOpen?' ▲':' ▼'}</button></div>`;
  if(!NET._slotsOpen)return h;const all=NET._slots||{};let n=0;
  for(const id of SLOT_IDS){const r=all[id];if(!r)continue;n++;const m=r.meta||{};
    h+=`<div class="pl np_slot" data-slot="${id}"><span>${netEsc(NET_SLOT_NAME[id]||id)}：${netEsc(m.name||'?')} <span class="muted">${netEsc(m.realm||'')}${m.nd!=null?'・弟子 '+m.nd:''}${m.savedAt?'・'+netEsc(fmtDate(m.savedAt)):''}${m.ver?'・v'+netEsc(m.ver):''}</span></span>`+
      (r.bad?`<span class="muted">損毀</span>`:`<button class="btn" data-n="hosts" data-w="${id}">讀取並開房</button>`)+`</div>`;}
  if(!n)h+=`<div class="muted">本機還沒有存檔。</div>`;return h;}
{const _x=netRender;netRender=function(){const r=_x.apply(this,arguments);const p=netEl('netp');if(!p||!netPanelOpen||NET.role)return r;
  const st=netEl('np_st');const d=document.createElement('div');d.id='np_slots';d.innerHTML=netSlotsHtml();if(st)p.insertBefore(d,st);else p.appendChild(d);return r;};}
{const _x=XW045;XW045=function(){const o=_x.apply(this,arguments);if(o.net){o.net.hostSlot=netHostSlot;Object.defineProperty(o.net,'preHost',{get:()=>NET._preHost||null});Object.defineProperty(o.net,'live',{get:()=>NET.live});}return o;};}
