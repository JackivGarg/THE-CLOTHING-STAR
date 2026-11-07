import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { randomUUID } from 'node:crypto';
import { prepareBonkersDetailImport } from './prepare-bonkers-detail-import.mjs';
import { buildBonkersImportSql } from './bonkers-detail-import-sql.mjs';

const manifest = process.argv[2];
if (!manifest || process.argv.length !== 3) throw new Error('Supply the validated manifest path');
// Full raw, robots, candidate, identity, field and image validation is performed once.
// Keep the validated rows in memory for this invocation only; never replay a cache.
const data = prepareBonkersDetailImport(manifest, 'all');
// A fresh directory prevents stale chunks or a previous manifest from being replayed.
const output = resolve(dirname(manifest), 'import-sql', `${data.runId}-${randomUUID()}`);
mkdirSync(output, {recursive:true});
const operations = ['setup', ...Array.from({length:data.chunks}, (_, index) => String(index)), 'finish'];
const files = [];
for (const [index, operation] of operations.entries()) {
  const filename = `${String(index).padStart(3, '0')}-${operation}.sql`;
  const rows = /^\d+$/.test(operation) ? data.rows.slice(Number(operation)*10, (Number(operation)+1)*10) : data.rows.slice(0,10);
  const sql = buildBonkersImportSql({...data,rows}, operation) + '\n';
  writeFileSync(resolve(output, filename), sql, {flag:'wx'});
  files.push(filename);
}
// Only this explicit manifest identifies complete output, and it is written last.
writeFileSync(resolve(output, 'manifest.json'), JSON.stringify({
  run_id:data.runId, source_manifest:resolve(manifest), products:data.products,
  requests:data.requests, files
}, null, 2), {flag:'wx'});
console.log(JSON.stringify({output,run_id:data.runId,products:data.products,files:files.length}));
