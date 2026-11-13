// gearGuard 單元測試（node，只載入 econ_gtrade.js 檔尾 gearGuard 段，其餘全域用替身）
const fs=require('fs'),vm=require('vm'),path=require('path');
const src=fs.readFileSync(path.join(__dirname,'..','econ_gtrade.js'),'utf8');const i=src.indexOf('// ===== gearGuard');if(i<0)throw new Error('no gearGuard');
const code=src.slice(i);let pass=0,fail=0;const ok=(n,c,d)=>{if(c)pass++;else fail++;console.log((c?'PASS ':'FAIL ')+n+(c?'':' '+JSON.stringify(d)));};
function mk(search,opts){opts=opts||{};const toasts=[];const listeners=[];
  const S={inv:[],buildings:opts.zc?[{type:'zongcang',built:true}]:[],econ:{flags:{}},time:100};
  const ctx={S,location:{search:search||''},window:{},toast:m=>toasts.push(m),setTimeout:()=>0,setInterval:()=>0,console,
    document:{addEventListener:(t,f,c)=>listeners.push(f),getElementById:()=>null},
    econIsPlayerUnit:u=>u.kind==='player'||!!u.np,gtGearHeld:it=>it._gotT!=null&&S.time-it._gotT<60,
    equipBest:function(u,quiet){let n=0;u.eq=u.eq||{};for(const it of S.inv.slice()){if(!u.eq[it.slot]){u.eq[it.slot]=it;S.inv=S.inv.filter(x=>x!==it);n++;}}return n;}};
  ctx.window=ctx;vm.createContext(ctx);vm.runInContext(code,ctx);return {ctx,S,toasts};}
const P={kind:'player',id:1},D=()=>({kind:'disciple',id:2}),NP={kind:'disciple',id:3,np:'k'};
{const {ctx,S,toasts}=mk('');S.inv=[{id:1,slot:'w'},{id:2,slot:'a'}];const d=D();const n=ctx.equipBest(d,false);
 ok('1 無總倉：弟子一鍵最佳拿不到宗門裝備',n===0&&S.inv.length===2&&!Object.keys(d.eq||{}).length,{n,inv:S.inv.length});ok('1b 有提示',toasts.length===1&&/裝備給/.test(toasts[0]),toasts);}
{const {ctx,S}=mk('');S.inv=[{id:1,slot:'w'}];const n=ctx.equipBest(P,true);ok('2 無總倉：主角照常',n===1&&S.inv.length===0);}
{const {ctx,S}=mk('');S.inv=[{id:1,slot:'w'}];const n=ctx.equipBest(NP,true);ok('3 無總倉：聯機玩家化身（np）照常',n===1);}
{const {ctx,S}=mk('?gearguard=0');S.inv=[{id:1,slot:'w'}];const n=ctx.equipBest(D(),true);ok('4 ?gearguard=0：舊行為（弟子可拿）',n===1);}
{const {ctx,S}=mk('');ctx.ECON_GEARGUARD_FORCE=false;S.inv=[{id:1,slot:'w'}];ok('5 ECON_GEARGUARD_FORCE=false：舊行為',ctx.equipBest(D(),true)===1);}
{const {ctx,S}=mk('');S.econ.flags.gearGuard=false;S.inv=[{id:1,slot:'w'}];ok('6 S.econ.flags.gearGuard=false：舊行為',ctx.equipBest(D(),true)===1);}
{const {ctx,S}=mk('',{zc:true});const a={id:1,slot:'w',_gotT:90},b={id:2,slot:'a',_gotT:0},c={id:3,slot:'c'};S.inv=[a,b,c];const d=D();const n=ctx.equipBest(d,true);
 ok('7 有總倉：弟子可配，但剛入手 60 秒內的不配，且放回原位',n===2&&S.inv.length===1&&S.inv[0]===a&&d.eq.a===b&&d.eq.c===c,{n,inv:S.inv.map(x=>x.id)});}
{const {ctx,S}=mk('',{zc:true});const a={id:1,slot:'w',_gotT:90},b={id:2,slot:'w'},c={id:3,slot:'a',_gotT:95};S.inv=[a,b,c];const n=ctx.equipBest(D(),true);
 ok('8 有總倉：保留品順序不變',n===1&&S.inv.map(x=>x.id).join()==='1,3',S.inv.map(x=>x.id));}
{const {ctx}=mk('');const w1=ctx.equipBest;const w2=ctx.econGGWrapBest(w1);ok('9 不重複包',w1===w2&&w1._econGG===1);}
{const {ctx,S}=mk('');S.buildings=[{type:'zongcang',built:false}];ok('10 總倉未蓋好／損毀不算有總倉',ctx.econGGBlocked(D())===true);S.buildings=[{type:'zongcang',built:true,broken:true}];ok('10b 損毀',ctx.econGGBlocked(D())===true);}
console.log(`== ${pass}/${pass+fail} PASS`);process.exit(fail?1:0);
