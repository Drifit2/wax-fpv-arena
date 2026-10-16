'use strict';
const assert=require('node:assert/strict');
const {relayEligible}=require('../relay-integrity92');
function race(){
 const startAt=1000,deadline=2000,id='race92';
 const pilots=Array.from({length:8},(_,i)=>({team72Account:'pilot'+i,team72Side:i<4?'red':'blue',team72Flight:{gate:2}}));
 const handoffs=[];
 for(const side of ['red','blue'])for(let i=0;i<4;i++){
 const offset=side==='red'?0:4;
 handoffs.push({type:'relay88Handoff',id,team:side,from:pilots[offset+i].team72Account,to:i<3?pilots[offset+i+1].team72Account:null,leg:i+1,at:1100+i*100,trigger:'checkpoint'});
 }
 return {id,mode85:'relay4v4',startAt,deadline,pilots,disconnected:new Map(),relay88:{gatesPerLeg:2,active:{red:4,blue:4},completed:{red:4,blue:4},handoffs}};
}
assert.equal(relayEligible(race(),'completed'),true);
for(const reason of ['timeout','disconnect','restart'])assert.equal(relayEligible(race(),reason),false);
const invalid=[
 m=>m.pilots[0].team72Flight.gate=1,
 m=>m.relay88.handoffs[0].from='impostor',
 m=>m.relay88.handoffs[0].to='impostor',
 m=>m.relay88.handoffs[0].leg=3,
 m=>m.relay88.handoffs[0].id='wrong',
 m=>m.relay88.handoffs[0].type='clientClaim',
 m=>m.relay88.handoffs[0].at=0,
 m=>m.relay88.handoffs[0].at=3000,
 m=>m.relay88.handoffs[1].at=1000,
 m=>m.relay88.handoffs.push({...m.relay88.handoffs[0]}),
 m=>m.relay88.handoffs[3].to='pilot4',
 m=>m.disconnected.set('pilot0',Date.now()),
 m=>m.pilots[7].team72Account='pilot0',
 m=>m.relay88.completed.blue=3
];
for(const mutate of invalid){const m=race();mutate(m);assert.equal(relayEligible(m,'completed'),false,mutate.toString())}
console.log('Alpha 9.2 PASS: complete relay award eligibility and 14 negative cases');
