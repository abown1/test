const {chromium}=require('/workspace/xianwu_demo/node_modules/playwright-core');
const fs=require('fs');
const URL=process.env.XW_URL||'http://127.0.0.1:18861/';
const OUT=process.env.XW_OUT||'/tmp/pickup_fix/pickup.json';

(async()=>{
  const b=await chromium.launch({executablePath:'/usr/bin/google-chrome',args:['--no-sandbox','--disable-dev-shm-usage']});
  const p=await (await b.newContext({viewport:{width:1280,height:800},serviceWorkers:'block'})).newPage();
  const errs=[];
  p.on('pageerror',e=>errs.push(String(e)));
  p.on('console',m=>{if(m.type()==='error')errs.push('console:'+m.text());});
  const out={url:URL,errs:[]};
  try{
    await p.goto(URL+(URL.includes('?')?'&':'?')+'dev=1',{waitUntil:'domcontentloaded'});
    await p.waitForFunction(()=>window.XW&&XW.newGame&&XW.player&&window.__rbEv,{timeout:40000});
    await p.evaluate(()=>{XW.newGame(5,true);XW.showTitle(false);XW.tutEnd&&XW.tutEnd(true);XW.setHelp&&XW.setHelp(false);if(window.UI_NOTICE)UI_NOTICE.close();});
    await p.waitForTimeout(500);
    const r=await p.evaluate(()=>window.__rbEv('('+function(){
      function toasts(){return Array.from(document.querySelectorAll('#toasts > *')).map(el=>el.textContent||'');}
      function mkItem(){
        let it=null;
        try{it=makeItem('eg0_hands',0,-1);}catch(e){it=null;}
        if(!it||!it.slot){
          it={id:(S.nextItem=(S.nextItem||1)+1),t:'eg0_hands',slot:'hn',q:0,el:-1,atk:1,hp:4,def:1,spd:0,n:'麻布護腕',realm:0};
        }
        return it;
      }
      function placeDrop(x,y,it){
        S.econ=S.econ||{};
        S.econ.groundGear=S.econ.groundGear||[];
        const rec={id:'t'+Math.random().toString(36).slice(2),x:x,y:y,item:it,t:(S.time||0)-2,dg:false};
        S.econ.groundGear.push(rec);
        return rec;
      }
      function cap(){try{return econInvCap(player());}catch(e){return (TUNE&&TUNE.invCap)||60;}}
      const p0=player();
      let d0=null;
      try{if(typeof spawnDisciple==='function')d0=spawnDisciple(null,{name:'拾取徒'});}catch(e){}
      if(!d0){
        d0=makeDisciple(p0.x+1,p0.y,0,{name:'拾取徒'});
        S.units.push(d0);
      }

      const nameOf=it=>{try{return itemName(it);}catch(e){return it&&it.n;}};

      // A) 主角在 2 格內自動撿（超過舊 1.35／1.5）
      const itA=mkItem();
      p0.x=20;p0.y=20;p0.dead=false;
      d0.x=30;d0.y=30; // 弟子遠離
      const dropA=placeDrop(21.9,20,itA);
      const nA=nameOf(itA);
      const inv0=S.inv.length;
      try{update(0.2);}catch(e){}
      const a={
        name:nA,slot:itA.slot,t:itA.t,
        picked:S.inv.length===inv0+1 && !S.econ.groundGear.some(x=>x.id===dropA.id),
        inBag:S.inv.some(x=>x===itA||(x&&x.t==='eg0_hands'&&S.inv.indexOf(x)>=inv0)),
        groundLeft:S.econ.groundGear.filter(x=>x.id===dropA.id).length,
        toasts:toasts()
      };

      // B) 弟子靠近、主角遠離：弟子自動撿
      S.econ.groundGear=S.econ.groundGear.filter(x=>x.id!==dropA.id);
      const itB=mkItem();
      p0.x=10;p0.y=10;
      d0.x=40;d0.y=40;d0.dead=false;d0.inside=false;
      const dropB=placeDrop(40.4,40,itB);
      const inv1=S.inv.length;
      try{update(0.2);}catch(e){}
      const b={
        picked:S.inv.length===inv1+1 && !S.econ.groundGear.some(x=>x.id===dropB.id),
        groundLeft:S.econ.groundGear.filter(x=>x.id===dropB.id).length,
        toasts:toasts().filter(t=>/拾取/.test(t))
      };

      // C) 點擊：弟子站在掉落上，主角在 2.5 格外；點名牌應撿而非只選弟子
      S.econ.groundGear=S.econ.groundGear.filter(x=>x.id!==dropB.id);
      const itC=mkItem();
      d0.x=50;d0.y=50;
      p0.x=53;p0.y=50; // 3 格外，舊邏輯點了會選弟子
      const dropC=placeDrop(50.05,50,itC);
      let click={};
      try{
        const q=iso(dropC.x,dropC.y),s=worldToScreen(q.x,q.y-16);
        const inv2=S.inv.length,sel0=(selUnits||[]).slice();
        tapAt(s.x,s.y);
        click={
          sx:+s.x.toFixed(1),sy:+s.y.toFixed(1),
          picked:S.inv.length===inv2+1 && !S.econ.groundGear.some(x=>x.id===dropC.id),
          groundLeft:S.econ.groundGear.filter(x=>x.id===dropC.id).length,
          selChangedToDisciple: (selUnits||[]).length===1 && selUnits[0]===d0.id && S.inv.length===inv2,
          toasts:toasts().filter(t=>/拾取|行囊/.test(t))
        };
      }catch(e){click={err:String(e)};}

      // D) 行囊滿：中文提示、物品仍在、不化靈石
      S.econ.groundGear=S.econ.groundGear.filter(x=>x.id!==dropC.id);
      const itD=mkItem();
      const c=cap();
      while(S.inv.length<c)S.inv.push({id:S.nextItem++,t:'sword',slot:'w',q:0,el:-1,atk:1,hp:0,def:0,spd:0});
      const ls0=S.res.lingshi||0, inv3=S.inv.length;
      p0.x=60;p0.y=60;
      d0.x=80;d0.y=80;
      const dropD=placeDrop(60.3,60,itD);
      const beforeToast=toasts();
      try{update(0.2);}catch(e){}
      try{if(typeof XW!=='undefined'&&XW.xwGoPick)XW.xwGoPick(dropD);else if(window.XW_ECON&&XW_ECON.xwGoPick)XW_ECON.xwGoPick(dropD);}catch(e){}
      const afterToast=toasts().filter(t=>beforeToast.indexOf(t)<0||/行囊已滿/.test(t));
      const d={
        cap:c,
        stillOnGround:S.econ.groundGear.some(x=>x.id===dropD.id),
        invUnchanged:S.inv.length===inv3,
        lingshiUnchanged:(S.res.lingshi||0)===ls0,
        toasts:afterToast,
        hasCn:afterToast.some(t=>/行囊已滿/.test(t)&&/無法拾取/.test(t))
      };

      return {
        flags:{pickFix:TUNE&&TUNE.pickFix,econPick2:!!(window.XW_ECON&&XW_ECON.ECON_PICK2),xwGoIsEcon:!!(window.XW_ECON&&XW_ECON.xwGoPick===XW_ECON.econGoPick),hasXwGo:!!(window.XW&&XW.xwGoPick),slot:itA.slot},
        playerAuto:a,
        discAuto:b,
        clickVsDisciple:click,
        bagFull:d
      };
    }+')()'));
    out.result=r;
  }catch(e){out.evalError=String(e);out.stack=e&&e.stack;}
  out.errs=errs.slice(0,20);
  fs.writeFileSync(OUT,JSON.stringify(out,null,2));
  console.log(JSON.stringify({evalError:out.evalError,result:out.result,errs:out.errs.slice(0,8)},null,2));
  await b.close();
})().catch(e=>{console.error('FATAL',e);process.exit(1);});
