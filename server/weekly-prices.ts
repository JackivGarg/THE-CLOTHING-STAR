import {createHash} from 'node:crypto';

export type WeeklyVariant = {
  productId: string;
  variantId: string;
  priceMinor: number | null;
  currency: string | null;
  active: boolean;
  preorder: boolean | null;
  checkedAt: string;
};

export type WeeklySnapshot = {
  weekStart: string;
  scopeHash: string;
  methodVersion: string;
  accepted: boolean;
  variants: WeeklyVariant[];
};

type WeeklySourceManifest = {
  weekStart: string;
  scopeKey: string;
  methodVersion: string;
  accepted: boolean;
  inScope: Pick<WeeklyVariant, 'productId' | 'variantId' | 'active'>[];
  observations: (WeeklyVariant & {reviewStatus: string})[];
};

function weekWindow(weekStart: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(weekStart)) throw new Error('Use a Monday date in YYYY-MM-DD format');
  const date = new Date(weekStart + 'T00:00:00Z');
  if (date.getUTCDay() !== 1 || date.toISOString().slice(0, 10) !== weekStart) {
    throw new Error('Use a valid Monday as the week start');
  }
  const start = Date.parse(weekStart + 'T08:00:00+05:30');
  return [start, start + 2 * 86400000] as const;
}

export function prepareWeeklySnapshot(manifest: WeeklySourceManifest): WeeklySnapshot {
  const {weekStart, scopeKey, methodVersion, accepted, inScope, observations} = manifest;
  if (!scopeKey?.trim() || !methodVersion?.trim() || typeof accepted !== 'boolean' || !inScope.length) {
    throw new Error('A reviewed, dated scope and nonempty variant denominator are required');
  }
  const [start, end] = weekWindow(weekStart);
  const key = (row: Pick<WeeklyVariant, 'productId' | 'variantId'>) => {
    if (!row.productId || !row.variantId) throw new Error('Product and variant identity are required');
    return JSON.stringify([row.productId, row.variantId]);
  };
  const scope = new Map<string, WeeklyVariant>();
  for (const variant of inScope) {
    if (typeof variant.active !== 'boolean' || scope.has(key(variant))) throw new Error('Invalid or duplicate scope variant');
    scope.set(key(variant), {...variant, priceMinor:null, currency:null, preorder:null, checkedAt:''});
  }
  const sightings = new Map<string, string>();
  for (const observation of observations) {
    const id = key(observation);
    if (!scope.has(id)) throw new Error('Observation is outside the configured scope');
    const checked = Date.parse(observation.checkedAt);
    if (observation.reviewStatus !== 'accepted' || !Number.isFinite(checked) || checked < start || checked >= end) continue;
    const {priceMinor, currency, preorder, active} = observation;
    if (typeof active !== 'boolean' || (preorder !== null && typeof preorder !== 'boolean') ||
        (priceMinor !== null && (!Number.isSafeInteger(priceMinor) || priceMinor < 0)) ||
        (currency !== null && !/^[A-Z]{3}$/.test(currency))) throw new Error('Invalid accepted offer');
    const fact = JSON.stringify([priceMinor, currency, preorder, active]);
    const timestamp = JSON.stringify([id, checked]);
    if (sightings.has(timestamp) && sightings.get(timestamp) !== fact) throw new Error('Conflicting accepted offers for the same check time');
    sightings.set(timestamp, fact);
    const previous = scope.get(id)!;
    if (!previous.checkedAt || checked > Date.parse(previous.checkedAt)) {
      scope.set(id, {...previous, priceMinor:active ? priceMinor : null, currency, preorder, checkedAt:new Date(checked).toISOString()});
    }
  }
  return {
    weekStart, methodVersion, accepted,
    scopeHash:createHash('sha256').update(scopeKey.trim()).digest('hex'),
    variants:[...scope.entries()].sort(([a],[b]) => a < b ? -1 : a > b ? 1 : 0).map(([, variant]) => variant),
  };
}

export type WeeklyPriceSummary = {
  comparable: boolean;
  reason?: string;
  productCount: number;
  pairedProducts: number;
  variantCount: number;
  pairedVariants: number;
  productCoverage: number;
  medianChangePercent: number | null;
  up: number;
  down: number;
  unchanged: number;
};

function median(values: number[]): number {
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2;
}

function indexSnapshot(snapshot: WeeklySnapshot): Map<string, Map<string, WeeklyVariant>> {
  const products = new Map<string, Map<string, WeeklyVariant>>();
  for (const variant of snapshot.variants) {
    if (!variant.active) continue;
    if (!variant.productId || !variant.variantId) throw new Error('Product and variant identity are required');
    let variants = products.get(variant.productId);
    if (!variants) {
      variants = new Map();
      products.set(variant.productId, variants);
    }
    if (variants.has(variant.variantId)) throw new Error('Duplicate variant observation');
    variants.set(variant.variantId, variant);
  }
  return products;
}

function validOffer(variant: WeeklyVariant | undefined, snapshot: WeeklySnapshot): variant is WeeklyVariant & {priceMinor: number} {
  if (!variant || !variant.active || variant.preorder !== false || variant.currency !== 'INR' ||
      !Number.isSafeInteger(variant.priceMinor) || variant.priceMinor === null || variant.priceMinor <= 0) return false;
  const check = Date.parse(variant.checkedAt);
  const start = Date.parse(snapshot.weekStart + 'T08:00:00+05:30');
  return Number.isFinite(check) && Number.isFinite(start) && check >= start && check < start + 2 * 86400000;
}

export function summarizeWeeklyPrices(previous: WeeklySnapshot, current: WeeklySnapshot, scope: 'brand' | 'category'): WeeklyPriceSummary {
  const empty: WeeklyPriceSummary = {comparable:false, productCount:0, pairedProducts:0, variantCount:0,
    pairedVariants:0, productCoverage:0, medianChangePercent:null, up:0, down:0, unchanged:0};
  const start = Date.parse(previous.weekStart + 'T00:00:00+05:30');
  const end = Date.parse(current.weekStart + 'T00:00:00+05:30');
  if (!previous.accepted || !current.accepted || !previous.scopeHash || previous.scopeHash !== current.scopeHash ||
      !previous.methodVersion || previous.methodVersion !== current.methodVersion ||
      !Number.isFinite(start) || end - start !== 7 * 86400000) {
    return {...empty, reason:'Two consecutive accepted snapshots with the same scope and method are required.'};
  }
  const before = indexSnapshot(previous);
  const after = indexSnapshot(current);
  const ids = new Set([...before.keys(), ...after.keys()]);
  const changes: number[] = [];
  let variantCount = 0;
  let pairedVariants = 0;
  for (const id of ids) {
    const oldVariants = before.get(id) ?? new Map();
    const newVariants = after.get(id) ?? new Map();
    const variants = new Set([...oldVariants.keys(), ...newVariants.keys()]);
    const productChanges: number[] = [];
    variantCount += variants.size;
    for (const variantId of variants) {
      const old = oldVariants.get(variantId);
      const next = newVariants.get(variantId);
      if (validOffer(old, previous) && validOffer(next, current)) {
        pairedVariants++;
        productChanges.push(100 * (next.priceMinor - old.priceMinor) / old.priceMinor);
      }
    }
    if (variants.size && productChanges.length / variants.size >= 0.8) changes.push(median(productChanges));
  }
  const coverage = ids.size ? changes.length / ids.size : 0;
  const comparable = changes.length >= (scope === 'brand' ? 30 : 10) && coverage >= 0.8;
  return {
    comparable,
    reason:comparable ? undefined : 'There are too few comparable products or coverage is below 80%.',
    productCount:ids.size, pairedProducts:changes.length, variantCount, pairedVariants,
    productCoverage:coverage, medianChangePercent:comparable ? median(changes) : null,
    up:changes.filter(value => value > 0).length,
    down:changes.filter(value => value < 0).length,
    unchanged:changes.filter(value => value === 0).length,
  };
}
