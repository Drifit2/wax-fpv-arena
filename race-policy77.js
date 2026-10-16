// Pure server-side policy helpers. Exported for executable unit tests.
'use strict';
function validControls(c,seq,lastSeq=-1){
 if(!c||typeof c!=='object')return false;
 if(!['throttle','turn','lift'].every(k=>typeof c[k]==='number'&&Number.isFinite(c[k])&&Math.abs(c[k])<=1))return false;
 return seq===undefined||(Number.isSafeInteger(seq)&&seq>=0&&seq>lastSeq);
}
function canAwardFixture(f,raceId,reason,winner){
 if(typeof raceId!=='string'||!raceId.trim())return false;
 return !!(f&&f.status==='accepted'&&f.ready73&&!f.winner&&Array.isArray(f.races)&&!f.races.some(r=>r.raceId===raceId)&&['completed','timeout'].includes(reason)&&['red','blue'].includes(winner));
}
module.exports={validControls,canAwardFixture};
