import test from 'node:test';
import assert from 'node:assert/strict';
import { extractAttributeEvidence, extractSavedPayloadEvidence } from './attribute-evidence.mjs';

const fixture = {
  external_product_id: '9998464942395', source_url: 'https://hauntrex.com/products/yamaha-racing-designed-oversized-hoodie',
  title: 'Yamaha Racing Designed Oversized Hoodie', original_product_type: '', source_tags: ['Women', 'Men', 'Streetwear'],
  description_text: 'Composition: 100% Terry Cotton. Weight: 350 GSM. Oversized fit.',
  observed_at: '2026-11-07T04:00:00Z'
};
const values = (evidence, key) => [...new Set(evidence.filter(row => row.attribute_key === key).map(row => row.value_text))];

test('extracts explicit source facts with reviewable provenance and stable fingerprints', () => {
  const rows = extractAttributeEvidence(fixture, {brand: 'hauntrex'});
  assert.deepEqual(values(rows, 'category'), ['hoodie']);
  assert.deepEqual(values(rows, 'fit'), ['oversized']);
  assert.deepEqual(values(rows, 'material_composition'), ['100% cotton']);
  assert.deepEqual(values(rows, 'gsm'), ['350']);
  assert.deepEqual(values(rows, 'audience'), ['women', 'men']);
  assert.deepEqual(values(rows, 'theme'), ['racing']);
  assert.ok(rows.every(row => row.review_status === 'pending' && row.source_url === fixture.source_url && row.excerpt && row.rule_version && row.source_field));
  assert.deepEqual(rows.map(row => row.evidence_fingerprint), extractAttributeEvidence({...fixture, observed_at: '2026-11-08T04:00:00Z'}, {brand:'hauntrex'}).map(row => row.evidence_fingerprint));
});

test('keeps no-evidence values absent and rejects style suggestions and negated statements', () => {
  const rows = extractAttributeEvidence({
    title: 'Regular T-Shirt', source_tags: ['Oversized T-shirt Women', 'Menswear'],
    description_text: 'Not a racing print. Not oversized fit. Pair it with 100% cotton oversized fit trousers. All our products use 350 GSM fleece.'
  });
  assert.deepEqual(values(rows, 'category'), ['t-shirt']);
  for (const key of ['theme','fit','audience','gsm','material_composition']) assert.deepEqual(values(rows,key), []);
});

test('handles raw Bonkers HTML, percentage blends and source paths without inventing variant stock', () => {
  const rows = extractAttributeEvidence({
    id: 7816996421732, title:'All White Hello Kitty Oversized Sweatshirt', type:'', tags:['Women'],
    description:'<p>Composition: 60% Cotton 40% Polyester</p><p>340 GSM</p>',
    variants:[{available:false,size:'XS'},{available:true,size:'XL'}]
  });
  assert.deepEqual(values(rows, 'material_composition'), ['60% cotton','40% polyester']);
  assert.deepEqual(values(rows,'category'), ['sweatshirt']);
  assert.deepEqual(values(rows,'gsm'), ['340']);
  assert.ok(rows.filter(row => row.attribute_key === 'material_composition').every(row => row.source_field === 'description'));
  assert.equal(rows.some(row => ['available','availability','colour','size'].includes(row.attribute_key)),false);
});

test('deduplicates flattened feed products and handles staged payload wrapper', () => {
  const one = extractSavedPayloadEvidence({brand:{slug:'hauntrex'},products:[fixture,fixture]});
  assert.equal(one.length,extractAttributeEvidence(fixture,{brand:'hauntrex'}).length);
  assert.deepEqual(extractAttributeEvidence({payload:fixture},{brand:'hauntrex'}),extractAttributeEvidence(fixture,{brand:'hauntrex'}));
  assert.deepEqual(extractSavedPayloadEvidence({brand:{slug:'snitch'},products:[fixture]}), []);
});

test('preserves conflicting source categories and rejects impossible composition or GSM values', () => {
  const rows = extractAttributeEvidence({title:'Knitted Dress',original_product_type:'T-Shirt',description_text:'Composition: 140% cotton. 9999 GSM. Non-racing design.'});
  assert.deepEqual(values(rows,'category'),['dress','t-shirt']);
  assert.deepEqual(values(rows,'gsm'),[]);
  assert.deepEqual(values(rows,'material_composition'),[]);
  assert.deepEqual(values(rows,'theme'),[]);
});

test('does not turn a material or GSM range into an exact endpoint', () => {
  const rows = extractAttributeEvidence({description_text:'Fabric is 80–100% cotton. Weight: 280-300 GSM. Between 240 and 280 GSM. Weight 180 to 200 GSM.'});
  assert.deepEqual(values(rows,'material_composition'),[]);
  assert.deepEqual(values(rows,'gsm'),[]);
});

test('actual JNORSS decorative sweater name retains the source vest category', () => {
  const rows = extractAttributeEvidence({
    title:'NBHD Sweater Weather Acid Wash Vest', original_product_type:'acid wash vest',
    description_text:'100% Terry cotton 240 GSM Silicon and bio wash Soft and Breathable Fabric Oversized Boxy Fit'
  });
  assert.deepEqual(values(rows,'category'),['vest']);
  assert.deepEqual(values(rows,'gsm'),['240']);
  assert.deepEqual(values(rows,'material_composition'),['100% cotton']);
});

test('actual Burger Bae co-ord component garments cannot pass whole-product categories or fit', () => {
  const rows = extractAttributeEvidence({
    title:'Baby Pink-Apple Green Cosmos Set ( It girl baby tee + Fat Pants)', original_product_type:'Co-ord set',
    description_text:'The fitted baby tee is paired with relaxed-fit fat pants. Composition: 60% cotton 40% polyester.'
  });
  assert.deepEqual(values(rows,'category'),['co-ord']);
  assert.deepEqual(values(rows,'component_category'),['t-shirt','trousers']);
  assert.deepEqual(values(rows,'fit'),[]);
  assert.deepEqual(values(rows,'component_fit'),['relaxed']);
  assert.deepEqual(values(rows,'material_composition'),[]);
  assert.deepEqual(values(rows,'component_material_composition'),['60% cotton','40% polyester']);
});

test('actual Everdion Cord set spelling and ambiguous paired title retain component scope', () => {
  const rows = extractAttributeEvidence({title:'Paparazzi Hoodie And Shorts',original_product_type:'Cord set'});
  assert.deepEqual(values(rows,'category'),['co-ord']);
  assert.deepEqual(values(rows,'component_category'),['hoodie','shorts']);
  const ambiguous = extractAttributeEvidence({title:'Shirt & Shorts'});
  assert.deepEqual(values(ambiguous,'category'),[]);
  assert.deepEqual(values(ambiguous,'component_category'),['shirt','shorts']);
  assert.deepEqual(values(extractAttributeEvidence({title:'Tom & Jerry T Shirt'}),'category'),['t-shirt']);
});

test('rejects extended negation, imitation material and generic claims following the value', () => {
  const rows = extractAttributeEvidence({description_text:'Not made with 100% cotton. Fabric has 100% cotton-like feel. 350 GSM is used for all our products.'});
  assert.deepEqual(values(rows,'material_composition'),[]);
  assert.deepEqual(values(rows,'gsm'),[]);
});
