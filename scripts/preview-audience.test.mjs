import {test} from 'node:test';
import assert from 'node:assert/strict';
import {previewAudience} from './preview-audience.mjs';

test('audience uses explicit merchant tags or title labels and keeps ambiguous products unknown', () => {
  assert.deepEqual(previewAudience({title:'Washed tee',source_tags:[' Women ']}), {
    audience:'women',audience_evidence:{audience:'women',field:'tag',value:' Women '},
  });
  assert.equal(previewAudience({title:'Women’s wide-leg jeans'}).audience,'women');
  assert.equal(previewAudience({title:'Unisex hoodie',source_tags:['Men','Women']}).audience,'unisex');
  assert.equal(previewAudience({title:'Hoodie',source_tags:['Men','Women']}).audience,null);
  assert.equal(previewAudience({title:'Men’s hoodie',source_tags:['Women']}).audience,null);
  assert.equal(previewAudience({title:'Girls Night graphic tee',source_tags:['Womenswear Picks']}).audience,null);
});
