// singlestore P1 實機（headless Chrome，副本建置）：舊檔讀入、守恆、存讀檔、旗標往返、室內外、副本進出（xfBagRestore）、戰鬥、花費／收入、行囊滿、v53 靈石不計上限
// 用法：node t_ss_p1_browser.js [base=http://127.0.0.1:18961/index.html] [shots=/workspace/econ_single_store_1113/shots]
const L=require('./t_ss_lib.js');const fs=require('fs');const {sleep,ev}=L;
const BASE=process.argv[2]||'http://127.0.0.1:18961/index.html';const SH=process.argv[3]||'/workspace/econ_single_store_1113/shots';fs.mkdirSync(SH,{recursive:true});
const OLD=['/workspace/econ_single_store_1113/saves/save_0011_integ_1113_slot.json','/workspace/econ_single_store_1113/saves/save_0011_lingshi_event_slot.json'];
const {rows,rec}=L.recorder();
const STATE=`(function(){const v=S.econ.vault;return {cur:{xia:v.xia,zhong:v.zhong,shang:v.shang,ji:v.ji},res:JSON.parse(JSON.stringify(S.res)),store:S.store?{cur:Object.assign({},S.store.cur),res:Object.assign({},S.store.res),seq:S.store.seq,mig:S.store.mig&&S.store.mig.origin,conf:(S.store.conf||[]).length}:null,bound:XW_STORE.isBound(),on:XW_STORE.enabled(),alias:!!(S.store&&S.store.cur===S.econ.vault),live:grTransferLiveVault(),xiaEq:econBagXia(v)};})()`;
const same6=(a,b)=>['wood','stone','fiber','food','iron','herb'].every(k=>a[k]===b[k]);
const sameCur=(a,b)=>['xia','zhong','shang','ji'].every(g=>(a[g]||0)===(b[g]||0));
async function shot(p,n){try{await p.screenshot({path:SH+'/'+n+'.png'});}catch(e){}}
(async()=>{
const br=await L.launch();
// ---------- 1 舊存檔（0011 替代存檔）讀入：守恆 ----------
for(const f of OLD){
  const tag=f.includes('lingshi_event')?'ev':'integ';
  const raw=JSON.parse(JSON.parse(fs.readFileSync(f,'utf8')).data);
  const want={xia:Math.max(raw.res.lingshi||0,(raw.econ&&raw.econ.vault&&raw.econ.vault.xia)||0),zhong:raw.econ.vault.zhong||0,shang:raw.econ.vault.shang||0,ji:raw.econ.vault.ji||0};
  const {ctx,p,errs}=await L.page(br,BASE);
  await L.loadSlotFile(p,f);
  const s=await ev(p,STATE);
  rec(`1-${tag} 舊檔讀入：建 S.store（mig=load）、綁定、cur 與 vault 同物件`,s.store&&s.store.mig==='load'&&s.bound&&s.alias&&s.live,s);
  rec(`1-${tag} 守恆：下品=max(res,vault)、中上極=vault、六資源=res（不加倍、不遺失）`,sameCur(s.store.cur,want)&&same6(s.store.res,raw.res)&&s.res.lingshi===want.xia,{want,got:s.store.cur,raw:raw.res});
  await shot(p,'p1_01_'+tag+'_loaded');
  if(tag==='integ'){
    // ---------- 2 舊 S.res 寫法生效＋雙寫 ----------
    const w=await ev(p,`(function(){const a=S.store.res.wood,l=S.store.cur.xia;S.res.wood+=5;S.res.lingshi+=7;S.econ.vault.zhong+=1;const snap=JSON.parse(JSON.stringify(snapshot()));
      return {dw:S.store.res.wood-a,dl:S.store.cur.xia-l,z:S.store.cur.zhong,dual:{res:snap.res,vault:snap.econ.vault,store:snap.store.cur,sres:snap.store.res}};})()`);
    rec('2 舊寫法 S.res.wood+=5／S.res.lingshi+=7／vault.zhong+=1 直接進倉庫',w.dw===5&&w.dl===7&&w.z===1,w);
    rec('2 雙寫：存檔 res／econ.vault／store 三處一致',w.dual.res.lingshi===w.dual.vault.xia&&w.dual.vault.xia===w.dual.store.xia&&sameCur(w.dual.vault,w.dual.store)&&same6(w.dual.res,w.dual.sres),w.dual);
    // ---------- 3 存讀檔往返 ×3（冪等、不翻倍） ----------
    const s0=await ev(p,STATE);let okRT=true;const tr=[];
    for(let i=0;i<3;i++){const r=await ev(p,`(async()=>{await writeSlot('m1');await loadSlot('m1');return ${STATE};})()`);tr.push(r.store&&r.store.cur);
      if(!(r.bound&&r.alias&&sameCur(r.store.cur,s0.store.cur)&&same6(r.store.res,s0.store.res)&&r.store.mig==='load'))okRT=false;}
    rec('3 存→讀 3 次：數值不變、mig 不重跑、仍綁定',okRT,{s0:s0.store,tr});
    await shot(p,'p1_03_roundtrip');
    // ---------- 4 室內外切換 ----------
    const io=await ev(p,`(function(){const p=player();const b=S.buildings.find(b=>b.built&&ROOM[b.type]);if(!b)return {skip:'no-building'};p.x=b.i+1;p.y=b.j+BUILD[b.type].size+0.6;enterInterior(b);const inn=!!S.interior;const a=XW_STORE.isBound();exitInterior(true);return {inn,a,b:XW_STORE.isBound(),out:!S.interior};})()`);
    rec('4 室內外切換（0011 無建築時改在第 9 節新局測）',io.skip||(io.inn&&io.a&&io.b&&io.out),io);
    // ---------- 5 收入：礦獲入庫 econGatherDeposit、econGrant、行囊滿進裝備庫 ----------
    const inc=await ev(p,`(function(){const p=player();const d=disciples()[0];const b0=econBagXia(S.econ.vault);d.carry={type:'lingshi',amt:12};const r=econGatherDeposit(d,null);const b1=econBagXia(S.econ.vault);
      econGrant('vault',30,'test-income','xia');const b2=econBagXia(S.econ.vault);
      const cap=econInvCap(p);const keep=S.inv.slice();const gear0=(S.store&&S.store.gear&&S.store.gear.length)||0;while(S.inv.length<cap)S.inv.push(makeItem('sword',0));const it=makeItem('sword',2);const ok=addItem(it);const b3=econBagXia(S.econ.vault);const gearN=(S.store&&S.store.gear&&S.store.gear.length)||0;const inGear=!!(S.store&&S.store.gear&&S.store.gear.some(x=>x&&x.id===it.id));S.inv=keep;
      return {mine:b1-b0,grades:r.grades||null,grant:b2-b1,full:{ok,gain:b3-b2,gearN,gear0,inGear,id:it.id},storeEq:econBagXia(S.store.cur)===b3,bound:XW_STORE.isBound()};})()`);
    rec('5 收入：挖礦 12 顆入庫（分品後總顆數＝12 下品等值或更多）、econGrant +30、行囊滿進裝備庫（不化靈石）',inc.mine>=12&&inc.grant===30&&inc.full.ok===true&&inc.full.gain===0&&inc.full.inGear&&inc.full.gearN===inc.full.gear0+1&&inc.storeEq&&inc.bound,inc);
    // ---------- 6 花費：XW_ECON.pay vault、canAfford/pay 多品找零、原子失敗 ----------
    const sp=await ev(p,`(function(){const v=S.econ.vault;Object.assign(v,{xia:30,zhong:2,shang:1,ji:0});S.res.wood=100;
      const c1=canAfford({lingshi:250,wood:10});pay({lingshi:250,wood:10});const a1=Object.assign({},v),w1=S.res.wood;
      const c2=canAfford({lingshi:99999});const before=JSON.stringify(v);const r2=XW_STORE.pay({lingshi:10,wood:1000});const after=JSON.stringify(v);
      const r3=XW_ECON.pay('vault',5,'test-spend');const a3=Object.assign({},v);
      return {c1,a1,w1,c2,atomic:{r2,unchanged:before===after},r3:r3&&r3.ok,a3,store:Object.assign({},S.store.cur)};})()`);
    rec('6 canAfford/pay：30下+2中+1上（10230）付 250 → 依 econDeductXia 拆上品找零，xia80/zhong99/shang0（9980，與舊 econ_grade pay 同結果），木 90',sp.c1&&sp.a1.xia===80&&sp.a1.zhong===99&&sp.a1.shang===0&&sp.w1===90,sp);
    rec('6 不足 → canAfford false；XW_STORE.pay 木不夠整筆失敗、靈石不動',sp.c2===false&&sp.atomic.r2.ok===false&&sp.atomic.unchanged,sp.atomic);
    rec('6 XW_ECON.pay(vault,5) 舊 econ 路徑扣在同一個倉庫',sp.r3&&sp.a3.xia===75&&sp.a3.zhong===99&&sameCur(sp.store,sp.a3),{a3:sp.a3,store:sp.store});
    // ---------- 7 v53：靈石不計上限，木材照舊裁切 ----------
    const cap=await ev(p,`(function(){S.econ.vault.xia=50000;S.res.wood=v53Cap('wood')-1;v53Clamp();S.econ.vault.xia+=1000;S.res.wood+=5000;v53Clamp();return {ls:S.econ.vault.xia,wood:S.res.wood,cap:v53Cap('wood'),full:v53Full('lingshi')};})()`);
    rec('7 ④靈石 51000 不被裁、v53Full(lingshi)=false；木材超上限照舊裁到上限',cap.ls===51000&&cap.full===false&&cap.wood===cap.cap,cap);
    await shot(p,'p1_07_cap');
  }
  rec(`1-${tag} 無頁面錯誤`,errs.length===0,errs.slice(0,5));
  await ctx.close();
}
// ---------- 8 旗標往返：ON 存 → =0 讀＋花費＋存 → ON 讀（以 S.store 為準，不取 max） ----------
{
  const ctx=await br.newContext({viewport:{width:1280,height:900},serviceWorkers:'block',locale:'zh-TW'});
  let {p,errs}=await L.page(br,BASE,{ctx});
  await L.loadSlotFile(p,OLD[0]);
  const a=await ev(p,`(async()=>{Object.assign(S.econ.vault,{xia:500,zhong:3,shang:0,ji:0});S.res.wood=1234;await writeSlot('m1');return ${STATE};})()`);
  await p.goto(BASE+'?singlestore=0',{waitUntil:'domcontentloaded'});await p.waitForFunction(()=>typeof window.__ev==='function'&&window.XW,null,{timeout:60000});
  await p.waitForSelector('#t_cont:not([disabled])',{timeout:60000});await p.click('#t_cont');await p.waitForFunction(()=>__ev('!titleOpen&&S&&S.units&&S.units.length>0'),null,{timeout:60000});await sleep(1200);await L.dismiss(p);
  const b=await ev(p,STATE);
  rec('8 =0 讀入：舊欄位正確（vault 500/3、res.lingshi 500、木 1234）、未綁定、S.store 原樣保留',!b.on&&!b.bound&&b.cur.xia===500&&b.cur.zhong===3&&b.res.lingshi===500&&b.res.wood===1234&&b.store&&b.store.cur.xia===500,b);
  await shot(p,'p1_08_off_loaded');
  const c=await ev(p,`(async()=>{pay({lingshi:120,wood:34});await writeSlot('m1');const r=JSON.parse(JSON.parse(await storeGet('m1')).data);return {st:${STATE},saved:{res:r.res,vault:r.econ.vault,store:r.store.cur,sres:r.store.res}};})()`);
  rec('8 =0 期間花費 120 靈石＋34 木：舊欄位扣款正確（下品夠，不拆中品：380下/3中），存檔時 S.store 由舊欄位回寫',c.saved.vault.zhong===3&&c.saved.vault.xia===380&&c.saved.res.wood===1200&&sameCur(c.saved.store,c.saved.vault)&&c.saved.sres.wood===1200,c.saved);
  await p.goto(BASE,{waitUntil:'domcontentloaded'});await p.waitForFunction(()=>typeof window.__ev==='function'&&window.XW,null,{timeout:60000});
  await p.waitForSelector('#t_cont:not([disabled])',{timeout:60000});await p.click('#t_cont');await p.waitForFunction(()=>__ev('!titleOpen&&S&&S.units&&S.units.length>0'),null,{timeout:60000});await sleep(1200);await L.dismiss(p);
  const d=await ev(p,STATE);
  rec('8 重新開啟：以 S.store 為準（380下/3中、木 1200），=0 期間的花費沒有被 max 加回，無衝突紀錄',d.on&&d.bound&&d.cur.xia===380&&d.cur.zhong===3&&d.res.wood===1200&&d.store.conf===0,d);
  await shot(p,'p1_08_on_again');
  rec('8 無頁面錯誤',errs.length===0,errs.slice(0,5));
  await ctx.close();
}
// ---------- 9 新局：室內外、戰鬥、副本進出（一般撤離＋仙凡之門失敗 xfBagRestore）、tryPlace 實際點擊建造 ----------
{
  const {ctx,p,errs}=await L.page(br,BASE);await L.newGame(p);await sleep(1500);
  const s0=await ev(p,STATE);rec('9 新局：mig=new-game、綁定',s0.store&&s0.store.mig==='new-game'&&s0.bound&&s0.alias,s0);
  // 實際點擊建造倉庫（tryPlace → pay）
  await ev(p,`(function(){S.res.wood=500;S.res.stone=500;S.res.fiber=100;return 1;})()`);
  const spot=await ev(p,`(function(){const p=player();for(let r=3;r<14;r++)for(let dj=-r;dj<=r;dj++)for(let di=-r;di<=r;di++){const i=Math.floor(p.x)+di,j=Math.floor(p.y)+dj;if(placementValid('hall',i,j)){const s=BUILD.hall.size/2;const q=iso(i+s,j+s);cam.follow=false;cam.x=q.x;cam.y=q.y;return {i,j};}}return null;})()`);
  let placed=null;
  if(spot){await sleep(300);await ev(p,`enterBuild('hall')`);await sleep(200);
    const box=await p.$eval('canvas',c=>{const r=c.getBoundingClientRect();return {x:r.left,y:r.top,w:r.width,h:r.height};});
    for(const [dx,dy] of [[0,0],[0,16],[0,-16],[16,0],[-16,0],[0,32]]){await p.mouse.move(box.x+box.w/2+dx,box.y+box.h/2+dy);await sleep(150);await p.mouse.click(box.x+box.w/2+dx,box.y+box.h/2+dy);await sleep(400);
      placed=await ev(p,`(function(){const b=S.buildings.find(b=>b.type==='hall');return b?{wood:S.res.wood,stone:S.res.stone,fiber:S.res.fiber,sw:S.store.res.wood}:null;})()`);if(placed)break;}
  }
  const hc=await ev(p,`BUILD.hall.cost`);
  rec('9 滑鼠實際點擊建造大殿：成本 '+JSON.stringify(hc)+' 由 pay 從倉庫扣',placed&&placed.wood===500-(hc.wood||0)&&placed.stone===500-(hc.stone||0)&&placed.fiber===100-(hc.fiber||0)&&placed.sw===placed.wood,{spot,placed,hc});
  await ev(p,`(function(){try{if(buildMode)buildMode=null;}catch(e){}return 1;})()`);
  await shot(p,'p1_09_built');
  // 室內外：在大殿或任一可進入建築
  const io=await ev(p,`(function(){const p=player();let b=S.buildings.find(b=>ROOM[b.type]&&b.built);if(!b){const t=Object.keys(ROOM).find(k=>BUILD[k]);const f=nearestFree(p.x+4,p.y+4,-1);b={id:nid(),type:t,i:f.i,j:f.j,progress:1,built:true,queue:0,qt:0,hp:BUILD[t].hp,maxhp:BUILD[t].hp,broken:false,lv:1,inv:{}};S.buildings.push(b);rebuildBlock();}
    const D=doorPt(b);p.x=D.x;p.y=D.y;b.built=true;b.progress=1;enterInterior(b);return {type:b.type};})()`);
  await sleep(1500);const io1=await ev(p,`(function(){const inn=!!S.interior;S.res.food+=3;return {inn,a:XW_STORE.isBound()&&S.store.res.food===S.res.food};})()`);Object.assign(io,io1);await shot(p,'p1_09_interior');
  const io2=await ev(p,`(function(){exitInterior(true);return {out:!S.interior,b:XW_STORE.isBound()};})()`);
  rec('9 進室內（'+(io.type||'')+'）→ 室內收入進倉庫 → 出室外，仍綁定',io.inn&&io.a&&io2.out&&io2.b,{io,io2});
  // 戰鬥：在主角旁生一隻敵人，跑 8 秒
  const f0=await ev(p,`(function(){const p=player();const t=Object.keys(ENEMY).find(k=>!ENEMY[k].boss)||Object.keys(ENEMY)[0];const e=makeEnemy(t,p.x+1.2,p.y+0.5);S.enemies.push(e);p.hp=p.maxhp;return {t,ehp:e.hp,id:e.id};})()`);
  await sleep(8000);
  const f1=await ev(p,`(function(){const e=enemyById(${f0.id});return {ehp:e?e.hp:0,dead:!e||e.dead||e.hp<=0,php:player().hp,bound:XW_STORE.isBound()};})()`);
  rec('9 戰鬥 8 秒：敵人受傷或死亡、倉庫仍綁定、無錯誤',(f1.dead||f1.ehp<f0.ehp)&&f1.bound,{f0,f1});
  await shot(p,'p1_09_fight');
  // 一般副本：進入→撤離（keep）
  const dg=await ev(p,`(function(){const p=player();const g=gates().find(g=>g.kind!=='xf');if(!g)return {skip:1};p.x=g.i+1;p.y=g.j+2.6;S.dgCd={};const ok=dgEnter(g.kind,'solo',false);return {kind:g.kind,ok,inDg:!!S.dg,bound:XW_STORE.isBound()};})()`);
  await sleep(2500);await shot(p,'p1_09_dungeon');
  const dg2=await ev(p,`(function(){S.res.iron+=2;const a=S.store.res.iron===S.res.iron;dgExit(true);return {a,out:!S.dg,bound:XW_STORE.isBound()};})()`);
  rec('9 一般副本進出（撤離）：副本內外倉庫皆綁定',dg.ok!==false&&dg.inDg&&dg.bound&&dg2.a&&dg2.out&&dg2.bound,{dg,dg2});
  // 仙凡之門：入場快照含 store → 場內改動 → 失敗離場 xfBagRestore → 四品＋六資源回到入場值
  await sleep(1200);
  const xf=await ev(p,`(function(){const p=player();p.realm=Math.max(p.realm,3);const g=gates().find(g=>g.kind==='xf');p.x=g.i+1;p.y=g.j+2.6;S.dgCd={};
    Object.assign(S.econ.vault,{xia:321,zhong:4,shang:1,ji:0});S.res.wood=777;const ok=dgEnter('xf','solo',false);const b0=S.dg&&S.dg.bag0;return {ok,inDg:!!S.dg,hasStore:!!(b0&&b0.store),snapCur:b0&&b0.store&&b0.store.cur};})()`);
  await sleep(2000);await shot(p,'p1_09_xf_in');
  const xf2=await ev(p,`(function(){S.econ.vault.zhong=0;S.econ.vault.xia=5;S.res.wood=1;S.res.lingshi=9;cultGiveLoot(player(),[{id:'lingshi',n:40}]);const mid=S.econ.vault.xia;S.dg.cleared=false;dgExit(false);const v=S.econ.vault;return {mid,pool:XW_STORE.xfLeft(),out:!S.dg,cur:{xia:v.xia,zhong:v.zhong,shang:v.shang},wood:S.res.wood,ls:S.res.lingshi,bound:XW_STORE.isBound(),alias:S.store.cur===S.econ.vault,live:grTransferLiveVault(),why:XW_STORE.stats().why};})()`);
  rec('9 仙凡之門失敗離場：木 777 還原；四品不整倉還原（9下/0中/1上）；場內擊殺 cultGiveLoot 40 扣進 S.store.xfLeft；getter 重綁、轉帳驗證通過',xf.ok!==false&&xf.inDg&&xf.hasStore&&xf2.out&&xf2.mid===49&&xf2.pool.xia===40&&xf2.cur.xia===9&&xf2.cur.zhong===0&&xf2.cur.shang===1&&xf2.wood===777&&xf2.ls===9&&xf2.bound&&xf2.alias&&xf2.live,{xf,xf2});
  await sleep(800);await shot(p,'p1_09_xf_out');
  rec('9 無頁面錯誤',errs.length===0,errs.slice(0,5));
  await ctx.close();
}
// ---------- 10 仙凡之門破關：池子 10–100% 退還、D.loot 靈石由 econ 入倉一次；弟子自動換裝 ----------
{
  const {ctx,p,errs}=await L.page(br,BASE);await L.newGame(p);await sleep(1500);
  const xf=await ev(p,`(function(){const p=player();p.realm=Math.max(p.realm,3);const g=gates().find(g=>g.kind==='xf');p.x=g.i+1;p.y=g.j+2.6;S.dgCd={};
    Object.assign(S.econ.vault,{xia:500,zhong:0,shang:0,ji:0});S.store.xfLeft={xia:100,zhong:0,shang:0,ji:0};const ok=dgEnter('xf','solo',false);return {ok,inDg:!!S.dg,on:XW_STORE.xfSettleOn()};})()`);
  await sleep(1500);
  const xf2=await ev(p,`(function(){const T=[];const t0=toast;toast=function(m){T.push(String(m));return t0.apply(this,arguments);};try{S.dg.cleared=true;S.dg.loot.res.lingshi=30;dgExit(true);}finally{toast=t0;}
    return {out:!S.dg,xia:S.econ.vault.xia,pool:XW_STORE.xfLeft(),T};})()`);
  const back=xf2.xia-500-30;
  rec('10 仙凡之門破關：D.loot 靈石 30 入倉一次＋池子 100 退還 10–100（實得 '+back+'），池子清空、有取回提示',xf.on&&xf.inDg&&xf2.out&&back>=10&&back<=100&&xf2.pool.xia===0&&xf2.T.some(x=>/取回/.test(x))&&!xf2.T.some(x=>/靈石 0/.test(x))&&xf2.T.some(x=>/靈石 \+30/.test(x)),{xf,xf2});
  await sleep(800);await shot(p,'p1_10_xfwin_out');
  const ag=await ev(p,`(function(){let u=disciples().find(x=>!x.dead);if(!u){try{spawnDisciple(S.buildings.find(b=>b&&b.built)||null);}catch(e){}u=disciples().find(x=>!x.dead);}if(!u)return {skip:1};u.eq=u.eq||{};const old=u.eq.w||null;const mk=makeItem(GEAR_ORDER.find(t=>GEAR[t]&&GEAR[t].slot==='w'),1,-1);mk.atk=(old?old.atk:0)+500;S.store.gear.push(mk);
    const r=XW_STORE.autoGear(u);return {r,w:u.eq.w&&u.eq.w.id,id:mk.id,back:old?S.store.gear.some(x=>x===old):true};})()`);
  rec('10 實機：弟子從宗門裝備庫自動換上更好的武器，舊武器回裝備庫',!ag.skip&&(ag.r.ok&&ag.w===ag.id&&ag.back),ag);
  rec('10 無頁面錯誤',errs.length===0,errs.slice(0,5));
  await ctx.close();
}
await br.close();
const pass=rows.filter(r=>r.ok).length;console.log(`--- ${pass}/${rows.length} passed ---`);
fs.writeFileSync(SH+'/t_ss_p1_browser.json',JSON.stringify({pass,total:rows.length,rows},null,1));
process.exit(pass===rows.length?0:1);
})().catch(e=>{console.error(e);process.exit(2);});
