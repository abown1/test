// ================== v0.4.6c：玩家回饋第三批（feedback_80：突破體系、職業、暫停畫面、山賊警報…）==================
// 規則：頂層不碰 g7 的 const（$、JOB_NAME、HINTS…），DOM 相關放進 XW045 包裝內；用 $$ / document.getElementById。
const V47={t:0,ut:0,rt:0,lastRaidKey:'',alarmT:-99,banners:{},pause:false,pauseRet:null,sfxArmed:false};
UNIT_KEEP.push('brkFails','brkLock','tpB','tpN','inj','prof','act','v47t','profF');
DISC_COPY.push('v47t');

// ---------- 音效（WebAudio，無音檔；首次操作後才啟用）----------
const SFX={ctx:null,on(){try{return localStorage.getItem('xw_sfx')!=='0';}catch(e){return true;}}};
function sfxCtx(){if(!V47.sfxArmed)return null;if(!SFX.ctx){const AC=window.AudioContext||window.webkitAudioContext;if(!AC)return null;try{SFX.ctx=new AC();}catch(e){return null;}}
  if(SFX.ctx.state==='suspended')SFX.ctx.resume().catch(()=>{});return SFX.ctx;}
function beep(f,d,type,vol,delay,f2){try{if(!SFX.on())return;const c=sfxCtx();if(!c)return;const t=c.currentTime+(delay||0);const o=c.createOscillator(),g=c.createGain();
  o.type=type||'square';o.frequency.setValueAtTime(f,t);if(f2)o.frequency.exponentialRampToValueAtTime(f2,t+d);g.gain.setValueAtTime(0.0001,t);g.gain.exponentialRampToValueAtTime(vol||0.06,t+0.012);
  g.gain.exponentialRampToValueAtTime(0.0001,t+d);o.connect(g);g.connect(c.destination);o.start(t);o.stop(t+d+0.03);}catch(e){}}
function snd(k){if(k==='alarm'){for(let i=0;i<3;i++){beep(880,0.16,'square',0.07,i*0.36);beep(620,0.16,'square',0.07,i*0.36+0.18);}}
  else if(k==='siren'){for(let i=0;i<4;i++)beep(520,0.3,'sawtooth',0.06,i*0.34,980);}
  else if(k==='hit'){beep(150,0.09,'square',0.09);beep(1250,0.18,'triangle',0.05,0.01,900);}
  else if(k==='perfect'){beep(1250,0.12,'triangle',0.06);beep(1680,0.22,'triangle',0.06,0.08);}
  else if(k==='miss'){beep(120,0.14,'sawtooth',0.06,0,80);}
  else if(k==='ready'){beep(660,0.12,'triangle',0.05);beep(990,0.2,'triangle',0.05,0.12);}
  else if(k==='break'){beep(523,0.15,'triangle',0.06);beep(659,0.15,'triangle',0.06,0.12);beep(784,0.3,'triangle',0.06,0.24);}}
addEventListener('pointerdown',()=>{V47.sfxArmed=true;},true);addEventListener('keydown',()=>{V47.sfxArmed=true;},true);

// ---------- 境界資料（沿用現有境界名稱與順序；只延伸資料到地仙，MAX_REALM 不變）----------
// 索引 r＝從 REALMS[r] 突破到 REALMS[r+1]
TUNE.breakFail=[0.05,0.20,0.35,0.55,0.50,0.60,0.68,0.76,0.84,0.90,0.94];
TUNE.xiuXian=[1,1,1,1,1.5,2,2.5,3.5,5,7,10];
const V47R=[
 {d:'易',s:1,loss:0.10,inj:null,nd:0.05,pill:0.08,pn:'突破丹'},
 {d:'普通',s:2,loss:0.15,inj:'light',nd:0.08,pill:0.10,pn:'突破丹'},
 {d:'困難',s:3,loss:0.20,inj:'heavy',nd:0.10,pill:0.08,pn:'突破丹'},
 {d:'九死一生',s:5,loss:0.40,inj:'meridian',nd:0.20,pill:0.05,pn:'突破丹'},
 {d:'極難',s:4,loss:0.40,inj:'meridian',drop:1,nd:0.12,pill:0.10,pn:'突破丹'},
 {d:'極難',s:4,loss:0.50,inj:'meridian',drop:1,nd:0.10,pill:0.08,pn:'突破丹'},
 {d:'兇險',s:5,loss:0.60,inj:'meridian',drop:1,nd:0.08,pill:0.05,note:'元嬰：心魔劫'},
 {d:'逆天',s:5,loss:0.80,inj:'meridian',drop:1,nd:0.06,pill:0.03,note:'化神：神識淬鍊'},
 {d:'逆天',s:5,loss:1.00,inj:'meridian',drop:1,nd:0.05,pill:0.02,note:'合體：天地共鳴'},
 {d:'天劫',s:5,loss:1.00,inj:'meridian',drop:1,nd:0.03,pill:0.02,note:'地仙：九重雷劫'},
 {d:'飛升',s:5,loss:1.00,inj:'meridian',drop:1,nd:0.0,pill:0.01,note:'天仙：飛升'}];
const INJ={light:{n:'輕傷',atk:0.10,cult:1,T:150},heavy:{n:'重傷',atk:0.20,cult:0.8,T:300},meridian:{n:'經脈受損',atk:0.25,cult:0.3,T:900}};
TUNE.tpCap=0.30;TUNE.ovMax=1.5;TUNE.ovBonus=0.10;TUNE.ndCd=40;
PILLS.tp.desc='每服一顆，下一次大境界突破成功率 +（依境界 1～10%，可疊加，上限 30%；突破後歸零）';
{const R=REALMS;[['鍛體成鋼'],['內力外放'],['武道宗師'],['引氣入體'],['道基初成'],['金丹大道'],['元嬰出竅'],['神識化形'],['天人合一'],['肉身不朽']].forEach((x,k)=>{if(R[k]&&!R[k].tag)R[k].tag=x[0];});}

function injOf(u){const I=u&&u.inj;if(!I||!INJ[I.k])return null;if(S.time>=I.t){u.inj=null;return null;}return INJ[I.k];}
function v47Stars(n){return '★'.repeat(n)+'☆'.repeat(Math.max(0,5-n));}
function v47Need(u){return needXiu(u);}
function v47Major(u){return u&&(u.sub||0)>=SUB_N-1&&u.realm<MAX_REALM;}

// 突破丹可疊加
{const _up=usePill;usePill=function(u,k){if(k!=='tp')return _up(u,k);if(!u||u.dead)return false;
  const r=Math.min(u.realm,V47R.length-1),R=V47R[r],cur=u.tpB||0;if(u.realm>=MAX_REALM){toast('已達本版本最高境界');return false;}
  if(cur>=TUNE.tpCap-0.001){toast(`${nm(u)}藥力已飽和（+${Math.round(cur*100)}%），再服無效`);return false;}
  const a=S.pills.tp;let q=-1;if(a)for(let x=2;x>=0;x--)if(a[x]>0){q=x;break;}const ok=_up(u,k);if(!ok)return false;
  const add=R.pill*[0.8,1,1.3][Math.max(0,q)];u.tpB=Math.min(TUNE.tpCap,cur+add);u.tpN=(u.tpN||0)+1;
  toast(`${nm(u)}服下突破丹：下次突破成功率 +${Math.round(u.tpB*100)}%（已服 ${u.tpN} 顆，上限 ${Math.round(TUNE.tpCap*100)}%）`);if(typeof bagKey!=='undefined')bagKey=null;return true;};}

// 修為溢出（圓滿後可累積到 150%）、傷勢減修煉
gainXiu=function(u,amt){
  if(!u||capped(u))return;amt*=TUNE.xiuMul;const I=injOf(u);if(I)amt*=I.cult;
  let need=needXiu(u);const was=u.xiu>=need;
  if((u.sub||0)<SUB_N-1){u.xiu+=amt;let n=0;while((u.sub||0)<SUB_N-1&&u.xiu>=need&&n<3){const ov=u.xiu-need;advanceSub(u);need=needXiu(u);u.xiu=Math.min(ov,need*0.5);n++;}
    if(!((u.sub||0)>=SUB_N-1&&u.xiu>=need))return;}
  else{const cap=u.realm>=MAX_REALM?need:need*TUNE.ovMax;u.xiu=Math.min(cap,u.xiu+amt);}
  if(u.xiu<need||was||u.realm>=MAX_REALM)return;
  const c=breakConds(u);
  if(c.auto&&c.ok){tryBreak(u,true);}
  else{v47Ready(u,c);}
};
function v47Ov(u){if(!v47Major(u))return 0;const n=needXiu(u);return Math.max(0,Math.min(TUNE.ovMax-1,u.xiu/n-1));}
{const _db=doBreak;doBreak=function(u){const ov=v47Ov(u)*needXiu(u);_db(u);u.tpN=0;u._v47rd=null;if(ov>0&&!capped(u))u.xiu=Math.min(ov,needXiu(u)*0.5);snd('break');};}

// 失敗率：新階梯＋溢出加成＋瀕死必成
{const _bf=breakFail;breakFail=function(u){if(u&&u._nd)return 0;let f=_bf(u);f-=TUNE.ovBonus*v47Ov(u)/(TUNE.ovMax-1);return clamp(f,u.realm<=1?0.02:0.03,0.95);};}

// 失敗損失：依境界、受傷、跌境
{const _tb=tryBreak;tryBreak=function(u,auto){if(!u||u.dead)return _tb(u,auto);
  const major=v47Major(u);let pre=false;if(major){const c=breakConds(u);pre=!!(c&&c.ok);}
  const r0=u.realm,x0=u.xiu,res=_tb(u,auto);
  if(major&&pre&&!res&&u.realm===r0&&!u.dead)v47Fail(u,r0,x0);
  return res;};}
function v47Fail(u,r,x0){const R=V47R[r]||V47R[V47R.length-1];u.xiu=Math.floor(x0*(1-R.loss));const msg=[`修為 -${Math.round(R.loss*100)}%`];
  if(R.inj){const I=INJ[R.inj];u.inj={k:R.inj,t:S.time+I.T};msg.push(`${I.n} ${Math.round(I.T/60)} 分鐘`);}
  if(R.drop&&(u.sub||0)>0){stripGear(u);const m=1+TUNE.subBonus;u.maxhp=Math.round(u.maxhp/m);u.atk=+(u.atk/m).toFixed(1);u.sub--;gearApply(u);u.hp=Math.min(u.hp,u.maxhp);u.xiu=Math.min(u.xiu,Math.floor(needXiu(u)*0.5));msg.push(`跌落「${SUB[u.sub]}」`);}
  u._v47rd=null;floater(u.x,u.y,msg.join('、'),'#ff9a8a');snd('miss');
  if(u.kind==='player'||selUnits.includes(u.id)||r>=3)setTimeout(()=>toast(`損失：${msg.join('、')}`),400);}
// 傷勢：攻擊力下降
{const _de=dmgEnemy;dmgEnemy=function(src,e,amt,col){const I=src&&src.kind?injOf(src):null;if(I)amt*=1-I.atk;return _de(src,e,amt,col);};}

// #71 絕境瀕死特殊突破
{const _du=dmgUnit;dmgUnit=function(src,u,d){const r=_du(src,u,d);try{v47NearDeath(u);}catch(e){}return r;};}
function v47NearDeath(u){if(!u||u.dead||(u.kind!=='player'&&u.kind!=='disciple')||u.hp<=0||u.hp>u.maxhp*0.05)return;
  if(S.time-(u._ndT||-999)<TUNE.ndCd)return;const need=needXiu(u);if(u.xiu<need*0.9||capped(u)||u.brkLock)return;u._ndT=S.time;
  const r=Math.min(u.realm,V47R.length-1),sub=u.sub||0;let ch=V47R[r].nd;if(sub<SUB_N-1)ch*=1.5;if(isXW(u))ch*=1.3;ch+=(u.luck||0)*0.0006;
  if(rnd()>=ch){floater(u.x,u.y,'瀕死…','#ff8080');return;}
  fx('break',u.x,u.y,'#fff0a0');floater(u.x,u.y,'絕境頓悟！','#fff0a0');
  if(sub<SUB_N-1){u.xiu=0;advanceSub(u);u.hp=Math.max(u.hp,u.maxhp*0.5);toast(`絕境頓悟！${nm(u)}在生死之間突破至「${realmName(u)}」`);snd('break');return;}
  if(u.realm>=MAX_REALM)return;u.xiu=Math.max(u.xiu,need);const c=breakConds(u);
  if(c.ok){u._nd=1;let ok=false;try{ok=tryBreak(u,true);}finally{u._nd=0;}if(ok){toast(`生死一線，${nm(u)}破而後立，強行突破「${REALMS[u.realm].n}」！`);return;}}
  u.hp=Math.max(u.hp,u.maxhp*0.35);toast(`絕境頓悟！${nm(u)}修為圓滿、氣血回湧${c.ok?'':'（突破條件未齊，無法當場突破）'}`);}

// ---------- 突破資訊（面板用）----------
function brkInfo(u){if(!u)return null;const r=u.realm;if(r>=MAX_REALM)return {max:true};
  const R=V47R[r],c=breakConds(u),f=breakFail(u),need=needXiu(u),sub=u.sub||0;
  const parts=[];const wu=Math.round(u.wu*0.2),lk=Math.round((u.luck||0)*0.08);if(r!==3){if(wu)parts.push(`悟性 +${wu}%`);if(lk)parts.push(`氣運 +${lk}%`);}
  if(isXW(u)&&r!==3)parts.push('仙武之體 +8%');if(u.tpB)parts.push(`突破丹×${u.tpN||1} +${Math.round(u.tpB*100)}%`);const ov=v47Ov(u);if(ov>0)parts.push(`修為溢出 +${Math.round(TUNE.ovBonus*ov/(TUNE.ovMax-1)*100)}%`);
  if(u.lg&&typeof RT!=='undefined'){const k=rootKey(u),RR=RT[k];if(RR){const b=r<4?RR.brk:RR.brkL;if(b)parts.push(`${RR.n} ${b<0?'+':'-'}${Math.abs(Math.round(b*100))}%`);}}
  const cost=[];if(r===3)cost.push(`靈石 ${TUNE.lianqiLs}`,'仙凡令 ×1（成功才消耗）');if(r===4)cost.push(`靈石 ${TUNE.zhujiLs}`,'築基丹 ×1');if(r===5)cost.push(`靈石 ${TUNE.jindanLs}`,'凝元丹 ×1');if(u.tpB)cost.push(`已服突破丹藥力（${u.tpN||1} 顆）`);
  const loss=[`修為 -${Math.round(R.loss*100)}%（約 ${Math.floor(Math.max(u.xiu,need)*R.loss)} 點）`,'氣血減半'];if(R.inj){const I=INJ[R.inj];loss.push(`${I.n} ${Math.round(I.T/60)} 分鐘（戰力 -${Math.round(I.atk*100)}%${I.cult<1?`、修煉 ×${I.cult}`:''}）`);}if(R.drop)loss.push('跌落一個小境界');
  return {r,next:REALMS[r+1].n,succ:Math.round((1-f)*100),d:R.d,s:R.s,c,parts,cost,loss,nd:Math.round(R.nd*100),ready:sub>=SUB_N-1&&u.xiu>=need,sub,need,xiu:u.xiu,R};}
function brkHtml(u,full){const I=brkInfo(u);if(!I)return '';if(I.max)return '<div class="v47b dim">已達本版本最高境界（後續境界尚未開放）</div>';
  const col=I.succ>=80?'#9fe8b0':I.succ>=50?'#ffe27a':I.succ>=25?'#ffb070':'#ff8a7a';
  let h=`<div class="v47b"><b class="sdl">突破「${I.next}」</b> <span class="tg" style="color:${col}">成功率 ${I.succ}%</span><span class="tg">難度 ${I.d} ${v47Stars(I.s)}</span>${I.ready?'<span class="tg" style="color:#ffe27a">✦ 修為圓滿</span>':`<span class="tg">${SUB[I.sub]}</span>`}`;
  const miss=I.c.list.filter(x=>!x.ok&&!/^修為圓滿/.test(x.t));if(miss.length)h+=`<span class="tg" style="color:#ff9a8a">缺 ${miss.length} 項</span>`;
  h+=`<details class="dt"${full?' open':''}><summary>詳情</summary>`;
  h+=`<div><b>條件</b>${I.c.list.map(x=>`<div class="${x.ok?'ok':'no'}">${x.ok?'✔':'✖'} ${x.t}</div>`).join('')}</div>`;
  h+=`<div><b>成功率組成</b>：${I.parts.length?I.parts.map(t=>`<span class="tg">${t}</span>`).join(''):'—'}<br><small class="dim">每服一顆突破丹 +${Math.round(I.R.pill*100)}%（品質加成、可疊加至 ${Math.round(TUNE.tpCap*100)}%）；圓滿後修為可再累積到 ${Math.round(TUNE.ovMax*100)}%，溢出越多越穩（最多 +${Math.round(TUNE.ovBonus*100)}%）</small></div>`;
  if(I.cost.length)h+=`<div><b>突破時消耗</b>：${I.cost.join('、')}</div>`;
  h+=`<div style="color:#ffb0a0"><b>失敗損失</b>：${I.loss.join('、')}${I.cost.length?'；所需丹藥／靈石照樣耗掉':''}</div>`;
  h+=`<div class="dim">絕境突破：修為 ≥90%、氣血 ≤5% 時約 ${I.nd}% 機率當場突破（小境界 ×1.5）</div>`;
  if(u.brkFails)h+=`<div class="dim">累計失敗 ${u.brkFails} 次</div>`;
  return h+'</details></div>';}

// #23 突破提示引導（任何弟子）
function v47Ready(u,c){if(!u||u.kind==='cand')return;const k=u.realm+'_'+(u.sub||0);if(u._v47rd===k)return;u._v47rd=k;c=c||breakConds(u);
  const miss=c.list.filter(x=>!x.ok&&!/^修為圓滿/.test(x.t)).map(x=>x.t.replace(/（.*$/,''));const I=brkInfo(u);
  const txt=`✦ ${nm(u)}已達「${realmName(u)}」，可衝擊「${REALMS[u.realm+1].n}」｜成功率 ${I?I.succ:'?'}%${miss.length?`｜缺：${miss.slice(0,2).join('、')}${miss.length>2?'…':''}`:'｜條件已齊，按「突破」'}`;
  v47Banner('rd'+u.id,{txt,cls:'gold',ttl:14,click:()=>{try{if(typeof locateUnit==='function')locateUnit(u);openCult();}catch(e){}}});snd('ready');}

// ---------- #36 職業 ----------
const PROF={
 miner:{n:'礦工',ic:'⛏',res:['stone','iron','lingshi'],need:200,g:0.25,d:'採石／鐵礦／靈石 +25%'},
 lumber:{n:'伐木工',ic:'🪓',res:['wood'],need:300,g:0.25,d:'伐木 +25%'},
 herbal:{n:'採藥客',ic:'🌿',res:['herb'],need:80,g:0.30,d:'採藥 +30%、煉丹技藝 +5'},
 farmer:{n:'靈農',ic:'🌾',res:['food','fiber'],need:250,g:0.25,d:'採集食物／纖維 +25%'},
 smith:{n:'鍛造師',ic:'⚒',craft:'forge',need:8,d:'鍛造技藝 +15、打造速度 +30%'},
 alch:{n:'煉丹師',ic:'⚗',craft:'alchemy',need:8,d:'煉丹技藝 +15、煉丹速度 +30%'}};
const PROF_ORDER=['miner','lumber','herbal','farmer','smith','alch'];
function hasProf(u,k){return !!(u&&u.prof&&u.prof.includes(k));}
function profProg(u,k){const P=PROF[k],a=u.act||{};return P.craft?(a[P.craft]||0):P.res.reduce((s,r)=>s+(a[r]||0),0);}
function profCheck(u,k){if(!u||u.kind!=='disciple'||hasProf(u,k))return;u.prof=u.prof||[];if(u.prof.length>=2)return;const P=PROF[k];u.profF=u.profF||{};
  const need=P.need*(1+0.5*(u.profF[k]||0));if(profProg(u,k)<need)return;
  if(rnd()<0.55+u.wu/250){u.prof.push(k);floater(u.x,u.y,`${P.ic} ${P.n}`,'#ffe27a');toast(`${nm(u)}熟能生巧，成為「${P.n}」！${P.d}`);if(typeof panelKeyCache!=='undefined')panelKeyCache=null;}
  else u.profF[k]=(u.profF[k]||0)+1;}
function profOfRes(rt){for(const k of PROF_ORDER){const P=PROF[k];if(P.res&&P.res.includes(rt))return k;}return null;}
{const _ud=updateDisciple;updateDisciple=function(u,dt){const c0=u.carry?u.carry.amt:0,t0=u.carry?u.carry.type:null;_ud(u,dt);if(u.dead)return;
  try{if(u.carry&&u.carry.amt>(u.carry.type===t0?c0:0)){const rt=u.carry.type,d=u.carry.amt-(u.carry.type===t0?c0:0);u.act=u.act||{};u.act[rt]=(u.act[rt]||0)+d;const pk=profOfRes(rt);if(pk)profCheck(u,pk);}
    if(u.working&&u.job==='gather'&&u.jnode!=null&&u.prof){const n=nodeById(u.jnode);if(n){const pk=profOfRes(NODE_RES[n.type]);if(pk&&hasProf(u,pk))u.gt=(u.gt||0)+dt*u.gat*(n.type==='vein'||n.type==='iron'?0.6:1)*PROF[pk].g;}}
    v47Idle(u,dt);}catch(e){}};}
{const _cs=craftSkill;craftSkill=function(u,b){let s=_cs(u,b);if(!u||!b)return s;if(b.type==='forge'&&hasProf(u,'smith'))s+=0.15;if(b.type==='alchemy'){if(hasProf(u,'alch'))s+=0.15;if(hasProf(u,'herbal'))s+=0.05;}return s;};}
{const _fc=finishCraft;finishCraft=function(b){const cs=crafters(b).filter(u=>u.kind==='disciple');const r=_fc(b);
  for(const u of cs){u.act=u.act||{};u.act[b.type]=(u.act[b.type]||0)+1;profCheck(u,b.type==='forge'?'smith':'alch');}
  try{v47AutoCraft(b);}catch(e){}return r;};}
// #51 鍛造／煉丹速度：主事技藝與職業加成；無人時不前進（維持原規則），但顯示提示
{const _tc=tickCraft;tickCraft=function(dt){const extra=[];for(const b of S.buildings){if(!b.craft||!b.built||b.broken)continue;const cs=crafters(b);if(!cs.length)continue;
    const best=bestCrafter(b);let m=Math.max(0,(craftSkill(best,b)-0.4))*0.6;if(cs.some(u=>hasProf(u,b.type==='forge'?'smith':'alch')))m+=0.3;extra.push([b,m]);}
  _tc(dt);for(const [b,m] of extra){if(!b.craft||m<=0)continue;const c=b.craft;c.t+=dt*(1+0.25*(blv(b)-1))*m;if(c.t>=c.T)finishCraft(b);}};}
// 連續打造：指派的弟子在爐邊時自動再開同一爐
function v47AutoCraft(b){const A=S.flags.v47auto;if(!A||!A[b.id]||b.craft)return;const a=A[b.id];if(!crafters(b).some(u=>u.kind==='disciple'))return;
  setTimeout(()=>{if(b.craft||!S.buildings.includes(b))return;if(!startCraft(b,a.k,a.inf)){delete A[b.id];toast(`${bName(b)}：材料不足，停止連續${b.type==='forge'?'打造':'煉製'}`);}else if(typeof craftKey!=='undefined')craftKey=null;},300);}
{const _sc=startCraft;startCraft=function(b,k,inf){const r=_sc(b,k,inf);if(r&&b){S.flags.v47last=S.flags.v47last||{};S.flags.v47last[b.id]={k,inf:!!inf};if(S.flags.v47auto&&S.flags.v47auto[b.id])S.flags.v47auto[b.id]={k,inf:!!inf};}return r;};}

// ---------- #5 弟子閒置時自動打坐 ----------
TUNE.idleMed=4;
function v47Idle(u,dt){if(u._m47&&(u.job||u.task||u.moving||(u.aiJob&&u.aiJob.k!=='med')||u.inside)){u._m47=0;if(!u.rip&&!u.retreat)u.medit=false;}
  if(u.aiJob&&u.aiJob.k==='med'&&!u.job&&!u.task){u.medit=true;u._m47=1;return;}
  if(u.job||u.task||u.aiJob||u.inside||u.rip||u.retreat||u.dualS||u.moving){u._idle=0;return;}
  u._idle=(u._idle||0)+dt;if(u._idle<TUNE.idleMed)return;if(nearestEnemy(u.x,u.y,6)){u._idle=0;return;}
  if(!u._m47){u._m47=1;u.medit=true;u.thought='🧘';u.thT=S.time;}u.dvx=u.dvy=0;u.working=true;gainXiu(u,1.2*cultMul(u)*dt*0.6);}
{const _ad=aiDecide;aiDecide=function(u,force){const k=_ad(u,force);if(k!=='med'&&u.xiu<needXiu(u)&&rnd()<0.25&&!(u.hp<u.maxhp*0.6)&&!(u.hunger>65)){aiStart(u,'med');return 'med';}return k;};}

// ---------- #50/#67 推薦兵器 ----------
function weaponFit(u){const B=BODIES[u.body]||BODIES[0],wu=u.wu||50,e=u.lg?u.lg.e:-1;
  const sc={sword:1+(wu-50)/50*0.6+(B.spd-1)*1.2+(e===0?0.15:0)+(e===2?0.1:0),saber:1+(B.atk-1)*1.6+(B.hp-1)*0.6+(e===3?0.15:0),
    spear:1.15-Math.abs(B.atk-B.hp)*0.8+(B.spd-1)*0.8+(e===1?0.15:0),fist:1+(B.hp-1)*1.4+(B.spd-1)*0.6+(B.atk-1)*0.3-(wu-50)/50*0.2+(e===4?0.15:0)};
  const why={sword:'悟性高、身法輕靈',saber:'力大勢沉、氣血足',spear:'攻守均衡、出手快',fist:'體魄強健、近身迅捷'};
  const ks=Object.keys(sc).sort((a,b)=>sc[b]-sc[a]);return {best:ks[0],second:ks[1],why:why[ks[0]],faqi:u.realm>=4||!!u.lg,sc};}
function statFit(u){const s=[],B=BODIES[u.body]||BODIES[0];
  s.push(`速度 ${u.speed} → ${B.spd>=1.15||u.speed>=1.3?'宜劍、拳套（快攻）':B.spd<=0.95?'宜刀（以力破巧）':'宜槍（均衡）'}`);
  s.push(`悟性 ${u.wu} → ${u.wu>=70?'宜劍、法器（劍意、御器）':u.wu>=45?'宜劍、槍':'宜刀、拳套（不靠悟性）'}`);return s;}
function weaponHtml(u){const W=weaponFit(u);return `<div class="v47w">⚔ 推薦兵器：<b>${GEAR[W.best].n}</b>（${W.why}）<span class="dim">　次選 ${GEAR[W.second].n}${W.faqi?'｜法器：'+(u.realm>=4?'可佩戴':'煉氣後可佩戴'):''}</span><br><small class="dim">${statFit(u).join('｜')}</small></div>`;}

// ---------- #66 仙武之體與頂級靈根更突出 ----------
if(typeof RT!=='undefined'&&RT.tian){RT.tian.cult=2.6;RT.tian.tags=['修煉×2.6','突破易','戰力+12%'];}
const TOP_ROOT=['tian','guang','an','shikong','hundun'];
function v47RootCls(u){if(!u||!u.lg||typeof rootKey!=='function')return '';const k=rootKey(u);if(TOP_ROOT.includes(k))return 'top';const l=lgEff(u.lg);return l&&l.g==='var'?'var':'';}
TUNE.xwTal=0.25;TUNE.topTal=0.12;TUNE.varTal=0.06;TUNE.xwCult=1.25;
function v47Talent(u){if(!u||u.kind==='player'||u.kind==='npc')return;const f=u.v47t||'';let add='',m=1;
  if(isXW(u)&&f.indexOf('x')<0){add+='x';m*=1+TUNE.xwTal;}
  {const rc=v47RootCls(u);if(rc==='top'&&f.indexOf('r')<0){add+='r';m*=1+TUNE.topTal;}else if(rc==='var'&&f.indexOf('v')<0&&f.indexOf('r')<0){add+='v';m*=1+TUNE.varTal;}}
  if(!add)return;u.v47t=f+add;stripGear(u);const fr=u.maxhp>0?u.hp/u.maxhp:1;u.maxhp=Math.round(u.maxhp*m);u.atk=+(u.atk*m).toFixed(1);gearApply(u);u.hp=Math.max(1,Math.round(u.maxhp*fr));}
function talentTags(u){const t=[];if(isXW(u))t.push(u.kind==='player'?'仙武之體':`仙武之體：戰力 +${Math.round(TUNE.xwTal*100)}%、修煉 ×${(1.2*TUNE.xwCult).toFixed(2)}`);
  {const rc=v47RootCls(u),k=rc?rootKey(u):'';if(rc==='top')t.push(`${RT[k].n}：戰力 +${Math.round(TUNE.topTal*100)}%`);else if(rc==='var')t.push(`變異靈根：戰力 +${Math.round(TUNE.varTal*100)}%`);}return t;}
{const _cm=cultMul;cultMul=function(u){let m=_cm(u);if(u&&u.kind==='disciple'&&isXW(u))m*=TUNE.xwCult;return m;};}
{const _mc=makeCandidate;makeCandidate=function(b,x,y,force){const d=_mc(b,x,y,force);try{const lv=blv(b);if(lv>1){d.wu=Math.min(100,d.wu+4*(lv-1));if(d.realm===0&&rnd()<0.15*(lv-1))applyRealmStats(d,1);}v47Talent(d);}catch(e){}return d;};}

// ---------- #68 武道館加成更明顯 ----------
TUNE.wdGroup=0.15;TUNE.wdLv=0.4;TUNE.wdBase=1.15;
function wudaoMul(b,n){return TUNE.wdBase*(1+TUNE.wdGroup*Math.min(5,Math.max(0,n-1)))*(1+TUNE.wdLv*(blv(b)-1));}
{const _im=inJobMul;inJobMul=function(u,b,J){if(b&&b.type==='wudao'&&J&&J.act==='spar')return wudaoMul(b,occupants(b).length);return _im(u,b,J);};}
{const _le=lvEffect;lvEffect=function(b,lv){let s=_le(b,lv);if(b.type==='wudao'){s=s.replace(/修為 ×[\d.]+/,`修為 ×${(TUNE.wdBase*(1+TUNE.wdLv*(lv-1))).toFixed(2)}（每多 1 人再 +${Math.round(TUNE.wdGroup*100)}%，最多 +${Math.round(TUNE.wdGroup*500)}%）`);}
  if(b.type==='altar')s+=`、招募花費 ×${[1,2.5,5][lv-1]||5}、悟性 +${4*(lv-1)}`;return s;};}

// ---------- #65 求武台升級：招募費大增 ----------
{const _rc=recruitCost;recruitCost=function(b){const c=_rc(b);if(!b)return c;const lv=blv(b),m=[1,2.5,5][lv-1]||5,g=1+0.04*disciples().length,o={};
  for(const k in c)o[k]=Math.round(c[k]*m*g);if(lv>=2)o.fiber=(o.fiber||0)+10*(lv-1);if(lv>=3)o.herb=(o.herb||0)+6;return o;};}

// ---------- #39 自動選上品 ----------
function candScore(c){const B=BODIES[c.body]||BODIES[0];let s=['凡品','良品','上品','極品'].indexOf(B.rar)*30+c.wu*0.8+c.xy*0.4+(c.luck||0)*0.15+c.realm*25;
  if(isXW(c))s+=1000;if(c.lg){const rc=v47RootCls(c);s+=rc==='top'?300:rc==='var'?120:20*(c.lg.q||0);}return s;}
function candGood(c){const B=BODIES[c.body]||BODIES[0];return isXW(c)||B.rar==='上品'||B.rar==='極品'||!!v47RootCls(c)||c.wu>=75||c.realm>=1;}
function autoPickCands(bid){const cs=S.cands.filter(c=>bid==null||c.bid===bid).sort((a,b)=>candScore(b)-candScore(a));let free=popCap()-popUsed();
  if(!cs.length){toast('目前沒有候選人');return 0;}if(free<=0){toast('弟子已達上限：請建造住房');return 0;}
  const good=cs.filter(candGood);
  // 20261106e：開「自動選上品以上」且這批沒有上品以上 → 自動全部遣散
  if(!good.length){const n=cs.length;try{if(typeof dismissCands==='function')dismissCands(bid);}catch(e){for(const c of cs.slice()){const i=S.cands.indexOf(c);if(i>=0)S.cands.splice(i,1);}}
    toast(`這批沒有上品以上資質，已自動遣散 ${n} 人`);try{if(typeof renderRec==='function')renderRec(true);}catch(e){}return 0;}
  let n=0;const names=[];for(const c of good){if(free<=0)break;const d=acceptCand(c);if(d){n++;free--;names.push(d.name);}}
  if(n)toast(`自動收下 ${n} 名上品以上弟子：${names.join('、')}${good.length>n?`（還有 ${good.length-n} 位，弟子已滿）`:''}`);return n;}

// ---------- #42/#27 建築描述：一行重點＋標籤＋詳情 ----------
const BDESC={
 hall:{s:'宗門核心：存放資源、弟子上限 +2',t:b=>['存放資源',`弟子上限 +${BUILD.hall.pop+(typeof lvPop==='function'?lvPop(b):0)}`,'山賊主要目標'],d:'弟子採集的資源都要搬回大殿才算入庫；大殿被毀會讓採集停擺。升級可提高耐久與人口。'},
 altar:{s:'消耗食物感應有緣人，挑選弟子',t:b=>[`每批 ${TUNE.candBatch[0]+blv(b)-1}～${TUNE.candBatch[1]+blv(b)-1} 人`,`花費 ${costStr(recruitCost(b))}`,`仙武之體 ×${(1+0.5*(blv(b)-1)).toFixed(1)}`],d:'等級越高候選人越多、悟性越高、偶有武師，但每次感應的花費大幅增加（Lv2 ×2.5、Lv3 ×5，弟子越多越貴）。宗門有人突破煉氣後可升級為「求仙台」，招到身具靈根的弟子。可用「自動選上品」一鍵收下好資質。'},
 house:{s:'弟子上限 +3；修仙後化為洞府（修煉 +10%）',t:b=>[`弟子上限 +${BUILD.house.pop+(typeof lvPop==='function'?lvPop(b):0)}`,S.flags.xian?'洞府 修煉 +10%':'凡人階段無修煉加成'],d:'宗門踏入修仙階段後，每座洞府讓全宗修煉速度 +10%（最多 +50%）。'},
 wudao:{s:'弟子「練武」累積修為，人越多越快',t:b=>{const n=occupants(b).length;return [`修為 ×${wudaoMul(b,Math.max(1,n)).toFixed(2)}（${Math.max(1,n)} 人）`,`每多 1 人 +${Math.round(TUNE.wdGroup*100)}%`,`Lv 加成 +${Math.round(TUNE.wdLv*100)}%／級`];},d:'練武基礎 2 修為／秒，再乘以悟性、體質與上方倍率；多人對練最多 +75%。弟子閒著沒事也會自己來練。'},
 lianwu:{s:'弟子「閉關」各自修煉，名額依等級增加',t:b=>[`閉關 ${(JOB_SLOTS.lianwu||2)+(LV_SLOT_ADD.lianwu||0)*(blv(b)-1)} 人`,`修為 ×${(1+TUNE.lvXiu*(blv(b)-1)).toFixed(2)}`,'突破大武師必需'],d:'閉關基礎 3.5 修為／秒，實得另乘悟性、體質、建築等級與修煉加成；不是固定每秒增加 3.5。'},
 library:{s:'研究武學秘籍與丹方',t:b=>[`研究速度 ×${(1+0.25*(blv(b)-1)).toFixed(2)}`,'秘籍：突破宗師必需','可研究丹方'],d:'「武學秘籍」是突破宗師的條件；也可研究丹方給煉丹房使用。弟子也可在此「讀書」提升悟性。'},
 alchemy:{s:'煉製回血丹、突破丹、築基丹等',t:b=>[`煉丹 ${(JOB_SLOTS.alchemy||2)+(LV_SLOT_ADD.alchemy||0)*(blv(b)-1)} 人`,'突破丹可疊加','煉丹師加成'],d:'指派弟子煉丹，主事者悟性、火靈根／火靈體、「煉丹師」職業會降低廢丹率並加快速度。突破丹每多服一顆，下一次大境界突破成功率再提高。'},
 forge:{s:'打造兵器、衣甲、飾品與法器',t:b=>[`鍛造 ${(JOB_SLOTS.forge||2)+(LV_SLOT_ADD.forge||0)*(blv(b)-1)} 人`,'鍛造師加成','可連續打造'],d:'指派弟子鍛造，主事者悟性、金靈根、金剛體／厚土體與「鍛造師」職業會提高品質與速度。開爐後可勾選「連續打造」讓弟子自動續造。'},
 xianyuan:{s:'定期觸發仙緣事件、提升招募資質',t:b=>[`仙緣靈光／感應見說明（真概率）`,'靈根率依資質品階'],d:'宗門有人達到煉氣後解鎖。'}};
for(const k in BDESC)if(BUILD[k])BUILD[k].desc=BDESC[k].s+'。'+BDESC[k].d;
function bdescHtml(b){const D=BDESC[b.type];if(!D)return null;let t=[];try{t=D.t(b);}catch(e){}
  return `<b class="sdl">${D.s}</b><br>${t.map(x=>`<span class="tg">${x}</span>`).join('')}<details class="dt"><summary>詳情</summary>${D.d}</details>`;}

// ---------- 橫幅（山賊警報、突破提示）----------
function v47Banner(id,o){V47.banners[id]=Object.assign({t0:S.time,ttl:o.ttl||0},o);V47.bannerDirty=true;}
function v47BannerOff(id){if(V47.banners[id]){delete V47.banners[id];V47.bannerDirty=true;}}
function v47Look(x,y){if(S.interior&&typeof exitInterior==='function')exitInterior(true);const q=iso(x,y);cam.x=q.x;cam.y=q.y-20;cam.follow=false;}
function v47RaidState(){const out={pend:[],act:[]};
  for(const v of S.villages){if(v.type!=='bandit'||v.destroyed||v.raidT==null)continue;if(v.warned&&S.time<v.raidT)out.pend.push(v);}
  for(const r of S.raidsActive){const es=S.enemies.filter(e=>e.raid===r.id&&!e.dead);if(es.length)out.act.push({r,es,v:vById(r.vid)});}return out;}
function v47RaidTick(){if(S.dg){v47BannerOff('raid');return;}const R=v47RaidState();
  if(!R.pend.length&&!R.act.length){v47BannerOff('raid');V47.lastRaidKey='';return;}
  let txt,tgt;
  if(R.act.length){const n=R.act.reduce((s,a)=>s+a.es.length,0),a=R.act[0];const nm2=a.v?a.v.name:'敵人';
    let cx=0,cy=0;for(const e of a.es){cx+=e.x;cy+=e.y;}tgt={x:cx/a.es.length,y:cy/a.es.length};
    txt=`⚠ ${nm2}${a.v&&a.v.type==='bandit'?'山賊':''}來襲！剩 ${n} 人正在進攻宗門｜點擊前往`;}
  else{const v=R.pend.sort((a,b)=>a.raidT-b.raidT)[0];tgt={x:v.x,y:v.y};txt=`⚠ 警報：${v.name}山賊集結中，約 ${Math.max(0,Math.ceil(v.raidT-S.time))} 秒後來襲｜點擊查看山寨`;}
  const key=(R.act.length?'a':'p')+R.act.map(a=>a.r.id).join(',')+R.pend.map(v=>v.id).join(',');
  if(key!==V47.lastRaidKey){const wasAct=V47.lastRaidKey[0]==='a';V47.lastRaidKey=key;if(R.act.length&&!wasAct){snd('siren');V47.alarmT=S.time;}else if(!R.act.length){snd('alarm');V47.alarmT=S.time;}}
  else if(R.act.length&&S.time-V47.alarmT>12&&S.time-(R.act[0].r.t0||0)<60){V47.alarmT=S.time;snd('alarm');}
  v47Banner('raid',{txt,cls:'raid',tgt,ttl:0,click:()=>{const s=v47RaidState();let t=tgt;if(s.act.length){const es=s.act[0].es;t={x:es[0].x,y:es[0].y};}v47Look(t.x,t.y);}});}
function v47RenderBanners(){const el=document.getElementById('v47ban');if(!el)return;if(titleOpen||deathOpen){if(el._h){el._h='';el.innerHTML='';}document.body.classList.remove('v47raid');return;}
  for(const id in V47.banners){const b=V47.banners[id];if(b.ttl&&S.time-b.t0>b.ttl){delete V47.banners[id];V47.bannerDirty=true;}}
  const ids=Object.keys(V47.banners).sort((a,b)=>(a==='raid'?-1:0)-(b==='raid'?-1:0)).slice(0,3);
  const html=ids.map(id=>{const b=V47.banners[id];return `<div class="v47bn ${b.cls||''}" data-bn="${id}"><span>${b.txt}</span><button class="bx" data-bnx="${id}">✕</button></div>`;}).join('');
  if(html!==el._h){el._h=html;el.innerHTML=html;}document.body.classList.toggle('v47raid',!!V47.banners.raid);}

// ---------- 暫停畫面 ----------
const SYS_TXT=[
 ['境界','',()=>{let h='<table class="v47t"><tr><th>突破</th><th>難度</th><th>條件</th><th>失敗損失</th><th>瀕死</th></tr>';
   for(let r=0;r<REALMS.length-1;r++){const R=V47R[r],lock=r>=MAX_REALM;const cond=['武道館','練武閣','武學秘籍','功法、靈根或仙緣、仙凡令、靈石 '+TUNE.lianqiLs,'築基丹、靈石 '+TUNE.zhujiLs,'凝元丹、靈石 '+TUNE.jindanLs][r]||(R.note||'—');
     h+=`<tr class="${lock?'dim':''}"><td>${REALMS[r].n}→${REALMS[r+1].n}</td><td>${R.d} ${v47Stars(R.s)}</td><td>${lock?'尚未開放（'+(R.note||'')+'）':cond}</td><td>修為 -${Math.round(R.loss*100)}%${R.inj?'、'+INJ[R.inj].n:''}${R.drop?'、跌一小境':''}</td><td>${Math.round(R.nd*100)}%</td></tr>`;}
   return h+'</table><p class="dim">每個大境界分初期→中期→後期→圓滿。圓滿後修為可再累積到 150%，溢出越多突破越穩。突破丹可疊加服用。氣血 ≤5%、修為 ≥90% 時有機會「絕境突破」。</p>';}],
 ['靈根','先天資質，決定修煉速度與突破難度',()=>'靈根分偽靈根（4～5 系，最慢）、真靈根（2～3 系）、天靈根（單系，修煉極快，突破容易）、變異靈根（雷、冰、風，兼具攻擊特性）、隱靈根（瀕死或突破時覺醒），以及極罕見的光、暗、時空、混沌靈根。天靈根與頂級靈根另有戰力加成。'],
 ['修煉','打坐、練武、閉關、戰鬥都能累積修為',()=>'修為滿了自動進入下一個小境界；圓滿後才能嘗試大境界突破。弟子閒置時會自己打坐。武道館人越多、等級越高越快；修仙後洞府提供全宗加成。'],
 ['突破','每次大境界突破都有成功率與失敗代價',()=>'面板會列出條件、成功率組成、失敗會損失多少修為、會不會受傷或跌境。宗師→煉氣是凡人與修仙的分界，需闖過「仙凡之門」取得仙凡令，九死一生。'],
 ['弟子','招募、指派工作、培養職業',()=>'求武台感應有緣人，挑選後收入門下（「自動選上品」一鍵挑好的）。弟子做久了某種工作會覺醒職業：礦工、伐木工、採藥客、靈農、鍛造師、煉丹師，帶來效率加成。面板會顯示推薦兵器。'],
 ['建築','每座建築一行說明＋標籤，點「詳情」看細節',()=>'大殿存資源、求武台招人、住房加人口、武道館練武、練武閣閉關、長書閣研究、煉丹房煉丹、鍛造坊打造、仙緣閣觸發仙緣。建築可升級到 Lv3。'],
 ['副本','秘境探險，取得材料、靈石與仙凡令',()=>'妖獸洞窟、山賊地牢、上古遺跡、仙凡之門。仙凡之門的首領是「屍傀大武師」（煉氣初期），擊敗後取得仙凡令。'],
 ['鍛造','指針進入金色區時按「鍛打」提高品質',()=>'每爐最多 3 次加成。主事者悟性、金靈根、體質與鍛造師職業影響品質與速度。可勾選「連續打造」讓指派的弟子自動續造。'],
 ['煉丹','控制火候，降低廢丹率',()=>'突破丹每服一顆就提高下一次突破成功率（可疊加）。築基丹、凝元丹在突破時自動使用。'],
 ['聯機','好友共建同一個宗門（2～16 人）',()=>'建立房間後把房間碼分享給好友，大家在同一個宗門裡各自操控角色、分工採集建造。（聯機功能依版本開放）'],
 ['陣法','聚靈陣、護宗陣（規劃中）',()=>'未來版本：可擺放小陣法、房屋範圍與宗門範圍陣法；護宗陣只讓友方與中立通過。'],
 ['傳送','靈脈石碑可互相傳送',()=>'走近石碑可靜坐（回滿氣血、存檔、設為復甦點），並傳送到其他已點亮的石碑。']];
function pauseHtml(tab){const sfxOn=SFX.on();let h=`<div class="pbox"><h3>⏸ 暫停</h3><div class="pcol"><div class="pmenu">
  <button class="btn pri" data-pz="resume">▶ 繼續遊戲</button><button class="btn" data-pz="set">⚙ 設定</button><button class="btn" data-pz="tut">🎓 新手教學</button><button class="btn" data-pz="guide">📖 修仙指南</button>
  <button class="btn ${tab==='sys'?'on':''}" data-pz="sys">📜 系統介紹</button><button class="btn" data-pz="help">⌨ 操作說明</button><button class="btn" data-pz="save">💾 存檔</button><button class="btn" data-pz="load">📂 讀取</button>
  <button class="btn" data-pz="sfx">${sfxOn?'🔊 音效：開':'🔇 音效：關'}</button><button class="btn warn" data-pz="title">🏠 退出到標題</button></div><div class="pbody scroll">`;
  const k=V47.sysK||0;h+=`<div class="ptabs">${SYS_TXT.map((x,i)=>`<button class="btn ${i===k?'on':''}" data-sys="${i}">${x[0]}</button>`).join('')}</div>`;
  const X=SYS_TXT[k];h+=`<div class="psys">${X[1]?`<b class="sdl">${X[1]}</b><br>`:''}${X[2]()}</div>`;
  return h+'</div></div><div class="dim sm" style="margin-top:6px">Esc 或 ⏸ 開關暫停；遊戲時間已停止</div></div>';}
function openPause(on){const el=document.getElementById('v47pause');if(!el)return;if(on==null)on=!V47.pause;
  if(on){if(typeof titleOpen!=='undefined'&&(titleOpen||deathOpen))return;V47.pause=true;V47.pauseRet=null;el.innerHTML=pauseHtml();el.classList.add('open');}
  else{V47.pause=false;el.classList.remove('open');}}
{const _ub=uiBlock;uiBlock=function(){return V47.pause||_ub();};}
function pauseAct(a){const ret=()=>{openPause(false);V47.pauseRet=performance.now();};
  if(a==='resume')openPause(false);
  else if(a==='set'){ret();openSettings();}
  else if(a==='tut'){openPause(false);tutStart();}
  else if(a==='guide'){ret();toggleGuide(true);}
  else if(a==='help'){ret();setHelp(true);}
  else if(a==='save'){ret();openSaves('save');}
  else if(a==='load'){ret();openSaves('load');}
  else if(a==='sfx'){try{localStorage.setItem('xw_sfx',SFX.on()?'0':'1');}catch(e){}openPause(true);}
  else if(a==='title'){openPause(false);backToTitle();}}
function v47PauseReturn(){if(V47.pauseRet==null||V47.pause)return;if(performance.now()-V47.pauseRet<250)return;
  const busy=savesOpen||dlgOpen||guideOpen||helpShown||document.getElementById('settings').classList.contains('open')||titleOpen||deathOpen;if(busy)return;V47.pauseRet=null;openPause(true);}
function v47EscOpen(){if(titleOpen||deathOpen||helpShown||guideOpen||kickPending!=null||confirmCb||recOpen||rosterOpen||S.interior||mmBig||tradeOpen!=null||buildMode)return false;
  if(document.getElementById('cult').classList.contains('open'))return false;
  if(typeof craftOpen!=='undefined'&&craftOpen){toggleCraft(false);return true;}if(typeof bagOpen!=='undefined'&&bagOpen){toggleBag(false);return true;}if(typeof allocOpen!=='undefined'&&allocOpen){toggleAlloc(false);return true;}
  openPause(true);return true;}
addEventListener('keydown',ev=>{if(ev.code!=='Escape'||ev.repeat)return;if(ev.target&&/^(INPUT|TEXTAREA)$/.test(ev.target.tagName))return;
  if(V47.pause){openPause(false);ev.stopImmediatePropagation();ev.preventDefault();return;}
  if(ev.cancelBubble||ev.defaultPrevented||dlgOpen||uiBlock())return;
  if(v47EscOpen()){ev.stopImmediatePropagation();ev.preventDefault();}},true);

// ---------- 仙凡之門首領：屍傀大武師（煉氣初期）#19 ----------
if(typeof DGS!=='undefined'&&DGS.xf)DGS.xf.bossN='屍傀大武師';
{const _en=enemyName;enemyName=function(e){if(e&&e.type==='xfboss'){e.dgName=e.dgName||'屍傀大武師';e.realm=e.realm||4;e.sub=e.sub||0;return _en(e);}return _en(e);};}

// ---------- 面板注入：單位面板（突破、職業、天資、兵器、傷勢）----------
function unitExtraHtml(u){let h='';const I=injOf(u);if(I)h+=`<div style="color:#ff9a8a">🩹 ${I.n}：戰力 -${Math.round(I.atk*100)}%${I.cult<1?`、修煉 ×${I.cult}`:''}（剩 ${Math.ceil((u.inj.t-S.time)/60)} 分鐘）</div>`;
  const tt=talentTags(u);if(tt.length)h+=`<div>✦ 天資：${tt.map(t=>`<span class="tg" style="color:#ffe27a">${t}</span>`).join('')}</div>`;
  if(u.kind==='disciple'){const ps=(u.prof||[]).map(k=>`<span class="tg" style="color:#9fe8b0">${PROF[k].ic} ${PROF[k].n}：${PROF[k].d}</span>`).join('');
    const pr=PROF_ORDER.filter(k=>!hasProf(u,k)).map(k=>{const p=profProg(u,k),n=Math.round(PROF[k].need*(1+0.5*((u.profF||{})[k]||0)));return p>0?`${PROF[k].n} ${Math.min(p,n)}/${n}`:null;}).filter(Boolean);
    h+=`<div>職業：${ps||'<span class="dim">尚無（長期做同一種工作會覺醒）</span>'}${pr.length&&(u.prof||[]).length<2?`<details class="dt"><summary>歷練</summary>${pr.join('｜')}</details>`:''}</div>`;}
  return h+weaponHtml(u);}
function v47PanelRefresh(force){const el=document.getElementById('panel');if(!el||el.style.display==='none')return;
  if(selUnits.length!==1||selBuilding!=null){return;}const u=unitById(selUnits[0]);if(!u||(u.kind!=='player'&&u.kind!=='disciple'))return;
  let b=el.querySelector('#v47ub');if(!b){const anchor=el.querySelector('.pbar');if(!anchor)return;b=document.createElement('div');b.id='v47ub';anchor.insertAdjacentElement('afterend',b);b._h=null;}
  const bh=brkHtml(u)+((u.kind==='disciple'&&canBreakNow(u)&&!el.querySelector('[data-act="break"]'))?`<div class="jobs"><button class="btn on" data-v47brk="${u.id}">突破「${REALMS[u.realm+1].n}」（成功率 ${Math.round((1-breakFail(u))*100)}%）</button></div>`:'');
  const kb=bh.replace(/<details class="dt">/,'');if(kb!==b._h){const op=b.querySelector('details');const wasOpen=op&&op.open;b._h=kb;b.innerHTML=bh;if(wasOpen){const d=b.querySelector('details');if(d)d.open=true;}}
  const pm=el.querySelector('.pmore');if(pm){let m=pm.querySelector('#v47um');if(!m){m=document.createElement('div');m.id='v47um';pm.appendChild(m);m._h=null;}const mh=unitExtraHtml(u);if(mh!==m._h){const d0=m.querySelector('details');const wo=d0&&d0.open;m._h=mh;m.innerHTML=mh;if(wo){const d=m.querySelector('details');if(d)d.open=true;}}}
  const bb=el.querySelector('[data-act="break"]');if(bb&&canBreakNow(u)){const t=`突破「${REALMS[u.realm+1].n}」（成功率 ${Math.round((1-breakFail(u))*100)}%）`;if(bb.textContent!==t)bb.textContent=t;}}
{const _rp=renderPanel;renderPanel=function(){const k0=panelKeyCache;_rp();try{const el=document.getElementById('panel');if(!el)return;
  if(panelKeyCache!==k0&&selBuilding!=null&&panelKeyCache&&panelKeyCache[0]==='b'){const b=bById(selBuilding);const pd=el.querySelector('.pdesc');const h=b&&bdescHtml(b);if(pd&&h){pd.innerHTML=h;pd.classList.add('v47bd');}}
  if(panelKeyCache!==k0)v47PanelRefresh(true);}catch(e){console.warn(e);}};}

// ---------- 修煉面板注入 ----------
{const _rc=renderCult;renderCult=function(){const el=document.getElementById('cult');const k0=cultKey;_rc();if(!el||!el.classList.contains('open')||cultKey===k0)return;try{
  const p=player();const pb=el.querySelector('[data-x="pbar"]');const sec=pb&&pb.closest('.sec');
  if(sec&&p){const old=sec.querySelector('div[style*="ffd0a0"]');if(old)old.remove();const box=document.createElement('div');box.className='v47cb';box.innerHTML=brkHtml(p,false);const jb=sec.querySelector('.jobs');if(jb)sec.insertBefore(box,jb);else sec.appendChild(box);}
  el.querySelectorAll('.urow').forEach(row=>{const b=row.querySelector('[data-break]');const x=row.querySelector('[data-x^="u"]');const id=x?+x.dataset.x.slice(1):null;const u=id!=null?unitById(id):null;if(!u)return;
    const I=brkInfo(u);if(!I||I.max)return;if(b)b.textContent=`突破 ${I.succ}%`;const s=document.createElement('span');s.className='v47rs';s.title=`突破「${I.next}」：成功率 ${I.succ}%｜難度 ${I.d}｜失敗：${I.loss.join('、')}`;
    s.innerHTML=`${I.ready?'<b style="color:#ffe27a">✦圓滿</b> ':''}${I.succ}%`;row.insertBefore(s,row.querySelector('.btn'));});}catch(e){console.warn(e);}};}

// ---------- 招募選單：自動選上品 ----------
{const _rr=renderRec;renderRec=function(force){_rr(force);try{const el=document.getElementById('recmenu');if(!el||!recOpen)return;const ctl=el.querySelector('.rctl');
  if(ctl&&!ctl.querySelector('[data-v47ap]')&&S.cands.some(c=>c.bid===recBid)){const bt=document.createElement('button');bt.className='btn pri';bt.dataset.v47ap='1';bt.textContent='⭐ 自動選上品以上';ctl.insertBefore(bt,ctl.firstChild);}
  el.querySelectorAll('.ccard').forEach(cd=>{if(cd._v47)return;cd._v47=1;const t=cd.querySelector('[data-u]');const c=t&&S.cands.find(o=>o.id===+t.dataset.u);if(!c)return;
    if(candGood(c)){cd.classList.add('v47good');const h=cd.querySelector('.ch');if(h&&!isXW(c))h.insertAdjacentHTML('beforeend','<span class="tag gold">⭐ 推薦</span>');}
    const tt=talentTags(c);if(tt.length){const h=cd.querySelector('.ch');if(h)h.insertAdjacentHTML('beforeend',tt.map(x=>`<span class="tg" style="color:#ffe27a">${x.split('：')[0]}</span>`).join(''));}});}catch(e){console.warn(e);}};}

// ---------- 鍛造台：不再閃爍、打擊回饋、連續打造 ----------
{const _rc=renderCraft;renderCraft=function(){const el=document.getElementById('craft');const b=bById(craftB);
  if(el&&b&&craftOpen&&b.craft){const c=b.craft;const cr=bestCrafter(b);const sk=[b.id,c.k,cr&&cr.id,blv(b),!!(S.flags.v47auto&&S.flags.v47auto[b.id])].join('|');
    if(el._v47k===sk&&el.querySelector('#cf_needle')){const p=Math.floor(c.t/c.T*100);const pc=el.querySelector('#cf_pct');if(pc&&pc.textContent!==p+'%')pc.textContent=p+'%';const bi=el.querySelector('#cf_bar');if(bi)bi.style.width=(c.t/c.T*100)+'%';const ht=el.querySelector('#cf_hits');if(ht){const t=ht.textContent.replace(/已 \d+ 次/,'已 '+c.hits+' 次');if(t!==ht.textContent)ht.textContent=t;}return;}
    craftKey=null;_rc();el._v47k=sk;v47CraftDecor(el,b);return;}
  if(el)el._v47k=null;const k0=craftKey;_rc();if(el&&b&&craftOpen&&craftKey!==k0)v47CraftDecor(el,b);};}
function v47CraftDecor(el,b){const nd=el.querySelector('#cf_needle');if(nd)nd.style.left=(fireGauge()*100)+'%';
  if(b.craft){const g=el.querySelector('.gauge');const sec=g&&g.closest('.sec');if(sec){const bEl=sec.querySelector('b');const tn=bEl&&bEl.nextSibling;if(tn&&tn.nodeType===3){const sp=document.createElement('span');sp.id='cf_pct';sp.textContent=tn.textContent.trim();tn.replaceWith(' ',sp);}
      const bi=sec.querySelector('.bar i');if(bi)bi.id='cf_bar';sec.querySelectorAll('.jobs .dim').forEach(x=>{if(/已 \d+ 次/.test(x.textContent))x.id='cf_hits';});}}
  const A=S.flags.v47auto||{},on=!!A[b.id],last=(S.flags.v47last||{})[b.id];const jb=el.querySelector('[data-cr="assign"]');const host=jb?jb.parentElement:null;
  if(host&&!host.querySelector('[data-v47auto]')){const bt=document.createElement('button');bt.className='btn'+(on?' on':'');bt.dataset.v47auto='1';bt.textContent=(on?'✔ ':'')+'🔁 連續'+(b.type==='forge'?'打造':'煉製')+(on&&A[b.id].k?`：${(b.type==='forge'?GEAR:PILLS)[A[b.id].k].n}`:last&&!on?`（${(b.type==='forge'?GEAR:PILLS)[last.k].n}）`:'');bt.title='指派的弟子在爐邊時，完成後自動再開同一爐（材料不足會停止）';host.appendChild(bt);}}
{const _ft=fireTap;fireTap=function(b){if(!b||!b.craft||b.craft.cd>0)return _ft(b);const h0=b.craft.hits,f0=b.craft.fire;_ft(b);if(!b.craft)return;const good=b.craft.fire>f0||b.craft.hits>h0||Math.abs(fireGauge()-0.75)<0.12;
  snd(good?(b.craft.hits>h0?'perfect':'hit'):'miss');fx(good?'ring':'boom',b.i+1,b.j+1,good?'#ffe27a':'#ff9a6a');
  const el=document.getElementById('craft');if(el&&craftOpen){const g=el.querySelector('.gauge');const box=(g&&g.closest('.sec'))||el;box.classList.remove('v47shake','v47flash','v47miss');void box.offsetWidth;box.classList.add('v47shake',good?'v47flash':'v47miss');
    if(g){const s=document.createElement('span');s.className='v47spark'+(good?'':' bad');s.textContent=good?(b.craft.hits>h0?'完美！':'鏗！'):'偏了';s.style.left=(fireGauge()*100)+'%';g.appendChild(s);setTimeout(()=>s.remove(),700);}
    setTimeout(()=>box.classList.remove('v47shake','v47flash','v47miss'),360);}};}

// ---------- 週期邏輯 ----------
function v47Tick(dt){V47.t+=dt;if(V47.t<1)return;V47.t=0;
  for(const u of S.units){if(u.dead)continue;if(u.kind==='disciple')v47Talent(u);if(u.inj&&S.time>=u.inj.t){u.inj=null;floater(u.x,u.y,'傷癒','#9fe8b0');}
    if(v47Major(u)&&u.xiu>=needXiu(u)&&u.kind==='disciple'&&!u.brkLock&&(u.v170Hold||S.flags.v170off)){const c=breakConds(u);if(!(c.auto&&c.ok))v47Ready(u,c);}}
  v47RaidTick();}
{const _tk=tickV045;tickV045=function(dt){_tk(dt);try{v47Tick(dt);}catch(e){console.warn(e);}};}
{const _fv=frameV045;frameV045=function(dt){_fv(dt);try{V47.ut-=dt;if(V47.ut<=0){V47.ut=0.4;v47PanelRefresh();if(S&&S.time!=null&&!S.dg)v47RaidTick();v47RenderBanners();v47PauseReturn();}}catch(e){console.warn(e);}};}

// ---------- 初始化（DOM／CSS／事件）＋匯出 ----------
function initV047(){
  const st=document.createElement('style');st.textContent=`
#v47ban{position:fixed;left:auto;right:calc(var(--sar,0px) + 10px);transform:none;top:calc(var(--tb,44px) + 8px);z-index:60;display:flex;flex-direction:column;gap:4px;pointer-events:none;width:min(300px,42vw);max-width:min(300px,42vw)}
.v47bn{pointer-events:auto;cursor:pointer;display:flex;align-items:center;gap:6px;padding:6px 8px;border-radius:8px;font-weight:bold;font-size:12px;color:#fff;box-shadow:0 2px 8px #000a;line-height:1.3}
.v47bn.raid{background:#b01818;border:2px solid #ff6a5a;animation:v47fl .7s infinite alternate;font-size:13px;letter-spacing:0}
@keyframes v47fl{from{background:#7a0c0c;box-shadow:0 0 6px #f00}to{background:#e8282a;box-shadow:0 0 26px #ff3a2a}}
.v47bn.gold{background:#3a2c10ee;border:1px solid #ffd34d;color:#ffe9a0;font-size:12px}
.v47bn span{flex:1}.v47bn .bx{background:none;border:none;color:inherit;font-size:14px;cursor:pointer;opacity:.75;padding:0 4px}
body.v47raid #toasts{top:calc(var(--tb,44px) + 62px)}
body.v47raid::after{content:'';position:fixed;inset:0;pointer-events:none;z-index:5;box-shadow:inset 0 0 60px #ff000066;animation:v47vg 1s infinite alternate}
@keyframes v47vg{from{opacity:.35}to{opacity:1}}
#v47pause{position:fixed;inset:0;z-index:80;background:#000a;display:none;align-items:center;justify-content:center}
#v47pause.open{display:flex}
#v47pause .pbox{background:#1d1710f5;border:1px solid #8a6a3a;border-radius:12px;padding:12px 14px;width:min(900px,96vw);max-height:92vh;display:flex;flex-direction:column;color:#e8dcc0}
#v47pause h3{margin:0 0 8px}#v47pause .pcol{display:flex;gap:12px;min-height:0;flex:1}#v47pause .pmenu{display:flex;flex-direction:column;gap:6px;min-width:150px}
#v47pause .pbody{flex:1;overflow:auto;max-height:74vh;font-size:13px;line-height:1.55}#v47pause .ptabs{display:flex;flex-wrap:wrap;gap:4px;margin-bottom:8px}#v47pause .ptabs .btn{padding:3px 8px;font-size:12px}
table.v47t{border-collapse:collapse;font-size:12px;width:100%}.v47t td,.v47t th{border-bottom:1px solid #4a3a26;padding:3px 4px;text-align:left;vertical-align:top}
@media (max-width:640px){#v47pause .pcol{flex-direction:column}#v47pause .pmenu{flex-direction:row;flex-wrap:wrap;min-width:0}#v47pause .pmenu .btn{flex:1 1 30%;font-size:12px}}
.v47b{margin:4px 0;font-size:12.5px}.v47b .ok{color:#9fe8b0}.v47b .no{color:#ff9a8a}.v47w{margin-top:4px;font-size:12.5px}#v47um>div{margin-top:3px}
.ccard.v47good{box-shadow:0 0 0 2px #ffd34d99 inset,0 0 10px #ffd34d55}
.v47shake{animation:v47sh .32s}@keyframes v47sh{0%,100%{transform:translateX(0)}20%{transform:translateX(-6px)}40%{transform:translateX(6px)}60%{transform:translateX(-3px)}80%{transform:translateX(3px)}}
.v47flash{box-shadow:0 0 0 2px #ffe27a,0 0 22px #ffb03a;background:#ffb03a22}.v47miss{box-shadow:0 0 0 2px #ff6a5a;background:#ff3a2a18}
.ov .gauge{overflow:visible}.v47spark{position:absolute;top:-22px;transform:translateX(-50%);color:#ffe27a;font-weight:bold;font-size:15px;text-shadow:0 0 6px #ff8a00;animation:v47up .7s forwards;pointer-events:none;white-space:nowrap}.v47spark.bad{color:#ff9a8a;text-shadow:0 0 6px #a00}
@keyframes v47up{to{top:-44px;opacity:0}}
.v47rs{font-size:11.5px;color:#cdbb92;margin:0 4px}`;document.head.appendChild(st);
  const root=document.getElementById('root')||document.body;
  const ban=document.createElement('div');ban.id='v47ban';ban.className='ui';document.body.appendChild(ban);
  const pz=document.createElement('div');pz.id='v47pause';pz.className='ui';document.body.appendChild(pz);
  const rb=document.getElementById('b_roster');if(rb&&!document.getElementById('b_pause')){const b=document.createElement('button');b.className='btn tbtn';b.id='b_pause';b.title='暫停（Esc）';b.textContent='⏸';rb.parentElement.insertBefore(b,rb);b.addEventListener('click',()=>openPause(true));}
  const mb=document.getElementById('b_new');if(mb&&!document.getElementById('b_pausepc')){const b=document.createElement('button');b.className='btn';b.id='b_pausepc';b.innerHTML='暫停<span class="pc-only" style="display:inline"> (Esc)</span>';mb.parentElement.insertBefore(b,mb);b.addEventListener('click',()=>openPause(true));}
  ban.addEventListener('click',ev=>{const x=ev.target.closest('[data-bnx]');if(x){v47BannerOff(x.dataset.bnx);v47RenderBanners();ev.stopPropagation();return;}
    const d=ev.target.closest('[data-bn]');if(!d)return;const B=V47.banners[d.dataset.bn];if(B&&B.click)B.click();if(B&&B.cls==='gold'){v47BannerOff(d.dataset.bn);v47RenderBanners();}ev.stopPropagation();});
  pz.addEventListener('click',ev=>{if(ev.target===pz){openPause(false);return;}const a=ev.target.closest('[data-pz]');if(a){pauseAct(a.dataset.pz);return;}
    const s=ev.target.closest('[data-sys]');if(s){V47.sysK=+s.dataset.sys;const body=pz.querySelector('.pbody');const sc=body?body.scrollTop:0;pz.innerHTML=pauseHtml('sys');const b2=pz.querySelector('.pbody');if(b2)b2.scrollTop=0;}});
  document.addEventListener('click',ev=>{const t=ev.target;if(!t||!t.closest)return;let x;
    if(x=t.closest('[data-v47brk]')){const u=unitById(+x.dataset.v47brk);if(u)tryBreak(u);panelKeyCache=null;cultKey=null;return;}
    if(x=t.closest('[data-v47ap]')){autoPickCands(recBid);recKey=null;renderRec(true);return;}
    if(x=t.closest('[data-v47auto]')){const b=bById(craftB);if(!b)return;const A=S.flags.v47auto=S.flags.v47auto||{};
      if(A[b.id]){delete A[b.id];toast('已關閉連續'+(b.type==='forge'?'打造':'煉製'));}
      else{const last=(S.flags.v47last||{})[b.id];const k=b.craft?b.craft.k:last&&last.k;if(!k){toast('先開一爐，之後指派的弟子會自動續造');return;}A[b.id]={k,inf:b.craft?!!craftInf:!!(last&&last.inf)};toast(`連續${b.type==='forge'?'打造':'煉製'}「${(b.type==='forge'?GEAR:PILLS)[k].n}」：弟子在爐邊時自動續造`);if(!b.craft)v47AutoCraft(b);}
      const el=document.getElementById('craft');if(el)el._v47k=null;craftKey=null;renderCraft();}});}
{const _x=XW045;XW045=function(){const o=_x();try{initV047();}catch(e){console.warn('v047 init',e);}
  Object.assign(o,{v47:{V47,V47R,INJ,PROF,brkInfo,brkHtml,openPause,get pauseOpen(){return V47.pause;},pauseAct,autoPickCands,candScore,candGood,weaponFit,unitExtraHtml,v47Ready,v47RaidState,v47RaidTick,v47RenderBanners,
    banners:()=>Object.keys(V47.banners),bannerText:()=>Object.values(V47.banners).map(b=>b.txt),wudaoMul,profCheck,hasProf,v47Talent,talentTags,snd,v47NearDeath,v47Fail,injOf,bdescHtml,v47Look}});return o;};}
