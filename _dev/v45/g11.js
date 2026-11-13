// ================== v0.4.0：新手教學、修仙指南（圖鑑）、長按說明 ==================
function nodeNear(x,y,r){let b=null,bd=r*r;for(const n of NODES){if(n.gone)continue;const d=(n.i+0.5-x)**2+(n.j+0.5-y)**2;if(d<bd&&isExplored(n.i,n.j)){bd=d;b=n;}}return b;}
function hasB(t,built){return S.buildings.some(b=>b.type===t&&(!built||b.built));}
function vis(el){if(!el)return false;const r=el.getBoundingClientRect();if(r.width<2||r.height<2)return false;const cs=getComputedStyle(el);return cs.display!=='none'&&cs.visibility!=='hidden';}
function firstVis(sel){for(const s of sel.split('|')){const el=document.querySelector(s);if(vis(el))return el;}return null;}
const TUT=[
 {k:'move',t:'移動',touch:'推動左下角的搖桿，讓你走幾步。',desk:'按 W A S D 移動角色，走幾步看看（方向鍵＝平移鏡頭，空白鍵回到自己）。',
  el:()=>isTouchUI?'#joy':null,start:b=>{const p=player();b.x=p.x;b.y=p.y;},done:b=>{const p=player();return dist(p.x,p.y,b.x,b.y)>=3;}},
 {k:'gather',t:'採集',touch:'走到樹木或石頭旁，按右側「採集」。木材、石材、纖維是建宗門的基本材料。',desk:'走到樹木或石頭旁按 V（或選取自己後右鍵點資源）採集。',
  el:()=>isTouchUI?'#a_gather':null,world:()=>{const p=player();const n=nodeNear(p.x,p.y,12);return n?{x:n.i+0.5,y:n.j+0.5}:null;},
  start:b=>{b.r=S.res.wood+S.res.stone+S.res.fiber+S.res.food;},done:b=>S.res.wood+S.res.stone+S.res.fiber+S.res.food>=b.r+3},
 {k:'hall',t:'建造宗門大殿',touch:'湊齊 木30・石20・纖10 後按「建造」→「宗門大殿」，選好位置按「✔ 在此建造」，再站在工地旁施工。',desk:'湊齊 木30・石20・纖10 後按 B（或 Shift+1）選「宗門大殿」，左鍵放置，站在工地旁施工（E）。',
  el:()=>firstVis('#confirm.open #c_ok|#buildbar.open [data-b="hall"]|#a_build|#buildbar [data-b="hall"]'),world:()=>{const b=S.buildings.find(o=>o.type==='hall'&&!o.built);return b?{x:b.i+1.5,y:b.j+1.5}:null;},done:()=>hasB('hall',true)},
 {k:'altar',t:'建造求武台',touch:'大殿落成了！再按「建造」→「求武台」。求武台用來招募弟子。',desk:'按 B（或 Shift+2）建造「求武台」，用來招募弟子。',
  el:()=>firstVis('#confirm.open #c_ok|#buildbar.open [data-b="altar"]|#a_build|#buildbar [data-b="altar"]'),world:()=>{const b=S.buildings.find(o=>o.type==='altar'&&!o.built);return b?{x:b.i+1,y:b.j+1}:null;},done:()=>hasB('altar',true)},
 {k:'recruit',t:'招募弟子',touch:'點求武台→「感應有緣人」。候選人到齊後，在「招募選單」挑一位按「收為弟子」，沒選上的會變成流浪者。',desk:'點求武台→「感應有緣人」。候選人到齊後，在「招募選單」挑一位按「收為弟子」。',
  el:()=>firstVis('#recmenu.open [data-c="take"]:not([disabled])|#recmenu.open [data-c="new"]|#panel [data-act="cands"]|#panel [data-act="recruit"]'),
  world:()=>{if(recOpen)return null;const b=S.buildings.find(o=>o.type==='altar'&&o.built);return b?{x:b.i+1,y:b.j+1}:null;},start:b=>{b.n=S.stats.recruited;},done:b=>S.stats.recruited>b.n},
 {k:'train',t:'指派採集',touch:'點選一名弟子，在下方面板按「採集」。弟子會自己去砍樹、採石，替宗門累積資源。',desk:'左鍵點選弟子，在面板按「採集」。弟子會自己去砍樹、採石，替宗門累積資源。',
  el:()=>firstVis('#panel [data-job="gather"]|#b_roster|#b_rosterpc'),
  world:()=>{const d=disciples()[0];return d&&!selUnits.length?{x:d.x,y:d.y}:null;},done:()=>disciples().some(u=>u.job==='gather')},
 {k:'cult',t:'打坐與突破',touch:'按「打坐」修煉（也會快速回血），再按右上「修」打開修煉面板，看看突破下一境界的條件。',desk:'按 Z 打坐修煉（也會快速回血），再按 C 打開修煉面板，看看突破條件。',
  el:()=>TF.med?firstVis('#b_cult|#b_cultpc'):firstVis('#a_med|#b_cultpc'),start:b=>{TF.med=false;TF.cult=false;},
  tick:()=>{const p=player();if(p&&p.task&&p.task.type==='meditate')TF.med=true;if($('cult').classList.contains('open'))TF.cult=true;},done:()=>TF.med&&TF.cult},
 {k:'enter',t:'走進建築',touch:'點一座已落成的建築（大殿、住房、武道館…）→「🚪 進入」，就能看到室內與館內弟子。',desk:'點選一座已落成的建築→「🚪 進入」（或右鍵點門口），看看室內。',
  el:()=>firstVis('#panel [data-act="enter"]'),world:()=>{if(S.interior)return null;const b=S.buildings.find(o=>canEnter(o));if(!b)return null;const D=doorPt(b);return D;},done:()=>!!S.interior||TF.inside},
 {k:'roster',t:'弟子總表',touch:'離開室內後，按右上「弟」打開弟子總表：一次查看所有弟子的境界、工作，也能定位、突破、逐出。',desk:'按 J（或「弟子」）打開弟子總表，一次管理所有弟子。',
  el:()=>firstVis('#b_roster|#b_rosterpc'),done:()=>rosterOpen},
 {k:'shrine',t:'靈脈石碑與存檔',touch:'地圖上發光的石碑是存檔點：走近按「石碑」靜坐，回滿氣血、自動存檔並設為復甦點。☰ 選單也能隨時存檔。',desk:'走到發光的靈脈石碑旁按 V 靜坐：回滿氣血、自動存檔、設為復甦點。K 開存檔欄位。',
  el:()=>firstVis('#a_shrine'),world:()=>{const p=player();let best=null,bd=1e9;for(const s of shrines()){const d=dist(p.x,p.y,s.x,s.y);if(d<bd){bd=d;best=s;}}return best?{x:best.x,y:best.y}:null;},done:()=>shrineOpen!=null},
 {k:'raid',t:'山賊襲擊',touch:'大殿落成一段時間後，山賊會來襲。畫面出現紅色警告時，把弟子設為「守衛」或回宗門迎戰；擊退可得食物。',desk:'大殿落成一段時間後山賊會來襲。看到紅色警告時，選取弟子按「守衛」或右鍵點敵人迎戰。',
  el:()=>null,ack:true,done:()=>false}
];
const TF={med:false,cult:false,inside:false};
function tutState(){return S.tut||(S.tut={step:0,done:false,base:{}});}
function tutActive(){const t=S&&S.tut;return !!(t&&!t.done&&!t.off&&!titleOpen&&!helpShown&&!deathOpen&&!uiBlockLite());}
function uiBlockLite(){return savesOpen||dlgOpen||$('settings').classList.contains('open')||guideOpen;}
let tutEls=null;
function tutDom(){if(tutEls)return tutEls;const bub=document.createElement('div');bub.id='tutbub';bub.className='ui';const ring=document.createElement('div');ring.id='tutring';ring.className='ui';
  document.getElementById('root').appendChild(ring);document.getElementById('root').appendChild(bub);
  bub.addEventListener('click',ev=>{const b=ev.target.closest('[data-t]');if(!b)return;ev.stopPropagation();const a=b.dataset.t;if(a==='next')tutAdvance(true);else if(a==='quit')tutEnd(true);else if(a==='ok')tutAdvance(false);else if(a==='min'){tutMin=!tutMin;tutKey=null;}});
  bub.addEventListener('pointerdown',ev=>ev.stopPropagation());
  return tutEls={bub,ring};}
let tutKey=null,tutMin=false,tutT=0;
function tutStart(){S.tut={step:0,done:false,base:{},init:1};tutMin=false;tutKey=null;const s=TUT[0];if(s.start)s.start(S.tut.base);toast('新手教學開始（可隨時「結束」，☰／設定 可重播）');}
function tutEnd(skip){const t=tutState();t.done=true;t.skipped=!!skip;tutKey=null;tutHide();toast(skip?'已略過新手教學（☰ 選單 →「新手教學」可重播）':'🎉 新手教學完成！按「?」可查閱修仙指南');autoSaveSoon&&skip===false&&0;}
function tutAdvance(skipStep){const t=tutState();if(!skipStep)toast('✔ 教學：'+TUT[t.step].t);t.step++;t.base={};tutKey=null;if(t.step>=TUT.length){tutEnd(false);return;}const s=TUT[t.step];if(s.start)s.start(t.base);}
function tutHide(){if(!tutEls)return;tutEls.bub.style.display='none';tutEls.ring.style.display='none';document.body.classList.remove('tut');}
function tutTick(dt){if(!S||!S.tut)return;if(!S.tut.init){S.tut.init=1;if(settings.tut===false&&S.tut.step===0)S.tut.done=true;}if(!tutActive()){tutHide();return;}const t=S.tut,s=TUT[t.step];if(!s){tutEnd(false);return;}
  if(!t.base||t.base.__s!==t.step){t.base=t.base||{};if(t.base.__s==null&&s.start&&!Object.keys(t.base).length)s.start(t.base);t.base.__s=t.step;}
  if(s.tick)s.tick();if(S.interior)TF.inside=true;
  if(!s.ack&&s.done(t.base)){tutAdvance(false);return;}
  tutRender(s,t);}
function tutRender(s,t){const {bub,ring}=tutDom();document.body.classList.add('tut');bub.style.display='block';
  const mn=tutMin||(isTouchUI&&(recOpen||$('cult').classList.contains('open')));const key=t.step+'|'+isTouchUI+'|'+mn;if(key!==tutKey){tutKey=key;
    bub.innerHTML=mn?`<div class="th"><b>📖 ${t.step+1}/${TUT.length} ${s.t}</b><span class="sp"></span><button class="btn" data-t="min">▾</button></div>`:
    `<div class="th"><b>📖 新手教學 ${t.step+1}/${TUT.length}・${s.t}</b><span class="sp"></span><button class="btn" data-t="min" title="縮小">▴</button></div><div class="tx">${isTouchUI?s.touch:s.desk}</div>
     <div class="tb">${s.ack?'<button class="btn pri" data-t="ok">知道了</button>':'<button class="btn" data-t="next">略過此步</button>'}<button class="btn" data-t="quit">結束教學</button></div>`;}
  // 目標高亮：按鈕優先，其次地圖上的位置
  let r=null;const sel=s.el&&s.el();const el=typeof sel==='string'?firstVis(sel):sel;
  if(el&&vis(el)){const q=el.getBoundingClientRect();r={x:q.left+q.width/2,y:q.top+q.height/2,w:q.width+12,h:q.height+12};}
  else if(s.world&&!S.interior){const w=s.world();if(w){const I=iso(w.x,w.y),q=worldToScreen(I.x,I.y);const cv=$('game').getBoundingClientRect();const x=q.x+cv.left,y=q.y+cv.top;
    if(x>-20&&y>-20&&x<innerWidth+20&&y<innerHeight+20)r={x,y:y-10,w:54,h:54};}}
  if(r){ring.style.display='block';ring.style.left=(r.x-r.w/2)+'px';ring.style.top=(r.y-r.h/2)+'px';ring.style.width=r.w+'px';ring.style.height=r.h+'px';}else ring.style.display='none';}
// ================== 修仙指南（圖鑑） ==================
let guideOpen=false,guideCat='realm';
function guideEl(){let el=document.getElementById('guide');if(!el){el=document.createElement('div');el.id='guide';el.className='ui ov scroll';document.getElementById('root').appendChild(el);
  el.addEventListener('click',ev=>{const b=ev.target.closest('[data-gd]');if(!b)return;const a=b.dataset.gd;if(a==='close')toggleGuide(false);else if(a==='tut'){toggleGuide(false);tutStart();}else{guideCat=a;renderGuide();el.querySelector('.gbody').scrollTop=0;}});}return el;}
function toggleGuide(v,cat){guideOpen=v==null?!guideOpen:v;if(cat)guideCat=cat;const el=guideEl();el.classList.toggle('open',guideOpen);if(guideOpen){closeTip();renderGuide();}}
const GUIDE_CATS=[['realm','境界'],['body','體質／資質'],['res','資源'],['build','建築'],['job','弟子工作'],['wand','流浪者'],['village','村莊'],['raid','襲擊'],['save','石碑・存檔'],['ctrl','操作']];
function gRow(a,b){return `<tr><td>${a}</td><td>${b}</td></tr>`;}
function guideBody(c){const tb=r=>`<table>${r}</table>`;
  if(c==='realm'){let r='';const cond=['修為圓滿＋宗門建有「武道館」','修為圓滿＋宗門建有「練武閣」','修為圓滿＋宗門持有「武學秘籍」（長書閣研究、村莊委託、遺跡）','修為圓滿＋「功法」＋靈石 20；有失敗機率，悟性、氣運、靈根、仙武之體可降低','目前版本的最高境界'];
    REALMS.slice(0,MAX_REALM+1).forEach((R,k)=>{const ab=R.ab||(k>=6?'jindan':null);const an=ab?(typeof abilName==='function'?abilName({realm:k},ab):ABIL[ab].n):'';const ad=ab?(typeof abilDesc==='function'?abilDesc({realm:k},ab):(ABIL[ab]&&ABIL[ab].desc)||''):'';r+=gRow(`${k+1}. ${R.n}`,`${R.stage}階段｜修為需求 ${R.need}${ab?`｜技能：${an}（${ad}）`:''}<br><span class="dim">突破到下一境界：${cond[k]}</span>`);});
    return `<p>境界由低到高：${REALMS.map(r=>r.n).join(' → ')}。修為靠打坐、在館內修煉、戰鬥累積；修為圓滿並滿足條件後即可「突破」，前兩次突破會自動進行。</p>`+tb(r);}
  if(c==='body'){let r='';for(const B of BODIES)r+=gRow(`<span style="color:${B.col}">${B.n}</span>`,`${XN_BODY_RAR[B.rar]||B.rar}｜${B.desc}｜氣血 ×${B.hp}、攻擊 ×${B.atk}、速度 ×${B.spd}、採集 ×${B.gat}${B.n==='仙武之體'?`<br><span class="dim">你天生身負仙武之體。招募候選人與流浪者約有 ${(TUNE.xwChance*100).toFixed(1)}% 機率刷出（求武台等級越高越容易），選單中以金框標示。</span>`:''}`);
    return tb(r)+'<h4>靈根</h4>'+tb(gRow('五行',LG_EL.join('、')+'（屬性目前只影響名稱與外觀）')+gRow('品質',`${LG_Q.join(' → ')}：越高越容易衝擊煉氣（失敗率 -5%／-15%／-30%）`)+gRow('取得','求武台升級為「求仙台」後招到的弟子較可能身具靈根'))+
      '<h4>其他資質</h4>'+tb(gRow('悟性','0～'+(typeof rbAX==='function'?rbAX()*100:100)+'，越高修煉越快、突破煉氣越不易失敗')+gRow('仙緣','只有一個用途：仙緣越高，大境界突破（宗師→煉氣、煉氣大圓滿→築基…）與渡劫的成功率越高（每點 +0.15 %，最多 +15 %）。不是任何突破的條件。仙緣閣、奇遇事件可提升')+gRow('氣運','略微降低突破失敗率')+gRow('忠誠／性格','角色個性與宗門向心力（目前主要是描述）'));}
  if(c==='res'){const d={wood:'砍樹取得。建築、修繕（每 10 點耐久 1 木材）都要用',stone:'敲石頭取得。主要建材',fiber:'採草叢取得。大殿、住房、長書閣需要',food:'採漿果取得，也可交易。招募弟子、贈禮要用',iron:'山嶺的鐵礦。練武閣與 Lv3 升級需要',herb:'藥草，用來交易或任務',lingshi:'靈石，出產於山嶺靈脈。求仙台、仙緣閣、煉氣突破要用'};
    let r='';for(const k in RES_NAMES)r+=gRow(RES_NAMES[k],d[k]||'');return tb(r)+`<p class="dim">資源點採光後不會永遠消失：過一段時間會在同一區域的隨機位置長回來，數量也隨機（樹約 ${TUNE.nodeRegrow.tree[0]/60|0}～${TUNE.nodeRegrow.tree[1]/60|0} 分鐘）。採了一半的資源點放著也會慢慢回復。</p>`;}
  if(c==='build'){let r='';for(const k of BUILD_ORDER){const D=BUILD[k],fake={type:k};r+=gRow(D.name,`${D.desc}<br><span class="dim">建造：${costStr(D.cost)}｜工時 ${D.time} 秒</span><br>Lv1：${lvEffect(fake,1)}<br>Lv2：${lvEffect(fake,2)}（費用 ×${TUNE.lvCost[0]}）<br>Lv3：${lvEffect(fake,3)}（費用 ×${TUNE.lvCost[1]}＋鐵礦 ${TUNE.lv3Iron}）`);}
    return `<p>點選建築可「⬆ 升級」（最高 Lv3，需要弟子或你在旁施工，升級期間建築照常運作；外觀會變大、加樓層與裝飾，室內座位變多）或「拆除」。</p>`+tb(r)+
      `<h4>拆除退回</h4><p>還沒蓋好：全額退回。已落成：退回總投入（含升級）的 ${TUNE.demoRefund[0]*100}%～${TUNE.demoRefund[1]*100}%，耐久越高退越多；升級中的材料全額退回。館內弟子會改為待命。唯一的宗門大殿不能拆。</p>`;}
  if(c==='job'){let r=gRow('採集','到野外採資源，搬回大殿')+gRow('守衛','守在宗門附近，有敵人靠近就迎戰')+gRow('跟隨','跟著你行動')+gRow('待命','原地待命');for(const k in INJOB){const J=INJOB[k];r+=gRow(J.label,`走進「${BUILD[J.b].name}」修煉，修為每秒約 ${J.xiu}${J.hp?`、回血 ${Math.round(J.hp*100)}%/秒`:''}；名額看建築等級`);}
    return tb(r)+'<p class="dim">弟子總表（弟／J）可以一次檢視、篩選、定位、突破、逐出弟子。</p>';}
  if(c==='wand')return tb(gRow('來源','被逐出師門的弟子、沒被選上的求武台候選人，以及在各地出生的流浪武者')+gRow('行為',`在村莊與山寨之間遊蕩，約 ${TUNE.wanderJoin[0]/60|0}～${TUNE.wanderJoin[1]/60|0} 分鐘後隨機投靠：友好村莊→成為「村衛」；山寨→成為保有原本境界的山賊`)+gRow('再招攬','走到身邊點他→「招攬入門」（食物，境界越高還要靈石）。好感低於 0（例如被你逐出的人）會拒絕，可先「贈禮」')+gRow('逐出弟子',`在弟子面板或總表按「逐出」並確認。人不會消失，而是變成流浪者；各村關係 -${TUNE.kickRep}`));
  if(c==='village')return tb(gRow('友好村莊','可交易、接委託；關係越好價格越好。村民會在村子附近活動，人數會慢慢補回')+gRow('關係','完成委託、交易會提升；逐出弟子、攻擊村莊會下降。關係太低會轉為敵對')+gRow('村衛','投靠村莊的流浪者，帶著長矛巡守')+gRow('山賊寨','會定期派人襲擊宗門；摧毀山寨可奪回資源'));
  if(c==='raid')return tb(gRow('時機',`大殿落成約 ${TUNE.firstRaid[0]/60|0}～${TUNE.firstRaid[1]/60|0} 分鐘後第一次襲擊，之後每 ${TUNE.raidEvery[0]/60|0}～${TUNE.raidEvery[1]/60|0} 分鐘一次`)+gRow('警告',`出發前約 ${TUNE.raidWarn} 秒會跳出紅色警告與方向提示`)+gRow('應對','把弟子設為「守衛」、選取弟子點敵人攻擊；受損建築要修繕，壞掉的建築會停止運作')+gRow('獎勵','擊退襲擊可得食物，士氣大振'));
  if(c==='save')return tb(gRow('靈脈石碑','走近靜坐：回滿氣血、自動存檔、設為復甦點；野外妖獸會重生。點亮的石碑之間可以傳送')+gRow('存檔欄位','3 個自動存檔、5 個手動存檔、1 個快速存檔；可重新命名、刪除、匯出／匯入')+gRow('身隕','氣血耗盡會「身隕」：失去部分修為（30%）會以「遺落之物」留在倒下處，回去就能取回；材料不會遺落，裝備有15%機率被路過的修仙者拿走。在復甦點的石碑重生'));
  if(c==='ctrl')return '<h4>手機／平板</h4>'+tb(gRow('搖桿','移動角色')+gRow('點一下','選取；已選單位時點地面移動、點資源採集、點敵人攻擊')+gRow('拖曳／雙指','平移鏡頭／縮放')+gRow('長按','框選弟子；長按資源、境界、按鈕會顯示說明')+gRow('右側按鈕','採集、建造、技能、打坐、全選弟子、回到自己、框選、取消'))+
    '<h4>電腦</h4>'+tb(gRow('W A S D','移動角色')+gRow('方向鍵','平移鏡頭（Shift 加速）；空白鍵／Home＝回到自己')+gRow('左鍵／右鍵','選取／下令')+gRow('V','採集、施工、互動')+gRow('Q E R T','技能列四格（點格子換技能）')+gRow('1～6','技能第 5～10 格（最多 10 個技能）')+gRow('Z','打坐')+gRow('Y','全選弟子')+gRow('C／J／M','修煉面板／弟子總表／大地圖')+gRow('B／Shift＋1～0','建造（建造模式中直接按數字也可換建築）')+gRow('N','與最近的村莊交易')+gRow('Alt＋1～4／Ctrl＋1～4','選取隊伍／編隊')+gRow('H','操作說明')+gRow('K／L／F5／F9','存檔／讀取／快速存讀')+gRow('?','修仙指南')+gRow('滑鼠停在資源或按鈕上','顯示說明'))+
    '<h4>手把（標準對應）</h4>'+tb(gRow('左／右搖桿','移動角色／平移鏡頭')+gRow('A','互動、採集、靠近大門時進室內；選單裡＝確定')+gRow('B','短按：鏡頭回到自己；長按：打開建造（選完建築後搖桿／十字移動準星，A 確認放置、B 取消）；選單裡＝返回')+gRow('X／Y／LB／RB','技能列 Q／E／R／T')+gRow('LT／RT','打坐／跟隨已選弟子（未選則施放技能）')+gRow('L3／R3','縮小／放大鏡頭；大地圖開著時改縮放地圖')+gRow('LB／RB＋左右','循環選取附近弟子')+gRow('Back／Start','大地圖／暫停')+gRow('選單中','十字或左搖桿移動焦點，A 確定、B 返回'));
  return '';}
function renderGuide(){const el=guideEl();el.innerHTML=`<button class="btn x" data-gd="close">✖</button><h3>📖 修仙指南</h3><div class="gcats">${GUIDE_CATS.map(([k,n])=>`<button class="btn ${k===guideCat?'pri':''}" data-gd="${k}">${n}</button>`).join('')}<button class="btn" data-gd="tut">🎓 重播新手教學</button></div><div class="gbody scroll">${guideBody(guideCat)}</div>`;}
// ================== 長按／滑鼠停留說明 ==================
const TIPS={wood:'木材：砍樹取得。建造、修繕都需要。',stone:'石材：敲石頭取得，主要建材。',fiber:'纖維：採草叢取得。大殿、住房、長書閣需要。',food:'食物：採漿果或交易取得。招募弟子、贈禮要用。',iron:'鐵礦：山嶺出產。練武閣與 Lv3 升級需要。',herb:'藥草：可交易或完成委託。',lingshi:'靈石：山嶺靈脈出產。求仙台、仙緣閣、突破煉氣要用。',
  pop:'弟子：目前人數／上限。蓋住房、大殿或升級可提高上限。',realm:()=>{const p=player(),c=p?breakConds(p):null;return `你的境界：${p?REALMS[p.realm].n:''}。境界順序 ${REALMS.slice(0,MAX_REALM+1).map(r=>r.n).join('→')}。${c?'下一步：'+c.list.map(x=>(x.ok?'✔':'✖')+x.t).join('；'):''}`;},
  a_gather:'採集：讓你採身邊最近的資源，或協助施工／修繕。',a_build:'建造：打開建築列表。',a_skill:'技能：施放你目前境界的技能。',a_med:'打坐：原地修煉，累積修為並快速回血；受到攻擊會中斷。',a_all:'全選弟子：選取所有弟子後可一起下令。',a_home:'回到自己：鏡頭回到自己身上。',a_box:'框選：之後拖曳可框選多名弟子。',a_cancel:'取消：取消建造或目前的選取。',a_trade:'交易：與身邊的村莊交易。',a_shrine:'石碑：靜坐（回滿氣血、存檔、設復甦點）或傳送。',
  b_roster:'弟子總表：檢視、篩選、定位、突破、逐出弟子。',b_cult:'修煉面板：境界、修為、突破條件。',b_map:'小地圖開關。',b_menu:'選單：存檔、讀取、新手教學、修仙指南、回到標題。',b_guide:'修仙指南：境界、體質、建築、流浪者……所有說明都在這裡。',
  wu:'悟性：越高修煉越快、突破煉氣越不易失敗。',xy:'仙緣：越高，大境界突破與渡劫成功率越高（每點 +0.15 %，最多 +15 %）；不是突破條件。',luck:'氣運：略微降低突破失敗率。',lg:'靈根：品質越高越容易突破煉氣。',body:'體質：決定氣血、攻擊、速度、採集倍率。仙武之體萬中無一。',xiu:'修為：圓滿後滿足條件即可突破下一境界。'};
function tipText(k){const v=TIPS[k];return typeof v==='function'?v():v||'';}
function tipKeyOf(el){if(!el||!el.closest)return null;const t=el.closest('[data-tip]');if(t)return {k:t.dataset.tip,el:t};
  const r=el.closest('#topbar .res');if(r){if(r.id==='r_realm')return {k:'realm',el:r};const i=r.querySelector('.ico');if(i){for(const c of i.classList)if(TIPS[c])return {k:c,el:r};}}
  const b=el.closest('#actions .abtn,#topbar .tbtn');if(b&&TIPS[b.id])return {k:b.id,el:b};return null;}
let tipEl=null,tipTimer=null,tipShownAt=0,tipSuppress=false;
function showTip(k,el){const txt=tipText(k);if(!txt)return;if(!tipEl){tipEl=document.createElement('div');tipEl.id='tip';tipEl.className='ui';document.getElementById('root').appendChild(tipEl);}
  tipEl.textContent=txt;tipEl.style.display='block';const r=el.getBoundingClientRect(),w=Math.min(260,innerWidth-16);tipEl.style.width=w+'px';
  let x=r.left+r.width/2-w/2;x=Math.max(8,Math.min(innerWidth-w-8,x));const h=tipEl.offsetHeight;let y=r.bottom+6;if(y+h>innerHeight-6)y=r.top-h-6;tipEl.style.left=x+'px';tipEl.style.top=Math.max(4,y)+'px';tipShownAt=performance.now();tipEl.dataset.k=k;}
function closeTip(){if(tipEl)tipEl.style.display='none';clearTimeout(tipTimer);tipTimer=null;}
document.addEventListener('pointerdown',ev=>{if(tipEl&&tipEl.style.display==='block'&&performance.now()-tipShownAt>150)closeTip();const t=tipKeyOf(ev.target);if(!t||ev.pointerType==='mouse')return;
  tipSuppress=false;clearTimeout(tipTimer);tipTimer=setTimeout(()=>{showTip(t.k,t.el);tipSuppress=true;},480);},true);
document.addEventListener('pointerup',()=>{if(tipTimer&&!tipSuppress){clearTimeout(tipTimer);tipTimer=null;}if(tipSuppress)setTimeout(()=>{if(performance.now()-tipShownAt>2600)closeTip();},2700);},true);
document.addEventListener('pointercancel',()=>{clearTimeout(tipTimer);tipTimer=null;},true);
document.addEventListener('click',ev=>{if(tipSuppress){tipSuppress=false;ev.stopPropagation();ev.preventDefault();}},true);
document.addEventListener('contextmenu',ev=>{if(tipKeyOf(ev.target))ev.preventDefault();},true);
let hoverT=null;
document.addEventListener('mouseover',ev=>{if(isTouchUI)return;const t=tipKeyOf(ev.target);clearTimeout(hoverT);if(!t){if(tipEl&&tipEl.style.display==='block'&&!tipSuppress)closeTip();return;}hoverT=setTimeout(()=>showTip(t.k,t.el),380);});
function tickV040b(dt){tutT-=dt;if(tutT<=0){tutT=0.2;tutTick(0.2);}}
