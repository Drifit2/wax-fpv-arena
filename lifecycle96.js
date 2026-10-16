// Deterministic delayed-network tests; renderer and HTTP transport are mocked.
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const {JSDOM}=require('jsdom');
const root=path.resolve(__dirname,'..'),tick=()=>new Promise(r=>setImmediate(r));
(async()=>{
 const THREE=await import('data:text/javascript;base64,'+Buffer.from(fs.readFileSync(path.join(root,'three.module.js'),'utf8')).toString('base64'));
 const html=fs.readFileSync(path.join(root,'index.html'),'utf8'),dom=new JSDOM(html,{url:'http://localhost/?seasonStage=1',runScripts:'outside-only'}),w=dom.window;
 try{
 w.THREE={...THREE,WebGLRenderer:class{constructor(){this.domElement=w.document.createElement('canvas')}setPixelRatio(){}setSize(){}render(){}}};
 w.requestAnimationFrame=()=>1;w.setInterval=()=>1;w.navigator.getGamepads=()=>[];
 const calls=[];w.fetch=(url,options)=>new Promise(resolve=>{calls.push({url,body:JSON.parse(options.body),resolve:(data,ok=true)=>resolve({ok,json:async()=>data})})});
 const run=s=>vm.runInContext(s,dom.getInternalVMContext());
 run(html.match(/<script type="module">([\s\S]*?)<\/script>/)[1].replace(/^import .*;$/m,''));
 w.sessionStorage.setItem('waxfpv:verifiedSession',JSON.stringify({token:'test-token',expiresAt:new Date(Date.now()+3600000).toISOString()}));
 const start=()=>w.document.getElementById('start').click();
 start();start();assert.equal(calls.length,2);
 calls[1].resolve({attemptId:'new'});await tick();calls[0].resolve({attemptId:'old'});await tick();
 assert.equal(run('flightRun96.attemptId'),'new','Late first start cannot attach to second run');
 run('reset()');assert.equal(run('flightRun96'),null);
 start();const abandoned=calls.at(-1);run('reset()');abandoned.resolve({attemptId:'abandoned'});await tick();
 assert.equal(run('flightRun96'),null);assert.match(w.document.getElementById('status').textContent,/Ready/);
 start();calls.at(-1).resolve({attemptId:'complete'});await tick();
 run('pos.copy(checkpoints[7]);elapsed=42;nextGate=8;finish()');await tick();
 assert.ok(calls.at(-1).url.endsWith('flight-sample'));
 assert.equal(calls.filter(c=>c.url.endsWith('flight-finish')).length,0,'Finish waits for final telemetry');
 const xp=run('career.xp');run('finish()');assert.equal(run('career.xp'),xp,'Duplicate finish awards no XP');
 calls.at(-1).resolve({accepted:true});await tick();
 assert.ok(calls.at(-1).url.endsWith('flight-finish'));
 assert.equal(calls.at(-1).body.attemptId,'complete');
 assert.equal(JSON.parse(w.localStorage.getItem('waxfpv:founders-flight:alpha36'))['1'].time,42);
 assert.ok(w.document.querySelector('#banner a[href="/index.html?seasonStage=2"]'));
 const oldFinish=calls.at(-1);start();const latest=calls.at(-1);latest.resolve({attemptId:'latest'});await tick();
 oldFinish.resolve({accepted:true});await tick();assert.match(w.document.getElementById('status').textContent,/started/,'Old finish cannot replace active run status');
 run('reset()');const before=calls.length;w.document.getElementById('windIntensity').value='99';start();await tick();
 assert.equal(calls.length,before,'Modified course does not start season tracking');
 run('elapsed=12;nextGate=8;finish()');assert.equal(JSON.parse(w.localStorage.getItem('waxfpv:founders-flight:alpha36'))['1'].time,42,'Modified course cannot replace season best');
 // Mid-run configuration edits are also excluded from season results.
 run('setupSeasonStage()');start();calls.at(-1).resolve({attemptId:'changed'});await tick();
 w.document.getElementById('quad').value='speed';run('elapsed=10;nextGate=8;finish()');await tick();
 assert.equal(JSON.parse(w.localStorage.getItem('waxfpv:founders-flight:alpha36'))['1'].time,42);
 console.log('PASS: delayed starts, reset cancellation, final-sample ordering, duplicate finish, stale finish status, altered-course exclusion and next-stage navigation');
 }finally{dom.window.close()}
})().catch(e=>{console.error(e);process.exitCode=1});
