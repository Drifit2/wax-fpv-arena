'use strict';
const assert=require('node:assert/strict');
const {spawn}=require('node:child_process');
const net=require('node:net');
const path=require('node:path');
(async()=>{
 const probe=net.createServer();await new Promise(r=>probe.listen(0,'127.0.0.1',r));const port=probe.address().port;probe.close();
 const child=spawn(process.execPath,['server.js'],{cwd:path.join(__dirname,'..'),env:{...process.env,PORT:String(port)},stdio:'pipe'});
 try{
  let up=false;for(let i=0;i<80;i++){await new Promise(r=>setTimeout(r,100));if(child.exitCode!==null)throw Error('Server exited: '+child.exitCode);try{const r=await fetch(`http://127.0.0.1:${port}/api/team75/health`);if(r.ok){up=true;break}}catch{}}
  assert.ok(up,'server starts');
  const health=await (await fetch(`http://127.0.0.1:${port}/api/team75/health`)).json();assert.equal(health.version,'7.5');assert.equal(health.activeMatches,0);
  const state=await (await fetch(`http://127.0.0.1:${port}/api/team75/matches`)).json();assert.ok(Array.isArray(state.matches));assert.ok(Array.isArray(state.history));
  const legacy=await fetch(`http://127.0.0.1:${port}/api/team72/status`);assert.equal(legacy.status,200);
  console.log('PASS: startup, 7.5 health, live/history endpoint, legacy status');
 }finally{child.kill('SIGTERM')}
})().catch(e=>{console.error(e);process.exitCode=1});
