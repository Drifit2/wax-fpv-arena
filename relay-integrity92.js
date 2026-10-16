'use strict';
// Validates an entire relay race before provisional fixture scoring.
function relayEligible(match,reason){
 if(!match||match.mode85!=='relay4v4'||reason!=='completed'||!match.relay88||!Array.isArray(match.pilots)||match.pilots.length!==8)return false;
 const r=match.relay88, pilots=match.pilots;
 const accounts=pilots.map(p=>p?.team72Account);
 if(accounts.some(a=>typeof a!=='string'||!a.trim())||new Set(accounts).size!==8)return false;
 if(pilots.some((p,i)=>p.team72Side!==(i<4?'red':'blue')))return false;
 if(r.gatesPerLeg!==2||r.active?.red!==4||r.active?.blue!==4||r.completed?.red!==4||r.completed?.blue!==4)return false;
 if(!Array.isArray(r.handoffs)||r.handoffs.length!==8)return false;
 if(match.disconnected instanceof Map&&match.disconnected.size)return false;
 for(const side of ['red','blue']){
  const team=pilots.slice(side==='red'?0:4,side==='red'?4:8);
  const events=r.handoffs.filter(e=>e?.team===side);
  if(events.length!==4)return false;
  for(let i=0;i<4;i++){
   const e=events[i];
   if(e.type!=='relay88Handoff'||e.id!==match.id||e.trigger!=='checkpoint'||e.leg!==i+1||e.from!==team[i].team72Account||e.to!==(i<3?team[i+1].team72Account:null))return false;
   if(!Number.isFinite(e.at)||e.at<match.startAt||e.at>match.deadline)return false;
   if(i&&e.at<events[i-1].at)return false;
   if(!team[i].team72Flight||team[i].team72Flight.gate<r.gatesPerLeg)return false;
  }
 }
 return true;
}
module.exports={relayEligible};
