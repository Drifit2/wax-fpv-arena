// Report dependency status before integration tests, without claiming they ran.
'use strict';
const fs=require('node:fs');
for(const name of ['ws','eosjs-ecc']){
 try{const pkg=require.resolve(name);console.log('READY',name,pkg)}
 catch{console.error('MISSING',name,'— run npm install in a network-enabled environment');process.exitCode=1}
}
if(!fs.existsSync(require('node:path').join(__dirname,'integration81.js')))process.exitCode=1;
