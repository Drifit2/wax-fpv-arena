// Isolated eight-client relay Club Wars integration test. Requires npm install.
const assert=require('node:assert/strict');
const {spawn}=require('node:child_process');
const fs=require('node:fs'),os=require('node:os'),path=require('node:path'),crypto=require('node:crypto');
const WebSocket=require('ws');
const base=path.resolve(__dirname,'..'),tmp=fs.mkdtempSync(path.join(os.tmpdir(),'fpv93-'));
for(const file of fs.readdirSync(base).filter(name=>name.endsWith('.js')))fs.copyFileSync(path.join(base,file),path.join(tmp,file));
fs.symlinkSync(path.join(base,'node_modules'),path.join(tmp,'node_modules'),'dir');
const home='redclub',away='blueclub',id='fixture-relay93';
const fixture={id,mode73:'relay4v4',home,away,homePilot:'red1',awayPilot:'blue1',startsAt:new Date(Date.now()-60000).toISOString(),status:'accepted',createdAt:new Date().toISOString(),acceptedAt:new Date().toISOString(),races:[],scores:{[home]:0,[away]:0},winner:null};
fs.writeFileSync(path.join(tmp,'club69_fixtures.json'),JSON.stringify([fixture]));
fs.writeFileSync(path.join(tmp,'clubs67.json'),JSON.stringify({clubs:{[home]:{id:home,name:'Red',owner:'red1',members:['red1','red2','red3','red4']},[away]:{id:away,name:'Blue',owner:'blue1',members:['blue1','blue2','blue3','blue4']}},membership:{red1:home,red2:home,red3:home,red4:home,blue1:away,blue2:away,blue3:away,blue4:away}}));
const secret=crypto.randomBytes(32).toString('hex'),port=22000+Math.floor(Math.random()*20000);
const server=spawn(process.execPath,[path.join(tmp,'server.js')],{env:{...process.env,NODE_ENV:'test',FPV_TEST79_SECRET:secret,FPV_TEST_RACE_MS:'11000',PORT:String(port)},stdio:['ignore','pipe','pipe']});
let stderr='';server.stderr.on('data',b=>stderr+=b);
const url=`http://127.0.0.1:${port}`,sleep=ms=>new Promise(r=>setTimeout(r,ms));
async function request(endpoint,token,body){const r=await fetch(url+endpoint,{method:body?'POST':'GET',headers:{...(token?{authorization:'Bearer '+token}:{}),...(body?{'content-type':'application/json'}:{})},body:body?JSON.stringify(body):undefined});return {status:r.status,data:await r.json()}}
async function issue(account){const r=await fetch(url+'/__test79/session',{method:'POST',headers:{'content-type':'application/json','x-test79-secret':secret},body:JSON.stringify({account})});assert.equal(r.status,200);return (await r.json()).token}
async function connect(){const ws=new WebSocket(`ws://127.0.0.1:${port}/ws`);await new Promise((ok,bad)=>{ws.once('open',ok);ws.once('error',bad)});ws.messages=[];ws.on('message',raw=>{try{ws.messages.push(JSON.parse(raw))}catch{}});return ws}
async function until(ws,type,ms=5000){const t=Date.now();while(Date.now()-t<ms){const x=ws.messages.find(m=>m.type===type);if(x)return x;await sleep(25)}throw Error('Missing '+type+': '+JSON.stringify(ws.messages.slice(-5)))}
async function run(){let ready=false;for(let i=0;i<80;i++){try{if((await request('/api/team75/health')).status===200){ready=true;break}}catch{}await sleep(100)}assert.ok(ready,stderr);
const accounts=['red1','red2','red3','red4','blue1','blue2','blue3','blue4'],tokens=await Promise.all(accounts.map(issue));
let r=await request('/api/club86/lineup',tokens[1],{id,mode:'relay4v4',side:'home',pilots:['red1','red2','red3','red4']});assert.equal(r.status,403,'noncaptain must not edit');
r=await request('/api/club86/lineup',tokens[0],{id,mode:'relay4v4',side:'home',pilots:['red1','red1','red3','red4']});assert.equal(r.status,400,'duplicate pilot must fail');
r=await request('/api/club86/lineup',tokens[0],{id,mode:'relay4v4',side:'home',pilots:['red1','red2','red3','red4']});assert.equal(r.status,200);
r=await request('/api/club86/lineup',tokens[4],{id,mode:'relay4v4',side:'away',pilots:['blue1','blue2','blue3','blue4']});assert.equal(r.status,200);assert.equal(r.data.fixture.ready73,true);
const pilots=await Promise.all(accounts.map(connect));for(let i=0;i<8;i++)pilots[i].send(JSON.stringify({type:'team72Join',token:tokens[i],fixture73:id,mode85:'relay4v4'}));
const matched=await Promise.all(pilots.map(ws=>until(ws,'team72Match')));assert.equal(new Set(matched.map(m=>m.id)).size,1);assert.equal(matched[0].fixture73,id);
r=await request('/api/club86/lineup',tokens[0],{id,mode:'relay4v4',side:'home',pilots:['red2','red1','red3','red4']});assert.equal(r.status,409,'queued/racing fixture must be locked');
const raceId=matched[0].id;assert.equal(matched[0].pilots.length,8);assert.equal(matched[0].mode85,'relay4v4');assert.equal(matched[0].relay88,true);
// Reconnect a red pilot during countdown and verify the original race identity persists.
pilots[0].terminate();await sleep(250);
const replacement=await connect();replacement.send(JSON.stringify({type:'team72Join',token:tokens[0],fixture73:id,mode85:'relay4v4'}));
const resumed=await until(replacement,'team72Resumed');assert.equal(resumed.id,raceId);assert.equal(resumed.fixture73,id);
pilots[0]=replacement;
// Duplicate live wallet sessions must not be allowed to replace a connected pilot.
const duplicate=await connect();duplicate.send(JSON.stringify({type:'team72Join',token:tokens[0],fixture73:id,mode85:'relay4v4'}));
const denied=await until(duplicate,'team72Error');assert.match(denied.message,/already active|already racing/i);duplicate.terminate();
const timer=setInterval(()=>{for(let i=0;i<8;i++)if(pilots[i].readyState===WebSocket.OPEN)pilots[i].send(JSON.stringify({type:'team72Control',seq:Date.now(),controls:{throttle:1,turn:0,lift:0}}))},150);
let results;try{results=await Promise.all(pilots.map(ws=>until(ws,'team72Result',24000)));assert.ok(results.every(x=>x.id===raceId));}finally{clearInterval(timer)}
assert.ok(results.every(x=>x.mode85==='relay4v4'&&x.prizeEligible===false));
const result=results[0];if(result.reason!=='completed')assert.ok(!result.fixtureScores,'Incomplete relay must never award a fixture win');
r=await request('/api/club86/fixtures');assert.equal(r.status,200);const f=r.data.fixtures.find(f=>f.id===id);assert.ok(f);assert.ok(f.races.length<=1,'race cannot score twice');
assert.ok((f.scores[home]||0)+(f.scores[away]||0)<=1,'exactly-once scoring');
if(result.reason!=='completed')assert.equal(f.races.length,0,'timed-out relay cannot score');
const persisted=JSON.parse(fs.readFileSync(path.join(tmp,'club69_fixtures.json'),'utf8'))[0];assert.deepEqual(persisted.scores,f.scores);
r=await request('/api/relay91/live');assert.equal(r.status,200);assert.ok(!r.data.matches.some(m=>m.id===raceId),'finished race must leave live spectator feed');
for(const ws of pilots)ws.terminate();console.log('Alpha 9.3 PASS: 8-client relay fixture, disconnect/reconnect, duplicate rejection, result integrity, persistence');}
run().catch(e=>{console.error(e);process.exitCode=1}).finally(()=>{server.kill();setTimeout(()=>fs.rmSync(tmp,{recursive:true,force:true}),250).unref()});
