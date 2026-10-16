const assert=require('node:assert/strict');const fs=require('node:fs');const s=fs.readFileSync(require('node:path').join(__dirname,'../server.js'),'utf8');
assert.match(s,/gatesPerLeg:2/);
assert.match(s,/pilot\.team72Flight\.gate<m\.relay88\.gatesPerLeg/);
assert.match(s,/trigger:'checkpoint'/);
assert.match(s,/m\.relay88\.completed\.red===4&&m\.relay88\.completed\.blue===4/);
assert.match(s,/relayIntegrity92\.relayEligible\(m,reason\)/);
assert.doesNotMatch(s,/legMs:20000/);
console.log('Alpha 9.0 checkpoint relay structural tests passed');
