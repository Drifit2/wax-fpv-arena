// Parse every shipped browser script, including modules (previous checks skipped them).
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const assert = require('node:assert/strict');
const {spawnSync} = require('node:child_process');
const root = path.resolve(__dirname, '..');
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'arena-syntax-'));
let count = 0;
try {
  for (const name of fs.readdirSync(root).filter(n => n.endsWith('.html'))) {
    const html = fs.readFileSync(path.join(root, name), 'utf8');
    for (const [, attrs, code] of html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi)) {
      if (/\bsrc\s*=/.test(attrs)) continue;
      const target = path.join(tmp, /\btype=["']module["']/.test(attrs) ? 'check.mjs' : 'check.cjs');
      fs.writeFileSync(target, code);
      const result = spawnSync(process.execPath, ['--check', target], {encoding:'utf8'});
      assert.equal(result.status, 0, name + ': ' + result.stderr);
      count++;
    }
  }
  console.log(`PASS: ${count} inline browser scripts, including ES modules`);
} finally { fs.rmSync(tmp, {recursive:true, force:true}); }
