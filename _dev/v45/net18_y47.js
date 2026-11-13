// ===== net18：v0.4.7 第二批（g22）新系統的聯機同步 =====
// 主機為準，成員只顯示：
//  #11 村莊成長 v.g47（含新蓋的民居 vstructs 9600+）、#73 護宗陣 S.flags.y47b、#76 山寨 S.flags.y47c（執行中新建的山寨村莊 id≥100 與營帳 id≥20000）、
//  #116 宗門事務 S.flags.y47ev（u.y47e 仍只在主機）→ 每秒比對，有變才送 {t:'y47'}（只送變動的部分）；新成員加入時全部重送。
//  晚加入的成員：歡迎快照本來就帶 S.flags 與 vg47，g22 的 applySave 會重建山寨與民居（測試有驗）。
//  #113 倒地 u.y47dn／救援 u.y47rs、#70 渡劫 u.y47dj、#54 隨身丹藥 u.pk／u.pkc → 加進 NET_LIVE_U（逐單位差異同步）。
//  #54 成員自己的丹藥設定：Y47.pkSend → 意圖 {a:'pkc'}（主機驗證是自己的化身）；主機也替成員化身自動補丹／服丹（g22 只處理 kind==='player'）。
// 聯機修正（成員化身在主機上是 kind:'disciple' + np）：化身不會被派去當「自動救援」的弟子（會搶走玩家操控），也不吃精力（睡眠）效率懲罰。
// 旗標：NET_FLAGS.y47（?netexp=-y47 關閉同步）；NET_FLAGS.revive（?netexp=-revive 關閉）：
//  聯機玩家救援：其他玩家（成員化身）站在倒地者旁 3 秒就救起（主角原本就會救）；房主主角聯機時也會倒地（附近有同門或其他玩家才倒地，否則照舊直接身隕）。
const NET18={s:{},tx:0,rx:0,pend:null,rev:0,lastRev:null,SENT:{net18:1}};
function netY47On(){return typeof NET_FLAGS==='undefined'||NET_FLAGS.y47!==false;}
function netRevOn(){return typeof NET_FLAGS==='undefined'||NET_FLAGS.revive!==false;}
if(netY47On())for(const k of ['y47dn','y47rs','y47dj','pk','pkc'])if(!NET_LIVE_U.includes(k))NET_LIVE_U.push(k);
const NET18_VK=['id','name','x','y','rel','raidT','raids','warned','destroyed','respT','y47n'];
function netY47Pack0(){const F=S.flags,vg=[],vs=[],st=[];
  for(const v of S.villages){if(v.g47)vg.push([v.id,v.g47]);if(v.id>=100)vs.push(pickKeys(v,NET18_VK));}
  for(const s of S.vstructs)if(s.id>=20000&&s.maxhp)st.push([s.id,s.hp,s.dead?1:0]);
  return {b:F.y47b||null,c:F.y47c||null,ev:F.y47ev||null,vg,vs,st};}
function netY47Pack(){if(S.dg){if(typeof netInR!=='function')return null;return netInR('ow',netY47Pack0)||null;}return netY47Pack0();}
{const _x=netHostTick;netHostTick=function(){const r=_x.apply(this,arguments);try{if(netY47On()&&NET.role==='host'&&NET.tr&&(NET18.dirty||NET.tick%5===0)){NET18.dirty=false;const p=netY47Pack();if(p){const m={t:'y47'};let any=false;
      for(const k in p){const s=JSON.stringify(p[k]);if(NET18.s[k]!==s){NET18.s[k]=s;m[k]=p[k];any=true;}}if(any){NET.tr.broadcast(m);NET18.tx++;}}}}catch(e){console.error('[net] y47 sync',e);}return r;};}
{const _x=netHostRx;netHostRx=function(cid,m){if(m&&m.t==='hello')NET18.s={};return _x.apply(this,arguments);};}
function netY47Apply(m){const F=S.flags;let blk=false;
  if('b' in m)F.y47b=m.b||undefined;if('ev' in m)F.y47ev=m.ev||undefined;if('c' in m)F.y47c=m.c||undefined;
  if(F.y47c&&F.y47c.camps)for(const c of F.y47c.camps)if(!vById(c.id)){y47CampBuild(c);blk=true;}
  for(const o of m.vs||[]){const v=vById(o.id);if(v){if(!!v.destroyed!==!!o.destroyed)blk=true;Object.assign(v,o);}}
  for(const [id,hp,dead] of m.st||[]){const s=sById(id);if(s){if(!!s.dead!==!!dead)blk=true;s.hp=hp;s.dead=!!dead;}}
  for(const [id,g] of m.vg||[]){const v=vById(id);if(!v||!g)continue;v.g47=g;(g.h||[]).forEach(([i,j],k)=>{if(!S.vstructs.some(s=>s.id===9600+v.id*20+k+1)){y47AddHouseStruct(v,i,j,k+1);blk=true;}});}
  if(blk)y47AfterBlock();panelKeyCache=null;}
{const _x=netClientRxExtra;netClientRxExtra=function(m){if(m&&m.t==='y47'){NET18.rx++;const P=NET18.pend||{};NET18.pend=Object.assign(P,m);if(!S.dg){const q=NET18.pend;NET18.pend=null;try{netY47Apply(q);}catch(e){console.error('[net] y47 apply',e);}}return;}return _x.apply(this,arguments);};}
// 成員在副本裡收到的（宗門的 S.vstructs 被換走了）→ 回到宗門再套用
{const _x=update;update=function(dt){const r=_x.apply(this,arguments);try{if(NET18.pend&&NET.role==='client'&&!S.dg){const q=NET18.pend;NET18.pend=null;netY47Apply(q);}}catch(e){}return r;};}
// ---------- #54 隨身丹藥：成員各自設定 ----------
Y47.pkSend=function(u,c){if(!u||!c)return;netIntent({a:'pkc',id:u.id,c:{on:c.on?1:0,n:+c.n,hp:+c.hp}});};
{const _x=netApplyIntent0;netApplyIntent0=function(pk,i){if(i&&i.a==='pkc'){const u=unitById(+i.id),c=i.c||{},T=TUNE.y47p;if(!u||u.np!==pk||!T.hp.includes(+c.hp))return false; // #54：TUNE.y47p.carry 已移除（n 改由境界上限決定），舊檢查會丟例外讓成員設定永遠送不到
    y47PK(u);u.pkc.on=c.on?1:0;u.pkc.hp=+c.hp;NET18.pkc=(NET18.pkc||0)+1;return true;}return _x.apply(this,arguments);};}
// #54 成員「拿取」：倉庫在房主那邊 → 改送意圖，由房主檢查距離與庫存後扣倉、加到成員化身（避免成員本機憑空多藥／不扣倉）
{const _t=y47PkTake;y47PkTake=function(u,want){if(typeof v49Client==='function'&&v49Client()&&u&&u.np===NET.pkey){const n=Math.max(0,Math.floor(+want||0));if(n>0){netIntent({a:'pktake',id:u.id,n});toast('已向房主領取回血丹…');}return 0;}return _t.apply(this,arguments);};}
{const _x=netApplyIntent0;netApplyIntent0=function(pk,i){if(i&&i.a==='pktake'){const u=unitById(+i.id),n=Math.floor(+i.n||0);if(!u||u.np!==pk||u.dead||!(n>=1&&n<=y47PkCap(u)))return false;
    const t0=toast;let got=0;toast=()=>{};try{got=y47PkTake(u,n);}finally{toast=t0;}NET18.pktake=(NET18.pktake||0)+1;return got>0;}return _x.apply(this,arguments);};}
function netMyAvSel(){if(NET.role!=='client'||selUnits.length!==1)return null;const u=unitById(selUnits[0]);return u&&u.np===NET.pkey?u:null;}
// 面板：成員選自己的化身 → 顯示跟主角一樣的丹藥按鈕（化身在資料上是 kind:'disciple'，只在這次呼叫內當成主角）
{const _x=y47Panel;y47Panel=function(){const u=netMyAvSel();if(!u)return _x.apply(this,arguments);const k=u.kind;u.kind='player';try{return _x.apply(this,arguments);}finally{u.kind=k;}};}
window.addEventListener('click',ev=>{const b=ev.target&&ev.target.closest&&ev.target.closest('[data-y47p]');if(!b)return;const u=netMyAvSel();if(!u)return;ev.stopPropagation();ev.preventDefault();
  y47PK(u);const T=TUNE.y47p,c=u.pkc,k=b.dataset.y47p,nx=(arr,v)=>arr[(arr.indexOf(v)+1)%arr.length];if(k==='n')c.n=nx(T.carry,c.n);else if(k==='on')c.on=c.on?0:1;else if(k==='hp')c.hp=nx(T.hp,c.hp);
  Y47.pkSend(u,c);y47Panel();},true);
// 主機：成員化身也自動補丹／服丹（用各自的設定）
{const _x=y47PkTick;y47PkTick=function(){const r=_x.apply(this,arguments);if(NET.role==='host')for(const u of S.units){if(!u.np||u.dead||u.y47dn)continue;y47PK(u);if(!u.pkc.on)continue;
    if(!S.dg)y47PkRefill(u);if(u.hp<u.maxhp*u.pkc.hp&&S.time-(u.y47pT==null?-1e9:u.y47pT)>=TUNE.y47p.cd)y47PkUse(u);}return r;};}
// 化身＝玩家：沒有精力（睡眠）效率懲罰
{const _x=y47Eff;y47Eff=function(u){if(u&&u.np)return 1;return _x.apply(this,arguments);};}
// ---------- #113 倒地救援 ----------
function netPcOf(o){return !!o&&(!!o.np||(o.kind==='player'&&o===netHostPlayerU()));}
function netY47PcNear(u,R){for(const o of S.units){if(o===u||!netPcOf(o)||o.dead||o.y47dn||o.inside)continue;if(typeof netIsOff==='function'&&netIsOff(o))continue;if(dist(o.x,o.y,u.x,u.y)<=R)return o;}return null;}
{const _x=y47DnOk;y47DnOk=function(u){if(netRevOn()&&NET.role==='host'&&u&&u.kind==='player'&&!u.np&&!S.dg&&!u.inside&&u===netHostPlayerU())return !!u.y47dn||y47HasRescuer(u)||!!netY47PcNear(u,TUNE.y47n.rescR);return _x.apply(this,arguments);};}
{const _x=y47DnTick;y47DnTick=function(dt){if(NET.role!=='host')return _x.apply(this,arguments);
  // 化身不當「自動救援弟子」：g22 挑人時會略過 y47dj（渡劫中）的人 → 呼叫期間暫時標上
  const av=[];for(const o of S.units)if(o.np&&!o.y47dj){av.push([o,o.y47dj]);o.y47dj=NET18.SENT;}if(av.length)for(const o of S.units)if(o.y47rs&&o.np)o.y47rs=null;
  let r;try{r=_x.apply(this,arguments);}finally{for(const [o,v] of av)if(o.y47dj===NET18.SENT){if(v===undefined)delete o.y47dj;else o.y47dj=v;}}
  if(!netRevOn())return r;const T=TUNE.y47n,host=netHostPlayerU();
  for(const u of S.units){const D=u.y47dn;if(!D)continue;let by=null;
    for(const o of S.units){if(o===u||!o.np||o.dead||o.y47dn||o.inside)continue;if(typeof netIsOff==='function'&&netIsOff(o))continue; // 房主主角由 g22 自己處理
      if(dist(o.x,o.y,u.x,u.y)<=T.pR&&S.time-(o.lastHit==null?-99:o.lastHit)>1.5){by=o;break;}}
    if(by){D.pq=(D.pq||0)+dt;if(D.pq>=T.revT[1]){y47Revive(u,by);NET18.rev++;NET18.lastRev={id:u.id,by:by.id,t:S.time};continue;}}else D.pq=0;
    if(D.pq)D.pp=Math.max(D.pp||0,D.pq);}
  return r;};}
// 測試掛鉤
{const _x=XW045;XW045=function(){const o=_x.apply(this,arguments);if(o.net){o.net.y47={st:()=>({tx:NET18.tx,rx:NET18.rx,rev:NET18.rev,lastRev:NET18.lastRev,pkc:NET18.pkc||0,pend:!!NET18.pend,flags:{y47:netY47On(),revive:netRevOn()}}),pack:()=>netY47Pack(),
    dirty:()=>{NET18.dirty=true;},selU:id=>{selUnits=[id];selBuilding=null;selOther=null;panelKeyCache=null;try{renderPanel();}catch(e){}return selUnits.slice();},campNew:()=>{const v=y47CampNew(true);return v?v.id:null;},grow:id=>{const v=vById(id);return v?y47GrowHouse(v):false;},
    dnOk:id=>y47DnOk(unitById(id)),down:id=>{const u=unitById(id);if(!u)return false;y47Down(u);return true;},
    hit:(id,amt)=>{const u=unitById(id);if(!u)return null;dmgUnit(null,u,amt);return {hp:u.hp,dn:!!u.y47dn,dead:!!u.dead,alive:S.units.includes(u)};}};}return o;};}
// ---- #189 成員化身採集：跟房主的主角一樣（右鍵／點擊／互動鍵直接採集、不受背包 10 上限、資源直接進宗門、揮動動畫與 +N 飄字大家都看得到）----
// 旗標 netexp=gather（預設開）。成員端把採集意圖轉給主機；主機對該化身跑原本的 runTask 採集（g4：S.res++、floater、gainXiu），不走弟子 job／carry。
function netGatherOn(){return typeof NET_FLAGS==='undefined'||NET_FLAGS.gather!==false;}
const NET19={fq:[],rx:0,sent:0,intents:0};
if(netGatherOn()&&!NET_LIVE_U.includes('netGat'))NET_LIVE_U.push('netGat');
function netGatherFree(u){if(u.carry&&u.carry.amt>0&&S.res[u.carry.type]!=null)S.res[u.carry.type]+=u.carry.amt;u.carry=null;u.job=null;u.jobRes=null;u.jnode=null;u.aiJob=null;}
// 成員端：自己的化身要採集 → 意圖
{const _x=setTask;setTask=function(u,t){if(NET.role==='client'&&netGatherOn()&&u&&u.np===NET.pkey&&t&&t.type==='gather'){netIntent({a:'gather',id:u.id,nid:+t.nodeId});u.job=null;u.jobRes=null;u.jnode=null;return;}return _x.apply(this,arguments);};}
// 成員端右鍵資源點：自己的化身走主角那條路（setTask gather），不當弟子派工
{const _x=rightClick;rightClick=function(mx,my){const me=NET.role==='client'&&!S.interior&&!buildMode?netAvatarOf(NET.pkey):null;
  if(!me||me.kind!=='disciple')return _x.apply(this,arguments);let sw=false;try{const w=screenToWorld(mx,my);sw=!enemyAt(w)&&!structAt(w)&&(!!nodeAt(w)||(()=>{const b=buildingAt(w);return !!b&&canEnter(b)&&!b.upg&&!(b.hp<b.maxhp);})());}catch(e){}
  if(!sw)return _x.apply(this,arguments);me.kind='player';try{return _x.apply(this,arguments);}finally{me.kind='disciple';}};}
// 主機：採集意圖
{const _x=netApplyIntent0;netApplyIntent0=function(pk,i){if(i&&i.a==='gather'){if(!netGatherOn())return false;const u=unitById(+i.id);if(!u||u.np!==pk||u.dead||u.y47dn)return false;
  const n=nodeById(+i.nid);if(!n||n.amount<=0||!nodeMinable(n))return false;netGatherFree(u);u.holdAt=null;u.guardAt=null;u.medit=false;setTask(u,{type:'gather',nodeId:n.id});NET19.intents++;return true;}return _x.apply(this,arguments);};}
// 主機：化身若被別條路派成採集職務（舊存檔／快捷鈕），改成主角式直接採集，背負的先入庫
{const _x=updateDisciple;updateDisciple=function(u,dt){if(u&&u.np&&u.job==='gather'&&NET.role==='host'&&netGatherOn()){const nid=u.jnode;netGatherFree(u);const n=nid!=null?nodeById(nid):null;if(n&&n.amount>0&&nodeMinable(n)&&!u.task)setTask(u,{type:'gather',nodeId:n.id});}return _x.apply(this,arguments);};}
// 主機：玩家角色（主角／化身）採集時，記下 netGat 給成員畫揮動，飄字排入廣播
{const _x=updateUnit;updateUnit=function(u){if(u&&u.netGat)u.netGat=0;return _x.apply(this,arguments);};}
{const _x=runTask;runTask=function(u,dt,t){if(!(t&&t.type==='gather'&&NET.role==='host'&&netGatherOn()&&netPcOf(u)))return _x.apply(this,arguments);
  const f0=floater;floater=function(x,y,tx,c){if(NET19.fq.length<40)NET19.fq.push([Math.round(x*100)/100,Math.round(y*100)/100,String(tx),c||'#fff',u.id]);return f0.apply(this,arguments);};
  try{return _x.apply(this,arguments);}finally{floater=f0;u.netGat=u.working&&u.task===t?(+t.nodeId||0):0;}};}
{const _x=netHostTick;netHostTick=function(){const r=_x.apply(this,arguments);if(NET19.fq.length){const f=NET19.fq.splice(0);if(NET.tr&&netGatherOn()){NET.tr.broadcast({t:'gfl',f});NET19.sent+=f.length;}}return r;};}
// 成員端：飄字＋揮動
{const _x=netClientRxExtra;netClientRxExtra=function(m){if(m&&m.t==='gfl'){const f=m.f||[];NET19.rx+=f.length;if(!S.dg&&!S.interior)for(const a of f)floater(a[0],a[1],a[2],a[3]);return;}return _x.apply(this,arguments);};}
{const _x=drawHuman;drawHuman=function(u){if(NET.role!=='client'||!u||!u.netGat||(u.task&&u.task.type!=='gather'))return _x.apply(this,arguments);
  const w0=u.working,t0=u.task;u.working=true;u.task=t0||{type:'gather',nodeId:u.netGat};try{return _x.apply(this,arguments);}finally{u.working=w0;u.task=t0;}};}
// ---- #191 其他玩家角色的面板只供檢視：拿掉所有指令（職務／指派、原地休整、行囊、選同職務、定位、採集目標…），右鍵移動也無效；
// 任何玩家角色（含自己的化身）不顯示弟子專屬欄位（背負 x/10、職務、選同職務、贈禮、逐出）。保留名字、境界、血條、突破資訊與 總覽／屬性／裝備／關係／歷練 分頁。
function netPcroOn(){return typeof NET_FLAGS==='undefined'||NET_FLAGS.pcro!==false;}
function netOtherPc(u){if(!u||!netPcroOn()||typeof NET==='undefined'||!NET.role||NET.actAs||(typeof NET17!=='undefined'&&NET17.noCmdGuard))return false;if(NET.role==='host')return !!u.np;return (!!u.np&&u.np!==NET.pkey)||(u.kind==='player'&&u!==player());}
function netAnyPcAv(u){return netPcroOn()&&!!u&&!!u.np&&!!(typeof NET!=='undefined'&&NET.role);}
{const st=document.createElement('style');st.id='net191css';st.textContent=`
#panel.netro button:not(.x47pclose):not(.v55t),#panel.netro select,#panel.netro .btn:not(.v55t),#panel.netro .v55job,#panel.netro .v55act,#panel.netro .v55jpop,#panel.netro #pd_carry,#panel.netro .v55k{display:none!important}
#panel.netpav .v55job,#panel.netpav .v55jpop,#panel.netpav #pd_carry,#panel.netpav [data-job],#panel.netpav [data-act="samejob"],#panel.netpav [data-act="gift"],#panel.netpav [data-act="kick"],#panel.netpav .v55k{display:none!important}
#panel .netro-tag{display:inline-block;margin:4px 0;padding:2px 8px;border-radius:4px;background:#2a3a4a;color:#cfe3ff;font-size:12px}`;
  (document.head||document.documentElement).appendChild(st);}
{const _x=renderPanel;renderPanel=function(){const r=_x.apply(this,arguments);try{const pn=document.getElementById('panel');if(!pn)return r;
  const u=selUnits.length===1?unitById(selUnits[0]):null,ro=netOtherPc(u),pav=!ro&&netAnyPcAv(u);
  pn.classList.toggle('netro',ro);pn.classList.toggle('netpav',pav);
  let tg=pn.querySelector('.netro-tag');if(ro){if(!tg){tg=document.createElement('div');tg.className='netro-tag';const h=pn.querySelector('.v55pane[data-p="ov"] .v55m')||pn.querySelector('.v55pane')||pn;h.insertBefore(tg,h.firstChild);}tg.textContent='👤 其他玩家的角色（只能檢視）';if(u.kind==='player'&&NET.role==='client'){const h4=pn.querySelector('h4');if(h4)for(const n of h4.childNodes)if(n.nodeType===3&&n.nodeValue.includes('你（主角）'))n.nodeValue=n.nodeValue.replace('你（主角）',(u.name&&!/^你/.test(u.name)?u.name:'房主')+'（房主）');}}else if(tg)tg.remove();}catch(e){}return r;};}
{const _x=commandUnits;commandUnits=function(){const us=_x.apply(this,arguments);if(!Array.isArray(us)||!us.some(netOtherPc))return us;return us.filter(u=>!netOtherPc(u));};}
{const _x=XW045;XW045=function(){const o=_x.apply(this,arguments);if(o.net){o.net.gather={st:()=>({fq:NET19.fq.length,rx:NET19.rx,sent:NET19.sent,intents:NET19.intents,on:netGatherOn()}),
  scr:nid=>{const n=nodeById(nid);if(!n)return null;const p=iso(n.i+0.5,n.j+0.5);return {x:(p.x-cam.x)*cam.zoom+W/2,y:(p.y-cam.y)*cam.zoom+H/2};},
  rc:nid=>{const me=player();const n=nodeById(nid);if(!me||!n)return false;selUnits=[me.id];const p=iso(n.i+0.5,n.j+0.5);rightClick((p.x-cam.x)*cam.zoom+W/2,(p.y-cam.y)*cam.zoom+H/2,false);return true;},
  floats:()=>floaters.map(f=>f.text),focus:id=>{const u=unitById(id);if(!u)return false;const p=iso(u.x,u.y);cam.x=p.x;cam.y=p.y;return true;},
  near:id=>{const u=unitById(id);if(!u)return null;for(const r of ['wood','stone','herb']){const n=findNearestNode(r,u.x,u.y,40,u);if(n)return {id:n.id,type:NODE_RES[n.type],amt:n.amount};}return null;},
  amt:(nid,v)=>{const n=nodeById(nid);if(!n)return null;if(v!=null){n.amount=v;S.nodeMods[n.id]=v;}return n.amount;},
  cmdU:()=>commandUnits().map(u=>u.id),ro:()=>{const pn=document.getElementById('panel');return pn?{ro:pn.classList.contains('netro'),pav:pn.classList.contains('netpav'),btns:[...pn.querySelectorAll('button,select')].filter(b=>b.offsetParent!==null&&!b.matches('.x47pclose,.v55t')).map(b=>b.textContent.trim()),tabs:[...pn.querySelectorAll('.v55t')].map(b=>b.textContent.trim()),carry:!!(pn.querySelector('#pd_carry')&&pn.querySelector('#pd_carry').offsetParent&&pn.querySelector('#pd_carry').textContent.trim()),job:!!(pn.querySelector('.v55job')&&pn.querySelector('.v55job').offsetParent),txt:pn.innerText.slice(0,400)}:null;},
  rcAt:(x,y)=>{const p=iso(x,y);rightClick((p.x-cam.x)*cam.zoom+W/2,(p.y-cam.y)*cam.zoom+H/2,false);return true;},
  u:id=>{const u=unitById(id);return u?{x:u.x,y:u.y,task:u.task&&u.task.type,nid:u.task&&u.task.nodeId,job:u.job||null,carry:u.carry||null,working:!!u.working,netGat:u.netGat||0,kind:u.kind}:null;}};}return o;};}

// ---------- #193 成員移動全面檢查：方向鍵／搖桿、傳送石碑、離線標籤 ----------
// 根因：成員端不跑本地模擬（netClientUpdate 只做插值），joyVec() 從沒送給房主 → 成員的方向鍵／搖桿完全沒反應；
// 石碑的靜坐／傳送只在成員本機改座標 → 下一包位置又被拉回去（橡皮筋）；成員走到石碑旁也不會「發現」石碑。
const NET20={joy:null,joyT:0,sent:0,rx:0,shr:'',camT:0,camFrom:null};
{const _x=netClientUpdate;netClientUpdate=function(dt){const r=_x.apply(this,arguments);try{if(NET.role!=='client'||!S||(S.dg&&!NET.dgCoop))return r;
    const me=netAvatarOf(NET.pkey),now=performance.now();if(!me||me.dead)return r;
    const jv=(S.interior||typeof joyVec!=='function')?null:joyVec();
    if(jv){const L=NET20.joy,ch=!L||Math.hypot(L.x-jv.x,L.y-jv.y)>0.2;if(ch||now-NET20.joyT>120){NET20.joy={x:+jv.x.toFixed(3),y:+jv.y.toFixed(3)};NET20.joyT=now;NET20.sent++;netIntent({a:'joy',x:NET20.joy.x,y:NET20.joy.y});}
      if(me.shrineGoal!=null)me.shrineGoal=null;}
    else if(NET20.joy){NET20.joy=null;NET20.sent++;netIntent({a:'joy',x:0,y:0});}
    // 走去石碑：抵達就開石碑面板（房主那邊由 tickShrines 處理主角；成員在本機判斷）
    if(me.shrineGoal!=null){const s=shrineById(me.shrineGoal);if(s&&dist(me.x,me.y,s.x,s.y)<2.2){me.shrineGoal=null;openShrine(s);}else if(!s||now-(me._shrT||(me._shrT=now))>30000){me.shrineGoal=null;me._shrT=0;}}
    else me._shrT=0;
    // 傳送後鏡頭跟到新位置
    if(NET20.camT&&NET20.camFrom){if(dist(me.x,me.y,NET20.camFrom.x,NET20.camFrom.y)>4){const q=iso(me.x,me.y);cam.x=q.x;cam.y=q.y;cam.follow=true;reveal(me.x,me.y,10);mmDirty=true;NET20.camT=0;}else if(now-NET20.camT>4000)NET20.camT=0;}
  }catch(e){}return r;};}
// 房主：套用成員的搖桿方向（和 updatePlayer 同樣的速度與自動近戰）
{const _x=netApplyIntent0;netApplyIntent0=function(pk,i){if(NET.role==='host'&&i&&i.a==='joy'){const a=netAvatarOf(pk);if(!a||a.dead||a.inside)return false;
    let x=+i.x||0,y=+i.y||0;const m=Math.hypot(x,y);if(!isFinite(m))return false;if(m>1){x/=m;y/=m;}NET20.rx++;
    if(m<0.01){a._joy=null;if(a.manual){a.manual=false;a.dvx=a.dvy=0;}return true;}
    a._joy={x,y,t:performance.now()};return true;}
  return _x.apply(this,arguments);};}
{const _x=updateDisciple;updateDisciple=function(u,dt){if(NET.role==='host'&&u&&u.np&&u._joy){const J=u._joy;
    if(performance.now()-J.t>600||u.dead||u.inside){u._joy=null;if(u.manual){u.manual=false;u.dvx=u.dvy=0;}}
    else{if(u.task||u.medit)setTask(u,null);u.queue=[];u.path=[];u.job=null;u.jobB=null;u.aiJob=null;
      const sp=u.speed*TUNE.moveMul*(u.slowT>0?0.5:1)*(terrain[(u.y|0)*N+(u.x|0)]===T.SHALLOW?0.6:1);u.dvx=J.x*sp;u.dvy=J.y*sp;u.manual=true;u.working=false;
      if(!u.medit&&u.cd<=0){const e=nearestEnemy(u.x,u.y,u.r+0.95);if(e){faceTo(u,e.x,e.y);if(!tryAbilities(u,e))meleeHit(u,e);}}
      return;}}
  return _x.apply(this,arguments);};}
// 石碑：靜坐／傳送交給房主以成員化身執行；房主的鏡頭、石碑面板、復甦點不受影響
{const run=(f,near)=>(pk,a,args)=>{const s=typeof args[0]==='number'&&shrineById(args[0]);if(!s||!shrFound(s)||a.inside)return false;
    if(near){const cur=shrines().find(o=>dist(o.x,o.y,a.x,a.y)<3);if(!cur)return false;}
    const c={x:cam.x,y:cam.y,f:cam.follow},so=shrineOpen,cs=closeShrine,rs=S.flags.shr.rs,rp=renderShrine;closeShrine=()=>{};renderShrine=()=>{};
    try{const r=netAsMember(a,()=>f(s));if(f===NET_FWD.shrineRest.f){a.netRs=s.id;S.flags.shr.rs=rs;}return r!==false;}
    finally{closeShrine=cs;renderShrine=rp;shrineOpen=so;cam.x=c.x;cam.y=c.y;cam.follow=c.f;}};
  shrineTravel=netFwd('shrineTravel',shrineTravel,true,{max:1,chk:a=>typeof a[0]==='number',run:run(shrineTravel,true)});
  shrineRest=netFwd('shrineRest',shrineRest,0,{max:1,chk:a=>typeof a[0]==='number',run:run(shrineRest,true)});
  NET_FWD.shrineTravel.o.run=run(NET_FWD.shrineTravel.f,true);NET_FWD.shrineRest.o.run=run(NET_FWD.shrineRest.f,true);
  const _t=shrineTravel;shrineTravel=function(to){if(NET.role==='client'){const me=netAvatarOf(NET.pkey);if(!me||me.dead||!to||!shrFound(to))return false;
      NET20.camFrom={x:me.x,y:me.y};NET20.camT=performance.now();fx('ring',me.x,me.y,'#8fe8ff');closeShrine();netIntent({a:'call',f:'shrineTravel',args:[to.id]});return true;}
    return _t.apply(this,arguments);};
  const _r=shrineRest;shrineRest=function(s){if(NET.role==='client'){const me=netAvatarOf(NET.pkey);if(!me||!s)return 0;fx('ring',me.x,me.y,'#8fe8ff');fx('break',me.x,me.y,'#8fe8ff');
      netIntent({a:'call',f:'shrineRest',args:[s.id]});setTimeout(()=>{try{if(shrineOpen!=null)renderShrine();}catch(e){}},600);return 0;}
    return _r.apply(this,arguments);};}
// 房主：成員化身走近也會發現石碑；已發現清單同步給成員
{const _x=tickShrines;tickShrines=function(){const r=_x.apply(this,arguments);try{if(NET.role!=='host'||!S.flags.shr)return r;
    for(const a of S.units){if(!a.np||a.dead||a.inside)continue;for(const s of shrines())if(!shrFound(s)&&dist(a.x,a.y,s.x,s.y)<7){S.flags.shr.found.push(s.id);fx('ring',s.x,s.y,'#8fe8ff');mmDirty=true;(NET20.nw||(NET20.nw=[])).push({pk:a.np,n:s.name});}}
  }catch(e){}return r;};}
{const _x=netHostTick;netHostTick=function(){const r=_x.apply(this,arguments);try{if(NET.role==='host'&&S&&S.flags.shr){const k=S.flags.shr.found.join(',');
      if(k!==NET20.shr||NET20.nw){NET20.shr=k;NET.tr.broadcast({t:'shr',f:S.flags.shr.found.slice(),nw:NET20.nw||[]});NET20.nw=null;}}}catch(e){}return r;};}
{const _x=netClientRxExtra;netClientRxExtra=function(m){if(m&&m.t==='shr'){try{if(!S.flags.shr)S.flags.shr={found:[0],rs:0};S.flags.shr.found=(m.f||[]).map(Number);mmDirty=true;
      for(const w of m.nw||[])if(w.pk===NET.pkey){const s=shrines().find(o=>o.name===w.n);if(s){fx('ring',s.x,s.y,'#8fe8ff');ping(s.x,s.y);}toast(`發現「${w.n}」：靠近點石碑可靜坐、傳送`);}
      if(shrineOpen!=null)renderShrine();}catch(e){}return true;}
  return _x.apply(this,arguments);};}
// 斷線（逾時）後成員其實還連著、還在送心跳 → 房主以前直接忽略這些訊息，成員永遠停在「離線修煉中」。
// 現在：房主收到「沒有登記的連線」送來的訊息、且有成員在離線名單上 → 請它重送 hello，立刻接回原化身
{const _x=netHostRx;netHostRx=function(cid,m){try{if(NET.role==='host'&&m&&m.t!=='hello'&&!NET.cid2pk.has(cid)){const now=Date.now();NET20.rh=NET20.rh||{};
      if(now-(NET20.rh[cid]||0)>2000&&Array.from(NET.players.values()).some(p=>!p.host&&!p.online)){NET20.rh[cid]=now;NET.tr.send(cid,{t:'rehi'});}return;}}catch(e){}
  return _x.apply(this,arguments);};}
{const _x=netClientRx;netClientRx=function(m){if(m&&m.t==='deny')NET20.denied=true;
  if(m&&m.t==='rehi'){NET.lastRx=Date.now();if(NET.role==='client'&&NET.tr&&!NET20.denied){try{NET.tr.send('host',netHelloMsg());netLog('rehello');}catch(e){}}return;}
  return _x.apply(this,arguments);};}
// 離線標籤：成員一傳訊息（重連 hello、心跳、任何意圖）就立刻清掉，不等每秒掃描
{const _x=netHostRx;netHostRx=function(cid,m){const r=_x.apply(this,arguments);try{if(NET.role==='host'&&typeof netOffMark==='function'){const pk=NET.cid2pk.get(cid),p=pk&&NET.players.get(pk);
      if(p&&p.online){const a=netAvatarOf(pk);if(a&&a.netOff)netOffMark(a);}}}catch(e){}return r;};}
{const _x=XW045;XW045=function(){const o=_x.apply(this,arguments);if(o.net){o.net.mv={st:()=>({sent:NET20.sent,rx:NET20.rx,joy:NET20.joy}),
  key:(k,v)=>{keys[k]=!!v;},joy:(x,y)=>{if(x==null){joy.active=false;joy.x=joy.y=0;}else{joy.active=true;joy.x=x;joy.y=y;}},
  shr:()=>({found:(S.flags.shr||{}).found,list:shrines().map(s=>({id:s.id,x:s.x,y:s.y,n:s.name})),open:shrineOpen}),
  goShrine:id=>goShrine(shrineById(id)),tp:id=>shrineTravel(shrineById(id)),rest:id=>shrineRest(shrineById(id)),
  pk:()=>NET.pkey,players:()=>Array.from(NET.players.values()).map(p=>({pk:p.pkey,on:p.online,name:p.name})),
  av:pk=>{const a=netAvatarOf(pk);return a&&{id:a.id,x:a.x,y:a.y,off:!!a.netOff,dead:!!a.dead,inside:a.inside||null,task:a.task&&a.task.type,hp:a.hp,maxhp:a.maxhp};},
  avs:()=>S.units.filter(u=>u.np).map(u=>({id:u.id,pk:u.np,off:!!u.netOff})),
  tab:()=>netTabId(),cam:()=>Math.round(cam.x*10)/10+','+Math.round(cam.y*10)/10,drop:pk=>{const p=NET.players.get(pk);if(p)netHostDrop(p.cid);},hb:()=>{try{netClientPulse(true);}catch(e){}}};}return o;};}
// ---------- v0.4.8 #206 村莊委託（聯機）：成員接下／回報改由房主執行；委託進度、關係由房主同步 ----------
// 原本成員按「接下委託」只改到自己本機（房主不知道），擊殺又只在房主判定 → 成員畫面永遠 0/N；送貨委託在成員端扣的資源也會被房主蓋回。
{const chk=a=>a.length===1&&netIsId(a[0]);
  acceptQuest=netFwd('acceptQuest',acceptQuest,false,{max:1,chk,strict:true,after:()=>{NET18.dirty=true;}});
  completeQuest=netFwd('completeQuest',completeQuest,false,{max:1,chk,strict:true,after:()=>{NET18.dirty=true;}});}
{const _p=netY47Pack0;netY47Pack0=function(){const o=_p.apply(this,arguments);o.vq=S.villages.filter(v=>v.type!=='bandit'&&!(v.id>=100)).map(v=>[v.id,v.quest||null,v.rel,v.qcd||0,v.qn||0]);return o;};}
{const _a=netY47Apply;netY47Apply=function(m){_a.apply(this,arguments);if(!m.vq)return;for(const [id,q,rel,qcd,qn] of m.vq){const v=vById(id);if(!v)continue;const o=v.quest;if(o&&q&&o.accepted&&q.type==='hunt'&&q.got>(o.got||0)){try{const p=player();if(p)floater(p.x,p.y-0.9,`委託 ${q.got}/${q.count}`,'#ffd34d');if(q.got>=q.count)toast(`${v.name}的委託「討伐妖獸」已達成，回村莊回報完成`);}catch(e){}}v.quest=q;v.rel=rel;v.qcd=qcd;v.qn=qn;}
  try{if(typeof tradeOpen!=='undefined'&&tradeOpen!=null)renderTradeSoon();}catch(e){}};}
// 擊殺計數、完成時：立即補送（不用等 5 tick）
{const _k=questHuntKill;questHuntKill=function(){const r=_k.apply(this,arguments);if(typeof NET!=='undefined'&&NET.role==='host')NET18.dirty=true;return r;};}
