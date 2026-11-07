// ================== v0.4.6e：《不問凡塵》風格擴充（秘境搜打撤、正魔聲望、拍賣會、比武大會、煉丹火候＋丹毒、連招疊層、神識辨妖、字體大小）==================
// 規則：頂層不碰 g7 的 const；DOM 放進 XW045 包裝；所有新狀態放 S.flags.v48（隨存檔／快照同步，房主權威）。
const V48={t:0,ut:0,tab:'karma',open:false,fsDone:new WeakSet()};
UNIT_KEEP.push('yao');DISC_COPY.push('yao');WAND_KEEP.push('yao');CAND_KEEP.push('yao');EN_KEEP.push('yao','bh');
function v48Client(){return typeof NET!=='undefined'&&NET&&NET.role==='client';}
function v48St(){const F=S.flags;let G=F.v48;if(!G||typeof G!=='object')G=F.v48={};
  if(typeof G.k!=='number')G.k=0;if(!G.log)G.log=[];
  if(G.aT==null)G.aT=S.time+(S.time<600?600-S.time:300);if(G.tT==null)G.tT=S.time+(S.time<900?900-S.time:450);
  if(G.yT==null)G.yT=S.time+240;if(G.bhT==null)G.bhT=S.time+200;if(G.scanCd==null)G.scanCd=0;if(G.nA==null)G.nA=0;if(G.nT==null)G.nT=0;return G;}
function v48Sect(u){return u&&!u.dead&&(u.kind==='player'||u.kind==='disciple');}

// ======================= 2. 正魔散修聲望 =======================
TUNE.v48={kMax:100,path:30,path2:60,bhK:-40,bhEvery:220};
function karma(){return S&&S.flags&&S.flags.v48?S.flags.v48.k||0:0;}
function karmaPath(k){k=k==null?karma():k;return k>=TUNE.v48.path?'zheng':k<=-TUNE.v48.path?'mo':'san';}
const KPATH={zheng:{n:'正道',ic:'☯',col:'#9fe8ff'},mo:{n:'魔道',ic:'☠',col:'#ff8a8a'},san:{n:'散修',ic:'☁',col:'#e8dcc0'}};
function karmaTxt(k){k=k==null?karma():k;return k>0?`正 ${Math.round(k)}`:k<0?`魔 ${Math.round(-k)}`:'中立 0';}
function addKarma(d,why,x,y){if(!S||!d)return;const G=v48St();const p0=karmaPath(G.k);G.k=clamp(G.k+d,-TUNE.v48.kMax,TUNE.v48.kMax);
  G.log.unshift({t:Math.round(S.time),d,why});if(G.log.length>12)G.log.length=12;
  if(x!=null)floater(x,y-0.3,(d>0?'正 +':'魔 +')+Math.abs(d),d>0?'#9fe8ff':'#ff8a8a');
  const p1=karmaPath(G.k);if(p0!==p1)toast(`宗門聲望轉為「${KPATH[p1].n}」（${karmaTxt(G.k)}）${p1==='mo'?'：正道人士側目，賞金獵人可能上門':p1==='zheng'?'：各村更願親近宗門':''}`);
  V48.kDirty=true;}
// 聲望帶來的功法／被動
const KPERK=[
 {id:'hr',p:'zheng',need:30,n:'浩然正氣',d:'宗門弟子受到的傷害 -10%'},
 {id:'tq',p:'zheng',need:60,n:'功法・太清心經',d:'全宗修煉速度 +12%'},
 {id:'xs',p:'mo',need:30,n:'血煞功',d:'傷害 +12%，擊殺回復 3% 氣血'},
 {id:'sh',p:'mo',need:60,n:'功法・噬魂大法',d:'擊殺額外獲得 50% 修為'},
 {id:'xy',p:'san',need:0,n:'逍遙遊',d:'修煉 +5%，秘境撤離引導縮短為 3.5 秒'}];
function perkOn(id){const P=KPERK.find(x=>x.id===id);if(!P||!S)return false;const k=karma();if(P.p==='zheng')return k>=P.need;if(P.p==='mo')return -k>=P.need;return karmaPath(k)==='san';}
{const _cm=cultMul;cultMul=function(u){let m=_cm(u);if(v48Sect(u)){if(perkOn('tq'))m*=1.12;if(perkOn('xy'))m*=1.05;const t=u.tox||0;if(t>=0.5)m*=0.7;}return m;};}
{const _de=dmgEnemy;dmgEnemy=function(src,e,amt,col){if(src&&src.kind&&v48Sect(src)){if(perkOn('xs'))amt*=1.12;if((src.tox||0)>=0.8)amt*=0.85;}return _de(src,e,amt,col);};}
{const _du=dmgUnit;dmgUnit=function(src,u,d){if(v48Sect(u)&&perkOn('hr'))d*=0.9;return _du(src,u,d);};}
// 行為 → 聲望
{const _ke=killEnemy;killEnemy=function(src,e){const was=e&&!e.dead;const r=_ke(src,e);try{if(was&&e.dead&&!v48Client())v48OnKill(src,e);}catch(er){console.warn(er);}return r;};}
function v48OnKill(src,e){const v=e.camp!=null?vById(e.camp):null;
  if(e.yao){addKarma(3,'斬殺妖修',e.x,e.y);S.res.lingshi+=4;}
  else if(e.bh){S.res.lingshi+=3;floater(e.x,e.y,'+3 靈石','#9fe0ff');}
  else if(e.vg!=null||(e.type==='militia'&&v&&v.type!=='bandit'))addKarma(-2,'殺害村勇',e.x,e.y);
  else if(ENEMY[e.type]&&ENEMY[e.type].human&&v&&v.type==='bandit')addKarma(1,'剿滅山賊',e.x,e.y);
  if(src&&v48Sect(src)){if(perkOn('xs'))src.hp=Math.min(src.maxhp,src.hp+src.maxhp*0.03);if(perkOn('sh')){const ED=ENEMY[e.type];if(ED&&ED.xiu)gainXiu(src,Math.round(ED.xiu*(1+(e.realm||0)*0.5)*0.5));}}}
{const _x=extort;extort=function(vid){const r=_x(vid);if(r)addKarma(-8,'強徵村莊');return r;};}
{const _x=campDestroyed;campDestroyed=function(v){const was=v&&!v.destroyed;_x(v);if(was&&v.destroyed)addKarma(15,'攻破山寨');};}
{const _x=giftWanderer;giftWanderer=function(w){const r=_x(w);if(r)addKarma(2,'接濟流浪者');return r;};}
{const _x=kickDisciple;kickDisciple=function(u,q){const r=_x(u,q);if(r)addKarma(-3,'逐出弟子');return r;};}
{const _x=updateVRaids;updateVRaids=function(dt){const n0=S.stats.vraids||0;_x(dt);if((S.stats.vraids||0)>n0)addKarma(-15,'掠奪村莊');};}
{const _x=checkRaids;checkRaids=function(){const n0=S.stats.raidsRepelled||0;_x();if((S.stats.raidsRepelled||0)>n0)addKarma(2,'守護一方');};}
if(typeof doTrade==='function'){const _x=doTrade;doTrade=function(vid,k){const q0=S.stats.quests||0;return _x(vid,k);};}
// 委託完成＋賠禮：用統計數字偵測（不改原函式）
function v48StatWatch(){const G=v48St(),q=S.stats.quests||0;if(G.q0==null)G.q0=q;if(q>G.q0){addKarma(4*(q-G.q0),'完成村莊委託');G.q0=q;}}
// 聲望影響村莊態度（每 30 秒）
function v48KarmaDrift(){const p=karmaPath();for(const v of S.villages){if(v.type==='bandit'||v.destroyed)continue;
  if(p==='zheng'&&v.rel<40)v.rel=clamp(v.rel+1,-100,100);else if(p==='mo'&&v.rel>-50)v.rel=clamp(v.rel-1,-100,100);}}
// 賞金獵人（魔道 ≤ -40）
function v48Bounty(force){const G=v48St();if(!force&&(karma()>TUNE.v48.bhK||S.dg))return false;const c=sectCenter(),p=player();
  const n=Math.min(6,2+Math.floor(Math.abs(Math.min(karma(),-40))/25)),rl=clamp((p?p.realm:1),0,5),rid=nid();let x0=null;
  for(let t=0;t<12&&!x0;t++){const a=rnd()*6.283;const f=nearestFree(c.x+Math.cos(a)*16,c.y+Math.sin(a)*16,-1);if(f&&compAt(f.i+0.5,f.j+0.5)===startComp)x0=f;}
  if(!x0)x0=nearestFree(c.x+14,c.y,-1);if(!x0)return false;let k=0;
  for(;k<n;k++){const f=nearestFree(x0.i+(k%3)-1,x0.j+((k/3)|0)-1,-1);if(!f)continue;const e=makeEnemy(k===0?'chief':'bandit',f.i+0.5,f.j+0.5,{raid:rid,realm:Math.max(0,rl-(k===0?0:1))});
    e.name=pick(['追魂','斷命','鐵爪','無影','血刀','寒鴉'])+'客';e.bh=1;e.home={x:f.i+0.5,y:f.j+0.5};S.enemies.push(e);}
  S.raidsActive.push({id:rid,vid:-1,t0:S.time,n,bh:1});ping(x0.i,x0.j,true);toast(`魔名遠播：${n} 名賞金獵人前來討伐宗門！（擊殺各得靈石 3）`);G.bhN=(G.bhN||0)+1;return true;}
{const _en=enemyName;enemyName=function(e){if(e&&e.bh){e._bh=1;return _en(e);}if(e&&e.yao){e._yao=1;return _en(e);}return _en(e);};}

// ======================= 1. 秘境搜打撤 =======================
TUNE.dgKeepFail=0.2;TUNE.dgCh=5;
function dgLootList(L){const a=[];if(!L)return a;for(const k in L.res)if(L.res[k])a.push([cname(k),L.res[k]]);for(const k in L.mats)if(L.mats[k])a.push([cname(k),L.mats[k]]);
  if(L.items.length)a.push(['裝備',L.items.length]);if(L.misc.miji)a.push(['秘籍',L.misc.miji]);if(L.misc.gongfa)a.push(['功法',L.misc.gongfa]);if(L.misc.xfl)a.push(['仙凡令',1]);if(L.misc.rec)a.push(['丹方殘頁',L.misc.rec]);return a;}
function dgChT(){return perkOn('xy')?3.5:TUNE.dgCh;}
{const _x=dgExit;dgExit=function(keep){const D=S.dg;if(!D||keep)return _x(keep);
  // 失敗：保留約 20%（無法帶出秘籍／功法／仙凡令）
  const L=D.loot,sv={res:{},mats:{},items:[]};for(const k in L.res)sv.res[k]=Math.floor(L.res[k]*TUNE.dgKeepFail);for(const k in L.mats)sv.mats[k]=Math.floor(L.mats[k]*TUNE.dgKeepFail+(rnd()<(L.mats[k]*TUNE.dgKeepFail)%1?1:0));
  for(const it of L.items)if(rnd()<TUNE.dgKeepFail)sv.items.push(it);
  const r=_x(keep);const got=[];for(const k in sv.res)if(sv.res[k]>0){S.res[k]+=sv.res[k];got.push(cname(k)+' '+sv.res[k]);}for(const k in sv.mats)if(sv.mats[k]>0){S.mats[k]=(S.mats[k]||0)+sv.mats[k];got.push(cname(k)+' '+sv.mats[k]);}
  for(const it of sv.items){addItem(it);got.push(itemName(it));}
  setTimeout(()=>toast(got.length?`拼死搶出一小部分戰利品（約 ${Math.round(TUNE.dgKeepFail*100)}%）：${got.slice(0,6).join('、')}`:`未帶出的戰利品全數遺失`),900);
  if(S.dgLast)S.dgLast.salv=got.length;return r;};}
function dgRetreatCh(){const D=S.dg;if(!D)return false;const p=player();if(!p||p.dead)return false;
  if(D.cleared||dist(p.x,p.y,D.ent.x,D.ent.y)<2||(D.exitP&&dist(p.x,p.y,D.exitP.x,D.exitP.y)<2)){dgExit(true);return true;}
  if(D.ch){D.ch=null;toast('取消撤離');return false;}
  D.ch={t:0,T:dgChT(),x:p.x,y:p.y,hp:p.hp};setTask(p,null);p.path=[];toast(`開始引導撤離（${dgChT()} 秒）：保持不動、別被打斷`);return true;}
{const _x=dgRetreat;dgRetreat=function(){if(!S.dg)return _x();return dgRetreatCh();};}
{const _x=dgUpdate;dgUpdate=function(dt){_x(dt);const D=S.dg;if(!D||!D.ch)return;const p=player();if(!p||p.dead){D.ch=null;return;}
  if(dist(p.x,p.y,D.ch.x,D.ch.y)>1.2||p.hp<D.ch.hp-0.5){D.ch=null;toast('撤離被打斷！');floater(p.x,p.y,'撤離中斷','#ff9a7a');return;}
  D.ch.hp=Math.max(D.ch.hp,p.hp);D.ch.t+=dt;if(D.ch.t>=D.ch.T){D.ch=null;floater(p.x,p.y,'撤離！','#9fe0ff');dgExit(true);}};}
{const _x=renderDgHud;renderDgHud=function(){_x();const el=document.getElementById('dghud');if(!el||!S.dg)return;const D=S.dg;
  const ob=el.querySelector('#dg_out');if(ob){const t=D.cleared?'帶寶離開':D.ch?`撤離中 ${Math.floor(D.ch.t/D.ch.T*100)}%（點擊取消）`:`撤離 (X)・引導 ${dgChT()} 秒`;if(ob.textContent!==t)ob.textContent=t;}
  const a=dgLootList(D.loot);const h=`<span class="v48ul">📦 未帶出：${a.length?a.slice(0,6).map(x=>`<span class="tg">${x[0]} ${x[1]}</span>`).join(''):'<span class="dim">（尚無）</span>'}${a.length>6?'…':''}</span><span class="dim sm">　倒下僅保住 ${Math.round(TUNE.dgKeepFail*100)}%</span>${D.ch?`<div class="bar v48chb"><i style="width:${D.ch.t/D.ch.T*100}%;background:#7ac8ff"></i></div>`:''}`;
  let b=el.querySelector('#v48dgl');if(!b){b=document.createElement('div');b.id='v48dgl';el.appendChild(b);b._h='';}if(b._h!==h){b._h=h;b.innerHTML=h;}};}

// ======================= 5. 煉丹火候 + 丹毒 =======================
const ALC_PH=[{n:'文火',c:0.32},{n:'武火',c:0.78},{n:'收丹',c:0.55}];
function alcPhase(b){const c=b&&b.craft;if(!c)return 0;const f=c.t/c.T;return f<0.34?0:f<0.67?1:2;}
let v48Off=0;
{const _fg=fireGauge;fireGauge=function(){return _fg()+v48Off;};}
{const _ft=fireTap;fireTap=function(b){if(!b||!b.craft||b.type!=='alchemy')return _ft(b);const ph=ALC_PH[alcPhase(b)];
  v48Off=0.75-ph.c;let r;try{r=_ft(b);}finally{v48Off=0;}if(b.craft){b.craft.ph=b.craft.ph||[0,0,0];}return r;};}
{const _fc=finishCraft;finishCraft=function(b){const c=b&&b.craft;const al=b&&b.type==='alchemy',hits=c?c.hits:0,fire=c?c.fire:0;const r=_fc(b);
  if(al&&r&&r.k&&S.pills[r.k]){if(hits>=3&&r.q<2&&rnd()<0.5){S.pills[r.k][r.q]-=r.n;S.pills[r.k][r.q+1]+=r.n;r.q++;toast(`火候圓滿，丹紋浮現！品質提升為「${PQ[r.q]}」`);}
    S.flags.v48pure=S.flags.v48pure||{};}
  return r;};}
const TOX_ADD={hx:0.04,jq:0.12,tp:0.10,xs:0.15};
function toxTier(t){return t>=0.8?{n:'丹毒攻心',col:'#ff6a6a',d:'修煉 ×0.7、攻擊 -15%、藥效 -64%'}:t>=0.5?{n:'丹毒淤積',col:'#ffb070',d:'修煉 ×0.7、藥效大減'}:t>=0.25?{n:'微有丹毒',col:'#ffe27a',d:'藥效略減'}:{n:'清淨',col:'#9fe8b0',d:'無影響'};}
{const _up=usePill;usePill=function(u,k){if(!u||!TOX_ADD[k])return _up(u,k);const t0=u.tox||0,hp0=u.hp,tp0=u.tpB||0;const ok=_up(u,k);if(!ok)return ok;
  const eff=1-t0*0.8;
  if(k==='hx'&&u.hp>hp0)u.hp=hp0+(u.hp-hp0)*eff;
  if(k==='tp'&&(u.tpB||0)>tp0)u.tpB=tp0+((u.tpB||0)-tp0)*eff;
  u.tox=Math.min(1,t0+TOX_ADD[k]);const T=toxTier(u.tox);
  floater(u.x,u.y+0.3,`丹毒 ${Math.round(u.tox*100)}%`,T.col);if(t0>=0.25)setTimeout(()=>toast(`${nm(u)}體內丹毒 ${Math.round(t0*100)}%，藥效只剩 ${Math.round(eff*100)}%（${T.n}）`),300);
  if(u.tox>=0.8&&rnd()<0.5){u.hp=Math.max(1,u.hp-u.maxhp*0.1);floater(u.x,u.y,'丹毒反噬','#ff6a6a');}return ok;};}
function toxHtml(u){const t=u.tox||0,T=toxTier(t);return `<div>☠ 丹毒 <span class="v48tox"><i style="width:${Math.round(t*100)}%;background:${T.col}"></i></span> <b style="color:${T.col}">${Math.round(t*100)}%</b> <span class="tg">${T.n}</span>${t>0?`<span class="tg">約 ${Math.ceil(t/0.003/60)} 分鐘消退</span>`:''}<details class="dt"><summary>詳情</summary>每服一顆丹藥都會累積丹毒（回血丹 4%、聚氣丹 12%、突破丹 10%、洗髓丹 15%），每秒自然消退 0.3%。丹毒越高藥效越差（藥效 ×(1 − 丹毒×0.8)）；≥50% 修煉 ×0.7；≥80% 攻擊 -15%，服藥可能反噬氣血。目前：${T.d}。</details></div>`;}

// ======================= 6. 功法連招疊層 =======================
const AB_EL={charge:0,flysword:0,sweep:4,jindan:4,guard:2,fireball:3};
const CB_MAX=3,CB_WIN=8;
function spEl(key){return typeof key==='number'?key:({lei:'雷',bing:'冰',feng:'風',du:'毒',xue:'血',guang:'光',an:'暗',shikong:'時空',hundun:'混沌'})[key]||key;}
function elName(e){return typeof e==='number'?LG_EL[e]:e;}
function v48Combo(u,el,tgt){if(!v48Sect(u))return;const C=u._cb&&S.time-u._cb.t<=CB_WIN&&u._cb.el===el?u._cb:{el,n:0};C.n++;C.t=S.time;u._cb=C;
  if(C.n>=CB_MAX){C.n=0;v48Burst(u,el,tgt);}else floater(u.x,u.y-0.6,`${elName(el)}・${C.n}/${CB_MAX}`,'#ffe9a0');}
function v48Burst(u,el,e){const P=u.atk*(1.4+0.1*u.realm);const foes=S.enemies.filter(x=>!x.dead&&dist(x.x,x.y,(e||u).x,(e||u).y)<2.4);
  fx('break',(e||u).x,(e||u).y,'#ffe27a');floater(u.x,u.y-0.8,`${elName(el)}行共鳴！`,'#ffe27a');
  for(const t of foes)if(!t.dead)dmgEnemy(u,t,P,'#ffe27a');
  if(el===1||el==='光')for(const a of S.units)if(!a.dead&&dist(a.x,a.y,u.x,u.y)<4)a.hp=Math.min(a.maxhp,a.hp+a.maxhp*0.12);
  if(el===2||el==='冰'){u.shield=Math.max(u.shield||0,Math.round(u.maxhp*0.3));u.shieldT=8;}
  if(el===4||el==='雷')for(const t of foes)if(!t.dead){if(typeof xnStun==='function')xnStun(t,1.5,u);else t.stun=Math.max(t.stun||0,1.5);}
  if(el===3)for(const t of foes)if(!t.dead)dmgEnemy(u,t,P*0.5,'#ff8a3a');
  if(el===0&&e&&!e.dead)dmgEnemy(u,e,P*0.6,'#fff2a0');
  u._cbB=(u._cbB||0)+1;if(u.kind==='player')S.stats.cbBurst=(S.stats.cbBurst||0)+1;}
{const _cs=castSpell;castSpell=function(u,e,key){const r=_cs(u,e,key);if(r)try{v48Combo(u,spEl(key),e);}catch(er){}return r;};}
{const _ta=tryAbilities;tryAbilities=function(u,e,manual){const a0=Object.assign({},u.acd||{});const r=_ta(u,e,manual);
  if(r&&u.acd)for(const k in AB_EL)if((u.acd[k]||0)>(a0[k]||0)+0.01){const we=weaponEl(u);v48Combo(u,we>=0?we:AB_EL[k],e);break;}return r;};}
function comboHtml(u){const C=u&&u._cb;if(!C||!C.n||S.time-C.t>CB_WIN)return '';return `<span class="v48cbx">${elName(C.el)}${'●'.repeat(C.n)}${'○'.repeat(CB_MAX-C.n)}</span>`;}

// ======================= 7. 神識辨妖 =======================
TUNE.v48scan={cd:25,ls:2};
function yaoChance(){return S.time<300?0:0.08;}
function v48MakeYao(o){o.yao={t:S.time+180+rnd()*150};return o;}
function v48YaoTick(){const G=v48St();
  if(S.time>=G.yT){G.yT=S.time+600+rnd()*300;if(rnd()<yaoChance()){
    const nat=S.wand.filter(w=>!w.ex&&!w.yao);if(nat.length&&rnd()<0.6){const w=pick(nat);v48MakeYao(w);}
    else{const c=sectCenter();const f=nearestFree(c.x+(rnd()<0.5?-1:1)*(10+rnd()*6),c.y+8+rnd()*6,startComp);if(f){const d=makeDisciple(f.i+0.5,f.j+0.5,ri(0,Math.max(0,BODIES.length-2)));
      if(rnd()<0.5)applyRealmStats(d,Math.min(3,1+ri(0,1)));const w=makeWanderer(d,d.x,d.y,{fav:10});v48MakeYao(w);addWanderer(w);}}}}
  const all=[...S.wand,...S.cands,...S.units.filter(u=>u.kind==='disciple')];
  for(const o of all){if(!o.yao||o.yao.rv||S.time<o.yao.t)continue;v48YaoStrike(o);}}
function v48YaoSpawn(o,weak){const rl=clamp((o.realm||0)+1,1,6);const f=nearestFree(o.x,o.y,-1)||{i:Math.floor(o.x),j:Math.floor(o.y)};
  const e=makeEnemy('tiger',f.i+0.5,f.j+0.5,{realm:rl});e.name=o.name;e.yao=1;if(weak){e.hp=e.maxhp=Math.round(e.maxhp*0.7);}e.home={x:e.x,y:e.y};S.enemies.push(e);fx('break',e.x,e.y,'#b070ff');return e;}
function v48Remove(o){if(o.kind==='disciple'){if(o.inside)exitBuilding(o);S.units.splice(S.units.indexOf(o),1);selUnits=selUnits.filter(id=>id!==o.id);}
  else if(o.kind==='cand'){const i=S.cands.indexOf(o);if(i>=0)S.cands.splice(i,1);}else removeWand(o);if(selOther&&selOther.id===o.id)selOther=null;panelKeyCache=null;}
function v48YaoStrike(o){const ls=Math.min(Math.floor(S.res.lingshi*0.15),30),fd=Math.min(Math.floor(S.res.food*0.15),60);S.res.lingshi-=ls;S.res.food-=fd;
  let hurt='';if(o.kind==='disciple'){const vs=disciples().filter(d=>d!==o&&!d.dead);if(vs.length){const v=pick(vs);v.hp=Math.max(1,v.hp*0.4);v.inj={k:'light',t:S.time+INJ.light.T};hurt=`，重傷了「${v.name}」`;}}
  v48Remove(o);const e=v48YaoSpawn(o,false);e.raid=null;ping(e.x,e.y,true);
  toast(`⚠ ${o.kind==='disciple'?'弟子':'流浪者'}「${o.name}」竟是妖物化形！偷走靈石 ${ls}、食物 ${fd}${hurt}，現出原形作亂！`);v48St().yHit=(v48St().yHit||0)+1;}
function scanChance(o){const p=player();if(!p)return 0;return clamp(0.20+p.realm*0.05+(p.wu||50)*0.003-(o.realm||0)*0.04,0.10,0.70);}
function v48Scan(id){const G=v48St(),p=player();const o=wandById(id)||unitById(id);if(!o||!p||p.dead){toast('找不到目標');return false;}
  if(S.time<G.scanCd){toast(`神識尚未恢復（${Math.ceil(G.scanCd-S.time)} 秒）`);return false;}
  if(dist(p.x,p.y,o.x,o.y)>12){toast('神識探查範圍 12 格：再靠近一些');return false;}
  if(S.res.lingshi<TUNE.v48scan.ls){toast(`神識探查需要靈石 ${TUNE.v48scan.ls}`);return false;}
  S.res.lingshi-=TUNE.v48scan.ls;G.scanCd=S.time+TUNE.v48scan.cd;const ch=scanChance(o);fx('ring',o.x,o.y,'#b0a0ff');
  if(rnd()>=ch){o.scanF=(o.scanF||0)+1;toast(`神識探查「${o.name}」：被一股氣息擋了回來，看不透（成功率 ${Math.round(ch*100)}%）`);panelKeyCache=null;return false;}
  if(o.yao){o.yao.rv=1;v48Remove(o);const e=v48YaoSpawn(o,true);S.res.lingshi+=8;addMat('core',1,e.x,e.y);addKarma(5,'識破妖物',e.x,e.y);G.yRv=(G.yRv||0)+1;
    toast(`神識如電，識破「${o.name}」乃妖物化形！逼其現形（虛弱 30%），得靈石 8、妖丹 1`);selOther={k:'e',id:e.id};}
  else{
    // 20261106e：探查揭露隱藏資質／潛力／靈根／特質（沒探查前顯示「？」）
    o.clean=1;o.scanned=1;
    const parts=[];try{
      const B=(typeof BODIES!=='undefined'&&BODIES[o.body])||null;
      if(B)parts.push('體質 '+B.n+(B.rar?('・'+B.rar):''));
      if(o.wu!=null)parts.push('悟性 '+o.wu);
      if(o.xy!=null)parts.push('仙緣 '+o.xy);
      if(o.luck!=null)parts.push('氣運 '+o.luck);
      if(o.lg)parts.push((typeof lgName==='function'?lgName(o.lg):'靈根'));
      else parts.push('無靈根');
      if(typeof isXW==='function'&&isXW(o))parts.push('✦ 仙武之體');
      const pot=o.wu>=85?'天資卓越':o.wu>=70?'上品潛力':o.wu>=50?'中品潛力':'凡品潛力';
      o.scanPot=pot;parts.push(pot);
    }catch(e){}
    o.scanInfo=parts.join('、')||'身家清白';
    toast(`神識探查「${o.name}」：${o.scanInfo}`);
  }
  panelKeyCache=null;return true;}
function scanBtn(o){const G=S.flags.v48||{},cd=Math.max(0,Math.ceil((G.scanCd||0)-S.time));
  if(o.clean||o.scanned)return `<span class="tg" style="color:#9fe8b0">✔ 已探查：${o.scanInfo||'凡人'}</span>`;
  return `<button class="btn" data-v48scan="${o.id}" title="成功率依你的境界與悟性；成功後揭露隱藏資質">🔍 神識探查（靈石 ${TUNE.v48scan.ls}｜${Math.round(scanChance(o)*100)}%${cd?`｜${cd} 秒`:''}）</button>`;}
{const _wp=wandPanel;wandPanel=function(o){let h=_wp(o);try{h+=`<div class="jobs">${scanBtn(o)}</div>`;}catch(e){}return h;};}
{const _x=spawnBatch;spawnBatch=function(b,opt){const n=_x(b,opt);try{if(S.time>600&&rnd()<0.12){const cs=S.cands.filter(c=>c.bid===b.id&&!isXW(c));if(cs.length)v48MakeYao(pick(cs));}}catch(e){}return n;};}

// ======================= 3. 拍賣會 =======================
const AUC_LOTS=[
 {k:'lz',n:'千年靈芝 ×2',p:24,give:()=>addMat('lingzhi',2)},
 {k:'xt',n:'玄鐵 ×2',p:34,give:()=>addMat('xuantie',2)},
 {k:'core',n:'妖丹 ×4',p:16,give:()=>addMat('core',4)},
 {k:'tp',n:'上品突破丹',p:28,give:()=>addPill('tp',2,1)},
 {k:'xs',n:'中品洗髓丹',p:32,give:()=>addPill('xs',1,1)},
 {k:'rec',n:'殘缺丹方',p:22,ok:()=>RREC_ORDER.some(k=>!S.recipes[k]),give:()=>learnRecipe(null,'拍賣會')},
 {k:'miji',n:'武學秘籍',p:36,give:()=>{S.items.miji++;}},
 {k:'gf',n:'上古功法',p:60,give:()=>{S.items.gongfa=(S.items.gongfa||0)+1;}},
 {k:'gear',n:'靈器兵刃',p:48,give:()=>addItem(makeItem(pick(['sword','saber','spear','fist']),3,ri(0,4)))},
 {k:'xfl',n:'仙凡令',p:90,ok:()=>{const p=player();return p&&p.realm>=3&&p.realm<4;},give:()=>{S.items.xfl=(S.items.xfl||0)+1;}}];
const NPC_NAMES=['青雲門長老','天魔宗護法','萬寶樓掌櫃','散修老祖','赤霞谷少主','百草堂主','玄冰宮執事','鐵劍山莊莊主'];
function aucStart(force){const G=v48St();const p=player(),pr=p?p.realm:0;const pool=AUC_LOTS.filter(L=>!L.ok||L.ok());const lots=[];
  for(let k=0;k<3&&pool.length;k++){const L=pool.splice(ri(0,pool.length-1),1)[0];const m=1+0.15*Math.min(4,pr);const nn=ri(2,4),names=NPC_NAMES.slice().sort(()=>rnd()-0.5);
    lots.push({k:L.k,n:L.n,base:Math.round(L.p*m),price:Math.round(L.p*m*0.6),lead:0,done:null,pr:0,ins:0,npcs:Array.from({length:nn},(_,i)=>({n:names[i],r:clamp(pr+ri(-2,2),0,7),max:Math.round(L.p*m*(0.75+rnd()*0.85)),out:0,seen:0}))});}
  G.auc={t0:S.time,end:S.time+300,cur:0,lots,log:['拍賣會開槌！']};G.nA++;G.aT=S.time+900;
  v47Banner('v48auc',{txt:'🔔 萬寶樓拍賣會開始了！（5 分鐘內有效）｜點擊參加',cls:'gold',ttl:300,click:()=>v48Open('auc')});snd('ready');return G.auc;}
function aucLot(){const A=S.flags.v48&&S.flags.v48.auc;if(!A)return null;return A.lots[A.cur]||null;}
function aucAlive(L){return L.npcs.filter(n=>!n.out);}
function aucLog(s){const A=S.flags.v48.auc;A.log.unshift(s);if(A.log.length>8)A.log.length=8;}
function aucNpcTurn(L){// 玩家領先時，NPC 依上限決定跟不跟
  const need=Math.ceil(L.price*1.08)+1;for(const n of aucAlive(L))if(n.max<need){n.out=1;aucLog(`${n.n}搖頭退出`);}
  const al=aucAlive(L);if(!al.length){aucWin(L);return;}
  const n=pick(al);const bid=Math.min(n.max,need+ri(0,Math.max(1,Math.round(L.base*0.08))));L.price=bid;L.lead=L.npcs.indexOf(n)+1;aucLog(`${n.n}出價 ${bid}`);}
function aucWin(L){const A=S.flags.v48.auc;if(S.res.lingshi<L.price){L.done='npc';aucLog(`靈石不足，流標`);aucNext();return;}
  S.res.lingshi-=L.price;const D=AUC_LOTS.find(x=>x.k===L.k);try{D.give();}catch(e){}L.done='p';aucLog(`🎉 你以 ${L.price} 靈石拍下「${L.n}」`);toast(`拍得「${L.n}」！花費靈石 ${L.price}`);snd('perfect');aucNext();}
function aucNext(){const A=S.flags.v48.auc;A.cur++;if(A.cur>=A.lots.length){aucLog('拍賣會圓滿結束');A.over=1;v47BannerOff('v48auc');}}
function aucAct(a,arg){const A=S.flags.v48&&S.flags.v48.auc,L=aucLot();if(!A||A.over||!L){toast('目前沒有拍賣會');return false;}const p=player();
  if(a==='small'||a==='big'){const np=a==='small'?Math.ceil(L.price*1.1)+1:Math.ceil(L.price*1.3)+2;if(L.lead===-1){toast('你已是最高出價');return false;}
    if(S.res.lingshi<np){toast(`靈石不足（需 ${np}）`);return false;}L.price=np;L.lead=-1;aucLog(`你出價 ${np}`);
    if(a==='big')for(const n of aucAlive(L))if(n.max<np*1.15&&rnd()<0.5){n.out=1;aucLog(`${n.n}被大手筆嚇退`);}
    aucNpcTurn(L);return true;}
  if(a==='press'){if(L.pr){toast('本件已施展過靈力威壓');return false;}L.pr=1;const pr=p?p.realm:0;let k=0;
    for(const n of aucAlive(L)){if(n.r<pr){if(rnd()<0.5+0.15*(pr-n.r-1)){n.out=1;k++;aucLog(`${n.n}（${REALMS[n.r].n}）受不住威壓，退出`);}}else{n.max=Math.round(n.max*1.1);aucLog(`${n.n}（${REALMS[n.r].n}）冷笑，抬高心理價位`);}}
    addKarma(-1,'拍賣會恃強凌弱');if(!aucAlive(L).length&&L.lead===-1)aucWin(L);else if(!aucAlive(L).length){L.lead=-1;aucWin(L);}return true;}
  if(a==='insight'){const n=L.npcs[+arg];if(!n||n.out||n.seen){return false;}if(S.res.lingshi<2){toast('洞察需要靈石 2');return false;}S.res.lingshi-=2;
    const ch=clamp(0.5+((p?p.realm:0)-n.r)*0.12+((p&&p.wu)||50)*0.003,0.15,0.95);if(rnd()<ch){n.seen=1;aucLog(`洞察：${n.n}心理價位約 ${n.max}`);}else{n.seen=-1;aucLog(`洞察${n.n}失敗（被察覺）`);}return true;}
  if(a==='pass'){L.done='npc';const n=L.lead>0?L.npcs[L.lead-1]:aucAlive(L)[0];aucLog(`你放棄，「${L.n}」由${n?n.n:'他人'}以 ${L.price} 拍走`);aucNext();return true;}
  return false;}
function aucTick(){const G=v48St();if(G.auc&&!G.auc.over&&S.time>G.auc.end){G.auc.over=1;v47BannerOff('v48auc');}
  if(S.time>=G.aT&&!S.dg)aucStart();}

// ======================= 4. 比武大會 =======================
const TOUR_FAC=['青雲門','天魔宗','赤霞谷','玄冰宮','鐵劍山莊','百草堂','萬劍宗','合歡派'];
function tourPow(u){return u.atk*Math.sqrt(u.maxhp)*(1+0.08*(u.realm||0))*(1+0.04*(u.sub||0))*(injOf(u)?1-injOf(u).atk:1);}
function tourStart(){const G=v48St();G.tour={t0:S.time,end:S.time+300,res:null,pick:[]};G.nT++;G.tT=S.time+1200;
  v47Banner('v48tour',{txt:'⚔ 比武大會開放報名！（5 分鐘內）｜點擊派弟子參賽',cls:'gold',ttl:300,click:()=>v48Open('tour')});snd('ready');return G.tour;}
function tourAuto(){return disciples().filter(u=>!u.dead).sort((a,b)=>tourPow(b)-tourPow(a)).slice(0,3).map(u=>u.id);}
function tourRun(ids){const G=v48St(),T=G.tour;if(!T||T.res){toast('目前沒有比武大會');return false;}
  ids=(ids&&ids.length?ids:tourAuto()).map(id=>unitById(+id)).filter(u=>u&&u.kind==='disciple'&&!u.dead).slice(0,3);if(!ids.length){toast('沒有可參賽的弟子');return false;}
  const top=Math.max(...ids.map(u=>u.realm||0));const fs=ids.map(u=>({id:u.id,n:u.name,f:'本宗',r:u.realm,pw:tourPow(u),me:1}));
  const facs=TOUR_FAC.slice().sort(()=>rnd()-0.5);
  for(let k=0;fs.length<8;k++){const d=makeDisciple(0,0,ri(0,Math.max(0,BODIES.length-2)));const rl=clamp(top+ri(-1,1)-(k<2?0:1),0,7);applyRealmStats(d,rl);fs.push({n:d.name,f:facs[k%facs.length],r:rl,pw:tourPow(d)*(0.85+rnd()*0.3)});}
  for(let i=fs.length-1;i>0;i--){const j=ri(0,i);[fs[i],fs[j]]=[fs[j],fs[i]];}
  const rounds=[];let cur=fs;const RN=['八強','四強','決賽'];
  while(cur.length>1){const nx=[],ms=[];for(let i=0;i<cur.length;i+=2){const a=cur[i],b=cur[i+1];const pa=a.pw*a.pw,pb=b.pw*b.pw;const w=rnd()<pa/(pa+pb)?a:b,l=w===a?b:a;nx.push(w);ms.push({a:`${a.f}・${a.n}`,b:`${b.f}・${b.n}`,w:`${w.f}・${w.n}`,me:!!(a.me||b.me),mw:!!w.me});
      if(l.me){const u=unitById(l.id);if(u&&rnd()<0.3){u.inj={k:'light',t:S.time+INJ.light.T};}}if(w.me){const u=unitById(w.id);if(u)gainXiu(u,needXiu(u)*0.15/TUNE.xiuMul);}}
    rounds.push({n:RN[rounds.length]||'',ms});cur=nx;}
  const champ=cur[0];const best=fs.filter(f=>f.me).map(f=>{let w=0;for(const r of rounds)for(const m of r.ms)if(m.mw&&m.w.endsWith('・'+f.n))w++;return w;});const wins=Math.max(...best);
  const rw={};let msg;
  if(champ.me){rw.lingshi=45;const it=makeItem(pick(GEAR_ORDER.slice(0,8)),ri(2,3),ri(0,4));addItem(it);relAll(8);addKarma(3,'比武奪魁');msg=`本宗「${champ.n}」技壓群雄，奪得比武大會魁首！靈石 45、${itemName(it)}，各村關係 +8`;}
  else if(wins>=2){rw.lingshi=20;relAll(4);msg=`本宗弟子闖進決賽，屈居亞軍：靈石 20，各村關係 +4`;}
  else if(wins>=1){rw.lingshi=8;msg=`本宗弟子止步四強：靈石 8`;}
  else{rw.lingshi=2;msg='本宗弟子首輪落敗……（參賽獎靈石 2）';}
  for(const k in rw)S.res[k]+=rw[k];T.res={rounds,champ:`${champ.f}・${champ.n}`,msg,me:champ.me?1:0};v47BannerOff('v48tour');toast(msg);if(champ.me)snd('break');return T.res;}
function tourTick(){const G=v48St();if(G.tour&&!G.tour.res&&S.time>G.tour.end){G.tour.res={rounds:[],champ:'（未參賽）',msg:'本屆比武大會宗門未派人參加',me:0,skip:1};v47BannerOff('v48tour');}
  if(S.time>=G.tT&&!S.dg)tourStart();}

// ======================= 面板：宗門大事（聲望／拍賣會／比武） =======================
function v48Html(){const G=v48St(),k=G.k,P=KPATH[karmaPath(k)],tab=V48.tab;
  let h=`<button class="btn x" data-v48="close">✖</button><h3>⚖ 宗門大事</h3><div class="ptabs">${[['karma','聲望'],['auc','拍賣會'],['tour','比武大會']].map(([t,n])=>`<button class="btn ${t===tab?'on':''}" data-v48tab="${t}">${n}</button>`).join('')}</div>`;
  if(tab==='karma'){const pct=(k+100)/2;
    h+=`<div class="sec"><b class="sdl" style="color:${P.col}">${P.ic} ${P.n}　${karmaTxt(k)}</b><div class="v48kbar"><i style="left:${pct}%"></i></div><div class="dim sm">魔 100 ←　散修　→ 正 100</div>
      ${KPERK.map(x=>`<span class="tg" style="${perkOn(x.id)?'color:#ffe27a':'opacity:.55'}">${perkOn(x.id)?'✔':'🔒'} ${x.n}：${x.d}${x.p!=='san'?`（${x.p==='zheng'?'正':'魔'} ${x.need}）`:'（散修）'}</span>`).join('')}
      <details class="dt"><summary>詳情</summary>行善（剿滅山賊、攻破山寨、完成委託、接濟流浪者、擊退襲擊、識破妖物）增加「正」；作惡（強徵、掠奪村莊、殺害村勇、逐出弟子、拍賣會威壓）增加「魔」。正道：各村關係慢慢回升到 40；魔道：各村關係慢慢下滑，魔 ≥40 時會有賞金獵人定期上門討伐（擊殺得靈石）。介於兩者之間為散修。</details></div>
      <div class="sec"><b>最近</b><br>${G.log.length?G.log.slice(0,8).map(l=>`<span class="tg" style="color:${l.d>0?'#9fe8ff':'#ff9a9a'}">${l.why} ${l.d>0?'正':'魔'}+${Math.abs(l.d)}</span>`).join(''):'<span class="dim">尚無</span>'}</div>`;}
  else if(tab==='auc'){const A=G.auc,L=aucLot();
    if(!A||A.over){h+=`<div class="sec"><b class="sdl">萬寶樓拍賣會：約 ${Math.max(0,Math.ceil((G.aT-S.time)/300*10)/10)} 天後開槌</b><br><span class="tg">每 3 天一次</span><span class="tg">付靈石</span><span class="tg">你的靈石 ${Math.floor(S.res.lingshi)}</span>${A&&A.log?`<details class="dt"><summary>上一場紀錄</summary>${A.log.map(esc).join('<br>')}</details>`:''}</div>`;}
    else{const al=aucAlive(L);h+=`<div class="sec"><b class="sdl">第 ${A.cur+1}/${A.lots.length} 件：${L.n}</b><br><span class="tg">底價 ${Math.round(L.base*0.6)}</span><span class="tg" style="color:#ffe27a">目前 ${L.price}</span><span class="tg">${L.lead===-1?'你領先':L.lead>0?L.npcs[L.lead-1].n+'領先':'—'}</span><span class="tg">你的靈石 ${Math.floor(S.res.lingshi)}</span><span class="tg">剩 ${Math.ceil(A.end-S.time)} 秒</span>
      <table class="v47t">${L.npcs.map((n,i)=>`<tr class="${n.out?'dim':''}"><td>${n.n}</td><td>${REALMS[n.r].n}</td><td>${n.out?'已退出':n.seen===1?`心理價位 ${n.max}`:n.seen===-1?'看不透':`<button class="btn" data-v48auc="insight" data-i="${i}">👁 洞察（靈石 2）</button>`}</td></tr>`).join('')}</table>
      <div class="jobs"><button class="btn pri" data-v48auc="small">小加價 → ${Math.ceil(L.price*1.1)+1}</button><button class="btn" data-v48auc="big">大加價 → ${Math.ceil(L.price*1.3)+2}</button><button class="btn ${L.pr?'dis':''}" data-v48auc="press">💢 靈力威壓</button><button class="btn warn" data-v48auc="pass">放棄此件</button></div>
      <details class="dt"><summary>詳情</summary>小加價 +10%；大加價 +30%，有機會嚇退心理價位接近的對手。靈力威壓：境界低於你的對手可能直接退出，境界不低於你的反而抬價（每件一次，魔 +1）。洞察：依境界與悟性看穿對手的心理價位。沒人再跟價時由最高出價者得標。</details>
      <div class="dim sm">${A.log.slice(0,5).map(esc).join('<br>')}</div></div>`;}}
  else if(tab==='tour'){const T=G.tour;
    if(T&&!T.res){const ds=disciples().filter(u=>!u.dead).sort((a,b)=>tourPow(b)-tourPow(a));const pk=T.pick&&T.pick.length?T.pick:tourAuto();
      h+=`<div class="sec"><b class="sdl">比武大會報名中（剩 ${Math.ceil(T.end-S.time)} 秒）</b><br><span class="tg">最多 3 人</span><span class="tg">八強淘汰賽</span><span class="tg">魁首：靈石 45＋精品以上兵器＋各村關係</span>
        <div>${ds.slice(0,12).map(u=>`<label class="v48pick"><input type="checkbox" data-v48tp="${u.id}" ${pk.includes(u.id)?'checked':''}> ${esc(u.name)}・${realmName(u)}・戰力 ${Math.round(tourPow(u))}</label>`).join('')||'<span class="dim">沒有弟子</span>'}</div>
        <div class="jobs"><button class="btn pri" data-v48="tgo">⚔ 開賽</button></div><details class="dt"><summary>詳情</summary>自動對戰：雙方戰力（攻擊、氣血、境界）比較後擲骰，強者勝率高但不是必勝。每贏一場修為 +15%；落敗有 30% 機會輕傷。</details></div>`;}
    else{h+=`<div class="sec"><b class="sdl">下一屆比武大會：約 ${Math.max(0,Math.ceil((G.tT-S.time)/300*10)/10)} 天後</b><br><span class="tg">每 4 天一次</span><span class="tg">已舉辦 ${G.nT} 屆</span></div>`;
      if(T&&T.res&&!T.res.skip){h+=`<div class="sec"><b>${T.res.me?'🏆 ':''}${esc(T.res.msg)}</b><details class="dt" open><summary>賽程</summary>${T.res.rounds.map(r=>`<b>${r.n}</b><br>${r.ms.map(m=>`<span class="${m.me?'':'dim'}">${esc(m.a)} vs ${esc(m.b)} → <b style="color:${m.mw?'#ffe27a':m.me?'#ff9a8a':'inherit'}">${esc(m.w)}</b></span>`).join('<br>')}`).join('<br>')}</details></div>`;}}}
  return h;}
function v48Render(force){const el=document.getElementById('v48dlg');if(!el||!V48.open)return;const h=v48Html();if(force||el._h!==h){const d=[...el.querySelectorAll('details')].map(x=>x.open);const sc=el.scrollTop;el._h=h;el.innerHTML=h;el.querySelectorAll('details').forEach((x,i)=>{if(d[i])x.open=true;});el.scrollTop=sc;}}
function v48Open(tab){if(tab)V48.tab=tab;V48.open=true;const el=document.getElementById('v48dlg');if(el){el.classList.add('open');v48Render(true);}}
function v48Close(){V48.open=false;const el=document.getElementById('v48dlg');if(el)el.classList.remove('open');}

// ======================= 8. 字體大小 =======================
const FS_OPT=[['s','小',0.88],['m','中',1],['l','大',1.15],['xl','特大',1.3]];
function fsKey(){try{return localStorage.getItem('xw_fs')||'m';}catch(e){return 'm';}}
function fsScale(){const o=FS_OPT.find(x=>x[0]===fsKey());return o?o[2]:1;}
function fsConvert(){const conv=rules=>{for(const r of rules){if(r.cssRules&&!r.selectorText){try{conv(r.cssRules);}catch(e){}continue;}if(!r.style||V48.fsDone.has(r))continue;V48.fsDone.add(r);
    const f=r.style.fontSize;const m=/^([\d.]+)px$/.exec(f||'');if(m){const pr=r.style.getPropertyPriority('font-size');r.style.setProperty('font-size',`calc(${m[1]}px * var(--xwfs, 1))`,pr);}}};
  for(const sh of document.styleSheets){if(sh.ownerNode&&sh.ownerNode.id==='v48fsbase')continue;try{conv(sh.cssRules);}catch(e){}}}
function fsApply(k){if(k){try{localStorage.setItem('xw_fs',k);}catch(e){}}const s=fsScale();document.documentElement.style.setProperty('--xwfs',String(s));document.body.classList.toggle('fsbig',s>1.05);document.body.classList.toggle('fsxl',s>1.2);fsConvert();
  if(typeof panelKeyCache!=='undefined')panelKeyCache=null;if(typeof resize==='function')try{resize();}catch(e){}}
{const _os=openSettings;openSettings=function(){_os();const el=document.getElementById('settings');if(!el)return;const k=fsKey();
  const row=document.createElement('div');row.className='trow';row.innerHTML=`<span>字體大小</span><span>${FS_OPT.map(o=>`<button class="btn ${o[0]===k?'pri':''}" data-v48fs="${o[0]}">${o[1]}</button>`).join('')}</span>`;
  const h=el.querySelector('h3');if(h)h.insertAdjacentElement('afterend',row);else el.appendChild(row);};}

// ======================= 週期與注入 =======================
function v48Tick(dt){V48.t+=dt;if(V48.t<1)return;const st=V48.t;V48.t=0;if(v48Client())return;const G=v48St();
  try{v48StatWatch();}catch(e){}
  G.dT=(G.dT||0)+st;if(G.dT>=30){G.dT=0;v48KarmaDrift();}
  if(karma()<=TUNE.v48.bhK&&S.time>=G.bhT){G.bhT=S.time+TUNE.v48.bhEvery*(0.8+rnd()*0.5);if(rnd()<0.25)v48Bounty();}
  else if(S.time>=G.bhT)G.bhT=S.time+60;
  aucTick();tourTick();v48YaoTick();}
{const _tk=tickV045;tickV045=function(dt){_tk(dt);try{v48Tick(dt);}catch(e){console.warn(e);}};}
function v48Hud(){const p=player();let el=document.getElementById('v48cb');if(el){const h=p?comboHtml(p):'';if(el._h!==h){el._h=h;el.innerHTML=h;el.style.display=h?'block':'none';}}
  const kb=document.getElementById('b_v48');if(kb&&S&&S.flags){const P=KPATH[karmaPath()];const t=P.ic+(isTouchUI?'':P.n);if(kb._t!==t){kb._t=t;kb.textContent=t;kb.style.color=P.col;kb.title=`宗門大事（${P.n} ${karmaTxt()}）`;}}}
{const _fv=frameV045;frameV045=function(dt){_fv(dt);try{V48.ut-=dt;if(V48.ut<=0){V48.ut=0.3;v48Hud();if(V48.open)v48Render();}}catch(e){console.warn(e);}};}
{const _ue=unitExtraHtml;unitExtraHtml=function(u){let h=_ue(u);try{h=toxHtml(u)+(comboHtml(u)?`<div>連招：${comboHtml(u)}</div>`:'')+(u.kind==='player'?`<div>聲望：<b style="color:${KPATH[karmaPath()].col}">${KPATH[karmaPath()].n} ${karmaTxt()}</b></div>`:'')+h;}catch(e){}return h;};}
// 讀檔／新遊戲：補預設欄位
{const _as=applySave;applySave=function(d){const r=_as.apply(this,arguments);if(r&&S)try{v48St();for(const u of S.units)if(u.tox==null)u.tox=0;}catch(e){}return r;};}
{const _ng=newGame;newGame=function(){const r=_ng.apply(this,arguments);try{v48St();}catch(e){}return r;};}

// 系統介紹
SYS_TXT.push(
 ['秘境撤離','秘境戰利品要「帶出去」才算數',()=>'在副本中撿到的東西都先算「未帶出」（畫面上方顯示）。走回撤離陣、通關後的出口傳送陣，或按「撤離 (X)」原地引導 5 秒（不能移動、受傷會中斷）即可帶走全部。你倒下全隊被傳出時，只能搶出約 20% 的資源與材料，秘籍、功法、仙凡令全部遺失。<details class="dt"><summary>詳情</summary>散修路線的「逍遙遊」讓引導縮短為 3.5 秒。打不過就趁早撤，別貪。</details>'],
 ['正魔聲望','宗門行事決定你是正道、魔道或散修',()=>KPERK.map(x=>`<span class="tg">${x.n}：${x.d}</span>`).join('')+'<details class="dt"><summary>詳情</summary>剿匪、攻破山寨、完成委託、接濟流浪者、擊退襲擊、識破妖物 → 正；強徵、掠奪村莊、殺害村勇、逐出弟子 → 魔。正道讓各村關係慢慢回升，魔道則慢慢下滑，魔 ≥40 會招來賞金獵人。頂欄 ☯／☠／☁ 按鈕可查看。</details>'],
 ['拍賣會','每 3 天一次，用靈石競拍稀有材料',()=>'<span class="tg">小加價 +10%</span><span class="tg">大加價 +30%</span><span class="tg">靈力威壓：嚇退境界較低的買家</span><span class="tg">洞察：看穿對手心理價位</span><details class="dt"><summary>詳情</summary>拍品從靈芝、玄鐵、妖丹、上品突破丹、洗髓丹、丹方、秘籍、功法、靈器兵刃中抽 3 件；宗師時可能出現仙凡令。開槌後 5 分鐘內有效，頂欄「宗門大事」或橫幅可進入。</details>'],
 ['比武大會','每 4 天一次，派弟子與各派高手過招',()=>'<span class="tg">最多 3 人</span><span class="tg">八強淘汰</span><span class="tg">魁首：靈石 45＋兵器＋各村關係 +8</span><details class="dt"><summary>詳情</summary>自動對戰，戰力高勝率高但有變數。每贏一場修為 +15%，落敗可能輕傷。報名期 5 分鐘。</details>'],
 ['丹毒火候','煉丹分文火、武火、收丹三段',()=>'丹爐的金色區會隨階段移動（文火偏左、武火偏右、收丹居中），三次都抓準時有 50% 機會「丹紋」提升一品。<details class="dt"><summary>詳情</summary>每服一顆丹藥累積丹毒，藥效 ×(1 − 丹毒×0.8)；≥50% 修煉變慢，≥80% 攻擊下降並可能反噬。丹毒每秒消退 0.3%，角色面板可查看。</details>'],
 ['功法連招','同屬性技能連續施放 3 次觸發共鳴',()=>'技能有五行屬性（法術依靈根；衝鋒、御劍屬金，橫掃、金丹威壓屬土，護體屬水，火球屬火；兵器若有五行則以兵器為準）。8 秒內連續施放同屬性技能會疊層，滿 3 層爆發「共鳴」：範圍傷害，並依屬性附加治療、護盾、擊暈或追擊。<details class="dt"><summary>詳情</summary>你的疊層顯示在畫面下方，弟子顯示在角色面板。</details>'],
 ['神識辨妖','流浪者與求武台候選人中可能混著妖物',()=>`<span class="tg">神識探查：靈石 ${TUNE.v48scan.ls}、冷卻 ${TUNE.v48scan.cd} 秒、12 格內</span><span class="tg">成功率依你的境界與悟性</span><details class="dt"><summary>詳情</summary>沒被識破的妖物過一陣子會偷走靈石與食物、打傷弟子後現形作亂（收進門的也一樣）。識破可得靈石、妖丹與正道聲望，並逼妖物以虛弱之姿現形。</details>`],
 ['字體大小','設定裡可選 小／中／大／特大',()=>'暫停畫面「⚙ 設定」→「字體大小」。會調整所有介面文字，存在本機，下次開啟自動套用。'],
 ['頭像列','左上的弟子列可拖曳、收合、隱藏',()=>'<span class="tg">點隊伍＝選取</span><span class="tg">連點＝鏡頭移過去</span><span class="tg">＋編入→點隊伍＝存入</span><details class="dt"><summary>詳情</summary>拖曳左側握把可移動，放開時貼齊螢幕邊緣；「◂ 收合」縮成一個小按鈕。設定裡可隱藏、切換精簡／標準大小、調整透明度，或「重置位置」。頭像：點＝選取、連點＝定位、長按或右鍵＝派工；隊伍長按或右鍵也能直接編入。</details>']);

function initV048(){
  const st=document.createElement('style');st.id='v48css';st.textContent=`
#v48dlg{position:fixed;z-index:70;right:8px;top:calc(var(--tb,44px) + 8px);width:min(460px,96vw);max-height:calc(100vh - var(--tb,44px) - 24px);overflow:auto;background:#1d1710f5;border:1px solid #8a6a3a;border-radius:10px;padding:10px 12px;color:#e8dcc0;display:none;font-size:13px;line-height:1.5;-webkit-overflow-scrolling:touch;touch-action:pan-y}
#v48dlg.open{display:block}#v48dlg h3{margin:0 0 6px}#v48dlg .x{float:right}#v48dlg .ptabs{display:flex;gap:4px;flex-wrap:wrap;margin-bottom:6px}#v48dlg .sec{margin:6px 0;padding:6px;border:1px solid #4a3a26;border-radius:6px}
#v48dlg .jobs{display:flex;flex-wrap:wrap;gap:4px;margin-top:6px}.v48pick{display:block;margin:2px 0;cursor:pointer}
.v48kbar{position:relative;height:10px;border-radius:5px;margin:6px 0 2px;background:linear-gradient(90deg,#a02020,#5a4a3a 50%,#2a7ab0)}.v48kbar i{position:absolute;top:-3px;width:4px;height:16px;margin-left:-2px;background:#fff;border-radius:2px;box-shadow:0 0 4px #000}
.v48tox{display:inline-block;width:70px;height:8px;background:#3a2a1a;border-radius:4px;vertical-align:middle;overflow:hidden}.v48tox i{display:block;height:100%}
#v48dgl{white-space:normal;margin-top:2px;font-size:12px}#v48dgl .tg{margin:0 2px}.v48chb{height:6px;margin-top:3px}
#v48cb{position:fixed;left:50%;transform:translateX(-50%);bottom:calc(var(--bb,0px) + 120px);z-index:9;display:none;pointer-events:none;background:#120c08d0;border:1px solid #ffd34d;border-radius:14px;padding:2px 12px;color:#ffe9a0;font-weight:bold;font-size:14px;letter-spacing:2px}
.v48cbx{color:#ffe9a0;font-weight:bold;letter-spacing:1px}
body.fsbig #v47pause .pmenu{min-width:170px}body.fsxl .btn{min-height:30px}body.fsxl #dghud{white-space:normal}`;document.head.appendChild(st);
  const base=document.createElement('style');base.id='v48fsbase';base.textContent='body{font-size:calc(14px * var(--xwfs, 1))}button,input,select,textarea{font-size:calc(13px * var(--xwfs, 1))}';document.head.insertBefore(base,document.head.firstChild);
  const dl=document.createElement('div');dl.id='v48dlg';dl.className='ui scroll';document.body.appendChild(dl);
  const cb=document.createElement('div');cb.id='v48cb';cb.className='ui';document.body.appendChild(cb);
  const bp=document.getElementById('b_pause');const rb=bp||document.getElementById('b_roster');if(rb&&!document.getElementById('b_v48')){const b=document.createElement('button');b.className='btn tbtn';b.id='b_v48';b.textContent='☁';b.title='宗門大事';rb.parentElement.insertBefore(b,rb);b.addEventListener('click',()=>{if(V48.open)v48Close();else v48Open();});}
  dl.addEventListener('pointerdown',ev=>ev.stopPropagation());
  dl.addEventListener('click',ev=>{const t=ev.target;let x;ev.stopPropagation();
    if(x=t.closest('[data-v48tab]')){V48.tab=x.dataset.v48tab;v48Render(true);return;}
    if(x=t.closest('[data-v48auc]')){aucAct(x.dataset.v48auc,x.dataset.i);v48Render(true);return;}
    if(x=t.closest('[data-v48tp]')){const T=S.flags.v48&&S.flags.v48.tour;if(!T)return;const ids=[...dl.querySelectorAll('[data-v48tp]')].filter(c=>c.checked).map(c=>+c.dataset.v48tp);if(ids.length>3){x.checked=false;toast('最多派 3 名弟子');return;}T.pick=ids;return;}
    if(x=t.closest('[data-v48]')){const a=x.dataset.v48;if(a==='close')v48Close();else if(a==='tgo'){const T=S.flags.v48.tour;tourRun(T&&T.pick&&T.pick.length?T.pick:null);v48Render(true);}}});
  document.addEventListener('click',ev=>{const t=ev.target;if(!t||!t.closest)return;let x;
    if(x=t.closest('[data-v48scan]')){v48Scan(+x.dataset.v48scan);panelKeyCache=null;recKey=null;if(typeof renderRec==='function'&&recOpen)renderRec(true);return;}
    if(x=t.closest('[data-v48fs]')){fsApply(x.dataset.v48fs);openSettings();return;}});
  addEventListener('keydown',ev=>{if(ev.code==='Escape'&&V48.open&&!V47.pause){v48Close();ev.stopImmediatePropagation();ev.preventDefault();}},true);
  fsApply();setTimeout(fsConvert,400);setTimeout(fsConvert,2500);}
// 招募選單：每張候選人卡加「神識探查」
{const _rr=renderRec;renderRec=function(force){_rr(force);try{const el=document.getElementById('recmenu');if(!el||!recOpen)return;
  el.querySelectorAll('.ccard').forEach(cd=>{const t=cd.querySelector('[data-u]');const c=t&&S.cands.find(o=>o.id===+t.dataset.u);if(!c)return;let b=cd.querySelector('.v48sc');if(!b){b=document.createElement('div');b.className='v48sc';cd.appendChild(b);}const h=scanBtn(c);if(b._h!==h){b._h=h;b.innerHTML=h;}});}catch(e){console.warn(e);}};}
{const _x=XW045;XW045=function(){const o=_x();try{initV048();}catch(e){console.warn('v048 init',e);}
  Object.assign(o,{v48:{V48,get st(){return v48St();},karma,karmaPath,addKarma,perkOn,KPERK,v48Bounty,dgRetreatCh,dgLootList,alcPhase,ALC_PH,toxTier,toxHtml,v48Combo,comboHtml,
    v48MakeYao,v48YaoStrike,v48Scan,scanChance,aucStart,aucAct,aucLot,tourStart,tourRun,tourAuto,tourPow,v48Open,v48Close,v48Html,fsApply,fsScale,fsKey,FS_OPT}});return o;};}

// ======================= 9. 頭像列 #pbar 重製（可拖曳／收合／隱藏／大小／透明度） =======================
const PB_DEF={x:null,y:null,sz:'n',op:1,hide:0,col:0};
const PB_OP=[[1,'100%'],[0.85,'85%'],[0.7,'70%'],[0.5,'50%']];
const PB={key:null,asg:false,drag:null,lastTap:{k:null,t:0}};
function pbCfg(){if(PB.cfg)return PB.cfg;let c={};try{c=JSON.parse(localStorage.getItem('xw_pbar')||'{}')||{};}catch(e){c={};}PB.cfg=Object.assign({},PB_DEF,c);return PB.cfg;}
function pbSave(){try{localStorage.setItem('xw_pbar',JSON.stringify(pbCfg()));}catch(e){}}
function pbSet(k,v){pbCfg()[k]=v;pbSave();PB.key=null;pbApply();}
function pbReset(){const c=pbCfg();c.x=null;c.y=null;c.col=0;c.hide=0;pbSave();PB.key=null;pbApply();toast('頭像列已回到預設位置');}
function pbRect(id){const e=document.getElementById(id);if(!e)return null;const cs=getComputedStyle(e);if(cs.display==='none'||cs.visibility==='hidden')return null;const r=e.getBoundingClientRect();return r.width>0&&r.height>0?r:null;}
// 預設位置：頂欄下方，避開左上目標欄、右上小地圖、右側單位面板
function pbDefault(){const VW=innerWidth,VH=innerHeight;const tb=pbRect('topbar');let top=(tb?tb.bottom:44)+4,left=6,right=6;
  let ob=pbRect('objectives');const mm=pbRect('minimap'),tu=pbRect('tutbub'),dh=pbRect('dghud');
  if(tu&&tu.left<120&&tu.top<(tb?tb.bottom:44)+80&&(!ob||tu.right>ob.right||tu.bottom>ob.bottom))ob=ob?{left:Math.min(ob.left,tu.left),top:Math.min(ob.top,tu.top),right:Math.max(ob.right,tu.right),bottom:Math.max(ob.bottom,tu.bottom)}:tu;
  if(dh&&dh.top<top+30)top=Math.max(top,dh.bottom+4);
  if(isTouchUI&&VW<VH){if(ob&&ob.top<top+40)top=Math.max(top,ob.bottom+4);if(mm&&mm.top<top+150)right=Math.max(right,VW-mm.left+6);}
  else if(isTouchUI){if(ob&&ob.top<top+30&&ob.bottom<top+40)left=Math.max(left,ob.right+8);else if(ob)top=Math.max(top,ob.bottom+4);if(mm&&mm.top<top+120)right=Math.max(right,VW-mm.left+6);}
  else{top+=2;if(ob&&ob.top<top+60)left=Math.max(left,ob.right+10);right=Math.max(right,VW>=1100?448:372);}
  const mw=Math.max(200,VW-left-right);return {x:left,y:top,mw};}
function pbClamp(x,y,w,h){const tb=pbRect('topbar');const minY=(tb?tb.bottom:40)+2;const VW=innerWidth,VH=innerHeight;
  x=Math.max(2,Math.min(VW-Math.min(w,VW)-2,x));y=Math.max(minY,Math.min(VH-h-2,y));return {x,y};}
function pbApply(){const el=document.getElementById('pbar');if(!el)return;const c=pbCfg();
  el.classList.toggle('pbcmp',c.sz==='c');el.classList.toggle('pbcol',!!c.col);el.style.display=c.hide?'none':'';el.style.setProperty('--pbop',String(c.op));
  const d=pbDefault();el.style.maxWidth=(c.x==null?d.mw:Math.max(200,innerWidth-8))+'px';
  const r=el.getBoundingClientRect();const p=c.x==null?{x:d.x,y:d.y}:pbClamp(c.x,c.y,r.width||200,r.height||40);
  el.style.left=p.x+'px';el.style.top=p.y+'px';el.style.right='auto';el.style.bottom='auto';el.style.height='auto';
  if(c.x!=null){const w=r.width||200;el.style.maxWidth=Math.max(200,innerWidth-p.x-4)+'px';}
  const m=document.getElementById('pb_menu');if(m&&m.classList.contains('open'))pbMenuPos();}
function pbMenuPos(){const m=document.getElementById('pb_menu'),b=document.getElementById('pb2_ord');if(!m||!b)return;const r=b.getBoundingClientRect();m.style.position='fixed';m.style.left=Math.max(4,Math.min(innerWidth-200,r.left))+'px';
  const below=r.bottom+4;m.style.top=(below+220<innerHeight?below:Math.max(4,r.top-224))+'px';}
function pbHp(u){const f=clamp(u.hp/u.maxhp,0,1);return `<i class="hp"><i style="width:${(f*100).toFixed(0)}%;background:${f>0.5?'#5fe06a':f>0.25?'#ffb04a':'#ff5a4a'}"></i></i>`;}
// 頭像列單次 render 的索引：保留 unitById 的嚴格 ID／首筆規則，不跨更新快取。
function pbUnitLookup(units){const byId=new Map();
  for(const u of units)if(u.id===u.id&&!byId.has(u.id))byId.set(u.id,u);
  return id=>byId.get(id)||null;
}
function renderPbar48(){const el=document.getElementById('pbar');if(!el||!el.classList.contains('v48pb'))return;const c=pbCfg();if(c.hide)return;if(!PB.drag&&(PB.ap=(PB.ap||0)+1)%7===0)pbApply();
  const p=player();const ds=disciples().filter(u=>!u.dead),getUnit=pbUnitLookup(S.units);
  const key=ds.map(u=>u.id+(u.job||'')+(u.aiJob?u.aiJob.k:'')+u.realm+(selUnits.includes(u.id)?'s':'')).join(',')+'|'+S.squads.map(q=>q.filter(id=>{const u=getUnit(id);return u&&!u.dead;}).length).join(',')+'|'+(p&&selUnits.includes(p.id)?'P':'')+(PB.asg?'A':'')+c.col+c.sz;
  if(key!==PB.key){PB.key=key;
    const allSel=ds.length&&ds.every(u=>selUnits.includes(u.id));
    document.getElementById('pb2_tog').innerHTML=c.col?'👥 弟子列 ▸':'◂ 收合';
    document.getElementById('pb2_tog').title=c.col?'展開頭像列':'收合成一個小按鈕';
    document.getElementById('pb2_me').classList.toggle('on',!!(p&&selUnits.includes(p.id)));
    const ab=document.getElementById('pb2_all');ab.classList.toggle('on',!!allSel);ab.innerHTML=`全選弟子<small>${ds.length}</small>`;
    document.getElementById('pb2_sq').innerHTML=SQ_NAMES.map((n,i)=>{const k=S.squads[i].filter(id=>{const u=getUnit(id);return u&&!u.dead;}).length;
      return `<button class="btn sq2 ${k?'has':'emp'} ${PB.asg?'asg':''}" data-sq2="${i}" title="${PB.asg?`把目前選取存入「${n}隊」`:`${n}隊：點一下選取、連點兩下鏡頭移過去；${isTouchUI?'長按':'右鍵'}＝把目前選取編入此隊`}">${n}隊<small>${k}</small></button>`;}).join('');
    const ag=document.getElementById('pb2_asg');ag.classList.toggle('on',PB.asg);ag.innerHTML=PB.asg?'選一隊…':'＋編入';
    document.getElementById('pb2_list').innerHTML=ds.length?ds.map(u=>`<div class="pv2 ${selUnits.includes(u.id)?'on':''}" data-uid="${u.id}" title="${u.name}・${REALMS[u.realm].n}｜點＝選取、連點＝定位、長按＝派工"><b style="color:${BODIES[u.body].col}">${u.name[0]}</b><s>${REALMS[u.realm].n[0]}</s><em>${pbarIcon(u)}</em>${pbHp(u)}</div>`).join(''):'<span class="pbempty">尚無弟子</span>';}
  for(const d of document.getElementById('pb2_list').children){const u=getUnit(+d.dataset.uid);if(!u)continue;const f=clamp(u.hp/u.maxhp,0,1);const b=d.querySelector('.hp>i');if(b){const w=(f*100).toFixed(0)+'%';if(b.style.width!==w){b.style.width=w;b.style.background=f>0.5?'#5fe06a':f>0.25?'#ffb04a':'#ff5a4a';}}}}
function pbSelIds(ids){selUnits=ids.slice();selBuilding=null;selOther=null;panelKeyCache=null;PB.key=null;}
function pbDbl(k){const now=performance.now();const d=PB.lastTap.k===k&&now-PB.lastTap.t<380;PB.lastTap=d?{k:null,t:0}:{k,t:now};return d;}
function pbSquadClick(i){if(PB.asg){PB.asg=false;const n=selUnits.filter(id=>{const u=unitById(id);return u&&u.kind==='disciple';}).length;if(!n){toast('先選取要編隊的弟子（點頭像、框選或「全選弟子」）');PB.key=null;return;}squadSave(i);PB.key=null;return;}
  const dbl=pbDbl('sq'+i);squadSelect(i,dbl);PB.key=null;}
function initPbar48(){const old=document.getElementById('pbar');if(old)old.remove();
  const st=document.createElement('style');st.id='v48pbcss';st.textContent=`
#pbar.v48pb{position:fixed;z-index:4;display:flex;flex-wrap:wrap;align-items:center;gap:4px;height:auto;width:auto;padding:4px 6px 4px 4px;background:rgba(26,18,11,calc(0.88 * var(--pbop,1)));border:1px solid rgba(138,106,58,var(--pbop,1));border-radius:10px;box-shadow:0 3px 12px rgba(0,0,0,calc(0.5 * var(--pbop,1)));opacity:max(var(--pbop,1),0.55);transition:opacity .15s;box-sizing:border-box;pointer-events:auto}
#pbar.v48pb:hover,#pbar.v48pb.drag{opacity:1}
#pbar.v48pb #pb2_sq{display:contents}
#pbar.v48pb .grip{width:16px;align-self:stretch;min-height:30px;cursor:grab;touch-action:none;border-radius:6px;background:repeating-linear-gradient(0deg,#8a6a3a 0 2px,transparent 2px 5px);opacity:.8;flex:none}
#pbar.v48pb.drag .grip{cursor:grabbing}
#pbar.v48pb .btn{padding:2px 7px;min-height:30px;font-size:13px;white-space:nowrap;flex:none}
#pbar.v48pb .btn small{margin-left:3px;font-size:11px;color:#ffe9a0}
#pbar.v48pb .btn.on{background:#5a3a14;border-color:#ffd34d;color:#ffe9a0}
#pbar.v48pb .sq2.emp{opacity:.45;filter:grayscale(.8)}#pbar.v48pb .sq2.emp small{color:#aaa}
#pbar.v48pb .sq2.asg{animation:pbasg 1s infinite;opacity:1;filter:none}@keyframes pbasg{50%{box-shadow:0 0 8px #ffd34d}}
#pbar.v48pb #pb2_asg{color:#9fe0a0}#pbar.v48pb #pb2_asg.on{color:#ffe9a0}
#pbar.v48pb #pb2_list{display:flex;gap:4px;overflow-x:auto;overflow-y:hidden;flex:1 1 220px;min-width:160px;max-width:100%;padding:2px 2px 4px;touch-action:pan-x;-webkit-overflow-scrolling:touch;scrollbar-width:thin}
#pbar.v48pb .pv2{position:relative;flex:none;width:42px;height:42px;border-radius:8px;background:#2a2018;border:2px solid #5a4a30;cursor:pointer;box-sizing:border-box;text-align:center;user-select:none;-webkit-user-select:none}
#pbar.v48pb .pv2.on{border-color:#ffd34d;box-shadow:0 0 6px #ffd34d}
#pbar.v48pb .pv2 b{display:block;font-size:17px;line-height:26px}
#pbar.v48pb .pv2 s{position:absolute;left:2px;top:0;font-size:10px;text-decoration:none;color:#c8b48a}
#pbar.v48pb .pv2 em{position:absolute;right:0;top:-1px;font-size:11px;font-style:normal}
#pbar.v48pb .pv2 .hp{position:absolute;left:3px;right:3px;bottom:3px;height:5px;background:#1a0f08;border-radius:3px;overflow:hidden}#pbar.v48pb .pv2 .hp>i{display:block;height:100%}
#pbar.v48pb .pbempty{font-size:12px;color:#a89878;padding:0 6px}
body.touch #pbar.v48pb .pv2{width:46px;height:46px}body.touch #pbar.v48pb .pv2 b{line-height:30px}
body.touch #pbar.v48pb .btn{min-height:36px}
#pbar.v48pb.pbcmp{padding:2px 4px 2px 2px;gap:3px}#pbar.v48pb.pbcmp .btn{min-height:26px;padding:2px 6px;font-size:12px}
#pbar.v48pb.pbcmp .pv2{width:32px;height:32px}#pbar.v48pb.pbcmp .pv2 b{font-size:14px;line-height:20px}#pbar.v48pb.pbcmp .pv2 s{display:none}
body.touch #pbar.v48pb.pbcmp .pv2{width:38px;height:38px}body.touch #pbar.v48pb.pbcmp .btn{min-height:32px}
#pbar.v48pb.pbcol .pbx,#pbar.v48pb.pbcol #pb2_list,#pbar.v48pb.pbcol .sq2{display:none}
body.fsxl #pbar.v48pb .pv2{width:48px;height:48px}body.fsxl #pbar.v48pb .pv2 b{line-height:30px}
#pb_menu{max-height:calc(100vh - 20px);overflow:auto}
.ov .gauge .v48ph{position:absolute;top:-20px;transform:translateX(-50%);font-size:12px;color:#ffe27a;white-space:nowrap;pointer-events:none;transition:left .3s}.ov .gauge .zone{transition:left .3s}
`;document.head.appendChild(st);
  const pb=document.createElement('div');pb.id='pbar';pb.className='ui v48pb';
  pb.innerHTML=`<div class="grip" id="pb2_grip" title="拖曳可移動頭像列（放開時會貼齊螢幕邊緣）"></div><button class="btn" id="pb2_tog"></button>
<button class="btn pbx" id="pb2_me" title="選取自己；連點兩下鏡頭移到自己">選自己</button><button class="btn pbx" id="pb2_all" title="選取全部弟子">全選弟子</button><span id="pb2_sq" class="pbx"></span><button class="btn pbx" id="pb2_asg" title="把目前選取的弟子編入一隊：按下後再點甲／乙／丙／丁隊">＋編入</button><button class="btn pbx" id="pb2_ord" title="全體指令：全員跟隨、回宗門、集合、自主、分配">📯 指令</button><div id="pb2_list" class="scroll"></div>`;
  (document.getElementById('root')||document.body).appendChild(pb);
  // 拖曳（握把，支援觸控），放開時貼齊邊緣
  const grip=pb.querySelector('#pb2_grip');
  grip.addEventListener('pointerdown',ev=>{ev.preventDefault();ev.stopPropagation();const r=pb.getBoundingClientRect();PB.drag={id:ev.pointerId,dx:ev.clientX-r.left,dy:ev.clientY-r.top,moved:false};pb.classList.add('drag');try{grip.setPointerCapture(ev.pointerId);}catch(e){}});
  grip.addEventListener('pointermove',ev=>{const D=PB.drag;if(!D||D.id!==ev.pointerId)return;ev.preventDefault();D.moved=true;const r=pb.getBoundingClientRect();const p=pbClamp(ev.clientX-D.dx,ev.clientY-D.dy,r.width,r.height);pb.style.left=p.x+'px';pb.style.top=p.y+'px';});
  const end=ev=>{const D=PB.drag;if(!D||D.id!==ev.pointerId)return;PB.drag=null;pb.classList.remove('drag');try{grip.releasePointerCapture(ev.pointerId);}catch(e){}if(!D.moved)return;
    const r=pb.getBoundingClientRect();let x=r.left,y=r.top;const SN=40;const tb=pbRect('topbar');const minY=(tb?tb.bottom:40)+2;
    if(x<SN)x=4;if(innerWidth-r.right<SN)x=innerWidth-r.width-4;if(y-minY<SN)y=minY+4;if(innerHeight-r.bottom<SN)y=innerHeight-r.height-4;
    const c=pbCfg();c.x=Math.round(x);c.y=Math.round(y);pbSave();pbApply();};
  grip.addEventListener('pointerup',end);grip.addEventListener('pointercancel',end);
  ['pointerdown','touchstart','mousedown','wheel'].forEach(t=>pb.addEventListener(t,ev=>ev.stopPropagation(),{passive:true}));
  pb.addEventListener('contextmenu',ev=>{ev.preventDefault();const b=ev.target.closest('[data-sq2]');if(b){PB.asg=false;squadSave(+b.dataset.sq2);PB.key=null;}
    const d=ev.target.closest('.pv2');if(d){const u=unitById(+d.dataset.uid);if(u){pbSelIds([u.id]);showRadial(ev.clientX,ev.clientY+40,jobRadial([u]));}}});
  // 長按：頭像＝派工、隊伍＝編入
  let lp=null,lpF=false;
  pb.addEventListener('pointerdown',ev=>{const d=ev.target.closest('.pv2,[data-sq2]');if(!d||ev.button>0)return;lpF=false;clearTimeout(lp);const x=ev.clientX,y=ev.clientY;
    lp=setTimeout(()=>{lpF=true;if(d.dataset.sq2!=null){PB.asg=false;squadSave(+d.dataset.sq2);PB.key=null;if(navigator.vibrate)try{navigator.vibrate(15);}catch(e){}}
      else{const u=unitById(+d.dataset.uid);if(u){pbSelIds([u.id]);showRadial(x,y+70,jobRadial([u]));}}},480);});
  ['pointerup','pointercancel'].forEach(t=>pb.addEventListener(t,()=>clearTimeout(lp)));
  pb.querySelector('#pb2_list').addEventListener('scroll',()=>clearTimeout(lp),{passive:true});
  pb.addEventListener('click',ev=>{ev.stopPropagation();if(lpF){lpF=false;return;}const t=ev.target;let x;
    if(t.closest('#pb2_tog')){pbSet('col',pbCfg().col?0:1);return;}
    if(t.closest('#pb2_me')){const p=player();if(!p)return;if(pbDbl('me'))locateUnit(p);pbSelIds([p.id]);return;}
    if(t.closest('#pb2_all')){const ds=disciples().filter(u=>!u.dead);if(!ds.length){toast('還沒有弟子');return;}pbSelIds(ds.map(u=>u.id));if(pbDbl('all'))locateUnit(ds[0]);toast(`選取全部弟子 ${ds.length} 人`);return;}
    if(t.closest('#pb2_asg')){PB.asg=!PB.asg;PB.key=null;if(PB.asg)toast('點甲／乙／丙／丁隊，把目前選取的弟子編進去');return;}
    if(t.closest('#pb2_ord')){const m=document.getElementById('pb_menu');if(m){m.classList.toggle('open');pbMenuPos();}return;}
    if(x=t.closest('[data-sq2]')){pbSquadClick(+x.dataset.sq2);return;}
    if(x=t.closest('.pv2')){const id=+x.dataset.uid,u=unitById(id);if(!u)return;if(pbDbl('u'+id)){locateUnit(u);return;}
      if(ev.shiftKey||ev.ctrlKey)pbSelIds(selUnits.includes(id)?selUnits.filter(i=>i!==id):selUnits.concat(id));else pbSelIds([id]);}});
  document.addEventListener('pointerdown',ev=>{const m=document.getElementById('pb_menu');if(m&&m.classList.contains('open')&&!ev.target.closest('#pb_menu,#pb2_ord'))m.classList.remove('open');},true);
  addEventListener('resize',()=>setTimeout(pbApply,60));
  pbApply();setTimeout(pbApply,300);setTimeout(pbApply,1500);}
renderPbar=function(){try{renderPbar48();}catch(e){console.warn(e);}};
// 設定：字體以外，再加頭像列設定
{const _os=openSettings;openSettings=function(){_os();const el=document.getElementById('settings');if(!el)return;const c=pbCfg();
  const row=document.createElement('div');row.className='trow v48pbset';
  row.innerHTML=`<span>頭像列</span><span><button class="btn ${c.hide?'':'pri'}" data-v48pb="show">顯示</button><button class="btn ${c.hide?'pri':''}" data-v48pb="hide">隱藏</button></span>`;
  const row2=document.createElement('div');row2.className='trow';row2.innerHTML=`<span>頭像列大小</span><span><button class="btn ${c.sz==='c'?'pri':''}" data-v48pb="szc">精簡</button><button class="btn ${c.sz!=='c'?'pri':''}" data-v48pb="szn">標準</button></span>`;
  const row3=document.createElement('div');row3.className='trow';row3.innerHTML=`<span>頭像列透明度</span><span>${PB_OP.map(o=>`<button class="btn ${Math.abs(c.op-o[0])<0.01?'pri':''}" data-v48pb="op${o[0]}">${o[1]}</button>`).join('')}</span>`;
  const row4=document.createElement('div');row4.className='trow';row4.innerHTML=`<span>頭像列位置</span><span><button class="btn" data-v48pb="reset">重置位置</button></span>`;
  const fsr=el.querySelector('[data-v48fs]');const anchor=fsr?fsr.closest('.trow'):el.querySelector('h3');let a=anchor;
  for(const r of [row,row2,row3,row4]){if(a)a.insertAdjacentElement('afterend',r);else el.appendChild(r);a=r;}};}
document.addEventListener('click',ev=>{const t=ev.target;if(!t||!t.closest)return;const x=t.closest('[data-v48pb]');if(!x)return;const k=x.dataset.v48pb;
  if(k==='show')pbSet('hide',0);else if(k==='hide')pbSet('hide',1);else if(k==='szc')pbSet('sz','c');else if(k==='szn')pbSet('sz','n');else if(k==='reset')pbReset();else if(k.startsWith('op'))pbSet('op',+k.slice(2));
  openSettings();});
{const _x=XW045;XW045=function(){const o=_x();try{initPbar48();}catch(e){console.warn('pbar48 init',e);}o.renderPbar=renderPbar;o.v48.pb={PB,pbCfg,pbSet,pbReset,pbApply,pbDefault,renderPbar48,squadSave};return o;};}
// 丹爐金色區跟著火候階段移動，並標示階段
{const _fv=frameV045;frameV045=function(dt){_fv(dt);try{if(!craftOpen)return;const el=document.getElementById('craft');const g=el&&el.querySelector('.gauge');if(!g)return;const b=bById(craftB);const z=g.querySelector('.zone');if(!z)return;
  let lb=g.querySelector('.v48ph');
  if(b&&b.craft&&b.type==='alchemy'){const ph=ALC_PH[alcPhase(b)];const L=((ph.c-0.12)*100).toFixed(1)+'%';if(z.style.left!==L){z.style.left=L;z.style.width='24%';}
    if(!lb){lb=document.createElement('span');lb.className='v48ph';g.appendChild(lb);}const t=`${ph.n}（第 ${alcPhase(b)+1}/3 段）`;if(lb.textContent!==t)lb.textContent=t;lb.style.left=(ph.c*100)+'%';}
  else if(lb)lb.remove();}catch(e){}};}

// 20261106e：未探查前隱藏資質顯示「？」
{const _wp=wandPanel;wandPanel=function(o){let h=_wp(o);try{if(o&&!o.clean&&!o.scanned&&!o.yao){h+='<div class="mini dim">隱藏資訊：體質？／悟性？／仙緣？／潛力？（神識探查後揭露）</div>';}}catch(e){}return h;};}
