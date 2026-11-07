// ================== v0.4.5：靈根系統（使用者規格 user_specs/linggen_spec.md）、晝夜、元素法術、村莊掠奪、動作 ==================
Object.assign(TUNE,{
  lgChance:0.3,lgChanceUp:0.25,lgChanceXY:0.2,           // 新弟子身具靈根機率：基礎／求仙台／仙緣閣
  lgW:{wei:40,zhen:32,tian:9,var:10,yin:5,guang:1.5,an:1.5,shikong:0.5,hundun:0.5}, // 靈根稀有度權重（合計 100）
  yinAwakeHp:0.15,yinAwakeCh:0.35,yinAwakeBreak:0.5,      // 隱靈根覺醒：瀕死機率／突破時機率
  wxtMul:1.8,                                              // 偽靈根「五行同修」後修煉倍率
  hundunLs:2,                                              // 混沌靈根突破靈石倍率
  dayLen:300,nightDark:0.34,                               // 一天秒數／夜晚最暗程度
  vrCd:300,vrRegen:600,vrGuard0:4,vrGuardMax:10,vrHpUp:0.2,vrAtkUp:0.15,vrRel:-15,vrRep:-6,vrRetal:0.5,vrRetalUp:0.1,vrRetalT:[100,200],vrLootUp:0.15,vrTimeout:420,
  vrLoot:{food:80,wood:50,stone:40,iron:20,herb:10,lingshi:5}
});
// 靈根表：s＝一行說明（≤20字），tags＝數值標籤，cult＝修煉倍率，brk＝突破失敗率加減（煉氣前），brkL＝煉氣後，late＝煉氣後每大境界額外屬性，spM＝法術倍率
const RT={
  none:{n:'無靈根',s:'凡人之軀，需仙緣入煉氣',tags:['修煉×1'],cult:1,brk:0,brkL:0,late:0,spM:0,col:'#c9b38a'},
  wei5:{n:'偽靈根',s:'五行俱全，前期極慢，後期渾厚',tags:['修煉×0.65','突破難','後期每境+8%'],cult:0.65,brk:0.12,brkL:0.06,late:0.08,spM:0.8,col:'#a89a80',d:'功法適應性最廣，什麼屬性都能練。修煉極慢、突破極難，但若熬到高深境界（或奇遇「五行同修」），法力渾厚遠超同階。'},
  wei4:{n:'偽靈根',s:'雜而不純，前期慢，後期厚積',tags:['修煉×0.75','突破難','後期每境+6%'],cult:0.75,brk:0.10,brkL:0.05,late:0.06,spM:0.8,col:'#a89a80',d:'四系雜靈根。可輪流施放四系法術；奇遇「五行同修」可大幅提升修煉。'},
  zhen3:{n:'真靈根',s:'資質中上，三系法術多變',tags:['修煉×1.25','三系法術'],cult:1.25,brk:-0.04,brkL:-0.02,late:0.02,spM:1,col:'#9fd0ff',d:'努力或有資源扶持，依然很有機會築基、結丹。可輪流使用三種屬性的法術。'},
  zhen2:{n:'真靈根',s:'資質中上，雙系法術靈活',tags:['修煉×1.45','雙系法術'],cult:1.45,brk:-0.07,brkL:-0.03,late:0.02,spM:1,col:'#9fd0ff',d:'雙靈根，修煉略遜天靈根。可輪流使用兩種屬性的法術。'},
  tian:{n:'天靈根',s:'修煉極快，早期幾無瓶頸',tags:['修煉×2.2','突破易','免築基/凝元丹'],cult:2.2,brk:-0.25,brkL:-0.15,late:0,spM:1.3,col:'#ffe27a',d:'單一屬性、毫無雜質。煉氣→築基、築基→金丹不需丹藥。宗門會當成接班人培養。'},
  lei:{n:'雷靈根',s:'攻擊最強，可麻痺，剋邪',tags:['修煉×2.0','攻+30%','麻痺'],cult:2.0,brk:-0.10,brkL:-0.12,late:0,spM:1.3,col:'#c8b0ff',d:'金／水異變。攻擊 +30%、12% 機率麻痺；對鬼物邪祟 ×1.5；渡雷劫（築基→金丹）失敗率再 −10%。法術「掌心雷」。'},
  bing:{n:'冰靈根',s:'控場防禦，冰封、冰盾',tags:['修煉×1.9','冰封','冰盾45%'],cult:1.9,brk:-0.08,brkL:-0.08,late:0,spM:1.3,col:'#bff4ff',d:'水／土異變。攻擊 20% 機率遲緩敵人；法術「冰封」凍住範圍敵人並張開 45% 氣血的冰盾。'},
  feng:{n:'風靈根',s:'身法無雙，閃避、風刃',tags:['修煉×1.9','速度+15%','閃避15%'],cult:1.9,brk:-0.08,brkL:-0.08,late:0,spM:1.3,col:'#a8ffd8',d:'木／土異變。移動 +15%、15% 閃避；法術「風刃」同時切三名敵人並短暫加速。'},
  du:{n:'毒靈根',s:'劇毒腐蝕，破甲持續傷',tags:['修煉×1.9','中毒','破甲+15%'],cult:1.9,brk:-0.08,brkL:-0.08,late:0,spM:1.3,col:'#9adf3a',d:'水／木異變。每次攻擊附毒（3 秒）並破甲（受傷 +15%）；法術「萬毒瘴」範圍持續毒傷，適合越級擊殺。'},
  xue:{n:'血靈根',s:'吸血續航，致命時血遁',tags:['修煉×1.9','吸血10%','血遁'],cult:1.9,brk:-0.08,brkL:-0.08,late:0,spM:1.3,col:'#ff5a6a',d:'水／火異變。攻擊吸血 10%；受到致命傷時「血遁」保命（回 30% 氣血並遁走，冷卻 120 秒）。法術「血河」。'},
  guang:{n:'光靈根',s:'淨化治癒，免疫負面，剋邪',tags:['修煉×2.4','免控','治療'],cult:2.4,brk:-0.12,brkL:-0.12,late:0.02,spM:1.4,col:'#fff3b0',d:'極陽淨化。免疫遲緩／麻痺，緩慢回血；對鬼物邪祟 ×1.4。法術「大日聖光」群體治療。'},
  an:{n:'暗靈根',s:'吞噬詛咒，黑夜戰力翻倍',tags:['修煉×2.0','夜晚攻×2','吸取'],cult:2.0,brk:-0.10,brkL:-0.10,late:0.02,spM:1.4,col:'#a58aff',d:'極陰吞噬。夜晚（戌～丑時）攻擊 ×2；法術「噬魂」吸取氣血並遲緩敵人。'},
  shikong:{n:'時空靈根',s:'瞬移裂空，加速減速',tags:['修煉×2.3','瞬移','時緩'],cult:2.3,brk:-0.12,brkL:-0.12,late:0.03,spM:1.4,col:'#e0a0ff',d:'無視地形瞬移到敵人身邊，撕開空間裂縫；周圍敵人遲緩。移動 +8%。'},
  hundun:{n:'混沌靈根',s:'五行全純，前期耗資，後期無敵',tags:['修煉×0.8→×2.9','突破靈石×2','後期每境+12%'],cult:0.8,brk:0.08,brkL:-0.05,late:0.12,spM:1.0,col:'#ffffff',d:'五行皆純。前期修煉慢、突破靈石 ×2；境界越高修煉越快（每大境界 +0.35），法術輪轉五行。'}
};
const VAR_KEYS=['lei','bing','feng','du','xue'],ZUN_KEYS=['guang','an','shikong','hundun'];
const ROOT_E={lei:0,bing:2,feng:1,du:2,xue:3,guang:3,an:2,shikong:0,hundun:0};
// (EL_COL 沿用 g12) const EL_COL_16=['#ffe9a0','#7fe07a','#6fc8ff','#ff8a3a','#c8a060'];
const EVIL={wisp:1};
function shuffleEls(n){const a=[0,1,2,3,4];for(let i=4;i>0;i--){const j=ri(0,i);[a[i],a[j]]=[a[j],a[i]];}return a.slice(0,n);}
function mkLg(g,o){o=o||{};let els,v=null,z=null;
  if(g==='wei')els=shuffleEls(rnd()<0.5?4:5);else if(g==='zhen')els=shuffleEls(rnd()<0.55?2:3);else if(g==='tian')els=shuffleEls(1);
  else if(g==='var'){v=o.v||pick(VAR_KEYS);els=[ROOT_E[v]];}else if(g==='zun'){z=o.z||'guang';els=z==='hundun'?[0,1,2,3,4]:[ROOT_E[z]];}
  const lg={g,els,v,z};lg.e=els[0];lg.q=g==='wei'?0:g==='zhen'?1:2;lg._q=lg.q;return lg;}
function rollLg(){const W=TUNE.lgW;let t=0;for(const k in W)t+=W[k];let r=rnd()*t;let key='wei';for(const k in W){r-=W[k];if(r<0){key=k;break;}}
  if(key==='yin'){const lg=mkLg('wei');lg.yin=true;lg.aw=false;lg.hid=rnd()<0.5?mkLg('tian'):mkLg('var');return lg;}
  if(ZUN_KEYS.includes(key))return mkLg('zun',{z:key});return mkLg(key);}
function lgChance(b){return Math.min(0.85,TUNE.lgChance+(b&&b.up?TUNE.lgChanceUp:0)+(hasBuilt('xianyuan')?TUNE.lgChanceXY:0));}
// 舊存檔 {e,q} → 新格式；洗髓丹提升品質（q 增加）時升級
function normLg(lg){if(!lg)return null;
  if(!lg.g){const e=lg.e||0,q=lg.q||0;if(q>=2){Object.assign(lg,{g:'tian',els:[e]});}else if(q===1){Object.assign(lg,{g:'zhen',els:[e,(e+1+ri(0,3))%5]});}else{const o=shuffleEls(5).filter(x=>x!==e);Object.assign(lg,{g:'wei',els:[e,...o.slice(0,3)]});}lg.v=null;lg.z=null;lg._q=q;}
  if(lg.q>lg._q){if(lg.g==='wei'){lg.g='zhen';lg.els=lg.els.slice(0,2);}else if(lg.g==='zhen'){lg.g='tian';lg.els=lg.els.slice(0,1);}lg.e=lg.els[0];lg._q=lg.q;}
  return lg;}
function lgEff(lg){lg=normLg(lg);if(!lg)return null;return lg.yin&&lg.aw?lg.hid:lg;}
function lgShown(lg){lg=normLg(lg);if(!lg)return null;return lg.yin&&!lg.aw?lg:lgEff(lg);}
function rkOf(lg){if(!lg)return 'none';if(lg.g==='wei')return lg.els.length>=5?'wei5':'wei4';if(lg.g==='zhen')return lg.els.length>=3?'zhen3':'zhen2';if(lg.g==='tian')return 'tian';if(lg.g==='var')return lg.v;return lg.z||'none';}
function rootKey(u){return rkOf(lgEff(u&&u.lg));}
function rootOf(u){return RT[rootKey(u)]||RT.none;}
lgName=function(lg){const L=lgShown(lg);if(!L)return '無靈根';const k=rkOf(L),R=RT[k];let n=R.n;
  if(L.g==='wei'||L.g==='zhen'||L.g==='tian')n+=`（${L.els.map(e=>LG_EL[e]).join('')}）`;
  return (lg.yin&&lg.aw?'隱・':'')+n;};
function lgTags(lg,max){const L=lgShown(lg);const R=RT[rkOf(L)];return (R.tags||[]).slice(0,max||3).map(t=>`<span class="tg">${t}</span>`).join('');}
function lgLine(lg){const L=lgShown(lg);const R=RT[rkOf(L)];return R.s;}
function rootCult(u){const k=rootKey(u),R=RT[k];if(k==='hundun')return 0.8+0.35*Math.min(u.realm,6);let m=R.cult;if((k==='wei4'||k==='wei5')&&u.lg&&u.lg.wxt)m*=TUNE.wxtMul;
  if(u.lg){const E=lgEff(u.lg);const B=BODIES[u.body].n;if((B==='火靈體'&&E.els.includes(3))||(B==='寒冰體'&&E.els.includes(2))||(B==='金剛體'&&E.els.includes(0))||(B==='風靈體'&&E.els.includes(1))||(B==='厚土體'&&E.els.includes(4)))m*=1.1;}
  return m;}
function rootApt(u,r){const E=u&&lgEff(u.lg);if(!E)return 1;const has=e=>E.els.includes(e);
  if(r==='wood'&&has(1))return 1.3;if((r==='stone'||r==='iron')&&(has(4)||has(0)))return 1.3;if((r==='food'||r==='herb'||r==='fiber')&&has(2))return 1.15;return 1;}
function isNight(){const t=S.time%TUNE.dayLen;return Math.cos(2*Math.PI*(t-12.5)/TUNE.dayLen)>0.45;}
function nightAlpha(){const t=S.time%TUNE.dayLen;const d=Math.cos(2*Math.PI*(t-12.5)/TUNE.dayLen);return clamp((d-0.2)/0.8,0,1)*TUNE.nightDark;}

// 修煉、突破
{const _cm=cultMul;cultMul=function(u){return _cm(u)*rootCult(u);};}
{const _bf=breakFail;breakFail=function(u){let f=_bf(u);const k=rootKey(u),R=RT[k];if(!u.lg)return f;f+=u.realm<4?R.brk:R.brkL;if(k==='lei'&&u.realm===5)f-=0.1;return clamp(f,u.realm<=1?0.02:0.03,0.92);};}
{const _bc=breakConds;breakConds=function(u){const c=_bc(u);const k=rootKey(u);
  if(k==='tian'&&(u.realm===4||u.realm===5)){for(const it of c.list)if(/築基丹|凝元丹/.test(it.t)&&!it.ok){it.ok=true;it.t+='　✔ 天靈根免丹';}c.ok=c.list.every(x=>x.ok);}
  if(k==='hundun'&&u.realm>=3&&u.realm<=5){const ex=hundunExtra(u);c.list.push({t:`混沌靈根：額外靈石 ${ex}（目前 ${Math.floor(S.res.lingshi)}）`,ok:S.res.lingshi>=ex+[TUNE.lianqiLs,TUNE.zhujiLs,TUNE.jindanLs][u.realm-3]});c.ok=c.list.every(x=>x.ok);}
  return c;};}
function hundunExtra(u){return Math.round([TUNE.lianqiLs,TUNE.zhujiLs,TUNE.jindanLs][u.realm-3]*(TUNE.hundunLs-1));}
{const _tb=tryBreak;tryBreak=function(u,auto){if(u&&rootKey(u)==='hundun'&&u.realm>=3&&u.realm<=5&&(u.sub||0)>=SUB_N-1){const c=breakConds(u);if(c.ok)S.res.lingshi-=hundunExtra(u);}return _tb(u,auto);};}
{const _db=doBreak;doBreak=function(u){_db(u);const R=rootOf(u);if(u.realm>=4&&R.late){let l=R.late*((u.lg&&u.lg.wxt)?1.5:1);u.maxhp=Math.round(u.maxhp*(1+l));u.atk=+(u.atk*(1+l)).toFixed(1);u.hp=u.maxhp;floater(u.x,u.y,`厚積薄發 +${Math.round(l*100)}%`,'#e0d0a0');}
  u.celebT=performance.now();u.emo={c:'🎉',t:S.time+3};
  if(u.lg&&u.lg.yin&&!u.lg.aw&&rnd()<TUNE.yinAwakeBreak)awakenYin(u,'突破');};}
function awakenYin(u,why){const lg=normLg(u.lg);if(!lg||!lg.yin||lg.aw)return false;lg.aw=true;const H=lgEff(lg);lg.e=H.els[0];lg.q=2;lg._q=2;
  fx('break',u.x,u.y,RT[rkOf(H)].col);sfxPush('burst',u.x,u.y,0,0,RT[rkOf(H)].col,1.2,2.5);u.hp=Math.max(u.hp,Math.round(u.maxhp*0.5));
  toast(`${nm(u)}${why}之際，隱藏的靈根甦醒——原來是「${lgName(lg)}」！`);floater(u.x,u.y,'靈根覺醒！','#fff3b0');u.emo={c:'❗',t:S.time+3};return true;}

// 新弟子靈根
{const _sd=spawnDisciple;spawnDisciple=function(b,o){const d=_sd(b,o);if(d&&!(o&&o.lg!==undefined)){if(d.lg&&!d.lg.g)d.lg=null;if(!d.lg&&rnd()<lgChance(b))d.lg=rollLg();}return d;};}

// ---- 元素法術（煉氣以上自動施放）----
const SPELL={0:{n:'金芒劍氣',cd:7},1:{n:'青藤縛',cd:8},2:{n:'水龍吟',cd:10},3:{n:'烈焰球',cd:7},4:{n:'岩甲術',cd:12},
  lei:{n:'掌心雷',cd:6},bing:{n:'冰封',cd:10},feng:{n:'風刃',cd:6},du:{n:'萬毒瘴',cd:9},xue:{n:'血河',cd:7},guang:{n:'大日聖光',cd:11},an:{n:'噬魂',cd:7},shikong:{n:'裂空斬',cd:7}};
const sfx=[];
function sfxPush(k,x,y,x2,y2,col,dur,r){if(sfx.length>60)sfx.shift();sfx.push({k,x,y,x2,y2,col,t:0,dur:dur||0.7,r:r||1.5});}
function foesNear(x,y,r){return S.enemies.filter(e=>!e.dead&&dist(x,y,e.x,e.y)<=r);}
function alliesNear(x,y,r){return S.units.filter(u=>!u.dead&&!u.inside&&dist(x,y,u.x,u.y)<=r);}
function spellPow(u){const k=rootKey(u);let m=RT[k].spM||1;if(k==='hundun')m=1+0.15*Math.max(0,u.realm-4);return u.atk*m;}
function spellKey(u){const k=rootKey(u),E=lgEff(u.lg);if(!E)return null;if(SPELL[k])return k;if(k==='hundun'){u.spI=((u.spI||0)+1)%5;return u.spI;}
  if(E.els.length>1){u.spI=((u.spI||0)+1)%E.els.length;return E.els[u.spI];}return E.els[0];}
function castSpell(u,e,key){const P0=spellPow(u),S0=SPELL[key];if(!S0)return false;const col=typeof key==='number'?EL_COL[key]:RT[key].col;
  faceTo(u,e.x,e.y);u.castT=performance.now();u.anim=0.4;floater(u.x,u.y-0.4,S0.n,col);
  const hit=(t,m,c)=>{if(!t.dead)dmgEnemy(u,t,P0*m,c||col);};
  switch(key){
    case 0:{const dx=e.x-u.x,dy=e.y-u.y,L=Math.hypot(dx,dy)||1,ux=dx/L,uy=dy/L;for(const t of foesNear(u.x,u.y,6.5)){const px=t.x-u.x,py=t.y-u.y,pr=px*ux+py*uy;if(pr<0||pr>6.5)continue;if(Math.abs(px*uy-py*ux)<0.9)hit(t,2.4);}sfxPush('beam',u.x,u.y,u.x+ux*6.5,u.y+uy*6.5,col,0.45);break;}
    case 1:hit(e,1.6);if(!e.dead){if(typeof xnStun==='function')xnStun(e,2,u);else e.stun=Math.max(e.stun||0,2);}sfxPush('vine',e.x,e.y,0,0,col,1.6,0.8);break;
    case 2:for(const a of alliesNear(u.x,u.y,3))a.hp=Math.min(a.maxhp,a.hp+a.maxhp*0.18);hit(e,1.2);sfxPush('heal',u.x,u.y,0,0,col,1,3);sfxPush('burst',e.x,e.y,0,0,col,0.5,0.8);break;
    case 3:for(const t of foesNear(e.x,e.y,1.8))hit(t,2.2);sfxPush('burst',e.x,e.y,0,0,col,0.6,1.8);break;
    case 4:u.shield=Math.max(u.shield||0,Math.round(u.maxhp*0.35));u.shieldT=8;hit(e,1.2);sfxPush('shield',u.x,u.y,0,0,col,0.9,1);break;
    case 'lei':hit(e,3.2);if(!e.dead){if(typeof xnStun==='function')xnStun(e,1.5,u);else e.stun=Math.max(e.stun||0,1.5);}sfxPush('bolt',e.x,e.y,0,0,col,0.5,1);break;
    case 'bing':for(const t of foesNear(e.x,e.y,1.6)){hit(t,1.6);if(!t.dead){if(typeof xnStun==='function')xnStun(t,2.5,u);else t.stun=Math.max(t.stun||0,2.5);}}u.shield=Math.max(u.shield||0,Math.round(u.maxhp*0.45));u.shieldT=8;sfxPush('ice',e.x,e.y,0,0,col,1.2,1.6);sfxPush('shield',u.x,u.y,0,0,col,0.9,1);break;
    case 'feng':{const ts=foesNear(u.x,u.y,5).sort((a,b)=>dist(u.x,u.y,a.x,a.y)-dist(u.x,u.y,b.x,b.y)).slice(0,3);for(const t of ts){hit(t,1.4);sfxPush('beam',u.x,u.y,t.x,t.y,col,0.35);}u.hasteT=S.time+3;break;}
    case 'du':for(const t of foesNear(e.x,e.y,2)){t.psn={t:6,d:u.atk*0.5,src:u.id,a:0};t.shT=6;hit(t,0.5);}sfxPush('cloud',e.x,e.y,0,0,col,2,2);break;
    case 'xue':{const h0=e.hp;hit(e,2.6);const dealt=Math.max(0,h0-Math.max(0,e.hp));u.hp=Math.min(u.maxhp,u.hp+dealt*0.6);sfxPush('beam',e.x,e.y,u.x,u.y,col,0.6);break;}
    case 'guang':for(const a of alliesNear(u.x,u.y,4)){a.hp=Math.min(a.maxhp,a.hp+a.maxhp*0.22);a.slowT=0;}for(const t of foesNear(u.x,u.y,2))hit(t,1.8);sfxPush('heal',u.x,u.y,0,0,col,1.2,4);sfxPush('burst',u.x,u.y,0,0,col,0.6,2);break;
    case 'an':{const h0=e.hp;hit(e,2.2);const dealt=Math.max(0,h0-Math.max(0,e.hp));u.hp=Math.min(u.maxhp,u.hp+dealt*0.4);if(!e.dead)e.slowT=3;sfxPush('beam',e.x,e.y,u.x,u.y,col,0.7);break;}
    case 'shikong':{const d=dist(u.x,u.y,e.x,e.y)||1;const nx=e.x-(e.x-u.x)/d*0.8,ny=e.y-(e.y-u.y)/d*0.8;sfxPush('rift',u.x,u.y,0,0,col,0.6,0.7);if(walkable(nx|0,ny|0)){u.x=nx;u.y=ny;}hit(e,2.8);for(const t of foesNear(e.x,e.y,1.2))if(t!==e)hit(t,1.4);for(const t of foesNear(e.x,e.y,2))if(!t.dead)t.slowT=3;sfxPush('rift',e.x,e.y,0,0,col,0.8,1.2);break;}
  }
  u.acd.sp=S0.cd*(rootKey(u)==='shikong'?0.85:1);return true;}
{const _ta=tryAbilities;tryAbilities=function(u,e,manual){
  if(e&&!u.dash&&u.realm>=4&&u.lg&&!(u.acd.sp>0)&&!e.dead){const d=dist(u.x,u.y,e.x,e.y);if(d<=5.5&&los(u.x,u.y,e.x,e.y,0.05)){const k=spellKey(u);if(k!=null&&castSpell(u,e,k))return true;}}
  return _ta(u,e,manual);};}
function walkable(i,j){return typeof isBlocked==='function'?!isBlocked(i,j):true;}

// ---- 被動：傷害與狀態 ----
{const _de=dmgEnemy;dmgEnemy=function(src,e,amt,col){
  if(e&&!e.dead){if(e.shT>0)amt*=1.15;
    if(src&&src.kind&&src.lg){const k=rootKey(src);
      if(k==='lei'){amt*=1.3;if(EVIL[e.type])amt*=1.5;if(rnd()<0.12){if(typeof xnStun==='function')xnStun(e,0.8,src);else e.stun=Math.max(e.stun||0,0.8);}}
      else if(k==='an'&&isNight())amt*=2;
      else if(k==='guang'&&EVIL[e.type])amt*=1.4;
      else if(k==='bing'&&rnd()<0.2)e.slowT=2;
      else if(k==='du'&&!e.psn){e.psn={t:3,d:src.atk*0.25,src:src.id,a:0};e.shT=4;}
      else if(k==='xue')src.hp=Math.min(src.maxhp,src.hp+amt*0.1);}}
  return _de(src,e,amt,col);};}
{const _du=dmgUnit;dmgUnit=function(src,u,amt){
  if(u&&!u.dead){const k=rootKey(u);
    if(k==='feng'&&rnd()<0.05){u.dodgeT=performance.now();floater(u.x,u.y,'閃避','#a8ffd8');return;}
    u.hitT=performance.now();
    const sh=u.shield||0,eff=Math.max(0,amt-sh);
    if(k==='xue'&&eff>=u.hp&&!(u.acd.xd>0)){u.acd.xd=120;u.hp=Math.round(u.maxhp*0.3);u.shield=0;const a=src?Math.atan2(u.y-src.y,u.x-src.x):rnd()*6.28;const f=nearestFree(u.x+Math.cos(a)*3,u.y+Math.sin(a)*3,-1);sfxPush('rift',u.x,u.y,0,0,'#ff3a4a',0.7,0.8);if(f){u.x=f.i+0.5;u.y=f.j+0.5;}floater(u.x,u.y,'血遁！','#ff5a6a');return;}}
  _du(src,u,amt);
  if(u&&!u.dead&&u.lg&&u.lg.yin&&!u.lg.aw&&u.hp<u.maxhp*TUNE.yinAwakeHp&&S.time>(u.lg.tryT||0)){u.lg.tryT=S.time+60;if(rnd()<TUNE.yinAwakeCh)awakenYin(u,'瀕死');}
  if(u&&u.dead===undefined&&u.hp<=0)corpse(u);
  if(u&&u.hp<=0)corpse(u);};}
{const _ue=updateEnemy;updateEnemy=function(e,dt,ct){
  if(e.psn){e.psn.t-=dt;e.psn.a+=dt;if(e.psn.a>=0.5){e.psn.a-=0.5;const s=unitById(e.psn.src);dmgEnemy(s&&!s.dead?s:null,e,e.psn.d*0.5,'#9adf3a');if(e.dead)return;}if(e.psn&&e.psn.t<=0)e.psn=null;}
  if(e.shT>0)e.shT-=dt;
  return _ue(e,dt,ct);};}
{const _uu=updateUnit;updateUnit=function(u,dt){const k=rootKey(u);let m=k==='feng'?1.15:k==='shikong'?1.08:1;if(u.hasteT&&u.hasteT>S.time)m*=1.3;
  if(k==='guang'){u.slowT=0;if(u.hp<u.maxhp&&!u.dead)u.hp=Math.min(u.maxhp,u.hp+u.maxhp*0.005*dt);}
  if(m===1)return _uu(u,dt);const s=u.speed;u.speed=s*m;try{_uu(u,dt);}finally{u.speed=s;}};}

// ---- 動作：倒地、受擊、閃避、施法、慶祝、表情、睡覺、工具 ----
const corpses=[];
function corpse(o){if(o._cp)return;o._cp=1;if(corpses.length>20)corpses.shift();corpses.push({x:o.x,y:o.y,col:o.kind==='player'?'#eef2fa':o.kind?BODIES[o.body].col:'#3a3030',t:performance.now(),f:o.face||1});}
{const _ke=killEnemy;killEnemy=function(src,e){if(ENEMY[e.type]&&ENEMY[e.type].human)corpse(e);return _ke(src,e);};}
function drawCorpses(now){for(let i=corpses.length-1;i>=0;i--){const c=corpses[i],a=(now-c.t)/1000;if(a>4){corpses.splice(i,1);continue;}
  const b=P(c.x,c.y),k=Math.min(1,a/0.5);ctx.save();ctx.globalAlpha=a>3?(4-a):1;ctx.translate(b.x,b.y);ctx.rotate(c.f*k*Math.PI/2*0.95);
  poly([{x:-7,y:-3},{x:7,y:-3},{x:4,y:-17},{x:-4,y:-17}],c.col,'rgba(0,0,0,0.4)');ctx.beginPath();ctx.arc(0,-21,5,0,Math.PI*2);ctx.fillStyle='#f0d0a8';ctx.fill();ctx.restore();}}
const GAIT=[[1.5,0],[2.4,0],[1.2,0.06]];
{const _dh=drawHuman;drawHuman=function(u){const now=performance.now(),b=P(u.x,u.y);let dx=0,dy=0,rot=0,sy=1;const f=u.face||1;
  const g=GAIT[u.id%3];
  if(u.moving&&g[1])rot=Math.sin((u.walk||0)*7)*g[1];
  if(u.moving&&g[0]!==1.5)dy-=Math.abs(Math.sin((u.walk||0)*14))*(g[0]-1.5);
  if(!u.moving&&!u.working&&!u.medit)sy=1+0.025*Math.sin(now/600+u.id);           // 待機呼吸
  if(u.medit&&!u.moving)sy=1+0.04*Math.sin(now/900);                                          // 打坐吐納
  if(u.hitT&&now-u.hitT<200){dx-=f*3*(1-(now-u.hitT)/200);}                       // 受擊後仰
  if(u.celebT&&now-u.celebT<1500){dy-=Math.abs(Math.sin((now-u.celebT)/1500*Math.PI*3))*10;}  // 突破慶祝跳躍
  const gr=xnGatherRes(u),gat=!!gr;let tool=null;
  if(gat){const r=gr;tool=r==='wood'?'axe':(r==='stone'||r==='iron'||r==='lingshi')?'pick':'hand';if(tool==='hand')dy+=3;}
  else if(xnBuilding(u))tool='hammer';
  if(u.dodgeT&&now-u.dodgeT<300){ctx.save();ctx.globalAlpha=0.35*(1-(now-u.dodgeT)/300);ctx.translate(-f*10,0);_dh(u);ctx.restore();dx+=f*4;}
  ctx.save();if(dx||dy||rot||sy!==1){ctx.translate(b.x+dx,b.y+dy);ctx.rotate(rot);ctx.scale(1,sy);ctx.translate(-b.x,-b.y);}_dh(u);
  if(u.hitT&&now-u.hitT<150){ctx.globalAlpha=0.45;ellipse(b.x,b.y-14,9,15,'#ff3030');ctx.globalAlpha=1;}
  const bob=u.moving?Math.sin((u.walk||0)*14)*1.5:0;
  if(tool&&!u.medit){const sw=Math.sin(now/90)*0.9,hx=b.x+f*6,hy=b.y-13+bob,ex=hx+f*Math.cos(sw-0.6)*12,ey=hy-Math.sin(sw-0.6)*12-4;
    if(tool==='axe'){ctx.fillStyle='#b8c0c8';ctx.beginPath();ctx.moveTo(ex,ey);ctx.lineTo(ex+f*5,ey-3);ctx.lineTo(ex+f*5,ey+4);ctx.closePath();ctx.fill();}
    else if(tool==='pick'){ctx.strokeStyle='#9aa4ae';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(ex-4,ey+2);ctx.quadraticCurveTo(ex,ey-3,ex+4,ey+2);ctx.stroke();ctx.lineWidth=1;}
    else if(tool==='hammer'){ctx.fillStyle='#7a6a5a';ctx.fillRect(ex-3,ey-3,6,5);if(sw>0.8){ctx.fillStyle='#ffe27a';ctx.fillRect(ex+f*5,ey+3,2,2);ctx.fillRect(ex+f*7,ey,1.5,1.5);}}
    else {ctx.fillStyle='#8a6a3a';ctx.fillRect(b.x-f*8-3,b.y-8,7,5);}}
  // 武器連擊軌跡
  if(u.anim>0&&!tool&&u.task&&u.task.type==='attack'){const w=u.eq&&u.eq.w?u.eq.w.t:'fist';const ph=(u.combo||0)%3;ctx.strokeStyle='rgba(255,255,255,0.75)';ctx.lineWidth=2;ctx.beginPath();
    const cx=b.x+f*8,cy=b.y-14;
    if(w==='sword'){const a0=ph===1?0.8:-0.9;ctx.arc(cx,cy,11,a0,a0+(f>0?1.6:-1.6),f<0);}
    else if(w==='saber'){ctx.lineWidth=3.5;ctx.arc(cx-f*2,cy,14,-1.6,1.2,f<0);}
    else if(w==='spear'){ctx.moveTo(cx,cy);ctx.lineTo(cx+f*(16+ph*3),cy-1);}
    else {ctx.arc(cx+f*(3+ph*2),cy+(ph-1)*3,3+ph,0,Math.PI*2);}ctx.stroke();ctx.lineWidth=1;}
  if(u.anim>0&&!u._ap)u.combo=(u.combo||0)+1;u._ap=u.anim>0;
  ctx.restore();
  // 施法姿勢：雙手高舉＋頭頂靈光
  if(u.castT&&now-u.castT<500){const col=RT[rootKey(u)].col,k=(now-u.castT)/500;ctx.strokeStyle='#f0d0a8';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(b.x-4,b.y-15);ctx.lineTo(b.x-6,b.y-27);ctx.moveTo(b.x+4,b.y-15);ctx.lineTo(b.x+6,b.y-27);ctx.stroke();ctx.lineWidth=1;
    ctx.globalAlpha=1-k;ellipse(b.x,b.y-32,5+k*6,5+k*6,col);ctx.globalAlpha=1;}
  if(u.medit&&!u.moving){const k=(now/1800+u.id*0.3)%1;ctx.strokeStyle=`rgba(180,240,255,${0.5*(1-k)})`;ctx.beginPath();ctx.ellipse(b.x,b.y-4,8+k*14,4+k*7,0,0,Math.PI*2);ctx.stroke();}
  if(u.emo&&u.emo.t>S.time){ctx.font='13px sans-serif';ctx.textAlign='center';ctx.fillText(u.emo.c,b.x+10,b.y-44-Math.sin(now/200)*2);}
  const sleeping=u.aiJob&&u.aiJob.k==='rest'&&isNight()&&!u.moving;
  if(sleeping){const k=(now/1500)%1;ctx.fillStyle=`rgba(220,230,255,${1-k})`;ctx.font='bold 10px sans-serif';ctx.fillText('Z',b.x+8+k*6,b.y-30-k*12);ctx.font='bold 8px sans-serif';ctx.fillText('z',b.x+4+k*4,b.y-26-k*8);}
  // 靈根光點（煉氣以上，選取時）
  if(u.lg&&u.realm>=4&&selUnits.includes(u.id)){const E=lgEff(u.lg),t=now/700;E.els.slice(0,5).forEach((el,i)=>{const a=t+i*1.256;ellipse(b.x+Math.cos(a)*14,b.y-14+Math.sin(a)*6,2,2,EL_COL[el]);});}
};}
{const _dw=drawV045World;drawV045World=function(){_dw();const now=performance.now();drawCorpses(now);drawSfx(1/60);
  if(!S.dg&&!S.interior){const a=nightAlpha();if(a>0.01){ctx.save();ctx.setTransform(dpr,0,0,dpr,0,0);ctx.fillStyle=`rgba(10,14,40,${a})`;ctx.fillRect(0,0,W,H);ctx.restore();}}};}
let sfxLast=0;
function drawSfx(){const now=performance.now(),dt=sfxLast?Math.min(0.1,(now-sfxLast)/1000):0.016;sfxLast=now;
  for(let i=sfx.length-1;i>=0;i--){const s=sfx[i];s.t+=dt;if(s.t>=s.dur){sfx.splice(i,1);continue;}const k=s.t/s.dur,a=P(s.x,s.y);ctx.globalAlpha=1-k;
    if(s.k==='beam'){const c=P(s.x2,s.y2);ctx.strokeStyle=s.col;ctx.lineWidth=5*(1-k)+1;ctx.beginPath();ctx.moveTo(a.x,a.y-14);ctx.lineTo(c.x,c.y-14);ctx.stroke();ctx.strokeStyle='#fff';ctx.lineWidth=1.5;ctx.stroke();}
    else if(s.k==='burst'){ctx.strokeStyle=s.col;ctx.lineWidth=3;ctx.beginPath();ctx.ellipse(a.x,a.y-6,s.r*HW*k+4,s.r*HH*k+2,0,0,Math.PI*2);ctx.stroke();ctx.globalAlpha=(1-k)*0.35;ellipse(a.x,a.y-6,s.r*HW*k+4,s.r*HH*k+2,s.col);}
    else if(s.k==='bolt'){ctx.strokeStyle=s.col;ctx.lineWidth=3;ctx.beginPath();let x=a.x,y=a.y-90;ctx.moveTo(x,y);for(let n=0;n<6;n++){x=a.x+(rnd()-0.5)*14;y+=15;ctx.lineTo(x,y);}ctx.stroke();ctx.strokeStyle='#fff';ctx.lineWidth=1;ctx.stroke();ellipse(a.x,a.y,14*(1-k)+4,7*(1-k)+2,s.col);}
    else if(s.k==='heal'){for(let n=0;n<8;n++){const ang=n*0.785+k*2;ctx.fillStyle=s.col;ctx.fillRect(a.x+Math.cos(ang)*s.r*10,a.y-k*30-Math.sin(ang)*s.r*4,3,3);}}
    else if(s.k==='shield'){ctx.strokeStyle=s.col;ctx.lineWidth=2;ctx.beginPath();for(let n=0;n<=6;n++){const ang=n*Math.PI/3;const x=a.x+Math.cos(ang)*(15+4*k),y=a.y-14+Math.sin(ang)*(20+4*k);n?ctx.lineTo(x,y):ctx.moveTo(x,y);}ctx.stroke();}
    else if(s.k==='vine'){ctx.strokeStyle=s.col;ctx.lineWidth=2;for(let n=0;n<4;n++){ctx.beginPath();const ox=(n-1.5)*5;ctx.moveTo(a.x+ox,a.y);ctx.quadraticCurveTo(a.x+ox+6*Math.sin(n+k*6),a.y-10,a.x+ox,a.y-18*Math.min(1,k*4));ctx.stroke();}}
    else if(s.k==='ice'){ctx.fillStyle=s.col;for(let n=0;n<6;n++){const ang=n*1.047;const x=a.x+Math.cos(ang)*s.r*12,y=a.y+Math.sin(ang)*s.r*6;ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(x-3,y-4);ctx.lineTo(x,y-14);ctx.lineTo(x+3,y-4);ctx.closePath();ctx.fill();}}
    else if(s.k==='cloud'){ctx.globalAlpha=(1-k)*0.5;for(let n=0;n<6;n++){const ang=n*1.047+k;ellipse(a.x+Math.cos(ang)*s.r*10,a.y-4+Math.sin(ang)*s.r*4,8,5,s.col);}}
    else if(s.k==='rift'){ctx.strokeStyle=s.col;ctx.lineWidth=2.5;ctx.beginPath();ctx.ellipse(a.x,a.y-14,4+10*(1-k),18*(1-k)+2,0.3,0,Math.PI*2);ctx.stroke();ctx.fillStyle='rgba(30,0,40,0.6)';ctx.fill();}
    ctx.globalAlpha=1;ctx.lineWidth=1;}}

// ---- 村莊掠奪（敵對村莊可反覆掠奪）----
function vrOf(v){return v.vr||(v.vr={n:0,cd:0,last:-1e9,active:null,retT:null});}
function vrStatus(v){const r=vrOf(v);if(vStatus(v)!=='hostile')return {ok:false,why:'只有「敵對」村莊能掠奪'};if(v.destroyed)return {ok:false,why:'村莊已毀'};if(r.active)return {ok:false,why:'掠奪進行中'};if(S.time<r.cd)return {ok:false,why:`村民還在戒備（${Math.ceil(r.cd-S.time)} 秒）`};return {ok:true,why:''};}
function vrStock(v){const r=vrOf(v);return clamp((S.time-r.last)/TUNE.vrRegen,0.15,1);}
function vrGuards(v){const r=vrOf(v);return {n:Math.min(TUNE.vrGuardMax,TUNE.vrGuard0+r.n),hp:1+TUNE.vrHpUp*r.n,atk:1+TUNE.vrAtkUp*r.n};}
function startVRaid(v){const st=vrStatus(v);if(!st.ok){toast(st.why);return false;}const r=vrOf(v),G=vrGuards(v);const ids=[];
  for(let k=0;k<G.n;k++){const a=k/G.n*Math.PI*2;const f=nearestFree(v.x+Math.cos(a)*2.5,v.y+Math.sin(a)*2.5,-1);if(!f)continue;const e=makeEnemy('militia',f.i+0.5,f.j+0.5,{camp:v.id,realm:Math.min(3,r.n>>1),aggro:9,leash:18});
    e.maxhp=Math.round(e.maxhp*G.hp);e.hp=e.maxhp;e.atk=+(e.atk*G.atk).toFixed(1);e.vg=v.id;S.enemies.push(e);ids.push(e.id);}
  r.active={t0:S.time,n:ids.length};toast(`對${v.name}發動掠奪！擊倒 ${ids.length} 名護村勇士即可搜刮物資`);ping(v.x,v.y,true);return true;}
function vrLootAmt(v){const r=vrOf(v),f=vrStock(v)*(1+Math.min(1,TUNE.vrLootUp*r.n));const o={};for(const k in TUNE.vrLoot)o[k]=Math.round(TUNE.vrLoot[k]*f);return o;}
function updateVRaids(dt){if(S.dg)return;for(const v of S.villages){if(v.type==='bandit'||!v.vr)continue;const r=v.vr;
  if(r.active){const alive=S.enemies.some(e=>e.vg===v.id&&!e.dead);const near=S.units.some(u=>!u.dead&&!u.inside&&dist(u.x,u.y,v.x,v.y)<12);
    if(!alive&&near){const L=vrLootAmt(v);for(const k in L)S.res[k]=(S.res[k]||0)+L[k];r.active=null;r.n++;r.cd=S.time+TUNE.vrCd;r.last=S.time;S.stats.vraids=(S.stats.vraids||0)+1;
      setRel(v,TUNE.vrRel);for(const o of S.villages)if(o!==v&&o.type!=='bandit'&&!o.destroyed)o.rel=clamp(o.rel+TUNE.vrRep,-100,100);
      toast(`掠奪${v.name}成功！獲得 ${rewardText(L)}。各村對宗門的評價下降`);floater(v.x,v.y,'掠奪成功','#ffd34d');
      const ch=Math.min(0.9,TUNE.vrRetal+TUNE.vrRetalUp*(r.n-1));if(rnd()<ch){r.retT=S.time+TUNE.vrRetalT[0]+rnd()*(TUNE.vrRetalT[1]-TUNE.vrRetalT[0]);setTimeout(()=>toast(`${v.name}的村民揚言要報復！`),1200);}}
    else if(S.time-r.active.t0>TUNE.vrTimeout){r.active=null;r.cd=S.time+60;toast(`對${v.name}的掠奪無功而返`);}}
  if(r.retT!=null&&S.time>=r.retT){r.retT=null;if(vStatus(v)==='hostile'&&!v.destroyed)launchRetaliation(v);}}}
function launchRetaliation(v){const c=sectCenter();const ang=Math.atan2(c.y-v.y,c.x-v.x);const gate=nearestFree(v.x+Math.cos(ang)*8,v.y+Math.sin(ang)*8,-1);if(!gate)return;
  const r=vrOf(v),size=Math.min(9,3+r.n),rid=nid();for(let k=0;k<size;k++){const f=nearestFree(gate.i+(k%3)-1,gate.j+((k/3)|0)-1,-1);if(!f)continue;const e=makeEnemy('militia',f.i+0.5,f.j+0.5,{camp:v.id,raid:rid,realm:Math.min(3,r.n>>1)});e.maxhp=Math.round(e.maxhp*(1+0.1*r.n));e.hp=e.maxhp;e.home={x:v.x,y:v.y};S.enemies.push(e);}
  S.raidsActive.push({id:rid,vid:v.id,t0:S.time,n:size});toast(`${v.name}的 ${size} 名村勇前來報復！`);ping(gate.i,gate.j,true);ping(c.x,c.y,true);}
{const _rt=renderTrade;renderTrade=function(){_rt();if(tradeOpen==null)return;const v=vById(tradeOpen);const el=$$('trade');if(!v||!el||vStatus(v)!=='hostile'){const o=el&&el.querySelector('#vraid');if(o)o.remove();return;}
  const st=vrStatus(v),G=vrGuards(v),L=vrLootAmt(v),r=vrOf(v);
  const h=`<b>⚔ 掠奪</b>　<span class="tg">護衛 ${G.n} 人</span><span class="tg">強度 ×${G.hp.toFixed(1)}</span><span class="tg">已掠奪 ${r.n} 次</span><br><small class="dim">可得：${rewardText(L)}（物資 ${Math.round(vrStock(v)*100)}%）｜關係 ${TUNE.vrRel}、他村 ${TUNE.vrRep}，可能遭報復</small><div class="jobs"><button class="btn" data-vraid="1" ${st.ok?'':'disabled'}>${st.ok?'發動掠奪':st.why}</button></div>`;
  let box=el.querySelector('#vraid');if(!box){box=document.createElement('div');box.id='vraid';box.className='sec';el.appendChild(box);}if(box.innerHTML!==h)box.innerHTML=h;};}

// ---- 描述精簡：一行重點＋「詳情」展開 ----
function splitDesc(b){if(typeof b!=='string'||b.indexOf('<details')>=0)return null;const plain=b.replace(/<[^>]+>/g,'');if(plain.length<=26)return null;
  const okAt=i=>{const pre=b.slice(0,i);return (pre.match(/</g)||[]).length===(pre.match(/>/g)||[]).length&&!/<(span|b|small|i)[^>]*>[^<]*$/.test(pre);};
  const cands=[];for(const tok of ['<br>','。','；']){let i=b.indexOf(tok);while(i>=0){if(okAt(i)){cands.push([i,tok]);break;}i=b.indexOf(tok,i+1);}}
  cands.sort((x,y)=>x[0]-y[0]);let c=cands.find(c=>b.slice(0,c[0]).replace(/<[^>]+>/g,'').length>=6);
  if(!c)return null;let s=b.slice(0,c[0]);if(s.replace(/<[^>]+>/g,'').length>30){let i=b.indexOf('，');while(i>=0&&i<c[0]){if(okAt(i)&&b.slice(0,i).replace(/<[^>]+>/g,'').length>=6){c=[i,'，'];s=b.slice(0,i);break;}i=b.indexOf('，',i+1);}}
  const rest=b.slice(c[0]+c[1].length).replace(/^(<br>)+/,'');if(!rest.replace(/<[^>]+>/g,'').trim())return null;return {s,rest};}
function sdHtml(b){const p=splitDesc(b);if(!p)return b;return `<b class="sdl">${p.s}</b><details class="dt"><summary>詳情</summary>${p.rest}</details>`;}
gRow=function(a,b){return `<tr><td>${a}</td><td>${sdHtml(b)}</td></tr>`;};
{const _st=showTip;showTip=function(k,el){_st(k,el);const t=document.getElementById('tip');if(!t||t.style.display==='none')return;const txt=tipText(k);if(!txt)return;
  const i=txt.search(/[。；\n]/);if(i>4&&i<txt.length-2){t.innerHTML=`<b>${esc(txt.slice(0,i))}</b><br><span style="opacity:.72;font-size:.9em">${esc(txt.slice(i+1))}</span>`;}};}

// ---- 事件：五行同修、靈根異動 ----
EVENTS.push(
 {k:'wuxing',t:'五行歸一',txt:'山洞石壁刻著五色紋路，似是一套「五行同修」之法。',o:[
  {l:'讓偽靈根者參悟',f:()=>{const c=[player(),...disciples()].filter(u=>u&&!u.dead&&u.lg&&(rootKey(u)==='wei4'||rootKey(u)==='wei5')&&!u.lg.wxt);if(!c.length){S.items.miji++;return '沒有偽靈根者能參悟。你拓下石刻，得「武學秘籍」×1';}const u=pick(c);u.lg.wxt=true;return `${nm(u)}參透五行同修！偽靈根修煉 ×${TUNE.wxtMul}，突破後成長更多`;}},
  {l:'拓印石刻',f:()=>{S.items.miji++;return '得「武學秘籍」×1';}}]},
 {k:'hidroot',t:'靈根異動',txt:'夜裡一名弟子體內靈光亂竄，似有什麼要破殼而出。',o:[
  {l:'為其護法',f:()=>{const c=disciples().filter(u=>u.lg&&u.lg.yin&&!u.lg.aw);if(c.length){awakenYin(c[0],'護法');return '隱藏的靈根被喚醒了！';}const d=evDisc();if(d){d.xy+=10;return `${nm(d)}仙緣 +10`;}return '一場虛驚';}},
  {l:'靜觀其變',f:()=>{const d=evDisc();if(d){d.wu=Math.min(100,d.wu+2);return `${nm(d)}悟性 +2`;}return '無事發生';}}]}
);

// ---- 存檔 ----
{const _s=snapshot;snapshot=function(){const d=_s();d.vr045=S.villages.filter(v=>v.vr).map(v=>[v.id,Object.assign({},v.vr,{active:null})]);return d;};}
{const _a=applySave;applySave=function(d){const r=_a(d);try{for(const u of S.units)if(u.lg)u.lg=normLg(u.lg);if(d&&d.vr045)for(const [id,vr] of d.vr045){const v=vById(id);if(v)v.vr=vr;}}catch(e){}return r;};}
{const _t=tickV045;tickV045=function(dt){_t(dt);updateVRaids(dt);};}

// ---- 雙修相性：變異／至尊組合 ----
{const _c=compat;compat=function(a,b){const r=_c(a,b);const ka=rootKey(a),kb=rootKey(b),pair=[ka,kb].sort().join('+');
  const add=(m,t)=>{r.m=+(r.m*m).toFixed(2);r.t=(r.t?r.t+'、':'')+t;};
  if(pair==='an+guang')add(1.5,'陰陽相濟');else if(pair==='bing+xue'||(ka==='bing'&&BODIES[b.body].n==='火靈體')||(kb==='bing'&&BODIES[a.body].n==='火靈體'))add(1.2,'冰火互補');else if(ka===kb&&ka!=='none'&&RT[ka]&&(VAR_KEYS.includes(ka)||ZUN_KEYS.includes(ka)))add(1.25,'同源共鳴');
  return r;};}

// ---- 指南：靈根 ----
GUIDE_CATS.splice(2,0,['root','靈根']);
{const _gb=guideBody;guideBody=function(c){if(c!=='root')return _gb(c);const W=TUNE.lgW;let tw=0;for(const k in W)tw+=W[k];
  const row=(k,w)=>{const R=RT[k];return `<tr><td><b style="color:${R.col}">${R.n}</b>${w!=null?`<br><small class="dim">${w}</small>`:''}</td><td><b class="sdl">${R.s}</b><br>${R.tags.map(t=>`<span class="tg">${t}</span>`).join('')}${R.d?`<details class="dt"><summary>詳情</summary>${R.d}</details>`:''}</td></tr>`;};
  const pct=k=>(W[k]/tw*100).toFixed(1)+'%';
  let h='<p class="dim">新弟子約 '+Math.round(TUNE.lgChance*100)+'% 身具靈根（求仙台、仙緣閣更高）。煉氣後可施放靈根法術。</p><table class="gt">';
  h+=row('none')+row('tian',pct('tian'))+row('zhen2',pct('zhen'))+row('zhen3')+row('wei4',pct('wei'))+row('wei5');
  h+='<tr><td colspan="2"><b>變異靈根</b>（共 '+pct('var')+'）</td></tr>'+VAR_KEYS.map(k=>row(k)).join('');
  h+='<tr><td colspan="2"><b>至尊靈根</b></td></tr>'+row('guang',pct('guang'))+row('an',pct('an'))+row('shikong',pct('shikong'))+row('hundun',pct('hundun'));
  h+=`<tr><td><b>隱靈根</b><br><small class="dim">${pct('yin')}</small></td><td><b class="sdl">外表偽靈根，內藏天／變異靈根</b><br><span class="tg">瀕死覺醒</span><span class="tg">突破覺醒</span><details class="dt"><summary>詳情</summary>瀕死時 ${Math.round(TUNE.yinAwakeCh*100)}%、突破時 ${Math.round(TUNE.yinAwakeBreak*100)}% 機率覺醒，或靠奇遇「靈根異動」。</details></td></tr>`;
  h+='</table><h4>五行與互動</h4><table class="gt">'+[['相剋','金剋木、木剋土、土剋水、水剋火、火剋金。剋制傷害 ×'+TUNE.elWin],['煉丹','火靈根成丹率更高'],['鍛造','金靈根鍛造更好'],['採集','木→砍樹、土金→採石挖礦 ×1.3'],['體質','同屬體質修煉 ×1.1'],['雙修','相生、陰陽、冰火互補更有效'],['晝夜','戌～丑時為夜晚，暗靈根攻擊 ×2']].map(([a,b])=>`<tr><td>${a}</td><td>${b}</td></tr>`).join('')+'</table>';
  return h;};}
TIPS.lg='靈根：決定修煉速度與法術。詳見指南「靈根」';
{const _x=XW045;XW045=function(){const o=_x();Object.assign(o,{RT,rollLg,mkLg,normLg,lgEff,lgName:l=>lgName(l),rootKey,rootCult,castSpell,spellKey,awakenYin,isNight,nightAlpha,startVRaid,vrStatus,vrOf,vrLootAmt,updateVRaids,launchRetaliation,splitDesc,sdHtml,get sfx(){return sfx;},get corpses(){return corpses;}});
  const el=document.getElementById('trade');if(el)el.addEventListener('click',ev=>{const t=ev.target.closest('[data-vraid]');if(!t)return;const v=vById(tradeOpen);if(v&&startVRaid(v)){tradeKey=null;renderTrade();}});
  return o;};}
// v0.4.5 修正：主角開局必定是混沌靈根（使用者決定：開局給最強）；舊存檔沒有靈根的自動補上
{const _mp=makePlayer;makePlayer=function(x,y){const p=_mp(x,y);if(!p.lg)p.lg=mkLg('zun',{z:'hundun'});return p;};}
{const _a2=applySave;applySave=function(d){const r=_a2(d);try{for(const u of S.units)if(u.kind==='player'&&!u.lg)u.lg=mkLg('zun',{z:'hundun'});}catch(e){}return r;};}
// 修煉面板的靈根介紹（一行重點＋數值標籤＋可展開詳情）
function lgCultHtml(u){try{const k=rootKey(u),r=RT[k]||RT.none;const nm=u.lg?lgName(u.lg):'無靈根';
  const tg=(r.tags||[]).map(t=>`<span class="tg">${t}</span>`).join('');
  return `<div style="margin:6px 0;padding:6px 8px;border:1px solid ${r.col}55;border-radius:6px;background:#0003"><b style="color:${r.col}">靈根：${nm}</b>　<span class="sdl">${r.s}</span><br>${tg}${r.d?`<details class="dt"><summary>詳情</summary>${r.d}</details>`:''}<div class="dim" style="font-size:11px;margin-top:2px">煉氣以上可施放靈根法術。指南「靈根」可看全部種類。</div></div>`;}catch(e){return '';}}
