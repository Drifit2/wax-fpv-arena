'use strict';
const {standings}=require('./team-leaderboard83');
function seasonKey(date){const d=new Date(date);return Number.isFinite(d.getTime())?d.toISOString().slice(0,7):null}
function eligible(r){return !!r&&typeof r.id==='string'&&r.id.length>0&&['completed','timeout'].includes(r.reason)&&['red','blue'].includes(r.winner)&&Array.isArray(r.rows)&&seasonKey(r.at)}
function add(records,r,max=10000){if(!eligible(r)||records.some(x=>x.id===r.id))return false;records.push(r);if(records.length>max)records.splice(0,records.length-max);return true}
function list(records){return [...new Set(records.filter(eligible).map(r=>seasonKey(r.at)))].sort().reverse()}
function pilotStandings(records,season){return standings(records.filter(r=>eligible(r)&&seasonKey(r.at)===season),100)}
function clubStandings(fixtures,season){const clubs=new Map(),seen=new Set();for(const f of fixtures||[]){if(!f||f.mode73!=='2v2'||!Array.isArray(f.races))continue;for(const race of f.races){if(!race||typeof race.raceId!=='string'||seen.has(race.raceId)||seasonKey(race.completedAt)!==season||![f.home,f.away].includes(race.club))continue;seen.add(race.raceId);for(const club of [f.home,f.away]){const s=clubs.get(club)||{club,wins:0,losses:0,races:0};s.races++;if(club===race.club)s.wins++;else s.losses++;clubs.set(club,s)}}}return [...clubs.values()].sort((a,b)=>b.wins-a.wins||a.losses-b.losses||a.club.localeCompare(b.club)).map((r,i)=>({...r,rank:i+1}))}
module.exports={seasonKey,eligible,add,list,pilotStandings,clubStandings};
