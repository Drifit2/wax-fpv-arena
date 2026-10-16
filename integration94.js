// Real HTTP routing, both websocket channels, and browser session parsing.
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),os=require('node:os'),vm=require('node:vm');
const {spawn}=require('node:child_process'),WebSocket=require('ws');
const base=path.resolve(__dirname,'..'),tmp=fs.mkdtempSync(path.join(os.tmpdir(),'fpv94-'));
for(const f of fs.readdirSync(base).filter(f=>/\.(html|js|md)$/.test(f)))fs.copyFileSync(path.join(base,f),path.join(tmp,f));
fs.symlinkSync(path.join(base,'node_modules'),path.join(tmp,'node_modules'),'dir');
const port=43000+Math.floor(Math.random()*5000),url=`http://127.0.0.1:${port}`;
const child=spawn(process.execPath,[path.join(tmp,'server.js')],{env:{...process.env,PORT:String(port)},stdio:'ignore'});
(async()=>{let ready=false;for(let i=0;i<80;i++){try{if((await fetch(url+'/api/team75/health')).ok){ready=true;break}}catch{}await new Promise(r=>setTimeout(r,50))}assert.ok(ready);
const pages=fs.readdirSync(base).filter(f=>f.endsWith('.html'));
for(const f of pages){assert.equal((await fetch(url+'/'+f)).status,200,f);const html=fs.readFileSync(path.join(base,f),'utf8');for(const [,href] of html.matchAll(/href=["']([^"'#?]*)/g)){if(!href||href.includes(':'))continue;assert.equal((await fetch(new URL(href,url+'/'+f))).status,200,f+' -> '+href)}
for(const script of html.matchAll(/<script([^>]*)>([\s\S]*?)<\/script>/gi)){if(!/src=|type=["']module/.test(script[1]))new vm.Script(script[2],{filename:f})}
const pattern=/<script>\s*(function arenaSessionToken\(\).*?)\n/;
const match=html.match(pattern);if(match){for(const [value,wanted] of [[JSON.stringify({token:'test',expiresAt:new Date(Date.now()+60000).toISOString()}),'test'],['broken',''],[JSON.stringify({token:'old',expiresAt:'2000-01-01'}),'']]){assert.equal(vm.runInNewContext(match[1]+';arenaSessionToken()',{sessionStorage:{getItem:()=>value}}),wanted,f)}}}
const engine=await fetch(url+'/three.module.js');assert.equal(engine.status,200);assert.match(engine.headers.get('content-type'),/javascript/);assert.match(await engine.text(),/REVISION/);
for(const route of ['/ws','/controller-ws'])await new Promise((resolve,reject)=>{const ws=new WebSocket(`ws://127.0.0.1:${port}${route}`);ws.once('open',()=>{ws.close();resolve()});ws.once('error',reject)});
// Real host/phone pairing, analog relay and disconnect neutralization.
const openController=()=>new Promise((resolve,reject)=>{const socket=new WebSocket(`ws://127.0.0.1:${port}/controller-ws`);socket.once('open',()=>resolve(socket));socket.once('error',reject)});
const message=(socket,type)=>new Promise((resolve,reject)=>{const timer=setTimeout(()=>{socket.off('message',listener);reject(Error('Missing '+type))},3000);function listener(raw){const data=JSON.parse(raw);if(data.type!==type)return;clearTimeout(timer);socket.off('message',listener);resolve(data)}socket.on('message',listener)});
const host=await openController(),phone=await openController();
try{
const codePromise=message(host,'pairCode');host.send(JSON.stringify({type:'host'}));const {code}=await codePromise;
const paired=message(phone,'paired');phone.send(JSON.stringify({type:'pair',code}));await paired;
const control=message(host,'control');phone.send(JSON.stringify({type:'control',keys:['KeyW'],axes:{pitch:.65,roll:-.3,throttle:0,yaw:0}}));const received=await control;assert.equal(received.axes.pitch,.65);assert.equal(received.axes.roll,-.3);
const neutral=message(host,'control'),unpaired=message(host,'unpaired');phone.close();assert.deepEqual((await neutral).keys,[]);await unpaired;
console.log('PASS: real controller pairing, analog relay and disconnect neutralization');
}finally{host.close();phone.close()}
for(const route of ['/server.js','/pilot_profiles.json','/package.json'])assert.equal((await fetch(url+route)).status,404);
console.log(`PASS: ${pages.length} pages, local navigation, wallet session parsing, both websocket channels, private-file rejection`);
})().catch(e=>{console.error(e);process.exitCode=1}).finally(()=>{child.kill();setTimeout(()=>fs.rmSync(tmp,{recursive:true,force:true}),250).unref()});
