import type { SupabaseClient } from '@supabase/supabase-js';
import { buildSearchIndex, type Product } from './search';

const PAGE_SIZE = 100;
const REFRESH_MS = 30_000;

export function publishedMarketplace(client: SupabaseClient) {
  async function fetchCatalogue() {
    const products: Product[] = [];
    let cursor: string | undefined;
    for (;;) {
      let request = client.from('marketplace_published_catalogue').select('*').order('id').limit(PAGE_SIZE);
      if (cursor) request = request.gt('id', cursor);
      const {data, error} = await request;
      if (error) throw error;
      if (!data.length) break;
      products.push(...data as Product[]);
      cursor = data[data.length - 1].id;
    }
    return {products, index:buildSearchIndex(products), observedAt:Date.now()};
  }

  let cached: Awaited<ReturnType<typeof fetchCatalogue>> | undefined;
  let pending: ReturnType<typeof fetchCatalogue> | undefined;
  return async () => {
    if (cached && Date.now() - cached.observedAt < REFRESH_MS) return cached;
    pending ??= fetchCatalogue().then(result => (cached = result)).finally(() => { pending = undefined; });
    return pending;
  };
}
