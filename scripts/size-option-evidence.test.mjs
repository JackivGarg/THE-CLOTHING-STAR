import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const sql=fs.readFileSync(new URL('./size-option-evidence.sql',import.meta.url),'utf8');
const pgPattern=sql.match(/option_value ~\* '([^']+)'/)?.[1];
assert.ok(pgPattern,'SQL candidate size pattern present');
const pattern=new RegExp(pgPattern,'i');
function classify(options) {
  const entries=Object.entries(options).filter(([key,value])=>['size','title'].includes(key.toLowerCase())&&typeof value==='string');
  if(entries.length!==1||!pattern.test(entries[0][1]))return null;
  const [key,value]=entries[0];return {key,value,level:key.toLowerCase()==='size'?'explicit':'inferred'};
}
test('size-option source-shape fixtures remain conservative',()=>{
 assert.deepEqual(classify({SIze:'S'}),{key:'SIze',value:'S',level:'explicit'});
 assert.deepEqual(classify({Title:'3XL',Color:'White'}),{key:'Title',value:'3XL',level:'inferred'});
 assert.equal(classify({Title:'Default Title'}),null);
 assert.equal(classify({Title:'₹1,000.00'}),null);
 assert.equal(classify({Size:'M',Title:'L'}),null);
 assert.equal(classify({Size:36}),null);
});
test('SQL remains insert-only, private pending and idempotent by variant identity',()=>{
 assert.match(sql,/v\.size is null/i);assert.match(sql,/option_count=1/i);assert.match(sql,/'pending','size-source-option-1'/i);
 assert.match(sql,/e\.variant_id=c\.variant_id/);assert.match(sql,/pg_advisory_xact_lock/);
 assert.doesNotMatch(sql,/\b(update|delete|truncate)\s+public\.(products|variants)\b/i);
});
