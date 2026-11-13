// t_cult_paintpanel：選敵人／建築時 #panel 不可出現主角 #gf_sec；多幀仍無；選主角／弟子才有；清空選擇不把功法插回敵人面板。
// fixture（非真人遊玩）：XW.newGame；XW.spawnEnemy；手動推一名弟子與一座大殿；
// 以 XW.v47x.sel／XW.v49._.selE／XW.selB 選取（遊戲腳本在 IIFE 內，page.evaluate 不能直接寫 selUnits／renderPanel）；
// 以 XW.updateUI() 觸發 renderPanel，再 CultGF.paint()。不改 TUNE／g*／存檔結構。
// 用法：XW_URL=http://127.0.0.1:PORT/ node t_cult_paintpanel.js
const {chromium}=require('/workspace/xianwu_demo/node_modules/playwright-core');
const URL=process.env.XW_URL||'http://127.0.0.1:8765/';
const SHOT=process.env.XW_SHOT||'/tmp/paintpanel_enemy.png';
const rows=[];const rec=(n,ok,d)=>{rows.push({n,ok:!!ok});console.log((ok?'PASS ':'FAIL ')+n+' '+JSON.stringify(d===undefined?'':d));};

async function boot(p){
  await p.goto(URL,{waitUntil:'domcontentloaded',timeout:60000});
  await p.waitForFunction(()=>window.XW&&XW.newGame&&XW.player&&window.CultGF,{timeout:30000});
  await p.evaluate(()=>{
    XW.newGame(7351,true);
    try{XW.showTitle(false);}catch(e){}
    try{if(XW.tutEnd)XW.tutEnd(true);}catch(e){}
    try{if(XW.setHelp)XW.setHelp(false);}catch(e){}
    try{if(window.UI_NOTICE)UI_NOTICE.close();}catch(e){}
    const boot=document.getElementById('xwboot');if(boot)boot.remove();
    const title=document.getElementById('title');if(title){title.classList.remove('open');title.style.display='none';}
    document.body.classList.add('ingame');
    document.body.classList.remove('titleopen','xwbooting','y48naming');
  });
  await p.waitForFunction(()=>window.XW&&XW.player&&XW.player()&&XW.titleOpen===false,{timeout:15000});
  await p.waitForTimeout(400);
  await p.evaluate(()=>{
    const S=XW.S,pl=XW.player();
    XW.setRealm(pl,4,0);pl.hp=pl.maxhp;pl.lastHit=-99;pl.lastAtk=-99;
    try{CultGF.grant(pl,'zheng_low_02','test');}catch(e){}
    try{CultGF.openPanel(false);}catch(e){}
    const id=Math.max.apply(null,(S.units||[]).map(u=>u.id||0))+1;
    const d={id,kind:'disciple',name:'試弟',body:0,hp:80,maxhp:80,atk:6,speed:3,gat:1,realm:1,sub:0,xiu:0,wu:50,xy:10,luck:40,loyal:80,person:'穩健',lg:null,job:null,task:null,dead:false,eq:{},gf:{v:1,learned:{},main:null,aux:[],bar:[null,null,null,null,null],holding:[],entry:0},x:pl.x+1,y:pl.y,lastHit:-99,lastAtk:-99};
    S.units.push(d);
    window._testDisciple=id;
    // 敵人放遠一點，避免立刻進入戰鬥干擾面板
    let e=null,err=null;
    try{e=XW.spawnEnemy('chief',pl.x+10,pl.y+10);}catch(ex){err=String(ex);}
    if(!e)try{e=XW.spawnEnemy('wolf',pl.x+10,pl.y+10);}catch(ex2){err=String(ex2);}
    window._testEnemy=e&&e.id;
    window._testSpawn={ok:!!e,id:e&&e.id,type:e&&e.type,err,nEn:(S.enemies||[]).length};
    const bid=Math.max(0,...(S.buildings||[]).map(x=>x.id||0))+1;
    const hall={id:bid,type:'hall',i:Math.floor(pl.x)+6,j:Math.floor(pl.y)+6,progress:1,built:true,builtAt:S.time,queue:0,qt:0,hp:200,maxhp:200,broken:false,lv:1,inv:{}};
    S.buildings.push(hall);
    window._testBld=bid;
  });
}

function helpers(){
  return `(function(){
    function selEfn(){return XW.selE||(XW._&&XW._.selE)||(XW.v49&&XW.v49._&&XW.v49._.selE);}
    function selE(id){
      const fn=selEfn();
      if(typeof fn!=='function')return 'fail:no-selE';
      fn(id);
      return 'api';
    }
    function selU(ids){
      if(XW.v47x&&typeof XW.v47x.sel==='function'){XW.v47x.sel(ids);return 'v47';}
      if(typeof XW.setSel==='function'){XW.setSel(ids);return 'setSel';}
      XW.sel=ids.slice();return 'sel';
    }
    function selB(id){
      if(typeof XW.selB==='function'){XW.selB(id);return 'api';}
      return 'fail:no-selB';
    }
    function clearSel(){
      if(XW.v47x&&typeof XW.v47x.sel==='function')XW.v47x.sel([]);
      else {try{XW.sel=[];}catch(e){}if(typeof XW.selB==='function'){try{XW.selBuilding=null;}catch(e2){}}}
    }
    function paint(){
      try{if(typeof XW.updateUI==='function')XW.updateUI();}catch(e){}
      try{if(window.CultGF&&CultGF.paint)CultGF.paint();}catch(e3){}
    }
    function st(){try{return XW.v47x&&XW.v47x.selState?XW.v47x.selState():{u:XW.sel,b:XW.selBuilding,o:null};}catch(e){return {err:String(e)};}}
    function panelInfo(){
      const pn=document.getElementById('panel');
      const sec=pn&&pn.querySelector('#gf_sec');
      const t=(pn&&pn.innerText)||'';
      const btns=[...document.querySelectorAll('#panel [data-gf="learn"],#panel [data-gf="give"],#panel [data-gf="sell"],#panel [data-gf="eq"],#panel [data-gf="library"]')].map(b=>b.textContent);
      return {
        panelOn:!!(pn&&pn.style.display!=='none'),
        title:((pn&&pn.querySelector('h4')&&pn.querySelector('h4').innerText)||'').replace(/\\s+/g,' ').trim(),
        hasSec:!!sec,
        hasLearn:/卷軸參悟|傳授給選中弟子/.test(t)||btns.length>0,
        btns,
        text:t.slice(0,200),
        st:st()
      };
    }
    return {selE,selU,selB,clearSel,paint,panelInfo,st};
  })()`;
}

(async()=>{
  const b=await chromium.launch({headless:true,executablePath:'/usr/bin/google-chrome',args:['--no-sandbox','--disable-gpu','--disable-dev-shm-usage']});
  const ctx=await b.newContext({viewport:{width:1280,height:800},serviceWorkers:'block'});
  const p=await ctx.newPage();
  const errs=[];
  p.on('pageerror',e=>errs.push(String(e)));
  p.on('console',m=>{if(m.type()==='error')errs.push(m.text());});
  try{
    await boot(p);
    const spawn=await p.evaluate(()=>({spawn:window._testSpawn,bld:window._testBld,did:window._testDisciple,hasUI:typeof XW.updateUI,hasV47:!!(XW.v47x&&XW.v47x.sel)}));
    rec('0 生成敵人／弟子／大殿',!!(spawn.spawn&&spawn.spawn.ok&&spawn.bld&&spawn.did),spawn);

    const rPl=await p.evaluate((body)=>{
      const F=eval(body);
      try{CultGF.openPanel(false);}catch(e){}
      F.selU([XW.player().id]);F.paint();
      return F.panelInfo();
    },helpers());
    rec('1 選主角→#panel 內有 #gf_sec',rPl.hasSec&&rPl.panelOn,rPl);

    const rEn=await p.evaluate((body)=>{
      const F=eval(body);
      try{CultGF.openPanel(false);}catch(e){}
      const via=F.selE(window._testEnemy);F.paint();
      const info=F.panelInfo();info.via=via;info.builds=CultGF._gfBuilds|0;
      return info;
    },helpers());
    rec('2 選敵人→#panel 顯示敵人且無 #gf_sec',rEn.panelOn&&!rEn.hasSec&&!rEn.hasLearn&&/山賊頭目|敵/.test(rEn.title+rEn.text),{title:rEn.title,hasSec:rEn.hasSec,hasLearn:rEn.hasLearn,via:rEn.via,st:rEn.st,text:rEn.text});

    await p.screenshot({path:SHOT,fullPage:false});

    const rStay=await p.evaluate(async(body)=>{
      const F=eval(body);
      const snaps=[];
      for(let i=0;i<12;i++){
        F.paint();
        snaps.push(F.panelInfo().hasSec);
        await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)));
      }
      const last=F.panelInfo();
      return {any:snaps.some(Boolean),snaps,last,builds:CultGF._gfBuilds|0};
    },helpers());
    rec('3 選敵人後持續多幀仍無 #gf_sec',!rStay.any&&!rStay.last.hasSec&&/山賊頭目|敵/.test((rStay.last.title||'')+(rStay.last.text||'')),rStay);

    const rBd=await p.evaluate((body)=>{
      const F=eval(body);
      const id=window._testBld;
      try{CultGF.openPanel(false);}catch(e){}
      const via=F.selB(id);F.paint();
      const info=F.panelInfo();info.via=via;info.bid=id;
      return info;
    },helpers());
    rec('4 選建築→#panel 內無 #gf_sec',rBd.panelOn&&!rBd.hasSec&&!rBd.hasLearn,rBd);

    const rPl2=await p.evaluate((body)=>{
      const F=eval(body);
      F.selU([XW.player().id]);F.paint();
      return F.panelInfo();
    },helpers());
    rec('5 再選主角→#gf_sec 恢復',rPl2.hasSec&&rPl2.panelOn,rPl2);

    const rDs=await p.evaluate((body)=>{
      const F=eval(body);
      F.selU([window._testDisciple]);F.paint();
      return F.panelInfo();
    },helpers());
    rec('6 選弟子→#panel 內有 #gf_sec',rDs.hasSec&&rDs.panelOn,rDs);

    const rClr=await p.evaluate((body)=>{
      const F=eval(body);
      try{CultGF.openPanel(false);}catch(e){}
      F.selE(window._testEnemy);F.paint();
      const before=F.panelInfo();
      const html0=(document.getElementById('panel')&&document.getElementById('panel').innerHTML)||'';
      F.clearSel();
      const pn=document.getElementById('panel');
      if(pn){pn.style.display='block';if(!pn.innerHTML||pn.style.display==='none'){pn.style.display='block';pn.innerHTML=html0;}}
      else return {err:'no panel',beforeHas:before.hasSec};
      // 殘留敵人資訊卡時，只連續呼叫 CultGF.paint，不得插回 #gf_sec
      const mid=[];
      for(let i=0;i<8;i++){
        try{if(window.CultGF&&CultGF.paint)CultGF.paint();}catch(e){}
        mid.push(!!document.querySelector('#panel #gf_sec'));
      }
      const after={hasSec:!!document.querySelector('#panel #gf_sec'),text:((document.getElementById('panel')&&document.getElementById('panel').innerText)||'').slice(0,160),st:F.st()};
      return {beforeHas:before.hasSec,beforeTitle:before.title,any:mid.some(Boolean),afterHas:after.hasSec,mid,text:after.text,st:after.st};
    },helpers());
    rec('7 清空選擇不在敵人面板插入 #gf_sec',!rClr.beforeHas&&!rClr.any&&!rClr.afterHas,rClr);

    rec('8 主控台無錯',errs.length===0,errs.slice(0,6));
  }catch(e){rec('EXC',false,String(e&&e.stack||e));}
  await b.close();
  const f=rows.filter(r=>!r.ok).length;console.log(`RESULT ${rows.length-f}/${rows.length}`);process.exit(f?1:0);
})();
