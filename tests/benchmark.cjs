const fs=require('fs'),path=require('path');const {chromium}=require('playwright');
const file=process.env.TIERSCOPE_SOURCE||path.join(__dirname,'../tierscope.user.js');
const source=fs.readFileSync(file,'utf8').replaceAll('scheduleInit(2000);','').replace('downloadTrackingReport: downloadTrackingReport,',`__bench:{run:function(){
var h={timestamps:[]},n=10000,now=Date.now();STORAGE_HISTORY_SERIES.forEach(k=>h[k]=[]);
for(var i=0;i<n;i++){h.timestamps.push(now-(n-i)*60000);STORAGE_HISTORY_SERIES.forEach((k,j)=>h[k].push(Math.round(60+j*10+25*Math.sin(i*.02+j))));}
restoreSessionState(normalizeStoredSession({timestamp:now,history:h,isPaused:true}));isMinimized=true;createPanel();toggleView();collapsedRows=new Set();applyRowLayout();var snapshot=createPlaybackSnapshot(history);
var durations=[];for(var j=0;j<125;j++){var index=9000+j*7;var t=performance.now();renderPlaybackFrame(getPlaybackFrame(snapshot,snapshot.timeline[index],index));if(j>=5)durations.push(performance.now()-t);}
durations.sort((a,b)=>a-b);return {frames:durations.length,meanMs:durations.reduce((a,b)=>a+b)/durations.length,p95Ms:durations[Math.floor(durations.length*.95)],maxMs:durations.at(-1)};
}},downloadTrackingReport: downloadTrackingReport,`);
(async()=>{const b=await chromium.launch({executablePath:process.env.TIERSCOPE_CHROMIUM_PATH,headless:true,args:JSON.parse(process.env.TIERSCOPE_CHROMIUM_ARGS||'[]')});try{const p=await b.newPage({viewport:{width:1100,height:1100}});await p.route('https://tierscope.test/**',r=>r.fulfill({body:'<html><body></body></html>'}));await p.goto('https://tierscope.test/testroom/');await p.evaluate(()=>{window.GM_getValue=(k,d)=>d;window.GM_setValue=()=>{};window.GM_listValues=()=>[];window.GM_deleteValue=()=>{};});await p.addScriptTag({content:source});console.log(JSON.stringify(await p.evaluate(()=>ViewerTracker.__bench.run())));}finally{await b.close();}})().catch(e=>{console.error(e);process.exitCode=1;});
