// ===== net12：成員角色與主角同等（#9） =====
// 新成員的化身：以主角模板（makePlayer：基礎數值、混沌靈根）建立一次，綁 pkey，之後永不重擲（u.netPar 旗標，存檔保留）。
// 舊存檔裡已存在的化身（無靈根、弟子數值）：遷移一次 → 補上主角的靈根、基礎數值取兩者較高（不降低）。
// 煉氣門檻（g4 breakConds：有靈根或仙緣 ≥50）因此與主角一致；其他境界上限本來就不分主角／弟子。
// 功能開關（net12 起的新功能）：?netexp=名稱 打開、?netexp=-名稱 關閉（逗號分隔）。預設值見下；未完成的功能預設 false。
const NET_FLAGS={dgdeath:true,party:true,vote:true,hostbg:true,hostmig:true,bossgate:true,y47:true,revive:true,gather:true,pcro:true};
try{const q=/[?&]netexp=([^&]*)/.exec(location.search);if(q)for(const t of decodeURIComponent(q[1]).split(',')){const k=t.replace(/^[-+]/,'');if(k in NET_FLAGS)NET_FLAGS[k]=!t.startsWith('-');}}catch(e){}
if(typeof UNIT_KEEP!=='undefined'&&!UNIT_KEEP.includes('netPar'))UNIT_KEEP.push('netPar');
const NET_PC_STATS=['body','hp','maxhp','atk','speed','gat','wu','xy','luck','loyal','person','r'];
function netPCParity(u,fresh){if(!u||u.netPar)return u;const t=makePlayer(u.x,u.y);
  if(fresh){for(const k of NET_PC_STATS)if(t[k]!==undefined)u[k]=t[k];u.lg=t.lg;u.realm=0;u.sub=0;u.xiu=0;}
  else{if(!u.lg)u.lg=t.lg;for(const k of ['wu','xy','luck','speed','gat'])if(typeof t[k]==='number')u[k]=Math.max(+u[k]||0,t[k]);
    if((u.realm|0)===0&&!(u.sub|0)&&(u.maxhp||0)<t.maxhp){u.hp=Math.round((u.hp||0)*t.maxhp/Math.max(1,u.maxhp||1));u.maxhp=t.maxhp;}if((u.realm|0)===0&&!(u.sub|0))u.atk=Math.max(+u.atk||0,t.atk);}
  {const f=u.v47t||'';u.v47t=f+(f.includes('x')?'':'x')+(f.includes('r')?'':'r');} // g18 v47Talent 只加給非主角：化身與主角同等 → 標記為已套用，不再額外加成
  u.netPar=1;netLog(fresh?'avatar created with protagonist template':'avatar migrated to protagonist parity',u.np,u.id);return u;}
{const _x=netEnsureAvatar;netEnsureAvatar=function(pk,name){const had=!!netAvatarOf(pk);const u=_x.apply(this,arguments);try{netPCParity(u,!had);}catch(e){netLog('parity err',String(e&&e.message||e));}return u;};}
// 開房／讀檔時：已存在的化身一律遷移一次
function netPCMigrateAll(){const L=S.units.concat(S.dg&&S.dg.W&&S.dg.W.units||[],typeof netParkUnits==='function'?netParkUnits():[]);for(const u of L)if(u&&u.np&&!u.netPar)netPCParity(u,false);}
{const _x=applySave;applySave=function(d){const r=_x.apply(this,arguments);try{if(r)netPCMigrateAll();}catch(e){}return r;};}
{const _x=XW045;XW045=function(){const o=_x.apply(this,arguments);if(o.net){o.net.test=Object.defineProperties(o.net.test||{},{
  pc:{value:pk=>{const u=pk?netAvatarOf(pk):player();if(!u)return null;return {id:u.id,kind:u.kind,np:u.np||null,lg:u.lg?JSON.stringify(u.lg):null,wu:u.wu,xy:u.xy,luck:u.luck,maxhp:u.maxhp,atk:u.atk,speed:u.speed,gat:u.gat,netPar:!!u.netPar,realm:u.realm,name:u.name};},configurable:true},
  migrate:{value:()=>netPCMigrateAll(),configurable:true}});}return o;};}
