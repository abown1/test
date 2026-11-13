
// ================== g27_realmbase.js：每境界固定基礎數值（創意家 2026-11-10 22:05「今晚就把每境界固定數值帶入」）==================
// 規格：F-001 基礎戰力表、F-002 戰力＝Base_Power×(1+小境界×0.05)、F-060/F-063 MaxHP＝3000＋Base_Power×20（＋氣血上限，總值 clamp 50000）、
//       F-065 靈力表、F-023/F-029 全員照境界模板 ±10%、F-084 Base_Mean＝(當前＋下一階)/2、F-088 武徒 Base_Power 10～50 抽樣再 ±10%。
// 做法（不清檔、不損資產）：每個單位只換「境界基礎」那一段——
//   首次看到單位：以舊口徑同境標準（主角 120/12、弟子 60/6、敵人＝主角口徑，皆經 applyRealmStats 與小階段）為分母，
//   把不含裝備的氣血／攻擊按「新模板×個人浮動 ÷ 舊標準」等比換算；體質、靈根、丹藥等倍率加成與裝備加值保留。
//   之後境界／小階段變動：舊程式照舊乘它的倍率，這裡再補「新模板比 ÷ 舊模板比」，結果等同新表。
//   換算前備份在 u._preRB；u._rb 記錄已套用的境界與浮動（存檔保留），避免重複換算。
// 聯機客端不換算（數值以主機為準）。百分比屬性（閃避、暴擊、吸血…）不動。
const RB_BP=[30,100,150,220,320,450,600,800,1100,1500,2000,2600];         // 武徒取 10～50 中值 30（個人另抽樣）
const RB_QI=[0,0,0,0,300,500,1000,1500,3000,7000,10000,10000];            // 靈力；凡人四境用體力／勁力／內力（未接，見回報）
const RB_ATTR=RB_BP.map((_,r)=>Math.max(10,Math.round(10*Math.pow(100,r/10))));   // 悟性類境界基準：武徒10 → 地仙1000（天仙沿曲線＝1585，已超出凡界）
TUNE.rb={hpFix:{10:41000}/* 創意家11-10 22:24：地仙41000血（初期模板，攻擊不變） */,on:true,V:1,mean:true,atkK:1,hpCap:50000,statCap:10000,flo:0.9,fhi:1.1,b0:[10,50],enemy:true};
const RBS={n:0,conv:0,tag:0,adj:0,log:[]};
function rbClient(){try{return typeof v49Client==='function'&&v49Client();}catch(e){return false;}}
function rbN(r){try{return typeof v52N==='function'?v52N(r):4;}catch(e){return 4;}}
function rbS4(r,s){const n=rbN(r);s=Math.max(0,s|0);return n>1?Math.min(3,s*3/(n-1)):0;}   // 十層換算成 初/中/後/圓滿 0..3
function rbBPm(r){r=Math.max(0,Math.min(RB_BP.length-1,r|0));if(r===0||!TUNE.rb.mean)return RB_BP[r];const nx=RB_BP[Math.min(RB_BP.length-1,r+1)];return (RB_BP[r]+nx)/2;}
// 新模板（f＝個人浮動，b0＝武徒個人 Base_Power 抽樣）
// 氣血：境界初期基準（hpFix 可覆寫）；小境界往上長，圓滿最多＝初期＋(初期−3000)×0.15（同原本），且不超過下一境界初期×0.975（創意家11-10 22:27：各境界圓滿下調，不高過下一境初期）
function rbHpB(r){r=Math.max(0,Math.min(RB_BP.length-1,r|0));const hf=TUNE.rb.hpFix&&TUNE.rb.hpFix[r];return hf!=null?hf:(3000+20*rbBPm(r));}
function rbHpAt(r,hb,s4){let top=hb+0.15*Math.max(0,hb-3000);if(r<RB_BP.length-1)top=Math.min(top,rbHpB(r+1)*(TUNE.rb.peakK||0.975));top=Math.max(hb,top);return hb+(top-hb)*(s4/3);}
function rbStd(r,s,f,b0){r=Math.max(0,r|0);f=f||1;const bp0=(r===0&&b0!=null)?b0:rbBPm(r),bp=bp0*(1+0.05*rbS4(r,s));
  const hb=(r===0&&b0!=null)?(3000+20*bp0):rbHpB(r),hp=Math.round(rbHpAt(r,hb,rbS4(r,s))*f)   /* 氣血總值 50000 由 g23 xcap 夾；模板本身不夾，換算比例才準 */,atk=Math.min(TUNE.rb.statCap,Math.round(bp*f*(TUNE.rb.atkK||1)*10)/10);
  const q=RB_QI[Math.min(RB_QI.length-1,r)]||0,qi=q?Math.min(TUNE.rb.statCap,Math.round(q*(1+0.05*rbS4(r,s))*f)):0;
  return {hp,atk,qi,bp:Math.round(bp*f*10)/10};}
// 舊口徑同境標準（原 g25_bosscap.js bossCapStd 的算法；主角 120/12）
function rbOldStd(r,s){r=Math.max(0,r|0);s=Math.max(0,s|0);const u={maxhp:120,atk:12,speed:0};
  for(let k=0;k<r;k++){const m=xnFullM(k,'hp'),ma=xnFullM(k,'atk');u.maxhp=Math.round(u.maxhp*m);u.atk=+(u.atk*ma).toFixed(1);}
  const m=1+(typeof xnSb==='function'?xnSb(r):(TUNE.subBonus||0.04));for(let i=0;i<s;i++){u.maxhp=Math.round(u.maxhp*m);u.atk=+(u.atk*m).toFixed(1);}
  return {hp:u.maxhp,atk:u.atk};}
function rbRef(o){return (o&&(o.kind==='disciple'||o.kind==='cand'||o.kind==null&&!o.type))?0.5:1;}   // 弟子／候選／遊歷者舊底 60/6＝主角一半
function rbOld(o,r,s){const st=rbOldStd(r,s),k=rbRef(o);return {hp:st.hp*k,atk:st.atk*k};}
function rbRoll(){return TUNE.rb.flo+Math.random()*(TUNE.rb.fhi-TUNE.rb.flo);}
function rbRollB0(){const B=TUNE.rb.b0;return Math.round(B[0]+Math.random()*(B[1]-B[0]));}
function rbGear(o){const a={hp:0,atk:0};if(o.gb){a.hp+=o.gb.hp||0;a.atk+=o.gb.atk||0;}if(o.econGb){a.hp+=o.econGb.hp||0;a.atk+=o.econGb.atk||0;}return a;}
// 依倍率調整「不含裝備」的氣血／攻擊；百分比裝備（econGb）跟著基礎同比
function rbScale(o,kh,ka){
  if(!(kh>0)||!(ka>0)||(Math.abs(kh-1)<1e-9&&Math.abs(ka-1)<1e-9))return;
  const fr=o.maxhp>0?Math.max(0,Math.min(1,o.hp/o.maxhp)):1,dead=!(o.hp>0);
  if(o._mapBase&&!o.kind){const B=o._mapBase,dh=Math.round((B.maxhp||0)*(kh-1)),da=(B.atk||0)*(ka-1);B.maxhp=Math.round((B.maxhp||0)*kh);B.atk=+((B.atk||0)*ka).toFixed(1);o.maxhp=Math.max(1,Math.round(o.maxhp+dh));o.atk=+Math.max(0.1,o.atk+da).toFixed(1);}
  else{const g=rbGear(o),hn=o.maxhp-g.hp,an=o.atk-g.atk;
    if(o.econGb){o.econGb.hp=Math.round((o.econGb.hp||0)*kh);o.econGb.atk=+((o.econGb.atk||0)*ka).toFixed(1);}
    const g2=rbGear(o);o.maxhp=Math.max(1,Math.round(hn*kh+g2.hp));o.atk=+Math.max(0.1,an*ka+g2.atk).toFixed(1);}
  if(o._cultDanduRef!=null&&isFinite(o._cultDanduRef))o._cultDanduRef=Math.max(1,Math.round(o._cultDanduRef*kh));   // cult.js 丹毒的氣血基準（絕對值）同步換算
  if(o._pbfHpAdd)o._pbfHpAdd=Math.round(o._pbfHpAdd*kh);                                                         // g12 丹藥突破加成（絕對值）同步換算
  if(!dead)o.hp=Math.max(1,Math.min(o.maxhp,Math.round(o.maxhp*fr)));
  o.v51k=null;o._bcK=null;
  if(o.kind){try{if(typeof xcapOne==='function'&&typeof XCAP!=='undefined')xcapOne(o,XCAP.U);}catch(e){}}   // 氣血上限 50000、攻擊等 10000
}
function rbNaked(o){const g=rbGear(o);return {h:o.maxhp-g.hp,a:o.atk-g.atk};}
function rbLooksNew(o,r,s){const g=rbGear(o),O=rbOld(o,r,s);return (o.maxhp-g.hp)>=O.hp*8;}   // 舊口徑最多數倍；新口徑 ≥24 倍
function rbAttrOf(r,f){const a=RB_ATTR[Math.min(RB_ATTR.length-1,Math.max(0,r|0))];return Math.max(10,Math.round(a*(f||1)));}
// 大世界／秘境敵人：改套用完整境界模板（F-023 ±10%），不再用舊怪表（妖狼 45/6、山賊 60/7）按比例換算。
// 仙凡之門等 v49lq 首領：抬境並標好目標 realm/sub 後，允許再套一次 rbStd（倍率 1，不走梯級 1.10，以免與 g13 xfGate 疊乘）。尚未抬境、或已套過目前 r/s、或已有 _xfG 者不重套。山賊境界上限由 map* 既有夾制負責（不得築基以上）。
function rbEnTier(o){
  let k=null,mul=1;
  try{
    if(o&&o._mapTiered&&typeof MAP_ENEMY_TIERS!=='undefined'&&MAP_ENEMY_TIERS[o._mapTiered]&&MAP_ENEMY_TIERS[o._mapTiered].mul){
      k=o._mapTiered;mul=+MAP_ENEMY_TIERS[o._mapTiered].mul;
    }else{
      if(typeof MAP_ENEMY_TYPE_TIER!=='undefined'&&o&&MAP_ENEMY_TYPE_TIER[o.type])k=MAP_ENEMY_TYPE_TIER[o.type];
      else if(o&&typeof ENEMY!=='undefined'&&ENEMY[o.type]&&ENEMY[o.type].boss)k='boss';
      else k='mob';
      if(typeof MAP_ENEMY_TIERS!=='undefined'&&MAP_ENEMY_TIERS[k]&&MAP_ENEMY_TIERS[k].mul)mul=+MAP_ENEMY_TIERS[k].mul;
    }
  }catch(e){}
  try{
    const F=typeof TUNE!=='undefined'&&TUNE.xn&&TUNE.xn.fair;
    // 公平旗標開時：雜兵改用完整模板（mobMul 預設 1.0），精銳／頭目／Boss 維持原梯級
    if(F&&F.on!==false&&k==='mob'&&F.mobMul!=null)mul=+F.mobMul;
  }catch(e2){}
  return mul;
}
// v49lq 已抬到目前 r/s、且尚未用該 r/s 套過完整模板、也尚未被 g13 xfGate 寫入最終值時，允許再套一次。
function rbLiftedReady(o){
  if(!o||!o.v49lq)return false;
  const r=Math.max(0,o.realm|0),s=Math.max(0,o.sub|0),R=o._rb;
  try{if(o._xfG&&o._xfG.on&&(o._xfG.r|0)===r&&(o._xfG.s|0)===s)return false;}catch(e){}
  if(R&&R.full&&(R.r|0)===r&&(R.s|0)===s)return false;
  return true;
}
// 抬境後套 rbStd 本身（f=1、mul=1）。不走 rbEnTier，也不套 xfGate 的 bossAtk／bossShield，那些仍由 g13 暫頂負責。
function rbEnFullAfterLift(o){
  if(!o||!o.v49lq||!rbLiftedReady(o))return false;
  const r=Math.max(0,o.realm|0),s=Math.max(0,o.sub|0),R=o._rb;
  const f=1,b0=null,fa=(R&&R.fa)||1;
  const T=rbStd(r,s,f,b0),O=rbOld(o,r,s);
  const wantH=Math.max(1,Math.round(T.hp)),wantA=Math.max(0.1,Math.round(T.atk*10)/10);
  const n0=rbNaked(o);
  if(!(n0.h>0)||!(n0.a>0))return false;
  if(!o._preRB)o._preRB={maxhp:o.maxhp,hp:o.hp,atk:o.atk,realm:r,sub:s,t:(typeof S!=='undefined'&&S?S.time:0)};
  rbScale(o,wantH/n0.h,wantA/n0.a);
  const n1=rbNaked(o);
  o._rb={v:TUNE.rb.V,r,s,f,fa,b0,ch:T.hp/O.hp,ca:T.atk/O.atk,a:rbAttrOf(r,fa),hn:n1.h,an:n1.a,hv:n1.h,av:n1.a,full:1,tier:1,lifted:1};
  o.v51k=null;o._bcK=null;
  RBS.conv++;RBS.enLift=(RBS.enLift||0)+1;
  if(RBS.log.length<200)RBS.log.push({id:o.id,k:o.type,r,s,f:1,full:1,lifted:1,mul:1,hp0:o._preRB.maxhp,hp:o.maxhp,atk0:o._preRB.atk,atk:o.atk});
  return true;
}
function rbEnFull(o){
  if(!o)return false;
  if(o.v49lq)return rbEnFullAfterLift(o);
  const r=Math.max(0,o.realm|0),s=Math.max(0,o.sub|0),R=o._rb;
  const f=(R&&R.f)||rbRoll(),b0=r===0?((R&&R.b0!=null)?R.b0:rbRollB0()):null,fa=(R&&R.fa)||rbRoll();
  const T=rbStd(r,s,f,b0),O=rbOld(o,r,s),mul=rbEnTier(o);
  const wantH=Math.max(1,Math.round(T.hp*mul)),wantA=Math.max(0.1,Math.round(T.atk*mul*10)/10);
  const n0=rbNaked(o);
  if(!(n0.h>0)||!(n0.a>0))return false;
  if(!o._preRB)o._preRB={maxhp:o.maxhp,hp:o.hp,atk:o.atk,realm:r,sub:s,t:(typeof S!=='undefined'&&S?S.time:0)};
  const kh=wantH/n0.h,ka=wantA/n0.a;
  rbScale(o,kh,ka);
  const n1=rbNaked(o);
  o._rb={v:TUNE.rb.V,r,s,f,fa,b0,ch:T.hp/O.hp,ca:T.atk/O.atk,a:rbAttrOf(r,fa),hn:n1.h,an:n1.a,hv:n1.h,av:n1.a,full:1,tier:mul};
  o.v51k=null;o._bcK=null;
  RBS.conv++;RBS.enFull=(RBS.enFull||0)+1;
  if(RBS.log.length<200)RBS.log.push({id:o.id,k:o.type,r,s,f:+f.toFixed(3),full:1,mul,hp0:o._preRB.maxhp,hp:o.maxhp,atk0:o._preRB.atk,atk:o.atk});
  return true;
}
function rbUnit(o){
  if(!o||!TUNE.rb.on)return;
  if(!(o.maxhp>0)||typeof o.atk!=='number')return;
  const isEn=!o.kind&&!!o.type;if(isEn&&!TUNE.rb.enemy)return;
  const r=Math.max(0,o.realm|0),s=Math.max(0,o.sub|0),R=o._rb;
  if(isEn&&o.v49lq){if(rbLiftedReady(o))rbEnFullAfterLift(o);return;}
  if(isEn&&!o.v49lq){
    const mulNow=(()=>{try{return rbEnTier(o);}catch(e){return 1;}})();
    const stale=(()=>{try{const T=rbStd(r,s,1,null),n=rbNaked(o);return n.h<T.hp*mulNow*0.5||n.a<T.atk*mulNow*0.5;}catch(e){return false;}})();
    const tierCh=!!(R&&R.tier!=null&&Math.abs(R.tier-mulNow)>1e-6);
    if(!R||!R.full||stale||tierCh)rbEnFull(o);return;}
  if(!R){
    const f=rbRoll(),b0=r===0?rbRollB0():null,fa=rbRoll();
    if(!isEn&&rbLooksNew(o,r,s)){const T=rbStd(r,s,1,null),O=rbOld(o,r,s);o._rb={v:TUNE.rb.V,r,s,f:1,fa,b0:null,ch:T.hp/O.hp,ca:T.atk/O.atk,tag:1,a:rbAttrOf(r,fa)};RBS.tag++;return;}
    o._preRB={maxhp:o.maxhp,hp:o.hp,atk:o.atk,realm:r,sub:s,t:(typeof S!=='undefined'&&S?S.time:0)};
    const T=rbStd(r,s,f,b0),O=rbOld(o,r,s);let kh=T.hp/O.hp,ka=T.atk/O.atk;
    if(!isEn){   // 主角／弟子：保留體質倍率；其餘舊加成（丹藥、靈根、厚積薄發）照比例保留，但舊數值低於同境標準者（舊檔改層數未補血等）一律補到模板
      const B=(typeof BODIES!=='undefined'&&BODIES[o.body])||null,bh=(o.kind==='player'||!B)?1:(B.hp||1),ba=(o.kind==='player'||!B)?1:(B.atk||1),g=rbGear(o);
      const Kh=Math.max(1,Math.min(2,(o.maxhp-g.hp)/(O.hp*bh))),Ka=Math.max(1,Math.min(2,(o.atk-g.atk)/(O.atk*ba)));
      const hn=Math.max(1,o.maxhp-g.hp),an=Math.max(0.1,o.atk-g.atk);kh=T.hp*bh*Kh/hn;ka=T.atk*ba*Ka/an;}
    const n0=rbNaked(o),hn=n0.h*kh,an=n0.a*ka;
    rbScale(o,kh,ka);const n1=rbNaked(o);o._rb={v:TUNE.rb.V,r,s,f,fa,b0,ch:T.hp/O.hp,ca:T.atk/O.atk,a:rbAttrOf(r,fa),hn,an,hv:n1.h,av:n1.a};RBS.conv++;
    if(RBS.log.length<200)RBS.log.push({id:o.id,k:o.kind||o.type,r,s,f:+f.toFixed(3),hp0:o._preRB.maxhp,hp:o.maxhp,atk0:o._preRB.atk,atk:o.atk});
    return;
  }
  if(isEn){if(o.v49lq&&rbLiftedReady(o))rbEnFullAfterLift(o);return;}   // v49lq 未抬或已套過目前 r/s 則停；一般敵人走 rbEnFull（_rb.full）
  if(R.r===r&&R.s===s)return;
  const nf=(r!==R.r)?rbRoll():R.f,nfa=(r!==R.r)?rbRoll():(R.fa||1);   // 大境界突破時重擲浮動（晉升浮動）
  const T0=rbStd(R.r,R.s,R.f,R.b0),T1=rbStd(r,s,nf,r===0?R.b0:null),O0=rbOld(o,R.r,R.s),O1=rbOld(o,r,s);
  const n0=rbNaked(o);let kh,ka,hn,an;
  if(R.hv>0&&R.av>0&&R.hn>0&&R.an>0&&n0.h>0&&n0.a>0){   // 以「未被 50000／10000 夾過」的目標值計算，避免夾頂後再降境界時失真
    const dh=(n0.h/R.hv)/(O1.hp/O0.hp),da=(n0.a/R.av)/(O1.atk/O0.atk);hn=R.hn*(T1.hp/T0.hp)*dh;an=R.an*(T1.atk/T0.atk)*da;kh=hn/n0.h;ka=an/n0.a;}
  else{kh=(T1.hp/T0.hp)/(O1.hp/O0.hp);ka=(T1.atk/T0.atk)/(O1.atk/O0.atk);hn=n0.h*kh;an=n0.a*ka;}
  rbScale(o,kh,ka);RBS.adj++;const n1=rbNaked(o);
  o._rb={v:TUNE.rb.V,r,s,f:nf,fa:nfa,b0:r===0?R.b0:null,ch:T1.hp/O1.hp,ca:T1.atk/O1.atk,a:rbAttrOf(r,nfa),hn,an,hv:n1.h,av:n1.a};
}
// 村衛（友方 NPC，n.guard）：套完整境界模板氣血／攻擊，不改也不提高其村莊／區域既有境界。
// 開關聯 TUNE.xn.fair.on 與 TUNE.xn.fair.guard（預設皆開）。讀檔／重生／每幀掃會覆寫舊存檔的 60+30×境 氣血與 v60 6+3×境 攻擊。
function rbGuardOn(){const F=(TUNE.xn&&TUNE.xn.fair)||{};if(!(TUNE.rb&&TUNE.rb.on))return false;if(F.on===false||F.guard===false)return false;return true;}
function rbGuardSyncCd(){if(typeof TUNE==='undefined'||!TUNE.v60)return;const F=(TUNE.xn&&TUNE.xn.fair)||{};if(rbGuardOn())TUNE.v60.cd=F.enemyMeleeCd!=null?F.enemyMeleeCd:1.0;else TUNE.v60.cd=F.oldGuardCd!=null?F.oldGuardCd:1.1;}
function rbApplyGuard(n){
  if(!n||!n.guard||!rbGuardOn()||typeof rbStd!=='function')return false;
  const r=Math.max(0,n.realm|0),s=Math.max(0,n.sub|0);
  const prev=n._rbG;
  if(prev&&prev.r===r&&prev.s===s&&n.maxhp===prev.hp&&+(n.atk)===prev.atk)return false;
  const T=rbStd(r,s,1,r===0?30:null);
  const wantH=Math.max(1,Math.round(T.hp)),wantA=+Math.max(0.1,Math.round(T.atk*10)/10);
  const fr=(n.maxhp>0&&n.hp!=null)?Math.max(0,Math.min(1,n.hp/n.maxhp)):1;
  n.maxhp=wantH;
  if(n.xnDown){/* 倒地不拉滿 */}else if(n.hp==null)n.hp=wantH;
  else n.hp=Math.max(0,Math.min(wantH,Math.round(wantH*fr)));
  n.atk=wantA;n._rbG={v:(TUNE.rb&&TUNE.rb.V)||1,r,s,hp:wantH,atk:wantA};
  return true;
}
function rbSweep(){
  if(!TUNE.rb.on||typeof S==='undefined'||!S||rbClient())return;
  try{for(const L of [S.units,S.cands,S.wand,S.enemies])if(Array.isArray(L))for(const o of L)rbUnit(o);
    if(Array.isArray(S.npcs))for(const o of S.npcs)if(o&&o.guard)rbApplyGuard(o);
    rbGuardSyncCd();
    if(S.flags&&!S.flags.rbV)S.flags.rbV=TUNE.rb.V;}catch(e){if(RBS.log.length<200)RBS.log.push({err:String(e)});}
}
// 靈力（F-065）：表值×(1+0.05×小境界)×個人浮動，上限 10000；武徒～宗師 0
function rbQiMax(u){if(!u||u.realm<4)return 0;const R=u._rb;return rbStd(u.realm,u.sub||0,R?R.f:1,null).qi;}
// 靈力上限：cult.js 的 qiMaxMul 表（CULT_FLAGS.lingqi）會蓋掉新表；這裡在最外層暫關 lingqi 取基礎值（econ 詞條百分比仍照乘）
if(typeof qiMaxFor==='function'){const _q=qiMaxFor;qiMaxFor=function(u){if(!(TUNE.rb&&TUNE.rb.on)||typeof CULT_FLAGS==='undefined'||!CULT_FLAGS)return _q.apply(this,arguments);
  const L=CULT_FLAGS.lingqi;CULT_FLAGS.lingqi=false;try{return _q.apply(this,arguments);}finally{CULT_FLAGS.lingqi=L;}};}
// 回血等「每秒固定量」：乘上本單位的新舊氣血比，維持同樣的百分比節奏
function rbRegenK(o){return (o&&o._rb&&o._rb.ch>0)?o._rb.ch:1;}
// 每幀補掃（主機／單機）
if(typeof tickV045==='function'){const _t=tickV045;tickV045=function(dt){rbSweep();return _t.apply(this,arguments);};}
setInterval(rbSweep,250);
// 存檔欄位
try{for(const L of [UNIT_KEEP,DISC_COPY,CAND_KEEP,WAND_KEEP,EN_KEEP])for(const k of ['_rb','_preRB'])if(L.indexOf(k)<0)L.push(k);}catch(e){}
try{if(window.XW&&Array.isArray(XW.UNIT_KEEP))for(const k of ['_rb','_preRB'])if(XW.UNIT_KEEP.indexOf(k)<0)XW.UNIT_KEEP.push(k);}catch(e){}
// 讀檔／新遊戲後立即換算（不等下一幀）
if(typeof applySave==='function'){const _as=applySave;applySave=function(){const r=_as.apply(this,arguments);try{if(r)rbSweep();}catch(e){}return r;};}
// 村衛：生成／初始化／普攻改走模板攻擊；舊存檔讀檔已由上方 applySave→rbSweep 覆寫現場數值（不改存檔結構）
if(typeof makeGuard==='function'&&!makeGuard._rbG){const _mg=makeGuard;makeGuard=function(){const n=_mg.apply(this,arguments);try{rbApplyGuard(n);}catch(e){}return n;};makeGuard._rbG=1;}
if(typeof xnfInit==='function'&&!xnfInit._rbG){const _xi=xnfInit;xnfInit=function(n){if(n&&n.guard&&rbGuardOn()){rbApplyGuard(n);if(n.maxhp!=null)return;}return _xi.apply(this,arguments);};xnfInit._rbG=1;}
if(typeof v60Atk==='function'&&!v60Atk._rbG){const _va=v60Atk;v60Atk=function(n){if(rbGuardOn()){rbApplyGuard(n);if(n&&n.atk>0)return n.atk;}return _va.apply(this,arguments);};v60Atk._rbG=1;}
rbGuardSyncCd();

// 生成當下就套完整模板（不等 250ms 掃），赤紋虎等大世界妖獸不會短暫留在舊 150/15。
if(typeof makeEnemy==='function'&&!makeEnemy._rbFull){const _me=makeEnemy;makeEnemy=function(){const e=_me.apply(this,arguments);try{if(e&&!e.kind&&e.type){if(e.v49lq)rbEnFullAfterLift(e);else rbEnFull(e);}}catch(er){}return e;};makeEnemy._rbFull=1;}
// 抬境發生在 makeEnemy 之後（g20 dgMob、mapSpecialApplyBoss）。這裡在外層補一次，且不與 g13 _xfG 疊乘。
function rbHookLift(){
  try{
    if(typeof dgMob==='function'&&!dgMob._rbLift){
      const _m=dgMob;
      dgMob=function(){const e=_m.apply(this,arguments);try{if(e&&e.v49lq)rbEnFullAfterLift(e);}catch(er){}return e;};
      dgMob._rbLift=1;
    }
  }catch(e){}
  try{
    if(typeof mapSpecialApplyBoss==='function'&&!mapSpecialApplyBoss._rbLift){
      const _a=mapSpecialApplyBoss;
      mapSpecialApplyBoss=function(){const e=_a.apply(this,arguments);try{if(e&&e.v49lq)rbEnFullAfterLift(e);}catch(er){}return e;};
      mapSpecialApplyBoss._rbLift=1;
    }
  }catch(e){}
}
rbHookLift();
try{if(typeof setTimeout==='function'){setTimeout(rbHookLift,0);setTimeout(rbHookLift,200);setTimeout(rbHookLift,800);} }catch(e){}
// 敵－敵分離掛在 separate 最外層（cult_unclump 的 cuApplySeparate 已依 t1409u 留空，且其圍攻槽只給弟子）。玩家／弟子不推。
if(typeof xnEnSeparate==='function'&&typeof separate==='function'&&!separate._xnEnSep){const _sp=separate;separate=function(list){const r=_sp.apply(this,arguments);try{xnEnSeparate();}catch(e){}return r;};separate._xnEnSep=1;}
if(typeof xnEnSepOn==='function'&&typeof chase==='function'&&!chase._xnEnSep){const _ch=chase;chase=function(o,dt,tx,ty,range,spMul){try{if(xnEnSepOn()&&typeof xnEnIs==='function'&&xnEnIs(o)&&o._xnSlot)return _ch.call(this,o,dt,o._xnSlot.x,o._xnSlot.y,range,spMul);}catch(er){}return _ch.apply(this,arguments);};chase._xnEnSep=1;}

// 敵人境界名牌：預設走真實戰鬥境界（g20 TUNE.v51.useReal）。關閉估算法時仍用換算前舊口徑再估，避免新模板把名牌抬到天仙。
if(typeof v51Realm==='function'&&!v51Realm._rbReal){const _vr=v51Realm;v51Realm=function(e){
  if(TUNE.v51&&TUNE.v51.useReal!==false)return _vr.apply(this,arguments);
  const R=e&&e._rb;if(!R||e.kind||!(R.ch>0))return _vr.apply(this,arguments);
  const h=e.maxhp,a=e.atk;e.maxhp=Math.max(1,Math.round(h/R.ch));e.atk=+(a/R.ca).toFixed(1);try{return _vr.apply(this,arguments);}finally{e.maxhp=h;e.atk=a;}};
  v51Realm._rbReal=1;}
// 凡界上限提示：天仙已超出凡界
if(typeof v55CapLine==='function'){const _cl=v55CapLine;v55CapLine=function(s){try{const p=typeof player==='function'?player():null;if(p&&((p.realm|0)>=11||p.ascended))return '已超出凡界：不受凡界上限';}catch(e){}return _cl.apply(this,arguments);};}
try{window.XW_RB={BP:RB_BP,QI:RB_QI,ATTR:RB_ATTR,std:rbStd,old:rbOldStd,unit:rbUnit,sweep:rbSweep,qi:rbQiMax,st:RBS,enFull:rbEnFull,enLift:rbEnFullAfterLift,liftedReady:rbLiftedReady,enTier:rbEnTier,guard:rbApplyGuard,guardOn:rbGuardOn,enSep:typeof xnEnSeparate==='function'?xnEnSeparate:null,enSepOn:typeof xnEnSepOn==='function'?xnEnSepOn:null,
  table:()=>RB_BP.map((_,r)=>{const a=rbStd(r,0),b=rbStd(r,rbN(r)-1);return {r,n:REALMS[r]&&REALMS[r].n,bpm:rbBPm(r),hp:a.hp,atk:a.atk,qi:a.qi,hpTop:b.hp,atkTop:b.atk,qiTop:b.qi,attr:RB_ATTR[r]};})};}catch(e){}
// ?dev=1 測試用：在遊戲作用域內求值（只在金手指模式開啟）
try{if(/[?&]dev=1\b/.test(location.search))window.__rbEv=function(s){return eval(s);};}catch(e){}
// ================== 悟性／氣運／仙緣 改 10～1000 尺度（隊長 11-10 定案：存值 ×10、公式係數 ×0.1，同百分位成功率不變）==================
// TUNE.rb.ax：true＝啟用。啟用時每個主角／弟子／候選／遊歷者 wu、luck、xy 一次性 ×10（u._ax 標記；換算前備份 u._preAX；存檔保留）。
// 關閉時已換算者自動 ÷10 還原（可回滾）。聯機客端不換算（以主機數值為準）。
// g* 舊公式（0～100 口徑）不逐行改：以「舊口徑視圖」包住讀寫這三項的函式——呼叫期間把相關單位的三項暫時 ÷10，
// 結束後還原，並把函式內的增減（例如洗髓丹 +3、上限 100）×10 寫回。數學上等同把係數 ×0.1、上限 100→1000。
// cult*／econ* 由各自擁有者改（係數乘 rbAXk(u)：已換算單位＝0.1，其餘＝1）。
if(TUNE.rb.ax==null)TUNE.rb.ax=false;
const RB_AXK=['wu','luck','xy'];
const RBAX={conv:0,rev:0,lv:0,skip:0};
function rbAX(){return (TUNE.rb&&TUNE.rb.ax)?10:1;}
// 給 cult*／econ* 用的單位倍率：該單位已換算且不在舊口徑視圖中＝0.1，否則＝1（未換算的新單位、旗標關閉、視圖內都不會重複縮放）
function rbAXk(u){if(!(TUNE.rb&&TUNE.rb.ax))return 1;if(u&&u.__lv)return 1;return (u&&u._ax)?0.1:1;}
function rbAxUnit(o){
  if(!o||(!o.kind&&o.type))return;          // 敵人沒有這三項
  if(o.kind!=null&&!/^(player|disciple|cand)$/.test(o.kind))return;
  if(TUNE.rb.ax){
    if(o._ax)return;
    if(!RB_AXK.some(k=>typeof o[k]==='number'))return;
    // 防重複換算：舊口徑悟性／氣運上限 100；任一超過 100 表示已是新口徑（例：由已換算單位複製而來卻未帶 _ax）
    if((o.wu||0)>100||(o.luck||0)>100){o._ax=1;RBAX.skip++;return;}
    o._preAX={wu:o.wu,luck:o.luck,xy:o.xy};
    for(const k of RB_AXK)if(typeof o[k]==='number')o[k]=Math.round(o[k]*10*1000)/1000;
    o._ax=1;RBAX.conv++;
  }else if(o._ax){
    for(const k of RB_AXK)if(typeof o[k]==='number')o[k]=Math.round(o[k]/10*1000)/1000;
    o._ax=0;RBAX.rev++;
  }
}
function rbAxSweep(){if(typeof S==='undefined'||!S||rbClient())return;try{for(const L of [S.units,S.cands,S.wand])if(Array.isArray(L))for(const o of L)rbAxUnit(o);}catch(e){}}
// 舊口徑視圖
function rbLvEnter(list){const sv=[];for(const u of list){if(!u||!u._ax||u.__lv)continue;const o={u};for(const k of RB_AXK)if(typeof u[k]==='number'){o[k]=u[k];u[k]=u[k]/10;o['_'+k]=u[k];}u.__lv=1;sv.push(o);}return sv;}
function rbLvExit(sv){for(const o of sv){const u=o.u;for(const k of RB_AXK)if(o[k]!=null){const d=(typeof u[k]==='number'?u[k]:o['_'+k])-o['_'+k];u[k]=Math.round((o[k]+d*10)*1000)/1000;}u.__lv=0;}}
function rbLvAll(){const a=[];try{for(const L of [S.units,S.cands,S.wand])if(Array.isArray(L))for(const o of L)a.push(o);}catch(e){}return a;}
function rbLvWrap(fn,pick){if(typeof fn!=='function'||fn._rbLv)return fn;const w=function(){
    if(!(TUNE.rb&&TUNE.rb.ax))return fn.apply(this,arguments);
    let sv=[];try{sv=rbLvEnter(pick(arguments));}catch(e){}RBAX.lv++;
    try{return fn.apply(this,arguments);}finally{rbLvExit(sv);}};
  w._rbLv=1;return w;}
const RB_A0=a=>[a[0]],RB_PL=()=>{try{return [player()];}catch(e){return [];}},RB_ALL=()=>rbLvAll();
function rbLvInstall(){
  // g4 cultMul（u.wu/100）、lianqiFail（wu×0.004、luck×0.001）；g12 breakFail（wu×0.002、luck×0.0008）、craftSkill（wu×0.0055）、usePill（洗髓丹上限 100）；
  // g14 giveLuck（0～100）、giveXY；g18 v47NearDeath／g20 v47NearDeath（luck×0.0006）、brkInfo（wu×0.2%）、profCheck、weaponFit、candScore、candGood；
  // g20 v54XyBonus（xy×0.0015，上限 0.15 不變）、v162Shen、v62Cult；g23 xnScore、xevaRate；
  // 以主角為準：g19 scanChance、aucAct；g4 interactStruct（遺跡仙緣 +20）；全員：g14 evChoose（奇遇選項）、g5/g20 updateSect（仙緣閣 +仙緣）
  try{cultMul=rbLvWrap(cultMul,RB_A0);}catch(e){}
  try{lianqiFail=rbLvWrap(lianqiFail,RB_A0);}catch(e){}
  try{breakFail=rbLvWrap(breakFail,RB_A0);}catch(e){}
  try{craftSkill=rbLvWrap(craftSkill,RB_A0);}catch(e){}
  try{usePill=rbLvWrap(usePill,RB_A0);}catch(e){}
  try{giveLuck=rbLvWrap(giveLuck,RB_A0);}catch(e){}
  try{giveXY=rbLvWrap(giveXY,RB_A0);}catch(e){}
  try{v47NearDeath=rbLvWrap(v47NearDeath,RB_A0);}catch(e){}
  try{brkInfo=rbLvWrap(brkInfo,RB_A0);}catch(e){}
  try{profCheck=rbLvWrap(profCheck,RB_A0);}catch(e){}
  try{weaponFit=rbLvWrap(weaponFit,RB_A0);}catch(e){}
  try{candScore=rbLvWrap(candScore,RB_A0);}catch(e){}
  try{candGood=rbLvWrap(candGood,RB_A0);}catch(e){}
  try{v54XyBonus=rbLvWrap(v54XyBonus,RB_A0);}catch(e){}
  try{v162Shen=rbLvWrap(v162Shen,RB_A0);}catch(e){}
  try{v62Cult=rbLvWrap(v62Cult,RB_A0);}catch(e){}
  try{xnScore=rbLvWrap(xnScore,RB_A0);}catch(e){}
  try{xevaRate=rbLvWrap(xevaRate,RB_A0);}catch(e){}
  try{scanChance=rbLvWrap(scanChance,RB_PL);}catch(e){}
  try{aucAct=rbLvWrap(aucAct,RB_PL);}catch(e){}
  try{interactStruct=rbLvWrap(interactStruct,RB_PL);}catch(e){}
  try{evChoose=rbLvWrap(evChoose,RB_ALL);}catch(e){}
  try{updateSect=rbLvWrap(updateSect,RB_ALL);}catch(e){}
}
rbLvInstall();
// 其他檔載入後才包的函式（cult_trib2 等以 setTimeout 再包 breakFail 的情況）：下一拍再補包最外層
try{setTimeout(rbLvInstall,0);setTimeout(rbLvInstall,500);}catch(e){}
if(typeof tickV045==='function'){const _t2=tickV045;tickV045=function(dt){rbAxSweep();return _t2.apply(this,arguments);};}
setInterval(rbAxSweep,250);
try{for(const L of [UNIT_KEEP,DISC_COPY,CAND_KEEP,WAND_KEEP])for(const k of ['_ax','_preAX'])if(L.indexOf(k)<0)L.push(k);}catch(e){}
try{if(window.XW&&Array.isArray(XW.UNIT_KEEP))for(const k of ['_ax','_preAX'])if(XW.UNIT_KEEP.indexOf(k)<0)XW.UNIT_KEEP.push(k);}catch(e){}
if(typeof applySave==='function'){const _as2=applySave;applySave=function(){const r=_as2.apply(this,arguments);try{if(r)rbAxSweep();}catch(e){}return r;};}
try{if(window.XW_RB){XW_RB.ax=RBAX;XW_RB.axSweep=rbAxSweep;}}catch(e){}
