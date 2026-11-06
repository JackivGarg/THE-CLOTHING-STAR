import crypto from 'node:crypto';

export function decimalToMinor(value, unit) {
  if (value == null || unit !== 'major_decimal') return null;
  const match = String(value).match(/^(\d+)(?:\.(\d{1,2}))?$/);
  if (!match) return null;
  return Number(match[1]) * 100 + Number((match[2] || '').padEnd(2, '0'));
}

export function plainTextFromHtml(value = '') {
  return value.replace(/<(script|style|noscript)[^>]*>[\s\S]*?<\/\1>/gi, ' ')
    .replace(/<\/(p|div|li|h[1-6]|br|tr)>/gi, '\n').replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;|&#160;/gi, ' ').replace(/&amp;/gi, '&').replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'").replace(/&lt;/gi, '<').replace(/&gt;/gi, '>')
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(+n)).replace(/&[a-z]+;/gi, ' ')
    .replace(/[\t ]+/g, ' ').replace(/\n\s*/g, '\n').trim();
}

export function pageDigest(products) {
  return crypto.createHash('sha256').update(products.map(p => String(p.id ?? '')).join('|')).digest('hex');
}

export function parseProductPage(payload) {
  if (!payload || !Array.isArray(payload.products)) return { ok: false, products: [] };
  return { ok: true, products: payload.products };
}

export function isShortPage(count, pageSize) { return count < pageSize; }

export function stableContentHash(value) {
  function stripVolatile(input) {
    if (Array.isArray(input)) return input.map(stripVolatile);
    if (!input || typeof input !== 'object') return input;
    return Object.fromEntries(Object.keys(input).sort().filter(k => !['observed_at','content_hash','validation_errors'].includes(k)).map(k => [k, stripVolatile(input[k])]));
  }
  return crypto.createHash('sha256').update(JSON.stringify(stripVolatile(value))).digest('hex');
}
