import { readFile, writeFile } from 'node:fs/promises';
import { prepareWeeklySnapshot } from '../server/weekly-prices';

const [source, destination] = process.argv.slice(2);
if (!source || !destination) {
  throw new Error('Usage: tsx scripts/prepare-weekly-snapshot.ts <reviewed-source.json> <new-snapshot.json>');
}

const manifest = JSON.parse((await readFile(source, 'utf8')).replace(/^\uFEFF/, ''));
const snapshot = prepareWeeklySnapshot(manifest);
await writeFile(destination, JSON.stringify(snapshot, null, 2) + '\n', {flag:'wx'});
console.log(JSON.stringify({
  weekStart:snapshot.weekStart, accepted:snapshot.accepted, variants:snapshot.variants.length,
  variantsWithAcceptedCheck:snapshot.variants.filter(variant => variant.checkedAt).length,
}));
