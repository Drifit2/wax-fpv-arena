const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const {JSDOM}=require('jsdom');
const html=fs.readFileSync(path.join(__dirname,'../controller.html'),'utf8');
const dom=new JSDOM(html,{url:'http://localhost/controller',runScripts:'outside-only',pretendToBeVisual:true});
try{
 const w=dom.window,ctx=dom.getInternalVMContext(),sockets=[],messages=[];w.setInterval=()=>1;w.clearInterval=()=>{};
 w.WebSocket=class{constructor(){this.readyState=1;sockets.push(this);}send(s){messages.push(JSON.parse(s));}close(){this.readyState=3;}};
 for(const el of w.document.querySelectorAll('button,.stick'))el.setPointerCapture=()=>{};
 const run=s=>vm.runInContext(s,ctx);run(html.match(/<script>([\s\S]*?)<\/script>/)[1]);
 w.document.getElementById('connect').click();sockets[0].onopen();sockets[0].onmessage({data:'{"type":"paired"}'});
 const last=()=>messages.at(-1),pointer=(el,type,id=1,x=0,y=0)=>{const e=new w.Event(type,{bubbles:true,cancelable:true});Object.assign(e,{pointerId:id,clientX:x,clientY:y});el.dispatchEvent(e);};
 assert.deepEqual(last().axes,{throttle:0,yaw:0,pitch:0,roll:0});
 for(const [key,axis,sign] of [['KeyW','pitch',1],['KeyS','pitch',-1],['KeyA','yaw',1],['KeyD','yaw',-1],['Space','throttle',1],['ShiftLeft','throttle',-1],['ArrowLeft','roll',-1],['ArrowRight','roll',1]]){
  const button=w.document.querySelector('[data-key="'+key+'"]');pointer(button,'pointerdown');assert.equal(last().axes[axis],sign*.65,key);pointer(button,'pointercancel');assert.equal(last().axes[axis],0);
 }
 const left=w.document.getElementById('leftStick'),right=w.document.getElementById('rightStick');for(const el of [left,right])el.getBoundingClientRect=()=>({left:0,top:0,width:200,height:200});
 pointer(left,'pointerdown',1,100,24);assert.equal(last().axes.throttle,.65);assert.equal(last().axes.pitch,0);
 pointer(right,'pointerdown',2,176,100);assert.equal(last().axes.roll,.65);assert.equal(last().axes.throttle,.65);
 pointer(right,'pointerup',99);assert.equal(run("stickPointers.get('rightStick')"),2,'Unrelated pointer must not release stick');
 w.document.getElementById('sensitivity').value='100';w.document.getElementById('sensitivity').dispatchEvent(new w.Event('input'));assert.equal(last().axes.roll,1);
 w.dispatchEvent(new w.Event('blur'));assert.deepEqual(last().axes,{throttle:0,yaw:0,pitch:0,roll:0});assert.deepEqual(last().keys,[]);
 pointer(left,'pointermove',1,24,100);run('send()');assert.equal(last().axes.yaw,0,'Blur revokes pointer ownership');
 // Multiple touches holding one button remain active until both release.
 const fire=w.document.querySelector('[data-key="KeyF"]');pointer(fire,'pointerdown',7);pointer(fire,'pointerdown',8);pointer(fire,'pointerup',7);assert.ok(last().keys.includes('KeyF'));pointer(fire,'pointerup',8);assert.ok(!last().keys.includes('KeyF'));
 w.document.getElementById('connect').click();const newSocket=sockets[1];newSocket.onopen();newSocket.onmessage({data:'{"type":"paired"}'});sockets[0].onclose();assert.equal(run('paired'),true);assert.match(w.document.getElementById('status').textContent,/Connected/);
 run('tilt.checked=true;orientation({beta:0,gamma:0});orientation({beta:-30,gamma:30})');assert.equal(last().axes.pitch,1);assert.equal(last().axes.roll,1);
 w.document.getElementById('calibrate').click();assert.equal(last().axes.pitch,0);assert.equal(last().axes.roll,0);
 w.dispatchEvent(new w.Event('pagehide'));assert.equal(run('tilt.checked'),false);assert.deepEqual(last().axes,{throttle:0,yaw:0,pitch:0,roll:0});
 console.log('PASS: controller pairing, eight backup directions, proportional sticks, sensitivity, multi-touch, focus loss, stale socket events, tilt calibration and pagehide');
}finally{dom.window.close()}
