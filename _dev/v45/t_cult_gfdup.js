// 功法重複卷軸／已習得不消耗／技能耗氣文案／雷劫減傷帽（含裝備詞條）驗收。
// fixture（非自然遊玩）：XW.newGame 後用 XW_GF.grant 塞兩本同一功法；XW.setRealm；XW.spawnDisciple；
// 直接 performAction／點面板按鈕學習、傳授、出售；v158Set 把衝鋒／橫掃／火球放到技能欄；
// 雷劫測用 CULT_TRIB2.t.doBreak + tick，並 fixture 寫入 eq.f.affixes tribRed。
const {chromium}=require('/workspace/xianwu_demo/node_modules/playwright-core'),fs=require('fs');
const OUT=process.env.CULT_TEST_OUT||'/tmp/xw_gfdup_test',URL=process.env.XW_URL||'http://127.0.0.1:8423/';
const SHOT=process.env.XW_SHOT||'/workspace/xianwu_demo/bug_shots/cult_gfdup_20261110';
fs.mkdirSync(OUT,{recursive:true});fs.mkdirSync(SHOT,{recursive:true});
const rows=[];const rec=(n,ok,d)=>{rows.push({n,ok:!!ok,d});console.log((ok?'PASS ':'FAIL ')+n+' '+JSON.stringify(d===undefined?'':d));};
async function boot(p,url){await p.goto(url);await p.waitForFunction(()=>window.XW&&XW.snapshot&&XW.newGame);
  await p.evaluate(()=>{XW.newGame(7351,true);XW.showTitle(false);XW.tutEnd&&XW.tutEnd(true);XW.setHelp&&XW.setHelp(false);if(window.UI_NOTICE)UI_NOTICE.close();});await p.waitForTimeout(500);}
const toastText=()=>p=>p.evaluate(()=>{const el=document.getElementById('toasts');return el?[...el.children].map(n=>n.textContent):[];});
(async()=>{
  const b=await chromium.launch({executablePath:'/usr/bin/google-chrome',args:['--no-sandbox','--disable-dev-shm-usage']});
  const ctx=await b.newContext({viewport:{width:1280,height:800},serviceWorkers:'block'});
  const p=await ctx.newPage();const errs=[];
  p.on('pageerror',e=>errs.push(String(e)));p.on('console',m=>{if(m.type()==='error')errs.push(m.text());});
  try{
    await boot(p,URL);
    // fixture：新開局主角 realm=0（凡人），zheng_low_02 需 minRealm 1
    await p.evaluate(()=>{const u=XW.player();XW.setRealm(u,4,0);u.hp=u.maxhp;try{selUnits=[u.id];}catch(e){}});
    const ID='zheng_low_02';
    const prep=await p.evaluate(id=>{
      const G=window.XW_GF||window.CultGF;
      const u=XW.player();
      if(u.gf&&u.gf.learned&&u.gf.learned[id])delete u.gf.learned[id];
      const g1=G.grant(u,id,'dgLoot:test');
      const g2=G.grant(u,id,'dgLoot:test');
      const inv=(XW.S.inv||[]).filter(x=>x&&(x.gfId===id||(x.itemId||'').indexOf(id)>=0));
      const ling=XW.S.res&&XW.S.res.lingshi;
      const nm=(CultGF.get(id)&&CultGF.get(id).name)||id;
      return {g1,g2,n:inv.length,ids:inv.map(x=>x.id),names:inv.map(()=>nm),ling,owned:!!(window.CultGF&&CultGF.owned(u,id)),cnName:nm};
    },ID);
    rec('1 同一功法 grant 兩次：背包留下兩本、不自動轉靈石',prep.n===2&&prep.g1.ok&&prep.g2.ok&&!prep.owned,prep);

    // 打開背包＋功法面板
    await p.evaluate(()=>{
      try{if(typeof openBag==='function')openBag(XW.player());else if(typeof toggleBag==='function')toggleBag(true);}catch(e){}
      try{CultGF.openPanel(true);}catch(e){}
    });
    await p.waitForTimeout(200);
    await p.screenshot({path:SHOT+'/gfdup_two_scrolls.png'});

    const toasts=async()=>p.evaluate(()=>{const el=document.getElementById('toasts');return el?[...el.children].map(n=>n.textContent):[];});
    await p.evaluate(()=>{const el=document.getElementById('toasts');if(el)el.innerHTML='';});

    const learnBtn=p.locator('#cultGFPanel [data-gf="learn"][data-id="'+ID+'"]').first();
    const hasLearn=await learnBtn.count();
    if(hasLearn){await learnBtn.click({force:true});}else{
      await p.evaluate(id=>{const u=XW.player();CultGF.sendAction(u,{op:'learn',gfId:id,src:'bag'});CultGF.paint&&CultGF.paint();},ID);
    }
    await p.waitForTimeout(250);
    // gflearn：按學習→參悟中（未學會、卷被暫取）→CultGF.tick 快轉（fixture）→才學會
    const afterLearn=await p.evaluate(id=>{
      const u=XW.player();u.lastHit=-99;u.lastAtk=-99;
      const cnt=()=>(XW.S.inv||[]).filter(x=>x&&(x.gfId===id||(x.itemId||'').indexOf(id)>=0)).length;
      const L=u._gfLearn?JSON.parse(JSON.stringify(u._gfLearn)):null;const mid={n:cnt(),owned:!!CultGF.owned(u,id),learning:!!(L&&L.id===id)};
      if(L)CultGF.tick(L.t-L.p+0.5);
      return {L,mid,n:cnt(),owned:!!CultGF.owned(u,id),still:!!u._gfLearn,notice:CultGF._actionResult||''};
    },ID);
    const tLearn=await toasts();
    rec('2 學習第一本：先進入參悟中（未學會、剩一本），快轉完成才學會',afterLearn.mid.learning&&!afterLearn.mid.owned&&afterLearn.mid.n===1&&afterLearn.owned&&!afterLearn.still&&afterLearn.n===1,Object.assign({},afterLearn,{toasts:tLearn,clicked:!!hasLearn}));
    await p.screenshot({path:SHOT+'/gfdup_after_learn.png'});

    await p.evaluate(()=>{const el=document.getElementById('toasts');if(el)el.innerHTML='';CultGF._actionResult='';});
    try{await p.evaluate(()=>{CultGF.openPanel(true);CultGF.paint&&CultGF.paint();});}catch(e){}
    await p.waitForTimeout(150);
    const learnBtn2=p.locator('#cultGFPanel [data-gf="learn"][data-id="'+ID+'"]').first();
    const hasLearn2=await learnBtn2.count();
    if(hasLearn2){await learnBtn2.click({force:true});}else{
      await p.evaluate(id=>{CultGF.sendAction(XW.player(),{op:'learn',gfId:id,src:'bag'});},ID);
    }
    await p.waitForTimeout(250);
    const afterAlready=await p.evaluate(id=>{
      const u=XW.player();
      const inv=(XW.S.inv||[]).filter(x=>x&&(x.gfId===id||(x.itemId||'').indexOf(id)>=0));
      return {n:inv.length,owned:!!CultGF.owned(u,id),notice:CultGF._actionResult||'',reason:null};
    },ID);
    const tAlready=await toasts();
    const noticeOk=afterAlready.notice==='已習得此功法'||tAlready.some(t=>t.indexOf('已習得此功法')>=0);
    rec('3 已習得再學：卷軸不消耗，提示「已習得此功法」',afterAlready.owned&&afterAlready.n===1&&noticeOk,Object.assign({},afterAlready,{toasts:tAlready,clicked:!!hasLearn2}));
    await p.screenshot({path:SHOT+'/gfdup_already_notice.png'});

    // 再 grant 一本後確認已學會仍可進背包；然後傳授弟子
    const givePrep=await p.evaluate(id=>{
      const u=XW.player();
      const g3=(window.XW_GF||CultGF).grant(u,id,'dgLoot:test');
      const inv=(XW.S.inv||[]).filter(x=>x&&(x.gfId===id||(x.itemId||'').indexOf(id)>=0));
      let d=null;
      try{d=XW.spawnDisciple(XW.S.buildings.find(b=>b.built)||null);}catch(e){}
      if(!d)d=(XW.S.units||[]).filter(x=>x&&x.kind==='disciple'&&!x.dead).at(-1);
      if(d&&d.gf&&d.gf.learned&&d.gf.learned[id])delete d.gf.learned[id];
      // fixture：新收弟子可能是凡人（realm 0），zheng_low_02 需 minRealm 1
      if(d){try{XW.setRealm(d,4,0);d.hp=d.maxhp;}catch(e){d.realm=4;}}
      try{if('sel' in XW)XW.sel=[d&&d.id];}catch(e){}
      return {g3,n:inv.length,did:d&&d.id,dOwned:!!(d&&CultGF.owned(d,id)),dRealm:d&&d.realm};
    },ID);
    rec('3b 已學會後再 grant：仍進背包（可傳授／出售）',givePrep.n>=2&&givePrep.g3&&givePrep.g3.ok,givePrep);

    await p.evaluate(did=>{
      try{if('sel' in XW)XW.sel=[did];}catch(e){}
      try{if(XW.pbSel)XW.pbSel([did]);}catch(e){}
      try{if(XW._&&XW._.pbSel)XW._.pbSel([did]);}catch(e){}
      try{CultGF.openPanel(true);CultGF.paint&&CultGF.paint();}catch(e){}
    },givePrep.did);
    await p.waitForTimeout(150);
    const giveBtn=p.locator('#cultGFPanel [data-gf="give"][data-id="'+ID+'"]').first();
    const hasGive=await giveBtn.count();
    if(hasGive){await giveBtn.click({force:true});}else{
      await p.evaluate(([id,did])=>{CultGF.sendAction(XW.player(),{op:'give',gfId:id,to:did});},[ID,givePrep.did]);
    }
    await p.waitForTimeout(300);
    // gflearn：傳授→弟子參悟中（未學會）→快轉完成才學會
    const afterGive=await p.evaluate(([id,did])=>{
      const d=(XW.S.units||[]).find(x=>x&&x.id===did);
      const cnt=()=>(XW.S.inv||[]).filter(x=>x&&(x.gfId===id||(x.itemId||'').indexOf(id)>=0)).length;
      const L=d&&d._gfLearn?JSON.parse(JSON.stringify(d._gfLearn)):null;const mid={dOwned:!!(d&&CultGF.owned(d,id)),learning:!!(L&&L.id===id)};
      if(L){d.lastHit=-99;d.lastAtk=-99;CultGF.tick(L.t-L.p+0.5);}
      return {L,mid,dOwned:!!(d&&CultGF.owned(d,id)),n:cnt(),did,notice:CultGF._actionResult||''};
    },[ID,givePrep.did]);
    rec('4 傳授給未學會的弟子：弟子先參悟中（未學會），快轉完成才習得，背包少一本',afterGive.mid.learning&&!afterGive.mid.dOwned&&afterGive.dOwned&&afterGive.n===givePrep.n-1,afterGive);
    await p.screenshot({path:SHOT+'/gfdup_give_disciple.png'});

    const sell=await p.evaluate(id=>{
      const u=XW.player();
      const before=(XW.S.inv||[]).filter(x=>x&&(x.gfId===id||(x.itemId||'').indexOf(id)>=0)).length;
      const ling0=(XW.S.res&&XW.S.res.lingshi)|0;
      const hint=CultGF.priceHint(id);
      try{CultGF.openPanel(true);CultGF.paint&&CultGF.paint();}catch(e){}
      return {before,ling0,xia:hint&&hint.xia};
    },ID);
    await p.evaluate(()=>{const el=document.getElementById('toasts');if(el)el.innerHTML='';});
    const sellBtn=p.locator('#cultGFPanel [data-gf="sell"][data-id="'+ID+'"]').first();
    const hasSell=await sellBtn.count();
    if(hasSell){await sellBtn.click({force:true});}else{
      await p.evaluate(id=>{CultGF.sendAction(XW.player(),{op:'sell',gfId:id});},ID);
    }
    await p.waitForTimeout(250);
    const afterSell=await p.evaluate(([id,ling0,before])=>{
      const inv=(XW.S.inv||[]).filter(x=>x&&(x.gfId===id||(x.itemId||'').indexOf(id)>=0));
      return {n:inv.length,ling:(XW.S.res&&XW.S.res.lingshi)|0,ling0,before,notice:CultGF._actionResult||''};
    },[ID,sell.ling0,sell.before]);
    rec('5 出售重複卷軸：背包少一本、靈石增加',afterSell.n===afterSell.before-1&&afterSell.ling>afterSell.ling0,Object.assign({},sell,afterSell,{clicked:!!hasSell}));
    await p.screenshot({path:SHOT+'/gfdup_sell.png'});

    // 滿包也不把功法卷轉靈石
    const full=await p.evaluate(id=>{
      const u=XW.player();
      const cap=XW.S.invCap!=null?XW.S.invCap:((XW.S.inv||[]).length);
      XW.S.invCap=Math.max(0,(XW.S.inv||[]).length);
      const n0=(XW.S.inv||[]).length,ling0=(XW.S.res&&XW.S.res.lingshi)|0;
      const g=(window.XW_GF||CultGF).grant(u,id,'dgLoot:full');
      const n1=(XW.S.inv||[]).length,ling1=(XW.S.res&&XW.S.res.lingshi)|0;
      const extra=(XW.S.inv||[]).filter(x=>x&&(x.gfId===id||(x.itemId||'').indexOf(id)>=0));
      return {g,n0,n1,ling0,ling1,cap,nGf:extra.length};
    },ID);
    rec('5b 背包滿時 grant 功法：仍進背包、不轉靈石',full.g&&full.g.ok&&full.n1>full.n0&&full.ling1===full.ling0,full);

    // 技能耗氣文案
    const qi=await p.evaluate(()=>{
      const u=XW.player();
      try{XW.setRealm(u,Math.max(u.realm|0,6),0);}catch(e){}
      // fixture：本 /tmp 建置的 g20 TUNE.v49.abCost 仍是舊值（衝鋒30／火球60）。
      // 產品文案跟隨現行 TUNE（衝鋒／橫掃 0、火球 30）；測試寫入該值（不改 g20 檔）。
      const want={charge:0,sweep:0,fireball:30,flysword:60,jindan:120};
      let tuned=false,before=null;
      try{
        const T=window.TUNE||(typeof TUNE!=='undefined'?TUNE:null);
        if(T&&T.v49)before=Object.assign({},T.v49.abCost||{});
        tuned=!!(CultGF.setAbCost&&CultGF.setAbCost(want));
        if(!tuned&&T&&T.v49){T.v49.abCost=Object.assign({},T.v49.abCost||{},want);tuned=true;}
      }catch(e){}
      try{XW.S.flags=XW.S.flags||{};XW.S.flags.v158=['charge','sweep','fireball',null,null,null,null,null,null,null];XW.S.flags.v158m=1;}catch(e){}
      try{
        const api=XW._||{};
        if(typeof v158Ui==='function')v158Ui();
        else if(api.v158Ui)api.v158Ui();
      }catch(e){}
      const labels={
        charge:CultGF.qiLabel&&CultGF.qiLabel('charge'),
        sweep:CultGF.qiLabel&&CultGF.qiLabel('sweep'),
        fireball:CultGF.qiLabel&&CultGF.qiLabel('fireball'),
        fireballQi:CultGF.qiLabel&&CultGF.qiLabel('fireball','qi')
      };
      const abCost=(window.TUNE&&window.TUNE.v49&&window.TUNE.v49.abCost)||(typeof TUNE!=='undefined'&&TUNE.v49&&TUNE.v49.abCost)||{};
      const bar={};
      const el=document.getElementById('v158bar');
      if(el){
        const slots=typeof v158Slots==='function'?v158Slots():((XW._&&XW._.v158Slots&&XW._.v158Slots())||XW.S.flags.v158||[]);
        for(let i=0;i<el.children.length;i++){
          const ab=slots[i];if(!ab)continue;
          bar[ab]=el.children[i].title||'';
        }
      }
      let pick={};
      try{if(typeof v158Pick==='function')v158Pick(3);else if(XW._&&XW._.v158Pick)XW._.v158Pick(3);}catch(e){}
      const pk=document.getElementById('v158pk');
      if(pk){
        pk.querySelectorAll('[data-v158a]').forEach(btn=>{
          const ab=btn.getAttribute('data-v158a');
          const span=btn.querySelector('span');
          pick[ab]=(span&&span.textContent)||btn.textContent;
        });
      }
      try{if(typeof v158ClosePick==='function')v158ClosePick();}catch(e){}
      return {labels,abCost,bar,pick,tuned,before,qiLive:CultGF.abQi?{charge:CultGF.abQi('charge'),sweep:CultGF.abQi('sweep'),fireball:CultGF.abQi('fireball')}:null};
    });
    await p.screenshot({path:SHOT+'/gfdup_skill_tooltips.png'});
    const qiOk=qi.labels.charge==='不耗靈氣'&&qi.labels.sweep==='不耗靈氣'&&qi.labels.fireball==='靈力 30'
      && (qi.bar.charge||'').indexOf('不耗靈氣')>=0 && (qi.bar.sweep||'').indexOf('不耗靈氣')>=0
      && ((qi.bar.fireball||'').indexOf('靈氣 30')>=0 || (qi.bar.fireball||'').indexOf('靈力 30')>=0)
      && !(qi.bar.charge||'').includes('靈力0') && !(qi.bar.charge||'').includes('靈氣 0');
    rec('6 衝鋒／橫掃顯示「不耗靈氣」、火球顯示實際耗氣（TUNE.v49.abCost）',qiOk,qi);

    // 雷劫減傷：詞條 5% 只算一次，總帽 40% 在 hook 之後
    await p.waitForTimeout(200);
    const trib=await p.evaluate(()=>{
      if(!window.CULT_TRIB2)return {err:'no-trib2'};
      CULT_TRIB2.on=true;
      // fixture：此 /tmp 建置的 econ_gear.js 尚未包裝 tribDmgHook（work dir 版已有 econGearTribRed，上限 5%）。
      // 不改 econ*；若現場沒有 hook，暫裝等同行為以驗證 trib2.reduce 先套 hook 再套 40% 總帽、且不重加。
      let hookSrc='live';
      if(!(window.Cult&&typeof Cult.tribDmgHook==='function'&&Cult.tribDmgHook._econGear)){
        hookSrc='fixture';
        const cap=0.05;
        const red=function(u){
          let pct=0;for(const s in (u&&u.eq)||{}){const it=u.eq[s];for(const a of (it&&it.affixes)||[])if(a&&(a.k==='tribRed'||a.tribBand))pct+=(+a.v||0);}
          return Math.max(0,Math.min(cap,pct/100));
        };
        const prev=Cult.tribDmgHook;
        Cult.tribDmgHook=function(u,dmg,i){
          if(typeof prev==='function'){try{const x=prev(u,dmg,i);if(x>=0)dmg=x;}catch(e){}}
          const r=red(u);if(r>0&&dmg>0)dmg=dmg*(1-r);
          return dmg;
        };
        Cult.tribDmgHook._econGear=1;Cult.tribDmgHook._fixture=1;
      }
      const at=u=>{XW.setRealm(u,6,0);u.trib2=null;u.cultWound=null;u.dead=false;u.eq={};u.cultFabao=0;u.cultTribPill=0;CULT_TRIB2.t.gearApply(u);u.diyun=0;u.cultFabao=0;u.cultTribPill=0;u.hp=u.maxhp;return u;};
      const strikeOnce=u=>{CULT_TRIB2.log.length=0;CULT_TRIB2.t.doBreak(u);CULT_TRIB2.tick(0.25);const s=CULT_TRIB2.log.filter(e=>e.ev==='strike'&&e.id===u.id).at(-1);u.trib2=null;return s;};
      const putTribAffix=u=>{
        // 不用 eq.f：hasFabaoGuard 會把 q>=3 的法寶槽算作法寶減傷 15%
        u.eq.h={slot:'h',q:1,n:'測試冠',atk:0,hp:0,def:0,spd:0,affixes:[{k:'tribRed',v:5}]};
      };
      const u=XW.player();
      at(u);
      const none=strikeOnce(u);
      at(u);
      putTribAffix(u);
      CULT_TRIB2.t.gearApply(u);u.hp=u.maxhp;
      const hookOn=!!(window.Cult&&Cult.tribDmgHook&&Cult.tribDmgHook._econGear);
      const gearRed=typeof econGearTribRed==='function'?econGearTribRed(u):(window.econGearTribRed?econGearTribRed(u):null);
      const only=strikeOnce(u);
      let b=null,how='none';
      try{const s=XW.freeSpot('tianjietai',u.x+4,u.y+4);if(s){b=XW.placeAt('tianjietai',s.i,s.j);if(b)XW.completeBuilding(b);}}catch(e){how='err:'+e.message;}
      if(!b||!b.built){how='fixture-push';b={id:9e6,type:'tianjietai',i:0,j:0,built:true,broken:false,lv:10,hp:700,maxhp:700};XW.S.buildings.push(b);}
      else {b.lv=10;how='placeAt';}
      at(u);
      u.diyun=9999;u.cultFabao=1;u.cultTribPill=1;
      putTribAffix(u);
      u.eq.f={slot:'f',q:5,n:'測試法寶',atk:0,hp:0,def:0,spd:0};
      CULT_TRIB2.t.gearApply(u);u.hp=u.maxhp;
      const stacked=strikeOnce(u);
      try{const i=XW.S.buildings.indexOf(b);if(i>=0)XW.S.buildings.splice(i,1);}catch(e){}
      const expOnly=+(none.mul*(1-0.05)).toFixed(3);
      return {
        hookOn,gearRed,how,
        none:{mul:none&&none.mul,dmg:none&&none.dmg,parts:none&&none.parts},
        only:{mul:only&&only.mul,dmg:only&&only.dmg,parts:only&&only.parts,exp:expOnly},
        stacked:{mul:stacked&&stacked.mul,dmg:stacked&&stacked.dmg,raw:stacked&&stacked.raw,parts:stacked&&stacked.parts},
        hookSrc:hookSrc
      };
    });
    const onlyOk=trib.only&&trib.only.parts&&trib.only.parts.hook===1&&Math.abs(trib.only.mul-trib.only.exp)<=0.002&&trib.only.mul>0.93;
    const capOk=trib.stacked&&trib.stacked.mul>=0.6&&trib.stacked.parts&&trib.stacked.parts.capped===1&&trib.hookOn;
    rec('7 裝備雷劫減傷詞條只套一次（不在 trib2.reduce 重加）',onlyOk&&trib.hookOn,trib);
    rec('8 詞條＋法寶＋丹＋底蘊＋天劫台：40% 總帽在 hook 之後（倍率 ≥0.6）',capOk,trib.stacked);
  }catch(e){rec('腳本完成',false,e&&e.stack||String(e));}
  rec('console／pageerror 0',errs.length===0,errs.slice(0,5));
  fs.writeFileSync(OUT+'/RESULTS.json',JSON.stringify({rows,errs},null,1));
  console.log('TOTAL',rows.filter(r=>r.ok).length+'/'+rows.length);
  await b.close();
})();
