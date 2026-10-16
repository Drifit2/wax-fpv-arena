'use strict';
// Off-chain exhibition standings; interrupted matches and malformed entries never count.
function standings(history,limit=50){
 const players=new Map();const seen=new Set();
 for(const race of Array.isArray(history)?history:[]){
  if(!race||!['completed','timeout'].includes(race.reason)||typeof race.id!=='string'||!race.id||seen.has(race.id)||!Array.isArray(race.rows)||!['red','blue'].includes(race.winner))continue;
  seen.add(race.id);const participants=new Set();
  for(const row of race.rows){
   if(!row||typeof row.account!=='string'||!/^[a-z1-5.]{1,12}$/.test(row.account)||participants.has(row.account)||!['red','blue'].includes(row.team))continue;
   participants.add(row.account);const p=players.get(row.account)||{account:row.account,races:0,wins:0,losses:0,finishes:0,gates:0,score:0};
   p.races++;if(row.team===race.winner)p.wins++;else p.losses++;
   if(row.status==='finished')p.finishes++;
   const gates=Number.isFinite(row.gate)?Math.max(0,Math.min(100,Math.floor(row.gate))):0;
   p.gates+=gates;p.score+=gates*10+(row.status==='finished'?100:0);players.set(row.account,p);
  }
 }
 return [...players.values()].sort((a,b)=>b.wins-a.wins||b.score-a.score||b.finishes-a.finishes||a.account.localeCompare(b.account)).slice(0,Math.max(1,Math.min(100,Number(limit)||50))).map((p,i)=>({...p,rank:i+1}));
}
module.exports={standings};
