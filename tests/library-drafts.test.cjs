const test = require('node:test');
const assert = require('node:assert/strict');
const owner = import('../src/library-drafts.js');
const entry = (id='one',notes='Saved') => ({id,notes,title:'Recording',archive:{room:'model',session:{history:{timestamps:[100]}}},records:[{key:'tierscope:library:v1:'+id}]});

test('note drafts stay separate from saved entries and returned views', async()=>{
 const {createLibraryDrafts}=await owner,drafts=createLibraryDrafts(),record=entry();
 drafts.edit(record,'In progress'); assert.equal(record.notes,'Saved');assert.equal(drafts.size,1);
 drafts.read(record).value='external';drafts.list()[0].value='external';
 assert.equal(drafts.read(record).value,'In progress');assert.equal(drafts.read(record).conflict,false);
 drafts.edit(record,'Saved');assert.equal(drafts.size,0);
});
test('refresh and changed saved notes preserve drafts and their original baseline',async()=>{
 const {createLibraryDrafts}=await owner,drafts=createLibraryDrafts(),record=entry();
 drafts.edit(record,'Draft');const changed=entry('one','Other tab');drafts.reconcile([changed]);
 assert.equal(drafts.read(changed).value,'Draft');assert.equal(drafts.read(changed).conflict,true);
 drafts.edit(changed,'Revised draft');assert.equal(drafts.read(changed).base,'Saved');
 drafts.reconcile([entry('one','Revised draft')]);assert.equal(drafts.size,0);
});
test('unavailable or replaced recordings keep recoverable notes without guessing by start date',async()=>{
 const {createLibraryDrafts}=await owner,drafts=createLibraryDrafts();
 drafts.edit(entry(),'Keep this');drafts.reconcile([]);drafts.reconcile([entry('replacement')]);
 assert.equal(drafts.size,1);assert.equal(drafts.list()[0].id,'one');assert.equal(drafts.list()[0].value,'Keep this');
 assert.equal(drafts.read(entry('replacement')).dirty,false);
 drafts.reconcile([entry()]);assert.equal(drafts.read(entry()).value,'Keep this');
});
test('redundant snapshot aliases follow the representative without merging independent drafts',async()=>{
 const {createLibraryDrafts}=await owner,drafts=createLibraryDrafts();drafts.edit(entry(),'First');
 const next=entry('two');next.records.push({key:'tierscope:library:v1:one'});drafts.reconcile([next]);
 assert.equal(drafts.list()[0].id,'two');assert.equal(drafts.read(next).value,'First');
 drafts.edit(entry(),'Second');drafts.reconcile([next]);assert.equal(drafts.size,2);
 drafts.discard('two');assert.equal(drafts.list()[0].value,'Second');
});

test('proven automatic updates carry drafts forward; deletion and reimport do not claim them',async()=>{
 const {createLibraryDrafts}=await owner,drafts=createLibraryDrafts(),first={...entry('one'),lineage:'original'};
 drafts.edit(first,'Draft while recording');const updated={...entry('two'),lineage:'original'};
 drafts.reconcile([updated]);assert.equal(drafts.read(updated).value,'Draft while recording');assert.equal(drafts.read(first).id,'two');
 drafts.edit(first,'Still editing the open card');assert.equal(drafts.size,1);drafts.reconcile([updated]);
 assert.equal(drafts.read(updated).value,'Still editing the open card');
 const imported={...entry('three'),lineage:'new-import'};drafts.reconcile([imported]);assert.equal(drafts.read(imported).dirty,false);assert.equal(drafts.size,1);
});
