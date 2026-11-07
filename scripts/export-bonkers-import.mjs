import { execFileSync } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const manifest = process.argv[2];
if (!manifest) throw new Error('Supply the validated manifest path');
const prepare = fileURLToPath(new URL('./prepare-bonkers-detail-import.mjs', import.meta.url));
const buildSql = fileURLToPath(new URL('./bonkers-detail-import-sql.mjs', import.meta.url));
const data = JSON.parse(execFileSync(process.execPath, [prepare, manifest, '0'], {encoding:'utf8'}));
const output = resolve(dirname(manifest), 'import-sql');
mkdirSync(output, {recursive:true});
const operations = ['setup', ...Array.from({length:data.chunks}, (_, index) => String(index)), 'finish'];
const files = [];
for (const [index, operation] of operations.entries()) {
  const filename = `${String(index).padStart(3, '0')}-${operation}.sql`;
  const sql = execFileSync(process.execPath, [buildSql, manifest, operation], {encoding:'utf8', maxBuffer:8*1024*1024});
  writeFileSync(resolve(output, filename), sql);
  files.push(filename);
}
writeFileSync(resolve(output, 'manifest.json'), JSON.stringify({
  run_id:data.runId, source_manifest:resolve(manifest), products:data.products,
  requests:data.requests, files
}, null, 2));
console.log(JSON.stringify({output,run_id:data.runId,products:data.products,files:files.length}));
