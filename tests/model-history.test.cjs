const test = require('node:test');
const assert = require('node:assert/strict');
const modulePromise = import('../src/model-history.js');
function entry(id, room, times, counts, breaks = times.map(() => false), tokens = counts.map(v => v / 2)) {
  return {id, title: id, archive: {room, session: {history: {timestamps: times, breaks, total: counts, anonymous: counts.map(() => 0), withTokens: tokens},
    roomTotalHigh: 9999, sessionHighs: {total: {value: 9999}, withTokens: {value: 9999}, anonymous: {value: 0}}}}};
}
function freeze(value) { if (value && typeof value === 'object') { Object.values(value).forEach(freeze); Object.freeze(value); } return value; }
test('model history uses recorded time within and across recordings, excludes gaps and other rooms', async () => {
  const {createModelHistoryReader} = await modulePromise;
  const a = entry('a', 'Model', [1000,2000,5000,15000,17000], [10,20,100,40,80], [false,false,false,true,false]);
  const b = entry('b', 'model', [20000,22000], [5,999], undefined, [5,0]);
  const other = entry('other', 'different', [0,100000], [9000,9000]);
  const entries = [b, other, a], before = JSON.stringify(entries);
  const result = createModelHistoryReader().read(entries, 'MODEL');
  assert.deepEqual(result.recordings.map(r => r.id), ['a','b']);
  assert.equal(result.coveredMs, 8000); assert.equal(result.gapMs, 10000);
  assert.equal(result.mean, 20); // (25 * 6s + 5 * 2s) / 8s, not (25 + 5) / 2
  assert.equal(result.peak, 999); assert.equal(result.recordings[0].sessionPeak, 9999);
  assert.equal(result.tokenShare, 53.125); // 85 / 160 viewer-seconds
  assert.equal(result.overlaps, false); assert.equal(JSON.stringify(entries), before);
});
test('latest recording windows are chronological with stable ties and retain separate same-day recordings', async () => {
  const {createModelHistoryReader} = await modulePromise, reader = createModelHistoryReader();
  const entries = [entry('c','model',[3000],[3]),entry('b','model',[1000],[2]),entry('a','model',[1000],[1])];
  const all = reader.read(entries,'model'); assert.equal(all.totalCount,3);
  assert.deepEqual(all.recordings.map(r=>r.id),['a','b','c']);
  const latest = reader.read(entries,'model','total',2);
  assert.deepEqual(latest.recordings.map(r=>r.id),['b','c']); assert.equal(latest.totalCount,3);
  assert.equal(latest.mean,null); assert.equal(latest.tokenShare,null); assert.equal(latest.peak,3);
  for (const limit of [0,-1,NaN,1.5]) assert.throws(()=>reader.read(entries,'model','room',limit));
  assert.throws(()=>reader.read(entries,'model','unknown'));
});
test('empty, single-sample, duplicate/backward and gap-only histories never invent duration', async () => {
  const {createModelHistoryReader} = await modulePromise, reader = createModelHistoryReader();
  const empty = reader.read([],'model'); assert.equal(empty.mean,null); assert.equal(empty.peak,null); assert.equal(empty.coveredMs,0);
  const entries = [entry('one','model',[1],[50]), entry('back','model',[10,10,9],[20,30,40]), entry('gap','model',[100,200],[60,80],[false,true])];
  const result = reader.read(entries,'model'); assert.equal(result.coveredMs,0); assert.equal(result.mean,null); assert.equal(result.tokenShare,null); assert.equal(result.peak,80);
  const zero = reader.read([entry('zero','model',[0,100],[0,0])],'model'); assert.equal(zero.mean,0); assert.equal(zero.tokenShare,null);
});
test('overlapping ranges are flagged; touching recordings and time between recordings are not gaps', async () => {
  const {createModelHistoryReader} = await modulePromise, reader = createModelHistoryReader();
  const a=entry('a','model',[0,100],[10,20]), b=entry('b','model',[100,200],[30,40]), c=entry('c','model',[1000,1100],[50,60]);
  const result=reader.read([c,b,a],'model'); assert.equal(result.overlaps,false); assert.equal(result.gapMs,0); assert.equal(result.coveredMs,300);
  assert.equal(reader.read([a,entry('overlap','model',[50,70],[90,100])],'model').overlaps,true);
});
test('cached immutable recordings refresh by archive identity and never cache mutable inputs or returned values', async () => {
  const {createModelHistoryReader} = await modulePromise, reader=createModelHistoryReader();
  const a=entry('a','model',[0,1000],[10,20]); freeze(a.archive);
  const first=reader.read([a],'model'); first.recordings[0].mean=999;
  assert.equal(reader.read([{...a,title:'Renamed'}],'model').recordings[0].mean,10);
  assert.equal(reader.read([{...a,title:'Renamed'}],'model').recordings[0].title,'Renamed');
  const replacement=entry('a','model',[0,1000,2000],[10,50,80]); freeze(replacement.archive);
  assert.equal(reader.read([replacement],'model').mean,30);
  assert.equal(reader.read([a],'model','withTokens').mean,5);
  const mutable=entry('m','model',[0,1000],[1,2]); assert.equal(reader.read([mutable],'model').mean,1);
  mutable.archive.session.history.total[0]=7; assert.equal(reader.read([mutable],'model').mean,7);
  reader.clear(); assert.equal(reader.read([a],'model').mean,10); assert.equal(reader.read([],'model').totalCount,0);
});
