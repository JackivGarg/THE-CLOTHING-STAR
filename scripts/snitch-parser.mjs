/** Parse a rendered Snitch product-page text snapshot, supplied by a browser worker.
 * This module performs no network requests and does not infer variant availability.
 */
export function parseSnitchRenderedText(sourceUrl, text, observedAt = new Date().toISOString()) {
  let url;
  try { url = new URL(sourceUrl); } catch { return { ok: false, error: 'invalid_url' }; }
  if (url.protocol !== 'https:' || url.hostname !== 'www.snitch.com' || !url.pathname.endsWith('/buy')) {
    return { ok: false, error: 'unexpected_origin_or_path' };
  }
  if (typeof text !== 'string' || !text.trim()) return { ok: false, error: 'empty_page' };
  const lines = text.split(/\r?\n/).map(line => line.trim()).filter(Boolean);
  const priceIndex = lines.findIndex(line => /^₹\s*[\d,]+(?:\.\d{1,2})?$/.test(line));
  if (priceIndex !== 1 || !lines[0]) return { ok: false, error: 'missing_product_heading_or_price' };
  const priceText = lines[priceIndex].replace(/[₹,\s]/g, '');
  const [rupees, fraction = ''] = priceText.split('.');
  const priceMinor = Number(rupees) * 100 + Number(fraction.padEnd(2, '0'));
  if (!Number.isSafeInteger(priceMinor)) return { ok: false, error: 'invalid_price' };
  const colorIndex = lines.findIndex(line => /^Selected Colou?r$/i.test(line));
  let color = colorIndex < 0 ? null : lines[colorIndex + 1];
  if (color === '·' || color === '•') color = lines[colorIndex + 2];
  const sizeIndex = lines.findIndex(line => /^SIZE GUIDE$/i.test(line));
  const sizes = [];
  if (sizeIndex >= 0) for (const line of lines.slice(sizeIndex + 1)) {
    if (/^(?:XXXS|XXS|XS|S|M|L|XL|XXL|XXXL|[2-9]XL|\d{2,3})$/i.test(line)) sizes.push(line);
    else if (sizes.length || /^(?:FREE|ADD|DELIVERY|CHECK|DESCRIPTION)/i.test(line)) break;
  }
  const descriptionStart = lines.findIndex(line => /^DESCRIPTION\s*&\s*FIT$/i.test(line));
  const descriptionEnd = lines.findIndex((line, i) => i > descriptionStart && /^(?:REVIEWS|RETURNS|ASK SID)$/i.test(line));
  const detailLines = descriptionStart < 0 ? [] : lines.slice(descriptionStart + 1, descriptionEnd < 0 ? undefined : descriptionEnd);
  const skuLine = detailLines.find(line => /^SKU\s*:/i.test(line));
  return { ok: true, product: {
    source_url: url.href, title: lines[0], external_product_id: null,
    observed_at: observedAt, source_kind: 'rendered_page', content_use_status: 'unknown',
    current_price_minor: priceMinor, currency: 'INR', selected_color: color || null,
    displayed_sizes: [...new Set(sizes)], merchant_sku: skuLine?.replace(/^SKU\s*:\s*/i, '') || null,
    description_text: detailLines.length ? detailLines.join('\n') : null,
    availability: null, variants: null, images: null,
    limitations: ['Displayed sizes do not establish variant availability.', 'Page price applies only to the currently displayed selection.', 'Product and variant IDs require independent confirmation.']
  }};
}
