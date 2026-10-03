const test = require('node:test');
const assert = require('node:assert/strict');
const analysis = import('../src/session-analysis.js');
function archive(times, counts, breaks = times.map(() => false)) {
  return {room:'fixture', session:{history:{timestamps:times, breaks, total:counts, anonymous:counts.map(()=>0), withTokens:counts.map(v=>v/2)},
    roomTotalHigh:Math.max(...counts), sessionHighs:{total:{value:Math.max(...counts)},withTokens:{value:Math.max(...counts)/2},anonymous:{value:0}}}};
}
test('summaries weight by actual time, exclude gaps, and never extend the final sample', async()=>{
  const {summarizeSession}=await analysis;
  const a=archive([1000,2000,5000,15000,17000],[10,20,100,40,80],[false,false,false,true,false]);
  const s=summarizeSession(a,'room',30);
  assert.equal(s.coveredMs,6000);assert.equal(s.spanMs,16000);assert.equal(s.gapMs,10000);
  assert.equal(s.mean,25);assert.equal(s.atOrAboveMs,2000);assert.equal(s.tokenShare,50);
  assert.equal(s.peak,100);assert.equal(s.samples,5);assert.equal(s.coverage,37.5);
});
test('audience overview and multiple thresholds share real-time weighting and exclude long gaps',async()=>{
  const {summarizeAudience,summarizeThresholds}=await analysis;
  const a=archive([0,1000,5000,15000,17000],[10,30,999,50,100],[false,false,false,true,false]);
  a.session.history.anonymous=[10,10,999,0,0];a.session.history.withTokens=[10,0,999,25,0];
  a.session.roomTotalHigh=2500; // A full-session high outside retained history.
  const before=JSON.stringify(a),s=summarizeAudience(a);
  assert.equal(s.audience[0].mean,40);assert.equal(s.audience[0].coveredMs,7000);assert.equal(s.audience[0].gapMs,10000);
  assert.equal(s.audience[0].peak,1998);assert.equal(s.audience[0].peakTime,5000);assert.equal(s.audience[0].sessionPeak,2500);
  assert(Math.abs(s.tokenShareRegistered-6000/230)<1e-10);assert(Math.abs(s.tokenShareRoom-6000/280)<1e-10);
  assert(Math.abs(s.anonymousShareRoom-5000/280)<1e-10);
  const rows=summarizeThresholds(a,'room',[0,20,40,50,1000]);
  assert.deepEqual(rows.map(r=>r.durationMs),[7000,7000,6000,2000,0]);assert.equal(rows[1].percent,100);
  assert(Math.abs(rows[2].percent-600/7)<1e-10);assert.equal(JSON.stringify(a),before);
});
test('overview and thresholds distinguish no duration, no registered viewers and a measured zero',async()=>{
  const {summarizeAudience,summarizeThresholds}=await analysis;
  for(const a of [archive([0],[10]),archive([0,10000],[10,100],[false,true]),archive([10,10,9],[10,20,30])]){
    const s=summarizeAudience(a);assert.equal(s.tokenShareRegistered,null);assert.equal(s.tokenShareRoom,null);
    assert.deepEqual(summarizeThresholds(a,'room',[0,100]),[{threshold:0,durationMs:null,percent:null},{threshold:100,durationMs:null,percent:null}]);
  }
  const a=archive([0,1000],[0,0]);a.session.history.anonymous=[10,10];
  const s=summarizeAudience(a);assert.equal(s.tokenShareRegistered,null);assert.equal(s.tokenShareRoom,0);assert.equal(s.anonymousShareRoom,100);
  assert.deepEqual(summarizeThresholds(a,'total',[0,1]),[{threshold:0,durationMs:1000,percent:100},{threshold:1,durationMs:0,percent:0}]);
});
test('threshold input accepts a small deduplicated list and rejects incomplete or invalid counts',async()=>{
  const {parseAnalysisThresholds,summarizeThresholds}=await analysis;
  assert.deepEqual(parseAnalysisThresholds('100, 0, 25, 25'),[0,25,100]);
  for(const text of ['', '25,', '-1', '2.5', 'NaN', '1e3', '9007199254740992', '0,1,2,3,4,5,6,7,8'])assert.throws(()=>parseAnalysisThresholds(text));
  for(const thresholds of [[],[-1],[NaN],[1.5],Array(9).fill(1)])assert.throws(()=>summarizeThresholds(archive([0,1],[1,1]),'room',thresholds));
});
test('single samples, zero totals and entirely missing intervals show unavailable averages',async()=>{
  const {summarizeSession}=await analysis;
  for(const a of [archive([10],[9]),archive([10,20],[9,10],[false,true]),archive([10,10,9],[9,10,20])]){
    const s=summarizeSession(a);assert.equal(s.mean,null);assert.equal(s.tokenShare,null);assert.equal(s.coveredMs,0);
  }
  const zero=summarizeSession(archive([10,20],[0,0]));assert.equal(zero.mean,0);assert.equal(zero.tokenShare,null);
});
test('shared-duration comparisons clip intervals, exclude future peaks and keep complete-session highs separate',async()=>{
  const {compareSessions}=await analysis;
  const a=archive([0,1000,3000],[10,30,900]);const b=archive([10000,12000],[20,40]);
  const match=compareSessions(a,b,'room',20,true);
  assert.equal(match.axisMs,2000);assert.equal(match.a.mean,20);assert.equal(match.b.mean,20);
  assert.equal(match.a.peak,30);assert.equal(match.a.sessionPeak,900);assert.equal(match.a.atOrAboveMs,1000);
  assert.equal(match.b.peak,40);
  const full=compareSessions(a,b,'room',20,false);assert.equal(full.axisMs,3000);assert.equal(full.a.peak,900);
  assert.deepEqual(a.session.history.timestamps,[0,1000,3000]);
});
test('time with tokens uses registered-viewer time and duplicate timestamps carry zero weight',async()=>{
  const {summarizeSession}=await analysis;
  const a=archive([0,1000,1000,2000],[10,30,20,500]);a.session.history.withTokens=[10,0,0,500];
  const s=summarizeSession(a);assert.equal(s.mean,15);assert(Math.abs(s.tokenShare-100/3)<1e-12);
  assert.throws(()=>summarizeSession(a,'unknown'));assert.throws(()=>summarizeSession(a,'room',NaN));
});
