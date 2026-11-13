// ======================= v0.4.7（g21）：版面圖層、名牌、技能拖曳施放、提示與副本確認等 =======================
// 命名前綴 x47；所有平台相關行為（音訊）集中在 XW_AUDIO 轉接層，方便日後移植 Steam 版。
const X47={modal:false,rdis:{},chip:null,aim:null,dgAsk:true,dgPend:null,dgNear:null,dbg:false,spd:1,god:false,music:null,kmap:{},kn:new WeakMap(),alDef:null,cbSig:'',nofog:false};
function x47Touch(){return typeof isTouchUI!=='undefined'&&!!isTouchUI;}
function x47Root(){return document.getElementById('root')||document.body;}
// ---------- #179 統一圖層順序：世界 HUD < 戰鬥按鈕 < 提示／警報 < 視窗 < 確認對話框 ----------
// 原因：#root 是 position:fixed（自成堆疊環境），直接掛在 body 下的技能列／警報橫幅等永遠蓋在 #root 內所有視窗上。
// 作法：把這些浮動元件搬進 #root，並用同一套 z-index 分層。
const X47_MOVE=['v158bar','v158pk','v47ban','v48cb','v175','v47pause','v48dlg','v58q','pbar','pb_menu','x47rchip','x47dlg','x47dbg','x47cancel','x47dbgbtn'];
const X47_MODALS=['saves','settings','help','guide','roster','bag','craft','alloc','evdlg','shrine','death','title','dlg','kickdlg','cult','trade','v48dlg','v47pause','v175','x47dlg','x47dbg','recmenu','netp'];
function x47Adopt(){const R=document.getElementById('root');if(!R)return;const L=[];for(const id of X47_MOVE){const el=document.getElementById(id);if(el&&!R.contains(el))L.push(el);}
  for(const el of Array.from(document.body.children)){if(el===R||L.includes(el)||/^(SCRIPT|STYLE|CANVAS)$/.test(el.tagName))continue;if(el.classList.contains('ui')||el.classList.contains('ov'))L.push(el);}
  for(const el of L){const fa=document.activeElement,had=fa&&el.contains(fa);R.appendChild(el);if(had)try{fa.focus();}catch(e){}}}
function x47Vis(el){if(!el||!el.isConnected)return false;const cs=getComputedStyle(el);if(cs.display==='none'||cs.visibility==='hidden'||+cs.opacity===0)return false;const r=el.getBoundingClientRect();return r.width>40&&r.height>40;}
function x47ModalOpen(){for(const id of X47_MODALS){if(x47Vis(document.getElementById(id)))return id;}const mm=document.getElementById('minimap');if(mm&&mm.classList.contains('big'))return 'minimap';return '';}
const X47_CSS=`
#root #topbar{z-index:9}#root #pbar{z-index:9}
#root #joy,#root #actions,#root #v158bar{z-index:10!important}#root #v48cb{z-index:11!important}
#root #autosave{z-index:15!important}#root #toasts{z-index:15!important}#root #v47ban{z-index:16!important}#root #x47rchip{z-index:16}#root #v58q{z-index:16!important}
#root #menuPop,#root #pb_menu{z-index:18!important}#root #v158pk{z-index:19!important}#root #tutbub{z-index:20!important}
#root #help,#root #guide,#root #roster,#root #bag,#root #craft,#root #alloc,#root #shrine,#root #cult,#root #trade,#root #saves,#root #evdlg,#root #v48dlg,#root #recmenu{z-index:40!important}
#root #minimap.big,#root #netp{z-index:40!important}#root #radial{z-index:19!important}#root #dghud{z-index:9}#root #v175{z-index:42!important}#root #settings{z-index:45!important}#root #x47dbg{z-index:46}
#root #v47pause{z-index:50!important}#root #death{z-index:35!important}#root #title{z-index:34!important}#root #tutring{z-index:62!important}
#root #dlg,#root #kickdlg,#root #x47dlg{z-index:80!important}#root #tip{z-index:95!important}
body.x47modal #joy,body.x47modal #actions,body.x47modal #v158bar,body.x47modal #v48cb,body.x47modal #x47rchip,body.x47modal #v47ban,body.x47modal #x47cancel,body.x47modal #x47dbgbtn{display:none!important}
body.x47modal #toasts{top:auto!important;bottom:calc(var(--sab,0px) + 14px)!important;z-index:85!important}
/* #180 山賊警報：手機 ✕ 大顆好按；關閉後改成角落小倒數 */
#v47ban .bx{min-width:32px;min-height:32px;font-size:16px}
body.touch #v47ban .bx{min-width:44px;min-height:44px;font-size:20px;margin:-6px -8px -6px 6px}
#x47rchip{position:fixed;right:calc(var(--sar,0px) + 8px);top:calc(var(--tb,44px) + 8px);display:none;align-items:center;gap:4px;background:#3a0d0dee;border:1px solid #ff6a5a;color:#ffe0d8;border-radius:14px;padding:4px 10px;font-weight:bold;font-size:13px;cursor:pointer;box-shadow:0 0 8px #ff3a2a88;min-height:28px}
body.touch #x47rchip{min-height:36px;padding:6px 12px;top:calc(var(--tb,44px) + 112px)}
/* #177 單位面板關閉鈕 */
#panel .x47pclose{position:sticky;float:right;top:0;margin:0 -4px 2px 6px;width:30px;height:30px;border-radius:6px;border:1px solid #8a6a3a;background:#2a1d12e6;color:#f3e3c0;font-size:16px;line-height:26px;padding:0;cursor:pointer;z-index:3}
body.touch #panel .x47pclose{width:44px;height:44px;font-size:22px;line-height:40px}
/* #178 取消區 */
#x47cancel{position:fixed;display:none;width:64px;height:64px;border-radius:50%;border:2px solid #ff8070;background:#3a0d0dcc;color:#fff;font-size:26px;line-height:60px;text-align:center;pointer-events:none}
#x47cancel.hot{background:#c03020ee;transform:scale(1.15)}
body.touch #v158bar .v158s{touch-action:none}
/* 確認對話框（不暫停世界） */
#x47dlg{position:fixed;left:50%;top:38%;transform:translate(-50%,-50%);min-width:min(320px,calc(100% - 24px));max-width:calc(100% - 24px);background:#1a120bf4;border:1px solid #c9a35a;border-radius:10px;padding:14px 16px;color:#f3e3c0;box-shadow:0 6px 24px #000a;display:none}
#x47dlg h3{margin:0 0 8px;font-size:16px;color:#ffd98a}#x47dlg .row{display:flex;flex-wrap:wrap;gap:8px;margin-top:12px;justify-content:flex-end}
#x47dlg button{min-height:36px;min-width:72px}body.touch #x47dlg button{min-height:44px}
/* #119 除錯面板 */
#x47dbg{position:fixed;left:50%;top:calc(var(--tb,44px) + 10px);transform:translateX(-50%);width:min(420px,calc(100% - 16px));max-height:calc(100% - var(--tb,44px) - 24px);overflow:auto;background:#140e09f4;border:1px solid #c9a35a;border-radius:10px;padding:10px;color:#f3e3c0;display:none}
#x47dbg .g{display:grid;grid-template-columns:1fr 1fr;gap:6px}#x47dbg button{min-height:34px}body.touch #x47dbg button{min-height:42px}#x47dbg h3{margin:0 0 6px;color:#ffd98a;font-size:15px}
#x47dbgbtn{position:fixed;left:calc(var(--sal,0px) + 6px);top:calc(var(--tb,44px) + 150px);z-index:12;display:none;width:36px;height:36px;border-radius:8px;border:1px solid #c9a35a;background:#2a1d12e6;color:#ffd98a;font-size:18px;padding:0}
body.x47dbgon #x47dbgbtn{display:block}
/* #59 分配目標 */
#alloc .x47tg{min-width:26px;padding:0 6px}
`;
function x47Css(){if(document.getElementById('x47css'))return;const st=document.createElement('style');st.id='x47css';st.textContent=X47_CSS;document.head.appendChild(st);}
function x47ModalTick(){x47Adopt();const m=x47ModalOpen();X47.modal=m;document.body.classList.toggle('x47modal',!!m);}
// ---------- #181 連招層數標籤：放在技能群（含手機動作鈕）上方，不蓋任何按鈕／搖桿，並避開安全區 ----------
function x47PlaceCombo(){const cb=document.getElementById('v48cb');if(!cb||cb.style.display==='none'||getComputedStyle(cb).display==='none')return;
  const els=[document.getElementById('v158bar')];if(x47Touch())els.push(document.getElementById('actions'));
  let top=1e9,l=1e9,r=-1e9;for(const e of els){if(!e||!x47Vis(e))continue;const R=e.getBoundingClientRect();if(R.width<4)continue;top=Math.min(top,R.top);l=Math.min(l,R.left);r=Math.max(r,R.right);}
  if(top>=1e9)return;const w=cb.offsetWidth||90,gap=8,vw=innerWidth;
  let bottom=Math.round(innerHeight-top+gap);let left;
  if(x47Touch()){left=Math.round(Math.min(vw-w-8,Math.max(8,r-w)));}// 右側技能群正上方、靠右對齊
  else left=Math.round((l+r)/2-w/2);
  left=Math.max(8,Math.min(vw-w-8,left));
  const sig=left+'|'+bottom;if(sig===X47.cbSig&&cb.style.left)return;X47.cbSig=sig;
  cb.style.left=left+'px';cb.style.right='auto';cb.style.transform='none';cb.style.bottom=bottom+'px';}
// ---------- #180 山賊警報：✕ 關閉後記住該波，不再彈橫幅，改成角落倒數小標籤 ----------
function x47RaidWaves(){const out=[];if(typeof v47RaidState!=='function'||!S||!S.villages)return out;const R=v47RaidState();
  for(const v of R.pend)out.push({k:'p'+v.id,vid:v.id,rt:v.raidT,pend:true,v});
  for(const a of R.act)out.push({k:'a'+a.r.id,vid:a.r.vid,rt:a.r.t0||0,pend:false,a});return out;}
function x47WaveDismissed(w){const d=X47.rdis;if(d['a:'+w.k])return true;const t=d['v:'+w.vid];if(t==null)return false;return Math.abs((w.rt||0)-t)<15;}
function x47RaidDismiss(){for(const w of x47RaidWaves()){X47.rdis['v:'+w.vid]=w.pend?w.rt:(w.rt||S.time);if(!w.pend)X47.rdis['a:'+w.k]=1;}}
function x47RaidChip(){let el=document.getElementById('x47rchip');if(!el){el=document.createElement('div');el.id='x47rchip';el.className='ui';x47Root().appendChild(el);
    el.addEventListener('click',ev=>{ev.stopPropagation();const W=x47RaidWaves().filter(x47WaveDismissed);const w=W.find(x=>!x.pend)||W[0];if(!w)return;
      if(!w.pend&&w.a&&w.a.es.length)v47Look(w.a.es[0].x,w.a.es[0].y);else if(w.v)v47Look(w.v.x,w.v.y);});}return el;}
function x47RaidUi(){const W=x47RaidWaves(),D=W.filter(x47WaveDismissed),el=x47RaidChip();
  // 清掉已結束的記錄
  for(const k in X47.rdis){if(k.startsWith('v:')){const vid=+k.slice(2);if(!W.some(w=>w.vid===vid)&&!(S.villages||[]).some(v=>v.id===vid&&v.warned))delete X47.rdis[k];}else if(k.startsWith('a:')&&!W.some(w=>w.k===k.slice(2)))delete X47.rdis[k];}
  if(S.dg||!D.length){if(el.style.display!=='none'){el.style.display='none';el._t='';}return;}
  const act=D.filter(w=>!w.pend),n=act.reduce((s,w)=>s+w.a.es.length,0);
  const txt=act.length?`⚔ 山賊 ${n} 人`:`⚠ ${Math.max(0,Math.ceil(Math.min(...D.map(w=>w.rt))-S.time))} 秒`;
  if(el._t!==txt){el._t=txt;el.textContent=txt;el.title=act.length?'山賊正在進攻宗門｜點擊前往':'山賊集結中｜點擊查看山寨';}el.style.display='flex';}
{const _rt=v47RaidTick;v47RaidTick=function(){const r=_rt.apply(this,arguments);try{if(V47.banners.raid){const W=x47RaidWaves();if(W.length&&W.every(x47WaveDismissed))v47BannerOff('raid');}}catch(e){}return r;};}
addEventListener('click',ev=>{const x=ev.target&&ev.target.closest&&ev.target.closest('#v47ban [data-bnx="raid"]');if(x){try{x47RaidDismiss();}catch(e){}}},true);
// ---------- #176 聯機名牌：畫在境界標籤／血條／靈氣條上方並留間距；互相重疊時往上堆疊 ----------
// 覆寫 net9 的 netDrawNames（不改 net*.js）；NET.tagDraw 格式不變（uid,name,txt,me,x,y），另加 w,h,dy 供測試。
netDrawNames=function(){NET.tagDraw=[];if((!NET.role&&!X47.tagsOv)||S.interior)return;const tags=X47.tagsOv?X47.tagsOv():netNameTags();if(!tags.length)return;
  ctx.setTransform(dpr,0,0,dpr,0,0);ctx.textAlign='center';ctx.textBaseline='alphabetic';const z=cam.zoom;
  ctx.font='bold 12px sans-serif';const items=[];
  for(const t of tags){const u=t.uid!=null?unitById(t.uid):null;if(!u||u.dead||u.inside)continue;const p=iso(u.x,u.y);
    // 境界標籤頂端約在腳下 56 世界像素（有靈氣條再高 3.5）；名牌底部再留 6 螢幕像素
    const top=(p.y-(u.qiMax>0?60:57)-((typeof XLB!=='undefined'&&XLB.dy[u.id])||0)-cam.y)*z+H/2,sx=(p.x-cam.x)*z+W/2,sy=top-6;
    if(sx<-80||sx>W+80||sy<-40||sy>H+40)continue;
    const txt=t.me?`你・${t.name}`:(t.host?'👑 ':'')+t.name+(t.on?'':'（斷線）');const w=Math.ceil(ctx.measureText(txt).width)+10;
    items.push({t,txt,sx,sy,y0:sy,w,h:16,ax:sx,ay:top});}
  items.sort((a,b)=>b.y0-a.y0||a.sx-b.sx);const placed=[];const obst=[];try{if(typeof XLB!=='undefined')for(const b of XLB.boxes){if(!b.s)continue;const x0=b.s.x0,x1=b.s.x1,y0=b.s.y0,y1=b.s.y1;obst.push({sx:(x0+x1)/2,w:x1-x0,sy:y1,h:y1-y0,o:b.o});}}catch(e){}
  for(const it of items){let moved=true,guard=0;while(moved&&guard++<12){moved=false;for(const q of placed){if(Math.abs(it.sx-q.sx)<(it.w+q.w)/2+2&&it.sy>q.sy-q.h-2&&it.sy-it.h<q.sy+2){it.sy=q.sy-q.h-2;moved=true;}}for(const q of obst){if(q.o===it.t.uid)continue;if(Math.abs(it.sx-q.sx)<(it.w+q.w)/2+1&&it.sy>q.sy-q.h-1&&it.sy-it.h<q.sy+1){it.sy=q.sy-q.h-2;moved=true;}}}placed.push(it);}
  for(const it of placed){const t=it.t,col=t.me?'#ffd75e':t.on?'#9fe8ff':'#9a9a9a',bx=it.sx-it.w/2,by=it.sy-it.h+3;
    if(it.y0-it.sy>3){ctx.strokeStyle='rgba(255,255,255,0.35)';ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(it.sx,by+it.h);ctx.lineTo(it.ax,it.ay-1);ctx.stroke();}
    ctx.fillStyle='rgba(10,6,3,0.62)';ctx.beginPath();if(ctx.roundRect)ctx.roundRect(bx,by,it.w,it.h,5);else ctx.rect(bx,by,it.w,it.h);ctx.fill();
    ctx.strokeStyle=col+'88';ctx.lineWidth=1;ctx.stroke();
    ctx.fillStyle=col;ctx.fillText(it.txt,it.sx,it.sy);
    NET.tagDraw.push({uid:t.uid,name:t.name,txt:it.txt,me:t.me,x:Math.round(it.sx),y:Math.round(it.sy),w:it.w,h:it.h,dy:Math.round(it.y0-it.sy),top:Math.round(it.ay)});}};
// ---------- #177 單位資訊面板：右上角 ✕（手機 44px），收起並取消選取 ----------
function x47PanelClose(){selUnits=[];selBuilding=null;selOther=null;panelKeyCache=null;try{if(typeof V46!=='undefined'){V46.selT=-1;V46.noAuto=1;}}catch(e){}try{renderPanel();}catch(e){}}
{const _rp=renderPanel;renderPanel=function(){const r=_rp.apply(this,arguments);try{const el=document.getElementById('panel');
    if(el&&el.innerHTML&&!el.querySelector(':scope > .x47pclose')){const b=document.createElement('button');b.className='x47pclose';b.type='button';b.title='關閉（取消選取）';b.setAttribute('aria-label','關閉');b.textContent='✕';el.insertBefore(b,el.firstChild);}}catch(e){}return r;};}
addEventListener('click',ev=>{const b=ev.target&&ev.target.closest&&ev.target.closest('#panel .x47pclose');if(!b)return;ev.stopPropagation();ev.preventDefault();x47PanelClose();},true);
// ---------- #120 副本／室內不顯示世界石碑（副本座標和世界重疊時誤跳傳送石碑）----------
{const _ns=nearShrine;nearShrine=function(){if(S&&(S.dg||S.interior))return null;return _ns.apply(this,arguments);};}
// ---------- 遺留：重新綁定按鍵後，提示文字中的按鍵名稱跟著改 ----------
// 原始文字保留；每次套用都從原文重新換算（交換 Q／W 也正確）。設定視窗本身不改。
function x47KeyMap(){const m={};if(typeof ACT173==='undefined')return m;for(const a of ACT173){const c=CFG173.keys[a[0]];if(!c||c===a[2])continue;const d=v173KeyName(a[2]);if(d&&d.length===1)m[d]=v173KeyName(c);}return m;}
function x47KeyText(s,m){if(!s)return s;
  // 單次替換原始按鍵，交換兩鍵時不把替換結果再次換回；數字技能鍵同規則。
  return s.replace(/([（(]\s*)([A-Z0-9])(\s*[）)])|(^|[^A-Za-z0-9])([A-Z0-9])(\s?鍵)|(按\s?)([A-Z0-9])(?![A-Za-z0-9])|<(b|kbd)>([A-Z0-9])<\/\9>/g,
    (q,a,b,c,d,e,f,g,h,tag,k)=>{
      if(b!==undefined)return m[b]?a+m[b]+c:q;
      if(e!==undefined)return m[e]?d+m[e]+f:q;
      if(h!==undefined)return m[h]?g+m[h]:q;
      return m[k]?'<'+tag+'>'+m[k]+'</'+tag+'>':q;
    });}
const X47_HS={pc:null,tc:null};
function x47KeyHints(){const m=x47KeyMap();X47.kmap=m;const sig=JSON.stringify(m);
  if(typeof HINTS_PC!=='undefined'){if(!X47_HS.pc){X47_HS.pc=HINTS_PC.slice();X47_HS.tc=HINTS_TOUCH.slice();}
    if(sig!==X47.kSig){for(let i=0;i<HINTS_PC.length;i++)HINTS_PC[i]=x47KeyText(X47_HS.pc[i],m);for(let i=0;i<HINTS_TOUCH.length;i++)HINTS_TOUCH[i]=x47KeyText(X47_HS.tc[i],m);}}
  X47.kSig=sig;
  // 技能列角標與說明
  const bar=document.getElementById('v158bar');if(bar)bar.querySelectorAll('[data-v158]').forEach(b=>{const i=+b.dataset.v158,k=b.querySelector('.k'),n=v173KeyName(v173Key('sk'+(i+1)));if(k&&k.textContent!==n)k.textContent=n;});
  // 其餘靜態介面文字（說明、指南、頂列、建造列、提示框）
  const has=Object.keys(m).length;if(!has&&!X47.kAny)return;X47.kAny=has>0;
  for(const sel of ['#topbar','#xsm','#help','#guide','#buildbar','#menuPop','#actions','#tip','#tutbub','#dghud','#objectives']){const root=document.querySelector(sel);if(!root)continue;
    const it=document.createTreeWalker(root,NodeFilter.SHOW_TEXT);let n;while((n=it.nextNode())){const rec=X47.kn.get(n),cur=n.nodeValue;let o;
      if(rec&&rec.r===cur)o=rec.o;else o=cur;// 文字被遊戲改寫過 → 當成新的原文
      let r=x47KeyText(o,m);const pe=n.parentElement;if(pe&&/^(B|KBD)$/.test(pe.tagName)&&/^[A-Z]$/.test(o.trim())&&m[o.trim()])r=o.replace(o.trim(),m[o.trim()]);
      if(r!==cur)n.nodeValue=r;X47.kn.set(n,{o,r});}
    root.querySelectorAll('[title]').forEach(e=>{const rec=X47.kn.get(e),cur=e.title;const o=rec&&rec.r===cur?rec.o:cur;const r=x47KeyText(o,m);if(r!==cur)e.title=r;X47.kn.set(e,{o,r});});}}
// ---------- 遺留：背景音樂（程序生成古琴／五聲音階，平台音訊轉接層）----------
const XW_AUDIO={ctx(){return typeof sfxCtx==='function'?sfxCtx():null;},enabled(){return typeof SFX==='undefined'||SFX.on();}};
function x47MusicVol(){if(typeof CFG173==='undefined')return 0;if(!XW_AUDIO.enabled())return 0;if(CFG173.bgMute&&XW_PLAT.hidden())return 0;return (CFG173.master/100)*(CFG173.music/100);}
const X47_SCALE=[0,2,4,7,9];// 宮商角徵羽
function x47MusicTick(){const v=x47MusicVol();let M=X47.music;
  if(v<=0.001){if(M&&M.g){try{M.g.gain.setTargetAtTime(0,M.c.currentTime,0.3);}catch(e){}}return;}
  const c=XW_AUDIO.ctx();if(!c||c.state!=='running')return;
  if(!M||M.c!==c){M=X47.music={c,g:c.createGain(),next:c.currentTime+0.5,step:0,deg:2,dr:null,ph:0};M.g.gain.value=0;M.g.connect(c.destination);
    // 低音持續音（很輕）
    try{const o1=c.createOscillator(),o2=c.createOscillator(),dg=c.createGain();o1.type='sine';o2.type='sine';o1.frequency.value=73.4;o2.frequency.value=110;dg.gain.value=0.05;o1.connect(dg);o2.connect(dg);dg.connect(M.g);o1.start();o2.start();M.dr=dg;}catch(e){}}
  const raid=!!(S&&S.raidsActive&&S.raidsActive.length),dg=!!(S&&S.dg);
  M.g.gain.setTargetAtTime(v*0.55,c.currentTime,0.5);
  const beat=raid||dg?0.42:0.75,base=raid||dg?146.8:220;// 戰鬥時較急、較低
  while(M.next<c.currentTime+1.2){M.step++;
    const rest=Math.random()<(raid?0.15:0.35);if(!rest){M.deg=Math.max(0,Math.min(9,M.deg+[-2,-1,-1,0,1,1,2][Math.floor(Math.random()*7)]));
      const d=M.deg,semi=X47_SCALE[d%5]+12*Math.floor(d/5),f=base*Math.pow(2,semi/12);x47Pluck(M,f,M.next,raid?1.1:2.2);
      if(M.step%8===0)x47Pluck(M,f/2,M.next,3);}
    M.next+=beat*(Math.random()<0.25?2:1);}}
function x47Pluck(M,f,t,dur){const c=M.c;try{const o=c.createOscillator(),o2=c.createOscillator(),g=c.createGain();o.type='triangle';o2.type='sine';o.frequency.value=f;o2.frequency.value=f*2.01;
  g.gain.setValueAtTime(0.0001,t);g.gain.exponentialRampToValueAtTime(0.16,t+0.012);g.gain.exponentialRampToValueAtTime(0.0001,t+dur);
  const g2=c.createGain();g2.gain.value=0.25;o.connect(g);o2.connect(g2);g2.connect(g);g.connect(M.g);o.start(t);o2.start(t);o.stop(t+dur+0.05);o2.stop(t+dur+0.05);}catch(e){}}
// ---------- 不暫停世界的確認對話框（聯機時世界照常運作）----------
function x47Dlg(o){let el=document.getElementById('x47dlg');if(!el){el=document.createElement('div');el.id='x47dlg';el.className='ui';x47Root().appendChild(el);
    el.addEventListener('click',ev=>{ev.stopPropagation();const b=ev.target.closest('[data-x47d]');if(!b)return;const D=X47.dlg;const i=+b.dataset.x47d;x47DlgClose();if(D&&D.btn[i]&&D.btn[i].f)try{D.btn[i].f();}catch(e){console.error(e);}});
    ['pointerdown','touchstart','mousedown','wheel'].forEach(t=>el.addEventListener(t,ev=>ev.stopPropagation(),{passive:true}));}
  X47.dlg={id:o.id||'',btn:o.btn||[],keep:o.keep||null};
  el.innerHTML=`<h3>${o.t||''}</h3><div>${o.h||''}</div><div class="row">${(o.btn||[]).map((b,i)=>`<button class="btn ${b.cls||''}" data-x47d="${i}">${b.l}</button>`).join('')}</div>`;el.style.display='block';return el;}
function x47DlgClose(id){const D=X47.dlg;if(id&&(!D||D.id!==id))return;X47.dlg=null;const el=document.getElementById('x47dlg');if(el){el.style.display='none';el.innerHTML='';}}
function x47DlgTick(){const D=X47.dlg;if(D&&D.keep){let k=true;try{k=D.keep();}catch(e){k=false;}if(!k)x47DlgClose();}}
// ---------- #122 秘境撤離陣／出口傳送陣：走上去先確認，不再直接離開 ----------
function x47DgExitAsk(src){const D=S.dg;if(!D)return;if(!X47.dgAsk){dgExit(true);return;}if(X47.dlg&&X47.dlg.id==='dgexit')return;
  const pt=src==='portal'?D.exitP:D.ent;const G=DGS[D.kind]||{};
  x47Dlg({id:'dgexit',t:src==='portal'?'🌀 出口傳送陣':'🚪 撤離陣',h:`要離開「${G.n||'秘境'}」回到宗門嗎？${D.cleared||src==='portal'?'':'<br><span class="dim">秘境尚未清空，離開後進度不保留。</span>'}`,
    btn:[{l:'留下',cls:''},{l:'離開秘境',cls:'pri',f:()=>{if(S.dg)dgExit(true);}}],
    keep:()=>{const p=player();return !!(S.dg&&p&&!p.dead&&pt&&dist(p.x,p.y,pt.x,pt.y)<2.6);}});}
// ---------- #123 進秘境像進房子：走到入口旁自動跳出確認 ----------
{const _de=dgEnter;dgEnter=function(kind,mode,hard){const r=_de.apply(this,arguments);try{
    if(!r&&!S.dg){const p=player(),g=gates().find(s=>s.kind===kind);if(p&&g&&distRect(p.x,p.y,g.i,g.j,2)>3&&p.task&&p.task.type==='move')X47.dgPend={kind,mode,hard,t:S.time};}
    if(r){X47.dgPend=null;x47DlgClose('dgin');}}catch(e){}return r;};}
function x47DgEnterAsk(kind,o){const G=DGS[kind];if(!G)return;const ds=disciples().filter(u=>!u.dead),sel=selUnits.map(unitById).filter(u=>u&&u.kind==='disciple'),fol=ds.filter(u=>u.job==='follow');
  const btn=[{l:'取消'}];
  if(o&&o.mode){btn.push({l:'進入',cls:'pri',f:()=>dgEnter(kind,o.mode,o.hard)});}
  else{btn.push({l:`單人進入`,f:()=>dgEnter(kind,'solo')});if(sel.length||fol.length)btn.push({l:`帶選取／跟隨弟子（${new Set(sel.concat(fol)).size}）`,f:()=>dgEnter(kind,'sel')});if(ds.length)btn.push({l:`帶全部弟子（${ds.length}）`,cls:'pri',f:()=>dgEnter(kind,'all')});}
  const g=gates().find(s=>s.kind===kind);
  x47Dlg({id:'dgin',t:`⛩ ${G.n||'秘境'}`,h:o&&o.mode?`已到入口，要進入「${G.n}」嗎？`:`來到「${G.n}」入口。要進入嗎？<br><span class="dim">也可以點入口選擇困難模式等選項。</span>`,btn,
    keep:()=>{const p=player();return !!(!S.dg&&p&&!p.dead&&g&&distRect(p.x,p.y,g.i,g.j,2)<=4.5);}});}
function x47DgTick(){if(S.dg||S.interior||(typeof v49Client==='function'&&v49Client()))return;const p=player();if(!p||p.dead)return;
  const P=X47.dgPend;if(P){const g=gates().find(s=>s.kind===P.kind);if(!g||S.time-P.t>40||(p.task&&p.task.type!=='move')){X47.dgPend=null;}
    else if(distRect(p.x,p.y,g.i,g.j,2)<=3){X47.dgPend=null;X47.dgNear=P.kind;x47DgEnterAsk(P.kind,P);return;}}
  // 沒有預約：走近入口時提示一次，離開 5 格以上再重新提示
  let near=null;for(const g of gates()){if(distRect(p.x,p.y,g.i,g.j,2)<=1.6){near=g;break;}}
  if(near){if(X47.dgNear!==near.kind&&!X47.dlg&&!X47.modal&&!(DGS[near.kind]&&DGS[near.kind].xf&&p.realm<3)){X47.dgNear=near.kind;x47DgEnterAsk(near.kind,null);}}
  else if(X47.dgNear){const g=gates().find(s=>s.kind===X47.dgNear);if(!g||distRect(p.x,p.y,g.i,g.j,2)>5)X47.dgNear=null;}}
// ---------- #58 弟子也能撿仙緣：弟子碰到 ✨ 靈光就觸發；附近閒置弟子會走過去 ----------
function x47EvTick(){const E=S.ev,m=E&&E.mk;if(!m||S.dg||S.interior||(typeof v49Client==='function'&&v49Client()))return;const ds=disciples().filter(u=>!u.dead&&!u.inside);
  for(const u of ds){if(dist(u.x,u.y,m.x,m.y)<1.3){if(typeof evOpen!=='undefined'&&evOpen)return;// 主角正在看其他事件 → 等關閉後再觸發（#132 排隊）
      S.ev.mk=null;floater(u.x,u.y-0.5,`${u.name} 發現仙緣！`,'#ffe27a');if(!evTrigger(null,`弟子 ${u.name} 路上奇遇`))S.ev.mk=m;return;}}
  if(m.x47w==null||(m.x47w===-1&&S.time>(m.x47wt||0))){let best=null,bd=14;for(const u of ds){if(u.job||u.task||u.aiJob)continue;const d=dist(u.x,u.y,m.x,m.y);if(d<bd){bd=d;best=u;}}
    if(best){m.x47w=best.id;try{setTask(best,{type:'move',x:m.x,y:m.y});pathTo(best,m.x,m.y);}catch(e){}}else{m.x47w=-1;m.x47wt=S.time+10;}}}
// ---------- #178 LoL／傳說對決式施放：拖曳瞄準、空放、取消；電腦 QWER 朝游標 ----------
const X47_AIM={charge:{R:5.5,k:'line',w:0.8},sweep:{R:1.9,k:'self'},fireball:{R:6,k:'line',w:0.6,aoe:1.1},flysword:{R:8,k:'line',w:0.5},jindan:{R:2.5,k:'self'},sp:{R:5.5,k:'line',w:0.7}};
function x47Face(p){if(Math.hypot(p.vx||0,p.vy||0)>0.2){const l=Math.hypot(p.vx,p.vy);return {x:p.vx/l,y:p.vy/l};}const f=p.faceT||p.face||1;return {x:f*Math.SQRT1_2,y:-f*Math.SQRT1_2};}// 面向右＝畫面右＝格座標 (+1,-1)
// 檢查（與 v158CastAb 相同的條件）；回傳 '' 表示可施放
function x47Check(p,ab,quiet){if(!p||p.dead)return 'dead';if(S.interior){if(!quiet)toast('室內不能施放技能');return 'in';}
  if(!v158Learned(p).includes(ab)){if(!quiet)toast('尚未學會這個技能');return 'nolearn';}
  const nm=v158Name(ab),cd=p.acd[ab]||0;if(cd>0.05){if(!quiet)toast(`${nm} 冷卻中 ${Math.ceil(cd)} 秒`);return 'cd';}
  if(ab==='charge'&&p.dash)return 'busy';
  const c=v158Cost(ab);if(p.qiMax>0&&c&&(p.qi||0)<c){if(!quiet)toast(`${nm}：靈氣不足 ${Math.floor(p.qi||0)}/${c}`);return 'qi';}return '';}
// 依瞄準點找目標：沿方向線／落點附近（技能彈、衝鋒），或身邊範圍內（橫掃、威壓）
function x47AimTarget(p,ab,ux,uy,d){const A=X47_AIM[ab];let best=null,bs=1e9;
  for(const e of S.enemies){if(e.dead)continue;const dx=e.x-p.x,dy=e.y-p.y,D=Math.hypot(dx,dy);
    if(A.k==='self'){if(D<A.R+0.2&&D<bs){bs=D;best=e;}continue;}
    const t=dx*ux+dy*uy,lat=Math.abs(dx*uy-dy*ux);if(t<-0.3||t>A.R+0.6)continue;const nearPt=Math.hypot(e.x-(p.x+ux*d),e.y-(p.y+uy*d));
    if(lat>(A.w||0.7)+0.35&&nearPt>1.1)continue;const sc=lat*2+Math.abs(t-d)*0.35;if(sc<bs){bs=sc;best=e;}}
  return best;}
function x47Pay(p,ab){const c=v158Cost(ab);if(p.qiMax>0&&c)p.qi=Math.max(0,(p.qi||0)-c);}
function x47Cd(p,ab){let cd;if(ab==='sp'){let k=null;try{k=spellKey(p);}catch(e){}const S0=k!=null&&SPELL[k];cd=(S0?S0.cd:8)*(rootKey(p)==='shikong'?0.85:1);}else cd=(ABIL[ab]&&ABIL[ab].cd)||5;
  p.acd[ab]=cd;V158.cdMax[ab]=Math.max(V158.cdMax[ab]||0,cd);V158.log.push({ab,t:S.time,e:null,free:1});if(V158.log.length>50)V158.log.shift();}
// 空放（沒有敵人時也能施放）
function x47Free(p,ab,ux,uy,d){const A=X47_AIM[ab],nm=v158Name(ab);x47Pay(p,ab);x47Cd(p,ab);faceTo(p,p.x+ux,p.y+uy);p.anim=0.35;
  if(ab==='fireball'||ab==='flysword'||ab==='sp'){let col='#ffb060';if(ab==='sp'){try{const k=rootKey(p);col=(RT[k]&&RT[k].col)||'#9fe0ff';}catch(e){}}
    const dmg=ab==='fireball'?p.atk*2.2:ab==='flysword'?p.atk*3:(typeof spellPow==='function'?spellPow(p):p.atk)*1.8;
    projectiles.push({x:p.x,y:p.y,free:1,ux,uy,left:Math.max(1,d),src:p.id,dmg,t:0,ab,col,sword:ab==='flysword'?1:0,boom:ab==='fireball'?A.aoe:0});}
  else if(ab==='charge'){p.path=[];p.dvx=p.dvy=0;if(p.task&&p.task.type==='move')p.task=null;p.x47dash={ux,uy,left:Math.max(1.2,d),t:0.7};}
  else if(ab==='sweep'){fx('sweep',p.x,p.y,'#ffe27a');}
  else if(ab==='jindan'){fx('ring',p.x,p.y,'#ffd34d');}
  floater(p.x,p.y,nm,'#ffe0a0');return 'free';}
// 主機端：依瞄準方向施放（ax,ay＝格座標落點）
function x47AimCast(p,ab,ax,ay,quiet){const why=x47Check(p,ab,quiet);if(why)return why;const A=X47_AIM[ab];if(!A)return 'bad';
  let dx=ax-p.x,dy=ay-p.y,L=Math.hypot(dx,dy);if(!isFinite(L)||L<0.15){const f=x47Face(p);dx=f.x;dy=f.y;L=A.R;}
  const ux=dx/(Math.hypot(dx,dy)||1),uy=dy/(Math.hypot(dx,dy)||1),d=Math.min(A.R,L);
  const e=x47AimTarget(p,ab,ux,uy,d);
  if(e&&v158Range(p,e,ab)){V158.pend=null;if(v158Fire(p,e,ab))return 'ok';}
  return x47Free(p,ab,ux,uy,d);}
// 空放的技能彈：直線前進，打到第一個敵人（火球會爆開）；撞牆或到達射程就消失
function x47ProjStep(q,dt){q.t+=dt;const mv=Math.min(q.left,10*dt);const src=unitById(q.src);
  const steps=Math.max(1,Math.ceil(mv/0.25));for(let k=0;k<steps;k++){const s=mv/steps;q.x+=q.ux*s;q.y+=q.uy*s;q.left-=s;
    if(blockedP(q.x,q.y)){x47ProjEnd(q,src,null);return;}
    for(const e of S.enemies){if(e.dead)continue;if(dist(q.x,q.y,e.x,e.y)<=(e.r||0.35)+0.3){x47ProjEnd(q,src,e);return;}}}
  if(q.left<=0.01||q.t>3)x47ProjEnd(q,src,null);}
function x47ProjEnd(q,src,e){q.dead=true;if(!src)return;
  if(e){dmgEnemy(src,e,q.dmg,q.col);}
  if(q.boom){for(const o of S.enemies.slice())if(o!==e&&!o.dead&&dist(o.x,o.y,q.x,q.y)<q.boom)dmgEnemy(src,o,q.dmg*0.6,q.col);fx('boom',q.x,q.y,'#ff9040');}
  else if(e)fx('ring',e.x,e.y,q.col);}
{const _up=updateProjectiles;updateProjectiles=function(dt){const F=projectiles.filter(q=>q.free);if(F.length)projectiles=projectiles.filter(q=>!q.free);
  const r=_up.apply(this,arguments);for(const q of F){if(!q.dead)x47ProjStep(q,dt);}const keep=F.filter(q=>!q.dead);if(keep.length)projectiles=projectiles.concat(keep);return r;};}
// 空放衝鋒：朝方向直衝，撞到第一個敵人造成 1.6 倍傷害並擊暈
function x47DashTick(dt){for(const u of S.units){const D=u.x47dash;if(!D)continue;if(u.dead||u.inside){u.x47dash=null;continue;}D.t-=dt;
  const mv=Math.min(D.left,11*dt);const nx=u.x+D.ux*mv,ny=u.y+D.uy*mv;
  for(const e of S.enemies){if(e.dead)continue;if(dist(nx,ny,e.x,e.y)<=(u.r||0.3)+(e.r||0.35)+0.35){dmgEnemy(u,e,u.atk*1.6,'#ffe080');if(!e.dead){if(typeof xnStun==='function')xnStun(e,0.9,u);else e.stun=Math.max(e.stun||0,0.9);}fx('ring',e.x,e.y,'#ffd080');u.x47dash=null;u.cd=0.6;break;}}
  if(!u.x47dash)continue;if(blockedP(nx,ny)||D.t<=0){u.x47dash=null;continue;}u.x=nx;u.y=ny;u.vx=D.ux*11;u.vy=D.uy*11;u.dvx=u.dvy=0;D.left-=mv;if(D.left<=0.01)u.x47dash=null;}}
// 快速點擊：保留智慧選目標；附近沒有目標時改為朝面向空放（不再顯示「附近沒有目標」）
{const _ca=v158CastAb;v158CastAb=function(p,ab,quiet){if(p&&!p.dead&&!S.interior&&X47_AIM[ab]&&!x47Check(p,ab,true)&&!v158Target(p,ab)){const f=x47Face(p),A=X47_AIM[ab];return x47AimCast(p,ab,p.x+f.x*A.R,p.y+f.y*A.R,quiet);}return _ca.apply(this,arguments);};}
// 聯機：成員的瞄準方向一起送給主機（g7 的 netFwd 'v158Cast' 允許 3 個參數）
v158NetCast=function(ab,ax,ay){if(typeof ab!=='string'||!(ab in ABIL||ab==='sp'))return false;const p=player();if(!p)return false;
  if(typeof ax==='number'&&typeof ay==='number'&&isFinite(ax)&&isFinite(ay))return x47AimCast(p,ab,ax,ay,false);return v158CastAb(p,ab,false);};
// 本地入口：依瞄準點施放（客機轉送主機）
function x47CastSlot(i,ax,ay){const p=player();if(!p)return;const ab=v158Slots()[i];if(!ab){v158Pick(i);return;}
  if(typeof v49Client==='function'&&v49Client()){v158NetCast(ab,ax,ay);v158Ui();return;}
  x47AimCast(p,ab,ax,ay,false);v158Ui();}
function x47MouseTile(){try{if(x47Touch()||mouse.inside===false||!(mouse.x>-900))return null;return tileAtWorld(screenToWorld(mouse.x,mouse.y));}catch(e){return null;}}
// 電腦：Q W E R 朝滑鼠游標（游標在敵人身上就是打那個敵人）
{const _k=v158Key;v158Key=function(i){if(!x47Touch()){const t=x47MouseTile(),p=player();if(t&&p&&v158Slots()[i]){x47CastSlot(i,t.x,t.y);return;}}return _k.apply(this,arguments);};}
// ---- 手機：按住技能鈕拖曳 → 地面顯示方向／範圍；放開施放；拖回按鈕中心或拖到 ✕ 取消 ----
const X47_DRAG_FULL=90,X47_DRAG_START=12,X47_DRAG_CANCEL=22;
function x47ScrToDir(dx,dy){// 螢幕位移 → 格座標方向（iso 反轉）
  const tx=(dx/HW+dy/HH)/2,ty=(dy/HH-dx/HW)/2,l=Math.hypot(tx,ty)||1;return {x:tx/l,y:ty/l};}
function x47CancelEl(){let el=document.getElementById('x47cancel');if(!el){el=document.createElement('div');el.id='x47cancel';el.className='ui';el.textContent='✕';x47Root().appendChild(el);}return el;}
function x47AimUpd(ev){const A=X47.aim;if(!A)return;const dx=ev.clientX-A.sx,dy=ev.clientY-A.sy,len=Math.hypot(dx,dy);
  if(!A.on){if(len<X47_DRAG_START)return;A.on=true;if(V158.lp){clearTimeout(V158.lp.h);V158.lp.done=true;}const c=x47CancelEl();const br=A.btn.getBoundingClientRect();
    c.style.left=Math.round(Math.max(8,br.left-150))+'px';c.style.top=Math.round(Math.max(60,br.top-150))+'px';c.style.display='block';A.cz=c.getBoundingClientRect();}
  const p=player();const AA=X47_AIM[A.ab];if(!p||!AA)return;const d=x47ScrToDir(dx,dy),k=Math.min(1,len/X47_DRAG_FULL);
  A.ux=d.x;A.uy=d.y;A.dist=AA.k==='self'?0:Math.max(0.6,k*AA.R);A.ax=p.x+d.x*(AA.k==='self'?1:A.dist);A.ay=p.y+d.y*(AA.k==='self'?1:A.dist);
  const cz=A.cz;const inCz=cz&&ev.clientX>=cz.left-10&&ev.clientX<=cz.right+10&&ev.clientY>=cz.top-10&&ev.clientY<=cz.bottom+10;
  A.cancel=len<X47_DRAG_CANCEL||inCz;const c=document.getElementById('x47cancel');if(c)c.classList.toggle('hot',!!inCz);}
function x47AimEnd(ev,ok){const A=X47.aim;X47.aim=null;const c=document.getElementById('x47cancel');if(c){c.style.display='none';c.classList.remove('hot');}
  if(!A||!A.on)return null;// 沒拖動 → 交給原本的點擊（智慧選目標）
  if(V158.lp)V158.lp.done=true;else V158.lp={done:true,h:0};// 吃掉接下來的 click
  if(!ok||A.cancel){toast('已取消施放');return 'cancel';}
  x47CastSlot(A.i,A.ax,A.ay);return 'cast';}
addEventListener('pointerdown',ev=>{if(ev.pointerType==='mouse')return;const b=ev.target&&ev.target.closest&&ev.target.closest('#v158bar [data-v158]');if(!b)return;
  const i=+b.dataset.v158,ab=v158Slots()[i];if(!ab||!X47_AIM[ab])return;X47.aim={i,ab,btn:b,pid:ev.pointerId,sx:ev.clientX,sy:ev.clientY,on:false,cancel:false};},true);
addEventListener('pointermove',ev=>{if(X47.aim&&ev.pointerId===X47.aim.pid){x47AimUpd(ev);if(X47.aim&&X47.aim.on)ev.preventDefault();}},{capture:true,passive:false});
addEventListener('pointerup',ev=>{if(X47.aim&&ev.pointerId===X47.aim.pid)x47AimEnd(ev,true);},true);
addEventListener('pointercancel',ev=>{if(X47.aim&&ev.pointerId===X47.aim.pid)x47AimEnd(ev,false);},true);
// 地面指示（射程圈＋方向／落點／範圍）
function x47Scr(x,y){const q=iso(x,y);return {x:(q.x-cam.x)*cam.zoom+W/2,y:(q.y-cam.y)*cam.zoom+H/2};}
function x47Ring(cx,cy,r,n){ctx.beginPath();for(let k=0;k<=n;k++){const a=k/n*Math.PI*2,s=x47Scr(cx+Math.cos(a)*r,cy+Math.sin(a)*r);if(k)ctx.lineTo(s.x,s.y);else ctx.moveTo(s.x,s.y);}ctx.closePath();}
function x47DrawAim(){const A=X47.aim;if(!A||!A.on)return;const p=player();const AA=X47_AIM[A.ab];if(!p||!AA)return;
  ctx.save();ctx.setTransform(dpr,0,0,dpr,0,0);const bad=A.cancel,c1=bad?'rgba(255,90,70,':'rgba(120,200,255,';
  x47Ring(p.x,p.y,AA.R,48);ctx.fillStyle=c1+'0.10)';ctx.fill();ctx.strokeStyle=c1+'0.6)';ctx.lineWidth=1.5;ctx.stroke();
  if(AA.k==='self'){x47Ring(p.x,p.y,AA.R,40);ctx.fillStyle=c1+'0.22)';ctx.fill();}
  else{const w=(AA.w||0.6)/2,nx=-A.uy*w,ny=A.ux*w,ex=p.x+A.ux*A.dist,ey=p.y+A.uy*A.dist;const pts=[[p.x+nx,p.y+ny],[ex+nx,ey+ny],[ex-nx,ey-ny],[p.x-nx,p.y-ny]].map(q=>x47Scr(q[0],q[1]));
    ctx.beginPath();pts.forEach((s,k)=>k?ctx.lineTo(s.x,s.y):ctx.moveTo(s.x,s.y));ctx.closePath();ctx.fillStyle=c1+'0.30)';ctx.fill();ctx.strokeStyle=c1+'0.85)';ctx.stroke();
    if(AA.aoe){x47Ring(ex,ey,AA.aoe,28);ctx.fillStyle=c1+'0.25)';ctx.fill();ctx.stroke();}
    else{const s=x47Scr(ex,ey);ctx.beginPath();ctx.arc(s.x,s.y,5,0,Math.PI*2);ctx.fillStyle=c1+'0.9)';ctx.fill();}}
  ctx.restore();}
{const _dr=draw;draw=function(){const r=_dr.apply(this,arguments);try{x47DrawAim();}catch(e){}return r;};}
// ---------- #15 雙擊建築：列出畫面內同類建築與內部人數 ----------
function x47OnScreen(x,y){const s=x47Scr(x,y);return s.x>-40&&s.x<W+40&&s.y>-40&&s.y<H+40;}
function x47SameBuildings(b){if(!b)return [];return S.buildings.filter(o=>o.type===b.type&&o.built!==false&&x47OnScreen(o.i+1,o.j+1));}
function x47BuildList(b){const L=x47SameBuildings(b);if(!L.length)return 0;let tot=0;
  const rows=L.map((o,k)=>{const oc=occupants(o);tot+=oc.length;const nm=oc.slice(0,4).map(u=>u.name).join('、')+(oc.length>4?'…':'');return `<tr><td>${k+1}</td><td>${typeof blv==='function'?'Lv'+blv(o):''}</td><td>${oc.length} 人</td><td class="dim sm">${nm||'—'}</td><td><button class="btn mini" data-x47b="${o.id}">選取</button></td></tr>`;}).join('');
  x47Dlg({id:'blist',t:`🏯 畫面內的「${bName(b)}」×${L.length}`,h:`<div style="max-height:46vh;overflow:auto"><table style="width:100%;border-collapse:collapse"><tr><th>#</th><th>等級</th><th>內部</th><th>弟子</th><th></th></tr>${rows}</table></div><div class="dim">共 ${tot} 人在內</div>`,btn:[{l:'關閉'}]});return L.length;}
addEventListener('click',ev=>{const b=ev.target&&ev.target.closest&&ev.target.closest('#x47dlg [data-x47b]');if(!b)return;ev.stopPropagation();const o=bById(+b.dataset.x47b);x47DlgClose();if(o){selUnits=[];selOther=null;selBuilding=o.id;panelKeyCache=null;v47Look(o.i+1,o.j+1);}},true);
// ---------- #59 智能分配：庫存目標可用 －／＋ 調整（存在存檔 S.alloc.tg）----------
function x47AllocSync(){if(!S||!S.alloc||typeof TUNE==='undefined'||!TUNE.allocTarget)return;if(!X47.alDef)X47.alDef=Object.assign({},TUNE.allocTarget);
  const tg=S.alloc.tg||{};for(const r in X47.alDef)TUNE.allocTarget[r]=tg[r]>0?tg[r]:X47.alDef[r];}
function x47AllocStep(v){return v<100?10:v<400?25:v<1000?50:100;}
{const _ra=renderAlloc;renderAlloc=function(){x47AllocSync();const k0=allocKey;const r=_ra.apply(this,arguments);try{if(allocKey!==k0||!document.querySelector('#alloc .x47tg')){const el=document.getElementById('alloc');if(el&&allocOpen){
    el.querySelectorAll('tr').forEach((tr,i)=>{if(!i)return;const r2=ALLOC_RES[i-1];const td=tr.children[3];if(!td||!r2)return;td.innerHTML=`${Math.floor(S.res[r2])}／<button class="btn mini x47tg" data-x47tg="${r2}" data-d="-1">－</button> <b>${TUNE.allocTarget[r2]}</b> <button class="btn mini x47tg" data-x47tg="${r2}" data-d="1">＋</button>`;});
    const th=el.querySelector('tr th:nth-child(4)');if(th)th.textContent='庫存／目標（可調）';}}}catch(e){}return r;};}
function x47AllocAdj(r,d){const A=S.alloc;if(!A)return;A.tg=A.tg||{};x47AllocSync();const cur=TUNE.allocTarget[r]||0;const st=x47AllocStep(d<0?Math.max(0,cur-1):cur);A.tg[r]=Math.max(10,Math.min(99990,cur+d*st));x47AllocSync();allocKey=null;try{renderAlloc();}catch(e){}}
addEventListener('click',ev=>{const b=ev.target&&ev.target.closest&&ev.target.closest('#alloc [data-x47tg]');if(!b)return;ev.stopPropagation();x47AllocAdj(b.dataset.x47tg,+b.dataset.d);},true);
// ---------- #119 金手指／除錯面板（設定 → 遊戲 → 除錯面板；聯機客機停用）----------
const X47_DBG=[['res','資源各 +1000',()=>{for(const k in S.res)S.res[k]+=1000;try{const names=(typeof MAT_NAMES!=='undefined'&&MAT_NAMES)||{};for(const k in names){if(typeof addMat==='function')addMat(k,1000);else{S.mats=S.mats||{};S.mats[k]=(S.mats[k]||0)+1000;}}}catch(e){}try{if(typeof toast==='function')toast('資源與材料各 +1000');}catch(e){}}],['ls','靈石全品 +500',()=>{S.res.lingshi=(S.res.lingshi||0)+500;try{if(S.econ&&S.econ.vault){for(const g of ['xia','zhong','shang','ji'])S.econ.vault[g]=(S.econ.vault[g]||0)+500;if(typeof econSyncResFromVault==='function')econSyncResFromVault(S);}}catch(e){}toast('下品／中品／上品／極品靈石各 +500');}],
  ['xiu','自己修為圓滿',()=>{const p=player();if(p)p.xiu=needXiu(p);}],['brk','自己立即突破',()=>{const p=player();if(p&&p.realm<REALMS.length-1){p.xiu=needXiu(p);if(!tryBreak(p))doBreak(p);}}],
  ['dxiu','全弟子修為圓滿',()=>{for(const u of disciples())if(!u.dead)u.xiu=needXiu(u);}],['heal','全員回滿氣血／靈氣',()=>{for(const u of S.units)if(!u.dead){u.hp=u.maxhp;if(u.qiMax)u.qi=u.qiMax;}}],
  ['god','無敵（切換）',()=>{X47.god=!X47.god;toast(X47.god?'無敵：開':'無敵：關');}],['spd','時間 ×1／×3（切換）',()=>{X47.spd=X47.spd>1?1:3;toast('時間倍率 ×'+X47.spd);}],
  ['kill','清除 15 格內敵人',()=>{const p=player();if(!p)return;for(const e of S.enemies.slice())if(!e.dead&&dist(p.x,p.y,e.x,e.y)<15)dmgEnemy(p,e,1e9);}],
  ['raid','山賊立即來襲',()=>{const v=S.villages.find(v=>v.type==='bandit'&&!v.destroyed);if(v){v.warned=true;v.raidT=S.time+10;toast('10 秒後山賊來襲');}else toast('沒有山寨');}],
  ['ev','觸發仙緣事件',()=>{x47DbgClose();evTrigger(null,'除錯');}],['map','揭開全地圖（切換）',()=>{X47.nofog=!X47.nofog;if(typeof resetFog==='function')resetFog();if(typeof mmDirty!=='undefined')mmDirty=true;if(typeof toast==='function')toast(X47.nofog?'迷霧作弊：開':'迷霧作弊：關（已恢復，無需重啟）');}],
  ['cd','技能冷卻歸零',()=>{const p=player();if(p)p.acd={};}],['day','時間 +60 秒',()=>{S.time+=60;}]];
function x47DevMode(){try{const h=location.hostname;return /(?:^|[?&])dev=1(?:&|$)/.test(location.search)||h==='localhost'||h==='127.0.0.1'||location.protocol==='file:';}catch(e){return false;}}
function x47DbgAllowed(){return x47DevMode()&&!(typeof v49Client==='function'&&v49Client());}
function x47DbgOpen(){if(!x47DbgAllowed()){toast('聯機客機不能使用除錯面板');return;}let el=document.getElementById('x47dbg');if(!el){el=document.createElement('div');el.id='x47dbg';el.className='ui';x47Root().appendChild(el);
    el.addEventListener('click',ev=>{ev.stopPropagation();const b=ev.target.closest('[data-x47g]');if(!b)return;if(b.dataset.x47g==='x'){x47DbgClose();return;}const D=X47_DBG.find(d=>d[0]===b.dataset.x47g);if(D){try{D[2]();}catch(e){console.error(e);toast('除錯：失敗');}X47.dbgLog=(X47.dbgLog||0)+1;}});
    // 20261106e：不攔截 wheel，長列表（功能開關）才滾得動
    ['pointerdown','touchstart','mousedown'].forEach(t=>el.addEventListener(t,ev=>ev.stopPropagation(),{passive:true}));}
  el.innerHTML=`<h3>🛠 除錯面板 <span class="dim sm">（測試用，會影響存檔）</span></h3><div class="g">${X47_DBG.map(d=>`<button class="btn" data-x47g="${d[0]}">${d[1]}</button>`).join('')}</div><div style="text-align:right;margin-top:8px"><button class="btn pri" data-x47g="x">關閉</button></div>`;el.style.display='block';}
function x47DbgClose(){const el=document.getElementById('x47dbg');if(el)el.style.display='none';}
function x47DbgBtn(){let b=document.getElementById('x47dbgbtn');if(!b){b=document.createElement('button');b.id='x47dbgbtn';b.className='ui';b.title='除錯面板（可拖曳；Ctrl+Shift+D）';b.textContent='🛠';x47Root().appendChild(b);
    // 20261106e：可拖曳並記住位置；點擊仍開關（拖曳後抑制 click）
    let drag=null,moved=0;
    b.addEventListener('pointerdown',ev=>{if(ev.button!=null&&ev.button!==0)return;drag={x:ev.clientX,y:ev.clientY,l:b.offsetLeft,t:b.offsetTop};moved=0;try{b.setPointerCapture(ev.pointerId);}catch(e){}});
    b.addEventListener('pointermove',ev=>{if(!drag)return;const dx=ev.clientX-drag.x,dy=ev.clientY-drag.y;if(Math.hypot(dx,dy)>4)moved=1;
      if(!moved)return;let nl=drag.l+dx,nt=drag.t+dy;nl=Math.max(0,Math.min(innerWidth-b.offsetWidth,nl));nt=Math.max(0,Math.min(innerHeight-b.offsetHeight,nt));
      b.style.left=nl+'px';b.style.top=nt+'px';b.style.right='auto';b.style.bottom='auto';});
    b.addEventListener('pointerup',ev=>{if(!drag)return;const was=moved;drag=null;if(was){try{XW_PREFS.set('dbgbtn',JSON.stringify({l:b.style.left,t:b.style.top}));}catch(e){}b._suppressClick=1;setTimeout(()=>{b._suppressClick=0;},0);}});
    b.addEventListener('click',ev=>{ev.stopPropagation();if(b._suppressClick){ev.preventDefault();return;}const el=document.getElementById('x47dbg');if((document.body.classList.contains('x47dbgopen'))||(el&&el.style.display==='block'&&!el.classList.contains('x47dbg-closed')))x47DbgClose();else x47DbgOpen();});
    try{const s=JSON.parse(XW_PREFS.get('dbgbtn','null'));if(s&&s.l&&s.t){b.style.left=s.l;b.style.top=s.t;b.style.right='auto';b.style.bottom='auto';}}catch(e){}}
  document.body.classList.toggle('x47dbgon',!!CFG173.dbg&&x47DbgAllowed());}
addEventListener('keydown',ev=>{if((ev.ctrlKey||ev.metaKey)&&ev.shiftKey&&(ev.code==='KeyD'||(ev.key&&String(ev.key).toLowerCase()==='d'))){ev.preventDefault();ev.stopImmediatePropagation();if(!x47DevMode())return;if(!CFG173.dbg){toast('請先到 設定 → 遊戲 開啟「除錯面板」');return;}if(document.body.classList.contains('x47dbgopen'))x47DbgClose();else x47DbgOpen();}},true);
// ---------- #182 主選單合併：⏸ 與 ☰ 開同一個選單；系統介紹改為可摺疊分類 ----------
function x47Ver(){try{return (typeof CHANGELOG!=='undefined'&&CHANGELOG[0]&&CHANGELOG[0].v)||'';}catch(e){return '';}}
const X47_SYSCAT=[['修煉與境界',['境界','靈根','修煉','突破','領悟','罡氣','靈氣','修為','功法稀有','仙緣','閉關','講道']],
  ['弟子與宗門',['弟子','守衛','村衛','技藝','聲望','宗門目標','宗門防衛','室內','工匠','頭像列（大量']],
  ['建築與生產',['建築','鍛造','熔鍊','煉丹','丹毒','丹藥','倉庫','總倉','陣法','拍賣']],
  ['戰鬥與秘境',['副本','秘境','仙凡','首領','敵人','受擊','神識','連招','技能','撤退','卡位','比武','傳送']],
  ['介面與設定',['字體','頭像','面板分頁','更新公告','設定']],['聯機',['聯機']]];
function x47SysGroups(){const G=X47_SYSCAT.map(c=>({n:c[0],k:c[1],L:[]})),other={n:'其他',L:[]};
  SYS_TXT.forEach((x,i)=>{const g=G.find(g=>g.k.some(k=>x[0].includes(k)));(g||other).L.push(i);});if(other.L.length)G.push(other);return G.filter(g=>g.L.length);}
function x47SysHtml(){return x47SysGroups().map((g,gi)=>`<details class="x47cat"${gi===0?' open':''}><summary>${g.n} <span class="dim sm">（${g.L.length}）</span></summary>`+
  g.L.map(i=>{const X=SYS_TXT[i];let body='';try{body=X[2]();}catch(e){body='—';}return `<details class="x47sys"><summary>${X[0]}${X[1]?`<span class="dim sm">　${X[1]}</span>`:''}</summary><div class="psys">${body}</div></details>`;}).join('')+'</details>').join('');}
const X47_MENU_CSS=`#v47pause .pbox.x47m{width:min(560px,96vw);padding:14px 16px}
#v47pause .x47m h3{display:flex;align-items:baseline;gap:8px;margin:0 0 10px}#v47pause .x47m h3 .ver{margin-left:auto;font-size:12px;font-weight:normal;color:#b9a77f}
#v47pause .x47m .x47body{overflow:auto;max-height:calc(92vh - 110px);min-height:0}
#v47pause .x47g{margin:0 0 10px}#v47pause .x47g>.gt{font-size:12px;color:#c9a35a;letter-spacing:2px;margin:0 0 4px;border-bottom:1px solid #8a6a3a55;padding-bottom:2px}
#v47pause .x47g .gb{display:grid;grid-template-columns:repeat(3,1fr);gap:6px}#v47pause .x47g .gb .btn{min-height:38px;text-align:left;padding:4px 10px}
body.touch #v47pause .x47g .gb{grid-template-columns:repeat(2,1fr)}body.touch #v47pause .x47g .gb .btn{min-height:44px}
#v47pause .x47g .gb .btn.pri{grid-column:span 1}#v47pause .x47foot{display:flex;justify-content:space-between;gap:8px;margin-top:6px}
#v47pause details.x47cat{border:1px solid #8a6a3a77;border-radius:8px;margin:0 0 6px;padding:2px 8px;background:#2a1d1288}#v47pause details.x47cat>summary{cursor:pointer;font-weight:bold;color:#ffd98a;padding:6px 0;min-height:28px}
#v47pause details.x47sys{border-top:1px solid #8a6a3a33;padding:2px 0 2px 8px}#v47pause details.x47sys>summary{cursor:pointer;padding:5px 0;min-height:24px}#v47pause details.x47sys .psys{font-size:13px;line-height:1.55;padding:2px 0 8px}
body.touch #v47pause details>summary{padding:9px 0}
#v47pause .xwsect-pane{display:none;padding:6px 2px 2px}#v47pause .xwsect-pane.on{display:block}`;
pauseHtml=function(tab){const sfxOn=SFX.on(),co=typeof netCoopOn==='function'&&netCoopOn();const inst=document.getElementById('m_install');const canInst=inst&&inst.style.display!=='none';
  const X47_MID={quick:'m_quick',save:'m_save',load:'m_load',title:'m_new',tut:'m_tut',help:'m_help',guide:'m_guide'};const B=(a,l,c)=>`<button class="btn ${c||''}" data-pz="${a}"${tab==='sys'||!X47_MID[a]?'':` id="${X47_MID[a]}"`}>${l}</button>`;
  let h=`<div class="pbox x47m"><h3>⏸ 暫停</h3><div class="x47body">`;
  if(tab==='sys'){h=h.replace('<h3>⏸ 暫停</h3>','<h3>⏸ 暫停</h3>');h+=`<div class="x47foot" style="margin:0 0 8px">${B('back','◀ 返回選單')}<span class="dim sm">點分類展開；再點條目看說明</span></div>${x47SysHtml()}`;}
  else{h+=`<div class="x47g"><div class="gt">遊戲</div><div class="gb"><button class="btn pri" data-pz="resume">▶ 繼續遊戲</button>${B('set','⚙ 設定')}${B('sfx',sfxOn?'🔊 音效：開':'🔇 音效：關')}</div></div>
<div class="x47g"><div class="gt">宗門</div><div class="gb">${B('bag','🎒 行囊')}${B('alloc','⚖ 智能分配')}${B('net','🌐 聯機')}</div></div>
<div class="x47g"><div class="gt">存檔</div><div class="gb">${B('quick','⚡ 快速存檔')}${B('save','💾 存檔…')}${B('load','📂 讀取…')}</div></div>
<div class="x47g"><div class="gt">說明</div><div class="gb">${B('guide','📖 修仙指南')}${B('sys','📜 系統介紹')}${B('help','⌨ 操作說明')}${B('tut','🎓 新手教學')}${B('news',typeof TXT175!=='undefined'?TXT175.btn:'📯 更新公告')}${canInst?B('install','📲 安裝 App'):''}</div></div>
<div class="x47g"><div class="gb">${B('title','🏠 回到標題','warn')}</div></div>`;}
  h+=`</div><div class="x47foot dim sm"><span>${co?'聯機中：開選單不會暫停世界':'Esc、⏸ 或 ☰ 開關選單；遊戲時間已停止'}</span><span>版本 v${x47Ver()}</span></div></div>`;return h;};
{const _pa=pauseAct;pauseAct=function(a){const ret=()=>{openPause(false);V47.pauseRet=performance.now();};
  if(a==='sys'){const el=document.getElementById('v47pause');if(el){el.innerHTML=pauseHtml('sys');}return;}
  if(a==='back'){const el=document.getElementById('v47pause');if(el)el.innerHTML=pauseHtml();return;}
  if(a==='bag'){openPause(false);toggleBag(true);return;}
  if(a==='alloc'){openPause(false);toggleAlloc(true);return;}
  if(a==='quick'){openPause(false);quickSave();return;}
  if(a==='net'){openPause(false);const b=document.getElementById('b_net');if(b)b.click();else toast('聯機尚未載入');return;}
  if(a==='install'){openPause(false);const b=document.getElementById('m_install');if(b)b.click();return;}
  if(a==='sfx'){try{localStorage.setItem('xw_sfx',SFX.on()?'0':'1');}catch(e){}const el=document.getElementById('v47pause');if(el)el.innerHTML=pauseHtml();return;}
  return _pa.apply(this,arguments);};}
// 讀檔成功後不要再跳回選單
{const _as=applySave;applySave=function(){const r=_as.apply(this,arguments);try{V47.pauseRet=null;}catch(e){}return r;};}
// ☰ 也開同一個選單（不再顯示舊的下拉選單）
addEventListener('click',ev=>{const b=ev.target&&ev.target.closest&&ev.target.closest('#b_menu');if(!b)return;ev.stopImmediatePropagation();ev.preventDefault();try{setMenu(false);}catch(e){}openPause(!V47.pause);},true);
function x47MenuInit(){for(const id of ['m_quick','m_save','m_load','m_new','m_tut','m_help','m_guide']){const e=document.querySelector('#menuPop #'+id);if(e)e.id=id+'_x47old';}if(x47Ver()){const V='v'+x47Ver(),rv=t=>t.replace(/v0\.\d+\.\d+[a-z]?/,V);for(const e of document.querySelectorAll('#help h2'))e.textContent=rv(e.textContent);document.title=rv(document.title);}if(!document.getElementById('x47mcss')){const st=document.createElement('style');st.id='x47mcss';st.textContent=X47_MENU_CSS;document.head.appendChild(st);}
  const v=document.getElementById('m_ver');if(v)v.textContent='版本 v'+x47Ver();const b=document.getElementById('b_menu');if(b)b.title='主選單（Esc）';}
// ---------- 每幀／定時掛勾 ----------
{const _u=update;update=function(dt){const k=(X47.spd>1&&CFG173.dbg&&x47DbgAllowed())?X47.spd:1;let r;for(let i=0;i<k;i++)r=_u.call(this,dt);
  try{x47DashTick(dt*k);if(X47.god&&CFG173.dbg&&x47DbgAllowed()){const p=player();if(p&&!p.dead)p.hp=p.maxhp;}
    X47.tk=(X47.tk||0)+dt;if(X47.tk>=0.25){X47.tk=0;x47DgTick();x47EvTick();}}catch(e){console.error('[x47] tick',e);}return r;};}
function x47UiTick(){try{x47ModalTick();}catch(e){}try{x47HudTick();}catch(e){}try{x47PlaceCombo();}catch(e){}try{if(S&&S.units)x47RaidUi();}catch(e){}try{x47DlgTick();}catch(e){}
  try{X47.kt=(X47.kt||0)+1;if(X47.kt%4===0)x47KeyHints();}catch(e){}try{x47MusicTick();}catch(e){}try{x47DbgBtn();}catch(e){}
  try{const bar=document.getElementById('v158bar');if(bar){const t=x47Touch();bar.querySelectorAll('[data-v158]').forEach(b=>{if((b.getAttribute('draggable')==='true')===t)b.setAttribute('draggable',t?'false':'true');});}}catch(e){}}
{const _ap=v173Apply;v173Apply=function(){const r=_ap.apply(this,arguments);try{x47KeyHints();x47DbgBtn();x47MusicTick();}catch(e){}return r;};}
// ---------- #183 手機 HUD 重整：精簡單位條、指令收進「指令」扇形鈕、弟子列／小地圖可收合，直式橫式各自排版 ----------
const X47_FAN=['a_gather','a_build','a_skill','a_med','a_home','a_all','a_box','a_cancel'];
const X47_HUD_CSS=`
body.touch #panel.x47slim>*:not(.x47pclose):not(.x47ptog):not(h4):not(.mini):not(.bar):not(.pbar){display:none!important}
body.touch #panel.x47slim .x47pclose,body.touch #panel.x47slim .x47ptog{height:34px;min-width:38px;min-height:34px}
body.touch #panel.x47slim{padding:5px 8px 6px;max-height:none!important;overflow:hidden}
body.touch #panel.x47slim h4{white-space:nowrap;overflow:hidden;text-overflow:ellipsis;margin:0 64px 2px 0;font-size:12.5px}
body.touch #panel.x47slim h4 .pexp,body.touch #panel.x47slim .v55i,body.touch #panel.x47slim h4 .info{display:none}
body.touch #panel.x47slim .bar,body.touch #panel.x47slim .pbar{height:5px;margin:2px 0}
body.touch #panel.x47slim .mini{white-space:nowrap;overflow:hidden;text-overflow:ellipsis;font-size:11px}
body.touch #panel.x47slim h4,body.touch #panel.x47slim .mini,body.touch #panel.x47slim .bar,body.touch #panel.x47slim .pbar{cursor:pointer}
body.touch #panel .x47ptog{float:right;position:sticky;top:0;margin:-2px 4px 0 0;min-width:40px;height:40px;border-radius:10px;border:1px solid #c9a25a88;background:#2a1c10dd;color:#ffe9a8;font-size:15px;z-index:2}
body:not(.touch) #panel .x47ptog{display:none}
@media (orientation:portrait){body.touch #panel{max-width:calc(100vw - var(--sal,0px) - var(--sar,0px) - 132px)!important}
  body.touch #panel.x47slim{right:auto!important;width:min(calc(100vw - var(--sal,0px) - var(--sar,0px) - 140px),270px)!important}
  body.touch #panel:not(.x47slim){max-height:52vh!important;overflow:auto}}
@media (orientation:landscape) and (max-height:560px){body.touch #panel.x47slim{max-width:340px!important;margin:0!important;right:auto!important;left:calc(var(--sal,0px) + 124px)!important}body.touch #panel:not(.x47slim){max-height:calc(100vh - var(--tb,60px) - 24px)!important;overflow:auto}}
#x47fan{display:none}
body.touch.x47fanon #x47fan{display:flex;align-items:center;justify-content:center;flex-direction:column;line-height:1.05}
body.touch.x47fanon:not(.x47fan) #actions>.x47fi:not(.x47ctx){display:none!important}
body.touch.x47fanon #actions>.x47fi.x47ctx{display:flex}
body.touch.x47fanon.x47fan #actions>.x47fi{position:absolute;display:flex!important;right:calc(var(--fc)*52px);bottom:calc(52px + var(--fr)*52px);width:46px;height:46px;box-shadow:0 0 0 2px #ffd75e55,0 4px 10px #000a;animation:x47pop .14s ease-out}
body.touch.x47fanon.x47fan #v158bar,body.touch.x47fanon.x47fan #v48cb{visibility:hidden}
body.touch.x47fanon.x47fan #x47fan{background:#5a2a18;border-color:#ffb070}
@keyframes x47pop{from{transform:scale(.4);opacity:0}to{transform:none;opacity:1}}
body.touch.x47fanon #actions{grid-template-columns:repeat(1,46px)!important;direction:ltr}
#x47obt{display:none}body.touch #x47obt{display:flex;position:fixed;top:calc(var(--tb,56px) + 6px);left:calc(var(--sal,0px) + 6px);width:26px;height:26px;align-items:center;justify-content:center;border-radius:7px;border:1px solid #8a6a3a99;background:#1a120bcc;color:#ffe9a8;font-size:14px;z-index:11;padding:0}body.touch:not(.x47objoff) #objectives{left:calc(var(--sal,0px) + 36px)}body.touch.x47objoff #objectives{display:none!important}body.tut #x47obt{display:none!important}#x47mmt{display:none}
body.touch #x47mmt{display:flex;position:fixed;top:calc(var(--tb,56px) + 6px);right:calc(var(--sar,0px) + 114px);width:30px;height:30px;align-items:center;justify-content:center;border-radius:8px;border:1px solid #8a6a3a99;background:#1a120bcc;color:#ffe9a8;font-size:14px;z-index:9;padding:0}
body.touch.x47mmoff #x47mmt{right:calc(var(--sar,0px) + 6px)}
body.touch.x47mmoff #minimap{display:none!important}
`;
function x47HudPrefs(){if(!X47.hud){let o={};try{o=JSON.parse(XW_PREFS.get('x47hud','{}'))||{};}catch(e){o={};}X47.hud=Object.assign({mm:1},o);}return X47.hud;}
function x47HudSave(){try{XW_PREFS.set('x47hud',JSON.stringify(X47.hud||{}));}catch(e){}}
function x47FanActive(){return !!(isTouchUI&&!(typeof tutActive==='function'&&tutActive()));}
function x47FanSet(v){X47.fan=!!v;document.body.classList.toggle('x47fan',X47.fan&&x47FanActive());const b=document.getElementById('x47fan');if(b)b.innerHTML=X47.fan?'✕<small style="font-size:9.5px">收起</small>':'☰<small style="font-size:9.5px">指令</small>';
  if(X47.fan){const land=innerWidth>innerHeight,cols=land?4:2;let k=0;for(const id of X47_FAN){const e=document.getElementById(id);if(!e)continue;e.style.setProperty('--fc',k%cols);e.style.setProperty('--fr',Math.floor(k/cols));k++;}}}
function x47CtxGather(){const p=player();if(!p||p.dead)return false;if(S.interior)return true;if(nodeNear(p.x,p.y,2.2))return true;
  for(const b of S.buildings){if(b.built&&b.hp>=b.maxhp)continue;if(distRect(p.x,p.y,b.i,b.j,BUILD[b.type].size)<1.8)return true;}return false;}
function x47HudInit(){if(document.getElementById('x47hudcss'))return;const st=document.createElement('style');st.id='x47hudcss';st.textContent=X47_HUD_CSS;document.head.appendChild(st);
  const A=document.getElementById('actions');if(A&&!document.getElementById('x47fan')){const b=document.createElement('button');b.className='abtn big';b.id='x47fan';b.type='button';b.title='指令：取消、框選、回到自己、全選弟子、技能、打坐、建造、採集';A.insertBefore(b,A.firstChild);
    for(const id of X47_FAN){const e=document.getElementById(id);if(e)e.classList.add('x47fi');}}
  const mm=document.createElement('button');mm.id='x47mmt';mm.type='button';mm.className='ui';x47Root().appendChild(mm);
  const ob=document.createElement('button');ob.id='x47obt';ob.type='button';ob.className='ui';x47Root().appendChild(ob);
  x47FanSet(false);x47MmApply();x47ObjApply();}
function x47ObjApply(){const H=x47HudPrefs();const on=H.obj!==0;document.body.classList.toggle('x47objoff',!on);const b=document.getElementById('x47obt');if(b){b.textContent=on?'‹':'◎';b.title=on?'收合宗門目標':'顯示宗門目標';}}
function x47MmApply(){const on=!!x47HudPrefs().mm;document.body.classList.toggle('x47mmoff',!on);const b=document.getElementById('x47mmt');if(b){b.textContent=on?'－':'🗺';b.title=on?'收合小地圖':'顯示小地圖';}}
addEventListener('click',ev=>{const t=ev.target&&ev.target.closest?ev.target:null;if(!t)return;
  if(t.closest('#x47fan')){ev.stopPropagation();ev.preventDefault();x47FanSet(!X47.fan);return;}
  if(t.closest('#x47obt')){ev.stopPropagation();ev.preventDefault();const H=x47HudPrefs();H.obj=H.obj===0?1:0;x47HudSave();x47ObjApply();return;}
  if(t.closest('#x47mmt')){ev.stopPropagation();ev.preventDefault();const H=x47HudPrefs();H.mm=H.mm?0:1;x47HudSave();x47MmApply();return;}
  if(X47.fan&&t.closest('#actions .x47fi'))setTimeout(()=>x47FanSet(false),0);// 選了指令就收起
  const pt=t.closest('#panel .x47ptog,#panel.x47slim h4,#panel.x47slim .mini,#panel.x47slim .bar,#panel.x47slim .pbar');
  if(pt&&isTouchUI){ev.stopPropagation();ev.preventDefault();X47.pexp=!X47.pexp;x47PanelSlim();}},true);
addEventListener('pointerdown',ev=>{if(!X47.fan)return;const t=ev.target;if(t&&t.closest&&t.closest('#actions'))return;x47FanSet(false);},true);
function x47SelKey(){return (selBuilding!=null?'b'+selBuilding:'')+'|'+(typeof selOther!=='undefined'&&selOther?'o'+(selOther.id!=null?selOther.id:'x'):'')+'|'+selUnits.join(',');}
function x47PanelSlim(){const el=document.getElementById('panel');if(!el)return;const k=x47SelKey();if(k!==X47.pexpKey){X47.pexpKey=k;X47.pexp=false;}
  const slimOk=isTouchUI&&selBuilding==null&&!S.interior;const slim=slimOk&&!X47.pexp;el.classList.toggle('x47slim',slim);
  let tg=el.querySelector(':scope > .x47ptog');if(slimOk&&el.innerHTML){if(!tg){tg=document.createElement('button');tg.className='x47ptog';tg.type='button';const c=el.querySelector(':scope > .x47pclose');el.insertBefore(tg,c?c.nextSibling:el.firstChild);}
    const t=slim?'▾':'▴';if(tg.textContent!==t){tg.textContent=t;tg.title=slim?'展開詳細資訊':'收成精簡列';}}else if(tg)tg.remove();}
{const _rp=renderPanel;renderPanel=function(){const r=_rp.apply(this,arguments);try{x47PanelSlim();}catch(e){}return r;};}
function x47HudTick(){if(!document.getElementById('x47fan'))return;const on=x47FanActive();document.body.classList.toggle('x47fanon',on);if(!on&&X47.fan)x47FanSet(false);
  if(on){const g=document.getElementById('a_gather');if(g){const c=x47CtxGather();g.classList.toggle('x47ctx',c);}}
  if(isTouchUI&&!X47.pbInit&&typeof pbCfg==='function'){X47.pbInit=1;try{if(!XW_PREFS.has('pbar')){const c=pbCfg();c.col=1;PB.key=null;pbApply();}}catch(e){}}
  try{x47PanelSlim();}catch(e){}}
// 可視戰場比例（測試／除錯用）：以 10px 網格估算 #root 內不透明介面蓋住的面積
function x47FreeArea(){const W=innerWidth,H=innerHeight,st=10,nx=Math.ceil(W/st),ny=Math.ceil(H/st),g=new Uint8Array(nx*ny);const R=x47Root();
  const vis=e=>{for(let x=e;x&&x!==document.body;x=x.parentElement){const c=getComputedStyle(x);if(c.display==='none'||c.visibility==='hidden'||+c.opacity<0.05)return false;}return true;};
  for(const e of R.querySelectorAll('*')){if(e.id==='game'||e.closest('#toasts,#autosave'))continue;const r=e.getBoundingClientRect();if(r.width<2||r.height<2||r.right<=0||r.bottom<=0||r.left>=W||r.top>=H)continue;
    const c=getComputedStyle(e),bg=c.backgroundColor.match(/[\d.]+/g),a=bg?(bg.length>3?+bg[3]:1):0;if(!(a>0.12||c.backgroundImage!=='none'||e.tagName==='CANVAS'||e.tagName==='BUTTON'))continue;if(!vis(e))continue;
    for(let y=Math.max(0,Math.floor(r.top/st));y<Math.min(ny,Math.ceil(r.bottom/st));y++)for(let x=Math.max(0,Math.floor(r.left/st));x<Math.min(nx,Math.ceil(r.right/st));x++)g[y*nx+x]=1;}
  let n=0;for(const v of g)n+=v;return +(100-100*n/g.length).toFixed(1);}
function x47Init(){x47Css();try{x47MenuInit();}catch(e){}try{x47HudInit();}catch(e){}
  if(x47DevMode()&&!OPT173.some(o=>o.k==='dbg')){const i=OPT173.findIndex(o=>o.k==='blurPause');OPT173.splice(i<0?OPT173.length:i+1,0,{k:'dbg',tab:'game',n:'除錯面板（金手指）',d:'在畫面左側顯示 🛠 按鈕（或按 Ctrl＋Shift＋D）：加資源、修為、突破、無敵、時間加速、觸發事件等。僅供測試；聯機客機無法使用。',t:'tg',def:0});
    CFG173.dbg=0;try{const s=JSON.parse(XW_PREFS.get('cfg','{}'));if(s.dbg!==undefined)CFG173.dbg=s.dbg;}catch(e){}}
  const mo=OPT173.find(o=>o.k==='music');if(mo)mo.d='背景音樂（古琴風格五聲音階，戰鬥與秘境時節奏較急）。0% 為關閉；暫停選單的「音效：開／關」也會一併靜音。';
  try{if(!X47.dbl&&typeof cv!=='undefined'&&cv){X47.dbl=1;cv.addEventListener('dblclick',ev=>{if(x47Touch()||S.dg||S.interior)return;const w=screenToWorld(ev.clientX,ev.clientY);const u=unitAt(w,S.units,14);if(u)return;const b=buildingAt(w);if(b)x47BuildList(b);});}}catch(e){}
  try{if(!X47.mo&&window.MutationObserver){X47.mo=new MutationObserver(()=>{try{x47Adopt();}catch(e){}});X47.mo.observe(document.body,{childList:true});}}catch(e){}
  x47Adopt();if(!X47.iv)X47.iv=setInterval(x47UiTick,250);x47UiTick();}
{const _x=XW045;XW045=function(){const o=_x();try{x47Init();}catch(e){console.warn('x47 init',e);}
  o.v47x={X47,aim:X47_AIM,aimCast:(ab,ax,ay)=>x47AimCast(player(),ab,ax,ay,true),castSlot:x47CastSlot,check:(ab)=>x47Check(player(),ab,true),scrToDir:x47ScrToDir,face:()=>x47Face(player()),
    modalOpen:x47ModalOpen,uiTick:x47UiTick,raidWaves:x47RaidWaves,raidDismiss:x47RaidDismiss,keyText:x47KeyText,keyMap:x47KeyMap,keyHints:x47KeyHints,panelClose:x47PanelClose,
    dgExitAsk:x47DgExitAsk,dgEnterAsk:x47DgEnterAsk,dgTick:x47DgTick,dlg:x47Dlg,dlgClose:x47DlgClose,evTick:x47EvTick,buildList:x47BuildList,allocAdj:x47AllocAdj,allocSync:x47AllocSync,
    dbgOpen:x47DbgOpen,sysGroups:x47SysGroups,ver:x47Ver,dbgClose:x47DbgClose,dbg:X47_DBG,musicVol:x47MusicVol,placeCombo:x47PlaceCombo,freeArea:x47FreeArea,fanSet:x47FanSet,fan:()=>!!X47.fan,hudTick:x47HudTick,panelSlim:x47PanelSlim,objApply:x47ObjApply,drawNames:()=>netDrawNames(),projs:()=>projectiles,
    sel:(ids,b)=>{selUnits=ids||[];selBuilding=b==null?null:b;selOther=null;panelKeyCache=null;renderPanel();},selState:()=>({u:selUnits.slice(),b:selBuilding,o:selOther}),nearShrine:r=>nearShrine(r),
    setTags:f=>{X47.tagsOv=f;},setTouch:v=>setTouchUI(!!v),
    get dlgId(){return X47.dlg?X47.dlg.id:'';}};
  return o;};}

// 揭開全地圖作弊改為開關：開時不改寫 explored，關時 resetFog 即可從真實探索重建迷霧（無需重啟）
{const _fu=typeof fogUpdate==='function'?fogUpdate:null;
if(_fu)fogUpdate=function(now){
  if(X47.nofog){
    try{if(fogImg&&fogImg.data){const D=fogImg.data;for(let i=3;i<D.length;i+=4)D[i]=0;fogCtx.putImageData(fogImg,0,0);}fogDirty=false;fogDistDirty=false;fogPaintT=now||performance.now();}catch(e){}
    return;
  }
  return _fu.apply(this,arguments);
};}
{const _ie=typeof isExplored==='function'?isExplored:null;
if(_ie)isExplored=function(x,y){if(X47.nofog){const i=Math.floor(x),j=Math.floor(y);return typeof inMap==='function'?!!inMap(i,j):true;}return _ie.apply(this,arguments);};}

