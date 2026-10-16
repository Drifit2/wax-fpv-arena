const assert=require('node:assert/strict');const fs=require('node:fs');const s=fs.readFileSync(require('node:path').join(__dirname,'../server.js'),'utf8');
for(const part of ["requestedMode=b.mode==='relay4v4'", "f.mode73=requestedMode", "f.mode73!==p.team85Mode", "p.team85Mode===f.mode73", "deadline:startAt+(TEAM80_TEST_RACE_MS||180000)", "relay88:isRelay?", "f.mode73==='relay4v4'&&m.mode85==='relay4v4'", "server_simulated_relay_club_fixture"]){assert.ok(s.includes(part),'Missing relay fixture behavior: '+part)}
assert.ok(!s.includes("if(p.team85Mode==='relay4v4')return team72Send(p,{type:'team72Error',message:'Relay is exhibition-only'})"));
console.log('Alpha 8.9 relay fixture structural checks passed (not live integration)');
