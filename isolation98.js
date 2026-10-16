// Real HTTP/WebSocket regression checks in a disposable server with test-only identities.
const assert=require('node:assert/strict'),fs=require('node:fs'),os=require('node:os'),path=require('node:path'),crypto=require('node:crypto');
const {spawn}=require('node:child_process'),WebSocket=require('ws');
const root=path.resolve(__dirname,'..'),tmp=fs.mkdtempSync(path.join(os.tmpdir(),'arena-isolation98-'));
for(const file of fs.readdirSync(root).filter(f=>f.endsWith('.js')))fs.copyFileSync(path.join(root,file),path.join(tmp,file));
fs.symlinkSync(path.join(root,'node_modules'),path.join(tmp,'node_modules'),'dir');
const secret=crypto.randomBytes(32).toString('hex'),port=23000+Math.floor(Math.random()*15000),url=`http://127.0.0.1:${port}`,sockets=[];
const child=spawn(process.execPath,[path.join(tmp,'server.js')],{env:{...process.env,NODE_ENV:'test',FPV_TEST79_SECRET:secret,PORT:String(port)},stdio:'ignore'});
const delay=ms=>new Promise(r=>setTimeout(r,ms));
async function post(route,token,body){const res=await fetch(url+route,{method:'POST',headers:{'content-type':'application/json',...(token?{authorization:'Bearer '+token}:{})},body:JSON.stringify(body)});return {status:res.status,data:await res.json()};}
async function identity(account){const r=await fetch(url+'/__test79/session',{method:'POST',headers:{'content-type':'application/json','x-test79-secret':secret},body:JSON.stringify({account})});assert.equal(r.status,200);return (await r.json()).token;}
async function connect(){const ws=new WebSocket(`ws://127.0.0.1:${port}/controller-ws`);sockets.push(ws);ws.messages=[];ws.on('message',raw=>ws.messages.push(JSON.parse(raw)));await new Promise((ok,bad)=>{ws.once('open',ok);ws.once('error',bad)});return ws;}
async function receive(ws,type){for(let n=0;n<200;n++){const i=ws.messages.findIndex(m=>m.type===type);if(i>=0)return ws.messages.splice(i,1)[0];await delay(10)}throw Error('Missing '+type);}
const send=(ws,msg)=>ws.send(JSON.stringify(msg));
(async()=>{
 let ready=false;for(let i=0;i<80;i++){try{if((await fetch(url+'/api/team75/health')).ok){ready=true;break}}catch{}await delay(50)}assert.ok(ready,'Server startup');
 const owner=await identity('pilot1'),other=await identity('pilot2');
 for(const kind of ['flight','attempt']){
  const start=await post('/api/season/'+kind+'-start',owner,{stage:1});assert.equal(start.status,200);const attemptId=start.data.attemptId;
  assert.equal((await post('/api/season/'+kind+'-finish',null,{attemptId,time:1})).status,401);
  assert.equal((await post('/api/season/'+kind+'-finish',other,{attemptId,time:1})).status,403);
  if(kind==='flight')assert.equal((await post('/api/season/flight-sample',other,{attemptId,x:0,y:-999,z:12})).status,403,'Foreign telemetry must not invalidate owner attempt');
  if(kind==='flight')assert.equal((await post('/api/season/flight-sample',owner,{attemptId,x:0,y:7,z:12})).status,200,'Foreign finish must not delete owner telemetry attempt');
  assert.equal((await post('/api/season/'+kind+'-finish',owner,{attemptId,time:1})).status,422,'Owner attempt remains available for validation');
  assert.equal((await post('/api/season/'+kind+'-finish',owner,{attemptId,time:1})).status,403,'Owner submission consumes attempt exactly once');
 }
 const first=await connect(),second=await connect(),phone=await connect();send(first,{type:'host'});send(second,{type:'host'});
 const a=(await receive(first,'pairCode')).code,b=(await receive(second,'pairCode')).code;
 send(phone,{type:'pair',code:a});await receive(phone,'paired');await receive(first,'paired');
 send(phone,{type:'pair',code:b});assert.match((await receive(phone,'error')).message,/already|paired/i,'Cannot attach one phone to two hosts');
 send(phone,{type:'control',keys:['KeyW'],axes:{pitch:.6}});assert.equal((await receive(first,'control')).axes.pitch,.6);
 send(first,{type:'pair',code:b});assert.match((await receive(first,'error')).message,/already|paired/i,'Host cannot change its role');
 const replacement=await connect();send(replacement,{type:'pair',code:a});assert.match((await receive(replacement,'error')).message,/occupied/i);
 phone.close();assert.deepEqual((await receive(first,'control')).keys,[]);await receive(first,'unpaired');
 send(replacement,{type:'pair',code:a});await receive(replacement,'paired');
 const another=await connect();send(another,{type:'pair',code:b});await receive(another,'paired');
 send(another,{type:'control',keys:[],axes:{roll:-.4}});assert.equal((await receive(second,'control')).axes.roll,-.4);
 first.close();assert.match((await receive(replacement,'error')).message,/disconnected/i);
 send(another,{type:'control',keys:[],axes:{pitch:.3}});assert.equal((await receive(second,'control')).axes.pitch,.3,'Closing one host must not affect another');
 console.log('PASS: cross-account attempt isolation, exactly-once consumption, pairing role lock, occupied-code rejection, reconnect and host cleanup');
})().catch(e=>{console.error(e);process.exitCode=1}).finally(()=>{for(const ws of sockets)ws.terminate();child.kill();child.once('exit',()=>fs.rmSync(tmp,{recursive:true,force:true}));});
