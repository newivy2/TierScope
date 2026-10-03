const test = require('node:test');
const assert = require('node:assert/strict');
const analysis = import('../src/session-analysis.js');
function archive(times, counts, breaks = times.map(() => false)) {
  return {room:'fixture', session:{history:{timestamps:times, breaks, total:counts, anonymous:counts.map(()=>0), withTokens:counts.map(v=>v/2)},
    roomTotalHigh:Math.max(...counts), sessionHighs:{total:{value:Math.max(...counts)},withTokens:{value:Math.max(...counts)/2}}}};
}
test('summaries weight by actual time, exclude gaps, and never extend the final sample', async()=>{
  const {summarizeSession}=await analysis;
  const a=archive([1000,2000,5000,15000,17000],[10,20,100,40,80],[false,false,false,true,false]);
  const s=summarizeSession(a,'room',30);
  assert.equal(s.coveredMs,6000);assert.equal(s.spanMs,16000);assert.equal(s.gapMs,10000);
  assert.equal(s.mean,25);assert.equal(s.atOrAboveMs,2000);assert.equal(s.tokenShare,50);
  assert.equal(s.peak,100);assert.equal(s.samples,5);assert.equal(s.coverage,37.5);
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
