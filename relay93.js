'use strict';
const assert=require('node:assert/strict');const fs=require('node:fs');const path=require('node:path');
const root=path.resolve(__dirname,'..'),test=fs.readFileSync(path.join(__dirname,'integration93.js'),'utf8');
for(const token of ["mode73:'relay4v4'","mode85:'relay4v4'","team72Resumed","team72Error","team72Result","/api/relay91/live","club69_fixtures.json","result.reason!=='completed'"])assert.ok(test.includes(token),token);
const pkg=require('../package.json');assert.ok(pkg.scripts['test:relay-e2e'].includes('integration93.js'));
console.log('Alpha 9.3 PASS: relay E2E test coverage wiring (offline structural only)');
