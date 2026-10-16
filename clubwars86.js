// Offline fixture policy and implementation regression checks (not a live integration test).
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {canAwardFixture}=require('../race-policy77');
const server=fs.readFileSync(path.join(__dirname,'../server.js'),'utf8');
for(const route of ['/api/club86/fixtures','/api/club86/lineup'])assert.ok(server.includes(route),route);
assert.ok(server.includes('function team86Pair(f)'), '4v4 matchmaker');
assert.ok(server.includes('f.mode73===\'4v4\'&&m.mode85===\'4v4\'&&rows.length===8'), 'fixture result mode guard');
assert.ok(server.includes('new Set([...home,...away]).size!==8'), 'unique 8 pilots');
const fixture={status:'accepted',ready73:true,winner:null,races:[]};
assert.equal(canAwardFixture(fixture,'r-1','completed','red'),true);
assert.equal(canAwardFixture(fixture,'r-1','disconnect','red'),false);
assert.equal(canAwardFixture({...fixture,races:[{raceId:'r-1'}]},'r-1','completed','red'),false);
console.log('Alpha 8.6 offline 4v4 fixture tests PASS');
