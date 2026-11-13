// ================== v0.5 聯機：傳輸層（net1_transport.js）==================
// 由 net 系列檔案負責，串接在 g16/g17 之後、g7 之前（同一個 IIFE 內）。
// 傳輸層抽象：{host(code), join(code), send(to,msg), broadcast(msg), kick(id), close(), on(ev,fn)}
// 事件：'conn'(id) 'msg'(id,msg) 'drop'(id) 'error'(err) 'closed'()
// 實作：PeerJS（公開 broker，房間碼→房主 peer id）／BroadcastChannel（同瀏覽器本機測試）
const NET_PEER_PREFIX='xianwu-v05-';
// 先載入與遊戲同目錄的 vendored 副本（_dev/v45/vendor/peerjs.min.js，PeerJS 1.5.5），失敗才用 CDN
const NET_PEERJS_SRC=['peerjs.min.js','https://cdn.jsdelivr.net/npm/peerjs@1.5.5/dist/peerjs.min.js','https://unpkg.com/peerjs@1.5.5/dist/peerjs.min.js'];
function netLoadScript(src){return new Promise((ok,no)=>{const s=document.createElement('script');s.src=src;s.async=true;s.onload=()=>ok();s.onerror=()=>{s.remove();no(new Error('load '+src));};document.head.appendChild(s);});}
async function netLoadPeerJS(){if(window.Peer)return window.Peer;let last;for(const s of NET_PEERJS_SRC){try{await netLoadScript(s);if(window.Peer)return window.Peer;}catch(e){last=e;}}throw last||new Error('PeerJS 無法載入');}
class NetEmitter{constructor(){this._h={};}on(e,f){(this._h[e]=this._h[e]||[]).push(f);return this;}emit(e,...a){for(const f of this._h[e]||[]){try{f(...a);}catch(err){console.error('[net]',e,err);}}}}
// ---- 大訊息分段（WebRTC DataChannel 單則上限）----
// PeerJS 1.5.x 的 serialization:'json' 不分段：編碼後 ≥16300 bytes 的訊息直接丟掉（emitError 'message-too-big'），
// 所以含整份世界快照的 welcome／full／world／副本開場（數十～數百 KB）在真實 P2P 上永遠送不到成員端。
// 這裡在傳輸層自己分段：依「整則信封 JSON 的 UTF-8 實際 bytes」切 {t:'xc',id,i,n,tt,d}（不是按字元數 5000）。
// PeerJS serialization:'json' 單則須 <15000 bytes（實測上限約 16300，這裡用 15000 留信封餘地）；d 再被 JSON 跳脫後仍須低於上限。
// 收端依序組回再交給上層；序號跳號＝遺失 → 丟棄整則並發 'xcfail'，進度發 'xcprog'。不丟世界欄位、不改上層協定。
// 測試：?mtu=16300 讓 bc／ws 模擬單則上限（超過就丟並報錯）；?nochunk=1 關掉分段（重現舊錯誤）。
function netQS(k){const m=new RegExp('[?&]'+k+'=([^&]*)').exec(location.search);return m?decodeURIComponent(m[1]):null;}
const NET_PEER_MTU=16000,NET_XC_MAX_B=15000,NET_SIM_MTU=+(netQS('mtu')||0),NET_NOCHUNK=netQS('nochunk')==='1';
const netEnc8=new TextEncoder();let netXcSeq=0;const NET_XC={drop:-1,sent:0,big:0,dropped:0,maxB:NET_XC_MAX_B}; // drop：測試用，下一則分段訊息丟掉第 drop 段（數字或 'last'，一次）
function netXcCap(mtu){const hard=NET_XC_MAX_B;if(!mtu)return hard;return Math.max(512,Math.min(hard,mtu-1));}
function netXcBytes(p){return netEnc8.encode(JSON.stringify(p)).length;}
function netXcSplit(s,tt,mtu){const cap=netXcCap(mtu),id=(++netXcSeq)+Math.random().toString(36).slice(2,6),pieces=[];
  let pos=0;while(pos<s.length){let lo=1,hi=s.length-pos,best=1;
    while(lo<=hi){const mid=(lo+hi)>>1,d=s.slice(pos,pos+mid),b=netXcBytes({t:'xc',id,i:pieces.length,n:9999,tt,d});
      if(b<cap){best=mid;lo=mid+1;}else hi=mid-1;}
    pieces.push(s.slice(pos,pos+best));pos+=best;}
  const n=pieces.length;return pieces.map((d,i)=>({t:'xc',id,i,n,tt,d}));}
NET_XC.fit=function(obj,mtu){const s=JSON.stringify(obj),raw=netXcBytes(obj),cap=netXcCap(mtu||NET_PEER_MTU);
  if(raw<cap)return [{t:obj&&obj.t,i:0,n:1,b:raw,unchunked:1}];
  return netXcSplit(s,obj&&obj.t,mtu||NET_PEER_MTU).map(p=>({t:p.t,i:p.i,n:p.n,b:netXcBytes(p)}));};
class NetTr extends NetEmitter{
  constructor(){super();this._xa=new Map();}
  _pack(m,mtu){if(!mtu)return [m];const s=JSON.stringify(m),raw=netXcBytes(m);
    if(raw<netXcCap(mtu))return [m];
    NET_XC.big++;if(NET_NOCHUNK)return [m];
    const out=netXcSplit(s,m.t,mtu);
    {const n=out.length,k=NET_XC.drop==='last'?n-1:NET_XC.drop;if(k>=0&&k<n){out.splice(k,1);NET_XC.drop=-1;NET_XC.dropped=(NET_XC.dropped||0)+1;}}
    const sizes=out.map(netXcBytes);NET_XC.sent+=out.length;NET_XC.last={t:m.t,raw,n:out.length,sizes,max:sizes.length?Math.max.apply(null,sizes):0};
    if(typeof netLog==='function')netLog('chunked',m.t,raw,'bytes ->',out.length,'parts max',NET_XC.last.max);return out;}
  _tooBig(p,mtu){if(!mtu)return false;const b=netXcBytes(p);if(b<mtu&&b<NET_XC_MAX_B)return false;
    // 模擬／保險：超過單則上限就丟（與 PeerJS message-too-big 相同），不改內容、不截世界欄位
    if(b>=mtu||b>=NET_XC_MAX_B){this.emit('error',{type:'message-too-big',message:'Message too big ('+b+' bytes ≥ '+(b>=mtu?mtu:NET_XC_MAX_B)+')'});NET_XC.dropped=(NET_XC.dropped||0)+1;return true;}
    return false;}
  _in(from,m){if(!m||m.t!=='xc'){this.emit('msg',from,m);return;}
    let A=this._xa.get(from);
    if(m.i===0){if(A&&A.got<A.n)this.emit('xcfail',from,{id:A.id,tt:A.tt,got:A.got,n:A.n,why:'superseded'});A={id:m.id,n:m.n,tt:m.tt,parts:[],got:0,t0:Date.now()};this._xa.set(from,A);}
    else if(!A||A.id!==m.id||A.got!==m.i){if(this._xdead===m.id)return;this._xdead=m.id; // 同一則的其餘分段不再重複回報
      this.emit('xcfail',from,{id:m.id,tt:m.tt,got:A&&A.id===m.id?A.got:0,n:m.n,why:'gap'});if(A&&A.id!==m.id&&A.got<A.n)this.emit('xcfail',from,{id:A.id,tt:A.tt,got:A.got,n:A.n,why:'gap'});this._xa.delete(from);return;}
    A.parts.push(m.d);A.got++;A.t=Date.now();this.emit('xcprog',from,{id:A.id,tt:A.tt,got:A.got,n:A.n});
    if(A.got===A.n){this._xa.delete(from);let o;try{o=JSON.parse(A.parts.join(''));}catch(e){this.emit('xcfail',from,{id:A.id,tt:A.tt,got:A.got,n:A.n,why:'parse'});return;}this.emit('msg',from,o);}}
}
// ---- 連線設定與錯誤訊息（PeerJS） ----
// ICE：本遊戲公開 STUN（免帳號）＋使用者自備 TURN（NET_TURN／?turn=／localStorage.xw_turn）。
// PeerJS 1.5.5 的 RTC 設定經公開 API peerjs.util.defaultConfig 整份淺拷貝後再合併 iceServers
//（保留 sdpSemantics 等未知預設欄位與庫內 ICE，不把庫憑證抄進原始碼）。讀不到則沿用舊行為，不 throw。
const NET_ICE=[{urls:['stun:stun.l.google.com:19302','stun:stun1.l.google.com:19302','stun:stun2.l.google.com:19302','stun:stun3.l.google.com:19302','stun:stun4.l.google.com:19302']},
  {urls:'stun:stun.cloudflare.com:3478'},{urls:'stun:global.stun.twilio.com:3478'},{urls:'stun:stun.nextcloud.com:443'}];
const NET_TURN=[];
function netTurnCfg(){const out=NET_TURN.slice();let ls=null;try{ls=localStorage.getItem('xw_turn');}catch(e){}
  for(const raw of [netQS('turn'),ls]){if(!raw)continue;let v;try{v=JSON.parse(raw);}catch(e){const [u,user,pass]=raw.split('|');v={urls:u,username:user,credential:pass};}
    for(const x of [].concat(v))if(x&&x.urls&&/^turns?:/.test(String([].concat(x.urls)[0])))out.push(x);}return out;}
function netIceServers(){return NET_ICE.concat(netTurnCfg());}
function netPeerDefaultRtcConfig(){
  try{
    const u=(typeof peerjs==='object'&&peerjs&&peerjs.util)||(typeof window!=='undefined'&&window.peerjs&&window.peerjs.util);
    const d=u&&u.defaultConfig;
    if(d&&typeof d==='object')return d;
  }catch(err){}
  return null;
}
function netMergePeerConfig(extra){
  extra=extra&&typeof extra==='object'?extra:{};
  const def=netPeerDefaultRtcConfig();
  if(!def)return Object.assign({iceServers:netIceServers()},extra);
  const cfg=Object.assign({},def,extra);
  const a=Array.isArray(def.iceServers)?def.iceServers:[];
  const b=netIceServers();
  const c=Array.isArray(extra.iceServers)?extra.iceServers:[];
  cfg.iceServers=a.concat(b,c);
  return cfg;
}
const NET_ERR_MSG={'peer-unavailable':'房間碼不存在或房主已離線，請確認房碼','unavailable-id':'這個房間碼目前被占用（可能是舊分頁還開著），稍後再試',
  'network':'連不上配對伺服器（網路中斷或被防火牆擋住）','server-error':'配對伺服器暫時無法使用，請稍後再試',
  'socket-error':'與配對伺服器的連線出錯，正在重新連線…','socket-closed':'與配對伺服器的連線中斷，正在重新連線…','disconnected':'與配對伺服器的連線中斷，正在重新連線…',
  'browser-incompatible':'這個瀏覽器不支援 WebRTC，請改用最新版 Chrome／Edge／Safari','webrtc':'無法建立連線（可能是網路/NAT）',
  'negotiation-failed':'無法建立連線（可能是網路/NAT）','timeout':'無法建立連線（可能是網路/NAT）：20 秒內沒有連上房主','server-timeout':'連線配對伺服器逾時，請檢查網路',
  'invalid-id':'房間碼格式不對','ssl-unavailable':'需要 https 才能聯機'};
function netErr(type,detail){const e=new Error(NET_ERR_MSG[type]||detail||type);e.type=type;e.netType=type;if(detail)e.detail=detail;return e;}
function netErrMsg(e){const t=e&&(e.netType||e.type);return NET_ERR_MSG[t]||String(e&&e.message||e);}
const NET_PEER_RETRY=new Set(['network','server-error','socket-error','socket-closed','server-timeout']);
class PeerTransport extends NetTr{
  constructor(opt){super();this.opt=opt||{};this.peer=null;this.conns=new Map();this.hostConn=null;this.kind='peerjs';this.closeGrace=600;this.ice='';}
  _popt(){const o=Object.assign({debug:1},this.opt.peer||{});o.config=netMergePeerConfig(o.config||{});return o;}
  _peer1(id){return netLoadPeerJS().then(Peer=>new Promise((ok,no)=>{const p=id?new Peer(id,this._popt()):new Peer(this._popt());let done=false;
    p.on('open',()=>{done=true;ok(p);});p.on('error',e=>{if(!done){done=true;try{p.destroy();}catch(_){}no(netErr(e&&e.type||'server-error',String(e&&e.message||e)));}else this.emit('error',e);});
    setTimeout(()=>{if(!done){done=true;try{p.destroy();}catch(_){}no(netErr('server-timeout'));}},15000);}));}
  // 連配對伺服器：網路／伺服器類錯誤 → 退避重試 3 次（1、2、4 秒）；unavailable-id 等交給上層決定
  async _peer(id){let last;for(let k=0;k<4;k++){try{return await this._peer1(id);}catch(e){last=e;if(!NET_PEER_RETRY.has(e.netType)||k===3)throw e;
      this.emit('status',{type:e.netType,retry:k+1});if(typeof netLog==='function')netLog('peer server retry',e.netType,k+1);await new Promise(r=>setTimeout(r,1000<<k));}}throw last;}
  _wire(c,id){c.on('data',d=>{let m=d;if(typeof d==='string'){try{m=JSON.parse(d);}catch(e){return;}}this._in(id,m);});c.on('close',()=>{this.conns.delete(id);this.emit('drop',id);if(c===this.hostConn){this.hostConn=null;this.emit('closed');}});c.on('error',e=>this.emit('error',e));
    c.on('iceStateChanged',st=>{if(id==='host'){this.ice=st;this.emit('ice',st);}});}
  async host(code){const P=this.peer=await this._peer(NET_PEER_PREFIX+code);this.myId='host';
    P.on('connection',c=>{const id=c.peer;c.on('open',()=>{this.conns.set(id,c);this._wire(c,id);this.emit('conn',id);});});
    // 與配對伺服器斷線（背景分頁、網路切換、伺服器重啟）→ 退避 reconnect()，否則新成員會「找不到這個房間碼」；已連上的成員不受影響
    let n=0;const rc=()=>{if(this.peer!==P||P.destroyed||!P.disconnected)return;this.emit('status',{type:'disconnected',retry:n+1});if(typeof netLog==='function')netLog('host peer reconnect',n+1);
      try{P.reconnect();}catch(e){}setTimeout(rc,Math.min(30000,1000<<Math.min(n++,5)));};
    P.on('disconnected',()=>{if(this.peer!==P||P.destroyed)return;n=0;setTimeout(rc,300);});
    P.on('open',()=>{if(n){n=0;this.emit('status',{type:'online'});if(typeof netLog==='function')netLog('host peer back online');}});
    return this;}
  async join(code){const P=this.peer=await this._peer(null);this.myId=P.id;
    return new Promise((ok,no)=>{let done=false,c=null,tries=0,T=0;
      const fin=e=>{if(done)return;done=true;clearTimeout(T);if(!e){ok(this);return;}try{P.destroy();}catch(_){}if(this.peer===P)this.peer=null;no(e);};
      const go=()=>{tries++;const cc=c=P.connect(NET_PEER_PREFIX+code,{reliable:true,serialization:'json'});
        cc.on('open',()=>{if(done||cc!==c)return;this.hostConn=cc;this.conns.set('host',cc);this._wire(cc,'host');fin();});
        cc.on('iceStateChanged',st=>{if(done)return;this.ice=st;this.emit('ice',st);if(st==='failed')fin(netErr('webrtc','ice failed'));});
        cc.on('error',e=>{if(!done&&e&&e.type==='negotiation-failed')fin(netErr('webrtc',e.message));});};
      P.on('error',e=>{const t=e&&e.type;if(done){this.emit('error',e);return;}
        if(t==='peer-unavailable'&&tries<2){if(typeof netLog==='function')netLog('peer-unavailable, retry once');setTimeout(()=>{if(!done)go();},1500);return;} // 房主可能剛好在重連配對伺服器
        fin(netErr(NET_ERR_MSG[t]?t:'webrtc',String(e&&e.message||e)));});
      go();T=setTimeout(()=>fin(netErr('timeout')),20000);});}
  send(to,m){const c=this.conns.get(to);if(c&&c.open)for(const p of this._pack(m,NET_PEER_MTU))if(!this._tooBig(p,NET_PEER_MTU))c.send(p);}
  broadcast(m,except){let ps=null;for(const [id,c] of this.conns)if(id!==except&&c.open){ps=ps||this._pack(m,NET_PEER_MTU);for(const p of ps)if(!this._tooBig(p,NET_PEER_MTU))c.send(p);}}
  kick(id){const c=this.conns.get(id);if(c)try{c.close();}catch(e){}this.conns.delete(id);}
  close(){for(const c of this.conns.values())try{c.close();}catch(e){}this.conns.clear();if(this.peer)try{this.peer.destroy();}catch(e){}this.peer=null;}
}
// 本機測試用：同一瀏覽器的分頁之間（BroadcastChannel），介面與 PeerTransport 相同
class BCTransport extends NetTr{
  constructor(){super();this.kind='bc';this.ch=null;this.peers=new Set();this.myId=null;}
  _open(code){this.ch=new BroadcastChannel('xianwu-net-'+code);this.ch.onmessage=ev=>this._rx(ev.data);}
  _rx(p){if(!p||p.to!==this.myId)return;
    if(p.k==='probe'&&this.myId==='host'){this._tx(p.from,'busy');return;}
    if(p.k==='busy'){this._busy&&this._busy();return;}
    if(p.k==='hi'&&this.myId==='host'){this.peers.add(p.from);this._tx(p.from,'ok');this.emit('conn',p.from);return;}
    if(p.k==='ok'){this._ok&&this._ok();return;}
    if(p.k==='bye'){if(this.peers.delete(p.from)||p.from==='host'){this.emit('drop',p.from);if(p.from==='host')this.emit('closed');}return;}
    if(p.k==='m'&&(this.myId!=='host'||this.peers.has(p.from)))this._in(p.from,p.m);}
  _tx(to,k,m){if(this.ch)this.ch.postMessage({to,from:this.myId,k,m});}
  _txm(to,m){for(const p of this._pack(m,NET_SIM_MTU))if(!this._tooBig(p,NET_SIM_MTU))this._tx(to,'m',p);}
  // 同一個房間碼已經有房主（同瀏覽器另一個分頁）→ 跟 PeerJS 一樣回 unavailable-id
  async host(code){this.myId='p'+Math.random().toString(36).slice(2,10);this._open(code);
    const busy=await new Promise(r=>{const t=setTimeout(()=>{this._busy=null;r(false);},250);this._busy=()=>{clearTimeout(t);this._busy=null;r(true);};this._tx('host','probe');});
    if(busy){this.close();throw netErr('unavailable-id');}this.myId='host';return this;}
  async join(code){this.myId='c'+Math.random().toString(36).slice(2,10);this._open(code);
    return new Promise((ok,no)=>{const t=setTimeout(()=>{this._ok=null;this.close();no(netErr('peer-unavailable'));},4000);this._ok=()=>{clearTimeout(t);this._ok=null;this.peers.add('host');ok(this);};this._tx('host','hi');});}
  send(to,m){this._txm(to,m);}
  broadcast(m,except){for(const id of this.peers)if(id!==except)this._txm(id,m);}
  kick(id){this._tx(id,'bye');this.peers.delete(id);}
  close(){for(const id of this.peers)this._tx(id,'bye');this.peers.clear();if(this.ch)this.ch.close();this.ch=null;}
}
// 自架中繼（開發／測試，或日後的備援伺服器）：?net=ws://主機:埠 ；伺服器見 net_relay_dev.js
class WSTransport extends NetTr{
  constructor(url){super();this.kind='ws';this.url=url;this.ws=null;this.peers=new Set();this.myId=null;}
  _open(code,role){return new Promise((ok,no)=>{const ws=new WebSocket(this.url+'/?room='+encodeURIComponent(code)+'&role='+role);this.ws=ws;let done=false;
    ws.onmessage=ev=>{let p;try{p=JSON.parse(ev.data);}catch(e){return;}
      if(p.k==='id'){this.myId=p.id;done=true;ok(this);return;}if(p.k==='err'){if(!done){done=true;no(/找不到/.test(p.why)?netErr('peer-unavailable'):/已被使用/.test(p.why)?netErr('unavailable-id'):new Error(p.why));}return;}
      if(p.k==='conn'){this.peers.add(p.id);this.emit('conn',p.id);return;}
      if(p.k==='drop'){this.peers.delete(p.id);this.emit('drop',p.id);if(p.id==='host')this.emit('closed');return;}
      if(p.k==='m')this._in(p.from,p.m);};
    ws.onclose=()=>{if(!done){done=true;no(netErr('network','中繼伺服器連不上'));}else if(this.myId!=='host'){this.emit('drop','host');this.emit('closed');}};});}
  async host(code){await this._open(code,'host');return this;}
  async join(code){await this._open(code,'client');this.peers.add('host');return this;}
  send(to,m){if(this.ws&&this.ws.readyState===1)for(const p of this._pack(m,NET_SIM_MTU))if(!this._tooBig(p,NET_SIM_MTU))this.ws.send(JSON.stringify({to,m:p}));}
  broadcast(m,except){for(const id of this.peers)if(id!==except)this.send(id,m);}
  kick(id){if(this.ws&&this.ws.readyState===1)this.ws.send(JSON.stringify({kick:id}));this.peers.delete(id);}
  close(){if(this.ws)try{this.ws.close();}catch(e){}this.ws=null;this.peers.clear();}
}
function netMakeTransport(kind){const mws=/[?&]net=(wss?:\/\/[^&]+)/.exec(location.search);if(!kind&&mws)return new WSTransport(decodeURIComponent(mws[1]));
kind=kind||(/[?&]net=bc\b/.test(location.search)?'bc':'peerjs');return kind==='bc'?new BCTransport():new PeerTransport();}
