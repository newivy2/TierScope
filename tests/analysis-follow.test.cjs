const test=require('node:test'),assert=require('node:assert/strict');
const modulePromise=import('../src/analysis-follow.js');
test('following replaces supplied display snapshots, freezes and catches up without changing inputs',async()=>{
 const {createAnalysisFollower}=await modulePromise,owner=createAnalysisFollower();
 const old=Object.freeze({sample:1}),next=Object.freeze({sample:2}),entry=Object.freeze({id:'a',archive:old});
 assert(owner.update('room:1','s1',[entry],next));assert.equal(owner.project([entry])[0].archive,next);assert.equal(entry.archive,old);
 assert.equal(owner.update('room:1','s1',[entry],next),false);
 owner.toggle(false);const latest=Object.freeze({sample:3});assert.equal(owner.update('room:1','s2',[entry],latest),false);
 assert.equal(owner.project([entry])[0].archive,next);owner.toggle(true);assert(owner.update('room:1','s2',[entry],latest));
 assert.equal(owner.project([entry])[0].archive,latest);
});
test('reset or another room expires a binding and cannot silently replace its frozen recording',async()=>{
 const {createAnalysisFollower}=await modulePromise,owner=createAnalysisFollower(),entry={id:'a',archive:{sample:1}};
 owner.update('room:1','1',[entry],entry.archive);assert.equal(owner.check('room:2'),false);assert(owner.expired);assert.equal(owner.enabled,false);
 owner.toggle(true);assert.equal(owner.update('room:2','2',[entry],{sample:2}),false);
 assert.equal(owner.project([entry])[0].archive,entry.archive);owner.reset();owner.toggle(true);assert(owner.update('room:2','2',[entry],{sample:2}));
});
test('only verified library lineage carries a frozen selection through Auto replacements',async()=>{
 const {createAnalysisFollower}=await modulePromise,owner=createAnalysisFollower(),entry={id:'a',lineage:'original',archive:{sample:1}};
 const shown={sample:2};owner.update('room:1','2',[entry],shown);owner.toggle(false);
 const replacement={id:'b',lineage:'original',archive:{sample:3}};
 assert.deepEqual([...owner.reconcile([replacement])],[['a','b']]);assert.equal(owner.project([replacement])[0].archive,shown);
 const imported={id:'c',lineage:'new-import',archive:shown};assert.equal(owner.reconcile([imported]).size,0);assert.equal(owner.project([imported])[0].archive,shown);
 owner.forget('b');assert.equal(owner.project([replacement])[0].archive,replacement.archive);
});
