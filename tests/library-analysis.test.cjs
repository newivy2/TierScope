const test=require('node:test'),assert=require('node:assert/strict');
const query=import('../src/library-query.js'),chart=import('../src/analysis-chart-data.js'),analysis=import('../src/session-analysis.js');
function entry(id,room,time,title=id,notes='',favorite=false){return {id,title,notes,favorite,archive:{room,session:{history:{timestamps:[time]}}}};}
test('inclusive local day ends remain correct through a midnight daylight-saving transition',()=>{
 const {execFileSync}=require('node:child_process'),{pathToFileURL}=require('node:url');
 const url=pathToFileURL(require('node:path').join(__dirname,'../src/library-query.js')).href;
 const output=execFileSync(process.execPath,['--input-type=module','-e',`import {libraryDateBoundary} from ${JSON.stringify(url)}; console.log(JSON.stringify([libraryDateBoundary('2018-11-04'),libraryDateBoundary('2018-11-04',true)]));`],{env:{...process.env,TZ:'America/Sao_Paulo'},encoding:'utf8'});
 const [start,end]=JSON.parse(output);assert.equal(start,Date.UTC(2018,10,4,3));assert.equal(end,Date.UTC(2018,10,5,2));assert.equal(end-start,23*3600000);
});
test('library filters combine model, inclusive local dates, text/notes, favorites and stable sorting without mutation',async()=>{
 const {filterLibraryEntries,libraryDateBoundary}=await query;
 const start=new Date(2026,9,4).getTime(), next=new Date(2026,9,5).getTime();
 const entries=[entry('b','Model',start,'Beta','special show',true),entry('a','model',next-1,'Alpha'),entry('c','other',start),entry('d','model',next)];
 const before=JSON.stringify(entries);
 assert.equal(libraryDateBoundary('2026-10-04'),start);assert.equal(libraryDateBoundary('2026-10-04',true),next);
 assert.deepEqual(filterLibraryEntries(entries,{room:'MODEL',from:'2026-10-04',to:'2026-10-04'}).map(e=>e.id),['a','b']);
 assert.deepEqual(filterLibraryEntries(entries,{query:'special',favorites:true}).map(e=>e.id),['b']);
 assert.deepEqual(filterLibraryEntries(entries,{room:'model',sort:'title'}).map(e=>e.id),['a','b','d']);
 assert.deepEqual(filterLibraryEntries(entries,{room:'model',sort:'oldest'}).map(e=>e.id),['b','a','d']);
 assert.equal(filterLibraryEntries(entries,{sort:'favorites'})[0].id,'b');assert.equal(JSON.stringify(entries),before);
 assert.throws(()=>libraryDateBoundary('2026-02-30'));assert.throws(()=>filterLibraryEntries(entries,{from:'2026-10-05',to:'2026-10-04'}));
});
test('shared cursor holds accepted samples only inside covered intervals, preserving gap and end boundaries',async()=>{
 const {inspectAnalysisSample}=await chart;
 const s={times:[0,1000,1000,4000,9000],values:[10,20,30,40,50],breaks:[false,false,false,true,false],timestamps:[500,1500,1500,4500,9500]};
 assert.equal(inspectAnalysisSample(s,0).value,10);assert.equal(inspectAnalysisSample(s,500).kind,'held');
 assert.equal(inspectAnalysisSample(s,1000).value,30);assert.equal(inspectAnalysisSample(s,2000).kind,'gap');
 assert.equal(inspectAnalysisSample(s,4000).value,40);assert.equal(inspectAnalysisSample(s,8000).timestamp,4500);
 assert.equal(inspectAnalysisSample(s,9000).value,50);assert.equal(inspectAnalysisSample(s,9001).kind,'outside');assert.equal(inspectAnalysisSample(s,-1).kind,'outside');
 assert.equal(inspectAnalysisSample({times:[0],values:[8],breaks:[false],timestamps:[123]},1).kind,'outside');
});
test('zoom stays bounded, anchored and useful for zero/short ranges',async()=>{
 const {zoomAnalysisWindow}=await chart;
 assert.deepEqual(zoomAnalysisWindow(10000,0,10000,.5,5000),[2500,7500]);
 assert.deepEqual(zoomAnalysisWindow(10000,0,10000,.5,0),[0,5000]);
 assert.deepEqual(zoomAnalysisWindow(10000,2500,7500,2,5000),[0,10000]);
 assert.deepEqual(zoomAnalysisWindow(0,0,0,.5,0),[0,0]);assert.deepEqual(zoomAnalysisWindow(100,0,100,.5,0),[0,100]);
 assert.throws(()=>zoomAnalysisWindow(100,0,100,0,0));
});
test('analysis drawing reduction preserves extrema, order, gaps and clipped holds without changing inspection',async()=>{
 const {buildAnalysisPlot,inspectAnalysisSample}=await chart;
 const times=Array.from({length:10000},(_,i)=>i),values=times.map(i=>i%17),breaks=times.map(()=>false);
 values[4001]=100;values[4002]=0;breaks[4003]=true;
 const series={times,values,breaks,timestamps:times.map(t=>100000+t)},before=JSON.stringify(series);
 const {points,maximum}=buildAnalysisPlot(series,0,9999,100);
 assert.equal(maximum,100);assert(points.length<420);assert.equal(points[0].index,0);assert.equal(points.at(-1).index,9999);
 assert(points.some(p=>p.index===4001));assert(points.some(p=>p.index===4002));assert(points.find(p=>p.index===4003).move);
 for(let i=1;i<points.length;i++)assert(points[i].index>points[i-1].index);
 assert.equal(inspectAnalysisSample(series,4001).value,100);assert.equal(JSON.stringify(series),before);
 assert.deepEqual(buildAnalysisPlot({...series,values:Object.freeze(values.slice()),breaks:Object.freeze(breaks.slice())},0,9999,100),{points,maximum});
 const short={times:[0,0,10,30,40],values:[99,2,5,8,9],breaks:[false,false,false,true,false],timestamps:[0,0,10,30,40]};
 assert.equal(buildAnalysisPlot(short,0,40,100).maximum,99);
 assert.deepEqual(buildAnalysisPlot(short,2,5,100).points.map(p=>[p.time,p.value,p.move]),[[2,2,true],[5,2,false]]);
 assert.deepEqual(buildAnalysisPlot(short,12,20,100).points,[]);
 assert.deepEqual(buildAnalysisPlot(short,12,35,1).points.map(p=>[p.time,p.value,p.move]),[[30,8,true],[35,8,false]]);
 assert.deepEqual(buildAnalysisPlot(short,41,50,100).points,[]);
 const isolated={times:[0,1,2],values:[1,2,3],breaks:[false,true,true],timestamps:[0,1,2]};
 assert(buildAnalysisPlot(isolated,0,2,1).points.every(p=>p.move));
});
test('six-record comparison clips every recording to shared coverage independently and keeps full peaks separate',async()=>{
 const {compareRecordingSet}=await analysis;
 const archives=Array.from({length:6},(_,i)=>({room:'model'+i,session:{history:{timestamps:[0,1000,2000+i*1000],breaks:[false,false,i===1],total:[10+i,20+i,100+i],anonymous:[0,0,0],withTokens:[5,10,50]},roomTotalHigh:999,sessionHighs:{total:{value:999}}}}));
 const before=JSON.stringify(archives), shared=compareRecordingSet(archives,'room',20,true);
 assert.equal(shared.axisMs,2000);assert.equal(shared.summaries.length,6);assert.equal(shared.summaries[0].mean,15);
 assert.equal(shared.summaries[1].coveredMs,1000);assert.equal(shared.summaries[1].gapMs,1000);assert.equal(shared.summaries[1].peak,21);assert.equal(shared.summaries[1].sessionPeak,999);
 assert.equal(compareRecordingSet(archives,'room',20,false).axisMs,7000);assert.equal(JSON.stringify(archives),before);
 assert.throws(()=>compareRecordingSet([]));assert.throws(()=>compareRecordingSet([...archives,archives[0]]));
});
