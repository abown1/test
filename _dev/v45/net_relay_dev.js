// 開發用 WebSocket 中繼（不進 build）：node net_relay_dev.js [port]；遊戲網址加 ?net=ws://127.0.0.1:8151
// 只轉送訊息，不看內容；房主仍是權威。需要 npm 套件 ws。
const WebSocket=require(process.env.WS_MOD||'ws');const port=+process.argv[2]||8151;const rooms=new Map();
const wss=new WebSocket.Server({port});let n=0;
wss.on('connection',(ws,req)=>{const q=new URL(req.url,'http://x').searchParams,code=q.get('room'),role=q.get('role');
  const tx=(w,o)=>{if(w&&w.readyState===1)w.send(JSON.stringify(o));};
  if(!code)return ws.close();let R=rooms.get(code);
  if(role==='host'){if(R&&R.host){tx(ws,{k:'err',why:'房間碼已被使用'});return ws.close();}R={host:ws,peers:new Map()};rooms.set(code,R);ws.id='host';tx(ws,{k:'id',id:'host'});}
  else{if(!R||!R.host){tx(ws,{k:'err',why:'找不到這個房間碼'});return ws.close();}ws.id='c'+(++n);R.peers.set(ws.id,ws);tx(ws,{k:'id',id:ws.id});tx(R.host,{k:'conn',id:ws.id});}
  ws.on('message',d=>{let p;try{p=JSON.parse(d);}catch(e){return;}const R=rooms.get(code);if(!R)return;
    if(p.kick&&ws.id==='host'){const c=R.peers.get(p.kick);if(c)c.close();return;}
    const dst=p.to==='host'?R.host:(ws.id==='host'?R.peers.get(p.to):null);tx(dst,{k:'m',from:ws.id,m:p.m});});
  ws.on('close',()=>{const R=rooms.get(code);if(!R)return;if(ws.id==='host'){for(const c of R.peers.values()){tx(c,{k:'drop',id:'host'});c.close();}rooms.delete(code);}
    else{R.peers.delete(ws.id);tx(R.host,{k:'drop',id:ws.id});}});});
console.log('relay on',port);
