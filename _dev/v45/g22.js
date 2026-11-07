// ======================= v0.4.7 第二批（g22）：村莊成長、食堂／睡眠、丹藥、渡劫、宗門任務、倒地救援、護宗陣、山寨 =======================
// 自成一檔：只靠包裝既有函式掛勾，不被其他檔案引用（聯機建置漏掉本檔也不會壞）。前綴 y47。
const Y47={};
// ---------- #11 村莊規模成長：小村→市鎮五級，村衛 10～30 名，民居與村民跟著增加 ----------
TUNE.y47v={lvN:['小村','村落','大村','村鎮','市鎮'],need:[0,60,180,360,600],guards:[10,15,20,25,30],houses:[0,2,4,6,8],villagers:[5,6,8,10,12],recruitT:30,passive:60};
function y47VG(v){if(!v.g47)v.g47={lv:1,gp:0,h:[],rt:0,pt:0};return v.g47;}
function y47VLv(v){return v&&v.type!=='bandit'?y47VG(v).lv:0;}
function y47GuardCap(v){return TUNE.y47v.guards[Math.max(0,y47VLv(v)-1)]||10;}
function y47HouseOk(v,i,j){const s=2;for(let y=j-1;y<j+s+1;y++)for(let x=i-1;x<i+s+1;x++){if(!inMap(x,y))return false;const k=y*N+x;if(block[k]||roadMask[k]||occ[k]||nodeGrid[k])return false;const t=terrain[k];if(t===T.WATER||t===T.SHALLOW||t===T.CLIFF||t===T.RUIN)return false;}
  const c=comp[j*N+i];if(!c)return false;const vc=nearestFree(v.x,v.y,-1);if(!vc||comp[vc.j*N+vc.i]!==c)return false;
  const ents=S.units.concat(S.npcs,S.wand,S.cands,S.enemies);for(const e of ents){if(e&&e.x>i-0.6&&e.x<i+s+0.6&&e.y>j-0.6&&e.y<j+s+0.6)return false;}
  for(const b of S.buildings){const bs=BUILD[b.type].size;if(i<b.i+bs+2&&i+s+2>b.i&&j<b.j+bs+2&&j+s+2>b.j)return false;}
  return true;}
function y47AddHouseStruct(v,i,j,k){S.vstructs.push({id:9600+v.id*20+k,vid:v.id,type:'vhouse',i,j,s:2,hp:0,maxhp:0,dead:false,g47:1});}
function y47AfterBlock(){rebuildBlock();try{const st=nearestFree(ANCH.start.x,ANCH.start.y,-1);if(st)startComp=comp[st.j*N+st.i];}catch(e){}try{chunkDirtyAll();}catch(e){}}
function y47GrowHouse(v){const G=y47VG(v);for(let t=0;t<80;t++){const a=rnd()*Math.PI*2,r=6+rnd()*5;const i=Math.round(v.x+Math.cos(a)*r-1),j=Math.round(v.y+Math.sin(a)*r-1);
    if(y47HouseOk(v,i,j)){G.h.push([i,j]);y47AddHouseStruct(v,i,j,G.h.length);y47AfterBlock();if(inView(i,j,40))fx('break',i+1,j+1,'#ffe8a0');return true;}}return false;}
function y47VillageTick(dt){if(S.dg||(typeof v49Client==='function'&&v49Client()))return;const T=TUNE.y47v;
  for(const v of S.villages){if(v.type==='bandit'||v.destroyed)continue;const G=y47VG(v),st=vStatus(v);
    G.pt+=dt;if(G.pt>=T.passive){G.pt=0;if(st!=='hostile')y47VGain(v,1+Math.max(0,v.rel)/20);}
    // 民居補到等級需要的數量
    if(G.h.length<T.houses[G.lv-1]&&rnd()<0.2)y47GrowHouse(v);
    // 村衛：低於名額時每 30 秒招一名鄉勇（敵對時不招）
    v.guards=v.guards||[];G.rt+=dt;
    if(st!=='hostile'&&v.guards.length<y47GuardCap(v)&&G.rt>=T.recruitT){G.rt=0;const ga=rnd()*Math.PI*2,gr=3+rnd()*(4+G.lv);const f=nearestFree(v.x+Math.cos(ga)*gr,v.y+Math.sin(ga)*gr,-1);
      if(f){const rl=G.lv>=5&&rnd()<0.3?2:G.lv>=3&&rnd()<0.5?1:0;const rec={name:randName(),body:0,realm:rl,maxhp:60+rl*40,atk:6+rl*3};v.guards.push(rec);S.npcs.push(makeGuard(v,rec,f.i+0.5,f.j+0.5));}}
    // 村民人數隨等級增加
    const nv=S.npcs.filter(o=>o.vid===v.id&&!o.guard).length;if(nv<T.villagers[G.lv-1]&&rnd()<0.1){const f=nearestFree(v.x+(rnd()-0.5)*8,v.y+(rnd()-0.5)*8,-1);if(f&&!inView(f.i,f.j,60))S.npcs.push(makeVillager(v,f.i+0.5,f.j+0.5));}}}
function y47VGain(v,n){const T=TUNE.y47v,G=y47VG(v);if(G.lv>=T.need.length){G.gp=T.need[T.need.length-1];return;}G.gp+=n;
  while(G.lv<T.need.length&&G.gp>=T.need[G.lv]){G.lv++;toast(`🏘 ${v.name}發展成「${T.lvN[G.lv-1]}」！村衛名額 ${y47GuardCap(v)} 名，民居與村民也會增加`);}}
// 關係上升（委託、交易、守村）同時累積發展度
{const _sr=setRel;setRel=function(v,d){const r=_sr.apply(this,arguments);try{if(v&&v.type!=='bandit'&&d>0&&!(typeof v49Client==='function'&&v49Client()))y47VGain(v,d);}catch(e){}return r;};}
// 流浪者投靠：名額用村莊等級
{const _jf=joinFaction;joinFaction=function(w,v){const o=TUNE.guardsPer;try{if(v&&v.type!=='bandit')TUNE.guardsPer=y47GuardCap(v);}catch(e){}try{return _jf.apply(this,arguments);}finally{TUNE.guardsPer=o;}};}
// 交易所面板顯示村莊規模
{const _rt=renderTrade;renderTrade=function(){_rt.apply(this,arguments);try{if(tradeOpen==null)return;const v=vById(tradeOpen),el=$('trade');if(!v||!el||v.type==='bandit')return;const T=TUNE.y47v,G=y47VG(v);
  let d=el.querySelector('.y47vg');if(!d){d=document.createElement('div');d.className='y47vg';d.style.cssText='font-size:13px;margin:4px 0;color:#e8dcc0';const h=el.querySelector('h3');if(h)h.after(d);else el.prepend(d);}
  const nx=T.need[G.lv],pc=nx?Math.min(100,Math.round(100*G.gp/nx)):100;
  const t=`🏘 規模：<b>${T.lvN[G.lv-1]}</b>（${G.lv}/5）　村衛 ${(v.guards||[]).length}/${y47GuardCap(v)}　${nx?`發展度 ${Math.floor(G.gp)}/${nx}（${pc}%）`:'已是最大規模'}<div class="dim sm">完成委託、交易、幫忙守村會讓村莊發展；村莊越大，村衛越多。</div>`;
  if(d.dataset.t!==t){d.dataset.t=t;d.innerHTML=t;}}catch(e){}};}
// 村衛多了以後名牌太擠：只在鏡頭拉近（或村衛正在迎敵）時顯示
drawGuardMark=function(n){const b=P(n.x,n.y);ctx.strokeStyle='#b8b8c0';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(b.x+7,b.y-2);ctx.lineTo(b.x+7,b.y-30);ctx.stroke();ctx.lineWidth=1;poly([{x:b.x+5,y:b.y-30},{x:b.x+9,y:b.y-30},{x:b.x+7,y:b.y-36}],'#d8d8e0');
  if(cam.zoom>=1.35||(cam.zoom>=0.9&&n.gT!=null))label('村衛・'+n.name,b.x,b.y-40,'#cfe8ff');};
// 存檔
{const _s=snapshot;snapshot=function(){const d=_s.apply(this,arguments);try{d.vg47=S.villages.filter(v=>v.g47).map(v=>[v.id,v.g47]);}catch(e){}return d;};}
{const _a=applySave;applySave=function(d){const r=_a.apply(this,arguments);try{if(d&&d.vg47){let add=false;for(const [id,g] of d.vg47){const v=vById(id);if(!v)continue;v.g47=Object.assign({lv:1,gp:0,h:[],rt:0,pt:0},g);
      v.g47.h.forEach(([i,j],k)=>{if(!S.vstructs.some(s=>s.id===9600+v.id*20+k+1)){y47AddHouseStruct(v,i,j,k+1);add=true;}});}if(add)y47AfterBlock();}}catch(e){console.warn('y47 vg',e);}return r;};}
SYS_TXT.push(['村莊規模','村莊會從小村慢慢發展成市鎮，村衛 10～30 名',()=>`<span class="tg">五級：${TUNE.y47v.lvN.join('→')}</span><span class="tg">村衛名額 ${TUNE.y47v.guards.join('／')}</span><details class="dt"><summary>詳情</summary>完成委託、交易、幫忙擊退來襲的山賊，關係上升的同時也會累積村莊的發展度；不敵對時每分鐘也會自然成長一點。村莊升級後會蓋新民居、村民變多，並且每 45 秒招募一名鄉勇，直到村衛名額補滿。村衛會迎擊闖進村子的妖獸與山賊。</details>`]);

// ======================= v0.4.7 #78 食堂：煉氣以後辟穀 =======================
TUNE.y47f={meal:1,mood:15,eatP:0.65};
BUILD.shitang={name:'食堂',size:2,cost:{wood:50,stone:30,fiber:10},time:12,pop:0,hp:450,desc:''};
BDESC.shitang={s:'弟子用餐的地方，一餐只吃 1 份食物',t:b=>['每餐食物 1 份（在大殿吃要 2 份）',`吃完心情 +${TUNE.y47f.mood}`,'煉氣以上的弟子已辟穀，不必吃飯'],d:'肚子餓的弟子會優先走到最近的食堂吃飯：一餐只要 1 份食物（在大殿吃要 2 份），飯菜好吃，心情加得更多。弟子突破到「煉氣」以後就辟穀了，不會再餓。'};
BUILD.shitang.desc=BDESC.shitang.s+'。'+BDESC.shitang.d;
BUILD_ORDER.push('shitang');
B49.shitang={n:'五味調和',f:lv=>`用餐後心情再 +${5*lv}`};
V50L.shitang=b=>[['用餐','一餐 1 份食物，心情 +'+(TUNE.y47f.mood+5*blv(b))],['辟穀','煉氣以上的弟子不再需要吃飯'],['目前食物',Math.floor(S.res.food)+' 份']];
ROOM.shitang={R:5,fl:['#9a8462','#8f7a5a'],wl:['#7a4a2a','#8a5634'],trim:'#3a2410',st:[]};
ROOM_SOLID.shitang=[[1.2,1.4,0.5],[3.2,1.4,0.5],[1.2,3.2,0.5],[3.2,3.2,0.5],[4.0,0.3,0.4]];
DOOR_I.shitang=1;
{const _rf=roomFurniture;roomFurniture=function(b){if(b&&b.type==='shitang')return [['table',1.2,1.4],['table',3.2,1.4],['table',1.2,3.2],['table',3.2,3.2],['shelf',4.0,0.3]];return _rf(b);};}
{const _ds=drawBuildingShape;drawBuildingShape=function(type,i,j,t,alpha,b){if(type!=='shitang')return _ds(type,i,j,t,alpha,b);_ds(type,i,j,t,alpha,b);};}
function y47Bigu(u){return !!u&&u.realm>=4;}
function y47NearShitang(u){let best=null,bd=1e9;for(const b of S.buildings){if(b.type!=='shitang'||!b.built||b.broken)continue;const d=distRect(u.x,u.y,b.i,b.j,2);if(d<bd){bd=d;best=b;}}return best;}
{const _ad=aiDecide;aiDecide=function(u,force){if(u&&!y47Bigu(u)&&u.hunger>65&&S.res.food>=TUNE.y47f.meal&&hasBuilt('shitang')&&rnd()<TUNE.y47f.eatP){aiStart(u,'eat');if(u.aiJob&&u.aiJob.k==='eat')return 'eat';}
  if(u&&!y47Bigu(u)&&u.slp!=null&&((isNight()&&u.slp<TUNE.y47s.night)||u.slp<TUNE.y47s.low)&&!(u.hp<u.maxhp*0.35)){aiStart(u,'rest');if(u.aiJob){u.aiJob.y47sl=1;u.aiJob.until=Math.max(u.aiJob.until,S.time+40);}return 'rest';}
  return _ad.apply(this,arguments);};}
{const _as=aiStart;aiStart=function(u,k){const r=_as.apply(this,arguments);try{const a=u.aiJob;if(a&&k==='eat'&&!y47Bigu(u)){const b=y47NearShitang(u);if(b){const D=doorPt(b),f=nearestFree(D.x,D.y+0.3,unitComp(u));if(f){a.k='eat';a.tx=f.i+0.5;a.ty=f.j+0.5;a.y47st=b.id;u.thought=AI_ICON.eat;}}}}catch(e){}return r;};}
{const _dj=doAiJob;doAiJob=function(u,dt){const a=u.aiJob;if(a&&a.k==='eat'&&a.y47st!=null&&S.time<=a.until){const b=bById(a.y47st);if(!b||!b.built||b.broken){a.y47st=null;return _dj(u,dt);}
    const r=walkTo(u,dt,a.tx,a.ty,1.4);if(r===null){aiEnd(u);return;}if(r){const T=TUNE.y47f;if(S.res.food>=T.meal){S.res.food-=T.meal;u.hunger=0;u.mood=Math.min(100,(u.mood||60)+T.mood+5*blv(b));floater(u.x,u.y,'好吃！','#ffe9a0');}aiEnd(u);}return;}
  return _dj(u,dt);};}
// ======================= v0.4.7 #56 精力（睡眠值）：煉氣以後不需睡眠 =======================
TUNE.y47s={drain:520,work:1.3,sleepN:55,sleepD:85,doze:200,night:65,low:25,floor:0.65,full:50};
function y47Eff(u){if(!u||u.kind!=='disciple'||u.np||y47Bigu(u)||u.slp==null)return 1;const T=TUNE.y47s;return u.slp>=T.full?1:T.floor+(1-T.floor)*u.slp/T.full;}
function y47SleepTick(st){const T=TUNE.y47s,night=isNight();
  for(const u of S.units){if((u.kind!=='disciple'||u.np)||u.dead)continue;if(y47Bigu(u)){u.slp=100;u.hunger=0;continue;}if(u.slp==null)u.slp=60+rnd()*40;
    const a=u.aiJob,inHouse=u.inside&&(()=>{const b=bById(u.inB);return b&&b.type==='house';})();
    let d;if((a&&a.k==='rest')||u.job==='rest'||inHouse)d=st*100/(night?T.sleepN:T.sleepD);
    else if(a&&(a.k==='med'&&night&&a.y47sl||a.nap))d=st*100/T.doze;
    else d=-st*100/T.drain*(u.job&&u.job!=='rest'?T.work:1);
    u.slp=clamp(u.slp+d,0,100);
    if(u.slp<12)u.mood=Math.max(0,(u.mood||60)-st*0.08);
    if(a&&a.y47sl&&u.slp>=98&&!night)aiEnd(u);}}
UNIT_KEEP.push('slp','pk','pkc');
{const _gx=gainXiu;gainXiu=function(u,amt){if(u&&u.kind==='disciple'&&amt>0){const e=y47Eff(u);if(e<1)amt*=e;}return _gx.call(this,u,amt);};}
{const _ud=updateDisciple;updateDisciple=function(u,dt){if(u&&u.y47dj){u.dvx=u.dvy=0;u.path=[];u.working=false;return;}const e=y47Eff(u);if(e>=1)return _ud.apply(this,arguments);const g=u.gat;u.gat=g*e;try{return _ud.apply(this,arguments);}finally{u.gat=g;}};}
{const _uu=updateUnit;updateUnit=function(u,dt){if(u&&u.y47dj){u.dvx=u.dvy=0;u.path=[];return;}return _uu.apply(this,arguments);};}
{const _ta=tickAI;tickAI=function(dt){const r=_ta.apply(this,arguments);try{Y47.st=(Y47.st||0)+dt;if(Y47.st>=1){const st=Y47.st;Y47.st=0;if(!(typeof v49Client==='function'&&v49Client()))y47SleepTick(st);}}catch(e){console.warn(e);}return r;};}
// ======================= v0.4.7 #54 隨身丹藥：拿取數量可調；上限依境界（武徒 3，每大境界 +1）=======================
TUNE.y47p={hp:[0.3,0.4,0.5,0.6],cd:6,refillR:5,tick:0.5,cap0:3};
function y47PkCap(u){return (TUNE.y47p.cap0||3)+Math.max(0,(u&&u.realm)|0);} // 武徒=3，煉氣=4…
function y47PK(u){if(!u.pkc)u.pkc={on:1,n:y47PkCap(u),hp:0.4};if(!u.pk)u.pk={hx:[0,0,0]};if(!u.pk.hx)u.pk.hx=[0,0,0];
  // 舊存檔 n 可能是 0/3/5/8 循環值：改以境界上限為準（自動補滿也用上限）
  u.pkc.n=y47PkCap(u);return u.pk;}
function y47PkN(u){const a=y47PK(u).hx;return a[0]+a[1]+a[2];}
function y47PkNear(u){for(const b of S.buildings){if((b.type!=='hall'&&b.type!=='zongcang')||!b.built||b.broken)continue;if(distRect(u.x,u.y,b.i,b.j,BUILD[b.type].size)<=TUNE.y47p.refillR)return true;}return false;}
function y47PkUse(u){const pk=y47PK(u);if(!y47PkN(u)||u.dead||u.hp>=u.maxhp)return false;const sv=S.pills.hx;S.pills.hx=pk.hx;let ok=false;const t0=toast;toast=()=>{};try{ok=usePill(u,'hx');}finally{toast=t0;S.pills.hx=sv;}if(ok){u.y47pT=S.time;floater(u.x,u.y-0.6,'💊 自動服丹','#a8ffb0');}return ok;}
function y47PkTake(u,want){const pk=y47PK(u),cap=y47PkCap(u),have=y47PkN(u),room=Math.max(0,cap-have);
  let n=Math.max(0,Math.min(want|0,room));if(n<=0){toast(have>=cap?'隨身回血丹已滿':'請選擇拿取數量');return 0;}
  if(!y47PkNear(u)){toast('請靠近宗門大殿或總倉再拿取');return 0;}
  if(S.flags.v171pr&&S.flags.v171pr.hx){toast('總倉已把回血丹設為保留');return 0;}
  let got=0;while(got<n){const q=takePill('hx');if(q<0)break;pk.hx[q]++;got++;}
  if(got){floater(u.x,u.y-0.6,`💊 拿取回血丹 ×${got}`,'#c8f0ff');if(got<n)toast(`倉庫只剩 ${got} 顆，已全部拿取`);}
  else toast('倉庫沒有回血丹');return got;}
function y47PkRefill(u){const pk=y47PK(u),want=y47PkCap(u);if(y47PkN(u)>=want)return 0;if(!y47PkNear(u)||(S.flags.v171pr&&S.flags.v171pr.hx))return 0;let n=0;while(y47PkN(u)<want){const q=takePill('hx');if(q<0)break;pk.hx[q]++;n++;}if(n)floater(u.x,u.y-0.6,`💊 自動補丹 ×${n}`,'#c8f0ff');return n;}
function y47PkTick(){for(const u of S.units){if(!(u.kind==='player'||u.np)||u.dead||u.y47dn)continue;y47PK(u);if(!u.pkc.on)continue;
    if(!S.dg)y47PkRefill(u);if(u.hp<u.maxhp*u.pkc.hp&&S.time-(u.y47pT==null?-1e9:u.y47pT)>=TUNE.y47p.cd)y47PkUse(u);}}
function y47PkTxt(u){y47PK(u);return `💊 隨身回血丹 ${y47PkN(u)}/${y47PkCap(u)}`;}
// ======================= v0.4.7 #70 渡劫：築基以上突破要撐過天劫 =======================
TUNE.y47d={dur:10,from:4,hitWin:5,foeR:8,bolt:1.6,cd:20};
function y47Attacked(u){return S.time-(u.lastHit==null?-99:u.lastHit)<=TUNE.y47d.hitWin||!!nearestEnemy(u.x,u.y,TUNE.y47d.foeR);}
{const _tb=tryBreak;tryBreak=function(u,auto){if(!u||u.dead||Y47.djGo||Y47.djSkip||(typeof v49Client==='function'&&v49Client()))return _tb.apply(this,arguments);
  if(u.y47dj)return false;
  if(!(typeof v47Major==='function'&&v47Major(u))||u.realm<TUNE.y47d.from||S.dg||u.inside)return _tb.apply(this,arguments);
  const c=breakConds(u);if(!c||!c.ok)return _tb.apply(this,arguments);
  if(y47Attacked(u)){if(!auto)toast(`${nm(u)}正受到攻擊（或附近有敵人），無法渡劫突破`);return false;}
  if(u.y47djCd&&S.time<u.y47djCd){if(!auto)toast(`${nm(u)}渡劫被打斷，心神未定，${Math.ceil(u.y47djCd-S.time)} 秒後才能再試`);return false;}
  u.y47dj={t0:S.time,x:u.x,y:u.y,lh:u.lastHit==null?-99:u.lastHit,auto:!!auto,nb:0};u.dvx=u.dvy=0;u.path=[];
  toast(`⚡ ${nm(u)}開始渡劫，衝擊「${REALMS[u.realm+1].n}」！撐過 ${TUNE.y47d.dur} 秒天雷（期間不能被打擾）`);y47Thunder();return true;};}
function y47Thunder(){try{beep(70,0.6,'sawtooth',0.08,0,35);beep(140,0.25,'square',0.05,0.05,60);}catch(e){}}
function y47DjTick(){for(const u of S.units){const D=u.y47dj;if(!D)continue;if(u.dead){u.y47dj=null;continue;}
    u.x=D.x;u.y=D.y;const el=S.time-D.t0;
    if((u.lastHit!=null&&u.lastHit>D.lh)||S.dg){u.y47dj=null;u.y47djCd=S.time+TUNE.y47d.cd;fx('ring',u.x,u.y,'#9090ff');floater(u.x,u.y,'渡劫中斷','#ff9090');toast(`${nm(u)}渡劫時遭到攻擊，天劫散去，突破中斷（沒有消耗資源，${TUNE.y47d.cd} 秒後可再試）`);continue;}
    const nb=Math.floor(el/TUNE.y47d.bolt);if(nb>D.nb){D.nb=nb;D.bt=performance.now();fx('ring',u.x,u.y,'#c8d8ff');y47Thunder();}
    if(el>=TUNE.y47d.dur){u.y47dj=null;Y47.djGo=true;let ok=false;try{ok=tryBreak(u,true);}finally{Y47.djGo=false;}if(ok)toast(`⚡ ${nm(u)}渡劫成功！`);}}}
function y47DrawDj(){const now=performance.now();for(const u of S.units){const D=u.y47dj;if(!D)continue;const b=P(u.x,u.y,0),el=S.time-D.t0,k=Math.min(1,el/1.5);
    ctx.save();ctx.globalAlpha=0.55*k;for(let n=0;n<7;n++){const a=n*0.9+now/2400;ctx.fillStyle=n%2?'#2a2a3a':'#3a3a4e';ctx.beginPath();ctx.ellipse(b.x+Math.cos(a)*26,b.y-118+Math.sin(a*1.3)*6,30,12,0,0,6.283);ctx.fill();}
    ctx.globalAlpha=0.35*k;ctx.strokeStyle='#bcd0ff';ctx.beginPath();ctx.ellipse(b.x,b.y,22+Math.sin(now/200)*3,11,0,0,6.283);ctx.stroke();
    const bt=D.bt?now-D.bt:1e9;if(bt<260){const f=1-bt/260;ctx.globalAlpha=f;ctx.strokeStyle='#e8f0ff';ctx.lineWidth=3;ctx.beginPath();let x=b.x+(((D.nb*37)%20)-10),y=b.y-112;ctx.moveTo(x,y);{let _ln=0;while(Number.isFinite(y)&&Number.isFinite(b.y)&&y<b.y-20&&_ln++<64){y+=14;x+=(((y*13+D.nb*7)%17)-8);ctx.lineTo(x,y);}}ctx.lineTo(b.x,b.y-18);ctx.stroke();ctx.lineWidth=1;
      ctx.globalAlpha=f*0.5;ctx.fillStyle='#ffffff';ctx.beginPath();ctx.arc(b.x,b.y-14,18,0,6.283);ctx.fill();}
    ctx.globalAlpha=1;const w=40,p=Math.min(1,el/TUNE.y47d.dur);ctx.fillStyle='rgba(0,0,0,.6)';ctx.fillRect(b.x-w/2,b.y-58,w,5);ctx.fillStyle='#a8c0ff';ctx.fillRect(b.x-w/2,b.y-58,w*p,5);ctx.font='bold 10px sans-serif';ctx.textAlign='center';ctx.fillStyle='#e0e8ff';ctx.fillText('渡劫中',b.x,b.y-62);ctx.restore();}}
{const _dw=drawV045World;drawV045World=function(){const r=_dw.apply(this,arguments);try{if(!S.dg&&!S.interior)y47DrawDj();}catch(e){}return r;};}
// 面板：飽足／精力／隨身丹藥
function y47StTxt(u){if(!u)return '';if(u.kind==='player'||u.np)return y47PkTxt(u);/* 成員化身視同玩家 */if(u.kind==='disciple'){if(y47Bigu(u))return '🍃 已辟穀：不必吃飯、睡覺';ensureHab(u);const e=y47Eff(u);return `🍚 飽足 ${Math.round(100-u.hunger)}%　😴 精力 ${Math.round(u.slp==null?100:u.slp)}%${e<1?'（做事效率 '+Math.round(e*100)+'%）':''}`;}
  if(u.kind==='player')return y47PkTxt(u);return '';}
function y47Panel(){const pn=document.getElementById('panel');if(!pn||selUnits.length!==1){return;}const u=unitById(selUnits[0]);if(!u||(u.kind!=='player'&&u.kind!=='disciple'))return;
  let el=pn.querySelector('#y47st');if(!el){el=document.createElement('div');el.id='y47st';el.className='sm';el.style.cssText='color:#cfe8c0;margin:2px 0';const ref=pn.querySelector('#v62cr');if(ref)ref.after(el);else{const at=pn.querySelector('.v55pane[data-p="at"] .v55m');(at||pn).prepend(el);}}
  y47PK(u);const cap=y47PkCap(u),have=y47PkN(u),room=Math.max(0,cap-have);
  if(Y47.tq==null)Y47.tq=1;Y47.tq=Math.max(1,Math.min(Y47.tq,Math.max(1,cap)));
  const t=y47StTxt(u)+'|'+Y47.tq+'|'+u.pkc.on+'|'+u.pkc.hp;
  if(el.dataset.t!==t){el.dataset.t=t;el.textContent=y47StTxt(u);if(u.kind==='player'||u.np){const s=document.createElement('span');
    s.innerHTML=` <button class="btn sm" data-y47p="m" title="減少拿取數量">−</button><b class="y47tq" style="display:inline-block;min-width:1.6em;text-align:center">${Y47.tq}</b><button class="btn sm" data-y47p="p" title="增加拿取數量">＋</button><button class="btn sm pri" data-y47p="take">拿取</button><button class="btn sm${u.pkc.on?' on':''}" data-y47p="on">${u.pkc.on?'自動服：開':'自動服：關'}</button><button class="btn sm" data-y47p="hp">血量 &lt;${Math.round(u.pkc.hp*100)}%</button>`;
    el.appendChild(s);el.title=`隨身上限 ${cap} 顆（武徒 3，每大境界 +1）。−／＋選數量後按「拿取」從倉庫領；靠近大殿或總倉。氣血低於門檻可自動服用。`;}}
}
{const _rp=renderPanel;renderPanel=function(){const r=_rp.apply(this,arguments);try{y47Panel();}catch(e){}return r;};}
{const _u=updateUI;updateUI=function(){const r=_u.apply(this,arguments);try{y47Panel();}catch(e){}return r;};}
document.addEventListener('click',ev=>{const b=ev.target&&ev.target.closest&&ev.target.closest('[data-y47p]');if(!b)return;ev.stopPropagation();ev.preventDefault();const u=unitById(selUnits[0]);if(!u||!(u.kind==='player'||u.np))return;y47PK(u);const T=TUNE.y47p,c=u.pkc,k=b.dataset.y47p,cap=y47PkCap(u);
  const nx=(arr,v)=>arr[(arr.indexOf(v)+1)%arr.length];
  if(k==='m')Y47.tq=Math.max(1,(Y47.tq||1)-1);
  else if(k==='p')Y47.tq=Math.min(cap,(Y47.tq||1)+1);
  else if(k==='take'){y47PkTake(u,Y47.tq||1);}
  else if(k==='on')c.on=c.on?0:1;else if(k==='hp')c.hp=nx(T.hp,c.hp);
  if(typeof v49Client==='function'&&v49Client()&&typeof Y47.pkSend==='function')Y47.pkSend(u,c);y47Panel();},true);
SYS_TXT.push(['飲食與精力','凡人弟子要吃飯睡覺，煉氣以後辟穀',()=>`<span class="tg">肚子餓會去食堂（一餐 1 份食物）或大殿（2 份）吃飯</span><span class="tg">精力低於 ${TUNE.y47s.full}% 時，採集與修煉效率最低降到 ${Math.round(TUNE.y47s.floor*100)}%</span><span class="tg">晚上精力不足會回房睡覺；有房屋睡得最好</span><span class="tg">突破煉氣後：不必吃飯、不必睡覺</span>`]);
SYS_TXT.push(['隨身丹藥','拿取回血丹，上限依境界',()=>`<span class="tg">上限：武徒 ${TUNE.y47p.cap0} 顆，每大境界 +1</span><span class="tg">−／＋選數量後按「拿取」，從倉庫扣（不夠就拿現有）</span><span class="tg">靠近大殿或總倉可自動補滿上限</span><span class="tg">氣血低於門檻（${TUNE.y47p.hp.map(x=>x*100+'%').join('／')}）自動服用，冷卻 ${TUNE.y47p.cd} 秒</span><span class="tg">總倉把回血丹設為保留時不會取用</span>`]);
SYS_TXT.push(['渡劫','築基與更高境界的突破要先撐過 10 秒天劫',()=>`<span class="tg">渡劫時原地不動，天雷每 ${TUNE.y47d.bolt} 秒落下一次</span><span class="tg">受到攻擊會中斷（不扣資源，${TUNE.y47d.cd} 秒後可再試）</span><span class="tg">附近 ${TUNE.y47d.foeR} 格內有敵人或剛被打時無法開始渡劫</span>`]);

// v0.4.7 #116：宗門事務 300 則（由 user_specs/sect_events_300.xlsx 轉出：id|名稱|分類|階段|人數|難度|地點|獎勵|描述）
const Y47EV_CAT=["妖獸狩獵", "山賊討伐", "巡邏警戒", "建築支援", "心魔挑戰", "情報收集", "物資運送", "礦脈開採", "秘境探索", "突破輔助", "緊急救援", "訓練指導", "資源採集", "陣法相關", "靈草採摘"],Y47EV_LOC=["北側秘境入口", "南側森林", "宗門附近", "新地圖區域", "東側山脈", "西側平原", "遠方山寨", "靈脈附近"],Y47EV_RW=["丹藥", "功法碎片", "材料", "經驗", "貢獻", "靈石"];
const Y47EV_RAW=["1|採集靈草|12|0|3|1|5|3|收集特定靈草，用於煉丹或突破。",
"2|採集靈石|12|1|2|2|7|1|前往指定區域採集靈石，注意可能遭遇低階妖獸。",
"3|收集木材|12|1|2|0|7|0|為宗門收集高品質木材，用於建築升級。",
"4|採集靈石|12|0|3|0|1|5|前往指定區域採集靈石，注意可能遭遇低階妖獸。",
"5|收集木材|12|0|2|2|1|5|為宗門收集高品質木材，用於建築升級。",
"6|採集靈草|12|2|2|3|0|5|收集特定靈草，用於煉丹或突破。",
"7|採集靈石|12|0|1|2|6|5|前往指定區域採集靈石，注意可能遭遇低階妖獸。",
"8|採集靈石|12|3|1|1|3|3|前往指定區域採集靈石，注意可能遭遇低階妖獸。",
"9|收集木材|12|1|3|2|3|1|為宗門收集高品質木材，用於建築升級。",
"10|開採鐵礦|12|1|3|2|7|4|附近鐵礦短缺，需要弟子前往開採。",
"11|收集木材|12|3|2|3|1|3|為宗門收集高品質木材，用於建築升級。",
"12|採集靈草|12|3|1|1|3|3|收集特定靈草，用於煉丹或突破。",
"13|採集靈草|12|1|1|0|4|0|收集特定靈草，用於煉丹或突破。",
"14|採集靈石|12|1|0|3|1|2|前往指定區域採集靈石，注意可能遭遇低階妖獸。",
"15|採集靈石|12|0|0|3|2|1|前往指定區域採集靈石，注意可能遭遇低階妖獸。",
"16|採集靈草|12|0|1|1|5|5|收集特定靈草，用於煉丹或突破。",
"17|採集靈草|12|1|2|1|2|2|收集特定靈草，用於煉丹或突破。",
"18|開採鐵礦|12|1|0|1|4|5|附近鐵礦短缺，需要弟子前往開採。",
"19|開採鐵礦|12|0|0|2|6|0|附近鐵礦短缺，需要弟子前往開採。",
"20|採集靈草|12|0|1|0|3|3|收集特定靈草，用於煉丹或突破。",
"21|清除山寨|1|2|2|2|1|1|附近出現山賊山寨，需組隊清除。",
"22|討伐頭目|1|3|2|2|5|0|山寨頭目為煉氣級，需謹慎應對。",
"23|攔截山賊|1|0|2|1|5|0|山賊正在劫掠商隊，前往攔截。",
"24|攔截山賊|1|0|1|2|5|4|山賊正在劫掠商隊，前往攔截。",
"25|清除山寨|1|2|1|1|5|0|附近出現山賊山寨，需組隊清除。",
"26|討伐頭目|1|0|3|0|2|2|山寨頭目為煉氣級，需謹慎應對。",
"27|攔截山賊|1|3|2|3|3|4|山賊正在劫掠商隊，前往攔截。",
"28|清除山寨|1|1|0|3|1|2|附近出現山賊山寨，需組隊清除。",
"29|討伐頭目|1|0|2|1|5|0|山寨頭目為煉氣級，需謹慎應對。",
"30|討伐頭目|1|3|2|2|1|5|山寨頭目為煉氣級，需謹慎應對。",
"31|攔截山賊|1|2|2|3|2|3|山賊正在劫掠商隊，前往攔截。",
"32|清除山寨|1|1|0|2|6|2|附近出現山賊山寨，需組隊清除。",
"33|攔截山賊|1|3|1|3|6|1|山賊正在劫掠商隊，前往攔截。",
"34|清除山寨|1|1|1|0|7|4|附近出現山賊山寨，需組隊清除。",
"35|攔截山賊|1|0|2|0|7|4|山賊正在劫掠商隊，前往攔截。",
"36|討伐頭目|1|2|3|1|7|2|山寨頭目為煉氣級，需謹慎應對。",
"37|清除山寨|1|3|1|2|0|4|附近出現山賊山寨，需組隊清除。",
"38|攔截山賊|1|3|3|2|0|3|山賊正在劫掠商隊，前往攔截。",
"39|攔截山賊|1|2|0|0|0|4|山賊正在劫掠商隊，前往攔截。",
"40|攔截山賊|1|2|1|2|3|2|山賊正在劫掠商隊，前往攔截。",
"41|探索秘境|8|0|2|2|6|4|新秘境開啟，探索並帶回資源。",
"42|探索秘境|8|3|1|1|7|2|新秘境開啟，探索並帶回資源。",
"43|調查異變|8|3|1|3|4|3|秘境出現異常，前往調查。",
"44|探索秘境|8|0|1|2|0|0|新秘境開啟，探索並帶回資源。",
"45|尋找機緣|8|3|1|1|1|4|秘境中可能有突破機緣。",
"46|尋找機緣|8|0|2|3|7|2|秘境中可能有突破機緣。",
"47|探索秘境|8|1|3|1|1|0|新秘境開啟，探索並帶回資源。",
"48|探索秘境|8|2|3|2|2|2|新秘境開啟，探索並帶回資源。",
"49|探索秘境|8|2|2|1|0|1|新秘境開啟，探索並帶回資源。",
"50|尋找機緣|8|3|2|3|1|3|秘境中可能有突破機緣。",
"51|探索秘境|8|2|0|2|7|0|新秘境開啟，探索並帶回資源。",
"52|尋找機緣|8|0|2|0|3|4|秘境中可能有突破機緣。",
"53|探索秘境|8|2|0|3|7|1|新秘境開啟，探索並帶回資源。",
"54|尋找機緣|8|0|0|1|3|3|秘境中可能有突破機緣。",
"55|調查異變|8|0|1|3|0|1|秘境出現異常，前往調查。",
"56|探索秘境|8|3|0|2|6|2|新秘境開啟，探索並帶回資源。",
"57|探索秘境|8|3|0|2|1|5|新秘境開啟，探索並帶回資源。",
"58|調查異變|8|2|3|1|2|3|秘境出現異常，前往調查。",
"59|尋找機緣|8|0|2|1|1|1|秘境中可能有突破機緣。",
"60|尋找機緣|8|1|2|3|3|3|秘境中可能有突破機緣。",
"61|收集突破材料|9|2|1|2|1|3|為即將突破的弟子收集必要材料。",
"62|試煉陪同|9|1|1|3|4|5|陪同弟子進行境界試煉。",
"63|守護閉關|9|0|1|1|4|0|弟子閉關期間需要守護，防止干擾。",
"64|守護閉關|9|2|2|1|6|3|弟子閉關期間需要守護，防止干擾。",
"65|試煉陪同|9|0|1|0|6|1|陪同弟子進行境界試煉。",
"66|守護閉關|9|2|2|2|5|1|弟子閉關期間需要守護，防止干擾。",
"67|試煉陪同|9|1|1|1|6|5|陪同弟子進行境界試煉。",
"68|收集突破材料|9|0|2|1|4|1|為即將突破的弟子收集必要材料。",
"69|守護閉關|9|2|3|0|1|2|弟子閉關期間需要守護，防止干擾。",
"70|收集突破材料|9|0|1|2|3|5|為即將突破的弟子收集必要材料。",
"71|守護閉關|9|0|1|0|6|1|弟子閉關期間需要守護，防止干擾。",
"72|守護閉關|9|1|1|1|0|4|弟子閉關期間需要守護，防止干擾。",
"73|試煉陪同|9|3|3|0|4|5|陪同弟子進行境界試煉。",
"74|守護閉關|9|1|2|0|0|0|弟子閉關期間需要守護，防止干擾。",
"75|收集突破材料|9|2|2|0|7|2|為即將突破的弟子收集必要材料。",
"76|試煉陪同|9|3|0|0|1|3|陪同弟子進行境界試煉。",
"77|守護閉關|9|2|2|1|5|1|弟子閉關期間需要守護，防止干擾。",
"78|試煉陪同|9|2|3|3|4|1|陪同弟子進行境界試煉。",
"79|試煉陪同|9|3|3|2|7|0|陪同弟子進行境界試煉。",
"80|試煉陪同|9|0|0|2|0|5|陪同弟子進行境界試煉。",
"81|搬運材料|3|3|3|1|7|1|將材料運送到建築地點。",
"82|守護工地|3|1|2|3|0|2|建築期間守護工地安全。",
"83|守護工地|3|1|3|2|6|0|建築期間守護工地安全。",
"84|協助建造|3|1|3|3|5|3|協助完成重要建築的建造。",
"85|搬運材料|3|0|3|1|7|3|將材料運送到建築地點。",
"86|協助建造|3|3|1|3|7|1|協助完成重要建築的建造。",
"87|守護工地|3|1|2|1|7|3|建築期間守護工地安全。",
"88|協助建造|3|2|3|0|3|2|協助完成重要建築的建造。",
"89|守護工地|3|2|1|2|3|0|建築期間守護工地安全。",
"90|協助建造|3|2|1|2|7|2|協助完成重要建築的建造。",
"91|搬運材料|3|1|0|0|3|2|將材料運送到建築地點。",
"92|協助建造|3|2|1|1|7|3|協助完成重要建築的建造。",
"93|搬運材料|3|1|0|2|0|4|將材料運送到建築地點。",
"94|協助建造|3|1|3|1|3|0|協助完成重要建築的建造。",
"95|搬運材料|3|0|1|0|7|3|將材料運送到建築地點。",
"96|搬運材料|3|2|2|2|1|1|將材料運送到建築地點。",
"97|協助建造|3|2|2|3|7|1|協助完成重要建築的建造。",
"98|搬運材料|3|2|2|0|6|1|將材料運送到建築地點。",
"99|搬運材料|3|0|3|2|4|4|將材料運送到建築地點。",
"100|守護工地|3|3|2|2|4|3|建築期間守護工地安全。",
"101|日常巡邏|2|3|3|2|4|5|對宗門周邊進行巡邏，發現異常立即回報。",
"102|日常巡邏|2|0|3|0|4|5|對宗門周邊進行巡邏，發現異常立即回報。",
"103|日常巡邏|2|2|1|1|4|0|對宗門周邊進行巡邏，發現異常立即回報。",
"104|日常巡邏|2|0|0|1|7|3|對宗門周邊進行巡邏，發現異常立即回報。",
"105|加強警戒|2|3|2|3|5|3|近期外敵活動頻繁，加強巡邏。",
"106|加強警戒|2|1|0|0|0|3|近期外敵活動頻繁，加強巡邏。",
"107|加強警戒|2|0|1|3|1|5|近期外敵活動頻繁，加強巡邏。",
"108|日常巡邏|2|1|2|0|2|1|對宗門周邊進行巡邏，發現異常立即回報。",
"109|加強警戒|2|2|1|0|3|5|近期外敵活動頻繁，加強巡邏。",
"110|加強警戒|2|0|3|0|2|3|近期外敵活動頻繁，加強巡邏。",
"111|日常巡邏|2|3|3|3|4|2|對宗門周邊進行巡邏，發現異常立即回報。",
"112|加強警戒|2|1|2|1|1|0|近期外敵活動頻繁，加強巡邏。",
"113|加強警戒|2|3|2|2|7|2|近期外敵活動頻繁，加強巡邏。",
"114|日常巡邏|2|3|1|3|6|5|對宗門周邊進行巡邏，發現異常立即回報。",
"115|加強警戒|2|1|1|2|5|5|近期外敵活動頻繁，加強巡邏。",
"116|日常巡邏|2|0|3|0|2|1|對宗門周邊進行巡邏，發現異常立即回報。",
"117|日常巡邏|2|2|3|0|6|4|對宗門周邊進行巡邏，發現異常立即回報。",
"118|日常巡邏|2|1|2|0|6|1|對宗門周邊進行巡邏，發現異常立即回報。",
"119|加強警戒|2|3|2|0|1|4|近期外敵活動頻繁，加強巡邏。",
"120|加強警戒|2|1|2|1|6|5|近期外敵活動頻繁，加強巡邏。",
"121|救援弟子|10|2|1|2|4|0|有弟子在外遭遇危險，需要救援。",
"122|救援弟子|10|0|3|2|5|3|有弟子在外遭遇危險，需要救援。",
"123|支援戰鬥|10|2|0|2|7|1|其他弟子正在戰鬥，前往支援。",
"124|救援弟子|10|0|0|0|6|3|有弟子在外遭遇危險，需要救援。",
"125|支援戰鬥|10|3|0|1|7|0|其他弟子正在戰鬥，前往支援。",
"126|救援弟子|10|1|0|2|1|0|有弟子在外遭遇危險，需要救援。",
"127|救援弟子|10|3|1|0|1|2|有弟子在外遭遇危險，需要救援。",
"128|救援弟子|10|2|2|2|1|5|有弟子在外遭遇危險，需要救援。",
"129|支援戰鬥|10|0|2|1|2|1|其他弟子正在戰鬥，前往支援。",
"130|救援弟子|10|2|1|3|5|0|有弟子在外遭遇危險，需要救援。",
"131|救援弟子|10|3|1|3|5|0|有弟子在外遭遇危險，需要救援。",
"132|支援戰鬥|10|2|0|3|4|2|其他弟子正在戰鬥，前往支援。",
"133|支援戰鬥|10|1|2|1|0|4|其他弟子正在戰鬥，前往支援。",
"134|支援戰鬥|10|2|0|1|5|4|其他弟子正在戰鬥，前往支援。",
"135|支援戰鬥|10|3|0|2|7|3|其他弟子正在戰鬥，前往支援。",
"136|支援戰鬥|10|3|3|0|4|2|其他弟子正在戰鬥，前往支援。",
"137|支援戰鬥|10|3|0|2|4|1|其他弟子正在戰鬥，前往支援。",
"138|救援弟子|10|1|0|2|7|1|有弟子在外遭遇危險，需要救援。",
"139|支援戰鬥|10|0|1|0|0|3|其他弟子正在戰鬥，前往支援。",
"140|支援戰鬥|10|0|3|1|3|4|其他弟子正在戰鬥，前往支援。",
"141|配送丹藥|6|1|2|2|0|5|將丹藥配送給需要的弟子。",
"142|運送靈石|6|3|0|2|3|0|將靈石運送到指定地點。",
"143|配送丹藥|6|1|0|0|4|2|將丹藥配送給需要的弟子。",
"144|運送靈石|6|3|2|0|3|4|將靈石運送到指定地點。",
"145|配送丹藥|6|3|2|0|0|1|將丹藥配送給需要的弟子。",
"146|運送靈石|6|2|3|0|2|1|將靈石運送到指定地點。",
"147|運送靈石|6|0|2|0|6|1|將靈石運送到指定地點。",
"148|配送丹藥|6|0|1|1|0|0|將丹藥配送給需要的弟子。",
"149|運送靈石|6|2|1|2|4|4|將靈石運送到指定地點。",
"150|運送靈石|6|2|3|0|2|0|將靈石運送到指定地點。",
"151|配送丹藥|6|0|3|2|6|1|將丹藥配送給需要的弟子。",
"152|運送靈石|6|0|3|3|3|4|將靈石運送到指定地點。",
"153|運送靈石|6|3|3|1|7|3|將靈石運送到指定地點。",
"154|運送靈石|6|1|1|0|7|1|將靈石運送到指定地點。",
"155|運送靈石|6|1|3|3|1|2|將靈石運送到指定地點。",
"156|運送靈石|6|3|0|0|4|0|將靈石運送到指定地點。",
"157|配送丹藥|6|2|1|3|5|3|將丹藥配送給需要的弟子。",
"158|運送靈石|6|3|1|2|0|5|將靈石運送到指定地點。",
"159|運送靈石|6|3|2|3|0|2|將靈石運送到指定地點。",
"160|運送靈石|6|2|3|1|5|4|將靈石運送到指定地點。",
"161|維護護宗陣|13|1|1|2|2|4|檢查並維護護宗陣法。",
"162|佈置聚靈陣|13|2|3|2|0|4|協助佈置小型聚靈陣。",
"163|維護護宗陣|13|2|3|1|1|2|檢查並維護護宗陣法。",
"164|維護護宗陣|13|2|2|3|3|0|檢查並維護護宗陣法。",
"165|佈置聚靈陣|13|2|2|2|7|4|協助佈置小型聚靈陣。",
"166|佈置聚靈陣|13|2|2|1|2|3|協助佈置小型聚靈陣。",
"167|維護護宗陣|13|3|3|3|5|1|檢查並維護護宗陣法。",
"168|佈置聚靈陣|13|3|2|1|4|5|協助佈置小型聚靈陣。",
"169|佈置聚靈陣|13|1|2|3|2|1|協助佈置小型聚靈陣。",
"170|維護護宗陣|13|3|1|1|3|1|檢查並維護護宗陣法。",
"171|佈置聚靈陣|13|2|3|3|6|1|協助佈置小型聚靈陣。",
"172|維護護宗陣|13|3|3|0|3|2|檢查並維護護宗陣法。",
"173|佈置聚靈陣|13|0|3|0|6|2|協助佈置小型聚靈陣。",
"174|維護護宗陣|13|1|0|2|7|3|檢查並維護護宗陣法。",
"175|維護護宗陣|13|0|3|2|4|1|檢查並維護護宗陣法。",
"176|維護護宗陣|13|3|1|2|5|1|檢查並維護護宗陣法。",
"177|維護護宗陣|13|2|2|0|7|1|檢查並維護護宗陣法。",
"178|佈置聚靈陣|13|3|0|1|6|3|協助佈置小型聚靈陣。",
"179|維護護宗陣|13|2|1|1|6|0|檢查並維護護宗陣法。",
"180|佈置聚靈陣|13|3|3|1|5|2|協助佈置小型聚靈陣。",
"181|傳授經驗|11|3|1|0|7|1|向新弟子傳授基礎經驗。",
"182|傳授經驗|11|3|2|1|0|3|向新弟子傳授基礎經驗。",
"183|傳授經驗|11|1|2|0|3|1|向新弟子傳授基礎經驗。",
"184|傳授經驗|11|2|1|2|3|1|向新弟子傳授基礎經驗。",
"185|傳授經驗|11|2|1|0|5|3|向新弟子傳授基礎經驗。",
"186|傳授經驗|11|0|0|0|2|5|向新弟子傳授基礎經驗。",
"187|指導練武|11|3|1|3|5|4|指導低階弟子練武。",
"188|指導練武|11|1|3|3|0|3|指導低階弟子練武。",
"189|傳授經驗|11|1|0|1|7|0|向新弟子傳授基礎經驗。",
"190|傳授經驗|11|1|0|2|2|2|向新弟子傳授基礎經驗。",
"191|傳授經驗|11|3|2|1|5|5|向新弟子傳授基礎經驗。",
"192|指導練武|11|1|3|1|2|0|指導低階弟子練武。",
"193|指導練武|11|2|3|0|7|4|指導低階弟子練武。",
"194|傳授經驗|11|3|2|0|2|2|向新弟子傳授基礎經驗。",
"195|指導練武|11|2|0|0|6|5|指導低階弟子練武。",
"196|指導練武|11|2|0|1|7|4|指導低階弟子練武。",
"197|指導練武|11|1|3|2|5|2|指導低階弟子練武。",
"198|指導練武|11|0|3|2|3|0|指導低階弟子練武。",
"199|傳授經驗|11|0|1|0|3|1|向新弟子傳授基礎經驗。",
"200|傳授經驗|11|0|3|2|5|5|向新弟子傳授基礎經驗。",
"201|收集情報|5|0|1|1|6|1|前往附近收集外敵情報。",
"202|偵察地形|5|1|2|1|5|1|偵察新地圖的地形與資源。",
"203|偵察地形|5|1|1|0|5|4|偵察新地圖的地形與資源。",
"204|收集情報|5|0|2|2|3|3|前往附近收集外敵情報。",
"205|收集情報|5|3|0|3|2|1|前往附近收集外敵情報。",
"206|收集情報|5|3|0|3|7|2|前往附近收集外敵情報。",
"207|偵察地形|5|0|0|2|4|1|偵察新地圖的地形與資源。",
"208|偵察地形|5|3|1|0|6|3|偵察新地圖的地形與資源。",
"209|偵察地形|5|2|2|1|2|1|偵察新地圖的地形與資源。",
"210|收集情報|5|2|3|0|3|0|前往附近收集外敵情報。",
"211|收集情報|5|1|3|1|1|2|前往附近收集外敵情報。",
"212|偵察地形|5|1|0|3|1|5|偵察新地圖的地形與資源。",
"213|收集情報|5|1|3|3|1|0|前往附近收集外敵情報。",
"214|偵察地形|5|0|0|1|3|5|偵察新地圖的地形與資源。",
"215|偵察地形|5|0|1|3|0|0|偵察新地圖的地形與資源。",
"216|偵察地形|5|3|2|3|5|4|偵察新地圖的地形與資源。",
"217|偵察地形|5|2|3|2|3|1|偵察新地圖的地形與資源。",
"218|收集情報|5|2|2|3|3|1|前往附近收集外敵情報。",
"219|偵察地形|5|1|0|2|2|2|偵察新地圖的地形與資源。",
"220|偵察地形|5|2|1|3|3|3|偵察新地圖的地形與資源。",
"221|狩獵妖獸|0|3|1|1|2|4|清除附近作亂的妖獸。",
"222|保護村莊|0|0|0|1|6|2|妖獸襲擊村莊，前往保護。",
"223|保護村莊|0|0|3|2|2|1|妖獸襲擊村莊，前往保護。",
"224|狩獵妖獸|0|3|0|3|2|2|清除附近作亂的妖獸。",
"225|狩獵妖獸|0|2|2|3|2|5|清除附近作亂的妖獸。",
"226|保護村莊|0|0|2|0|7|2|妖獸襲擊村莊，前往保護。",
"227|保護村莊|0|2|0|2|0|5|妖獸襲擊村莊，前往保護。",
"228|狩獵妖獸|0|1|2|3|5|5|清除附近作亂的妖獸。",
"229|狩獵妖獸|0|0|3|3|1|0|清除附近作亂的妖獸。",
"230|保護村莊|0|1|1|0|5|5|妖獸襲擊村莊，前往保護。",
"231|保護村莊|0|3|1|0|6|5|妖獸襲擊村莊，前往保護。",
"232|狩獵妖獸|0|3|1|1|2|2|清除附近作亂的妖獸。",
"233|狩獵妖獸|0|2|0|2|6|3|清除附近作亂的妖獸。",
"234|狩獵妖獸|0|3|2|1|3|4|清除附近作亂的妖獸。",
"235|保護村莊|0|3|1|1|5|4|妖獸襲擊村莊，前往保護。",
"236|保護村莊|0|1|3|3|1|1|妖獸襲擊村莊，前往保護。",
"237|狩獵妖獸|0|3|2|2|7|5|清除附近作亂的妖獸。",
"238|狩獵妖獸|0|1|0|1|1|1|清除附近作亂的妖獸。",
"239|狩獵妖獸|0|1|0|1|5|1|清除附近作亂的妖獸。",
"240|保護村莊|0|0|2|0|3|3|妖獸襲擊村莊，前往保護。",
"241|採摘靈草|14|0|3|3|5|0|採摘特定靈草，注意時效。",
"242|採摘靈草|14|1|0|2|5|3|採摘特定靈草，注意時效。",
"243|採摘靈草|14|2|2|3|0|5|採摘特定靈草，注意時效。",
"244|採摘靈草|14|0|0|0|5|3|採摘特定靈草，注意時效。",
"245|採摘靈草|14|1|2|2|7|5|採摘特定靈草，注意時效。",
"246|採摘靈草|14|3|0|0|6|5|採摘特定靈草，注意時效。",
"247|採摘靈草|14|0|2|3|1|3|採摘特定靈草，注意時效。",
"248|採摘靈草|14|0|1|0|1|3|採摘特定靈草，注意時效。",
"249|採摘靈草|14|3|3|0|0|2|採摘特定靈草，注意時效。",
"250|採摘靈草|14|1|3|0|3|2|採摘特定靈草，注意時效。",
"251|採摘靈草|14|1|1|0|4|0|採摘特定靈草，注意時效。",
"252|採摘靈草|14|2|1|0|7|1|採摘特定靈草，注意時效。",
"253|採摘靈草|14|1|1|2|7|2|採摘特定靈草，注意時效。",
"254|採摘靈草|14|2|1|2|5|4|採摘特定靈草，注意時效。",
"255|採摘靈草|14|0|0|1|0|5|採摘特定靈草，注意時效。",
"256|採摘靈草|14|2|1|3|1|1|採摘特定靈草，注意時效。",
"257|採摘靈草|14|1|2|2|5|2|採摘特定靈草，注意時效。",
"258|採摘靈草|14|1|0|2|2|3|採摘特定靈草，注意時效。",
"259|採摘靈草|14|0|1|2|0|4|採摘特定靈草，注意時效。",
"260|採摘靈草|14|0|1|2|3|1|採摘特定靈草，注意時效。",
"261|開採靈礦|7|3|0|0|5|5|發現新礦脈，前往開採。",
"262|開採靈礦|7|2|0|1|4|4|發現新礦脈，前往開採。",
"263|開採靈礦|7|0|3|0|3|4|發現新礦脈，前往開採。",
"264|開採靈礦|7|0|0|0|1|3|發現新礦脈，前往開採。",
"265|開採靈礦|7|3|3|0|0|2|發現新礦脈，前往開採。",
"266|開採靈礦|7|0|2|3|7|5|發現新礦脈，前往開採。",
"267|開採靈礦|7|1|1|0|4|5|發現新礦脈，前往開採。",
"268|開採靈礦|7|0|1|3|4|0|發現新礦脈，前往開採。",
"269|開採靈礦|7|3|2|3|3|5|發現新礦脈，前往開採。",
"270|開採靈礦|7|2|0|2|1|1|發現新礦脈，前往開採。",
"271|開採靈礦|7|2|0|2|6|2|發現新礦脈，前往開採。",
"272|開採靈礦|7|0|2|1|2|5|發現新礦脈，前往開採。",
"273|開採靈礦|7|0|0|2|1|1|發現新礦脈，前往開採。",
"274|開採靈礦|7|0|2|3|0|4|發現新礦脈，前往開採。",
"275|開採靈礦|7|3|2|0|4|3|發現新礦脈，前往開採。",
"276|開採靈礦|7|2|3|3|7|5|發現新礦脈，前往開採。",
"277|開採靈礦|7|1|1|1|4|0|發現新礦脈，前往開採。",
"278|開採靈礦|7|1|0|1|2|4|發現新礦脈，前往開採。",
"279|開採靈礦|7|0|1|3|4|0|發現新礦脈，前往開採。",
"280|開採靈礦|7|3|0|0|7|4|發現新礦脈，前往開採。",
"281|協助渡心魔|4|1|3|3|1|5|有弟子遭遇心魔，需要協助。",
"282|協助渡心魔|4|1|3|1|2|1|有弟子遭遇心魔，需要協助。",
"283|協助渡心魔|4|3|3|1|5|0|有弟子遭遇心魔，需要協助。",
"284|協助渡心魔|4|2|0|2|2|1|有弟子遭遇心魔，需要協助。",
"285|協助渡心魔|4|1|2|2|3|1|有弟子遭遇心魔，需要協助。",
"286|協助渡心魔|4|3|2|0|5|2|有弟子遭遇心魔，需要協助。",
"287|協助渡心魔|4|3|3|0|1|1|有弟子遭遇心魔，需要協助。",
"288|協助渡心魔|4|3|3|0|2|3|有弟子遭遇心魔，需要協助。",
"289|協助渡心魔|4|3|0|2|1|1|有弟子遭遇心魔，需要協助。",
"290|協助渡心魔|4|2|3|1|1|3|有弟子遭遇心魔，需要協助。",
"291|協助渡心魔|4|1|2|0|0|3|有弟子遭遇心魔，需要協助。",
"292|協助渡心魔|4|3|0|2|5|3|有弟子遭遇心魔，需要協助。",
"293|協助渡心魔|4|1|3|1|2|1|有弟子遭遇心魔，需要協助。",
"294|協助渡心魔|4|3|2|1|5|2|有弟子遭遇心魔，需要協助。",
"295|協助渡心魔|4|2|2|3|2|3|有弟子遭遇心魔，需要協助。",
"296|協助渡心魔|4|3|3|2|4|2|有弟子遭遇心魔，需要協助。",
"297|協助渡心魔|4|0|2|0|0|5|有弟子遭遇心魔，需要協助。",
"298|協助渡心魔|4|2|0|1|1|0|有弟子遭遇心魔，需要協助。",
"299|協助渡心魔|4|1|2|3|6|3|有弟子遭遇心魔，需要協助。",
"300|協助渡心魔|4|3|0|0|7|1|有弟子遭遇心魔，需要協助。"];
// ======================= v0.4.7 #116 宗門事務：弟子自己接、可組隊、同一件事不會重複 =======================
TUNE.y47e={post:35,first:20,cap:[2,6],per:3,gather:18,expire:150,goMax:90,backMax:60,dur:[22,32,45,60],dm:[1,1.5,2.2,3],ok:[0.70,0.55,0.40,0.25],stageR:[0,4,5,6],party:[[1,1],[1,2],[2,3],[3,5]],tick:0.5,minHp:0.7,fragN:5};
const Y47EV=Y47EV_RAW.map(s=>{const a=s.split('|');return {id:+a[0],n:a[1],c:+a[2],st:+a[3],pt:+a[4],df:+a[5],loc:+a[6],rw:+a[7],d:a[8]};});
const Y47EV_ST=['煉氣前','煉氣期','築基期','金丹期'],Y47EV_DF=['簡單','普通','困難','極難'],Y47EV_DFC=['#a8e0a0','#ffe08a','#ffb070','#ff7a7a'];
function y47EvS(){const F=S.flags;if(!F.y47ev||typeof F.y47ev!=='object')F.y47ev={done:[],act:[],next:null,frag:0,n:0,log:[]};const E=F.y47ev;E.done=E.done||[];E.act=E.act||[];E.log=E.log||[];return E;}
function y47EvDef(id){return Y47EV[id-1]&&Y47EV[id-1].id===id?Y47EV[id-1]:Y47EV.find(e=>e.id===id);}
function y47EvTopR(){let r=0;for(const u of S.units)if(u.kind==='disciple'&&!u.dead)r=Math.max(r,u.realm);return r;}
function y47EvPool(){const E=y47EvS(),T=TUNE.y47e,R=y47EvTopR(),busy=new Set(E.done);for(const a of E.act)busy.add(a.eid);return Y47EV.filter(e=>!busy.has(e.id)&&R>=T.stageR[e.st]);}
function y47EvCap(){const T=TUNE.y47e,n=S.units.filter(u=>u.kind==='disciple'&&!u.dead).length;return Math.max(1,Math.min(T.cap[1],T.cap[0]+Math.floor(n/T.per)));}
function y47EvFree(u){if(!u||u.kind!=='disciple'||u.dead||u.y47e||u.y47dj)return false;if(typeof aiEligible==='function'&&!aiEligible(u))return false;
  if(u.retreat||u.away||u.mission||u.expd||u.dgIn||u.v171||(u.v170&&u.v170.st&&u.v170.st!=='wait'))return false;if(u.hp<u.maxhp*TUNE.y47e.minHp)return false;const ij=u.inj&&u.inj.k;if(ij==='heavy'||ij==='meridian')return false;
  if(!u.inside&&nearestEnemy(u.x,u.y,8))return false;return true;}
function y47EvSite(ev,u){const c=sectCenter(),L=Y47EV_LOC[ev.loc],cp=unitComp(u);let x=c.x,y=c.y;const rr=(a,b)=>a+rnd()*(b-a);
  if(L==='北側秘境入口'){const g=gates().sort((a,b)=>dist(a.i,a.j,c.x,c.y)-dist(b.i,b.j,c.x,c.y))[0];if(g){x=g.i+1;y=g.j+3.5;}else y-=24;}
  else if(L==='遠方山寨'){const v=S.villages.filter(v=>v.type==='bandit'&&!v.destroyed).sort((a,b)=>dist(a.x,a.y,c.x,c.y)-dist(b.x,b.y,c.x,c.y))[0];if(v){const a=Math.atan2(c.y-v.y,c.x-v.x);x=v.x+Math.cos(a)*9;y=v.y+Math.sin(a)*9;}else{x+=rr(-30,30);y+=rr(-30,30);}}
  else if(L==='靈脈附近'){let best=null,bd=1e9;for(const n of NODES){if(!n||n.gone||(n.type!=='vein'&&n.type!=='iron'))continue;const d=dist(n.i,n.j,c.x,c.y);if(d<bd){bd=d;best=n;}}if(best){x=best.i+0.5;y=best.j+1.5;}else{x+=rr(-20,20);y+=rr(-20,20);}}
  else if(L==='宗門附近'){const a=rnd()*6.283,r=rr(5,10);x+=Math.cos(a)*r;y+=Math.sin(a)*r;}
  else if(L==='西側平原'){x-=rr(16,26);y+=rr(-6,6);}else if(L==='東側山脈'){x+=rr(16,26);y+=rr(-6,6);}else if(L==='南側森林'){y+=rr(16,26);x+=rr(-6,6);}
  else{const a=rnd()*6.283,r=rr(28,40);x+=Math.cos(a)*r;y+=Math.sin(a)*r;}
  x=clamp(x,3,N-4);y=clamp(y,3,N-4);const f=nearestFree(x,y,cp);return f?{x:f.i+0.5,y:f.j+0.5}:{x:c.x,y:c.y+3};}
function y47EvLog(m){const E=y47EvS();E.log.unshift({t:Math.round(S.time),m});if(E.log.length>12)E.log.length=12;}
function y47EvPost(){const E=y47EvS(),P=y47EvPool();if(!P.length)return null;
  // 優先挑跟目前宗門程度相符的階段
  const R=y47EvTopR(),T=TUNE.y47e,top=P.filter(e=>T.stageR[e.st]===Math.max(...P.map(x=>T.stageR[x.st])));const pool=top.length&&rnd()<0.6?top:P;const ev=pool[Math.floor(rnd()*pool.length)];
  E.n=(E.n||0)+1;const a={k:E.n,eid:ev.id,st:'post',t0:S.time,mem:[],ok:null};E.act.push(a);return a;}
function y47EvMembers(a){return a.mem.map(id=>unitById(id)).filter(u=>u&&!u.dead&&u.y47e&&u.y47e.k===a.k);}
function y47EvJoin(a,u){const c=sectCenter();if(u.inside)exitBuilding(u);if(u.aiJob)aiEnd(u);u.y47e={k:a.k,t0:S.time};a.mem.push(u.id);
  const f=nearestFree(c.x+(a.mem.length-1)*0.8-1,c.y+2.6,unitComp(u));u.y47e.rx=f?f.i+0.5:c.x;u.y47e.ry=f?f.j+0.5:c.y+2.6;u.thought='📜';u.thT=S.time;}
function y47EvRelease(u,keepCd){if(!u)return;u.y47e=null;u.path=[];u.dvx=u.dvy=0;u.working=false;u.thought=null;u.aiT=S.time+(keepCd?rr([4,10]):1);}
function y47EvDrop(a,back){for(const u of y47EvMembers(a))y47EvRelease(u);const E=y47EvS();E.act=E.act.filter(x=>x!==a);if(!back&&a.ok)E.done.push(a.eid);}
function y47EvPower(a){const ev=y47EvDef(a.eid),T=TUNE.y47e,ms=y47EvMembers(a);if(!ms.length)return 0;const need=T.party[ev.pt][0],R=T.stageR[ev.st];
  let p=T.ok[ev.df];const avgR=ms.reduce((s,u)=>s+u.realm,0)/ms.length;p+=clamp((avgR-R)*0.04,-0.15,0.12);if(ms.length<need)p-=0.12*(need-ms.length);p+=0.03*Math.max(0,ms.length-need);
  p*=0.85+0.15*ms.reduce((s,u)=>s+y47Eff(u),0)/ms.length;return clamp(p,0.15,0.98);}
function y47EvReward(a){const ev=y47EvDef(a.eid),T=TUNE.y47e,ms=y47EvMembers(a),dm=T.dm[ev.df]*(1+ev.st*0.6),rw=Y47EV_RW[ev.rw],E=y47EvS();let txt='';
  if(rw==='經驗'){for(const u of ms)gainXiu(u,needXiu(u)*0.12*T.dm[ev.df]/TUNE.xiuMul);txt='參與弟子修為大增';}
  else if(rw==='靈石'){const n=Math.round(15*dm);S.res.lingshi+=n;txt=`靈石 +${n}`;}
  else if(rw==='材料'){const ks=['wood','stone','iron','herb'],k=ks[Math.floor(rnd()*ks.length)],n=Math.round((k==='iron'||k==='herb'?20:45)*dm);S.res[k]=(S.res[k]||0)+n;txt=`${RES_NAMES[k]} +${n}`;}
  else if(rw==='丹藥'){const q=ev.df>=2?1:0,n=1+(ev.df>=3?1:0)+Math.floor(ev.st/2);addPill('hx',Math.min(2,q+(ev.st>=2?1:0)),n);txt=`回血丹 +${n}`;}
  else if(rw==='功法碎片'){const n=1+(ev.df>=2?1:0);E.frag=(E.frag||0)+n;txt=`功法碎片 +${n}（${E.frag%T.fragN}/${T.fragN}）`;while(E.frag>=T.fragN){E.frag-=T.fragN;S.items.gongfa=(S.items.gongfa||0)+1;txt+='，集滿拼成一本功法！';}}
  else if(rw==='貢獻'){for(const u of ms){u.loyal=Math.min(100,(u.loyal||60)+3);u.mood=Math.min(100,(u.mood||60)+10);}try{addKarma(1+(ev.df>=2?1:0),'宗門事務');}catch(e){}txt='弟子忠誠、心情提升，宗門正道聲望 +';}
  const cat=Y47EV_CAT[ev.c];if(cat==='巡邏警戒'||cat==='緊急救援'){const v=S.villages.filter(v=>v.type!=='bandit'&&!v.destroyed).sort((p,q)=>dist(p.x,p.y,ms[0].x,ms[0].y)-dist(q.x,q.y,ms[0].x,ms[0].y))[0];if(v){try{setRel(v,2);txt+=`，${v.name}關係 +2`;}catch(e){}}}
  for(const u of ms)u.mood=Math.min(100,(u.mood||60)+4);return txt;}
function y47EvTick(){if(S.dg||(typeof v49Client==='function'&&v49Client()))return;const E=y47EvS(),T=TUNE.y47e;
  if(E.next==null)E.next=S.time+T.first;
  if(S.time>=E.next&&E.act.length<y47EvCap()){E.next=S.time+T.post*(0.8+rnd()*0.4);const a=y47EvPost();if(a){const ev=y47EvDef(a.eid);y47EvLog(`發布「${ev.n}」`);}}
  for(const a of E.act.slice()){const ev=y47EvDef(a.eid);if(!ev){E.act=E.act.filter(x=>x!==a);continue;}const need=T.party[ev.pt],ms=y47EvMembers(a);a.mem=ms.map(u=>u.id);
    if(a.st==='post'||a.st==='gather'){
      if(ms.length<need[1]){const minR=T.stageR[ev.st];const c=sectCenter();const cs=S.units.filter(u=>(typeof y47EvFit==='function'?y47EvFit(u,ev,ms[0]):(u.realm||0)>=minR)&&y47EvFree(u)).sort((p,q)=>dist(p.x,p.y,c.x,c.y)-dist(q.x,q.y,c.x,c.y));
        for(const u of cs){if(a.mem.length>=need[1])break;if(a.mem.length===0||rnd()<0.6){y47EvJoin(a,u);if(a.mem.length===1){a.st='gather';a.tg=S.time;toast(`📜 ${nm(u)}接下宗門事務「${ev.n}」${need[1]>1?'，正在找同門組隊':''}`);}}}}
      if(a.st==='post'&&S.time-a.t0>T.expire){E.act=E.act.filter(x=>x!==a);continue;}
      const ms2=y47EvMembers(a);if(a.st==='gather'&&ms2.length){const ready=ms2.length>=need[1]||(ms2.length>=need[0]&&S.time-a.tg>T.gather*0.5)||S.time-a.tg>T.gather;
        if(ready){a.st='go';a.tgo=S.time;const s=y47EvSite(ev,ms2[0]);a.sx=s.x;a.sy=s.y;ms2.forEach((u,k)=>{const f=nearestFree(s.x+(k%3)-1,s.y+Math.floor(k/3),unitComp(u));u.y47e.tx=f?f.i+0.5:s.x;u.y47e.ty=f?f.j+0.5:s.y;u.y47e.arr=false;});
          y47EvLog(`${ms2.map(u=>u.name).join('、')}出發「${ev.n}」`);if(ms2.length>1)toast(`📜 ${ms2.map(u=>u.name).join('、')}組隊出發：「${ev.n}」（${Y47EV_LOC[ev.loc]}）`);}}
      else if(a.st==='gather'&&!ms2.length){a.st='post';}
      continue;}
    if(!ms.length){y47EvLog(`「${ev.n}」無人繼續，退回榜上`);a.st='post';a.t0=S.time;a.mem=[];continue;}
    if(a.st==='go'){if(ms.every(u=>u.y47e.arr)||S.time-a.tgo>T.goMax){a.st='work';a.tw=S.time;a.dur=T.dur[ev.df];}}
    else if(a.st==='work'){if(S.time-a.tw>=a.dur){a.ok=rnd()<y47EvPower(a);a.st='back';a.tb=S.time;const c=sectCenter();ms.forEach((u,k)=>{const f=nearestFree(c.x+(k%3)-1,c.y+2.6+Math.floor(k/3),unitComp(u));u.y47e.tx=f?f.i+0.5:c.x;u.y47e.ty=f?f.j+0.5:c.y+2.6;u.y47e.arr=false;});
        if(!a.ok){for(const u of ms){u.hp=Math.max(1,Math.round(u.hp-u.maxhp*0.25));u.mood=Math.max(0,(u.mood||60)-8);}}}}
    else if(a.st==='back'){if(ms.every(u=>u.y47e.arr)||S.time-a.tb>T.backMax){if(a.ok){const r=y47EvReward(a);toast(`✅ 宗門事務「${ev.n}」完成！${r}`);y47EvLog(`完成「${ev.n}」：${r}`);E.act=E.act.filter(x=>x!==a);E.done.push(a.eid);for(const u of ms)y47EvRelease(u,true);}
        else{toast(`❌ 宗門事務「${ev.n}」失敗，弟子們負傷而回（之後可再接）`);y47EvLog(`「${ev.n}」失敗`);for(const u of ms)y47EvRelease(u,true);a.st='post';a.t0=S.time;a.mem=[];a.ok=null;}}}}}
// 成員每幀行動：走去集合／現場／回宗門；遇敵交給原本的戰鬥 AI
function y47EvStep(u,dt){const m=u.y47e,E=y47EvS(),a=E.act.find(x=>x.k===m.k);if(!a||!a.mem.includes(u.id)){y47EvRelease(u);return false;}
  if(u.task&&!(u.holdT&&u.holdT>m.t0)){m.tk=m.tk||S.time;if(S.time-m.tk<25)return false;}else m.tk=0;
  if(u.job||u.task||(u.holdT&&u.holdT>m.t0)||u.dead){a.mem=a.mem.filter(id=>id!==u.id);y47EvRelease(u);return false;}
  if(u.hp<u.maxhp*0.35){a.mem=a.mem.filter(id=>id!==u.id);y47EvRelease(u);y47EvLog(`${u.name}負傷退出「${y47EvDef(a.eid).n}」`);return false;}
  if(nearestEnemy(u.x,u.y,6))return false;
  let tx,ty;if(a.st==='gather'||a.st==='post'){tx=m.rx;ty=m.ry;}else{tx=m.tx;ty=m.ty;}
  if(a.st==='work'){u.dvx=u.dvy=0;u.working=true;if(rnd()<dt*0.4)fx('ring',u.x,u.y,Y47EV_DFC[y47EvDef(a.eid).df]);return true;}
  if(tx==null)return true;const r=walkTo(u,dt,tx,ty,1.0);if(r===null){m.arr=true;u.dvx=u.dvy=0;return true;}if(r){m.arr=true;u.working=false;}return true;}
{const _ud=updateDisciple;updateDisciple=function(u,dt){if(u&&u.y47e&&!u.y47dj&&!(typeof v49Client==='function'&&v49Client())){try{if(y47EvStep(u,dt))return;}catch(e){console.warn(e);y47EvRelease(u);}}return _ud.apply(this,arguments);};}
{const _ad=aiDecide;aiDecide=function(u,force){if(u&&u.y47e)return 'ev';return _ad.apply(this,arguments);};}
// 讀檔：進行中的事務退回榜上（弟子回到自由狀態），已完成清單保留
{const _a=applySave;applySave=function(d){const r=_a.apply(this,arguments);try{const E=y47EvS();for(const a of E.act){a.st='post';a.t0=S.time;a.mem=[];a.ok=null;}for(const u of S.units)u.y47e=null;}catch(e){}return r;};}
// 大殿面板：宗門事務榜
function y47EvHtml(){const E=y47EvS(),T=TUNE.y47e;const stN={post:'待接',gather:'組隊中',go:'前往現場',work:'執行中',back:'返回中'};
  let h=`<div class="y47ev"><b>📜 宗門事務</b> <small>已完成 ${E.done.length}/${Y47EV.length}・功法碎片 ${E.frag||0}/${T.fragN}</small>`;
  if(!E.act.length)h+='<div class="sm" style="opacity:.75">目前榜上沒有事務，稍後會有新委託。</div>';
  for(const a of E.act){const ev=y47EvDef(a.eid);if(!ev)continue;const ms=y47EvMembers(a),need=T.party[ev.pt];let pr='';if(a.st==='work')pr=` ${Math.min(100,Math.round((S.time-a.tw)/a.dur*100))}%`;
    h+=`<div class="sm" style="margin:3px 0" title="${ev.d}"><span style="color:${Y47EV_DFC[ev.df]}">【${Y47EV_DF[ev.df]}】</span>${ev.n}<small>（${Y47EV_ST[ev.st]}・${Y47EV_CAT[ev.c]}・${Y47EV_LOC[ev.loc]}・${need[0]===need[1]?need[0]:need[0]+'～'+need[1]} 人・獎勵：${Y47EV_RW[ev.rw]}）</small><br><small>${stN[a.st]||a.st}${pr}${ms.length?'：'+ms.map(u=>u.name).join('、'):''}</small></div>`;}
  if(E.log.length)h+=`<details class="dt"><summary>最近紀錄</summary>${E.log.slice(0,8).map(l=>`<div class="sm">${l.m}</div>`).join('')}</details>`;return h+'</div>';}
function y47EvPanel(){const pn=document.getElementById('panel');if(!pn)return;const b=selBuilding!=null&&typeof bById==='function'?bById(selBuilding):null;let el=pn.querySelector('#y47evp');
  if(!b||b.type!=='hall'||!b.built){if(el)el.remove();return;}if(!el){el=document.createElement('div');el.id='y47evp';el.style.cssText='margin-top:6px;border-top:1px solid rgba(255,220,150,.25);padding-top:4px';pn.appendChild(el);}
  const h=y47EvHtml();if(el.dataset.h!==h){el.dataset.h=h;el.innerHTML=h;}}
{const _rp=renderPanel;renderPanel=function(){const r=_rp.apply(this,arguments);try{y47EvPanel();}catch(e){}return r;};}
{const _u=updateUI;updateUI=function(){const r=_u.apply(this,arguments);try{if(!Y47.evUiT||performance.now()-Y47.evUiT>500){Y47.evUiT=performance.now();y47EvPanel();}}catch(e){}return r;};}
SYS_TXT.push(['宗門事務','300 則委託，弟子自己接、可組隊，完成過的不會再出現',()=>`<span class="tg">每隔一段時間大殿會發布新委託（同時最多 ${TUNE.y47e.cap[1]} 件）</span><span class="tg">空閒、氣血充足的弟子會自己接下，依建議人數找同門組隊後出發</span><span class="tg">階段：煉氣前／煉氣期／築基期／金丹期，宗門裡要有對應境界的弟子才會出現</span><span class="tg">失敗會負傷，之後可再接；成功完成的委託不會再出現</span><span class="tg">獎勵：修為、靈石、材料、丹藥、功法碎片（集 ${TUNE.y47e.fragN} 片拼成功法）、貢獻</span><span class="tg">點選宗門大殿可看事務榜</span>`]);

// ---------- 每幀掛勾與匯出 ----------
// ======================= v0.4.7 #113 倒地救援：氣血歸零先倒地，同伴可救起 =======================
TUNE.y47n={bleed:40,hitK:40,revT:[4,3],revHp:0.3,rescR:18,foeR:5,pR:1.6,
  // #188 拖離戰場：附近有敵人時，救援者先把人拖開一小段（4～6 格、只走得通的地方），再原地救治
  dragFoe:12,dragL:[5,6,4],dragMax:6,dragSp:0.5,dragT:14,dragTries:2,dragGap:0.85};
function y47Online(){try{return typeof NET!=='undefined'&&!!NET&&(NET.role==='host'||NET.role==='client');}catch(e){return false;}}
function y47DnOk(u){if(!u||S.dg||u.inside)return false;if(u.kind==='disciple')return true;if(u.kind==='player')return u===player()&&!y47Online()&&(!!u.y47dn||y47HasRescuer(u));return false;}
// 主角只有在附近有同門能來救時才會倒地；孤身一人照舊直接身隕（不必乾等 40 秒）
function y47HasRescuer(u){const R=TUNE.y47n.rescR;for(const o of S.units)if(o!==u&&(o.kind==='disciple'&&!o.np)&&!o.dead&&!o.y47dn&&!o.inside&&dist(o.x,o.y,u.x,u.y)<=R)return true;return false;}
function y47Down(u){if(!u)return;if(u.y47dn)return; // 已倒地：勿重複 toast／重設
  u.dead=false;u.hp=1;u.y47dn={b:100,t0:S.time,x:u.x,y:u.y,ox:u.x,oy:u.y,dg:0};u.task=null;u.path=[];u.dvx=u.dvy=u.vx=u.vy=0;u.medit=false;u.working=false;if(u.aiJob)u.aiJob=null;if(u.y47e)y47EvRelease(u);if(u.y47dj)u.y47dj=null;
  for(const w of S.enemies)if(w.target&&w.target.k==='u'&&w.target.id===u.id)w.target=null;floater(u.x,u.y,'倒地！','#ff9a9a');
  const msg=(u.kind==='player'?'你':'弟子「'+u.name+'」')+'倒地了！'+TUNE.y47n.bleed+' 秒內被同伴救起就能撐過去';
  if(u._y47DownMsg!==msg||(S.time-(u._y47DownAt||0))>2){u._y47DownMsg=msg;u._y47DownAt=S.time;toast(msg);}}
function y47DnDie(u){const D=u.y47dn;u.y47dn=null;u.hp=0;if(u.kind==='player'){onPlayerDeath0(u);return;}S.units=S.units.filter(x=>x!==u);selUnits=selUnits.filter(id=>id!==u.id);try{corpse(u);}catch(e){}toast(`弟子「${u.name}」傷重不治，不幸隕落……`);
  for(const w of S.enemies)if(w.target&&w.target.k==='u'&&w.target.id===u.id)w.target=null;}
function y47Revive(u,by){if(!u||!u.y47dn)return;u.y47dn=null;u.hp=Math.max(u.hp,Math.round(u.maxhp*TUNE.y47n.revHp));u.lastHit=S.time-3;fx('ring',u.x,u.y,'#9fffb0');floater(u.x,u.y,'救起！','#9fffb0');
  toast(`${by?pnm(by)+'把':''}${pnm(u)}救了起來`);for(const o of S.units)if(o.y47rs&&o.y47rs.tid===u.id)o.y47rs=null;}
let onPlayerDeath0=onPlayerDeath;
{const _pd=onPlayerDeath;onPlayerDeath0=_pd;onPlayerDeath=function(u){if(Y47.inDmg===u&&y47DnOk(u)&&!u.y47dn){Y47.wantDown=u;return;}return _pd.apply(this,arguments);};}
{const _du=dmgUnit;dmgUnit=function(src,u,amt){if(!u||u.dead||!y47DnOk(u)||(typeof v49Client==='function'&&v49Client()))return _du.apply(this,arguments);
  if(u.y47dn){if(amt>0){u.y47dn.b-=amt/Math.max(1,u.maxhp)*TUNE.y47n.hitK;u.lastHit=S.time;floater(u.x,u.y,'-'+Math.round(amt),'#ff7070');if(u.y47dn.b<=0)y47DnDie(u);}return;}
  const t0=toast,nc=corpses.length,isD=u.kind==='disciple';Y47.inDmg=u;Y47.wantDown=null;let r;
  toast=function(m){if(isD&&typeof m==='string'&&m.indexOf('「'+u.name+'」不幸隕落')>=0)return;return t0.apply(this,arguments);};
  try{r=_du.apply(this,arguments);}finally{toast=t0;Y47.inDmg=null;}
  const fell=isD?(u.hp<=0&&!S.units.includes(u)):(Y47.wantDown===u);Y47.wantDown=null;
  if(fell){if(isD)S.units.push(u);if(corpses.length>nc&&corpses[corpses.length-1]){corpses.length=nc;}u._cp=0;y47Down(u);}
  return r;};}
// 倒地每幀：流血、原地不動；附近空閒弟子會跑來救，主角走到旁邊會自動救
function y47DnTick(dt){const T=TUNE.y47n,P=player();
  for(const u of S.units){const D=u.y47dn;if(!D)continue;if(S.dg||u.dead){u.y47dn=null;continue;}u.x=D.x;u.y=D.y;u.hp=1;D.b-=dt*100/T.bleed;
    if(D.b<=0){y47DnDie(u);continue;}
    // 玩家救援（主角在旁邊、沒被打）
    if(P&&P!==u&&!P.dead&&!P.y47dn&&dist(P.x,P.y,u.x,u.y)<=T.pR&&S.time-(P.lastHit==null?-99:P.lastHit)>1.5){D.pp=(D.pp||0)+dt;if(D.pp>=T.revT[1]){y47Revive(u,P);continue;}}else D.pp=0;
    // 找弟子來救
    if(!D.rs||!(()=>{const o=unitById(D.rs);return o&&!o.dead&&!o.y47dn&&o.y47rs&&o.y47rs.tid===u.id;})()){D.rs=null;let best=null,bd=T.rescR;
      for(const o of S.units){if(o===u||o.kind!=='disciple'||o.np||o.dead||o.y47dn||o.y47rs||o.y47dj||o.inside||o.job==='follow')continue;if(o.task&&o.task.type==='attack')continue;if(nearestEnemy(o.x,o.y,T.foeR))continue;const d=dist(o.x,o.y,u.x,u.y);if(d<bd){bd=d;best=o;}}
      if(best){D.rs=best.id;best.y47rs={tid:u.id,t0:S.time,p:0};if(best.aiJob)aiEnd(best);if(best.y47e)y47EvRelease(best);best.thought='🩹';best.thT=S.time;}}}}
// #188 找拖行終點：遠離最近的敵人，距倒地原點不超過 dragMax 格，必須是同一片可走區域且路徑不能繞遠
function y47DragDest(o,u){const T=TUNE.y47n,D=u.y47dn,e=nearestEnemy(u.x,u.y,T.dragFoe);if(!e)return null;
  let ax=u.x-e.x,ay=u.y-e.y;const al=Math.hypot(ax,ay)||1;ax/=al;ay/=al;const c=unitComp(u),ed0=dist(u.x,u.y,e.x,e.y);
  for(const L of T.dragL)for(const a of [0,0.45,-0.45,0.9,-0.9,1.3,-1.3]){const ca=Math.cos(a),sa=Math.sin(a),dx=ax*ca-ay*sa,dy=ax*sa+ay*ca;
    const x=u.x+dx*L,y=u.y+dy*L,i=Math.floor(x),j=Math.floor(y);if(!inMap(i,j)||block[j*N+i]||comp[j*N+i]!==c)continue;
    // 救援者走到終點再往前 dragGap，被拖的人才會剛好停在 L 格處
    const rx=x+dx*T.dragGap,ry=y+dy*T.dragGap,ri=Math.floor(rx),rj=Math.floor(ry);if(!inMap(ri,rj)||block[rj*N+ri]||comp[rj*N+ri]!==c)continue;
    if(dist(x,y,D.ox,D.oy)>T.dragMax)continue;const ne=nearestEnemy(x,y,ed0+1);if(ne&&dist(x,y,ne.x,ne.y)<ed0+1.5)continue;
    // 直線上每半格都要可走（拖人不翻牆），不然就算 A* 有路也不選，保證「短距離」
    let okL=true;const LL=L+T.dragGap;for(let k=1,n=Math.ceil(LL*2);k<=n;k++){const px=u.x+dx*LL*k/n,py=u.y+dy*LL*k/n;if(blockedP(px,py)){okL=false;break;}}if(!okL)continue;
    return {x:rx,y:ry};}
  return null;}
function y47DragEnd(o,u,R,why){R.ph='rev';if(u&&u.y47dn)u.y47dn.dg=0;o.path=[];o.dvx=o.dvy=0;if(why)floater(o.x,o.y,why,'#ffd08a');}
function y47RsStep(o,dt){const T=TUNE.y47n,R=o.y47rs,u=unitById(R.tid);if(!u||!u.y47dn||o.dead||(o.holdT&&o.holdT>R.t0)||S.time-R.t0>60){if(u&&u.y47dn)u.y47dn.dg=0;o.y47rs=null;return false;}
  const D=u.y47dn;
  // 拖行中被打或被纏上 → 中斷，先應戰；之後回來會重新判斷要不要再拖（最多 dragTries 次）
  if(R.ph==='drag'&&((o.lastHit!=null&&o.lastHit>R.ts)||nearestEnemy(o.x,o.y,T.foeR-1))){R.n=(R.n||0)+1;R.ph=R.n>=T.dragTries?'rev':null;D.dg=0;o.path=[];floater(o.x,o.y,'拖行中斷','#ffb070');return false;}
  if(nearestEnemy(o.x,o.y,T.foeR-1))return false;
  if(R.ph==='drag'){
    if(S.time-R.t2>T.dragT){y47DragEnd(o,u,R);return true;}
    const dd=dist(o.x,o.y,R.dx,R.dy);if(dd<0.35||(!o.path.length&&dd<1.2)){y47DragEnd(o,u,R);return true;}
    if(!o.path.length&&!pathTo(o,R.dx,R.dy)){y47DragEnd(o,u,R);return true;}
    followPath(o,dt,T.dragSp);
    // 被拖的人跟在救援者身後（只放在可走的格子上）
    const gx=o.x-u.x,gy=o.y-u.y,g=Math.hypot(gx,gy);if(g>T.dragGap){const k=(g-T.dragGap)/g,nx=u.x+gx*k,ny=u.y+gy*k;if(!blockedP(nx,ny)){D.x=nx;D.y=ny;u.x=nx;u.y=ny;}}
    D.dg=1;faceTo(o,u.x,u.y);o.working=false;return true;}
  const d=dist(o.x,o.y,u.x,u.y);if(d>1.5){const r=walkTo(o,dt,u.x+(o.x>=u.x?0.6:-0.6),u.y,0.5);if(r===true&&dist(o.x,o.y,u.x,u.y)>1.5)o.path=[];if(r===null){o.y47rs=null;return false;}R.p=0;return true;}
  // 到了旁邊：附近還有敵人就先拖開一小段
  if(R.ph!=='rev'&&(R.n||0)<T.dragTries){const g=y47DragDest(o,u);if(g){R.ph='drag';R.dx=g.x;R.dy=g.y;R.ts=S.time;R.t2=S.time;R.p=0;o.path=[];if(!pathTo(o,g.x,g.y)){y47DragEnd(o,u,R);}else{D.dg=1;floater(o.x,o.y,'拖離戰場','#ffd08a');return true;}}else R.ph='rev';}
  o.dvx=o.dvy=0;faceTo(o,u.x,u.y);o.working=true;R.p+=dt;if(R.p>=T.revT[0]){o.y47rs=null;o.working=false;D.dg=0;y47Revive(u,o);}return true;}
{const _ud=updateDisciple;updateDisciple=function(u,dt){if(u&&u.y47dn){u.dvx=u.dvy=0;u.path=[];u.working=false;return;}if(u&&u.y47rs&&!(typeof v49Client==='function'&&v49Client())){try{if(y47RsStep(u,dt))return;}catch(e){u.y47rs=null;}}return _ud.apply(this,arguments);};}
{const _uu=updateUnit;updateUnit=function(u,dt){if(u&&u.y47dn){u.dvx=u.dvy=0;u.path=[];return;}return _uu.apply(this,arguments);};}
{const _f=y47EvFree;y47EvFree=function(u){return !!u&&!u.y47dn&&!u.y47rs&&_f(u);};}
{const _f=y47Attacked;y47Attacked=function(u){return !!(u&&u.y47dn)||_f(u);};}
{const _x=dgEnter;dgEnter=function(){for(const u of S.units)if(u.y47dn)y47Revive(u,null);return _x.apply(this,arguments);};}
// 繪製：倒地血條＋救援進度
function y47DrawDn(){const now=performance.now();for(const u of S.units){const D=u.y47dn;if(!D&&!u.y47rs)continue;const b=P(u.x,u.y,0);ctx.save();
  if(D&&D.dg){const o=S.units.find(q=>q.y47rs&&q.y47rs.tid===u.id);if(o){const h=P(o.x,o.y,14);ctx.strokeStyle='rgba(60,30,10,.9)';ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(h.x,h.y);ctx.lineTo(b.x,b.y-6);ctx.stroke();ctx.strokeStyle='#e8c890';ctx.lineWidth=1.5;ctx.stroke();
    ctx.fillStyle='rgba(140,110,70,.45)';for(let k=1;k<=3;k++){const dx=b.x+(b.x-h.x)*0.18*k,dy=b.y+(b.y-h.y+6)*0.18*k;ctx.beginPath();ctx.ellipse(dx,dy,7-k,2.5,0,0,6.283);ctx.fill();}}}
  if(D){ctx.globalAlpha=0.5;ctx.fillStyle='#600';ctx.beginPath();ctx.ellipse(b.x,b.y,14,6,0,0,6.283);ctx.fill();ctx.globalAlpha=1;
    const w=34,p=clamp(D.b/100,0,1);ctx.fillStyle='rgba(0,0,0,.7)';ctx.fillRect(b.x-w/2,b.y-52,w,5);ctx.fillStyle=p>0.35?'#ff6060':(Math.floor(now/250)%2?'#ff2020':'#ffb0b0');ctx.fillRect(b.x-w/2,b.y-52,w*p,5);
    ctx.font='bold 10px sans-serif';ctx.textAlign='center';ctx.lineWidth=3;ctx.strokeStyle='rgba(0,0,0,.8)';const t=D.dg?'被拖離戰場':'倒地　待救援';ctx.strokeText(t,b.x,b.y-56);ctx.fillStyle='#ffd0d0';ctx.fillText(t,b.x,b.y-56);
    const pr=D.pp?D.pp/TUNE.y47n.revT[1]:0;let rp=pr;for(const o of S.units)if(o.y47rs&&o.y47rs.tid===u.id)rp=Math.max(rp,o.y47rs.p/TUNE.y47n.revT[0]);if(rp>0){ctx.fillStyle='rgba(0,0,0,.7)';ctx.fillRect(b.x-w/2,b.y-46,w,4);ctx.fillStyle='#9fffb0';ctx.fillRect(b.x-w/2,b.y-46,w*clamp(rp,0,1),4);}}
  ctx.restore();}}
{const _dw=drawV045World;drawV045World=function(){const r=_dw.apply(this,arguments);try{if(!S.interior)y47DrawDn();}catch(e){}return r;};}
// 倒地的人畫成躺下（壓扁＋旋轉）
{const _dd=drawHuman;drawHuman=function(u){if(!u||!u.y47dn||ART.s!=='0')return _dd.apply(this,arguments);const b=P(u.x,u.y,0);ctx.save();ctx.translate(b.x,b.y);ctx.rotate(-1.2);ctx.translate(-b.x,-b.y);ctx.globalAlpha=0.85;try{return _dd.apply(this,arguments);}finally{ctx.restore();}};}
{const _c=castSkill;castSkill=function(){const p=player();if(p&&p.y47dn){toast('倒地中無法施展，等同門來救');return;}return _c.apply(this,arguments);};}
{const _p=usePill;usePill=function(u,k){if(u&&u.y47dn)return false;return _p.apply(this,arguments);};}
{const _b=tryBreak;tryBreak=function(u){if(u&&u.y47dn)return false;return _b.apply(this,arguments);};}
SYS_TXT.push(['倒地救援','氣血歸零先倒地，40 秒內被救起就不會死',()=>`<span class="tg">倒地後原地不動，倒地血條 ${TUNE.y47n.bleed} 秒流光；再被打會掉得更快</span><span class="tg">附近 ${TUNE.y47n.rescR} 格內空閒的弟子會跑來救：旁邊有敵人時先慢慢把人拖離戰場一小段（約 4～6 格），再救治 ${TUNE.y47n.revT[0]} 秒；拖行中救援者被打會中斷，你走到旁邊也會自動救（${TUNE.y47n.revT[1]} 秒）</span><span class="tg">救起後氣血回到 ${TUNE.y47n.revHp*100}%</span><span class="tg">秘境內維持原本的「傷退」規則</span>`]);
// ======================= v0.4.7 #73 護宗陣：以大殿為中心的屏障，自己人與中立可自由進出，敵人擋在外面 =======================
TUNE.y47b={r:12,rLv:2,max:800,maxLv:400,regen:6,regenWait:5,drain:0.4,brokeCd:45,tick:0.5};
BUILD.huzhen={name:'護宗陣',size:2,cost:{stone:120,lingshi:60,iron:20},time:20,pop:0,hp:600,desc:''};
BDESC.huzhen={s:'以大殿為中心張開屏障，敵人進不來',t:b=>[`屏障半徑 ${y47BR(blv(b))} 格`,`陣力 ${y47BMax(blv(b))}`,'自己人、村民、商旅可自由進出'],d:'建好後以宗門大殿為中心張開一圈護宗大陣：弟子、你、村民和路過的商旅都能自由穿過，妖獸、山賊等敵人會被擋在外面。敵人撞陣會消耗陣力，陣力耗盡時大陣會破開一段時間再重新張開；沒被攻擊時陣力會慢慢回復。升級可擴大範圍、提高陣力。'};
BUILD.huzhen.desc=BDESC.huzhen.s+'。'+BDESC.huzhen.d;
BUILD_ORDER.push('huzhen');
B49.huzhen={n:'大陣擴張',f:lv=>`半徑 ${y47BR(lv)} 格、陣力 ${y47BMax(lv)}`};
V50L.huzhen=b=>{const B=y47BS(),on=y47BOn();return [['屏障',on?`張開中（半徑 ${y47BR(blv(b))} 格）`:(B.br>S.time?`已破，${Math.ceil(B.br-S.time)} 秒後重新張開`:'未張開')],['陣力',`${Math.floor(B.e||0)} / ${y47BMax(y47BLv())}`],['通行','自己人與中立可進出，敵人不行']];};
function y47BR(lv){return TUNE.y47b.r+TUNE.y47b.rLv*(Math.max(1,lv)-1);}
function y47BMax(lv){return TUNE.y47b.max+TUNE.y47b.maxLv*(Math.max(1,lv)-1);}
function y47BLv(){let lv=0;for(const b of S.buildings)if(b.type==='huzhen'&&b.built&&!b.broken)lv=Math.max(lv,blv(b)||1);return lv;}
function y47BS(){const F=S.flags;if(!F.y47b||typeof F.y47b!=='object')F.y47b={e:0,br:0,hit:-99};return F.y47b;}
function y47BOn(){if(S.dg)return false;const lv=y47BLv();if(!lv)return false;const B=y47BS();return B.br<=S.time&&B.e>0;}
function y47BHostile(e){if(!e||e.kind||!e.type||!ENEMY[e.type]||e.hp<=0)return false;if(e.type==='militia'){const v=vById(e.camp);return !!(v&&vStatus(v)==='hostile');}return true;}
function y47BHit(e,dt){const B=y47BS();B.e-=((e.atk||ENEMY[e.type].atk||5)*TUNE.y47b.drain)*dt;B.hit=S.time;Y47.bFl=performance.now();if(B.e<=0){B.e=0;B.br=S.time+TUNE.y47b.brokeCd;toast(`⚠ 護宗陣被攻破了！${TUNE.y47b.brokeCd} 秒後才能重新張開`);}}
{const _me=moveEntity;moveEntity=function(o,dt){if(!o||o.kind||!S.enemies||S.dg||(typeof v49Client==='function'&&v49Client())||!Y47.bOn)return _me.apply(this,arguments);
  const x0=o.x,y0=o.y;const r=_me.apply(this,arguments);try{if(y47BHostile(o)){const c=Y47.bC,R=Y47.bR;const d1=dist(o.x,o.y,c.x,c.y);if(d1<R){const a=Math.atan2(o.y-c.y,o.x-c.x)||0;o.x=c.x+Math.cos(a)*R;o.y=c.y+Math.sin(a)*R;const vr=(o.vx||0)*Math.cos(a)+(o.vy||0)*Math.sin(a);if(vr<0){o.vx-=vr*Math.cos(a);o.vy-=vr*Math.sin(a);}o.dvx=o.dvy=0;o.xsh=1;o.xshT=S.time;}}}catch(e){}return r;};}
function y47BTick(dt){const B=y47BS(),lv=y47BLv();Y47.bOn=false;if(!lv||S.dg){return;}const mx=y47BMax(lv);
  if(B.br>S.time){return;}if(B.br&&B.br<=S.time&&B.e<=0){B.e=Math.round(mx*0.3);B.br=0;toast('🛡 護宗陣重新張開');}
  if(S.time-B.hit>TUNE.y47b.regenWait)B.e=Math.min(mx,(B.e||0)+TUNE.y47b.regen*dt*lv);if(B.e>mx)B.e=mx;if(!B.init){B.init=1;B.e=mx;}
  if(B.e<=0)return;const c=sectCenter(),R=y47BR(lv);Y47.bOn=true;Y47.bC=c;Y47.bR=R;
  // 深入陣內的敵人才彈到陣邊（陣邊的敵人停下攻陣，不來回推擠）
  for(const e of S.enemies){if(!y47BHostile(e))continue;const d=dist(e.x,e.y,c.x,c.y);if(d<R-1.2){const a=Math.atan2(e.y-c.y,e.x-c.x)||rnd()*6.283;let nx=c.x+Math.cos(a)*R,ny=c.y+Math.sin(a)*R;const f=nearestFree(nx,ny,-1);if(f&&dist(f.i+0.5,f.j+0.5,c.x,c.y)>=R-0.2){nx=f.i+0.5;ny=f.j+0.5;}e.x=nx;e.y=ny;e.vx=e.vy=0;e.dvx=e.dvy=0;e.path=[];e.xsh=1;e.xshT=S.time;}}}
function y47DrawB(){if(S.dg||S.interior||!y47BOn())return;const c=sectCenter(),R=y47BR(y47BLv()),B=y47BS(),now=performance.now();const fl=Math.max(0,1-(now-(Y47.bFl||0))/400),pul=0.5+0.5*Math.sin(now/700);const lo=B.e/Math.max(1,y47BMax(y47BLv()));
  ctx.save();const n=72;for(const [z,al,w] of [[0,0.35+0.25*fl,2.5],[14,0.12+0.2*fl,1.5]]){ctx.beginPath();for(let k=0;k<=n;k++){const a=k/n*6.283,p=P(c.x+Math.cos(a)*R,c.y+Math.sin(a)*R,z);k?ctx.lineTo(p.x,p.y):ctx.moveTo(p.x,p.y);}
    ctx.strokeStyle=lo<0.3?`rgba(255,160,120,${al+0.1*pul})`:`rgba(140,210,255,${al+0.1*pul})`;ctx.lineWidth=w;ctx.stroke();}
  ctx.fillStyle=`rgba(170,225,255,${0.5+0.3*fl})`;ctx.font='9px serif';ctx.textAlign='center';for(let k=0;k<16;k++){const a=k/16*6.283+now/9000,p=P(c.x+Math.cos(a)*R,c.y+Math.sin(a)*R,4+3*Math.sin(now/500+k));ctx.fillText('卍☯☰☷'[k%4],p.x,p.y);}
  ctx.restore();}
{const _dw=drawV045World;drawV045World=function(){const r=_dw.apply(this,arguments);try{y47DrawB();}catch(e){}return r;};}
{const _ds=drawBuildingShape;drawBuildingShape=function(type,i,j,t,alpha,b){if(type!=='huzhen')return _ds(type,i,j,t,alpha,b);_ds(type,i,j,t,alpha,b);};}
{const i=SYS_TXT.findIndex(x=>x[0]==='陣法');if(i>=0)SYS_TXT[i]=['陣法','聚靈陣、護宗陣都已開放',()=>'聚靈陣：範圍內靈氣回復提高，房屋在範圍內效果最好。護宗陣：以大殿為中心張開屏障，只讓自己人與中立通過，敵人會被擋在外面（詳見「護宗陣」）。'];}
SYS_TXT.push(['護宗陣','建好後以大殿為中心張開屏障，敵人進不來',()=>`<span class="tg">弟子、你、村民與商旅可自由穿過，妖獸、山賊會被擋在陣外</span><span class="tg">半徑 ${TUNE.y47b.r} 格起，每升一級 +${TUNE.y47b.rLv}；陣力 ${TUNE.y47b.max} 起</span><span class="tg">敵人撞陣會消耗陣力，耗盡會破開 ${TUNE.y47b.brokeCd} 秒；沒被攻擊時慢慢回復</span><span class="tg">秘境裡沒有護宗陣</span>`]);
// ======================= v0.4.7 #76 山寨：山賊會越聚越多、大武師後陸續冒出新山寨（煉氣頭目＋寶箱），地圖上山賊清光就不再出現 =======================
TUNE.y47c={from:2,first:150,every:[300,480],base:2,perB:8,maxNew:4,rMin:38,rMax:75,growT:150,growMax:[10,12],growEvery:40,chiefR:4,chestR:1.3,xq:0.002,names:['青狼寨','斷魂寨','鬼頭寨','落雁寨','鐵骨寨','血刀寨','狂風寨','虎跳寨','野狐寨','黑水寨']};
QN.push('仙器');QC.push('#ff6a6a');QMUL.push(4.6);EN_KEEP.push('y47b');
function y47CS(){const F=S.flags;if(!F.y47c||typeof F.y47c!=='object')F.y47c={next:null,stop:0,n:0,camps:[],chests:[],age:{}};const C=F.y47c;C.camps=C.camps||[];C.chests=C.chests||[];C.age=C.age||{};return C;}
function y47Bandits(){let n=0;for(const e of S.enemies){if(e.hp<=0||e.camp==null)continue;const v=vById(e.camp);if(v&&v.type==='bandit')n++;}return n;}
function y47CampsAlive(){return S.villages.filter(v=>v.type==='bandit'&&!v.destroyed);}
function y47CampCap(n){const T=TUNE.y47c;return T.base+Math.min(T.maxNew,1+Math.floor(n/T.perB));}
// 投靠與原成長共用同一個年齡目標；不裁減已存在／已超額成員。
function y47CampGrowCap(v,a,T){T=T||TUNE.y47c;return Math.min(T.growMax[v.y47n?1:0],6+Math.floor(a/T.growT));}
function y47CampCanReceive(v){if(!v||v.destroyed)return false;const C=S.flags.y47c,cap=y47CampGrowCap(v,C&&C.age&&C.age[v.id]||0,TUNE.y47c);let n=0;
  for(const e of S.enemies)if(e.camp===v.id&&!e.raid&&e.hp>0){if(++n>=cap)return false;}return n<cap;}
function y47CTileOk(x,y){if(!inMap(x,y))return false;const k=y*N+x;if(block[k]||occ[k]||nodeGrid[k]||roadMask[k])return false;const t=terrain[k];return !(t===T.WATER||t===T.SHALLOW||t===T.CLIFF||t===T.RUIN);}
function y47CSiteOk(ci,cj){if(ci<12||cj<12||ci>N-13||cj>N-13)return false;for(let y=cj-7;y<=cj+7;y++)for(let x=ci-7;x<=ci+7;x++){if(!inMap(x,y))return false;const k=y*N+x;const t=terrain[k];if(t===T.WATER||t===T.CLIFF||t===T.RUIN||occ[k])return false;}
  for(let y=cj-1;y<=cj+1;y++)for(let x=ci-1;x<=ci+1;x++)if(!y47CTileOk(x,y))return false;
  for(const v of S.villages)if(dist(v.x,v.y,ci,cj)<24)return false;for(const b of S.buildings)if(dist(b.i,b.j,ci,cj)<22)return false;
  try{for(const g of gates())if(dist(g.i,g.j,ci,cj)<12)return false;}catch(e){}
  const f=nearestFree(ci,cj+3,-1);return !!f&&comp[f.j*N+f.i]===startComp;}
function y47CampBuild(c){const v={id:c.id,name:c.name,type:'bandit',rel:-100,x:c.x,y:c.y,stock:TRADES.map(()=>5),stockT:0,quest:null,qcd:15,qn:0,raidT:null,raids:0,warned:false,destroyed:false,tradeId:null,chiefId:null,spawnT:0,y47n:1};
  S.villages.push(v);for(const [type,i,j,id] of c.st){const D=VS[type];S.vstructs.push({id,vid:v.id,type,i,j,s:D.s,hp:D.hp||0,maxhp:D.hp||0,dead:false});if(type==='chief')v.chiefId=id;}return v;}
function y47CampNew(force){const C=y47CS(),T=TUNE.y47c,c0=sectCenter();for(let t=0;t<900;t++){const a=rnd()*6.283,w=t<450?0:12,r=T.rMin-w*0.6+rnd()*(T.rMax-T.rMin+w*2);const ci=Math.round(c0.x+Math.cos(a)*r),cj=Math.round(c0.y+Math.sin(a)*r);if(!y47CSiteOk(ci,cj))continue;
    C.n++;const id=100+C.n,sid=k=>20000+id*50+k;const st=[['chief',ci-1,cj-1,sid(0)]];let k=1;const used=new Set();for(let y=cj-1;y<=cj+1;y++)for(let x=ci-1;x<=ci+1;x++)used.add(x+','+y);
    const ok2=(type,i,j)=>{const s=VS[type].s;for(let y=j;y<j+s;y++)for(let x=i;x<i+s;x++){if(used.has(x+','+y)||!y47CTileOk(x,y))return false;}for(let y=j;y<j+s;y++)for(let x=i;x<i+s;x++)used.add(x+','+y);return true;};
    for(const [dx,dy] of [[-5,-3],[3,-4],[-4,3],[3,3]])if(ok2('tent',ci+dx,cj+dy))st.push(['tent',ci+dx,cj+dy,sid(k++)]);
    const gate=Math.atan2(c0.y-cj,c0.x-ci);for(let s=0;s<56;s++){const ang=s/56*6.283;const dg=Math.abs(((ang-gate)%6.283+9.425)%6.283-3.1416);if(dg<0.42)continue;const i=Math.round(ci+Math.cos(ang)*6.6),j=Math.round(cj+Math.sin(ang)*6.6);if(ok2('stake',i,j))st.push(['stake',i,j,sid(k++)]);}
    const used2=C.camps.map(x=>x.name);const nm0=T.names.find(n=>!used2.includes(n))||('無名寨'+C.n);
    const c={id,name:nm0,x:ci+0.5,y:cj+0.5,st};C.camps.push(c);const v=y47CampBuild(c);y47AfterBlock();
    const f=nearestFree(v.x,v.y+2.5,-1);const ch=makeEnemy('chief',f.i+0.5,f.j+0.5,{camp:v.id,realm:T.chiefR,name:'煉氣頭目',y47b:1});ch.home={x:ch.x,y:ch.y};S.enemies.push(ch);
    for(let q=0;q<3;q++)spawnCampMember(v,'guard');for(let q=0;q<2;q++)spawnCampMember(v,'patrol');
    v.raidT=S.time+TUNE.raidEvery[0]+rnd()*(TUNE.raidEvery[1]-TUNE.raidEvery[0]);
    const dir=['東','東南','南','西南','西','西北','北','東北'][Math.round(((Math.atan2(v.y-c0.y,v.x-c0.x)+6.283)%6.283)/0.785)%8];
    toast(`📯 探子回報：宗門${dir}方出現新的山寨「${v.name}」，寨主是煉氣期的頭目！`);try{ping(v.x,v.y,true);}catch(e){}return v;}
  return null;}
{const _cr=campRealm;campRealm=function(v){if(v&&v.y47n)return 2;return _cr.apply(this,arguments);};}
function y47CampTick(dt){if(S.dg||(typeof v49Client==='function'&&v49Client()))return;const C=y47CS(),T=TUNE.y47c,P=player();const nB=y47Bandits();
  C.zc=nB===0?(C.zc||0)+1:0;if(!C.stop&&C.zc>=3){C.stop=1;toast('🏳 方圓百里的山賊都被肅清了，從此不會再有新的山寨');}
  if(C.stop){for(const v of S.villages)if(v.type==='bandit')v.respT=-1e9;}
  // 新山寨：主角大武師以後，依山賊數量慢慢增加
  if(!C.stop&&P&&P.realm>=T.from){if(C.next==null)C.next=S.time+T.first;if(S.time>=C.next){C.next=S.time+T.every[0]+rnd()*(T.every[1]-T.every[0]);if(y47CampsAlive().length<y47CampCap(nB)&&!y47CampNew())C.next=S.time+30;}}
  // 山賊越聚越多：山寨存在越久，留守人數上限越高
  if(!C.stop)for(const v of y47CampsAlive()){const a=(C.age[v.id]||0)+dt;C.age[v.id]=a;const mem=S.enemies.filter(e=>e.camp===v.id&&!e.raid&&e.hp>0);
    if(v.y47n&&!mem.some(e=>e.y47b)&&!mem.length){campDestroyed(v);continue;}
    const cap=y47CampGrowCap(v,a,T);v.y47gt=(v.y47gt||0)+dt;if(mem.length>=1&&mem.length<cap&&v.y47gt>=T.growEvery&&(!P||dist(P.x,P.y,v.x,v.y)>16)){v.y47gt=0;spawnCampMember(v,'guard');}}
  // 寶箱：主角或弟子走到旁邊自動打開
  for(const ch of C.chests){if(ch.open)continue;for(const u of S.units){if(u.dead||u.y47dn||u.inside)continue;if(dist(u.x,u.y,ch.x,ch.y)<=T.chestR){y47ChestOpen(ch,u);break;}}}
  C.chests=C.chests.filter(ch=>!ch.open||S.time-ch.open<20);}
function y47ChestLoot(){const T=TUNE.y47c,L={res:{lingshi:ri(60,120),iron:ri(20,40)},mats:{xuantie:ri(1,2),lingzhi:ri(0,1)},it:null};
  const r=rnd();let q=r<T.xq?5:r<0.3?3:2;const pool=q===5?['sword','saber','spear','faqi']:GEAR_ORDER;L.it={t:pool[Math.floor(rnd()*pool.length)],q};return L;}
function y47ChestOpen(ch,u){ch.open=S.time;const L=y47ChestLoot();for(const k in L.res)S.res[k]=(S.res[k]||0)+L.res[k];for(const k in L.mats)if(L.mats[k])addMat(k,L.mats[k]);const it=makeItem(L.it.t,L.it.q,rnd()<0.4?ri(0,4):-1);addItem(it,ch.x,ch.y);
  ch.got=itemName(it);fx('break',ch.x,ch.y,L.it.q===5?'#ff6a6a':'#ffe27a');
  toast(`🎁 ${pnm(u)}打開了「${ch.name}」的山寨寶箱：靈石 ${L.res.lingshi}、鐵礦 ${L.res.iron}、玄鐵 ${L.mats.xuantie}${L.mats.lingzhi?'、靈芝 '+L.mats.lingzhi:''}、${itemName(it)}`);
  if(L.it.q===5)setTimeout(()=>toast(`✨ 寶箱裡竟然有一件仙器「${itemName(it)}」！`),600);return L;}
{const _ke=killEnemy;killEnemy=function(src,e){const r=_ke.apply(this,arguments);try{if(e&&e.y47b&&!S.dg&&!(typeof v49Client==='function'&&v49Client())){const C=y47CS(),v=vById(e.camp);if(!C.chests.some(c=>c.vid===e.camp)){let cx=e.x,cy=e.y;if(blockedP(cx,cy)){const f=nearestFree(Math.floor(cx),Math.floor(cy),-1);if(f){cx=f.i+0.5;cy=f.j+0.5;}}/* 寶箱一定放在走得到的格子上 */C.chests.push({id:e.camp*10+1,vid:e.camp,name:v?v.name:'山寨',x:cx,y:cy,open:0,t0:S.time});toast(`煉氣頭目倒下了，留下一個山寨寶箱！走過去就能打開`);}}}catch(err){}return r;};}
function y47DrawCamp(){if(S.dg||S.interior)return;const C=y47CS(),now=performance.now();
  for(const ch of C.chests){const b=P(ch.x,ch.y,0);ctx.save();if(ch.open){ctx.globalAlpha=Math.max(0,1-(S.time-ch.open)/20);}
    ctx.fillStyle='#5a3416';ctx.fillRect(b.x-9,b.y-10,18,10);ctx.fillStyle='#7a4a20';ctx.fillRect(b.x-9,b.y-(ch.open?18:15),18,ch.open?3:6);ctx.fillStyle='#e8c050';ctx.fillRect(b.x-9,b.y-10,18,2);ctx.fillRect(b.x-1.5,b.y-12,3,5);
    if(!ch.open){ctx.globalAlpha=0.5+0.4*Math.sin(now/250);ctx.fillStyle='#fff3a0';ctx.beginPath();ctx.arc(b.x,b.y-20,2.5,0,6.283);ctx.fill();ctx.globalAlpha=1;label('山寨寶箱',b.x,b.y-26,'#ffe27a');}ctx.restore();}}
{const _dw=drawV045World;drawV045World=function(){const r=_dw.apply(this,arguments);try{y47DrawCamp();}catch(e){}return r;};}
// 存讀檔：新山寨的村莊與營帳要重建（原本只存既有村莊的狀態）
{const _a=applySave;applySave=function(d){const r=_a.apply(this,arguments);try{const C=y47CS();let add=false;for(const c of C.camps){if(vById(c.id))continue;const v=y47CampBuild(c);add=true;
      const vv=(d.villages||[]).find(x=>x.id===c.id);if(vv)Object.assign(v,vv);for(const sv of d.vstructs||[]){if(sv.id<20000+c.id*50||sv.id>=20000+c.id*50+50)continue;const s=sById(sv.id);if(s){s.hp=sv.hp;s.dead=sv.dead;}}}
    if(add)y47AfterBlock();}catch(e){console.warn('y47 camp',e);}return r;};}
SYS_TXT.push(['山寨','山賊會越聚越多；大武師以後會冒出新山寨',()=>`<span class="tg">山寨存在越久，留守的山賊越多（最多 ${TUNE.y47c.growMax[0]}～${TUNE.y47c.growMax[1]} 人）</span><span class="tg">你到「大武師」後，新山寨會陸續出現，地圖上的山賊越多，山寨也越多</span><span class="tg">新山寨由煉氣期頭目坐鎮，打倒後留下山寨寶箱（仙器 ${(TUNE.y47c.xq*100).toFixed(1)}%，真概率）</span><span class="tg">地圖上的山賊全部清光後，就再也不會出現新的山寨</span>`]);
{const _u=update;update=function(dt){const r=_u.apply(this,arguments);try{Y47.tk=(Y47.tk||0)+dt;if(Y47.tk>=1){const t=Y47.tk;Y47.tk=0;y47VillageTick(t);y47CampTick(t);}if(!(typeof v49Client==='function'&&v49Client())){y47DjTick();y47DnTick(dt);Y47.bt=(Y47.bt||0)+dt;if(Y47.bt>=0.25){y47BTick(Y47.bt);Y47.bt=0;}Y47.et=(Y47.et||0)+dt;if(Y47.et>=TUNE.y47e.tick){Y47.et=0;y47EvTick();}Y47.pt=(Y47.pt||0)+dt;if(Y47.pt>=TUNE.y47p.tick){Y47.pt=0;y47PkTick();}}}catch(e){console.error('[y47] tick',e);}return r;};}
{const _x=XW045;XW045=function(){const o=_x();o.v47y={Y47,vg:y47VG,vgain:y47VGain,vtick:y47VillageTick,guardCap:y47GuardCap,growHouse:y47GrowHouse,setRel:(v,d)=>setRel(v,d),compOf:(x,y)=>{const f=nearestFree(x,y,-1);return f?comp[f.j*N+f.i]:0;},eff:y47Eff,sleepTick:y47SleepTick,pk:y47PK,pkN:y47PkN,pkCap:y47PkCap,pkTake:y47PkTake,pkNear:y47PkNear,pkUse:y47PkUse,pkRefill:y47PkRefill,pkTick:y47PkTick,djTick:y47DjTick,attacked:y47Attacked,stTxt:y47StTxt,nearShitang:y47NearShitang,EV:Y47EV,evS:y47EvS,evTick:y47EvTick,evPost:y47EvPost,evPool:y47EvPool,evPower:y47EvPower,evHtml:y47EvHtml,evFree:y47EvFree,dnTick:y47DnTick,bTick:y47BTick,cS:y47CS,cTick:y47CampTick,cNew:y47CampNew,cBandits:y47Bandits,cCap:y47CampCap,chestLoot:y47ChestLoot,chestOpen:y47ChestOpen,bOn:y47BOn,bS:y47BS,bR:y47BR,bHostile:y47BHostile,down:y47Down,revive:y47Revive,dnOk:y47DnOk,dgReach:()=>{const D=S.dg;if(!D)return null;const c0=compAt(D.L.rooms[0].cx,D.L.rooms[0].cy);return D.L.rooms.every(r=>{const f=nearestFree(r.cx,r.cy,-1);return f&&comp[f.j*N+f.i]===c0;});}};return o;};}

// ---------- #189／#190 建造列：電腦版可收合成「建造（B）」小分頁（記住設定）；手機版打開建造清單時蓋住弟子列與其他面板 ----------
const BB190={col:XW_PREFS.get('bbcol','0')==='1',k:''};
function bb190Touch(){return document.body.classList.contains('touch');}
function bb190Eff(){return BB190.col&&!bb190Touch()&&hasAny('hall');}// 還沒蓋宗門大殿（教學階段）時一律展開
function bb190Set(v){BB190.col=!!v;XW_PREFS.set('bbcol',BB190.col?'1':'0');bb190Apply();}
function bb190Key(){if(bb190Touch()||!hasAny('hall'))return false;bb190Set(!BB190.col);toast(BB190.col?'建造列已收合（按 B 或點「建造」展開）':'建造列已展開');return true;}
function bb190TopB(tb){if(!tb||!tb.offsetParent)return 0;
  // 同一幀裡 y194Lay／banCorner／y48Lay 會反覆量頂欄。頂欄在這段同步讀取中不會變高，重用第一次的底緣。
  const stamp=(typeof chunkFrame==='number'?chunkFrame:0)+':'+(performance.now()/16|0);
  const c=bb190TopB._c;if(c&&c.tb===tb&&c.stamp===stamp)return c.v;
  let m=tb.getBoundingClientRect().bottom;for(const e of tb.querySelectorAll('.grp,.res,button,span')){if(!e.offsetParent)continue;const r=e.getBoundingClientRect();if(r.height>0&&r.bottom>m&&r.top<innerHeight*0.3)m=r.bottom;}
  bb190TopB._c={tb,stamp,v:m};return m;}
function bb190Apply(){const bb=document.getElementById('buildbar');if(!bb)return;const t=bb190Touch(),col=bb190Eff(),open=t&&bb.classList.contains('open');
  if(open){try{const tb=document.getElementById('topbar'),tbb=bb190TopB(tb),r=bb.getBoundingClientRect(),mh=Math.max(160,Math.floor(r.bottom-tbb-14))+'px';if(bb.style.maxHeight!==mh)bb.style.maxHeight=mh;}catch(e){}}else if(bb.style.maxHeight)bb.style.maxHeight='';
  const k=(t?1:0)+'|'+(col?1:0)+'|'+(open?1:0);if(k===BB190.k)return;BB190.k=k;
  bb.classList.toggle('bbcol',col);document.body.classList.toggle('bbopen',open);
  const l=bb.querySelector('.lbl');if(l){l.textContent=t?'建造　▾ 收合':col?'建造（B）▸':'建造（B）◂';l.title=t?'收合建造清單':col?'展開建造列（B）':'收合建造列（B）';}}
{const st=document.createElement('style');st.textContent=`
#buildbar .lbl{cursor:pointer;user-select:none;border-radius:4px}
#buildbar .lbl:hover{background:#3a2a18}
body:not(.touch) #buildbar.bbcol{padding:4px 6px;gap:0}
body:not(.touch) #buildbar.bbcol .bb{display:none}
body:not(.touch) #buildbar.bbcol .lbl{writing-mode:horizontal-tb;padding:4px 10px}
body.touch #buildbar .lbl{display:block!important;writing-mode:horizontal-tb;width:100%;text-align:center;padding:4px 0 6px;border-bottom:1px solid #5a4428;margin-bottom:2px}
body.touch #buildbar.open{z-index:40;background:#1a120bf8;overflow-y:auto;align-content:flex-start;overscroll-behavior:contain}
body.touch #buildbar .lbl{position:sticky;top:0;z-index:1;background:#1a120b}
body.touch.bbopen #pbar,body.touch.bbopen #panel,body.touch.bbopen #pb_menu,body.touch.bbopen #objectives,body.touch.bbopen #hint{display:none!important}`;document.head.appendChild(st);}
document.addEventListener('click',ev=>{if(!ev.target||!ev.target.closest||!ev.target.closest('#buildbar .lbl'))return;if(bb190Touch()){closeBuildMenu();bb190Apply();}else if(hasAny('hall'))bb190Set(!BB190.col);else toast('先蓋好宗門大殿後才能收合建造列');});
{const _o=openBuildMenu,_c=closeBuildMenu,_t=toggleBuildMenu;openBuildMenu=function(){const r=_o.apply(this,arguments);bb190Apply();return r;};closeBuildMenu=function(){const r=_c.apply(this,arguments);bb190Apply();return r;};toggleBuildMenu=function(){const r=_t.apply(this,arguments);bb190Apply();return r;};}
{const _u=updateUI;updateUI=function(){const r=_u.apply(this,arguments);try{bb190Apply();}catch(e){}return r;};}
// ======================= v0.4.7 #191 總倉模型：比倉庫更大更氣派（石基＋木構牆＋雙層瓦頂＋大門＋堆疊貨箱） =======================
{const _ds=drawBuildingShape;drawBuildingShape=function(type,i,j,t,alpha,b){if(type!=='zongcang')return _ds(type,i,j,t,alpha,b);_ds(type,i,j,t,alpha,b);};}
// ======================= v0.4.7 #193 村衛數量隨村莊規模（小村 3 名起、上限 10）、分散站崗巡邏、修正村衛累積、名牌減量 =======================
TUNE.y47v.guards=[3,4,6,8,10];TUNE.y47v.gHard=10;TUNE.y47v.recruitT=45;
y47GuardCap=function(v){return Math.min(TUNE.y47v.gHard,TUNE.y47v.guards[Math.max(0,y47VLv(v)-1)]||3);};
// 名冊與地圖上的村衛對齊：名冊去重、超過名額就裁掉；沒有名冊的村衛（名額滿時投靠的流浪者）在鏡頭外移除；名冊有人但地圖上沒有就在鏡頭外補回
function y193Fix(v,force){if(!v||v.type==='bandit')return 0;const cap=y47GuardCap(v);v.guards=v.guards||[];const seen=new Set();
  v.guards=v.guards.filter(r=>r&&!seen.has(r.name)&&seen.add(r.name));if(v.guards.length>cap)v.guards.length=cap;
  const cnt=new Map(v.guards.map((r,k)=>[r.name,0]));let rm=0;
  for(let k=S.npcs.length-1;k>=0;k--){const n=S.npcs[k];if(!n||n.vid!==v.id||!n.guard)continue;const c=cnt.get(n.name);
    if(c===undefined||c>=1){if(!force&&(n.gT!=null||inView(n.x,n.y,80)))continue;S.npcs.splice(k,1);rm++;}else cnt.set(n.name,1);}
  v.guards.forEach((r,k)=>{if(cnt.get(r.name)===0&&!force){const p=y193Post(v,k,0);const f=nearestFree(p.x,p.y,-1);if(f&&!inView(f.i,f.j,80)){S.npcs.push(makeGuard(v,r,f.i+0.5,f.j+0.5));cnt.set(r.name,1);}}});
  return rm;}
// 站崗點：沿村子外圈平均分布；巡邏在自己的崗位和相鄰兩崗之間的中點來回
function y193Post(v,k,side){const cap=Math.max(3,y47GuardCap(v)),lv=y47VLv(v)||1,R=4.5+lv*0.7,a=(k+side*0.5)/cap*Math.PI*2+v.id*1.3;return {x:v.x+Math.cos(a)*R,y:v.y+Math.sin(a)*R};}
{const _uv=updateVillager;updateVillager=function(n,dt,ct){if(!n||!n.guard||S.dg||v49Client())return _uv.apply(this,arguments);const v=vById(n.vid);if(!v||v.type==='bandit')return _uv.apply(this,arguments);
  try{let k=(v.guards||[]).findIndex(r=>r.name===n.name);if(k<0)k=n.id%5;
    if(n.gk!==k){n.gk=k;const p=y193Post(v,k,0),f=nearestFree(p.x,p.y,-1);n.post=f?{x:f.i+0.5,y:f.j+0.5}:{x:p.x,y:p.y};n.p193=0;n.ret=true;}
    if(n.gT==null&&!n.ret){n.p193=(n.p193||0)-dt;n.wt=99;
      if(n.p193<=0&&!n.path.length){n.pk=((n.pk||0)+1)%4;const side=n.pk===1?1:n.pk===3?-1:0;const p=side?y193Post(v,k,side):n.post;
        const tx=p.x+(rnd()-0.5)*0.8,ty=p.y+(rnd()-0.5)*0.8;if(!blockedP(tx,ty)&&compAt(tx,ty)===unitComp(n))pathTo(n,tx,ty);n.p193=side?2+rnd()*2:4+rnd()*5;}}}catch(e){console.warn('y193',e);}
  return _uv.apply(this,arguments);};}
{const _vt=y47VillageTick;y47VillageTick=function(dt){_vt.apply(this,arguments);if(S.dg||(typeof v49Client==='function'&&v49Client()))return;try{for(const v of S.villages)if(v.type!=='bandit'&&!v.destroyed)y193Fix(v,false);}catch(e){console.warn('y193 fix',e);}};}
// 讀檔：舊存檔名冊超過新名額 → 直接裁到名額
{const _a=applySave;applySave=function(d){const r=_a.apply(this,arguments);try{for(const v of S.villages)y193Fix(v,true);}catch(e){}return r;};}
// 名牌：滑鼠指著、鏡頭拉很近，或正在迎敵且鏡頭夠近時才顯示，並且互相不重疊
const Y193={r:[]};
{const _d=draw;draw=function(){Y193.r.length=0;return _d.apply(this,arguments);};}
function y193Hover(b){if(!mouse||!mouse.inside||isTouchUI)return false;try{const m=ctx.getTransform(),cv=ctx.canvas,rc=cv.getBoundingClientRect(),k=rc.width/cv.width;
  const sx=(m.a*b.x+m.c*b.y+m.e)*k+rc.left,sy=(m.b*b.x+m.d*b.y+m.f)*k+rc.top;return Math.abs(sx-mouse.x)<16*cam.zoom+6&&mouse.y<sy+6&&mouse.y>sy-42*cam.zoom;}catch(e){return false;}}
function y193Label(t,x,y,col){ctx.font='bold 10px sans-serif';const w=ctx.measureText(t).width+6,h=12;for(const q of Y193.r)if(Math.abs(q[0]-x)<(q[2]+w)/2&&Math.abs(q[1]-y)<h)return false;Y193.r.push([x,y,w]);label(t,x,y,col);return true;}
drawGuardMark=function(n){const b=P(n.x,n.y);ctx.strokeStyle='#b8b8c0';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(b.x+7,b.y-2);ctx.lineTo(b.x+7,b.y-30);ctx.stroke();ctx.lineWidth=1;poly([{x:b.x+5,y:b.y-30},{x:b.x+9,y:b.y-30},{x:b.x+7,y:b.y-36}],'#d8d8e0');
  const hv=y193Hover(b);if(hv||cam.zoom>=1.9||(cam.zoom>=1.2&&n.gT!=null)){if(hv)label('村衛・'+n.name,b.x,b.y-40,'#ffffff');else y193Label('村衛・'+n.name,b.x,b.y-40,'#cfe8ff');}};
{const i=SYS_TXT.findIndex(x=>x[0]==='村莊規模');if(i>=0){const o=SYS_TXT[i];SYS_TXT[i]=['村莊規模','村莊會從小村慢慢發展成市鎮，村衛 3～10 名',o[2]];}}
// #193 名額已滿時投靠的流浪者：當一般村民落腳（原本仍會生成一名沒有名冊的村衛，時間久了村衛越積越多）
{const _jf=joinFaction;joinFaction=function(w,v){const full=!!(v&&v.type!=='bandit'&&(v.guards||[]).length>=y47GuardCap(v));const r=_jf.apply(this,arguments);
  if(full){for(let k=S.npcs.length-1;k>=0;k--){const n=S.npcs[k];if(n.vid===v.id&&n.guard&&n.name===w.name&&!(v.guards||[]).some(g=>g.name===n.name)){n.guard=false;n.p193=0;n.wt=0;break;}}}return r;};}
// ======================= v0.4.7 #194 提示／事件通知統一排在畫面上方：頂欄（含弟子列）下面依序疊放，左右避開目標面板、提示框、小地圖 =======================
// 順序：任務提示 v58q → 事件橫幅 v47ban → 一般提示 toasts；需要選擇的對話框（事件選項、確認框）仍在畫面中央
const Y194={k:''};
function y194Vis(e){if(!e||!e.offsetParent&&getComputedStyle(e).position!=='fixed')return null;const cs=getComputedStyle(e);if(cs.display==='none'||cs.visibility==='hidden'||+cs.opacity===0)return null;const r=e.getBoundingClientRect();return r.width>1&&r.height>1?r:null;}
// 只在同步 layout 的「尚未寫 style」階段共用矩形；寫入後仍重新量測。
function y194Memo(read){const cache=new Map();return id=>{
  if(!cache.has(id))cache.set(id,read(id));
  return cache.get(id);
};}
function y194Lay(){try{const W=innerWidth,H=innerHeight;if(document.body.classList.contains('x47modal'))return;
  const readVis=y194Memo(id=>y194Vis(document.getElementById(id)));
  let top=bb190TopB(document.getElementById('topbar'));
  // 頂端中間的列（電腦版弟子列等）：在中間 50 % 範圍內、而且靠近頂欄的，往下讓開
  for(const id of ['pbar','pb_menu']){const r=readVis(id);if(r&&r.top<top+60&&r.bottom<H*0.35&&r.right>W*0.3&&r.left<W*0.7)top=Math.max(top,r.bottom);}
  top=Math.round(top+6);
  // v0.4.9 Fix12：室內時通知排在任務追蹤下方（並讓開室內面板 #inpanel）
  try{if(S&&S.interior){const ob=readVis('objectives');if(ob&&ob.bottom<H*0.45)top=Math.max(top,Math.round(ob.bottom+6));}}catch(e){}
  // v0.4.9 Fix12：橫跨大半畫面寬的面板（室內面板、組隊視窗、弟子列）擋在上方 → 通知整排移到它們下方
  for(let k=0;k<3;k++)for(const id of ['inpanel','netpt','pbar']){const r=readVis(id);if(r&&(r.width>W*0.6||W<600)&&r.top<top+56&&r.bottom>top&&r.bottom<H*0.5)top=Math.round(r.bottom+6);}
  // 左右讓開：與通知區（top～top+160）垂直重疊的側邊面板
  let L=6,R=W-6;for(const id of ['objectives','hint','minimap','x47rchip','tutbub','panel','inpanel']){const r=readVis(id);if(!r||r.bottom<top||r.top>top+160||r.width>W*0.6)continue;const c=(r.left+r.right)/2;if(c<W/2)L=Math.max(L,r.right+6);else R=Math.min(R,r.left-6);}
  if(R-L<200){L=6;R=W-6;for(const id of ['objectives','hint','minimap','x47rchip','tutbub','inpanel']){const r=readVis(id);if(r&&r.top<top+160&&r.bottom>=top&&r.bottom<H*0.45)top=Math.max(top,Math.round(r.bottom+6));}}// 太窄：改成整排移到側邊面板下方（v0.4.8，不再蓋住目標／小地圖）
  const cx=Math.round((L+R)/2),mw=Math.round(R-L);let y=top;
  const put=(el,gap)=>{if(!el)return;el.style.setProperty('left',cx+'px','important');el.style.setProperty('top',y+'px','important');el.style.setProperty('max-width',mw+'px','important');el.style.setProperty('transform','translateX(-50%)','important');
    const r=y194Vis(el);if(r&&el.children.length!==0||r&&el.id==='v58q')y=Math.round(r.bottom+gap);};
  {const fl=document.getElementById('q205fl');if(fl&&fl.classList.contains('on')){fl.style.left=cx+'px';fl.style.top=y+'px';y=Math.round(y+fl.offsetHeight+6);}}// v0.4.8：#205 目標更新提示排在最上面，其他通知往下疊
  const q=document.getElementById('v58q');if(q){q.style.setProperty('white-space','normal');put(q,4);}
  // BATCH2100_BAN：事件橫幅改右上角堆疊，不再置中擋視線（toasts 仍走中上避讓）
  const bn=document.getElementById('v47ban');
  if(bn){
    let btop=Math.round((bb190TopB(document.getElementById('topbar'))||44)+6);
    try{const mm=y194Vis(document.getElementById('minimap'));
      // 觸控小地圖在右上：橫幅改到其下方；桌面小地圖在右下：橫幅留右上
      if(mm&&mm.top<H*0.35&&mm.right>W*0.55)btop=Math.max(btop,Math.round(mm.bottom+6));
      const pb=y194Vis(document.getElementById('pbar'));if(pb&&pb.top<btop+40&&pb.right>W*0.55)btop=Math.max(btop,Math.round(pb.bottom+4));
    }catch(e){}
    const bw=Math.min(300,Math.max(200,Math.round(W*0.28)));
    bn.style.setProperty('left','auto','important');
    bn.style.setProperty('right','calc(var(--sar,0px) + 10px)','important');
    bn.style.setProperty('top',btop+'px','important');
    bn.style.setProperty('transform','none','important');
    bn.style.setProperty('width',bw+'px','important');
    bn.style.setProperty('max-width',bw+'px','important');
  }
  put(document.getElementById('toasts'),0);
  const t=document.getElementById('toasts');if(t)t.style.setProperty('pointer-events','none');}catch(e){}}
{const _t=toast;toast=function(){const r=_t.apply(this,arguments);y194Lay();return r;};}
{const _u=updateUI;updateUI=function(){const r=_u.apply(this,arguments);y194Lay();return r;};}
try{addEventListener('resize',()=>setTimeout(y194Lay,50));}catch(e){}
(function(){const st=document.createElement('style');st.id='y194css';st.textContent='#toasts{gap:4px!important;align-items:center}#toasts div{max-width:100%;box-sizing:border-box;box-shadow:0 2px 8px #0008}body.x47modal #toasts{left:50%!important;transform:translateX(-50%)!important}'
  +'#v47ban{left:auto!important;right:calc(var(--sar,0px) + 10px)!important;transform:none!important;width:min(300px,42vw)!important;max-width:min(300px,42vw)!important;align-items:stretch;pointer-events:none}'
  +'#v47ban .v47bn{font-size:12px!important;padding:6px 8px!important;line-height:1.3;gap:6px;box-shadow:0 2px 8px #000a}'
  +'#v47ban .v47bn.raid{font-size:13px!important;letter-spacing:0}'
  +'#v47ban .v47bn.gold{font-size:12px!important}'
  +'#v47ban .v47bn .bx{font-size:14px;opacity:.85;padding:0 2px;min-width:28px;min-height:28px}';document.head.appendChild(st);})();
{const _x=XW045;XW045=function(){const o=_x();o.y194={lay:y194Lay,toast:(m)=>toast(m),banner:(k,o2)=>v47Banner(k,o2)};return o;};}
// #195/#196/#198 測試用
{const _x=XW045;XW045=function(){const o=_x();o.y195={get bm(){return buildMode;},cam:()=>cam,slots:()=>v158Slots(),keys:()=>keys,ok198:u=>y198Ok(u),lw:u=>lwChance(u),th:u=>thChance(u)};return o;};}
// ======================= #199 操作說明：開啟時才顯示（HTML 預設隱藏，不會在載入時閃一下）；標題顯示目前版本；可直接開修仙指南 =======================
{const _s=setHelp;setHelp=function(v){if(v){const h=document.getElementById('helpVer');if(h)h.textContent='仙武之體 · 操作說明（v'+(typeof CHANGELOG!=='undefined'&&CHANGELOG[0]?CHANGELOG[0].v:'')+'）';}return _s.apply(this,arguments);};}
document.addEventListener('click',ev=>{const b=ev.target&&ev.target.closest&&ev.target.closest('#helpGuide');if(!b)return;ev.stopPropagation();setHelp(false);try{toggleGuide(true);}catch(e){}},true);
// #196：建造列只標真的有的熱鍵（Shift＋1～9、Shift＋0 倉庫）；第 10 個以後的建築不標 ⇧12 之類不存在的鍵
function y196BarKeys(){const bb=document.getElementById('buildbar');if(!bb)return;for(const b of bb.querySelectorAll('[data-b] > b')){if(b.parentNode.dataset.b==='cangku')continue;const t=b.textContent;if(/^⇧1\d/.test(t))b.textContent=t.replace(/^⇧1\d+　?/,'');}}
{const _u=updateUI;updateUI=function(){const r=_u.apply(this,arguments);try{y196BarKeys();}catch(e){}return r;};}
// ======================= #201 小地圖（AoE4 式）：點一下跳鏡頭、按住拖曳連續移動視野框、放開後鏡頭留在原地；右鍵＝選取單位移動到該處 =======================
// 手機：小地圖上拖曳＝移動鏡頭、輕點＝放大地圖；放大後輕點＝跳過去並收起、拖曳＝連續移動、長按 0.5 秒＝選取單位移動到該處。
// 事件在 window 捕獲階段攔下，不會變成世界點擊或框選。
const Y201={d:null,raf:0};
function y201Cam(ev){const t=mmToWorld(ev),q=iso(clamp(t.x,0,N),clamp(t.y,0,N));cam.x=q.x;cam.y=q.y;cam.follow=false;cam.pan=1;cam.pvx=cam.pvy=0;
  if(!Y201.raf)Y201.raf=requestAnimationFrame(()=>{Y201.raf=0;try{drawMinimap();}catch(e){}});return t;}
function y201Order(ev){const t=mmToWorld(ev),x=clamp(t.x,0.5,N-0.5),y=clamp(t.y,0.5,N-0.5);const us=commandUnits();if(!us.length)return false;
  commandMove(us,x,y,!!ev.shiftKey);pings.push({x,y,t:0,dur:1.5,danger:false});try{snd('click');}catch(e){}return true;}
function y201Stop(ev){ev.preventDefault();ev.stopPropagation();ev.stopImmediatePropagation();}
addEventListener('pointerdown',ev=>{if(ev.target!==mm)return;y201Stop(ev);if(S&&S.interior)return;
  const touch=ev.pointerType==='touch'||isTouchUI;
  if(ev.button===2){y201Order(ev);return;}
  if(ev.button!==0&&!touch)return;
  try{mm.setPointerCapture(ev.pointerId);}catch(e){}
  Y201.d={id:ev.pointerId,x:ev.clientX,y:ev.clientY,touch,mv:false,big:mmBig,t0:performance.now(),lp:null};
  if(!touch)y201Cam(ev);// 電腦：按下就跳
  else if(mmBig){const D=Y201.d;D.lp=setTimeout(()=>{if(Y201.d===D&&!D.mv){D.lpDone=true;if(y201Order({clientX:D.x,clientY:D.y,shiftKey:false})){toast('📍 已下令移動到該處');}setMMBig(false);}},500);}
},true);
addEventListener('pointermove',ev=>{const D=Y201.d;if(!D||ev.pointerId!==D.id)return;y201Stop(ev);
  if(!D.mv&&Math.hypot(ev.clientX-D.x,ev.clientY-D.y)>(D.touch?7:2)){D.mv=true;if(D.lp)clearTimeout(D.lp);}
  if(D.mv||!D.touch){D.x=ev.clientX;D.y=ev.clientY;y201Cam(ev);}},true);
function y201End(ev){const D=Y201.d;if(!D||ev.pointerId!==D.id)return;y201Stop(ev);Y201.d=null;if(D.lp)clearTimeout(D.lp);try{mm.releasePointerCapture(ev.pointerId);}catch(e){}
  if(D.lpDone)return;
  if(D.touch){if(!D.mv){if(!D.big){setMMBig(true);return;}y201Cam(ev);setMMBig(false);}else if(D.big)setMMBig(false);}
  try{drawMinimap();}catch(e){}}
addEventListener('pointerup',y201End,true);addEventListener('pointercancel',y201End,true);
for(const t of ['mousedown','mouseup','click','dblclick','contextmenu','touchstart','touchmove'])addEventListener(t,ev=>{if(ev.target===mm){if(t!=='touchstart'&&t!=='touchmove')ev.preventDefault();ev.stopPropagation();}},true);
mm.style.touchAction='none';mm.style.cursor='pointer';
{const _x=XW045;XW045=function(){const o=_x();o.y201={get drag(){return !!Y201.d;},mmPt:(x,y)=>mmPt(x,y),get big(){return mmBig;}};return o;};}
// ======================= #197 AoE4 式 Shift 連續建造 =======================
// 按住 Shift 放置：放完一座仍在建造模式，每點一下再排一座；Shift＋拖曳：沿直線排一整排（每座各自檢查位置與資源，不行的顯示紅色）；
// 放開 Shift＝結束放置；右鍵／Esc＝取消。每座地基放下時就扣資源；選取未開工的地基按 Delete（或面板「拆除」）＝取消並全額退回。
// 選取的弟子（沒選就是主角）會依序蓋完排隊的地基，地基上顯示順序編號。手機：確認列多一顆「🔁 連續放置」開關代替 Shift。
TUNE.y197={maxLine:24};
const Y197={line:null,force:null,quiet:0,cont:false,shiftPlaced:0,seq:0};
{const _g=ghostOrigin;ghostOrigin=function(){if(Y197.force)return Y197.force;return _g.apply(this,arguments);};}
{const _t=toast;toast=function(){if(Y197.quiet)return;return _t.apply(this,arguments);};}
function y197Builders(){let us=selUnits.map(unitById).filter(u=>u&&!u.dead);if(!us.length){const p=player();if(p&&!p.dead)us=[p];}return us;}
function y197Open(b){return b&&S.buildings.includes(b)&&!b.built;}
{const _tp=tryPlace;tryPlace=function(shift){
  const type=buildMode;if(!type)return _tp.apply(this,arguments);
  const bs=y197Builders(),prev=new Map(bs.map(u=>[u,u.task&&u.task.type==='build'&&y197Open(bById(u.task.bid))?u.task:(u.b197!=null&&y197Open(bById(u.b197))?{type:'build',bid:u.b197}:null)]));
  const n0=S.buildings.length;const r=_tp.call(this,shift||(isTouchUI&&Y197.cont));
  const b=S.buildings.length>n0?S.buildings[S.buildings.length-1]:null;
  if(b&&b.type===type&&!b.built){b.q197=++Y197.seq;if(shift)Y197.shiftPlaced++;
    for(const u of bs){const pt=prev.get(u);u.bq=(u.bq||[]).filter(id=>y197Open(bById(id)));
      if(pt){if(u.task&&u.task.type==='build'){u.task=pt;u.path=u.path||[];}else if(u.task&&u.task.bid===b.id)setTask(u,pt);u.b197=pt.bid;if(!u.bq.includes(b.id))u.bq.push(b.id);}// 已在蓋別座：排到後面
      else{u.bq=[];u.b197=b.id;}}
    if(isTouchUI&&Y197.cont&&buildMode&&!canAfford(BUILD[type].cost)){buildMode=null;toast('資源不足，連續放置結束');}}
  return r;};}
// 依序施工：手上的工地蓋好（或被拆）就換下一座；改下別的命令就清空排隊
{const _uu=updateUnit;updateUnit=function(u,dt){
  if(u&&!u.dead&&(u.b197!=null||(u.bq&&u.bq.length))){const t=u.task;
    if(t&&t.type==='build'&&y197Open(bById(t.bid)))u.b197=t.bid;
    else if(!t||t.type==='build'){// 自衛等臨時動作結束後回到原本工地，蓋好再換下一座
      if(!t&&u.b197!=null&&y197Open(bById(u.b197)))setTask(u,{type:'build',bid:u.b197});
      else{u.b197=null;u.bq=(u.bq||[]).filter(id=>y197Open(bById(id)));const nx=u.bq.shift();if(nx!=null){u.b197=nx;setTask(u,{type:'build',bid:nx});}}}}
  return _uu.apply(this,arguments);};}
// 直線上的地基位置（間距＝建築大小＋走道）
function y197Cells(type,a,b){const s=BUILD[type].size+(TUNE.bldGap||0),di=b.i-a.i,dj=b.j-a.j,L=Math.max(Math.abs(di),Math.abs(dj));
  if(L<s)return [{i:a.i,j:a.j}];const n=Math.min(TUNE.y197.maxLine,Math.floor(L/s)+1),out=[];
  for(let k=0;k<n;k++){const f=k*s/L;out.push({i:Math.round(a.i+di*f),j:Math.round(a.j+dj*f)});}return out;}
function y197Plan(){const L=Y197.line;if(!L||!buildMode)return [];const type=buildMode,C=BUILD[type].cost,cells=y197Cells(type,L.a,ghostOrigin());const tot={};let ok=0;
  return cells.map(c=>{const pos=placementValid(type,c.i,c.j)||(!canAfford(C)&&y197PosOk(type,c.i,c.j));const gap=typeof v46GapOk!=='function'||v46GapOk(type,c.i,c.j);
    const need={};for(const k in C)need[k]=(tot[k]||0)+C[k];const aff=canAfford(need);const v=pos&&gap&&aff;if(v){for(const k in C)tot[k]=need[k];ok++;}
    return Object.assign({v,why:!pos||!gap?'pos':!aff?'res':''},c);});}
function y197PosOk(type,i,j){const r=S.res;const sv={};for(const k in BUILD[type].cost){sv[k]=r[k];r[k]=1e9;}try{return placementValid(type,i,j);}finally{for(const k in sv)r[k]=sv[k];}}
function y197Commit(){const L=Y197.line;Y197.line=null;if(!L||!buildMode)return;const type=buildMode,plan=y197Plan.call(null,Y197.line=L);Y197.line=null;
  let n=0,bad=0;Y197.quiet++;try{for(const c of plan){if(!c.v){bad++;continue;}if(!buildMode)buildMode=type;Y197.force={i:c.i,j:c.j};const n0=S.buildings.length;tryPlace(true);if(S.buildings.length>n0||(typeof NET!=='undefined'&&NET.role==='client'))n++;else bad++;}}
  finally{Y197.force=null;Y197.quiet--;}
  if(!buildMode&&n&&(keys.ShiftLeft||keys.ShiftRight)&&canAfford(BUILD[type].cost))buildMode=type;
  toast(n?`已排入 ${n} 座「${BUILD[type].name}」地基${bad?`（${bad} 處不能建造或資源不足，已略過）`:''}`:'這一排都不能建造（紅色＝位置不行或資源不足）');}
addEventListener('pointerdown',ev=>{if(ev.target!==cv||ev.pointerType!=='mouse'||ev.button!==0||!buildMode||!ev.shiftKey||isTouchUI)return;
  ev.stopImmediatePropagation();ev.preventDefault();ghostAt={x:ev.clientX,y:ev.clientY};Y197.line={a:ghostOrigin(),sx:ev.clientX,sy:ev.clientY};},true);
addEventListener('pointerup',ev=>{if(!Y197.line||ev.pointerType!=='mouse'||ev.button!==0)return;ev.stopImmediatePropagation();ghostAt={x:ev.clientX,y:ev.clientY};y197Commit();},true);
addEventListener('keyup',ev=>{if((ev.code==='ShiftLeft'||ev.code==='ShiftRight')&&!isTouchUI){if(Y197.line)return;if(buildMode&&Y197.shiftPlaced>0){buildMode=null;}Y197.shiftPlaced=0;}});
addEventListener('keydown',ev=>{if(ev.code==='Escape'&&Y197.line){Y197.line=null;}
  if((ev.code==='Delete'||ev.code==='Backspace')&&!buildMode&&selBuilding!=null&&!(ev.target&&/INPUT|TEXTAREA/.test(ev.target.tagName))){const b=bById(selBuilding);if(b&&!b.built&&!(b.progress>0.001)){ev.preventDefault();const R=demoRefund(b);if(demolish(b)){selBuilding=null;panelKeyCache=null;toast(`已取消地基「${BUILD[b.type].name}」，退回 ${Object.keys(R.res).length?costStr(R.res):'（沒有）'}`);}}}},true);
// 虛影：直線上每一座都畫出來，綠＝可以、紅＝位置不行或資源不足，標上順序
{const _dg=drawGhost;drawGhost=function(){if(!Y197.line)return _dg.apply(this,arguments);const type=buildMode,s=BUILD[type].size,plan=y197Plan();let k=0,ok=0;
  for(const c of plan){k++;for(let j=c.j;j<c.j+s;j++)for(let i=c.i;i<c.i+s;i++)diamond(i,j,1,c.v?'rgba(80,255,120,0.32)':'rgba(255,60,60,0.42)','rgba(255,255,255,0.4)');
    drawBuildingShape(type,c.i,c.j,1,c.v?0.45:0.25);const t=P(c.i+s/2,c.j+s/2,62);label(String(k),t.x,t.y,c.v?'#bfffc8':'#ffb0b0','bold 14px sans-serif');if(c.v)ok++;}
  const g=plan[plan.length-1]||ghostOrigin(),t=P(g.i+s/2,g.j+s/2,86),C=BUILD[type].cost,tot={};for(const q in C)tot[q]=C[q]*ok;
  label(`${BUILD[type].name} ×${ok}${plan.length>ok?`（${plan.length-ok} 紅）`:''}｜${costStr(tot)}`,t.x,t.y,ok?'#bfffc8':'#ffb0b0','bold 12px sans-serif');};}
// 排隊中的地基：顯示施工順序編號
function y197Order(){const m=new Map();for(const u of S.units){if(u.dead||!u.bq||!u.bq.length)continue;const L=[];if(u.task&&u.task.type==='build')L.push(u.task.bid);L.push(...u.bq);
  L.forEach((id,i)=>{const o=m.get(id);if(!o||i+1<o)m.set(id,i+1);});}return m;}
{const _df=drawFx;drawFx=function(){const r=_df.apply(this,arguments);try{const m=y197Order();if(m.size)for(const [id,n] of m){const b=bById(id);if(!y197Open(b))continue;const s=BUILD[b.type].size,t=P(b.i+s/2,b.j+s/2,44);
  ctx.fillStyle='rgba(20,16,8,0.8)';ctx.beginPath();ctx.arc(t.x,t.y-4,9,0,Math.PI*2);ctx.fill();ctx.strokeStyle='#ffd34d';ctx.lineWidth=1.5;ctx.stroke();label(String(n),t.x,t.y+0.5,'#ffe9a0','bold 11px sans-serif');}}catch(e){}return r;};}
// 手機：「🔁 連續放置」開關
function y197ContBtn(){const c=document.getElementById('confirm');if(!c)return;let b=document.getElementById('c_cont');
  if(!b){b=document.createElement('button');b.className='btn';b.id='c_cont';b.type='button';c.insertBefore(b,c.firstChild);}
  const t=Y197.cont?'🔁 連續放置：開':'🔁 連續放置：關';if(b.textContent!==t)b.textContent=t;b.classList.toggle('pri',Y197.cont);}
document.addEventListener('click',ev=>{const t=ev.target&&ev.target.closest&&ev.target.closest('#c_cont,#c_ok');if(!t)return;
  if(t.id==='c_cont'){ev.stopPropagation();ev.preventDefault();Y197.cont=!Y197.cont;XW_PREFS.set('y197c',Y197.cont?'1':'0');y197ContBtn();toast(Y197.cont?'連續放置：開（確認後繼續放下一座，按 ✖ 取消結束）':'連續放置：關');return;}
  if(t.id==='c_ok'&&Y197.cont&&buildMode){ev.stopPropagation();ev.preventDefault();tryPlace(true);}},true);
try{Y197.cont=XW_PREFS.get('y197c','0')==='1';}catch(e){}
{const _u=updateUI;updateUI=function(){const r=_u.apply(this,arguments);try{if(isTouchUI)y197ContBtn();}catch(e){}return r;};}
{const _x=XW045;XW045=function(){const o=_x();o.y197={Y197,cells:y197Cells,plan:()=>y197Plan(),order:()=>[...y197Order()],get bm(){return buildMode;},set bm(v){buildMode=v;},origin:()=>ghostOrigin(),valid:(t,i,j)=>placementValid(t,i,j),get ghostAt(){return ghostAt;},set ghostAt(v){ghostAt=v;},touch:()=>isTouchUI,selB:id=>{selBuilding=id;selUnits=[];}};return o;};}
// ======================= #202 弟子修煉多半走進有修煉加成的建築 =======================
// 決定「修煉／打坐」時約 85 % 走進最近、還有空位的練武閣／長書閣／宗門大殿／武道館（住房只睡覺，不在這裡修煉）；
// 走進去＝室外隱藏、室內畫面看得到，時間到自己走出來。沒有可去的建築、已滿或 25 秒內走不到 → 就地打坐。療傷仍就地。
TUNE.y202={p:0.85,giveUp:25,jobs:['seclude','study','lecture'],jlCap:4,jlXiu:1.6};
// v0.4.8：只去 練武閣／長書閣／宗門大殿（室內）與 聚靈陣（露天，走到陣旁坐下）；住房只睡覺（休息不再加修為）；療傷就地。
INJOB.rest.xiu=0;
function y202Load(b){let n=0;for(const v of S.units){if(v.dead||v.jobB!==b.id)continue;if(INJOB[v.job]||(v.aiJob&&v.aiJob.job))n++;}return n;}
function y202JlLoad(b){let n=0;for(const v of S.units)if(!v.dead&&v.aiJob&&v.aiJob.jl===b.id)n++;return n;}
function y202Pick(u){let best=null,bs=-1e9;for(const J of TUNE.y202.jobs){const t=INJOB[J]&&INJOB[J].b;if(!t||!BUILD[t])continue;
  for(const b of S.buildings){if(b.type!==t||!b.built||b.broken)continue;if(y202Load(b)>=jobSlots(b))continue;const d=distRect(u.x,u.y,b.i,b.j,BUILD[t].size);if(d>45)continue;
    const sc=INJOB[J].xiu*2-d*0.15;if(sc>bs){bs=sc;best={b,J};}}}
  if(BUILD.juling&&!S.dg)for(const b of S.buildings){if(b.type!=='juling'||!b.built||b.broken)continue;if(y202JlLoad(b)>=TUNE.y202.jlCap)continue;const d=distRect(u.x,u.y,b.i,b.j,BUILD.juling.size);if(d>45)continue;
    const sc=TUNE.y202.jlXiu*2-d*0.15;if(sc>bs){bs=sc;best={b,J:'jl'};}}
  return best;}
function y202JlSpot(u,b){const s=BUILD.juling.size,cx=b.i+s/2,cy=b.j+s/2,k=y202JlLoad(b);for(let t=0;t<8;t++){const ang=(k*1.7+t*0.9+rnd()*0.4)%(Math.PI*2),r=s/2+0.9;const f=nearestFree(cx+Math.cos(ang)*r,cy+Math.sin(ang)*r,unitComp(u));if(f&&dist(f.i+0.5,f.j+0.5,cx,cy)<TUNE.v61.jlR-1)return {x:f.i+0.5,y:f.j+0.5};}return null;}
{const _as=aiStart;aiStart=function(u,k){
  const hurt=k==='rest'&&u&&u.hp<u.maxhp*0.6&&!u.rip&&!(typeof isNight==='function'&&isNight());// 療傷：就地打坐療傷，不必走回住房
  const r=_as.call(this,u,hurt?'med':k);const a=u.aiJob;
  try{if(hurt&&a){a.heal=1;a.until=S.time+rr([20,35]);u.thought='🩹';floater(u.x,u.y-0.4,'就地療傷','#a8f0b0');}
    else if(a&&a.k==='med'&&!a.job&&!u.rip&&!u.retreat&&rnd()<TUNE.y202.p){const p=y202Pick(u);
      if(p&&p.J==='jl'){const sp=y202JlSpot(u,p.b);if(sp){a.k='jlgo';a.jl=p.b.id;a.tx=sp.x;a.ty=sp.y;a.c202=S.time;a.until=S.time+60;u.thought='🧘';}}
      else if(p){a.job=p.J;a.c202=S.time;u.jobB=p.b.id;u.thought='🧘';}}}catch(e){}
  return r;};}
// 走不到 → 改為就地打坐；走到聚靈陣旁 → 坐下修煉（陣的加成由 v62Loc 計入）；療傷時就地回血
{const _dj=doAiJob;doAiJob=function(u,dt){const a=u.aiJob;
  if(a&&a.c202!=null&&a.job&&!u.inside&&S.time-a.c202>TUNE.y202.giveUp){a.job=null;a.c202=null;u.jobB=null;u.path=[];}
  if(a&&a.c202!=null&&u.inside)a.c202=S.time+1e6;// 已入內，不再計時
  if(a&&a.k==='jlgo'){const b=bById(a.jl);if(!b||!b.built||b.broken||S.time-a.c202>TUNE.y202.giveUp){a.k='med';a.jl=null;a.tx=null;u.path=[];u.thought=AI_ICON.med;}
    else{const r=walkTo(u,dt,a.tx,a.ty,0.9);if(r===null){a.k='med';a.jl=null;a.tx=null;}else if(r){a.k='med';a.tx=null;a.until=S.time+rr([25,45]);u.thought='🧘';const s=BUILD.juling.size;faceTo(u,b.i+s/2,b.j+s/2);floater(u.x,u.y-0.4,'聚靈陣旁修煉','#9fe0ff');}
      return;}}
  if(a&&a.heal&&a.k==='med'&&u.hp<u.maxhp)u.hp=Math.min(u.maxhp,u.hp+u.maxhp*(INJOB.rest.hp||0.01)*0.7*dt);
  return _dj.apply(this,arguments);};}
{const _x=XW045;XW045=function(){const o=_x();o.y202={pick:u=>{const p=y202Pick(u);return p?{bid:p.b.id,J:p.J}:null;},start:u=>aiStart(u,'med'),startK:(u,k)=>aiStart(u,k)};return o;};}
// ======================= #204 浮動面板可拖曳（共用 XWDrag，滑鼠＋觸控） =======================
// 用法（聯機面板也可共用）：XWDrag.make(元素, {key:'存檔鍵', handle:'標題列 CSS 選擇器'})；位置依裝置（電腦／手機）分開存在 localStorage，
// 視窗縮放／轉向時自動夾回畫面內；設定 →「↺ 重設版面」全部還原。拖曳不會點到底下的世界；拖過就吞掉那次點擊。
const XWDrag={reg:[],D:null,swUntil:0,
  dev(){return (typeof isTouchUI!=='undefined'&&isTouchUI)?'m':'d';},
  load(){try{return JSON.parse(localStorage.getItem('xw_drag_'+this.dev())||'{}')||{};}catch(e){return {};}},
  save(o){try{localStorage.setItem('xw_drag_'+this.dev(),JSON.stringify(o));}catch(e){}},
  has(k){return !!this.load()[k];},
  minY(){const t=document.getElementById('topbar');const r=t&&t.getBoundingClientRect();return r&&r.height?Math.round(r.bottom)+2:0;},
  put(el,x,y){const r=el.getBoundingClientRect(),w=r.width||100,h=r.height||40;const mx=Math.max(0,innerWidth-Math.min(w,innerWidth)),my=Math.max(this.minY(),innerHeight-Math.min(h,innerHeight)-2);
    x=Math.max(0,Math.min(mx,x));y=Math.max(this.minY(),Math.min(my,y));if(el.id==='panel'){const b=document.getElementById('buildbar'),bs=b&&getComputedStyle(b);if(bs&&bs.display!=='none'&&bs.visibility!=='hidden'){const br=b.getBoundingClientRect();if(br.height>40&&x<br.right&&x+w>br.left&&y+h>br.top-4)y=Math.max(this.minY(),br.top-h-6);}}const s=el.style;s.setProperty('left',Math.round(x)+'px','important');s.setProperty('top',Math.round(y)+'px','important');
    s.setProperty('right','auto','important');s.setProperty('bottom','auto','important');s.setProperty('transform','none','important');el.classList.add('xwdragged');return {x:Math.round(x),y:Math.round(y)};},
  clear(el){for(const k of ['left','top','right','bottom','transform'])el.style.removeProperty(k);el.classList.remove('xwdragged');},
  apply(){const o=this.load();for(const R of this.reg){const el=R.get();if(!el)continue;const p=o[R.key];if(p){const r=el.getBoundingClientRect();if(!r.width&&!r.height)continue;const q=this.put(el,p.x,p.y);}else if(el.classList.contains('xwdragged'))this.clear(el);}},
  reset(){try{localStorage.removeItem('xw_drag_d');localStorage.removeItem('xw_drag_m');localStorage.removeItem('xw_party_pos');}catch(e){}for(const R of this.reg){const el=R.get();if(el)this.clear(el);}
    try{const c=pbCfg();c.x=null;c.y=null;pbSave();pbApply();}catch(e){}try{const np=document.getElementById('netpt');if(np){np.style.left='';np.style.top='';if(typeof netPtPlace==='function')netPtPlace(np);}}catch(e){}try{XW_PREFS.set('q205','c');Y205.st='c';V50.objH=null;Y205.h=null;updateObjectives();}catch(e){}try{toast('↺ 版面已重置：所有面板回到預設位置');}catch(e){}},
  make(el,o){if(!el||el.xwDrag)return;el.xwDrag=1;const key=o&&o.key||el.id,hs=o&&o.handle||'h3,h4',me=this;const R={key,get:()=>document.getElementById(el.id)||el};this.reg.push(R);
    el.addEventListener('pointerdown',ev=>{if(ev.pointerType==='mouse'&&ev.button!==0)return;const h=hs==='*'?el:ev.target.closest(hs+',.xwgrip');if(!h||!el.contains(h))return;
      if(ev.target.closest('button,a,input,select,textarea,[data-v50go],[data-act],[data-job]')&&!ev.target.closest('.xwgrip'))return;
      const r=el.getBoundingClientRect();me.D={id:ev.pointerId,el,key,sx:ev.clientX,sy:ev.clientY,dx:ev.clientX-r.left,dy:ev.clientY-r.top,moved:false};ev.stopPropagation();},true);
    addEventListener('pointermove',ev=>{const D=me.D;if(!D||D.el!==el||D.id!==ev.pointerId)return;if(!D.moved&&Math.hypot(ev.clientX-D.sx,ev.clientY-D.sy)<7)return;
      if(!D.moved){D.moved=true;el.classList.add('xwdragging');try{el.setPointerCapture(ev.pointerId);}catch(e){}}ev.preventDefault();ev.stopPropagation();D.p=me.put(el,ev.clientX-D.dx,ev.clientY-D.dy);},true);
    const end=ev=>{const D=me.D;if(!D||D.el!==el||D.id!==ev.pointerId)return;me.D=null;el.classList.remove('xwdragging');try{el.releasePointerCapture(ev.pointerId);}catch(e){}
      if(D.moved){ev.stopPropagation();me.swUntil=performance.now()+350;const s=me.load();s[key]=D.p||me.put(el,ev.clientX-D.dx,ev.clientY-D.dy);me.save(s);}};
    addEventListener('pointerup',end,true);addEventListener('pointercancel',end,true);
    el.addEventListener('dblclick',ev=>{if(!ev.target.closest('.xwgrip'))return;ev.stopPropagation();ev.preventDefault();me.resetOne(key);},true);},
  resetOne(key){const s=this.load();delete s[key];this.save(s);for(const R of this.reg)if(R.key===key){const el=R.get();if(el)this.clear(el);}try{toast('已還原這個面板的位置');}catch(e){}},
  grip(el,sel){if(!el)return;const h=sel?el.querySelector(sel):el;if(!h||h.querySelector(':scope>.xwgrip'))return;const g=document.createElement('span');g.className='xwgrip';g.textContent='⠿';g.title='拖曳移動；連點兩下還原位置';h.insertBefore(g,h.firstChild);}};
window.XWDrag=XWDrag;
addEventListener('click',ev=>{if(performance.now()<XWDrag.swUntil){ev.stopImmediatePropagation();ev.preventDefault();XWDrag.swUntil=0;}},true);
addEventListener('resize',()=>setTimeout(()=>XWDrag.apply(),60));addEventListener('orientationchange',()=>setTimeout(()=>XWDrag.apply(),300));
{const st=document.createElement('style');st.textContent=`#panel h4,#objectives .q205hd,#objectives h3,#hint{cursor:move;touch-action:none;-webkit-user-select:none;user-select:none}
#panel.xwdragged,#objectives.xwdragged,#hint.xwdragged{box-shadow:0 0 0 1px #c9a24a55,0 6px 18px #0008}.xwdragging{opacity:.88;transition:none!important}
.xwgrip{display:inline-block;cursor:move;color:#cdbb92;opacity:.75;margin-right:5px;font-size:13px;line-height:1;padding:2px 1px;touch-action:none;user-select:none;-webkit-user-select:none}.xwgrip:hover{opacity:1;color:#ffe9a8}`;document.head.appendChild(st);}
function y204Init(){const g=id=>document.getElementById(id);XWDrag.make(g('objectives'),{key:'objectives',handle:'.q205hd,h3'});XWDrag.make(g('panel'),{key:'panel',handle:'h4'});XWDrag.make(g('hint'),{key:'hint',handle:'*'});}
let y204T=0;
{const _u=updateUI;updateUI=function(){const r=_u.apply(this,arguments);try{y204Init();XWDrag.grip(document.getElementById('panel'),'h4');const n=performance.now();if(n-y204T>500&&!XWDrag.D){y204T=n;XWDrag.apply();}}catch(e){}return r;};}
// 頭像列已經自己會被移動：使用者拖過宗門目標或頭像列之後，不再自動把頭像列推開
{const _l=v49Layout;v49Layout=function(force){if(XWDrag.has('objectives'))return;return _l.apply(this,arguments);};}

// ======================= #205 宗門目標追蹤（鳴潮／原神式） =======================
// 預設一行：◆ 圖示＋目前目標＋方向與距離＋進度；點一下展開（步驟、獎勵、📍前往），再點收合；「—」可收成一顆小圖示 📜。
// 目標更新時畫面上方短暫閃出提示。狀態記住（xw_q205）。標題列也是拖曳把手（#204）。
const Y205={st:'c',cur:null,dT:0};
try{Y205.st=XW_PREFS.get('q205','c');if(!/^[ceh]$/.test(Y205.st))Y205.st='c';}catch(e){}
function y205Cur(){const o=S.objDone;let c=o.findIndex(v=>!v);return c<0?NOBJ:c;}
function y205Prog(k){const s=v50ObjProg(k)||'';const m=s.match(/(\d+)\/(\d+)/g);if(!m)return '';if(m.length===1)return m[0];const d=m.filter(x=>{const [a,b]=x.split('/').map(Number);return a>=b;}).length;return `${d}/${m.length}`;}
function y205Dir(k){try{let t=v50ObjTarget(k);const p=S.interior?null:player();if(t&&!(isFinite(t.x)&&isFinite(t.y))){const h=S.buildings.find(b=>b.type==='hall'&&b.built);t=h?{x:h.i+BUILD.hall.size/2,y:h.j+BUILD.hall.size/2}:null;}if(!t||!p||!isFinite(p.x)||k===10)return '';const dx=t.x-p.x,dy=t.y-p.y,d=Math.hypot(dx,dy);if(d<2)return '📍 就在附近';
  const sx=dx-dy,sy=(dx+dy)/2,a=Math.atan2(sy,sx),A='→↘↓↙←↖↑↗'[(Math.round(a/(Math.PI/4))+8)%8];return `${A} ${Math.round(d)} 格`;}catch(e){return '';}}
function y205Html(){const cur=y205Cur(),txt=cur<NOBJ?`${cur+1}. ${OBJ[cur]}`:'★ 全部完成';const det=v50ObjHtml().replace('<h3>宗門目標</h3>','').replace(/<div class="chip">[\s\S]*$/,'');
  return `<div class="q205hd" data-q205="t" title="點一下展開／收合；拖曳可移動"><span class="xwgrip" title="拖曳移動；連點兩下還原位置">⠿</span><span class="q205ic">◆</span><span class="q205tx">${txt}</span>${cur<NOBJ&&y205Prog(cur)?`<span class="q205pg">${y205Prog(cur)}</span>`:''}<span class="q205d"></span><span class="q205ar">${Y205.st==='e'?'▴':'▾'}</span><button class="q205x" data-q205="h" title="收成小圖示">—</button></div>`+
    `<div class="q205det"><div class="q205lbl">宗門目標</div>${det}</div><button class="q205show" data-q205="s" title="顯示宗門目標">📜</button>`;}
function y205Set(s){Y205.st=s;try{XW_PREFS.set('q205',s);}catch(e){}V50.objH=null;Y205.h=null;updateObjectives();}
function y205Flash(cur){let f=document.getElementById('q205fl');if(!f){f=document.createElement('div');f.id='q205fl';f.className='ui';(document.getElementById('root')||document.body).appendChild(f);}
  f.innerHTML=`<small>◆ 宗門目標更新</small><b>${cur<NOBJ?`${cur+1}. ${OBJ[cur]}`:'★ 全部完成'}</b>`;f.classList.remove('on');void f.offsetWidth;f.classList.add('on');try{y194Lay();}catch(e){}clearTimeout(Y205.ft);Y205.ft=setTimeout(()=>{f.classList.remove('on');try{y194Lay();}catch(e){}},2800);}
{const _uo=updateObjectives;updateObjectives=function(){const r=_uo.apply(this,arguments);try{const el=document.getElementById('objectives');if(!el)return r;
  const cur=y205Cur();if(Y205.cur!=null&&cur!==Y205.cur&&cur>Y205.cur)y205Flash(cur);Y205.cur=cur;
  const h=y205Html();if(Y205.h!==h||!el.querySelector('.q205hd')){Y205.h=h;el.innerHTML=h;Y205.dT=0;}
  el.classList.toggle('q205c',Y205.st==='c');el.classList.toggle('q205e',Y205.st==='e');el.classList.toggle('q205h',Y205.st==='h');el.classList.toggle('expanded',Y205.st==='e');
  const n=performance.now();if(n-Y205.dT>250){Y205.dT=n;const d=el.querySelector('.q205d');if(d){const t=cur<NOBJ?y205Dir(cur):'';if(d.textContent!==t)d.textContent=t;}}
  document.body.classList.remove('x47objoff');}catch(e){}return r;};}
document.addEventListener('click',ev=>{const el=document.getElementById('objectives');if(!el||!el.contains(ev.target))return;const b=ev.target.closest('[data-q205]');
  if(ev.target.closest('[data-v50go],[data-v50od]'))return;ev.stopImmediatePropagation();if(ev.target.closest('.xwgrip'))return;if(!b)return;ev.preventDefault();const k=b.dataset.q205;
  if(k==='h')y205Set('h');else if(k==='s')y205Set('c');else if(k==='t')y205Set(Y205.st==='e'?'c':'e');},true);
{const st=document.createElement('style');st.textContent=`#objectives.q205c,#objectives.q205h{max-height:none;overflow:visible}
#objectives .q205hd{display:flex;align-items:center;gap:6px;min-height:24px;padding:1px 0}
#objectives .q205ic{color:#ffd34d;font-size:.95em;text-shadow:0 0 6px #ffb40088}
#objectives .q205tx{flex:1;min-width:0;color:#ffe9a8;font-weight:bold;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
#objectives .q205pg{color:#cfe3ff;font-size:.86em;white-space:nowrap}
#objectives .q205d{color:#9fe0ff;font-size:.86em;white-space:nowrap}
#objectives .q205ar{color:#cdbb92;font-size:.85em}
#objectives .q205x{background:none;border:0;color:#cdbb92;cursor:pointer;font-size:1em;padding:0 2px;line-height:1}
#objectives .q205lbl{color:#cdbb92;font-size:.82em;letter-spacing:2px;margin:4px 0 2px;border-top:1px dashed #4a3620;padding-top:4px}
#objectives .q205show{display:none}
#objectives.q205c .q205det{display:none}
#objectives.q205c{width:auto;max-width:min(calc(330px * var(--xwfs,1)),62vw);padding-top:5px;padding-bottom:5px}
#objectives.q205h{width:auto!important;padding:0!important;background:none!important;border:0!important;box-shadow:none!important}
#objectives.q205h>*:not(.q205show){display:none!important}
#objectives.q205h .q205show{display:flex;align-items:center;justify-content:center;width:34px;height:34px;border-radius:9px;border:1px solid #8a6a3a;background:#1a120bdd;font-size:17px;cursor:pointer}body.touch #objectives .q205hd{gap:4px}body.touch #objectives .q205tx{white-space:normal;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;line-height:1.25;font-size:.95em}
body.touch #objectives.expanded .q205det .v50od,body.touch #objectives.expanded .q205det .v50oh,body.touch #objectives.expanded .q205det .v50op,body.touch #objectives.expanded .q205det .v50go{display:revert}
body.touch #x47obt{display:none!important}body.touch:not(.x47mmoff) #objectives.q205c:not(.xwdragged),body.touch:not(.x47mmoff) #objectives.q205e:not(.xwdragged){max-width:calc(100vw - var(--sar,0px) - 196px)!important}
#q205fl{position:fixed;left:50%;top:calc(var(--tb,56px) + 10px);transform:translate(-50%,-14px);opacity:0;pointer-events:none;z-index:60;text-align:center;padding:7px 22px 8px;
  background:linear-gradient(90deg,#0000,#1a120be6 18%,#1a120be6 82%,#0000);color:#ffe9a8;transition:opacity .35s,transform .35s;min-width:260px}
#q205fl small{display:block;color:#ffd34d;font-size:11px;letter-spacing:3px}#q205fl b{font-size:15px;text-shadow:0 0 8px #ffb40066}
#q205fl.on{opacity:1;transform:translate(-50%,0)}`;document.head.appendChild(st);}
{const _x=XW045;XW045=function(){const o=_x();o.y206={dmgEnemy:(s,e,a)=>dmgEnemy(s,e,a),questText:q=>questText(q)};o.y205={Y205,set:y205Set,dir:k=>y205Dir(k),cur:y205Cur,flash:c=>y205Flash(c)};o.XWDrag=XWDrag;if(!o.openSettings)o.openSettings=()=>openSettings();return o;};}

// #206：秘境裡的擊殺也算委託
{const _k=dgKill;dgKill=function(src,e){const r=_k.apply(this,arguments);try{questHuntKill(e);}catch(err){}return r;};}

// #197：玩家改下別的命令（右鍵）＝清空排隊
{const _rc=rightClick;rightClick=function(){if(!buildMode)for(const id of selUnits){const u=unitById(id);if(u){u.bq=[];u.b197=null;}}return _rc.apply(this,arguments);};}

// v0.4.8 測試掛鉤（唯讀函式表，供自動測試呼叫內部函式）
{const _x=XW045;XW045=function(){const o=_x();o.y48={gates:()=>gates(),genQuest:v=>genQuest(v),acceptQuest:id=>acceptQuest(id),completeQuest:id=>completeQuest(id),openTrade:id=>openTrade(id),closeTrade:()=>closeTrade(),
  vById:id=>vById(id),bById:id=>bById(id),dgKill:(s,e)=>dgKill(s,e),setRel:(v,d)=>setRel(v,d),aiStart:(u,k)=>aiStart(u,k),openSettings:()=>openSettings(),updateObjectives:()=>updateObjectives(),
  get selBuilding(){return selBuilding;},set selBuilding(v){selBuilding=v;},get selUnits(){return selUnits;},set selUnits(v){selUnits=v;},cam,mmPt:(x,y)=>mmPt(x,y)};return o;};}

// ======================= v0.4.8 版面（使用者指定）：小地圖移到右上（頂欄下方）；「提示」框緊接在宗門目標下方（跟著收合／展開／隱藏的高度）；
// 角色／建築面板放在建造列上方、小地圖下方之間，不再蓋住建造列；聯機隊伍面板自動排在提示框下面。重置版面＝這套預設。
const Y48L={sig:''};
function y48Vis(id){const e=document.getElementById(id);if(!e)return null;const cs=getComputedStyle(e);if(cs.display==='none'||cs.visibility==='hidden')return null;const r=e.getBoundingClientRect();return r.width>1&&r.height>1?r:null;}
function y48Lay(){try{const R=document.documentElement.style,W=innerWidth,H=innerHeight;const tb=bb190TopB(document.getElementById('topbar'));
  const ob=y48Vis('objectives');R.setProperty('--y48hintT',Math.round((ob?ob.bottom:tb)+6)+'px');R.setProperty('--y48hintL',Math.round(ob&&ob.left<W/2?ob.left:10)+'px');
  if(!isTouchUI){R.setProperty('--y48mmT',Math.round(tb+6)+'px');const mm=y48Vis('minimap');const pn=document.getElementById('panel');const pw=pn&&pn.offsetWidth||430;
    let bb=y48Vis('buildbar');if(bb&&!(bb.right>W-pw-20&&bb.height>40))bb=null;
    R.setProperty('--y48pB',Math.round(bb?H-bb.top+8:10)+'px');R.setProperty('--y48pT',Math.round((mm&&!mmBig?mm.bottom:tb)+8)+'px');}
  {const h=y48Vis('hint'),sig=(ob?ob.right+','+ob.bottom:'-')+'|'+(h?Math.round(h.right)+','+Math.round(h.bottom):'-');if(sig!==Y48L.sig){Y48L.sig=sig;setTimeout(()=>{try{pbApply();}catch(e){}},0);}}}catch(e){}}// 目標／提示框大小變了 → 弟子列重新排
{const st=document.createElement('style');st.textContent=`body.pc #minimap:not(.big){top:var(--y48mmT,64px)!important;bottom:auto!important}
#hint:not(.xwdragged){left:var(--y48hintL,10px)!important;right:auto!important;top:var(--y48hintT,110px)!important;max-width:min(330px,calc(100vw - 20px))!important;box-sizing:border-box}
body.pc #panel:not(.xwdragged){bottom:var(--y48pB,10px)!important;top:auto!important;max-height:calc(100vh - var(--y48pB,10px) - var(--y48pT,200px))!important;overflow-y:auto}
body.pc #buildbar{right:calc(var(--sar,0px) + 10px)!important;max-width:none!important}`;document.head.appendChild(st);}
{const _u=updateUI;updateUI=function(){const r=_u.apply(this,arguments);y48Lay();return r;};}
try{addEventListener('resize',()=>setTimeout(y48Lay,40));}catch(e){}
// 隊伍面板（net14）預設放在宗門目標下方 → 改排到提示框下方（玩家拖過、存了位置就不動）
{const _n=netPtPlace;netPtPlace=function(el){const r=_n.apply(this,arguments);try{if(el&&!el.dataset.saved&&el.style.display!=='none'){const h=y48Vis('hint');if(h){const e=el.getBoundingClientRect();
  if(e.left<h.right&&e.right>h.left&&e.top<h.bottom&&e.bottom>h.top){el.style.top=Math.round(h.bottom+6)+'px';}}}}catch(e){}return r;};}
{const _x=XW045;XW045=function(){const o=_x();o.y48lay={lay:()=>y48Lay()};return o;};}
// 弟子列（pbar）預設位置也讓開提示框（提示框現在在左邊目標下方）
{const _pd=pbDefault;pbDefault=function(){const d=_pd();try{if(!isTouchUI){const h=y48Vis('hint');if(h&&h.top<d.y+60&&h.left<innerWidth/2){d.x=Math.max(d.x,Math.round(h.right+10));d.mw=Math.max(200,Math.min(d.mw,innerWidth-d.x-448));}}}catch(e){}return d;};}
// ======================= v0.4.8 手機右下動作區重排（使用者回報：技能鈕擠到「☰ 指令」「採集」、指令展開太擠）
// 技能＝動作鈕左邊一直列、間距 12px、每頁最多 4 顆（橫向 3 顆），超過就出現「⇅ 1/2」翻頁鈕（最多 10 個技能都按得到）；
// 動作鈕列間距 12px；指令展開 8 顆鈕改 48px、間距 12px；角色面板寬度讓開技能列，不會疊到。
const Y48SK={pg:0};
function y48SkLay(){try{const R=document.documentElement.style;if(!isTouchUI)return;const el=document.getElementById('v158bar'),A=document.getElementById('actions');
  const a=A&&A.getBoundingClientRect();let pgb=document.getElementById('y48skpg');
  if(!el||el.style.display==='none'){if(pgb)pgb.style.display='none';if(a&&a.width)R.setProperty('--y48skL',Math.round(a.left)+'px');return;}
  const btns=[...el.querySelectorAll(':scope>[data-v158]')],vis=btns.filter(b=>b.style.display!=='none');
  const per=innerWidth>innerHeight?3:4,pages=Math.max(1,Math.ceil(vis.length/per));if(Y48SK.pg>=pages)Y48SK.pg=0;
  btns.forEach(b=>b.classList.remove('y48off'));vis.forEach((b,k)=>{if(Math.floor(k/per)!==Y48SK.pg)b.classList.add('y48off');});
  if(pages>1){if(!pgb){pgb=document.createElement('button');pgb.id='y48skpg';pgb.type='button';pgb.title='切換下一頁技能';el.appendChild(pgb);
      pgb.addEventListener('click',ev=>{ev.stopPropagation();ev.preventDefault();Y48SK.pg++;y48SkLay();const n=document.getElementById('y48skpg');if(n){n.classList.remove('y48pop');void n.offsetWidth;n.classList.add('y48pop');}});}
    const t=`⇅<small>${Y48SK.pg+1}/${pages}</small>`;if(pgb.innerHTML!==t)pgb.innerHTML=t;pgb.style.display='';el.style.minHeight=(per*60+44)+'px';}else{if(pgb)pgb.style.display='none';el.style.minHeight='';}// v0.4.8 動作 QA：翻頁時欄高不變，⇅ 鈕留在原位（原本第 2 頁技能少，鈕會往下掉、連點會點空）
  if(a&&a.width){el.style.right=Math.round(innerWidth-a.left+12)+'px';el.style.bottom=Math.round(innerHeight-a.bottom)+'px';}
  const r=el.getBoundingClientRect();R.setProperty('--y48skL',Math.round(r.width?r.left:(a?a.left:innerWidth))+'px');}catch(e){}}
{const st=document.createElement('style');st.textContent=`body.touch #v158bar{gap:12px!important}
body.touch #v158bar .v158s,body.touch #v158bar .v158s.v196n{width:48px!important;height:48px!important;align-self:auto}
body.touch #v158bar .v158s.y48off{display:none!important}
#y48skpg{display:none}
body.touch #y48skpg{display:flex;flex-direction:column;align-items:center;justify-content:center;width:48px;height:44px;border-radius:12px;border:1px dashed #c9a24a;background:#1a120bdd;color:#ffe9a8;font-size:16px;line-height:1;padding:0;touch-action:manipulation}
body.touch #y48skpg small{font-size:10px;color:#d8c9a6;margin-top:2px}
#y48skpg.y48pop{animation:x47pop .16s ease-out}
body.touch #y48skpg{margin-bottom:auto}
body.touch.x47fanon #actions{gap:12px!important}
body.touch.x47fanon.x47fan #a_shrine{visibility:hidden}
body.touch.x47fanon.x47fan #actions>.x47fi{right:calc(var(--fc)*60px)!important;bottom:calc(60px + var(--fr)*60px)!important;width:48px!important;height:48px!important}
@media (orientation:portrait){body.touch #panel:not(.xwdragged){max-width:calc(var(--y48skL,400px) - 16px - var(--sal,0px))!important}}`;document.head.appendChild(st);}
{const _u=updateUI;updateUI=function(){const r=_u.apply(this,arguments);y48SkLay();return r;};}
{const _x=XW045;XW045=function(){const o=_x();o.y48sk={lay:()=>y48SkLay(),st:Y48SK};return o;};}
// ======================= v0.4.8 角色取名：開新遊戲／舊存檔第一次讀取／聯機加入或開房（瀏覽器還沒存過名號）時先取名
// 名字存在存檔（player.name），頭頂名牌、角色面板、頂欄、事件訊息都用它；跟聯機名號（xianwu_net_name）互相同步。
const Y48N={cb:null,pass:false,wasP:false};
const Y48N_SUR=['李','林','蕭','葉','沈','蘇','陸','顧','韓','秦','謝','白','楚','溫','慕容','上官','南宮','司馬','歐陽','東方','獨孤','令狐'];
const Y48N_GIV=['逍遙','長青','無塵','清風','明月','凌霄','玄機','驚鴻','若虛','青嵐','天行','寒舟','問道','聽雪','臨淵','星河','雲崖','不凡','靈均','鶴年','知秋','遠山'];
function y48RandName(){const pick=a=>a[Math.floor(Math.random()*a.length)];let n='';for(let k=0;k<8;k++){n=pick(Y48N_SUR)+pick(Y48N_GIV);if([...n].length<=8)break;}return n;}
function y48NameValid(n){n=(n||'').trim();const L=[...n].length;return L>=1&&L<=8&&n!=='你';}
function y48Undupe(n){n=(n||'').trim();const a=[...n];if(a.length>=6&&a.length%2===0){const h=a.length/2;if(h>=3&&a.slice(0,h).join('')===a.slice(h).join(''))return a.slice(0,h).join('');}return n;}
function y48SavedName(){try{const n=(localStorage.getItem(typeof NET_LS_NAME!=='undefined'?NET_LS_NAME:'xianwu_net_name')||'').trim();return n&&!/^道友[A-Z0-9]{3}$/.test(n)?[...n].slice(0,8).join(''):'';}catch(e){return '';}}
function y48SetPName(n,quiet){n=y48Undupe([...(n||'').trim()].slice(0,8).join(''));if(!n)return;const p=player();if(p)p.name=n;(S.flags||(S.flags={})).y48nm=1;
  try{if(typeof netSetName==='function')netSetName(n);else localStorage.setItem('xianwu_net_name',n);}catch(e){}
  try{const i=document.getElementById('np_name');if(i)i.value=n;}catch(e){}
  try{renderPanel();}catch(e){}try{updateUI();}catch(e){}if(!quiet)toast(`歡迎，${n}！`);}
function y48NameAsk(opt,cb){opt=opt||{};let el=document.getElementById('y48name');if(!el){el=document.createElement('div');el.id='y48name';el.className='ui';(document.getElementById('root')||document.body).appendChild(el);}
  const pre=[...(opt.pre||y48SavedName()||y48RandName())].slice(0,8).join('');
  el.innerHTML=`<div class="y48nc"><div class="y48nt">${opt.title||'為你的角色取個名字'}</div><div class="y48ns">${opt.sub||'名字會顯示在頭頂名牌、角色面板與事件訊息（1～8 個字）'}</div>
  <div class="y48nr"><input id="y48nmi" type="text" maxlength="8" autocomplete="off" enterkeyhint="done" spellcheck="false"><button class="btn" type="button" id="y48nrd" title="隨機取一個修仙風格的名字">🎲</button></div>
  <div class="y48ne" id="y48ne"></div><div class="y48nact"><button class="btn" type="button" id="y48nno">取消</button><button class="btn pri" type="button" id="y48nok">${opt.ok||'確定'}</button></div></div>`;
  const i=el.querySelector('#y48nmi');i.value=pre;Y48N.cb=cb;el.style.display='flex';document.body.classList.add('y48naming');
  Y48N.kind=opt.kind||'';Y48N.wasP=paused;Y48N.pz=!!opt.pause&&!(typeof NET!=='undefined'&&NET.role);if(Y48N.pz)paused=true;
  const upd=()=>{const ok=y48NameValid(i.value);el.querySelector('#y48nok').disabled=!ok;el.querySelector('#y48ne').textContent=i.value.trim()===''?'請輸入名字':[...i.value.trim()].length>8?'最多 8 個字':i.value.trim()==='你'?'換個名字吧':'';};
  i.addEventListener('input',upd);upd();
  el.querySelector('#y48nrd').addEventListener('click',ev=>{ev.preventDefault();i.value=y48RandName();upd();const b=ev.currentTarget;b.classList.remove('y48spin');void b.offsetWidth;b.classList.add('y48spin');});
  el.querySelector('#y48nok').addEventListener('click',ev=>{ev.preventDefault();y48NameSubmit();});
  el.querySelector('#y48nno').addEventListener('click',ev=>{ev.preventDefault();y48NameCancel();});
  i.addEventListener('keydown',ev=>{if(ev.key&&ev.key.length===1&&i.value===pre&&i.selectionStart===i.selectionEnd){try{i.select();}catch(e){}}});
  i.addEventListener('compositionstart',()=>{if(i.value===pre&&i.selectionStart===i.selectionEnd){try{i.select();}catch(e){}}});
  setTimeout(()=>{try{i.focus({preventScroll:true});i.select();}catch(e){}},60);}
function y48NameClose(){const el=document.getElementById('y48name'),i=document.getElementById('y48nmi');if(!el)return;el.style.display='none';document.body.classList.remove('y48naming');try{if(i)i.blur();}catch(e){}if(Y48N.pz)paused=Y48N.wasP;Y48N.pz=false;Y48N.cb=null;}
function y48NameCancel(){const el=document.getElementById('y48name');if(!el||el.style.display==='none')return;
  const kind=Y48N.kind||'';
  y48NameClose();
  try{
    // 新遊戲取名：回標題；讀檔取名：回標題（存檔選單仍可再開）；聯機取名：留在聯機面板
    if(kind==='net'||kind==='join'||kind==='host'){
      try{if(typeof netTogglePanel==='function')netTogglePanel(true);}catch(e){}
      return;
    }
    if(kind==='load'){
      try{showTitle(true);if(typeof openSaves==='function')openSaves('load');}catch(e){try{showTitle(true);}catch(e2){}}
      return;
    }
    // default: new-game from title
    try{showTitle(true);if(typeof renderTitle==='function')renderTitle();}catch(e){}
  }catch(e){}
}
function y48NameSubmit(){const el=document.getElementById('y48name'),i=document.getElementById('y48nmi');if(!el||!i||el.style.display==='none')return;const n=i.value.trim();
  if(!y48NameValid(n)){const c=el.querySelector('.y48nc');c.classList.remove('y48shake');void c.offsetWidth;c.classList.add('y48shake');return;}
  el.style.display='none';document.body.classList.remove('y48naming');try{i.blur();}catch(e){}if(Y48N.pz)paused=Y48N.wasP;Y48N.pz=false;const cb=Y48N.cb;Y48N.cb=null;if(cb)cb(n);}
{const st=document.createElement('style');st.textContent=`#y48name{position:fixed;inset:0;z-index:200;display:none;align-items:flex-start;justify-content:center;background:#0009;padding-top:max(9vh,calc(env(safe-area-inset-top,0px) + 16px))}
#y48name .y48nc{background:linear-gradient(#2a1d12,#1a120b);border:1px solid #c9a24a;border-radius:12px;padding:18px 18px 16px;width:min(360px,calc(100vw - 32px));box-shadow:0 10px 40px #000c;color:#f3e3c0;text-align:center;animation:x47pop .18s ease-out}
#y48name .y48nt{font-size:18px;font-weight:bold;color:#ffe9a8;letter-spacing:2px}#y48name .y48ns{font-size:12px;color:#c8b48a;margin:6px 0 12px}
#y48name .y48nr{display:flex;gap:8px}#y48name input{flex:1;min-width:0;height:44px;font-size:18px;text-align:center;border-radius:8px;border:1px solid #8a6a3a;background:#0d0906;color:#fff4d6;padding:0 8px;box-sizing:border-box}
#y48name input:focus{outline:none;border-color:#ffd34d;box-shadow:0 0 0 2px #ffd34d44}
#y48name #y48nrd{width:48px;height:44px;font-size:20px;padding:0}#y48name .y48nact{display:flex;gap:8px;margin-top:10px}#y48name #y48nok,#y48name #y48nno{flex:1;height:44px;font-size:16px}#y48name #y48nok:disabled{opacity:.45}
#y48name .y48ne{min-height:16px;font-size:12px;color:#ff9a7a;margin-top:6px}
#y48nrd.y48spin{animation:y48spin .35s ease-out}@keyframes y48spin{from{transform:rotate(-200deg) scale(.7)}to{transform:none}}
.y48shake{animation:y48sh .3s}@keyframes y48sh{25%{transform:translateX(-8px)}50%{transform:translateX(7px)}75%{transform:translateX(-4px)}}
body.y48naming #joy,body.y48naming #actions,body.y48naming #v158bar{visibility:hidden}
body.touch #v49_realm .v49pi{max-width:6em;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;display:inline-block;vertical-align:bottom}`;document.head.appendChild(st);}
try{X47_MODALS.push('y48name');}catch(e){}
// 開新遊戲（標題畫面）
{const _n=newGame;newGame=function(){const r=_n.apply(this,arguments);try{(S.flags||(S.flags={})).y48api=1;}catch(e){}return r;};}
{const _t=titleNew;titleNew=function(){const r=_t.apply(this,arguments);try{delete S.flags.y48api;}catch(e){}y48NameAsk({kind:'new',pause:true,title:'為你的角色取個名字',sub:'踏上仙途之前，先取個名號（1～8 個字，之後聯機也用這個名字）'},n=>y48SetPName(n));return r;};}
// 讀檔：舊存檔沒有名字 → 問一次（聯機成員不問，名字跟著聯機名號）
{const _l=loadSlot;loadSlot=async function(){const r=await _l.apply(this,arguments);try{const p=player();if(p&&!v49Client()&&!(S.flags&&(S.flags.y48nm||S.flags.y48api))){
  if(p.name&&p.name!=='你'){p.name=y48Undupe(p.name);S.flags.y48nm=1;}else y48NameAsk({kind:'load',title:'這個存檔還沒有名字',sub:'幫你的角色取個名字吧（只會問這一次）',pre:y48SavedName()},n=>y48SetPName(n));}}catch(e){}return r;};}
// 聯機：按「加入」或「開房」時，若瀏覽器還沒存過名號 → 先取名（名號＝角色名）
addEventListener('click',ev=>{if(Y48N.pass)return;const t=ev.target&&ev.target.closest&&ev.target.closest('#netp [data-n="join"],#netp [data-n="host"]');if(!t||y48SavedName())return;
  ev.stopImmediatePropagation();ev.preventDefault();const nm=document.getElementById('np_name');const v=nm&&nm.value.trim();
  y48NameAsk({kind:t.dataset.n==='join'?'join':'host',title:t.dataset.n==='join'?'加入前，先取個名字':'開房前，先取個名字',sub:'其他道友會看到這個名字（1～8 個字）',pre:v&&!/^道友[A-Z0-9]{3}$/.test(v)?v:'',ok:t.dataset.n==='join'?'確定並加入':'確定並開房'},n=>{
    try{if(nm)nm.value=n;netSetName(n);}catch(e){}Y48N.pass=true;try{t.click();}finally{Y48N.pass=false;}});},true);
// 名號同步：房主／單機的角色名 ⇄ 聯機名號；頂欄小標籤顯示名字
{const _u=updateUI;updateUI=function(){const r=_u.apply(this,arguments);try{const p=player();if(p){
  if(p.name){const d=y48Undupe(p.name);if(d!==p.name)p.name=d;}
  const pi=document.querySelector('#v49_realm .v49pi');if(pi){const n=pnm(p);if(pi.textContent!==n)pi.textContent=n;}}}catch(e){}return r;};}
try{const _sn=netSetName;netSetName=function(n){const r=_sn.apply(this,arguments);try{const p=player();if(p&&!v49Client()&&S.flags&&S.flags.y48nm){const m=y48Undupe([...(NET.name||'')].slice(0,8).join(''));if(m&&p.name!==m){p.name=m;try{renderPanel();}catch(e){}}}}catch(e){}return r;};}catch(e){}
{const _x=XW045;XW045=function(){const o=_x();o.y48name={ask:(t,cb)=>y48NameAsk(t||{},cb||(n=>y48SetPName(n))),submit:()=>y48NameSubmit(),cancel:()=>y48NameCancel(),rand:()=>y48RandName(),set:n=>y48SetPName(n),saved:()=>y48SavedName(),pnm:()=>pnm(player())};return o;};}
// v0.4.8 動作 QA：飄字不再疊在名牌／血條上、同時出現的飄字往上錯開（技能名、元素、傷害數字不互相壓字；以螢幕座標判斷）
{const _fl=floater;floater=function(x,y,text,col){const r=_fl.apply(this,arguments);try{const f=floaters[floaters.length-1];if(f&&f.text===text&&f.t===0&&f.h0==null){
  let base=34;for(const u of S.units){if(!u.dead&&!u.inside&&Math.abs(u.x-x)<0.6&&Math.abs(u.y-y)<0.6){base=u.kind==='player'?64:56;break;}}
  if(base===34&&S.enemies)for(const e of S.enemies){if(!e.dead&&Math.abs(e.x-x)<0.6&&Math.abs(e.y-y)<0.6){base=50;break;}}
  const wd=t=>String(t).length*11+8,wf=wd(text);let h=base;
  for(let it=0;it<14;it++){const pf=P(x,y,h);let hit=false;for(const g of floaters){if(g===f||g.t>0.7)continue;const pg=P(g.x,g.y,(g.h0||34)+g.t*28);
      if(Math.abs(pf.x-pg.x)<(wf+wd(g.text))/2&&Math.abs(pf.y-pg.y)<17){hit=true;break;}}if(!hit)break;h+=7;}
  f.h0=h;}}catch(e){}return r;};}
// v0.4.8 動作 QA：重傷（<35% 氣血）的弟子不再跑去玩耍／下山，直接療傷（白天就地打坐療傷、夜裡回住房）
{const _ad=aiDecide;aiDecide=function(u,force){if(u&&u.kind==='disciple'&&!u.y47e&&!u.rip&&!u.retreat&&u.hp<u.maxhp*0.35){aiStart(u,'rest');return 'rest';}return _ad.apply(this,arguments);};}
// v0.4.8 動作 QA：聯機成員畫面的單位不再「滑行」— 客戶端插值只算位置與 walk，從未設定 moving／face（net2_sync／net9_coopfix 的遺漏），
// 這裡在客戶端更新之後依插值速度補上 moving（帶 0.12s 緩衝防閃爍）並把 face 平滑轉向 faceT，與房主端 moveEntity 一致。
{const _x=netClientUpdate;netClientUpdate=function(dt){const r=_x.apply(this,arguments);try{const now=performance.now();
  const fx=o=>{if(!o||o.dead)return;const sp=Math.hypot(o.vx||0,o.vy||0);if(sp>0.25)o._y48mv=now;o.moving=!o.inside&&o._y48mv!=null&&now-o._y48mv<120;
    if(o.faceT!=null){if(o.face==null||isNaN(o.face))o.face=o.faceT;o.face+=(o.faceT-o.face)*Math.min(1,dt*9);}};
  for(const u of S.units)fx(u);for(const e of S.enemies)fx(e);if(S.wand)for(const w of S.wand)fx(w);}catch(e){}return r;};}
// v0.4.8 動作 QA：展開／收合宗門目標時，提示框與通知列「同一幀」就讓位（原本要等下一次 updateUI，會先疊在展開的目標上 1～2 幀才跳開）
{const _u=updateUI;updateUI=function(){const r=_u.apply(this,arguments);try{y194Lay();}catch(e){}return r;};}
try{if(typeof ResizeObserver==='function'){let busy=false;const ro=new ResizeObserver(()=>{if(busy)return;busy=true;try{y48Lay();y194Lay();}catch(e){}busy=false;});
  const hook=()=>{for(const id of ['objectives','hint']){const e=document.getElementById(id);if(e&&!e._y48ro){e._y48ro=1;ro.observe(e);}}};hook();addEventListener('load',hook);setTimeout(hook,1500);}}catch(e){}
