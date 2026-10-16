// Isolated 2v2 Club Wars integration test. Requires npm install.
const assert=require('node:assert/strict');
const {spawn}=require('node:child_process');
const fs=require('node:fs'),os=require('node:os'),path=require('node:path'),crypto=require('node:crypto');
const WebSocket=require('ws');
const base=path.resolve(__dirname,'..'),tmp=fs.mkdtempSync(path.join(os.tmpdir(),'fpv81-'));
for(const file of fs.readdirSync(base).filter(name=>name.endsWith('.js')))fs.copyFileSync(path.join(base,file),path.join(tmp,file));
fs.symlinkSync(path.join(base,'node_modules'),path.join(tmp,'node_modules'),'dir');
const home='redclub',away='blueclub',id='fixture-test81';
const fixture={id,home,away,homePilot:'red1',awayPilot:'blue1',startsAt:new Date(Date.now()-60000).toISOString(),status:'accepted',createdAt:new Date().toISOString(),acceptedAt:new Date().toISOString(),races:[],scores:{[home]:0,[away]:0},winner:null};
fs.writeFileSync(path.join(tmp,'club69_fixtures.json'),JSON.stringify([fixture]));
fs.writeFileSync(path.join(tmp,'clubs67.json'),JSON.stringify({clubs:{[home]:{id:home,name:'Red',owner:'red1',members:['red1','red2']},[away]:{id:away,name:'Blue',owner:'blue1',members:['blue1','blue2']}},membership:{red1:home,red2:home,blue1:away,blue2:away}}));
const secret=crypto.randomBytes(32).toString('hex'),port=22000+Math.floor(Math.random()*20000);
const server=spawn(process.execPath,[path.join(tmp,'server.js')],{env:{...process.env,NODE_ENV:'test',FPV_TEST79_SECRET:secret,FPV_TEST_RACE_MS:'8000',PORT:String(port)},stdio:['ignore','pipe','pipe']});
let stderr='';server.stderr.on('data',b=>stderr+=b);
const url=`http://127.0.0.1:${port}`,sleep=ms=>new Promise(r=>setTimeout(r,ms));
async function request(endpoint,token,body){const r=await fetch(url+endpoint,{method:body?'POST':'GET',headers:{...(token?{authorization:'Bearer '+token}:{}),...(body?{'content-type':'application/json'}:{})},body:body?JSON.stringify(body):undefined});return {status:r.status,data:await r.json()}}
async function issue(account){const r=await fetch(url+'/__test79/session',{method:'POST',headers:{'content-type':'application/json','x-test79-secret':secret},body:JSON.stringify({account})});assert.equal(r.status,200);return (await r.json()).token}
async function connect(){const ws=new WebSocket(`ws://127.0.0.1:${port}/ws`);await new Promise((ok,bad)=>{ws.once('open',ok);ws.once('error',bad)});ws.messages=[];ws.on('message',raw=>{try{ws.messages.push(JSON.parse(raw))}catch{}});return ws}
async function until(ws,type,ms=5000){const t=Date.now();while(Date.now()-t<ms){const x=ws.messages.find(m=>m.type===type);if(x)return x;await sleep(25)}throw Error('Missing '+type+': '+JSON.stringify(ws.messages.slice(-5)))}
async function run(){let ready=false;for(let i=0;i<80;i++){try{if((await request('/api/team75/health')).status===200){ready=true;break}}catch{}await sleep(100)}assert.ok(ready,stderr);
const accounts=['red1','red2','blue1','blue2'],tokens=await Promise.all(accounts.map(issue));
let r=await request('/api/club73/lineup',tokens[1],{id,side:'home',pilots:['red1','red2']});assert.equal(r.status,403,'noncaptain must not edit');
r=await request('/api/club73/lineup',tokens[0],{id,side:'home',pilots:['red1','red1']});assert.equal(r.status,400,'duplicate pilot must fail');
r=await request('/api/club73/lineup',tokens[0],{id,side:'home',pilots:['red1','red2']});assert.equal(r.status,200);
r=await request('/api/club73/lineup',tokens[2],{id,side:'away',pilots:['blue1','blue2']});assert.equal(r.status,200);assert.equal(r.data.fixture.ready73,true);
const pilots=await Promise.all(accounts.map(connect));for(let i=0;i<4;i++)pilots[i].send(JSON.stringify({type:'team72Join',token:tokens[i],fixture73:id}));
const matched=await Promise.all(pilots.map(ws=>until(ws,'team72Match')));assert.equal(new Set(matched.map(m=>m.id)).size,1);assert.equal(matched[0].fixture73,id);
r=await request('/api/club73/lineup',tokens[0],{id,side:'home',pilots:['red2','red1']});assert.equal(r.status,409,'queued/racing fixture must be locked');
const raceId=matched[0].id;
// Keep red pilots accelerating throughout the simulated race. The result is still provisional.
const timer=setInterval(()=>{for(let i=0;i<2;i++)if(pilots[i].readyState===WebSocket.OPEN)pilots[i].send(JSON.stringify({type:'team72Control',seq:Date.now(),controls:{throttle:1,turn:0,lift:0}}))},150);
try{const results=await Promise.all(pilots.map(ws=>until(ws,'team72Result',21000)));assert.ok(results.every(x=>x.id===raceId));}finally{clearInterval(timer)}
r=await request('/api/club73/fixtures');assert.equal(r.status,200);const f=r.data.fixtures.find(f=>f.id===id);assert.ok(f);assert.ok(f.races.length<=1,'race cannot score twice');assert.ok((f.scores[home]||0)+(f.scores[away]||0)<=1,'exactly-once scoring');
const persisted=JSON.parse(fs.readFileSync(path.join(tmp,'club69_fixtures.json'),'utf8'))[0];assert.deepEqual(persisted.scores,f.scores);
r=await request('/api/club69/record',tokens[0],{id,raceId,winner:'red1'});assert.notEqual(r.status,200,'manual 1v1 scoring must reject 2v2');
for(const ws of pilots)ws.terminate();console.log('Alpha 8.1 PASS: captain auth, lineup locking, 4-pilot fixture, single score, persistence, legacy endpoint protection');}
run().catch(e=>{console.error(e);process.exitCode=1}).finally(()=>{server.kill();setTimeout(()=>fs.rmSync(tmp,{recursive:true,force:true}),250).unref()});
