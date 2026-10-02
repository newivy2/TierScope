const test=require('node:test');
const assert=require('node:assert/strict');
const {harness}=require('./helpers/harness.cjs');
const room='tierscope:v1:testroom',prefix='tierscope:tab:v2:testroom:';
function seed(){const h=harness();h.t.loadSession('testroom');h.t.sample(3);h.t.saveSession('testroom');return h;}
function record(h){return JSON.parse(h.t.readSavedSession(room));}

test('corrupt siblings, invalid shapes, missing epochs and future schemas cannot block good history',()=>{
  const a=seed(),good=record(a);
  const bads=['{broken','null','[]',JSON.stringify({...good,history:{}}),JSON.stringify({...good,roomEpoch:undefined}),JSON.stringify({...good,schemaVersion:999})];
  bads.forEach((raw,i)=>a.storage.set(prefix+'bad'+i,raw));
  const b=harness(a.storage);assert.equal(b.t.loadSession('testroom'),true);
  assert.equal(b.t.state().history.red.at(-1),3);
  b.advance(60000);b.t.sample(4);b.t.saveSession('testroom');assert.equal(record(b).history.red.at(-1),4);
  bads.forEach((raw,i)=>assert.equal(a.storage.get(prefix+'bad'+i),raw));
  assert.match(b.t.getStorageReportStatus('testroom').access,/6 skipped record/);
});

test('invalid legacy record does not block a current tab record',()=>{
  const h=seed();h.storage.set(room,'{broken legacy');
  const reload=harness(h.storage);assert.equal(reload.t.loadSession('testroom'),true);
  assert.equal(reload.t.state().history.red.at(-1),3);assert.equal(h.storage.get(room),'{broken legacy');
});

test('a corrected record becomes eligible without Reset or deleting healthy data',()=>{
  const h=seed(),raw=JSON.stringify(record(h));h.storage.set(prefix+'repair','{broken');
  h.t.readSavedSession(room);assert.match(h.t.getStorageReportStatus('testroom').access,/skipped/);
  h.storage.set(prefix+'repair',raw);h.t.readSavedSession(room);
  assert.doesNotMatch(h.t.getStorageReportStatus('testroom').access,/skipped/);
});

test('late old-epoch records never restore and are removed after the three-hour grace period',()=>{
  const h=seed(),old=record(h);h.t.resetAllTracking();
  const orphan=prefix+'late';h.storage.set(orphan,JSON.stringify(old));
  assert.equal(record(h).history.timestamps.length,0);assert.equal(h.storage.has(orphan),true);
  h.advance(3*3600000+1);h.t.saveSession('testroom');
  assert.equal(h.storage.has(orphan),false);assert.equal(record(h).history.timestamps.length,0);
});

test('old-epoch corrupt and unsupported records are never automatically deleted',()=>{
  const h=seed(),old=record(h);h.t.resetAllTracking();
  h.storage.set(prefix+'future',JSON.stringify({...old,schemaVersion:999}));h.storage.set(prefix+'broken','{broken');
  h.advance(4*3600000);h.t.saveSession('testroom');
  assert(h.storage.has(prefix+'future'));assert(h.storage.has(prefix+'broken'));
  assert.equal(record(h).history.timestamps.length,0);
});

test('failure to delete an expired record does not block a healthy sibling',()=>{
  const h=seed(),old=record(h);old.timestamp-=4*3600000;
  h.storage.set(prefix+'undeletable',JSON.stringify(old));
  h.context.GM_deleteValue=()=>{throw new Error('storage unavailable');};
  assert.equal(record(h).history.red.at(-1),3);
  assert.match(h.t.getStorageReportStatus('testroom').access,/skipped record/);
});
