// ================== 版面與座標（沿用 v0.2.3 的 CSS 優先版面修正）==================
/*@@RESIZE@@*/
function tileAtWorld(w){const t=unIso(w.x,w.y);return {i:Math.floor(t.x),j:Math.floor(t.y),x:t.x,y:t.y};}
function unitAt(w,list,off,rad){let best=null,bd=rad||(isTouchUI?24/Math.min(1,cam.zoom):15);for(const u of list){if(u.dead||u.inside)continue;const p=iso(u.x,u.y);const d=dist(w.x,w.y,p.x,p.y-off);if(d<bd){bd=d;best=u;}}return best;}
function occAt(w,pred){for(const dy of [0,16,32,48]){const t=tileAtWorld({x:w.x,y:w.y+dy});if(!inMap(t.i,t.j))continue;const o=occ[t.j*N+t.i];if(o&&pred(o))return o;}return null;}
function buildingAt(w){return occAt(w,o=>o.vid==null);}
function structAt(w){return occAt(w,o=>o.vid!=null&&!o.dead);}
function nodeAt(w){for(const dy of [0,14,28]){const t=tileAtWorld({x:w.x,y:w.y+dy});if(!inMap(t.i,t.j))continue;const n=nodeGrid[t.j*N+t.i];if(n&&!n.gone)return n;}return null;}
function enemyAt(w){let best=null,bd=isTouchUI?36/Math.min(1,cam.zoom):28;for(const e of S.enemies){if(e.dead||!isExplored(e.x,e.y))continue;const p=iso(e.x,e.y),off=e.type==='king'?24:10;const d=dist(w.x,w.y,p.x,p.y-off);if(d<bd){bd=d;best=e;}}return best;}

// ================== 介面 ==================
const $=id=>document.getElementById(id);
let panelKeyCache=null,tradeOpen=null,tradeKey=null,cultKey=null,tradeDirty=false;
function initBuildBar(){
  let h='<div class="lbl">建造（B）</div>';
  BUILD_ORDER.forEach((k,idx)=>{const D=BUILD[k];h+=`<button class="btn bb" data-b="${k}" title="${D.desc}"><b>⇧${idx+1}　${D.name}</b><small>${costStr(D.cost)}</small><small class="why"></small></button>`;});
  $('buildbar').innerHTML=h;
  $('buildbar').addEventListener('click',ev=>{const btn=ev.target.closest('[data-b]');if(btn)enterBuild(btn.dataset.b);});
}
const JOB_NAME={gather:'採集',train:'練武',seclude:'閉關',rest:'休息',study:'研讀',lecture:'聽道',guard:'守衛',follow:'跟隨',alchemy:'煉丹',forge:'鍛造',dual:'雙修'};
function taskName(u){
  if(u.dead)return '重傷倒地';if(u.inside){const bb=bById(u.inB);return `${INJOB[u.job]?INJOB[u.job].label+'中':'在'}（${bb?roomName(bb):'建築'}內）`;}
  const t=u.task;
  if(t){if(t.type==='move')return '移動中';if(t.type==='attack')return '戰鬥中';if(t.type==='build')return u.working?'建造中':'前往工地';if(t.type==='repair')return u.working?'修繕中':'前往修繕';
    if(t.type==='meditate')return '打坐中';if(t.type==='gather')return (u.working?'採集中：':'前往採集：')+RES_NAMES[NODE_RES[(nodeById(t.nodeId)||{type:'tree'}).type]];if(t.type==='astruct')return '攻打營帳';if(t.type==='interact')return '前往互動';}
  if(u.job==='gather')return (u.carry&&u.carry.amt>=CARRY_CAP||u.jst==='ret'?'搬運回大殿：':u.working?'採集中：':'前往採集：')+RES_NAMES[u.jobRes];
  if(INJOB[u.job])return '前往'+BUILD[INJOB[u.job].b].name;if(u.job==='guard')return '守衛中';if(u.job==='follow')return '跟隨你';
  return u.working?'施工中':'閒置';
}
function canBreakNow(u){return !capped(u)&&(u.sub||0)>=3&&breakConds(u).ok;}
function breakMiss(u){
  if(!u)return ['找不到角色'];
  if(typeof capped==='function'&&capped(u))return ['已達目前最高境界'];
  const miss=[];
  try{
    const sub=u.sub||0,need=(typeof needXiu==='function')?needXiu(u):0;
    const subN=(typeof SUB!=='undefined'&&SUB[sub])?SUB[sub]:('第'+(sub+1)+'層');
    if(sub<3)miss.push('尚未到達「圓滿」（目前'+subN+'）');
    else if(u.xiu<need)miss.push('修為尚未圓滿（'+Math.floor(u.xiu)+'/'+Math.floor(need)+'）');
    const c=breakConds(u);
    for(const x of (c&&c.list)||[]){if(x&&!x.ok&&!/^修為圓滿/.test(x.t||''))miss.push(x.t);}
  }catch(e){}
  return miss.length?miss:['條件未齊'];
}
function breakBtnHtml(u){
  if(!u||(u.kind!=='player'&&u.kind!=='disciple'))return '';
  if(typeof capped==='function'&&capped(u))return '<div class="xwbrk dim">已達目前最高境界</div>';
  const next=(REALMS[u.realm+1]&&REALMS[u.realm+1].n)||'下一境';
  if(canBreakNow(u)){
    const rate=Math.round((1-breakFail(u))*100);
    return '<div class="xwbrk"><button class="btn on" data-act="break" data-xwbrk="ok">突破「'+next+'」（成功率 '+rate+'%）</button></div>';
  }
  const miss=breakMiss(u);
  const esc=s=>String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
  return '<div class="xwbrk"><button class="btn xwbrk-off" data-act="break" data-xwbrk="miss" title="'+esc(miss.join('、'))+'">突破「'+next+'」</button><div class="xwbrk-miss">缺：'+esc(miss.join('、'))+'</div></div>';
}
function toastBreakMiss(u){
  const miss=breakMiss(u);
  const nm0=(typeof nm==='function')?nm(u):((u&&u.n)||'此人');
  try{toast(nm0+'尚未滿足突破條件：'+miss.join('；'));}catch(e){}
}
// #cult 弟子列突破鈕：條件未齊仍畫灰鈕＋缺項（與 #v47ub 同一套 breakMiss／toastBreakMiss）
function cultDiscBreakHtml(u){
  if(!u)return '';
  if(typeof capped==='function'&&capped(u))return '<div class="xwbrk dim">已達目前最高境界</div>';
  const next=(REALMS[u.realm+1]&&REALMS[u.realm+1].n)||'下一境';
  if(canBreakNow(u))return '<div class="xwbrk"><button class="btn on" data-break="'+u.id+'" data-xwbrk="ok">突破「'+next+'」</button></div>';
  const miss=breakMiss(u);
  const esc=s=>String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
  return '<div class="xwbrk"><button class="btn xwbrk-off" data-break="'+u.id+'" data-xwbrk="miss" title="'+esc(miss.join('、'))+'">突破</button><div class="xwbrk-miss">缺：'+esc(miss.join('、'))+'</div></div>';
}
function xwPinBreak(){
  try{
    const el=document.getElementById('panel');if(!el||el.style.display==='none')return;
    if(typeof selUnits==='undefined'||!selUnits||selUnits.length!==1)return;
    if(typeof selOther!=='undefined'&&selOther)return;
    if(typeof selBuilding!=='undefined'&&selBuilding!=null)return;
    const u=unitById(selUnits[0]);if(!u||(u.kind!=='player'&&u.kind!=='disciple'))return;
    let b=el.querySelector('#v47ub');
    if(!b){
      const anchor=el.querySelector('.pbar')||el.querySelector('.bar');
      if(!anchor)return;
      b=document.createElement('div');b.id='v47ub';
      anchor.insertAdjacentElement('afterend',b);
    }
    const html=breakBtnHtml(u);
    let row=b.querySelector('.xwbrk');
    if(!html){if(row)row.remove();return;}
    if(!row){b.insertAdjacentHTML('beforeend',html);return;}
    if(row.outerHTML!==html){
      const w=document.createElement('div');w.innerHTML=html;
      const nxt=w.firstElementChild;if(nxt)row.replaceWith(nxt);
    }
  }catch(e){}
}
function selOtherObj(){if(!selOther)return null;if(selOther.k==='s')return sById(selOther.id);if(selOther.k==='e')return enemyById(selOther.id);if(selOther.k==='n')return nodeById(selOther.id);if(selOther.k==='v')return vById(selOther.id);if(selOther.k==='w')return wandById(selOther.id);return null;}
function panelKey(){
  if(selBuilding!=null){const b=bById(selBuilding);if(!b){selBuilding=null;return '';}return 'b'+b.id+(b.built?'1':'0')+(b.broken?'x':'')+(b.up?'u':'')+(S.flags.xian?'X':'')+(b.research?'r':'')+(b.craft?'c':'')+'L'+blv(b)+(b.upg?'U':'')+(b.type==='altar'?'c'+S.cands.filter(o=>o.bid===b.id).length:'');}
  if(selUnits.length===1){const u=unitById(selUnits[0]);if(!u){selUnits=[];return '';}return 'u'+u.id+(u.job||'')+(u.jobRes||'')+(u.smart?'S':'')+u.realm+'s'+(u.sub||0)+gearKey(u)+(canBreakNow(u)?'B':'')+(u.task&&u.task.type==='meditate'?'M':'')+bondPK(u);}
  if(selUnits.length>1)return 'm'+selUnits.length+selUnits.map(id=>{const u=unitById(id);return u?(u.job||'-'):''}).join('');
  if(selOther){const o=selOtherObj();if(!o){selOther=null;return '';}return 'o'+selOther.k+selOther.id+(selOther.k==='w'?'f'+o.fav+'r'+o.realm:'')+(o.type==='dgate'?'c'+Math.ceil(Math.max(0,(S.dgCd[o.kind]||0)-S.time)/5)+disciples().length+(player()||{}).realm:'');}
  return '';
}
function jobButtons(us){
  const ds=us.filter(u=>u.kind==='disciple');if(!ds.length)return '';
  const all=k=>ds.every(u=>u.job===k);const res=ds[0].jobRes;
  let h='<div class="jobs">';
  for(const k of ['gather','train','seclude','rest','study','lecture','alchemy','forge','guard','follow'])h+=`<button class="btn ${all(k)?'on':''}" data-job="${k}">${JOB_NAME[k]}</button>`;
  h+=`<button class="btn ${ds.every(u=>!u.job)?'on':''}" data-job="none">待命</button></div>`;
  if(ds.some(u=>u.job==='gather')){h+='<div class="jobs">採集：';for(const r of ['wood','stone','fiber','food','iron','herb','lingshi'])h+=`<button class="btn ${all('gather')&&ds.every(u=>u.jobRes===r)?'on':''}" data-res="${r}">${RES_NAMES[r]}</button>`;h+=`<button class="btn ${ds.every(u=>u.smart)?'on':''}" data-res="smart" data-tip="smart">⚖ 智能</button>`;h+='</div>';}
  return h;
}
function renderPanel(){
  const key=panelKey(),el=$('panel');
  if(key!==panelKeyCache){
    const wasExp=el.classList.contains('expanded')&&panelKeyCache&&key&&panelKeyCache.slice(0,4)===key.slice(0,4);
    panelKeyCache=key;if(!wasExp)el.classList.remove('expanded');
    if(!key){el.style.display='none';el.innerHTML='';return;}
    el.style.display='block';
    if(key[0]==='b'){
      const b=bById(selBuilding);if(!b){el.style.display='none';el.innerHTML='';return;}
      const D=BUILD[b.type]||{name:b.type||'建築',desc:'（資料缺失）',cost:{}};
      let h=`<h4><span class="pexp">▾ 詳細</span>${bName(b)}<span class="tag" style="background:${b.broken?'#ff8a6a':b.built?'#9fd88a':'#7fd0ff'}">${b.broken?'損壞':b.built?'已落成':'建造中'}</span></h4><div class="mini" id="pd_mini"></div><div class="pdesc" style="color:#d8c9a6">${typeof bLiveDesc==='function'?bLiveDesc(b):D.desc}</div>`;
      if(!b.built)h+=`<div class="bar"><i id="pd_prog" style="background:#7fd0ff"></i></div><div>進度 <span id="pd_progt"></span>　<span class="pdesc">需要你或弟子在旁施工（選取單位後${isTouchUI?'點':'右鍵點'}工地）</span></div><div class="jobs"><button class="btn warn" data-act="demo">取消建造（全額退回）</button></div>`;
      else{h+=`<div class="bar"><i id="pd_hp" style="background:#ffb04a"></i></div>`;
        const acts=[];
        if(b.type==='altar'){const c=recruitCost(b),nc=S.cands.filter(o=>o.bid===b.id).length;acts.push(nc?`<button class="btn pri" data-act="cands">📜 招募選單（${nc} 位候選）</button>`:`<button class="btn" data-act="recruit">感應有緣人（${costStr(c)}）</button><button class="btn" data-act="cands">📜 招募選單</button>`);if(!b.up&&S.flags.xian)acts.push('<button class="btn" data-act="upgrade">升級求仙台（靈石 30、石材 60）</button>');}
        if(b.type==='library')acts.push(`<button class="btn" data-act="research">研究武學秘籍（${costStr(RESEARCH_COST)}）</button>`);
        if(ROOM[b.type]&&!b.broken)acts.unshift(`<button class="btn pri" data-act="enter">🚪 進入${roomName(b)}</button>`);if(JOB_OF[b.type])acts.push(`<button class="btn" data-act="assign">指派弟子${INJOB[JOB_OF[b.type]].label}</button>`);
        acts.push(...extraActs(b));acts.push('<button class="btn" data-act="repair">修繕</button>');
        {const _mx=(typeof econUpgradeMax==='function'?econUpgradeMax(b):LV_MAX);const lv=blv(b);
          if(!b.upg&&lv<_mx)acts.push(`<button class="btn up" data-act="lvup">⬆ 升級 Lv${lv+1}</button>`);
          else if(!b.upg){const need=(typeof econRealmNeedForLv==='function'?econRealmNeedForLv(lv+1):0);const rn=(REALMS[need]&&REALMS[need].n)||'更高境界';const abs=(typeof ECON_LV_MAX==='number'?ECON_LV_MAX:6);
            acts.push(`<button class="btn" disabled title="${lv>=abs?'已達最高等級':('需宗門突破「'+rn+'」')}">⬆ ${lv>=abs?'已滿級':'需突破「'+rn+'」'}</button>`);}}
        acts.push('<button class="btn warn" data-act="demo">拆除</button>');
        h+=`<div class="jobs">${acts.join('')}</div>${lvPanel(b)}<div id="pd_info" style="font-size:12px;color:#d8c9a6"></div>`;
        if(b.type==='altar')h+=`<div class="bar"><i id="pd_q"></i></div><div class="phint pmore">付出食物後會來 ${TUNE.candBatch[0]}～${TUNE.candBatch[1]} 位候選人，在「招募選單」挑選要收的弟子，沒選的會變成流浪者。資質品階機率以招募卡片為準（真概率）。${b.up?'求仙台：靈根率依資質品階（下品 1%／中品 3%／上品 8%／極品·天品必有）。':''}</div>`;}
      el.innerHTML=h;
    }else if(key[0]==='u'){
      const u=unitById(selUnits[0]),B=BODIES[u.body],R=REALMS[u.realm];
      const ab=[];for(let r=1;r<=u.realm;r++)if(REALMS[r].ab)ab.push(ABIL[REALMS[r].ab].n);
      el.innerHTML=`<h4><span class="pexp">▾ 詳細</span>${pnm(u)}<span class="tag" style="background:${B.col}">${B.n}</span>${xnGradeTag(u,1)}<span class="tag" style="background:#9fe8ff">${realmName(u)}</span></h4>
        <div class="mini"><b id="pd_mr"></b>｜<b id="pd_ms"></b> <span id="pd_mc"></span></div>
        <div class="pdesc" style="color:#d8c9a6">${B.desc}</div>
        <div class="bar"><i id="pd_hp" style="background:#5fe06a"></i></div><div class="pbar"><i id="pd_xiu"></i></div>
        <div id="v47ub">${breakBtnHtml(u)}</div>
        ${u.kind==='disciple'?jobButtons([u])+'<div class="jobs"><button class="btn" data-act="bag">🎒 行囊</button><button class="btn" data-act="samejob">選同職務</button><button class="btn" data-act="locate">📍 定位</button></div>'+(typeof bondBtns==='function'?bondBtns(u):'')+'<div class="jobs"><button class="btn warn" data-act="kick">逐出師門</button></div>':`<div class="jobs"><button class="btn ${u.task&&u.task.type==='meditate'?'on':''}" data-act="med">打坐修煉</button><button class="btn" data-act="skill">施放技能</button><button class="btn" data-act="bag">🎒 行囊</button><button class="btn" data-act="cult">修煉面板</button></div>`}
        <div class="pmore"><div class="grid"><span>氣血 <b id="pd_hpt"></b></span><span>攻擊 <b id="pd_atk"></b></span><span>速度 <b>${u.speed}</b></span><span>採集 <b>${u.gat}</b></span>
        <span>修為 <b id="pd_xiut"></b></span><span>悟性 <b>${u.wu}</b></span><span>仙緣 <b id="pd_xy"></b></span><span>氣運 <b>${u.luck}</b></span></div>
        <div>靈根：${lgName(u.lg)}　性格：${u.person}　${u.kind==='player'?'':'忠誠：'+u.loyal}</div><div>技能：${ab.length?ab.join('、'):'（突破武師後領悟「衝鋒」）'}</div>${gearLine(u)}
        <div>狀態：<b id="pd_state"></b>　<span id="pd_carry"></span></div>
        ${u.kind==='disciple'?`<div class="phint">${isTouchUI?'點資源＝循環採集；點地面＝移動；長按敵人＝攻擊':'右鍵點資源＝循環採集；右鍵點地面＝移動；右鍵點敵人＝鎖定攻擊'}；練武需武道館、閉關需練武閣</div>`:`<div class="phint">${isTouchUI?'搖桿移動、「採集」鍵採集／施工；「技能」施放境界技能':'WASD 移動、方向鍵平移鏡頭、V 採集／施工、Q E R T 技能、Z 打坐'}</div>`}</div>`;
    }else if(key[0]==='m'){
      const us=selUnits.map(unitById).filter(Boolean);
      el.innerHTML=`<h4><span class="pexp">▾ 名單</span>已選取 ${us.length} 名單位</h4><div class="mini">${isTouchUI?'點地面＝排陣移動；點資源＝一起採集':'右鍵點地面＝排陣移動'}</div>${jobButtons(us)}<div class="pmore"><div class="list scroll" id="pd_list"></div></div>`;
    }else{
      const o=selOtherObj(),k=selOther.k;let h='';
      if(k==='s'){const v=vById(o.vid);
        if(o.type==='dgate')h=dgatePanel(o);
        else if(o.type==='ruinAltar')h=`<h4>遺跡石台</h4><div class="mini">${S.flags.ruinLoot?'傳承已取得':S.flags.kingDead?'封印已鬆動：靠近互動可取得傳承':'石甲妖王守護著此地'}</div><div class="jobs"><button class="btn" data-act="goint">前往互動</button></div>`;
        else if(v&&v.type==='bandit')h=`<h4>${v.name}・${VS[o.type].name}<span class="tag" style="background:#ff8a6a">山賊</span></h4><div class="mini">${o.maxhp?'耐久 <b id="pd_shp"></b>':'木柵'}｜摧毀「山寨大帳」即可攻破山寨</div>${o.maxhp?`<div class="phint">${isTouchUI?'長按山寨建物＝下令攻打':'右鍵點山寨建物＝下令攻打'}</div>`:''}`;
        else if(v)h=`<h4>${v.name}・${VS[o.type].name}<span class="tag" style="background:${vStatus(v)==='friendly'?'#9fd88a':vStatus(v)==='neutral'?'#ffe27a':'#ff8a6a'}">${VSTAT_NAME[vStatus(v)]}</span></h4><div class="mini">關係 <b id="pd_rel"></b></div><div class="jobs"><button class="btn" data-act="trade">交易／委託</button><button class="btn" data-act="goint">親自前往</button></div>`;}
      else if(k==='e'){h=`<h4>${enemyName(o)}${o.raid?'<span class="tag" style="background:#ff6a5a">襲擊者</span>':''}</h4><div class="mini">氣血 <b id="pd_ehp"></b>｜攻擊 ${o.atk}</div><div class="phint">${isTouchUI?'長按敵人＝下令攻擊':'右鍵點敵人＝鎖定並攻擊'}</div>`;}
      else if(k==='w'){h=wandPanel(o);}
      else if(k==='n'){const rn=(typeof nodeResOf==='function'?nodeResOf(o):NODE_RES[o.type]),nn=(typeof nodeNameOf==='function'?nodeNameOf(o):NODE_NAME[o.type]);h=`<h4>${nn}</h4><div class="mini">剩餘 <b id="pd_namt"></b>　產出 ${RES_NAMES[rn]}${o.type==='vein'&&!S.flags.xian?'（需修仙階段才能開採）':''}</div>`;}
      el.innerHTML=h;
    }
  }
  if(!key){try{el.classList.remove('v55');}catch(e){}return;}
  if(key[0]!=='u'){try{el.classList.remove('v55');}catch(e){}}
  const set=(id,v)=>{const e=$(id);if(e&&e.textContent!==String(v))e.textContent=v;};
  const wid=(id,f)=>{const e=$(id);if(e)e.style.width=(clamp(f,0,1)*100)+'%';};
  if(key[0]==='b'){const b=bById(selBuilding);if(!b)return;
    if(!b.built){wid('pd_prog',b.progress);set('pd_progt',Math.floor(b.progress*100)+'%');set('pd_mini','建造中 '+Math.floor(b.progress*100)+'%');return;}
    wid('pd_hp',b.hp/b.maxhp);if(b.upg)set('pd_upg',Math.floor(b.upg.p*100)+'%');
    let info=`耐久 ${Math.ceil(b.hp)}/${b.maxhp}${b.broken?'（損壞：功能停止）':''}`;
    if(b.type==='altar')info+=`｜弟子 ${disciples().length}/${popCap()}`+(b.queue>0?`｜感應中 ×${b.queue}（${Math.ceil(RECRUIT_TIME-b.qt)} 秒）`:'');
    if(b.type==='hall'||b.type==='house')info+=`｜弟子上限 ${popCap()}`+(b.type==='house'&&S.flags.xian?`｜洞府加成 +${Math.min(50,caveCount()*10)}%`:'');
    if(JOB_OF[b.type])info+=`｜${INJOB[JOB_OF[b.type]].label} ${occupants(b).length}/${jobSlots(b)} 人在內${trainers(b)>occupants(b).length?`（${trainers(b)-occupants(b).length} 人前來中）`:''}`;
    if(b.type==='library')info+=`｜宗門持有 秘籍 ${S.items.miji}、功法 ${S.items.gongfa}`+(b.research?`｜研究中 ${Math.floor(b.research.t/RESEARCH_TIME*100)}%`:'');
    set('pd_info',info);set('pd_mini',info);if(b.type==='altar')wid('pd_q',b.queue>0?b.qt/RECRUIT_TIME:0);
  }else if(key[0]==='u'){const u=unitById(selUnits[0]);if(!u)return;
    wid('pd_hp',u.hp/u.maxhp);wid('pd_xiu',!capped(u)?u.xiu/needXiu(u):1);
    set('pd_hpt',`${Math.ceil(u.hp)}/${u.maxhp}`);set('pd_atk',u.atk);set('pd_xy',u.xy);set('pd_xiut',!capped(u)?`${Math.floor(u.xiu)}/${needXiu(u)}`:'—');
    set('pd_state',taskName(u));set('pd_carry',u.carry&&u.carry.amt>0?`背負：${RES_NAMES[u.carry.type]} ${u.carry.amt}/${CARRY_CAP}`:'');
    set('pd_mr',`${realmName(u)} 修為 ${!capped(u)?Math.floor(u.xiu)+'/'+needXiu(u):'圓滿'}`);set('pd_ms',taskName(u));set('pd_mc',`氣血 ${Math.ceil(u.hp)}/${u.maxhp}`);
  }else if(key[0]==='m'){
    const h=selUnits.map(unitById).filter(Boolean).map(u=>`<div><span style="color:${BODIES[u.body].col}">●</span> ${pnm(u)}｜${realmName(u)}｜氣血 ${Math.ceil(u.hp)}/${u.maxhp}｜${taskName(u)}</div>`).join('');
    const l=$('pd_list');if(l&&l.innerHTML!==h)l.innerHTML=h;
  }else{const o=selOtherObj();if(!o)return;
    if(selOther.k==='s'){set('pd_shp',`${Math.ceil(o.hp)}/${o.maxhp}`);const v=vById(o.vid);if(v)set('pd_rel',`${v.rel}（${VSTAT_NAME[vStatus(v)]}）`);}
    if(selOther.k==='e')set('pd_ehp',`${Math.ceil(o.hp)}/${o.maxhp}`);if(selOther.k==='n')set('pd_namt',o.amount);}
}
$('panel').addEventListener('click',ev=>{
  const j=ev.target.closest('[data-job]'),r=ev.target.closest('[data-res]'),a=ev.target.closest('[data-act]');
  const us=selUnits.map(unitById).filter(u=>u&&u.kind==='disciple');
  if(j){const k=j.dataset.job;let n=0;for(const u of us){if(k==='none'){u.job=null;u.jobB=null;setTask(u,null);u.holdAt={x:u.x,y:u.y};u.holdT=S.time;u.aiJob=null;n++;}else if(assignJob(u,k))n++;}if(n){const jk=k==='none'?null:(us.find(u=>u.job)||{}).job||k;toast(`${n} 名弟子：${jk?JOB_NAME[jk]||JOB_NAME[k]:'待命'}`);}panelKeyCache=null;return;}
  if(r){if(r.dataset.res==='smart'){for(const u of us){if(u.job!=='gather')assignJob(u,'gather');u.smart=true;}if(S.alloc.mode==='off')S.alloc.mode='auto';allocTick();toast(`${us.length} 名弟子改為智能採集（依缺口自動分配）`);}else for(const u of us){assignJob(u,'gather',r.dataset.res);u.smart=false;}panelKeyCache=null;return;}
  if(!a){if(isTouchUI)$('panel').classList.toggle('expanded');return;}
  const act=a.dataset.act,b=selBuilding!=null?bById(selBuilding):null,p=player();
  if(panelActV045(act,b,us,a)){panelKeyCache=null;return;}
  if(act==='recruit')recruit(b);else if(act==='upgrade')upgradeAltar(b);else if(act==='research')startResearch(b);else if(act==='repair')repairOrder(b);
  else if(act==='assign'){const jb=JOB_OF[b.type];const room=Math.max(0,jobSlots(b)-trainers(b));const ds=disciples().filter(u=>!u.dead&&(!u.job||u.job==='gather')).slice(0,Math.min(room,b.type==='wudao'?3:1));const sel=(us.length?us:ds).slice(0,Math.max(room,0));let n=0;sel.forEach(u=>{if(assignJob(u,jb,{bid:b.id}))n++;});toast(n?`指派 ${n} 名弟子${INJOB[jb].label}`:'沒有可指派的弟子或已滿');}
  else if(act==='enter'){goEnter(b);}else if(act==='lvup'){startUpgrade(b);}else if(act==='demo'){askDemolish(b);}
  else if(act==='kick'){askKick(unitById(selUnits[0]));}else if(act==='cands'){const o=selOtherObj();openRec(b||(o&&o.bid!=null?bById(o.bid):null));}
  else if(act==='woo'){wooWanderer(selOtherObj());}else if(act==='gift'){giftWanderer(selOtherObj());}
  else if(act==='break'){const u=unitById(selUnits[0]);if(!u)return;if(capped(u)){toast('已達目前最高境界');return;}if(!canBreakNow(u)){toastBreakMiss(u);return;}tryBreak(u);}
  else if(act==='med')toggleMeditate();else if(act==='skill')castSkill();else if(act==='cult')openCult();
  else if(act==='trade'){const o=selOtherObj();if(o)openTrade(o.vid);}
  else if(act==='goint'){const o=selOtherObj();if(o&&p&&!p.dead){setTask(p,{type:'interact',sid:o.vid!=null&&vById(o.vid)&&vById(o.vid).tradeId?vById(o.vid).tradeId:o.id});}}
  else if(act==='astruct'){const o=selOtherObj();const cu=commandUnits();cu.forEach(u=>{if(u.kind==='disciple')u.job=u.job==='guard'?null:u.job;setTask(u,{type:'astruct',sid:o.id});});}
  else if(act==='atk'){const o=selOtherObj();commandUnits().forEach(u=>setTask(u,{type:'attack',eid:o.id,man:1,pack:xwAttackPack(o,u),ax:o.x,ay:o.y}));}
  panelKeyCache=null;
});

// ---- 修煉面板 ----
function openCult(){closeTrade();$('cult').classList.add('open');cultKey=null;renderCult();}
function closeCult(){$('cult').classList.remove('open');}
function condHtml(c){return c.list.map(x=>`<div class="${x.ok?'ok':'no'}">${x.ok?'✔':'✖'} ${x.t}</div>`).join('');}
function renderCult(){
  const el=$('cult');if(!el.classList.contains('open'))return;
  const p=player(),ds=disciples();
  const key=JSON.stringify([p&&p.realm,p&&p.sub,S.pills,p&&breakConds(p).list.map(c=>c.ok),ds.map(u=>[u.id,u.realm,u.sub||0,u.job,canBreakNow(u),Math.floor(u.xiu||0),breakMiss(u)]),S.items,S.flags.xian,caveCount(),Math.floor(S.res.lingshi/20)]);
  if(key!==cultKey){cultKey=key;
    let h=`<button class="btn x" data-close>✖ 關閉</button><h3>修煉　<span style="font-size:12px;color:#cdbb92">${S.flags.xian?'宗門已踏入修仙階段':'凡人階段（武道）'}</span></h3>`;
    h+='<div class="ladder">'+REALMS.map((R,k)=>`<span class="${k>MAX_REALM?'lock':p&&k<p.realm?'done':p&&k===p.realm?'cur':''}">${R.full||R.n}${k===4?'（修仙）':''}${k>MAX_REALM?'・踏仙梯':''}</span>`).join('<span style="border:none;opacity:.6">→</span>')+'</div>'+subLadder(p);
    if(p){const c=breakConds(p);h+=`<div class="sec"><b>你（仙武之體）・${realmName(p)}</b>　悟性 ${p.wu}　仙緣 <span data-x="pxy">${p.xy}</span>　修煉速度 ×${cultMul(p).toFixed(2)}${typeof lgCultHtml==='function'?lgCultHtml(p):''}<div class="pbar"><i data-x="pbar"></i></div><div data-x="ptxt"></div>`;
      if(p.realm>MAX_REALM)h+=`<div class="ok">已飛升「${(REALMS[p.realm]&&REALMS[p.realm].n)||'天仙'}」。</div>`; // integ_1113：天仙無下一境，避免 REALMS[p.realm+1] 為 undefined
      else if(!capped(p)){h+=`<div style="margin-top:4px">${(p.sub||0)<3?`修為滿了會自動進入下一個小境界（${SUB[Math.min(3,(p.sub||0)+1)]}）；圓滿後才能突破大境界「${REALMS[p.realm+1].n}」：`:`突破「${REALMS[p.realm+1].n}」的條件：`}</div>${condHtml(c)}`;
        if(p.realm>=1)h+=`<div style="color:#ffd0a0">大境界突破成功率約 ${Math.round((1-breakFail(p))*100)}%（悟性、氣運、突破丹可提高）。失敗依境界損失 1～8 成修為、可能受傷，所需丹藥也會耗掉（見說明 → 境界）。</div>`;
        h+=`<div class="jobs">${c.ok?`<button class="btn on" data-break="${p.id}">突破「${REALMS[p.realm+1].n}」</button>`:''}<button class="btn ${p.task&&p.task.type==='meditate'?'on':''}" data-act="med">打坐修煉（武道館／練武閣旁更快）</button></div>`;}
      else h+='<div class="ok">已達「地仙」圓滿。下一步請前往踏仙梯飛升天仙。</div>';
      h+='</div>';}
    h+=`<div class="sec"><b>宗門藏經</b>：武學秘籍 ${S.items.miji}　功法 ${S.items.gongfa}　靈石 <span data-x="ls">${Math.floor(S.res.lingshi)}</span>${S.flags.xian?`　洞府加成 +${Math.min(50,caveCount()*10)}%`:'　（凡人階段住房沒有修煉加成）'}</div>`;
    h+='<div class="sec"><b>弟子修煉</b>　<span style="font-size:12px;color:#cdbb92">練武（武道館，多人加成）2/秒、閉關（練武閣）3.5/秒，再乘以悟性與體質；戰鬥擊殺也能獲得修為</span>';
    if(!ds.length)h+='<div style="color:#cdbb92">還沒有弟子</div>';
    for(const u of ds){h+=`<div class="urow"><span class="nm" style="color:${BODIES[u.body].col}">${u.name}</span><span>${REALMS[u.realm].n}</span><div class="pbar"><i data-x="u${u.id}"></i></div><span style="font-size:11.5px;color:#cdbb92">${u.job?JOB_NAME[u.job]:'待命'}</span>
      <button class="btn" data-uj="${u.id}" data-j="train">練武</button><button class="btn" data-uj="${u.id}" data-j="seclude">閉關</button>${cultDiscBreakHtml(u)}</div>`;}
    h+='</div>';el.innerHTML=h;}
  if(p){const b=el.querySelector('[data-x="pbar"]');if(b)b.style.width=(p.realm<MAX_REALM?p.xiu/needXiu(p)*100:100)+'%';const t=el.querySelector('[data-x="ptxt"]');if(t)t.textContent=p.realm<MAX_REALM?`修為 ${Math.floor(p.xiu)} / ${needXiu(p)}`:'修為圓滿';}
  for(const u of ds){const b=el.querySelector(`[data-x="u${u.id}"]`);if(b)b.style.width=(u.realm<MAX_REALM?u.xiu/needXiu(u)*100:100)+'%';}
}
$('cult').addEventListener('click',ev=>{
  if(ev.target.closest('[data-close]')){closeCult();return;}
  const br=ev.target.closest('[data-break]');if(br){const u=unitById(+br.dataset.break);if(!u)return;if(typeof capped==='function'&&capped(u)){toast('已達目前最高境界');return;}if(!canBreakNow(u)){toastBreakMiss(u);return;}tryBreak(u);cultKey=null;renderCult();return;}
  const uj=ev.target.closest('[data-uj]');if(uj){assignJob(unitById(+uj.dataset.uj),uj.dataset.j);cultKey=null;renderCult();return;}
  const a=ev.target.closest('[data-act]');if(a&&a.dataset.act==='med'){toggleMeditate();cultKey=null;renderCult();}
});

// ---- 交易面板 ----
function renderTradeSoon(){tradeDirty=true;}
function openTrade(vid){const v=vById(vid);if(!v||v.type==='bandit')return;closeCult();tradeOpen=vid;tradeKey=null;$('trade').classList.add('open');renderTrade();}
function closeTrade(){tradeOpen=null;$('trade').classList.remove('open');}
function closeOverlays(){closeTrade();closeCult();if(mmBig)setMMBig(false);}
function renderTrade(){
  const el=$('trade');if(tradeOpen==null){return;}const v=vById(tradeOpen);if(!v){closeTrade();return;}
  const st=vStatus(v),near=nearVillage(v,8);
  const key=JSON.stringify([v.rel,v.stock,v.quest,near,TRADES.map((t,k)=>canAfford(tradeOffer(v,k).give)),S.res.food>=40]);
  if(key===tradeKey&&!tradeDirty)return;tradeKey=key;tradeDirty=false;
  const rp=(v.rel+100)/2;
  let h=`<button class="btn x" data-close>✖ 關閉</button><h3>${v.name}　<span style="font-size:13px;color:${st==='friendly'?'#9fe08a':st==='neutral'?'#ffe27a':'#ff9a8a'}">【${VSTAT_NAME[st]}】</span></h3>`;
  h+=`<div>關係 ${v.rel}　<span style="font-size:12px;color:#cdbb92">（≥30 友好、≤−30 敵對；中立村價格 ×1.5，關係 ≥60 換得更多）</span></div><div class="relbar"><b style="left:calc(${rp}% - 2px)"></b></div>`;
  if(!near)h+='<div class="no">要讓你走到村莊交易所附近（8 格內）才能交易、交付委託。</div>';
  if(st==='hostile'){h+=`<div class="sec no">村民敵視宗門，拒絕交易。</div><div class="jobs"><button class="btn" data-ap="1">登門賠禮（食物 40，關係 +25）</button></div>`;el.innerHTML=h;return;}
  h+='<div class="sec"><b>交易</b>（每項庫存 5，約 25 秒補 1）';
  TRADES.forEach((t,k)=>{const o=tradeOffer(v,k),ok=near&&!o.locked&&v.stock[k]>0&&canAfford(o.give);
    h+=`<div class="trow"><span>${costStr(o.give)} → <b style="color:#9fe8ff">${costStr(o.get)}</b>${o.locked?`<span class="no">（關係 ${o.need} 開放）</span>`:''}</span><span style="font-size:12px;color:#cdbb92">庫存 ${v.stock[k]}</span><button class="btn ${ok?'':'dis'}" data-tr="${k}">交易</button></div>`;});
  h+='</div><div class="sec"><b>委託</b>　';
  const q=v.quest;
  if(!q)h+='<span style="color:#cdbb92">目前沒有委託，稍後再來看看</span>';
  else{h+=`${questText(q)}　獎勵：<b style="color:#ffe27a">${rewardText(q.reward)}</b>　<span style="font-size:12px;color:#cdbb92">完成關係 +15；逾期 −10</span><div class="jobs">`;
    if(!q.accepted)h+='<button class="btn" data-q="accept">接下委託</button>';
    else{const left=Math.max(0,Math.ceil(q.deadline-S.time));h+=`<span style="font-size:12px">剩餘約 ${Math.floor(left/60)} 分 ${left%60} 秒　</span><button class="btn" data-q="done">${q.type==='deliver'?'交付':'回報完成'}</button>`;}
    h+='</div>';}
  h+=`</div><div class="sec jobs"><button class="btn" data-ex="1" title="會讓關係大幅下降，可能轉為敵對">強徵物資（食物 30、木材 20，關係 −35）</button></div>`;
  el.innerHTML=h;
}
$('trade').addEventListener('click',ev=>{
  if(ev.target.closest('[data-close]')){closeTrade();return;}
  const t=ev.target.closest('[data-tr]');if(t){doTrade(tradeOpen,+t.dataset.tr);tradeKey=null;renderTrade();return;}
  const q=ev.target.closest('[data-q]');if(q){if(q.dataset.q==='accept')acceptQuest(tradeOpen);else completeQuest(tradeOpen);tradeKey=null;renderTrade();return;}
  if(ev.target.closest('[data-ex]')){extort(tradeOpen);tradeKey=null;renderTrade();return;}
  if(ev.target.closest('[data-ap]')){apologize(tradeOpen);tradeKey=null;renderTrade();return;}
});

// ---- 目標與提示 ----
const HINTS_PC=['走到樹木、石堆、纖維草旁按 <b>V</b>（或右鍵點資源）開始採集。','按 <b>B</b> 打開建造選單，選「宗門大殿」放置，站在工地旁才會施工。','按 <b>B</b> 打開建造選單，放置求武台（木材 40、石材 30）。',
  '左鍵點選求武台，按「招募弟子」（食物 20）。食物來自漿果叢或擊殺妖獸。','選取弟子，在下方面板按「採集」並選資源，弟子會自動來回搬運。','讓弟子打坐修煉突破「武師」；按 <b>B</b> 建造練武閣助其突破「大武師」，即可建造武道館（木材 60、石材 40）。',
  '選取弟子按「練武」，修為圓滿後會自動突破武師。','往西北方的「青禾村」（小地圖綠色「村」），靠近後按 <b>N</b> 交易。','山賊會從東邊的黑風寨來襲：讓弟子「守衛」或「跟隨」你迎戰。',
  '東南方的上古遺跡有石甲妖王鎮守。突破武師以上、帶弟子前往，擊敗後與石台互動。','你打坐或戰鬥累積修為；宗師需武學秘籍、煉氣需功法＋仙緣＋靈石 20（按 <b>C</b> 看條件）。','點選求武台，按「升級求仙台」（靈石 30、石材 60）。','全部完成！可以繼續攻破山賊寨、讓弟子修到煉氣。'];
const HINTS_TOUCH=['用左下搖桿走到樹木、石堆、纖維草旁，按「採集」。','按「建造」→「宗門大殿」，對準位置按「✔ 在此建造」。站在工地旁才會施工。','按「建造」→「求武台」（木材 40、石材 30）。',
  '點求武台，按「招募弟子」（食物 20）。食物來自漿果叢或擊殺妖獸。','點弟子，在下方面板按「採集」並選資源，弟子會自動來回搬運。','讓弟子打坐修煉突破「武師」；按「建造」→「練武閣」助其突破「大武師」，即可建造「武道館」（木材 60、石材 40）。',
  '點弟子按「練武」，修為圓滿後會自動突破武師。','往西北方的「青禾村」（點小地圖可看大地圖），靠近後按「交易」。','山賊會從東邊來襲：讓弟子「守衛」或「跟隨」你迎戰。',
  '東南方的上古遺跡有石甲妖王鎮守，帶弟子前往擊敗牠，再點石台互動。','打坐或戰鬥累積修為；按右上「修」看突破條件（煉氣需功法＋仙緣＋靈石 20）。','點求武台，按「升級求仙台」（靈石 30、石材 60）。','全部完成！可以繼續攻破山賊寨、讓弟子修到煉氣。'];
function updateObjectives(){
  const o=S.objDone;let cur=o.findIndex(v=>!v);if(cur<0)cur=NOBJ;
  const HN=isTouchUI?HINTS_TOUCH:HINTS_PC;
  const start=Math.max(0,Math.min(cur-2,NOBJ-6));
  const h='<h3>宗門目標</h3>'+OBJ.map((t,k)=>k<start||k>start+5?'':`<div class="o ${o[k]?'done':k===cur?'cur':''}">${o[k]?'✔':(k+1)+'.'} ${t}</div>`).join('')+(cur===NOBJ?'<div class="o cur">★ 全部完成</div>':'')+'<div class="ohint">'+HN[cur]+'</div>'+`<div class="chip">◎ ${cur<NOBJ?(cur+1)+'/'+NOBJ+' '+OBJ[cur]:'★ 全部完成'} <span style="color:#cdbb92">▾</span></div>`;
  if($('objectives').innerHTML!==h)$('objectives').innerHTML=h;
  const hint='<b style="color:#f3d48a">提示</b>　'+HN[cur]+(cur===0?`<br>目前：木材 ${Math.floor(S.res.wood)}/30、石材 ${Math.floor(S.res.stone)}/20、纖維 ${Math.floor(S.res.fiber)}/10`:'');
  if($('hint').innerHTML!==hint)$('hint').innerHTML=hint;
}
$('objectives').addEventListener('click',()=>$('objectives').classList.toggle('expanded'));
// 20261106e：提示可點關閉；大殿已建成時自動隱藏「按 1 放置宗門大殿」類提示
(function(){const el=$('hint');if(!el||el._hintDismiss)return;el._hintDismiss=1;el.style.cursor='pointer';el.title='點一下關閉提示';
  el.addEventListener('click',()=>{S.flags=S.flags||{};S.flags.hintOff=1;el.style.display='none';});
})();
function nearestTradeVillage(r){let best=null,bd=r;const p=player();if(!p||p.dead)return null;for(const v of S.villages){if(v.type==='bandit')continue;const s=tradePost(v);if(!s)continue;const d=distRect(p.x,p.y,s.i,s.j,s.s);if(d<bd){bd=d;best=v;}}return best;}
function updateUI(){
  for(const k of RES_KEYS){const e=$('r_'+k);if(e){const v=String(Math.floor(S.res[k]));if(e.textContent!==v)e.textContent=v;}}
  $('r_pop').textContent=disciples().length+'/'+popCap();
  const p=player();
  if(p){const t=`${pnm(p)}：${REALMS[p.realm].n}`+(p.realm<MAX_REALM?`（修為 ${Math.floor(p.xiu)}/${needXiu(p)}）`:'');if($('r_realm').textContent!==t)$('r_realm').textContent=t;}
  const t=Math.floor(S.time);$('r_time').textContent=(helpShown||paused?'暫停 ':'')+String(Math.floor(t/60)).padStart(2,'0')+':'+String(t%60).padStart(2,'0');
  document.querySelectorAll('#buildbar [data-b]').forEach(btn=>{const k=btn.dataset.b,lock=buildLock(k),ok=!lock&&canAfford(BUILD[k].cost);
    btn.classList.toggle('dis',!ok);btn.classList.toggle('on',buildMode===k);const why=btn.querySelector('.why');const w=lock||(canAfford(BUILD[k].cost)?'':'資源不足');if(why.textContent!==w)why.textContent=w;});
  document.body.classList.toggle('building',!!buildMode);
  document.body.classList.toggle('cantrade',!!nearestTradeVillage(8));document.body.classList.toggle('nearshrine',!!nearShrine(2.4));
  const ab=$('a_box');if(ab)ab.classList.toggle('on',boxToggle);const abd=$('a_build');if(abd)abd.classList.toggle('on',!!buildMode||$('buildbar').classList.contains('open'));
  const am=$('a_med');if(am)am.classList.toggle('on',!!(p&&p.task&&p.task.type==='meditate'));
  const as=$('a_skill');if(as){const rd=p&&p.realm>=1&&REALMS.slice(1,p.realm+1).some(R=>R.ab&&!(p.acd[R.ab]>0));as.classList.toggle('on',!!rd);}
  const bbh=$('buildbar').offsetHeight+'px';if(document.documentElement.style.getPropertyValue('--bbh')!==bbh)document.documentElement.style.setProperty('--bbh',bbh);
  const tbh=$('topbar').offsetHeight+'px';if(document.documentElement.style.getPropertyValue('--tb')!==tbh)document.documentElement.style.setProperty('--tb',tbh);
  updateObjectives();renderPanel();renderCult();renderTrade();
}

// ================== 指令 ==================
function commandUnits(){let us=selUnits.map(unitById).filter(u=>u&&!u.dead);if(!us.length){const p=player();if(p&&!p.dead)us=[p];}return us;}
// 陣形：以落點為中心排成同心圓，每人分配最近的空位
function formationSlots(tx,ty,n,c){
  const slots=[];const add=(x,y)=>{const i=Math.floor(x),j=Math.floor(y);if(inMap(i,j)&&!block[j*N+i]&&(c<0||comp[j*N+i]===c))slots.push({x,y});};
  add(tx,ty);let ring=1;while(slots.length<n&&ring<8){const cnt=ring*6,r=ring*0.8;for(let k=0;k<cnt;k++){const a=k/cnt*Math.PI*2+ring*0.3;add(tx+Math.cos(a)*r,ty+Math.sin(a)*r);}ring++;}
  return slots;
}
function commandMove(us,tx,ty,shift){
  const p=player();
  if(shift&&us.length===1&&us[0]===p){p.queue=p.queue||[];if(p.task&&p.task.type==='move'){p.queue.push({x:tx,y:ty});markers.push({x:tx,y:ty,t:0,col:'#ffe9a0'});return;}}
  if(us.length&&us[0])us.forEach(u=>{if(u===p)p.queue=[];});
  const c=us.length?unitComp(us[0]):-1;const sn=(typeof walkSnap==='function'?walkSnap(tx,ty,us[0]):null)||(function(){const f=nearestFree(tx,ty,c);return f?{x:f.i+0.5,y:f.j+0.5,i:f.i,j:f.j,snapped:!(f.i===Math.floor(tx)&&f.j===Math.floor(ty))}:null;})();
  if(!sn){toast('那裡走不到');return;}
  const cx=sn.snapped?sn.x:tx,cy=sn.snapped?sn.y:ty;
  const slots=formationSlots(cx,cy,us.length,c);
  const order=us.slice().sort((a,b)=>dist(a.x,a.y,cx,cy)-dist(b.x,b.y,cx,cy));
  for(const u of order){let bi=0,bd=1e9;for(let k=0;k<slots.length;k++){const d=dist(u.x,u.y,slots[k].x,slots[k].y);if(d<bd){bd=d;bi=k;}}const s=slots.length?slots.splice(bi,1)[0]:{x:cx,y:cy};
    if(u.kind==='disciple'&&u.job==='guard'){u.guardAt={x:s.x,y:s.y};setTask(u,null);continue;}
    if(u.kind==='disciple'){u.job=null;u.jobB=null;u.holdAt={x:s.x,y:s.y};}
    setTask(u,{type:'move',x:s.x,y:s.y});if(!pathTo(u,s.x,s.y))u.task=null;}
  markers.push({x:cx,y:cy,t:0,col:'#7dff7d'});
}
function rightClick(mx,my,shift){
  if(S.interior){interiorTap(mx,my,'move');return;}
  if(buildMode){buildMode=null;return;}
  {const sh=shrineAtScreen(mx,my);if(sh&&selUnits.includes((player()||{}).id)){goShrine(sh);return;}}
  const w=screenToWorld(mx,my),t=tileAtWorld(w),us=commandUnits();if(!us.length)return;
  const e=enemyAt(w);
  if(e){us.forEach(u=>{setTask(u,{type:'attack',eid:e.id,man:1,pack:xwAttackPack(e,u),ax:e.x,ay:e.y});});markers.push({x:e.x,y:e.y,t:0,col:'#ff5050'});return;}
  const s=structAt(w);
  if(s){const v=vById(s.vid);
    if(v&&v.type==='bandit'&&s.maxhp){us.forEach(u=>setTask(u,{type:'astruct',sid:s.id}));markers.push({x:s.i+s.s/2,y:s.j+s.s/2,t:0,col:'#ff5050'});return;}
    if(s.type==='ruinAltar'||(v&&v.type!=='bandit')){const p=player();const target=s.type==='ruinAltar'?s:tradePost(v)||s;
      if(us.includes(p)){setTask(p,{type:'interact',sid:target.id});}const rest=us.filter(u=>u!==p);if(rest.length)commandMove(rest,target.i+target.s/2,target.j+target.s+1);
      markers.push({x:target.i+target.s/2,y:target.j+target.s/2,t:0,col:'#ffe27a'});return;}}
  const n=nodeAt(w);
  if(n){if(!nodeMinable(n)){toast('靈石脈需要宗門踏入修仙階段（有人突破煉氣）才能開採');return;}
    // Use the real manual job pipeline: direct field writes leave an old stand/move/train lock active.
    let accepted=0,refused=0;
    us.forEach(u=>{if(u.kind==='disciple'&&!u.np){if(assignJob(u,'gather',(typeof nodeResOf==='function'?nodeResOf(n):NODE_RES[n.type]))){u.jnode=n.id;accepted++;try{u.xcmd={kind:'gather',t0:S.time,until:S.time+((TUNE.xn&&(TUNE.xn.gatherCmd||TUNE.xn.mvMax))||45)};u.holdT=S.time;}catch(err){}}else refused++;}else{setTask(u,{type:'gather',nodeId:n.id});accepted++;}});
    if(accepted)markers.push({x:n.i+0.5,y:n.j+0.5,t:0,col:'#ffe27a'});
    if(refused)toast(`${refused} 名弟子未能接下採集指令，請確認目前狀態與採集條件`);return;}
  const b=buildingAt(w);
  if(b&&(!b.built||b.upg)){us.forEach(u=>setTask(u,{type:'build',bid:b.id}));markers.push({x:b.i+1,y:b.j+1,t:0,col:'#7fd0ff'});return;}
  if(b&&b.hp<b.maxhp){us.forEach(u=>setTask(u,{type:'repair',bid:b.id}));markers.push({x:b.i+1,y:b.j+1,t:0,col:'#7fd0ff'});return;}
  if(b&&JOB_OF[b.type]&&b.built&&!b.broken){const ds=us.filter(u=>u.kind==='disciple'&&!u.np);if(ds.length){let n=0;ds.forEach(u=>{if(assignJob(u,JOB_OF[b.type],{bid:b.id}))n++;});if(n)toast(`${n} 名弟子前往${roomName(b)}${INJOB[JOB_OF[b.type]].label}`);if(us.length===1||n)return;}}
  if(b&&canEnter(b)&&us.includes(player())){goEnter(b);return;}
  commandMove(us,clamp(t.x,0.3,N-0.3),clamp(t.y,0.3,N-0.3),shift);
}
function leftClick(mx,my,shift){
  if(S.interior){interiorTap(mx,my,'look');return;}
  const w=screenToWorld(mx,my);
  const u=unitAt(w,S.units,14);
  if(u&&!shift&&selUnits.length===1&&selUnits[0]===u.id){const bb=buildingAt(w);if(bb){selBuilding=bb.id;selUnits=[];return;}}
  if(u){selBuilding=null;selOther=null;if(shift){selUnits=selUnits.includes(u.id)?selUnits.filter(i=>i!==u.id):selUnits.concat(u.id);}else selUnits=[u.id];return;}
  const b=buildingAt(w);if(b){selBuilding=b.id;selUnits=[];selOther=null;return;}
  const wd=wandAt(w);if(wd){selOther={k:'w',id:wd.id};selUnits=[];selBuilding=null;return;}
  const e=enemyAt(w);if(e){selOther={k:'e',id:e.id};selUnits=[];selBuilding=null;return;}
  const s=structAt(w);if(s){selOther={k:'s',id:s.id};selUnits=[];selBuilding=null;return;}
  const n=nodeAt(w),p=player();
  if(n&&p&&!p.dead&&distRect(p.x,p.y,n.i,n.j,1)<2.2&&nodeMinable(n)){setTask(p,{type:'gather',nodeId:n.id});markers.push({x:n.i+0.5,y:n.j+0.5,t:0,col:'#ffe27a'});return;}
  if(n){selOther={k:'n',id:n.id};selUnits=[];selBuilding=null;return;}
  if(!shift){selUnits=[];selBuilding=null;selOther=null;}
}
function boxSelect(x0,y0,x1,y1,shift){
  const ax=Math.min(x0,x1),bx=Math.max(x0,x1),ay=Math.min(y0,y1),by=Math.max(y0,y1);const ids=[];
  for(const u of S.units){if(u.dead||u.inside)continue;const p=iso(u.x,u.y),s=worldToScreen(p.x,p.y-12);if(s.x>=ax&&s.x<=bx&&s.y>=ay&&s.y<=by)ids.push(u.id);}
  const ds=ids.filter(id=>unitById(id).kind==='disciple');const pk=ds.length?ds:ids;
  selUnits=shift?Array.from(new Set(selUnits.concat(pk))):pk;selBuilding=null;selOther=null;
}
function playerInteract(){
  const p=player();if(!p||p.dead)return;if(S.interior){interiorInteract();return;}
  {const sh=nearShrine(2.2);if(sh){openShrine(sh);return;}}
  let bb=null,bd=1.6;for(const b of S.buildings){if(b.built&&b.hp>=b.maxhp)continue;const d=distRect(p.x,p.y,b.i,b.j,BUILD[b.type].size);if(d<bd){bd=d;bb=b;}}
  if(bb){setTask(p,{type:bb.built&&!bb.upg?'repair':'build',bid:bb.id});return;}
  const v=nearestTradeVillage(3);if(v){openTrade(v.id);return;}
  for(const s of S.vstructs)if(s.type==='ruinAltar'&&distRect(p.x,p.y,s.i,s.j,s.s)<2.5){interactStruct(s);return;}
  // 手把 A／鍵盤 V：靠近可進入建築的大門時走既有 goEnter（近則立刻進，稍遠則走到門再開門）
  let eb=null,ed=2.4;for(const b of S.buildings){if(typeof canEnter==='function'&&!canEnter(b))continue;const D=typeof doorPt==='function'?doorPt(b):null;if(!D)continue;const d=dist(p.x,p.y,D.x,D.y);if(d<ed){ed=d;eb=b;}}
  if(eb&&typeof goEnter==='function'){goEnter(eb);return;}
  let nn=null,nd=1.8;const i0=Math.floor(p.x),j0=Math.floor(p.y);
  for(let j=j0-2;j<=j0+2;j++)for(let i=i0-2;i<=i0+2;i++){if(!inMap(i,j))continue;const n=nodeGrid[j*N+i];if(!n||n.gone||!nodeMinable(n))continue;const d=distRect(p.x,p.y,n.i,n.j,1);if(d<nd){nd=d;nn=n;}}
  if(nn){setTask(p,{type:'gather',nodeId:nn.id});return;}
  toast('附近沒有可互動的東西（走到資源、工地、受損建築、可進入建築的大門或交易所旁再按'+(isTouchUI?'「採集」':(function(){try{if(typeof CFG173!=='undefined'&&CFG173.pad&&typeof XW_PLAT!=='undefined'&&XW_PLAT.pads&&XW_PLAT.pads()[0])return ' A';}catch(e){}return ' V';})())+'）');
}
function toggleMeditate(){const p=player();if(!p||p.dead)return;if(p.task&&p.task.type==='meditate'){setTask(p,null);toast('結束打坐');return;}
  if(nearestEnemy(p.x,p.y,5)){toast('附近有敵人，無法靜心打坐');return;}if(p.realm>=MAX_REALM){toast('已達本版本最高境界');}
  setTask(p,{type:'meditate'});toast('盤膝打坐，吸納天地之氣（在武道館、練武閣旁更快）');}
function castSkill(){const p=player();if(!p||p.dead)return;if(S.interior){toast('室內不能施放技能');return;}
  if(p.realm<1){toast('突破「武師」後才會領悟第一個技能「衝鋒」');return;}
  const e=nearestEnemy(p.x,p.y,6.5);
  if(!e){if(hasAb(p,'guard')&&!(p.acd.guard>0)){tryAbilities(p,{x:p.x,y:p.y,r:0.3},true);return;}toast('附近沒有敵人');return;}
  if(!tryAbilities(p,e,true)){const cds=REALMS.slice(1,p.realm+1).filter(R=>R.ab).map(R=>`${(typeof abilName==='function'?abilName(p,R.ab):ABIL[R.ab].n)} ${p.acd[R.ab]>0?Math.ceil(p.acd[R.ab])+'秒':'（距離不合）'}`);toast('技能：'+cds.join('、'));}}

// ================== 輸入（滑鼠＋鍵盤＋觸控）==================
function setHelp(v){helpShown=v;$('help').classList.toggle('hide',!v);}
function setTouchUI(v){if(isTouchUI===v&&document.body.classList.contains(v?'touch':'pc'))return;isTouchUI=v;document.body.classList.toggle('touch',v);document.body.classList.toggle('pc',!v);if(!v){joy.x=joy.y=0;boxToggle=false;}chunkMemMax=v?48e6:128e6;resize();panelKeyCache=null;}
function openBuildMenu(){$('buildbar').classList.add('open');}
function closeBuildMenu(){$('buildbar').classList.remove('open');}
function toggleBuildMenu(){if(buildMode){buildMode=null;return;}$('buildbar').classList.toggle('open');}
function cancelAll(){buildMode=null;closeBuildMenu();selUnits=[];selBuilding=null;selOther=null;boxToggle=false;mouse.box=false;closeOverlays();}
function focusPlayer(){const p=player();cam.follow=true;if(p&&!p.dead){selUnits=[p.id];selBuilding=null;selOther=null;}}
function doSave(){openSaves('save');}
function doLoad(){openSaves('load');}
function doNew(){backToTitle();}
$('help').addEventListener('click',ev=>{if(ev.target.closest('.box')&&!ev.target.closest('[data-close]'))return;setHelp(false);});
function setMenu(v){document.body.classList.toggle('menuopen',v);$('b_menu').classList.toggle('on',v);}
function menuDo(f){return ()=>{setMenu(false);f();};}
function toggleCult(){if($('cult').classList.contains('open'))closeCult();else openCult();}
function tradeKeyAct(){const v=nearestTradeVillage(8);if(v){openTrade(v.id);return;}if(tradeOpen!=null){closeTrade();return;}
  const p=player();let best=null,bd=1e9;for(const vv of S.villages){if(vv.type==='bandit'||!isExplored(vv.x,vv.y))continue;const d=dist(p.x,p.y,vv.x,vv.y);if(d<bd){bd=d;best=vv;}}
  if(best)openTrade(best.id);else toast('還沒發現可交易的村莊（西北方有青禾村）');}
const BTN={b_tutpc:()=>tutStart(),b_guide:()=>toggleGuide(),b_guidepc:()=>toggleGuide(),b_help:()=>setHelp(!helpShown),b_save:doSave,b_load:doLoad,b_new:doNew,b_cult:toggleCult,b_cultpc:toggleCult,b_bigmap:()=>setMMBig(!mmBig),mmclose:()=>setMMBig(false),
  b_menu:()=>setMenu(!document.body.classList.contains('menuopen')),b_roster:()=>toggleRoster(),b_rosterpc:()=>{setMenu(false);toggleRoster();},
  b_map:()=>{const off=document.body.classList.toggle('nomap');$('b_map').classList.toggle('on',!off);},
  m_help:menuDo(()=>setHelp(true)),m_tut:menuDo(()=>tutStart()),m_guide:menuDo(()=>toggleGuide(true)),m_save:menuDo(doSave),m_load:menuDo(doLoad),m_new:menuDo(doNew),m_quick:menuDo(quickSave),a_shrine:()=>{const s=nearShrine(2.4);if(s)openShrine(s);},
  a_gather:()=>playerInteract(),a_build:()=>toggleBuildMenu(),a_all:()=>{selUnits=disciples().filter(u=>!u.inside).map(u=>u.id);selBuilding=null;selOther=null;if(!selUnits.length)toast('還沒有弟子');},
  a_home:focusPlayer,a_box:()=>{boxToggle=!boxToggle;toast(boxToggle?'框選模式：單指拖曳即可框選弟子':'已關閉框選模式');},a_cancel:cancelAll,
  a_skill:castSkill,a_med:toggleMeditate,a_trade:tradeKeyAct,
  c_ok:()=>{if(buildMode)tryPlace(false);},c_no:()=>{buildMode=null;}};
for(const id in BTN){const el=$(id);if(!el)continue;el.addEventListener('click',ev=>{ev.preventDefault();BTN[id]();});}
document.addEventListener('contextmenu',ev=>ev.preventDefault());
document.addEventListener('dblclick',ev=>ev.preventDefault(),{passive:false});
['gesturestart','gesturechange','gestureend'].forEach(t=>document.addEventListener(t,ev=>ev.preventDefault(),{passive:false}));
document.addEventListener('touchmove',ev=>{if(!ev.target.closest('.scroll'))ev.preventDefault();},{passive:false});
addEventListener('pointerdown',ev=>{if(document.body.classList.contains('menuopen')&&!ev.target.closest('#menuPop,#b_menu'))setMenu(false);},true);
addEventListener('pointerdown',ev=>{if(ev.pointerType==='touch'||ev.pointerType==='pen')setTouchUI(true);else if(ev.pointerType==='mouse')setTouchUI(false);},true);
// 大地圖開著時，點地圖以外的地方就關閉
addEventListener('pointerdown',ev=>{if(mmBig&&!ev.target.closest('#minimap,#mmclose,#mapstp'))setMMBig(false);},true);

// ---- 滑鼠 ----
function mouseDown(ev){
  mouse.x=ev.clientX;mouse.y=ev.clientY;
  if(ev.button===0){mouse.down=!buildMode;mouse.sx=ev.clientX;mouse.sy=ev.clientY;mouse.box=false;if(buildMode){ghostAt={x:ev.clientX,y:ev.clientY};tryPlace(ev.shiftKey);}}
  else if(ev.button===2)rightClick(ev.clientX,ev.clientY,ev.shiftKey);
}
addEventListener('pointermove',ev=>{if(ev.pointerType!=='mouse')return;mouse.x=ev.clientX;mouse.y=ev.clientY;mouse.inside=ev.target===cv;
  if(buildMode&&!isTouchUI)ghostAt={x:ev.clientX,y:ev.clientY};if(mouse.down&&Math.hypot(mouse.x-mouse.sx,mouse.y-mouse.sy)>6)mouse.box=true;});
addEventListener('pointerup',ev=>{if(ev.pointerType!=='mouse'||ev.button!==0||!mouse.down)return;
  if(mouse.box)boxSelect(mouse.sx,mouse.sy,mouse.x,mouse.y,ev.shiftKey);else leftClick(mouse.x,mouse.y,ev.shiftKey);mouse.down=false;mouse.box=false;});
cv.addEventListener('wheel',ev=>{
  // 20261106e：金手指／對話框開啟時不要搶滾輪（否則長列表滾不動）
  try{const dbg=document.getElementById('x47dbg');if(dbg&&dbg.style.display==='block')return;}catch(e){}
  try{if(document.body.classList.contains('x47dbgopen'))return;}catch(e){}
  ev.preventDefault();zoomAt(ev.clientX,ev.clientY,ev.deltaY<0?1.1:1/1.1);},{passive:false});
function zoomAt(x,y,f){const before=screenToWorld(x,y);cam.zoom=clamp(cam.zoom*f,0.5,2.2);const after=screenToWorld(x,y);cam.x+=before.x-after.x;cam.y+=before.y-after.y;}

// ---- 觸控（畫布）----
const tps=new Map();let ts=null;
function tpArr(){return Array.from(tps.values());}
cv.addEventListener('pointerdown',ev=>{
  if(ev.pointerType==='mouse'){mouseDown(ev);return;}
  ev.preventDefault();try{cv.setPointerCapture(ev.pointerId);}catch(e){}
  tps.set(ev.pointerId,{x:ev.clientX,y:ev.clientY});
  if(tps.size===1){ts={mode:boxToggle?'box':'pending',sx:ev.clientX,sy:ev.clientY,lx:ev.clientX,ly:ev.clientY,t0:performance.now()};
    if(ts.mode==='box'){mouse.sx=mouse.x=ev.clientX;mouse.sy=mouse.y=ev.clientY;mouse.box=true;}
    clearTimeout(ts.lp);ts.lp=setTimeout(()=>{if(ts&&ts.mode==='pending'&&!buildMode){const w=screenToWorld(ts.lx,ts.ly);const e=enemyAt(w);const s=structAt(w);const band=s&&s.maxhp&&(()=>{const v=vById(s.vid);return v&&v.type==='bandit';})();
      if(e||band){ts.mode='atk';rightClick(ts.lx,ts.ly,false);if(navigator.vibrate)try{navigator.vibrate(18);}catch(e){}return;}
      ts.mode='box';mouse.sx=mouse.x=ts.lx;mouse.sy=mouse.y=ts.ly;mouse.box=true;if(navigator.vibrate)try{navigator.vibrate(15);}catch(e){}}},420);}
  else if(tps.size===2&&ts){clearTimeout(ts.lp);mouse.box=false;const [a,b]=tpArr();ts.mode='pinch';ts.pd=Math.hypot(a.x-b.x,a.y-b.y);ts.mx=(a.x+b.x)/2;ts.my=(a.y+b.y)/2;}
},{passive:false});
cv.addEventListener('pointermove',ev=>{
  if(ev.pointerType==='mouse'||!tps.has(ev.pointerId)||!ts)return;ev.preventDefault();tps.set(ev.pointerId,{x:ev.clientX,y:ev.clientY});
  if(ts.mode==='pinch'&&tps.size>=2){const [a,b]=tpArr(),d=Math.hypot(a.x-b.x,a.y-b.y),mx=(a.x+b.x)/2,my=(a.y+b.y)/2;if(ts.pd>10)zoomAt(mx,my,d/ts.pd);cam.x-=(mx-ts.mx)/cam.zoom;cam.y-=(my-ts.my)/cam.zoom;cam.follow=false;ts.pd=d;ts.mx=mx;ts.my=my;return;}
  const x=ev.clientX,y=ev.clientY;
  if(ts.mode==='pending'&&Math.hypot(x-ts.sx,y-ts.sy)>12){ts.mode='pan';clearTimeout(ts.lp);}
  if(ts.mode==='pan'){cam.x-=(x-ts.lx)/cam.zoom;cam.y-=(y-ts.ly)/cam.zoom;cam.follow=false;}else if(ts.mode==='box'){mouse.x=x;mouse.y=y;}
  ts.lx=x;ts.ly=y;
},{passive:false});
function touchEnd(ev){
  if(ev.pointerType==='mouse'||!tps.has(ev.pointerId))return;tps.delete(ev.pointerId);if(!ts)return;
  if(tps.size===0){clearTimeout(ts.lp);
    if(ev.type==='pointerup'){if(ts.mode==='pending')tapAt(ev.clientX,ev.clientY);
      else if(ts.mode==='atk'){/* 長按已下令攻擊 */}
      else if(ts.mode==='box'&&mouse.box){if(Math.hypot(mouse.x-mouse.sx,mouse.y-mouse.sy)>8)boxSelect(mouse.sx,mouse.sy,mouse.x,mouse.y,false);else tapAt(ev.clientX,ev.clientY);}}
    mouse.box=false;ts=null;}
  else if(ts.mode==='pinch'){ts.mode='done';}
}
cv.addEventListener('pointerup',touchEnd);cv.addEventListener('pointercancel',touchEnd);
function tapAt(x,y){
  if(S.interior){interiorTap(x,y,'move');return;}
  if(buildMode){const prev=ghostOrigin();ghostAt={x,y};const now=ghostOrigin();if(prev.i===now.i&&prev.j===now.j)tryPlace(false);return;}
  {const sh=shrineAtScreen(x,y);const pl=player();if(sh&&pl&&!pl.dead&&!unitAt(screenToWorld(x,y),S.units,14)){goShrine(sh);return;}}
  const w=screenToWorld(x,y);const u=unitAt(w,S.units,14);const b=buildingAt(w);
  if(u&&b&&selUnits.length===1&&selUnits[0]===u.id){selBuilding=b.id;selUnits=[];return;}
  if(u){selBuilding=null;selOther=null;selUnits=[u.id];return;}
  {const wd=wandAt(w);if(wd){selOther={k:'w',id:wd.id};selUnits=[];selBuilding=null;return;}}
  const sel=selUnits.map(unitById).filter(v=>v&&!v.dead);
  const e=enemyAt(w),s=structAt(w);
  // 短點敵人／敵方山寨＝只開觀察（清掉單位選取，否則面板仍顯示弟子／自己）；攻擊改由右鍵／長按
  if(e){selOther={k:'e',id:e.id};selUnits=[];selBuilding=null;panelKeyCache=null;return;}
  if(s){const v=vById(s.vid);if(v&&v.type==='bandit'&&s.maxhp){selOther={k:'s',id:s.id};selUnits=[];selBuilding=null;panelKeyCache=null;return;}
    if(sel.length&&(s.type==='trade'||s.type==='ruinAltar')){rightClick(x,y,false);return;}}
  if(b){if(sel.length&&(!b.built||b.upg||b.hp<b.maxhp||JOB_OF[b.type]&&b.built&&sel.some(v=>v.kind==='disciple'))){rightClick(x,y,false);return;}selBuilding=b.id;selUnits=[];selOther=null;return;}
  if(sel.length){rightClick(x,y,false);return;}
  if(s){selOther={k:'s',id:s.id};return;}
  leftClick(x,y,false);
}
// ---- 虛擬搖桿（死區 0.15、推越遠越快）----
const joyEl=$('joy'),knob=$('joyKnob');let joyId=null;
function joyUpdate(ev){const r=joyEl.getBoundingClientRect(),cx=r.left+r.width/2,cy=r.top+r.height/2,R=r.width/2;
  let dx=(ev.clientX-cx)/R,dy=(ev.clientY-cy)/R;const l=Math.hypot(dx,dy);if(l>1){dx/=l;dy/=l;}joy.x=dx;joy.y=dy;knob.style.transform=`translate(${dx*R*0.6}px,${dy*R*0.6}px)`;}
joyEl.addEventListener('pointerdown',ev=>{ev.preventDefault();joyId=ev.pointerId;try{joyEl.setPointerCapture(ev.pointerId);}catch(e){}joy.active=true;joyUpdate(ev);cam.follow=true;},{passive:false});
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
  if(c==='Slash'||ev.key==='?'){toggleGuide();return;}
  if(c==='Escape'){if(helpShown)setHelp(false);else if(guideOpen)toggleGuide(false);else if(kickPending!=null||confirmCb)closeKick();else if(recOpen)toggleRec(false);else if(rosterOpen)toggleRoster(false);else if(S.interior)exitInterior(false);else if(mmBig||tradeOpen!=null||$('cult').classList.contains('open'))closeOverlays();else if(buildMode)buildMode=null;else{selUnits=[];selBuilding=null;selOther=null;}return;}
  if(helpShown)return;
  if(keyV045(ev,c))return;
  const dk=(ev.shiftKey||((buildMode||(isTouchUI&&document.getElementById('buildbar')&&document.getElementById('buildbar').classList.contains('open')))&&!ev.ctrlKey&&!ev.altKey))&&/^(Digit|Numpad)([0-9])$/.exec(c);// #196：Shift＋數字，或建造模式／建造清單開著時直接按數字＝選建築
  if(dk&&S.interior)return;
  if(dk){ghostAt={x:mouse.x,y:mouse.y};const bk=+dk[2]===0?'cangku':BUILD_ORDER[+dk[2]-1];if(BUILD[bk])enterBuild(bk);return;}
  if(c==='KeyB'){
    const tg=ev.target;if(tg&&(/^(INPUT|TEXTAREA|SELECT)$/.test(tg.tagName)||tg.isContentEditable))return;
    if(S.interior){toast('先離開建築才能建造');return;}
    if(buildMode){buildMode=null;return;}
    // B 一律開／關建造選單（含尚未蓋宗門大殿），不再進入放置模式或連動組隊
    if(typeof xwBbToggle==='function'){xwBbToggle();return;}
    if(typeof toggleBuildMenu==='function'){toggleBuildMenu();return;}
    return;}
  else if(c==='KeyQ'||c==='KeyE'||c==='KeyR'||c==='KeyT'){if(typeof v158Key==='function')v158Key('QERT'.indexOf(c[3]));else castSkill();}// #196：技能 Q E R T（W 留給移動）
  else if(/^Digit[1-6]$/.test(c)){const d=+c[5];if(typeof v158Key==='function')v158Key(3+d);}/* #196：數字 1～6＝技能第 5～10 格（共 10 格） */else if(c==='KeyV')playerInteract();else if(c==='KeyF'||c==='KeyG')castSkill();else if(c==='KeyZ')toggleMeditate();
  else if(c==='KeyC')toggleCult();else if(c==='KeyN')tradeKeyAct();else if(c==='KeyM')setMMBig(!mmBig);else if(c==='KeyO'){if(typeof econSectToggle==='function')econSectToggle();}
  else if(c==='KeyJ')toggleRoster();else if(c==='KeyY'&&!S.interior)BTN.a_all();else if(c==='KeyK')doSave();else if(c==='KeyL')doLoad();else if(c==='Space'||c==='Home'){cam.follow=true;cam.pan=0;}
});
addEventListener('keyup',ev=>{keys[ev.code]=false;});
addEventListener('blur',()=>{for(const k in keys)keys[k]=false;joy.x=joy.y=0;});
document.addEventListener('visibilitychange',()=>{paused=document.hidden;for(const k in keys)keys[k]=false;last=performance.now();});

/*@@DEBUGPWA@@*/
// PWA：新版 Service Worker 接管後，僅在標題畫面自動 reload；遊戲中改 toast，避免第一次進遊被踢回主選單
(function(){if(!(window.__XW_PWA__&&'serviceWorker' in navigator))return;
  let reloading=false;
  function onTitle(){
    try{
      // 載入遮罩／標題畫面：允許因新 SW 重整；一旦進遊戲則絕不強制 reload
      if(document.getElementById('xwboot')&&!document.getElementById('xwboot').classList.contains('hide'))return true;
      if(document.body&&document.body.classList.contains('xwbooting'))return true;
      if(typeof titleOpen!=='undefined'&&titleOpen)return true;
      const b=document.body;
      if(b&&b.classList.contains('titleopen'))return true;
      if(b&&!b.classList.contains('ingame'))return true;
    }catch(e){}
    return false;
  }
  navigator.serviceWorker.addEventListener('controllerchange',()=>{
    if(reloading)return;
    try{if(sessionStorage.getItem('xw_sw_rl')==='1')return;}catch(e){}
    // 遊戲進行中：不強制重整（第一次安裝／升級都會觸發 controllerchange）
    if(!onTitle()){
      try{if(typeof toast==='function')toast('有新版本可用，回標題後重新整理即可');}catch(e){}
      return;
    }
    reloading=true;
    try{sessionStorage.setItem('xw_sw_rl','1');}catch(e){}
    location.reload();
  });
  addEventListener('load',()=>{
    try{if(navigator.serviceWorker.controller)sessionStorage.removeItem('xw_sw_rl');}catch(e){}
    try{navigator.serviceWorker.getRegistration().then(r=>{if(r&&r.update)r.update();}).catch(()=>{});}catch(e){}
  });
})();

// ================== 主迴圈 ==================
let ALL=[];
function update(dt){
  if(S.dg){dgUpdate(dt);return;}
  S.time+=dt;
  const ct=unIso(cam.x,cam.y);
  ALL=[];for(const u of S.units)if(!u.dead&&!u.inside)ALL.push(u);for(const e of S.enemies)ALL.push(e);for(const n of S.npcs)ALL.push(n);for(const w of S.wand)ALL.push(w);
  nbBuild(ALL);
  for(const u of S.units.slice())updateUnit(u,dt);
  for(const e of S.enemies.slice())updateEnemy(e,dt,ct);
  for(const n of S.npcs)updateVillager(n,dt,ct);
  for(const w of S.wand.slice())updateWanderer(w,dt,ct);
  nbBuild(ALL);separate(ALL);
  updateProjectiles(dt);
  for(const f of effects)f.t+=dt;effects=effects.filter(f=>f.t<f.dur);
  updateSect(dt);
  villageTimer+=dt;if(villageTimer>=0.5){updateVillages(villageTimer);villageTimer=0;}
  updateRaids(dt);updateSpawns(dt);
  tickAutosave(dt);visionTimer+=dt;if(visionTimer>=0.25){visionTimer=0;tickShrines();let ch=false;for(const u of S.units)if(!u.dead)ch=reveal(u.x,u.y,u.kind==='player'?9:6)||ch;for(const b of S.buildings)if(b.built)ch=reveal(b.i+1,b.j+1,5)||ch;if(ch)mmDirty=true;}
  tickV033(dt);tickV040(dt);tickV045(dt);
  secTimer+=dt;if(secTimer>=0.5){secTimer=0;checkObjectives();}
  for(const f of floaters)f.t+=dt;floaters=floaters.filter(f=>f.t<1.4);
  for(const m of markers)m.t+=dt;markers=markers.filter(m=>m.t<0.9);
  for(const g of pings)g.t+=dt;pings=pings.filter(g=>g.t<g.dur);
}
function updateCamera(dt){
  const p=player(),sp=600*dt/cam.zoom;
  // #195 方向鍵＝依畫面方向平滑平移鏡頭（速度隨縮放調整），平移時鏡頭不跟隨主角；WASD／搖桿移動主角時才慢慢回到主角；空白鍵／Home 立即回主角
  {const ax=(keys.ArrowRight?1:0)-(keys.ArrowLeft?1:0),ay=(keys.ArrowDown?1:0)-(keys.ArrowUp?1:0),k=1-Math.exp(-14*dt);
    cam.pvx=(cam.pvx||0)+(ax*sp-(cam.pvx||0))*k;cam.pvy=(cam.pvy||0)+(ay*sp-(cam.pvy||0))*k;
    if(ax||ay){cam.follow=false;cam.pan=1;}
    if(Math.abs(cam.pvx)>0.01||Math.abs(cam.pvy)>0.01){cam.x+=cam.pvx;cam.y+=cam.pvy;}else{cam.pvx=cam.pvy=0;}
    const mv=keys.KeyW||keys.KeyA||keys.KeyS||keys.KeyD||(joy.active&&Math.hypot(joy.x||0,joy.y||0)>0.3);
    if(!ax&&!ay&&mv&&cam.pan){cam.follow=true;cam.pan=0;}
    if(cam.pan){const hx=N*HW,hy=N*HH,dy=cam.y-hy,e=Math.abs(cam.x)/hx+Math.abs(dy)/hy;if(e>1){cam.x/=e;cam.y=hy+dy/e;}}}
  if(cam.follow&&p&&!p.dead){const q=iso(p.x,p.y);const k=1-Math.exp(-8*dt);cam.x+=(q.x-cam.x)*k;cam.y+=(q.y-20-cam.y)*k;}
  cam.x=clamp(cam.x,-N*HW,N*HW);cam.y=clamp(cam.y,0,N*TH);
  // 鏡頭速度（世界像素/秒，平滑）→ 預先畫前方區塊；也用來判斷「正在移動」
  if(dt>0){const vx=(cam.x-(cam.px??cam.x))/dt,vy=(cam.y-(cam.py??cam.y))/dt;cam.vx=(cam.vx||0)*0.8+vx*0.2*0.5;cam.vy=(cam.vy||0)*0.8+vy*0.2*0.5;}
  if(Math.abs(cam.x-(cam.px??cam.x))>0.05||Math.abs(cam.y-(cam.py??cam.y))>0.05||cam.zoom!==cam.pz)camMovedAt=performance.now();
  cam.px=cam.x;cam.py=cam.y;cam.pz=cam.zoom;
}
let camMovedAt=0;
let last=performance.now();const frameTimes=[];
function frame(now){
  const raw=now-last,dt=Math.min(0.05,raw/1000);last=now;
  if(raw>0&&raw<1000){frameTimes.push(raw);if(frameTimes.length>240)frameTimes.shift();fpsAvg=fpsAvg*0.95+(1000/raw)*0.05;}
  // 自適應畫質：連續 1.5 秒平均低於 45fps 就降低內部解析度（最低 0.55），高於 57fps 再慢慢升回
  // v0.3.3 自適應畫質（加遲滯＋冷卻）：每 2 秒一個量測窗；連續 2 窗 <40fps 才降一級，連續 4 窗 >58fps 且鏡頭靜止才升一級；
  // 每次改變後冷卻 10 秒；最多升回 2 次（避免來回跳動造成「一閃一閃」）；只在鏡頭／主角靜止時才真正改解析度
  if(raw>0&&raw<1000){qT+=raw;qN++;if(qT>2000){const f=1000*qN/qT;qT=0;qN=0;const t=performance.now(),still=t-camMovedAt>700;
    qLow=f<40?qLow+1:0;qHigh=f>58?qHigh+1:0;let ns=qScale;
    if(t>qCool&&still){if(qLow>=2&&qScale>0.6){ns=Math.max(0.6,qScale-0.2);qDowns++;}else if(qHigh>=4&&qScale<1&&qUps<2){ns=Math.min(1,qScale+0.2);qUps++;}}
    if(ns!==qScale){qScale=ns;qCool=t+10000;qLow=qHigh=0;resize();}}}
  try{
    if(paused){requestAnimationFrame(frame);return;}
    if(!helpShown&&!uiBlock())update(dt);
    updateCamera(dt);draw();
    mmTimer-=dt;if(mmTimer<=0){mmTimer=mmBig?0.15:0.3;drawMinimap();}
    uiTimer-=dt;if(uiTimer<=0){uiTimer=0.2;updateUI();}
    tickV040b(dt);frameV045(dt);
  }catch(err){console.error(err);}
  requestAnimationFrame(frame);
}
setTouchUI(isTouchUI);if(isTouchUI)cam.zoom=1.0;chunkMemMax=isTouchUI?48e6:128e6;initBuildBar();newGame();updateUI();resize();
setHelp(false);showTitle(true);
migrateLegacy().then(()=>renderTitle()).catch(e=>console.warn(e));
// 聯機：QWER 技能轉給主機施放（net 層 netFwd 已在前面定義；v158Cast 只接受技能 id 字串）
try{if(typeof netFwd==='function'&&typeof v158NetCast==='function')v158NetCast=netFwd('v158Cast',v158NetCast,undefined,{max:3,chk:a=>typeof a[0]==='string'&&a[0].length<=12&&(a.length===1||(a.length===3&&typeof a[1]==='number'&&typeof a[2]==='number'&&isFinite(a[1])&&isFinite(a[2])&&Math.abs(a[1])<1e4&&Math.abs(a[2])<1e4))});}catch(e){console.warn(e);}
requestAnimationFrame(frame);
// 測試用（不影響遊戲）
function fpsStats(){const a=frameTimes.slice().sort((x,y)=>x-y);if(!a.length)return null;const avg=a.reduce((s,v)=>s+v,0)/a.length;return {fps:1000/avg,p95ms:a[Math.floor(a.length*0.95)],n:a.length};}
window.XW={ver:XW_VER,xwBootDone:(typeof xwBootDone==="function"?xwBootDone:null),get titleOpen(){return titleOpen;},get deathOpen(){return deathOpen;},showTitle,titleNew,titleContinue,openSaves,closeSaves,renderSaves,listSlots:()=>{slotCache=null;return listSlots();},writeSlot,loadSlot,autoSave,quickSave,quickLoad,exportText,importText,migrateLegacy,shrines,shrineById,openShrine,closeShrine,shrineRest,shrineTravel,goShrine,nearShrine,revive,deathShow,regionName,storeDel,dlgClose,get dlgOpen(){return dlgOpen;},get idb(){return !!idb;},settings,uiBlock,dbgText,setDebug,placementValid,resize,get W(){return W;},get H(){return H;},joy,tapAt,get touch(){return isTouchUI;},get paused(){return paused;},get S(){return S;},player,disciples,update,saveGame,loadGame,newGame,enterBuild,recruit,bById,vById,sById,iso,worldToScreen,screenToWorld,cam,get sel(){return selUnits;},set sel(v){selUnits=v;},setHelp,
  commandMove,assignJob,tryBreak,breakConds,openTrade,doTrade,acceptQuest,completeQuest,openCult,closeOverlays,setMMBig,rightClick,
  forceRaid:(vid)=>{const v=vid?vById(vid):S.villages.find(v=>v.type==='bandit'&&!v.destroyed);v.raidT=S.time+TUNE.raidWarn+0.5;v.warned=false;},
  revealAll:()=>{explored.fill(1);resetFog();mmDirty=true;},teleport:(x,y)=>{const p=player();p.x=x;p.y=y;p.path=[];p.task=null;if(p.queue)p.queue.length=0;p.vx=p.vy=0;const q=iso(x,y);cam.x=q.x;cam.y=q.y;},
  spawnEnemy:(type,x,y,o)=>{const e=makeEnemy(type,x,y,o);S.enemies.push(e);return e;},fpsStats,get fpsAvg(){return fpsAvg;},get villages(){return S.villages;},
  get ANCH(){return ANCH;},get NODES(){return NODES;},nearestFree,pathTo,astar,get astarCalls(){return astarCalls;},get chunkRenders(){return chunkRenders;},get drawCount(){return lastDrawCount;},
  blockedP,compAt,get startComp(){return startComp;},completeBuilding,spawnDisciple,tradeOffer,nearVillage,drawMinimap,get mmBig(){return mmBig;},castSkill,toggleMeditate,
  freeSpot:(type,cx,cy)=>{const s=BUILD[type].size;for(let r=0;r<30;r++)for(let dj=-r;dj<=r;dj++)for(let di=-r;di<=r;di++){if(Math.max(Math.abs(di),Math.abs(dj))!==r)continue;const i=Math.floor(cx)+di,j=Math.floor(cy)+dj;if(placementValid(type,i,j))return {i,j};}return null;},
  get qScale(){return qScale;},get resizeCount(){return resizeCount;},get canvasResizeCount(){return canvasResizeCount;},get chunkMem(){return chunkMem;},get chunkCount(){return chunkCache.size;},get chunkMissFrames(){return chunkMissFrames;},get chunkLod(){return chunkLastLod;},
  tutStart,tutEnd,tutAdvance,tutTick,get tut(){return S.tut;},get tutSteps(){return TUT.map(s=>s.k);},toggleGuide,get guideOpen(){return guideOpen;},showTip,closeTip,tipText,get TF(){return TF;},
  startUpgrade,finishUpgrade,demolish,askDemolish,demoRefund,invested,upCost,blv,lvSlots,lvPop,popCap,showConfirm,
  kickDisciple,askKick,closeKick,spawnBatch,acceptCand,dismissCands,refreshCands,openRec,toggleRec,renderRec,candToWanderer,wooWanderer,giftWanderer,joinFaction,makeWanderer,addWanderer,regrowNode,tickNodes,wandById,wandAt,rollBody4,removeNode,
  get recOpen(){return recOpen;},get kickPending(){return kickPending;},compSize,selB:(id)=>{selBuilding=id;selOther=null;selUnits=[];panelKeyCache=null;},get selBuilding(){return selBuilding;},get selOther(){return selOther;},BODIES,lvEffect,get demos(){return demos.length;},
  snapshot,applySave,enterInterior,exitInterior,goEnter,occupants,toggleRoster,renderRoster,locateUnit,doorPt,interiorTap,jobSlots,get interior(){return S.interior;},get rosterOpen(){return rosterOpen;},TUNE,INJOB,JOB_OF,get IT(){return IT;},
  pickAt:(x,y)=>{const w=screenToWorld(x,y);return !!(buildingAt(w)||structAt(w)||nodeAt(w)||enemyAt(w));},
  placeAt:(type,i,j)=>{if(!placementValid(type,i,j))return null;pay(BUILD[type].cost);const D=BUILD[type];const b={id:nid(),type,i,j,progress:0,built:false,queue:0,qt:0,hp:D.hp,maxhp:D.hp,broken:false,lv:1,inv:addCost({},D.cost)};S.buildings.push(b);rebuildBlock();return b;}};
XW.newGame=(s,q)=>{newGame(s,q);showTitle(false);};
{const _o=XW045(),_d=Object.getOwnPropertyDescriptors(_o);for(const k in _d)_d[k].configurable=true;Object.defineProperties(XW,_d);}

try{
  if(typeof updateCamera==='function'&&!updateCamera._xwXtlIso){
    const _xwUc=updateCamera;
    updateCamera=function(){
      try{
        if(window.XW_XTL&&XW_XTL.active()&&(!XW_XTL.isLocalTarget||XW_XTL.isLocalTarget())){
          const st=XW_XTL.state&&XW_XTL.state();
          const u=(st&&st._unit)||(typeof player==='function'&&player());
          if(u){
            let tx=u.x,ty=u.y;
            const cfg=window.CULT_XTL_CFG||{};
            if(st&&st.phase==='ascend')ty=u.y-((st.t||0)/Math.max(0.01,cfg.ascendSec||4))*14;
            else if(st&&(st.phase==='strike'||st.phase==='gather'))ty=u.y-2-(st.i||0)*0.35;
            else if(st&&st.phase==='fall')ty=u.y+((st.t||0)/Math.max(0.01,cfg.fallSec||2))*3;
            const q=iso(tx,ty);
            const lerp=0.16;
            cam.follow=false;
            cam.x+=(q.x-cam.x)*lerp;
            cam.y+=(q.y-20-cam.y)*lerp;
            return;
          }
        }
      }catch(e){}
      return _xwUc.apply(this,arguments);
    };
    updateCamera._xwXtlIso=1;
  }
}catch(e){}
try{XW.setTask=setTask;XW.dgEnter=dgEnter;XW.dgExit=dgExit;XW.fx=fx;XW.enterBuildingUnit=enterBuildingUnit;XW.exitBuilding=exitBuilding;XW.moveEntity=moveEntity;XW.onPlayerDeath=onPlayerDeath;XW.effectCount=function(){return effects.length;};XW.blockAt=function(i,j,v){const k=j*N+i;const prev=block[k];if(v!=null)block[k]=v;return prev;};}catch(e){}


// 突破鈕釘在 #v47ub：條件未齊仍顯示灰鈕；v55 分頁不會把鈕收進隱藏的總覽頁
(function(){
  if(!document.getElementById('xwBrkCss')){
    const s=document.createElement('style');s.id='xwBrkCss';
    s.textContent='#panel #v47ub{display:block!important;visibility:visible!important}#panel #v47ub .xwbrk{display:block!important;margin:4px 0;visibility:visible!important}#panel #v47ub .xwbrk .btn,#panel #v47ub [data-act="break"]{display:inline-block!important;visibility:visible!important;min-height:28px;min-width:5em;padding:4px 10px;font-size:13px;line-height:1.3}#panel #v47ub .xwbrk .btn.xwbrk-off{opacity:.85;background:#2a2418;color:#d2c19a;border:1px solid #8a6a3a;cursor:pointer}#panel #v47ub .xwbrk-miss{display:block!important;margin:2px 0 0;font-size:12px;color:#ff9a8a;line-height:1.45}#cult .xwbrk{display:inline-block;margin:0 0 0 4px;vertical-align:middle;max-width:16em}#cult .xwbrk .btn.xwbrk-off{opacity:.85;background:#2a2418;color:#d2c19a;border:1px solid #8a6a3a;cursor:pointer}#cult .xwbrk-miss{display:block;margin:2px 0 0;font-size:11px;color:#ff9a8a;line-height:1.35}#panel{position:relative}#panel>.x47pclose{position:absolute!important;float:none!important;top:4px;right:4px;z-index:6;flex-shrink:0}body.touch #panel>.x47ptog{position:absolute!important;float:none!important;top:4px;right:50px;z-index:6;flex-shrink:0}#panel h4{white-space:normal!important;overflow:visible!important;text-overflow:clip!important;overflow-wrap:anywhere;word-break:break-word;line-height:1.4;margin-right:36px!important;max-width:100%;box-sizing:border-box}body.touch #panel h4{margin-right:96px!important}#panel h4 .tag,#panel h4 .xnsc{display:inline-block;vertical-align:middle;max-width:100%}#panel h4 .xnsc{white-space:normal}';
    (document.head||document.documentElement).appendChild(s);
  }
  function xwFitPanelH4(){
    const el=document.getElementById('panel');if(!el||el.style.display==='none')return;
    const h=el.querySelector(':scope > h4');if(!h)return;
    h.style.fontSize='';
    let fs=parseFloat(getComputedStyle(h).fontSize)||13;
    for(let i=0;i<8;i++){
      if(h.scrollWidth<=h.clientWidth+1)break;
      fs=Math.max(10,fs-0.5);h.style.fontSize=fs+'px';
      if(fs<=10)break;
    }
  }
  function hook(){
    if(typeof v47PanelRefresh==='function'&&!v47PanelRefresh._xwbrk){
      const _v=v47PanelRefresh;
      v47PanelRefresh=function(){const r=_v.apply(this,arguments);try{xwPinBreak();}catch(e){}try{xwFitPanelH4();}catch(e){}return r;};
      v47PanelRefresh._xwbrk=1;
    }
    if(typeof renderPanel==='function'&&!renderPanel._xwbrk){
      const _rp=renderPanel;
      renderPanel=function(){const r=_rp.apply(this,arguments);try{xwPinBreak();}catch(e){}try{xwFitPanelH4();}catch(e){}return r;};
      renderPanel._xwbrk=1;
    }
  }
  hook();
  setTimeout(hook,0);setTimeout(hook,400);setTimeout(hook,1200);
})();

})();
</script>
</body>
</html>
