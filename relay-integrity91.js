'use strict';
function relayEligible(match,reason){
 if(!match||match.mode85!=='relay4v4'||!match.relay88||reason!=='completed')return false;
 if(!Array.isArray(match.pilots)||match.pilots.length!==8)return false;
 const accounts=match.pilots.map(p=>p&&p.team72Account);
 if(accounts.some(a=>typeof a!=='string'||!a.trim())||new Set(accounts).size!==8)return false;
 if(match.pilots.slice(0,4).some(p=>p.team72Side!=='red')||match.pilots.slice(4).some(p=>p.team72Side!=='blue'))return false;
 const r=match.relay88;
 return r.completed?.red===4&&r.completed?.blue===4&&r.active?.red===4&&r.active?.blue===4&&r.gatesPerLeg===2&&Array.isArray(r.handoffs)&&r.handoffs.filter(h=>h.team==='red'&&h.trigger==='checkpoint').length===4&&r.handoffs.filter(h=>h.team==='blue'&&h.trigger==='checkpoint').length===4;
}
module.exports={relayEligible};
