// Dependency-free tests for race integrity and authenticated control validation.
'use strict';
const assert=require('node:assert/strict');
const {validControls,canAwardFixture}=require('../race-policy77');
const good={throttle:0.8,turn:-1,lift:0};
assert.equal(validControls(good,0,-1),true);
assert.equal(validControls(good,1,0),true);
for(const seq of [-1,0,1.5,NaN,Infinity,'2',null])assert.equal(validControls(good,seq,1),false);
for(const bad of [{...good,throttle:Infinity},{...good,lift:1.01},{...good,turn:'1'},{throttle:1},null])assert.equal(validControls(bad,2,1),false);
const fixture={status:'accepted',ready73:true,winner:null,races:[]};
assert.equal(canAwardFixture(fixture,'race-1','completed','red'),true);
assert.equal(canAwardFixture(fixture,'race-1','timeout','blue'),true);
for(const reason of ['disconnect','server_restart','cancelled','invalid'])assert.equal(canAwardFixture(fixture,'race-1',reason,'red'),false);
for(const id of ['',null,undefined,0])assert.equal(canAwardFixture(fixture,id,'completed','red'),false);
assert.equal(canAwardFixture({...fixture,races:[{raceId:'race-1'}]},'race-1','completed','red'),false);
assert.equal(canAwardFixture({...fixture,winner:'club-a'},'race-2','completed','red'),false);
assert.equal(canAwardFixture({...fixture,status:'completed'},'race-2','completed','red'),false);
console.log('Alpha 8.2 offline policy tests PASS');
