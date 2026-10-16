// Four-wallet, real WebSocket integration. Test sessions exist ONLY in isolated NODE_ENV=test server.
const assert=require('node:assert/strict');
const {spawn}=require('node:child_process');
const fs=require('node:fs');const os=require('node:os');const path=require('node:path');const crypto=require('node:crypto');
const WebSocket=require('ws');
const base=path.resolve(__dirname,'..'),tmp=fs.mkdtempSync(path.join(os.tmpdir(),'fpv79-'));
for(const file of fs.readdirSync(base).filter(name=>name.endsWith('.js')))fs.copyFileSync(path.join(base,file),path.join(tmp,file));
fs.symlinkSync(path.join(base,'node_modules'),path.join(tmp,'node_modules'),'dir');
const port=21000+Math.floor(Math.random()*25000),secret=crypto.randomBytes(32).toString('hex');
const server=spawn(process.execPath,[path.join(tmp,'server.js')],{env:{...process.env,NODE_ENV:'test',FPV_TEST79_SECRET:secret,PORT:String(port)},stdio:['ignore','pipe','pipe']});
let errors='';server.stderr.on('data',b=>errors+=b);const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const url=`http://127.0.0.1:${port}`;
async function get(p){const r=await fetch(url+p);assert.equal(r.status,200);return r.json()}
async function issue(account){const r=await fetch(url+'/__test79/session',{method:'POST',headers:{'content-type':'application/json','x-test79-secret':secret},body:JSON.stringify({account})});assert.equal(r.status,200);return (await r.json()).token}
async function connect(){const ws=new WebSocket(`ws://127.0.0.1:${port}/ws`);await new Promise((resolve,reject)=>{ws.once('open',resolve);ws.once('error',reject)});ws.messages=[];ws.on('message',b=>{try{ws.messages.push(JSON.parse(b))}catch{}});return ws}
async function until(ws,type,ms=3500){const start=Date.now();while(Date.now()-start<ms){const m=ws.messages.find(m=>m.type===type);if(m)return m;await sleep(20)}throw Error(`Timed out waiting ${type}: ${JSON.stringify(ws.messages.slice(-5))}`)}
async function run(){
 let up=false;for(let i=0;i<70;i++){try{await get('/api/team75/health');up=true;break}catch{await sleep(100)}}assert.ok(up,'Server startup failed '+errors);
 const forbidden=await fetch(url+'/__test79/session',{method:'POST',headers:{'content-type':'application/json'},body:'{}'});assert.equal(forbidden.status,404);
 const accounts=['pilot1','pilot2','pilot3','pilot4'],tokens=await Promise.all(accounts.map(issue));const pilots=await Promise.all(accounts.map(connect));
 for(let i=0;i<4;i++)pilots[i].send(JSON.stringify({type:'team72Join',token:tokens[i]}));
 const matches=await Promise.all(pilots.map(p=>until(p,'team72Match')));assert.equal(new Set(matches.map(m=>m.id)).size,1);assert.equal(matches[0].pilots.length,4);
 const status=await get('/api/team72/status');assert.equal(status.matches.length,1);assert.equal(status.matches[0].pilots.length,4);
 // Duplicate wallet cannot claim a fifth slot.
 const duplicate=await connect();duplicate.send(JSON.stringify({type:'team72Join',token:tokens[0]}));const rejected=await until(duplicate,'team72Error');assert.match(rejected.message,/already/i);
 // Simulate a network loss and reconnect within grace; match ID and flight position are preserved.
 const id=matches[0].id;pilots[0].terminate();await sleep(100);const recovering=await get('/api/team75/matches');assert.ok(recovering.matches[0].disconnected.includes(accounts[0]));
 const rejoined=await connect();rejoined.send(JSON.stringify({type:'team72Join',token:tokens[0]}));const resumed=await until(rejoined,'team72Resumed');assert.equal(resumed.id,id);assert.equal(resumed.pilots.length,4);
 const after=await get('/api/team75/matches');assert.equal(after.matches.length,1);assert.equal(after.matches[0].disconnected.length,0);
 // The old socket closing again must not disconnect the new socket.
 await sleep(100);assert.equal((await get('/api/team75/matches')).matches[0].disconnected.length,0);
 // Expire a disconnect; race closes without awarding a win (15 second grace).
 pilots[1].terminate();await sleep(16000);const history=await get('/api/team75/matches');assert.equal(history.matches.length,0);const result=history.history.find(r=>r.id===id);assert.ok(result);assert.equal(result.reason,'disconnect');assert.equal(result.prizeEligible,false);
 for(const ws of [...pilots,duplicate,rejoined])try{ws.terminate()}catch{};
 console.log('Alpha 7.9 PASS: 4-wallet matchmaking, duplicate rejection, reconnect, disconnect expiry, unawarded result');
}
run().catch(e=>{console.error(e);process.exitCode=1}).finally(()=>{server.kill();setTimeout(()=>fs.rmSync(tmp,{recursive:true,force:true}),250).unref()});
