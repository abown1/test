
// ================== v0.4.5：道侶與雙修（含蓄呈現：靈氣交融的打坐） ==================
Object.assign(TUNE,{bondDaolv:70,bondMax:100,daolvMaxPlayer:1,dualDur:60,dualCd:240,dualRate:0.9,dualFull:1.0,dualMortal:0.35,dualTp:0.03,dualTpMortal:0.01,dualTpCap:0.09,dualJobRate:0.45,giftCd:45,giftFood:5,giftBond:4});
const SHENG={0:2,2:1,1:3,3:4,4:0};// 五行相生：金→水→木→火→土→金
function bk(a,b){a=a.id!=null?a.id:a;b=b.id!=null?b.id:b;return a<b?a+'_'+b:b+'_'+a;}
function bond(a,b){return (S.bond&&S.bond[bk(a,b)])||0;}
function addBond(a,b,n){if(!a||!b||a===b)return;const k=bk(a,b);S.bond[k]=clamp((S.bond[k]||0)+n,0,TUNE.bondMax);}
function daolvOf(u){if(!u)return null;const id=u.id!=null?u.id:u;for(const d of S.daolv){if(d[0]===id)return unitById(d[1]);if(d[1]===id)return unitById(d[0]);}return null;}
function isDaolv(a,b){const d=daolvOf(a);return !!d&&d.id===b.id;}
function bondLabel(v){return v>=90?'情深意篤':v>=TUNE.bondDaolv?'心意相通':v>=45?'知己':v>=20?'熟識':'陌生';}
function compat(a,b){let m=1;const t=[];
  if(a.lg&&b.lg){const x=a.lg.e,y=b.lg.e;if(x===y){m*=1.25;t.push(`同屬${LG_EL[x]}靈根・共鳴`);}else if(SHENG[x]===y||SHENG[y]===x){m*=1.4;t.push(`${LG_EL[x]}${LG_EL[y]}相生・互補`);}else if(KE[x]===y||KE[y]===x){m*=0.9;t.push(`${LG_EL[x]}${LG_EL[y]}相剋・略有排斥`);}}
  const bs=[a.body,b.body].sort();if(bs[0]===3&&bs[1]===4){m*=1.3;t.push('火靈體＋寒冰體・陰陽互濟');}else if(a.body===b.body&&a.body!==0){m*=1.1;t.push('同體共鳴');}
  if(a.body===6||b.body===6){m*=1.15;t.push('仙武之體');}
  return {m:+m.toFixed(2),t:t.length?t.join('、'):'平常'};}
function dualMul(a,b){const c=compat(a,b).m;const full=Math.min(a.realm,b.realm)>=4;return c*(full?TUNE.dualFull:TUNE.dualMortal);}
// ---- 結為道侶 ----
function canDaolv(a,b){if(!a||!b||a.dead||b.dead)return '不在';if(daolvOf(a))return `${nm(a)}已有道侶`;if(daolvOf(b))return `${nm(b)}已有道侶`;if(bond(a,b)<TUNE.bondDaolv)return `好感需達 ${TUNE.bondDaolv}（目前 ${Math.floor(bond(a,b))}）`;return '';}
function formDaolv(a,b){if(canDaolv(a,b))return false;S.daolv.push([a.id,b.id]);addBond(a,b,5);fx('ring',a.x,a.y,'#ffb0d0');fx('ring',b.x,b.y,'#ffb0d0');toast(`💞 ${nm(a)}與${nm(b)}結為道侶，從此可一同雙修`);pbarKey=null;panelKeyCache=null;return true;}
function breakDaolv(a){const b=daolvOf(a);if(!b)return false;S.daolv=S.daolv.filter(d=>!(d.includes(a.id)&&d.includes(b.id)));addBond(a,b,-30);endDual(a);toast(`${nm(a)}與${nm(b)}解除了道侶關係`);panelKeyCache=null;return true;}
function showChoice(t,txt,opts,src){if(evOpen)return false;evCur={k:'_c',t,txt,o:opts};evOpen=true;renderEv(null,src||'道侶');$$('evdlg').querySelector('h3').textContent='💞 '+t;return true;}
function askDaolv(u){const p=player();const why=canDaolv(p,u);if(why){toast(why);return false;}const c=compat(p,u);
  return showChoice('結為道侶',`${u.name}與你朝夕相處、心意相通。結為道侶後，可以一同「雙修」──兩人對坐調息、靈氣交融，修為增長更快。<br><span class="dim">相性：${c.t}（×${c.m}）。你最多 ${TUNE.daolvMaxPlayer} 位道侶。</span>`,
    [{l:'💞 結為道侶',f:()=>{formDaolv(p,u);return `${u.name}微微一笑，鄭重地向你行了一禮。從今以後，你們是彼此的道侶。`;}},{l:'再等等',f:()=>'你們相視一笑，來日方長。'}]);}
function askBreak(u){const d=daolvOf(u);if(!d)return false;return showChoice('解除道侶',`確定要解除${nm(u)}與${nm(d)}的道侶關係嗎？好感會大幅下降。`,[{l:'解除',f:()=>{breakDaolv(u);return '兩人各自珍重。';}},{l:'取消',f:()=>'你改變了主意。'}]);}
function giftTo(u){const p=player();if(!u||u.kind!=='disciple')return false;if((u.giftT||0)>S.time){toast(`剛送過禮，${Math.ceil(u.giftT-S.time)} 秒後再送吧`);return false;}if(S.res.food<TUNE.giftFood){toast(`需要食物 ${TUNE.giftFood}`);return false;}
  S.res.food-=TUNE.giftFood;u.giftT=S.time+TUNE.giftCd;addBond(p,u,TUNE.giftBond);u.mood=Math.min(100,(u.mood||60)+6);u.loyal=Math.min(100,u.loyal+1);floater(u.x,u.y,'好感 +'+TUNE.giftBond,'#ffb0d0');panelKeyCache=null;return true;}
// ---- 雙修工作階段 ----
// S.duals=[{a,b,t,dur,mode:'player'|'ai'|'job'}]（不存檔；讀檔後重開）
let duals=[];
function dualOf(u){return duals.find(d=>d.a===u.id||d.b===u.id);}
function startDual(u,mode){const p=player();mode=mode||'player';const a=mode==='player'?p:u,b=mode==='player'?u:daolvOf(u);
  if(!a||!b||a.dead||b.dead){return false;}if(!isDaolv(a,b)){toast('需要先結為道侶');return false;}
  if(S.dg){toast('副本中無法雙修');return false;}if(dualOf(a)||dualOf(b))return false;
  const k=bk(a,b);if(mode==='player'&&(S.dualCd[k]||0)>S.time){toast(`真氣尚未平復，${Math.ceil(S.dualCd[k]-S.time)} 秒後才能再次雙修`);return false;}
  if(mode==='player'){if(nearestEnemy(p.x,p.y,6)){toast('附近有敵人，無法靜心雙修');return false;}
    if(S.interior){const bb=bById(S.interior.bid);if(b.inside&&b.inB!==bb.id)exitBuilding(b);if(!b.inside){b.task=null;b.path=[];enterBuildingUnit(b,bb);}}
    else if(b.inside)exitBuilding(b);
    p.task={type:'meditate',t0:S.time};p.path=[];p.dvx=p.dvy=0;}
  b.dualS=a.id;a.dualS=b.id;if(mode==='player'){b.aiJob=null;b.holdT=S.time;}
  duals.push({a:a.id,b:b.id,t:0,dur:mode==='job'?1e9:mode==='ai'?TUNE.dualDur:TUNE.dualDur,mode,gain:0,sit:false});
  if(mode==='player')toast(`☯ 與${nm(b)}對坐雙修（約 ${TUNE.dualDur} 秒；相性 ×${compat(a,b).m}）`);
  return true;}
function endDual(u,why){const d=dualOf(u);if(!d)return;duals=duals.filter(x=>x!==d);const a=unitById(d.a),b=unitById(d.b);
  for(const x of [a,b])if(x){x.dualS=null;if(x.kind==='disciple'){x.medit=false;if(d.mode==='ai'){x.aiJob=null;x.thought=null;x.aiT=S.time+rr([3,8]);}}}
  if(a&&b&&d.t>=Math.min(d.dur,TUNE.dualDur)*0.95){const full=Math.min(a.realm,b.realm)>=4,tp=full?TUNE.dualTp:TUNE.dualTpMortal;for(const x of [a,b])x.tpB=Math.min(TUNE.dualTpCap,(x.tpB||0)+tp);addBond(a,b,3);
    if(d.mode==='player'){S.dualCd[bk(a,b)]=S.time+TUNE.dualCd;toast(`☯ 雙修圓滿：兩人各得修為約 ${Math.round(d.gain)}，突破成功率 +${Math.round(tp*100)}%`);}
    else S.dualCd[bk(a,b)]=S.time+TUNE.dualCd*0.5;S.stats.duals=(S.stats.duals||0)+1;}
  else if(d.mode==='player'&&why)toast('雙修中斷：'+why);}
function dualSpot(a){const c=sectCenter();const k=(a.id*37)%8,ang=k/8*Math.PI*2;const f=nearestFree(c.x+Math.cos(ang)*5,c.y+Math.sin(ang)*5,startComp);return f?{x:f.i+0.5,y:f.j+0.5}:c;}
function tickDuals(dt){if(S.dg)return;for(const d of duals.slice()){const a=unitById(d.a),b=unitById(d.b);
    if(!a||!b||a.dead||b.dead||!isDaolv(a,b)){endDual(a||b||{id:d.a},'有人離開');continue;}
    if(d.mode==='player'){const p=a;if(!(p.task&&p.task.type==='meditate')){endDual(p,'你起身了');continue;}
      const near=S.interior?(b.inside&&b.inB===S.interior.bid):dist(p.x,p.y,b.x,b.y)<1.6;d.sit=near;}
    else if(d.mode==='job'){if(a.job!=='dual'||b.job!=='dual'){endDual(a);continue;}d.sit=(a.inside&&b.inside&&a.inB===b.inB)||(!a.inside&&!b.inside&&dist(a.x,a.y,b.x,b.y)<1.6);}
    else{d.sit=(a.inside&&b.inside&&a.inB===b.inB)||(!a.inside&&!b.inside&&dist(a.x,a.y,b.x,b.y)<1.6);if(a.job||b.job||a.task||b.task){endDual(a);continue;}}
    if(!d.sit){d.wait=(d.wait||0)+dt;if(d.wait>45){endDual(a,'沒有會合');}continue;}
    d.t+=dt;const m=dualMul(a,b),rate=(d.mode==='job'?TUNE.dualJobRate:TUNE.dualRate)*m;
    for(const x of [a,b]){const g=1.2*rate*cultMul(x)*dt;const before=x.xiu;gainXiu(x,g);d.gain+=Math.max(0,(x.xiu-before))/2;}
    addBond(a,b,dt*0.02);
    if(d.t>=d.dur)endDual(a);}}
// 弟子這一側：走到伴侶身邊坐下
function dualUnit(u,dt){const d=dualOf(u);if(!d){u.dualS=null;return false;}const o=unitById(d.a===u.id?d.b:d.a);if(!o)return false;
  if(d.mode==='player'){if(u.inside){u.dvx=u.dvy=0;u.working=true;return true;}const r=walkTo(u,dt,o.x+0.9,o.y+0.2,0.5);if(r){faceTo(u,o.x,o.y);u.medit=true;}return true;}
  // 弟子＋弟子：有練武閣就一起進去，沒有就到宗門附近的空地
  if(hasBuilt('lianwu')&&!d.noLw){const lead=unitById(Math.min(d.a,d.b));if(u!==lead&&lead&&lead.jobB)u.jobB=lead.jobB;doInJob(u,dt,'seclude');if((d.wait||0)>12){d.noLw=true;d.wait=0;if(u.inside)exitBuilding&&exitBuilding(u);}return true;}
  const lead=unitById(Math.min(d.a,d.b)),sp=d.spot||(d.spot=dualSpot(lead));const tx=u===lead?sp.x:sp.x+0.9,ty=sp.y+(u===lead?0:0.2);const r=walkTo(u,dt,tx,ty,0.5);if(r===null){endDual(u);return true;}if(r){faceTo(u,u===lead?sp.x+0.9:sp.x,sp.y);u.medit=true;}else u.medit=false;return true;}
{const _dj=doJob;doJob=function(u,dt){if(u.dualS!=null&&dualOf(u)){dualUnit(u,dt);return;}if(u.job==='dual'){const o=daolvOf(u);if(!o||o.dead){u.job=null;toast(`${nm(u)}沒有道侶，無法雙修`);return;}
    if(o.job==='dual'&&!dualOf(u)&&!dualOf(o))startDual(u,'job');else if(!dualOf(u)){u.dvx=u.dvy=0;}if(dualOf(u)){dualUnit(u,dt);}return;}
  return _dj(u,dt);};}
{const _aj=assignJob;assignJob=function(u,job,arg){if(job==='dual'){if(!u||u.kind!=='disciple')return false;const o=daolvOf(u);if(!o||o.kind!=='disciple'){toast(`${nm(u)}需要一位弟子道侶才能指派雙修`);return false;}endDual(u);
    for(const x of [u,o]){if(x.inside)exitBuilding(x);x.aiJob=null;x.job='dual';x.jobB=null;x.task=null;x.path=[];}return true;}
  if(u&&u.dualS!=null){const d=dualOf(u);if(d&&d.mode!=='player')endDual(u);}if(u&&u.job==='dual'&&job!=='dual'){const o=daolvOf(u);if(o&&o.job==='dual'){o.job=null;o.holdT=S.time;}}
  return _aj(u,job,arg);};}
// AI 也可能主動找道侶雙修
{const _ad=aiDecide;aiDecide=function(u,force){const o=daolvOf(u);if(o&&o.kind==='disciple'&&!dualOf(u)&&!dualOf(o)&&aiEligible(o)&&(S.dualCd[bk(u,o)]||0)<=S.time&&rnd()<0.35){if(startDual(u,'ai')){const d=dualOf(u);for(const x of [u,o]){x.aiJob={k:'dual',until:S.time+TUNE.dualDur+40};x.thought='☯';x.thT=S.time;}return 'dual';}}return _ad(u,force);};}
{const _da=doAiJob;doAiJob=function(u,dt){if(u.aiJob&&u.aiJob.k==='dual'){if(!dualOf(u)||S.time>u.aiJob.until){endDual(u);u.aiJob=null;u.thought=null;return;}dualUnit(u,dt);return;}return _da(u,dt);};}
AI_ICON.dual='☯';AI_NAME.dual='與道侶雙修';
// ---- 好感自然成長（共同工作、跟隨、聊天、副本） ----
let bondT=0;
function tickBond(dt){bondT+=dt;if(bondT<10)return;bondT=0;const p=player();const ds=disciples().filter(u=>!u.dead);
  const byB={};for(const u of ds){if(u.inside&&u.inB!=null)(byB[u.inB]=byB[u.inB]||[]).push(u);if(p&&(u.job==='follow'||dist(u.x,u.y,p.x,p.y)<6))addBond(p,u,0.25);}
  for(const k in byB){const g=byB[k];if(g.length>8)continue;for(let i=0;i<g.length;i++)for(let j=i+1;j<g.length;j++)addBond(g[i],g[j],0.35);}
  for(const u of ds)if(u.aiJob&&u.aiJob.k==='social'&&u.aiJob.tid){const t=unitById(u.aiJob.tid);if(t&&dist(u.x,u.y,t.x,t.y)<1.8)addBond(u,t,1.2);}
  // #172 弟子之間好感夠高：自己決定是否結為道侶（不再跳窗請宗主作主；主機判定）
  if(!S.dg&&!(typeof v49Client==='function'&&v49Client())&&rnd()<0.25){for(let i=0;i<ds.length;i++)for(let j=i+1;j<ds.length;j++){const a=ds[i],b=ds[j],k=bk(a,b);if(bond(a,b)>=TUNE.bondDaolv&&!daolvOf(a)&&!daolvOf(b)&&!a.noDaolv&&!b.noDaolv&&(S.bondAsk[k]||0)<=S.time){S.bondAsk[k]=S.time+TUNE.v172.cd;
    v172Decide(a,b);return;}}}}
// #172 自主結緣：相性 × 好感 × 性格
Object.assign(TUNE,{v172:{base:0.35,cd:600,split:0.3,splitBond:15,pers:{豪爽:1.35,熱心:1.3,好動:1.25,溫和:1.05,沉穩:1,倔強:0.9,謹慎:0.75,孤僻:0.65}}});
function v172Chance(a,b){const T=TUNE.v172,c=compat(a,b).m,bd=bond(a,b);const pf=((T.pers[a.person]||1)+(T.pers[b.person]||1))/2;return clamp(T.base*c*(1+(bd-TUNE.bondDaolv)/60)*pf,0.02,0.95);}
function v172Decide(a,b){const ch=v172Chance(a,b),c=compat(a,b);const L=S.flags.v172log=S.flags.v172log||[];let r;
  if(rnd()<ch){formDaolv(a,b);r='form';}
  else if(c.m<1&&rnd()<TUNE.v172.split){addBond(a,b,-TUNE.v172.splitBond);toast(`${nm(a)}與${nm(b)}相性不合（${c.t}），緣分暫告一段落`);r='split';}
  else r='wait';
  L.push({t:S.time,a:a.id,b:b.id,r,ch:+ch.toFixed(2)});if(L.length>30)L.shift();return r;}
{const _dx=dgExit;dgExit=function(keep){const D=S.dg;const ids=D?S.units.filter(u=>!u.dead).map(u=>u.id):[];const r=_dx(keep);if(D&&keep){const us=ids.map(unitById).filter(Boolean),p=player();for(const u of us)if(u!==p)addBond(p,u,6);
    if(us.length<=30)for(let i=0;i<us.length;i++)for(let j=i+1;j<us.length;j++)if(us[i].kind==='disciple'&&us[j].kind==='disciple')addBond(us[i],us[j],2);}return r;};}
{const _dr=dgEnter;dgEnter=function(k,m,h){for(const d of duals.slice())endDual(unitById(d.a)||{id:d.a});return _dr(k,m,h);};}
// 仙緣事件附帶好感
{const fe=EVENTS.find(e=>e.k==='festival');if(fe){const f0=fe.o[0].f;fe.o[0].f=()=>{const p=player();for(const d of disciples())addBond(p,d,3);return f0()+'（全體好感 +3）';};}
 const de=EVENTS.find(e=>e.k==='demon');if(de){const f0=de.o[0].f;de.o[0].f=()=>{const r=f0();const d=disciples().slice().sort((a,b)=>(b.loyal||0)-(a.loyal||0))[0];if(d)addBond(player(),d,8);return r+'（好感 +8）';};}}
EVENTS.push({k:'lantern',t:'月下同遊',txt:'今夜月色正好，一名弟子提著燈籠來邀你到山腰賞月。',o:[
  {l:'欣然同往',f:()=>{const ds=disciples().filter(u=>!u.dead);if(!ds.length)return '（宗門裡還沒有弟子）';const d=ds.slice().sort((a,b)=>bond(player(),b)-bond(player(),a))[0];addBond(player(),d,10);d.mood=Math.min(100,(d.mood||60)+15);return `你與${d.name}在月下談天說地，聊了很多修行心得。（好感 +10）`;}},
  {l:'婉拒，繼續修煉',f:()=>{const p=player();gainXiu(p,needXiu(p)*0.08/TUNE.xiuMul);return '你獨自打坐到天明。（修為小增）';}}]});
// ---- 室內：一對打坐的人並肩／對坐，畫交織靈氣 ----
{const _ip=interiorPeople;interiorPeople=function(b){const out=_ip(b);const R=ROOM[b.type].R;
  for(const d of duals){if(!d.sit)continue;const A=out.find(o=>o.u.id===d.a),B=out.find(o=>o.u.id===d.b);if(!A||!B||A.moving||B.moving)continue;
    if(A.player){B.x=clamp(A.x+0.95,0.5,R-0.5);B.y=A.y;}else{B.x=clamp(A.x+0.95,0.5,R-0.5);B.y=A.y;}
    A.face=1;B.face=-1;A.act='sit';B.act='sit';A.dual=1;A.pair=B;B.dual=2;}
  return out;};}
function drawQiSwirl(x1,y1,x2,y2,tt,full){const cx=(x1+x2)/2,cy=(y1+y2)/2-14,rx=Math.max(18,Math.abs(x2-x1)*0.9),ry=rx*0.55;
  ctx.save();ctx.globalCompositeOperation='lighter';const gr=ctx.createRadialGradient(cx,cy,2,cx,cy,rx*1.3);gr.addColorStop(0,`rgba(255,220,240,${full?0.35:0.22})`);gr.addColorStop(1,'rgba(160,200,255,0)');ctx.fillStyle=gr;ctx.beginPath();ctx.ellipse(cx,cy,rx*1.3,ry*1.6,0,0,Math.PI*2);ctx.fill();
  for(let s=0;s<2;s++){ctx.strokeStyle=s?'rgba(150,220,255,0.85)':'rgba(255,170,210,0.85)';ctx.lineWidth=2;ctx.beginPath();
    for(let k=0;k<=40;k++){const a=tt*1.6+s*Math.PI+k/40*Math.PI*3,r=k/40;const x=cx+Math.cos(a)*rx*r,y=cy+Math.sin(a)*ry*r-k*0.35;k?ctx.lineTo(x,y):ctx.moveTo(x,y);}ctx.stroke();}
  for(let k=0;k<6;k++){const a=tt*2+k;const x=cx+Math.cos(a)*rx*0.8,y=cy+Math.sin(a*1.3)*ry-((tt*20+k*9)%30);ctx.fillStyle=k%2?'rgba(255,200,230,0.8)':'rgba(170,230,255,0.8)';ctx.beginPath();ctx.arc(x,y,1.6,0,Math.PI*2);ctx.fill();}
  ctx.restore();ctx.lineWidth=1;}
{const _dp=drawPerson;drawPerson=function(b,o,tt){if(o.dual===1&&o.pair){const a=P(o.x,o.y),c=P(o.pair.x,o.pair.y);drawQiSwirl(a.x,a.y,c.x,c.y,tt,Math.min(o.u.realm,o.pair.u.realm)>=4);}return _dp(b,o,tt);};}
// 野外：兩人對坐時畫靈氣漩渦
{const _dw=drawV045World;drawV045World=function(){_dw();const tt=performance.now()/1000;for(const d of duals){if(!d.sit)continue;const a=unitById(d.a),b=unitById(d.b);if(!a||!b||a.inside||b.inside)continue;const p=P(a.x,a.y),q=P(b.x,b.y);drawQiSwirl(p.x,p.y,q.x,q.y,tt,Math.min(a.realm,b.realm)>=4);}};}
// ---- 面板、總表、存檔 ----
function bondBtns(u){if(!u||u.kind!=='disciple')return '';const p=player();const v=bond(p,u),d=daolvOf(u);let h=`<div class="jobs"><span class="tag" data-tip="bond" style="background:#5a2a40">💗 好感 ${Math.floor(v)}・${bondLabel(v)}</span><button class="btn" data-act="gift">🎁 贈禮</button>`;
  if(d&&d.kind==='player'){const cd=(S.dualCd[bk(p,u)]||0)-S.time,on=dualOf(u);h+=`<span class="tag" style="background:#6a2a50">💞 你的道侶</span><button class="btn ${on?'on':'pri'}" data-act="dual" ${cd>0&&!on?'disabled':''}>☯ ${on?'雙修中':cd>0?`雙修（${Math.ceil(cd)}秒）`:'雙修'}</button><button class="btn warn" data-act="undaolv">解除</button>`;}
  else if(d)h+=`<span class="tag" style="background:#6a2a50">💞 道侶：${esc(d.name)}</span><button class="btn ${u.job==='dual'?'on':''}" data-job="dual">☯ 雙修</button>`;
  else if(v>=TUNE.bondDaolv&&!daolvOf(p))h+=`<button class="btn pri" data-act="daolv">💞 結為道侶</button>`;
  return h+'</div>';}
{const _pa=panelActV045;panelActV045=function(act,b,us,el){const u=unitById(selUnits[0]);
  if(act==='gift'){giftTo(u);return true;}if(act==='daolv'){askDaolv(u);return true;}if(act==='undaolv'){askBreak(u);return true;}
  if(act==='dual'){if(dualOf(u))endDual(u,'你結束了雙修');else startDual(u,'player');panelKeyCache=null;return true;}return _pa(act,b,us,el);};}
function rosterExtra(u){const d=daolvOf(u);let s='';if(d)s+=`<span class="sm" style="color:#ffb0d0">💞${d.kind==='player'?'你':esc(d.name)}</span>`;if(dualOf(u))s+='<span class="sm" style="color:#a0e0ff">☯雙修中</span>';const g=u.eq?Object.values(u.eq).filter(Boolean):[];if(g.length)s+=`<span class="sm dim">⚔${g.length}件</span>`;return s;}
{const _sn=snapV045;snapV045=function(o){_sn(o);o.v45.bond=S.bond;o.v45.daolv=S.daolv;o.v45.dualCd=S.dualCd;o.v45.bondAsk=S.bondAsk;return o;};}
{const _ap=applyV045;applyV045=function(d){duals=[];_ap(d);const v=d.v45||{};S.bond=v.bond||{};S.daolv=(v.daolv||[]).filter(x=>unitById(x[0])&&unitById(x[1]));S.dualCd=v.dualCd||{};S.bondAsk=v.bondAsk||{};for(const u of S.units){u.dualS=null;if(u.job==='dual'&&!daolvOf(u))u.job=null;}};}
{const _ns=newState;newState=function(){const s=_ns.apply(this,arguments);s.bond={};s.daolv=[];s.dualCd={};s.bondAsk={};return s;};}
{const _nw=newGame;newGame=function(){duals=[];return _nw.apply(this,arguments);};}
{const _tk=tickV045;tickV045=function(dt){_tk(dt);tickDuals(dt);tickBond(dt);};}
{const _tt=tipText;tipText=function(k){if(k==='bond')return `好感：一起工作、跟隨你、聊天、贈禮、一起闖副本都會增加。達到 ${TUNE.bondDaolv} 可結為道侶，之後能一同雙修（對坐調息、靈氣交融），修為更快、突破成功率小幅提升。`;return _tt(k);};}
GUIDE_CATS.splice(7,0,['dual','道侶・雙修']);
{const _gb=guideBody;guideBody=function(c){if(c!=='dual')return _gb(c);
  return `<p>雙修是兩位道侶對坐調息、讓彼此的靈氣交融流轉的修煉法門。</p><table>${gRow('好感','你與弟子、弟子與弟子之間都有好感。一起工作（同一棟建築）、跟隨你、聊天、🎁 贈禮（食物 '+TUNE.giftFood+'）、一起闖副本、部分仙緣奇遇都會提升。')+
  gRow('道侶',`好感達 ${TUNE.bondDaolv} 可結為道侶（會跳出確認視窗）。你最多 ${TUNE.daolvMaxPlayer} 位道侶，每位弟子 1 位。弟子之間情投意合時，會請你作主。`)+
  gRow('雙修',`在道侶弟子的面板按「☯ 雙修」：你會盤坐、道侶走到身邊對坐，約 ${TUNE.dualDur} 秒。兩人修為都加快，結束時突破成功率 +${TUNE.dualTp*100}%（凡人階段 +${TUNE.dualTpMortal*100}%）。之後冷卻 ${TUNE.dualCd/60} 分鐘。在練武閣等室內也可以，會看到兩人並坐、靈氣交織。起身或被攻擊就會中斷。`)+
  gRow('弟子雙修','弟子道侶可以指派「☯ 雙修」工作（有練武閣就一起進去，沒有就在宗門空地對坐）；閒暇時也會自己去雙修。總表會顯示 💞 與 ☯。')+
  gRow('相性',`五行相生（金→水→木→火→土→金）×1.4、同屬性共鳴 ×1.25、相剋 ×0.9；火靈體＋寒冰體陰陽互濟 ×1.3、同體 ×1.1、仙武之體 ×1.15。`)+
  gRow('境界',`兩人都到「煉氣」才有完整效果；凡人階段（武徒～宗師）只有 ${TUNE.dualMortal*100}% 效果。`)}</table>`;};}
function bondPK(u){if(!u||u.kind!=='disciple')return '';const p=player();if(!p)return '';const d=daolvOf(u);return 'b'+Math.floor(bond(p,u)/5)+(d?'d'+d.id:'')+(dualOf(u)?'D':'')+(d&&d.kind==='player'?'c'+Math.ceil(Math.max(0,(S.dualCd[bk(p,u)]||0)-S.time)/5):'');}
ROSTER_FILTERS.splice(9,0,['dual','雙修'],['alchemy','煉丹'],['forge','鍛造']);
{const _x=XW045;XW045=function(){const o=_x();Object.assign(o,{bond:(a,b)=>bond(a,b),addBond,daolvOf,formDaolv,breakDaolv,startDual,endDual,dualOf,compat,dualMul,giftTo,askDaolv,tickDuals,tickBond});Object.defineProperty(o,'duals',{get:()=>duals});return o;};}
