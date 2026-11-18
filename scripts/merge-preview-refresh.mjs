// Keep older identities when a later source snapshot does not contain them.
export function mergePreviewRefresh(previous, record, brand) {
  if (previous && Date.parse(previous.observed_at) > Date.parse(record.observed_at)) return previous;
  const variants = new Map((previous?.variants ?? []).map(variant => [variant.id, variant]));
  for (const variant of record.variants) variants.set(variant.external_variant_id, {
    id:variant.external_variant_id, size:variant.size_raw, colour:variant.colour_raw,
    price_minor:variant.price_minor, available:variant.available, source_options:variant.source_options,
    observed_at:record.observed_at,
  });
  return {...record, brand:brand.name, brand_slug:brand.slug, variants:[...variants.values()]};
}
