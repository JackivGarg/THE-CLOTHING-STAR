import { decimalToMinor, plainTextFromHtml } from './collector-utils.mjs';

// Normalizes an already obtained public product payload. The caller must establish
// the source's access permission and price unit; this module makes no requests.
export function normalizeBonkersProduct(product, { sourceUrl, priceUnit, observedAt } = {}) {
  const id = value => typeof value === 'string' && /^\d+$/.test(value) ? value
    : typeof value === 'number' && Number.isSafeInteger(value) && value >= 0 ? String(value) : null;
  const money = value => {
    if (value == null || value === '') return null;
    if (priceUnit === 'major_decimal') return decimalToMinor(value, priceUnit);
    if (priceUnit === 'minor_integer' && /^\d+$/.test(String(value))) {
      const n = Number(value); return Number.isSafeInteger(n) ? n : null;
    }
    return null;
  };
  if (!['major_decimal', 'minor_integer'].includes(priceUnit)) throw new Error('Explicit verified price unit required');
  let url;
  try { url = new URL(sourceUrl); } catch { throw new Error('Valid product URL required'); }
  if (url.protocol !== 'https:' || url.hostname !== 'www.bonkerscorner.com' || !url.pathname.startsWith('/products/') || url.search || url.hash) throw new Error('Unexpected product URL');
  if (!product || typeof product !== 'object' || !id(product.id) || !product.title || !Array.isArray(product.variants)) throw new Error('Invalid product payload or unsafe product ID');
  const names = (product.options || []).map(o => typeof o === 'string' ? o : o?.name);
  const images = (product.images || []).map((image, index) => {
    const obj = typeof image === 'string' ? { src: image } : image || {};
    return { id: id(obj.id), src: obj.src || null, alt: obj.alt || null, position: obj.position ?? index + 1,
      width: obj.width ?? null, height: obj.height ?? null, variant_ids: (obj.variant_ids || []).map(id).filter(Boolean) };
  });
  const variants = product.variants.map(v => {
    const variantId = id(v.id);
    if (!variantId) throw new Error('Invalid or unsafe variant ID');
    const options = {};
    for (let i = 0; i < names.length; i++) if (names[i]) options[names[i]] = v[`option${i + 1}`] ?? v.options?.[i] ?? null;
    return { external_variant_id: variantId, source_options: options, source_sku: v.sku || null,
      size_raw: options.Size ?? options.Sizes ?? options.SIZE ?? options.size ?? null,
      colour_raw: options.Color ?? options.Colour ?? options.color ?? options.colour ?? null,
      source_price: v.price ?? null, price_minor: money(v.price), compare_at_minor: money(v.compare_at_price), currency: 'INR',
      available: typeof v.available === 'boolean' ? v.available : null, preorder: null,
      source_variant_image_id: id(v.image_id ?? v.featured_image?.id) };
  });
  return { external_product_id: id(product.id), title: product.title, handle: product.handle ?? null,
    description_text: plainTextFromHtml(product.body_html ?? product.description ?? '') || null,
    original_product_type: product.product_type || null, source_tags: Array.isArray(product.tags) ? product.tags : typeof product.tags === 'string' ? product.tags.split(',').map(s => s.trim()).filter(Boolean) : [],
    source_url: url.href, source_updated_at: product.updated_at ?? null, observed_at: observedAt ?? new Date().toISOString(),
    fulfilment_status: 'unknown', images, variants, content_use_status: 'unknown',
    validation_errors: [...(!variants.length ? ['missing_variants'] : []), ...(variants.some(v => v.price_minor === null) ? ['unparsed_price'] : [])] };
}
