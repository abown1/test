// 2026-11-13 極強上限 strongcap＋收集圖鑑 codex 單元測（node）
const vm=require('vm'),fs=require('fs'),path=require('path');const D=path.join(__dirname,'..');
let pass=0,fail=0;const ok=(n,c,d)=>{if(c)pass++;else fail++;console.log((c?'PASS ':'FAIL ')+n+(c||d===undefined?'':' '+JSON.stringify(d).slice(0,400)));};
const g12=fs.readFileSync(D+'/g12.js','utf8');
const core=g12.slice(g12.indexOf('const MAT_NAMES='),g12.indexOf('const SLOT_NAMES=')).replace(/^const PILL_ORDER=/m,'var PILL_ORDER=')+'\n'+g12.split('\n').filter(l=>/^function (have|pay2|canPay2|slotFor|canWear|addMat|addPill)\(/.test(l)).join('\n');
const RM=fs.readFileSync(D+'/econ_realmmat.js','utf8');
function ctx(search,econ){const c={console,location:{search:search||''},Math,JSON,Date};c.window=c;
  c.S={time:50.7,mats:{hide:0,bone:0,core:0,lingzhi:0,xuantie:0},pills:{},inv:[],nextItem:1,res:{lingshi:0},econ:econ===undefined?{flags:{}}:econ,stats:{},units:[]};
  c.toast=()=>{};c.floater=()=>{};c.QN=['凡品','良品','精品','靈器','法寶'];
  vm.createContext(c);vm.runInContext(core+'\nfunction makeItem(t,q,el){const T=GEAR[t];return {id:S.nextItem++,t,slot:T?T.slot:"c",q,el,atk:0,hp:0,def:0,spd:0};}function addItem(it){S.inv.push(it);return true;}'+
   '\nfunction equip(u,itId,slot){const it=S.inv.find(x=>x.id===itId);slot=slot||slotFor(u,it);const why=canWear(u,it,slot);if(why){toast(why);return false;}u.eq=u.eq||{};const old=u.eq[slot];S.inv=S.inv.filter(x=>x!==it);if(old)S.inv.push(old);u.eq[slot]=it;return true;}',c);
  vm.runInContext(RM,c);return c;}
{
  const c=ctx('?realmmat=1');const A=c.econRealmMat;const u={realm:10,eq:{}},msgs=[];c.toast=m=>msgs.push(m);
  ok('CAP-0 realmmat 開 → strongcap 預設開；極強不計套件常數 false、上限 2',A.strongCapOn()===true&&c.ECON_RM_STRONG_MAX_EQUIP===2&&c.ECON_RM_STRONG_SET_COUNT===false);
  const w=A.grantGear('rmgw10_s',2),a=A.grantGear('rmga8_s',2),cc=A.grantGear('rmgc6_s',2),n1=A.grantGear('rmgc10_31a',2);
  ok('CAP-1 第 1、2 件極強可穿',c.equip(u,w.id,'w')&&c.equip(u,a.id,'a'));
  const r3=c.equip(u,cc.id,'c1');
  ok('CAP-2 第 3 件極強被拒並提示',r3===false&&/最多穿 2 件/.test(msgs[msgs.length-1]||''),msgs);
  ok('CAP-3 一般護符照穿',c.equip(u,n1.id,'c1'));
  const w2=A.grantGear('rmgw6_s',2);ok('CAP-4 同欄換另一件極強（件數不變）照准',c.equip(u,w2.id,'w')&&u.eq.w===w2);
  ok('CAP-5 canWear 直接回傳理由（一鍵最佳用 canWear 篩選）',/最多穿 2 件/.test(c.canWear(u,cc,'c2')));
  const u3={realm:10,eq:{w:w,a:a,c1:A.makeGear('rmgc8_s',2)}};const cx=A.grantGear('rmgc10_s',2);
  ok('CAP-6 舊檔已穿 3 件：沒有被卸下；第 4 件被擋；同欄換極強照准',A.strongWorn(u3)===3&&/最多/.test(c.canWear(u3,cx,'c2'))&&c.canWear(u3,cx,'c1')==='');
  const c2=ctx('?realmmat=1&strongcap=0');const A2=c2.econRealmMat;const u2={realm:10,eq:{}};
  const g=['rmgw10_s','rmga8_s','rmgc6_s'].map(id=>A2.grantGear(id,2));
  ok('CAP-7 ?strongcap=0：3 件都能穿',c2.equip(u2,g[0].id,'w')&&c2.equip(u2,g[1].id,'a')&&c2.equip(u2,g[2].id,'c1'));
  const c3=ctx('?realmmat=1',{flags:{strongCap:false}});ok('CAP-8 S.econ.flags.strongCap=false 也能關',c3.econRealmMat.strongCapOn()===false);
  const c4=ctx('');ok('CAP-9 realmmat 關 → strongcap 關、canWear 對舊裝備不變',c4.econRealmMat.strongCapOn()===false&&c4.canWear({realm:0,eq:{}},{slot:'w',q:0},'w')==='');
}
{
  const c=ctx('?realmmat=1',{flags:{},vault:{xia:0}});const A=c.econRealmMat;
  ok('CX-0 舊檔沒有 codex 欄位：不報錯；開旗標補掃時才建立空表',c.S.econ.codex===undefined&&A.scan()===0&&JSON.stringify(c.S.econ.codex)==='{"v":1,"seen":{}}');
  c.addMat('hide',2);ok('CX-1 addMat 記錄 m:hide（遊戲秒取整）',c.S.econ.codex.seen['m:hide']===50);
  c.S.time=99;c.addMat('hide',1);ok('CX-2 再取得不覆寫首次時間',c.S.econ.codex.seen['m:hide']===50);
  c.addPill('hx',0,1);A.grantMat('rmp3_1',1);c.S.mats.rmc0_1=10;A.synth('rmc0_1','rmc1_3',1);A.grantGear('rmgw6_s',1);
  const s=c.S.econ.codex.seen;ok('CX-3 丹藥、貴重、合成產物、新裝備都記錄',s['p:hx']&&s['m:rmp3_1']&&s['m:rmc1_3']&&s['g:rmgw6_s'],s);
  c.S.mats.hide=0;c.S.inv=[];A.scan();ok('CX-4 用掉／丟掉後記錄不消失',s['m:hide']===50&&s['g:rmgw6_s']>0);
  c.S.units=[{eq:{w:{t:'sword'}}}];c.S.pills.zj=[0,1,0];A.scan();ok('CX-5 補掃：單位身上裝備與持有丹藥',s['g:sword']>0&&s['p:zj']>0);
  ok('CX-6 目錄含新增物品：材料 65、符籙等 10、武器含新 80',A.entries('mat').length===65&&A.entries('item').length===10&&A.entries('w').filter(e=>/^g:rmg/.test(e.key)).length===80);
  ok('CX-7 套裝列含新件',A.setRows().some(r=>r.id===40&&r.keys.some(k=>/rmg/.test(k))));
  ok('CX-8 欄位可 JSON 存讀',JSON.stringify(JSON.parse(JSON.stringify(c.S.econ)).codex)===JSON.stringify(c.S.econ.codex));
  const c2=ctx('',{flags:{}});c2.addMat('hide',1);c2.econRealmMat.scan();ok('CX-9 realmmat 關：不建立、不寫入',c2.S.econ.codex===undefined);
  const c3=ctx('?realmmat=1&codex=0',{flags:{}});c3.addMat('hide',1);c3.econRealmMat.scan();ok('CX-10 ?codex=0：不建立、不寫入',c3.S.econ.codex===undefined);
  const c4=ctx('',{flags:{},codex:{v:1,seen:{'m:hide':5}}});c4.addMat('bone',1);ok('CX-11 旗標關讀到有 codex 的新檔：原封不動',JSON.stringify(c4.S.econ.codex)==='{"v":1,"seen":{"m:hide":5}}');
  const c5=ctx('?realmmat=1',{flags:{},codex:'壞掉'});c5.addMat('bone',1);ok('CX-12 欄位壞掉：重建、不報錯',c5.S.econ.codex.seen['m:bone']>0);
  const c6=ctx('?realmmat=1',null);let e6=null;try{c6.addMat('bone',1);c6.econRealmMat.scan();}catch(e){e6=String(e);}ok('CX-13 沒有 S.econ：不報錯',e6===null);
}
console.log('SUMMARY '+pass+'/'+(pass+fail));process.exit(fail?1:0);
