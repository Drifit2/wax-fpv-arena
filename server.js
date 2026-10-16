// WAX FPV Arena multiplayer demo server — off-chain, non-authoritative.
const http=require('node:http'),fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const {WebSocketServer}=require('ws');
const racePolicy77=require('./race-policy77');
const teamLeaderboard83=require('./team-leaderboard83');
const season84=require('./season84');
const relayIntegrity91=require('./relay-integrity91');
const relayIntegrity92=require('./relay-integrity92');
const root=__dirname,port=Number(process.env.PORT||8080),rooms=new Map();
const boardFile=path.join(root,'leaderboards.json');
const profileFile=path.join(root,'pilot_profiles.json');
const combatFile=path.join(root,'combat_stats.json');let combatStats={};try{combatStats=JSON.parse(fs.readFileSync(combatFile,'utf8'))}catch{}
function saveCombat(){const tmp=combatFile+'.tmp';fs.writeFileSync(tmp,JSON.stringify(combatStats));fs.renameSync(tmp,combatFile)}
const MATCH_MS=5*60*1000, SCORE_LIMIT=15;
function spawn(team){return {x:team==='blue'?55:-55,y:7,z:0}}
function matchState(r){return {type:'matchState',premium:!!r.premium,mode:r.mode,remaining:Math.max(0,Math.ceil((r.endsAt-Date.now())/1000)),ended:r.ended,winner:r.winner,teamScores:r.teamScores,scoreLimit:SCORE_LIMIT}}
function endMatch(r,winner){if(r.ended)return;r.ended=true;r.winner=winner;broadcast(r,{type:'matchEnded',winner,teamScores:r.teamScores});}
function checkMatch(r){if(r.mode==='race'||r.ended)return;if(r.teamScores.red>=SCORE_LIMIT||r.teamScores.blue>=SCORE_LIMIT)endMatch(r,r.teamScores.red===r.teamScores.blue?'draw':r.teamScores.red>r.teamScores.blue?'red':'blue');else if(Date.now()>=r.endsAt){if(r.mode==='combat'){const sorted=[...r.pilots.values()].sort((a,b)=>b.kills-a.kills);endMatch(r,sorted.length&&sorted[0].kills>0?sorted[0].name:'draw')}else endMatch(r,r.teamScores.red===r.teamScores.blue?'draw':r.teamScores.red>r.teamScores.blue?'red':'blue')}}
setInterval(()=>{for(const r of rooms.values()){checkMatch(r);if(r.mode!=='race')broadcast(r,matchState(r))}},1000).unref();
// Premium access is revalidated while players remain in the room; ownership changes revoke access.
setInterval(async()=>{for(const r of rooms.values()){if(!r.premium)continue;for(const p of [...r.pilots.values()]){if(p.premiumRechecking)continue;p.premiumRechecking=true;try{const session=sessionByToken(p.premiumSessionToken);if(!session||session.account!==p.premiumAccount||(await lookupEligible(session.account,p.premiumAsset)).eligible!==true)throw Error('Premium NFT entitlement expired or revoked');p.premiumChecked=Date.now()}catch{send(p.ws,{type:'error',message:'Premium entitlement could not be verified; removed from premium arena'});leave(p)}finally{p.premiumRechecking=false}}}},60000).unref();let profiles={};try{profiles=JSON.parse(fs.readFileSync(profileFile,'utf8'))}catch{}
function saveProfiles(){const tmp=profileFile+'.tmp';fs.writeFileSync(tmp,JSON.stringify(profiles));fs.renameSync(tmp,profileFile)}
function guestToken(){return crypto.randomBytes(32).toString('hex')}
let boards={};try{boards=JSON.parse(fs.readFileSync(boardFile,'utf8'))}catch{}
function persist(){const tmp=boardFile+'.tmp';fs.writeFileSync(tmp,JSON.stringify(boards));fs.renameSync(tmp,boardFile)}
function cleanCourse(c){return String(c||'').slice(0,80).replace(/[^a-zA-Z0-9:_-]/g,'')}
function boardFor(c){return (boards[c]||[]).slice(0,15)}
// WAX Cloud Wallet legacy proof authentication: backend verifies the signed nonce
// against the active/owner keys currently returned by a trusted WAX RPC node.
const authChallenges=new Map(),authSessions=new Map();
const AUTH_TTL=5*60*1000,SESSION_TTL=60*60*1000;
const validAccount=a=>typeof a==='string'&&/^[a-z1-5.]{1,12}$/.test(a);
function jsonResponse(res,status,body){res.writeHead(status,{'content-type':'application/json; charset=utf-8','cache-control':'no-store'});res.end(JSON.stringify(body))}
async function readJson(req){return new Promise((resolve,reject)=>{let data='';req.on('data',b=>{data+=b;if(data.length>8192){reject(Error('Payload too large'));req.destroy()}});req.on('end',()=>{try{resolve(JSON.parse(data))}catch{reject(Error('Invalid JSON'))}});req.on('error',reject)})}
async function rpcActiveKeys(account){const rpc=process.env.WAX_RPC_URL||'https://wax.greymass.com';const ac=new AbortController();const timer=setTimeout(()=>ac.abort(),7000);try{const response=await fetch(rpc+'/v1/chain/get_account',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({account_name:account}),signal:ac.signal});if(!response.ok)throw Error('RPC account lookup failed');const data=await response.json();if(data.account_name!==account)throw Error('Account mismatch');const keys=[];for(const p of data.permissions||[])if(['active','owner'].includes(p.perm_name))for(const k of p.required_auth?.keys||[])if(k.key)keys.push(k.key);return keys}finally{clearTimeout(timer)}}
function sessionByToken(token){if(typeof token!=='string'||!/^[a-f0-9]{64}$/.test(token))return null;const record=authSessions.get(crypto.createHash('sha256').update(token).digest('hex'));return record&&record.expires>Date.now()?record:null}
function sessionFrom(req){const header=String(req.headers.authorization||'');if(!header.startsWith('Bearer '))return null;const token=header.slice(7);if(!/^[a-f0-9]{64}$/.test(token))return null;const record=authSessions.get(crypto.createHash('sha256').update(token).digest('hex'));if(!record||record.expires<Date.now())return null;return record}
async function lookupEligible(account,asset){if(!/^[0-9]{1,20}$/.test(String(asset)))throw Error('Invalid asset ID');let approved;try{approved=JSON.parse(fs.readFileSync(path.join(root,'approved_nft_templates.json'),'utf8'))}catch{approved={collections:[]}}const ac=new AbortController();const timer=setTimeout(()=>ac.abort(),7000);try{const r=await fetch('https://wax.api.atomicassets.io/atomicassets/v1/assets/'+asset,{signal:ac.signal});if(!r.ok)throw Error('AtomicAssets unavailable');const p=await r.json(),a=p.data;if(!p.success||String(a?.asset_id)!==String(asset))throw Error('Asset not found');const collection=String(a.collection?.collection_name||''),template=String(a.template?.template_id||'');const entry=(approved.collections||[]).find(x=>x.name===collection&&Array.isArray(x.template_ids)&&x.template_ids.map(String).includes(template));const theme=['neon','storm','vanguard','legacy'].includes(entry?.theme)?entry.theme:'legacy';return {eligible:!!entry&&a.owner===account,owned:a.owner===account,approvedTemplate:!!entry,collection,template,theme,asset:String(asset),account,checkedAt:new Date().toISOString()}}finally{clearTimeout(timer)}}
setInterval(()=>{const now=Date.now();for(const [k,v] of authChallenges)if(v.expires<now)authChallenges.delete(k);for(const [k,v] of authSessions)if(v.expires<now)authSessions.delete(k)},60000).unref();

// Alpha 3.8: server-timed practice attempts. This does not validate flight physics or award NFTs.
const practiceAttempts=new Map();
const ATTEMPT_TTL=45*60*1000;
setInterval(()=>{const now=Date.now();for(const [id,a] of practiceAttempts)if(now-a.started>ATTEMPT_TTL)practiceAttempts.delete(id)},60000).unref();
// Alpha 3.9 telemetry validation: server owns stage geometry and gate ordering.
// Practice-grade only: sampled browser positions cannot establish tamper-proof physics.
const flightRuns=new Map();
const flightStages=[null,{scene:'canyon',seed:36101},{scene:'forest',seed:36102},{scene:'city',seed:36103}];
function canonicalGates(){return Array.from({length:8},(_,i)=>({x:Math.sin(i*.72)*55+Math.sin(i*1.9)*25,z:-55-i*42}));}
setInterval(()=>{for(const [id,r] of flightRuns)if(Date.now()-r.started>45*60*1000)flightRuns.delete(id)},60000).unref();
// Alpha 4.0 isolated server-simulated flight challenge. The client submits ONLY controls;
// it cannot submit position, gate crossings or a finishing time to these endpoints.
// Alpha 4.2: durable server-simulated PRACTICE leaderboard and bounded server replay logs.
const sim42File=path.join(root,'sim42_practice.json');
let sim42Records=[];try{const saved=JSON.parse(fs.readFileSync(sim42File,'utf8'));if(Array.isArray(saved))sim42Records=saved.slice(-1000)}catch{}
function sim42Save(){const temp=sim42File+'.tmp';fs.writeFileSync(temp,JSON.stringify(sim42Records));fs.renameSync(temp,sim42File)}
function sim42Board(stage){return sim42Records.filter(x=>x.stage===stage).sort((a,b)=>a.elapsed-b.elapsed||a.completedAt.localeCompare(b.completedAt)).slice(0,25).map(({account,elapsed,stage,completedAt,replayHash})=>({account,elapsed,stage,completedAt,replayHash}))}
const sim40=new Map();
// 4.7 stores deterministic control traces and re-simulates them for independent audits.
const sim47File=path.join(root,'sim47_traces.json');
let sim47Traces=[];try{const v=JSON.parse(fs.readFileSync(sim47File,'utf8'));if(Array.isArray(v))sim47Traces=v.slice(-500)}catch{}
function saveSim47(){const t=sim47File+'.tmp';fs.writeFileSync(t,JSON.stringify(sim47Traces));fs.renameSync(t,sim47File)}
function sim47Digest(x){return crypto.createHash('sha256').update(JSON.stringify(x)).digest('hex')}

const sim40Gates=Array.from({length:8},(_,i)=>({x:Math.round(Math.sin(i*.65)*28),z:-35-i*35}));
const SIM40_DT=0.05, SIM40_MAX_STEPS=20*60/SIM40_DT;
// Test-only race clock; never shorten competitive races in normal operation.
const TEAM80_TEST_RACE_MS=process.env.NODE_ENV==='test'&&process.env.FPV_TEST79_SECRET&&Number.isInteger(Number(process.env.FPV_TEST_RACE_MS))&&Number(process.env.FPV_TEST_RACE_MS)>=1000&&Number(process.env.FPV_TEST_RACE_MS)<=180000?Number(process.env.FPV_TEST_RACE_MS):null;
function sim40View(r){return {id:r.id,stage:r.stage,position:{...r.p},heading:r.heading,speed:r.speed,gate:r.gate,total:sim40Gates.length,elapsed:Number((r.ticks*SIM40_DT).toFixed(2)),status:r.status,prizeEligible:false,course:sim40Gates};}
function sim40Advance(r,input){
 if(r.status!=='flying')return;
 const throttle=Math.max(-1,Math.min(1,Number(input.throttle)||0));
 const turn=Math.max(-1,Math.min(1,Number(input.turn)||0));
 const lift=Math.max(-1,Math.min(1,Number(input.lift)||0));
 r.heading+=turn*1.45*SIM40_DT;
 const target=throttle>0?throttle*44:throttle*15;
 r.speed+=(target-r.speed)*Math.min(1,SIM40_DT*2.5);
 r.p.x+=Math.sin(r.heading)*r.speed*SIM40_DT;
 r.p.z-=Math.cos(r.heading)*r.speed*SIM40_DT;
 r.p.y=Math.max(2,Math.min(35,r.p.y+lift*12*SIM40_DT));
 r.ticks++;
 if(r.ticks%5===0){r.replay.push({tick:r.ticks,x:+r.p.x.toFixed(2),y:+r.p.y.toFixed(2),z:+r.p.z.toFixed(2),gate:r.gate});if(r.replay.length>5000)r.replay.shift()}
 if(Math.abs(r.p.x)>180||r.p.z>45||r.p.z< -400||r.ticks>SIM40_MAX_STEPS){r.status='disqualified';return;}
 const g=sim40Gates[r.gate];if(g&&Math.hypot(r.p.x-g.x,r.p.z-g.z)<8&&r.p.y>=3&&r.p.y<=25)r.gate++;
 if(r.gate===sim40Gates.length)r.status='finished';
}
setInterval(()=>{const now=Date.now();for(const [id,r] of sim40)if(now-r.lastSeen>20*60*1000)sim40.delete(id)},60000).unref();
// Alpha 4.5: durable, account-bound REQUESTS FOR MANUAL REVIEW, never mint authorization.
const claim45File=path.join(root,'claim45_review_requests.json');
let claim45=[];try{const v=JSON.parse(fs.readFileSync(claim45File,'utf8'));if(Array.isArray(v))claim45=v.slice(-2000)}catch{}
function claim45Save(){const tmp=claim45File+'.tmp';fs.writeFileSync(tmp,JSON.stringify(claim45));fs.renameSync(tmp,claim45File)}
function claim45Stages(account){return [1,2,3].map(stage=>sim42Records.filter(r=>r.account===account&&r.stage===stage&&Number.isFinite(r.elapsed)&&r.elapsed>0).sort((a,b)=>a.elapsed-b.elapsed)[0]||null)}
// Alpha 4.6: admin-only practice integrity review. No minting or prize approval.
const audit46File=path.join(root,'audit46_events.json');
let audit46=[];try{const x=JSON.parse(fs.readFileSync(audit46File,'utf8'));if(Array.isArray(x))audit46=x.slice(-3000)}catch{}
function saveAudit46(){const t=audit46File+'.tmp';fs.writeFileSync(t,JSON.stringify(audit46));fs.renameSync(t,audit46File)}
function admin46(req){const secret=process.env.FPV_ADMIN_TOKEN||'';const provided=String(req.headers['x-fpv-admin-token']||'');return secret.length>=32&&provided.length===secret.length&&crypto.timingSafeEqual(Buffer.from(secret),Buffer.from(provided))}
function reviewFlags46(account){const rows=sim42Records.filter(r=>r.account===account);const flags=[];for(const r of rows){if(!Number.isFinite(r.elapsed)||r.elapsed<=0)flags.push('invalid_time');if(typeof r.replayHash!=='string'||!/^[a-f0-9]{64}$/.test(r.replayHash))flags.push('missing_replay_fingerprint');}for(const stage of [1,2,3]){const stageRows=rows.filter(r=>r.stage===stage).sort((a,b)=>new Date(a.completedAt)-new Date(b.completedAt));for(let i=1;i<stageRows.length;i++){if(stageRows[i].completedAt===stageRows[i-1].completedAt)flags.push('duplicate_completion_timestamp')}}return [...new Set(flags)]}
// Alpha 6.2 — four-pilot exhibition tournaments; server-scored, no on-chain prizes.
const tournament62File=path.join(root,'tournament62.json');
let tournament62={id:'arena-cup-1',status:'registration',stage:1,capacity:4,entrants:[],round:0,bracket:[],champion:null,history:[]};
try{const v=JSON.parse(fs.readFileSync(tournament62File,'utf8'));if(v&&v.id)tournament62=v}catch{}
function tournament62Save(){const tmp=tournament62File+'.tmp';fs.writeFileSync(tmp,JSON.stringify(tournament62));fs.renameSync(tmp,tournament62File)}
function tournament62Public(){return {...tournament62,exhibition:true,prizeEligible:false,verified:false,notice:'Server-simulated exhibition tournament. No blockchain prizes or minting.'}}
function tournament62PairFor(account){if(tournament62.status!=='active')return null;return tournament62.bracket.find(b=>b.round===tournament62.round&&b.status==='pending'&&b.players.includes(account))||null}
function tournament62Record(match,result){if(!match.tournament62Pair||!result.winner||!['completed','timeout'].includes(result.reason))return;
 const b=tournament62.bracket.find(x=>x.id===match.tournament62Pair);if(!b||b.status!=='pending'||!b.players.includes(result.winner))return;
 b.status='complete';b.winner=result.winner;b.raceId=result.id;b.finishedAt=result.completedAt;
 tournament62.history.push({round:b.round,pair:b.id,winner:b.winner,raceId:result.id});
 const current=tournament62.bracket.filter(x=>x.round===tournament62.round);
 if(current.every(x=>x.status==='complete')){const winners=current.map(x=>x.winner);if(winners.length===1){tournament62.status='complete';tournament62.champion=winners[0]}else{tournament62.round++;tournament62.bracket.push(...Array.from({length:winners.length/2},(_,i)=>({id:'round-'+tournament62.round+'-pair-'+(i+1),round:tournament62.round,players:winners.slice(i*2,i*2+2),status:'pending',winner:null})))}}
 tournament62Save();
}
// Alpha 6.3 — configurable exhibition brackets and read-only live race telemetry.
function tournament63Start(){if(tournament62.status!=='registration'||tournament62.entrants.length!==tournament62.capacity)return false;
 tournament62.status='active';tournament62.round=1;tournament62.bracket=Array.from({length:tournament62.capacity/2},(_,i)=>({id:'round-1-pair-'+(i+1),round:1,players:tournament62.entrants.slice(i*2,i*2+2),status:'pending',winner:null}));tournament62Save();return true}
setInterval(()=>{if(tournament62.status==='registration'&&tournament62.startsAt&&Date.now()>=Date.parse(tournament62.startsAt))tournament63Start()},5000).unref();

// Alpha 6.9: captain-authorized club challenge fixtures, off-chain only.
const club69File=path.join(root,'club69_fixtures.json');
let club69=[];try{const v=JSON.parse(fs.readFileSync(club69File,'utf8'));if(Array.isArray(v))club69=v.slice(-200)}catch{}
function club69Save(){const tmp=club69File+'.tmp';fs.writeFileSync(tmp,JSON.stringify(club69));fs.renameSync(tmp,club69File)}
function club69View(f){return {...f,provisional:true,prizeEligible:false,verified:false};}
function club69Winner(f){const a=f.scores[f.home]||0,b=f.scores[f.away]||0;return a>=2?f.home:b>=2?f.away:null}

const server=http.createServer(async(req,res)=>{const u=new URL(req.url,'http://localhost');const pathname=u.pathname;
// Local integration-test credentials: disabled unless explicitly running an isolated test server.
if(pathname==='/__test79/session'&&req.method==='POST'){
 const local=['127.0.0.1','::1','::ffff:127.0.0.1'].includes(req.socket.remoteAddress);
 if(process.env.NODE_ENV!=='test'||!process.env.FPV_TEST79_SECRET||!local||req.headers['x-test79-secret']!==process.env.FPV_TEST79_SECRET)return jsonResponse(res,404,{error:'Not found'});
 try{const body=await readJson(req);if(!validAccount(body.account))return jsonResponse(res,400,{error:'Invalid account'});
 const token=crypto.randomBytes(32).toString('hex');authSessions.set(crypto.createHash('sha256').update(token).digest('hex'),{account:body.account,expires:Date.now()+600000});return jsonResponse(res,200,{token,account:body.account,testOnly:true})}catch{return jsonResponse(res,400,{error:'Invalid request'})}
}
if(pathname==='/api/team76/recovery'&&req.method==='GET')return jsonResponse(res,200,{active:[...team72Matches.values()].map(team75PublicState),interrupted:team76Interrupted.slice(-30),policy:'interrupted_races_not_scored',serverAt:Date.now()});
if(pathname==='/api/season84/standings'&&req.method==='GET'){
 const requested=url.searchParams.get('season');const season=requested||season84.seasonKey(Date.now());
 if(!/^\d{4}-(0[1-9]|1[0-2])$/.test(season))return jsonResponse(res,400,{error:'Invalid season'});
 return jsonResponse(res,200,{season,availableSeasons:season84.list(season84Records),pilots:season84.pilotStandings(season84Records,season),clubs:season84.clubStandings(club69,season),source:'server_recorded_offchain',provisional:true,prizeEligible:false,updatedAt:new Date().toISOString()});
}
if(pathname==='/api/team83/leaderboard'&&req.method==='GET')return jsonResponse(res,200,{standings:teamLeaderboard83.standings(team72History),source:'server_recorded_2v2',verified:false,prizeEligible:false,provisional:true,historyWindow:100,updatedAt:new Date().toISOString()});
if(pathname==='/api/team75/health'&&req.method==='GET')return jsonResponse(res,200,{version:'8.6',activeMatches:team72Matches.size,queuedPilots:team72Queue.length,historyEntries:team72History.length,serverAt:Date.now(),provisional:true});
if(pathname==='/api/team75/matches'&&req.method==='GET')return jsonResponse(res,200,{matches:[...team72Matches.values()].map(team75PublicState),history:team72History.slice(-20),provisional:true});
if(pathname==='/api/relay91/live'&&req.method==='GET')return jsonResponse(res,200,{matches:[...team72Matches.values()].filter(m=>m.relay88&&!m.done).map(m=>({id:m.id,fixture:m.fixture73||null,startAt:m.startAt,deadline:m.deadline,active:{...m.relay88.active},completed:{...m.relay88.completed},gatesPerLeg:m.relay88.gatesPerLeg,handoffs:m.relay88.handoffs.slice(-8),pilots:m.pilots.map(team72State),disconnected:[...m.disconnected.keys()],provisional:true})),serverAt:Date.now(),verified:false});
if(pathname==='/api/team72/status'&&req.method==='GET')return jsonResponse(res,200,{queue:team72Queue.length,matches:[...team72Matches.values()].map(m=>({id:m.id,startAt:m.startAt,pilots:m.pilots.map(team72State)})),history:team72History.slice(-10),provisional:true});

// Alpha 6.6 — off-chain team identity, spectator reactions and verified-result rivalries.
const team66File=path.join(root,'team66_profiles.json');
let team66={};try{const x=JSON.parse(fs.readFileSync(team66File,'utf8'));if(x&&typeof x==='object'&&!Array.isArray(x))team66=x}catch{}
function team66Save(){const t=team66File+'.tmp';fs.writeFileSync(t,JSON.stringify(team66));fs.renameSync(t,team66File)}
const team66Colors=['cyan','magenta','amber','violet','lime'];
const team66Default={name:'Independent Pilot',tag:'SOLO',color:'cyan',motto:'Fly clean. Fly fast.'};
function team66Profile(account){const p=team66[account]||{};return {account,name:typeof p.name==='string'?p.name:team66Default.name,tag:typeof p.tag==='string'?p.tag:team66Default.tag,color:team66Colors.includes(p.color)?p.color:'cyan',motto:typeof p.motto==='string'?p.motto:team66Default.motto,cosmeticOnly:true}}
const reaction66=['cheer','wow','clap','fire'];
const reaction66Log=[];const reaction66Last=new Map();
if(pathname==='/arena66.html'&&req.method==='GET'){res.writeHead(200,{'content-type':'text/html; charset=utf-8','cache-control':'no-store'});return fs.createReadStream(path.join(root,'arena66.html')).pipe(res)}
if(pathname==='/api/arena66/identity'&&req.method==='GET'){
 const account=String(u.searchParams.get('account')||'');if(!validAccount(account))return jsonResponse(res,400,{error:'Valid WAX account required'});
 return jsonResponse(res,200,{profile:team66Profile(account)});
}
if(pathname==='/api/arena66/me'&&req.method==='GET'){
 const session=sessionFrom(req);if(!session)return jsonResponse(res,401,{error:'Verified wallet required'});
 return jsonResponse(res,200,{profile:team66Profile(session.account)});
}
if(pathname==='/api/arena66/identity'&&req.method==='POST'){
 const session=sessionFrom(req);if(!session)return jsonResponse(res,401,{error:'Verified wallet required'});
 let b;try{b=await readJson(req)}catch{return jsonResponse(res,400,{error:'Invalid JSON'})}
 const name=String(b.name||'').trim(),tag=String(b.tag||'').trim().toUpperCase(),motto=String(b.motto||'').trim(),color=String(b.color||'');
 if(!/^[a-zA-Z0-9 ._-]{3,28}$/.test(name)||!/^[A-Z0-9]{2,5}$/.test(tag)||motto.length>72||/[<>\x00-\x1f]/.test(motto)||!team66Colors.includes(color))return jsonResponse(res,400,{error:'Invalid identity fields'});
 team66[session.account]={name,tag,motto,color};team66Save();return jsonResponse(res,200,{profile:team66Profile(session.account)});
}
if(pathname==='/api/arena66/reaction'&&req.method==='POST'){
 const session=sessionFrom(req);if(!session)return jsonResponse(res,401,{error:'Verified wallet required'});
 let b;try{b=await readJson(req)}catch{return jsonResponse(res,400,{error:'Invalid JSON'})}
 const kind=String(b.kind||'');if(!reaction66.includes(kind))return jsonResponse(res,400,{error:'Invalid reaction'});
 const now=Date.now();if(now-(reaction66Last.get(session.account)||0)<10000)return jsonResponse(res,429,{error:'Please wait 10 seconds between reactions'});
 reaction66Last.set(session.account,now);reaction66Log.push({account:session.account,kind,at:now});if(reaction66Log.length>100)reaction66Log.shift();return jsonResponse(res,200,{ok:true,cosmeticOnly:true});
}
if(pathname==='/api/arena66/state'&&req.method==='GET'){
 const tournament=tournament62Public();const entrants=(tournament.entrants||[]).slice(0,32).map(team66Profile);
 const ids=new Set((tournament62.history||[]).map(h=>h.raceId));
 const races=rankedHistory.filter(r=>ids.has(r.id)).slice(-40);
 const counts=new Map();for(const r of races){const a=r.results?.map(p=>p.account)||[];if(a.length!==2)continue;const key=[...a].sort().join('|');const x=counts.get(key)||{accounts:[...a].sort(),meetings:0,wins:{}};x.meetings++;if(r.winner)x.wins[r.winner]=(x.wins[r.winner]||0)+1;counts.set(key,x)}
 const rivalries=[...counts.values()].filter(x=>x.meetings>=2).sort((a,b)=>b.meetings-a.meetings).slice(0,8);
 const highlights=races.slice(-6).reverse().map(r=>({id:r.id,at:r.completedAt,winner:r.winner||null,participants:(r.results||[]).map(x=>x.account),stage:r.stage}));
 return jsonResponse(res,200,{tournament:{id:tournament.id,status:tournament.status,round:tournament.round,champion:tournament.champion},entrants,rivalries,highlights,reactions:reaction66Log.slice(-20).reverse(),cosmeticOnly:true,prizeEligible:false,notice:'All titles and reactions are off-chain. Race results are provisional.'});
}

// Alpha 6.7 — wallet-authenticated clubs and provisional club standings.
const club67File=path.join(root,'clubs67.json');
let clubs67={clubs:{},membership:{}};try{const v=JSON.parse(fs.readFileSync(club67File,'utf8'));if(v&&v.clubs&&v.membership)clubs67=v}catch{}
function club67Save(){const t=club67File+'.tmp';fs.writeFileSync(t,JSON.stringify(clubs67));fs.renameSync(t,club67File)}
function club67Public(c){return {id:c.id,name:c.name,tag:c.tag,color:c.color,motto:c.motto,owner:c.owner,members:c.members.slice(),createdAt:c.createdAt,cosmeticOnly:true}}
function club67Standings(){const tally={};for(const c of Object.values(clubs67.clubs))tally[c.id]={...club67Public(c),wins:0,starts:0,points:0};
 const raceIds=new Set((tournament62.history||[]).map(x=>x.raceId));
 for(const r of rankedHistory){if(!raceIds.has(r.id)||!r.winner||r.verified===true)continue;for(const x of r.results||[]){const id=clubs67.membership[x.account];if(!tally[id])continue;tally[id].starts++;tally[id].points++;if(x.account===r.winner){tally[id].wins++;tally[id].points+=2}}}
 return Object.values(tally).sort((a,b)=>b.points-a.points||b.wins-a.wins||a.name.localeCompare(b.name));}
// Alpha 6.8 — invitation requests, season snapshots, head-to-head club scoreboards.
const club68File=path.join(root,'club68_seasons.json');
let club68={requests:{},seasons:[],active:null};try{const x=JSON.parse(fs.readFileSync(club68File,'utf8'));if(x&&x.requests&&Array.isArray(x.seasons))club68=x}catch{}
function club68Save(){const t=club68File+'.tmp';fs.writeFileSync(t,JSON.stringify(club68));fs.renameSync(t,club68File)}
function club68Snapshot(){const standings=club67Standings().map(c=>({id:c.id,name:c.name,tag:c.tag,points:c.points,wins:c.wins,starts:c.starts}));const pairs={};const raceIds=new Set((tournament62.history||[]).map(x=>x.raceId));for(const r of rankedHistory){if(!raceIds.has(r.id)||!r.winner||!Array.isArray(r.results)||r.results.length!==2)continue;const [a,b]=r.results;const ca=clubs67.membership[a.account],cb=clubs67.membership[b.account];if(!ca||!cb||ca===cb||!clubs67.clubs[ca]||!clubs67.clubs[cb])continue;const ids=[ca,cb].sort(),key=ids.join('|');if(!pairs[key])pairs[key]={clubs:ids,meetings:0,wins:{}};pairs[key].meetings++;const w=clubs67.membership[r.winner];if(w===ca||w===cb)pairs[key].wins[w]=(pairs[key].wins[w]||0)+1}return {standings,headToHead:Object.values(pairs).sort((a,b)=>b.meetings-a.meetings).slice(0,60)}}

// Club Wars fixtures: a captain challenges another club, that captain accepts,
// and either captain attaches actual server-simulated ranked race IDs for scoring.
// Read-only 7.1 team broadcast: derives every result from stored Club Wars fixtures.
if(pathname==='/api/club71/championship'&&req.method==='GET'){
 const clubs=Object.values(clubs67.clubs).map(c=>({id:c.id,name:c.name,tag:c.tag,color:c.color}));
 const board=clubs.map(c=>{const games=club69.filter(f=>f.status==='completed'&&(f.home===c.id||f.away===c.id));return {...c,played:games.length,wins:games.filter(f=>f.winner===c.id).length,losses:games.filter(f=>f.winner&&f.winner!==c.id).length,points:games.filter(f=>f.winner===c.id).length*3};}).sort((a,b)=>b.points-a.points||b.wins-a.wins||a.name.localeCompare(b.name));
 const fixtures=club69.slice(-80).reverse().map(f=>({id:f.id,home:f.home,away:f.away,homePilot:f.homePilot,awayPilot:f.awayPilot,status:f.status,startsAt:f.startsAt,scores:{[f.home]:f.scores[f.home]||0,[f.away]:f.scores[f.away]||0},winner:f.winner,races:f.races.map(r=>({raceId:r.raceId,winner:r.winner,club:r.club,completedAt:r.completedAt})),queued:rankedQueue.filter(p=>p.club70Fixture===f.id).map(p=>p.rankedAccount),live:[...rankedMatches.values()].filter(m=>m.club70Fixture===f.id&&!m.done).map(m=>({raceId:m.id,stage:m.stage,startAt:m.startAt,pilots:m.pilots.map(rankedState)}))}));
 return jsonResponse(res,200,{version:'7.1',format:'sequential_1v1_best_of_three',standings:board,fixtures,season:club68.active?{id:club68.active.id,title:club68.active.title}:null,provisional:true,verified:false,prizeEligible:false,nftMinted:false});
}
if(pathname==='/api/club70/live'&&req.method==='GET'){const fixtures=club69.slice(-80).reverse().map(f=>({...club69View(f),live:[...rankedMatches.values()].filter(m=>m.club70Fixture===f.id&&!m.done).map(m=>({raceId:m.id,startAt:m.startAt,stage:m.stage,pilots:m.pilots.map(rankedState)})),queued:rankedQueue.filter(p=>p.club70Fixture===f.id).map(p=>p.rankedAccount)}));return jsonResponse(res,200,{fixtures,provisional:true,prizeEligible:false})}
// Alpha 7.3: captain-confirmed 2v2 lineups; persisted with legacy fixtures.
// Alpha 8.6: captain-controlled 4v4 fixtures, with immutable rosters after queueing.
// Alpha 8.7: server-derived, provisional 4v4 standings. Only completed fixtures count.
if(pathname==='/api/club87/standings'&&req.method==='GET'){
 const fixtures=club69.filter(f=>['4v4','relay4v4'].includes(f.mode73));
 const clubs=new Map();
 for(const f of fixtures){for(const id of [f.home,f.away])if(!clubs.has(id))clubs.set(id,{id,played:0,wins:0,losses:0,points:0,raceWins:0,raceLosses:0});
  const h=clubs.get(f.home),a=clubs.get(f.away);
  h.raceWins+=f.scores?.[f.home]||0;h.raceLosses+=f.scores?.[f.away]||0;
  a.raceWins+=f.scores?.[f.away]||0;a.raceLosses+=f.scores?.[f.home]||0;
  if(f.status==='completed'&&f.winner&&[f.home,f.away].includes(f.winner)){
   h.played++;a.played++;const win=clubs.get(f.winner),lose=clubs.get(f.winner===f.home?f.away:f.home);
   win.wins++;win.points+=3;lose.losses++;
  }
 }
 const standings=[...clubs.values()].sort((a,b)=>b.points-a.points||b.raceWins-a.raceWins||a.id.localeCompare(b.id));
 return jsonResponse(res,200,{version:'9.1',format:'4v4_and_relay4v4_best_of_three',standings,fixtures:fixtures.length,completed:fixtures.filter(f=>f.status==='completed'&&f.winner).length,provisional:true,verified:false,prizeEligible:false});
}
if(pathname==='/api/club86/fixtures'&&req.method==='GET')return jsonResponse(res,200,{fixtures:club69.filter(f=>['4v4','relay4v4'].includes(f.mode73)).slice(-80).reverse().map(f=>({...club69View(f),queued:team72Queue.filter(p=>p.team73Fixture===f.id).map(p=>p.team72Account),live:[...team72Matches.values()].filter(m=>m.fixture73===f.id).map(m=>({id:m.id,startAt:m.startAt,pilots:m.pilots.map(team72State)}))})),provisional:true,verified:false});
if(pathname==='/api/club86/lineup'&&req.method==='POST'){
 const sess=sessionFrom(req);if(!sess)return jsonResponse(res,401,{error:'Verified WAX wallet required'});
 let b;try{b=await readJson(req)}catch{return jsonResponse(res,400,{error:'Invalid JSON'})}
 const f=club69.find(x=>x.id===String(b.id));if(!f||!['pending','accepted'].includes(f.status))return jsonResponse(res,404,{error:'Open fixture not found'});
 const clubId=b.side==='home'?f.home:b.side==='away'?f.away:null;
 if(!clubId)return jsonResponse(res,400,{error:'Side must be home or away'});
 const club=clubs67.clubs[clubId];if(!club||club.owner!==sess.account)return jsonResponse(res,403,{error:'Club captain required'});
 if(f.mode73&&!['4v4','relay4v4'].includes(f.mode73))return jsonResponse(res,409,{error:'Fixture already assigned to another racing mode'});
 const requestedMode=b.mode==='relay4v4'?'relay4v4':'4v4';if(f.lineups73&&Object.values(f.lineups73).some(x=>Array.isArray(x))&&f.mode73!==requestedMode)return jsonResponse(res,409,{error:'Both captains must choose the same fixture mode'});
 if(f.races.length||team72Queue.some(p=>p.team73Fixture===f.id)||[...team72Matches.values()].some(m=>m.fixture73===f.id))return jsonResponse(res,409,{error:'Rosters locked once queued or raced'});
 const pilots=Array.isArray(b.pilots)?b.pilots.map(String):[];
 if(pilots.length!==4||new Set(pilots).size!==4||!pilots.every(a=>club.members.includes(a)))return jsonResponse(res,400,{error:'Choose four distinct current club members'});
 f.mode73=requestedMode;f.lineups73=f.lineups73||{};f.lineups73[clubId]=pilots;
 f.ready73=f.status==='accepted'&&!!f.lineups73[f.home]&&!!f.lineups73[f.away];club69Save();return jsonResponse(res,200,{fixture:club69View(f)});
}
if(pathname==='/api/club73/fixtures'&&req.method==='GET')return jsonResponse(res,200,{fixtures:club69.filter(f=>f.mode73==='2v2').slice(-80).reverse().map(f=>({...club69View(f),queued:team72Queue.filter(p=>p.team73Fixture===f.id).map(p=>p.team72Account),live:[...team72Matches.values()].filter(m=>m.fixture73===f.id).map(m=>({id:m.id,startAt:m.startAt,pilots:m.pilots.map(team72State)}))})),provisional:true});
if(pathname==='/api/club73/lineup'&&req.method==='POST'){
 const sess=sessionFrom(req);if(!sess)return jsonResponse(res,401,{error:'Verified WAX wallet required'});
 let b;try{b=await readJson(req)}catch{return jsonResponse(res,400,{error:'Invalid JSON'})}
 const f=club69.find(x=>x.id===String(b.id));if(!f||!['pending','accepted'].includes(f.status))return jsonResponse(res,404,{error:'Open fixture not found'});
 if(f.mode73==='4v4')return jsonResponse(res,409,{error:'Use the 4v4 lineup endpoint'});
 const clubId=String(b.side)==='home'?f.home:String(b.side)==='away'?f.away:null;
 if(!clubId)return jsonResponse(res,400,{error:'Side must be home or away'});
 const club=clubs67.clubs[clubId];if(!club||club.owner!==sess.account)return jsonResponse(res,403,{error:'Club captain required'});
 if(f.races.length||team72Queue.some(p=>p.team73Fixture===f.id)||[...team72Matches.values()].some(m=>m.fixture73===f.id))return jsonResponse(res,409,{error:'Lineups locked after pilots queue or racing begins'});
 const pilots=Array.isArray(b.pilots)?b.pilots.map(String):[];
 if(pilots.length!==2||new Set(pilots).size!==2||!pilots.every(a=>club.members.includes(a)))return jsonResponse(res,400,{error:'Choose two distinct current club members'});
 if(f.mode73&&f.mode73!=='2v2')return jsonResponse(res,409,{error:'Fixture mode locked'});
 f.mode73='2v2';f.lineups73=f.lineups73||{};f.lineups73[clubId]=pilots;
 if(f.status==='accepted'&&f.lineups73[f.home]&&f.lineups73[f.away])f.ready73=true;
 club69Save();return jsonResponse(res,200,{fixture:club69View(f)});
}
if(pathname==='/api/club69/list'&&req.method==='GET')return jsonResponse(res,200,{fixtures:club69.slice(-80).reverse().map(club69View),provisional:true,prizeEligible:false});
if(pathname==='/api/club69/challenge'&&req.method==='POST'){
 const sess=sessionFrom(req);if(!sess)return jsonResponse(res,401,{error:'WAX wallet authentication required'});
 let b;try{b=await readJson(req)}catch{return jsonResponse(res,400,{error:'Invalid JSON'})}
 const home=clubs67.clubs[clubs67.membership[sess.account]],away=clubs67.clubs[String(b.away||'')];
 if(!home||home.owner!==sess.account)return jsonResponse(res,403,{error:'Only a club captain may challenge'});
 if(!away||away.id===home.id)return jsonResponse(res,400,{error:'Choose another club'});
 const pilot=String(b.pilot||'');if(!home.members.includes(pilot))return jsonResponse(res,400,{error:'Home pilot must be a club member'});
 const start=Date.parse(String(b.startsAt||''));if(!Number.isFinite(start)||start<Date.now()-60000||start>Date.now()+30*86400000)return jsonResponse(res,400,{error:'Schedule within the next 30 days'});
 if(club69.filter(f=>['pending','accepted'].includes(f.status)).length>=40)return jsonResponse(res,429,{error:'Too many open fixtures'});
 const f={id:'war-'+crypto.randomUUID().slice(0,12),home:home.id,away:away.id,homePilot:pilot,awayPilot:null,startsAt:new Date(start).toISOString(),status:'pending',createdAt:new Date().toISOString(),acceptedAt:null,races:[],scores:{[home.id]:0,[away.id]:0},winner:null};club69.push(f);club69=club69.slice(-200);club69Save();return jsonResponse(res,201,{fixture:club69View(f)});
}
if(pathname==='/api/club69/decide'&&req.method==='POST'){
 const sess=sessionFrom(req);if(!sess)return jsonResponse(res,401,{error:'WAX wallet authentication required'});
 let b;try{b=await readJson(req)}catch{return jsonResponse(res,400,{error:'Invalid JSON'})}
 const f=club69.find(x=>x.id===b.id);if(!f)return jsonResponse(res,404,{error:'Fixture not found'});
 const away=clubs67.clubs[f.away];if(!away||away.owner!==sess.account)return jsonResponse(res,403,{error:'Challenged captain only'});
 if(f.status!=='pending')return jsonResponse(res,409,{error:'Fixture is no longer pending'});
 if(b.accept===false){f.status='declined';club69Save();return jsonResponse(res,200,{fixture:club69View(f)})}
 if(b.accept!==true||!away.members.includes(String(b.pilot||'')))return jsonResponse(res,400,{error:'Select a pilot from your club'});
 f.awayPilot=String(b.pilot);f.status='accepted';f.acceptedAt=new Date().toISOString();club69Save();return jsonResponse(res,200,{fixture:club69View(f)});
}
if(pathname==='/api/club69/record'&&req.method==='POST'){
 const sess=sessionFrom(req);if(!sess)return jsonResponse(res,401,{error:'WAX wallet authentication required'});
 let b;try{b=await readJson(req)}catch{return jsonResponse(res,400,{error:'Invalid JSON'})}
 const f=club69.find(x=>x.id===b.id);if(!f)return jsonResponse(res,404,{error:'Fixture not found'});
 if(['2v2','4v4'].includes(f.mode73))return jsonResponse(res,409,{error:'Team race results are recorded automatically by the server'});
 if(f.status!=='accepted')return jsonResponse(res,409,{error:'Fixture not accepting race results'});
 if(![clubs67.clubs[f.home]?.owner,clubs67.clubs[f.away]?.owner].includes(sess.account))return jsonResponse(res,403,{error:'Only participating captains may record results'});
 if(Date.now()<Date.parse(f.startsAt))return jsonResponse(res,409,{error:'Fixture start time has not arrived'});
 if(f.races.length>=3)return jsonResponse(res,409,{error:'Best-of-three already completed'});
 const id=String(b.raceId||'');const r=rankedHistory.find(x=>x.id===id);if(!r||!r.winner||!['completed','timeout'].includes(r.reason))return jsonResponse(res,400,{error:'A completed server-scored ranked race is required'});
 if(r.verified===true||r.prizeEligible===true)return jsonResponse(res,400,{error:'Only exhibition results supported'});
 if(!Array.isArray(r.results)||r.results.length!==2||![f.homePilot,f.awayPilot].every(a=>r.results.some(x=>x.account===a)))return jsonResponse(res,400,{error:'Race pilots do not match fixture lineup'});
 if(Date.parse(r.completedAt)<Math.max(Date.parse(f.startsAt),Date.parse(f.acceptedAt)))return jsonResponse(res,400,{error:'Race predates accepted fixture start'});
 if(club69.some(x=>x.races.some(y=>y.raceId===id)))return jsonResponse(res,409,{error:'Race already scored in Club Wars'});
 const winClub=r.winner===f.homePilot?f.home:r.winner===f.awayPilot?f.away:null;if(!winClub)return jsonResponse(res,400,{error:'Winner does not match lineup'});
 f.races.push({raceId:id,winner:r.winner,club:winClub,completedAt:r.completedAt});f.scores[winClub]++;
 f.winner=club69Winner(f);if(f.winner)f.status='completed';club69Save();return jsonResponse(res,200,{fixture:club69View(f)});
}

if(pathname==='/api/clubs68/season'&&req.method==='GET')return jsonResponse(res,200,{active:club68.active,archive:club68.seasons.slice(-12).reverse(),live:club68Snapshot(),provisional:true,prizeEligible:false});
if(pathname==='/api/clubs68/requests'&&req.method==='GET'){const sess=sessionFrom(req);if(!sess)return jsonResponse(res,401,{error:'Wallet required'});const own=Object.values(clubs67.clubs).find(c=>c.owner===sess.account);return jsonResponse(res,200,{incoming:own?(club68.requests[own.id]||[]):[],outgoing:Object.entries(club68.requests).filter(([id,rows])=>rows.some(x=>x.account===sess.account)).map(([id])=>id)});}
if(pathname==='/api/clubs68/request'&&req.method==='POST'){
 const sess=sessionFrom(req);if(!sess)return jsonResponse(res,401,{error:'Wallet required'});if(clubs67.membership[sess.account])return jsonResponse(res,409,{error:'Leave your current club first'});
 let b;try{b=await readJson(req)}catch{return jsonResponse(res,400,{error:'Invalid JSON'})}const c=clubs67.clubs[String(b.id||'')];if(!c)return jsonResponse(res,404,{error:'Club not found'});if(c.members.length>=16)return jsonResponse(res,409,{error:'Club full'});
 const rows=club68.requests[c.id]||[];if(rows.some(x=>x.account===sess.account))return jsonResponse(res,409,{error:'Request already pending'});if(rows.length>=40)return jsonResponse(res,429,{error:'Recruitment inbox full'});
 rows.push({account:sess.account,at:new Date().toISOString()});club68.requests[c.id]=rows;club68Save();return jsonResponse(res,200,{ok:true,pending:true});}
if(pathname==='/api/clubs68/decide'&&req.method==='POST'){
 const sess=sessionFrom(req);if(!sess)return jsonResponse(res,401,{error:'Wallet required'});let b;try{b=await readJson(req)}catch{return jsonResponse(res,400,{error:'Invalid JSON'})}
 const c=clubs67.clubs[String(b.id||'')],account=String(b.account||'');if(!c||c.owner!==sess.account)return jsonResponse(res,403,{error:'Club captain only'});
 const rows=club68.requests[c.id]||[];if(!rows.some(x=>x.account===account))return jsonResponse(res,404,{error:'Request not found'});if(b.accept!==true&&b.accept!==false)return jsonResponse(res,400,{error:'Choose accept or reject'});
 if(b.accept){if(clubs67.membership[account])return jsonResponse(res,409,{error:'Applicant already joined another club'});if(c.members.length>=16)return jsonResponse(res,409,{error:'Club full'});c.members.push(account);clubs67.membership[account]=c.id;club67Save()}
 club68.requests[c.id]=rows.filter(x=>x.account!==account);club68Save();return jsonResponse(res,200,{ok:true,accepted:b.accept});}
if(pathname==='/api/clubs68/season-admin'&&req.method==='POST'){
 if(!admin46(req))return jsonResponse(res,403,{error:'Administrator authorization required'});let b;try{b=await readJson(req)}catch{return jsonResponse(res,400,{error:'Invalid JSON'})}
 if(b.action==='open'){if(club68.active)return jsonResponse(res,409,{error:'Close the active season first'});const title=String(b.title||'').trim();if(!/^[a-zA-Z0-9 ._-]{4,48}$/.test(title))return jsonResponse(res,400,{error:'Invalid season name'});club68.active={id:'season-'+crypto.randomUUID().slice(0,10),title,openedAt:new Date().toISOString(),baseline:club68Snapshot()};club68Save();return jsonResponse(res,200,{active:club68.active})}
 if(b.action==='close'){if(!club68.active)return jsonResponse(res,409,{error:'No active season'});const end=club68Snapshot(),baseline=club68.active.baseline;const before=new Map(baseline.standings.map(x=>[x.id,x]));const standings=end.standings.map(x=>({...x,points:Math.max(0,x.points-(before.get(x.id)?.points||0)),wins:Math.max(0,x.wins-(before.get(x.id)?.wins||0)),starts:Math.max(0,x.starts-(before.get(x.id)?.starts||0))})).sort((a,b)=>b.points-a.points||b.wins-a.wins);const finished={id:club68.active.id,title:club68.active.title,openedAt:club68.active.openedAt,closedAt:new Date().toISOString(),standings,provisional:true,prizeEligible:false,bannerPreviewOnly:true};club68.seasons.push(finished);club68.seasons=club68.seasons.slice(-24);club68.active=null;club68Save();return jsonResponse(res,200,{season:finished})}
 return jsonResponse(res,400,{error:'Unknown action'});
}
if(pathname==='/api/clubs67/list'&&req.method==='GET')return jsonResponse(res,200,{clubs:Object.values(clubs67.clubs).map(club67Public),standings:club67Standings(),season:'Current exhibition tournament',provisional:true,prizeEligible:false});
if(pathname==='/api/clubs67/me'&&req.method==='GET'){const sess=sessionFrom(req);if(!sess)return jsonResponse(res,401,{error:'Wallet authentication required'});const id=clubs67.membership[sess.account];return jsonResponse(res,200,{account:sess.account,club:id?club67Public(clubs67.clubs[id]):null})}
if(pathname==='/api/clubs67/create'&&req.method==='POST'){
 const sess=sessionFrom(req);if(!sess)return jsonResponse(res,401,{error:'Wallet authentication required'});
 if(clubs67.membership[sess.account])return jsonResponse(res,409,{error:'Leave your existing club first'});
 let b;try{b=await readJson(req)}catch{return jsonResponse(res,400,{error:'Invalid JSON'})}
 const name=String(b.name||'').trim(),tag=String(b.tag||'').trim().toUpperCase(),motto=String(b.motto||'').trim(),color=String(b.color||'');
 if(!/^[a-zA-Z0-9 ._-]{3,28}$/.test(name)||!/^[A-Z0-9]{2,5}$/.test(tag)||motto.length>72||/[<>\x00-\x1f]/.test(motto)||!team66Colors.includes(color))return jsonResponse(res,400,{error:'Invalid club details'});
 if(Object.values(clubs67.clubs).some(c=>c.tag===tag||c.name.toLowerCase()===name.toLowerCase()))return jsonResponse(res,409,{error:'Club name or tag already in use'});
 if(Object.keys(clubs67.clubs).length>=100)return jsonResponse(res,409,{error:'Club capacity reached'});
 const id='club-'+crypto.randomUUID().slice(0,12);const c={id,name,tag,motto,color,owner:sess.account,members:[sess.account],createdAt:new Date().toISOString()};clubs67.clubs[id]=c;clubs67.membership[sess.account]=id;club67Save();return jsonResponse(res,201,{club:club67Public(c)});
}
if(pathname==='/api/clubs67/join'&&req.method==='POST'){
 return jsonResponse(res,409,{error:'Club recruitment now requires captain approval. Use the Club Seasons page to request membership.'});
 const sess=sessionFrom(req);if(!sess)return jsonResponse(res,401,{error:'Wallet authentication required'});
 if(clubs67.membership[sess.account])return jsonResponse(res,409,{error:'Already a club member'});
 let b;try{b=await readJson(req)}catch{return jsonResponse(res,400,{error:'Invalid JSON'})}
 const c=clubs67.clubs[String(b.id||'')];if(!c)return jsonResponse(res,404,{error:'Club not found'});
 if(c.members.length>=16)return jsonResponse(res,409,{error:'Club is full (16 pilots)'});
 c.members.push(sess.account);clubs67.membership[sess.account]=c.id;club67Save();return jsonResponse(res,200,{club:club67Public(c)});
}
if(pathname==='/api/clubs67/leave'&&req.method==='POST'){
 const sess=sessionFrom(req);if(!sess)return jsonResponse(res,401,{error:'Wallet authentication required'});
 const id=clubs67.membership[sess.account],c=clubs67.clubs[id];if(!c)return jsonResponse(res,404,{error:'Not a member'});
 if(c.owner===sess.account&&c.members.length>1)return jsonResponse(res,409,{error:'Club owner must remain while other members are enrolled'});
 c.members=c.members.filter(a=>a!==sess.account);delete clubs67.membership[sess.account];if(!c.members.length)delete clubs67.clubs[id];club67Save();return jsonResponse(res,200,{ok:true});
}
if(pathname==='/tournament.html'&&req.method==='GET'){res.writeHead(200,{'content-type':'text/html; charset=utf-8','cache-control':'no-store'});return fs.createReadStream(path.join(root,'tournament.html')).pipe(res)}
if(pathname==='/tournament63.html'&&req.method==='GET'){res.writeHead(200,{'content-type':'text/html; charset=utf-8','cache-control':'no-store'});return fs.createReadStream(path.join(root,'tournament63.html')).pipe(res)}
if(pathname==='/spectator63.html'&&req.method==='GET'){res.writeHead(200,{'content-type':'text/html; charset=utf-8','cache-control':'no-store'});return fs.createReadStream(path.join(root,'spectator63.html')).pipe(res)}
if(pathname==='/api/tournament63/admin'&&req.method==='POST'){
 if(!admin46(req))return jsonResponse(res,403,{error:'Admin token required (FPV_ADMIN_TOKEN, 32+ characters)'});
 let body;try{body=await readJson(req)}catch{return jsonResponse(res,400,{error:'Invalid JSON'})}
 const capacity=Number(body.capacity);if(![4,8,16,32].includes(capacity))return jsonResponse(res,400,{error:'Capacity must be 4, 8, 16, or 32'});
 const startsAt=body.startsAt==null?null:String(body.startsAt);
 if(startsAt&&(!Number.isFinite(Date.parse(startsAt))||Date.parse(startsAt)<Date.now()-60000))return jsonResponse(res,400,{error:'Invalid future start time'});
 if(tournament62.status==='active')return jsonResponse(res,409,{error:'Cannot replace an active tournament'});
 tournament62={id:'arena-cup-'+crypto.randomUUID().slice(0,8),status:'registration',stage:1,capacity,startsAt,entrants:[],round:0,bracket:[],champion:null,history:[]};tournament62Save();return jsonResponse(res,200,tournament62Public());
}
// Alpha 6.4 — read-only championship highlights and podium; off-chain, no prize claims.
if(pathname==='/api/tournament64/highlights'&&req.method==='GET'){
 const ids=new Set(tournament62.history.map(h=>h.raceId).filter(Boolean));
 const races=rankedHistory.filter(r=>ids.has(r.id)).slice(-32).reverse().map(r=>({id:r.id,stage:r.stage,completedAt:r.completedAt,winner:r.winner,reason:r.reason,results:r.results.map(p=>({account:p.account,elapsed:p.elapsed,gate:p.gate,status:p.status,position:p.position})),prizeEligible:false}));
 return jsonResponse(res,200,{tournamentId:tournament62.id,champion:tournament62.champion,exhibition:true,races});
}
if(pathname==='/api/tournament64/podium'&&req.method==='GET'){
 const last=tournament62.bracket.filter(b=>b.status==='complete').sort((a,b)=>b.round-a.round);
 const final=last[0]&&last[0].players.length===2?last[0]:null;
 const runnerUp=final?final.players.find(a=>a!==final.winner):null;
 const semi=last.filter(b=>final&&b.round===final.round-1);
 const finalists=semi.flatMap(b=>b.players.filter(a=>a!==b.winner));
 return jsonResponse(res,200,{tournamentId:tournament62.id,status:tournament62.status,champion:tournament62.status==='complete'?tournament62.champion:null,runnerUp:tournament62.status==='complete'?runnerUp:null,semifinalists:tournament62.status==='complete'?finalists:[],cosmeticOnly:true,prizeEligible:false,nftMinted:false});
}
if(pathname==='/spectator64.html'&&req.method==='GET'){res.writeHead(200,{'content-type':'text/html; charset=utf-8','cache-control':'no-store'});return fs.createReadStream(path.join(root,'spectator64.html')).pipe(res)}
if(pathname==='/highlights64.html'&&req.method==='GET'){res.writeHead(200,{'content-type':'text/html; charset=utf-8','cache-control':'no-store'});return fs.createReadStream(path.join(root,'highlights64.html')).pipe(res)}
if(pathname==='/podium64.html'&&req.method==='GET'){res.writeHead(200,{'content-type':'text/html; charset=utf-8','cache-control':'no-store'});return fs.createReadStream(path.join(root,'podium64.html')).pipe(res)}
// Alpha 6.5 — public read-only broadcast snapshot. No financial prizes or NFT claims.
if(pathname==='/api/broadcast65/state'&&req.method==='GET'){
 const matches=[...rankedMatches.values()].filter(m=>!m.done&&m.tournament62Pair).map(m=>({id:m.id,stage:m.stage,startAt:m.startAt,pair:m.tournament62Pair,pilots:m.pilots.map(p=>{const v=rankedState(p);return {account:v.account,gate:v.gate,position:v.position,status:v.status,elapsed:v.elapsed}})}));
 const recent=tournament62.history.slice(-8).reverse().map(h=>({raceId:h.raceId||null,winner:h.winner||null,round:h.round||null}));
 return jsonResponse(res,200,{exhibition:true,readOnly:true,serverAt:Date.now(),tournament:{id:tournament62.id,status:tournament62.status,capacity:tournament62.capacity,registered:tournament62.entrants.length,round:tournament62.round,champion:tournament62.status==='complete'?tournament62.champion:null},matches,recent});
}
if(pathname==='/api/tournament63/live'&&req.method==='GET'){
 const matches=[...rankedMatches.values()].filter(m=>!m.done&&m.tournament62Pair).map(m=>({id:m.id,pair:m.tournament62Pair,startAt:m.startAt,stage:m.stage,serverAt:Date.now(),pilots:m.pilots.map(rankedState)}));
 return jsonResponse(res,200,{exhibition:true,readOnly:true,matches});
}
if(pathname==='/api/tournament62'&&req.method==='GET')return jsonResponse(res,200,tournament62Public());
if(pathname==='/api/tournament62/join'&&req.method==='POST'){
 const sess=sessionFrom(req);if(!sess)return jsonResponse(res,401,{error:'Authenticate your WAX wallet first'});
 if(tournament62.status!=='registration')return jsonResponse(res,409,{error:'Registration is closed'});
 if(!tournament62.entrants.includes(sess.account)){
 if(tournament62.entrants.length>=tournament62.capacity)return jsonResponse(res,409,{error:'Tournament is full'});
 tournament62.entrants.push(sess.account);
 if(tournament62.entrants.length===tournament62.capacity&&(!tournament62.startsAt||Date.now()>=Date.parse(tournament62.startsAt))){tournament63Start()}
 tournament62Save();}
 return jsonResponse(res,200,tournament62Public());
}

if(pathname==='/api/lobby60/status'&&req.method==='GET')return jsonResponse(res,200,{version:'6.0',mode:'alpha_exhibition',online:true,features:{solo:true,liveDuel:true,ghostPractice:true,nftCosmetics:true,collectorGallery:true},noRealMoneyRewards:true});

// Alpha 5.7: opt-in public gallery. No public listing without explicit pilot consent.
const gallery57File=path.join(root,'gallery57_exhibits.json');
let gallery57={};try{const x=JSON.parse(fs.readFileSync(gallery57File,'utf8'));if(x&&typeof x==='object'&&!Array.isArray(x))gallery57=x}catch{}
function gallery57Save(){const t=gallery57File+'.tmp';fs.writeFileSync(t,JSON.stringify(gallery57));fs.renameSync(t,gallery57File)}
function gallery57Card(account){const p=pilot52Get(account),entry=gallery57[account];if(!entry||!entry.published)return null;const earned=Array.isArray(p.journal56)?p.journal56.filter(x=>['velocity','guardian','nightfall'].includes(x)):[];return {account,title:entry.title,description:entry.description,updatedAt:entry.updatedAt,loadout:workshop54Sanitize(p.workshop54),sets:earned,linkedNft:!!p.cosmetic,cosmeticOnly:true,prizeEligible:false}}
if(pathname==='/api/gallery57/list'&&req.method==='GET'){
 const cards=Object.keys(gallery57).map(gallery57Card).filter(Boolean).sort((a,b)=>b.updatedAt.localeCompare(a.updatedAt)).slice(0,60);
 return jsonResponse(res,200,{cards,kind:'opt_in_cosmetic_gallery',note:'Linked NFT indicator is not live proof of ownership; open an exhibit to request current verification.'});
}
if(pathname==='/api/gallery57/exhibit'&&req.method==='GET'){
 const account=u.searchParams.get('account')||'';if(!validAccount(account))return jsonResponse(res,400,{error:'Invalid account'});
 const card=gallery57Card(account);if(!card)return jsonResponse(res,404,{error:'No public exhibit'});
 let nft=null,ownership='none';const linked=pilot52Get(account).cosmetic;
 if(linked){try{const check=await lookupEligible(account,linked.assetId);if(check.eligible){nft=pilot53Visual(check);ownership='verified_now'}else ownership='not_owned_or_ineligible'}catch{ownership='verification_unavailable'}}
 return jsonResponse(res,200,{...card,nft,ownership});
}
if(pathname==='/api/gallery57/me'&&req.method==='GET'){
 const sess=sessionFrom(req);if(!sess)return jsonResponse(res,401,{error:'Wallet authentication required'});
 return jsonResponse(res,200,{exhibit:gallery57[sess.account]||{published:false,title:'',description:''},card:gallery57Card(sess.account)});
}
if(pathname==='/api/gallery57/publish'&&req.method==='POST'){
 const sess=sessionFrom(req);if(!sess)return jsonResponse(res,401,{error:'Wallet authentication required'});
 try{const b=await readJson(req);if(typeof b.published!=='boolean'||typeof b.title!=='string'||typeof b.description!=='string'||b.title.length>48||b.description.length>180)return jsonResponse(res,400,{error:'Invalid exhibit fields'});
 const title=b.title.trim(),description=b.description.trim();if(b.published&&!title)return jsonResponse(res,400,{error:'Exhibit title required'});
 gallery57[sess.account]={published:b.published,title,description,updatedAt:new Date().toISOString()};gallery57Save();return jsonResponse(res,200,{exhibit:gallery57[sess.account],card:gallery57Card(sess.account),prizeEligible:false});
 }catch(e){return jsonResponse(res,400,{error:e.message})}
}
// Alpha 5.8 — rotating, opt-in cosmetic exhibition challenges; no blockchain prizes.
const contest58File=path.join(root,'contest58_votes.json');
let contest58Votes={};try{const v=JSON.parse(fs.readFileSync(contest58File,'utf8'));if(v&&typeof v==='object'&&!Array.isArray(v))contest58Votes=v}catch{}
function contest58Save(){const t=contest58File+'.tmp';fs.writeFileSync(t,JSON.stringify(contest58Votes));fs.renameSync(t,contest58File)}
const contest58Themes=[{name:'Neon Nights',description:'Showcase an electric neon-inspired build'},{name:'Championship Gold',description:'Create a trophy-worthy racing livery'},{name:'Stealth Hangar',description:'Exhibit your darkest futuristic drone'},{name:'Legendary Flight',description:'Celebrate your completed collection sets'}];
function contest58Season(){const epoch=Date.UTC(2026,0,5),week=Math.max(0,Math.floor((Date.now()-epoch)/(7*86400000)));return {id:'week-'+week,theme:contest58Themes[week%contest58Themes.length],startsAt:new Date(epoch+week*7*86400000).toISOString(),endsAt:new Date(epoch+(week+1)*7*86400000).toISOString()}}
function contest58Board(){const season=contest58Season(),votes=contest58Votes[season.id]||{},counts={};for(const target of Object.values(votes)){if(typeof target==='string'&&gallery57Card(target))counts[target]=(counts[target]||0)+1}const entries=Object.keys(gallery57).map(gallery57Card).filter(Boolean).map(card=>({account:card.account,title:card.title,sets:card.sets,loadout:card.loadout,votes:counts[card.account]||0})).sort((a,b)=>b.votes-a.votes||a.account.localeCompare(b.account)).slice(0,60);return {season,entries,totalVotes:Object.values(counts).reduce((a,b)=>a+b,0),kind:'community_cosmetic_exhibition',note:'Community popularity only. Votes are not independently identity-verified or prize eligible.',prizeEligible:false}}
if(pathname==='/api/contest58/board'&&req.method==='GET')return jsonResponse(res,200,contest58Board());
if(pathname==='/api/contest58/me'&&req.method==='GET'){const sess=sessionFrom(req);if(!sess)return jsonResponse(res,401,{error:'Wallet authentication required'});const season=contest58Season();return jsonResponse(res,200,{season,votedFor:(contest58Votes[season.id]||{})[sess.account]||null,exhibited:!!gallery57Card(sess.account),prizeEligible:false})}
if(pathname==='/api/contest58/vote'&&req.method==='POST'){
 const sess=sessionFrom(req);if(!sess)return jsonResponse(res,401,{error:'Wallet authentication required'});
 try{const b=await readJson(req),target=b.account;if(!validAccount(target)||!gallery57Card(target))return jsonResponse(res,400,{error:'Select a currently published exhibit'});
 if(target===sess.account)return jsonResponse(res,400,{error:'You cannot vote for your own exhibit'});
 const season=contest58Season();contest58Votes[season.id]??={};if(Object.prototype.hasOwnProperty.call(contest58Votes[season.id],sess.account))return jsonResponse(res,409,{error:'Your vote for this exhibition week is already recorded'});
 contest58Votes[season.id][sess.account]=target;contest58Save();return jsonResponse(res,200,{season:season.id,votedFor:target,prizeEligible:false,award:'community_appreciation_only'});
 }catch(e){return jsonResponse(res,400,{error:e.message})}
}
// Alpha 5.9 — off-chain collector seasons, participation milestones and public trophy gallery.
const collector59File=path.join(root,'collector59_progress.json');
let collector59={};try{const v=JSON.parse(fs.readFileSync(collector59File,'utf8'));if(v&&typeof v==='object'&&!Array.isArray(v))collector59=v}catch{}
function collector59Save(){const t=collector59File+'.tmp';fs.writeFileSync(t,JSON.stringify(collector59));fs.renameSync(t,collector59File)}
function collector59Season(){const week=contest58Season();const idx=Number(week.id.slice(5));const n=Math.floor(idx/12);return {id:'season-'+n,number:n+1,week:week.id,theme:week.theme.name,endsAt:new Date(Date.UTC(2026,0,5)+(n+1)*12*7*86400000).toISOString()}}
function collector59View(account){const p=pilot52Get(account),record=collector59[account]||{weeks:[],firstExhibit:null};const weeks=[...new Set((record.weeks||[]).filter(x=>/^week-\d+$/.test(x)))].sort((a,b)=>Number(a.slice(5))-Number(b.slice(5)));const completed=Array.isArray(p.journal56)?p.journal56.filter(x=>['velocity','guardian','nightfall'].includes(x)):[];const trophies=[];if(weeks.length>=1)trophies.push({id:'first-flight',title:'First Flight',detail:'Participated in a weekly exhibition'});if(weeks.length>=3)trophies.push({id:'regular',title:'Hangar Regular',detail:'Participated in 3 distinct exhibition weeks'});if(weeks.length>=8)trophies.push({id:'curator',title:'Master Curator',detail:'Participated in 8 distinct exhibition weeks'});if(completed.length>=3)trophies.push({id:'set-master',title:'Collection Architect',detail:'Discovered all three off-chain cosmetic sets'});return {account,season:collector59Season(),weeksParticipated:weeks.length,weeks,completedSets:completed.length,trophies,title:trophies.length?trophies[trophies.length-1].title:'Rookie Collector',publicExhibit:!!gallery57Card(account),cosmeticOnly:true,prizeEligible:false}}
function collector59Record(account){const week=contest58Season().id;const r=collector59[account]||{weeks:[],firstExhibit:new Date().toISOString()};if(!r.weeks.includes(week)){r.weeks.push(week);collector59[account]=r;collector59Save()}return collector59View(account)}
if(pathname==='/api/collector59/season'&&req.method==='GET')return jsonResponse(res,200,{season:collector59Season(),milestones:[1,3,8],note:'Participation titles are off-chain, cosmetic-only and not NFT rewards.'});
if(pathname==='/api/collector59/me'&&req.method==='GET'){const sess=sessionFrom(req);if(!sess)return jsonResponse(res,401,{error:'Wallet authentication required'});return jsonResponse(res,200,collector59View(sess.account))}
if(pathname==='/api/collector59/join'&&req.method==='POST'){const sess=sessionFrom(req);if(!sess)return jsonResponse(res,401,{error:'Wallet authentication required'});if(!gallery57Card(sess.account))return jsonResponse(res,400,{error:'Publish a public exhibit before joining the weekly showcase'});return jsonResponse(res,200,collector59Record(sess.account))}
if(pathname==='/api/collector59/gallery'&&req.method==='GET'){const entries=Object.keys(collector59).filter(a=>gallery57Card(a)).map(a=>{const v=collector59View(a),exhibit=gallery57Card(a);return {account:a,title:v.title,trophies:v.trophies,weeksParticipated:v.weeksParticipated,completedSets:v.completedSets,exhibitTitle:exhibit.title}}).sort((a,b)=>b.weeksParticipated-a.weeksParticipated||a.account.localeCompare(b.account)).slice(0,100);return jsonResponse(res,200,{season:collector59Season(),entries,kind:'opt_in_off_chain_trophy_gallery',note:'Participation and cosmetics only; no NFT or token prizes.'})}
// Alpha 5.6: cosmetic collection journal. Only wallet-verified NFTs count as owned.
// Preset discovery is a separate off-chain achievement and never implies NFT ownership.
const journal56Sets=[
 {id:'velocity',name:'Velocity Collection',pieces:['racer','tri-blade','comet'],description:'Racer frame, tri-blade props, comet trail'},
 {id:'guardian',name:'Guardian Collection',pieces:['guardian','halo','solid'],description:'Guardian frame, halo props, solid lighting'},
 {id:'nightfall',name:'Nightfall Collection',pieces:['classic','pulse','ion'],description:'Classic frame, pulse lighting, ion trail'}
];
function journal56View(account,verified,ownership){const pilot=pilot52Get(account),l=workshop54Sanitize(pilot.workshop54),seen=new Set(Array.isArray(pilot.journal56)?pilot.journal56:[]);const sets=journal56Sets.map(set=>({id:set.id,name:set.name,description:set.description,completed:seen.has(set.id),visualReward:seen.has(set.id)?set.id+'-aura':null}));return {account,sets,discovered:sets.filter(x=>x.completed).length,total:sets.length,activeLoadout:l,nft:verified,ownership,ownedNftCount:verified?1:0,rarity:'NFT rarity is determined by the collection creator; no rarity is inferred here',cosmeticOnly:true,prizeEligible:false}}
if(pathname==='/api/journal56/me'&&req.method==='GET'){
 const sess=sessionFrom(req);if(!sess)return jsonResponse(res,401,{error:'Wallet authentication required'});
 const p=pilot52Get(sess.account);let nft=null,ownership='none';
 if(p.cosmetic){try{const x=await lookupEligible(sess.account,p.cosmetic.assetId);if(x.eligible){nft=pilot53Visual(x);ownership='verified'}else ownership='revoked'}catch{ownership='unavailable'}}
 return jsonResponse(res,200,journal56View(sess.account,nft,ownership));
}
if(pathname==='/api/journal56/discover'&&req.method==='POST'){
 const sess=sessionFrom(req);if(!sess)return jsonResponse(res,401,{error:'Wallet authentication required'});
 try{const b=await readJson(req),set=journal56Sets.find(x=>x.id===b.setId);if(!set)return jsonResponse(res,400,{error:'Unknown set'});
 const p=pilot52Get(sess.account),l=workshop54Sanitize(p.workshop54);
 const selected=new Set([l.frame,l.props,l.lights,l.trail]);if(!set.pieces.every(x=>selected.has(x)))return jsonResponse(res,409,{error:'Equip every component of the selected set in the Workshop first'});
 p.journal56=Array.isArray(p.journal56)?p.journal56:[];if(!p.journal56.includes(set.id)){p.journal56.push(set.id);pilot52Save()}
 return jsonResponse(res,200,{completed:set.id,visualReward:set.id+'-aura',cosmeticOnly:true,nftMinted:false,prizeEligible:false});
 }catch(e){return jsonResponse(res,400,{error:e.message})}
}
if(pathname==='/api/workshop54/loadout'&&req.method==='GET'){
 const sess=sessionFrom(req);if(!sess)return jsonResponse(res,401,{error:'WAX authentication required'});
 const pilot=pilot52Get(sess.account),linked=pilot.cosmetic;let verified=null,ownership='none';
 if(linked){try{const check=await lookupEligible(sess.account,linked.assetId);if(check.eligible){verified=pilot53Visual(check);ownership='verified'}else ownership='revoked'}catch{ownership='unavailable'}}
 return jsonResponse(res,200,{account:sess.account,loadout:workshop54Sanitize(pilot.workshop54),nft:verified,ownership,cosmeticOnly:true,prizeEligible:false});
}
if(pathname==='/api/workshop54/loadout'&&req.method==='POST'){
 const sess=sessionFrom(req);if(!sess)return jsonResponse(res,401,{error:'WAX authentication required'});
 try{const b=await readJson(req),loadout=workshop54Validate(b);pilot52Get(sess.account).workshop54=loadout;pilot52Save();return jsonResponse(res,200,{account:sess.account,loadout,cosmeticOnly:true,prizeEligible:false})}
 catch(e){return jsonResponse(res,400,{error:e.message})}
}
if(pathname==='/api/pilot53/hangar'&&req.method==='GET'){
 const sess=sessionFrom(req);if(!sess)return jsonResponse(res,401,{error:'Wallet login required'});
 const pilot=pilot52Get(sess.account),linked=pilot.cosmetic;
 let equipped=null,ownership='none';
 if(linked){try{const check=await lookupEligible(sess.account,linked.assetId);if(check.eligible){equipped=pilot53Visual(check);ownership='verified_now'}else ownership='revoked_or_not_approved'}catch{ownership='verification_unavailable'}}
 return jsonResponse(res,200,{account:sess.account,equipped,ownership,cosmeticOnly:true,prizeEligible:false,availableThemes:['neon','storm','vanguard','legacy']});
}
if(pathname==='/api/pilot52/me'&&req.method==='GET'){
 const sess=sessionFrom(req);if(!sess)return jsonResponse(res,401,{error:'Authenticate WAX wallet first'});
 return jsonResponse(res,200,pilot52Public(sess.account));
}
if(pathname==='/api/pilot52/leaderboard'&&req.method==='GET'){
 const rows=Object.keys(pilot52).map(pilot52Public).sort((a,b)=>b.rating-a.rating||b.xp-a.xp).slice(0,30);
 return jsonResponse(res,200,{kind:'provisional_exhibition',rows,prizeEligible:false});
}
if(pathname==='/api/pilot52/cosmetic'&&req.method==='POST'){
 const sess=sessionFrom(req);if(!sess)return jsonResponse(res,401,{error:'Authenticate WAX wallet first'});
 try{const body=await readJson(req);if(body.assetId===null){pilot52Get(sess.account).cosmetic=null;pilot52Save();return jsonResponse(res,200,pilot52Public(sess.account))}
 if(!/^[0-9]{1,20}$/.test(String(body.assetId)))return jsonResponse(res,400,{error:'Valid AtomicAssets asset ID required'});
 const eligible=await lookupEligible(sess.account,String(body.assetId));if(!eligible.eligible)return jsonResponse(res,403,{error:'Asset must be wallet-owned and on the approved template list'});
 pilot52Get(sess.account).cosmetic={assetId:eligible.asset,theme:eligible.theme,collection:eligible.collection,checkedAt:eligible.checkedAt};pilot52Save();return jsonResponse(res,200,pilot52Public(sess.account));
 }catch(e){return jsonResponse(res,400,{error:e.message})}
}

if(pathname.startsWith('/api/admin46/')){
 if(!admin46(req))return jsonResponse(res,403,{error:'Administrator token required; configure FPV_ADMIN_TOKEN (32+ characters)'});
 if(pathname==='/api/admin46/queue'&&req.method==='GET'){
  const rows=claim45.slice(-500).reverse().map(c=>({id:c.id,account:c.account,edition:c.edition,status:c.status,createdAt:c.createdAt,flags:reviewFlags46(c.account),evidence:c.stageEvidence,latestAudit:audit46.filter(a=>a.requestId===c.id).slice(-1)[0]||null}));
  return jsonResponse(res,200,{rows,prizeDistributionEnabled:false,disclaimer:'Manual practice review only. Fingerprints are not proof of honest gameplay.'});
 }
 if(pathname==='/api/admin46/records'&&req.method==='GET'){
  const account=u.searchParams.get('account');if(!validAccount(account))return jsonResponse(res,400,{error:'Valid account required'});
  return jsonResponse(res,200,{account,flags:reviewFlags46(account),records:sim42Records.filter(r=>r.account===account).slice(-100),audits:audit46.filter(a=>a.account===account).slice(-100),replayFramesPersisted:false});
 }
 if(pathname==='/api/admin46/decision'&&req.method==='POST'){
  try{const b=await readJson(req);if(typeof b.id!=='string'||!['needs_investigation','reviewed_practice','rejected_practice'].includes(b.status)||typeof b.reason!=='string'||b.reason.trim().length<8||b.reason.length>500)return jsonResponse(res,400,{error:'Invalid review status or reason (8-500 characters)'});
   const row=claim45.find(x=>x.id===b.id);if(!row)return jsonResponse(res,404,{error:'Request not found'});
   const event={id:crypto.randomUUID(),requestId:row.id,account:row.account,previousStatus:row.status,status:b.status,reason:b.reason.trim(),timestamp:new Date().toISOString()};
   row.status=b.status;row.approved=false;row.minted=false;audit46.push(event);audit46=audit46.slice(-3000);claim45Save();saveAudit46();return jsonResponse(res,200,{event,prizeEligible:false,mintEnabled:false});
  }catch{return jsonResponse(res,400,{error:'Invalid decision payload'})}
 }
 return jsonResponse(res,404,{error:'Unknown admin endpoint'});
}
if(pathname==='/api/claims45/status'&&req.method==='GET'){
 const session=sessionFrom(req);if(!session)return jsonResponse(res,401,{error:'Verified WAX wallet session required'});
 const best=claim45Stages(session.account),complete=best.every(Boolean);
 const stages=best.map((r,i)=>({stage:i+1,name:['Canyon Sprint','Storm Circuit','Neon Slalom'][i],completed:!!r,bestSeconds:r?.elapsed??null,replayHash:r?.replayHash??null}));
 const requests=claim45.filter(x=>x.account===session.account).map(({id,edition,status,createdAt,stageEvidence})=>({id,edition,status,createdAt,stageEvidence}));
 return jsonResponse(res,200,{account:session.account,stages,practiceComplete:complete,requests,eligibleForPrize:false,mintEnabled:false,claimEnabled:false,reviewOnly:true});
}
if(pathname==='/api/claims45/request-review'&&req.method==='POST'){
 const session=sessionFrom(req);if(!session)return jsonResponse(res,401,{error:'Verified WAX wallet session required'});
 try{const body=await readJson(req);if(body.edition!=='finisher')return jsonResponse(res,400,{error:'Only the practice finisher review request is supported'});
 const best=claim45Stages(session.account);if(!best.every(Boolean))return jsonResponse(res,409,{error:'Complete all three server-simulated practice stages first'});
 const existing=claim45.find(x=>x.account===session.account&&x.edition==='finisher');
 if(existing)return jsonResponse(res,200,{id:existing.id,status:existing.status,duplicate:true,reviewOnly:true,mintEnabled:false});
 const row={id:crypto.randomUUID(),account:session.account,edition:'finisher',status:'awaiting_manual_review',createdAt:new Date().toISOString(),stageEvidence:best.map((r,i)=>({stage:i+1,elapsed:r.elapsed,replayHash:r.replayHash})),approved:false,minted:false};
 claim45.push(row);claim45=claim45.slice(-2000);claim45Save();
 return jsonResponse(res,201,{id:row.id,status:row.status,reviewOnly:true,eligibleForPrize:false,mintEnabled:false});
 }catch{return jsonResponse(res,400,{error:'Invalid review request'})}
}
if(pathname==='/api/sim40/start'&&req.method==='POST'){
 const session=sessionFrom(req);if(!session)return jsonResponse(res,401,{error:'Verified WAX session required'});
 try{const b=await readJson(req),stage=Number(b.stage);if(![1,2,3].includes(stage))return jsonResponse(res,400,{error:'Invalid stage'});
 for(const [id,r] of sim40)if(r.account===session.account)sim40.delete(id);
 const id=crypto.randomUUID();const r={id,account:session.account,stage,p:{x:0,y:7,z:12},heading:0,speed:0,gate:0,ticks:0,status:'flying',lastSeen:Date.now(),startedAt:Date.now(),sequence:0,replay:[],controlsLog:[],recorded:false};sim40.set(id,r);
 return jsonResponse(res,200,sim40View(r));}catch{return jsonResponse(res,400,{error:'Invalid start request'})}
}
if(pathname==='/api/sim40/step'&&req.method==='POST'){
 const session=sessionFrom(req);if(!session)return jsonResponse(res,401,{error:'Verified WAX session required'});
 try{const b=await readJson(req),r=sim40.get(b.id);if(!r||r.account!==session.account)return jsonResponse(res,403,{error:'Unknown or unauthorized flight'});
 const seq=Number(b.sequence);if(!Number.isSafeInteger(seq)||seq!==r.sequence+1)return jsonResponse(res,409,{error:'Out-of-order controls'});
 const n=Number(b.steps);if(!Number.isSafeInteger(n)||n<1||n>5)return jsonResponse(res,400,{error:'Invalid simulation steps'});
 // Do not allow the client to run simulation faster than real time (small latency buffer).
 const allowed=Math.floor((Date.now()-r.startedAt)/50)+4;
 if(r.ticks+n>allowed)return jsonResponse(res,429,{error:'Controls submitted faster than real time'});
 const c=b.controls||{};if(!['throttle','turn','lift'].every(k=>Number.isFinite(Number(c[k]??0))&&Math.abs(Number(c[k]??0))<=1))return jsonResponse(res,400,{error:'Controls must be finite values between -1 and 1'});
 r.sequence=seq;r.lastSeen=Date.now();const normalized={throttle:Number(c.throttle||0),turn:Number(c.turn||0),lift:Number(c.lift||0)};
 const before=r.ticks;for(let i=0;i<n;i++)sim40Advance(r,normalized);const advanced=r.ticks-before;if(advanced)r.controlsLog.push({n:advanced,c:normalized});
 if(r.status==='finished'&&!r.recorded){r.recorded=true;const elapsed=+(r.ticks*SIM40_DT).toFixed(2);const replayHash=crypto.createHash('sha256').update(JSON.stringify({account:r.account,stage:r.stage,replay:r.replay,elapsed})).digest('hex');r.replayHash=replayHash;const trace={id:r.id,account:r.account,stage:r.stage,elapsed,completedAt:new Date().toISOString(),controls:r.controlsLog,final:{position:{...r.p},heading:r.heading,speed:r.speed,gate:r.gate,ticks:r.ticks,status:r.status},replayHash};const traceHash=sim47Digest(trace);sim47Traces.push({...trace,traceHash});sim47Traces=sim47Traces.slice(-500);saveSim47();sim42Records.push({account:r.account,stage:r.stage,elapsed,completedAt:trace.completedAt,replayHash,traceId:r.id,traceHash});sim42Records=sim42Records.slice(-1000);sim42Save()}
 return jsonResponse(res,200,{...sim40View(r),replayHash:r.replayHash||null});}catch{return jsonResponse(res,400,{error:'Invalid control packet'})}
}
// Alpha 4.3: non-minting trophy preview derived ONLY from server-simulated practice records.
// This is deliberately not a prize eligibility authorization or minting endpoint.
if(pathname==='/api/trophies43/preview'&&req.method==='GET'){
 const session=sessionFrom(req);if(!session)return jsonResponse(res,401,{error:'Verified WAX session required'});
 const best=[1,2,3].map(stage=>sim42Records.filter(x=>x.account===session.account&&x.stage===stage&&Number.isFinite(x.elapsed)&&x.elapsed>0).sort((a,b)=>a.elapsed-b.elapsed)[0]||null);
 const stages=best.map((r,i)=>({stage:i+1,name:['Canyon Sprint','Storm Circuit','Neon Slalom'][i],completed:!!r,bestSeconds:r?r.elapsed:null,replayHash:r?r.replayHash:null}));
 const complete=best.every(Boolean),total=complete?+(best.reduce((sum,r)=>sum+r.elapsed,0)).toFixed(2):null;
 const draft=complete?{standard:'atomicassets',name:'Founders Flight Practice Finisher',description:'Commemorative preview only. NOT a verified tournament prize.',recipient:session.account,season:'founders-flight',achievement:'three_server_simulated_practice_stages',combined_best_seconds:total,attributes:stages.map(x=>({trait_type:x.name,value:x.bestSeconds})),image:'ipfs://REPLACE_WITH_UPLOADED_ARTWORK',status:'DRAFT_NOT_MINTED'}:null;
 return jsonResponse(res,200,{account:session.account,season:'founders-flight',stages,complete,combinedBestSeconds:total,practiceRecognition:complete,prizeEligible:false,mintEnabled:false,claimEnabled:false,metadataDraft:draft,disclaimer:'Practice completion is not eligibility for a valuable NFT reward. No minting or claims enabled.'});
}
// 4.7: deterministic control replay, with independent state and digest comparison.
function verify47(trace){
 const r={p:{x:0,y:7,z:12},heading:0,speed:0,gate:0,ticks:0,status:'flying',replay:[]};
 let count=0;
 for(const packet of trace.controls||[]){
  if(!Number.isSafeInteger(packet.n)||packet.n<1||packet.n>5||!packet.c||!['throttle','turn','lift'].every(k=>Number.isFinite(packet.c[k])&&Math.abs(packet.c[k])<=1))return {valid:false,reason:'invalid_controls'};
  for(let i=0;i<packet.n;i++){if(r.status!=='flying')return {valid:false,reason:'controls_after_finish'};sim40Advance(r,packet.c);if(++count>SIM40_MAX_STEPS)return {valid:false,reason:'step_limit'}}
 }
 const actual={position:{...r.p},heading:r.heading,speed:r.speed,gate:r.gate,ticks:r.ticks,status:r.status};
 const actualElapsed=+(r.ticks*SIM40_DT).toFixed(2);
 const replayHash=sim47Digest({account:trace.account,stage:trace.stage,replay:r.replay,elapsed:actualElapsed});
 const stateMatches=sim47Digest(actual)===sim47Digest(trace.final);
 const valid=stateMatches&&actualElapsed===trace.elapsed&&replayHash===trace.replayHash&&r.status==='finished';
 return {valid,reason:valid?'deterministic_replay_matches':'replay_mismatch',elapsed:actualElapsed,steps:r.ticks,gate:r.gate,replayHash,traceHashValid:sim47Digest(Object.fromEntries(Object.entries(trace).filter(([k])=>k!=='traceHash')))===trace.traceHash};
}
// Alpha 4.8: on-demand competition integrity audit of durable practice traces.
// Flags are triage signals only. Never equate replay consistency with cheat-free play.
const integrity48File=path.join(root,'integrity48_audits.json');
let integrity48Audits=[];try{const v=JSON.parse(fs.readFileSync(integrity48File,'utf8'));if(Array.isArray(v))integrity48Audits=v.slice(-2000)}catch{}
function saveIntegrity48(){const t=integrity48File+'.tmp';fs.writeFileSync(t,JSON.stringify(integrity48Audits));fs.renameSync(t,integrity48File)}
function integrity48Assess(trace){
 const replay=verify47(trace),flags=[];
 if(!replay.valid)flags.push('replay_mismatch');
 if(!replay.traceHashValid)flags.push('trace_digest_mismatch');
 if(!Number.isFinite(trace.elapsed)||trace.elapsed<=0||trace.elapsed>1200)flags.push('invalid_duration');
 const inputs=trace.controls||[];
 if(!Array.isArray(inputs)||inputs.length===0)flags.push('missing_control_trace');
 const steps=Array.isArray(inputs)?inputs.reduce((sum,p)=>sum+(Number.isSafeInteger(p.n)?p.n:0),0):0;
 if(steps>SIM40_MAX_STEPS)flags.push('excessive_simulation_steps');
 const matching=sim42Records.filter(r=>r.traceId===trace.id);
 if(matching.length!==1)flags.push('leaderboard_link_mismatch');
 else if(matching[0].account!==trace.account||matching[0].stage!==trace.stage||matching[0].elapsed!==trace.elapsed||matching[0].replayHash!==trace.replayHash||matching[0].traceHash!==trace.traceHash)flags.push('leaderboard_record_mismatch');
 const sameAccountStage=sim47Traces.filter(t=>t.account===trace.account&&t.stage===trace.stage);
 if(sameAccountStage.some(t=>t.id!==trace.id&&t.traceHash===trace.traceHash))flags.push('duplicate_trace_digest');
 return {traceId:trace.id,account:trace.account,stage:trace.stage,elapsed:trace.elapsed,replayValid:replay.valid,traceDigestValid:replay.traceHashValid,flags,reviewStatus:flags.length?'needs_review':'replay_consistent_practice',prizeEligible:false};
}
if(pathname==='/api/admin48/audit'&&req.method==='POST'){
 if(!admin46(req))return jsonResponse(res,403,{error:'Administrator token required'});
 try{const b=await readJson(req);const ids=b.ids==='all'?sim47Traces.slice(-500).map(t=>t.id):Array.isArray(b.ids)?b.ids.slice(0,100):[];
  if(!ids.length)return jsonResponse(res,400,{error:'Provide ids array or ids:"all"'});
  const results=ids.map(id=>sim47Traces.find(t=>t.id===id)).filter(Boolean).map(integrity48Assess);
  const auditedAt=new Date().toISOString();integrity48Audits.push(...results.map(x=>({...x,auditedAt})));integrity48Audits=integrity48Audits.slice(-2000);saveIntegrity48();
  return jsonResponse(res,200,{auditedAt,results,summary:{checked:results.length,flagged:results.filter(x=>x.flags.length).length},prizeEligible:false});
 }catch{return jsonResponse(res,400,{error:'Invalid audit request'})}
}
if(pathname==='/api/admin48/report'&&req.method==='GET'){
 if(!admin46(req))return jsonResponse(res,403,{error:'Administrator token required'});
 const latest=new Map();for(const a of integrity48Audits)latest.set(a.traceId,a);
 const rows=[...latest.values()].reverse().slice(0,250);
 return jsonResponse(res,200,{rows,summary:{tracesStored:sim47Traces.length,audited:latest.size,flagged:rows.filter(x=>x.flags.length).length},prizeEligible:false,mintEnabled:false,disclaimer:'Replay consistency is not proof of fair play; no official prizes.'});
}
if(pathname==='/api/sim47/my-traces'&&req.method==='GET'){
 const session=sessionFrom(req);if(!session)return jsonResponse(res,401,{error:'Verified WAX session required'});
 return jsonResponse(res,200,{traces:sim47Traces.filter(x=>x.account===session.account).slice(-50).map(({id,stage,elapsed,completedAt,traceHash})=>({id,stage,elapsed,completedAt,traceHash})),prizeEligible:false});
}
if(pathname==='/api/sim47/verify'&&req.method==='GET'){
 const session=sessionFrom(req),id=u.searchParams.get('id'),trace=sim47Traces.find(x=>x.id===id);
 if(!session||!trace||trace.account!==session.account)return jsonResponse(res,403,{error:'Unauthorized trace'});
 const audit=verify47(trace);return jsonResponse(res,200,{id,stage:trace.stage,audit,prizeEligible:false,disclaimer:'Deterministic server replay checks stored inputs, not collusion, automation, or server compromise.'});
}
if(pathname==='/api/admin47/verify'&&req.method==='GET'){
 if(!admin46(req))return jsonResponse(res,403,{error:'Administrator token required'});
 const trace=sim47Traces.find(x=>x.id===u.searchParams.get('id'));
 if(!trace)return jsonResponse(res,404,{error:'Trace not found'});
 return jsonResponse(res,200,{id:trace.id,account:trace.account,stage:trace.stage,audit:verify47(trace),prizeEligible:false});
}
if(pathname==='/api/sim42/leaderboard'&&req.method==='GET'){
 const stage=Number(u.searchParams.get('stage'));if(![1,2,3].includes(stage))return jsonResponse(res,400,{error:'Invalid stage'});
 return jsonResponse(res,200,{stage,kind:'server_simulated_practice',prizeEligible:false,rows:sim42Board(stage)});
}
if(pathname==='/api/sim42/replay'&&req.method==='GET'){
 const session=sessionFrom(req),r=sim40.get(u.searchParams.get('id'));
 if(!session||!r||r.account!==session.account)return jsonResponse(res,403,{error:'Unauthorized replay'});
 return jsonResponse(res,200,{stage:r.stage,status:r.status,frames:r.replay,replayHash:r.replayHash||null,prizeEligible:false});
}
if(pathname==='/api/sim40/state'&&req.method==='GET'){
 const session=sessionFrom(req),r=sim40.get(u.searchParams.get('id'));if(!session||!r||r.account!==session.account)return jsonResponse(res,403,{error:'Not authorized'});
 return jsonResponse(res,200,sim40View(r));
}
if(pathname==='/api/auth/challenge'&&req.method==='POST'){
 try{const b=await readJson(req);if(!validAccount(b.account))return jsonResponse(res,400,{error:'Invalid WAX account'});const id=crypto.randomUUID(),nonce='WAX-FPV-Arena:'+crypto.randomBytes(24).toString('hex');authChallenges.set(id,{account:b.account,nonce,expires:Date.now()+AUTH_TTL});return jsonResponse(res,200,{id,nonce,expiresInSeconds:300,method:'userAccountProof'})}catch{return jsonResponse(res,400,{error:'Invalid request'})}
}
if(pathname==='/api/auth/verify'&&req.method==='POST'){
 try{const b=await readJson(req),challenge=authChallenges.get(b.id);if(challenge)authChallenges.delete(b.id);if(!challenge||challenge.expires<Date.now())return jsonResponse(res,401,{error:'Challenge expired or already used'});const proof=b.proof;if(!proof||proof.accountName!==challenge.account||proof.message!==challenge.nonce||typeof proof.signature!=='string'||!/^SIG_K1_/.test(proof.signature))return jsonResponse(res,401,{error:'Invalid wallet proof'});const ecc=require('eosjs-ecc');const keys=await rpcActiveKeys(challenge.account);if(!keys.some(k=>{try{return ecc.verify(proof.signature,challenge.nonce,k)}catch{return false}}))return jsonResponse(res,401,{error:'Wallet signature did not match on-chain keys'});const token=crypto.randomBytes(32).toString('hex'),expires=Date.now()+SESSION_TTL;authSessions.set(crypto.createHash('sha256').update(token).digest('hex'),{account:challenge.account,expires});return jsonResponse(res,200,{authenticated:true,account:challenge.account,token,expiresAt:new Date(expires).toISOString()})}catch(e){return jsonResponse(res,503,{error:'Unable to verify wallet proof. Check RPC and dependencies.'})}
}
if(pathname==='/api/auth/me'&&req.method==='GET'){const session=sessionFrom(req);return jsonResponse(res,session?200:401,session?{authenticated:true,account:session.account,expiresAt:new Date(session.expires).toISOString()}:{authenticated:false})}
if(pathname==='/api/auth/logout'&&req.method==='POST'){const h=String(req.headers.authorization||'');if(/^Bearer [a-f0-9]{64}$/.test(h))authSessions.delete(crypto.createHash('sha256').update(h.slice(7)).digest('hex'));return jsonResponse(res,200,{loggedOut:true})}
if(pathname==='/api/nft/entitlement'&&req.method==='GET'){
 const session=sessionFrom(req);if(!session)return jsonResponse(res,401,{eligible:false,error:'Verified wallet session required'});
 try{const result=await lookupEligible(session.account,u.searchParams.get('asset')||'');return jsonResponse(res,200,{...result,walletAuthenticated:true,premiumAccessGranted:result.eligible,note:'Eligibility verified for this request; recheck at time of gameplay access'})}catch{return jsonResponse(res,503,{eligible:false,error:'NFT entitlement unavailable; access denied'})}
}
const seasonProfileFile=path.join(root,'season_practice_profiles.json');let seasonProfiles={};try{seasonProfiles=JSON.parse(fs.readFileSync(seasonProfileFile,'utf8'))}catch{}
function saveSeasonProfiles(){const temp=seasonProfileFile+'.tmp';fs.writeFileSync(temp,JSON.stringify(seasonProfiles));fs.renameSync(temp,seasonProfileFile)}
// Seasonal leaderboard is informational: prior race results are client-reported and NOT prize eligible.
// Authenticated seasonal practice records. Client-reported times are NEVER prize-verified.
if(pathname==='/api/season/flight-start'&&req.method==='POST'){
 const session=sessionFrom(req);if(!session)return jsonResponse(res,401,{error:'Authenticated wallet required'});
 try{const b=await readJson(req),stage=Number(b.stage),cfg=flightStages[stage];if(!cfg)return jsonResponse(res,400,{error:'Invalid stage'});
 const id=crypto.randomUUID();flightRuns.set(id,{account:session.account,stage,started:Date.now(),lastAt:Date.now(),last:null,next:0,samples:0,invalid:null,finished:false});
 return jsonResponse(res,200,{attemptId:id,stage,gateCount:8,validation:'server_checkpoint_telemetry_practice',prizeEligible:false});
 }catch{return jsonResponse(res,400,{error:'Invalid flight start'})}
}
if(pathname==='/api/season/flight-sample'&&req.method==='POST'){
 const session=sessionFrom(req);if(!session)return jsonResponse(res,401,{error:'Authenticated wallet required'});
 try{const b=await readJson(req),r=flightRuns.get(b.attemptId);if(!r||r.account!==session.account||r.finished)return jsonResponse(res,403,{error:'Invalid flight attempt'});
 const x=Number(b.x),y=Number(b.y),z=Number(b.z),now=Date.now();if(![x,y,z].every(Number.isFinite)||Math.max(Math.abs(x),Math.abs(y),Math.abs(z))>3000){r.invalid='Invalid position';return jsonResponse(res,422,{error:r.invalid})}
 const dt=(now-r.lastAt)/1000;
 if(r.last&&dt>0.03){const dist=Math.hypot(x-r.last.x,y-r.last.y,z-r.last.z);if(dist/dt>110)r.invalid='Implausible sampled movement';}
 if(y<0||y>145)r.invalid='Flight outside altitude bounds';
 r.last={x,y,z};r.lastAt=now;r.samples++;
 const gate=canonicalGates()[r.next];if(!r.invalid&&gate&&Math.hypot(x-gate.x,z-gate.z)<10&&y>=3&&y<=40)r.next++;
 return jsonResponse(res,r.invalid?422:200,{accepted:!r.invalid,nextGate:r.next,gateCount:8,error:r.invalid||undefined,prizeEligible:false});
 }catch{return jsonResponse(res,400,{error:'Invalid flight sample'})}
}
if(pathname==='/api/season/flight-finish'&&req.method==='POST'){
 const session=sessionFrom(req);if(!session)return jsonResponse(res,401,{error:'Authenticated wallet required'});
 try{const b=await readJson(req),r=flightRuns.get(b.attemptId);
 if(!r||r.account!==session.account||r.finished)return jsonResponse(res,403,{error:'Invalid or consumed attempt'});
 flightRuns.delete(b.attemptId);
 const elapsed=(Date.now()-r.started)/1000,claimed=Number(b.time);
 if(r.invalid||r.next!==8||r.samples<8||elapsed<5||elapsed>2700||!Number.isFinite(claimed)||Math.abs(elapsed-claimed)>Math.max(4,elapsed*.15))return jsonResponse(res,422,{accepted:false,error:r.invalid||'Incomplete gates, insufficient telemetry or timing mismatch',gates:r.next,samples:r.samples,prizeEligible:false});
 const row=seasonProfiles[session.account]||{stages:{}};row.stages||={};const key=String(r.stage);
 if(r.stage>1&&!row.stages[String(r.stage-1)])return jsonResponse(res,409,{error:'Previous stage required'});
 if(!row.stages[key]||elapsed<row.stages[key].time)row.stages[key]={time:Math.round(elapsed*100)/100,clean:b.clean===true,submittedAt:new Date().toISOString(),verified:false,validation:'server_gate_telemetry_practice'};
 seasonProfiles[session.account]=row;saveSeasonProfiles();return jsonResponse(res,200,{accepted:true,stage:r.stage,record:row.stages[key],prizeEligible:false,validation:'server_gate_telemetry_practice'});
 }catch{return jsonResponse(res,400,{error:'Invalid flight finish'})}
}
if(pathname==='/api/season/attempt-start'&&req.method==='POST'){
 const session=sessionFrom(req);if(!session)return jsonResponse(res,401,{error:'Verified wallet required'});
 try{const b=await readJson(req),stage=Number(b.stage);if(!Number.isInteger(stage)||stage<1||stage>3)return jsonResponse(res,400,{error:'Invalid stage'});
 const id=crypto.randomUUID(),started=Date.now();practiceAttempts.set(id,{account:session.account,stage,started});
 return jsonResponse(res,200,{attemptId:id,stage,startedAt:new Date(started).toISOString(),expiresInSeconds:2700,prizeEligible:false});
 }catch{return jsonResponse(res,400,{error:'Invalid request'})}
}
if(pathname==='/api/season/attempt-finish'&&req.method==='POST'){
 const session=sessionFrom(req);if(!session)return jsonResponse(res,401,{error:'Verified wallet required'});
 try{const b=await readJson(req),a=practiceAttempts.get(b.attemptId);
 if(!a||a.account!==session.account)return jsonResponse(res,403,{error:'Invalid or consumed attempt'});
 practiceAttempts.delete(b.attemptId);
 const elapsed=(Date.now()-a.started)/1000,claimed=Number(b.time),clean=b.clean===true;
 if(elapsed<5||elapsed>2700||!Number.isFinite(claimed)||claimed<5||claimed>3600||Math.abs(elapsed-claimed)>Math.max(3,elapsed*.12))return jsonResponse(res,422,{error:'Practice timing discrepancy',serverElapsed:Math.round(elapsed*100)/100});
 const stage=a.stage,key=String(stage),row=seasonProfiles[session.account]||{stages:{}};row.stages||={};
 if(stage>1&&!row.stages[String(stage-1)])return jsonResponse(res,409,{error:'Complete the previous practice stage first'});
 if(!row.stages[key]||elapsed<row.stages[key].time)row.stages[key]={time:Math.round(elapsed*100)/100,clean,submittedAt:new Date().toISOString(),verified:false,validation:'server_clock_only'};
 seasonProfiles[session.account]=row;saveSeasonProfiles();return jsonResponse(res,200,{saved:true,stage,record:row.stages[key],serverElapsed:Math.round(elapsed*100)/100,prizeEligible:false,validation:'server_clock_only',notice:'Server timing checked. Checkpoints and physics are not verified.'});
 }catch{return jsonResponse(res,400,{error:'Invalid attempt'})}
}
if(pathname==='/api/season/my-profile'&&req.method==='GET'){
 const session=sessionFrom(req);if(!session)return jsonResponse(res,401,{error:'Sign in with a verified WAX wallet'});
 const row=seasonProfiles[session.account]||{};return jsonResponse(res,200,{account:session.account,season:'founders-flight',stages:row.stages||{},rewardEligible:false,verification:'client_reported_practice'});
}
if(pathname==='/api/season/practice-submit'&&req.method==='POST'){
 const session=sessionFrom(req);if(!session)return jsonResponse(res,401,{error:'Verified WAX wallet required'});
 try{const b=await readJson(req);const stage=Number(b.stage),time=Number(b.time),clean=b.clean===true;
 if(!Number.isInteger(stage)||stage<1||stage>3||!Number.isFinite(time)||time<5||time>3600||typeof b.clean!=='boolean')return jsonResponse(res,400,{error:'Invalid stage result'});
 const key=String(stage),row=seasonProfiles[session.account]||{stages:{}};row.stages||={};
 if(stage>1&&!row.stages[String(stage-1)])return jsonResponse(res,409,{error:'Complete the previous stage first'});
 if(!row.stages[key]||time<row.stages[key].time)row.stages[key]={time:Math.round(time*100)/100,clean,submittedAt:new Date().toISOString(),verified:false};
 seasonProfiles[session.account]=row;saveSeasonProfiles();return jsonResponse(res,200,{saved:true,account:session.account,stage,record:row.stages[key],prizeEligible:false,notice:'Legacy client-reported practice only; not validated for prizes'});
 }catch{return jsonResponse(res,400,{error:'Invalid practice submission'})}
}
if(pathname==='/api/season/reward-preview'&&req.method==='GET'){
 const session=sessionFrom(req);if(!session)return jsonResponse(res,401,{error:'Verified WAX wallet required'});
 const stages=seasonProfiles[session.account]?.stages||{},completed=[1,2,3].every(i=>Number.isFinite(stages[String(i)]?.time));
 return jsonResponse(res,200,{account:session.account,season:'founders-flight',practiceCompleted:completed,prizeEligible:false,claimable:false,mintEnabled:false,reason:'Authoritative replay verification, anti-cheat and official prize rules are not yet implemented',metadataDraft:completed?{name:'Founders Flight Finisher',season:'founders-flight',recipient:session.account,status:'preview_only'}:null});
}
if(pathname==='/api/season/standings'&&req.method==='GET'){
 const courses=Object.entries(boards).flatMap(([course,rows])=>Array.isArray(rows)?rows.filter(x=>x&&Number.isFinite(x.time)).map(x=>({course,name:String(x.name||'Pilot').slice(0,20),time:x.time,date:x.date,verified:false})):[]);
 courses.sort((a,b)=>a.time-b.time);
 return jsonResponse(res,200,{season:'Founders Flight — Preview',status:'unverified_demo',entries:courses.slice(0,60),notice:'Client-reported times; not validated for prizes or NFT rewards.'});
}
if(pathname==='/api/season/config'&&req.method==='GET'){
 return jsonResponse(res,200,{season:'Founders Flight — Preview',start:null,end:null,tracks:['Canyon Sprint','Storm Circuit','Neon Slalom'],rewardStatus:'concept_only',nftRewardsMinted:false,marketplace:'https://wax.atomichub.io/',rules:'Skill-based competition. NFT ownership does not improve flight performance.'});
}
if(pathname==='/season.html'&&req.method==='GET'){res.writeHead(200,{'content-type':'text/html; charset=utf-8','cache-control':'no-store'});return fs.createReadStream(path.join(root,'season.html')).pipe(res)}
if(pathname==='/wallet.html'){res.writeHead(200,{'content-type':'text/html; charset=utf-8','cache-control':'no-store'});return fs.createReadStream(path.join(root,'wallet.html')).pipe(res)}
if(pathname==='/api/guest-profile' && req.method==='POST'){
 res.setHeader('content-type','application/json');res.setHeader('cache-control','no-store');
 const token=guestToken(),id=crypto.randomUUID();profiles[id]={tokenHash:crypto.createHash('sha256').update(token).digest('hex'),created:Date.now(),name:'Pilot'};saveProfiles();res.end(JSON.stringify({id,token,kind:'guest',walletVerified:false}));return;
}
if(pathname==='/api/verify-asset'){
 res.setHeader('content-type','application/json; charset=utf-8');res.setHeader('cache-control','no-store');
 const account=u.searchParams.get('account')||'',asset=u.searchParams.get('asset')||'';
 if(!/^[a-z1-5.]{1,12}$/.test(account)||!/^\d{1,20}$/.test(asset)){res.writeHead(400);return res.end(JSON.stringify({verified:false,error:'Invalid account or asset ID'}))}
 try{const ac=new AbortController(),timer=setTimeout(()=>ac.abort(),7000);let response;
 try{response=await fetch('https://wax.api.atomicassets.io/atomicassets/v1/assets/'+asset,{signal:ac.signal,headers:{accept:'application/json'}})}finally{clearTimeout(timer)}
 if(!response.ok)throw Error('AtomicAssets API status '+response.status);
 const payload=await response.json();if(!payload.success||!payload.data||String(payload.data.asset_id)!==asset)throw Error('Invalid asset response');
 const verified=payload.data.owner===account;return res.end(JSON.stringify({verified,asset,account,collection:payload.data.collection?.collection_name||null,checkedAt:new Date().toISOString(),note:'Public on-chain ownership only; wallet identity not authenticated'}))
 }catch(e){res.writeHead(503);return res.end(JSON.stringify({verified:false,error:'Ownership verification unavailable; retry later'}))}
}
// Public eligibility inspection only. Never use this endpoint to authorize access.
if(pathname==='/api/nft-eligibility' && req.method==='GET'){
 res.setHeader('content-type','application/json; charset=utf-8');res.setHeader('cache-control','no-store');
 const account=u.searchParams.get('account')||'',asset=u.searchParams.get('asset')||'';
 if(!/^[a-z1-5.]{1,12}$/.test(account)||!/^[0-9]{1,20}$/.test(asset)){res.writeHead(400);return res.end(JSON.stringify({eligible:false,error:'Invalid account or asset ID'}))}
 let approved;try{approved=JSON.parse(fs.readFileSync(path.join(root,'approved_nft_templates.json'),'utf8'))}catch{approved={collections:[]}}
 try{
  const ac=new AbortController(),timer=setTimeout(()=>ac.abort(),7000);let response;
  try{response=await fetch('https://wax.api.atomicassets.io/atomicassets/v1/assets/'+asset,{signal:ac.signal,headers:{accept:'application/json'}})}finally{clearTimeout(timer)}
  if(!response.ok)throw Error('NFT lookup unavailable');const payload=await response.json();const a=payload.data;
  if(!payload.success||!a||String(a.asset_id)!==asset)throw Error('Asset not found');
  const collection=String(a.collection?.collection_name||''),template=String(a.template?.template_id||'');
  const allow=(approved.collections||[]).find(x=>x.name===collection&&Array.isArray(x.template_ids)&&x.template_ids.map(String).includes(template));
  const owned=a.owner===account,eligible=!!allow&&owned;
  return res.end(JSON.stringify({eligible,owned,approvedTemplate:!!allow,collection,template,asset,account,checkedAt:new Date().toISOString(),walletAuthenticated:false,premiumAccessGranted:false,note:'Public eligibility preview only; no secure entitlement granted'}));
 }catch(e){res.writeHead(503);return res.end(JSON.stringify({eligible:false,error:'Unable to verify on-chain asset; access fails closed'}))}
}
if(pathname==='/entitlements.html'){res.writeHead(200,{'content-type':'text/html; charset=utf-8','cache-control':'no-store'});return fs.createReadStream(path.join(root,'entitlements.html')).pipe(res)}
if(pathname==='/launchpad.html'){res.writeHead(200,{'content-type':'text/html; charset=utf-8','cache-control':'no-store'});return fs.createReadStream(path.join(root,'launchpad.html')).pipe(res)}
if(pathname==='/studio.html'){res.writeHead(200,{'content-type':'text/html; charset=utf-8','cache-control':'no-store'});return fs.createReadStream(path.join(root,'studio.html')).pipe(res)}
if(pathname==='/controller'){res.writeHead(200,{'content-type':'text/html; charset=utf-8','cache-control':'no-store'});return fs.createReadStream(path.join(root,'controller.html')).pipe(res)}
// Explicit shipped-page allowlist: never expose persistence, source, or credentials.
if(pathname==='/three.module.js'){res.writeHead(200,{'content-type':'text/javascript; charset=utf-8'});return fs.createReadStream(path.join(root,'three.module.js')).pipe(res)}
const integratedPages94=new Set(["admin.html", "arena66.html", "broadcast64.html", "broadcast65.html", "claim-center.html", "club-seasons68.html", "club-standings87.html", "club-wars69.html", "club-wars73.html", "club-wars86.html", "clubs67.html", "collection-manager.html", "collector-seasons.html", "collectors-championship.html", "collectors-journal.html", "controller.html", "entitlements.html", "exhibition.html", "hangar.html", "highlights64.html", "index.html", "integrity.html", "launchpad.html", "lobby.html", "matchmaking.html", "pilot-career.html", "podium64.html", "relay-racing88.html", "relay-racing89.html", "relay-spectator91.html", "replay-audit.html", "season-leaderboard84.html", "season.html", "server-flight.html", "showcase.html", "spectator63.html", "spectator64.html", "studio.html", "team-championship71.html", "team-leaderboard83.html", "team-racing72.html", "team-racing73.html", "team-racing85.html", "team-racing86.html", "tournament.html", "tournament63.html", "trophies.html", "wallet.html", "workshop.html", "README_7_6.md"]);
if(integratedPages94.has(pathname.slice(1))){const file=path.join(root,pathname.slice(1));if(!fs.existsSync(file)){res.writeHead(404);return res.end('Not found')}res.writeHead(200,{'content-type':pathname.endsWith('.md')?'text/plain; charset=utf-8':'text/html; charset=utf-8','cache-control':'no-store'});return fs.createReadStream(file).pipe(res)}
if(pathname!=='/'&&pathname!=='/index.html'){res.writeHead(404);return res.end('Not found')}res.writeHead(200,{'content-type':'text/html; charset=utf-8','cache-control':'no-store'});fs.createReadStream(path.join(root,'index.html')).pipe(res)});
const wss=new WebSocketServer({noServer:true,maxPayload:2048});

// Ephemeral paired phone controller; no wallet credentials or blockchain signing.
const controllerPairs=new Map();
const controllerWss=new WebSocketServer({noServer:true,maxPayload:1024});
server.on('upgrade',(req,socket,head)=>{const route=new URL(req.url,'http://localhost').pathname;const target=route==='/ws'?wss:route==='/controller-ws'?controllerWss:null;if(!target){socket.destroy();return}target.handleUpgrade(req,socket,head,ws=>target.emit('connection',ws,req))});
function controllerSend(ws,msg){if(ws&&ws.readyState===1)ws.send(JSON.stringify(msg))}
controllerWss.on('connection',ws=>{let code=null,role=null;ws.on('message',raw=>{let m;try{m=JSON.parse(raw)}catch{return}if(!m||typeof m.type!=='string')return;
 if(m.type==='host'){if(code)return;code=crypto.randomBytes(4).toString('hex').toUpperCase();role='host';controllerPairs.set(code,{host:ws,phone:null});controllerSend(ws,{type:'pairCode',code});return}
 if(m.type==='pair'){if(code||role){controllerSend(ws,{type:'error',message:'Connection already assigned; reconnect to change pairing'});return}const c=String(m.code||'').trim().toUpperCase();const pair=controllerPairs.get(c);if(!pair||pair.phone){controllerSend(ws,{type:'error',message:'Invalid or occupied code'});return}code=c;role='phone';pair.phone=ws;controllerSend(ws,{type:'paired'});controllerSend(pair.host,{type:'paired'});return}
 const pair=controllerPairs.get(code);if(!pair)return;
 if(m.type==='control'&&role==='phone'&&pair.phone===ws){const allowed=['KeyW','KeyS','KeyA','KeyD','Space','ShiftLeft','KeyF','KeyE','ArrowUp','ArrowDown','ArrowLeft','ArrowRight'];const keys=Array.isArray(m.keys)?m.keys.filter(k=>allowed.includes(k)).slice(0,12):[];const axes={};for(const axis of ['throttle','yaw','pitch','roll']){const v=Number(m.axes?.[axis]);axes[axis]=Number.isFinite(v)?Math.max(-1,Math.min(1,v)):0}controllerSend(pair.host,{type:'control',keys,axes});return}
 if(m.type==='haptic'&&role==='host'&&pair.host===ws){controllerSend(pair.phone,{type:'haptic',pattern:['gate','hit','fire','win'].includes(m.pattern)?m.pattern:'gate'});return}
 });ws.on('close',()=>{const pair=controllerPairs.get(code);if(!pair)return;if(role==='host'&&pair.host===ws){controllerSend(pair.phone,{type:'error',message:'Game disconnected'});pair.phone?.close();controllerPairs.delete(code)}else if(role==='phone'&&pair.phone===ws){pair.phone=null;controllerSend(pair.host,{type:'control',keys:[]});controllerSend(pair.host,{type:'unpaired'})}})});

// Alpha 5.2: persistent, provisional exhibition progression (NOT official competitive ratings).
const pilot52File=path.join(root,'pilot52_progress.json');
let pilot52={};try{const v=JSON.parse(fs.readFileSync(pilot52File,'utf8'));if(v&&typeof v==='object'&&!Array.isArray(v))pilot52=v}catch{}
// Alpha 5.4: cosmetic-only presets. These are NOT separately minted NFTs.
const workshop54Options={frame:['classic','racer','guardian'],props:['standard','tri-blade','halo'],lights:['pulse','solid','strobe','off'],trail:['ion','comet','sparks','off'],showcase:['midnight','sunset','cyber']};
const workshop54Default={frame:'classic',props:'standard',lights:'pulse',trail:'ion',showcase:'midnight'};
function workshop54Validate(value){if(!value||typeof value!=='object'||Array.isArray(value))throw Error('Invalid loadout');const o={};for(const [key,choices] of Object.entries(workshop54Options)){if(typeof value[key]!=='string'||!choices.includes(value[key]))throw Error('Invalid '+key+' option');o[key]=value[key]}return o}
function workshop54Sanitize(value){try{return workshop54Validate(value)}catch{return {...workshop54Default}}}
const pilot53Themes={neon:{paint:'#4fffe0',glow:'#66fff1',trail:'#37e6ff',label:'Neon Pulse'},storm:{paint:'#a47aff',glow:'#c5a5ff',trail:'#8b71ff',label:'Storm Surge'},vanguard:{paint:'#ffd15b',glow:'#fff0b3',trail:'#ffab3b',label:'Vanguard Gold'},legacy:{paint:'#ff6885',glow:'#ffb1c1',trail:'#ff527a',label:'Legacy Crimson'}};
function pilot53Visual(asset){const theme=pilot53Themes[asset.theme]?asset.theme:'legacy';return {assetId:String(asset.asset),collection:String(asset.collection).slice(0,24),theme,...pilot53Themes[theme],verifiedAt:asset.checkedAt,cosmeticOnly:true}}
async function pilot53Equip(p){p.rankedCosmetic=null;const linked=pilot52Get(p.rankedAccount).cosmetic;if(!linked)return;try{const result=await lookupEligible(p.rankedAccount,linked.assetId);if(result.eligible)p.rankedCosmetic=pilot53Visual(result)}catch{/* fail closed: no verified cosmetic */}}
function pilot52Save(){const t=pilot52File+'.tmp';fs.writeFileSync(t,JSON.stringify(pilot52));fs.renameSync(t,pilot52File)}
function pilot52Get(account){if(!pilot52[account])pilot52[account]={account,xp:0,rating:1000,races:0,wins:0,finishes:0,cosmetic:null,history:[]};return pilot52[account]}
function pilot52Division(r){return r>=1500?'Ace':r>=1300?'Diamond':r>=1150?'Gold':r>=1000?'Silver':'Bronze'}
function pilot52Public(account){const p=pilot52Get(account);return {workshop:workshop54Sanitize(p.workshop54),account:p.account,xp:p.xp,level:Math.floor(Math.sqrt(p.xp/100))+1,rating:p.rating,division:pilot52Division(p.rating),races:p.races,wins:p.wins,finishes:p.finishes,cosmetic:p.cosmetic,history:p.history.slice(-12),provisional:true,prizeEligible:false}}
function pilot52Result(result){if(result.reason!=='completed'&&result.reason!=='timeout')return;const a=result.results.filter(x=>x?.account);if(a.length!==2)return;
 const pre=a.map(x=>pilot52Get(x.account).rating);for(let i=0;i<2;i++){const row=a[i],other=a[1-i],p=pilot52Get(row.account),win=result.winner===row.account,draw=!result.winner;
 const score=draw?.5:win?1:0,expected=1/(1+Math.pow(10,(pre[1-i]-pre[i])/400));
 p.rating=Math.max(100,Math.min(2500,Math.round(pre[i]+16*(score-expected))));p.races++;if(win)p.wins++;if(row.status==='finished')p.finishes++;
 const earned=20+(row.status==='finished'?30:0)+(win?25:0);p.xp+=earned;
 p.history.push({matchId:result.id,stage:result.stage,at:result.completedAt,outcome:win?'win':draw?'draw':'loss',xp:earned,rating:p.rating});p.history=p.history.slice(-30);
 }try{pilot52Save()}catch(e){console.error('Progress save failed',e.message)}
}
// Alpha 5.0: server-simulated, two-pilot real-time exhibition races.
// Commands contain controls only; position, gates and elapsed time are server-computed.
const rankedQueue=[];const rankedMatches=new Map();const rankedRatings=new Map();const rankedRematches=new Map();
const rankedHistoryFile=path.join(root,'ranked50_exhibition.json');
let rankedHistory=[];try{const x=JSON.parse(fs.readFileSync(rankedHistoryFile,'utf8'));if(Array.isArray(x))rankedHistory=x.slice(-500)}catch{}
// Alpha 7.0: fixtures are bound to the server-side matchmaking queue.
function club70Eligible(f,account){return f&&f.status==='accepted'&&Date.now()>=Date.parse(f.startsAt)&&Date.now()<Date.parse(f.startsAt)+86400000&&f.races.length<3&&[f.homePilot,f.awayPilot].includes(account)&&clubs67.membership[account]===(account===f.homePilot?f.home:f.away)}
function club70Record(match,result){if(!match.club70Fixture)return;const f=club69.find(x=>x.id===match.club70Fixture);if(!f||f.mode73==='2v2'||f.status!=='accepted'||f.races.some(x=>x.raceId===result.id)||!result.winner||!['completed','timeout'].includes(result.reason))return;if(![f.homePilot,f.awayPilot].every(a=>result.results.some(r=>r.account===a)))return;const club=result.winner===f.homePilot?f.home:result.winner===f.awayPilot?f.away:null;if(!club)return;f.races.push({raceId:result.id,winner:result.winner,club,completedAt:result.completedAt,automatic:true});f.scores[club]=(f.scores[club]||0)+1;f.winner=club69Winner(f);if(f.winner)f.status='completed';try{club69Save()}catch(e){console.error('Club Wars save failed',e.message)}}
function rankedSave(){const t=rankedHistoryFile+'.tmp';fs.writeFileSync(t,JSON.stringify(rankedHistory));fs.renameSync(t,rankedHistoryFile)}
function rankedSend(p,msg){if(p?.ws?.readyState===1)p.ws.send(JSON.stringify(msg))}
function rankedState(p){const r=p.rankedFlight;return r?{workshop:workshop54Sanitize(pilot52Get(p.rankedAccount).workshop54),account:p.rankedAccount,position:r.p,heading:r.heading,speed:r.speed,gate:r.gate,elapsed:+(r.ticks*SIM40_DT).toFixed(2),status:r.status,cosmetic:p.rankedCosmetic||null}:null}
function rankedClose(match,reason){if(match.done)return;match.done=true;const rows=match.pilots.map(p=>rankedState(p));const finished=rows.filter(x=>x?.status==='finished').sort((a,b)=>a.elapsed-b.elapsed);const winner=finished[0]?.account||null;
 const result={id:match.id,stage:match.stage,completedAt:new Date().toISOString(),reason,winner,results:rows,prizeEligible:false,verified:false,validation:'server_simulated_exhibition'};
 rankedHistory.push(result);rankedHistory=rankedHistory.slice(-500);pilot52Result(result);tournament62Record(match,result);club70Record(match,result);try{rankedSave()}catch(e){console.error('Ranked save failed',e.message)}
 for(const p of match.pilots){rankedSend(p,{type:'rankedResult',...result});p.rankedMatch=null;p.rankedFlight=null}
 rankedMatches.delete(match.id);
 if(reason==='completed'||reason==='timeout'){rankedRematches.set(match.id,{pilots:match.pilots.map(p=>({account:p.rankedAccount,stage:match.stage,pilot:p})),votes:new Set(),expires:Date.now()+90000});for(const p of match.pilots)rankedSend(p,{type:'rankedRematchOffer',matchId:match.id,expiresIn:90})}
}
function rankedDrop(p){const i=rankedQueue.indexOf(p);if(i>=0)rankedQueue.splice(i,1);if(p.rankedMatch){const match=rankedMatches.get(p.rankedMatch);if(match&&!match.done){for(const other of match.pilots)if(other!==p)rankedSend(other,{type:'rankedCancelled',reason:'Opponent disconnected'});rankedClose(match,'disconnect')}p.rankedMatch=null}p.rankedFlight=null}
async function rankedPair(){for(let i=0;i<rankedQueue.length;i++){const a=rankedQueue[i];if(a.ws.readyState!==1){rankedQueue.splice(i--,1);continue}const j=rankedQueue.findIndex((b,k)=>k>i&&b.ws.readyState===1&&b.rankedStage===a.rankedStage&&b.rankedAccount!==a.rankedAccount&&(a.club70Fixture? a.club70Fixture===b.club70Fixture && a.rankedAccount!==b.rankedAccount : !b.club70Fixture&&(!a.tournament62Pair&&!b.tournament62Pair||a.tournament62Pair&&a.tournament62Pair===b.tournament62Pair)));if(j<0)continue;const b=rankedQueue.splice(j,1)[0];rankedQueue.splice(i,1);const id=crypto.randomUUID(),startAt=Date.now()+7000;const match={id,pilots:[a,b],stage:a.rankedStage,startAt,done:false,deadline:startAt+(TEAM80_TEST_RACE_MS||180000),lastTick:startAt,tournament62Pair:a.tournament62Pair||null,club70Fixture:a.club70Fixture||null};rankedMatches.set(id,match);await Promise.all(match.pilots.map(pilot53Equip));
 for(const pilot of match.pilots){pilot.rankedMatch=id;pilot.rankedControls={throttle:0,turn:0,lift:0};pilot.rankedFlight={id:crypto.randomUUID(),account:pilot.rankedAccount,stage:match.stage,p:{x:0,y:7,z:12},heading:0,speed:0,gate:0,ticks:0,status:'flying',replay:[],controlsLog:[]};rankedSend(pilot,{type:'rankedMatch',id,tournament62Pair:match.tournament62Pair,club70Fixture:match.club70Fixture,stage:match.stage,startAt,opponent:match.pilots.find(x=>x!==pilot).rankedAccount,mode:'server_simulated_exhibition',verified:false,cosmetic:pilot.rankedCosmetic,opponentCosmetic:match.pilots.find(x=>x!==pilot).rankedCosmetic,course:sim40Gates})}return rankedPair()}}
setInterval(()=>{const now=Date.now();for(const match of rankedMatches.values()){if(match.done||now<match.startAt)continue;
 const steps=Math.min(5,Math.floor((Math.min(now,match.deadline)-match.lastTick)/(SIM40_DT*1000)));
 for(let i=0;i<steps;i++){for(const p of match.pilots)if(p.rankedFlight?.status==='flying')sim40Advance(p.rankedFlight,p.rankedControls);match.lastTick+=SIM40_DT*1000}
 if(steps>0)for(const p of match.pilots)rankedSend(p,{type:'rankedState',matchId:match.id,serverAt:now,pilots:match.pilots.map(rankedState)});
 if(now>=match.deadline||match.pilots.every(p=>p.rankedFlight?.status!=='flying'))rankedClose(match,now>=match.deadline?'timeout':'completed');
 }},50).unref();
// Alpha 7.2 — independent server-authoritative simultaneous 2v2 exhibition races.
const team72Queue=[];const team72Matches=new Map();
const team75HistoryFile=path.join(root,'team75_history.json');
let team72History=[];try{const h=JSON.parse(fs.readFileSync(team75HistoryFile,'utf8'));if(Array.isArray(h))team72History=h.slice(-100)}catch{}
const season84File=path.join(root,'season84_results.json');
let season84Records=[];try{const saved=JSON.parse(fs.readFileSync(season84File,'utf8'));if(Array.isArray(saved))season84Records=saved.filter(season84.eligible).slice(-10000)}catch{}
// Bootstrap from existing bounded history on first upgrade, without duplicate race IDs.
for(const race of team72History)season84.add(season84Records,race);
function season84Save(){const tmp=season84File+'.tmp';fs.writeFileSync(tmp,JSON.stringify(season84Records));fs.renameSync(tmp,season84File)}
function team75SaveHistory(){const tmp=team75HistoryFile+'.tmp';fs.writeFileSync(tmp,JSON.stringify(team72History.slice(-100)));fs.renameSync(tmp,team75HistoryFile)}
// Alpha 7.6: crash-safe match journal. A restarted process cannot authenticate old sockets,
// so unfinished races are recorded as interrupted (never awarded) instead of resumed.
const team76JournalFile=path.join(root,'team76_active.json');
const team76InterruptedFile=path.join(root,'team76_interrupted.json');
let team76Interrupted=[];try{const h=JSON.parse(fs.readFileSync(team76InterruptedFile,'utf8'));if(Array.isArray(h))team76Interrupted=h.slice(-100)}catch{}
function team76Atomic(file,value){const tmp=file+'.tmp';fs.writeFileSync(tmp,JSON.stringify(value));fs.renameSync(tmp,file)}
try{const previous=JSON.parse(fs.readFileSync(team76JournalFile,'utf8'));if(Array.isArray(previous)&&previous.length){for(const m of previous){team76Interrupted.push({id:m.id,fixture73:m.fixture73||null,accounts:m.accounts||[],reason:'server_restart',at:new Date().toISOString(),prizeEligible:false});}team76Interrupted=team76Interrupted.slice(-100);team76Atomic(team76InterruptedFile,team76Interrupted)}}catch{}
team76Atomic(team76JournalFile,[]);
function team76Journal(){team76Atomic(team76JournalFile,[...team72Matches.values()].filter(m=>!m.done).map(m=>({id:m.id,fixture73:m.fixture73||null,accounts:m.pilots.map(p=>p.team72Account),startAt:m.startAt,deadline:m.deadline})));}
function team75PublicState(m){return {id:m.id,fixture73:m.fixture73||null,startAt:m.startAt,deadline:m.deadline,serverAt:Date.now(),pilots:m.pilots.map(team72State),disconnected:[...m.disconnected.keys()],reconnectGraceMs:TEAM74_GRACE_MS}}

function team72Send(p,o){if(p.ws.readyState===1)p.ws.send(JSON.stringify(o))}
function team72State(p){const r=p.team72Flight;return r?{account:p.team72Account,team:p.team72Side,position:r.p,heading:r.heading,speed:r.speed,gate:r.gate,elapsed:+(r.ticks*SIM40_DT).toFixed(2),status:r.status}:null}
const TEAM74_GRACE_MS=15000;
// Alpha 7.7: connection close/error events must not restart the grace timer.
function team72Drop(p){
 const i=team72Queue.indexOf(p);if(i>=0)team72Queue.splice(i,1);
 if(p.team72Match){const m=team72Matches.get(p.team72Match);
  if(m&&!m.done){if(!m.pilots.includes(p))return;if(!m.disconnected.has(p.team72Account))m.disconnected.set(p.team72Account,Date.now());p.team72Controls={throttle:0,turn:0,lift:0};team72Send(p,{type:'team72Left',graceMs:TEAM74_GRACE_MS});return}
 }
 p.team72Match=null;p.team72Flight=null;
}
function team74Resume(fresh,session,token){
 for(const m of team72Matches.values()){
  if(m.done)continue;const idx=m.pilots.findIndex(q=>q.team72Account===session.account);
  if(idx<0)continue;
  const old=m.pilots[idx];if(old.ws.readyState===1&&!m.disconnected.has(session.account))return {error:'This wallet is already active in a race'};
  if(!m.disconnected.has(session.account)||Date.now()-m.disconnected.get(session.account)>TEAM74_GRACE_MS)return {error:'Reconnect window expired'};
  for(const k of ['team72Account','team72Side','team72Match','team72Flight','team73Fixture','team85Mode'])fresh[k]=old[k];
  fresh.team72Token=token;fresh.team76LastSeq=-1;fresh.team76LastControlAt=Date.now();fresh.team72Controls={throttle:0,turn:0,lift:0};m.pilots[idx]=fresh;m.disconnected.delete(session.account);
  old.team72Match=null;old.team72Flight=null;
  team72Send(fresh,{type:'team72Resumed',id:m.id,fixture73:m.fixture73||null,team:fresh.team72Side,startAt:m.startAt,pilots:m.pilots.map(team72State),graceMs:TEAM74_GRACE_MS,serverAt:Date.now(),deadline:m.deadline});return {resumed:true};
 }
 return null;
}
function team72Close(m,reason){if(m.done)return;m.done=true;const rows=m.pilots.map(team72State);const points={red:0,blue:0};for(const row of rows){if(!row)continue;points[row.team]+=(row.status==='finished'?100:0)+Math.max(0,row.gate)*10+Math.max(0,180-row.elapsed)*.01}
 if(m.relay88){for(const side of ['red','blue'])points[side]=m.relay88.completed[side]*1000+m.pilots.filter(p=>p.team72Side===side).reduce((sum,p)=>sum+(p.team72Flight?.gate||0)*10,0)}const winner=points.red===points.blue?null:points.red>points.blue?'red':'blue';const result={type:'team72Result',id:m.id,reason,rows,points,winner,verified:false,prizeEligible:false,relay88:m.relay88?{completed:m.relay88.completed,handoffs:m.relay88.handoffs}:null,mode:m.relay88?(m.fixture73?'server_simulated_relay_club_fixture':'server_simulated_relay_exhibition'):m.fixture73?'server_simulated_club_fixture':m.mode85==='4v4'?'server_simulated_4v4_exhibition':'server_simulated_exhibition',mode85:m.mode85||'2v2',at:new Date().toISOString()};if(m.fixture73){const f=club69.find(x=>x.id===m.fixture73);if(f&&racePolicy77.canAwardFixture(f,m.id,reason,winner)&&((f.mode73==='relay4v4'&&m.mode85==='relay4v4'&&relayIntegrity92.relayEligible(m,reason))||(f.mode73==='4v4'&&m.mode85==='4v4'&&rows.length===8)||(f.mode73==='2v2'&&m.mode85!=='4v4'&&rows.length===4))){const club=winner==='red'?f.home:f.away;f.races.push({raceId:m.id,club,winner:rows.filter(r=>r.team===winner).map(r=>r.account).join(','),completedAt:result.at,automatic:true,mode:f.mode73,points});f.scores[club]=(f.scores[club]||0)+1;f.winner=club69Winner(f);if(f.winner)f.status='completed';club69Save();result.fixture73=f.id;result.fixtureScores=f.scores;result.fixtureWinner=f.winner}}team72History.push(result);if(team72History.length>100)team72History.shift();team75SaveHistory();if(season84.add(season84Records,result))try{season84Save()}catch(e){console.error('Season archive write failed:',e.message)}for(const p of m.pilots){team72Send(p,result);p.team72Match=null;p.team72Flight=null}team72Matches.delete(m.id);team76Journal()}
function team72Pair(){while(team72Queue.filter(p=>!p.team73Fixture&&p.team85Mode!=='4v4').length>=4){const selected=[];const seen=new Set();for(let i=0;i<team72Queue.length&&selected.length<4;i++){const p=team72Queue[i];if(p.team73Fixture||p.team85Mode!=='2v2'||p.ws.readyState!==1||seen.has(p.team72Account))continue;selected.push(p);seen.add(p.team72Account)}if(selected.length<4)break;if(selected.some(p=>p.team73Fixture))break;for(const p of selected)team72Queue.splice(team72Queue.indexOf(p),1);const id=crypto.randomUUID(),startAt=Date.now()+7000;const m={id,pilots:selected,startAt,deadline:startAt+(TEAM80_TEST_RACE_MS||180000),lastTick:startAt,done:false,disconnected:new Map()};team72Matches.set(id,m);team76Journal();selected.forEach((p,i)=>{p.team72Match=id;p.team72Side=i%2===0?'red':'blue';p.team72Controls={throttle:0,turn:0,lift:0};p.team76LastSeq=-1;p.team76LastControlAt=Date.now();p.team72Flight={id:crypto.randomUUID(),account:p.team72Account,stage:1,p:{x:(i-1.5)*3,y:7,z:12},heading:0,speed:0,gate:0,ticks:0,status:'flying',replay:[],controlsLog:[]};team72Send(p,{type:'team72Match',id,startAt,team:p.team72Side,pilots:selected.map((q,j)=>({account:q.team72Account,team:j%2===0?'red':'blue'})),course:sim40Gates,verified:false})})}}
function team85Pair(mode='4v4'){while(team72Queue.filter(p=>p.team85Mode===mode&&!p.team73Fixture).length>=8){const selected=[],seen=new Set();for(const p of team72Queue){if(p.team85Mode!==mode||p.team73Fixture||p.ws.readyState!==1||seen.has(p.team72Account))continue;selected.push(p);seen.add(p.team72Account);if(selected.length===8)break}if(selected.length<8)break;for(const p of selected)team72Queue.splice(team72Queue.indexOf(p),1);const id=crypto.randomUUID(),startAt=Date.now()+7000;const m={id,mode85:mode,pilots:selected,startAt,deadline:startAt+(TEAM80_TEST_RACE_MS||180000),lastTick:startAt,done:false,disconnected:new Map(),relay88:mode==='relay4v4'?{gatesPerLeg:2,active:{red:0,blue:0},completed:{red:0,blue:0},handoffs:[]}:null};team72Matches.set(id,m);team76Journal();selected.forEach((p,i)=>{p.team72Match=id;p.team72Side=i<4?'red':'blue';p.team72Controls={throttle:0,turn:0,lift:0};p.team76LastSeq=-1;p.team76LastControlAt=Date.now();p.team72Flight={id:crypto.randomUUID(),account:p.team72Account,stage:1,p:{x:(i-3.5)*2,y:7,z:12},heading:0,speed:0,gate:0,ticks:0,status:'flying',replay:[],controlsLog:[]};team72Send(p,{type:'team72Match',mode85:mode,relay88:!!m.relay88,id,startAt,team:p.team72Side,pilots:selected.map((q,j)=>({account:q.team72Account,team:j<4?'red':'blue'})),course:sim40Gates,verified:false})})}}
function team73Pair(f){if(!f||f.mode73!=='2v2'||f.status!=='accepted'||!f.ready73||Date.now()<Date.parse(f.startsAt)||[...team72Matches.values()].some(m=>m.fixture73===f.id))return;const lineup=[...f.lineups73[f.home],...f.lineups73[f.away]];const chosen=lineup.map(a=>team72Queue.find(p=>p.team73Fixture===f.id&&p.team72Account===a&&p.ws.readyState===1));if(chosen.some(p=>!p))return;for(const p of chosen)team72Queue.splice(team72Queue.indexOf(p),1);const id=crypto.randomUUID(),startAt=Date.now()+7000;const m={id,pilots:chosen,fixture73:f.id,startAt,deadline:startAt+(TEAM80_TEST_RACE_MS||180000),lastTick:startAt,done:false,disconnected:new Map()};team72Matches.set(id,m);team76Journal();chosen.forEach((p,i)=>{p.team72Match=id;p.team72Side=i<2?'red':'blue';p.team72Controls={throttle:0,turn:0,lift:0};p.team76LastSeq=-1;p.team76LastControlAt=Date.now();p.team72Flight={id:crypto.randomUUID(),account:p.team72Account,stage:1,p:{x:(i-1.5)*3,y:7,z:12},heading:0,speed:0,gate:0,ticks:0,status:'flying',replay:[],controlsLog:[]};team72Send(p,{type:'team72Match',id,startAt,fixture73:f.id,team:p.team72Side,pilots:chosen.map((q,j)=>({account:q.team72Account,team:j<2?'red':'blue'})),course:sim40Gates,verified:false})})}
function team86Pair(f){
 if(!f||!['4v4','relay4v4'].includes(f.mode73)||f.status!=='accepted'||!f.ready73||Date.now()<Date.parse(f.startsAt)||f.winner||[...team72Matches.values()].some(m=>m.fixture73===f.id))return;
 const home=f.lineups73?.[f.home],away=f.lineups73?.[f.away];if(!Array.isArray(home)||!Array.isArray(away)||home.length!==4||away.length!==4||new Set([...home,...away]).size!==8)return;
 const chosen=[...home,...away].map(a=>team72Queue.find(p=>p.team73Fixture===f.id&&p.team85Mode===f.mode73&&p.team72Account===a&&p.ws.readyState===1));if(chosen.some(p=>!p))return;
 for(const p of chosen)team72Queue.splice(team72Queue.indexOf(p),1);
 const id=crypto.randomUUID(),startAt=Date.now()+7000;
 const isRelay=f.mode73==='relay4v4';const m={id,mode85:f.mode73,fixture73:f.id,pilots:chosen,startAt,deadline:startAt+(TEAM80_TEST_RACE_MS||180000),lastTick:startAt,done:false,disconnected:new Map(),relay88:isRelay?{gatesPerLeg:2,active:{red:0,blue:0},completed:{red:0,blue:0},handoffs:[]}:null};team72Matches.set(id,m);team76Journal();
 chosen.forEach((p,i)=>{p.team72Match=id;p.team72Side=i<4?'red':'blue';p.team72Controls={throttle:0,turn:0,lift:0};p.team76LastSeq=-1;p.team76LastControlAt=Date.now();p.team72Flight={id:crypto.randomUUID(),account:p.team72Account,stage:1,p:{x:(i-3.5)*2,y:7,z:12},heading:0,speed:0,gate:0,ticks:0,status:'flying',replay:[],controlsLog:[]};team72Send(p,{type:'team72Match',mode85:f.mode73,relay88:!!m.relay88,id,startAt,fixture73:f.id,team:p.team72Side,pilots:chosen.map((q,j)=>({account:q.team72Account,team:j<4?'red':'blue'})),course:sim40Gates,verified:false})});
}
setInterval(()=>{const now=Date.now();for(const m of team72Matches.values()){if(m.done)continue;if([...m.disconnected.values()].some(at=>now-at>=TEAM74_GRACE_MS)){team72Close(m,'disconnect');continue}if(now<m.startAt)continue;const steps=Math.min(5,Math.floor((Math.min(now,m.deadline)-m.lastTick)/(SIM40_DT*1000)));for(let i=0;i<steps;i++){for(const p of m.pilots)if(p.team72Flight?.status==='flying'&&!m.disconnected.has(p.team72Account)&&(!m.relay88||m.pilots.indexOf(p)===(p.team72Side==='red'?0:4)+m.relay88.active[p.team72Side]))sim40Advance(p.team72Flight,(now-(p.team76LastControlAt||0)>750)?{throttle:0,turn:0,lift:0}:p.team72Controls);m.lastTick+=SIM40_DT*1000}if(m.relay88){for(const side of ['red','blue']){while(m.relay88.active[side]<4){const leg=m.relay88.active[side],pilot=m.pilots[(side==='red'?0:4)+leg];if(!pilot||pilot.team72Flight.gate<m.relay88.gatesPerLeg)break;m.relay88.active[side]++;m.relay88.completed[side]++;const event={type:'relay88Handoff',id:m.id,team:side,from:pilot.team72Account,to:m.relay88.active[side]<4?m.pilots[(side==='red'?0:4)+m.relay88.active[side]].team72Account:null,leg:m.relay88.active[side],at:now,trigger:'checkpoint'};m.relay88.handoffs.push(event);for(const q of m.pilots)team72Send(q,event)}}if(m.relay88.completed.red===4&&m.relay88.completed.blue===4){team72Close(m,'completed');continue}}if(steps>0){const msg={type:'team72State',id:m.id,serverAt:now,pilots:m.pilots.map(team72State)};for(const p of m.pilots)team72Send(p,msg)}if(now>=m.deadline||(!m.relay88&&m.pilots.every(p=>p.team72Flight?.status!=='flying')))team72Close(m,now>=m.deadline?'timeout':'completed')}},50).unref();
const send=(ws,obj)=>{if(ws.readyState===1)ws.send(JSON.stringify(obj))};
const broadcast=(room,obj,except)=>{for(const p of room.pilots.values())if(p.ws!==except)send(p.ws,obj)};
function roster(room){broadcast(room,{type:'roster',pilots:[...room.pilots.values()].map(p=>({id:p.id,name:p.name,paint:p.nftPaint||p.paint||'00edcf',frameStyle:p.frameStyle||'x',team:p.team,nftVerified:!!p.nftAsset,nftAsset:p.nftAsset||null,nftTheme:p.nftTheme||null}))})}
function combatBoard(room){broadcast(room,{type:'combatScore',mode:room.mode,teamScores:room.teamScores,flag:room.flag,items:[...room.pilots.values()].map(p=>({id:p.id,name:p.name,kills:p.kills||0,deaths:p.deaths||0,hp:p.hp??100})).sort((a,b)=>b.kills-a.kills)})}
function leaders(room){broadcast(room,{type:'leaders',items:boardFor(room.course)})}
function leave(p){if(!p.room)return;const r=rooms.get(p.room);if(r){if(r.flag?.carrier===p.id){r.flag={carrier:null,at:'base'}}r.pilots.delete(p.id);roster(r);combatBoard(r);if(!r.pilots.size)rooms.delete(p.room)}p.room=null}
wss.on('connection',ws=>{const p={id:crypto.randomUUID(),ws,name:'Pilot',room:null,last:0,raceStarted:0,lastFinish:0,profileId:null,hp:100,kills:0,deaths:0,lastShot:0,position:null,spawnShield:0};ws.on('message',async raw=>{let m;try{m=JSON.parse(raw)}catch{return}if(!m||typeof m.type!=='string')return;
if(m.type==='team72Join'){if(p.rankedMatch||rankedQueue.includes(p))return team72Send(p,{type:'team72Error',message:'Leave ranked racing before joining team racing'});const session=sessionByToken(m.token);if(!session)return team72Send(p,{type:'team72Error',message:'Verified wallet required'});if(p.team72Match)return team72Send(p,{type:'team72Error',message:'Already racing'});const resumed=team74Resume(p,session,m.token);if(resumed)return resumed.error?team72Send(p,{type:'team72Error',message:resumed.error}):undefined;team72Drop(p);rankedDrop(p);if([...team72Queue,...[...team72Matches.values()].flatMap(x=>x.pilots)].some(q=>q!==p&&q.team72Account===session.account))return team72Send(p,{type:'team72Error',message:'Wallet already racing or queued'});p.team72Account=session.account;p.team72Token=m.token;p.team73Fixture=null;p.team85Mode=['4v4','relay4v4'].includes(m.mode85)?m.mode85:'2v2';if(m.fixture73){const f=club69.find(x=>x.id===String(m.fixture73));if(!f||f.status!=='accepted'||!f.ready73||f.winner||Date.now()<Date.parse(f.startsAt)||!Array.isArray(f.lineups73?.[f.home])||!Array.isArray(f.lineups73?.[f.away])||![...f.lineups73[f.home],...f.lineups73[f.away]].includes(session.account)||f.mode73!==p.team85Mode)return team72Send(p,{type:'team72Error',message:'Not eligible for this ready, scheduled team fixture'});p.team73Fixture=f.id;}team72Queue.push(p);team72Send(p,{type:'team72Queued',position:team72Queue.length,needed:Math.max(0,(p.team85Mode!=='2v2'?8:4)-team72Queue.filter(q=>q.team73Fixture===p.team73Fixture&&q.team85Mode===p.team85Mode).length),fixture73:p.team73Fixture,mode85:p.team85Mode});if(p.team73Fixture){const fixture=club69.find(f=>f.id===p.team73Fixture);if(['4v4','relay4v4'].includes(fixture?.mode73))team86Pair(fixture);else team73Pair(fixture);}else if(p.team85Mode!=='2v2')team85Pair(p.team85Mode);else team72Pair();return}
if(m.type==='team72Cancel'){if(p.team72Match)return team72Send(p,{type:'team72Error',message:'Cannot cancel an active race'});team72Drop(p);team72Send(p,{type:'team72Cancelled'});return}
if(m.type==='team78Diagnostics'){return team72Send(p,{type:'team78Diagnostics',serverAt:Date.now(),queued:team72Queue.length,active:team72Matches.size,reconnectGraceMs:TEAM74_GRACE_MS})}
if(m.type==='team76Ping'){return team72Send(p,{type:'team76Pong',nonce:typeof m.nonce==='string'?m.nonce.slice(0,64):'',serverAt:Date.now()})}
if(m.type==='team72Control'){const match=team72Matches.get(p.team72Match);if(!match||match.done||!p.team72Flight||match.disconnected.has(p.team72Account))return;const controlSession=sessionByToken(p.team72Token);if(!controlSession||controlSession.account!==p.team72Account)return;const c=m.controls||{};if(!racePolicy77.validControls(c,m.seq,p.team76LastSeq??-1))return;if(m.seq!==undefined)p.team76LastSeq=m.seq;p.team76LastControlAt=Date.now();p.team72Controls={throttle:c.throttle,turn:c.turn,lift:c.lift};return}
if(m.type==='rankedQueue'){if(p.team72Match||team72Queue.includes(p))return rankedSend(p,{type:'rankedError',message:'Leave team racing before joining ranked'});rankedDrop(p);const session=sessionByToken(m.token);if(!session)return rankedSend(p,{type:'rankedError',message:'Authenticate WAX wallet first'});const stage=Number(m.stage);if(![1,2,3].includes(stage))return rankedSend(p,{type:'rankedError',message:'Invalid stage'});p.rankedAccount=session.account;p.rankedStage=stage;p.rankedToken=m.token;p.tournament62Pair=null;p.club70Fixture=null;if(m.clubFixtureId){const f=club69.find(x=>x.id===String(m.clubFixtureId));if(!club70Eligible(f,session.account))return rankedSend(p,{type:'rankedError',message:'Not eligible for this active Club Wars fixture'});if(rankedQueue.some(q=>q.club70Fixture===f.id&&q.rankedAccount===session.account))return rankedSend(p,{type:'rankedError',message:'Already queued'});p.club70Fixture=f.id;}if(m.tournamentId){if(m.tournamentId!==tournament62.id)return rankedSend(p,{type:'rankedError',message:'Unknown tournament'});const bracket=tournament62PairFor(session.account);if(!bracket)return rankedSend(p,{type:'rankedError',message:'No active bracket pairing for your wallet'});p.tournament62Pair=bracket.id;}rankedQueue.push(p);rankedSend(p,{type:'rankedQueued',stage,tournament62Pair:p.tournament62Pair,club70Fixture:p.club70Fixture,rating:pilot52Get(p.rankedAccount).rating,division:pilot52Division(pilot52Get(p.rankedAccount).rating)});rankedPair().catch(e=>console.error('Match pairing error',e.message));return}
if(m.type==='rankedRematch'){const session=sessionByToken(m.token);if(!session)return rankedSend(p,{type:'rankedError',message:'Wallet session expired'});const r=rankedRematches.get(String(m.matchId||''));if(!r||r.expires<Date.now())return rankedSend(p,{type:'rankedError',message:'Rematch offer expired'});if(!r.pilots.some(x=>x.account===session.account&&x.pilot===p))return rankedSend(p,{type:'rankedError',message:'Not a participant'});r.votes.add(session.account);rankedSend(p,{type:'rankedRematchWaiting',votes:r.votes.size});if(r.votes.size===2){rankedRematches.delete(String(m.matchId));for(const entry of r.pilots){const pilot=entry.pilot?.ws?.readyState===1?entry.pilot:null;if(pilot){rankedDrop(pilot);pilot.rankedStage=entry.stage;pilot.rankedToken=pilot.rankedToken||m.token;pilot.tournament62Pair=null;rankedQueue.push(pilot);rankedSend(pilot,{type:'rankedQueued',stage:entry.stage,rematch:true})}}rankedPair().catch(e=>console.error('Rematch pairing error',e.message))}return}
if(m.type==='rankedCancel'){rankedDrop(p);rankedSend(p,{type:'rankedCancelled',reason:'Cancelled'});return}
if(m.type==='rankedControl'){const match=rankedMatches.get(p.rankedMatch);if(!match||match.done||!p.rankedFlight)return;const sess=sessionByToken(p.rankedToken);if(!sess||sess.account!==p.rankedAccount)return rankedSend(p,{type:'rankedError',message:'Session expired'});const c=m.controls||{};if(!['throttle','turn','lift'].every(k=>typeof c[k]==='number'&&Number.isFinite(c[k])&&Math.abs(c[k])<=1))return rankedSend(p,{type:'rankedError',message:'Invalid controls'});p.rankedControls={throttle:c.throttle,turn:c.turn,lift:c.lift};return}
if(m.type==='rankedFinish')return rankedSend(p,{type:'rankedError',message:'Manual finish submission disabled. Fly through all eight gates.'});
if(m.type==='join'){leave(p);p.profileId=null;const profile=profiles[String(m.profileId||'')];if(profile&&typeof m.guestToken==='string'&&m.guestToken.length===64){const hash=crypto.createHash('sha256').update(m.guestToken).digest('hex');if(crypto.timingSafeEqual(Buffer.from(hash),Buffer.from(profile.tokenHash)))p.profileId=String(m.profileId)}
const requestedPremium=!!m.premium;const requestedMode=String(m.mode||'');if(requestedPremium){if(!['combat','tdm','ctf'].includes(requestedMode))return send(ws,{type:'error',message:'Premium rooms require a combat mode'});const sess=sessionByToken(m.token);if(!sess)return send(ws,{type:'error',message:'Premium arena requires verified wallet login'});let eligible;try{eligible=await lookupEligible(sess.account,String(m.premiumAsset||''))}catch{return send(ws,{type:'error',message:'NFT ownership verification unavailable — premium entry denied'})}if(!eligible.eligible)return send(ws,{type:'error',message:'Approved combat pass NFT required'});p.premiumAccount=sess.account;p.premiumAsset=eligible.asset;p.premiumSessionToken=m.token;p.premiumChecked=Date.now()}else{p.premiumAccount=null;p.premiumAsset=null;p.premiumSessionToken=null;}const roomBase=String(m.room||'public').replace(/[^a-zA-Z0-9_-]/g,'').slice(0,18)||'public';const room=(requestedPremium?'premium_':'free_')+roomBase;p.nftAsset=null;p.nftPaint=null;p.nftAccount=null;p.nftTheme=null;p.name=String(m.name||'Pilot').replace(/[<>]/g,'').slice(0,20);p.room=room;p.raceStarted=0;const course=cleanCourse(m.course),mode=['combat','tdm','ctf'].includes(m.mode)?m.mode:'race';if(!rooms.has(room))rooms.set(room,{pilots:new Map(),course,mode,premium:requestedPremium,teamScores:{red:0,blue:0},flag:{carrier:null,at:'base'},endsAt:Date.now()+MATCH_MS,ended:false,winner:null});const r=rooms.get(room);if(r.pilots.size>=24){p.room=null;return send(ws,{type:'error',message:'Room full (24 pilots)'})}if(r.course!==course||r.mode!==mode||r.premium!==requestedPremium){p.room=null;return send(ws,{type:'error',message:'Room uses a different course; match environment, seed and quad'})}p.team=['red','blue'].includes(m.team)?m.team:([...r.pilots.values()].filter(v=>v.team==='red').length<=[...r.pilots.values()].filter(v=>v.team==='blue').length?'red':'blue');r.pilots.set(p.id,p);send(ws,{type:'welcome',id:p.id,room,guestAuthenticated:!!p.profileId,walletVerified:!!p.premiumAccount,premium:requestedPremium,team:p.team,mode:r.mode,spawn:spawn(p.team)});send(ws,matchState(r));roster(r);leaders(r);combatBoard(r);return}
if(!p.room)return;const r=rooms.get(p.room);if(!r)return;
if(m.type==='nftEquip'){if(p.nftChecking)return;p.nftChecking=true;(async()=>{try{const session=typeof m.token==='string'?sessionByToken(m.token):null;if(!session)throw Error('Verified wallet session required');const result=await lookupEligible(session.account,String(m.asset||''));if(!result.eligible)throw Error('NFT is not owned or approved');p.nftAsset=result.asset;p.nftAccount=session.account;p.nftTheme=result.theme;p.nftPaint=({neon:'00f5ef',storm:'577cff',vanguard:'ff385b',legacy:'ffd700'})[result.theme];send(ws,{type:'nftEquipResult',ok:true,asset:result.asset,account:session.account,theme:result.theme});roster(r)}catch(e){p.nftAsset=null;p.nftPaint=null;p.nftAccount=null;p.nftTheme=null;send(ws,{type:'nftEquipResult',ok:false,error:String(e.message||'Verification unavailable')});roster(r)}finally{p.nftChecking=false}})();return}
if(m.type==='nftUnequip'){p.nftAsset=null;p.nftPaint=null;p.nftAccount=null;p.nftTheme=null;roster(r);send(ws,{type:'nftEquipResult',ok:true,asset:null});return}
if(m.type==='profile'){const paint=String(m.paint||'');const frameStyle=String(m.frameStyle||'');if(!/^[0-9a-fA-F]{6}$/.test(paint)||!['x','wide','compact'].includes(frameStyle))return;p.paint=paint;p.frameStyle=frameStyle;roster(r);return}
if(m.type==='state'){const now=Date.now();if(now-p.last<45)return;p.last=now;const vals=[m.x,m.y,m.z,m.yaw];if(!vals.every(v=>typeof v==='number'&&Number.isFinite(v)&&Math.abs(v)<5000))return;p.position={x:m.x,y:m.y,z:m.z,yaw:m.y,at:now};broadcast(r,{type:'state',id:p.id,x:m.x,y:m.y,z:m.z,yaw:m.yaw,course:String(m.course||'').slice(0,80)},ws)}
if(m.type==='flagAction'&&r.mode==='ctf'&&!r.ended){const now=Date.now();if(!p.position||now-p.position.at>1000||p.hp<=0)return;const bases={red:{x:-55,z:0},blue:{x:55,z:0}};const near=(b)=>Math.hypot(p.position.x-b.x,p.position.z-b.z)<13;if(!r.flag.carrier&&near(bases[p.team==='red'?'blue':'red'])){r.flag={carrier:p.id,at:'carried'};broadcast(r,{type:'flagEvent',message:p.name+' stole the flag'});}else if(r.flag.carrier===p.id&&near(bases[p.team])){r.teamScores[p.team]++;r.flag={carrier:null,at:'base'};broadcast(r,{type:'flagEvent',message:p.name+' captured the flag for '+p.team});}combatBoard(r);checkMatch(r);return}
if(m.type==='combatFire'&&r.mode!=='race'&&!r.ended){if(r.premium&&(!sessionByToken(p.premiumSessionToken)||Date.now()-p.premiumChecked>90000))return send(ws,{type:'error',message:'Premium entitlement refresh required'});
 const now=Date.now();if(now-p.lastShot<450||!p.position||now-p.position.at>1000||p.hp<=0)return;
 p.lastShot=now;const o=p.position,dir={x:Math.sin(o.yaw),z:-Math.cos(o.yaw)};
 let victim=null,nearest=110;
 for(const other of r.pilots.values()){
  if(other===p||(r.mode!=='combat'&&other.team===p.team)||!other.position||other.hp<=0||now-other.position.at>1000||now<other.spawnShield)continue;
  const dx=other.position.x-o.x,dy=other.position.y-o.y,dz=other.position.z-o.z;
  const forward=dx*dir.x+dz*dir.z,side=Math.abs(dx*dir.z-dz*dir.x);
  if(forward>0&&forward<nearest&&side<3.5&&Math.abs(dy)<3.5){nearest=forward;victim=other}
 }
 if(victim){victim.hp=Math.max(0,victim.hp-25);send(victim.ws,{type:'combatHit',hp:victim.hp,attacker:p.name});if(victim.hp===0){p.kills++;victim.deaths++;if(r.mode==='tdm')r.teamScores[p.team]++;if(r.flag?.carrier===victim.id){r.flag={carrier:null,at:'base'};broadcast(r,{type:'flagEvent',message:'Flag returned to base'})}victim.hp=100;victim.spawnShield=now+3000;victim.position=null;send(victim.ws,{type:'combatRespawn',hp:100,spawn:spawn(victim.team)});
 const key=p.profileId||'guest:'+p.id;combatStats[key]??={kills:0,deaths:0,wins:0};combatStats[key].kills++;if(victim.profileId){combatStats[victim.profileId]??={kills:0,deaths:0,wins:0};combatStats[victim.profileId].deaths++}try{saveCombat()}catch(e){console.error('Combat stats persistence failed',e.message)}broadcast(r,{type:'combatKill',attacker:p.name,victim:victim.name});}combatBoard(r);checkMatch(r)}return;
}
if(m.type==='start'){p.raceStarted=Date.now();return}
if(m.type==='finish'){if(typeof m.time!=='number'||!Number.isFinite(m.time)||m.time<1||m.time>3600)return;const course=cleanCourse(m.course);if(course!==r.course)return;const now=Date.now();if(!p.raceStarted||now-p.raceStarted<1000||now-p.raceStarted<m.time*850||now-p.lastFinish<1500)return send(ws,{type:'error',message:'Race submission rejected: server timing check failed'});p.lastFinish=now;p.raceStarted=0;const row={name:p.name,time:Math.round(m.time*100)/100,course,date:Date.now(),verified:false,guestAuthenticated:!!p.profileId};boards[course]=[...boardFor(course),row].sort((a,b)=>a.time-b.time).slice(0,15);try{persist()}catch(e){console.error('Leaderboard persistence failed',e.message)}leaders(r)}
});ws.on('close',()=>{team72Drop(p);rankedDrop(p);leave(p)});ws.on('error',()=>{team72Drop(p);rankedDrop(p);leave(p)})});
server.listen(port,()=>console.log(`WAX FPV Arena: http://localhost:${port}`));
