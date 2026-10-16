// DOM/flight logic smoke test. Renderer is stubbed; this is NOT a WebGL visual test.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const {JSDOM} = require('jsdom');
const root = path.resolve(__dirname, '..');
(async () => {
  const threeSource = fs.readFileSync(path.join(root, 'three.module.js'), 'utf8');
  const THREE = await import('data:text/javascript;base64,' + Buffer.from(threeSource).toString('base64'));
  const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
  for (const suffix of ['', '?seasonStage=1']) {
    const dom = new JSDOM(html, {url:'http://localhost/' + suffix, runScripts:'outside-only'});
    try {
      const w = dom.window, context = dom.getInternalVMContext();
      let frame;
      w.THREE = {...THREE, WebGLRenderer:class {
        constructor(){this.domElement=w.document.createElement('canvas');}
        setPixelRatio(){} setSize(){} render(){}
      }};
      w.requestAnimationFrame = fn => {frame=fn; return 1;};
      w.navigator.getGamepads = () => [];
      let phone;
      w.WebSocket = class {constructor(){phone=this;} send(){} close(){this.onclose?.();}};
      w.fetch = async () => {throw Error('Network disabled in runtime test');};
      const script = html.match(/<script type="module">([\s\S]*?)<\/script>/)[1].replace(/^import .*;$/m, '');
      vm.runInContext(script, context);
      const run = expression => vm.runInContext(expression, context);
      assert.ok(w.document.querySelector('canvas'));
      assert.doesNotMatch(w.document.getElementById('status').textContent, /failed/i);
      w.document.getElementById('start').click();
      await new Promise(resolve => setTimeout(resolve, 0));
      assert.equal(run('running'), true);
      if(suffix) assert.match(w.document.getElementById('status').textContent, /Local race only/);
      frame(w.performance.now());
      w.dispatchEvent(new w.KeyboardEvent('keydown', {code:'KeyR'}));
      assert.equal(run('running'), true, 'Repair must not reset an active race');
      assert.equal(run('repairs'), 1);
      run("keys.add('KeyW')");
      w.dispatchEvent(new w.Event('blur'));
      assert.equal(run('keys.size'), 0);
      w.document.getElementById('pairPhone').click();
      phone.onmessage({data:JSON.stringify({type:'control',keys:['KeyW'],axes:{pitch:1}})});
      assert.equal(run("keys.has('KeyW')"), true);
      phone.onmessage({data:JSON.stringify({type:'unpaired'})});
      assert.equal(run("keys.has('KeyW')"), false);
      assert.equal(run('phoneAxes'), null);
      phone.onmessage({data:JSON.stringify({type:'control',keys:['KeyW'],axes:{pitch:1}})});
      run('expirePhoneInput97(phoneLastControl97+499)');
      assert.equal(run("keys.has('KeyW')"),true);
      run('expirePhoneInput97(phoneLastControl97+500)');
      assert.equal(run('phoneAxes'),null);
      assert.equal(run("keys.has('KeyW')"),false);
      phone.onmessage({data:JSON.stringify({type:'control',keys:[],axes:{pitch:1}})});
      run('phoneAxes={__gamepad:true,pitch:.5};expirePhoneInput97(phoneLastControl97+500)');
      assert.equal(run('phoneAxes.__gamepad'),true,'Phone timeout preserves active gamepad axes');
      run('phoneAxes=null');
      // Direct on-screen flight, simultaneous pointers and actual physics integration.
      const left=w.document.getElementById('flightLeft'),right=w.document.getElementById('flightRight');
      for(const el of [left,right]){el.setPointerCapture=()=>{};el.getBoundingClientRect=()=>({left:0,top:0,width:100,height:100});}
      const pointer=(el,type,id,x,y)=>{const e=new w.Event(type,{bubbles:true,cancelable:true});Object.assign(e,{pointerId:id,clientX:x,clientY:y});el.dispatchEvent(e);};
      pointer(left,'pointerdown',1,50,16);pointer(right,'pointerdown',2,84,50);
      assert.equal(run('touchAxes98.throttle'),1);assert.equal(run('touchAxes98.roll'),1);
      pointer(left,'pointerup',99,0,0);assert.equal(run('touchAxes98.throttle'),1,'Unrelated pointer cannot release joystick');
      run('clock.getDelta=()=>.02;velocity.set(0,0,0)');frame(w.performance.now());
      assert.ok(run('velocity.y')>0,'Touch altitude must move drone upward');
      pointer(right,'pointercancel',2,0,0);assert.equal(run('touchAxes98.roll'),undefined);assert.equal(run('touchAxes98.throttle'),1);
      w.dispatchEvent(new w.Event('blur'));assert.equal(run('Object.keys(touchAxes98).length'),0);
      pointer(left,'pointermove',1,16,50);assert.equal(run('Object.keys(touchAxes98).length'),0,'Blur revokes pointer ownership');
      pointer(right,'pointerdown',3,50,16);assert.equal(run('touchAxes98.pitch'),1);
      run('velocity.set(0,0,0);heading.v=0');frame(w.performance.now());assert.ok(run('velocity.z')<0,'Touch pitch must drive forward');
      w.dispatchEvent(new w.Event('pagehide'));assert.equal(run('Object.keys(touchAxes98).length'),0);
      // An old phone socket cannot overwrite new pairing or release new controls.
      const oldPhone=phone;w.document.getElementById('pairPhone').click();
      phone.onmessage({data:JSON.stringify({type:'control',keys:['KeyW'],axes:{pitch:.75}})});
      oldPhone.onclose();oldPhone.onmessage({data:JSON.stringify({type:'control',keys:['KeyS'],axes:{pitch:-1}})});
      assert.equal(run('phoneAxes.pitch'),.75);assert.equal(run("keys.has('KeyW')"),true);
      phone.onmessage({data:'null'});phone.onmessage({data:'{"type":"control","keys":null}'});
      assert.equal(run('phoneAxes.pitch'),.75,'Malformed control ignored');
      phone.onmessage({data:JSON.stringify({type:'control',keys:['BadKey'],axes:{pitch:7,roll:'bad'}})});
      assert.equal(run('phoneAxes.pitch'),1);assert.equal(run('phoneAxes.roll'),undefined);assert.equal(run("keys.has('BadKey')"),false);
      w.dispatchEvent(new w.Event('pagehide'));assert.equal(run('phoneAxes'),null);


      run('elapsed=42;nextGate=checkpoints.length;finish()');
      assert.equal(run('running'), false);
      assert.equal(JSON.parse(w.localStorage.getItem('waxfpv:ghost')).version, 1);
      if(suffix) assert.equal(JSON.parse(w.localStorage.getItem('waxfpv:founders-flight:alpha36'))['1'].time,42);
      w.document.getElementById('again').click();
      await new Promise(resolve => setTimeout(resolve, 0));
      assert.equal(run('running'), true);
      assert.equal(run('repairs'), 0);
      w.document.getElementById('reset').click();
      assert.equal(run('running'), false);
      assert.ok(w.document.querySelector('[data-key="ShiftLeft"]'), 'Touch descent control');
      if(!suffix){
        w.document.getElementById('start').click();
        run('hazards=[];startTime=performance.now()-42000');
        w.document.getElementById('collisionToggle').checked=false;
        w.document.getElementById('windIntensity').value='0';
        for(let gate=0;gate<8;gate++){
          run('pos.copy(checkpoints['+gate+']);velocity.set(0,0,0)');
          frame(w.performance.now());
          assert.equal(run('nextGate'),gate+1,'Frame must advance the expected checkpoint');
        }
        assert.equal(run('finished'),true);
        assert.equal(run('running'),false);
        assert.match(w.document.getElementById('banner').textContent,/COURSE COMPLETE/);
      }
    } finally { dom.window.close(); }
  }
  console.log('PASS: solo and season boot, start, frame, repair, focus loss, finish, local progress, retry and reset (stub renderer)');
})().catch(error => { console.error(error); process.exitCode=1; });
