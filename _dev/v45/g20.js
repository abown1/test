
// ================== v0.4.6g：大殿閉關、領悟／醍醐灌頂、罡氣／靈氣護體、建造工匠、批量鍛造／熔鍊、建築專屬加成、標題畫面 ==================
const V49={t:0,ut:0,blv:{},toastT:0,qiWarn:0,tl:{raf:0,t0:0,parts:[],w:0,h:0,last:0}};
TUNE.v49={hall:[4,10,20],chk:10,lwChance:0.0015,lwMul:1.8,lwDur:300,thChance:0.003,thFrac:0.2,xwLw:0.0005,xwTh:0.001,bLw:0.0003,bTh:0.0003,cbWin:5,
  gqCd:8,gqRefill:2,gangFrac:0.4,lingFrac:0.5,qiPerDmg:4,qiBase:1000,qiGrow:1.5,qiSub:0.1,qiRegen:0.01,qiMedRegen:0.03,
  spellCost:80,abCost:{charge:30,sweep:30,fireball:60,flysword:80,jindan:150},bdMul:1.6,dgCap:20,smelt:0.5,batchDisc:0.9,xqRate:0.002,xqMax:0.3};
UNIT_KEEP.push('qi','gq','lwT','xq','v49cc');
function v49Client(){return typeof NET!=='undefined'&&NET&&NET.role==='client';}
function v49St(){const F=S.flags;let G=F.v49;if(!G||typeof G!=='object')G=F.v49={};if(G.trial==null)G.trial=false;if(G.lw==null)G.lw=0;if(G.th==null)G.th=0;if(G.smelt==null)G.smelt=0;return G;}
function v49Sect(u){return u&&!u.dead&&(u.kind==='player'||u.kind==='disciple');}

// ---------- #92 建築專屬加成（同類取最高等級）----------
const B49={
  hall:{n:'閉關聖地',f:lv=>`你在殿內閉關修煉 ×${TUNE.v49.hall[lv-1]}，聽道弟子同沾道韻`},
  altar:{n:'慧眼識才',f:lv=>`候選人悟性 +${3*lv}`},
  house:{n:'安養生息',f:lv=>`脫戰弟子每秒回復氣血 ${(0.3*lv).toFixed(1)} %`},
  wudao:{n:'尚武之風',f:lv=>`全宗攻擊 +${3*lv} %`},
  lianwu:{n:'吐納之所',f:lv=>`靈氣回復 +${15*lv} %（同類取最高有效等級，不疊加；有靈氣者生效）`},
  library:{n:'藏經悟道',f:lv=>`修煉或戰鬥時，領悟機率 +${(TUNE.v49.bLw*100*lv).toFixed(1)} %`},
  alchemy:{n:'丹香繚繞',f:lv=>`全宗修煉速度 +${3*lv} %`},
  forge:{n:'百鍊成鋼',f:lv=>`熔鍊回收 +${10*lv} %、批量工時 -${5*lv} %`},
  xianyuan:{n:'仙緣天降',f:lv=>`修煉或戰鬥時，醍醐灌頂機率 +${(TUNE.v49.bTh*100*lv).toFixed(1)} %`}
};
function v49Lv(t){const v=V49.blv[t];return v==null?0:v;}
function v49CalcLv(){const o={};for(const b of S.buildings){if(!b.built||b.broken)continue;o[b.type]=Math.max(o[b.type]||0,blv(b));}V49.blv=o;}
function v49BonusTxt(t,lv){const B=B49[t];return B?`★${B.n}：${B.f(Math.max(1,lv))}`:'';}
{const _x=lvEffect;lvEffect=function(b,lv){let s=_x(b,lv);try{if(B49[b.type])s+='、'+v49BonusTxt(b.type,lv);}catch(e){}return s;};}

// ---------- 靈氣／護盾 ----------
function qiMaxFor(u){if(!u||u.realm<4)return 0;const r=Math.min(u.realm,10);return Math.round(TUNE.v49.qiBase*Math.pow(TUNE.v49.qiGrow,r-4)*(1+TUNE.v49.qiSub*(u.sub||0)));}
function gqType(u){return !u?null:u.realm>=4?'ling':u.realm===3?'gang':null;}
function gqMaxFor(u){const t=gqType(u);if(t==='gang')return Math.round(u.maxhp*TUNE.v49.gangFrac);if(t==='ling')return Math.round(qiMaxFor(u)*TUNE.v49.lingFrac/TUNE.v49.qiPerDmg);return 0;}
function v49SyncPools(u){const qm=qiMaxFor(u);if(u.qiMax!==qm){const f=u.qiMax>0&&u.qi!=null?u.qi/u.qiMax:1;u.qiMax=qm;u.qi=qm?Math.round(qm*clamp(f,0,1)):0;}
  if(u.qi==null)u.qi=u.qiMax||0;
  const gm=gqMaxFor(u);if(u.gqMax!==gm){const f=u.gqMax>0&&u.gq!=null?u.gq/u.gqMax:1;u.gqMax=gm;u.gq=gm?Math.round(gm*clamp(f,0,1)):0;}
  if(u.gq==null)u.gq=u.gqMax||0;u.gqT=gqType(u);}
function v49PoolTick(u,dt){v49SyncPools(u);
  if(u.qiMax>0&&u.qi<u.qiMax){let r=TUNE.v49.qiRegen;if(u.medit||(u.task&&u.task.type==='meditate'))r=TUNE.v49.qiMedRegen;/* #151：待在室內不再自動視同打坐，改由房屋／聚靈陣倍率決定 */r*=1+0.15*v49Lv('lianwu');u.qi=Math.min(u.qiMax,u.qi+u.qiMax*r*dt);}
  if(u.gqMax>0){if((u.gqCd||0)>0)u.gqCd=Math.max(0,u.gqCd-dt);else if(u.gq<u.gqMax)u.gq=Math.min(u.gqMax,u.gq+u.gqMax/TUNE.v49.gqRefill*dt);}}
// 被動護盾：在所有既有傷害處理之前吸收
{const _du=dmgUnit;dmgUnit=function(src,u,amt){try{if(u&&v49Sect(u)&&amt>0&&u.gqMax>0){const sr=src&&src.realm||0;let f=1,skip=false;
      if(u.gqT==='gang'){if(sr>=5)skip=true;else if(sr===4)f=1.2;}
      if(!skip){u.gqCd=TUNE.v49.gqCd;if(u.gq>0){const need=amt*f,a=Math.min(u.gq,need);u.gq-=a;amt-=a/f;u._gqHit=performance.now();
          if(!u._gqF||S.time-u._gqF>1.2){u._gqF=S.time;floater(u.x,u.y-0.3,u.gqT==='gang'?'罡氣':'靈氣護體',u.gqT==='gang'?'#ffd98a':'#9fe8ff');}
          if(u.gq<=0){u.gq=0;fx('ring',u.x,u.y,'#ffffff');if(u.kind==='player')floater(u.x,u.y-0.6,u.gqT==='gang'?'罡氣破碎':'護體破碎','#ff9a7a');}
          if(amt<=0.01)return;}}}}catch(e){console.warn(e);}return _du(src,u,amt);};}
// 主動「氣勁護體」改為被動
{const _h=hasAb;hasAb=function(u,ab){if(ab==='guard')return false;return _h(u,ab);};}
// 法術、兵器技耗靈氣
{const _cs=castSpell;castSpell=function(u,e,key){if(u&&u.qiMax>0){const c=TUNE.v49.spellCost;if((u.qi||0)<c){v49QiWarn(u);return false;}const r=_cs(u,e,key);if(r!==false)u.qi=Math.max(0,u.qi-c);return r;}return _cs(u,e,key);};}
function v49QiWarn(u){if(u.kind!=='player')return;if(S.time-V49.qiWarn<4)return;V49.qiWarn=S.time;floater(u.x,u.y-0.5,'靈氣不足','#9fc8ff');}
// 衝鋒貼身也能用（原本要 2 格外，貼著敵人時一直「太近」放不出來）：手動施放、其他技能都沒放時，直接短衝撞上去（同樣傷害與擊暈）
{const _ta=tryAbilities;tryAbilities=function(u,e,manual){const r=_ta(u,e,manual);if(r||!manual||!e||e.dead||u.dash||!hasAb(u,'charge')||u.acd.charge>0)return r;
  const d=dist(u.x,u.y,e.x,e.y);if(d>=2)return r;u.dash={tid:e.id,t:0.35};u.acd.charge=ABIL.charge.cd;faceTo(u,e.x,e.y);floater(u.x,u.y,'衝鋒','#ffd080');return true;};}
{const _ta=tryAbilities;tryAbilities=function(u,e,manual){if(!u||!(u.qiMax>0))return _ta(u,e,manual);const C=TUNE.v49.abCost,blk=[];u.acd=u.acd||{};
  for(const k in C){if((u.qi||0)<C[k]&&!(u.acd[k]>0)){u.acd[k]=0.0001;blk.push(k);}}
  const a0=Object.assign({},u.acd);let r;try{r=_ta(u,e,manual);}finally{for(const k of blk)if(u.acd[k]===0.0001)u.acd[k]=0;}
  for(const k in C){if(blk.includes(k))continue;if((u.acd[k]||0)>(a0[k]||0)+0.01)u.qi=Math.max(0,u.qi-C[k]);}
  if(!r&&manual&&blk.length)v49QiWarn(u);return r;};}

// ---------- #95/#96 領悟、醍醐灌頂 ----------
{const _gx=gainXiu;gainXiu=function(u,amt){if(u&&amt>0){u._cx=S.time;if(V49.hallP&&u.kind==='player')amt*=V49.hallP;if(u.kind==='player')V49.pgx=(V49.pgx||0)+amt;}return _gx(u,amt);};}
{const _cm=cultMul;cultMul=function(u){let m=_cm(u);if(u&&u.lwT&&S&&u.lwT>S.time)m*=TUNE.v49.lwMul;if(v49Sect(u)){const al=v49Lv('alchemy');if(al)m*=1+0.03*al;}return m;};}
function lwChance(u){return TUNE.v49.lwChance+(isXW(u)?TUNE.v49.xwLw:0)+TUNE.v49.bLw*v49Lv('library');}
function thChance(u){return TUNE.v49.thChance+(isXW(u)?TUNE.v49.xwTh:0)+TUNE.v49.bTh*v49Lv('xianyuan');}
// #198：只有「修煉中」或「戰鬥中」（W 秒內打過人或被打）才累積判定時間；閒晃、走路、採集、建造都不算
function y198Cult(u){if(!u||u.dead)return false;if(u.medit||(u.task&&u.task.type==='meditate'))return true;
  {const jb=u.job||(u.aiJob&&u.aiJob.job);if(u.inside&&jb&&typeof INJOB!=="undefined"&&INJOB[jb]&&INJOB[jb].xiu&&INJOB[jb].act!=="sleep")return true;}
  if(u.job==='dual'&&u._cx!=null&&S.time-u._cx<1.5)return true;return false;}
function y198Fight(u){const W=TUNE.v49.cbWin;return S.time-(u.lastHit==null?-99:u.lastHit)<=W||S.time-(u.lastAtk==null?-99:u.lastAtk)<=W;}
function y198Ok(u){return !capped(u)&&(y198Cult(u)||y198Fight(u));}
function v49Notify(u,txt,col){floater(u.x,u.y-0.8,txt,col);fx('break',u.x,u.y,col);
  if(u.kind==='player'||selUnits.includes(u.id)||S.time-V49.toastT>20){V49.toastT=S.time;toast(`${nm(u)}${txt.replace(/^[^\s]+\s/,'')}`);}}
function v49Lingwu(u){u.lwT=S.time+TUNE.v49.lwDur;v49St().lw++;v49Notify(u,'✦ 領悟！修煉速度 +80%（一天）','#ffe27a');if(u.kind==='player'){try{snd('perfect');}catch(e){}try{v47Banner('v49lw',{txt:'✦ 靈光乍現：你有所領悟，修煉速度 +80%（持續一天）',cls:'gold',ttl:8});}catch(e){}}}
function v49Tihu(u){const need=needXiu(u);if(!(need>0))return 0;const g=Math.max(1,Math.round(need*TUNE.v49.thFrac));const was=V49.hallP;V49.hallP=0;try{gainXiu(u,g/(TUNE.xiuMul||1));}finally{V49.hallP=was;}
  v49St().th++;v49Notify(u,`☀ 醍醐灌頂！修為 +${g}`,'#9fffe0');if(u.kind==='player'){try{snd('ready');}catch(e){}try{v47Banner('v49th',{txt:`☀ 醍醐灌頂：豁然開朗，修為 +${g}`,cls:'gold',ttl:6});}catch(e){}}return g;}
function v49CultCheck(u,force){if(!force&&capped(u))return;if(force==='lw'||(!force&&rnd()<lwChance(u)))v49Lingwu(u);if(force==='th'||(!force&&rnd()<thChance(u)))v49Tihu(u);}

// ---------- #88 宗門大殿閉關／聽道 ----------
function hallMul(b){return TUNE.v49.hall[clamp(blv(b),1,3)-1];}
function v49HallB(){const I=S.interior;if(!I)return null;const b=bById(I.bid);return b&&b.type==='hall'?b:null;}
// #165：講道只在宗主坐上寶座打坐時生效（b.v165＝寶座上的玩家 id；主機權威）
function v165Holder(b){if(!b||b.type!=='hall'||b.v165==null)return null;const u=unitById(b.v165);if(!u||u.dead||!(u.task&&u.task.type==='meditate')||!u.v165||u.v165!==b.id){b.v165=null;return null;}return u;}
function hallRate(b){const h=v165Holder(b);return h?1.2*cultLoc(h,1.3,b):0;}
function playerHallRate(){return hallRate(v49HallB());}
{const _x=updateInteriorPlayer;updateInteriorPlayer=function(p,dt){const b=v49HallB();V49.hallP=0;/* #153：閉關倍率改在 cultLoc() 內計算 */try{return _x(p,dt);}finally{V49.hallP=0;}};}
// 聽道：max(宗主 1/3、自身 ×1.3)；不超過 #153 的總倍率上限（若自身已高於上限則維持自身）
function v165Boost(u,b,J,m){const pr=hallRate(b);if(!(pr>0))return null;const cm=cultMul(u),own=J.xiu*m*cm;let t=Math.max(pr/3,own*1.3);
  const capR=J.xiu*m*v62MaxMul(u);t=Math.max(own,Math.min(t,capR));return {t,own,pr,capR,mul:t/(J.xiu*cm),capped:t>=capR-1e-9};}
{const _x=inJobMul;inJobMul=function(u,b,J){const m=_x(u,b,J);try{if(J&&J.act==='listen'&&b&&b.type==='hall'){const r=v165Boost(u,b,J,m);u.v165L=r?{t:S.time,r:r.t/Math.max(1e-9,r.own),capped:r.capped}:null;if(r)return r.mul;}}catch(e){}return m;};}

// ---------- #89 升級／建造中斷後可繼續 ----------
function v49Resume(bid){const b=bById(bid);if(!b||(b.built&&!b.upg)){toast('這座建築不需要施工');return 0;}
  let us=selUnits.map(unitById).filter(u=>u&&!u.dead&&!u.inside&&(u.kind==='disciple'||u.kind==='player'));
  if(!us.length)us=disciples().filter(u=>!u.dead&&!u.inside&&u.job==='builder');
  if(!us.length)us=disciples().filter(u=>!u.dead&&!u.inside&&(!u.job||u.job==='gather')).sort((a,c)=>distRect(a.x,a.y,b.i,b.j,3)-distRect(c.x,c.y,b.i,b.j,3)).slice(0,2);
  if(!us.length){const p=player();if(p&&!p.dead&&!S.interior)us=[p];}
  us.forEach(u=>setTask(u,{type:'build',bid:b.id}));
  toast(us.length?`派 ${us.length} 人繼續${b.upg?'升級':'建造'}「${bName(b)}」`:'沒有可派的人手：選取弟子或指派「建造工匠」');panelKeyCache=null;return us.length;}
{const _x=panelActV045;panelActV045=function(act,b,us,el){if(act==='v49resume'){if(b)v49Resume(b.id);return true;}return _x(act,b,us,el);};}
function v49PanelInject(){if(selBuilding==null)return;const b=bById(selBuilding);if(!b||(b.built&&!b.upg))return;const el=document.getElementById('panel');if(!el)return;
  if(el.querySelector('[data-act="v49resume"]'))return;const j=el.querySelector('.jobs');if(!j)return;const bt=document.createElement('button');bt.className='btn pri';bt.dataset.act='v49resume';
  const n=S.units.filter(u=>!u.dead&&u.task&&u.task.type==='build'&&u.task.bid===b.id).length;bt.textContent=`🔨 ${b.upg?'繼續升級':'繼續建造'}${n?`（${n} 人施工中）`:''}`;j.insertBefore(bt,j.firstChild);}
{const _rp=renderPanel;renderPanel=function(){_rp();try{v49PanelInject();}catch(e){}};}
{const _pk=panelKey;panelKey=function(){let k=_pk();try{if(selUnits.length===1){const u=unitById(selUnits[0]);if(u)k+='|q'+Math.floor((u.qi||0)/100)+'g'+Math.floor((u.gq||0)/10)+(u.lwT>S.time?'L':'')+(u.xq?'x'+Math.floor(u.xq*100):'');}
  else if(selBuilding!=null){const b=bById(selBuilding);if(b&&(!b.built||b.upg))k+='|w'+S.units.filter(u=>!u.dead&&u.task&&u.task.type==='build'&&u.task.bid===b.id).length;}}catch(e){}return k;};}

// ---------- #91 建造工匠 ----------
function v49BuildTarget(u){let best=null,bd=1e9;for(const b of S.buildings){if(b.built&&!b.upg)continue;const d=distRect(u.x,u.y,b.i,b.j,BUILD[b.type].size);if(d<bd){bd=d;best=b;}}
  if(best)return {type:'build',bid:best.id};if(S.res.wood>0){const r=damagedBuilding(u.x,u.y,60);if(r)return {type:'repair',bid:r.id};}return null;}
{const _x=assignJob;assignJob=function(u,job,arg){if(job!=='builder')return _x(u,job,arg);if(!u||u.kind!=='disciple')return false;
  if(u.inside)try{exitBuilding(u);}catch(e){}u.aiJob=null;u.job='builder';u.jobB=null;u.jst=null;u.guardAt=null;setTask(u,null);return true;};}
{const _x=doJob;doJob=function(u,dt){if(u.job!=='builder')return _x(u,dt);if(u.bdT&&S.time<u.bdT){u.dvx=u.dvy=0;return;}const t=v49BuildTarget(u);
  if(t){setTask(u,t);return;}u.bdT=S.time+2;const c=sectCenter();if(dist(u.x,u.y,c.x,c.y)>4){if(!u.path.length||u.needRepath)pathTo(u,c.x+1.5,c.y+2);followPath(u,dt);}else{u.dvx=u.dvy=0;u.path=[];}};}
function bdMul(u){let m=TUNE.v49.bdMul;try{if(BODIES[u.body].n==='厚土體')m+=0.2;}catch(e){}return m;}
{const _x=buildStep;buildStep=function(u,dt,b){if(!u||u.job!=='builder'||!b)return _x(u,dt,b);const p0=b.built?(b.upg?b.upg.p:null):b.progress;_x(u,dt,b);
  if(!S.buildings.includes(b))return;const ex=bdMul(u)-1;
  if(!b.built&&p0!=null&&b.progress>p0){b.progress+=(b.progress-p0)*ex;if(b.progress>=1)completeBuilding(b);}
  else if(b.built&&b.upg&&p0!=null&&b.upg.p>p0){b.upg.p+=(b.upg.p-p0)*ex;if(b.upg.p>=1)finishUpgrade(b);}};}
{const _x=repairStep;repairStep=function(u,dt,b){if(!u||u.job!=='builder'||!b)return _x(u,dt,b);const h0=b.hp;_x(u,dt,b);if(b.hp>h0&&b.hp<b.maxhp){b.hp=Math.min(b.maxhp,b.hp+(b.hp-h0)*(bdMul(u)-1));if(b.hp>=b.maxhp){b.hp=b.maxhp;if(b.broken){b.broken=false;toast(`「${bName(b)}」修繕完成，恢復運作`);}u.task=null;}}};}
{const _x=jobButtons;jobButtons=function(us){let h=_x(us);try{const ds=us.filter(u=>u.kind==='disciple');if(ds.length&&h.indexOf('data-job="builder"')<0){const on=ds.every(u=>u.job==='builder');
  h=h.replace('<button class="btn '+(ds.every(u=>!u.job)?'on':'')+'" data-job="none">',`<button class="btn ${on?'on':''}" data-job="builder">🔨 建造工匠</button>$&`);}}catch(e){}return h;};}
{const _x=jobSelect;jobSelect=function(u){let h=_x(u);try{h=h.replace('<option value="guard"',`<option value="builder" ${u.job==='builder'?'selected':''}>建造工匠</option><option value="guard"`);}catch(e){}return h;};}
{const _x=jobRadial;jobRadial=function(us){const o=_x(us);try{o.splice(Math.max(0,o.length-2),0,['建造工匠','🔨',()=>{let n=0;us.forEach(u=>{if(assignJob(u,'builder'))n++;});if(n)toast(`${n} 名弟子：建造工匠`);}]);}catch(e){}return o;};}
{const _x=pbarIcon;pbarIcon=function(u){if(u&&u.job==='builder')return '🔨';return _x(u);};}
ROSTER_FILTERS.splice(ROSTER_FILTERS.length-2,0,['builder','建造']);

// ---------- #90 批量鍛造、熔鍊 ----------
function batchCost(k,n,inf){const G=GEAR[k],c={};for(const q in G.cost)c[q]=G.cost[q];if(inf){c.lingshi=(c.lingshi||0)+3;c.core=(c.core||0)+1;}const d=n>=5?TUNE.v49.batchDisc:1;for(const q in c)c[q]=Math.ceil(c[q]*n*d);return c;}
function v49Batch(bid,k,n,inf){const b=bById(bid);n=clamp(n|0,1,20);if(!b||b.type!=='forge'||!b.built||b.broken){toast('需要可用的鍛造坊');return false;}if(b.craft){toast('爐火正旺，請等這一爐完成');return false;}
  const G=GEAR[k];if(!G)return false;if(G.lv&&blv(b)<G.lv){toast(`需要鍛造坊 Lv${G.lv}`);return false;}const c=batchCost(k,n,inf);if(!canPay2(c)){toast('材料不足：批量需要 '+Object.keys(c).map(q=>cname(q)+' '+c[q]).join('、'));return false;}
  pay2(c);const T=TUNE.craftBase.gear*(0.4+0.6*n)*(1-0.05*v49Lv('forge'));b.craft={k,t:0,T,fire:0,hits:0,cd:0,inf:!!inf,n};
  toast(`開爐批量打造 ${G.n} ×${n}${n>=5?'（材料九折）':''}${crafters(b).length?'':'：記得指派弟子鍛造或站在旁邊'}`);try{craftKey=null;}catch(e){}return true;}
{const _fc=finishCraft;finishCraft=function(b){const c=b&&b.craft;if(!c||b.type!=='forge'||!(c.n>1))return _fc(b);const n=c.n,out=[];const t0=toast;toast=function(){};
  try{for(let i=0;i<n;i++){b.craft=Object.assign({},c,{n:1});const it=_fc(b);if(it)out.push(it);}}finally{toast=t0;b.craft=null;}
  const qs=[0,0,0,0,0];for(const it of out)qs[it.q]++;toast(`批量打造完成：${GEAR[c.k].n} ×${out.length}（${qs.map((x,q)=>x?QN[q]+' '+x:'').filter(Boolean).join('、')}）`);return out[0]||null;};}
function eqIds(){const s=new Set();for(const u of S.units)if(u.eq)for(const k in u.eq)if(u.eq[k])s.add(u.eq[k].id);return s;}
function smeltYield(it){const G=GEAR[it.t];if(!G)return {};const f=TUNE.v49.smelt*(1+0.25*it.q)*(1+0.1*v49Lv('forge')),o={};for(const k in G.cost){const v=Math.floor(G.cost[k]*f);if(v>0)o[k]=v;}if(it.el>=0)o.lingshi=(o.lingshi||0)+1;return o;}
function v49Smelt(sel){if(!S.buildings.some(b=>b.type==='forge'&&b.built&&!b.broken)){toast('需要建成鍛造坊才能熔鍊');return 0;}const eq=eqIds();
  let list=S.inv.filter(it=>GEAR[it.t]&&!eq.has(it.id));if(typeof sel==='number')list=list.filter(it=>it.id===sel);else if(sel==='q0')list=list.filter(it=>it.q===0);else if(sel==='q01')list=list.filter(it=>it.q<=1);else return 0;
  if(!list.length){toast('沒有可熔鍊的裝備');return 0;}const tot={};for(const it of list){const y=smeltYield(it);for(const k in y)tot[k]=(tot[k]||0)+y[k];}
  const ids=new Set(list.map(it=>it.id));S.inv=S.inv.filter(it=>!ids.has(it.id));for(const k in tot){if(k in MAT_NAMES)S.mats[k]=(S.mats[k]||0)+tot[k];else S.res[k]=(S.res[k]||0)+tot[k];}
  v49St().smelt+=list.length;toast(`熔鍊 ${list.length} 件裝備，回收 ${Object.keys(tot).map(k=>cname(k)+' '+tot[k]).join('、')||'（無）'}`);try{craftKey=null;}catch(e){}return list.length;}
let v49BN=5;
function v49CraftHtml(b){const eq=eqIds(),inv=S.inv.filter(it=>GEAR[it.t]&&!eq.has(it.id)),q0=inv.filter(it=>it.q===0).length,q1=inv.filter(it=>it.q===1).length;let h='';
  if(b.craft&&b.craft.n>1)h+=`<div class="sec v49sec"><b>批量中：${GEAR[b.craft.k].n} ×${b.craft.n}</b></div>`;
  else if(!b.craft){h+=`<div class="sec v49sec"><b>⚒ 批量鍛造</b>　<span class="dim sm">一次開爐打造多件，每件各自擲品質；5 件以上材料九折</span><div class="jobs">數量：${[3,5,10].map(n=>`<button class="btn ${v49BN===n?'on':''}" data-v49bn="${n}">×${n}</button>`).join('')}</div><div class="jobs">`+
    GEAR_ORDER.filter(k=>!GEAR[k].lv||blv(b)>=GEAR[k].lv).map(k=>{const ok=canPay2(batchCost(k,v49BN,craftInf));return `<button class="btn ${ok?'':'dis'}" data-v49bk="${k}" title="${Object.entries(batchCost(k,v49BN,craftInf)).map(([q,v])=>cname(q)+' '+v).join('、')}">${GEAR[k].n}×${v49BN}</button>`;}).join('')+'</div></div>';}
  h+=`<div class="sec v49sec"><b>🔥 熔鍊</b>　<span class="dim sm">把用不到的裝備熔回材料（未穿戴的才會熔）</span><div class="jobs"><button class="btn ${q0?'':'dis'}" data-v49sm="q0">熔鍊全部凡品（${q0}）</button><button class="btn ${q0+q1?'':'dis'}" data-v49sm="q01">熔鍊凡品＋良品（${q0+q1}）</button></div>`;
  const few=inv.slice(0,8);if(few.length)h+='<div class="jobs">'+few.map(it=>`<button class="btn sm" data-v49sm="${it.id}" style="color:${QC[it.q]}">熔 ${itemName(it)}</button>`).join('')+(inv.length>8?`<span class="dim sm">…等 ${inv.length} 件</span>`:'')+'</div>';
  return h+'</div>';}
{const _x=renderCraft;renderCraft=function(){_x();try{const el=document.getElementById('craft');const b=bById(craftB);if(!el||!b||!craftOpen||b.type!=='forge')return;
  const eq=eqIds();const key=[b.id,!!b.craft,b.craft&&b.craft.n,v49BN,craftInf,S.inv.map(i=>i.id).join('.'),[...eq].join('.'),JSON.stringify(S.mats),JSON.stringify(S.res)].join('|');
  let box=el.querySelector('#v49cf');if(box&&box._k===key)return;if(!box){box=document.createElement('div');box.id='v49cf';el.appendChild(box);}box._k=key;box.innerHTML=v49CraftHtml(b);}catch(e){console.warn(e);}};}

// ---------- #87 秘境怪物增量上限 ----------
let v49DgOv=null;
{const _x=dgPartyScale;dgPartyScale=function(){const s=_x();return v49DgOv!=null?Math.min(s,v49DgOv):s;};}
{const _x=dgSpawnRoom;dgSpawnRoom=function(r){const D=S.dg;if(!D)return _x(r);try{const cap=TUNE.v49.dgCap;v49DgOv=null;
    if(r.boss){const base=D.kind==='xf'?4:2;v49DgOv=Math.pow((base+cap)/base,2);}else{const b0=(2+r.k*0.6+D.tier*0.2)*1.25*(D.hard?1.3:1);v49DgOv=(Math.round(b0)+cap)/b0;}
    return _x(r);}finally{v49DgOv=null;}};}
{const _x=dgBoss;dgBoss=function(dt){const D=S.dg;if(!D)return _x(dt);const p0=D.party,lim=(D.kind==='xf'?3:6)*TUNE.v49.dgCap;if(p0>lim)D.party=lim;try{return _x(dt);}finally{if(S.dg===D)D.party=p0;}};}

// ---------- 其他建築加成 ----------
{const _x=dmgEnemy;dmgEnemy=function(src,e,amt,col){if(src&&v49Sect(src)){const l=v49Lv('wudao');if(l)amt*=1+0.03*l;}return _x(src,e,amt,col);};}
{const _x=spawnBatch;spawnBatch=function(b,opt){const n=_x(b,opt);try{const l=b?blv(b):0;for(const c of S.cands){if(c.bid===b.id&&!c.v49w){c.v49w=1;c.wu=Math.min(100,(c.wu||0)+3*l);}}}catch(e){}return n;};}

// ---------- #94 仙氣／仙門試煉 ----------
function xqTarget(u){return u&&u.realm>=10?Math.min(TUNE.v49.xqMax,0.075*((u.sub||0)+1)):0;}
function v49Trial(){const G=v49St();if(!G.trial){toast('需要地仙大圓滿、仙氣達 30% 才能叩問仙門');return false;}
  try{v47Banner('v49trial',{txt:'⛩ 仙門試煉：天門雲深，試煉之路尚在開闢（後續版本開放）',cls:'gold',ttl:10});}catch(e){}toast('仙門試煉：天門已感應到你的仙氣，試煉內容將在後續版本開放');G.trialT=S.time;return true;}

// ---------- 週期 ----------
function v49Tick(dt){V49.t+=dt;const st=V49.t;if(st<0.25)return;V49.t=0;if(v49Client())return;v49St();v49CalcLv();try{v50DefTick(st);}catch(e){console.warn(e);}
  const hl=v49Lv('house');
  for(const u of S.units){if(!v49Sect(u))continue;v49PoolTick(u,st);
    if(hl&&u.kind==='disciple'&&u.hp<u.maxhp&&S.time-(u.lastHit||-99)>6)u.hp=Math.min(u.maxhp,u.hp+u.maxhp*0.003*hl*st);
    if(y198Ok(u)){u.v49ca=(u.v49ca||0)+st;if(u.v49ca>=1){u.v49ca-=1;u.v49cc=(u.v49cc||0)+1;if(u.v49cc>=TUNE.v49.chk){u.v49cc=0;v49CultCheck(u);}}}
    const xt=xqTarget(u);if(xt>0||u.xq){u.xq=u.xq||0;if(u.xq<xt)u.xq=Math.min(xt,u.xq+TUNE.v49.xqRate*st);else if(u.xq>xt)u.xq=xt;
      if(u.kind==='player'&&u.xq>=TUNE.v49.xqMax-1e-6&&!S.flags.v49.trial){S.flags.v49.trial=true;toast('⛩ 仙氣圓滿三成！仙門試煉已開啟（修煉面板／角色資訊）');try{v47Banner('v49trial',{txt:'⛩ 仙氣三成，仙門試煉開啟｜點擊叩問仙門',cls:'gold',ttl:20,click:()=>v49Trial()});}catch(e){}}}}}
{const _tk=tickV045;tickV045=function(dt){_tk(dt);try{v49Tick(dt);}catch(e){console.warn(e);}};}

// ---------- 介面 ----------
function v49UnitHtml(u){let h='';if(!v49Sect(u))return h;
  if(u.gqMax>0){const gang=u.gqT==='gang';const cur=gang?Math.round(u.gq):Math.round(u.gq*TUNE.v49.qiPerDmg),mx=gang?u.gqMax:Math.round(u.gqMax*TUNE.v49.qiPerDmg);
    h+=`<div><b style="color:#c9a6ff">${gang?'🛡 護體罡氣':'💠 靈氣護體'}</b>（被動，紫條在氣血條上方） ${cur}/${mx}${u.gqCd>0?` <span class="dim sm">冷卻 ${Math.ceil(u.gqCd)} 秒</span>`:''}
      <details class="dt"><summary>詳情</summary>${gang?'吸收傷害的被動護盾（氣血上限 40%）。受到傷害時冷卻重置，8 秒未受傷後 2 秒內回滿。煉氣攻擊者對罡氣傷害 +20%，築基以上直接無視罡氣。':`護盾值為靈力的 50%（每點傷害消耗 ${TUNE.v49.qiPerDmg} 點護盾）。受到傷害時冷卻重置，8 秒未受傷後回滿。`}</details></div>`;}
  if(u.qiMax>0)h+=`<div>🌀 靈氣 <span class="v49bar"><i style="width:${Math.round(u.qi/u.qiMax*100)}%;background:#7fb6ff"></i></span> ${Math.round(u.qi)}/${u.qiMax}　<span class="dim sm">法術 ${TUNE.v49.spellCost}、技能 30～150</span></div>`;
  if(u.lwT&&u.lwT>S.time)h+=`<div style="color:#ffe27a">✦ 領悟中：修煉 ×${TUNE.v49.lwMul}（剩 ${Math.ceil((u.lwT-S.time)/60)} 分）</div>`;
  if(u.realm>=10||u.xq)h+=`<div style="color:#e8d0ff">☁ 仙氣 ${Math.round((u.xq||0)*100)}%／30%${u.kind==='player'&&S.flags.v49&&S.flags.v49.trial?' <button class="btn sm pri" data-v49trial="1">⛩ 仙門試煉</button>':''}</div>`;
  if(u.job==='builder')h+=`<div>🔨 建造工匠：施工速度 ×${bdMul(u).toFixed(1)}，自動前往工地、升級與受損建築</div>`;
  return h;}
{const _ue=unitExtraHtml;unitExtraHtml=function(u){let h=_ue(u);try{h=v49UnitHtml(u)+h;}catch(e){}return h;};}
// （頭頂護盾條／光暈見下方 #7 段落）

// ---------- #97 標題畫面 ----------
const V49_TCSS=`#title.v49t{background:#05060a}
#title.v49t .tbox{align-items:flex-start;justify-content:center;padding-left:calc(var(--sal) + max(7vw,28px));gap:0}
#title.v49t .v49kick{font-size:calc(11px * var(--xwfs,1));letter-spacing:.6em;color:#c9a96a;opacity:0;animation:v49fade 1.6s .2s forwards;text-transform:uppercase;margin-bottom:6px}
#title.v49t .tname{font-family:"STKaiti","KaiTi","BiauKai","DFKai-SB","Kaiti TC","Noto Serif CJK TC","Noto Serif TC","Songti TC",serif;font-size:min(14vw,calc(118px * var(--xwfs,1)));font-weight:900;letter-spacing:.08em;line-height:1.05;color:#f0d08a;filter:drop-shadow(0 0 18px rgba(255,190,90,.25)) drop-shadow(0 4px 2px rgba(0,0,0,.8));text-shadow:none}
#title.v49t .tname .v49c{color:transparent;background:linear-gradient(180deg,#fff6dc 0%,#f0d08a 38%,#b8832e 62%,#6a4614 100%);-webkit-background-clip:text;background-clip:text;display:inline-block;opacity:0;transform:translateY(18px) scale(1.08);filter:blur(8px);animation:v49ink 1.1s cubic-bezier(.2,.7,.2,1) forwards}
#title.v49t .tsub{color:#d8c8a0;letter-spacing:.55em;font-size:calc(14px * var(--xwfs,1));margin:8px 0 26px;opacity:0;animation:v49fade 1.4s 1.1s forwards;font-family:"Noto Serif CJK TC","Noto Serif TC",serif}
#title.v49t .v49rule{width:min(320px,70vw);height:1px;background:linear-gradient(90deg,#c9a96a,rgba(201,169,106,0));margin:-14px 0 22px;opacity:0;animation:v49fade 1.4s 1.2s forwards}
#title.v49t .tmenu{width:min(340px,86vw);gap:2px;opacity:0;animation:v49fade 1.2s 1.4s forwards}
#title.v49t .tmenu .btn{position:relative;text-align:left;background:transparent;border:0;border-radius:0;color:#e9dcc0;font-size:calc(19px * var(--xwfs,1));letter-spacing:.32em;padding:9px 8px 9px 34px;font-family:"Noto Serif CJK TC","Noto Serif TC",serif;transition:color .25s,transform .25s,letter-spacing .35s;text-shadow:0 2px 6px #000}
#title.v49t .tmenu .btn::before{content:"";position:absolute;left:8px;top:50%;width:12px;height:1px;background:#8a7348;transition:width .3s,background .3s,box-shadow .3s}
#title.v49t .tmenu .btn::after{content:"";position:absolute;left:0;right:0;bottom:0;height:1px;background:linear-gradient(90deg,rgba(255,214,140,.55),rgba(255,214,140,0));transform:scaleX(0);transform-origin:left;transition:transform .4s}
#title.v49t .tmenu .btn:not([disabled]):hover,#title.v49t .tmenu .btn:not([disabled]):focus-visible{color:#ffe7b0;transform:translateX(6px);letter-spacing:.4em;outline:none;background:linear-gradient(90deg,rgba(255,200,110,.12),rgba(255,200,110,0))}
#title.v49t .tmenu .btn:not([disabled]):hover::before,#title.v49t .tmenu .btn:not([disabled]):focus-visible::before{width:20px;background:#ffd98a;box-shadow:0 0 8px #ffb44a}
#title.v49t .tmenu .btn:not([disabled]):hover::after,#title.v49t .tmenu .btn:not([disabled]):focus-visible::after{transform:scaleX(1)}
#title.v49t .tmenu .btn:active{transform:translateX(3px) scale(.99)}
#title.v49t .tmenu .btn small{letter-spacing:.05em;color:#a8977a;font-size:calc(11px * var(--xwfs,1))}
#title.v49t .tmenu .btn[disabled]{opacity:.38}
#title.v49t .tver{background:none;color:#8f8068;margin-top:22px;padding:0;letter-spacing:.12em;font-size:calc(11px * var(--xwfs,1));opacity:0;animation:v49fade 1.2s 1.8s forwards}
#title.v49t .seal{border-color:#9e2b1d;color:#d24a35;background:rgba(80,10,5,.25);box-shadow:0 0 18px rgba(210,74,53,.25)}
#title.v49t .v49vig{position:absolute;inset:0;pointer-events:none;background:radial-gradient(ellipse at 62% 45%,rgba(0,0,0,0) 35%,rgba(0,0,0,.72) 100%),linear-gradient(90deg,rgba(0,0,0,.65) 0%,rgba(0,0,0,.15) 45%,rgba(0,0,0,0) 70%)}
#title.v49t .v49grain{position:absolute;inset:-50%;pointer-events:none;opacity:.07;background-image:repeating-radial-gradient(circle at 17% 32%,#fff 0 1px,transparent 1px 3px);animation:v49grain 1.2s steps(6) infinite;mix-blend-mode:overlay}
#title.v49t .v49hint{position:absolute;left:0;right:0;bottom:calc(var(--sab) + 14px);text-align:center;color:#6f6452;font-size:calc(11px * var(--xwfs,1));letter-spacing:.3em;pointer-events:none;opacity:0;animation:v49fade 2s 2.4s forwards}
@keyframes v49ink{to{opacity:1;transform:none;filter:blur(0)}}
@keyframes v49fade{to{opacity:1}}
@keyframes v49grain{0%{transform:translate(0,0)}25%{transform:translate(-3%,2%)}50%{transform:translate(2%,-3%)}75%{transform:translate(-1%,3%)}100%{transform:translate(3%,-1%)}}
@media (max-width:640px){#title.v49t .tbox{align-items:center;justify-content:flex-end;padding-left:calc(var(--sal) + 12px);padding-bottom:calc(var(--sab) + 54px)}#title.v49t .tname{font-size:min(19vw,calc(84px * var(--xwfs,1)));text-align:center}#title.v49t .tsub{letter-spacing:.35em;margin-bottom:22px}#title.v49t .v49rule{margin-left:auto;margin-right:auto;background:linear-gradient(90deg,rgba(201,169,106,0),#c9a96a,rgba(201,169,106,0))}#title.v49t .v49kick{letter-spacing:.4em}#title.v49t .tmenu .btn{text-align:center;padding-left:8px}#title.v49t .tmenu .btn::before{display:none}#title.v49t .tmenu .btn::after{transform-origin:center;background:linear-gradient(90deg,rgba(255,214,140,0),rgba(255,214,140,.55),rgba(255,214,140,0))}#title.v49t .tmenu .btn:not([disabled]):hover{transform:none}#title.v49t .tver{align-self:center}}
@media (orientation:landscape) and (max-height:500px){#title.v49t .tname{font-size:min(15vh,calc(64px * var(--xwfs,1)))}#title.v49t .tsub{margin:4px 0 10px}#title.v49t .v49rule{margin:-4px 0 8px}#title.v49t .tmenu{flex-direction:column;width:min(320px,60vw)}#title.v49t .tmenu .btn{padding:5px 8px 5px 30px;flex:none}}
@media (prefers-reduced-motion:reduce){#title.v49t *{animation-duration:.01s!important;animation-delay:0s!important}}`;
function v49TitleInit(){const t=document.getElementById('title');if(!t)return;
  // 靜態 HTML 已帶 v49t／結構時只補動畫與提示，避免每次啟動長出不同 DOM
  if(!document.getElementById('v49tcss')){const st=document.createElement('style');st.id='v49tcss';st.textContent=V49_TCSS;document.head.appendChild(st);}
  t.classList.add('v49t');
  const nmEl=t.querySelector('.tname');if(nmEl&&!nmEl.querySelector('.v49c')){const s=nmEl.textContent;nmEl.innerHTML=[...s].map((c,i)=>`<span class="v49c" style="animation-delay:${(0.25+i*0.22).toFixed(2)}s">${c}</span>`).join('');}
  const box=t.querySelector('.tbox');if(box&&!box.querySelector('.v49kick')){const k=document.createElement('div');k.className='v49kick';k.textContent='XIANWU · 自凡入仙';box.insertBefore(k,box.firstChild);
    const r=document.createElement('div');r.className='v49rule';const sub=box.querySelector('.tsub');if(sub)sub.after(r);}
  const art=document.getElementById('titleArt');if(art&&!t.querySelector('.v49vig')){const v=document.createElement('div');v.className='v49vig';art.after(v);const g=document.createElement('div');g.className='v49grain';v.after(g);}
  let h=t.querySelector('.v49hint');if(!h){h=document.createElement('div');h.className='v49hint';t.appendChild(h);}
  if(!h.dataset.ok){h.textContent=isTouchUI?'輕觸選單開始修行':'滑鼠移到選項上 · 點擊開始修行';h.dataset.ok='1';}}
function v49TitleSize(){const c=document.getElementById('titleArt');if(!c)return null;const w=c.clientWidth||innerWidth,h=c.clientHeight||innerHeight,d=Math.min(2,devicePixelRatio||1);
  if(V49.tl.w!==w||V49.tl.h!==h||c.width!==Math.round(w*d)){c.width=Math.round(w*d);c.height=Math.round(h*d);V49.tl.w=w;V49.tl.h=h;V49.tl.d=d;V49.tl.ridge=null;}return c;}
function v49Ridges(w,h){const r=mulberry32(11),L=[];for(let k=0;k<5;k++){const pts=[],base=h*(0.5+k*0.1),amp=h*(0.2-k*0.03),ph=r()*10,f1=1.5+r()*2,f2=5+r()*4;
  for(let x=-40;x<=w*1.3+40;x+=6){const t=x/w;pts.push(base-amp*(0.6*Math.abs(Math.sin(t*f1+ph))+0.28*Math.sin(t*f2+ph*2)+0.12*Math.sin(t*21+k)));}L.push({pts,base});}return L;}
function v49TitleFrame(ts){const T=V49.tl;if(!titleOpen){T.raf=0;return;}T.raf=requestAnimationFrame(v49TitleFrame);if(ts-T.last<30)return;T.last=ts;const c=v49TitleSize();if(!c)return;
  const g=c.getContext('2d'),w=T.w,h=T.h,t=(ts-T.t0)/1000,red=matchMedia&&matchMedia('(prefers-reduced-motion: reduce)').matches;g.setTransform(T.d,0,0,T.d,0,0);
  const sky=g.createLinearGradient(0,0,0,h);sky.addColorStop(0,'#05060c');sky.addColorStop(0.45,'#141623');sky.addColorStop(0.75,'#2a1d1a');sky.addColorStop(1,'#0a0807');g.fillStyle=sky;g.fillRect(0,0,w,h);
  const mx=w*0.68,my=h*0.3,mr=Math.min(w,h)*0.12;const halo=g.createRadialGradient(mx,my,mr*0.4,mx,my,mr*4.5);halo.addColorStop(0,'rgba(255,214,150,0.35)');halo.addColorStop(0.3,'rgba(220,120,70,0.12)');halo.addColorStop(1,'rgba(0,0,0,0)');g.fillStyle=halo;g.fillRect(0,0,w,h);
  g.fillStyle='#f3dfb0';g.globalAlpha=0.92;g.beginPath();g.arc(mx,my,mr,0,Math.PI*2);g.fill();g.globalAlpha=1;g.fillStyle='rgba(120,70,40,0.18)';g.beginPath();g.arc(mx+mr*0.25,my-mr*0.1,mr*0.3,0,Math.PI*2);g.arc(mx-mr*0.3,my+mr*0.3,mr*0.18,0,Math.PI*2);g.fill();
  // 天光劍柱
  const pa=0.18+0.08*Math.sin(t*0.8);const pil=g.createLinearGradient(mx-mr*0.12,0,mx+mr*0.12,0);pil.addColorStop(0,'rgba(255,220,160,0)');pil.addColorStop(0.5,`rgba(255,230,180,${pa})`);pil.addColorStop(1,'rgba(255,220,160,0)');g.fillStyle=pil;g.fillRect(mx-mr*0.12,0,mr*0.24,h*0.62);
  if(!T.ridge)T.ridge=v49Ridges(w,h);
  T.ridge.forEach((L,k)=>{const off=red?0:((t*(3+k*5))%(w*0.3));const a=0.35+k*0.15,cc=[[30,34,52],[28,28,40],[24,22,30],[18,15,20],[10,8,10]][k];
    g.fillStyle=`rgba(${cc[0]},${cc[1]},${cc[2]},${Math.min(1,a+0.2)})`;g.beginPath();g.moveTo(0,h);for(let i=0;i<L.pts.length;i++){const x=-40+i*6-off;if(x<-50||x>w+50)continue;g.lineTo(x,L.pts[i]);}g.lineTo(w,h);g.closePath();g.fill();
    const fy=L.base+h*0.02;const fog=g.createLinearGradient(0,fy-h*0.08,0,fy+h*0.06);fog.addColorStop(0,'rgba(180,160,140,0)');fog.addColorStop(1,`rgba(160,140,120,${0.08+0.03*Math.sin(t*0.5+k)})`);g.fillStyle=fog;g.fillRect(0,fy-h*0.08,w,h*0.14);});
  // 霧帶
  for(let k=0;k<3;k++){const y=h*(0.62+k*0.1),x=((t*(12+k*8)+k*300)%(w+600))-300;const fg=g.createRadialGradient(x,y,0,x,y,w*0.35);fg.addColorStop(0,'rgba(200,180,150,0.08)');fg.addColorStop(1,'rgba(200,180,150,0)');g.fillStyle=fg;g.fillRect(0,y-w*0.35,w,w*0.7);}
  // 靈光粒子
  const P_=T.parts,N=Math.round(Math.min(110,w*h/9000));while(P_.length<N)P_.push({x:Math.random()*w,y:h*(0.5+Math.random()*0.6),v:8+Math.random()*26,s:0.6+Math.random()*1.8,ph:Math.random()*6.28,hue:Math.random()<0.75?0:1});
  g.globalCompositeOperation='lighter';for(const p of P_){if(!red){p.y-=p.v*0.03;p.x+=Math.sin(t*0.9+p.ph)*0.35;}if(p.y<-10){p.y=h+10;p.x=Math.random()*w;}
    const fl=0.45+0.55*Math.sin(t*3+p.ph);g.fillStyle=p.hue?`rgba(150,220,255,${0.5*fl})`:`rgba(255,${170+Math.round(60*fl)},90,${0.65*fl})`;g.beginPath();g.arc(p.x,p.y,p.s,0,Math.PI*2);g.fill();}
  g.globalCompositeOperation='source-over';
  // 飛鳥
  g.strokeStyle='rgba(10,10,14,0.7)';g.lineWidth=1.2;for(let k=0;k<4;k++){const bx=((t*(16+k*3)+k*170)%(w+200))-100,by=h*(0.2+k*0.04)+Math.sin(t+k)*6,fl=Math.sin(t*6+k)*3;g.beginPath();g.moveTo(bx-7,by-fl);g.quadraticCurveTo(bx-2,by-3,bx,by);g.quadraticCurveTo(bx+2,by-3,bx+7,by-fl);g.stroke();}}
function v49TitleStart(){try{v49TitleInit();}catch(e){console.warn(e);}const T=V49.tl;T.ridge=null;
  // 啟動／重開標題：確保只有一條 RAF；下一幀強制重算尺寸（PWA 視窗 layout 可能晚一拍）
  if(!T.raf){T.t0=performance.now();T.last=0;T.raf=requestAnimationFrame(v49TitleFrame);}
  else{T.last=0;}
  requestAnimationFrame(()=>{if(typeof titleOpen!=='undefined'&&!titleOpen)return;T.w=0;T.h=0;T.ridge=null;if(!T.raf){T.t0=performance.now();T.last=0;T.raf=requestAnimationFrame(v49TitleFrame);}});}
{const _x=drawTitleArt;drawTitleArt=function(){try{v49TitleStart();}catch(e){console.warn(e);try{_x();}catch(e2){}}};}

// ---------- 存讀檔、初始化 ----------
{const _as=applySave;applySave=function(d){const r=_as.apply(this,arguments);if(r&&S)try{v49St();for(const u of S.units){if(u.v49cc==null)u.v49cc=0;if(u.xq==null&&u.realm>=10)u.xq=0;u.qiMax=undefined;u.gqMax=undefined;if(v49Sect(u))v49SyncPools(u);}}catch(e){}return r;};}
{const _ng=newGame;newGame=function(){const r=_ng.apply(this,arguments);try{v49St();}catch(e){}return r;};}
function initV049(){try{JOB_NAME.builder='建造工匠';}catch(e){}
  ABIL.guard.n='護體罡氣';ABIL.guard.desc='被動：宗師起常駐罡氣護盾（氣血上限 40%）；受傷重置冷卻，8 秒未受傷回滿。煉氣攻擊 +20%，築基以上無視。煉氣後化為「靈氣護體」';
  for(const k in B49){const D=typeof BDESC!=='undefined'&&BDESC[k];if(D&&!D.v49){D.v49=1;const t0=D.t;D.t=b=>{let a=[];try{a=t0(b);}catch(e){}a.push(v49BonusTxt(k,blv(b)));return a;};D.d+='　★專屬加成：'+B49[k].f(1)+'（Lv2、Lv3 提升）。';}
    if(BUILD[k]&&BUILD[k].desc.indexOf('★')<0)BUILD[k].desc+='　'+v49BonusTxt(k,1);}
  document.addEventListener('click',ev=>{const t=ev.target;if(!t||!t.closest)return;let x;
    if(x=t.closest('[data-v49bn]')){v49BN=+x.dataset.v49bn;const el=document.getElementById('v49cf');if(el)el._k=null;renderCraft();return;}
    if(x=t.closest('[data-v49bk]')){v49Batch(craftB,x.dataset.v49bk,v49BN,craftInf);const el=document.getElementById('v49cf');if(el)el._k=null;craftKey=null;renderCraft();return;}
    if(x=t.closest('[data-v49sm]')){const v=x.dataset.v49sm;v49Smelt(/^\d+$/.test(v)?+v:v);const el=document.getElementById('v49cf');if(el)el._k=null;craftKey=null;renderCraft();return;}
    if(x=t.closest('[data-v49trial]')){v49Trial();return;}});
  const st=document.createElement('style');st.id='v49css';st.textContent='.v49bar{display:inline-block;width:70px;height:6px;background:#0008;border-radius:3px;vertical-align:middle;margin:0 4px;overflow:hidden}.v49bar i{display:block;height:100%}#craft .v49sec{border-top:1px dashed #5a4a30;margin-top:8px;padding-top:6px}';document.head.appendChild(st);
  if(typeof titleOpen!=='undefined'&&titleOpen)v49TitleStart();}
SYS_TXT.push(
 ['大殿閉關','在宗門大殿內打坐，修煉速度依等級 ×4／×10／×20',()=>`<span class="tg">Lv1 ×${TUNE.v49.hall[0]}</span><span class="tg">Lv2 ×${TUNE.v49.hall[1]}</span><span class="tg">Lv3 ×${TUNE.v49.hall[2]}</span><span class="tg">聽道弟子＝你 1/3</span><details class="dt"><summary>詳情</summary>你進入宗門大殿後按「打坐」即為閉關。若你坐上寶座打坐（宗主講道），殿內「聽道」的弟子修煉速度取你速度的 1/3；若這比弟子自己的速度還慢，改為自身速度 ×1.3（受總加成上限限制）。</details>`],
 ['領悟／醍醐灌頂','只有修煉中或戰鬥中，每 10 秒各自判定一次',()=>{const T=TUNE.v49,P=x=>(x*100).toFixed(1).replace(/\.0$/,'')+'%';return `<span class="tg">領悟 ${P(T.lwChance)}：修煉 +80%（一天）</span><span class="tg">醍醐灌頂 ${P(T.thChance)}：立得 20% 小階段修為</span><span class="tg">仙武之體 +${P(T.xwLw)}／+${P(T.xwTh)}</span><details class="dt"><summary>詳情</summary>只在「修煉中」（打坐、練武、閉關、聽道、雙修）或「戰鬥中」（${T.cbWin} 秒內打過敵人或被打）才會累積判定時間，每累積 10 秒判定一次；閒晃、走路、採集、建造都不會觸發。領悟是獨立乘區，可與其他加成相乘。長書閣每級領悟 +${P(T.bLw)}、仙緣閣每級醍醐灌頂 +${P(T.bTh)}。</details>`;}],
 ['罡氣／靈氣','宗師起有被動護盾；煉氣後施法耗靈氣',()=>`<span class="tg">罡氣：氣血 40%</span><span class="tg">靈氣護體：靈力 50%</span><span class="tg">煉氣靈力 1000</span><span class="tg">法術 ${TUNE.v49.spellCost} 靈氣</span><details class="dt"><summary>詳情</summary>罡氣受傷即重置 8 秒冷卻，冷卻結束 2 秒回滿；煉氣攻擊者對罡氣 +20%，築基以上無視罡氣。煉氣後罡氣化為靈氣護體（護盾值＝靈力 50%，每點傷害耗 ${TUNE.v49.qiPerDmg} 點）。法術、衝鋒、橫掃、火球、御劍、金丹威壓都消耗靈氣，打坐與待在建築內回復較快，練武閣提升回復。達地仙後靈氣逐步轉為仙氣，地仙大圓滿達 30% 可叩問「仙門試煉」。</details>`],
 ['建造工匠','專職施工的弟子，速度 ×1.6',()=>'<span class="tg">自動找工地</span><span class="tg">升級／修繕</span><span class="tg">厚土體 ×1.8</span><details class="dt"><summary>詳情</summary>指派「建造工匠」的弟子會自動前往最近的工地、升級中或受損的建築。升級做到一半被打斷時，點建築按「繼續升級」即可再派人施工。</details>'],
 ['批量鍛造／熔鍊','鍛造台可一次打造多件、熔回爛裝備',()=>'<span class="tg">×3／×5／×10</span><span class="tg">5 件以上九折</span><span class="tg">熔鍊回收 50%</span><details class="dt"><summary>詳情</summary>批量打造每件都會各自判定品質，鍛打加成套用到整批。熔鍊只處理未穿戴的裝備，品質越高回收越多，鍛造坊等級提高回收率。</details>'],
 ['建築專屬加成','每種建築都有獨特的全宗加成',()=>Object.keys(B49).map(k=>`<span class="tg">${BUILD[k].name}：${B49[k].f(1)}</span>`).join('')+'<details class="dt"><summary>詳情</summary>同類建築取最高等級計算，升級後加成提高；損壞時失效。</details>']);
// ======================= v0.4.6g 追加：#99 修為溢出條、#7 護盾條、#98 手機頂欄 =======================
const V49C={sh:'#b07cff',shDim:'#7d55c0',edge:'rgba(255,255,255,0.92)',ov:'#fff3a8'};
// 修為溢出比例（0～1：100%～150%）
function v49OvK(u){try{if(!u||capped(u))return 0;const n=needXiu(u);if(!(n>0)||u.xiu<=n)return 0;return clamp((u.xiu/n-1)/Math.max(0.01,(TUNE.ovMax||1.5)-1),0,1);}catch(e){return 0;}}
// 頭頂文字：有護盾條時往上讓 4px
{const _lb=label;label=function(t,x,y,c,f){return _lb(t,x,y+(V49.lblDy||0),c,f);};}
function v49ShBar(u,cx,y,w){const k=clamp((u.gq||0)/u.gqMax,0,1),cd=(u.gqCd||0)>0,x=cx-w/2;
  ctx.save();ctx.fillStyle='rgba(0,0,0,0.7)';ctx.fillRect(x-1,y-1,w+2,4.5);
  if(k>0){ctx.globalAlpha=cd?0.5:1;ctx.fillStyle=cd?V49C.shDim:V49C.sh;ctx.fillRect(x,y,w*k,2.5);ctx.globalAlpha=1;}
  if(cd){const r=clamp(1-(u.gqCd||0)/TUNE.v49.gqCd,0,1);ctx.fillStyle='rgba(255,255,255,0.55)';ctx.fillRect(x,y+2.6,w*r,0.7);}
  ctx.strokeStyle=cd?'rgba(255,255,255,0.35)':V49C.edge;ctx.lineWidth=0.8;ctx.strokeRect(x-0.5,y-0.5,w+1,3.5);ctx.restore();}
{const _dh=drawHuman;drawHuman=function(u){let xs=null,n=0;const sh=!!(u&&u.gqMax>0&&!u.dead);
  try{if(u&&!capped(u)){n=needXiu(u);if(n>0&&u.xiu>n){xs=u.xiu;u.xiu=n;}}}catch(e){}
  V49.lblDy=HB48.on?0:(sh?-4:0);
  try{_dh(u);}finally{V49.lblDy=0;if(xs!=null)u.xiu=xs;}
  try{if(!u||u.dead)return;const b=P(u.x,u.y),show=u.kind==='player'||selUnits.includes(u.id)||u.hp<u.maxhp,now=performance.now();
    if(xs!=null&&show){const k=clamp((xs/n-1)/Math.max(0.01,(TUNE.ovMax||1.5)-1),0,1),pl=0.75+0.25*Math.sin(now/260);
      ctx.save();ctx.shadowColor='rgba(255,240,170,0.95)';ctx.shadowBlur=5*pl;ctx.fillStyle=V49C.ov;ctx.fillRect(b.x-13,b.y-34,26*k,2);ctx.restore();
      if(k>=0.999){ctx.save();ctx.strokeStyle=`rgba(255,240,170,${(0.55*pl).toFixed(2)})`;ctx.lineWidth=1;ctx.strokeRect(b.x-13.5,b.y-34.5,27,3);ctx.restore();}}
    if(sh){v49ShBar(u,b.x,b.y+(HB48.on?HB48.g:-43),26);
      if(u.gq>0){const k=u.gq/u.gqMax,hit=u._gqHit&&now-u._gqHit<250;ctx.save();ctx.globalAlpha=(hit?0.8:0.2)*Math.max(0.3,k);ctx.strokeStyle=hit?'#e6d4ff':V49C.sh;ctx.lineWidth=hit?2.2:1.2;
        ctx.beginPath();ctx.ellipse(b.x,b.y-13,12+(hit?3:0),18+(hit?3:0),0,0,Math.PI*2);ctx.stroke();ctx.restore();}}
  }catch(e){}};}
// 面板：氣血 → 靈氣（v0.4.8）→ 護體 → 修為＋修為溢出覆蓋
function v49OvEl(bar,k){if(!bar)return;let o=bar.querySelector(':scope>.v49ov');
  if(!(k>0)){if(o&&o.style.width!=='0%')o.style.width='0%';bar.classList.remove('v49ovf');return;}
  if(!o){o=document.createElement('b');o.className='v49ov';bar.appendChild(o);}const w=(k*100).toFixed(1)+'%';if(o.style.width!==w)o.style.width=w;bar.classList.add('v49ovf');
  const t=`修為溢出 +${Math.round(k*(((TUNE.ovMax||1.5)-1)*100))}%（突破成功率加成）`;if(bar.title!==t)bar.title=t;}
function v48QiBar(u,hp){let qb=document.getElementById('v48_qib');const ok=u&&hp&&hp.parentNode&&hp.parentNode.parentNode&&u.qiMax>0&&!u.dead;
  if(!ok){if(qb)qb.remove();return;}
  if(!qb||hp.parentNode.nextSibling!==qb){if(qb)qb.remove();qb=document.createElement('div');qb.id='v48_qib';qb.className='bar v48qib';qb.innerHTML='<i></i>';hp.parentNode.parentNode.insertBefore(qb,hp.parentNode.nextSibling);}
  const w=(clamp((u.qi||0)/u.qiMax,0,1)*100).toFixed(1)+'%',i=qb.firstChild;if(i.style.width!==w)i.style.width=w;const t=`靈氣 ${Math.round(u.qi||0)}/${u.qiMax}`;if(qb.title!==t)qb.title=t;}
function v49PanelBars(){const u=selUnits.length===1?unitById(selUnits[0]):null,hp=document.getElementById('pd_hp');let sb=document.getElementById('v49_shb');
  try{v48QiBar(u,hp);}catch(e){}
  if(!u||!hp||!(u.gqMax>0)||u.dead||!hp.parentNode||!hp.parentNode.parentNode){if(sb)sb.remove();}
  else{{const prev=document.getElementById('v48_qib')||hp.parentNode;if(!sb||prev.nextSibling!==sb){if(sb)sb.remove();sb=document.createElement('div');sb.id='v49_shb';sb.className='bar v49shb';sb.innerHTML='<i></i>';hp.parentNode.parentNode.insertBefore(sb,prev.nextSibling);}}// v0.4.8：氣血 → 靈氣 → 護體 → 修為
    const k=clamp((u.gq||0)/u.gqMax,0,1),w=(k*100).toFixed(1)+'%',i=sb.firstChild;if(i.style.width!==w)i.style.width=w;const cd=(u.gqCd||0)>0;sb.classList.toggle('cd',cd);
    const gang=u.gqT==='gang',cur=gang?Math.round(u.gq):Math.round(u.gq*TUNE.v49.qiPerDmg),mx=gang?u.gqMax:Math.round(u.gqMax*TUNE.v49.qiPerDmg);
    const t=`${gang?'護體罡氣':'靈氣護體'} ${cur}/${mx}${cd?`（回復冷卻 ${Math.ceil(u.gqCd)} 秒）`:''}`;if(sb.title!==t)sb.title=t;}
  const px=document.getElementById('pd_xiu');if(px)v49OvEl(px.parentNode,u?v49OvK(u):0);
  const c=document.getElementById('cult');if(c&&c.classList.contains('open')){const p=player();const pb=c.querySelector('[data-x="pbar"]');if(pb&&p)v49OvEl(pb.parentNode,v49OvK(p));
    c.querySelectorAll('[data-x^="u"]').forEach(e=>{const uu=unitById(+e.dataset.x.slice(1));if(uu)v49OvEl(e.parentNode,v49OvK(uu));});}}
{const _rp=renderPanel;renderPanel=function(){_rp();try{v49PanelBars();}catch(e){}};}

// #98 手機頂欄：資源獨立一列（直向）／可橫向捲動（橫向）、數字縮寫、主角修為常駐
function v49Fmt(v){v=Math.floor(v||0);const a=Math.abs(v);if(a<1000)return String(v);if(a<10000)return (Math.floor(v/100)/10).toFixed(1).replace(/\.0$/,'')+'k';if(a<1e6)return Math.floor(v/1000)+'k';return (Math.floor(v/1e5)/10).toFixed(1).replace(/\.0$/,'')+'M';}
function v49SA(force){const T=V49.sa;if(!force&&T&&performance.now()-T.t<1000)return T;let e=document.getElementById('v49sa');
  if(!e){e=document.createElement('div');e.id='v49sa';e.style.cssText='position:fixed;left:0;top:0;width:0;height:0;visibility:hidden;pointer-events:none;padding:var(--sat,0px) var(--sar,0px) var(--sab,0px) var(--sal,0px)';document.body.appendChild(e);}
  const cs=getComputedStyle(e);return V49.sa={t:performance.now(),top:parseFloat(cs.paddingTop)||0,r:parseFloat(cs.paddingRight)||0,b:parseFloat(cs.paddingBottom)||0,l:parseFloat(cs.paddingLeft)||0};}
function v49TbInit(){const g=document.querySelector('#topbar .grp');if(!g||V49.tb)return;const tb={};
  for(const k of [...RES_KEYS,'pop']){const e=document.getElementById('r_'+k);if(!e)continue;const n=document.createElement('b');n.className='v49n';e.after(n);tb[k]=n;}
  const rm=document.createElement('span');rm.className='res v49rm';rm.id='v49_realm';rm.innerHTML='<i class="v49pi">你</i><b></b>';g.prepend(rm);tb.realm=rm.querySelector('b');V49.tb=tb;}
function v49TbUpd(){const T=V49.tb;if(!T||!isTouchUI)return;
  for(const k of RES_KEYS){const e=T[k];if(e){const t=v49Fmt(S.res[k]);if(e.textContent!==t){e.textContent=t;e.parentNode.title=RES_NAMES[k]+' '+Math.floor(S.res[k]);}}}
  if(T.pop){const t=document.getElementById('r_pop').textContent;if(T.pop.textContent!==t)T.pop.textContent=t;}
  const p=player();if(p&&T.realm){const t=REALMS[p.realm].n+(p.realm<MAX_REALM?` ${v49Fmt(p.xiu)}/${v49Fmt(needXiu(p))}`:'');if(T.realm.textContent!==t)T.realm.textContent=t;T.realm.parentNode.classList.toggle('ovf',v49OvK(p)>0);}}
{const _u=updateUI;updateUI=function(){_u();try{v49TbUpd();}catch(e){}};}
// 頭像列：避開目標條、避開瀏海安全區
function v49Ov2(a,b){return !!(a&&b&&a.left<b.right&&b.left<a.right&&a.top<b.bottom&&b.top<a.bottom);}
{const _pd=pbDefault;pbDefault=function(){const d=_pd();try{const sa=v49SA();d.x=Math.max(d.x,sa.l+6);d.mw=Math.max(200,Math.min(d.mw,innerWidth-d.x-sa.r-6));
  const ob=pbRect('objectives');if(ob&&v49Ov2(ob,{left:d.x,right:d.x+Math.min(d.mw,300),top:d.y,bottom:d.y+40}))d.y=ob.bottom+4;}catch(e){}return d;};}
{const _pc=pbClamp;pbClamp=function(x,y,w,h){const p=_pc(x,y,w,h);try{const sa=v49SA();p.x=Math.max(p.x,sa.l+2);const ob=pbRect('objectives');if(ob&&v49Ov2(ob,{left:p.x,right:p.x+w,top:p.y,bottom:p.y+h}))p.y=ob.bottom+4;}catch(e){}return p;};}
function v49Layout(force){const pb=document.getElementById('pbar');if(!pb||!pb.classList.contains('v48pb'))return;const ob=pbRect('objectives'),r=pbRect('pbar');
  if(v49Ov2(ob,r)){if(!V49.lyT||force||performance.now()-V49.lyT>800){V49.lyT=performance.now();try{pbApply();}catch(e){}}const r2=pbRect('pbar');if(v49Ov2(ob,r2))pb.style.top=Math.round(ob.bottom+4)+'px';}}
const V49_UCSS=`#panel .bar.v49shb{height:6px;background:#000b;border:1px solid ${V49C.edge};box-sizing:border-box;margin:3px 0 1px;border-radius:3px}
#panel .bar.v49shb i{background:linear-gradient(90deg,#9a62ff,${V49C.sh} 60%,#d9c2ff);box-shadow:0 0 4px #b07cff99}
#panel .bar.v49shb.cd{border-color:rgba(255,255,255,.35)}#panel .bar.v49shb.cd i{opacity:.5;background:repeating-linear-gradient(45deg,${V49C.sh} 0 4px,${V49C.shDim} 4px 8px);box-shadow:none}
body.touch #panel .bar.v49shb{height:5px;margin:2px 0 1px}
#panel .bar.v48qib{height:5px;margin:2px 0 1px}#panel .bar.v48qib i{background:linear-gradient(90deg,#3d6f9e,#6fb6ff)}body.touch #panel .bar.v48qib{height:4px}
.v49ovf{position:relative;box-shadow:0 0 6px rgba(255,236,160,.75)}
.v49ov{position:absolute;left:0;top:0;bottom:0;display:block;background:linear-gradient(90deg,#fff3a8,#ffe27a);box-shadow:0 0 6px #fff3a8;border-radius:inherit;pointer-events:none;animation:v49ovp 1.6s ease-in-out infinite}
@keyframes v49ovp{50%{opacity:.7}}
#v49_realm{display:none}
body.touch #topbar{height:auto;flex-wrap:wrap;row-gap:3px;column-gap:6px;padding:calc(var(--sat) + 4px) calc(var(--sar) + 6px) 3px calc(var(--sal) + 6px)}
body.touch #topbar .grp{order:20;flex:1 0 100%;max-width:100%;min-width:0;overflow-x:auto;overflow-y:hidden;scrollbar-width:none;-webkit-overflow-scrolling:touch;overscroll-behavior-x:contain;touch-action:pan-x;gap:4px;padding:1px 0 2px;-webkit-mask-image:linear-gradient(90deg,#000 90%,transparent);mask-image:linear-gradient(90deg,#000 90%,transparent)}
body.touch #topbar .grp::-webkit-scrollbar{display:none}
body.touch #topbar .grp .res{flex:none;display:inline-flex;gap:4px;align-items:center;white-space:nowrap;font-size:calc(14px * var(--xwfs,1));line-height:1.25;padding:2px 7px;background:#0000004d;border:1px solid #8a6a3a66;border-radius:10px}
body.touch #topbar .grp .res>b[id^="r_"]{display:none}
body.touch #topbar .v49n,body.touch #v49_realm b{font-weight:bold;color:#fff3c8;font-variant-numeric:tabular-nums}
body.touch #topbar .grp .ico{width:calc(15px * var(--xwfs,1));height:calc(15px * var(--xwfs,1));flex:none}
body.touch #topbar .grp #v49_realm{display:inline-flex}
body.touch #topbar .grp #r_realm{display:none}
body.touch #v49_realm .v49pi{font-style:normal;font-size:.8em;font-weight:bold;color:#1a120b;background:#f3d48a;border-radius:4px;padding:0 4px}
body.touch #v49_realm.ovf b{color:#fff3a8;text-shadow:0 0 6px #ffe27a}
body.touch .tbtn{width:calc(32px * min(var(--xwfs,1),1.15));height:calc(28px * min(var(--xwfs,1),1.15));font-size:calc(15px * min(var(--xwfs,1),1.15))}
@media (orientation:landscape) and (max-height:560px){body.touch #topbar{flex-wrap:nowrap}body.touch #topbar .grp{order:0;flex:1 1 0;min-width:0;width:auto}body.touch #topbar .sp{display:none}body.touch #topbar .grp .res{font-size:calc(13px * var(--xwfs,1));padding:1px 6px}}`;
function v49UiInit(){if(!document.getElementById('v49ucss')){const st=document.createElement('style');st.id='v49ucss';st.textContent=V49_UCSS;document.head.appendChild(st);}
  v49TbInit();
  // 說明文字：左鍵拖曳＝框選、中鍵拖曳＝平移（g17 PAN.mode='box'）
  try{document.querySelectorAll('#help table tr').forEach(tr=>{const td=tr.children;if(td.length<2)return;if(td[0].textContent==='滑鼠左鍵'&&!tr.dataset.v49){tr.dataset.v49=1;td[1].textContent='點選單位、建築、村莊；拖曳＝框選多名單位（左鍵拖曳不會移動鏡頭）';
      const n=document.createElement('tr');n.innerHTML='<td>滑鼠中鍵拖曳</td><td>平移鏡頭（也可用方向鍵／滾輪縮放）</td>';tr.after(n);}});}catch(e){}
  if(!V49.uiI)V49.uiI=setInterval(()=>{try{v49PanelBars();}catch(e){}try{v49Layout();}catch(e){}},250);}
{const _gb=guideBody;guideBody=function(c){let h=_gb(c);try{if(c==='ctrl'&&typeof h==='string')h=h.replace('選取／下令','選取／下令；左鍵拖曳＝框選、中鍵拖曳＝平移鏡頭');}catch(e){}return h;};}
SYS_TXT.push(['護盾條／修為溢出','頭頂與面板：紫條＝護盾、金白光＝修為溢出',()=>'<span class="tg" style="color:#c9a6ff">紫條＝護體罡氣／靈氣護體</span><span class="tg">變暗＝回復冷卻中</span><span class="tg" style="color:#fff3a8">金白光＝修為溢出（100～150%）</span><span class="tg">手機頂欄可左右滑動</span><details class="dt"><summary>詳情</summary>護盾條位於氣血條正上方，沒有護盾時隱藏；受傷後冷卻期間顏色變暗並以白線顯示冷卻進度。大圓滿時修為可溢出至 150%，修為條不再超出外框，改以覆蓋的金白光條＋外發光表示溢出量。手機直向時資源獨立一列、可左右滑動；橫向時資源條在按鈕左側可滑動，數字自動縮寫（如 6.5k）。</details>']);
// ======================= #100 副本首領／菁英：不再發呆、招式組（預警範圍）、狂暴、煉氣首領 =======================
const V49MV={
  charge:{n:'猛衝',wind:0.9,cd:7,rng:[2.2,8],sh:'line',len:7,w:1.3,dmg:1.7},
  slam:{n:'震地',wind:1.1,cd:8,rng:[0,2.6],sh:'circle',r:2.8,dmg:1.8},
  fan:{n:'散射',wind:0.8,cd:6,rng:[1.5,9],sh:'cone',r:8,ang:0.55,dmg:1.25},
  cleave:{n:'橫掃',wind:0.6,cd:4.5,rng:[0,2.3],sh:'cone',r:2.6,ang:1.35,dmg:1.5},
  summon:{n:'召喚',wind:1.2,cd:20,rng:[0,30],sh:'none'},
  ring:{n:'環爆',wind:1.0,cd:9,rng:[0,7],sh:'ring',r0:2.2,r:5.6,dmg:1.6},
  rain:{n:'天雷引',wind:1.4,cd:9,rng:[0,14],sh:'multi',r:1.6,dmg:2.0}};
const V49BP={
  cave:{col:'#ff9a4a',m:{charge:3,slam:2,cleave:3,summon:1},rage:{ring:2,charge:2},tag:'妖王'},
  jail:{col:'#ff6a5a',m:{cleave:3,charge:2,fan:2,summon:1},rage:{fan:3,rain:1},tag:'牢頭'},
  ruin:{col:'#9aa8ff',m:{slam:3,fan:2,ring:1,summon:1},rage:{ring:3,rain:2},tag:'石將'},
  xf:{col:'#ffd34d',m:{fan:2,charge:2,slam:2,cleave:2,rain:2,summon:1},rage:{ring:3,rain:2,charge:2},tag:'天將'}};
const V49ELITE={tiger:['charge'],chief:['cleave','fan'],xfguard:['cleave','charge'],golem:['slam']};
TUNE.v49.bossAggro=20;TUNE.v49.bossKeep=30;TUNE.v49.lqDef=0.85;
function v49BossOn(e){return !!(S.dg&&e&&!e.dead&&(ENEMY[e.type].boss||V49ELITE[e.type]));}
function v49BProf(e){const D=ENEMY[e.type];if(D.boss)return V49BP[S.dg.kind]||V49BP.cave;const m={};for(const k of V49ELITE[e.type])m[k]=1;return {col:'#ffb070',m,rage:null};}
function v49BCol(e){const D=ENEMY[e.type];return D.el!=null&&D.el>=0&&typeof EL_COL!=='undefined'?EL_COL[D.el]:v49BProf(e).col;}
// 煉氣首領（仙凡之門：宗師→煉氣）
{const _m=dgMob;dgMob=function(t,x,y,boss){const e=_m(t,x,y,boss);try{const D=S.dg;
  if(e.r>0.38){e.v49r0=e.r;e.r=0.38;} // 走廊 1 格寬：碰撞半徑縮小，避免卡住（外觀不變）
  if(boss){e.aggro=TUNE.v49.bossAggro;e.leash=Math.max(e.leash||0,80);
    if(D&&D.kind==='xf'&&e.realm<4){const k=Math.pow(1.3,4-e.realm),ka=k;   /* v0.4.9：仙凡之門沿用手調的 1.3 抬升（壓制另由 lqDef 處理） */e.realm=4;e.maxhp=e.hp=Math.round(e.hp*k);e.atk=+(e.atk*ka).toFixed(1);e.v49lq=1;}}
  else if(V49ELITE[t])e.aggro=Math.max(e.aggro||0,11);}catch(er){}return e;};}
{const _de=dmgEnemy;dmgEnemy=function(src,e,amt,col){if(e&&e.v49lq&&src&&src.kind&&(src.realm||0)<e.realm)amt*=TUNE.v49.lqDef;return _de(src,e,amt,col);};}
function v49BTarget(e){let best=null,bd=ENEMY[e.type].boss?TUNE.v49.bossAggro:Math.max(e.aggro||9,11);for(const u of S.units){if(u.dead||u.inside)continue;const d=dist(e.x,e.y,u.x,u.y);if(d<bd){bd=d;best=u;}}return best;}
function v49BHits(m,u){const dx=u.x-m.x,dy=u.y-m.y,d=Math.hypot(dx,dy),r=u.r||0.25;
  if(m.sh==='circle'||m.sh==='multi')return d<=m.r+r;
  if(m.sh==='ring')return d>=m.r0-r&&d<=m.r+r;
  if(m.sh==='line'){const t=dx*m.ux+dy*m.uy,pp=Math.abs(dx*m.uy-dy*m.ux);return t>=-0.5&&t<=m.len+0.5&&pp<=m.w/2+r;}
  if(m.sh==='cone'){if(d>m.r+r)return false;if(d<0.6)return true;const a=Math.atan2(dy,dx)-Math.atan2(m.uy,m.ux);const w=Math.abs(Math.atan2(Math.sin(a),Math.cos(a)));return w<=m.ang;}return false;}
function v49BCast(e,k,tg){const M=V49MV[k],B=e.v49b,rage=B.rage,wind=M.wind*(rage?0.75:1),col=v49BCol(e),D=S.dg;
  B.cd[k]=M.cd*(rage?0.7:1);B.cast={k,t:wind};e.dvx=e.dvy=0;e.path=[];faceTo(e,tg.x,tg.y);
  const dx=tg.x-e.x,dy=tg.y-e.y,dl=Math.hypot(dx,dy)||1,ux=dx/dl,uy=dy/dl;const base={v49:1,bid:e.id,k,t:wind,T:wind,col,n:M.n};const dm=e.atk*M.dmg*(e.v49lq?0.85:1);
  if(M.sh==='multi'){const us=S.units.filter(u=>!u.dead&&!u.inside&&dist(u.x,u.y,e.x,e.y)<16).sort(()=>rnd()-0.5).slice(0,D.kind==='xf'?Math.min(6,2+Math.floor(D.party/4)):2);
    for(const u of us)D.mech.marks.push(Object.assign({},base,{sh:'multi',x:u.x,y:u.y,r:M.r,dmg:dm}));}
  else if(M.sh!=='none')D.mech.marks.push(Object.assign({},base,{sh:M.sh,x:e.x,y:e.y,ux,uy,len:M.len||0,w:M.w||0,r:M.r||0,r0:M.r0||0,ang:M.ang||0,dmg:dm}));
  floater(e.x,e.y-0.6,(rage?'⚡':'')+M.n+'！',col);(V49.bossLog=V49.bossLog||[]).push(k);if(V49.bossLog.length>200)V49.bossLog.shift();}
function v49BResolve(e,k){const M=V49MV[k],D=S.dg;
  if(k==='summon'){const G=DGS[D.kind],r=dgRoomOf(e.home.x,e.home.y)||D.L.rooms[D.L.rooms.length-1];const n=Math.min((e.v49b.rage?3:2),8-(e.v49b.sm||0));
    for(let i=0;i<n;i++)D.queue.push({t:pick(G.mobs),r});e.v49b.sm=(e.v49b.sm||0)+Math.max(0,n);fx('break',e.x,e.y,v49BCol(e));return;}
  if(k==='charge'){const m=D.mech.marks.find(m=>m.v49&&m.bid===e.id&&m.k==='charge'&&!m.done);if(m){let x=e.x,y=e.y;const st=0.25;
      for(let s=0;s<m.len/st;s++){const nx=x+m.ux*st,ny=y+m.uy*st;if(blockedP(nx,ny))break;x=nx;y=ny;}e.x=x;e.y=y;e.vx=e.vy=0;fx('boom',x,y,m.col);}}}
function v49BTickMarks(dt){const D=S.dg;if(!D||!D.mech)return;for(const m of D.mech.marks){if(!m.v49)continue;m.t-=dt;
    if(m.t<=0&&!m.done){m.done=true;const e=enemyById(m.bid);fx('boom',m.x,m.y,m.col);
      for(const u of S.units.slice())if(!u.dead&&!u.inside&&v49BHits(m,u)){dmgUnit(e||{type:'xfboss',realm:4},u,m.dmg*(0.9+rnd()*0.2));/* #157：擊退改由 v157Kb() 統一處理 */}}}
  D.mech.marks=D.mech.marks.filter(m=>!m.v49||m.t>-0.35);}
function v49BossAI(e,dt){const B=e.v49b||(e.v49b={cd:{},nx:2.5,cast:null,rage:false,sm:0,st:{x:e.x,y:e.y,t:0},sk:0});const D=ENEMY[e.type],P0=v49BProf(e);
  for(const k in B.cd)B.cd[k]-=dt;B.nx-=dt;
  if(D.boss&&!B.rage&&e.hp<e.maxhp*0.5&&P0.rage){B.rage=true;e.speed=+(e.speed*1.2).toFixed(2);floater(e.x,e.y-0.8,'狂暴！招式加快','#ff6a5a');fx('break',e.x,e.y,'#ff6a5a');try{toast(`「${e.dgName||D.n}」狂暴了！注意地面預警`);}catch(er){}}
  if(B.cast){B.cast.t-=dt;e.dvx=e.dvy=0;moveEntity(e,dt);if(B.cast.t<=0){const k=B.cast.k;B.cast=null;B.nx=B.rage?0.8:1.3;v49BResolve(e,k);}return true;}
  // 目標：首領 20 格內必定鎖定，30 格內不放棄
  let tg=e.target&&e.target.k==='u'?unitById(e.target.id):null;if(tg&&(tg.dead||tg.inside||dist(e.x,e.y,tg.x,tg.y)>TUNE.v49.bossKeep))tg=null;
  if(!tg){tg=v49BTarget(e);if(tg){e.target={k:'u',id:tg.id};e.path=[];}}
  if(!tg)return false;
  // 卡住偵測：追擊中 1.2 秒幾乎沒移動 → 重新尋路；3 秒 → 沿路徑推一步
  const dd=dist(e.x,e.y,tg.x,tg.y),reach=e.r+(tg.r||0.25)+0.45;B.st.t+=dt;
  if(B.st.t>=1.2){const mv=dist(e.x,e.y,B.st.x,B.st.y);if(dd>reach+0.3&&mv<0.2){B.sk++;e.path=[];e.needRepath=true;e.repath=0;try{pathTo(e,tg.x,tg.y);}catch(er){}
      if(B.sk>=3&&e.path&&e.path.length){const p=e.path[0],l=dist(e.x,e.y,p.x,p.y)||1,nx=e.x+(p.x-e.x)/l*Math.min(0.4,l),ny=e.y+(p.y-e.y)/l*Math.min(0.4,l);if(!blockedP(nx,ny)){e.x=nx;e.y=ny;}}}else B.sk=0;B.st={x:e.x,y:e.y,t:0};}
  // 出招
  if(B.nx<=0){const W=Object.assign({},P0.m,B.rage&&P0.rage?P0.rage:{});const c=[];let tot=0;
    for(const k in W){const M=V49MV[k];if(!M||(B.cd[k]||0)>0)continue;if(dd<M.rng[0]||dd>M.rng[1])continue;if(k==='summon'&&(B.sm||0)>=8)continue;tot+=W[k];c.push([k,W[k]]);}
    if(c.length){let r=rnd()*tot;for(const [k,w] of c){r-=w;if(r<=0){v49BCast(e,k,tg);return true;}}v49BCast(e,c[c.length-1][0],tg);return true;}
    B.nx=0.4;}
  return false;}
{const _ue=updateEnemy;updateEnemy=function(e,dt,ct){if(!v49BossOn(e)||v49Client())return _ue(e,dt,ct);
  if(e.stun>0)return _ue(e,dt,ct);let busy=false;try{busy=v49BossAI(e,dt);}catch(er){console.warn(er);}if(busy)return;
  if(e.aggro<TUNE.v49.bossAggro&&ENEMY[e.type].boss)e.aggro=TUNE.v49.bossAggro;
  // 原版在 14 格外會丟掉目標、每 0.4 秒才重掃一次 → 首領在邊界來回「發呆」。14 格以外由這裡接手追擊
  const tg=e.target&&e.target.k==='u'?unitById(e.target.id):null;
  if(tg&&!tg.dead&&dist(e.x,e.y,tg.x,tg.y)>=13.5){e.cd-=dt;e.repath-=dt;e.scan-=dt;e.anim=Math.max(0,(e.anim||0)-dt);chase(e,dt,tg.x,tg.y,e.r+(tg.r||0.25)+0.45,1);moveEntity(e,dt);return;}
  return _ue(e,dt,ct);};}
// 原本的首領機制：自訂預警不參與舊判定／舊繪製；有招式組的首領不再跑舊的「重擊／天雷」計時
{const _db=dgBoss;dgBoss=function(dt){const D=S.dg;if(!D||!D.mech)return _db(dt);const M=D.mech,mine=M.marks.filter(m=>m.v49);M.marks=M.marks.filter(m=>!m.v49);
  const b=D.boss!=null?enemyById(D.boss):null;if(b&&!v49Client())M.t=Math.max(M.t,1);
  try{_db(dt);}finally{M.marks=M.marks.concat(mine);}if(!v49Client())v49BTickMarks(dt);};}
function v49DrawMarks(){const D=S.dg;if(!D||!D.mech)return;const now=performance.now();
  for(const m of D.mech.marks){if(!m.v49)continue;const k=1-clamp(m.t/(m.T||1),0,1),q=P(m.x,m.y),col=m.col||'#ffd34d',done=m.done;
    ctx.save();ctx.globalAlpha=done?0.55:0.85;ctx.strokeStyle=done?'#fff':col;ctx.lineWidth=2;ctx.setLineDash(done?[]:[6,4]);ctx.lineDashOffset=-now/40;
    const fillA=done?0.45:0.12+0.33*k;ctx.fillStyle=col;
    const path=()=>{ctx.beginPath();
      if(m.sh==='circle'||m.sh==='multi'){ctx.ellipse(q.x,q.y,m.r*HW*1.4,m.r*HH*1.4,0,0,Math.PI*2);}
      else if(m.sh==='ring'){ctx.ellipse(q.x,q.y,m.r*HW*1.4,m.r*HH*1.4,0,0,Math.PI*2);ctx.moveTo(q.x+m.r0*HW*1.4,q.y);ctx.ellipse(q.x,q.y,m.r0*HW*1.4,m.r0*HH*1.4,0,0,Math.PI*2,true);}
      else if(m.sh==='line'){const px=-m.uy*m.w/2,py=m.ux*m.w/2,a=P(m.x+px,m.y+py),b=P(m.x-px,m.y-py),c=P(m.x-px+m.ux*m.len,m.y-py+m.uy*m.len),d=P(m.x+px+m.ux*m.len,m.y+py+m.uy*m.len);ctx.moveTo(a.x,a.y);ctx.lineTo(b.x,b.y);ctx.lineTo(c.x,c.y);ctx.lineTo(d.x,d.y);ctx.closePath();}
      else if(m.sh==='cone'){const a0=Math.atan2(m.uy,m.ux);ctx.moveTo(q.x,q.y);for(let i=0;i<=16;i++){const a=a0-m.ang+2*m.ang*i/16,w=P(m.x+Math.cos(a)*m.r,m.y+Math.sin(a)*m.r);ctx.lineTo(w.x,w.y);}ctx.closePath();}};
    path();ctx.globalAlpha=fillA;ctx.fill('evenodd');ctx.globalAlpha=done?0.55:0.9;ctx.stroke();
    // 進度：由中心往外擴的實心
    if(!done&&(m.sh==='circle'||m.sh==='multi')){ctx.setLineDash([]);ctx.globalAlpha=0.35;ctx.beginPath();ctx.ellipse(q.x,q.y,m.r*HW*1.4*k,m.r*HH*1.4*k,0,0,Math.PI*2);ctx.fill();}
    if(!done&&m.n){ctx.setLineDash([]);ctx.globalAlpha=1;label(m.n,q.x,q.y-6,col,'bold 11px sans-serif');}
    ctx.restore();}}
{const _dd=drawDungeon;drawDungeon=function(base){const D=S.dg;let mine=null;if(D&&D.mech&&D.mech.marks){mine=D.mech.marks.filter(m=>m.v49);if(mine.length)D.mech.marks=D.mech.marks.filter(m=>!m.v49);else mine=null;}
  try{_dd(base);}finally{if(mine)D.mech.marks=D.mech.marks.concat(mine);}
  if(mine){try{ctx.save();ctx.setTransform(...base);v49DrawMarks();ctx.restore();}catch(e){}}};}
SYS_TXT.push(['首領招式','副本首領／菁英會出招，地面有預警範圍',()=>Object.keys(V49MV).map(k=>`<span class="tg">${V49MV[k].n}</span>`).join('')+'<span class="tg" style="color:#ff6a5a">半血狂暴：出招加快＋新招</span><details class="dt"><summary>詳情</summary>首領 20 格內一定會追擊（30 格內不放棄），卡住會自動重新尋路。出招前地面會出現虛線預警（圓、扇形、直線、環形），倒數結束才判定，走出範圍即可閃避。不同副本的首領招式不同：洞窟妖王善衝撞、地牢牢頭會橫掃與飛鏢、守陵石將會震地與環爆、仙凡之門的首領是真正的煉氣修士（攻防皆為煉氣，對宗師的護體罡氣傷害 +20%）。猛虎、山賊頭目、天門衛、石傀等菁英也有 1～2 招。</details>']);
// ======================= #103 功法連招指示：到期／重置／脫戰即淡出，疊層資料也會清掉 =======================
function v50CbClean(){if(!S||!S.units)return;const p=player();
  for(const u of S.units){const C=u._cb;if(!C)continue;
    if(!C.n||S.time-C.t>CB_WIN||S.time<C.t-0.05){u._cb=null;continue;}
    if(u===p){const fight=(S.time-(u.lastAtk||-99)<4)||(S.time-(u.lastHit||-99)<4)||S.enemies.some(e=>!e.dead&&e.target&&e.target.k==='u'&&e.target.id===u.id&&dist(e.x,e.y,u.x,u.y)<10);
      if(!fight&&S.time-C.t>2.5)u._cb=null;}}}
{const _x=v48Hud;v48Hud=function(){try{v50CbClean();}catch(e){}_x();try{const el=document.getElementById('v48cb');if(!el)return;
  if(el._h){el._v50on=1;el.classList.remove('v50fo');if(el._v50T){clearTimeout(el._v50T);el._v50T=0;}}
  else if(el._v50on){el._v50on=0;el.style.display='block';el.classList.add('v50fo');el._v50T=setTimeout(()=>{el._v50T=0;if(!el._h){el.style.display='none';el.classList.remove('v50fo');}},450);}}catch(e){}};}
{const _x=v48Combo;v48Combo=function(u,el,tgt){if(u&&u._cb&&(S.time<u._cb.t-0.05||S.time-u._cb.t>CB_WIN))u._cb=null;return _x(u,el,tgt);};}

// ======================= #102 多選／單選面板：工作按鈕的作用中框、按下閃光、人數徽章 =======================
function v50JobMarks(){const pn=document.getElementById('panel');if(!pn||!pn.querySelector('[data-job],[data-res]'))return;
  const us=selUnits.map(unitById).filter(u=>u&&!u.dead&&u.kind==='disciple');if(!us.length)return;
  const cnt={},rc={};let smart=0,rip=0;for(const u of us){const k=u.job||'none';cnt[k]=(cnt[k]||0)+1;if(u.job==='gather'){const r=u.jobRes||'';rc[r]=(rc[r]||0)+1;if(u.smart)smart++;}if(u.rip)rip++;}
  const maj=Object.keys(cnt).sort((a,b)=>cnt[b]-cnt[a])[0];const rmaj=Object.keys(rc).sort((a,b)=>rc[b]-rc[a])[0];const L=V50.press;const fresh=L&&performance.now()-L.t<1500;
  const mark=(b,n,isMaj,tot)=>{b.classList.toggle('v50maj',!!isMaj&&n>0);b.classList.toggle('v50part',n>0&&n<tot);let s=b.querySelector('.v50n');
    if(n>0&&tot>1){if(!s){s=document.createElement('sup');s.className='v50n';b.appendChild(s);}if(s.textContent!==String(n))s.textContent=String(n);b.title=`${n}／${tot} 名正在做這項`;}else if(s)s.remove();};
  for(const b of pn.querySelectorAll('[data-job]')){const k=b.dataset.job;mark(b,cnt[k]||0,k===maj||(fresh&&L.k==='j:'+k),us.length);if(fresh&&L.k==='j:'+k)b.classList.add('v50maj');}
  const g=cnt.gather||0;
  for(const b of pn.querySelectorAll('[data-res]')){const r=b.dataset.res;if(r==='smart'){mark(b,smart,smart>0&&smart>=g/2,g);continue;}mark(b,rc[r]||0,r===rmaj||(fresh&&L.k==='r:'+r),g);if(fresh&&L.k==='r:'+r)b.classList.add('v50maj');}
  const rb=pn.querySelector('[data-act="rip"]');if(rb)mark(rb,rip,rip>us.length/2,us.length);}
document.addEventListener('pointerdown',ev=>{const t=ev.target&&ev.target.closest&&ev.target.closest('#panel [data-job],#panel [data-res],#panel [data-act="rip"]');if(!t)return;
  V50.press={k:t.dataset.job?'j:'+t.dataset.job:t.dataset.res?'r:'+t.dataset.res:'a:rip',t:performance.now()};
  const pn=document.getElementById('panel');const sel=t.dataset.job?'[data-job]':t.dataset.res?'[data-res]':null;if(sel&&t.dataset.res!=='smart')for(const b of pn.querySelectorAll(sel))if(b!==t)b.classList.remove('v50maj');
  t.classList.add('v50maj');t.classList.remove('v50fl');void t.offsetWidth;t.classList.add('v50fl');},true);
document.addEventListener('click',ev=>{const t=ev.target&&ev.target.closest&&ev.target.closest('#panel [data-job],#panel [data-res],#panel [data-act="rip"]');if(t)setTimeout(()=>{try{v50JobMarks();}catch(e){}},0);},false);

// ======================= #101 頭像列：寬度上限、避開目標／提示／小地圖、捲動箭頭、「+N」全員格、排序、直列 =======================
const V50={press:null,drag:null};
const PB_SORT=[['idle','閒置／受傷優先'],['realm','境界高→低'],['def','招募順序']];
function v50Obs(){const out=[];for(const id of ['objectives','tutbub','minimap','dghud','hint','panel','v48cb']){const r=pbRect(id);if(r&&!(id==='hint'&&!document.getElementById('hint').textContent.trim()))out.push(Object.assign({id},{left:r.left,right:r.right,top:r.top,bottom:r.bottom}));}return out;}
function v50PvW(){const d=document.querySelector('#pb2_list .pv2');return d?d.getBoundingClientRect().width+4:(isTouchUI?50:46);}
function v50Fit(){const el=document.getElementById('pbar');if(!el||!el.classList.contains('v48pb'))return;const c=pbCfg();const list=document.getElementById('pb2_list');if(!list)return;
  const VW=innerWidth,VH=innerHeight,sa=v49SA();el.classList.toggle('pbvert',!!c.vert&&!c.col);
  if(c.hide)return;
  if(c.vert&&!c.col){const tb=pbRect('topbar');let top=(tb?tb.bottom:44)+4;const left=Math.max(4,sa.l+4);
    for(const o of v50Obs())if((o.id==='objectives'||o.id==='tutbub'||o.id==='dghud')&&o.left<left+150&&o.top<top+40)top=Math.max(top,o.bottom+6);
    const bot=isTouchUI?(VW>VH?150:200):12;const mh=Math.max(150,VH-top-bot-sa.b);
    el.style.left=left+'px';el.style.top=top+'px';el.style.maxHeight=mh+'px';list.style.setProperty('--pvw',(v50PvW()-4)+'px');el.style.maxWidth='';el.style.width='';list.style.maxWidth='';
    const head=[...el.children].filter(x=>x!==list&&x.id!=='v50_r'&&x.id!=='v50_l'&&x.id!=='v50_more'&&getComputedStyle(x).display!=='none').reduce((m,x)=>Math.max(m,x.getBoundingClientRect().bottom),top)-top;
    list.style.maxHeight=Math.max(60,mh-head-46)+'px';return;}
  el.style.maxHeight='';list.style.maxHeight='';
  for(let it=0;it<3;it++){const r=el.getBoundingClientRect();const x=r.left,y=r.top,bh=Math.max(r.height,48);
    let free=VW-sa.r-6-x;const covers=[];
    for(const o of v50Obs()){if(o.bottom<=y+1||o.top>=y+bh-1)continue;if(o.right<=x+1)continue;if(o.left>x+30)free=Math.min(free,o.left-6-x);else covers.push(o);}
    // 起點被目標欄／提示壓住 → 移到它下方
    const cv=covers.filter(o=>o.id!=='panel'&&o.id!=='minimap');if(cv.length&&it<2){el.style.top=Math.round(Math.max(...cv.map(o=>o.bottom))+4)+'px';continue;}
    const cap=Math.max(VW*0.45,Math.min(VW-x-sa.r-6,360));const w=Math.round(Math.max(200,Math.min(cap,free)));
    const cur=parseFloat(el.style.maxWidth)||0;if(Math.abs(cur-w)>1)el.style.maxWidth=w+'px';
    const pw=v50PvW();list.style.maxWidth=Math.round(pw*(isTouchUI&&VW<VH?7:12))+'px';
    const r2=el.getBoundingClientRect();if(Math.abs(r2.height-r.height)<2)break;}}
{const _x=pbApply;pbApply=function(){_x();try{v50Ctl();v50Fit();}catch(e){console.warn(e);}};}
function v50Ctl(){const el=document.getElementById('pbar');if(!el||document.getElementById('v50_more'))return;const list=document.getElementById('pb2_list');if(!list)return;
  const mk=(id,txt,tip)=>{const b=document.createElement('button');b.className='btn v50pbn';b.id=id;b.innerHTML=txt;b.title=tip;return b;};
  const l=mk('v50_l','◂','往前捲動'),r=mk('v50_r','▸','往後捲動'),m=mk('v50_more','全部','開啟全部弟子格（可篩選工作／隊伍／閒置）');
  list.before(l);list.after(r);r.after(m);
  const step=d=>{const v=el.classList.contains('pbvert');if(v)list.scrollBy({top:d*list.clientHeight*0.8,behavior:'smooth'});else list.scrollBy({left:d*list.clientWidth*0.8,behavior:'smooth'});};
  for(const [b,f] of [[l,()=>step(-1)],[r,()=>step(1)],[m,()=>v50Grid(true)]])b.addEventListener('click',ev=>{ev.stopPropagation();f();},true);
  list.addEventListener('wheel',ev=>{if(el.classList.contains('pbvert'))return;const d=Math.abs(ev.deltaY)>Math.abs(ev.deltaX)?ev.deltaY:ev.deltaX;if(!d)return;ev.preventDefault();list.scrollLeft+=d;},{passive:false});
  // 滑鼠拖曳捲動（觸控本來就能滑）
  list.addEventListener('pointerdown',ev=>{if(ev.pointerType!=='mouse'||ev.button!==0)return;V50.drag={x:ev.clientX,y:ev.clientY,sl:list.scrollLeft,st:list.scrollTop,moved:false};});
  addEventListener('pointermove',ev=>{const D=V50.drag;if(!D)return;const dx=ev.clientX-D.x,dy=ev.clientY-D.y;if(!D.moved&&Math.hypot(dx,dy)>6)D.moved=true;if(D.moved){list.scrollLeft=D.sl-dx;list.scrollTop=D.st-dy;}});
  addEventListener('pointerup',()=>{const D=V50.drag;V50.drag=null;if(D&&D.moved){V50.noClick=performance.now();}});
  list.addEventListener('click',ev=>{if(V50.noClick&&performance.now()-V50.noClick<250){ev.stopPropagation();ev.preventDefault();}},true);
  list.addEventListener('scroll',()=>v50More(),{passive:true});}
function v50More(){const el=document.getElementById('pbar'),list=document.getElementById('pb2_list'),m=document.getElementById('v50_more');if(!el||!list||!m)return;
  const v=el.classList.contains('pbvert');const n=list.querySelectorAll('.pv2').length;const pw=v50PvW();
  let vis=v?Math.floor((list.clientHeight+4)/pw)*Math.max(1,Math.floor((list.clientWidth+4)/pw)):Math.floor((list.clientWidth+4)/pw);vis=Math.max(1,Math.min(n,vis));
  const over=v?list.scrollHeight>list.clientHeight+2:list.scrollWidth>list.clientWidth+2;const hid=Math.max(0,n-vis);
  el.classList.toggle('v50ovf',over);const t=hid>0?`+${hid}`:'全部';if(m.textContent!==t)m.textContent=t;m.style.display=n?'':'none';
  const l=document.getElementById('v50_l'),r=document.getElementById('v50_r');if(l&&r){const a=v?list.scrollTop:list.scrollLeft,mx=v?list.scrollHeight-list.clientHeight:list.scrollWidth-list.clientWidth;l.disabled=a<=1;r.disabled=a>=mx-1;l.textContent=v?'▴':'◂';r.textContent=v?'▾':'▸';}}
function v50Rank(u){const inj=(u.hp/u.maxhp<0.6)||!!injOf(u);const idle=!u.job&&!u.aiJob&&(!u.task||u.task.type==='idle');return inj?0:idle?1:2;}
function v50Sorted(ds){const s=pbCfg().sort||'idle';const a=ds.slice();if(s==='idle')a.sort((x,y)=>v50Rank(x)-v50Rank(y)||x.id-y.id);else if(s==='realm')a.sort((x,y)=>y.realm-x.realm||(y.xiu||0)-(x.xiu||0));return a;}
{const _x=renderPbar48;renderPbar48=function(){_x();try{const list=document.getElementById('pb2_list');if(!list)return;const ds=disciples().filter(u=>!u.dead);
  const ord=v50Sorted(ds).map(u=>u.id);const cur=[...list.children].map(d=>+d.dataset.uid);
  if(ord.length===cur.length&&ord.some((id,i)=>id!==cur[i])){const map={};for(const d of list.children)map[d.dataset.uid]=d;for(const id of ord)if(map[id])list.appendChild(map[id]);}
  for(const d of list.children){const u=unitById(+d.dataset.uid);if(!u)continue;const k=v50Rank(u);d.classList.toggle('v50inj',k===0);d.classList.toggle('v50idle',k===1);}
  v50More();if(V50.gridOpen)v50Grid();}catch(e){console.warn(e);}};}
// 全部弟子格
function v50Grid(open){let g=document.getElementById('v50_grid');
  if(open===false){if(g)g.remove();V50.gridOpen=false;return;}
  if(!g){if(!open)return;g=document.createElement('div');g.id='v50_grid';g.className='ui';document.body.appendChild(g);V50.gridOpen=true;V50.gf=V50.gf||'all';V50.gk=null;
    ['pointerdown','touchstart','mousedown','wheel'].forEach(t=>g.addEventListener(t,ev=>ev.stopPropagation(),{passive:true}));
    g.addEventListener('click',ev=>{ev.stopPropagation();const t=ev.target;let x;
      if(t.closest('.v50gx')){v50Grid(false);return;}
      if(x=t.closest('[data-gf]')){V50.gf=x.dataset.gf;V50.gk=null;v50Grid();return;}
      if(x=t.closest('[data-gs]')){pbSet('sort',x.dataset.gs);V50.gk=null;PB.key=null;v50Grid();return;}
      if(t.closest('.v50gall')){const ids=v50GridList().map(u=>u.id);if(ids.length){pbSelIds(ids);toast(`選取 ${ids.length} 名弟子`);}V50.gk=null;v50Grid();return;}
      if(x=t.closest('[data-gu]')){const id=+x.dataset.gu,u=unitById(id);if(!u)return;if(pbDbl('g'+id)){locateUnit(u);return;}
        if(ev.shiftKey||ev.ctrlKey)pbSelIds(selUnits.includes(id)?selUnits.filter(i=>i!==id):selUnits.concat(id));else pbSelIds([id]);V50.gk=null;v50Grid();}});}
  const ds=disciples().filter(u=>!u.dead),L=v50GridList();
  const key=V50.gf+'|'+(pbCfg().sort||'idle')+'|'+L.map(u=>u.id+':'+(u.job||'')+(selUnits.includes(u.id)?'s':'')+Math.round(u.hp/u.maxhp*10)).join(',');
  if(key===V50.gk)return;V50.gk=key;
  const jobs={};for(const u of ds){const k=u.job||(u.aiJob?'ai':'none');jobs[k]=(jobs[k]||0)+1;}
  const cI=ds.filter(u=>v50Rank(u)===1).length,cH=ds.filter(u=>v50Rank(u)===0).length;
  const chip=(k,t,n)=>`<button class="btn ${V50.gf===k?'on':''}" data-gf="${k}">${t}<small>${n}</small></button>`;
  let h=`<div class="v50gh"><b>全部弟子 ${ds.length}</b><button class="btn v50gx" title="關閉">✕</button></div><div class="v50gf">${chip('all','全部',ds.length)}${chip('idle','閒置',cI)}${chip('inj','受傷',cH)}`;
  for(const k of Object.keys(jobs))if(k!=='none')h+=chip('j:'+k,k==='ai'?'自主':(JOB_NAME[k]||k),jobs[k]);
  if(jobs.none)h+=chip('j:none','待命',jobs.none);
  SQ_NAMES.forEach((n,i)=>{const k=S.squads[i].filter(id=>{const u=unitById(id);return u&&!u.dead;}).length;if(k)h+=chip('q:'+i,n+'隊',k);});
  h+=`</div><div class="v50gf v50gs">排序：${PB_SORT.map(([k,t])=>`<button class="btn ${(pbCfg().sort||'idle')===k?'on':''}" data-gs="${k}">${t}</button>`).join('')}<button class="btn v50gall">選取這 ${L.length} 人</button></div>`;
  h+=`<div class="v50gg scroll">${L.map(u=>{const f=clamp(u.hp/u.maxhp,0,1),k=v50Rank(u);return `<div class="v50gu ${selUnits.includes(u.id)?'on':''} ${k===0?'v50inj':k===1?'v50idle':''}" data-gu="${u.id}" title="點＝選取、連點＝定位、Shift＝加選"><b style="color:${BODIES[u.body].col}">${u.name}</b><s>${REALMS[u.realm].n}</s><em>${pbarIcon(u)} ${u.job?(JOB_NAME[u.job]||u.job):u.aiJob?'自主':'待命'}</em><i class="hp"><i style="width:${(f*100).toFixed(0)}%;background:${f>0.5?'#5fe06a':f>0.25?'#ffb04a':'#ff5a4a'}"></i></i></div>`;}).join('')||'<span class="pbempty">沒有符合的弟子</span>'}</div>`;
  g.innerHTML=h;}
function v50GridList(){const ds=disciples().filter(u=>!u.dead);const f=V50.gf||'all';let L=ds;
  if(f==='idle')L=ds.filter(u=>v50Rank(u)===1);else if(f==='inj')L=ds.filter(u=>v50Rank(u)===0);
  else if(f.startsWith('j:')){const k=f.slice(2);L=ds.filter(u=>(u.job||(u.aiJob?'ai':'none'))===k);}
  else if(f.startsWith('q:')){const s=new Set(S.squads[+f.slice(2)]);L=ds.filter(u=>s.has(u.id));}
  return v50Sorted(L);}
// 設定：排列方向、排序
{const _os=openSettings;openSettings=function(){_os();try{const el=document.getElementById('settings');if(!el)return;const c=pbCfg();const anchor=el.querySelector('[data-v48pb="reset"]');const a=anchor?anchor.closest('.trow'):null;
  const r1=document.createElement('div');r1.className='trow';r1.innerHTML=`<span>頭像列方向</span><span><button class="btn ${c.vert?'':'pri'}" data-v50pb="h">橫列（上方）</button><button class="btn ${c.vert?'pri':''}" data-v50pb="v">直列（左側）</button></span>`;
  const r2=document.createElement('div');r2.className='trow';r2.innerHTML=`<span>頭像排序</span><span>${PB_SORT.map(([k,t])=>`<button class="btn ${(c.sort||'idle')===k?'pri':''}" data-v50pb="s:${k}">${t}</button>`).join('')}</span>`;
  if(a){a.insertAdjacentElement('afterend',r1);r1.insertAdjacentElement('afterend',r2);}else{el.appendChild(r1);el.appendChild(r2);}}catch(e){}};}
document.addEventListener('click',ev=>{const t=ev.target&&ev.target.closest&&ev.target.closest('[data-v50pb]');if(!t)return;const k=t.dataset.v50pb;
  if(k==='h'||k==='v'){const c=pbCfg();c.x=null;c.y=null;pbSet('vert',k==='v'?1:0);}else if(k.startsWith('s:'))pbSet('sort',k.slice(2));PB.key=null;openSettings();});
const V50_CSS=`
#pbar.v48pb .v50pbn{min-height:30px;padding:2px 5px;flex:none;display:none}
#pbar.v48pb.v50ovf #v50_l,#pbar.v48pb.v50ovf #v50_r{display:inline-block}#pbar.v48pb .v50pbn:disabled{opacity:.35}
#pbar.v48pb #v50_more{display:inline-block;color:#ffe9a0;font-weight:bold}
#pbar.v48pb.pbcol .v50pbn,#pbar.v48pb.pbcol #v50_more{display:none!important}
#pbar.v48pb #pb2_list{scroll-behavior:auto;cursor:grab}
#pbar.v48pb .pv2.v50idle{border-color:#7fb6ff}#pbar.v48pb .pv2.v50inj{border-color:#ff6a5a}
#pbar.v48pb.pbvert{flex-direction:column;flex-wrap:nowrap;align-items:stretch;width:auto;max-width:none}
#pbar.v48pb.pbvert>.btn,#pbar.v48pb.pbvert #pb2_sq>.btn{width:100%}
#pbar.v48pb.pbvert #pb2_sq{display:grid;grid-template-columns:1fr 1fr;gap:3px}
#pbar.v48pb.pbvert .grip{min-height:12px;height:12px;width:auto;background:repeating-linear-gradient(90deg,#8a6a3a 0 2px,transparent 2px 5px)}
#pbar.v48pb.pbvert #pb2_list{flex-direction:row;flex-wrap:wrap;overflow-x:hidden;overflow-y:auto;width:calc(2 * (var(--pvw,42px) + 4px) + 6px);min-width:0;flex:1 1 auto;touch-action:pan-y;align-content:flex-start}
#v50_grid{position:fixed;left:50%;top:50%;transform:translate(-50%,-50%);z-index:30;width:min(92vw,760px);max-height:82vh;display:flex;flex-direction:column;gap:6px;background:rgba(26,18,11,.97);border:1px solid #c9a14a;border-radius:10px;padding:8px 10px;color:#f3e6c8;font-size:calc(13px * var(--xwfs,1));box-shadow:0 8px 30px #000a}
#v50_grid .v50gh{display:flex;justify-content:space-between;align-items:center}#v50_grid .v50gh b{font-size:1.15em;color:#ffe9a0}
#v50_grid .v50gf{display:flex;flex-wrap:wrap;gap:4px;align-items:center}#v50_grid .v50gf .btn small{margin-left:3px;color:#ffe9a0}
#v50_grid .v50gg{display:grid;grid-template-columns:repeat(auto-fill,minmax(calc(118px * var(--xwfs,1)),1fr));gap:5px;overflow-y:auto;min-height:80px;padding:2px}
#v50_grid .v50gu{position:relative;background:#2a2018;border:2px solid #5a4a30;border-radius:8px;padding:3px 6px 9px;cursor:pointer;user-select:none;display:flex;flex-direction:column;line-height:1.25}
#v50_grid .v50gu.on{border-color:#ffd34d;box-shadow:0 0 6px #ffd34d}#v50_grid .v50gu.v50idle{border-color:#7fb6ff}#v50_grid .v50gu.v50inj{border-color:#ff6a5a}#v50_grid .v50gu.on{border-color:#ffd34d}
#v50_grid .v50gu s{text-decoration:none;color:#c8b48a;font-size:.85em}#v50_grid .v50gu em{font-style:normal;font-size:.85em;color:#d8c9a6}
#v50_grid .v50gu .hp{position:absolute;left:4px;right:4px;bottom:3px;height:4px;background:#1a0f08;border-radius:3px;overflow:hidden}#v50_grid .v50gu .hp>i{display:block;height:100%}
#panel .btn.v50maj{background:#6b4a22;border-color:#ffd34d;box-shadow:0 0 0 2px #f3d48a inset,0 0 8px #ffd34d;color:#fff3c8}
#panel .btn.v50part:not(.v50maj){border-color:#c9a14a;border-style:dashed}
#panel .btn{position:relative}#panel .btn .v50n{position:absolute;top:-6px;right:-5px;min-width:14px;height:14px;line-height:14px;padding:0 3px;border-radius:7px;background:#ffd34d;color:#1a120b;font-size:10px;font-weight:bold;text-align:center;pointer-events:none}
#panel .btn.v50fl{animation:v50fl .45s ease-out}@keyframes v50fl{0%{box-shadow:0 0 0 2px #fff inset,0 0 18px #fff3a8;filter:brightness(1.6)}100%{}}
#panel .v50ls{display:flex;flex-direction:column;gap:2px;margin:3px 0 4px;font-size:calc(12.5px * var(--xwfs,1));line-height:1.45}#panel .v50ls>div{display:flex;gap:6px;align-items:baseline}#panel .v50lk{flex:none;min-width:6.2em;color:#c8b48a}#panel .v50lk::after{content:'：'}#panel .v50lv{color:#f3e6c8;word-break:keep-all;overflow-wrap:anywhere}
#v48cb{transition:opacity .4s}#v48cb.v50fo{opacity:0}
`;
function v50UiInit(){if(!document.getElementById('v50css')){const s=document.createElement('style');s.id='v50css';s.textContent=V50_CSS;document.head.appendChild(s);}
  try{v50Ctl();v50Fit();}catch(e){}
  if(!V50.iv)V50.iv=setInterval(()=>{try{v50JobMarks();}catch(e){}try{v48Hud();}catch(e){}try{v50More();}catch(e){}},300);
  if(!V50.fitIv)V50.fitIv=setInterval(()=>{try{if(!PB.drag)v50Fit();}catch(e){}},1000);}
{const _x=renderPanel;renderPanel=function(){_x();try{v50JobMarks();}catch(e){}};}
SYS_TXT.push(['頭像列（大量弟子）','寬度有上限、不擋目標欄／小地圖，「+N」開全部弟子格',()=>'<span class="tg">◂ ▸ 捲動</span><span class="tg">滾輪／拖曳捲動</span><span class="tg">+N＝全部弟子格</span><span class="tg">閒置／受傷優先</span><span class="tg">可改直列</span><details class="dt"><summary>詳情</summary>弟子很多時，頭像列最多佔畫面約 45% 寬（最多顯示約 12 個頭像），並自動避開左上目標欄、提示框與右上小地圖。用 ◂ ▸、滑鼠滾輪或拖曳捲動；按「+N」開啟全部弟子格，可依閒置、受傷、工作、隊伍篩選，一鍵選取篩選結果。藍框＝閒置、紅框＝受傷，預設排在最前。設定裡可改成左側直列，或換排序方式。多選面板的工作按鈕會亮出多數人正在做的工作，右上角小數字是各工作的人數。</details>']);
// ======================= #106 建築面板倍率文字：一行一項、數字與單位分開 =======================
const V50L={
 wudao:b=>{const n=Math.max(1,occupants(b).length),lv=blv(b),g=Math.round(TUNE.wdGroup*100),lp=Math.round(TUNE.wdLv*100);return [
   ['目前修為倍率',`× ${wudaoMul(b,n).toFixed(2)}`],['建築等級加成',`+${lp*(lv-1)} %（Lv ${lv}，每升 1 級 +${lp} %）`],['對練人數',`${n} 人（每多 1 人 +${g} %，最多 +${g*5} %）`],
   ['練武名額',`${jobSlots(b)} 人`],['計算',`基礎 ${INJOB.train.xiu} 修為／秒 × 悟性 × 體質 × 上方倍率`],['自動','弟子空閒時會自動來練武']];},
 lianwu:b=>{const lv=blv(b),lp=Math.round(TUNE.lvXiu*100);return [['目前修為倍率',`× ${lvXiuMul(b).toFixed(2)}`],['建築等級加成',`+${lp*(lv-1)} %（Lv ${lv}，每升 1 級 +${lp} %）`],
   ['閉關名額',`${jobSlots(b)} 人（各自修煉）`],['突破條件','突破「大武師」必需此建築'],['計算',`基礎 ${INJOB.seclude.xiu} 修為／秒 × 悟性 × 體質 × 上方倍率`]];},
 library:b=>{const lv=blv(b);return [['研究速度',`× ${(1+0.25*(lv-1)).toFixed(2)}（Lv ${lv}，每升 1 級 +25 %）`],['研讀名額',`${jobSlots(b)} 人`],['研讀修為',`基礎 ${INJOB.study.xiu} 修為／秒 × ${lvXiuMul(b).toFixed(2)}，並慢慢提升悟性`],['突破條件','「武學秘籍」是突破「宗師」的條件'],['丹方','可研究丹方給煉丹房使用']];},
 hall:b=>{const lv=blv(b);return [['用途','存放資源（採集的資源要搬回大殿才算入庫）'],['弟子上限',`+${BUILD.hall.pop+(typeof lvPop==='function'?lvPop(b):0)} 人`],['聽道名額',`${jobSlots(b)} 人`],['聽道修為',`基礎 ${INJOB.lecture.xiu} 修為／秒 × ${lvXiuMul(b).toFixed(2)}（Lv ${lv}）`],['注意','山賊主要目標；被毀會讓採集停擺']];},
 house:b=>[['弟子上限',`+${BUILD.house.pop+(typeof lvPop==='function'?lvPop(b):0)} 人`],['休息名額',`${jobSlots(b)} 人（回血、少量修為 ${INJOB.rest.xiu} 修為／秒）`],['洞府',S.flags.xian?'修仙階段：每座全宗修煉 +10 %（最多 +50 %）':'凡人階段尚無修煉加成']]};
{const _x=bdescHtml;bdescHtml=function(b){const F=b&&V50L[b.type];if(!F)return _x(b);const D=BDESC[b.type];let L=[];try{L=F(b);}catch(e){return _x(b);}
  const bt=typeof B49!=='undefined'&&B49[b.type]?v49BonusTxt(b.type,blv(b)):'';if(bt)L.push(['專屬加成',bt.replace(/^★/,'')]);
  return `<b class="sdl">${D?D.s:''}</b><div class="v50ls">${L.map(([k,v])=>`<div><span class="v50lk">${k}</span><span class="v50lv">${v}</span></div>`).join('')}</div>`;};}
// ======================= #105 重傷撤退：只退到安全距離（不橫越地圖），回血後回到戰鬥或原工作 =======================
TUNE.v50={retreatDist:6,retreatMax:9,retreatDg:3,guardDetect:6,guardBld:8,guardBldRed:0.25,guardTheft:0.15,guardTheftMax:0.6,guardRaidN:3,guardRaidRed:0.15}; // 20261106e：守衛索敵 11→6
{const _ss=v46SafeSpot;v46SafeSpot=function(u){try{const T=TUNE.v50,uc=unitComp(u);
    const th=S.enemies.filter(e=>!e.dead&&!e.flee&&dist(e.x,e.y,u.x,u.y)<14);if(!th.length)return _ss(u);
    let cx=0,cy=0;for(const e of th){cx+=e.x;cy+=e.y;}cx/=th.length;cy/=th.length;let ax=u.x-cx,ay=u.y-cy;const al=Math.hypot(ax,ay)||1;ax/=al;ay/=al;
    const safe=Math.min(T.retreatMax,Math.max(T.retreatDist,Math.max(...th.map(e=>(e.aggro||ENEMY[e.type].aggro||6)))+1));
    const md=(x,y)=>{let m=99;for(const e of th){const d=dist(x,y,e.x,e.y);if(d<m)m=d;}return m;};const c=[];
    if(S.dg){const mates=S.units.filter(o=>o!==u&&!o.dead&&!o.retreat&&dist(o.x,o.y,u.x,u.y)<12);
      if(mates.length){let mx=0,my=0;for(const o of mates){mx+=o.x;my+=o.y;}mx/=mates.length;my/=mates.length;let bx=mx-cx,by=my-cy;const bl=Math.hypot(bx,by)||1;c.push({x:mx+bx/bl*T.retreatDg,y:my+by/bl*T.retreatDg,w:1});}}
    else{for(const b of S.buildings)if(b.built&&!b.broken&&dist(u.x,u.y,b.i+1,b.j+1)<T.retreatMax+2){const d=doorPt(b);c.push({x:d.x,y:d.y+0.6,w:1.2});}
      for(const g of S.units)if(g.job==='guard'&&!g.dead&&g!==u&&dist(u.x,u.y,g.x,g.y)<T.retreatMax+2)c.push({x:g.x,y:g.y+0.8,w:1.2});}
    for(const a of [0,0.5,-0.5,1,-1,1.4,-1.4])for(const r of [3,4.5,6,7.5]){const ca=Math.cos(a),sa=Math.sin(a);c.push({x:u.x+(ax*ca-ay*sa)*r,y:u.y+(ax*sa+ay*ca)*r,w:1});}
    let best=null,bs=-1e9;for(const p of c){const tr=dist(u.x,u.y,p.x,p.y);if(tr>T.retreatMax+1)continue;const m=md(p.x,p.y);const s=Math.min(m,safe)*3*p.w-tr*0.35-(m<safe?6:0);
      if(s>bs){const f=nearestFree(Math.floor(p.x),Math.floor(p.y),uc);if(!f||dist(f.i+0.5,f.j+0.5,p.x,p.y)>2)continue;bs=s;best={x:f.i+0.5,y:f.j+0.5};}}
    return best||_ss(u);}catch(e){return _ss(u);}};}
function v50RetreatTick(){for(const u of S.units){if((u.kind!=='disciple'||u.np)||!u.retreat||u.dead)continue;
  if(u.hp>=u.maxhp*TUNE.retreatBack){u.retreat=null;u.medit=false;floater(u.x,u.y,'再戰！','#ffd27a');
    const e=nearestEnemy(u.x,u.y,10);if(e&&!e.flee){u.task={type:'attack',eid:e.id};u.path=[];}else if(u.prevTask&&u.prevTask.type!=='attack'){u.task=u.prevTask;u.prevTask=null;u.path=[];}else{u.task=null;u.path=[];}}}}
{const _r=v46Retreat;v46Retreat=function(u){const pt=u.retreat?null:u.task;const r=_r(u);if(r&&pt&&pt.type!=='move'){u.prevTask=pt;}if(r)u.v50rs={x:u.x,y:u.y,t:S.time};return r;};}
{const _t=v49Tick;v49Tick=function(dt){_t(dt);if(v49Client())return;V50.tk=(V50.tk||0)+dt;V50.tk2=(V50.tk2||0)+dt;
  if(V50.tk>=0.25){V50.tk=0;try{v50RetreatTick();}catch(e){console.warn(e);}}if(V50.tk2>=2){V50.tk2=0;try{v50Unstuck();}catch(e){console.warn(e);}}};}

// ======================= #104 守衛：沿宗門建築外圈巡邏、分區、偵測攔截、庇護建築、減少盜竊 =======================
function v50Guards(){return S.units.filter(u=>u.kind==='disciple'&&!u.dead&&u.job==='guard'&&!u.inside);}
function v50Hull(P){P=P.slice().sort((a,b)=>a.x-b.x||a.y-b.y);if(P.length<3)return P;const cr=(o,a,b)=>(a.x-o.x)*(b.y-o.y)-(a.y-o.y)*(b.x-o.x);const lo=[],up=[];
  for(const p of P){while(lo.length>=2&&cr(lo[lo.length-2],lo[lo.length-1],p)<=0)lo.pop();lo.push(p);}for(let i=P.length-1;i>=0;i--){const p=P[i];while(up.length>=2&&cr(up[up.length-2],up[up.length-1],p)<=0)up.pop();up.push(p);}
  up.pop();lo.pop();return lo.concat(up);}
function v50Route(){const bs=S.buildings.filter(b=>b.built&&!b.broken);const key=bs.map(b=>b.id).join(',')+'|'+(V50.routeK2||0);if(V50.route&&V50.routeK===key)return V50.route;
  const sc=sectCenter();let pts=[];
  if(bs.length>=2){const P=[];for(const b of bs){const s=BUILD[b.type].size;for(const [dx,dy] of [[0,0],[s,0],[0,s],[s,s]])P.push({x:b.i+dx,y:b.j+dy});}
    const H=v50Hull(P);let cx=0,cy=0;for(const p of H){cx+=p.x;cy+=p.y;}cx/=H.length;cy/=H.length;
    const E=H.map(p=>{const dx=p.x-cx,dy=p.y-cy,l=Math.hypot(dx,dy)||1;return {x:p.x+dx/l*2.5,y:p.y+dy/l*2.5};});
    for(let i=0;i<E.length;i++){const a=E[i],b=E[(i+1)%E.length],l=dist(a.x,a.y,b.x,b.y),n=Math.max(1,Math.round(l/5));for(let k=0;k<n;k++)pts.push({x:a.x+(b.x-a.x)*k/n,y:a.y+(b.y-a.y)*k/n});}}
  if(pts.length<4){pts=[];for(let k=0;k<8;k++){const a=k/8*Math.PI*2;pts.push({x:sc.x+Math.cos(a)*8,y:sc.y+Math.sin(a)*8});}}
  const cmp=startComp;const R=[];for(const p of pts){const f=nearestFree(Math.floor(p.x),Math.floor(p.y),cmp);if(f&&dist(f.i+0.5,f.j+0.5,p.x,p.y)<4){const q={x:f.i+0.5,y:f.j+0.5};if(!R.length||dist(q.x,q.y,R[R.length-1].x,R[R.length-1].y)>1.5)R.push(q);}}
  V50.route=R;V50.routeK=key;return R;}
// 每名守衛分配一段（多人分區；1 人走整圈）
function v50Arc(u){const R=v50Route(),G=v50Guards().filter(g=>dist(g.x,g.y,sectCenter().x,sectCenter().y)<40),n=R.length;if(n<2)return null;const k=Math.max(0,G.indexOf(u)),K=Math.max(1,G.length);
  if(K===1||n<K*3)return {R,a:0,b:n-1,loop:true,off:K>1?Math.floor(k*n/K):0};const a=Math.floor(k*n/K),b=Math.floor((k+1)*n/K);return {R,a,b:Math.min(n-1,b),loop:false};}
function v50GuardJob(u,dt){const T=TUNE.v50;const sc=sectCenter();
  // 離宗門很遠（玩家指定站崗點）→ 在站崗點附近小圈巡邏
  let A=null;if(u.guardAt&&u.gPost&&dist(u.guardAt.x,u.guardAt.y,sc.x,sc.y)>30){const c=u.gPost;const R=[];for(let k=0;k<4;k++){const a=k/4*Math.PI*2;const f=nearestFree(Math.floor(c.x+Math.cos(a)*3),Math.floor(c.y+Math.sin(a)*3),unitComp(u));if(f)R.push({x:f.i+0.5,y:f.j+0.5});}A={R,a:0,b:R.length-1,loop:true,off:0};}
  else A=v50Arc(u);if(!A||!A.R.length)return false;
  const b=damagedBuilding(u.x,u.y,8);if(b&&S.res.wood>0&&(!u.repT||S.time>u.repT)){u.repT=S.time+3;u.task={type:'repair',bid:b.id};return true;}
  if(u.gw==null||u.gw<A.a||u.gw>A.b||u.gA!==A.a+'-'+A.b){let best=A.a,bd=1e9;for(let i=A.a;i<=A.b;i++){const d=dist(u.x,u.y,A.R[i].x,A.R[i].y);if(d<bd){bd=d;best=i;}}u.gw=best;u.gA=A.a+'-'+A.b;u.gDir=u.gDir||1;u.path=[];}
  const w=A.R[u.gw];u.guardAt={x:w.x,y:w.y};
  if(dist(u.x,u.y,w.x,w.y)<0.9){u.gwN=(u.gwN||0)+1;(V50.gLog=V50.gLog||[]).push([u.id,u.gw]);if(V50.gLog.length>400)V50.gLog.shift();
    if(A.loop){u.gw=u.gw>=A.b?A.a:u.gw+1;}else{if(u.gw+u.gDir>A.b||u.gw+u.gDir<A.a)u.gDir=-u.gDir;u.gw+=u.gDir;}u.path=[];u.gwT=S.time;return true;}
  if(!u.path.length||u.needRepath||(u.gwT&&S.time-u.gwT>12)){if(!pathTo(u,w.x,w.y)){u.gw=u.gw>=A.b?A.a:u.gw+1;}u.gwT=S.time;}
  followPath(u,dt,0.85);return true;}
{const _dj=doJob;doJob=function(u,dt){if(u&&u.job==='guard'&&!S.dg&&!v49Client()){let r=false;try{r=v50GuardJob(u,dt);}catch(e){console.warn(e);}if(r)return;}return _dj(u,dt);};}
// 偵測：較大範圍內的敵人 → 攔截，並示警
{const _ud=updateDisciple;updateDisciple=function(u,dt){if(u&&u.job==='guard'&&!S.dg&&!v49Client()&&(!u.task||(u.task.type!=='attack'&&u.task.type!=='move'))&&!u.retreat){
    const e=nearestEnemy(u.x,u.y,TUNE.v50.guardDetect);if(e&&!e.flee&&!e.dead){u.prevTask=u.task;u.guardAt={x:e.x,y:e.y};u.task={type:'attack',eid:e.id};u.path=[];u.medit=false;u.thought='❗';u.gInt=(u.gInt||0)+1;u.thT=S.time;
      if(!V50.gAlertT||S.time-V50.gAlertT>20){V50.gAlertT=S.time;try{toast(`🛡 守衛「${u.name}」發現${ENEMY[e.type]?ENEMY[e.type].n||'敵人':'敵人'}來襲，前往攔截！`);if(typeof ping==='function')ping(e.x,e.y,true);}catch(er){}}}}
  return _ud(u,dt);};}
// 指定站崗位置（移動指令）→ 記住站崗點
{const _cm=commandMove;commandMove=function(us,tx,ty,sh){const r=_cm(us,tx,ty,sh);try{for(const u of us||[])if(u&&u.job==='guard')u.gPost={x:tx,y:ty};}catch(e){}return r;};}
{const _aj=assignJob;assignJob=function(u,job,arg){const r=_aj(u,job,arg);if(r&&u&&job==='guard'){u.gPost=null;u.gw=null;}return r;};}
// 庇護：守衛附近的建築受損減少；守衛夠多時全宗受損再減少
function v50GuardNear(b){const s=BUILD[b.type].size,cx=b.i+s/2,cy=b.j+s/2;return v50Guards().filter(g=>dist(g.x,g.y,cx,cy)<TUNE.v50.guardBld+s/2).length;}
function v50GuardRed(b){const T=TUNE.v50;let m=1;if(v50GuardNear(b))m*=1-T.guardBldRed;if(v50Guards().length>=T.guardRaidN)m*=1-T.guardRaidRed;return m;}
{const _db=dmgBuilding;dmgBuilding=function(src,b,amt){try{if(b&&!S.dg&&!v49Client()){amt*=v50GuardRed(b);v50DefAlarm(b,src);}}catch(e){}return _db(src,b,amt);};}
// #164 宗門防衛調度（只在主機）：建築受襲或敵人進入宗門範圍 → 估算威脅，派出最近、能打的弟子（守衛＞練武＞閒置），戰力達威脅 1.3 倍；威脅解除後回原工作
TUNE.v164={ratio:1.3,capFrac:0.4,capMin:2,areaPad:6,areaMin:16,focusR:12,every:1};
const V164={alarm:null,ids:[],log:[],t:0};
function v164Pow(o){return Math.sqrt(Math.max(1,o.hp||o.maxhp||1)*Math.max(0.5,o.atk||1));}
function v164Area(){const sc=sectCenter();let R=TUNE.v164.areaMin;for(const b of S.buildings){const s=BUILD[b.type].size;R=Math.max(R,dist(sc.x,sc.y,b.i+s/2,b.j+s/2)+TUNE.v164.areaPad);}return {x:sc.x,y:sc.y,R};}
function v50DefAlarm(b,src){const s=BUILD[b.type].size;V164.alarm={x:b.i+s/2,y:b.j+s/2,t:S.time,bid:b.id};}
function v164Busy(u){if(u.dead||u.inside||u.kind!=='disciple')return true;const ij=u.inj&&u.inj.k;if(ij==='heavy'||ij==='meridian')return true;
  if(u.job==='seclude'||u.job==='follow'||u.job==='dual')return true;// 室內工作（煉丹、鍛造、修煉中）由 u.inside 判斷
  if(u.task&&(u.task.type==='seclude'||u.task.type==='enter'))return true;return !!(u.away||u.mission||u.expd||u.dgIn);}
function v164Rank(u){return u.job==='guard'?0:u.job==='train'?1:!u.job?2:3;}
function v50DefTick(st){V164.t+=st;if(V164.t<TUNE.v164.every)return;V164.t=0;if(S.dg||v49Client())return;
  const A=v164Area(),al=V164.alarm&&S.time-V164.alarm.t<10?V164.alarm:null;
  let foes=S.enemies.filter(e=>!e.dead&&!e.flee&&(dist(e.x,e.y,A.x,A.y)<A.R||(al&&dist(e.x,e.y,al.x,al.y)<TUNE.v164.focusR)));
  const live=V164.ids.map(id=>unitById(id)).filter(u=>u&&!u.dead);
  if(!foes.length){if(live.length){for(const u of live){if(u.task&&u.task.type==='attack')u.task=null;u.path=[];if(u.v164g)u.guardAt=u.v164g;u.v164=null;u.v164g=null;}V164.log.push({t:S.time,end:1,n:live.length});}V164.ids=[];V164.alarm=null;return;}
  const threat=foes.reduce((a,e)=>a+v164Pow(e),0),need=threat*TUNE.v164.ratio,fc=al||{x:foes[0].x,y:foes[0].y};
  const ds=S.units.filter(u=>u.kind==='disciple'&&!u.dead);const cap=Math.max(TUNE.v164.capMin,Math.ceil(ds.length*TUNE.v164.capFrac));
  let have=live.reduce((a,u)=>a+v164Pow(u),0);const pool=ds.filter(u=>!V164.ids.includes(u.id)&&!v164Busy(u)).sort((a,b)=>v164Rank(a)-v164Rank(b)||dist(a.x,a.y,fc.x,fc.y)-dist(b.x,b.y,fc.x,fc.y));
  const add=[];for(const u of pool){if(live.length+add.length>=cap)break;if(have>=need&&live.length+add.length>=1)break;add.push(u);have+=v164Pow(u);}
  for(const u of add){V164.ids.push(u.id);u.v164=1;u.v164g=u.guardAt||null;}
  // 每位防衛者：鎖定離受襲點最近的來犯者
  for(const id of V164.ids){const u=unitById(id);if(!u||u.dead||u.retreat||u.hp<u.maxhp*0.25||v164Busy(u))continue;// 撤退／重傷／進屋者不再強派
    const tg=u.task&&u.task.type==='attack'?enemyById(u.task.eid):null;if(tg&&!tg.dead&&foes.includes(tg))continue;
    let e=null,bd=1e9;for(const f of foes){const d=dist(f.x,f.y,fc.x,fc.y)+dist(f.x,f.y,u.x,u.y)*0.3;if(d<bd){bd=d;e=f;}}if(!e)continue;
    if(u.medit)u.medit=false;u.prevTask=null;u.guardAt={x:e.x,y:e.y};u.task={type:'attack',eid:e.id};u.path=[];u.thought='❗';u.thT=S.time;}
  if(add.length){V164.log.push({t:S.time,add:add.map(u=>u.id),threat:Math.round(threat),have:Math.round(have),foes:foes.length});if(V164.log.length>100)V164.log.shift();
    if(!V164.toastT||S.time-V164.toastT>20){V164.toastT=S.time;try{toast(`🛡 宗門遇襲：派出 ${add.map(u=>u.name).slice(0,4).join('、')}${add.length>4?' 等 '+add.length+' 人':''} 迎敵`);ping(fc.x,fc.y,true);}catch(e){}}}}
// 妖物偷竊：守衛越多追回越多
{const _ys=v48YaoStrike;v48YaoStrike=function(o){const l0=S.res.lingshi,f0=S.res.food;_ys(o);try{const n=v50Guards().length;if(!n)return;const k=Math.min(TUNE.v50.guardTheftMax,TUNE.v50.guardTheft*n);
  const ls=Math.round((l0-S.res.lingshi)*k),fd=Math.round((f0-S.res.food)*k);if(ls>0||fd>0){S.res.lingshi+=ls;S.res.food+=fd;toast(`🛡 ${n} 名守衛追回贓物：靈石 ${ls}、食物 ${fd}`);}}catch(e){}};}
function v50GuardTxt(){const T=TUNE.v50,n=v50Guards().length,k=Math.round(Math.min(T.guardTheftMax,T.guardTheft*n)*100);
  return `守衛 ${n} 人：沿宗門外圈巡邏、${T.guardDetect} 格內發現敵人即攔截；附近建築受損 −${Math.round(T.guardBldRed*100)} %${n>=T.guardRaidN?`、全宗受損再 −${Math.round(T.guardRaidRed*100)} %`:`（${T.guardRaidN} 人以上全宗受損再 −${Math.round(T.guardRaidRed*100)} %）`}；妖物偷竊追回 ${k} %`;}
// 顯示：頭上盾牌、選取時畫巡邏路線
{const _dh=drawHuman;drawHuman=function(u){_dh(u);try{if(u.kind!=='disciple'||u.job!=='guard'||S.dg)return;const b=P(u.x,u.y);ctx.save();ctx.font='11px sans-serif';ctx.textAlign='center';ctx.globalAlpha=0.95;ctx.fillText('🛡',b.x+15,b.y-36);ctx.restore();
  if(selUnits.includes(u.id)&&V50.rtF!==V50.frame){V50.rtF=V50.frame;const R=v50Route();if(R.length>1){ctx.save();ctx.strokeStyle='rgba(127,182,255,0.55)';ctx.lineWidth=1.5;ctx.setLineDash([5,5]);ctx.beginPath();R.forEach((p,i)=>{const q=P(p.x,p.y);i?ctx.lineTo(q.x,q.y):ctx.moveTo(q.x,q.y);});ctx.closePath();ctx.stroke();
    const A=v50Arc(u);if(A&&!A.loop){ctx.strokeStyle='rgba(255,211,77,0.75)';ctx.lineWidth=2.5;ctx.setLineDash([]);ctx.beginPath();for(let i=A.a;i<=A.b;i++){const q=P(R[i].x,R[i].y);i===A.a?ctx.moveTo(q.x,q.y):ctx.lineTo(q.x,q.y);}ctx.stroke();}
    ctx.restore();}}}catch(e){}};}
{const _d=draw;draw=function(){V50.frame=(V50.frame||0)+1;return _d();};}
// 面板：建築顯示守衛庇護；宗門大事顯示守衛人數與效果；守衛按鈕提示
{const _x=renderPanel;renderPanel=function(){_x();try{const pn=document.getElementById('panel');if(!pn)return;
  if(selBuilding!=null&&!S.dg){const b=bById(selBuilding);if(b){let el=document.getElementById('v50_gd');const n=v50GuardNear(b),m=v50GuardRed(b);const t=n||m<1?`🛡 守衛庇護：受損 −${Math.round((1-m)*100)} %（附近守衛 ${n} 人）`:'🛡 附近沒有守衛（派弟子「守衛」可降低受損）';
    if(!el){el=document.createElement('div');el.id='v50_gd';el.className='mini';const pd=pn.querySelector('.pdesc')||pn.querySelector('h4');if(pd)pd.after(el);else pn.appendChild(el);}if(el.textContent!==t)el.textContent=t;}}
  for(const b of pn.querySelectorAll('[data-job="guard"]'))b.title=v50GuardTxt();}catch(e){}};}
{const _x=v48Html;v48Html=function(){let h=_x();try{h+=`<div class="v50gtx" style="margin-top:6px;padding:4px 6px;border:1px solid #5a4a30;border-radius:6px">${v50GuardTxt()}</div>`;}catch(e){}return h;};}

// ======================= #107 相鄰建築：新建築須留 1 格走道（g17 已有）；舊存檔貼在一起的建築打通邊緣格；被圍住的單位會擠出來 =======================
function v50OpenSeams(){if(S.dg)return 0;let n=0;const bs=S.buildings;
  for(let a=0;a<bs.length;a++)for(let c=0;c<bs.length;c++){if(a===c)continue;const A=bs[a],B=bs[c],sa=BUILD[A.type].size,sb=BUILD[B.type].size;
    // A 的右緣貼 B 的左緣（或下緣貼上緣）→ 打通 A 的那一排邊緣格
    const ovY=Math.min(A.j+sa,B.j+sb)-Math.max(A.j,B.j),ovX=Math.min(A.i+sa,B.i+sb)-Math.max(A.i,B.i);
    if(A.i+sa===B.i&&ovY>0){const i=A.i+sa-1;for(let j=Math.max(A.j,B.j);j<Math.min(A.j+sa,B.j+sb);j++){const k=j*N+i;if(block[k]){block[k]=0;n++;}}}
    if(A.j+sa===B.j&&ovX>0){const j=A.j+sa-1;for(let i=Math.max(A.i,B.i);i<Math.min(A.i+sa,B.i+sb);i++){const k=j*N+i;if(block[k]){block[k]=0;n++;}}}}
  return n;}
{const _rb=rebuildBlock;rebuildBlock=function(){_rb();try{if(v50OpenSeams()){computeComp();V50.seams=(V50.seams||0)+1;}}catch(e){console.warn(e);}};}
function v50Unstuck(){if(S.dg||S.interior)return;for(const u of S.units){if(u.dead||u.inside)continue;const i=Math.floor(u.x),j=Math.floor(u.y);if(!inMap(i,j))continue;const c=comp[j*N+i];
  if(c===startComp||block[j*N+i])continue;let sz=0;try{sz=compSize(c);}catch(e){sz=999;}if(sz>60)continue;
  const f=nearestFree(i,j,startComp);if(f&&dist(f.i+0.5,f.j+0.5,u.x,u.y)<8){u.x=f.i+0.5;u.y=f.j+0.5;u.path=[];u.vx=u.vy=0;floater(u.x,u.y,'擠出','#9fe0ff');}}}

// ======================= #108 宗門目標面板：已完成收合、目前＋接下來 2 項、提示／進度／獎勵／📍前往、完成獎勵 =======================
const V50_RW=[{food:20},{wood:30,stone:20},{food:30},{wood:30},{food:30,wood:20},{stone:30},{lingshi:5},{lingshi:10},{lingshi:15},{lingshi:20},{lingshi:30},{lingshi:40}];
const V50_RN={wood:'木材',stone:'石材',fiber:'纖維',food:'食物',lingshi:'靈石'};
function v50RwStr(k){const r=V50_RW[k]||{};return Object.keys(r).map(x=>`${V50_RN[x]||x} ${r[x]}`).join('、');}
function v50ObjProg(k){const p=player(),R=S.res,f=Math.floor,c=(n,m)=>`${Math.min(n,m)}/${m}`;const st=S.stats||{};
  switch(k){case 0:return `木材 ${c(f(R.wood),30)}、石材 ${c(f(R.stone),20)}、纖維 ${c(f(R.fiber),10)}`;
    case 1:case 2:case 5:{const t=['','hall','altar','','','wudao'][k];const b=S.buildings.find(b=>b.type===t);return b?(b.built?'已建成 1/1':`施工中 ${Math.floor((b.progress||0)*100)} %`):`${BUILD[t].name} 0/1`;}
    case 3:return `招募弟子 ${c(st.recruited||0,1)}`;case 4:return `搬回大殿 ${c(st.discDeposit||0,1)}`;
    case 6:return `武師弟子 ${c(disciples().filter(d=>d.realm>=1).length,1)}`;case 7:return `交易 ${c(st.trades||0,1)}`;
    case 8:return `擊退襲擊 ${c(st.raidsRepelled||0,1)}`;case 9:return `取得功法 ${S.flags.ruinLoot?1:0}/1`;
    case 10:return `你的境界：${p?REALMS[p.realm].n:'—'}（目標 ${REALMS[4].n}）`;case 11:return `求仙台 ${S.buildings.some(b=>b.type==='altar'&&b.up)?1:0}/1`;}return '';}
function v50ObjTarget(k){const p=player(),sc=sectCenter(),bt=t=>{const b=S.buildings.find(b=>b.type===t);return b?{x:b.i+BUILD[b.type].size/2,y:b.j+BUILD[b.type].size/2}:null;};
  const near=(arr)=>{let best=null,bd=1e9;const o=p||sc;for(const v of arr){const d=dist(o.x,o.y,v.x,v.y);if(d<bd){bd=d;best=v;}}return best;};
  switch(k){case 0:{const R=S.res,need=R.wood<30?'tree':R.stone<20?'rock':'fiber';const n=near(NODES.filter(n=>!n.gone&&(n.type===need||need==='rock'&&n.type==='stone')).map(n=>({x:n.i+0.5,y:n.j+0.5})))||near(NODES.filter(n=>!n.gone).map(n=>({x:n.i+0.5,y:n.j+0.5})));return n;}
    case 1:case 4:return bt('hall')||sc;case 2:case 3:case 11:return bt('altar')||sc;case 5:return bt('wudao')||sc;case 6:return bt('wudao')||sc;
    case 7:{const v=near(S.villages.filter(v=>v.type!=='bandit'&&!v.destroyed));return v?{x:v.x,y:v.y}:null;}
    case 8:{const e=near(S.enemies.filter(e=>e.raid&&!e.dead));if(e)return {x:e.x,y:e.y};const v=near(S.villages.filter(v=>v.type==='bandit'&&!v.destroyed));return v?{x:v.x,y:v.y}:null;}
    case 9:return ANCH&&ANCH.ruin?{x:ANCH.ruin.x+0.5,y:ANCH.ruin.y+0.5}:null;case 10:return p?{x:p.x,y:p.y}:null;}return null;}
function v50ObjGo(k){const t=v50ObjTarget(k);if(!t){toast('找不到目標位置');return false;}if(S.interior)try{exitInterior(true);}catch(e){}
  const q=iso(t.x,t.y);cam.x=q.x;cam.y=q.y-20;cam.follow=false;try{ping(t.x,t.y,k===8);}catch(e){}V50.goT={x:t.x,y:t.y,t:S.time+8,k};V50.goN=(V50.goN||0)+1;
  toast(`📍 ${OBJ[k]}：已移動鏡頭並在小地圖標示（按空白鍵回到自己）`);return true;}
function v50ObjHtml(){const o=S.objDone;let cur=o.findIndex(v=>!v);if(cur<0)cur=NOBJ;const HN=isTouchUI?HINTS_TOUCH:HINTS_PC;const nd=o.filter(Boolean).length;
  let h='<h3>宗門目標</h3>';
  if(nd)h+=`<div class="v50od" data-v50od="1">✔ 已完成 ${nd} 項 <span>${V50.objDone?'▾':'▸'}</span></div>`+(V50.objDone?`<div class="v50odl">${OBJ.map((t,k)=>o[k]?`<div class="o done">✔ ${t}</div>`:'').join('')}</div>`:'');
  if(cur<NOBJ){h+=`<div class="o cur">${cur+1}. ${OBJ[cur]}</div><div class="v50oh">💡 ${HN[cur]}</div><div class="v50op"><span>📊 ${v50ObjProg(cur)}</span><span>🎁 ${v50RwStr(cur)}</span></div>`+
      (v50ObjTarget(cur)?`<button class="v50go" data-v50go="${cur}">📍 前往</button>`:'');
    let nx=0;for(let k=cur+1;k<NOBJ&&nx<2;k++){if(o[k])continue;nx++;h+=`<div class="o v50nx">${k+1}. ${OBJ[k]} <small>🎁 ${v50RwStr(k)}</small></div>`;}}
  else h+='<div class="o cur">★ 全部完成</div><div class="v50oh">'+HN[NOBJ]+'</div>';
  h+=`<div class="chip">◎ ${cur<NOBJ?(cur+1)+'/'+NOBJ+' '+OBJ[cur]:'★ 全部完成'} <span style="color:#cdbb92">▾</span></div>`;return h;}
updateObjectives=function(){const o=S.objDone;let cur=o.findIndex(v=>!v);if(cur<0)cur=NOBJ;const HN=isTouchUI?HINTS_TOUCH:HINTS_PC;
  const h=v50ObjHtml(),el=$('objectives');if(V50.objH!==h||el.innerHTML.indexOf('v50op')<0&&cur<NOBJ){V50.objH=h;el.innerHTML=h;}if(isTouchUI){const ex=el.classList.contains('expanded');if(V50.objEx!==ex||!V50.objFT||performance.now()-V50.objFT>1000){V50.objEx=ex;V50.objFT=performance.now();try{v50ObjFit();}catch(e){}}}
  const hint='<b style="color:#f3d48a">提示</b>　'+HN[cur]+(cur===0?`<br>目前：木材 ${Math.floor(S.res.wood)}/30、石材 ${Math.floor(S.res.stone)}/20、纖維 ${Math.floor(S.res.fiber)}/10`:'');
  if($('hint').innerHTML!==hint)$('hint').innerHTML=hint;};
// 完成獎勵（舊存檔：已完成的不補發）
{const _co=checkObjectives;checkObjectives=function(){const F=S.flags;if(!F.v50rw){F.v50rw=S.objDone.map(Boolean);}const b=S.objDone.slice();_co();
  try{if(v49Client())return;for(let k=0;k<NOBJ;k++)if(S.objDone[k]&&!F.v50rw[k]){F.v50rw[k]=true;const r=V50_RW[k]||{};for(const x in r)S.res[x]=(S.res[x]||0)+r[x];
    toast(`🎁 目標「${OBJ[k]}」完成獎勵：${v50RwStr(k)}`);V50.rwN=(V50.rwN||0)+1;}}catch(e){console.warn(e);}};}
function v50ObjFit(){const o=document.getElementById('objectives'),m=document.getElementById('minimap');if(!o)return;o.style.maxWidth='';if(!m||getComputedStyle(m).display==='none')return;
  const a=o.getBoundingClientRect(),b=m.getBoundingClientRect();if(!a.width||!b.width)return;if(a.left<b.right&&b.left<a.right&&a.top<b.bottom&&b.top<a.bottom&&b.left>a.left+120){o.style.maxWidth=Math.floor(b.left-a.left-6)+'px';}}
function v50ObjInit(){const el=$('objectives');if(!el||el.v50)return;el.v50=1;
  el.addEventListener('click',ev=>{const g=ev.target.closest('[data-v50go]');const d=ev.target.closest('[data-v50od]');
    if(g){ev.stopImmediatePropagation();ev.preventDefault();v50ObjGo(+g.dataset.v50go);return;}
    if(d){ev.stopImmediatePropagation();V50.objDone=!V50.objDone;V50.objH=null;updateObjectives();setTimeout(()=>{try{v50Fit();}catch(e){}},0);return;}
    setTimeout(()=>{try{v50ObjFit();v50Fit();}catch(e){}},0);},true);}
const V50_OCSS=`#objectives{font-size:calc(13px * var(--xwfs,1));width:min(calc(270px * var(--xwfs,1)),46vw);max-height:calc(100vh - var(--tb,40px) - 150px);overflow-y:auto;overscroll-behavior:contain}
#objectives h3{font-size:calc(14px * var(--xwfs,1))}
#objectives .v50od{cursor:pointer;color:#9fd88a;opacity:.9;border-bottom:1px dashed #4a3620;margin-bottom:3px;padding-bottom:2px}
#objectives .v50odl .o.done{font-size:.88em}
#objectives .v50oh{color:#e8dcb8;font-size:.9em;line-height:1.45;margin:2px 0 3px}
#objectives .v50op{display:flex;flex-wrap:wrap;gap:2px 10px;font-size:.88em;color:#cfe3ff}
#objectives .v50op span:last-child{color:#ffd98a}
#objectives .v50go{margin:4px 0 4px;padding:2px 10px;font-size:.92em;background:#3a5a2a;color:#eaffd8;border:1px solid #8ad06a;border-radius:5px;cursor:pointer}
#objectives .v50nx{opacity:.6;font-size:.92em}#objectives .v50nx small{color:#cdbb92;font-size:.85em}
body.touch #objectives{font-size:calc(11.5px * var(--xwfs,1))}
body.touch #objectives.expanded{width:min(calc(280px * var(--xwfs,1)),86vw);max-height:calc(100vh - var(--tb,40px) - 190px)}
body.touch #objectives:not(.expanded) .v50od,body.touch #objectives:not(.expanded) .v50odl,body.touch #objectives:not(.expanded) .v50oh,body.touch #objectives:not(.expanded) .v50op,body.touch #objectives:not(.expanded) .v50go{display:none}
body.touch #objectives .ohint{display:none!important}`;
function v50ObjCss(){if(document.getElementById('v50ocss'))return;const s=document.createElement('style');s.id='v50ocss';s.textContent=V50_OCSS;document.head.appendChild(s);}
// 前往目標：畫面上的指示箭頭（8 秒）
{const _d=draw;draw=function(){_d();try{const G=V50.goT;if(!G||S.time>G.t||S.dg||S.interior)return;const q=iso(G.x,G.y),z=cam.zoom;let sx=(q.x-cam.x)*z+W/2,sy=(q.y-cam.y)*z+H/2;
  const m=40,on=sx>m&&sx<W-m&&sy>m+30&&sy<H-m;ctx.save();ctx.setTransform(dpr,0,0,dpr,0,0);const bob=Math.sin(performance.now()/180)*5;
  if(on){ctx.fillStyle='#ffd34d';ctx.strokeStyle='#3a2a10';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(sx,sy-26+bob);ctx.lineTo(sx-10,sy-44+bob);ctx.lineTo(sx+10,sy-44+bob);ctx.closePath();ctx.fill();ctx.stroke();}
  else{const cx=W/2,cy=H/2,a=Math.atan2(sy-cy,sx-cx);const ex=Math.max(m,Math.min(W-m,cx+Math.cos(a)*W)),ey=Math.max(m+40,Math.min(H-m,cy+Math.sin(a)*H));
    const k=Math.min((W/2-m)/Math.abs(Math.cos(a)||1e-6),(H/2-m-20)/Math.abs(Math.sin(a)||1e-6));const ax=cx+Math.cos(a)*k,ay=cy+Math.sin(a)*k;
    ctx.translate(ax,ay);ctx.rotate(a);ctx.fillStyle='#ffd34d';ctx.strokeStyle='#3a2a10';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(14+bob/2,0);ctx.lineTo(-10,-11);ctx.lineTo(-4,0);ctx.lineTo(-10,11);ctx.closePath();ctx.fill();ctx.stroke();}
  ctx.restore();}catch(e){}};}

SYS_TXT.push(['守衛巡邏','守衛沿宗門外圈分區巡邏、攔截來犯者、降低建築受損與偷竊',()=>`<span class="tg">🛡 分區巡邏</span><span class="tg">${TUNE.v50.guardDetect} 格偵測攔截</span><span class="tg">附近建築受損 −${Math.round(TUNE.v50.guardBldRed*100)} %</span><span class="tg">偷竊追回 每人 ${Math.round(TUNE.v50.guardTheft*100)} %</span><details class="dt"><summary>詳情</summary>${v50GuardTxt()}。選取守衛可看巡邏路線（黃色＝自己的分區）。用移動指令把守衛派到遠處時，會在該處小範圍巡邏。</details>`]);
SYS_TXT.push(['撤退與走道','重傷只退到安全距離，回血後回到戰鬥；建築之間留走道',()=>`<span class="tg">撤退 ${TUNE.v50.retreatDist}～${TUNE.v50.retreatMax} 格</span><span class="tg">副本：退到隊伍後方 ${TUNE.v50.retreatDg} 格</span><span class="tg">血量 ${Math.round(TUNE.retreatBack*100)} % 回戰</span><span class="tg">建築間留 ${TUNE.bldGap||1} 格</span><details class="dt"><summary>詳情</summary>舊存檔中貼在一起的建築，邊緣格會自動打通成走道；被圍住的弟子會自動擠出來。</details>`]);
SYS_TXT.push(['宗門目標面板','已完成收合、顯示目前＋接下來 2 項、提示／進度／獎勵、📍 前往',()=>'<span class="tg">✔ 已完成 N 項（可展開）</span><span class="tg">📊 進度</span><span class="tg">🎁 完成獎勵</span><span class="tg">📍 前往＝移動鏡頭＋小地圖標示＋箭頭</span>']);

// ======================= #124 妖獸／敵人境界標示：依數值換算境界（含副本層級加成），依相對主角上色 =======================
TUNE.v51={mobRef:25.3,bossDiv:2,
  gfRuinDg:0.06,gfXfRepeat:0.10,gfEvBase:0.10,gfEvWu:0.001,gfAuction:0.35,gfGap:3600,gfHold:2,gfPages:5,gfDupLs:10};
const V51={cur:null,done:false,lad:null};
function v51Lad(){if(V51.lad)return V51.lad;const a=[];let f=1;for(let r=0;r<=MAX_REALM;r++){const n=v52N(r),sb=1+(v52Lay(r)?TUNE.v52.layerBonus:(TUNE.subBonus||0.04));for(let s=0;s<n;s++){a.push({f,r,s});if(s<n-1)f*=sb;}f*=Math.sqrt(xnStepM(r,'hp')*xnStepM(r,'atk'));}return V51.lad=a;}
function v51Realm(e){if(!e)return {r:0,s:0};const key=e.maxhp+'|'+e.atk+'|'+e.realm+'|'+(e.v49lq?1:0);if(e.v51k===key&&e.v51r)return e.v51r;let o;
  const D=ENEMY[e.type]||{};
  if(e.v49lq||e.type==='xfboss'&&(e.realm||0)>=4){o={r:Math.min(MAX_REALM,e.realm||4),s:0};}
  else{const x=Math.sqrt(Math.max(1,e.maxhp)*Math.max(0.1,e.atk))/TUNE.v51.mobRef/(D.boss||e.boss?TUNE.v51.bossDiv:1);const L=v51Lad();let k=0;for(let i=0;i<L.length;i++)if(L[i].f<=x)k=i;
    o={r:L[k].r,s:L[k].s};if(o.r<(e.realm||0))o={r:Math.min(MAX_REALM,e.realm),s:0};}
  e.v51k=key;e.v51r=o;return o;}
// #162 境界探查：看到的境界取決於「本地」主角的境界與神識。≤ 自己＝真實；高於自己＝越高越可能看不透（「???」）或看錯（偏低）。
// 每個目標固定（以目標 id、觀看者 id、真實境界做雜湊），不會閃動；神識（境界、悟性）越強越準
TUNE.v162={unk:0.3,wrong:0.25,shenR:0.12,shenR0:3,shenWu:0.002,shenMax:0.6};
function v162Shen(p){const T=TUNE.v162;return clamp(T.shenR*Math.max(0,(p.realm||0)-T.shenR0)+T.shenWu*((p.wu||50)-50),0,T.shenMax);}
function v162H(a,b,c){let h=(a*2654435761)^(b*40503)^(c*97);h=Math.imul(h^(h>>>16),2246822507);h=Math.imul(h^(h>>>13),3266489909);return ((h^(h>>>16))>>>0)/4294967296;}
function v162See(e,p){p=p||player();const o=v51Realm(e);if(!p||e.v162ok)return {r:o.r,s:o.s,k:'true'};const L=v51Lad(),ti=L.findIndex(x=>x.r===o.r&&x.s===o.s),pi=L.findIndex(x=>x.r===p.realm&&x.s===(p.sub||0));
  if(o.r<p.realm||(o.r===p.realm&&(ti<=pi||pi<0)))return {r:o.r,s:o.s,k:'true'};
  const T=TUNE.v162,sh=v162Shen(p),g=o.r-p.realm;if(g===0)return {r:o.r,s:-1,k:'layer'};// 同境界但層數較高：看得出境界，看不清層數
  const h=v162H(e.id|0,p.id|0,o.r*16+o.s),pu=clamp(T.unk*g-sh,0,0.95),pw=clamp(T.wrong*g-sh*0.5,0,0.95-pu);
  if(h<pu)return {r:-1,s:0,k:'unk'};if(h<pu+pw){const wr=Math.max(p.realm,o.r-1-Math.floor(v162H(e.id|0,7,o.r)*Math.max(1,g-1)));return {r:Math.min(wr,o.r-1),s:Math.floor(v162H(e.id|0,11,o.r)*v52N(Math.min(wr,o.r-1))),k:'wrong'};}
  return {r:o.r,s:o.s,k:'true'};}
function v51RName(e){const v=v162See(e);if(v.r<0)return '???';return REALMS[v.r].n+(v.s<0?'？層':v52SubName(v.r,v.s));}
function v51Rel(e){const p=player();const pr=p?p.realm:0,v=v162See(e,p);if(v.r<0)return 2;const er=v.r;return er<pr?-1:er===pr?(v.s<0?1:0):er===pr+1?1:2;}
function v51Col(e){return ['#a8a8a8','#ffffff','#ffa040','#ff4a4a'][v51Rel(e)+1];}
const V51_RX=/・(大武師|武徒|武師|宗師|[煉練]氣|築基|金丹|元嬰|化神|合體|地仙|天仙)(初期|中期|後期|圓滿|大圓滿|[一二三四五六七八九]層)?$/;
const V51_REALM_IN=/((?:大)?武師|武徒|宗師|[煉練]氣|築基|金丹|元嬰|化神|合體|地仙|天仙)(初期|中期|後期|圓滿|大圓滿|[一二三四五六七八九]層)?/g;
function v51Unk(e){try{return v162See(e).r<0;}catch(er){return false;}}
function v51SafeEnemyName(e){
  try{
    if(!e)return '???';
    const D=(typeof ENEMY!=='undefined'&&ENEMY[e.type])||{};
    const kind=e.exd===1?'叛門山賊':(D.n||e.type||'敵人');
    if(v51Unk(e)){
      // 無法觀察：名牌／面板／日誌皆不可洩漏境界（稱號裡的「煉氣頭目」也要藏）
      return kind+'・???';
    }
    const rn=v51RName(e);
    // 可觀察：保留稱號，但結尾境界一律走探查結果
    let title='';
    if(e.dgName)title=String(e.dgName);
    else if(e.name)title=String(e.name);
    // 稱號若夾帶境界詞，可觀察時仍可留；不可觀察已在上方處理
    if(e.bh)return '賞金獵人'+(title?('「'+title+'」'):'')+'・'+rn;
    if(e.yao)return '妖修'+(title?('「'+(title||'無名')+'」'):'')+'・'+rn;
    if(title)return kind+'「'+title+'」・'+rn;
    if(D.human)return kind+'・'+rn;
    return (D.n||kind)+'・'+rn;
  }catch(er){return '敵人・???';}
}
{const _en=enemyName;enemyName=function(e){try{if(!e||!(typeof ENEMY!=='undefined'&&ENEMY[e.type])&&!e.dgName)return _en(e);return v51SafeEnemyName(e);}catch(er){try{return _en(e);}catch(e2){return '???';}}};}
{const _db=drawBeast;drawBeast=function(e){V51.cur=e;V51.done=false;try{_db(e);}finally{V51.cur=null;}};}
{const _lb=label;label=function(t,x,y,c,f){const e=V51.cur;if(e&&!V51.done){V51.done=true;try{t=enemyName(e);c=v51Col(e);}catch(er){}}return _lb(t,x,y,c,f);};}
// 選取敵人：資訊卡顯示境界與強弱
{const _x=renderPanel;renderPanel=function(){_x();try{if(!(selOther&&selOther.k==='e'))return;const e=enemyById(selOther.id);const pn=document.getElementById('panel');if(!e||!pn)return;
  const rel=v51Rel(e),t=`境界：${v51RName(e)}　${['比你弱','與你同境','比你強','遠強於你，小心'][rel+1]}`;let el=document.getElementById('v51_er');
  if(!el){el=document.createElement('div');el.id='v51_er';el.className='mini';const h=pn.querySelector('h4');if(h)h.after(el);else pn.prepend(el);}
  if(el.textContent!==t){el.textContent=t;el.style.color=v51Col(e);el.style.fontWeight='bold';}}catch(er){}};}

// ======================= #125 功法稀有化：降低各來源機率、間隔限制、重複轉殘頁／靈石 =======================
function v51GfGive(src,guar){const T=TUNE.v51,F=S.flags,I=S.items;I.gfp=I.gfp||0;
  const open=guar||((S.time-(F.v51gfT!=null?F.v51gfT:-1e9))>=T.gfGap&&(I.gongfa||0)<T.gfHold);
  (V51.log=V51.log||[]).push([src,open?'gf':'page',Math.round(S.time)]);
  if(open){I.gongfa=(I.gongfa||0)+1;F.v51gfT=S.time;return 'gf';}
  I.gfp++;S.res.lingshi=(S.res.lingshi||0)+T.gfDupLs;
  if(I.gfp>=T.gfPages&&(S.time-(F.v51gfT!=null?F.v51gfT:-1e9))>=T.gfGap){I.gfp-=T.gfPages;I.gongfa=(I.gongfa||0)+1;F.v51gfT=S.time;try{toast(`📜 ${T.gfPages} 張功法殘頁拼成一卷完整功法！（功法 +1）`);}catch(e){}return 'gf';}
  return 'page';}
// 副本首領：遺跡 25 % → 6 %；仙凡之門 首通必得、之後 100 % → 10 %
{const _x=dgBossDown;dgBossDown=function(e){const D=S.dg,K=D&&D.kind;_x(e);try{if(!D||!D.loot||!D.loot.misc||v49Client())return;const M=D.loot.misc;if(!M.gongfa)return;
  let keep=true,guar=false;if(K==='ruin')keep=rnd()<TUNE.v51.gfRuinDg/0.25;else if(K==='xf'){if(!S.flags.v51xf1){S.flags.v51xf1=1;guar=true;}else keep=rnd()<TUNE.v51.gfXfRepeat;}
  M.gongfa=0;if(!keep){M.gfp=(M.gfp||0)+1;return;}if(guar){M.gongfa=1;S.flags.v51gfT=S.time;return;}
  const r=v51GfGate();if(r)M.gongfa=1;else M.gfp=(M.gfp||0)+1;}catch(er){console.warn(er);}};}
function v51GfGate(){const T=TUNE.v51,F=S.flags;const ok=(S.time-(F.v51gfT!=null?F.v51gfT:-1e9))>=T.gfGap&&(S.items.gongfa||0)<T.gfHold;if(ok)F.v51gfT=S.time;return ok;}
{const _x=dgExit;dgExit=function(keep){const D=S.dg;const n=D&&D.loot&&D.loot.misc&&D.loot.misc.gfp||0;const r=_x(keep);try{if(n&&keep){S.items.gfp=(S.items.gfp||0)+n;S.res.lingshi=(S.res.lingshi||0)+TUNE.v51.gfDupLs*n;
  toast(`📜 功法殘頁 +${n}、靈石 +${TUNE.v51.gfDupLs*n}（集滿 ${TUNE.v51.gfPages} 張可拼成功法）`);
  if(S.items.gfp>=TUNE.v51.gfPages&&v51GfGate()){S.items.gfp-=TUNE.v51.gfPages;S.items.gongfa++;toast('📜 殘頁拼成一卷完整功法！（功法 +1）');}}}catch(er){}return r;};}
// 奇遇「神秘棋局」：30 %＋悟性×0.4 % → 10 %＋悟性×0.1 %，且受間隔限制
try{const ev=EVENTS.find(x=>x.k==='chess');if(ev){ev.o[0].f=()=>{const p=evP();const T=TUNE.v51;if(rnd()<T.gfEvBase+(p?p.wu:0)*T.gfEvWu){const r=v51GfGive('event',false);
  return r==='gf'?'棋局一破，石桌下浮出一卷功法！（功法 +1）':`棋局一破，石桌下只剩半卷殘篇。（功法殘頁 +1、靈石 +${T.gfDupLs}）`;}gainXiu(p,needXiu(p)*0.05/TUNE.xiuMul);return '你苦思良久，終究無解，倒也略有所得。（修為少許）';};}}catch(e){console.warn(e);}
// 拍賣會：「上古功法」出現機率 ×0.35（買到一定給）
try{const L=AUC_LOTS.find(x=>x.k==='gf');if(L){const ok0=L.ok;L.ok=()=>(!ok0||ok0())&&rnd()<TUNE.v51.gfAuction;}}catch(e){console.warn(e);}
SYS_TXT.push(['敵人境界','敵人名牌顯示境界，灰＝比你弱、白＝同境、橘＝強一境、紅＝強兩境以上',()=>'<span class="tg" style="color:#a8a8a8">較弱</span><span class="tg" style="color:#fff">同境</span><span class="tg" style="color:#ffa040">強一境</span><span class="tg" style="color:#ff4a4a">強兩境以上</span><details class="dt"><summary>詳情</summary>境界依敵人的氣血與攻擊換算（副本層級加成也算在內），首領會除以隊伍係數。點選敵人可在資訊卡看到境界。</details>']);
SYS_TXT.push(['功法稀有度','功法很稀有；重複或太密集時會變成功法殘頁＋靈石',()=>`<span class="tg">遺跡副本 ${Math.round(TUNE.v51.gfRuinDg*100)} %</span><span class="tg">仙凡之門 首通必得，之後 ${Math.round(TUNE.v51.gfXfRepeat*100)} %</span><span class="tg">每 ${Math.round(TUNE.v51.gfGap/60)} 分鐘最多 1 卷（任務獎勵除外）</span><span class="tg">${TUNE.v51.gfPages} 張殘頁＝1 卷功法</span><details class="dt"><summary>詳情</summary>目前殘頁 ${S.items.gfp||0} 張。遺跡石台的傳承功法一定會給。</details>`]);

// ======================= #126 煉氣以上（煉氣、築基、金丹…地仙）改為十層：一層～九層、第十層＝大圓滿（資料驅動） =======================
// 凡人武道境界（武徒～宗師）維持 初期／中期／後期／圓滿。
TUNE.v52={from:4,layers:10,timeMul:1.1,layerBonus:+(Math.pow(1+TUNE.subBonus,3/9)-1).toFixed(4),qiLayer:0.05,xqLayer:0.03,showTo:10};
const V52_CN=['一','二','三','四','五','六','七','八','九'];
// 每個大境界的小境界數與名稱（新境界只要在這裡加規則即可）
function v52N(r){return r>=TUNE.v52.from?TUNE.v52.layers:SUB_N;}
function v52Top(r){return v52N(r)-1;}
function v52Lay(r){return r>=TUNE.v52.from;}
function v52SubName(r,s){s=s||0;if(!v52Lay(r))return SUB[Math.min(s,SUB_N-1)]||'';return s>=TUNE.v52.layers-1?'大圓滿':V52_CN[s]+'層';}
function v52AtTop(u){return (u.sub||0)>=v52Top(u.realm);}
realmName=function(u){const R=REALMS[u.realm];if(!R)return '';const full=R.full&&u.realm>=REALMS.length-1;return (full?R.full:R.n)+(full?'':(u.realm<=MAX_REALM||v52Lay(u.realm)&&u.realm<=TUNE.v52.showTo)?v52SubName(u.realm,u.sub):'');};
// 修為需求：十層的總量＝舊四階總量 × timeMul，層與層之間平滑成長、與下一大境界接續
const _v52oldNeed=(r,s)=>Math.round(TUNE.xiuBase*Math.pow(TUNE.xiuGrow,r*SUB_N+(s||0))*(TUNE.xiuXian[r]||3));
needAt=function(r,s){const nm=TUNE.needMul||1;if(!v52Lay(r))return Math.round(_v52oldNeed(r,s)*nm);const L=TUNE.v52.layers,g=TUNE.xiuGrow,h=Math.pow(g,SUB_N/L);
  const B=TUNE.xiuBase*Math.pow(g,r*SUB_N)*(TUNE.xiuXian[r]||3);let os=0;for(let k=0;k<SUB_N;k++)os+=Math.pow(g,k);let ns=0;for(let l=0;l<L;l++)ns+=Math.pow(h,l);
  return Math.round(B*os*TUNE.v52.timeMul/ns*Math.pow(h,Math.min(s||0,L-1))*nm);};
cumXiu=function(r,s){let t=0;for(let rr=0;rr<r;rr++)for(let k=0;k<v52N(rr);k++)t+=needAt(rr,k);for(let k=0;k<(s||0);k++)t+=needAt(r,k);return t;};
capped=function(u){return u.realm>=MAX_REALM&&v52AtTop(u)&&u.xiu>=needXiu(u);};
v47Major=function(u){return !!(u&&v52AtTop(u)&&u.realm<MAX_REALM);};
// 小突破（升一層）：小提示，不做大儀式
advanceSub=function(u){stripGear(u);const lay=v52Lay(u.realm);u.sub=(u.sub||0)+1;u.xiu=0;const m=1+(lay?TUNE.v52.layerBonus:TUNE.subBonus);u.maxhp=Math.round(u.maxhp*m);u.atk=+(u.atk*m).toFixed(1);gearApply(u);u.hp=Math.min(u.maxhp,u.hp+u.maxhp*(lay?0.1:0.2));
  floater(u.x,u.y,v52SubName(u.realm,u.sub)+'！','#bfe8ff');if(!lay)fx('ring',u.x,u.y,'#bfe8ff');V52.adv=(V52.adv||0)+1;
  if(u.kind==='player'||selUnits.includes(u.id))toast(`${nm(u)}${lay?'小突破':'修為精進'}：${realmName(u)}`);};
const V52={adv:0};
// 修為累積（取代 g18 版本，保留 g20 大殿閉關加成）
gainXiu=function(u,amt){
  if(u&&amt>0){u._cx=S.time;if(V49.hallP&&u.kind==='player')amt*=V49.hallP;if(u.kind==='player')V49.pgx=(V49.pgx||0)+amt;}
  if(!u||capped(u))return;amt*=TUNE.xiuMul;const I=injOf(u);if(I)amt*=I.cult;
  let need=needXiu(u);const was=u.xiu>=need;const top=()=>v52Top(u.realm);
  if((u.sub||0)<top()){u.xiu+=amt;let n=0;while((u.sub||0)<top()&&u.xiu>=need&&n<3){const ov=u.xiu-need;advanceSub(u);need=needXiu(u);u.xiu=Math.min(ov,need*0.5);n++;}
    if(!((u.sub||0)>=top()&&u.xiu>=need))return;}
  else{const cap=u.realm>=MAX_REALM?need:need*TUNE.ovMax;u.xiu=Math.min(cap,u.xiu+amt);}
  if(u.xiu<need||was||u.realm>=MAX_REALM)return;
  const c=breakConds(u);if(u.kind==='disciple'&&!u.v170Hold&&!S.flags.v170off&&!S.dg){/* #170 由 v170Tick 自主決定 */}else if(c.auto&&c.ok&&u.kind!=='disciple'){tryBreak(u,true);}else{v47Ready(u,c);}};
{const _bc=breakConds;breakConds=function(u){const c=_bc(u);try{if(!c||!c.list||!u||u.realm>=MAX_REALM)return c;const sub=u.sub||0,need=needXiu(u);const it=c.list.find(x=>/^修為圓滿/.test(x.t));
  if(it){it.t=`修為圓滿（${v52SubName(u.realm,sub)} ${Math.floor(u.xiu)}/${need}${v52Lay(u.realm)?`，需到「大圓滿」`:''}）`;it.ok=sub>=v52Top(u.realm)&&u.xiu>=need;c.ok=c.list.every(x=>x.ok);}}catch(e){}return c;};}
{const _tb=tryBreak;tryBreak=function(u,auto){if(u&&!u.dead&&v52Lay(u.realm)&&(u.sub||0)<v52Top(u.realm)){if(u.xiu>=needXiu(u)){advanceSub(u);return true;}if(!auto)toast(`${nm(u)}修為未滿（${realmName(u)}）`);return false;}return _tb(u,auto);};}
v47Fail=function(u,r,x0){const R=V47R[r]||V47R[V47R.length-1];u.xiu=Math.floor(x0*(1-R.loss));const msg=[`修為 -${Math.round(R.loss*100)}%`];
  if(R.inj){const I=INJ[R.inj];u.inj={k:R.inj,t:S.time+I.T};msg.push(`${I.n} ${Math.round(I.T/60)} 分鐘`);}
  if(R.drop&&(u.sub||0)>0){stripGear(u);const lay=v52Lay(u.realm),m=1+(lay?TUNE.v52.layerBonus:TUNE.subBonus),k=lay?Math.min(u.sub,3):1;for(let i=0;i<k;i++){u.maxhp=Math.round(u.maxhp/m);u.atk=+(u.atk/m).toFixed(1);}u.sub-=k;gearApply(u);u.hp=Math.min(u.hp,u.maxhp);u.xiu=Math.min(u.xiu,Math.floor(needXiu(u)*0.5));msg.push(`跌落「${v52SubName(u.realm,u.sub)}」`);}
  u._v47rd=null;floater(u.x,u.y,msg.join('、'),'#ff9a8a');snd('miss');
  if(u.kind==='player'||selUnits.includes(u.id)||r>=3)setTimeout(()=>toast(`損失：${msg.join('、')}`),400);};
v47NearDeath=function(u){if(!u||u.dead||(u.kind!=='player'&&u.kind!=='disciple')||u.hp<=0||u.hp>u.maxhp*0.05)return;
  if(S.time-(u._ndT||-999)<TUNE.ndCd)return;const need=needXiu(u);if(u.xiu<need*0.9||capped(u)||u.brkLock)return;u._ndT=S.time;
  const r=Math.min(u.realm,V47R.length-1),sub=u.sub||0,top=v52Top(u.realm);let ch=V47R[r].nd;if(sub<top)ch*=1.5;if(isXW(u))ch*=1.3;ch+=(u.luck||0)*0.0006;
  if(rnd()>=ch){floater(u.x,u.y,'瀕死…','#ff8080');return;}
  fx('break',u.x,u.y,'#fff0a0');floater(u.x,u.y,'絕境頓悟！','#fff0a0');
  if(sub<top){u.xiu=0;advanceSub(u);u.hp=Math.max(u.hp,u.maxhp*0.5);toast(`絕境頓悟！${nm(u)}在生死之間突破至「${realmName(u)}」`);snd('break');return;}
  if(u.realm>=MAX_REALM)return;u.xiu=Math.max(u.xiu,need);const c=breakConds(u);
  if(c.ok){u._nd=1;let ok=false;try{ok=tryBreak(u,true);}finally{u._nd=0;}if(ok){toast(`生死一線，${nm(u)}破而後立，強行突破「${REALMS[u.realm].n}」！`);return;}}
  u.hp=Math.max(u.hp,u.maxhp*0.35);toast(`絕境頓悟！${nm(u)}修為圓滿、氣血回湧${c.ok?'':'（突破條件未齊，無法當場突破）'}`);};
{const _bi=brkInfo;brkInfo=function(u){const I=_bi(u);try{if(I&&!I.max)I.ready=(u.sub||0)>=v52Top(u.realm)&&u.xiu>=I.need;}catch(e){}return I;};}
{const _bh=brkHtml;brkHtml=function(u,full){let h=_bh(u,full);try{if(u&&v52Lay(u.realm)){const s=u.sub||0;h=h.replace(`<span class="tg">${SUB[s]}</span>`,`<span class="tg">${v52SubName(u.realm,s)}</span>`);}}catch(e){}return h;};}
subLadder=function(p){if(!p)return '';const n=v52N(p.realm),cur=p.sub||0;let a=[];for(let k=0;k<n;k++)a.push(`<span class="${k<cur?'done':k===cur?'cur':''}">${v52Lay(p.realm)?v52SubName(p.realm,k):REALMS[p.realm].n+SUB[k]}</span>`);
  return '<div class="ladder sub'+(v52Lay(p.realm)?' v52lay':'')+'">'+(v52Lay(p.realm)?`<b style="margin-right:4px">${REALMS[p.realm].n}</b>`:'')+a.join('')+'</div>';};
{const _rc=renderCult;renderCult=function(){_rc();try{const p=player();if(!p||!v52Lay(p.realm))return;const el=document.getElementById('cult');if(!el)return;
  const s=p.sub||0,top=v52Top(p.realm);const bad=[...el.querySelectorAll('div')].find(d=>/修為滿了會自動進入下一個小境界|的條件：$/.test(d.textContent)&&d.children.length===0);
  if(bad){const t=s<top?`修為滿了會自動進入下一層（${v52SubName(p.realm,s+1)}，小突破）；修到「大圓滿」後才能突破大境界「${REALMS[p.realm+1]?REALMS[p.realm+1].n:''}」：`:`突破「${REALMS[p.realm+1]?REALMS[p.realm+1].n:''}」的條件：`;if(bad.textContent!==t)bad.textContent=t;}}catch(e){}};}
// 靈氣上限：煉氣一層 1000，每層 +5 %，每大境界 ×1.5
qiMaxFor=function(u){if(!u||u.realm<4)return 0;const r=Math.min(u.realm,10);return Math.round(TUNE.v49.qiBase*Math.pow(TUNE.v49.qiGrow,r-4)*(1+TUNE.v52.qiLayer*(u.sub||0)));};
// 地仙：靈氣化仙氣，大圓滿（第十層）達 30 %
xqTarget=function(u){return u&&u.realm>=10?Math.min(TUNE.v49.xqMax,TUNE.v52.xqLayer*((u.sub||0)+1)):0;};
// 舊存檔：煉氣以上 初期→一層、中期→四層、後期→七層、圓滿→大圓滿（屬性等價、修為按比例）
const V52_MAP=[0,3,6,9];
function v52Mig(u){if(!u||u.lay)return false;u.lay=1;if(!v52Lay(u.realm||0))return false;const s=Math.min(3,u.sub||0);const oldNeed=_v52oldNeed(Math.min(u.realm,MAX_REALM),s);
  u.sub=V52_MAP[s];const nn=needXiu(u);u.xiu=Math.round((u.xiu||0)/Math.max(1,oldNeed)*nn);return true;}
function v52MigAll(){let n=0;const L=[S.units,S.wand,S.cands,S.dg&&S.dg.W&&S.dg.W.units].filter(Array.isArray);for(const a of L)for(const u of a)if(u&&(u.kind==='player'||u.kind==='disciple'||u.realm!=null)&&!u.lay&&u.hp!=null&&u.atk!=null&&v52Mig(u))n++;V52.mig=(V52.mig||0)+n;return n;}
UNIT_KEEP.push('lay');
{const _as=applySave;applySave=function(d){const r=_as.apply(this,arguments);try{if(r&&S){const n=v52MigAll();if(n){for(const u of S.units)if(u.qiMax!=null){u.qiMax=undefined;if(v49Sect(u))v49SyncPools(u);}toast(`舊存檔轉換：煉氣以上改為十層（${n} 人）`);}}}catch(e){console.warn(e);}return r;};}
// 新角色：凡人境界直接標記；之後突破到煉氣從一層開始
{const _t=v49Tick;v49Tick=function(dt){_t(dt);try{for(const u of S.units)if(!u.lay&&(u.kind==='player'||u.kind==='disciple')&&!v52Lay(u.realm))u.lay=1;}catch(e){}};}
{const _db=doBreak;doBreak=function(u){_db(u);if(u)u.lay=1;};}
SYS_TXT.push(['十層境界','煉氣起每個大境界分十層：一層～九層、第十層大圓滿',()=>`<span class="tg">一層～九層</span><span class="tg">第十層＝大圓滿</span><span class="tg">升層＝小突破（每層屬性 +${(TUNE.v52.layerBonus*100).toFixed(1)} %）</span><span class="tg">大圓滿→下一大境界＝大突破</span><details class="dt"><summary>詳情</summary>武徒～宗師仍是初期／中期／後期／圓滿。靈氣上限：煉氣一層 ${TUNE.v49.qiBase}，每層 +${Math.round(TUNE.v52.qiLayer*100)} %，每大境界 ×${TUNE.v49.qiGrow}。地仙每層仙氣 +${Math.round(TUNE.v52.xqLayer*100)} %，大圓滿 30 %。舊存檔：初期→一層、中期→四層、後期→七層、圓滿→大圓滿。</details>`]);

// ======================= #127 倉庫與資源容量上限 =======================
TUNE.v53={base:{wood:4000,stone:4000,fiber:4000,food:4000,iron:2000,herb:1000,lingshi:3000},per:5000,perLv:0.5,warn:0.9,dep:0.05,round:500};
BUILD.cangku={name:'倉庫',size:2,cost:{wood:60,stone:40,fiber:10},time:12,pop:0,hp:500,desc:''};
BDESC.cangku={s:'存放宗門各類物資，容量上限 +5000',t:b=>[`全部資源上限 +${v53Per(b)}`,'弟子可就近卸貨'],d:'每座倉庫讓所有資源的容量上限 +5000（Lv2 +7500、Lv3 +10000）。採集的弟子會把資源搬到最近的倉庫或宗門大殿，路程更短。資源滿了就無法再存入。'};
BUILD.cangku.desc=BDESC.cangku.s+'。'+BDESC.cangku.d;
BUILD_ORDER.push('cangku');
B49.cangku={n:'井然有序',f:lv=>`弟子卸貨入庫 +${Math.round(TUNE.v53.dep*100*lv)} %`};
V50L.cangku=b=>{const lv=blv(b);return [['容量加成',`全部資源上限 +${v53Per(b)}（Lv ${lv}）`],['卸貨點','採集弟子會就近把資源搬到這裡'],['目前上限',RES_KEYS.map(k=>`${RES_NAMES[k]} ${v53Cap(k)}`).join('、')]];};
const V53={full:{},prev:null,toastN:0,cut:0,dep:{}};
function v53Per(b){return Math.round(TUNE.v53.per*(1+TUNE.v53.perLv*(blv(b)-1)));}
function v53Cap(k){const T=TUNE.v53,mn=S.flags&&S.flags.v53min||{};let c=Math.max(T.base[k]||T.base.wood,mn[k]||0);for(const b of S.buildings)if(b.type==='cangku'&&b.built&&!b.broken)c+=v53Per(b);return c;}
function v53Full(k){return S.res[k]>=v53Cap(k);}
function v53Depot(u){let best=null,bd=1e9;for(const b of S.buildings){if((b.type!=='hall'&&b.type!=='cangku')||!b.built||b.broken)continue;const d=distRect(u.x,u.y,b.i,b.j,BUILD[b.type].size);if(d<bd){bd=d;best=b;}}return best;}
function v53Mig(){if(!S||!S.flags)return;if(S.flags.v53)return;S.flags.v53=1;const mn={},T=TUNE.v53;for(const k of RES_KEYS){const v=Math.floor(S.res[k]||0);if(v>(T.base[k]||0))mn[k]=Math.ceil(v/T.round)*T.round;}S.flags.v53min=mn;}
function v53Clamp(){const P=V53.prev;const now={};for(const k of RES_KEYS){const cap=v53Cap(k);let v=S.res[k];if(P&&v>cap&&v>P[k]){const nv=Math.max(cap,P[k]);V53.cut+=v-nv;S.res[k]=v=nv;}now[k]=v;
  const f=v>=cap;if(f&&!V53.full[k]){V53.full[k]=1;V53.toastN++;toast(`${RES_NAMES[k]}已滿（${Math.floor(v)}/${cap}），建造或升級「倉庫」提高上限`);}else if(!f&&v<cap*0.97)V53.full[k]=0;}V53.prev=now;}
{const _t=v49Tick;v49Tick=function(dt){_t(dt);try{if(!v49Client()){v53Mig();v53Clamp();}}catch(e){console.warn(e);}};}
{const _as=applySave;applySave=function(d){const r=_as.apply(this,arguments);try{if(r&&S){V53.prev=null;V53.full={};v53Mig();for(const k of RES_KEYS)if(S.res[k]>=v53Cap(k))V53.full[k]=1;}}catch(e){}return r;};}
// 採集：就近卸貨（倉庫或大殿），滿了就停
{const _dj=doJob;doJob=function(u,dt){if(u&&u.job==='gather'&&!v49Client()){const res=u.jobRes||'wood';
  const _esr=typeof econGatherShouldReturn==='function'?econGatherShouldReturn(u):null;
  if(u.carry&&u.carry.amt>0&&((_esr&&_esr.yes)||(!_esr&&(u.carry.amt>=CARRY_CAP||u.carry.type!==res||u.jst==='ret')))){const h=v53Depot(u);if(!h)return _dj(u,dt);
    u.jst='ret';const r=approachRect(u,dt,h.i,h.j,BUILD[h.type].size,0.9);if(r===null){u.dvx=u.dvy=0;return;}if(!r)return;
    if(typeof econGatherDeposit==='function'&&typeof econFlag==='function'&&(econFlag('store')||econFlag('mine')||econFlag('treasury'))){
      const d=econGatherDeposit(u,h);const types=(d&&d.types)||{};
      for(const k in types)if(types[k])floater(u.x,u.y,'+'+types[k]+' '+RES_NAMES[k],RES_COL[k]);
      V53.dep[h.type]=(V53.dep[h.type]||0)+1;S.stats.discDeposit++;gainXiu(u,1);u.path=[];return;}
    const k=u.carry.type,cap=v53Cap(k),lv=v49Lv('cangku'),want=Math.round(u.carry.amt*(1+(lv?TUNE.v53.dep*lv:0))),room=Math.max(0,Math.floor(cap-S.res[k])),add=Math.min(want,room);
    S.res[k]+=add;V53.dep[h.type]=(V53.dep[h.type]||0)+1;
    floater(u.x,u.y,add>0?'+'+add+' '+RES_NAMES[k]+(add<want?'（已滿）':''):RES_NAMES[k]+'已滿',add>0?RES_COL[k]:'#ff6a5a');if(add<want)V53.cut+=want-add;
    S.stats.discDeposit++;gainXiu(u,1);u.carry=null;u.jst=null;u.path=[];return;}
  if(v53Full(res)&&!(u.carry&&u.carry.amt>0)){u.dvx=u.dvy=0;if(!u._v53w||S.time-u._v53w>15){u._v53w=S.time;floater(u.x,u.y,RES_NAMES[res]+'已滿，停工','#ffb060');}return;}}
  return _dj(u,dt);};}
// 外觀：木造庫房＋箱子
{const _ds=drawBuildingShape;drawBuildingShape=function(type,i,j,t,alpha,b){if(type!=='cangku')return _ds(type,i,j,t,alpha,b);_ds(type,i,j,t,alpha,b);};}
{const _le=lvEffect;lvEffect=function(b,lv){let s=_le(b,lv);if(b&&b.type==='cangku')s=`全部資源上限 +${Math.round(TUNE.v53.per*(1+TUNE.v53.perLv*(lv-1)))}`+(s?'、'+s:'');return s;};}
// 頂欄：上限／目前、90 % 橘、100 % 紅；主角欄顯示層數
function v53Col(k){const c=v53Cap(k),v=S.res[k];return v>=c?'full':v>=c*TUNE.v53.warn?'warn':'';}
{const _u=updateUI;updateUI=function(){_u();try{for(const k of RES_KEYS){const e=document.getElementById('r_'+k);if(!e)continue;const sp=e.parentNode,c=v53Col(k),cap=v53Cap(k);
    const t=`${RES_NAMES[k]} ${Math.floor(S.res[k])} / ${cap}${c==='full'?'（已滿）':c==='warn'?'（將滿）':''}`;if(sp.title!==t)sp.title=t;sp.classList.toggle('v53w',c==='warn');sp.classList.toggle('v53f',c==='full');
    const mb=isTouchUI&&sp.querySelector('.v49n');if(mb){const mt=v49Fmt(S.res[k])+'/'+v49Fmt(cap);if(mb.textContent!==mt)mb.textContent=mt;}}
  const p=player();if(p){const rr=document.getElementById('r_realm');const t=`${pnm(p)}：${realmName(p)}`+(p.realm<MAX_REALM||!capped(p)?`（修為 ${Math.floor(p.xiu)}/${needXiu(p)}）`:'');if(rr&&rr.textContent!==t)rr.textContent=t;
    const T=V49.tb;if(T&&T.realm&&isTouchUI){const tt=realmName(p)+(capped(p)?'':` ${v49Fmt(p.xiu)}/${v49Fmt(needXiu(p))}`);if(T.realm.textContent!==tt)T.realm.textContent=tt;}}}catch(e){}};}
function v53Css(){if(document.getElementById('v53css'))return;const st=document.createElement('style');st.id='v53css';st.textContent='#topbar .res.v53w b{color:#ffa040!important}#topbar .res.v53f b{color:#ff4a4a!important}';document.head.appendChild(st);}
// 建造列：倉庫用 ⇧0
function v53Bar(){const b=document.querySelector('#buildbar [data-b="cangku"] b');if(b&&/⇧10/.test(b.textContent))b.textContent=b.textContent.replace('⇧10','⇧0');}
addEventListener('keydown',ev=>{try{if(ev.shiftKey&&(ev.code==='Digit0'||ev.code==='Numpad0')&&S&&!S.interior&&typeof enterBuild==='function'&&!/INPUT|TEXTAREA/.test((ev.target&&ev.target.tagName)||'')){ghostAt={x:mouse.x,y:mouse.y};enterBuild('cangku');}}catch(e){}});
SYS_TXT.push(['倉庫與容量','每種資源都有上限，倉庫提高上限並作為就近卸貨點',()=>`<span class="tg">基本上限 木石纖食 ${TUNE.v53.base.wood}</span><span class="tg">每座倉庫 +${TUNE.v53.per}</span><span class="tg">90 % 橘、滿了變紅</span><span class="tg">滿了停止入庫</span><details class="dt"><summary>詳情</summary>基本上限：鐵礦 ${TUNE.v53.base.iron}、藥草 ${TUNE.v53.base.herb}、靈石 ${TUNE.v53.base.lingshi}，其餘 ${TUNE.v53.base.wood}。倉庫 Lv2 +${TUNE.v53.per*(1+TUNE.v53.perLv)}、Lv3 +${TUNE.v53.per*(1+2*TUNE.v53.perLv)}。舊存檔的上限至少等於讀檔時的存量，不會刪除任何庫存；倉庫被毀時超出上限的庫存保留，但不能再增加。專屬加成「井然有序」：每級卸貨入庫 +${Math.round(TUNE.v53.dep*100)} %。</details>`]);

// ======================= #128 仙緣：提高大境界突破（與日後渡劫）成功率 =======================
TUNE.v54={xyPer:0.0015,xyCap:0.15,from:3,dujie:true};
// 掛鉤：kind='major'（大境界突破）或 'dujie'（渡劫，系統尚未實作，之後直接呼叫 v54XyBonus(u,'dujie')）
function v54XyBonus(u,kind){if(!u)return 0;const T=TUNE.v54;if(kind==='dujie'&&!T.dujie)return 0;if(kind!=='dujie'&&(u.realm<T.from||u.realm>=MAX_REALM))return 0;return Math.min(T.xyCap,Math.max(0,(u.xy||0)*T.xyPer));}
{const _bf=breakFail;breakFail=function(u){let f=_bf(u);if(!u||u._nd||f<=0)return f;const b=v54XyBonus(u,'major');if(b>0)f=Math.max(u.realm<=1?0.02:0.03,f-b);return f;};}
{const _bh=brkHtml;brkHtml=function(u,full){let h=_bh(u,full);try{const b=v54XyBonus(u,'major');if(u&&u.realm>=TUNE.v54.from&&u.realm<MAX_REALM&&h.indexOf('<details class="dt"')>0){
  const ln=`<div class="v54xy" style="color:#c8b8ff" title="每點仙緣 +${(TUNE.v54.xyPer*100).toFixed(2)} % 成功率，上限 +${Math.round(TUNE.v54.xyCap*100)} %；只影響大境界突破與渡劫">仙緣加成 +${(b*100).toFixed(1).replace(/\.0$/,'')} %<span class="dim">（仙緣 ${Math.floor(u.xy||0)}）</span></div>`;
  h=h.replace('<details class="dt"',ln+'<details class="dt"');}}catch(e){}return h;};}
SYS_TXT.push(['仙緣加成','仙緣越高，大境界突破與渡劫越容易成功',()=>`<span class="tg">每點仙緣 +${(TUNE.v54.xyPer*100).toFixed(2)} % 成功率</span><span class="tg">上限 +${Math.round(TUNE.v54.xyCap*100)} %</span><span class="tg">只限大境界（宗師→煉氣起）與渡劫</span><span class="tg">踏仙梯需仙緣 ≥1000</span><details class="dt"><summary>詳情</summary>仙緣用途：①沒有靈根的人衝擊煉氣時需要仙緣達標；②達標之後，仙緣越高，每次大境界突破（宗師→煉氣、煉氣大圓滿→築基…）成功率越高；③踏仙梯（飛升）需仙緣達 1000（不必 10000）。升層（小突破）不受影響。採集不列入踏仙梯檢定。</details>`]);

// ======================= #129 單人資訊面板：分頁（總覽／屬性／裝備／關係／歷練） =======================
const V55={tabs:[['ov','總覽'],['at','屬性'],['eq','裝備'],['rel','關係'],['hist','歷練']],n:0};
function v55Tab(){try{const t=localStorage.getItem('xw_ptab');if(V55.tabs.some(x=>x[0]===t))return t;}catch(e){}return 'ov';}
function v55SetTab(t){try{localStorage.setItem('xw_ptab',t);}catch(e){}const pn=document.getElementById('panel');if(pn)v55Show(pn,t);}
function v55Show(pn,t){pn.querySelectorAll('.v55tb [data-v55tab]').forEach(b=>b.classList.toggle('on',b.dataset.v55tab===t));pn.querySelectorAll('.v55pane').forEach(p=>p.classList.toggle('on',p.dataset.p===t));}
const V55_TIP={'氣血':'目前／上限氣血；歸零會倒地','攻擊':'普通攻擊傷害（受體質、境界、裝備影響）；踏仙梯需達 10000','速度':'移動速度（格／秒）','採集':'每秒採集量倍率（踏仙梯不檢定採集）','修為':'目前修為／突破所需','悟性':'越高修煉越快、突破越穩、領悟機率越高；踏仙梯需達 10000','仙緣':'①無靈根者衝擊煉氣的門檻；②越高大境界突破與渡劫成功率越高；③踏仙梯需達 1000','氣運':'略微降低突破失敗率、提高奇遇；踏仙梯需達 10000'};
function v55Skel(pn){const W=document.createElement('div');W.className='v55w';
  W.innerHTML=`<div class="v55tb">${V55.tabs.map(([k,n])=>`<button class="v55t" data-v55tab="${k}">${n}</button>`).join('')}</div>`+V55.tabs.map(([k])=>`<div class="v55pane" data-p="${k}"><div class="v55m"></div><div class="v55x"></div></div>`).join('');
  const ub=pn.querySelector('#v47ub');const anc=ub||pn.querySelector('.pbar')||pn.querySelector('.bar');if(anc)anc.after(W);else pn.append(W);
  const ov=W.querySelector('[data-p="ov"] .v55m');ov.innerHTML='<div class="v55job"><span class="v55jl">職務：<b class="v55jc">—</b></span> <button class="btn v55jb" data-v55jp="1">指派 ▾</button><div class="v55jpop"></div></div><div class="v55act jobs"></div>';
  const h4=pn.querySelector('h4');if(h4&&!h4.querySelector('.v55i')){const i=document.createElement('span');i.className='v55i';i.dataset.v55i='1';i.textContent='ⓘ';h4.appendChild(i);}
  const hp=document.createElement('div');hp.className='v55help';hp.style.display='none';W.after(hp);v55Show(pn,v55Tab());return W;}
function v55Pane(W,k,x){return W.querySelector(`[data-p="${k}"] ${x?'.v55x':'.v55m'}`);}
function v55Cls(el){if(el.matches('.jobs')){
    // #138：好感／道侶列含有 data-job="dual"（雙修），不可誤判成職務選單
    if(el.querySelector('[data-job]:not([data-job="dual"])'))return 'job';if(el.querySelector('[data-res]'))return 'res';
    if(el.querySelector('[data-act="gift"],[data-act="dual"],[data-job="dual"],[data-act="kick"],[data-tip="bond"],[data-act="bond"]')||/好感|道侶|雙修|逐出師門/.test(el.textContent))return 'rel';return 'act';}
  if(el.matches('.phint'))return 'help';if(el.matches('.grid'))return 'at';const t=el.textContent.trim();
  if(/^裝備/.test(t)||el.matches('.v47w'))return 'eq';if(/^狀態/.test(t))return 'ov';if(/^技能/.test(t))return 'hist';return 'at';}
function v55Help(pn,txts){const hp=pn.querySelector('.v55help');if(!hp)return;const t=txts.filter(Boolean);const s=t.join('\n');if(hp._s===s)return;hp._s=s;hp.innerHTML=t.map(x=>`<div>${x.replace(/</g,'&lt;')}</div>`).join('');const i=pn.querySelector('.v55i');if(i)i.title=s;}
TUNE.feat=Object.assign({tabs:true},TUNE.feat||{});
function v55Apply(){if(!TUNE.feat.tabs)return;const pn=document.getElementById('panel');if(!pn||pn.style.display==='none')return;const key=panelKeyCache;if(!key||key[0]!=='u'||selUnits.length!==1)return;
  const u=unitById(selUnits[0]);if(!u||(u.kind!=='player'&&u.kind!=='disciple'))return;pn.classList.add('v55');
  let W=pn.querySelector('.v55w');if(!W){W=v55Skel(pn);V55.n++;const L=V55.ui;if(L&&L.uid===u.id){if(L.exp){pn.classList.add('expanded');setTimeout(()=>pn.classList.add('expanded'),0);requestAnimationFrame(()=>pn.classList.add('expanded'));}if(L.pop){const pp=W.querySelector('.v55jpop');if(pp)pp.classList.add('open');}}}
  const help=pn._v55help||(pn._v55help={});
  const place=(el,c)=>{if(c==='help'){help.ph=el.textContent.trim();el.remove();return;}
    if(c==='job'){const pop=W.querySelector('.v55jpop');pop.innerHTML='';pop.appendChild(el);const rip=el.querySelector('[data-act="rip"]');if(rip)W.querySelector('.v55act').prepend(rip);return;}
    if(c==='res'){W.querySelector('.v55job').after(el);return;}
    if(c==='act'){const a=W.querySelector('.v55act');[...el.children].forEach(b=>a.appendChild(b));el.remove();return;}
    if(c==='rel'){v55Pane(W,'rel').appendChild(el);el.querySelectorAll('[data-act="kick"]').forEach(b=>{b.classList.add('v55k');});return;}
    if(c==='ov'){v55Pane(W,'ov').appendChild(el);return;}
    v55Pane(W,c).appendChild(el);if(c==='at'&&el.matches('.grid'))el.querySelectorAll(':scope>span').forEach(s=>{const k=(s.firstChild&&s.firstChild.textContent||'').trim();if(V55_TIP[k]&&!s.title)s.title=V55_TIP[k];});};
  const skip=e=>e===W||e.matches('h4,.mini,.bar,.pbar,.v55help,#v47ub,.pmore,[id^="v49_"],[id^="v51_"],.v49qb,style,script');
  for(const c of [...pn.children]){if(skip(c))continue;if(c.matches('.jobs')||c.matches('.pdesc')){if(c.matches('.pdesc')){if(!c._v55){c._v55=1;v55Pane(W,'at').prepend(c);}continue;}place(c,v55Cls(c));}}
  const pm=pn.querySelector('.pmore');if(pm){pm.classList.add('v55pm');for(const c of [...pm.children]){if(c.id==='v47um')continue;place(c,v55Cls(c));}
    const m=pm.querySelector('#v47um');if(m&&m._v55!==m.innerHTML){m._v55=m.innerHTML;const xs={at:v55Pane(W,'at',1),eq:v55Pane(W,'eq',1),hist:v55Pane(W,'hist',1)};for(const k in xs)xs[k].innerHTML='';help.sf='';
      for(const n of [...m.childNodes]){if(n.nodeType!==1){if((n.textContent||'').trim()){const d=document.createElement('div');d.textContent=n.textContent;xs.at.appendChild(d);}continue;}
        const c=n.cloneNode(true),t=c.textContent.trim();
        if(c.matches('.v47w')||/^⚔/.test(t)){const sm=c.querySelector('small');if(sm){help.sf=sm.textContent.trim();sm.remove();c.querySelectorAll('br').forEach(b=>b.remove());}xs.eq.appendChild(c);}
        else if(/^職業/.test(t)){const d=c.querySelector('details');if(d){const h=document.createElement('div');h.className='v55h';h.innerHTML='<b>職業歷練</b>：'+d.innerHTML.replace(/<summary>[^<]*<\/summary>/,'');xs.hist.appendChild(h);d.remove();}xs.at.appendChild(c);}
        else if(/^連招/.test(t))xs.hist.appendChild(c);else xs.at.appendChild(c);}}}
  // 職務選單：目前職務
  const jc=W.querySelector('.v55jc'),job=W.querySelector('.v55job');if(u.kind!=='disciple'){if(job)job.style.display='none';}
  else if(jc){const on=W.querySelector('.v55jpop [data-job].on');const t=on?on.textContent.trim():(u.job&&JOB_NAME[u.job])||'待命';const tt=t+(u.job==='gather'&&u.jobRes?'・'+(u.smart?'自動':RES_NAMES[u.jobRes]):'');if(jc.textContent!==tt)jc.textContent=tt;}
  const hist=v55Pane(W,'hist');if(hist&&!hist.querySelector('.v55sum')){const d=document.createElement('div');d.className='v55sum';hist.prepend(d);}
  const sm=hist&&hist.querySelector('.v55sum');if(sm){const t=`累計修為 ${Math.floor(cumXiu(u.realm,u.sub||0)+u.xiu)}｜${realmName(u)}${u.kind==='disciple'&&u.joinT!=null?`｜入門 ${Math.floor((S.time-u.joinT)/60)} 分鐘`:''}`;if(sm.textContent!==t)sm.textContent=t;}
  const rel=v55Pane(W,'rel');if(rel&&u.kind==='player'&&!rel.children.length)rel.innerHTML='<div class="dim">你的人際：選取弟子後在其「關係」分頁贈禮、結為道侶、雙修。</div>';
  const eq=v55Pane(W,'eq');if(eq&&!eq.querySelector('.v55bag')&&u.kind!=='player'){}
  v55Help(pn,[help.ph,help.sf]);}
{const _rp=renderPanel;renderPanel=function(){_rp();try{v55Apply();}catch(e){console.warn(e);}};}
function v55Init(){if(!TUNE.feat.tabs)return;const pn=document.getElementById('panel');if(!pn||pn._v55i)return;pn._v55i=1;
  pn.addEventListener('click',ev=>{const pp0=pn.querySelector('.v55jpop');V55.ui={uid:selUnits[0],t:performance.now(),exp:pn.classList.contains('expanded'),pop:!!(pp0&&pp0.classList.contains('open'))&&!ev.target.closest('[data-job]')};{const U=V55.ui;setTimeout(()=>{if(V55.ui===U)U.exp=pn.classList.contains('expanded');},0);}const t=ev.target.closest('[data-v55tab],[data-v55jp],[data-v55i]');if(!t){return;}
    if(t.dataset.v55tab){ev.stopPropagation();v55SetTab(t.dataset.v55tab);return;}
    if(t.dataset.v55jp){ev.stopPropagation();const pop=pn.querySelector('.v55jpop');if(pop){pop.classList.toggle('open');V55.ui.pop=pop.classList.contains('open');}return;}
    if(t.dataset.v55i){ev.stopPropagation();const h=pn.querySelector('.v55help');if(h)h.style.display=h.style.display==='none'?'block':'none';return;}
    },true);
  pn.addEventListener('click',ev=>{if(ev.target.closest('.v55jpop [data-job]')){const pop=pn.querySelector('.v55jpop');if(pop)setTimeout(()=>pop.classList.remove('open'),0);}});
  const st=document.createElement('style');st.id='v55css';st.textContent=`
#panel.v55 .v55tb{display:flex;gap:2px;margin:6px 0 4px;border-bottom:1px solid #8a6a3a88}
#panel.v55 .v55t{flex:1;background:none;border:0;border-bottom:2px solid transparent;color:#cdbb92;padding:3px 2px;font:inherit;font-size:calc(12.5px * var(--xwfs,1));cursor:pointer}
#panel.v55 .v55t.on{color:#ffe9b0;border-bottom-color:#e8b860;font-weight:bold}
#panel.v55 .v55pane{display:none;padding:2px 0}#panel.v55 .v55pane.on{display:block}
#panel.v55 .v55pane>.v55m>*,#panel.v55 .v55pane>.v55x>*{margin:3px 0}
#panel.v55 .v55pane>.v55x:not(:empty){border-top:1px solid #8a6a3a55;padding-top:3px;margin-top:4px}
#panel.v55 .v55job{display:flex;flex-wrap:wrap;align-items:center;gap:6px;position:relative}
#panel.v55 .v55jc{color:#ffe9b0}
#panel.v55 .v55jpop{display:none;flex-basis:100%}#panel.v55 .v55jpop.open{display:block}
#panel.v55 .v55jpop .jobs{display:grid;grid-template-columns:repeat(4,1fr);gap:3px;margin:2px 0;padding:4px;border:1px solid #8a6a3a88;border-radius:4px;background:#0e0a06}
#panel.v55 .v55jpop .btn{margin:0;padding:3px 2px;text-align:center}
#panel.v55 .v55act{display:flex;flex-wrap:wrap;gap:4px;margin-top:4px}
#panel.v55 .grid{display:grid;grid-template-columns:1fr 1fr!important;gap:1px 14px}
#panel.v55 .grid>span{display:flex;justify-content:space-between;border-bottom:1px dotted #8a6a3a44;cursor:help}
#panel.v55 [data-p="rel"] .tag{background:none!important;border:1px solid #8a6a3a;color:#e8dcb8}
#panel.v55 .v55k{font-size:calc(11px * var(--xwfs,1));padding:2px 6px;opacity:.85;margin-top:8px}
#panel.v55 .v55i{float:right;margin-left:6px;cursor:pointer;color:#cdbb92;font-weight:normal}
#panel.v55 .v55help{font-size:calc(11px * var(--xwfs,1));color:#cdbb92;border:1px dashed #8a6a3a77;padding:3px 6px;margin:3px 0}
#panel.v55 .pmore.v55pm:empty{display:none}#panel.v55 .pmore.v55pm>#v47um{display:none}
#panel.v55 .v55sum{color:#e8dcb8}
#panel.v55 .pdesc{color:#bfae8a!important}
body.touch #panel.v55:not(.expanded) .v55tb,body.touch #panel.v55:not(.expanded) .v55pane:not([data-p="ov"]){display:none!important}
body.touch #panel.v55:not(.expanded) .v55pane[data-p="ov"]{display:block!important}
body.touch #panel.v55 .v55jpop .jobs{grid-template-columns:repeat(3,1fr)}
body.touch #panel.v55 .grid{grid-template-columns:1fr 1fr!important}`;document.head.appendChild(st);}
SYS_TXT.push(['角色面板分頁','選取單一角色時，資訊分成 總覽／屬性／裝備／關係／歷練 五頁',()=>'<span class="tg">總覽：職務與常用動作</span><span class="tg">屬性：數值、靈根、丹毒、職業</span><span class="tg">裝備：裝備與推薦兵器</span><span class="tg">關係：好感、道侶、逐出</span><span class="tg">歷練：職業歷練、技能</span><details class="dt"><summary>詳情</summary>會記住上次看的分頁；按「指派 ▾」選擇職務；ⓘ 顯示操作說明。逐出師門會跳出確認視窗。</details>']);

// ======================= #134 村衛會迎擊闖入村莊的妖獸；村民見妖獸會走避（只在主機） =======================
TUNE.v60={vR:7,aggro:4,leash:14,range:1.15,cd:1.1,atk0:6,atkRealm:3,scan:0.4,fleeR:4.5,fleeD:5};
function v60Atk(n){const T=TUNE.v60;return T.atk0+T.atkRealm*(n.realm||0);}
function v60Find(n,v){const T=TUNE.v60,R=T.vR+T.aggro,c=unitComp(n);let best=null,bd=1e9;
  for(const e of S.enemies){if(e.dead||e.hp<=0)continue;if(dist(e.x,e.y,v.x,v.y)>R)continue;if(compAt(e.x,e.y)!==c)continue;const d=dist(n.x,n.y,e.x,e.y);if(d<bd){bd=d;best=e;}}return best;}
{const _uv=updateVillager;updateVillager=function(n,dt,ct){
  if(!n||S.dg||v49Client())return _uv.apply(this,arguments);const v=vById(n.vid);if(!v||v.type==='bandit')return _uv.apply(this,arguments);const T=TUNE.v60;
  try{
  if(n.guard){if(!n.post)n.post={x:n.x,y:n.y};n.v60s=(n.v60s||0)-dt;if(n.cd>0)n.cd-=dt;
    let e=n.gT!=null?S.enemies.find(o=>o.id===n.gT&&!o.dead&&o.hp>0):null;
    if(e&&dist(e.x,e.y,v.x,v.y)>T.leash){e=null;}
    if(!e&&n.v60s<=0){n.v60s=T.scan;e=v60Find(n,v);}
    if(e){if(n.gT!==e.id){n.gT=e.id;floater(n.x,n.y-0.4,'迎敵！','#cfe8ff');}n.ret=true;const d=dist(n.x,n.y,e.x,e.y);n.face=e.x>=n.x?1:-1;
      if(d>T.range+(e.r||0.3)){n.repath-=dt;if(n.repath<=0||!n.path.length){n.repath=0.6;pathTo(n,e.x,e.y);}if(n.path.length)followPath(n,dt);else{n.dvx=n.dvy=0;}moveEntity(n,dt);}
      else{n.path=[];n.dvx=n.dvy=0;moveEntity(n,dt);if(!(n.cd>0)){dmgEnemy(null,e,v60Atk(n)*(0.85+rnd()*0.3),'#cfe8ff');n.cd=T.cd;n.anim=0.25;V60.hits++;}}
      return;}
    n.gT=null;
    if(n.ret){const d=dist(n.x,n.y,n.post.x,n.post.y);if(d>1.2){n.repath-=dt;if(n.repath<=0||!n.path.length){n.repath=1;pathTo(n,n.post.x,n.post.y);}if(n.path.length)followPath(n,dt);else n.ret=false;moveEntity(n,dt);return;}n.ret=false;n.path=[];n.wt=1+rnd()*3;}
    return _uv.apply(this,arguments);}
  // 一般村民：附近有妖獸就往反方向走避
  n.v60s=(n.v60s||0)-dt;if(n.v60s<=0){n.v60s=0.5;let ne=null,nd=T.fleeR;for(const e of S.enemies){if(e.dead)continue;const d=dist(n.x,n.y,e.x,e.y);if(d<nd){nd=d;ne=e;}}
    if(ne){const a=Math.atan2(n.y-ne.y,n.x-ne.x);for(const da of [0,0.6,-0.6,1.2,-1.2]){const tx=n.x+Math.cos(a+da)*T.fleeD,ty=n.y+Math.sin(a+da)*T.fleeD;if(!blockedP(tx,ty)&&compAt(tx,ty)===unitComp(n)){pathTo(n,tx,ty);n.wt=3;if(!n.fled){n.fled=1;floater(n.x,n.y-0.4,'妖獸來了！','#ffd0a0');}break;}}}else n.fled=0;}
  }catch(err){console.warn('v60',err);}
  return _uv.apply(this,arguments);};}
const V60={hits:0};
SYS_TXT.push(['村衛','友好村莊的村衛會迎擊闖進村子的妖獸',()=>`<span class="tg">警戒：村子外 ${TUNE.v60.aggro} 格內</span><span class="tg">追擊不超過村中心 ${TUNE.v60.leash} 格</span><span class="tg">村民會走避</span><details class="dt"><summary>詳情</summary>村衛發現村子附近的妖獸、山賊會上前攻擊，追到太遠就回到原本的崗位。一般村民看到妖獸靠近會往反方向躲開。</details>`]);
// ======================= #130 仙緣來源降頻、降量，提示合併 =======================
// 舊：仙緣閣靈光每 60／45／30 秒（Lv1～3）必給隨機弟子 +2～5 並跳提示；仙緣閣感應每 150／120／90 秒 50% 觸發事件；事件獎勵 +2～+10
TUNE.v56={tick:[240,180,120],tickCh:0.5,gain:[[1,0.36],[2,0.36],[3,0.26],[6,0.005]],
  evGap:[375,300,225],evCh:0.10,// 真概率：感應 10%
  evMap:[[2,1],[4,2],[99,3]],evRare:0.005,evRareMin:5,rareVal:6};// +6 真概率 0.5%
// 稀有奇遇權重下调；任兩次事件至少相隔 cd 秒
TUNE.v168={mk:[750,1350],cd:300,rare:['yunyou','meteor','fox','egg','thunder','wuxing','hidroot','cave','spring'],rareW:0.15};
function v168Cd(){return !!(S&&S.ev&&S.ev.lastT!=null&&S.time-S.ev.lastT<TUNE.v168.cd&&S.time>=S.ev.lastT);}
function v168Pick(){const pool0=EVENTS.filter(e=>!(S.ev.seen[e.k]>=2)),pool=pool0.length?pool0:EVENTS;let tot=0;const w=pool.map(e=>{const x=TUNE.v168.rare.includes(e.k)?TUNE.v168.rareW:1;tot+=x;return x;});
  let r=rnd()*tot;for(let i=0;i<pool.length;i++){r-=w[i];if(r<0)return pool[i].k;}return pool.length?pool[pool.length-1].k:null;}
const V56={log:[]};
function v56Gain(){const G=TUNE.v56.gain;let r=rnd(),s=0;for(const [v,p] of G){s+=p;if(r<s)return v;}return G[0][0];}
function v56Scale(d){if(d<=0)return d;const T=TUNE.v56;if(d>=T.evRareMin&&rnd()<T.evRare)return T.rareVal;for(const [m,v] of T.evMap)if(d<=m)return Math.min(d,v);return 3;}
function v56Lv(b){return Math.max(1,Math.min(3,blv(b)));}
// 仙緣閣：停用舊計時，改用新節奏
{const _us=updateSect;updateSect=function(dt){const sv=[];for(const b of S.buildings)if(b.type==='xianyuan'){sv.push([b,b.xt||0]);b.xt=-1e9;}
  try{return _us.apply(this,arguments);}finally{for(const [b,x] of sv)b.xt=x;
    for(const [b] of sv){if(!b.built||b.broken)continue;b.v56t=(b.v56t||0)+dt;const gap=TUNE.v56.tick[v56Lv(b)-1];if(b.v56t<gap)continue;b.v56t=0;if(rnd()>=TUNE.v56.tickCh)continue;
      const ds=disciples().filter(u=>!u.dead);if(!ds.length)continue;
      const d=pick(ds),g=v56Gain();d.xy=(d.xy||0)+g;V56.log.push([S.time,g]);
      floater(d.x,d.y-0.2,`✨ 仙緣 +${g}`,'#c8b8ff');if(g>=TUNE.v56.rareVal)toast(`仙緣閣靈光大盛：${nm(d)}仙緣 +${g}`);}}};}
{const _te=tickEvents;tickEvents=function(dt){const sv=[];for(const b of S.buildings)if(b.type==='xianyuan'){sv.push([b,b.evT||0]);b.evT=-1e9;}
  try{return _te.apply(this,arguments);}finally{for(const [b,x] of sv)b.evT=x;
    for(const [b] of sv){if(!b.built||b.broken)continue;b.v56e=(b.v56e||0)+dt;if(b.v56e<TUNE.v56.evGap[v56Lv(b)-1])continue;b.v56e=0;if(rnd()<TUNE.v56.evCh)evTrigger(null,'仙緣閣感應');}}};}
// 事件獎勵：依實際增量縮小（+1～+3，少數 +6），並把結果寫回事件文字
function v56WrapOpt(o){if(!o||o._v56)return;const f0=o.f;o._v56=1;o.f=function(){const us=S.units.filter(u=>u.kind==='player'||u.kind==='disciple'),b=new Map(us.map(u=>[u,u.xy||0]));
  let r=f0.apply(this,arguments);const ch=[];for(const [u,x0] of b){const d=(u.xy||0)-x0;if(d>0){const s=v56Scale(d);u.xy=x0+s;ch.push([d,s]);}}
  if(typeof r==='string'&&ch.length){for(const [d,s] of ch)r=r.replace(new RegExp('仙緣 ?\\+'+d+'(?!\\d)'),'仙緣 +'+s);}return r;};}
function v56WrapAll(){for(const E of EVENTS)for(const o of E.o||[])v56WrapOpt(o);}
v56WrapAll();
{const _p=EVENTS.push;EVENTS.push=function(...a){const r=_p.apply(this,a);try{for(const E of a)for(const o of E.o||[])v56WrapOpt(o);}catch(e){}return r;};}
BDESC.xianyuan.t=b=>[`仙緣靈光每 ${TUNE.v56.tick[v56Lv(b)-1]} 秒（${Math.round(TUNE.v56.tickCh*100)}%觸發）`,`仙緣感應 ${Math.round(TUNE.v56.evCh*100)}%／${TUNE.v56.evGap[v56Lv(b)-1]} 秒`,`兩次仙緣至少相隔 ${TUNE.v168.cd} 秒`,'靈根率見資質品階（真概率）'];
{const _le=lvEffect;lvEffect=function(b,lv){let s=_le(b,lv);if(b&&b.type==='xianyuan')s=s.replace(/仙緣事件每 \d+ 秒/,`仙緣靈光每 ${TUNE.v56.tick[Math.max(1,Math.min(3,lv))-1]} 秒`);return s;};}
SYS_TXT.push(['仙緣來源','仙緣主要來自奇遇與仙緣閣，累積得慢、要靠長期經營',()=>`<span class="tg">仙緣閣靈光 ${TUNE.v56.tick.join('／')} 秒（Lv1～3）</span><span class="tg">每次 +1～3，偶爾 +6</span><span class="tg">感應事件 ${Math.round(TUNE.v56.evCh*100)}%</span><details class="dt"><summary>詳情</summary>仙緣閣每次隨機眷顧一名弟子。奇遇事件的仙緣獎勵多為 +1～+3，少數 +6；上古遺跡傳承仍給你 +20。仙緣的用途見「仙緣加成」。</details>`]);
// ======================= #131 丹藥加成上限 =======================
TUNE.v57={brkPill:0.20,cultBuffMax:0.5,permPerRealm:3,armMs:4000};
TUNE.tpCap=TUNE.v57.brkPill;
const V57={arm:null,force:false};
function v57TpP(u){if(!u)return 0;const b=u.tpB||0;if(!b){u.tpP=0;return 0;}if((u.tpP||0)>b)u.tpP=b;if(u.tpP==null)u.tpP=Math.min(b,TUNE.v57.brkPill);return u.tpP;}
function v57XsN(u){return u&&u.xsR&&u.xsR.r===u.realm?u.xsR.n:0;}
function v57Capped(u,k){if(!u)return false;if(k==='tp')return v57TpP(u)>=TUNE.v57.brkPill-0.001;if(k==='xs')return v57XsN(u)>=TUNE.v57.permPerRealm;return false;}
function v57CapTxt(u,k){if(k==='tp')return `丹藥加成 ${Math.round(v57TpP(u)*100)}% / 上限 ${Math.round(TUNE.v57.brkPill*100)}%`;if(k==='xs')return `本境界已服 ${v57XsN(u)}／${TUNE.v57.permPerRealm}`;return '';}
function v57Waste(u,k){const a=S.pills[k];let q=-1;if(a)for(let x=2;x>=0;x--)if(a[x]>0){q=x;break;}if(q<0)return false;a[q]--;const t0=u.tox||0;u.tox=Math.min(1,t0+((typeof TOX_ADD!=='undefined'&&TOX_ADD[k])||0.1));
  floater(u.x,u.y,'藥力無效・丹毒 '+Math.round(u.tox*100)+'%','#ffb070');toast(`${nm(u)}的${PILLS[k].n}藥力已達上限，只增加了丹毒（${Math.round(u.tox*100)}%）`);return true;}
{const _up=usePill;usePill=function(u,k){const force=V57.force;V57.force=false;if(!u||u.dead||(k!=='tp'&&k!=='xs'))return _up.apply(this,arguments);
  if(v57Capped(u,k)){if(force)return v57Waste(u,k);toast(`${nm(u)}：${PILLS[k].n}已達上限（${v57CapTxt(u,k)}），再服只會增加丹毒`);return false;}
  if(k==='tp'){const cap0=TUNE.tpCap,b0=u.tpB||0,p0=v57TpP(u);TUNE.tpCap=b0+(TUNE.v57.brkPill-p0);const t0=toast;toast=function(){};let ok;
    try{ok=_up(u,k);}finally{toast=t0;TUNE.tpCap=cap0;}if(ok){const d=Math.max(0,(u.tpB||0)-b0);u.tpP=Math.min(TUNE.v57.brkPill,p0+d);
      toast(`${nm(u)}服下突破丹：丹藥加成 ${Math.round(u.tpP*100)}% / 上限 ${Math.round(TUNE.v57.brkPill*100)}%`);}return ok;}
  const n0=u.xsN||0;u.xsN=0;let ok;try{ok=_up(u,k);}finally{u.xsN=ok?n0+1:n0;}if(ok){const n=v57XsN(u);u.xsR={r:u.realm,n:n+1};}return ok;};}
// 修煉速度類丹藥（掛鉤）：同時最多 +50%，再服只刷新時間
function v57CultBuff(u,pct,dur){if(!u)return;const c=u.cbuf&&S.time<u.cbuf.t?u.cbuf:{p:0,t:0};u.cbuf={p:Math.min(TUNE.v57.cultBuffMax,c.p+pct),t:Math.max(c.t,S.time+dur)};return u.cbuf;}
{const _cm=cultMul;cultMul=function(u){let m=_cm(u);if(u&&u.cbuf){if(S.time<u.cbuf.t)m*=1+Math.min(TUNE.v57.cultBuffMax,u.cbuf.p||0);else u.cbuf=null;}return m;};}
UNIT_KEEP.push('tpP','xsR','cbuf');
{const _bh=brkHtml;brkHtml=function(u,full){let h=_bh(u,full);try{if(u&&u.realm<MAX_REALM&&(v47Major(u)||u.tpB>0)&&h.indexOf('<details class="dt"')>0){const p=v57TpP(u),c=p>=TUNE.v57.brkPill-0.001;
  const ln=`<div class="v57pl" style="color:${c?'#ffb070':'#ffe27a'}" title="突破丹的成功率加成每次大突破最多 +${Math.round(TUNE.v57.brkPill*100)} %；突破後歸零">丹藥加成 ${Math.round(p*100)}% / 上限 ${Math.round(TUNE.v57.brkPill*100)}%${c?'<span class="dim">（已達上限）</span>':''}</div>`;
  h=h.replace('<details class="dt"',ln+'<details class="dt"');}}catch(e){}return h;};}
// 行囊：已達上限→灰字＋二次確認
{const _rb=renderBag;renderBag=function(){const r=_rb.apply(this,arguments);try{v57BagDeco();}catch(e){}return r;};}
function v57BagDeco(){const el=document.getElementById('bag');if(!el||!bagOpen)return;const u=unitById(bagUnit)||player();if(!u)return;
  for(const bt of el.querySelectorAll('[data-use]')){const k=bt.dataset.use,it=bt.closest('.item');const cap=v57Capped(u,k);bt.classList.toggle('v57cap',cap);
    let s=it&&it.querySelector('.v57capt');if(cap&&it&&!s){s=document.createElement('small');s.className='v57capt';it.insertBefore(s,bt);}if(!cap&&s)s.remove();
    if(s)s.textContent=`已達上限（${v57CapTxt(u,k)}）・再服只增丹毒`;
    const A=V57.arm;const armed=cap&&A&&A.k===k&&A.uid===u.id&&performance.now()-A.t<TUNE.v57.armMs;if(armed)bt.textContent='確定服用？（只增丹毒）';bt.classList.toggle('v57arm',!!armed);}
  for(const d of el.querySelectorAll('.dim'))if(/突破加成 \d+%/.test(d.textContent)&&!d._v57){d._v57=1;d.textContent=`丹毒 ${Math.round((u.tox||0)*100)}%　丹藥加成 ${Math.round(v57TpP(u)*100)}% / 上限 ${Math.round(TUNE.v57.brkPill*100)}%　洗髓（本境界）${v57XsN(u)}/${TUNE.v57.permPerRealm}`;}}
function v57Init(){const el=document.getElementById('bag');if(!el||el._v57)return;el._v57=1;
  el.addEventListener('click',ev=>{const bt=ev.target.closest('[data-use]');if(!bt)return;const u=unitById(bagUnit)||player(),k=bt.dataset.use;if(!u||!v57Capped(u,k))return;
    ev.stopPropagation();ev.preventDefault();const A=V57.arm;if(A&&A.k===k&&A.uid===u.id&&performance.now()-A.t<TUNE.v57.armMs){V57.arm=null;V57.force=true;try{usePill(u,k);}finally{V57.force=false;}}else V57.arm={k,uid:u.id,t:performance.now()};
    bagKey=null;renderBag();},true);
  const st=document.createElement('style');st.id='v57css';st.textContent='#bag .v57cap{opacity:.55;filter:grayscale(.7)}#bag .v57cap.v57arm{opacity:1;filter:none;border-color:#ff9a6a;color:#ffb070}#bag .v57capt{display:block;color:#8f8a80;font-size:calc(12px * var(--xwfs,1))}';document.head.appendChild(st);}
{const _t=v49Tick;v49Tick=function(dt){_t(dt);try{for(const u of S.units)if(u.tpP&&!u.tpB)u.tpP=0;}catch(e){}};}
PILLS.tp.desc=`每服一顆，下一次大境界突破成功率 +（依境界 1～10%），丹藥加成每次突破最多 +${Math.round(TUNE.v57.brkPill*100)}%；突破後歸零`;
PILLS.xs.desc=`悟性 +3／+5／+8，有機會覺醒或提升靈根（每個境界最多 ${TUNE.v57.permPerRealm} 顆，超過只增丹毒）`;
SYS_TXT.push(['丹藥上限','丹藥效果有上限，超過只會累積丹毒',()=>`<span class="tg">突破丹加成 ≤ ${Math.round(TUNE.v57.brkPill*100)}%／次</span><span class="tg">洗髓丹每境界 ${TUNE.v57.permPerRealm} 顆</span><span class="tg">修煉增速 ≤ +${Math.round(TUNE.v57.cultBuffMax*100)}%</span><details class="dt"><summary>詳情</summary>突破丹的加成在下一次大境界突破前最多累積到上限，突破後歸零。洗髓丹這類永久提升的丹藥，每個境界只有前幾顆有效，之後再服只會增加丹毒。修煉增速類丹藥同時最多 +50%，再服只會延長時間。丹毒仍會照舊削減藥效。行囊中已達上限的丹藥會變灰，服用前要再按一次確認。</details>`]);
// ======================= #132 仙緣事件：忙碌時排隊，不打斷操作 =======================
TUNE.v58={idle:3,ttl:300,combat:5,max:2};// #168：排隊上限 5→2
const V168={n:0,skip:0,drop:0};
const V58={idleMs:0,last:0,el:null,open:false};
const V58_DLG=['bag','cult','trade','shrine','saves','settings','dlg','confirm','kickdlg','v48dlg','guide','roster','craft','death','title','v47pause','recmenu','menuPop'];
function v58Vis(id){const e=document.getElementById(id);if(!e)return false;const cs=getComputedStyle(e);if(cs.display==='none'||cs.visibility==='hidden'||+cs.opacity===0)return false;return e.getClientRects().length>0;}
function v58Q(){if(v49Client()){V58.cq=V58.cq||[];return V58.cq;}S.flags.v58q=S.flags.v58q||[];return S.flags.v58q;}
function v58BusyWhy(){try{if(paused)return 'pause';if(S.dg)return 'dg';if(evOpen)return 'ev';if(bagOpen)return 'bag';if(craftOpen)return 'craft';if(allocOpen)return 'alloc';if(typeof radialOpen!=='undefined'&&radialOpen)return 'radial';
  if(buildMode)return 'build';if(selBuilding!=null)return 'building';if(typeof mouse!=='undefined'&&mouse&&(mouse.box||mouse.drag))return 'drag';
  for(const id of V58_DLG)if(v58Vis(id))return 'dlg:'+id;if(v58Vis('tutbub'))return 'tut';
  const p=player(),T=TUNE.v58.combat,hot=u=>u&&!u.dead&&((S.time-(u.lastHit==null?-99:u.lastHit))<T||(S.time-(u.lastAtk==null?-99:u.lastAtk))<T);
  if(hot(p))return 'combat';for(const id of selUnits){const u=unitById(id);if(hot(u))return 'combat';}
  for(const u of S.units)if(u&&!u.dead&&(u.brkAnim||u.brkT>S.time))return 'break';}catch(e){}return '';}
function v58Busy(){return !!v58BusyWhy();}
function v58Pick(k){return k||v168Pick();}
// #168：冷卻中不觸發；排隊滿了丟棄新的（不擠掉舊的）；未指定事件時用加權抽選（稀有較少）
{const _et=evTrigger;evTrigger=function(k,src){if(V58.force||!S||!S.ev)return _et.apply(this,arguments);if(S.dg)return false;
  if(!/路上奇遇/.test(src||'')&&v168Cd()){V168.skip++;return false;}/* 玩家或弟子走去的靈光不受冷卻 */
  const kk=v58Pick(k);if(!kk)return false;
  if(v58Busy()||evOpen){const q=v58Q();if(q.length>=TUNE.v58.max){V168.drop++;return false;}q.push({k:kk,src:src||'奇遇',t:S.time});S.ev.lastT=S.time;V168.n++;V58.idleMs=0;v58Hud();return true;}
  const r=_et.call(this,kk,src);if(r){S.ev.lastT=S.time;V168.n++;}return r;};}
function v58Open(){const q=v58Q();if(!q.length||evOpen)return false;const it=q.shift();V58.force=true;let r=false;try{r=evTrigger(it.k,it.src+'・稍早');}finally{V58.force=false;}v58Hud();return r;}
function v58Hud(){let el=V58.el;if(!el){el=document.getElementById('v58q');if(!el){el=document.createElement('button');el.id='v58q';el.className='btn';el.addEventListener('click',ev=>{ev.stopPropagation();v58Open();});document.body.appendChild(el);}V58.el=el;}
  const n=S&&S.flags?v58Q().length:0;const t=n?`✨ 仙緣 ×${n}`:'';if(el.textContent!==t)el.textContent=t;el.style.display=n?'':'none';el.title=n?'有仙緣事件等你處理：點一下開啟（閒下來 3 秒也會自動開啟）':'';}
function v58Ui(){if(!S||!S.flags)return;const q=v58Q();const now=performance.now(),dt=V58.last?Math.min(1000,now-V58.last):0;V58.last=now;
  for(let i=q.length-1;i>=0;i--)if(S.time-q[i].t>TUNE.v58.ttl){const E=EVENTS.find(e=>e.k===q[i].k);q.splice(i,1);toast(`一段仙緣悄然消散了……${E?'（'+E.t+'）':''}`);}
  if(q.length&&!evOpen&&!v58Busy()){V58.idleMs+=dt;if(V58.idleMs>=TUNE.v58.idle*1000){V58.idleMs=0;v58Open();}}else V58.idleMs=0;v58Hud();}
{const _u=updateUI;updateUI=function(){_u.apply(this,arguments);try{v58Ui();}catch(e){}};}
function v58Css(){if(document.getElementById('v58css'))return;const st=document.createElement('style');st.id='v58css';
  st.textContent='#v58q{position:fixed;z-index:30;left:50%;transform:translateX(-50%);top:calc(var(--tb,44px) + 8px);font-size:calc(14px * var(--xwfs,1));padding:4px 12px;border-radius:14px;background:#2a1f3af0;border:1px solid #b9a0ff;color:#e8dcff;box-shadow:0 0 10px #b9a0ff88;animation:v58p 1.6s ease-in-out infinite}@keyframes v58p{50%{box-shadow:0 0 18px #d0b8ff}}';document.head.appendChild(st);}
SYS_TXT.push(['仙緣事件排隊','忙碌時出現的仙緣事件會先排隊，不會打斷你',()=>`<span class="tg">頂部「✨ 仙緣 ×N」</span><span class="tg">閒置 ${TUNE.v58.idle} 秒自動開啟</span><span class="tg">一天內未處理會消散</span><details class="dt"><summary>詳情</summary>煉丹、鍛造、戰鬥、開著行囊或任何面板、秘境、框選拖曳、教學或突破時，仙緣事件不會直接跳出，而是排進頂部的「✨ 仙緣」按鈕。點一下立即開啟；放著不動 ${TUNE.v58.idle} 秒也會自動開啟。超過一個遊戲日沒處理就會消散。聯機時只會出現在被選中的那位玩家畫面上。</details>`]);
// ======================= #133 技藝熟練度（鍛造／煉丹），每位弟子分開累積 =======================
TUNE.v59={perLv:0.03,maxLv:10};
const V59_K={forge:'forge',alchemy:'alch'},V59_N={forge:'鍛造',alch:'煉丹'};
function v59P(u){if(!u)return {forge:0,alch:0};if(!u.cpf||typeof u.cpf!=='object')u.cpf={forge:0,alch:0};if(!(u.cpf.forge>=0))u.cpf.forge=0;if(!(u.cpf.alch>=0))u.cpf.alch=0;return u.cpf;}
function v59Lv(u,k){return Math.min(TUNE.v59.maxLv,Math.floor(Math.sqrt(v59P(u)[k]||0)));}
function v59Next(u,k){const lv=v59Lv(u,k),c=v59P(u)[k]||0;if(lv>=TUNE.v59.maxLv)return {lv,c,need:null};return {lv,c,need:(lv+1)*(lv+1)};}
function v59Txt(u,k){const N=v59Next(u,k);return `${V59_N[k]} Lv${N.lv}`+(N.need?`（${N.c}/${N.need}）`:'（圓滿）');}
{const _cs=craftSkill;craftSkill=function(u,b){let s=_cs(u,b);try{const k=b&&V59_K[b.type];if(u&&k)s+=TUNE.v59.perLv*v59Lv(u,k);}catch(e){}return s;};}
{const _fc=finishCraft;finishCraft=function(b){const k=b&&V59_K[b.type];if(!k||!b.craft)return _fc.apply(this,arguments);let cs=[];try{cs=crafters(b).slice();}catch(e){}
  const g0=S.stats.gear||0,p0=S.stats.pills||0;const r=_fc.apply(this,arguments);
  try{const n=k==='forge'?(S.stats.gear||0)-g0:(S.stats.pills||0)-p0;if(n>0)for(const u of cs){if(!u||u.dead)continue;const lv0=v59Lv(u,k);v59P(u)[k]+=n;const lv1=v59Lv(u,k);
    if(lv1>lv0)floater(u.x,u.y-0.5,`${V59_N[k]}熟練 Lv${lv1}`,'#ffe27a');}}catch(e){console.warn('v59',e);}return r;};}
UNIT_KEEP.push('cpf');
function v59Mig(){for(const u of S.units)if(u.kind==='player'||u.kind==='disciple')v59P(u);}
{const _as=applySave;applySave=function(d){const r=_as.apply(this,arguments);try{if(r&&S)v59Mig();}catch(e){}return r;};}
// 面板：屬性頁顯示技藝
{const _ue=unitExtraHtml;unitExtraHtml=function(u){let h=_ue(u);try{if(u&&(u.kind==='player'||u.kind==='disciple')){const f=v59Next(u,'forge'),a=v59Next(u,'alch');const bar=N=>N.need?Math.round((N.c-N.lv*N.lv)/(N.need-N.lv*N.lv)*100):100;
  h+=`<div class="v59pf" title="每成品 +1 熟練；等級＝√熟練（最高 ${TUNE.v59.maxLv}）；每級提高成品品質機率、降低廢丹率">技藝：<span class="tg">${v59Txt(u,'forge')}</span><span class="tg">${v59Txt(u,'alch')}</span><span class="v59b"><i style="width:${bar(f)}%"></i></span><span class="v59b"><i style="width:${bar(a)}%"></i></span></div>`;}}catch(e){}return h;};}
// 丹爐／鍛造台：顯示匠人熟練度
{const _rc=renderCraft;renderCraft=function(){_rc.apply(this,arguments);try{const el=document.getElementById('craft');const b=bById(craftB);if(!el||!b||!craftOpen)return;const k=V59_K[b.type];if(!k)return;
  let box=el.querySelector('#v59cp');if(!box){box=document.createElement('div');box.id='v59cp';box.className='dim';const h=el.querySelector('h3,h4');if(h&&h.nextSibling)el.insertBefore(box,h.nextSibling);else el.prepend(box);}
  const cs=crafters(b),best=bestCrafter(b);const job=JOB_OF[b.type];const pool=disciples().filter(u=>!u.dead&&u.job!==job).sort((x,y)=>v59P(y)[k]-v59P(x)[k]).slice(0,3);
  const t=`<b>匠人熟練</b>：${cs.length?cs.map(u=>`<span class="tg${u===best?' on':''}">${esc(nm(u))} ${v59Txt(u,k).replace(V59_N[k]+' ','')}</span>`).join(''):'<span class="dim">（無人，指派弟子「'+JOB_NAME[job]+'」）</span>'}`+(pool.length?`<br><small>可指派：${pool.map(u=>`${esc(nm(u))} Lv${v59Lv(u,k)}`).join('、')}</small>`:'')+`<br><small>主事者（${best?esc(nm(best)):'—'}）的熟練度決定品質加成</small>`;
  if(box._t!==t){box._t=t;box.innerHTML=t;}}catch(e){console.warn('v59',e);}};}
// 指派選單：煉丹／鍛造按鈕上標示熟練等級
function v59JobBadge(){const pn=document.getElementById('panel');if(!pn||!selUnits.length)return;const u=unitById(selUnits[0]);if(!u)return;
  for(const [job,k] of [['alchemy','alch'],['forge','forge']])for(const bt of pn.querySelectorAll(`[data-job="${job}"]`)){let s=bt.querySelector('.v59jb');const t=selUnits.length===1?`Lv${v59Lv(u,k)}`:'';
    if(!t){if(s)s.remove();continue;}if(!s){s=document.createElement('small');s.className='v59jb';bt.appendChild(s);}if(s.textContent!==t)s.textContent=t;bt.title=v59Txt(u,k);}}
{const _rp=renderPanel;renderPanel=function(){const r=_rp.apply(this,arguments);try{v59JobBadge();}catch(e){}return r;};}
function v59Css(){if(document.getElementById('v59css'))return;const st=document.createElement('style');st.id='v59css';
  st.textContent='.v59pf .v59b{display:inline-block;width:40px;height:5px;margin:0 3px;background:#3a2a1a;border-radius:3px;vertical-align:middle;overflow:hidden}.v59pf .v59b i{display:block;height:100%;background:#ffd36a}.v59jb{margin-left:3px;color:#ffe27a;font-size:.8em}#v59cp{margin:4px 0}#v59cp .tg.on{border-color:#ffd36a;color:#ffe27a}';document.head.appendChild(st);}
SYS_TXT.push(['技藝熟練','弟子越常鍛造／煉丹，做出的東西品質越好',()=>`<span class="tg">每件成品 +1 熟練</span><span class="tg">等級＝√熟練，最高 Lv${TUNE.v59.maxLv}</span><span class="tg">每級技巧 +${Math.round(TUNE.v59.perLv*100)}%</span><details class="dt"><summary>詳情</summary>鍛造與煉丹分開計算。每做出一件兵器或一顆丹藥，參與的人都會多 1 點熟練；等級是熟練的平方根（1、4、9、16…件升級），越往後越慢。由主事者（技巧最高的人）的熟練度提高好品質的機率、降低廢丹率。品質再高，丹藥加成上限仍照常計算。</details>`]);
// ======================= #138 觸控／滑鼠切換時不要在按下的瞬間重建面板（否則這一下點擊會落空） =======================
const V138={ui:false,dirty:false,n:0};
addEventListener('pointerdown',ev=>{const t=ev.target;V138.ui=!!(t&&t.closest&&t.closest('#panel,#bag,#craft,#v58q,.dlg,#evdlg,#roster,#rec'));V138.down=V138.ui?t:null;V138.sw=false;},true);
// 切換觸控／滑鼠版面會讓按鈕位移，放開時落在別的元素上 → 把這一下點擊補回按下的那顆按鈕
addEventListener('click',ev=>{const d=V138.down,sw=V138.sw;V138.down=null;V138.sw=false;if(!sw||!d||!d.isConnected||d.contains(ev.target))return;const b=d.closest('button,[data-job],[data-act],[data-v55jp],[data-v55tab],.btn')||d;if(b.contains(ev.target))return;ev.stopPropagation();ev.preventDefault();V138.fix=(V138.fix||0)+1;setTimeout(()=>b.click(),0);},true);
{const _st=setTouchUI;setTouchUI=function(v){const k=panelKeyCache,ui=V138.ui;const r=_st.apply(this,arguments);if(ui){V138.sw=true;if(panelKeyCache===null&&k!==null){panelKeyCache=k;V138.dirty=true;V138.n++;}}return r;};}
function v138Flush(){if(V138.dirty){V138.dirty=false;panelKeyCache=null;}}
addEventListener('click',()=>setTimeout(v138Flush,0),false);addEventListener('pointerup',()=>setTimeout(v138Flush,450),true);addEventListener('pointercancel',()=>setTimeout(v138Flush,0),true);
// #138b 頂部 HUD 避讓：山賊來襲橫幅（#v47ban）與仙緣按鈕（#v58q）不可蓋住頭像列（#pbar）
function v138Lay(){try{const pb=document.getElementById('pbar');const R=pb&&getComputedStyle(pb).display!=='none'?pb.getBoundingClientRect():null;const vis=R&&R.height>0;
  const q=document.getElementById('v58q');if(q&&q.style.display!=='none'){let st='';if(vis){const w=q.offsetWidth||100;const mm=document.getElementById('minimap'),M=mm&&getComputedStyle(mm).display!=='none'?mm.getBoundingClientRect():null;const L=R.right+8,T=R.top+2,hitM=M&&M.height>0&&L<M.right&&L+w>M.left&&T<M.bottom&&T+32>M.top;
    if(L+w<=innerWidth-4&&!hitM)st=`left:${Math.round(L)}px;top:${Math.round(T)}px;transform:none`;else if(L+w<=innerWidth-4&&M)st=`left:${Math.round(L)}px;top:${Math.round(M.bottom+6)}px;transform:none`;else st=`top:${Math.round(R.bottom+6)}px`;}if(q._v138!==st){q._v138=st;q.style.cssText=q.style.cssText.replace(/(left|top|transform):[^;]*;?/g,'')+(st?';'+st:'');}}
  const b=document.getElementById('v47ban');if(b){const st=vis?`top:${Math.round(R.bottom+6)}px`:'';if(b._v138!==st){b._v138=st;b.style.top=vis?Math.round(R.bottom+6)+'px':'';}}}catch(e){}}
{const _u=updateUI;updateUI=function(){_u.apply(this,arguments);v138Lay();};}
// ======================= #149／#150 副本內：靈氣與護體罡氣不回復 → 技能一直顯示「距離不合」 =======================
// 原因：副本用 dgUpdate() 取代整個世界更新，tickV045→v49Tick（靈氣／護盾回復）在副本裡完全不跑。
// 靈氣歸零後技能被靈氣不足擋下，失敗提示卻寫成「距離不合」。修正：副本內同樣每 0.25 秒回復（只跑回復，不跑宗門建築相關邏輯）。
const V149={t:0,n:0};
{const _dgu=dgUpdate;dgUpdate=function(dt){_dgu.apply(this,arguments);try{if(!S.dg||v49Client())return;V149.t+=dt;if(V149.t<0.25)return;const st=V149.t;V149.t=0;V149.n++;
  for(const u of S.units)if(v49Sect(u))v49PoolTick(u,st);}catch(e){console.warn(e);}};}
// 技能失敗提示：說清楚是冷卻、靈氣不足、距離、還是視線被擋（護體罡氣已改為被動，不再列出）
const V149_R={charge:{max:5.5,los:0.2},sweep:{max:1.9},fireball:{max:6,los:0.05},flysword:{max:8,los:0.05},jindan:{max:2.5}};
function v149Why(p,e,ab){const c=p.acd&&p.acd[ab]>0.01?Math.ceil(p.acd[ab]):0;if(c)return c+' 秒';const C=TUNE.v49&&TUNE.v49.abCost||{};if(p.qiMax>0&&C[ab]&&(p.qi||0)<C[ab])return `靈氣不足 ${Math.floor(p.qi||0)}/${C[ab]}`;
  const R=V149_R[ab];if(!R||!e)return '無法施放';const d=dist(p.x,p.y,e.x,e.y);if(R.min&&d<R.min)return `太近（需 ${R.min} 格外）`;if(d>R.max)return `太遠（${R.max} 格內）`;if(R.los!=null&&!los(p.x,p.y,e.x,e.y,R.los))return '視線被擋';return '無法施放';}
{const _ck=castSkill;castSkill=function(){const p=player();const t0=toast;let msg=null;toast=function(m){if(typeof m==='string'&&m.indexOf('技能：')===0){msg=m;return;}return t0.apply(this,arguments);};
  try{_ck.apply(this,arguments);}finally{toast=t0;}
  if(msg&&p){const e=nearestEnemy(p.x,p.y,8.5);const abs=REALMS.slice(1,p.realm+1).filter(R=>R.ab&&R.ab!=='guard'&&ABIL[R.ab]).map(R=>R.ab);V149.last=abs.map(a=>`${ABIL[a].n}（${v149Why(p,e,a)}）`).join('、');toast('技能：'+(V149.last||'目前沒有可用技能'));}};}
SYS_TXT.push(['副本回復','副本裡靈氣與護體罡氣也會回復',()=>`<span class="tg">脫戰 ${TUNE.v49.gqCd} 秒後護盾開始回復</span><span class="tg">打坐時靈氣回復較快</span><details class="dt"><summary>說明</summary>技能沒放出來時，提示會寫明是冷卻、靈氣不足、太近／太遠，還是視線被擋。</details>`]);
// ======================= #151 靈氣回復倍率：野外 80 %／房屋 100 %／房屋＋聚靈陣 120 %，隨建築等級提高（主機權威） =======================
TUNE.v61={base:0.8,house:0.2,houseLv:0.05,jl:0.2,jlLv:0.1,jlR:8};
BUILD.juling={name:'聚靈陣',size:2,cost:{stone:80,lingshi:40,herb:20},time:16,pop:0,hp:400,reqXian:true,desc:''};
BDESC.juling={s:'匯聚天地靈氣，範圍內靈氣回復 +20 %',t:b=>[`範圍 ${TUNE.v61.jlR} 格`,`靈氣回復 +${Math.round(v61JlAdd(blv(b))*100)} %`],d:'野外靈氣回復只有 80 %；待在房屋裡 100 %；房屋位於聚靈陣範圍內 120 %。聚靈陣每升一級再 +10 %，房屋每升一級再 +5 %。多座聚靈陣不疊加，取最高等級。'};
BUILD.juling.desc=BDESC.juling.s+'。'+BDESC.juling.d;
BUILD_ORDER.push('juling');
V50L.juling=b=>[['靈氣加成',`範圍內 +${Math.round(v61JlAdd(blv(b))*100)} %（Lv ${blv(b)}）`],['範圍',`陣眼周圍 ${TUNE.v61.jlR} 格`]];
function v61JlAdd(lv){return TUNE.v61.jl+TUNE.v61.jlLv*(Math.max(1,lv)-1);}
function v61HouseAdd(lv){return TUNE.v61.house+TUNE.v61.houseLv*(Math.max(1,lv)-1);}
// 回傳 {m:倍率, s:來源文字}；副本裡沒有房屋與聚靈陣 → 80 %
function v61QiMul(u){const T=TUNE.v61;let m=T.base;const src=[];let hb=null;
  if(!S.dg&&u.inside&&u.inB!=null){const b=bById(u.inB);if(b&&b.type==='house'&&b.built&&!b.broken)hb=b;}
  if(hb){m+=v61HouseAdd(blv(hb));src.push('房屋'+(blv(hb)>1?' Lv'+blv(hb):''));}
  let jl=0;if(!S.dg){const c=hb?{x:hb.i+BUILD.house.size/2,y:hb.j+BUILD.house.size/2}:u;for(const b of S.buildings){if(b.type!=='juling'||!b.built||b.broken)continue;if(distRect(c.x,c.y,b.i,b.j,BUILD.juling.size)<=T.jlR)jl=Math.max(jl,blv(b));}}
  if(jl){m+=v61JlAdd(jl);src.push('聚靈陣 Lv'+jl);}
  return {m:Math.round(m*100)/100,s:src.length?src.join('+'):(S.dg?'副本・野外':'野外')};}
// 套在靈氣回復上：只改靈氣，不動護體罡氣；結果寫在 u.qiM／u.qiS 供 UI 與聯機同步
{const _pt=v49PoolTick;v49PoolTick=function(u,dt){const q0=u.qi;_pt(u,dt);try{if(u.qiMax>0){const r=v61QiMul(u);u.qiM=r.m;u.qiS=r.s;const d=u.qi-q0;if(d>0)u.qi=Math.min(u.qiMax,q0+d*r.m);}}catch(e){}};}
function v61Txt(u){if(!u||!(u.qiMax>0))return '';const r=(v49Client()&&u.qiM!=null)?{m:u.qiM,s:u.qiS||''}:v61QiMul(u);return `靈氣恢復 ${Math.round(r.m*100)}%（${r.s}）`;}
{const _rp=renderPanel;renderPanel=function(){_rp();try{const pn=document.getElementById('panel');if(!pn||selUnits.length!==1)return;const u=unitById(selUnits[0]);const at=pn.querySelector('.v55pane[data-p="at"] .v55m');
  let el=pn.querySelector('#v61qr');const t=v61Txt(u);if(!t){if(el)el.remove();return;}if(!el){el=document.createElement('div');el.id='v61qr';el.className='sm';el.style.cssText='color:#9fc8ff;margin:2px 0';(at||pn).prepend(el);}
  if(el.textContent!==t)el.textContent=t;el.title='野外 80 %、房屋 100 %、房屋＋聚靈陣 120 %；建築升級再提高';}catch(e){}};}
{const _u=updateUI;updateUI=function(){_u();try{const el=document.getElementById('v61qr');if(el&&selUnits.length===1){const t=v61Txt(unitById(selUnits[0]));if(t&&el.textContent!==t)el.textContent=t;}
  const b=document.querySelector('#buildbar [data-b="juling"] b');if(b&&/⇧1\d/.test(b.textContent))b.textContent=b.textContent.replace(/⇧1\d　?/,'');}catch(e){}};}
{const _le=lvEffect;lvEffect=function(b,lv){let s=_le(b,lv);if(b&&b.type==='juling')s=`範圍內靈氣回復 +${Math.round(v61JlAdd(lv)*100)} %`+(s?'、'+s:'');else if(b&&b.type==='house')s+=`、屋內靈氣回復 +${Math.round(v61HouseAdd(lv)*100)} %`;return s;};}
// 外觀：石台＋發光陣紋
{const _ds=drawBuildingShape;drawBuildingShape=function(type,i,j,t,alpha,b){if(type!=='juling')return _ds(type,i,j,t,alpha,b);_ds(type,i,j,t,alpha,b);};}
{const i=SYS_TXT.findIndex(x=>x[0]==='陣法');if(i>=0)SYS_TXT[i]=['陣法','聚靈陣已開放；護宗陣（規劃中）',()=>'聚靈陣：範圍內靈氣回復提高，房屋在範圍內效果最好。護宗陣：未來版本，只讓友方與中立通過。'];}
SYS_TXT.push(['靈氣回復倍率','野外 80 %、房屋 100 %、房屋＋聚靈陣 120 %',()=>`<span class="tg">野外 ${Math.round(TUNE.v61.base*100)} %</span><span class="tg">房屋 +${Math.round(TUNE.v61.house*100)} %（每級 +${Math.round(TUNE.v61.houseLv*100)} %）</span><span class="tg">聚靈陣 ${TUNE.v61.jlR} 格內 +${Math.round(TUNE.v61.jl*100)} %（每級 +${Math.round(TUNE.v61.jlLv*100)} %）</span><details class="dt"><summary>詳情</summary>倍率乘在原本的靈氣回復上（打坐、吐納之所照舊）。角色面板「屬性」頁顯示目前倍率與來源。副本裡沒有房屋與聚靈陣，按野外計算。</details>`]);
// ======================= #153 室內修煉太快：加成改為「資質 × (1 + 各項加成總和，上限 ×3) × 閉關」 =======================
// 舊制：悟性×仙武之體×洞府×靈根×功德×領悟×丹房×丹藥×地點（練武閣 2.4／室內 1.3）×大殿閉關（4／10／20）全部連乘。
// #166 修煉平衡：三組加成（環境、體質、機緣）各自相加、組間相乘；組內與總和頂端「遞減」而非硬上限；閉關（大殿）另乘
TUNE.v62={cap:3,xw:0.25,xwD:0.25,cave:0.12,caveMax:0.6,tq:0.15,xy:0.08,alch:0.05,lw:0.8,
  loc:{lianwu:0.6,wudao:0.3,room:0.15,house:0.2,houseLv:0.1,jl:0.25,jlLv:0.15},hall:[1.6,2.0,2.5],tox:0.7,
  grp:{env:[2.0,3.0],buff:[1.8,2.6]},top:[4,6]};// grp／top：[起始遞減點, 漸近上限]
// 節奏主槓桿：每層所需修為整體倍率（加成變大方、需求同步提高，維持凡界約 7 天目標）
TUNE.needMul=1.3;
TUNE.v49.hall=TUNE.v62.hall.slice();
// 地點加成（加法）：m＝原本傳入的地點倍率，b＝所在室內建築
function v62Loc(u,m,b){const L=TUNE.v62.loc,o={add:0,src:[],hall:1};
  if(b){const t=b.type;if(t==='lianwu'){o.add+=L.lianwu;o.src.push(['練武閣',L.lianwu]);}else if(t==='wudao'){o.add+=L.wudao;o.src.push(['武道場',L.wudao]);}
    else if(t==='house'){const a=L.house+L.houseLv*(blv(b)-1);o.add+=a;o.src.push(['房屋'+(blv(b)>1?' Lv'+blv(b):''),a]);}
    else{o.add+=L.room;o.src.push(['室內',L.room]);}
    if(t==='hall'){o.hall=TUNE.v62.hall[clamp(blv(b),1,3)-1];}}
  else if(m>=2.3){o.add+=L.lianwu;o.src.push(['練武閣旁',L.lianwu]);}else if(m>=1.5){o.add+=L.wudao;o.src.push(['武道場旁',L.wudao]);}
  if(!S.dg){const c=b?{x:b.i+BUILD[b.type].size/2,y:b.j+BUILD[b.type].size/2}:u;let jl=0;for(const x of S.buildings){if(x.type!=='juling'||!x.built||x.broken)continue;if(distRect(c.x,c.y,x.i,x.j,BUILD.juling.size)<=TUNE.v61.jlR)jl=Math.max(jl,blv(x));}
    if(jl){const a=L.jl+L.jlLv*(jl-1);o.add+=a;o.src.push(['聚靈陣 Lv'+jl,a]);}}
  return o;}
// 完整拆解：talent（資質，連乘）× min(cap, 1+加成總和) × 閉關 × 丹毒
let V62SIM=null;// 節奏模擬用（平時為 null）
// 遞減：x≤k 不變；超過 k 後漸近 M
function v62Soft(x,k,M){return x<=k?x:k+(M-k)*(1-Math.exp(-(x-k)/(M-k)));}
// 完整拆解：資質（悟性×靈根，連乘）×［環境 × 體質 × 機緣 × 閉關，頂端遞減］× 丹毒
function v62Cult(u,loc){const SM=V62SIM,T=TUNE.v62,parts=[];let talent=(0.6+(u.wu||0)/100);const rc=typeof rootCult==='function'?rootCult(u):1;talent*=rc;
  const G={env:0,body:0,buff:0},add=(n,v,g)=>{parts.push([n,v,g]);G[g]+=v;};
  if(SM?SM.xw:isXW(u)){add('仙武之體',T.xw,'body');if(u.kind==='disciple')add('仙武弟子',T.xwD,'body');}
  const cc=SM?SM.cave:caveCount();const cv=Math.min(T.caveMax,T.cave*cc);if(cv)add('洞府×'+cc,cv,'env');
  const sect=SM?true:v48Sect(u);if(sect){if(SM?SM.perks.includes('tq'):perkOn('tq'))add('天道酬勤',T.tq,'buff');if(SM?SM.perks.includes('xy'):perkOn('xy'))add('行善',T.xy,'buff');}
  if(SM||v49Sect(u)){const al=SM?SM.alch:v49Lv('alchemy');if(al)add('丹香 Lv'+al,T.alch*al,'env');}
  if(u.lwT&&u.lwT>S.time)add('領悟',T.lw,'buff');
  if(u.cbuf&&S.time<u.cbuf.t)add('丹藥',Math.min(TUNE.v57.cultBuffMax,u.cbuf.p||0),'buff');
  if(loc)for(const x of loc.src)add(x[0],x[1],'env');
  const E=v62Soft(1+G.env,T.grp.env[0],T.grp.env[1]),Bd=1+G.body,Bf=v62Soft(1+G.buff,T.grp.buff[0],T.grp.buff[1]);const hall=loc?loc.hall:1;
  const raw=E*Bd*Bf*hall,bonT=v62Soft(raw,T.top[0],T.top[1]);const tox=(sect&&(u.tox||0)>=0.5)?T.tox:1;
  const sum=G.env+G.body+G.buff;
  return {talent,rc,wu:0.6+(u.wu||0)/100,parts,G,E,Bd,Bf,sum,raw,bon:bonT/hall,bonT,capped:raw>T.top[0]||1+G.env>T.grp.env[0]||1+G.buff>T.grp.buff[0],hall,tox,mul:talent*bonT*tox};}
// 總加成的漸近上限（供聽道等外加加速封頂）
function v62MaxMul(u){const c=v62Cult(u,null);return c.talent*TUNE.v62.top[1]*c.tox;}
cultMul=function(u){if(!u)return 1;try{return v62Cult(u,null).mul;}catch(e){return 1;}};
function cultLoc(u,m,b){try{return v62Cult(u,v62Loc(u,m,b)).mul;}catch(e){return m*cultMul(u);}}
// 目前所在地點（供 UI）：室內打坐→該建築；野外打坐→task.mul
function v62Now(u){if(!u)return null;const med=u.task&&u.task.type==='meditate';if(u.kind==='player'&&S.interior){const b=bById(S.interior.bid);return med&&b?v62Cult(u,v62Loc(u,1.3,b)):v62Cult(u,null);}
  if(med&&!u.inside)return v62Cult(u,v62Loc(u,u.task.mul||1,null));return v62Cult(u,null);}
function v62Txt(u){const c=v62Now(u);if(!c)return '';const f=x=>x.toFixed(2).replace(/0$/,'');const src=c.parts.map(x=>`${x[0]}+${Math.round(x[1]*100)}%`).join('、');
  const gs=[['環境',c.E,'env'],['體質',c.Bd,'body'],['機緣',c.Bf,'buff']].filter(g=>g[1]>1.0001).map(g=>`${g[0]} ×${f(g[1])}（${c.parts.filter(x=>x[2]===g[2]).map(x=>`${x[0]}+${Math.round(x[1]*100)}%`).join('、')}）`).join('；');
  return `修煉速度 ×${f(c.mul)}（資質 ×${f(c.talent)}`+(gs?`；${gs}`:'')+(c.hall>1?`；大殿閉關 ×${f(c.hall)}`:'')+(c.capped?'；高處遞減':'')+(c.tox<1?`；丹毒 ×${c.tox}`:'')+'）';}
{const _rp=renderPanel;renderPanel=function(){_rp();try{const pn=document.getElementById('panel');if(!pn||selUnits.length!==1)return;const u=unitById(selUnits[0]);if(!u||(u.kind!=='player'&&u.kind!=='disciple'))return;
  const at=pn.querySelector('.v55pane[data-p="at"] .v55m');let el=pn.querySelector('#v62cr');if(!el){el=document.createElement('div');el.id='v62cr';el.className='sm';el.style.cssText='color:#ffe0a0;margin:2px 0';const q=pn.querySelector('#v61qr');if(q)q.before(el);else (at||pn).prepend(el);}
  const t=v62Txt(u);if(el.textContent!==t)el.textContent=t;el.title='資質（悟性×靈根）× 環境 × 體質 × 機緣 × 大殿閉關；同組相加、組間相乘，高處遞減（不是硬上限）';}catch(e){}};}
{const _u=updateUI;updateUI=function(){_u();try{const el=document.getElementById('v62cr');if(el&&selUnits.length===1){const t=v62Txt(unitById(selUnits[0]));if(t&&el.textContent!==t)el.textContent=t;}}catch(e){}};}
SYS_TXT.push(['修煉速度','資質 × 環境 × 體質 × 機緣 × 大殿閉關（同組相加、組間相乘、高處遞減）',()=>{const T=TUNE.v62,L=T.loc,P=x=>Math.round(x*100);return `<span class="tg">環境：房屋 +${P(L.house)}%（每級 +${P(L.houseLv)}%）、聚靈陣 +${P(L.jl)}%（每級 +${P(L.jlLv)}%）、練武閣 +${P(L.lianwu)}%、武道館 +${P(L.wudao)}%、洞府每座 +${P(T.cave)}%、丹香每級 +${P(T.alch)}%</span><span class="tg">體質：仙武之體 +${P(T.xw)}%</span><span class="tg">機緣：領悟 +${P(T.lw)}%、丹藥最多 +${P(TUNE.v57.cultBuffMax)}%（會累積丹毒）、天道酬勤 +${P(T.tq)}%</span><span class="tg">大殿閉關 ×${T.hall.join('／×')}（依大殿等級）</span><details class="dt"><summary>詳情</summary>資質＝悟性×靈根，照舊相乘。同一組的加成相加；三組再相乘。環境組超過 ×${T.grp.env[0]} 後遞減（最多約 ×${T.grp.env[1]}），機緣組超過 ×${T.grp.buff[0]} 後遞減（最多約 ×${T.grp.buff[1]}），全部加成（含閉關）超過 ×${T.top[0]} 後遞減（最多約 ×${T.top[1]}）。代價：閉關要離開工作、丹藥會累積丹毒（丹毒 ≥ 50 % 時修煉 ×${T.tox}）、建築要花資源升級。主要節奏由每層所需修為決定。角色面板「屬性」頁顯示目前倍率與來源。</details>`;}]);
// ======================= #160 頭頂靈氣條（淺藍、細）：在護盾條上方；主角與弟子 =======================
const V160C={qi:'#6fb6ff',dim:'#3d6f9e'};const V160={dy:0,n:0};
{const _lb=label;label=function(t,x,y,c,f){return _lb(t,x,y+(V160.dy||0),c,f);};}
{const _dh=drawHuman;drawHuman=function(u){const has=!!(u&&!u.dead&&u.qiMax>0&&(u.kind==='player'||u.kind==='disciple'));
  // v0.4.8：從修為條（-34）往上疊：護體 → 靈氣 → 氣血；名字跟著氣血條往上
  {const sh=!!(u&&!u.dead&&u.gqMax>0),art=typeof ART!=='undefined'&&ART.s&&ART.s!=='0',b0=art?-2:0;let y=-34+b0;if(sh){y-=4;HB48.g=y;}if(has){y-=3.4;HB48.q=y;}HB48.hp=(sh||has)?y-4.5:-38+b0;HB48.on=true;HB48.u=u;
  V160.dy=HB48.hp-(-38+b0);}try{_dh(u);}finally{V160.dy=0;HB48.on=false;}
  if(!has)return;try{const show=u.kind==='player'||selUnits.includes(u.id)||u.hp<u.maxhp||(u.qi||0)<u.qiMax*0.999;if(!show)return;
    const b=P(u.x,u.y),w=26,x=b.x-w/2,y=b.y+(HB48.u===u?HB48.q:-(u.gqMax>0?47.5:43)),k=clamp((u.qi||0)/u.qiMax,0,1);
    ctx.save();ctx.fillStyle='rgba(0,0,0,0.7)';ctx.fillRect(x-1,y-1,w+2,3.6);if(k>0){ctx.fillStyle=V160C.qi;ctx.fillRect(x,y,w*k,1.8);}ctx.strokeStyle='rgba(160,210,255,0.6)';ctx.lineWidth=0.6;ctx.strokeRect(x-0.5,y-0.5,w+1,2.8);ctx.restore();V160.n++;}catch(e){}};}
SYS_TXT.push(['靈氣條','頭頂淺藍細條＝靈氣（紫色＝護體罡氣）',()=>'<span class="tg" style="color:#6fb6ff">淺藍：靈氣</span><span class="tg" style="color:#b07cff">紫：護體罡氣</span><span class="tg">煉氣起才有靈氣</span>']);

// ======================= #157 受擊反應：技能命中→小跳＋擊退 0.3–0.6 格（不穿牆）；普攻只有退縮；受擊閃白 =======================
TUNE.v157={kbMin:0.3,kbMax:0.6,kbNorm:0,flinch:0.22,flash:0.12,hop:5};
const V157={sk:0,src:null,n:0,last:null};
function v157Kb(u,ox,oy,dist){if(!u||u.dead||v49Client())return 0;let dx=u.x-ox,dy=u.y-oy;let d=Math.hypot(dx,dy);if(d<1e-3){const a=rnd()*Math.PI*2;dx=Math.cos(a);dy=Math.sin(a);d=1;}dx/=d;dy/=d;
  const st=0.05;let moved=0;const r=typeof unitComp==='function'?0.2:0.2;for(let k=0;k<Math.ceil(dist/st);k++){const nx=u.x+dx*st,ny=u.y+dy*st;if(blockedP(nx,ny)||blockedP(nx+dx*r,ny+dy*r))break;u.x=nx;u.y=ny;moved+=st;}
  if(moved>0){u.path=[];u.vx=u.vy=0;if(u.task&&u.task.type==='move')u.needRepath=true;}return moved;}
// 標記技能傷害的區段
{const _x=v49BTickMarks;v49BTickMarks=function(dt){V157.sk++;try{return _x(dt);}finally{V157.sk--;}};}
{const _x=dgBoss;dgBoss=function(dt){V157.sk++;try{return _x(dt);}finally{V157.sk--;}};}
{const _du=dmgUnit;dmgUnit=function(src,u,amt){const hp0=u&&u.hp,sh0=u&&u.gq;const r=_du.apply(this,arguments);try{if(u&&(u.kind==='player'||u.kind==='disciple')&&amt>0&&src&&(ENEMY[src.type]||src.boss)){
    const skill=V157.sk>0;u.v157={t:performance.now(),sk:skill};V157.n++;
    if(!u.dead&&skill){const pw=clamp(amt/Math.max(1,u.maxhp)*4,0,1);const kb=TUNE.v157.kbMin+(TUNE.v157.kbMax-TUNE.v157.kbMin)*pw;const ox=src.x!=null?src.x:u.x-0.01,oy=src.y!=null?src.y:u.y;const mv=v157Kb(u,ox,oy,kb);V157.last={id:u.id,kb:+kb.toFixed(2),mv:+mv.toFixed(2),skill};u.v157kb=+mv.toFixed(2);}
    else if(!u.dead&&TUNE.v157.kbNorm>0)v157Kb(u,src.x,src.y,TUNE.v157.kbNorm);
    if(!skill)V157.last={id:u.id,kb:0,mv:0,skill:false};}}catch(e){}return r;};}
// 繪製：退縮小跳＋閃白（純視覺；聯機客戶端依氣血下降自行觸發）
{const _dh=drawHuman;drawHuman=function(u){if(!u||!(u.kind==='player'||u.kind==='disciple'))return _dh(u);const now=performance.now();
  if(u._v157hp!=null&&u.hp<u._v157hp-0.5&&!(u.v157&&now-u.v157.t<300))u.v157={t:now,sk:false};u._v157hp=u.hp;
  const F=u.v157,T=TUNE.v157;const a=F?(now-F.t)/1000:9;if(a>=T.flinch)return _dh(u);
  const ph=a/T.flinch,hop=Math.sin(ph*Math.PI)*T.hop*(F.sk?1.6:1);ctx.save();ctx.translate(0,-hop);_dh(u);ctx.restore();
  if(a<T.flash){const b=P(u.x,u.y);ctx.save();ctx.globalAlpha=0.55*(1-a/T.flash);ctx.fillStyle='#ffffff';ctx.beginPath();ctx.ellipse(b.x,b.y-14-hop,8,15,0,0,Math.PI*2);ctx.fill();ctx.restore();}};}
SYS_TXT.push(['受擊反應','被妖獸技能打中會被擊退 0.3～0.6 格',()=>`<span class="tg">技能命中：小跳＋擊退 ${TUNE.v157.kbMin}～${TUNE.v157.kbMax} 格</span><span class="tg">普通攻擊：只會退縮</span><span class="tg">受擊閃白</span><details class="dt"><summary>說明</summary>擊退距離依傷害占氣血的比例決定，撞到牆就停下。</details>`]);

// ======================= #156 仙凡之門：一般房宗師級、只有首領房是煉氣；首領房 5 倍大；進房封鎖 =======================
TUNE.v156={bw:34,bh:33,arenaKinds:{xf:1}};
const V156={n:0};
// 地圖：五間一般房排在上半部，首領大殿（34×33 ≈ 原本 15×15 的 5 倍面積）在下半部
{const _g=genDungeon;genDungeon=function(kind){if(kind!=='xf')return _g(kind);try{const bl=new Uint8Array(N*N).fill(1),fl=new Uint8Array(N*N);const rooms=[],cell=DG_CELL;
  const path=rnd()<0.5?[[0,0],[1,0],[2,0],[3,0],[3,1]]:[[3,0],[2,0],[1,0],[0,0],[0,1]];
  path.forEach(([cx,cy],k)=>{const [w,h]=dgRoomWH(false),x0=DGO+cx*cell+Math.floor((cell-w)/2),y0=DGO+cy*cell+Math.floor((cell-h)/2);rooms.push({x0,y0,w,h,cx:x0+w/2,cy:y0+h/2,boss:false,k,state:k===0?'clear':'idle'});});
  const T=TUNE.v156,bx0=DGO+Math.floor((4*cell-T.bw)/2),by0=DGO+2*cell+4;rooms.push({x0:bx0,y0:by0,w:T.bw,h:T.bh,cx:bx0+T.bw/2,cy:by0+T.bh/2,boss:true,k:path.length,state:'idle',arena:1});
  const carve=(i,j)=>{if(i<1||j<1||i>=N-1||j>=N-1)return;bl[j*N+i]=0;fl[j*N+i]=1;};
  for(const r of rooms)for(let j=r.y0;j<r.y0+r.h;j++)for(let i=r.x0;i<r.x0+r.w;i++)carve(i,j);
  for(let k=1;k<rooms.length;k++){const a=rooms[k-1],b=rooms[k];let x=Math.floor(a.cx),y=Math.floor(a.cy);const tx=Math.floor(b.cx),ty=Math.floor(b.cy);
    // t1078u / safety：NaN 或缺步長時 while(y!==ty) 會永不結束 → 有限檢查＋硬上限
    const _digOk=Number.isFinite(x)&&Number.isFinite(y)&&Number.isFinite(tx)&&Number.isFinite(ty);
    const _digCap=(typeof N==='number'?N:64)*2+16; let _digN=0;
    const _digY=()=>{while(_digOk&&y!==ty&&_digN++<_digCap){const dy=Math.sign(ty-y);if(!dy)break;carve(x-1,y);carve(x,y);carve(x+1,y);y+=dy;}};
    const _digX=()=>{while(_digOk&&x!==tx&&_digN++<_digCap){const dx=Math.sign(tx-x);if(!dx)break;carve(x,y-1);carve(x,y);carve(x,y+1);x+=dx;}};
    if(b.boss){_digY();_digX();} // v0.4.7：先往下再橫向接進大殿
    else{_digX();_digY();}carve(x-1,y);carve(x,y);carve(x+1,y);}
  for(const r of rooms)if(!r.boss&&r.k>0)for(let t=0,nt=Math.round(3*dgAreaK(r)*dgAreaK(r));t<nt;t++)if(rnd()<0.6){const i=r.x0+ri(2,r.w-3),j=r.y0+ri(2,r.h-3);if(Math.abs(i-r.cx)>1.5||Math.abs(j-r.cy)>1.5){bl[j*N+i]=1;fl[j*N+i]=2;}}
  // 首領大殿：幾根石柱當掩體
  const B=rooms[rooms.length-1];for(const [fx,fy] of [[0.25,0.3],[0.75,0.3],[0.25,0.72],[0.75,0.72]]){const i=Math.floor(B.x0+B.w*fx),j=Math.floor(B.y0+B.h*fy);bl[j*N+i]=1;fl[j*N+i]=2;}
  return {block:bl,fl,rooms,kind};}catch(e){console.warn(e);return _g(kind);}};}
// 一般房：怪物數值壓在宗師圓滿以內；首領（與首領房的小怪）維持煉氣
function v156Cap(){const L=v51Lad();let f=0;for(const x of L)if(x.r===3)f=Math.max(f,x.f);return f*TUNE.v51.mobRef*0.98;}
// 首領血量的人數加成：原本每多 1 人 +40%（30 人 ×12.6，再乘煉氣 ×2.9，約 6.7 萬血，大隊必敗）→ 改為每人 +bossPer
{const _x=dmgUnit;dmgUnit=function(src,u,amt){try{const D=S.dg;if(D&&D.kind==='xf'&&u){const h0=u.hp;const r=_x.apply(this,arguments);const k=(src&&src.type)||'?';V156.dmg=V156.dmg||{};V156.dmg[k]=(V156.dmg[k]||0)+Math.max(0,h0-u.hp);return r;}}catch(e){}return _x.apply(this,arguments);};}
// 首領機制（召喚數、預警圈目標數）用的隊伍人數上限：原本 31 人時每次召喚 14 隻、每輪 6 圈，大隊必被淹沒
TUNE.v156.mechParty=9;
{const _x=dgBoss;dgBoss=function(dt){const D=S.dg;if(!D||D.kind!=='xf'||TUNE.v156.mechParty==null)return _x(dt);const p0=D.party;if(p0>TUNE.v156.mechParty)D.party=TUNE.v156.mechParty;try{return _x(dt);}finally{if(S.dg===D)D.party=p0;}};}
{const _x=dmgEnemy;dmgEnemy=function(src,e,amt,col){try{const D=S.dg;if(D&&D.kind==='xf'&&e){const h0=e.hp;const r=_x.apply(this,arguments);const k='by_'+((src&&src.kind)||'?');V156.dmg=V156.dmg||{};V156.dmg[k]=(V156.dmg[k]||0)+Math.max(0,h0-e.hp);return r;}}catch(er){}return _x.apply(this,arguments);};}
TUNE.v156.bossPer=0.07;TUNE.v156.mobPer=0.08;TUNE.v156.dgCap=8;// 仙凡之門：大隊額外怪數上限（原本共用 dgCap 20，五間房 + 大殿合計上百隻）
TUNE.v156.bossAtk=0.4;TUNE.v156.bossAtkPer=0.02;// 首領攻擊：隊伍每多 1 人 ×(1−0.02)，最低 ×0.4（單人／小隊維持煉氣原值；30 人大隊一擊不再秒宗師）
{const _m=dgMob;dgMob=function(t,x,y,boss){const e=_m(t,x,y,boss);try{const D=S.dg;if(D&&D.kind==='xf'&&!boss&&TUNE.v156.mobPer!=null){const n=Math.max(1,D.party||1),k=(1+TUNE.v156.mobPer*(n-1))/(1+0.2*(n-1));e.maxhp=e.hp=Math.max(1,Math.round(e.maxhp*k));}
  if(D&&D.kind==='xf'&&boss&&TUNE.v156.bossPer!=null){const n=Math.max(1,D.party||1),k=(1+TUNE.v156.bossPer*(n-1))/(1+0.4*(n-1));e.maxhp=e.hp=Math.max(1,Math.round(e.maxhp*k));if(TUNE.v156.bossAtk!=null)e.atk=+(e.atk*Math.max(TUNE.v156.bossAtk,1-(TUNE.v156.bossAtkPer||0)*(n-1))).toFixed(1);}}catch(er){}return e;};}
{const _m=dgMob;dgMob=function(t,x,y,boss){const e=_m(t,x,y,boss);try{const D=S.dg;if(D&&D.kind==='xf'&&!boss){{
    const v=Math.sqrt(Math.max(1,e.maxhp)*Math.max(0.1,e.atk)),cap=v156Cap();if(v>cap){const k=cap/v;e.maxhp=Math.max(1,Math.round(e.maxhp*k));e.hp=Math.min(e.hp,e.maxhp);e.hp=e.maxhp;e.atk=+(e.atk*k).toFixed(1);}
    e.realm=Math.min(e.realm||3,3);e.v156=1;e.v51k=null;}}}catch(er){}return e;};}
// 進入首領房：全隊傳入、封住入口；首領倒下解除封鎖（傳送陣由原本流程生成）
function v156Ring(r){const out=[];for(let i=r.x0-1;i<=r.x0+r.w;i++)for(const j of [r.y0-1,r.y0+r.h])out.push(j*N+i);for(let j=r.y0;j<r.y0+r.h;j++)for(const i of [r.x0-1,r.x0+r.w])out.push(j*N+i);return out;}
function v156Lock(r){const D=S.dg;if(!D||D.lock||v49Client())return;const L=D.L,sv=[];
  // 傳送：只有這次副本裡的單位（S.units 在副本中就是這支隊伍）
  const us=S.units.filter(u=>!u.dead);us.forEach((u,k)=>{const a=k/Math.max(1,us.length)*Math.PI*2,rr=2+0.35*Math.floor(k/12);let f=(typeof xnLand==='function')?xnLand(r.cx+Math.cos(a)*rr,r.y0+r.h*0.7+Math.sin(a)*rr*0.5,u,{room:r,r:12}):null;if(!f)f=nearestFree(r.cx+Math.cos(a)*rr,r.y0+r.h*0.8+Math.sin(a)*rr*0.5,-1);if(!f||f.i<r.x0||f.i>=r.x0+r.w||f.j<r.y0||f.j>=r.y0+r.h)f=nearestFree(r.cx,r.y0+r.h-3,-1);
    if(f){u.x=f.i+0.5;u.y=f.j+0.5;}if(u===player()){const q=iso(u.x,u.y);cam.x=q.x;cam.y=q.y;cam.follow=true;}u.path=[];u.vx=u.vy=0;if(u.task&&u.task.type==='move')u.task=null;fx('ring',u.x,u.y,'#ffd34d');});
  for(const k of v156Ring(r)){if(L.fl[k]===1){sv.push([k,L.fl[k],block[k],L.block[k]]);L.fl[k]=2;block[k]=1;L.block[k]=1;}}
  nodeGrid.fill(null);computeComp();D.lock={sv,rid:r.k,t:S.time};V156.n++;
  try{v47Banner('v156',{txt:'封鎖！擊敗首領前無法離開',cls:'raid',ttl:3.5});}catch(e){}toast('封鎖！大殿的門被封住了——擊敗首領才能離開');}
function v156Unlock(){const D=S.dg;if(!D||!D.lock)return;const L=D.L;for(const [k,f,b,lb] of D.lock.sv){L.fl[k]=f;block[k]=b;L.block[k]=lb;}nodeGrid.fill(null);computeComp();D.lock=null;try{v47BannerOff('v156');}catch(e){}}
{const _x=dgSpawnRoom;dgSpawnRoom=function(r){const D=S.dg;if(!D||D.kind!=='xf'||TUNE.v156.dgCap==null)return _x(r);const c0=TUNE.v49.dgCap;TUNE.v49.dgCap=Math.min(c0,TUNE.v156.dgCap);try{return _x(r);}finally{TUNE.v49.dgCap=c0;}};}
{const _x=dgSpawnRoom;dgSpawnRoom=function(r){const D=S.dg;const lock=D&&TUNE.v156.arenaKinds[D.kind]&&r&&r.boss&&!D.lock;if(lock)v156Lock(r);return _x(r);};}
{const _x=dgBossDown;dgBossDown=function(e){const r=_x.apply(this,arguments);try{v156Unlock();const D=S.dg;if(D&&D.cleared&&!D.exitP){const br=D.L.rooms[D.L.rooms.length-1];D.exitP={x:br.cx,y:br.cy};D.xpAsk=0;}}catch(er){}return r;};}
{const _x=dgRetreat;dgRetreat=function(){if(S.dg&&S.dg.lock){toast('封鎖中：擊敗首領前無法撤離');return;}return _x();};}
{const _x=dgExit;dgExit=function(keep){const D=S.dg;if(D&&D.lock&&keep&&!D.cleared)return;if(D&&D.lock&&!keep){try{v156Unlock();}catch(e){}}return _x(keep);};}
SYS_TXT.push(['仙凡之門','一般房是宗師級，首領大殿是煉氣級；進殿後封鎖',()=>`<span class="tg">一般房：宗師級妖物</span><span class="tg">首領大殿：煉氣，面積約 5 倍</span><span class="tg">進殿：全隊傳入並封鎖</span><span class="tg">首領倒下：解除封鎖、出現傳送陣</span>`]);
// ======================= #159 首領出招間隔、預警；小怪較弱且境界較低、招式較少 =======================
// 舊：首領每招後 1.3 秒（狂暴 0.8）就能再出招；精英小怪用同一套招式與數值
TUNE.v159={bossGcd:[3,5],rageGcd:0.8,bossCd:1.6,bossWind:1.25,
  mobGcd:[6,9],mobCd:2.5,mobWind:1.3,mobDmg:0.6,mobLayers:3};
// 小怪招式：依強弱給 1～2 招（原本只有 4 種精英有招）
Object.assign(V49ELITE,{tiger:['charge'],chief:['cleave'],xfguard:['cleave'],golem:['slam'],boar:['charge'],wisp:['fan'],wolf:['cleave']});
const V159={log:[]};
function v159Rand(a){return a[0]+rnd()*(a[1]-a[0]);}
{const _x=v49BCast;v49BCast=function(e,k,tg){const D=S.dg,n0=D&&D.mech?D.mech.marks.length:0;const r=_x(e,k,tg);try{const T=TUNE.v159,B=e.v49b,boss=!!ENEMY[e.type].boss;
    const cm=boss?T.bossCd:T.mobCd,wm=boss?T.bossWind:T.mobWind;B.cd[k]=(B.cd[k]||0)*cm;if(B.cast)B.cast.t*=wm;
    if(D&&D.mech)for(let i=n0;i<D.mech.marks.length;i++){const m=D.mech.marks[i];if(m.bid!==e.id)continue;m.t*=wm;m.T=(m.T||m.t)*wm;if(!boss&&m.dmg)m.dmg*=T.mobDmg;}
    V159.log.push({id:e.id,boss,k,t:S.time,cd:+B.cd[k].toFixed(2),wind:B.cast?+B.cast.t.toFixed(2):0});if(V159.log.length>300)V159.log.shift();}catch(er){}return r;};}
{const _x=v49BResolve;v49BResolve=function(e,k){const r=_x(e,k);try{const T=TUNE.v159,B=e.v49b,boss=!!ENEMY[e.type].boss;if(B){B.nx=boss?v159Rand(T.bossGcd)*(B.rage?T.rageGcd:1):v159Rand(T.mobGcd);}}catch(er){}return r;};}
// 首次出招前也等一段時間（不會一照面就放招）
{const _x=v49BossAI;v49BossAI=function(e,dt){if(!e.v49b){const boss=!!ENEMY[e.type].boss;e.v49b={cd:{},nx:boss?2.5:v159Rand(TUNE.v159.mobGcd)*0.6,cast:null,rage:false,sm:0,st:{x:e.x,y:e.y,t:0},sk:0};}return _x(e,dt);};}
// 小怪境界：至少比首領低 mobLayers 個小境界（數值同步壓低，名牌跟著顯示）
function v159Idx(e){const o=v51Realm(e),L=v51Lad();return Math.max(0,L.findIndex(x=>x.r===o.r&&x.s===o.s));}
function v159Clamp(e,boss){if(!e||!boss||e===boss||ENEMY[e.type].boss)return false;const L=v51Lad(),bi=v159Idx(boss),lim=Math.max(0,bi-TUNE.v159.mobLayers);const ei=v159Idx(e);if(ei<=lim&&e.realm<=Math.max(0,(boss.realm||0)-(boss.v49lq?1:0)))return false;
  const v=Math.sqrt(Math.max(1,e.maxhp)*Math.max(0.1,e.atk))/TUNE.v51.mobRef,f=L[lim].f*0.995;if(v>f){const k=f/v;e.maxhp=Math.max(1,Math.round(e.maxhp*k));e.hp=Math.min(e.hp,e.maxhp);e.atk=+(e.atk*k).toFixed(1);}
  if(boss.v49lq&&e.realm>=boss.realm)e.realm=boss.realm-1;e.v51k=null;e.v159=1;return true;}
{const _m=dgMob;dgMob=function(t,x,y,isBoss){const e=_m(t,x,y,isBoss);try{const D=S.dg;if(!D)return e;const bo=D.boss!=null?enemyById(D.boss):null;
    if(isBoss){for(const o of S.enemies)if(o!==e)v159Clamp(o,e);}else if(bo)v159Clamp(e,bo);}catch(er){}return e;};}
SYS_TXT.push(['首領與小怪','首領每 3～5 秒一招、有預警；小怪招式少、較弱、境界較低',()=>`<span class="tg">首領：招間 ${TUNE.v159.bossGcd.join('～')} 秒</span><span class="tg">預警時間 ×${TUNE.v159.bossWind}</span><span class="tg">小怪：招間 ${TUNE.v159.mobGcd.join('～')} 秒、傷害 ×${TUNE.v159.mobDmg}</span><span class="tg">小怪至少低首領 ${TUNE.v159.mobLayers} 個小境界</span>`]);

// ======================= #161 樹木／岩石卡住單位：碰撞＝尋路格、卡在阻擋格內推出、卡住看門狗、生成時保證缺口 =======================
TUNE.v161={wdT:1.5,wdMove:0.3,nudgeAfter:2};const V161={pushOut:0,repath:0,nudge:0,opened:0};
// 1) 直線追擊的視線用單位半徑（舊 0.22 < 半徑 0.3 → 會對準兩棵斜角相鄰的樹之間的縫硬擠）— 見 g3 chase
// 2) 中心落在阻擋格內（生成、擊退、樹長回、建築落成）→ 推到最近空格
function v161Out(o){const i=Math.floor(o.x),j=Math.floor(o.y);if(!blockedT(i,j))return false;const f=nearestFree(i,j,-1);if(!f)return false;o.x=f.i+0.5;o.y=f.j+0.5;o.vx=o.vy=0;o.path=[];o.needRepath=true;V161.pushOut++;return true;}
// 3) 看門狗：有移動指令（有路徑、想移動）卻 1.5 秒沒前進 → 重新尋路；再卡 → 往路徑方向推到相鄰空格中心
function v161Wd(o,dt){if(!o.path||!o.path.length||Math.hypot(o.dvx||0,o.dvy||0)<0.2){o._wd=null;return;}
  const W=o._wd||(o._wd={x:o.x,y:o.y,t:0,n:0});W.t+=dt;if(W.t<TUNE.v161.wdT)return;
  const mv=dist(o.x,o.y,W.x,W.y);W.t=0;W.x=o.x;W.y=o.y;if(mv>=TUNE.v161.wdMove){W.n=0;return;}W.n++;
  const goal=o.path[o.path.length-1];
  if(W.n<TUNE.v161.nudgeAfter){V161.repath++;o.needRepath=true;o.repath=0;try{pathTo(o,goal.x,goal.y);}catch(e){}return;}
  // 推一把：往下一個路點方向挑一個可走的相鄰格（不切角）
  const wp=o.path[0],ci=Math.floor(o.x),cj=Math.floor(o.y);let best=null,bd=1e9;
  for(let d=0;d<8;d++){const ni=ci+DX[d],nj=cj+DY[d];if(blockedT(ni,nj))continue;if(DX[d]&&DY[d]&&(blockedT(ni,cj)||blockedT(ci,nj)))continue;const dd=dist(ni+0.5,nj+0.5,wp.x,wp.y);if(dd<bd){bd=dd;best=[ni,nj];}}
  if(!best&&!blockedT(ci,cj))best=[ci,cj];
  if(best){o.x=best[0]+0.5;o.y=best[1]+0.5;o.vx=o.vy=0;V161.nudge++;try{pathTo(o,goal.x,goal.y);}catch(e){}}W.n=0;}
{const _m=moveEntity;moveEntity=function(o,dt){_m(o,dt);if(v49Client()||o.inside||o.dead)return;try{if(!v161Out(o))v161Wd(o,dt);}catch(e){}};}
// 4) 生成：被樹／岩石圍死的小口袋 → 移除最少的資源點打通到主區域（0-1 BFS；水、崖不動）
function v161Open(){const NN=N*N,bl=new Uint8Array(NN),nd=new Int32Array(NN).fill(-1);
  for(let k=0;k<NN;k++){const t=terrain[k];bl[k]=(t===T.WATER||t===T.CLIFF)?2:0;}
  for(const n of NODES){if(n.gone)continue;const k=n.j*N+n.i;if(!bl[k]){bl[k]=1;nd[k]=n.id;}}
  const lab=()=>{const c=new Int32Array(NN);let L=0,big=0,bs=0;const sz=[0];const q=new Int32Array(NN);
    for(let s=0;s<NN;s++){if(bl[s]||c[s])continue;L++;let h=0,t=0,z=0;q[t++]=s;c[s]=L;while(h<t){const k=q[h++],x=k%N;z++;for(const nk of [x>0?k-1:-1,x<N-1?k+1:-1,k-N,k+N]){if(nk<0||nk>=NN||bl[nk]||c[nk])continue;c[nk]=L;q[t++]=nk;}}sz.push(z);if(z>bs){bs=z;big=L;}}return {c,big,sz};};
  let opened=0;const {c,big}=lab();if(!big)return 0;
  // 從主區域做 0-1 BFS（空格 0、資源點 1、水崖不可過），每個口袋沿最短樹打通
  const D=new Int32Array(NN).fill(1e9),pr=new Int32Array(NN).fill(-1);let cur=[];
  for(let k=0;k<NN;k++)if(c[k]===big){D[k]=0;cur.push(k);}
  for(let lv=0;lv<=60&&cur.length;lv++){const nxt=[];for(let h=0;h<cur.length;h++){const k=cur[h];if(D[k]!==lv)continue;const x=k%N;
      for(const nk of [x>0?k-1:-1,x<N-1?k+1:-1,k-N,k+N]){if(nk<0||nk>=NN||bl[nk]===2)continue;const w=bl[nk]===1?1:0,nd2=lv+w;if(nd2<D[nk]){D[nk]=nd2;pr[nk]=k;(w?nxt:cur).push(nk);}}}cur=nxt;}
  const done=new Uint8Array(NN);
  for(let k=0;k<NN;k++){const pc=c[k];if(!pc||pc===big||done[pc]||D[k]>=1e9)continue;done[pc]=1;
    for(let q=k;q>=0&&c[q]!==big;q=pr[q])if(bl[q]===1){const n=NODES[nd[q]];n.gone=true;n.amount=0;n.v161=1;bl[q]=0;opened++;try{chunkDirtyAt(n.i,n.j);}catch(e){}}}
  if(opened){chunkNodes=[];for(let c=0;c<NCH*NCH;c++)chunkNodes.push([]);for(const n of NODES)if(!n.gone)chunkNodes[((n.j/CS)|0)*NCH+((n.i/CS)|0)].push(n);}
  V161.opened=opened;return opened;}
function v161After(){try{if(!S||S.dg)return;if(v161Open()>0){rebuildBlock();if(typeof chunkDirtyAll==='function')chunkDirtyAll();}}catch(e){console.warn(e);}}
{const _n=newGame;newGame=function(...a){const r=_n(...a);v161After();return r;};const _a=applySave;applySave=function(...a){const r=_a(...a);v161After();return r;};}
SYS_TXT.push(['防卡位','單位卡在樹／岩石時自動脫困',()=>`<span class="tg">碰撞與尋路同格、不切角</span><span class="tg">卡 ${TUNE.v161.wdT} 秒→重新尋路，再卡→推到鄰格</span><span class="tg">生成時打通被圍死的口袋</span>`]);

// ======================= #158 技能列 Q W E R：四格、自動選目標、距離不夠先靠近；可點選／拖曳換技能；存檔；手機四顆圓鈕 =======================
const V158={pend:null,open:-1,cdMax:{},log:[],send:null,lp:null};
const V158IC={charge:'衝',sweep:'掃',fireball:'火',flysword:'劍',jindan:'威',sp:'法'};
V149_R.sp={max:5.5,los:0.05};
function v158Name(ab){return ab==='sp'?'靈根法術':(ABIL[ab]&&ABIL[ab].n)||ab;}
function v158Cost(ab){const T=TUNE.v49||{};return ab==='sp'?(T.spellCost||0):((T.abCost||{})[ab]||0);}
function v158Learned(p){const o=[];if(!p)return o;for(let r=1;r<=Math.min(p.realm||0,REALMS.length-1);r++){const a=REALMS[r]&&REALMS[r].ab;if(a&&a!=='guard'&&!o.includes(a))o.push(a);}if((p.realm||0)>=4&&p.lg)o.push('sp');return o;}
const V158N=10,V158K=['Q','E','R','T','1','2','3','4','5','6'];// #196：每個角色戰鬥最多帶 10 個技能：Q E R T＋數字 1～6
function v158Slots(){const F=S.flags||(S.flags={});let s=F.v158;if(!Array.isArray(s))s=F.v158=[];if(s.length>V158N){const ex=s.slice(V158N).filter(Boolean);s.length=V158N;for(const a of ex){const j=s.indexOf(null);if(j>=0&&!s.includes(a))s[j]=a;}}while(s.length<V158N)s.push(null);
  const L=v158Learned(player());for(let i=0;i<V158N;i++)if(s[i]&&!L.includes(s[i]))s[i]=null;// 失去的技能（換主角／讀檔）清掉
  if(!F.v158m)for(const a of L){if(s.includes(a))continue;const k=s.indexOf(null);if(k<0)break;s[k]=a;}// 未手動調整前：新學會的技能自動補空格
  return s;}
function v158Range(p,e,ab){const R=V149_R[ab];if(!R||!e)return true;const d=dist(p.x,p.y,e.x,e.y);if(ab==='sweep')return d<R.max;if(d>R.max||(R.min&&d<R.min))return false;return !R.los||los(p.x,p.y,e.x,e.y,R.los);}
// 目標：選取的敵人 → 滑鼠下的敵人 → 最近的敵人；技能彈（火球／飛劍／法術）沒目標時取游標方向最近的敵人
function v158Target(p,ab){let e=null;try{if(selOther&&selOther.k==='e')e=enemyById(selOther.id);}catch(er){}
  if(!e&&!isTouchUI&&mouse.inside!==false&&mouse.x>-900){try{e=enemyAt(screenToWorld(mouse.x,mouse.y));}catch(er){}}
  if(!e)e=nearestEnemy(p.x,p.y,12);
  if(!e&&(ab==='fireball'||ab==='flysword'||ab==='sp')&&!isTouchUI&&mouse.x>-900){try{const t=tileAtWorld(screenToWorld(mouse.x,mouse.y)),ux=t.x-p.x,uy=t.y-p.y,l=Math.hypot(ux,uy)||1;let bd=1e9;
      for(const q of S.enemies){if(q.dead)continue;const dx=q.x-p.x,dy=q.y-p.y,d=Math.hypot(dx,dy);if(d>12||d<0.01)continue;const c=(dx*ux+dy*uy)/(d*l);if(c<0.9)continue;if(d<bd){bd=d;e=q;}}}catch(er){}}
  return e&&!e.dead?e:null;}
// 只施放指定的技能：暫時把其他技能冷卻設滿再呼叫原本的 tryAbilities（同一套距離／靈氣／特效規則）
function v158Fire(p,e,ab){const keys=Object.keys(ABIL).concat(['sp']),sv={};for(const k of keys){if(k===ab)continue;sv[k]=p.acd[k];p.acd[k]=999;}
  const before=p.acd[ab]||0;let ok=false;try{ok=tryAbilities(p,e,true)&&(p.acd[ab]||0)>before;}finally{for(const k in sv){if(sv[k]===undefined)delete p.acd[k];else p.acd[k]=sv[k];}}
  if(ok){V158.cdMax[ab]=Math.max(V158.cdMax[ab]||0,p.acd[ab]);V158.log.push({ab,t:S.time,e:e&&e.id});if(V158.log.length>50)V158.log.shift();}return ok;}
function v158CastAb(p,ab,quiet){if(!p||p.dead)return 'dead';if(S.interior){if(!quiet)toast('室內不能施放技能');return 'in';}
  if(!v158Learned(p).includes(ab)){if(!quiet)toast('尚未學會這個技能');return 'nolearn';}
  const nm=v158Name(ab),cd=p.acd[ab]||0;if(cd>0.05){if(!quiet)toast(`${nm} 冷卻中 ${Math.ceil(cd)} 秒`);return 'cd';}
  const c=v158Cost(ab);if(p.qiMax>0&&c&&(p.qi||0)<c){if(!quiet)toast(`${nm}：靈氣不足 ${Math.floor(p.qi||0)}/${c}`);return 'qi';}
  const e=v158Target(p,ab);if(!e){if(!quiet)toast(`${nm}：附近沒有目標`);return 'notg';}
  if(v158Range(p,e,ab)){V158.pend=null;if(v158Fire(p,e,ab))return 'ok';const w=typeof v149Why==='function'?v149Why(p,e,ab):'';if(!quiet)toast(`技能：${nm} ${w||'無法施放'}`);return 'fail';}
  // 距離不合：走近（或衝鋒太近時退開）後自動施放
  V158.pend={ab,id:e.id,t:5};v158Go(p,e.x,e.y);if(!quiet)floater(p.x,p.y-0.6,'靠近施放：'+nm,'#9fe0ff');return 'approach';}
function v158Go(p,x,y){try{setTask(p,{type:'move',x,y,v158:1});pathTo(p,x,y);}catch(er){}}
function v158Tick(p,dt){const P=V158.pend;if(!P)return;P.t-=dt;const e=enemyById(P.id);if(!e||e.dead||P.t<=0||p.dead||S.interior){V158.pend=null;if(p.task&&p.task.v158)p.task=null;return;}
  if(p.task&&!p.task.v158&&p.task.type!=='move'){V158.pend=null;return;}// 玩家改下其他指令就取消
  if(v158Range(p,e,P.ab)){p.path=[];p.dvx=p.dvy=0;if(p.task&&p.task.v158)p.task=null;V158.pend=null;if(!v158Fire(p,e,P.ab))toast(`技能：${v158Name(P.ab)} 無法施放`);return;}
  const R=V149_R[P.ab]||{},d=dist(p.x,p.y,e.x,e.y);
  if(R.min&&d<R.min){const ux=(p.x-e.x)/(d||1),uy=(p.y-e.y)/(d||1);if(!p.path||!p.path.length)v158Go(p,p.x+ux*(R.min+0.6-d),p.y+uy*(R.min+0.6-d));}
  else if(!p.path||!p.path.length||(p._v158r=(p._v158r||0)-dt)<=0){p._v158r=0.4;v158Go(p,e.x,e.y);}}
// 按鍵／按鈕入口：連線客機把技能 id 轉給主機（由 net 層設定 V158.send）
function v158Key(i){const p=player();if(!p)return;const s=v158Slots(),ab=s[i];if(!ab){v158Pick(i);return;}
  if(typeof v49Client==='function'&&v49Client()){if(typeof V158.send==='function')V158.send({t:'castSkill',ab,slot:i});else v158NetCast(ab);v158Ui();return;}
  v158CastAb(p,ab,false);v158Ui();}
// 聯機客機：技能由主機以成員化身施放（本地化身的靈氣／冷卻不同步，在客機本地施放只會顯示錯誤原因、也打不到人）。
// g7（在 net*.js 之後執行）用 net 的通用轉送 netFwd 把這個函式註冊成 'v158Cast'；單機時就是直接施放。
function v158NetCast(ab){if(typeof ab!=='string'||!(ab in ABIL||ab==='sp'))return false;const p=player();if(!p)return false;return v158CastAb(p,ab,false);}
// ---- HUD ----
function v158El(){let el=document.getElementById('v158bar');if(el)return el;el=document.createElement('div');el.id='v158bar';el.className='ui';document.body.appendChild(el);
  const st=document.createElement('style');st.textContent=`#v158bar{position:fixed;left:50%;transform:translateX(-50%);bottom:calc(var(--sab,0px) + 70px);display:flex;gap:6px;z-index:7;font-size:var(--xwfs,13px)}
#v158bar .v158s{position:relative;width:54px;height:54px;border:1px solid #8a6a3a;border-radius:7px;background:#1a120bdd;color:#f3e3c0;cursor:pointer;padding:0;overflow:hidden;font:inherit}
#v158bar .v158s.dim{filter:grayscale(1) brightness(0.6)}#v158bar .v158s.emp{opacity:0.55;border-style:dashed}
#v158bar .v158s .k{position:absolute;left:3px;top:1px;font-size:11px;color:#ffd98a;font-weight:bold;z-index:4}#v158bar .v158s .ic{display:block;font-size:18px;line-height:22px;margin-top:14px}
#v158bar .v158s .nm{position:absolute;left:0;right:0;bottom:1px;font-size:10px;line-height:12px;white-space:nowrap;overflow:hidden;z-index:3;text-align:center;pointer-events:none;text-shadow:0 0 2px #000}#v158bar .v158s .qc{position:absolute;right:2px;top:1px;font-size:9px;color:#6fb6ff;z-index:4;background:rgba(26,18,11,.92);padding:0 3px;border-radius:3px;line-height:12px}
#v158bar .v158s .cd{position:absolute;inset:0;pointer-events:none;background:conic-gradient(rgba(0,0,0,0.65) calc(var(--p,0)*1turn),transparent 0)}
#v158bar .v158s .cs{position:absolute;left:8px;right:8px;top:13px;bottom:16px;display:flex;align-items:center;justify-content:center;font-size:12px;line-height:1;font-weight:bold;color:#fff;text-shadow:0 1px 2px #000;pointer-events:none;z-index:2;overflow:hidden}
body.touch #v158bar{left:auto;transform:none;flex-direction:column-reverse;gap:8px}
body.touch #v158bar .v158s{width:48px;height:48px;border-radius:50%}body.touch #v158bar .v158s .nm,body.touch #v158bar .v158s .k{display:none}body.touch #v158bar .v158s .ic{margin-top:6px;line-height:28px}
body.interior #v158bar{display:none}
#v158bar .v158s.v196n{width:46px;height:46px;align-self:flex-end}#v158bar .v158s.v196n .ic{font-size:17px;line-height:24px}
#v158pk{position:fixed;z-index:30;background:#1a120bf2;border:1px solid #c9a35a;border-radius:7px;padding:6px;display:flex;flex-direction:column;gap:4px;min-width:150px;font-size:var(--xwfs,13px)}
#v158pk button{text-align:left}`;document.head.appendChild(st);
  el.innerHTML=Array.from({length:V158N},(_,i)=>i).map(i=>`<button class="v158s" draggable="true" data-v158="${i}"><b class="k">${V158K[i]}</b><span class="ic"></span><span class="nm"></span><span class="qc"></span><i class="cd"></i><span class="cs"></span></button>`).join('');
  el.addEventListener('click',ev=>{const b=ev.target.closest('[data-v158]');if(!b)return;ev.stopPropagation();const i=+b.dataset.v158;if(isTouchUI){if(V158.lp&&V158.lp.done){V158.lp=null;return;}v158Key(i);}else v158Pick(i);});
  el.addEventListener('pointerdown',ev=>{const b=ev.target.closest('[data-v158]');if(!b||ev.pointerType==='mouse')return;const i=+b.dataset.v158;V158.lp={i,done:false,h:setTimeout(()=>{if(V158.lp){V158.lp.done=true;v158Pick(i);}},550)};});
  el.addEventListener('pointerup',()=>{if(V158.lp&&!V158.lp.done){clearTimeout(V158.lp.h);}});
  el.addEventListener('dragstart',ev=>{const b=ev.target.closest('[data-v158]');if(b)ev.dataTransfer.setData('text/plain','s:'+b.dataset.v158);});
  el.addEventListener('dragover',ev=>{if(ev.target.closest('[data-v158]'))ev.preventDefault();});
  el.addEventListener('drop',ev=>{const b=ev.target.closest('[data-v158]');if(!b)return;ev.preventDefault();v158Drop(+b.dataset.v158,ev.dataTransfer.getData('text/plain'));});
  return el;}
function v158Drop(i,d){const s=v158Slots();if(!d)return;const [k,v]=d.split(':');if(k==='s'){const j=+v;if(j>=0&&j<V158N&&j!==i){const t=s[i];s[i]=s[j];s[j]=t;}}else if(k==='a')v158Set(i,v);S.flags.v158m=1;v158Ui();}
function v158Set(i,ab){const s=v158Slots();if(ab){const j=s.indexOf(ab);if(j>=0&&j!==i)s[j]=s[i];}s[i]=ab||null;S.flags.v158m=1;v158ClosePick();v158Ui();}
function v158ClosePick(){const pk=document.getElementById('v158pk');if(pk)pk.remove();V158.open=-1;}
function v158Pick(i){v158ClosePick();const p=player(),L=v158Learned(p);V158.open=i;const pk=document.createElement('div');pk.id='v158pk';pk.className='ui';
  pk.innerHTML=`<b>${V158K[i]} 格：選擇技能</b>`+(L.length?L.map(a=>`<button class="btn" draggable="true" data-v158a="${a}">${V158IC[a]||'技'} ${v158Name(a)}　<span style="color:#6fb6ff">靈氣 ${v158Cost(a)}</span></button>`).join(''):'<span>尚未學會任何技能（突破境界後學會）</span>')+`<button class="btn" data-v158a="">清空此格</button>`;
  document.body.appendChild(pk);const r=document.querySelector(`#v158bar [data-v158="${i}"]`);const rc=r?r.getBoundingClientRect():{left:innerWidth/2,top:innerHeight-80};
  pk.style.left=Math.max(4,Math.min(innerWidth-pk.offsetWidth-4,rc.left))+'px';pk.style.top=Math.max(4,rc.top-pk.offsetHeight-6)+'px';
  pk.addEventListener('click',ev=>{const b=ev.target.closest('[data-v158a]');if(!b)return;ev.stopPropagation();v158Set(V158.open,b.dataset.v158a||null);});
  pk.addEventListener('dragstart',ev=>{const b=ev.target.closest('[data-v158a]');if(b&&b.dataset.v158a)ev.dataTransfer.setData('text/plain','a:'+b.dataset.v158a);});}
addEventListener('pointerdown',ev=>{if(V158.open>=0&&!ev.target.closest('#v158pk')&&!ev.target.closest('#v158bar'))v158ClosePick();},true);
addEventListener('keydown',ev=>{if(ev.code==='Escape'&&V158.open>=0){v158ClosePick();ev.stopImmediatePropagation();}},true);
function v158Ui(){if(typeof S==='undefined'||!S)return;const el=v158El(),p=player();const L=v158Learned(p);
  const show=!!(p&&L.length&&!titleOpen);el.style.display=show?'flex':'none';if(!show)return;const s=v158Slots();
  // #196：數字格只顯示已放技能的格子，再加一個「＋」空格（還有技能沒放上去時）；手機只顯示有技能的數字格
  const onBar=s.filter(Boolean).length,more=L.some(a=>!s.includes(a));let plus=false;
  for(let i=4;i<V158N;i++){const b=el.children[i];let v=!!s[i];if(!v&&!plus&&more&&!isTouchUI&&!s.slice(0,4).includes(null)){v=true;plus=true;}b.style.display=v?'':'none';b.classList.toggle('v196n',true);}
  for(let i=0;i<V158N;i++){const b=el.children[i],ab=s[i];const q=c=>b.querySelector(c);if(i>=4&&b.style.display==='none')continue;
    if(!ab){b.classList.add('emp');b.classList.remove('dim');q('.ic').textContent='＋';q('.ic').style.opacity='';q('.nm').textContent='空';q('.qc').textContent='';q('.cd').style.setProperty('--p',0);q('.cs').textContent='';b.title=`${V158K[i]}：點一下選擇技能`;continue;}
    b.classList.remove('emp');const cd=p.acd[ab]||0,mx=Math.max(V158.cdMax[ab]||0,ab==='sp'?cd:((ABIL[ab]&&ABIL[ab].cd)||cd),cd)||1,c=v158Cost(ab);
    q('.ic').textContent=V158IC[ab]||'技';q('.ic').style.opacity=cd>0.05?'0.25':'';q('.nm').textContent=v158Name(ab);q('.qc').textContent=c?c:'';q('.cd').style.setProperty('--p',cd>0?(cd/mx).toFixed(3):0);q('.cs').textContent=cd>0.05?Math.ceil(cd):'';
    b.classList.toggle('dim',p.qiMax>0&&c>0&&(p.qi||0)<c);b.title=`${V158K[i]}：${v158Name(ab)}（靈氣 ${c}）— 點一下換技能`;}
  // 位置：電腦＝畫面下方中央、建造列上方；手機＝右下按鈕群左邊一列
  try{if(isTouchUI){const a=document.getElementById('actions').getBoundingClientRect();el.style.right=(innerWidth-a.left+8)+'px';el.style.bottom=(innerHeight-a.bottom)+'px';el.style.left='auto';}
    else{const bb=document.getElementById('buildbar');const r=bb&&bb.offsetParent?bb.getBoundingClientRect():null;el.style.right='';el.style.left='50%';el.style.bottom=(r&&r.top<innerHeight?Math.max(70,innerHeight-r.top+8):70)+'px';}}catch(er){}}
{const _u=updateUI;updateUI=function(){_u.apply(this,arguments);try{v158Ui();}catch(e){}};}
SYS_TXT.push(['技能列','戰鬥最多帶 10 個技能：Q E R T＋數字 1～6；W A S D 移動、方向鍵平移鏡頭、V 互動、Z 打坐、Y 全選',()=>'<span class="tg">Q E R T：施放該格技能</span><span class="tg">1～6：技能 5～10 格（建造模式中，數字＝選建築）</span><span class="tg">隊伍：Alt＋1～4 選取、Ctrl＋1～4 編隊</span><span class="tg">目標：選取的敵人→滑鼠下→最近</span><span class="tg">距離不夠會先靠近再施放</span><span class="tg">點格子或拖曳換技能（存檔保留）</span><span class="tg">手機：右下四顆圓鈕，長按換技能</span>']);

SYS_TXT.push(['境界探查','高於自己的對手，境界可能看不透或看錯',()=>'<span class="tg">≤ 自身境界：看得清</span><span class="tg">同境界高層：看不清層數</span><span class="tg">高一個大境界以上：可能顯示「???」或偏低的境界</span><span class="tg">境界與悟性越高（神識）越準</span>']);
SYS_TXT.push(['宗門防衛','建築受襲或敵人入侵時，自動派最近能打的弟子迎敵',()=>`<span class="tg">戰力達威脅 ${TUNE.v164.ratio} 倍</span><span class="tg">優先：守衛→練武→閒置</span><span class="tg">不派重傷、閉關、工坊中、外出的弟子</span><span class="tg">最多出動 ${Math.round(TUNE.v164.capFrac*100)}%</span><span class="tg">退敵後回原工作</span>`]);
// ======================= #165 宗主寶座講道：坐上大殿寶座打坐 → 殿內聽道弟子修煉 max(宗主 1/3、自身 ×1.3) =======================
TUNE.v165={seat:[3.5,1.05],near:1.7};
const V165={log:[],send:null};
function v165Near(I){return I&&Math.hypot(I.x-TUNE.v165.seat[0],I.y-TUNE.v165.seat[1])<TUNE.v165.near;}
// 主機：嘗試讓 u 坐上 b 的寶座（一次只能一人）
function v165SitHost(u,b){if(!u||!b||b.type!=='hall'||v49Client())return 'no';const h=v165Holder(b);if(h&&h!==u)return 'taken';
  if(nearestEnemy(u.x,u.y,5))return 'enemy';b.v165=u.id;u.v165=b.id;setTask(u,{type:'meditate',throne:b.id});u.medit=true;V165.log.push({t:S.time,id:u.id,sit:1});return 'ok';}
function v165StandHost(u){if(!u)return;const b=u.v165!=null?bById(u.v165):null;if(b&&b.v165===u.id)b.v165=null;u.v165=null;if(u.task&&u.task.type==='meditate'&&u.task.throne)u.task=null;u.medit=false;}
function v165Sit(){const p=player(),I=S.interior;if(!p||!I)return false;const b=bById(I.bid);if(!b||b.type!=='hall')return false;
  if(p.v165===b.id){if(v49Client()&&V165.send)V165.send({t:'throne',sit:0});else v165StandHost(p);toast('起身離開寶座');return true;}
  if(v49Client()&&V165.send){const h=throneOccupant(b);if(h){toast('寶座上已有人');return false;}V165.send({t:'throne',sit:1,bid:b.id});I.tx=null;return true;}
  const r=v165SitHost(p,b);if(r==='taken'){toast('寶座上已有人');return false;}if(r==='enemy'){toast('附近有敵人，無法靜心講道');return false;}if(r!=='ok')return false;
  I.x=TUNE.v165.seat[0];I.y=TUNE.v165.seat[1];I.tx=null;I.moving=false;toast('👑 坐上寶座修煉：殿內聽道弟子同沾道韻');try{floater(p.x,p.y,'宗主講道','#ffe27a');}catch(e){}return true;}
// V：靠近寶座 → 坐上／起身；否則照舊（走向門口）
{const _ii=interiorInteract;interiorInteract=function(){const I=S.interior,p=player();try{const b=I&&bById(I.bid);if(b&&b.type==='hall'&&p&&(p.v165===b.id||v165Near(I))){v165Sit();return;}}catch(e){console.warn(e);}return _ii();};}
// 點擊寶座 → 走過去坐下
{const _it=interiorTap;interiorTap=function(mx,my){const I=S.interior;try{const b=I&&bById(I.bid);if(b&&b.type==='hall'){const wx=(mx-IT.ox)/IT.s,wy=(my-IT.oy)/IT.s,q=iso(3.5,0.95);if(Math.hypot(wx-q.x,wy-(q.y-18))<24){if(v165Near(I))v165Sit();else{I.tx=TUNE.v165.seat[0];I.ty=TUNE.v165.seat[1]+0.75;I.v165go=1;}return;}}}catch(e){console.warn(e);}I&&(I.v165go=0);return _it(mx,my);};}
// 室內玩家：坐著就固定在寶座；移動／不再打坐 → 起身；走到寶座前自動坐下
{const _up=updateInteriorPlayer;updateInteriorPlayer=function(p,dt){const I=S.interior,b=I&&bById(I.bid);const was=p&&b&&p.v165===b.id;_up(p,dt);if(!S.interior||!b||b.type!=='hall')return;
  if(was){if(!(p.task&&p.task.type==='meditate')||I.moving){if(v49Client()&&V165.send)V165.send({t:'throne',sit:0});else v165StandHost(p);p.v165=null;}else{I.x=TUNE.v165.seat[0];I.y=TUNE.v165.seat[1];I.face=1;}}
  else if(I.v165go&&I.tx==null&&v165Near(I)){I.v165go=0;v165Sit();}};}
// 離開室內 → 起身
{const _ex=exitInterior;exitInterior=function(s){const p=player();try{if(p&&p.v165!=null){if(v49Client()&&V165.send)V165.send({t:'throne',sit:0});else v165StandHost(p);p.v165=null;}}catch(e){}return _ex(s);};}
// 每秒校正：寶座主人失效 → 清除（主機）
{const _t=v50DefTick;v50DefTick=function(st){_t(st);if(v49Client())return;for(const b of S.buildings)if(b.type==='hall'&&b.v165!=null)v165Holder(b);};}
// 繪圖：寶座金光＋「宗主講道」；聽道弟子頭上 🎐
{const _dp=drawPerson;drawPerson=function(b,o,tt){if(b&&b.type==='hall'&&o.player&&o.u.v165===b.id){const q=P(o.x,o.y,6),br=0.5+0.5*Math.sin(tt*2);ctx.save();ctx.globalCompositeOperation='lighter';const g=ctx.createRadialGradient(q.x,q.y-14,3,q.x,q.y-14,34+br*8);g.addColorStop(0,'rgba(255,226,122,0.55)');g.addColorStop(1,'rgba(255,200,80,0)');ctx.fillStyle=g;ctx.beginPath();ctx.arc(q.x,q.y-14,42,0,Math.PI*2);ctx.fill();ctx.restore();V165.drawn=(V165.drawn||0)+1;}
  _dp(b,o,tt);
  try{if(b&&b.type==='hall'){if(o.player&&o.u.v165===b.id){const q=P(o.x,o.y,6);ctx.font='bold 11px sans-serif';ctx.textAlign='center';ctx.fillStyle='#ffe27a';ctx.fillText('👑 宗主講道',q.x,q.y-44-Math.sin(tt*2)*2);}
    else if(!o.player&&o.u.v165L&&S.time-o.u.v165L.t<2){const q=P(o.x,o.y,6);ctx.font='12px sans-serif';ctx.textAlign='center';ctx.fillText('🎐',q.x+10,q.y-34);V165.icons=(V165.icons||0)+1;}}}catch(e){}};}
function v165Txt(u){const L=u&&u.v165L;if(!L||S.time-L.t>2)return '';return `🎐 宗主講道：修煉速度 ×${L.r.toFixed(2)}（取宗主修煉速度 1/3 與自身 ×1.3 較高者${L.capped?'，已達加成上限':''}）`;}
{const _rp=renderPanel;renderPanel=function(){_rp();try{const pn=document.getElementById('panel');if(!pn||selUnits.length!==1)return;const u=unitById(selUnits[0]);if(!u||u.kind!=='disciple')return;const tx=v165Txt(u);let el=pn.querySelector('#v165l');
  if(!tx){if(el)el.remove();return;}const host=pn.querySelector('#v62cr');if(!host)return;if(!el){el=document.createElement('div');el.id='v165l';el.className='sm';el.style.cssText='color:#ffe27a;margin:2px 0';host.after(el);}el.textContent=tx;}catch(e){}};}
SYS_TXT.push(['寶座講道','在大殿內走到寶座按 V（或點寶座）坐上打坐，殿內聽道弟子修煉加速',()=>`<span class="tg">弟子修煉＝max(宗主 1/3、自身 ×1.3)</span><span class="tg">受總加成上限限制</span><span class="tg">移動或起身即結束</span><span class="tg">聯機：一次一人，主機判定</span>`]);
// ======================= #169 室內座位預約：一個蒲團／座位只坐一人，寶座保留給講道者
TUNE.v169={gap:0.8,maxSlot:40};
function v169Holder(b){if(!b||b.type!=='hall'||b.v165==null)return null;if(v49Client()){const u=unitById(b.v165);return u&&!u.dead?u:null;}return v165Holder(b);}
// 聯機鏡像用：誰坐在寶座上
function throneOccupant(b){b=b||v49HallB();const h=v169Holder(b);return h?{id:h.id,name:h.name,player:h.kind==='player',bid:b.id}:null;}
function v169Free(b,x,y,used){const R=ROOM[b.type].R;if(x<0.35||y<0.35||x>R-0.35||y>R-0.35)return false;
  for(const s of (ROOM_SOLID[b.type]||[]))if(Math.hypot(x-s[0],y-s[1])<s[2]+0.35)return false;
  if(b.type==='hall'&&Math.hypot(x-TUNE.v165.seat[0],y-TUNE.v165.seat[1])<TUNE.v169.gap)return false;
  for(const q of used)if(Math.hypot(x-q[0],y-q[1])<TUNE.v169.gap)return false;return true;}
function v169Floor(b,used,nx,ny){const R=ROOM[b.type].R;let best=null,bd=1e9;
  for(let j=0;j<R;j++)for(let i=0;i<R;i++){const x=i+0.5,y=j+0.5;if(y>R-1&&Math.abs(x-R/2)<1)continue;if(!v169Free(b,x,y,used))continue;const d=Math.hypot(x-nx,y-ny);if(d<bd){bd=d;best=[x,y];}}return best;}
// 座位表：寶座 → 玩家（打坐中）→ 弟子；回傳 Map(unitId → [x,y,(tx,ty)] 加 .kind)
function v169Seats(b){const map=new Map();if(!b||!ROOM[b.type])return map;const used=[],slots=[];
  for(let k=0;k<TUNE.v169.maxSlot;k++){const s=roomSt(b,k);if(!s)break;slots.push(s);}
  const taken=new Array(slots.length).fill(false);
  const take=(u,pref,nx,ny)=>{let k=-1;if(pref!=null&&pref<slots.length&&!taken[pref]&&v169Free(b,slots[pref][0],slots[pref][1],used))k=pref;
    if(k<0){let bd=1e9;for(let i=0;i<slots.length;i++){if(taken[i]||!v169Free(b,slots[i][0],slots[i][1],used))continue;const d=nx==null?i:Math.hypot(slots[i][0]-nx,slots[i][1]-ny);if(d<bd){bd=d;k=i;}}}
    let r;if(k>=0){taken[k]=true;r=slots[k].slice();r.kind='slot';r.slot=k;}else{const f=v169Floor(b,used,nx==null?ROOM[b.type].R/2:nx,ny==null?ROOM[b.type].R-1.5:ny);if(!f)return null;r=f;r.kind='floor';}
    used.push([r[0],r[1]]);map.set(u.id,r);return r;};
  const h=v169Holder(b);if(h){const r=TUNE.v165.seat.slice();r.kind='throne';map.set(h.id,r);}
  const p=player(),I=S.interior;if(p&&I&&I.bid===b.id&&p.medit&&!map.has(p.id))take(p,I.v169s,I.x,I.y);
  occupants(b).forEach((u,k)=>{if(!map.has(u.id))take(u,k,null,null);});
  return map;}
// 玩家在室內打坐（且不在寶座）→ 吸附到自己預約的蒲團／空地
function v169SnapPlayer(p,b){const I=S.interior;if(!p||!I||!b||I.moving||!p.medit||p.v165===b.id)return;const r=v169Seats(b).get(p.id);if(!r)return;
  if(r.kind==='slot')I.v169s=r.slot;else I.v169s=null;if(Math.hypot(I.x-r[0],I.y-r[1])>0.01){I.x=r[0];I.y=r[1];I.tx=null;}}
{const _up=updateInteriorPlayer;updateInteriorPlayer=function(p,dt){_up(p,dt);try{const I=S.interior,b=I&&bById(I.bid);if(!b)return;if(!p.medit){I.v169s=null;return;}v169SnapPlayer(p,b);}catch(e){console.warn(e);}};}
SYS_TXT.push(['室內座位','打坐、閉關、聽道時一人一個蒲團／座位，不會疊在一起',()=>`<span class="tg">蒲團坐滿 → 最近的空地</span><span class="tg">寶座只留給講道者</span><span class="tg">聯機：throneOccupant() 鏡像寶座</span>`]);

// ======================= #170 弟子自主突破：到試煉建築閉關衝關，不再等宗主點
TUNE.v170={bld:['wudao','lianwu','library','xianyuan','juling','alchemy'],bLv:[0.05,0.08,0.12,0.15],coach:0.05,coachR:0.02,cap:0.70,dur:20,
  thr:{謹慎:0.8,沉穩:0.7,溫和:0.65,孤僻:0.6,熱心:0.55,倔強:0.5,好動:0.42,豪爽:0.38},thrDef:0.6,patience:0.06,minThr:0.25,cd:120,hpMin:0.7,noteGap:6,foeR:6};
UNIT_KEEP.push('v170Hold','v170Coach','noDaolv');
const V170={t:0,log:[],last:-99,n:0,ok:0,fail:0,mute:null};
function v170Bld(u){const ty=TUNE.v170.bld[u.realm];let best=null,bd=1e9;for(const b of S.buildings){if(b.type!==ty||!b.built||b.broken)continue;const d=dist(u.x,u.y,b.i+1,b.j+1);if(d<bd){bd=d;best=b;}}return best;}
function v170BBonus(b){if(!b)return 0;const L=TUNE.v170.bLv;return L[Math.min(L.length,blv(b))-1]||0;}
function v170CBonus(c,u){return c?TUNE.v170.coach+TUNE.v170.coachR*Math.max(0,c.realm-u.realm-1):0;}
// 失敗率：建築／護法加成（同一上限內）；成功率上限 TUNE.v170.cap
{const _bf=breakFail;breakFail=function(u){let f=_bf(u);if(!u||u._nd)return f;if(u._v170b)f-=u._v170b;return Math.max(1-TUNE.v170.cap,f);};}
function v170Succ(u,b,c){const sv=u._v170b;u._v170b=v170BBonus(b)+v170CBonus(c,u);let f;try{f=breakFail(u);}finally{u._v170b=sv;}return 1-f;}
function v170Ready(u){if(!u||u.dead||u.kind!=='disciple'||u.brkLock||u.realm>=MAX_REALM||capped(u))return false;const c=breakConds(u);return !!(c&&c.ok);}
function v170Busy(u){if(u.dead||u.retreat||u.inj||u.away||u.mission||u.expd||u.dgIn||u.dual)return true;if(u.job==='follow'||u.job==='dual')return true;
  if(u.hp<u.maxhp*TUNE.v170.hpMin)return true;if(u.task&&(u.task.type==='attack'||u.task.type==='seclude'||u.task.type==='enter'))return true;
  if(!u.inside&&nearestEnemy(u.x,u.y,TUNE.v170.foeR))return true;return false;}
function v170Thr(u,V){const T=TUNE.v170;const base=T.thr[u.person]!=null?T.thr[u.person]:T.thrDef;const days=Math.max(0,(S.time-(V.t||S.time))/(TUNE.dayLen||300));return Math.max(T.minThr,base-T.patience*days);}
function v170Coach(u){let best=null,bd=1e9;for(const c of S.units){if(c===u||(c.kind!=='disciple'||c.np)||!c.v170Coach||c.dead||c.realm<=u.realm||c.v170||v170Busy(c)||c.inside)continue;const d=dist(c.x,c.y,u.x,u.y);if(d<bd){bd=d;best=c;}}return best;}
function v170Note(msg){V170.log.push({t:S.time,m:msg});if(V170.log.length>40)V170.log.shift();const now=performance.now()/1000;if(now-V170.last<TUNE.v170.noteGap){V170.q=(V170.q||0)+1;return;}V170.last=now;const extra=V170.q?`（另有 ${V170.q} 則突破消息，見弟子面板）`:'';V170.q=0;toast(msg+extra);}
function v170Start(u,V){const b=v170Bld(u);const c=v170Coach(u);if(u.inside)exitBuilding(u);u.task=null;u.path=[];u.medit=false;
  V.st='go';V.bid=b?b.id:null;V.coach=c?c.id:null;V.go=S.time;if(c){if(c.inside)exitBuilding(c);c.task=null;c.path=[];c.v170={st:'go',bid:V.bid,coachOf:u.id,go:S.time};}
  if(!b){V.st='in';V.t0=S.time;}}
function v170Abort(u,why){const V=u.v170;if(!V)return;if(V.coach){const c=unitById(V.coach);if(c&&c.v170&&c.v170.coachOf===u.id){if(c.inside)exitBuilding(c);c.v170=null;}}
  if(u.inside&&V.st==='in')exitBuilding(u);u.v170={st:'wait',t:V.t||S.time,cd:S.time+TUNE.v170.cd};if(why)V170.log.push({t:S.time,m:`${nm(u)}${why}`});}
function v170Resolve(u){const V=u.v170,b=V.bid!=null?bById(V.bid):null,c=V.coach!=null?unitById(V.coach):null;const cOk=c&&c.v170&&c.v170.coachOf===u.id&&c.v170.st==='in';
  const r0=u.realm;u._v170b=v170BBonus(b)+v170CBonus(cOk?c:null,u);const succ=Math.round((1-breakFail(u))*100);let ok=false;V170.mute=[];
  try{ok=tryBreak(u,true);}catch(e){console.warn(e);}finally{u._v170b=0;V170.mute=null;}
  const where=b?BUILD[b.type].name:'原地';V170.n++;
  if(ok&&u.realm>r0){V170.ok++;v170Note(`✨ ${nm(u)}在${where}閉關，突破「${REALMS[u.realm].n}」成功（成功率 ${succ}%${cOk?'，'+nm(c)+'護法':''}）`);}
  else{V170.fail++;v170Note(`💥 ${nm(u)}在${where}衝擊「${REALMS[r0+1].n}」失敗（成功率 ${succ}%）${u.brkLock?'，道基受損':''}`);}
  if(c&&c.v170&&c.v170.coachOf===u.id){if(c.inside)exitBuilding(c);c.v170=null;}
  if(u.inside)exitBuilding(u);u.v170=ok&&u.realm>r0?null:{st:'wait',t:S.time,cd:S.time+TUNE.v170.cd};u.task=null;}
// 每秒：決定要不要去衝關（主機）
function v170Tick(dt){V170.t+=dt;if(V170.t<1)return;V170.t=0;if(!S||S.dg||v49Client()||S.flags.v170off)return;
  for(const u of S.units){if((u.kind!=='disciple'||u.np)||u.dead)continue;const V=u.v170;
    if(V&&V.coachOf!=null){const m=unitById(V.coachOf);if(!m||!m.v170||m.v170.coach!==u.id||m.v170.st==='wait'){if(u.inside)exitBuilding(u);u.v170=null;}continue;}
    if(V&&(V.st==='go'||V.st==='in')){if(!v170Ready(u)){v170Abort(u,'條件改變，暫緩突破');continue;}if(V.st==='go'&&(u.task&&u.task.type==='attack'||u.retreat||u.hp<u.maxhp*0.4)){v170Abort(u,'途中遇敵，暫緩突破');}continue;}
    if(u.v170Hold||!v170Ready(u)){if(V&&!v170Ready(u))u.v170=null;continue;}
    const W=V||(u.v170={st:'wait',t:S.time});if(W.cd&&S.time<W.cd&&!W.urge)continue;if(v170Busy(u))continue;
    const b=v170Bld(u),succ=v170Succ(u,b,v170Coach(u));W.est=succ;W.thr=v170Thr(u,W);
    if(W.urge||succ>=W.thr)v170Start(u,W);}}
// 逐幀：走到試煉建築 → 入內 → 計時衝關
function v170Step(u,dt){const V=u.v170;if(u.task&&u.task.type==='attack')return false;const b=V.bid!=null?bById(V.bid):null;
  if(V.st==='go'){if(V.bid!=null&&(!b||!b.built||b.broken)){if(V.coachOf!=null){u.v170=null;return false;}v170Abort(u,'試煉建築損毀');return false;}
    if(!b){V.st='in';V.t0=S.time;return true;}const D=doorPt(b);const r=walkTo(u,dt,D.x,D.y,1.0);
    if(r===null||S.time-V.go>90){if(V.coachOf!=null){u.v170=null;return false;}V.bid=null;V.st='in';V.t0=S.time;return true;}// 走不到 → 原地衝關（無建築加成）
    if(r){if(canEnter(b))enterBuildingUnit(u,b);else{u.dvx=u.dvy=0;}V.st='in';V.t0=S.time;if(V.coachOf==null)V170.log.push({t:S.time,m:`${nm(u)}進入${BUILD[b.type].name}閉關衝關`});}return true;}
  if(V.st==='in'){u.dvx=u.dvy=0;u.working=true;u.medit=true;if(V.coachOf!=null)return true;if(S.time-V.t0>=TUNE.v170.dur)v170Resolve(u);return true;}
  return false;}
{const _ud=updateDisciple;updateDisciple=function(u,dt){const V=u&&u.v170;if(V&&!u.dead&&(V.st==='go'||V.st==='in')&&!v49Client()){try{if(v170Step(u,dt))return;}catch(e){console.warn(e);u.v170=null;}}return _ud(u,dt);};}
{const _to=toast;toast=function(m){if(V170.mute){V170.mute.push(m);return;}return _to.apply(this,arguments);};}
{const _tk=tickV045;tickV045=function(dt){_tk(dt);try{v170Tick(dt);}catch(e){console.warn(e);}};}
// 面板：自主／保留、催促突破、護法教官
function v170Status(u){const V=u.v170;if(u.v170Hold)return '保留：等宗主下令（可按「催促突破」或原本的突破鈕）';if(!V){return v170Ready(u)?'條件已齊，正在評估時機':'';}
  if(V.coachOf!=null){const m=unitById(V.coachOf);return `🛡 為 ${m?nm(m):'同門'} 護法中`;}
  const b=V.bid!=null?bById(V.bid):null;if(V.st==='go')return `🚶 前往${b?BUILD[b.type].name:'閉關處'}衝關`;if(V.st==='in')return `🧘 閉關衝關中（${Math.max(0,Math.ceil(TUNE.v170.dur-(S.time-V.t0)))} 秒）`;
  if(V.cd&&S.time<V.cd)return `調息中，${Math.ceil(V.cd-S.time)} 秒後再評估`;if(V.est!=null)return `等待更好時機：預估成功率 ${Math.round(V.est*100)}%／心中門檻 ${Math.round(V.thr*100)}%（${u.person}）`;return '';}
{const _rp=renderPanel;renderPanel=function(){_rp();try{const pn=document.getElementById('panel');if(!pn||selUnits.length!==1)return;const u=unitById(selUnits[0]);if(!u||u.kind!=='disciple')return;let el=pn.querySelector('#v170p');
  if(!el){el=document.createElement('div');el.id='v170p';el.className='sm';el.style.cssText='margin:4px 0;padding:4px 6px;border:1px solid #6a5a30;border-radius:6px';const host=pn.querySelector('#v62cr')||pn.querySelector('.v47b');if(host)host.after(el);else pn.appendChild(el);}
  const st=v170Status(u),key=[u.id,!!u.v170Hold,!!u.v170Coach,!!u.noDaolv,st].join('|');if(el.dataset.k===key)return;el.dataset.k=key;
  el.innerHTML=`<div><b>突破</b> <button class="btn sm${u.v170Hold?'':' on'}" data-v170="hold" data-u="${u.id}">${u.v170Hold?'⏸ 保留':'🤖 自主'}</button> <button class="btn sm" data-v170="urge" data-u="${u.id}">催促突破</button> <button class="btn sm${u.v170Coach?' on':''}" data-v170="coach" data-u="${u.id}" title="境界較高的弟子可陪同閉關，提高同門突破成功率">${u.v170Coach?'✔ ':''}護法教官</button> <button class="btn sm${u.noDaolv?' on':''}" data-v170="nodl" data-u="${u.id}" title="禁止此弟子自行結為道侶（已有道侶可在關係分頁解除）">${u.noDaolv?'🚫 禁止結緣':'💞 允許結緣'}</button></div>${st?`<div class="dim">${st}</div>`:''}`;}catch(e){}};}
function v170Click(ev){const t=ev.target.closest&&ev.target.closest('[data-v170]');if(!t)return;ev.stopPropagation();const u=unitById(+t.dataset.u);if(!u)return;const a=t.dataset.v170;
  if(a==='hold'){u.v170Hold=!u.v170Hold;if(u.v170Hold&&u.v170&&u.v170.st!=='in')v170Abort(u);if(u.v170Hold)u.v170=null;toast(u.v170Hold?`${nm(u)}：突破改為保留，等你下令`:`${nm(u)}：自主判斷突破時機`);}
  else if(a==='urge'){if(!v170Ready(u)){toast(`${nm(u)}尚未滿足突破條件`);return;}if(u.v170&&u.v170.st!=='wait'){toast(`${nm(u)}已在衝關路上`);return;}u.v170Hold=false;u.v170={st:'wait',t:S.time,urge:1};toast(`催促${nm(u)}即刻閉關衝關`);}
  else if(a==='coach'){u.v170Coach=!u.v170Coach;}
  else if(a==='nodl'){u.noDaolv=!u.noDaolv;toast(u.noDaolv?`${nm(u)}：禁止自行結緣`:`${nm(u)}：允許自行結緣`);}
  const el=document.getElementById('v170p');if(el)el.dataset.k='';}
document.addEventListener('click',v170Click,true);
SYS_TXT.push(['自主突破','修為圓滿、條件齊備的弟子會依性格自己挑時機，走到試煉建築閉關衝關',()=>`<span class="tg">武師→武道館、大武師→練武閣、宗師→長書閣、煉氣→仙緣閣、築基→聚靈陣、金丹→煉丹房</span><span class="tg">建築 Lv1/2/3 成功率 +${TUNE.v170.bLv.slice(0,3).map(x=>Math.round(x*100)).join('/')}%</span><span class="tg">護法教官 +${Math.round(TUNE.v170.coach*100)}%</span><span class="tg">成功率上限 ${Math.round(TUNE.v170.cap*100)}%</span><span class="tg">謹慎者等高成功率、豪爽者早早衝關</span><span class="tg">受傷、戰鬥、外出時不衝關</span><span class="tg">面板可切換自主／保留、催促突破</span>`]);

// ======================= #171 總倉：宗門全部庫存一覽；弟子自行領取裝備／丹藥；倉庫可入內
// 文字集中（日後在地化）
const TXT171={name:'總倉',s:'宗門全部庫存一覽：裝備、丹藥、材料、資源',d:'宗門的中央庫存。弟子會依自身需要（空欄位、較弱裝備、推薦兵器、境界）自行來領裝備，換下的放回總倉；受傷或衝關前會領丹藥。標記「保留」的物品不會被領走。資源上限仍由各「倉庫」提高。',
  one:'總倉只能建一座',take:(u,t)=>`📦 ${u}從總倉取走${t}`,ret:(t)=>`（放回${t}）`,more:n=>`（另有 ${n} 則領取紀錄）`,
  rsv:'保留',free:'可領',gear:'裝備',pill:'丹藥',mat:'材料',res:'資源',none:'（空）',hint:'標記「保留」的物品弟子不會領取；你身上的裝備本來就不在庫存裡。',pillRsv:'整類保留',it:{miji:'武學秘籍',gongfa:'功法',xfl:'仙凡令'}};
TUNE.v171={cd:300,tick:2,maxTake:2,gain:1.15,el:0.2,fit:[0.25,0.1],hpPill:0.5,stay:3,noteGap:6,tpPill:true};
BUILD.zongcang={name:TXT171.name,size:2,cost:{wood:30,stone:15},time:10,pop:0,hp:400,desc:TXT171.s+'。'+TXT171.d};
BDESC.zongcang={s:TXT171.s,t:b=>[`裝備 ${S.inv.length} 件`,'弟子自行領取所需'],d:TXT171.d};
BUILD_ORDER.push('zongcang');
B49.zongcang={n:'物盡其用',f:lv=>`弟子領取冷卻 -${10*lv}%`};
// 室內：倉庫、總倉
ROOM.cangku={R:5,fl:['#8a7a60','#7f7058'],wl:['#6a4a2a','#7a5634'],trim:'#3a2410',st:[]};
ROOM.zongcang={R:5,fl:['#8f8068','#85765e'],wl:['#5a3a20','#6a4628'],trim:'#2a1a0a',st:[]};
ROOM_SOLID.cangku=[[1.0,0.3,0.4],[2.5,0.3,0.4],[4.0,0.3,0.4],[0.3,2.0,0.4],[3.6,3.2,0.4]];
ROOM_SOLID.zongcang=[[1.0,0.3,0.4],[2.5,0.3,0.4],[4.0,0.3,0.4],[0.3,2.0,0.4],[0.3,3.4,0.4],[3.0,2.6,0.4]];
DOOR_I.cangku=1;DOOR_I.zongcang=1;
{const _rf=roomFurniture;roomFurniture=function(b){if(b&&(b.type==='cangku'||b.type==='zongcang')){const f=[['shelf',1.0,0.3],['shelf',2.5,0.3],['shelf',4.0,0.3],['shelfL',0.3,2.0]];if(b.type==='zongcang')f.push(['shelfL',0.3,3.4],['desk',3.0,2.6]);else f.push(['table',3.6,3.2]);return f;}return _rf(b);};}
{const _bl=buildLock;buildLock=function(type){if(type==='zongcang'&&hasAny('zongcang'))return TXT171.one;return _bl(type);};}
const V171={t:0,log:[],last:-99,q:0,n:0};
function v171B(){let best=null;for(const b of S.buildings)if(b.type==='zongcang'&&b.built&&!b.broken){best=b;break;}return best;}
function v171Cd(){const b=v171B();return TUNE.v171.cd*(1-0.1*Math.min(3,b?blv(b)-1:0));}
function v171Sc(u,it){let sc=itemScore(it);if(it.el>=0&&u.lg&&it.el===u.lg.e)sc*=1+TUNE.v171.el;if(it.slot==='w'){const W=weaponFit(u);if(it.t===W.best)sc*=1+TUNE.v171.fit[0];else if(it.t===W.second)sc*=1+TUNE.v171.fit[1];}return sc;}
function v171PillOk(k){const a=S.pills[k];return !!(a&&(a[0]+a[1]+a[2])>0&&!(S.flags.v171pr&&S.flags.v171pr[k]));}
// 想要什麼：每欄最好的可領裝備（未保留、未被他人預約、穿得上、明顯更好）
function v171Want(u,claimOk){const out=[];u.eq=u.eq||{};const used=new Set();
  for(const s of ['w','a','c1','c2','f']){const t=s[0]==='c'?'c':s,cur=u.eq[s];const cs=cur?v171Sc(u,cur):0;let best=null,bs=cur?cs*TUNE.v171.gain:0;
    for(const it of S.inv){if(it.slot!==t||it.rsv||used.has(it.id)||canWear(u,it,s))continue;if(it._v171c!=null&&it._v171c!==u.id)continue;const sc=v171Sc(u,it);if(sc>bs+1e-6){bs=sc;best=it;}}
    if(best){used.add(best.id);out.push({s,it:best,gain:bs-cs});}}
  out.sort((a,b)=>b.gain-a.gain);return out.slice(0,TUNE.v171.maxTake);}
function v171NeedPill(u){return u.hp<u.maxhp*TUNE.v171.hpPill&&v171PillOk('hx');}
function v171Gear(u){let g=0;const e=u.eq||{};for(const k in e)if(e[k])g+=itemScore(e[k]);return g/(1+u.realm);}
function v171Clear(u){for(const it of S.inv)if(it._v171c===u.id)delete it._v171c;}
function v171Note(m){V171.log.push({t:S.time,m});if(V171.log.length>40)V171.log.shift();const now=performance.now()/1000;if(now-V171.last<TUNE.v171.noteGap){V171.q++;return;}V171.last=now;const ex=V171.q?TXT171.more(V171.q):'';V171.q=0;toast(m+ex);}
function v171Busy(u){if(u.dead||u.retreat||u.away||u.mission||u.expd||u.dgIn||u.v170||u.task)return true;if(u.job==='follow'||u.job==='dual')return true;const ij=u.inj&&u.inj.k;if(ij==='heavy'||ij==='meridian')return true;if(u.hp<u.maxhp*0.15)return true;if(!u.inside&&nearestEnemy(u.x,u.y,TUNE.v170.foeR))return true;return false;}
function v171Tick(dt){V171.t+=dt;if(V171.t<TUNE.v171.tick)return;V171.t=0;if(!S||S.dg||v49Client())return;const b=v171B();
  for(const it of S.inv)if(it._v171c!=null){const o=unitById(it._v171c);if(!o||!o.v171)delete it._v171c;}
  if(!b)return;const cd=v171Cd();let pick=null,pw=null;
  for(const u of S.units){if((u.kind!=='disciple'||u.np)||u.dead||u.v171)continue;if(S.time-(u.v171T!=null?u.v171T:-1e9)<cd)continue;if(v171Busy(u))continue;
    const w=v171Want(u),pill=v171NeedPill(u);if(!w.length&&!pill)continue;const pr=v171Gear(u)-(pill?1e6:0);if(!pick||pr<pw){pick={u,w,pill};pw=pr;}}
  if(!pick)return;const u=pick.u;for(const x of pick.w)x.it._v171c=u.id;if(u.inside)exitBuilding(u);u.path=[];u.medit=false;u.v171={st:'go',bid:b.id,go:S.time};}
function v171Do(u,b){const w=v171Want(u,true),got=[];const t0=toast;toast=function(){};
  try{for(const x of w){const old=u.eq&&u.eq[x.s];if(equip(u,x.it.id,x.s))got.push(itemName(x.it)+(old?TXT171.ret(itemName(old)):''));}
    if(v171NeedPill(u)&&usePill(u,'hx')!==false)got.push(PILLS.hx.n);}finally{toast=t0;}
  v171Clear(u);u.v171T=S.time;V171.n++;if(got.length)v171Note(TXT171.take(nm(u),got.join('、')));bagKey=null;panelKeyCache=null;return got;}
function v171Step(u,dt){const V=u.v171,b=bById(V.bid);if(u.task&&u.task.type==='attack'){v171Clear(u);u.v171=null;u.v171T=S.time-v171Cd()/2;return false;}
  if(!b||!b.built||b.broken){v171Clear(u);u.v171=null;return false;}
  if(V.st==='go'){const D=doorPt(b),r=walkTo(u,dt,D.x,D.y,1.0);if(r===null||S.time-V.go>90){v171Clear(u);u.v171=null;u.v171T=S.time;return false;}
    if(r){if(canEnter(b))enterBuildingUnit(u,b);V.st='in';V.t0=S.time;}return true;}
  if(V.st==='in'){u.dvx=u.dvy=0;u.working=true;if(S.time-V.t0>=TUNE.v171.stay){v171Do(u,b);if(u.inside)exitBuilding(u);u.v171=null;}return true;}return false;}
{const _ud=updateDisciple;updateDisciple=function(u,dt){if(u&&u.v171&&!u.dead&&!v49Client()&&!u.v170){try{if(v171Step(u,dt))return;}catch(e){console.warn(e);u.v171=null;}}return _ud(u,dt);};}
{const _tk=tickV045;tickV045=function(dt){_tk(dt);try{v171Tick(dt);}catch(e){console.warn(e);}};}
// #170 連動：出發衝關前，若總倉有突破丹（未保留）且尚未服用 → 先服一顆
{const _st=v170Start;v170Start=function(u,V){try{if(TUNE.v171.tpPill&&v171B()&&!(u.tpB>0)&&v171PillOk('tp')&&v47Major(u)){const t0=toast;toast=function(){};let r;try{r=usePill(u,'tp');}finally{toast=t0;}if(r!==false&&u.tpB>0)v171Note(TXT171.take(nm(u),PILLS.tp.n));}}catch(e){}return _st(u,V);};}
// 總倉面板：全部庫存＋保留
function v171Html(){const it=S.inv.slice().sort((a,b)=>(a.slot>b.slot?1:a.slot<b.slot?-1:0)||b.q-a.q);
  const invHint=econInventoryCapacityHint(unitById(bagUnit)||player());
  let h=`<div id="v171inv" class="sm"><b>${TXT171.gear}（${it.length} 件）</b><div class="dim">${esc(invHint).replace(/\n/g,'<br>')}</div><div class="dim">${TXT171.hint}</div>`;
  h+=it.length?it.map(x=>`<div><span style="color:${QC[x.q]}">${itemName(x)}</span> <span class="dim">${x._v171c!=null?'⏳':''}</span> <button class="btn sm${x.rsv?' on':''}" data-v171r="${x.id}">${x.rsv?'🔒 '+TXT171.rsv:TXT171.free}</button></div>`).join(''):`<div class="dim">${TXT171.none}</div>`;
  const pr=S.flags.v171pr||{};h+=`<b>${TXT171.pill}</b>`+PILL_ORDER.map(k=>{const a=S.pills[k]||[0,0,0],n=a[0]+a[1]+a[2];return n?`<div>${PILLS[k].n} ×${n} <button class="btn sm${pr[k]?' on':''}" data-v171p="${k}">${pr[k]?'🔒 '+TXT171.pillRsv:TXT171.free}</button></div>`:'';}).join('');
  const mats=Object.keys(S.mats||{}).filter(k=>S.mats[k]>0),its=Object.keys(S.items||{}).filter(k=>S.items[k]>0);if(mats.length||its.length)h+=`<b>${TXT171.mat}</b><div>${mats.map(k=>`${MAT_NAMES[k]||k} ×${S.mats[k]}`).concat(its.map(k=>`${TXT171.it[k]||k} ×${S.items[k]}`)).join('、')}</div>`;
  h+=`<b>${TXT171.res}</b><div>${RES_KEYS.map(k=>`${RES_NAMES[k]} ${Math.floor(S.res[k]||0)}`).join('、')}</div>`;
  const lg=V171.log.slice(-5).reverse();if(lg.length)h+=`<div class="dim">${lg.map(x=>x.m).join('<br>')}</div>`;return h+'</div>';}
{const _rp=renderPanel;renderPanel=function(){_rp();try{const pn=document.getElementById('panel');if(!pn)return;const b=selBuilding!=null?bById(selBuilding):null;let el=pn.querySelector('#v171inv');
  if(!b||b.type!=='zongcang'||!b.built){if(el)el.remove();return;}const key=econInventoryCapacityHint(unitById(bagUnit)||player())+'|'+S.inv.map(x=>x.id+(x.rsv?'r':'')+(x._v171c!=null?'c':'')).join(',')+JSON.stringify(S.pills)+JSON.stringify(S.flags.v171pr||{})+V171.log.length+JSON.stringify(S.items||{})+JSON.stringify(S.mats||{});
  if(el&&el.dataset.k===key)return;const w=document.createElement('div');w.innerHTML=v171Html();const ne=w.firstChild;ne.dataset.k=key;if(el)el.replaceWith(ne);else pn.appendChild(ne);}catch(e){console.warn(e);}};}
document.addEventListener('click',ev=>{const t=ev.target.closest&&ev.target.closest('[data-v171r],[data-v171p]');if(!t)return;ev.stopPropagation();
  if(t.dataset.v171r){const it=S.inv.find(x=>String(x.id)===t.dataset.v171r);if(it){it.rsv=!it.rsv;if(it.rsv)delete it._v171c;}}
  else{const k=t.dataset.v171p;S.flags.v171pr=S.flags.v171pr||{};S.flags.v171pr[k]=!S.flags.v171pr[k];}
  const el=document.getElementById('v171inv');if(el)el.dataset.k='';},true);
SYS_TXT.push(['總倉',TXT171.s,()=>`<span class="tg">弟子自行領裝備：空欄、較弱、推薦兵器、靈根同屬 +${Math.round(TUNE.v171.el*100)}%</span><span class="tg">換下的放回總倉</span><span class="tg">受傷領回血丹、衝關前服突破丹</span><span class="tg">「保留」不會被領走</span><span class="tg">每人每 ${TUNE.v171.cd} 秒最多一趟、一次最多 ${TUNE.v171.maxTake} 件，裝備最差者優先</span><span class="tg">倉庫、總倉可入內</span>`]);

// ======================= #175 更新公告：版本變更後第一次啟動顯示（不暫停、可關閉）；暫停選單可重看歷史 =======================
// 平台轉接：偏好設定儲存（日後換 Steam 只要換這裡）
const XW_PREFS={get(k,d){try{const v=localStorage.getItem('xw_'+k);return v==null?d:v;}catch(e){return d;}},set(k,v){try{localStorage.setItem('xw_'+k,String(v));}catch(e){}},has(k){try{return localStorage.getItem('xw_'+k)!=null;}catch(e){return false;}}};
// 更新紀錄（每次發版在最前面加一筆；文字集中於此，方便日後翻譯）
const CHANGELOG=[
 {v:'0.5',title:'v0.5 更新內容',g:[
  ['標題與更新',[
   '標題畫面定版：每次開啟都是同一套深色山水標題（不再有時淺米色、有時深色空底）。',
   '安裝成 App 後，有新版本會自動接手並只重新整理一次，避免卡在舊介面。',
   '視窗標題與遊戲內版本號統一為 v0.5。']],
  ['戰力（沿用緊急修正）',[
   '境界壓制：每差一個大境界傷害 ±5%；同大境界小境界差改為命中／閃避／控抗 +3%（上限 15%），不加攻擊也不減傷。',
   '相鄰大境界基礎數值差不超過 10%。']]]},
 {v:'0.4.10',title:'v0.4.10 更新內容',g:[
  ['護宗大陣',[
   '更正：護宗大陣的範圍改回以「護宗陣」建築本身為中心（屏障圈、保護範圍、小地圖標記都跟著護宗陣走）；沒有護宗陣時才以大殿為準。陣力隨建築成長、每級上限、回復與維持費照舊。',
   '護宗大陣遭到攻擊時，附近的弟子會趕去守陣迎敵，打完再回去做原本的工作（只限弟子，不會影響玩家角色）。']],
  ['建築',[
   '建築面板新增「同類全部升級」：同類型、同等級的建築有兩座以上時，一鍵把買得起的全部升一級，資源不夠時會告訴你還差多少。']],
  ['收徒',[
   '「自動選上品」挑完後，沒被選上的候選人不再直接消失，會留在宗門附近成為遊方散修，之後仍可拉攏。']],
  ['介面',[
   '提示訊息顯示時間加長。',
   '新增「事件欄」：記錄最近的提示與事件（時間、地點），點一下有地點的事件鏡頭會移過去；可開關、可拖曳、會記住位置（雙擊把手回到預設位置）。連線時隊員也看得到房主的事件。',
   '「組隊」與「事件欄」按鈕在標題、設定、讀檔等選單畫面不再顯示，只在遊戲中出現。',
   '雙擊玩家角色（房主或隊員）只會選取那位玩家；雙擊弟子才會選取同職務的全部弟子。',
   '「全部弟子」格新增境界篩選（只列出現有的境界與人數），可與閒置／受傷／工作／隊伍篩選一起用，「選取這 N 人」只選篩出來的弟子。',
   '所有敵人名牌（秘境、大地圖、首領）都會顯示境界，例如「洞窟妖王・…」「鐵背野豬・…」。',
   '頭頂文字由上而下固定為「名牌 → 名字・境界 → 血條／靈氣條」，不再蓋住自己的血條。',
   '看不透對方境界時（例如高你一個大境界以上），名牌與資訊卡改顯示「???」，且稱號不可洩漏境界。',
   '建造：草叢、漿果叢不再擋住建造（蓋下去時自動清掉）；不能蓋時會說出原因，例如「被樹木擋住」「離青禾村太近」「資源不足：木材 還缺 20」，同一句提示不再連跳兩次。',
   '聯機：離線超過 1 天的玩家角色會從世界上隱藏（不畫、不能點選、不擋路），重新上線就回來；組隊面板仍列為離線。',
   '上方列精簡：電腦版只留 弟子(J)、修煉(C)、行囊(I)、地圖(M) 與「⚙ 設定」；分配、指南、教學、說明、聯機、存檔、讀取、暫停、標題 都在「⚙ 設定」清單裡（快捷鍵照舊）。手機上方只留 弟、修、地圖、☰，暫停／聯機／指南在 ☰ 選單。',
   '弟子吃飯：正在工作的弟子餓了會放下工作走去最近的食堂，坐下吃一會兒（🍚 用餐中），吃飽回去原本的工作；沒有食堂就在原地吃乾糧。',
   '弟子睡覺：正在工作的弟子入夜累了（或精力快見底）會放下工作走去最近的住房睡覺，睡飽天亮後回去原本的工作；沒有住房就原地打盹（💤）。守衛照常值夜。',
   '弟子戰鬥選項：選取弟子（可多選）後面板多一列「⚔ 戰鬥」：姿態 主動攻擊／只反擊／避戰、撤退血量 30%／50%／70%、跟隨宗主／駐守此地。只限弟子，聯機由房主設定。',
   '弟子突破最佳化：弟子自行閉關衝關前會自動服用庫存最好的突破丹（突破面板可關「弟子突破自動服丹」），挑靈氣最好的閉關處（聚靈陣範圍內），宗主講道時改到大殿聽道衝關；突破面板顯示成功率與各項加成。',
   '下令移動／撤退／集合時，弟子會先放下攻擊、退出防衛集結，到達目的地前（之後再 3 秒）不會自動接戰，守衛也不會被敵人拉走。',
   '屬性上限 10000（玩家、弟子、首領）。新增「閃避」：玩家、弟子、首領可閃避普攻與技能（上限 40%），每次閃避有 0.5% 機率「看破」，下一擊 1.5 倍。',
   '弟子戰鬥判斷：沒被指定攻擊時，遇到境界明顯較高的敵人會退到較高境界的同門身邊；敵人也會優先找境界較高的弟子。只限弟子。',
   '秘境裡也有小地圖；按 M（手機輕點小地圖）打開大地圖，會顯示整個秘境的地形，並標出你、隊友、弟子、敵人、首領（王）、撤離陣與出口傳送陣。點地圖可把鏡頭移過去。',
   '突破條件寫得更清楚：混沌靈根會寫出「額外消耗＋突破本身」的合計靈石；各項消耗／持有條件改成「持有 M，足夠」或「持有 M，還缺 N」，打勾打叉與實際判定一致。',
   '敵人死亡後，它還沒放完的招式預警圈與延遲傷害會一起取消，不會死後還放招。',
   '村莊委託達成後自動回報：討伐數量到了、或倉庫裡送貨資源夠了就直接交差領獎（聯機由房主判定），並記入事件欄。',
   '全介面文字排版統一：字級、行高、靠左對齊、圖示欄寬一致，過長名字以「…」省略，按鈕列平均排列。']]
 ]},
 {v:'0.4.9',title:'v0.4.9 更新內容',g:[
  ['數值改版（三界架構）',[
   '新增數值中樞：世界層（凡界 W1；仙界 W2、神界 W3 先放空白模板）× 境界層（W1_R0 武徒 … W1_R10 地仙），境界、功法、敵人層級、秘境、物價、建築、弟子、煉丹、村莊、多人倍率都集中成表，之後加一列就能擴充。',
   '修為需求改為 Gemini 曲線（每境界總量 × 小階段 15%／25%／30%／30%），前期節奏與舊版相近。',
   '突破成功率改為「無丹基礎」表（武徒 80% → 地仙 1%），再加上悟性、氣運、丹藥、建築等加成；失敗依境界扣修為並受傷。',
   '每升一大境界：氣血 ×2、攻擊 ×1.8（含小階段加成）；敵人依境界套用同一套成長。',
   '境界壓制：同界傷害 ×max(0.05, 1+境界差×0.8)，越階攻擊會「未破防」，差距超過一個大境界時低者被威壓減速；跨界傷害為 0。',
   '山賊據點／襲擊依你的境界分層（散兵低一境、頭目同境）。',
   '建築升級造價改為 ×1.5^(等級−1)；村莊收購靈石依物價表計算。',
   '多人：敵人血量 ×(1+(人數−1)×0.6)、建造與升級造價 ×(1+(人數−1)×0.5)。',
   '說明 → 境界：新增「三界境界總表」與壓制說明。',
  ]],
  ['聯機與建築修正',[
   '組隊副本：隊友已在副本裡時，副本門口會出現「⚔ 進入（加入隊友）」與靠近提示；兩人都能從撤離陣或「離開副本」回到門口，可重複進出。',
   '成員現在能使用建築功能：研究武學秘籍／丹方、求武台、煉丹、鍛造都由房主代為處理，成品進共用背包並同步；站在爐旁也會推進進度。',
   '成員在大殿、住房、武道館、練武閣、食堂內修煉的加成與房主一致，聽講道也有加成。',
   '戰鬥特效同步：成員畫面也看得到房主、弟子與敵人的攻擊、法術、投射物與傷害數字（精簡事件，頻寬很低）。',
   '護宗陣：屏障固定以宗門大殿為中心（大殿重建或移動會跟著走）；宗門建築越多、等級越高，半徑、陣力與回復越強，每級有陣力上限；陣力會回復（受攻擊時較慢），面板顯示回復速度；張開時每 10 分鐘消耗 1 靈石。',
   '聚靈陣：地面與小地圖顯示靈氣範圍圈與光點；設定 → 介面新增「範圍標示」可關閉。',
  ]],
 ]},
 {v:'0.4.8',title:'v0.4.8 更新內容',g:[
  ['新功能',[
   '角色取名：開新遊戲先為角色取名（1～8 個字，🎲 可隨機取一個修仙風格的名字）；名字顯示在頭頂名牌、角色面板、頂欄與事件訊息，存在存檔裡。沒有名字的舊存檔讀取時會問一次。',
   '#204 介面面板可拖曳到任意位置（記住位置）；設定「介面」分頁「↺ 重置版面」一鍵回到預設版面。',
   '#205 目標追蹤：左上角顯示目前目標、方向與距離，可收合或隱藏；「提示」固定在追蹤欄正下方，跟著收合／展開／隱藏移動。',
   '#201 小地圖：按住拖曳連續移動鏡頭（AoE4 式），放開後鏡頭留在原地；右鍵＝選取單位移動到該處。',
   '#202 弟子可在建築內／聚靈陣修煉，受傷就地療傷；住房只用來睡覺。',
  ]],
  ['介面調整',[
   '電腦版面重排：小地圖移到右上角（頂欄正下方）；角色面板不再蓋住建造列；頂部通知會往下疊、不互相遮擋；組隊面板、通知、角色面板、建造列互不重疊。',
   '手機右下角重排：指令模式與技能模式都不重疊，按鈕 ≥44px、間距加大；技能列可放最多 10 個技能（「⇅」翻頁），不會撞到角色面板、搖桿或弟子列。',
   '血條順序統一為「氣血 → 靈力（靈氣／護體）→ 修為」，頭頂與角色面板一致、顏色一致（氣血綠、靈氣藍、護體紫、修為青）。',
   '介面文字一律改用你的角色名字或「你」稱呼（例如「回到自己」、「選自己」）。',
  ]],
  ['錯誤修正',[
   '#206 委託的討伐目標會正確計算擊殺數。',
   '目標追蹤不再出現「undefined NaN 格」。',
   '右鍵指派建築工作時，不會把聯機道友的角色算進去。',
  ]],
  ['聯機',[
   '#206 村莊委託在聯機中同步：成員接取／完成委託會轉給房主處理，雙方看到相同的委託進度。',
   '加入或開房前，若這台瀏覽器還沒存過名號，會先請你取名；聯機名號與角色名同步，其他道友看到的就是你的角色名。',
  ]],]},
 {v:'0.4.7',title:'v0.4.7 更新內容',g:[
  ['新功能',[
   'AoE4 式連續建造：按住 Shift 放置，每點一下再排一座；Shift＋拖曳沿直線排一整排（紅色＝位置不行或資源不足）；放開 Shift 結束，右鍵／Esc 取消。地基標上順序，弟子依序蓋完；選取還沒開工的地基按 Delete 取消並全額退回。手機確認列多了「🔁 連續放置」開關。',
   '弟子決定修煉時，多半（約 85 %）會走進有修煉加成的建築（練武閣、長書閣、宗門大殿、武道館），在室內畫面看得到他們打坐，時間到自己走出來；沒有空位或走不到才就地打坐。住房只用來睡覺，療傷仍就地進行。',
   '浮動面板都能拖曳：宗門目標、角色／建築面板、提示框按住標題列（或 ⠿）拖到想要的位置，電腦與手機各自記住；連點兩下 ⠿ 還原，設定 →「介面 HUD」→「↺ 重置版面」全部還原（含聯機隊伍面板）。',
   '宗門目標改為精簡追蹤列：平常只顯示一行（◆ 目前目標、方向與距離、進度），點一下展開步驟、獎勵與 📍 前往，再點收合；按「—」收成小圖示 📜。目標更新時畫面上方會短暫閃出提示。',
   '技能改成「拖曳瞄準」：手機按住技能鈕往外拖會出現方向／範圍指示，放開就施放；拖回按鈕中央或拖到 ✕ 取消區就取消；輕點一下仍會自動瞄準最近的敵人。電腦按 Q／W／E／R 會朝滑鼠方向施放。',
   '沒有敵人也能放技能：火球、御劍會朝瞄準方向飛出，衝鋒會朝該方向衝刺。聯機時客機的瞄準方向也會正確傳給主機。',
   '手機畫面重新排版：選取角色時預設只顯示一條精簡資訊（境界、修為、氣血），點一下展開詳細、再點收起；右下 8 顆指令鈕收進一顆「☰ 指令」，點開成扇形選單；走到資源旁會自動出現「採集」快捷鈕；弟子列預設收合，小地圖可按「－」收起。直式、橫式各自排版，沒開任何視窗時戰場可視範圍約七成五以上。',
   '主選單合併：右上 ☰ 與 ⏸ 打開的是同一個主選單，分成「遊戲／宗門／存檔／說明」幾組，不再重複。原本暫停頁上一大片系統說明移到「系統介紹」，按分類收合、點開才看細節。選單會顯示目前版本。',
   '角色資訊面板右上角有大顆 ✕，按下關閉並取消選取。',
   '山賊警報橫幅按 ✕ 後，同一波不會再跳出，改成角落的小倒數標籤（點一下可看山寨或來襲的山賊）；下一波來襲時才會重新警報。',
   '秘境入口：走到入口會跳出「進入秘境？」確認，可選單人、帶選取的弟子或帶全部弟子。秘境撤離陣與出口傳送陣也會先問「要離開嗎？」，不會一踩就出去。',
   '弟子也會撿仙緣：地圖上的 ✨ 靈光附近有空閒弟子時，他會自己走過去觸發奇遇。',
   '智能分配可以調整各資源的「庫存目標」（＋／－），會存在存檔裡。',
   '電腦版雙擊建築：列出畫面內所有同類建築的等級與裡面的人數，可直接選取。',
   '背景音樂：古琴風格的五聲音階，戰鬥與秘境時節奏較急；設定裡可調音樂音量（0% 為關閉）。',
   '設定→遊戲新增「除錯面板（金手指）」：開啟後畫面左側出現 🛠，可加資源、修為、突破、無敵、時間加速、觸發事件等，方便測試（聯機客機無法使用）。',
   '秘境變大了：一般房間大約是原本的 2.5 倍，首領大殿從 15×15 擴大為 22×22，柱子與怪物數量也跟著調整，打起來更有走位空間。',
   '村莊會成長：和村莊關係越好、時間越久，村莊會從「小村→村落→大村→村鎮→市鎮」逐步發展，蓋出新民居、村民變多，村衛名額從 3 名增加到最多 10 名並自動招募補齊。交易視窗會顯示村莊規模與發展進度。',
   '新建築「食堂」：餓了的弟子會優先去最近的食堂吃飯，一餐只要 1 份食物（在大殿吃要 2 份），心情加得更多。弟子突破到「煉氣」以後就辟穀，不再需要吃飯。',
   '弟子有了「精力」：工作與修煉會慢慢消耗精力，精力低於一半時採集與修煉效率會下降（最低 65%）。晚上精力不足的弟子會自己回房睡覺，有房屋睡得最快。突破「煉氣」以後不再需要睡眠。角色面板「屬性」頁可看到飽足與精力。',
   '隨身丹藥：每位玩家可各自設定隨身帶幾顆回血丹（0／3／5／8）、要不要自動服用、氣血低於多少時服用。靠近宗門大殿或總倉時會自動從宗門庫存補滿，戰鬥中氣血太低就自動吞一顆（有冷卻）。在角色面板「屬性」頁設定。',
   '渡劫：突破「築基」與更高境界時，會先引來約 10 秒的天劫，烏雲雷電劈下、角色原地不動。渡劫中被攻擊會中斷（不會扣靈石和丹藥，過一會兒可再試）；正在交戰或附近有敵人時無法開始渡劫。',
   '手機任務追蹤可收合：左上角多了一顆小按鈕，點一下把「宗門目標」收起來，畫面更寬；再點一下展開。',
   '宗門事務：宗門大殿會不定時張貼事務（狩獵、剿匪、巡邏、採藥、護送、救援……共 300 則），空閒的弟子會自己接下，需要多人的事務會找同門組隊一起出發，完成後帶回修為、靈石、材料、丹藥或功法殘頁（集滿 5 張換一本功法）。同一則事務完成後不會再出現；點宗門大殿可看目前的事務板與紀錄。',
   '倒地救援：你或弟子氣血歸零時會先「倒地」，頭上出現倒地血條，約 40 秒內被救起就不會死。附近空閒的弟子會跑過來救人；如果旁邊還有敵人，弟子會先把人慢慢拖離戰場一小段（約 4～6 格），再在那裡救治，拖的途中弟子被打會中斷、倒地血條也會繼續流。你走到倒地的弟子旁邊也會自動救起；救起後氣血回到 30%。倒地時再被打，血條會掉得更快。（秘境裡維持原本的「傷退」規則。）',
   '新建築「護宗陣」：建好後以宗門大殿為中心張開一圈屏障，弟子、你、村民和商旅都能自由進出，妖獸和山賊會被擋在陣外，誤闖進來的也會被彈出去。敵人撞陣會消耗陣力，陣力耗盡會破開 45 秒再重新張開；升級可擴大範圍、提高陣力。',
   '山寨變多了：山寨存在越久，留守的山賊越多。你到「大武師」以後，地圖上會陸續出現新的山寨，山賊越多山寨越多；新山寨由「煉氣頭目」坐鎮，打倒後會留下山寨寶箱，有極低機率開出全新的「仙器」品質裝備。地圖上的山賊全部清光後，就再也不會出現新山寨。',
   '按鍵調整：W A S D 移動角色；方向鍵改成依畫面方向平滑平移鏡頭（Shift 加速、平移時鏡頭不會彈回），空白鍵或 Home 回到自己。',
   '技能列：每個角色戰鬥最多帶 10 個技能，Q E R T＋數字 1～6（W 不再施放技能）。建造改用 Shift＋數字，建造模式中（或手機建造清單開著）直接按數字也能換建築；隊伍改成 Alt＋1～4 選取、Ctrl＋1～4 編隊；交易改按 N。舊的按鍵設定會自動搬移。',
   '開啟遊戲時不再閃出舊版說明視窗；操作說明改成按 H 或從選單打開，並顯示目前版本與新按鍵，可直接跳到修仙指南。',
  ]],
  ['平衡調整',[
   '弟子自己走到靈光觸發的仙緣，和你一樣不受事件冷卻限制。',
  ]],
  ['平衡調整',[
   '領悟、醍醐灌頂大幅變稀有：每次判定領悟 0.5%、醍醐灌頂 2%（仙武之體只多 +0.2%／+0.5%；長書閣、仙緣閣每級只加 +0.1%）。',
   '領悟、醍醐灌頂只在修煉中（打坐、練武、閉關、聽道、雙修）或戰鬥中（5 秒內打過敵人或被打）才會判定，閒晃、走路、採集、建造不再觸發。',
  ]],
  ['錯誤修正',[
   '修正視窗互相蓋住：技能鈕、搖桿、山賊橫幅等不再畫在讀檔、設定等視窗上面；開視窗時會自動隱藏戰鬥按鈕，提示訊息也不會擋住視窗。',
   '修正手機連擊標籤（金●○○）蓋住「掃」等技能鈕，現在會避開技能鈕與搖桿，並考慮瀏海／圓角安全區。',
   '修正聯機名牌和頭上的境界標籤、以及彼此之間重疊：名牌改到更上方，靠太近時自動往上錯開。',
   '修正在九死一生等秘境裡誤跳出傳送石碑介面。',
   '修正村莊委託「討伐妖獸」一直停在 0/4：現在接下委託後，你、弟子、技能範圍傷害與聯機成員在任何地方（含秘境）擊殺妖獸都會計數，達成後回村莊「回報完成」領獎。',
   '修正仙府秘境的首領大殿有時走不進去（通道停在大殿旁邊沒有接上）。',
   '修正重新設定按鍵後，教學提示、說明與技能列上仍顯示舊按鍵。',
   '修正說明畫面與選單上顯示的舊版本號。',
  ]],
  ['聯機',[
   '房主切到背景時世界照常運作；手機房主斷線約 15 秒後由成員接手主機。',
   '秘境起始房間新增首領傳送陣，各玩家自行確認，只帶自己的弟子前往。',
   '走到秘境出口或入口時改為各自確認後才離開，不會暫停其他人。',
   '修正房主可指揮其他玩家角色、聯機中讀檔、成員沿用房主教學進度等問題。',
   '從此任何傳送都只移動自己，不會強制全隊一起傳送。',
   '村莊成長、護宗陣、新山寨與寶箱、宗門事務、渡劫與倒地狀態，成員畫面都會同步顯示（晚加入也看得到）。',
   '隨身丹藥改為每位玩家各自設定，成員的化身也會自動補丹、服丹。',
   '玩家倒地後，其他玩家站在旁邊 3 秒就能救起；房主附近有同伴時也會先倒地，不會直接身隕。',
   '修正成員方向鍵／搖桿無法移動、斷線後誤顯示「離線修煉中」與同瀏覽器重新整理留下舊化身、傳送石碑被拉回；成員可走進大殿等所有建築、像你一樣隨時採集（無背包上限、有揮動與飄字），其他玩家角色面板改為只能檢視，隊伍面板版面不再重疊；聯機暫停提示移到畫面上方。',
  ]],]},
 {v:'0.4.6h',title:'v0.4.6h 更新內容',g:[
  ['新功能',[
   '總倉：新建築（木 30、石 15，只能建一座），一覽宗門全部裝備、丹藥、材料與資源。弟子會自己來領比身上更好的裝備、受傷時領回血丹、大境界突破前領突破丹，換下的裝備放回總倉；每人每次最多領 2 件，有冷卻時間，不會囤貨。可把單件物品設為「保留」，或整類丹藥保留。',
   '倉庫可以走進去了。',
   '弟子自主突破：條件齊備時依性格決定何時衝關，自己走到試煉建築閉關；建築等級越高、有護法教官陪同，成功率越高（上限 95%）。弟子面板可切換「自主／保留」、「催促突破」、指定護法教官。',
   '弟子自行結緣：不再跳出結緣詢問，弟子依相性、好感與性格自己決定；相性差的可能繼續觀望或分開。弟子面板可「禁止結緣」或解除道侶。',
   '宗主寶座講道：坐上大殿寶座打坐，殿內聽道的弟子修煉加快。',
   '室內座位：一個蒲團只坐一人，寶座保留給宗主。',
   '技能列 Q W E R：四格技能，自動選目標、距離不夠會先靠近，可點選或拖曳換技能；手機版為四顆圓鈕。與石碑等互動改按 V。',
   '宗門防衛：建築受襲或敵人闖入時，自動派出最近、能打的弟子迎敵。',
   '境界探查：對方境界比你高時，可能看不透（「???」）或看錯。',
   '頭頂靈氣條；技能命中會讓目標小跳、擊退，受擊閃白。',
   '設定畫面重做：左側七大分類（畫面、音效、操作／按鍵、介面 HUD、遊戲性、存檔、輔助），右側每項附說明，滑桿與左右切換，可「恢復預設值」、「套用」或「取消」。',
   '新增設定：主音量／音效音量、背景時靜音、幀率上限、解析度比例、粒子特效、光影效果、全螢幕、鏡頭速度、畫面邊緣捲動、傷害數字、頭頂名牌、提示文字、色弱模式、受擊效果、失去焦點時暫停。',
   '按鍵可重新綁定（衝突時自動互換）；支援標準手把：左搖桿移動、右搖桿鏡頭、A 互動、X／Y／LB／RB 施放 Q／W／E／R 技能。',
   '更新公告：版本更新後第一次開啟會顯示，暫停選單「📣 更新公告」可隨時重看。']],
  ['平衡調整',[
   '修煉加成改為「環境、體質、機緣」三組，組內相加、組間相乘，越高越遞減；室內修煉不再過快。',
   '仙緣事件大約減為原本的四分之一，兩次之間至少相隔一天；稀有事件比例降低。',
   '靈氣回復：野外 80%、房屋 100%、房屋＋聚靈陣 120%，隨建築等級提高。',
   '仙凡之門：一般房間為宗師級、只有首領房是煉氣；首領房更大，進房後封鎖。',
   '仙凡之門大隊：人數越多，首領與小怪變強的幅度放緩，額外小怪數量上限降低；約 30 名準備充分的宗師可以打過，人少或沒準備仍會失敗。',
   '首領出招有間隔與預警；小怪較弱、境界較低、招式較少。',
   '突破成功率上限 70%。']],
  ['錯誤修正',[
   '修正仙緣事件觸發時出錯、事件沒有生效的問題。',
   '修正副本內靈氣與護體罡氣不回復，技能一直顯示「距離不合」。',
   '修正單位卡在樹木、岩石之間。',
   '修正觸控／滑鼠切換時第一下點擊落空；山賊來襲橫幅不再蓋住頭像列。',
   '修正宗門防衛時弟子每秒換一次目標、追不上敵人。',
   '技能因靈氣不夠放不出來時，提示改為「靈氣不足」，不再誤報距離。',
   '衝鋒貼著敵人也能施放（直接撞擊），不再提示「太近」。']],
  ['聯機',[
   '聯機時任何人開啟對話框、選單，共享世界都不再暫停。',
   '角色頭上顯示名字，房主有 👑，自己顯示「你・」。',
   '其他玩家的移動更平滑（約每秒 18 次同步＋插值）。',
   '宗門大事改為眾人投票：多數決，平手由房主決定，逾時或無人投票則「再觀察一陣子」；可改票，縮小後顯示「📜 宗門議事」徽章。弟子結緣則由弟子自己決定，不再投票。',
   '新增隊伍（最多 4 人）：邀請、接受／拒絕、離隊、隊長踢人；同區域隊友平分經驗並有加成；秘境邀請只發給隊友。',
   '秘境中倒下不再直接被踢出：可等 5 秒後以半血復活、觀戰或離開。',
   '新加入的玩家角色數值與你的角色一致。',
   '每位玩家都有自己的角色與修為，不再拿到房主的修為。',
   '進入建築內部時顯示室內畫面；玩家化身不會被 AI 指派工作。',
   '離線玩家的角色會留在世界中，修煉速度降低，腳下顯示「離線修煉中」；寶座／座位由房主確認，不會被兩人同時佔用。',
   'Q W E R 技能改由房主施放，成員的技能不再失效。',
   '弟子自主突破、領取裝備、防衛調度都由房主決定，所有玩家看到相同結果。',
   '修正斷線重連、幽靈成員、秘境邀請與退出的多項問題。']]]},
 {v:'0.4.6g',title:'v0.4.6g',g:[['新功能',['大殿閉關、領悟與醍醐灌頂、罡氣／靈氣護體、建造工匠、批量鍛造與熔鍊、建築專屬加成、新標題畫面。','修為溢出條、護盾條、手機頂欄。']]]},
 {v:'0.4.6e',title:'v0.4.6e',g:[['新功能',['秘境搜打撤、正魔聲望、拍賣會、比武大會、煉丹火候與丹毒、連招疊層、神識辨妖、字體大小設定。']]]},
 {v:'0.4.6c',title:'v0.4.6c',g:[['調整',['突破體系、職業、暫停畫面、山賊警報等玩家回饋修正。']]]},
 {v:'0.4.6a',title:'v0.4.6a',g:[['錯誤修正',['玩家回饋第一批修正。']]]},
 {v:'0.4.5',title:'v0.4.5',g:[['新功能',['境界小階段、丹藥、裝備、煉丹房與鍛造坊；可重複挑戰的副本；仙緣奇遇、弟子自主行動；道侶與雙修；靈根系統、晝夜、元素法術。']]]},
 {v:'0.4.0',title:'v0.4.0',g:[['新功能',['新手教學、修仙指南、建築等級與拆除、逐出弟子、流浪者、求武台候選人。']]]}];
const TXT175={btn:'📣 更新公告',head:'📣 更新公告',close:'知道了',hist:'歷史版本',x:'關閉'};
const V175={open:false,old:null,ck:false};
function v175Ver(){return CHANGELOG[0].v;}
function v175Esc(s){return String(s).replace(/[&<>]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;'})[c]);}
function v175Entry(E,big){return `<div class="v175e"><h4>${v175Esc(E.title)}</h4>`+E.g.map(([g,L])=>`<b class="v175g">${v175Esc(g)}</b><ul>${L.map(x=>`<li>${v175Esc(x)}</li>`).join('')}</ul>`).join('')+'</div>';}
function v175Html(all){let h=v175Entry(CHANGELOG[0]);if(all&&CHANGELOG.length>1)h+=`<div class="v175hist"><b>${TXT175.hist}</b>${CHANGELOG.slice(1).map(e=>v175Entry(e)).join('')}</div>`;return h;}
function v175Css(){if(document.getElementById('v175css'))return;const st=document.createElement('style');st.id='v175css';
  st.textContent='#v175{position:fixed;right:12px;bottom:12px;z-index:70;width:min(440px,94vw);max-height:min(70vh,640px);display:none;flex-direction:column;background:#1d1710f2;border:1px solid #c9a24a;border-radius:12px;box-shadow:0 6px 28px #000c;color:#e8dcc0;font-size:var(--xwfs,14px)}#v175.open{display:flex}#v175 .hd{display:flex;align-items:center;gap:8px;padding:8px 12px;border-bottom:1px solid #8a6a3a;font-weight:bold;color:#ffe9a0}#v175 .hd span{flex:1}#v175 .bd{overflow:auto;padding:6px 14px 10px}#v175 .ft{padding:8px 12px;border-top:1px solid #8a6a3a;text-align:right}.v175e h4{margin:6px 0;color:#ffd34d}.v175g{display:block;margin-top:6px;color:#9fd1ff}.v175e ul{margin:2px 0 4px;padding-left:18px}.v175e li{margin:2px 0;line-height:1.45}.v175hist{margin-top:10px;border-top:1px dashed #8a6a3a;padding-top:6px;opacity:.85}#v175 .bx{background:none;border:none;color:inherit;font-size:1.2em;cursor:pointer;padding:0 4px}';
  document.head.appendChild(st);}
function v175Show(all){v175Css();let el=document.getElementById('v175');if(!el){el=document.createElement('div');el.id='v175';el.className='ui';document.body.appendChild(el);
    el.addEventListener('click',ev=>{if(ev.target.closest('[data-v175x]'))v175Close();});}
  el.innerHTML=`<div class="hd"><span>${TXT175.head}</span><button class="bx" data-v175x="1" title="${TXT175.x}">✕</button></div><div class="bd scroll">${v175Html(all)}</div><div class="ft"><button class="btn pri" data-v175x="1">${TXT175.close}</button></div>`;
  el.classList.add('open');V175.open=true;XW_PREFS.set('lastSeenVer',v175Ver());}
function v175Close(){const el=document.getElementById('v175');if(el)el.classList.remove('open');V175.open=false;XW_PREFS.set('lastSeenVer',v175Ver());}
// 老玩家判定：本機已有設定或存檔（新玩家第一次玩只看教學，不跳公告，直接記下版本）
function v175Boot(){if(V175.old!=null)return;V175.old=false;if(XW_PREFS.has('lastSeenVer')){V175.old=true;return;}
  try{if(localStorage.getItem(SETTINGS_KEY)!=null)V175.old=true;}catch(e){}
  try{listSlots().then(l=>{if(Object.values(l||{}).some(Boolean))V175.old=true;}).catch(()=>{});}catch(e){}}
function v175Check(){if(V175.ck)return;if(typeof S==='undefined'||!S||titleOpen||deathOpen||helpShown)return;if(V47.pause)return;
  V175.ck=true;const last=XW_PREFS.get('lastSeenVer',null);if(last===v175Ver())return;
  if(last==null&&!V175.old){XW_PREFS.set('lastSeenVer',v175Ver());return;}
  if(!(TUNE.v175&&TUNE.v175.auto===false))setTimeout(()=>{if(!titleOpen&&!deathOpen)v175Show(false);},1500);}
TUNE.v175={auto:true};
v175Boot();setInterval(()=>{try{v175Check();}catch(e){}},1000);
{const _x=pauseHtml;pauseHtml=function(tab){let h=_x(tab);return h.replace(/<button class="btn[^"]*" data-pz="sys">/,m=>'<button class="btn" data-pz="news">'+TXT175.btn+'</button>'+m);};}
{const _x=pauseAct;pauseAct=function(a){if(a==='news'){openPause(false);v175Show(true);return;}return _x(a);};}
SYS_TXT.push(['更新公告','每次版本更新的內容',()=>'版本更新後第一次開啟遊戲，右下角會出現更新公告（遊戲不會暫停，聯機也不受影響），按「知道了」或 ✕ 關閉。之後可在暫停畫面按「📣 更新公告」重看本次與歷史版本的內容。']);

// ======================= #173/#174 設定畫面重做（分類分頁、說明、滑桿／左右切換、恢復預設、套用／取消）＋基本設定＋手把 =======================
// 可攜性：瀏覽器專屬功能（全螢幕、手把、焦點）集中在 XW_PLAT；設定值走 XW_PREFS；文字集中在 TXT173／OPT173／ACT173。
const XW_PLAT={
  fullscreen(on){try{const d=document;if(on&&!d.fullscreenElement&&d.documentElement.requestFullscreen)return d.documentElement.requestFullscreen().catch(()=>{});if(!on&&d.fullscreenElement&&d.exitFullscreen)return d.exitFullscreen().catch(()=>{});}catch(e){}},
  isFull(){try{return !!document.fullscreenElement;}catch(e){return false;}},
  canFull(){try{return !!document.documentElement.requestFullscreen;}catch(e){return false;}},
  pads(){try{return navigator.getGamepads?Array.from(navigator.getGamepads()).filter(Boolean):[];}catch(e){return [];}},
  hidden(){try{return !!document.hidden;}catch(e){return false;}}};
const TXT173={title:'⚙ 設定',tabs:[['gfx','🖥 畫面'],['aud','🔊 音效'],['ctl','🎮 操作／按鍵'],['hud','🧭 介面 HUD'],['game','⚔ 遊戲性'],['save','💾 存檔'],['a11y','♿ 輔助']],
  apply:'套用',cancel:'取消',reset:'恢復預設值',dirty:'● 有未套用的變更',applied:'✔ 已套用',live:'以下項目即時生效',press:'請按新按鍵…（Esc 取消）',keys:'按鍵綁定',
  keyNote:'點按鍵可重新綁定；與其他動作衝突時自動互換。手把按鍵固定，見「手把支援」。',pad:'手把狀態',padNone:'未偵測到手把（接上後按任一鍵喚醒）',padOn:'已連接：',
  on:'開',off:'關',fsNo:'此瀏覽器不支援全螢幕',ver:'版本'};
const OPT173=[
 {k:'fps',tab:'gfx',n:'幀率上限',d:'限制每秒畫面數；手機或筆電設 30／60 可省電、降溫。',t:'cy',o:[[0,'不限'],[120,'120'],[60,'60'],[30,'30']],def:0},
 {k:'res',tab:'gfx',n:'解析度比例',d:'遊戲畫面的內部解析度。調低提升效能、調高更清晰；低幀率時的自動降畫質仍會作用。',t:'sl',min:50,max:100,step:10,def:100,u:'%'},
 {k:'fx',tab:'gfx',n:'粒子特效',d:'技能、命中、法術的特效數量。首領預警圈不受影響。',t:'cy',o:[[2,'高'],[1,'低'],[0,'關']],def:2},
 {k:'glow',tab:'gfx',n:'光影效果',d:'發光、光暈陰影。關閉可在低階裝置提升效能。',t:'tg',def:1},
 {k:'full',tab:'gfx',n:'全螢幕',d:'切換全螢幕顯示（iPhone Safari 不支援；按 Esc 也可離開）。',t:'tg',def:0,nos:1},
 {k:'master',tab:'aud',n:'主音量',d:'所有聲音的總音量。',t:'sl',min:0,max:100,step:5,def:80,u:'%'},
 {k:'music',tab:'aud',n:'音樂音量',d:'背景音樂音量（目前版本尚未加入配樂，先保留設定）。',t:'sl',min:0,max:100,step:5,def:60,u:'%'},
 {k:'sfxv',tab:'aud',n:'音效音量',d:'警報、命中、突破等音效。暫停選單的「音效：開／關」是總開關。',t:'sl',min:0,max:100,step:5,def:80,u:'%'},
 {k:'bgMute',tab:'aud',n:'背景時靜音',d:'切到其他視窗或分頁時不發出聲音。',t:'tg',def:1},
 {k:'camSp',tab:'ctl',n:'鏡頭移動速度',d:'方向鍵、手把右搖桿、畫面邊緣捲動的鏡頭速度。',t:'sl',min:50,max:200,step:10,def:100,u:'%'},
 {k:'edge',tab:'ctl',n:'畫面邊緣捲動',d:'滑鼠移到視窗邊緣時平移鏡頭（觸控裝置無效）。',t:'tg',def:0},
 {k:'pad',tab:'ctl',n:'手把支援',d:'標準手把：左搖桿移動、右搖桿鏡頭、A 互動、X／Y／LB／RB＝技能 Q／E／R／T、LT 打坐、RT 選取弟子跟隨、B 鏡頭回到自己、Back 地圖、Start 暫停。',t:'tg',def:1},
 {k:'dmgNum',tab:'hud',n:'傷害數字',d:'顯示受擊時跳出的傷害數字。',t:'tg',def:1},
 {k:'np',tab:'hud',n:'頭頂名牌',d:'單位頭上的境界／名稱標籤。「預設」＝你、選取或受傷的弟子與敵人顯示。',t:'cy',o:[['def','預設'],['off','關閉']],def:'def'},
 {k:'hints',tab:'hud',n:'提示文字',d:'畫面上的目標提示與操作提示。',t:'tg',def:1},
 {k:'lang',tab:'game',n:'語言',d:'介面語言。目前只有繁體中文；介面文字已集中管理，日後可加入其他語言。',t:'cy',o:[['zh-Hant','繁體中文']],def:'zh-Hant'},
 {k:'blurPause',tab:'game',n:'失去焦點時暫停',d:'切出視窗或分頁時自動開啟暫停選單（聯機中不暫停，以免影響隊友）。',t:'tg',def:1},
 {k:'cb',tab:'a11y',n:'色弱模式',d:'紅綠色弱友善：友方血條改藍色、敵方改橘色。',t:'cy',o:[[0,'關閉'],[1,'紅綠色弱']],def:0,pv:1},
 {k:'shake',tab:'a11y',n:'受擊閃白／小跳',d:'技能命中時目標閃白、小跳的效果；對動態敏感可關閉。',t:'tg',def:1}];
// 可綁定動作：[id, 名稱, 預設 code]
const ACT173=[['up','移動：上','KeyW'],['down','移動：下','KeyS'],['left','移動：左','KeyA'],['right','移動：右','KeyD'],
 ['panu','鏡頭平移：上','ArrowUp'],['pand','鏡頭平移：下','ArrowDown'],['panl','鏡頭平移：左','ArrowLeft'],['panr','鏡頭平移：右','ArrowRight'],
 ['sk1','技能 1','KeyQ'],['sk2','技能 2','KeyE'],['sk3','技能 3','KeyR'],['sk4','技能 4','KeyT'],
 ['sk5','技能 5','Digit1'],['sk6','技能 6','Digit2'],['sk7','技能 7','Digit3'],['sk8','技能 8','Digit4'],['sk9','技能 9','Digit5'],['sk10','技能 10','Digit6'],['use','互動／採集','KeyV'],['med','打坐','KeyZ'],
 ['cult','修煉面板','KeyC'],['roster','弟子名冊','KeyJ'],['map','大地圖','KeyM'],['build','建造','KeyB'],['party','組隊／聯機','KeyP'],['trade','交易','KeyN'],['rally','全員集合','KeyY'],['cam','鏡頭回到自己','Space'],['help','操作說明','KeyH'],['sect','宗門事務','KeyO']];
const V173={tab:'gfx',draft:null,listen:null,open:false,msg:'',mx:-1,my:-1,padPrev:{},padAx:false,lastF:0,syn:new WeakSet(),n:0};
const CFG173=(()=>{const c={};for(const o of OPT173)c[o.k]=o.def;c.keys={};try{const s=JSON.parse(XW_PREFS.get('cfg','{}'));for(const o of OPT173)if(s[o.k]!==undefined&&!o.nos)c[o.k]=s[o.k];if(s.keys&&typeof s.keys==='object')for(const a of ACT173)if(typeof s.keys[a[0]]==='string')c.keys[a[0]]=s.keys[a[0]];}catch(e){}return c;})();
// #195/#196 舊按鍵設定搬移：預設改成 WASD 移動、方向鍵平移鏡頭、技能 Q E R T＋數字、交易 N；自訂按鍵若和新預設撞鍵，就還原成預設
(function(){try{if(XW_PREFS.get('kv','')==='196')return;const K=CFG173.keys,OLD={up:'ArrowUp',down:'ArrowDown',left:'ArrowLeft',right:'ArrowRight',sk2:'KeyW',sk3:'KeyE',sk4:'KeyR',trade:'KeyT'};let ch=0;
  for(const a of ACT173){const c=K[a[0]];if(!c)continue;if(OLD[a[0]]&&c===OLD[a[0]]){delete K[a[0]];ch++;continue;}if(c===a[2]){delete K[a[0]];continue;}
    const hit=ACT173.find(b=>b[0]!==a[0]&&!K[b[0]]&&b[2]===c);if(hit){delete K[a[0]];ch++;}}
  XW_PREFS.set('kv','196');const o={};try{Object.assign(o,JSON.parse(XW_PREFS.get('cfg','{}')));}catch(e){}o.keys=K;XW_PREFS.set('cfg',JSON.stringify(o));V173.mig=ch;}catch(e){}})();
function v173Save(){const o={};for(const x of OPT173)if(!x.nos)o[x.k]=CFG173[x.k];o.keys=CFG173.keys;XW_PREFS.set('cfg',JSON.stringify(o));}
function v173Key(a){const A=ACT173.find(x=>x[0]===a);return CFG173.keys[a]||(A&&A[2]);}
function v173KeyName(c){if(!c)return '—';const m=/^Key([A-Z])$/.exec(c)||/^Digit(\d)$/.exec(c);if(m)return m[1];return ({ArrowUp:'↑',ArrowDown:'↓',ArrowLeft:'←',ArrowRight:'→',Space:'空白',Tab:'Tab',Enter:'Enter',Backquote:'`',Minus:'-',Equal:'=',Comma:',',Period:'.',Slash:'/',Semicolon:';',Quote:"'",BracketLeft:'[',BracketRight:']',Backslash:'\\'})[c]||c.replace(/^Numpad/,'數字鍵 ');}
function v173Res(){const r=+CFG173.res;return r>=50&&r<=100?r/100:1;}
function v173Vol(){if(CFG173.bgMute&&XW_PLAT.hidden())return 0;return (CFG173.master/100)*(CFG173.sfxv/100);}
const V173_B157={flinch:TUNE.v157.flinch,flash:TUNE.v157.flash};
function v173Apply(prev){const c=CFG173;TUNE.v157.flinch=c.shake?V173_B157.flinch:0;TUNE.v157.flash=c.shake?V173_B157.flash:0;try{document.body.classList.toggle('v173nohint',!c.hints);document.body.classList.toggle('v173cb',!!c.cb);}catch(e){}
  if(!prev||prev.res!==c.res){try{if(typeof resize==='function')resize();}catch(e){}}
  if(prev&&prev.full!==c.full)XW_PLAT.fullscreen(!!c.full);
  if(c.bgMute&&XW_PLAT.hidden()&&typeof SFX!=='undefined'&&SFX.ctx&&SFX.ctx.state==='running'){try{SFX.ctx.suspend();}catch(e){}}}
// ---- 音量：所有音效都經 beep → 依主音量 × 音效音量縮放 ----
{const _b=beep;beep=function(f,d,type,vol,delay,f2){const k=v173Vol();if(k<=0.001)return;return _b(f,d,type,(vol||0.06)*k,delay,f2);};}
document.addEventListener('visibilitychange',()=>{try{if(typeof SFX==='undefined'||!SFX.ctx)return;if(document.hidden&&CFG173.bgMute)SFX.ctx.suspend();else if(!document.hidden&&SFX.ctx.state==='suspended')SFX.ctx.resume();}catch(e){}});
// ---- 幀率上限 ----
{const _f=frame;frame=function(now){const cap=+CFG173.fps;if(cap>0&&V173.lastF&&now-V173.lastF<1000/cap-1.5){requestAnimationFrame(frame);return;}V173.lastF=now;return _f(now);};}
// ---- 粒子特效 ----
{const _s=sfxPush;sfxPush=function(){const l=+CFG173.fx;if(l===0)return;if(l===1&&(sfx.length>=20||(V173.n++&1)))return;return _s.apply(this,arguments);};}
// ---- 光影：攔截畫布 shadowBlur（只在關閉時歸零）----
function v173Glow(){try{const cx=document.getElementById('game').getContext('2d');if(cx.__v173)return;const P=Object.getOwnPropertyDescriptor(CanvasRenderingContext2D.prototype,'shadowBlur');if(!P||!P.set)return;
  Object.defineProperty(cx,'shadowBlur',{configurable:true,get(){return P.get.call(this);},set(v){P.set.call(this,CFG173.glow?v:0);}});cx.__v173=true;}catch(e){}}
// ---- 傷害數字、名牌、色弱血條、受擊效果 ----
{const _fl=floater;floater=function(x,y,text,col){if(!CFG173.dmgNum&&typeof text==='string'&&/^-\d/.test(text))return;return _fl(x,y,text,col);};}
V173.inU=0;
{const _lb=label;label=function(t,x,y,c,f){if(V173.inU&&CFG173.np==='off')return;return _lb(t,x,y,c,f);};}
{const _d=drawHuman;drawHuman=function(u){V173.inU++;try{return _d(u);}finally{V173.inU--;}};}
{const _d=drawBandit;drawBandit=function(e){V173.inU++;try{return _d(e);}finally{V173.inU--;}};}
{const _d=drawBeast;drawBeast=function(e){V173.inU++;try{return _d(e);}finally{V173.inU--;}};}
const CB173={'#5fe06a':'#4aa8ff','#ff4a4a':'#ffa030','#ff7a6a':'#ffb060','#7fe07a':'#5ab4ff'};
{const _br=bar;bar=function(x,y,w,frac,col){if(CFG173.cb&&CB173[col])col=CB173[col];return _br(x,y,w,frac,col);};}
// ---- 鏡頭速度與邊緣捲動 ----
addEventListener('mousemove',ev=>{V173.mx=ev.clientX;V173.my=ev.clientY;},{passive:true});
document.addEventListener('mouseleave',()=>{V173.mx=V173.my=-1;});addEventListener('blur',()=>{V173.mx=V173.my=-1;});
{const _uc=updateCamera;updateCamera=function(dt){const x0=cam.x,y0=cam.y;_uc(dt);const k=(+CFG173.camSp||100)/100;
  if(!cam.follow&&k!==1&&(keys.ShiftLeft||keys.ShiftRight)){cam.x=x0+(cam.x-x0)*k;cam.y=y0+(cam.y-y0)*k;}
  let ex=0,ey=0;if(CFG173.edge&&!isTouchUI&&V173.mx>=0&&!uiBlock()){const m=14;if(V173.mx<m)ex=-1;else if(V173.mx>innerWidth-m)ex=1;if(V173.my<m)ey=-1;else if(V173.my>innerHeight-m)ey=1;}
  const P=V173.padCam;if(P&&(Math.abs(P.x)>0.2||Math.abs(P.y)>0.2)){ex+=P.x;ey+=P.y;}
  if(ex||ey){const sp=600*dt/cam.zoom*k;cam.x+=ex*sp;cam.y+=ey*sp;cam.follow=false;cam.x=clamp(cam.x,-N*HW,N*HW);cam.y=clamp(cam.y,0,N*TH);}};}
// ---- 失去焦點暫停 ----
addEventListener('blur',()=>{try{if(!CFG173.blurPause||(typeof NET!=='undefined'&&NET&&NET.role))return;if(titleOpen||deathOpen||V47.pause||!S||!S.units)return;openPause(true);}catch(e){}});
// ---- 按鍵綁定：在 g7 遊戲按鍵前把實體按鍵換成動作的預設按鍵 ----
function v173Map(code){const K=CFG173.keys;let hit=null;for(const a of ACT173){if(v173Key(a[0])===code){hit=a;break;}}if(hit)return hit[2];
  for(const a of ACT173)if(a[2]===code&&K[a[0]]&&K[a[0]]!==code)return '';return code;}
function v173Synth(type,code,src){const ev=new KeyboardEvent(type,{code,key:code==='Space'?' ':(code.startsWith('Key')?code.slice(3).toLowerCase():code),bubbles:true,cancelable:true,shiftKey:!!(src&&src.shiftKey),ctrlKey:!!(src&&src.ctrlKey),altKey:!!(src&&src.altKey),metaKey:!!(src&&src.metaKey),repeat:!!(src&&src.repeat)});V173.syn.add(ev);((src&&src.target)||document.body).dispatchEvent(ev);}
function v173KeyCap(ev){if(V173.syn.has(ev))return;
  if(V173.listen&&ev.type==='keydown'){ev.preventDefault();ev.stopImmediatePropagation();if(ev.code!=='Escape')v173Bind(V173.listen,ev.code);V173.listen=null;v173Render();return;}
  if(ev.target&&/^(INPUT|TEXTAREA|SELECT)$/.test(ev.target.tagName))return;
  if(ev.ctrlKey||ev.metaKey||ev.altKey)return;
  const to=v173Map(ev.code);if(to===ev.code)return;ev.preventDefault();ev.stopImmediatePropagation();if(to==='')return;v173Synth(ev.type,to,ev);}
addEventListener('keydown',v173KeyCap,true);addEventListener('keyup',v173KeyCap,true);
function v173Bind(a,code){const D=V173.draft;if(!D)return;const cur=k=>D.keys[k]||(ACT173.find(x=>x[0]===k)||[])[2];const old=cur(a);
  for(const x of ACT173)if(x[0]!==a&&cur(x[0])===code){D.keys[x[0]]=old;}D.keys[a]=code;for(const x of ACT173)if(D.keys[x[0]]===x[2])delete D.keys[x[0]];}
// ---- 手把（Gamepad API）：每畫面輪詢，按鍵轉成同一套動作按鍵 ----
const PAD173={0:'KeyV',1:'Space',2:'KeyQ',3:'KeyE',4:'KeyR',5:'KeyT',6:'KeyZ',7:'KeyF',8:'KeyM',9:'Escape',12:'KeyW',13:'KeyS',14:'KeyA',15:'KeyD'};
function v173Pad(){if(!CFG173.pad){if(V173.padAx){joy.x=joy.y=0;joy.active=false;V173.padAx=false;}V173.padCam=null;return;}
  const g=XW_PLAT.pads()[0];if(!g){V173.padCam=null;return;}V173.padName=g.id;
  const ax=g.axes||[],lx=ax[0]||0,ly=ax[1]||0,m=Math.hypot(lx,ly);
  if(m>0.2){joy.x=lx;joy.y=ly;joy.active=true;V173.padAx=true;cam.follow=true;}else if(V173.padAx){joy.x=joy.y=0;joy.active=false;V173.padAx=false;}
  V173.padCam={x:ax[2]||0,y:ax[3]||0};
  const bs=g.buttons||[];for(const i in PAD173){const b=bs[i];const on=!!(b&&(b.pressed||b.value>0.5));const was=!!V173.padPrev[i];if(on!==was){V173.padPrev[i]=on;v173Synth(on?'keydown':'keyup',PAD173[i],null);}}}
{const _f=frame;frame=function(now){try{v173Pad();}catch(e){}return _f(now);};}
// ---- 設定畫面 ----
function v173Draft(){return JSON.parse(JSON.stringify(CFG173));}
function v173Dirty(){const D=V173.draft;if(!D)return false;return JSON.stringify(D)!==JSON.stringify(CFG173);}
function v173Esc(s){return String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'})[c]);}
function v173Val(o,v){if(o.t==='sl')return v+(o.u||'');if(o.t==='tg')return v?TXT173.on:TXT173.off;const x=(o.o||[]).find(p=>p[0]===v);return x?x[1]:String(v);}
function v173Row(o){const v=V173.draft[o.k];let c='';
  if(o.t==='sl')c=`<input type="range" min="${o.min}" max="${o.max}" step="${o.step}" value="${v}" data-s173v="${o.k}"><b class="s173n">${v173Val(o,v)}</b>`;
  else c=`<button class="btn s173a" data-s173c="${o.k}" data-dir="-1">◀</button><b class="s173n">${v173Esc(v173Val(o,v))}</b><button class="btn s173a" data-s173c="${o.k}" data-dir="1">▶</button>`;
  let pv='';if(o.pv&&o.k==='cb')pv=`<span class="s173pv"><i style="background:${v?'#4aa8ff':'#5fe06a'}"></i>友方 <i style="background:${v?'#ffa030':'#ff4a4a'}"></i>敵方</span>`;
  if(o.k==='full'&&!XW_PLAT.canFull())pv=`<span class="dim">${TXT173.fsNo}</span>`;
  return `<div class="s173r${V173.draft[o.k]!==o.def?' chg':''}" data-s173k="${o.k}"><div class="s173l"><span class="s173t">${o.n}</span><span class="s173d">${o.d}</span>${pv}</div><div class="s173c">${c}</div></div>`;}
function v173KeysHtml(){const D=V173.draft;let h=`<div class="s173sec">${TXT173.keys}</div><div class="dim sm">${TXT173.keyNote}</div><div class="s173kg">`;
  for(const a of ACT173){const cur=D.keys[a[0]]||a[2];const L=V173.listen===a[0];h+=`<div class="s173k${cur!==a[2]?' chg':''}"><span>${a[1]}</span><button class="btn${L?' pri':''}" data-s173b="${a[0]}">${L?TXT173.press:v173KeyName(cur)}</button></div>`;}
  const g=XW_PLAT.pads()[0];h+=`</div><div class="s173sec">${TXT173.pad}</div><div class="dim sm">${g?TXT173.padOn+v173Esc(g.id):TXT173.padNone}</div>`;return h;}
function v173Legacy(el){const out={};const add=(t,n)=>{(out[t]=out[t]||[]).push(n);};
  for(const n of Array.from(el.children)){if(n.tagName==='H3'||(n.matches&&n.matches('[data-g="close"]')))continue;const tx=(n.textContent||'').trim();
    const t=/^(字體大小|頭像列|面板位置)/.test(tx)?'hud':/自動存檔|突破、建築完成|存檔位置/.test(tx)?'save':'game';add(t,n);}return out;}
function v173Render(){const el=document.getElementById('settings');if(!el||!V173.draft)return;const L=V173.legacy||{};const T=V173.tab;
  const opts=OPT173.filter(o=>o.tab===T).map(v173Row).join('');
  el.innerHTML=`<div class="s173"><div class="s173h"><h3>${TXT173.title}</h3><span class="dim sm">${TXT173.ver} ${xwDispVer()}</span><button class="btn x" data-s173="cancel">✖</button></div>
  <div class="s173b"><div class="s173tabs">${TXT173.tabs.map(([k,n])=>`<button class="btn${k===T?' on':''}" data-s173t="${k}">${n}</button>`).join('')}</div>
  <div class="s173p scroll">${opts}${T==='ctl'?v173KeysHtml():''}<div class="s173lg"></div></div></div>
  <div class="s173f"><span class="s173m">${v173Dirty()?TXT173.dirty:(V173.msg||'')}</span><button class="btn" data-s173="reset">${TXT173.reset}</button><button class="btn" data-s173="cancel">${TXT173.cancel}</button><button class="btn pri" data-s173="apply">${TXT173.apply}</button></div></div>`;
  const lg=el.querySelector('.s173lg');const ns=L[T]||[];if(ns.length){const h=document.createElement('div');h.className='s173sec';h.textContent=TXT173.live;lg.appendChild(h);for(const n of ns)lg.appendChild(n);}}
{const _os=openSettings;openSettings=function(){const el=document.getElementById('settings');const was=el&&el.classList.contains('open')&&V173.draft;
  _os();if(!el)return;V173.legacy=v173Legacy(el);if(!was){V173.draft=v173Draft();V173.msg='';V173.listen=null;}el.classList.add('s173o');v173Render();el.classList.add('open');V173.open=true;};}
function v173Close(){const el=document.getElementById('settings');if(el)el.classList.remove('open');V173.draft=null;V173.listen=null;V173.open=false;}
function v173Act(a){const D=V173.draft;if(!D)return;
  if(a==='apply'){const prev=JSON.parse(JSON.stringify(CFG173));for(const o of OPT173)CFG173[o.k]=D[o.k];CFG173.keys=JSON.parse(JSON.stringify(D.keys));v173Save();v173Apply(prev);V173.msg=TXT173.applied;v173Render();}
  else if(a==='cancel')v173Close();
  else if(a==='reset'){for(const o of OPT173)if(o.tab===V173.tab)D[o.k]=o.def;if(V173.tab==='ctl')D.keys={};V173.msg='';v173Render();}}
document.addEventListener('click',ev=>{const t=ev.target&&ev.target.closest&&ev.target.closest('[data-s173],[data-s173t],[data-s173c],[data-s173b]');if(!t||!t.closest('#settings'))return;ev.stopPropagation();
  if(t.dataset.s173){v173Act(t.dataset.s173);return;}
  if(t.dataset.s173t){V173.tab=t.dataset.s173t;V173.listen=null;v173Render();const p=document.querySelector('#settings .s173p');if(p)p.scrollTop=0;return;}
  if(t.dataset.s173b){V173.listen=V173.listen===t.dataset.s173b?null:t.dataset.s173b;v173Render();return;}
  const o=OPT173.find(x=>x.k===t.dataset.s173c);if(!o)return;const D=V173.draft,dir=+t.dataset.dir||1;
  if(o.t==='tg')D[o.k]=D[o.k]?0:1;else{const L=o.o,i=L.findIndex(p=>p[0]===D[o.k]);D[o.k]=L[((i<0?0:i)+dir+L.length)%L.length][0];}V173.msg='';v173Render();},true);
document.addEventListener('input',ev=>{const t=ev.target;if(!t||!t.dataset||!t.dataset.s173v||!V173.draft)return;const o=OPT173.find(x=>x.k===t.dataset.s173v);if(!o)return;V173.draft[o.k]=+t.value;
  const n=t.parentNode.querySelector('.s173n');if(n)n.textContent=v173Val(o,+t.value);const r=t.closest('.s173r');if(r)r.classList.toggle('chg',+t.value!==o.def);const m=document.querySelector('#settings .s173m');if(m)m.textContent=v173Dirty()?TXT173.dirty:'';});
document.addEventListener('fullscreenchange',()=>{CFG173.full=XW_PLAT.isFull()?1:0;if(V173.draft)V173.draft.full=CFG173.full;});
// legacy 的「關閉」與 Esc 關閉時也丟掉草稿
new MutationObserver(()=>{const el=document.getElementById('settings');if(el&&!el.classList.contains('open')&&V173.open){V173.draft=null;V173.listen=null;V173.open=false;}}).observe(document.getElementById('settings'),{attributes:true,attributeFilter:['class']});
const V173_CSS=`#settings.s173o{width:min(880px,calc(100% - 16px));max-height:calc(100% - var(--tb) - 20px);padding:0;overflow:hidden}
#settings.s173o.open{display:flex;flex-direction:column}
.s173{display:flex;flex-direction:column;min-height:0;height:min(600px,calc(100vh - var(--tb) - 24px))}
.s173h{display:flex;align-items:center;gap:10px;padding:8px 12px;border-bottom:1px solid #6a4f2a;background:linear-gradient(90deg,#2c1f10,#1e150c)}
.s173h h3{margin:0;flex:1;letter-spacing:.1em}
.s173b{display:flex;flex:1;min-height:0}
.s173tabs{display:flex;flex-direction:column;gap:3px;padding:8px;min-width:150px;border-right:1px solid #4a3620;background:#1a120a}
.s173tabs .btn{text-align:left;padding:8px 10px;font-size:calc(14px * var(--xwfs,1));background:transparent;border-color:transparent}
.s173tabs .btn.on{background:#5a3f1c;border-color:#e0b860;color:#fff3c8;box-shadow:inset 3px 0 0 #ffd27a}
.s173p{flex:1;overflow-y:auto;padding:6px 14px 12px}
.s173r{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:8px 6px;border-bottom:1px solid #3a2a18}
.s173r:hover{background:#2a1d0f}
.s173r.chg .s173t::after,.s173k.chg span::after{content:' •';color:#ffd27a}
.s173l{display:flex;flex-direction:column;min-width:0;flex:1}
.s173t{color:#f3e2b8;font-size:calc(14px * var(--xwfs,1))}
.s173d{color:#a8987a;font-size:calc(12px * var(--xwfs,1));line-height:1.4}
.s173c{display:flex;align-items:center;gap:6px;flex-shrink:0}
.s173c .s173n{min-width:66px;text-align:center;color:#ffe9a0}
.s173c input[type=range]{width:150px;accent-color:#d8a84a}
.s173a{padding:3px 9px}
.s173pv{font-size:calc(12px * var(--xwfs,1));color:#c8b890}.s173pv i{display:inline-block;width:22px;height:5px;margin:0 3px 1px 6px;vertical-align:middle}
.s173sec{margin:12px 0 4px;color:#f3d48a;font-weight:bold;border-top:1px solid #4a3620;padding-top:8px}
.s173kg{display:grid;grid-template-columns:repeat(auto-fill,minmax(210px,1fr));gap:4px 12px;margin-top:4px}
.s173k{display:flex;justify-content:space-between;align-items:center;padding:3px 0;border-bottom:1px solid #2e2214}
.s173k .btn{min-width:64px}
.s173f{display:flex;align-items:center;gap:8px;padding:8px 12px;border-top:1px solid #6a4f2a;background:#1a120a}
.s173m{flex:1;color:#ffd27a;font-size:calc(12px * var(--xwfs,1))}
.s173lg .trow{padding:6px}
body.v173nohint #hint,body.v173nohint .ohint{display:none!important}
@media (max-width:640px){.s173b{flex-direction:column}.s173tabs{flex-direction:row;overflow-x:auto;min-width:0;border-right:0;border-bottom:1px solid #4a3620}.s173tabs .btn{white-space:nowrap}.s173r{flex-wrap:wrap}.s173c input[type=range]{width:110px}}`;
{const st=document.createElement('style');st.id='v173css';st.textContent=V173_CSS;document.head.appendChild(st);}
setTimeout(()=>{v173Glow();try{v173Apply(null);}catch(e){}},0);
SYS_TXT.push(['設定','畫面、音效、按鍵、介面、遊戲性、存檔、輔助七類設定',()=>`<span class="tg">套用／取消／恢復預設值</span><span class="tg">按鍵可重新綁定</span><span class="tg">支援標準手把</span><span class="tg">幀率上限、解析度、特效</span><span class="tg">色弱模式</span><br>暫停選單「⚙ 設定」或標題畫面開啟。`]);
// ======================= 離線玩家角色：腳下顯示「離線修煉中」（u.netOff 由聯機層標記；單機／房主端即時，成員端看加入時的狀態） =======================
const TXT_OFF='離線修煉中';
{const _dh=drawHuman;drawHuman=function(u){_dh(u);try{if(!u||!u.netOff||u.dead||u.inside)return;const b=P(u.x,u.y);label(TXT_OFF,b.x,b.y+14,'#b9c6d8','10px sans-serif');}catch(e){}};}
// ======================= #135 仙緣不再是任何突破的條件（只保留 #128 成功率加成） =======================
lianqiNeedXY=function(){return 0;};
const V135_RX=/^(仙緣 ?≥|身具靈根（)/;
{const _bc=breakConds;breakConds=function(u){const c=_bc.apply(this,arguments);try{if(c&&Array.isArray(c.list)){c.list=c.list.filter(x=>!(x&&typeof x.t==='string'&&V135_RX.test(x.t)));c.ok=c.list.every(x=>x.ok);}}catch(e){}return c;};}
function v135Txt(h){return typeof h==='string'?h.replace(/＋靈根或仙緣＋/g,'＋').replace(/靈根或仙緣、/g,'').replace(/＋仙緣＋/g,'＋').replace('需仙緣入煉氣','靠功法入煉氣'):h;}
{const _gb=guideBody;guideBody=function(c){return v135Txt(_gb.apply(this,arguments));};}
try{for(const A of [HINTS_PC,HINTS_TOUCH])for(let i=0;i<A.length;i++)A[i]=v135Txt(A[i]);}catch(e){}
try{if(RT&&RT.none)RT.none.s=v135Txt(RT.none.s);}catch(e){}
try{const f0=SYS_TXT[0][2];SYS_TXT[0][2]=function(){return v135Txt(f0.apply(this,arguments));};}catch(e){}
{const _x=XW045;XW045=function(){const o=_x();try{initV049();}catch(e){console.warn('v049 init',e);}try{v49UiInit();try{v50UiInit();v50ObjCss();v50ObjInit();v53Css();v53Bar();v55Init();try{v57Init();v58Css();v59Css();}catch(e){console.warn('v57-59',e);}}catch(e){console.warn('v50ui',e);}}catch(e){console.warn('v049 ui',e);}
  o.v49={V49,SYS_TXT,ui:{fmt:v49Fmt,ovK:v49OvK,layout:()=>v49Layout(true),sa:()=>v49SA(true),panelBars:()=>v49PanelBars()},get st(){return v49St();},qiMaxFor,gqMaxFor,v49SyncPools,v49CultCheck,v49Lingwu,v49Tihu,lwChance,thChance,hallMul,playerHallRate,v49Resume,v49Batch,v49Smelt,smeltYield,batchCost,v49Trial,xqTarget,v49Lv,v49CalcLv,B49,v49BuildTarget,bdMul,v49TitleStart,
    dgCapScale:()=>v49DgOv,_:{tick:dt=>v49Tick(dt),V173,CFG173,OPT173,ACT173,v173T:{openSettings:()=>openSettings(),openPause:o=>openPause(o),floater:(...a)=>floater(...a),label:(...a)=>label(...a),bar:(...a)=>bar(...a),nFloaters:()=>floaters.length},XW_PLAT,v173Apply,v173Map,v173Render,v173Act,v173Pad,v173Res,v173Vol,V156,CHANGELOG,V175,v175Show,v175Close,v175Check,XW_PREFS,V171,v171Want:(u)=>v171Want(u),v171Tick:dt=>v171Tick(dt),v171B:()=>v171B(),v172Decide:(a,b)=>v172Decide(a,b),v172Chance:(a,b)=>v172Chance(a,b),V170,v170Tick:dt=>v170Tick(dt),v170Succ:(u,b,c)=>v170Succ(u,b,c),v170Bld:u=>v170Bld(u),v170Thr:(u,V)=>v170Thr(u,V),v170Ready:u=>v170Ready(u),evTrigger:(k,src)=>evTrigger(k,src),V138,V149,V158,V164,V165,v165SitHost:(u,b)=>v165SitHost(u,b),throneOccupant:b=>throneOccupant(b),v169Seats:b=>v169Seats(b),v165StandHost:u=>v165StandHost(u),v165Sit:()=>v165Sit(),hallRate:b=>hallRate(b),V168,v168Pick:()=>v168Pick(),v62Sim:o=>{V62SIM=o;},v165Boost:(u,b,J,m)=>v165Boost(u,b,J,m),v165Txt:u=>v165Txt(u),v164Area:()=>v164Area(),v162See:(e,p)=>v162See(e,p),v51RName:e=>v51RName(e),v51Lad:()=>v51Lad(),v158Ui:()=>v158Ui(),saveRt:()=>{const d=JSON.parse(JSON.stringify(snapshot()));applySave(d);return d;},v158Slots:()=>v158Slots(),v158Key:i=>v158Key(i),v158CastAb:(p,ab,q)=>v158CastAb(p,ab,q),v158Learned:p=>v158Learned(p),v158Set:(i,a)=>v158Set(i,a),v158Drop:(i,d)=>v158Drop(i,d),V159,V160,V161,v161Open:()=>v161Open(),v161Blk:(i,j,v)=>{if(v!=null)block[j*N+i]=v;return block[j*N+i];},v161Comp:()=>computeComp(),v159Idx:e=>v159Idx(e),V156,V157,v157Kb:(u,x,y,d)=>v157Kb(u,x,y,d),v156Cap:()=>v156Cap(),v51Realm:e=>v51Realm(e),v61QiMul:u=>v61QiMul(u),v62Cult:(u,l)=>v62Cult(u,l),v62Loc:(u,m,b)=>v62Loc(u,m,b),v62Txt:u=>v62Txt(u),pgx:()=>V49.pgx||0,cultLoc:(u,m,b)=>cultLoc(u,m,b),updateSect:dt=>updateSect(dt),tickEvents:dt=>tickEvents(dt),V56,v56Scale:d=>v56Scale(d),V57,v57TpP:u=>v57TpP(u),v57XsN:u=>v57XsN(u),v57Capped:(u,k)=>v57Capped(u,k),v57CultBuff:(u,p,d)=>v57CultBuff(u,p,d),V58,v58Busy:()=>v58BusyWhy(),v58Q:()=>v58Q(),v58Open:()=>v58Open(),v58Ui:()=>v58Ui(),V59_K,v59P:u=>v59P(u),v59Lv:(u,k)=>v59Lv(u,k),v59Mig:()=>v59Mig(),V60,v60Find:(n,v)=>v60Find(n,v),V55,v55SetTab:t=>v55SetTab(t),v54XyBonus:(u,k)=>v54XyBonus(u,k),breakFail:u=>breakFail(u),selE:id=>{selOther={k:'e',id};selUnits=[];selBuilding=null;panelKeyCache=null;},v53Cap:k=>v53Cap(k),v53Depot:u=>v53Depot(u),v53Clamp:()=>v53Clamp(),v53Mig:()=>v53Mig(),V53,v53Per:b=>v53Per(b),v52N:r=>v52N(r),v52SubName:(r,s)=>v52SubName(r,s),v52Mig:u=>v52Mig(u),v52MigAll:()=>v52MigAll(),V52,needAt:(r,s)=>needAt(r,s),oldNeed:(r,s)=>_v52oldNeed(r,s),cumXiu:(r,s)=>cumXiu(r,s),advanceSub:u=>advanceSub(u),gainXiu:(u,a)=>gainXiu(u,a),realmName:u=>realmName(u),breakConds:u=>breakConds(u),brkHtml:u=>brkHtml(u),subLadder:p=>subLadder(p),qiMaxFor:u=>qiMaxFor(u),xqTarget:u=>xqTarget(u),v51Realm:e=>v51Realm(e),v51RName:e=>v51RName(e),v51Col:e=>v51Col(e),enemyName:e=>enemyName(e),v51GfGive:(s,g)=>v51GfGive(s,g),V51,dgBossDown:e=>dgBossDown(e),dgExit:k=>dgExit(k),EVENTS,AUC_LOTS,v50Route:()=>v50Route(),v50Guards:()=>v50Guards(),v50GuardRed:b=>v50GuardRed(b),v50GuardTxt:()=>v50GuardTxt(),v50OpenSeams:()=>v50OpenSeams(),v50Unstuck:()=>v50Unstuck(),v50ObjGo:k=>v50ObjGo(k),v50ObjTarget:k=>v50ObjTarget(k),checkObj:()=>checkObjectives(),updObj:()=>updateObjectives(),safeSpot:u=>v46SafeSpot(u),retreat:u=>v46Retreat(u),v50RetreatTick:()=>v50RetreatTick(),rebuildBlock:()=>rebuildBlock(),dmgBuilding:(s,b,a)=>dmgBuilding(s,b,a),yaoStrike:o=>v48YaoStrike(o),pathTo:(u,x,y)=>pathTo(u,x,y),get startComp(){return startComp;},compAt:(i,j)=>comp[j*N+i],blockAt:(i,j)=>block[j*N+i],dgUpdate:dt=>dgUpdate(dt),upd:dt=>update(dt),enemyById:id=>enemyById(id),bossOn:e=>v49BossOn(e),bdescHtml:b=>bdescHtml(b),pbSel:ids=>{pbSelIds(ids);panelKeyCache=null;},V50,v50Fit:()=>v50Fit(),v50More:()=>v50More(),v50Grid:o=>v50Grid(o),v50JobMarks:()=>v50JobMarks(),v50CbClean:()=>v50CbClean(),v48Hud:()=>v48Hud(),REALMS,bossLog:()=>V49.bossLog||[],MV:V49MV,BP:V49BP,drawHuman:u=>drawHuman(u),guideBody:c=>guideBody(c),dgSpawnRoom:r=>dgSpawnRoom(r),dgPartyScale:()=>dgPartyScale(),enterInterior:b=>enterInterior(b),startUpgrade:b=>startUpgrade(b),dmgUnit:(s,u,a)=>dmgUnit(s,u,a),castSpell:(u,e,k)=>castSpell(u,e,k),tryAbilities:(u,e,m)=>tryAbilities(u,e,m),openCraft:b=>openCraft(b),cultMul:u=>cultMul(u),inJobMul:(u,b,J)=>inJobMul(u,b,J),INJOB,gainXiu:(u,a)=>gainXiu(u,a),setTask:(u,t)=>setTask(u,t),get selBuilding(){return selBuilding;},set selBuilding(v){selBuilding=v;panelKeyCache=null;},jobButtons:us=>jobButtons(us),makeItem:(t,q)=>makeItem(t,q)}};return o;};}
