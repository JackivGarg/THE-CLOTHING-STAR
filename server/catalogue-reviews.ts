import type { OfferState, Product, Variant } from './search';

type ReviewedOffer = {
  product_id: string; variant_id: string; price_minor: number | null; available: boolean | null;
  preorder: boolean | null; checked_at: string; fulfilment_status: string | null; offer_state: OfferState;
  source_sku?: string | null;
};

export type ReviewSnapshot = {
  exported_at: string;
  offers: ReviewedOffer[];
  section_products: {product_id: string; labels: string[]}[];
  products: Product[];
};

export function applyReviewedCatalogue(products: Product[], reviews: ReviewSnapshot) {
  const offers = new Map<string, Map<string, ReviewedOffer>>();
  for (const offer of reviews.offers) {
    const variants = offers.get(offer.product_id) ?? new Map<string, ReviewedOffer>();
    if (variants.has(offer.variant_id)) throw new Error('Duplicate reviewed variant in catalogue snapshot');
    variants.set(offer.variant_id, offer);
    offers.set(offer.product_id, variants);
  }
  const sections = new Map(reviews.section_products.map(section => [section.product_id, section.labels]));
  const known = new Set(products.map(product => product.id));
  const additions = reviews.products.filter(product => !known.has(product.id));
  const counts = {offers:0, section_products:0, added_products:additions.length};
  const enriched = [...products, ...additions].map(product => {
    const reviewed = offers.get(product.id);
    const labels = sections.get(product.id);
    if (!reviewed && !labels) return product;
    if (labels) counts.section_products++;
    const variants = reviewed ? product.variants.map((variant): Variant => {
      const offer = reviewed.get(variant.id);
      if (!offer) return variant;
      counts.offers++;
      return {
        ...variant,
        price_minor:offer.price_minor, available:offer.available, preorder:offer.preorder,
        observed_at:offer.checked_at, price_checked_at:offer.checked_at, stock_checked_at:offer.checked_at,
        fulfilment_status:offer.fulfilment_status, offer_state:offer.offer_state,
        source_sku:offer.source_sku ?? variant.source_sku,
      };
    }) : product.variants;
    return {...product, collection_labels:labels ?? product.collection_labels, variants};
  });
  return {products:enriched, counts};
}
