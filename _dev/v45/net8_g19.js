// ================== v0.5 聯機：g19（第三批：聲望／拍賣會／比武大會／神識探查／副本引導撤離）轉送（net8_g19.js）==================
// 成員端不在本機執行，送給房主；房主以「該成員的化身」為 player() 執行 g19 原函式（拍賣、比武、神識探查），
// 原本的檢查（靈石不足、冷卻、距離 12 格、已是最高出價……）照常生效，提示訊息轉回該成員。
// 副本撤離（dgRetreatCh）：原函式監看的是房主主角、完成時 dgExit 會讓整隊離開，所以成員版改成「該成員自己的引導撤離」：
//   在出口／已通關 → 該成員直接帶著化身離隊（net5 的 netDgLeave）；否則開始引導 dgChT() 秒，移動或受傷就中斷，再按一次取消。
// 另外：S.flags.v48（聲望、拍賣會、比武大會）與流浪者的探查結果不在 st 同步內，這裡每秒（或轉送操作後立即）補送 {t:'v48'}。
// 依賴：net2（NET、netIntent、player 包裝）、net4（netFwd 登記表）、net5（netDgLeave、netClientRxExtra）。
const netIsId=v=>Number.isInteger(+v)&&+v>0&&String(v).length<=12;
const NET_G19_CHK={
  aucAct:a=>a.length>=1&&a.length<=2&&['small','big','press','insight','pass'].includes(a[0])&&(a[1]==null||(String(a[1]).length<=4&&/^\d*$/.test(String(a[1])))),
  tourRun:a=>a.length<=1&&(a[0]==null||(Array.isArray(a[0])&&a[0].length<=3&&a[0].every(netIsId))),
  v48Scan:a=>a.length===1&&netIsId(a[0]),
  dgRetreatCh:a=>a.length===0};
// 神識探查會改選取目標：房主自己的選取不跟著變（keepSel）；成功後立即補送 v48
{const g19=(name,orig,o)=>netFwd(name,orig,false,Object.assign({chk:NET_G19_CHK[name],keepSel:true,strict:true,after:()=>{NET._v48dirty=true;}},o||{}));
  aucAct=g19('aucAct',aucAct);
  tourRun=g19('tourRun',tourRun,{trim:true,fix:a=>{if(a[0])a[0]=a[0].map(Number);return a;}});
  v48Scan=g19('v48Scan',v48Scan,{fix:a=>[+a[0]]});
  dgRetreatCh=g19('dgRetreatCh',dgRetreatCh,{run:(pk,a)=>netDgChMember(pk,a)});}
// 成員在副本裡按「撤離」：改走引導撤離（取代 net5 的立即離隊）
{const _x=dgRetreat;dgRetreat=function(){if(NET.role==='client'&&S.dg){dgRetreatCh();return;}return _x.apply(this,arguments);};}
// ---------- 房主端：執行 ----------
NET.dgCh=new Map(); // pk → {t,T,x,y,hp}
function netDgChMember(pk,a){const D=S.dg;const p=NET.players.get(pk);
  // 倒下改觀戰後化身已不在副本單位列：撤離只補送宗門權威 full（與 netApplyDg !inDg 相同），不新增 ACK、不讓成員端自行切場
  if(a&&(!D||!S.units.includes(a))){if(p)p.spec=false;if(p&&p.online&&p.cid!=null)netDgSendOut(p,'retreat');netLog('dg retreat already out',pk);return true;}
  if(!D||!D.party||!S.units.includes(a))return false;
  if(D.cleared||dist(a.x,a.y,D.ent.x,D.ent.y)<2||(D.exitP&&dist(a.x,a.y,D.exitP.x,D.exitP.y)<2)){NET.dgCh.delete(pk);netLog('dg retreat at exit',pk);toast('撤離副本');netDgLeave(a,'retreat');return true;}
  if(NET.dgCh.has(pk)){NET.dgCh.delete(pk);netLog('dg channel cancel',pk);toast('取消撤離');netDgChTell(pk,{st:'cancel'});return false;}
  const T=dgChT();NET.dgCh.set(pk,{t:0,T,x:a.x,y:a.y,hp:a.hp});setTask(a,null);a.path=[];netLog('dg channel start',pk,T+'s');toast(`開始引導撤離（${T} 秒）：保持不動、別被打斷`);netDgChTell(pk,{st:'start',T});return true;}
function netDgChTell(pk,o,msg){const p=NET.players.get(pk);if(!p||!p.cid||!NET.tr)return;try{NET.tr.send(p.cid,Object.assign({t:'dgch'},o));if(msg)NET.tr.send(p.cid,{t:'toast',msgs:[msg]});}catch(e){}}
{const _x=dgUpdate;dgUpdate=function(dt){_x.apply(this,arguments);if(NET.role!=='host'||!NET.dgCh.size)return;const D=S.dg;
  for(const [pk,c] of [...NET.dgCh]){const a=netAvatarOf(pk);
    if(!D||!a||a.dead||!S.units.includes(a)){NET.dgCh.delete(pk);continue;}
    // 成員化身在副本裡會被隊友 AI 帶著走（房主主角不會）→ 引導中由房主把它釘在原地；只有「成員自己下移動指令」或掉血才打斷
    if(c.mv||a.hp<c.hp-0.5){NET.dgCh.delete(pk);netLog('dg channel broken',pk,c.mv?'move intent':'','hp',Math.round(c.hp)+'→'+Math.round(a.hp));netDgChTell(pk,{st:'broken'},'撤離被打斷！');continue;}
    a.x=c.x;a.y=c.y;a.path=[];if(a.task)setTask(a,null);
    c.hp=Math.max(c.hp,a.hp);c.t+=dt;if(c.t>=c.T){NET.dgCh.delete(pk);netLog('dg channel done',pk);netDgChTell(pk,{st:'done'},'撤離！');netDgLeave(a,'retreat');}}};}
// ---------- 同步 S.flags.v48 與流浪者探查結果 ----------
function netV48Pack(){const w=[];for(const o of S.wand.concat(S.cands))if(o.clean||o.scanF)w.push([o.id,o.clean?1:0,o.scanF||0]);return {f:S.flags.v48||null,w};}
{const _x=netHostTick;netHostTick=function(){const r=_x.apply(this,arguments);try{if(NET.role==='host'&&NET.tr&&(NET._v48dirty||NET.tick%5===0)){const m=netV48Pack(),s=JSON.stringify(m);
    if(s!==NET._v48s){NET._v48s=s;NET.tr.broadcast(Object.assign({t:'v48'},m));}NET._v48dirty=false;}}catch(e){console.error('[net] v48 sync',e);}return r;};}
{const _x=netHostRx;netHostRx=function(cid,m){if(m&&m.t==='hello')NET._v48s=null;return _x.apply(this,arguments);};} // 新成員加入：下一拍重送
{const _x=netClientRxExtra;netClientRxExtra=function(m){
  if(m&&m.t==='v48'){const old=S.flags.v48,pick=old&&old.tour&&old.tour.pick;S.flags.v48=m.f||undefined;
    if(pick&&S.flags.v48&&S.flags.v48.tour&&!S.flags.v48.tour.res)S.flags.v48.tour.pick=pick; // 成員自己在挑的參賽弟子不被覆蓋
    const W=new Map((m.w||[]).map(x=>[x[0],x]));for(const o of S.wand.concat(S.cands)){const x=W.get(o.id);if(x){o.clean=x[1]||undefined;o.scanF=x[2]||undefined;}}
    panelKeyCache=null;try{if(typeof V48!=='undefined'&&V48.open)v48Render(false);}catch(e){}return;}
  if(m&&m.t==='dgch'){NET.myCh=m.st==='start'?{t0:Date.now(),T:m.T}:null;return;}
  return _x.apply(this,arguments);};}
// 成員端副本 HUD：顯示自己的引導撤離進度
{const _x=renderDgHud;renderDgHud=function(){_x.apply(this,arguments);if(NET.role!=='client'||!S.dg)return;const el=document.getElementById('dghud');const ob=el&&el.querySelector('#dg_out');if(!ob)return;
  const c=NET.myCh;if(c){const p=Math.min(99,Math.floor((Date.now()-c.t0)/1000/c.T*100));const t=`撤離中 ${p}%（點擊取消）`;if(ob.textContent!==t)ob.textContent=t;}};}
{const _x=XW045;XW045=function(){const o=_x.apply(this,arguments);try{Object.assign(o,{aucAct,tourRun,v48Scan,dgRetreatCh,dgRetreat});if(o.net)o.net.g19={chk:NET_G19_CHK,myCh:()=>NET.myCh,dgCh:()=>[...NET.dgCh.keys()],
  st:()=>S.flags.v48,chT:()=>dgChT(),aucStart:f=>aucStart(f),tourStart:()=>tourStart(),makeYao:id=>{const w=wandById(id);if(w)v48MakeYao(w);return !!w;}};}catch(e){console.error('[net] g19 api',e);}return o;};}
// （引導撤離中下移動指令＝打斷：見 net2 netApplyIntent0 的 move）
