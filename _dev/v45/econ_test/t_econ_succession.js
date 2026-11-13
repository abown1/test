// econ_succession：高職（長老／執法／外事）壽終或壽元 <10% 自動交接；接任：境界→貢獻→忠誠；舊任降內門；宗主不交接。
// Node vm：載入真的 econ_core／econ_rank／econ_succession，壽元用 XW_LIFE 替身（remaining＝lifeMax−age），hook 用 window.cultHooks。
const fs=require('fs'),vm=require('vm'),path=require('path');
const ROOT=path.join(__dirname,'..');
const rows=[];const rec=(n,ok,d)=>{rows.push({n,ok:!!ok,d});console.log((ok?'PASS ':'FAIL ')+n+' '+(d==null?'':JSON.stringify(d)).slice(0,500));};
function load(search,opt){
  opt=opt||{};
  const ctx={console,Math,JSON,Object,Array,isFinite,Infinity,S:null,TUNE:{dayLen:300},ECON_LV_MAX:6,__toasts:[],__evlog:[],location:{search:search||''},
    document:undefined,setTimeout:undefined,UNIT_KEEP:[]};
  ctx.window=ctx;vm.createContext(ctx);
  vm.runInContext(`function toast(m){__toasts.push(String(m));}
    function y47EvLog(m){__evlog.push(m);}
    function update(dt){S.time+=dt;}
    var XW_LIFE={remaining:function(u){return u.lifeMax==null?Infinity:Math.max(0,u.lifeMax-(u.age||0));}};`,ctx);
  if(opt.cultFirst)vm.runInContext(`window.cultHooks={onLifeEnd:[function(){}],onLifeLow:[]};`,ctx);
  for(const f of ['econ_core.js','econ_rank.js','econ_succession.js'])vm.runInContext(fs.readFileSync(path.join(ROOT,f),'utf8'),ctx,{filename:f});
  return ctx;
}
function D(id,o){return Object.assign({id,kind:'disciple',name:'弟'+id,realm:1,contrib:0,loyal:50,lifeMax:100,age:20},o||{});}
function fresh(ctx,units){
  ctx.__toasts.length=0;ctx.__evlog.length=0;ctx.ECON_SUCCESSION_FORCE=null;
  const S={time:0,units:[{id:1,kind:'player',name:'宗主',lifeMax:100,age:95}].concat(units||[]),buildings:[],res:{lingshi:0},flags:{},econ:null};
  ctx.S=S;ctx.econInitState(S);S.econ.flags.ranks=true;
  return S;
}
const P=(c,id)=>c.econPostOf(c.S.units.find(u=>u.id===id));
const fire=(c,name,args)=>{for(const h of c.cultHooks[name])h.apply(null,args);};

// 1 旗標
{
  const c=load();fresh(c);
  rec('1a ECON_SUCCESSION_DEFAULT===true，且不在 ECON_FLAGS_DEFAULT',c.ECON_SUCCESSION_DEFAULT===true&&!('succession' in c.ECON_FLAGS_DEFAULT));
  rec('1b 缺旗標＝開',c.econSuccessionOn()===true);
  c.S.econ.flags.succession=false;rec('1c flags.succession=false＝關',c.econSuccessionOn()===false);
  const c2=load('?succession=0');fresh(c2);rec('1d ?succession=0＝關',c2.econSuccessionOn()===false);
  c2.ECON_SUCCESSION_FORCE=true;rec('1e FORCE 優先',c2.econSuccessionOn()===true);
}
// 2 hook 註冊（從 econ 側 push，不覆蓋修煉已有的陣列；重跑 install 不重複）
{
  const c=load('',{cultFirst:true});
  c.econSuccessionInstall();c.econSuccessionInstall();
  rec('2a 掛到 cultHooks.onLifeEnd／onLifeLow 各 1 次，保留原有 hook',c.cultHooks.onLifeEnd.length===2&&c.cultHooks.onLifeLow.length===1&&c.cultHooks.onLifeEnd.filter(f=>f===c.econSuccOnLifeEnd).length===1);
  rec('2b update 只包一次（模組旗標）',c.ECON_SUCC_RT.wrapped===1);
}
// 3 onLifeLow：境界最高者接任，舊任降內門
{
  const c=load();const S=fresh(c,[D(10,{realm:2,age:95}),D(11,{realm:3}),D(12,{realm:4,contrib:0}),D(13,{realm:2,contrib:999})]);
  c.econAppoint(S.units[1],'zhanglao');
  const u=S.units[1];fire(c,'onLifeLow',[u,0.05]);
  rec('3a 長老壽元 <10%：境界最高（煉氣 12）接任長老',P(c,12)==='zhanglao',{p12:P(c,12)});
  rec('3b 舊任降為內門',P(c,10)==='neimen');
  rec('3c 交接紀錄寫入 S.econ.succLog 與宗門事務紀錄',S.econ.succLog.length===1&&S.econ.succLog[0].from===10&&S.econ.succLog[0].to===12&&c.__evlog.length===1,S.econ.succLog[0]);
}
// 4 同境界比貢獻，再同比忠誠
{
  const c=load();const S=fresh(c,[D(10,{age:95}),D(11,{realm:3,contrib:5,loyal:10}),D(12,{realm:3,contrib:9,loyal:10}),D(13,{realm:3,contrib:9,loyal:90})]);
  c.econAppoint(S.units[1],'zhifa');fire(c,'onLifeLow',[S.units[1],0.02]);
  rec('4a 同境界、同貢獻：忠誠高者接任（執法）',P(c,13)==='zhifa'&&P(c,10)==='neimen',{p13:P(c,13)});
  const c2=load();const S2=fresh(c2,[D(10,{age:95}),D(11,{realm:3,contrib:5,loyal:99}),D(12,{realm:3,contrib:9,loyal:1})]);
  c2.econAppoint(S2.units[1],'waishi');fire(c2,'onLifeLow',[S2.units[1],0.02]);
  rec('4b 同境界：貢獻高者優先於忠誠（外事）',P(c2,12)==='waishi'&&P(c2,11)!=='waishi');
}
// 5 候選排除：已任高職者、壽元 <10% 者、宗主
{
  const c=load();const S=fresh(c,[D(10,{age:95}),D(11,{realm:9}),D(12,{realm:8,age:95}),D(13,{realm:2})]);
  c.econAppoint(S.units[1],'zhanglao');c.econAppoint(S.units[2],'zhifa');
  fire(c,'onLifeLow',[S.units[1],0.05]);
  rec('5a 已任執法者不搶長老、壽元將盡者不接任 → 由 13 接',P(c,13)==='zhanglao'&&P(c,11)==='zhifa'&&P(c,12)!=='zhanglao',{p11:P(c,11),p12:P(c,12),p13:P(c,13)});
}
// 6 宗主不交接
{
  const c=load();const S=fresh(c,[D(10),D(11,{realm:5})]);
  const pl=S.units[0];pl.office='zhangmen';
  const r=c.econSuccessionHandOver(pl,'low');fire(c,'onLifeEnd',[pl]);
  rec('6a 宗主（玩家）壽元將盡／壽終：不交接',r.ok===false&&r.reason==='leader'&&pl.office==='zhangmen'&&!S.econ.succLog);
  const av=D(20,{np:'pk1',age:99});S.units.push(av);av.office='zhanglao';av.econOffice='zhanglao';
  const r2=c.econSuccessionHandOver(av,'low');
  rec('6b 聯機玩家化身（np）：不交接',r2.ok===false&&r2.reason==='leader');
}
// 7 onLifeEnd 無人可接：職位懸缺、舊任降內門；onLifeLow 無人可接：暫留原任
{
  const c=load();const S=fresh(c,[D(10,{age:95})]);c.econAppoint(S.units[1],'zhanglao');
  fire(c,'onLifeLow',[S.units[1],0.05]);
  rec('7a 壽元將盡但無人可接：暫留原任',P(c,10)==='zhanglao');
  fire(c,'onLifeEnd',[S.units[1]]);
  rec('7b 壽終無人可接：降內門、長老懸缺、有紀錄',P(c,10)==='neimen'&&c.econPostCount('zhanglao')===0&&S.econ.succLog.length===1&&S.econ.succLog[0].to===null);
}
// 8 onLifeEnd 一般情形
{
  const c=load();const S=fresh(c,[D(10,{age:100}),D(11,{realm:6})]);c.econAppoint(S.units[1],'zhanglao');
  fire(c,'onLifeEnd',[S.units[1]]);
  rec('8 壽終（onLifeEnd，u 仍在 S.units）：交接給 11',P(c,11)==='zhanglao'&&P(c,10)==='neimen'&&S.econ.succLog[0].why==='end');
}
// 9 保險輪詢（修煉 hooksOn=false 時 hook 不會被呼叫）
{
  const c=load();const S=fresh(c,[D(10,{age:50}),D(11,{realm:6})]);c.econAppoint(S.units[1],'zhanglao');
  for(let i=0;i<5;i++)c.update(0.5);
  const a=P(c,10);
  S.units[1].age=91; // 剩 9%
  for(let i=0;i<3;i++)c.update(0.5);
  rec('9a 壽元 ≥10% 不動作',a==='zhanglao');
  rec('9b 輪詢：壽元 <10% 自動交接（不需 hook）',P(c,11)==='zhanglao'&&P(c,10)==='neimen');
  S.units[1].age=90;S.units[2].age=89.9;for(let i=0;i<3;i++)c.update(0.5);
  rec('9c 剛好 10% 不算 <10%',P(c,11)==='zhanglao');
}
// 10 不重複：重跑 hook／輪詢／讀檔
{
  const c=load();const S=fresh(c,[D(10,{age:95}),D(11,{realm:6}),D(12,{realm:5})]);c.econAppoint(S.units[1],'zhanglao');
  fire(c,'onLifeLow',[S.units[1],0.05]);fire(c,'onLifeLow',[S.units[1],0.05]);fire(c,'onLifeEnd',[S.units[1]]);
  for(let i=0;i<6;i++)c.update(0.5);
  rec('10a 同一人多次觸發只交接一次',S.econ.succLog.length===1&&P(c,11)==='zhanglao'&&P(c,12)!=='zhanglao');
  const S2=JSON.parse(JSON.stringify(S));c.S=S2;for(let i=0;i<6;i++)c.update(0.5);
  rec('10b 讀檔（JSON 來回）後不再交接',S2.econ.succLog.length===1&&c.econPostOf(S2.units.find(u=>u.id===11))==='zhanglao');
}
// 11 旗標關：hook 與輪詢都不動
{
  const c=load('?succession=0');const S=fresh(c,[D(10,{age:99}),D(11,{realm:6})]);c.econAppoint(S.units[1],'zhanglao');
  fire(c,'onLifeLow',[S.units[1],0.01]);fire(c,'onLifeEnd',[S.units[1]]);for(let i=0;i<6;i++)c.update(0.5);
  rec('11 旗標關：不交接',P(c,10)==='zhanglao'&&!S.econ.succLog);
}
// 12 聯機客機不動
{
  const c=load();const S=fresh(c,[D(10,{age:99}),D(11,{realm:6})]);c.econAppoint(S.units[1],'zhanglao');c.NET={role:'client'};
  fire(c,'onLifeLow',[S.units[1],0.01]);for(let i=0;i<6;i++)c.update(0.5);
  rec('12 客機：不交接',P(c,10)==='zhanglao');
}
// 13 低職（內門／外門）壽元將盡：不處理
{
  const c=load();const S=fresh(c,[D(10,{age:99}),D(11,{realm:6})]);c.econAppoint(S.units[1],'neimen');
  const r=c.econSuccessionHandOver(S.units[1],'low');
  rec('13 非高職不交接',r.ok===false&&r.reason==='not-high');
}
// 14 不改存檔結構：只多 S.econ.succLog；不動 UNIT_KEEP
{
  const c=load();const S=fresh(c,[D(10,{age:99}),D(11,{realm:6})]);const k0=c.UNIT_KEEP.slice();c.econAppoint(S.units[1],'zhanglao');
  fire(c,'onLifeLow',[S.units[1],0.01]);
  rec('14 UNIT_KEEP 沒新增欄位、單位沒新增欄位',JSON.stringify(c.UNIT_KEEP)===JSON.stringify(k0)&&!Object.keys(S.units[1]).some(k=>/succ/i.test(k)),c.UNIT_KEEP);
}
const pass=rows.filter(r=>r.ok).length,fail=rows.length-pass;
console.log(`\nt_econ_succession: ${pass}/${rows.length} PASS, ${fail} FAIL`);
process.exitCode=fail?1:0;
