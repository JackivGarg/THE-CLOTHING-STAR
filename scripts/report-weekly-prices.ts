import {readFile} from 'node:fs/promises';
import {summarizeWeeklyPrices, type WeeklySnapshot} from '../server/weekly-prices';

const [previousFile, currentFile, scope] = process.argv.slice(2);
if (!previousFile || !currentFile || (scope !== 'brand' && scope !== 'category')) {
  console.error('Usage: npm run report:weekly -- <previous.json> <current.json> <brand|category>');
  process.exit(1);
}

try {
  const previous = JSON.parse(await readFile(previousFile, 'utf8')) as WeeklySnapshot;
  const current = JSON.parse(await readFile(currentFile, 'utf8')) as WeeklySnapshot;
  console.log(JSON.stringify(summarizeWeeklyPrices(previous, current, scope), null, 2));
} catch (error) {
  console.error('Cannot calculate the weekly report:', error instanceof Error ? error.message : 'Invalid input');
  process.exitCode = 1;
}
