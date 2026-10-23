const test=require('node:test');
const assert=require('node:assert/strict');
const {harness,source}=require('./helpers/harness.cjs');

test('API parser rejects invalid totals, malformed records, duplicate usernames and unsafe numbers',()=>{
  const h=harness(),parse=h.api.parseGetChatUserListResponse;
  for(const input of ['', '-1', '9007199254740992','5,user|m','5,user|m|f|0,USER|g|m|0','5,<script>|m|f|0']) assert.throws(()=>parse(input));
  const result=parse('5,testroom|o|f|0,moduser|m|m|0,unknown|newclass|x|0');
  assert.equal(result.registeredCount,3);assert.equal(result.totalUsers,8);
  assert.equal(result.users[0].isOwner,true);assert.equal(result.users[1].tier,'red');
  assert.equal(result.users[2].tier,null);assert.equal(result.diagnostics.unknownClasses.newclass,1);
});

test('API acquisition sends the AJAX header and retains authenticated same-origin GET requests', async()=>{
  const h=harness();h.t.initPanel();let optionsSeen;
  h.context.fetch=async(url,options)=>{
    assert.equal(new URL(url).pathname,'/api/getchatuserlist/');optionsSeen=options;
    if(options.headers?.['X-Requested-With']!=='XMLHttpRequest')return {ok:false,status:404,headers:{get:()=>null}};
    return {ok:true,text:async()=> '5,testroom|o|f|0,viewer|t|m|0'};
  };
  await h.t.performScanThenReturn();
  assert.equal(h.t.state().history.timestamps.length,1);assert.equal(h.t.readRequestPolicy().failures,0);
  assert.equal(optionsSeen.method,'GET');assert.equal(optionsSeen.credentials,'same-origin');assert.equal(optionsSeen.mode,'same-origin');
  assert.equal(optionsSeen.redirect,'error');assert.equal(optionsSeen.headers['X-Requested-With'],'XMLHttpRequest');
  assert(!h.logs.some(line=>line.includes('Attempting DOM fallback')));
});

test('API parsing accepts the optional numeric header without counting it as audience', async()=>{
  const h=harness(),parse=h.api.parseGetChatUserListResponse;
  const users='testroom|o|f|0,viewer|t|m|0', expected=parse('5,'+users);
  for(const header of ['0','123','9007199254740991']) {
    assert.deepEqual(JSON.parse(JSON.stringify(parse('5,'+header+','+users))),JSON.parse(JSON.stringify(expected)));
  }
  assert.equal(parse('5,0').totalUsers,5);
  for(const header of ['-1','1.5','9007199254740992','0,1'])assert.throws(()=>parse('5,'+header+','+users));
  h.t.initPanel();h.setResponse('5,123,'+users);await h.t.performScanThenReturn();
  assert.equal(h.t.state().history.timestamps.length,1);assert.equal(h.t.state().roomTotal,7);
  assert.equal(h.t.readRequestPolicy().failures,0);assert(!h.logs.some(line=>line.includes('Attempting DOM fallback')));
});

test('CSV contains retained history in tier order, safe text, UTC times and correct totals',async()=>{
  const injected=source.replace('downloadTrackingReport: downloadTrackingReport,', '__csvRoom: value => {getModelName = () => value;}, downloadTrackingReport: downloadTrackingReport,');
  const h=harness(new Map(),injected);h.t.loadSession('testroom');h.t.sample(2);h.advance(60000);h.t.sample(3);
  // An adversarial room label must be escaped as text even outside normal room names.
  // Room URL validation now rejects this label. Inject it at the export boundary
  // so the independent CSV formula-escaping guarantee is still exercised.
  h.api.__csvRoom('@SUM(A1)');
  h.api.downloadTrackingCSV();const csv=await h.blobs.get(h.downloads.at(-1)).text();
  const rows=csv.replace(/^\uFEFF/,'').trim().split('\r\n').map(line=>line.split(',').map(x=>x.slice(1,-1)));
  assert.equal(rows.length,3);
  assert.deepEqual(rows[0],['room','sample_index','timestamp_utc','elapsed_seconds','room_total','registered','anonymous','with_tokens','moderators','fan_club','dark_purple','light_purple','dark_blue','light_blue','grey','female_trans']);
  assert.equal(rows[1][0],"'@SUM(A1)");assert.equal(rows[2][3],'60');
  assert.equal(rows[2][8],'3');assert.equal(Number(rows[2][4]),Number(rows[2][5])+Number(rows[2][6]));
  assert.equal(rows[2][2],new Date(h.t.state().history.timestamps[1]).toISOString());
});
