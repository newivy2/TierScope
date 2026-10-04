const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const root=path.join(__dirname,'..');
const {instrument,prepareSource}=require(path.join(root,'tests/helpers/instrument.cjs'));
const {chromium}=require(path.join(root,'node_modules/playwright'));
const throttle=Number(process.env.TIERSCOPE_CPU_THROTTLE||1),rounds=Number(process.env.TIERSCOPE_BENCH_ROUNDS||3);
const historyMode=process.env.TIERSCOPE_BENCH_HISTORY==='1';
const compareMode=process.env.TIERSCOPE_BENCH_COMPARE==='1';
assert(!(historyMode&&compareMode),'Choose one benchmark mode');
assert(Number.isFinite(throttle)&&throttle>=1);assert(Number.isInteger(rounds)&&rounds>0);
const sourceFile=process.env.TIERSCOPE_SOURCE||path.join(root,'tierscope.user.js');
const source=prepareSource(fs.readFileSync(sourceFile,'utf8')).replaceAll('scheduleInit(2000);','').replace('downloadTrackingReport: downloadTrackingReport,',`__libraryBench:{
 setup(count,samples){
 const now=Date.now(),h={timestamps:[],breaks:[]};STORAGE_HISTORY_SERIES.forEach(k=>h[k]=[]);
 for(let i=0;i<samples;i++){
  h.timestamps.push(now-(samples-i)*60000);h.breaks.push(i>0&&i%47===0);
  ['red','green','purple','pink','dark-blue','light-blue','gray'].forEach((k,j)=>h[k].push(10+j+i%23));
  h['female-trans'].push(i%20);h.anonymous.push(25+i%11);
  h.withTokens.push(h.red[i]+h.green[i]+h.purple[i]+h.pink[i]+h['dark-blue'][i]+h['light-blue'][i]);h.total.push(h.withTokens[i]+h.gray[i]);
 }
 loadSession(getModelName());restoreSessionState(normalizeStoredSession({timestamp:now,history:h,isPaused:true,pausedElapsedTime:(samples-1)*60000}));
 isAutoRefreshOn=false;isMinimized=true;createPanel();toggleView();saveSession(getModelName());
 const base=captureSessionFile();let bytes=0;
 for(let i=0;i<count;i++){
  const archive=JSON.parse(JSON.stringify(base));archive.room='model'+String(${historyMode}?0:i%100).padStart(3,'0');
  const offset=(${historyMode}?i:Math.floor(i/100))*864000000;
  archive.session.history.timestamps=archive.session.history.timestamps.map(t=>t-offset);archive.session.timestamp-=offset;archive.session.sessionStartedAt-=offset;
  for(const high of Object.values(archive.session.sessionHighs))if(high.time!==null)high.time-=offset;
  if(archive.session.roomTotalHighTime!==null)archive.session.roomTotalHighTime-=offset;
  const raw=JSON.stringify({schemaVersion:1,addedAt:now-i,title:'Recording '+i,archive});
  GM_setValue('tierscope:library:v1:bench_'+i,raw);bytes+=new Blob([raw]).size;
 }
 if(bytes>LIBRARY_MAX_BYTES)throw new Error('Benchmark exceeds library size: '+bytes);
 return {version:TIERSCOPE_VERSION,recordings:count,samplesPerRecording:samples,bytes};
 },
 run(){
 const results={};
 function measure(name,fn){window.libraryReads=0;const start=performance.now();fn();document.getElementById('tierscope-session-tools').getBoundingClientRect();results[name]={ms:performance.now()-start,storageReads:window.libraryReads};}
 const click=id=>document.getElementById(id).click();const tab=name=>document.querySelector('[data-tools-tab="'+name+'"]').click();
 measure('open',()=>click('btn-control-library'));
 measure('folder',()=>click('tools-folder-model000'));
 if(${compareMode}){
  const choose=(id,value)=>{const input=document.getElementById(id);input.value=value;input.dispatchEvent(new Event('change'));};
  tab('compare');choose('tools-source-a','bench_0');choose('tools-source-b','bench_1');
  for(let i=2;i<6;i++){click('tools-compare-add');choose('tools-source-'+String.fromCharCode(97+i),'bench_'+i);}
  measure('sixRecordingMetric',()=>choose('tools-metric','withTokens'));
  measure('zoomIn',()=>click('tools-chart-zoom-in'));
  const canvas=document.getElementById('tools-analysis-chart'),bounds=canvas.getBoundingClientRect(),costs=[];
  for(let i=0;i<140;i++){
   const started=performance.now();canvas.dispatchEvent(new PointerEvent('pointermove',{clientX:bounds.left+bounds.width*(.2+(i%120)/120*.7),clientY:bounds.top+70,bubbles:true}));
   document.getElementById('tools-chart-inspection').getBoundingClientRect();if(i>=20)costs.push(performance.now()-started);
  }
  const sorted=costs.slice().sort((a,b)=>a-b);results.cursor={meanMs:costs.reduce((a,b)=>a+b,0)/costs.length,p95Ms:sorted[Math.ceil(sorted.length*.95)-1],maxMs:sorted.at(-1)};
  measure('fullRange',()=>click('tools-chart-reset'));
  measure('hideLine',()=>document.querySelector('[data-analysis-series="1"]').click());
  measure('showLine',()=>document.querySelector('[data-analysis-series="1"]').click());
  measure('threshold',()=>{document.getElementById('tools-threshold').value='200';click('tools-apply-threshold');});
  results.compareRecordings=document.querySelectorAll('#tools-chart-inspection tbody tr').length;
  results.nodes=document.getElementById('tierscope-session-tools').querySelectorAll('*').length;
  return results;
 }
 if(${historyMode}){
  measure('history',()=>click('tools-model-history'));
  measure('historyMetric',()=>{const select=document.getElementById('tools-history-metric');select.value='withTokens';select.dispatchEvent(new Event('change'));});
  measure('historyMetricCached',()=>{const select=document.getElementById('tools-history-metric');select.value='room';select.dispatchEvent(new Event('change'));});
  measure('historyLatest10',()=>{const select=document.getElementById('tools-history-range');select.value='10';select.dispatchEvent(new Event('change'));});
  measure('historyAll',()=>{const select=document.getElementById('tools-history-range');select.value='Infinity';select.dispatchEvent(new Event('change'));});
  measure('historyRefresh',()=>click('tools-history-refresh'));
  measure('historyBack',()=>click('tools-history-back'));
  measure('historyAgain',()=>click('tools-model-history'));
  results.historyRecordings=document.getElementById('tools-history-recording').options.length;
  results.nodes=document.getElementById('tierscope-session-tools').querySelectorAll('*').length;
  return results;
 }
 measure('search',()=>{const input=document.getElementById('tools-library-search');input.value='Recording 1';input.dispatchEvent(new Event('input'));});
 measure('summary',()=>tab('summary'));
 measure('compare',()=>tab('compare'));
 measure('metric',()=>{const select=document.getElementById('tools-metric');select.value='withTokens';select.dispatchEvent(new Event('change'));});
 measure('backupView',()=>tab('backup'));
 measure('backupBuild',()=>{const backup=createTierScopeBackup();results.backupRecordings=backup.library.length;});
 measure('returnToLibrary',()=>tab('library'));
 measure('refresh',()=>click('tools-refresh-library'));
 measure('reopen',()=>{click('btn-control-library');click('btn-control-library');});
 results.nodes=document.getElementById('tierscope-session-tools').querySelectorAll('*').length;
 return results;
 }},downloadTrackingReport: downloadTrackingReport,`);
(async()=>{
 const browser=await chromium.launch({headless:true,executablePath:process.env.TIERSCOPE_CHROMIUM_PATH,args:JSON.parse(process.env.TIERSCOPE_CHROMIUM_ARGS||'[]')});
 try{
  const output={source:path.basename(sourceFile),historyMode,compareMode,cpuThrottle:throttle,rounds,cases:[]};
  for(const [label,count,samples] of [['small',12,300],['many',500,500],['long',36,10000]]){
   const measurements=[];let size;
   for(let i=0;i<rounds;i++){
    const page=await browser.newPage({viewport:{width:1400,height:1100}}),errors=[];page.on('pageerror',error=>errors.push(error.message));
    await page.route('https://tierscope.test/**',r=>r.fulfill({body:'<!doctype html><body></body>'}));await page.goto('https://tierscope.test/testroom/');
    await page.evaluate(()=>{const storage=new Map();window.libraryReads=0;window.GM_listValues=()=>[...storage.keys()];window.GM_getValue=(k,d)=>{if(k.startsWith('tierscope:library:'))libraryReads++;return storage.has(k)?storage.get(k):d;};window.GM_setValue=(k,v)=>storage.set(k,v);window.GM_deleteValue=k=>storage.delete(k);});
    await page.addScriptTag({content:instrument(source)});size=await page.evaluate(([c,s])=>ViewerTracker.__libraryBench.setup(c,s),[count,samples]);
    const cdp=await page.context().newCDPSession(page);if(throttle>1)await cdp.send('Emulation.setCPUThrottlingRate',{rate:throttle});
    await cdp.send('HeapProfiler.collectGarbage');const beforeHeap=(await cdp.send('Runtime.getHeapUsage')).usedSize;
    if(process.env.TIERSCOPE_PROFILE_PATH){await cdp.send('Profiler.enable');await cdp.send('Profiler.start');}
    const result=await page.evaluate(()=>ViewerTracker.__libraryBench.run());assert.equal(compareMode?result.compareRecordings:historyMode?result.historyRecordings:result.backupRecordings,compareMode?6:count);measurements.push(result);
    if(process.env.TIERSCOPE_PROFILE_PATH){const {profile}=await cdp.send('Profiler.stop');fs.writeFileSync(process.env.TIERSCOPE_PROFILE_PATH+'-'+label+'-'+i+'.json',JSON.stringify(profile));}
    await cdp.send('HeapProfiler.collectGarbage');const openHeap=(await cdp.send('Runtime.getHeapUsage')).usedSize;
    await page.evaluate(async()=>{document.getElementById('btn-control-library').click();await new Promise(requestAnimationFrame);if(document.getElementById('tierscope-session-tools'))throw Error('Library did not close');});
    await cdp.send('HeapProfiler.collectGarbage');
    result.heap={before:beforeHeap,open:openHeap,closed:(await cdp.send('Runtime.getHeapUsage')).usedSize};
    assert.deepEqual(errors,[]);await page.close();
   }
   output.cases.push({label,...size,measurements});
  }
  console.log(JSON.stringify(output));
 }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
