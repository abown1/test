// 16 格裝備＋任務堂門檻 實測（Playwright＋headless Chrome，真點擊為主；fixture 會標明）
const pw=require('/workspace/xianwu_demo/node_modules/playwright-core');
const fs=require('fs');
const OUT=process.env.ECON_TEST_OUT||'/workspace/xianwu_demo/bug_shots/econ_slot16_20261110';
const SH=OUT+'/shots',LOG=OUT+'/logs';
const URL=process.env.XW_URL||'http://127.0.0.1:8931/index.html?dev=1&slot16=1';
fs.mkdirSync(SH,{recursive:true});fs.mkdirSync(LOG,{recursive:true});
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const rows=[];const rec=(n,ok,d)=>{rows.push({n,ok:!!ok,d});console.log((ok?'PASS ':'FAIL ')+n+' '+JSON.stringify(d===undefined?'':d).slice(0,1500));};
const ev=(p,code)=>p.evaluate(s=>window.__ev(s),code);
async function step(name,fn){try{await fn();}catch(e){rec(name,false,'exception: '+String(e&&e.stack||e).slice(0,600));}}
(async()=>{
  const br=await pw.chromium.launch({executablePath:'/usr/bin/google-chrome',args:['--no-sandbox','--disable-gpu','--disable-dev-shm-usage']});
  const ctx=await br.newContext({viewport:{width:1280,height:800},serviceWorkers:'block',locale:'zh-TW'});
  const errs=[];const p=await ctx.newPage();
  p.on('pageerror',e=>errs.push('pageerror: '+String(e.message||e).slice(0,400)));
  p.on('console',m=>{if(m.type()==='error')errs.push('console: '+m.text().slice(0,400));});
  await p.goto(URL,{waitUntil:'domcontentloaded'});
  await p.waitForFunction(()=>window.XW&&XW.newGame&&typeof window.__ev==='function',null,{timeout:40000});
  await sleep(800);
  await p.evaluate(()=>{XW.newGame(91);if(XW.tutEnd)XW.tutEnd(true);try{XW.setHelp&&XW.setHelp(false);}catch(e){}try{XW.showTitle&&XW.showTitle(false);}catch(e){}try{window.UI_NOTICE&&UI_NOTICE.close();}catch(e){}});
  await sleep(1800);
  for(let i=0;i<4;i++){try{await p.getByText('知道了').first().click({timeout:600});await sleep(150);}catch(e){break;}}
  await ev(p,`(function(){try{openPause(false);}catch(e){}
    window.__toasts=[];if(!window.__th){window.__th=1;const _t=toast;toast=function(m){try{__toasts.push(String(m));}catch(e){}return _t.apply(this,arguments);};}
    window.__ecl=setInterval(function(){try{if(S&&S.enemies)S.enemies.length=0;}catch(e){}},400);return 1;})()`);
  const closeAll=async()=>{await ev(p,`(function(){try{toggleBag(false);}catch(e){}try{toggleCraft(false);}catch(e){}try{selBuilding=null;}catch(e){}return 1;})()`);await sleep(150);};
  const clickBuilding=async(bid)=>{
    await ev(p,`(function(){const b=bById(${bid});const s=(BUILD[b.type]&&BUILD[b.type].size)||3;const q=P(b.i+s/2,b.j+s/2);cam.follow=false;cam.x=q.x;cam.y=q.y;selBuilding=null;selUnits=[];return 1;})()`);
    await sleep(400);
    const s=await ev(p,`(function(){const b=bById(${bid});const s=(BUILD[b.type]&&BUILD[b.type].size)||3;const q=P(b.i+s/2,b.j+s/2);return {sx:(q.x-cam.x)*cam.zoom+W/2,sy:(q.y-cam.y)*cam.zoom+H/2};})()`);
    for(const dy of [0,-12,12,-24,24]){await p.mouse.click(s.sx,s.sy+dy);await sleep(350);const ok=await ev(p,`selBuilding===${bid}`);if(ok)return true;}
    return false;
  };

  // ---------- 0 開機 ----------
  await step('開機：旗標開、鉤子到位、16 鍵',async()=>{
    const r=await ev(p,`({on:econSlot16On(),keys:XW_ECON.slot16.keys,hooks:[slotFor._econ16,canWear._econ16,equip._econ16,renderBag._econ16,gearLine._econ16,equipBest._econ16,v171Want._econ16].map(Boolean),pV:player().econEqV,bak:!!player().econEqBak16})`);
    rec('開機：旗標開、鉤子到位、16 鍵',r.on&&r.keys.length===16&&r.hooks.every(Boolean)&&r.pV===16&&r.bak,r);
  });

  // ---------- 1 行囊 16 格＋每個新格真點穿上 ----------
  let ids={};
  await step('真點：每個新格穿上',async()=>{
    ids=await ev(p,`(function(){const p=player();XW.setRealm&&XW.setRealm(p,4,0);
      const mk=t=>{const it=makeItem(t,1,-1);S.inv.push(it);return it.id;};
      if(!GEAR.__t_zb)GEAR.__t_zb={n:'測試至寶',slot:'z',atk:1,hp:5,def:0,spd:0,cost:{},realm:0,desc:'測試用至寶（fixture）'};
      const zb={id:S.nextItem++,t:'__t_zb',slot:'z',q:1,el:-1,atk:1,hp:5,def:0,spd:0};S.inv.push(zb);
      return {hd:mk('eg0_head'),hn:mk('eg0_hands'),pt:mk('eg0_pants'),sh:mk('eg0_shoes'),c1:mk('talisman'),c2:mk('jade'),c3:mk('talisman'),c4:mk('jade'),w:mk('sword'),a:mk('robe'),f:mk('eg4_faqi'),z1:zb.id};})()`);
    await p.keyboard.press('i');await sleep(600);
    let open=await ev(p,`!!bagOpen`);if(!open){await ev(p,`(openBag(player()),1)`);await sleep(400);}
    await p.click('[data-btab="gear"]').catch(()=>{});await sleep(300);
    const n16=await p.$$eval('#bag .slots [data-econ16]',a=>a.length);
    await p.screenshot({path:SH+'/01_bag_16slots_empty.png'});
    const got={};
    for(const s of ['hd','hn','pt','sh','c1','c2','c3','c4','w','a','f','z1']){
      const id=ids[s];
      await p.click(`#bag [data-it="${id}"]`);await sleep(250);
      await p.click(`#bag [data-eq="${id}"]`);await sleep(350);
      got[s]=await ev(p,`(function(){const e=player().eq||{};for(const k in e)if(e[k]&&e[k].id===${id})return k;return null;})()`);
    }
    await sleep(400);
    await p.screenshot({path:SH+'/02_bag_16slots_full.png'});
    const aff=await ev(p,`(function(){const e=player().eq;const o={};for(const k in e)if(e[k])o[k]=(e[k].affixes||[]).length;return o;})()`);
    const shown=await p.$$eval('#bag .slots [data-econ16] b',a=>a.length);
    const ok=n16===16&&Object.keys(got).every(s=>got[s]===s);
    rec('行囊顯示 16 格（頭胸手褲鞋／武器副武器／護符×4／至寶×5）',n16===16,{n16});
    rec('真點：每個新格穿上（含護符三四、至寶一）',ok,{got});
    rec('每格裝備都有 4 條詞條（含護符、至寶）',Object.values(aff).length>=12&&Object.values(aff).every(n=>n===4),aff);
    rec('格子畫面顯示已穿 12 件',shown===12,{shown});
  });
  await step('真點：卸下新格',async()=>{
    const before=await ev(p,`S.inv.length`);
    for(const s of ['hd','sh','c4','z1']){await p.click(`#bag [data-uneq="${s}"]`);await sleep(350);}
    const r=await ev(p,`(function(){const e=player().eq;return {hd:!!e.hd,sh:!!e.sh,c4:!!e.c4,z1:!!e.z1,inv:S.inv.length,ids:S.inv.map(x=>x.id)};})()`);
    await p.screenshot({path:SH+'/03_bag_unequip.png'});
    rec('真點：卸下新格（頭、鞋、護符四、至寶一）回行囊',!r.hd&&!r.sh&&!r.c4&&!r.z1&&r.inv===before+4&&[ids.hd,ids.sh,ids.c4,ids.z1].every(i=>r.ids.includes(i)),r);
    for(const s of ['hd','sh','c4','z1']){await p.click(`#bag [data-it="${ids[s]}"]`);await sleep(200);await p.click(`#bag [data-eq="${ids[s]}"]`);await sleep(300);}
    const back=await ev(p,`(function(){const e=player().eq;return ['hd','sh','c4','z1'].every(k=>!!e[k]);})()`);
    rec('真點：再穿回去',back,{back});
  });
  await step('一鍵最佳會補新格',async()=>{
    const r=await ev(p,`(function(){const p=player();const it=makeItem('eg3_head',2,-1);S.inv.push(it);const n=equipBest(p,true);return {n,hd:p.eq.hd&&p.eq.hd.id===it.id};})()`);
    rec('一鍵最佳會補新格（較好的頭）',r.hd,r);
  });

  // ---------- 2 詞條封頂含新格 ----------
  await step('詞條封頂',async()=>{
    const r=await ev(p,`(function(){const u={eq:{}};const ks=XW_ECON.slot16.keys;
      ks.forEach(k=>{u.eq[k]={affixes:[{k:'leech',v:2,name:'吸血'},{k:'tribRed',v:1,name:'雷劫減傷'},{k:'qiCost',v:-5,name:'靈氣消耗'},{k:'crit',v:1,name:'暴擊率'}]};});
      const full={lee:econGearLeech(u),trib:econGearTribRed(u),qi:econGearQiCostRed(u),pct:econGearWornPct(u)};
      const one={};for(const k of ['hd','hn','pt','sh','c3','c4','z1','z5']){const v={eq:{}};v.eq[k]={affixes:[{k:'leech',v:1,name:'吸血'},{k:'tribRed',v:0.5,name:'雷劫減傷'},{k:'qiCost',v:-3,name:'靈氣消耗'},{k:'crit',v:7,name:'暴擊率'}]};one[k]=[econGearLeech(v),econGearTribRed(v),econGearQiCostRed(v),econGearWornPct(v).crit];}
      return {full:{lee:full.lee,trib:full.trib,qi:full.qi,crit:full.pct.crit,leePct:full.pct.leech,qiPct:full.pct.qiCost},one};})()`);
    const f=r.full;
    rec('16 格疊滿：吸血封頂 10%、雷劫減傷 5%、減耗 30%，暴擊照加總 16',Math.abs(f.lee-0.10)<1e-9&&Math.abs(f.trib-0.05)<1e-9&&Math.abs(f.qi-0.30)<1e-9&&f.crit===16&&f.leePct===10&&f.qiPct===-30,f);
    const okOne=Object.values(r.one).every(a=>Math.abs(a[0]-0.01)<1e-9&&Math.abs(a[1]-0.005)<1e-9&&Math.abs(a[2]-0.03)<1e-9&&a[3]===7);
    rec('只穿單一新格也會算進全身（頭手褲鞋護符三四至寶一五）',okOne,r.one);
    const real=await ev(p,`(function(){const p=player();return {lee:econGearLeech(p),trib:econGearTribRed(p),qi:econGearQiCostRed(p),n:Object.keys(p.eq).filter(k=>p.eq[k]).length};})()`);
    rec('實際角色 12 件全身合計可讀（不爆錯、不超上限）',real.n>=12&&real.lee<=0.1&&real.trib<=0.05&&real.qi<=0.3,real);
  });

  // ---------- 3 舊檔轉換 ----------
  await step('舊檔轉換',async()=>{
    await closeAll();
    const r=await ev(p,`(function(){
      const d=snapshot();
      const P0=d.units.find(u=>u.kind==='player');
      const mkI=(t,q,aff)=>{const it=makeItem(t,q,-1);it.affixes=aff;it.econQName='良品';return JSON.parse(JSON.stringify(it));};
      const A1=[{k:'atkPct',v:5,name:'攻擊力'},{k:'leech',v:1.5,name:'吸血'},{k:'tribRed',v:0.6,name:'雷劫減傷'},{k:'qiCost',v:-4,name:'靈氣消耗'}];
      P0.eq={w:mkI('sword',1,A1),a:mkI('robe',1,A1),c1:mkI('talisman',0,A1),c2:mkI('jade',0,A1),f:mkI('eg4_faqi',1,A1)};
      delete P0.econEqV;delete P0.econEqBak16;
      let D0=d.units.find(u=>u.kind==='disciple');
      if(!D0){const sd=XW.spawnDisciple(S.buildings.find(b=>b.built)||null);D0=JSON.parse(JSON.stringify(pickKeys(sd,UNIT_KEEP)));d.units.push(D0);}
      // 弟子：舊格＋一件放錯欄（護符在 w 欄）＋一件放在不明鍵
      D0.eq={a:mkI('leather',1,A1),w:mkI('talisman',1,A1),old9:mkI('saber',2,A1),c1:mkI('jade',0,A1),c2:mkI('talisman',0,A1)};
      delete D0.econEqV;delete D0.econEqBak16;
      const ids=u=>Object.values(u.eq).map(x=>x.id).sort((a,b)=>a-b);
      window.__old={pEq:JSON.parse(JSON.stringify(P0.eq)),dEq:JSON.parse(JSON.stringify(D0.eq)),dId:D0.id,allIds:ids(P0).concat(ids(D0)).concat(d.v45.inv.map(x=>x.id)).sort((a,b)=>a-b)};
      localStorage.setItem(SAVE_KEY,JSON.stringify(d));
      const ok=loadGame(true);
      return {ok};})()`);
    await sleep(1200);
    const m=await ev(p,`(function(){const O=window.__old;const pl=player();const d=S.units.find(u=>u.id===O.dId);
      const eqJ=u=>{const o={};for(const k in u.eq)if(u.eq[k])o[k]=u.eq[k];return o;};
      const all=[];for(const u of [pl,d])for(const k in u.eq)if(u.eq[k])all.push(u.eq[k].id);for(const x of S.inv)all.push(x.id);
      const strip=it=>{const o=JSON.parse(JSON.stringify(it));delete o._gtRev;return o;};
      const same=(a,b)=>JSON.stringify(strip(a))===JSON.stringify(strip(b));
      const pSame=Object.keys(O.pEq).every(k=>pl.eq[k]&&same(pl.eq[k],O.pEq[k]));
      const dRes={a:d.eq.a&&d.eq.a.id===O.dEq.a.id,wTalismanMoved:!(d.eq.w&&d.eq.w.id===O.dEq.w.id),talismanWhere:(function(){for(const k in d.eq)if(d.eq[k]&&d.eq[k].id===O.dEq.w.id)return k;return S.inv.some(x=>x.id===O.dEq.w.id)?'inv':null;})(),
        saberWhere:(function(){for(const k in d.eq)if(d.eq[k]&&d.eq[k].id===O.dEq.old9.id)return k;return S.inv.some(x=>x.id===O.dEq.old9.id)?'inv':null;})(),old9:!!d.eq.old9};
      const affKept=[pl,d].every(u=>Object.values(u.eq).filter(Boolean).every(it=>JSON.stringify(it.affixes)===JSON.stringify((O.pEq[Object.keys(O.pEq)[0]]).affixes)));
      const missing=O.allIds.filter(i=>!all.includes(i));
      return {pV:pl.econEqV,dV:d.econEqV,pBak:pl.econEqBak16&&JSON.stringify(pl.econEqBak16.eq)===JSON.stringify(O.pEq),dBak:d.econEqBak16&&JSON.stringify(d.econEqBak16.eq)===JSON.stringify(O.dEq),pSame,dRes,affKept,missing,log:S.flags.econSlot16Mig};})()`);
    rec('舊檔讀入：玩家五件原欄不動、數值詞條完全一樣',m.pSame&&m.pV===16,m);
    rec('舊檔讀入：備份鍵 econEqBak16 存了原樣舊欄位（玩家＋弟子）',m.pBak&&m.dBak,{pBak:m.pBak,dBak:m.dBak});
    rec('舊檔讀入：弟子放錯欄的護符移到護符欄、不明鍵的刀進武器欄或行囊',m.dV===16&&m.dRes.a&&m.dRes.wTalismanMoved&&/^c[1-4]$|^inv$/.test(m.dRes.talismanWhere||'')&&/^w$|^inv$/.test(m.dRes.saberWhere||'')&&!m.dRes.old9,m.dRes);
    rec('舊檔讀入：一件都沒少、詞條沒改',m.missing.length===0&&m.affKept,{missing:m.missing,affKept:m.affKept});
    const idem=await ev(p,`(function(){const j=JSON.stringify(S.units.map(u=>[u.id,u.eq,u.econEqBak16,u.econEqV]))+JSON.stringify(S.inv.map(x=>x.id));const r=econSlot16MigrateAll();const r2=econSlot16MigrateAll({force:true});const j2=JSON.stringify(S.units.map(u=>[u.id,u.eq,u.econEqBak16,u.econEqV]))+JSON.stringify(S.inv.map(x=>x.id));return {same:j===j2,r:r.length,r2:r2.length};})()`);
    rec('轉換冪等：再跑兩次什麼都不變',idem.same&&idem.r===0&&idem.r2===0,idem);
    const rt=await ev(p,`(function(){const j=JSON.stringify(S.units.map(u=>[u.id,u.eq,u.econEqBak16]));const d=snapshot();localStorage.setItem(SAVE_KEY,JSON.stringify(d));loadGame(true);const j2=JSON.stringify(S.units.map(u=>[u.id,u.eq,u.econEqBak16]));return {same:j===j2,bakInSave:d.units.every(u=>u.econEqBak16!=null)};})()`);
    await sleep(800);
    rec('存讀檔來回：16 格內容與備份鍵都保留',rt.same&&rt.bakInSave,rt);
    await p.keyboard.press('i');await sleep(500);let open=await ev(p,`!!bagOpen`);if(!open){await ev(p,`(openBag(player()),1)`);await sleep(300);}
    await p.screenshot({path:SH+'/04_after_old_save_migration.png'});
    await closeAll();
  });

  // ---------- 4 鍛造新部位（真點鍛造面板） ----------
  await step('鍛造新部位',async()=>{
    const setup=await ev(p,`(function(){const b=xwGfPlaceBuilt('forge');const p=player();const s=(BUILD.forge.size||3);p.x=b.i+s/2;p.y=b.j+s+0.6;p.path=[];p.task=null;
      for(const k of ['iron','wood','fiber','stone','lingshi'])S.res[k]=(S.res[k]||0)+500;for(const k in S.mats)S.mats[k]+=50;S.mats.hide=(S.mats.hide||0)+50;return {bid:b.id};})()`);
    const ok=await clickBuilding(setup.bid);
    await sleep(300);
    const cbtn=await p.$('#panel [data-act="craft"]');if(cbtn){await cbtn.click();await sleep(500);}
    else{// 上游 2026-11-10 21:0x 起戶外鍛造坊面板不再出現「⚒ 鍛造台」鈕（改由「進入鍛造坊」）；fixture：直接 openCraft，並記錄
      rec('（備註）戶外面板無鍛造台鈕，改 openCraft fixture',true,'g12 extraActs 鈕不見，非本次 econ 變更');
      await ev(p,`(function(){openCraft(bById(${setup.bid}));return 1;})()`);await sleep(500);}
    const opened=await ev(p,`!!craftOpen`);
    await p.click('#craft [data-eg-tab="0"]').catch(()=>{});await sleep(300);
    const btns=await p.$$eval('#craft [data-eg-add]',a=>a.map(x=>x.getAttribute('data-eg-add')));
    await p.screenshot({path:SH+'/05_forge_new_kinds.png'});
    await ev(p,`(window.__inv0=S.inv.map(x=>x.id).concat(Object.values(player().eq||{}).filter(Boolean).map(x=>x.id)),1)`);
    for(const k of ['eg0_head','eg0_hands','eg0_pants','eg0_shoes']){await p.click(`#craft [data-eg-add="${k}"]`);await sleep(250);}
    await p.click('#craft [data-eg-start]').catch(()=>{});await sleep(600);
    const st=await ev(p,`(function(){const b=bById(${setup.bid});return {craft:b.craft?{k:b.craft.k,t:b.craft.t,T:b.craft.T,n:b.craft.n}:null,q:(b.econForgeQ||[]).map(x=>x.k)};})()`);
    let done=null;
    for(let i=0;i<130;i++){await sleep(1000);done=await ev(p,`(function(){const its=S.inv.filter(x=>/^eg0_(head|hands|pants|shoes)$/.test(x.t)&&!__inv0.includes(x.id));return its.map(x=>({t:x.t,slot:x.slot,aff:(x.affixes||[]).length}));})()`);if(done.length>=4)break;
      const b=await ev(p,`(function(){const b=bById(${setup.bid});return b.craft?1:((b.econForgeQ||[]).length?2:0);})()`);if(b===2){await p.click('#craft [data-eg-start]').catch(()=>{});}}
    rec('鍛造台真點：武徒頁列出頭／手／褲／鞋',ok&&opened&&['eg0_head','eg0_hands','eg0_pants','eg0_shoes'].every(k=>btns.includes(k)),{clickedBuilding:ok,opened,btns});
    rec('真點加入佇列並開爐，打出新部位、各 4 條詞條（等實際爐時，最多 130 秒）',done&&done.length>=1&&done.every(x=>x.aff===4&&['hd','hn','pt','sh'].includes(x.slot)),{start:st,done});
    await p.screenshot({path:SH+'/06_forge_done.png'});
    await closeAll();
  });

  // ---------- 5 掉落 ----------
  await step('掉落',async()=>{
    const r=await ev(p,`(function(){const out={};let n=0;for(let i=0;i<400;i++){const a=XW_ECON.econRollEnemyGear(i%7);for(const it of a){n++;if(['hd','hn','pt','sh'].includes(it.slot)){out[it.slot]=(out[it.slot]||0)+1;const v2=/^gs[0-9]/.test(it.t);if(v2)out.v2=(out.v2||0)+1;if((it.affixes||[]).length!==(v2?2:4))out.bad=(out.bad||0)+1;}}}return {n,out};})()`);
    rec('敵人掉落擲骰會出頭／手／褲／鞋，且各 4 條詞條（第④輪新表套裝件 gs* 為 2 條；直接呼叫 econRollEnemyGear 400 次）',r.out.hd>0&&r.out.hn>0&&r.out.pt>0&&r.out.sh>0&&!r.out.bad,r);
    const off=await ev(p,`(function(){window.ECON_SLOT16_FORCE=false;const k=XW_ECON.gearKeysForRealm(3);window.ECON_SLOT16_FORCE=undefined;delete window.ECON_SLOT16_FORCE;return {has:k.some(x=>/_(head|hands|pants|shoes)$/.test(x)),n:k.length};})()`);
    rec('旗標關時鍛造／掉落清單不含新部位',!off.has,off);
  });

  // ---------- 6 總倉與交易 ----------
  await step('總倉與交易',async()=>{
    const s=await ev(p,`(function(){const b=xwGfPlaceBuilt('zongcang');return {bid:b&&b.id};})()`);
    // 放：真點卸下頭
    await p.keyboard.press('i');await sleep(500);let open=await ev(p,`!!bagOpen`);if(!open){await ev(p,`(openBag(player()),1)`);await sleep(300);}
    await p.click('[data-btab="gear"]').catch(()=>{});await sleep(300);
    let hid=await ev(p,`player().eq.hd&&player().eq.hd.id`);
    if(!hid){const nid=await ev(p,`(function(){const it=makeItem('eg1_head',1,-1);S.inv.push(it);return it.id;})()`);await sleep(600);await p.click(`#bag [data-it="${nid}"]`);await sleep(250);await p.click(`#bag [data-eq="${nid}"]`);await sleep(400);hid=await ev(p,`player().eq.hd&&player().eq.hd.id`);}
    await p.click('#bag [data-uneq="hd"]');await sleep(400);await closeAll();
    const ok=await clickBuilding(s.bid);await sleep(700);
    const listed=await p.$$eval('#v171inv div',a=>a.map(x=>x.textContent));
    await p.screenshot({path:SH+'/07_zongcang_has_head.png'});
    const nm=await ev(p,`itemName(S.inv.find(x=>x.id===${hid}))`);
    rec('總倉（放）：卸下的頭盔出現在總倉清單',ok&&listed.some(t=>t.includes(nm)),{clicked:ok,nm,n:listed.length});
    // 取：弟子自取（v171Want 會挑新格）
    const take=await ev(p,`(function(){let d=S.units.find(u=>u.kind==='disciple'&&!u.dead&&!u.np);if(!d)d=XW.spawnDisciple(S.buildings.find(b=>b.built)||null);d.eq=d.eq||{};delete d.eq.hd;
      const w=v171Want(d);const pick=w.find(x=>x.s==='hd');const before=S.inv.length;const got=pick?v171Do(d,bById(${s.bid})):[];return {d:d.id,want:w.map(x=>x.s+':'+x.it.id),pick:!!pick,hd:d.eq.hd&&d.eq.hd.id,got};})()`);
    rec('總倉（取）：弟子自取時會挑頭部空欄並穿上',take.pick&&take.hd!=null,take);
    // 交易：賣給弟子＋買回（新格）
    const tr=await ev(p,`(function(){const d=S.units.find(u=>u.id===${take.d});const it=makeItem('eg2_shoes',2,-1);S.inv.push(it);delete d.eq.sh;
      const W=econWallet(d.id,true);W.xia=(W.xia||0)+5000;W.ledger=W.ledger||[];d.lingshi=econBagXia(W);S.econ.vault.xia=(S.econ.vault.xia||0)+5000;
      const want=gtWants(d,it);const s1=gtSellToDisciple(d,it.id);const where=d.eq.sh&&d.eq.sh.id===it.id;const s2=gtBuyBack(d,it.id);const back=S.inv.some(x=>x.id===it.id)&&!d.eq.sh;
      return {want,s1,where,s2,back,slot:slotFor(d,it)};})()`);
    rec('交易：新格裝備賣給弟子會穿在鞋欄、買回後回行囊',tr.want===''&&tr.s1&&tr.s1.ok&&tr.where&&tr.s2&&tr.s2.ok&&tr.back,tr);
    await closeAll();
  });

  // ---------- 7 任務堂門檻＋大殿 ----------
  await step('大殿與任務堂',async()=>{
    const s=await ev(p,`(function(){let h=S.buildings.find(b=>b.type==='hall'&&b.built);if(!h)h=xwGfPlaceBuilt('hall');S.buildings.filter(b=>b.type==='renwutang').forEach(b=>{S.buildings.splice(S.buildings.indexOf(b),1);});rebuildBlock();
      const ds=S.units.filter(u=>u.kind==='disciple'&&!u.dead);while(ds.length<3){const d=XW.spawnDisciple(h);if(!d)break;ds.push(d);}
      const pl=player();const sz=(BUILD.hall.size||3);ds.concat([pl]).forEach((u,k)=>{const f=nearestFree(h.i+sz+3+k,h.j+sz+3,unitComp(u));if(f){u.x=f.i+0.5;u.y=f.j+0.5;u.path=[];}});
      return {hall:h.id,gate:XW_ECON.taskGateOpen()};})()`);
    let ok=await clickBuilding(s.hall);await sleep(900);
    const hall=await ev(p,`(function(){const pn=document.getElementById('panel');const ev=pn.querySelector('#y47evp');return {board:!!pn.querySelector('#econ-task-board'),y47:!!ev,y47vis:ev?getComputedStyle(ev).display!=='none':null,gateHint:!!pn.querySelector('[data-econ-task-gate]'),text:pn.innerText.slice(0,3000),
      sections:[...pn.children].map(c=>(c.id?('#'+c.id+' '):'')+(c.className?('.'+String(c.className).split(' ')[0]+' '):'')+c.tagName+'：'+(c.innerText||'').replace(/\\s+/g,' ').slice(0,80))};})()`);
    await p.screenshot({path:SH+'/08_hall_panel_no_renwutang.png'});
    fs.writeFileSync(LOG+'/hall_panel_no_renwutang.txt',hall.text+'\n\n--- sections ---\n'+hall.sections.join('\n'));
    rec('大殿面板沒有任務板（#econ-task-board 不在）',ok&&!hall.board,{clicked:ok,board:hall.board,y47:hall.y47,y47vis:hall.y47vis,gateHint:hall.gateHint});
    // 隊長已改 g22:541-542（y47EvPanel 只掛任務堂）：大殿完全不顯示任務／宗門事務
    rec('大殿不顯示任務（無 #y47evp、無任務板）',!hall.y47&&!hall.board,{y47:hall.y47,board:hall.board});
    rec('沒有任務堂時：門檻關閉（提示改在接任務處，見下一項）',s.gate===false&&!/需建造任務堂/.test(hall.text),{gate:s.gate,hallHint:hall.gateHint});
    // 無任務堂：自動接、親自接、村莊委託都擋
    const g=await ev(p,`(function(){const E=y47EvS();__toasts.length=0;
      const a=y47EvPost();let pt=false;if(a)pt=y47EvPlayerTake(a);
      for(let i=0;i<5;i++){E.next=S.time+999;y47EvTick();}
      const v=S.villages.find(v=>v&&v.quest&&!v.quest.accepted);const aq=v?acceptQuest(v.id):null;
      return {post:!!a,mem:a?a.mem.length:-1,st:a?a.st:null,player:a?!!a.player:null,pt,aq,acc:v?v.quest.accepted:null,toasts:__toasts.slice(-4)};})()`);
    rec('沒有任務堂：弟子不自動接新事務、玩家不能親自接、村莊委託不能接，並提示',g.post&&g.mem===0&&g.st==='post'&&g.pt===false&&g.aq===false&&g.acc===false&&g.toasts.some(t=>/需建造任務堂/.test(t)),g);
    // 施工中算沒有
    const uc=await ev(p,`(function(){const b=xwGfPlaceBuilt('renwutang');b.built=false;b.progress=0.4;return {bid:b.id,gate:XW_ECON.taskGateOpen(),hint:XW_ECON.taskGateHint()};})()`);
    rec('施工中的任務堂算沒有',uc.gate===false&&/尚未完工/.test(uc.hint),uc);
    // 完工
    const fin=await ev(p,`(function(){const b=bById(${uc.bid});b.built=true;b.progress=1;b.hp=b.maxhp;b.broken=false;return {gate:XW_ECON.taskGateOpen()};})()`);
    await closeAll();ok=await clickBuilding(uc.bid);await sleep(900);
    const rw=await ev(p,`(function(){const pn=document.getElementById('panel');return {board:!!pn.querySelector('#econ-task-board'),pub:!!pn.querySelector('[data-econ-task-pub]'),text:pn.innerText.slice(0,1500)};})()`);
    await p.screenshot({path:SH+'/09_renwutang_board.png'});
    rec('任務堂完工：面板有任務板與「發佈任務」',fin.gate&&ok&&rw.board&&rw.pub,{gate:fin.gate,clicked:ok,board:rw.board,pub:rw.pub});
    // 完工後：自動接恢復（先送一件進行中的，之後拿來測損壞）
    const go=await ev(p,`(function(){const E=y47EvS();const ds=S.units.filter(u=>u.kind==='disciple'&&!u.dead&&!u.np);
      ds.forEach(u=>{u.realm=Math.max(u.realm||0,6);u.job=null;u.task=null;u.aiJob=null;u.y47e=null;u.xslp=null;u.xeat=null;u.xsch=null;u.hp=u.maxhp;u.inside=false;});
      for(let i=0;i<8;i++){E.next=S.time+999;y47EvTick();}const a=E.act.find(x=>x.mem&&x.mem.length);
      const why=ds.map(u=>({id:u.id,free:y47EvFree(u)}));return {joined:!!a,k:a&&a.k,st:a&&a.st,mem:a&&a.mem.length,acts:E.act.map(x=>x.st+':'+x.mem.length),why};})()`);
    rec('任務堂完工：弟子會自動接事務',go.joined,go);
    // 打壞
    const dmg=await ev(p,`(function(){const b=bById(${uc.bid});b.hp=0;b.broken=true;return {gate:XW_ECON.taskGateOpen(),hint:XW_ECON.taskGateHint()};})()`);
    await closeAll();ok=await clickBuilding(uc.bid);await sleep(900);
    const rwb=await ev(p,`(function(){const pn=document.getElementById('panel');const b=pn.querySelector('#econ-task-board');return {board:!!b,hint:b?b.innerText:'',pub:!!pn.querySelector('[data-econ-task-pub]')};})()`);
    await p.screenshot({path:SH+'/10_renwutang_damaged.png'});
    rec('任務堂損壞：算沒有，面板只顯示「需建造任務堂（已損壞…）」、沒有發佈鈕',dmg.gate===false&&rwb.board&&/需建造任務堂/.test(rwb.hint)&&!rwb.pub,{dmg,rwb});
    const dg=await ev(p,`(function(){const E=y47EvS();const a=y47EvPost();for(let i=0;i<5;i++){E.next=S.time+999;y47EvTick();}const v=S.villages.find(v=>v&&v.quest&&!v.quest.accepted);return {newMem:a?a.mem.length:-1,pt:a?y47EvPlayerTake(a):null,aq:v?acceptQuest(v.id):null};})()`);
    rec('任務堂損壞：新事務沒人自動接、不能親自接、不能接村莊委託',dg.newMem===0&&dg.pt===false&&dg.aq===false,dg);
    // 進行中的照跑、照給獎勵（快轉：把 a.tw／tb 往前推，fixture）
    const prog=await ev(p,`(function(){const E=y47EvS();const a=E.act.find(x=>x.k===${go.k||-1});if(!a)return {none:true};const done0=E.done.length;const T=TUNE.y47e;
      const ms=y47EvMembers(a);const c0=ms.map(u=>(typeof econTaskContribOf==='function'?econTaskContribOf(u):0));
      let path=[];for(let i=0;i<12&&E.act.includes(a);i++){if(a.st==='gather'){a.tg=S.time-T.gather-1;}if(a.st==='go'){ms.forEach(u=>{if(u.y47e)u.y47e.arr=true;});}if(a.st==='work'){a.tw=S.time-a.dur-1;}if(a.st==='back'){ms.forEach(u=>{if(u.y47e)u.y47e.arr=true;});}
        const p0=y47EvPower;y47EvPower=function(){return 2;};try{y47EvTick();}finally{y47EvPower=p0;}path.push(a.st);}
      return {path,finished:!E.act.includes(a),done:E.done.length-done0,c0,c1:ms.map(u=>(typeof econTaskContribOf==='function'?econTaskContribOf(u):0)),log:E.log.slice(0,3).map(l=>l.m)};})()`);
    rec('任務堂損壞後，已在進行中的事務照常完成並發獎勵（快轉 fixture）',prog.finished&&prog.done===1&&prog.c1.some((v,i)=>v>prog.c0[i]),prog);
    // 沒任務堂時大殿再看一次
    await ev(p,`(function(){const b=bById(${uc.bid});S.buildings.splice(S.buildings.indexOf(b),1);rebuildBlock();return 1;})()`);
    await closeAll();ok=await clickBuilding(s.hall);await sleep(900);
    const hall2=await ev(p,`(function(){const pn=document.getElementById('panel');return {board:!!pn.querySelector('#econ-task-board'),sections:[...pn.children].map(c=>(c.id?('#'+c.id+' '):'')+c.tagName+'：'+(c.innerText||'').replace(/\\s+/g,' ').slice(0,100))};})()`);
    fs.writeFileSync(LOG+'/hall_panel_sections_final.txt',hall2.sections.join('\n'));
    await p.screenshot({path:SH+'/11_hall_panel_final.png'});
    rec('大殿面板最終（拆掉任務堂後）仍無任務板',ok&&!hall2.board,{sections:hall2.sections});
    await closeAll();
  });

  await sleep(500);
  rec('console／pageerror 為 0',errs.length===0,errs.slice(0,20));
  const fail=rows.filter(r=>!r.ok).map(r=>r.n);
  fs.writeFileSync(LOG+'/t_econ_slot16.json',JSON.stringify({rows,errs},null,1));
  console.log('SUMMARY '+(rows.length-fail.length)+'/'+rows.length+' FAIL '+JSON.stringify(fail)+' ERRS '+errs.length);
  await br.close();
})();
