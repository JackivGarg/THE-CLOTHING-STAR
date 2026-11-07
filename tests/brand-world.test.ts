import test from 'node:test';
import assert from 'node:assert/strict';
import {BRAND_CHAPTERS,damping,exactProgress} from '../src/brand-world/scene';
test('native scroll maps deterministically forward, backward and to authored endpoints',()=>{
 const n=BRAND_CHAPTERS.length;
 assert.equal(exactProgress(200,200,1200),0);
 assert.equal(exactProgress(1400,200,1200),n-1);
 for(let i=0;i<n;i++)assert.equal(exactProgress(200+1200*i/(n-1),200,1200),i);
 const points=[200,600,900,600,200];assert.deepEqual(points.map(y=>exactProgress(y,200,1200)),[0,2,3.5,2,0]);
 assert.equal(exactProgress(-1000,200,1200),0);assert.equal(exactProgress(5000,200,1200),n-1);
});
test('camera damping is bounded, reversible and stable after pauses',()=>{
 assert.equal(damping(3,3,1/60),3);
 assert.ok(damping(0,6,1/60)>0&&damping(0,6,1/60)<6);
 assert.ok(damping(6,0,1/60)>0&&damping(6,0,1/60)<6);
 assert.equal(damping(0,6,10),damping(0,6,1/30));
 const two=damping(damping(0,6,1/60),6,1/60);assert.ok(Math.abs(two-damping(0,6,1/30))<1e-12);
});
