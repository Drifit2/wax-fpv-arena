const assert=require('node:assert/strict');const {relayEligible}=require('../relay-integrity91');
function fixture(){return {mode85:'relay4v4',pilots:Array.from({length:8},(_,i)=>({team72Account:'pilot'+i,team72Side:i<4?'red':'blue'})),relay88:{gatesPerLeg:2,active:{red:4,blue:4},completed:{red:4,blue:4},handoffs:['red','blue'].flatMap(team=>Array.from({length:4},()=>({team,trigger:'checkpoint'})))}}}
assert.equal(relayEligible(fixture(),'completed'),true);for(const reason of ['timeout','disconnect','restart'])assert.equal(relayEligible(fixture(),reason),false);
for(const modify of [m=>m.pilots.pop(),m=>m.pilots[1].team72Account='pilot0',m=>m.pilots[4].team72Side='red',m=>m.relay88.completed.blue=3,m=>m.relay88.active.red=3,m=>m.relay88.handoffs.pop(),m=>m.relay88.gatesPerLeg=1]){const m=fixture();modify(m);assert.equal(relayEligible(m,'completed'),false)}
console.log('Alpha 9.1 relay integrity tests passed');
