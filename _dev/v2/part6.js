// ================== 介面 ==================
const $=id=>document.getElementById(id);
let panelKeyCache=null;
function initBuildBar(){
  let h='<div class="lbl">建造（B）</div>';
  BUILD_ORDER.forEach((k,idx)=>{const D=BUILD[k];h+=`<button class="btn bb" data-b="${k}" title="${D.desc}"><b>${idx+1}　${D.name}</b><small>${costStr(D.cost)}</small><small class="why"></small></button>`;});
  $('buildbar').innerHTML=h;
  $('buildbar').addEventListener('click',ev=>{const btn=ev.target.closest('[data-b]');if(btn)enterBuild(btn.dataset.b);});
}
function taskName(u){
  if(u.dead)return '重傷倒地';
  const t=u.task;
  if(!t)return u.working?'施工中':'閒置';
  if(t.type==='move')return '移動中';
  if(t.type==='attack')return '戰鬥中';
  if(t.type==='gather')return (u.working?'採集中：':'前往採集：')+RES_NAMES[t.resType];
  if(t.type==='return')return '搬運回大殿';
  if(t.type==='build')return u.working?'建造中':'前往工地';
  return '—';
}
function panelKey(){
  if(selBuilding!=null){const b=bById(selBuilding);if(!b){selBuilding=null;return '';}return 'b'+b.id+(b.built?'1':'0');}
  if(selUnits.length===1)return 'u'+selUnits[0];
  if(selUnits.length>1)return 'm'+selUnits.length;
  return '';
}
function renderPanel(){
  const key=panelKey(),el=$('panel');
  if(key!==panelKeyCache){
    panelKeyCache=key;el.classList.remove('expanded');
    if(!key){el.style.display='none';el.innerHTML='';return;}
    el.style.display='block';
    if(key[0]==='b'){
      const b=bById(selBuilding),D=BUILD[b.type];
      let h=`<h4><span class="pexp">▾ 詳細</span>${D.name}<span class="tag" style="background:${b.built?'#9fd88a':'#7fd0ff'}">${b.built?'已落成':'建造中'}</span></h4><div class="pdesc" style="color:#d8c9a6">${D.desc}</div>`;
      if(!b.built)h+=`<div class="bar"><i id="pd_prog" style="background:#7fd0ff"></i></div><div>進度 <span id="pd_progt"></span>　<span class="pdesc">需要主角或弟子在旁施工（選取單位後${isTouchUI?'點':'右鍵點'}工地）</span></div>`;
      else if(b.type==='altar')h+=`<div style="margin-top:4px"><button class="btn" data-act="recruit">招募弟子（食物 ${RECRUIT_COST}）</button>　<span id="pd_pop"></span></div><div class="bar"><i id="pd_q"></i></div><div id="pd_qt" style="font-size:11.5px;color:#d8c9a6"></div><div class="phint pmore">體質機率：凡體最常見，金剛／風靈／火靈／寒冰／厚土較少，仙武之體極稀有。</div>`;
      else h+=`<div>弟子：<span id="pd_pop"></span></div>`;
      el.innerHTML=h;
    }else if(key[0]==='u'){
      const u=unitById(selUnits[0]);if(!u){selUnits=[];panelKeyCache=null;return;}
      const B=BODIES[u.body];
      el.innerHTML=`<h4><span class="pexp">▾ 詳細</span>${u.kind==='player'?'你（主角）':u.name}<span class="tag" style="background:${B.col}">${B.n}</span><span class="tag" style="background:${RAR_COL[B.rar]}">${B.rar}</span></h4>
        <div class="mini"><b id="pd_mr"></b>｜<b id="pd_ms"></b> <span id="pd_mc"></span></div>
        <div class="pdesc" style="color:#d8c9a6">${B.desc}</div>
        <div class="bar"><i id="pd_hp" style="background:#5fe06a"></i></div>
        <div class="pmore"><div class="grid"><span>氣血 <b id="pd_hpt"></b></span><span>攻擊 <b id="pd_atk"></b></span><span>速度 <b>${u.speed}</b></span><span>採集 <b>${u.gat}</b></span>
        <span>境界 <b id="pd_realm"></b></span><span>悟性 <b>${u.wu}</b></span><span>氣運 <b>${u.luck}</b></span><span>忠誠 <b>${u.loyal}</b></span></div>
        <div>性格：${u.person}　狀態：<b id="pd_state"></b>　<span id="pd_carry"></span></div>
        ${u.kind==='disciple'?(isTouchUI?'<div class="phint">已選取：點資源＝循環採集；點地面＝移動；點妖獸＝攻擊</div>':'<div class="phint">右鍵點資源＝循環採集並搬回大殿；右鍵點地面＝移動；右鍵點妖獸＝攻擊</div>'):(isTouchUI?'<div class="phint">搖桿移動、「採集」鍵採集／施工；靠近妖獸會自動出手</div>':'<div class="phint">WASD 移動、E 採集／施工；靠近妖獸會自動出手</div>')}</div>`;
    }else{
      el.innerHTML=`<h4><span class="pexp">▾ 名單</span>已選取 ${selUnits.length} 名單位</h4><div class="mini">${isTouchUI?'點資源＝一起採集；點地面＝集體移動':''}</div><div class="pmore"><div class="list scroll" id="pd_list"></div><div class="phint">${isTouchUI?'點資源讓大家一起採集；點地面集體移動':'右鍵點資源讓大家一起採集；右鍵點地面集體移動'}</div></div>`;
    }
  }
  if(!key)return;
  const set=(id,v)=>{const e=$(id);if(e&&e.textContent!==String(v))e.textContent=v;};
  if(key[0]==='b'){
    const b=bById(selBuilding);if(!b)return;
    if(!b.built){$('pd_prog').style.width=(b.progress*100)+'%';set('pd_progt',Math.floor(b.progress*100)+'%');}
    set('pd_pop',`${disciples().length} / ${popCap()}（含招募中 ${popUsed()}）`);
    if(b.type==='altar'&&b.built){$('pd_q').style.width=(b.queue>0?b.qt/RECRUIT_TIME*100:0)+'%';set('pd_qt',b.queue>0?`感應中……排隊 ${b.queue} 名，約 ${Math.ceil(RECRUIT_TIME-b.qt)} 秒`:'目前沒有招募');}
  }else if(key[0]==='u'){
    const u=unitById(selUnits[0]);if(!u)return;
    $('pd_hp').style.width=(u.hp/u.maxhp*100)+'%';
    set('pd_hpt',`${Math.ceil(u.hp)}/${u.maxhp}`);set('pd_atk',u.atk);
    const nx=REALMS[u.realm+1];set('pd_realm',REALMS[u.realm].n+(nx?`（${Math.floor(u.exp)}/${nx.exp}）`:'（凡人極境）'));
    set('pd_state',taskName(u));set('pd_carry',u.carry&&u.carry.amt>0?`背負：${RES_NAMES[u.carry.type]} ${u.carry.amt}/${CARRY_CAP}`:'');
    set('pd_mr',REALMS[u.realm].n+' 氣血 '+Math.ceil(u.hp)+'/'+u.maxhp);set('pd_ms',taskName(u));set('pd_mc',u.carry&&u.carry.amt>0?`${RES_NAMES[u.carry.type]} ${u.carry.amt}/${CARRY_CAP}`:'');
  }else{
    const h=selUnits.map(unitById).filter(Boolean).map(u=>`<div><span style="color:${BODIES[u.body].col}">●</span> ${u.kind==='player'?'你（主角）':u.name}｜${BODIES[u.body].n}｜${REALMS[u.realm].n}｜氣血 ${Math.ceil(u.hp)}/${u.maxhp}｜${taskName(u)}</div>`).join('');
    const l=$('pd_list');if(l.innerHTML!==h)l.innerHTML=h;
  }
}
$('objectives').addEventListener('click',()=>$('objectives').classList.toggle('expanded'));
$('panel').addEventListener('click',ev=>{const a=ev.target.closest('[data-act]');if(!a){if(isTouchUI)$('panel').classList.toggle('expanded');return;}if(a.dataset.act==='recruit')recruit(bById(selBuilding));});
const HINTS_PC=[
  '走到樹木、石堆、纖維草旁按 <b>E</b>（或右鍵點資源）開始採集。湊齊後就能蓋宗門大殿。',
  '按 <b>1</b>（或點左下「宗門大殿」）出現綠色虛影，左鍵放置。站在工地旁才會施工。',
  '按 <b>2</b> 放置求武台（木材 40、石材 30）。',
  '左鍵點選求武台，按「招募弟子」（食物 20）。食物來自漿果叢（紅點灌木）或擊殺妖狼。',
  '左鍵點選弟子（或按 Q 全選弟子），再右鍵點樹木等資源，弟子會自動來回搬運。',
  '原型目標完成！可以繼續：蓋住房擴充弟子上限、擊退妖狼讓主角突破境界。'
];
const HINTS_TOUCH=[
  '用左下搖桿走到樹木、石堆、纖維草旁，按「採集」。（主角被選取時，直接點資源也行）',
  '按「建造」→「宗門大殿」，拖曳畫面對準位置，按「✔ 在此建造」。站在工地旁才會施工。',
  '按「建造」→「求武台」（木材 40、石材 30）。',
  '點一下求武台，按「招募弟子」（食物 20）。食物來自漿果叢（紅點灌木）或擊殺妖狼。',
  '點一下弟子（或按「全選」），再點樹木等資源，弟子會自動來回搬運。',
  '原型目標完成！可以繼續：蓋住房擴充弟子上限、擊退妖狼讓主角突破境界。'
];
function updateObjectives(){
  const o=S.objDone;
  if(!o[0]&&((S.res.wood>=30&&S.res.stone>=20&&S.res.fiber>=10)||S.buildings.some(b=>b.type==='hall')))o[0]=true;
  if(!o[1]&&hasBuilt('hall'))o[1]=true;
  if(!o[2]&&hasBuilt('altar'))o[2]=true;
  if(!o[3]&&S.stats.recruited>0)o[3]=true;
  if(!o[4]&&S.stats.discDeposit>0){o[4]=true;toast('原型目標全部完成！宗門初具雛形。');}
  let cur=o.findIndex(v=>!v);if(cur<0)cur=5;
  const HN=isTouchUI?HINTS_TOUCH:HINTS_PC;
  const h='<h3>宗門目標</h3>'+OBJ.map((t,k)=>`<div class="o ${o[k]?'done':k===cur?'cur':''}">${o[k]?'✔':(k+1)+'.'} ${t}</div>`).join('')+(cur===5?'<div class="o cur">★ 全部完成</div>':'')+'<div class="ohint">'+HN[cur]+'</div>'+`<div class="chip">◎ ${cur<5?(cur+1)+'/5 '+OBJ[cur]:'★ 全部完成'} <span style="color:#cdbb92">▾</span></div>`;
  if($('objectives').innerHTML!==h)$('objectives').innerHTML=h;
  const HINTS=isTouchUI?HINTS_TOUCH:HINTS_PC;const hint='<b style="color:#f3d48a">提示</b>　'+HINTS[cur]+(cur===0?`<br>目前：木材 ${S.res.wood}/30、石材 ${S.res.stone}/20、纖維 ${S.res.fiber}/10`:'');
  if($('hint').innerHTML!==hint)$('hint').innerHTML=hint;
}
function updateUI(){
  for(const k of RES_KEYS)$('r_'+k).textContent=Math.floor(S.res[k]);
  $('r_pop').textContent=disciples().length+'/'+popCap();
  const p=player();
  if(p){const nx=REALMS[p.realm+1];$('r_realm').textContent=`主角：${REALMS[p.realm].n}`+(nx?`（經驗 ${Math.floor(p.exp)}/${nx.exp}）`:'');}
  const t=Math.floor(S.time);$('r_time').textContent=(helpShown||paused?'暫停 ':'')+String(Math.floor(t/60)).padStart(2,'0')+':'+String(t%60).padStart(2,'0');
  document.querySelectorAll('#buildbar [data-b]').forEach(btn=>{const k=btn.dataset.b,lock=buildLock(k),ok=!lock&&canAfford(BUILD[k].cost);
    btn.classList.toggle('dis',!ok);btn.classList.toggle('on',buildMode===k);const why=btn.querySelector('.why');const w=lock||(canAfford(BUILD[k].cost)?'':'資源不足');if(why.textContent!==w)why.textContent=w;});
  document.body.classList.toggle('building',!!buildMode);
  const ab=$('a_box');if(ab)ab.classList.toggle('on',boxToggle);const abd=$('a_build');if(abd)abd.classList.toggle('on',!!buildMode||$('buildbar').classList.contains('open'));
  const tbh=$('topbar').offsetHeight+'px';if(document.documentElement.style.getPropertyValue('--tb')!==tbh)document.documentElement.style.setProperty('--tb',tbh);
  updateObjectives();renderPanel();drawMinimap();
}

// ================== 輸入（滑鼠＋鍵盤＋觸控）==================
function setHelp(v){helpShown=v;$('help').classList.toggle('hide',!v);}
function setTouchUI(v){
  if(isTouchUI===v&&document.body.classList.contains(v?'touch':'pc'))return;
  isTouchUI=v;document.body.classList.toggle('touch',v);document.body.classList.toggle('pc',!v);
  if(!v){joy.x=joy.y=0;boxToggle=false;}
  resize();panelKeyCache=null;
}
function openBuildMenu(){$('buildbar').classList.add('open');}
function closeBuildMenu(){$('buildbar').classList.remove('open');}
function toggleBuildMenu(){if(buildMode){buildMode=null;return;}$('buildbar').classList.toggle('open');}
function cancelAll(){buildMode=null;closeBuildMenu();selUnits=[];selBuilding=null;boxToggle=false;mouse.box=false;}
function focusPlayer(){const p=player();cam.follow=true;if(p&&!p.dead){selUnits=[p.id];selBuilding=null;}}
function doSave(){saveGame();}
function doLoad(){loadGame(false);}
function doNew(){if(S.time>20&&!confirm('確定要開始新遊戲嗎？（未存檔的進度會遺失）'))return;newGame();toast('開始新遊戲');}
$('help').addEventListener('click',ev=>{if(ev.target.closest('.box')&&!ev.target.closest('[data-close]'))return;setHelp(false);});
function setMenu(v){document.body.classList.toggle('menuopen',v);$('b_menu').classList.toggle('on',v);}
function menuDo(f){return ()=>{setMenu(false);f();};}
const BTN={b_help:()=>setHelp(!helpShown),b_save:doSave,b_load:doLoad,b_new:doNew,
  b_menu:()=>setMenu(!document.body.classList.contains('menuopen')),
  b_map:()=>{const off=document.body.classList.toggle('nomap');$('b_map').classList.toggle('on',!off);},
  m_help:menuDo(()=>setHelp(true)),m_save:menuDo(doSave),m_load:menuDo(doLoad),m_new:menuDo(doNew),
  a_gather:()=>playerInteract(),a_build:()=>toggleBuildMenu(),a_all:()=>{selUnits=disciples().map(u=>u.id);selBuilding=null;if(!selUnits.length)toast('還沒有弟子');},
  a_home:focusPlayer,a_box:()=>{boxToggle=!boxToggle;toast(boxToggle?'框選模式：單指拖曳即可框選弟子':'已關閉框選模式');},a_cancel:cancelAll,
  c_ok:()=>{if(buildMode)tryPlace(false);},c_no:()=>{buildMode=null;}};
for(const id in BTN){const el=$(id);if(!el)continue;el.addEventListener('click',ev=>{ev.preventDefault();BTN[id]();});}
// 防止長按選單、雙擊縮放、iOS 手勢縮放、下拉重新整理
document.addEventListener('contextmenu',ev=>ev.preventDefault());
document.addEventListener('dblclick',ev=>ev.preventDefault(),{passive:false});
['gesturestart','gesturechange','gestureend'].forEach(t=>document.addEventListener(t,ev=>ev.preventDefault(),{passive:false}));
document.addEventListener('touchmove',ev=>{if(!ev.target.closest('.scroll'))ev.preventDefault();},{passive:false});
addEventListener('pointerdown',ev=>{if(document.body.classList.contains('menuopen')&&!ev.target.closest('#menuPop,#b_menu'))setMenu(false);},true);
addEventListener('pointerdown',ev=>{if(ev.pointerType==='touch'||ev.pointerType==='pen')setTouchUI(true);else if(ev.pointerType==='mouse')setTouchUI(false);},true);

// ---- 滑鼠 ----
function mouseDown(ev){
  mouse.x=ev.clientX;mouse.y=ev.clientY;
  if(ev.button===0){mouse.down=!buildMode;mouse.sx=ev.clientX;mouse.sy=ev.clientY;mouse.box=false;if(buildMode){ghostAt={x:ev.clientX,y:ev.clientY};tryPlace(ev.shiftKey);}}
  else if(ev.button===2)rightClick(ev.clientX,ev.clientY);
}
addEventListener('pointermove',ev=>{
  if(ev.pointerType!=='mouse')return;
  mouse.x=ev.clientX;mouse.y=ev.clientY;mouse.inside=ev.target===cv;
  if(buildMode&&!isTouchUI)ghostAt={x:ev.clientX,y:ev.clientY};
  if(mouse.down&&Math.hypot(mouse.x-mouse.sx,mouse.y-mouse.sy)>6)mouse.box=true;
});
addEventListener('pointerup',ev=>{
  if(ev.pointerType!=='mouse'||ev.button!==0||!mouse.down)return;
  if(mouse.box)boxSelect(mouse.sx,mouse.sy,mouse.x,mouse.y,ev.shiftKey);else leftClick(mouse.x,mouse.y,ev.shiftKey);
  mouse.down=false;mouse.box=false;
});
cv.addEventListener('wheel',ev=>{ev.preventDefault();zoomAt(ev.clientX,ev.clientY,ev.deltaY<0?1.1:1/1.1);},{passive:false});
function zoomAt(x,y,f){const before=screenToWorld(x,y);cam.zoom=clamp(cam.zoom*f,0.5,2.2);const after=screenToWorld(x,y);cam.x+=before.x-after.x;cam.y+=before.y-after.y;}

// ---- 觸控（畫布）----
const tps=new Map();let ts=null;
function tpArr(){return Array.from(tps.values());}
cv.addEventListener('pointerdown',ev=>{
  if(ev.pointerType==='mouse'){mouseDown(ev);return;}
  ev.preventDefault();try{cv.setPointerCapture(ev.pointerId);}catch(e){}
  tps.set(ev.pointerId,{x:ev.clientX,y:ev.clientY});
  if(tps.size===1){
    ts={mode:boxToggle?'box':'pending',sx:ev.clientX,sy:ev.clientY,lx:ev.clientX,ly:ev.clientY,t0:performance.now()};
    if(ts.mode==='box'){mouse.sx=mouse.x=ev.clientX;mouse.sy=mouse.y=ev.clientY;mouse.box=true;}
    clearTimeout(ts.lp);
    ts.lp=setTimeout(()=>{if(ts&&ts.mode==='pending'&&!buildMode){ts.mode='box';mouse.sx=mouse.x=ts.lx;mouse.sy=mouse.y=ts.ly;mouse.box=true;if(navigator.vibrate)try{navigator.vibrate(15);}catch(e){}}},420);
  }else if(tps.size===2&&ts){
    clearTimeout(ts.lp);mouse.box=false;
    const [a,b]=tpArr();ts.mode='pinch';ts.pd=Math.hypot(a.x-b.x,a.y-b.y);ts.mx=(a.x+b.x)/2;ts.my=(a.y+b.y)/2;
  }
},{passive:false});
cv.addEventListener('pointermove',ev=>{
  if(ev.pointerType==='mouse'||!tps.has(ev.pointerId)||!ts)return;
  ev.preventDefault();
  tps.set(ev.pointerId,{x:ev.clientX,y:ev.clientY});
  if(ts.mode==='pinch'&&tps.size>=2){
    const [a,b]=tpArr(),d=Math.hypot(a.x-b.x,a.y-b.y),mx=(a.x+b.x)/2,my=(a.y+b.y)/2;
    if(ts.pd>10)zoomAt(mx,my,d/ts.pd);
    cam.x-=(mx-ts.mx)/cam.zoom;cam.y-=(my-ts.my)/cam.zoom;cam.follow=false;
    ts.pd=d;ts.mx=mx;ts.my=my;return;
  }
  const x=ev.clientX,y=ev.clientY;
  if(ts.mode==='pending'&&Math.hypot(x-ts.sx,y-ts.sy)>12){ts.mode='pan';clearTimeout(ts.lp);}
  if(ts.mode==='pan'){cam.x-=(x-ts.lx)/cam.zoom;cam.y-=(y-ts.ly)/cam.zoom;cam.follow=false;}
  else if(ts.mode==='box'){mouse.x=x;mouse.y=y;}
  ts.lx=x;ts.ly=y;
},{passive:false});
function touchEnd(ev){
  if(ev.pointerType==='mouse'||!tps.has(ev.pointerId))return;
  tps.delete(ev.pointerId);
  if(!ts)return;
  if(tps.size===0){
    clearTimeout(ts.lp);
    if(ev.type==='pointerup'){
      if(ts.mode==='pending')tapAt(ev.clientX,ev.clientY);
      else if(ts.mode==='box'&&mouse.box){if(Math.hypot(mouse.x-mouse.sx,mouse.y-mouse.sy)>8)boxSelect(mouse.sx,mouse.sy,mouse.x,mouse.y,false);else tapAt(ev.clientX,ev.clientY);}
    }
    mouse.box=false;ts=null;
  }else if(ts.mode==='pinch'){ts.mode='done';}
}
cv.addEventListener('pointerup',touchEnd);cv.addEventListener('pointercancel',touchEnd);
function tapAt(x,y){
  if(buildMode){
    const prev=ghostOrigin();ghostAt={x,y};const now=ghostOrigin();
    if(prev.i===now.i&&prev.j===now.j)tryPlace(false);   // 再點一次同一格＝確認
    return;
  }
  const w=screenToWorld(x,y);
  const u=unitAt(w,S.units,14);
  const b=buildingAt(w);
  // 單位站在建築上：再點一次已選的單位 → 改選建築（輪流切換）
  if(u&&b&&selUnits.length===1&&selUnits[0]===u.id){selBuilding=b.id;selUnits=[];return;}
  if(u){selBuilding=null;selUnits=[u.id];return;}
  const sel=selUnits.map(unitById).filter(v=>v&&!v.dead);
  if(b){
    if(sel.length&&(!b.built||(b.type==='hall'&&sel.some(v=>v.carry&&v.carry.amt>0)))){rightClick(x,y);return;}
    selBuilding=b.id;selUnits=[];return;
  }
  if(sel.length){rightClick(x,y);return;}
  leftClick(x,y,false);
}

// ---- 虛擬搖桿 ----
const joyEl=$('joy'),knob=$('joyKnob');let joyId=null;
function joyUpdate(ev){
  const r=joyEl.getBoundingClientRect(),cx=r.left+r.width/2,cy=r.top+r.height/2,R=r.width/2;
  let dx=(ev.clientX-cx)/R,dy=(ev.clientY-cy)/R;const l=Math.hypot(dx,dy);if(l>1){dx/=l;dy/=l;}
  joy.x=dx;joy.y=dy;knob.style.transform=`translate(${dx*R*0.6}px,${dy*R*0.6}px)`;
}
joyEl.addEventListener('pointerdown',ev=>{ev.preventDefault();joyId=ev.pointerId;try{joyEl.setPointerCapture(ev.pointerId);}catch(e){}joy.active=true;joyUpdate(ev);},{passive:false});
joyEl.addEventListener('pointermove',ev=>{if(ev.pointerId!==joyId)return;ev.preventDefault();joyUpdate(ev);},{passive:false});
function joyEnd(ev){if(ev.pointerId!==joyId)return;joyId=null;joy.x=joy.y=0;joy.active=false;knob.style.transform='';}
joyEl.addEventListener('pointerup',joyEnd);joyEl.addEventListener('pointercancel',joyEnd);

// ---- 鍵盤 ----
addEventListener('keydown',ev=>{
  const c=ev.code;keys[c]=true;
  if(['ArrowUp','ArrowDown','ArrowLeft','ArrowRight','Space','Tab'].includes(c))ev.preventDefault();
  if(ev.repeat)return;
  if(document.body.classList.contains('touch')&&/^(Key|Digit|Arrow|Space|Escape)/.test(c))setTouchUI(false);
  if(c==='KeyH'){setHelp(!helpShown);return;}
  if(c==='Escape'){if(helpShown)setHelp(false);else if(buildMode)buildMode=null;else{selUnits=[];selBuilding=null;}return;}
  if(helpShown)return;
  if(c==='KeyB'){if(buildMode)buildMode=null;else{const k=!S.buildings.some(b=>b.type==='hall')?'hall':(!S.buildings.some(b=>b.type==='altar')&&hasBuilt('hall'))?'altar':'house';ghostAt={x:mouse.x,y:mouse.y};enterBuild(k);}}
  else if(c==='Digit1'||c==='Numpad1'){ghostAt={x:mouse.x,y:mouse.y};enterBuild('hall');}
  else if(c==='Digit2'||c==='Numpad2'){ghostAt={x:mouse.x,y:mouse.y};enterBuild('altar');}
  else if(c==='Digit3'||c==='Numpad3'){ghostAt={x:mouse.x,y:mouse.y};enterBuild('house');}
  else if(c==='KeyE')playerInteract();
  else if(c==='KeyQ')BTN.a_all();
  else if(c==='KeyK')doSave();
  else if(c==='KeyL')doLoad();
  else if(c==='Space')cam.follow=true;
});
addEventListener('keyup',ev=>{keys[ev.code]=false;});
addEventListener('blur',()=>{for(const k in keys)keys[k]=false;joy.x=joy.y=0;});
// 分頁隱藏時暫停
document.addEventListener('visibilitychange',()=>{paused=document.hidden;for(const k in keys)keys[k]=false;last=performance.now();});

// ---- 除錯資訊（網址加 ?debug=1，或在 ☰ 選單點「版本」5 下）----
const XW_VER='0.2.3';
function dbgText(){
  probeViewport();const vv=window.visualViewport,r=rootEl.getBoundingClientRect(),de=document.documentElement,o=(screen.orientation&&screen.orientation.type)||(window.orientation!=null?'deg '+window.orientation:'?');
  const f=v=>Math.round(v*10)/10;
  return `仙武之體 v${XW_VER}（點此關閉）
inner ${innerWidth}×${innerHeight}  outer ${outerWidth}×${outerHeight}
docEl client ${de.clientWidth}×${de.clientHeight}  scroll ${de.scrollWidth}×${de.scrollHeight}
scrollX/Y ${f(scrollX)}/${f(scrollY)}
visualViewport ${vv?`${f(vv.width)}×${f(vv.height)} offTop ${f(vv.offsetTop)} offLeft ${f(vv.offsetLeft)} pageTop ${f(vv.pageTop)} scale ${f(vv.scale*100)/100}`:'（不支援）'}
root rect x${f(r.left)} y${f(r.top)} ${f(r.width)}×${f(r.height)}
probe(fixed inset:0) ${lastProbe?`x${f(lastProbe.x)} y${f(lastProbe.y)} ${f(lastProbe.w)}×${f(lastProbe.h)}`:'-'}  重排次數 ${relayoutCount}
topbar top ${f(document.getElementById('topbar').getBoundingClientRect().top)} h ${document.getElementById('topbar').offsetHeight}
canvas css ${W}×${H}  px ${cv.width}×${cv.height}  dpr ${devicePixelRatio} (用 ${f(dpr)})
screen ${screen.width}×${screen.height}  avail ${screen.availWidth}×${screen.availHeight}
orientation ${o}  touchUI ${isTouchUI}
safe-area T/B/L/R ${safeArea()}
standalone ${!!(navigator.standalone||matchMedia('(display-mode: standalone)').matches||matchMedia('(display-mode: fullscreen)').matches)}
UA ${navigator.userAgent}`;
}
const saProbe=document.createElement('div');saProbe.style.cssText='position:fixed;left:0;top:0;width:0;height:0;visibility:hidden;padding:env(safe-area-inset-top,0px) env(safe-area-inset-right,0px) env(safe-area-inset-bottom,0px) env(safe-area-inset-left,0px)';document.body.appendChild(saProbe);
function safeArea(){const s=getComputedStyle(saProbe);return [s.paddingTop,s.paddingBottom,s.paddingLeft,s.paddingRight].map(v=>parseFloat(v)||0).join('/');}
let dbgTimer=0;
function setDebug(v){document.body.classList.toggle('debug',v);clearInterval(dbgTimer);if(v){const u=()=>{$('dbg').textContent=dbgText();};u();dbgTimer=setInterval(u,500);}}
$('dbg').addEventListener('click',()=>setDebug(false));
let verTaps=0,verT=0;
$('m_ver').addEventListener('click',()=>{const now=performance.now();verTaps=now-verT<1500?verTaps+1:1;verT=now;if(verTaps>=5){verTaps=0;setMenu(false);setDebug(!document.body.classList.contains('debug'));}});
try{if(/[?&]debug=1\b/.test(location.search))setDebug(true);}catch(e){}

// ---- PWA：安裝與離線（只在 http/https 下啟用；直接雙擊開檔時自動略過）----
let deferredPrompt=null;
addEventListener('beforeinstallprompt',ev=>{ev.preventDefault();deferredPrompt=ev;['b_install','m_install'].forEach(id=>{const b=$(id);if(b)b.style.display='';});});
async function doInstall(){setMenu(false);if(!deferredPrompt){toast('iPhone：用 Safari「分享 → 加入主畫面」安裝');return;}deferredPrompt.prompt();try{await deferredPrompt.userChoice;}catch(e){}deferredPrompt=null;['b_install','m_install'].forEach(id=>{const b=$(id);if(b)b.style.display='none';});}
['b_install','m_install'].forEach(id=>{const b=$(id);if(b)b.addEventListener('click',doInstall);});
if(window.__XW_PWA__&&'serviceWorker' in navigator&&/^https?:$/.test(location.protocol)){
  addEventListener('load',()=>{navigator.serviceWorker.register('./service-worker.js').then(()=>{window.__swOK=true;}).catch(err=>console.warn('SW 註冊失敗',err));});
}

// ================== 主迴圈 ==================
function playerInput(dt){
  const p=player();if(!p||p.dead)return;
  let dx=(keys.KeyD?1:0)-(keys.KeyA?1:0),dy=(keys.KeyS?1:0)-(keys.KeyW?1:0),mag=1;
  if(!dx&&!dy&&joy.active){const l=Math.hypot(joy.x,joy.y);if(l>0.18){dx=joy.x;dy=joy.y;mag=Math.min(1,l/0.7);}}
  if(!dx&&!dy){p.manual=false;return;}
  p.manual=true;p.task=null;p.path=[];cam.follow=true;
  const w=unIso(dx,dy),l=Math.hypot(w.x,w.y);const vx=w.x/l*p.speed*mag*dt,vy=w.y/l*p.speed*mag*dt;
  if(!blockedP(p.x+vx,p.y))p.x+=vx;
  if(!blockedP(p.x,p.y+vy))p.y+=vy;
  p.x=clamp(p.x,0.05,N-0.05);p.y=clamp(p.y,0.05,N-0.05);
  if(Math.abs(dx)>0.1)p.face=dx>0?1:-1;
  p.walk=(p.walk||0)+dt;p.path=[];p._kbMove=0.1;
}
function update(dt){
  S.time+=dt;
  playerInput(dt);
  for(const u of S.units.slice())updateUnit(u,dt);
  for(const e of S.enemies.slice())updateEnemy(e,dt);
  separate();
  for(const b of S.buildings){if(b.type==='altar'&&b.built&&b.queue>0){b.qt+=dt;if(b.qt>=RECRUIT_TIME){b.qt=0;b.queue--;spawnDisciple(b);}}}
  aggroTimer-=dt;
  if(aggroTimer<=0){aggroTimer=0.3;
    for(const u of S.units){if(u.dead)continue;
      const idle=!u.task||(u.kind==='disciple'&&['gather','return','build'].includes(u.task.type));
      if(!idle||(u.kind==='player'&&u.manual))continue;
      let near=null,nd=u.kind==='player'?3:3.5;for(const e of S.enemies){const d=dist(u.x,u.y,e.x,e.y);if(d<nd){nd=d;near=e;}}
      if(near){u.prevTask=u.task;u.task={type:'attack',eid:near.id};u.path=[];}
    }
  }
  wolfTimer+=dt;if(wolfTimer>40){wolfTimer=0;if(S.enemies.length<5)spawnWolf();}
  floaters.forEach(f=>f.t+=dt);floaters=floaters.filter(f=>f.t<1.4);
  markers.forEach(m=>m.t+=dt);markers=markers.filter(m=>m.t<0.8);
}
function updateCamera(dt){
  const p=player(),sp=600*dt/cam.zoom;
  if(keys.ArrowLeft){cam.x-=sp;cam.follow=false;}if(keys.ArrowRight){cam.x+=sp;cam.follow=false;}
  if(keys.ArrowUp){cam.y-=sp;cam.follow=false;}if(keys.ArrowDown){cam.y+=sp;cam.follow=false;}
  if(cam.follow&&p&&!p.dead){const q=iso(p.x,p.y);const k=1-Math.exp(-8*dt);cam.x+=(q.x-cam.x)*k;cam.y+=(q.y-20-cam.y)*k;}
  cam.x=clamp(cam.x,-N*HW,N*HW);cam.y=clamp(cam.y,0,N*TH);
}
let last=performance.now();
function frame(now){
  const dt=Math.min(0.05,(now-last)/1000);last=now;
  try{
    if(paused){requestAnimationFrame(frame);return;}
    if(!helpShown)update(dt);
    updateCamera(dt);draw();
    uiTimer-=dt;if(uiTimer<=0){uiTimer=0.15;updateUI();}
  }catch(err){console.error(err);}
  requestAnimationFrame(frame);
}
setTouchUI(isTouchUI);if(isTouchUI)cam.zoom=1.0;initBuildBar();newGame();updateUI();resize();
toast(isTouchUI?'歡迎！右上 ☰ 可開啟說明與存讀檔':'歡迎來到仙武之體！按 H 開關操作說明');
requestAnimationFrame(frame);
// 測試用（不影響遊戲）
window.XW={ver:XW_VER,dbgText,setDebug,placementValid,resize,get W(){return W;},get H(){return H;},joy,tapAt,get touch(){return isTouchUI;},get paused(){return paused;},get S(){return S;},player,disciples,update,saveGame,loadGame,newGame,enterBuild,recruit,bById,iso,worldToScreen,cam,get sel(){return selUnits;},setHelp,spawnWolf};
})();
</script>
</body>
</html>
