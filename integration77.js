// Real HTTP/WebSocket integration smoke test. Requires npm install.
const assert=require('node:assert/strict');
const {spawn}=require('node:child_process');
const path=require('node:path');
const fs=require('node:fs');
const os=require('node:os');
const WebSocket=require('ws');
const base=path.resolve(__dirname,'..');
const temp=fs.mkdtempSync(path.join(os.tmpdir(),'waxfpv77-'));
for(const file of fs.readdirSync(base)){if(file.endsWith('.js'))fs.copyFileSync(path.join(base,file),path.join(temp,file));}
// Load runtime dependencies from original project without writing test data into the project.
fs.symlinkSync(path.join(base,'node_modules'),path.join(temp,'node_modules'),'dir');
const port=20000+Math.floor(Math.random()*30000);
const child=spawn(process.execPath,[path.join(temp,'server.js')],{env:{...process.env,PORT:String(port)},stdio:['ignore','pipe','pipe']});
let stderr='';child.stderr.on('data',b=>stderr+=b);
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
async function json(url){const r=await fetch(`http://127.0.0.1:${port}${url}`);assert.equal(r.status,200);return r.json()}
async function run(){
 let ready=false;for(let i=0;i<60;i++){if(child.exitCode!==null)break;try{await json('/api/team75/health');ready=true;break}catch{await sleep(100)}}
 assert.ok(ready,'server failed to start: '+stderr);
 const health=await json('/api/team75/health');assert.equal(health.version,'8.6');
 const recovery=await json('/api/team76/recovery');assert.equal(recovery.policy,'interrupted_races_not_scored');
 const status=await json('/api/team72/status');assert.ok(Array.isArray(status.matches));
 const ws=new WebSocket(`ws://127.0.0.1:${port}/ws`);await new Promise((resolve,reject)=>{ws.once('open',resolve);ws.once('error',reject)});
 const pong=await new Promise((resolve,reject)=>{const timer=setTimeout(()=>reject(Error('pong timeout')),3000);ws.on('message',raw=>{let msg;try{msg=JSON.parse(raw)}catch{return}if(msg.type==='team76Pong'){clearTimeout(timer);resolve(msg)}});ws.send(JSON.stringify({type:'team76Ping',nonce:'test77'}))});
 assert.equal(pong.nonce,'test77');assert.ok(Number.isFinite(pong.serverAt));
 const diagnostic=await new Promise((resolve,reject)=>{const timer=setTimeout(()=>reject(Error('diagnostics timeout')),3000);ws.on('message',raw=>{let msg;try{msg=JSON.parse(raw)}catch{return}if(msg.type==='team78Diagnostics'){clearTimeout(timer);resolve(msg)}});ws.send(JSON.stringify({type:'team78Diagnostics'}))});assert.equal(diagnostic.reconnectGraceMs,15000);ws.close();console.log('Alpha 7.8 HTTP + WebSocket integration smoke test passed');
}
run().catch(e=>{console.error(e);process.exitCode=1}).finally(()=>{child.kill();setTimeout(()=>fs.rmSync(temp,{recursive:true,force:true}),200).unref()});
