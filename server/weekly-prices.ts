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
